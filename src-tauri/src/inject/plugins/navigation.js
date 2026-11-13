// Navigation — portado de pear-desktop/src/plugins/navigation (MIT).
(() => {
  const T = window.Takaro;
  if (!T) return;

  const LEFT = 'M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z';
  const RIGHT = 'M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z';

  T.register({
    id: 'navigation',
    defaults: { enabled: true },

    async start() {
      T.css(`
        .takaro-nav { display: flex; gap: 4px; margin-right: 8px; }
        .takaro-nav button { width: 40px; height: 40px; border: 0; border-radius: 50%; background: transparent;
          color: var(--ytmusic-text-primary, #fff); cursor: pointer; display: grid; place-items: center; }
        .takaro-nav button:hover { background: rgba(255,255,255,.1); }
      `);
      const nav = T.h('div', { class: 'takaro-nav' },
        T.h('button', { title: T.t('plugins.navigation.back'), 'aria-label': T.t('plugins.navigation.back'), onclick: () => history.back() }, T.icon(LEFT, 28)),
        T.h('button', { title: T.t('plugins.navigation.forward'), 'aria-label': T.t('plugins.navigation.forward'), onclick: () => history.forward() }, T.icon(RIGHT, 28)));
      (await T.waitFor('#right-content')).prepend(nav);
    },
  });
})();
