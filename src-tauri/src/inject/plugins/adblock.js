// Ad blocker — uBlock Origin's filter lists for YouTube Music, run with AdGuard's scriptlets
// (both downloaded by the app, see src-tauri/src/adblock.rs). The rules themselves run before
// YouTube Music's scripts, from the app; this plugin only turns them on/off and keeps the lists
// fresh. Turning it on or off applies after a reload.
//
// "Block trackers": telemetry and ad-tracking requests are answered empty instead of being sent.
// Only requests that nothing depends on (the same ones EasyPrivacy blocks). Never blocked: watch
// time / playback stats (your history and recommendations) and /api/stats/atr (YouTube's bot check,
// without it nothing plays).
(() => {
  const T = window.Takaro;
  if (!T) return;

  const TRACKERS = [
    /^https:\/\/music\.youtube\.com\/api\/stats\/(qoe|ads)\b/, // player quality telemetry, ad tracking
    /^https:\/\/(music|www)\.youtube\.com\/youtubei\/v1\/log_event\b/, // client event log
    /^https:\/\/(music|www)\.youtube\.com\/(pagead|ptracking_ads)\//, // ad conversion pings
    /^https:\/\/play\.google\.com\/log\b/, // Google client logging
    /^https:\/\/([\w-]+\.)*(doubleclick\.net|googlesyndication\.com|googleadservices\.com|googletagservices\.com|google-analytics\.com|googletagmanager\.com)\//,
  ];
  const isTracker = (url) => {
    try {
      const u = new URL(String(url), location.href).href;
      return TRACKERS.some((re) => re.test(u));
    } catch {
      return false;
    }
  };

  const blockTrackers = () => {
    let blocked = 0;
    const count = () => (window.__TAKARO_TRACKERS_BLOCKED__ = ++blocked);

    const fetch0 = window.fetch;
    window.fetch = function (input, init) {
      const url = input instanceof Request ? input.url : input;
      if (isTracker(url)) {
        count();
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      return fetch0.apply(this, arguments);
    };

    const open0 = XMLHttpRequest.prototype.open;
    const send0 = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (method, url) {
      this.__tkBlocked = isTracker(url);
      return open0.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function () {
      if (!this.__tkBlocked) return send0.apply(this, arguments);
      count();
      // Looks like an empty, finished request to the page.
      queueMicrotask(() => {
        for (const type of ['readystatechange', 'load', 'loadend']) this.dispatchEvent(new Event(type));
      });
    };

    if (navigator.sendBeacon) {
      const beacon0 = navigator.sendBeacon.bind(navigator);
      navigator.sendBeacon = (url, data) => (isTracker(url) ? (count(), true) : beacon0(url, data));
    }

    // Tracking pixels (new Image().src = …).
    const src = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
    if (src?.set) {
      Object.defineProperty(HTMLImageElement.prototype, 'src', {
        ...src,
        set(v) {
          if (isTracker(v)) return void count();
          return src.set.call(this, v);
        },
      });
    }
  };

  // ── Skip ads that still get through ──
  // While an ad plays (#movie_player.ad-showing): a "Skip ad" button, and with "Skip ads
  // automatically" the ad is skipped right away — YouTube's own Skip button if there is one,
  // otherwise the ad's video is taken to its end.
  // In order: YouTube's own Skip button; the ad's video taken to its end; the ad played muted at
  // 16× (volume and speed come back when it ends). `stuck`: the ad hasn't moved for a few seconds
  // (it happens: an ad that never loads) — then the player goes to the next song, which ends it.
  const skipNow = (stuck = false) => {
    const p = document.getElementById('movie_player');
    if (!p?.classList.contains('ad-showing')) return false;
    const btn = p.querySelector('.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-ad-skip-button-slot button');
    if (btn) {
      btn.click();
      return true;
    }
    const v = p.querySelector('video');
    if (v && Number.isFinite(v.duration) && v.duration > 0 && v.currentTime < v.duration - 0.1) {
      v.currentTime = v.duration;
    }
    if (v) {
      if (!v.__tkAd) v.__tkAd = { muted: v.muted, rate: v.playbackRate };
      v.muted = true;
      v.playbackRate = 16;
    }
    if (stuck) T.$('ytmusic-player-bar .next-button')?.click();
    return true;
  };
  // After the ad: the song's own volume and speed back.
  const restoreAfterAd = () => {
    const v = document.querySelector('#movie_player video');
    if (!v?.__tkAd) return;
    v.muted = v.__tkAd.muted;
    v.playbackRate = v.__tkAd.rate;
    delete v.__tkAd;
    v.dispatchEvent(new Event('ratechange')); // lets the speed plugin put the chosen speed back
  };
  let skipperOn = false;
  T.adSkipper = (cfg) => {
    if (skipperOn) return;
    skipperOn = true;
    T.css(`
      #takaro-skip-ad { position: fixed; right: 24px; bottom: calc(var(--ytmusic-player-bar-height, 72px) + 16px); z-index: 2000;
        display: none; align-items: center; gap: 8px; padding: 10px 18px; border: 0; border-radius: 9999px; cursor: pointer;
        background: rgba(15, 15, 15, .92); color: #fff; font: 500 14px/20px Roboto, sans-serif; box-shadow: 0 4px 16px rgba(0,0,0,.5); }
      #takaro-skip-ad:hover { background: #272727; }
      html.tk-ad-showing #takaro-skip-ad { display: inline-flex; }
      /* During an ad the player's buttons don't apply to it: hidden (space kept, nothing jumps). */
      html.tk-ad-showing ytmusic-player-bar .left-controls,
      html.tk-ad-showing ytmusic-player-bar .middle-controls-buttons,
      html.tk-ad-showing ytmusic-player-bar .right-controls,
      html.tk-ad-showing ytmusic-player-bar #progress-bar,
      html.tk-ad-showing ytmusic-player #takaro-video-toggle,
      html.tk-ad-showing ytmusic-player .top-row-buttons { visibility: hidden !important; }
    `);
    const adShowing = () => !!document.getElementById('movie_player')?.classList.contains('ad-showing');
    // Clicked: skip now, and if the ad is still there a moment later, go to the next song.
    const button = T.h('button', { id: 'takaro-skip-ad', type: 'button', onclick: () => {
      skipNow();
      setTimeout(() => adShowing() && skipNow(true), 1500);
    } }, T.t('plugins.adblock.skip'), T.icon('M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z', 18));
    let timer = 0;
    T.waitFor('#movie_player').then((player) => {
      document.body.append(button);
      const sync = () => {
        const ad = player.classList.contains('ad-showing');
        document.documentElement.classList.toggle('tk-ad-showing', ad);
        clearInterval(timer);
        if (!ad) return restoreAfterAd();
        if (cfg.autoSkip === false) return;
        // The Skip button / the ad's duration show up a moment after the ad starts: keep trying; if
        // the ad doesn't move for 4 s (one that never loads), the next song.
        let still = 0;
        let last = -1;
        skipNow();
        timer = setInterval(() => {
          if (!player.classList.contains('ad-showing')) return clearInterval(timer);
          const v = player.querySelector('video');
          const t = v?.currentTime ?? 0;
          // (Paused by you isn't stuck.)
          still = !v?.paused && Math.abs(t - last) < 0.01 ? still + 1 : 0;
          last = t;
          if (still >= 16) {
            clearInterval(timer);
            return skipNow(true);
          }
          skipNow();
        }, 250);
      };
      new MutationObserver(sync).observe(player, { attributeFilter: ['class'] });
      sync();
    });
  };

  const plugin = {
    id: 'adblock',
    defaults: { enabled: true, trackers: true, autoSkip: true },
    options: [
      { key: 'trackers', type: 'checkbox' },
      { key: 'autoSkip', type: 'checkbox' },
    ],

    // Document start, before YouTube Music's own scripts.
    early(cfg) {
      if (cfg.trackers !== false && location.hostname === 'music.youtube.com') blockTrackers();
    },

    start(cfg) {
      T.adSkipper(cfg);
      // Downloads the lists the first time (then once a day) and, if this page started without
      // the blocker (just downloaded), adds it now.
      T.invoke('set_adblock', { enabled: true })
        .then((s) => console.info(`[Takaro] ad blocker: ${s.rules} rules for YouTube Music`))
        .catch((e) => console.warn('[Takaro] ad blocker:', e));
    },
  };
  T.register(plugin);

  // Off: tell the app to stop refreshing the lists.
  if (!plugin.config.enabled) {
    addEventListener('load', () => T.invoke('set_adblock', { enabled: false }).catch(() => {}), { once: true });
  }
})();
