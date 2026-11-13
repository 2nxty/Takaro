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
  T.css(`
    html, body { background: #030303; }
    /* Title bar of the frameless window. YTM sizes its layout from --ytmusic-nav-bar-height, so growing
       it by 40px pushes everything down; the bar sits in that space, over the page's own background. */
    html, ytmusic-app, ytmusic-app-layout { --ytmusic-nav-bar-height: 104px !important; }
    ytmusic-nav-bar { padding-top: 40px !important; box-sizing: border-box !important; }
    .center-content.ytmusic-nav-bar { height: 64px !important; }
    #takaro-titlebar { position: fixed; top: 0; left: 0; right: 0; height: 40px; z-index: 2001; display: flex;
      align-items: stretch; color: #fff; user-select: none; -webkit-user-select: none; }
    #takaro-titlebar .tb-left { display: flex; align-items: center; gap: 2px; padding-left: 10px; }
    #takaro-titlebar .tb-drag { flex: 1; }
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
    /* Page scrollbar: the native one spans the whole window (title bar included), so it's hidden
       and replaced by #takaro-scroll, which runs from below the title bar to above the player bar. */
    html { scrollbar-width: none; }
    html::-webkit-scrollbar { display: none; }
    #takaro-scroll { position: fixed; right: 0; top: 40px; width: 12px; z-index: 2001; }
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
    /* Player bar: volume / repeat / shuffle and the volume slider always visible (YTM hides
       them behind a "◀" menu on narrow windows), smaller when the window is narrow. */
    ytmusic-player-bar .right-controls-buttons > .volume,
    ytmusic-player-bar .right-controls-buttons > .repeat,
    ytmusic-player-bar .right-controls-buttons > .shuffle { display: block !important; }
    ytmusic-player-bar .right-controls-buttons > .expand-button,
    ytmusic-player-bar .right-controls > ytmusic-player-expanding-menu { display: none !important; }
    ytmusic-player-bar #volume-slider.volume-slider { display: flex !important; opacity: 1 !important; width: 88px !important; }
    @media (max-width: 1100px) {
      ytmusic-player-bar #volume-slider.volume-slider { width: 64px !important; }
      ytmusic-player-bar .right-controls-buttons > yt-icon-button,
      ytmusic-player-bar .right-controls > yt-icon-button { width: 32px !important; height: 32px !important; padding: 4px !important; }
    }
    ytmusic-nav-bar ytmusic-logo a::after {
      content: 'Takaro'; color: #fff; font: 600 20px/24px 'YouTube Sans', Roboto, sans-serif; letter-spacing: -.3px; white-space: nowrap; }
  `);

  // ── Icons (Material, 24px) ──
  const ICONS = {
    settings: 'M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z',
    back: 'M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z',
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
    .tk input[type=checkbox] { accent-color: #ff3040; width: 14px; height: 14px; margin: 0; }
    .tk select, .tk input[type=number] { background: var(--tk-surface); color: var(--tk-text); border: 1px solid var(--tk-edge);
      border-radius: 8px; padding: 6px 10px; font: inherit; font-size: 13px; outline: none; }
    .tk select:focus, .tk input[type=number]:focus { border-color: var(--tk-steel); }
    .tk input[type=number] { width: 72px; }
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
    .tk-status.error { color: var(--tk-link); }
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
        const now = h('button', { class: 'tk-btn tk-btn-primary', type: 'button', onclick: async () => {
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
        } }, T.t('update.now'));
        return [
          h('div', { class: 'tk-head tk-update' }, logo(22), h('h2', null, T.t('update.title')),
            h('span', { class: 'tk-spacer' }), iconBtn('close', T.t('ui.close'), close)),
          h('div', { class: 'tk-body' },
            h('p', { class: 'tk-lead', style: 'margin:0' }, T.t('update.body', { latest: info.latest, current: info.current })),
            info.notes ? h('div', { class: 'tk-update-notes' }, plainNotes(info.notes)) : null),
          h('div', { class: 'tk-foot', style: 'flex-wrap:wrap;justify-content:flex-end' }, status, skip, later, now),
        ];
      },
    });
  };

  // ── Settings panel ──
  let lastTab = 'plugins';
  let needsReload = false; // survives closing/reopening the panel until the page reloads

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
        const input = h('input', { type: 'checkbox', checked: !!cfg[opt.key], onchange: () => set(input.checked) });
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

  const pluginsTab = (changed) => {
    const cards = T.plugins.map((p) => {
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
                card.remove();
                if (!list.querySelector('.tk-card')) render([]);
                changed();
              } catch (e) {
                report(e);
              }
            }),
            switchEl(ext.enabled, ext.name, (on) => {
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

    return [
      h('section', { class: 'tk-card' }, h('div', { class: 'tk-row' }, h('div', { class: 'tk-name' }, T.t('ui.language')), langSelect)),
      h('section', { class: 'tk-card' }, h('div', { class: 'tk-row' }, h('div', { class: 'tk-name' }, T.t('ui.closeAction')), closeSelect)),
      h('section', { class: 'tk-card' },
        h('div', { class: 'tk-row' },
          h('div', null, h('div', { class: 'tk-name' }, T.t('update.title')), status),
          checkBtn)),
      h('section', { class: 'tk-card' },
        h('div', { class: 'tk-row' },
          h('div', { style: 'display:flex;align-items:center;gap:12px' }, logo(36),
            h('div', null, h('div', { class: 'tk-name' }, 'Takaro'), h('div', { class: 'tk-desc' }, T.t('ui.version', { version: T.version })))),
        ),
        h('p', { class: 'tk-desc', style: 'margin:12px 0' }, T.t('ui.tagline')),
        h('div', { class: 'tk-buttons', style: 'gap:16px' },
          link(T.t('ui.site'), 'https://takaro.nxty.cc'),
          link('GitHub', 'https://github.com/2nxty/Takaro'),
          link(T.t('ui.issues'), 'https://github.com/2nxty/Takaro/issues')),
        h('p', { class: 'tk-desc', style: 'margin:12px 0 0;color:var(--tk-ash)' }, T.t('ui.credits'))),
    ];
  };

  T.openSettings = () => {
    if (document.querySelector('.tk-overlay')) return;
    const enabledCount = () => T.plugins.filter((p) => p.config.enabled).length;

    dialog({
      label: T.t('ui.settingsButton'),
      content: (close) => {
        const body = h('div', { class: 'tk-body', role: 'tabpanel' });
        const foot = h('div', { class: 'tk-foot', hidden: !needsReload }, h('span', { class: 'tk-dot' }), h('p', null, T.t('ui.reloadNeeded')),
          h('button', { class: 'tk-btn tk-btn-primary', type: 'button', onclick: () => T.reload() }, T.t('ui.reloadNow')));
        const count = h('span', { class: 'tk-count' });
        const changed = () => {
          needsReload = true;
          foot.hidden = false;
          count.textContent = `${enabledCount()}/${T.plugins.length}`;
        };
        count.textContent = `${enabledCount()}/${T.plugins.length}`;

        const tabs = [
          ['plugins', T.t('ui.tabs.plugins'), pluginsTab, count],
          ['extensions', T.t('ui.tabs.extensions'), extensionsTab],
          ['general', T.t('ui.tabs.general'), generalTab],
        ];
        const tabButtons = tabs.map(([id, label, render, extra]) =>
          h('button', { class: 'tk-tab', type: 'button', role: 'tab', 'aria-selected': 'false', onclick: () => select(id) }, label, extra || null));
        const select = (id) => {
          lastTab = id;
          tabs.forEach(([tid], i) => tabButtons[i].setAttribute('aria-selected', String(tid === id)));
          body.replaceChildren(...[tabs.find(([tid]) => tid === id)[2](changed)].flat());
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
    const tray = ['play', 'pause', 'previous', 'next', 'show', 'settings', 'quit'];
    T.invoke('set_tray_labels', { labels: Object.fromEntries(tray.map((k) => [k, T.t(`tray.${k}`)])) }).catch(report);
    // ── Title bar (frameless window) ──
    const winIcon = (...shapes) =>
      h('svg:svg', { viewBox: '0 0 10 10' }, shapes.map(([tag, attrs]) => h(`svg:${tag}`, attrs)));
    const tbIcon = (key, icon, onclick, size = 24) =>
      h('button', { class: 'tb-icon', type: 'button', title: T.t(`titlebar.${key}`), 'aria-label': T.t(`titlebar.${key}`), onclick },
        T.icon(icon, size));
    const win = (action) => () => T.invoke('titlebar_action', { action }).catch(report);
    const maxBtn = h('button', { class: 'tb-win', type: 'button', onclick: win('toggle-maximize') },
      h('span', { class: 'tb-maximize' }, winIcon(['rect', { x: '.5', y: '.5', width: '9', height: '9' }])),
      h('span', { class: 'tb-restore' }, winIcon(['path', { d: 'M2.5 2.5V.5h7v7h-2' }], ['rect', { x: '.5', y: '2.5', width: '7', height: '7' }])));
    const titlebar = h('div', { id: 'takaro-titlebar' },
      h('div', { class: 'tb-left' },
        tbIcon('back', ICONS.back, () => history.back()),
        tbIcon('forward', ICONS.forward, () => history.forward()),
        tbIcon('settings', ICONS.settings, () => T.openSettings(), 20)),
      h('div', { class: 'tb-drag' }),
      h('button', { class: 'tb-win', type: 'button', title: T.t('titlebar.minimize'), 'aria-label': T.t('titlebar.minimize'), onclick: win('minimize') },
        winIcon(['path', { d: 'M0 5.5h10' }])),
      maxBtn,
      h('button', { class: 'tb-win tb-close', type: 'button', title: T.t('titlebar.close'), 'aria-label': T.t('titlebar.close') },
        winIcon(['path', { d: 'M0 0l10 10M10 0 0 10' }])));
    // X: quit, or hide to the tray (General → Close button).
    titlebar.lastChild.onclick = () => win(T.closeToTray() ? 'hide' : 'close')();
    // Empty areas drag the window; double-click maximizes/restores.
    titlebar.addEventListener('mousedown', (e) => {
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
      const BAR = 40;
      const thumb = h('div');
      const track = h('div', { id: 'takaro-scroll', hidden: true }, thumb);
      let geo = null;
      const measure = () => {
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
      T.waitFor('ytmusic-app-layout').then((layout) => new MutationObserver(schedule).observe(layout, { attributeFilter: ['player-visible'] }));
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

    // Look for a new release once per launch (not on every reload).
    try {
      if (sessionStorage.getItem('takaro:update-checked')) return;
      sessionStorage.setItem('takaro:update-checked', '1');
    } catch {}
    setTimeout(async () => {
      try {
        const info = await T.invoke('check_update');
        let skipped = null;
        try {
          skipped = localStorage.getItem(SKIP_KEY);
        } catch {}
        if (info && info.latest !== skipped) T.showUpdate(info);
      } catch (e) {
        report(e);
      }
    }, 8000);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
