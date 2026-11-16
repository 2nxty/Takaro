// Resume last session — reopens the song, playlist/mix and position you were on when the app closed.
(() => {
  const T = window.Takaro;
  if (!T) return;

  const SAVE_KEY = 'takaro:last-session';
  const PENDING_KEY = 'takaro:resume-pending'; // sessionStorage: seek waiting for the player
  const DONE_KEY = 'takaro:resume-done'; // sessionStorage: restore only once per app launch
  const RETRY_KEY = 'takaro:resume-alone'; // sessionStorage: already reopened the song without its playlist
  // Saving: checked every second while playing, but written only when the position moved 5 s or
  // more (or the song / play state changed), plus right away on pause, seek, track change, window
  // hidden, Takaro's Reload button and page unload.
  const CHECK_EVERY = 1000;
  const MIN_STEP = 5;
  const RELOAD_WINDOW = 10 * 60 * 1000; // a reload within 10 min keeps the position

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
      { key: 'restoreTime', type: 'checkbox', live: true }, // read at the next start
      { key: 'startPaused', type: 'checkbox', live: true },
    ],

    // document-start: when the app opens on the home page, jump straight to the last song.
    early(cfg) {
      const last = read(localStorage, SAVE_KEY);
      const valid = last?.videoId && /^[\w-]{6,20}$/.test(last.videoId);

      if (read(sessionStorage, DONE_KEY)) {
        // A reload during this session (Reload button, language change...): YouTube Music reopens
        // the same song from 0:00 — put it back where it was, in the same play state.
        const v = location.pathname === '/watch' && new URLSearchParams(location.search).get('v');
        // (Not when the startup restore is still pending — that one also navigated here.)
        if (valid && cfg.restoreTime && !read(sessionStorage, PENDING_KEY) && v === last.videoId && Date.now() - (last.savedAt || 0) < RELOAD_WINDOW && last.time > 3) {
          write(sessionStorage, PENDING_KEY, { videoId: last.videoId, time: last.time, paused: !!last.paused });
        }
        return;
      }
      write(sessionStorage, DONE_KEY, true);
      if (location.pathname !== '/' || !valid) return;

      const params = new URLSearchParams({ v: last.videoId });
      if (last.playlistId && /^[\w-]+$/.test(last.playlistId)) params.set('list', last.playlistId);
      // No `index`: YouTube Music picks the queue item by index but plays `v`, so a stale index (shuffle,
      // an edited queue) put one song in the queue/player bar and another in the player. With just
      // v + list it finds the song in the list itself.

      const nearEnd = last.duration > 0 && last.time > last.duration - 5;
      write(sessionStorage, PENDING_KEY, {
        videoId: last.videoId,
        time: cfg.restoreTime && !nearEnd && last.time > 3 ? last.time : 0,
        paused: !!cfg.startPaused,
      });
      location.replace(`/watch?${params}`);
    },

    onPlayer(api) {
      const video = T.$('#movie_player video') || T.$('video');

      // Apply the pending seek/pause once the restored song loads.
      const pending = read(sessionStorage, PENDING_KEY);
      let restoring = !!pending; // don't overwrite the saved position before the seek happens
      if (pending) {
        // A song played by autoplay after a playlist ended is saved with that playlist but isn't in
        // it. YouTube Music then puts the playlist's first song in the URL, queue and player bar
        // while the player plays the saved one. If the page moved to another song, reopen the saved
        // song on its own (once).
        const reopenAlone = () => {
          const v = new URLSearchParams(location.search).get('v');
          if (!v || v === pending.videoId || read(sessionStorage, RETRY_KEY)) return false;
          // Only while the player is still on the saved song (not if you already picked another one).
          if (api.getVideoData?.()?.video_id !== pending.videoId) return false;
          write(sessionStorage, RETRY_KEY, true);
          write(sessionStorage, PENDING_KEY, pending);
          T.replace(`/watch?v=${encodeURIComponent(pending.videoId)}`);
          return true;
        };
        const watch = setInterval(() => reopenAlone() && clearInterval(watch), 300);
        setTimeout(() => clearInterval(watch), 8000);

        const apply = (e) => {
          if (e.detail?.videoDetails?.videoId !== pending.videoId) return;
          if (reopenAlone()) return;
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

      // Safety net: the page (URL, queue, player bar) moved to the song you picked, but the player kept
      // playing the previous one. Seen after autoplay jumped to another playlist; could not be
      // reproduced on demand. If both disagree for ~6 s (not during an ad or while loading), reopen the
      // song the page shows — at most once every 30 s, so it can never loop.
      {
        const GUARD_KEY = 'takaro:desync-fixed-at';
        let strikes = 0;
        setInterval(() => {
          const urlId = location.pathname === '/watch' && new URLSearchParams(location.search).get('v');
          const playing = api.getVideoData?.()?.video_id;
          const ad = T.$('#movie_player')?.classList.contains('ad-showing');
          const loading = api.getPlayerState?.() === 3 || api.getPlayerState?.() === -1;
          if (!urlId || !playing || ad || loading || restoring || urlId === playing) {
            strikes = 0;
            return;
          }
          if (++strikes < 3) return;
          strikes = 0;
          if (Date.now() - (read(sessionStorage, GUARD_KEY) || 0) < 30000) return;
          write(sessionStorage, GUARD_KEY, Date.now());
          const list = new URLSearchParams(location.search).get('list');
          const params = new URLSearchParams({ v: urlId });
          if (list && /^[\w-]+$/.test(list)) params.set('list', list);
          T.replace(`/watch?${params}`);
        }, 2000);
      }

      // Save what's playing.
      // YTM preloads a video on the home page; only save once something has actually played.
      let hasPlayed = false;
      video?.addEventListener('playing', () => (hasPlayed = true));

      let lastSaved = null;
      const save = (force = true) => {
        if (restoring || !hasPlayed) return;
        if (T.$('#movie_player')?.classList.contains('ad-showing')) return;
        const videoId = api.getVideoData?.()?.video_id;
        const time = api.getCurrentTime?.(); // per track (the <video> time adds up across songs)
        if (!videoId || !Number.isFinite(time)) return;
        const paused = !!video?.paused;
        if (!force && lastSaved && lastSaved.videoId === videoId && lastSaved.paused === paused && Math.abs(time - lastSaved.time) < MIN_STEP) return;
        const index = api.getPlaylistIndex?.();
        lastSaved = {
          videoId,
          playlistId: api.getPlaylistId?.() || null,
          index: Number.isInteger(index) && index >= 0 ? index : null,
          time: Math.floor(time),
          duration: Math.floor(api.getDuration?.() || 0),
          paused,
          savedAt: Date.now(),
        };
        write(localStorage, SAVE_KEY, lastSaved);
      };
      setInterval(() => video && !video.paused && save(false), CHECK_EVERY); // nothing moves while paused
      for (const ev of ['pause', 'play', 'seeked']) video?.addEventListener(ev, () => save());
      document.addEventListener('takaro:dataloaded', () => setTimeout(save, 1500));
      document.addEventListener('takaro:beforereload', () => save());
      document.addEventListener('visibilitychange', () => document.hidden && save());
      window.addEventListener('pagehide', () => save());
    },
  });
})();
