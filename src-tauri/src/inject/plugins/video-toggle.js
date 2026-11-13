// Video Toggle — portado de pear-desktop/src/plugins/video-toggle (MIT).
(() => {
  const T = window.Takaro;
  if (!T) return;

  const CSS = `
    .video-toggle-custom-mode #main-panel.ytmusic-player-page { align-items: unset !important; }
    .video-toggle-custom-mode #main-panel { position: relative; }
    .video-toggle-custom-mode .video-switch-button {
      z-index: 999; box-sizing: border-box; padding: 0 10rem 0 0; margin-top: 20px; margin-left: 10px;
      background: rgba(33,33,33,.4); border-radius: 30px; overflow: hidden; width: 20rem; text-align: center;
      font-size: 18px; letter-spacing: 1px; color: #fff; position: absolute; }
    .video-toggle-custom-mode .video-switch-button:before {
      content: attr(data-video-button-text); position: absolute; top: 0; bottom: 0; right: 0; width: 10rem;
      display: flex; align-items: center; justify-content: center; z-index: 3; pointer-events: none; }
    .video-toggle-custom-mode .video-switch-button-checkbox {
      cursor: pointer; position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; z-index: 2; margin: 0; }
    .video-toggle-custom-mode .video-switch-button-label-span { position: relative; }
    .video-toggle-custom-mode .video-switch-button-checkbox:checked + .video-switch-button-label:before {
      transform: translateX(10rem); transition: transform 300ms linear; }
    .video-toggle-custom-mode .video-switch-button-checkbox + .video-switch-button-label {
      position: relative; padding: 15px 0; display: block; user-select: none; pointer-events: none; }
    .video-toggle-custom-mode .video-switch-button-checkbox + .video-switch-button-label:before {
      content: ''; background: rgba(60,60,60,.4); height: 100%; width: 100%; position: absolute; left: 0; top: 0;
      border-radius: 30px; transform: translateX(0); transition: transform 300ms; }
    .video-toggle-custom-mode #av-id { display: none; }

    .video-toggle-hidden #main-panel { display: none !important; }
    .video-toggle-hidden .side-panel.ytmusic-player-page { max-width: 100% !important; width: 100% !important; margin: 0 !important; }

    .video-toggle-cover #song-video.ytmusic-player { display: none !important; }
    .video-toggle-cover #song-image.ytmusic-player { display: block !important; }
    .video-toggle-cover #av-id { display: none; }
  `;

  // One choice: what the player area shows.
  //   toggle — "Song | Video" switch on the player (remembers the last choice)
  //   cover  — always the cover art, never the music video
  //   hidden — no player at all, the queue takes the whole page
  const MODES = ['toggle', 'cover', 'hidden'];

  T.register({
    id: 'video-toggle',
    defaults: { enabled: true, display: 'toggle', hideVideo: false },
    options: [{ key: 'display', type: 'select', choices: MODES }],

    start(cfg) {
      // Settings from older versions (mode / align / forceHide) → display.
      if ('forceHide' in cfg || 'mode' in cfg || 'align' in cfg) {
        cfg.display = cfg.forceHide ? 'hidden' : 'toggle';
        T.save('video-toggle', { display: cfg.display, forceHide: undefined, mode: undefined, align: undefined });
      }
      if (!MODES.includes(cfg.display)) cfg.display = 'toggle';
      T.css(CSS);
      document.body.classList.add(cfg.display === 'toggle' ? 'video-toggle-custom-mode' : `video-toggle-${cfg.display}`);
    },

    onPlayer(api, cfg) {
      if (cfg.display === 'hidden') return;

      const player = T.$('ytmusic-player');
      const video = T.$('video');
      const coverOnly = cfg.display === 'cover';

      const forceThumbnail = (img) => {
        const thumbs = api?.getPlayerResponse?.()?.videoDetails?.thumbnail?.thumbnails ?? [];
        const url = thumbs.at(-1)?.url?.split('?')[0];
        if (url) img.src = url;
      };

      const setVideoState = (showVideo, remember = true) => {
        if (remember && !coverOnly) T.save('video-toggle', { hideVideo: !showVideo });
        if (checkbox) checkbox.checked = showVideo;
        if (!player) return;
        player.style.margin = showVideo ? '' : 'auto 0px';
        player.setAttribute('playback-mode', showVideo ? 'OMV_PREFERRED' : 'ATV_PREFERRED');
        const songVideo = T.$('#song-video.ytmusic-player');
        const songImage = T.$('#song-image');
        if (songVideo) songVideo.style.display = showVideo ? 'block' : 'none';
        if (songImage) songImage.style.display = showVideo ? 'none' : 'block';
        if (showVideo && video && !video.style.top) {
          video.style.top = `${(player.clientHeight - video.clientHeight) / 2}px`;
        }
      };

      // ── Switch button (toggle mode only) ──
      let checkbox = null;
      let button = null;
      if (!coverOnly) {
        checkbox = T.h('input', { type: 'checkbox', class: 'video-switch-button-checkbox', id: 'takaro-video-switch', checked: true });
        button = T.h('div', { class: 'video-switch-button', 'data-video-button-text': T.t('plugins.video-toggle.video') },
          checkbox,
          T.h('label', { class: 'video-switch-button-label', for: 'takaro-video-switch' },
            T.h('span', { class: 'video-switch-button-label-span' }, T.t('plugins.video-toggle.song'))));
        button.addEventListener('click', (e) => e.stopPropagation());
        checkbox.addEventListener('change', () => setVideoState(checkbox.checked));
      }
      const showButton = (show) => button && (button.style.display = show ? '' : 'none');

      const songStarted = () => {
        const img = T.$('#song-image #img.style-scope.yt-img-shadow');
        if (api.getPlayerResponse()?.videoDetails?.musicVideoType === 'MUSIC_VIDEO_TYPE_ATV') {
          // Track without a music video: always the cover, no switch.
          setVideoState(false, false);
          showButton(false);
          return;
        }
        if (img) forceThumbnail(img); // high-res cover instead of the video still
        if (coverOnly) return setVideoState(false, false);
        showButton(true);
        setVideoState(!cfg.hideVideo, false);
      };

      // YTM sets playback-mode back to "video" when a track loads; keep the cover when it should be.
      if (player) {
        new MutationObserver(() => {
          const wantCover = coverOnly || cfg.hideVideo;
          if (wantCover && player.getAttribute('playback-mode') !== 'ATV_PREFERRED') player.setAttribute('playback-mode', 'ATV_PREFERRED');
        }).observe(player, { attributeFilter: ['playback-mode'] });
      }

      const img = T.$('#song-image #img.style-scope.yt-img-shadow');
      if (img) {
        new MutationObserver(() => {
          if (img.src.startsWith('data:')) forceThumbnail(img);
        }).observe(img, { attributeFilter: ['src'] });
      }

      setTimeout(() => {
        if (button) {
          T.$('#player')?.prepend(T.h('div', { id: 'takaro-video-toggle', style: { display: 'flex' } }, button));
        }
        if (video) video.style.height = 'auto';
        document.addEventListener('takaro:dataloaded', songStarted);
        songStarted();
      }, 0);
    },
  });
})();
