// Last.fm — scrobbles what you listen to, once connected in Settings → General.
// Last.fm's rules: "now playing" when a song starts; the scrobble once it has really played for
// half its length or 4 minutes (whichever comes first), and only songs of 30 s or more. Ads are
// never sent. The account connection and the API calls live in the app (lastfm.rs).
(() => {
  const T = window.Takaro;
  if (!T) return;

  T.register({
    id: 'lastfm',
    core: true,
    defaults: { enabled: true },

    async onPlayer(api) {
      let user = null;
      try {
        user = (await T.invoke('lastfm_status'))?.user || null;
      } catch {}
      T.lastfmConnected = (name) => (user = name || null); // from the settings card

      let track = null; // { id, artist, track, album, duration, start, played, sent }
      let last = performance.now();
      const send = (t, scrobble) =>
        T.invoke('lastfm_track', { track: { artist: t.artist, track: t.track, album: t.album || null,
          duration: t.duration || null, timestamp: scrobble ? t.start : null } }).catch((e) => console.warn('[Takaro] Last.fm:', e));

      setInterval(() => {
        const now = performance.now();
        const dt = (now - last) / 1000;
        last = now;
        if (!user) return;
        const player = T.$('#movie_player');
        if (!player || player.classList.contains('ad-showing')) return;
        const id = api.getVideoData?.()?.video_id;
        const md = navigator.mediaSession?.metadata;
        if (!id || !md?.title) return;
        if (track?.id !== id) {
          // A new song (also a repeat of the same one starting over, below).
          track = { id, artist: md.artist || '', track: md.title, album: md.album || '', duration: 0,
            start: Math.floor(Date.now() / 1000), played: 0, sent: false, nowPlaying: false };
        }
        const v = T.$('#movie_player video');
        const duration = api.getDuration?.() || v?.duration || 0;
        if (duration > 0) track.duration = duration;
        const playing = v && !v.paused && !v.ended;
        if (!playing) return;
        // Played time, as the clock goes (seeking ahead doesn't count). Long gaps (sleep) don't count either.
        if (dt < 5) track.played += dt * Math.min(1, v.playbackRate || 1);
        if (!track.nowPlaying && track.played >= 2) {
          track.nowPlaying = true;
          send(track, false);
        }
        if (!track.sent && track.duration >= 30 && track.played >= Math.min(track.duration / 2, 240)) {
          track.sent = true;
          send(track, true);
        }
        // Repeat-one: the same song starting over is a new listen.
        if (track.sent && v.currentTime < 3 && track.played > track.duration * 0.6) track.id = null;
      }, 1000);
    },
  });
})();
