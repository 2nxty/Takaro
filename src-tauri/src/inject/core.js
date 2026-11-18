// Takaro core: registro de plugins, configurações, helpers de DOM e eventos do player.
// Roda em document-start dentro de music.youtube.com. Os plugins em inject/plugins/
// foram portados do pear-desktop (MIT, (c) th-ch) — ver THIRD_PARTY_NOTICES.md.
(() => {
  if (window.top !== window || location.hostname !== 'music.youtube.com') return;
  if (window.Takaro) return;

  const STORAGE_KEY = 'takaro:settings';
  const T = (window.Takaro = { plugins: [], version: window.__TAKARO_VERSION__ || '0.0.0' });
  /** 'windows' | 'macos' | 'linux' (set by the app). Browser extensions and self-updates are Windows-only. */
  T.platform = window.__TAKARO_PLATFORM__ || 'windows';
  T.isWindows = T.platform === 'windows';

  let stored = {};
  try {
    stored = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {}

  // ── Config ───────────────────────────────────────────────
  T.save = (id, patch) => {
    const p = T.plugins.find((x) => x.id === id);
    if (p) Object.assign(p.config, patch);
    stored[id] = { ...(stored[id] || {}), ...patch };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch {}
    // Plugins with a live() hook apply their settings (on/off included) right away, no reload.
    if (p?.live && liveReady) safe(p, 'live', () => p.live(p.config));
  };
  let liveReady = false;

  // ── i18n ─────────────────────────────────────────────────
  // Traduções em src-tauri/src/i18n/*.json (embutidas no build). Idioma: o escolhido no
  // painel, ou "auto" = idioma da interface do YouTube Music → do sistema → en.
  T.locales = window.__TAKARO_LOCALES__ || {};
  T.FALLBACK_LANG = 'en';
  T.getLanguagePref = () => stored.__takaro?.language || 'auto';
  T.closeToTray = () => stored.__takaro?.closeToTray ?? true; // default: X hides to the tray
  T.zoom = () => Math.min(1.2, Math.max(0.8, Number(stored.__takaro?.zoom) || 1)); // page scaling
  T.overlayEnabled = () => !!stored.__takaro?.overlay;
  // OBS overlay settings, as passed to the `set_overlay` command.
  T.OVERLAY_DEFAULTS = { port: 13091, from: '#ff3040', to: '#781ec8' };
  T.overlayArgs = (enabled = T.overlayEnabled()) => {
    const o = stored.__takaro || {};
    return {
      enabled,
      port: Number(o.overlayPort) || T.OVERLAY_DEFAULTS.port,
      from: o.overlayFrom || T.OVERLAY_DEFAULTS.from,
      to: o.overlayTo || T.OVERLAY_DEFAULTS.to,
    };
  };
  /** OBS overlay style (the page's ?layout=): card, compact or text. */
  T.overlayLayout = () => {
    const l = stored.__takaro?.overlayLayout;
    return ['card', 'compact', 'text'].includes(l) ? l : 'card';
  };
  let langCache = null;
  T.lang = () => {
    if (langCache) return langCache;
    const codes = Object.keys(T.locales);
    const pref = T.getLanguagePref();
    const pageLang = document.documentElement?.lang;
    const wanted = pref !== 'auto' ? [pref] : [pageLang, ...(navigator.languages || [navigator.language])];
    let found = T.FALLBACK_LANG;
    for (const w of wanted.filter(Boolean)) {
      const lw = w.toLowerCase();
      const hit = codes.find((c) => c.toLowerCase() === lw) || codes.find((c) => c.split('-')[0].toLowerCase() === lw.split('-')[0]);
      if (hit) {
        found = hit;
        break;
      }
    }
    // Só fixa o resultado quando a página já informou o idioma dela.
    if (pref !== 'auto' || pageLang) langCache = found;
    return found;
  };
  const lookup = (dict, key) => key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), dict);
  T.t = (key, vars) => {
    let s = lookup(T.locales[T.lang()], key) ?? lookup(T.locales[T.FALLBACK_LANG], key) ?? key;
    if (vars && typeof s === 'string') s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
    return s;
  };

  // ── Reload without YTM's "Reload site? Changes may not be saved" prompt ──
  // Registered at document-start, so it runs before YTM's own beforeunload handlers.
  let forceReload = false;
  window.addEventListener('beforeunload', (e) => forceReload && e.stopImmediatePropagation(), true);
  T.reload = () => {
    document.dispatchEvent(new Event('takaro:beforereload')); // e.g. save the playback position
    forceReload = true;
    location.reload();
  };
  // Full-page navigation without YTM's "Leave site?" prompt (shown while something plays).
  T.replace = (url) => {
    document.dispatchEvent(new Event('takaro:beforereload'));
    forceReload = true;
    location.replace(url);
  };

  // Settings that only apply after a reload (plugins + language), as a stable string: the panel
  // shows "Reload" only while this differs from what the page was loaded with.
  const stable = (v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? `{${Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}`
      : JSON.stringify(v ?? null);
  // Effective config (defaults + saved), so turning something on and back off counts as unchanged.
  // Only what needs a reload counts: not plugins with a live() hook, nor options marked `live`.
  T.effectiveConfig = (p) => {
    if (p.live) return '';
    const all = { ...p.defaults, ...(stored[p.id] || {}) };
    const cfg = { enabled: all.enabled }; // internal state (saved volume, last choice...) never counts
    for (const o of p.options || []) if (!o.live) cfg[o.key] = all[o.key];
    return stable(cfg);
  };
  const loadedLanguage = stored.__takaro?.language || 'auto';
  T.settingsChanged = () =>
    (stored.__takaro?.language || 'auto') !== loadedLanguage || T.plugins.some((p) => T.effectiveConfig(p) !== p.loadedConfig);

  // ── IPC ──────────────────────────────────────────────────
  T.invoke = (cmd, args) =>
    window.__TAURI_INTERNALS__ ? window.__TAURI_INTERNALS__.invoke(cmd, args) : Promise.reject(new Error('Tauri IPC unavailable'));

  // ── DOM helpers (sem innerHTML: a página exige Trusted Types) ──
  const SVG_NS = 'http://www.w3.org/2000/svg';
  T.h = (tag, props, ...children) => {
    const isSvg = tag.startsWith('svg:');
    const el = isSvg ? document.createElementNS(SVG_NS, tag.slice(4)) : document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (!isSvg && (k === 'checked' || k === 'value' || k === 'selected' || k === 'disabled')) el[k] = v;
      else el.setAttribute(k === 'className' ? 'class' : k, v === true ? '' : v);
    }
    for (const c of children.flat(Infinity)) {
      if (c == null || c === false) continue;
      el.append(c instanceof Node ? c : String(c));
    }
    return el;
  };
  T.icon = (d, size = 24) =>
    T.h('svg:svg', { viewBox: '0 0 24 24', width: size, height: size, fill: 'currentColor', style: 'pointer-events:none;display:block' },
      T.h('svg:path', { d }));

  // At document-start the <html> element may not exist yet: wait for it instead of throwing.
  const whenRoot = (fn) => {
    if (document.documentElement) return fn();
    const obs = new MutationObserver(() => {
      if (document.documentElement) {
        obs.disconnect();
        fn();
      }
    });
    obs.observe(document, { childList: true });
  };
  T.css = (text) => {
    const style = T.h('style', null, text);
    whenRoot(() => (document.head || document.documentElement).append(style));
    return style;
  };

  T.$ = (sel) => document.querySelector(sel);

  // One shared observer for every pending waitFor, and the queries are batched (at most one pass
  // every 50 ms) instead of running on each of the thousands of DOM mutations YTM makes.
  const waiters = new Set();
  let observer = null;
  let scheduled = false;
  const checkWaiters = () => {
    scheduled = false;
    for (const w of waiters) {
      const el = w.root.querySelector(w.selector);
      if (el) {
        waiters.delete(w);
        w.resolve(el);
      }
    }
    if (!waiters.size && observer) {
      observer.disconnect();
      observer = null;
    }
  };
  T.waitFor = (selector, root = document) =>
    new Promise((resolve) => {
      const found = document.documentElement && root.querySelector(selector);
      if (found) return resolve(found);
      waiters.add({ selector, root, resolve });
      if (observer) return;
      observer = new MutationObserver(() => {
        if (scheduled) return;
        scheduled = true;
        setTimeout(checkWaiters, 50);
      });
      whenRoot(() => observer?.observe(document.documentElement, { childList: true, subtree: true }));
    });

  T.debounce = (fn, ms) => {
    let t;
    return (...a) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...a), ms);
    };
  };

  // ── Registro de plugins ──────────────────────────────────
  // { id, name, description, defaults:{enabled,...}, options:[...],
  //   early(cfg), start(cfg), onPlayer(api, cfg) }
  T.register = (plugin) => {
    plugin.config = { ...plugin.defaults, ...(stored[plugin.id] || {}) };
    if (plugin.core) plugin.config.enabled = true; // built-in feature: always on, not listed in Plugins
    plugin.loadedConfig = T.effectiveConfig(plugin);
    T.plugins.push(plugin);
    if (plugin.config.enabled && plugin.early) safe(plugin, 'early', () => plugin.early(plugin.config));
  };

  const safe = (plugin, phase, fn) => {
    try {
      const r = fn();
      if (r && r.catch) r.catch((e) => console.error(`[takaro:${plugin.id}] ${phase}`, e));
    } catch (e) {
      console.error(`[takaro:${plugin.id}] ${phase}`, e);
    }
  };

  const enabled = () => T.plugins.filter((p) => p.config.enabled);

  async function boot() {
    for (const p of enabled()) if (p.start) safe(p, 'start', () => p.start(p.config));
    liveReady = true;
    for (const p of T.plugins) if (p.live) safe(p, 'live', () => p.live(p.config));

    const api = await T.waitFor('#movie_player');
    while (typeof api.getPlayerState !== 'function' || !T.$('video')) {
      await new Promise((r) => setTimeout(r, 100));
    }
    T.api = api;

    // Playback shortcuts (tray menu). The player bar buttons keep YTM's queue logic intact.
    const press = (sel) => T.$(`ytmusic-player-bar ${sel}`)?.click();
    T.control = {
      toggle: () => press('#play-pause-button'),
      next: () => press('.next-button'),
      previous: () => press('.previous-button'),
    };

    // Player "⋮" menu hook: plugins add their own rows. One batched observer for all of them;
    // rows are rebuilt every time the menu opens, so a menu YTM recycled never keeps a dead row.
    const menuHandlers = [];
    // Opened from the bar's ⋮ button, or by right-clicking the bar itself (same menu).
    const isPlayerMenu = (menu) =>
      !!menu?.parentElement?.ytEventForwardingBehavior?.forwarder_?.eventSink?.matches?.('ytmusic-menu-renderer.ytmusic-player-bar, ytmusic-player-bar');
    const isTrackMenu = () => {
      for (const el of document.querySelectorAll('tp-yt-paper-listbox #navigation-endpoint')) {
        if (el?.data?.addToPlaylistEndpoint?.videoId || el?.data?.watchEndpoint?.videoId) return true;
      }
      return false;
    };
    const syncMenu = () => {
      const menu = T.$('ytmusic-menu-popup-renderer tp-yt-paper-listbox');
      const ok = !!menu && isPlayerMenu(menu) && isTrackMenu();
      let added = false;
      for (const h of menuHandlers) {
        for (const old of document.querySelectorAll(`.${h.cls}`)) if (!ok || old.parentElement !== menu) old.remove();
        if (ok && !menu.querySelector(`:scope > .${h.cls}`)) {
          added = true;
          const row = h.build();
          row.classList.add(h.cls);
          const after = h.position.startsWith('after:') && menu.querySelector(`:scope > .${h.position.slice(6)}`);
          if (after) after.after(row);
          else h.position === 'end' ? menu.append(row) : menu.prepend(row);
        }
      }
      // YTM placed the menu for its own rows only: place it again with ours, or it no longer fits
      // and gets a scrollbar although there's room.
      if (added) {
        const dropdown = menu.closest('tp-yt-iron-dropdown');
        dropdown?.refit?.();
      }
    };
    let menuQueued = false;
    new MutationObserver(() => {
      if (menuQueued || !menuHandlers.length) return;
      menuQueued = true;
      requestAnimationFrame(() => {
        menuQueued = false;
        syncMenu();
      });
    }).observe(T.$('ytmusic-app') || document.body, { childList: true, subtree: true });
    /** Adds a row to the player bar's ⋮ menu. build() must return a new element each time.
     *  position: 'start' | 'end' | 'after:<class of another Takaro row>'. */
    T.onPlayerMenu = (cls, build, position = 'start') => menuHandlers.push({ cls, build, position });

    // Reemite os eventos do player como eventos do documento.
    api.addEventListener('videodatachange', (name, data) => {
      document.dispatchEvent(new CustomEvent('takaro:videodatachange', { detail: { name, data } }));
      if (name === 'dataloaded') {
        document.dispatchEvent(new CustomEvent('takaro:dataloaded', { detail: api.getPlayerResponse?.() }));
      }
    });

    for (const p of enabled()) if (p.onPlayer) safe(p, 'onPlayer', () => p.onPlayer(api, p.config));

    // Se uma faixa já estava carregada antes dos listeners existirem.
    if (api.getPlayerResponse?.()?.videoDetails?.videoId) {
      document.dispatchEvent(new CustomEvent('takaro:dataloaded', { detail: api.getPlayerResponse() }));
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else setTimeout(boot, 0);
})();
