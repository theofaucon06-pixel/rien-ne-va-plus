// Lecteur « expérience motion » de la page d'un épisode (assemblé dans js/episode-motion.js par tools/build-podcast.mjs).
// L'élément <audio> pilote tout : la scène (window.ZVEmbed.renderAt, fonction pure du temps) est redessinée à audio.currentTime
// pendant la lecture (boucle requestAnimationFrame), une seule fois après un déplacement. Aucune horloge propre : on suit l'audio.
// Mise au point : ?t=<s> ou window.__seek(t) placent la lecture à cet instant (sans lancer le son) ; window.__zv donne les mesures.
(() => {
  'use strict';
  const root = document.querySelector('[data-zv]');
  const audio = root && root.querySelector('audio');
  if (!root || !audio) return;

  const $ = (s) => root.querySelector(s);
  const $$ = (s) => [...root.querySelectorAll(s)];
  const stage = $('.zv-stage'), seekEl = $('[data-seek]'), curEl = $('[data-cur]'), totEl = $('[data-tot]');
  const rail = $('.zv-rail'), marksEl = $('.zv-marks'), big = $('.zv-big'), bigLabel = $('.zv-big-label'), status = $('.zv-status');
  const playBtn = $('[data-act="play"]'), muteBtn = $('[data-act="mute"]'), fsBtn = $('[data-act="fs"]');
  const chapBtns = $$('[data-chap]');
  const slug = root.dataset.slug || 'episode';
  const title = root.dataset.title || document.title;
  const POSTER = parseFloat(root.dataset.poster) || 0;
  const KEY = 'zv:pos:' + slug;
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  const store = {
    get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } },
    set(v) { try { localStorage.setItem(KEY, String(v)); } catch (e) { /* mode privé */ } },
    del() { try { localStorage.removeItem(KEY); } catch (e) { /* mode privé */ } }
  };
  const fmt = (t) => { t = Math.max(0, Math.floor(t)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
  const spoken = (t) => { t = Math.max(0, Math.floor(t)); const m = Math.floor(t / 60), s = t % 60; return `${m} minute${m > 1 ? 's' : ''} ${s} seconde${s > 1 ? 's' : ''}`; };

  audio.removeAttribute('controls');                 // JavaScript actif : nos commandes remplacent celles du navigateur
  root.classList.add('is-js');

  /* ------------------------------------------------------------------ état */
  let ready = false, state = 'idle';                 // idle | playing | paused | ended
  let chaps = [];                                    // [{ t, btn }]
  let resumeT = 0, onScreen = true, raf = 0, frame = 0, skipHalf = false;
  let lastA = -1, lastN = 0, prevT = -1, lastSec = -1, lastChap = -2, lastSaved = 0, dragging = false, fake = false;
  const perf = { sum: 0, n: 0, max: 0, window: 0, wn: 0, avg: 0 };
  const dur = () => (isFinite(audio.duration) && audio.duration > 0 ? audio.duration : (window.ZVEmbed && window.ZVEmbed.total) || +root.dataset.total || 0);
  const say = (msg) => { if (status) status.textContent = msg || ''; };

  /* ------------------------------------------------------------------ dessin */
  function draw(t) { if (ready) window.ZVEmbed.renderAt(t); }

  // Le temps de l'audio n'avance que par à-coups : on le prolonge entre deux changements (jamais de plus de 50 ms, jamais en arrière).
  function clockNow() {
    const a = audio.currentTime, n = performance.now();
    let t = a;
    if (a !== lastA) { lastA = a; lastN = n; } else t = a + Math.min((n - lastN) / 1000 * audio.playbackRate, 0.05);
    if (t < prevT && t > prevT - 0.5) t = prevT;
    prevT = t;
    return t;
  }

  function ui(t) {
    const d = dur();
    root.style.setProperty('--p', d ? clamp(t / d, 0, 1).toFixed(5) : '0');
    const s = Math.floor(t);
    if (s !== lastSec) {
      lastSec = s;
      curEl.textContent = fmt(t);
      seekEl.setAttribute('aria-valuenow', String(s));
      seekEl.setAttribute('aria-valuetext', `${spoken(t)} sur ${spoken(d)}`);
    }
    let c = -1;
    for (let i = 0; i < chaps.length; i++) if (chaps[i].t <= t + 0.05) c = i;
    if (c !== lastChap) {
      lastChap = c;
      chaps.forEach((x, i) => { if (i === c) x.btn.setAttribute('aria-current', 'true'); else x.btn.removeAttribute('aria-current'); });
    }
  }

  function sample(ms) {
    perf.sum += ms; perf.n++; if (ms > perf.max) perf.max = ms;
    perf.window += ms; perf.wn++;
    if (perf.wn >= 60) {                               // garde-fou : si le rendu moyen dépasse 28 ms sur 60 images, une image sur deux
      perf.avg = perf.window / perf.wn;
      if (perf.avg > 28) skipHalf = true; else if (perf.avg < 16) skipHalf = false;
      perf.window = 0; perf.wn = 0;
    }
  }

  function loop() {
    raf = 0;
    if (audio.paused || document.hidden || !onScreen || !ready) return;
    frame++;
    const t = clockNow();
    ui(t);
    if (!(skipHalf && (frame & 1))) {
      const a = performance.now();
      window.ZVEmbed.renderAt(t);
      sample(performance.now() - a);
    }
    raf = requestAnimationFrame(loop);
  }
  function startLoop() { if (!raf && ready && !audio.paused && !document.hidden && onScreen) raf = requestAnimationFrame(loop); }
  function refresh() { const t = audio.currentTime; draw(t); ui(t); }   // un rendu unique (déplacement, pause, retour à l'onglet)

  /* ------------------------------------------------------------------ états visibles */
  function setState(s) {
    state = s;
    root.dataset.state = s;
    const playing = s === 'playing';
    playBtn.setAttribute('aria-label', playing ? 'Pause' : s === 'ended' ? 'Revoir l’épisode' : 'Lecture');
    playBtn.setAttribute('aria-pressed', String(playing));
    let label = '';
    if (s === 'ended') label = 'Revoir';
    else if (s === 'idle' && resumeT > 5) label = 'Reprendre à ' + fmt(resumeT);
    bigLabel.textContent = label;
    big.setAttribute('aria-label', s === 'ended' ? 'Revoir l’épisode' : label ? `${label} : ${title}` : `Lancer l’épisode : ${title}`);
    if ('mediaSession' in navigator) { try { navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'; } catch (e) { /* ignoré */ } }
  }
  function touched() { if (state === 'idle') setState('paused'); }   // l'affiche cède la place à l'image réelle

  /* ------------------------------------------------------------------ commandes */
  function toggle() {
    if (!audio.paused) { audio.pause(); return; }
    if (state === 'ended' || audio.ended) { audio.currentTime = 0; prevT = -1; }
    say('');
    const p = audio.play();
    if (p && p.catch) p.catch((e) => { if (e && e.name !== 'AbortError') say('Le navigateur a bloqué la lecture. Appuie sur lecture.'); });
  }
  function seekTo(t) {
    const d = dur();
    t = clamp(t, 0, d ? Math.max(0, d - 0.05) : t);
    audio.currentTime = t; prevT = -1;
    if (state === 'ended') setState(audio.paused ? 'paused' : 'playing'); else touched();
    draw(t); ui(t);
    return t;
  }
  const seekBy = (dt) => seekTo(audio.currentTime + dt);
  function toggleMute() { audio.muted = !audio.muted; }

  /* plein écran : API native si elle existe, sinon (iPhone) un plein écran « fait maison » en CSS */
  const fsNow = () => document.fullscreenElement === root || document.webkitFullscreenElement === root || fake;
  function syncFs() { const on = fsNow(); root.classList.toggle('is-fs', on); fsBtn.setAttribute('aria-pressed', String(on)); fsBtn.setAttribute('aria-label', on ? 'Quitter le plein écran' : 'Plein écran'); document.documentElement.classList.toggle('zv-lock', fake); }
  function toggleFs() {
    if (fsNow()) {
      if (fake) { fake = false; syncFs(); return; }
      const ex = document.exitFullscreen || document.webkitExitFullscreen; if (ex) ex.call(document);
      return;
    }
    const rq = root.requestFullscreen || root.webkitRequestFullscreen;
    const fallback = () => { fake = true; syncFs(); };
    if (!rq) { fallback(); return; }
    try { const p = rq.call(root); if (p && p.catch) p.catch(fallback); } catch (e) { fallback(); }
  }
  document.addEventListener('fullscreenchange', syncFs);
  document.addEventListener('webkitfullscreenchange', syncFs);

  playBtn.addEventListener('click', toggle);
  stage.addEventListener('click', toggle);             // le gros bouton est dans la scène : son clic remonte ici
  muteBtn.addEventListener('click', toggleMute);
  fsBtn.addEventListener('click', toggleFs);

  /* barre de progression : clic, glisser, clavier */
  function scrub(e) { const r = rail.getBoundingClientRect(); seekTo(clamp((e.clientX - r.left) / r.width, 0, 1) * dur()); }
  seekEl.addEventListener('pointerdown', (e) => { if (e.button > 0) return; dragging = true; try { seekEl.setPointerCapture(e.pointerId); } catch (x) { /* ignoré */ } scrub(e); e.preventDefault(); });
  seekEl.addEventListener('pointermove', (e) => { if (dragging) scrub(e); });
  const endDrag = () => { dragging = false; };
  seekEl.addEventListener('pointerup', endDrag);
  seekEl.addEventListener('pointercancel', endDrag);
  seekEl.addEventListener('keydown', (e) => {
    if (e.key === 'Home') { e.preventDefault(); e.stopPropagation(); seekTo(0); }
    else if (e.key === 'End') { e.preventDefault(); e.stopPropagation(); seekTo(dur() - 1); }
  });

  /* chapitres */
  chapBtns.forEach((b, i) => b.addEventListener('click', () => {
    const go = () => { const c = chaps[i]; if (!c) return; seekTo(c.t); if (audio.paused) toggle(); };
    if (ready) go(); else window.ZVEmbed.ready.then(go);
  }));

  /* clavier : espace / K lecture, ← → ±5 s, F plein écran, M muet, Échap quitte le plein écran « maison » */
  document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    const el = e.target, tag = el && el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (el && el.isContentEditable)) return;
    const interactive = el && el.closest && el.closest('button, a[href], summary');
    switch (e.key) {
      case ' ': case 'Spacebar': if (interactive) return; e.preventDefault(); toggle(); break;
      case 'k': case 'K': toggle(); break;
      case 'ArrowLeft': e.preventDefault(); seekBy(-5); break;
      case 'ArrowRight': e.preventDefault(); seekBy(5); break;
      case 'f': case 'F': toggleFs(); break;
      case 'm': case 'M': toggleMute(); break;
      case 'Escape': if (fake) { fake = false; syncFs(); } break;
      default: return;
    }
  });

  /* ------------------------------------------------------------------ événements de l'audio */
  function save(force) {
    const t = audio.currentTime;
    if (state === 'ended' || audio.ended) return;
    if (force || Math.abs(t - lastSaved) >= 2) { lastSaved = t; if (t > 3) store.set(t.toFixed(1)); }
  }
  audio.addEventListener('play', () => { setState('playing'); startLoop(); });
  audio.addEventListener('playing', () => { say(''); startLoop(); });
  audio.addEventListener('pause', () => { if (!audio.ended) setState('paused'); refresh(); save(true); });
  audio.addEventListener('seeked', () => { prevT = -1; if (audio.paused) refresh(); });
  audio.addEventListener('timeupdate', () => { if (audio.paused) ui(audio.currentTime); save(false); });
  audio.addEventListener('waiting', () => say('Chargement de l’audio…'));
  audio.addEventListener('canplay', () => say(''));
  audio.addEventListener('ended', () => { setState('ended'); store.del(); lastSaved = 0; refresh(); });
  audio.addEventListener('error', () => say('L’audio ne se charge pas. Vérifie ta connexion puis recharge la page.'));
  audio.addEventListener('volumechange', () => { root.classList.toggle('is-muted', audio.muted); muteBtn.setAttribute('aria-pressed', String(audio.muted)); muteBtn.setAttribute('aria-label', audio.muted ? 'Rétablir le son' : 'Couper le son'); });
  audio.addEventListener('loadedmetadata', () => {
    totEl.textContent = fmt(Math.ceil(audio.duration));
    seekEl.setAttribute('aria-valuemax', String(Math.ceil(audio.duration)));
    if (resumeT > 5 && resumeT < audio.duration - 8 && audio.currentTime < 1) audio.currentTime = resumeT;
    layoutMarks();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(true); else { refresh(); startLoop(); } });
  window.addEventListener('pagehide', () => save(true));
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((en) => { const was = onScreen; onScreen = en[en.length - 1].isIntersecting; if (onScreen && !was) { refresh(); startLoop(); } }, { threshold: 0 }).observe(stage);
  }

  /* ------------------------------------------------------------------ chapitres et repères (une fois la ligne de temps chargée) */
  function layoutMarks() {
    const d = dur();
    if (!d) return;
    chaps.forEach((c, i) => { if (c.mark) c.mark.style.setProperty('--x', ((c.t / d) * 100).toFixed(3) + '%'); });
  }
  function buildChapters(tl) {
    const secs = (tl && tl.sections) || [], shots = (tl && tl.shots) || [];
    chaps = chapBtns.map((btn, i) => {
      const sec = secs[i];
      let t = 0;
      if (i > 0 && sec) {
        t = sec.start;
        for (const s of shots) if (s.component === 'chapter-card' && s.start <= sec.start && sec.start - s.start < 5) { t = s.start; break; }
      }
      const time = btn.querySelector('time'); if (time) time.textContent = fmt(t);
      const mark = document.createElement('i');
      mark.className = 'zv-mark'; mark.setAttribute('aria-hidden', 'true');
      marksEl.appendChild(mark);
      return { t, btn, mark };
    });
    layoutMarks();
  }

  /* ------------------------------------------------------------------ démarrage */
  const saved = parseFloat(store.get());
  if (saved > 5) resumeT = saved;
  setState('idle');
  totEl.textContent = fmt(Math.ceil(+root.dataset.total || 0));
  ui(0);

  const E = window.ZVEmbed;
  if (!E) { say('La scène animée ne peut pas se charger : l’audio reste disponible.'); return; }
  E.boot();
  E.ready.then(() => {
    ready = true;
    buildChapters(E.timeline);
    const t0 = parseFloat(new URLSearchParams(location.search).get('t'));
    if (isFinite(t0)) { touched(); seekTo(t0); }
    else if (resumeT > 5) { draw(resumeT); ui(resumeT); }
    else draw(POSTER);                                  // l'affiche : l'image de l'épisode à l'instant `poster`
    root.classList.add('is-ready');
    startLoop();
  }, () => say('La scène animée ne peut pas se charger : l’audio reste disponible.'));

  /* ------------------------------------------------------------------ Media Session (écran verrouillé, touches média) */
  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.metadata = new MediaMetadata({ title, artist: 'Zéro Vert', album: 'Saison 1', artwork: [{ src: '/assets/podcast/cover.png', sizes: '1400x1400', type: 'image/png' }] });
      const h = { play: toggle, pause: toggle, seekbackward: () => seekBy(-10), seekforward: () => seekBy(10), seekto: (d) => { if (d && typeof d.seekTime === 'number') seekTo(d.seekTime); } };
      for (const k in h) { try { navigator.mediaSession.setActionHandler(k, h[k]); } catch (e) { /* action non gérée */ } }
    } catch (e) { /* ignoré */ }
  }

  /* ------------------------------------------------------------------ crochets de test */
  window.__seek = (t) => E.ready.then(() => { touched(); return seekTo(+t); });
  window.__zv = {
    get state() { return state; }, get ready() { return ready; }, get skipHalf() { return skipHalf; },
    get frames() { return perf.n; }, get avgMs() { return perf.n ? perf.sum / perf.n : 0; }, get maxMs() { return perf.max; },
    get lastWindowAvgMs() { return perf.avg; }, get time() { return audio.currentTime; }
  };
})();
