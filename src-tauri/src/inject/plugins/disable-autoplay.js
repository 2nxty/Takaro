// Disable Autoplay — portado de pear-desktop/src/plugins/disable-autoplay (MIT).
(() => {
  const T = window.Takaro;
  if (!T) return;

  T.register({
    id: 'disable-autoplay',
    defaults: { enabled: true, applyOnce: true },
    options: [{ key: 'applyOnce', type: 'checkbox' }],

    onPlayer(api, cfg) {
      const onTimeUpdate = (e) => e.target.pause();
      const listener = (e) => {
        if (e.detail.name !== 'dataloaded') return;
        if (cfg.applyOnce) document.removeEventListener('takaro:videodatachange', listener);
        api.pauseVideo();
        T.$('video')?.addEventListener('timeupdate', onTimeUpdate, { once: true });
      };
      document.addEventListener('takaro:videodatachange', listener);
    },
  });
})();
