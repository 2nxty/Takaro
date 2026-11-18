// Takaro UI: branding, dialogs (T.choose), the settings panel and small YTM fixes.
(() => {
  const T = window.Takaro;
  if (!T) return;
  const h = T.h;

  // ── Branding (document-start, before YTM paints) ──
  // Dark background from the first frame, and the navbar logo swapped for "[icon] Takaro".
  // Pure CSS, so it survives YTM re-rendering the nav bar.
  const ICON_URI =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1024 1024'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%23ff3040'/%3E%3Cstop offset='1' stop-color='%23781ec8'/%3E%3C/linearGradient%3E%3C/defs%3E%3Ccircle cx='512' cy='512' r='480' fill='url(%23g)'/%3E%3Cpath d='M400 300v424l360-212z' fill='%23fff'/%3E%3C/svg%3E";
  // Splash artwork: the icon + "Takaro", like the logo in the nav bar.
  const SPLASH_URI =
    'data:image/svg+xml,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 0 221 72"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
        `<stop offset="0" stop-color="#ff3040"/><stop offset="1" stop-color="#781ec8"/></linearGradient></defs>` +
        `<circle cx="36" cy="36" r="34" fill="url(#g)"/><path d="M28 21v30l25-15z" fill="#fff"/>` +
        // textLength: the word always spans the same width (the art is cropped to it), whatever
        // font the system has (Segoe UI on Windows, SF Pro on macOS, Cantarell / Ubuntu on Linux).
        `<text x="86" y="52" fill="#fff" font-family="'Segoe UI Variable Display','Segoe UI',-apple-system,'SF Pro Display',` +
        `'Helvetica Neue',Ubuntu,Cantarell,Roboto,sans-serif" font-size="46" font-weight="600" letter-spacing="-1" ` +
        `textLength="128" lengthAdjust="spacingAndGlyphs">Takaro</text></svg>`,
    );
  T.css(`
    html, body { background: #030303; }
    /* Intro: black screen with the Takaro logo from the first frame; fades out when YTM is ready. */
    html::after { content: ''; position: fixed; inset: 0; z-index: 2147483647; pointer-events: none;
      background: #030303 url("${SPLASH_URI}") center / 221px 72px no-repeat; transition: opacity .35s ease;
      animation: tk-intro .6s ease-out both; }
    /* (The artwork is cropped to the drawing itself, so "center" really centres the logo.) */
    @keyframes tk-intro { from { background-size: 200px 65px; } to { background-size: 221px 72px; } }
    html.tk-ready::after { opacity: 0; }
    html.tk-intro-done::after { content: none; }
    /* One top row (48px): Takaro's title bar ( ‹ › … ⚙ — □ × ) with YouTube Music's nav bar (logo,
       search, avatar) laid over it. Stacking: nav bar background (3) < title bar (4) < nav bar (5);
       the nav bar lets clicks through except on its controls, so empty areas drag the window.
       The ☰ (side menu) button is Takaro's, left of ‹ ›. --tk-z = page zoom: the row keeps 48 device
       pixels at any scale (the title bar counter-zooms). */
    html, ytmusic-app, ytmusic-app-layout { --ytmusic-nav-bar-height: calc(48px / var(--tk-z, 1) + 16px) !important; }
    ytmusic-nav-bar { padding-top: 0 !important; height: calc(48px / var(--tk-z, 1)) !important; box-sizing: border-box !important; pointer-events: none; }
    ytmusic-nav-bar .left-content.ytmusic-nav-bar, ytmusic-nav-bar .center-content.ytmusic-nav-bar,
    ytmusic-nav-bar .right-content.ytmusic-nav-bar { height: calc(48px / var(--tk-z, 1)) !important; }
    ytmusic-nav-bar ytmusic-logo, ytmusic-nav-bar ytmusic-search-box, ytmusic-nav-bar .right-content > * { pointer-events: auto; }
    ytmusic-nav-bar #guide-button { display: none !important; } /* replaced by the title bar's ☰ */
    ytmusic-nav-bar .left-content.ytmusic-nav-bar { padding-left: calc(134px / var(--tk-z, 1)) !important; width: auto !important; }
    ytmusic-nav-bar .center-content.ytmusic-nav-bar { padding-left: 0 !important; }
    /* Search and avatar pinned to the window (same place on every page), the search a bit shorter. */
    ytmusic-nav-bar ytmusic-search-box { position: fixed !important; left: 50% !important; transform: translateX(-50%);
      margin: 0 !important; top: calc(24px / var(--tk-z, 1) - 17px) !important; }
    ytmusic-nav-bar ytmusic-settings-button { position: fixed !important; margin: 0 !important;
      right: calc(150px / var(--tk-z, 1)) !important; top: calc(24px / var(--tk-z, 1) - 13px) !important; }
    /* (On the search page YTM shifts the centre column with a transform, which would also move the
       fixed search box; and its square border / shadow would show around the rounded box.) */
    ytmusic-nav-bar .center-content.ytmusic-nav-bar { transform: none !important; }
    ytmusic-nav-bar ytmusic-search-box { border: 0 !important; outline: none !important; }
    ytmusic-nav-bar ytmusic-search-box:not([opened]) .search-container { box-shadow: none !important; }
    ytmusic-nav-bar ytmusic-search-box .search-box { height: 32px !important; }
    /* A bit darker than YTM's (background and border). */
    ytmusic-nav-bar ytmusic-search-box:not([opened]) .search-box {
      background: rgba(255, 255, 255, .08) !important; border-color: rgba(255, 255, 255, .09) !important; }
    ytmusic-nav-bar ytmusic-search-box .search-box #input { height: 30px !important; font-size: 14px !important; }
    ytmusic-nav-bar ytmusic-search-box .search-box .search-button { width: 32px !important; height: 32px !important; padding: 4px !important; }
    ytmusic-nav-bar ytmusic-search-box .search-box .search-button yt-icon { width: 20px; height: 20px; }
    /* Side menu: no background of its own (the page's gradient / cover shows through). */
    #guide-wrapper, #mini-guide-background { background: transparent !important; }
    /* Home and other pages: content as wide as the player page (56px margins instead of 100px). */
    html, ytmusic-app, ytmusic-app-layout, ytmusic-browse-response {
      --ytmusic-content-width: min(calc(100vw - 112px - var(--ytmusic-guide-width, 72px) - 12px), 1478px) !important; }
    #nav-bar-background { z-index: 3 !important; }
    /* Artist pages: the banner goes up to the top of the window. YTM does that with [immersive-mode],
       which it sometimes fails to set (coming from a scrolled page): the page then kept its 64px top
       padding, a black band above the banner. */
    #content.ytmusic-app > ytmusic-browse-response:has(ytmusic-immersive-header-renderer) { padding-top: 0 !important; }
    /* Home: the mood chips (Podcasts, Relax…) start level with the side menu's first button. */
    ytmusic-browse-response ytmusic-chip-cloud-renderer ytmusic-chip-cloud-chip-renderer { padding-top: 2px !important; }
    /* Frosted glass behind the top row (instead of YTM's tall solid black band). The blur is always
       there (invisible over the still page: nothing pops in when scrolling starts); only the dark tint
       fades in with the first 120px of scroll (--tk-sc, set by Takaro in the scroll event itself).
       It fades out downwards, no hard edge, and stops above the home's mood chips. */
    #nav-bar-background { height: calc(70px / var(--tk-z, 1)) !important; opacity: 1 !important; transition: none !important;
      background: linear-gradient(to bottom, rgba(3, 3, 3, calc(.55 * var(--tk-sc, 0))), rgba(3, 3, 3, calc(.35 * var(--tk-sc, 0))) 60%,
        rgba(3, 3, 3, 0)) !important;
      -webkit-backdrop-filter: blur(20px) saturate(1.3); backdrop-filter: blur(20px) saturate(1.3);
      -webkit-mask-image: linear-gradient(to bottom, #000 62%, transparent); mask-image: linear-gradient(to bottom, #000 62%, transparent); }
    /* Pages whose tabs stick to the top (search results): the tabs sit right under the top row
       (YTM leaves a 16px gap there that content scrolled through), and the glass stops at the row. */
    ytmusic-tabs#tabs { top: calc(48px / var(--tk-z, 1)) !important; }
    html.tk-sticky-tabs #nav-bar-background { height: calc(48px / var(--tk-z, 1)) !important;
      -webkit-mask-image: none; mask-image: none; }
    /* macOS and Linux (WebKit): a backdrop-filter under a fading mask comes out wrong there (a whitish
       band on macOS, glows around bright things on Linux) and is slow in VMs: a plain darker tint. */
    html[data-tk-platform="linux"] #nav-bar-background, html[data-tk-platform="macos"] #nav-bar-background {
      -webkit-backdrop-filter: none !important; backdrop-filter: none !important;
      background: linear-gradient(to bottom, rgba(3, 3, 3, calc(.85 * var(--tk-sc, 0))), rgba(3, 3, 3, calc(.6 * var(--tk-sc, 0))) 60%,
        rgba(3, 3, 3, 0)) !important; }
    html.tk-pp #nav-bar-background { -webkit-backdrop-filter: none; backdrop-filter: none; }
    #takaro-titlebar { position: fixed; top: 0; left: 0; right: 0; height: 48px; z-index: 4; display: flex; zoom: calc(1 / var(--tk-z, 1));
      align-items: stretch; color: #fff; user-select: none; -webkit-user-select: none; }
    #takaro-titlebar .tb-left { display: flex; align-items: center; gap: 2px; padding-left: 10px; }
    #takaro-titlebar .tb-drag { flex: 1; }
    #takaro-titlebar .tb-settings { display: flex; align-items: center; gap: 2px; margin-right: 52px; }
    /* Signed-out avatar, in the account picture's spot (shown only while signed out). */
    #takaro-titlebar .tb-guest { display: none; position: absolute; right: 150px; top: 11px; width: 26px; height: 26px;
      padding: 0; border: 0; border-radius: 50%; background: none; cursor: pointer; }
    #takaro-titlebar .tb-guest svg { width: 26px; height: 26px; display: block; }
    #takaro-titlebar .tb-guest:hover { filter: brightness(1.15); }
    html.tk-signed-out #takaro-titlebar .tb-guest { display: block; }
    ytmusic-nav-bar .history-icon-button { display: none !important; } /* replaced by the title bar's */
    /* Signed out: YTM's "Sign in" button and settings icon would sit under the title bar's buttons;
       the side menu already has a "Sign in" button. */
    ytmusic-nav-bar:not([user-logged-in]) .right-content > * { display: none !important; }
    #takaro-titlebar .tb-icon { width: 36px; height: 32px; border: 0; border-radius: 8px; padding: 0; background: transparent;
      color: inherit; display: grid; place-items: center; cursor: default; }
    #takaro-titlebar .tb-icon:hover { background: rgba(255,255,255,.1); }
    #takaro-titlebar .tb-icon:active { background: rgba(255,255,255,.16); }
    #takaro-titlebar .tb-win { width: 46px; border: 0; padding: 0; background: transparent; color: inherit;
      display: grid; place-items: center; cursor: default; }
    #takaro-titlebar .tb-win:hover { background: rgba(255,255,255,.1); }
    #takaro-titlebar .tb-win.tb-close:hover { background: #c42b1c; }
    #takaro-titlebar .tb-win svg { width: 10px; height: 10px; stroke: currentColor; stroke-width: 1; fill: none;
      shape-rendering: crispEdges; pointer-events: none; }
    #takaro-titlebar .tb-restore, #takaro-titlebar.tb-max .tb-maximize { display: none; }
    #takaro-titlebar.tb-max .tb-restore { display: block; }
    #takaro-titlebar button:focus { outline: none; }
    #takaro-titlebar button:focus-visible { outline: 1px solid rgba(255,255,255,.5); outline-offset: -2px; }
    body:has(ytmusic-player[player-ui-state="FULLSCREEN"]) #takaro-titlebar { display: none; }
    /* Compact popup menus (the player's ⋮ menu is very tall on small windows): 36px rows. */
    ytmusic-menu-popup-renderer tp-yt-paper-listbox > ytmusic-menu-navigation-item-renderer,
    ytmusic-menu-popup-renderer tp-yt-paper-listbox > ytmusic-menu-service-item-renderer,
    ytmusic-menu-popup-renderer tp-yt-paper-listbox > ytmusic-menu-service-item-download-renderer { height: auto !important; min-height: 36px !important; }
    ytmusic-menu-popup-renderer .yt-simple-endpoint.ytmusic-menu-navigation-item-renderer { height: 36px !important; }
    ytmusic-menu-popup-renderer tp-yt-paper-item { min-height: 36px !important; }
    ytmusic-menu-popup-renderer tp-yt-paper-listbox > ytmusic-toggle-menu-service-item-renderer { height: auto !important; min-height: 36px !important; }
    /* While a Takaro dialog is open the page behind doesn't scroll. */
    html.tk-lock { overflow: hidden !important; }
    /* Page scrollbar: the native one spans the whole window (title bar included), so it's hidden
       and replaced by #takaro-scroll, which runs from below the title bar to above the player bar. */
    html { scrollbar-width: none; }
    html::-webkit-scrollbar { display: none; }
    #takaro-scroll { position: fixed; right: 0; top: calc(48px / var(--tk-z, 1)); width: 12px; z-index: 2001; }
    #takaro-scroll[hidden] { display: none; }
    #takaro-scroll > div { position: absolute; left: 3px; right: 3px; border-radius: 6px; background: rgba(255,255,255,.28);
      transition: left .1s, right .1s, background .1s; }
    #takaro-scroll:hover > div, #takaro-scroll.dragging > div { left: 2px; right: 2px; background: rgba(255,255,255,.5); }
    ytmusic-nav-bar ytmusic-logo { width: auto !important; }
    ytmusic-nav-bar ytmusic-logo picture { display: none !important; }
    ytmusic-nav-bar ytmusic-logo a {
      display: inline-flex !important; align-items: center; gap: 8px; height: 24px; text-decoration: none; }
    ytmusic-nav-bar ytmusic-logo a::before {
      content: ''; flex: none; width: 24px; height: 24px; background: url("${ICON_URI}") center / contain no-repeat; }
    #progress-bar.ytmusic-player-bar, #progress-bar.ytmusic-player-controls {
      --paper-slider-active-color: linear-gradient(to right, #ff3040, #781ec8) !important; }
    #progress-bar.ytmusic-player-bar[focused], ytmusic-player-bar:hover #progress-bar.ytmusic-player-bar,
    #progress-bar.ytmusic-player-controls {
      --paper-slider-knob-color: #781ec8 !important; --paper-slider-knob-start-color: #781ec8 !important;
      --paper-slider-knob-start-border-color: #781ec8 !important; }
    /* Player bar: slightly smaller icons (same button size) for a cleaner look. */
    ytmusic-player-bar yt-icon-button:not(.play-pause-button) yt-icon { width: 20px !important; height: 20px !important; }
    ytmusic-player-bar .play-pause-button yt-icon { width: 34px !important; height: 34px !important; }
    ytmusic-player-bar .ytSpecButtonShapeNextIcon, ytmusic-player-bar .ytSpecButtonShapeNextIcon .ytIconWrapperHost,
    ytmusic-player-bar .ytSpecButtonShapeNextIcon .yt-icon-shape, ytmusic-player-bar .ytSpecButtonShapeNextIcon svg {
      width: 20px !important; height: 20px !important; }
    ytmusic-player-bar .right-controls-buttons > yt-icon-button,
    ytmusic-player-bar .right-controls > yt-icon-button { margin: 0 2px !important; }
    /* Player bar: full window width (YTM leaves room for its native scrollbar, which Takaro
       replaces with an overlay one), and a narrower song info block so long titles don't push the
       buttons around. */
    ytmusic-player-bar { width: 100% !important; right: 0 !important; }
    /* Darker player bar than YTM's #212121: the bar itself is see-through and the background layer
       behind it carries the colour (frosted glass when the blur option is on). */
    ytmusic-player-bar { background: transparent !important; }
    #player-bar-background.ytmusic-app-layout { background: #141414 !important; }
    ytmusic-player-bar .content-info-wrapper { max-width: 210px !important; } /* ~26 characters */
    /* Subtitle: YTM's own line (artist • views • likes • year…) is replaced by Takaro's, rebuilt from
       its links: artists and album for a song, only the channel for a video. */
    ytmusic-player-bar .byline.ytmusic-player-bar { display: none !important; }
    ytmusic-player-bar .tk-byline { display: block; color: var(--ytmusic-text-secondary, #aaa); font-size: 14px; line-height: 20px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    ytmusic-player-bar .tk-byline a { color: inherit; text-decoration: none; cursor: pointer; }
    ytmusic-player-bar .tk-byline a:hover { color: #fff; text-decoration: underline; }
    /* Buttons: ⋮ moves to the right side (before the volume), captions next to the open/close player button. */
    ytmusic-player-bar .middle-controls-buttons > ytmusic-menu-renderer.menu {
      position: absolute !important; top: 50%; transform: translateY(-50%); margin: 0 !important; z-index: 1; }
    ytmusic-player-bar .right-controls { padding-left: 44px !important; pointer-events: none; }
    ytmusic-player-bar .right-controls > * { pointer-events: auto; }
    ytmusic-player-bar .right-controls-buttons > .captions { order: 1; }
    /* Player page: the queue panel starts level with the top of the cover (its tab labels sit in
       the middle of a 49px row) and is 32px wider on the left; the cover doesn't move. */
    ytmusic-player-page #side-panel { margin-top: -14px !important; margin-left: 24px !important;
      width: calc(var(--ytmusic-player-page-side-panel-width) + 32px) !important; max-width: 832px !important; }
    ytd-compact-link-renderer.tk-hide { display: none !important; }
    /* No blue text selection in the player (bar and player page: clicking around there selected
       titles); elsewhere, selected text is tinted in Takaro's colour instead of blue. */
    ytmusic-player-bar, ytmusic-player-page { -webkit-user-select: none; user-select: none; }
    ytmusic-player-page input, ytmusic-player-page textarea, ytmusic-player-page [contenteditable] { -webkit-user-select: text; user-select: text; }
    ::selection { background: rgba(120, 30, 200, .55); color: #fff; }
    /* Square cover in the player bar (video thumbnails are 16:9): cropped to fill. */
    ytmusic-player-bar .thumbnail-image-wrapper, ytmusic-player-bar .thumbnail-image-wrapper img.image {
      width: 40px !important; height: 40px !important; }
    ytmusic-player-bar .thumbnail-image-wrapper img.image { object-fit: cover !important; border-radius: 4px; }
    ytmusic-player-bar .thumbnail-image-wrapper, #song-image, #song-image yt-img-shadow { overflow: hidden; border-radius: 4px; }
    /* Player bar: volume / repeat / shuffle and the volume slider always visible (YTM hides
       them behind a "◀" menu on narrow windows), smaller when the window is narrow. */
    ytmusic-player-bar .right-controls-buttons > .volume,
    ytmusic-player-bar .right-controls-buttons > .repeat,
    ytmusic-player-bar .right-controls-buttons > .shuffle { display: block !important; }
    ytmusic-player-bar .right-controls-buttons > .expand-button,
    ytmusic-player-bar .right-controls > ytmusic-player-expanding-menu { display: none !important; }
    ytmusic-player-bar #volume-slider.volume-slider { display: flex !important; opacity: 1 !important; width: 88px !important; flex: none !important;
      pointer-events: auto !important; } /* (YTM only lets it be clicked while its hover menu is open) */
    @media (max-width: 1100px) {
      ytmusic-player-bar #volume-slider.volume-slider { width: 64px !important; }
      ytmusic-player-bar .right-controls-buttons > yt-icon-button,
      ytmusic-player-bar .right-controls > yt-icon-button { width: 32px !important; height: 32px !important; padding: 4px !important; }
    }
    ytmusic-nav-bar ytmusic-logo a::after {
      content: 'Takaro'; color: #fff; font: 600 20px/24px 'YouTube Sans', Roboto, sans-serif; letter-spacing: -.3px; white-space: nowrap; }
  `);

  // Player bar subtitle, rebuilt by Takaro (YTM's is hidden). Its links are kept in order: artists
  // (with the " & " / ", " between them) and the album for a song, the channel for a video. Plain
  // text — views, likes, year — is dropped. Language-independent: links vs. text. Without any link,
  // the media session's artist is used. The whole player bar is watched and everything re-queried
  // every time, so YTM re-rendering the bar (or swapping the line for a new element) can't undo it.
  const subtitle = () => {
    const byline = T.$('ytmusic-player-bar .byline.ytmusic-player-bar');
    if (!byline) return;
    let line = byline.parentElement.querySelector(':scope > .tk-byline');
    if (!line) {
      line = h('div', { class: 'tk-byline' });
      byline.after(line);
    }
    const nodes = [...byline.childNodes];
    const parts = []; // links, with the separator text between two links
    let gap = '';
    for (const n of nodes) {
      if (n.nodeType === 1 && n.tagName === 'A' && n.textContent.trim()) {
        if (parts.length) parts.push(gap.trim() === '•' ? ' • ' : gap.replace(/\s+/g, ' ') || ' ');
        parts.push(n);
        gap = '';
      } else {
        gap += n.textContent;
        // Text that isn't just a separator (views, likes, year) ends the run of links.
        if (/[^\s•&,·]/.test(n.textContent) && parts.length) break;
      }
    }
    let key;
    if (parts.length) key = parts.map((p) => (typeof p === 'string' ? p : `${p.textContent}|${p.getAttribute('href')}`)).join('');
    else {
      const m = navigator.mediaSession?.metadata;
      key = m?.artist?.trim() || byline.textContent.split('•').map((x) => x.trim()).find(Boolean) || '';
    }
    if (line.dataset.key === key) return;
    line.dataset.key = key;
    line.replaceChildren(...parts.map((p) => {
      if (typeof p === 'string') return p;
      const a = h('a', { href: p.getAttribute('href') || '#' }, p.textContent.trim());
      a.addEventListener('click', (e) => {
        e.preventDefault();
        // Through YTM's own link, so it navigates inside the app.
        const same = [...(T.$('ytmusic-player-bar .byline.ytmusic-player-bar')?.querySelectorAll('a') || [])]
          .find((x) => x.getAttribute('href') === p.getAttribute('href'));
        (same || p).click();
      });
      return a;
    }));
    if (!parts.length) line.textContent = key;
    line.title = line.textContent;
  };

  // One watcher for the whole player bar: subtitle, ⋮ position and the like are re-checked (once
  // per frame at most) whenever YTM changes anything in it.
  const barFixes = [subtitle];
  T.onBarChange = (fn) => barFixes.push(fn);
  T.waitFor('ytmusic-player-bar').then((bar) => {
    let queued = false;
    const run = () => {
      queued = false;
      for (const fn of barFixes) {
        try {
          fn();
        } catch (e) {
          console.warn('[Takaro] player bar fix', e);
        }
      }
    };
    const schedule = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(run);
    };
    new MutationObserver(schedule).observe(bar, { childList: true, subtree: true, characterData: true });
    document.addEventListener('takaro:dataloaded', () => setTimeout(schedule, 800)); // media session catches up
    schedule();
  });

  // Top row tint: 0 at the top of the page, fully on after 120px of scroll. Set in the scroll
  // event itself, which runs before the frame is painted.
  {
    // (This script runs before <html> exists, so the root is looked up each time.)
    let last = '';
    const sync = () => {
      const root = document.documentElement;
      const v = Math.min(1, Math.max(0, scrollY / 120)).toFixed(2);
      if (root && v !== last) root.style.setProperty('--tk-sc', (last = v));
    };
    // html.tk-sticky-tabs: the page on screen has sticky tabs (search results). Checked for visibility,
    // since YTM keeps pages visited before in the document, hidden. Re-checked while scrolling
    // (at most 4× a second; it only matters on a scrolled page) and after navigation.
    let tabsAt = 0;
    const tabs = () => {
      tabsAt = Date.now();
      const on = [...document.querySelectorAll('ytmusic-tabs#tabs')].some((t) => t.getClientRects().length > 0);
      const root = document.documentElement;
      if (root && root.classList.contains('tk-sticky-tabs') !== on) root.classList.toggle('tk-sticky-tabs', on);
    };
    addEventListener('scroll', () => {
      sync();
      if (Date.now() - tabsAt > 250) tabs();
    }, { passive: true });
    for (const target of [window, document]) {
      target.addEventListener('yt-navigate-finish', () => requestAnimationFrame(() => {
        sync();
        tabs();
        setTimeout(tabs, 600);
      }));
    }
    document.addEventListener('DOMContentLoaded', sync);
  }

  // Player bar: the song's ⋮ menu shows on the right side, before the volume slider. Only drawn
  // there (YTM re-renders it in its own place, so the element itself must not be moved). Re-placed
  // on every bar change (see T.onBarChange), on resize and on layout switches (centered buttons).
  const placeMenu = () => {
    const right = T.$('ytmusic-player-bar .right-controls');
    const menu = T.$('ytmusic-player-bar .middle-controls-buttons > ytmusic-menu-renderer.menu');
    const parent = menu?.offsetParent;
    // Just left of the first visible control on the right (the volume slider).
    const first = right && [...right.children].find((el) => el.offsetWidth > 0);
    if (!menu || !parent || !first) return;
    const x = Math.round(first.getBoundingClientRect().left - parent.getBoundingClientRect().left - 42);
    if (menu.style.left !== `${x}px`) menu.style.left = `${x}px`;
  };
  T.onBarChange(placeMenu);
  addEventListener('resize', placeMenu);
  T.waitFor('ytmusic-player-bar').then(() => {
    new MutationObserver(() => requestAnimationFrame(placeMenu)).observe(document.documentElement, { attributeFilter: ['class'] });
    new ResizeObserver(placeMenu).observe(T.$('ytmusic-player-bar'));
  });

  // Right-click on the player bar while its menu is open: just close the menu (YTM would open it
  // again, stuck in the corner of the window).
  {
    const openMenu = () => [...document.querySelectorAll('tp-yt-iron-dropdown')]
      .find((d) => d.offsetWidth > 0 && d.querySelector('ytmusic-menu-popup-renderer'));
    let wasOpen = null;
    addEventListener('pointerdown', (e) => {
      wasOpen = e.button === 2 && e.target.closest?.('ytmusic-player-bar') ? openMenu() || null : null;
    }, true);
    addEventListener('contextmenu', (e) => {
      if (!wasOpen || !e.target.closest?.('ytmusic-player-bar')) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const menu = openMenu() || wasOpen;
      wasOpen = null;
      if (typeof menu.close === 'function') menu.close();
      else document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
    }, true);
  }

  // Covers: video thumbnails (i.ytimg.com) often have black bars baked in above and below (4:3
  // thumbnails of widescreen videos, or "cinema" videos). Measured from the pixels, per image: only
  // when there really are symmetric near-black bands is the picture zoomed just enough to hide them.
  // Album covers (square, other hosts) and thumbnails without bars are left alone.
  {
    // (The big cover only in "cover only" mode, where it fills a square.)
    const SELECTOR = 'ytmusic-player-bar .thumbnail-image-wrapper img.image, .video-toggle-cover #song-image #img';
    const cache = new Map(); // src → zoom (1 = none)
    const measure = (src) => {
      if (cache.has(src)) return cache.get(src);
      const job = new Promise((resolve) => {
        const probe = new Image();
        probe.crossOrigin = 'anonymous';
        probe.onerror = () => resolve(1);
        probe.onload = () => {
          try {
            const W = 48;
            const H = Math.max(8, Math.round((W * probe.naturalHeight) / probe.naturalWidth));
            const c = document.createElement('canvas');
            c.width = W;
            c.height = H;
            const g = c.getContext('2d', { willReadFrequently: true });
            g.drawImage(probe, 0, 0, W, H);
            const px = g.getImageData(0, 0, W, H).data;
            const dark = (y) => {
              let max = 0;
              for (let x = 0; x < W; x++) {
                const i = (y * W + x) * 4;
                max = Math.max(max, px[i], px[i + 1], px[i + 2]);
              }
              return max < 28; // the whole row is (nearly) black
            };
            let top = 0;
            while (top < H / 3 && dark(top)) top++;
            let bottom = 0;
            while (bottom < H / 3 && dark(H - 1 - bottom)) bottom++;
            const bars = Math.min(top, bottom);
            // Real letterbox: both sides, about the same size, at least ~4% of the height each.
            const ok = bars >= Math.max(2, H * 0.04) && Math.abs(top - bottom) <= Math.max(2, H * 0.03);
            resolve(ok ? Math.min(1.6, H / (H - 2 * bars)) : 1);
          } catch {
            resolve(1); // no pixel access: leave it as it is
          }
        };
        probe.src = src;
      });
      cache.set(src, job);
      if (cache.size > 200) cache.delete(cache.keys().next().value);
      return job;
    };
    const fit = async (img) => {
      const src = img.currentSrc || img.src;
      let host = '';
      try {
        host = new URL(src).hostname;
      } catch {}
      if (!/(^|\.)ytimg\.com$/.test(host)) {
        if (img.style.transform) img.style.transform = '';
        return;
      }
      const zoom = await measure(src);
      if ((img.currentSrc || img.src) !== src) return; // changed meanwhile
      const t = zoom > 1.01 ? `scale(${zoom.toFixed(3)})` : '';
      if (img.style.transform !== t) img.style.transform = t;
    };
    document.addEventListener('load', (e) => e.target.matches?.(SELECTOR) && fit(e.target), true);
    T.waitFor('ytmusic-player-bar .thumbnail-image-wrapper img.image').then(() => document.querySelectorAll(SELECTOR).forEach(fit));
  }

  // macOS / Linux: the app can't tell a click from an ad frame's own navigation there, so it opens
  // nothing in the browser by itself. Links the user clicks that leave YouTube Music are opened
  // here instead, as a new window, which the app sends to the default browser.
  if (!T.isWindows) {
    const inApp = (u) => {
      if (!/^https?:$/.test(u.protocol)) return true;
      const h = u.hostname;
      if (['music.youtube.com', 'accounts.google.com', 'accounts.youtube.com', 'consent.youtube.com', 'consent.google.com'].includes(h)) return true;
      if (/^(www\.|m\.)?youtube\.com$/.test(h)) return /^\/(signin|logout|ServiceLogin|accounts)/.test(u.pathname);
      return /^accounts\.google\./.test(h);
    };
    document.addEventListener('click', (e) => {
      if (e.defaultPrevented || e.button !== 0) return;
      const a = e.target.closest?.('a[href]');
      if (!a || (a.target && a.target !== '_self')) return; // target=_blank already becomes a new window
      let url;
      try {
        url = new URL(a.href, location.href);
      } catch {
        return;
      }
      if (inApp(url)) return;
      e.preventDefault();
      window.open(url.href, '_blank', 'noopener');
    }, true);
  }

  // html.tk-signed-out: nobody is signed in (YouTube Music shows its sign-in link). Only then does
  // the title bar show its default avatar, so a signed-in account never sees it flash.
  T.waitFor('ytmusic-nav-bar').then((nav) => {
    const sync = () => {
      const out = !nav.hasAttribute('user-logged-in') &&
        !!nav.querySelector('.sign-in-link, a[href*="ServiceLogin"]');
      document.documentElement.classList.toggle('tk-signed-out', out);
    };
    new MutationObserver(sync).observe(nav, { attributes: true, attributeFilter: ['user-logged-in'], childList: true, subtree: true });
    sync();
  });

  // Account menu: no "Upload music" (recognised by its icon, so in any language).
  {
    const hideUpload = () => {
      for (const el of document.querySelectorAll('ytd-compact-link-renderer')) {
        const icon = (el.data || el.__data?.data)?.icon?.iconType;
        const hide = icon === 'CLOUD_UPLOAD'; // (renderers get reused, so this also un-hides)
        if (el.classList.contains('tk-hide') !== hide) el.classList.toggle('tk-hide', hide);
      }
    };
    document.addEventListener('click', (e) => {
      if (e.target.closest?.('ytmusic-settings-button')) [0, 150, 500, 1200].forEach((ms) => setTimeout(hideUpload, ms));
    }, true);
  }

  // The window is created hidden (no flash); show it once the splash is painted. Only on the first
  // page of this app session, so reloads/navigation never pop up a window that's in the tray.
  {
    let first = true;
    try {
      first = !sessionStorage.getItem('takaro:shown');
      sessionStorage.setItem('takaro:shown', '1');
    } catch {}
    if (first) setTimeout(() => T.invoke('titlebar_action', { action: 'show' }).catch(() => {}), 60);
  }

  // Hide the intro once YouTube Music has loaded (or after 8s at most). T.ready resolves at that point.
  let markReady;
  T.ready = new Promise((resolve) => (markReady = resolve));
  {
    const shown = Date.now();
    let done = false;
    const hide = () => {
      if (done) return;
      done = true;
      const root = document.documentElement;
      setTimeout(() => {
        root.classList.add('tk-ready');
        markReady();
        setTimeout(() => root.classList.add('tk-intro-done'), 400);
      }, Math.max(0, 500 - (Date.now() - shown))); // short minimum so it doesn't just flash
    };
    // Wait for real content: shelves on browse pages, the queue on the player page.
    T.waitFor(
      'ytmusic-section-list-renderer ytmusic-carousel-shelf-renderer, ytmusic-section-list-renderer ytmusic-shelf-renderer, ' +
        'ytmusic-section-list-renderer ytmusic-grid-renderer, ytmusic-player-queue-item, ytmusic-responsive-list-item-renderer',
    ).then(() => setTimeout(hide, 300));
    setTimeout(hide, 8000);
  }

  // Page scaling (80%–120%): WebView zoom + a CSS variable the title bar uses to keep its size.
  const zoomStyle = T.css('');
  T.setZoom = (z) => {
    z = Math.min(1.2, Math.max(0.8, Number(z) || 1));
    T.save('__takaro', { zoom: z });
    zoomStyle.textContent = `:root { --tk-z: ${z}; }`;
    T.invoke('set_zoom', { zoom: z }).catch(() => {});
    dispatchEvent(new Event('resize')); // re-measure the custom scrollbar
  };
  if (T.zoom() !== 1) T.setZoom(T.zoom());

  // ── Icons (Material, 24px) ──
  const ICONS = {
    settings: 'M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z',
    back: 'M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z',
    menu: 'M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z',
    history: 'M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z',
    forward: 'M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z',
    close: 'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
    trash: 'M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
    gear: 'M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.03 7.03 0 0 0-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84a.48.48 0 0 0-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87a.48.48 0 0 0 .12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.48.48 0 0 0-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z',
    check: 'M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
    external: 'M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z',
  };

  // Same tokens as the website (docs/style.css): graphite surfaces + the icon gradient.
  const CSS = `
    .tk { --tk-canvas: #0a0a0a; --tk-black: #000; --tk-surface: #171717; --tk-edge: #262626; --tk-steel: #464646;
      --tk-text: #fafafa; --tk-paper: #e5e5e5; --tk-fog: #a1a1a1; --tk-ash: #737373; --tk-link: #ff5a68;
      --tk-accent: linear-gradient(135deg, #ff3040, #781ec8);
      font: 400 14px/1.43 Inter, 'Segoe UI', Roboto, system-ui, sans-serif; color: var(--tk-text); }
    .tk *, .tk *::before, .tk *::after { box-sizing: border-box; }
    /* Takaro's dialogs: no text selection (only in fields). */
    .tk-overlay { -webkit-user-select: none; user-select: none; color-scheme: dark; }
    /* Linux: a <select>'s list is a GTK menu in the system theme (usually light), which kept our white
       text: dark text there so the options can be read. */
    html[data-tk-platform="linux"] .tk select option { color: #111; background: #fff; }
    .tk-overlay input, .tk-overlay textarea { -webkit-user-select: text; user-select: text; }
    .tk-overlay { position: fixed; inset: 0; z-index: 99999; background: rgba(0,0,0,.72); display: grid; place-items: center; padding: 16px; }
    .tk-panel { width: min(720px, 100%); height: min(640px, calc(100vh - 32px)); display: flex; flex-direction: column;
      background: var(--tk-canvas); border: 1px solid var(--tk-edge); border-radius: 10px; overflow: hidden;
      box-shadow: rgba(0,0,0,.5) 0 16px 40px; }
    .tk-panel:focus { outline: none; }
    .tk-panel.tk-small { width: min(400px, 100%); height: auto; max-height: calc(100vh - 32px); }
    .tk-head { display: flex; align-items: center; gap: 10px; padding: 14px 12px 14px 20px; border-bottom: 1px solid var(--tk-edge); }
    .tk-head h2 { margin: 0; font-size: 16px; font-weight: 600; letter-spacing: -.2px; }
    .tk-chip { font-size: 12px; line-height: 1.33; color: var(--tk-fog); border: 1px solid var(--tk-edge); border-radius: 20px; padding: 2px 8px; }
    .tk-head .tk-spacer { flex: 1; }
    .tk-tabs { display: flex; gap: 4px; padding: 10px 16px; border-bottom: 1px solid var(--tk-edge); }
    .tk-tab { display: inline-flex; align-items: center; gap: 8px; height: 32px; padding: 0 12px; border: 1px solid transparent;
      border-radius: 8px; background: transparent; color: var(--tk-fog); font-family: inherit; font-size: 14px; font-weight: 500; line-height: 20px; cursor: pointer; }
    .tk-tab:hover { color: var(--tk-text); background: var(--tk-surface); }
    .tk-tab[aria-selected="true"] { color: var(--tk-text); background: var(--tk-surface); border-color: var(--tk-edge); }
    .tk-count { font-size: 12px; color: var(--tk-ash); font-variant-numeric: tabular-nums; }
    .tk-body { flex: 1; overflow: auto; padding: 16px; display: grid; gap: 8px; align-content: start; scrollbar-color: var(--tk-steel) transparent; }
    .tk-lead { color: var(--tk-fog); font-size: 13px; margin: 0 4px 4px; }
    .tk-card { background: var(--tk-canvas); border: 1px solid var(--tk-edge); border-radius: 10px; padding: 14px 16px; }
    .tk-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
    .tk-name { font-size: 14px; font-weight: 600; color: var(--tk-text); }
    .tk-desc { font-size: 13px; color: var(--tk-fog); margin-top: 2px; }
    .tk-opts { display: grid; gap: 10px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--tk-edge); font-size: 13px; color: #d4d4d4; }
    .tk-opts[hidden] { display: none; }
    .tk-opts label, .tk-check { display: flex; align-items: center; gap: 8px; cursor: pointer; }
    .tk-field { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .tk-multi { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
    .tk-pill { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border: 1px solid var(--tk-edge);
      border-radius: 9999px; color: var(--tk-fog); cursor: pointer; user-select: none; }
    .tk-pill:has(input:checked) { color: var(--tk-text); border-color: var(--tk-steel); }
    .tk-pill input { display: none; }
    /* Option checkboxes, styled like the switches: dark box, gradient + white tick when on. */
    .tk input.tk-box { -webkit-appearance: none; appearance: none; flex: none; width: 18px; height: 18px; margin: 0;
      border-radius: 5px; border: 1px solid var(--tk-steel); background: var(--tk-edge); cursor: pointer;
      display: grid; place-content: center; transition: background .15s, border-color .15s; }
    .tk input.tk-box::after { content: ''; width: 9px; height: 5px; margin-top: -2px; border: solid #fff; border-width: 0 0 2px 2px;
      transform: rotate(-45deg); opacity: 0; transition: opacity .15s; }
    .tk input.tk-box:checked { background: var(--tk-accent); border-color: transparent; }
    .tk input.tk-box:checked::after { opacity: 1; }
    .tk input.tk-box:focus-visible { outline: 2px solid var(--tk-fog); outline-offset: 2px; }
    .tk-opts label.tk-check { gap: 10px; }
    .tk select, .tk input[type=number] { background: var(--tk-surface); color: var(--tk-text); border: 1px solid var(--tk-edge);
      border-radius: 8px; padding: 6px 10px; font: inherit; font-size: 13px; outline: none; }
    .tk select:focus, .tk input[type=number]:focus { border-color: var(--tk-steel); }
    .tk-switch { position: relative; flex: none; width: 34px; height: 20px; }
    .tk-switch input { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: pointer; z-index: 1; }
    .tk-switch span { position: absolute; inset: 0; border-radius: 9999px; background: var(--tk-edge); }
    .tk-switch span::after { content: ''; position: absolute; top: 3px; left: 3px; width: 14px; height: 14px; border-radius: 50%;
      background: var(--tk-fog); transition: transform .15s; }
    .tk-switch input:checked + span { background: var(--tk-accent); }
    .tk-switch input:checked + span::after { transform: translateX(14px); background: #fff; }
    .tk-switch input:focus-visible + span { outline: 2px solid var(--tk-fog); outline-offset: 2px; }
    .tk-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 34px; padding: 0 14px;
      border-radius: 8px; border: 1px solid var(--tk-steel); background: var(--tk-edge); color: var(--tk-text);
      font-family: inherit; font-size: 14px; font-weight: 500; line-height: 20px; cursor: pointer; white-space: nowrap; text-decoration: none; }
    .tk-btn:hover { background: #2f2f2f; }
    .tk-btn-primary { background: var(--tk-paper); color: #171717; border-color: transparent; }
    .tk-btn-primary:hover { background: #fff; }
    .tk-icon-btn { width: 32px; height: 32px; flex: none; border: 0; border-radius: 8px; background: transparent; color: var(--tk-fog);
      cursor: pointer; display: grid; place-items: center; }
    .tk-icon-btn:hover { background: var(--tk-surface); color: var(--tk-text); }
    .tk-actions { display: flex; align-items: center; gap: 4px; }
    .tk-buttons { display: flex; flex-wrap: wrap; gap: 8px; }
    .tk-list { display: grid; gap: 8px; }
    .tk-empty { color: var(--tk-ash); font-size: 13px; padding: 4px 0; }
    .tk-link { color: var(--tk-link); text-decoration: none; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
    .tk-link:hover { text-decoration: underline; }
    .tk-foot { display: flex; align-items: center; gap: 12px; padding: 10px 16px 10px 20px; border-top: 1px solid var(--tk-edge); }
    .tk-foot[hidden] { display: none; }
    .tk-foot p { flex: 1; margin: 0; color: var(--tk-fog); font-size: 13px; }
    .tk-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--tk-accent); flex: none; }
    .tk-choice { display: flex; align-items: center; justify-content: space-between; width: 100%; height: 40px; padding: 0 12px;
      border: 1px solid var(--tk-edge); border-radius: 8px; background: var(--tk-canvas); color: var(--tk-text); font: inherit; cursor: pointer; }
    .tk-choice:hover { background: var(--tk-surface); }
    .tk-choice[aria-current="true"] { border-color: var(--tk-steel); background: var(--tk-surface); }
    .tk-update-notes { margin: 12px 0 0; padding: 10px 12px; max-height: 160px; overflow: auto; white-space: pre-wrap;
      font: 12px/1.5 inherit; font-family: inherit; color: var(--tk-fog); background: var(--tk-surface); border-radius: 8px; }
    .tk-status { color: var(--tk-fog); font-size: 13px; }
    .tk-status:empty { display: none; }
    .tk-url { flex: 1; min-width: 0; background: var(--tk-surface); color: var(--tk-text); border: 1px solid var(--tk-edge);
      border-radius: 8px; padding: 6px 10px; font: inherit; font-size: 13px; }
    .tk-status.error { color: var(--tk-link); }
    .tk input.tk-color { -webkit-appearance: none; appearance: none; width: 30px; height: 30px; padding: 0; flex: none;
      border: 1px solid var(--tk-steel); border-radius: 8px; background: none; cursor: pointer; overflow: hidden; }
    .tk input.tk-color::-webkit-color-swatch-wrapper { padding: 0; }
    .tk input.tk-color::-webkit-color-swatch { border: 0; border-radius: 7px; }
    .tk-gradient { width: 56px; height: 6px; border-radius: 3px; flex: none; }
    .tk input[type=number] { width: 84px; }
    /* Casting doesn't work in WebView2. */
    ytmusic-nav-bar ytmusic-cast-button { display: none !important; }
  `;

  const logo = (size) =>
    h('svg:svg', { viewBox: '0 0 1024 1024', width: size, height: size, style: 'flex:none;display:block' },
      h('svg:defs', null, h('svg:linearGradient', { id: 'tk-g', x1: '0', y1: '0', x2: '1', y2: '1' },
        h('svg:stop', { offset: '0', 'stop-color': '#ff3040' }), h('svg:stop', { offset: '1', 'stop-color': '#781ec8' }))),
      h('svg:circle', { cx: '512', cy: '512', r: '480', fill: 'url(#tk-g)' }),
      h('svg:path', { d: 'M400 300v424l360-212z', fill: '#fff' }));

  const iconBtn = (icon, label, onclick) =>
    h('button', { class: 'tk-icon-btn', type: 'button', title: label, 'aria-label': label, onclick }, T.icon(ICONS[icon], 18));

  const report = (e) => console.error('[takaro]', e);

  // Generic dialog shell. Closes on Esc / backdrop click; returns { overlay, close }.
  const dialog = ({ small, label, content, onClose }) => {
    const overlay = h('div', { class: 'tk tk-overlay' });
    const panel = h('div', { class: `tk-panel${small ? ' tk-small' : ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': label });
    const close = () => {
      if (!overlay.isConnected) return;
      overlay.remove();
      if (!document.querySelector('.tk-overlay')) document.documentElement.classList.remove('tk-lock');
      document.removeEventListener('keydown', onKey, true);
      onClose?.();
    };
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      close();
    };
    panel.append(...content(close));
    overlay.append(panel);
    overlay.addEventListener('mousedown', (e) => e.target === overlay && close());
    document.addEventListener('keydown', onKey, true);
    document.documentElement.classList.add('tk-lock');
    document.body.append(overlay);
    panel.tabIndex = -1; // focus the dialog itself (Esc works) without highlighting a button
    panel.focus({ preventScroll: true });
    return { overlay, close };
  };

  // Pick one of `choices`; resolves with the index, or -1 when dismissed.
  T.choose = ({ title, message, choices, current }) =>
    new Promise((resolve) => {
      let result = -1;
      dialog({
        small: true,
        label: title,
        onClose: () => resolve(result),
        content: (close) => [
          h('div', { class: 'tk-head' }, h('h2', null, title), h('span', { class: 'tk-spacer' }), iconBtn('close', T.t('ui.close'), close)),
          h('div', { class: 'tk-body' },
            message ? h('p', { class: 'tk-lead' }, message) : null,
            choices.map((c, i) =>
              h('button', { class: 'tk-choice', type: 'button', 'aria-current': String(i === current), onclick: () => ((result = i), close()) },
                h('span', null, c), i === current ? T.icon(ICONS.check, 18) : null))),
        ],
      });
    });

  // ── Updates ──
  const SKIP_KEY = 'takaro:skip-update';
  // Release notes are Markdown; show them as plain text.
  const plainNotes = (md) =>
    md
      .replace(/\r/g, '')
      .replace(/^#+\s*/gm, '')
      .replace(/^\s*[*-]\s+/gm, '• ')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  T.showUpdate = (info) => {
    if (document.querySelector('.tk-update')) return;
    dialog({
      small: true,
      label: T.t('update.title'),
      content: (close) => {
        const status = h('p', { class: 'tk-status', style: 'flex:1 1 100%;margin:0' });
        const later = h('button', { class: 'tk-btn', type: 'button', onclick: close }, T.t('update.later'));
        const skip = h('button', { class: 'tk-btn', type: 'button', onclick: () => {
          try {
            localStorage.setItem(SKIP_KEY, info.latest);
          } catch {}
          close();
        } }, T.t('update.skip'));
        // Windows exe, macOS app and Linux AppImage update themselves; otherwise (Linux .deb) the
        // release page opens and the user installs it.
        const auto = T.isWindows || info.auto === true;
        const now = h('button', { class: 'tk-btn tk-btn-primary', type: 'button', onclick: async () => {
          if (!auto) {
            T.invoke('open_external', { url: info.url }).catch(report);
            return close();
          }
          for (const b of [later, skip, now]) b.disabled = true;
          status.className = 'tk-status';
          status.textContent = T.t('update.downloading');
          try {
            await T.invoke('install_update', { url: info.url }); // the app restarts on success
          } catch (e) {
            status.className = 'tk-status error';
            status.textContent = T.t('update.failed', { error: String(e) });
            for (const b of [later, skip, now]) b.disabled = false;
          }
        } }, T.t(auto ? 'update.now' : 'update.download'));
        return [
          h('div', { class: 'tk-head tk-update' }, logo(22), h('h2', null, T.t('update.title')),
            h('span', { class: 'tk-spacer' }), iconBtn('close', T.t('ui.close'), close)),
          h('div', { class: 'tk-body' },
            h('p', { class: 'tk-lead', style: 'margin:0' }, T.t(auto ? 'update.body' : 'update.bodyManual', { latest: info.latest, current: info.current })),
            info.notes ? h('div', { class: 'tk-update-notes' }, plainNotes(info.notes)) : null),
          h('div', { class: 'tk-foot', style: 'flex-wrap:wrap;justify-content:flex-end' }, status, skip, later, now),
        ];
      },
    });
  };

  // ── Settings panel ──
  let lastTab = 'plugins';
  // Extension changes that need a reload: id → enabled state at page load (toggling back undoes it),
  // plus removals (always need one). Plugin/language changes are compared by T.settingsChanged().
  const extLoaded = new Map();
  const extNow = new Map();
  let extRemoved = false;
  const needsReload = () => T.settingsChanged() || extRemoved || [...extNow].some(([id, on]) => extLoaded.get(id) !== on);

  const switchEl = (checked, label, onchange) => {
    const input = h('input', { type: 'checkbox', checked, 'aria-label': label, onchange: () => onchange(input.checked) });
    return h('label', { class: 'tk-switch' }, input, h('span'));
  };

  // Option controls save immediately. Texts: plugins.<id>.options.<key> / plugins.<id>.choices.<key>.<value>
  const optionEl = (p, opt, changed) => {
    const cfg = p.config;
    const set = (value) => {
      T.save(p.id, { [opt.key]: value });
      changed();
    };
    const label = T.t(`plugins.${p.id}.options.${opt.key}`);
    const choiceLabel = (c) => T.t(`plugins.${p.id}.choices.${opt.key}.${c}`);
    switch (opt.type) {
      case 'checkbox': {
        const input = h('input', { type: 'checkbox', class: 'tk-box', checked: !!cfg[opt.key], onchange: () => set(input.checked) });
        return h('label', { class: 'tk-check' }, input, label);
      }
      case 'number': {
        const clamp = (v) => Math.min(opt.max ?? Infinity, Math.max(opt.min ?? -Infinity, Number(v) || opt.min || 0));
        const input = h('input', { type: 'number', min: opt.min, max: opt.max, value: cfg[opt.key],
          onchange: () => set((input.value = clamp(input.value))) });
        return h('div', { class: 'tk-field' }, h('span', null, label), input);
      }
      case 'select': {
        const sel = h('select', { onchange: () => set(sel.value) },
          opt.choices.map((c) => h('option', { value: c, selected: c === cfg[opt.key] }, choiceLabel(c))));
        return h('div', { class: 'tk-field' }, h('span', null, label), sel);
      }
      case 'multi': {
        const chosen = new Set(cfg[opt.key] || []);
        return h('div', null, h('div', null, label),
          h('div', { class: 'tk-multi' }, opt.choices.map((c) => {
            const input = h('input', { type: 'checkbox', checked: chosen.has(c), onchange: () => {
              input.checked ? chosen.add(c) : chosen.delete(c);
              set(opt.choices.filter((x) => chosen.has(x)));
            } });
            return h('label', { class: 'tk-pill' }, input, choiceLabel(c));
          })));
      }
      default:
        return null;
    }
  };

  // Plugins tab: features. Style tab: the plugins that only change the look (registered with style: true).
  const pluginsTab = (changed, style = false) => {
    const cards = T.plugins.filter((p) => !p.core && !!p.style === style).map((p) => {
      const name = T.t(`plugins.${p.id}.name`);
      const opts = p.options?.length
        ? h('div', { class: 'tk-opts', hidden: !p.config.enabled }, p.options.map((o) => optionEl(p, o, changed)))
        : null;
      return h('section', { class: 'tk-card' },
        h('div', { class: 'tk-row' },
          h('div', null, h('div', { class: 'tk-name' }, name), h('div', { class: 'tk-desc' }, T.t(`plugins.${p.id}.description`))),
          switchEl(p.config.enabled, name, (on) => {
            T.save(p.id, { enabled: on });
            if (opts) opts.hidden = !on;
            changed();
          })),
        opts);
    });
    return cards;
  };

  const extensionsTab = (changed) => {
    const empty = (text) => h('div', { class: 'tk-empty' }, text);
    const list = h('div', { class: 'tk-list' }, empty(T.t('extensions.loading')));
    const render = (items) => list.replaceChildren(...(items.length ? items.map(row) : [empty(T.t('extensions.empty'))]));
    const row = (ext) => {
      const card = h('section', { class: 'tk-card' },
        h('div', { class: 'tk-row' },
          h('div', { class: 'tk-name' }, ext.name),
          h('div', { class: 'tk-actions' },
            ext.hasOptions
              ? iconBtn('gear', T.t('extensions.options'), () => T.invoke('open_extension_options', { id: ext.id, title: ext.name }).catch(report))
              : null,
            iconBtn('trash', T.t('extensions.remove'), async () => {
              try {
                await T.invoke('remove_extension', { id: ext.id });
                extRemoved = true;
                card.remove();
                if (!list.querySelector('.tk-card')) render([]);
                changed();
              } catch (e) {
                report(e);
              }
            }),
            switchEl(ext.enabled, ext.name, (on) => {
              if (!extLoaded.has(ext.id)) extLoaded.set(ext.id, !on);
              extNow.set(ext.id, on);
              T.invoke('set_extension_enabled', { id: ext.id, enabled: on }).then(changed, report);
            }))));
      return card;
    };
    T.invoke('list_extensions').then(render, (e) => list.replaceChildren(empty(T.t('extensions.unavailable', { error: String(e) }))));
    const openStore = (store) => T.invoke('open_store', { store, lang: T.lang() }).catch(report);
    return [
      h('p', { class: 'tk-lead' }, T.t('extensions.note')),
      h('div', { class: 'tk-buttons' },
        h('button', { class: 'tk-btn', type: 'button', onclick: () => openStore('chrome') }, T.t('extensions.chromeStore')),
        h('button', { class: 'tk-btn', type: 'button', onclick: () => openStore('edge') }, T.t('extensions.edgeStore'))),
      list,
    ];
  };

  const generalTab = (changed) => {
    const pref = T.getLanguagePref();
    const langSelect = h('select', { 'aria-label': T.t('ui.language'), onchange: () => {
      T.save('__takaro', { language: langSelect.value });
      changed();
    } },
      h('option', { value: 'auto', selected: pref === 'auto' }, T.t('ui.auto')),
      Object.entries(T.locales)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([code, dict]) => h('option', { value: code, selected: pref === code }, dict._name || code)));

    const link = (label, url) =>
      h('a', { class: 'tk-link', href: url, onclick: (e) => {
        e.preventDefault();
        T.invoke('open_external', { url }).catch(report);
      } }, label, T.icon(ICONS.external, 14));

    const status = h('span', { class: 'tk-status' });
    const checkBtn = h('button', { class: 'tk-btn', type: 'button', onclick: async () => {
      checkBtn.disabled = true;
      status.className = 'tk-status';
      status.textContent = T.t('update.checking');
      try {
        const info = await T.invoke('check_update');
        status.textContent = info ? '' : T.t('update.upToDate');
        if (info) T.showUpdate(info);
      } catch (e) {
        status.className = 'tk-status error';
        status.textContent = T.t('update.checkFailed');
        report(e);
      }
      checkBtn.disabled = false;
    } }, T.t('update.check'));

    const closeSelect = h('select', { 'aria-label': T.t('ui.closeAction'), onchange: () => T.save('__takaro', { closeToTray: closeSelect.value === 'tray' }) },
      h('option', { value: 'quit', selected: !T.closeToTray() }, T.t('ui.closeQuit')),
      h('option', { value: 'tray', selected: T.closeToTray() }, T.t('ui.closeTray')));

    const zoomSelect = h('select', { 'aria-label': T.t('ui.zoom'), onchange: () => T.setZoom(Number(zoomSelect.value)) },
      [0.8, 0.9, 1, 1.1, 1.2].map((z) => h('option', { value: z, selected: Math.abs(T.zoom() - z) < 0.01 }, `${Math.round(z * 100)}%`)));

    // OBS overlay: local now-playing page for a Browser Source
    const overlayUrl = h('input', { class: 'tk-url', type: 'text', readonly: true, value: '' });
    // The address the server reports, plus the chosen style (?layout=…), which is what gets copied.
    let overlayBase = '';
    const LAYOUTS = ['card', 'compact', 'text'];
    const showUrl = () => {
      const layout = layoutSelect.value;
      overlayUrl.value = overlayBase && (layout === 'card' ? overlayBase : `${overlayBase}?layout=${layout}`);
    };
    const layoutSelect = h('select', { 'aria-label': T.t('ui.overlay.style'), onchange: () => {
      T.save('__takaro', { overlayLayout: layoutSelect.value });
      showUrl();
    } }, LAYOUTS.map((l) => h('option', { value: l, selected: l === T.overlayLayout() }, T.t(`ui.overlay.styles.${l}`))));
    const overlayCopy = h('button', { class: 'tk-btn', type: 'button', onclick: async () => {
      try {
        await navigator.clipboard.writeText(overlayUrl.value);
        overlayCopy.textContent = T.t('ui.overlay.copied');
        setTimeout(() => (overlayCopy.textContent = T.t('ui.overlay.copy')), 1500);
      } catch (e) {
        report(e);
      }
    } }, T.t('ui.overlay.copy'));
    const overlayStatus = h('span', { class: 'tk-status' });
    const args = T.overlayArgs();
    const portInput = h('input', { type: 'number', min: 1024, max: 65535, value: args.port, 'aria-label': T.t('ui.overlay.port'),
      onchange: () => {
        const port = Math.min(65535, Math.max(1024, Math.round(Number(portInput.value)) || T.OVERLAY_DEFAULTS.port));
        portInput.value = port;
        T.save('__takaro', { overlayPort: port });
        applyOverlay(true);
      } });
    const colorInput = (key, value) => {
      const input = h('input', { type: 'color', class: 'tk-color', value, 'aria-label': T.t('ui.overlay.gradient'),
        onchange: () => {
          T.save('__takaro', { [key]: input.value });
          applyOverlay(true);
          preview.style.background = `linear-gradient(90deg, ${fromInput.value}, ${toInput.value})`;
        } });
      return input;
    };
    const fromInput = colorInput('overlayFrom', args.from);
    const toInput = colorInput('overlayTo', args.to);
    const preview = h('span', { class: 'tk-gradient', style: `background: linear-gradient(90deg, ${args.from}, ${args.to})` });
    const resetColors = h('button', { class: 'tk-btn', type: 'button', onclick: () => {
      T.save('__takaro', { overlayFrom: undefined, overlayTo: undefined });
      fromInput.value = T.OVERLAY_DEFAULTS.from;
      toInput.value = T.OVERLAY_DEFAULTS.to;
      preview.style.background = `linear-gradient(90deg, ${fromInput.value}, ${toInput.value})`;
      applyOverlay(true);
    } }, T.t('ui.overlay.reset'));
    const overlayDetails = h('div', { class: 'tk-opts', hidden: !T.overlayEnabled() },
      h('div', { class: 'tk-field' }, overlayUrl, overlayCopy),
      h('div', { class: 'tk-field' }, h('span', null, T.t('ui.overlay.style')), layoutSelect),
      h('div', { class: 'tk-field' }, h('span', null, T.t('ui.overlay.port')), portInput),
      h('div', { class: 'tk-field' }, h('span', null, T.t('ui.overlay.gradient')),
        h('div', { class: 'tk-actions', style: 'gap:8px' }, fromInput, preview, toInput, resetColors)),
      h('div', { class: 'tk-desc' }, T.t('ui.overlay.hint')),
      overlayStatus);
    const applyOverlay = async (on) => {
      overlayDetails.hidden = !on;
      try {
        overlayBase = await T.invoke('set_overlay', T.overlayArgs(on));
        showUrl();
        overlayStatus.textContent = '';
      } catch (e) {
        overlayStatus.className = 'tk-status error';
        overlayStatus.textContent = T.t('ui.overlay.error', { error: String(e) });
      }
    };
    if (T.overlayEnabled()) applyOverlay(true);

    return [
      h('section', { class: 'tk-card' }, h('div', { class: 'tk-row' }, h('div', { class: 'tk-name' }, T.t('ui.language')), langSelect)),
      h('section', { class: 'tk-card' }, h('div', { class: 'tk-row' }, h('div', { class: 'tk-name' }, T.t('ui.zoom')), zoomSelect)),
      h('section', { class: 'tk-card' }, h('div', { class: 'tk-row' }, h('div', { class: 'tk-name' }, T.t('ui.closeAction')), closeSelect)),
      h('section', { class: 'tk-card' },
        h('div', { class: 'tk-row' },
          h('div', null, h('div', { class: 'tk-name' }, T.t('update.title')), status),
          checkBtn)),
      h('section', { class: 'tk-card' },
        h('div', { class: 'tk-row' },
          h('div', null, h('div', { class: 'tk-name' }, T.t('ui.overlay.title')), h('div', { class: 'tk-desc' }, T.t('ui.overlay.desc'))),
          switchEl(T.overlayEnabled(), T.t('ui.overlay.title'), (on) => {
            T.save('__takaro', { overlay: on });
            applyOverlay(on);
          })),
        overlayDetails),
      h('section', { class: 'tk-card' },
        h('div', { class: 'tk-row' },
          h('div', { style: 'display:flex;align-items:center;gap:12px' }, logo(36),
            h('div', null, h('div', { class: 'tk-name' }, 'Takaro'), h('div', { class: 'tk-desc' }, T.t('ui.version', { version: T.version })))),
        ),
        h('p', { class: 'tk-desc', style: 'margin:12px 0' }, T.t('ui.tagline', { os: { macos: 'macOS', linux: 'Linux' }[T.platform] || 'Windows' })),
        h('div', { class: 'tk-buttons', style: 'gap:16px' },
          link(T.t('ui.site'), 'https://takaro.nxty.cc'),
          link('GitHub', 'https://github.com/2nxty/Takaro'),
          link(T.t('ui.issues'), 'https://github.com/2nxty/Takaro/issues'))),
    ];
  };

  T.openSettings = () => {
    if (document.querySelector('.tk-overlay')) return;
    const listed = () => T.plugins.filter((p) => !p.core && !p.style);
    const enabledCount = () => listed().filter((p) => p.config.enabled).length;

    dialog({
      label: T.t('ui.settingsButton'),
      content: (close) => {
        const body = h('div', { class: 'tk-body', role: 'tabpanel' });
        const foot = h('div', { class: 'tk-foot', hidden: !needsReload() }, h('span', { class: 'tk-dot' }), h('p', null, T.t('ui.reloadNeeded')),
          h('button', { class: 'tk-btn tk-btn-primary', type: 'button', onclick: () => T.reload() }, T.t('ui.reloadNow')));
        const count = h('span', { class: 'tk-count' });
        const changed = () => {
          foot.hidden = !needsReload();
          count.textContent = `${enabledCount()}/${listed().length}`;
        };
        count.textContent = `${enabledCount()}/${listed().length}`;

        const tabs = [
          ['plugins', T.t('ui.tabs.plugins'), pluginsTab, count],
          ['style', T.t('ui.tabs.style'), (changed) => pluginsTab(changed, true)],
          ...(T.isWindows ? [['extensions', T.t('ui.tabs.extensions'), extensionsTab]] : []), // WebView2 only
          ['general', T.t('ui.tabs.general'), generalTab],
        ];
        const tabButtons = tabs.map(([id, label, render, extra]) =>
          h('button', { class: 'tk-tab', type: 'button', role: 'tab', 'aria-selected': 'false', onclick: () => select(id) }, label, extra || null));
        const select = (id) => {
          lastTab = id;
          tabs.forEach(([tid], i) => tabButtons[i].setAttribute('aria-selected', String(tid === id)));
          body.replaceChildren(...[tabs.find(([tid]) => tid === id)[2](changed)].flat().filter(Boolean));
          body.scrollTop = 0;
        };
        select(lastTab);

        return [
          h('div', { class: 'tk-head' }, logo(22), h('h2', null, 'Takaro'), h('span', { class: 'tk-chip' }, `v${T.version}`),
            h('span', { class: 'tk-spacer' }), iconBtn('close', T.t('ui.close'), close)),
          h('div', { class: 'tk-tabs', role: 'tablist' }, tabButtons),
          body,
          foot,
        ];
      },
    });
  };

  // Fix: in YTM, clicking the "⋮" button again closes and immediately reopens its menu.
  // If the open menu belongs to the clicked button, close it and swallow the click.
  let swallow = false;
  const openDropdownFor = (target) => {
    for (const d of document.querySelectorAll('ytmusic-popup-container tp-yt-iron-dropdown')) {
      if (d.opened && d.positionTarget?.contains?.(target)) return d;
    }
    return null;
  };
  window.addEventListener('pointerdown', (e) => {
    const d = openDropdownFor(e.target);
    swallow = !!d;
    if (!d) return;
    e.stopImmediatePropagation();
    e.preventDefault();
    d.close();
  }, true);
  for (const type of ['mousedown', 'pointerup', 'mouseup', 'click', 'tap']) {
    window.addEventListener(type, (e) => {
      if (!swallow) return;
      e.stopImmediatePropagation();
      e.preventDefault();
      if (type === 'click') swallow = false;
    }, true);
  }

  const init = async () => {
    T.css(CSS);
    if (T.overlayEnabled()) T.invoke('set_overlay', T.overlayArgs()).catch(report);
    const tray = ['play', 'pause', 'previous', 'next', 'show', 'settings', 'quit'];
    T.invoke('set_tray_labels', { labels: Object.fromEntries(tray.map((k) => [k, T.t(`tray.${k}`)])) }).catch(report);
    // ── Title bar (frameless window) ──
    const winIcon = (...shapes) =>
      h('svg:svg', { viewBox: '0 0 10 10' }, shapes.map(([tag, attrs]) => h(`svg:${tag}`, attrs)));
    // YouTube Music's own sign-in link (hidden under the title bar), else its sign-in page.
    const signIn = () => {
      const link = T.$('ytmusic-nav-bar .sign-in-link, ytmusic-nav-bar a[href*="ServiceLogin"], ytmusic-guide-signin-promo-renderer a[href*="ServiceLogin"]');
      if (link) return link.click();
      location.href = 'https://accounts.google.com/ServiceLogin?ltmpl=music&service=youtube&passive=true&continue=' +
        encodeURIComponent('https://www.youtube.com/signin?action_handle_signin=true&app=desktop&next=https%3A%2F%2Fmusic.youtube.com%2F');
    };
    const tbIcon = (key, icon, onclick, size = 24) =>
      h('button', { class: 'tb-icon', type: 'button', title: T.t(`titlebar.${key}`), 'aria-label': T.t(`titlebar.${key}`), onclick },
        T.icon(icon, size));
    const win = (action) => () => T.invoke('titlebar_action', { action }).catch(report);
    const maxBtn = h('button', { class: 'tb-win', type: 'button', onclick: win('toggle-maximize') },
      h('span', { class: 'tb-maximize' }, winIcon(['rect', { x: '.5', y: '.5', width: '9', height: '9' }])),
      h('span', { class: 'tb-restore' }, winIcon(['path', { d: 'M2.5 2.5V.5h7v7h-2' }], ['rect', { x: '.5', y: '2.5', width: '7', height: '7' }])));
    const titlebar = h('div', { id: 'takaro-titlebar' },
      h('div', { class: 'tb-left' },
        tbIcon('menu', ICONS.menu, () => T.$('ytmusic-nav-bar #guide-button')?.click()),
        tbIcon('back', ICONS.back, () => history.back()),
        tbIcon('forward', ICONS.forward, () => history.forward())),
      h('div', { class: 'tb-drag' }),
      h('div', { class: 'tb-settings' },
        // History: YTM shows its own button only on some pages; Takaro's is always here.
        tbIcon('history', ICONS.history, () => T.$('ytmusic-app')?.dispatchEvent(new CustomEvent('yt-navigate', {
          bubbles: true, composed: true, detail: { endpoint: { browseEndpoint: { browseId: 'FEmusic_history' } } } })), 20),
        tbIcon('settings', ICONS.settings, () => T.openSettings(), 20),
        // Signed out: a default avatar where the account picture goes; it opens the sign-in.
        h('button', { class: 'tb-guest', type: 'button', title: T.t('titlebar.signIn'), 'aria-label': T.t('titlebar.signIn'), onclick: signIn },
          h('svg:svg', { viewBox: '0 0 24 24' },
            h('svg:circle', { cx: '12', cy: '12', r: '12', fill: '#5f6368' }),
            h('svg:circle', { cx: '12', cy: '9.5', r: '4', fill: '#e8eaed' }),
            h('svg:path', { d: 'M4.6 19.6c1.5-2.9 4.2-4.6 7.4-4.6s5.9 1.7 7.4 4.6A10.9 10.9 0 0 1 12 23a10.9 10.9 0 0 1-7.4-3.4z', fill: '#e8eaed' })))),
      h('button', { class: 'tb-win', type: 'button', title: T.t('titlebar.minimize'), 'aria-label': T.t('titlebar.minimize'), onclick: win('minimize') },
        winIcon(['path', { d: 'M0 5.5h10' }])),
      maxBtn,
      h('button', { class: 'tb-win tb-close', type: 'button', title: T.t('titlebar.close'), 'aria-label': T.t('titlebar.close') },
        winIcon(['path', { d: 'M0 0l10 10M10 0 0 10' }])));
    // X: quit, or hide to the tray (General → Close button).
    titlebar.lastChild.onclick = () => win(T.closeToTray() ? 'hide' : 'close')();
    // Empty areas drag the window; double-click maximizes/restores.
    titlebar.addEventListener('mousedown', (e) => {
      // A click here never reaches YouTube Music (it starts a window drag), so close its open
      // search box ourselves, as a click anywhere else would.
      const search = T.$('ytmusic-search-box');
      if (search?.hasAttribute('opened')) {
        (search.polymerController || search).opened = false;
        search.querySelector('input')?.blur();
      }
      if (e.button !== 0 || e.target.closest('button')) return;
      win(e.detail === 2 ? 'toggle-maximize' : 'drag')();
    });
    T.bar = {
      setMaximized(maximized) {
        titlebar.classList.toggle('tb-max', !!maximized);
        const label = T.t(maximized ? 'titlebar.restore' : 'titlebar.maximize');
        maxBtn.title = label;
        maxBtn.setAttribute('aria-label', label);
      },
    };
    T.bar.setMaximized(false);
    document.body.append(titlebar);
    win('sync')(); // Rust answers with the current maximized state

    // ── Page scrollbar (below the title bar, above the player bar) ──
    {
      const BAR = 48 / T.zoom(); // top row height in page pixels
      const thumb = h('div');
      const track = h('div', { id: 'takaro-scroll', hidden: true }, thumb);
      let geo = null;
      const measure = () => {
        const layout = T.$('ytmusic-app-layout');
        if (layout?.hasAttribute('player-page-open') || document.documentElement.classList.contains('tk-lock')) return null;
        const doc = document.documentElement;
        const view = innerHeight;
        const total = doc.scrollHeight;
        // Use YTM's "player-visible" flag + the bar's height (its position animates when it slides in).
        const playerBar = T.$('ytmusic-player-bar');
        const bottom = T.$('ytmusic-app-layout')?.hasAttribute('player-visible') ? playerBar?.offsetHeight || 0 : 0;
        const trackH = view - BAR - bottom;
        if (total <= view + 1 || trackH < 40) return null;
        const thumbH = Math.max(32, (trackH * view) / total);
        return { view, total, bottom, trackH, thumbH, max: total - view };
      };
      let queued = false;
      const update = () => {
        queued = false;
        geo = measure();
        track.hidden = !geo;
        if (!geo) return;
        track.style.height = `${geo.trackH}px`;
        thumb.style.height = `${geo.thumbH}px`;
        thumb.style.top = `${((geo.trackH - geo.thumbH) * Math.min(scrollY, geo.max)) / geo.max}px`;
      };
      const schedule = () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(update);
      };
      addEventListener('scroll', schedule, { passive: true });
      addEventListener('resize', schedule);
      const sizes = new ResizeObserver(schedule);
      sizes.observe(document.body);
      T.waitFor('ytmusic-app-layout').then((layout) => new MutationObserver(schedule).observe(layout, { attributeFilter: ['player-visible', 'player-page-open'] }));
      document.addEventListener('takaro:dataloaded', schedule);

      // Drag the thumb; click the track to jump there.
      track.addEventListener('pointerdown', (e) => {
        if (!geo || e.button !== 0) return;
        e.preventDefault();
        const ratio = geo.max / (geo.trackH - geo.thumbH);
        if (e.target !== thumb) {
          const y = e.clientY - track.getBoundingClientRect().top - geo.thumbH / 2;
          scrollTo({ top: y * ratio, behavior: 'instant' });
        }
        const startY = e.clientY;
        const startScroll = scrollY;
        track.setPointerCapture(e.pointerId);
        track.classList.add('dragging');
        const move = (ev) => scrollTo({ top: startScroll + (ev.clientY - startY) * ratio, behavior: 'instant' });
        const up = () => {
          track.classList.remove('dragging');
          track.removeEventListener('pointermove', move);
          track.removeEventListener('pointerup', up);
          track.removeEventListener('pointercancel', up);
        };
        track.addEventListener('pointermove', move);
        track.addEventListener('pointerup', up);
        track.addEventListener('pointercancel', up);
      });
      document.body.append(track);
      update();
    }

    // Look for a new release once per launch (not on every reload). The flag is only set when the
    // check actually runs: a navigation in between (e.g. "Resume last session") would cancel the timer.
    const checked = () => {
      try {
        return !!sessionStorage.getItem('takaro:update-checked');
      } catch {
        return false;
      }
    };
    if (checked()) return;
    (async () => {
      try {
        const info = await T.invoke('check_update'); // starts right away, in the background
        await T.ready; // show it once YouTube Music is on screen
        if (checked()) return;
        // Only now: if a navigation (e.g. "Resume last session") interrupted us, the next page checks again.
        try {
          sessionStorage.setItem('takaro:update-checked', '1');
        } catch {}
        let skipped = null;
        try {
          skipped = localStorage.getItem(SKIP_KEY);
        } catch {}
        if (info && info.latest !== skipped) T.showUpdate(info);
      } catch (e) {
        report(e);
      }
    })();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
