// Outils partagés de la composition vidéo (1920×1080). Même esprit que js/podcast-motion.js : tout est une FONCTION PURE DU TEMPS.
// Exposé en `window.ZV`. Ne dépend de rien d'autre ; chargé avant les composants.
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const W = 1920, H = 1080;
  const C = { ink: '#0A0A0A', lime: '#C8FF2E', paper: '#F3F0E8', red: '#FF4A36', white: '#FFFFFF', pocket: '#161616', grey: '#5A5A5A' };
  const F = { display: '"Bricolage Grotesque", system-ui, sans-serif', mono: '"JetBrains Mono", ui-monospace, monospace' };
  const D2R = Math.PI / 180;
  const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  const prog = (t, a, b) => clamp((t - a) / (b - a));           // 0→1 entre a et b (secondes)
  const lerp = (a, b, p) => a + (b - a) * p;
  const f2 = (n) => Math.round(n * 100) / 100;
  const E = {
    lin: (p) => p, in2: (p) => p * p, in3: (p) => p * p * p, out2: (p) => 1 - (1 - p) * (1 - p), out3: (p) => 1 - Math.pow(1 - p, 3),
    io2: (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2),
    io3: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
    back: (p) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); },
    bounce: (p) => { const n = 7.5625, d = 2.75; if (p < 1 / d) return n * p * p; if (p < 2 / d) { p -= 1.5 / d; return n * p * p + 0.75; } if (p < 2.5 / d) { p -= 2.25 / d; return n * p * p + 0.9375; } p -= 2.625 / d; return n * p * p + 0.984375; }
  };
  function rng(seed) { let a = seed | 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const fr = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); // 1 000 000 (espace fine insécable)

  function sv(tag, attrs, parent) { const n = document.createElementNS(NS, tag); if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; }
  const g = (parent, attrs) => sv('g', attrs, parent);
  function rect(parent, x, y, w, h, rx, fill, stroke, sw, extra) {
    const n = sv('rect', { x, y, width: w, height: h, rx: rx || 0, fill: fill || 'none' }, parent);
    if (stroke) { n.setAttribute('stroke', stroke); n.setAttribute('stroke-width', sw || 6); n.setAttribute('stroke-linejoin', 'round'); }
    if (extra) for (const k in extra) n.setAttribute(k, extra[k]);
    return n;
  }
  function circle(parent, cx, cy, r, fill, stroke, sw) { const n = sv('circle', { cx, cy, r, fill: fill || 'none' }, parent); if (stroke) { n.setAttribute('stroke', stroke); n.setAttribute('stroke-width', sw || 6); } return n; }
  function path(parent, d, fill, stroke, sw, extra) {
    const n = sv('path', { d, fill: fill || 'none' }, parent);
    if (stroke) { n.setAttribute('stroke', stroke); n.setAttribute('stroke-width', sw || 6); n.setAttribute('stroke-linejoin', 'round'); n.setAttribute('stroke-linecap', 'round'); }
    if (extra) for (const k in extra) n.setAttribute(k, extra[k]);
    return n;
  }
  function line(parent, x1, y1, x2, y2, stroke, sw, extra) { const n = sv('line', { x1, y1, x2, y2, stroke, 'stroke-width': sw || 6, 'stroke-linecap': 'round' }, parent); if (extra) for (const k in extra) n.setAttribute(k, extra[k]); return n; }
  // texte : o.mono => JetBrains Mono, sinon Bricolage 800 ; o.anchor 'start'|'middle'|'end' ; o.weight ; o.len impose la largeur (indépendant de la police de secours)
  function text(parent, str, x, y, size, fill, o) {
    o = o || {};
    const n = sv('text', { x, y, 'font-size': size, fill, 'font-family': o.mono ? F.mono : F.display, 'font-weight': o.weight || 800 }, parent);
    if (o.anchor) n.setAttribute('text-anchor', o.anchor);
    if (o.spacing !== undefined) n.setAttribute('letter-spacing', o.spacing);
    if (o.len) { n.setAttribute('textLength', o.len); n.setAttribute('lengthAdjust', 'spacingAndGlyphs'); }
    n.textContent = str;
    return n;
  }
  // position / rotation (deg) / échelle / opacité d'un groupe dont la géométrie est centrée sur (0,0)
  function put(n, x, y, r, sx, sy, o) {
    if (r === undefined) r = 0; if (sx === undefined) sx = 1; if (sy === undefined) sy = sx; if (o === undefined) o = 1;
    n.setAttribute('transform', `translate(${f2(x)} ${f2(y)}) rotate(${f2(r)}) scale(${f2(sx || 0.0001)} ${f2(sy || 0.0001)})`);
    n.setAttribute('opacity', f2(o));
    n.setAttribute('visibility', o <= 0.001 || !sx || !sy ? 'hidden' : 'visible');
  }
  const show = (n, on) => n.setAttribute('visibility', on ? 'visible' : 'hidden');
  // tremblement amorti, déterministe : renvoie [dx, dy] ; t0 = instant du choc
  function shakeAt(t, t0, amp, dur) { dur = dur || 0.4; const p = (t - t0) / dur; if (p < 0 || p > 1) return [0, 0]; const a = amp * (1 - p) * (1 - p); return [a * Math.sin(p * 62), a * Math.cos(p * 47)]; }
  // coin légèrement incliné (sticker plat) : bloc `w`×`h` centré sur (0,0), ombre dure décalée de `sh` px
  function sticker(parent, w, h, fill, label, size, textFill, o) {
    o = o || {};
    const grp = g(parent);
    rect(grp, -w / 2 + (o.sh || 10), -h / 2 + (o.sh || 10), w, h, o.r === undefined ? 18 : o.r, C.ink);
    rect(grp, -w / 2, -h / 2, w, h, o.r === undefined ? 18 : o.r, fill, C.ink, o.sw || 6);
    if (label) text(grp, label, 0, size * 0.35, size, textFill || C.ink, { anchor: 'middle', mono: o.mono });
    return grp;
  }
  // roulette européenne : ordre réel du cylindre et rouges
  const ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
  const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  const colorOf = (n) => (n === 0 ? 'lime' : RED.has(n) ? 'red' : 'black');

  /* ---- contrat des composants (voir INTERFACE.md) ---- */
  const REG = {};
  function define(id, impl) { REG[id] = impl; }
  // premier / tous les instants relatifs au plan des repères `cue` nommés ; null si absent
  function cue(shot, name) { const b = shot.beats.find((x) => x.do === 'cue' && x.name === name); return b ? b.t : null; }
  function cues(shot, name) { return shot.beats.filter((x) => x.do === 'cue' && x.name === name); }
  // le repère `cue` le plus récent déjà passé à l'instant t (ou null) : utile pour les machines à états
  function lastCue(shot, t) { let r = null; for (const b of shot.beats) if (b.do === 'cue' && b.t <= t) r = b; return r; }

  window.ZV = { NS, W, H, C, F, D2R, clamp, prog, lerp, f2, E, rng, fr, sv, g, rect, circle, path, line, text, put, show, shakeAt, sticker, ORDER, RED, colorOf, REG, define, cue, cues, lastCue };
})();
