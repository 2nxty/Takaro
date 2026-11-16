// Player background — the current cover art, blurred, as the backdrop behind the player.
// Idea from ytmdesktop2 (CC0) "Thumbnail background" + "Blur". The glass bar is a separate plugin (glass.js).
(() => {
  const T = window.Takaro;
  if (!T) return;

  // While the player page (queue / lyrics) is open, the cover art covers the whole window —
  // title bar, nav bar and side menu included — behind everything.
  const CSS = `
    /* The backdrop is always there but invisible outside the player page, so opening/closing the
       player fades it in/out, and a new cover cross-fades into the old one. */
    html.tk-bg body::before {
      content: ''; position: fixed; inset: -60px; z-index: 0; pointer-events: none; opacity: 0;
      background: var(--tk-thumb, none) center / cover no-repeat;
      filter: blur(60px) saturate(1.3) brightness(.7);
      transition: opacity .45s ease, background-image .6s ease, visibility 0s linear .45s;
      visibility: hidden; /* not drawn at all (no GPU work) outside the player page, once faded out */
    }
    html.tk-bg.tk-pp body::before { opacity: .6; visibility: visible; transition: opacity .45s ease, background-image .6s ease, visibility 0s; }
    /* Home fades out while the player slides (and fades) in, and back on close. */
    html.tk-bg ytmusic-app-layout > #content { transition: opacity .35s ease; }
    html.tk-bg.tk-pp ytmusic-app-layout > #content { opacity: 0; }
    html.tk-bg ytmusic-player-page {
      transition: transform .4s cubic-bezier(.2, .8, .2, 1), opacity .35s ease !important;
    }
    html.tk-bg ytmusic-app-layout:not([player-page-open]) ytmusic-player-page { opacity: 0; }
    /* The nav bar / side menu backgrounds fade out and back in together with the home page, so
       scrolled content never shows through them and they never pop. Only the colour is animated
       (YTM's own short opacity fade stays), which avoids a grey band at the top of the page. */
    html.tk-bg #nav-bar-background, html.tk-bg #mini-guide-background, html.tk-bg #guide-wrapper {
      transition: background-color .35s ease !important; }
    html.tk-bg #nav-bar-background { transition: none !important; }
    html.tk-bg.tk-pp ytmusic-player-page, html.tk-bg.tk-pp #nav-bar-background, html.tk-bg.tk-pp #mini-guide-background,
    html.tk-bg.tk-pp #guide-wrapper, html.tk-bg.tk-pp #guide-content { background: transparent !important; }
    /* No divider lines (nav bar, side menu, tabs) — always, so they can't flash back in while the
       player closes and the backdrop is still fading out. */
    #nav-bar-divider { display: none !important; }
    #nav-bar-background, #mini-guide-background, #guide-wrapper,
    tp-yt-paper-tabs.tab-header-container.ytmusic-player-page { border-color: transparent !important; }
  `;

  // Largest artwork of the current track (YTM covers come from lh3/i.ytimg).
  const artwork = () => {
    const arts = [...(navigator.mediaSession?.metadata?.artwork || [])];
    const w = (a) => parseInt(String(a.sizes || '0x0').split('x')[0], 10) || 0;
    arts.sort((a, b) => w(b) - w(a));
    const src = arts[0]?.src;
    return src && /^https:\/\//.test(src) ? src : null;
  };

  // Cover art + player-page state, kept up to date once the plugin is on (cheap).
  let watching = false;
  const watch = () => {
    if (watching) return;
    watching = true;
    let last = null;
    const update = () => {
      const url = artwork();
      if (url === last) return;
      last = url;
      document.documentElement.style.setProperty('--tk-thumb', url ? `url("${url.replace(/"/g, '%22')}")` : 'none');
    };
    // The media session updates a moment after the track changes.
    const later = () => [200, 1200, 3000].forEach((ms) => setTimeout(update, ms));
    document.addEventListener('takaro:dataloaded', later);
    document.addEventListener('loadedmetadata', later, true);
    update();
    // html.tk-pp = the player page is open.
    T.waitFor('ytmusic-app-layout').then((layout) => {
      const syncOpen = () => document.documentElement.classList.toggle('tk-pp', layout.hasAttribute('player-page-open'));
      new MutationObserver(syncOpen).observe(layout, { attributeFilter: ['player-page-open'] });
      syncOpen();
    });
  };

  let styled = false;
  T.register({
    id: 'player-background',
    style: true, // listed in the Style tab
    defaults: { enabled: true },

    // Applied live: turning it on/off takes effect at once, no reload.
    live(cfg) {
      if (!styled) {
        styled = true;
        T.css(CSS);
      }
      if (cfg.enabled) watch();
      document.documentElement.classList.toggle('tk-bg', !!cfg.enabled);
    },
  });
})();
