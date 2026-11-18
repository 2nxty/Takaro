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

  const plugin = {
    id: 'adblock',
    defaults: { enabled: false, trackers: true },
    options: [{ key: 'trackers', type: 'checkbox' }],

    // Document start, before YouTube Music's own scripts.
    early(cfg) {
      if (cfg.trackers !== false && location.hostname === 'music.youtube.com') blockTrackers();
    },

    start() {
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
