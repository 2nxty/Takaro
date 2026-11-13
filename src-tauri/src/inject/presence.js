// Injetado em music.youtube.com antes de qualquer script da página.
// Lê a faixa atual (mediaSession + <video>) e avisa o backend Rust só quando algo muda.
(() => {
  if (window.top !== window || location.hostname !== 'music.youtube.com') return;
  if (window.__takaroInjected) return;
  window.__takaroInjected = true;

  const invoke = (cmd, args) => {
    const t = window.__TAURI_INTERNALS__;
    if (!t) return;
    t.invoke(cmd, args).catch((e) => console.warn('[takaro]', cmd, e));
  };

  const T = window.Takaro;
  let last = { active: false };
  let retries = 0;
  let retryTimer = 0;

  function videoId() {
    try {
      const d = document.getElementById('movie_player')?.getVideoData?.();
      if (d?.video_id) return d.video_id;
    } catch {}
    return new URL(location.href).searchParams.get('v') || '';
  }

  function artwork(md) {
    const arts = [...(md.artwork || [])];
    if (!arts.length) return null;
    const w = (a) => parseInt(String(a.sizes || '0x0').split('x')[0], 10) || 0;
    arts.sort((a, b) => w(b) - w(a));
    return arts[0].src || null;
  }

  function tick() {
    const video = document.querySelector('video');
    const md = navigator.mediaSession?.metadata;
    if (!video || !md || !md.title) {
      if (last.active) {
        last = { active: false };
        invoke('playback_stopped');
      }
      return;
    }
    // Durante anúncios, mantém a última presença.
    if (document.getElementById('movie_player')?.classList.contains('ad-showing')) return;

    const id = videoId();
    const paused = video.paused || video.ended;
    // YTM plays tracks back to back in the same <video> (gapless), so its currentTime/duration
    // keep adding up across songs. The player API reports the current track only.
    const player = document.getElementById('movie_player');
    const details = player?.getPlayerResponse?.()?.videoDetails;
    const pos = player?.getCurrentTime?.() ?? video.currentTime;
    const length = details?.videoId === id ? Number(details.lengthSeconds) : 0;
    const rawDur = length > 0 ? length : player?.getDuration?.() ?? video.duration;
    const dur = Number.isFinite(rawDur) ? rawDur : 0;

    // Right after a track change the player can still report the previous track for a moment
    // (old title/cover, old position or duration). Wait until everything matches the new track.
    const stale =
      (details && details.videoId !== id) ||
      (last.active && id !== last.id && md.title === last.title) ||
      (dur > 0 && pos > dur + 1);
    if (stale && retries < 8) {
      retries++;
      clearTimeout(retryTimer);
      retryTimer = setTimeout(tick, 400);
      return;
    }
    retries = 0;
    const start = Date.now() - pos * 1000;

    const changed =
      !last.active ||
      paused !== last.paused ||
      id !== last.id ||
      md.title !== last.title ||
      md.artist !== last.artist ||
      Math.abs(dur - last.dur) > 1 ||
      (paused ? Math.abs(pos - last.pos) > 1 : Math.abs(start - last.start) > 2500); // seek

    if (!changed) return;
    last = { active: true, paused, id, title: md.title, artist: md.artist, dur, start, pos };

    const track = {
      videoId: id,
      title: md.title || '',
      artist: md.artist || '',
      album: md.album || null,
      artwork: artwork(md),
      position: pos,
      duration: dur,
      paused,
      labels: {
        listen: T?.t('presence.listen'),
        paused: T?.t('presence.paused'),
        getTakaro: T?.t('presence.getTakaro'),
      },
    };
    if (T) T.lastTrack = track; // handy for debugging (DevTools: Takaro.lastTrack)
    invoke('track_update', { track });
  }

  // Event-driven: media events (captured on document) plus a slow safety net.
  // The metadata can arrive a moment after the media event, so check again shortly after.
  let pending = 0;
  const schedule = () => {
    clearTimeout(pending);
    pending = setTimeout(() => {
      tick();
      pending = setTimeout(tick, 1500);
    }, 150);
  };
  // 'playing' also fires after buffering, which is when Discord's clock drifts from the song.
  for (const ev of ['play', 'playing', 'pause', 'seeked', 'ended', 'loadedmetadata', 'durationchange', 'emptied']) {
    document.addEventListener(ev, schedule, true);
  }
  document.addEventListener('takaro:dataloaded', schedule);
  setInterval(tick, 15000);
})();
