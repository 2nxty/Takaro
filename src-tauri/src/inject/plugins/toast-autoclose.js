// Toast auto-close — YouTube Music's "Saved to liked music" (and similar) toasts stay open until
// dismissed; close them after a few seconds. Port of ytmdesktop2's toast-autoclose (CC0).
(() => {
  const T = window.Takaro;
  if (!T) return;

  T.register({
    id: 'toast-autoclose',
    defaults: { enabled: true, seconds: 3 },
    options: [{ key: 'seconds', type: 'number', min: 1, max: 15, live: true }],

    onPlayer(api, cfg) {
      const armed = new WeakSet();
      const arm = (toast) => {
        if (armed.has(toast)) return;
        armed.add(toast);
        setTimeout(() => {
          armed.delete(toast);
          if (!toast.classList.contains('paper-toast-open')) return;
          const btn = toast.querySelector('#close-button button');
          if (btn) btn.click();
          else toast.close?.();
        }, (Number(cfg.seconds) || 3) * 1000);
      };
      const root = T.$('ytmusic-app') || document.body;
      let queued = false;
      const scan = () => {
        queued = false;
        root.querySelectorAll('tp-yt-paper-toast.paper-toast-open').forEach(arm);
      };
      new MutationObserver(() => {
        if (queued) return;
        queued = true;
        setTimeout(scan, 100); // batched: YTM mutates the DOM a lot
      }).observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
      scan();
    },
  });
})();
