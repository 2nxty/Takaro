// Player bar — customizations for the bar at the bottom, applied live (no reload):
//   glass  — see-through, frosted bar and menus (backdrop blur). Idea from ytmdesktop2 (CC0).
//   center — playback buttons in the middle, song info on the left.
(() => {
  const T = window.Takaro;
  if (!T) return;

  const CSS = `
    html.tk-glass #player-bar-background.ytmusic-app-layout {
      background: rgba(10, 10, 10, .74) !important; -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px);
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
    /* The times hang off the sides of the buttons (out of the layout), so their width — or anything
       else changing — never pushes the buttons off the centre. */
    html.tk-center ytmusic-player-bar .left-controls { justify-content: center !important; padding: 0 52px !important; }
    html.tk-center ytmusic-player-bar .left-controls-buttons { position: relative; }
    html.tk-center ytmusic-player-bar .left-controls .tk-time { display: block; position: absolute; top: 50%; transform: translateY(-50%); }
    html.tk-center ytmusic-player-bar .left-controls .tk-time-cur { right: calc(100% + 8px); text-align: right; }
    html.tk-center ytmusic-player-bar .left-controls .tk-time-dur { left: calc(100% + 8px); }
    html.tk-center ytmusic-player-bar .left-controls .time-info { display: none !important; }
  `;

  // Split times for the centered layout, copied from YTM's own "0:31 / 3:11" label (always right,
  // gapless playback included). The whole bar is watched and everything re-queried each time, so
  // the times come back even if YTM re-renders its controls.
  let timesReady = false;
  const cur = T.h('span', { class: 'tk-time tk-time-cur' });
  const dur = T.h('span', { class: 'tk-time tk-time-dur' });
  const syncTimes = () => {
    const info = T.$('ytmusic-player-bar .left-controls .time-info');
    const box = T.$('ytmusic-player-bar .left-controls .left-controls-buttons');
    if (!info || !box) return;
    // Inside the buttons box (positioned against it, see the CSS).
    if (cur.parentElement !== box || box.firstElementChild !== cur) box.prepend(cur);
    if (dur.parentElement !== box || box.lastElementChild !== dur) box.append(dur);
    const [a = '', b = ''] = info.textContent.split('/').map((x) => x.trim());
    if (cur.textContent !== a) cur.textContent = a;
    if (dur.textContent !== b) dur.textContent = b;
  };
  const splitTimes = () => {
    if (timesReady) return;
    timesReady = true;
    T.waitFor('ytmusic-player-bar').then((bar) => {
      let queued = false;
      new MutationObserver(() => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => {
          queued = false;
          syncTimes();
        });
      }).observe(bar, { childList: true, characterData: true, subtree: true });
      syncTimes();
    });
  };

  let styled = false;
  T.register({
    id: 'player-bar',
    style: true, // listed in the Style tab
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
