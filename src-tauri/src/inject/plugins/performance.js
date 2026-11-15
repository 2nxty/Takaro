// Performance fixes — CPU Tamer by CY Fung (MIT), as used by ytmdesktop2: aligns the page's timers
// to animation frames so YouTube Music wakes the CPU less often. Loaded a moment after the player is
// ready, like there. (rm3, the DOM recycler ytmdesktop2 also ships, is left out on purpose: it
// reuses YouTube Music's components and can leave the cover, player bar and queue out of sync.)
(() => {
  const T = window.Takaro;
  if (!T) return;

  T.register({
    id: 'performance',
    defaults: { enabled: true },

    onPlayer() {
      setTimeout(() => {
        try {
          window.__takaroCpuTamer?.(null);
        } catch (e) {
          console.warn('[takaro:performance] cpu-tamer', e);
        }
      }, 250);
    },
  });
})();
