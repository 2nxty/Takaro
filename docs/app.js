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
    try { localStorage.setItem(STORE_KEY, code); } catch {}
  }

  function init() {
    if (!languages().length) return; // keeps the built-in English text
    select.replaceChildren(...languages().map((l) => new Option(l.name, l.code)));
    select.addEventListener('change', () => setLanguage(select.value));
    setLanguage(pickLanguage());
  }

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
