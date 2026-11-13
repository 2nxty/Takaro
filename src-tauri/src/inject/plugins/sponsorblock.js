// SponsorBlock — portado de pear-desktop/src/plugins/sponsorblock (MIT).
(() => {
  const T = window.Takaro;
  if (!T) return;

  const CATEGORIES = ['sponsor', 'intro', 'outro', 'interaction', 'selfpromo', 'music_offtopic'];

  // Junta segmentos sobrepostos: [[start, end], ...]
  const sortSegments = (segments) => {
    segments.sort((a, b) => (a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]));
    const out = [];
    let cur;
    for (const s of segments) {
      if (!cur) cur = s;
      else if (cur[1] < s[0]) {
        out.push(cur);
        cur = s;
      } else cur[1] = Math.max(cur[1], s[1]);
    }
    if (cur) out.push(cur);
    return out;
  };

  T.register({
    id: 'sponsorblock',
    defaults: { enabled: true, apiURL: 'https://sponsor.ajay.app', categories: CATEGORIES },
    options: [{ key: 'categories', type: 'multi', choices: CATEGORIES }],

    onPlayer(api, cfg) {
      const video = T.$('video');
      let segments = [];
      let currentId = null;

      document.addEventListener('takaro:dataloaded', async (e) => {
        const id = e.detail?.videoDetails?.videoId;
        if (!id || id === currentId) return;
        currentId = id;
        segments = [];
        if (!cfg.categories.length) return;
        const url = `${cfg.apiURL}/api/skipSegments?videoID=${id}&categories=${encodeURIComponent(JSON.stringify(cfg.categories))}`;
        try {
          const resp = await fetch(url);
          if (resp.status !== 200 || currentId !== id) return;
          segments = sortSegments((await resp.json()).map((s) => s.segment));
        } catch (err) {
          console.debug('[takaro:sponsorblock]', err);
        }
      });

      video.addEventListener('timeupdate', () => {
        if (!segments.length) return;
        const now = api.getCurrentTime(); // per track; the <video> time adds up across songs
        for (const [start, end] of segments) {
          if (now >= start && now < end) {
            api.seekTo(end, true);
            break;
          }
        }
      });
      video.addEventListener('emptied', () => (segments = []));
    },
  });
})();
