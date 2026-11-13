// Playback Speed — portado de pear-desktop/src/plugins/playback-speed (MIT).
// Adiciona um controle de velocidade no menu "⋮" da música na barra do player.
(() => {
  const T = window.Takaro;
  if (!T) return;

  const MIN = 0.07;
  const MAX = 16;
  const round2 = (n) => Math.round(n * 100) / 100;

  const isPlayerMenu = (menu) =>
    menu?.parentElement?.ytEventForwardingBehavior?.forwarder_?.eventSink?.matches?.('ytmusic-menu-renderer.ytmusic-player-bar');

  const isMusicOrVideoTrack = () => {
    for (const el of document.querySelectorAll('tp-yt-paper-listbox #navigation-endpoint')) {
      if (el?.data?.addToPlaylistEndpoint?.videoId || el?.data?.watchEndpoint?.videoId) return true;
    }
    return false;
  };

  T.register({
    id: 'playback-speed',
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
      const video = T.$('video');

      const value = T.h('span', { class: 'takaro-speed-value', title: T.t('plugins.playback-speed.reset') });
      const range = T.h('input', { type: 'range', min: R_MIN, max: R_MAX, step: 0.05, value: 1, 'aria-label': T.t('plugins.playback-speed.label') });
      const container = T.h('div', { class: 'takaro-speed', role: 'option',
        title: `${T.t('plugins.playback-speed.label')} — ${T.t('plugins.playback-speed.wheelHint')}` },
        T.icon(SPEED_ICON, 20), range, value);

      const render = () => {
        value.textContent = `${speed.toFixed(2)}×`;
        const r = Math.min(Math.max(speed, R_MIN), R_MAX);
        range.value = String(r);
        range.style.setProperty('--p', `${((r - R_MIN) / (R_MAX - R_MIN)) * 100}%`);
      };
      const apply = () => {
        if (video) video.playbackRate = speed;
        render();
      };

      range.addEventListener('input', () => {
        const v = Number(range.value);
        speed = Number.isNaN(v) ? 1 : round2(Math.min(Math.max(MIN, v), MAX));
        apply();
      });
      value.addEventListener('click', () => {
        speed = 1;
        apply();
      });
      container.addEventListener('wheel', (e) => {
        e.preventDefault();
        speed = round2(e.deltaY < 0 ? Math.min(speed + 0.01, MAX) : Math.max(speed - 0.01, MIN));
        apply();
      }, { passive: false });
      container.addEventListener('click', (e) => e.stopPropagation());
      render();

      // Mantém a velocidade quando o YTM tenta resetar (troca de faixa etc.)
      const force = () => {
        if (video && video.playbackRate !== speed) video.playbackRate = speed;
      };
      video?.addEventListener('ratechange', force);
      document.addEventListener('takaro:dataloaded', force);

      const popup = T.$('ytmusic-popup-container');
      if (popup) {
        new MutationObserver(() => {
          const menu = T.$('ytmusic-menu-popup-renderer tp-yt-paper-listbox');
          if (menu && !menu.contains(container) && isMusicOrVideoTrack() && isPlayerMenu(menu)) {
            menu.prepend(container);
          }
        }).observe(popup, { childList: true, subtree: true });
      }
    },
  });
})();
