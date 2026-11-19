// Sleep timer — "Sleep timer" in the player's ⋮ menu: pause after 15 min … 2 h, or at the end of the
// current song. The volume fades out over the last seconds, then playback pauses and the volume is
// put back for next time.
(() => {
  const T = window.Takaro;
  if (!T) return;

  const ICON =
    'M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z';
  const CHOICES = [0, 15, 30, 45, 60, 120, 'song']; // minutes, or the end of the current song
  const FADE = 8; // seconds

  T.register({
    id: 'sleep-timer',
    core: true, // built in, not a plugin you can turn off
    defaults: { enabled: true },

    onPlayer(api) {
      T.css(`
        .takaro-sleep { display: flex; align-items: center; gap: 16px; min-height: 36px; padding: 0 16px; box-sizing: border-box;
          width: 100%; color: var(--ytmusic-text-primary, #fff); font: 14px Roboto, sans-serif; cursor: pointer; }
        .takaro-sleep:hover { background: rgba(255,255,255,.1); }
        .takaro-sleep svg { flex: none; opacity: .9; }
        .takaro-sleep .takaro-sleep-left { margin-left: auto; color: var(--ytmusic-text-secondary, #aaa); font-variant-numeric: tabular-nums; }
      `);
      const video = () => T.$('#movie_player video') || T.$('video');

      let mode = 0; // 0 = off, 'song', or the deadline (ms)
      let timer = 0;
      let fading = null;

      const stopFade = (restore) => {
        if (!fading) return;
        clearInterval(fading.interval);
        const v = video();
        if (restore && v) v.volume = fading.volume;
        fading = null;
      };
      const cancel = () => {
        clearInterval(timer);
        stopFade(true);
        mode = 0;
      };
      // Volume down to 0 over `seconds`, then pause and put the volume back.
      const fadeAndPause = (seconds) => {
        const v = video();
        if (!v || fading) return;
        const volume = v.volume;
        const steps = Math.max(1, Math.round(seconds * 10));
        let i = 0;
        fading = {
          volume,
          interval: setInterval(() => {
            i++;
            v.volume = Math.max(0, volume * (1 - i / steps));
            if (i < steps) return;
            api.pauseVideo?.();
            stopFade(true);
            mode = 0;
          }, 100),
        };
      };
      const tick = () => {
        const v = video();
        if (mode === 'song') {
          if (v && Number.isFinite(v.duration) && v.duration - v.currentTime <= Math.min(FADE, v.duration / 3)) {
            clearInterval(timer);
            fadeAndPause(Math.max(0.5, v.duration - v.currentTime - 0.3)); // paused just before the next song
          }
        } else if (mode && Date.now() >= mode - FADE * 1000) {
          clearInterval(timer);
          fadeAndPause(Math.max(0.5, (mode - Date.now()) / 1000));
        }
      };
      const set = (choice) => {
        cancel();
        if (!choice) return;
        mode = choice === 'song' ? 'song' : Date.now() + choice * 60_000;
        timer = setInterval(tick, 250);
      };
      // Pressing play again while it fades: the timer is off, the volume comes back.
      document.addEventListener('play', () => fading && cancel(), true);

      const left = () => {
        if (mode === 'song') return T.t('plugins.sleep-timer.endOfSong');
        if (!mode) return T.t('plugins.sleep-timer.off');
        const s = Math.max(0, Math.round((mode - Date.now()) / 1000));
        return s >= 3600 ? `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
          : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      };
      const label = (c) =>
        c === 0 ? T.t('plugins.sleep-timer.off') : c === 'song' ? T.t('plugins.sleep-timer.endOfSong')
          : c >= 60 ? T.t('plugins.sleep-timer.hours', { n: c / 60 }) : T.t('plugins.sleep-timer.minutes', { n: c });

      T.onPlayerMenu('takaro-sleep', () => {
        const remaining = T.h('span', { class: 'takaro-sleep-left' }, left());
        const row = T.h('div', { class: 'takaro-sleep', role: 'option' }, T.icon(ICON, 18),
          T.h('span', null, T.t('plugins.sleep-timer.title')), remaining);
        const refresh = setInterval(() => (row.isConnected ? (remaining.textContent = left()) : clearInterval(refresh)), 1000);
        row.addEventListener('click', async (e) => {
          e.stopPropagation();
          // Close YTM's menu first (the chooser is a Takaro dialog).
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
          const current = mode === 'song' ? CHOICES.indexOf('song') : mode ? -1 : 0;
          const i = await T.choose({ title: T.t('plugins.sleep-timer.title'), message: mode ? `${T.t('plugins.sleep-timer.now')} ${left()}` : '',
            choices: CHOICES.map(label), current });
          if (i >= 0) set(CHOICES[i]);
        });
        return row;
      }, 'after:takaro-share');
    },
  });
})();
