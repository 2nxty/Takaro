// Smooth audio — two things for the sound between songs, through the page's Web Audio:
//   fade      — songs fade out at the end and fade in at the start, instead of cutting.
//               (A real crossfade would need two songs playing at once; YouTube Music has one player.)
//   normalize — quiet songs are brought up to YouTube's reference loudness (up to +6 dB), with a
//               limiter so nothing distorts. YouTube Music already turns loud songs down, not quiet
//               ones up. It uses the loudness YouTube measures for every song.
// The audio goes: player → normalize gain → fade gain → limiter → speakers. Takaro's volume still
// applies (it's set on the player, before all this).
(() => {
  const T = window.Takaro;
  if (!T) return;

  const TARGET_DB = -7; // YouTube's reference ("tgt" in Stats for nerds)
  const MAX_BOOST_DB = 6;

  T.register({
    id: 'smooth-audio',
    defaults: { enabled: false, fade: 4, normalize: true },
    options: [
      { key: 'fade', type: 'number', min: 0, max: 12 },
      { key: 'normalize', type: 'checkbox' },
    ],

    onPlayer(api, cfg) {
      const video = T.$('#movie_player video');
      if (!video || !window.AudioContext) return;
      const ctx = new AudioContext();
      const source = ctx.createMediaElementSource(video);
      const norm = ctx.createGain();
      const fade = ctx.createGain();
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -1;
      limiter.knee.value = 0;
      limiter.ratio.value = 20;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.25;
      source.connect(norm).connect(fade).connect(limiter).connect(ctx.destination);

      // Never leave the audio stuck in a paused context (that would be silence).
      const wake = () => ctx.state !== 'running' && ctx.resume().catch(() => {});
      for (const type of ['play', 'playing']) video.addEventListener(type, wake);
      setInterval(() => !video.paused && wake(), 2000);
      wake();

      // Normalization: per song, from YouTube's measured loudness.
      const setNormalization = () => {
        const audio = api.getPlayerResponse?.()?.playerConfig?.audioConfig || {};
        const loud = Number(audio.perceptualLoudnessDb ?? audio.loudnessDb);
        const boost = cfg.normalize !== false && Number.isFinite(loud) ? Math.min(MAX_BOOST_DB, Math.max(0, TARGET_DB - loud)) : 0;
        norm.gain.setTargetAtTime(10 ** (boost / 20), ctx.currentTime, 0.2);
      };
      document.addEventListener('takaro:dataloaded', () => setTimeout(setNormalization, 300));
      setNormalization();

      // Fades: the volume follows the distance to the start/end of the song.
      const seconds = Math.max(0, Math.min(12, Number(cfg.fade) || 0));
      let last = 1;
      setInterval(() => {
        let f = 1;
        const ad = T.$('#movie_player')?.classList.contains('ad-showing');
        const t = api.getCurrentTime?.() ?? video.currentTime;
        const d = api.getDuration?.() ?? video.duration;
        if (seconds > 0 && !ad && Number.isFinite(t) && Number.isFinite(d) && d > seconds * 3) {
          f = Math.max(0, Math.min(1, t / seconds, (d - t) / seconds));
        }
        if (Math.abs(f - last) > 0.005) {
          fade.gain.setTargetAtTime(f, ctx.currentTime, 0.05);
          last = f;
        }
      }, 100);
    },
  });
})();
