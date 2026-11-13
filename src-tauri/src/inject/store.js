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

  const idle = () => show('Takaro', t('extensions.install'), install);

  async function install() {
    const id = currentId;
    show(t('extensions.installing'), t('extensions.installing'), null, true);
    try {
      const info = await invoke('install_extension', { store, id });
      if (id !== currentId) return;
      show(t('extensions.installed', { name: info.name }), t('extensions.reloadTakaro'), () => invoke('reload_main'));
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

  const mount = () => {
    document.body.append(box);
    sync();
    setInterval(sync, 1000); // the stores are single-page apps
  };
  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount, { once: true });
})();
