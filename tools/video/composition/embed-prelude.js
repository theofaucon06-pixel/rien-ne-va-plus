// Configuration de l'intégration dans le site : placée par tools/build-podcast.mjs juste AVANT core.js dans js/episode-motion.js.
// core.js lit window.ZV_CONFIG ; sans elle (index.html, rendu vidéo) il se comporte exactement comme avant.
// Le montage est repéré dans la page : [data-zv-mount] (la scène) dans [data-zv] (le lecteur, qui porte data-timeline).
(() => {
  const host = document.querySelector('[data-zv]');
  window.ZV_CONFIG = window.ZV_CONFIG || {
    timelineUrl: host ? host.getAttribute('data-timeline') : '',
    componentsInline: true,
    mount: document.querySelector('[data-zv-mount]'),
    size: 'fluid',
    autoBoot: false
  };
})();
