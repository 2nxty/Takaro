// Skip Disliked Songs — portado de pear-desktop/src/plugins/skip-disliked-songs (MIT).
(() => {
  const T = window.Takaro;
  if (!T) return;

  T.register({
    id: 'skip-disliked-songs',
    defaults: { enabled: true },

    async start() {
      const btn = await T.waitFor('#like-button-renderer');
      new MutationObserver(() => {
        if (btn.getAttribute('like-status') === 'DISLIKE') {
          T.$('yt-icon-button.next-button, .next-button')?.click();
        }
      }).observe(btn, { attributes: true, attributeFilter: ['like-status'] });
    },
  });
})();
