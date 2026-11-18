// Takaro landing: i18n + Rich Presence demo.
// Translations live in i18n/<code>.js (a JSON object passed to TakaroI18n.add).
// To add a language: copy i18n/en.js, translate it, and add a <script> line in index.html.
// Script files (instead of fetch + .json) also work when index.html is opened straight from disk.
window.TakaroI18n = {
  languages: [],
  add(code, name, dict) {
    this.languages.push({ code, name, dict });
  },
};

(() => {
  const FALLBACK = 'en';
  const STORE_KEY = 'takaro.lang';
  const select = document.getElementById('lang');
  const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

  const languages = () => window.TakaroI18n.languages;
  const dictFor = (code) => languages().find((l) => l.code === code)?.dict;

  function pickLanguage() {
    const codes = languages().map((l) => l.code);
    const fromUrl = new URLSearchParams(location.search).get('lang');
    let stored = null;
    try { stored = localStorage.getItem(STORE_KEY); } catch {}
    const wanted = [fromUrl, stored, ...(navigator.languages || [navigator.language])].filter(Boolean);
    for (const w of wanted) {
      const lw = w.toLowerCase();
      const hit = codes.find((c) => c.toLowerCase() === lw) || codes.find((c) => c.split('-')[0].toLowerCase() === lw.split('-')[0]);
      if (hit) return hit;
    }
    return FALLBACK;
  }

  function setLanguage(code) {
    const dict = dictFor(code) || dictFor(FALLBACK) || {};
    const fallback = dictFor(FALLBACK) || {};
    const t = (key) => get(dict, key) ?? get(fallback, key);
    document.documentElement.lang = code;
    for (const el of document.querySelectorAll('[data-i18n]')) {
      const v = t(el.dataset.i18n);
      if (typeof v === 'string') el.textContent = v;
    }
    for (const el of document.querySelectorAll('[data-i18n-attr]')) {
      for (const pair of el.dataset.i18nAttr.split(';')) {
        const [attr, key] = pair.split(':').map((x) => x.trim());
        const v = t(key);
        if (attr && typeof v === 'string') el.setAttribute(attr, v);
      }
    }
    const title = t('meta.title');
    if (title) document.title = title;
    const desc = t('meta.description');
    if (desc) document.querySelector('meta[name="description"]')?.setAttribute('content', desc);
    select.value = code;
    renderDownloads(t);
    try { localStorage.setItem(STORE_KEY, code); } catch {}
  }

  function init() {
    if (!languages().length) return renderDownloads((k) => DEFAULT_TEXT[k]); // built-in English
    select.replaceChildren(...languages().map((l) => new Option(l.name, l.code)));
    select.addEventListener('change', () => setLanguage(select.value));
    setLanguage(pickLanguage());
  }

  // ── Downloads ──────────────────────────────────────
  // The main button downloads the build for the visitor's system; the arrow opens a menu with all
  // of them. Fixed file names, so releases/latest/download/<file> always points to the newest one.
  const DL_BASE = 'https://github.com/2nxty/Takaro/releases/latest/download/';
  const ICONS = {
    windows: 'M3 5.5 10.4 4.5v7H3v-6Zm0 13 7.4 1v-7H3v6Zm8.2 1.1L21 21v-8.5h-9.8v7.1Zm0-15.2v7.1H21V3l-9.8 1.4Z',
    mac: 'M16.37 12.6c-.02-2.2 1.8-3.26 1.88-3.31-1.03-1.5-2.62-1.7-3.18-1.73-1.35-.14-2.64.8-3.33.8-.69 0-1.74-.78-2.86-.76-1.47.02-2.83.86-3.59 2.17-1.53 2.65-.39 6.58 1.1 8.73.73 1.05 1.6 2.23 2.73 2.19 1.1-.04 1.51-.71 2.84-.71 1.32 0 1.7.71 2.86.69 1.18-.02 1.93-1.07 2.65-2.13.83-1.22 1.18-2.4 1.2-2.46-.03-.01-2.3-.88-2.3-3.48zM14.2 6.13c.6-.73 1.01-1.75.9-2.76-.87.04-1.92.58-2.55 1.31-.56.64-1.05 1.68-.92 2.67.97.08 1.96-.49 2.57-1.22z',
    linux: 'M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z',
  };
  const DOWNLOADS = [
    { os: 'windows', file: 'Takaro.exe', label: 'download.optWindows' },
    { os: 'windows', file: 'Takaro-Setup.exe', label: 'download.optWindowsSetup' },
    { os: 'mac', file: 'Takaro-macOS.dmg', label: 'download.optMac' },
    { os: 'linux', file: 'Takaro-Linux.AppImage', label: 'download.optAppImage' },
    { os: 'linux', file: 'Takaro-Linux.deb', label: 'download.optDeb' },
  ];
  const OS_NAMES = { windows: 'Windows', mac: 'macOS', linux: 'Linux' };
  const META = { windows: 'download.metaWindows', mac: 'download.metaMac', linux: 'download.metaLinux' };
  const NOTE = { windows: 'download.smartscreen', mac: 'download.noteMac', linux: 'download.noteLinux' };
  // Shown when the translations aren't loaded (built-in English).
  const DEFAULT_TEXT = {
    'hero.download': 'Download for {os}', 'download.button': 'Download for {os}',
    'download.optWindows': 'Windows · portable .exe', 'download.optWindowsSetup': 'Windows · installer (Setup)',
    'download.optMac': 'macOS · .dmg (Intel and Apple Silicon)',
    'download.optAppImage': 'Linux · AppImage', 'download.optDeb': 'Linux · .deb (Debian, Ubuntu)',
    'download.metaWindows': 'Windows 10 or 11 · x64 · requires Microsoft Edge WebView2 (already included in Windows)',
    'download.metaMac': 'macOS 11 or later · Intel and Apple Silicon',
    'download.metaLinux': '64-bit · the AppImage runs on most distributions; the .deb is for Debian and Ubuntu',
    'download.smartscreen': 'The .exe isn\'t code-signed yet, so Windows SmartScreen may warn you. Click "More info" → "Run anyway".',
    'download.noteMac': 'The app isn\'t signed by Apple yet, so macOS blocks it the first time: right-click Takaro → Open (or run xattr -cr /Applications/Takaro.app).',
    'download.noteLinux': 'AppImage: make it executable (chmod +x Takaro-Linux.AppImage) and run it. .deb: sudo apt install ./Takaro-Linux.deb',
  };

  const detectOS = () => {
    const p = (navigator.userAgentData?.platform || navigator.platform || '').toLowerCase();
    const ua = navigator.userAgent.toLowerCase();
    if (/mac|iphone|ipad/.test(p) || /mac os x|iphone|ipad/.test(ua)) return 'mac';
    if ((/linux|x11/.test(p) || /linux|x11/.test(ua)) && !/android/.test(ua)) return 'linux';
    return 'windows'; // Windows, and the default for phones and anything unknown
  };
  const chosen = DOWNLOADS.find((d) => d.os === detectOS()) || DOWNLOADS[0];
  const icon = (os) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="${ICONS[os]}"/></svg>`;

  function renderDownloads(t) {
    for (const box of document.querySelectorAll('[data-dl]')) {
      const main = box.querySelector('.dl-main');
      main.href = DL_BASE + chosen.file;
      box.querySelector('.dl-icon').innerHTML = icon(chosen.os);
      box.querySelector('.dl-label').textContent = (t(box.dataset.dlLabel) || 'Download for {os}').replace('{os}', OS_NAMES[chosen.os]);
      const menu = box.querySelector('.dl-menu');
      menu.replaceChildren(...DOWNLOADS.map((d) => {
        const a = document.createElement('a');
        a.href = DL_BASE + d.file;
        a.setAttribute('role', 'menuitem');
        if (d === chosen) a.setAttribute('aria-current', 'true');
        a.innerHTML = icon(d.os);
        a.append(t(d.label) || d.file);
        return a;
      }));
    }
    const meta = document.querySelector('[data-dl-meta]');
    if (meta) meta.textContent = t(META[chosen.os]) || '';
    const note = document.querySelector('[data-dl-note]');
    if (note) note.textContent = t(NOTE[chosen.os]) || '';
  }

  // Menu open/close (arrow button, click outside, Esc).
  const closeMenus = (except) => {
    for (const box of document.querySelectorAll('[data-dl]')) {
      if (box === except) continue;
      box.querySelector('.dl-menu').hidden = true;
      box.querySelector('.dl-toggle').setAttribute('aria-expanded', 'false');
    }
  };
  for (const box of document.querySelectorAll('[data-dl]')) {
    const toggle = box.querySelector('.dl-toggle');
    const menu = box.querySelector('.dl-menu');
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = menu.hidden;
      closeMenus(box);
      menu.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      if (open) menu.querySelector('a')?.focus();
    });
  }
  document.addEventListener('click', (e) => !e.target.closest?.('.dl-menu') && closeMenus());
  document.addEventListener('keydown', (e) => e.key === 'Escape' && closeMenus());

  // ── Rich Presence demo ─────────────────────────────
  const card = document.getElementById('rp');
  const fill = document.getElementById('rp-fill');
  const elapsedEl = document.getElementById('rp-elapsed');
  const pausedTime = document.getElementById('rp-paused-time');
  const statusEl = document.querySelector('.member-status');
  const TOTAL = 221;
  let pos = 83;
  let paused = false;

  const clock = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const render = () => {
    fill.style.width = `${(pos / TOTAL) * 100}%`;
    elapsedEl.textContent = clock(pos);
    pausedTime.textContent = `${clock(pos)} / ${clock(TOTAL)}`;
  };
  setInterval(() => {
    if (paused) return;
    pos = pos >= TOTAL ? 0 : pos + 1;
    render();
  }, 1000);
  render();

  for (const tab of document.querySelectorAll('.tab')) {
    tab.addEventListener('click', () => {
      paused = tab.dataset.state === 'paused';
      card.classList.toggle('paused', paused);
      statusEl.style.opacity = paused ? '.7' : '1';
      for (const t of document.querySelectorAll('.tab')) t.setAttribute('aria-selected', String(t === tab));
    });
  }

  // Deferred language scripts run after this file, so wait for DOMContentLoaded (fires after all of them).
  if (document.readyState === 'complete') init();
  else document.addEventListener('DOMContentLoaded', init, { once: true });
})();
