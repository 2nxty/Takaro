// Injected into the Chrome Web Store / Edge Add-ons window.
// Shows an "Install in Takaro" box on extension pages (the store's own button only works in Chrome/Edge).
(() => {
  if (window.top !== window) return;
  const store = { 'chromewebstore.google.com': 'chrome', 'microsoftedge.microsoft.com': 'edge' }[location.hostname];
  if (!store || window.__takaroStore) return;
  window.__takaroStore = true;

  const locales = window.__TAKARO_LOCALES__ || {};
  const lang = locales[window.__TAKARO_LANG__] ? window.__TAKARO_LANG__ : 'en';
  const lookup = (d, k) => k.split('.').reduce((o, x) => (o == null ? undefined : o[x]), d);
  const t = (key, vars = {}) =>
    String(lookup(locales[lang], key) ?? lookup(locales.en, key) ?? key).replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m);
  const invoke = (cmd, args) => window.__TAURI_INTERNALS__.invoke(cmd, args);

  // No innerHTML: the stores may enforce Trusted Types.
  const h = (tag, props = {}, ...kids) => {
    const svg = tag.startsWith('svg:');
    const el = svg ? document.createElementNS('http://www.w3.org/2000/svg', tag.slice(4)) : document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === 'style') Object.assign(el.style, v);
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v);
    }
    el.append(...kids.filter((x) => x != null));
    return el;
  };

  const extensionId = () => location.pathname.match(/\/detail\/(?:[^/]+\/)?([a-p]{32})(?:[/?#]|$)/)?.[1] ?? null;

  const logo = () =>
    h('svg:svg', { viewBox: '0 0 1024 1024', width: '28', height: '28', style: { flex: 'none' } },
      h('svg:defs', {}, h('svg:linearGradient', { id: 'takaro-g', x1: '0', y1: '0', x2: '1', y2: '1' },
        h('svg:stop', { offset: '0', 'stop-color': '#ff3040' }), h('svg:stop', { offset: '1', 'stop-color': '#781ec8' }))),
      h('svg:circle', { cx: '512', cy: '512', r: '480', fill: 'url(#takaro-g)' }),
      h('svg:path', { d: 'M400 300v424l360-212z', fill: '#fff' }));

  const box = h('div', { role: 'status', style: {
    position: 'fixed', right: '24px', bottom: '24px', zIndex: '2147483647', display: 'none', alignItems: 'center', gap: '12px',
    maxWidth: '420px', padding: '12px 12px 12px 14px', background: '#0a0a0a', color: '#fafafa', border: '1px solid #262626',
    borderRadius: '10px', boxShadow: 'rgba(0,0,0,.35) 0 8px 24px', font: '500 14px/1.4 Inter, "Segoe UI", system-ui, sans-serif',
  } });
  const text = h('span', { style: { flex: '1', minWidth: '0' } });
  const button = h('button', { type: 'button', style: {
    flex: 'none', padding: '8px 14px', border: '1px solid rgba(255,255,255,.1)', borderRadius: '8px', background: '#e5e5e5',
    color: '#171717', font: 'inherit', cursor: 'pointer',
  } });
  box.append(logo(), text, button);

  let currentId = null;
  let onClick = null;
  button.addEventListener('click', () => onClick && onClick());

  const show = (message, label, action, busy = false) => {
    text.textContent = message;
    button.textContent = label;
    button.style.display = label ? '' : 'none';
    button.disabled = busy;
    button.style.opacity = busy ? '.6' : '1';
    onClick = action;
    box.style.display = 'flex';
  };

  // Already installed → offer an update (reinstalls the latest version from the store).
  let updating = false;
  const idle = async () => {
    const id = currentId;
    let installed = false;
    try {
      installed = await invoke('extension_installed', { id });
    } catch {}
    if (id !== currentId) return;
    updating = installed;
    if (installed) show(t('extensions.alreadyInstalled'), t('extensions.update'), install);
    else show('Takaro', t('extensions.install'), install);
  };

  async function install() {
    const id = currentId;
    const busy = updating ? t('extensions.updating') : t('extensions.installing');
    show(busy, busy, null, true);
    try {
      const info = await invoke('install_extension', { store, id });
      if (id !== currentId) return;
      show(t(updating ? 'extensions.updated' : 'extensions.installed', { name: info.name }), t('extensions.reloadTakaro'), () => invoke('reload_main'));
    } catch (e) {
      if (id !== currentId) return;
      show(t('extensions.error', { error: String(e) }), t('extensions.retry'), install);
    }
  }

  const sync = () => {
    const id = extensionId();
    if (id === currentId) return;
    currentId = id;
    if (id) idle();
    else box.style.display = 'none';
  };

  // The stores' own "Add to Chrome" / "Get" buttons don't work here: hide them.
  // Matched by code identifiers (same in every language), not by their text.
  const style = h('style', {},
    'button[jsname="wQO0od"], button[id^="installButton-"] { display: none !important; }');

  // Back / forward (the store window has no browser toolbar).
  const navBtn = (label, d, action) =>
    h('button', { type: 'button', title: label, 'aria-label': label, onclick: action, style: {
      width: '36px', height: '36px', border: '0', borderRadius: '50%', background: 'transparent', color: '#fafafa',
      display: 'grid', placeItems: 'center', cursor: 'pointer', padding: '0',
    } }, h('svg:svg', { viewBox: '0 0 24 24', width: '22', height: '22', fill: 'currentColor' }, h('svg:path', { d })));
  const nav = h('div', { style: {
    position: 'fixed', left: '24px', bottom: '24px', zIndex: '2147483647', display: 'flex', gap: '2px', padding: '4px',
    background: '#0a0a0a', border: '1px solid #262626', borderRadius: '9999px', boxShadow: 'rgba(0,0,0,.35) 0 8px 24px',
  } },
    navBtn(t('titlebar.back'), 'M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z', () => history.back()),
    navBtn(t('titlebar.forward'), 'M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z', () => history.forward()));

  const mount = () => {
    document.head.append(style);
    document.body.append(nav, box);
    sync();
    setInterval(sync, 1000); // the stores are single-page apps
  };
  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount, { once: true });
})();
