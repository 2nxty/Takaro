// Synced lyrics — replaces the content of YouTube Music's Lyrics tab with time-synced lines.
// Providers (in order): Better Lyrics (cache-first public API) → LRCLIB. Falls back to plain text,
// and leaves YouTube Music's own lyrics alone when nothing is found.
// Inspired by ytmdesktop2's lyrics plugin (CC0) and Better Lyrics / LRCLIB.
(() => {
  const T = window.Takaro;
  if (!T) return;

  const CSS = `
    .tk-lyrics-on > :not(#tk-lyrics) { display: none !important; }
    #tk-lyrics { padding: 8px 0 120px; font-family: 'YouTube Sans', Roboto, sans-serif; }
    #tk-lyrics .tk-ly-line { padding: 6px 8px; margin: 2px 0; border-radius: 8px; font-size: 22px; line-height: 1.35;
      font-weight: 600; color: rgba(255,255,255,.38); cursor: pointer; transition: color .2s, background .2s; }
    #tk-lyrics .tk-ly-line:hover { color: rgba(255,255,255,.7); background: rgba(255,255,255,.04); }
    #tk-lyrics .tk-ly-line.active { color: #fff; }
    #tk-lyrics .tk-ly-line.past { color: rgba(255,255,255,.55); }
    #tk-lyrics.plain .tk-ly-line { color: rgba(255,255,255,.85); cursor: default; font-size: 18px; font-weight: 500; }
    #tk-lyrics .tk-ly-gap { height: 18px; }
    #tk-lyrics .tk-ly-source { margin: 24px 8px 0; font-size: 12px; color: rgba(255,255,255,.4); }
  `;

  // ── Parsers ──
  const parseLrc = (text) => {
    const lines = [];
    for (const raw of text.split(/\r?\n/)) {
      const stamps = [...raw.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)];
      if (!stamps.length) continue;
      const words = raw.replace(/\[[^\]]*\]/g, '').replace(/<\d+:\d+(?:\.\d+)?>/g, '').trim();
      for (const m of stamps) lines.push({ t: Number(m[1]) * 60 + Number(m[2]), text: words });
    }
    return lines.sort((a, b) => a.t - b.t);
  };
  const ttmlTime = (v) => {
    if (!v) return NaN;
    if (/s$/.test(v)) return parseFloat(v);
    const p = v.split(':').map(Number);
    return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p.length === 2 ? p[0] * 60 + p[1] : Number(v);
  };
  const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&');
  // Plain-string TTML parsing (no DOMParser: the page enforces Trusted Types).
  const parseTtml = (ttml) => {
    const lines = [];
    for (const m of ttml.matchAll(/<p\b([^>]*)>([\s\S]*?)<\/p>/g)) {
      const begin = /\bbegin="([^"]+)"/.exec(m[1])?.[1];
      const text = decode(m[2].replace(/<span[^>]*ttm:role="x-bg"[^>]*>[\s\S]*?<\/span>/g, '').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
      const t = ttmlTime(begin);
      if (Number.isFinite(t)) lines.push({ t, text });
    }
    return lines.sort((a, b) => a.t - b.t);
  };

  // ── Providers ──
  const fetchJson = async (url, signal) => {
    const r = await fetch(url, { signal });
    if (!r.ok) return null;
    return r.json();
  };
  const betterLyrics = async (info, signal) => {
    const q = new URLSearchParams({ s: info.title, a: info.artist });
    if (info.duration) q.set('d', String(Math.round(info.duration)));
    if (info.videoId) q.set('videoId', info.videoId);
    if (info.album) q.set('al', info.album);
    const data = await fetchJson(`https://lyrics-api.boidu.dev/getLyrics?${q}`, signal).catch(() => null);
    const lines = data?.ttml ? parseTtml(data.ttml) : [];
    return lines.length ? { lines, synced: true, source: 'Better Lyrics' } : null;
  };
  const lrclib = async (info, signal) => {
    const q = new URLSearchParams({ track_name: info.title, artist_name: info.artist });
    if (info.album) q.set('album_name', info.album);
    if (info.duration) q.set('duration', String(Math.round(info.duration)));
    let hit = await fetchJson(`https://lrclib.net/api/get?${q}`, signal).catch(() => null);
    if (!hit?.syncedLyrics && !hit?.plainLyrics) {
      const results = await fetchJson(`https://lrclib.net/api/search?${new URLSearchParams({ track_name: info.title, artist_name: info.artist })}`, signal).catch(() => null);
      const close = (results || []).filter((h) => !info.duration || Math.abs((h.duration || 0) - info.duration) <= 15);
      hit = close.find((h) => h.syncedLyrics) || close.find((h) => h.plainLyrics) || null;
    }
    if (hit?.syncedLyrics) {
      const lines = parseLrc(hit.syncedLyrics);
      if (lines.length) return { lines, synced: true, source: 'LRCLIB' };
    }
    if (hit?.plainLyrics) return { lines: hit.plainLyrics.split(/\r?\n/).map((text) => ({ t: 0, text: text.trim() })), synced: false, source: 'LRCLIB' };
    return null;
  };

  // "Artist - Song (Official Video)" → cleaner search terms.
  const cleanTitle = (s) => s.replace(/\s*[([][^)\]]*(official|video|audio|lyric|mv|visualizer|remaster)[^)\]]*[)\]]/gi, '').trim();

  T.register({
    id: 'lyrics',
    defaults: { enabled: true, autoOpen: false },
    options: [{ key: 'autoOpen', type: 'checkbox', live: true }],

    onPlayer(api, cfg) {
      T.css(CSS);
      const cache = new Map(); // videoId → result | null
      let current = { id: null, result: null };
      let controller = null;
      let host = null;
      let lineEls = [];
      let activeIndex = -1;
      let userScrolledAt = 0;

      const trackInfo = () => {
        const md = navigator.mediaSession?.metadata;
        const data = api.getVideoData?.() || {};
        const title = cleanTitle(md?.title || data.title || '');
        const artist = (md?.artist || data.author || '').replace(/\s*-\s*Topic$/i, '').split(/\s*[,&]\s*/)[0];
        return { videoId: data.video_id, title, artist, album: md?.album || '', duration: api.getDuration?.() || 0 };
      };

      const findBody = () =>
        T.$('ytmusic-player-page ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]') ||
        T.$('ytmusic-player-page #tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');
      const lyricsHeader = () => document.querySelectorAll('ytmusic-player-page #tabsContent > .tab-header')[1] || null;

      const render = () => {
        const body = findBody();
        const result = current.result;
        document.querySelectorAll('.tk-lyrics-on').forEach((el) => el !== body && el.classList.remove('tk-lyrics-on'));
        if (!body || !result) {
          body?.classList.remove('tk-lyrics-on');
          host?.remove();
          host = null;
          return;
        }
        if (host && host.parentElement === body && host.dataset.id === current.id) return;
        host?.remove();
        host = T.h('div', { id: 'tk-lyrics', class: result.synced ? 'synced' : 'plain' });
        host.dataset.id = current.id;
        lineEls = result.lines.map((l) =>
          l.text
            ? T.h('div', { class: 'tk-ly-line', onclick: () => result.synced && api.seekTo(l.t, true) }, l.text)
            : T.h('div', { class: 'tk-ly-gap' }));
        host.append(...lineEls, T.h('div', { class: 'tk-ly-source' },
          `${result.source} · ${T.t(result.synced ? 'plugins.lyrics.synced' : 'plugins.lyrics.plain')}`));
        host.addEventListener('wheel', () => (userScrolledAt = Date.now()), { passive: true });
        body.append(host);
        body.classList.add('tk-lyrics-on');
        activeIndex = -1;
        tick();
      };

      const tick = () => {
        const result = current.result;
        if (!host || !result?.synced) return;
        const t = (api.getCurrentTime?.() || 0) + 0.15;
        let i = -1;
        for (let k = 0; k < result.lines.length; k++) {
          if (result.lines[k].t <= t) i = k;
          else break;
        }
        if (i === activeIndex) return;
        lineEls.forEach((el, k) => {
          el.classList.toggle('active', k === i);
          el.classList.toggle('past', k < i);
        });
        activeIndex = i;
        if (i >= 0 && Date.now() - userScrolledAt > 4000) lineEls[i].scrollIntoView({ block: 'center', behavior: 'smooth' });
      };

      const load = async () => {
        const info = trackInfo();
        if (!info.videoId || !info.title || info.videoId === current.id) return;
        current = { id: info.videoId, result: cache.get(info.videoId) ?? null };
        render();
        if (cache.has(info.videoId)) return;
        controller?.abort();
        controller = new AbortController();
        const signal = controller.signal;
        let result = null;
        try {
          result = (await betterLyrics(info, signal)) || (await lrclib(info, signal));
        } catch {}
        if (signal.aborted) return;
        cache.set(info.videoId, result);
        if (current.id !== info.videoId) return;
        current.result = result;
        // YTM disables its Lyrics tab when it has none; ours make it usable.
        const header = lyricsHeader();
        if (result && header) {
          header.removeAttribute('disabled');
          header.setAttribute('aria-disabled', 'false');
          if (cfg.autoOpen && T.$('ytmusic-app-layout')?.hasAttribute('player-page-open')) header.click();
        }
        render();
      };

      // Metadata settles a moment after the track changes.
      document.addEventListener('takaro:dataloaded', () => [300, 1500].forEach((ms) => setTimeout(load, ms)));
      document.addEventListener('timeupdate', tick, true);
      let queued = false;
      new MutationObserver(() => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => {
          queued = false;
          if (findBody() !== host?.parentElement) render();
        });
      }).observe(T.$('ytmusic-player-page') || document.body, { childList: true, subtree: true });
      setTimeout(load, 500);
    },
  });
})();
