// Quality Changer — portado de pear-desktop/src/plugins/quality-changer (MIT).
// O diálogo nativo do Electron virou um modal dentro da página.
(() => {
  const T = window.Takaro;
  if (!T) return;

  const GEAR =
    'M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.1-1.65c.2-.15.25-.42.13-.64l-2-3.46c-.12-.22-.4-.3-.6-.22l-2.5 1c-.52-.4-1.08-.73-1.7-.98l-.37-2.65c-.06-.24-.27-.42-.5-.42h-4c-.27 0-.48.18-.5.42l-.4 2.65c-.6.25-1.17.6-1.7.98l-2.48-1c-.23-.1-.5 0-.6.22l-2 3.46c-.14.22-.08.5.1.64l2.12 1.65c-.04.32-.07.65-.07.98s.02.66.06.98l-2.1 1.65c-.2.15-.25.42-.13.64l2 3.46c.12.22.4.3.6.22l2.5-1c.52.4 1.08.73 1.7.98l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.6-.25 1.17-.6 1.7-.98l2.48 1c.23.1.5 0 .6-.22l2-3.46c.13-.22.08-.5-.1-.64l-2.12-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z';

  T.register({
    id: 'quality-changer',
    defaults: { enabled: true },

    onPlayer(api) {
      T.css(`
        .takaro-quality-btn { width: 40px; height: 40px; padding: 8px; box-sizing: border-box; border: 0; border-radius: 50%;
          background: transparent; color: #fff; cursor: pointer; }
        .takaro-quality-btn:hover { background: rgba(255,255,255,.1); }
      `);

      const choose = async (e) => {
        e.stopPropagation();
        const levels = api.getAvailableQualityLevels();
        const labels = api.getAvailableQualityLabels();
        if (!levels.length) return;
        const current = levels.indexOf(api.getPlaybackQuality());
        const idx = await T.choose({
          title: T.t('plugins.quality-changer.button'),
          message: T.t('plugins.quality-changer.current', { quality: labels[current] ?? '—' }),
          choices: labels,
          current,
        });
        if (idx == null || idx < 0) return;
        api.setPlaybackQualityRange(levels[idx]);
        api.setPlaybackQuality(levels[idx]);
      };

      const btn = T.h('button', { class: 'takaro-quality-btn', title: T.t('plugins.quality-changer.button'), 'aria-label': T.t('plugins.quality-changer.button'), onclick: choose }, T.icon(GEAR));
      T.waitFor('.top-row-buttons.ytmusic-player').then((row) => row.prepend(btn));
    },
  });
})();
