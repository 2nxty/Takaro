// Playback Speed — portado de pear-desktop/src/plugins/playback-speed (MIT).
// Adiciona um controle de velocidade no menu "⋮" da música na barra do player.
(() => {
  const T = window.Takaro;
  if (!T) return;

  const MIN = 0.25;
  const MAX = 2;
  const round2 = (n) => Math.round(n * 100) / 100;

  T.register({
    id: 'playback-speed',
    core: true, // built in, not a plugin you can turn off
    defaults: { enabled: true },

    onPlayer() {
      T.css(`
        /* One row, same height as the native menu items: [icon] [slider] [value] */
        .takaro-speed { display: flex; align-items: center; gap: 12px; height: 40px; padding: 0 12px 0 16px; box-sizing: border-box;
          width: 100%; color: var(--ytmusic-text-primary, #fff); font: 14px Roboto, sans-serif; cursor: default; }
        .takaro-speed svg { flex: none; opacity: .9; }
        .takaro-speed-value { flex: none; min-width: 44px; text-align: right; font-variant-numeric: tabular-nums;
          color: var(--ytmusic-text-secondary, #aaa); cursor: pointer; padding: 2px 4px; border-radius: 4px; }
        .takaro-speed-value:hover { background: rgba(255,255,255,.1); color: #fff; }
        .takaro-speed input[type=range] { -webkit-appearance: none; appearance: none; flex: 1; min-width: 0; height: 16px;
          margin: 0; background: transparent; cursor: pointer; }
        .takaro-speed input[type=range]::-webkit-slider-runnable-track { height: 2px; border-radius: 1px;
          background: linear-gradient(to right, #fff var(--p, 50%), rgba(255,255,255,.3) var(--p, 50%)); }
        .takaro-speed input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 12px;
          margin-top: -5px; border-radius: 50%; background: #fff; border: 0; }
        .takaro-speed input[type=range]:focus { outline: none; }
        /* Long menus get a vertical scrollbar; fit the items to the remaining width so nothing scrolls sideways.
           (Don't set overflow on the popup itself: YTM's scroll lock would then block the mouse wheel.) */
        ytmusic-menu-popup-renderer tp-yt-paper-listbox { width: 100% !important; min-width: 0 !important; box-sizing: border-box; }
        ytmusic-menu-popup-renderer tp-yt-paper-listbox > * { max-width: 100%; box-sizing: border-box; }
      `);

      const SPEED_ICON =
        'M20.38 8.57l-1.23 1.85a8 8 0 0 1-.22 7.58H5.07A8 8 0 0 1 15.58 6.85l1.85-1.23A10 10 0 0 0 3.35 19a2 2 0 0 0 1.72 1h13.85a2 2 0 0 0 1.74-1 10 10 0 0 0-.27-10.44zm-9.79 6.84a2 2 0 0 0 2.83 0l5.66-8.49-8.49 5.66a2 2 0 0 0 0 2.83z';
      const R_MIN = 0.25;
      const R_MAX = 2;

      let speed = 1;
      // Always the player's current <video> (never a reference kept from startup, and never another
      // <video> on the page, like a preview, that could come first in the DOM).
      const video = () => T.$('#movie_player video') || T.$('video');
      // Applies the speed through the player API too (it keeps its own rate and restores it when the
      // source changes) — the API only accepts 0.25×–2×; outside that, the <video> alone is set.
      const apply = () => {
        const api = T.$('#movie_player');
        // Ads are left alone (the ad blocker may be fast-forwarding one); the speed comes back after.
        if (api?.classList.contains('ad-showing')) return;
        if (speed >= 0.25 && speed <= 2 && api?.getPlaybackRate?.() !== speed) {
          try {
            api.setPlaybackRate(speed);
          } catch {}
        }
        const el = video();
        if (el && el.playbackRate !== speed) el.playbackRate = speed;
      };

      // A fresh row is built every time the player menu opens, so a menu that YTM re-rendered
      // or recycled can never keep a stale, dead slider.
      const buildRow = () => {
        const value = T.h('span', { class: 'takaro-speed-value', title: T.t('plugins.playback-speed.reset') });
        const range = T.h('input', { type: 'range', min: R_MIN, max: R_MAX, step: 0.05, value: 1, 'aria-label': T.t('plugins.playback-speed.label') });
        const row = T.h('div', { class: 'takaro-speed', role: 'option',
          title: `${T.t('plugins.playback-speed.label')} — ${T.t('plugins.playback-speed.wheelHint')}` },
          T.icon(SPEED_ICON, 20), range, value);
        const render = () => {
          value.textContent = `${speed.toFixed(2)}×`;
          const r = Math.min(Math.max(speed, R_MIN), R_MAX);
          range.value = String(r);
          range.style.setProperty('--p', `${((r - R_MIN) / (R_MAX - R_MIN)) * 100}%`);
        };
        const set = (v) => {
          speed = round2(Math.min(Math.max(MIN, v), MAX));
          apply();
          render();
        };
        range.addEventListener('input', () => {
          const v = Number(range.value);
          set(Number.isNaN(v) ? 1 : v);
        });
        value.addEventListener('click', () => set(1));
        row.addEventListener('wheel', (e) => {
          e.preventDefault();
          set(e.deltaY < 0 ? speed + 0.01 : speed - 0.01);
        }, { passive: false });
        // Keep clicks/keys inside the row from reaching the menu (it would select an item and close).
        for (const type of ['click', 'keydown', 'pointerdown', 'mousedown']) row.addEventListener(type, (e) => e.stopPropagation());
        render();
        return row;
      };

      // Keep the speed on every track change and whenever YTM resets it (new source, buffering...).
      // Media events don't bubble: capture them.
      for (const type of ['ratechange', 'playing', 'loadedmetadata', 'loadeddata']) document.addEventListener(type, apply, true);
      document.addEventListener('takaro:dataloaded', apply);
      document.addEventListener('takaro:videodatachange', apply);

      T.onPlayerMenu('takaro-speed', buildRow);
    },
  });
})();
