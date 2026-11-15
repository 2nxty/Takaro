// Player bar — customizations for the bar at the bottom, applied live (no reload):
//   glass  — see-through, frosted bar and menus (backdrop blur). Idea from ytmdesktop2 (CC0).
//   center — playback buttons in the middle, song info on the left.
(() => {
  const T = window.Takaro;
  if (!T) return;

  const CSS = `
    html.tk-glass #player-bar-background.ytmusic-app-layout {
      background: rgba(10, 10, 10, .84) !important; -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px);
    }
    html.tk-glass ytmusic-menu-popup-renderer, html.tk-glass tp-yt-paper-listbox.ytmusic-menu-popup-renderer {
      background-color: rgba(24, 24, 24, .82) !important; -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px);
    }
    /* Centered buttons: [song info] [prev play next time] [right controls] */
    html.tk-center ytmusic-player-bar {
      grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) !important; grid-template-areas: "middle start end" !important; }
    html.tk-center ytmusic-player-bar .middle-controls { justify-content: flex-start !important; padding-left: 16px; }
    html.tk-center ytmusic-player-bar .right-controls { justify-self: end; }
    /* …with the times split around the buttons: [0:31] |◀ ▶ ▶| [3:11] */
    .tk-time { display: none; color: var(--ytmusic-text-secondary, #aaa); font-size: 12px; font-variant-numeric: tabular-nums;
      min-width: 40px; white-space: nowrap; }
    html.tk-center ytmusic-player-bar .left-controls .tk-time { display: block; }
    html.tk-center ytmusic-player-bar .left-controls .tk-time-cur { order: -1; text-align: right; margin-right: 8px; }
    html.tk-center ytmusic-player-bar .left-controls .tk-time-dur { margin-left: 8px; }
    html.tk-center ytmusic-player-bar .left-controls .time-info { display: none !important; }
  `;

  // Split times for the centered layout, copied from YTM's own "0:31 / 3:11" label (always right,
  // gapless playback included).
  let timesReady = false;
  const splitTimes = () => {
    if (timesReady) return;
    timesReady = true;
    T.waitFor('ytmusic-player-bar .left-controls .time-info').then((info) => {
      const controls = info.parentElement;
      const cur = T.h('span', { class: 'tk-time tk-time-cur' });
      const dur = T.h('span', { class: 'tk-time tk-time-dur' });
      controls.prepend(cur);
      controls.querySelector('.left-controls-buttons')?.after(dur);
      const sync = () => {
        const [a = '', b = ''] = info.textContent.split('/').map((x) => x.trim());
        if (cur.textContent !== a) cur.textContent = a;
        if (dur.textContent !== b) dur.textContent = b;
      };
      new MutationObserver(sync).observe(info, { childList: true, characterData: true, subtree: true });
      sync();
    });
  };

  let styled = false;
  T.register({
    id: 'player-bar',
    defaults: { enabled: true, glass: true, center: false },
    options: [
      { key: 'glass', type: 'checkbox' },
      { key: 'center', type: 'checkbox' },
    ],

    live(cfg) {
      if (!styled) {
        styled = true;
        T.css(CSS);
      }
      const root = document.documentElement;
      root.classList.toggle('tk-glass', !!(cfg.enabled && cfg.glass));
      root.classList.toggle('tk-center', !!(cfg.enabled && cfg.center));
      if (cfg.enabled && cfg.center) splitTimes();
    },
  });
})();
