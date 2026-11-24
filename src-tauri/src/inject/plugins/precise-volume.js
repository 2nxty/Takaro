// Precise Volume — portado de pear-desktop/src/plugins/precise-volume (MIT).
// Volume pela roda do mouse e setas, passos configuráveis, HUD e volume salvo entre sessões.
(() => {
  const T = window.Takaro;
  if (!T) return;

  T.register({
    id: 'precise-volume',
    defaults: { enabled: true, steps: 1, arrowsShortcut: true, savedVolume: null },
    options: [
      { key: 'steps', type: 'number', min: 1, max: 20, live: true },
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
          if (el) el.value = String(v); // exact, so the slider and the wheel always agree
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

      T.setVolume = setVolume; // the control API sets the volume through here (it's remembered)

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

      // Mute / unmute: YTM brings back its own remembered volume (which never saw the wheel /
      // arrow changes), so it came back louder. Restore ours instead (once, right after YTM).
      let wasMuted = !!api.isMuted?.();
      (T.$('#movie_player video') || T.$('video'))?.addEventListener('volumechange', () => {
        const muted = !!api.isMuted?.();
        if (muted === wasMuted) return;
        wasMuted = muted;
        const v = cfg.savedVolume;
        if (muted || typeof v !== 'number' || v <= 0) return;
        setTimeout(() => {
          if (api.isMuted?.()) return;
          if (api.getVolume() !== v) api.setVolume(v);
          updateSlider();
          setTooltip(v);
        }, 50);
      });

      // Slider alterado manualmente → salva
      const slider = T.$('#volume-slider');
      if (slider) {
        // Clicking / dragging the slider shows the % too (the wheel and arrows already do).
        // YTM maps the slider through its own curve while it's dragged (66 on the slider → 35 volume),
        // so the wheel then started from another number. Takaro lets YTM handle the drag untouched
        // (changing the volume mid-drag makes YTM move the knob back: it jumped around) and, once the
        // mouse is released, sets the volume to exactly what the slider shows.
        let dragging = false;
        let last = null;
        const sliderValue = () => {
          const v = Math.round(Number(slider.immediateValue ?? slider.value));
          return Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : null;
        };
        // While dragging, the sound follows the knob. YTM sets its own (curved) volume on every move;
        // setting ours right after made the level flip back and forth (crackling), and api.setVolume
        // makes YTM move the knob back. So for the drag, the media element ignores everyone else's
        // volume changes and takes only the knob's.
        const VOLUME = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'volume');
        let locked = null;
        let holding = false; // after release, until the final value is applied (no dip on release)
        const lock = () => {
          const media = T.$('#movie_player video') || T.$('video');
          if (!media || !VOLUME) return;
          locked = media;
          Object.defineProperty(media, 'volume', {
            configurable: true,
            get() { return VOLUME.get.call(this); },
            set(v) { if (!dragging && !holding) VOLUME.set.call(this, v); },
          });
        };
        const unlock = () => {
          if (locked) delete locked.volume; // back to the normal property
          locked = null;
        };
        slider.addEventListener('pointerdown', () => {
          dragging = true;
          last = null;
          lock();
        });
        slider.addEventListener('immediate-value-change', () => {
          if (!dragging) return;
          last = sliderValue();
          if (last === null) return;
          showHud(last);
          setTooltip(last);
          if (locked && !api.isMuted?.()) VOLUME.set.call(locked, last / 100);
        });
        addEventListener('pointerup', () => {
          if (!dragging) return;
          dragging = false;
          holding = true;
          // A plain click only updates the value after pointerup.
          setTimeout(() => {
            const v = last ?? sliderValue();
            if (locked && v !== null && !api.isMuted?.()) VOLUME.set.call(locked, v / 100);
            if (v !== null && !api.isMuted?.() && api.getVolume() !== v) api.setVolume(v);
            holding = false;
            unlock();
            if (v === null || api.isMuted?.()) return;
            showHud(v);
            setTooltip(v);
            saveVolume(v);
            // Once now and again shortly after (YTM applies its own value a moment later); finite.
            for (const ms of [0, 200, 700]) {
              setTimeout(() => {
                if (api.isMuted?.() || cfg.savedVolume !== v) return; // the user moved on
                if (api.getVolume() !== v) api.setVolume(v);
                if (Number(slider.value) !== v) updateSlider();
              }, ms);
            }
          }, 30);
        }, true);
        // Released outside the window, or the drag got cancelled: never leave the volume locked.
        // (blur: only the window's own — focus moving between elements also fires blur, captured here.)
        for (const type of ['pointercancel', 'blur']) {
          addEventListener(type, (e) => {
            if (!dragging || (type === 'blur' && e.target !== window)) return;
            dragging = false;
            holding = false;
            unlock();
          }, true);
        }
      }


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
