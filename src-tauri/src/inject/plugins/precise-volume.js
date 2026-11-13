// Precise Volume — portado de pear-desktop/src/plugins/precise-volume (MIT).
// Volume pela roda do mouse e setas, passos configuráveis, HUD e volume salvo entre sessões.
(() => {
  const T = window.Takaro;
  if (!T) return;

  T.register({
    id: 'precise-volume',
    defaults: { enabled: true, steps: 1, arrowsShortcut: true, savedVolume: null },
    options: [
      { key: 'steps', type: 'number', min: 1, max: 20 },
      { key: 'arrowsShortcut', type: 'checkbox' },
    ],

    // Antes do YTM registrar os listeners: impede que o slider nativo trate roda/teclas.
    early() {
      const ignoredIds = ['volume-slider', 'expand-volume-slider'];
      const ignoredTypes = ['mousewheel', 'keydown', 'keyup'];
      const native = Element.prototype.addEventListener;
      Element.prototype.addEventListener = function (type, listener, opts) {
        if (ignoredIds.includes(this.id) && ignoredTypes.includes(type)) return;
        return native.call(this, type, listener, opts);
      };
      window.addEventListener('load', () => (Element.prototype.addEventListener = native), { once: true });
    },

    onPlayer(api, cfg) {
      T.css(`
        #takaroVolumeHud { position: fixed; z-index: 10000; pointer-events: none; transform: translate(-50%, -100%);
          padding: 4px 8px; border-radius: 4px; background: #212121; color: #fff; box-shadow: 0 2px 8px rgba(0,0,0,.4);
          font: 500 12px/1.2 Roboto, sans-serif; font-variant-numeric: tabular-nums; white-space: nowrap;
          opacity: 0; transition: opacity .2s; }
      `);

      const writeOptions = T.debounce(() => T.save('precise-volume', { savedVolume: cfg.savedVolume }), 1000);
      const hideHud = T.debounce((el) => (el.style.opacity = '0'), 1500);
      const hideSlider = T.debounce((s) => s.classList.remove('on-hover'), 2500);

      const saveVolume = (v) => {
        cfg.savedVolume = v;
        writeOptions();
      };

      const tooltipTargets = ['#volume-slider', 'tp-yt-paper-icon-button.volume', '#expand-volume-slider', '#expand-volume'];
      const setTooltip = (v) => {
        for (const sel of tooltipTargets) {
          const el = T.$(sel);
          if (el) el.title = `${v}%`;
        }
      };

      const updateSlider = () => {
        const v = cfg.savedVolume ?? 0;
        for (const sel of ['#volume-slider', '#expand-volume-slider']) {
          const el = T.$(sel);
          if (el) el.value = String(v > 0 && v < 5 ? 5 : v);
        }
      };

      const showSlider = () => {
        const s = T.$('#volume-slider');
        if (!s) return;
        s.classList.add('on-hover');
        hideSlider(s);
      };

      // HUD flutuante logo acima do controle de volume visível da barra do player.
      const hud = T.h('span', { id: 'takaroVolumeHud' });
      document.body.append(hud);
      const anchor = () => {
        for (const sel of ['ytmusic-player-bar #volume-slider', 'ytmusic-player-bar .right-controls-buttons > .volume', 'ytmusic-player-bar .right-controls']) {
          const el = T.$(sel);
          const r = el?.getBoundingClientRect();
          if (r && r.width > 0 && r.height > 0) return r;
        }
        return null;
      };
      const showHud = (v) => {
        const r = anchor();
        if (!r) return;
        hud.textContent = `${v}%`;
        hud.style.left = `${r.left + r.width / 2}px`;
        hud.style.top = `${r.top - 6}px`;
        hud.style.opacity = '1';
        hideHud(hud);
      };

      const setVolume = (v) => {
        api.setVolume(v);
        saveVolume(v);
        updateSlider();
        setTooltip(v);
        showSlider();
        showHud(v);
      };

      const changeVolume = (up) => {
        const step = Number(cfg.steps) || 1;
        setVolume(up ? Math.min(api.getVolume() + step, 100) : Math.max(api.getVolume() - step, 0));
      };
      T.changeVolume = changeVolume;

      const onWheel = (e) => {
        e.preventDefault();
        changeVolume(e.deltaY < 0);
      };

      // Volume salvo
      if (typeof cfg.savedVolume === 'number') {
        setTooltip(cfg.savedVolume);
        if (api.getVolume() !== cfg.savedVolume) {
          api.setVolume(cfg.savedVolume);
          updateSlider();
        }
      }

      // Barra do player
      const bar = T.$('ytmusic-player-bar');
      if (bar) {
        bar.addEventListener('wheel', onWheel, { passive: false });
        bar.addEventListener('mouseenter', () => bar.classList.add('on-hover'));
        bar.addEventListener('mouseleave', () => bar.classList.remove('on-hover'));
      }

      // Slider alterado manualmente → salva
      const slider = T.$('#volume-slider');
      if (slider) {
        new MutationObserver((muts) => {
          for (const m of muts) {
            const val = Number(m.target.value);
            if (m.oldValue !== m.target.value && (typeof cfg.savedVolume !== 'number' || Math.abs(cfg.savedVolume - val) > 4)) {
              setTooltip(val);
              saveVolume(val);
            }
          }
        }).observe(slider, { attributeFilter: ['value'], attributeOldValue: true });
      }

      // Roda do mouse também sobre o vídeo/capa
      T.$('#main-panel')?.addEventListener('wheel', onWheel, { passive: false });

      // Setas
      if (cfg.arrowsShortcut) {
        window.addEventListener('keydown', (e) => {
          if (e.code !== 'ArrowUp' && e.code !== 'ArrowDown') return;
          if (T.$('ytmusic-search-box')?.opened) return;
          const t = e.target;
          if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) && t.type !== 'checkbox') return;
          e.preventDefault();
          changeVolume(e.code === 'ArrowUp');
        });
      }
    },
  });
})();
