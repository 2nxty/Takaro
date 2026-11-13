// Resume last session — reopens the song, playlist/mix and position you were on when the app closed.
(() => {
  const T = window.Takaro;
  if (!T) return;

  const SAVE_KEY = 'takaro:last-session';
  const PENDING_KEY = 'takaro:resume-pending'; // sessionStorage: seek waiting for the player
  const DONE_KEY = 'takaro:resume-done'; // sessionStorage: restore only once per app launch
  const SAVE_EVERY = 10000;

  const read = (store, key) => {
    try {
      return JSON.parse(store.getItem(key));
    } catch {
      return null;
    }
  };
  const write = (store, key, value) => {
    try {
      value == null ? store.removeItem(key) : store.setItem(key, JSON.stringify(value));
    } catch {}
  };

  T.register({
    id: 'resume-session',
    defaults: { enabled: true, restoreTime: true, startPaused: true },
    options: [
      { key: 'restoreTime', type: 'checkbox' },
      { key: 'startPaused', type: 'checkbox' },
    ],

    // document-start: when the app opens on the home page, jump straight to the last song.
    early(cfg) {
      if (read(sessionStorage, DONE_KEY)) return;
      write(sessionStorage, DONE_KEY, true);
      if (location.pathname !== '/') return;

      const last = read(localStorage, SAVE_KEY);
      if (!last?.videoId || !/^[\w-]{6,20}$/.test(last.videoId)) return;

      const params = new URLSearchParams({ v: last.videoId });
      if (last.playlistId && /^[\w-]+$/.test(last.playlistId)) params.set('list', last.playlistId);
      if (Number.isInteger(last.index) && last.playlistId) params.set('index', String(last.index));

      const nearEnd = last.duration > 0 && last.time > last.duration - 5;
      write(sessionStorage, PENDING_KEY, {
        videoId: last.videoId,
        time: cfg.restoreTime && !nearEnd && last.time > 3 ? last.time : 0,
        paused: !!cfg.startPaused,
      });
      location.replace(`/watch?${params}`);
    },

    onPlayer(api) {
      const video = T.$('video');

      // Apply the pending seek/pause once the restored song loads.
      const pending = read(sessionStorage, PENDING_KEY);
      let restoring = !!pending; // don't overwrite the saved position before the seek happens
      if (pending) {
        const apply = (e) => {
          if (e.detail?.videoDetails?.videoId !== pending.videoId) return;
          document.removeEventListener('takaro:dataloaded', apply);
          write(sessionStorage, PENDING_KEY, null);
          const go = () => {
            if (pending.time > 0) api.seekTo(pending.time, true);
            if (pending.paused) api.pauseVideo();
            else api.playVideo();
            restoring = false;
          };
          if (video.readyState >= 1) go();
          else video.addEventListener('loadedmetadata', go, { once: true });
        };
        document.addEventListener('takaro:dataloaded', apply);
        setTimeout(() => {
          restoring = false;
          document.removeEventListener('takaro:dataloaded', apply);
          write(sessionStorage, PENDING_KEY, null);
        }, 30000);
      }

      // Save what's playing.
      // YTM preloads a video on the home page; only save once something has actually played.
      let hasPlayed = false;
      video?.addEventListener('playing', () => (hasPlayed = true));

      const save = () => {
        if (restoring || !hasPlayed) return;
        if (T.$('#movie_player')?.classList.contains('ad-showing')) return;
        const videoId = api.getVideoData?.()?.video_id;
        const time = api.getCurrentTime?.(); // per track (the <video> time adds up across songs)
        if (!videoId || !Number.isFinite(time)) return;
        const index = api.getPlaylistIndex?.();
        write(localStorage, SAVE_KEY, {
          videoId,
          playlistId: api.getPlaylistId?.() || null,
          index: Number.isInteger(index) && index >= 0 ? index : null,
          time: Math.floor(time),
          duration: Math.floor(api.getDuration?.() || 0),
          savedAt: Date.now(),
        });
      };
      setInterval(() => video && !video.paused && save(), SAVE_EVERY); // nothing to update while paused
      for (const ev of ['pause', 'seeked']) video?.addEventListener(ev, save);
      document.addEventListener('takaro:dataloaded', () => setTimeout(save, 1500));
      window.addEventListener('pagehide', save);
    },
  });
})();
