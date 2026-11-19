// Shared links — "Copy Takaro link" in every song's ⋮ menu (rows, search results, queue, player).
// The copied tak:// link opens the track straight in Takaro (the app registers the tak:// protocol).
// Idea from ytmdesktop2 (CC0).
(() => {
  const T = window.Takaro;
  if (!T) return;

  const LINK_ICON =
    'M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z';

  T.register({
    id: 'share-links',
    core: true, // built in, not a plugin you can turn off
    defaults: { enabled: true },

    onPlayer() {
      T.css(`
        .takaro-share { display: flex; align-items: center; gap: 16px; min-height: 36px; padding: 0 16px; box-sizing: border-box;
          width: 100%; color: var(--ytmusic-text-primary, #fff); font: 14px Roboto, sans-serif; cursor: pointer; }
        .takaro-share:hover { background: rgba(255,255,255,.1); }
        .takaro-share svg { flex: none; opacity: .9; }
      `);
      // In every song's ⋮ menu (rows, search results, queue, player): the link of that song.
      T.onTrackMenu('takaro-share', (track) => {
        const label = T.h('span', null, T.t('plugins.share-links.copy'));
        const row = T.h('div', { class: 'takaro-share', role: 'option' }, T.icon(LINK_ICON, 18), label);
        row.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = track.videoId;
          if (!id) return;
          try {
            await navigator.clipboard.writeText(`tak://watch/${id}`);
            label.textContent = T.t('plugins.share-links.copied');
          } catch (err) {
            console.warn('[takaro:share-links]', err);
          }
        });
        return row;
      }, 'after:takaro-speed'); // in the player's menu: right below the speed control
    },
  });
})();
