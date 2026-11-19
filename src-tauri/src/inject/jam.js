// Takaro Jam — a built-in Takaro feature (not a plugin): shared listening rooms. Everyone plays the same song in their own YouTube Music
// (their own account; nothing is streamed between people). The room server (jam-server/, a
// Cloudflare Worker + one Durable Object per room) keeps the room: who's in it, the host's
// playback state (song, position, playing, stamped with the server clock) and a shared queue.
//
//  - The host's player is the reference: it reports what it plays; guests follow (drift > 1.5 s is
//    corrected; a client watching an ad catches up afterwards).
//  - The room queue comes first: when the host's song ends, the next room item plays; with the
//    room queue empty, the host's own YouTube Music autoplay goes on and guests follow it.
//  - What guests may do is set by the host: "host" (nothing), "queue" (add songs, default) or
//    "control" (also play / pause / seek / skip). Their player buttons are hidden otherwise.
//  - Volume is never shared.
// UI: Settings → Jam (built here as T.jamTab), "Add to Jam" in songs' ⋮ menus, tak://jam/<CODE> links.
(() => {
  const T = window.Takaro;
  if (!T) return;

  const SESSION_KEY = 'takaro:jam';
  const HEARTBEAT = '{"version":1,"type":"hb"}';
  const DRIFT = 1.5; // seconds of difference before a guest seeks
  const CODE_RE = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;
  const ICON_JAM =
    'M12 3a9 9 0 0 0-9 9v7a2 2 0 0 0 2 2h2a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1H5v-1a7 7 0 0 1 14 0v1h-2a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2a2 2 0 0 0 2-2v-7a9 9 0 0 0-9-9z';
  const ICON_ADD = 'M14 10H3v2h11v-2zm0-4H3v2h11V6zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM3 16h7v-2H3v2z';

  // Jam settings (your name, a custom server), kept apart from the plugins' settings.
  const SETTINGS_KEY = 'takaro:jam-settings';
  let settings = {};
  try {
    settings = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
  } catch {}
  const cfg = () => settings;
  const saveSettings = (patch) => {
    settings = { ...settings, ...patch };
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {}
  };

  /** The room server, as ws(s)://host (Settings → Jam overrides the app's default). */
  const server = () => (cfg().server || window.__TAKARO_JAM_URL__ || '').trim().replace(/\/+$/, '');

  /** "tak://jam/A7K92P", "a7k-92p"… → "A7K92P", or null. */
  const parseCode = (text) => {
    const s = String(text || '').trim();
    const m = s.match(/jam\/([A-Za-z0-9-]+)/i);
    const code = (m ? m[1] : s).replace(/[\s-]/g, '').toUpperCase();
    return CODE_RE.test(code) ? code : null;
  };

  // ── State ───────────────────────────────────────────────
  const S = {
    status: 'idle', // idle | connecting | connected | reconnecting
    error: '', // last error text (translated)
    code: '',
    you: '',
    room: null, // { code, hostId, permission, participants, queue, playback }
    offset: 0, // server clock − local clock (ms)
    rtt: Infinity,
    invite: '', // code from a tak://jam link, shown in the join form
  };
  let ws = null;
  let intentional = false; // we closed the socket on purpose
  let retry = 0;
  let retryTimer = 0;
  let hbTimer = 0;
  let clockTimer = 0;

  const isHost = () => !!S.room && S.room.hostId === S.you;
  const inRoom = () => S.status === 'connected' && !!S.room;
  const canAdd = () => inRoom() && (isHost() || S.room.permission !== 'host');
  const canControl = () => inRoom() && (isHost() || S.room.permission === 'control');
  const serverNow = () => Date.now() + S.offset;

  const loadSession = () => {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY)) || null;
    } catch {
      return null;
    }
  };
  const saveSession = (s) => {
    try {
      if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
      else localStorage.removeItem(SESSION_KEY);
    } catch {}
  };

  // Re-render listeners (the Jam tab, the title bar button, the player locks).
  const listeners = new Set();
  const changed = () => {
    for (const fn of listeners) {
      try {
        fn();
      } catch (e) {
        console.error('[takaro:jam]', e);
      }
    }
  };

  // ── Connection ──────────────────────────────────────────
  const send = (m) => {
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ version: 1, ...m }));
  };

  const syncClock = () => {
    // A few pings; the one with the shortest round trip gives the best offset estimate.
    S.rtt = Infinity;
    for (let i = 0; i < 4; i++) setTimeout(() => send({ type: 'ping', t: Date.now() }), i * 400);
  };

  function open(path, first) {
    const base = server();
    if (!/^wss?:\/\//.test(base)) {
      S.status = 'idle';
      S.error = T.t('jam.errors.noServer');
      return changed();
    }
    closeSocket();
    intentional = false;
    let sock;
    try {
      sock = new WebSocket(`${base}/ws/${path}`);
    } catch (e) {
      S.status = 'idle';
      S.error = T.t('jam.errors.connect');
      console.warn('[takaro:jam]', e);
      return changed();
    }
    ws = sock;
    sock.onopen = () => {
      sock.send(JSON.stringify({ version: 1, ...first }));
      clearInterval(hbTimer);
      hbTimer = setInterval(() => sock.readyState === WebSocket.OPEN && sock.send(HEARTBEAT), 25000);
    };
    sock.onmessage = (e) => {
      if (e.data === HEARTBEAT) return;
      let m;
      try {
        m = JSON.parse(e.data);
      } catch {
        return;
      }
      if (m?.version === 1) onMessage(m);
    };
    sock.onclose = (e) => {
      if (ws !== sock) return; // an older socket
      ws = null;
      clearInterval(hbTimer);
      clearInterval(clockTimer);
      if (intentional) return;
      // 4000 ended/kicked, 4003 full, 4004 not found: final. Anything else: try again.
      if ([4000, 4003, 4004].includes(e.code) || !loadSession()) {
        if (S.status !== 'idle') reset();
        return;
      }
      S.status = 'reconnecting';
      changed();
      clearTimeout(retryTimer);
      retryTimer = setTimeout(rejoin, Math.min(30000, 1000 * 2 ** retry++));
    };
  }

  function closeSocket() {
    clearTimeout(retryTimer);
    clearInterval(hbTimer);
    clearInterval(clockTimer);
    if (ws) {
      intentional = true;
      try {
        ws.close(1000);
      } catch {}
      ws = null;
    }
  }

  /** Back to "not in a room" (keeps the error text, if any). */
  function reset() {
    closeSocket();
    saveSession(null);
    S.status = 'idle';
    S.room = null;
    S.code = '';
    S.you = '';
    host.last = null;
    guest.nav = null;
    changed();
  }

  function rejoin() {
    const s = loadSession();
    if (!s?.code || !s.token || s.server !== server()) return reset();
    S.status = S.room ? 'reconnecting' : 'connecting';
    S.code = s.code;
    changed();
    open(s.code, { type: 'join', name: s.name || cfg().name || 'Takaro', token: s.token });
  }

  const ERR = { not_found: 'notFound', full: 'full', forbidden: 'forbidden', host_offline: 'hostOffline', queue_full: 'queueFull', rate_limited: 'rateLimited' };

  function onMessage(m) {
    switch (m.type) {
      case 'welcome': {
        retry = 0;
        S.status = 'connected';
        S.error = '';
        S.code = m.code;
        S.you = m.you;
        S.room = m.room;
        S.invite = '';
        S.offset = m.serverTime - Date.now();
        saveSession({ server: server(), code: m.code, token: m.token, name: cfg().name || '' });
        syncClock();
        clearInterval(clockTimer);
        clockTimer = setInterval(syncClock, 5 * 60 * 1000);
        host.last = null; // the host reports its state right away
        changed();
        tick();
        break;
      }
      case 'pong': {
        const now = Date.now();
        const rtt = now - m.t;
        if (rtt >= 0 && rtt <= S.rtt) {
          S.rtt = rtt;
          S.offset = m.serverTime - (m.t + rtt / 2);
        }
        break;
      }
      case 'participants':
        if (!S.room) break;
        S.room.participants = m.participants;
        if (S.room.hostId !== m.hostId) {
          S.room.hostId = m.hostId;
          host.last = null;
          if (m.hostId === S.you) toast(T.t('jam.youAreHost'));
        }
        changed();
        break;
      case 'queue':
        if (!S.room) break;
        S.room.queue = m.queue;
        changed();
        break;
      case 'playback':
        if (!S.room || m.playback.revision <= (S.room.playback?.revision ?? -1)) break; // stale
        S.room.playback = m.playback;
        changed();
        if (!isHost()) guest.apply(true);
        break;
      case 'settings':
        if (!S.room) break;
        S.room.permission = m.permission;
        changed();
        break;
      case 'control':
        if (isHost()) host.control(m);
        break;
      case 'queue:play':
        if (!isHost()) break;
        if (m.item) playVideo(m.item.track.videoId);
        else host.ytmNext();
        break;
      case 'ended': {
        const reason = { host: 'endedHost', idle: 'endedIdle', kicked: 'kicked' }[m.reason] || 'endedHost';
        S.error = T.t(`jam.errors.${reason}`);
        toast(S.error);
        reset();
        break;
      }
      case 'error': {
        const key = ERR[m.code];
        const text = key ? T.t(`jam.errors.${key}`) : m.message;
        if (S.status === 'connecting' || m.code === 'not_found' || m.code === 'full') {
          S.error = text;
          reset();
        } else if (m.code !== 'rate_limited') {
          toast(text);
        }
        break;
      }
    }
  }

  // ── Player helpers ──────────────────────────────────────
  let api = null;
  const video = () => T.$('#movie_player video');
  const inAd = () => !!T.$('#movie_player')?.classList.contains('ad-showing');
  let remoteUntil = 0; // until then, player events were caused by us
  const markRemote = (ms = 1500) => (remoteUntil = performance.now() + ms);
  const isRemote = () => performance.now() < remoteUntil;

  const local = () => {
    const d = api?.getVideoData?.() || {};
    const v = video();
    const md = navigator.mediaSession?.metadata;
    const arts = [...(md?.artwork || [])].sort((a, b) => (parseInt(b.sizes) || 0) - (parseInt(a.sizes) || 0));
    const sameMd = md?.title && (!d.title || md.title === d.title);
    // The song's length as YTM shows it (getDuration() and the <video> element are sometimes off).
    const pr = api?.getPlayerResponse?.()?.videoDetails;
    const length = pr?.videoId === d.video_id ? Number(pr.lengthSeconds) || 0 : 0;
    return {
      id: d.video_id || '',
      title: (sameMd ? md.title : d.title) || '',
      artist: (sameMd ? md.artist : d.author) || '',
      album: sameMd ? md.album || '' : '',
      thumbnail: (sameMd && arts[0]?.src) || (d.video_id ? `https://i.ytimg.com/vi/${d.video_id}/hqdefault.jpg` : ''),
      position: api?.getCurrentTime?.() ?? v?.currentTime ?? 0,
      duration: length || api?.getDuration?.() || 0,
      playing: !!v && !v.paused && !v.ended,
      ended: api?.getPlayerState?.() === 0,
    };
  };

  /** Plays a song the YouTube Music way (cover, title and queue update), without leaving the page
   *  the user is on: YTM opens its player page for it, which we close again if it was closed. */
  let navToken = 0;
  async function playVideo(id) {
    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return;
    markRemote(4000);
    const token = ++navToken;
    const layout = T.$('ytmusic-app-layout');
    const wasOpen = !!layout?.hasAttribute('player-page-open');
    T.$('ytmusic-app')?.dispatchEvent(new CustomEvent('yt-navigate', {
      bubbles: true, composed: true, detail: { endpoint: { watchEndpoint: { videoId: id } } },
    }));
    if (wasOpen || !layout) return;
    for (let i = 0; i < 40 && token === navToken; i++) {
      if (layout.hasAttribute('player-page-open')) {
        await new Promise((r) => setTimeout(r, 250));
        if (token === navToken && layout.hasAttribute('player-page-open')) T.$('ytmusic-player-bar .toggle-player-page-button')?.click();
        return;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  /** Presses a player bar button without our own interception. */
  let bypass = false;
  const press = (sel) => {
    bypass = true;
    try {
      T.$(`ytmusic-player-bar ${sel}`)?.click();
    } finally {
      bypass = false;
    }
  };

  // ── Host: report what the player does ──────────────────
  const host = {
    last: null, // { id, title, playing, position, at } as last sent
    nextFor: '', // the song we already asked the next room item for
    report(s) {
      const track = s.id
        ? { videoId: s.id, title: s.title || s.id, artist: s.artist, ...(s.album ? { album: s.album } : {}),
            ...(s.thumbnail ? { thumbnail: s.thumbnail } : {}), ...(s.duration > 0 ? { duration: s.duration } : {}) }
        : null;
      send({ type: 'state', track, position: Math.max(0, s.position || 0), playing: s.playing });
      host.last = { id: s.id, title: s.title, playing: s.playing, position: s.position, duration: s.duration, at: performance.now() };
      // Our own room view follows too.
      if (S.room) S.room.playback = { ...S.room.playback, track, position: s.position, playing: s.playing, updatedAt: serverNow() };
      changed();
    },
    /** The next song: the room queue first, else YouTube Music's own. */
    next() {
      if (S.room?.queue?.length) send({ type: 'queue:next' });
      else host.ytmNext();
    },
    ytmNext() {
      markRemote();
      press('.next-button');
    },
    tick() {
      if (inAd()) return;
      const s = local();
      if (!s.id) return;
      const last = host.last;
      // The song ended (or is about to) and the room queue has something: that plays next.
      const near = s.duration > 0 && s.duration - s.position < 1;
      if (S.room?.queue?.length && host.nextFor !== s.id && ((s.playing && near) || s.ended)) {
        host.nextFor = s.id;
        host.next();
        return;
      }
      // YouTube Music's autoplay moved on before we could: replace it with the room's next song.
      if (last && s.id !== last.id && !isRemote() && S.room?.queue?.length && host.nextFor !== last.id) {
        const lastPos = last.playing ? last.position + (performance.now() - last.at) / 1000 : last.position;
        if (last.duration > 0 && lastPos > last.duration - 3) {
          host.nextFor = last.id;
          host.next();
          return;
        }
      }
      const expected = last ? (last.playing ? last.position + (performance.now() - last.at) / 1000 : last.position) : 0;
      if (!last || s.id !== last.id || s.playing !== last.playing || Math.abs(s.position - expected) > 1 || (s.title && s.title !== last.title)) {
        host.report(s);
      }
    },
    /** A guest (permission "control") asked for something. */
    control(m) {
      const v = video();
      switch (m.action) {
        case 'play':
          if (v?.paused) api?.playVideo?.();
          break;
        case 'pause':
          if (v && !v.paused) api?.pauseVideo?.();
          break;
        case 'seek':
          if (typeof m.position === 'number') api?.seekTo?.(m.position, true);
          break;
        case 'next':
          host.next();
          break;
        case 'previous':
          markRemote();
          press('.previous-button');
          break;
      }
      setTimeout(tick, 300);
    },
  };

  // ── Guest: follow the host ─────────────────────────────
  const guest = {
    nav: null, // { id, at } song we asked YTM to play
    userUntil: 0, // a local control request is on its way: don't undo it meanwhile
    apply(fromMessage = false) {
      const pb = S.room?.playback;
      if (!pb?.track || !api || inAd()) return;
      const s = local();
      const target = pb.track.videoId;
      const now = serverNow();
      let expected = pb.playing ? pb.position + Math.max(0, (now - pb.updatedAt) / 1000) : pb.position;
      const dur = pb.track.duration || 0;
      if (dur) expected = Math.min(expected, dur);
      if (s.id !== target) {
        // Our own autoplay jumped ahead at the end of the song: wait a few seconds for the host's next one.
        if (pb.playing && dur && !fromMessage) {
          const overrun = now - (pb.updatedAt + (dur - pb.position) * 1000);
          if (overrun > -3000 && overrun < 6000) return;
        }
        if (guest.nav?.id === target && performance.now() - guest.nav.at < 8000) return; // loading
        guest.nav = { id: target, at: performance.now() };
        playVideo(target);
        return;
      }
      if (performance.now() < guest.userUntil) return;
      if (s.ended) return;
      const v = video();
      if (!v) return;
      if (pb.playing && v.paused) {
        markRemote();
        api.playVideo?.();
      } else if (!pb.playing && !v.paused) {
        markRemote();
        api.pauseVideo?.();
      }
      if (Math.abs(s.position - expected) > DRIFT && (!dur || expected < dur - 1)) {
        markRemote();
        api.seekTo?.(expected, true);
      }
    },
    /** The user played / paused / seeked their own player. */
    local(type) {
      if (!inRoom() || isHost() || isRemote() || inAd()) return;
      const v = video();
      if (!v || !S.room.playback?.track) return;
      const now = local();
      if (v.ended || now.ended || (now.duration && now.duration - now.position < 1.5)) return; // the song just ended
      if (now.id !== S.room.playback.track.videoId) return;
      if (canControl()) {
        guest.userUntil = performance.now() + 2500;
        if (type === 'seeked') send({ type: 'control', action: 'seek', position: now.position });
        else send({ type: 'control', action: type === 'play' ? 'play' : 'pause' });
      } else {
        setTimeout(() => guest.apply(true), 50); // not allowed: back to the room's state
      }
    },
  };

  function tick() {
    if (!inRoom() || !api) return;
    if (isHost()) host.tick();
    else guest.apply();
  }

  // ── Player bar buttons ─────────────────────────────────
  // Next / previous / play-pause go through the room rules: the host's "next" takes the room queue
  // first; guests with "control" send requests; other guests have no buttons (hidden by CSS).
  const onBarClick = (e) => {
    if (bypass || !inRoom()) return;
    const btn = e.target.closest?.('ytmusic-player-bar .next-button, ytmusic-player-bar .previous-button, ytmusic-player-bar #play-pause-button');
    if (!btn) return;
    const action = btn.matches('.next-button') ? 'next' : btn.matches('.previous-button') ? 'previous' : 'toggle';
    if (isHost()) {
      if (action === 'next' && S.room.queue.length) {
        e.stopImmediatePropagation();
        e.preventDefault();
        host.next();
      }
      return;
    }
    if (action === 'toggle' && canControl()) return; // the video's play/pause events send it
    e.stopImmediatePropagation();
    e.preventDefault();
    if (canControl()) send({ type: 'control', action });
  };

  // ── Toast ──────────────────────────────────────────────
  let toastEl = null;
  let toastTimer = 0;
  function toast(text) {
    if (!text || !document.body) return;
    if (!toastEl) {
      toastEl = T.h('div', { class: 'tk-jam-toast', role: 'status' });
      document.body.append(toastEl);
    }
    toastEl.textContent = text;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3500);
  }

  // ── "Add to Jam" in songs' ⋮ menus ─────────────────────
  const runsText = (runs) => (runs || []).map((r) => r.text).join('');
  const bestThumb = (list) => [...(list || [])].sort((a, b) => (b.width || 0) - (a.width || 0))[0]?.url || '';
  const ARTIST_PAGES = ['MUSIC_PAGE_TYPE_ARTIST', 'MUSIC_PAGE_TYPE_USER_CHANNEL'];
  const artistOf = (runs) => {
    runs = runs || [];
    const artists = runs.filter((r) => ARTIST_PAGES.includes(r.navigationEndpoint?.browseEndpoint?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType));
    if (artists.length) return artists.map((r) => r.text).join(', ');
    return runsText(runs).split(' • ')[0] || '';
  };

  /** The song a ⋮ menu is about: { videoId, title, artist, thumbnail }, from the row it was opened on. */
  function menuTrack(menu) {
    let videoId = '';
    for (const el of menu.querySelectorAll('#navigation-endpoint')) {
      videoId = el?.data?.addToPlaylistEndpoint?.videoId || el?.data?.watchEndpoint?.videoId || '';
      if (videoId) break;
    }
    const sink = menu.parentElement?.ytEventForwardingBehavior?.forwarder_?.eventSink;
    const row = sink?.closest?.('ytmusic-player-bar, ytmusic-responsive-list-item-renderer, ytmusic-two-row-item-renderer, ytmusic-player-queue-item') ||
      (sink?.matches?.('ytmusic-player-bar') ? sink : null);
    // Signed out, the links carry no song: "Play next" / "Add to queue" still do (queueAddEndpoint).
    if (!videoId) {
      for (const item of menu.children) {
        const ep = item.data?.serviceEndpoint?.queueAddEndpoint?.queueTarget;
        if (ep?.videoId) {
          videoId = ep.videoId;
          break;
        }
      }
    }
    if (!videoId && row?.matches('ytmusic-player-bar')) videoId = local().id;
    if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null;
    const d = row?.data || {};
    let title = '';
    let artist = '';
    let thumbnail = '';
    if (!row || row.matches('ytmusic-player-bar') || videoId === local().id) {
      const s = local();
      if (s.id === videoId) ({ title, artist, thumbnail } = s);
    }
    if (!title && d.flexColumns) {
      const col = (i) => d.flexColumns[i]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs;
      title = runsText(col(0));
      artist = artistOf(col(1));
      thumbnail = bestThumb(d.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails);
    } else if (!title && d.title) {
      title = runsText(d.title.runs);
      artist = artistOf(d.shortBylineText?.runs || d.subtitle?.runs);
      thumbnail = bestThumb(d.thumbnail?.thumbnails || d.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails);
    }
    if (!title) title = row?.querySelector?.('.title')?.textContent?.trim() || videoId;
    if (!/^https:\/\//.test(thumbnail)) thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    return { videoId, title, artist, thumbnail };
  }

  function syncMenu() {
    const menu = T.$('ytmusic-menu-popup-renderer tp-yt-paper-listbox');
    const track = menu && canAdd() ? menuTrack(menu) : null;
    for (const old of document.querySelectorAll('.takaro-jam-add')) if (!track || old.parentElement !== menu) old.remove();
    if (!track || menu.querySelector(':scope > .takaro-jam-add')) return;
    const row = T.h('div', { class: 'takaro-jam-add', role: 'option' }, T.icon(ICON_ADD, 18), T.h('span', null, T.t('jam.addToJam')));
    row.addEventListener('click', (e) => {
      e.stopPropagation();
      send({ type: 'queue:add', track });
      toast(T.t('jam.added', { title: track.title }));
      menu.closest('tp-yt-iron-dropdown')?.close?.();
    });
    menu.prepend(row);
    menu.closest('tp-yt-iron-dropdown')?.refit?.();
  }

  // ── Locks + title bar button ───────────────────────────
  let barBtn = null;
  const syncChrome = () => {
    const root = document.documentElement;
    root?.classList.toggle('tk-jam-locked', inRoom() && !canControl());
    root?.classList.toggle('tk-jam-guest', inRoom() && !isHost());
    if (barBtn) {
      barBtn.hidden = S.status === 'idle';
      barBtn.classList.toggle('tk-jam-live', inRoom());
    }
  };
  listeners.add(syncChrome);

  // ── Public API (used by the Jam tab and by Rust for tak://jam links) ──
  T.jam = {
    state: S,
    server,
    isHost,
    canAdd,
    onChange: (fn) => (listeners.add(fn), () => listeners.delete(fn)),
    create(name, permission) {
      saveSettings({ name });
      S.error = '';
      S.status = 'connecting';
      changed();
      open('new', { type: 'create', name, permission });
    },
    join(code, name) {
      saveSettings({ name });
      S.error = '';
      const c = parseCode(code);
      if (!c) {
        S.error = T.t('jam.errors.badCode');
        return changed();
      }
      S.status = 'connecting';
      S.code = c;
      changed();
      saveSession(null);
      open(c, { type: 'join', name });
    },
    leave() {
      send({ type: 'leave' });
      S.error = '';
      reset();
    },
    end() {
      send({ type: 'end' });
      S.error = '';
      reset();
    },
    setPermission: (permission) => send({ type: 'settings', permission }),
    kick: (participantId) => send({ type: 'kick', participantId }),
    remove: (itemId) => send({ type: 'queue:remove', itemId }),
    move: (itemId, index) => send({ type: 'queue:move', itemId, index }),
    skip: () => (isHost() ? host.next() : send({ type: 'control', action: 'next' })),
    playNow(item) {
      // Host: move it to the top and take it.
      send({ type: 'queue:move', itemId: item.id, index: 0 });
      send({ type: 'queue:next' });
    },
    inviteLink: () => (S.code ? `tak://jam/${S.code}` : ''),
    parseCode,
    setServer(url) {
      saveSettings({ server: url.trim() });
      changed();
    },
  };

  /** A tak://jam/<CODE> link was opened: show the Jam tab with the code filled in. */
  T.jamInvite = async () => {
    let code = null;
    try {
      code = await T.invoke('jam_take_invite');
    } catch {}
    code = parseCode(code);
    if (!code) return;
    if (inRoom() && S.code === code) {
      T.openSettings?.('jam');
      return;
    }
    S.invite = code;
    changed();
    T.openSettings?.('jam');
  };

  // ── Settings → Jam tab ─────────────────────────────────
  const h = T.h;
  const PERMS = ['host', 'queue', 'control'];
  const fmtTime = (s) => {
    s = Math.max(0, Math.floor(s || 0));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };
  const ICONS = {
    up: 'M7.41 15.41 12 10.83l4.59 4.58L18 14l-6-6-6 6z',
    down: 'M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z',
    remove: 'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
    play: 'M8 5v14l11-7z',
    skip: 'M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z',
  };
  const smallBtn = (icon, label, onclick) =>
    h('button', { class: 'tk-icon-btn', type: 'button', title: label, 'aria-label': label, onclick }, T.icon(ICONS[icon], 18));
  const permSelect = (value, onchange) => {
    const sel = h('select', { 'aria-label': T.t('jam.permission'), onchange: () => onchange(sel.value) },
      PERMS.map((p) => h('option', { value: p, selected: p === value }, T.t(`jam.perms.${p}`))));
    return sel;
  };
  const trackRow = (track, extra, actions) =>
    h('div', { class: 'tk-jam-track' },
      track.thumbnail ? h('img', { src: track.thumbnail, alt: '', referrerpolicy: 'no-referrer' }) : h('span', { class: 'tk-jam-noart' }),
      h('div', { class: 'tk-jam-meta' },
        h('div', { class: 'tk-jam-title' }, track.title),
        h('div', { class: 'tk-desc' }, [track.artist, extra].filter(Boolean).join(' · '))),
      actions?.length ? h('div', { class: 'tk-actions' }, actions) : null);

  function idleView() {
    const nameInput = h('input', { class: 'tk-url', type: 'text', maxlength: 32, value: cfg().name || '', placeholder: T.t('jam.namePlaceholder'),
      'aria-label': T.t('jam.name') });
    let perm = 'queue';
    const codeInput = h('input', { class: 'tk-url', type: 'text', value: S.invite || '', placeholder: T.t('jam.codePlaceholder'),
      'aria-label': T.t('jam.code'), style: 'text-transform:uppercase' });
    const busy = S.status !== 'idle';
    const needName = () => {
      const name = nameInput.value.trim();
      if (!name) {
        S.error = T.t('jam.errors.noName');
        changed();
      }
      return name;
    };
    const create = h('button', { class: 'tk-btn tk-btn-primary', type: 'button', disabled: busy, onclick: () => {
      const name = needName();
      if (name) T.jam.create(name, perm);
    } }, T.t('jam.create'));
    const join = h('button', { class: S.invite ? 'tk-btn tk-btn-primary' : 'tk-btn', type: 'button', disabled: busy, onclick: () => {
      const name = needName();
      if (name) T.jam.join(codeInput.value, name);
    } }, T.t('jam.join'));
    codeInput.addEventListener('keydown', (e) => e.key === 'Enter' && join.click());

    const serverInput = h('input', { class: 'tk-url', type: 'text', value: cfg().server || '', placeholder: window.__TAKARO_JAM_URL__ || 'wss://…',
      'aria-label': T.t('jam.server'), onchange: () => T.jam.setServer(serverInput.value) });

    return [
      h('p', { class: 'tk-lead' }, T.t('jam.lead')),
      S.invite ? h('p', { class: 'tk-lead', style: 'color:var(--tk-text)' }, T.t('jam.invited', { code: S.invite })) : null,
      h('section', { class: 'tk-card' }, h('div', { class: 'tk-field' }, h('span', { class: 'tk-name' }, T.t('jam.name')), nameInput)),
      h('section', { class: 'tk-card' },
        h('div', { class: 'tk-row' },
          h('div', null, h('div', { class: 'tk-name' }, T.t('jam.createTitle')), h('div', { class: 'tk-desc' }, T.t('jam.createDesc'))),
          create),
        h('div', { class: 'tk-opts' },
          h('div', { class: 'tk-field' }, h('span', null, T.t('jam.permission')), permSelect(perm, (v) => (perm = v))),
          h('div', { class: 'tk-desc' }, T.t('jam.permHint')))),
      h('section', { class: 'tk-card' },
        h('div', { class: 'tk-name' }, T.t('jam.joinTitle')),
        h('div', { class: 'tk-desc' }, T.t('jam.joinDesc')),
        h('div', { class: 'tk-field', style: 'margin-top:12px' }, codeInput, join)),
      busy ? h('p', { class: 'tk-status', style: 'margin:0 4px' }, T.t('jam.connecting')) : null,
      S.error ? h('p', { class: 'tk-status error', style: 'margin:0 4px' }, S.error) : null,
      h('section', { class: 'tk-card' },
        h('div', { class: 'tk-field' }, h('span', null, T.t('jam.server')), serverInput),
        h('div', { class: 'tk-desc', style: 'margin-top:8px' }, T.t('jam.serverHint'))),
    ];
  }

  function roomView() {
    const r = S.room;
    const amHost = isHost();
    const people = new Map(r.participants.map((p) => [p.id, p]));
    const hostName = people.get(r.hostId)?.name || '—';
    const copyBtn = (label, text, primary) => {
      const btn = h('button', { class: primary ? 'tk-btn tk-btn-primary' : 'tk-btn', type: 'button' }, label);
      btn.onclick = async () => {
        try {
          await navigator.clipboard.writeText(text);
          btn.textContent = T.t('jam.copied');
          setTimeout(() => (btn.textContent = label), 1500);
        } catch {}
      };
      return btn;
    };

    const pb = r.playback;
    const now = pb?.track
      ? trackRow(pb.track, `${pb.playing ? '▶' : '⏸'} ${fmtTime(pb.playing ? pb.position + (serverNow() - pb.updatedAt) / 1000 : pb.position)}`,
          canControl() ? [smallBtn('skip', T.t('jam.skip'), () => T.jam.skip())] : null)
      : h('div', { class: 'tk-empty' }, T.t('jam.nothingPlaying'));

    const queue = r.queue.length
      ? r.queue.map((item, i) => {
          const actions = [];
          if (amHost) {
            actions.push(smallBtn('play', T.t('jam.playNow'), () => T.jam.playNow(item)));
            if (i > 0) actions.push(smallBtn('up', T.t('jam.moveUp'), () => T.jam.move(item.id, i - 1)));
            if (i < r.queue.length - 1) actions.push(smallBtn('down', T.t('jam.moveDown'), () => T.jam.move(item.id, i + 1)));
          }
          if (amHost || item.addedBy === S.you) actions.push(smallBtn('remove', T.t('jam.remove'), () => T.jam.remove(item.id)));
          return trackRow(item.track, T.t('jam.addedBy', { name: people.get(item.addedBy)?.name || item.addedByName }), actions);
        })
      : h('div', { class: 'tk-empty' }, T.t(canAdd() ? 'jam.queueEmpty' : 'jam.queueEmptyNoAdd'));

    const participants = r.participants.map((p) =>
      h('div', { class: 'tk-row tk-jam-person', style: p.connected ? null : 'opacity:.5' },
        h('span', null, p.name, p.id === S.you ? ` (${T.t('jam.you')})` : ''),
        h('div', { class: 'tk-actions' },
          p.id === r.hostId ? h('span', { class: 'tk-chip' }, T.t('jam.host')) : null,
          !p.connected ? h('span', { class: 'tk-chip' }, T.t('jam.offline')) : null,
          amHost && p.id !== S.you ? smallBtn('remove', T.t('jam.kick'), () => T.jam.kick(p.id)) : null)));

    return [
      S.status === 'reconnecting' ? h('p', { class: 'tk-status error', style: 'margin:0 4px' }, T.t('jam.reconnecting')) : null,
      // A tak://jam link to another room: leaving this one shows the join form with that code.
      S.invite && S.invite !== r.code
        ? h('section', { class: 'tk-card' },
            h('div', { class: 'tk-row' },
              h('div', { class: 'tk-desc' }, T.t('jam.invitedElsewhere', { code: S.invite })),
              h('button', { class: 'tk-btn tk-btn-primary', type: 'button', onclick: () => T.jam.leave() }, T.t('jam.leave'))))
        : null,
      h('section', { class: 'tk-card' },
        h('div', { class: 'tk-row' },
          h('div', null, h('div', { class: 'tk-desc' }, T.t('jam.roomCode')), h('div', { class: 'tk-jam-code' }, r.code)),
          h('div', { class: 'tk-buttons' }, copyBtn(T.t('jam.copyCode'), r.code), copyBtn(T.t('jam.copyInvite'), T.jam.inviteLink(), true))),
        h('div', { class: 'tk-opts' },
          h('div', { class: 'tk-field' }, h('span', null, T.t('jam.hostIs', { name: hostName })),
            h('div', { class: 'tk-buttons' },
              h('button', { class: 'tk-btn', type: 'button', onclick: () => T.jam.leave() }, T.t('jam.leave')),
              amHost ? h('button', { class: 'tk-btn', type: 'button', onclick: () => T.jam.end() }, T.t('jam.end')) : null)),
          h('div', { class: 'tk-field' }, h('span', null, T.t('jam.permission')),
            amHost ? permSelect(r.permission, (v) => T.jam.setPermission(v)) : h('span', { class: 'tk-desc' }, T.t(`jam.perms.${r.permission}`))))),
      h('section', { class: 'tk-card' }, h('div', { class: 'tk-name', style: 'margin-bottom:8px' }, T.t('jam.nowPlaying')), now),
      h('section', { class: 'tk-card' },
        h('div', { class: 'tk-name', style: 'margin-bottom:8px' }, T.t('jam.queue'), h('span', { class: 'tk-count', style: 'margin-left:8px' }, String(r.queue.length))),
        h('div', { class: 'tk-list' }, queue)),
      h('section', { class: 'tk-card' },
        h('div', { class: 'tk-name', style: 'margin-bottom:8px' }, T.t('jam.people'), h('span', { class: 'tk-count', style: 'margin-left:8px' }, String(r.participants.length))),
        h('div', { class: 'tk-list' }, participants)),
    ];
  }

  T.css(`
    .tk-jam-code { font: 600 28px/1.2 ui-monospace, 'Cascadia Mono', Consolas, monospace; letter-spacing: 4px; color: var(--tk-text, #fff); }
    .tk-jam-track { display: flex; align-items: center; gap: 12px; min-width: 0; }
    .tk-jam-track img, .tk-jam-noart { width: 44px; height: 44px; border-radius: 4px; object-fit: cover; flex: none; background: var(--tk-surface, #171717); }
    .tk-jam-meta { flex: 1; min-width: 0; }
    .tk-jam-title { font-size: 14px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .tk-jam-meta .tk-desc { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .tk-jam-person { min-height: 32px; }
    .tk-jam-view { display: grid; gap: 8px; align-content: start; }
  `);

  /** Settings → Jam: re-renders itself while it's on screen (the form is never rebuilt while a field
   *  in it has focus, so nothing typed is lost). */
  T.jamTab = () => {
    const view = h('div', { class: 'tk-jam-view' });
    let mode = '';
    let pending = false;
    let stop = () => {};
    const render = () => {
      if (mode && !view.isConnected) return stop();
      const next = inRoom() || S.status === 'reconnecting' ? 'room' : 'idle';
      if (next === 'idle' && mode === 'idle' && view.contains(document.activeElement) && document.activeElement.matches('input')) {
        pending = true;
        return;
      }
      pending = false;
      mode = next;
      view.replaceChildren(...[next === 'room' && S.room ? roomView() : idleView()].flat().filter(Boolean));
    };
    stop = T.jam.onChange(render);
    view.addEventListener('focusout', () => pending && setTimeout(render, 0));
    // The song position ticks while the tab is open.
    const timer = setInterval(() => {
      if (!view.isConnected) {
        clearInterval(timer);
        return stop();
      }
      if (mode === 'room' && S.room?.playback?.playing) render();
    }, 1000);
    render();
    return view;
  };

  // ── Wiring ─────────────────────────────────────────────
  // Starts once YouTube Music's player exists (core.js sets T.api).
  const start = async () => {
    while (!T.api) await new Promise((r) => setTimeout(r, 200));
    const playerApi = T.api;
    api = playerApi;
    T.css(`
      .tk-jam-toast { position: fixed; left: 50%; bottom: 96px; transform: translate(-50%, 12px); z-index: 100000; opacity: 0;
        max-width: min(480px, calc(100vw - 32px)); padding: 10px 16px; border-radius: 8px; background: #262626; color: #fafafa;
        border: 1px solid #464646; font: 500 13px Inter, 'Segoe UI', Roboto, sans-serif; pointer-events: none;
        transition: opacity .2s, transform .2s; box-shadow: rgba(0,0,0,.5) 0 8px 24px; }
      .tk-jam-toast.show { opacity: 1; transform: translate(-50%, 0); }
      .takaro-jam-add { display: flex; align-items: center; gap: 16px; min-height: 36px; padding: 0 16px; box-sizing: border-box;
        width: 100%; color: var(--ytmusic-text-primary, #fff); font: 14px Roboto, sans-serif; cursor: pointer; }
      .takaro-jam-add:hover { background: rgba(255,255,255,.1); }
      .takaro-jam-add svg { flex: none; opacity: .9; }
      /* Guests without "control": no playback buttons, no seeking. Volume stays theirs. */
      html.tk-jam-locked ytmusic-player-bar :is(.previous-button, .rewind-button, #play-pause-button, .fast-forward-button, .next-button) { display: none !important; }
      html.tk-jam-locked ytmusic-player-bar #progress-bar { pointer-events: none !important; }
      #takaro-titlebar .tb-icon.tk-jam-btn[hidden] { display: none; }
      #takaro-titlebar .tb-icon.tk-jam-btn { position: relative; }
      #takaro-titlebar .tb-icon.tk-jam-live::after { content: ''; position: absolute; top: 6px; right: 8px; width: 7px; height: 7px;
        border-radius: 50%; background: linear-gradient(135deg, #ff3040, #781ec8); }
    `);

    setInterval(tick, 500);
    for (const type of ['play', 'pause', 'seeked']) {
      document.addEventListener(type, (e) => {
        if (e.target?.matches?.('#movie_player video')) guest.local(type);
        if (inRoom() && isHost()) setTimeout(tick, 50);
      }, true);
    }
    document.addEventListener('takaro:dataloaded', () => setTimeout(tick, 300));
    window.addEventListener('click', onBarClick, true);

    let menuQueued = false;
    new MutationObserver(() => {
      if (menuQueued) return;
      menuQueued = true;
      requestAnimationFrame(() => {
        menuQueued = false;
        syncMenu();
      });
    }).observe(T.$('ytmusic-app') || document.body, { childList: true, subtree: true });

    T.waitFor('#takaro-titlebar .tb-settings').then((group) => {
      const label = T.t('jam.title');
      barBtn = T.h('button', { class: 'tb-icon tk-jam-btn', type: 'button', title: label, 'aria-label': label, hidden: true,
        onclick: () => T.openSettings?.('jam') }, T.icon(ICON_JAM, 20));
      group.prepend(barBtn);
      syncChrome();
    });

    // Back in the room after a reload (same session), and a tak://jam link that started the app.
    if (loadSession()?.code) rejoin();
    T.jamInvite();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();

  // Leaving the page (reload): the socket closes; the session stays, so the next page rejoins.
  window.addEventListener('pagehide', () => {
    intentional = true;
    try {
      ws?.close(1000);
    } catch {}
  });
})();
