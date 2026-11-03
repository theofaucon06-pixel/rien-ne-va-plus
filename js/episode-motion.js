/* Zéro Vert — lecteur « motion » des épisodes. FICHIER GÉNÉRÉ par tools/build-podcast.mjs (npm run podcast) : ne pas éditer.
   Sources : tools/video/composition/ (lib, components/*, embed-prelude, core, embed-player). */
/* ==== tools/video/composition/lib.js ==== */
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
;
/* ==== tools/video/composition/components/anna-ledger.js ==== */
// Composant `anna-ledger` : le journal d'Anna (S3 de l'épisode 3, « celle qui attend »). Carnet ouvert (sténographie = gribouillis réguliers), colonne de pointage, horloge plate, puis « l'autre côté de la table » (chaise vide).
// Cues : open, line-1, line-2, line-3, tally, clock, other-side. Fond pocket. Aucun dégradé, flou, lueur ni filter ; jamais de portrait (chaise vide seulement).
(() => {
  'use strict';
  const { C, E, clamp, prog, lerp, f2, sv, g, rect, circle, path, line, text, put, sticker } = ZV;
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const str = (v, d) => (typeof v === 'string' && v.trim() ? v.trim() : d);
  function fit(n, maxW) {
    try { const w = n.getComputedTextLength(); if (w > maxW && w > 0) { n.setAttribute('textLength', f2(maxW)); n.setAttribute('lengthAdjust', 'spacingAndGlyphs'); } } catch (e) { /* hors DOM */ }
  }
  function len(n, fallback) { try { const w = n.getComputedTextLength(); return w > 0 ? w : fallback; } catch (e) { return fallback; } }

  const SPINE = 780;
  const ROW0 = 170, ROWP = 205;
  const TX = 1510, TY = 340, TW = 320, TH = 460;
  const CLK = { x: 1670, y: 196, r: 100 };

  // trait de sténographie : boucles régulières ; renvoie { pts, d }
  function steno(r, x0, y0, w) {
    const pts = [];
    let x = x0;
    while (x < x0 + w) {
      const wl = 36 + r() * 90, end = Math.min(x + wl, x0 + w);
      const om = 0.5 + r() * 0.3, A = 2.6 + r() * 2.2, B = 6 + r() * 7;
      let s = 0;
      while (x < end) {
        x += 1.9; s += 1;
        pts.push([x + A * Math.sin(om * s), y0 - B * Math.cos(om * s) + B]);
      }
      const gap = 14 + r() * 12; x += gap;
      pts.push([x, y0 + 1]);
    }
    let d = `M${f2(pts[0][0])} ${f2(pts[0][1])}`;
    for (let i = 1; i < pts.length; i++) d += `L${f2(pts[i][0])} ${f2(pts[i][1])}`;
    return { pts, d };
  }

  ZV.define('anna-ledger', {
    init(root, shot) {
      const p = (shot && shot.props) || {};
      const beats = Array.isArray(shot && shot.beats) ? shot.beats : [];
      const dur = isNum(shot && shot.dur) && shot.dur > 0 ? shot.dur : 12;
      const cueT = (n) => { const b = beats.filter((x) => x && x.do === 'cue' && x.name === n && isNum(x.t)).sort((a, c) => a.t - c.t)[0]; return b ? b.t : null; };
      const defL = ['LES OBJETS EN GAGE', 'L’ATTENTE', 'LES SERMENTS'];
      const labels = defL.map((d, i) => str(Array.isArray(p.labels) ? p.labels[i] : null, d));
      const title = str(p.title, 'LE JOURNAL D’ANNA');
      const note = str(p.note, 'EN STÉNOGRAPHIE');
      const r = ZV.rng(1867);
      const st = { dur };
      st.tO = cueT('open'); st.tOS = cueT('other-side'); st.tTally = cueT('tally'); st.tClock = cueT('clock');
      st.tL = [cueT('line-1'), cueT('line-2'), cueT('line-3')];
      st.open0 = st.tO == null ? -5 : st.tO;

      rect(root, 0, 0, 1920, 1080, 0, C.pocket);

      /* ================= bureau (carnet + pointage + horloge) ================= */
      st.dk = g(root);
      const dk = st.dk;
      // couverture
      rect(dk, 80 + 14, 100 + 14, 1390, 720, 30, C.ink);
      rect(dk, 80, 100, 1390, 720, 30, C.red, C.ink, 8);
      // page de droite
      rect(dk, SPINE + 10, 124, 656, 672, 14, C.paper, C.ink, 6);
      // page de gauche (se déplie autour de la reliure)
      st.lp = g(dk);
      rect(st.lp, 104, 124, SPINE - 114, 672, 14, C.paper, C.ink, 6);
      // titre (2 lignes) + note
      let t1 = title, t2 = '';
      if (title.length > 11) {
        const w = title.split(/\s+/); let best = 1, bd = 1e9;
        for (let j = 1; j < w.length; j++) { const d = Math.abs(w.slice(0, j).join(' ').length - w.slice(j).join(' ').length); if (d < bd) { bd = d; best = j; } }
        t1 = w.slice(0, best).join(' '); t2 = w.slice(best).join(' ');
      }
      st.title = g(dk);
      fit(text(st.title, t1, 150, 232, 88, C.ink), 560);
      if (t2) fit(text(st.title, t2, 150, 322, 88, C.ink), 560);
      st.noteG = g(dk);
      {
        const nt = text(st.noteG, note, 0, 12, 34, C.ink, { anchor: 'middle', mono: true });
        fit(nt, 520);
        const w = Math.min(560, len(nt, note.length * 21) + 50);
        const bg = g(st.noteG);
        st.noteG.insertBefore(bg, nt);
        rect(bg, -w / 2 + 8, -34 + 8, w, 68, 10, C.ink);
        rect(bg, -w / 2, -34, w, 68, 10, C.lime, C.ink, 5);
      }
      // gribouillis de remplissage (page de gauche) : fixes, réguliers
      st.fill = g(st.lp);
      for (let k = 0; k < 8; k++) {
        const s = steno(r, 150, 470 + k * 38, k === 7 ? 260 : 560);
        path(st.fill, s.d, 'none', C.ink, 3.5, { opacity: 0.5 });
      }
      // reliure
      rect(dk, SPINE - 14, 100, 28, 720, 6, C.ink);
      for (let y = 150; y < 790; y += 70) line(dk, SPINE, y, SPINE, y + 28, C.paper, 5);
      // volet de couverture qui s'ouvre
      st.flap = g(dk);
      rect(st.flap, SPINE + 14, 100, 676, 720, 30, C.red, C.ink, 8);
      rect(st.flap, SPINE + 60, 150, 584, 620, 18, 'none', C.ink, 5);

      // lignes de sténo (page de droite)
      st.rows = [0, 1, 2].map((i) => {
        const y0 = ROW0 + i * ROWP;
        // lignes à écrire (réglure fantôme)
        line(dk, SPINE + 50, y0 + 96, SPINE + 640, y0 + 96, C.ink, 4, { opacity: 0.14 });
        line(dk, SPINE + 50, y0 + 148, SPINE + 640, y0 + 148, C.ink, 4, { opacity: 0.14 });
        // étiquette
        const lg = g(dk);
        const lt = text(lg, labels[i], 20, 12, 30, C.ink, { mono: true });
        fit(lt, 520);
        const lw = Math.min(570, len(lt, labels[i].length * 18) + 40);
        const bg = g(lg);
        lg.insertBefore(bg, lt);
        rect(bg, 8, -28 + 8, lw, 56, 8, C.ink);
        rect(bg, 0, -28, lw, 56, 8, i === 2 ? C.lime : C.white, C.ink, 5);
        // gribouillis
        const a = steno(r, SPINE + 50, y0 + 84, 580), b = steno(r, SPINE + 50, y0 + 136, 400);
        const pa = path(dk, a.d, 'none', C.ink, 4.5, { pathLength: 1, 'stroke-dasharray': '0 1.01' });
        const pb = path(dk, b.d, 'none', C.ink, 4.5, { pathLength: 1, 'stroke-dasharray': '0 1.01' });
        return { lg, x: SPINE + 36, y: y0 + 22, a, b, pa, pb };
      });
      // crayon
      st.pen = g(dk);
      {
        const pn = g(st.pen, { transform: 'rotate(-26)' });
        path(pn, 'M0 0 L32 -10 L32 10Z', C.paper, C.ink, 4);
        rect(pn, 32, -11, 124, 22, 3, C.lime, C.ink, 4);
        rect(pn, 156, -11, 16, 22, 0, C.paper, C.ink, 4);
        rect(pn, 172, -11, 26, 22, 6, C.red, C.ink, 4);
      }

      // colonne de pointage
      st.tal = g(dk);
      rect(st.tal, TX + 12, TY + 12, TW, TH, 12, C.ink);
      rect(st.tal, TX, TY, TW, TH, 12, C.paper, C.ink, 6);
      for (let k = 1; k < 4; k++) line(st.tal, TX + 20, TY + k * 112, TX + TW - 20, TY + k * 112, C.ink, 3, { opacity: 0.15 });
      st.marks = [];
      const M = 40;
      for (let j = 0; j < M; j++) {
        const grp = Math.floor(j / 5), k = j % 5, col = grp % 2, row = Math.floor(grp / 2);
        const gx = TX + 40 + col * 146, gy = TY + 24 + row * 112;
        let a;
        if (k < 4) a = { x1: gx + k * 24, y1: gy, x2: gx + k * 24 + (k % 2 ? 2 : -1), y2: gy + 80 };
        else a = { x1: gx - 12, y1: gy + 64, x2: gx + 100, y2: gy + 14 };
        st.marks.push({ n: line(st.tal, a.x1, a.y1, a.x2, a.y2, C.ink, 7, { visibility: 'hidden' }), a, s: -1 });
      }

      // horloge
      st.clk = g(dk);
      circle(st.clk, CLK.x + 10, CLK.y + 10, CLK.r, C.ink);
      circle(st.clk, CLK.x, CLK.y, CLK.r, C.paper, C.ink, 8);
      for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; line(st.clk, CLK.x + Math.sin(a) * 78, CLK.y - Math.cos(a) * 78, CLK.x + Math.sin(a) * 90, CLK.y - Math.cos(a) * 90, C.ink, i % 3 === 0 ? 7 : 4); }
      st.hh = line(st.clk, CLK.x, CLK.y, CLK.x, CLK.y - 50, C.ink, 11);
      st.mh = line(st.clk, CLK.x, CLK.y, CLK.x, CLK.y - 74, C.ink, 7);
      circle(st.clk, CLK.x, CLK.y, 10, C.red, C.ink, 4);

      /* ================= l'autre côté de la table ================= */
      st.chair = g(root);
      const ch = st.chair;
      rect(ch, -190 + 14, -300 + 14, 380, 270, 46, C.ink);
      rect(ch, -190, -300, 380, 270, 46, C.paper, C.ink, 8);
      for (const x of [-100, 0, 100]) rect(ch, x - 16, -262, 32, 190, 10, C.white, C.ink, 5);
      for (const x of [-196, 160]) rect(ch, x, 70, 36, 262, 8, C.paper, C.ink, 8);
      rect(ch, -190, 224, 380, 30, 6, C.paper, C.ink, 8);
      rect(ch, -230, 0, 460, 80, 22, C.red, C.ink, 8);
      st.legend = g(root);
      sticker(st.legend, 860, 96, C.lime, '', 1, C.ink, { sh: 12 });
      fit(text(st.legend, str(p.legend, 'L’AUTRE CÔTÉ DE LA TABLE'), 0, 20, 56, C.ink, { anchor: 'middle' }), 800);
      return st;
    },

    update(st, t) {
      const t0 = st.open0;
      /* ---- ouverture du carnet ---- */
      const op = E.io3(prog(t, t0, t0 + 0.8));
      const fx = Math.cos(op * Math.PI);                  // 1 → -1 : le volet passe de droite à gauche
      const flapOn = fx > 0.001;
      setA(st.flap, 'visibility', flapOn ? 'visible' : 'hidden');
      setA(st.flap, 'transform', `translate(${SPINE} 0) scale(${f2(Math.max(fx, 0.001))} 1) translate(${-SPINE} 0)`);
      const lx = flapOn ? 0 : -fx;
      setA(st.lp, 'visibility', lx > 0.001 ? 'visible' : 'hidden');
      setA(st.lp, 'transform', `translate(${SPINE} 0) scale(${f2(Math.max(lx, 0.001))} 1) translate(${-SPINE} 0)`);
      const tp = E.back(clamp((t - t0 - 0.7) / 0.35));
      setA(st.title, 'visibility', tp > 0 ? 'visible' : 'hidden');
      setA(st.title, 'transform', `translate(${f2((1 - Math.min(tp, 1)) * -40)} 0)`);
      setA(st.title, 'opacity', f2(Math.min(tp, 1)));
      const np = E.back(clamp((t - t0 - 0.95) / 0.35));
      put(st.noteG, 440, 410, -2, np, np, np > 0 ? 1 : 0);

      /* ---- lignes de sténo ---- */
      let pen = null;
      st.rows.forEach((R, i) => {
        const tl = st.tL[i];
        const lp = tl == null ? 0 : E.back(clamp((t - tl) / 0.25));
        put(R.lg, R.x, R.y, i === 1 ? 1.2 : -1.2, lp, lp, lp > 0 ? 1 : 0);
        const wd = tl == null ? 0 : clamp((t - tl - 0.2) / 1.7);
        const pa = Math.min(1, wd / 0.6), pb = clamp((wd - 0.6) / 0.4);
        setA(R.pa, 'stroke-dasharray', `${f2(pa)} 1.01`);
        setA(R.pb, 'stroke-dasharray', `${f2(pb)} 1.01`);
        setA(R.pa, 'visibility', pa > 0 ? 'visible' : 'hidden');
        setA(R.pb, 'visibility', pb > 0 ? 'visible' : 'hidden');
        if (wd > 0 && wd < 1) {
          const L = pb > 0 ? R.b : R.a, q = pb > 0 ? pb : pa;
          const pt = L.pts[Math.min(L.pts.length - 1, Math.floor(q * (L.pts.length - 1)))];
          pen = pt;
        }
      });
      setA(st.pen, 'visibility', pen ? 'visible' : 'hidden');
      if (pen) setA(st.pen, 'transform', `translate(${f2(pen[0])} ${f2(pen[1])})`);

      /* ---- pointage (monotone, ≤ 6 bâtons / s) ---- */
      const tt = st.tTally;
      st.marks.forEach((m, j) => {
        const key = Math.round((tt == null ? 0 : clamp((t - tt - j * 0.17) / 0.12)) * 10), q = key / 10;
        if (m.s === key) return;
        m.s = key;
        const a = m.a;
        setA(m.n, 'visibility', q > 0 ? 'visible' : 'hidden');
        setA(m.n, 'x2', f2(lerp(a.x1, a.x2, q))); setA(m.n, 'y2', f2(lerp(a.y1, a.y2, q)));
      });

      /* ---- horloge ---- */
      let hrs = 3;
      if (st.tClock != null) {
        let nxt = st.dur;
        if (st.tOS != null && st.tOS > st.tClock + 1.7) nxt = st.tOS;
        const Dc = clamp(nxt - st.tClock - 0.3, 1.5, 4.5);
        hrs = 3 + Dc * 1.2 * E.io2(prog(t, st.tClock, st.tClock + Dc));
      }
      const ha = (hrs / 12) * 360, ma = hrs * 360;
      setA(st.hh, 'transform', `rotate(${f2(ha % 360)} ${CLK.x} ${CLK.y})`);
      setA(st.mh, 'transform', `rotate(${f2(ma % 360)} ${CLK.x} ${CLK.y})`);

      /* ---- l'autre côté de la table ---- */
      const o = st.tOS == null ? 0 : E.io3(prog(t, st.tOS, st.tOS + 0.7));
      const s = lerp(1, 0.5, o);
      setA(st.dk, 'transform', `translate(${f2(lerp(960, 500, o))} ${f2(lerp(460, 470, o))}) scale(${f2(s)}) translate(-960 -460)`);
      const cq = st.tOS == null ? 0 : clamp((t - st.tOS - 0.25) / 0.7);
      put(st.chair, lerp(2350, 1400, E.back(cq)), 380, 0, 1, 1, cq > 0 ? 1 : 0);
      const lg = st.tOS == null ? 0 : E.back(clamp((t - st.tOS - 0.95) / 0.3));
      put(st.legend, 1400, 780, -2, lg, lg, lg > 0 ? 1 : 0);
    }
  });
})();
;
/* ==== tools/video/composition/components/big-number.js ==== */
// Composant « big-number » : voir tools/video/composition/INTERFACE.md. Fonction pure du temps du plan, aplats seulement.
(() => {
  /* ---- aides typographiques locales (mêmes lignes dans chaque composant du rôle « Typo ») ---- */
  const { C, F, E, clamp, prog, lerp, f2, put, g, rect, text, path, line, sv, circle } = ZV;
  const COL = { ink: C.ink, paper: C.paper, lime: C.lime, red: C.red, white: C.white };
  const TINT = { ink: '#1A1A1A', lime: '#B9EC22', paper: '#E4E0D3', red: '#F0452F' };
  const NB = ' ';
  let UID = 0;
  const colOf = (k, d) => COL[k] || k || d;
  // largeur d'une chaîne (mesure réelle via un <text> caché), ramenée à `size` px
  function mkProbe(root) {
    const n = sv('text', { x: 0, y: 0, 'font-size': 100, 'font-weight': 800, visibility: 'hidden' }, root);
    const cache = {};
    return function w(str, size, o) {
      o = o || {};
      const key = (o.mono ? 'm' : 'd') + (o.sp || 0) + '|' + str;
      let v = cache[key];
      if (v === undefined) {
        n.setAttribute('font-family', o.mono ? F.mono : F.display);
        n.setAttribute('letter-spacing', (o.sp || 0) * 100);
        n.textContent = str.replace(/ /g, NB);
        try { v = n.getComputedTextLength(); } catch (e) { v = 0; }
        if (!(v > 0)) v = str.length * (o.mono ? 60 : 58);
        cache[key] = v;
      }
      return v * size / 100;
    };
  }
  // 1 234,5 : espace fine insécable pour les milliers, virgule décimale
  function fnum(v, dec) {
    const s = Math.abs(v).toFixed(dec || 0).split('.');
    const i = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return (v < 0 ? '−' : '') + i + (s[1] ? ',' + s[1] : '');
  }
  // lie ponctuation et opérateurs au mot précédent (jamais de « ? » seul en début de ligne)
  const glue = (s) => String(s).replace(/ (?=[?:%!;€¢÷×=+−])/g, NB).replace(/([÷×=+−]) (?=\S)/g, '$1' + NB);
  // coupe `str` en ≤ maxRows lignes équilibrées tenant dans maxW (null si impossible)
  function breaks(str, S, maxW, wf, maxRows) {
    if (wf(str, S) <= maxW) return [str];
    const words = str.split(' ');
    if (words.length < 2 || maxRows < 2) return null;
    let best = null, bm = 1e9;
    for (let k = 1; k < words.length; k++) {
      const a = words.slice(0, k).join(' '), b = words.slice(k).join(' ');
      const m = Math.max(wf(a, S), wf(b, S));
      if (m < bm) { bm = m; best = [a, b]; }
    }
    if (bm <= maxW) return best;
    if (maxRows >= 3 && words.length >= 3) {
      bm = 1e9; best = null;
      for (let k = 1; k < words.length - 1; k++) for (let j = k + 1; j < words.length; j++) {
        const a = words.slice(0, k).join(' '), b = words.slice(k, j).join(' '), c = words.slice(j).join(' ');
        const m = Math.max(wf(a, S), wf(b, S), wf(c, S));
        if (m < bm) { bm = m; best = [a, b, c]; }
      }
      if (bm <= maxW) return best;
    }
    return null;
  }
  // fond plat + trame de points qui dérive doucement + repères de coupe aux angles
  function backdrop(root, bgk, uid, opt) {
    opt = opt || {};
    const tint = TINT[bgk] || TINT.ink;
    const fill = bgk === 'wheel' ? C.ink : colOf(bgk, C.ink);
    rect(root, 0, 0, 1920, 1080, 0, fill);
    const o = {};
    if (opt.dots !== false) {
      const defs = sv('defs', null, root);
      o.pat = sv('pattern', { id: uid + 'd', width: 64, height: 64, patternUnits: 'userSpaceOnUse' }, defs);
      circle(o.pat, 32, 32, 3.6, tint);
      rect(root, 0, 0, 1920, 1080, 0, `url(#${uid}d)`);
    }
    if (opt.marks !== false) {
      const mc = bgk === 'ink' || bgk === 'wheel' ? '#3A3A3A' : C.ink;
      path(root, 'M56 160V56H160M1760 56H1864V160M1864 920V1024H1760M160 1024H56V920', 'none', mc, 8, { 'stroke-linecap': 'butt', 'stroke-linejoin': 'miter' });
    }
    return o;
  }
  const drift = (o, t) => { if (o && o.pat) o.pat.setAttribute('patternTransform', `translate(${f2(t * 14)} ${f2(t * 9)})`); };
  // pastille Mono (kicker) : fond/texte selon l'aplat
  function pill(parent, str, bgk, size, W) {
    const dark = bgk === 'ink' || bgk === 'wheel';
    const fill = dark ? C.lime : C.ink;
    const tc = dark ? C.ink : (bgk === 'lime' ? C.lime : C.paper);
    const sp = 0.1;
    const w = W(str, size, { mono: true, sp }) + 64, h = size * 1.7;
    const gr = g(parent);
    rect(gr, -w / 2 + 7, -h / 2 + 7, w, h, 14, C.ink);
    rect(gr, -w / 2, -h / 2, w, h, 14, fill, C.ink, 5);
    text(gr, str, 0, size * 0.35, size, tc, { mono: true, anchor: 'middle', spacing: f2(sp * size) });
    return { g: gr, w, h };
  }
  // Définition d'un composant : `build` (une fois) / `draw` (pure). La mise en page dépend des mesures de police :
  // si les polices ne sont pas encore chargées à l'init, on reconstruit dès qu'elles le sont (puis on redessine).
  const FONTS = ['800 100px "Bricolage Grotesque"', '800 100px "JetBrains Mono"'];
  const fontsOk = () => { try { return FONTS.every((f) => document.fonts.check(f)); } catch (e) { return true; } };
  function defineTypo(id, impl) {
    const rebuild = (st) => {
      while (st.root.firstChild) st.root.removeChild(st.root.firstChild);
      st.s = impl.build(st.root, st.shot);
      st.ok = true;
      if (st.last !== null) impl.draw(st.s, st.last, st.shot);
    };
    ZV.define(id, {
      init(root, shot) {
        const st = { root, shot, last: null, ok: fontsOk() };
        st.s = impl.build(root, shot);
        if (!st.ok) { try { Promise.all(FONTS.map((f) => document.fonts.load(f))).then(() => { if (!st.ok && fontsOk()) rebuild(st); }); } catch (e) { /* tant pis */ } }
        return st;
      },
      update(st, t, shot) {
        st.last = t;
        if (!st.ok && fontsOk()) rebuild(st);
        impl.draw(st.s, t, shot || st.shot);
      }
    });
  }

  const FR = 1 / 30;
  const SPN = -0.02;                                  // tracking du gros chiffre (em)
  const BGS = ['ink', 'lime', 'paper', 'red'];

  defineTypo('big-number', {
    build(root, shot) {
      const P = shot.props || {};
      const mode = ['count', 'type', 'equation', 'split'].includes(P.mode) ? P.mode : 'count';
      const bgk = BGS.includes(P.bg) ? P.bg : 'ink';
      const dark = bgk === 'ink';
      const uid = 'bn' + (++UID);
      const W = mkProbe(root);
      const st = { shot, mode, bgk, dark, uid, W, P };
      const fg = colOf(P.color, dark ? C.paper : C.ink);
      const cue = (n, d) => { const v = ZV.cue(shot, n); return v === null ? d : v; };
      st.fg = fg;
      // pastille de survol (plaque) : lime sur sombre/papier/rouge, encre sur lime
      st.plateFill = bgk === 'lime' ? C.ink : C.lime;
      st.plateText = bgk === 'lime' ? C.lime : C.ink;

      if (mode === 'split') {
        st.bd = backdrop(root, bgk, uid, { marks: false });
        const items = (P.split || []).slice(0, 2);
        st.halves = items.map((it, i) => {
          const hb = BGS.includes(it.bg) ? it.bg : (i ? 'red' : 'lime');
          const gh = g(root);
          // fond du demi-écran (aplat + trame) ; le groupe glisse depuis le bord
          rect(gh, i ? 960 : 0, 0, 960, 1080, 0, colOf(hb));
          const pg = sv('defs', null, gh), pat = sv('pattern', { id: uid + 'h' + i, width: 64, height: 64, patternUnits: 'userSpaceOnUse' }, pg);
          circle(pat, 32, 32, 3.6, TINT[hb] || TINT.ink);
          rect(gh, i ? 960 : 0, 0, 960, 1080, 0, `url(#${uid}h${i})`);
          const cxh = i ? 1440 : 480;
          const pl = it.kicker ? pill(gh, String(it.kicker).toUpperCase(), hb, 40, W) : null;
          if (pl) put(pl.g, cxh, 262, 0, 1, 1, 1);
          // valeur : lignes équilibrées dans la demi-largeur
          const str = String(it.value || '').replace(/(\d) (?=[\d€%¢A-Z])/g, '$1' + NB).replace(/([−+×=]) (?=\S)/g, '$1' + NB);
          const wf = (s, S) => W(s, S, { sp: SPN });
          let S = 200, rows = null;
          for (; S > 50; S *= 0.96) { rows = breaks(str, S, 780, wf, 2); if (rows && (rows.length - 1) * 1.02 * S + 0.74 * S <= 400) break; rows = null; }
          if (!rows) { S = 50; rows = [str]; }
          const vg = g(gh);
          const h = (rows.length - 1) * 1.02 * S + 0.74 * S;
          rows.forEach((r, k) => {
            const rw = wf(r, S);
            text(vg, r.replace(/ /g, NB), -rw / 2, -h / 2 + 0.74 * S + k * 1.02 * S, S, colOf(it.color, C.ink), { spacing: f2(SPN * S) });
          });
          return { g: gh, vg, cx: cxh, cy: 560, i, t: cue(it.cue || (i ? 'right' : 'left'), i * 1.9), pl };
        });
        const dv = g(root); rect(dv, 953, 0, 14, 1080, 0, C.ink); st.divider = dv;
        return st;
      }

      st.bd = backdrop(root, bgk, uid, {});
      // kicker
      const kick = P.kicker ? pill(root, String(P.kicker).toUpperCase(), bgk, 42, W) : null;
      st.kick = kick;
      st.tKick = (mode === 'type' && ZV.cue(shot, 'label') !== null && !P.label) ? ZV.cue(shot, 'label') : 0.05;
      // étiquette
      if (P.label) {
        const str = String(P.label).toUpperCase(), size = 58, w = W(str, size, { sp: 0.02 }) + 70, h = size * 1.7;
        const gr = g(root);
        const lf = bgk === 'paper' ? C.ink : C.paper, lt = bgk === 'paper' ? C.paper : C.ink;
        rect(gr, -w / 2 + 10, -h / 2 + 10, w, h, 16, C.ink);
        rect(gr, -w / 2, -h / 2, w, h, 16, lf, C.ink, 6);
        text(gr, str, 0, size * 0.35, size, lt, { anchor: 'middle', spacing: f2(0.02 * size) });
        st.label = { g: gr, x: 960, y: 786, auto: true };
      }

      if (mode === 'count') {
        const from = typeof P.from === 'number' ? P.from : 0, to = typeof P.to === 'number' ? P.to : 0, dec = P.decimals || 0;
        st.from = from; st.to = to; st.dec = dec;
        const pre = P.prefix ? String(P.prefix).trim() : '', suf = P.suffix ? String(P.suffix).trim() : '';
        const finalS = fnum(to, dec);
        const lens = Math.max(fnum(from, dec).length, finalS.length);
        // largeur de cellule : chiffres tabulaires
        const wd = (S) => Math.max(...'0123456789'.split('').map((d) => W(d, S, { sp: SPN })));
        const cw = (ch, S) => (/\d/.test(ch) ? wd(S) : ch === ' ' ? 0.22 * S : W(ch, S, { sp: SPN }));
        const wnum = (s, S) => { let a = 0; for (const ch of s) a += cw(ch, S); return a; };
        const preW = (S) => (pre ? (pre === '≈' ? 0.82 * S : W(pre, S, { sp: SPN })) + 0.22 * S : 0);
        const sufW = (S) => (suf ? W(suf, S, { sp: SPN }) + 0.24 * S : 0);
        const maxNum = (S) => Math.max(wnum(fnum(from, dec), S), wnum(finalS, S));
        let S = 360;
        while (S > 80 && preW(S) + maxNum(S) + sufW(S) > 1640) S *= 0.97;
        st.S = S; st.cw = (ch) => cw(ch, S); st.preW = preW(S); st.sufW = sufW(S); st.pre = pre; st.suf = suf;
        st.maxNumW = maxNum(S);
        const totalFinal = preW(S) + wnum(finalS, S) + sufW(S);
        st.xr = 960 + totalFinal / 2 - sufW(S);        // bord droit du nombre (fixe)
        st.xc = 960 + (totalFinal - 0) / 2;
        st.gy = 520; st.by = 0.36 * S;
        // plaque (surlignage) derrière le nombre, dans le groupe animé
        const gn = g(root);
        const pw = totalFinal + 90;
        st.plate = g(gn);
        rect(st.plate, -pw / 2 + 12, -0.46 * S + 12 - 0.0, pw, 1.1 * S, 22, C.ink);
        rect(st.plate, -pw / 2, -0.46 * S, pw, 1.1 * S, 22, st.plateFill, C.ink, 8);
        st.plateW = pw;
        st.underline = rect(gn, -totalFinal / 2, 0.66 * S, totalFinal, 0.1 * S, 6, fg === C.red ? C.red : C.lime);
        st.gn = gn;
        st.chars = [];
        for (let i = 0; i < lens; i++) st.chars.push(text(gn, '', 0, st.by, S, fg, { anchor: 'middle', spacing: f2(SPN * S) }));
        st.preNode = null;
        if (pre === '≈') { st.preNode = path(gn, '', 'none', fg, 0.075 * S); }
        else if (pre) st.preNode = text(gn, pre, 0, st.by, S, fg, { spacing: f2(SPN * S) });
        st.sufNode = suf ? text(gn, suf, 0, st.by, S, fg, { spacing: f2(SPN * S) }) : null;
        st.totalFinal = totalFinal;
        st.go = cue('go', 0); st.land = ZV.cue(shot, 'land'); const lb = ZV.cue(shot, 'label');
        st.end = st.land !== null ? st.land : lb !== null ? lb : Math.min(shot.dur - 0.3, st.go + 1.2);
        if (st.end <= st.go + 0.2) st.end = st.go + 0.6;
        st.jit = !!(shot.beats.find((b) => b.do === 'cue' && b.name === 'go' && b.jitter));
        st.tLabel = lb !== null ? lb : st.end + 0.15;
        st.hl = fg !== C.red;
        if (st.label) st.label.y = Math.min(808, 520 + 0.64 * S + 115);
        return st;
      }

      if (mode === 'type') {
        const str = String(P.text || '').toUpperCase();
        const wf = (s, S) => W(s, S, { sp: SPN });
        let S = 300, rows = null;
        for (; S > 60; S *= 0.96) { rows = breaks(str.replace(/(\d) (?=\d)/g, '$1' + NB), S, 1600, wf, 2); if (rows && (rows.length - 1) * 1.04 * S + 0.74 * S <= 420) break; rows = null; }
        if (!rows) { S = 60; rows = [str]; }
        st.S = S;
        const h = (rows.length - 1) * 1.04 * S + 0.74 * S, top = 520 - h / 2;
        const gt = g(root); st.gt = gt;
        st.chars = [];
        let idx = 0, seenSur = false;
        rows.forEach((r, k) => {
          const rw = wf(r, S), x0 = 960 - rw / 2, by = top + 0.74 * S + k * 1.04 * S;
          let acc = '';
          for (const ch of r) {
            // le nombre final (après « SUR ») en lime
            const isNum = seenSur && /[\d  ]/.test(ch);
            const nd = text(gt, ch === ' ' ? NB : ch, x0 + wf(acc, S), by, S, isNum && !dark ? (bgk === 'lime' ? C.ink : C.ink) : isNum ? C.lime : fg, { spacing: f2(SPN * S) });
            if (isNum && !dark) nd.setAttribute('fill', bgk === 'paper' ? C.ink : C.ink);
            st.chars.push({ n: nd, x: x0 + wf(acc, S), w: wf(ch, S), y: by });
            acc += ch;
            idx++;
          }
          if (/SUR\s*$/.test(r.replace(/ /g, ' '))) seenSur = true;
          else if (/(^|\s)SUR(\s|$)/.test(r.replace(/ /g, ' ')) ) seenSur = true;
        });
        // recoloration fiable : tout après le mot SUR
        const full = rows.join(' ').replace(/ /g, ' ');
        const cut = full.indexOf(' SUR ');
        const flat = rows.join('');
        st.chars.forEach((c, i) => { /* indices alignés sur rows.join('') */ });
        let pos = 0;
        const flatStr = rows.join('');
        const surAt = flatStr.replace(/ /g, ' ').indexOf('SUR');
        st.chars.forEach((c, i) => { c.n.setAttribute('fill', surAt >= 0 && i >= surAt + 3 ? (dark ? C.lime : C.ink) : fg); });
        st.cursor = rect(gt, 0, 0, S * 0.36, S * 0.78, 0, dark ? C.lime : C.ink);
        st.n = st.chars.length;
        st.tGo = cue('go', 0);
        st.hlPlate = null;
        return st;
      }

      // ---- equation ----
      const toks = (P.tokens || []).map((tk, i) => ({ text: String(tk.text || '').toUpperCase(), cue: tk.cue || ('t' + (i + 1)), color: tk.color, i }));
      const wf = (s, S) => W(s, S, { sp: SPN });
      let S = 190;
      const strs = toks.map((tk) => tk.text.replace(/(\d) (?=\d)/g, '$1' + NB));
      for (; S > 60; S *= 0.96) { const mw = Math.max(...strs.map((s) => wf(s, S))); if (mw <= 1500 && toks.length * 1.18 * S <= 620) break; }
      const mw = Math.max(...strs.map((s) => wf(s, S)));
      const x0 = 960 - mw / 2, pitch = 1.2 * S;
      const top = 500 - (toks.length * pitch) / 2 + 0.1 * S;
      st.S = S; st.toks = toks.map((tk, i) => {
        const gr = g(root), by = top + i * pitch + 0.8 * S;
        const last = i === toks.length - 1 && toks.length > 1;
        const w = wf(strs[i], S);
        if (last) { rect(gr, x0 - 24 + 12, -0.92 * S + 12, mw + 48, 1.26 * S, 20, C.ink); rect(gr, x0 - 24, -0.92 * S, mw + 48, 1.26 * S, 20, st.plateFill, C.ink, 8); }
        const op = /^[×=+−]/.test(strs[i]) ? strs[i][0] : null;
        if (op) {
          const ow = wf(op + NB, S);
          text(gr, op, x0, 0, S, last ? st.plateText : C.red, { spacing: f2(SPN * S) });
          text(gr, strs[i].slice(2).replace(/ /g, NB), x0 + ow, 0, S, last ? st.plateText : colOf(tk.color, fg), { spacing: f2(SPN * S) });
        } else text(gr, strs[i].replace(/ /g, NB), x0, 0, S, last ? st.plateText : colOf(tk.color, fg), { spacing: f2(SPN * S) });
        if (last) rect(gr, x0 - 24, -1.04 * S, mw + 48, 10, 4, fg);   // trait de somme
        return { g: gr, y: by, t: cue(tk.cue, i * 0.9), last };
      });
      return st;
    },

    draw(st, t, shot) {
      drift(st.bd, t);
      const { mode } = st;
      const popK = () => { if (st.kick) { const p = ZV.E.back(clamp((t - st.tKick) / (8 * FR))); put(st.kick.g, 960, 212, 0, p, p, t >= st.tKick ? 1 : 0); } };
      const popL = (tl) => { if (st.label) { const p = ZV.E.back(clamp((t - tl) / (8 * FR))); put(st.label.g, st.label.x, st.label.y, -2 + (1 - p) * -6, p, p, t >= tl ? 1 : 0); } };

      if (mode === 'split') {
        for (const h of st.halves) {
          const tt = t - h.t, p = ZV.E.out3(clamp(tt / (6 * FR)));
          const off = (1 - p) * (h.i ? 960 : -960);
          h.g.setAttribute('transform', `translate(${f2(off)} 0)`);
          h.g.setAttribute('visibility', tt >= 0 ? 'visible' : 'hidden');
          const q = clamp((tt - 5 * FR) / (4 * FR)), s = lerp(1.35, 1, ZV.E.out3(q));
          const [sx, sy] = ZV.shakeAt(tt, 9 * FR, 10, 0.4);
          put(h.vg, h.cx + sx, h.cy + sy, 0, s, s, tt >= 5 * FR ? 1 : 0);
        }
        const r = st.halves[1];
        st.divider.setAttribute('visibility', r && t >= r.t ? 'visible' : 'hidden');
        return;
      }
      popK();

      if (mode === 'count') {
        const S = st.S, { go, end } = st;
        let v;
        if (t <= go) v = st.from;
        else if (t >= end) v = st.to;
        else {
          const p = (t - go) / (end - go);
          if (st.jit) {
            const base = lerp(st.from, st.to, ZV.E.out2(p));
            const amp = (st.from - st.to) * 1.6 * Math.pow(1 - p, 1.4);
            v = base + amp * 0.5 * (Math.sin(t * 31) * 0.6 + Math.sin(t * 17 + 1.3) * 0.4);
          } else v = lerp(st.from, st.to, Math.pow(p, 2.1));
        }
        const cs = fnum(v, st.dec);
        // nombre centré, chiffres tabulaires (cellules de largeur fixe)
        let numW = 0; for (const ch of cs) numW += st.cw(ch);
        const hasPre = !!st.pre, total = (hasPre ? st.preW : 0) + numW + st.sufW;
        let xx = -total / 2;
        if (st.preNode) {
          if (st.pre === '≈') {
            const w = 0.7 * S, x1 = xx, yy = st.by - 0.34 * S;
            st.preNode.setAttribute('d', `M${f2(x1)} ${f2(yy - 0.11 * S)}q${f2(w * 0.25)} ${f2(-0.12 * S)} ${f2(w * 0.5)} 0t${f2(w * 0.5)} 0M${f2(x1)} ${f2(yy + 0.11 * S)}q${f2(w * 0.25)} ${f2(-0.12 * S)} ${f2(w * 0.5)} 0t${f2(w * 0.5)} 0`);
          } else st.preNode.setAttribute('x', f2(xx));
          xx += st.preW;
        }
        for (let i = 0; i < st.chars.length; i++) {
          const nd = st.chars[i], ch = cs[i];
          if (ch === undefined) { nd.setAttribute('visibility', 'hidden'); nd.setAttribute('x', 0); nd.textContent = ''; continue; }
          const w = st.cw(ch);
          nd.setAttribute('visibility', 'visible');
          nd.textContent = ch;
          nd.setAttribute('x', f2(xx + w / 2));
          xx += w;
        }
        if (st.sufNode) st.sufNode.setAttribute('x', f2(xx + 0.24 * S));
        // arrivée : claque + surlignage
        const land = st.end, tl = t - land;
        let s = 1, sx = 0, sy = 0;
        if (tl >= 0) { s = lerp(1.08, 1, ZV.E.out3(clamp(tl / (6 * FR)))); const sh = ZV.shakeAt(tl, 0, 8, 0.4); sx = sh[0]; sy = sh[1]; }
        else if (t > go && t < end) { s = 1 + 0.0; }
        const on = tl >= 0 && st.hl;
        const pq = ZV.E.out3(clamp(tl / (5 * FR)));
        put(st.plate, 0, 0, 0, on ? pq : 0, 1, on ? 1 : 0);
        const col = on ? st.plateText : st.fg;
        for (const nd of st.chars) nd.setAttribute('fill', col);
        if (st.preNode) { st.preNode.setAttribute(st.pre === '≈' ? 'stroke' : 'fill', col); }
        if (st.sufNode) st.sufNode.setAttribute('fill', col);
        const uq = st.hl ? 0 : ZV.E.out3(clamp(tl / (6 * FR)));
        st.underline.setAttribute('width', f2(st.totalFinal * uq)); st.underline.setAttribute('visibility', uq > 0 ? 'visible' : 'hidden');
        put(st.gn, 960 + sx, st.gy + sy, 0, s, s, 1);
        popL(st.tLabel);
        return;
      }

      if (mode === 'type') {
        const S = st.S, tg = st.tGo;
        const natural = st.n * 2 * FR, tdur = Math.max(0.5, Math.min(natural, shot.dur - tg - 0.5));
        const q = t < tg ? 0 : clamp((t - tg) / tdur);
        const k = Math.floor(q * st.n + 1e-6);
        st.chars.forEach((c, i) => c.n.setAttribute('visibility', i < k ? 'visible' : 'hidden'));
        const cur = k > 0 ? st.chars[k - 1] : null;
        const nxt = k < st.n ? st.chars[k] : null;
        let cx, cy;
        if (nxt && (!cur || Math.abs(nxt.y - cur.y) < 1)) { cx = nxt.x; cy = nxt.y; }
        else if (nxt) { cx = nxt.x; cy = nxt.y; }
        else { cx = cur.x + cur.w; cy = cur.y; }
        const blink = q < 1 || Math.floor((t - tg - tdur) / 0.3) % 2 === 0;
        st.cursor.setAttribute('visibility', blink ? 'visible' : 'hidden');
        st.cursor.setAttribute('x', f2(cx + S * 0.03)); st.cursor.setAttribute('y', f2(cy - S * 0.76));
        // petit claquement à la fin de la frappe
        const te = tg + tdur, tl = t - te;
        let s = 1, sx = 0, sy = 0;
        if (tl >= 0 && tl < 0.4) { s = lerp(1.05, 1, ZV.E.out3(clamp(tl / (6 * FR)))); const sh = ZV.shakeAt(tl, 0, 6, 0.3); sx = sh[0]; sy = sh[1]; }
        put(st.gt, 960 + sx - 960 * s + 960 * (s - 1) * 0, 0, 0, 1, 1, 1);
        st.gt.setAttribute('transform', `translate(${f2(960 + sx)} ${f2(540 + sy)}) scale(${f2(s)}) translate(-960 -540)`);
        popL(ZV.cue(shot, 'label') !== null && st.label ? ZV.cue(shot, 'label') : te + 0.15);
        return;
      }

      // equation : le bloc visible reste centré (il remonte à chaque nouvelle ligne)
      let kEff = 0; for (const tk of st.toks) kEff += ZV.E.out3(clamp((t - tk.t) / 0.4));
      const sh0 = (st.toks.length - kEff) * 1.2 * st.S / 2;
      for (const tk of st.toks) {
        const tt = t - tk.t;
        if (tt < 0) { put(tk.g, 0, tk.y, 0, 1, 1, 0); continue; }
        const p = clamp(tt / 0.45), dy = (1 - ZV.E.bounce(p)) * (tk.y + 160) - sh0;
        let sx = 0, sy = 0; if (tk.last) { const sh = ZV.shakeAt(tt, 0.3, 8, 0.4); sx = sh[0]; sy = sh[1]; }
        put(tk.g, sx, tk.y - dy + sy, 0, 1, 1, 1);
      }
      popL(st.toks.length ? st.toks[st.toks.length - 1].t + 0.5 : 0);
    }
  });
  // largeur d'un préfixe texte (hors ≈)
  function W_(st, s) { return st.W(s, st.S, { sp: SPN }); }
})();
;
/* ==== tools/video/composition/components/bilan-scale.js ==== */
// Composant `bilan-scale` (épisode 3) : le bilan de la martingale. Une balance : à gauche ≈ 800 petites victoires (≈ 8 000 €), à droite 1 catastrophe (−10 230 €).
// Fonction pure du temps ; aplats, bras ink, plateaux paper, aucun dégradé / flou / filter. Voir EP3-COMPONENTS.md.
// Cues : wins, crash, net, odds.
(() => {
  'use strict';
  const { C, E, clamp, prog, lerp, f2, sv, g, rect, circle, path, line, text, put, fr, shakeAt } = ZV;
  let UID = 0;
  const NB = ' ';
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const num = (v, d) => (v != null && v !== '' && isFinite(+v) ? +v : d);
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const bw = (s, size) => { let a = 0; for (const ch of String(s)) a += size * (ch === ' ' || ch === ' ' ? 0.26 : /[0-9]/.test(ch) ? 0.6 : /[A-ZÀÂÉÈÊÎÔÛÇ€%+×≈−]/.test(ch) ? 0.66 : /[.,:;'’!|]/.test(ch) ? 0.3 : 0.56); return a; };
  const mw = (s, size) => String(s).length * size * 0.6;
  const PX = 960, PY = 465, L = 560, SL = 170, TH = 36;                          // pivot, demi-bras, longueur des suspentes, épaisseur de plateau
  const GRID_W = 512, FILL_D = 2.6, FALL_D = 0.5;

  ZV.define('bilan-scale', {
    init(root, shot) {
      const P = shot.props || {};
      const beats = Array.isArray(shot.beats) ? shot.beats : [];
      const dur = isNum(shot.dur) && shot.dur > 0 ? shot.dur : 8;
      const cue = (n) => { const b = beats.filter((x) => x && x.do === 'cue' && x.name === n && isNum(x.t)).map((x) => x.t).sort((a, b2) => a - b2); return b.length ? b[0] : null; };
      const wins = clamp(Math.round(num(P.wins, 800)), 10, 2000);
      const winAmt = typeof P.win_amount === 'string' ? P.win_amount : '8 000 €';
      const lossAmt = typeof P.loss_amount === 'string' ? P.loss_amount : '−10 230 €';
      const netAmt = typeof P.net === 'string' ? P.net : '−2 230 €';
      const unit = winAmt.replace(/[\d\s  ≈,.\-−+]/g, '') || '€';
      const winVal = +(winAmt.replace(/[^\d]/g, '')) || 8000;
      const uid = 'bs' + (++UID);
      const st = { dur, wins, winVal, unit };
      st.c = { wins: cue('wins'), crash: cue('crash'), net: cue('net'), odds: cue('odds') };
      if (Object.values(st.c).every((x) => x == null)) st.c = { odds: 0.3, wins: 1.0, crash: 4.2, net: 5.8 };

      /* fond paper rayé */
      rect(root, 0, 0, 1920, 1080, 0, C.paper);
      const bgs = g(root, { transform: 'rotate(-18 960 540)' });
      for (let k = -4; k <= 4; k++) rect(bgs, 960 + k * 300 - 70, -600, 140, 2300, 0, '#E9E5D9');
      st.world = g(root);
      const W = st.world;

      /* pied de la balance */
      path(W, `M${PX - 34} ${PY} L${PX + 34} ${PY} L${PX + 110} 800 L${PX - 110} 800Z`, C.ink, C.ink, 6);
      rect(W, PX - 160, 796, 320, 30, 6, C.ink, C.ink, 6);

      /* plateau gauche : cageot de 800 petits carrés lime */
      st.pl = g(W);
      const mkTray = (grp, w) => {
        line(grp, 0, 0, -(w / 2 - 22), SL, C.ink, 6, { 'stroke-linecap': 'butt' });
        line(grp, 0, 0, (w / 2 - 22), SL, C.ink, 6, { 'stroke-linecap': 'butt' });
        circle(grp, 0, 0, 12, C.paper, C.ink, 6);
      };
      const wL = 580, wR = 480;
      mkTray(st.pl, wL);
      rect(st.pl, -wL / 2 + 9, SL + 9, wL, TH, 8, C.ink);
      rect(st.pl, -wL / 2, SL, wL, TH, 8, C.paper, C.ink, 7);
      const rows = clamp(Math.ceil(wins / 80), 1, 14), cols = Math.ceil(wins / rows);
      const pitch = Math.min(12, GRID_W / cols), gw = cols * pitch, gh = rows * pitch;
      const cH = gh + 20, cW = gw + 20;
      st.gx = -gw / 2; st.gy = SL - cH + 10;
      rect(st.pl, -cW / 2, SL - cH, cW, cH + 2, 4, C.ink, C.ink, 5);
      const defs = sv('defs', null, root);
      const sq = pitch * 0.74;
      const mkPat = (id, fill) => {
        const pt = sv('pattern', { id: uid + id, x: st.gx, y: st.gy, width: pitch, height: pitch, patternUnits: 'userSpaceOnUse' }, defs);
        sv('rect', { x: (pitch - sq) / 2, y: (pitch - sq) / 2, width: sq, height: sq, fill }, pt);
      };
      mkPat('e', '#3a3a3a'); mkPat('l', C.lime);
      rect(st.pl, st.gx, st.gy, gw, gh, 0, `url(#${uid}e)`);
      st.fillA = rect(st.pl, st.gx, st.gy, 0.01, gh, 0, `url(#${uid}l)`);
      st.fillB = rect(st.pl, st.gx, st.gy, pitch, 0.01, 0, `url(#${uid}l)`);
      st.pitch = pitch; st.rows = rows; st.gh = gh;

      /* plateau droit : plateau + bloc rouge (la catastrophe) */
      st.pr = g(W);
      mkTray(st.pr, wR);
      rect(st.pr, -wR / 2 + 9, SL + 9, wR, TH, 8, C.ink);
      rect(st.pr, -wR / 2, SL, wR, TH, 8, C.paper, C.ink, 7);
      st.blk = g(st.pr);
      {
        const bwid = 400, bh = 140, lab = lossAmt;
        rect(st.blk, -bwid / 2 + 10, -bh + 10, bwid, bh, 8, C.ink);
        rect(st.blk, -bwid / 2, -bh, bwid, bh, 8, C.red, C.ink, 8);
        const size = 66;
        text(st.blk, lab, 0, -bh / 2 + size * 0.35, size, C.ink, { anchor: 'middle', len: f2(Math.min(bw(lab, size), bwid - 50)) });
        rect(st.blk, -bwid / 2 + 14, -bh + 14, bwid - 28, 8, 0, C.ink);
      }
      st.blk.setAttribute('visibility', 'hidden');

      /* bras et pivot */
      st.beam = g(W);
      rect(st.beam, -L - 30 + 8, -13 + 8, 2 * L + 60, 26, 13, '#8f8c82');
      rect(st.beam, -L - 30, -13, 2 * L + 60, 26, 13, C.ink, C.ink, 6);
      circle(st.beam, -L, 0, 15, C.paper, C.ink, 6);
      circle(st.beam, L, 0, 15, C.paper, C.ink, 6);
      circle(W, PX, PY, 30, C.lime, C.ink, 8);

      /* intitulés fixes */
      {
        const t1 = `≈ ${wins} PETITES VICTOIRES`;
        st.h1 = text(W, t1, 70, 192, 48, C.ink, { anchor: 'start', len: f2(Math.min(bw(t1, 48), 760)) });
        rect(W, 70, 206, Math.min(bw(t1, 48), 760), 10, 0, C.ink);
        const t2 = '1 CATASTROPHE';
        text(W, t2, 1850, 192, 64, C.ink, { anchor: 'end', len: f2(bw(t2, 64)) });
        rect(W, 1850 - bw(t2, 64), 206, bw(t2, 64), 10, 0, C.red);
      }
      /* compteur gauche */
      st.cnt = g(W);
      {
        const w = 540, h = 96;
        rect(st.cnt, 70 + 10, 240 + 10, w, h, 14, C.ink);
        rect(st.cnt, 70, 240, w, h, 14, C.ink, C.ink, 6);
        rect(st.cnt, 70 + 5, 240 + 5, w - 10, h - 10, 10, 'none', C.lime, 5);
        st.cntT = text(st.cnt, '', 70 + w / 2, 240 + 66, 62, C.lime, { mono: true, anchor: 'middle' });
      }
      /* odds (en haut) */
      st.odds = g(W);
      {
        const lab = '≈ 1 CHANCE SUR ' + wins, w = 560, h = 78, size = 44;
        rect(st.odds, -w / 2 + 10, -h / 2 + 10, w, h, 14, C.ink);
        rect(st.odds, -w / 2, -h / 2, w, h, 14, C.lime, C.ink, 6);
        text(st.odds, lab, 0, size * 0.35, size, C.ink, { anchor: 'middle', len: f2(Math.min(bw(lab, size), w - 50)) });
      }
      /* tampon du bilan + sticker */
      st.stamp = g(W);
      {
        const size = 82, w = Math.min(bw(netAmt, size), 400) + 64, h = 118;
        rect(st.stamp, -w / 2 + 10, -h / 2 + 10, w, h, 14, C.ink);
        rect(st.stamp, -w / 2, -h / 2, w, h, 14, C.ink, C.red, 12);
        text(st.stamp, netAmt, 0, size * 0.35, size, C.red, { anchor: 'middle', len: f2(Math.min(bw(netAmt, size), 400)) });
      }
      st.stk = g(W);
      {
        const l1 = 'PLUS DE 2 000 €', l2 = 'DE PERTE', w = 400, h = 120;
        rect(st.stk, -w / 2 + 10, -h / 2 + 10, w, h, 14, C.ink);
        rect(st.stk, -w / 2, -h / 2, w, h, 14, C.lime, C.ink, 6);
        text(st.stk, l1, 0, -4, 46, C.ink, { anchor: 'middle', len: f2(Math.min(bw(l1, 46), w - 40)) });
        text(st.stk, l2, 0, 40, 46, C.ink, { anchor: 'middle', len: f2(Math.min(bw(l2, 46), w - 40)) });
      }
      return st;
    },

    update(st, t) {
      try {
        t = clamp(t, 0, st.dur + 1);
        const { c } = st;
        const ph = (t0, d) => (t0 == null ? 0 : prog(t, t0, t0 + d));

        /* remplissage de la grille (en accélérant) */
        const fp = c.wins != null ? Math.pow(ph(c.wins, FILL_D), 1.8) : 0;
        const K = Math.round(st.wins * fp);
        const cFull = Math.floor(K / st.rows), rPart = K - cFull * st.rows;
        setA(st.fillA, 'width', f2(Math.max(0.01, cFull * st.pitch)));
        setA(st.fillB, 'x', f2(st.gx + cFull * st.pitch));
        setA(st.fillB, 'height', f2(Math.max(0.01, rPart * st.pitch)));

        /* compteur « ≈ 8 000 € » */
        {
          const v = Math.round(st.winVal * (K / st.wins));
          const s = '≈' + NB + fr(v) + NB + st.unit;
          if (st.cntT.__s !== s) { st.cntT.__s = s; st.cntT.textContent = s; st.cntT.setAttribute('textLength', f2(mw(s, 62))); }
          const on = c.wins != null && t >= c.wins;
          const p = on ? E.back(prog(t, c.wins, c.wins + 0.3)) : 0;
          st.cnt.setAttribute('visibility', on ? 'visible' : 'hidden');
          st.cnt.setAttribute('transform', `translate(340 288) scale(${f2(Math.max(p, 0.01))}) translate(-340 -288)`);
        }

        /* chute du bloc rouge puis ressort de la balance */
        const tc = c.crash;
        const tImp = tc != null ? tc + FALL_D : null;
        const fall = tc != null ? E.in2(ph(tc, FALL_D)) : 0;
        const s = tImp != null ? Math.max(0, t - tImp) : 0;
        const r = tImp != null && t >= tImp ? 1 - Math.exp(-5 * s) * Math.cos(8 * s) : 0;
        let th = -8 * E.io2(fp) + 18 * r;
        th = clamp(th, -8, 13.5);
        const cs = Math.cos(th * ZV.D2R), sn = Math.sin(th * ZV.D2R);
        const exL = PX - L * cs, eyL = PY - L * sn, exR = PX + L * cs, eyR = PY + L * sn;
        const sk = tImp != null ? shakeAt(t, tImp, 12, 0.4) : [0, 0];
        setA(st.world, 'transform', `translate(${f2(sk[0])} ${f2(sk[1])})`);
        setA(st.beam, 'transform', `translate(${PX} ${PY}) rotate(${f2(th)})`);
        setA(st.pl, 'transform', `translate(${f2(exL)} ${f2(eyL)})`);
        setA(st.pr, 'transform', `translate(${f2(exR)} ${f2(eyR)})`);
        const bOn = tc != null && t >= tc;
        setA(st.blk, 'visibility', bOn ? 'visible' : 'hidden');
        setA(st.blk, 'transform', `translate(0 ${f2(SL - (1 - fall) * 700)})`);

        /* odds */
        {
          const to = c.odds, on = to != null && t >= to, p = on ? E.back(prog(t, to, to + 0.3)) : 0;
          put(st.odds, 960, 72, -1.5, Math.max(p, 0), Math.max(p, 0), on ? 1 : 0);
        }
        /* tampon + sticker */
        {
          const tn = c.net;
          if (tn == null || t < tn) put(st.stamp, 960, 615, -8, 0, 0, 0);
          else {
            const q = prog(t, tn, tn + 0.22), sc = lerp(2.6, 1, E.out3(q));
            const sh = shakeAt(t, tn + 0.2, 10, 0.3);
            put(st.stamp, 960 + sh[0], 615 + sh[1], -8, Math.max(sc, 0.01), Math.max(sc, 0.01), Math.min(1, q * 4));
          }
          const ts = tn != null ? tn + 0.55 : null, on = ts != null && t >= ts, p = on ? E.back(prog(t, ts, ts + 0.28)) : 0;
          put(st.stk, 960, 768, 2.5, Math.max(p, 0), Math.max(p, 0), on ? 1 : 0);
        }
      } catch (e) { /* jamais d'exception */ }
    }
  });
})();
;
/* ==== tools/video/composition/components/bit-overflow.js ==== */
// Composant « bit-overflow » (épisode 2) : le compteur 32 bits qui déborde, 2³² centimes = 42 949 672,96 $ contre 42 949 672,76 $ affichés. Voir EP2-COMPONENTS.md.
// Fonction pure du temps du plan ; aplats seulement.
(() => {
  const { C, E, clamp, prog, lerp, f2, put, g, rect, text, sv } = ZV;
  const str = (v, d) => (v != null && v !== '' ? String(v) : d);
  const bw = (s, size) => { let a = 0; for (const ch of String(s)) a += size * (ch === ' ' ? 0.26 : /[0-9]/.test(ch) ? 0.6 : /[A-ZÀÂÉÈÊÎÔÛÇ]/.test(ch) ? 0.66 : /[.,:;'’!|]/.test(ch) ? 0.3 : 0.56); return a; };
  const MAXV = 4294967295;
  const CELL = 88, GAP = 12, BX = 140, BY = 60, BW = 1640, BH = 250;
  const SA = 118, SB = 108;                        // tailles Mono des lignes A (compteur / gros nombre) et B, C (dollars)
  const YA = 470, YB = 640, YC = 800;              // lignes de base

  function monoRow(parent, size, fill) {           // texte Mono centré dont la largeur suit le nombre de caractères
    const n = text(parent, '', 960, 0, size, fill, { mono: true, anchor: 'middle' });
    n.setAttribute('textLength', 1); n.setAttribute('lengthAdjust', 'spacingAndGlyphs');
    return n;
  }
  function setRow(n, s, size, y) {
    n.textContent = s; n.setAttribute('y', f2(y)); n.setAttribute('textLength', f2(Math.max(1, s.length * size * 0.6)));
  }

  ZV.define('bit-overflow', {
    init(root, shot) {
      const P = shot.props || {};
      const st = { dur: Math.max(0.1, shot.dur || 1) };
      st.big = str(P.big, '4 294 967 296'); st.dollars = str(P.dollars, '42 949 672,96 $'); st.shown = str(P.shown, '42 949 672,76 $'); st.gap = str(P.gap, '20 ¢');
      const cu = (n) => ZV.cue(shot, n);
      st.cFill = cu('fill'); st.cFull = cu('full'); st.cWrap = cu('wrap'); st.cConv = cu('convert'); st.cComp = cu('compare');
      if ([st.cFill, st.cFull, st.cWrap, st.cConv, st.cComp].every((x) => x === null)) { st.cFill = 0.3; st.cFull = 3.8; }
      if (st.cFill === null) st.cFill = Math.max(0, (st.cFull !== null ? st.cFull : 3.5) - 3.5);
      st.fillEnd = st.cFull !== null ? Math.max(st.cFill + 0.4, st.cFull) : st.cFill + 3.5;
      const bits = Math.max(1, Math.min(32, P.bits | 0 || 32));
      st.bits = bits;

      rect(root, 0, 0, 1920, 1080, 0, C.pocket);
      st.board = g(root);
      rect(st.board, BX + 12, BY + 12, BW, BH, 22, C.ink);
      st.frame = rect(st.board, BX, BY, BW, BH, 22, C.ink, C.paper, 8);
      st.cells = [];
      const x0 = BX + (BW - (16 * CELL + 15 * GAP)) / 2;
      for (let i = 0; i < 32; i++) {
        const row = Math.floor(i / 16), col = i % 16, x = x0 + col * (CELL + GAP), y = BY + 26 + row * (84 + 14);
        const r = rect(st.board, x, y, CELL, 84, 10, C.pocket, '#3A3A3A', 4);
        const tx = text(st.board, '0', x + CELL / 2, y + 60, 54, '#5A5A5A', { mono: true, anchor: 'middle' });
        st.cells.push({ r, tx, bit: 31 - i });     // bit de poids fort à gauche
      }
      st.rowA = monoRow(root, SA, C.paper);
      st.sticker = g(root);
      {
        const lab = '2³² − 1', size = 150, w = bw(lab, size) + 100, h = size * 1.5;
        rect(st.sticker, -w / 2 + 14, -h / 2 + 14, w, h, 18, C.ink);
        rect(st.sticker, -w / 2, -h / 2, w, h, 18, C.lime, C.ink, 8);
        text(st.sticker, lab, 0, size * 0.35, size, C.ink, { anchor: 'middle', len: f2(bw(lab, size)) });
      }
      st.stamp = g(root);
      {
        const lab = 'DÉBORDEMENT', size = 120, w = bw(lab, size) + 90, h = 190;
        rect(st.stamp, -w / 2, -h / 2, w, h, 12, C.ink, C.red, 14);
        rect(st.stamp, -w / 2 + 14, -h / 2 + 14, w - 28, h - 28, 6, 'none', C.red, 4);
        text(st.stamp, lab, 0, size * 0.35, size, C.red, { anchor: 'middle', len: f2(bw(lab, size)) });
      }
      st.divS = g(root);
      {
        const w = 330, h = 78;
        rect(st.divS, -w / 2 + 10, -h / 2 + 10, w, h, 16, C.ink);
        rect(st.divS, -w / 2, -h / 2, w, h, 16, C.red, C.ink, 6);
        text(st.divS, '÷ 100', 0, 26, 74, C.ink, { anchor: 'middle', len: f2(bw('÷ 100', 74)) });
      }
      // lignes B (dollars) et C (affiché), avec cellule surlignée sur les chiffres qui diffèrent
      const nB = st.dollars.length, nC = st.shown.length;
      st.cwB = SB * 0.6;
      st.xB = 960 - (nB * st.cwB) / 2; st.xC = 960 - (nC * st.cwB) / 2;
      st.hiB = []; st.hiC = [];
      for (let k = 1; k <= Math.min(nB, nC); k++) {
        const a = st.dollars[nB - k], b = st.shown[nC - k];
        if (a !== b && /\d/.test(a) && /\d/.test(b)) { st.hiB.push(nB - k); st.hiC.push(nC - k); }
      }
      st.hlB = st.hiB.map((i) => rect(root, st.xB + i * st.cwB, YB - SB * 0.82, st.cwB, SB * 1.0, 6, C.lime));
      st.hlC = st.hiC.map((i) => rect(root, st.xC + i * st.cwB, YC - SB * 0.82, st.cwB, SB * 1.0, 6, C.lime));
      st.chB = []; st.chC = [];
      for (let i = 0; i < nB; i++) st.chB.push(st.dollars[i] === ' ' ? null : text(root, st.dollars[i], f2(st.xB + i * st.cwB + st.cwB / 2), YB, SB, C.paper, { mono: true, anchor: 'middle', len: f2(st.cwB) }));
      for (let i = 0; i < nC; i++) st.chC.push(st.shown[i] === ' ' ? null : text(root, st.shown[i], f2(st.xC + i * st.cwB + st.cwB / 2), YC, SB, C.paper, { mono: true, anchor: 'middle', len: f2(st.cwB) }));
      st.lblC = text(root, 'SUR LA MACHINE', st.xC, YC - SB * 0.82 - 16, 28, '#B9B5A8', { mono: true, anchor: 'start', len: f2(14 * 28 * 0.6) });
      st.lblB = text(root, 'EN DOLLARS', st.xB, YB - SB * 0.82 - 16, 28, '#B9B5A8', { mono: true, anchor: 'start', len: f2(10 * 28 * 0.6) });
      st.gapS = g(root);
      {
        const size = 84, w = bw(st.gap, size) + 90, h = size * 1.45;
        rect(st.gapS, -w / 2 + 12, -h / 2 + 12, w, h, 18, C.ink);
        rect(st.gapS, -w / 2, -h / 2, w, h, 18, C.lime, C.ink, 7);
        text(st.gapS, st.gap, 0, size * 0.35, size, C.ink, { anchor: 'middle', len: f2(bw(st.gap, size)) });
      }
      st.flashR = rect(root, 0, 0, 1920, 1080, 0, C.red);
      return st;
    },

    update(st, t, shot) {
      try {
        t = clamp(t, 0, st.dur + 1);
        const wrapped = st.cWrap !== null && t >= st.cWrap;
        // ---- valeur du registre ----
        let v = 0;
        if (!wrapped && t >= st.cFill) { const tq = t >= st.fillEnd ? st.fillEnd : st.cFill + Math.floor((t - st.cFill) * 3) / 3; v = Math.floor(MAXV * Math.pow(clamp((tq - st.cFill) / (st.fillEnd - st.cFill)), 2.2)); }   // 3 pas/s : jamais plus de 3 changements/s
        const full = v >= MAXV;
        const sh = st.cFull !== null ? ZV.shakeAt(t, st.cFull, 9, 0.4) : [0, 0];
        st.board.setAttribute('transform', `translate(${f2(sh[0])} ${f2(sh[1])})`);
        const redBoard = wrapped && !(st.cConv !== null && t >= st.cConv);
        st.frame.setAttribute('stroke', redBoard ? C.red : C.paper);
        const flashW = wrapped && t < st.cWrap + 0.1;
        for (const c of st.cells) {
          const on = !wrapped && c.bit < st.bits && Math.floor(v / Math.pow(2, c.bit)) % 2 === 1;
          const fl = flashW && c.bit < st.bits;
          c.r.setAttribute('fill', fl ? C.red : on ? C.lime : C.pocket);
          c.r.setAttribute('stroke', fl ? C.ink : on ? C.ink : '#3A3A3A');
          c.tx.textContent = on || fl ? '1' : '0';
          c.tx.setAttribute('fill', fl ? C.ink : on ? C.ink : '#5A5A5A');
        }
        // ---- ligne A : compteur, puis 0, puis le gros nombre en centimes ----
        let a = ''; let ac = C.paper;
        const conv = st.cConv !== null && t >= st.cConv;
        if (conv) { a = st.big + ' ¢'; ac = C.paper; }
        else if (wrapped) { a = '0'; ac = C.red; }
        else { a = ZV.fr(v); ac = full ? C.lime : C.paper; }
        setRow(st.rowA, a, SA, YA);
        st.rowA.setAttribute('fill', ac);
        // ---- sticker 2³² − 1 / tampon DÉBORDEMENT ----
        {
          const tf = st.cFull;
          const on = tf !== null && t >= tf && !wrapped && !(st.cConv !== null && t >= st.cConv);
          const p = tf !== null ? E.back(prog(t, tf, tf + 0.22)) : 0, k = lerp(1.9, 1, E.out3(prog(t, tf !== null ? tf : 0, (tf !== null ? tf : 0) + 0.15)));
          put(st.sticker, 960, 610, -3, on ? Math.max(0.01, p * k) : 0, on ? Math.max(0.01, p * k) : 0, on ? 1 : 0);
          const tw = st.cWrap, off = conv;
          const on2 = tw !== null && t >= tw + 0.12 && !off;
          const p2 = tw !== null ? E.back(prog(t, tw + 0.12, tw + 0.34)) : 0;
          const s2 = tw !== null ? ZV.shakeAt(t, tw + 0.3, 10, 0.4) : [0, 0];
          put(st.stamp, 960 + s2[0], 610 + s2[1], -6, on2 ? Math.max(0.01, p2) : 0, on2 ? Math.max(0.01, p2) : 0, on2 ? 1 : 0);
          st.flashR.setAttribute('visibility', tw !== null && t >= tw && t < tw + 0.1 ? 'visible' : 'hidden');
        }
        // ---- conversion : ÷ 100 puis dollars ----
        {
          const tc = st.cConv;
          const on = tc !== null && t >= tc;
          const p = tc !== null ? E.back(prog(t, tc, tc + 0.25)) : 0;
          put(st.divS, 280, 590, -3, on ? Math.max(0.01, p) : 0, on ? Math.max(0.01, p) : 0, on ? 1 : 0);
          const t0 = tc !== null ? tc + 0.45 : 1e9;
          for (let i = 0; i < st.chB.length; i++) { const n = st.chB[i]; if (n) n.setAttribute('visibility', t >= t0 + i * 0.06 ? 'visible' : 'hidden'); }
          const doneB = t0 + st.chB.length * 0.06;
          const cmp = st.cComp !== null && t >= st.cComp;
          for (let i = 0; i < st.chB.length; i++) { const n = st.chB[i]; if (n) n.setAttribute('fill', cmp && st.hiB.indexOf(i) >= 0 ? C.ink : C.lime); }
          st.lblB.setAttribute('visibility', on ? 'visible' : 'hidden');
          st.hlB.forEach((r) => r.setAttribute('visibility', cmp ? 'visible' : 'hidden'));
          const sh2 = tc !== null ? ZV.shakeAt(t, doneB, 6, 0.3) : [0, 0];
          for (let i = 0; i < st.chB.length; i++) { const n = st.chB[i]; if (n) n.setAttribute('transform', t >= doneB ? `translate(${f2(sh2[0])} ${f2(sh2[1])})` : ''); }
        }
        // ---- comparaison : le montant de la machine, l'écart ----
        {
          const tp = st.cComp;
          const on = tp !== null && t >= tp;
          for (let i = 0; i < st.chC.length; i++) { const n = st.chC[i]; if (!n) continue; n.setAttribute('visibility', on && t >= tp + i * 0.05 ? 'visible' : 'hidden'); n.setAttribute('fill', st.hiC.indexOf(i) >= 0 ? C.ink : C.paper); }
          st.lblC.setAttribute('visibility', on ? 'visible' : 'hidden');
          const tg = tp !== null ? tp + st.chC.length * 0.05 + 0.1 : 1e9;
          st.hlC.forEach((r) => r.setAttribute('visibility', t >= tg ? 'visible' : 'hidden'));
          const pg = E.back(prog(t, tg, tg + 0.25)), sg = ZV.shakeAt(t, tg + 0.2, 8, 0.4);
          put(st.gapS, 1620 + sg[0], 745 + sg[1], 4, t >= tg ? Math.max(0.01, pg) : 0, t >= tg ? Math.max(0.01, pg) : 0, t >= tg ? 1 : 0);
        }
      } catch (e) { /* jamais d'exception */ }
    }
  });
})();
;
/* ==== tools/video/composition/components/calendar-26.js ==== */
// Composant `calendar-26` : le délai de 26 jours (S2 de l'épisode 3). Feuille « CONTRAT » (clause), grille de 26 cases-jours qui se barrent, pile de feuilles manuscrites qui monte.
// Cues : contract, grid, days, stack, done. Fond paper. Aucun dégradé, flou, lueur ni filter ; rien ne clignote (tout est monotone).
(() => {
  'use strict';
  const { C, E, clamp, prog, lerp, f2, sv, g, rect, circle, path, line, text, put, sticker, shakeAt } = ZV;
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  let UID = 0;

  // ajuste un texte à une largeur max (mesure réelle), sans jamais jeter
  function fit(n, maxW) {
    try { const w = n.getComputedTextLength(); if (w > maxW && w > 0) { n.setAttribute('textLength', f2(maxW)); n.setAttribute('lengthAdjust', 'spacingAndGlyphs'); } } catch (e) { /* hors DOM */ }
  }
  // gribouillis de manuscrit : `rows` lignes ondulées dans une boîte
  function scribble(r, x0, y0, w, rows, gap) {
    let d = '';
    for (let k = 0; k < rows; k++) {
      let x = x0, y = y0 + k * gap;
      const end = x0 + w * (k === rows - 1 ? 0.55 : 0.9 + r() * 0.1);
      d += `M${f2(x)} ${f2(y)}`;
      while (x < end) {
        const dx = 7 + r() * 11, up = (r() - 0.5) * 12;
        d += ` q${f2(dx * 0.5)} ${f2(-8 - r() * 5)} ${f2(dx)} ${f2(up * 0.2)}`;
        x += dx;
      }
    }
    return d;
  }

  ZV.define('calendar-26', {
    init(root, shot) {
      const p = (shot && shot.props) || {};
      const beats = Array.isArray(shot && shot.beats) ? shot.beats : [];
      const dur = isNum(shot && shot.dur) && shot.dur > 0 ? shot.dur : 10;
      const cueT = (n) => { const b = beats.filter((x) => x && x.do === 'cue' && x.name === n && isNum(x.t)).sort((a, c) => a.t - c.t)[0]; return b ? b.t : null; };
      const N = clamp(Math.round(isNum(+p.days) && p.days != null ? +p.days : 26), 2, 40);
      const cols = Math.ceil(N / 2);
      const clause = typeof p.clause === 'string' && p.clause.trim() ? p.clause.trim() : 'S’IL RATE L’ÉCHÉANCE : TOUS SES FUTURS LIVRES';
      const title = typeof p.title === 'string' && p.title.trim() ? p.title.trim() : 'LE JOUEUR';
      const doneTxt = typeof p.done === 'string' && p.done.trim() ? p.done.trim() : 'RENDU À TEMPS';
      const r = ZV.rng(2606);
      const id = ++UID;
      const st = { N, cols, dur };

      /* ---- repères ---- */
      const tContract = cueT('contract'), tGrid = cueT('grid'), tDays = cueT('days'), tStack = cueT('stack'), tDone = cueT('done');
      st.tC = tContract == null ? -5 : tContract;
      st.tG = tGrid != null ? tGrid : tDays != null ? Math.max(st.tC, tDays - 0.4) : tContract != null ? tContract + 1.6 : -5;
      st.tStack = tStack; st.tDone = tDone;
      // instants où chaque jour se barre (accélération progressive)
      st.dayT = [];
      const anchor = tDays != null ? tDays : (tStack != null ? tStack : (tDone != null ? tDone - 0.6 : null));
      if (anchor != null) {
        let nxt = dur - 0.4;
        for (const c of [tStack, tDone]) if (c != null && c > anchor + 1.2) nxt = Math.min(nxt, c - 0.35);
        const D = tDays != null ? clamp(nxt - anchor, 1.6, 6.5) : 0.6;
        const m = 0.6;
        for (let k = 1; k <= N; k++) { const x = k / N; st.dayT.push(anchor + 0.12 + D * (x * (1 - m) + m * (1 - (1 - x) * (1 - x)))); }
      }
      st.lastDay = st.dayT.length ? st.dayT[N - 1] : null;
      // gros plan de la pile : de `stack` jusqu'à `done` (ou la fin)
      st.zEnd = tStack != null ? (tDone != null && tDone > tStack + 0.3 ? tDone : 1e9) : null;

      rect(root, 0, 0, 1920, 1080, 0, C.paper);

      /* ---- bureau : contrat + grille + tampon (glisse hors cadre pendant le gros plan) ---- */
      st.desk = g(root);

      // contrat
      st.cG = g(st.desk);
      const cg = st.cG;
      rect(cg, -645 + 14, -186 + 14, 1290, 372, 14, C.ink);
      rect(cg, -645, -186, 1290, 372, 14, C.white, C.ink, 6);
      path(cg, 'M-645 -116 L-645 -172 A14 14 0 0 1 -631 -186 L631 -186 A14 14 0 0 1 645 -172 L645 -116Z', C.ink);
      text(cg, 'CONTRAT', -608, -128, 56, C.paper);
      const tt = text(cg, `« ${title} »`, 608, -134, 34, C.lime, { anchor: 'end', mono: true });
      fit(tt, 520);
      // lignes de papier (très discrètes) + signature
      line(cg, 180, 168, 590, 168, C.ink, 4, { opacity: 0.35 });
      text(cg, '✕', 150, 172, 30, C.ink, { mono: true, anchor: 'middle' });
      path(cg, 'M215 150 q18 -30 30 -4 q10 22 28 -16 q12 -20 22 6 q8 18 40 -4 q30 -16 60 3 q40 16 90 -8', 'none', C.ink, 4.5);
      // clause (2 lignes, révélées par un masque)
      let l1 = clause, l2 = '';
      const ci = clause.indexOf(':');
      if (ci > 0 && ci < clause.length - 2) { l1 = clause.slice(0, ci + 1).trim(); l2 = clause.slice(ci + 1).trim(); }
      else { const w = clause.split(/\s+/); const h = Math.ceil(w.length / 2); l1 = w.slice(0, h).join(' '); l2 = w.slice(h).join(' '); }
      st.clip = [];
      const lineSpec = [{ s: l1, y: -30, bar: false, x0: -610 }, { s: l2, y: 85, bar: true, x0: -610 }];
      lineSpec.forEach((L, i) => {
        if (!L.s) return;
        const cid = `cal26c${id}_${i}`;
        const cp = sv('clipPath', { id: cid }, cg);
        const cr = sv('rect', { x: -640, y: i === 0 ? -110 : 0, width: 0, height: 120 }, cp);
        st.clip.push(cr);
        const lg = g(cg, { 'clip-path': `url(#${cid})` });
        if (L.bar) rect(lg, -625, 8, 1250, 108, 6, C.red, C.ink, 5);
        const tn = text(lg, L.s, L.x0 + 6, L.y, 76, C.ink);
        fit(tn, 1210);
      });
      st.nClip = st.clip.length;

      // grille de jours
      st.gridG = g(st.desk);
      const pitch = Math.min(100, Math.floor(1290 / cols)), csz = pitch - 10;
      const gx0 = 90, gy0 = 444, rowP = csz + 14;
      st.cells = [];
      for (let i = 0; i < N; i++) {
        const cx = gx0 + (i % cols) * pitch + csz / 2, cy = gy0 + Math.floor(i / cols) * rowP + csz / 2;
        const cell = g(st.gridG, { transform: `translate(${f2(cx)} ${f2(cy)})` });
        rect(cell, -csz / 2 + 6, -csz / 2 + 6, csz, csz, 8, C.ink);
        const body = g(cell);
        rect(body, -csz / 2, -csz / 2, csz, csz, 8, C.white, C.ink, 5);
        const bg = rect(body, -csz / 2, -csz / 2, csz, csz, 8, C.ink, C.ink, 5, { opacity: 0 });
        const nt = text(body, String(i + 1), 0, 15, 42, C.ink, { anchor: 'middle', mono: true });
        const hx = csz / 2 - 12;
        const x1 = line(body, -hx, -hx, -hx, -hx, C.red, 6);
        const x2 = line(body, hx, -hx, hx, -hx, C.red, 6);
        st.cells.push({ cell, body, bg, nt, x1, x2, hx, s: -1 });
      }

      // tampon + sticker (fin)
      st.stampG = g(st.desk);
      rect(st.stampG, -270 + 12, -62 + 12, 540, 124, 14, C.ink);
      rect(st.stampG, -270, -62, 540, 124, 14, C.lime, C.ink, 8);
      rect(st.stampG, -252, -46, 504, 92, 8, 'none', C.ink, 3);
      fit(text(st.stampG, doneTxt, 0, 24, 66, C.ink, { anchor: 'middle' }), 480);
      st.stickG = g(st.desk);
      sticker(st.stickG, 280, 84, C.ink, `${N} JOURS`, 52, C.lime, { sh: 9, r: 12 });

      /* ---- compteur (reste visible pendant le gros plan) ---- */
      st.cnt = g(root);
      rect(st.cnt, -125 + 10, -46 + 10, 250, 92, 14, C.ink);
      rect(st.cnt, -125, -46, 250, 92, 14, C.lime, C.ink, 6);
      st.cntT = text(st.cnt, 'J 0', 0, 21, 62, C.ink, { anchor: 'middle', mono: true });

      /* ---- pile de feuilles ---- */
      st.pile = g(root);
      const step = Math.min(14, 200 / Math.max(1, N - 1));
      st.step = step;
      rect(st.pile, -165 + 12, 146 + 12, 330, 28, 4, C.ink);
      rect(st.pile, -165, 146, 330, 28, 4, C.pocket, C.ink, 5);
      rect(st.pile, -140, -150, 280, 300, 8, 'none', C.ink, 4, { 'stroke-dasharray': '14 12', opacity: 0.35 });
      st.sheets = [];
      for (let i = 0; i < N; i++) {
        const sg = g(st.pile);
        rect(sg, -130, -150, 260, 300, 8, C.white, C.ink, 5);
        path(sg, scribble(r, -100, -90, 190, 6, 34), 'none', C.ink, 4);
        fit(text(sg, title, -104, -110, 30, C.ink), 200);
        st.sheets.push({ sg, jx: (r() - 0.5) * 18, rot: (r() - 0.5) * 5, s: -1 });
      }
      return st;
    },

    update(st, t) {
      const { N } = st;
      /* ---- gros plan de la pile ---- */
      let z = 0;
      if (st.tStack != null) {
        const span = Math.min(0.6, Math.max(0.2, (st.zEnd - st.tStack) / 2));
        z = E.io3(prog(t, st.tStack, st.tStack + span));
        if (st.zEnd < 1e8) z *= 1 - E.io3(prog(t, st.zEnd - 0.5, st.zEnd));
      }
      setA(st.desk, 'transform', `translate(${f2(-1900 * z)} 0)`);

      /* ---- contrat ---- */
      const cp = prog(t, st.tC, st.tC + 0.5);
      const ce = E.back(cp);
      put(st.cG, 735, lerp(-260, 222, ce), lerp(-6, -0.6, ce), 1, 1, cp > 0 ? 1 : 0);
      const w1 = E.out2(prog(t, st.tC + 0.4, st.tC + 1.25)), w2 = E.out2(prog(t, st.tC + 1.25, st.tC + 2.2));
      if (st.nClip > 0) setA(st.clip[0], 'width', f2(1290 * w1));
      if (st.nClip > 1) setA(st.clip[1], 'width', f2(1290 * w2));

      /* ---- grille ---- */
      const gp = E.out3(prog(t, st.tG, st.tG + 0.45));
      setA(st.gridG, 'visibility', gp > 0 ? 'visible' : 'hidden');
      setA(st.gridG, 'opacity', f2(gp));
      setA(st.gridG, 'transform', `translate(0 ${f2((1 - gp) * 40)})`);

      // jours barrés : un bloc fixe d'aiguilles par case
      let crossed = 0;
      for (let i = 0; i < N; i++) {
        const c = st.cells[i];
        const dt = st.dayT.length ? st.dayT[i] : 1e9;
        const key = Math.round(clamp((t - dt) / 0.14) * 20), q = key / 20;
        if (q >= 1) crossed++;
        if (c.s !== key) {
          c.s = key;
          const a = Math.min(1, q * 2), b = clamp(q * 2 - 1);
          const hx = c.hx;
          setA(c.x1, 'x2', f2(lerp(-hx, hx, a))); setA(c.x1, 'y2', f2(lerp(-hx, hx, a)));
          setA(c.x2, 'x2', f2(lerp(hx, -hx, b))); setA(c.x2, 'y2', f2(lerp(-hx, hx, b)));
          setA(c.x1, 'visibility', q > 0 ? 'visible' : 'hidden');
          setA(c.x2, 'visibility', b > 0 ? 'visible' : 'hidden');
          setA(c.bg, 'opacity', q > 0.5 ? 1 : 0); setA(c.nt, 'fill', q > 0.5 ? C.paper : C.ink);
          const pop = q > 0 && q < 1 ? 1 + 0.12 * Math.sin(Math.PI * q) : 1;
          setA(c.body, 'transform', `scale(${f2(pop)})`);
        }
      }

      /* ---- compteur de jours (≤ 6 changements / s) ---- */
      let tq = t;
      if (st.lastDay == null || t < st.lastDay + 0.17) tq = Math.floor(t * 6) / 6;
      let k = 0;
      for (let i = 0; i < N; i++) if (st.dayT.length && st.dayT[i] + 0.14 <= tq) k++;
      const ctxt = `J ${k}`;
      if (st.cntT.textContent !== ctxt) st.cntT.textContent = ctxt;
      const cvis = gp > 0 ? 1 : 0;
      const ca = E.back(clamp((t - st.tG) / 0.4));
      const bump = st.lastDay != null && t >= st.lastDay + 0.14 ? 1 + 0.12 * Math.sin(Math.PI * clamp((t - st.lastDay - 0.14) / 0.4)) : 1;
      put(st.cnt, lerp(215, 560, z), lerp(770, 440, z), 0, lerp(1, 1.8, z) * ca * bump, lerp(1, 1.8, z) * ca * bump, cvis);

      /* ---- pile ---- */
      const pz = z;
      const ps = lerp(1, 1.45, pz);
      st.pile.setAttribute('transform', `translate(${f2(lerp(1640, 1250, pz))} ${f2(lerp(665, 585, pz))}) scale(${f2(ps)})`);
      setA(st.pile, 'visibility', gp > 0 ? 'visible' : 'hidden');
      for (let i = 0; i < N; i++) {
        const s = st.sheets[i];
        const dt = st.dayT.length ? st.dayT[i] : 1e9;
        const key = Math.round(clamp((t - dt) / 0.2) * 20), q = key / 20;
        if (s.s !== key) {
          s.s = key;
          const e = E.out3(q);
          if (q <= 0) setA(s.sg, 'visibility', 'hidden');
          else {
            setA(s.sg, 'visibility', 'visible');
            setA(s.sg, 'transform', `translate(${f2(s.jx + (1 - e) * 60)} ${f2(-st.step * i - (1 - e) * 280)}) rotate(${f2(s.rot + (1 - e) * 10)})`);
          }
        }
      }

      /* ---- tampon « rendu à temps » + sticker ---- */
      const td = st.tDone;
      const sp = td == null ? 0 : clamp((t - td) / 0.22);
      const ss = sp > 0 ? 1 + 1.6 * (1 - E.out3(sp)) : 0;
      const sh = td == null ? [0, 0] : shakeAt(t, td + 0.2, 7, 0.3);
      put(st.stampG, 770 + sh[0], 770 + sh[1], -6, ss, ss, sp > 0 ? 1 : 0);
      const kp = td == null ? 0 : E.back(clamp((t - td - 0.35) / 0.3));
      put(st.stickG, 1250, 770, 4, kp, kp, kp > 0 ? 1 : 0);
    }
  });
})();
;
/* ==== tools/video/composition/components/card-shoe.js ==== */
// Composant `card-shoe` (épisode 5) : le sabot qui a de la mémoire, le comptage, la maison qui change le jeu. Voir EP5-COMPONENTS.md.
// Trois modes : memory | count | rules. Fonction pure du temps : la séquence de cartes, les tournées et les mélanges sont simulés dans init() à partir des cues ;
// update() ne fait que poser des attributs. Aplats seulement : aucun dégradé, flou, lueur ni filter.
// Cues : shoe, deal (répétable), discard, meter, burst (n), memory, shuffle ; count : rich, poor, no-gadget, edge ; rules : decks, cut, rules, edge, same.
(() => {
  'use strict';
  const { C, E, clamp, prog, lerp, f2, sv, g, rect, circle, path, line, text, rng } = ZV;
  let UID = 0;
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const num = (v, d) => (v != null && v !== '' && isFinite(+v) ? +v : d);
  const str = (v, d) => (typeof v === 'string' && v.trim() ? v.trim() : d);
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const vis = (n, on) => setA(n, 'display', on ? 'inline' : 'none');
  const bwEst = (s, size) => { let a = 0; for (const ch of String(s)) a += size * (ch === ' ' ? 0.28 : /[0-9]/.test(ch) ? 0.5 : /[A-ZÀÂÉÈÊÎÔÛÇ€%+×≈]/.test(ch) ? 0.66 : /[.,:;'’!|]/.test(ch) ? 0.3 : 0.56); return a; };
  // largeur réelle mesurée à l'init (sonde cachée) ; repli sur l'estimation si la mesure est impossible
  let PROBE = null; const BWC = {};
  const bw = (s, size) => {
    s = String(s); const k = size + '|' + s;
    if (BWC[k] !== undefined) return BWC[k];
    if (PROBE) { try { PROBE.textContent = s; PROBE.setAttribute('font-size', size); const w = PROBE.getComputedTextLength(); if (w > 0) { BWC[k] = w; return w; } } catch (e) { /* hors DOM */ } }
    return bwEst(s, size);
  };
  const mw = (s, size) => String(s).length * size * 0.6;
  const SH = '#2A2A2A';
  // groupe centré sur (0,0) : position / rotation / échelle / opacité (avec cache)
  const putc = (n, x, y, r, sx, sy, o) => {
    if (r === undefined) r = 0; if (sx === undefined) sx = 1; if (sy === undefined) sy = sx; if (o === undefined) o = 1;
    const hid = o <= 0.001 || !sx || !sy;
    setA(n, 'display', hid ? 'none' : 'inline');
    if (hid) return;
    setA(n, 'transform', `translate(${f2(x)} ${f2(y)}) rotate(${f2(r)}) scale(${f2(sx)} ${f2(sy)})`);
    setA(n, 'opacity', f2(o));
  };
  const popS = (t, t0, d) => (t0 == null || t < t0 ? 0 : E.back(prog(t, t0, t0 + (d || 0.3))));
  function mkTag(parent, lines, size, fill, tfill, o) {
    o = o || {};
    const ls = Array.isArray(lines) ? lines : [lines];
    const lh = size * 1.12, px = o.padX || 26, py = o.padY || 14;
    let tw = 0; ls.forEach((s) => { tw = Math.max(tw, o.mono ? mw(s, size) : bw(s, size)); });
    const w = tw + px * 2, h = ls.length * lh + py * 2 - (lh - size) * 0.2;
    const grp = g(parent);
    const sh = o.sh || 9, r = o.r === undefined ? 14 : o.r;
    rect(grp, -w / 2 + sh, -h / 2 + sh, w, h, r, o.shc || (fill === C.paper ? C.lime : fill === C.pocket ? C.paper : C.paper));
    rect(grp, -w / 2, -h / 2, w, h, r, fill, o.stroke || C.ink, o.sw || 6);
    ls.forEach((s, i) => text(grp, s, 0, -h / 2 + py + size * 0.82 + i * lh, size, tfill, { anchor: 'middle', mono: o.mono, len: f2(o.mono ? mw(s, size) : bw(s, size)) }));
    return { g: grp, w, h };
  }
  const mlab = (parent, s, x, y, size, fill, anchor) => text(parent, s, x, y, size, fill, { mono: true, anchor: anchor || 'start', len: f2(mw(s, size)) });

  const DEF_SEQ = ['R', '4', '9', 'D', '2', 'A', '6', '10', '3', 'V', '5', '8', '2', '4', '6', '3', '7', '5', '2', 'A', '10'];
  const catOf = (r) => (/^[2-6]$/.test(r) ? 0 : /^[7-9]$/.test(r) ? 1 : 2);
  const SUITS = ['heart', 'spade', 'diamond', 'club'];

  function drawSuit(parent, name, col) {
    const s = g(parent);
    if (name === 'heart') path(s, 'M0 26 L-29 -3 A16 16 0 0 1 0 -16 A16 16 0 0 1 29 -3 Z', col, C.ink, 3);
    else if (name === 'diamond') path(s, 'M0 -30 L22 0 L0 30 L-22 0Z', col, C.ink, 3);
    else if (name === 'spade') path(s, 'M0 -30 L29 2 A15 15 0 0 1 3 17 L9 30 L-9 30 L-3 17 A15 15 0 0 1 -29 2 Z', col, C.ink, 3);
    else { circle(s, 0, -13, 13, col); circle(s, -15, 7, 13, col); circle(s, 15, 7, 13, col); path(s, 'M-7 30 L0 2 L7 30Z', col); }
    return s;
  }
  function mkCard(parent, rank, suit) {
    const grp = g(parent);
    const red = suit === 'heart' || suit === 'diamond';
    rect(grp, -52, -76, 120, 168, 12, SH);
    const face = g(grp), back = g(grp);
    rect(face, -60, -84, 120, 168, 12, C.paper, C.ink, 5);
    text(face, rank, -44, -22, 64, red ? C.red : C.ink, { len: f2(bw(rank, 64) > 80 ? 80 : bw(rank, 64)) });
    const sg = drawSuit(face, suit, red ? C.red : C.ink);
    sg.setAttribute('transform', 'translate(0 26) scale(1.05)');
    rect(back, -60, -84, 120, 168, 12, C.pocket, C.paper, 5);
    rect(back, -46, -70, 92, 140, 6, 'none', C.paper, 2);
    text(back, '0', 0, 26, 84, C.lime, { anchor: 'middle', len: f2(bw('0', 84)) });
    return { g: grp, face, back };
  }
  function pictoEye(p) {
    line(p, -44, -42, 44, -42, C.paper, 6); line(p, 0, -42, 0, -26, C.paper, 6);
    path(p, 'M-38 6 C-20 -22 20 -22 38 6 C20 34 -20 34 -38 6Z', C.white, C.ink, 4);
    circle(p, 0, 6, 11, C.lime, C.ink, 3); circle(p, 0, 6, 4, C.ink);
  }
  function pictoEar(p) {
    path(p, 'M-6 -36 C-36 -36 -36 12 -6 12 L8 12', 'none', C.paper, 9);
    rect(p, 4, 2, 30, 20, 8, C.lime, C.ink, 4);
    path(p, 'M18 22 C18 40 -4 36 -4 46', 'none', C.paper, 4);
  }
  function pictoBox(p) {
    rect(p, -36, -16, 72, 52, 8, C.paper, C.ink, 4);
    line(p, 22, -16, 34, -42, C.paper, 5); circle(p, 34, -44, 6, C.lime, C.ink, 3);
    rect(p, -26, -8, 34, 22, 3, C.lime, C.ink, 3); circle(p, 22, 4, 6, C.ink); circle(p, 22, 22, 6, C.ink);
  }

  /* ---- géométrie ---- */
  const LANE_Y = 385, SLOT_Y = 292, PX = 1610;
  const GX0 = 370, GW = 1500, GY = 668, GH = 80;

  ZV.define('card-shoe', {
    init(root, shot) {
      const P = (shot && shot.props) || {};
      const beats = Array.isArray(shot && shot.beats) ? shot.beats : [];
      const dur = isNum(shot && shot.dur) && shot.dur > 0 ? shot.dur : 10;
      const mode = P.mode === 'count' || P.mode === 'rules' ? P.mode : 'memory';
      const decks = clamp(Math.round(num(P.decks, 6)), 1, 12);
      const seq = Array.isArray(P.sequence) && P.sequence.length ? P.sequence.map((x) => String(x).toUpperCase()) : DEF_SEQ;
      const bubble = str(P.bubble, 'LA BILLE : AUCUNE MÉMOIRE');
      const edgeTxt = str(P.edge, '1 À 2 %');
      const uid = 'cs' + (++UID);
      PROBE = text(root, '', 0, -500, 100, 'none'); PROBE.setAttribute('visibility', 'hidden');
      ['RICHE EN FIGURES', 'PAUVRE EN FIGURES'].forEach((l) => bw(l, 32));
      const cbs = (n) => beats.filter((b) => b && b.do === 'cue' && b.name === n && isNum(b.t)).sort((a, b) => a.t - b.t);
      const c1 = (n) => { const a = cbs(n)[0]; return a ? a.t : null; };
      const NAMES = ['shoe', 'deal', 'discard', 'meter', 'burst', 'memory', 'shuffle', 'rich', 'poor', 'no-gadget', 'edge', 'decks', 'cut', 'rules', 'same'];
      const noCue = !NAMES.some((n) => cbs(n).length);
      const rules = mode === 'rules';
      const st = { dur, mode, decks, uid, noCue, rules };
      st.T = {};
      NAMES.forEach((n) => { st.T[n] = c1(n); });
      const T = st.T;
      st.bandW = clamp(288 / decks, 24, 48);
      st.MAXLINE = rules ? 3 : 5;
      st.LX0 = rules ? 920 : 620;
      st.SP = rules ? 130 : 140;
      st.PY = rules ? 392 : 348;
      st.EXTN = 7;

      /* ---- simulation (déterministe) ---- */
      const evs = [];
      const pri = { shuffle: 0, discard: 1, deal: 2, burst: 3 };
      cbs('deal').forEach((b) => evs.push({ t: b.t, type: 'deal' }));
      cbs('discard').forEach((b) => evs.push({ t: b.t, type: 'discard' }));
      cbs('shuffle').forEach((b) => evs.push({ t: b.t, type: 'shuffle' }));
      cbs('burst').forEach((b) => evs.push({ t: b.t, type: 'burst', n: clamp(Math.round(num(b.n, 14)), 1, 40), d: num(b.dur, 2.5) }));
      if (rules) {
        for (let i = 0; i < 3; i++) evs.push({ t: -6 + i * 0.1, type: 'deal' });
        const tc = T.cut;
        if (tc != null) {
          evs.push({ t: tc + 0.6, type: 'discard' }, { t: tc + 1.2, type: 'shuffle' });
          [1.7, 1.95, 2.2].forEach((d) => evs.push({ t: tc + d, type: 'deal' }));
          evs.push({ t: tc + 3.0, type: 'discard' }, { t: tc + 3.6, type: 'shuffle' });
          [4.1, 4.35, 4.6].forEach((d) => evs.push({ t: tc + d, type: 'deal' }));
        }
      }
      evs.sort((a, b) => a.t - b.t || pri[a.type] - pri[b.type]);
      const cards = [], rounds = [], shufTs = [];
      let seqPos = 0, lineC = [], pile = [], cur = null;
      const rr = rng(5151);
      const mk = (emit, kind) => {
        const rank = seq[seqPos++ % seq.length];
        const c = { rank, suit: SUITS[Math.floor(rr() * 4)], cat: catOf(rank), emit, kind, round: null, k: 0, discT: null, retT: null, base: emit < -1 };
        cards.push(c); return c;
      };
      const sweep = (t) => { lineC.forEach((c, i) => { c.discT = t + i * 0.03; pile.push(c); }); lineC = []; cur = null; };
      if (rules) for (let i = 0; i < 14; i++) { const c = mk(-9, 'burst'); c.rank = seq[i % seq.length]; c.cat = catOf(c.rank); pile.push(c); }
      for (const ev of evs) {
        if (cards.length > 150) break;
        if (ev.type === 'deal') {
          if (lineC.length >= st.MAXLINE) sweep(ev.t);
          const c = mk(ev.t, 'deal');
          if (!cur) { cur = { cards: [] }; rounds.push(cur); }
          c.round = cur; c.k = lineC.length; cur.cards.push(c); lineC.push(c);
        } else if (ev.type === 'discard') { if (lineC.length) sweep(ev.t); }
        else if (ev.type === 'burst') {
          for (let j = 0; j < ev.n; j++) { const c = mk(ev.t + ev.d * Math.pow(j / ev.n, 1 / 1.8), 'burst'); pile.push(c); }
        } else if (ev.type === 'shuffle') {
          const all = lineC.concat(pile);
          all.forEach((c, i) => { c.retT = ev.t + 0.35 * (i / Math.max(1, all.length - 1)); c.shufBase = ev.t; });
          lineC = []; pile = []; cur = null; seqPos = 0; shufTs.push(ev.t);
        }
      }
      st.cards = cards; st.shufTs = shufTs;
      const spacing = (c) => { const m = c.round ? c.round.cards.length : 1; return m > 1 ? Math.min(st.SP, (1300 - st.LX0 - 120) / (m - 1)) : st.SP; };
      cards.forEach((c) => {
        if (c.kind === 'deal') c.lx = st.LX0 + 60 + c.k * spacing(c);
        c.land = c.kind === 'burst' ? c.emit + 0.3 : c.discT != null ? c.discT + 0.4 : null;
      });
      st.pileH = (t) => { let n = 6; for (const c of cards) if (c.land != null && c.land <= t && (c.retT == null || t < c.retT)) n++; return Math.min(n, 140); };
      cards.forEach((c) => {
        if (c.retT == null) return;
        const inPile = c.land != null && c.land <= c.shufBase + 0.0001;
        const flying = c.land != null && !inPile;
        c.retFrom = inPile || flying ? [PX, st.PY - st.pileH(c.shufBase - 1e-4) + 84, false] : [c.lx, LANE_Y, true];
      });

      /* ---- décor ---- */
      rect(root, 0, 0, 1920, 1080, 0, C.ink);
      const bgs = g(root, { transform: 'rotate(-18 960 540)' });
      for (let k = -4; k <= 4; k++) rect(bgs, 960 + k * 300 - 60, -600, 120, 2300, 0, C.pocket);
      const B = g(root);
      st.laneG = g(B);
      rect(st.laneG, st.LX0 - 24, 290, 1324 - st.LX0 + 24, 192, 18, C.pocket, SH, 4);

      /* sabot */
      st.shoeG = g(B);
      const sg = st.shoeG;
      st.shP1 = path(sg, 'M0 0', SH); st.shP1.setAttribute('transform', 'translate(10 10)');
      st.shP2 = path(sg, 'M0 0', C.ink, C.paper, 8);
      st.win = rect(sg, 128, 352, 300, 188, 6, C.pocket, C.paper, 4);
      st.bands = [];
      const NB = decks + st.EXTN;
      for (let i = 0; i < NB; i++) st.bands.push(rect(sg, 0, 384, 10, 146, 2, C.paper, C.ink, 3));
      st.cut = rect(sg, 0, 366, 12, 164, 2, C.red, C.ink, 3);
      st.slot = rect(sg, 0, 266, 34, 48, 4, C.ink, C.paper, 5);
      st.shLab = null;
      if (!rules) {
        st.shLab = mlab(sg, `${decks} PAQUETS · SANS REMISE`, 100, 226, 24, C.paper);
      }
      st.mixTag = mkTag(B, 'MÉLANGE', 40, C.paper, C.ink, { sh: 8 });
      st.decksTag = mkTag(B, 'PLUS DE PAQUETS', 40, C.lime, C.ink, { sh: 8 });
      st.cutTag = mkTag(B, 'MÉLANGE PLUS TÔT', 36, C.paper, C.ink, { sh: 8 });
      st.cutArrow = g(B);
      st.cutArr = path(st.cutArrow, 'M0 0', C.red, C.ink, 3);
      st.memTag = mkTag(B, 'LE SABOT, LUI, SE SOUVIENT', 40, C.lime, C.ink, { sh: 9 });

      /* défausse */
      st.disG = g(B);
      st.dBody = rect(st.disG, PX - 52, 0, 120, 10, 12, SH);
      st.dMain = rect(st.disG, PX - 60, 0, 120, 10, 12, C.pocket, C.paper, 5);
      st.dTop = rect(st.disG, PX - 60, 0, 120, 168, 12, C.pocket, C.paper, 5);
      st.dIn = rect(st.disG, PX - 46, 0, 92, 140, 6, 'none', C.paper, 2);
      st.dZero = text(st.disG, '0', PX, 0, 84, C.lime, { anchor: 'middle', len: f2(bw('0', 84)) });
      mlab(st.disG, 'DÉFAUSSE', PX, st.PY + 168 + 44, 26, C.paper, 'middle');
      st.discTag = mkTag(B, ['NE REVIENT PAS', 'AVANT LE MÉLANGE'], 34, C.paper, C.ink, { sh: 8 });

      /* jauge */
      st.gG = g(B);
      mlab(st.gG, 'CE QUI RESTE DANS LE SABOT', GX0, 650, 26, C.paper);
      const segs = [[C.paper, C.ink], [C.pocket, C.paper], [C.lime, C.ink]];
      st.ghost = [0, 1].map(() => line(st.gG, 0, 658, 0, 760, C.paper, 3, { 'stroke-dasharray': '6 6', 'stroke-linecap': 'butt' }));
      st.gSh = rect(st.gG, GX0 + 9, GY + 9, GW, GH, 4, SH);
      st.seg = segs.map((s) => rect(st.gG, GX0, GY, 10, GH, 2, s[0], s[1], 4));
      const legs = ['PETITES · 2 À 6', 'MOYENNES · 7 À 9', 'FIGURES ET AS'];
      st.leg = legs.map((s) => mlab(st.gG, s, 0, 784, 22, C.paper, 'middle'));
      st.richLab = text(st.gG, '', 0, GY + 53, 32, C.ink, { anchor: 'middle' });
      st.richLab.__s = '';
      st.sliceMini = rect(st.gG, GX0 - 2, GY - 6, 24, GH + 12, 3, 'none', C.lime, 4);
      // cartouche de la bille
      st.memG = g(B);
      rect(st.memG, 40, 650, 300, 134, 12, SH);
      rect(st.memG, 30, 640, 300, 134, 12, C.pocket, C.paper, 5);
      circle(st.memG, 74, 707, 24, C.white, C.ink, 5);
      circle(st.memG, 66, 699, 7, C.paper);
      {
        const i = bubble.indexOf(' : ');
        const ls = i > 0 ? [bubble.slice(0, i + 2), bubble.slice(i + 3)] : [bubble];
        ls.forEach((s, k) => text(st.memG, s, 116, 700 + k * 36, 24, C.paper, { mono: true, len: f2(Math.min(mw(s, 24), 200)) }));
      }

      /* count : jetons, gadgets, tranche */
      st.chG = g(B);
      st.chips = [];
      for (let k = 0; k < 10; k++) {
        const c = g(st.chG);
        rect(c, -50, -(k + 1) * 22, 100, 22, 3, C.lime, C.ink, 3.5);
        for (let q = -1; q <= 1; q++) rect(c, q * 30 - 10, -(k + 1) * 22 + 5, 20, 12, 2, C.ink);
        st.chips.push(c);
      }
      rect(st.chG, -58, 0, 116, 8, 2, SH);
      st.chLab = text(B, '', 1336, 318, 26, C.paper, { mono: true });
      st.chLab.__s = '';
      st.gad = g(B);
      st.gadI = [pictoEye, pictoEar, pictoBox].map((fn, i) => { const p = g(st.gad); fn(p); const s = line(p, -46, 46, 46, -46, C.red, 8); return { p, s, x: 1520 + i * 120 }; });
      mlab(st.gad, 'PAS DE GADGET', 1640, 246, 26, C.paper, 'middle');
      st.slice = g(B);
      rect(st.slice, 0, 0, 22, 30, 2, C.lime, C.ink, 3);
      st.sliceT = text(B, edgeTxt, 1400, 616, 44, C.lime, { len: f2(bw(edgeTxt, 44)) });
      const kick = 'BIEN FAIT, AVEC BEAUCOUP D\'ARGENT DERRIÈRE';
      st.kick = mlab(B, kick, 1870, 652, 22, C.paper, 'end');

      /* rules : feuille */
      st.sheetLab = mlab(B, 'RÈGLES MODIFIÉES', 1360, 82, 26, C.paper);
      st.sheet = g(B);
      rect(st.sheet, 1370, 106, 480, 208, 6, SH);
      rect(st.sheet, 1360, 96, 480, 208, 6, C.paper, C.ink, 6);
      text(st.sheet, 'RÈGLES', 1396, 148, 44, C.ink, { len: f2(bw('RÈGLES', 44)) });
      st.rl = [0, 1, 2].map((i) => {
        const y = 172 + i * 44, w = [300, 360, 250][i];
        rect(st.sheet, 1396, y, w, 14, 4, C.ink);
        const strike = rect(st.sheet, 1390, y + 4, w + 12, 6, 2, C.red);
        const nw = [220, 0, 330][i];
        const nb = nw ? rect(st.sheet, 1396, y + 18, nw, 14, 4, C.lime, C.ink, 3) : null;
        return { strike, nb, w, y, fix: i !== 1 };
      });

      /* voiles / cadre / panneau edge */
      st.veilS = rect(root, 0, 0, 1920, 1080, 0, C.ink);
      st.cardsG = g(root);
      st.clipR = rect(sv('clipPath', { id: uid + 'k' }, sv('defs', null, root)), 0, 0, 1920, 1080, 0, '#000');
      st.cardsG.setAttribute('clip-path', `url(#${uid}k)`);
      st.cn = cards.map((c) => { const n = mkCard(st.cardsG, c.rank, c.suit); n.g.setAttribute('display', 'none'); return n; });
      st.veilE = rect(root, 0, 0, 1920, 1080, 0, C.ink);
      st.eP = g(root);
      rect(st.eP, 700, 130, 650, 520, 12, SH);
      rect(st.eP, 690, 120, 650, 520, 12, C.pocket, C.paper, 6);
      st.eCap = mkTag(st.eP, 'L\'AVANTAGE D\'USTON FOND', 36, C.paper, C.ink, { sh: 8 });
      st.eCap.g.setAttribute('transform', 'translate(1015 196)');
      rect(st.eP, 730, 462, 570, 8, 2, C.paper);
      mlab(st.eP, 'AVANTAGE JOUEUR', 730, 440, 22, C.paper);
      mlab(st.eP, 'AVANTAGE MAISON', 730, 510, 22, C.red);
      st.eUp = rect(st.eP, 955, 462, 120, 10, 3, C.lime, C.ink, 4);
      st.eDn = rect(st.eP, 955, 470, 120, 10, 3, C.red, C.ink, 4);
      st.eTxt = text(st.eP, edgeTxt, 1105, 400, 60, C.lime, { len: f2(bw(edgeTxt, 60)) });
      st.eKick = null;
      st.sameO = g(root);
      st.sameFrame = rect(st.sameO, 0, 0, 10, 10, 18, 'none', C.paper, 8);
      st.sameTag = mkTag(st.sameO, 'VU DE LA TABLE : LE MÊME JEU', 40, C.paper, C.ink, { sh: 8 });
      PROBE.parentNode.removeChild(PROBE); PROBE = null;
      return st;
    },

    update(st, t) {
      try {
        t = clamp(t, 0, st.dur + 1);
        const T = st.T, rules = st.rules, mode = st.mode, decks = st.decks;
        const nc = st.noCue;
        const pS = T.shoe == null ? 1 : E.out3(prog(t, T.shoe, T.shoe + 0.55));
        const pPop = T.shoe == null ? 1 : popS(t, T.shoe, 0.35);

        /* consommation du sabot (par catégorie) */
        const cons = (tt) => {
          let k = -1;
          for (let i = 0; i < st.shufTs.length; i++) if (st.shufTs[i] <= tt) k = i;
          const from = k >= 0 ? st.shufTs[k] : -1e9;
          const v = [0, 0, 0];
          for (const c of st.cards) if (c.emit >= from && c.emit <= tt + 0.0001) v[c.cat] += E.out2(prog(tt, c.emit, c.emit + 0.2));
          if (k >= 0) {
            const w = 1 - E.io2(prog(tt, st.shufTs[k], st.shufTs[k] + 0.6));
            if (w > 0) { const pv = cons(st.shufTs[k] - 1e-4); for (let j = 0; j < 3; j++) v[j] += pv[j] * w; }
          }
          return v;
        };
        const v = cons(t);
        const consumed = v[0] + v[1] + v[2];

        /* extension du sabot (rules) */
        const ext = rules && T.decks != null ? Math.min(st.EXTN, Math.max(0, (t - T.decks) / 0.25)) : 0;
        const bw0 = st.bandW;
        const xr = 212 + (decks + ext) * bw0;
        const totalW = (decks + ext) * bw0;
        const effW = Math.max(0, totalW - consumed * bw0 / 52);
        const d1 = `M100 560 L100 340 L${f2(xr - 110)} 262 L${f2(xr)} 262 L${f2(xr)} 560 Z`;
        setA(st.shP1, 'd', d1); setA(st.shP2, 'd', d1);
        setA(st.win, 'width', f2(xr - 66 - 128));
        setA(st.slot, 'x', f2(xr - 24));
        st.bands.forEach((b, i) => {
          const w = clamp(effW - i * bw0, 0, bw0);
          if (w < 7) { vis(b, false); return; }
          vis(b, true); setA(b, 'x', f2(140 + i * bw0 + 2)); setA(b, 'width', f2(w - 4));
        });
        // carte de coupe
        let cutFrac = 0.25;
        if (rules && T.cut != null) cutFrac = lerp(0.25, 0.7, E.io3(prog(t, T.cut, T.cut + 0.8)));
        let lift = 0;
        for (const ts of st.shufTs) lift = Math.max(lift, 92 * E.out2(prog(t, ts, ts + 0.25)) * (1 - E.in2(prog(t, ts + 0.6, ts + 0.9))));
        const cutX = Math.min(140 + cutFrac * totalW, 140 + effW - 8);
        vis(st.cut, effW > 40);
        setA(st.cut, 'x', f2(cutX - 6));
        setA(st.cut, 'transform', `translate(0 ${f2(-lift)})`);

        /* groupes de gauche */
        setA(st.shoeG, 'transform', `translate(${f2(-(1 - pS) * 640)} 0)`);
        vis(st.shoeG, pS > 0.001);
        putc(st.laneG, 0, 0, 0, 1, 1, pS > 0.001 ? 1 : 0);
        if (st.shLab) {
          // étiquette « 6 PAQUETS · SANS REMISE » : posée avec le sabot
          vis(st.shLab, T.shoe == null ? true : pS > 0.3);
        }
        // stickers d'étiquette
        putc(st.memTag.g, 480, 150, -2, popS(t, T.memory), popS(t, T.memory), T.memory != null && t >= T.memory ? 1 : 0);
        putc(st.discTag.g, 1610, 170, 2, popS(t, T.discard), popS(t, T.discard), T.discard != null && t >= T.discard ? 1 : 0);
        const tMix = st.shufTs.length ? Math.max.apply(null, st.shufTs.filter((x) => x <= t).concat([-1])) : -1;
        const mixOn = T.shuffle != null && t >= T.shuffle;
        putc(st.mixTag.g, 720, 240, -3, mixOn ? popS(t, T.shuffle) : 0, mixOn ? popS(t, T.shuffle) : 0, mixOn ? 1 : 0);
        const tagOn = !(T.same != null && t >= T.same);
        putc(st.decksTag.g, 480, 206, -2, popS(t, T.decks), popS(t, T.decks), T.decks != null && t >= T.decks && tagOn ? 1 : 0);
        putc(st.cutTag.g, 300, 612, -2, popS(t, T.cut), popS(t, T.cut), T.cut != null && t >= T.cut && tagOn ? 1 : 0);
        // flèche rouge de la coupe
        if (T.cut != null && t >= T.cut) {
          const x0 = 140 + 0.25 * totalW, x1 = 140 + cutFrac * totalW;
          const L = Math.max(0, x1 - x0) * E.out2(prog(t, T.cut, T.cut + 0.5));
          vis(st.cutArrow, L > 4);
          if (L > 4) setA(st.cutArr, 'd', `M${f2(x0)} 320 H${f2(x0 + L - 22)} V308 L${f2(x0 + L + 8)} 326 L${f2(x0 + L - 22)} 344 V332 H${f2(x0)} Z`);
        } else vis(st.cutArrow, false);

        /* défausse : (rules) elle reste, la feuille est au-dessus */
        const h = st.pileH(t);
        const topY = st.PY - h;
        setA(st.disG, 'transform', `translate(${f2((1 - pS) * 520)} 0)`); vis(st.disG, pS > 0.001);
        setA(st.dBody, 'y', f2(topY + 8)); setA(st.dBody, 'height', f2(168 + h));
        setA(st.dMain, 'y', f2(topY)); setA(st.dMain, 'height', f2(168 + h));
        setA(st.dTop, 'y', f2(topY)); setA(st.dIn, 'y', f2(topY + 14));
        setA(st.dZero, 'y', f2(topY + 110));

        /* cartes */
        for (let i = 0; i < st.cards.length; i++) {
          const c = st.cards[i], n = st.cn[i];
          const s = cardSt(st, c, t, h, xr);
          if (!s) { vis(n.g, false); continue; }
          const pop = c.base ? pPop : 1;
          if (pop <= 0.001) { vis(n.g, false); continue; }
          putc(n.g, s.x, s.y, s.rot || 0, (s.sx === undefined ? 1 : s.sx) * pop, pop, 1);
          vis(n.face, s.face); vis(n.back, !s.face);
        }
        setA(st.clipR, 'x', f2(xr)); setA(st.clipR, 'width', f2(1920 - xr));

        /* jauge */
        const tG = [T.meter, T.rich, T.poor].filter((x) => x != null);
        const tGauge = tG.length ? Math.min.apply(null, tG) : null;
        const gp = tGauge == null ? (nc ? 1 : 0) : E.out3(prog(t, tGauge, tGauge + 0.4));
        if (rules) { vis(st.gG, false); vis(st.memG, false); } else {
          putc(st.gG, 0, (1 - gp) * 40, 0, 1, 1, gp);
          const rem = [Math.max(1, 20 * decks - v[0]), Math.max(1, 12 * decks - v[1]), Math.max(1, 20 * decks - v[2])];
          const sum = rem[0] + rem[1] + rem[2];
          let fr = [rem[0] / sum, rem[1] / sum, rem[2] / sum];
          const f0 = [20 / 52, 12 / 52, 20 / 52];
          // basculement riche / pauvre (mode count)
          let rich = 0, ovp = 0, richLabel = '';
          if (mode === 'count') {
            const sw = [];
            cbsOf(st, 'rich').forEach((x) => sw.push({ t: x, to: 1 }));
            cbsOf(st, 'poor').forEach((x) => sw.push({ t: x, to: 0 }));
            sw.sort((a, b) => a.t - b.t);
            if (sw.length) {
              ovp = E.io2(prog(t, sw[0].t, sw[0].t + 0.6));
              let val = sw[0].to; let prev = sw[0].to;
              for (let i = 0; i < sw.length; i++) {
                if (t < sw[i].t) break;
                const from = i === 0 ? sw[0].to : sw[i - 1].to;
                val = i === 0 ? sw[0].to : lerp(from, sw[i].to, E.io2(prog(t, sw[i].t, sw[i].t + 0.6)));
                prev = sw[i].to;
                richLabel = prev ? 'RICHE EN FIGURES' : 'PAUVRE EN FIGURES';
              }
              if (t >= sw[0].t) {
                rich = val;
                const tgt = lerp(0.25, 0.5, rich);
                const nat = fr[2];
                const fg = lerp(nat, tgt, ovp);
                const ratio = fr[0] / (fr[0] + fr[1]);
                fr = [(1 - fg) * ratio, (1 - fg) * (1 - ratio), fg];
              }
            }
          }
          let x = GX0;
          const mids = [];
          for (let i = 0; i < 3; i++) {
            const w = fr[i] * GW;
            setA(st.seg[i], 'x', f2(x)); setA(st.seg[i], 'width', f2(w));
            mids.push(x + w / 2); x += w;
          }
          st.leg.forEach((l, i) => setA(l, 'x', f2(mids[i])));
          const g0 = [f0[0] * GW + GX0, (f0[0] + f0[1]) * GW + GX0];
          st.ghost.forEach((l, i) => { setA(l, 'x1', f2(g0[i])); setA(l, 'x2', f2(g0[i])); });
          // étiquette riche / pauvre dans le tronçon lime
          if (richLabel) {
            const wseg = fr[2] * GW;
            if (st.richLab.__s !== richLabel) { st.richLab.__s = richLabel; st.richLab.textContent = richLabel; }
            const len = Math.min(bw(richLabel, 32), wseg - 34);
            setA(st.richLab, 'textLength', f2(len)); setA(st.richLab, 'lengthAdjust', 'spacingAndGlyphs');
            setA(st.richLab, 'x', f2(mids[2])); vis(st.richLab, true);
          } else vis(st.richLab, false);
          vis(st.sliceMini, mode === 'count' && T.edge != null && t >= T.edge);
          // cartouche bille
          const mp = popS(t, T.memory);
          putc(st.memG, 0, 0, 0, 1, 1, T.memory != null && t >= T.memory ? Math.min(1, mp) : 0);
          setA(st.memG, 'transform', `translate(0 ${f2((1 - Math.min(1, mp)) * 30)})`);

          // jetons
          if (mode === 'count') {
            const sw2 = [];
            cbsOf(st, 'rich').forEach((x) => sw2.push({ t: x, to: 1 }));
            cbsOf(st, 'poor').forEach((x) => sw2.push({ t: x, to: 0 }));
            sw2.sort((a, b) => a.t - b.t);
            if (sw2.length && t >= sw2[0].t - 0.001) {
              let cnt = 1; let lab = '';
              for (let i = 0; i < sw2.length; i++) {
                if (t < sw2[i].t) break;
                const base = i === 0 ? 0 : sw2[i - 1].to;
                const a = i === 0 ? 1 : lerp(1, 10, base), b = lerp(1, 10, sw2[i].to);
                const sp = sw2[i].to ? 0.7 : 0.5;
                cnt = lerp(a, b, E.out2(prog(t, sw2[i].t, sw2[i].t + sp)));
                lab = sw2[i].to ? 'MISE GROSSE' : 'MISE PETITE';
              }
              vis(st.chG, true);
              setA(st.chG, 'transform', 'translate(1372 560)');
              st.chips.forEach((c, k) => { const s = clamp(cnt - k); if (s <= 0.01) vis(c, false); else { vis(c, true); setA(c, 'transform', `translate(0 0) scale(1 ${f2(s)})`); } });
              if (st.chLab.__s !== lab) { st.chLab.__s = lab; st.chLab.textContent = lab; setA(st.chLab, 'textLength', f2(mw(lab, 26))); }
              setA(st.chLab, 'y', f2(Math.max(318, 560 - cnt * 22 - 22)));
              vis(st.chLab, true);
            } else { vis(st.chG, false); vis(st.chLab, false); }
          } else { vis(st.chG, false); vis(st.chLab, false); }
        }
        if (mode !== 'count') { vis(st.gad, false); vis(st.slice, false); vis(st.sliceT, false); vis(st.kick, false); }
        else {
          // pas de gadget
          const ng = T['no-gadget'];
          vis(st.gad, ng != null && t >= ng);
          if (ng != null && t >= ng) {
            st.gadI.forEach((it, i) => {
              const s = popS(t, ng + i * 0.18, 0.3);
              putc(it.p, it.x, 150, 0, s * 1.2, s * 1.2, s > 0 ? 1 : 0);
              const q = prog(t, ng + 0.5 + i * 0.18, ng + 0.7 + i * 0.18);
              setA(it.s, 'x2', f2(lerp(-46, 46, q))); setA(it.s, 'y2', f2(lerp(46, -46, q)));
              vis(it.s, q > 0);
            });
          }
          // tranche 1 à 2 %
          const te = T.edge;
          const on = te != null && t >= te;
          vis(st.slice, on); vis(st.sliceT, on); vis(st.kick, on);
          if (on) {
            const q = E.out3(prog(t, te, te + 0.5));
            setA(st.slice, 'transform', `translate(1361 ${f2(lerp(552, 588, q))})`);
            setA(st.sliceT, 'opacity', f2(prog(t, te + 0.3, te + 0.5)));
            setA(st.kick, 'opacity', f2(prog(t, te + 0.7, te + 0.9)));
          }
        }
        if (mode === 'count') { /* sticker mémoire non utilisé */ }

        /* rules : feuille */
        const tr = T.rules;
        if (rules && tr != null && t >= tr) {
          const q = E.back(prog(t, tr, tr + 0.5));
          setA(st.sheet, 'transform', `translate(0 ${f2(-(1 - q) * 360)})`); vis(st.sheet, true);
          setA(st.sheetLab, 'opacity', f2(prog(t, tr + 0.3, tr + 0.5))); vis(st.sheetLab, true);
          st.rl.forEach((r, i) => {
            const t1 = tr + 0.7 + i * 0.35;
            const q1 = prog(t, t1, t1 + 0.25);
            const hasFix = r.fix;
            vis(r.strike, hasFix && q1 > 0);
            if (hasFix) setA(r.strike, 'width', f2((r.w + 12) * q1));
            if (r.nb) { const q2 = prog(t, t1 + 0.3, t1 + 0.55); vis(r.nb, q2 > 0); setA(r.nb, 'width', f2(Math.max(1, (i === 0 ? 220 : 330) * q2))); }
          });
        } else { vis(st.sheet, false); vis(st.sheetLab, false); }

        /* same / edge */
        const tS = T.same;
        const sameOn = rules && tS != null && t >= tS;
        const tE = T.edge;
        const edgeOn = rules && tE != null && t >= tE && !(tS != null && t >= tS);
        setA(st.veilS, 'opacity', f2(sameOn ? 0.62 * prog(t, tS, tS + 0.25) : 0)); vis(st.veilS, sameOn);
        vis(st.sameO, sameOn);
        if (sameOn) {
          const x0 = st.LX0 - 28;
          setA(st.sameFrame, 'x', x0); setA(st.sameFrame, 'y', 280); setA(st.sameFrame, 'width', 1328 - x0); setA(st.sameFrame, 'height', 212);
          const p = popS(t, tS + 0.1);
          putc(st.sameTag.g, rules ? 979 : 960, 215, -1.5, p, p, 1);
        }
        setA(st.veilE, 'opacity', f2(edgeOn ? 0.62 * prog(t, tE, tE + 0.25) : 0)); vis(st.veilE, edgeOn);
        vis(st.eP, edgeOn);
        if (edgeOn) {
          const q = E.out3(prog(t, tE, tE + 0.35));
          setA(st.eP, 'transform', `translate(0 ${f2((1 - q) * 40)})`);
          const melt = E.io2(prog(t, tE + 0.3, tE + 1.8));
          const hu = 220 * (1 - melt);
          vis(st.eUp, hu > 3); setA(st.eUp, 'y', f2(462 - hu)); setA(st.eUp, 'height', f2(Math.max(1, hu)));
          setA(st.eTxt, 'y', f2(462 - hu * 0.5 + 24)); setA(st.eTxt, 'opacity', f2(clamp(hu / 100)));
          vis(st.eTxt, hu > 6);
          const hd = 74 * E.back(prog(t, tE + 1.8, tE + 2.25));
          vis(st.eDn, hd > 3); setA(st.eDn, 'height', f2(Math.max(1, hd)));
        }
      } catch (e) { /* jamais d'exception */ }
    }
  });

  function cbsOf(st, name) {
    if (!st.__cb) st.__cb = {};
    if (!st.__cb[name]) st.__cb[name] = st.__beats(name);
    return st.__cb[name];
  }

  // état d'une carte à l'instant t (null = invisible)
  function cardSt(st, c, t, h, xr) {
    if (t < c.emit) return null;
    const sx0 = xr - 40, sy0 = 330;
    const px = PX, py = st.PY - h + 84;
    if (c.retT != null && t >= c.retT) {
      const p = prog(t, c.retT, c.retT + 0.25);
      if (p >= 1) return null;
      const e = E.in2(p), fr = c.retFrom || [px, py, false];
      return { x: lerp(fr[0], sx0, e), y: lerp(fr[1], sy0, e), sx: 1 - 0.3 * e, rot: -10 * e, face: fr[2] };
    }
    if (c.kind === 'burst') {
      const p = prog(t, c.emit, c.emit + 0.3);
      if (p >= 1) return null;
      const e = E.io2(p);
      return { x: lerp(sx0, px, e), y: lerp(sy0, py, e) - 50 * Math.sin(Math.PI * p), rot: 12 * p, face: true };
    }
    if (c.discT != null && t >= c.discT) {
      const p = prog(t, c.discT, c.discT + 0.4);
      if (p >= 1) return null;
      const e = E.io2(p), q = clamp(p / 0.45);
      return { x: lerp(c.lx, px, e), y: lerp(LANE_Y, py, e) - 40 * Math.sin(Math.PI * p), sx: Math.max(Math.abs(1 - 2 * q), 0.04), rot: 6 * p, face: q < 0.5 };
    }
    const p = prog(t, c.emit, c.emit + 0.3333);
    const e = E.out3(p), q = clamp((p - 0.2) / 0.6);
    return { x: lerp(sx0, c.lx, e), y: lerp(sy0, LANE_Y, e), sx: Math.max(Math.abs(1 - 2 * q), 0.04), face: q >= 0.5 };
  }
  // rattache la lecture des cues à l'état (init n'a pas accès direct depuis update)
  const _init = ZV.REG['card-shoe'].init;
  ZV.REG['card-shoe'].init = function (root, shot) {
    const st = _init.call(this, root, shot);
    const beats = Array.isArray(shot && shot.beats) ? shot.beats : [];
    st.__beats = (n) => beats.filter((b) => b && b.do === 'cue' && b.name === n && isNum(b.t)).map((b) => b.t).sort((a, b) => a - b);
    return st;
  };
})();
;
/* ==== tools/video/composition/components/chapter-card.js ==== */
// Composant « chapter-card » : voir tools/video/composition/INTERFACE.md. Fonction pure du temps du plan, aplats seulement.
(() => {
  /* ---- aides typographiques locales (mêmes lignes dans chaque composant du rôle « Typo ») ---- */
  const { C, F, E, clamp, prog, lerp, f2, put, g, rect, text, path, line, sv, circle } = ZV;
  const COL = { ink: C.ink, paper: C.paper, lime: C.lime, red: C.red, white: C.white };
  const TINT = { ink: '#1A1A1A', lime: '#B9EC22', paper: '#E4E0D3', red: '#F0452F' };
  const NB = ' ';
  let UID = 0;
  const colOf = (k, d) => COL[k] || k || d;
  // largeur d'une chaîne (mesure réelle via un <text> caché), ramenée à `size` px
  function mkProbe(root) {
    const n = sv('text', { x: 0, y: 0, 'font-size': 100, 'font-weight': 800, visibility: 'hidden' }, root);
    const cache = {};
    return function w(str, size, o) {
      o = o || {};
      const key = (o.mono ? 'm' : 'd') + (o.sp || 0) + '|' + str;
      let v = cache[key];
      if (v === undefined) {
        n.setAttribute('font-family', o.mono ? F.mono : F.display);
        n.setAttribute('letter-spacing', (o.sp || 0) * 100);
        n.textContent = str.replace(/ /g, NB);
        try { v = n.getComputedTextLength(); } catch (e) { v = 0; }
        if (!(v > 0)) v = str.length * (o.mono ? 60 : 58);
        cache[key] = v;
      }
      return v * size / 100;
    };
  }
  // 1 234,5 : espace fine insécable pour les milliers, virgule décimale
  function fnum(v, dec) {
    const s = Math.abs(v).toFixed(dec || 0).split('.');
    const i = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return (v < 0 ? '−' : '') + i + (s[1] ? ',' + s[1] : '');
  }
  // lie ponctuation et opérateurs au mot précédent (jamais de « ? » seul en début de ligne)
  const glue = (s) => String(s).replace(/ (?=[?:%!;€¢÷×=+−])/g, NB).replace(/([÷×=+−]) (?=\S)/g, '$1' + NB);
  // coupe `str` en ≤ maxRows lignes équilibrées tenant dans maxW (null si impossible)
  function breaks(str, S, maxW, wf, maxRows) {
    if (wf(str, S) <= maxW) return [str];
    const words = str.split(' ');
    if (words.length < 2 || maxRows < 2) return null;
    let best = null, bm = 1e9;
    for (let k = 1; k < words.length; k++) {
      const a = words.slice(0, k).join(' '), b = words.slice(k).join(' ');
      const m = Math.max(wf(a, S), wf(b, S));
      if (m < bm) { bm = m; best = [a, b]; }
    }
    if (bm <= maxW) return best;
    if (maxRows >= 3 && words.length >= 3) {
      bm = 1e9; best = null;
      for (let k = 1; k < words.length - 1; k++) for (let j = k + 1; j < words.length; j++) {
        const a = words.slice(0, k).join(' '), b = words.slice(k, j).join(' '), c = words.slice(j).join(' ');
        const m = Math.max(wf(a, S), wf(b, S), wf(c, S));
        if (m < bm) { bm = m; best = [a, b, c]; }
      }
      if (bm <= maxW) return best;
    }
    return null;
  }
  // fond plat + trame de points qui dérive doucement + repères de coupe aux angles
  function backdrop(root, bgk, uid, opt) {
    opt = opt || {};
    const tint = TINT[bgk] || TINT.ink;
    const fill = bgk === 'wheel' ? C.ink : colOf(bgk, C.ink);
    rect(root, 0, 0, 1920, 1080, 0, fill);
    const o = {};
    if (opt.dots !== false) {
      const defs = sv('defs', null, root);
      o.pat = sv('pattern', { id: uid + 'd', width: 64, height: 64, patternUnits: 'userSpaceOnUse' }, defs);
      circle(o.pat, 32, 32, 3.6, tint);
      rect(root, 0, 0, 1920, 1080, 0, `url(#${uid}d)`);
    }
    if (opt.marks !== false) {
      const mc = bgk === 'ink' || bgk === 'wheel' ? '#3A3A3A' : C.ink;
      path(root, 'M56 160V56H160M1760 56H1864V160M1864 920V1024H1760M160 1024H56V920', 'none', mc, 8, { 'stroke-linecap': 'butt', 'stroke-linejoin': 'miter' });
    }
    return o;
  }
  const drift = (o, t) => { if (o && o.pat) o.pat.setAttribute('patternTransform', `translate(${f2(t * 14)} ${f2(t * 9)})`); };
  // pastille Mono (kicker) : fond/texte selon l'aplat
  function pill(parent, str, bgk, size, W) {
    const dark = bgk === 'ink' || bgk === 'wheel';
    const fill = dark ? C.lime : C.ink;
    const tc = dark ? C.ink : (bgk === 'lime' ? C.lime : C.paper);
    const sp = 0.1;
    const w = W(str, size, { mono: true, sp }) + 64, h = size * 1.7;
    const gr = g(parent);
    rect(gr, -w / 2 + 7, -h / 2 + 7, w, h, 14, C.ink);
    rect(gr, -w / 2, -h / 2, w, h, 14, fill, C.ink, 5);
    text(gr, str, 0, size * 0.35, size, tc, { mono: true, anchor: 'middle', spacing: f2(sp * size) });
    return { g: gr, w, h };
  }
  // Définition d'un composant : `build` (une fois) / `draw` (pure). La mise en page dépend des mesures de police :
  // si les polices ne sont pas encore chargées à l'init, on reconstruit dès qu'elles le sont (puis on redessine).
  const FONTS = ['800 100px "Bricolage Grotesque"', '800 100px "JetBrains Mono"'];
  const fontsOk = () => { try { return FONTS.every((f) => document.fonts.check(f)); } catch (e) { return true; } };
  function defineTypo(id, impl) {
    const rebuild = (st) => {
      while (st.root.firstChild) st.root.removeChild(st.root.firstChild);
      st.s = impl.build(st.root, st.shot);
      st.ok = true;
      if (st.last !== null) impl.draw(st.s, st.last, st.shot);
    };
    ZV.define(id, {
      init(root, shot) {
        const st = { root, shot, last: null, ok: fontsOk() };
        st.s = impl.build(root, shot);
        if (!st.ok) { try { Promise.all(FONTS.map((f) => document.fonts.load(f))).then(() => { if (!st.ok && fontsOk()) rebuild(st); }); } catch (e) { /* tant pis */ } }
        return st;
      },
      update(st, t, shot) {
        st.last = t;
        if (!st.ok && fontsOk()) rebuild(st);
        impl.draw(st.s, t, shot || st.shot);
      }
    });
  }

  const FR = 1 / 30;
  const MARQ_DEFAULT = 'ZÉRO VERT · LA MAISON GAGNE TOUJOURS · ';
  // symboles des rouleaux de la machine à sous (dessinés à plat)
  function slotSymbol(parent, kind, cell) {
    const gr = g(parent);
    if (kind === 0) { circle(gr, 0, 0, cell * 0.32, C.lime, C.ink, 6); text(gr, '0', 0, cell * 0.17, cell * 0.46, C.ink, { mono: true, anchor: 'middle' }); }
    else if (kind === 1) { text(gr, '7', 0, cell * 0.28, cell * 0.8, C.red, { anchor: 'middle' }); }
    else if (kind === 2) { rect(gr, -cell * 0.36, -cell * 0.2, cell * 0.72, cell * 0.4, 10, C.ink); for (let k = -1; k <= 1; k++) line(gr, -cell * 0.24, k * cell * 0.1, cell * 0.24, k * cell * 0.1, C.paper, 5); }
    else if (kind === 3) { circle(gr, 0, 0, cell * 0.26, C.red, C.ink, 6); }
    else { rect(gr, -cell * 0.24, -cell * 0.24, cell * 0.48, cell * 0.48, 8, C.paper, C.ink, 6); }
    return gr;
  }

  defineTypo('chapter-card', {
    build(root, shot) {
      const P = shot.props || {};
      const next = P.variant === 'next';
      const bgk = P.bg === 'lime' ? 'lime' : 'ink';
      const dark = bgk === 'ink';
      const uid = 'cc' + (++UID);
      const W = mkProbe(root);
      const st = { shot, bgk, dark, next, uid, W };
      st.bd = backdrop(root, bgk, uid, { marks: false });
      const accent = dark ? C.lime : C.ink;           // couleur d'accent (stickers de repère)
      const onAccent = dark ? C.ink : C.lime;
      const fg = dark ? C.paper : C.ink;
      const cue = (n, d) => { const v = ZV.cue(shot, n); return v === null ? d : v; };

      // ---- fantôme géant (le « gros mot ») ----
      if (P.big) {
        const big = String(P.big).toUpperCase();
        const w100 = W(big, 100, { sp: -0.03 });
        const S = Math.min(780, 1760 / (w100 / 100));
        const gg = g(root);
        const tx = text(gg, big, 0, 0, S, 'none', { anchor: 'middle', spacing: f2(-0.03 * S) });
        tx.setAttribute('stroke', dark ? '#3C3C3C' : C.ink); tx.setAttribute('stroke-width', 4); if (!dark) tx.setAttribute('opacity', 0.3); tx.setAttribute('stroke-linejoin', 'round');
        st.ghost = { g: gg, y: 640 + 0.36 * S };
      }
      // ---- bandeau marquee en haut ----
      {
        const gm = g(root), sz = 38, sp = 0.06, MARQ = String(P.marquee || MARQ_DEFAULT);
        rect(gm, 0, 0, 1920, 88, 0, dark ? C.lime : C.ink);
        const unit = W(MARQ, sz, { mono: false, sp });
        const n = Math.ceil(1920 / unit) + 2;
        st.mq = { unit, node: text(gm, MARQ.repeat(n).replace(/ /g, NB), 0, 58, sz, dark ? C.ink : C.lime, { spacing: f2(sp * sz) }) };
        rect(gm, 0, 88, 1920, 8, 0, C.ink);
      }
      // ---- pastille / numéro ----
      const mkSticker = (str, fill, tcol, size, mono, tilt) => {
        const w = W(str, size, { mono, sp: mono ? 0.04 : 0 }) + 64, h = size * 1.75;
        const gr = g(root);
        rect(gr, -w / 2 + 10, -h / 2 + 10, w, h, 16, C.ink);
        rect(gr, -w / 2, -h / 2, w, h, 16, fill, C.ink, 6);
        text(gr, str, 0, size * 0.36, size, tcol, { mono, anchor: 'middle', spacing: mono ? f2(0.04 * size) : 0 });
        return { g: gr, w, h, tilt };
      };
      st.num = P.num ? mkSticker(String(P.num), accent, onAccent, 54, true, -3) : null;
      if (st.num) { st.num.x = 160 + st.num.w / 2; st.num.y = 196; }
      if (next) {
        st.kick = mkSticker(String(P.kick || 'PROCHAIN ÉPISODE').toUpperCase(), C.paper, C.ink, 46, true, 2);
        st.kick.x = 160 + st.kick.w / 2; st.kick.y = 236;
        if (st.num) { st.num.x = 160 + st.num.w / 2; st.num.y = 720; }
      }

      // ---- titre : mot par mot ----
      const title = String(P.title || '').replace(/ (?=[?:!;])/g, NB);
      const wf = (s, S) => W(s, S, { sp: -0.03 });
      const maxW = next ? 920 : 1560;
      let S = next ? 300 : 200, rows = null;
      for (; S > 60; S *= 0.96) { rows = breaks(title, S, maxW, wf, next ? 1 : 2); if (rows && (rows.length - 1) * 1.0 * S + 0.74 * S <= (next ? 400 : 330)) break; rows = null; }
      if (!rows) { S = 60; rows = [title]; }
      const th = (rows.length - 1) * 1.0 * S + 0.74 * S;
      const top = next ? 390 : 290;
      st.words = [];
      let wi = 0;
      const nWords = title.split(' ').length;
      rows.forEach((row, ri) => {
        const words = row.split(' ');
        let acc = '';
        words.forEach((wd, k) => {
          const wx = 160 + wf(acc, S), ww = wf(wd, S);
          const by = top + 0.74 * S + ri * S;
          const gr = g(root);
          const last = ++wi === nWords;
          if (last) {
            rect(gr, -ww / 2 - 16 + 10, -0.47 * S + 10, ww + 32, 1.12 * S, 16, C.ink);
            rect(gr, -ww / 2 - 16, -0.47 * S, ww + 32, 1.12 * S, 16, accent, C.ink, 6);
          }
          text(gr, wd.replace(/ /g, NB), -ww / 2, 0.37 * S, S, last ? onAccent : fg, { spacing: f2(-0.03 * S) });
          st.words.push({ g: gr, x: wx + ww / 2, y: by - 0.37 * S, i: st.words.length });
          acc += wd + ' ';
        });
      });
      st.tTitle = cue('title', next ? 0 : 0.3);
      const bottom = top + th;

      // ---- légende (cap), sticker de repère, onglets ----
      if (P.cap && !next) {
        st.cap = mkSticker(String(P.cap), C.paper, C.ink, 54, false, 2);
        st.cap.x = 160 + st.cap.w / 2; st.cap.y = bottom + 122;
        st.tCap = cue('cap', st.tTitle + 0.35 + 0.11 * nWords + 0.4);
      }
      const sb = shot.beats.find((b) => b.do === 'cue' && b.name === 'sticker');
      if (sb && sb.text && !next) {
        st.stk = mkSticker(String(sb.text).toUpperCase(), accent, onAccent, 54, false, 4);
        st.stk.x = 1920 - 150 - st.stk.w / 2; st.stk.y = bottom + 122; st.tStk = sb.t;
      }
      const tb = shot.beats.find((b) => b.do === 'cue' && b.name === 'tabs');
      if (tb && !next) {
        st.tabs = (tb.tabs || ['S1', 'S2', 'S3', 'S4']).map((s, i) => {
          const gr = g(root);
          rect(gr, -58 + 7, -32 + 7, 116, 64, 12, C.ink);
          rect(gr, -58, -32, 116, 64, 12, C.paper, C.ink, 5);
          text(gr, String(s), 0, 14, 38, C.ink, { mono: true, anchor: 'middle' });
          return { g: gr, x: 160 + 58 + i * 136, y: bottom + 232, t: tb.t + i * 0.12 };
        });
      }

      // ---- variante « prochain épisode » : machine à sous ----
      if (next) {
        const gs = g(root), body = g(gs);
        rect(body, -270 + 16, -250 + 16, 540, 500, 36, C.ink);
        rect(body, -270, -250, 540, 500, 36, C.red, C.ink, 8);
        rect(body, -230, -226, 460, 70, 18, C.ink);
        text(body, String(P.brand || 'ZÉRO VERT'), 0, -176, 44, C.lime, { mono: true, anchor: 'middle', spacing: 4 });
        const wx = -216, wy = -128, ww = 432, wh = 230;
        rect(body, wx - 10, wy - 10, ww + 20, wh + 20, 22, C.ink);
        rect(body, wx, wy, ww, wh, 14, C.paper);
        const clipId = uid + 'c';
        const defs = sv('defs', null, gs);
        const cp = sv('clipPath', { id: clipId }, defs); rect(cp, wx, wy, ww, wh, 14);
        const reelsG = g(gs, { 'clip-path': `url(#${clipId})` });
        const cell = 118, N = 5, seqs = [[1, 0, 2, 3, 4], [0, 2, 1, 4, 3], [3, 1, 0, 2, 4]];
        st.reels = seqs.map((seq, k) => {
          const rx = wx + ww / 6 + k * (ww / 3);
          const col = g(reelsG);
          for (let c = 0; c < N * 2; c++) { const sg = slotSymbol(col, seq[c % N], cell); sg.setAttribute('transform', `translate(0 ${c * cell})`); }
          col.setAttribute('data-x', rx);
          if (k > 0) line(gs, wx + k * (ww / 3), wy, wx + k * (ww / 3), wy + wh, C.ink, 5);
          return { col, x: rx, cell, N, v: [640 + k * 130, 1500 + k * 210] };
        });
        rect(gs, wx, wy, ww, wh, 14, 'none', C.ink, 6);
        // ligne de gain + plateau
        line(gs, wx - 22, wy + wh / 2, wx + 22, wy + wh / 2, C.lime, 8);
        line(gs, wx + ww - 22, wy + wh / 2, wx + ww + 22, wy + wh / 2, C.lime, 8);
        rect(gs, -200, 130, 400, 60, 14, C.ink);
        circle(gs, -120, 160, 14, C.lime); circle(gs, 0, 160, 14, C.paper); circle(gs, 120, 160, 14, C.red);
        // levier
        st.lever = g(gs);
        line(st.lever, 0, 0, 0, -150, C.ink, 14);
        circle(st.lever, 0, -160, 30, C.lime, C.ink, 7);
        st.lever.setAttribute('data-x', 300);
        st.slot = gs; st.tSlot = cue('slot', 1.5); st.tReels = ZV.cue(shot, 'reels');
        st.reelsG = reelsG;
      }
      return st;
    },

    draw(st, t, shot) {
      drift(st.bd, t);
      const dark = st.dark;
      // marquee
      st.mq.node.setAttribute('x', f2(-((t * 140) % st.mq.unit)));
      // fantôme
      if (st.ghost) {
        const q = clamp(t / 0.35), s = lerp(1.25, 1, ZV.E.out3(q));
        const [sx, sy] = ZV.shakeAt(t, 0.12, 10, 0.4);
        put(st.ghost.g, 960 + lerp(46, -46, clamp(t / shot.dur)) + sx, st.ghost.y + sy, 0, s, s, t >= 0.02 ? 1 : 0);
      }
      const pop = (o, tp, extraRot) => { if (!o) return; const p = ZV.E.back(clamp((t - tp) / (8 * FR))); put(o.g, o.x, o.y, (o.tilt || 0) + (1 - p) * (extraRot || -6), p, p, t >= tp ? 1 : 0); };
      pop(st.num, 0.05);
      pop(st.kick, 0.0);
      // titre
      for (const w of st.words) {
        const tw = st.tTitle + w.i * 0.11, tt = t - tw;
        if (tt < 0) { put(w.g, w.x, w.y, 0, 1, 1, 0); continue; }
        const p = clamp(tt / (4 * FR)), s = lerp(2.1, 1, ZV.E.out3(p));
        const [sx, sy] = ZV.shakeAt(tt, 4 * FR, 8, 0.3);
        put(w.g, w.x + sx, w.y + sy, 0, s, s, 1);
      }
      pop(st.cap, st.tCap || 0);
      pop(st.stk, st.tStk || 0, 8);
      if (st.tabs) for (const tb of st.tabs) pop(tb, tb.t, 0);
      // machine à sous
      if (st.slot) {
        const ts = st.tSlot, q = clamp((t - ts) / (10 * FR));
        const y = lerp(-420, 500, q < 1 ? ZV.E.in2(q) : 1);
        let yy = y;
        if (t > ts + 10 * FR) { const b = (t - ts - 10 * FR); yy = 500 + (b < 0.35 ? -26 * Math.exp(-b * 9) * Math.abs(Math.sin(b * 16)) : 0); }
        put(st.slot, 1420, yy, t >= ts ? 2.5 : 0, 1.1, 1.1, t >= ts ? 1 : 0);
        for (const r of st.reels) {
          const span = r.cell * r.N, t0 = ts + 0.2;
          const tr = st.tReels !== null && st.tReels !== undefined ? st.tReels : 1e9;
          const d1 = Math.max(0, Math.min(t, tr) - t0), d2 = Math.max(0, t - tr);
          const pos = (r.v[0] * d1 + r.v[1] * d2) % span;
          r.col.setAttribute('transform', `translate(${r.x} ${f2(-(pos) - r.cell * 0.5)})`);
        }
        // levier : tiré au repère « reels », relâché ensuite
        const tr = st.tReels;
        let pull = 0; if (tr !== null && tr !== undefined) { const q2 = t - tr; pull = q2 < 0 ? 0 : q2 < 0.18 ? q2 / 0.18 : Math.max(0, 1 - (q2 - 0.18) / 0.3); }
        put(st.lever, 300, -60 + 70 * pull, 0, 1, 1 - 0.0 * pull, 1);
        st.lever.setAttribute('transform', `translate(300 ${f2(-50 + 60 * pull)}) scale(1 ${f2(1 - 0.55 * pull)})`);
      }
    }
  });
})();
;
/* ==== tools/video/composition/components/chase-meter.js ==== */
// Composant `chase-meter` : la règle graduée de « se refaire » (mode ruler) et la perte « provisoire » qui devient « vraie » (mode pending).
// ruler  : cues start, quote, aside, back, accel, promise, green. pending : cues pending, stand, real.
// Aplats, bordures, ombres dures ; aucun dégradé / flou / filter. Rien ne clignote : tout est un mouvement unique.
(() => {
  'use strict';
  const { C, E, clamp, prog, lerp, f2, sv, g, rect, circle, path, line, text, put, shakeAt } = ZV;
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const str = (v, d) => (typeof v === 'string' && v.trim() ? v.trim() : d);
  const num = (v, d) => (isNum(v) ? v : d);
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const vis = (n, on) => setA(n, 'visibility', on ? 'visible' : 'hidden');
  const measure = (n, size) => { try { const w = n.getComputedTextLength(); if (w > 0) return w; } catch (e) { /* hors DOM */ } return (n.textContent || '').length * size * 0.62; };
  function fitText(n, size, maxW, y0) {
    const w = measure(n, size);
    if (w > maxW) { const s = size * maxW / w; n.setAttribute('font-size', f2(s)); if (y0 !== undefined) n.setAttribute('y', f2(y0 * s / size)); return maxW; }
    return w;
  }
  // étiquette plate centrée sur (0,0), ombre dure
  function mkTag(parent, s, size, o) {
    o = o || {};
    const grp = g(parent);
    const tx = text(grp, s, 0, size * 0.35, size, o.tfill || C.ink, { anchor: 'middle', mono: o.mono });
    const w = fitText(tx, size, o.maxW || 900, size * 0.35);
    const bw = w + 2 * (o.padX === undefined ? 26 : o.padX), bh = o.h || size * 1.75, sh = o.sh === undefined ? 8 : o.sh, r = o.r === undefined ? 12 : o.r;
    const a = rect(grp, -bw / 2 + sh, -bh / 2 + sh, bw, bh, r, o.shFill || C.ink);
    const b = rect(grp, -bw / 2, -bh / 2, bw, bh, r, o.fill || C.paper, o.stroke || C.ink, o.sw || 6);
    grp.insertBefore(a, tx); grp.insertBefore(b, tx);
    return { g: grp, w: bw, h: bh, tx };
  }

  const RY = 470, X0 = 140, XZ = 1640, PX = 10; // règle
  const X = (v) => clamp(XZ + v * PX, X0 + 60, XZ);

  /* ====================== mode ruler ====================== */
  function initRuler(root, shot, p, st) {
    const value = num(p.value, -40), cur = str(p.currency, '€');
    st.xv = X(value); st.xd = X(num(p.drift_to, -110));
    st.clockFrom = num(p.clock_from, 12); st.clockTo = num(p.clock_to, 19);
    st.from = p.from === 'start' || p.from === 'accel' ? p.from : 'none';
    const gs = (v) => (v < 0 ? '−' : '') + Math.abs(v).toLocaleString('fr-FR').replace(/ | /g, ' ');
    const cc = ZV.cue;
    st.t = { start: cc(shot, 'start'), quote: cc(shot, 'quote'), aside: cc(shot, 'aside'), back: cc(shot, 'back'), accel: cc(shot, 'accel'), promise: cc(shot, 'promise'), green: cc(shot, 'green') };

    rect(root, 0, 0, 1920, 1080, 0, C.ink);
    // règle
    st.fadeG = g(root); // éléments qui s'effacent au cue green
    const rl = g(root);
    rect(rl, X0, RY - 4, XZ - X0 + 4, 8, 0, C.paper);
    for (let k = 0; k <= 15; k++) { const x = X0 + k * 100; line(rl, x, RY + 6, x, RY + 28, C.paper, 5, { 'stroke-linecap': 'butt' }); }

    // drapeau du zéro
    st.flag = g(root);
    rect(st.flag, -75 + 9, -75 + 9, 150, 150, 0, C.ink);
    rect(st.flag, -75, -75, 150, 150, 0, C.lime, C.ink, 6);
    text(st.flag, '0', 0, 38, 110, C.ink, { anchor: 'middle' });

    // flèche de l'intention (centre au milieu entre le jeton et le drapeau)
    const ax0 = st.xv, ax1 = 1700, L = Math.max(240, ax1 - ax0), cx = (ax0 + ax1) / 2, AY = 600;
    st.arrow = g(st.fadeG, { transform: `translate(${f2(cx)} ${AY})` });
    st.flipG = g(st.arrow);
    st.dashG = g(st.flipG);
    st.dashEls = [];
    const hl = 78, segW = 40, gap = 14, nSeg = Math.max(3, Math.floor((L - hl) / (segW + gap)));
    for (let i = 0; i < nSeg; i++) st.dashEls.push(rect(st.dashG, -L / 2 + i * (segW + gap), -9, segW, 18, 3, C.paper, C.ink, 4));
    st.dashEls.push(path(st.dashG, `M${f2(L / 2 - hl)} -34 L${f2(L / 2)} 0 L${f2(L / 2 - hl)} 34Z`, C.paper, C.ink, 5));
    st.solid = path(st.flipG, `M${f2(-L / 2)} -10 L${f2(L / 2 - hl)} -10 L${f2(L / 2 - hl)} -36 L${f2(L / 2)} 0 L${f2(L / 2 - hl)} 36 L${f2(L / 2 - hl)} 10 L${f2(-L / 2)} 10Z`, C.red, C.ink, 6);
    st.arrowCx = cx;
    st.lbBack = mkTag(st.fadeG, str(p.back, 'MARCHE ARRIÈRE'), 34, { mono: true, maxW: 520, h: 62, fill: C.paper });
    st.lbAcc = mkTag(st.fadeG, str(p.accel, 'ACCÉLÉRATEUR'), 34, { mono: true, maxW: 520, h: 62, fill: C.red });
    // bulles
    const mkBubble = (s) => {
      const b = g(st.fadeG);
      const tx = text(b, '', 170, 0, 52, C.ink);
      const words = s.split(/\s+/).filter(Boolean);
      const spans = words.map((w, i) => { if (i) tx.appendChild(document.createTextNode(' ')); const sp = sv('tspan', null, tx); sp.textContent = w; return sp; });
      let size = 52; tx.setAttribute('font-size', size);
      const w0 = measure(tx, size);
      if (w0 > 880) { size = 52 * 880 / w0; tx.setAttribute('font-size', f2(size)); }
      const W = Math.max(380, Math.min(960, measure(tx, size) + 60));
      tx.setAttribute('y', f2(160 + size * 0.35));
      const sh = rect(b, 140 + 10, 100 + 10, W, 120, 0, C.ink);
      const poly = path(b, 'M0 0', C.paper, C.ink, 6);
      const body = rect(b, 140, 100, W, 120, 0, C.paper, C.ink, 6);
      const seam = rect(b, 0, 216, 10, 7, 0, C.paper);
      [sh, poly, body, seam].forEach((n) => b.insertBefore(n, tx));
      return { g: b, spans, poly, seam, W, n: words.length };
    };
    st.bq = mkBubble(str(p.quote, 'JE SUIS À −40. JE M\'ARRÊTE À ZÉRO.'));
    st.bp = mkBubble(str(p.promise, 'ENCORE 10 € ET JE RENTRE'));
    // horloge
    st.clock = g(st.fadeG.parentNode === root ? root : root);
    circle(st.clock, 0, 0, 70, C.paper, C.ink, 6);
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; line(st.clock, Math.sin(a) * 56, -Math.cos(a) * 56, Math.sin(a) * 63, -Math.cos(a) * 63, C.ink, i % 3 ? 3 : 5, { 'stroke-linecap': 'butt' }); }
    st.hh = line(st.clock, 0, 0, 0, -38, C.ink, 9);
    st.mh = line(st.clock, 0, 0, 0, -54, C.ink, 6);
    circle(st.clock, 0, 0, 7, C.ink);
    const mid = st.clockFrom === 12 ? 'MIDI' : `${st.clockFrom} H`;
    st.cl0 = text(root, mid, 1720, 280, 26, C.paper, { anchor: 'middle', mono: true });
    st.cl1 = text(root, `${st.clockTo} H`, 1720, 280, 26, C.paper, { anchor: 'middle', mono: true });
    st.aside = mkTag(root, str(p.aside, 'IL EST LÀ DEPUIS MIDI'), 30, { mono: true, maxW: 400, h: 56, padX: 22 });
    // jeton
    st.tok = g(root);
    circle(st.tok, 6, 7, 46, C.ink);
    circle(st.tok, 0, 0, 46, C.white, C.ink, 6);
    for (let i = 0; i < 8; i++) { const a = i * 45; rect(st.tok, -6, -40, 12, 20, 2, C.lime, C.ink, 3, { transform: `rotate(${a})` }); }
    circle(st.tok, 0, 0, 14, C.white, C.ink, 4);
    st.lbVal = mkTag(root, `${gs(value)} ${cur}`, 44, { mono: true, maxW: 360, h: 74 });
    st.lbFar = mkTag(root, 'PLUS LOIN DE ZÉRO', 36, { mono: true, maxW: 470, h: 70 });
    st.lbVal.tx.parentNode.setAttribute('class', 'lbv');
    // petite étiquette rouge « −10 € »
    st.ten = mkTag(root, `−10 ${cur}`, 32, { mono: true, h: 54, fill: C.red, padX: 18 });
    // vert
    st.green = mkTag(root, str(p.green, 'IL EST VERT. IL NE REND RIEN.'), 38, { maxW: 700, h: 60, fill: C.ink, tfill: C.lime, stroke: C.lime, sw: 5, shFill: C.pocket, padX: 28 });
    st.gw = st.green.w;
    // la flèche va sous l'horloge/légende : ordre des couches
    root.appendChild(st.flag); root.appendChild(st.green.g);
  }

  function updRuler(st, t) {
    const T = st.t, fs = st.from !== 'none', fa = st.from === 'accel';
    const tS = T.start, tG = T.green;
    const gp = tG == null ? 0 : prog(t, tG, tG + 0.3);
    /* ---- position du jeton ---- */
    let x = fa ? st.xd : st.xv, hop = 0;
    if (!fa && T.accel != null) {
      let sum = 0;
      for (let k = 0; k < 4; k++) { const s0 = T.accel + 0.1 + 0.5 * k, q = prog(t, s0, s0 + 0.14); sum += E.out2(q); if (q > 0 && q < 1) hop = Math.sin(Math.PI * q) * 12; }
      x = st.xv + (st.xd - st.xv) * sum / 4;
    }
    if (T.promise != null) { const s0 = T.promise + 0.8, q = prog(t, s0, s0 + 0.2); x -= 100 * E.out2(q); if (q > 0 && q < 1) hop = Math.max(hop, Math.sin(Math.PI * q) * 12); x = Math.max(x, 200); }
    let ty = 420 - hop, tokOn = fs || tS == null || t >= tS;
    if (!fs && tS != null && t >= tS) { const q = prog(t, tS, tS + 0.5); ty = 420 - (1 - E.bounce(q)) * 380 - hop; }
    put(st.tok, x, ty, 0, 1, 1, tokOn ? 1 : 0);

    /* ---- étiquette du jeton ---- */
    const far = fa || (T.accel != null && t >= T.accel + 0.05);
    const lt0 = fs || tS == null ? -9 : tS + 0.45;
    const lq = prog(t, lt0, lt0 + 0.2), lq2 = T.accel != null && !fa ? prog(t, T.accel + 0.05, T.accel + 0.25) : 1;
    const lsc = far ? 1 + 0.3 * (1 - E.out3(lq2)) : 1 + 0.35 * (1 - E.out3(lq));
    const lon = lq > 0;
    const ly = 300 - hop * 0.5;
    put(st.lbVal.g, x, ly, -3, lsc, lsc, lon && !far ? 1 : 0);
    put(st.lbFar.g, x, ly, -3, lsc, lsc, lon && far ? 1 : 0);

    /* ---- bulles ---- */
    const bubble = (b, t0, t1) => {
      const q = t0 == null ? 0 : prog(t, t0, t0 + 0.16);
      let o = q > 0 ? 1 : 0;
      if (t1 != null) o = t >= t1 ? 0 : o;
      o *= 1 - gp;
      const sc = 0.92 + 0.08 * E.out3(q);
      b.g.setAttribute('transform', `translate(140 160) scale(${f2(sc)}) translate(-140 -160)`);
      vis(b.g, o > 0.01);
      const perW = Math.min(0.22, 1.8 / Math.max(1, b.n));
      b.spans.forEach((sp, i) => setA(sp, 'fill-opacity', t >= t0 + 0.12 + i * perW ? 1 : 0));
      setA(b.g, 'opacity', f2(o));
      const tipX = clamp(x - 40, 170, 1800), tipY = 262;
      const x1 = clamp(tipX - 40, 170, 140 + b.W - 100);
      setA(b.poly, 'd', `M${f2(x1)} 214 L${f2(x1 + 80)} 214 L${f2(tipX)} ${tipY}Z`);
      setA(b.seam, 'x', f2(x1 + 3)); setA(b.seam, 'width', 56);
    };
    bubble(st.bq, T.quote, T.promise);
    bubble(st.bp, T.promise == null ? null : T.promise + 0.1, null);

    /* ---- horloge et aparté ---- */
    const cA = fa ? 1 : T.aside == null ? 0 : prog(t, T.aside, T.aside + 0.3);
    const cs = cA > 0 ? E.back(cA) : 0;
    put(st.clock, 1720, 180, 0, cs, cs, cA > 0 ? 1 : 0);
    const a0 = (st.clockFrom % 12) * 30;
    let span = ((st.clockTo - st.clockFrom) % 12 + 12) % 12; if (span === 0 && st.clockTo !== st.clockFrom) span = 12;
    const pp = T.promise == null ? 0 : E.io2(prog(t, T.promise, T.promise + 2));
    setA(st.hh, 'transform', `rotate(${f2(a0 + span * 30 * pp)})`);
    setA(st.mh, 'transform', `rotate(${f2(1080 * pp)})`);
    const done = T.promise != null && t >= T.promise + 2;
    vis(st.cl0, cA > 0.5 && !done); vis(st.cl1, cA > 0.5 && done);
    const aq = fa ? 1 : T.aside == null ? 0 : prog(t, T.aside + 0.25, T.aside + 0.5);
    put(st.aside.g, 1600 - st.aside.w / 2 + 40 * (1 - E.out3(aq)), 150, 2, 1, 1, aq > 0 ? 1 : 0);

    /* ---- flèche ---- */
    const bq = T.back == null ? 0 : prog(t, T.back, T.back + 0.4);
    const accOn = fa || (T.accel != null && t >= T.accel);
    const nEl = st.dashEls.length;
    st.dashEls.forEach((e, i) => vis(e, bq > 0 && Math.floor(bq * nEl + 1e-6) >= i + 1 || bq >= 1));
    vis(st.dashG, bq > 0 && !accOn);
    vis(st.solid, accOn);
    const fp = !fa && T.accel != null ? prog(t, T.accel, T.accel + 0.27) : 1;
    const sx = accOn ? Math.cos(Math.PI * E.io2(fp)) : 1;
    setA(st.flipG, 'transform', `scale(${f2(Math.abs(sx) < 0.04 ? 0.04 * (sx < 0 ? -1 : 1) : sx)} 1)`);
    const arrOn = (bq > 0 || accOn) && gp < 1;
    setA(st.arrow, 'opacity', f2(1 - gp)); vis(st.arrow, arrOn);
    const lb0 = T.back == null ? 0 : prog(t, T.back + 0.3, T.back + 0.5);
    const lsB = 1 + 0.3 * (1 - E.out3(lb0));
    put(st.lbBack.g, st.arrowCx, 706, 0, lsB, lsB, lb0 > 0 && !accOn && gp < 1 ? 1 - gp : 0);
    const la = fa ? 1 : T.accel == null ? 0 : prog(t, T.accel + 0.1, T.accel + 0.3);
    const lsA = 1 + 0.3 * (1 - E.out3(la));
    put(st.lbAcc.g, st.arrowCx, 706, 0, lsA, lsA, la > 0 && accOn && gp < 1 ? 1 - gp : 0);

    /* ---- étiquette « −10 € » ---- */
    if (T.promise != null) {
      const q = prog(t, T.promise + 0.5, T.promise + 1.05), e = E.out2(q);
      const x0 = fa || T.accel != null ? st.xd : st.xv;
      const sx0 = x0, sx1 = x0 + 110, ay = lerp(380, 408, E.in2(q)) - 110 * Math.sin(Math.PI * q);
      put(st.ten.g, lerp(sx0, sx1, e), ay, lerp(0, 5, e), 1, 1, q > 0 ? 1 : 0);
    } else put(st.ten.g, 0, 0, 0, 0, 0, 0);

    /* ---- drapeau et « vert » ---- */
    const fsc = 1 + 0.25 * E.back(gp);
    put(st.flag, 1715, 470, 0, fsc, fsc, 1);
    const gq = tG == null ? 0 : prog(t, tG + 0.1, tG + 0.4);
    const gs = gq > 0 ? E.back(gq) : 0;
    put(st.green.g, 1790 - st.gw / 2, 222, 0, gs, gs, gq > 0 ? 1 : 0);
  }

  /* ====================== mode pending ====================== */
  function initPending(root, shot, p, st) {
    const cc = ZV.cue;
    st.t = { pending: cc(shot, 'pending'), stand: cc(shot, 'stand'), real: cc(shot, 'real') };
    rect(root, 0, 0, 1920, 1080, 0, C.ink);
    const loss = str(p.loss, '−40 €');
    // montant : mesure
    const mk = (fill, stroke, sw, extra) => { const n = text(root, loss, 720, 510, 260, fill, { anchor: 'middle' }); n.setAttribute('fill', fill); if (stroke) { n.setAttribute('stroke', stroke); n.setAttribute('stroke-width', sw); n.setAttribute('stroke-linejoin', 'round'); } if (extra) for (const k in extra) n.setAttribute(k, extra[k]); return n; };
    st.shadow = mk(C.paper, null);
    st.real = mk(C.red, C.ink, 20, { 'paint-order': 'stroke' });
    st.out = mk('none', C.paper, 12, { 'stroke-dasharray': '24 14' });
    st.cover = mk(C.ink, null);
    let size = 260; const w0 = measure(st.out, 260);
    if (w0 > 900) { size = 260 * 900 / w0; [st.shadow, st.real, st.out, st.cover].forEach((n) => { n.setAttribute('font-size', f2(size)); n.setAttribute('y', f2(420 + size * 0.35)); }); }
    st.size = size; st.baseY = 420 + size * 0.35;
    const wid = Math.min(measure(st.out, size), 900);
    st.clipRect = rect(sv('clipPath', { id: 'cm-clip' }, sv('defs', null, root)), 720 - wid / 2 - 30, 0, 0, 1080, 0, '#000');
    st.out.setAttribute('clip-path', 'url(#cm-clip)'); root.appendChild(st.cover); root.insertBefore(st.out, st.cover);
    st.cw = wid + 60; st.cx0 = 720 - wid / 2 - 30;
    st.legend = text(root, str(p.label, 'PROVISOIRE · EN ATTENTE'), 720, 600, 34, C.paper, { anchor: 'middle', mono: true });
    st.legend2 = text(root, str(p.real, 'ELLE DEVIENT VRAIE'), 720, 600, 34, C.red, { anchor: 'middle', mono: true });
    fitText(st.legend, 34, 900); fitText(st.legend2, 34, 900);
    // tampon
    const stp = mkTag(root, str(p.stamp, 'DÉFINITIVE'), 74, { maxW: 560, h: 104, fill: C.paper, tfill: C.red, sw: 7, sh: 10, r: 8, padX: 34 });
    st.stamp = stp.g;
    // sol, table, chaise, silhouette
    line(root, 1180, 702, 1800, 702, C.paper, 6);
    st.chair = g(root);
    const ch = st.chair;
    [[1460, 590, 26, 112], [1596, 590, 26, 112]].forEach((r) => rect(ch, r[0], r[1], r[2], r[3], 2, C.paper, C.ink, 5));
    rect(ch, 1596, 372, 30, 222, 4, C.paper, C.ink, 6);
    rect(ch, 1430, 556, 196, 38, 4, C.paper, C.ink, 6);
    st.fig = g(root);
    const limb = (a, b, w) => { const l = line(st.fig, 0, 0, 0, 0, C.paper, w + 8); const m = line(st.fig, 0, 0, 0, 0, C.pocket, w); return { l, m, a, b }; };
    // poses assise / debout (hanche, genou, pied, épaule, tête, main)
    st.pose0 = { hip: [1530, 540], knee: [1432, 548], foot: [1424, 668], sh: [1538, 434], head: [1542, 366], hand: [1408, 512] };
    st.pose1 = { hip: [1520, 470], knee: [1514, 574], foot: [1508, 668], sh: [1524, 352], head: [1526, 286], hand: [1516, 476] };
    st.limbs = { thigh: limb('hip', 'knee', 54), shin: limb('knee', 'foot', 44), torso: limb('hip', 'sh', 70), arm: limb('sh', 'hand', 28) };
        st.headO = circle(st.fig, 0, 0, 38, C.paper); st.headI = circle(st.fig, 0, 0, 34, C.pocket);
    // table (devant la silhouette)
    st.table = g(root);
    rect(st.table, 1262, 520, 150, 28, 2, C.ink, C.paper, 4);
    rect(st.table, 1282, 548, 26, 154, 0, C.ink, C.paper, 4);
  }

  function updPending(st, t) {
    const T = st.t, { size, baseY } = st;
    const tp = T.pending, tr = T.real, ts = T.stand;
    // contour (visible dès le début si pas de cue)
    const q = tp == null ? 1 : prog(t, tp, tp + 0.47);
    const realOn = tr != null && t >= tr;
    const shake = tr == null ? [0, 0] : shakeAt(t, tr, 10, 0.4);
    setA(st.clipRect, 'width', f2(st.cw * q));
    setA(st.out, 'stroke-dashoffset', f2(-t * 40));
    vis(st.out, q > 0 && !realOn); vis(st.cover, q > 0 && !realOn);
    // l'état « réel » : fond paper en ombre dure, rouge par-dessus
    const rq = tr == null ? 0 : E.out3(prog(t, tr, tr + 0.2));
    vis(st.real, realOn); vis(st.shadow, realOn);
    const sk = 14 * rq;
    st.real.setAttribute('transform', `translate(${f2(shake[0])} ${f2(shake[1])})`);
    st.shadow.setAttribute('transform', `translate(${f2(shake[0] + sk)} ${f2(shake[1] + sk)})`);
    setA(st.shadow, 'stroke', C.paper); setA(st.shadow, 'stroke-width', 20); setA(st.shadow, 'stroke-linejoin', 'round');
    vis(st.legend, !realOn); vis(st.legend2, realOn);
    const ly = realOn ? lerp(600, 735, E.out3(prog(t, tr, tr + 0.25))) : 600;
    setA(st.legend2, 'y', f2(ly));
    setA(st.legend, 'opacity', f2(tp == null ? 1 : prog(t, tp + 0.35, tp + 0.6)));
    // tampon
    const sq = tr == null ? 0 : prog(t, tr + 0.25, tr + 0.4);
    const ss = sq > 0 ? 1 + 1.2 * (1 - E.out3(sq)) : 0;
    put(st.stamp, 720 + shake[0] * 0.3, 616, -8, ss, ss, sq > 0 ? 1 : 0);
    // silhouette qui se lève
    const sp = ts == null ? 0 : prog(t, ts, ts + 0.6);
    const rise = E.out2(clamp(sp / 0.35)), walk = E.in2(clamp((sp - 0.3) / 0.7));
    const dx = 520 * walk;
    const P = (k) => { const a = st.pose0[k], b = st.pose1[k]; return [lerp(a[0], b[0], rise) + dx, lerp(a[1], b[1], rise)]; };
    const hand = P('hand');
    for (const n in st.limbs) {
      const L = st.limbs[n]; const a = P(L.a), b = P(L.b);
      [L.l, L.m].forEach((e) => { setA(e, 'x1', f2(a[0])); setA(e, 'y1', f2(a[1])); setA(e, 'x2', f2(b[0])); setA(e, 'y2', f2(b[1])); });
    }
    const hd = P('head');
    setA(st.headO, 'cx', f2(hd[0])); setA(st.headO, 'cy', f2(hd[1])); setA(st.headI, 'cx', f2(hd[0])); setA(st.headI, 'cy', f2(hd[1]));
    vis(st.fig, sp < 1);
    const cp = ts == null ? 0 : E.out2(prog(t, ts + 0.1, ts + 0.5));
    setA(st.chair, 'transform', `translate(${f2(30 * cp)} 0)`);
  }

  ZV.define('chase-meter', {
    init(root, shot) {
      const p = (shot && shot.props) || {};
      const st = { mode: p.mode === 'pending' ? 'pending' : 'ruler' };
      shot = shot || { beats: [] }; if (!Array.isArray(shot.beats)) shot = Object.assign({}, shot, { beats: [] });
      try { (st.mode === 'pending' ? initPending : initRuler)(root, shot, p, st); } catch (e) { st.err = e; if (window.console) console.error(e); }
      return st;
    },
    update(st, t) {
      if (!st || st.err) return;
      try { (st.mode === 'pending' ? updPending : updRuler)(st, t); } catch (e) { if (window.console) console.error(e); }
    }
  });
})();
;
/* ==== tools/video/composition/components/chip-stacks.js ==== */
// Composant `chip-stacks` : piles de jetons vues de face, hauteur exacte (1 jeton = même hauteur partout), compteur, étiquettes, écart `diff`.
(() => {
  const { C, sv, g, f2, E, prog, clamp, lerp, put, show, text, rect } = ZV;
  const INK = C.ink;
  const Z0 = (v, d) => (v == null ? d : v);
  const popE = (p) => E.back(clamp(p));
  const CW = 220;           // largeur d'un jeton
  const FLOOR = 700;        // ligne de sol
  const MAXVIS = 40;
  let UID = 0;

  const measCache = {};
  function meas(root, str, size, mono) {
    const key = str + '|' + size + '|' + (mono ? 1 : 0);
    if (measCache[key] != null) return measCache[key];
    let w = str.length * size * 0.6;
    try {
      const n = text(root, str, 0, 0, size, '#000', { mono });
      const b = n.getComputedTextLength();
      root.removeChild(n);
      if (b > 0) w = b;
    } catch (e) { /* estimation */ }
    measCache[key] = w;
    return w;
  }
  const colorOf = (c) => (c === 'lime' ? C.lime : c === 'red' ? C.red : c === 'paper' ? C.paper : C.white);
  const accentOf = (c) => (c === 'lime' ? C.white : c === 'red' ? C.white : C.lime);

  ZV.define('chip-stacks', {
    init(root, shot) {
      const pr = shot.props || {};
      const st = { shot };
      // fond ink à pois
      rect(root, 0, 0, 1920, 1080, 0, INK);
      const id = 'cs' + (++UID);
      const defs = sv('defs', null, root);
      const pat = sv('pattern', { id, width: 56, height: 56, patternUnits: 'userSpaceOnUse' }, defs);
      sv('circle', { cx: 28, cy: 28, r: 3.2, fill: C.paper, opacity: 0.1 }, pat);
      rect(root, 0, 0, 1920, 1080, 0, `url(#${id})`);
      rect(root, 120, FLOOR, 1680, 8, 0, C.paper);

      const defs2 = (pr.stacks && pr.stacks.length ? pr.stacks : [{ label: '', value: 10, unit: '', color: 'white' }]).slice(0, 4);
      const n = defs2.length;
      const vals = defs2.map((s) => Math.max(0, Math.round(s.value || 0)));
      const maxVis = Math.max(1, Math.min(MAXVIS, Math.max.apply(null, vals)));
      st.pitch = clamp(540 / maxVis, 8, 24);
      const hasRight = !!(pr.diff || ZV.cue(shot, 'total') != null);
      const xs = n === 1 ? [hasRight ? 600 : 960] : n === 2 ? [520, 980] : n === 3 ? [400, 800, 1200] : [300, 620, 940, 1260];
      // repères de croissance : grow-1, grow-2…
      const growT = defs2.map((s, i) => Z0(ZV.cue(shot, 'grow-' + (i + 1)), i * 0.8));
      const evT = ['grow-1', 'grow-2', 'grow-3', 'grow-4', 'total', 'diff'].map((k) => ZV.cue(shot, k)).filter((x) => x != null);
      st.stacks = defs2.map((s, i) => {
        const val = vals[i];
        const vis = Math.min(val, MAXVIS);
        const start = growT[i];
        const next = evT.filter((x) => x > start + 0.01).sort((a, b) => a - b)[0];
        const D = clamp(Math.min(vis * 0.07, (next == null ? 3 : next - start) - 0.06), 0.3, 3.0);
        const grp = g(root);
        const col = colorOf(s.color), acc = accentOf(s.color);
        // ombre dure d'ensemble
        const shadow = rect(grp, -CW / 2 + 10, -10, CW, 1, 4, '#2A2A2A');
        const chips = [];
        const cg = g(grp);
        for (let k = 0; k < vis; k++) {
          const c = g(cg);
          rect(c, -CW / 2, -(k + 1) * st.pitch, CW, st.pitch, 3, col, INK, 3.5);
          const sh = Math.max(3, st.pitch - 8);
          for (let q = -1; q <= 1; q++) rect(c, q * 66 - 12, -(k + 1) * st.pitch + (st.pitch - sh) / 2, 24, sh, 2, acc);
          chips.push(c);
        }
        let zig = null;
        if (val > MAXVIS) {
          zig = sv('path', { d: `M -118 ${f2(-20 * st.pitch + 5)} l 17 -14 l 17 14 l 17 -14 l 17 14 l 17 -14 l 17 14 l 17 -14 l 17 14 l 17 -14 l 17 14 l 17 -14 l 17 14 V ${f2(-20 * st.pitch - 20)} H -118 Z`, fill: INK, stroke: C.paper, 'stroke-width': 4 }, grp);
        }
        // compteur Mono au-dessus
        const cnt = text(grp, '', 0, 0, 92, C.paper, { mono: 1, anchor: 'middle' });
        // étiquette sticker inclinée sous le sol
        const lab = g(root);
        const L = (s.label || '');
        const lines = L.indexOf(' : ') > 0 ? [L.slice(0, L.indexOf(' : ') + 2), L.slice(L.indexOf(' : ') + 3)] : [L];
        const lsz = lines.length > 1 ? 36 : 46;
        const w = Math.max.apply(null, lines.map((l) => meas(root, l, lsz, true))) + 44, h = lines.length > 1 ? 108 : 76;
        if (L) {
          ZV.sticker(lab, Math.min(w, 440), h, C.paper, null, lsz, INK, { sh: 8, r: 14, sw: 5 });
          lines.forEach((l, k) => text(lab, l, 0, (lines.length > 1 ? -4 : 15) + k * 40, lsz, INK, { mono: 1, anchor: 'middle', len: Math.min(meas(root, l, lsz, true), 440 - 44) }));
        }
        return { grp, x: xs[i], val, vis, start, D, chips, cnt, shadow, lab, col, acc, unit: s.unit || '', tilt: i % 2 ? 2.5 : -2.5, hasLabel: !!L, zig };
      });
      // écart / total
      st.diffDef = pr.diff || null;
      st.tDiff = ZV.cue(shot, 'diff');
      const totalBeat = shot.beats.find((b) => b.do === 'cue' && b.name === 'total');
      st.tTotal = totalBeat ? totalBeat.t : null;
      st.totalText = totalBeat && totalBeat.text ? totalBeat.text : '';
      if (st.totalText) {
        const w = meas(root, st.totalText, 190, false);
        st.total = text(root, st.totalText, 1460 - w / 2, 480, 190, C.lime, { len: w });
        st.totalW = w;
      }
      if (st.diffDef && n >= 2) {
        const a = st.stacks[0], b = st.stacks[1];
        const short = a.val <= b.val ? a : b;
        const idx = a.val <= b.val ? 0 : 1;
        const gap = Math.abs(a.val - b.val);
        const dc = st.diffDef.color === 'lime' ? C.lime : C.red;
        const ds = g(root);
        st.diff = { short, gap, ds, slots: [], fills: [], idx };
        for (let k = 0; k < gap; k++) {
          const y = -(short.vis + k + 1) * st.pitch;
          const gs = g(ds, { transform: `translate(${short.x} ${FLOOR})` });
          const dr = sv('rect', { x: -CW / 2, y, width: CW, height: st.pitch, rx: 3, fill: 'none', stroke: C.paper, 'stroke-width': 4, 'stroke-dasharray': '12 9' }, gs);
          const fl = g(gs);
          rect(fl, -CW / 2, y, CW, st.pitch, 3, dc, INK, 4);
          for (let q = -1; q <= 1; q++) rect(fl, q * 66 - 12, y + (st.pitch - Math.max(3, st.pitch - 8)) / 2, 24, Math.max(3, st.pitch - 8), 2, C.white);
          st.diff.slots.push(dr); st.diff.fills.push(fl);
        }
        // sticker de l'écart
        const sz = 70, w = meas(root, st.diffDef.text || '', sz, false) + 64;
        const sg = g(root);
        ZV.sticker(sg, w, 112, dc, null, sz, st.diffDef.color === 'lime' ? INK : INK, { sh: 10 });
        text(sg, st.diffDef.text || '', 0, 25, sz, INK, { anchor: 'middle', len: w - 64 });
        st.diff.sg = sg; st.diff.w = w;
        const slotTopY = FLOOR - (short.vis + gap / 2) * st.pitch;
        // à droite de la pile la plus courte si elle est la dernière, sinon à gauche
        const right = idx === n - 1 || idx === 1;
        st.diff.sx = short.x + (right ? 1 : -1) * (CW / 2 + 40 + w / 2);
        st.diff.sy = Math.max(190, Math.min(slotTopY, 560));
        st.diff.right = right;
        // trait de rappel
        st.diff.leader = rect(root, 0, 0, 40, 8, 0, dc);
      }
      return st;
    },
    update(st, t, shot) {
      try {
        const P = st.pitch;
        st.stacks.forEach((s) => {
          const p = prog(t, s.start, s.start + s.D);
          const cnt = t < s.start ? 0 : Math.min(s.vis, Math.floor(s.vis * Math.pow(p, 1.6) + 1e-9));
          const shown = t >= s.start;
          put(s.grp, s.x, FLOOR, 0, 1, 1, shown ? 1 : 0);
          for (let k = 0; k < s.vis; k++) {
            const on = k < cnt;
            const c = s.chips[k];
            if (!on) { c.setAttribute('visibility', 'hidden'); continue; }
            // « tac » de chaque jeton qui se pose : il tombe de 26 px
            const tk = s.start + s.D * Math.pow(k / Math.max(1, s.vis), 1 / 1.6);
            const q = prog(t, tk, tk + 0.1);
            const dy = -26 * (1 - E.out2(q)) * (k === cnt - 1 ? 1 : 0);
            c.setAttribute('transform', `translate(0 ${f2(dy)})`);
            c.setAttribute('visibility', 'visible');
          }
          if (s.zig) show(s.zig, cnt >= 22);
          const hgt = cnt * P;
          s.shadow.setAttribute('y', f2(-hgt - 0));
          s.shadow.setAttribute('height', f2(Math.max(hgt + 10, 1)));
          const top = -hgt - 22 - (st.diff && st.diff.short === s ? st.diff.gap * P : 0);
          const shownVal = t < s.start ? 0 : Math.round(s.val * Math.min(1, Math.pow(p, 1.6)));
          s.cnt.textContent = shownVal + s.unit;
          s.cnt.setAttribute('y', f2(top));
          s.cnt.setAttribute('visibility', shown && cnt > 0 ? 'visible' : 'hidden');
          const lp = popE(prog(t, s.start + 0.08, s.start + 0.4));
          if (s.hasLabel) put(s.lab, s.x, FLOOR + 80, s.tilt, lp, lp, shown ? 1 : 0);
        });
        // total « = 36 € »
        if (st.total) {
          const k = popE(prog(t, st.tTotal, st.tTotal + 0.28));
          st.total.setAttribute('transform', `translate(${f2(1460)} ${f2(480)}) scale(${f2(Math.max(k, 0.001))}) translate(${f2(-1460)} ${f2(-480)})`);
          st.total.setAttribute('visibility', t >= st.tTotal ? 'visible' : 'hidden');
        }
        // écart : place des jetons manquants en pointillés puis remplie de couleur + sticker
        if (st.diff && st.tDiff != null) {
          const d = st.diff;
          const td = st.tDiff;
          d.slots.forEach((r, k) => {
            const q = popE(prog(t, td + k * 0.05, td + k * 0.05 + 0.2));
            r.setAttribute('opacity', f2(q > 0 ? 1 : 0));
            r.setAttribute('visibility', t >= td && t < td + 0.45 ? 'visible' : 'hidden');
          });
          d.fills.forEach((f, k) => {
            const q = popE(prog(t, td + 0.45 + k * 0.05, td + 0.45 + k * 0.05 + 0.22));
            f.setAttribute('transform', `translate(0 ${f2(-20 * (1 - Math.min(1, q)))})`);
            f.setAttribute('visibility', t >= td + 0.45 ? 'visible' : 'hidden');
          });
          const k = popE(prog(t, td + 0.5, td + 0.8));
          put(d.sg, d.sx, d.sy, d.right ? 4 : -4, k, k, t >= td + 0.5 ? 1 : 0);
          // trait de rappel du sticker vers l'emplacement
          const ex = d.short.x + (d.right ? 1 : -1) * (CW / 2 + 4), len = Math.abs(d.sx - (d.w / 2) * (d.right ? 1 : -1) - ex);
          const lx = d.right ? ex : ex - len;
          d.leader.setAttribute('x', f2(lx)); d.leader.setAttribute('y', f2(d.sy - 4)); d.leader.setAttribute('width', f2(Math.max(0, len)));
          d.leader.setAttribute('visibility', t >= td + 0.5 ? 'visible' : 'hidden');
        }
      } catch (e) { if (window.ZV_DEBUG) console.error(e); }
    }
  });
})();
;
/* ==== tools/video/composition/components/coin-flips.js ==== */
// Composant `coin-flips` : pile ou face. Pièces en 3D plate (scaleY = |cos|), rebond, modes single / row / grid / balance.
(() => {
  const { C, sv, g, f2, E, prog, clamp, lerp, put, show, text, rect, circle, path } = ZV;
  const INK = C.ink;
  const PI = Math.PI;
  const Z0 = (v, d) => (v == null ? d : v);
  const popE = (p) => E.back(clamp(p));
  let UID = 0;

  const measCache = {};
  function meas(root, str, size, mono) {
    const key = str + '|' + size + '|' + (mono ? 1 : 0);
    if (measCache[key] != null) return measCache[key];
    let w = str.length * size * 0.6;
    try {
      const n = text(root, str, 0, 0, size, '#000', { mono });
      const b = n.getComputedTextLength();
      root.removeChild(n);
      if (b > 0) w = b;
    } catch (e) { /* estimation */ }
    measCache[key] = w;
    return w;
  }

  // une pièce de rayon R : deux faces (P sur lime, F sur paper) dont une seule est visible
  function makeCoin(parent, R) {
    const grp = g(parent);
    rect(grp, 0, 0, 0, 0, 0, 'none');
    const sh = circle(grp, R * 0.14, R * 0.14, R, INK);
    const body = g(grp);
    circle(body, 0, 0, R, C.white, INK, Math.max(4, R * 0.085));
    const fP = g(body), fF = g(body);
    circle(fP, 0, 0, R * 0.74, C.lime, INK, Math.max(3, R * 0.06));
    text(fP, 'P', 0, R * 0.36, R * 1.04, INK, { anchor: 'middle' });
    circle(fF, 0, 0, R * 0.74, C.paper, INK, Math.max(3, R * 0.06));
    text(fF, 'F', 0, R * 0.36, R * 1.04, INK, { anchor: 'middle' });
    return { grp, body, fP, fF, sh, R };
  }
  // pose la pièce à un instant d'un lancer : t0 début, dur durée du vol, f0 face de départ (1 = pile), f1 face finale, turns tours, hauteur du jet h
  function setCoin(c, x, y, t, t0, dur, f0, f1, turns, h, sc, vis) {
    const q = prog(t, t0, t0 + dur);
    const total = turns * 2 * PI + (f0 !== f1 ? PI : 0);
    const th = total * E.out2(q);
    const cs = Math.cos(th);
    const air = q < 1 ? -h * Math.sin(PI * Math.min(1, q * 1.0)) : 0;
    // petit rebond à l'atterrissage
    const u = prog(t, t0 + dur, t0 + dur + 0.28);
    const bounce = u > 0 && u < 1 ? -Math.abs(Math.sin(u * PI * 2)) * (h * 0.09) * (1 - u) : 0;
    const face = cs >= 0 ? f0 : 1 - f0;
    show(c.fP, face === 1); show(c.fF, face === 0);
    const sy = Math.max(Math.abs(cs), 0.045);
    c.body.setAttribute('transform', `scale(1 ${f2(sy)})`);
    c.sh.setAttribute('transform', `scale(1 ${f2(sy)})`);
    const s = sc == null ? 1 : sc;
    put(c.grp, x, y + air + bounce, 0, s, s, (vis === undefined ? t >= t0 : vis) ? 1 : 0);
    // l'ombre dure reste collée au sol quand la pièce est en l'air
    return q;
  }

  function bg(root, color) {
    rect(root, 0, 0, 1920, 1080, 0, color);
    const id = 'cf' + (++UID);
    const defs = sv('defs', null, root);
    const pat = sv('pattern', { id, width: 56, height: 56, patternUnits: 'userSpaceOnUse' }, defs);
    sv('circle', { cx: 28, cy: 28, r: 3.2, fill: C.paper, opacity: 0.1 }, pat);
    rect(root, 0, 0, 1920, 1080, 0, `url(#${id})`);
  }

  /* ------------------------------------------------------------------ */
  /*  single + row (+ grid, balance dans les fonctions suivantes)         */
  /* ------------------------------------------------------------------ */
  function buildSingle(st, root, shot, pr) {
    bg(root, INK);
    st.big = makeCoin(root, 210);
    st.tFlip = Z0(ZV.cue(shot, 'flip'), 1.0);
    st.rowDef = shot.beats.find((b) => b.do === 'cue' && b.name === 'row');
    st.tRow = st.rowDef ? st.rowDef.t : null;
    const rows = (st.rowDef && st.rowDef.rows) || pr.rows || null;
    st.rows = rows && rows[0] ? rows[0] : null;
    if (st.rows) {
      const r = ZV.rng(7);
      st.coins = st.rows.map(() => makeCoin(root, 74));
      st.f0 = st.rows.map(() => (r() < 0.5 ? 1 : 0));
    }
  }
  function tickSingle(st, t) {
    // pièce géante : pose sur le sol, lancer à t = flip, atterrit côté face, puis rétrécit quand la rangée arrive
    const shrink = st.tRow == null ? 0 : E.in3(prog(t, st.tRow - 0.05, st.tRow + 0.16));
    const sc = Math.max(0.0001, 1 - shrink);
    const pop = popE(prog(t, 0, 0.35));
    setCoin(st.big, 960, 520, t, st.tFlip, 0.75, 1, 0, 3, 250, sc * pop, shrink < 1);
    if (t < st.tFlip) { show(st.big.fP, true); show(st.big.fF, false); }
    if (st.rows && st.tRow != null) {
      st.rows.forEach((v, i) => {
        const t0 = st.tRow + i * 0.045;
        const x = 960 + (i - 4.5) * 164;
        const q = prog(t, t0, t0 + 0.42);
        const fall = -460 * (1 - E.out2(Math.min(1, q * 1.15)));
        setCoin(st.coins[i], x, 500 + Math.min(0, fall) * 0, t, t0, 0.42, st.f0[i], v, 2, 120, 1);
        // chute depuis le haut : décale en plus la position pendant la descente
        const cg = st.coins[i].grp;
        const cur = cg.getAttribute('transform');
        if (q < 1) { put(cg, x, 500 + fall - 0, 0, 1, 1, t >= t0 ? 1 : 0); }
      });
    }
  }

  function buildRows(st, root, shot, pr) {
    bg(root, INK);
    st.rows = (pr.rows && pr.rows.length ? pr.rows : [[1, 0, 1, 1, 0, 0, 1, 0, 1, 0]]).slice(0, 6);
    st.hi = pr.highlight_row == null ? -1 : pr.highlight_row;
    const rnd = ZV.rng(21);
    const R = 56, pitch = 128, rowH = 150;
    const x0 = 200 + R;
    st.R = R;
    st.coins = st.rows.map((row) => row.map(() => makeCoin(root, R)));
    st.f0 = st.rows.map((row) => row.map(() => (rnd() < 0.5 ? 1 : 0)));
    st.scores = pr.scores || st.rows.map((row) => { const p = row.reduce((a, b) => a + b, 0); return p + '-' + (row.length - p); });
    st.scoreN = st.scores.map((s, i) => {
      const w = 220;
      const lab = text(root, s, 0, 0, 76, C.paper, { anchor: 'middle' });
      return lab;
    });
    st.slot = (r, i) => [x0 + i * pitch, 262 + r * rowH];
    st.tFive = ZV.cue(shot, 'five');
    st.tGrid = Z0(ZV.cue(shot, 'grid'), 1.5);
    st.tSticker = ZV.cue(shot, 'sticker');
    // bandeau « ATTENDU : 5 PILES »
    const bw = meas(root, 'ATTENDU : 5 PILES', 62, false) + 70;
    st.banner = g(root);
    ZV.sticker(st.banner, bw, 106, C.lime, null, 62, INK, { sh: 10 });
    text(st.banner, 'ATTENDU : 5 PILES', 0, 22, 62, INK, { anchor: 'middle', len: bw - 70 });
    // sticker final
    const sw = meas(root, pr.sticker || '', 62, false) + 70;
    st.stk = g(root);
    ZV.sticker(st.stk, sw, 106, C.paper, null, 62, INK, { sh: 10 });
    text(st.stk, pr.sticker || '', 0, 22, 62, INK, { anchor: 'middle', len: sw - 70 });
    // cadre lime autour de la ligne 5-5
    st.frame = rect(root, 0, 0, 10, 10, 26, 'none', C.lime, 9);
    st.frame.setAttribute('visibility', 'hidden');
    st.hiRow = st.hi;
  }
  function tickRows(st, t) {
    const R = st.R;
    const hiR = st.hi;
    const nrows = st.rows.length;
    // ordre d'arrivée : les lignes non surlignées s'enchaînent
    const order = []; for (let r = 0; r < nrows; r++) if (r !== hiR) order.push(r);
    st.rows.forEach((row, r) => {
      row.forEach((v, i) => {
        const c = st.coins[r][i];
        const [sx, sy] = st.slot(r, i);
        if (r === hiR) {
          // la ligne 5-5 est déjà là (au centre) puis glisse vers sa place
          const gx = 960 + (i - 4.5) * 128, gy = 470;
          const e = E.io2(prog(t, st.tGrid, st.tGrid + 0.5));
          const x = lerp(gx, sx, e), y = lerp(gy, sy, e);
          setCoin(c, x, y, t, 0, 0.0001, st.f0[r][i], v, 0, 0, 1);
          // la ligne apparaît d'emblée avec la bonne face
          show(c.fP, v === 1); show(c.fF, v === 0);
          const pp = popE(prog(t, i * 0.02, i * 0.02 + 0.3));
          put(c.grp, x, y, 0, pp, pp, 1);
          c.body.setAttribute('transform', 'scale(1 1)'); c.sh.setAttribute('transform', 'scale(1 1)');
        } else {
          const k = order.indexOf(r);
          const t0 = st.tGrid + 0.15 + k * 0.28 + i * 0.035;
          const q = prog(t, t0, t0 + 0.45);
          const fall = -420 * (1 - E.out2(Math.min(1, q * 1.2)));
          setCoin(c, sx, sy, t, t0, 0.45, st.f0[r][i], v, 2, 90, 1);
          if (q < 1) put(c.grp, sx, sy + fall, 0, 1, 1, t >= t0 ? 1 : 0);
        }
      });
      // score de la ligne
      const lab = st.scoreN[r];
      const ts = r === hiR ? st.tGrid + 0.55 : st.tGrid + 0.15 + order.indexOf(r) * 0.28 + 0.9;
      const k = popE(prog(t, ts, ts + 0.25));
      const sx = 1613, sy = 262 + r * 150 + 26;
      lab.setAttribute('transform', `translate(${sx} ${sy}) scale(${f2(Math.max(k, 0.001))})`);
      lab.setAttribute('visibility', t >= ts ? 'visible' : 'hidden');
      lab.setAttribute('fill', r === hiR ? C.lime : C.paper);
    });
    // bandeau « ATTENDU »
    if (st.tFive != null) {
      const k = popE(prog(t, st.tFive, st.tFive + 0.3));
      const ex = E.io2(prog(t, st.tGrid, st.tGrid + 0.45));
      put(st.banner, lerp(960, 640, ex), lerp(130, 108, ex), -2, lerp(1.0, 0.82, ex) * k, lerp(1.0, 0.82, ex) * k, t >= st.tFive ? 1 : 0);
    } else put(st.banner, 0, 0, 0, 0, 0, 0);
    // cadre lime
    if (hiR >= 0) {
      const tf = st.tGrid + 1.35;
      const q = popE(prog(t, tf, tf + 0.25));
      const w = 10 * 128 - 12 + 44, h = R * 2 + 36;
      st.frame.setAttribute('x', f2(200 + R - R - 22)); st.frame.setAttribute('y', f2(262 + hiR * 150 - R - 18));
      st.frame.setAttribute('width', f2(w)); st.frame.setAttribute('height', f2(h));
      st.frame.setAttribute('opacity', f2(Math.min(1, q)));
      st.frame.setAttribute('visibility', t >= tf ? 'visible' : 'hidden');
    }
    // sticker (≈ 1 FOIS SUR 4)
    if (st.tSticker != null) {
      const k = popE(prog(t, st.tSticker, st.tSticker + 0.3));
      put(st.stk, 1430, 108, 3, k, k, t >= st.tSticker ? 1 : 0);
    } else put(st.stk, 0, 0, 0, 0, 0, 0);
  }

  /* ------------------------------------------------------------------ */
  /*  Balance                                                            */
  /* ------------------------------------------------------------------ */
  const SIDE = [
    [0, 0, 0, 0, 0, 1, 1, 1, 1, 1],   // 5-5
    [0, 0, 0, 0, 0, 0, 0, 1, 1, 1],   // 7-3
    [0, 0, 1, 1, 1, 1, 1, 1, 1, 1],   // 2-8
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 1]    // 6-4
  ];
  function buildBalance(st, root, shot, pr) {
    bg(root, INK);
    const PX = 960, PY = 280, HALF = 430;
    st.PX = PX; st.PY = PY; st.HALF = HALF;
    // pied
    rect(root, PX - 20 + 12, PY + 12, 40, 470, 8, '#2A2A2A');
    rect(root, PX - 20, PY, 40, 470, 8, C.white, INK, 6);
    rect(root, PX - 140 + 12, PY + 450 + 12, 280, 40, 14, '#2A2A2A');
    rect(root, PX - 140, PY + 450, 280, 40, 14, C.red, INK, 6);
    st.beam = g(root);
    rect(st.beam, -HALF, -14, HALF * 2, 28, 14, C.white, INK, 6);
    circle(root, PX, PY, 24, C.lime, INK, 6);
    st.pans = [0, 1].map((side) => {
      const strings = [sv('line', { stroke: C.paper, 'stroke-width': 5, 'stroke-linecap': 'round' }, root), sv('line', { stroke: C.paper, 'stroke-width': 5, 'stroke-linecap': 'round' }, root)];
      const pan = g(root);
      path(pan, 'M -170 0 H 170 A 170 70 0 0 1 -170 0 Z', side ? C.red : C.white, INK, 6);
      return { pan, strings };
    });
    const rnd = ZV.rng(5);
    st.coins = SIDE[0].map(() => makeCoin(root, 34));
    st.f0 = SIDE[0].map(() => (rnd() < 0.5 ? 1 : 0));
    st.t = {
      tilt: Z0(ZV.cue(shot, 'tilt'), 0.9), s1: Z0(ZV.cue(shot, 's1'), 1.9), s2: Z0(ZV.cue(shot, 's2'), 2.5), reflip: Z0(ZV.cue(shot, 'reflip'), 3.1)
    };
    const sc = pr.scores || ['7-3', '2-8'];
    st.labels = ['5-5', sc[0] || '7-3', sc[1] || '2-8', '6-4'];
    st.score = text(root, '5-5', 960, 168, 150, C.paper, { anchor: 'middle' });
    // rappel : P à gauche, F à droite
    const lp = g(root, { transform: 'translate(300 168)' });
    const lf = g(root, { transform: 'translate(1620 168)' });
    st.lp = lp; st.lf = lf;
    const c1 = makeCoin(lp, 46); put(c1.grp, 0, 0, 0, 1, 1, 1); show(c1.fP, true); show(c1.fF, false);
    const c2 = makeCoin(lf, 46); put(c2.grp, 0, 0, 0, 1, 1, 1); show(c2.fP, false); show(c2.fF, true);
    c1.body.setAttribute('transform', 'scale(1 1)'); c2.body.setAttribute('transform', 'scale(1 1)');
  }
  // angle du fléau pour un état (positif : côté droit plus bas)
  const angOf = (stage) => { const s = SIDE[stage]; const L = s.filter((x) => x === 0).length, Rn = s.length - L; return (Rn - L) * 3.2; };
  function tickBalance(st, t) {
    const T = st.t;
    const times = [0, T.s1, T.s2, T.reflip];
    const stage = t >= T.reflip ? 3 : t >= T.s2 ? 2 : t >= T.s1 ? 1 : 0;
    // angle : ressort amorti à chaque nouvel état + léger frémissement au repère `tilt`
    const A = (k) => angOf(k);
    let ang = 0;
    if (stage === 0) {
      const w = t - T.tilt;
      ang = w > 0 ? 3.2 * Math.sin(w * 7) * Math.exp(-w * 0.8) * 0.9 + 0 : 0;
    } else {
      const u = t - times[stage];
      const from = A(stage - 1), to = A(stage);
      ang = to + (from - to) * Math.exp(-u * 5.5) * Math.cos(u * 12);
    }
    st.beam.setAttribute('transform', `translate(${st.PX} ${st.PY}) rotate(${f2(ang)})`);
    const c = Math.cos(ang * PI / 180), s = Math.sin(ang * PI / 180);
    const ends = [[st.PX - st.HALF * c, st.PY - st.HALF * s], [st.PX + st.HALF * c, st.PY + st.HALF * s]];
    const panPos = ends.map((e) => [e[0], e[1] + 250]);
    st.pans.forEach((pn, k) => {
      const [ex, ey] = ends[k], [px, py] = panPos[k];
      pn.pan.setAttribute('transform', `translate(${f2(px)} ${f2(py)})`);
      pn.strings[0].setAttribute('x1', f2(ex)); pn.strings[0].setAttribute('y1', f2(ey)); pn.strings[0].setAttribute('x2', f2(px - 160)); pn.strings[0].setAttribute('y2', f2(py));
      pn.strings[1].setAttribute('x1', f2(ex)); pn.strings[1].setAttribute('y1', f2(ey)); pn.strings[1].setAttribute('x2', f2(px + 160)); pn.strings[1].setAttribute('y2', f2(py));
    });
    // pièces : chaque pièce a un côté (0 gauche = P, 1 droite = F) par état, et un rang dans le plateau
    const rank = (stageK, idx) => { let r = 0; const side = SIDE[stageK][idx]; for (let j = 0; j < idx; j++) if (SIDE[stageK][j] === side) r++; return r; };
    const slotPos = (stageK, idx, px, py) => {
      const side = SIDE[stageK][idx], r = rank(stageK, idx);
      const col = r % 4, row = Math.floor(r / 4);
      return [panPos[side][0] + (col - 1.5) * 76, panPos[side][1] - 34 - row * 66];
    };
    const reflipT = T.reflip;
    st.coins.forEach((cn, idx) => {
      // position : état courant (ou transition depuis l'état précédent si le côté a changé)
      const sA = SIDE[stage][idx], sP = stage > 0 ? SIDE[stage - 1][idx] : sA;
      const tStart = times[stage];
      const q = stage === 0 ? 1 : prog(t, tStart + (sA !== sP ? idx * 0.025 : 0), tStart + 0.55 + (sA !== sP ? idx * 0.025 : 0));
      const cur = slotPos(stage, idx), prev = stage > 0 ? slotPos(stage - 1, idx) : cur;
      // pour la transition, la position précédente suit le plateau actuel (les plateaux bougent)
      let x = cur[0], y = cur[1], face = sA === 0 ? 1 : 0;
      let flipScale = 1;
      if (stage > 0 && q < 1) {
        const e = E.io2(q);
        const pp = slotPos(stage - 1, idx);
        x = lerp(pp[0], cur[0], e); y = lerp(pp[1], cur[1], e);
        if (sA !== sP) {
          y -= Math.sin(q * PI) * 140;
          const th = q * 2 * PI * 1;
          flipScale = Math.cos(th);
          face = flipScale >= 0 ? (sP === 0 ? 1 : 0) : (sA === 0 ? 1 : 0);
        } else {
          y -= Math.sin(q * PI) * 30;
          face = sA === 0 ? 1 : 0;
        }
      }
      // `reflip` : toutes les pièces sautent et tournent sur place
      if (stage === 3) {
        const u = prog(t, reflipT + idx * 0.02, reflipT + idx * 0.02 + 0.5);
        if (u > 0 && u < 1 && sA === sP) { y -= Math.sin(u * PI) * 90; flipScale = Math.cos(u * 2 * PI * 1.5); face = flipScale >= 0 ? (sA === 0 ? 1 : 0) : (sA === 0 ? 0 : 1); }
      }
      show(cn.fP, face === 1); show(cn.fF, face === 0);
      const sy = Math.max(Math.abs(flipScale), 0.05);
      cn.body.setAttribute('transform', `scale(1 ${f2(sy)})`);
      cn.sh.setAttribute('transform', `scale(1 ${f2(sy)})`);
      const pop = popE(prog(t, idx * 0.03, idx * 0.03 + 0.3));
      put(cn.grp, x, y, 0, pop, pop, 1);
    });
    // score affiché
    st.score.textContent = st.labels[stage];
    st.score.setAttribute('visibility', 'visible');
  }

  ZV.define('coin-flips', {
    init(root, shot) {
      const pr = shot.props || {};
      const st = { mode: pr.mode || 'single' };
      try {
        if (st.mode === 'balance') buildBalance(st, root, shot, pr);
        else if (st.mode === 'grid' || st.mode === 'row') buildRows(st, root, shot, pr);
        else buildSingle(st, root, shot, pr);
      } catch (e) { if (window.ZV_DEBUG) console.error(e); }
      return st;
    },
    update(st, t, shot) {
      try {
        if (st.mode === 'balance') tickBalance(st, t);
        else if (st.mode === 'grid' || st.mode === 'row') tickRows(st, t);
        else tickSingle(st, t);
      } catch (e) { if (window.ZV_DEBUG) console.error(e); }
    }
  });
})();
;
/* ==== tools/video/composition/components/craps-layout.js ==== */
// Composant `craps-layout` (épisode 5) : le tapis de craps, 20 cases toutes du même style. Voir EP5-COMPONENTS.md.
// Fonction pure du temps ; aplats, aucun dégradé / flou / filter ; éclats ≤ 4 changements/s ; dés ≤ ~1,1 tour/s.
// Cues : table, dice, noise, convert, twenty, pass, seven, ratio, same, nineteen.
(() => {
  'use strict';
  const { C, E, clamp, prog, f2, sv, g, rect, circle, path, text, put, rng } = ZV;
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const vis = (n, on) => n.setAttribute('visibility', on ? 'visible' : 'hidden');
  const meas = (n, est) => { try { const L = n.getComputedTextLength(); if (L > 0) return L; } catch (e) { /* estimation */ } return est; };
  const mw = (s, size) => String(s).length * size * 0.6;
  const S = (v, d) => (v == null || v === '' ? d : String(v));
  const pop = (t, t0, d) => Math.max(0.001, E.back(prog(t, t0, t0 + (d || 0.3))));

  function mkPlate(parent, lines, o) {
    o = o || {};
    const grp = g(parent), r = o.r === undefined ? 14 : o.r, off = o.sh === undefined ? 8 : o.sh;
    const sh = rect(grp, 0, 0, 1, 1, r, o.shadow || C.ink);
    const pl = rect(grp, 0, 0, 1, 1, r, o.fill || C.paper, o.stroke || C.ink, o.sw || 6);
    let w = 0, h = 0;
    const ts = lines.map((L) => {
      const n = text(grp, L.s, 0, 0, L.size, L.fill || o.textFill || C.ink, { anchor: 'middle', mono: L.mono });
      w = Math.max(w, meas(n, L.mono ? mw(L.s, L.size) : String(L.s).length * L.size * 0.58)); h += L.size * (L.lh || 1.15);
      return { n, L };
    });
    const px = o.padX === undefined ? 28 : o.padX, py = o.padY === undefined ? 14 : o.padY;
    w += px * 2; h += py * 2;
    let y = -h / 2 + py;
    for (const k of ts) { const lh = k.L.size * (k.L.lh || 1.15); k.n.setAttribute('y', f2(y + lh / 2 + k.L.size * 0.33)); y += lh; }
    for (const [n, d] of [[sh, off], [pl, 0]]) { n.setAttribute('x', f2(-w / 2 + d)); n.setAttribute('y', f2(-h / 2 + d)); n.setAttribute('width', f2(w)); n.setAttribute('height', f2(h)); }
    return { g: grp, w, h };
  }
  // bulle de BD : paper bordé ink 6, queue en bas à gauche
  function mkBubble(parent, str) {
    const grp = g(parent);
    const n0 = text(grp, str, 0, 0, 46, C.ink, { anchor: 'middle' });
    const w = meas(n0, str.length * 46 * 0.58) + 56, h = 96;
    rect(grp, -w / 2 + 8, -h / 2 + 8, w, h, 22, C.ink);
    path(grp, `M${f2(-w / 2 + 34)} ${h / 2 - 4}L${f2(-w / 2 + 22)} ${h / 2 + 30}L${f2(-w / 2 + 76)} ${h / 2 - 4}`, C.paper, C.ink, 6);
    rect(grp, -w / 2, -h / 2, w, h, 22, C.paper, C.ink, 6);
    rect(grp, -w / 2 + 40, h / 2 - 6, 32, 10, 0, C.paper);
    n0.parentNode.appendChild(n0); n0.setAttribute('y', f2(46 * 0.35));
    return { g: grp, w, h };
  }
  const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  // dé plat centré sur (0,0), côté s ; renvoie {g, pips} (les points se règlent avec setFace)
  function mkDie(parent, s, face) {
    const grp = g(parent), k = s / 3.6, o = { g: grp, pips: [], s };
    rect(grp, -s / 2 + s * 0.08, -s / 2 + s * 0.08, s, s, s * 0.16, C.ink);
    rect(grp, -s / 2, -s / 2, s, s, s * 0.16, C.white, C.ink, Math.max(3, s * 0.06));
    for (let i = 0; i < 9; i++) { const cx = ((i % 3) - 1) * s * 0.27, cy = (Math.floor(i / 3) - 1) * s * 0.27; o.pips.push(circle(grp, f2(cx), f2(cy), f2(Math.max(2.6, k * 0.32 * 1.6)), C.ink)); }
    o.set = (f) => { const a = PIPS[f] || PIPS[1]; for (let i = 0; i < 9; i++) vis(o.pips[i], a.indexOf(i) >= 0); };
    o.set(face);
    return o;
  }
  const mkChip = (parent, r, fill) => {
    const grp = g(parent);
    circle(grp, 4, 5, r, C.ink);
    circle(grp, 0, 0, r, fill, C.ink, 5);
    circle(grp, 0, 0, r * 0.6, 'none', C.ink, 3).setAttribute('stroke-dasharray', '8 6');
    return grp;
  };

  // les 20 cases : [id, libellé | null, x, y, w, h, taille, dés]
  const CELLS = (() => {
    const a = [];
    const add = (id, lab, x, y, w, h, size, dice) => a.push({ id, lab, x, y, w, h, size, dice, cx: x + w / 2, cy: y + h / 2 });
    add('gros6', 'GROS 6', 140, 130, 130, 120, 32); add('gros8', 'GROS 8', 278, 130, 130, 120, 32);
    ['4', '5', '6', '8', '9', '10'].forEach((n, i) => add('p' + n, n, 424 + i * 134, 130, 128, 120, 64));
    add('nvp', 'NE VIENS PAS', 1242, 130, 538, 120, 46);
    add('niq7', "N'IMPORTE QUEL 7", 1350, 270, 430, 80, 38);
    add('niqc', "N'IMPORTE QUEL CRAPS", 1350, 358, 430, 80, 34);
    add('d2', '2', 1350, 446, 138, 74, 40, [1, 1]); add('d22', null, 1496, 446, 138, 74, 0, [2, 2]); add('d33', null, 1642, 446, 138, 74, 0, [3, 3]);
    add('d44', null, 1350, 528, 211, 82, 0, [4, 4]); add('d55', null, 1569, 528, 211, 82, 0, [5, 5]);
    add('champ', 'CHAMP', 140, 380, 1190, 80, 46);
    add('viens', 'VIENS', 140, 470, 1190, 140, 70);
    add('npp', 'NE PASSE PAS', 140, 630, 1640, 60, 40);
    add('pass', 'LIGNE DE PASSE', 140, 700, 1640, 80, 46);
    return a;
  })();
  const ORDER = CELLS.map((c, i) => i).sort((p, q) => (CELLS[p].cy * 0.6 + CELLS[p].cx * 0.4) - (CELLS[q].cy * 0.6 + CELLS[q].cx * 0.4));
  const REST = [[200, 322, -8], [322, 324, 9]];

  ZV.define('craps-layout', {
    init(root, shot) {
      const P = shot.props || {};
      const beats = Array.isArray(shot.beats) ? shot.beats : [];
      const st = { dur: isNum(shot.dur) && shot.dur > 0 ? shot.dur : 10 };
      const cl = (n) => beats.filter((b) => b && b.do === 'cue' && b.name === n && isNum(b.t)).sort((a, b) => a.t - b.t);
      const c1 = (n) => { const b = cl(n)[0]; return b ? b.t : null; };
      const c = st.c = {};
      for (const n of ['table', 'dice', 'noise', 'convert', 'twenty', 'pass', 'seven', 'ratio', 'same', 'nineteen']) c[n] = c1(n);
      const allT = beats.filter((b) => b && b.do === 'cue' && isNum(b.t)).map((b) => b.t);
      st.auto = allT.length === 0;
      const others = beats.filter((b) => b && b.do === 'cue' && isNum(b.t) && b.name !== 'table').map((b) => b.t);
      st.tT = c.table != null ? c.table : Math.max(0, Math.min(0.1, (others.length ? Math.min(...others) : 9) - 0.5));
      if (c.table != null && others.length && Math.min(...others) < c.table) st.tT = Math.max(0, Math.min(...others) - 0.5);
      const endOf = (t0, names) => { let m = Infinity; for (const b of beats) if (b && b.do === 'cue' && isNum(b.t) && names.indexOf(b.name) >= 0 && b.t > t0 + 0.05 && b.t < m) m = b.t; return m; };
      const LATER = ['twenty', 'pass', 'seven', 'ratio', 'same', 'nineteen'];
      const faces = Array.isArray(P.faces) && P.faces.length >= 2 ? [clamp(Math.round(+P.faces[0]) || 3, 1, 6), clamp(Math.round(+P.faces[1]) || 4, 1, 6)] : [3, 4];
      const calls = Array.isArray(P.calls) && P.calls.length >= 2 ? [S(P.calls[0], '4 POUR 1'), S(P.calls[1], '5 CONTRE 1')] : ['4 POUR 1', '5 CONTRE 1'];
      const passEdge = S(P.pass_edge, '1,41 %'), sevenEdge = S(P.seven_edge, '16,67 %'), ratio = S(P.ratio, '≈ × 12'), per1000 = S(P.per_1000, 'SUR 1 000 € : ≈ 14 € / ≈ 167 €');

      rect(root, 0, 0, 1920, 1080, 0, C.ink);
      st.frame = path(root, 'M80 790L80 110L1840 110L1840 790Z', 'none', C.paper, 6, { pathLength: 1, 'stroke-linejoin': 'miter', 'stroke-linecap': 'butt' });

      /* ---- cases ---- */
      const G = g(root);
      st.cells = CELLS.map((cd) => {
        const cg = g(G);
        rect(cg, -cd.w / 2, -cd.h / 2, cd.w, cd.h, 8, C.pocket, C.paper, 4);
        if (cd.lab) {
          const n = text(cg, cd.lab, cd.dice ? -42 : 0, cd.size * 0.35, cd.size, C.paper, { anchor: 'middle' });
          const m = meas(n, cd.lab.length * cd.size * 0.58);
          if (!cd.dice && m > cd.w - 28) { n.setAttribute('textLength', f2(cd.w - 28)); n.setAttribute('lengthAdjust', 'spacingAndGlyphs'); }
        }
        if (cd.dice) {
          const ds = cd.id === 'd2' ? 28 : cd.w > 200 ? 38 : 32, dx = cd.id === 'd2' ? [2, 36] : cd.w > 200 ? [-26, 26] : [-19, 19];
          dx.forEach((x, i) => { const d = mkDie(cg, ds, cd.dice[i]); d.g.setAttribute('transform', `translate(${x} 0)`); });
        }
        return cg;
      });
      st.rings = g(root);
      st.twenty = CELLS.map((cd) => rect(st.rings, cd.x - 3, cd.y - 3, cd.w + 6, cd.h + 6, 10, 'none', C.lime, 4, { visibility: 'hidden' }));
      st.rPass = rect(root, 134, 694, 1652, 92, 12, 'none', C.lime, 8, { visibility: 'hidden', pathLength: 1 });
      st.rSeven = rect(root, 1342, 262, 446, 96, 12, 'none', C.red, 8, { visibility: 'hidden', pathLength: 1 });

      /* ---- « À VENDRE » ---- */
      st.tags = [];
      const rt = rng(5150);
      CELLS.forEach((cd, i) => {
        if (cd.id === 'pass') { st.tags.push(null); return; }
        const tg = g(root);
        rect(tg, -52 + 4, -13 + 4, 104, 26, 4, C.ink);
        rect(tg, -52, -13, 104, 26, 4, C.red, C.ink, 3);
        text(tg, 'À VENDRE', 0, 6, 16, C.ink, { anchor: 'middle', mono: true, weight: 800 });
        tg.setAttribute('visibility', 'hidden');
        st.tags.push({ g: tg, x: cd.x + cd.w - 62, y: cd.y - 2, rot: -9 + rt() * 14 });
      });

      /* ---- dés ---- */
      st.faces = faces;
      st.dice = [mkDie(root, 80, faces[0]), mkDie(root, 80, faces[1])];
      st.dice.forEach((d) => d.g.setAttribute('visibility', 'hidden'));

      /* ---- éclats ---- */
      st.shG = g(root);
      const rs = rng(808);
      const spots = [[44, 190], [40, 340], [46, 490], [42, 640], [1876, 200], [1880, 350], [1874, 500], [1878, 650], [420, 60], [780, 56], [1140, 62], [1500, 58]];
      st.sh = spots.map((p, k) => {
        const n = path(st.shG, 'M0 -22L11 -7L-6 2L9 13L-3 24', 'none', C.paper, 7, { visibility: 'hidden' });
        const on = []; for (let j = 0; j < 64; j++) on.push(rs() > 0.5);
        return { n, x: p[0], y: p[1], rot: (rs() - 0.5) * 50, on };
      });

      /* ---- voile + « convert » ---- */
      st.veil = rect(root, 80, 110, 1760, 680, 0, C.ink, null, 0, { opacity: 0, visibility: 'hidden' });
      st.cv = g(root); st.cv.setAttribute('visibility', 'hidden');
      st.pnl = [[370, 452, 490, 172], [980, 452, 640, 172]].map((q) => { const o = g(st.cv); rect(o, q[0] + 8, q[1] + 8, q[2], q[3], 14, C.ink); rect(o, q[0], q[1], q[2], q[3], 14, C.pocket, C.paper, 4); return o; });
      const chA = [-126, -42, 42, 126].map((x) => { const q = mkChip(st.cv, 38, C.paper); q.setAttribute('transform', `translate(${615 + x} 520)`); return { g: q, x: 615 + x }; });
      st.ringA = circle(st.cv, 615 - 126, 520, 50, 'none', C.lime, 7);
      const chB = [-225, -141, -57, 27, 111].map((x) => { const q = mkChip(st.cv, 38, C.paper); q.setAttribute('transform', `translate(${1250 + x} 520)`); return { g: q, x: 1250 + x }; });
      const limeB = mkChip(st.cv, 38, C.lime); limeB.setAttribute('transform', 'translate(1475 520)');
      st.chips = chA.concat(chB); st.chips.push({ g: limeB, x: 1475 });
      st.plus = text(st.cv, '+', 1418, 542, 64, C.paper, { anchor: 'middle' });
      st.cvL1 = text(st.cv, 'TA MISE COMPRISE', 615, 606, 28, C.paper, { mono: true, anchor: 'middle' });
      st.cvL2 = text(st.cv, 'TA MISE EN PLUS', 1475, 606, 28, C.lime, { mono: true, anchor: 'middle' });
      st.band = mkPlate(st.cv, [{ s: 'DEUX FAÇONS DE DIRE UN PAIEMENT', size: 32 }], { fill: C.lime, padX: 26, padY: 8 });
      
      st.bub = [mkBubble(root, calls[0]), mkBubble(root, calls[1])];
      st.bub.forEach((b) => b.g.setAttribute('visibility', 'hidden'));

      /* ---- étiquettes ---- */
      st.pEdge = mkPlate(root, [{ s: passEdge, size: 52, lh: 1 }], { fill: C.lime, padX: 24, padY: 8 });
      st.sEdge = mkPlate(root, [{ s: sevenEdge, size: 96, fill: C.red, lh: 0.95 }], { fill: C.pocket, stroke: C.red, shadow: C.ink, padX: 26, padY: 8 });
      st.sEdgeX = 1330 - st.sEdge.w / 2;
      st.ratio = mkPlate(root, [{ s: ratio, size: 80, lh: 0.95 }], { fill: C.lime, padX: 30, padY: 10 });
      st.per = mkPlate(root, [{ s: per1000, size: 28, mono: true, fill: C.ink }], { fill: C.paper, padX: 20, padY: 6, sw: 5, sh: 6, r: 8 });
      st.same1 = mkPlate(root, [{ s: 'MÊMES DÉS · MÊME CROUPIER · MÊME COULEUR', size: 26, mono: true, fill: C.ink }], { fill: C.paper, padX: 20, padY: 6, sw: 5, sh: 6, r: 8 });
      st.same2 = mkPlate(root, [{ s: 'RIEN NE LE SIGNALE', size: 52 }], { fill: C.lime, padX: 28, padY: 10 });
      [st.pEdge, st.sEdge, st.ratio, st.per, st.same1, st.same2].forEach((p) => p.g.setAttribute('visibility', 'hidden'));
      st.cnt = text(root, '', 1840, 94, 38, C.lime, { mono: true, anchor: 'end' });
      st.cnt.setAttribute('visibility', 'hidden');

      /* ---- fins de scène ---- */
      const bStart = [c.noise, c.convert].filter((x) => x != null);
      const bS = bStart.length ? Math.min(...bStart) : null;
      c.shE = c.noise == null ? 0 : Math.min(c.noise + 3.2, endOf(c.noise, ['convert'].concat(LATER)));
      c.bubS = bS; c.bubE = bS == null ? 0 : endOf(bS - 0.01, LATER);
      c.cvE = c.convert == null ? 0 : endOf(c.convert, LATER);
      c.twE = c.twenty == null ? 0 : endOf(c.twenty, ['pass', 'seven', 'ratio', 'same', 'nineteen']);
      const lastE = (t0) => (t0 == null ? 0 : endOf(t0, ['same', 'nineteen']));
      c.passE = lastE(c.pass); c.sevE = lastE(c.seven); c.ratE = lastE(c.ratio);
      c.sameE = c.same == null ? 0 : endOf(c.same, ['nineteen']);
      return st;
    },

    update(st, t) {
      try {
        t = clamp(t, 0, st.dur + 1);
        const c = st.c;
        const fadeOut = (te) => (te > 0 && t > te ? 1 - prog(t, te, te + 0.25) : 1);
        const live = (t0, te) => t0 != null && t >= t0 && (te === Infinity || t < te + 0.25);

        /* tapis */
        const fp = prog(t, st.tT, st.tT + 0.47);
        vis(st.frame, fp > 0); setA(st.frame, 'stroke-dasharray', `${f2(fp)} 2`);
        ORDER.forEach((ci, k) => {
          const cd = CELLS[ci], t0 = st.tT + 0.3 + k * 0.03, s = pop(t, t0, 0.3);
          put(st.cells[ci], cd.cx, cd.cy, 0, s, s, t >= t0 ? 1 : 0);
        });

        /* dés */
        st.dice.forEach((d, i) => {
          let on = false;
          if (c.dice != null && t >= c.dice) {
            on = true;
            const q = t - c.dice - i * 0.12, tA = 0.9, tB = 0.45, R0 = REST[i];
            const x0 = 2000 + i * 140, wall = 120 + i * 6;
            if (q < 0) { on = false; }
            else if (q < tA) {
              const p = q / tA;
              const x = x0 + (wall - x0) * E.out2(p);
              const y = 322 - 110 * Math.abs(Math.sin(p * Math.PI * 3)) * (1 - p) - 12 * i;
              d.g.setAttribute('transform', `translate(${f2(x)} ${f2(y)}) rotate(${f2(R0[2] + 400 * (1 - p) * (i ? -1 : 1))})`);
              d.set(((Math.floor(q * 5) + i * 3) % 6) + 1);
            } else if (q < tA + tB) {
              const p = (q - tA) / tB;
              d.g.setAttribute('transform', `translate(${f2(wall + (R0[0] - wall) * E.out2(p))} ${f2(R0[1] - 46 * Math.sin(p * Math.PI))}) rotate(${f2(R0[2] + 30 * (1 - p) * (i ? 1 : -1))})`);
              d.set(((Math.floor(q * 5) + i * 3) % 6) + 1);
            } else {
              d.g.setAttribute('transform', `translate(${R0[0]} ${R0[1]}) rotate(${R0[2]})`);
              d.set(st.faces[i]);
            }
          } else if (st.auto && t >= 0.8) { on = true; const R0 = REST[i]; d.g.setAttribute('transform', `translate(${R0[0]} ${R0[1]}) rotate(${R0[2]})`); d.set(st.faces[i]); }
          vis(d.g, on);
        });

        /* éclats (≤ 4 changements/s par éclat) */
        const shOn = c.noise != null && t >= c.noise && t < c.shE + 0.25;
        const slot = shOn ? Math.floor((t - c.noise) / 0.3) : 0;
        st.sh.forEach((q, k) => {
          const on = shOn && q.on[(slot + k * 5) % 64] && t < c.shE;
          vis(q.n, on);
          if (on) setA(q.n, 'transform', `translate(${q.x} ${q.y}) rotate(${f2(q.rot + ((slot + k) % 3) * 12)})`);
        });

        /* bulles (noise → convert) */
        st.bub.forEach((b, i) => {
          const on = live(c.bubS, c.bubE);
          vis(b.g, on); if (!on) return;
          const t0 = c.bubS + i * 0.18;
          const mv = c.convert != null ? E.io3(prog(t, c.convert, c.convert + 0.5)) : 0;
          const x0 = i ? 990 : 620, y0 = 312, x1 = i ? 1190 : 615, y1 = 318;
          const s = (c.noise != null && c.convert != null && c.noise < c.convert ? pop(t, t0, 0.3) : (c.noise != null ? pop(t, t0, 0.3) : pop(t, c.convert, 0.3))) * (1 + 0.15 * mv);
          put(b.g, x0 + (x1 - x0) * mv, y0 + (y1 - y0) * mv, (i ? 4 : -4) * (1 - mv), s, s, fadeOut(c.bubE));
        });

        /* voile + chips + bandeau */
        const cOn = live(c.convert, c.cvE);
        const ca = cOn ? fadeOut(c.cvE) : 0;
        setA(st.veil, 'opacity', f2(0.62 * ca * (c.convert != null ? prog(t, c.convert, c.convert + 0.3) : 0))); vis(st.veil, cOn);
        vis(st.cv, cOn); setA(st.cv, 'opacity', f2(ca));
        if (cOn) {
          st.chips.forEach((q, i) => { const t0 = c.convert + 0.6 + i * 0.07, s = pop(t, t0, 0.25); put(q.g, q.x, 520, 0, s, s, t >= t0 ? 1 : 0); });
          const tr = c.convert + 1.2;
          setA(st.ringA, 'opacity', f2(prog(t, tr, tr + 0.2)));
          const tl = c.convert + 1.4;
          st.pnl.forEach((o, i) => { setA(o, 'opacity', f2(prog(t, c.convert + 0.45 + i * 0.1, c.convert + 0.7 + i * 0.1))); });
          for (const [n, k] of [[st.cvL1, 0], [st.cvL2, 0.25], [st.plus, 0.1]]) setA(n, 'opacity', f2(prog(t, tl + k, tl + k + 0.25)));
          const tb = c.convert + 2.0, sb = pop(t, tb, 0.3);
          put(st.band.g, 960, 78, 0, sb, sb, t >= tb ? 1 : 0);
        }

        /* « twenty » */
        const twOn = live(c.twenty, c.twE);
        if (twOn) {
          const n = Math.min(20, Math.floor((t - c.twenty) / 0.13) + 1);
          for (let i = 0; i < 20; i++) vis(st.twenty[i], i < n);
          setA(st.rings, 'opacity', f2(fadeOut(c.twE)));
          setA(st.cnt, 'opacity', f2(fadeOut(c.twE)));
          const s = n + (n < 2 ? ' MISE' : ' MISES');
          if (st.cnt.__s !== s) { st.cnt.__s = s; st.cnt.textContent = s; }
          setA(st.cnt, 'fill', C.lime);
        } else for (let i = 0; i < 20; i++) vis(st.twenty[i], false);

        /* contours pass / seven */
        const pOn = live(c.pass, c.passE), sOn = live(c.seven, c.sevE);
        vis(st.rPass, pOn); vis(st.pEdge.g, pOn);
        if (pOn) { setA(st.rPass, 'stroke-dasharray', `${f2(E.out3(prog(t, c.pass, c.pass + 0.5)))} 2`); setA(st.rPass, 'opacity', f2(fadeOut(c.passE))); const s = pop(t, c.pass + 0.3, 0.3); put(st.pEdge.g, 1620, 740, -2, s, s, fadeOut(c.passE)); }
        vis(st.rSeven, sOn); vis(st.sEdge.g, sOn);
        if (sOn) { setA(st.rSeven, 'stroke-dasharray', `${f2(E.out3(prog(t, c.seven, c.seven + 0.5)))} 2`); setA(st.rSeven, 'opacity', f2(fadeOut(c.sevE))); const s = pop(t, c.seven + 0.3, 0.3); put(st.sEdge.g, st.sEdgeX, 316, 2, s, s, fadeOut(c.sevE)); }

        /* ratio */
        const rOn = live(c.ratio, c.ratE);
        vis(st.ratio.g, rOn); vis(st.per.g, rOn && t >= c.ratio + 0.9);
        if (rOn) {
          const s = pop(t, c.ratio, 0.3); put(st.ratio.g, 1150, 540, -3, s, s, fadeOut(c.ratE));
          const tp = c.ratio + 0.9, s2 = pop(t, tp, 0.3); put(st.per.g, 960, 78, 0, s2, s2, fadeOut(c.ratE));
        }

        /* same */
        const sm = live(c.same, c.sameE);
        vis(st.same1.g, sm); vis(st.same2.g, sm && t >= c.same + 0.9);
        if (sm) {
          const s = pop(t, c.same, 0.3); put(st.same1.g, 960, 78, 0, s, s, fadeOut(c.sameE));
          const t2 = c.same + 0.9, s2 = pop(t, t2, 0.3); put(st.same2.g, 800, 318, -3, s2, s2, fadeOut(c.sameE));
        }

        /* nineteen */
        const nOn = c.nineteen != null && t >= c.nineteen;
        if (nOn) {
          const k = clamp(Math.floor((t - c.nineteen) / (1.5 / 19)) + 1, 0, 19);
          let j = 0;
          st.tags.forEach((q) => { if (!q) return; j++; const t0 = c.nineteen + (j - 1) * (1.5 / 19); vis(q.g, j <= k); if (j <= k) { const s = pop(t, t0, 0.2); put(q.g, q.x, q.y, q.rot, s, s, 1); } });
          vis(st.cnt, true); setA(st.cnt, 'opacity', 1);
          const s = String(k); if (st.cnt.__s !== s) { st.cnt.__s = s; st.cnt.textContent = s; }
          setA(st.cnt, 'fill', C.red);
        } else st.tags.forEach((q) => { if (q) vis(q.g, false); });
        if (!nOn) vis(st.cnt, twOn);
      } catch (e) { /* jamais d'exception */ }
    }
  });
})();
;
/* ==== tools/video/composition/components/criteria-sheet.js ==== */
// Composant `criteria-sheet` (épisode 4) : la fiche officielle des critères. Voir EP4-COMPONENTS.md.
// Fond ink, feuille paper inclinée, 9 lignes de critère illisibles (barres) dont UNE écrite en clair et surlignée.
// Fonction pure du temps ; aplats, aucun dégradé / flou / filter.
// Cues : sheet, count, focus, ink, one-sign. Prop `from` : none | focus.
(() => {
  'use strict';
  const { C, F, E, clamp, prog, f2, sv, g, rect, path, text, put, rng } = ZV;
  let UID = 0;
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const num = (v, d) => (v != null && v !== '' && isFinite(+v) ? +v : d);
  const sstr = (v, d) => (typeof v === 'string' && v.length ? v : d);
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const vis = (n, on) => setA(n, 'visibility', on ? 'visible' : 'hidden');
  const NEVER = -1e6;

  // mesure réelle d'un texte (repli : estimation) ; la sonde est retirée après l'init
  function mkMeasure(root) {
    const n = sv('text', { x: 0, y: 0, visibility: 'hidden' }, root);
    const m = (s, size, mono) => {
      try {
        n.setAttribute('font-family', mono ? F.mono : F.display); n.setAttribute('font-weight', 800); n.setAttribute('font-size', size);
        n.textContent = s;
        const w = n.getComputedTextLength();
        if (w > 0) return w;
      } catch (e) { /* repli */ }
      return String(s).length * size * (mono ? 0.6 : 0.62);
    };
    m.done = () => { try { root.removeChild(n); } catch (e) { /* rien */ } };
    return m;
  }
  // coupe une liste de mots en 2 lignes de largeur la plus équilibrée
  function split2(words, meas, size) {
    if (words.length < 2) return [words.join(' '), ''];
    let best = null;
    for (let k = 1; k < words.length; k++) {
      const a = words.slice(0, k).join(' '), b = words.slice(k).join(' ');
      const w = Math.max(meas(a, size), meas(b, size));
      if (!best || w < best.w) best = { a, b, w };
    }
    return [best.a, best.b];
  }

  const SX0 = 360, SX1 = 1560, SY0 = 60, SY1 = 800, FOLD = 54;
  const LM = 430;                                   // marge gauche du contenu (numéros)
  const ROW0 = 215, ROWMAX = 785;                   // zone des lignes
  const HLH = 116, NORMH = 56;
  const NAMES = ['sheet', 'count', 'focus', 'ink', 'one-sign'];
  const OPTIONAL = { 3: true };                     // `ink` n'est jamais impliqué par un cue plus tardif

  ZV.define('criteria-sheet', {
    init(root, shot) {
      const P = (shot && shot.props) || {};
      const beats = Array.isArray(shot && shot.beats) ? shot.beats : [];
      const dur = isNum(shot && shot.dur) && shot.dur > 0 ? shot.dur : 10;
      const cueT = (n) => { let r = null; for (const b of beats) if (b && b.do === 'cue' && b.name === n && isNum(b.t) && (r == null || b.t < r)) r = b.t; return r; };
      const from = P.from === 'focus' ? 'focus' : 'none';
      const fromIdx = from === 'focus' ? 3 : 0;

      /* ---- calendrier des étapes ---- */
      const raw = NAMES.map(cueT);
      let T = [];
      if (from === 'none' && raw.every((x) => x == null)) {
        const k = Math.min(1, (dur * 0.92) / 8.6);
        T = [0.3 * k, 1.4 * k, 3.2 * k, 5.6 * k, 7.0 * k];
      } else {
        for (let k = 0; k < NAMES.length; k++) {
          if (k < fromIdx) T[k] = NEVER;
          else if (raw[k] != null) T[k] = raw[k];
          else if (!OPTIONAL[k] && raw.slice(k + 1).some((x) => x != null)) T[k] = NEVER;
          else T[k] = null;
        }
      }

      /* ---- props ---- */
      const header = sstr(P.header, 'MANUEL DE RÉFÉRENCE DES PSYCHIATRES AMÉRICAINS · 5ᵉ ÉDITION · 2013');
      const title = sstr(P.title, "TROUBLE LIÉ AU JEU D'ARGENT");
      const count = clamp(Math.round(num(P.count, 9)), 1, 12);
      const hl = clamp(Math.round(num(P.highlight, 6)), 1, count);
      const criterion = sstr(P.criterion, "APRÈS AVOIR PERDU DE L'ARGENT AU JEU, RETOURNER SOUVENT JOUER POUR SE REFAIRE");
      const note = sstr(P.note, 'EN SUBSTANCE');
      const big = sstr(P.big, '9 CRITÈRES');
      const ink = sstr(P.ink, 'NOIR SUR BLANC');
      const sign = sstr(P.sign, 'UN SEUL SIGNE MÉRITE DÉJÀ UNE CONVERSATION');

      const uid = 'cs' + (++UID);
      const st = { T, dur, count, hl };
      const meas = mkMeasure(root);

      /* ---- fond : ink + bandes pocket (l'ombre dure ink reste lisible) ---- */
      rect(root, 0, 0, 1920, 1080, 0, C.ink);
      const bgs = g(root, { transform: 'rotate(-18 960 540)' });
      for (let k = -4; k <= 4; k++) rect(bgs, 960 + k * 300 - 70, -600, 140, 2300, 0, C.pocket);
      const defs = sv('defs', null, root);
      const mkClip = (id, x, y, h) => { const cp = sv('clipPath', { id: uid + id }, defs); return rect(cp, x, y, 0, h, 0, '#000'); };
      st.clipH = mkClip('h', LM, 70, 60);
      st.clipT = mkClip('t', LM, 115, 90);

      /* ---- la feuille (groupe incliné) ---- */
      st.sheetOut = g(root);
      const sheet = g(st.sheetOut, { transform: 'rotate(-1.5 960 430)' });
      const poly = (dx) => `M${SX0 + FOLD + dx} ${SY0 + dx} L${SX1 + dx} ${SY0 + dx} L${SX1 + dx} ${SY1 + dx} L${SX0 + dx} ${SY1 + dx} L${SX0 + dx} ${SY0 + FOLD + dx} Z`;
      path(sheet, poly(16), C.ink);
      path(sheet, poly(0), C.paper, C.ink, 8);
      path(sheet, `M${SX0} ${SY0 + FOLD} L${SX0 + FOLD} ${SY0} L${SX0 + FOLD} ${SY0 + FOLD} Z`, '#CFCABA', C.ink, 6);

      // en-tête et titre (révélés par un balayage)
      let hs = 22, hw = meas(header, hs, true);
      if (hw > 1070) { hs = Math.floor(hs * 1070 / hw * 10) / 10; }
      st.head = text(sheet, header, LM, 108, hs, C.ink, { mono: true });
      st.head.setAttribute('clip-path', `url(#${uid}h)`);
      let ts = 52, tw = meas(title, ts);
      if (tw > 1070) ts = Math.floor(ts * 1070 / tw);
      st.titleT = text(sheet, title, LM, 168, ts, C.ink);
      st.titleT.setAttribute('clip-path', `url(#${uid}t)`);
      st.filet = rect(sheet, LM, 187, 1080, 6, 0, C.ink);

      /* ---- lignes ---- */
      const rowH = count > 1 ? Math.min(NORMH, (ROWMAX - ROW0 - HLH) / (count - 1)) : NORMH;
      const r = rng(2013);
      st.rows = [];
      let y = ROW0;
      const rowY = [], rowHt = [];
      for (let i = 0; i < count; i++) { rowY[i] = y; rowHt[i] = i === hl - 1 ? HLH : rowH; y += rowHt[i]; }
      st.endY = y;
      for (let i = 0; i < count; i++) {
        const o = { y0: rowY[i], h: rowHt[i], hl: i === hl - 1 };
        o.g = g(sheet);
        const cy = o.y0 + o.h / 2;
        const lateRow = i >= count - 2;
        if (i < count - 1 || count === 1) rect(o.g, LM, o.y0 + o.h - 1, 1080, 2, 0, '#CFCABA');
        const num2 = String(i + 1).padStart(2, '0');
        text(o.g, num2, LM, cy + 10, 28, C.ink, { mono: true });
        o.box = rect(o.g, 490, cy - 17, 34, 34, 0, C.paper, C.ink, 4);
        o.bars = g(o.g);
        const two = o.hl || r() > 0.38;
        const max1 = lateRow ? 650 : 940, min1 = lateRow ? 330 : 520;
        const w1 = min1 + r() * (max1 - min1);
        const bh = 14;
        const by = two ? (o.hl ? cy - 22 : cy - 17) : cy - bh / 2;
        rect(o.bars, 556, by, w1, bh, bh / 2, C.ink);
        if (two) rect(o.bars, 556, by + 22 + (o.hl ? 8 : 0), (lateRow ? 120 : 160) + r() * (lateRow ? 330 : 520), bh, bh / 2, C.ink);
        if (o.hl) {
          o.hlRect = rect(o.g, 548, o.y0 + 4, 0, o.h - 8, 4, C.lime);
          o.g.insertBefore(o.hlRect, o.g.firstChild);
          // texte en clair, mot par mot
          const words = criterion.split(/\s+/).filter(Boolean);
          let size = 34;
          const maxW = 788 - 36;
          let lines = split2(words, meas, size);
          while (size > 24 && Math.max(meas(lines[0], size), meas(lines[1], size)) > maxW) { size -= 1; lines = split2(words, meas, size); }
          const gap = size * 0.3;
          o.words = [];
          const hy0 = o.y0 + 4;
          const lh = size * 1.35;
          const base1 = hy0 + (o.h - 8 - (size * 0.72 + lh)) / 2 + size * 0.72;
          lines.forEach((ln, li) => {
            let x = 566;
            const wl = ln.split(/\s+/).filter(Boolean);
            wl.forEach((wd) => {
              const w = meas(wd, size);
              const tn = text(o.g, wd, x, base1 + li * lh, size, C.ink, { len: f2(w) });
              tn.setAttribute('visibility', 'hidden');
              o.words.push(tn);
              x += w + gap;
            });
            if (li === 1) { o.lineEnd = x - gap; o.line2y = base1 + li * lh; }
          });
          o.size = size;
          o.under = rect(o.g, 566, o.line2y + 10, 0, 8, 0, C.ink);
          o.underW = Math.max(40, o.lineEnd - 566);
          // petit sticker « en substance »
          const nw = meas(note, 20, true) + 30;
          o.note = g(sheet);
          rect(o.note, -nw / 2 + 5, -17 + 5, nw, 34, 6, C.ink);
          rect(o.note, -nw / 2, -17, nw, 34, 6, C.white, C.ink, 4);
          text(o.note, note, 0, 7, 20, C.ink, { mono: true, anchor: 'middle', len: f2(meas(note, 20, true)) });
          o.noteX = 1440; o.noteY = o.y0 + o.h / 2;
          // coche (tracée à `one-sign`)
          o.check = path(o.g, `M${490 + 6} ${cy + 1} L${490 + 14} ${cy + 11} L${490 + 34} ${cy - 20}`, 'none', C.ink, 10);
          o.check.setAttribute('stroke-dasharray', '48 48');
          o.check.setAttribute('visibility', 'hidden');
          o.cy = cy;
        }
        st.rows.push(o);
      }
      // voiles ink 62 % sur les autres lignes
      const hr = st.rows[hl - 1];
      st.veils = [];
      if (hl > 1) st.veils.push(rect(sheet, SX0 + 4, ROW0 - 2, SX1 - SX0 - 8, hr.y0 - ROW0 + 2, 0, C.ink, null, 0, { opacity: 0, visibility: 'hidden' }));
      if (hl < count) st.veils.push(rect(sheet, SX0 + 4, hr.y0 + hr.h, SX1 - SX0 - 8, st.endY - (hr.y0 + hr.h) + 6, 0, C.ink, null, 0, { opacity: 0, visibility: 'hidden' }));
      // la ligne en clair et le sticker passent au-dessus des voiles
      sheet.appendChild(hr.g);
      sheet.appendChild(hr.note);
      st.hr = hr;

      /* ---- sticker lime « 9 CRITÈRES » ---- */
      {
        let bs = 46, bwid = meas(big, bs);
        if (bwid > 300) { bs = Math.floor(bs * 300 / bwid); bwid = meas(big, bs); }
        const w = bwid + 50, h = 92;
        st.big = g(root);
        rect(st.big, -w / 2 + 10, -h / 2 + 10, w, h, 16, C.ink);
        rect(st.big, -w / 2, -h / 2, w, h, 16, C.lime, C.paper, 6);
        text(st.big, big, 0, bs * 0.35, bs, C.ink, { anchor: 'middle', len: f2(bwid) });
        st.bigX = Math.min(1800 - w / 2, 1640);
      }

      /* ---- tampon rouge « NOIR SUR BLANC » (marge gauche) ---- */
      {
        const words = ink.split(/\s+/).filter(Boolean);
        let size = 46, lines = split2(words, meas, size);
        while (size > 24 && Math.max(meas(lines[0], size), meas(lines[1], size)) > 210) { size -= 1; lines = split2(words, meas, size); }
        const w = Math.min(252, Math.max(meas(lines[0], size), meas(lines[1], size)) + 44), h = (lines[1] ? 2 : 1) * size * 1.1 + 40;
        st.stamp = g(root);
        rect(st.stamp, -w / 2, -h / 2, w, h, 6, C.ink, C.red, 8);
        rect(st.stamp, -w / 2 + 12, -h / 2 + 12, w - 24, h - 24, 2, 'none', C.red, 3);
        const ly = lines[1] ? [-size * 0.1, size * 1.0] : [size * 0.35];
        text(st.stamp, lines[0], 0, ly[0], size, C.red, { anchor: 'middle', len: f2(meas(lines[0], size)) });
        if (lines[1]) text(st.stamp, lines[1], 0, ly[1], size, C.red, { anchor: 'middle', len: f2(meas(lines[1], size)) });
      }

      /* ---- sticker « un seul signe… » ---- */
      {
        const words = sign.split(/\s+/).filter(Boolean);
        let size = 38, lines = split2(words, meas, size);
        while (size > 24 && Math.max(meas(lines[0], size), meas(lines[1], size)) > 560) { size -= 1; lines = split2(words, meas, size); }
        const w = Math.min(640, Math.max(meas(lines[0], size), meas(lines[1], size)) + 56), h = 104;
        st.sign = g(root);
        rect(st.sign, -w / 2 + 10, -h / 2 + 10, w, h, 14, C.ink);
        rect(st.sign, -w / 2, -h / 2, w, h, 14, C.paper, C.ink, 6);
        const l0 = lines[1] ? -size * 0.2 : size * 0.35;
        text(st.sign, lines[0], 0, l0, size, C.ink, { anchor: 'middle', len: f2(meas(lines[0], size)) });
        if (lines[1]) text(st.sign, lines[1], 0, size * 0.98, size, C.ink, { anchor: 'middle', len: f2(meas(lines[1], size)) });
        st.signX = Math.min(1570, 1895 - w / 2 - 10);
      }
      meas.done();
      return st;
    },

    update(st, t) {
      try {
        t = clamp(t, 0, st.dur + 1);
        const T = st.T;
        const at = (k) => T[k] != null && t >= T[k];
        const ph = (k, d, o) => (T[k] == null ? 0 : prog(t, T[k] + (o || 0), T[k] + (o || 0) + d));

        /* feuille : arrive du bas avec rebond */
        {
          const on = at(0);
          const p = ph(0, 0.55);
          vis(st.sheetOut, on);
          setA(st.sheetOut, 'transform', `translate(0 ${f2(900 * (1 - E.back(p)))})`);
          st.clipH.setAttribute('width', f2(1080 * E.out2(ph(0, 0.35, 0.35))));
          st.clipT.setAttribute('width', f2(1080 * E.out2(ph(0, 0.35, 0.6))));
          setA(st.filet, 'width', f2(1080 * E.out3(ph(0, 0.3, 0.75))));
        }

        /* lignes en cascade (3 i d'écart) */
        for (let i = 0; i < st.rows.length; i++) {
          const o = st.rows[i];
          const ti = T[1] == null ? null : T[1] + i * 0.1;
          const on = ti != null && t >= ti;
          const p = on ? E.out3(prog(t, ti, ti + 0.2)) : 0;
          vis(o.g, on);
          setA(o.g, 'opacity', f2(p));
          setA(o.g, 'transform', `translate(${f2(-40 * (1 - p))} 0)`);
        }
        // sticker « 9 CRITÈRES »
        {
          const p = ph(1, 0.3, 0.05);
          const on = at(1);
          put(st.big, st.bigX, 150, 4, E.back(p), E.back(p), on ? clamp(p * 4) : 0);
        }

        /* focus : voile, surlignage, texte mot par mot */
        const hr = st.hr;
        {
          const tf = T[2];
          const fo = at(2);
          const vp = E.out2(ph(2, 0.2));
          for (const v of st.veils) { setA(v, 'opacity', f2(0.62 * vp)); vis(v, vp > 0.001); }
          setA(hr.hlRect, 'width', f2(788 * E.out3(ph(2, 0.3))));
          vis(hr.hlRect, fo);
          vis(hr.bars, !fo);
          const t0 = tf == null ? 0 : tf + 0.25;
          let last = -1;
          hr.words.forEach((w, k) => { const on = tf != null && t >= t0 + k * 0.12; vis(w, on); if (on) last = k; });
          const tNote = t0 + hr.words.length * 0.12;
          const np = tf == null ? 0 : E.back(prog(t, tNote, tNote + 0.25));
          const on = tf != null && t >= tNote;
          put(hr.note, hr.noteX, hr.noteY, 3, np, np, on ? 1 : 0);
        }

        /* ink : soulignement + tampon */
        {
          const p = ph(3, 8 / 30);
          setA(hr.under, 'width', f2(hr.underW * p));
          vis(hr.under, p > 0);
          const sp = ph(3, 0.2);
          const k = 1 + 0.7 * (1 - E.out3(sp));
          put(st.stamp, 200, 550, -8, k, k, at(3) ? clamp(sp * 5) : 0);
        }

        /* un seul signe : coche + sticker calme */
        {
          const p = ph(4, 6 / 30);
          vis(hr.check, p > 0);
          setA(hr.check, 'stroke-dashoffset', f2(48 * (1 - p)));
          const sp = ph(4, 0.3, 0.2);
          const k = E.out3(sp);
          put(st.sign, st.signX, 752, 2, 0.85 + 0.15 * k, 0.85 + 0.15 * k, at(4) && T[4] + 0.2 <= t ? clamp(sp * 4) : 0);
        }
      } catch (e) { /* jamais d'exception */ }
    }
  });
})();
;
/* ==== tools/video/composition/components/disguise-loop.js ==== */
// Composant `disguise-loop` (épisode 5) : « On le reconnaît. On le sort. » Voir EP5-COMPONENTS.md.
// Fond paper. Une entrée de casino générique, un œil plat, une silhouette SANS visage (déguisements = formes plates), deux mains qui poussent dehors.
// Cues : enter (répétable), spot (répétable), out (répétable), banned, night, recall, name. Fonction pure du temps : l'état de la silhouette est reconstruit
// depuis la liste des cues. Aplats seulement : aucun dégradé, flou, lueur ni filter. Jamais de coup montré.
(() => {
  'use strict';
  const { C, E, clamp, prog, lerp, f2, sv, g, rect, circle, path, line, text } = ZV;
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const str = (v, d) => (typeof v === 'string' && v.trim() ? v.trim() : d);
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const vis = (n, on) => setA(n, 'display', on ? 'inline' : 'none');
  const SH = '#2A2A2A';
  const bwEst = (s, size) => { let a = 0; for (const ch of String(s)) a += size * (ch === ' ' ? 0.28 : /[0-9]/.test(ch) ? 0.5 : /[A-ZÀÂÉÈÊÎÔÛÇ€%+×≈]/.test(ch) ? 0.66 : /[.,:;'’!|]/.test(ch) ? 0.34 : 0.56); return a; };
  let PROBE = null; const BWC = {};
  const bw = (s, size) => {
    s = String(s); const k = size + '|' + s;
    if (BWC[k] !== undefined) return BWC[k];
    if (PROBE) { try { PROBE.textContent = s; PROBE.setAttribute('font-size', size); const w = PROBE.getComputedTextLength(); if (w > 0) { BWC[k] = w; return w; } } catch (e) { /* hors DOM */ } }
    return bwEst(s, size);
  };
  const mw = (s, size) => String(s).length * size * 0.6;
  const putc = (n, x, y, r, sx, sy, o) => {
    if (r === undefined) r = 0; if (sx === undefined) sx = 1; if (sy === undefined) sy = sx; if (o === undefined) o = 1;
    const hid = o <= 0.001 || !sx || !sy;
    setA(n, 'display', hid ? 'none' : 'inline');
    if (hid) return;
    setA(n, 'transform', `translate(${f2(x)} ${f2(y)}) rotate(${f2(r)}) scale(${f2(sx)} ${f2(sy)})`);
    setA(n, 'opacity', f2(o));
  };
  const popS = (t, t0, d) => (t0 == null || t < t0 ? 0 : E.back(prog(t, t0, t0 + (d || 0.3))));
  const mlab = (parent, s, x, y, size, fill, anchor) => text(parent, s, x, y, size, fill, { mono: true, anchor: anchor || 'start', len: f2(mw(s, size)) });
  function mkTag(parent, lines, size, fill, tfill, o) {
    o = o || {};
    const ls = Array.isArray(lines) ? lines : [lines];
    const lh = size * 1.12, px = o.padX || 26, py = o.padY || 14;
    let tw = 0; ls.forEach((s) => { tw = Math.max(tw, bw(s, size)); });
    const w = tw + px * 2, h = ls.length * lh + py * 2 - (lh - size) * 0.2;
    const grp = g(parent);
    const sh = o.sh || 9, r = o.r === undefined ? 14 : o.r;
    rect(grp, -w / 2 + sh, -h / 2 + sh, w, h, r, o.shc || (fill === C.lime ? C.ink : fill === C.paper ? C.lime : C.ink));
    rect(grp, -w / 2, -h / 2, w, h, r, fill, C.ink, o.sw || 6);
    ls.forEach((s, i) => text(grp, s, 0, -h / 2 + py + size * 0.82 + i * lh, size, tfill, { anchor: 'middle', mono: o.mono, len: f2(o.mono ? mw(s, size) : bw(s, size)) }));
    return { g: grp, w, h };
  }

  const SX = 420;                       // x de repos de la silhouette
  const GROUND = 794;
  const DC = [960, 460];                // centre de la porte
  const S1 = 204 / 680;                 // échelle d'une porte miniature
  const CELL = (c, r) => [560 + c * 300, 212 + r * 232];
  const MAIN = [1, 1];

  function mkDoor(parent, band) {
    const d = g(parent);
    rect(d, 620, 230, 680, 570, 0, C.ink);
    rect(d, 632, 236, 656, 558, 0, C.pocket);
    rect(d, 632, 744, 656, 50, 0, C.ink);
    rect(d, 632, 236, 656, 8, 0, C.lime);
    const bats = [0, 1].map((i) => {
      const b = g(d);
      rect(b, 0, 0, 328, 558, 0, C.pocket, C.paper, 6);
      rect(b, 28, 40, 272, 220, 4, 'none', C.paper, 3);
      rect(b, 28, 300, 272, 220, 4, 'none', C.paper, 3);
      circle(b, 296, 280, 13, C.lime, C.ink, 4);
      b.setAttribute('transform', i ? 'translate(1288 236) scale(-1 1)' : 'translate(632 236) scale(1 1)');
      return b;
    });
    rect(d, 620, 120, 680, 116, 0, C.paper, C.ink, 8);
    circle(d, 668, 178, 14, C.lime, C.ink, 5); circle(d, 1252, 178, 14, C.lime, C.ink, 5);
    text(d, 'CASINO', 960, 204, 80, C.ink, { anchor: 'middle', len: f2(bw('CASINO', 80)) });
    let bg = null;
    if (band) {
      bg = g(d);
      const bnd = g(bg, { transform: 'translate(960 470) rotate(-14)' });
      rect(bnd, -350 + 10, -64 + 10, 700, 128, 8, C.ink);
      rect(bnd, -350, -64, 700, 128, 8, C.red, C.ink, 8);
      text(bnd, 'INTERDIT', 0, 34, 100, C.ink, { anchor: 'middle', len: f2(bw('INTERDIT', 100)) });
    }
    return { g: d, bats, band: bg };
  }
  const batT = (b, i, o) => {
    const sx = lerp(1, 0.16, o);
    setA(b, 'transform', i ? `translate(1288 236) scale(${f2(-sx)} 1)` : `translate(632 236) scale(${f2(sx)} 1)`);
  };

  /* ---- déguisements (formes plates) ---- */
  const DRAW = {
    costume(p) {
      path(p, 'M-16 -442 L0 -420 L-16 -404 Z', C.paper); path(p, 'M16 -442 L0 -420 L16 -404 Z', C.paper);
      path(p, 'M0 -426 L13 -408 L9 -330 L0 -298 L-9 -330 L-13 -408 Z', C.lime, C.ink, 3);
      path(p, 'M104 -238 V-262 H150 V-238', 'none', C.ink, 9);
      rect(p, 66, -240, 124, 86, 8, C.red, C.ink, 5);
      rect(p, 116, -208, 24, 16, 3, C.ink);
    },
    wig(p) {
      [[-46, -494, 24], [-22, -520, 26], [14, -524, 26], [44, -496, 24], [-54, -464, 18], [54, -464, 18], [0, -508, 30]].forEach((c) => circle(p, c[0], c[1], c[2], C.lime, C.ink, 5));
    },
    beard(p) { path(p, 'M-36 -456 Q-44 -406 0 -398 Q44 -406 36 -456 Q0 -438 -36 -456 Z', C.paper, C.ink, 5); },
    hat(p) {
      rect(p, -72, -532, 144, 18, 8, C.red, C.ink, 5);
      rect(p, -40, -588, 80, 62, 10, C.red, C.ink, 5);
      rect(p, -40, -548, 80, 12, 0, C.ink);
      circle(p, -18, -480, 14, 'none', C.paper, 6); circle(p, 18, -480, 14, 'none', C.paper, 6);
      line(p, -4, -480, 4, -480, C.paper, 5); line(p, -32, -482, -46, -486, C.paper, 5); line(p, 32, -482, 46, -486, C.paper, 5);
    }
  };

  ZV.define('disguise-loop', {
    init(root, shot) {
      const P = (shot && shot.props) || {};
      const beats = Array.isArray(shot && shot.beats) ? shot.beats : [];
      const dur = isNum(shot && shot.dur) && shot.dur > 0 ? shot.dur : 10;
      const cl = (n) => beats.filter((b) => b && b.do === 'cue' && b.name === n && isNum(b.t)).map((b) => b.t).sort((a, b) => a - b);
      const name = str(P.name, 'KEN USTON'), role = str(P.role, 'EX-VICE-PRÉSIDENT · BOURSE DE SAN FRANCISCO');
      const fake = str(P.fake, 'FAUX NOM'), night = str(P.night, 'SELON LUI : DES VIGILES, LA MÂCHOIRE CASSÉE'), recall = str(P.recall, 'L\'HOMME DU DÉBUT');
      const diss = (Array.isArray(P.disguises) && P.disguises.length ? P.disguises : ['costume', 'wig', 'beard', 'hat']).map(String).filter((d) => DRAW[d]);
      if (!diss.length) diss.push('costume');
      const st = { dur, name, role, fake, diss };
      PROBE = text(root, '', 0, -500, 100, 'none'); PROBE.setAttribute('visibility', 'hidden');
      st.enters = cl('enter'); st.spots = cl('spot'); st.outs = cl('out');
      st.tBanned = cl('banned'); st.tNight = cl('night'); st.tRecall = cl('recall')[0]; st.tName = cl('name')[0];
      const NAMES = ['enter', 'spot', 'out', 'banned', 'night', 'recall', 'name'];
      st.noCue = !NAMES.some((n) => cl(n).length);
      // événements ordonnés qui pilotent la silhouette
      st.evs = [];
      st.enters.forEach((t, i) => st.evs.push({ t, k: 'E', n: i }));
      st.outs.forEach((t) => st.evs.push({ t, k: 'O' }));
      st.tNight.forEach((t) => st.evs.push({ t, k: 'N' }));
      st.evs.sort((a, b) => a.t - b.t);
      // intervalles « banned » : jusqu'au prochain cue qui montre à nouveau la scène
      st.ban = st.tBanned.map((t) => {
        let e = null;
        [st.enters, st.spots, st.outs, st.tNight, st.tRecall != null ? [st.tRecall] : [], st.tName != null ? [st.tName] : []].forEach((a) => a.forEach((x) => { if (x > t + 0.01 && (e == null || x < e)) e = x; }));
        return { a: t, b: e };
      });

      rect(root, 0, 0, 1920, 1080, 0, C.paper);
      const bgs = g(root, { transform: 'rotate(-18 960 540)' });
      for (let k = -4; k <= 4; k++) rect(bgs, 960 + k * 300 - 40, -600, 80, 2300, 0, '#EAE6DA');

      /* ---- monde (porte, sol, silhouette) ---- */
      st.W = g(root);
      st.ground = rect(st.W, 0, GROUND, 1920, 14, 0, C.ink);
      st.door = mkDoor(st.W, true);
      st.frame = rect(st.W, SX - 100, 262, 200, GROUND - 262 + 6, 6, 'none', C.red, 6);
      st.sil = g(st.W);                       // origine = pieds, centré sur x
      const S = st.sil;
      rect(S, -38, -204, 30, 204, 8, C.ink); rect(S, 8, -204, 30, 204, 8, C.ink);
      line(S, -66, -414, -86, -250, C.ink, 30); line(S, 66, -414, 86, -250, C.ink, 30);
      path(S, 'M-62 -430 L62 -430 L52 -190 L-52 -190 Z', C.ink, C.ink, 14);
      rect(S, -14, -452, 28, 28, 4, C.ink);
      circle(S, 0, -478, 42, C.ink);
      st.dis = {};
      diss.forEach((d) => { if (!st.dis[d]) { const gg = g(S); DRAW[d](gg); st.dis[d] = gg; } });
      st.badge = g(st.W);                     // le badge ne s'incline pas avec la silhouette
      st.bsh = rect(st.badge, -90, -90, 200, 56, 8, C.ink);
      st.bg = rect(st.badge, -100, -100, 200, 56, 8, C.paper, C.ink, 6);
      st.bt = [0, 1, 2].map(() => text(st.badge, '', 0, 0, 30, C.ink, { mono: true, anchor: 'middle' }));
      st.bar = rect(st.badge, -120, 0, 240, 22, 2, C.ink);
      st.spotTag = mkTag(st.W, 'RECONNU', 44, C.red, C.ink, { sh: 8 });
      {
        const ls = bw(recall, 44) > 330 ? (() => { const w = recall.split(' '); let best = null; for (let k = 1; k < w.length; k++) { const a = w.slice(0, k).join(' '), b = w.slice(k).join(' '); const m = Math.max(bw(a, 44), bw(b, 44)); if (!best || m < best.m) best = { a, b, m }; } return best ? [best.a, best.b] : [recall]; })() : [recall];
        st.rec = g(st.W);
        st.recTag = mkTag(st.rec, ls, 44, C.lime, C.ink, { sh: 9 });
        path(st.rec, 'M0 -16 H24 V-32 L52 0 L24 32 V16 H0 Z', C.lime, C.ink, 5);
        st.recW = st.recTag.w;
        st.recArrow = st.rec.lastChild;
      }

      /* ---- grille « banned » ---- */
      st.minis = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
        if (c === MAIN[0] && r === MAIN[1]) continue;
        const m = g(root);
        mkDoor(m, true);
        st.minis.push({ g: m, c, r, i: st.minis.length });
      }
      st.partout = mkTag(root, 'PARTOUT', 64, C.lime, C.ink, { sh: 10 });

      /* ---- hud : œil, compteur, carte de nuit, mains ---- */
      st.eye = g(root);
      path(st.eye, 'M -112 0 C -60 -78 60 -78 112 0 C 60 78 -60 78 -112 0 Z', C.white, C.ink, 8);
      st.iris = g(st.eye);
      circle(st.iris, 0, 0, 46, C.lime, C.ink, 5); circle(st.iris, 0, 0, 20, C.ink);
      st.cnt = mkTag(root, 'SORTI : 0', 30, C.lime, C.ink, { sh: 7, padX: 16, padY: 9, sw: 5 });
      st.cntT = st.cnt.g.querySelectorAll('text')[0];
      st.nightG = g(root);
      {
        const maxc = 26, words = night.split(' '), ls = []; let cur = '';
        words.forEach((w) => { if ((cur + ' ' + w).trim().length > maxc && cur) { ls.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); });
        if (cur) ls.push(cur);
        const w = Math.max.apply(null, ls.map((s) => mw(s, 26))) + 48, h = ls.length * 40 + 36;
        st.nightLs = ls; st.nightW = w;
        const x0 = 1860 - w, y0 = 340;
        rect(st.nightG, x0 + 10, y0 + 10, w, h, 10, C.red);
        rect(st.nightG, x0, y0, w, h, 10, C.ink, C.ink, 6);
        st.nightT = ls.map((s, i) => { const n = text(st.nightG, '', x0 + 24, y0 + 50 + i * 40, 26, C.paper, { mono: true }); return n; });
        st.nx0 = x0;
      }
      st.hands = [0, 1].map((i) => {
        const h = g(root);
        rect(h, -30, -34, 70, 68, 18, C.ink);
        rect(h, -74, -30, 48, 16, 8, C.ink); rect(h, -78, -8, 52, 16, 8, C.ink); rect(h, -72, 14, 46, 16, 8, C.ink);
        rect(h, -10, -50, 30, 24, 10, C.ink);
        return h;
      });
      PROBE.parentNode.removeChild(PROBE); PROBE = null;
      return st;
    },

    update(st, t) {
      try {
        t = clamp(t, 0, st.dur + 1);

        /* ---- état de la silhouette ---- */
        let cur = st.enters.length ? { m: 'absent' } : { m: 'idle', t0: -1, d: 0, pass: 0 };
        let nEnter = 0;
        for (const e of st.evs) {
          if (e.t > t) break;
          if (e.k === 'E') { nEnter++; cur = { m: 'in', t0: e.t, d: e.n, pass: e.n }; }
          else if (e.k === 'O') { if (cur.m === 'in' || cur.m === 'idle') cur = { m: 'out', t0: e.t, d: cur.d, pass: cur.pass }; }
          else cur = { m: 'night', t0: e.t, d: -1, pass: cur.pass || 0 };
        }
        let sx = SX, sVis = false, sRot = 0, sBob = 0, door = 0;
        if (cur.m === 'in') {
          const p = prog(t, cur.t0, cur.t0 + 0.9);
          sx = lerp(-220, SX, E.out3(p)); sVis = true;
          sBob = p < 1 ? Math.abs(Math.sin(p * 9)) * 6 : 0;
          door = E.out3(prog(t, cur.t0 + 0.4, cur.t0 + 0.8));
        } else if (cur.m === 'idle') { sVis = true; door = 0.6; }
        else if (cur.m === 'out') {
          const q = prog(t, cur.t0, cur.t0 + 0.467);
          sx = lerp(SX, -280, E.in2(q)); sVis = q < 1;
          door = 1 - E.out3(prog(t, cur.t0 + 0.5, cur.t0 + 0.9));
        } else if (cur.m === 'night') {
          sVis = true; sx = SX - 10; sRot = -7 * E.out3(prog(t, cur.t0 + 0.2, cur.t0 + 0.8));
          door = 1 - E.out3(prog(t, cur.t0, cur.t0 + 0.4));
        }
        const night = cur.m === 'night';

        /* ---- banned : dézoom vers la grille de 12 portes ---- */
        let bp = 0;
        for (const b of st.ban) {
          if (t < b.a) continue;
          const v = b.b != null && t >= b.b ? 1 - E.io3(prog(t, b.b, b.b + 0.35)) : E.io3(prog(t, b.a, b.a + 0.65));
          bp = Math.max(bp, v);
        }
        const cel = CELL(MAIN[0], MAIN[1]);
        const sc = lerp(1, S1, bp);
        const cxw = lerp(DC[0], cel[0], bp), cyw = lerp(DC[1], cel[1], bp);
        setA(st.W, 'transform', `translate(${f2(cxw - sc * DC[0])} ${f2(cyw - sc * DC[1])}) scale(${f2(sc)})`);
        vis(st.ground, bp < 0.5);
        vis(st.door.band, bp > 0.02);
        if (bp > 0.02) setA(st.door.band, 'opacity', f2(clamp((bp - 0.3) / 0.4)));
        // portes
        const om = bp > 0.02 ? 0 : door;
        batT(st.door.bats[0], 0, door * (1 - clamp(bp * 3))); batT(st.door.bats[1], 1, door * (1 - clamp(bp * 3)));
        st.minis.forEach((m) => {
          const t0 = (st.ban.length ? 0 : 0);
          // pop échelonné pendant le dézoom
          const p = clamp((bp - 0.15 - m.i * 0.05) / 0.35);
          const s = S1 * E.back(p);
          const c = CELL(m.c, m.r);
          putc(m.g, c[0] - s * DC[0], c[1] - s * DC[1], 0, s, s, p > 0 ? 1 : 0);
        });
        const pp = clamp((bp - 0.5) / 0.5);
        putc(st.partout.g, 225, 440, -6, E.back(pp), E.back(pp), pp > 0 ? 1 : 0);

        /* ---- silhouette + déguisement ---- */
        const sil = sVis && bp < 0.34 ? 1 : 0;
        const fade = 1 - clamp(bp * 3);
        putc(st.sil, sx, GROUND + 0, sRot, 1, 1, sil * fade);
        if (sil) {
          setA(st.sil, 'transform', `translate(${f2(sx)} ${f2(GROUND - sBob)}) rotate(${f2(sRot)})`);
          const dn = cur.d >= 0 ? st.diss[Math.min(cur.d, st.diss.length - 1)] : null;
          for (const k in st.dis) vis(st.dis[k], k === dn);
        }

        /* ---- badge ---- */
        let l1, l2 = null, l3 = null, redact = false;
        const nameOn = st.tName != null && t >= st.tName;
        if (nameOn) {
          l1 = st.name;
          const i = st.role.indexOf(' · ');
          if (i > 0) { l2 = st.role.slice(0, i); l3 = st.role.slice(i + 3); }
          else { const w = st.role.split(' '); const h = Math.ceil(w.length / 2); l2 = w.slice(0, h).join(' '); l3 = w.slice(h).join(' '); }
        } else if (cur.pass >= 1 && cur.m !== 'night') { l1 = st.fake; redact = true; }
        else l1 = cur.m === 'night' ? '' : 'UN CLIENT';
        const sz1 = nameOn ? 34 : 30, sz2 = 24;
        const wTxt = Math.max(mw(l1 || '', sz1), l2 ? mw(l2, sz2) : 0, l3 ? mw(l3, sz2) : 0, redact ? 240 : 0);
        const bw_ = wTxt + 50;
        const nl = (l1 ? 1 : 0) + (l2 ? 1 : 0) + (l3 ? 1 : 0) + (redact ? 1 : 0);
        const bh = !l1 ? 0 : (nameOn ? 46 + 80 : redact ? 56 + 38 : 56);
        const by = -(GROUND - 186);          // bas du badge à y = 186 (repère local : y écran − GROUND)
        const top = by - bh;
        const bPop = nameOn ? popS(t, st.tName, 0.3) : 1;
        vis(st.badge, !!l1 && sil > 0);
        setA(st.badge, 'transform', `translate(${f2(sx)} ${f2(GROUND)})`);
        if (l1) {
          setA(st.bg, 'x', f2(-bw_ / 2)); setA(st.bg, 'y', f2(top)); setA(st.bg, 'width', f2(bw_)); setA(st.bg, 'height', f2(bh));
          setA(st.bsh, 'x', f2(-bw_ / 2 + 8)); setA(st.bsh, 'y', f2(top + 8)); setA(st.bsh, 'width', f2(bw_)); setA(st.bsh, 'height', f2(bh));
          const set = (n, s, y, size) => { if (s == null) { vis(n, false); return; } vis(n, true); if (n.__s !== s) { n.__s = s; n.textContent = s; setA(n, 'textLength', f2(mw(s, size))); } setA(n, 'font-size', size); setA(n, 'y', f2(y)); };
          set(st.bt[0], l1, top + (nameOn ? 38 : 38), sz1);
          set(st.bt[1], l2, top + 78, sz2);
          set(st.bt[2], l3, top + 108, sz2);
          vis(st.bar, redact);
          if (redact) { setA(st.bar, 'x', f2(-120)); setA(st.bar, 'y', f2(top + 56)); setA(st.bar, 'width', 240); setA(st.bar, 'height', 22); }
          setA(st.badge, 'opacity', f2(Math.min(1, bPop)));
        }
        void nl;

        /* ---- spot : cadre rouge + RECONNU ; le cadre dure jusqu'au `out` suivant ---- */
        let spotOn = false, spotT = null;
        const enders = st.outs.map((x) => x + 0.05).concat(st.enters, st.tNight, st.tBanned);
        for (const s of st.spots) if (s <= t) {
          const ended = enders.some((x) => x > s + 0.01 && x <= t);
          if (!ended) { spotOn = true; spotT = s; }
        }
        spotOn = spotOn && sil > 0 && cur.m !== 'out';
        if (spotOn) {
          const q = popS(t, spotT, 0.25);
          setA(st.frame, 'x', f2(sx - 100)); vis(st.frame, true);
          setA(st.frame, 'opacity', f2(Math.min(1, q)));
          putc(st.spotTag.g, 160, 650, -6, q, q, 1);
        } else { vis(st.frame, false); putc(st.spotTag.g, 160, 650, -6, 0, 0, 0); }

        /* ---- recall ---- */
        const tr = st.tRecall;
        const rp = tr != null && t >= tr && sil > 0 ? popS(t, tr, 0.3) : 0;
        putc(st.rec, 165, 470, -5, rp, rp, rp > 0 ? 1 : 0);
        if (rp > 0) { setA(st.recArrow, 'transform', `translate(${f2(st.recW / 2 + 4)} 0)`); }

        /* ---- œil : s'ouvre à 0,2 s, balaie ; se tourne vers la silhouette au `spot` ---- */
        const open = E.out3(prog(t, 0.2, 0.7));
        const eyeOn = bp < 0.05 ? 1 : 0;
        const look = spotOn ? E.out3(prog(t, spotT, spotT + 0.25)) : 0;
        const swx = Math.sin(t * 1.4) * 22, swy = Math.cos(t * 0.9) * 5;
        const ix = lerp(swx, -34, look), iy = lerp(swy, 8, look);
        putc(st.eye, 1640, 200, 0, 1.05, 1.05 * Math.max(0.04, open), eyeOn ? 1 : 0);
        setA(st.iris, 'transform', `translate(${f2(ix)} ${f2(iy)})`);

        /* ---- compteur « SORTI : n » ---- */
        let nOut = 0, tLast = null;
        for (const o of st.outs) if (o <= t) { nOut++; tLast = o; }
        const cs = nOut > 0 ? 1 + 0.25 * (1 - E.out3(prog(t, tLast, tLast + 0.25))) : 0;
        putc(st.cnt.g, 30 + st.cnt.w / 2, 78, 0, cs, cs, nOut > 0 ? 1 : 0);
        const ctxt = 'SORTI : ' + nOut;
        if (st.cntT.__s !== ctxt) { st.cntT.__s = ctxt; st.cntT.textContent = ctxt; }

        /* ---- carte de nuit (typewriter, sous l'œil) ---- */
        const tn = st.tNight.filter((x) => x <= t).pop();
        const nOn = night && tn != null;
        vis(st.nightG, nOn);
        if (nOn) {
          const total = st.nightLs.reduce((a, s) => a + s.length, 0);
          let shown = Math.floor(total * prog(t, tn + 0.5, tn + 2.0));
          st.nightLs.forEach((s, i) => { const part = s.slice(0, Math.max(0, Math.min(s.length, shown))); shown -= s.length; const n = st.nightT[i]; if (n.__s !== part) { n.__s = part; n.textContent = part; } });
          setA(st.nightG, 'opacity', f2(prog(t, tn + 0.4, tn + 0.6)));
        }

        /* ---- mains qui poussent : arrivent par le bord du cadre, jamais de coup ---- */
        let hOn = 0, hx = 2100;
        const lastOut = st.outs.filter((x) => x - 0.3 <= t).pop();
        if (lastOut != null && bp < 0.05 && cur.m === 'out' && cur.t0 === lastOut) {
          const arrive = E.out3(prog(t, lastOut - 0.3, lastOut - 0.02));
          const push = prog(t, lastOut, lastOut + 0.467);
          const back = E.in2(prog(t, lastOut + 0.5, lastOut + 0.85));
          hx = lerp(2100, SX + 176, arrive) + (sx - SX) * 1 + back * 1900;
          hOn = 1;
        } else {
          // la main arrive juste avant le cue (la silhouette est encore en place)
          const nextOut = st.outs.find((x) => x > t);
          if (nextOut != null && bp < 0.05 && t >= nextOut - 0.3 && sil > 0) { hx = lerp(2100, SX + 176, E.out3(prog(t, nextOut - 0.3, nextOut - 0.02))); hOn = 1; }
        }
        st.hands.forEach((h, i) => putc(h, hx, i ? 560 : 440, i ? 4 : -4, 1, 1, hOn));
      } catch (e) { /* jamais d'exception */ }
    }
  });
})();
;
/* ==== tools/video/composition/components/division.js ==== */
// Composant « division » : voir tools/video/composition/INTERFACE.md. Fonction pure du temps du plan, aplats seulement.
(() => {
  /* ---- aides typographiques locales (mêmes lignes dans chaque composant du rôle « Typo ») ---- */
  const { C, F, E, clamp, prog, lerp, f2, put, g, rect, text, path, line, sv, circle } = ZV;
  const COL = { ink: C.ink, paper: C.paper, lime: C.lime, red: C.red, white: C.white };
  const TINT = { ink: '#1A1A1A', lime: '#B9EC22', paper: '#E4E0D3', red: '#F0452F' };
  const NB = ' ';
  let UID = 0;
  const colOf = (k, d) => COL[k] || k || d;
  // largeur d'une chaîne (mesure réelle via un <text> caché), ramenée à `size` px
  function mkProbe(root) {
    const n = sv('text', { x: 0, y: 0, 'font-size': 100, 'font-weight': 800, visibility: 'hidden' }, root);
    const cache = {};
    return function w(str, size, o) {
      o = o || {};
      const key = (o.mono ? 'm' : 'd') + (o.sp || 0) + '|' + str;
      let v = cache[key];
      if (v === undefined) {
        n.setAttribute('font-family', o.mono ? F.mono : F.display);
        n.setAttribute('letter-spacing', (o.sp || 0) * 100);
        n.textContent = str.replace(/ /g, NB);
        try { v = n.getComputedTextLength(); } catch (e) { v = 0; }
        if (!(v > 0)) v = str.length * (o.mono ? 60 : 58);
        cache[key] = v;
      }
      return v * size / 100;
    };
  }
  // 1 234,5 : espace fine insécable pour les milliers, virgule décimale
  function fnum(v, dec) {
    const s = Math.abs(v).toFixed(dec || 0).split('.');
    const i = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return (v < 0 ? '−' : '') + i + (s[1] ? ',' + s[1] : '');
  }
  // lie ponctuation et opérateurs au mot précédent (jamais de « ? » seul en début de ligne)
  const glue = (s) => String(s).replace(/ (?=[?:%!;€¢÷×=+−])/g, NB).replace(/([÷×=+−]) (?=\S)/g, '$1' + NB);
  // coupe `str` en ≤ maxRows lignes équilibrées tenant dans maxW (null si impossible)
  function breaks(str, S, maxW, wf, maxRows) {
    if (wf(str, S) <= maxW) return [str];
    const words = str.split(' ');
    if (words.length < 2 || maxRows < 2) return null;
    let best = null, bm = 1e9;
    for (let k = 1; k < words.length; k++) {
      const a = words.slice(0, k).join(' '), b = words.slice(k).join(' ');
      const m = Math.max(wf(a, S), wf(b, S));
      if (m < bm) { bm = m; best = [a, b]; }
    }
    if (bm <= maxW) return best;
    if (maxRows >= 3 && words.length >= 3) {
      bm = 1e9; best = null;
      for (let k = 1; k < words.length - 1; k++) for (let j = k + 1; j < words.length; j++) {
        const a = words.slice(0, k).join(' '), b = words.slice(k, j).join(' '), c = words.slice(j).join(' ');
        const m = Math.max(wf(a, S), wf(b, S), wf(c, S));
        if (m < bm) { bm = m; best = [a, b, c]; }
      }
      if (bm <= maxW) return best;
    }
    return null;
  }
  // fond plat + trame de points qui dérive doucement + repères de coupe aux angles
  function backdrop(root, bgk, uid, opt) {
    opt = opt || {};
    const tint = TINT[bgk] || TINT.ink;
    const fill = bgk === 'wheel' ? C.ink : colOf(bgk, C.ink);
    rect(root, 0, 0, 1920, 1080, 0, fill);
    const o = {};
    if (opt.dots !== false) {
      const defs = sv('defs', null, root);
      o.pat = sv('pattern', { id: uid + 'd', width: 64, height: 64, patternUnits: 'userSpaceOnUse' }, defs);
      circle(o.pat, 32, 32, 3.6, tint);
      rect(root, 0, 0, 1920, 1080, 0, `url(#${uid}d)`);
    }
    if (opt.marks !== false) {
      const mc = bgk === 'ink' || bgk === 'wheel' ? '#3A3A3A' : C.ink;
      path(root, 'M56 160V56H160M1760 56H1864V160M1864 920V1024H1760M160 1024H56V920', 'none', mc, 8, { 'stroke-linecap': 'butt', 'stroke-linejoin': 'miter' });
    }
    return o;
  }
  const drift = (o, t) => { if (o && o.pat) o.pat.setAttribute('patternTransform', `translate(${f2(t * 14)} ${f2(t * 9)})`); };
  // pastille Mono (kicker) : fond/texte selon l'aplat
  function pill(parent, str, bgk, size, W) {
    const dark = bgk === 'ink' || bgk === 'wheel';
    const fill = dark ? C.lime : C.ink;
    const tc = dark ? C.ink : (bgk === 'lime' ? C.lime : C.paper);
    const sp = 0.1;
    const w = W(str, size, { mono: true, sp }) + 64, h = size * 1.7;
    const gr = g(parent);
    rect(gr, -w / 2 + 7, -h / 2 + 7, w, h, 14, C.ink);
    rect(gr, -w / 2, -h / 2, w, h, 14, fill, C.ink, 5);
    text(gr, str, 0, size * 0.35, size, tc, { mono: true, anchor: 'middle', spacing: f2(sp * size) });
    return { g: gr, w, h };
  }
  // Définition d'un composant : `build` (une fois) / `draw` (pure). La mise en page dépend des mesures de police :
  // si les polices ne sont pas encore chargées à l'init, on reconstruit dès qu'elles le sont (puis on redessine).
  const FONTS = ['800 100px "Bricolage Grotesque"', '800 100px "JetBrains Mono"'];
  const fontsOk = () => { try { return FONTS.every((f) => document.fonts.check(f)); } catch (e) { return true; } };
  function defineTypo(id, impl) {
    const rebuild = (st) => {
      while (st.root.firstChild) st.root.removeChild(st.root.firstChild);
      st.s = impl.build(st.root, st.shot);
      st.ok = true;
      if (st.last !== null) impl.draw(st.s, st.last, st.shot);
    };
    ZV.define(id, {
      init(root, shot) {
        const st = { root, shot, last: null, ok: fontsOk() };
        st.s = impl.build(root, shot);
        if (!st.ok) { try { Promise.all(FONTS.map((f) => document.fonts.load(f))).then(() => { if (!st.ok && fontsOk()) rebuild(st); }); } catch (e) { /* tant pis */ } }
        return st;
      },
      update(st, t, shot) {
        st.last = t;
        if (!st.ok && fontsOk()) rebuild(st);
        impl.draw(st.s, t, shot || st.shot);
      }
    });
  }

  const FR = 1 / 30;
  const SPD = -0.02;

  defineTypo('division', {
    build(root, shot) {
      const P = shot.props || {};
      const uid = 'dv' + (++UID);
      const W = mkProbe(root);
      const st = { shot, uid, W };
      st.bd = backdrop(root, 'ink', uid, {});
      const cue = (n, d) => { const v = ZV.cue(shot, n); return v === null ? d : v; };
      const wf = (s, S) => W(s, S, { sp: SPD });
      const eq = String(P.equation || '36 ÷ 37').split(/\s+/);       // ["36", "÷", "37"]
      const resStr = String(P.result || '0,973');
      st.t = { eq: cue('equation', 0), result: cue('result', 1.6), coin: cue('coin', 2), bar: cue('bar', 3.1), keep: cue('keep', 4.1), split: cue('split', 7), gapLabel: cue('gap-label', 8.5) };

      // ---- équation (jeton par jeton), taille 220 ----
      const BS = 220, gap = 46;
      const ew = eq.map((s) => wf(s, BS));
      const eqTotal = ew.reduce((a, b) => a + b, 0) + gap * (eq.length - 1);
      st.eqG = g(root);
      let x = -eqTotal / 2;
      st.eqTok = eq.map((s, i) => {
        const gr = g(st.eqG);
        const op = !/\d/.test(s);
        text(gr, s, -ew[i] / 2, 0.36 * BS, BS, op ? C.lime : C.paper, { spacing: f2(SPD * BS) });
        const o = { g: gr, x: x + ew[i] / 2, i };
        x += ew[i] + gap;
        return o;
      });
      st.eqTotal = eqTotal; st.BS = BS;
      // ---- résultat « = 0,973 » (taille 130) qui roule ----
      const RS = 130, rs = RS / BS;
      const dw = Math.max(...'0123456789'.split('').map((d) => wf(d, RS)));
      const cw = (ch) => (/\d/.test(ch) ? dw : wf(ch, RS));
      const eqW = eqTotal * rs, eqSignW = wf('=', RS), resChars = resStr.split('');
      const resW = resChars.reduce((a, ch) => a + cw(ch), 0);
      const rowTotal = eqW + 40 + eqSignW + 44 + resW;
      st.rowY = 178;
      const rx0 = 960 - rowTotal / 2;
      st.eqFinal = { x: rx0 + eqW / 2, y: st.rowY, s: rs };
      st.resG = g(root, { transform: `translate(0 ${st.rowY})` });
      text(st.resG, '=', rx0 + eqW + 40, 0.36 * RS, RS, C.paper, { spacing: f2(SPD * RS) });
      let cx = rx0 + eqW + 40 + eqSignW + 44;
      st.resDigits = resChars.map((ch, i) => {
        const nd = text(st.resG, ch, cx + cw(ch) / 2, 0.36 * RS, RS, C.lime, { anchor: 'middle', spacing: f2(SPD * RS) });
        const o = { n: nd, ch, i, isD: /\d/.test(ch) };
        cx += cw(ch);
        return o;
      });
      // plaque lime derrière le résultat une fois posé
      st.resPlateX = rx0 + eqW + 40 + eqSignW + 44 - 22; st.resPlateW = resW + 44;
      st.resPlate = rect(st.resG, st.resPlateX + 10, 0.36 * RS - 0.82 * RS + 10, st.resPlateW, 1.0 * RS, 16, C.ink);
      st.resG.insertBefore(st.resPlate, st.resG.firstChild);
      st.resPlate2 = rect(st.resG, st.resPlateX, 0.36 * RS - 0.82 * RS, st.resPlateW, 1.0 * RS, 16, C.lime, C.ink, 6);
      st.resG.insertBefore(st.resPlate2, st.resPlate.nextSibling);
      st.resRS = RS;

      // ---- pièce → barre ----
      const BY = 568, BH = 190, BW = 1300;
      st.BY = BY; st.BH = BH; st.BW = BW;
      const defs = sv('defs', null, root);
      const mkPiece = (side) => {
        const clip = sv('clipPath', { id: uid + side }, defs);
        const cr = rect(clip, 0, 0, 10, 10);
        const gr = g(root, { 'clip-path': `url(#${uid}${side})` });
        const sh = rect(gr, 0, 0, 10, 10, 95, C.ink);
        const body = rect(gr, 0, 0, 10, 10, 95, C.white);
        const ov = null;
        const bd = rect(gr, 0, 0, 10, 10, 95, 'none', C.ink, 8);
        const cut = line(gr, 0, 0, 0, 0, C.ink, 6, { 'stroke-linecap': 'butt' });
        return { g: gr, clip: cr, sh, body, ov, bd, cut };
      };
      st.pL = mkPiece('L'); st.pR = mkPiece('R');
      st.brace = path(root, '', 'none', C.lime, 12, { 'stroke-linecap': 'butt' });
      st.coinTxt = text(root, '1 €', 960, BY + 0.36 * 84, 84, C.ink, { anchor: 'middle', spacing: f2(SPD * 84) });
      st.keepTxt = text(root, P.keep || '97,3 ¢', 960, BY + 0.36 * 120, 120, C.ink, { anchor: 'middle', spacing: f2(SPD * 120) });
      // étiquettes
      const mkSticker = (str, fill, tcol, size, mono, w0) => {
        const w = W(str, size, { mono, sp: mono ? 0.04 : 0 }) + 64, h = size * 1.75, gr = g(root);
        rect(gr, -w / 2 + 10, -h / 2 + 10, w, h, 16, C.ink); rect(gr, -w / 2, -h / 2, w, h, 16, fill, C.ink, 6);
        text(gr, str, 0, size * 0.36, size, tcol, { mono, anchor: 'middle', spacing: mono ? f2(0.04 * size) : 0 });
        return { g: gr, w, h };
      };
      st.barLabel = mkSticker(String(P.bar_label || '1 € = 100 ¢'), C.paper, C.ink, 52, true);
      st.gapSt = mkSticker(String(P.gap || '2,7 ¢'), C.lime, C.ink, 60, false);
      st.gapLabel = mkSticker(String(P.gap_label || 'L’AVANTAGE DE LA MAISON').toUpperCase(), C.paper, C.ink, 46, false);
      return st;
    },

    draw(st, t, shot) {
      drift(st.bd, t);
      const T = st.t, E = ZV.E;
      // ---------- équation ----------
      const q = clamp((t - T.result) / 0.5), qe = E.io3(q);
      const ef = st.eqFinal;
      for (const tk of st.eqTok) {
        const t0 = T.eq + tk.i * 0.3, tt = t - t0;
        if (tt < 0) { put(tk.g, tk.x, -300, 0, 1, 1, 0); continue; }
        const p = clamp(tt / 0.55), y = lerp(-300, 0, E.bounce(p));
        put(tk.g, tk.x, y, 0, 1, 1, 1);
      }
      // groupe de l'équation : centre (960,470) -> rangée du haut
      const gx = lerp(960, ef.x, qe), gy = lerp(480, ef.y, qe), gs = lerp(1, ef.s, qe);
      st.eqG.setAttribute('transform', `translate(${f2(gx)} ${f2(gy)}) scale(${f2(gs)})`);
      // ---------- résultat qui roule ----------
      const tr = T.result + 0.25;
      const RS = st.resRS;
      st.resG.setAttribute('visibility', t >= tr ? 'visible' : 'hidden');
      let allIn = 0;
      for (const d of st.resDigits) {
        if (!d.isD) continue;
        const dq = clamp((t - (tr + d.i * 0.13)) / 0.6);
        const fin = parseInt(d.ch, 10);
        const shift = Math.floor(18 * Math.pow(1 - dq, 1.6));
        d.n.textContent = String((fin + shift) % 10);
        d.n.setAttribute('transform', `translate(0 ${f2(Math.sin(t * 60 + d.i) * (1 - dq) * 10)})`);
        allIn = Math.max(allIn, dq);
      }
      const doneT = tr + st.resDigits.length * 0.13 + 0.6;
      const pq = E.out3(clamp((t - doneT) / 0.2));
      st.resPlate.setAttribute('visibility', pq > 0 ? 'visible' : 'hidden');
      st.resPlate2.setAttribute('visibility', pq > 0 ? 'visible' : 'hidden');
      for (const d of st.resDigits) d.n.setAttribute('fill', pq > 0.5 ? C.ink : C.lime);
      // ---------- pièce / barre ----------
      const cy = st.BY, bh = st.BH, bw0 = bh, cp = clamp((t - T.coin) / (8 * FR));
      const bp = E.out3(clamp((t - T.bar) / 0.5));
      const w = lerp(bw0, st.BW, bp);
      const coinOn = t >= T.coin;
      const shk = ZV.shakeAt(t, T.split, 6, 0.35);
      const scl = coinOn ? lerp(0.2, 1, E.back(cp)) : 0;
      const left = 960 - w / 2 + shk[0], top = cy - bh / 2 + (t >= T.bar ? shk[1] : 0);
      const cutX = left + w * 0.973;
      const split = t >= T.split;
      const sp = E.back(clamp((t - T.split - 0.1) / 0.55));
      // placer les rectangles d'une pièce (dx : décalage de la lamelle)
      const place = (pc, side) => {
        const r = pc;
        const sx = side === 'R' ? sp * 150 : 0, sy = side === 'R' ? sp * 26 : 0, rot = side === 'R' ? sp * 9 : 0;
        r.g.setAttribute('transform', side === 'R' ? `translate(${f2(cutX + sx)} ${f2(cy + sy)}) rotate(${f2(rot)}) translate(${f2(-cutX)} ${f2(-cy)})` : '');
        // le grossissement de la pièce : scale autour du centre
        const ww = w * (coinOn ? scl : 0) , hh = bh * scl;
        const L = 960 - ww / 2 + shk[0], Tt = cy - hh / 2 + (t >= T.bar ? shk[1] : 0), cutXs = L + ww * 0.973;
        for (const [node, ox] of [[r.sh, 12], [r.body, 0], [r.bd, 0]]) { node.setAttribute('x', f2(L + ox)); node.setAttribute('y', f2(Tt + ox)); node.setAttribute('width', f2(Math.max(0.01, ww))); node.setAttribute('height', f2(Math.max(0.01, hh))); node.setAttribute('rx', f2(Math.min(hh / 2, lerp(bh / 2, 28, bp) * scl))); }
        if (side === 'R') { r.g.setAttribute('transform', `translate(${f2(sx)} ${f2(sy)}) rotate(${f2(rot)} ${f2(cutXs + 18)} ${f2(cy)})`); }
        const cx0 = side === 'L' ? L - 40 : cutXs, cw0 = side === 'L' ? cutXs - (L - 40) : ww + 60;
        r.clip.setAttribute('x', f2(cx0)); r.clip.setAttribute('y', f2(Tt - 30)); r.clip.setAttribute('width', f2(Math.max(0, cw0 + (side === 'L' ? 0 : 0)))); r.clip.setAttribute('height', f2(hh + 80));
        r.cut.setAttribute('x1', f2(cutXs)); r.cut.setAttribute('x2', f2(cutXs)); r.cut.setAttribute('y1', f2(Tt - 4)); r.cut.setAttribute('y2', f2(Tt + hh + 4));
        r.cut.setAttribute('visibility', split ? 'visible' : 'hidden');
        return { L, Tt, ww, hh, cutXs };
      };
      const gl = place(st.pL, 'L'), gr_ = place(st.pR, 'R');
      st.pL.g.setAttribute('visibility', coinOn ? 'visible' : 'hidden');
      st.pR.g.setAttribute('visibility', coinOn ? 'visible' : 'hidden');
      // accolade lime sous la barre : « ce qui te revient » (97,3 %)
      const kq = E.out3(clamp((t - T.keep) / 0.5));
      {
        const x1 = gl.L + 14, x2 = x1 + (gl.cutXs - gl.L - 30) * kq, yb = gl.Tt + gl.hh + 46;
        st.brace.setAttribute('d', `M${f2(x1)} ${f2(yb - 26)}V${f2(yb)}H${f2(x2)}${kq > 0.98 ? `V${f2(yb - 26)}` : ''}`);
        st.brace.setAttribute('visibility', kq > 0 ? 'visible' : 'hidden');
      }
      // la lamelle devient lime au moment de la coupe
      st.pR.body.setAttribute('fill', split ? C.lime : C.white);
      // pièce : « 1 € » qui s'efface quand la barre s'étire
      st.coinTxt.setAttribute('x', 960 + shk[0]);
      st.coinTxt.setAttribute('opacity', f2(clamp(1 - bp * 3)));
      st.coinTxt.setAttribute('visibility', coinOn && bp < 0.34 ? 'visible' : 'hidden');
      st.coinTxt.setAttribute('transform', `translate(960 ${f2(st.BY)}) scale(${f2(scl)}) translate(-960 ${f2(-st.BY)})`);
      // texte 97,3 ¢
      const keepOn = kq > 0.55;
      const kx = (gl.L + gl.cutXs) / 2;
      st.keepTxt.setAttribute('visibility', keepOn ? 'visible' : 'hidden');
      st.keepTxt.setAttribute('x', f2(kx));
      const kp = E.back(clamp((t - T.keep - 0.25) / 0.3));
      st.keepTxt.setAttribute('transform', `translate(${f2(kx)} ${f2(cy)}) scale(${f2(lerp(0.5, 1, kp))}) translate(${f2(-kx)} ${f2(-cy)})`);
      // étiquette « 1 € = 100 ¢ » au-dessus de la barre
      const lp = E.back(clamp((t - T.bar - 0.15) / (8 * FR)));
      put(st.barLabel.g, 960 - st.BW / 2 + st.barLabel.w / 2 + 10, st.BY - bh / 2 - 66, -2, lp, lp, t >= T.bar + 0.15 ? 1 : 0);
      // sticker « 2,7 ¢ » sur la lamelle, puis étiquette « L’AVANTAGE DE LA MAISON »
      const sx = 960 + st.BW / 2 - 6;
      const gp = E.back(clamp((t - T.split - 0.35) / (8 * FR)));
      put(st.gapSt.g, sx + 130, st.BY - bh / 2 - 74, 5, gp, gp, t >= T.split + 0.35 ? 1 : 0);
      const lq = E.back(clamp((t - T.gapLabel) / (8 * FR)));
      put(st.gapLabel.g, sx - st.gapLabel.w / 2 + 70, st.BY + bh / 2 + 120, -2, lq, lq, t >= T.gapLabel ? 1 : 0);
    }
  });
})();
;
/* ==== tools/video/composition/components/doc-card.js ==== */
// Composant « doc-card » : voir tools/video/composition/INTERFACE.md. Fonction pure du temps du plan, aplats seulement.
(() => {
  /* ---- aides typographiques locales (mêmes lignes dans chaque composant du rôle « Typo ») ---- */
  const { C, F, E, clamp, prog, lerp, f2, put, g, rect, text, path, line, sv, circle } = ZV;
  const COL = { ink: C.ink, paper: C.paper, lime: C.lime, red: C.red, white: C.white };
  const TINT = { ink: '#1A1A1A', lime: '#B9EC22', paper: '#E4E0D3', red: '#F0452F' };
  const NB = ' ';
  let UID = 0;
  const colOf = (k, d) => COL[k] || k || d;
  // largeur d'une chaîne (mesure réelle via un <text> caché), ramenée à `size` px
  function mkProbe(root) {
    const n = sv('text', { x: 0, y: 0, 'font-size': 100, 'font-weight': 800, visibility: 'hidden' }, root);
    const cache = {};
    return function w(str, size, o) {
      o = o || {};
      const key = (o.mono ? 'm' : 'd') + (o.sp || 0) + '|' + str;
      let v = cache[key];
      if (v === undefined) {
        n.setAttribute('font-family', o.mono ? F.mono : F.display);
        n.setAttribute('letter-spacing', (o.sp || 0) * 100);
        n.textContent = str.replace(/ /g, NB);
        try { v = n.getComputedTextLength(); } catch (e) { v = 0; }
        if (!(v > 0)) v = str.length * (o.mono ? 60 : 58);
        cache[key] = v;
      }
      return v * size / 100;
    };
  }
  // 1 234,5 : espace fine insécable pour les milliers, virgule décimale
  function fnum(v, dec) {
    const s = Math.abs(v).toFixed(dec || 0).split('.');
    const i = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return (v < 0 ? '−' : '') + i + (s[1] ? ',' + s[1] : '');
  }
  // lie ponctuation et opérateurs au mot précédent (jamais de « ? » seul en début de ligne)
  const glue = (s) => String(s).replace(/ (?=[?:%!;€¢÷×=+−])/g, NB).replace(/([÷×=+−]) (?=\S)/g, '$1' + NB);
  // coupe `str` en ≤ maxRows lignes équilibrées tenant dans maxW (null si impossible)
  function breaks(str, S, maxW, wf, maxRows) {
    if (wf(str, S) <= maxW) return [str];
    const words = str.split(' ');
    if (words.length < 2 || maxRows < 2) return null;
    let best = null, bm = 1e9;
    for (let k = 1; k < words.length; k++) {
      const a = words.slice(0, k).join(' '), b = words.slice(k).join(' ');
      const m = Math.max(wf(a, S), wf(b, S));
      if (m < bm) { bm = m; best = [a, b]; }
    }
    if (bm <= maxW) return best;
    if (maxRows >= 3 && words.length >= 3) {
      bm = 1e9; best = null;
      for (let k = 1; k < words.length - 1; k++) for (let j = k + 1; j < words.length; j++) {
        const a = words.slice(0, k).join(' '), b = words.slice(k, j).join(' '), c = words.slice(j).join(' ');
        const m = Math.max(wf(a, S), wf(b, S), wf(c, S));
        if (m < bm) { bm = m; best = [a, b, c]; }
      }
      if (bm <= maxW) return best;
    }
    return null;
  }
  // fond plat + trame de points qui dérive doucement + repères de coupe aux angles
  function backdrop(root, bgk, uid, opt) {
    opt = opt || {};
    const tint = TINT[bgk] || TINT.ink;
    const fill = bgk === 'wheel' ? C.ink : colOf(bgk, C.ink);
    rect(root, 0, 0, 1920, 1080, 0, fill);
    const o = {};
    if (opt.dots !== false) {
      const defs = sv('defs', null, root);
      o.pat = sv('pattern', { id: uid + 'd', width: 64, height: 64, patternUnits: 'userSpaceOnUse' }, defs);
      circle(o.pat, 32, 32, 3.6, tint);
      rect(root, 0, 0, 1920, 1080, 0, `url(#${uid}d)`);
    }
    if (opt.marks !== false) {
      const mc = bgk === 'ink' || bgk === 'wheel' ? '#3A3A3A' : C.ink;
      path(root, 'M56 160V56H160M1760 56H1864V160M1864 920V1024H1760M160 1024H56V920', 'none', mc, 8, { 'stroke-linecap': 'butt', 'stroke-linejoin': 'miter' });
    }
    return o;
  }
  const drift = (o, t) => { if (o && o.pat) o.pat.setAttribute('patternTransform', `translate(${f2(t * 14)} ${f2(t * 9)})`); };
  // pastille Mono (kicker) : fond/texte selon l'aplat
  function pill(parent, str, bgk, size, W) {
    const dark = bgk === 'ink' || bgk === 'wheel';
    const fill = dark ? C.lime : C.ink;
    const tc = dark ? C.ink : (bgk === 'lime' ? C.lime : C.paper);
    const sp = 0.1;
    const w = W(str, size, { mono: true, sp }) + 64, h = size * 1.7;
    const gr = g(parent);
    rect(gr, -w / 2 + 7, -h / 2 + 7, w, h, 14, C.ink);
    rect(gr, -w / 2, -h / 2, w, h, 14, fill, C.ink, 5);
    text(gr, str, 0, size * 0.35, size, tc, { mono: true, anchor: 'middle', spacing: f2(sp * size) });
    return { g: gr, w, h };
  }
  // Définition d'un composant : `build` (une fois) / `draw` (pure). La mise en page dépend des mesures de police :
  // si les polices ne sont pas encore chargées à l'init, on reconstruit dès qu'elles le sont (puis on redessine).
  const FONTS = ['800 100px "Bricolage Grotesque"', '800 100px "JetBrains Mono"'];
  const fontsOk = () => { try { return FONTS.every((f) => document.fonts.check(f)); } catch (e) { return true; } };
  function defineTypo(id, impl) {
    const rebuild = (st) => {
      while (st.root.firstChild) st.root.removeChild(st.root.firstChild);
      st.s = impl.build(st.root, st.shot);
      st.ok = true;
      if (st.last !== null) impl.draw(st.s, st.last, st.shot);
    };
    ZV.define(id, {
      init(root, shot) {
        const st = { root, shot, last: null, ok: fontsOk() };
        st.s = impl.build(root, shot);
        if (!st.ok) { try { Promise.all(FONTS.map((f) => document.fonts.load(f))).then(() => { if (!st.ok && fontsOk()) rebuild(st); }); } catch (e) { /* tant pis */ } }
        return st;
      },
      update(st, t, shot) {
        st.last = t;
        if (!st.ok && fontsOk()) rebuild(st);
        impl.draw(st.s, t, shot || st.shot);
      }
    });
  }

  const FR = 1 / 30;
  const NSD = -0.03;
  // carte à coin plié : polygone + ombre dure + pli
  function foldedCard(parent, w, h, fill, foldFill, f, sh) {
    const poly = (ox, oy) => `M${-w / 2 + ox} ${-h / 2 + oy}L${w / 2 - f + ox} ${-h / 2 + oy}L${w / 2 + ox} ${-h / 2 + f + oy}L${w / 2 + ox} ${h / 2 + oy}L${-w / 2 + ox} ${h / 2 + oy}Z`;
    path(parent, poly(sh, sh), C.ink);
    path(parent, poly(0, 0), fill, C.ink, 8);
    path(parent, `M${w / 2 - f} ${-h / 2}L${w / 2 - f} ${-h / 2 + f}L${w / 2} ${-h / 2 + f}Z`, foldFill, C.ink, 8);
  }
  function silhouette(parent, x, y, fill) {
    const gr = g(parent);
    circle(gr, 0, 0, 100, fill, C.ink, 7);
    circle(gr, 0, -34, 36, C.ink);
    path(gr, 'M-70 72Q-72 12 0 12Q72 12 70 72A100 100 0 0 1 -70 72Z', C.ink);
    gr.setAttribute('data-x', x);
    return gr;
  }
  function bookIcon(parent) {
    const gr = g(parent);
    rect(gr, -80 + 12, -108 + 12, 170, 220, 10, C.ink);
    rect(gr, -80, -108, 170, 220, 10, C.lime, C.ink, 7);
    rect(gr, -80, -108, 30, 220, 10, C.ink);
    line(gr, -20, -60, 62, -60, C.ink, 12); line(gr, -20, -28, 48, -28, C.ink, 12);
    circle(gr, 20, 48, 26, C.paper, C.ink, 6);
    text(gr, '0', 20, 58, 30, C.ink, { mono: true, anchor: 'middle' });
    return gr;
  }

  defineTypo('doc-card', {
    build(root, shot) {
      const P = shot.props || {};
      const variant = ['source', 'article', 'help'].includes(P.variant) ? P.variant : 'source';
      const bgk = variant === 'help' ? 'paper' : variant === 'article' ? 'ink' : 'lime';
      const uid = 'dc' + (++UID);
      const W = mkProbe(root);
      const st = { shot, variant, bgk, uid, W };
      st.bd = backdrop(root, bgk, uid, { marks: variant !== 'help' });
      const cue = (n, d) => { const v = ZV.cue(shot, n); return v === null ? d : v; };
      const wf = (s, S) => W(s, S, { sp: NSD });
      const kickStr = String(P.kicker || '').toUpperCase();
      const title = String(P.title || '');

      if (variant === 'source') {
        const lines = (P.lines || []).map(String);
        const cw = 1480, hasLines = lines.length > 0;
        const textX = -cw / 2 + 360, textW = cw - 360 - 70;
        // titre : au plus 2 lignes équilibrées
        const tt = title.toUpperCase().replace(/ (?=[&])/g, NB);
        let S = 150, rows = null, S1 = 150, r1 = null;
        for (; S > 50; S *= 0.96) { rows = breaks(tt, S, textW, wf, 2); if (rows) break; }
        for (; S1 > 50; S1 *= 0.96) { r1 = breaks(tt, S1, textW, wf, 1); if (r1) break; }
        if (r1 && S1 >= 0.75 * S) { S = S1; rows = r1; }
        if (!rows) { S = 50; rows = [tt]; }
        const th = (rows.length - 1) * 1.02 * S + 0.74 * S;
        const lineH = hasLines ? lines.length * 74 + 24 : 0;
        const ch = Math.max(520, 150 + th + lineH + 70);
        st.cw = cw; st.ch = ch;
        const card = g(root); st.card = card;
        foldedCard(card, cw, ch, C.paper, C.ink, 110, 16);
        // en-tête
        text(card, kickStr, -cw / 2 + 56, -ch / 2 + 82, 40, C.ink, { mono: true, spacing: 3 });
        line(card, -cw / 2 + 56, -ch / 2 + 112, cw / 2 - 150, -ch / 2 + 112, C.ink, 6, { 'stroke-linecap': 'butt' });
        st.kick = card.lastChild.previousSibling;
        st.kickLine = card.lastChild;
        // icône
        const nPers = title.indexOf('&') >= 0 ? 2 : 1;
        const book = /livre/i.test(lines.join(' ')) ;
        const ic = g(card); st.icon = ic;
        if (book) { const b = bookIcon(ic); put(b, 0, 0, -4, 1, 1, 1); }
        else if (nPers === 2) { const a = silhouette(ic, 0, 0, C.lime), b = silhouette(ic, 0, 0, C.paper); a.setAttribute('transform', 'translate(-48 -34) scale(0.72)'); b.setAttribute('transform', 'translate(48 40) scale(0.72)'); }
        else { const a = silhouette(ic, 0, 0, C.lime); }
        st.iconPos = { x: -cw / 2 + 190, y: 40 };
        // titre
        const tg = g(card); st.titleG = tg;
        const topT = -ch / 2 + 150 + 6;
        const blockH = th + lineH;
        const y0 = topT + (ch - 150 - 40 - blockH) / 2 + 20;
        st.tRows = rows.map((r, k) => text(tg, r.replace(/ /g, NB), textX, y0 + 0.74 * S + k * 1.02 * S, S, C.ink, { spacing: f2(NSD * S) }));
        // détails (écrits à la machine)
        st.lines = lines.map((l, i) => {
          const nd = text(card, '', textX, y0 + th + 24 + 52 + i * 74, 52, '#2B2B2B', { mono: true, spacing: 0 });
          return { node: nd, str: l, t: cue('line-' + (i + 1), cue('title', 0.5) + 0.8 + i * 0.6), n: l.length };
        });
        st.tTitle = cue('title', 0.3); st.tKick = cue('kicker', 0);
        const firstCue = Math.min(...shot.beats.filter((b) => b.do === 'cue').map((b) => b.t), 0.6);
        st.tCard = Math.max(0.05, firstCue - 0.3);
        st.S = S;
        return st;
      }

      if (variant === 'article') {
        const sw = 1260;
        const tt = title.replace(/ (?=[?:!;»])/g, NB).replace(/«\s*/g, '«' + NB);
        const maxW = sw - 140;
        let S = 100, rows = null, S2 = 100, r2 = null;
        for (; S > 40; S *= 0.96) { rows = breaks(tt, S, maxW, wf, 3); if (rows) break; }
        for (; S2 > 40; S2 *= 0.96) { r2 = breaks(tt, S2, maxW, wf, 2); if (r2) break; }
        if (r2 && S2 >= 0.8 * S) { S = S2; rows = r2; }
        if (!rows) { S = 40; rows = [tt]; }
        const tH = (rows.length - 1) * 1.05 * S + 0.74 * S;
        const sh = 150 + tH + 70 + 5 * 34 + 14 + 56;
        const sheet = g(root); st.card = sheet;
        foldedCard(sheet, sw, sh, C.paper, C.lime, 100, 16);
        text(sheet, kickStr, -sw / 2 + 56, -sh / 2 + 80, 40, C.ink, { mono: true, spacing: 3 });
        line(sheet, -sw / 2 + 56, -sh / 2 + 110, sw / 2 - 140, -sh / 2 + 110, C.ink, 6, { 'stroke-linecap': 'butt' });
        const gt = g(sheet), top = -sh / 2 + 150;
        st.aRows = rows.map((r, k) => ({ node: text(gt, '', -sw / 2 + 70, top + 0.74 * S + k * 1.05 * S, S, C.ink, { spacing: f2(NSD * S) }), str: r.replace(/ /g, NB), S, n: r.length }));
        const bot = top + tH;
        const rg = ZV.rng(11);
        st.bars = [];
        const colW = (sw - 140 - 80) / 3, by0 = bot + 70;
        for (let c = 0; c < 3; c++) for (let r = 0; r < 6; r++) {
          const y = by0 + r * 34; if (y + 14 > sh / 2 - 36) continue;
          const w = colW * (r === 5 ? 0.55 : 0.78 + rg() * 0.22);
          st.bars.push({ n: rect(sheet, -sw / 2 + 70 + c * (colW + 40), y, w, 14, 3, C.ink), i: c * 6 + r });
        }
        st.tTitle = cue('title', 0.8); st.S = S;
        st.tCard = Math.max(0.05, st.tTitle - 0.3);
        return st;
      }

      // ---- aide : numéro écrit groupe par groupe ----
      const cw = 1500, ch = 640;
      const card = g(root); st.card = card;
      foldedCard(card, cw, ch, C.white, C.lime, 110, 16);
      const hdr = kickStr && kickStr.toUpperCase() === title.toUpperCase() ? "NUMÉRO D’AIDE" : kickStr;
      text(card, hdr, -cw / 2 + 60, -ch / 2 + 84, 40, C.ink, { mono: true, spacing: 3 });
      line(card, -cw / 2 + 60, -ch / 2 + 114, cw / 2 - 150, -ch / 2 + 114, C.ink, 6, { 'stroke-linecap': 'butt' });
      text(card, title, -cw / 2 + 60, -ch / 2 + 240, 112, C.ink, { spacing: f2(NSD * 112) });
      const digits = P.digits || ['09', '74', '75', '13', '13'];
      const dsz = 150, cwid = 0.6 * dsz, gap = 56;
      const gw = digits.map((d) => d.length * cwid);
      const totalW = gw.reduce((a, b) => a + b, 0) + gap * (digits.length - 1);
      let x = -totalW / 2;
      const dy = 140;
      st.dg = digits.map((d, i) => {
        const bar = rect(card, x, dy + 24, gw[i], 16, 4, C.lime);
        const nd = text(card, '', x, dy, dsz, C.ink, { mono: true });
        const o = { node: nd, bar, str: d, w: gw[i], t: cue('d' + (i + 1), 1 + i * 0.6) };
        x += gw[i] + gap;
        return o;
      });
      // pastilles
      const mk = (str, fill) => {
        const size = 50, w = W(str, size, { sp: 0.02 }) + 64, h = size * 1.7, gr = g(root);
        rect(gr, -w / 2 + 10, -h / 2 + 10, w, h, 16, C.ink); rect(gr, -w / 2, -h / 2, w, h, 16, fill, C.ink, 6);
        text(gr, str, 0, size * 0.35, size, C.ink, { anchor: 'middle', spacing: f2(0.02 * size) });
        return { g: gr, w, h };
      };
      const sb = (n) => shot.beats.find((b) => b.do === 'cue' && b.name === n);
      const s1 = sb('s1'), s2 = sb('s2');
      st.s1 = s1 ? Object.assign(mk(String(s1.text || 'TOUS LES JOURS').toUpperCase(), C.lime), { t: s1.t, x: 700, y: 760, tilt: -3 }) : null;
      st.s2 = s2 ? Object.assign(mk(String(s2.text || 'ANONYME').toUpperCase(), C.lime), { t: s2.t, x: 1360, y: 770, tilt: 3 }) : null;
      st.tCard = Math.max(0.05, cue('d1', 1) - 0.9);
      return st;
    },

    draw(st, t, shot) {
      drift(st.bd, t);
      const { variant } = st;
      const cardPose = (rot0, y0) => {
        const q = t - st.tCard, p = ZV.E.back(clamp(q / (10 * FR)));
        put(st.card, 960, y0, lerp(rot0 - 7, rot0, ZV.E.out3(clamp(q / (10 * FR)))), lerp(0.7, 1, p), lerp(0.7, 1, p), q >= 0 ? 1 : 0);
      };
      const typed = (node, str, t0, per, extra) => {
        const k = t < t0 ? 0 : Math.min(str.length, Math.floor((t - t0) / per + 1e-6) + 1);
        node.textContent = str.slice(0, k).replace(/ /g, NB);
        return k;
      };

      if (variant === 'source') {
        cardPose(-2, 480);
        // en-tête
        const kq = t >= st.tKick || st.tKick === 0 ? 1 : 0;
        st.kick.setAttribute('visibility', t >= st.tKick ? 'visible' : 'hidden');
        // icône
        const iq = ZV.E.back(clamp((t - st.tCard - 0.2) / (8 * FR)));
        put(st.icon, st.iconPos.x, st.iconPos.y, 0, iq, iq, t >= st.tCard + 0.2 ? 1 : 0);
        // titre : pop
        const tt = t - st.tTitle, p = ZV.E.back(clamp(tt / (8 * FR)));
        put(st.titleG, 0, 0, 0, 1, 1, tt >= 0 ? 1 : 0);
        st.titleG.setAttribute('transform', `translate(${f2(lerp(-60, 0, ZV.E.out3(clamp(tt / (8 * FR)))))} 0)`);
        st.titleG.setAttribute('opacity', tt >= 0 ? 1 : 0);
        for (const ln of st.lines) typed(ln.node, ln.str, ln.t, Math.max(1 / 60, Math.min(2 * FR, 0.9 / ln.n)));
        return;
      }

      if (variant === 'article') {
        cardPose(1.5, 500);
        let tcur = st.tTitle;
        let done = 0;
        for (const r of st.aRows) {
          const per = Math.min(1.5 * FR, 0.5 / r.n);
          const k = typed(r.node, r.str, tcur, per);
          tcur += r.n * per + 0.12;
          done = tcur;
        }
        for (const b of st.bars) {
          const q = ZV.E.out3(clamp((t - (done + 0.05 + b.i * 0.02)) / 0.25));
          const wmax = parseFloat(b.n.getAttribute('data-w') || b.n.getAttribute('width'));
          if (!b.n.getAttribute('data-w')) b.n.setAttribute('data-w', wmax);
          b.n.setAttribute('width', f2(wmax * q)); b.n.setAttribute('visibility', q > 0 ? 'visible' : 'hidden');
        }
        return;
      }

      // aide : calme (aucun shake, entrée douce)
      {
        const q = t - st.tCard, p = ZV.E.out3(clamp(q / 0.4));
        put(st.card, 960, lerp(560, 470, p), -1, 1, 1, q >= 0 ? 1 : 0);
        for (const d of st.dg) {
          typed(d.node, d.str, d.t, 2 * FR);
          const bq = ZV.E.out3(clamp((t - d.t) / 0.35));
          d.bar.setAttribute('width', f2(d.w * bq)); d.bar.setAttribute('visibility', bq > 0 ? 'visible' : 'hidden');
        }
        for (const s of [st.s1, st.s2]) if (s) { const pp = ZV.E.out3(clamp((t - s.t) / 0.3)); put(s.g, s.x, lerp(s.y + 40, s.y, pp), s.tilt, 1, 1, t >= s.t ? pp : 0); }
      }
    }
  });
})();
;
/* ==== tools/video/composition/components/end-card.js ==== */
// Composant « end-card » : voir tools/video/composition/INTERFACE.md. Fonction pure du temps du plan, aplats seulement.
(() => {
  /* ---- aides typographiques locales (mêmes lignes dans chaque composant du rôle « Typo ») ---- */
  const { C, F, E, clamp, prog, lerp, f2, put, g, rect, text, path, line, sv, circle } = ZV;
  const COL = { ink: C.ink, paper: C.paper, lime: C.lime, red: C.red, white: C.white };
  const TINT = { ink: '#1A1A1A', lime: '#B9EC22', paper: '#E4E0D3', red: '#F0452F' };
  const NB = ' ';
  let UID = 0;
  const colOf = (k, d) => COL[k] || k || d;
  // largeur d'une chaîne (mesure réelle via un <text> caché), ramenée à `size` px
  function mkProbe(root) {
    const n = sv('text', { x: 0, y: 0, 'font-size': 100, 'font-weight': 800, visibility: 'hidden' }, root);
    const cache = {};
    return function w(str, size, o) {
      o = o || {};
      const key = (o.mono ? 'm' : 'd') + (o.sp || 0) + '|' + str;
      let v = cache[key];
      if (v === undefined) {
        n.setAttribute('font-family', o.mono ? F.mono : F.display);
        n.setAttribute('letter-spacing', (o.sp || 0) * 100);
        n.textContent = str.replace(/ /g, NB);
        try { v = n.getComputedTextLength(); } catch (e) { v = 0; }
        if (!(v > 0)) v = str.length * (o.mono ? 60 : 58);
        cache[key] = v;
      }
      return v * size / 100;
    };
  }
  // 1 234,5 : espace fine insécable pour les milliers, virgule décimale
  function fnum(v, dec) {
    const s = Math.abs(v).toFixed(dec || 0).split('.');
    const i = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return (v < 0 ? '−' : '') + i + (s[1] ? ',' + s[1] : '');
  }
  // lie ponctuation et opérateurs au mot précédent (jamais de « ? » seul en début de ligne)
  const glue = (s) => String(s).replace(/ (?=[?:%!;€¢÷×=+−])/g, NB).replace(/([÷×=+−]) (?=\S)/g, '$1' + NB);
  // coupe `str` en ≤ maxRows lignes équilibrées tenant dans maxW (null si impossible)
  function breaks(str, S, maxW, wf, maxRows) {
    if (wf(str, S) <= maxW) return [str];
    const words = str.split(' ');
    if (words.length < 2 || maxRows < 2) return null;
    let best = null, bm = 1e9;
    for (let k = 1; k < words.length; k++) {
      const a = words.slice(0, k).join(' '), b = words.slice(k).join(' ');
      const m = Math.max(wf(a, S), wf(b, S));
      if (m < bm) { bm = m; best = [a, b]; }
    }
    if (bm <= maxW) return best;
    if (maxRows >= 3 && words.length >= 3) {
      bm = 1e9; best = null;
      for (let k = 1; k < words.length - 1; k++) for (let j = k + 1; j < words.length; j++) {
        const a = words.slice(0, k).join(' '), b = words.slice(k, j).join(' '), c = words.slice(j).join(' ');
        const m = Math.max(wf(a, S), wf(b, S), wf(c, S));
        if (m < bm) { bm = m; best = [a, b, c]; }
      }
      if (bm <= maxW) return best;
    }
    return null;
  }
  // fond plat + trame de points qui dérive doucement + repères de coupe aux angles
  function backdrop(root, bgk, uid, opt) {
    opt = opt || {};
    const tint = TINT[bgk] || TINT.ink;
    const fill = bgk === 'wheel' ? C.ink : colOf(bgk, C.ink);
    rect(root, 0, 0, 1920, 1080, 0, fill);
    const o = {};
    if (opt.dots !== false) {
      const defs = sv('defs', null, root);
      o.pat = sv('pattern', { id: uid + 'd', width: 64, height: 64, patternUnits: 'userSpaceOnUse' }, defs);
      circle(o.pat, 32, 32, 3.6, tint);
      rect(root, 0, 0, 1920, 1080, 0, `url(#${uid}d)`);
    }
    if (opt.marks !== false) {
      const mc = bgk === 'ink' || bgk === 'wheel' ? '#3A3A3A' : C.ink;
      path(root, 'M56 160V56H160M1760 56H1864V160M1864 920V1024H1760M160 1024H56V920', 'none', mc, 8, { 'stroke-linecap': 'butt', 'stroke-linejoin': 'miter' });
    }
    return o;
  }
  const drift = (o, t) => { if (o && o.pat) o.pat.setAttribute('patternTransform', `translate(${f2(t * 14)} ${f2(t * 9)})`); };
  // pastille Mono (kicker) : fond/texte selon l'aplat
  function pill(parent, str, bgk, size, W) {
    const dark = bgk === 'ink' || bgk === 'wheel';
    const fill = dark ? C.lime : C.ink;
    const tc = dark ? C.ink : (bgk === 'lime' ? C.lime : C.paper);
    const sp = 0.1;
    const w = W(str, size, { mono: true, sp }) + 64, h = size * 1.7;
    const gr = g(parent);
    rect(gr, -w / 2 + 7, -h / 2 + 7, w, h, 14, C.ink);
    rect(gr, -w / 2, -h / 2, w, h, 14, fill, C.ink, 5);
    text(gr, str, 0, size * 0.35, size, tc, { mono: true, anchor: 'middle', spacing: f2(sp * size) });
    return { g: gr, w, h };
  }
  // Définition d'un composant : `build` (une fois) / `draw` (pure). La mise en page dépend des mesures de police :
  // si les polices ne sont pas encore chargées à l'init, on reconstruit dès qu'elles le sont (puis on redessine).
  const FONTS = ['800 100px "Bricolage Grotesque"', '800 100px "JetBrains Mono"'];
  const fontsOk = () => { try { return FONTS.every((f) => document.fonts.check(f)); } catch (e) { return true; } };
  function defineTypo(id, impl) {
    const rebuild = (st) => {
      while (st.root.firstChild) st.root.removeChild(st.root.firstChild);
      st.s = impl.build(st.root, st.shot);
      st.ok = true;
      if (st.last !== null) impl.draw(st.s, st.last, st.shot);
    };
    ZV.define(id, {
      init(root, shot) {
        const st = { root, shot, last: null, ok: fontsOk() };
        st.s = impl.build(root, shot);
        if (!st.ok) { try { Promise.all(FONTS.map((f) => document.fonts.load(f))).then(() => { if (!st.ok && fontsOk()) rebuild(st); }); } catch (e) { /* tant pis */ } }
        return st;
      },
      update(st, t, shot) {
        st.last = t;
        if (!st.ok && fontsOk()) rebuild(st);
        impl.draw(st.s, t, shot || st.shot);
      }
    });
  }

  /* ---- dessin du logo ZÉRO VERT (repris de assets/podcast/logo.svg et mark.svg) ---- */
  const ZERO_D = 'M328 14L328 14Q258 14 202 -8Q146 -30 107 -73Q68 -116 48 -180Q27 -244 27 -327L27 -327Q27 -445 66 -521Q104 -598 174 -636Q243 -674 334 -674L334 -674Q404 -674 460 -652Q515 -631 554 -588Q593 -545 614 -480Q634 -416 634 -331L634 -331Q634 -245 613 -180Q591 -115 551 -72Q510 -29 454 -7Q397 14 328 14M334 -119L334 -119Q379 -119 409 -141Q438 -164 453 -209Q467 -255 467 -324L467 -324Q467 -397 452 -445Q436 -493 406 -517Q375 -542 329 -542L329 -542Q285 -542 255 -518Q225 -495 210 -448Q195 -401 195 -331L195 -331Q195 -278 204 -238Q212 -198 230 -171Q247 -145 273 -132Q299 -119 334 -119';
  const LETTERS = [[0,'M337 0L14 0L14 -121L178 -532L178 -535L14 -535L14 -660L334 -660L334 -539L169 -129L169 -125L337 -125L337 0'],[343,'M175 0L20 0L20 -660L175 -660L175 0M312 0L130 0L130 -126L312 -126L312 0M286 -278L130 -278L130 -393L286 -393L286 -278M312 -534L130 -534L130 -660L312 -660L312 -534M295 -804L211 -695L86 -695L140 -804L295 -804'],[657,'M174 0L20 0L20 -660L202 -660Q236 -660 267 -652Q298 -645 324 -629Q349 -613 368 -590Q387 -567 398 -535Q408 -504 408 -464L408 -464Q408 -431 400 -402Q392 -373 375 -350Q357 -328 331 -312Q305 -297 269 -291L269 -291L269 -282Q322 -280 349 -260Q376 -240 387 -206Q398 -173 403 -129L403 -129L420 0L260 0L251 -106Q248 -140 243 -167Q238 -195 225 -211Q211 -227 181 -228L181 -228L174 -228L174 0M174 -537L174 -330L186 -330Q220 -330 237 -356Q253 -382 253 -440L253 -440Q253 -493 239 -515Q225 -537 194 -537L194 -537L174 -537'],[1078,'M328 14L328 14Q258 14 202 -8Q146 -30 107 -73Q68 -116 48 -180Q27 -244 27 -327L27 -327Q27 -445 66 -521Q104 -598 174 -636Q243 -674 334 -674L334 -674Q404 -674 460 -652Q515 -631 554 -588Q593 -545 614 -480Q634 -416 634 -331L634 -331Q634 -245 613 -180Q591 -115 551 -72Q510 -29 454 -7Q397 14 328 14M334 -119L334 -119Q379 -119 409 -141Q438 -164 453 -209Q467 -255 467 -324L467 -324Q467 -397 452 -445Q436 -493 406 -517Q375 -542 329 -542L329 -542Q285 -542 255 -518Q225 -495 210 -448Q195 -401 195 -331L195 -331Q195 -278 204 -238Q212 -198 230 -171Q247 -145 273 -132Q299 -119 334 -119'],[1881,'M327 0L109 0L4 -660L168 -660L217 -134L224 -134L281 -660L440 -660L327 0'],[2317,'M175 0L20 0L20 -660L175 -660L175 0M312 0L130 0L130 -126L312 -126L312 0M286 -278L130 -278L130 -393L286 -393L286 -278M312 -534L130 -534L130 -660L312 -660L312 -534'],[2631,'M174 0L20 0L20 -660L202 -660Q236 -660 267 -652Q298 -645 324 -629Q349 -613 368 -590Q387 -567 398 -535Q408 -504 408 -464L408 -464Q408 -431 400 -402Q392 -373 375 -350Q357 -328 331 -312Q305 -297 269 -291L269 -291L269 -282Q322 -280 349 -260Q376 -240 387 -206Q398 -173 403 -129L403 -129L420 0L260 0L251 -106Q248 -140 243 -167Q238 -195 225 -211Q211 -227 181 -228L181 -228L174 -228L174 0M174 -537L174 -330L186 -330Q220 -330 237 -356Q253 -382 253 -440L253 -440Q253 -493 239 -515Q225 -537 194 -537L194 -537L174 -537'],[3052,'M265 0L111 0L111 -660L265 -660L265 0M370 -535L5 -535L5 -660L370 -660L370 -535']];   // [x, d] en unités du logo, origine (1016, 770), lettres Z É R O V E R T
  const LET_CX = [171, 500, 867, 1408, 2103, 2474, 2841, 3239];
  const LK = { w: 4438, h: 920, top: -40, wx: 1016, wy: 770 };
  const BALL_REST = { x: 331, y: -240, r: 94 };
  // hauteur de la bille au-dessus de sa position de repos (chute puis trois rebonds), t en secondes depuis le lâcher
  function ballLift(t, H) {
    const seg = [[0.36, H], [0.26, H * 0.2], [0.17, H * 0.075], [0.11, H * 0.028]];
    let a = 0;
    for (let i = 0; i < seg.length; i++) {
      const d = seg[i][0], h = seg[i][1];
      if (t < a + d) { const u = (t - a) / d; return i === 0 ? h * (1 - u * u) : h * (1 - Math.pow(2 * u - 1, 2)); }
      a += d;
    }
    return 0;
  }
  const BALL_DUR = 0.9;
  // la marque (carré lime + « 0 » + bille), dans un repère 512×512 ; renvoie { g, ball }
  function mkMark(parent, ballOn) {
    const gr = g(parent);
    rect(gr, 12, 12, 488, 488, 116, C.lime, C.ink, 24);
    const z = g(gr, { transform: 'translate(77.3 440.43) scale(0.54)' });
    path(z, ZERO_D, C.ink);
    const ball = circle(z, BALL_REST.x, BALL_REST.y, BALL_REST.r, C.white, C.ink, 16);
    return { g: gr, ball, z };
  }
  // mot-symbole : lettres séparées (groupes centrés sur leur milieu, repère du logo)
  function mkWord(parent, fill) {
    const gr = g(parent), letters = [];
    LETTERS.forEach(([x, d], i) => {
      const lg = g(gr);
      path(lg, d, fill || C.ink, null, 0, { transform: `translate(${x - LET_CX[i]} 330)` });
      if (i === 3) circle(lg, 1395 - LET_CX[i], -240 + 330, 93, C.white, C.ink, 18);
      letters.push({ g: lg, cx: LET_CX[i] + LK.wx, cy: LK.wy - 330 });
    });
    return { g: gr, letters };
  }

  const FR = 1 / 30;
  const MARQ_DEFAULT = 'ZÉRO VERT · LA MAISON GAGNE TOUJOURS · ';

  defineTypo('end-card', {
    build(root, shot) {
      const P = shot.props || {};
      const final = P.mode === 'final';
      const uid = 'ec' + (++UID);
      const W = mkProbe(root);
      const st = { shot, final, uid, W };
      const cue = (n, d) => { const v = ZV.cue(shot, n); return v === null ? d : v; };
      // fond lime + grille éditoriale (aplat plus foncé, filets pleins)
      rect(root, 0, 0, 1920, 1080, 0, C.lime);
      const grid = g(root);
      for (let x = 160; x < 1920; x += 160) rect(grid, x - 2, 96, 4, 984, 0, TINT.lime);
      for (let y = 96 + 108; y < 1080; y += 108) rect(grid, 0, y - 2, 1920, 4, 0, TINT.lime);
      // marquee en haut
      {
        const gm = g(root), sz = 38, sp = 0.06, MARQ = String(P.marquee || MARQ_DEFAULT);
        rect(gm, 0, 0, 1920, 88, 0, C.ink);
        const unit = W(MARQ, sz, { sp });
        const n = Math.ceil(1920 / unit) + 2;
        st.mq = { unit, node: text(gm, MARQ.repeat(n).replace(/ /g, NB), 0, 58, sz, C.lime, { spacing: f2(sp * sz) }) };
        rect(gm, 0, 88, 1920, 8, 0, C.ink);
      }
      const mkSticker = (str, fill, tcol, size, mono, tilt) => {
        const w = W(str, size, { mono, sp: mono ? 0.04 : 0 }) + 72, h = size * 1.75, gr = g(root);
        rect(gr, -w / 2 + 12, -h / 2 + 12, w, h, 18, C.ink); rect(gr, -w / 2, -h / 2, w, h, 18, fill, C.ink, 6);
        text(gr, str, 0, size * 0.36, size, tcol, { mono, anchor: 'middle', spacing: mono ? f2(0.04 * size) : 0 });
        return { g: gr, w, h, tilt };
      };
      const wf = (s, S) => W(s, S, { sp: 0 });

      if (!final) {
        // ---- À RETENIR : trois cartes numérotées qui restent ----
        st.title = mkSticker(String(P.heading || 'À RETENIR').toUpperCase(), C.ink, C.lime, 62, false, -2);
        st.title.x = 160 + st.title.w / 2; st.title.y = 176; st.tTitle = cue('title', 0.2);
        const items = (P.items || []).slice(0, 3).map((s) => String(s).replace(/ (?=[?:!;])/g, NB));
        const tilts = [-2, 1, -1], times = [cue('i1', 0.8), cue('i2', 2.6), cue('i3', 4.4)];
        const cw = 1560, tx = 150, tw = cw - tx - 56, gap = 34;
        let S = 62, cards = [], totalH = 0;
        for (; S >= 40; S -= 2) {
          cards = items.map((it) => { const rows = breaks(it, S, tw, wf, 4) || [it]; return { rows, h: Math.max(140, rows.length * S * 1.2 + 60) }; });
          totalH = cards.reduce((a, c) => a + c.h, 0) + gap * (cards.length - 1);
          if (totalH <= 790) break;
        }
        st.S = S;
        let y = Math.max(250, 250 + (1020 - 250 - totalH) / 2);
        st.cards = cards.map((c, i) => {
          const gr = g(root);
          rect(gr, -cw / 2 + 12, -c.h / 2 + 12, cw, c.h, 18, C.ink);
          rect(gr, -cw / 2, -c.h / 2, cw, c.h, 18, C.paper, C.ink, 8);
          circle(gr, -cw / 2 + 76, 0, 44, C.ink);
          text(gr, String(i + 1), -cw / 2 + 76, 0.36 * 54, 54, C.lime, { mono: true, anchor: 'middle' });
          c.rows.forEach((r, k) => text(gr, r.replace(/ /g, NB), -cw / 2 + tx, -c.h / 2 + (c.h - ((c.rows.length - 1) * S * 1.2 + 0.74 * S)) / 2 + 0.74 * S + k * S * 1.2, S, C.ink, { spacing: f2(-0.01 * S) }));
          const o = { g: gr, x: 960, y: y + c.h / 2, tilt: tilts[i], t: times[i] };
          y += c.h + gap;
          return o;
        });
        return st;
      }
      // ---- final : prochain épisode, aide, logo complet ----
      st.next = mkSticker(String(P.next || 'PROCHAIN ÉPISODE : LA ZONE').toUpperCase(), C.ink, C.lime, 66, false, -2);
      st.next.x = 960; st.next.y = 200; st.tNext = cue('next', 0.2);
      const help = P.help || {};
      const cw = 1500, ch = 450;
      const card = g(root); st.help = { g: card, x: 960, y: 545, tilt: 1, t: cue('help', 1) };
      path(card, `M${-cw / 2 + 14} ${-ch / 2 + 14}H${cw / 2 + 14}V${ch / 2 + 14}H${-cw / 2 + 14}Z`, C.ink);
      rect(card, -cw / 2, -ch / 2, cw, ch, 0, C.paper, C.ink, 8);
      text(card, String(help.name || 'Joueurs Info Service').toUpperCase(), -cw / 2 + 60, -ch / 2 + 84, 44, C.ink, { mono: true, spacing: 3 });
      line(card, -cw / 2 + 60, -ch / 2 + 114, cw / 2 - 60, -ch / 2 + 114, C.ink, 6, { 'stroke-linecap': 'butt' });
      const ph = String(help.phone || '09 74 75 13 13');
      text(card, ph.replace(/ /g, NB), 0, 30 + 0.36 * 120, 120, C.ink, { mono: true, anchor: 'middle' });
      rect(card, -W(ph, 120, { mono: true }) / 2, 30 + 0.36 * 120 + 22, W(ph, 120, { mono: true }), 16, 4, C.lime);
      text(card, String(help.hours || ''), 0, ch / 2 - 50, 40, '#2B2B2B', { anchor: 'middle' });
      // logo complet en bas
      const k = 1000 / LK.w;
      st.logo = { g: g(root), k };
      const lg = st.logo.g;
      const mk = mkMark(lg); const wd = mkWord(lg, C.ink);
      // on place la marque et les lettres dans le repère du logo (échelle 1) ; le groupe est ensuite mis à l'échelle k
      mk.g.setAttribute('transform', `translate(0 40) scale(${(880.6 / 512).toFixed(4)})`);
      wd.letters.forEach((l) => put(l.g, l.cx, l.cy + 40, 0, 1, 1, 1));
      mk.ball.setAttribute('cy', BALL_REST.y);
      st.logo.x = 960 - LK.w * k / 2; st.logo.y = 790; st.logo.t = cue('logo', 2.4);
      return st;
    },

    draw(st, t, shot) {
      const E = ZV.E;
      st.mq.node.setAttribute('x', f2(-((t * 140) % st.mq.unit)));
      const pop = (o, tp, rot0) => { if (!o) return; const p = E.back(clamp((t - tp) / (8 * FR))); put(o.g, o.x, lerp(o.y + 30, o.y, E.out3(clamp((t - tp) / (8 * FR)))), (o.tilt || 0) + (1 - p) * (rot0 === undefined ? -6 : rot0), p, p, t >= tp ? 1 : 0); };
      if (!st.final) {
        pop(st.title, st.tTitle);
        for (const c of st.cards) {
          const q = clamp((t - c.t) / (6 * FR)), p = E.out3(q);
          const [sx, sy] = ZV.shakeAt(t - c.t, 6 * FR, 7, 0.3);
          put(c.g, c.x + sx + lerp(0, 0, p), c.y + lerp(-420, 0, p) + sy, c.tilt, lerp(1.08, 1, p), lerp(1.08, 1, p), t >= c.t ? 1 : 0);
        }
        return;
      }
      pop(st.next, st.tNext);
      const h = st.help, hq = E.out3(clamp((t - h.t) / 0.35));
      put(h.g, h.x, lerp(h.y + 120, h.y, hq), h.tilt, 1, 1, t >= h.t ? 1 : 0);
      const lq = E.back(clamp((t - st.logo.t) / (10 * FR)));
      const L = st.logo, lk = L.k;
      L.g.setAttribute('transform', `translate(${f2(960)} ${f2(L.y)}) scale(${f2(Math.max(0.0001, lk * lerp(0.4, 1, lq)))}) translate(${f2(-LK.w / 2)} 0)`);
      L.g.setAttribute('display', t >= L.t ? 'inline' : 'none');
    }
  });
})();
;
/* ==== tools/video/composition/components/felt.js ==== */
// Composant « felt » : tapis de roulette vu de dessus (1920×1080), jetons, râteau, pluie de jetons, compteur.
// Fonction pure du temps : tout est recalculé à partir de `t` et des repères (cues) du plan. Aplats seulement.
(() => {
  'use strict';
  const { C, E, clamp, prog, lerp, f2, sv, g, rect, circle, text, put, RED } = ZV;

  /* ---- géométrie du tapis (repère monde = repère écran à zoom 1) ---- */
  const X0 = 141, ZW = 150, GX = X0 + ZW, COLW = 124, ROWH = 142, Y0 = 208;
  const DOZ_Y = Y0 + 3 * ROWH, DOZ_H = 90, OUT_Y = DOZ_Y + DOZ_H, OUT_H = 100, OUT_W = 248;
  const TABLE_R = GX + 12 * COLW, TABLE_B = OUT_Y + OUT_H;
  const CHIP_R = 34;
  const cellXY = (n) => {
    if (n === 0) return [X0 + ZW / 2, Y0 + 1.5 * ROWH];
    const c = Math.floor((n - 1) / 3), r = 2 - ((n - 1) % 3);
    return [GX + c * COLW + COLW / 2, Y0 + r * ROWH + ROWH / 2];
  };
  const BOXES = ['1–18', 'PAIR', 'ROUGE', 'NOIR', 'IMPAIR', '19–36'];
  const boxXY = (name) => {
    const i = Math.max(0, BOXES.indexOf(String(name).toUpperCase()));
    return [GX + OUT_W * (i + 0.5), OUT_Y + OUT_H / 2];
  };
  const locate = (f) => {
    if (f == null) return null;
    if (typeof f === 'number') return cellXY(f);
    const s = String(f).toUpperCase();
    if (BOXES.includes(s)) return boxXY(s);
    const n = parseInt(s, 10);
    return Number.isFinite(n) && n >= 0 && n <= 36 ? cellXY(n) : null;
  };
  const frac = (x) => x - Math.floor(x);
  const hash = (a, b) => frac(Math.sin(a * 127.1 + b * 311.7 + 17.3) * 43758.5453);

  function makeChip(parent, label, fs) {
    const c = g(parent);
    circle(c, 8, 9, CHIP_R, C.ink);
    circle(c, 0, 0, CHIP_R, C.white, C.ink, 6);
    const nt = circle(c, 0, 0, 26.5, 'none', C.lime, 8);
    nt.setAttribute('stroke-dasharray', '11.6 8.9');
    text(c, label, 0, fs * 0.36, fs, C.ink, { anchor: 'middle', mono: true });
    return c;
  }

  ZV.define('felt', {
    init(root, shot) {
      const p = shot.props || {};
      const cue = (n) => ZV.cue(shot, n);
      const st = { p, dur: shot.dur };
      rect(root, 0, 0, 1920, 1080, 0, C.ink);

      /* ---- la caméra regroupe le tapis, les jetons ---- */
      st.cam = g(root);
      st.table = g(st.cam);
      // cases
      const grid = [];
      rect(st.table, X0, Y0, TABLE_R - X0, TABLE_B - Y0, 0, 'none', C.paper, 8);
      rect(st.table, X0, Y0, ZW, 3 * ROWH, 0, C.lime, C.paper, 4);
      text(st.table, '0', X0 + ZW / 2, Y0 + 1.5 * ROWH + 38, 120, C.ink, { anchor: 'middle' });
      st.cells = {};
      for (let n = 1; n <= 36; n++) {
        const [x, y] = cellXY(n);
        const isRed = RED.has(n);
        circle(st.table, x, y, 45, isRed ? C.red : C.pocket, C.paper, 4);
        text(st.table, String(n), x, y + 18, 54, isRed ? C.ink : C.paper, { anchor: 'middle' });
      }
      // traits du quadrillage (un seul tracé)
      let d = '';
      for (let r = 1; r < 3; r++) d += `M${GX} ${Y0 + r * ROWH}H${TABLE_R}`;
      for (let c = 0; c <= 12; c++) d += `M${GX + c * COLW} ${Y0}V${DOZ_Y}`;
      sv('path', { d, stroke: C.paper, 'stroke-width': 4, fill: 'none' }, st.table);
      // douzaines et chances simples
      ['1–12', '13–24', '25–36'].forEach((lab, i) => {
        rect(st.table, GX + i * 4 * COLW, DOZ_Y, 4 * COLW, DOZ_H, 0, 'none', C.paper, 4);
        text(st.table, lab, GX + (i * 4 + 2) * COLW, DOZ_Y + 60, 44, C.paper, { anchor: 'middle' });
      });
      BOXES.forEach((lab, i) => {
        const x = GX + i * OUT_W;
        const fill = lab === 'ROUGE' ? C.red : lab === 'NOIR' ? C.pocket : 'none';
        rect(st.table, x, OUT_Y, OUT_W, OUT_H, 0, fill, C.paper, 4);
        text(st.table, lab, x + OUT_W / 2, OUT_Y + 63, 46, lab === 'ROUGE' ? C.ink : C.paper, { anchor: 'middle' });
      });

      /* ---- surbrillance de la case gagnante ---- */
      st.win = rect(st.table, 0, 0, COLW - 8, ROWH - 8, 6, 'none', C.lime, 10, { visibility: 'hidden' });
      const wb = shot.beats.find((b) => b.do === 'cue' && b.name === 'winner');
      st.tWin = wb ? wb.t : null;
      st.winN = wb && wb.n != null ? wb.n : p.winner;
      if (st.tWin == null && p.winner != null && cue('winner') == null) st.winN = p.winner;
      if (st.winN != null) {
        const [wx, wy] = cellXY(+st.winN);
        const zero = +st.winN === 0;
        st.win.setAttribute('x', wx - (zero ? ZW : COLW) / 2 + 4); st.win.setAttribute('y', wy - (zero ? 3 * ROWH : ROWH) / 2 + 4);
        st.win.setAttribute('width', (zero ? ZW : COLW) - 8); st.win.setAttribute('height', (zero ? 3 * ROWH : ROWH) - 8);
      }

      /* ---- jetons ---- */
      st.chipLayer = g(st.cam);
      st.rings = [];
      st.items = [];
      const dropCues = ZV.cues(shot, 'chip-drop');
      (Array.isArray(p.chips) ? p.chips : []).forEach((c, i) => {
        const dc = dropCues.find((b) => b.n === c.n) || dropCues[i] || null;
        const [x, y] = cellXY(+c.n || 0);
        const n = makeChip(st.chipLayer, String(c.label == null ? '1 €' : c.label), 22);
        const ring = circle(st.chipLayer, x, y, 40, 'none', C.paper, 5);
        st.rings.push({ ring, x, y, t: dc ? dc.t : null });
        st.items.push({ kind: 'base', node: n, x, y, n: +c.n, t0: dc ? dc.t : 0, dropped: !!dc });
      });
      if (p.fill_all) {
        const tf = cue('fill-all');
        const tEnd = cue('counter') != null && tf != null && cue('counter') > tf + 0.8 ? cue('counter') - 0.15 : (tf == null ? 0 : tf + 2.0);
        const W = Math.max(0.6, tEnd - (tf == null ? 0 : tf));
        for (let k = 0; k <= 36; k++) {
          const n = k === 0 ? 0 : k;
          const [x, y] = cellXY(n);
          const t0 = tf == null ? -1 : tf + W * (1 - Math.pow(1 - k / 36, 1.8));
          st.items.push({ kind: 'base', node: makeChip(st.chipLayer, '1 €', 22), x, y, n, t0, dropped: tf != null, wave: k });
        }
      }
      // payout : N jetons qui glissent depuis le bord droit
      const pb = shot.beats.find((b) => b.do === 'cue' && b.name === 'payout');
      if (pb) {
        const N = Math.max(1, Math.min(80, Math.round(pb.count != null ? pb.count : (+p.payout || 35))));
        const tgt = pb.target != null ? pb.target : (p.bet_box || (st.winN != null ? st.winN : 17));
        let [tx, ty] = locate(tgt) || cellXY(17);
        const isBox = typeof tgt === 'string' && Number.isNaN(parseInt(tgt, 10));
        if (!isBox) tx += 150;
        const step = Math.min(0.025, 0.8 / N);
        // piles en pyramide, vues de trois quarts : chaque jeton monte de 11 px sur sa pile
        const ns = Math.max(3, Math.round(Math.sqrt(N / 2.2))), cc = (ns - 1) / 2;
        const wts = []; for (let i = 0; i < ns; i++) wts.push(1 - 0.62 * Math.abs(i - cc) / (cc + 0.5));
        const sw = wts.reduce((a, b) => a + b, 0);
        const hs = wts.map((w) => Math.floor(N * w / sw));
        let left = N - hs.reduce((a, b) => a + b, 0);
        for (let i = 0; left > 0; i = (i + 1) % ns) { const k = Math.round(cc + (i % 2 ? 1 : -1) * Math.floor((i + 1) / 2)); const kk = Math.max(0, Math.min(ns - 1, k)); hs[kk]++; left--; }
        const SP = isBox ? 56 : 58;
        let j = 0;
        for (let lev = 0; j < N && lev < 40; lev++) {
          for (let i = 0; i < ns && j < N; i++) {
            if (hs[i] <= lev) continue;
            const px = tx + (i - cc) * SP + (hash(j, 9) - 0.5) * 3, py = ty + 36 - lev * 14 + (hash(j, 5) - 0.5) * 3;
            st.items.push({ kind: 'pay', node: makeChip(st.chipLayer, '1 €', 22), x: px, y: py, t0: pb.t + j * step, jit: hash(j, 3) });
            j++;
          }
        }
      }
      // pluie de jetons
      const tRain = cue('rain'), tMore = cue('rain-more');
      st.rain = null;
      if (tRain != null || p.rain_tag) {
        st.tRain = tRain == null ? 0 : tRain; st.tMore = tMore;
        st.veil = rect(root, 0, 0, 1920, 1080, 0, C.ink, null, 0, { opacity: 0 });
        st.rainLayer = g(root);
        st.rain = [];
        const rr = ZV.rng(2701);
        const tag = p.rain_tag == null ? '−2,7 %' : p.rain_tag;
        for (let j = 0; j < 96; j++) {
          st.rain.push({ node: makeChip(st.rainLayer, tag, 14.5), j, speed: 760 + rr() * 520, s: 1.3 + rr() * 0.7, r0: rr() * 360, ts: j < 40 ? st.tRain + j * 0.05 : (tMore == null ? 1e9 : tMore + (j - 40) * 0.02) });
        }
      }

      /* ---- râteau (en repère écran) ---- */
      st.tRake = cue('rake');
      st.rakeMode = p.rake === 'all' || p.rake === 'losers' ? p.rake : 'none';
      st.rake = null;
      if (st.tRake != null && st.rakeMode !== 'none') {
        const rk = g(root, { visibility: 'hidden' });
        rect(rk, 20, 505, 1100, 70, 14, C.ink, C.paper, 6);                 // manche
        rect(rk, 12, 490, 40, 100, 10, C.paper, C.ink, 6);                  // virole
        rect(rk, 0, 0, 58, 1080, 0, C.paper, C.ink, 7);                     // tête
        let td = '';
        for (let y = 20; y < 1080; y += 52) td += `M0 ${y}L-36 ${y + 18}L0 ${y + 36}Z`;
        sv('path', { d: td, fill: C.paper, stroke: C.ink, 'stroke-width': 5, 'stroke-linejoin': 'round' }, rk);
        for (let y = 60; y < 1080; y += 160) circle(rk, 29, y, 7, C.ink);
        st.rake = rk;
      }

      /* ---- compteur (haut à droite) ---- */
      st.counter = null;
      if (p.counter) {
        const c = g(root);
        rect(c, 12, 12, 440, 140, 22, C.lime);
        rect(c, 0, 0, 440, 140, 22, C.ink, C.paper, 7);
        const lab = text(c, p.counter.label || '', 30, 46, 28, C.paper, { mono: true });
        const val = text(c, '0', 30, 120, 84, C.lime, { mono: true });
        st.counter = { c, lab, val, t0: cue('counter') == null ? 0.3 : cue('counter') };
      }
      st.camP = p.camera || {};
      st.focus = locate(st.camP.focus);
      st.zoom = st.camP.zoom == null ? 1 : st.camP.zoom;
      st.tPush = cue('camera-push');
      st.opening = st.tPush != null && st.tPush > 1.6;     // plan d'ouverture : noir 1 s, puis le tapis
      return st;
    },

    update(st, t, shot) {
      const p = st.p;
      /* ---- caméra ---- */
      let z = st.zoom;
      let appear = 0;
      if (st.opening) {
        appear = 1.0;
        const zpre = z * lerp(0.7, 0.78, prog(t, appear, st.tPush));
        z = lerp(zpre, st.zoom, E.io3(prog(t, st.tPush, st.tPush + 0.9)));
        z *= 1 + 0.07 * (1 - E.out3(prog(t, appear, appear + 0.17)));
      }
      const P = st.focus || [(X0 + TABLE_R) / 2, (Y0 + TABLE_B) / 2];
      const isBox = typeof st.camP.focus === 'string' && Number.isNaN(parseInt(st.camP.focus, 10));
      const S0 = isBox ? [960, 690] : [960, 450];
      const w = clamp((z - 1) / 0.6);
      const Sx = P[0] + (S0[0] - P[0]) * w, Sy = P[1] + (S0[1] - P[1]) * w;
      st.cam.setAttribute('transform', `translate(${f2(Sx)} ${f2(Sy)}) scale(${f2(z)}) translate(${f2(-P[0])} ${f2(-P[1])})`);
      st.table.setAttribute('visibility', t >= appear ? 'visible' : 'hidden');
      st.chipLayer.setAttribute('visibility', t >= appear ? 'visible' : 'hidden');

      /* ---- râteau : position écran → monde ---- */
      let rakeX = null, rakeScr = null;
      if (st.rake) {
        const dr = Math.min(0.4, Math.max(0.15, st.dur - st.tRake - 0.03));
        const rp = prog(t, st.tRake, st.tRake + dr);
        if (rp > 0) {
          rakeScr = lerp(2360, -330, E.io2(rp));
          rakeX = P[0] + (rakeScr - Sx) / z;
        }
        st.rake.setAttribute('visibility', rp > 0 && rp < 1 ? 'visible' : 'hidden');
        st.rake.setAttribute('transform', `translate(${f2(rakeScr == null ? 2400 : rakeScr)} 0)`);
      }
      const winN = st.winN == null ? null : +st.winN;

      /* ---- case gagnante : clignote 2 fois puis reste allumée ---- */
      let wOn = false;
      if (st.winN != null && st.tWin != null) {
        const u = (t - st.tWin) / 0.1;
        wOn = u >= 0 && (u < 1 || (u >= 2 && u < 3) || u >= 4);
      } else if (st.winN != null) wOn = true;
      st.win.setAttribute('visibility', wOn ? 'visible' : 'hidden');

      /* ---- jetons posés / glissants ---- */
      for (const it of st.items) {
        let x = it.x, y = it.y, s = 1, o = 1, rot = 0;
        if (it.kind === 'base') {
          const age = t - it.t0;
          if (!it.dropped) { o = 1; s = 1; }
          else if (age < 0) o = 0;
          else {
            const pp = prog(age, 0, 0.167);
            s = lerp(1.4, 1, E.in2(pp));
            if (age > 0.167) s = 1 + 0.04 * Math.sin(Math.PI * clamp((age - 0.167) / 0.14)) * 1;
            o = clamp(age / 0.04);
          }
        } else {
          const age = t - it.t0;
          if (age < 0) o = 0;
          else {
            const pp = E.out3(prog(age, 0, 0.32));
            const fromX = P[0] + (1920 + 120 - Sx) / z;
            x = lerp(fromX, it.x, pp); y = lerp(it.y - 40 - it.jit * 60, it.y, pp);
            rot = (1 - pp) * 160;
            s = 1 + 0.18 * (1 - pp);
          }
        }
        // balayé par le râteau
        if (rakeX != null && o > 0 && (st.rakeMode === 'all' || it.n !== winN || it.kind === 'pay')) {
          const lim = rakeX - (64 + 26 * hash(it.x, it.y)) / z;
          if (x > lim - 0) x = Math.min(x, lim);
        }
        put(it.node, x, y, rot, s, s, o);
      }
      for (const r of st.rings) {
        const age = r.t == null ? -1 : t - r.t - 0.14;
        const q = prog(age, 0, 0.3);
        r.ring.setAttribute('visibility', age > 0 && q < 1 && rakeX == null ? 'visible' : 'hidden');
        r.ring.setAttribute('r', f2(lerp(38, 92, E.out3(q)))); r.ring.setAttribute('opacity', f2(1 - q));
        r.ring.setAttribute('stroke-width', f2(lerp(7, 2, q)));
      }

      /* ---- pluie de jetons ---- */
      if (st.rain) {
        const k = prog(t, st.tRain, st.tRain + 0.35);
        st.veil.setAttribute('opacity', f2(0.58 * k));
        const Hh = 1080 + 220;
        for (const c of st.rain) {
          const age = t - c.ts;
          if (age < 0) { c.node.setAttribute('visibility', 'hidden'); continue; }
          const cyc = Hh / c.speed;
          const kk = Math.floor(age / cyc), loc = age - kk * cyc;
          const x = 90 + hash(c.j, kk) * 1740;
          put(c.node, x, -110 + c.speed * loc, c.r0 + age * 70 * (c.j % 2 ? 1 : -1), c.s, c.s, 1);
        }
      }

      /* ---- compteur ---- */
      if (st.counter) {
        const cn = p.counter, ct = st.counter;
        const pop = E.back(prog(t, ct.t0, ct.t0 + 0.3));
        ct.c.setAttribute('visibility', pop > 0.001 ? 'visible' : 'hidden');
        ct.c.setAttribute('transform', `translate(${f2(1430 + 220)} ${f2(40 + 70)}) scale(${f2(Math.max(pop, 0.001))}) translate(-220 -70)`);
        const from = cn.from == null ? 0 : cn.from, to = cn.to == null ? 0 : cn.to;
        const v = lerp(from, to, E.out2(prog(t, ct.t0 + 0.08, ct.t0 + Math.min(1.0, Math.max(0.5, st.dur - ct.t0 - 0.2)))));
        ct.val.textContent = ZV.fr(v) + (cn.suffix || '');
      }
    }
  });
})();
;
/* ==== tools/video/composition/components/jackpot-screen.js ==== */
// Composant « jackpot-screen » (épisode 2) : l'écran de Katrina Bookman, Queens, 23 août 2016. Voir EP2-COMPONENTS.md.
// Fonction pure du temps du plan ; aplats seulement. Le téléphone ne montre aucun portrait (viseur + barres de texte).
(() => {
  const { C, F, E, clamp, prog, lerp, f2, put, g, rect, text, path, circle, sv } = ZV;
  let UID = 0;
  const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
  const str = (v, d) => (v != null && v !== '' ? String(v) : d);
  const bw = (s, size) => { let a = 0; for (const ch of String(s)) a += size * (ch === ' ' ? 0.26 : /[0-9]/.test(ch) ? 0.6 : /[A-ZÀÂÉÈÊÎÔÛÇ]/.test(ch) ? 0.66 : /[.,:;'’!|]/.test(ch) ? 0.3 : 0.56); return a; };
  const mono = (parent, s, x, y, size, fill, anchor) => text(parent, s, x, y, size, fill, { mono: true, anchor, len: f2(String(s).length * size * 0.6) });
  const GX = 235, GY = 195, GW = 1450, GH = 360;            // vitre
  const BAND = 6;                                            // tranches de l'écran qui saute
  const SLOT = { x: 1410, w: 280 }, TX = 1550;               // imprimante, axe du ticket
  const BULBS = [];
  for (let k = 0; k < 11; k++) { BULBS.push(240 + 52 * k); BULBS.push(1680 - 52 * k); }

  ZV.define('jackpot-screen', {
    init(root, shot) {
      const P = shot.props || {};
      const uid = 'jp' + (++UID);
      const st = { dur: Math.max(0.1, shot.dur || 1) };
      st.amount = str(P.amount, '42 949 672,76 $'); st.real = str(P.real, '2,25 $'); st.limit = str(P.limit, '6 500 $'); st.city = str(P.city, 'QUEENS').toUpperCase();
      const cu = (n) => ZV.cue(shot, n);
      st.cShow = cu('show'); st.cFlash = cu('flash'); st.cSelfie = cu('selfie'); st.cFail = cu('fail'); st.cSmall = cu('small-print');
      st.cTicket = cu('ticket'); st.cSteak = cu('steak'); st.cLimit = cu('limit');
      const none = [st.cShow, st.cFlash, st.cSelfie, st.cFail, st.cSmall, st.cTicket, st.cSteak, st.cLimit].every((x) => x === null);
      st.hasShow = st.cShow !== null;
      if (none) st.cShow = null;

      // fond paper + trame de points
      rect(root, 0, 0, 1920, 1080, 0, C.paper);
      const defs = sv('defs', null, root);
      const pat = sv('pattern', { id: uid + 'd', width: 64, height: 64, patternUnits: 'userSpaceOnUse' }, defs);
      circle(pat, 32, 32, 3.4, '#E0DCCE');
      rect(root, 0, 0, 1920, 1080, 0, `url(#${uid}d)`);

      // ticket (derrière la machine, sort de l'imprimante)
      st.ticket = g(root);
      {
        const w = 240, y0 = 560, y1 = 838, x0 = TX - w / 2;
        let d = `M${x0} ${y0}H${x0 + w}V${y1}`;
        const zz = 12; for (let k = zz; k > 0; k--) d += `L${f2(x0 + (w * (k - 0.5)) / zz)} ${y1 - 14}L${f2(x0 + (w * (k - 1)) / zz)} ${y1}`;
        d += 'Z';
        path(st.ticket, d, C.ink, C.ink, 6).setAttribute('transform', 'translate(12 12)');
        path(st.ticket, d, C.white, C.ink, 6);
        mono(st.ticket, 'BON DE CAISSE', TX, 733, 26, C.ink, 'middle');
        rect(st.ticket, x0 + 24, 746, w - 48, 4, 0, C.ink);
        mono(st.ticket, st.real, TX, 800, Math.min(58, (w - 40) / (st.real.length * 0.6)), C.ink, 'middle');
      }

      // bande « petits caractères »
      st.band = g(root);
      {
        rect(st.band, -20 + 10, 735 + 10, 1960, 76, 0, C.ink);
        rect(st.band, -20, 735, 1960, 76, 0, C.paper, C.ink, 6);
        sv('clipPath', { id: uid + 'c' }, defs).appendChild(sv('rect', { x: 0, y: 735, width: 1920, height: 76 }));
        const cg = g(st.band, { 'clip-path': `url(#${uid}c)` });
        st.bandStr = 'UNE PANNE ANNULE TOUS LES PAIEMENTS ET TOUTES LES PARTIES';
        st.bandLen = st.bandStr.length * 40 * 0.6; st.bandPer = st.bandLen + 280;
        st.bt = [0, 1].map(() => mono(cg, st.bandStr, 0, 786, 40, C.ink, 'start'));
      }

      // steak (picto plat) : créé après le caisson pour passer devant
      const mkSteak = (parent) => {
        const sg = g(parent);
        path(sg, 'M-80 -10C-90 -60 -40 -85 20 -80C80 -78 110 -40 100 5C92 50 50 78 -10 74C-60 70 -76 40 -80 -10Z', C.red, C.ink, 7);
        path(sg, 'M-58 -20C-44 -50 -6 -58 24 -52', 'none', C.paper, 6);
        path(sg, 'M-52 28C-30 52 14 54 46 34', 'none', C.paper, 6);
        const T = 'M-34 -14H46M6 -14V46';                     // l'os en T
        path(sg, T, 'none', C.ink, 30);
        path(sg, T, 'none', C.paper, 16);
        return sg;
      };

      // caisson de la machine
      const cab = g(root); st.cab = cab;
      rect(cab, 170 + 16, 40 + 16, 1580, 650, 26, C.ink);
      rect(cab, 170, 40, 1580, 650, 26, C.red, C.ink, 8);
      rect(cab, 210, 70, 1500, 86, 14, C.ink);
      st.bulbs = BULBS.map((x) => circle(cab, x, 113, 15, C.pocket, C.paper, 3));
      text(cab, 'JACKPOT', 960, 133, 62, C.lime, { anchor: 'middle', len: f2(bw('JACKPOT', 62)) });
      rect(cab, 215, 175, 1490, 400, 22, C.ink);
      st.glass = rect(cab, GX, GY, GW, GH, 10, C.paper, C.ink, 4);
      mono(cab, 'GAIN', GX + 34, GY + 50, 34, C.ink, 'start');
      mono(cab, `${st.city} · 23 AOÛT 2016`, GX + 34, GY + GH - 26, 32, C.ink, 'start').setAttribute('opacity', 0.75);
      // montant : une cellule Mono par caractère
      const n = st.amount.length, S = Math.min(150, 1330 / (n * 0.6)), cw = S * 0.6;
      st.S = S; st.cw = cw; st.n = n; st.x0 = 960 - (n * cw) / 2; st.by = 425;
      st.idle = mono(cab, 'PRÊT À JOUER', 960, 410, 66, '#5A5A5A', 'middle');
      st.amtG = g(cab);
      st.chars = [];
      for (let i = 0; i < n; i++) {
        const ch = st.amount[i];
        st.chars.push(ch === ' ' ? null : text(st.amtG, ch, f2(st.x0 + i * cw + cw / 2), st.by, S, C.ink, { mono: true, anchor: 'middle', len: f2(cw) }));
      }
      st.strike = rect(st.amtG, st.x0 - 10, st.by - S * 0.36, n * cw + 20, 14, 3, C.red);
      // tranches pour « l'écran saute »
      const rnd = ZV.rng(2016);
      st.sl = [];
      for (let k = 0; k < BAND; k++) {
        const h = GH / BAND, y = GY + k * h;
        sv('clipPath', { id: `${uid}s${k}` }, defs).appendChild(sv('rect', { x: GX, y: f2(y), width: GW, height: f2(h) }));
        const cg = g(cab, { 'clip-path': `url(#${uid}s${k})` });
        const inner = g(cg);
        rect(inner, GX - 300, y, GW + 600, h, 0, k % 2 ? C.paper : '#E4E0D3');
        mono(inner, st.amount, 960, st.by, S, k % 2 ? C.ink : C.red, 'middle');
        const bar = rect(cg, GX, y + h * 0.3, 300 + rnd() * 240, h * 0.4, 0, C.ink);
        st.sl.push({ cg, inner, bar, base: (70 + rnd() * 110) * (k % 2 ? 1 : -1), bx: GX + rnd() * 900 });
      }
      st.panne = g(cab);
      {
        const w = bw('PANNE', 130) + 80, h = 170;
        rect(st.panne, -w / 2, -h / 2, w, h, 12, C.paper, C.red, 14);
        rect(st.panne, -w / 2 + 14, -h / 2 + 14, w - 28, h - 28, 6, 'none', C.red, 4);
        text(st.panne, 'PANNE', 0, 45, 130, C.red, { anchor: 'middle', len: f2(bw('PANNE', 130)) });
      }
      // sticker « MAX … »
      st.lim = g(cab);
      {
        const lab = 'MAX ' + st.limit, size = Math.min(150, 1250 / (bw(lab, 1) || 1)), w = bw(lab, size) + 100, h = size * 1.5;
        rect(st.lim, -w / 2 + 14, -h / 2 + 14, w, h, 18, C.ink);
        rect(st.lim, -w / 2, -h / 2, w, h, 18, C.lime, C.ink, 8);
        text(st.lim, lab, 0, size * 0.35, size, C.ink, { anchor: 'middle', len: f2(bw(lab, size)) });
      }
      // bandeau d'information et imprimante
      rect(cab, 210, 595, 1500, 72, 12, C.ink);
      mono(cab, 'RESORTS WORLD CASINO', 240, 643, 36, C.paper, 'start');
      mono(cab, 'KATRINA BOOKMAN', 1680, 643, 36, C.lime, 'end');
      rect(cab, SLOT.x, 664, SLOT.w, 26, 6, C.ink, C.paper, 4);
      cab.appendChild(st.panne); cab.appendChild(st.lim);

      st.steak = mkSteak(root);
      // téléphone (viseur : aucun portrait)
      st.phone = g(root);
      {
        const ph = st.phone;
        rect(ph, -125 + 14, -190 + 14, 250, 380, 38, C.ink);
        rect(ph, -125, -190, 250, 380, 38, C.ink, C.ink, 6);
        rect(ph, -105, -162, 210, 310, 14, C.paper);
        const bx = 78, by = 100;
        path(ph, `M${-bx} ${-by + 26}V${-by}H${-bx + 26}M${bx - 26} ${-by}H${bx}V${-by + 26}M${bx} ${by - 26}V${by}H${bx - 26}M${-bx + 26} ${by}H${-bx}V${by - 26}`, 'none', C.ink, 7);
        rect(ph, -62, -66, 124, 22, 4, C.ink); rect(ph, -62, -26, 124, 22, 4, C.ink); rect(ph, -62, 14, 78, 22, 4, C.ink);
        circle(ph, 0, 168, 18, C.paper, C.paper, 4);
        circle(ph, 0, -176, 5, C.pocket);
      }
      st.vig = g(root);
      {
        const v = st.vig;
        rect(v, -105 + 10, -75 + 10, 210, 150, 8, C.ink);
        rect(v, -105, -75, 210, 150, 8, C.white, C.ink, 6);
        rect(v, -88, -58, 176, 116, 4, C.paper, C.ink, 3);
        rect(v, -76, -36, 152, 26, 3, C.ink); rect(v, -76, 4, 100, 18, 3, C.ink);
        rect(v, -76, 32, 60, 12, 3, C.red);
      }
      st.flashR = rect(root, 0, 0, 1920, 1080, 0, C.paper);
      return st;
    },

    update(st, t, shot) {
      try {
        t = clamp(t, 0, st.dur + 1);
        const C_ = C;
        const inWin = (a, d) => a !== null && t >= a && t < a + d;
        const tFail = st.cFail;
        const failed = tFail !== null && t >= tFail;
        // ---- montant : chiffre par chiffre ----
        const tShow = st.cShow;
        const pre = tShow !== null && t < tShow;
        st.idle.setAttribute('visibility', pre ? 'visible' : 'hidden');
        const fail0 = failed && t < tFail + 0.55;
        for (let i = 0; i < st.n; i++) {
          const nd = st.chars[i]; if (!nd) continue;
          const on = tShow === null || t >= tShow + i * 0.085;
          nd.setAttribute('visibility', on ? 'visible' : 'hidden');
          nd.setAttribute('fill', failed ? '#5A5A5A' : C_.ink);
        }
        st.amtG.setAttribute('visibility', pre || fail0 ? 'hidden' : 'visible');
        // clignotement (flash) : vitre lime / paper + ampoules qui courent
        const fEnd = tFail !== null ? tFail : 1e9;
        const flashing = st.cFlash !== null && t >= st.cFlash && t < Math.min(st.cFlash + 2.4, fEnd);
        st.glass.setAttribute('fill', flashing && Math.floor((t - st.cFlash) * 2) % 2 === 0 ? C_.lime : C_.paper);
        const cyc = [C_.lime, C_.paper, C_.red];
        for (let k = 0; k < st.bulbs.length; k++) {
          let fill;
          if (failed) fill = C_.pocket;
          else if (flashing) fill = (Math.floor((t - st.cFlash) * 5) + k) % 3 === 0 ? cyc[(k >> 1) % 3] : C_.pocket;
          else fill = cyc[k % 3];
          st.bulbs[k].setAttribute('fill', fill);
        }
        // ---- l'écran saute ----
        const pf = tFail !== null ? prog(t, tFail, tFail + 0.55) : 1;
        const gl = tFail !== null && t >= tFail && pf < 1;
        for (let k = 0; k < st.sl.length; k++) {
          const s = st.sl[k], flip = (Math.floor((t - (tFail || 0)) * 3) + k) % 2 ? 1 : -1;
          const tt = t - (tFail || 0);
          s.cg.setAttribute('visibility', gl ? 'visible' : 'hidden');
          s.inner.setAttribute('transform', `translate(${f2(gl ? s.base * (1 - pf) * flip : 0)} 0)`);
          const bv = gl && (Math.floor(tt * 3) + k) % 3 === 0;
          s.bar.setAttribute('visibility', bv ? 'visible' : 'hidden');
          s.bar.setAttribute('x', f2(s.bx + (gl ? 200 * flip * (1 - pf) : 0)));
        }
        // montant barré, tampon « PANNE »
        const tp = tFail !== null ? tFail + 0.55 : 1e9;
        const sq = st.cLimit !== null && t >= st.cLimit ? E.out3(prog(t, st.cLimit + 0.12, st.cLimit + 0.3)) : 0;
        const ps = tFail !== null ? E.out3(prog(t, tp, tp + 0.35)) : 0;
        const sc = lerp(1, 0.6, ps);
        st.strike.setAttribute('width', f2((st.n * st.cw + 20) * (tFail !== null ? E.out2(prog(t, tp, tp + 0.25)) : 0)));
        st.strike.setAttribute('visibility', t >= tp ? 'visible' : 'hidden');
        const sy = sc * lerp(1, 0.16, sq);
        const piv = lerp(375, 470, sq);
        st.amtG.setAttribute('transform', `translate(960 ${f2(piv + lerp(0, -100, ps) * (1 - sq))}) scale(${f2(sc)} ${f2(sy)}) translate(-960 ${-f2(piv)})`);
        {
          const tt = tp + 0.25, p = E.back(prog(t, tt, tt + 0.2)), sh = ZV.shakeAt(t, tt + 0.12, 10, 0.4);
          put(st.panne, 1000 + sh[0], 445 + sh[1], -7, p, p, tFail !== null && t >= tt && !(st.cLimit !== null && t >= st.cLimit + 0.15) ? 1 : 0);
        }
        // sticker « MAX … » qui écrase
        {
          const tl = st.cLimit;
          if (tl === null || t < tl) put(st.lim, 960, 395, -3, 1, 1, 0);
          else {
            const p = prog(t, tl, tl + 0.2), sh = ZV.shakeAt(t, tl + 0.2, 14, 0.45), k = lerp(2.3, 1, E.in3(p));
            put(st.lim, 960 + sh[0], lerp(100, 395, E.in3(p)) + sh[1], -3, k, k, 1);
          }
        }
        // ---- bande petits caractères ----
        {
          const ts = st.cSmall;
          const gone = st.cTicket !== null && t >= st.cTicket;
          const on = ts !== null && t >= ts && !gone;
          const sl = on ? E.out3(prog(t, ts, ts + 0.3)) : gone ? 1 - E.in3(prog(t, st.cTicket, st.cTicket + 0.25)) : 0;
          st.band.setAttribute('transform', `translate(0 ${f2((1 - sl) * 160)})`);
          st.band.setAttribute('visibility', sl > 0.001 ? 'visible' : 'hidden');
          if (ts !== null) {
            const off = (240 * Math.max(0, t - ts)) % st.bandPer;
            for (let k = 0; k < 2; k++) st.bt[k].setAttribute('x', f2(1920 - off - st.bandPer * k));
          }
        }
        // ---- ticket, steak ----
        {
          const tk = st.cTicket;
          let dy = -300, vis = false;
          if (tk !== null && t >= tk) { vis = true; const p = clamp((t - tk) / 1.0); dy = -300 * (1 - (0.5 * Math.floor(p * 16) / 16 + 0.5 * E.out2(p))); if (p >= 1) dy = 0; }
          st.ticket.setAttribute('transform', `translate(0 ${f2(dy)})`);
          st.ticket.setAttribute('visibility', vis ? 'visible' : 'hidden');
          const ss = st.cSteak;
          if (ss === null || t < ss) put(st.steak, 1130, 765, -6, 0.9, 0.9, 0);
          else { const p = E.bounce(prog(t, ss, ss + 0.5)); put(st.steak, 1130, 765 + lerp(-120, 0, p), -6, 0.9, 0.9, 1); }
        }
        // ---- selfie ----
        {
          const ts = st.cSelfie;
          if (ts === null) { put(st.phone, 380, 1400, -8, 1, 1, 0); put(st.vig, 700, 755, 6, 1, 1, 0); st.flashR.setAttribute('visibility', 'hidden'); }
          else {
            const pin = E.back(prog(t, ts, ts + 0.5));
            const pout = tFail !== null && t >= tFail ? E.in3(prog(t, tFail, tFail + 0.4)) : 0;
            const sh = ZV.shakeAt(t, ts + 0.5, 6, 0.3);
            put(st.phone, 380 + sh[0], lerp(1300, 655, pin) + 700 * pout, -8, 1, 1, t >= ts && pout < 1 ? 1 : 0);
            const tv = ts + 0.75, pv = E.back(prog(t, tv, tv + 0.3));
            put(st.vig, 700, 755, 6, pv, pv, t >= tv && pout < 1 ? 1 : 0);
            st.flashR.setAttribute('visibility', t >= ts + 0.5 && t < ts + 0.6 ? 'visible' : 'hidden');
          }
        }
      } catch (e) { /* jamais d'exception */ }
    }
  });
})();
;
/* ==== tools/video/composition/components/kinetic.js ==== */
// Composant « kinetic » : voir tools/video/composition/INTERFACE.md. Fonction pure du temps du plan, aplats seulement.
(() => {
  /* ---- aides typographiques locales (mêmes lignes dans chaque composant du rôle « Typo ») ---- */
  const { C, F, E, clamp, prog, lerp, f2, put, g, rect, text, path, line, sv, circle } = ZV;
  const COL = { ink: C.ink, paper: C.paper, lime: C.lime, red: C.red, white: C.white };
  const TINT = { ink: '#1A1A1A', lime: '#B9EC22', paper: '#E4E0D3', red: '#F0452F' };
  const NB = ' ';
  let UID = 0;
  const colOf = (k, d) => COL[k] || k || d;
  // largeur d'une chaîne (mesure réelle via un <text> caché), ramenée à `size` px
  function mkProbe(root) {
    const n = sv('text', { x: 0, y: 0, 'font-size': 100, 'font-weight': 800, visibility: 'hidden' }, root);
    const cache = {};
    return function w(str, size, o) {
      o = o || {};
      const key = (o.mono ? 'm' : 'd') + (o.sp || 0) + '|' + str;
      let v = cache[key];
      if (v === undefined) {
        n.setAttribute('font-family', o.mono ? F.mono : F.display);
        n.setAttribute('letter-spacing', (o.sp || 0) * 100);
        n.textContent = str.replace(/ /g, NB);
        try { v = n.getComputedTextLength(); } catch (e) { v = 0; }
        if (!(v > 0)) v = str.length * (o.mono ? 60 : 58);
        cache[key] = v;
      }
      return v * size / 100;
    };
  }
  // 1 234,5 : espace fine insécable pour les milliers, virgule décimale
  function fnum(v, dec) {
    const s = Math.abs(v).toFixed(dec || 0).split('.');
    const i = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return (v < 0 ? '−' : '') + i + (s[1] ? ',' + s[1] : '');
  }
  // lie ponctuation et opérateurs au mot précédent (jamais de « ? » seul en début de ligne)
  const glue = (s) => String(s).replace(/ (?=[?:%!;€¢÷×=+−])/g, NB).replace(/([÷×=+−]) (?=\S)/g, '$1' + NB);
  // coupe `str` en ≤ maxRows lignes équilibrées tenant dans maxW (null si impossible)
  function breaks(str, S, maxW, wf, maxRows) {
    if (wf(str, S) <= maxW) return [str];
    const words = str.split(' ');
    if (words.length < 2 || maxRows < 2) return null;
    let best = null, bm = 1e9;
    for (let k = 1; k < words.length; k++) {
      const a = words.slice(0, k).join(' '), b = words.slice(k).join(' ');
      const m = Math.max(wf(a, S), wf(b, S));
      if (m < bm) { bm = m; best = [a, b]; }
    }
    if (bm <= maxW) return best;
    if (maxRows >= 3 && words.length >= 3) {
      bm = 1e9; best = null;
      for (let k = 1; k < words.length - 1; k++) for (let j = k + 1; j < words.length; j++) {
        const a = words.slice(0, k).join(' '), b = words.slice(k, j).join(' '), c = words.slice(j).join(' ');
        const m = Math.max(wf(a, S), wf(b, S), wf(c, S));
        if (m < bm) { bm = m; best = [a, b, c]; }
      }
      if (bm <= maxW) return best;
    }
    return null;
  }
  // fond plat + trame de points qui dérive doucement + repères de coupe aux angles
  function backdrop(root, bgk, uid, opt) {
    opt = opt || {};
    const tint = TINT[bgk] || TINT.ink;
    const fill = bgk === 'wheel' ? C.ink : colOf(bgk, C.ink);
    rect(root, 0, 0, 1920, 1080, 0, fill);
    const o = {};
    if (opt.dots !== false) {
      const defs = sv('defs', null, root);
      o.pat = sv('pattern', { id: uid + 'd', width: 64, height: 64, patternUnits: 'userSpaceOnUse' }, defs);
      circle(o.pat, 32, 32, 3.6, tint);
      rect(root, 0, 0, 1920, 1080, 0, `url(#${uid}d)`);
    }
    if (opt.marks !== false) {
      const mc = bgk === 'ink' || bgk === 'wheel' ? '#3A3A3A' : C.ink;
      path(root, 'M56 160V56H160M1760 56H1864V160M1864 920V1024H1760M160 1024H56V920', 'none', mc, 8, { 'stroke-linecap': 'butt', 'stroke-linejoin': 'miter' });
    }
    return o;
  }
  const drift = (o, t) => { if (o && o.pat) o.pat.setAttribute('patternTransform', `translate(${f2(t * 14)} ${f2(t * 9)})`); };
  // pastille Mono (kicker) : fond/texte selon l'aplat
  function pill(parent, str, bgk, size, W) {
    const dark = bgk === 'ink' || bgk === 'wheel';
    const fill = dark ? C.lime : C.ink;
    const tc = dark ? C.ink : (bgk === 'lime' ? C.lime : C.paper);
    const sp = 0.1;
    const w = W(str, size, { mono: true, sp }) + 64, h = size * 1.7;
    const gr = g(parent);
    rect(gr, -w / 2 + 7, -h / 2 + 7, w, h, 14, C.ink);
    rect(gr, -w / 2, -h / 2, w, h, 14, fill, C.ink, 5);
    text(gr, str, 0, size * 0.35, size, tc, { mono: true, anchor: 'middle', spacing: f2(sp * size) });
    return { g: gr, w, h };
  }
  // Définition d'un composant : `build` (une fois) / `draw` (pure). La mise en page dépend des mesures de police :
  // si les polices ne sont pas encore chargées à l'init, on reconstruit dès qu'elles le sont (puis on redessine).
  const FONTS = ['800 100px "Bricolage Grotesque"', '800 100px "JetBrains Mono"'];
  const fontsOk = () => { try { return FONTS.every((f) => document.fonts.check(f)); } catch (e) { return true; } };
  function defineTypo(id, impl) {
    const rebuild = (st) => {
      while (st.root.firstChild) st.root.removeChild(st.root.firstChild);
      st.s = impl.build(st.root, st.shot);
      st.ok = true;
      if (st.last !== null) impl.draw(st.s, st.last, st.shot);
    };
    ZV.define(id, {
      init(root, shot) {
        const st = { root, shot, last: null, ok: fontsOk() };
        st.s = impl.build(root, shot);
        if (!st.ok) { try { Promise.all(FONTS.map((f) => document.fonts.load(f))).then(() => { if (!st.ok && fontsOk()) rebuild(st); }); } catch (e) { /* tant pis */ } }
        return st;
      },
      update(st, t, shot) {
        st.last = t;
        if (!st.ok && fontsOk()) rebuild(st);
        impl.draw(st.s, t, shot || st.shot);
      }
    });
  }

  const FR = 1 / 30;
  const NSP = -0.04;                       // tracking en em
  // fond « roue » : cylindre simplifié qui tourne derrière un voile ink 62 %
  function wheelBg(parent) {
    const gr = g(parent), R2 = 640, R1 = 470, n = 37, step = 360 / n;
    circle(gr, 0, 0, R2 + 28, C.ink, C.paper, 10);
    const pt = (r, a) => `${f2(r * Math.cos(a * ZV.D2R))} ${f2(r * Math.sin(a * ZV.D2R))}`;
    for (let i = 0; i < n; i++) {
      const a0 = i * step - step / 2 - 90, a1 = a0 + step, k = ZV.colorOf(ZV.ORDER[i]);
      path(gr, `M${pt(R1, a0)}L${pt(R2, a0)}A${R2} ${R2} 0 0 1 ${pt(R2, a1)}L${pt(R1, a1)}A${R1} ${R1} 0 0 0 ${pt(R1, a0)}Z`, k === 'lime' ? C.lime : k === 'red' ? C.red : C.pocket, C.paper, 4);
      const am = (a0 + a1) / 2, tg = g(gr);
      text(tg, String(ZV.ORDER[i]), 0, 13, 40, k === 'lime' ? C.ink : C.paper, { mono: true, anchor: 'middle' });
      tg.setAttribute('transform', `translate(${pt(555, am)}) rotate(${f2(am + 90)})`);
    }
    circle(gr, 0, 0, R1, C.pocket, C.paper, 8);
    circle(gr, 0, 0, 250, '#222', C.paper, 6);
    circle(gr, 0, 0, 70, C.paper, C.ink, 6);
    return gr;
  }

  defineTypo('kinetic', {
    build(root, shot) {
      const P = shot.props || {};
      const bgk = ['ink', 'lime', 'paper', 'red', 'wheel'].includes(P.bg) ? P.bg : 'ink';
      const uid = 'kn' + (++UID);
      const W = mkProbe(root);
      const wf = (s, S) => W(s, S, { sp: NSP });
      const dark = bgk === 'ink' || bgk === 'wheel';
      const st = { shot, bgk, lines: [], uid, W, dark };
      const bd = backdrop(root, bgk, uid, { dots: bgk !== 'wheel', marks: true });
      st.bd = bd;
      if (bgk === 'wheel') { st.wheel = wheelBg(root); rect(root, 0, 0, 1920, 1080, 0, C.ink, null, 0, { opacity: 0.62 }); }

      const align = P.align === 'left' ? 'left' : 'center';
      const cx = 960, x0 = 170, maxW = align === 'left' ? 1580 : 1600;
      const defs = (P.lines || []).map((l, i) => {
        const style = ['slam', 'pop', 'type', 'stack', 'stamp', 'label'].includes(l.style) ? l.style : 'pop';
        let kc = l.color || (dark ? 'paper' : 'ink');
        const plate = kc === 'lime' && (bgk === 'paper' || bgk === 'lime') && style !== 'stamp' && style !== 'label';
        return { i, l, style, kc, plate, str: glue(String(l.text || '').toUpperCase()), cue: l.cue || ('l' + (i + 1)) };
      });
      const bubbleLine = P.bubble && defs.length ? defs[0] : null;
      const stack = defs.filter((d) => d !== bubbleLine);

      // ---- calcul de la mise en page ----
      const topY = 120, botY = 840;
      const kH = P.kicker ? 124 : 0, ballH = P.ball ? 236 : 0;
      // bulle (phrase entendue)
      let bubH = 0, bubS = 0, bubRows = null;
      if (bubbleLine) {
        for (bubS = 190; bubS > 50; bubS *= 0.95) { bubRows = breaks(bubbleLine.str, bubS, 1460, wf, 3); if (bubRows && bubRows.length * bubS * 0.98 <= 360) break; bubRows = null; }
        if (!bubRows) { bubS = 52; bubRows = [bubbleLine.str]; }
        bubH = (bubRows.length - 1) * 0.97 * bubS + 0.72 * bubS + 2 * 54 + 70 + 44;
      }
      const availH = botY - topY - kH - ballH - bubH;
      const base = [0, 420, 260, 200, 150, 125][Math.min(stack.length, 5)] || 120;
      const pad = (d) => (d.style === 'stamp' ? [70, 44] : d.plate ? [46, 26] : d.style === 'label' ? [56, 30] : [0, 0]);
      const fit = (S, maxRows) => {
        const out = []; let H = 0;
        for (const d of stack) {
          const [px, py] = pad(d);
          const Si = S * (d.style === 'slam' && stack.length > 1 ? 1.4 : 1);       // la chute (slam) est plus grosse
          const rows = breaks(d.str, Si, maxW - 2 * px, wf, d.style === 'label' ? 1 : maxRows);
          if (!rows) return null;
          const h = (rows.length - 1) * 0.97 * Si + 0.72 * Si;
          const pyy = d.style === 'stamp' ? py + 0.07 * Math.max(...rows.map((r) => wf(r, Si))) : py;
          out.push({ rows, h, px, py: pyy, S: Si });
          H += h + 2 * pyy;
        }
        H += Math.max(0, stack.length - 1) * 0.46 * S;
        return H <= availH ? { out, H } : null;
      };
      let S1 = 0, S2 = 0, f1 = null, f2_ = null;
      for (let S = base; S > 40; S *= 0.97) { const f = fit(S, 1); if (f) { S1 = S; f1 = f; break; } }
      for (let S = base; S > 40; S *= 0.97) { const f = fit(S, 3); if (f) { S2 = S; f2_ = f; break; } }
      let S = S2, F_ = f2_;
      if (f1 && S1 >= (stack.some((d) => d.style === 'stamp') ? 0.5 : 0.74) * S2) { S = S1; F_ = f1; }
      if (!F_) { S = 40; F_ = { out: stack.map((d) => ({ rows: [d.str], h: 0.72 * 40, px: 0, py: 0, S: 40 })), H: 40 * stack.length }; }

      const total = kH + ballH + bubH + (stack.length ? F_.H : 0);
      let y = clamp(484 - total / 2, topY - 6, 400);
      if (P.kicker) {
        const pl = pill(root, String(P.kicker).toUpperCase(), bgk, 42, W);
        const kx = align === 'left' ? x0 + pl.w / 2 : cx;
        st.kicker = { g: pl.g, x: kx, y: y + pl.h / 2 };
        y += kH;
      }
      if (P.ball) {
        const gr = g(root);
        const bg_ = g(gr);
        circle(bg_, 9, 9, 76, C.ink);
        circle(bg_, 0, 0, 76, C.white, C.ink, 8);
        path(bg_, 'M-46 -30A56 56 0 0 1 -12 -58', 'none', '#CFCFCF', 9);
        const tr = g(root);
        [[1062, y + 20, 10], [1100, y - 14, 15], [1156, y - 60, 24]].forEach(([tx, ty, tr_]) => circle(tr, tx, ty, tr_, C.white, C.ink, 5));
        st.ball = { g: gr, x: cx, y: y + 78, trail: tr.childNodes, trailG: tr };
        y += ballH;
      }
      const mkLine = (d, S_, rows, h, px, py, gx, gy, inBubble) => {
        const gr = g(root);
        const wmax = Math.max(...rows.map((r) => wf(r, S_)));
        const L = { d, g: gr, S: S_, rows: [], gx, gy, w: wmax, h, px, py, style: d.style, tCue: 0, bub: !!inBubble, n: rows.join('').length };
        L.t0 = ZV.cue(shot, d.cue);
        if (L.t0 === null) L.t0 = 0.1 + d.i * 0.5;
        const nxt = shot.beats.filter((b) => b.do === 'cue' && b.t > L.t0 + 0.05).map((b) => b.t);
        L.win = (nxt.length ? Math.min(...nxt) : shot.dur) - L.t0;
        const kcol = colOf(d.kc);
        let tcol = kcol;
        // décor derrière le texte
        if (inBubble) {
          const bw = wmax + 2 * 70, bh = h + 2 * 54, ty = bh / 2 + 56;
          rect(gr, -bw / 2 + 14, -bh / 2 + 14, bw, bh, 50, C.ink);
          path(gr, `M${-bw / 2 + 120} ${bh / 2 - 3}L${-bw / 2 + 70} ${bh / 2 + 112}L${-bw / 2 + 280} ${bh / 2 - 3}Z`, C.paper, C.ink, 8);
          rect(gr, -bw / 2, -bh / 2, bw, bh, 50, C.paper, C.ink, 8);
          line(gr, -bw / 2 + 132, bh / 2 + 1, -bw / 2 + 264, bh / 2 + 1, C.paper, 14, { 'stroke-linecap': 'butt' });
          L.bubTop = -bh / 2; L.bubBot = bh / 2;
          tcol = C.ink;
        } else if (d.style === 'stamp') {
          const bw = wmax + 2 * px, bh = h + 88;
          rect(gr, -bw / 2 + 12, -bh / 2 + 12, bw, bh, 18, C.ink);
          rect(gr, -bw / 2, -bh / 2, bw, bh, 18, C.ink, kcol, 10);
          rect(gr, -bw / 2 + 22, -bh / 2 + 22, bw - 44, bh - 44, 8, 'none', kcol, 4);
          L.tilt = typeof d.l.tilt === 'number' ? d.l.tilt : -8;
        } else if (d.plate) {
          const bw = wmax + 2 * px, bh = h + 2 * py;
          rect(gr, -bw / 2 + 12, -bh / 2 + 12, bw, bh, 22, C.ink);
          rect(gr, -bw / 2, -bh / 2, bw, bh, 22, C.lime, C.ink, 8);
          tcol = C.ink;
        } else if (d.style === 'label') {
          const bw = wmax + 2 * px, bh = h + 2 * py;
          L.band = rect(gr, -bw / 2, -bh / 2, bw, bh, 16, kcol === C.ink ? C.ink : kcol, null, 0);
          L.bandW = bw;
          L.bandX = -bw / 2;
          line(gr, -bw / 2, -bh / 2 + 10, bw / 2, -bh / 2 + 10, '#4A4A4A', 3, { 'stroke-linecap': 'butt' });
          line(gr, -bw / 2, bh / 2 - 10, bw / 2, bh / 2 - 10, '#4A4A4A', 3, { 'stroke-linecap': 'butt' });
          [-1, 1].forEach((sd) => circle(gr, sd * (bw / 2 - 24), 0, 9, dark ? C.ink : C.paper));
          tcol = C.paper;
          L.tilt = -2;
        }
        L.tcol = tcol;
        const lead = h / -2 + 0.72 * S_;
        rows.forEach((r, k) => {
          const rw = wf(r, S_);
          const rx = align === 'left' || inBubble && false ? -wmax / 2 : -rw / 2;
          const ry = lead + k * 0.97 * S_;
          const row = { str: r, x: inBubble ? -rw / 2 : rx, y: ry, w: rw, off: rows.slice(0, k).join('').length };
          if (d.style === 'label') row.shadow = text(gr, r.replace(/ /g, NB), row.x + 4, ry + 5, S_, '#6A6A6A', { spacing: f2(NSP * S_) });
          if (d.style !== 'label' && d.style !== 'stamp' && !inBubble && !d.plate && d.kc === 'red' && (bgk === 'lime' || bgk === 'paper')) row.shadow = text(gr, r.replace(/ /g, NB), row.x + S_ * 0.04, ry + S_ * 0.04, S_, C.ink, { spacing: f2(NSP * S_) });
          const hl = !(d.style === 'type' || d.style === 'label' || d.plate || inBubble);
          const re = /[\u2212+]?\d+(?:[,.]\d+)?(?:\u00A0(?:%|\u00F7\u00A0\d+(?:[,.]\d+)?))?/g;
          let m, last = 0, any = false; const parts = []; row.plates = [];
          if (hl) while ((m = re.exec(r))) { if (m.index > last) parts.push([r.slice(last, m.index), 0]); parts.push([m[0], 1]); last = m.index + m[0].length; any = true; }
          if (any) {
            if (last < r.length) parts.push([r.slice(last), 0]);
            const hf = bgk === 'lime' ? C.ink : bgk === 'red' ? C.paper : C.lime, ht = bgk === 'lime' ? C.lime : C.ink;
            let acc = '';
            for (const [ps, on] of parts) {
              if (on) { const pw = wf(ps, S_), px_ = row.x + wf(acc, S_); row.plates.push(rect(gr, px_ - 11, ry - 0.84 * S_, pw + 22, 1.0 * S_, 14, hf, C.ink, 6)); }
              acc += ps;
            }
            row.node = text(gr, '', row.x, ry, S_, tcol, { spacing: f2(NSP * S_) }); 
            for (const [ps, on] of parts) { const ts = sv('tspan', on ? { fill: ht } : {}, row.node); ts.textContent = ps.replace(/ /g, NB); }
          } else row.node = text(gr, r.replace(/ /g, NB), row.x, ry, S_, tcol, { spacing: f2(NSP * S_) });
          L.rows.push(row);
        });
        if (d.style === 'type' || d.style === 'label') {
          L.cursor = rect(gr, 0, 0, S_ * 0.34, S_ * 0.78, 0, d.style === 'label' ? C.paper : (inBubble ? C.ink : (dark ? C.lime : C.ink)));
        }
        // barre rouge « strike-lN »
        L.strikes = L.rows.map((r) => line(gr, r.x - 14, r.y - S_ * 0.28, r.x - 14, r.y - S_ * 0.28, C.red, 18));
        L.ts = ZV.cue(shot, 'strike-' + d.cue);
        // éclats d'impact (slam / stamp)
        if (d.style === 'slam' || d.style === 'stamp') {
          L.burst = [];
          const bgc = dark ? C.lime : (bgk === 'red' ? C.paper : C.ink);
          const rg = ZV.rng(7 + d.i * 13);
          for (let k = 0; k < 14; k++) L.burst.push({ n: line(gr, 0, 0, 0, 0, bgc, 10), a: (k / 14) * Math.PI * 2 + (rg() - 0.5) * 0.25, l: 36 + rg() * 40 });
          L.bgc = bgc;
        }
        return L;
      };

      if (bubbleLine) {
        const gy = y + 54 + ((bubRows.length - 1) * 0.97 * bubS + 0.72 * bubS) / 2;
        const L = mkLine(bubbleLine, bubS, bubRows, (bubRows.length - 1) * 0.97 * bubS + 0.72 * bubS, 0, 0, cx, gy, true);
        L.gy = gy; st.lines.push(L);
        y += bubH;
      }
      stack.forEach((d, k) => {
        const o = F_.out[k];
        y += o.py;
        const gy = y + o.h / 2;
        const rows = o.rows;
        const wmax = Math.max(...rows.map((r) => wf(r, o.S)));
        const gx = align === 'left' ? x0 + o.px + wmax / 2 : cx;
        const L = mkLine(d, o.S, rows, o.h, o.px, o.py, gx, gy, false);
        st.lines.push(L);
        y += o.h + o.py + 0.46 * S;
      });
      st.align = align;
      // recentrage progressif : à chaque nouvelle ligne, le bloc déjà visible glisse pour rester centré
      const ord = st.lines.slice().sort((a, b) => a.t0 - b.t0);
      let top = 1e9, bot = -1e9; st.steps = [];
      for (const L of ord) {
        const tp = L.bub ? L.gy + L.bubTop : L.gy - L.h / 2 - L.py, bt = L.bub ? L.gy + L.bubBot + 112 : L.gy + L.h / 2 + L.py;
        top = Math.min(top, tp); bot = Math.max(bot, bt);
        st.steps.push({ t: L.t0, c: (top + bot) / 2 });
      }
      st.cEnd = st.steps.length ? st.steps[st.steps.length - 1].c : 0;
      return st;
    },

    draw(st, t, shot) {
      const { bgk, dark } = st;
      drift(st.bd, t);
      if (st.wheel) st.wheel.setAttribute('transform', `translate(960 560) rotate(${f2(t * 24)})`);
      if (st.kicker) { const p = ZV.E.back(prog(t, 0.05, 0.3)); put(st.kicker.g, st.kicker.x, st.kicker.y, 0, p, p, t >= 0.05 ? 1 : 0); }
      if (st.ball) {
        const tb = ZV.cue(shot, 'ball-think');
        let rot = 0, dx = 0, dy = 0;
        const pp = ZV.E.back(prog(t, 0, 0.3));
        if (tb !== null && t >= tb) { const q = t - tb, dec = Math.exp(-q * 1.4); rot = 9 * Math.sin(q * 11) * dec + 3 * Math.sin(q * 5); dx = 12 * Math.sin(q * 5.5) * dec; dy = -6 * Math.abs(Math.sin(q * 5.5)) * dec; }
        put(st.ball.g, st.ball.x + dx, st.ball.y + dy, rot, pp, pp, 1);
        // bulle de pensée : trois cercles qui montent l'un après l'autre
        const kids = st.ball.trail;
        for (let k = 0; k < kids.length; k++) { const q = tb === null ? 0 : ZV.E.back(prog(t, tb + 0.06 + k * 0.1, tb + 0.06 + k * 0.1 + 0.2)); const c = kids[k]; c.setAttribute('visibility', q > 0.01 ? 'visible' : 'hidden'); c.setAttribute('transform', `translate(${f2(parseFloat(c.getAttribute('cx')) * (1 - q))} ${f2(parseFloat(c.getAttribute('cy')) * (1 - q))}) scale(${f2(q)})`); }
      }
      let cNow = st.cEnd;
      if (st.steps.length) {
        cNow = st.steps[0].c;
        for (let i = 1; i < st.steps.length; i++) { const q = ZV.E.out3(clamp((t - st.steps[i].t) / 0.35)); if (q > 0) cNow = lerp(st.steps[i - 1].c, st.steps[i].c, q); }
      }
      const dy0 = st.cEnd - cNow;
      for (const L of st.lines) {
        const tt = t - L.t0, W = st.W;
        const gr = L.g;
        if (tt < 0) {
          if (L.style === 'type' && !L.bub && L.cursor) {   // curseur qui clignote en attendant la frappe
            gr.setAttribute('visibility', 'visible'); put(gr, L.gx, L.gy + dy0, 0, 1, 1, 1);
            for (const row of L.rows) { row.node.textContent = ''; if (row.shadow) row.shadow.textContent = ''; }
            L.cursor.setAttribute('visibility', Math.floor(t / 0.28) % 2 === 0 ? 'visible' : 'hidden');
            L.cursor.setAttribute('x', f2(L.rows[0].x + L.S * 0.06)); L.cursor.setAttribute('y', f2(L.rows[0].y - L.S * 0.74));
          } else gr.setAttribute('visibility', 'hidden');
          continue;
        }
        gr.setAttribute('visibility', 'visible');
        let x = L.gx, y = L.gy + dy0, r = 0, s = 1, o = 1;
        const dur4 = 4 * FR;
        if (L.style === 'slam') {
          const p = clamp(tt / dur4); s = lerp(2.4, 1, ZV.E.out3(p));
          const [sx, sy] = ZV.shakeAt(tt, dur4, 12, 0.4); x += sx; y += sy;
        } else if (L.style === 'pop') {
          const p = clamp(tt / (8 * FR)); s = lerp(0.35, 1, ZV.E.back(p)); r = lerp(-4, 0, ZV.E.out3(p));
        } else if (L.style === 'stack') {
          const p = clamp(tt / 0.55); y -= (1 - ZV.E.bounce(p)) * (L.gy + dy0 + 160);
          s = 1;
        } else if (L.style === 'stamp') {
          const p = clamp(tt / (5 * FR)); s = lerp(2.6, 1, ZV.E.in2(p)); r = L.tilt + lerp(-5, 0, p);
          const [sx, sy] = ZV.shakeAt(tt, 5 * FR, 14, 0.4); x += sx; y += sy;
        } else if (L.style === 'label') {
          r = L.tilt;
          const p = clamp(tt / 0.2); L.band.setAttribute('width', f2(L.bandW * ZV.E.out3(p)));
        } else if (L.bub) {
          const p = clamp(tt / (8 * FR)); s = lerp(0.4, 1, ZV.E.back(p)); r = lerp(-5, 0, p);
        }
        // mise à plat de l'éventuelle bulle : pas de rotation, bulle pop
        put(gr, x, y, r, s, s, o);
        // frappe lettre à lettre
        if (L.style === 'type' || L.style === 'label') {
          const natural = L.n * 2 * FR * (L.style === 'label' ? 1.4 : 1);
          const tdur = Math.max(0.45, Math.min(natural, L.win - (L.style === 'label' ? 0.45 : 0.3)));
          const t1 = L.style === 'label' ? 0.2 : (L.bub ? 8 * FR : 0);
          const q = clamp((tt - t1) / tdur);
          const k = Math.floor(q * L.n + 1e-6);
          let curX = null, curY = 0;
          for (const row of L.rows) {
            const m = clamp(k - row.off, 0, row.str.length);
            const sub = row.str.slice(0, m);
            row.node.textContent = sub.replace(/ /g, NB);
            if (row.shadow) row.shadow.textContent = sub.replace(/ /g, NB);
            if (m > 0 || curX === null) { curX = row.x + (m ? W(sub, L.S, { sp: NSP }) : 0); curY = row.y; }
          }
          if (L.style === 'label') { const jit = Math.sin(k * 12.9) * 1.8; for (const row of L.rows) { row.node.setAttribute('dy', f2(jit)); } }
          if (L.cursor) {
            const blink = q < 1 ? true : Math.floor((tt - t1 - tdur) / 0.28) % 2 === 0;
            L.cursor.setAttribute('visibility', blink && tt >= t1 ? 'visible' : 'hidden');
            L.cursor.setAttribute('x', f2((curX === null ? L.rows[0].x : curX) + L.S * 0.06));
            L.cursor.setAttribute('y', f2(curY - L.S * 0.74));
          }
        }
        // éclats d'impact
        if (L.burst) {
          const ti = tt - (L.style === 'stamp' ? 5 * FR : dur4), on = ti >= 0 && ti < 0.24;
          const rx = L.w / 2 + L.px + 30, ry = L.h / 2 + L.py + 24;
          const e = ZV.E.out3(clamp(ti / 0.24));
          for (const b of L.burst) {
            if (!on) { b.n.setAttribute('visibility', 'hidden'); continue; }
            const c = Math.cos(b.a), sn = Math.sin(b.a), k0 = 1 + 0.08 + 0.35 * e, len = b.l * (1 - e * 0.85);
            b.n.setAttribute('visibility', 'visible');
            b.n.setAttribute('x1', f2(c * rx * k0)); b.n.setAttribute('y1', f2(sn * ry * k0));
            b.n.setAttribute('x2', f2(c * (rx * k0 + len))); b.n.setAttribute('y2', f2(sn * (ry * k0 + len)));
          }
        }
        // barré
        if (L.ts !== null) {
          const p = ZV.E.out2(prog(t, L.ts, L.ts + 6 * FR));
          L.rows.forEach((row, k) => {
            const ln = L.strikes[k], xa = row.x - 18, xb = row.x + row.w + 18;
            ln.setAttribute('x2', f2(lerp(xa, xb, p)));
            ln.setAttribute('x1', f2(xa));
            const yy = row.y - L.S * 0.28;
            ln.setAttribute('y1', f2(yy + 6)); ln.setAttribute('y2', f2(yy + 6 - 12 * p));
            ln.setAttribute('visibility', p > 0 ? 'visible' : 'hidden');
            const dm = p >= 1 ? 0.55 : 1; row.node.setAttribute('opacity', dm); if (row.plates) for (const pl of row.plates) pl.setAttribute('opacity', dm);
          });
        } else L.strikes.forEach((ln) => ln.setAttribute('visibility', 'hidden'));
      }
    }
  });
})();
;
/* ==== tools/video/composition/components/last-numbers.js ==== */
// Composant « last-numbers » : l'afficheur des derniers numéros au-dessus de la table (1920×1080).
// Boîtier ink bordé paper 8 px, colonne de 12 numéros (rouges à droite, noirs à gauche, zéro au centre) qui défile à chaque bip,
// descente depuis le haut (drop), tampon, balayage « intuition », pile de mises avec flèche rouge, barré, sortie du cadre.
// Fonction pure du temps ; les numéros sont illustratifs.
(() => {
  'use strict';
  const { C, E, clamp, prog, lerp, f2, sv, g, rect, circle, text, put, shakeAt, colorOf } = ZV;
  const ROWS = 12, PITCH = 54, BW = 520, TOP = 40, HEAD = 92, ROW0 = TOP + HEAD;       // en repère local (origine : centre du boîtier)
  const BH = HEAD + ROWS * PITCH + 24;
  const rowY = (r) => ROW0 + r * PITCH + PITCH / 2;

  ZV.define('last-numbers', {
    init(root, shot) {
      const p = shot.props || {};
      const cue = (n) => ZV.cue(shot, n);
      const st = { p, dur: shot.dur };
      rect(root, 0, 0, 1920, 1080, 0, C.ink);
      const nums = (Array.isArray(p.numbers) && p.numbers.length ? p.numbers : [26, 4, 33, 15, 20, 11, 8, 35, 2, 17, 6, 31]).slice(0, ROWS);
      while (nums.length < ROWS) nums.push(nums[nums.length % Math.max(1, nums.length)] || 0);
      st.nums = nums;
      st.cx = p.mises ? 640 : 960;
      st.tDrop = cue('drop'); st.tFill = cue('fill'); st.tStamp = cue('stamp'); st.tInt = cue('intuition');
      st.tMises = cue('mises-up'); st.tStrike = cue('strike'); st.tExit = cue('exit');

      /* ---- boîtier ---- */
      st.board = g(root);
      const b = st.board;
      for (const dx of [-170, 170]) {                                         // fils de suspension
        rect(b, dx - 18, -1200, 36, 1200 + TOP + 20, 6, C.ink, C.paper, 6);
      }
      rect(b, -BW / 2 + 14, TOP + 14, BW, BH, 24, C.lime);                     // ombre dure
      rect(b, -BW / 2, TOP, BW, BH, 24, C.ink, C.paper, 8);
      text(b, 'DERNIERS NUMÉROS', 0, TOP + 56, 28, C.paper, { anchor: 'middle', mono: true, len: 330 });
      st.led = [circle(b, -BW / 2 + 44, TOP + 46, 11, C.lime), circle(b, BW / 2 - 44, TOP + 46, 11, C.lime)];
      sv('line', { x1: -BW / 2 + 28, x2: BW / 2 - 28, y1: ROW0 - 6, y2: ROW0 - 6, stroke: C.paper, 'stroke-width': 4, 'stroke-linecap': 'round', opacity: 0.8 }, b);
      for (let r = 1; r < ROWS; r++) sv('line', { x1: -BW / 2 + 40, x2: BW / 2 - 40, y1: ROW0 + r * PITCH, y2: ROW0 + r * PITCH, stroke: C.paper, 'stroke-width': 2, opacity: 0.22 }, b);
      // lignes : défilent dans une fenêtre découpée
      const cid = 'zvl-' + String(shot.id || 'x').replace(/[^\w-]/g, '');
      const defs = sv('defs', null, b);
      sv('rect', { x: -BW / 2 + 12, y: ROW0 - 2, width: BW - 24, height: ROWS * PITCH + 4 }, sv('clipPath', { id: cid }, defs));
      const rows = g(b, { 'clip-path': `url(#${cid})` });
      st.rows = [];
      for (let i = 0; i < ROWS; i++) {
        const rg = g(rows);
        const bg = rect(rg, -75, -22, 150, 44, 12, C.pocket, C.paper, 4);
        const tx = text(rg, '', 0, 13, 36, C.white, { anchor: 'middle', mono: true });
        st.rows.push({ rg, bg, tx });
      }
      // balayage « intuition »
      st.scan = rect(b, -BW / 2 + 20, 0, BW - 40, PITCH - 6, 12, 'none', C.lime, 8, { visibility: 'hidden' });
      st.qs = [0, 1, 2].map((i) => {
        const q = g(b);
        circle(q, 0, 0, 34, C.lime, C.ink, 6);
        text(q, '?', 0, 17, 48, C.ink, { anchor: 'middle', mono: true });
        return q;
      });
      // barré (croix rouge)
      st.xs = [];
      for (const dir of [1, -1]) {
        const grp = g(b);
        const y1 = TOP + 150 + (dir < 0 ? BH - 190 : 0), y2 = TOP + 150 + (dir < 0 ? 0 : BH - 190);
        const mk = (col, w) => sv('line', { x1: -BW / 2 + 36, y1, x2: -BW / 2 + 36, y2: y1, stroke: col, 'stroke-width': w, 'stroke-linecap': 'round' }, grp);
        st.xs.push({ grp, a: mk(C.ink, 34), b: mk(C.red, 20), x1: -BW / 2 + 36, y1, x2: BW / 2 - 36, y2 });
      }

      /* ---- tampon (cue `stamp`) ---- */
      st.stamp = null;
      if (st.tStamp != null && p.stamp) {
        const sg = g(root), inner = g(sg);
        const words = String(p.stamp).split(' ');
        const half = Math.ceil(words.length / 2);
        const lines = words.length > 2 ? [words.slice(0, half - 1 + (words.length > 3 ? 0 : 0)).join(' '), words.slice(half - 1).join(' ')] : [String(p.stamp)];
        const l = lines.length === 2 ? [words.slice(0, 2).join(' '), words.slice(2).join(' ')] : lines;
        const fs = 78, lw = Math.max(...l.map((x) => x.length)) * fs * 0.6, w = lw + 90, h = l.length * fs * 1.05 + 50;
        rect(inner, -w / 2 + 14, -h / 2 + 14, w, h, 18, C.ink);
        rect(inner, -w / 2, -h / 2, w, h, 18, C.red, C.ink, 9);
        rect(inner, -w / 2 + 14, -h / 2 + 14, w - 28, h - 28, 10, 'none', C.ink, 4);
        l.forEach((ln, i) => text(inner, ln, 0, -h / 2 + 25 + fs * 0.86 + i * fs * 1.05, fs, C.ink, { anchor: 'middle', len: Math.round(ln.length * fs * 0.6) }));
        st.stamp = sg;
      }

      /* ---- pile de mises (option) ---- */
      st.pile = null;
      if (p.mises) {
        const px = 1340, gy = 800;
        const pg = g(root);
        sv('line', { x1: px - 130, x2: px + 130, y1: gy + 4, y2: gy + 4, stroke: C.paper, 'stroke-width': 8, 'stroke-linecap': 'round' }, pg);
        const chips = [];
        for (let i = 0; i < 16; i++) {
          const cg = g(pg);
          rect(cg, -75 + 7, -12 + 7, 150, 26, 8, C.ink);
          rect(cg, -75, -12, 150, 26, 8, C.white, C.ink, 5);
          rect(cg, -48, -12, 22, 26, 0, C.lime);
          rect(cg, 26, -12, 22, 26, 0, C.lime);
          rect(cg, -75, -12, 150, 26, 8, 'none', C.ink, 5);
          chips.push(cg);
        }
        const ag = g(pg);
        const shaft = rect(ag, -17, -300, 34, 300, 6, C.red, C.ink, 7);
        const head = sv('path', { d: 'M-52 0L0 -76L52 0Z', fill: C.red, stroke: C.ink, 'stroke-width': 7, 'stroke-linejoin': 'round' }, ag);
        const lab = text(pg, 'MISES', px, gy + 56, 34, C.paper, { mono: true, anchor: 'middle' });
        st.pile = { pg, chips, ag, shaft, head, lab, px, gy };
      }
      return st;
    },

    update(st, t, shot) {
      const p = st.p;
      /* ---- entrée / sortie du boîtier ---- */
      let by = 0;
      if (st.tDrop != null) {
        const a = t - st.tDrop;
        if (a < 0) by = -1500;
        else if (a < 0.28) by = -1500 * (1 - E.in3(a / 0.28));
        else by = -24 * Math.sin(Math.PI * clamp((a - 0.28) / 0.22)) * (1 - clamp((a - 0.28) / 0.22));
      }
      if (st.tExit != null) {
        const d = Math.min(0.3, Math.max(0.12, st.dur - st.tExit - 0.02));
        by += -1500 * E.in3(prog(t, st.tExit, st.tExit + d));
      }
      const [shx, shy] = st.tDrop != null && t >= st.tDrop + 0.28 ? shakeAt(t, st.tDrop + 0.28, 8, 0.3) : [0, 0];
      st.board.setAttribute('transform', `translate(${f2(st.cx + shx)} ${f2(by + shy)})`);

      /* ---- les 12 lignes : défilement à chaque bip ---- */
      const nums = st.nums;
      let m = ROWS, slide = 1, lastBeep = -9;
      if (st.tFill != null) {
        const gap = clamp((st.dur - st.tFill - 0.3) / ROWS, 0.06, 0.2);
        const u = (t - st.tFill) / gap;
        m = u < 0 ? 0 : Math.min(ROWS, Math.floor(u) + 1);
        const tk = st.tFill + (m - 1) * gap;
        slide = m === 0 ? 1 : E.out3(prog(t, tk, tk + Math.min(0.09, gap)));
        lastBeep = m === 0 ? -9 : tk;
      }
      for (let r = 0; r < ROWS; r++) {
        const o = st.rows[r];
        const on = r < m;
        o.rg.setAttribute('visibility', on ? 'visible' : 'hidden');
        if (!on) continue;
        const n = nums[ROWS - m + r];
        const c = colorOf(n);
        const x = c === 'red' ? 105 : c === 'black' ? -105 : 0;
        const y = rowY(r) - PITCH * (1 - slide) * (st.tFill != null && m < ROWS + 1 ? 1 : 0);
        o.rg.setAttribute('transform', `translate(${x} ${f2(y)})`);
        o.bg.setAttribute('fill', c === 'red' ? C.red : c === 'lime' ? C.lime : C.pocket);
        o.bg.setAttribute('stroke', c === 'black' ? C.paper : C.ink);
        o.tx.setAttribute('fill', c === 'black' ? C.white : C.ink);
        o.tx.textContent = String(n);
      }
      // le bip : les deux voyants s'allument
      const beep = lastBeep > -9 ? 1 - prog(t, lastBeep, lastBeep + 0.08) : 0;
      st.led.forEach((l) => l.setAttribute('r', f2(11 + 5 * beep)));

      /* ---- balayage « intuition » ---- */
      const ti = st.tInt;
      if (ti != null) {
        const q = prog(t, ti, ti + 1.1);
        const r = q * (ROWS - 1);
        st.scan.setAttribute('visibility', t >= ti && t < ti + 1.5 ? 'visible' : 'hidden');
        st.scan.setAttribute('y', f2(ROW0 + Math.floor(r) * PITCH + 3));
        st.qs.forEach((qn, i) => {
          const qq = prog(t, ti + 0.15 + i * 0.28, ti + 0.15 + i * 0.28 + 0.25);
          const gone = t > ti + 1.5;
          const s = gone ? 0 : (qq > 0 ? E.back(qq) : 0);
          put(qn, BW / 2 + 56 + (i % 2) * 34, ROW0 + 90 + i * 190 + Math.sin(t * 7 + i) * 4, (i - 1) * 7, s, s, s > 0 ? 1 : 0);
        });
      } else { st.scan.setAttribute('visibility', 'hidden'); st.qs.forEach((qn) => put(qn, 0, 0, 0, 0, 0, 0)); }

      /* ---- barré : deux traits rouges tracés en 6 i chacun ---- */
      st.xs.forEach((o, i) => {
        const q = st.tStrike == null ? 0 : E.out3(prog(t, st.tStrike + i * 0.1, st.tStrike + i * 0.1 + 0.2));
        o.grp.setAttribute('visibility', q > 0 ? 'visible' : 'hidden');
        for (const ln of [o.a, o.b]) { ln.setAttribute('x2', f2(lerp(o.x1, o.x2, q))); ln.setAttribute('y2', f2(lerp(o.y1, o.y2, q))); }
      });

      /* ---- tampon ---- */
      if (st.stamp) {
        const a = t - st.tStamp;
        const k = prog(t, st.tStamp, st.tStamp + 5 / 30);
        const sc = lerp(2.6, 1, E.out3(k));
        const [dx, dy] = shakeAt(t, st.tStamp + 5 / 30, 14, 0.4);
        put(st.stamp, st.cx + 70 + dx, 440 + dy, -8, a < 0 ? 0 : sc, a < 0 ? 0 : sc, a < 0 ? 0 : clamp(k * 4));
      }

      /* ---- pile de mises ---- */
      if (st.pile) {
        const pl = st.pile;
        const t0 = st.tDrop == null ? 0 : st.tDrop + 0.5;
        const appear = st.tDrop == null ? 1 : E.back(prog(t, t0, t0 + 0.3));
        const up = st.tMises == null ? 0 : E.io2(prog(t, st.tMises, st.tMises + Math.min(1.3, Math.max(0.5, st.dur - st.tMises - 0.1))));
        const c = 2 + 13 * up;
        pl.pg.setAttribute('visibility', appear > 0 ? 'visible' : 'hidden');
        pl.chips.forEach((cg, i) => {
          const born = i < 2 ? 1 : clamp(c - i);
          const s = i < 2 ? Math.max(appear, 0) : (born > 0 && appear > 0 ? E.back(born) : 0);
          put(cg, pl.px, pl.gy - 13 - i * 24, (i % 2 ? 1.5 : -1.5), s, s, s > 0 ? 1 : 0);
        });
        const q = st.tMises == null ? 0 : prog(t, st.tMises, st.tMises + 0.3);
        const hgt = 24 * (c - 2) + 60;
        pl.ag.setAttribute('transform', `translate(${pl.px + 170} ${pl.gy - 6})`);
        pl.shaft.setAttribute('y', f2(-hgt)); pl.shaft.setAttribute('height', f2(hgt));
        pl.head.setAttribute('transform', `translate(0 ${f2(-hgt)})`);
        pl.ag.setAttribute('visibility', q > 0 ? 'visible' : 'hidden');
      }
    }
  });
})();
;
/* ==== tools/video/composition/components/ldw-meter.js ==== */
// Composant `ldw-meter` : « une perte déguisée en gain » (Waterloo / Dixon). Un seul écran, deux lectures.
// À gauche, l'écran de machine en fanfare (lime / rouge clignotants, ligne gagnante, haut-parleur) ; à droite, le compteur de crédits sobre (paper, ink).
// Cues : bet, spin, win, count (×2), net, honest. Aucun dégradé, flou, lueur ni filter.
(() => {
  'use strict';
  const { C, E, clamp, prog, lerp, f2, sv, g, rect, circle, path, line, text, put, rng, fr } = ZV;
  let UID = 0;
  const SY = ['cherry', 'seven', 'bar', 'lemon'];
  const FINAL = [['bar', 'lemon', 'seven', 'lemon', 'bar'], ['cherry', 'cherry', 'cherry', 'lemon', 'bar'], ['lemon', 'bar', 'lemon', 'seven', 'lemon']];
  const INIT = [['lemon', 'bar', 'cherry', 'seven', 'lemon'], ['bar', 'cherry', 'lemon', 'cherry', 'bar'], ['seven', 'lemon', 'bar', 'lemon', 'cherry']];
  const SX = 50, SY0 = 90, SW = 860, SH = 650;
  const CW = 150, CH = 140, GAP = 8, GX = SX + (SW - (5 * CW + 4 * GAP)) / 2, GY = 165;
  const BX = 109, BY = 625, BW = 782, BH = 95;
  const NB = ' ', MINUS = '−';
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const hash = (a, b, c) => (Math.imul(a + 1, 73856093) ^ Math.imul(b + 1, 19349663) ^ Math.imul(c + 1, 83492791)) >>> 0;

  function drawSym(gg, name) {
    if (name === 'cherry') {
      path(gg, 'M-22 12 Q-18 -30 8 -48', 'none', C.ink, 7);
      path(gg, 'M26 20 Q24 -26 8 -48', 'none', C.ink, 7);
      path(gg, 'M8 -48 Q34 -70 56 -42 Q30 -30 8 -48Z', C.lime, C.ink, 5);
      circle(gg, -24, 24, 25, C.red, C.ink, 6); circle(gg, 28, 32, 25, C.red, C.ink, 6);
      circle(gg, -33, 15, 6, C.paper); circle(gg, 19, 23, 6, C.paper);
    } else if (name === 'seven') {
      const sh = text(gg, '7', 6, 58, 150, C.ink, { anchor: 'middle' });
      sh.setAttribute('stroke', C.ink); sh.setAttribute('stroke-width', 9); sh.setAttribute('stroke-linejoin', 'round');
      const t7 = text(gg, '7', 0, 52, 150, C.red, { anchor: 'middle' });
      t7.setAttribute('stroke', C.ink); t7.setAttribute('stroke-width', 9); t7.setAttribute('stroke-linejoin', 'round'); t7.setAttribute('paint-order', 'stroke');
    } else if (name === 'bar') {
      rect(gg, -68 + 6, -27 + 7, 136, 54, 8, C.red);
      rect(gg, -68, -27, 136, 54, 8, C.ink, C.ink, 6);
      rect(gg, -60, -19, 120, 38, 4, 'none', C.paper, 3);
      text(gg, 'BAR', 0, 12, 34, C.paper, { anchor: 'middle', len: 92 });
    } else {
      const lg = g(gg, { transform: 'rotate(-14)' });
      path(lg, 'M-64 0 Q-44 -44 0 -42 Q44 -44 64 0 Q44 44 0 42 Q-44 44 -64 0Z', C.lime, C.ink, 6);
      path(lg, 'M-30 -14 Q-10 -28 16 -26', 'none', C.paper, 6);
      circle(lg, -62, 0, 6, C.ink); circle(lg, 62, 0, 6, C.ink);
    }
  }

  ZV.define('ldw-meter', {
    init(root, shot) {
      const p = shot.props || {};
      const beats = Array.isArray(shot.beats) ? shot.beats : [];
      const dur = isNum(shot.dur) && shot.dur > 0 ? shot.dur : 8;
      const cueL = (n) => beats.filter((b) => b && b.do === 'cue' && b.name === n && isNum(b.t)).sort((a, b) => a.t - b.t);
      const num = (v, d) => (v != null && isNum(+v) ? +v : d);
      const credit0 = num(p.credit, 100), stake = num(p.stake, 2), win = num(p.win, 0.8);
      const lines = Math.max(1, Math.round(num(p.lines, 20)));
      const cur = typeof p.currency === 'string' ? p.currency : '€';
      const uid = ++UID;
      const st = { uid, dur, credit0, stake, win, lines, cur };
      const money = (v) => { const a = Math.abs(Math.round(v * 100) / 100); const s = a.toFixed(2).split('.'); return (v < 0 ? MINUS : '') + fr(+s[0]) + ',' + s[1] + NB + cur; };
      st.money = money;
      st.tb = (cueL('bet')[0] || {}).t; st.ts = (cueL('spin')[0] || {}).t; st.tw = (cueL('win')[0] || {}).t;
      const cc = cueL('count'); st.tc1 = cc.length ? cc[0].t : null; st.tc2 = cc.length > 1 ? cc[1].t : (cc.length ? cc[0].t + 0.9 : null);
      st.tn = (cueL('net')[0] || {}).t; st.th = (cueL('honest')[0] || {}).t;

      rect(root, 0, 0, 1920, 1080, 0, C.ink);
      const bgs = g(root, { transform: 'rotate(-18 960 540)' });
      for (let k = -4; k <= 4; k++) rect(bgs, 960 + k * 300 - 70, -600, 140, 2300, 0, C.pocket);
      const defs = sv('defs', null, root);
      SY.forEach((n) => drawSym(g(defs, { id: `lw${uid}-${n}` }), n));
      const clip = sv('clipPath', { id: `lw${uid}-clip` }, defs);
      rect(clip, GX, GY, 5 * CW + 4 * GAP, 3 * CH + 2 * GAP, 0, '#000');

      /* ---- écran de machine (gauche) ---- */
      st.shadow = rect(root, SX + 16, SY0 + 16, SW, SH, 28, C.pocket);
      st.bezel = rect(root, SX, SY0, SW, SH, 28, C.pocket, C.paper, 8);
      text(root, `${lines} LIGNES`, SX + 40, 140, 30, C.paper, { mono: true, weight: 700, spacing: 2 });
      st.mise = text(root, `MISE${NB}${money(stake)}`, SX + 820, 140, 30, C.paper, { mono: true, weight: 700, anchor: 'end' });
      const gridG = g(root, { 'clip-path': `url(#lw${uid}-clip)` });
      st.cells = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) {
        const x = GX + c * (CW + GAP), y = GY + r * (CH + GAP);
        const cg = g(gridG);
        rect(cg, x, y, CW, CH, 12, C.paper, C.ink, 4);
        const hl = rect(cg, x + 4, y + 4, CW - 8, CH - 8, 9, C.lime); hl.setAttribute('visibility', 'hidden');
        const sg = g(cg, { transform: `translate(${x + CW / 2} ${y + CH / 2}) scale(0.78)` });
        const inner = g(sg);
        const u = [0, 1, 2].map(() => sv('use', { href: `#lw${uid}-cherry` }, inner));
        const veil = rect(cg, x, y, CW, CH, 12, C.ink, null, 0, { opacity: 0 });
        st.cells.push({ r, c, inner, u, hl, veil });
      }
      // ligne gagnante (rangée du milieu, 3 cases)
      const ly = GY + CH + GAP + CH / 2, lx0 = GX + 6, lx1 = GX + 3 * CW + 2 * GAP - 6;
      st.wl0 = sv('path', { d: `M${lx0} ${ly}L${lx1} ${ly}`, fill: 'none', stroke: C.ink, 'stroke-width': 22, 'stroke-linecap': 'round', pathLength: 1, visibility: 'hidden' }, root);
      st.wl1 = sv('path', { d: `M${lx0} ${ly}L${lx1} ${ly}`, fill: 'none', stroke: C.red, 'stroke-width': 11, 'stroke-linecap': 'round', pathLength: 1, visibility: 'hidden' }, root);
      // bandeau de gain
      st.banner = rect(root, BX, BY, BW, BH, 14, C.pocket, C.paper, 4);
      st.idle = text(root, 'BONNE CHANCE', BX + BW / 2, BY + 62, 40, C.paper, { anchor: 'middle', mono: true, weight: 700, spacing: 6 });
      st.idle.setAttribute('opacity', 0.55);
      st.gain = text(root, `GAIN${NB}${money(win)}`, BX + BW / 2, BY + 71, 72, C.ink, { anchor: 'middle', len: 640 });
      st.gain.setAttribute('visibility', 'hidden');
      // voile de coupure + barré
      st.dim = rect(root, SX, SY0, SW, SH, 28, C.ink, null, 0, { opacity: 0 });
      st.sk0 = sv('line', { x1: BX - 14, y1: BY + BH - 6, x2: BX + BW + 14, y2: BY + 6, stroke: C.ink, 'stroke-width': 30, 'stroke-linecap': 'round', visibility: 'hidden' }, root);
      st.sk1 = sv('line', { x1: BX - 14, y1: BY + BH - 6, x2: BX + BW + 14, y2: BY + 6, stroke: C.red, 'stroke-width': 16, 'stroke-linecap': 'round', visibility: 'hidden' }, root);
      // étincelles autour de l'écran
      const rr = rng(909);
      st.sparks = [];
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2 + rr() * 0.3;
        const ex = SX + SW / 2 + Math.cos(a) * (SW / 2 + 22 + rr() * 30), ey = SY0 + SH / 2 + Math.sin(a) * (SH / 2 + 22 + rr() * 26);
        const n = sv('path', { d: 'M0 -1L0.3 -0.3L1 0L0.3 0.3L0 1L-0.3 0.3L-1 0L-0.3 -0.3Z', fill: [C.lime, C.paper, C.red][i % 3], stroke: C.ink, 'stroke-width': 3, 'stroke-linejoin': 'round', visibility: 'hidden' }, root);
        n.setAttribute('vector-effect', 'non-scaling-stroke');
        st.sparks.push({ n, x: Math.min(Math.max(ex, 40), 1040), y: Math.min(Math.max(ey, 50), 800), sz: 18 + rr() * 22, ph: rr(), rot: rr() * 90 });
      }
      // haut-parleur plat
      st.spk = g(root, { transform: 'translate(975 300)' });
      rect(st.spk, -46, -24, 34, 48, 6, C.paper, C.ink, 5);
      path(st.spk, 'M-14 -26 L24 -58 L24 58 L-14 26Z', C.paper, C.ink, 5);
      st.waves = [0, 1, 2].map((k) => {
        const r = 52 + k * 26, a = 0.7;
        return path(st.spk, `M${f2(34 + r * Math.sin(-a) * 0.0)} 0`, 'none', C.lime, 9);
      });
      st.waves.forEach((w, k) => { const r = 40 + k * 24; w.setAttribute('d', `M${f2(26 + r * Math.cos(-0.7))} ${f2(r * Math.sin(-0.7))}A${r} ${r} 0 0 1 ${f2(26 + r * Math.cos(0.7))} ${f2(r * Math.sin(0.7))}`); });

      /* ---- compteur sobre (droite) + calcul + tampon ---- */
      const mkLine = (lab, y) => ({
        l: text(root, lab, 1130, y, 54, C.paper, { mono: true, weight: 800 }),
        a: text(root, '', 1830, y, 54, C.paper, { mono: true, weight: 800, anchor: 'end' })
      });
      st.l1 = mkLine('MISÉ', 478); st.l2 = mkLine('REÇU', 556);
      st.rule = line(root, 1130, 592, 1830, 592, C.paper, 6, { 'stroke-linecap': 'butt' });
      st.stamp = g(root);
      rect(st.stamp, -330, -78, 660, 156, 18, 'none', C.red, 12);
      st.stampT = text(st.stamp, `${money(win - stake)}`, 0, 42, 118, C.red, { anchor: 'middle', len: 560 });
      // carte crédit (s'étend en plein cadre au cue `honest`)
      st.cardS = rect(root, 1126, 106, 740, 300, 14, C.pocket);
      st.card = rect(root, 1110, 90, 740, 300, 14, C.paper, C.ink, 6);
      st.frameIn = rect(root, 60, 60, 1800, 960, 0, 'none', C.ink, 6, { opacity: 0 });
      st.cLab = text(root, 'CRÉDIT', 1480, 150, 30, C.ink, { anchor: 'middle', mono: true, weight: 800, spacing: 8 });
      st.cNum = text(root, '', 1480, 330, 130, C.ink, { anchor: 'middle', mono: true, weight: 800 });
      st.title = text(root, 'LE SEUL TÉMOIN HONNÊTE', 960, 250, 92, C.ink, { anchor: 'middle', len: 1380 });
      st.title.setAttribute('visibility', 'hidden');

      /* ---- crédit : événements séquentiels ---- */
      const ev = [];
      if (st.tb != null) ev.push({ t0: st.tb, t1: st.tb + 0.7, d: -stake });
      if (st.tw != null) ev.push({ t0: st.tw + 0.4, t1: st.tw + 1.0, d: win });
      if (st.th != null) { const t0 = st.th + 0.5; ev.push({ t0, t1: Math.max(dur, t0 + 1), rate: stake / 8 }); }
      ev.sort((a, b) => a.t0 - b.t0);
      let cur2 = credit0;
      for (const e of ev) { e.from = cur2; e.to = e.rate != null ? Math.max(0, cur2 - e.rate * (e.t1 - e.t0)) : cur2 + e.d; cur2 = e.to; }
      st.ev = ev;
      return st;
    },

    update(st, t) {
      const { tb, ts, tw, tn, th } = st;
      /* ---- crédit ---- */
      let cr = st.credit0;
      for (const e of st.ev) {
        if (t >= e.t1) cr = e.to;
        else { if (t > e.t0) cr = lerp(e.from, e.to, (t - e.t0) / (e.t1 - e.t0)); break; }
      }
      const crT = st.money(cr);
      if (st.cNum.textContent !== crT) st.cNum.textContent = crT;

      /* ---- grille ---- */
      for (const cell of st.cells) {
        const { r, c } = cell;
        let spinning = false, sym = FINAL[r][c], dy = 0;
        if (ts != null) {
          const stopAt = ts + 0.6 + 0.17 * c;
          if (t < ts) sym = INIT[r][c];
          else if (t < stopAt) { spinning = true; const q = t * 5 + c * 0.37; sym = SY[hash(c, r, Math.floor(q)) % 4]; dy = (q - Math.floor(q) - 0.5) * 56; }
          else { const w = t - stopAt; dy = w < 0.4 ? 16 * Math.exp(-9 * w) * Math.sin(2 * Math.PI * 3 * w) : 0; }
        }
        const href = `#lw${st.uid}-${sym}`;
        for (let q = 0; q < 3; q++) setA(cell.u[q], 'href', href);
        setA(cell.inner, 'transform', `translate(0 ${f2(dy)})`);
        setA(cell.u[0], 'visibility', spinning ? 'visible' : 'hidden'); setA(cell.u[1], 'visibility', spinning ? 'visible' : 'hidden');
        if (spinning) { setA(cell.u[0], 'transform', 'translate(0 -36)'); setA(cell.u[1], 'transform', 'translate(0 36)'); setA(cell.u[0], 'opacity', 0.5); setA(cell.u[1], 'opacity', 0.5); }
      }

      /* ---- fanfare ---- */
      const winShown = tw != null && t >= tw;
      const net = tn != null && t >= tn;
      const live = winShown && !net;
      const blink = live ? Math.floor((t - tw) * 2.5) % 2 === 0 : false;
      setA(st.shadow, 'fill', live ? (blink ? C.lime : C.red) : C.pocket);
      setA(st.bezel, 'stroke', live ? (blink ? C.lime : C.paper) : C.paper);
      for (const cell of st.cells) {
        const inWin = cell.r === 1 && cell.c < 3 && winShown;
        setA(cell.hl, 'visibility', inWin ? 'visible' : 'hidden');
        if (inWin) setA(cell.hl, 'fill', live && !blink ? C.white : C.lime);
        setA(cell.veil, 'opacity', winShown && !inWin ? 0.6 : 0);
      }
      const lp = winShown ? E.out3(prog(t, tw + 0.1, tw + 0.45)) : 0;
      for (const n of [st.wl0, st.wl1]) { setA(n, 'visibility', lp > 0 ? 'visible' : 'hidden'); setA(n, 'stroke-dasharray', `${f2(lp)} 1.01`); }
      setA(st.banner, 'fill', live ? (blink ? C.lime : C.red) : C.pocket);
      setA(st.banner, 'stroke', live ? C.ink : C.paper);
      setA(st.idle, 'visibility', winShown ? 'hidden' : 'visible');
      setA(st.gain, 'visibility', winShown ? 'visible' : 'hidden');
      for (const sp of st.sparks) {
        const q = live ? ((t - tw) * 2.5 + sp.ph) % 1 : 2;
        if (q >= 0.6) { setA(sp.n, 'visibility', 'hidden'); continue; }
        const s = sp.sz * (0.45 + 0.9 * Math.sin(q / 0.6 * Math.PI));
        setA(sp.n, 'visibility', 'visible');
        sp.n.setAttribute('transform', `translate(${f2(sp.x)} ${f2(sp.y)}) rotate(${f2(sp.rot + q * 90)}) scale(${f2(s)})`);
      }
      // haut-parleur : « chante » pendant la fanfare
      const sp0 = live ? E.back(prog(t, tw, tw + 0.25)) : 0;
      put(st.spk, 975, 300, 0, Math.max(sp0, 0), Math.max(sp0, 0), live ? 1 : 0);
      if (live) st.waves.forEach((w, k) => { const q = ((t - tw) * 2.5 - k * 0.28) % 1; setA(w, 'visibility', q < 0.62 ? 'visible' : 'hidden'); });
      // coupure + barré
      const pn = net ? E.out2(prog(t, tn, tn + 0.5)) : 0;
      setA(st.dim, 'opacity', f2(0.58 * pn));
      const sk = net ? E.out3(prog(t, tn + 0.15, tn + 0.45)) : 0;
      for (const n of [st.sk0, st.sk1]) {
        setA(n, 'visibility', sk > 0 ? 'visible' : 'hidden');
        const bx = BX - 14, ex = BX + BW + 14;
        n.setAttribute('x2', f2(lerp(bx, ex, sk))); n.setAttribute('y2', f2(lerp(BY + BH - 6, BY + 6, sk)));
      }

      /* ---- calcul : MISÉ / REÇU ---- */
      const L = [[st.l1, st.tc1, st.money(st.stake)], [st.l2, st.tc2, st.money(st.win)]];
      for (const [ln, tc, val] of L) {
        const pp = tc == null ? 0 : E.out3(prog(t, tc, tc + 0.3));
        const txt = tc != null && t >= tc ? val : `—${NB}${st.cur}`;
        if (ln.a.textContent !== txt) ln.a.textContent = txt;
        const o = pp > 0 ? 1 : 0.25;
        setA(ln.l, 'opacity', o); setA(ln.a, 'opacity', o);
        const dy = (1 - pp) * 14;
        ln.l.setAttribute('transform', `translate(0 ${f2(pp > 0 ? dy : 0)})`); ln.a.setAttribute('transform', `translate(0 ${f2(pp > 0 ? dy : 0)})`);
      }
      setA(st.rule, 'opacity', st.tc2 != null && t >= st.tc2 ? 1 : 0.25);
      // tampon −1,20 €
      if (tn == null) put(st.stamp, 1480, 705, -4, 0, 0, 0);
      else {
        const q = prog(t, tn, tn + 0.22), sc = lerp(2.6, 1, E.out3(q));
        const sh = ZV.shakeAt(t, tn + 0.2, 10, 0.3);
        put(st.stamp, 1480 + sh[0], 705 + sh[1], -4, q > 0 ? sc : 0, q > 0 ? sc : 0, q > 0 ? Math.min(1, q * 4) : 0);
      }

      /* ---- carte crédit / plein cadre `honest` ---- */
      const k = th == null ? 0 : E.io3(prog(t, th, th + 0.45));
      const cx = lerp(1110, 0, k), cy = lerp(90, 0, k), cw = lerp(740, 1920, k), ch = lerp(300, 1080, k);
      st.card.setAttribute('x', f2(cx)); st.card.setAttribute('y', f2(cy)); st.card.setAttribute('width', f2(cw)); st.card.setAttribute('height', f2(ch));
      st.card.setAttribute('stroke-width', f2(lerp(6, 0, k)));
      st.cardS.setAttribute('x', f2(cx + 16 * (1 - k))); st.cardS.setAttribute('y', f2(cy + 16 * (1 - k))); st.cardS.setAttribute('width', f2(cw)); st.cardS.setAttribute('height', f2(ch));
      st.cLab.setAttribute('x', f2(lerp(1480, 960, k))); st.cLab.setAttribute('y', f2(lerp(150, 430, k))); st.cLab.setAttribute('font-size', f2(lerp(30, 46, k)));
      st.cNum.setAttribute('x', f2(lerp(1480, 960, k))); st.cNum.setAttribute('y', f2(lerp(330, 700, k))); st.cNum.setAttribute('font-size', f2(lerp(130, 320, k)));
      const tp = th == null ? 0 : prog(t, th + 0.3, th + 0.6);
      setA(st.title, 'visibility', tp > 0 ? 'visible' : 'hidden'); setA(st.title, 'opacity', f2(tp));
      setA(st.frameIn, 'opacity', f2(k));
    }
  });
})();
;
/* ==== tools/video/composition/components/logo-reveal.js ==== */
// Composant « logo-reveal » : voir tools/video/composition/INTERFACE.md. Fonction pure du temps du plan, aplats seulement.
(() => {
  /* ---- aides typographiques locales (mêmes lignes dans chaque composant du rôle « Typo ») ---- */
  const { C, F, E, clamp, prog, lerp, f2, put, g, rect, text, path, line, sv, circle } = ZV;
  const COL = { ink: C.ink, paper: C.paper, lime: C.lime, red: C.red, white: C.white };
  const TINT = { ink: '#1A1A1A', lime: '#B9EC22', paper: '#E4E0D3', red: '#F0452F' };
  const NB = ' ';
  let UID = 0;
  const colOf = (k, d) => COL[k] || k || d;
  // largeur d'une chaîne (mesure réelle via un <text> caché), ramenée à `size` px
  function mkProbe(root) {
    const n = sv('text', { x: 0, y: 0, 'font-size': 100, 'font-weight': 800, visibility: 'hidden' }, root);
    const cache = {};
    return function w(str, size, o) {
      o = o || {};
      const key = (o.mono ? 'm' : 'd') + (o.sp || 0) + '|' + str;
      let v = cache[key];
      if (v === undefined) {
        n.setAttribute('font-family', o.mono ? F.mono : F.display);
        n.setAttribute('letter-spacing', (o.sp || 0) * 100);
        n.textContent = str.replace(/ /g, NB);
        try { v = n.getComputedTextLength(); } catch (e) { v = 0; }
        if (!(v > 0)) v = str.length * (o.mono ? 60 : 58);
        cache[key] = v;
      }
      return v * size / 100;
    };
  }
  // 1 234,5 : espace fine insécable pour les milliers, virgule décimale
  function fnum(v, dec) {
    const s = Math.abs(v).toFixed(dec || 0).split('.');
    const i = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return (v < 0 ? '−' : '') + i + (s[1] ? ',' + s[1] : '');
  }
  // lie ponctuation et opérateurs au mot précédent (jamais de « ? » seul en début de ligne)
  const glue = (s) => String(s).replace(/ (?=[?:%!;€¢÷×=+−])/g, NB).replace(/([÷×=+−]) (?=\S)/g, '$1' + NB);
  // coupe `str` en ≤ maxRows lignes équilibrées tenant dans maxW (null si impossible)
  function breaks(str, S, maxW, wf, maxRows) {
    if (wf(str, S) <= maxW) return [str];
    const words = str.split(' ');
    if (words.length < 2 || maxRows < 2) return null;
    let best = null, bm = 1e9;
    for (let k = 1; k < words.length; k++) {
      const a = words.slice(0, k).join(' '), b = words.slice(k).join(' ');
      const m = Math.max(wf(a, S), wf(b, S));
      if (m < bm) { bm = m; best = [a, b]; }
    }
    if (bm <= maxW) return best;
    if (maxRows >= 3 && words.length >= 3) {
      bm = 1e9; best = null;
      for (let k = 1; k < words.length - 1; k++) for (let j = k + 1; j < words.length; j++) {
        const a = words.slice(0, k).join(' '), b = words.slice(k, j).join(' '), c = words.slice(j).join(' ');
        const m = Math.max(wf(a, S), wf(b, S), wf(c, S));
        if (m < bm) { bm = m; best = [a, b, c]; }
      }
      if (bm <= maxW) return best;
    }
    return null;
  }
  // fond plat + trame de points qui dérive doucement + repères de coupe aux angles
  function backdrop(root, bgk, uid, opt) {
    opt = opt || {};
    const tint = TINT[bgk] || TINT.ink;
    const fill = bgk === 'wheel' ? C.ink : colOf(bgk, C.ink);
    rect(root, 0, 0, 1920, 1080, 0, fill);
    const o = {};
    if (opt.dots !== false) {
      const defs = sv('defs', null, root);
      o.pat = sv('pattern', { id: uid + 'd', width: 64, height: 64, patternUnits: 'userSpaceOnUse' }, defs);
      circle(o.pat, 32, 32, 3.6, tint);
      rect(root, 0, 0, 1920, 1080, 0, `url(#${uid}d)`);
    }
    if (opt.marks !== false) {
      const mc = bgk === 'ink' || bgk === 'wheel' ? '#3A3A3A' : C.ink;
      path(root, 'M56 160V56H160M1760 56H1864V160M1864 920V1024H1760M160 1024H56V920', 'none', mc, 8, { 'stroke-linecap': 'butt', 'stroke-linejoin': 'miter' });
    }
    return o;
  }
  const drift = (o, t) => { if (o && o.pat) o.pat.setAttribute('patternTransform', `translate(${f2(t * 14)} ${f2(t * 9)})`); };
  // pastille Mono (kicker) : fond/texte selon l'aplat
  function pill(parent, str, bgk, size, W) {
    const dark = bgk === 'ink' || bgk === 'wheel';
    const fill = dark ? C.lime : C.ink;
    const tc = dark ? C.ink : (bgk === 'lime' ? C.lime : C.paper);
    const sp = 0.1;
    const w = W(str, size, { mono: true, sp }) + 64, h = size * 1.7;
    const gr = g(parent);
    rect(gr, -w / 2 + 7, -h / 2 + 7, w, h, 14, C.ink);
    rect(gr, -w / 2, -h / 2, w, h, 14, fill, C.ink, 5);
    text(gr, str, 0, size * 0.35, size, tc, { mono: true, anchor: 'middle', spacing: f2(sp * size) });
    return { g: gr, w, h };
  }
  // Définition d'un composant : `build` (une fois) / `draw` (pure). La mise en page dépend des mesures de police :
  // si les polices ne sont pas encore chargées à l'init, on reconstruit dès qu'elles le sont (puis on redessine).
  const FONTS = ['800 100px "Bricolage Grotesque"', '800 100px "JetBrains Mono"'];
  const fontsOk = () => { try { return FONTS.every((f) => document.fonts.check(f)); } catch (e) { return true; } };
  function defineTypo(id, impl) {
    const rebuild = (st) => {
      while (st.root.firstChild) st.root.removeChild(st.root.firstChild);
      st.s = impl.build(st.root, st.shot);
      st.ok = true;
      if (st.last !== null) impl.draw(st.s, st.last, st.shot);
    };
    ZV.define(id, {
      init(root, shot) {
        const st = { root, shot, last: null, ok: fontsOk() };
        st.s = impl.build(root, shot);
        if (!st.ok) { try { Promise.all(FONTS.map((f) => document.fonts.load(f))).then(() => { if (!st.ok && fontsOk()) rebuild(st); }); } catch (e) { /* tant pis */ } }
        return st;
      },
      update(st, t, shot) {
        st.last = t;
        if (!st.ok && fontsOk()) rebuild(st);
        impl.draw(st.s, t, shot || st.shot);
      }
    });
  }

  /* ---- dessin du logo ZÉRO VERT (repris de assets/podcast/logo.svg et mark.svg) ---- */
  const ZERO_D = 'M328 14L328 14Q258 14 202 -8Q146 -30 107 -73Q68 -116 48 -180Q27 -244 27 -327L27 -327Q27 -445 66 -521Q104 -598 174 -636Q243 -674 334 -674L334 -674Q404 -674 460 -652Q515 -631 554 -588Q593 -545 614 -480Q634 -416 634 -331L634 -331Q634 -245 613 -180Q591 -115 551 -72Q510 -29 454 -7Q397 14 328 14M334 -119L334 -119Q379 -119 409 -141Q438 -164 453 -209Q467 -255 467 -324L467 -324Q467 -397 452 -445Q436 -493 406 -517Q375 -542 329 -542L329 -542Q285 -542 255 -518Q225 -495 210 -448Q195 -401 195 -331L195 -331Q195 -278 204 -238Q212 -198 230 -171Q247 -145 273 -132Q299 -119 334 -119';
  const LETTERS = [[0,'M337 0L14 0L14 -121L178 -532L178 -535L14 -535L14 -660L334 -660L334 -539L169 -129L169 -125L337 -125L337 0'],[343,'M175 0L20 0L20 -660L175 -660L175 0M312 0L130 0L130 -126L312 -126L312 0M286 -278L130 -278L130 -393L286 -393L286 -278M312 -534L130 -534L130 -660L312 -660L312 -534M295 -804L211 -695L86 -695L140 -804L295 -804'],[657,'M174 0L20 0L20 -660L202 -660Q236 -660 267 -652Q298 -645 324 -629Q349 -613 368 -590Q387 -567 398 -535Q408 -504 408 -464L408 -464Q408 -431 400 -402Q392 -373 375 -350Q357 -328 331 -312Q305 -297 269 -291L269 -291L269 -282Q322 -280 349 -260Q376 -240 387 -206Q398 -173 403 -129L403 -129L420 0L260 0L251 -106Q248 -140 243 -167Q238 -195 225 -211Q211 -227 181 -228L181 -228L174 -228L174 0M174 -537L174 -330L186 -330Q220 -330 237 -356Q253 -382 253 -440L253 -440Q253 -493 239 -515Q225 -537 194 -537L194 -537L174 -537'],[1078,'M328 14L328 14Q258 14 202 -8Q146 -30 107 -73Q68 -116 48 -180Q27 -244 27 -327L27 -327Q27 -445 66 -521Q104 -598 174 -636Q243 -674 334 -674L334 -674Q404 -674 460 -652Q515 -631 554 -588Q593 -545 614 -480Q634 -416 634 -331L634 -331Q634 -245 613 -180Q591 -115 551 -72Q510 -29 454 -7Q397 14 328 14M334 -119L334 -119Q379 -119 409 -141Q438 -164 453 -209Q467 -255 467 -324L467 -324Q467 -397 452 -445Q436 -493 406 -517Q375 -542 329 -542L329 -542Q285 -542 255 -518Q225 -495 210 -448Q195 -401 195 -331L195 -331Q195 -278 204 -238Q212 -198 230 -171Q247 -145 273 -132Q299 -119 334 -119'],[1881,'M327 0L109 0L4 -660L168 -660L217 -134L224 -134L281 -660L440 -660L327 0'],[2317,'M175 0L20 0L20 -660L175 -660L175 0M312 0L130 0L130 -126L312 -126L312 0M286 -278L130 -278L130 -393L286 -393L286 -278M312 -534L130 -534L130 -660L312 -660L312 -534'],[2631,'M174 0L20 0L20 -660L202 -660Q236 -660 267 -652Q298 -645 324 -629Q349 -613 368 -590Q387 -567 398 -535Q408 -504 408 -464L408 -464Q408 -431 400 -402Q392 -373 375 -350Q357 -328 331 -312Q305 -297 269 -291L269 -291L269 -282Q322 -280 349 -260Q376 -240 387 -206Q398 -173 403 -129L403 -129L420 0L260 0L251 -106Q248 -140 243 -167Q238 -195 225 -211Q211 -227 181 -228L181 -228L174 -228L174 0M174 -537L174 -330L186 -330Q220 -330 237 -356Q253 -382 253 -440L253 -440Q253 -493 239 -515Q225 -537 194 -537L194 -537L174 -537'],[3052,'M265 0L111 0L111 -660L265 -660L265 0M370 -535L5 -535L5 -660L370 -660L370 -535']];   // [x, d] en unités du logo, origine (1016, 770), lettres Z É R O V E R T
  const LET_CX = [171, 500, 867, 1408, 2103, 2474, 2841, 3239];
  const LK = { w: 4438, h: 920, top: -40, wx: 1016, wy: 770 };
  const BALL_REST = { x: 331, y: -240, r: 94 };
  // hauteur de la bille au-dessus de sa position de repos (chute puis trois rebonds), t en secondes depuis le lâcher
  function ballLift(t, H) {
    const seg = [[0.36, H], [0.26, H * 0.2], [0.17, H * 0.075], [0.11, H * 0.028]];
    let a = 0;
    for (let i = 0; i < seg.length; i++) {
      const d = seg[i][0], h = seg[i][1];
      if (t < a + d) { const u = (t - a) / d; return i === 0 ? h * (1 - u * u) : h * (1 - Math.pow(2 * u - 1, 2)); }
      a += d;
    }
    return 0;
  }
  const BALL_DUR = 0.9;
  // la marque (carré lime + « 0 » + bille), dans un repère 512×512 ; renvoie { g, ball }
  function mkMark(parent, ballOn) {
    const gr = g(parent);
    rect(gr, 12, 12, 488, 488, 116, C.lime, C.ink, 24);
    const z = g(gr, { transform: 'translate(77.3 440.43) scale(0.54)' });
    path(z, ZERO_D, C.ink);
    const ball = circle(z, BALL_REST.x, BALL_REST.y, BALL_REST.r, C.white, C.ink, 16);
    return { g: gr, ball, z };
  }
  // mot-symbole : lettres séparées (groupes centrés sur leur milieu, repère du logo)
  function mkWord(parent, fill) {
    const gr = g(parent), letters = [];
    LETTERS.forEach(([x, d], i) => {
      const lg = g(gr);
      path(lg, d, fill || C.ink, null, 0, { transform: `translate(${x - LET_CX[i]} 330)` });
      if (i === 3) circle(lg, 1395 - LET_CX[i], -240 + 330, 93, C.white, C.ink, 18);
      letters.push({ g: lg, cx: LET_CX[i] + LK.wx, cy: LK.wy - 330 });
    });
    return { g: gr, letters };
  }

  const FR = 1 / 30;

  defineTypo('logo-reveal', {
    build(root, shot) {
      const P = shot.props || {};
      const outro = P.mode === 'outro';
      const bgk = P.bg === 'lime' || (outro && P.bg !== 'ink') ? 'lime' : 'ink';
      const uid = 'lg' + (++UID);
      const W = mkProbe(root);
      const st = { shot, outro, bgk, uid, W };
      const cue = (n, d) => { const v = ZV.cue(shot, n); return v === null ? d : v; };
      st.bd = backdrop(root, outro ? 'lime' : bgk, uid, { marks: false });
      if (!outro) {
        // ---- intro : la case zéro grandit en iris, le carré se forme, la bille tombe, le mot s'écrit ----
        st.t = { iris: cue('iris', 0.5), ball: cue('ball', 1.7), word: cue('word', 2.4), tag: cue('tagline', 3.5) };
        st.pocket = g(root);
        circle(st.pocket, 0, 0, 92, C.lime, C.paper, 8);
        text(st.pocket, '0', 0, 24, 66, C.ink, { mono: true, anchor: 'middle' });
        st.irisC = circle(root, 960, 540, 10, C.lime);
        // lockup : marque (gauche) + mot-symbole, à l'échelle k
        const k = 1560 / LK.w; st.k = k;
        st.lx = 180; st.ly = 330;
        st.mark = mkMark(root);
        st.word = mkWord(root, C.ink);
        // légende (tagline) en Mono
        const tag = String(P.tagline || 'Le podcast qui t’explique comment la maison gagne.');
        const size = 44;
        st.tag = tag; st.tagW = W(tag, size, { mono: true });
        st.tagNode = text(root, '', 960 - st.tagW / 2, st.ly + (LK.h + LK.top * 0) * k + 70 + 40, size, C.ink, { mono: true });
        st.tagNode.setAttribute('style', 'white-space:pre');
        st.tagBar = rect(root, 960 - st.tagW / 2, st.ly + LK.h * k + 70 + 52, 10, 6, 0, C.ink);
        st.tagCursor = rect(root, 0, 0, size * 0.32, size * 0.9, 0, C.ink);
        st.size = size;
        return st;
      }
      // ---- outro : gros 0 ink sur lime, la bille tombe dedans, le mot-symbole claque, trait blanc souligné ----
      st.t = { ball: cue('ball', 1.1), word: cue('word', 2.7), under: cue('underline', 3.9) };
      st.z = g(root);
      const zs = 0.6;
      st.zs = zs;
      // le « 0 » est centré sur (960, 320) : sa boîte va de y = -674 à 14 (unités) et de x = 27 à 634
      st.zc = { x: 960, y: 320 };
      st.zx = 960 - 331 * zs; st.zy = 320 + 330 * zs;
      const zg = g(st.z, { transform: `translate(${f2(-331 * zs)} ${f2(330 * zs)}) scale(${zs})` });
      path(zg, ZERO_D, C.ink);
      st.ball = circle(g(root), 0, 0, BALL_REST.r, C.white, C.ink, 16);
      st.ballG = st.ball.parentNode;
      st.ball.setAttribute('transform', '');
      // mot-symbole : une seule ligne centrée
      const ks = 1500 / (LK.w - LK.wx); st.ks = ks;
      st.wordG = g(root);
      st.word = mkWord(st.wordG, C.ink);
      st.wy0 = 850;
      st.underR = rect(root, 0, 0, 10, 24, 6, C.white, C.ink, 6);
      return st;
    },

    draw(st, t, shot) {
      drift(st.bd, t);
      const E = ZV.E;
      if (!st.outro) {
        const T = st.t, k = st.k;
        // case zéro (avant l'iris) : pulsation douce
        const before = t < T.iris;
        const pulse = 1 + 0.06 * Math.sin(t * 9);
        put(st.pocket, 960, 540, 0, pulse, pulse, before ? 1 : 0);
        // iris lime (10 i)
        const iq = clamp((t - T.iris) / (10 * FR));
        const r = lerp(92, 1320, E.in2(iq));
        st.irisC.setAttribute('r', f2(r)); st.irisC.setAttribute('visibility', t >= T.iris ? 'visible' : 'hidden');
        const iEnd = T.iris + 10 * FR;
        // marque : se forme (pop) après l'iris, puis glisse vers sa place dans le lockup au début du mot
        const mq = E.back(clamp((t - (iEnd + 0.05)) / (10 * FR)));
        const ms0 = 440 / 512, msFinal = (880 * k) / 512;
        const sl = E.io3(clamp((t - (T.word - 0.32)) / 0.36));
        const sc = lerp(ms0, msFinal, sl);
        const mcx = lerp(960, st.lx + 440 * k, sl), mcy = lerp(420, st.ly + 480 * k, sl);
        const pop = t >= iEnd + 0.05 ? lerp(0.35, 1, mq) : 0;
        st.mark.g.setAttribute('transform', `translate(${f2(mcx)} ${f2(mcy)}) scale(${f2(Math.max(0.0001, sc * pop))}) translate(-256 -256)`);
        st.mark.g.setAttribute('visibility', t >= iEnd + 0.05 ? 'visible' : 'hidden');
        // bille : chute puis trois rebonds dans le « 0 »
        const lift = t < T.ball ? 900 : ballLift(t - T.ball, 900);
        st.mark.ball.setAttribute('cy', f2(BALL_REST.y - lift));
        st.mark.ball.setAttribute('visibility', t >= T.ball - 0.0 ? 'visible' : 'hidden');
        // mot-symbole : lettre par lettre, 3 i d'écart, rotation aléatoire qui se redresse
        const rg = ZV.rng(21);
        st.word.letters.forEach((l, i) => {
          const rot = (rg() * 24 - 12), t0 = T.word + i * 3 * FR, p = clamp((t - t0) / (8 * FR));
          const pb = E.back(p);
          const px = st.lx + (l.cx) * k, py = st.ly + (l.cy + 40) * k;
          const s = lerp(0.2, 1, pb) * k;
          put(l.g, px, py + (1 - p) * 40, rot * (1 - E.out3(p)), s, s, t >= t0 ? 1 : 0);
        });
        // légende Mono : s'écrit (caractère par caractère, calée dans le temps restant)
        const win = Math.max(0.2, shot.dur - T.tag - 0.12), per = Math.min(2 * FR, win / st.tag.length);
        const kk = t < T.tag ? 0 : Math.min(st.tag.length, Math.floor((t - T.tag) / per) + 1);
        st.tagNode.textContent = st.tag.slice(0, kk).replace(/ /g, NB);
        const wk = kk ? st.W(st.tag.slice(0, kk), st.size, { mono: true }) : 0;
        st.tagCursor.setAttribute('x', f2(960 - st.tagW / 2 + wk + 4)); st.tagCursor.setAttribute('y', f2(st.ly + LK.h * k + 70 + 40 - st.size * 0.74));
        st.tagCursor.setAttribute('visibility', t >= T.tag && (kk < st.tag.length || Math.floor((t - T.tag) / 0.3) % 2 === 0) ? 'visible' : 'hidden');
        st.tagBar.setAttribute('visibility', 'hidden');
        return;
      }
      // ---------- outro ----------
      const T = st.t;
      // « 0 » : arrive par un pop à t=0 (le plan démarre sur l'iris du noyau)
      const zq = E.back(clamp(t / (10 * FR))), zsc = Math.max(0.001, lerp(0.6, 1, zq));
      st.z.setAttribute('transform', `translate(${st.zc.x} ${st.zc.y}) scale(${f2(zsc)})`);
      // bille : chute puis trois rebonds dans le « 0 »
      const lift = t < T.ball ? 900 : ballLift(t - T.ball, 900);
      const bx = st.zx + BALL_REST.x * st.zs, by = st.zy + (BALL_REST.y - lift) * st.zs;
      st.ballG.setAttribute('transform', `translate(${f2(bx)} ${f2(by)}) scale(${f2(st.zs)})`);
      st.ballG.setAttribute('visibility', t >= T.ball - 0.2 ? 'visible' : 'hidden');
      // mot-symbole : claque d'un bloc (scale 2.4 -> 1 en 4 i + shake 12 px)
      const wt = t - T.word, wp = clamp(wt / (4 * FR)), ws = lerp(2.4, 1, E.out3(wp));
      const [sx, sy] = ZV.shakeAt(wt, 4 * FR, 12, 0.4);
      const ks = st.ks, WC = LK.wx + 1714, wy = st.wy0;
      st.word.letters.forEach((l) => {
        put(l.g, 960 + (l.cx - WC) * ks * ws + sx, (wy - 330 * ks) + sy, 0, ks * ws, ks * ws, wt >= 0 ? 1 : 0);
      });
      // trait blanc souligné qui se trace
      const uq = E.out3(clamp((t - T.under) / 0.45));
      st.underR.setAttribute('x', f2(960 - 750)); st.underR.setAttribute('y', f2(wy + 52)); st.underR.setAttribute('width', f2(Math.max(0.01, 1500 * uq))); st.underR.setAttribute('visibility', uq > 0 ? 'visible' : 'hidden');
    }
  });
})();
;
/* ==== tools/video/composition/components/martingale-ladder.js ==== */
// Composant `martingale-ladder` (épisode 3) : l'escalier de la martingale. Voir EP3-COMPONENTS.md.
// Une colonne de lignes (tour, mise doublée, pastille rouge = ta mise, bille noire = perdu, cumul des pertes), un compteur géant,
// deux murs (TON ARGENT / PLAFOND DE LA TABLE) et une 11e mise fantôme. Fonction pure du temps ; aplats, aucun dégradé / flou / filter.
// Cues : rule, lose (× n), win, rush, total, eleventh, wall-money, wall-limit.
(() => {
  'use strict';
  const { C, E, clamp, prog, f2, sv, g, rect, circle, text, put, rng, fr, shakeAt } = ZV;
  let UID = 0;
  const NB = ' ';
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const num = (v, d) => (v != null && v !== '' && isFinite(+v) ? +v : d);
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const vis = (n, on) => setA(n, 'visibility', on ? 'visible' : 'hidden');
  // largeur estimée d'un texte Bricolage 800 (sert de textLength, donc indépendante de la police de secours)
  const bw = (s, size) => { let a = 0; for (const ch of String(s)) a += size * (ch === ' ' || ch === ' ' ? 0.26 : /[0-9]/.test(ch) ? 0.6 : /[A-ZÀÂÉÈÊÎÔÛÇ€%+×]/.test(ch) ? 0.66 : /[.,:;'’!|]/.test(ch) ? 0.3 : 0.56); return a; };
  const mw = (s, size) => String(s).length * size * 0.6;                       // Mono : 0,6 em par caractère
  // texte dynamique en Mono : contenu + textLength mis à jour seulement si la chaîne change
  const setTxt = (n, s, size) => { if (n.__s !== s) { n.__s = s; n.textContent = s; n.setAttribute('textLength', f2(Math.max(1, mw(s, size)))); } };

  const RX = 330, RW = 800, RY0 = 170, RH = 100, PH = 86, VIS = 6, CLIP0 = 156, CLIP1 = 786;
  const PX = 1635;                                                              // axe du panneau de droite

  function mkRow(parent, i, bet, cumTxt, gainTxt, ghost) {
    const o = { i, ghost };
    o.g = g(parent);
    o.sh = rect(o.g, RX + 9, 9, RW, PH, 10, C.ink);
    o.pl = rect(o.g, RX, 0, RW, PH, 10, C.pocket, C.paper, 4);
    const cy = PH / 2, base = cy + 18;
    o.n = text(o.g, String(i), RX + 38, cy + 12, 32, '#B9B5A8', { mono: true, anchor: 'middle', len: f2(mw(String(i), 32)) });
    o.bet = text(o.g, bet, RX + 322, base, 50, C.paper, { mono: true, anchor: 'end', len: f2(mw(bet, 50)) });
    o.chip = circle(o.g, RX + 364, cy, 20, C.red, C.ink, 4);
    o.slot = circle(o.g, RX + 430, cy, 27, 'none', C.paper, 4);
    o.slot.setAttribute('stroke-dasharray', '8 7');
    o.q = text(o.g, '?', RX + 430, cy + 11, 32, C.paper, { mono: true, anchor: 'middle', len: f2(mw('?', 32)) });
    o.ball = circle(o.g, RX + 430, cy, 27, C.ink, C.paper, 4);
    o.tag = text(o.g, '', RX + 476, cy + 9, 26, C.paper, { mono: true, anchor: 'start' });
    o.cum = text(o.g, cumTxt, RX + RW - 24, cy + 14, 40, C.red, { mono: true, anchor: 'end', len: f2(mw(cumTxt, 40)) });
    o.gain = text(o.g, gainTxt, RX + RW - 24, cy + 14, 40, C.ink, { mono: true, anchor: 'end', len: f2(mw(gainTxt, 40)) });
    return o;
  }

  ZV.define('martingale-ladder', {
    init(root, shot) {
      const P = shot.props || {};
      const beats = Array.isArray(shot.beats) ? shot.beats : [];
      const dur = isNum(shot.dur) && shot.dur > 0 ? shot.dur : 10;
      const cl = (n) => beats.filter((b) => b && b.do === 'cue' && b.name === n && isNum(b.t)).map((b) => b.t).sort((a, b) => a - b);
      const start = Math.max(1, num(P.start, 10));
      const cur = typeof P.currency === 'string' ? P.currency : '€';
      const maxRows = clamp(Math.round(num(P.max_rows, 10)), 1, 12);
      const limit = num(P.table_limit, 5000), bank = num(P.bankroll, 2500);
      const money = (v) => fr(v) + NB + cur;
      const uid = 'ml' + (++UID);
      const st = { dur, start, cur, maxRows, money, uid };

      /* ---- repères ---- */
      let c = { rule: cl('rule')[0], lose: cl('lose'), win: cl('win')[0], rush: cl('rush')[0], total: cl('total')[0], eleventh: cl('eleventh')[0], wm: cl('wall-money')[0], wl: cl('wall-limit')[0] };
      const none = [c.rule, c.win, c.rush, c.total, c.eleventh, c.wm, c.wl].every((x) => x == null) && !c.lose.length;
      if (none) c = { rule: 0.3, lose: [1.0, 1.6, 2.1], win: null, rush: 2.7, total: 6.0, eleventh: 7.2, wm: 8.6, wl: 10.0 };
      let lossT = c.lose.slice();
      if (c.rush != null) {
        lossT = lossT.filter((x) => x < c.rush);
        let tt = c.rush + 0.15, gap = 0.55;                                      // les lignes s'enchaînent en accélérant (≥ 0,17 s : photosensibilité)
        while (lossT.length < maxRows) { lossT.push(tt); tt += gap; gap = Math.max(0.17, gap * 0.82); }
      }
      if (c.win != null) lossT = lossT.filter((x) => x < c.win);
      lossT = lossT.slice(0, maxRows);
      const tWin = c.win != null && lossT.length < maxRows ? c.win : null;
      const firstEv = [lossT[0], tWin].filter((x) => x != null);
      const tStart = c.rule != null ? c.rule : firstEv.length ? Math.max(0, Math.min(...firstEv) - 0.3) : null;
      const nRows = tStart == null ? 0 : Math.min(lossT.length + 1, maxRows);
      const a = [];                                                              // a[i] = instant d'apparition de la ligne i (1-based) ; nRows+1 = fantôme
      for (let i = 1; i <= nRows; i++) a[i] = i === 1 ? tStart : lossT[i - 2];
      const winRow = tWin != null && nRows >= 1 ? lossT.length + 1 : 0;
      if (winRow) a[winRow] = Math.min(a[winRow], tWin - 0.25);
      const tGhost = c.eleventh != null ? c.eleventh : (c.wl != null ? c.wl : null);
      const ghostI = nRows + 1;
      if (tGhost != null) a[ghostI] = tGhost;
      Object.assign(st, { c, lossT, tWin, tStart, nRows, a, winRow, ghostI, tGhost, nTot: tGhost != null ? ghostI : nRows });
      const cum = (k) => start * (Math.pow(2, k) - 1);                           // cumul après k pertes
      st.cum = cum; st.cumAll = cum(maxRows);

      /* ---- décor ---- */
      rect(root, 0, 0, 1920, 1080, 0, C.ink);
      const bgs = g(root, { transform: 'rotate(-18 960 540)' });
      for (let k = -4; k <= 4; k++) rect(bgs, 960 + k * 300 - 70, -600, 140, 2300, 0, C.pocket);
      const defs = sv('defs', null, root);
      const pt = sv('pattern', { id: uid + 'h', width: 26, height: 26, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
      sv('rect', { x: 0, y: 0, width: 26, height: 26, fill: C.ink }, pt);
      sv('rect', { x: 0, y: 0, width: 12, height: 26, fill: C.lime }, pt);
      const clip = sv('clipPath', { id: uid + 'c' }, defs);
      rect(clip, 0, CLIP0, 1920, CLIP1 - CLIP0, 0, '#000');
      st.world = g(root);
      const W = st.world;

      /* ---- zone gauche : compteur de tour (remplacé par le mur du plafond) ---- */
      st.tour = g(W);
      text(st.tour, 'TOUR', 170, 300, 34, C.paper, { mono: true, anchor: 'middle', spacing: 6 });
      st.tourN = text(st.tour, '1', 170, 470, 190, C.lime, { anchor: 'middle', len: f2(bw('1', 190)) });
      rect(st.tour, 70, 500, 200, 12, 0, C.lime);

      /* ---- bandeau de la règle ---- */
      st.rule = g(W);
      {
        const lab = 'JE DOUBLE À CHAQUE PERTE', size = 48, w = 800, h = 80;
        rect(st.rule, -w / 2 + 10, -h / 2 + 10, w, h, 14, C.paper);
        rect(st.rule, -w / 2, -h / 2, w, h, 14, C.lime, C.paper, 6);
        text(st.rule, lab, 0, size * 0.35, size, C.ink, { anchor: 'middle', len: f2(Math.min(bw(lab, size), 740)) });
      }

      /* ---- ×2 dans le couloir de droite (couvert par le mur d'argent) ---- */
      st.x2 = g(W);
      rect(st.x2, -75 + 8, -50 + 8, 150, 100, 16, C.ink);
      rect(st.x2, -75, -50, 150, 100, 16, C.paper, C.ink, 6);
      text(st.x2, '×2', 0, 26, 76, C.ink, { anchor: 'middle', len: f2(bw('×2', 76)) });

      /* ---- lignes (dans un groupe écrêté) ---- */
      const cg = g(W, { 'clip-path': `url(#${uid}c)` });
      st.rows = [];
      for (let i = 1; i <= nRows; i++) {
        const gain = '+' + NB + money(start);
        st.rows[i] = mkRow(cg, i, money(start * Math.pow(2, i - 1)), money(cum(i)), gain, false);
      }
      if (tGhost != null) {
        const r = mkRow(cg, 11, money(start * Math.pow(2, maxRows)), '', '', true);
        r.n.textContent = String(maxRows + 1); r.n.setAttribute('textLength', f2(mw(String(maxRows + 1), 32)));
        r.pl.setAttribute('stroke-dasharray', '16 10');
        r.chip.setAttribute('visibility', 'hidden'); r.slot.setAttribute('visibility', 'hidden'); r.q.setAttribute('visibility', 'hidden'); r.ball.setAttribute('visibility', 'hidden');
        r.cum.setAttribute('visibility', 'hidden'); r.gain.setAttribute('visibility', 'hidden');
        st.rows[ghostI] = r;
      }

      /* ---- panneau de droite : compteur géant, stickers ---- */
      st.ct = g(W);
      rect(st.ct, PX - 255 + 10, 180 + 10, 510, 240, 16, C.ink);
      st.ctPl = rect(st.ct, PX - 255, 180, 510, 240, 16, C.pocket, C.paper, 6);
      text(st.ct, 'TES PERTES', PX, 236, 34, C.paper, { mono: true, anchor: 'middle', spacing: 6, len: f2(mw('TES PERTES', 34) + 9 * 6) });
      st.ctNum = text(st.ct, '', PX, 366, 92, C.paper, { mono: true, anchor: 'middle' });
      st.stk = g(W);
      {
        const lab = `POUR GAGNER ${money(start)}`, w = 470, h = 86;
        rect(st.stk, -w / 2 + 10, -h / 2 + 10, w, h, 16, C.ink);
        rect(st.stk, -w / 2, -h / 2, w, h, 16, C.paper, C.ink, 6);
        text(st.stk, lab, 0, 16, 46, C.ink, { anchor: 'middle', len: f2(Math.min(bw(lab, 46), w - 50)) });
      }
      st.win = g(W);
      {
        const w = 480, h = 210;
        rect(st.win, -w / 2 + 10, -h / 2 + 10, w, h, 16, C.ink);
        rect(st.win, -w / 2, -h / 2, w, h, 16, C.lime, C.ink, 7);
        const l1 = 'TOUTES TES PERTES', l2 = 'RÉCUPÉRÉES', l3 = '+ ' + money(start);
        text(st.win, l1, 0, -42, 40, C.ink, { anchor: 'middle', len: f2(Math.min(bw(l1, 40), w - 50)) });
        text(st.win, l2, 0, 2, 40, C.ink, { anchor: 'middle', len: f2(Math.min(bw(l2, 40), w - 50)) });
        text(st.win, l3, 0, 76, 76, C.ink, { anchor: 'middle', len: f2(Math.min(bw(l3, 76), w - 50)) });
      }

      /* ---- murs ---- */
      const mkWall = (cx, l1, s1, l2, s2) => {
        const wg = g(W), w = 200, h = 690;
        rect(wg, -w / 2 + 12, -h / 2 + 12, w, h, 6, C.red);
        rect(wg, -w / 2, -h / 2, w, h, 6, C.ink, C.lime, 8);
        rect(wg, -w / 2 + 4, -h / 2 + 4, w - 8, 30, 0, `url(#${uid}h)`);
        rect(wg, -w / 2 + 4, h / 2 - 34, w - 8, 30, 0, `url(#${uid}h)`);
        const tg = g(wg, { transform: 'rotate(-90)' });
        text(tg, l1, 0, -14, s1, C.paper, { anchor: 'middle', len: f2(Math.min(bw(l1, s1), 580)) });
        text(tg, l2, 0, 62, s2, C.lime, { anchor: 'middle', mono: true, len: f2(mw(l2, s2)) });
        return { g: wg, cx };
      };
      st.wm = mkWall(1255, 'TON ARGENT', 68, money(bank), 56);
      st.wl = mkWall(170, 'PLAFOND DE LA TABLE', 48, money(limit), 56);

      /* ---- éclats de l'écrasement ---- */
      const rr = rng(4242);
      st.deb = [];
      for (let k = 0; k < 9; k++) {
        const s = 8 + rr() * 10;
        const n = rect(root, -s / 2, -s / 2, s, s, 1, [C.red, C.paper, C.lime][k % 3], C.ink, 3);
        n.setAttribute('visibility', 'hidden');
        st.deb.push({ n, vx: 120 + rr() * 260, vy: -160 - rr() * 260, rot: rr() * 360 });
      }
      return st;
    },

    update(st, t) {
      try {
        t = clamp(t, 0, st.dur + 1);
        const { c, a, rows, lossT } = st;
        const ph = (t0, d) => (t0 == null ? 0 : prog(t, t0, t0 + d));

        /* secousse globale (écrasement contre le plafond) */
        const tCrash = c.wl != null && st.tGhost != null ? c.wl + 0.45 : null;
        const sh = tCrash != null ? shakeAt(t, tCrash, 12, 0.35) : [0, 0];
        setA(st.world, 'transform', `translate(${f2(sh[0])} ${f2(sh[1])})`);

        /* défilement : la colonne monte quand il y a plus de VIS lignes */
        let off = 0;
        for (let i = VIS + 1; i <= st.nTot; i++) if (a[i] != null) off += E.out3(ph(a[i], 0.35));

        /* état de chaque ligne */
        let shown = 0;
        for (let i = 1; i <= st.nTot; i++) {
          const r = rows[i];
          if (!r) continue;
          const ai = a[i];
          const on = ai != null && t >= ai;
          const y0 = RY0 + (i - 1) * RH - off * RH;
          if (!on || y0 + PH < CLIP0 + 8 || y0 > CLIP1 + 20) { vis(r.g, false); setA(r.g, 'opacity', 0); setA(r.g, 'transform', 'translate(0 0)'); if (on && !r.ghost) shown = i; continue; }
          if (!r.ghost) shown = i;
          const p = E.out3(prog(t, ai, ai + 0.25));
          vis(r.g, true);
          setA(r.g, 'opacity', f2(p));
          if (r.ghost) {
            const crashed = tCrash != null && t >= tCrash;
            const dx = crashed ? 0 : 0;
            setA(r.g, 'transform', `translate(${dx} ${f2(y0 + (1 - p) * 34)})`);
            setA(r.pl, 'stroke', crashed ? C.red : C.paper);
            setA(r.pl, 'stroke-width', crashed ? 6 : 4);
            setTxt(r.tag, crashed ? 'REFUSÉE' : 'TA 11e MISE', 26);
            setA(r.tag, 'fill', crashed ? C.red : C.paper);
            setA(r.sh, 'fill', C.ink);
            continue;
          }
          const lostT = i <= lossT.length ? lossT[i - 1] : null;
          const lost = lostT != null && t >= lostT;
          const won = i === st.winRow && t >= st.tWin;
          const s = lost ? 'lost' : won ? 'won' : 'pend';
          const sk = lost ? shakeAt(t, lostT, 4, 0.22) : [0, 0];
          setA(r.g, 'transform', `translate(${f2(sk[0])} ${f2(y0 + (1 - p) * 34 + sk[1])})`);
          setA(r.pl, 'fill', s === 'won' ? C.lime : s === 'pend' ? C.paper : C.pocket);
          setA(r.pl, 'stroke', s === 'pend' ? C.ink : s === 'won' ? C.ink : C.paper);
          setA(r.pl, 'stroke-width', s === 'lost' ? 4 : 6);
          setA(r.sh, 'fill', s === 'pend' ? C.lime : C.ink);
          setA(r.bet, 'fill', s === 'lost' ? C.paper : C.ink);
          setA(r.n, 'fill', s === 'lost' ? '#B9B5A8' : C.ink);
          vis(r.slot, s === 'pend'); vis(r.q, s === 'pend');
          setA(r.slot, 'stroke', C.ink); setA(r.q, 'fill', C.ink);
          const bp = s === 'pend' ? 0 : E.back(prog(t, s === 'lost' ? lostT : st.tWin, (s === 'lost' ? lostT : st.tWin) + 0.22));
          vis(r.ball, s !== 'pend');
          setA(r.ball, 'fill', s === 'won' ? C.red : C.ink);
          setA(r.ball, 'stroke', s === 'won' ? C.ink : C.paper);
          setA(r.ball, 'r', f2(27 * Math.max(0.01, bp)));
          setTxt(r.tag, s === 'lost' ? 'PERDU' : s === 'won' ? 'ROUGE !' : 'SUR LE ROUGE', 26);
          setA(r.tag, 'fill', s === 'lost' ? C.red : C.ink);
          vis(r.cum, s === 'lost'); vis(r.gain, s === 'won');
        }

        /* règle (bandeau) */
        {
          const p = c.rule != null ? E.back(ph(c.rule, 0.3)) : 0;
          put(st.rule, 730, 98, -1.5, Math.max(p, 0), Math.max(p, 0), c.rule != null && t >= c.rule ? 1 : 0);
        }

        /* compteur de tour (zone gauche) */
        {
          const ts = st.tStart;
          const wl = c.wl != null ? E.in3(ph(c.wl, 0.45)) : 0;
          const n = Math.max(1, Math.min(shown, st.maxRows));
          const s = String(n);
          if (st.tourN.__s !== s) { st.tourN.__s = s; st.tourN.textContent = s; st.tourN.setAttribute('textLength', f2(bw(s, 190))); }
          vis(st.tour, ts != null && t >= ts && wl < 0.5);
        }

        /* ×2 (couloir de droite) */
        {
          const wm = c.wm != null ? E.in3(ph(c.wm, 0.45)) : 0;
          const p = c.rule != null ? E.back(ph(c.rule + 0.2, 0.3)) : (st.tStart != null ? E.back(ph(st.tStart, 0.3)) : 0);
          put(st.x2, 1255, 150, 4, Math.max(p, 0), Math.max(p, 0), wm < 0.5 && p > 0 ? 1 : 0);
        }

        /* compteur géant du cumul */
        {
          let v = 0, lastK = 0;
          for (let k = 0; k < lossT.length; k++) if (t >= lossT[k]) lastK = k + 1;
          if (lastK > 0) {
            const t0 = lossT[lastK - 1];
            v = st.cum(lastK - 1) + (st.cum(lastK) - st.cum(lastK - 1)) * E.out3(prog(t, t0, t0 + 0.3));
          }
          const tt = c.total;
          if (tt != null && t >= tt) v = Math.max(v, st.cum(lastK) + (st.cumAll - st.cum(lastK)) * E.out3(prog(t, tt, tt + 0.5)));
          const on = v > 0;
          const hot = tt != null && t >= tt;
          const sTxt = st.money(Math.round(v));
          const size = Math.min(92, 440 / (sTxt.length * 0.6));
          if (st.ctNum.__s !== sTxt) { st.ctNum.__s = sTxt; st.ctNum.textContent = sTxt; }
          setA(st.ctNum, 'font-size', f2(size)); setA(st.ctNum, 'textLength', f2(mw(sTxt, size)));
          setA(st.ctNum, 'fill', hot ? C.red : C.paper);
          setA(st.ctPl, 'stroke', hot ? C.red : C.paper);
          const q = hot ? prog(t, tt, tt + 0.22) : 1;
          const scl = hot ? 1 + 0.14 * (1 - E.out3(q)) : 1;
          const sk2 = hot ? shakeAt(t, tt + 0.1, 10, 0.4) : [0, 0];
          setA(st.ct, 'transform', `translate(${f2(PX + sk2[0])} ${f2(300 + sk2[1])}) scale(${f2(scl)}) translate(${-PX} -300)`);
          vis(st.ct, on);
        }

        /* sticker « POUR GAGNER 10 € » */
        {
          const tt = c.total != null ? c.total + 0.3 : null;
          const p = tt != null ? E.back(ph(tt, 0.28)) : 0;
          put(st.stk, PX, 505, 2.5, Math.max(p, 0), Math.max(p, 0), tt != null && t >= tt ? 1 : 0);
        }

        /* bandeau de victoire */
        {
          const tw = st.tWin != null ? st.tWin + 0.3 : null;
          const p = tw != null ? E.back(ph(tw, 0.3)) : 0;
          put(st.win, PX, 685, -2.5, Math.max(p, 0), Math.max(p, 0), tw != null && t >= tw ? 1 : 0);
        }

        /* mur de l'argent (tombe de la droite) */
        {
          const tm = c.wm;
          const p = tm != null ? E.in3(ph(tm, 0.45)) : 0;
          const s2 = tm != null ? shakeAt(t, tm + 0.45, 9, 0.35) : [0, 0];
          put(st.wm.g, st.wm.cx + (1 - p) * 900 + s2[0], 450 + s2[1], 0, 1, 1, tm != null && t >= tm ? 1 : 0);
        }
        /* plafond de la table (tombe de la gauche) */
        {
          const tm = c.wl;
          const p = tm != null ? E.in3(ph(tm, 0.45)) : 0;
          const s2 = tm != null ? shakeAt(t, tm + 0.45, 9, 0.35) : [0, 0];
          put(st.wl.g, st.wl.cx - (1 - p) * 600 + s2[0], 450 + s2[1], 0, 1, 1, tm != null && t >= tm ? 1 : 0);
        }

        /* éclats de l'écrasement : la 11e mise contre le plafond */
        {
          const gr = st.rows[st.ghostI];
          const q = tCrash != null ? t - tCrash : -1;
          const ok = gr && q >= 0 && q < 0.6;
          const gy = RY0 + (st.ghostI - 1) * RH - ((() => { let o = 0; for (let i = VIS + 1; i <= st.nTot; i++) if (a[i] != null) o += E.out3(prog(t, a[i], a[i] + 0.35)); return o; })()) * RH + PH / 2;
          for (const d of st.deb) {
            if (!ok) { vis(d.n, false); continue; }
            vis(d.n, true);
            d.n.setAttribute('transform', `translate(${f2(RX + 4 + d.vx * q * 0.5)} ${f2(gy + d.vy * q + 700 * q * q)}) rotate(${f2(d.rot + q * 300)})`);
            setA(d.n, 'opacity', f2(1 - E.in2(q / 0.6)));
          }
        }
      } catch (e) { /* jamais d'exception */ }
    }
  });
})();
;
/* ==== tools/video/composition/components/money-wheel.js ==== */
// Composant `money-wheel` (épisode 5) : la grande roue de l'entrée, 54 cases, une aiguille, le tableau des mises. Voir EP5-COMPONENTS.md.
// Fonction pure du temps ; aplats, aucun dégradé / flou / filter. Vitesse de pointe ≤ 0,35 tour/s.
// Cues : count, bet, spin (dur), land, simple, edge, worst, lights, entrance.
(() => {
  'use strict';
  const { C, E, clamp, prog, f2, sv, g, rect, circle, path, text, put } = ZV;
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const vis = (n, on) => n.setAttribute('visibility', on ? 'visible' : 'hidden');
  const meas = (n, est) => { try { const L = n.getComputedTextLength(); if (L > 0) return L; } catch (e) { /* estimation */ } return est; };
  const mw = (s, size) => String(s).length * size * 0.6;
  const S = (v) => (v == null || v === '' ? null : String(v));

  const CX = 700, CY = 450, R = 340;
  const SEQ = ['★', 1, 2, 1, 5, 1, 2, 10, 1, 2, 1, 5, 1, 20, 2, 1, 2, 5, 1, 1, 2, 10, 1, 1, 5, 2, 1, '◆', 2, 1, 1, 5, 2, 1, 10, 2, 1, 1, 5, 2, 1, 20, 1, 2, 1, 5, 2, 1, 10, 1, 2, 1, 2, 1];
  const N = SEQ.length, STEP = 360 / N;
  const STY = { 1: [C.paper, C.ink], 2: [C.lime, C.ink], 5: [C.red, C.paper], 10: [C.pocket, C.paper], 20: [C.ink, C.lime], '★': [C.red, C.white], '◆': [C.lime, C.ink] };
  const CASES = ['1', '2', '5', '10', '20', '★', '◆'];
  const MARGIN = { 1: 11, 2: 17, 5: 22, 10: 19, 20: 22, '★': 24, '◆': 24 };    // longueurs relatives des barres (pas des valeurs affichées)
  const BX = 1180, BW = 220, BH = 72, BY0 = 140, BP = 88, BARX = 1430, BSC = 12.5;
  const caseY = (k) => BY0 + k * BP;
  const rad = (a) => a * Math.PI / 180;
  const pt = (r, a) => [r * Math.sin(rad(a)), -r * Math.cos(rad(a))];
  const wedge = (r0, r1, a0, a1) => {
    const A = pt(r0, a0), B = pt(r1, a0), Cc = pt(r1, a1), D = pt(r0, a1), f = (p) => f2(p[0]) + ' ' + f2(p[1]);
    return `M${f(A)}L${f(B)}A${r1} ${r1} 0 0 1 ${f(Cc)}L${f(D)}A${r0} ${r0} 0 0 0 ${f(A)}Z`;
  };
  const star = (cx, cy, ro, ri) => { let d = ''; for (let k = 0; k < 10; k++) { const r = k % 2 ? ri : ro, a = rad(k * 36); d += (k ? 'L' : 'M') + f2(cx + r * Math.sin(a)) + ' ' + f2(cy - r * Math.cos(a)); } return d + 'Z'; };
  const diamond = (cx, cy, rx, ry) => `M${cx} ${cy - ry}L${cx + rx} ${cy}L${cx} ${cy + ry}L${cx - rx} ${cy}Z`;
  const wrap = (x) => x - Math.round(x);

  function mkPlate(parent, lines, o) {
    o = o || {};
    const grp = g(parent), r = o.r === undefined ? 14 : o.r, off = o.sh === undefined ? 8 : o.sh;
    const sh = rect(grp, 0, 0, 1, 1, r, o.shadow || C.ink);
    const pl = rect(grp, 0, 0, 1, 1, r, o.fill || C.paper, o.stroke || C.ink, o.sw || 6);
    let w = 0, h = 0;
    const ts = lines.map((L) => {
      const n = text(grp, L.s, 0, 0, L.size, L.fill || o.textFill || C.ink, { anchor: 'middle', mono: L.mono });
      w = Math.max(w, meas(n, L.mono ? mw(L.s, L.size) : String(L.s).length * L.size * 0.58)); h += L.size * 1.15;
      return { n, L };
    });
    const px = o.padX === undefined ? 28 : o.padX, py = o.padY === undefined ? 14 : o.padY;
    w += px * 2; h += py * 2;
    let y = -h / 2 + py;
    for (const k of ts) { const lh = k.L.size * 1.15; k.n.setAttribute('y', f2(y + lh / 2 + k.L.size * 0.33)); y += lh; }
    for (const [n, d] of [[sh, off], [pl, 0]]) { n.setAttribute('x', f2(-w / 2 + d)); n.setAttribute('y', f2(-h / 2 + d)); n.setAttribute('width', f2(w)); n.setAttribute('height', f2(h)); }
    return { g: grp, w, h };
  }

  ZV.define('money-wheel', {
    init(root, shot) {
      const P = shot.props || {};
      const beats = Array.isArray(shot.beats) ? shot.beats : [];
      const st = { dur: isNum(shot.dur) && shot.dur > 0 ? shot.dur : 10 };
      const cl = (n) => beats.filter((b) => b && b.do === 'cue' && b.name === n && isNum(b.t)).sort((a, b) => a.t - b.t);
      const c1 = (n) => { const b = cl(n)[0]; return b ? b.t : null; };
      const c = st.c = {}; for (const n of ['count', 'bet', 'spin', 'land', 'simple', 'edge', 'worst', 'lights', 'entrance']) c[n] = c1(n);
      st.edgeLow = S(P.edge_low) || '11 %'; st.edgeHigh = S(P.edge_high) || '24 %'; const countLabel = S(P.count_label) || '54 CASES';
      let L = Math.round(+P.land); if (!isFinite(L)) L = 6; L = ((L % N) + N) % N; st.L = L;
      const betK = Math.max(0, CASES.indexOf(S(P.bet) || '★')); st.betK = betK;

      /* ---- rotation : décélération puissance 2.2, pointe ≤ 0,35 tour/s ---- */
      let sdur = 6; const sb = cl('spin')[0]; if (sb && isNum(+sb.dur) && +sb.dur > 0.5) sdur = +sb.dur;
      const cw = ((N - L) % N) * STEP;
      const cap = 0.34 * 360 * sdur / 2.2;
      let best = null, small = null;
      for (let k = 0; k < 5; k++) for (const v of [cw + 360 * k, cw - 360 * (k + 1)]) {
        if (Math.abs(v) <= cap && (best === null || Math.abs(v) > Math.abs(best))) best = v;
        if (small === null || Math.abs(v) < Math.abs(small)) small = v;
      }
      if (best === null || Math.abs(best) < 60) { best = small; sdur = Math.max(sdur, Math.abs(best) * 2.2 / (0.34 * 360)); }
      st.phiF = best; st.sdur = sdur; st.dir = best < 0 ? -1 : 1;

      rect(root, 0, 0, 1920, 1080, 0, C.ink);

      /* ---- roue ---- */
      const WG = g(root, { transform: `translate(${CX} ${CY})` });
      const rot = st.rot = g(WG);
      st.outl = [];
      for (let i = 0; i < N; i++) {
        const v = SEQ[i], sty = STY[v] || STY[1];
        path(rot, wedge(76, R, (i - 0.5) * STEP, (i + 0.5) * STEP), sty[0], C.ink, 3);
      }
      circle(rot, 0, 0, 252, 'none', C.ink, 3);
      for (let i = 0; i < N; i++) {
        const v = SEQ[i], sty = STY[v] || STY[1], a = i * STEP;
        if (v === '★' || v === '◆') {
          const gg = g(rot, { transform: `rotate(${f2(a)})` });
          if (v === '★') path(gg, star(0, -292, 19, 8), sty[1], C.ink, 2); else path(gg, diamond(0, -292, 12, 20), sty[1], C.ink, 2);
        } else text(rot, String(v), 0, 0, 32, sty[1], { anchor: 'middle' }).setAttribute('transform', `rotate(${f2(a)}) translate(0 -292) rotate(-90) translate(0 ${f2(32 * 0.35)})`);
      }
      for (let i = 0; i < N; i++) { const p = pt(326, (i + 0.5) * STEP); circle(rot, f2(p[0]), f2(p[1]), 7, C.paper, C.ink, 2); }
      st.landOut = path(rot, wedge(76, R, (L - 0.5) * STEP, (L + 0.5) * STEP), 'none', C.paper, 8, { visibility: 'hidden', 'stroke-linejoin': 'miter' });
      st.cg = g(rot);
      for (let i = 0; i < N; i++) st.outl.push(path(st.cg, wedge(78, R - 2, (i - 0.5) * STEP, (i + 0.5) * STEP), 'none', C.lime, 5, { visibility: 'hidden', 'stroke-linejoin': 'miter' }));
      circle(WG, 0, 0, 345, 'none', C.paper, 10);
      circle(WG, 0, 0, 70, C.paper, C.ink, 8);
      circle(WG, 0, 0, 16, C.ink);

      /* ---- ampoules ---- */
      st.bulbs = g(root);
      st.bl = [];
      for (let j = 0; j < 27; j++) { const p = pt(368, (j + 0.5) * 360 / 27); st.bl.push(circle(st.bulbs, f2(CX + p[0]), f2(CY + p[1]), 9, C.paper, C.ink, 3)); }
      st.bulbs.setAttribute('visibility', 'hidden');

      /* ---- aiguille ---- */
      st.needle = g(root, { transform: `translate(${CX} 90)` });
      st.nd = g(st.needle);
      path(st.nd, 'M-11 -4L11 -4L6 40L0 50L-6 40Z', C.red, C.ink, 4);
      circle(st.needle, 0, 0, 9, C.paper, C.ink, 4);

      /* ---- compteur « 54 CASES » ---- */
      st.cnt = g(root); st.cnt.setAttribute('visibility', 'hidden');
      const m = countLabel.match(/^\s*(\d+)\s*(.*)$/);
      st.cntN = m ? +m[1] : N; st.cntHas = !!m;
      st.cNum = text(st.cnt, String(st.cntN), 175, 478, 112, C.lime, { anchor: 'middle' });
      st.cRest = text(st.cnt, m ? m[2] : countLabel, 175, 524, 34, C.paper, { mono: true, anchor: 'middle' });
      rect(st.cnt, 95, 540, 160, 8, 0, C.lime);

      /* ---- tableau des mises ---- */
      rect(root, 1160 + 10, 92 + 10, 700, 690, 10, C.ink);
      rect(root, 1160, 92, 700, 690, 10, C.pocket, C.paper, 4);
      st.title = text(root, 'TABLEAU DES MISES', 1190, 128, 26, C.paper, { mono: true, anchor: 'start', spacing: 1 });
      st.kick = text(root, 'SELON LA CASE, LA MAISON GARDE', 1190, 128, 26, C.lime, { mono: true, anchor: 'start', spacing: 1 });
      st.kick.setAttribute('visibility', 'hidden');
      st.cases = CASES.map((id, k) => {
        const y = caseY(k), sty = STY[id], cy = y + BH / 2, o = {};
        rect(root, BX + 10, y + 10, BW, BH, 8, C.ink);
        rect(root, BX, y, BW, BH, 8, sty[0], C.ink, 6);
        if (id === '10' || id === '20') rect(root, BX + 6, y + 6, BW - 12, BH - 12, 4, 'none', C.paper, 2);
        if (id === '★') path(root, star(BX + 62, cy, 26, 11), sty[1], C.ink, 3);
        else if (id === '◆') path(root, diamond(BX + 62, cy, 18, 28), sty[1], C.ink, 3);
        else text(root, id, BX + 62, cy + 20, 58, sty[1], { anchor: 'middle' });
        circle(root, BX + 165, cy, 28, 'none', sty[1], 3).setAttribute('stroke-dasharray', '7 6');
        o.y = y; o.cy = cy; return o;
      });
      // barres de marge
      st.bars = CASES.map((id, k) => {
        const cy = caseY(k) + BH / 2, o = { id, len: MARGIN[id] * BSC };
        o.r = rect(root, BARX, cy - 18, 1, 36, 4, C.red, C.paper, 3);
        o.t = id === '1' ? st.edgeLow : id === '★' || id === '◆' ? st.edgeHigh : null;
        o.tx = o.t ? text(root, o.t, 0, cy + 13, 38, C.paper, { mono: true, anchor: 'start' }) : null;
        o.cy = cy; return o;
      });
      // étiquettes « simple »
      st.simple = ['AUCUNE RÈGLE À APPRENDRE', 'AUCUNE DÉCISION', 'UN SEUL GESTE'].map((s, i) => {
        const pl = mkPlate(root, [{ s, size: 24, mono: true }], { fill: C.paper, padX: 14, padY: 8, sw: 5, sh: 6, r: 8 });
        return { pl, x: BARX - 10 + pl.w / 2, y: 200 + i * 78 };
      });
      // voile + cercles + gros 24 %
      st.veil = rect(root, 1166, 130, 688, 444, 0, C.ink, null, 0, { opacity: 0, visibility: 'hidden' });
      st.rings = [5, 6].map((k) => rect(root, BX - 4, caseY(k) - 4, BW + 8, BH + 8, 10, 'none', C.red, 8, { visibility: 'hidden', pathLength: 1 }));
      st.big = text(root, st.edgeHigh, 1630, 408, 140, C.red, { anchor: 'middle' });
      const bl = meas(st.big, st.edgeHigh.length * 140 * 0.6);
      if (bl > 440) { st.big.setAttribute('textLength', 440); st.big.setAttribute('lengthAdjust', 'spacingAndGlyphs'); }
      st.big.setAttribute('visibility', 'hidden');
      st.pas = mkPlate(root, [{ s: 'PAS 2,7 %', size: 46 }], { fill: C.lime, padX: 26, padY: 12 }); st.pas.g.setAttribute('visibility', 'hidden');
      // jeton
      st.chip = g(root);
      circle(st.chip, 5, 6, 34, C.ink);
      circle(st.chip, 0, 0, 34, C.white, C.ink, 6);
      circle(st.chip, 0, 0, 20, 'none', C.ink, 4).setAttribute('stroke-dasharray', '9 6');
      st.chip.setAttribute('visibility', 'hidden');
      // panneau d'entrée
      st.ent = g(root);
      path(st.ent, 'M38 112L66 112L66 98L94 118L66 138L66 124L38 124Z', C.paper, C.ink, 3);
      st.entPl = mkPlate(st.ent, [{ s: "PRÈS DE L'ENTRÉE", size: 22, mono: true }], { fill: C.paper, padX: 14, padY: 8, sw: 5, sh: 6, r: 8 });
      st.entPl.g.setAttribute('transform', `translate(${f2(104 + st.entPl.w / 2)} 118)`);
      st.ent.setAttribute('visibility', 'hidden');
      return st;
    },

    update(st, t) {
      try {
        t = clamp(t, 0, st.dur + 1);
        const c = st.c;
        /* rotation */
        let phi = 0, rate = 0;
        if (c.spin != null) {
          const p = prog(t, c.spin, c.spin + st.sdur);
          phi = st.phiF * (1 - Math.pow(1 - p, 2.2));
          rate = p < 1 && p > 0 ? Math.abs(st.phiF * 2.2 * Math.pow(1 - p, 1.2) / st.sdur) / STEP : 0;
        } else if (c.land != null) phi = st.phiF;
        setA(st.rot, 'transform', `rotate(${f2(phi)})`);
        /* aiguille : flexion à chaque picot (dent de scie), amplitude réduite aux fortes cadences */
        const o = wrap(phi / STEP + 0.5), u = st.dir * o;
        const saw = u <= 0 ? clamp((u + 0.45) / 0.45, 0, 1) : Math.max(0, 1 - u / 0.1);
        const amp = 22 * (rate > 7 ? clamp(7 / rate, 0.18, 1) : 1);
        setA(st.nd, 'transform', `rotate(${f2(-st.dir * amp * saw)})`);

        /* contour « count » + compteur */
        if (c.count != null && t >= c.count) {
          const p = prog(t, c.count, c.count + 1.8);
          const k = Math.min(N, Math.floor(N * p) + (p > 0 ? 1 : 0));
          for (let i = 0; i < N; i++) vis(st.outl[i], i < k);
          const fade = c.spin != null && t >= c.spin ? 1 - prog(t, c.spin, c.spin + 0.4) : 1;
          setA(st.cg, 'opacity', f2(fade));
          vis(st.cnt, true);
          const n = Math.round(st.cntN * E.out2(p));
          const s = st.cntHas ? String(n) : String(Math.min(N, Math.round(N * E.out2(p))));
          if (st.cNum.__s !== s) { st.cNum.__s = s; st.cNum.textContent = s; }
          setA(st.cnt, 'opacity', f2(clamp(prog(t, c.count, c.count + 0.2))));
        } else { for (let i = 0; i < N; i++) vis(st.outl[i], false); vis(st.cnt, false); }

        /* case d'arrêt */
        if (c.land != null && t >= c.land) {
          const p = prog(t, c.land, c.land + 0.35);
          vis(st.landOut, true); setA(st.landOut, 'opacity', f2(Math.min(1, E.out3(p) * 1.2)));
          setA(st.landOut, 'stroke-width', f2(8 + 10 * (1 - E.out3(p))));
        } else vis(st.landOut, false);

        /* ampoules : bascule toutes les 0,4 s (2,5 changements/s) */
        const lon = c.lights != null && t >= c.lights;
        vis(st.bulbs, lon);
        if (lon) { const ph = Math.floor((t - c.lights) / 0.4); for (let j = 0; j < st.bl.length; j++) setA(st.bl[j], 'fill', (j + ph) % 2 ? C.lime : C.paper); }

        /* panneau « près de l'entrée » */
        if (c.entrance != null && t >= c.entrance) { const s = E.back(prog(t, c.entrance, c.entrance + 0.3)); vis(st.ent, true); st.ent.setAttribute('opacity', f2(Math.min(1, s))); st.ent.setAttribute('transform', `translate(${f2(-60 * (1 - E.out3(prog(t, c.entrance, c.entrance + 0.3))))} 0)`); } else vis(st.ent, false);

        /* étiquettes « simple » (s'effacent à edge / worst) */
        const sEnd = Math.min(c.edge == null ? Infinity : c.edge, c.worst == null ? Infinity : c.worst);
        st.simple.forEach((q, i) => {
          const t0 = c.simple == null ? null : c.simple + i * 0.35;
          const on = t0 != null && t >= t0 && t < sEnd + 0.3;
          vis(q.pl.g, on); if (!on) return;
          const s = E.back(prog(t, t0, t0 + 0.3)), a = t > sEnd ? 1 - prog(t, sEnd, sEnd + 0.3) : 1;
          put(q.pl.g, q.x, q.y, i % 2 ? 1.5 : -1.5, Math.max(s, 0.001), Math.max(s, 0.001), a);
        });

        /* marges */
        const eOn = c.edge != null && t >= c.edge;
        vis(st.kick, eOn); setA(st.title, 'opacity', eOn ? f2(1 - prog(t, c.edge, c.edge + 0.25)) : 1);
        setA(st.kick, 'opacity', eOn ? f2(prog(t, c.edge + 0.1, c.edge + 0.35)) : 0);
        st.bars.forEach((b, k) => {
          const t0 = c.edge == null ? null : c.edge + 0.15 + k * 0.1;
          const on = t0 != null && t >= t0;
          vis(b.r, on); if (b.tx) vis(b.tx, false);
          if (!on) return;
          const p = E.out3(prog(t, t0, t0 + 0.55));
          const w = Math.max(2, b.len * p);
          setA(b.r, 'width', f2(w));
          if (b.tx) { setA(b.tx, 'x', f2(BARX + w + 16)); vis(b.tx, p > 0.85); }
        });

        /* pire marge */
        const wOn = c.worst != null && t >= c.worst;
        setA(st.veil, 'opacity', wOn ? f2(0.9 * E.out2(prog(t, c.worst, c.worst + 0.3))) : 0); vis(st.veil, wOn);
        st.rings.forEach((r, i) => { vis(r, wOn); if (wOn) setA(r, 'stroke-dasharray', `${f2(E.out3(prog(t, c.worst + 0.1 + i * 0.1, c.worst + 0.6 + i * 0.1)))} 2`); });
        vis(st.big, wOn); vis(st.pas.g, wOn);
        if (wOn) {
          const s = E.back(prog(t, c.worst + 0.15, c.worst + 0.55));
          setA(st.big, 'transform', `translate(1630 ${f2(408 - 70)}) scale(${f2(Math.max(s, 0.001))}) translate(-1630 ${f2(-(408 - 70))})`);
          const s2 = E.back(prog(t, c.worst + 0.5, c.worst + 0.8));
          put(st.pas.g, 1630, 520, -3, Math.max(s2, 0.001), Math.max(s2, 0.001), 1);
        }

        /* jeton */
        if (c.bet != null && t >= c.bet) {
          const p = prog(t, c.bet, c.bet + 0.9), cy = st.cases[st.betK].cy;
          vis(st.chip, true);
          put(st.chip, BX + 165, cy - (1 - E.bounce(p)) * (cy + 60), 0, 1, 1, 1);
        } else vis(st.chip, false);
      } catch (e) { /* jamais d'exception */ }
    }
  });
})();
;
/* ==== tools/video/composition/components/newspaper.js ==== */
// Composant `newspaper` : unes de journaux (spin), couverture de partition (sheet), partition qui danse contre tertre immobile (split).
(() => {
  const { C, sv, g, f2, E, prog, clamp, lerp, put, show, text, rect, circle, path } = ZV;
  const INK = C.ink;
  const Z0 = (v, d) => (v == null ? d : v);
  const popE = (p) => E.back(clamp(p));
  let UID = 0;

  const measCache = {};
  function meas(root, str, size, mono) {
    const key = str + '|' + size + '|' + (mono ? 1 : 0);
    if (measCache[key] != null) return measCache[key];
    let w = str.length * size * 0.6;
    try {
      const n = text(root, str, 0, 0, size, '#000', { mono });
      const b = n.getComputedTextLength();
      root.removeChild(n);
      if (b > 0) w = b;
    } catch (e) { /* estimation */ }
    measCache[key] = w;
    return w;
  }
  function bg(root, color, dotColor) {
    rect(root, 0, 0, 1920, 1080, 0, color);
    const id = 'np' + (++UID);
    const defs = sv('defs', null, root);
    const pat = sv('pattern', { id, width: 56, height: 56, patternUnits: 'userSpaceOnUse' }, defs);
    sv('circle', { cx: 28, cy: 28, r: 3.2, fill: dotColor, opacity: 0.1 }, pat);
    rect(root, 0, 0, 1920, 1080, 0, `url(#${id})`);
  }
  function pict(parent, name, o) {
    if (ZV.PICTO && ZV.PICTO.mk) return ZV.PICTO.mk(parent, name, o);
    const gg = g(parent);
    rect(gg, -100, -100, 200, 200, 20, C.paper, INK, 6);
    return { root: gg, body: gg, refs: {}, shRefs: {} };
  }
  // coupe « IL A FAIT SAUTER LA BANQUE » en deux lignes équilibrées
  function split2(str) {
    const w = str.split(' ');
    let best = null;
    for (let k = 1; k < w.length; k++) {
      const a = w.slice(0, k).join(' '), b = w.slice(k).join(' ');
      const d = Math.abs(a.length - b.length);
      if (!best || d < best.d) best = { a, b, d };
    }
    return best ? [best.a, best.b] : [str];
  }

  /* ------------------------------------------------------------------ */
  /*  La une                                                             */
  /* ------------------------------------------------------------------ */
  function buildSheet(root, page, seed, pw, ph) {
    const grp = g(root);
    const rnd = ZV.rng(seed);
    rect(grp, -pw / 2 + 14, -ph / 2 + 14, pw, ph, 12, INK);
    rect(grp, -pw / 2, -ph / 2, pw, ph, 12, C.paper, INK, 6);
    // en-tête : le nom de la ville seulement
    const mh = 92, top = -ph / 2 + 16;
    rect(grp, -pw / 2 + 16, top, pw - 32, mh, 6, INK);
    const name = page.masthead || '';
    const nw = Math.min(pw - 170, meas(root, name, 64, false));
    text(grp, name, 0, top + 66, 64, C.paper, { anchor: 'middle', len: nw });
    [-1, 1].forEach((s) => { const d = g(grp, { transform: `translate(${s * (nw / 2 + 44)} ${top + mh / 2}) rotate(45)` }); rect(d, -11, -11, 22, 22, 0, C.lime); });
    rect(grp, -pw / 2 + 16, top + mh + 14, pw - 32, 10, 0, INK);
    // gros titre sur 2 lignes
    const lines = split2(page.headline || '');
    const maxW = pw - 60;
    const wBase = Math.max(...lines.map((l) => meas(root, l, 100, false)));
    const hs = Math.min(86, 100 * maxW / wBase);
    lines.forEach((l, i) => text(grp, l, 0, top + mh + 14 + 10 + hs * 0.92 + i * hs * 1.02, hs, INK, { anchor: 'middle', len: Math.min(maxW, meas(root, l, hs, false)) }));
    const y0 = top + mh + 24 + lines.length * hs * 1.02 + 26;
    // photo : silhouette plate de Wells dans un cadre lime
    const phW = 250, phH = 176;
    rect(grp, -pw / 2 + 28, y0, phW, phH, 8, C.lime, INK, 6);
    const sil = pict(grp, 'wells', { bg: 'paper' });
    put(sil.root, -pw / 2 + 28 + phW / 2, y0 + phH - 70, 0, 0.62, 0.62, 1);
    rect(grp, -pw / 2 + 28 + 6, y0 + phH - 18, phW - 12, 12, 0, INK);
    // légende et colonnes : barres pleines de 14 px
    const bx = -pw / 2 + 28 + phW + 22, bw = pw / 2 - 28 - bx;
    for (let i = 0; i < 6; i++) rect(grp, bx, y0 + 4 + i * 29, bw * (i === 5 ? 0.55 : 0.86 + rnd() * 0.14), 14, 0, INK);
    const y1 = y0 + phH + 26, colW = (pw - 56 - 36) / 3;
    const rows = Math.max(3, Math.floor((ph / 2 - 28 - y1) / 26));
    for (let c = 0; c < 3; c++) for (let r = 0; r < rows; r++) {
      const last = r === rows - 1;
      rect(grp, -pw / 2 + 28 + c * (colW + 18), y1 + r * 26, colW * (last ? 0.5 + rnd() * 0.3 : 0.9 + rnd() * 0.1), 14, 0, INK);
    }
    return grp;
  }

  function buildSpin(st, root, shot, pr) {
    bg(root, C.lime, INK);
    const pages = pr.pages && pr.pages.length ? pr.pages : [{ cue: 'p1', masthead: 'LONDRES', headline: 'IL A FAIT SAUTER LA BANQUE' }];
    st.pages = pages.slice(0, 3).map((p, k) => {
      const pw = 620, ph = 700;
      const grp = buildSheet(root, p, 11 + k * 7, pw, ph);
      const n = pages.length;
      const fx = n === 1 ? 960 : 680 + k * (560 / Math.max(1, n - 1)), fy = 470 + (k % 2 ? 24 : -10);
      return { grp, t0: Z0(ZV.cue(shot, p.cue), k * 1.0), fx, fy, tilt: k % 2 ? 3.5 : -4, k };
    });
  }
  function tickSpin(st, t) {
    for (const p of st.pages) {
      const q = prog(t, p.t0, p.t0 + 18 / 30), e = E.out3(q);
      const sc = lerp(0.1, 1, e);
      const rot = p.tilt + 720 * (1 - e);
      const x = lerp(960, p.fx, e), y = lerp(560, p.fy, e);
      const sh = ZV.shakeAt(t, p.t0 + 18 / 30, 10, 0.4);
      put(p.grp, x + sh[0], y + sh[1], rot, sc, sc, t >= p.t0 ? 1 : 0);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Portée et notes qui sautillent                                     */
  /* ------------------------------------------------------------------ */
  function staff(parent, w, n, gap, color) {
    const grp = g(parent);
    const half = gap / 2;
    for (let i = 0; i < 5; i++) rect(grp, -w / 2, i * gap - 4, w, 8, 0, color || INK);
    const pat = [6, 3, 4, 1, 5, 2, 4, 0, 3, 5];
    const notes = [];
    for (let k = 0; k < n; k++) {
      const x = -w / 2 + (k + 0.7) * (w / (n + 0.4));
      const idx = pat[k % pat.length];
      const y = idx * half;
      const ng = g(grp, { transform: `translate(${f2(x)} ${f2(y)})` });
      const body = g(ng);
      rect(body, 13, -gap * 2.1, 7, gap * 2.1, 0, INK);
      const hd = g(body);
      sv('ellipse', { cx: 0, cy: 0, rx: 18, ry: 13, fill: INK, transform: 'rotate(-18)' }, hd);
      notes.push({ ng, body, x, y, k });
    }
    return { grp, notes };
  }
  function hop(notes, t, amp, rate, phase) {
    notes.forEach((n) => {
      const ph = t * rate + n.k * (phase || 0.13);
      const h = Math.abs(Math.sin(Math.PI * ph)) * amp;
      const sq = 1 - 0.18 * Math.pow(Math.max(0, 1 - Math.abs(Math.sin(Math.PI * ph)) * 5), 1);
      n.ng.setAttribute('transform', `translate(${f2(n.x)} ${f2(n.y - h)})`);
      n.body.setAttribute('transform', `scale(${f2(1 + (1 - sq))} ${f2(sq)})`);
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Couverture de partition                                            */
  /* ------------------------------------------------------------------ */
  function ornament(grp, w, h, color) {
    // cadre géométrique simple : deux bordures et des losanges aux coins
    rect(grp, -w / 2 + 22, -h / 2 + 22, w - 44, h - 44, 8, 'none', color, 12);
    rect(grp, -w / 2 + 44, -h / 2 + 44, w - 88, h - 88, 4, 'none', INK, 5);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
      const d = g(grp, { transform: `translate(${sx * (w / 2 - 36)} ${sy * (h / 2 - 36)}) rotate(45)` });
      rect(d, -22, -22, 44, 44, 4, color, INK, 5);
      rect(d, -9, -9, 18, 18, 0, INK);
    });
    for (let k = 0; k < 11; k++) {
      [-1, 1].forEach((s) => rect(grp, -w / 2 + 84 + k * ((w - 168 - 14) / 10), s * (h / 2 - 66) - 7, 14, 14, 0, INK));
    }
  }
  function buildCover(st, root, shot, pr) {
    bg(root, INK, C.paper);
    const W = 640, H = 740;
    const grp = g(root);
    st.cover = grp;
    rect(grp, -W / 2 + 14, -H / 2 + 14, W, H, 14, C.lime);
    rect(grp, -W / 2, -H / 2, W, H, 14, C.paper, INK, 7);
    ornament(grp, W, H, C.lime);
    const title = (pr.sheet_title || 'L’HOMME QUI A FAIT SAUTER LA BANQUE À MONTE-CARLO');
    const lines = ['L’HOMME QUI', 'A FAIT SAUTER', 'LA BANQUE', 'À MONTE-CARLO'];
    // si le titre diffère du titre prévu, on le découpe automatiquement en lignes équilibrées
    const full = lines.join(' ');
    let L = lines;
    if (full !== title) {
      const words = title.split(' ');
      const per = Math.ceil(title.length / 4);
      L = []; let cur = '';
      words.forEach((w) => { if ((cur + ' ' + w).trim().length > per && cur) { L.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); });
      if (cur) L.push(cur);
    }
    const wBase = Math.max(...L.map((l) => meas(root, l, 100, false)));
    const fs = Math.min(70, 100 * 470 / wBase);
    st.lines = L.map((l, i) => {
      const y = -H / 2 + 150 + i * fs * 1.12;
      const w = meas(root, l, fs, false);
      const last = i === L.length - 1;
      const hl = last ? rect(grp, -w / 2 - 14, y - fs * 0.84, w + 28, fs * 1.02, 6, C.lime) : null;
      const tn = text(grp, '', -w / 2, y, fs, INK, { anchor: 'start' });
      return { tn, str: l, hl };
    });
    st.total = L.reduce((a, l) => a + l.length, 0);
    st.stf = staff(grp, 470, 8, 24, INK);
    st.stf.grp.setAttribute('transform', `translate(0 ${H / 2 - 190})`);
    st.sheetT = Z0(ZV.cue(shot, 'sheet'), 0);
    st.titleT = Z0(ZV.cue(shot, 'title'), 1.0);
    st.dur = shot.dur;
  }
  function tickCover(st, t) {
    const q = prog(t, st.sheetT, st.sheetT + 0.5);
    const sc = E.out3(q) * 0.0 + popE(q);
    const beat = Math.pow(Math.max(0, Math.sin(Math.PI * t * 2)), 6);
    put(st.cover, 960, 470 - 0 * beat + 18 * (1 - E.out3(q)), -2 + 1.4 * Math.sin(t * Math.PI * 2 * 0.5) * clamp(q), sc * (1 + 0.012 * beat), sc * (1 + 0.012 * beat), t >= st.sheetT ? 1 : 0);
    // le titre s'écrit au rythme de la voix
    const rate = st.total / Math.max(1.5, (st.dur - st.titleT) * 0.8);
    let n = Math.max(0, Math.floor((t - st.titleT) * rate)) ;
    st.lines.forEach((l) => { const k = clamp(n, 0, l.str.length); l.tn.textContent = l.str.slice(0, k); if (l.hl) show(l.hl, k > 0); n -= l.str.length; });
    hop(st.stf.notes, t, 22, 2, 0.16);
  }

  /* ------------------------------------------------------------------ */
  /*  Split : la partition qui danse / le tertre immobile                */
  /* ------------------------------------------------------------------ */
  function buildSplit(st, root, shot, pr) {
    bg(root, C.paper, INK);
    rect(root, 951, 110, 18, 700, 0, INK);
    const sp = pr.split || { left: { cue: 'left', label: 'TOUT LE MONDE' }, right: { cue: 'right', label: 'PERSONNE' } };
    const side = (def, cx, k) => {
      const lab = g(root);
      const w = meas(root, def.label || '', 62, false) + 72;
      ZV.sticker(lab, w, 108, k ? C.ink : C.lime, null, 62, k ? C.paper : INK, { sh: 10 });
      text(lab, def.label || '', 0, 22, 62, k ? C.paper : INK, { anchor: 'middle', len: w - 72 });
      return { lab, cx, t0: Z0(ZV.cue(shot, def.cue), k ? 1.8 : 0.9) };
    };
    st.L = side(sp.left, 480, 0); st.R = side(sp.right, 1440, 1);
    // gauche : partition lime qui danse
    const sheet = g(root);
    st.sheet = sheet;
    rect(sheet, -216 + 14, -270 + 14, 432, 540, 14, INK);
    rect(sheet, -216, -270, 432, 540, 14, C.lime, INK, 7);
    rect(sheet, -190, -244, 380, 488, 6, 'none', INK, 5);
    st.stf = staff(sheet, 330, 7, 30, INK);
    st.stf.grp.setAttribute('transform', 'translate(0 -70)');
    const stf2 = staff(sheet, 330, 7, 30, INK);
    stf2.grp.setAttribute('transform', 'translate(0 110)');
    st.stf2 = stf2;
    // droite : tertre plat ink, immobile
    st.mound = pict(root, 'mound', { bg: 'paper', color: 'ink' });
    put(st.mound.root, 1440, 500, 0, 2.5, 2.5, 1);
  }
  function tickSplit(st, t) {
    const l = st.L, r = st.R;
    const pl = popE(prog(t, 0, 0.4));
    const bounce = Math.abs(Math.sin(Math.PI * t * 2));
    put(st.sheet, 480, 440 - bounce * 16, Math.sin(Math.PI * t * 2) * 3.2, pl, pl, 1);
    hop(st.stf.notes, t, 26, 2, 0.16);
    hop(st.stf2.notes, t, 26, 2, 0.16);
    const kl = popE(prog(t, l.t0, l.t0 + 0.32));
    put(l.lab, 480, 790, -2, kl, kl, t >= l.t0 ? 1 : 0);
    const kr = popE(prog(t, r.t0, r.t0 + 0.32));
    put(r.lab, 1440, 790, 2, kr, kr, t >= r.t0 ? 1 : 0);
  }

  ZV.define('newspaper', {
    init(root, shot) {
      const pr = shot.props || {};
      const st = { mode: pr.mode || 'spin' };
      try {
        if (st.mode === 'sheet') buildCover(st, root, shot, pr);
        else if (st.mode === 'split') buildSplit(st, root, shot, pr);
        else buildSpin(st, root, shot, pr);
      } catch (e) { if (window.ZV_DEBUG) console.error(e); }
      return st;
    },
    update(st, t, shot) {
      try {
        if (st.mode === 'sheet') tickCover(st, t);
        else if (st.mode === 'split') tickSplit(st, t);
        else tickSpin(st, t);
      } catch (e) { if (window.ZV_DEBUG) console.error(e); }
    }
  });
})();
;
/* ==== tools/video/composition/components/no-lose-loop.js ==== */
// Composant `no-lose-loop` (épisode 3) : le piège logique, un schéma qui ne peut pas donner tort.
// MON SYSTÈME → JE GAGNE → LE SYSTÈME MARCHE ; MON SYSTÈME → JE PERDS → JE M'ÉTAIS EMBALLÉ → le MÊME « LE SYSTÈME MARCHE ». Voir EP3-COMPONENTS.md.
// Fonction pure du temps ; flèches plates épaisses ink / lime / red ; aucun dégradé / flou / filter.
// Cues : system, win, lose, excuse, works, verdict.
(() => {
  'use strict';
  const { C, E, clamp, prog, lerp, f2, sv, g, rect, circle, path, text, put, shakeAt } = ZV;
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const bw = (s, size) => { let a = 0; for (const ch of String(s)) a += size * (ch === ' ' ? 0.26 : /[0-9]/.test(ch) ? 0.6 : /[A-ZÀÂÉÈÊÎÔÛÇ€%+×≈−]/.test(ch) ? 0.66 : /[.,:;'’!|]/.test(ch) ? 0.3 : 0.56); return a; };
  const str = (v, d) => (typeof v === 'string' && v.length ? v : d);

  const YT = 175, YC = 380, YB = 575;                                           // rangées : haut, centre, bas
  const XS = 230, XW = 700, XL = 700, XE = 1290, XK = 1650;                     // colonnes : système, gagne/perds, excuse, marche
  const NODE = {
    sys: { x: XS, y: YC, w: 340, h: 170 }, win: { x: XW, y: YT, w: 330, h: 110 }, lose: { x: XL, y: YB, w: 330, h: 110 },
    exc: { x: XE, y: YB, w: 540, h: 110 }, works: { x: XK, y: YC, w: 460, h: 200 }
  };

  // met un libellé sur 1 ou 2 lignes dans la largeur `maxW` ; renvoie { lines, size }
  function fit(s, size, maxW, two) {
    const one = bw(s, size);
    const sp = [];
    for (let i = 0; i < s.length; i++) if (s[i] === ' ') sp.push(i);
    if (!sp.length || (!two && one <= maxW)) return { lines: [s], size: Math.min(size, size * maxW / Math.max(1, one)) };
    let best = sp[0], bd = 1e9;
    for (const i of sp) { const d = Math.abs(bw(s.slice(0, i), size) - bw(s.slice(i + 1), size)); if (d < bd) { bd = d; best = i; } }
    const a = s.slice(0, best), b = s.slice(best + 1);
    const m = Math.max(bw(a, size), bw(b, size));
    return { lines: [a, b], size: Math.min(size, size * maxW / Math.max(1, m)) };
  }

  function mkNode(parent, n, fill, textFill, label, size, o) {
    o = o || {};
    const d = { n };
    d.g = g(parent);
    rect(d.g, -n.w / 2 + 10, -n.h / 2 + 10, n.w, n.h, 16, C.ink);
    rect(d.g, -n.w / 2, -n.h / 2, n.w, n.h, 16, fill, C.ink, 7);
    const f = fit(label, size, n.w - 56, !!o.two);
    const lh = f.size * 1.05, y0 = f.lines.length === 1 ? f.size * 0.35 : -lh / 2 + f.size * 0.35;
    f.lines.forEach((ln, i) => text(d.g, ln, 0, y0 + i * lh, f.size, textFill, { anchor: 'middle', len: f2(bw(ln, f.size)) }));
    return d;
  }
  // pastille ronde : coche (ok) ou croix (non)
  function mkBadge(parent, kind, r) {
    const b = g(parent);
    circle(b, 5, 5, r, C.ink);
    circle(b, 0, 0, r, kind === 'ok' ? C.lime : C.red, C.ink, 7);
    if (kind === 'ok') path(b, `M${-r * 0.42} ${r * 0.04} L${-r * 0.1} ${r * 0.38} L${r * 0.46} ${-r * 0.36}`, 'none', C.ink, r * 0.2);
    else { path(b, `M${-r * 0.36} ${-r * 0.36} L${r * 0.36} ${r * 0.36}`, 'none', C.ink, r * 0.2); path(b, `M${r * 0.36} ${-r * 0.36} L${-r * 0.36} ${r * 0.36}`, 'none', C.ink, r * 0.2); }
    return b;
  }
  // flèche plate épaisse : tracé (pathLength 1) + pointe ; pts = [[x,y],…], tip = [x,y], ang = direction de la pointe (deg)
  function mkArrow(parent, pts, color, tip, ang) {
    const d = 'M' + pts.map((p) => p[0] + ' ' + p[1]).join(' L');
    const a = { color };
    const common = { d, fill: 'none', pathLength: 1, 'stroke-linejoin': 'round', 'stroke-linecap': 'butt', visibility: 'hidden' };
    a.out = sv('path', Object.assign({ stroke: C.ink, 'stroke-width': 34 }, common), parent);
    a.fill = sv('path', Object.assign({ stroke: color, 'stroke-width': color === C.ink ? 22 : 17 }, common), parent);
    a.head = g(parent, { visibility: 'hidden' });
    path(a.head, 'M0 0 L-36 -32 L-36 32Z', color, C.ink, 7);
    a.tip = tip; a.ang = ang;
    return a;
  }

  ZV.define('no-lose-loop', {
    init(root, shot) {
      const P = shot.props || {};
      const beats = Array.isArray(shot.beats) ? shot.beats : [];
      const dur = isNum(shot.dur) && shot.dur > 0 ? shot.dur : 8;
      const cue = (n) => { const b = beats.filter((x) => x && x.do === 'cue' && x.name === n && isNum(x.t)).map((x) => x.t).sort((a, b2) => a - b2); return b.length ? b[0] : null; };
      const st = { dur };
      let T = { system: cue('system'), win: cue('win'), lose: cue('lose'), excuse: cue('excuse'), works: cue('works'), verdict: cue('verdict') };
      const all = Object.values(T);
      if (all.every((x) => x == null)) T = { system: 0.3, win: 1.4, lose: 3.2, excuse: 4.6, works: 6.0, verdict: 7.6 };
      else {
        const others = [T.win, T.lose, T.excuse, T.works].filter((x) => x != null);
        if (T.system == null && others.length) T.system = Math.max(0, Math.min(...others) - 0.4);   // le point de départ précède toujours ses branches
        if (T.lose == null && T.excuse != null) T.lose = Math.max(0, T.excuse - 0.8);              // l'excuse suit forcément une perte
      }
      st.T = T;

      rect(root, 0, 0, 1920, 1080, 0, C.paper);
      const bgs = g(root, { transform: 'rotate(-18 960 540)' });
      for (let k = -4; k <= 4; k++) rect(bgs, 960 + k * 300 - 70, -600, 140, 2300, 0, '#E9E5D9');
      st.world = g(root);
      const W = st.world;

      /* flèches (sous les nœuds) */
      st.A = {
        win1: mkArrow(W, [[400, YC - 30], [440, YC - 30], [440, YT], [506, YT]], C.ink, [535, YT], 0),
        win2: mkArrow(W, [[870, YT], [XK, YT], [XK, 250]], C.lime, [XK, 285], 90),
        lose1: mkArrow(W, [[400, YC + 40], [480, YC + 40], [480, YB], [506, YB]], C.ink, [535, YB], 0),
        lose2: mkArrow(W, [[870, YB], [986, YB]], C.red, [1020, YB], 0),
        end: mkArrow(W, [[1565, YB], [XK, YB], [XK, 522]], C.red, [XK, 485], -90)
      };
      /* le MÊME « LE SYSTÈME MARCHE » : fantôme pointillé, puis plein */
      st.ghost = rect(W, XK - 230, YC - 100, 460, 200, 16, 'none', C.ink, 6, { 'stroke-dasharray': '18 12' });
      st.ghost.setAttribute('visibility', 'hidden');

      const nodes = {};
      nodes.sys = mkNode(W, NODE.sys, C.ink, C.lime, str(P.system, 'MON SYSTÈME'), 64, { two: true });
      nodes.win = mkNode(W, NODE.win, C.lime, C.ink, str(P.win, 'JE GAGNE'), 48);
      nodes.lose = mkNode(W, NODE.lose, C.red, C.ink, str(P.lose, 'JE PERDS'), 48);
      nodes.exc = mkNode(W, NODE.exc, C.white, C.ink, str(P.excuse, 'JE M’ÉTAIS EMBALLÉ'), 44);
      nodes.works = mkNode(W, NODE.works, C.lime, C.ink, str(P.works, 'LE SYSTÈME MARCHE'), 58, { two: true });
      st.N = nodes;
      st.bWin = mkBadge(W, 'ok', 36); st.bLose = mkBadge(W, 'no', 36); st.bWorks = mkBadge(W, 'ok', 42);

      /* verdict */
      st.verdict = g(W);
      {
        const lab = str(P.verdict, 'AUCUN RÉSULTAT NE PEUT LUI DONNER TORT'), w = 1640, h = 104, size0 = 58;
        const size = Math.min(size0, size0 * (w - 90) / Math.max(1, bw(lab, size0)));
        rect(st.verdict, -w / 2 + 12, -h / 2 + 12, w, h, 14, C.red);
        rect(st.verdict, -w / 2, -h / 2, w, h, 14, C.ink, C.ink, 7);
        text(st.verdict, lab, 0, size * 0.35, size, C.paper, { anchor: 'middle', len: f2(Math.min(bw(lab, size), w - 90)) });
      }
      return st;
    },

    update(st, t) {
      try {
        t = clamp(t, 0, st.dur + 1);
        const { T, A, N } = st;
        const ph = (t0, d) => (t0 == null ? 0 : prog(t, t0, t0 + d));
        const pop = (grp, n, t0, extra) => {
          const on = t0 != null && t >= t0;
          const p = on ? E.back(prog(t, t0, t0 + 0.3)) : 0;
          const sk = on && extra ? shakeAt(t, t0 + 0.25, extra, 0.35) : [0, 0];
          put(grp, n.x + sk[0], n.y + sk[1], 0, Math.max(p, 0), Math.max(p, 0), on ? 1 : 0);
        };
        const arrow = (a, t0, d) => {
          const p = t0 == null ? 0 : E.io2(prog(t, t0, t0 + d));
          const on = p > 0;
          for (const n of [a.out, a.fill]) { setA(n, 'visibility', on ? 'visible' : 'hidden'); setA(n, 'stroke-dasharray', p >= 1 ? '1.01 1.01' : `${f2(p)} 1.01`); }
          const hp = t0 == null ? 0 : E.back(prog(t, t0 + d * 0.8, t0 + d + 0.15));
          setA(a.head, 'visibility', hp > 0 ? 'visible' : 'hidden');
          setA(a.head, 'transform', `translate(${a.tip[0]} ${a.tip[1]}) rotate(${a.ang}) scale(${f2(Math.max(hp, 0.01))})`);
        };

        /* secousse du « marche » */
        const tW = T.works;
        const tEnd = T.excuse != null && tW != null ? Math.max(tW, T.excuse + 0.6) : null;   // la flèche du bas arrive après l'excuse
        const tWf = tW != null ? tW + 0.35 : null;                                             // le nœud claque quand les flèches arrivent

        pop(N.sys.g, NODE.sys, T.system);
        arrow(A.win1, T.win, 0.4);
        pop(N.win.g, NODE.win, T.win != null ? T.win + 0.35 : null);
        arrow(A.win2, T.win != null ? T.win + 0.7 : null, 0.9);
        arrow(A.lose1, T.lose, 0.4);
        pop(N.lose.g, NODE.lose, T.lose != null ? T.lose + 0.35 : null);
        arrow(A.lose2, T.excuse != null ? T.excuse : null, 0.35);
        pop(N.exc.g, NODE.exc, T.excuse != null ? T.excuse + 0.3 : null, 6);
        arrow(A.end, tEnd, 0.45);
        pop(N.works.g, NODE.works, tWf, 12);

        /* fantôme du nœud d'arrivée */
        {
          const first = [T.win, T.lose, T.excuse].filter((x) => x != null);
          const t0 = first.length ? Math.min(...first) + 0.5 : null;
          setA(st.ghost, 'visibility', t0 != null && t >= t0 && !(tWf != null && t >= tWf) ? 'visible' : 'hidden');
        }

        /* coches / croix */
        const badge = (b, x, y, t0, r) => {
          const on = t0 != null && t >= t0, p = on ? E.back(prog(t, t0, t0 + 0.28)) : 0;
          put(b, x, y, 0, Math.max(p, 0), Math.max(p, 0), on ? 1 : 0);
        };
        badge(st.bWin, NODE.win.x + NODE.win.w / 2 - 6, NODE.win.y - NODE.win.h / 2 + 2, T.win != null ? T.win + 0.7 : null);
        badge(st.bLose, NODE.lose.x + NODE.lose.w / 2 - 6, NODE.lose.y - NODE.lose.h / 2 + 2, T.lose != null ? T.lose + 0.7 : null);
        badge(st.bWorks, NODE.works.x + NODE.works.w / 2 - 16, NODE.works.y - NODE.works.h / 2 - 2, tWf != null ? tWf + 0.3 : null);

        /* verdict */
        {
          const tv = T.verdict;
          if (tv == null || t < tv) put(st.verdict, 960, 770, -1.2, 0, 0, 0);
          else {
            const p = E.out3(prog(t, tv, tv + 0.3)), sh = shakeAt(t, tv + 0.25, 8, 0.3);
            put(st.verdict, 960 + sh[0], lerp(900, 770, p) + sh[1], -1.2, 1, 1, 1);
          }
        }
      } catch (e) { /* jamais d'exception */ }
    }
  });
})();
;
/* ==== tools/video/composition/components/paths.js ==== */
// Composant « paths » : les 70 trajectoires de joueurs (+1 si le rouge sort, −1 sinon, p = 18/37), 1920×1080.
// Graine FIXE (6901, un flux par joueur) cherchée hors ligne : à 100 / 1 000 / 10 000 tours, 25 / 13 / 0 joueurs sur 70
// finissent devant (strictement au-dessus de la mise de départ). Les mêmes 70 marches servent aux trois horizons
// (le plan à 1 000 tours est le préfixe du plan à 10 000 tours). Modes : walks | converge | one-winner | drown.
(() => {
  'use strict';
  const { C, E, clamp, prog, lerp, f2, sv, g, rect, circle, text, put, fr } = ZV;
  const SEED_WALKS = 6901;        // 25 / 13 / 0 devant à 100 / 1 000 / 10 000 tours
  const SEED_COIN = 341;          // pile ou face : très forte oscillation puis ≈ 50,1 % à 2 000 lancers
  const P_RED = 18 / 37;
  const PX0 = 350, PX1 = 1580, PY0 = 252, PY1 = 790;
  const NP_MAX = 70;
  const pseed = (s, i) => (Math.imul(s, 7919) + Math.imul(i + 1, 104729)) | 0;
  const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const WHITE = rgb('#FFFFFF'), LIME = rgb('#C8FF2E'), RED = rgb('#FF4A36');
  const mix = (a, b, p) => `rgb(${Math.round(a[0] + (b[0] - a[0]) * p)},${Math.round(a[1] + (b[1] - a[1]) * p)},${Math.round(a[2] + (b[2] - a[2]) * p)})`;

  function makeWalks(np, R) {
    const W = [];
    for (let i = 0; i < np; i++) {
      const r = ZV.rng(pseed(SEED_WALKS, i)), a = new Int16Array(R + 1);
      let v = 0;
      for (let k = 1; k <= R; k++) { v += r() < P_RED ? 1 : -1; a[k] = v; }
      W.push(a);
    }
    return W;
  }
  function pill(parent, w, h, fill, label, size, tfill, o) {
    o = o || {};
    const grp = g(parent);
    rect(grp, -w / 2 + 10, -h / 2 + 10, w, h, o.r || 20, C.ink);
    rect(grp, -w / 2, -h / 2, w, h, o.r || 20, fill, C.ink, 6);
    const t = text(grp, label, 0, size * 0.35, size, tfill || C.ink, { anchor: 'middle', mono: o.mono });
    return { grp, t };
  }
  const wrapPill = (n, x, y, tilt, p) => put(n, x, y, tilt, E.back(clamp(p)) || 0.0001, E.back(clamp(p)) || 0.0001, p > 0 ? 1 : 0);

  ZV.define('paths', {
    init(root, shot) {
      const p = shot.props || {};
      const mode = ['walks', 'converge', 'one-winner', 'drown'].includes(p.mode) ? p.mode : 'walks';
      const cue = (n) => ZV.cue(shot, n);
      const st = { p, mode, dur: shot.dur };
      rect(root, 0, 0, 1920, 1080, 0, C.ink);

      if (mode === 'converge') return initConverge(st, root, shot, p, cue);

      /* ---- données ---- */
      const NP = Math.max(1, Math.min(NP_MAX, p.players || NP_MAX));
      const events = [];
      let Rmax = p.rounds || 100;
      for (const b of shot.beats) if (b.do === 'cue' && /^rounds-/.test(b.name)) { events.push({ t: b.t, R: b.rounds || Rmax, label: b.label, ahead: b.ahead, stat: b.stat }); Rmax = Math.max(Rmax, b.rounds || 0); }
      st.R0 = p.rounds || 100; st.events = events; st.Rmax = Math.max(Rmax, 100);
      const W = makeWalks(NP, st.Rmax);
      st.W = W; st.NP = NP;
      st.cMax = new Int32Array(st.Rmax + 1); st.cMin = new Int32Array(st.Rmax + 1);
      { let mx = 0, mn = 0; for (let k = 0; k <= st.Rmax; k++) { for (let i = 0; i < NP; i++) { const v = W[i][k]; if (v > mx) mx = v; if (v < mn) mn = v; } st.cMax[k] = mx; st.cMin[k] = mn; } }
      let best = 0; for (let i = 1; i < NP; i++) if (W[i][100] > W[best][100]) best = i;
      st.best = best;

      /* ---- plan : tracé ---- */
      const clipId = 'zvp-' + String(shot.id || 'x').replace(/[^\w-]/g, '');
      const defs = sv('defs', null, root);
      const cp = sv('clipPath', { id: clipId }, defs);
      sv('rect', { x: PX0 - 20, y: PY0 - 40, width: PX1 - PX0 + 60, height: PY1 - PY0 + 80 }, cp);
      st.clipId = clipId;
      st.base = g(root);                                      // ligne de départ, repères
      st.baseLine = sv('line', { x1: PX0, x2: PX1, y1: 0, y2: 0, stroke: C.paper, 'stroke-width': 5, 'stroke-dasharray': '24 18', opacity: 0.7, 'stroke-linecap': 'round' }, st.base);
      const clip = g(root, { 'clip-path': `url(#${clipId})` });
      st.lowL = g(clip); st.topL = g(clip);
      // quelles lignes passent devant à l'un des horizons montrés : calque supérieur
      const hz = [st.R0].concat(events.map((e) => e.R));
      st.lines = [];
      for (let i = 0; i < NP; i++) {
        const top = hz.some((R) => W[i][Math.min(R, st.Rmax)] > 0) || (mode !== 'walks' && i === best);
        const n = sv('path', { d: '', fill: 'none', stroke: '#fff', 'stroke-width': 3.2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', opacity: 0.78 }, top ? st.topL : st.lowL);
        st.lines.push(n);
      }
      st.winOut = sv('path', { d: '', fill: 'none', stroke: C.ink, 'stroke-width': 18, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', visibility: 'hidden' }, clip);
      st.winLine = sv('path', { d: '', fill: 'none', stroke: C.lime, 'stroke-width': 9, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', visibility: 'hidden' }, clip);
      st.dots = g(root);
      st.dotNodes = [];
      for (let i = 0; i < NP; i++) st.dotNodes.push(circle(st.dots, 0, 0, 8, C.red, C.ink, 3));
      // moyenne
      if (p.show_mean) {
        st.mean = g(root);
        st.meanOut = sv('line', { x1: PX0, y1: 0, x2: PX0, y2: 0, stroke: C.ink, 'stroke-width': 30, 'stroke-linecap': 'round' }, st.mean);
        st.meanIn = sv('line', { x1: PX0, y1: 0, x2: PX0, y2: 0, stroke: C.white, 'stroke-width': 16, 'stroke-linecap': 'round' }, st.mean);
        st.meanDot = circle(st.mean, PX0, 0, 17, C.white, C.ink, 6);
        const mp = pill(root, 440, 84, C.white, p.mean_label || 'MOYENNE −2,7 %', 40, C.ink, { mono: true });
        st.meanPill = mp.grp;
        st.tMean = cue('mean');
      }
      // textes fixes
      st.base2 = g(root);
      st.baseTxt = text(st.base2, 'MISE', PX0 - 28, 0, 34, C.paper, { mono: true, anchor: 'end' });          // repère « MISE DE DÉPART »
      st.baseTxt2 = text(st.base2, 'DE DÉPART', PX0 - 28, 0, 34, C.paper, { mono: true, anchor: 'end' });
      st.title = text(root, '', 190, 168, 88, C.paper);
      st.sub = text(root, p.label ? '70 JOUEURS · TOUS MISENT SUR LE ROUGE' : '', 190, 212, 28, C.paper, { mono: true, spacing: 1 });
      st.sub.setAttribute('opacity', 0.75);
      st.axL = text(root, '0', PX0, 836, 30, C.paper, { mono: true, anchor: 'middle' });
      st.axR = text(root, '', PX1, 836, 30, C.paper, { mono: true, anchor: 'end' });
      st.axL.setAttribute('opacity', 0.7); st.axR.setAttribute('opacity', 0.7);
      const sp = pill(root, 640, 112, C.lime, '', 54, C.ink);
      st.stat = sp.grp; st.statT = sp.t;
      st.legA = text(root, '', PX1 + 40, 0, 34, C.lime, { mono: true });
      st.legB = text(root, '', PX1 + 40, 0, 34, C.red, { mono: true });
      st.stats = shot.beats.filter((b) => b.do === 'cue' && b.name === 'stat').map((b) => ({ t: Math.min(b.t, shot.dur - 0.45), text: b.stat != null ? b.stat : (p.stat || '') }));
      if (!st.stats.length && p.stat) st.stats.push({ t: Infinity, text: p.stat });

      /* ---- calendrier ---- */
      const tDraw = cue('draw'), tMean = st.tMean, tWin = cue('winner'), tFlood = cue('flood');
      st.pre = tDraw == null && tMean != null && mode === 'walks';
      st.tDraw = st.pre ? -5 : (mode === 'drown' ? 0 : (tDraw == null ? 0 : tDraw));
      const tColor = cue('color');
      const dEnd = mode === 'drown' ? 0 : (st.pre ? -3 : (tColor != null ? Math.max(st.tDraw + 0.8, tColor - 0.3) : st.tDraw + 1.0));
      st.dEnd = dEnd; st.tColor = st.pre ? -2 : (tColor != null ? tColor : dEnd + 0.05);
      st.tWin = tWin; st.tFlood = tFlood;
      if (mode === 'drown') initDrown(st, root, shot, p);
      return st;
    },

    update(st, t, shot) {
      if (st.mode === 'converge') return updConverge(st, t, shot);
      const p = st.p, W = st.W, NP = st.NP;
      // horizon courant R (réel) : change au fil des repères rounds-N
      let R = st.R0, base = st.R0, label = p.label, aheadTarget = p.ahead, lt = -9, trans = false;
      for (const e of st.events) {
        const pr = prog(t, e.t, e.t + 0.6);
        if (pr > 0) { R = Math.exp(lerp(Math.log(base), Math.log(e.R), E.io3(pr))); if (pr < 1) trans = true; }
        if (t >= e.t) { base = e.R; if (e.label != null) { label = e.label; lt = e.t; } if (e.ahead != null) aheadTarget = e.ahead; }
      }
      if (st.mode === 'drown') R = 100;
      R = Math.max(1, Math.min(R, st.Rmax));
      const iR = Math.min(st.Rmax, Math.floor(R));
      let lo0 = Math.min(st.cMin[iR], Math.floor(-0.027 * R) - 1), hi0 = Math.max(st.cMax[iR], 2);
      if (st.mode === 'drown') { lo0 = st.fMin; hi0 = st.fMax; }
      const pad = (hi0 - lo0) * 0.07, lo = lo0 - pad, hi = hi0 + pad;
      const X = (k) => PX0 + (PX1 - PX0) * k / R;
      const Y = (v) => PY1 - (v - lo) / (hi - lo) * (PY1 - PY0);
      const y0 = Y(0);

      const vis = E.io3(prog(t, st.tDraw, st.dEnd));
      const col = E.out2(prog(t, st.tColor, st.tColor + 0.35));
      const showWin = st.mode === 'one-winner' && st.tWin != null && t >= st.tWin;
      const winP = st.tWin == null ? 0 : prog(t, st.tWin, st.tWin + 0.3);

      /* ---- repères ---- */
      st.baseLine.setAttribute('y1', f2(y0)); st.baseLine.setAttribute('y2', f2(y0));
      const ap = E.out3(prog(t, st.tDraw - 0.05, st.tDraw + 0.5));
      st.baseLine.setAttribute('x2', f2(lerp(PX0, PX1, st.pre ? 1 : (st.mode === 'drown' ? E.out3(prog(t, 0, 0.5)) : ap))));
      st.baseTxt.setAttribute('y', f2(y0 - 4)); st.baseTxt2.setAttribute('y', f2(y0 + 34));
      st.base2.setAttribute('visibility', ap > 0.9 ? 'visible' : 'hidden');
      if (st.mode === 'one-winner') label = st.tWin != null && t >= st.tWin ? 'UNE LIGNE SUR 70' : '';
      if (st.mode === 'drown') label = st.tWin != null && t >= st.tWin ? 'TA SOIRÉE GAGNANTE' : '';
      if (st.mode !== 'walks') lt = st.tWin == null ? 0 : st.tWin;
      st.title.textContent = label || '';
      const tp = label ? E.back(prog(t, lt < -5 ? 0 : lt, (lt < -5 ? 0 : lt) + 0.28)) : 0;
      st.title.setAttribute('transform', `translate(0 ${f2((1 - tp) * -30)})`);
      st.title.setAttribute('opacity', f2(clamp(tp * 3)));
      st.sub.setAttribute('visibility', label && st.mode === 'walks' ? 'visible' : 'hidden');
      st.axR.textContent = st.mode === 'walks' ? fr(Math.round(R)) + ' TOURS' : '';

      /* ---- les 70 lignes ---- */
      const n = R * vis;
      const M = Math.max(1, Math.min(300, Math.ceil(R)));
      const endV = new Float64Array(NP);
      const winner = st.best;
      let nA = 0;
      const half = (st.mode === 'one-winner' && showWin) ? 0.5 : 1;
      for (let i = 0; i < NP; i++) {
        const a = W[i];
        const vAt = (k) => { const kk = Math.min(Math.floor(k), st.Rmax), f = k - kk; return a[kk] + ((a[Math.min(kk + 1, st.Rmax)] - a[kk]) * f); };
        endV[i] = vAt(R);
        if (endV[i] > 0) nA++;
        let d = '';
        for (let j = 0; j <= M; j++) {
          const k = j * R / M;
          if (k > n) { if (j > 0 && n > 0) d += `L${Math.round(X(n))} ${Math.round(Y(vAt(n)))}`; break; }
          d += (j ? 'L' : 'M') + Math.round(X(k)) + ' ' + Math.round(Y(vAt(k)));
        }
        const ahead = endV[i] > 0;
        const ln = st.lines[i];
        ln.setAttribute('d', d);
        let c;
        if (st.mode === 'one-winner') c = mix(WHITE, RED, col);
        else c = mix(WHITE, ahead ? LIME : RED, col);
        ln.setAttribute('stroke', c);
        ln.setAttribute('stroke-width', f2(ahead && st.mode !== 'one-winner' ? 3.2 + 1.3 * col : 3.2 + 0.4 * col));
        ln.setAttribute('opacity', f2((0.78 + (0.95 - 0.78) * col) * (showWin && i !== winner ? lerp(1, 0.6, winP) : 1)));
        if (st.mode === 'drown') ln.setAttribute('visibility', 'hidden');
      }
      // dot de fin
      const dotsOn = col > 0.55 && vis > 0.98 && st.mode !== 'drown';
      let yA = 0, nAA = 0, yB = 0, nBB = 0;
      for (let i = 0; i < NP; i++) {
        const dn = st.dotNodes[i];
        const ahead = endV[i] > 0 && st.mode !== 'one-winner';
        const isWin = st.mode === 'one-winner' && showWin && i === winner;
        dn.setAttribute('visibility', dotsOn ? 'visible' : 'hidden');
        if (!dotsOn) continue;
        const yy = Y(endV[i]);
        dn.setAttribute('cx', PX1); dn.setAttribute('cy', f2(yy));
        dn.setAttribute('fill', ahead || isWin ? C.lime : C.red);
        dn.setAttribute('r', isWin ? 14 : 8);
        if (endV[i] > 0) { yA += yy; nAA++; } else { yB += yy; nBB++; }
      }
      /* ---- ligne gagnante (one-winner / drown) ---- */
      const wv = (k) => { const kk = Math.min(Math.floor(k), 100); return W[winner][kk] + ((W[winner][Math.min(kk + 1, 100)] - W[winner][kk]) * (k - kk)); };
      if (st.mode === 'one-winner') {
        let d = '';
        for (let j = 0; j <= 100; j++) d += (j ? 'L' : 'M') + Math.round(X(j * R / 100)) + ' ' + Math.round(Y(wv(j * R / 100)));
        st.winLine.setAttribute('d', d); st.winOut.setAttribute('d', d);
        const on = showWin && vis > 0.98;
        st.winLine.setAttribute('visibility', on ? 'visible' : 'hidden'); st.winOut.setAttribute('visibility', on ? 'visible' : 'hidden');
        const w = lerp(4, 11, E.back(winP));
        st.winLine.setAttribute('stroke-width', f2(w)); st.winOut.setAttribute('stroke-width', f2(w + 9));
      }
      if (st.mode === 'drown') updDrown(st, t, X, Y, wv);

      /* ---- moyenne ---- */
      if (st.mean) {
        const mp = st.tMean == null ? 1 : E.io3(prog(t, st.tMean, st.tMean + 1.3));
        const kEnd = R * mp, xe = X(kEnd), ye = Y(-0.027 * kEnd);
        for (const l of [st.meanOut, st.meanIn]) { l.setAttribute('x1', PX0); l.setAttribute('y1', f2(y0)); l.setAttribute('x2', f2(xe)); l.setAttribute('y2', f2(ye)); }
        st.meanDot.setAttribute('cx', f2(xe)); st.meanDot.setAttribute('cy', f2(ye));
        st.mean.setAttribute('visibility', mp > 0 ? 'visible' : 'hidden');
        const pp = st.tMean == null ? 1 : prog(t, st.tMean + 0.9, st.tMean + 1.3);
        wrapPill(st.meanPill, Math.min(X(R) - 250, 1560 - 20), Y(-0.027 * R) + 82, -2, pp);
      }

      /* ---- stat (pop à chaque repère) ---- */
      let cur = null; for (const s of st.stats) if (t >= s.t) cur = s;
      if (cur && st.mode === 'walks') {
        st.statT.textContent = cur.text;
        wrapPill(st.stat, 1420, 150, 2, prog(t, cur.t, cur.t + 0.3));
      } else wrapPill(st.stat, 1420, 150, 2, 0);

      /* ---- légende : devant / derrière ---- */
      const legOn = st.mode === 'walks' && dotsOn && !trans && !st.mean;
      st.legA.setAttribute('visibility', legOn && nAA ? 'visible' : 'hidden');
      st.legB.setAttribute('visibility', legOn && nBB ? 'visible' : 'hidden');
      if (legOn) {
        let ya = nAA ? yA / nAA : 0, yb = nBB ? yB / nBB : 0;
        if (nAA && nBB && yb - ya < 110) { const m = (ya + yb) / 2; ya = m - 55; yb = m + 55; }
        st.legA.textContent = `${nAA} DEVANT`; st.legB.textContent = `${nBB} DERRIÈRE`;
        st.legA.setAttribute('y', f2(ya + 12)); st.legB.setAttribute('y', f2(yb + 12));
      }
    }
  });

  /* ============================================================ drown ============ */
  function initDrown(st, root, shot, p) {
    const N = 420, r = ZV.rng(7117);
    st.flood = [];
    const lay = g(root, { 'clip-path': `url(#${st.clipId})` });
    st.floodLayer = lay;
    st.floodData = [];
    for (let i = 0; i < N; i++) {
      const a = new Int16Array(101); let v = 0;
      for (let k = 1; k <= 100; k++) { v += r() < P_RED ? 1 : -1; a[k] = v; }
      st.floodData.push(a);
      st.flood.push({ n: sv('path', { d: '', fill: 'none', stroke: C.red, 'stroke-width': 3.4, 'stroke-linejoin': 'round', pathLength: 1, opacity: 0.9, visibility: 'hidden' }, lay), ts: 0 });
    }
    st.fMin = 0; st.fMax = 0;
    for (const a of st.floodData) for (let k = 0; k <= 100; k++) { if (a[k] < st.fMin) st.fMin = a[k]; if (a[k] > st.fMax) st.fMax = a[k]; }
    st.fMax = Math.max(st.fMax, st.cMax[100]); st.fMin = Math.min(st.fMin, st.cMin[100]);
  }
  function updDrown(st, t, X, Y, wv) {
    // ligne lime : tracée dès « winner », épaisse, bordée d'ink
    const tw = st.tWin == null ? 0 : st.tWin;
    const q = E.io2(prog(t, tw, tw + 1.5));
    let d = '';
    const nn = 100 * q;
    for (let j = 0; j <= 100; j++) { if (j > nn) { d += `L${Math.round(X(nn))} ${Math.round(Y(wv(nn)))}`; break; } d += (j ? 'L' : 'M') + Math.round(X(j)) + ' ' + Math.round(Y(wv(j))); }
    st.winLine.setAttribute('d', d); st.winOut.setAttribute('d', d);
    const on = t >= tw;
    st.winLine.setAttribute('visibility', on ? 'visible' : 'hidden'); st.winOut.setAttribute('visibility', on ? 'visible' : 'hidden');
    st.winLine.setAttribute('stroke-width', 11); st.winOut.setAttribute('stroke-width', 21);
    const dim = lerp(1, 0.22, prog(t, (st.tFlood == null ? 1e9 : st.tFlood) + 0.9, (st.tFlood == null ? 1e9 : st.tFlood) + 1.7));
    st.winLine.setAttribute('opacity', f2(dim)); st.winOut.setAttribute('opacity', f2(dim));
    // la marée rouge
    const tf = st.tFlood == null ? 1e9 : st.tFlood;
    const N = st.flood.length;
    for (let i = 0; i < N; i++) {
      const f = st.flood[i], a = st.floodData[i];
      const ts = tf + Math.pow(i / N, 0.85) * 1.15, p = prog(t, ts, ts + 0.5);
      if (p <= 0) { f.n.setAttribute('visibility', 'hidden'); continue; }
      if (!f.built) { // géométrie figée (dépend seulement des échelles qui ne changent pas en mode drown)
        let dd = ''; for (let j = 0; j <= 100; j++) dd += (j ? 'L' : 'M') + Math.round(X(j)) + ' ' + Math.round(Y(a[j]));
        f.n.setAttribute('d', dd); f.built = true;
      }
      f.n.setAttribute('visibility', 'visible');
      f.n.setAttribute('stroke-dasharray', p >= 1 ? 'none' : `${f2(E.out2(p))} 2`);
    }
  }

  /* ============================================================ converge ============ */
  function initConverge(st, root, shot, p, cue) {
    const N = 2000, r = ZV.rng(SEED_COIN);
    st.N = N; st.share = new Float64Array(N + 1);
    let h = 0; for (let n = 1; n <= N; n++) { h += r() < 0.5 ? 1 : 0; st.share[n] = h / n; }
    st.X = (n) => PX0 + (PX1 - PX0) * Math.log(n) / Math.log(N);
    st.Y = (q) => PY1 - q * (PY1 - PY0);
    // axes
    for (const q of [0, 0.5, 1]) {
      sv('line', { x1: PX0, x2: PX1, y1: st.Y(q), y2: st.Y(q), stroke: C.paper, 'stroke-width': q === 0.5 ? 0 : 3, 'stroke-dasharray': '14 14', opacity: 0.5 }, root);
      text(root, `${q * 100} %`, PX0 - 22, st.Y(q) + 11, 30, C.paper, { mono: true, anchor: 'end' }).setAttribute('opacity', 0.75);
    }
    st.half = sv('line', { x1: PX0, x2: PX1, y1: st.Y(0.5), y2: st.Y(0.5), stroke: C.lime, 'stroke-width': 7, 'stroke-dasharray': '26 16', 'stroke-linecap': 'round' }, root);
    for (const n of [1, 10, 100, 1000]) {
      sv('line', { x1: st.X(n), x2: st.X(n), y1: PY1, y2: PY1 + 14, stroke: C.paper, 'stroke-width': 4, opacity: 0.75 }, root);
      text(root, fr(n), st.X(n), PY1 + 48, 28, C.paper, { mono: true, anchor: 'middle' }).setAttribute('opacity', 0.75);
    }
    text(root, 'LANCERS', PX0 - 40, PY1 + 48, 28, C.paper, { mono: true, anchor: 'end' }).setAttribute('opacity', 0.75);
    st.title = text(root, p.label || 'PART DE PILES', PX0, 168, 88, C.paper);
    st.read = text(root, '', PX0, 214, 34, C.lime, { mono: true });
    const lay = g(root);
    st.cOut = sv('path', { d: '', fill: 'none', stroke: C.ink, 'stroke-width': 17, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, lay);
    st.cLine = sv('path', { d: '', fill: 'none', stroke: C.white, 'stroke-width': 8, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, lay);
    st.cDot = circle(lay, 0, 0, 15, C.white, C.ink, 6);
    const sp = pill(root, 300, 120, C.lime, p.stat || '50 %', 74, C.ink);
    st.stat = sp.grp;
    st.tDraw = cue('draw') == null ? 0.5 : cue('draw');
    st.tSettle = cue('settle') == null ? st.tDraw + 2 : cue('settle');
    return st;
  }
  function updConverge(st, t) {
    const u = E.io2(prog(t, st.tDraw, st.tDraw + Math.max(2.4, st.tSettle - st.tDraw + 1.7)));
    const nv = Math.exp(Math.log(st.N) * u);
    const n = Math.max(1, nv);
    let d = '';
    const M = 420;
    let last = 0;
    for (let j = 0; j <= M; j++) {
      const k = Math.pow(st.N, j / M);
      if (k > n) break;
      const kk = Math.max(1, Math.min(st.N, Math.round(k)));
      if (kk === last) continue;
      last = kk;
      d += (d ? 'L' : 'M') + Math.round(st.X(kk)) + ' ' + Math.round(st.Y(st.share[kk]));
    }
    const nk = Math.max(1, Math.min(st.N, Math.floor(n)));
    d += (d ? 'L' : 'M') + f2(st.X(n)) + ' ' + f2(st.Y(st.share[nk]));
    st.cOut.setAttribute('d', d); st.cLine.setAttribute('d', d);
    st.cDot.setAttribute('cx', f2(st.X(n))); st.cDot.setAttribute('cy', f2(st.Y(st.share[nk])));
    st.cLine.setAttribute('stroke', t >= st.tSettle + 0.2 ? C.lime : C.white);
    st.cDot.setAttribute('fill', t >= st.tSettle + 0.2 ? C.lime : C.white);
    st.cOut.parentNode.setAttribute('visibility', t >= st.tDraw ? 'visible' : 'hidden');
    st.read.textContent = t >= st.tDraw ? `${Math.round(st.share[nk] * 100)} % DE PILES SUR ${fr(nk)} LANCER${nk > 1 ? 'S' : ''}` : '';
    st.half.setAttribute('opacity', f2(0.35 + 0.65 * prog(t, st.tSettle - 0.2, st.tSettle + 0.2)));
    const sp = prog(t, st.tSettle + 0.5, st.tSettle + 0.85);
    wrapPill(st.stat, st.X(st.N) - 190, st.Y(0.5) - 96, -3, sp);
  }
})();
;
/* ==== tools/video/composition/components/pawn-counter.js ==== */
// Composant `pawn-counter` : le comptoir du mont-de-piété (Baden-Baden, S3 de l'épisode 3), puis la forge sous leur chambre.
// Cues : ring, earrings, dress, coat, forge, alarm, empty. Objets plats posés un à un puis étiquetés « EN GAGE » ; scène forge (enclume, marteau ≈ 2 coups/s, éclats plats, réveil barré 5 H) ; comptoir vide.
// Fond paper (comptoir) / red (forge). Aucun dégradé, flou, lueur ni filter ; rien ne clignote (le marteau est un mouvement, les éclats sont des formes plates).
(() => {
  'use strict';
  const { C, E, clamp, prog, lerp, f2, sv, g, rect, circle, path, line, text, put, sticker, shakeAt } = ZV;
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  function fit(n, maxW) {
    try { const w = n.getComputedTextLength(); if (w > maxW && w > 0) { n.setAttribute('textLength', f2(maxW)); n.setAttribute('lengthAdjust', 'spacingAndGlyphs'); } } catch (e) { /* hors DOM */ }
  }
  const str = (v, d) => (typeof v === 'string' && v.trim() ? v.trim() : d);

  const KEYS = ['ring', 'earrings', 'dress', 'coat'];
  const DEF = { ring: 'L’ALLIANCE', earrings: 'LES BOUCLES D’OREILLES', dress: 'LA ROBE', coat: 'SON MANTEAU' };
  const SLOT_X = [250, 600, 950, 1300];
  const TOP = 556;            // dessus du comptoir
  const TAGY = 716;           // centre des étiquettes
  const PIV = { x: 1250, y: 350 }, HL = 470, A_UP = -28, A_DN = 17, TH = 0.5; // marteau

  /* ---- objets plats (origine = milieu du bas de l'objet) ---- */
  function drawRing(o) {
    path(o, 'M-92 0 L-72 -38 L72 -38 L92 0Z', C.ink, C.ink, 6);
    circle(o, 0, -112, 66, 'none', C.ink, 42);
    circle(o, 0, -112, 66, 'none', C.paper, 26);
    path(o, 'M0 -214 L26 -186 L0 -158 L-26 -186Z', C.lime, C.ink, 6);
  }
  function drawEarrings(o) {
    rect(o, -104, -22, 208, 22, 4, C.ink);
    rect(o, -7, -250, 14, 230, 3, C.ink);
    rect(o, -112, -262, 224, 16, 6, C.ink);
    for (const sx of [-68, 68]) {
      line(o, sx, -246, sx, -206, C.ink, 5);
      path(o, `M${sx} -206 q-14 -4 -14 -18`, 'none', C.ink, 5);
      circle(o, sx, -150, 44, C.paper, C.ink, 7);
      circle(o, sx, -150, 17, C.lime, C.ink, 5);
    }
  }
  function drawDress(o) {
    line(o, 0, -258, 0, -282, C.ink, 5);
    path(o, 'M0 -282 q22 -2 22 -18 q0 -18 -22 -18 q-22 0 -22 18', 'none', C.ink, 5);
    path(o, 'M-44 -252 L-24 -252 L0 -224 L24 -252 L44 -252 L32 -150 L128 -2 Q0 18 -128 -2 L-32 -150Z', C.red, C.ink, 7);
    rect(o, -33, -160, 66, 16, 2, C.ink);
    path(o, 'M-60 -60 Q-40 -40 -66 -20 M60 -60 Q40 -40 66 -20', 'none', C.ink, 4);
  }
  function drawCoat(o) {
    const body = 'M-50 -246 L-26 -258 L0 -236 L26 -258 L50 -246 L108 -196 L92 -78 L58 -86 L58 0 L-58 0 L-58 -86 L-92 -78 L-108 -196Z';
    path(o, body, C.ink, C.ink, 14);
    path(o, body, C.ink, C.paper, 5, { transform: 'translate(0 -122) scale(0.9) translate(0 122)' });
    path(o, 'M-26 -256 L0 -150 L26 -256', 'none', C.paper, 5);
    line(o, 0, -150, 0, -6, C.paper, 5);
    for (const y of [-120, -80, -40]) circle(o, 14, y, 6, C.paper);
    path(o, 'M-44 -50 L-18 -50 M18 -50 L44 -50', 'none', C.paper, 5);
  }
  const DRAW = { ring: drawRing, earrings: drawEarrings, dress: drawDress, coat: drawCoat };

  function drawClock(parent) {
    const c = g(parent);
    for (const s of [-1, 1]) {
      circle(c, s * 66, -100, 38, C.lime, C.ink, 7);
      line(c, s * 40, -80, s * 52, -64, C.ink, 7);
    }
    line(c, 0, -118, 0, -128, C.ink, 8);
    line(c, -60, 90, -80, 124, C.ink, 9); line(c, 60, 90, 80, 124, C.ink, 9);
    circle(c, 0, 0, 104, C.ink);
    circle(c, 0, 0, 104, C.paper, C.ink, 8);
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; line(c, Math.sin(a) * 80, -Math.cos(a) * 80, Math.sin(a) * 92, -Math.cos(a) * 92, C.ink, i % 3 === 0 ? 7 : 4); }
    const ha = 150 * Math.PI / 180;
    line(c, 0, 0, Math.sin(ha) * 50, -Math.cos(ha) * 50, C.ink, 11);
    line(c, 0, 0, 0, -74, C.ink, 7);
    circle(c, 0, 0, 10, C.red, C.ink, 4);
    return c;
  }

  ZV.define('pawn-counter', {
    init(root, shot) {
      const p = (shot && shot.props) || {};
      const beats = Array.isArray(shot && shot.beats) ? shot.beats : [];
      const dur = isNum(shot && shot.dur) && shot.dur > 0 ? shot.dur : 10;
      const cueT = (n) => { const b = beats.filter((x) => x && x.do === 'cue' && x.name === n && isNum(x.t)).sort((a, c) => a.t - c.t)[0]; return b ? b.t : null; };
      const labels = Object.assign({}, DEF, p.labels && typeof p.labels === 'object' ? p.labels : {});
      const tagTxt = str(p.tag, 'EN GAGE');
      const st = { dur, tag: tagTxt, tc: {}, n: -1 };
      KEYS.forEach((k) => { st.tc[k] = cueT(k); });
      st.tF = cueT('forge'); st.tA = cueT('alarm'); st.tE = cueT('empty');
      st.eAfter = st.tF != null && st.tE != null && st.tE > st.tF + 0.5;
      st.rng = ZV.rng(1866);

      /* ================= scène comptoir ================= */
      st.cs = g(root);
      const cs = st.cs;
      rect(cs, 0, 0, 1920, 1080, 0, C.paper);
      // mur : plinthe et traits
      rect(cs, 0, 300, 1920, 10, 0, C.ink, null, 0, { opacity: 0.12 });
      rect(cs, 0, 318, 1920, 4, 0, C.ink, null, 0, { opacity: 0.12 });
      // enseigne et plaque de compte
      const sg = g(cs, { transform: 'translate(430 112) rotate(-2)' });
      sticker(sg, 640, 104, C.lime, '', 1, C.ink, { sh: 10 });
      fit(text(sg, 'MONT-DE-PIÉTÉ', 0, 20, 62, C.ink, { anchor: 'middle' }), 580);
      st.plaque = g(cs);
      sticker(st.plaque, 700, 96, C.white, '', 1, C.ink, { sh: 10, r: 14 });
      st.plaqueT = text(st.plaque, 'OBJETS EN GAGE : 0', 0, 15, 44, C.ink, { anchor: 'middle', mono: true });
      // comptoir
      rect(cs, -10, TOP, 1940, 64, 0, C.ink);
      line(cs, 0, TOP + 12, 1920, TOP + 12, C.paper, 4, { opacity: 0.55 });
      rect(cs, -10, TOP + 64, 1940, 500, 0, C.pocket, C.ink, 6);
      for (let x = 100; x < 1920; x += 240) line(cs, x, TOP + 76, x, 1080, C.ink, 5);
      // tiroir ouvert (à droite)
      st.drawer = g(cs);
      path(st.drawer, 'M1556 636 L1848 636 L1894 700 L1510 700Z', C.lime, C.ink, 6);
      path(st.drawer, 'M1556 636 L1848 636 L1894 700 L1510 700Z', 'none', C.ink, 6);
      line(st.drawer, 1540, 662, 1864, 662, C.ink, 4, { opacity: 0.25 });
      rect(st.drawer, 1510, 700, 384, 108, 6, C.pocket, C.paper, 6);
      rect(st.drawer, 1640, 740, 124, 18, 9, C.paper, C.ink, 4);

      // objets
      st.items = KEYS.map((k, i) => {
        const og = g(cs);
        DRAW[k](og);
        return { k, og, x: SLOT_X[i] };
      });
      // étiquettes
      st.tags = KEYS.map((k, i) => {
        const tg = g(cs);
        rect(tg, -160 + 10, -84 + 10, 320, 168, 10, C.ink);
        rect(tg, -160, -84, 320, 168, 10, C.white, C.ink, 6);
        path(tg, 'M-160 -30 L-160 -74 A10 10 0 0 1 -150 -84 L150 -84 A10 10 0 0 1 160 -74 L160 -30Z', C.red, C.ink, 6);
        fit(text(tg, tagTxt, 0, -40, 40, C.ink, { anchor: 'middle', mono: true }), 290);
        const lab = str(labels[k], DEF[k]);
        let a = lab, b = '';
        if (lab.length > 13) {
          const w = lab.split(/\s+/); let best = 1, bd = 1e9;
          for (let j = 1; j < w.length; j++) { const d = Math.abs(w.slice(0, j).join(' ').length - w.slice(j).join(' ').length); if (d < bd) { bd = d; best = j; } }
          a = w.slice(0, best).join(' '); b = w.slice(best).join(' ');
        }
        if (b) { fit(text(tg, a, 0, 14, 36, C.ink, { anchor: 'middle' }), 290); fit(text(tg, b, 0, 56, 36, C.ink, { anchor: 'middle' }), 290); }
        else fit(text(tg, a, 0, 38, 40, C.ink, { anchor: 'middle' }), 290);
        return { tg, x: SLOT_X[i], rot: (i % 2 ? 2.5 : -2.5) };
      });
      // « PLUS RIEN »
      st.empty = g(cs);
      rect(st.empty, -390 + 12, -100 + 12, 780, 200, 18, C.ink);
      rect(st.empty, -390, -100, 780, 200, 18, C.red, C.ink, 8);
      circle(st.empty, -340, 0, 14, C.paper, C.ink, 5);
      fit(text(st.empty, 'PLUS RIEN', 20, 38, 116, C.ink, { anchor: 'middle' }), 640);

      /* ================= scène forge ================= */
      st.fs = g(root);
      const fs = st.fs;
      rect(fs, 0, 0, 1920, 1080, 0, C.red);
      rect(fs, 0, 760, 1920, 330, 0, C.ink);
      line(fs, 0, 764, 1920, 764, C.paper, 6);
      const fl = g(fs, { transform: 'translate(390 110) rotate(-2)' });
      sticker(fl, 640, 92, C.white, '', 1, C.ink, { sh: 10 });
      fit(text(fl, str(p.forge_label, 'AU-DESSUS D’UNE FORGE'), 0, 15, 44, C.ink, { anchor: 'middle' }), 580);
      // enclume
      st.anvil = g(fs);
      const an = 'M430 556 L560 536 L1010 536 L1032 582 L960 592 Q902 602 902 656 L962 720 L1042 720 L1042 762 L520 762 L520 720 L600 720 L660 656 Q660 602 602 592 L560 584 Q482 578 430 556Z';
      path(st.anvil, an, C.ink, C.paper, 7);
      rect(st.anvil, 568, 536, 440, 14, 0, C.paper);
      // bras (silhouette plate) + marteau
      path(fs, 'M1250 308 L1960 138 L1960 256 L1250 396Z', C.ink, C.paper, 6);
      st.sparks = [];
      for (let i = 0; i < 9; i++) {
        const s = g(fs);
        path(s, 'M0 -12 L9 8 L-9 8Z', i % 2 ? C.lime : C.paper, C.ink, 3);
        st.sparks.push({ s, ang: (-160 + i * 17.5 + (st.rng() - 0.5) * 8) * Math.PI / 180, sp: 330 + st.rng() * 280 });
      }
      st.ham = g(fs);
      rect(st.ham, -HL, -15, HL + 120, 30, 8, C.paper, C.ink, 6);
      rect(st.ham, -HL - 42, -68, 84, 136, 10, C.ink, C.paper, 6);
      rect(st.ham, -HL + 8, -68, 10, 136, 0, C.lime);
      circle(st.ham, 0, 0, 44, C.ink, C.paper, 6);
      // réveil
      st.clock = g(fs);
      st.clockG = drawClock(st.clock);
      st.strike = g(st.clock);
      line(st.strike, -120, -120, 120, 120, C.ink, 30);
      line(st.strike, 120, -120, -120, 120, C.ink, 30);
      st.k1 = line(st.strike, -120, -120, 120, 120, C.red, 16);
      st.k2 = line(st.strike, 120, -120, -120, 120, C.red, 16);
      st.h5 = g(fs);
      sticker(st.h5, 200, 110, C.lime, '5 H', 76, C.ink, { sh: 10, mono: true });
      return st;
    },

    update(st, t) {
      const { tF, tA, tE, eAfter } = st;
      /* ---- glissement entre scènes ---- */
      const pf = tF == null ? 0 : E.io3(prog(t, tF, tF + 0.5));
      const pe = eAfter ? E.io3(prog(t, tE, tE + 0.5)) : 0;
      const cx = -1920 * pf + 1920 * pe, fx = 1920 * (1 - pf) + 1920 * pe;
      setA(st.cs, 'transform', `translate(${f2(cx)} 0)`);
      setA(st.cs, 'visibility', Math.abs(cx) >= 1920 ? 'hidden' : 'visible');
      setA(st.fs, 'transform', `translate(${f2(fx)} 0)`);
      setA(st.fs, 'visibility', Math.abs(fx) >= 1920 || tF == null ? 'hidden' : 'visible');

      /* ---- comptoir : objets ---- */
      let itemK = 1;
      if (tE != null) itemK = eAfter ? (t >= tE ? 0 : 1) : 1 - E.in2(prog(t, tE, tE + 0.3));
      let n = 0;
      st.items.forEach((it, i) => {
        const tc = st.tc[it.k];
        const q = tc == null ? 0 : prog(t, tc, tc + 0.55);
        const on = q > 0 && itemK > 0;
        const off = (1 - E.bounce(q)) * -460;
        put(it.og, it.x, TOP + off, 0, itemK, itemK, on ? 1 : 0);
        // étiquette
        const tg = st.tags[i];
        const tq = tc == null ? 0 : prog(t, tc + 0.5, tc + 0.72);
        if (tq >= 1 && itemK > 0) n++;
        const sc = tq > 0 ? 1 + 1.3 * (1 - E.out3(tq)) : 0;
        put(tg.tg, it.x, TAGY, tg.rot * (1 + (1 - E.out3(tq))), sc * itemK, sc * itemK, tq > 0 && itemK > 0 ? 1 : 0);
      });
      const nAll = KEYS.reduce((a, k) => a + (st.tc[k] != null && t >= st.tc[k] + 0.72 ? 1 : 0), 0);
      const shown = nAll;
      const txt = `OBJETS EN GAGE : ${shown}`;
      if (st.plaqueT.textContent !== txt) st.plaqueT.textContent = txt;
      let lastTag = null;
      for (const k of KEYS) { const tc = st.tc[k]; if (tc != null && t >= tc + 0.5 && (lastTag == null || tc > lastTag)) lastTag = tc; }
      const bump = lastTag == null ? 1 : 1 + 0.14 * Math.sin(Math.PI * clamp((t - lastTag - 0.5) / 0.35));
      put(st.plaque, 1450, 112, 1.5, bump, bump, 1);

      // comptoir vide
      const eq = tE == null ? 0 : prog(t, tE + (eAfter ? 0.5 : 0.15), tE + (eAfter ? 0.5 : 0.15) + 0.4);
      const es = eq > 0 ? E.back(eq) : 0;
      put(st.empty, 960, 410, -3, es, es, eq > 0 ? 1 : 0);

      /* ---- forge ---- */
      if (tF != null) {
        const t0 = tF + 0.5;
        const nS = t < t0 ? -1 : Math.floor((t - t0) / TH + 1e-9);
        const lastS = nS < 0 ? null : t0 + nS * TH;
        // angle du marteau
        const nextS = t <= t0 ? t0 : t0 + Math.ceil((t - t0) / TH - 1e-9) * TH;
        const d = nextS - t;
        let a;
        if (d <= 0.1) a = lerp(A_UP, A_DN, E.in3(1 - d / 0.1));
        else { const e = lastS == null ? 9 : t - lastS; a = lerp(A_DN, A_UP, E.out2(prog(e, 0, 0.28))); }
        st.ham.setAttribute('transform', `translate(${PIV.x} ${PIV.y}) rotate(${f2(-a)})`);
        const age = lastS == null ? 9 : t - lastS;
        setA(st.anvil, 'transform', `translate(0 ${f2(age < 0.12 ? 5 * (1 - age / 0.12) : 0)})`);
        // éclats plats
        const flip = nS % 2 ? -1 : 1;
        st.sparks.forEach((s, i) => {
          if (age >= 0.42 || lastS == null) { setA(s.s, 'visibility', 'hidden'); return; }
          const x = 800 + Math.cos(s.ang) * s.sp * age * flip, y = 530 + Math.sin(s.ang) * s.sp * age + 1300 * age * age;
          const sc = 1 - E.in2(age / 0.42);
          setA(s.s, 'visibility', 'visible');
          setA(s.s, 'transform', `translate(${f2(x)} ${f2(y)}) rotate(${f2(age * 500 * flip + i * 40)}) scale(${f2(Math.max(0.01, sc))})`);
        });
        // réveil
        const ap = tA == null ? 0 : prog(t, tA, tA + 0.3);
        const ring = tA != null && t >= tA && t < tA + 1.6 ? 1 : 0;
        const rs = ring ? Math.sin((t - tA) * 2 * Math.PI * 5) : 0;
        const ck = ap > 0 ? E.back(ap) : 0;
        put(st.clock, 1560, 590, ring ? rs * 5 : 0, ck, ck, ap > 0 ? 1 : 0);
        const kp = tA == null ? 0 : prog(t, tA + 1.6, tA + 2.0);
        setA(st.strike, 'visibility', kp > 0 ? 'visible' : 'hidden');
        const k1 = Math.min(1, kp * 2), k2 = clamp(kp * 2 - 1);
        setA(st.k1, 'x2', f2(lerp(-120, 120, k1))); setA(st.k1, 'y2', f2(lerp(-120, 120, k1)));
        setA(st.k2, 'visibility', k2 > 0 ? 'visible' : 'hidden');
        setA(st.k2, 'x2', f2(lerp(120, -120, k2))); setA(st.k2, 'y2', f2(lerp(-120, 120, k2)));
        const hp = tA == null ? 0 : E.back(clamp((t - tA - 0.3) / 0.3));
        put(st.h5, 1790, 600, 5, hp, hp, hp > 0 ? 1 : 0);
      } else {
        put(st.clock, 0, 0, 0, 0, 0, 0); put(st.h5, 0, 0, 0, 0, 0, 0);
      }
    }
  });
})();
;
/* ==== tools/video/composition/components/pictos.js ==== */
// Composant `pictos` : petites illustrations plates animées (famille cohérente de dessins SVG simples).
// Expose aussi `ZV.PICTO` (le jeu de pictogrammes) pour `saga` et `newspaper`.
(() => {
  const { C, sv, g, f2, E, prog, clamp, lerp, put, show, text, rect, circle } = ZV;
  const INK = C.ink;
  const D2R = Math.PI / 180;
  let UID = 0;

  /* ------------------------------------------------------------------ */
  /*  Contexte de dessin : même code pour le dessin et son ombre dure     */
  /* ------------------------------------------------------------------ */
  function ctx(par, flat, sober, fcol) {
    const FC = fcol || INK;
    const K = (c) => {
      if (c == null || c === 'none') return 'none';
      if (flat) return FC;
      if (sober && (c === 'lime' || c === 'red')) c = 'paper';
      return C[c] || c;
    };
    const S = (n, sw, sc) => {
      n.setAttribute('stroke', flat ? FC : (sc ? K(sc) : INK));
      n.setAttribute('stroke-width', sw == null ? 5 : sw);
      n.setAttribute('stroke-linejoin', 'round');
      n.setAttribute('stroke-linecap', 'round');
      return n;
    };
    const P = {
      flat, node: par,
      r(x, y, w, h, rx, fill, sw, sc) { const n = sv('rect', { x, y, width: w, height: h, rx: rx || 0, fill: K(fill) }, par); return sw === 0 ? n : S(n, sw, sc); },
      c(cx, cy, r, fill, sw, sc) { const n = sv('circle', { cx, cy, r, fill: K(fill) }, par); return sw === 0 ? n : S(n, sw, sc); },
      e(cx, cy, rx, ry, fill, sw, sc) { const n = sv('ellipse', { cx, cy, rx, ry, fill: K(fill) }, par); return sw === 0 ? n : S(n, sw, sc); },
      p(d, fill, sw, sc) { const n = sv('path', { d, fill: K(fill) }, par); return sw === 0 ? n : S(n, sw, sc); },
      l(x1, y1, x2, y2, color, w) { const n = sv('line', { x1, y1, x2, y2, stroke: K(color), 'stroke-width': w || 5, 'stroke-linecap': 'round' }, par); return n; },
      // trait épais bordé d'ink
      tl(d, color, w, cap) {
        const o = sv('path', { d, fill: 'none', stroke: flat ? FC : INK, 'stroke-width': w + 10, 'stroke-linecap': cap || 'round', 'stroke-linejoin': 'round' }, par);
        if (flat) return o;
        return sv('path', { d, fill: 'none', stroke: K(color), 'stroke-width': w, 'stroke-linecap': cap || 'round', 'stroke-linejoin': 'round' }, par);
      },
      t(str, x, y, size, fill, o) { if (flat) return null; return text(par, str, x, y, size, K(fill), o); },
      g(tr) { const n = sv('g', tr ? { transform: tr } : {}, par); const q = ctx(n, flat, sober, fcol); q.node = n; return q; }
    };
    return P;
  }

  /* ------------------------------------------------------------------ */
  /*  Le jeu de pictogrammes (boîte nominale ±120)                       */
  /* ------------------------------------------------------------------ */
  const B = {};

  B.chip = (P, o) => {
    const main = o.color || 'white', acc = main === 'white' ? 'lime' : 'white';
    P.c(0, 0, 100, main);
    if (!P.flat) for (let k = 0; k < 8; k++) P.g(`rotate(${k * 45})`).r(-13, -98, 26, 34, 5, acc, 4);
    P.c(0, 0, 58, main);
    P.t(o.text || '€', 0, 22, 64, 'ink', { mono: 1, anchor: 'middle' });
    return {};
  };
  B.ball = (P) => {
    P.c(0, 0, 66, 'white');
    if (!P.flat) { P.p('M -40 -22 A 46 46 0 0 1 -8 -46', 'none', 9, 'lime'); P.c(0, 0, 66, 'none'); }
    return {};
  };
  B['wheel-mini'] = (P) => {
    P.c(0, 0, 106, 'pocket');
    if (!P.flat) {
      const rin = 50, rout = 90;
      for (let k = 0; k < 12; k++) {
        const a0 = k * 30 * D2R, a1 = (k + 1) * 30 * D2R, X = (r, a) => f2(Math.cos(a) * r) + ' ' + f2(Math.sin(a) * r);
        P.p(`M ${X(rin, a0)} L ${X(rout, a0)} A ${rout} ${rout} 0 0 1 ${X(rout, a1)} L ${X(rin, a1)} A ${rin} ${rin} 0 0 0 ${X(rin, a0)} Z`, k % 2 ? 'pocket' : 'red', 4, 'paper');
      }
      P.c(0, 0, 106, 'none', 6, 'paper');
      P.c(0, 0, 34, 'paper');
      P.c(0, 0, 13, 'lime', 4);
    }
    return {};
  };
  B.hand = (P) => {
    const h = [66, 88, 94, 78];
    P.g('translate(-58 40) rotate(-52)').r(-13, -64, 28, 76, 14, 'white');
    for (let i = 0; i < 4; i++) P.r(-54 + i * 28, -h[i], 25, h[i] + 40, 12, 'white');
    P.r(-62, -10, 124, 104, 30, 'white');
    if (!P.flat) P.r(-48, -14, 96, 24, 0, 'white', 0);
    return {};
  };
  B.breath = (P) => {
    const q = [[-72, 14, 38], [-28, -8, 48], [20, 14, 36]];
    q.forEach((c) => P.c(c[0], c[1], c[2], 'white'));
    if (!P.flat) q.forEach((c) => P.c(c[0], c[1], c[2], 'white', 0));
    P.tl('M 44 -42 H 112', 'lime', 12);
    P.tl('M 62 6 H 128', 'red', 12);
    P.tl('M 44 54 H 104', 'lime', 12);
    return {};
  };
  B.eye = (P) => {
    P.p('M -112 0 C -60 -78 60 -78 112 0 C 60 78 -60 78 -112 0 Z', 'white');
    const iris = P.g();
    iris.c(0, 0, 46, 'lime');
    iris.c(0, 0, 20, 'ink');
    if (!P.flat) iris.c(12, -14, 8, 'white', 0);
    return { iris: iris.node };
  };
  B.planet = (P) => {
    const ring = P.g('rotate(-18)');
    ring.tl('M -126 0 A 126 34 0 0 1 126 0', 'white', 12);
    P.c(0, 0, 70, 'lime');
    if (!P.flat) P.c(-24, -26, 14, 'white', 0);
    P.g('rotate(-18)').tl('M -126 0 A 126 34 0 0 0 126 0', 'white', 12);
    return {};
  };
  B.magnet = (P) => {
    P.tl('M -62 -78 V 8 A 62 62 0 0 0 62 8 V -78', 'red', 44, 'butt');
    P.tl('M -62 -78 V -44', 'white', 44, 'butt');
    P.tl('M 62 -78 V -44', 'white', 44, 'butt');
    if (!P.flat) {
      P.l(-62, -108, -62, -122, 'lime', 7); P.l(62, -108, 62, -122, 'lime', 7);
      P.l(-86, -100, -98, -112, 'lime', 7); P.l(86, -100, 98, -112, 'lime', 7);
    }
    return {};
  };
  B['croupier-hand'] = (P) => {
    const q = P.g('translate(14 -28) rotate(-24 0 40)');
    q.r(-176, 6, 120, 70, 8, 'pocket');
    q.r(-62, 2, 22, 78, 4, 'white');
    for (let i = 0; i < 3; i++) q.r(10, 10 + i * 24, 70, 22, 11, 'white');
    q.g('translate(-30 18) rotate(-52)').r(-14, -66, 28, 74, 14, 'white');
    q.r(-44, 8, 66, 66, 16, 'white');
    if (!P.flat) { q.r(14, 6, 20, 70, 0, 'white', 0); q.c(86, 52, 20, 'red'); }
    return {};
  };
  B.cashbox = (P) => {
    const refs = { stack: [], coins: [] };
    P.r(-105, -52, 210, 70, 10, 'pocket');
    if (!P.flat) {
      for (let k = 0; k < 5; k++) refs.stack.push(P.e(-72 + k * 36, -28, 18, 12, k % 2 ? 'white' : 'lime'));
    }
    P.r(-105, -8, 210, 104, 12, 'lime');
    P.r(-34, 28, 68, 28, 7, 'white');
    P.r(-105, -8, 210, 18, 6, 'ink', 0);
    if (!P.flat) {
      for (let k = 0; k < 5; k++) { const cn = P.c(0, 0, 18, k % 2 ? 'white' : 'lime'); cn.setAttribute('visibility', 'hidden'); refs.coins.push(cn); }
    }
    return refs;
  };
  B.casino = (P) => {
    P.r(-106, -34, 212, 130, 6, 'white');
    P.p('M -126 -30 L 0 -112 L 126 -30 Z', 'red');
    if (!P.flat) {
      [-78, -26, 26, 78].forEach((x) => P.r(x - 12, -22, 24, 96, 4, 'lime'));
      P.c(0, -62, 20, 'lime');
      P.t('€', 0, -50, 32, 'ink', { mono: 1, anchor: 'middle' });
    }
    P.r(-124, 94, 248, 22, 4, 'pocket');
    return {};
  };
  B.cloth = (P) => {
    P.p('M -112 -76 L 112 -76 L 122 66 Q 98 104 76 68 Q 50 112 22 68 Q -6 108 -34 68 Q -62 106 -88 68 Q -106 92 -122 66 Z', 'pocket', 5, 'paper');
    if (!P.flat) {
      P.p('M -60 -72 Q -52 -10 -62 50', 'none', 4, 'paper');
      P.p('M 0 -72 Q 10 -10 2 60', 'none', 4, 'paper');
      P.p('M 62 -72 Q 52 -10 66 50', 'none', 4, 'paper');
    }
    return {};
  };
  B.table = (P) => {
    P.r(-104, 40, 24, 74, 4, 'pocket');
    P.r(80, 40, 24, 74, 4, 'pocket');
    P.p('M -100 -58 L 100 -58 L 140 44 L -140 44 Z', 'red');
    P.r(-140, 44, 280, 32, 5, 'red');
    if (!P.flat) {
      P.p('M -80 -44 L 80 -44 L 114 32 L -114 32 Z', 'lime');
      P.c(-34, -6, 12, 'white', 4); P.c(8, -18, 12, 'white', 4); P.c(44, 2, 12, 'white', 4);
    }
    return {};
  };
  B.safe = (P) => {
    const refs = {};
    P.r(-100, -100, 200, 200, 16, 'white');
    if (!P.flat) {
      P.r(-78, -78, 156, 156, 8, 'pocket');
      P.c(-20, 52, 24, 'lime'); P.c(30, 56, 22, 'lime'); P.c(4, 18, 24, 'white'); P.c(-34, 8, 20, 'lime');
      const door = P.g('translate(-78 0)');
      door.r(0, -78, 156, 156, 8, 'lime');
      door.c(78, 0, 38, 'white');
      door.c(78, 0, 14, 'pocket');
      door.r(66, -5, 52, 10, 4, 'ink', 0);
      door.r(14, -60, 10, 120, 4, 'ink', 0);
      refs.door = door.node;
      P.r(-100, 100, 20, 14, 3, 'pocket'); P.r(80, 100, 20, 14, 3, 'pocket');
    }
    return refs;
  };
  B['sign-open'] = (P) => {
    const refs = {};
    P.l(0, -120, -66, -50, 'ink', 5); P.l(0, -120, 66, -50, 'ink', 5);
    P.c(0, -120, 9, 'white');
    const pl = P.g('translate(0 8)');
    const f1 = pl.g();
    f1.r(-108, -50, 216, 112, 14, 'red');
    f1.t('FERMÉ', 0, 22, 62, 'white', { anchor: 'middle', len: 168 });
    if (!P.flat) {
      const f2g = pl.g();
      f2g.r(-108, -50, 216, 112, 14, 'lime');
      f2g.t('OUVERT', 0, 22, 62, 'ink', { anchor: 'middle', len: 176 });
      refs.f2 = f2g.node;
    }
    refs.pl = pl.node; refs.f1 = f1.node;
    return refs;
  };
  B.mic = (P) => {
    P.p('M -22 4 L 22 4 L 15 106 Q 0 120 -15 106 Z', 'red');
    P.c(0, -56, 48, 'white');
    if (!P.flat) {
      P.p('M -48 -56 H 48 M 0 -104 V -8 M -34 -90 L 34 -22 M 34 -90 L -34 -22', 'none', 4);
      P.c(0, -56, 48, 'none');
    }
    P.r(-30, -8, 60, 18, 5, 'lime');
    return {};
  };
  B.bubble = (P, o) => {
    const shape = 'M -112 -58 Q -112 -78 -92 -78 H 92 Q 112 -78 112 -58 V 36 Q 112 56 92 56 H 8 L -60 112 L -44 56 H -92 Q -112 56 -112 36 Z';
    const refs = {};
    const fr = P.g();
    fr.p(shape, 'white');
    const lines = (o.lines || ['J’AI UN', 'SYSTÈME']);
    fr.t(lines[0], 0, -14, 50, 'ink', { anchor: 'middle', len: 150 });
    fr.t(lines[1], 0, 40, 50, 'ink', { anchor: 'middle', len: 188 });
    refs.front = fr.node;
    if (!P.flat) {
      const bk = P.g();
      bk.p(shape, 'red');
      bk.t('UN', 0, -14, 50, 'white', { anchor: 'middle', len: 70 });
      bk.t('SECRET', 0, 40, 50, 'white', { anchor: 'middle', len: 170 });
      refs.back = bk.node;
    }
    return refs;
  };
  B.envelope = (P) => {
    const refs = { coins: [] };
    if (!P.flat) {
      P.p('M -104 -62 L 0 -142 L 104 -62 Z', 'lime');
    }
    P.r(-104, -66, 208, 134, 10, 'white');
    if (!P.flat) {
      P.p('M -104 -62 L 0 16 L 104 -62', 'none', 5);
      P.c(0, 12, 17, 'red', 4);
    }
    return refs;
  };
  B.coins = (P, o) => {
    const pos = [[-74, 62], [0, 62], [74, 62], [-37, 10], [37, 10], [0, -42]];
    const refs = { coin: [] };
    const n = o.n == null ? 6 : o.n;
    pos.forEach((p, k) => {
      if (k >= pos.length) return;
      const q = P.g(`translate(${p[0]} ${p[1]})`);
      q.c(0, 0, 38, k % 2 ? 'white' : 'lime');
      if (!P.flat) { q.c(0, 0, 24, 'none', 3.5); q.t('€', 0, 9, 26, 'ink', { mono: 1, anchor: 'middle' }); }
      refs.coin.push(q.node);
      if (k >= n) q.node.setAttribute('visibility', 'hidden');
    });
    return refs;
  };
  B.ship = (P) => {
    P.p('M -112 12 H 112 L 82 76 H -86 Z', 'white');
    if (!P.flat) P.p('M -100 36 H 100', 'none', 8, 'red');
    P.r(-62, -34, 124, 46, 8, 'lime');
    P.r(-30, -78, 60, 44, 8, 'white');
    if (!P.flat) {
      [-84, -36, 12, 60].forEach((x) => P.c(x + 6, -12, 9, 'white', 4));
      P.c(-6, -56, 9, 'ink', 0); P.c(14, -56, 9, 'ink', 0);
    }
    P.r(36, -102, 24, 36, 5, 'red');
    P.p('M -112 98 q 14 -16 28 0 t 28 0 t 28 0 t 28 0 t 28 0 t 28 0 t 28 0 t 28 0', 'none', 8, 'ink');
    return {};
  };
  B.heart = (P) => {
    P.p('M 0 80 C -152 -20 -64 -112 0 -42 C 64 -112 152 -20 0 80 Z', 'red');
    if (!P.flat) P.p('M -58 -38 Q -46 -64 -18 -60', 'none', 10, 'white');
    return {};
  };
  B.violin = (P) => {
    P.tl('M 0 -30 V -112', 'pocket', 18, 'butt');
    P.c(0, -122, 15, 'pocket');
    P.c(0, 50, 56, 'white');
    P.c(0, -10, 42, 'white');
    P.r(-40, -18, 80, 40, 0, 'white', 0);
    if (!P.flat) {
      P.c(0, 50, 56, 'white', 0); P.c(0, -10, 42, 'white', 0);
      P.p('M -28 14 q -8 18 0 36 M 28 14 q 8 18 0 36', 'none', 6);
      P.r(-22, 66, 44, 10, 3, 'pocket');
      P.tl('M 88 104 L 100 -70', 'white', 8);
    }
    return {};
  };
  B.trumpet = (P) => {
    P.tl('M 14 -14 H -96 A 21 21 0 0 0 -96 28 H 14', 'white', 18);
    P.p('M 14 -34 L 104 -80 L 104 94 L 14 56 Z', 'red');
    if (!P.flat) {
      [-56, -26, 4].forEach((x) => { P.r(x - 7, -60, 14, 34, 4, 'pocket'); P.c(x, -64, 10, 'lime', 4); });
    }
    return {};
  };
  B.drum = (P) => {
    P.r(-92, -22, 184, 102, 10, 'red');
    if (!P.flat) {
      P.p('M -78 -22 L -52 80 L -26 -22 L 0 80 L 26 -22 L 52 80 L 78 -22', 'none', 6, 'white');
    }
    P.e(0, -22, 92, 28, 'white');
    P.e(0, 80, 92, 28, 'red', 0);
    P.p('M -92 80 A 92 28 0 0 0 92 80', 'none', 5);
    if (!P.flat) {
      P.l(-70, -112, 22, -34, 'white', 13); P.c(-72, -114, 12, 'lime');
      P.l(70, -112, -22, -34, 'white', 13); P.c(72, -114, 12, 'lime');
    }
    return {};
  };
  B.gavel = (P) => {
    const refs = {};
    P.r(-124, 52, 110, 44, 8, 'red');
    P.r(-110, 96, 82, 12, 3, 'pocket');
    const m = P.g('translate(78 14) rotate(0)');
    m.r(-150, -9, 154, 18, 8, 'white');
    m.r(-186, -44, 52, 88, 10, 'lime');
    if (!P.flat) { m.r(-170, -44, 8, 88, 0, 'ink', 0); }
    refs.mallet = m.node;
    return refs;
  };
  B.bars = (P) => {
    for (let i = 0; i < 6; i++) P.r(-90 + i * 36 - 9, -100, 18, 200, 5, 'white');
    P.r(-114, -112, 228, 28, 6, 'red');
    P.r(-114, 84, 228, 28, 6, 'red');
    return {};
  };
  B.idcard = (P) => {
    const refs = {};
    P.r(-116, -76, 232, 152, 14, 'white');
    P.r(-116, -76, 232, 34, 14, 'lime');
    P.r(-116, -56, 232, 14, 0, 'lime', 0);
    if (!P.flat) {
      P.p('M -116 -42 H 116', 'none', 4);
      P.r(-98, -28, 66, 78, 6, 'lime');
      P.c(-65, -6, 14, 'ink', 0);
      P.p('M -88 48 Q -88 20 -65 18 Q -42 20 -42 48 Z', 'ink', 0);
      refs.old = P.r(-14, -24, 104, 16, 3, 'ink', 0);
      refs.nu = P.r(-14, 2, 70, 16, 3, 'lime', 4);
      P.r(-14, 30, 82, 11, 3, 'ink', 0);
      P.r(-14, 49, 56, 11, 3, 'ink', 0);
      refs.scr = sv('path', { d: 'M -20 -12 L -4 -34 L 4 -4 L 20 -34 L 28 -4 L 44 -34 L 52 -4 L 68 -34 L 76 -4 L 94 -34', fill: 'none', stroke: C.red, 'stroke-width': 8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', pathLength: 1, 'stroke-dasharray': 1, 'stroke-dashoffset': 1 }, P.node);
    }
    return refs;
  };
  B.mound = (P, o) => {
    const col = o.color || 'paper';
    P.p('M -128 80 L -128 66 Q -112 62 -96 62 Q -58 56 -34 34 Q -8 10 22 14 Q 52 16 74 40 Q 96 60 128 66 L 128 80 Z', col);
    if (!P.flat) {
      const neg = col === 'ink' ? 'paper' : 'ink';
      P.l(-70, 70, -40, 70, neg, 6); P.l(-14, 56, 22, 56, neg, 6); P.l(50, 70, 92, 70, neg, 6);
    }
    return {};
  };
  B.hook = (P) => {
    P.l(0, -1500, 0, 6, 'white', 7);
    P.tl('M 0 0 V 40 C 0 116 -84 120 -84 52', 'white', 14);
    P.p('M -84 54 L -108 22 L -62 26 Z', 'white');
    return {};
  };
  B.scale = (P, o) => {
    const refs = {};
    P.p('M -22 122 L 22 122 L 12 -64 L -12 -64 Z', 'white');
    P.r(-74, 102, 148, 22, 8, 'red');
    const beam = P.g('translate(0 -70)');
    beam.r(-124, -9, 248, 18, 9, 'white');
    refs.beam = beam.node;
    P.c(0, -70, 15, 'lime');
    const mkPan = (side) => {
      const q = P.g();
      const strings = [];
      if (!P.flat) {
        strings.push(P.l(0, 0, 0, 0, 'ink', 4)); strings.push(P.l(0, 0, 0, 0, 'ink', 4));
      }
      const pan = P.g();
      pan.p('M -64 0 H 64 A 64 40 0 0 1 -64 0 Z', side < 0 ? 'white' : 'red');
      return { pan: pan.node, strings };
    };
    refs.L = mkPan(-1); refs.R = mkPan(1);
    refs.set = (a) => {
      const c = Math.cos(a * D2R), s = Math.sin(a * D2R);
      refs.beam.setAttribute('transform', `translate(0 -70) rotate(${f2(a)})`);
      [[refs.L, -124 * c, -70 - 124 * s], [refs.R, 124 * c, -70 + 124 * s]].forEach(([pr, ex, ey]) => {
        pr.pan.setAttribute('transform', `translate(${f2(ex)} ${f2(ey + 96)})`);
        if (pr.strings.length) {
          pr.strings[0].setAttribute('x1', f2(ex)); pr.strings[0].setAttribute('y1', f2(ey)); pr.strings[0].setAttribute('x2', f2(ex - 54)); pr.strings[0].setAttribute('y2', f2(ey + 96));
          pr.strings[1].setAttribute('x1', f2(ex)); pr.strings[1].setAttribute('y1', f2(ey)); pr.strings[1].setAttribute('x2', f2(ex + 54)); pr.strings[1].setAttribute('y2', f2(ey + 96));
        }
      });
    };
    refs.set(0);
    return refs;
  };
  B.chair = (P, o) => {
    P.r(-52, -112, 104, 106, 14, 'white');
    P.r(-66, -10, 132, 32, 10, 'red');
    P.r(-56, 20, 18, 92, 4, 'pocket'); P.r(38, 20, 18, 92, 4, 'pocket');
    return {};
  };
  B['zero-seat'] = (P) => {
    const refs = {};
    P.r(-60, -118, 120, 112, 16, 'white');
    P.r(-76, -10, 152, 34, 12, 'red');
    P.r(-66, 22, 20, 98, 4, 'pocket'); P.r(46, 22, 20, 98, 4, 'pocket');
    const z = P.g();
    z.c(0, -48, 70, 'lime');
    z.t('0', 0, -7, 112, 'ink', { anchor: 'middle' });
    refs.zero = z.node;
    return refs;
  };
  B.slot = (P) => {
    P.r(-96, -112, 176, 228, 18, 'red');
    P.r(-72, -98, 128, 36, 8, 'lime');
    P.r(-74, -40, 132, 92, 8, 'white');
    if (!P.flat) {
      P.l(-30, -40, -30, 52, 'ink', 4); P.l(14, -40, 14, 52, 'ink', 4);
      ['7', '0', '€'].forEach((s, i) => P.t(s, -52 + i * 44, 28, 60, i === 1 ? 'red' : 'ink', { mono: 1, anchor: 'middle' }));
    }
    P.r(-60, 74, 100, 22, 5, 'pocket');
    P.tl('M 88 -50 L 118 -100', 'white', 10);
    P.c(120, -104, 17, 'lime');
    return {};
  };
  B.house = (P) => {
    P.r(-90, -22, 180, 120, 6, 'white');
    P.r(44, -102, 28, 52, 4, 'pocket');
    P.p('M -112 -18 L 0 -112 L 112 -18 Z', 'red');
    if (!P.flat) {
      P.r(-24, 36, 48, 62, 6, 'lime');
      P.r(-76, 4, 34, 34, 4, 'lime'); P.r(42, 4, 34, 34, 4, 'lime');
    }
    return {};
  };
  B.wells = (P, o) => {
    const col = o.color || 'ink', neg = col === 'ink' ? 'paper' : 'ink';
    P.p('M -64 124 Q -64 44 -26 30 L 26 30 Q 64 44 64 124 Z', col, 0);
    P.r(-13, 6, 26, 36, 4, col, 0);
    P.e(0, -16, 33, 40, col, 0);
    P.r(-54, -66, 108, 13, 6, col, 0);
    P.r(-35, -132, 70, 72, 6, col, 0);
    if (!P.flat) {
      P.p('M -24 6 Q -11 -5 0 4 Q 11 -5 24 6 Q 11 13 0 9 Q -11 13 -24 6 Z', neg, 0);
      P.r(-35, -86, 70, 12, 0, neg, 0);
    }
    return {};
  };

  const NOSHADOW = { scale: 1 };
  // ombre portée aussi pour les parties animées (gavel) : liste des animations par picto
  function mkPicto(parent, name, o) {
    o = o || {};
    const root = g(parent);
    const fcol = o.bg === 'ink' ? '#2A2A2A' : INK;
    const sh = g(root, { transform: 'translate(7 7)' });
    const body = g(root);
    const fn = B[name] || B.chip;
    const shRefs = NOSHADOW[name] ? (sh.setAttribute('visibility', 'hidden'), {}) : (fn(ctx(sh, true, !!o.sober, fcol), o) || {});
    const refs = fn(ctx(body, false, !!o.sober), o) || {};
    return { root, body, shadow: sh, refs, shRefs, name };
  }
  ZV.PICTO = { mk: mkPicto, names: Object.keys(B), ctx };

  /* ------------------------------------------------------------------ */
  /*  Outils de mise en page                                              */
  /* ------------------------------------------------------------------ */
  const measCache = {};
  function meas(root, str, size, mono) {
    const key = str + '|' + size + '|' + (mono ? 1 : 0);
    if (measCache[key] != null) return measCache[key];
    let w = str.length * size * (mono ? 0.6 : 0.6);
    try {
      const n = text(root, str, 0, 0, size, '#000', { mono });
      const b = n.getComputedTextLength();
      root.removeChild(n);
      if (b > 0) w = b;
    } catch (e) { /* estimation */ }
    measCache[key] = w;
    return w;
  }
  function bgFill(bg) { return bg === 'paper' ? C.paper : bg === 'lime' ? C.lime : C.ink; }
  function bgNodes(root, bg) {
    rect(root, 0, 0, 1920, 1080, 0, bgFill(bg));
    const id = 'pg' + (++UID);
    const defs = sv('defs', null, root);
    const pat = sv('pattern', { id, width: 56, height: 56, patternUnits: 'userSpaceOnUse' }, defs);
    sv('circle', { cx: 28, cy: 28, r: 3.2, fill: bg === 'ink' ? C.paper : INK, opacity: bg === 'ink' ? 0.1 : 0.1 }, pat);
    rect(root, 0, 0, 1920, 1080, 0, `url(#${id})`);
  }
  const inkOn = (bg) => (bg === 'ink' ? C.paper : INK);

  // légende Mono sous un picto : une ou deux lignes, ajustée à maxW
  function makeLabel(root, str, size, maxW, fill) {
    const grp = g(root);
    if (!str) return { grp, h: 0 };
    const w1 = meas(root, str, size, true);
    const lines = [];
    if (w1 <= maxW) lines.push([str, size]);
    else {
      const words = str.split(' ');
      let best = null;
      for (let k = 1; k < words.length; k++) {
        const a = words.slice(0, k).join(' '), b = words.slice(k).join(' ');
        const m = Math.max(meas(root, a, size, true), meas(root, b, size, true));
        if (!best || m < best.m) best = { a, b, m };
      }
      if (best) { const sz = Math.min(size, size * maxW / best.m); lines.push([best.a, sz], [best.b, sz]); } else lines.push([str, size * maxW / w1]);
    }
    lines.forEach((ln, i) => text(grp, ln[0], 0, i * size * 1.15, ln[1], fill, { mono: 1, anchor: 'middle' }));
    return { grp, h: lines.length * size * 1.15 };
  }

  const popE = (p) => E.back(clamp(p));

  // entrée d'un picto : renvoie [dx, dy, scale, rot, opacity]
  function entry(style, p, slow) {
    p = clamp(p);
    if (style === 'drop') { const b = E.bounce(p); return [0, -460 * (1 - b), 1, 0, p > 0 ? 1 : 0]; }
    if (style === 'slide') { return [560 * (1 - E.out3(p)), 0, 1, 0, p > 0 ? 1 : 0]; }
    if (style === 'rise') { return [0, 420 * (1 - E.out3(p)), 1, 0, p > 0 ? 1 : 0]; }
    const s = slow ? E.out2(p) : popE(p);
    return [0, 0, s, 0, p > 0 ? 1 : 0];
  }
  const ENT_DUR = { pop: 0.34, drop: 0.62, slide: 0.45, rise: 0.5 };

  function strikeCross(root, sober, R) {
    const grp = g(root);
    const col = sober ? C.paper : C.red;
    const mk = (x1, y1, x2, y2) => {
      const o = sv('line', { x1, y1, x2: x1, y2: y1, stroke: INK, 'stroke-width': 28, 'stroke-linecap': 'round' }, grp);
      const l = sv('line', { x1, y1, x2: x1, y2: y1, stroke: col, 'stroke-width': 18, 'stroke-linecap': 'round' }, grp);
      return { o, l, x1, y1, x2, y2 };
    };
    const a = mk(-R, -R, R, R), b = mk(R, -R, -R, R);
    const set = (ln, p) => {
      const x = ln.x1 + (ln.x2 - ln.x1) * p, y = ln.y1 + (ln.y2 - ln.y1) * p;
      [ln.o, ln.l].forEach((n) => { n.setAttribute('x2', f2(x)); n.setAttribute('y2', f2(y)); });
    };
    return { grp, set: (p) => { set(a, clamp(p * 2)); set(b, clamp(p * 2 - 1)); grp.setAttribute('visibility', p > 0 ? 'visible' : 'hidden'); } };
  }

  function titleSticker(root, str, bg, y) {
    const size = 70, w = meas(root, str, size, false) + 90, h = 116;
    const fill = bg === 'paper' ? 'lime' : 'paper';
    const grp = g(root);
    const stk = ZV.sticker(grp, w, h, fill === 'lime' ? C.lime : C.paper, null, size, INK, { sh: 10 });
    text(stk, str, 0, size * 0.35, size, INK, { anchor: 'middle', len: w - 90 });
    return { grp, y: y || 150 };
  }

  /* ------------------------------------------------------------------ */
  /*  Scènes dédiées (mode `scene`), clé = noms des pictos triés          */
  /* ------------------------------------------------------------------ */
  const SC = {};
  const cueAct = (shot, name, action) => { const b = shot.beats.find((x) => x.do === 'cue' && x.name === name && (action ? x.action === action : !x.action)); return b ? b.t : null; };
  const Z0 = (v, d) => (v == null ? d : v);

  // vue depuis ta chaise : la table devant, la chaise d'en face occupée par un gros 0
  SC['table+zero-seat'] = {
    init(st) {
      const o = { bg: st.bg };
      st.seat = mkPicto(st.root, 'zero-seat', o);
      st.table = mkPicto(st.root, 'table', o);
      const w = meas(st.root, 'EN FACE DE TOI', 64, false) + 80;
      st.stk = ZV.sticker(st.root, w, 110, C.lime, null, 64, INK, { sh: 10 });
      text(st.stk, 'EN FACE DE TOI', 0, 22, 64, INK, { anchor: 'middle', len: w - 80 });
      st.ta = Z0(cueAct(st.shot, 'a'), 0); st.tb = Z0(cueAct(st.shot, 'b'), 1.5);
    },
    tick(st, t) {
      const { ta, tb } = st;
      const p = E.out3(prog(t, ta, ta + 0.5));
      put(st.table.root, 960, 690 + 420 * (1 - p), 0, 1.95, 1.95, t >= ta ? 1 : 0);
      const q = popE(prog(t, tb, tb + 0.4));
      put(st.seat.root, 960, 390, 0, 2.0 * q, 2.0 * q, t >= tb ? 1 : 0);
      const d = prog(t, tb + 0.3, tb + 0.8), zr = st.seat.refs.zero;
      zr.setAttribute('transform', `translate(0 ${f2(-330 * (1 - E.bounce(d)))})`);
      zr.setAttribute('visibility', t >= tb + 0.3 ? 'visible' : 'hidden');
      const k = popE(prog(t, tb + 0.7, tb + 1.05));
      put(st.stk, 1480, 300, 3, k, k, t >= tb + 0.7 ? 1 : 0);
    }
  };

  // drap noir sur la table, coffre qui s'ouvre, drap tiré, pancarte qui se retourne
  SC['cloth+safe+sign-open'] = {
    init(st) {
      const o = { bg: st.bg };
      st.table = mkPicto(st.root, 'table', o);
      st.cloth = mkPicto(st.root, 'cloth', o);
      st.safe = mkPicto(st.root, 'safe', o);
      st.sign = mkPicto(st.root, 'sign-open', o);
      st.l1 = makeLabel(st.root, 'DRAP NOIR', 40, 440, inkOn(st.bg));
      st.l2 = makeLabel(st.root, 'LE COFFRE', 40, 440, inkOn(st.bg));
      st.l3 = makeLabel(st.root, 'OUVERT', 40, 440, inkOn(st.bg));
      st.ta = Z0(cueAct(st.shot, 'a'), 0); st.tb = Z0(cueAct(st.shot, 'b'), 1.9);
      st.tp = Z0(cueAct(st.shot, 'a', 'pull-off'), 2.6); st.tc = Z0(cueAct(st.shot, 'c'), 3.5);
    },
    tick(st, t) {
      const { ta, tb, tp, tc } = st;
      // la table est là dès le début
      put(st.table.root, 460, 580, 0, 1.9, 1.9, 1);
      // le drap tombe puis est tiré vers la gauche
      let cx = 460, cy = 500, cr = 0;
      const fall = prog(t, ta, ta + 0.55);
      cy = 500 - 700 * (1 - E.bounce(fall));
      const pull = E.in2(prog(t, tp, tp + 0.5));
      cx = 460 - 900 * pull; cr = -26 * pull; cy -= 70 * pull;
      put(st.cloth.root, cx, cy, cr, 2.3, 2.3, t >= ta ? 1 : 0);
      put(st.l1.grp, 460, 820, 0, 1, 1, popE(prog(t, ta + 0.5, ta + 0.8)));
      // coffre
      const sb = popE(prog(t, tb, tb + 0.36));
      put(st.safe.root, 960, 560, 0, 1.85 * sb, 1.85 * sb, t >= tb ? 1 : 0);
      const open = E.io2(prog(t, tb + 0.3, tb + 0.8));
      st.safe.refs.door.setAttribute('transform', `translate(-78 0) scale(${f2(1 - 0.84 * open)} 1)`);
      put(st.l2.grp, 960, 820, 0, 1, 1, popE(prog(t, tb + 0.3, tb + 0.6)));
      // pancarte : entre en se balançant puis se retourne FERMÉ -> OUVERT
      const sp = prog(t, tc, tc + 0.5), sc = E.back(sp);
      const sway = Math.sin((t - tc) * 7) * 9 * Math.pow(1 - clamp((t - tc) / 1.4), 2);
      put(st.sign.root, 1450, 570 - 40 * (1 - E.out3(sp)), sway, 1.75 * sc, 1.75 * sc, t >= tc ? 1 : 0);
      const fl = prog(t, tc + 0.55, tc + 1.0), cs = Math.cos(fl * Math.PI);
      const pr = st.sign.refs;
      pr.pl.setAttribute('transform', `translate(0 8) scale(${f2(Math.max(Math.abs(cs), 0.001))} 1)`);
      show(pr.f1, cs > 0); show(pr.f2, cs <= 0);
      put(st.l3.grp, 1450, 820, 0, 1, 1, popE(prog(t, tc + 0.9, tc + 1.2)));
    }
  };

  // micro, bulle qui se retourne, tas de pièces
  SC['bubble+coins+mic'] = {
    init(st) {
      const o = { bg: st.bg };
      st.mic = mkPicto(st.root, 'mic', o);
      st.bub = mkPicto(st.root, 'bubble', o);
      st.hp = mkPicto(st.root, 'coins', { bg: st.bg, n: 6 });
      st.l1 = makeLabel(st.root, '« J’AI UN SYSTÈME »', 38, 520, inkOn(st.bg));
      st.l2 = makeLabel(st.root, 'PAS À LUI', 44, 460, inkOn(st.bg));
      st.ta = Z0(cueAct(st.shot, 'a'), 0); st.tb = Z0(cueAct(st.shot, 'b'), 1.3);
      st.tf = Z0(cueAct(st.shot, 'b', 'flip'), 2.6); st.tc = Z0(cueAct(st.shot, 'c'), 4.6);
    },
    tick(st, t) {
      const { ta, tb, tf, tc } = st;
      const pm = popE(prog(t, ta, ta + 0.4));
      put(st.mic.root, 400, 540, -8, 2.2 * pm, 2.2 * pm, t >= ta ? 1 : 0);
      const pb = prog(t, tb, tb + 0.5);
      const bs = E.back(pb);
      const bx = lerp(520, 980, E.out3(pb)), by = lerp(430, 460, E.out3(pb));
      const fl = prog(t, tf, tf + 0.5), cs = Math.cos(fl * Math.PI);
      put(st.bub.root, bx, by, -3, 2.3 * bs * Math.max(Math.abs(cs), 0.001), 2.3 * bs, t >= tb ? 1 : 0);
      show(st.bub.refs.front, cs > 0); show(st.bub.refs.back, cs <= 0);
      put(st.l1.grp, 980, 810, 0, popE(prog(t, tb + 0.3, tb + 0.6)), 1, 1);
      const pc = popE(prog(t, tc, tc + 0.45));
      put(st.hp.root, 1520, 540, 0, 1.85 * pc, 1.85 * pc, t >= tc ? 1 : 0);
      put(st.l2.grp, 1520, 810, 0, popE(prog(t, tc + 0.3, tc + 0.6)), 1, 1);
    }
  };

  // enveloppe des investisseurs -> pièces qui voyagent vers Wells
  SC['coins+envelope'] = {
    init(st) {
      const o = { bg: st.bg };
      st.env = mkPicto(st.root, 'envelope', o);
      st.wells = mkPicto(st.root, 'wells', { bg: st.bg });
      st.heap = mkPicto(st.root, 'coins', { bg: st.bg, n: 6 });
      st.fly = [];
      for (let k = 0; k < 6; k++) st.fly.push(mkPicto(st.root, 'chip', { bg: st.bg, color: k % 2 ? 'white' : 'lime', text: '€' }));
      st.l1 = makeLabel(st.root, 'INVESTISSEURS ANGLAIS', 36, 560, inkOn(st.bg));
      st.l2 = makeLabel(st.root, 'WELLS', 44, 360, inkOn(st.bg));
      st.ta = Z0(cueAct(st.shot, 'a'), 0);
    },
    tick(st, t) {
      const { ta } = st;
      const pe = popE(prog(t, ta, ta + 0.4));
      put(st.env.root, 460, 560, -3, 2.1 * pe, 2.1 * pe, t >= ta ? 1 : 0);
      put(st.l1.grp, 460, 810, 0, popE(prog(t, ta + 0.3, ta + 0.6)), 1, 1);
      const pw = popE(prog(t, ta + 0.5, ta + 0.95));
      put(st.wells.root, 1600, 520, 0, 1.4 * pw, 1.4 * pw, t >= ta + 0.5 ? 1 : 0);
      put(st.l2.grp, 1600, 790, 0, popE(prog(t, ta + 0.8, ta + 1.1)), 1, 1);
      let landed = 0;
      for (let k = 0; k < 6; k++) {
        const t0 = ta + 0.9 + k * 0.3, dur = 0.8, q = prog(t, t0, t0 + dur);
        const f = st.fly[k];
        if (q <= 0 || q >= 1) { put(f.root, 0, 0, 0, 0, 0, 0); if (q >= 1) landed++; continue; }
        const e = E.io2(q);
        const x = lerp(470, 1250, e), y = lerp(400, 560, e) - Math.sin(q * Math.PI) * 230;
        const sx = (Math.abs(Math.cos(q * Math.PI * 4)) * 0.8 + 0.2) * 0.6;
        put(f.root, x, y, 0, Math.max(sx, 0.02), 0.6, 1);
      }
      put(st.heap.root, 1240, 620, 0, 1.4, 1.4, landed > 0 ? 1 : 0);
      st.heap.refs.coin.forEach((c, k) => show(c, k < landed));
      st.heap.shRefs.coin.forEach((c, k) => show(c, k < landed));
    }
  };

  // marteau puis barreaux
  SC['bars+gavel'] = {
    init(st) {
      const o = { bg: st.bg };
      st.gav = mkPicto(st.root, 'gavel', o);
      st.bars = mkPicto(st.root, 'bars', o);
      st.l1 = makeLabel(st.root, 'PROCÈS', 54, 440, inkOn(st.bg));
      st.l2 = makeLabel(st.root, '8 ANS', 54, 440, inkOn(st.bg));
      st.ta = Z0(cueAct(st.shot, 'a'), 0); st.tb = Z0(cueAct(st.shot, 'b'), 2.2);
    },
    tick(st, t) {
      const { ta, tb } = st;
      const pg = popE(prog(t, ta, ta + 0.3));
      put(st.gav.root, 660, 570, 0, 2.0 * pg, 2.0 * pg, t >= ta ? 1 : 0);
      // deux coups : levé (55°) puis abattu (0°) avec petit rebond
      const hit = (t0) => { const q = prog(t, t0, t0 + 0.14); return q; };
      let ang = 58;
      const h1 = ta + 0.55, h2 = ta + 1.4;
      if (t < h1) ang = 58 - 6 * Math.sin(prog(t, ta, h1) * Math.PI);
      else if (t < h2) { const q = prog(t, h1, h1 + 0.12); const rb = prog(t, h1 + 0.12, h2 - 0.15); ang = q < 1 ? 58 * (1 - E.in2(q)) : (rb < 1 ? 26 * Math.sin(rb * Math.PI) * (1 - rb) : 0); if (rb >= 1) ang = 58 * E.out2(prog(t, h2 - 0.15, h2)); }
      else { const q = prog(t, h2, h2 + 0.12); ang = 58 * (1 - E.in2(q)); const rb = prog(t, h2 + 0.12, h2 + 0.5); if (q >= 1) ang = 14 * Math.sin(rb * Math.PI) * (1 - rb); }
      [st.gav.refs, st.gav.shRefs].forEach((r) => r && r.mallet && r.mallet.setAttribute('transform', `translate(78 14) rotate(${f2(ang)})`));
      put(st.l1.grp, 600, 822, 0, popE(prog(t, ta + 0.4, ta + 0.7)), 1, 1);
      // barreaux : tombent du haut
      const pb = prog(t, tb, tb + 0.6);
      put(st.bars.root, 1330, 530 - 760 * (1 - E.bounce(pb)), 0, 2.0, 2.0, t >= tb ? 1 : 0);
      put(st.l2.grp, 1330, 822, 0, popE(prog(t, tb + 0.4, tb + 0.7)), 1, 1);
    }
  };

  // carte d'identité dont le nom est gribouillé
  SC.idcard = {
    init(st) {
      st.card = mkPicto(st.root, 'idcard', { bg: st.bg });
      st.l1 = makeLabel(st.root, 'UN AUTRE NOM', 50, 700, inkOn(st.bg));
      const tt = cueAct(st.shot, 'title');
      st.t0 = tt == null ? 0.3 : tt + 0.4;
      st.ts = Z0(cueAct(st.shot, 'a', 'scribble-name'), st.t0 + 1);
    },
    tick(st, t) {
      const pc = popE(prog(t, st.t0, st.t0 + 0.45));
      put(st.card.root, 960, 520, -3, 3.1 * pc, 3.1 * pc, t >= st.t0 ? 1 : 0);
      const r = st.card.refs;
      const sp = prog(t, st.ts, st.ts + 0.5);
      r.scr.setAttribute('stroke-dashoffset', f2(1 - sp));
      show(r.nu, t >= st.ts + 0.6);
      const k = popE(prog(t, st.ts + 0.6, st.ts + 0.9));
      r.nu.setAttribute('transform', `translate(-14 10) scale(${f2(Math.max(k, 0.001))} 1) translate(14 -10)`);
      put(st.l1.grp, 960, 830, 0, popE(prog(t, st.ts + 0.5, st.ts + 0.8)), 1, 1);
    }
  };

  // balance : un petit poids lime marqué 0 tombe du côté de la maison
  SC['chip+scale'] = {
    init(st) {
      const o = { bg: st.bg };
      st.sc = mkPicto(st.root, 'scale', o);
      const mkStack = (pan, n, color) => {
        const arr = [];
        for (let k = 0; k < n; k++) {
          const c = g(pan, { transform: `translate(${(k - (n - 1) / 2) * 44} -16)` });
          circle(c, 0, 0, 20, color, INK, 5);
          arr.push(c);
        }
        return arr;
      };
      mkStack(st.sc.refs.L.pan, 3, C.white); mkStack(st.sc.refs.R.pan, 3, C.white);
      st.wt = mkPicto(st.root, 'chip', { bg: st.bg, color: 'lime', text: '0' });
      st.l1 = makeLabel(st.root, 'CÔTÉ MAISON', 44, 460, inkOn(st.bg));
      st.ta = Z0(cueAct(st.shot, 'a'), 0); st.tb = Z0(cueAct(st.shot, 'b'), 1.7);
    },
    tick(st, t) {
      const { ta, tb } = st;
      const S = 2.2, cx = 960, cy = 540;
      const ps = popE(prog(t, ta, ta + 0.45));
      put(st.sc.root, cx, cy, 0, S * ps, S * ps, t >= ta ? 1 : 0);
      const fallT = 0.5, q = prog(t, tb, tb + fallT);
      // tilt : ressort amorti après l'impact
      const ti = t - (tb + fallT);
      const A = ti < 0 ? 0 : 9 * (1 - Math.exp(-ti * 6) * Math.cos(ti * 14));
      st.sc.refs.set(A);
      // position du plateau droit dans le repère écran
      const ex = 124 * Math.cos(A * D2R), ey = -70 + 124 * Math.sin(A * D2R) + 96;
      const px = cx + ex * S, py = cy + ey * S;
      const wy = lerp(-380, py - 56, E.in2(q));
      const landed = t >= tb + fallT;
      const by = landed ? py - 20 * S * 0.75 - 22 * 0 : wy;
      const bob = landed ? Math.max(0, 1 - ti * 2.5) * Math.abs(Math.sin(ti * 16)) * -26 : 0;
      put(st.wt.root, px + 6, (landed ? py - 50 : wy) + bob, 0, 0.58, 0.58, t >= tb ? 1 : 0);
      put(st.l1.grp, px + 170, 800, 0, popE(prog(t, tb + 0.5, tb + 0.8)), 1, 1);
    }
  };

  // hameçon et jeton lime en appât
  SC['chip+hook'] = {
    init(st) {
      const o = { bg: st.bg };
      st.hook = mkPicto(st.root, 'hook', o);
      st.bait = mkPicto(st.root, 'chip', { bg: st.bg, color: 'lime', text: '€' });
      st.l1 = makeLabel(st.root, 'LE GAIN DE CE SOIR', 44, 640, inkOn(st.bg));
      st.ta = Z0(cueAct(st.shot, 'a'), 1.4); st.tb = Z0(cueAct(st.shot, 'b'), 3.3);
      st.ts = Z0(cueAct(st.shot, 'a', 'snap'), st.shot.dur - 1.5);
    },
    tick(st, t) {
      const { ta, tb, ts } = st;
      // l'hameçon descend du haut du cadre jusqu'à y=330 en se balançant légèrement
      const pd = E.out3(prog(t, ta, ta + 1.1));
      let hy = lerp(-120, 330, pd);
      const snapQ = prog(t, ts, ts + 0.12);
      hy -= 210 * E.out2(snapQ);
      const rec = ts + 0.12;
      if (t > rec) { const u = t - rec; hy += 54 * (1 - Math.exp(-u * 4)) * 1 - 0; hy += Math.sin(u * 22) * 10 * Math.exp(-u * 3.5); }
      const sway = t > ta ? Math.sin((t - ta) * 3.2) * 2.2 * (1 - 0.6 * snapQ) : 0;
      put(st.hook.root, 1040, hy, sway, 2.1, 2.1, t >= ta ? 1 : 0);
      // le jeton se pique à la pointe de l'hameçon
      const pb = popE(prog(t, tb, tb + 0.42));
      const rad = sway * D2R;
      const tipX = 1040 + (-84 * Math.cos(rad) - 62 * Math.sin(rad)) * 2.1, tipY = hy + (-84 * Math.sin(rad) + 62 * Math.cos(rad)) * 2.1;
      put(st.bait.root, tipX - 6, tipY + 72, sway * 1.6, 0.85 * pb, 0.85 * pb, t >= tb ? 1 : 0);
      put(st.l1.grp, 1000, 800, 0, popE(prog(t, tb + 0.35, tb + 0.7)), 1, 1);
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Mode multiply : une table devient 4, 16, 64                         */
  /* ------------------------------------------------------------------ */
  function buildMultiply(st) {
    const root = st.root;
    st.tables = [];
    const tg = g(root);
    for (let k = 0; k < 64; k++) {
      const n = g(tg);
      sv('path', { d: 'M -94 -52 L 106 -52 L 146 50 L -134 50 Z', fill: INK }, n).setAttribute('transform', 'translate(7 9)');
      sv('rect', { x: -104, y: 40, width: 24, height: 74, rx: 4, fill: C.pocket, stroke: INK, 'stroke-width': 6 }, n);
      sv('rect', { x: 80, y: 40, width: 24, height: 74, rx: 4, fill: C.pocket, stroke: INK, 'stroke-width': 6 }, n);
      sv('path', { d: 'M -100 -58 L 100 -58 L 140 44 L -140 44 Z', fill: C.red, stroke: INK, 'stroke-width': 7, 'stroke-linejoin': 'round' }, n);
      sv('rect', { x: -140, y: 44, width: 280, height: 32, rx: 5, fill: C.red, stroke: INK, 'stroke-width': 7 }, n);
      sv('path', { d: 'M -80 -44 L 80 -44 L 114 32 L -114 32 Z', fill: C.lime, stroke: INK, 'stroke-width': 6, 'stroke-linejoin': 'round' }, n);
      st.tables.push(n);
    }
    // positions finales de chaque palier (centrées dans la zone 1920x(150..820))
    const grids = [[1, 1, 1.9, 0, 0], [2, 2, 1.1, 330, 262], [4, 4, 0.7, 236, 140], [8, 8, 0.4, 150, 72]];
    st.slots = grids.map(([cols, rows, scale, pw, ph]) => {
      const arr = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        arr.push({ x: 960 + (c - (cols - 1) / 2) * pw, y: 500 + (r - (rows - 1) / 2) * ph - 28 * scale, s: scale });
      }
      return arr;
    });
    st.cnt = text(root, '× 1', 960, 168, 120, inkOn(st.bg), { anchor: 'middle' });
    st.lab = makeLabel(root, (st.shot.props.items && st.shot.props.items[0] && st.shot.props.items[0].label) || '', 46, 700, inkOn(st.bg));
    st.ta = Z0(cueAct(st.shot, 'a'), 0.4);
    st.t4 = Z0(cueAct(st.shot, 'x4'), st.ta + 1.2);
    st.t16 = Z0(cueAct(st.shot, 'x16'), st.t4 + 0.9);
    st.t64 = st.t16 + 0.42;
  }
  function tickMultiply(st, t) {
    const stage = t >= st.t64 ? 3 : t >= st.t16 ? 2 : t >= st.t4 ? 1 : 0;
    const t0s = [st.ta, st.t4, st.t16, st.t64];
    const cur = st.slots[stage], prev = stage ? st.slots[stage - 1] : null;
    const q = prog(t, t0s[stage], t0s[stage] + (stage === 0 ? 0.4 : stage === 3 ? 0.4 : 0.34));
    st.tables.forEach((n, k) => {
      if (stage === 0 && t < st.ta) { put(n, 0, 0, 0, 0, 0, 0); return; }
      if (k >= cur.length) { put(n, 0, 0, 0, 0, 0, 0); return; }
      const to = cur[k];
      if (!prev) { const s = popE(q); put(n, to.x, to.y, 0, to.s * s, to.s * s, 1); return; }
      // les tables existantes (index < prev.length) glissent vers leur nouvelle place ; les nouvelles « se dédoublent » depuis leur parente
      const parentIdx = k < prev.length ? k : k % prev.length;
      const from = prev[parentIdx];
      const e = k < prev.length ? E.io2(q) : E.out3(q);
      const x = lerp(from.x, to.x, e), y = lerp(from.y, to.y, e), s = lerp(from.s, to.s, e);
      put(n, x, y, 0, s, s, 1);
    });
    const num = [1, 4, 16, 64][stage];
    const bump = 1 + 0.12 * Math.sin(clamp(q) * Math.PI);
    st.cnt.textContent = '× ' + num;
    st.cnt.setAttribute('transform', `translate(0 0)`);
    st.cnt.setAttribute('visibility', t >= st.ta ? 'visible' : 'hidden');
    const lp = stage === 0 ? popE(prog(t, st.ta + 0.3, st.ta + 0.6)) : 0;
    put(st.lab.grp, 960, 740, 0, lp, lp, lp);
  }

  /* ------------------------------------------------------------------ */
  /*  Définition                                                         */
  /* ------------------------------------------------------------------ */
  // caisse qui se vide : les pièces sautent de la caisse et tombent
  function cashboxTick(I, u) {
    const r = I.node.refs; if (!r.coins) return;
    const t0 = 0.5, per = 0.28;
    r.coins.forEach((cn, k) => {
      const s = t0 + k * per, q = (u - s) / 0.95;
      if (q < 0 || q > 1) { cn.setAttribute('visibility', 'hidden'); return; }
      const dir = k % 2 ? 1 : -1;
      const x = -60 + k * 30 + dir * q * 70, y = -40 - 210 * q + 330 * q * q, sh = 1 - prog(q, 0.78, 1);
      cn.setAttribute('transform', `translate(${f2(x)} ${f2(y)}) scale(${f2((Math.abs(Math.cos(q * 9)) * 0.7 + 0.3) * sh)} ${f2(sh)})`);
      cn.setAttribute('visibility', 'visible');
    });
    r.stack.forEach((s, k) => show(s, u < t0 + k * per));
  }

  ZV.define('pictos', {
    init(root, shot) {
      const pr = shot.props || {};
      const bg = pr.bg || 'ink';
      const st = { root, shot, bg, mode: pr.mode || 'row', sober: shot.id === 's1-17' };
      bgNodes(root, bg);
      const layer = g(root);
      st.root = layer;
      const items = (pr.items || []).slice();
      st.title = pr.title ? titleSticker(layer, pr.title, bg, 150) : null;
      st.tTitle = ZV.cue(shot, 'title');
      if (st.title && st.tTitle == null) st.tTitle = 0.1;
      st.fx = {};
      if (st.mode === 'multiply') { buildMultiply(st); return st; }
      const key = items.map((i) => i.picto).sort().join('+');
      if (st.mode === 'scene' && SC[key]) {
        st.scene = SC[key];
        st.scene.init(st);
        return st;
      }
      // mise en page « rangée »
      const n = Math.max(1, Math.min(items.length, 4));
      const sc = [2.2, 2.2, 1.95, 1.7, 1.4][n];
      const sp = [0, 600, 600, 540, 440][n];
      const cy = pr.title ? 480 : 450;
      const lsz = n <= 2 ? 48 : n === 3 ? 42 : 34;
      st.items = items.slice(0, 4).map((it, i) => {
        const node = mkPicto(layer, it.picto, { bg, sober: st.sober, color: it.picto === 'mound' ? (bg === 'ink' ? 'paper' : 'ink') : undefined });
        const x = 960 + (i - (n - 1) / 2) * sp;
        const style = st.sober ? 'pop' : ['pop', 'drop', 'slide', 'pop'][i];
        const t0 = Z0(ZV.cue(shot, it.cue), 0);
        const lab = makeLabel(layer, it.label || '', lsz, sp - 40, inkOn(bg));
        const R = 82;
        const cross = strikeCross(layer, st.sober, R);
        let ts = ZV.cue(shot, 'strike-' + it.cue);
        if (ts == null) ts = ZV.cue(shot, 'strike-all');
        return { it, node, x, y: cy, s: sc, style, t0, lab, labY: cy + 120 * sc + 54, cross, ts, name: it.picto };
      });
      return st;
    },
    update(st, t, shot) {
      try {
        if (st.title) {
          const q = popE(prog(t, st.tTitle, st.tTitle + 0.36));
          put(st.title.grp, 960, st.title.y, -2, q, q, t >= st.tTitle ? 1 : 0);
        }
        if (st.mode === 'multiply') { tickMultiply(st, t); return; }
        if (st.scene) { st.scene.tick(st, t); return; }
        const slow = st.sober ? 1.8 : 1;
        for (const I of st.items) {
          const dur = (ENT_DUR[I.style] || 0.34) * slow;
          const p = prog(t, I.t0, I.t0 + dur);
          const e = entry(I.style, p, st.sober);
          const vis = t >= I.t0 ? 1 : 0;
          let extra = 0, sx = 1;
          if (I.name === 'heart') { sx = 1 + 0.05 * Math.sin((t - I.t0) * (st.sober ? 3 : 5)) * clamp(p * 3); }
          if (I.name === 'cashbox') cashboxTick(I, t - I.t0);
          if (I.name === 'eye') { const k = I.node.refs.iris; if (k) k.setAttribute('transform', `translate(${f2(Math.sin(t * 1.7) * 14)} ${f2(Math.cos(t * 1.1) * 4)})`); }
          const wob = I.style === 'pop' ? 0 : (1 - E.out2(p)) * 4;
          put(I.node.root, I.x + e[0], I.y + e[1], e[3] + wob, I.s * e[2] * sx, I.s * e[2] * sx, vis * e[4]);
          const lp = popE(prog(t, I.t0 + dur * 0.8, I.t0 + dur * 0.8 + 0.3));
          put(I.lab.grp, I.x, I.labY, 0, lp, lp, vis);
          const sp = I.ts == null ? 0 : prog(t, I.ts, I.ts + 0.2);
          I.cross.set(sp);
          put(I.cross.grp, I.x, I.y, 0, I.s / 1.0 * 1, I.s * 1, sp > 0 ? 1 : 0);
          I.cross.grp.setAttribute('visibility', sp > 0 ? 'visible' : 'hidden');
        }
      } catch (e) { if (window.ZV_DEBUG) console.error(e); }
    }
  });
})();
;
/* ==== tools/video/composition/components/pocket-grid.js ==== */
// Composant `pocket-grid` : les cases détachées de la roue. Modes grid (36 + le zéro lime géant), bar (37 cellules jointives), bar-compare (37 / 38 cases).
(() => {
  const { C, sv, g, f2, E, prog, clamp, lerp, put, show, text, rect, circle, path } = ZV;
  const INK = C.ink;
  const Z0 = (v, d) => (v == null ? d : v);
  const popE = (p) => E.back(clamp(p));
  let UID = 0;

  const measCache = {};
  function meas(root, str, size, mono) {
    const key = str + '|' + size + '|' + (mono ? 1 : 0);
    if (measCache[key] != null) return measCache[key];
    let w = str.length * size * 0.6;
    try {
      const n = text(root, str, 0, 0, size, '#000', { mono });
      const b = n.getComputedTextLength();
      root.removeChild(n);
      if (b > 0) w = b;
    } catch (e) { /* estimation */ }
    measCache[key] = w;
    return w;
  }
  function bg(root) {
    rect(root, 0, 0, 1920, 1080, 0, INK);
    const id = 'pk' + (++UID);
    const defs = sv('defs', null, root);
    const pat = sv('pattern', { id, width: 56, height: 56, patternUnits: 'userSpaceOnUse' }, defs);
    sv('circle', { cx: 28, cy: 28, r: 3.2, fill: C.paper, opacity: 0.1 }, pat);
    rect(root, 0, 0, 1920, 1080, 0, `url(#${id})`);
  }
  const fillOf = (col) => (col === 'red' ? C.red : col === 'lime' ? C.lime : C.pocket);
  const txtOf = (col) => (col === 'black' ? C.white : INK);

  /* ------------------------------------------------------------------ */
  /*  Mode grid                                                          */
  /* ------------------------------------------------------------------ */
  function buildGrid(st, root, shot, pr) {
    bg(root);
    st.tCount = ZV.cue(shot, 'count');
    st.tZero = ZV.cue(shot, 'zero-in');
    st.tPulse = ZV.cue(shot, 'zero-pulse');
    const gridG = g(root);
    st.discs = [];
    for (let i = 0; i < 36; i++) {
      const n = i + 1;
      const x = 175 + (i % 9) * 118, y = 300 + Math.floor(i / 9) * 114;
      const red = ZV.RED.has(n);
      const gc = g(gridG, { transform: `translate(${x} ${y})` });
      sv('circle', { r: 46, fill: 'none', stroke: C.paper, 'stroke-width': 4, 'stroke-dasharray': '8 10', opacity: 0.55 }, gc);
      const fill = g(gc);
      circle(fill, 0, 0, 43, red ? C.red : C.pocket, C.paper, 6);
      text(fill, String(n), 0, 12, 34, red ? INK : C.white, { mono: 1, anchor: 'middle' });
      st.discs.push({ fill, n });
    }
    st.count = text(root, '', 129, 236, 46, C.paper, { mono: 1 });
    st.zeroG = g(root);
    st.rings = [0, 1].map(() => sv('circle', { r: 140, fill: 'none', stroke: C.lime, 'stroke-width': 10 }, st.zeroG));
    st.ring3 = sv('circle', { r: 140, fill: 'none', stroke: C.lime, 'stroke-width': 10 }, st.zeroG);
    st.zBody = g(st.zeroG);
    circle(st.zBody, 0, 0, 140, C.lime);
    text(st.zBody, '0', 0, 76, 232, INK, { anchor: 'middle' });
    st.lab1 = text(root, '+ 1 CASE', 1420, 280, 46, C.lime, { mono: 1, anchor: 'middle' });
    st.cl = pr.count_label || '37 CASES';
    // durée du comptage : il se termine avant l'arrivée du zéro
    st.cD = st.tCount == null ? 0 : clamp((st.tZero == null ? st.tCount + 3 : st.tZero - 0.9) - st.tCount, 1.0, 3.4);
    st.dT = (i) => st.tCount + st.cD * (1 - Math.pow(1 - i / 36, 1.5));
  }
  function tickGrid(st, t) {
    let shown = 0;
    st.discs.forEach((d, i) => {
      let s = 1;
      if (st.tCount != null) {
        const ti = st.dT(i);
        s = popE(prog(t, ti, ti + 0.25));
        if (t >= ti) shown = i + 1;
      } else shown = 36;
      put(d.fill, 0, 0, 0, Math.max(s, 0), Math.max(s, 0), s > 0.01 ? 1 : 0);
    });
    // zéro géant
    const hasZero = st.tZero != null;
    const zs = hasZero ? popE(prog(t, st.tZero, st.tZero + 0.5)) : 1;
    let pulse = 1;
    if (st.tPulse != null) { const q = prog(t, st.tPulse, st.tPulse + 0.45); pulse = 1 + 0.14 * Math.sin(Math.PI * q); }
    put(st.zBody, 0, 0, 0, Math.max(zs * pulse, 0.0001), Math.max(zs * pulse, 0.0001), 1);
    st.zeroG.setAttribute('transform', 'translate(1420 470)');
    st.zeroG.setAttribute('visibility', !hasZero || t >= st.tZero ? 'visible' : 'hidden');
    // anneaux plats qui s'élargissent à l'arrivée puis au pulse
    const ringAt = (node, t0, dly) => {
      const q = prog(t, t0 + dly, t0 + dly + 0.9);
      node.setAttribute('r', f2(140 + q * 190));
      node.setAttribute('stroke-width', f2(14 * (1 - q)));
      node.setAttribute('visibility', q > 0 && q < 1 ? 'visible' : 'hidden');
    };
    if (hasZero) { ringAt(st.rings[0], st.tZero, 0.1); ringAt(st.rings[1], st.tZero, 0.32); } else { st.rings.forEach((r) => r.setAttribute('visibility', 'hidden')); }
    if (st.tPulse != null) ringAt(st.ring3, st.tPulse, 0); else st.ring3.setAttribute('visibility', 'hidden');
    // libellés
    const zeroDone = !hasZero ? true : t >= st.tZero;
    if (zeroDone && (st.tCount == null || hasZero)) {
      st.count.textContent = st.cl;
    } else {
      st.count.textContent = shown > 0 ? shown + (shown > 1 ? ' CASES' : ' CASE') : '';
    }
    show(st.lab1, hasZero && t >= st.tZero + 0.2);
    st.lab1.setAttribute('visibility', hasZero && t >= st.tZero + 0.2 ? 'visible' : 'hidden');
  }

  /* ------------------------------------------------------------------ */
  /*  Barres de 37 cellules                                              */
  /* ------------------------------------------------------------------ */
  function cellSpec(order, i, total, greens) {
    // renvoie { col, label }
    if (order === 'wheel') { const n = ZV.ORDER[i]; return { col: ZV.colorOf(n), label: String(n) }; }
    if (order === 'numeric') { const n = i; return { col: ZV.colorOf(n), label: String(n) }; }
    // colors : 18 rouges, 18 noires, puis les verts
    if (i < 18) return { col: 'red', label: '' };
    if (i < 36) return { col: 'black', label: '' };
    return { col: 'lime', label: greens > 1 && i === 37 ? '00' : '0' };
  }
  function makeBar(root, x0, y, cw, h, n, order, greens) {
    const grp = g(root);
    const cells = [];
    for (let i = 0; i < n; i++) {
      const sp = cellSpec(order, i, n, greens);
      const cx = x0 + i * cw + cw / 2;
      const cg = g(grp, { transform: `translate(${cx} ${y + h / 2})` });
      rect(cg, -cw / 2, -h / 2, cw, h, 0, fillOf(sp.col), INK, 3);
      const lab = sp.label ? text(cg, sp.label, 0, 8, sp.label.length > 1 && cw < 46 ? 22 : 24, txtOf(sp.col), { mono: 1, anchor: 'middle' }) : null;
      const ov = rect(cg, -cw / 2, -h / 2, cw, h, 0, INK); ov.setAttribute('opacity', 0.62); ov.setAttribute('visibility', 'hidden');
      const cross = text(cg, '✕', 0, 15, 44, C.red, { anchor: 'middle' }); cross.setAttribute('visibility', 'hidden');
      const dot = rect(cg, -9, h / 2 + 12, 18, 12, 3, C.lime); dot.setAttribute('visibility', 'hidden');
      cells.push({ cg, cx, col: sp.col, ov, cross, dot, i, lab });
    }
    const frame = rect(root, x0 - 4, y - 4, n * cw + 8, h + 8, 14, 'none', C.paper, 8);
    return { grp, cells, x0, y, cw, h, n, frame };
  }
  // cadres lime (pool) autour des plages de cellules allumées
  function makeFrames(root, count) {
    const arr = [];
    for (let k = 0; k < count; k++) { const r = rect(root, 0, 0, 10, 10, 10, 'none', C.lime, 9); r.setAttribute('visibility', 'hidden'); arr.push(r); }
    return arr;
  }
  function applyFrames(bar, frames, lit) {
    let k = 0;
    let i = 0;
    while (i < bar.n && k < frames.length) {
      if (lit[i]) {
        let j = i; while (j + 1 < bar.n && lit[j + 1]) j++;
        const f = frames[k++];
        f.setAttribute('x', f2(bar.x0 + i * bar.cw + 3)); f.setAttribute('y', f2(bar.y + 3));
        f.setAttribute('width', f2((j - i + 1) * bar.cw - 6)); f.setAttribute('height', f2(bar.h - 6));
        f.setAttribute('visibility', 'visible');
        i = j + 1;
      } else i++;
    }
    for (; k < frames.length; k++) frames[k].setAttribute('visibility', 'hidden');
  }
  function popBar(bar, t, t0, stag) {
    bar.cells.forEach((c, i) => {
      const q = popE(prog(t, t0 + i * (stag || 0.011), t0 + i * (stag || 0.011) + 0.26));
      put(c.cg, c.cx, bar.y + bar.h / 2, 0, 1, Math.max(q, 0.0001), q > 0.001 ? 1 : 0);
    });
    const a = prog(t, t0, t0 + 0.2);
    bar.frame.setAttribute('opacity', f2(a));
  }

  function buildBar(st, root, shot, pr) {
    bg(root);
    st.order = pr.order || 'colors';
    st.cw = 44; st.h = 120; st.x0 = (1920 - 37 * st.cw) / 2; st.y = 430;
    st.bar = makeBar(root, st.x0, st.y, st.cw, st.h, 37, st.order, 1);
    st.frames = makeFrames(root, 24);
    st.cl = pr.count_label || '37 CASES';
    st.top = text(root, st.cl, st.x0, st.y - 36, 48, C.paper, { mono: 1 });
    st.big = text(root, '', 960, st.y + st.h + 200, 132, C.lime, { anchor: 'middle' });
    st.sub = text(root, '', 960, st.y + st.h + 200, 132, C.lime, { anchor: 'middle' });
    st.tag = g(root);
    st.tagText = null;
    // étiquette rouge « PERD »
    const mkTag = () => {
      const tg = g(root);
      const w = meas(root, 'PERD', 52, false) + 56;
      rect(tg, -w / 2 + 7, -36 + 7, w, 72, 12, INK);
      rect(tg, -w / 2, -36, w, 72, 12, C.red, INK, 6);
      text(tg, 'PERD', 0, 19, 52, INK, { anchor: 'middle', len: w - 56 });
      return tg;
    };
    st.tagZero = mkTag(); st.tagBlack = mkTag();
    // accolade « 36 » sous la barre (PAS 1 / 36)
    st.brace = g(root);
    const bw = 36 * st.cw;
    rect(st.brace, st.x0, st.y + st.h + 20, bw, 9, 0, C.paper);
    rect(st.brace, st.x0, st.y + st.h + 12, 9, 17, 0, C.paper);
    rect(st.brace, st.x0 + bw - 9, st.y + st.h + 12, 9, 17, 0, C.paper);
    text(st.brace, '36', st.x0 + bw / 2, st.y + st.h + 80, 52, C.paper, { mono: 1, anchor: 'middle' });
    const pl = g(st.brace);
    rect(pl, st.x0 + bw + 8, st.y + st.h + 20, st.cw - 8, 9, 0, C.lime);
    st.cues = {
      pick: ZV.cue(shot, 'pick-one'), extra: ZV.cue(shot, 'extra-zero'), lightRed: ZV.cue(shot, 'light-red'),
      loseZero: ZV.cue(shot, 'lose-zero'), loseBlack: ZV.cue(shot, 'lose-black'), each: ZV.cue(shot, 'each-once')
    };
    const lab = (name) => { const b = shot.beats.find((x) => x.do === 'cue' && x.name === name); return b && b.label ? b.label : ''; };
    st.labels = { pick: lab('pick-one'), extra: lab('extra-zero'), lightRed: lab('light-red') };
    st.hl = pr.highlight || [];
    st.dur = shot.dur;
  }
  function tickBar(st, t) {
    const bar = st.bar, cu = st.cues;
    popBar(bar, t, 0.02, 0.011);
    const lit = new Array(bar.n).fill(false);
    let label = '', labelT = 0, labelColor = C.lime;
    // 1 / 37 puis PAS 1 / 36
    if (cu.pick != null) {
      const k = 11;
      if (t >= cu.pick) lit[k] = true;
      if (t >= cu.pick) { label = st.labels.pick || '1 / 37'; labelT = cu.pick; }
    }
    const brace = cu.extra != null ? popE(prog(t, cu.extra + 0.25, cu.extra + 0.5)) : 0;
    if (cu.extra != null && t >= cu.extra) {
      label = st.labels.extra || 'PAS 1 / 36'; labelT = cu.extra;
      // la 37e case (le zéro) clignote en lime
      const blink = Math.floor((t - cu.extra) * 7) % 2 === 0 || t > cu.extra + 1.3;
      lit[36] = blink;
      const q = popE(prog(t, cu.extra, cu.extra + 0.3));
      const c = bar.cells[36];
      put(c.cg, c.cx, bar.y + bar.h / 2, 0, 1 + 0.12 * Math.sin(Math.PI * clamp(q)), 1 + 0.12 * Math.sin(Math.PI * clamp(q)), 1);
    }
    st.brace.setAttribute('visibility', brace > 0.001 ? 'visible' : 'hidden');
    // lime sur le rouge (18 / 37 ou « ta mise : rouge »)
    if (cu.lightRed != null && t >= cu.lightRed) {
      const dur = st.labels.lightRed.indexOf('/') > 0 ? 1.1 : 0.45;
      const n = Math.min(18, Math.floor(18 * prog(t, cu.lightRed, cu.lightRed + dur) + 0.0001) + (t >= cu.lightRed ? 1 : 0));
      for (let i = 0; i < n; i++) lit[i] = true;
      labelT = cu.lightRed;
      label = st.labels.lightRed || '';
      if (st.labels.lightRed.indexOf('/') > 0) label = `${n} / 37`;
    }
    // cases perdantes
    const lose = (i, on, t0, idx) => {
      const c = bar.cells[i];
      const q = on ? popE(prog(t, t0 + idx * 0.03, t0 + idx * 0.03 + 0.2)) : 0;
      c.ov.setAttribute('visibility', on && q > 0.001 ? 'visible' : 'hidden');
      c.cross.setAttribute('visibility', on && q > 0.001 ? 'visible' : 'hidden');
      c.cross.setAttribute('transform', `scale(${f2(Math.max(q, 0.001))})`);
    };
    if (cu.loseZero != null) lose(36, t >= cu.loseZero, cu.loseZero, 0);
    if (cu.loseBlack != null) for (let i = 18; i < 36; i++) lose(i, t >= cu.loseBlack, cu.loseBlack, i - 18);
    const tagK = (t0) => (t0 == null ? 0 : popE(prog(t, t0 + 0.05, t0 + 0.35)));
    const kz = tagK(cu.loseZero), kb = tagK(cu.loseBlack);
    put(st.tagZero, bar.cells[36].cx - 30, bar.y - 78, -4, kz, kz, kz > 0.001 ? 1 : 0);
    put(st.tagBlack, bar.x0 + 27 * bar.cw, bar.y - 78, 3, kb, kb, kb > 0.001 ? 1 : 0);
    // chacune une fois (ordre du cylindre)
    let each = null;
    if (cu.each != null) {
      const per = 0.058;
      const k = clamp(Math.floor((t - cu.each) / per), -1, 36);
      each = k;
      for (let i = 0; i <= k && i < bar.n; i++) { const c = bar.cells[i]; c.dot.setAttribute('visibility', 'visible'); }
      for (let i = k + 1; i < bar.n; i++) bar.cells[i].dot.setAttribute('visibility', 'hidden');
      if (k >= 0 && k < bar.n) lit[Math.min(k, 36)] = true;
      st.top.textContent = (k >= 0 ? Math.min(k + 1, 37) : 0) + ' / 37';
      if (t >= cu.each + per * 37) st.top.textContent = '37 / 37';
    } else st.top.textContent = st.cl;
    applyFrames(bar, st.frames, lit);
    // gros libellé sous la barre
    if (label) {
      const k = popE(prog(t, labelT, labelT + 0.3));
      st.big.textContent = label;
      st.big.setAttribute('transform', `translate(960 ${f2(st.y + st.h + 200)}) scale(${f2(Math.max(k, 0.001))}) translate(-960 ${f2(-(st.y + st.h + 200))})`);
      st.big.setAttribute('visibility', 'visible');
    } else st.big.setAttribute('visibility', 'hidden');
    st.sub.setAttribute('visibility', 'hidden');
  }

  /* ------------------------------------------------------------------ */
  /*  bar-compare                                                        */
  /* ------------------------------------------------------------------ */
  function buildCompare(st, root, shot, pr) {
    bg(root);
    const cmp = pr.compare || { top: { cells: 37, greens: 1, label: 'EUROPÉENNE' }, bottom: { cells: 38, greens: 2, label: 'AMÉRICAINE' } };
    const cw = 42, h = 108;
    st.items = [cmp.top, cmp.bottom].map((d, k) => {
      const n = d.cells || (k ? 38 : 37), gr = d.greens || (k ? 2 : 1);
      const x0 = 160, y = k ? 470 : 240;
      // couleurs : 18 rouges, 18 noires, puis les verts (le 38e = « 00 »)
      const bar = makeBar(root, x0, y, cw, h, n, 'colors', gr);
      const lab = text(root, `${d.label || ''} · ${n} CASES`, x0, y - 26, 44, C.paper, { mono: 1 });
      const tag = g(root);
      const txt = gr > 1 ? gr + ' VERTES' : gr + ' VERTE';
      const w = meas(root, txt, 40, true) + 40;
      rect(tag, -w / 2 + 6, -26 + 6, w, 52, 12, '#2A2A2A');
      rect(tag, -w / 2, -26, w, 52, 12, C.lime, INK, 5);
      text(tag, txt, 0, 12, 40, INK, { mono: 1, anchor: 'middle' });
      return { bar, lab, tag, gr, n, x0, y, k, frames: makeFrames(root, 2) };
    });
    st.t0 = Z0(ZV.cue(shot, 'show'), 0);
  }
  function tickCompare(st, t) {
    st.items.forEach((it) => {
      const t0 = st.t0 + it.k * 0.32;
      popBar(it.bar, t, t0, 0.009);
      const q = popE(prog(t, t0 + 0.2, t0 + 0.5));
      it.lab.setAttribute('visibility', t >= t0 + 0.1 ? 'visible' : 'hidden');
      // étiquette « n VERTE(S) » au-dessus des cases vertes
      const gx = it.bar.x0 + (it.n - it.gr) * it.bar.cw + (it.gr * it.bar.cw) / 2;
      const ty = it.y - 28;
      put(it.tag, Math.min(gx, 1760) - (it.gr > 1 ? 40 : 28), ty - 40, 2, q, q, t >= t0 + 0.2 ? 1 : 0);
      const lit = new Array(it.n).fill(false);
      const blink = t >= t0 + 0.5 && (Math.floor((t - t0 - 0.5) * 6) % 2 === 0 || t > t0 + 1.6);
      for (let i = it.n - it.gr; i < it.n; i++) lit[i] = blink;
      applyFrames(it.bar, it.frames, lit);
    });
  }

  ZV.define('pocket-grid', {
    init(root, shot) {
      const pr = shot.props || {};
      const st = { mode: pr.mode || 'grid' };
      try {
        if (st.mode === 'bar-compare') buildCompare(st, root, shot, pr);
        else if (st.mode === 'bar') buildBar(st, root, shot, pr);
        else buildGrid(st, root, shot, pr);
      } catch (e) { if (window.ZV_DEBUG) console.error(e); }
      return st;
    },
    update(st, t, shot) {
      try {
        if (st.mode === 'bar-compare') tickCompare(st, t);
        else if (st.mode === 'bar') tickBar(st, t);
        else tickGrid(st, t);
      } catch (e) { if (window.ZV_DEBUG) console.error(e); }
    }
  });
})();
;
/* ==== tools/video/composition/components/price-floor.js ==== */
// Composant `price-floor` (épisode 5) : le tarif de la salle. Voir EP5-COMPONENTS.md.
// Mode `plan` : la salle vue de dessus, quatre tables, caméra, voiles, stickers (en repère écran, ancrés sur les tables).
// Mode `bars` : ce que la maison garde sur 1 000 € misés. Fonction pure du temps ; aplats, aucun dégradé / flou / filter.
// Cues plan : room, focus (table), faille, others, turn, shine, tags, entrance. Cues bars : row-<id>, ratio (from,to,text), avg, worst.
(() => {
  'use strict';
  const { C, E, clamp, prog, f2, sv, g, rect, circle, path, text, put } = ZV;
  let UID = 0;
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const vis = (n, on) => n.setAttribute('visibility', on ? 'visible' : 'hidden');
  const meas = (n, est) => { try { const L = n.getComputedTextLength(); if (L > 0) return L; } catch (e) { /* estimation */ } return est; };
  const mw = (s, size) => String(s).length * size * 0.6;
  const rectHit = (a, b) => a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;

  // plaque (sticker) centrée sur (0,0) : lignes [{s,size,mono,fill}] ; renvoie {g,w,h}
  function mkPlate(parent, lines, o) {
    o = o || {};
    const grp = g(parent);
    const r = o.r === undefined ? 14 : o.r, off = o.sh === undefined ? 8 : o.sh;
    const sh = rect(grp, 0, 0, 1, 1, r, o.shadow || C.ink);
    const pl = rect(grp, 0, 0, 1, 1, r, o.fill || C.paper, o.stroke || C.ink, o.sw || 6);
    let w = 0, h = 0;
    const ts = lines.map((L) => {
      const n = text(grp, L.s, 0, 0, L.size, L.fill || o.textFill || C.ink, { anchor: 'middle', mono: L.mono, spacing: L.spacing });
      const m = meas(n, L.mono ? mw(L.s, L.size) : String(L.s).length * L.size * 0.58);
      w = Math.max(w, m); h += L.size * (L.lh || 1.15);
      return { n, L };
    });
    const padX = o.padX === undefined ? 30 : o.padX, padY = o.padY === undefined ? 16 : o.padY;
    w += padX * 2; h += padY * 2;
    let y = -h / 2 + padY;
    for (const k of ts) { const lh = k.L.size * (k.L.lh || 1.15); k.n.setAttribute('y', f2(y + lh / 2 + k.L.size * 0.33)); y += lh; }
    sh.setAttribute('x', f2(-w / 2 + off)); sh.setAttribute('y', f2(-h / 2 + off)); sh.setAttribute('width', f2(w)); sh.setAttribute('height', f2(h));
    pl.setAttribute('x', f2(-w / 2)); pl.setAttribute('y', f2(-h / 2)); pl.setAttribute('width', f2(w)); pl.setAttribute('height', f2(h));
    return { g: grp, w, h, pl };
  }
  const arrowPoly = (ax, ay, bx, by, sw, hl, hw) => {
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
    const bxs = bx - ux * hl, bys = by - uy * hl;
    const P = [[ax + nx * sw / 2, ay + ny * sw / 2], [bxs + nx * sw / 2, bys + ny * sw / 2], [bxs + nx * hw / 2, bys + ny * hw / 2], [bx, by], [bxs - nx * hw / 2, bys - ny * hw / 2], [bxs - nx * sw / 2, bys - ny * sw / 2], [ax - nx * sw / 2, ay - ny * sw / 2]];
    return 'M' + P.map((p) => f2(p[0]) + ' ' + f2(p[1])).join('L') + 'Z';
  };

  const ANCH = { wheel: [340, 440], roulette: [760, 440], craps: [1150, 440], blackjack: [1570, 440] };
  const TABS = ['wheel', 'roulette', 'craps', 'blackjack'];
  const LAB = { wheel: 'LA GRANDE ROUE', roulette: 'ROULETTE', craps: 'CRAPS', blackjack: 'BLACKJACK' };
  const DEF_ROWS = [
    { id: 'bj', label: 'BLACKJACK BIEN JOUÉ', value: 5, text: '≈ 5 €' },
    { id: 'pass', label: 'CRAPS · LIGNE DE PASSE', value: 14, text: '≈ 14 €' },
    { id: 'roulette', label: 'ROULETTE', value: 27, text: '27 €' },
    { id: 'wheel', label: 'GRANDE ROUE', value: [110, 240], text: '110 À 240 €' },
    { id: 'seven', label: "CRAPS · N'IMPORTE QUEL 7", value: 167, text: '≈ 167 €' }];
  const DEF_TAGS = { blackjack: '≈ 5 €', roulette: '27 €', wheel: '110 À 240 €', craps: '14 À 167 €' };
  const SC = 1000 / 240;                                                      // px par euro

  /* ================================ PLAN ================================ */
  function buildTable(W, id, ax, ay) {
    const tg = g(W);
    let labY = 200;
    if (id === 'wheel') {
      const rot = g(tg);
      const cols = [C.lime, C.paper, C.red];
      for (let k = 0; k < 18; k++) {
        const a0 = (k * 20 - 90) * Math.PI / 180, a1 = ((k + 1) * 20 - 90) * Math.PI / 180, R = 100;
        path(rot, `M0 0L${f2(R * Math.cos(a0))} ${f2(R * Math.sin(a0))}A${R} ${R} 0 0 1 ${f2(R * Math.cos(a1))} ${f2(R * Math.sin(a1))}Z`, cols[k % 3], C.ink, 3);
      }
      circle(rot, 0, 0, 22, C.paper, C.ink, 5);
      circle(tg, 0, 0, 102, 'none', C.paper, 7);
      path(tg, 'M-12 -124L12 -124L0 -100Z', C.red, C.ink, 4);
      tg.__rot = rot;
      tg.__bulbs = [];
      for (let j = 0; j < 18; j++) {
        const a = (j * 20 + 10) * Math.PI / 180;
        const b = circle(tg, f2(Math.sin(a) * 126), f2(-Math.cos(a) * 126), 7, C.paper, C.ink, 3);
        b.setAttribute('visibility', 'hidden');
        tg.__bulbs.push(b);
      }
    } else if (id === 'roulette') {
      sv('ellipse', { cx: 0, cy: 0, rx: 150, ry: 92, fill: C.pocket, stroke: C.paper, 'stroke-width': 7 }, tg);
      sv('ellipse', { cx: 0, cy: 0, rx: 130, ry: 74, fill: 'none', stroke: C.paper, 'stroke-width': 3 }, tg);
      circle(tg, -66, 0, 42, C.ink, C.paper, 5);
      circle(tg, -66, 0, 26, 'none', C.lime, 4).setAttribute('stroke-dasharray', '9 7');
      circle(tg, -66, 0, 7, C.paper);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) rect(tg, 8 + c * 25, -28 + r * 19, 23, 17, 2, (r + c) % 2 ? C.red : C.ink, C.paper, 2);
    } else if (id === 'craps') {
      rect(tg, -150, -75, 300, 150, 75, C.pocket, C.paper, 12);
      rect(tg, -122, -47, 244, 94, 47, 'none', C.paper, 3);
      path(tg, 'M-86 30L86 30', 'none', C.paper, 4);
      const die = (cx, pips) => { rect(tg, cx - 17, -27, 34, 34, 5, C.white, C.ink, 3); for (const p of pips) circle(tg, cx + p[0] * 8, -10 + p[1] * 8, 3, C.ink); };
      die(-30, [[-1, -1], [0, 0], [1, 1]]);
      die(30, [[-1, -1], [1, -1], [-1, 1], [1, 1]]);
    } else {
      path(tg, 'M-150 -60L150 -60A150 150 0 0 1 -150 -60Z', C.pocket, C.paper, 8);
      rect(tg, -44, -52, 88, 20, 3, C.ink, C.paper, 3);
      for (let k = 0; k < 6; k++) {
        const a = (20 + k * 28) * Math.PI / 180;
        circle(tg, f2(Math.cos(a) * 170), f2(-60 + Math.sin(a) * 170), 15, C.paper, C.ink, 3);
        circle(tg, f2(Math.cos(a) * 100), f2(-60 + Math.sin(a) * 100), 9, 'none', C.paper, 3);
      }
      labY = 215;
    }
    text(tg, LAB[id], 0, labY, 28, C.paper, { mono: true, anchor: 'middle', spacing: 1 });
    tg.__ax = ax; tg.__ay = ay + (id === 'blackjack' ? -15 : 0);
    return tg;
  }

  function initPlan(root, st, P, beats, cl) {
    const W = st.W = g(root);
    st.wall = path(W, 'M80 520L80 800L1840 800L1840 90L80 90L80 400', 'none', C.paper, 8, { pathLength: 1, 'stroke-linejoin': 'miter', 'stroke-linecap': 'butt' });
    const deco = st.deco = g(W);
    for (let i = 0; i < 22; i++) {
      const x = 120 + i * 76;
      rect(deco, x, 112, 56, 46, 6, C.pocket, C.paper, 3);
      rect(deco, x + 12, 122, 32, 14, 2, [C.lime, C.paper, C.red][i % 3]);
      circle(deco, x + 28, 148, 4, C.paper);
    }
    path(deco, 'M14 448L70 448L70 430L126 460L70 490L70 472L14 472Z', C.paper, C.ink, 3);
    text(deco, 'ENTRÉE', 98, 388, 26, C.paper, { mono: true, anchor: 'start', spacing: 1 });
    const fl = text(deco, 'FOND DE LA SALLE', 0, 0, 24, C.paper, { mono: true, anchor: 'middle', spacing: 3 });
    fl.setAttribute('transform', 'translate(1808 445) rotate(-90)');
    st.tabs = {};
    for (const id of TABS) { const a = ANCH[id]; st.tabs[id] = buildTable(W, id, a[0], a[1]); }
    // voiles
    st.veils = TABS.map((id) => { const a = ANCH[id]; return rect(W, a[0] - 205, 300, 410, 400, 0, C.ink, null, 0, { opacity: 0, visibility: 'hidden' }); });
    // cercles
    const ring = (shape, attrs) => { const n = sv(shape, Object.assign({ fill: 'none', 'stroke-width': 8, pathLength: 1, visibility: 'hidden' }, attrs), W); return n; };
    st.rFaille = ring('ellipse', { cx: 1570, cy: 440, rx: 205, ry: 168, stroke: C.lime });
    st.rWheel = ring('circle', { cx: 340, cy: 440, r: 152, stroke: C.paper });
    st.rCraps = ring('ellipse', { cx: 1150, cy: 440, rx: 198, ry: 126, stroke: C.paper });

    /* ---- repères ---- */
    const c = {};
    for (const n of ['room', 'faille', 'others', 'turn', 'shine', 'tags', 'entrance']) { const b = cl(n)[0]; c[n] = b ? b.t : null; }
    const others = beats.filter((b) => b && b.do === 'cue' && isNum(b.t) && b.name !== 'room').map((b) => b.t);
    const roomC = cl('room')[0];
    let tR = roomC ? roomC.t : Math.max(0, Math.min(0.1, (others.length ? Math.min(...others) : 9) - 0.5));
    if (roomC && others.length && Math.min(...others) < roomC.t) tR = Math.max(0, Math.min(...others) - 0.5);
    st.tR = tR; st.c = c;
    const endOf = (t0, names) => { let m = Infinity; for (const b of beats) if (b && b.do === 'cue' && isNum(b.t) && names.indexOf(b.name) >= 0 && b.t > t0 + 0.05 && b.t < m) m = b.t; return m; };
    c.faille_e = c.faille == null ? Infinity : endOf(c.faille, ['others', 'turn', 'tags', 'entrance', 'shine']);
    c.others_e = c.others == null ? Infinity : endOf(c.others, ['faille', 'turn', 'tags', 'entrance', 'shine']);
    c.shine_e = c.shine == null ? Infinity : endOf(c.shine, ['tags', 'entrance', 'turn']);
    c.turn_e = c.turn == null ? Infinity : endOf(c.turn, ['entrance', 'shine', 'tags', 'others', 'faille']);

    /* ---- caméra ---- */
    const camOf = (z, cx, cy, vt) => ({ z, cx, cy, v: TABS.map((id) => (vt && id !== vt ? 0.62 : 0)) });
    const foc = (tab) => (ANCH[tab] ? camOf(1.9, ANCH[tab][0], 510, tab) : camOf(1, 960, 450, null));
    st.base = ANCH[P.focus] ? foc(P.focus) : foc(null);
    const keys = [];
    for (const b of cl('focus')) keys.push({ t: b.t, dur: 0.9, cam: foc(b.table) });
    if (c.turn != null) keys.push({ t: c.turn, dur: 1.6, cam: camOf(1.25, 430, 470, null) });
    keys.sort((a, b) => a.t - b.t);
    st.keys = keys;

    /* ---- stickers (repère écran) ---- */
    const ov = st.ov = [];
    const OV = g(root);
    const add = (o, plate) => { o.g = plate.g; o.w = plate.w; o.h = plate.h; ov.push(o); return o; };
    const tags = Object.assign({}, DEF_TAGS, P.tags && typeof P.tags === 'object' ? P.tags : {});
    if (c.faille != null) add({ t0: c.faille, t1: c.faille_e, tab: 'blackjack', dx: -30, dy: -235, rot: -3 }, mkPlate(OV, [{ s: 'LA SEULE FAILLE', size: 42 }, { s: 'DE LA SALLE', size: 42 }], { fill: C.lime }));
    if (c.others != null) {
      add({ t0: c.others + 0.15, t1: c.others_e, tab: 'wheel', dx: 0, dy: 275, rot: -3 }, mkPlate(OV, [{ s: 'TROP SIMPLE', size: 42 }], { fill: C.paper }));
      add({ t0: c.others + 0.45, t1: c.others_e, tab: 'craps', dx: 0, dy: 275, rot: 3 }, mkPlate(OV, [{ s: 'TROP BRUYANTE', size: 42 }], { fill: C.paper }));
    }
    if (c.shine != null) {
      add({ t0: c.shine + 0.2, t1: c.shine_e, tab: 'wheel', dx: -125, dy: -150, rot: -4 }, mkPlate(OV, [{ s: 'BRILLANTE', size: 24, mono: true }], { fill: C.lime, padX: 18, padY: 10, sw: 5, sh: 6 }));
      add({ t0: c.shine + 0.55, t1: c.shine_e, tab: 'wheel', dx: 115, dy: -150, rot: 4 }, mkPlate(OV, [{ s: 'BRUYANTE', size: 24, mono: true }], { fill: C.paper, padX: 18, padY: 10, sw: 5, sh: 6 }));
    }
    if (c.tags != null) {
      add({ t0: c.tags, t1: Infinity, fx: 960, fy: 745, rot: 0, kind: 'pop' }, mkPlate(OV, [{ s: 'SUR 1 000 € MISÉS', size: 34, mono: true, fill: C.lime }], { fill: C.ink, stroke: C.lime, sw: 5, shadow: C.pocket, padX: 26, padY: 12 }));
      TABS.forEach((id, i) => add({ t0: c.tags + 0.25 + i * 0.2, t1: Infinity, tab: id, dx: 0, dy: 100, rot: [-3, 3, -2, 3][i], kind: 'drop' }, mkPlate(OV, [{ s: String(tags[id] == null ? '' : tags[id]), size: 52 }], { fill: C.paper, padX: 24, padY: 12 })));
    }
    if (c.entrance != null) {
      const o = add({ t0: c.entrance, t1: Infinity, tab: 'wheel', dx: 280, dy: -235, rot: -2 }, mkPlate(OV, [{ s: "À L'ENTRÉE, PAS AU FOND", size: 40, fill: C.paper }], { fill: C.red }));
      o.arrow = path(OV, 'M0 0', C.paper, C.ink, 3, { visibility: 'hidden' });
    }
    if (c.turn != null) {
      const w = 760, h = 150, G = g(OV);
      const sh = path(G, 'M0 0', C.ink), pl = path(G, 'M0 0', C.lime, C.ink, 7);
      const d = (dx) => `M${-w / 2 + dx} 0L${-w / 2 + 120 + dx} ${-h / 2}L${-w / 2 + 120 + dx} ${-h / 2 + 34}L${w / 2 + dx} ${-h / 2 + 34}L${w / 2 + dx} ${h / 2 - 34}L${-w / 2 + 120 + dx} ${h / 2 - 34}L${-w / 2 + 120 + dx} ${h / 2}Z`;
      sh.setAttribute('d', d(10)); pl.setAttribute('d', d(0));
      // le texte occupe le corps de la flèche
      const tn = text(G, 'RETOURNE-TOI', 55, 22, 62, C.ink, { anchor: 'middle' });
      const L = meas(tn, 62 * 12 * 0.58);
      if (L > 560) { tn.setAttribute('textLength', 560); tn.setAttribute('lengthAdjust', 'spacingAndGlyphs'); }
      ov.push({ g: G, w: w + 20, h: h + 10, t0: c.turn + 0.9, t1: c.turn_e, fx: 1260, fy: 150, rot: 0, kind: 'pop' });
    }
    return st;
  }

  function camAt(st, t) {
    let cur = st.base;
    const mix = (a, b, p) => ({ z: a.z + (b.z - a.z) * p, cx: a.cx + (b.cx - a.cx) * p, cy: a.cy + (b.cy - a.cy) * p, v: a.v.map((x, i) => x + (b.v[i] - x) * p) });
    const ks = st.keys;
    for (let i = 0; i < ks.length; i++) {
      const k = ks[i];
      if (t <= k.t) break;
      const nxt = ks[i + 1];
      if (nxt && t > nxt.t) { cur = mix(cur, k.cam, E.io3(ZV.prog(nxt.t, k.t, k.t + k.dur))); continue; }
      return mix(cur, k.cam, E.io3(prog(t, k.t, k.t + k.dur)));
    }
    return cur;
  }

  function updPlan(st, t) {
    const cam = camAt(st, t), c = st.c;
    setA(st.W, 'transform', `translate(960 450) scale(${f2(cam.z)}) translate(${f2(-cam.cx)} ${f2(-cam.cy)})`);
    // salle
    const pr = prog(t, st.tR, st.tR + 0.4);
    vis(st.wall, pr > 0);
    setA(st.wall, 'stroke-dasharray', `${f2(pr)} 2`);
    const dp = prog(t, st.tR + 0.15, st.tR + 0.45);
    setA(st.deco, 'opacity', f2(dp)); vis(st.deco, dp > 0);
    TABS.forEach((id, i) => {
      const tg = st.tabs[id];
      const p = E.back(prog(t, st.tR + 0.3 + i * 0.16, st.tR + 0.65 + i * 0.16));
      put(tg, tg.__ax, tg.__ay, 0, p, p, p > 0 ? 1 : 0);
      if (id === 'wheel') setA(tg.__rot, 'transform', `rotate(${f2((t * 14) % 360)})`);
    });
    cam.v.forEach((v, i) => { setA(st.veils[i], 'opacity', f2(v)); vis(st.veils[i], v > 0.01); });
    // cercles
    const ringUpd = (n, t0, t1) => {
      const on = t0 != null && t >= t0 && t < t1 + 0.25;
      vis(n, on); if (!on) return;
      setA(n, 'stroke-dasharray', `${f2(E.out3(prog(t, t0, t0 + 0.5)))} 2`);
      setA(n, 'opacity', f2(t > t1 ? 1 - prog(t, t1, t1 + 0.25) : 1));
    };
    ringUpd(st.rFaille, c.faille, c.faille_e);
    ringUpd(st.rWheel, c.others != null ? c.others + 0.1 : null, c.others_e);
    ringUpd(st.rCraps, c.others != null ? c.others + 0.4 : null, c.others_e);
    // ampoules (bascule toutes les 0,25 s : 2 Hz, petits éléments)
    const bulbs = st.tabs.wheel.__bulbs;
    const son = c.shine != null && t >= c.shine && t < c.shine_e;
    const ph = son ? Math.floor((t - c.shine) / 0.25) : 0;
    for (let j = 0; j < bulbs.length; j++) { vis(bulbs[j], son); if (son) setA(bulbs[j], 'fill', (j + ph) % 2 ? C.lime : C.paper); }
    // stickers
    for (const o of st.ov) {
      let on = o.t0 != null && t >= o.t0 && (o.t1 === Infinity || t < o.t1 + 0.25);
      let sx = o.fx, sy = o.fy;
      if (on && o.tab) {
        const A = ANCH[o.tab];
        sx = 960 + (A[0] - cam.cx) * cam.z + o.dx * cam.z; sy = 450 + (A[1] - cam.cy) * cam.z + o.dy * cam.z;
        if (sx < 200 || sx > 1720 || sy < -250 || sy > 1150) on = false;
      }
      if (!on) { vis(o.g, false); if (o.arrow) vis(o.arrow, false); continue; }
      const a = o.t1 !== Infinity && t > o.t1 ? 1 - prog(t, o.t1, o.t1 + 0.25) : 1;
      let s = 1, dy = 0;
      if (o.kind === 'drop') { const p = prog(t, o.t0, o.t0 + 0.55); dy = -(1 - E.bounce(p)) * 320; s = 1; } else s = E.back(prog(t, o.t0, o.t0 + 0.3));
      sx = clamp(sx, 24 + o.w / 2, 1896 - o.w / 2); sy = clamp(sy, 36 + o.h / 2, 826 - o.h / 2);
      put(o.g, sx, sy + dy, o.rot, Math.max(s, 0.001), Math.max(s, 0.001), a * Math.min(1, (t - o.t0) / 0.08));
      if (o.arrow) {
        const wA = ANCH.wheel, bx = 960 + (wA[0] - cam.cx) * cam.z, by = 450 + (wA[1] - 128 - cam.cy) * cam.z;
        const ax = sx - o.w / 2 + 70, ay = sy + o.h / 2 + 2;
        const q = E.out3(prog(t, o.t0 + 0.2, o.t0 + 0.6));
        vis(o.arrow, q > 0.02 && by > ay + 30);
        setA(o.arrow, 'd', arrowPoly(ax, ay, ax + (bx - ax) * q, ay + (by - ay) * q, 14, 34, 40));
        setA(o.arrow, 'opacity', f2(a));
      }
    }
  }

  /* ================================ BARS ================================ */
  function initBars(root, st, P, beats, cl) {
    const uid = 'pf' + (++UID);
    const defs = sv('defs', null, root);
    const pt = sv('pattern', { id: uid, width: 26, height: 26, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
    sv('rect', { x: 0, y: 0, width: 26, height: 26, fill: C.red }, pt);
    sv('rect', { x: 13, y: 0, width: 13, height: 26, fill: C.ink }, pt);
    const k = text(root, 'SUR 1 000 € MISÉS, LA MAISON GARDE EN MOYENNE', 100, 142, 32, C.paper, { mono: true, anchor: 'start' });
    rect(root, 100, 156, 120, 8, 0, C.lime);
    const rowsIn = (Array.isArray(P.rows) ? P.rows : DEF_ROWS).filter((r) => r && r.id != null);
    const n = rowsIn.length;
    const pitch = n > 5 ? Math.max(62, (760 - 70 - 200) / (n - 1)) : 110;
    const allCues = beats.filter((b) => b && b.do === 'cue' && isNum(b.t));
    st.auto = allCues.length === 0;
    st.rows = rowsIn.map((r, i) => {
      const v = r.value, lo = Array.isArray(v) ? +v[0] : +v, hi = Array.isArray(v) ? +v[1] : +v;
      const o = { id: String(r.id), lo: isFinite(lo) ? lo : 0, hi: isFinite(hi) ? Math.max(hi, lo) : 0, y: 200 + i * pitch, text: String(r.text == null ? '' : r.text) };
      const cc = cl('row-' + o.id)[0];
      o.t0 = cc ? cc.t : st.auto ? 0.5 + i * 0.9 : null;
      const G = o.g = g(root);
      o.strip = rect(G, 80, o.y - 8, 1760, 86, 6, C.pocket);
      const lab = String(r.label == null ? '' : r.label);
      const ln = text(G, lab, 100, o.y + 52, 44, C.paper, { anchor: 'start' });
      const L = meas(ln, lab.length * 44 * 0.58);
      if (L > 590) { const s = Math.max(34, 44 * 590 / L); ln.setAttribute('font-size', f2(s)); const L2 = L * s / 44; if (L2 > 590) { ln.setAttribute('textLength', 590); ln.setAttribute('lengthAdjust', 'spacingAndGlyphs'); } }
      o.solid = rect(G, 720, o.y + 8, 1, 54, 3, C.red, C.paper, 4);
      o.hatch = rect(G, 720, o.y + 8, 1, 54, 3, `url(#${uid})`, C.paper, 4);
      o.boxW = o.text.length * 24 + 32;
      o.boxX = Math.min(720 + o.hi * SC + 14, 1800 - o.boxW);
      o.box = rect(G, 0, o.y + 7, o.boxW, 56, 6, C.ink, C.paper, 4);
      o.amt = text(G, '', 0, o.y + 47, 40, C.paper, { mono: true, anchor: 'start' });
      o.ext = o.boxX + o.boxW;                                               // extrémité droite du contenu
      return o;
    });
    const byId = {}; st.rows.forEach((r) => { byId[r.id] = r; });
    st.byId = byId;
    // zones de contenu (pour éviter les collisions des stickers)
    const content = st.rows.map((r) => ({ x1: 96, x2: r.ext + 6, y1: r.y - 4, y2: r.y + 74 }));
    const reserved = [{ x1: 90, x2: 1000, y1: 100, y2: 170 }];
    const OV = g(root);
    // meilleure ligne (worst) : `wheel` ou la plus longue
    const wr = byId.wheel || st.rows.slice().sort((a, b) => b.hi - a.hi)[0];
    const bc = (nm) => { const b = cl(nm)[0]; return b ? b.t : null; };
    st.worst = null;
    if (wr && bc('worst') != null) {
      const hl = rect(OV, 80, wr.y - 11, 1760, 88, 8, 'none', C.lime, 6);
      const pl = mkPlate(OV, [{ s: "LE PIRE TAUX… À L'ENTRÉE", size: 34, fill: C.paper }], { fill: C.red, padX: 26, padY: 12 });
      let cx = 1790 - pl.w / 2;
      const cy = wr.y - 6 - pl.h / 2 - 4;
      for (; cx > 600; cx -= 30) {
        const r = { x1: cx - pl.w / 2 - 12, x2: cx + pl.w / 2 + 12, y1: cy - pl.h / 2 - 8, y2: cy + pl.h / 2 + 12 };
        if (!content.some((q, i) => st.rows[i] !== wr && rectHit(r, q))) break;
      }
      reserved.push({ x1: cx - pl.w / 2 - 12, x2: cx + pl.w / 2 + 12, y1: cy - pl.h / 2 - 8, y2: cy + pl.h / 2 + 12 });
      st.worst = { t0: bc('worst'), hl, pl, cx, cy };
    }
    st.avg = null;
    if (bc('avg') != null && n) {
      const last = st.rows[n - 1];
      const pl = mkPlate(OV, [{ s: 'UNE MOYENNE, PAS UN TAUX DE MAINS PERDUES', size: 20, mono: true, fill: C.ink }], { fill: C.paper, padX: 14, padY: 4, sw: 4, sh: 5, r: 6 });
      const cx = 100 + pl.w / 2, cy = last.y - 13;
      reserved.push({ x1: 96, x2: cx + pl.w / 2 + 8, y1: cy - pl.h / 2 - 4, y2: cy + pl.h / 2 + 8 });
      st.avg = { t0: bc('avg'), pl, cx, cy };
    }
    // ratios (remplacent le précédent)
    const rb = cl('ratio');
    st.ratios = rb.map((b, i) => {
      let a = byId[b.from] || st.rows[0], z = byId[b.to] || st.rows[n - 1];
      if (!a || !z) return null;
      const ia = st.rows.indexOf(a), iz = st.rows.indexOf(z), lo = Math.min(ia, iz), hi = Math.max(ia, iz);
      let ext = 0; for (let j = lo; j <= hi; j++) ext = Math.max(ext, st.rows[j].ext);
      const xb = Math.min(1850, ext + 30);
      const ya = a.y + 35, yz = z.y + 35;
      const tx = String(b.text == null ? '' : b.text);
      const m = tx.match(/^(.*?×)\s*([A-Za-zÀ-ÿ].*)$/);
      const lines = m ? [{ s: m[1], size: 76 }, { s: m[2], size: 34 }] : [{ s: tx, size: 76 }];
      const pl = mkPlate(OV, lines, { fill: C.lime, padX: 28, padY: 12 });
      const mid = (ya + yz) / 2;
      const right = xb - 36;
      let by = null, bd = 1e9;
      for (let cy = 170; cy <= 760; cy += 10) {
        const r = { x1: right - pl.w - 8, x2: right + 8, y1: cy - pl.h / 2 - 6, y2: cy + pl.h / 2 + 12 };
        if (content.some((q) => rectHit(r, q)) || reserved.some((q) => rectHit(r, q))) continue;
        if (Math.abs(cy - mid) < bd) { bd = Math.abs(cy - mid); by = cy; }
      }
      if (by == null) by = Math.max(110, z.y - 52);
      const br = path(OV, `M${xb - 22} ${f2(ya)}L${xb} ${f2(ya)}L${xb} ${f2(yz)}L${xb - 22} ${f2(yz)}`, 'none', C.paper, 8, { pathLength: 1, 'stroke-linejoin': 'miter', 'stroke-linecap': 'butt' });
      return { t0: b.t, t1: Infinity, br, pl, cx: right - pl.w / 2, cy: by, rot: i % 2 ? 2 : -2 };
    }).filter(Boolean);
    st.ratios.forEach((r, i) => { r.t1 = i + 1 < st.ratios.length ? st.ratios[i + 1].t0 : Infinity; });
    return st;
  }

  const fmtCount = (s, k) => s.replace(/\d+/g, (m) => String(Math.round(+m * k)));
  function updBars(st, t) {
    for (const r of st.rows) {
      const c = r.t0;
      const on = c != null && t >= c;
      vis(r.g, on); if (!on) continue;
      const a = E.out3(prog(t, c, c + 0.3));
      setA(r.g, 'opacity', f2(a));
      setA(r.g, 'transform', `translate(${f2(-40 * (1 - a))} 0)`);
      const k = E.out3(prog(t, c + 0.1, c + 0.9));
      const cur = r.hi * k;
      const solid = Math.min(r.lo, cur) * SC, hatch = Math.max(0, cur - r.lo) * SC;
      setA(r.solid, 'width', f2(Math.max(solid, 1))); vis(r.solid, solid > 0.5);
      setA(r.hatch, 'x', f2(720 + r.lo * SC)); setA(r.hatch, 'width', f2(Math.max(hatch, 1))); vis(r.hatch, hatch > 0.5);
      const bx = Math.min(720 + cur * SC + 14, 1800 - r.boxW);
      setA(r.box, 'x', f2(bx));
      setA(r.amt, 'x', f2(bx + 16));
      const s = fmtCount(r.text, k);
      if (r.amt.__s !== s) { r.amt.__s = s; r.amt.textContent = s; }
      vis(r.box, k > 0.02); vis(r.amt, k > 0.02);
    }
    const w = st.worst;
    if (w) {
      const on = t >= w.t0;
      vis(w.hl, on); vis(w.pl.g, on);
      if (on) { const s = E.back(prog(t, w.t0, w.t0 + 0.3)); setA(w.hl, 'opacity', f2(Math.min(1, s))); put(w.pl.g, w.cx, w.cy, -2, Math.max(s, 0.001), Math.max(s, 0.001), 1); }
    }
    const av = st.avg;
    if (av) { const on = t >= av.t0; vis(av.pl.g, on); if (on) { const s = E.back(prog(t, av.t0, av.t0 + 0.3)); put(av.pl.g, av.cx, av.cy, 0, Math.max(s, 0.001), Math.max(s, 0.001), 1); } }
    for (const r of st.ratios) {
      const on = t >= r.t0 && (r.t1 === Infinity || t < r.t1 + 0.01);
      vis(r.br, on); vis(r.pl.g, on);
      if (!on) continue;
      const out = r.t1 !== Infinity ? 1 - prog(t, r.t1 - 0.25, r.t1) : 1;
      setA(r.br, 'stroke-dasharray', `${f2(E.out3(prog(t, r.t0, r.t0 + 0.4)))} 2`);
      setA(r.br, 'opacity', f2(out));
      const s = E.back(prog(t, r.t0 + 0.25, r.t0 + 0.55));
      put(r.pl.g, r.cx, r.cy, r.rot, Math.max(s, 0.001), Math.max(s, 0.001), out);
    }
  }

  ZV.define('price-floor', {
    init(root, shot) {
      const P = shot.props || {};
      const beats = Array.isArray(shot.beats) ? shot.beats : [];
      const cl = (n) => beats.filter((b) => b && b.do === 'cue' && b.name === n && isNum(b.t)).sort((a, b) => a.t - b.t);
      const st = { mode: P.mode === 'bars' ? 'bars' : 'plan', dur: isNum(shot.dur) && shot.dur > 0 ? shot.dur : 10 };
      rect(root, 0, 0, 1920, 1080, 0, C.ink);
      try { if (st.mode === 'bars') initBars(root, st, P, beats, cl); else initPlan(root, st, P, beats, cl); } catch (e) { st.broken = true; }
      return st;
    },
    update(st, t) {
      try {
        if (st.broken) return;
        t = clamp(t, 0, st.dur + 1);
        if (st.mode === 'bars') updBars(st, t); else updPlan(st, t);
      } catch (e) { /* jamais d'exception */ }
    }
  });
})();
;
/* ==== tools/video/composition/components/rtp-bars.js ==== */
// Composant « rtp-bars » (épisode 2) : « la case verte invisible », le taux de redistribution. Voir EP2-COMPONENTS.md.
// Deux barres de 100 unités (1500 px) : part rendue en paper, part gardée en lime. Fonction pure du temps du plan ; aplats seulement.
(() => {
  const { C, E, clamp, prog, lerp, f2, put, g, rect, text, line, sv } = ZV;
  let UID = 0;
  const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
  const bw = (s, size) => { let a = 0; for (const ch of String(s)) a += size * (ch === ' ' ? 0.26 : /[0-9]/.test(ch) ? 0.6 : /[A-ZÀÂÉÈÊÎÔÛÇ]/.test(ch) ? 0.66 : /[.,:;'’!|]/.test(ch) ? 0.3 : 0.56); return a; };
  const dec = (n) => String(Math.round(n * 10) / 10).replace('.', ',');
  const X0 = 210, U = 15, BH = 100;

  function mkBar(root, uid, y, name, kept, ip) {
    const b = { y, kept, rend: 100 - kept };
    text(root, name, X0, y - 17, 52, C.paper, { len: f2(bw(name, 52)) });
    b.g = g(root);
    rect(b.g, X0 + 12, y + 12, 100 * U, BH, 6, C.ink);              // ombre dure du cadre
    rect(b.g, X0, y, 100 * U, BH, 6, C.pocket, C.paper, 6);          // cadre : l'emplacement des 100 unités
    b.paper = rect(b.g, X0, y, 1, BH, 4, C.paper, C.ink, 6);
    b.pct = text(b.g, dec(b.rend) + ' % RENDUS', X0 + (b.rend * U) / 2, y + 66, 46, C.ink, { mono: true, anchor: 'middle', len: f2((dec(b.rend).length + 9) * 46 * 0.6) });
    // tranche gardée par la maison (lime), qui se détache
    b.sl = g(root);
    const w = kept * U;
    rect(b.sl, 9, 9, w, BH, 4, C.ink);
    b.slBase = rect(b.sl, 0, 0, w, BH, 4, C.lime, C.ink, 6);
    b.slHat = rect(b.sl, 0, 0, w, BH, 4, `url(#${uid}h${ip})`, C.lime, 4);
    b.slHat.setAttribute('stroke-dasharray', '10 8');
    b.w = w; b.sx = X0 + b.rend * U;
    b.tick = line(root, 0, y + BH, 0, y + BH + 30, C.lime, 6);
    const lab = dec(kept) + ' % GARDÉS';
    b.lab = text(root, lab, X0 + 100 * U, y + BH + 72, 42, C.lime, { anchor: 'end', len: f2(bw(lab, 42)) });
    return b;
  }

  ZV.define('rtp-bars', {
    init(root, shot) {
      const P = shot.props || {};
      const uid = 'rb' + (++UID);
      const st = { dur: Math.max(0.1, shot.dur || 1) };
      st.rou = clamp(num(P.roulette, 2.7), 0.1, 60); st.mac = clamp(num(P.machine, 15), 0.1, 60);
      st.stake = num(P.hour_stake, 1200); st.keptH = num(P.hour_kept, 180); st.unit = P.unit != null ? String(P.unit) : '€';
      const cu = (n) => ZV.cue(shot, n);
      st.c = { roulette: cu('roulette'), machine: cu('machine'), times: cu('times'), invisible: cu('invisible'), hour: cu('hour'), law: cu('law') };
      if (Object.values(st.c).every((x) => x === null)) st.c = { roulette: 0.2, machine: 1.5, times: 3.2, invisible: null, hour: 4.4, law: 6.0 };
      st.ratio = Math.floor((st.mac / st.rou) * 10 + 1e-6) / 10;

      rect(root, 0, 0, 1920, 1080, 0, C.ink);
      const defs = sv('defs', null, root);
      [0, 1].forEach((i) => {
        const pt = sv('pattern', { id: `${uid}h${i}`, width: 18, height: 18, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
        sv('rect', { x: 0, y: 0, width: 18, height: 18, fill: C.pocket }, pt);
        sv('rect', { x: 0, y: 0, width: 8, height: 18, fill: C.lime }, pt);
      });
      text(root, 'TAUX DE REDISTRIBUTION', X0, 104, 30, '#B9B5A8', { mono: true, len: f2(22 * 30 * 0.6) });
      st.rb = mkBar(root, uid, 185, 'ROULETTE', st.rou, 0);
      st.mb = mkBar(root, uid, 455, 'MACHINE À SOUS', st.mac, 1);
      // × 5,5
      st.times = g(root);
      {
        const lab = '× ' + dec(st.ratio), size = 78, w = bw(lab, size) + 80, h = 104;
        rect(st.times, -w / 2 + 11, -h / 2 + 11, w, h, 18, C.ink);
        rect(st.times, -w / 2, -h / 2, w, h, 18, C.paper, C.ink, 7);
        text(st.times, lab, 0, size * 0.35, size, C.ink, { anchor: 'middle', len: f2(bw(lab, size)) });
      }
      st.inv = text(root, 'LA CASE VERTE INVISIBLE', 960, 705, 76, C.lime, { anchor: 'middle', len: f2(bw('LA CASE VERTE INVISIBLE', 76)) });
      // heure de jeu
      const sA = '1 200', lab1 = ' ' + st.unit + ' MISÉS / H', lab2 = ' ' + st.unit + ' GARDÉS';
      st.fmt = (v) => ZV.fr(v);
      const mk = (cx, fill, tail, final, wTxt) => {
        const gr = g(root), size = 52, w = (String(final).length + tail.length) * size * 0.6 + 90, h = 104;
        rect(gr, -w / 2 + 11, -h / 2 + 11, w, h, 18, C.ink);
        rect(gr, -w / 2, -h / 2, w, h, 18, fill, C.ink, 7);
        const tx = text(gr, '', -w / 2 + 45, size * 0.35, size, C.ink, { mono: true, anchor: 'start' });
        tx.setAttribute('textLength', 1); tx.setAttribute('lengthAdjust', 'spacingAndGlyphs');
        return { g: gr, tx, cx, tail, size, final, w };
      };
      st.hA = mk(620, C.paper, lab1, st.fmt(st.stake));
      st.hB = mk(1330, C.lime, lab2, st.fmt(st.keptH));
      st.hArrow = text(root, '→', 0, 32, 90, C.paper, { anchor: 'middle', len: f2(bw('→', 90) + 20) });
      // carton de loi
      st.law = g(root);
      {
        const lab = 'ARRÊTÉ DU 14 MAI 2007 · MIN. 85 %', w = lab.length * 30 * 0.6 + 60, h = 66;
        rect(st.law, -w / 2 + 9, -h / 2 + 9, w, h, 10, C.paper);
        rect(st.law, -w / 2, -h / 2, w, h, 10, C.ink, C.paper, 5);
        text(st.law, lab, 0, 11, 30, C.paper, { mono: true, anchor: 'middle', len: f2(lab.length * 30 * 0.6) });
        st.lawW = w;
      }
      return st;
    },

    update(st, t, shot) {
      try {
        t = clamp(t, 0, st.dur + 1);
        const c = st.c;
        const bar = (b, tc, inv) => {
          const on = tc !== null && t >= tc;
          const p = on ? E.out3(prog(t, tc, tc + 0.9)) : 0;
          const wr = b.rend * U * p;
          b.paper.setAttribute('width', f2(Math.max(0.01, wr)));
          b.paper.setAttribute('visibility', on ? 'visible' : 'hidden');
          b.pct.setAttribute('visibility', on && p > 0.7 ? 'visible' : 'hidden');
          // la tranche arrive au bout de la part rendue, puis se soulève
          const ts = (tc !== null ? tc : 0) + 0.9;
          const dropIn = on ? E.out3(prog(t, tc + 0.55, ts)) : 0;
          const lift = on ? E.back(prog(t, ts, ts + 0.4)) : 0;
          let dy = -26 * lift, x = b.sx + lerp(160, 0, dropIn);
          const pi = inv !== null ? E.out3(prog(t, inv, inv + 0.35)) : 0;
          dy *= 1 - pi;
          const hid = !on || t < tc + 0.55;
          put(b.sl, x, b.y + dy, 0, 1, 1, hid ? 0 : 1);
          b.slBase.setAttribute('fill', pi > 0.5 ? C.pocket : C.lime);
          b.slBase.setAttribute('stroke', pi > 0.5 ? C.lime : C.ink);
          b.slBase.setAttribute('stroke-dasharray', pi > 0.5 ? '10 8' : '');
          b.slHat.setAttribute('visibility', pi > 0.5 ? 'visible' : 'hidden');
          const tl = ts + 0.35, lo = on && t >= tl;
          const lp = E.back(prog(t, tl, tl + 0.25));
          b.lab.setAttribute('visibility', lo ? 'visible' : 'hidden');
          b.lab.setAttribute('opacity', 1);
          b.tick.setAttribute('visibility', lo ? 'visible' : 'hidden');
          b.tick.setAttribute('x1', f2(b.sx + b.w / 2)); b.tick.setAttribute('x2', f2(b.sx + b.w / 2));
          b.tick.setAttribute('y2', f2(b.y + BH + 30 * Math.min(1, lp)));
          b.lab.setAttribute('transform', `translate(0 ${f2((1 - Math.min(1, lp)) * 14)})`);
        };
        bar(st.rb, c.roulette, null);
        bar(st.mb, c.machine, c.invisible);
        // × 5,5
        {
          const tt = c.times, on = tt !== null && t >= tt, p = on ? E.back(prog(t, tt, tt + 0.25)) : 0, sh = tt !== null ? ZV.shakeAt(t, tt + 0.2, 8, 0.4) : [0, 0];
          put(st.times, 1250 + sh[0], 392 + sh[1], -4, on ? Math.max(0.01, p) : 0, on ? Math.max(0.01, p) : 0, on ? 1 : 0);
        }
        // case verte invisible
        {
          const ti = c.invisible, on = ti !== null && t >= ti + 0.25, p = on ? E.back(prog(t, ti + 0.25, ti + 0.5)) : 0;
          st.inv.setAttribute('visibility', on ? 'visible' : 'hidden');
          st.inv.setAttribute('transform', `translate(960 705) scale(${f2(Math.max(0.01, p))}) translate(-960 -705)`);
        }
        // heure de jeu : deux compteurs
        {
          const th = c.hour;
          const part = (h, t0, v1) => {
            const on = th !== null && t >= t0;
            const p = on ? E.back(prog(t, t0, t0 + 0.25)) : 0;
            put(h.g, h.cx, 785, 0, on ? Math.max(0.01, p) : 0, on ? Math.max(0.01, p) : 0, on ? 1 : 0);
            const v = Math.round(v1 * E.out3(prog(t, t0 + 0.1, t0 + 1.1)));
            const s = ZV.fr(v) + h.tail;
            h.tx.textContent = s; h.tx.setAttribute('textLength', f2(s.length * h.size * 0.6));
          };
          part(st.hA, th !== null ? th : 0, st.stake);
          part(st.hB, th !== null ? th + 1.4 : 0, st.keptH);
          const ta = th !== null ? th + 1.25 : 0, on = th !== null && t >= ta;
          const p = E.back(prog(t, ta, ta + 0.2));
          put(st.hArrow, 975, 785, 0, on ? Math.max(0.01, p) : 0, on ? Math.max(0.01, p) : 0, on ? 1 : 0);
        }
        // carton de loi
        {
          const tl = c.law, on = tl !== null && t >= tl, p = on ? E.out3(prog(t, tl, tl + 0.3)) : 0;
          put(st.law, 1710 - st.lawW / 2 + (1 - p) * 700, 94, 0, 1, 1, on ? 1 : 0);
        }
      } catch (e) { /* jamais d'exception */ }
    }
  });
})();
;
/* ==== tools/video/composition/components/run-curve.js ==== */
// Composant `run-curve` : la courbe de fortune d'Archie Karas en trois saisons (échelle LINÉAIRE : 40 M$ = 560 px).
// Cues : start, climb(dur), summit, seed, yours, night, baccarat, zero(dur), ghost, loop, 2013, blacklist, 2024, recap.
// Montée en paper (jamais lime), chute en rouge, boucle en paper ; le lime est réservé au sol (le zéro). Aucun clignotement.
(() => {
  'use strict';
  const { C, E, clamp, prog, lerp, f2, sv, g, rect, circle, path, line, text, put, shakeAt } = ZV;
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const str = (v, d) => (typeof v === 'string' && v.trim() ? v.trim() : d);
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const vis = (n, on) => setA(n, 'visibility', on ? 'visible' : 'hidden');
  const measure = (n, size) => { try { const w = n.getComputedTextLength(); if (w > 0) return w; } catch (e) { /* hors DOM */ } return (n.textContent || '').length * size * 0.62; };
  const YV = (m) => 720 - m * 14;           // m en M$ → y
  const GY = 720;                           // sol

  // coupe en deux lignes équilibrées (« | » force la coupure)
  function split2(s) {
    if (s.indexOf('|') >= 0) return s.split('|').map((x) => x.trim());
    if (s.length < 20) return [s];
    const mid = s.length / 2; let best = -1, bd = 1e9;
    for (let i = 1; i < s.length; i++) if (s[i] === ' ' && !/[:·→]/.test(s[i + 1] || '') && Math.abs(i - mid) < bd) { bd = Math.abs(i - mid); best = i; }
    return best < 0 ? [s] : [s.slice(0, best), s.slice(best + 1)];
  }
  // étiquette plate centrée sur (0,0) ; lines = tableau de lignes
  function mkTag(parent, lines, size, o) {
    o = o || {};
    if (typeof lines === 'string') lines = [lines];
    const grp = g(parent), lh = size * 1.22;
    const txs = lines.map((s, i) => text(grp, s, 0, (i - (lines.length - 1) / 2) * lh + size * 0.35, size, o.tfill || C.ink, { anchor: 'middle', mono: o.mono }));
    let w = Math.max.apply(null, txs.map((n) => measure(n, size)));
    if (o.maxW && w > o.maxW) { const k = o.maxW / w; txs.forEach((n, i) => { n.setAttribute('font-size', f2(size * k)); n.setAttribute('y', f2((i - (lines.length - 1) / 2) * lh * k + size * k * 0.35)); }); w = o.maxW; }
    const bw = w + 2 * (o.padX === undefined ? 20 : o.padX), bh = lh * lines.length * (o.maxW && w === o.maxW ? 1 : 1) + (o.padY === undefined ? 18 : o.padY), sh = o.sh === undefined ? 8 : o.sh, r = o.r === undefined ? 10 : o.r;
    const a = rect(grp, -bw / 2 + sh, -bh / 2 + sh, bw, bh, r, o.shFill || C.ink);
    const b = rect(grp, -bw / 2, -bh / 2, bw, bh, r, o.fill || C.paper, o.stroke || C.ink, o.sw || 5);
    grp.insertBefore(a, txs[0]); grp.insertBefore(b, txs[0]);
    return { g: grp, w: bw, h: bh };
  }
  function poly(pts) {
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return { pts, cum, L: cum[cum.length - 1] };
  }
  function at(pl, s) {
    s = clamp(s, 0, pl.L);
    let i = 1; while (i < pl.pts.length - 1 && pl.cum[i] < s) i++;
    const a = pl.pts[i - 1], b = pl.pts[i], d = pl.cum[i] - pl.cum[i - 1], k = d > 0 ? (s - pl.cum[i - 1]) / d : 0;
    return [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  }
  const dstr = (pts, ox, oy, sx, sy) => pts.map((p, i) => `${i ? 'L' : 'M'}${f2((ox || 0) + p[0] * (sx || 1))} ${f2((oy || 0) + p[1] * (sy || sx || 1))}`).join('');
  // trait de courbe (bordure ink + corps), tracé progressif par dasharray
  function stroke(parent, pl, col, w, ink) {
    const d = dstr(pl.pts);
    const a = path(parent, d, 'none', ink || C.ink, w + 8, { 'stroke-linecap': 'butt' });
    const b = path(parent, d, 'none', col, w, { 'stroke-linecap': 'butt' });
    return { a, b, pl };
  }
  function reveal(st, s) {
    const on = s > 0.5, v = Math.min(s, st.pl.L);
    vis(st.a, on); vis(st.b, on);
    const da = `${f2(v)} ${f2(st.pl.L + 50)}`;
    setA(st.a, 'stroke-dasharray', da); setA(st.b, 'stroke-dasharray', da);
  }

  function buildClimb(rnd) {
    const ph = [{ n: 7, x0: 200, x1: 420, h0: 0, h1: 14, e: 1.2 }, { n: 6, x0: 420, x1: 620, h0: 14, h1: 120, e: 2.3 }, { n: 7, x0: 620, x1: 840, h0: 120, h1: 560, e: 1.6 }];
    const T = [], X = [];
    let k = 0;
    ph.forEach((p) => { for (let i = 0; i < p.n; i++, k++) { const u = (i + 1) / p.n; T.push(p.h0 + (p.h1 - p.h0) * Math.pow(u, p.e)); X.push(lerp(p.x0, p.x1, u)); } });
    const dips = { 3: 3, 9: 12, 15: 45 };
    for (const i in dips) { const ii = +i; T[ii] = Math.max(0, T[ii - 1] - dips[i]); }
    const pts = [[200, GY - 0.5]];
    let xa = 200, ha = 0;
    for (let i = 0; i < T.length; i++) {
      const xb = X[i], w = xb - xa, hb = i === T.length - 1 ? 560 : T[i], f = 0.4 + rnd() * 0.2;
      pts.push([xa + w * f, GY - ha - 0.5], [xa + w * (f + 0.18), GY - hb - 0.5], [xb, GY - hb - 0.5]);
      xa = xb; ha = hb;
    }
    pts[pts.length - 1] = [840, 160];
    return pts;
  }

  ZV.define('run-curve', {
    init(root, shot) {
      const p = (shot && shot.props) || {};
      const beats = Array.isArray(shot && shot.beats) ? shot.beats : [];
      const cueOf = (n) => { const b = beats.filter((x) => x && x.do === 'cue' && x.name === n && isNum(x.t)).sort((a, c) => a.t - c.t)[0]; return b || null; };
      const st = {};
      const T = {};
      ['start', 'climb', 'summit', 'seed', 'yours', 'night', 'baccarat', 'zero', 'ghost', 'loop', '2013', 'blacklist', '2024', 'recap'].forEach((n) => { const b = cueOf(n); T[n] = b ? b.t : null; st['d_' + n] = b && isNum(b.dur) && b.dur > 0 ? b.dur : null; });
      st.T = T;
      st.from = ['climb', 'fall', 'all'].indexOf(p.from) >= 0 ? p.from : 'empty';
      st.fromRank = { empty: 0, climb: 1, fall: 2, all: 3 }[st.from];
      const rnd = ZV.rng(1992);

      rect(root, 0, 0, 1920, 1080, 0, C.ink);
      // repère 40 M$ et graduations
      line(root, 200, 160, 860, 160, C.paper, 2, { 'stroke-dasharray': '10 10', 'stroke-linecap': 'butt' });
      text(root, '40 M$', 186, 170, 30, C.paper, { anchor: 'end', mono: true });
      [10, 20, 30, 40].forEach((m) => line(root, 192, YV(m), 214, YV(m), C.paper, 3, { 'stroke-linecap': 'butt' }));
      [860, 1180].forEach((x) => line(root, x, 110, x, 720, C.paper, 3, { 'stroke-dasharray': '8 10', 'stroke-linecap': 'butt' }));
      // séparer : bande du sol
      rect(root, 60, GY, 1720, 40, 0, C.lime);
      text(root, '0', 140, GY + 32, 40, C.ink, { anchor: 'middle', mono: true });
      // en-têtes
      st.hd = [['SAISON 1 · LA MONTÉE', 530], ['SAISON 2 · LA CHUTE', 1020], ['SAISON 3 · LA BOUCLE', 1450]].map((h) => { const n = text(root, h[0], h[1], 92, 24, C.paper, { anchor: 'middle', mono: true }); return n; });
      // traits de rappel (derrière les courbes)
      st.leadN = line(root, 642, 245, 876, 237, C.paper, 3, { 'stroke-dasharray': '6 8', 'stroke-linecap': 'butt' });
      st.leadB = line(root, 578, 337, 956, 433, C.paper, 3, { 'stroke-dasharray': '6 8', 'stroke-linecap': 'butt' });
      // ghost
      st.ghostL = line(root, 860, 160, 1720, 160, C.paper, 2, { 'stroke-dasharray': '10 10', 'stroke-linecap': 'butt' });
      st.ghostT = text(root, str(p.ghost, 'LÀ OÙ IL ÉTAIT EN JANVIER 1995'), 1720, 146, 26, C.paper, { anchor: 'end', mono: true });
      // courbes
      st.climb = stroke(root, poly(buildClimb(rnd)), C.paper, 10);
      const FALL = [[840, 160], [880, 160], [880, YV(29)], [960, YV(29)], [960, YV(12)], [990, YV(12)], [1000, 600], [1040, 600], [1050, 650], [1090, 650], [1100, 690], [1130, 690], [1140, GY], [1160, GY]];
      st.shk = g(root);
      st.fall = stroke(st.shk, poly(FALL), C.red, 10);
      st.iN = 2; st.iB = 4; // indices des fins de falaise
      const lp = [[1160, GY], [1200, GY]];
      for (let i = 0; i < 4; i++) { const x0 = 1200 + i * 125; lp.push([x0 + 40, GY], [x0 + 62, GY - 14], [x0 + 85, GY], [x0 + 125, GY]); }
      st.loop = stroke(root, poly(lp), C.paper, 10);
      // stickers de phase
      st.ph = [['POKER', 300, 668, 215], ['BILLARD', 468, 618, 430], ['DÉS', 790, 560, 640]].map((a) => { const t = mkTag(root, a[0], 26, { mono: true, padY: 16, sh: 6, sw: 4 }); return { g: t.g, x: a[1], y: a[2], thr: a[3] }; });
      // départ
      st.startG = g(root);
      const sg = g(st.startG);
      rect(sg, 210 + 8, 546 + 8, 340, 92, 8, C.ink);
      path(sg, 'M230 636 L284 636 L206 694Z', C.paper, C.ink, 5);
      rect(sg, 210, 546, 340, 92, 8, C.paper, C.ink, 5);
      rect(sg, 236, 634, 46, 8, 0, C.paper);
      const kk = text(sg, str(p.start_kicker, 'LAS VEGAS · DÉC. 1992'), 380, 576, 22, C.ink, { anchor: 'middle', mono: true });
      const kw = measure(kk, 22); if (kw > 310) { kk.setAttribute('font-size', f2(22 * 310 / kw)); }
      const sm = text(sg, str(p.start, '50 $ EN POCHE'), 380, 620, 44, C.ink, { anchor: 'middle' });
      const sw = measure(sm, 44); if (sw > 310) { sm.setAttribute('font-size', f2(44 * 310 / sw)); }
      // sommet
      st.sumT = text(root, str(p.summit, '≈ 40 M$'), 810, 146, 56, C.paper, { anchor: 'end' });
      st.brace = g(root);
      path(st.brace, 'M200 772 L200 784 L840 784 L840 772 M520 784 L520 794', 'none', C.paper, 4, { 'stroke-linecap': 'butt' });
      text(st.brace, str(p.span, '2 ANS ½'), 520, 824, 26, C.paper, { anchor: 'middle', mono: true });
      st.fac = mkTag(root, str(p.factor, '× 800 000'), 60, { padY: 24, sh: 10, sw: 6, maxW: 360 });
      st.seed = mkTag(root, split2(str(p.seed, 'PAS UNE STRATÉGIE : UN SOUVENIR')), 24, { mono: true, padY: 22 });
      st.pin = g(root);
      line(st.pin, 840, 160, 840, 118, C.ink, 12);
      line(st.pin, 840, 160, 840, 118, C.lime, 6);
      circle(st.pin, 840, 108, 17, C.lime, C.ink, 5);
      // « ton run »
      st.yours = g(root);
      rect(st.yours, 1240 + 10, 200 + 10, 460, 240, 6, C.ink);
      rect(st.yours, 1240, 200, 460, 240, 6, C.paper, C.ink, 6);
      const mini = stroke(st.yours, poly(buildClimb(ZV.rng(1992)).map((q) => [1268 + (q[0] - 200) * 0.3, 410 - (GY - q[1]) * 0.3])), C.ink, 5, C.paper);
      line(st.yours, 1268, 412, 1480, 412, C.ink, 5, { 'stroke-linecap': 'butt' });
      st.mini = mini;
      const yl = split2(str(p.yours, 'TON RUN, À TA TAILLE').replace(/, /, ',|'));
      yl.forEach((s, i) => text(st.yours, s, 1584, 316 + i * 34, 24, C.ink, { anchor: 'middle', mono: true }));
      // chute : stickers
      st.night = mkTag(st.shk, split2(str(p.night, 'JANV. 1995 · −11 M$ EN UNE NUIT, AUX DÉS')), 26, { mono: true, padY: 20 });
      st.bacc = mkTag(root, str(p.baccarat, '−17 M$ · BACCARA'), 28, { mono: true, padY: 20 });
      st.zero = mkTag(root, split2(str(p.zero, '3 SEMAINES PLUS TARD : 0')), 26, { mono: true, padY: 20 });
      // boucle : loupe
      st.lens = g(root);
      const ln = st.lens;
      [1220, 1700].forEach((x, i) => line(ln, x, 480, i ? 1700 : 1200, 716, C.paper, 3, { 'stroke-dasharray': '6 8', 'stroke-linecap': 'butt' }));
      rect(ln, 1220 + 12, 260 + 12, 480, 220, 6, C.ink);
      rect(ln, 1220, 260, 480, 220, 6, C.paper, C.ink, 6);
      line(ln, 1250, 322, 1590, 322, C.ink, 2, { 'stroke-dasharray': '8 8', 'stroke-linecap': 'butt' });
      rect(ln, 1240, 436, 360, 14, 0, C.lime, C.ink, 3);
      const mp = []; for (let i = 0; i < 4; i++) { const x0 = 1260 + i * 80; mp.push([x0, 436], [x0 + 26, 436], [x0 + 40, 330], [x0 + 54, 436], [x0 + 80, 436]); }
      mp.unshift([1250, 436]);
      st.lensC = stroke(ln, poly(mp), C.ink, 8, C.paper);
      const loL = Array.isArray(p.loop_labels) ? p.loop_labels : ['1 M$', '0'];
      text(ln, str(loL[0], '1 M$'), 1604, 332, 28, C.ink, { mono: true });
      text(ln, str(loL[1], '0'), 1604, 446, 28, C.ink, { mono: true });
      // drapeaux
      const FL = Array.isArray(p.flags) && p.flags.length ? p.flags : [{ cue: '2013', text: '2013 · ARRÊTÉ|CARTES MARQUÉES' }, { cue: 'blacklist', text: 'LISTE NOIRE|DU NEVADA' }, { cue: '2024', text: '2024|SANS FORTUNE' }];
      const FX = [1290, 1470, 1650], FY = [500, 572, 606];
      st.flags = FL.slice(0, 3).map((f, i) => {
        const fg = g(root), x = FX[i], y0 = FY[i];
        line(fg, x, y0 + 4, x, GY - 2, C.paper, 4, { 'stroke-linecap': 'butt' });
        const ls = String(f && f.text || '').split('|');
        const tag = mkTag(fg, ls, 22, { mono: true, padY: 14, sh: 5, sw: 4, r: 4, padX: 12 });
        tag.g.setAttribute('transform', `translate(${f2(x + 2 + tag.w / 2)} ${y0 + 25})`);
        return { g: fg, cue: String(f && f.cue || ['2013', 'blacklist', '2024'][i]), y: y0, h: GY - y0 };
      });
      // tête
      st.head = g(st.shk);
      circle(st.head, 0, 0, 18, C.white, C.ink, 5);
      // récap
      const ring = (cx, cy, r) => `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
      st.veil = path(root, `M0 0 H1920 V1080 H0Z ${ring(200, GY, 44)} ${ring(1700, GY, 44)}`, C.ink, null, 0, { 'fill-rule': 'evenodd' });
      st.rings = g(root);
      [200, 1700].forEach((x) => { circle(st.rings, x, GY, 38, 'none', C.ink, 18); circle(st.rings, x, GY, 38, 'none', C.lime, 8); });
      st.recap = mkTag(root, str(p.recap, '50 $ → 0'), 140, { padY: 50, padX: 50, sh: 14, sw: 8, maxW: 900, r: 16 });
      return st;
    },

    update(st, t) {
      if (!st || !st.T) return;
      const T = st.T, fr = st.fromRank, tt = (n) => T[n];
      const past = (n, d) => (tt(n) != null && t >= tt(n) + (d || 0));

      /* ---- avancement de chaque courbe ---- */
      const cl = st.climb.pl, fl = st.fall.pl, lp = st.loop.pl;
      const cDur = st.d_climb || 6;
      let sC = fr >= 1 ? cl.L : tt('climb') == null ? 0 : cl.L * Math.pow(prog(t, tt('climb'), tt('climb') + cDur), 1.6);
      let sF = fr >= 2 ? fl.L : Math.max(
        tt('night') == null ? 0 : fl.cum[st.iN] * prog(t, tt('night'), tt('night') + 0.2),
        tt('baccarat') == null ? 0 : (prog(t, tt('baccarat'), tt('baccarat') + 0.4) > 0 ? fl.cum[st.iN] + (fl.cum[st.iB] - fl.cum[st.iN]) * prog(t, tt('baccarat'), tt('baccarat') + 0.4) : 0),
        tt('zero') == null ? 0 : (prog(t, tt('zero'), tt('zero') + (st.d_zero || 2)) > 0 ? fl.cum[st.iB] + (fl.L - fl.cum[st.iB]) * prog(t, tt('zero'), tt('zero') + (st.d_zero || 2)) : 0));
      const pL = fr >= 3 ? 1 : tt('loop') == null ? 0 : prog(t, tt('loop'), tt('loop') + (st.d_loop || 3));
      const sL = lp.L * pL;
      reveal(st.climb, sC); reveal(st.fall, sF); reveal(st.loop, sL);

      /* ---- en-têtes de saison ---- */
      vis(st.hd[0], fr >= 1 || tt('start') != null && t >= tt('start') || tt('climb') != null && t >= tt('climb'));
      vis(st.hd[1], fr >= 2 || past('night'));
      vis(st.hd[2], fr >= 3 || past('loop'));

      /* ---- tête ---- */
      const startOn = fr >= 1 || (tt('start') != null && t >= tt('start')) || sC > 0;
      let hp, hs = 1;
      if (sL > 0.5) hp = at(lp, sL); else if (sF > 0.5) hp = at(fl, sF); else hp = at(cl, sC);
      if (tt('start') != null && fr < 1 && sC <= 0) hs = E.back(prog(t, tt('start'), tt('start') + 0.25));
      put(st.head, hp[0], hp[1], 0, hs, hs, startOn ? 1 : 0);
      const nSk = tt('night') == null ? [0, 0] : shakeAt(t, tt('night'), 12, 0.4);
      setA(st.shk, 'transform', `translate(${f2(nSk[0])} ${f2(nSk[1])})`);

      /* ---- départ ---- */
      const sQ = fr >= 1 || tt('start') == null ? 0 : prog(t, tt('start'), tt('start') + 0.3);
      const sOut = tt('climb') == null ? 0 : prog(t, tt('climb'), tt('climb') + 0.3);
      const ssc = sQ > 0 ? E.back(sQ) : 0;
      setA(st.startG, 'transform', `translate(380 640) scale(${f2(ssc || 0.0001)}) translate(-380 -640)`);
      vis(st.startG, sQ > 0 && sOut < 1);
      setA(st.startG, 'opacity', f2(1 - sOut));

      /* ---- stickers de phase ---- */
      const night = tt('night') == null ? (fr >= 2 ? 1 : 0) : (fr >= 2 ? 1 : prog(t, tt('night'), tt('night') + 0.3));
      st.ph.forEach((o, i) => {
        const x = hp[0];
        const passed = fr >= 1 || (sC > 0 && cl.pts && (sC >= cl.L * [0.0, 0.19, 0.5][i]));
        const q = fr >= 1 ? 1 : clamp((sC - cl.L * [0.0, 0.19, 0.5][i]) / (cl.L * 0.03));
        const s = q > 0 ? E.back(q) : 0;
        put(st.ph[i].g, o.x, o.y, i % 2 ? 2 : -2, s, s, q > 0 && (fr < 1 || true) ? 1 : 0);
      });

      /* ---- sommet ---- */
      const sm = fr >= 1 ? 1 : tt('summit') == null ? 0 : prog(t, tt('summit'), tt('summit') + 0.3);
      const fade = 1 - night;
      const smE = sm > 0 && fade > 0 ? 1 : 0;
      const spop = sm > 0 ? E.out3(sm) : 0;
      vis(st.sumT, smE); setA(st.sumT, 'opacity', f2(spop * fade));
      setA(st.brace, 'opacity', f2(spop * fade)); vis(st.brace, smE);
      const fq = tt('summit') == null ? 0 : prog(t, tt('summit') + 0.15, tt('summit') + 0.4);
      const fs = fq > 0 && fade > 0 ? 1 + 0.5 * (1 - E.out3(fq)) : 0;
      put(st.fac.g, 420, 300, -4, fs, fs, fs > 0 ? fade : 0);
      const sd = tt('seed') == null ? 0 : prog(t, tt('seed'), tt('seed') + 0.3);
      put(st.seed.g, 430, 410, 2, sd > 0 ? E.back(sd) : 0, sd > 0 ? E.back(sd) : 0, sd > 0 ? fade : 0);
      const pinQ = fr >= 2 ? 1 : sd;
      put(st.pin, 0, 0, 0, 1, 1, pinQ > 0 ? 1 : 0);
      st.pin.setAttribute('transform', `translate(840 ${f2(160 - 52 * (1 - E.out3(pinQ)))})  translate(-840 -160)`);
      // ton run
      const yq = tt('yours') == null ? 0 : prog(t, tt('yours'), tt('yours') + 0.3);
      const yOn = yq > 0 && fade > 0 && fr < 2;
      vis(st.yours, yOn); setA(st.yours, 'opacity', f2(fade));
      reveal(st.mini, st.mini.pl.L * (tt('yours') == null ? 0 : E.out2(prog(t, tt('yours') + 0.2, tt('yours') + 1.2))));
      st.yours.setAttribute('transform', `translate(${f2(1470 * (1 - E.out3(yq)) * 0.0)} ${f2(-30 * (1 - E.out3(yq)))})`);

      /* ---- chute ---- */
      const nQ = fr >= 2 ? 1 : tt('night') == null ? 0 : prog(t, tt('night') + 0.1, tt('night') + 0.4);
      put(st.night.g, 440, 245, -2, nQ > 0 ? E.back(nQ) : 0, nQ > 0 ? E.back(nQ) : 0, nQ > 0 ? 1 : 0);
      vis(st.leadN, nQ > 0.6);
      const bQ = fr >= 2 ? 1 : tt('baccarat') == null ? 0 : prog(t, tt('baccarat') + 0.1, tt('baccarat') + 0.4);
      put(st.bacc.g, 410, 337, 2, bQ > 0 ? E.back(bQ) : 0, bQ > 0 ? E.back(bQ) : 0, bQ > 0 ? 1 : 0);
      vis(st.leadB, bQ > 0.6);
      const zQ = fr >= 2 ? 1 : tt('zero') == null ? 0 : prog(t, tt('zero') + (st.d_zero || 2) - 0.1, tt('zero') + (st.d_zero || 2) + 0.2);
      put(st.zero.g, 400, 425, -2, zQ > 0 ? E.back(zQ) : 0, zQ > 0 ? E.back(zQ) : 0, zQ > 0 ? 1 : 0);

      /* ---- ghost ---- */
      const gq = fr >= 3 ? 1 : tt('ghost') == null ? 0 : prog(t, tt('ghost'), tt('ghost') + 0.8);
      vis(st.ghostL, gq > 0); setA(st.ghostL, 'x2', f2(lerp(860, 1720, E.out2(gq))));
      const gt = fr >= 3 ? 1 : tt('ghost') == null ? 0 : prog(t, tt('ghost') + 0.4, tt('ghost') + 0.7);
      vis(st.ghostT, gt > 0); setA(st.ghostT, 'opacity', f2(gt));

      /* ---- boucle : loupe ---- */
      const lq = fr >= 3 ? 1 : tt('loop') == null ? 0 : prog(t, tt('loop'), tt('loop') + 0.3);
      const ls = lq > 0 ? E.out3(lq) : 0;
      vis(st.lens, lq > 0); setA(st.lens, 'opacity', f2(ls));
      reveal(st.lensC, st.lensC.pl.L * pL);

      /* ---- drapeaux ---- */
      st.flags.forEach((f) => {
        const tf = tt(f.cue); const q = fr >= 3 ? 1 : tf == null ? 0 : prog(t, tf, tf + 0.35);
        vis(f.g, q > 0);
        const e = q > 0 ? E.out3(q) : 0;
        // le mât pousse du sol : on rogne par clip simple via échelle verticale ancrée au sol
        f.g.setAttribute('transform', `translate(0 ${GY}) scale(1 ${f2(0.2 + 0.8 * e)}) translate(0 ${-GY})`);
        setA(f.g, 'opacity', f2(Math.min(1, q * 3)));
      });

      /* ---- récap ---- */
      const rq = tt('recap') == null ? 0 : prog(t, tt('recap'), tt('recap') + 0.35);
      vis(st.veil, rq > 0); setA(st.veil, 'fill-opacity', f2(0.62 * rq));
      vis(st.rings, rq > 0);
      const rs = rq > 0 ? 1 + 0.6 * (1 - E.out3(rq)) : 0;
      put(st.recap.g, 960, 420, -2, rs, rs, rq > 0 ? 1 : 0);
    }
  });
})();
;
/* ==== tools/video/composition/components/saga.js ==== */
// Composant `saga` : la saga de Charles Wells en quatre saisons (cartes), calendrier de deux mois, barre de vie.
(() => {
  const { C, sv, g, f2, E, prog, clamp, lerp, put, show, text, rect, circle, path } = ZV;
  const INK = C.ink;
  const Z0 = (v, d) => (v == null ? d : v);
  const popE = (p) => E.back(clamp(p));
  let UID = 0;

  const DEFAULT_CARDS = [
    { n: 1, kicker: 'JUILLET 1891', title: 'MONTE-CARLO', picto: 'casino' },
    { n: 2, kicker: 'NOVEMBRE', title: 'IL REVIENT', picto: 'chip' },
    { n: 3, kicker: '1892', title: 'LE YACHT', picto: 'ship' },
    { n: 4, kicker: '1893', title: 'LA CHUTE', picto: 'gavel' }
  ];

  const measCache = {};
  function meas(root, str, size, mono) {
    const key = str + '|' + size + '|' + (mono ? 1 : 0);
    if (measCache[key] != null) return measCache[key];
    let w = str.length * size * 0.6;
    try {
      const n = text(root, str, 0, 0, size, '#000', { mono });
      const b = n.getComputedTextLength();
      root.removeChild(n);
      if (b > 0) w = b;
    } catch (e) { /* estimation */ }
    measCache[key] = w;
    return w;
  }
  function pict(parent, name, o) {
    if (ZV.PICTO && ZV.PICTO.mk) return ZV.PICTO.mk(parent, name, o);
    const gg = g(parent);
    rect(gg, -100, -100, 200, 200, 20, C.paper, INK, 6);
    return { root: gg, body: gg, refs: {}, shRefs: {} };
  }
  function dots(root, color, op) {
    const id = 'sg' + (++UID);
    const defs = sv('defs', null, root);
    const pat = sv('pattern', { id, width: 56, height: 56, patternUnits: 'userSpaceOnUse' }, defs);
    sv('circle', { cx: 28, cy: 28, r: 3.2, fill: color, opacity: op }, pat);
    rect(root, 0, 0, 1920, 1080, 0, `url(#${id})`);
  }

  /* ------------------------------------------------------------------ */
  /*  Mode seasons                                                       */
  /* ------------------------------------------------------------------ */
  function buildSeasons(st, root, shot, pr) {
    rect(root, 0, 0, 1920, 1080, 0, INK);
    dots(root, C.paper, 0.1);
    // frise lime façon pellicule
    rect(root, -10, 318, 1940, 404, 0, C.lime, INK, 6);
    const id = 'sgf' + (++UID);
    const defs = sv('defs', null, root);
    const pat = sv('pattern', { id, width: 60, height: 40, patternUnits: 'userSpaceOnUse' }, defs);
    sv('rect', { x: 14, y: 8, width: 32, height: 22, rx: 5, fill: INK }, pat);
    rect(root, -10, 332, 1940, 40, 0, `url(#${id})`);
    rect(root, -10, 668, 1940, 40, 0, `url(#${id})`);
    st.active = clamp(Math.round(pr.active || 1), 1, 4);
    const cards = (pr.cards && pr.cards.length ? pr.cards : DEFAULT_CARDS);
    const order = [1, 2, 3, 4].filter((n) => n !== st.active).concat([st.active]);   // la carte active est dessinée en dernier
    st.cards = [];
    st.kt = ZV.cue(shot, 'kicker');
    st.pt = ZV.cue(shot, 'picto');
    st.wt = ZV.cue(shot, 'wells-in');
    st.stampsDef = (pr.stamps || []).map((s) => ({ t: ZV.cue(shot, s.cue), text: s.text }));
    st.first = st.active === 1;
    st.tAct = st.first ? 0.55 : 0.08;
    const lay = g(root);
    order.forEach((n) => {
      const data = cards.find((c) => c.n === n) || DEFAULT_CARDS[n - 1];
      const dark = n === 4;
      const i = n - 1;
      const cx = 960 + (i - 1.5) * 420;
      const grp = g(lay);
      // ombre dure + corps
      rect(grp, -190 + 12, -250 + 12, 380, 500, 22, INK);
      rect(grp, -190, -250, 380, 500, 22, dark ? C.pocket : C.paper, dark ? C.paper : INK, 8);
      // bandeau de saison
      rect(grp, -186, -246, 372, 76, 18, dark ? C.lime : INK);
      rect(grp, -186, -210, 372, 40, 0, dark ? C.lime : INK);
      text(grp, 'SAISON ' + n, 0, -192, 50, dark ? INK : C.lime, { anchor: 'middle', len: 270 });
      // pictogramme
      const pg = g(grp, { transform: 'translate(0 -42)' });
      const hasCue = n === st.active && st.pt != null;
      const pic = pict(pg, data.picto || 'chip', { bg: dark ? 'ink' : 'paper', n: 6 });
      const pictoScale = 0.98;
      put(pic.root, 0, 0, 0, pictoScale, pictoScale, 1);
      if ((data.picto || '') === 'ship') {
        // étiquette de prix rouge accrochée au yacht
        const tg = g(pic.body, { transform: 'translate(78 -64) rotate(16)' });
        path(tg, 'M -40 -24 L 26 -24 L 46 0 L 26 24 L -40 24 Z', C.red, INK, 5);
        circle(tg, 30, 0, 5.5, INK);
        text(tg, '€€€', -6, 9, 26, C.paper, { mono: 1, anchor: 'middle' });
      }
      // titre
      const tw = Math.min(340, meas(root, data.title || '', 50, false));
      text(grp, data.title || '', 0, 150, 50, dark ? C.paper : INK, { anchor: 'middle', len: tw });
      // kicker (date dite dans le script)
      const kg = g(grp, { transform: 'translate(0 205)' });
      const kw = meas(root, data.kicker || '', 32, true) + 36;
      rect(kg, -kw / 2, -28, kw, 56, 14, C.lime, INK, 5);
      text(kg, data.kicker || '', 0, 11, 32, INK, { mono: 1, anchor: 'middle' });
      // voile ink 62 %
      const veil = rect(grp, -190, -250, 380, 500, 22, INK);
      veil.setAttribute('opacity', 0);
      const card = { n, i, cx, grp, kg, pic, pg, veil, hasCue, data, picto: data.picto, stampGroups: [] };
      // Wells (silhouette plate) : n'existe que si le plan le demande
      if (n === st.active && st.wt != null) {
        card.wells = pict(grp, 'wells', { bg: 'paper' });
      }
      // tampons de la carte active
      if (n === st.active && st.stampsDef.length) {
        st.stampsDef.forEach((sd, k) => {
          const sg = g(grp);
          const sz = 50, w = meas(root, sd.text, sz, false) + 60, h = 92;
          rect(sg, -w / 2 + 8, -h / 2 + 8, w, h, 10, INK);
          rect(sg, -w / 2, -h / 2, w, h, 10, C.red, INK, 6);
          rect(sg, -w / 2 + 12, -h / 2 + 12, w - 24, h - 24, 5, 'none', INK, 3);
          text(sg, sd.text, 0, sz * 0.35, sz, INK, { anchor: 'middle', len: w - 60 });
          card.stampGroups.push({ sg, t: sd.t, rot: k % 2 ? 7 : -9, x: k % 2 ? 8 : -6, y: k % 2 ? 78 : -54 });
        });
      }
      st.cards.push(card);
    });
  }

  function tickSeasons(st, t) {
    const a = E.out3(prog(t, st.tAct, st.tAct + 0.47));
    const tilt = st.active % 2 ? -3 : 3;
    for (const c of st.cards) {
      const act = c.n === st.active;
      let sc = 1, rot = 0, dy = 0, op = 1;
      if (st.first) {
        const p = prog(t, c.i * 0.1, c.i * 0.1 + 0.36);
        sc = popE(p); op = p > 0 ? 1 : 0;
      }
      if (act) { sc *= 1 + 0.25 * a; rot = tilt * a; dy = -10 * a; }
      put(c.grp, c.cx, 520 + dy, rot, Math.max(sc, 0.001), Math.max(sc, 0.001), op);
      c.veil.setAttribute('opacity', f2(act ? 0 : 0.62 * a));
      // kicker : visible si saison passée ; sinon sur le repère `kicker` pour la carte active
      let kv = 0;
      if (act) { const kt = Z0(st.kt, st.tAct + 0.45); kv = popE(prog(t, kt, kt + 0.3)); } else if (c.n < st.active) kv = 1;
      put(c.kg, 0, 205, 0, kv, kv, kv > 0 ? 1 : 0);
      // pictogramme de la carte active qui entre sur son repère (ex. le yacht, par la droite)
      if (act && c.hasCue) {
        const p = prog(t, st.pt, st.pt + 0.55);
        const sway = Math.sin((t - st.pt) * 6) * 5 * (1 - E.out2(prog(t, st.pt, st.pt + 1.2)));
        put(c.pic.root, 760 * (1 - E.out3(p)), 0, sway, 0.98, 0.98, t >= st.pt ? 1 : 0);
      }
      // Wells entre au casino
      if (act && c.wells) {
        const wp = prog(t, st.wt, st.wt + 1.0);
        const w = E.io2(wp);
        const x = lerp(-215, -8, w), bob = Math.abs(Math.sin(wp * Math.PI * 6)) * -9;
        const sc2 = lerp(0.62, 0.46, w) * (1 - E.in2(prog(wp, 0.82, 1)));
        put(c.wells.root, x, 12 + bob, 0, Math.max(sc2, 0.001), Math.max(sc2, 0.001), t >= st.wt && sc2 > 0.01 ? 1 : 0);
      }
      // tampons
      c.stampGroups.forEach((s) => {
        if (s.t == null) { put(s.sg, 0, 0, 0, 0, 0, 0); return; }
        const p = prog(t, s.t, s.t + 5 / 30);
        const k = 2.6 - 1.6 * E.out3(p);
        const sh = ZV.shakeAt(t, s.t + 5 / 30, 14, 0.4);
        put(s.sg, s.x + sh[0], s.y + sh[1], s.rot, k, k, t >= s.t ? 1 : 0);
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Mode calendar                                                      */
  /* ------------------------------------------------------------------ */
  function buildCalendar(st, root, shot, pr) {
    rect(root, 0, 0, 1920, 1080, 0, INK);
    dots(root, C.paper, 0.1);
    const months = pr.months && pr.months.length ? pr.months : [{ name: 'JUILLET', days: 11 }, { name: 'NOVEMBRE', days: 5 }];
    const total = { JUILLET: 31, NOVEMBRE: 30 };
    st.panels = months.slice(0, 2).map((m, k) => {
      const cx = k === 0 ? 520 : 1400, cy = 490;
      const grp = g(root);
      rect(grp, -380 + 14, -280 + 14, 760, 560, 26, INK);
      rect(grp, -380, -280, 760, 560, 26, C.paper, INK, 8);
      rect(grp, -376, -276, 752, 116, 22, INK);
      rect(grp, -376, -230, 752, 70, 0, INK);
      text(grp, m.name, -340, -190, 76, C.lime, { len: Math.min(430, meas(root, m.name, 76, false)) });
      const pill = g(grp, { transform: 'translate(252 -216)' });
      rect(pill, -108, -34, 216, 68, 16, C.lime, INK, 5);
      const cnt = text(pill, '0', 0, 14, 38, INK, { mono: 1, anchor: 'middle' });
      const cells = [];
      const ncell = total[m.name] || (k === 0 ? 31 : 30);
      for (let i = 0; i < 35; i++) {
        const col = i % 7, row = Math.floor(i / 7);
        const cg = g(grp, { transform: `translate(${-281 + col * 82 + 35} ${-142 + row * 82 + 35})` });
        if (i >= ncell) { cg.setAttribute('visibility', 'hidden'); cells.push(null); continue; }
        const bx = rect(cg, -35, -35, 70, 70, 10, C.white, INK, 5);
        const tick = g(cg);
        rect(tick, -35, -35, 70, 70, 10, C.lime, INK, 5);
        path(tick, 'M -18 2 L -5 16 L 20 -16', 'none', INK, 9);
        cells.push({ cg, tick });
      }
      return { grp, cx, cy, cnt, cells, days: m.days || 0, name: m.name, t0: ZV.cue(shot, 'tick-' + (k + 1)), k };
    });
  }
  function tickCalendar(st, t) {
    for (const p of st.panels) {
      const pop = popE(prog(t, p.k * 0.14, p.k * 0.14 + 0.38));
      put(p.grp, p.cx, p.cy, p.k ? 1.2 : -1.2, pop, pop, pop > 0 ? 1 : 0);
      const t0 = Z0(p.t0, 99), per = 0.085;
      let done = 0;
      p.cells.forEach((c, i) => {
        if (!c) return;
        const ti = t0 + i * per;
        const on = i < p.days && t >= ti;
        if (on) done++;
        const q = on ? popE(prog(t, ti, ti + 0.2)) : 0;
        put(c.tick, 0, 0, 0, q, q, on ? 1 : 0);
      });
      p.cnt.textContent = done + (done > 1 ? ' JOURS' : ' JOUR');
      p.cnt.setAttribute('font-size', 38);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Mode lifeline                                                      */
  /* ------------------------------------------------------------------ */
  function buildLife(st, root, shot, pr) {
    rect(root, 0, 0, 1920, 1080, 0, C.paper);
    dots(root, INK, 0.1);
    const life = pr.life || { lime: '16 JOURS', rest: 'LE RESTE D’UNE VIE' };
    st.x0 = 160; st.w = 1600; st.y = 420; st.h = 130;
    rect(root, st.x0 + 12, st.y + 12, st.w, st.h, 24, INK);
    const track = g(root);
    rect(track, st.x0, st.y, st.w, st.h, 24, C.white, INK, 8);
    st.rest = rect(track, st.x0 + 14, st.y + 4, 1, st.h - 8, 0, C.red);
    st.limeSeg = rect(track, st.x0 + 4, st.y + 4, 14, st.h - 8, 0, C.lime);
    rect(root, st.x0, st.y, st.w, st.h, 24, 'none', INK, 8);
    // repères de vie : graduations (barres pleines)
    for (let k = 1; k < 10; k++) rect(root, st.x0 + k * 160 - 3, st.y + st.h - 26, 6, 26, 0, INK).setAttribute('opacity', 0.9);
    // étiquette « 16 JOURS » avec ligne de rappel
    st.lt = Z0(ZV.cue(shot, 'lime'), 0.9);
    st.rt = Z0(ZV.cue(shot, 'rest'), 2.0);
    const lw = meas(root, life.lime, 64, false) + 70;
    st.leader = rect(root, st.x0 + 5, st.y - 80, 6, 80, 0, INK);
    st.lbl1 = g(root);
    ZV.sticker(st.lbl1, lw, 104, C.lime, null, 64, INK, { sh: 10 });
    text(st.lbl1, life.lime, 0, 22, 64, INK, { anchor: 'middle', len: lw - 70 });
    st.lw = lw;
    st.lbl2 = g(root);
    const w2 = Math.min(1100, meas(root, life.rest, 88, false));
    text(st.lbl2, life.rest, 0, 0, 88, INK, { anchor: 'middle', len: w2 });
  }
  function tickLife(st, t) {
    const lp = prog(t, st.lt, st.lt + 0.3), lk = popE(lp);
    st.limeSeg.setAttribute('width', f2(14 * clamp(lp * 1.4)));
    show(st.limeSeg, t >= st.lt);
    st.leader.setAttribute('transform', `translate(0 ${f2(80 * (1 - lk))}) scale(1 ${f2(Math.max(lk, 0.001))})`);
    st.leader.setAttribute('visibility', t >= st.lt ? 'visible' : 'hidden');
    put(st.lbl1, st.x0 + st.lw / 2 + 6, st.y - 120, -3, lk, lk, t >= st.lt ? 1 : 0);
    const rp = E.io2(prog(t, st.rt, st.rt + 0.95));
    st.rest.setAttribute('width', f2(Math.max(0.001, (st.w - 22) * rp)));
    show(st.rest, t >= st.rt);
    const rk = popE(prog(t, st.rt + 0.5, st.rt + 0.85));
    put(st.lbl2, 1060, st.y - 52, 0, rk, rk, t >= st.rt + 0.5 ? 1 : 0);
  }

  ZV.define('saga', {
    init(root, shot) {
      const pr = shot.props || {};
      const st = { mode: pr.mode || 'seasons' };
      try {
        if (st.mode === 'calendar') buildCalendar(st, root, shot, pr);
        else if (st.mode === 'lifeline') buildLife(st, root, shot, pr);
        else buildSeasons(st, root, shot, pr);
      } catch (e) { if (window.ZV_DEBUG) console.error(e); }
      return st;
    },
    update(st, t, shot) {
      try {
        if (st.mode === 'calendar') tickCalendar(st, t);
        else if (st.mode === 'lifeline') tickLife(st, t);
        else tickSeasons(st, t);
      } catch (e) { if (window.ZV_DEBUG) console.error(e); }
    }
  });
})();
;
/* ==== tools/video/composition/components/same-share.js ==== */
// Composant `same-share` : « l'échelle bouge avec toi, le pourcentage ne bouge jamais ».
// Deux panneaux identiques (Karas à gauche, toi à droite), chacun avec une grille de fortune de 20 × 10 = 200 cases.
// Cues : left, night(dur), quarter, one, right, bet-right, zoom, same. Aucun pourcentage chiffré : la grille parle.
(() => {
  'use strict';
  const { C, E, clamp, prog, lerp, f2, sv, g, rect, circle, path, line, text, put } = ZV;
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const str = (v, d) => (typeof v === 'string' && v.trim() ? v.trim() : d);
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const vis = (n, on) => setA(n, 'visibility', on ? 'visible' : 'hidden');
  const measure = (n, size) => { try { const w = n.getComputedTextLength(); if (w > 0) return w; } catch (e) { /* hors DOM */ } return (n.textContent || '').length * size * 0.62; };
  function fit(n, size, maxW, y0) {
    const w = measure(n, size);
    if (w > maxW) { const k = maxW / w; n.setAttribute('font-size', f2(size * k)); if (y0 !== undefined) n.setAttribute('y', f2(y0 * k)); return maxW; }
    return w;
  }
  // étiquette plate centrée sur (0,0)
  function mkTag(parent, s, size, o) {
    o = o || {};
    const grp = g(parent);
    const tx = text(grp, s, 0, size * 0.35, size, o.tfill || C.ink, { anchor: 'middle', mono: o.mono });
    const w = fit(tx, size, o.maxW || 700, size * 0.35);
    const bw = w + 2 * (o.padX === undefined ? 24 : o.padX), bh = o.h || size * 1.7, sh = o.sh === undefined ? 8 : o.sh;
    const a = rect(grp, -bw / 2 + sh, -bh / 2 + sh, bw, bh, 10, C.ink);
    const b = rect(grp, -bw / 2, -bh / 2, bw, bh, 10, o.fill || C.paper, C.ink, o.sw || 5);
    grp.insertBefore(a, tx); grp.insertBefore(b, tx);
    return { g: grp, w: bw, h: bh };
  }

  const COLS = 20, ROWS = 10, N = COLS * ROWS, PITCH = 38, CELL = 34;
  const GX = -378, GY = 230;            // origine de la grille dans le repère du panneau (centre = 0)
  const ZC = [0, GY + 188];             // centre de la zone de grille (échelle 0,22 autour)
  const SMALL = 0.22;
  const LCX = 510, RCX = 1410, LCX0 = 960;

  function mkPanel(root, kicker, total) {
    const P = { g: g(root), cells: [] };
    const pg = P.g;
    const k = text(pg, kicker, GX, 90, 26, C.paper, { mono: true });
    fit(k, 26, 760);
    const tt = text(pg, total, GX, 180, 72, C.paper); fit(tt, 72, 500);
    P.head = [k, tt];
    P.grid = g(pg);
    rect(P.grid, GX - 8, GY - 8, 772, 392, 4, C.pocket, C.paper, 4);
    P.cg = g(P.grid); P.top = g(P.grid);
    for (let i = 0; i < N; i++) {
      const r = Math.floor(i / COLS), c = i % COLS;
      const cell = rect(i === 0 ? P.top : P.cg, GX + c * PITCH, GY + r * PITCH, CELL, CELL, 0, C.paper, C.ink, 3);
      P.cells.push({ n: cell, row: r, col: c });
    }
    // contour lime du premier carré (final « same »)
    P.hero = rect(P.top, GX - 3, GY - 3, CELL + 6, CELL + 6, 0, 'none', C.lime, 6);
    // étiquettes sous la grille
    P.lbl = {};
    P.lblG = g(pg);
    return P;
  }
  const mkLbl = (P, s, fill) => { const n = text(P.lblG, s, GX, 690, 34, fill, { mono: true }); fit(n, 34, 760); return n; };

  ZV.define('same-share', {
    init(root, shot) {
      const p = (shot && shot.props) || {};
      const beats = Array.isArray(shot && shot.beats) ? shot.beats : [];
      const cueOf = (n) => { const b = beats.filter((x) => x && x.do === 'cue' && x.name === n && isNum(x.t)).sort((a, c) => a.t - c.t)[0]; return b || null; };
      const st = { T: {}, D: {} };
      ['left', 'night', 'quarter', 'one', 'right', 'bet-right', 'zoom', 'same'].forEach((n) => { const b = cueOf(n); st.T[n] = b ? b.t : null; st.D[n] = b && isNum(b.dur) && b.dur > 0 ? b.dur : null; });
      st.nightCells = Math.max(1, Math.min(N - 1, Math.round(isNum(p.night_cells) ? p.night_cells : 55)));

      rect(root, 0, 0, 1920, 1080, 0, C.ink);
      // panneau gauche
      st.L = mkPanel(root, str(p.left_kicker, 'KARAS · JANVIER 1995'), str(p.left_total, '40 M$'));
      st.L.l0 = mkLbl(st.L, 'UNE MISE APRÈS L\'AUTRE', C.paper);
      st.L.l1 = mkLbl(st.L, str(p.night, '−11 M$ EN UNE NUIT'), C.red);
      st.L.l2 = mkLbl(st.L, str(p.left_bet, 'UNE MISE : 200 000 $'), C.paper);
      // contour du quart (polygone en L)
      const q = (x, y) => `${f2(GX + x)} ${f2(GY + y)}`;
      st.qPath = path(st.L.g, `M${q(-5, -5)} L${q(761, -5)} L${q(761, 75)} L${q(381, 75)} L${q(381, 115)} L${q(-5, 115)}Z`, 'none', C.lime, 6, { 'stroke-dasharray': '16 10', 'stroke-linejoin': 'miter', 'stroke-linecap': 'butt' });
      const defs = sv('defs', null, root);
      st.qClip = rect(sv('clipPath', { id: 'ss-q' }, defs), GX - 20, GY - 20, 0, 160, 0, '#000');
      st.qPath.setAttribute('clip-path', 'url(#ss-q)');
      st.qStk = mkTag(st.L.g, str(p.quarter, 'PLUS D\'UN QUART'), 38, { fill: C.lime, maxW: 340, h: 66, sw: 5 });
      st.small = mkTag(st.L.g, str(p.small, 'A L\'AIR PETITE'), 38, { fill: C.paper, maxW: 340, h: 66, sw: 5 });
      // panneau droit
      st.R = mkPanel(root, str(p.right_kicker, 'TOI'), str(p.right_total, '500 €'));
      st.R.l0 = mkLbl(st.R, str(p.right_bet, 'UNE MISE : 2,50 €'), C.paper);
      st.R.grid.setAttribute('transform', `translate(${ZC[0]} ${ZC[1]}) scale(${SMALL}) translate(${-ZC[0]} ${-ZC[1]})`);
      // « l'échelle bouge » et « = » et bandeau
      st.scale = mkTag(root, str(p.scale, 'L\'ÉCHELLE BOUGE AVEC TOI'), 26, { maxW: 460, h: 44, sw: 4, sh: 6, padX: 20 });
      st.eq = text(root, '=', 960, 470, 130, C.lime, { anchor: 'middle' });
      st.eq.setAttribute('stroke', C.ink); st.eq.setAttribute('stroke-width', 14); st.eq.setAttribute('paint-order', 'stroke'); st.eq.setAttribute('stroke-linejoin', 'round');
      st.band = g(root);
      const bt = text(st.band, str(p.same, 'LE POURCENTAGE, LUI, NE BOUGE JAMAIS'), 960, 790, 50, C.paper, { anchor: 'middle' });
      const bw = Math.min(1500, fit(bt, 50, 1400, 0) + 90);
      bt.setAttribute('y', f2(790 + (bt.getAttribute('font-size') - 50) * 0.35));
      const br = rect(st.band, 960 - bw / 2, 740, bw, 70, 0, C.ink, C.paper, 6);
      st.band.insertBefore(br, bt);
      st.nc = new Array(N).fill(null);
      st.rc = new Array(N).fill(null);
      return st;
    },

    update(st, t) {
      if (!st || !st.T) return;
      const T = st.T, D = st.D, L = st.L, R = st.R;
      const tl = T.left, tn = T.night, tq = T.quarter, to = T.one, tr = T.right, tb = T['bet-right'], tz = T.zoom, ts = T.same;
      const nd = D.night || 4;

      /* ---- position des panneaux ---- */
      const slide = tr == null ? 0 : E.io2(prog(t, tr, tr + 14 / 30));
      const lx = lerp(LCX0, LCX, slide);
      setA(L.g, 'transform', `translate(${f2(lx)} 0)`);
      const rq = tr == null ? 0 : prog(t, tr + 0.1, tr + 0.1 + 14 / 30);
      vis(R.g, rq > 0); setA(R.g, 'transform', `translate(${f2(RCX + 140 * (1 - E.out3(rq)))} 0)`); setA(R.g, 'opacity', f2(rq));

      /* ---- panneau gauche : texte et vague ---- */
      const hq = tl == null ? 1 : prog(t, tl, tl + 0.25);
      L.head.forEach((n) => { vis(n, hq > 0); setA(n, 'opacity', f2(hq)); });
      vis(L.grid, hq > 0);
      const cnt = tn == null ? 0 : Math.round(st.nightCells * Math.pow(prog(t, tn, tn + nd), 1.8));
      const arrived = tn != null && t >= tn + nd;
      const oneAt = to == null ? Infinity : to;
      for (let i = 0; i < N; i++) {
        const c = L.cells[i];
        const shown = tl == null || t >= tl + c.row / 30;
        let red = i < cnt;
        if (to != null && t >= to) {
          if (i === 0) red = true;
          else if (t >= to + ((N - 1 - Math.min(i, st.nightCells)) / st.nightCells) * 0.27) red = false;
        }
        const key = (shown ? 1 : 0) + (red ? 2 : 0);
        if (st.nc[i] !== key) {
          st.nc[i] = key;
          c.n.setAttribute('visibility', shown ? 'visible' : 'hidden');
          c.n.setAttribute('fill', red ? C.red : C.paper);
        }
      }
      // case « une mise » qui grossit
      const hq2 = to == null ? 0 : prog(t, to + 0.1, to + 0.6);
      const hs = 1 + 0.6 * Math.sin(Math.PI * hq2);
      const cx0 = GX + CELL / 2, cy0 = GY + CELL / 2;
      setA(L.top, 'transform', `translate(${f2(cx0)} ${f2(cy0)}) scale(${f2(hs)}) translate(${f2(-cx0)} ${f2(-cy0)})`);
      const sameOn = ts != null && t >= ts + 0.15;
      vis(L.hero, sameOn);
      // étiquette sous la grille
      const afterOne = to != null && t >= to;
      vis(L.l0, tn != null && t >= tn && !arrived && !afterOne);
      vis(L.l1, arrived && !afterOne);
      vis(L.l2, afterOne);
      // quart
      const qq = tq == null ? 0 : prog(t, tq, tq + 0.4);
      const qOn = qq > 0 && !afterOne;
      vis(st.qPath, qOn); setA(st.qClip, 'width', f2(800 * E.out2(qq)));
      const qs = tq == null ? 0 : prog(t, tq + 0.2, tq + 0.45);
      const qsc = qs > 0 && !afterOne ? E.back(qs) : 0;
      put(st.qStk.g, 180, 168, -3, qsc, qsc, qsc > 0 ? 1 : 0);
      // petite
      const sq = to == null ? 0 : prog(t, to + 0.4, to + 0.65);
      const ssc = sq > 0 ? E.back(sq) : 0;
      const sf = tz == null ? 1 : 1 - prog(t, tz, tz + 0.25);
      put(st.small.g, 180, 168, 2, ssc * sf, ssc * sf, sq > 0 && sf > 0 ? 1 : 0);

      /* ---- panneau droit ---- */
      const zq = tz == null ? 0 : E.out3(prog(t, tz, tz + 18 / 30));
      const zs = lerp(SMALL, 1, zq);
      setA(R.grid, 'transform', `translate(${ZC[0]} ${ZC[1]}) scale(${f2(zs)}) translate(${-ZC[0]} ${-ZC[1]})`);
      const rRed = (tb != null && t >= tb) || (ts != null && t >= ts);
      for (let i = 0; i < N; i++) {
        const key = i === 0 && rRed ? 2 : 1;
        if (st.rc[i] !== key) { st.rc[i] = key; R.cells[i].n.setAttribute('fill', key === 2 ? C.red : C.paper); }
      }
      const bp = tb == null ? 0 : prog(t, tb, tb + 0.3);
      const rs = 1 + 1.2 * Math.sin(Math.PI * bp) * (tz != null && t >= tz ? 0 : 1);
      setA(R.top, 'transform', `translate(${f2(cx0)} ${f2(cy0)}) scale(${f2(rs)}) translate(${f2(-cx0)} ${f2(-cy0)})`);
      vis(R.hero, sameOn);
      vis(R.l0, tb != null && t >= tb + 0.1);

      /* ---- sticker d'échelle, « = », bandeau ---- */
      const kq = tz == null ? 0 : prog(t, tz + 0.2, tz + 0.45);
      const ksc = kq > 0 ? E.back(kq) : 0;
      put(st.scale.g, 738, 58, -2, ksc, ksc, kq > 0 ? 1 : 0);
      const eq = ts == null ? 0 : prog(t, ts + 0.1, ts + 0.35);
      const esc = eq > 0 ? E.back(eq) : 0;
      setA(st.eq, 'transform', `translate(960 ${470 - 50}) scale(${f2(esc || 0.0001)}) translate(-960 ${-(470 - 50)})`);
      vis(st.eq, eq > 0);
      const bq = ts == null ? 0 : prog(t, ts + 0.35, ts + 0.65);
      const bsc = bq > 0 ? E.out3(bq) : 0;
      st.band.setAttribute('transform', `translate(0 ${f2(60 * (1 - bsc))})`);
      vis(st.band, bq > 0); setA(st.band, 'opacity', f2(bsc));
    }
  });
})();
;
/* ==== tools/video/composition/components/slot-machine.js ==== */
// Composant `slot-machine` : machine à sous vue de face, plate, 1920×1080, fonction pure du temps.
// Caisson ink bordé paper, fronton à ampoules, 3 rouleaux (flou de mouvement par symboles dupliqués, jamais de filtre), ligne de gain,
// bandeau Mono CRÉDIT / MISE / GAIN, bouton SPIN, levier. Cues : spin, stop1-3, near, fanfare, hand, rapid, dim.
// Aucun dégradé, flou, lueur ni filter. Le gain est un piège (clignotant, creux) ; le compteur de crédits est le témoin sobre.
(() => {
  'use strict';
  const { C, E, clamp, prog, lerp, f2, sv, g, rect, circle, path, line, text, put, shakeAt, sticker, rng, fr } = ZV;
  let UID = 0;
  const SYMS = ['cherry', 'seven', 'bar', 'lemon', 'bell', 'zero'];
  const CELL = 140, RW = 192, NB = 28, MY = 440;
  const COLS = [C.lime, C.paper, C.red];
  const V0 = 11;                                   // cellules par seconde en croisière
  const AA = 0.22, QQ = 0.28;                       // accélération (s), fraction de vitesse à l'impact

  // écrit un attribut seulement s'il change (miroir du DOM, aucun état logique)
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const dec2 = (v) => (Math.round(v * 100) / 100).toFixed(2).replace('.', ',');
  const mod6 = (a) => ((a % 6) + 6) % 6;
  const fixT = (n, s) => { n.textContent = s; };

  /* ---- symboles plats, centrés sur (0,0), cellule 192×140 ---- */
  function drawSym(gg, name) {
    if (name === 'cherry') {
      path(gg, 'M-22 12 Q-18 -30 8 -48', 'none', C.ink, 7);
      path(gg, 'M26 20 Q24 -26 8 -48', 'none', C.ink, 7);
      path(gg, 'M8 -48 Q34 -70 56 -42 Q30 -30 8 -48Z', C.lime, C.ink, 5);
      circle(gg, -24, 24, 25, C.red, C.ink, 6);
      circle(gg, 28, 32, 25, C.red, C.ink, 6);
      circle(gg, -33, 15, 6, C.paper);
      circle(gg, 19, 23, 6, C.paper);
    } else if (name === 'seven') {
      const sh = text(gg, '7', 6, 58, 150, C.ink, { anchor: 'middle' });
      sh.setAttribute('stroke', C.ink); sh.setAttribute('stroke-width', 9); sh.setAttribute('stroke-linejoin', 'round');
      const t7 = text(gg, '7', 0, 52, 150, C.red, { anchor: 'middle' });
      t7.setAttribute('stroke', C.ink); t7.setAttribute('stroke-width', 9); t7.setAttribute('stroke-linejoin', 'round'); t7.setAttribute('paint-order', 'stroke');
    } else if (name === 'bar') {
      rect(gg, -68 + 6, -27 + 7, 136, 54, 8, C.red);
      rect(gg, -68, -27, 136, 54, 8, C.ink, C.ink, 6);
      rect(gg, -60, -19, 120, 38, 4, 'none', C.paper, 3);
      text(gg, 'BAR', 0, 12, 34, C.paper, { anchor: 'middle', len: 92 });
    } else if (name === 'lemon') {
      const lg = g(gg, { transform: 'rotate(-14)' });
      path(lg, 'M-64 0 Q-44 -44 0 -42 Q44 -44 64 0 Q44 44 0 42 Q-44 44 -64 0Z', C.lime, C.ink, 6);
      path(lg, 'M-30 -14 Q-10 -28 16 -26', 'none', C.paper, 6);
      circle(lg, -62, 0, 6, C.ink); circle(lg, 62, 0, 6, C.ink);
    } else if (name === 'bell') {
      path(gg, 'M-48 40 L48 40 C42 22 38 -4 32 -22 C26 -38 12 -44 0 -44 C-12 -44 -26 -38 -32 -22 C-38 -4 -42 22 -48 40Z', C.paper, C.ink, 6);
      path(gg, 'M14 -42 C26 -37 29 -30 32 -22 C38 -4 42 22 48 40 L24 40 C23 10 21 -20 14 -42Z', C.ink);
      path(gg, 'M-48 40 L48 40 C42 22 38 -4 32 -22 C26 -38 12 -44 0 -44 C-12 -44 -26 -38 -32 -22 C-38 -4 -42 22 -48 40Z', 'none', C.ink, 6);
      path(gg, 'M-40 22 L42 22', 'none', C.red, 8);
      circle(gg, 0, -50, 9, C.paper, C.ink, 5);
      circle(gg, 0, 50, 11, C.ink);
    } else {
      circle(gg, 0, 0, 48, C.lime, C.ink, 7);
      text(gg, '0', 0, 26, 78, C.ink, { anchor: 'middle' });
    }
    return gg;
  }

  // main plate : doigt tendu (pointe en (0,0), vers le haut), manche rouge
  function drawHand(parent) {
    const h = g(parent);
    rect(h, -52, 150, 124, 190, 46, C.paper, C.ink, 5);
    for (let k = 0; k < 3; k++) rect(h, 8, 104 + k * 36, 60 - k * 5, 32, 16, C.paper, C.ink, 5);
    path(h, 'M-19 19 A19 19 0 0 1 19 19 L19 206 L-19 206Z', C.paper);
    path(h, 'M-19 206 L-19 19 A19 19 0 0 1 19 19 L19 206', 'none', C.ink, 5);
    const th = g(h, { transform: 'translate(-48 176) rotate(30)' });
    sv('ellipse', { cx: 0, cy: 0, rx: 17, ry: 44, fill: C.paper, stroke: C.ink, 'stroke-width': 5 }, th);
    rect(h, -62, 330, 142, 150, 6, C.red, C.ink, 5);
    rect(h, -62, 352, 142, 16, 0, C.ink);
    return h;
  }

  function cleanSyms(a, fallback) {
    if (!Array.isArray(a) || a.length < 3) return fallback;
    const r = a.slice(0, 3).map((s) => (SYMS.includes(s) ? s : null));
    return r.every(Boolean) ? r : fallback;
  }

  ZV.define('slot-machine', {
    init(root, shot) {
      const p = shot.props || {};
      const beats = Array.isArray(shot.beats) ? shot.beats : [];
      const dur = isNum(shot.dur) && shot.dur > 0 ? shot.dur : 6;
      const cueL = (n) => beats.filter((b) => b && b.do === 'cue' && b.name === n && isNum(b.t)).sort((a, b) => a.t - b.t);
      const uid = ++UID;
      const side = p.side === 'left' || p.side === 'right' ? p.side : 'center';
      const cx = side === 'left' ? 560 : side === 'right' ? 1360 : 950;
      const credit0 = isNum(+p.credit) && p.credit != null ? +p.credit : 100;
      const bet = isNum(+p.bet) && p.bet != null ? +p.bet : 1;
      const reels0 = cleanSyms(p.reels, ['seven', 'bar', 'cherry']);
      const label = typeof p.label === 'string' && p.label ? p.label : 'ZÉRO VERT';
      const st = { uid, cx, dur, lights: p.lights !== false, lever: p.lever !== false, shot, credit0, bet };

      /* ---- fond ---- */
      rect(root, 0, 0, 1920, 1080, 0, C.ink);
      const bgs = g(root, { transform: 'rotate(-18 960 540)' });
      for (let k = -4; k <= 4; k++) rect(bgs, 960 + k * 300 - 70, -600, 140, 2300, 0, C.pocket);

      const defs = sv('defs', null, root);
      SYMS.forEach((n) => drawSym(g(defs, { id: `sm${uid}-${n}` }), n));
      const clip = sv('clipPath', { id: `sm${uid}-clip` }, defs);
      rect(clip, -288, -190, 576, 280, 0, '#000');

      /* ---- machine ---- */
      const m = st.m = g(root);
      st.shadow = rect(m, 20 - 350, 20 - 400, 700, 800, 40, C.lime);
      rect(m, -350, -400, 700, 800, 40, C.ink, C.paper, 8);

      // fronton
      rect(m, -316, -372, 632, 140, 24, C.pocket, C.paper, 5);
      st.label = text(m, label, 0, -279, 66, C.paper, { anchor: 'middle', len: clamp(label.length * 50, 160, 470) });
      st.bulbs = [];
      const PW = 600, PH = 108, PP = 2 * (PW + PH);
      for (let i = 0; i < NB; i++) {
        let s = i * PP / NB, x, y;
        if (s < PW) { x = -300 + s; y = -356; }
        else if (s < PW + PH) { x = 300; y = -356 + (s - PW); }
        else if (s < 2 * PW + PH) { x = 300 - (s - PW - PH); y = -248; }
        else { x = -300; y = -248 - (s - 2 * PW - PH); }
        st.bulbs.push(circle(m, f2(x), f2(y), 9, C.pocket, C.grey, 3));
      }

      // fenêtre des rouleaux
      st.frameFill = rect(m, -304, -204, 608, 308, 14, C.ink);
      const rg = g(m, { 'clip-path': `url(#sm${uid}-clip)` });
      st.reels = [0, 1, 2].map((i) => {
        const gr = g(rg, { transform: `translate(${(i - 1) * RW} -50)` });
        rect(gr, -RW / 2, -140, RW, 280, 0, C.paper);
        line(gr, -RW / 2, 0, RW / 2, 0, C.ink, 12);
        line(gr, -RW / 2, 0, RW / 2, 0, C.red, 6);
        const slots = [];
        for (let k = 0; k < 4; k++) {
          const sg = g(gr);
          const u = [0, 1, 2].map(() => sv('use', { href: `#sm${uid}-cherry` }, sg));
          slots.push({ sg, u });
        }
        return { slots };
      });
      for (const sx of [-96, 96]) rect(rg, sx - 4, -190, 8, 280, 0, C.ink);
      rect(rg, -288, -190, 576, 30, 0, C.ink, null, 0, { opacity: 0.16 });
      rect(rg, -288, 60, 576, 30, 0, C.ink, null, 0, { opacity: 0.16 });
      for (const sg of [-1, 1]) { line(m, sg * 288, -50, sg * 262, -50, C.ink, 14, { 'stroke-linecap': 'butt' }); line(m, sg * 288, -50, sg * 262, -50, C.red, 7, { 'stroke-linecap': 'butt' }); }
      for (const sg of [-1, 1]) path(m, `M${sg * 340} -66 L${sg * 316} -50 L${sg * 340} -34Z`, C.red, C.ink, 4);
      st.frame = rect(m, -304, -204, 608, 308, 14, 'none', C.paper, 6);

      // bandeau CRÉDIT / MISE / GAIN (le crédit est dessiné plus haut dans la pile, voir plus bas)
      const cellBox = (x, lab) => {
        rect(m, x - 94, 130, 188, 92, 10, C.pocket, C.paper, 4);
        text(m, lab, x, 160, 18, C.paper, { anchor: 'middle', mono: true, weight: 700, spacing: 3 }).setAttribute('opacity', 0.7);
      };
      cellBox(-200, 'CRÉDIT'); cellBox(0, 'MISE'); cellBox(200, 'GAIN');
      st.miseT = text(m, '', 0, 207, 42, C.white, { anchor: 'middle', mono: true, weight: 700 });
      st.gainBox = rect(m, 106, 130, 188, 92, 10, C.pocket, C.paper, 4);
      st.gainLab = text(m, 'GAIN', 200, 160, 18, C.paper, { anchor: 'middle', mono: true, weight: 700, spacing: 3 });
      st.gainT = text(m, '', 200, 207, 42, C.white, { anchor: 'middle', mono: true, weight: 700 });
      st.tourT = text(m, '', -200, 326, 30, C.paper, { anchor: 'middle', mono: true, weight: 700 });

      // bouton SPIN
      const bg = g(m, { transform: 'translate(0 318)' });
      circle(bg, 0, 0, 78, C.pocket, C.paper, 5);
      circle(bg, 0, 10, 62, C.ink);
      st.btn = g(bg);
      circle(st.btn, 0, 0, 62, C.red, C.ink, 6);
      path(st.btn, 'M-42 -20 A46 46 0 0 1 -8 -46', 'none', C.paper, 6, { opacity: 0.7 });
      text(st.btn, 'SPIN', 0, 14, 40, C.ink, { anchor: 'middle', len: 98 });

      // levier
      st.leverG = g(m);
      if (st.lever) {
        st.arc = line(st.leverG, 352, 30, 412, -110, C.ink, 24);
        st.arm = line(st.leverG, 352, 30, 412, -110, C.paper, 12);
        circle(st.leverG, 352, 30, 22, C.pocket, C.paper, 5);
        st.knob = g(st.leverG);
        circle(st.knob, 0, 0, 28, C.red, C.ink, 6);
        circle(st.knob, -8, -9, 7, C.paper);
      }

      // extinction : voile ink par-dessus la machine, puis crédit seul allumé
      st.veil = rect(m, -350, -400, 700, 800, 40, C.ink, null, 0, { opacity: 0 });
      st.creditBox = rect(m, -294, 130, 188, 92, 10, C.pocket, C.paper, 4);
      st.creditLab = text(m, 'CRÉDIT', -200, 160, 18, C.paper, { anchor: 'middle', mono: true, weight: 700, spacing: 3 });
      st.creditLab.setAttribute('opacity', 0.7);
      st.creditT = text(m, '', -200, 207, 42, C.white, { anchor: 'middle', mono: true, weight: 700 });
      st.bigG = g(m);
      text(st.bigG, 'CRÉDIT', 0, -150, 34, C.paper, { anchor: 'middle', mono: true, weight: 700, spacing: 8 });
      st.bigT = text(st.bigG, '', 0, -20, 150, C.paper, { anchor: 'middle', mono: true, weight: 800 });

      // étincelles plates
      const rr = rng(4242);
      st.sparks = [];
      for (let i = 0; i < 18; i++) {
        const ang = rr() * Math.PI * 2;
        const n = sv('path', { d: 'M0 -1L0.3 -0.3L1 0L0.3 0.3L0 1L-0.3 0.3L-1 0L-0.3 -0.3Z', fill: COLS[i % 3], stroke: C.ink, 'stroke-width': 3, 'stroke-linejoin': 'round', visibility: 'hidden' }, m);
        n.setAttribute('vector-effect', 'non-scaling-stroke');
        st.sparks.push({ n, dx: Math.cos(ang), dy: Math.sin(ang), sp: 170 + rr() * 260, sz: 22 + rr() * 30, dl: rr() * 0.5, rot: rr() * 90, rv: (rr() - 0.5) * 360 });
      }

      // sticker « PRESQUE ! »
      st.nearG = g(m);
      sticker(st.nearG, 380, 110, C.red, 'PRESQUE !', 64, C.ink, { sh: 10 });

      // main (hors du groupe qui tremble)
      st.hand = drawHand(g(root));
      st.handG = st.hand.parentNode;

      /* ---- repères ---- */
      const fans = cueL('fanfare');
      st.fans = fans;
      st.tn = (cueL('near')[0] || {}).t;
      st.td = (cueL('dim')[0] || {}).t;
      st.th = (cueL('hand')[0] || {}).t;
      st.hasRapid = cueL('rapid').length > 0;
      st.tRapid = st.hasRapid ? cueL('rapid')[0].t : null;

      /* ---- plan des tours : cycles { ts, reel[3] { te, sym, off, r0, V, a, d, J, rest } } ---- */
      const R = rng(777);
      const starts = cueL('spin').map((b) => ({ ts: b.t, rapid: false }));
      if (st.hasRapid) for (let k = 0, tt = st.tRapid; tt < dur - 0.3 && k < 60; k++, tt += 3) starts.push({ ts: tt, rapid: true });
      starts.sort((a, b) => a.ts - b.ts);
      const stopB = [1, 2, 3].map((n) => cueL('stop' + n));
      const nearB = cueL('near');
      const ov = [new Map(), new Map(), new Map()];
      reels0.forEach((s, i) => ov[i].set(0, s));
      const rests = [0, 0, 0];
      const pickRand = () => { const pool = ['cherry', 'bar', 'lemon', 'bell', 'zero', 'seven', 'cherry', 'bar', 'lemon', 'bell']; return pool[Math.floor(R() * pool.length) % pool.length]; };
      st.cycles = starts.map((s, c) => {
        const ts = s.ts, nextTs = c + 1 < starts.length ? starts[c + 1].ts : Infinity;
        const inWin = (b) => b.t > ts + 0.15 && b.t < nextTs;
        const nb = s.rapid ? null : nearB.find(inWin) || null;
        const te = [null, null, null], sym = [null, null, null], user = [false, false, false];
        for (let i = 0; i < 3; i++) {
          if (s.rapid) { te[i] = ts + 1.1 + 0.4 * i; continue; }
          const b = stopB[i].find(inWin);
          if (b) { te[i] = b.t; if (SYMS.includes(b.sym)) { sym[i] = b.sym; user[i] = true; } }
        }
        if (nb) {
          if (te[2] == null) te[2] = nb.t;
          if (te[0] == null) te[0] = Math.max(ts + 0.7, nb.t - 1.1);
          if (te[1] == null) te[1] = Math.max(ts + 0.9, nb.t - 0.55);
          for (let i = 0; i < 3; i++) if (!user[i]) sym[i] = 'seven';
          if (!user[2]) sym[2] = 'seven';
        }
        for (let i = 0; i < 3; i++) {
          if (te[i] == null && nextTs < Infinity) te[i] = Math.max(ts + 0.6, nextTs - 0.12);
          if (te[i] != null && te[i] < ts + 0.4) te[i] = ts + 0.4;
        }
        for (let i = 0; i < 3; i++) if (!sym[i]) sym[i] = pickRand();
        if (!nb && !user.some(Boolean) && sym[0] === sym[1] && sym[1] === sym[2]) sym[2] = sym[2] === 'bar' ? 'cherry' : 'bar';
        const cy = { ts, rapid: s.rapid, near: nb ? nb.t : null, reel: [] };
        for (let i = 0; i < 3; i++) {
          const r0 = rests[i], Rl = { ts, te: te[i], r0, a: AA, sym: sym[i], inf: te[i] == null };
          if (!Rl.inf) {
            const L = te[i] - ts, aa = Math.min(AA, L * 0.3), dd = Math.min(0.42, L * 0.4);
            const K = aa / 2 + (L - aa - dd) + dd * (1 + QQ) / 2;
            const off = nb && i === 2 ? 0.42 : 0;
            const Jf = Math.max(Math.round(r0 + V0 * K + off), Math.ceil(r0 + off + 3));
            Rl.a = aa; Rl.d = dd; Rl.off = off; Rl.J = Jf; Rl.rest = Jf - off; Rl.V = (Rl.rest - r0) / K;
            ov[i].set(Jf, sym[i]); rests[i] = Rl.rest;
          } else { Rl.V = V0; }
          cy.reel.push(Rl);
        }
        return cy;
      });
      st.ov = ov;
      st.perm = [0, 1, 2].map((i) => { const rq = rng(31 + i * 17), a = SYMS.slice(); for (let k = 5; k > 0; k--) { const j = Math.floor(rq() * (k + 1)); const x = a[k]; a[k] = a[j]; a[j] = x; } return a; });
      st.shift = [0, 2, 4];

      /* ---- crédit : événements séquentiels ---- */
      const ev = [];
      st.cycles.forEach((cy) => ev.push({ t0: cy.ts, t1: cy.ts + 0.3, d: -bet }));
      fans.forEach((b) => { if (isNum(+b.credit) && b.credit != null) ev.push({ t0: b.t, t1: b.t + 0.5, abs: +b.credit }); });
      if (st.td != null) {
        const db = cueL('dim')[0];
        ev.push({ t0: st.td + 0.7, t1: Math.max(st.td + 3, dur - 0.2), cap: true, to: isNum(+db.credit_to) && db.credit_to != null ? +db.credit_to : null });
      }
      ev.sort((a, b) => a.t0 - b.t0);
      let cur = credit0, allInt = Number.isInteger(credit0) && Number.isInteger(bet);
      for (const e of ev) {
        e.from = cur;
        if (e.abs != null) e.to = e.abs; else if (e.cap) { if (e.to == null) e.to = Math.max(0, Math.floor(cur * 0.6)); } else e.to = Math.max(0, cur + e.d);
        if (!Number.isInteger(e.to)) allInt = false;
        cur = e.to;
      }
      st.ev = ev; st.dec = !allInt;
      st.miseT.textContent = st.dec ? dec2(bet) : String(bet);
      return st;
    },

    update(st, t, shot) {
      const cy = st.cycles;
      const reelPos = (i, tt) => {
        let c = null;
        for (let k = cy.length - 1; k >= 0; k--) if (tt >= cy[k].ts) { c = cy[k]; break; }
        if (!c) return 0;
        const Rl = c.reel[i], s = tt - Rl.ts, a = Rl.a;
        if (Rl.inf) return Rl.r0 + Rl.V * (s < a ? s * s / (2 * a) : a / 2 + (s - a));
        if (tt >= Rl.te) { const w = tt - Rl.te; return Rl.rest + (w < 0.7 ? 0.2 * Math.exp(-6.5 * w) * Math.sin(2 * Math.PI * 2.3 * w) : 0); }
        const L = Rl.te - Rl.ts, d = Rl.d, V = Rl.V;
        if (s < a) return Rl.r0 + V * s * s / (2 * a);
        if (s < L - d) return Rl.r0 + V * (a / 2 + s - a);
        const w = s - (L - d);
        return Rl.r0 + V * (a / 2 + L - a - d) + V * (w - (1 - QQ) * w * w / (2 * d));
      };
      const symAt = (i, j) => {
        const o = st.ov[i];
        if (o.has(j)) return o.get(j);
        const P = st.perm[i], sh = st.shift[i];
        let s = P[mod6(j + sh)];
        if (o.get(j - 1) === s || o.get(j + 1) === s) s = P[mod6(j + sh + 3)];
        return s;
      };

      const td = st.td, dimmed = td != null && t >= td;
      let fan = null;
      if (!dimmed) for (const b of st.fans) if (b.t <= t) fan = b;
      const tn = st.tn, nearOn = !dimmed && tn != null && t >= tn && t < tn + 2.0;

      /* ---- rouleaux ---- */
      let spinning = false, shx = 0, shy = 0;
      for (let i = 0; i < 3; i++) {
        const r = reelPos(i, t);
        const v = (r - reelPos(i, t - 0.025)) / 0.025;
        if (v > 2) spinning = true;
        const gh = clamp(v * CELL * 0.02, 0, 56);
        const base = Math.floor(r);
        const slots = st.reels[i].slots;
        for (let k = 0; k < 4; k++) {
          const j = base - 1 + k, y = (r - j) * CELL, sl = slots[k];
          const vis = Math.abs(y) < 216;
          setA(sl.sg, 'visibility', vis ? 'visible' : 'hidden');
          if (!vis) continue;
          setA(sl.sg, 'transform', `translate(0 ${f2(y)})`);
          const href = `#sm${st.uid}-${symAt(i, j)}`;
          for (let q = 0; q < 3; q++) setA(sl.u[q], 'href', href);
          const gv = gh > 2.5;
          setA(sl.u[0], 'visibility', gv ? 'visible' : 'hidden'); setA(sl.u[1], 'visibility', gv ? 'visible' : 'hidden');
          if (gv) {
            setA(sl.u[0], 'transform', `translate(0 ${f2(-gh)})`); setA(sl.u[1], 'transform', `translate(0 ${f2(gh)})`);
            setA(sl.u[0], 'opacity', 0.5); setA(sl.u[1], 'opacity', 0.5);
          }
          setA(sl.u[2], 'opacity', gv ? 0.88 : 1);
        }
      }
      // tremblements : impacts des rouleaux, presque, fanfare
      for (const c of cy) {
        if (t < c.ts || t > c.ts + 8) continue;
        for (let i = 0; i < 3; i++) { const Rl = c.reel[i]; if (!Rl.inf) { const s = shakeAt(t, Rl.te, 3, 0.2); shx += s[0]; shy += s[1]; } }
      }
      if (tn != null) { const s = shakeAt(t, tn, 16, 0.55); shx += s[0]; shy += s[1]; }
      if (fan) { const s = shakeAt(t, fan.t, 7, 0.4); shx += s[0]; shy += s[1]; }
      st.m.setAttribute('transform', `translate(${f2(st.cx + shx)} ${f2(MY + shy)})`);

      /* ---- ampoules ---- */
      const nbk = st.bulbs.length;
      for (let i = 0; i < nbk; i++) {
        let on = st.lights, col = COLS[i % 3];
        if (dimmed) on = false;
        else if (fan) { on = true; col = COLS[(i + Math.floor((t - fan.t) * 5)) % 3]; }
        else if (nearOn) { on = true; col = ((i + Math.floor((t - tn) * 5)) & 1) ? C.red : C.lime; }
        else if (spinning) on = st.lights && mod6(i - Math.floor(t * 6)) % 3 === 0;
        const b = st.bulbs[i];
        setA(b, 'fill', on ? col : C.pocket); setA(b, 'stroke', on ? C.ink : C.grey);
      }

      /* ---- fanfare : cadre, fronton, GAIN, étincelles ---- */
      const blink = fan ? Math.floor((t - fan.t) * 2.5) % 2 === 0 : false;
      setA(st.frame, 'stroke', fan ? (blink ? C.lime : C.red) : C.paper);
      setA(st.label, 'fill', fan ? (blink ? C.lime : C.white) : C.paper);
      setA(st.shadow, 'fill', dimmed ? C.pocket : fan && !blink ? C.red : C.lime);
      const winTxt = fan && fan.win != null ? (typeof fan.win === 'string' ? fan.win : (Number.isInteger(+fan.win) ? fr(+fan.win) : dec2(+fan.win))) : '0';
      if (st.gainT.textContent !== winTxt) st.gainT.textContent = winTxt;
      setA(st.gainBox, 'fill', fan ? (blink ? C.lime : C.pocket) : C.pocket);
      setA(st.gainT, 'fill', fan ? (blink ? C.ink : C.lime) : C.white);
      setA(st.gainLab, 'fill', fan && blink ? C.ink : C.paper);
      for (const sp of st.sparks) {
        let s = fan ? (t - fan.t - sp.dl) : -1;
        let q = -1;
        if (s >= 0) { s %= 1.3; q = s / 1.0; }
        if (q < 0 || q >= 1) { setA(sp.n, 'visibility', 'hidden'); continue; }
        const e = E.out3(q), sz = sp.sz * (1 - 0.6 * q);
        setA(sp.n, 'visibility', 'visible');
        sp.n.setAttribute('transform', `translate(${f2(sp.dx * sp.sp * e)} ${f2(-50 + sp.dy * sp.sp * e)}) rotate(${f2(sp.rot + sp.rv * q)}) scale(${f2(sz)})`);
      }

      /* ---- sticker PRESQUE ! ---- */
      if (tn != null) {
        const pp = prog(t, tn, tn + 0.28), po = 1 - E.in2(prog(t, tn + 2.6, tn + 2.85));
        const sc = E.back(pp) * (t > tn + 2.6 ? Math.max(po, 0) : 1);
        put(st.nearG, 200, -212, -7, sc, sc, pp > 0 ? 1 : 0);
      } else put(st.nearG, 200, -212, -7, 0, 0, 0);

      /* ---- crédit, mise, tours ---- */
      let cr = st.credit0;
      for (const e of st.ev) {
        if (t >= e.t1) cr = e.to;
        else { if (t > e.t0) cr = lerp(e.from, e.to, (t - e.t0) / (e.t1 - e.t0)); break; }
      }
      const crT = st.dec ? dec2(cr) : fr(Math.round(cr));
      if (st.creditT.textContent !== crT) st.creditT.textContent = crT;
      if (st.hasRapid) {
        let n = 0; for (const c of cy) if (c.rapid && c.ts <= t) n++;
        const tt = n ? 'TOUR ' + n : '';
        if (st.tourT.textContent !== tt) st.tourT.textContent = tt;
      }

      /* ---- bouton, levier, main ---- */
      let press = 0, pull = 0;
      for (const c of cy) {
        if (t < c.ts) break;
        const s = t - c.ts;
        press = Math.max(press, s < 0.1 ? s / 0.1 : s < 0.35 ? 1 - (s - 0.1) / 0.25 : 0);
        if (s < 0.18) pull = Math.max(pull, E.out2(s / 0.18)); else if (s < 0.6) pull = Math.max(pull, 1 - E.io2((s - 0.18) / 0.42));
      }
      const th = st.th;
      const hp = th == null ? 0 : E.out3(prog(t, th, th + 0.45));
      press = Math.max(press, hp >= 0.97 ? 0.9 : 0);
      setA(st.btn, 'transform', `translate(0 ${f2(8 * press)})`);
      if (st.lever) {
        const kx = lerp(412, 424, pull), ky = lerp(-110, 130, pull);
        for (const n of [st.arc, st.arm]) { n.setAttribute('x2', f2(kx)); n.setAttribute('y2', f2(ky)); }
        const ks = 1 + 0.18 * pull;
        st.knob.setAttribute('transform', `translate(${f2(kx)} ${f2(ky)}) scale(${f2(ks)})`);
      }
      if (th == null || hp <= 0) setA(st.handG, 'visibility', 'hidden');
      else {
        const k = 1 - hp;
        const tx = st.cx + 10 + 150 * k, ty = MY + 318 + 36 + 420 * k + (hp >= 0.97 ? 6 : 0);
        setA(st.handG, 'visibility', 'visible');
        st.hand.setAttribute('transform', `translate(${f2(tx)} ${f2(ty)}) rotate(-12)`);
      }

      /* ---- extinction ---- */
      if (td != null) {
        const pd = E.io3(prog(t, td, td + 0.6)), pb = prog(t, td + 0.5, td + 0.9);
        setA(st.veil, 'opacity', f2(0.95 * pd));
        const showBig = pb > 0;
        setA(st.bigG, 'visibility', showBig ? 'visible' : 'hidden'); setA(st.bigG, 'opacity', f2(pb));
        if (st.bigT.textContent !== crT) st.bigT.textContent = crT;
      } else { setA(st.veil, 'opacity', 0); setA(st.bigG, 'visibility', 'hidden'); }
    }
  });
})();
;
/* ==== tools/video/composition/components/strategy-chart.js ==== */
// Composant `strategy-chart` (épisode 5) : le tableau gratuit de la stratégie de base. Voir EP5-COMPONENTS.md.
// Grille 10 × 10 (mains dures, six paquets) : T tirer (paper), R rester (lime), D doubler (pocket bordé lime). Fonction pure du temps ; aplats seulement.
// Cues : grid, axes, free, ignored, belief, vs7, insurance. Un cue absent = l'étape ne se déclenche pas ; sans cue `grid` / `axes` le tableau est posé d'emblée.
(() => {
  'use strict';
  const { C, E, clamp, prog, lerp, f2, sv, g, rect, circle, path, line, text } = ZV;
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const str = (v, d) => (typeof v === 'string' && v.trim() ? v.trim() : d);
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const vis = (n, on) => setA(n, 'display', on ? 'inline' : 'none');
  const SH = '#2A2A2A';
  const bwEst = (s, size) => { let a = 0; for (const ch of String(s)) a += size * (ch === ' ' ? 0.28 : /[0-9]/.test(ch) ? 0.5 : /[A-ZÀÂÉÈÊÎÔÛÇ€%+×≈]/.test(ch) ? 0.66 : /[.,:;'’!|]/.test(ch) ? 0.3 : 0.56); return a; };
  let PROBE = null; const BWC = {};
  const bw = (s, size) => {
    s = String(s); const k = size + '|' + s;
    if (BWC[k] !== undefined) return BWC[k];
    if (PROBE) { try { PROBE.textContent = s; PROBE.setAttribute('font-size', size); const w = PROBE.getComputedTextLength(); if (w > 0) { BWC[k] = w; return w; } } catch (e) { /* hors DOM */ } }
    return bwEst(s, size);
  };
  const mw = (s, size) => String(s).length * size * 0.6;
  const putc = (n, x, y, r, sx, sy, o) => {
    if (r === undefined) r = 0; if (sx === undefined) sx = 1; if (sy === undefined) sy = sx; if (o === undefined) o = 1;
    const hid = o <= 0.001 || !sx || !sy;
    setA(n, 'display', hid ? 'none' : 'inline');
    if (hid) return;
    setA(n, 'transform', `translate(${f2(x)} ${f2(y)}) rotate(${f2(r)}) scale(${f2(sx)} ${f2(sy)})`);
    setA(n, 'opacity', f2(o));
  };
  const popS = (t, t0, d) => (t0 == null || t < t0 ? 0 : E.back(prog(t, t0, t0 + (d || 0.3))));
  const mlab = (parent, s, x, y, size, fill, anchor, sp) => { const n = text(parent, s, x, y, size, fill, { mono: true, anchor: anchor || 'start', len: f2(mw(s, size) + (sp ? sp * (String(s).length - 1) : 0)) }); if (sp) n.setAttribute('letter-spacing', sp); return n; };
  function mkTag(parent, lines, size, fill, tfill, o) {
    o = o || {};
    const ls = Array.isArray(lines) ? lines : [lines];
    const lh = size * 1.12, px = o.padX || 26, py = o.padY || 14;
    let tw = 0; ls.forEach((s) => { tw = Math.max(tw, bw(s, size)); });
    const w = tw + px * 2, h = ls.length * lh + py * 2 - (lh - size) * 0.2;
    const grp = g(parent);
    const sh = o.sh || 9, r = o.r === undefined ? 14 : o.r;
    rect(grp, -w / 2 + sh, -h / 2 + sh, w, h, r, o.shc || (fill === C.paper ? C.lime : C.paper));
    rect(grp, -w / 2, -h / 2, w, h, r, fill, C.ink, o.sw || 6);
    ls.forEach((s, i) => text(grp, s, 0, -h / 2 + py + size * 0.82 + i * lh, size, tfill, { anchor: 'middle', len: f2(bw(s, size)) }));
    return { g: grp, w, h };
  }
  const parsePct = (s, d) => { const m = /([0-9]+(?:[.,][0-9]+)?)/.exec(String(s)); return m ? parseFloat(m[1].replace(',', '.')) || d : d; };

  const ROWS = ['8 ET −', '9', '10', '11', '12', '13', '14', '15', '16', '17 ET +'];
  const COLS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'A'];
  const DATA = [
    'TTTTTTTTTT', 'TDDDDTTTTT', 'DDDDDDDDTT', 'DDDDDDDDDT', 'TTRRRTTTTT',
    'RRRRRTTTTT', 'RRRRRTTTTT', 'RRRRRTTTTT', 'RRRRRTTTTT', 'RRRRRRRRRR'
  ];
  const CX0 = 310, CY0 = 180, PW = 93, PH = 61, CW = 91, CH = 59;
  const cx = (c) => CX0 + c * PW + CW / 2, cy = (r) => CY0 + r * PH + CH / 2;
  const PIV = [680, 450];

  ZV.define('strategy-chart', {
    init(root, shot) {
      const P = (shot && shot.props) || {};
      const beats = Array.isArray(shot && shot.beats) ? shot.beats : [];
      const dur = isNum(shot && shot.dur) && shot.dur > 0 ? shot.dur : 10;
      const c1 = (n) => { const a = beats.filter((b) => b && b.do === 'cue' && b.name === n && isNum(b.t)).sort((a, b) => a.t - b.t)[0]; return a ? a.t : null; };
      const title = str(P.title, 'LA STRATÉGIE DE BASE');
      const edge = str(P.edge, '≈ 0,5 %');
      const belief = str(P.belief, 'JE NE TIRE JAMAIS SUR 16');
      const insurance = str(P.insurance, '≈ 7,4 %');
      const ratio = str(P.ratio, 'PRÈS DE 15 ×');
      const st = { dur };
      PROBE = text(root, '', 0, -500, 100, 'none'); PROBE.setAttribute('visibility', 'hidden');
      st.T = { grid: c1('grid'), axes: c1('axes'), free: c1('free'), ignored: c1('ignored'), belief: c1('belief'), vs7: c1('vs7'), insurance: c1('insurance') };
      const T = st.T;
      st.pa = parsePct(edge, 0.5); st.pb = parsePct(insurance, 7.4);

      rect(root, 0, 0, 1920, 1080, 0, C.ink);
      const bgs = g(root, { transform: 'rotate(-18 960 540)' });
      for (let k = -4; k <= 4; k++) rect(bgs, 960 + k * 300 - 60, -600, 120, 2300, 0, C.pocket);
      text(root, title, 120, 62, 40, C.paper, { len: f2(bw(title, 40)) });

      /* ---- groupe du tableau (s'incline à `ignored`) ---- */
      st.G = g(root);
      const G = st.G;
      st.cells = [];
      for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) {
        const L = DATA[r][c];
        const n = g(G);
        if (L === 'T') { rect(n, -CW / 2, -CH / 2, CW, CH, 4, C.paper); text(n, 'T', 0, 13, 36, C.ink, { anchor: 'middle', len: f2(bw('T', 36)) }); }
        else if (L === 'R') { rect(n, -CW / 2, -CH / 2, CW, CH, 4, C.lime); text(n, 'R', 0, 13, 36, C.ink, { anchor: 'middle', len: f2(bw('R', 36)) }); }
        else { rect(n, -CW / 2 + 1.5, -CH / 2 + 1.5, CW - 3, CH - 3, 4, C.pocket, C.lime, 3); text(n, 'D', 0, 13, 36, C.lime, { anchor: 'middle', len: f2(bw('D', 36)) }); }
        st.cells.push({ n, r, c, x: cx(c), y: cy(r) });
      }
      st.rh = ROWS.map((s, r) => { const n = text(G, s, 290, cy(r) + 12, 34, C.paper, { mono: true, anchor: 'end', len: f2(mw(s, 34)) }); return n; });
      st.ch = COLS.map((s, c) => { const n = g(G); text(n, s, 0, 0, 34, C.paper, { mono: true, anchor: 'middle', len: f2(mw(s, 34)) }); return n; });
      st.axH = mlab(G, 'CARTE DU CROUPIER', 775, 98, 26, C.paper, 'middle', 4);
      st.axV = g(G); { const t = mlab(st.axV, 'TA MAIN', 0, 0, 26, C.paper, 'middle', 4); }
      st.ring = rect(G, 106, CY0 + 8 * PH - 5, 1138, CH + 10, 28, 'none', C.paper, 6);
      st.col7 = rect(G, CX0 + 5 * PW - 4, 104, CW + 8, 692, 8, 'none', C.lime, 6);
      st.veil = rect(G, 40, 90, 1220, 716, 0, C.ink);
      st.ignTag = mkTag(root, 'PRESQUE PERSONNE NE LE SUIT', 46, C.paper, C.ink, { sh: 9 });

      /* ---- panneau de droite ---- */
      st.legend = g(root);
      [['T', C.paper, 'TIRER', null], ['R', C.lime, 'RESTER', null], ['D', C.pocket, 'DOUBLER', C.lime]].forEach((o, i) => {
        const y = 262 + i * 50;
        rect(st.legend, 1400, y, 44, 40, 4, o[1], o[3] || C.ink, o[3] ? 3 : 4);
        text(st.legend, o[2], 1462, y + 33, 40, C.paper, { len: f2(bw(o[2], 40)) });
      });
      mlab(st.legend, '+ SÉPARER : TABLEAU DES PAIRES', 1400, 424, 22, C.paper);
      st.grat = mkTag(root, 'GRATUIT', 48, C.lime, C.ink, { sh: 9 });
      st.card = g(root);
      rect(st.card, 1350, 566, 490, 230, 14, C.lime);
      rect(st.card, 1340, 556, 490, 230, 14, C.paper, C.ink, 7);
      mlab(st.card, 'AVANTAGE MAISON', 1372, 608, 28, C.ink);
      st.edgeT = text(st.card, edge, 1372, 748, 120, C.red, { len: f2(Math.min(bw(edge, 120), 430)) });

      st.bubble = g(root);
      {
        const ls = bw(belief, 44) > 430 ? (() => { const w = belief.split(' '); let best = null; for (let k = 1; k < w.length; k++) { const a = w.slice(0, k).join(' '), b = w.slice(k).join(' '); const m = Math.max(bw(a, 44), bw(b, 44)); if (!best || m < best.m) best = { a, b, m }; } return best ? [best.a, best.b] : [belief]; })() : [belief];
        const w = 500, h = ls.length * 52 + 36;
        const x0 = 1830 - w, y0 = 100;
        path(st.bubble, `M${x0 + 16} ${y0 + h - 4} L${x0 + 56} ${y0 + h - 4} L1250 690 Z`, C.paper, C.ink, 8);
        rect(st.bubble, x0 + 10, y0 + 10, w, h, 18, SH);
        rect(st.bubble, x0, y0, w, h, 18, C.paper, C.ink, 8);
        // le recouvrement du trait de la queue sur la bulle
        rect(st.bubble, x0 + 12, y0 + h - 8, 48, 14, 0, C.paper);
        ls.forEach((s, i) => text(st.bubble, s, x0 + w / 2, y0 + 52 + i * 52, 44, C.ink, { anchor: 'middle', len: f2(bw(s, 44)) }));
        st.bubStrike = line(st.bubble, x0 + 16, y0 + h / 2 + 4, x0 + w - 16, y0 + h / 2 - 12, C.red, 12);
        st.bubStrike.setAttribute('stroke-linecap', 'butt');
        st.bubW = w; st.bubH = h;
      }

      /* ---- zoom 16 × 7 ---- */
      st.zoom = g(root);
      rect(st.zoom, -125 + 10, -78 + 10, 250, 156, 10, SH);
      rect(st.zoom, -125, -78, 250, 156, 10, C.paper, C.ink, 8);
      text(st.zoom, 'T', 0, 18, 100, C.ink, { anchor: 'middle', len: f2(bw('T', 100)) });
      mlab(st.zoom, 'TIRER', 0, 62, 34, C.ink, 'middle');

      /* ---- panneau assurance ---- */
      st.ins = g(root);
      rect(st.ins, 1310, 130, 540, 600, 12, SH);
      rect(st.ins, 1300, 120, 540, 600, 12, C.paper, C.ink, 8);
      text(st.ins, 'ASSURANCE', 1340, 196, 64, C.ink, { len: f2(bw('ASSURANCE', 64)) });
      const SC = 420 / Math.max(st.pa, st.pb);
      const rows = [[edge, 'LA STRATÉGIE DE BASE', st.pa, 215], [insurance, 'L\'ASSURANCE', st.pb, 490]];
      st.insBars = rows.map((r) => {
        const y0 = r[3];
        text(st.ins, r[0], 1340, y0 + 60, 64, C.red, { len: f2(Math.min(bw(r[0], 64), 440)) });
        mlab(st.ins, r[1], 1340, y0 + 92, 22, C.ink);
        const w = Math.max(14, r[2] * SC);
        rect(st.ins, 1340, y0 + 112, 440, 46, 4, 'none', C.ink, 3);
        const b = rect(st.ins, 1340, y0 + 112, w, 46, 4, C.red, C.ink, 5);
        return { b, w };
      });
      st.insTag = mkTag(st.ins, ratio, 44, C.lime, C.ink, { sh: 8 });
      st.insTag.g.setAttribute('transform', 'translate(1570 438) rotate(-3)');
      PROBE.parentNode.removeChild(PROBE); PROBE = null;
      return st;
    },

    update(st, t) {
      try {
        t = clamp(t, 0, st.dur + 1);
        const T = st.T;
        const noGrid = T.grid == null, noAx = T.axes == null;

        /* grille : vague diagonale depuis le coin haut gauche (1,2 s, back-ease) */
        for (const c of st.cells) {
          let s = 1;
          if (!noGrid) { const t0 = T.grid + ((c.r + c.c) / 18) * 0.85; s = t < t0 ? 0 : E.back(prog(t, t0, t0 + 0.35)); }
          putc(c.n, c.x, c.y, 0, s, s, s > 0 ? 1 : 0);
        }
        st.rh.forEach((n, r) => { const p = noGrid ? 1 : E.out3(prog(t, T.grid + r * 0.07, T.grid + r * 0.07 + 0.3)); setA(n, 'opacity', f2(p)); vis(n, p > 0.001); });
        st.ch.forEach((n, c) => { const p = noGrid ? 1 : E.out3(prog(t, T.grid + c * 0.07, T.grid + c * 0.07 + 0.3)); putc(n, cx(c), 160 + (1 - p) * 20, 0, 1, 1, p); });
        // axes + légende
        const pa = noAx ? 1 : E.out3(prog(t, T.axes, T.axes + 0.4));
        setA(st.axH, 'opacity', f2(pa)); vis(st.axH, pa > 0.001);
        putc(st.axV, 78, 485, -90, 1, 1, pa);
        const lg = noAx ? 1 : E.out3(prog(t, T.axes + 0.2, T.axes + 0.6));
        const insOn = T.insurance != null && t >= T.insurance + 0.1;
        putc(st.legend, 0, 0, 0, 1, 1, insOn ? 0 : lg);
        setA(st.legend, 'transform', `translate(${f2((1 - lg) * 60)} 0)`);

        /* free */
        const fg = T.free;
        putc(st.grat.g, 1500, 494, -4, popS(t, fg), popS(t, fg), fg != null && t >= fg && !insOn ? 1 : 0);
        const fc = fg == null ? 0 : E.back(prog(t, fg + 0.45, fg + 0.85));
        putc(st.card, 0, 0, 0, 1, 1, fg != null && t >= fg + 0.45 && !insOn ? 1 : 0);
        setA(st.card, 'transform', `translate(0 ${f2((1 - Math.min(1, fc)) * 60)})`);

        /* ignored : voile + inclinaison, relevés au cue suivant */
        let tEnd = null;
        if (T.ignored != null) for (const k of ['belief', 'vs7', 'insurance']) if (T[k] != null && T[k] > T.ignored && (tEnd == null || T[k] < tEnd)) tEnd = T[k];
        let ign = 0;
        if (T.ignored != null && t >= T.ignored) ign = tEnd != null && t >= tEnd ? 1 - E.io2(prog(t, tEnd, tEnd + 0.35)) : E.out3(prog(t, T.ignored, T.ignored + 0.4));
        setA(st.G, 'transform', `rotate(${f2(-4 * ign)} ${PIV[0]} ${PIV[1]})`);
        setA(st.veil, 'opacity', f2(0.62 * ign)); vis(st.veil, ign > 0.001);
        const igT = T.ignored != null && t >= T.ignored + 0.15 ? clamp(ign * 1.2) : 0;
        putc(st.ignTag.g, PIV[0], PIV[1], -2, popS(t, T.ignored == null ? null : T.ignored + 0.15) * (tEnd != null && t >= tEnd ? 1 - prog(t, tEnd, tEnd + 0.2) : 1), undefined, igT > 0 ? 1 : 0);

        /* belief : la ligne 16 cerclée, bulle en haut à droite */
        const tb = T.belief;
        const bOn = tb != null && t >= tb && !insOn;
        const rp = tb == null ? 0 : E.out3(prog(t, tb, tb + 0.4));
        vis(st.ring, rp > 0.001);
        if (rp > 0.001) { setA(st.ring, 'stroke-dasharray', `${f2(2400 * rp)} 3000`); }
        const bp = popS(t, tb == null ? null : tb + 0.25);
        putc(st.bubble, 0, 0, 0, 1, 1, bOn && bp > 0 ? 1 : 0);
        if (bOn) setA(st.bubble, 'transform', `translate(${f2((1 - Math.min(1, bp)) * 40)} 0)`);
        const bs = T.vs7 == null ? 0 : prog(t, T.vs7 + 0.7, T.vs7 + 1.0);
        vis(st.bubStrike, bs > 0.001);
        if (bs > 0.001) setA(st.bubStrike, 'stroke-dasharray', `${f2(bs * 520)} 600`);

        /* vs7 : colonne 7 surlignée, cellule 16 × 7 agrandie */
        const t7 = T.vs7;
        const cp = t7 == null ? 0 : E.out3(prog(t, t7, t7 + 0.4));
        vis(st.col7, cp > 0.001);
        if (cp > 0.001) { setA(st.col7, 'stroke-dasharray', `${f2(1500 * cp)} 3000`); }
        const zp = t7 == null ? 0 : E.back(prog(t, t7 + 0.4, t7 + 0.85));
        const zs = lerp(0.4167, 1, Math.min(1, zp));
        // la cellule zoomée vit dans le repère du tableau (le tableau est à plat à ce moment-là)
        putc(st.zoom, cx(5), cy(8), 0, zs, zs, t7 != null && t >= t7 + 0.4 ? 1 : 0);

        /* assurance */
        const ti = T.insurance;
        const ip = ti == null ? 0 : E.out3(prog(t, ti, ti + 0.45));
        vis(st.ins, ip > 0.001);
        if (ip > 0.001) {
          setA(st.ins, 'transform', `translate(${f2((1 - ip) * 620)} 0)`);
          st.insBars.forEach((b, i) => { const q = E.out3(prog(t, ti + 0.5 + i * 0.5, ti + 1.0 + i * 0.5)); setA(b.b, 'width', f2(Math.max(0.01, b.w * q))); vis(b.b, q > 0.001); });
          const sp = popS(t, ti + 1.0);
          putc(st.insTag.g, 1570, 438, -3, sp, sp, sp > 0 ? 1 : 0);
        }
      } catch (e) { /* jamais d'exception */ }
    }
  });
})();
;
/* ==== tools/video/composition/components/streak-board.js ==== */
// Composant « streak-board » : la série des 26 noirs (2 rangées de 13 tuiles), gros compteur lime, bulles de la salle,
// panneau « PROCHAIN TOUR : 18/37 ROUGE » qui ne change jamais, tuile « ? », répartition fantôme 50/50, flèche « RATTRAPER ? ».
// Fonction pure du temps ; les flips suivent les repères `flip` / `run`, sinon ils s'accélèrent (puissance 1.7).
(() => {
  'use strict';
  const { C, E, clamp, prog, lerp, f2, sv, g, rect, circle, text, put } = ZV;
  const N = 26, PER = 13, TS = 100, PITCH = 124, GX = 216, ROW_Y = [420, 550];
  const FLIP = 0.3;
  const tilePos = (i) => [GX + (i % PER) * PITCH, ROW_Y[Math.floor(i / PER)]];

  ZV.define('streak-board', {
    init(root, shot) {
      const p = shot.props || {};
      const cue = (n) => ZV.cue(shot, n);
      const st = { p, dur: shot.dur };
      rect(root, 0, 0, 1920, 1080, 0, C.ink);
      const startAt = clamp(Math.round(p.start_at || 0), 0, N), flipTo = clamp(Math.round(p.flip_to == null ? startAt : p.flip_to), startAt, N);
      st.startAt = startAt; st.flipTo = flipTo;

      /* ---- calendrier des flips ---- */
      const ft = new Array(N).fill(1e9);
      for (let i = 0; i < startAt; i++) ft[i] = -10;
      let idx = startAt;
      const flipCues = ZV.cues(shot, 'flip').map((b) => b.t);
      const runs = ZV.cues(shot, 'run');
      const tCount = cue('count'), tGhost = cue('ghost');
      for (const t of flipCues) if (idx < flipTo) ft[idx++] = t;
      runs.forEach((r, k) => {
        const to = clamp(Math.round(r.to == null ? flipTo : r.to), idx, flipTo);
        let end = shot.dur - 0.3;
        if (runs[k + 1]) end = Math.min(end, runs[k + 1].t - 0.1);
        if (tCount != null && tCount > r.t + 0.3) end = Math.min(end, tCount - 0.12);
        if (tGhost != null && tGhost > r.t + 0.4) end = Math.min(end, tGhost - 0.12);
        end = Math.max(end, r.t + 0.45);
        const n = to - idx;
        for (let j = 0; j < n; j++) { const x = n > 1 ? j / (n - 1) : 0; ft[idx + j] = r.t + Math.max(0, end - r.t - FLIP) * (1 - Math.pow(1 - x, 1.7)); }
        idx = to;
      });
      if (!flipCues.length && !runs.length && flipTo > idx) {
        const n = flipTo - idx;
        for (let j = 0; j < n; j++) { const x = n > 1 ? j / (n - 1) : 0; ft[idx + j] = 0.3 + (shot.dur - 0.9) * (1 - Math.pow(1 - x, 1.7)); }
      }
      st.ft = ft;

      /* ---- côté du compteur : on évite les stickers du noyau ---- */
      const stk = shot.beats.filter((b) => b.do === 'sticker');
      let side = 'right';
      if (stk.some((b) => b.x < 700)) side = 'right';
      else if (stk.some((b) => b.x > 1100 && b.y < 330)) side = 'left';
      if (p.arrow) side = 'left';
      st.side = side;
      st.popIn = startAt === 0 || shot.in !== 'cut';

      /* ---- tuiles ---- */
      st.tiles = [];
      for (let i = 0; i < N; i++) {
        const [x, y] = tilePos(i);
        const gt = g(root);
        const empty = rect(gt, -TS / 2, -TS / 2, TS, TS, 16, 'none', C.paper, 5, { 'stroke-dasharray': '9 10', opacity: 0.6 });
        const full = g(gt);
        rect(full, -TS / 2 + 8, -TS / 2 + 8, TS, TS, 16, C.ink);
        rect(full, -TS / 2, -TS / 2, TS, TS, 16, C.pocket, C.paper, 5);
        text(full, String(i + 1), 0, 14, 42, C.white, { anchor: 'middle', mono: true });
        st.tiles.push({ gt, empty, full, x, y });
      }

      /* ---- compteur ---- */
      const cx = side === 'right' ? 1754 : 166, anch = side === 'right' ? 'end' : 'start';
      st.lab = text(root, 'NOIRS D’AFFILÉE', cx, 108, 36, C.paper, { mono: true, anchor: anch });
      st.countG = g(root);
      st.count = text(st.countG, '0', 0, 0, 215, C.lime, { anchor: anch });
      st.cx = cx; st.anch = anch;
      st.tCount = tCount;

      /* ---- bulles de la salle ---- */
      st.bubbles = [];
      (Array.isArray(p.bubbles) ? p.bubbles : []).forEach((b, k) => {
        const t0 = cue(b.cue);
        const size = 46 + 14 * k, len = Math.round(String(b.text).length * size * 0.6);
        const w = len + 80, h = size * 1.5 + 30;
        const bg = g(root);
        const inner = g(bg);
        rect(inner, -w / 2 + 12, -h / 2 + 12, w, h, 30, C.ink);
        rect(inner, -w / 2, -h / 2, w, h, 30, C.paper, C.ink, 7);
        text(inner, b.text, 0, size * 0.36, size, C.ink, { anchor: 'middle', len });
        if (k === 0) {
          circle(bg, -w / 2 + 70, h / 2 + 30, 13, C.paper, C.ink, 5);
          circle(bg, -w / 2 + 92, h / 2 + 58, 8, C.paper, C.ink, 5);
        }
        st.bubbles.push({ bg, w, h, t0: t0 == null ? 1e9 : t0, k, tilt: k % 2 ? 2.5 : -3 });
      });

      /* ---- date (si le noyau ne dessine pas déjà le sticker) ---- */
      st.date = null;
      if (p.date && !stk.some((b) => String(b.text).toUpperCase() === String(p.date).toUpperCase())) {
        const dg = g(root); const inner = g(dg);
        const len = Math.round(String(p.date).length * 44 * 0.6), w = len + 70;
        rect(inner, -w / 2 + 10, -42 + 10, w, 84, 18, C.ink);
        rect(inner, -w / 2, -42, w, 84, 18, C.paper, C.ink, 6);
        text(inner, p.date, 0, 15, 44, C.ink, { anchor: 'middle', len });
        st.date = dg;
      }

      /* ---- panneau « prochain tour » ---- */
      st.panel = null;
      if (p.panel) {
        const pg = g(root), inner = g(pg);
        const text0 = p.panel_text || 'PROCHAIN TOUR : 18/37 ROUGE';
        const len = Math.min(1080, Math.round(text0.length * 62 * 0.58)), w = len + 250, h = 128;
        rect(inner, -w / 2 + 12, -h / 2 + 12, w, h, 28, C.ink);
        rect(inner, -w / 2, -h / 2, w, h, 28, C.paper, C.ink, 7);
        const tile = g(inner, { transform: `translate(${-w / 2 + 92} 0)` });
        rect(tile, -44, -44, 88, 88, 14, C.pocket, C.ink, 6);
        text(tile, '?', 0, 20, 62, C.white, { anchor: 'middle', mono: true });
        text(inner, text0, -w / 2 + 170 + len / 2, 22, 62, C.ink, { anchor: 'middle', len });
        st.panel = { pg, w, y: 722 };
        st.tPulse = ZV.cues(shot, 'panel-pulse').map((b) => b.t);
      }

      /* ---- fantôme moitié-moitié ---- */
      st.ghost = null;
      if (p.ghost) {
        const n = Math.max(2, flipTo || 6), half = Math.ceil(n / 2);
        const gg = g(root), items = [];
        for (let i = 0; i < n; i++) {
          const x = GX + i * PITCH, y = 720;
          const red = i < half;
          const gt = g(gg);
          rect(gt, -TS / 2, -TS / 2, TS, TS, 16, 'none', red ? C.red : C.paper, 9);
          if (red) rect(gt, -TS / 2 + 14, -TS / 2 + 14, TS - 28, TS - 28, 8, C.red, null, 0, { opacity: 0.25 });
          items.push({ gt, x, y });
        }
        const lab = text(gg, 'ATTENDU : MOITIÉ-MOITIÉ', GX - TS / 2, 640, 34, C.paper, { mono: true });
        const pl = g(root), inner = g(pl);
        const txt = `${n - half} / ${half}`;
        rect(inner, -120 + 10, -48 + 10, 240, 96, 20, C.ink);
        rect(inner, -120, -48, 240, 96, 20, C.lime, C.ink, 6);
        text(inner, txt, 0, 24, 64, C.ink, { anchor: 'middle', mono: true });
        st.ghost = { items, lab, pl, t0: tGhost == null ? 0.2 : tGhost, px: GX + (n - 1) * PITCH + 230, py: 720 };
      }

      /* ---- flèche « RATTRAPER ? » ---- */
      st.arrow = null;
      if (p.arrow) {
        const t0 = cue('arrow');
        const ag = g(root), shaft = g(ag);
        const len = 330;
        rect(shaft, 0, -22, len - 60, 44, 8, C.red, C.ink, 7);
        sv('path', { d: `M${len - 70} -62L${len + 10} 0L${len - 70} 62Z`, fill: C.red, stroke: C.ink, 'stroke-width': 7, 'stroke-linejoin': 'round' }, shaft);
        const pl = g(root), inner = g(pl);
        const w = Math.round(String(p.arrow).length * 56 * 0.6) + 80;
        rect(inner, -w / 2 + 10, -52 + 10, w, 104, 22, C.ink);
        rect(inner, -w / 2, -52, w, 104, 22, C.red, C.ink, 6);
        text(inner, p.arrow, 0, 20, 56, C.ink, { anchor: 'middle', len: w - 80 });
        const [lx, ly] = tilePos(Math.min(flipTo, N - 1));
        st.arrow = { shaft, pl, t0: t0 == null ? 0.5 : t0, x: Math.min(lx - 40, 1480), y: ly };
      }
      return st;
    },

    update(st, t, shot) {
      const { ft } = st;
      let n = 0, lf = -9;
      const pop = (i) => (st.popIn ? E.back(prog(t, 0.05 + i * 0.02, 0.05 + i * 0.02 + 0.3)) : 1);
      for (let i = 0; i < N; i++) {
        const o = st.tiles[i];
        const pin = pop(i);
        const f = ft[i];
        const pf = prog(t, f, f + FLIP);
        if (t >= f + FLIP) { n++; if (f + FLIP > lf) lf = f + FLIP; }
        else if (f <= t) { /* en cours de retournement : pas encore compté */ }
        const sx = pf > 0 && pf < 1 ? Math.max(Math.abs(Math.cos(pf * Math.PI)), 0.001) : 1;
        o.empty.setAttribute('visibility', pf < 0.5 ? 'visible' : 'hidden');
        o.full.setAttribute('visibility', pf >= 0.5 ? 'visible' : 'hidden');
        const sc = Math.max(pin, 0);
        put(o.gt, o.x, o.y, 0, sc * sx, sc * (1 + 0.1 * Math.sin(pf * Math.PI)), clamp(pin * 4));
      }
      /* ---- compteur : « tape » à chaque flip, claque sur « count » ---- */
      let bump = lf > -9 ? 1 + 0.07 * (1 - prog(t, lf, lf + 0.16)) : 1;
      let hot = false;
      if (st.tCount != null && t >= st.tCount) { const q = prog(t, st.tCount, st.tCount + 0.28); bump = lerp(1.5, 1, E.out3(q)); hot = q < 1; }
      st.count.textContent = String(n);
      st.count.setAttribute('fill', hot ? C.paper : C.lime);
      st.countG.setAttribute('transform', `translate(${st.cx} 322) scale(${f2(bump)})`);
      const lp = E.back(prog(t, 0.05, 0.35));
      st.lab.setAttribute('opacity', f2(clamp(lp * 3)));

      /* ---- bulles : elles s'empilent à gauche et grossissent ---- */
      let by = 300;
      for (const b of st.bubbles) {
        const q = prog(t, b.t0, b.t0 + 0.32);
        const sc = q > 0 ? E.back(q) : 0;
        const cy = by - b.h / 2;
        put(b.bg, 150 + b.w / 2, cy - 14 * (1 - E.out3(q)), b.tilt, sc, sc, q > 0 ? 1 : 0);
        by = cy - b.h / 2 - 22;
      }
      /* ---- date ---- */
      if (st.date) { const q = E.back(prog(t, 0.2, 0.5)); put(st.date, 330, 170, -3, q, q, q > 0 ? 1 : 0); }

      /* ---- panneau : il ne change jamais, il pulse ---- */
      if (st.panel) {
        const pin = st.popIn ? E.back(prog(t, 0.3, 0.7)) : 1;
        let pulse = lf > -9 ? 0.07 * (1 - prog(t, lf, lf + 0.2)) : 0;
        for (const tp of st.tPulse) if (t >= tp) pulse = Math.max(pulse, 0.1 * (1 - prog(t, tp, tp + 0.24)));
        const sc = Math.max(pin, 0) * (1 + pulse);
        put(st.panel.pg, 960, st.panel.y + (1 - Math.min(pin, 1)) * 160, 0, sc, sc, clamp(pin * 4));
      }
      /* ---- fantôme ---- */
      if (st.ghost) {
        const gh = st.ghost;
        gh.items.forEach((it, i) => { const q = prog(t, gh.t0 + i * 0.045, gh.t0 + i * 0.045 + 0.3); const s = q > 0 ? E.back(q) : 0; put(it.gt, it.x, it.y, 0, s, s, q > 0 ? 1 : 0); });
        gh.lab.setAttribute('visibility', t >= gh.t0 ? 'visible' : 'hidden');
        const q = prog(t, gh.t0 + 0.25, gh.t0 + 0.6);
        put(gh.pl, Math.min(gh.px, 1740), gh.py, 3, E.back(q) || 0.0001, E.back(q) || 0.0001, q > 0 ? 1 : 0);
      }
      /* ---- flèche ---- */
      if (st.arrow) {
        const a = st.arrow, q = prog(t, a.t0, a.t0 + 0.3), qs = prog(t, a.t0 + 0.2, a.t0 + 0.5);
        put(a.shaft, a.x, a.y, 0, Math.max(E.out3(q), 0.0001), 1, q > 0 ? 1 : 0);
        put(a.pl, a.x + 175, a.y - 118, -3, E.back(qs) || 0.0001, E.back(qs) || 0.0001, qs > 0 ? 1 : 0);
      }
    }
  });
})();
;
/* ==== tools/video/composition/components/tick-grid.js ==== */
// Composant `tick-grid` : « un tour toutes les 3 secondes ». Anneau-minuteur de 3 s + point qui s'allume, puis grille de 1 200 carrés (60 × 20, 22 px) qui se remplit.
// Cues : tick, minute, hour, hand, no-pause. Fond paper. Aucun dégradé, flou, lueur ni filter ; remplissage = progression (rien ne clignote).
(() => {
  'use strict';
  const { C, E, clamp, prog, lerp, f2, sv, g, rect, circle, path, line, text, put, sticker, shakeAt } = ZV;
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const NB = ' ';
  const COLS = 60, ROWS = 20, PITCH = 22, SZ = 17, GX = 300, GY = 300, N = COLS * ROWS;
  const RR = 190;
  const pad5 = (n) => { const s = String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, NB); return NB.repeat(Math.max(0, 5 - s.length)) + s; };
  const dsec = (v) => (Math.round(v * 10) / 10).toFixed(1).replace('.', ',');

  function drawHand(parent) {
    const h = g(parent);
    rect(h, -52, 150, 124, 190, 46, C.paper, C.ink, 5);
    for (let k = 0; k < 3; k++) rect(h, 8, 104 + k * 36, 60 - k * 5, 32, 16, C.paper, C.ink, 5);
    path(h, 'M-19 19 A19 19 0 0 1 19 19 L19 206 L-19 206Z', C.paper);
    path(h, 'M-19 206 L-19 19 A19 19 0 0 1 19 19 L19 206', 'none', C.ink, 5);
    const th = g(h, { transform: 'translate(-48 176) rotate(30)' });
    sv('ellipse', { cx: 0, cy: 0, rx: 17, ry: 44, fill: C.paper, stroke: C.ink, 'stroke-width': 5 }, th);
    rect(h, -62, 330, 142, 150, 6, C.red, C.ink, 5);
    rect(h, -62, 352, 142, 16, 0, C.ink);
    return h;
  }

  ZV.define('tick-grid', {
    init(root, shot) {
      const p = shot.props || {};
      const beats = Array.isArray(shot.beats) ? shot.beats : [];
      const dur = isNum(shot.dur) && shot.dur > 0 ? shot.dur : 8;
      const cueL = (n) => beats.filter((b) => b && b.do === 'cue' && b.name === n && isNum(b.t)).sort((a, b) => a.t - b.t);
      const period = isNum(+p.period) && p.period != null && +p.period > 0 ? +p.period : 3;
      const perMin = isNum(+p.per_minute) && p.per_minute != null && +p.per_minute > 0 ? Math.round(+p.per_minute) : 20;
      const perHour = isNum(+p.per_hour) && p.per_hour != null && +p.per_hour > 0 ? Math.round(+p.per_hour) : 1200;
      const accent = p.accent === 'red' ? C.red : C.lime;
      const st = { dur, period, perMin, perHour: Math.min(perHour, N), accent, dKey: -1 };

      rect(root, 0, 0, 1920, 1080, 0, C.paper);

      /* ---- grille : 1 200 carrés, remplissage colonne par colonne (1 colonne = 1 minute) ---- */
      st.gridG = g(root);
      st.cells = [];
      for (let i = 0; i < N; i++) {
        const c = Math.floor(i / ROWS), r = i % ROWS;
        st.cells.push({ n: rect(st.gridG, GX + c * PITCH + 2.5, GY + r * PITCH + 2.5, SZ, SZ, 3, C.ink, null, 0, { opacity: 0.12 }), s: 0 });
      }
      st.curN = 0;

      /* ---- compteur (plaque) ---- */
      st.plate = g(root);
      rect(st.plate, -410 + 12, -70 + 12, 820, 140, 16, C.ink);
      rect(st.plate, -410, -70, 820, 140, 16, accent, C.ink, 6);
      st.cnt = text(st.plate, '', -330, 34, 96, C.ink, { mono: true, weight: 800 });

      /* ---- anneau ---- */
      st.ringG = g(root);
      circle(st.ringG, 0, 0, RR, 'none', C.ink, 48);
      circle(st.ringG, 0, 0, RR, 'none', C.paper, 34);
      st.arc = sv('circle', { cx: 0, cy: 0, r: RR, fill: 'none', stroke: accent, 'stroke-width': 34, pathLength: 1, transform: 'rotate(-90)', 'stroke-dasharray': '0 1.01' }, st.ringG);
      st.dot = g(st.ringG, { transform: `translate(0 ${-RR})` });
      st.dotC = circle(st.dot, 0, 0, 22, C.paper, C.ink, 7);
      st.clock = text(st.ringG, '3 s', 0, 32, 92, C.ink, { anchor: 'middle', mono: true, weight: 800 });
      st.mini = [];
      for (let i = 0; i < 8; i++) st.mini.push(circle(st.ringG, (i - 3.5) * 36, RR + 78, 13, C.paper, C.ink, 5));
      st.stk = g(root);
      sticker(st.stk, 150, 80, accent, '3 s', 50, C.ink, { sh: 8 });

      /* ---- no-pause, bouton, main ---- */
      st.labels = ['CROUPIER', 'BILLE', 'PAUSE'].map((lab) => {
        const gg = g(root);
        sticker(gg, 330, 78, C.white, lab, 44, C.ink, { sh: 9, r: 12 });
        const k0 = sv('line', { x1: -170, y1: 8, x2: 170, y2: -8, stroke: C.ink, 'stroke-width': 13, 'stroke-linecap': 'round' }, gg);
        const k1 = sv('line', { x1: -170, y1: 8, x2: 170, y2: -8, stroke: C.red, 'stroke-width': 6, 'stroke-linecap': 'round' }, gg);
        return { gg, k0, k1 };
      });
      st.btn = g(root, { transform: 'translate(1760 770)' });
      circle(st.btn, 0, 0, 74, C.paper, C.ink, 6);
      circle(st.btn, 0, 10, 56, C.ink);
      st.btnTop = g(st.btn);
      circle(st.btnTop, 0, 0, 56, C.red, C.ink, 6);
      text(st.btnTop, 'SPIN', 0, 13, 36, C.ink, { anchor: 'middle', len: 88 });
      st.handG = g(root);
      st.hand = drawHand(st.handG);

      /* ---- repères ---- */
      const ticks = cueL('tick').map((b) => b.t);
      const tm = (cueL('minute')[0] || {}).t, thh = (cueL('hour')[0] || {}).t, tnp = (cueL('no-pause')[0] || {}).t, thand = (cueL('hand')[0] || {}).t;
      st.tm = tm; st.th = thh; st.tnp = tnp; st.thand = thand;
      st.tg = tm != null && thh != null ? Math.min(tm, thh) : tm != null ? tm : thh;
      st.laps = ticks.map((t0, i) => {
        const bound = i + 1 < ticks.length ? ticks[i + 1] : dur;
        const fd = bound - t0 >= period + 0.3 ? period : Math.max(0.8, bound - t0 - 0.3);
        return { t0, fd };
      });
      st.hourD = clamp(dur - (thh == null ? 0 : thh) - 0.8, 1.2, 3.2);
      st.base = tm != null ? perMin : 0;
      st.lblY = st.tg != null && tnp != null && tnp >= st.tg ? 785 : 770;
      return st;
    },

    update(st, t) {
      const { tm, th, tg, tnp, thand } = st;
      /* ---- grille visible à partir de tg ---- */
      const gp = tg == null ? 0 : E.out3(prog(t, tg, tg + 0.35));
      const gv = gp > 0;
      setA(st.gridG, 'visibility', gv ? 'visible' : 'hidden');
      setA(st.gridG, 'transform', `translate(0 ${GY}) scale(1 ${f2(Math.max(gp, 0.001))}) translate(0 ${-GY})`);
      setA(st.plate, 'visibility', gv ? 'visible' : 'hidden');

      /* ---- remplissage ---- */
      let n = 0, hourMode = false;
      if (tm != null) n = clamp(Math.floor((t - tm - 0.35) / 0.1) + 1, 0, st.perMin);
      let clap = 0, tEnd = null;
      if (th != null) {
        const q = prog(t, th + 0.2, th + 0.2 + st.hourD);
        if (t >= th) { hourMode = true; n = Math.max(n, Math.floor(st.base + (st.perHour - st.base) * Math.pow(q, 2.2))); }
        tEnd = th + 0.2 + st.hourD;
        if (t >= tEnd) clap = prog(t, tEnd, tEnd + 0.4);
      }
      n = Math.min(n, N);
      // styles : 0 éteint, 1 allumé, 2 front (les 24 dernières)
      const lo = Math.max(0, Math.min(st.curN, n) - 26), hi = Math.min(N, Math.max(st.curN, n) + 1);
      for (let i = lo; i < hi; i++) {
        const s = i >= n ? 0 : i >= n - 24 && n < st.perHour ? 2 : 1;
        const c = st.cells[i];
        if (c.s === s) continue;
        c.s = s;
        const nn = c.n;
        if (s === 0) { nn.setAttribute('fill', C.ink); nn.setAttribute('opacity', 0.12); nn.removeAttribute('stroke'); nn.removeAttribute('stroke-width'); }
        else if (s === 1) { nn.setAttribute('fill', st.accent); nn.setAttribute('opacity', 1); nn.setAttribute('stroke', C.ink); nn.setAttribute('stroke-width', 2.5); }
        else { nn.setAttribute('fill', C.ink); nn.setAttribute('opacity', 1); nn.setAttribute('stroke', C.ink); nn.setAttribute('stroke-width', 2.5); }
      }
      st.curN = n;
      // compteur quantifié (4 pas / s en phase heure)
      let shown = n;
      if (hourMode && t < tEnd) { const tq = Math.floor(t * 4) / 4; const q = prog(tq, th + 0.2, th + 0.2 + st.hourD); shown = Math.min(st.perHour, Math.floor(st.base + (st.perHour - st.base) * Math.pow(q, 2.2))); }
      if (hourMode && t >= tEnd) shown = st.perHour;
      const txt = hourMode ? `${pad5(shown)} / H` : `${pad5(shown)} / MIN`;
      if (st.cnt.textContent !== txt) st.cnt.textContent = txt;
      const cs = 1 + 0.1 * Math.sin(Math.PI * clap), sh = clap > 0 && clap < 1 ? shakeAt(t, tEnd, 6, 0.35) : [0, 0];
      const pp = gv ? E.back(clamp((t - tg) / 0.4)) : 0;
      put(st.plate, 960 + sh[0], 205 + sh[1], 0, pp * cs, pp * cs, gv ? 1 : 0);

      /* ---- anneau ---- */
      let lap = null, done = 0;
      for (const l of st.laps) { if (l.t0 <= t) lap = l; if (t >= l.t0 + l.fd) done++; }
      const pr = lap ? clamp((t - lap.t0) / lap.fd) : 0;
      setA(st.arc, 'stroke-dasharray', `${f2(pr)} 1.01`);
      setA(st.arc, 'visibility', pr > 0 ? 'visible' : 'hidden');
      const full = lap && pr >= 1;
      const dp = full ? E.back(clamp((t - (lap.t0 + lap.fd)) / 0.3)) : 0;
      setA(st.dotC, 'fill', full ? st.accent : C.paper);
      st.dot.setAttribute('transform', `translate(0 ${-RR}) scale(${f2(full ? 0.6 + 0.9 * Math.min(dp, 1.2) * (dp > 1 ? 1 : 1) : 1)})`);
      const ck = lap ? (full ? `${dsec(lap.fd)} s` : `${dsec(pr * lap.fd)} s`) : `${st.period} s`;
      if (st.clock.textContent !== ck) st.clock.textContent = ck;
      st.mini.forEach((m, i) => { setA(m, 'fill', i < done ? st.accent : C.paper); setA(m, 'visibility', gp < 0.5 ? 'visible' : 'hidden'); });
      const gp2 = E.io3(prog(t, tg == null ? 1e9 : tg, (tg == null ? 1e9 : tg) + 0.55));
      const rs = lerp(1, 0.46, gp2), rx = lerp(960, 240, gp2), ry = lerp(430, 200, gp2);
      put(st.ringG, rx, ry, 0, rs, rs, 1);
      // sticker « 3 s » à chaque tour
      let so = 0, sa = 0;
      if (lap) { const s = t - lap.t0; sa = E.back(clamp(s / 0.25)); if (s > 1.4) sa *= 1 - E.in2(prog(s, 1.4, 1.65)); so = s >= 0 && sa > 0.001 ? 1 : 0; }
      put(st.stk, rx + 215 * rs + 30, ry - 190 * rs - 10, -7, sa * (0.6 + 0.4 * rs), sa * (0.6 + 0.4 * rs), so);

      /* ---- no-pause ---- */
      st.labels.forEach((L, i) => {
        const t0 = tnp == null ? 1e9 : tnp + i * 0.55;
        const q = prog(t, t0, t0 + 0.25), sc = q > 0 ? E.back(q) : 0;
        put(L.gg, 700 + i * 340, st.lblY, i === 1 ? 2 : -2, sc, sc, q > 0 ? 1 : 0);
        const k = E.out3(prog(t, t0 + 0.5, t0 + 0.75));
        for (const kn of [L.k0, L.k1]) { setA(kn, 'visibility', k > 0 ? 'visible' : 'hidden'); kn.setAttribute('x2', f2(lerp(-170, 170, k))); kn.setAttribute('y2', f2(lerp(8, -8, k))); }
      });

      /* ---- bouton + main ---- */
      const hp = thand == null ? 0 : E.out3(prog(t, thand, thand + 0.45));
      setA(st.btn, 'visibility', hp > 0 ? 'visible' : 'hidden');
      setA(st.btnTop, 'transform', `translate(0 ${hp >= 0.97 ? 8 : 0})`);
      setA(st.handG, 'visibility', hp > 0 ? 'visible' : 'hidden');
      const k = 1 - hp;
      st.hand.setAttribute('transform', `translate(${f2(1768 + 150 * k)} ${f2(770 + 36 + 420 * k + (hp >= 0.97 ? 6 : 0))}) rotate(-12)`);
    }
  });
})();
;
/* ==== tools/video/composition/components/ticket-choice.js ==== */
// Composant `ticket-choice` : l'expérience d'Ellen Langer (1975, S5 de l'épisode 3). Deux blocs de six billets de loterie : « ILS CHOISISSENT » (une main entoure un billet) / « ON LEUR DONNE » (un billet glisse dans la main).
// Cues : setup, choose, give, same, offer, price-left, price-right, illusion. Fond pocket. Aucun dégradé, flou, lueur ni filter ; aucun chiffre de prix ; mains plates sans visage.
(() => {
  'use strict';
  const { C, E, clamp, prog, lerp, f2, sv, g, rect, circle, path, line, text, put, sticker, shakeAt } = ZV;
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const str = (v, d) => (typeof v === 'string' && v.trim() ? v.trim() : d);
  function fit(n, maxW) {
    try { const w = n.getComputedTextLength(); if (w > maxW && w > 0) { n.setAttribute('textLength', f2(maxW)); n.setAttribute('lengthAdjust', 'spacingAndGlyphs'); } } catch (e) { /* hors DOM */ }
  }

  const TW = 250, TH = 116, GAPX = 22, GAPY = 22, TOPY = 250;
  const BLOCK_X = [90, 1308];                  // gauche, droite
  const CHOSEN = 4, GIVEN = 5;                  // billets visés (rangée du bas)
  const GIVE_END = { x: 1700, y: 706 };

  // billet cranté, centré sur (0,0)
  function ticketPath(w, h) {
    const hw = w / 2, hh = h / 2, br = 7, rc = 14;
    let d = `M${-hw} ${-hh}`;
    for (let x = -hw + 30; x <= hw - 30; x += 30) d += `L${x - br} ${-hh}A${br} ${br} 0 0 0 ${x + br} ${-hh}`;
    d += `L${hw} ${-hh}L${hw} ${-rc}A${rc} ${rc} 0 0 0 ${hw} ${rc}L${hw} ${hh}`;
    for (let x = hw - 30; x >= -hw + 30; x -= 30) d += `L${x + br} ${hh}A${br} ${br} 0 0 0 ${x - br} ${hh}`;
    d += `L${-hw} ${hh}L${-hw} ${rc}A${rc} ${rc} 0 0 0 ${-hw} ${-rc}Z`;
    return d;
  }
  function split2(s) {
    const w = s.split(/\s+/); if (w.length < 2) return [s, ''];
    let best = 1, bd = 1e9;
    for (let j = 1; j < w.length; j++) { const d = Math.abs(w.slice(0, j).join(' ').length - w.slice(j).join(' ').length); if (d < bd) { bd = d; best = j; } }
    return [w.slice(0, best).join(' '), w.slice(best).join(' ')];
  }
  function drawPointer(parent) {
    const h = g(parent);
    rect(h, -62, 120, 150, 150, 40, C.paper, C.ink, 6);
    for (let k = 0; k < 3; k++) rect(h, 26, 110 + k * 36, 52 - k * 4, 34, 17, C.paper, C.ink, 6);
    sv('ellipse', { cx: -64, cy: 190, rx: 19, ry: 46, fill: C.paper, stroke: C.ink, 'stroke-width': 6, transform: 'rotate(24 -64 190)' }, h);
    rect(h, -20, 0, 40, 160, 20, C.paper, C.ink, 6);
    rect(h, -14, 128, 28, 40, 0, C.paper);
    rect(h, -66, 270, 158, 52, 4, C.red, C.ink, 6);
    rect(h, -52, 322, 130, 420, 4, C.paper, C.ink, 6);
    return h;
  }
  function drawPalm(parent) {
    const h = g(parent);
    for (let k = 0; k < 4; k++) rect(h, -250 + k * 8, 2 + k * 15, 120 - k * 4, 14, 7, C.paper, C.ink, 4);
    rect(h, -170, 0, 330, 74, 32, C.paper, C.ink, 6);
    rect(h, 142, -6, 52, 78, 4, C.red, C.ink, 6);
    rect(h, 194, 0, 400, 66, 4, C.paper, C.ink, 6);
    return h;
  }

  ZV.define('ticket-choice', {
    init(root, shot) {
      const p = (shot && shot.props) || {};
      const beats = Array.isArray(shot && shot.beats) ? shot.beats : [];
      const cueT = (n) => { const b = beats.filter((x) => x && x.do === 'cue' && x.name === n && isNum(x.t)).sort((a, c) => a.t - c.t)[0]; return b ? b.t : null; };
      const r = ZV.rng(1975);
      const st = {};
      for (const k of ['choose', 'give', 'same', 'offer', 'price-left', 'price-right', 'illusion']) st[k] = cueT(k);
      const ts = cueT('setup');
      st.tS = ts == null ? -5 : ts;

      rect(root, 0, 0, 1920, 1080, 0, C.pocket);

      /* ---- bandeau « même loterie » ---- */
      st.ban = g(root);
      rect(st.ban, -800 + 12, -45 + 12, 1600, 90, 14, C.ink);
      rect(st.ban, -800, -45, 1600, 90, 14, C.lime, C.ink, 7);
      circle(st.ban, -730, 0, 46, C.paper, C.ink, 6);
      rect(st.ban, -754, -17, 48, 11, 3, C.ink);
      rect(st.ban, -754, 6, 48, 11, 3, C.ink);
      fit(text(st.ban, str(p.banner, 'MÊME LOTERIE · MÊMES CHANCES'), 50, 19, 54, C.ink, { anchor: 'middle' }), 1380);

      /* ---- en-têtes ---- */
      st.heads = [str(p.left, 'ILS CHOISISSENT'), str(p.right, 'ON LEUR DONNE')].map((s, i) => {
        const hg = g(root);
        sticker(hg, 520, 80, i ? C.white : C.lime, '', 1, C.ink, { sh: 9, r: 14 });
        fit(text(hg, s, 0, 17, 48, C.ink, { anchor: 'middle' }), 470);
        return hg;
      });

      /* ---- billets ---- */
      const d = ticketPath(TW, TH);
      st.tk = [];
      for (let side = 0; side < 2; side++) {
        for (let i = 0; i < 6; i++) {
          const col = i % 2, row = Math.floor(i / 2);
          const x = BLOCK_X[side] + col * (TW + GAPX) + TW / 2, y = TOPY + row * (TH + GAPY) + TH / 2;
          const ghost = path(root, d, 'none', C.paper, 4, { 'stroke-dasharray': '10 10', opacity: 0.5, visibility: 'hidden', transform: `translate(${f2(x)} ${f2(y)})` });
          const tg = g(root);
          path(tg, d, C.ink, null, 0, { transform: 'translate(7 7)' });
          const body = g(tg);
          const bp = path(body, d, C.paper, C.ink, 5);
          line(body, -TW / 2 + 70, -TH / 2 + 14, -TW / 2 + 70, TH / 2 - 14, C.ink, 3, { 'stroke-dasharray': '6 8' });
          for (let b = 0; b < 4; b++) rect(body, -TW / 2 + 16 + b * 13, -22 + (b % 2) * 6, 6 + (b % 3) * 2, 44 - (b % 2) * 12, 1, C.ink);
          const num = String(1000 + Math.floor(r() * 8999));
          text(body, num, 34, 17, 48, C.ink, { anchor: 'middle', mono: true });
          st.tk.push({ tg, body, bp, ghost, x, y, side, i, rot: (r() - 0.5) * 4, num });
        }
      }
      // marqueur rouge autour du billet choisi
      const ct = st.tk[CHOSEN];
      st.mark = sv('ellipse', { cx: ct.x, cy: ct.y, rx: 168, ry: 84, fill: 'none', stroke: C.red, 'stroke-width': 9, pathLength: 1, 'stroke-dasharray': '0 1.01', 'stroke-linecap': 'round', transform: `rotate(-6 ${ct.x} ${ct.y})` }, root);

      /* ---- mains ---- */
      st.hand1 = g(root);
      st.hand1i = drawPointer(st.hand1);
      st.hand2 = g(root);
      st.hand2i = drawPalm(st.hand2);

      /* ---- milieu : offre, prix, tampon ---- */
      st.offerG = g(root);
      sticker(st.offerG, 620, 112, C.white, '', 1, C.ink, { sh: 11 });
      fit(text(st.offerG, str(p.offer, 'JE TE LE RACHÈTE ?'), 0, 19, 56, C.ink, { anchor: 'middle' }), 560);
      st.pl = g(root);
      rect(st.pl, -180 + 12, -75 + 12, 360, 150, 16, C.ink);
      rect(st.pl, -180, -75, 360, 150, 16, C.red, C.ink, 8);
      {
        const s = str(p.price_left, 'BEAUCOUP PLUS CHER'); const w = split2(s);
        if (w[1]) { fit(text(st.pl, w[0], 0, -8, 56, C.ink, { anchor: 'middle' }), 320); fit(text(st.pl, w[1], 0, 52, 56, C.ink, { anchor: 'middle' }), 320); }
        else fit(text(st.pl, s, 0, 18, 56, C.ink, { anchor: 'middle' }), 320);
      }
      st.pr = g(root);
      rect(st.pr, -110 + 8, -40 + 8, 220, 80, 12, C.ink);
      rect(st.pr, -110, -40, 220, 80, 12, C.white, C.ink, 6);
      fit(text(st.pr, str(p.price_right, 'BIEN MOINS'), 0, 12, 34, C.ink, { anchor: 'middle' }), 190);
      st.stamp = g(root);
      rect(st.stamp, -280 + 12, -85 + 12, 560, 170, 14, C.ink);
      rect(st.stamp, -280, -85, 560, 170, 14, C.red, C.ink, 9);
      rect(st.stamp, -262, -67, 524, 134, 8, 'none', C.ink, 4);
      {
        const s = str(p.stamp, 'ILLUSION DE CONTRÔLE'); const w = split2(s);
        if (w[1]) { fit(text(st.stamp, w[0], 0, -6, 62, C.ink, { anchor: 'middle' }), 480); fit(text(st.stamp, w[1], 0, 54, 62, C.ink, { anchor: 'middle' }), 480); }
        else fit(text(st.stamp, s, 0, 20, 64, C.ink, { anchor: 'middle' }), 480);
      }
      return st;
    },

    update(st, t) {
      /* ---- bandeau ---- */
      const bq = st.same == null ? 0 : clamp((t - st.same) / 0.45);
      const by = lerp(-160, 73, E.back(bq));
      put(st.ban, 960, by, 0, 1, 1, bq > 0 ? 1 : 0);

      /* ---- en-têtes + billets ---- */
      st.heads.forEach((h, i) => {
        const q = E.back(clamp((t - st.tS - i * 0.05) / 0.3));
        put(h, i ? 1569 : 351, 190, i ? 1.5 : -1.5, q, q, q > 0 ? 1 : 0);
      });
      const tkC = st.tk[CHOSEN], tkG = st.tk[GIVEN];
      st.tk.forEach((k) => {
        const idx = k.i * 2 + k.side;
        const q = clamp((t - st.tS - 0.12 - idx * 0.05) / 0.28);
        let x = k.x, y = k.y, rot = k.rot, sc = E.back(q), lime = false, vis = q > 0;
        if (k.side === 0 && k.i === CHOSEN && st.choose != null) {
          const lp = E.out3(clamp((t - st.choose - 0.5) / 0.25));
          y -= 14 * lp; lime = lp > 0.01; rot = lerp(rot, 0, lp);
        }
        let ghost = false;
        if (k.side === 1 && k.i === GIVEN && st.give != null) {
          const gp = E.io3(clamp((t - st.give - 0.35) / 0.9));
          ghost = gp > 0.001;
          x = lerp(k.x, GIVE_END.x, gp); y = lerp(k.y, GIVE_END.y, gp); rot = lerp(k.rot, -5, gp);
        }
        put(k.tg, x, y, rot, sc, sc, vis ? 1 : 0);
        setA(k.bp, 'fill', lime ? C.lime : C.paper);
        if (k.side === 1 && k.i === GIVEN) {
          // la case vide reste en pointillés à sa place d'origine
          setA(k.ghost, 'visibility', ghost ? 'visible' : 'hidden');
        }
      });

      /* ---- main qui choisit ---- */
      const hp = st.choose == null ? 0 : E.out3(clamp((t - st.choose) / 0.5));
      setA(st.hand1, 'visibility', hp > 0 ? 'visible' : 'hidden');
      st.hand1.setAttribute('transform', `translate(${f2(tkC.x)} ${f2(tkC.y + TH / 2 + 10 + (1 - hp) * 330)}) rotate(${f2(-4 * hp)})`);
      const mk = st.choose == null ? 0 : E.io2(clamp((t - st.choose - 0.6) / 0.55));
      setA(st.mark, 'visibility', mk > 0 ? 'visible' : 'hidden');
      setA(st.mark, 'stroke-dasharray', `${f2(mk)} 1.01`);

      /* ---- main qui reçoit ---- */
      const gq = st.give == null ? 0 : E.out3(clamp((t - st.give) / 0.5));
      setA(st.hand2, 'visibility', gq > 0 ? 'visible' : 'hidden');
      st.hand2.setAttribute('transform', `translate(${f2(GIVE_END.x - 12 + (1 - gq) * 360)} ${f2(GIVE_END.y + 56 + (1 - gq) * 50)})`);

      /* ---- offre, prix, tampon ---- */
      const oq = st.offer == null ? 0 : E.back(clamp((t - st.offer) / 0.35));
      put(st.offerG, 960, 310, -3, oq, oq, oq > 0 ? 1 : 0);
      let ps = 0;
      if (st['price-left'] != null) { const q = clamp((t - st['price-left']) / 1.3); ps = q > 0 ? 0.35 + 0.77 * E.out3(q) + 0.08 * Math.sin(Math.PI * clamp(q * 1.6)) * (1 - q) : 0; }
      put(st.pl, 840, 480, -2, ps, ps, ps > 0 ? 1 : 0);
      const rq = st['price-right'] == null ? 0 : E.back(clamp((t - st['price-right']) / 0.3));
      put(st.pr, 1182, 480, 2, rq, rq, rq > 0 ? 1 : 0);
      const iq = st.illusion == null ? 0 : clamp((t - st.illusion) / 0.22);
      const is = iq > 0 ? 1 + 1.6 * (1 - E.out3(iq)) : 0;
      const sh = st.illusion == null ? [0, 0] : shakeAt(t, st.illusion + 0.2, 7, 0.3);
      put(st.stamp, 960 + sh[0], 690 + sh[1], -5, is, is, iq > 0 ? 1 : 0);
    }
  });
})();
;
/* ==== tools/video/composition/components/twin-drain.js ==== */
// Composant `twin-drain` (épisode 4) : la soustraction. Même soirée, même nombre de tours, deux mises. Voir EP4-COMPONENTS.md.
// Deux couloirs (A, B) : mise, « MISÉ », barre de perte moyenne (linéaire avec les tours : c'est une moyenne, pas un tirage).
// Fonction pure du temps ; aplats, aucun dégradé / flou / filter.
// Cues : rule, lane-a, run-a (dur), mean, lane-b, run-b (dur), race (dur), verdict. Props `bg` (paper|ink), `from` (none|a|ab).
(() => {
  'use strict';
  const { C, F, E, clamp, prog, f2, sv, g, rect, text, put, fr } = ZV;
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const num = (v, d) => (v != null && v !== '' && isFinite(+v) ? +v : d);
  const sstr = (v, d) => (typeof v === 'string' && v.length ? v : d);
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const vis = (n, on) => setA(n, 'visibility', on ? 'visible' : 'hidden');
  const setTxt = (n, s) => { if (n.__s !== s) { n.__s = s; n.textContent = s; } };
  const NEVER = -1e6;

  function mkMeasure(root) {
    const n = sv('text', { x: 0, y: 0, visibility: 'hidden' }, root);
    const m = (s, size, mono) => {
      try {
        n.setAttribute('font-family', mono ? F.mono : F.display); n.setAttribute('font-weight', 800); n.setAttribute('font-size', size);
        n.textContent = s;
        const w = n.getComputedTextLength();
        if (w > 0) return w;
      } catch (e) { /* repli */ }
      return String(s).length * size * (mono ? 0.6 : 0.62);
    };
    m.done = () => { try { root.removeChild(n); } catch (e) { /* rien */ } };
    return m;
  }
  function split2(words, meas, size) {
    if (words.length < 2) return [words.join(' '), ''];
    let best = null;
    for (let k = 1; k < words.length; k++) {
      const a = words.slice(0, k).join(' '), b = words.slice(k).join(' ');
      const w = Math.max(meas(a, size), meas(b, size));
      if (!best || w < best.w) best = { a, b, w };
    }
    return [best.a, best.b];
  }
  // « 100 000 € MISÉS » -> { pre:'', n:100000, post:' € MISÉS' } (null si aucun nombre)
  function parseAmount(s) {
    const m = /\d[\d   ]*/.exec(s);
    if (!m) return null;
    const n = parseInt(m[0].replace(/\D/g, ''), 10);
    if (!isFinite(n)) return null;
    return { pre: s.slice(0, m.index), n, post: s.slice(m.index + m[0].length).replace(/^/, (m[0].match(/[   ]+$/) || [''])[0]) };
  }

  const DEF_LANES = [
    { bet: '100 € / TOUR', sub: 'AU DÉPART', staked: '100 000 € MISÉS', loss: '≈ −2 700 €', value: 2700 },
    { bet: '200 € / TOUR', sub: 'POUR TE REFAIRE', staked: '200 000 € MISÉS', loss: '≈ −5 400 €', value: 5400 }
  ];
  const NAMES = ['rule', 'lane-a', 'run-a', 'mean', 'lane-b', 'run-b', 'race', 'verdict'];
  const OPT = { 3: true };                                // `mean` reste optionnel (jamais impliqué)
  const BX = 580, BARMAX = 1200, BH = 70, LX0 = 80, LW = 1760, LH = 210;
  const LY = [260, 520];

  ZV.define('twin-drain', {
    init(root, shot) {
      const P = (shot && shot.props) || {};
      const beats = Array.isArray(shot && shot.beats) ? shot.beats : [];
      const dur = isNum(shot && shot.dur) && shot.dur > 0 ? shot.dur : 10;
      const cueB = (n) => { let r = null; for (const b of beats) if (b && b.do === 'cue' && b.name === n && isNum(b.t) && (r == null || b.t < r.t)) r = b; return r; };
      const from = P.from === 'a' || P.from === 'ab' ? P.from : 'none';
      const fromIdx = from === 'ab' ? 6 : from === 'a' ? 4 : 0;   // étapes < fromIdx déjà dessinées
      const ink = P.bg === 'ink';
      const TH = ink
        ? { bg: C.ink, panel: C.pocket, line: C.paper, tx: C.paper, sub: '#B9B5A8', track: '#262626', bar: C.red, shadow: '#000000', bandBg: C.paper, bandTx: C.ink, stickBg: C.paper, stickTx: C.ink }
        : { bg: C.paper, panel: C.white, line: C.ink, tx: C.ink, sub: C.grey, track: '#ECE8DC', bar: C.red, shadow: C.ink, bandBg: C.ink, bandTx: C.paper, stickBg: C.ink, stickTx: C.paper };

      const rounds = Math.max(1, Math.round(num(P.rounds, 1000)));
      const lanes = [0, 1].map((i) => {
        const d = DEF_LANES[i], l = (Array.isArray(P.lanes) && P.lanes[i]) || {};
        return { bet: sstr(l.bet, d.bet), sub: sstr(l.sub, d.sub), staked: sstr(l.staked, d.staked), loss: sstr(l.loss, d.loss), value: Math.max(1, num(l.value, d.value)) };
      });
      const maxVal = Math.max(lanes[0].value, lanes[1].value);
      const rule = sstr(P.rule, 'ROULETTE EUROPÉENNE · LE ZÉRO PREND 2,7 % DE CHAQUE MISE');
      const meanTxt = sstr(P.mean, 'LA MOYENNE FINIT TOUJOURS PAR AVOIR RAISON');
      const speedTxt = sstr(P.speed, '2 × PLUS VITE');
      const verdict = sstr(P.verdict, "MISER PLUS NE RATTRAPE RIEN. ÇA ACCÉLÈRE.");

      /* ---- événements et calendrier ---- */
      const evCue = { a: cueB('run-a'), b: cueB('run-b'), race: cueB('race'), lb: cueB('lane-b') };
      const dOf = (b, d) => (b && isNum(b.dur) && b.dur > 0 ? b.dur : d);
      const raw = NAMES.map((n) => { const b = cueB(n); return b ? b.t : null; });
      let T = [];
      let evs;
      if (from === 'none' && raw.every((x) => x == null)) {
        const k = Math.min(1, (dur * 0.92) / 17.5);
        T = [0.3 * k, 1.2 * k, 1.8 * k, 5.4 * k, 7.0 * k, 7.6 * k, 11.6 * k, 16.2 * k];
        evs = [{ k: 'a', t0: T[2], d: 3 * k }, { k: 'lb', t0: T[4], d: 0 }, { k: 'b', t0: T[5], d: 3 * k }, { k: 'race', t0: T[6], d: 4 * k }];
      } else {
        for (let k = 0; k < NAMES.length; k++) {
          if (k < fromIdx) T[k] = NEVER;
          else if (raw[k] != null) T[k] = raw[k];
          else if (!OPT[k] && raw.slice(k + 1).some((x) => x != null)) T[k] = NEVER;
          else T[k] = null;
        }
        evs = [];
        if (evCue.a) evs.push({ k: 'a', t0: evCue.a.t, d: dOf(evCue.a, 4) });
        if (evCue.lb) evs.push({ k: 'lb', t0: evCue.lb.t, d: 0 });
        if (evCue.b) evs.push({ k: 'b', t0: evCue.b.t, d: dOf(evCue.b, 4) });
        if (evCue.race) evs.push({ k: 'race', t0: evCue.race.t, d: dOf(evCue.race, 5) });
      }
      evs.sort((x, y) => x.t0 - y.t0);
      const st = { T, evs, dur, from, rounds, lanes, maxVal, TH };
      const meas = mkMeasure(root);

      /* ---- fond ---- */
      rect(root, 0, 0, 1920, 1080, 0, TH.bg);

      /* ---- bandeau du haut ---- */
      st.rule = g(root);
      rect(st.rule, 100 + 6, 68 + 6, 64, 64, 0, TH.shadow);
      rect(st.rule, 100, 68, 64, 64, 0, C.lime, TH.line, 5);
      text(st.rule, '0', 132, 112, 44, C.ink, { anchor: 'middle' });
      {
        let s = 30, w = meas(rule, s, true);
        if (w > 1630) { s = Math.floor(s * 1630 / w); }
        text(st.rule, rule, 192, 110, s, TH.tx, { mono: true });
      }
      rect(st.rule, 100, 148, 1720, 4, 0, TH.line);

      /* ---- compteur de tours commun ---- */
      st.tour = text(root, 'TOUR 0', 960, 202, 48, TH.tx, { mono: true, anchor: 'middle' });
      st.tour.setAttribute('visibility', 'hidden');

      /* ---- couloirs ---- */
      st.lanes = lanes.map((L, i) => {
        const o = { L, i, y0: LY[i] };
        o.g = g(root);
        rect(o.g, LX0 + 8, o.y0 + 8, LW, LH, 0, TH.shadow);
        rect(o.g, LX0, o.y0, LW, LH, 0, TH.panel, TH.line, 5);
        // mise + sous-titre
        let bs = 64, bw = meas(L.bet, bs);
        if (bw > 400) bs = Math.floor(bs * 400 / bw);
        text(o.g, L.bet, 112, o.y0 + 100, bs, TH.tx);
        let ss = 24, sw = meas(L.sub, ss, true);
        if (sw > 400) ss = Math.floor(ss * 400 / sw);
        text(o.g, L.sub, 112, o.y0 + 150, ss, TH.sub, { mono: true });
        rect(o.g, 542, o.y0 + 24, 3, LH - 48, 0, TH.line);
        // MISÉ
        o.am = parseAmount(L.staked);
        o.staked = text(o.g, L.staked, BX, o.y0 + 62, 40, TH.tx, { mono: true });
        // piste + barre
        rect(o.g, BX, o.y0 + 84, BARMAX, BH, 0, TH.track);
        o.bar = rect(o.g, BX, o.y0 + 84, 0, BH, 0, TH.bar, ink ? C.paper : C.ink, 6);
        o.full = BARMAX * L.value / maxVal;
        text(o.g, 'PERTE MOYENNE ATTENDUE', BX, o.y0 + 188, 22, TH.sub, { mono: true });
        // valeur finale : à droite de la barre si la place le permet, sinon DANS la barre (white, alignée à droite)
        let vs = 56, vw = meas(L.loss, vs);
        if (vw > 560) { vs = Math.floor(vs * 560 / vw); vw = meas(L.loss, vs); }
        const outside = BX + o.full + 24 + vw <= 1830;
        o.vs = vs; o.outside = outside;
        o.val = g(o.g);
        const vy = o.y0 + 84 + BH / 2 + vs * 0.36;
        if (outside) text(o.val, L.loss, 0, 0, vs, TH.tx, { len: f2(vw) });
        else text(o.val, L.loss, 0, 0, vs, C.white, { anchor: 'end', len: f2(vw) });
        o.valX = outside ? BX + o.full + 24 : BX + o.full - 22;
        o.valY = vy;
        return o;
      });

      /* ---- sticker « la moyenne… » (au-dessus de la barre A) ---- */
      {
        const words = meanTxt.split(/\s+/).filter(Boolean);
        let size = 34, lines = split2(words, meas, size);
        while (size > 22 && Math.max(meas(lines[0], size), meas(lines[1], size)) > 480) { size -= 1; lines = split2(words, meas, size); }
        const w = Math.max(meas(lines[0], size), meas(lines[1], size)) + 56, h = lines[1] ? size * 2.2 + 20 : size * 1.4 + 30;
        st.mean = g(root);
        rect(st.mean, -w / 2 + 9, -h / 2 + 9, w, h, 8, TH.shadow === C.ink ? '#555555' : C.paper);
        rect(st.mean, -w / 2, -h / 2, w, h, 8, TH.stickBg, TH.line, 5);
        const y1 = lines[1] ? -size * 0.12 : size * 0.35;
        text(st.mean, lines[0], 0, y1, size, TH.stickTx, { anchor: 'middle', len: f2(meas(lines[0], size)) });
        if (lines[1]) text(st.mean, lines[1], 0, y1 + size * 1.15, size, TH.stickTx, { anchor: 'middle', len: f2(meas(lines[1], size)) });
        st.meanX = Math.min(1800 - w / 2, 1530);
      }
      /* ---- sticker rouge « 2 × plus vite » sur le couloir B ---- */
      {
        let size = 48, w = meas(speedTxt, size);
        if (w > 440) { size = Math.floor(size * 440 / w); w = meas(speedTxt, size); }
        const bw2 = w + 56, h = size * 1.4 + 18;
        st.speed = g(root);
        rect(st.speed, -bw2 / 2 + 9, -h / 2 + 9, bw2, h, 10, TH.shadow);
        rect(st.speed, -bw2 / 2, -h / 2, bw2, h, 10, C.red, ink ? C.paper : C.ink, 6);
        text(st.speed, speedTxt, 0, size * 0.35, size, ink ? C.ink : C.ink, { anchor: 'middle', len: f2(w) });
        st.speedX = Math.min(1800 - bw2 / 2, 1560);
      }
      /* ---- bandeau verdict ---- */
      {
        const m = /^(.*?)([^.!?]*[.!?])\s*$/.exec(verdict);
        let p1 = m ? m[1].trim() : verdict, p2 = m ? m[2].trim() : '';
        if (!p1) { p1 = verdict; p2 = ''; }
        let size = 46;
        const gap = size * 0.3;
        let w1 = meas(p1, size), w2 = p2 ? meas(p2, size) : 0;
        const room = 1720 - 70;
        if (w1 + w2 + (p2 ? gap : 0) > room) { const k = room / (w1 + w2 + gap); size = Math.floor(size * k); w1 = meas(p1, size); w2 = p2 ? meas(p2, size) : 0; }
        const tot = w1 + w2 + (p2 ? size * 0.3 : 0);
        st.verdict = g(root);
        rect(st.verdict, 80 + 8, 750 + 8, 1760, 70, 0, TH.shadow);
        rect(st.verdict, 80, 750, 1760, 70, 0, TH.bandBg, TH.line, 4);
        const x0 = 960 - tot / 2;
        text(st.verdict, p1, x0, 750 + 35 + size * 0.36, size, TH.bandTx, { len: f2(w1) });
        if (p2) text(st.verdict, p2, x0 + w1 + size * 0.3, 750 + 35 + size * 0.36, size, C.red, { len: f2(w2) });
      }
      meas.done();
      return st;
    },

    update(st, t) {
      try {
        t = clamp(t, 0, st.dur + 1);
        const { T, evs, lanes } = st;
        const at = (k) => T[k] != null && t >= T[k];
        const ph = (k, d, o) => (T[k] == null ? 0 : prog(t, T[k] + (o || 0), T[k] + (o || 0) + d));
        const fromAll = st.from !== 'none';

        /* état des deux couloirs à l'instant tt : fractions, tours, instants d'arrivée */
        const state = (tt) => {
          const s = { f: [st.from === 'none' ? 0 : 1, st.from === 'ab' ? 1 : 0], r: fromAll ? 1 : 0, done: [fromAll ? NEVER : null, st.from === 'ab' ? NEVER : null], t0: 0 };
          for (const e of evs) {
            if (tt < e.t0) break;
            s.t0 = e.t0;
            if (e.k === 'lb') { s.r = 0; continue; }
            const p = e.d > 0 ? prog(tt, e.t0, e.t0 + e.d) : 1;
            const v = Math.pow(p, 1.5);
            s.r = v;
            const fin = p >= 1 ? e.t0 + e.d : null;
            if (e.k === 'a' || e.k === 'race') { s.f[0] = v; s.done[0] = fin; }
            if (e.k === 'b' || e.k === 'race') { s.f[1] = v; s.done[1] = fin; }
          }
          return s;
        };
        const S = state(t);
        // affichage des compteurs : 10 mises à jour par seconde (jamais en retard sur un début d'étape)
        const tq = Math.max(Math.floor(t * 10) / 10, S.t0);
        const Q = state(Math.min(tq, t));
        const fq = (i) => (S.f[i] >= 1 ? 1 : Q.f[i]);
        const rq = S.r >= 1 ? 1 : Q.r;

        /* bandeau */
        {
          const p = E.out3(ph(0, 0.3));
          put(st.rule, 0, -40 * (1 - p), 0, 1, 1, at(0) ? p : 0);
        }
        /* compteur de tours */
        {
          const on = at(1) || (T[1] == null && false);
          vis(st.tour, on);
          setTxt(st.tour, 'TOUR ' + fr(Math.round(rq * st.rounds)));
        }
        /* couloirs */
        st.lanes.forEach((o, i) => {
          const k = i === 0 ? 1 : 4;
          const on = at(k);
          const p = E.back(ph(k, 0.4));
          setA(o.g, 'transform', `translate(0 ${f2(60 * (1 - p))})`);
          setA(o.g, 'opacity', f2(on ? clamp(p * 3) : 0));
          vis(o.g, on);
          const f = S.f[i];
          const w = o.full * f;
          setA(o.bar, 'width', f2(Math.max(0, w)));
          vis(o.bar, w >= 1);
          // MISÉ
          if (o.am) setTxt(o.staked, o.am.pre + fr(Math.round(fq(i) * o.am.n)) + o.am.post);
          // valeur : claque à l'arrivée de la barre
          const td = S.done[i];
          const done = f >= 1 && td != null;
          const vp = done ? prog(t, td, td + 0.22) : 0;
          const sc = done ? 1 + 0.45 * (1 - E.out3(vp)) : 1;
          setA(o.val, 'transform', `translate(${f2(o.valX)} ${f2(o.valY)}) scale(${f2(sc)})`);
          vis(o.val, done);
        });
        /* sticker « la moyenne… » : de `mean` jusqu'à l'arrivée du couloir B */
        {
          const tEnd = T[4] != null ? T[4] : null;
          const on = at(3) && (tEnd == null || t < tEnd);
          const p = T[3] != null && T[3] > -1e5 ? E.back(ph(3, 0.3)) : 1;
          put(st.mean, st.meanX, 270, -3, p, p, on ? 1 : 0);
        }
        /* sticker rouge à l'arrivée de la course */
        {
          const ev = evs.find((e) => e.k === 'race');
          const td = ev ? ev.t0 + ev.d : null;
          const on = td != null && t >= td && S.f[1] >= 1;
          const p = td != null ? E.back(prog(t, td, td + 0.3)) : 0;
          put(st.speed, st.speedX, 538, 2.5, p, p, on ? 1 : 0);
        }
        /* verdict */
        {
          const p = E.out3(ph(7, 0.3));
          put(st.verdict, 0, 40 * (1 - p), 0, 1, 1, at(7) ? p : 0);
        }
      } catch (e) { /* jamais d'exception */ }
    }
  });
})();
;
/* ==== tools/video/composition/components/wheel.js ==== */
// Composant « wheel » : roulette européenne (ou américaine) vue de dessus, 1920×1080, fonction pure du temps.
// Roue en aplats (cylindre paper, 37 cases dans l'ordre réel, croisillon), bille qui orbite / claque / hésite / tombe,
// caméra (zoom + recentrage sur une case), voile ink 62 % sur les cases non mises en avant, allumage lime du zéro,
// morph vers la roulette américaine (00). Aucun dégradé, flou ni lueur.
(() => {
  'use strict';
  const { C, E, clamp, prog, lerp, f2, sv, g, rect, circle, text, put, shakeAt, ORDER, RED } = ZV;
  const D2R = Math.PI / 180;
  const AMER = [0, 28, 9, 26, 30, 11, 7, 20, 32, 17, 5, 22, 34, 15, 3, 24, 36, 13, 1, '00', 27, 10, 25, 29, 12, 8, 19, 31, 18, 6, 21, 33, 16, 4, 23, 35, 14, 2];
  const R_RIM = 372, R_TRK = 342, R_PO = 290, R_PI = 196, R_BT = 316, R_REST = 222, R_NUM = 266, R_CAM = 262;
  const W_SLOW = 10, W_FAST = 110, W_ON = 200, RAMP = 0.6;
  const MORPH = 10 / 30;
  const HOP = 0.26;                                   // une sautille entre deux frettes
  const wnorm = (a) => ((a % 360) + 360) % 360;
  const wdiff = (a) => wnorm(a + 180) - 180;
  const pol = (a, r) => [r * Math.sin(a * D2R), -r * Math.cos(a * D2R)];
  const wedge = (a0, a1, r1, r2) => {
    const [x1, y1] = pol(a0, r2), [x2, y2] = pol(a1, r2), [x3, y3] = pol(a1, r1), [x4, y4] = pol(a0, r1);
    return `M${f2(x1)} ${f2(y1)}A${r2} ${r2} 0 0 1 ${f2(x2)} ${f2(y2)}L${f2(x3)} ${f2(y3)}A${r1} ${r1} 0 0 0 ${f2(x4)} ${f2(y4)}Z`;
  };
  const idxEU = {}; ORDER.forEach((n, i) => { idxEU[String(n)] = i; });
  const idxAM = {}; AMER.forEach((n, i) => { idxAM[String(n)] = i; });
  const isZero = (l) => l === '0' || l === '00';
  const kind = (l) => (isZero(l) ? 'zero' : RED.has(+l) ? 'red' : 'black');

  ZV.define('wheel', {
    init(root, shot) {
      const p = shot.props || {};
      const dur = shot.dur || 4;
      const cx = p.x == null ? 960 : p.x, cy = p.y == null ? 500 : p.y;
      const spin = ['slow', 'fast', 'decel', 'stop'].includes(p.spin) ? p.spin : 'slow';
      const ballMode = ['none', 'orbit', 'rest'].includes(p.ball) ? p.ball : 'none';
      const american0 = !!p.american;
      const cue = (n) => ZV.cue(shot, n);
      const st = { cx, cy, spin, ballMode, dur, american0, dKey: -1, shot };

      /* ---- fond + caméra ---- */
      rect(root, 0, 0, 1920, 1080, 0, C.ink);
      st.cam = g(root);
      const wg = g(st.cam, { transform: `translate(${cx} ${cy})` });
      circle(wg, 20, 22, R_RIM, C.pocket);                              // ombre dure
      circle(wg, 0, 0, R_RIM, C.paper, C.ink, 6);                         // cylindre
      for (let i = 0; i < 8; i++) { const [x, y] = pol(i * 45, R_RIM - 15); circle(wg, x, y, 7, C.ink); }
      circle(wg, 0, 0, R_TRK, C.ink, C.ink, 6);                           // piste de la bille
      circle(wg, 0, 0, R_BT, 'none', C.pocket, 46);
      for (let i = 0; i < 8; i++) {                                       // losanges fixes (déflecteurs)
        const a = i * 45 + 22.5, [x, y] = pol(a, R_TRK - 20);
        const dg = g(wg, { transform: `translate(${f2(x)} ${f2(y)}) rotate(${a})` });
        sv('path', { d: 'M0 -17L10 0L0 17L-10 0Z', fill: C.paper, stroke: C.ink, 'stroke-width': 3, 'stroke-linejoin': 'round' }, dg);
      }
      circle(wg, 0, 0, R_PO + 3, C.pocket);
      st.rot = g(wg);                                                     // tout ce qui tourne

      /* ---- cases : 38 nœuds (37 + 00) ---- */
      st.labels = ORDER.map(String).concat(['00']);
      st.nodes = st.labels.map((l) => {
        const pg = g(st.rot);
        const body = sv('path', { d: '', fill: C.pocket, stroke: C.paper, 'stroke-width': 3.5, 'stroke-linejoin': 'round' }, pg);
        const lg = g(pg);
        const k = kind(l);
        body.setAttribute('fill', k === 'red' ? C.red : k === 'zero' ? C.lime : C.pocket);
        const tx = text(lg, l, 0, 8, l === '00' ? 22 : 25, k === 'black' ? C.white : C.ink, { anchor: 'middle', mono: true });
        const veil = sv('path', { d: '', fill: C.ink, opacity: 0 }, pg);
        return { l, k, pg, body, lg, tx, veil, ie: idxEU[l], ia: idxAM[l] };
      });
      st.zero = st.nodes[0]; st.dz = st.nodes[37];
      // croisillon central
      circle(st.rot, 0, 0, R_PI, C.pocket, C.paper, 4);
      circle(st.rot, 0, 0, 140, C.ink, C.paper, 5);
      for (let i = 0; i < 4; i++) {
        const a = i * 45 * D2R;
        sv('line', { x1: -112 * Math.sin(a), y1: 112 * Math.cos(a), x2: 112 * Math.sin(a), y2: -112 * Math.cos(a), stroke: C.paper, 'stroke-width': 16, 'stroke-linecap': 'round' }, st.rot);
      }
      circle(st.rot, 0, 0, 34, C.paper, C.ink, 6);
      // surcouche du zéro : contour lime et anneaux
      st.zOut = sv('path', { d: '', fill: 'none', stroke: C.lime, 'stroke-width': 9, 'stroke-linejoin': 'round', pathLength: 1, visibility: 'hidden' }, st.rot);
      st.rings = [0, 1].map(() => circle(st.rot, 0, -(R_PI + R_PO) / 2, 10, 'none', C.lime, 8));

      /* ---- la bille (par-dessus la roue) ---- */
      st.trail = [0, 1, 2].map(() => circle(wg, 0, 0, 12, C.white));
      st.ball = g(wg);
      circle(st.ball, 5, 6, 14, C.ink);
      circle(st.ball, 0, 0, 14, C.white, C.ink, 4);

      /* ---- pastilles ROUGE / NOIRE (plans de gros plan sur la case) ---- */
      st.pills = [];
      const sr = cue('strike-red'), sb = cue('strike-black');
      if (sr != null || sb != null) {
        const mk = (label, fill, tx, edge, x, y, tStrike, tPop) => {
          const pg = g(root);
          const inner = g(pg);
          rect(inner, -190 + 12, -80 + 12, 380, 160, 30, C.ink);
          rect(inner, -190, -80, 380, 160, 30, fill, edge, 8);
          text(inner, label, 0, 32, 96, tx, { anchor: 'middle' });
          const k1 = ZV.sv('line', { x1: -225, y1: 70, x2: 225, y2: -70, stroke: C.ink, 'stroke-width': 34, 'stroke-linecap': 'round' }, pg);
          const k2 = ZV.sv('line', { x1: -225, y1: 70, x2: 225, y2: -70, stroke: C.red, 'stroke-width': 18, 'stroke-linecap': 'round' }, pg);
          return { pg, inner, k1, k2, x, y, tStrike, tPop };
        };
        const pr = Math.max(0.25, (sr == null ? 1.4 : sr) - 1.25);
        const pb = Math.max(pr + 0.5, (sb == null ? 2.2 : sb) - 1.0);
        st.pills.push(mk('ROUGE', C.red, C.ink, C.ink, 470, 250, sr, pr));
        st.pills.push(mk('NOIRE', C.pocket, C.white, C.paper, 1450, 250, sb, pb));
      }

      /* ---- paramètres de la roue ---- */
      const label0 = (v) => String(v);
      const phiOf = (l, am) => (am ? idxAM[l] * 360 / 38 : idxEU[l] * 360 / 37);
      const focusL = p.focus == null ? null : label0(p.focus);
      const landL = label0(p.land == null ? 17 : p.land);
      st.focusL = focusL;
      const tOn = cue('spin-on'), tZL = cue('zero-light');
      st.tOn = tOn;
      const T = dur * 0.96;
      st.T = T;
      st.D = W_FAST * T / 2.2;
      const phi = (t) => {
        if (spin === 'stop') return 0;
        if (spin === 'fast') return W_FAST * t;
        if (spin === 'decel') return -st.D * Math.pow(1 - Math.min(t, T) / T, 2.2);
        let v = W_SLOW * t;
        if (tOn != null && t > tOn) { const d = W_ON - W_SLOW, x = Math.min(t - tOn, RAMP); v += d * x * x / (2 * RAMP); if (t > tOn + RAMP) v += d * (t - tOn - RAMP); }
        return v;
      };
      st.phi = phi;

      /* ---- bille : scénario ---- */
      const tl = ballMode === 'orbit' ? (cue('launch') == null ? 0 : cue('launch')) : 0;
      const tClack = cue('clack'), tHes = cue('hesitate');
      let tLand = cue('land');
      const landBeat = shot.beats.find((b) => b.do === 'cue' && b.name === 'land' && b.n != null);
      const landLab = landBeat ? label0(landBeat.n) : landL;
      st.tl = tl; st.tClack = tClack; st.tHes = tHes; st.tLand = tLand; st.landLab = landLab;
      const phiK = phiOf(landLab, american0);
      let scen = 'C';
      if (ballMode === 'orbit') scen = tClack != null ? 'B' : tLand != null ? 'A' : 'C';
      st.scen = scen;
      // scénario B : orbite → claque → rebonds → hésite → tombe
      const A_C = 292.5;                                        // angle du losange percuté
      if (scen === 'B') {
        const T1 = Math.max(0.3, tClack - tl);
        const turns = Math.max(1, Math.round(T1 * 0.85));
        const Dball = 360 * turns;
        st.v0 = Dball / (0.775 * T1); st.v1 = 0.55 * st.v0; st.T1 = T1;
        const tH = tHes == null ? tClack + 0.9 : tHes;
        st.tH = tH; st.T2 = Math.max(0.2, tH - tClack);
        st.aNat2 = (q) => A_C - st.T2 * st.v1 * (q - 0.425 * q * q);
        st.hopDur = HOP * 3;
        st.tFall = tH + st.hopDur;
      }
      /* ---- décalage de la roue (θ(t) = phi(t) + off) ---- */
      let off = 0;
      const tRef = spin === 'decel' ? T : (tZL == null ? dur * 0.5 : tZL);
      if (focusL != null) {
        const pf = phiOf(focusL, american0);
        let tgt = 0;
        if (ballMode === 'orbit' && (scen === 'A' || scen === 'B') && landLab !== focusL) tgt = -wdiff(phiK - pf) / 2;
        off = tgt - pf - phi(tRef);
      } else if (scen === 'B') {
        // la bille arrive sur la case voisine A au moment exact de l'hésitation
        const idxK = american0 ? idxAM[landLab] : idxEU[landLab];
        const n = american0 ? 38 : 37;
        const phiA = ((idxK + 1) % n) * 360 / n;
        const aH = st.aNat2(1);
        off = aH - phiA - phi(st.tH);
      } else off = 20;
      st.off = off;
      st.theta = (t) => phi(t) + off;
      st.phiK = phiK; st.phiA = ((((american0 ? idxAM[landLab] : idxEU[landLab]) + 1) % (american0 ? 38 : 37))) * 360 / (american0 ? 38 : 37);

      /* ---- caméra : zoom ---- */
      st.z0 = p.zoom == null ? 1 : p.zoom;
      st.zEv = [];
      for (const b of shot.beats) if (b.do === 'cue' && b.name === 'zoom' && b.zoom != null) st.zEv.push({ t: b.t, z: b.zoom });
      if (tOn != null) st.zEv.push({ t: tOn, z: 1.4 });
      const tDZ = cue('add-double-zero');
      st.tDZ = tDZ;
      if (tDZ != null) st.zEv.push({ t: tDZ, z: 1.18 });
      st.zEv.sort((a, b) => a.t - b.t);

      /* ---- surbrillance : machine à états ---- */
      st.hl = [{ t: -1, m: p.highlight == null ? 'none' : p.highlight }];
      for (const b of shot.beats) if (b.do === 'cue' && (b.name === 'highlight-red' || b.name === 'highlight-black')) st.hl.push({ t: b.t, m: b.name === 'highlight-red' ? 'red' : 'black' });
      st.hl.sort((a, b) => a.t - b.t);

      st.tOut = cue('zero-outline'); st.tZL = tZL;
      st.zeroPaper = p.zero_state === 'paper';
      return st;
    },

    update(st, t, shot) {
      const { cx, cy, dur } = st;
      const theta = st.theta(t);

      /* ---- morph américain ---- */
      let m = st.american0 ? 1 : 0;
      if (st.tDZ != null) m = clamp(ZV.E.io3(prog(t, st.tDZ, st.tDZ + MORPH)) + (st.american0 ? 1 : 0));
      const key = Math.round(m * 1000);
      const s = 360 / (37 + m);
      if (key !== st.dKey) {
        st.dKey = key;
        const d = wedge(-s / 2, s / 2, R_PI, R_PO);
        for (const n of st.nodes) {
          n.body.setAttribute('d', d); n.veil.setAttribute('d', d);
          let ang;
          if (n.l === '00') ang = 180;
          else { const ae = n.ie * 360 / 37, aa = n.ia * 360 / 38; ang = ae + wdiff(aa - ae) * m; }
          n.ang = ang;
          const sc = n.l === '00' ? E.back(clamp(m / 0.55)) : 1;
          n.pg.setAttribute('transform', `rotate(${f2(ang)})`);
          n.pg.setAttribute('visibility', n.l === '00' && m <= 0.001 ? 'hidden' : 'visible');
          n.lg.setAttribute('transform', `translate(0 ${-R_NUM}) scale(${f2(Math.max(sc, 0.001))})`);
        }
        st.zOut.setAttribute('d', d);
      }
      st.rot.setAttribute('transform', `rotate(${f2(theta)})`);

      /* ---- voile ink 62 % ---- */
      let cur = st.hl[0], prev = st.hl[0];
      for (let i = 0; i < st.hl.length; i++) if (st.hl[i].t <= t) { prev = st.hl[Math.max(0, i - 1)]; cur = st.hl[i]; }
      const bl = cur.t < 0 ? 1 : prog(t, cur.t, cur.t + 0.2);
      const lit = (mode, n) => {
        if (mode === 'none' || mode == null) return true;
        if (mode === 'red') return n.k === 'red';
        if (mode === 'black') return n.k === 'black';
        if (mode === 'zero') return n.k === 'zero';
        if (Array.isArray(mode)) return mode.map(String).includes(n.l);
        return true;
      };
      for (const n of st.nodes) {
        const v = lerp(lit(prev.m, n) ? 0 : 0.62, lit(cur.m, n) ? 0 : 0.62, bl);
        n.veil.setAttribute('opacity', f2(v));
      }

      /* ---- le zéro : paper → contour lime → aplat lime + anneaux ---- */
      const zl = st.tZL, zo = st.tOut;
      const zeroLit = !st.zeroPaper || (zl != null && t >= zl);
      st.zero.body.setAttribute('fill', zeroLit ? C.lime : C.paper);
      st.dz.body.setAttribute('fill', C.lime);
      const lp = zl == null ? 1 : E.back(prog(t, zl, zl + 0.32));
      const zs = st.zeroPaper && zl != null ? (t < zl ? 1 : 0.35 + 0.65 * lp) : 1;
      st.zero.lg.setAttribute('transform', `translate(0 ${-R_NUM}) scale(${f2(Math.max(zs, 0.01))})`);
      const zAng = st.zero.ang || 0;
      const op = zo == null ? 0 : prog(t, zo, zo + 0.4);
      st.zOut.setAttribute('visibility', op > 0 ? 'visible' : 'hidden');
      st.zOut.setAttribute('stroke-dasharray', `${f2(op)} 2`);
      st.zOut.setAttribute('transform', `rotate(${f2(zAng)})`);
      for (let i = 0; i < 2; i++) {
        const q = zl == null ? 0 : prog(t, zl + i * 0.2, zl + i * 0.2 + 0.7);
        const r = st.rings[i];
        r.setAttribute('visibility', q > 0 && q < 1 ? 'visible' : 'hidden');
        r.setAttribute('r', f2(lerp(24, 250, E.out3(q))));
        r.setAttribute('stroke-width', f2(lerp(10, 2, q)));
        r.setAttribute('opacity', f2(1 - q * q));
        const [rx, ry] = pol(zAng, (R_PI + R_PO) / 2);
        r.setAttribute('cx', f2(rx)); r.setAttribute('cy', f2(ry));
      }

      /* ---- la bille ---- */
      const ball = ballAt(st, t, theta);
      { const [bx, by] = pol(ball.a, ball.r); put(st.ball, bx, by, 0, ball.s, ball.s, ball.o); }
      for (let i = 0; i < 3; i++) {
        const tt = t - 0.03 * (i + 1);
        const b2 = tt > st.tl && st.ballMode === 'orbit' && ball.fast ? ballAt(st, tt, st.theta(tt)) : null;
        const n = st.trail[i];
        if (!b2 || !b2.o) { n.setAttribute('visibility', 'hidden'); continue; }
        const [x, y] = pol(b2.a, b2.r);
        n.setAttribute('visibility', 'visible'); n.setAttribute('cx', f2(x)); n.setAttribute('cy', f2(y));
        n.setAttribute('r', f2(13 * b2.s * (0.78 - i * 0.18))); n.setAttribute('opacity', f2(0.55 - i * 0.16));
      }

      /* ---- caméra ---- */
      let z = st.z0;
      for (const e of st.zEv) z = lerp(z, e.z, E.io3(prog(t, e.t, e.t + 0.55)));
      let wf = st.focusL == null ? 0 : clamp((z - 1.1) / 0.5);
      if (st.tOn != null) wf *= 1 - E.io3(prog(t, st.tOn, st.tOn + 0.55));
      if (st.tDZ != null) wf *= 1 - E.io3(prog(t, st.tDZ, st.tDZ + 0.55));
      const Py = lerp(cy, cy - R_CAM, wf);
      const Sx = lerp(cx, 960, wf), Sy = lerp(cy, 470, wf);
      let [shx, shy] = st.tClack != null ? shakeAt(t, st.tClack, 10, 0.4) : [0, 0];
      const camT = `translate(${f2(Sx + shx)} ${f2(Sy + shy)}) scale(${f2(z)}) translate(${f2(-cx)} ${f2(-Py)})`;
      st.cam.setAttribute('transform', camT);

      /* ---- pastilles ROUGE / NOIRE ---- */
      for (const pl of st.pills) {
        const pp = prog(t, pl.tPop, pl.tPop + 0.4);
        const hop = pp <= 0 ? 0 : E.bounce(clamp(pp));
        const sc = pp <= 0 ? 0 : E.back(clamp(pp * 1.6));
        put(pl.pg, pl.x, pl.y - 110 * (1 - hop), -4 * (pl.x > 960 ? -1 : 1), sc, sc, pp > 0 ? 1 : 0);
        const sk = pl.tStrike == null ? 0 : prog(t, pl.tStrike, pl.tStrike + 0.2);
        for (const k of [pl.k1, pl.k2]) {
          k.setAttribute('visibility', sk > 0 ? 'visible' : 'hidden');
          k.setAttribute('x2', f2(lerp(-225, 225, E.out3(sk)))); k.setAttribute('y2', f2(lerp(70, -70, E.out3(sk))));
        }
      }
    }
  });

  // pose de la bille à l'instant t : { a: angle monde (deg), r, s: échelle, o: opacité, fast }
  function ballAt(st, t, theta) {
    const none = { a: 0, r: R_BT, s: 1, o: 0, fast: false };
    if (st.ballMode === 'none') return none;
    if (st.ballMode === 'rest') return { a: st.phiK + theta, r: R_REST, s: 1, o: 1, fast: false };
    const tl = st.tl;
    if (t < tl) return none;
    const pop = E.out3(prog(t, tl, tl + 0.2));
    const s0 = 0.4 + 0.6 * pop;
    const o = clamp((t - tl) / 0.05);
    if (st.scen === 'C') return { a: 300 - 260 * (t - tl), r: R_BT, s: s0, o, fast: true };
    if (st.scen === 'A') {
      const tLand = st.tLand;
      const landA = st.phiK + st.theta(tLand);
      if (t < tLand) {
        const p = (t - tl) / Math.max(0.2, tLand - tl);
        const D = (tLand - tl) > 1.2 ? 720 : 360;
        const a = landA + D * (1 - p) * (1 - p);
        const r = p < 0.72 ? R_BT : R_BT - (R_BT - R_REST) * E.bounce((p - 0.72) / 0.28);
        return { a, r, s: s0, o, fast: p < 0.72 };
      }
      return { a: st.phiK + theta, r: R_REST, s: 1, o: 1, fast: false };
    }
    // scénario B
    const tc = st.tClack;
    if (t < tc) {
      const p = clamp((t - tl) / st.T1);
      const dist = st.T1 * ((st.v0 * (1 - p)) + (st.v1 - st.v0) * (1 - p * p) / 2);
      return { a: 292.5 + dist, r: R_BT, s: s0, o, fast: true };
    }
    if (t < st.tH) {
      const q = clamp((t - tc) / st.T2);
      const a = st.aNat2(q);
      const rr = E.bounce(clamp((t - tc) / 0.4));
      let r = R_BT - (R_BT - R_REST) * rr, sc = 1;
      if (t - tc >= 0.4) { const hq = (t - tc - 0.4) / (st.T2 - 0.4 + 1e-6); const hop = (1 - hq) * Math.abs(Math.sin(hq * Math.PI * 4)); r = R_REST + 14 * hop; sc = 1 + 0.35 * hop; }
      return { a, r, s: sc, o: 1, fast: q < 0.35 };
    }
    if (t < st.tFall) {
      const u = (t - st.tH) / HOP, i = Math.min(2, Math.floor(u)), fr = u - i;
      const seq = [st.phiA, st.phiK, st.phiA, st.phiK];
      const sm = E.io2(fr);
      const psi = seq[i] + wdiff(seq[i + 1] - seq[i]) * sm;
      const ap = Math.sin(fr * Math.PI);
      return { a: psi + theta, r: R_REST + 18 * ap, s: 1 + 0.4 * ap, o: 1, fast: false };
    }
    return { a: st.phiK + theta, r: R_REST, s: 1, o: 1, fast: false };
  }
})();
;
/* ==== tools/video/composition/components/zone-tunnel.js ==== */
// Composant « zone-tunnel » (épisode 2, « La zone ») : voir tools/video/composition/EP2-COMPONENTS.md. Fonction pure du temps du plan, aplats seulement.
// Anneaux concentriques qui viennent vers nous ; la distance parcourue est une table cumulée (fonction de t seulement), des stickers sont aspirés au centre.
(() => {
  const { C, E, clamp, prog, lerp, f2, put, g, rect, text, circle } = ZV;
  const CX = 960, CY = 500, N = 18;
  const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
  // largeur approchée d'un libellé Bricolage 800 (on impose textLength : la mise en page ne dépend pas de la police chargée)
  const bw = (s, size) => { let a = 0; for (const ch of String(s)) a += size * (ch === ' ' ? 0.26 : /[0-9]/.test(ch) ? 0.6 : /[A-ZÀÂÉÈÊÎÔÛÇ]/.test(ch) ? 0.66 : /[.,:;'’!|]/.test(ch) ? 0.3 : 0.56); return a; };
  function stk(parent, w, h, fill, str, size, tc, sh) {
    const gr = g(parent);
    rect(gr, -w / 2 + sh, -h / 2 + sh, w, h, 18, C.ink);
    rect(gr, -w / 2, -h / 2, w, h, 18, fill, C.ink, 7);
    text(gr, str, 0, size * 0.35, size, tc, { anchor: 'middle', len: f2(bw(str, size)) });
    return gr;
  }
  const CYC = {
    lime: [C.ink, C.lime, C.ink, C.paper, C.ink, C.lime, C.ink, C.red],
    red: [C.ink, C.red, C.ink, C.paper, C.ink, C.red, C.ink, C.lime]
  };
  const SPOTS = [[470, 255, -5], [1450, 330, 4], [640, 690, -3]];
  const FILLS = [C.paper, C.lime, C.white];

  ZV.define('zone-tunnel', {
    init(root, shot) {
      const P = shot.props || {};
      const st = { dur: Math.max(0.1, shot.dur || 1) };
      st.speed = clamp(num(P.speed, 1), 0.1, 4);
      st.labels = (Array.isArray(P.labels) && P.labels.length ? P.labels : ["L'HEURE", "L'ARGENT", 'TON CORPS']).slice(0, 3).map(String);
      st.final = P.final != null ? String(P.final) : 'LE TOUR SUIVANT';
      st.cyc = CYC[P.palette === 'red' ? 'red' : 'lime'];
      const cu = (n) => ZV.cue(shot, n);
      st.cE = cu('enter'); st.cN = cu('next'); st.cX = cu('exit');
      st.lose = [cu('lose-1'), cu('lose-2'), cu('lose-3')];
      const none = st.cE === null && st.cN === null && st.cX === null && st.lose.every((x) => x === null);
      if (none) st.cE = 0.3;
      const ex = ZV.cues(shot, 'exit')[0];
      st.exitText = ex && ex.text ? String(ex.text) : '';
      // distance cumulée (en anneaux) : table à 60 pas/s, interpolée
      const rate = (t) => {
        let v = 0.16;
        if (st.cE !== null && t >= st.cE) v = 0.16 + 1.9 * E.io2(prog(t, st.cE, st.cE + 3.5)) + Math.min(0.9, 0.12 * Math.max(0, t - st.cE - 3.5));
        if (st.cN !== null && t >= st.cN) v += 2.6 * E.out2(prog(t, st.cN, st.cN + 0.9));
        if (st.cX !== null && t >= st.cX) v *= 1 - E.out2(prog(t, st.cX, st.cX + 0.9));
        return Math.min(3, v * st.speed * 0.54);        // ≤ 3 anneaux/s : un point de l'écran ne change jamais de couleur plus de 3 fois par seconde
      };
      const STEP = 1 / 60, n = Math.ceil(st.dur / STEP) + 3;
      st.tab = new Float64Array(n);
      for (let i = 1; i < n; i++) st.tab[i] = st.tab[i - 1] + 0.5 * STEP * (rate((i - 1) * STEP) + rate(i * STEP));
      st.STEP = STEP; st.rateEnd = rate((n - 1) * STEP);

      rect(root, 0, 0, 1920, 1080, 0, C.paper);
      st.rings = [];
      for (let j = 0; j < N; j++) st.rings.push(circle(root, CX, CY, 10, C.ink, C.ink, 4));
      st.cover = circle(root, CX, CY, 1, C.paper, C.ink, 8);   // aplat paper qui s'étend une seule fois (retour au réel)
      st.dot = g(root);
      circle(st.dot, 0, 0, 20, C.white, C.ink, 6);
      st.lab = st.labels.map((s, i) => {
        const size = 62, w = bw(s, size) + 84, gr = stk(root, w, 104, FILLS[i % 3], s, size, C.ink, 10);
        return { g: gr };
      });
      const fs = Math.min(128, 1320 / (bw(st.final, 1) || 1));
      st.fin = stk(root, bw(st.final, fs) + 130, fs * 1.55, C.lime, st.final, fs, C.ink, 14);
      const ps = 170;
      st.pan = st.exitText ? stk(root, bw(st.exitText, ps) + 110, ps * 1.5, C.red, st.exitText, ps, C.ink, 14) : null;
      return st;
    },

    update(st, t, shot) {
      try {
        t = clamp(t, 0, st.dur + 1);
        const fi = Math.min(st.tab.length - 2, Math.max(0, t / st.STEP)), i0 = Math.floor(fi);
        const s = lerp(st.tab[i0], st.tab[i0 + 1], fi - i0);
        const base = Math.floor(s), frac = s - base, L = st.cyc.length;
        const tD = st.cX !== null ? st.cX + 0.9 : 1e9;
        for (let j = 0; j < N; j++) {
          const i = N - 1 - j, u = (frac + i) / N;
          let r = 8 + 1330 * Math.pow(u, 2.1);
          const nd = st.rings[j];
          nd.setAttribute('r', f2(Math.max(0.01, r)));
          nd.setAttribute('fill', st.cyc[(((base - i) % L) + L) % L]);
          nd.setAttribute('stroke-width', f2(2 + 7 * u));
          nd.setAttribute('visibility', r < 0.5 ? 'hidden' : 'visible');
        }
        { const q = E.in2(prog(t, tD, tD + 0.6)), rr = 1350 * q; st.cover.setAttribute('r', f2(Math.max(0.01, rr))); st.cover.setAttribute('visibility', q > 0 ? 'visible' : 'hidden'); }
        // point central
        const gone = t > tD + 0.2;
        const pul = 1 + 0.12 * Math.sin(t * 7) + (st.cN !== null && t >= st.cN ? 0.35 : 0);
        put(st.dot, CX, CY, 0, gone ? 0 : pul, gone ? 0 : pul, gone ? 0 : 1);
        // stickers « L'HEURE » …
        for (let k = 0; k < st.lab.length; k++) {
          const sp = SPOTS[k], tl = st.lose[k];
          const pop = E.back(prog(t, 0.15 + 0.14 * k, 0.55 + 0.14 * k));
          let x = sp[0] + 10 * Math.sin(t * 1.7 + k * 2.1), y = sp[1] + 12 * Math.cos(t * 1.3 + k * 1.7), r = sp[2] + 1.5 * Math.sin(t * 2.2 + k), sc = pop, o = 1;
          if (tl !== null && t >= tl) {
            const p = prog(t, tl, tl + 0.8), e = E.in3(p);
            x = lerp(x, CX, e); y = lerp(y, CY, e); r += 520 * e; sc = lerp(1, 0.04, e);
            if (p >= 1) o = 0;
          }
          if (t > tD - 0.9 && st.cX !== null) o = 0;
          put(st.lab[k].g, x, y, r, sc, sc, o);
        }
        // texte final
        let fo = 0, fs = 1;
        if (st.cN !== null && t >= st.cN + 0.2) {
          fs = E.back(prog(t, st.cN + 0.2, st.cN + 0.5)) * (1 + 0.035 * Math.sin((t - st.cN) * 9));
          fo = 1;
          if (st.cX !== null && t > st.cX + 0.3) fo = 0;
        }
        put(st.fin, CX, CY, -2, fs, fs, fo);
        if (st.pan) {
          const tp = tD + 0.5, p = E.back(prog(t, tp, tp + 0.25)), sh = ZV.shakeAt(t, tp + 0.18, 9, 0.35);
          put(st.pan, CX + sh[0], CY + sh[1], -6, p, p, t >= tp ? 1 : 0);
        }
      } catch (e) { /* jamais d'exception */ }
    }
  });
})();
;
/* ==== tools/video/composition/embed-prelude.js ==== */
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
;
/* ==== tools/video/composition/core.js ==== */
// Noyau de la composition ZÉRO VERT : assemble les plans, les beats communs, les transitions et les sous-titres.
// Expose window.renderAt(T) (T absolu en secondes) et window.__ready. TOUT est une fonction pure de T : aucun état entre appels visible
// dans l'image, aucune horloge. Les instances de composants sont créées une fois (init) puis seulement mises à jour (update).
// Paramètres d'URL de mise au point : ?t=12.5 (rend cet instant) · ?force=<id> (tous les plans utilisent ce composant) ·
// ?extra=<url> (script supplémentaire chargé après les composants) · ?nocaps=1.
// Intégration dans une page du site (sans changer le rendu vidéo) : définir AVANT ce fichier
//   window.ZV_CONFIG = { timelineUrl, componentsInline: true, mount: <élément>, size: 'fluid', autoBoot: false }
// puis utiliser window.ZVEmbed = { ready: Promise, boot(), renderAt(T), total, fps, timeline }. Sans ZV_CONFIG, rien ne change.
(() => {
  'use strict';
  const Z = window.ZV;
  const { C, W, H, E, clamp, prog, lerp, f2, sv, g, rect, circle, path, line, text, put, shakeAt, sticker } = Z;
  const CFG = window.ZV_CONFIG || null;   // null = page de rendu (index.html) ; sinon intégration dans le site
  const Q = new URLSearchParams(CFG ? '' : location.search);
  const COMP_DIR = '/tools/video/composition/components/';
  const INK = C.ink, GREY = C.grey;
  let TL = null, FPS = 30, TOTAL = 0;
  let svg, stage, capsLayer, fxLayer, measureG;
  const FORCE = Q.get('force') || '';

  /* ------------------------------------------------------------------ utilitaires */
  const frames = (n) => n / FPS;
  const col = (c) => ({ lime: C.lime, paper: C.paper, red: C.red, white: C.white, ink: C.ink, grey: C.grey, pocket: C.pocket })[c] || (typeof c === 'string' && c[0] === '#' ? c : C.lime);
  const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
  function measure(str, size, mono, weight) {
    try {
      const n = Z.text(measureG, str, 0, 0, size, '#000', { mono, weight });
      let w = n.getComputedTextLength();
      measureG.removeChild(n);
      if (!(w > 0)) w = str.length * size * 0.6;
      return w;
    } catch (e) { return str.length * size * 0.6; }
  }
  const safe = (fn, fallback) => { try { return fn(); } catch (e) { if (!safe.warned) { safe.warned = 1; console.error('[core]', e && e.stack || e); } return fallback; } };
  function setT(n, x, y, r, sx, sy) { n.setAttribute('transform', `translate(${f2(x)} ${f2(y)}) rotate(${f2(r)}) scale(${f2(sx)} ${f2(sy === undefined ? sx : sy)})`); }
  const vis = (n, on) => n.setAttribute('visibility', on ? 'visible' : 'hidden');
  const disp = (n, on) => { const v = on ? 'inline' : 'none'; if (n.__d !== v) { n.__d = v; n.setAttribute('display', v); } };

  /* ------------------------------------------------------------------ beats communs (par-dessus le composant) */
  // pop back-ease (scale 0 → 1.12 → 1) sur `dur` secondes
  function popScale(p) { if (p <= 0) return 0; if (p >= 1) return 1; return p < 0.6 ? lerp(0, 1.12, E.out2(p / 0.6)) : lerp(1.12, 1, (p - 0.6) / 0.4); }

  function buildSticker(parent, b) {
    const label = String(b.text == null ? '' : b.text);
    let size = 60;
    let tw = measure(label, size);
    if (tw > 1000) { size = Math.max(32, Math.floor(size * 1000 / tw)); tw = measure(label, size); }
    const w = Math.round(tw + 68), h = Math.round(size + 40);
    const wrap = g(parent);
    const inner = Z.sticker(wrap, w, h, col(b.color), label, size, INK);
    const x = clamp(num(b.x, 1400), w / 2 + 30, W - w / 2 - 30), y = clamp(num(b.y, 240), h / 2 + 20, H - h / 2 - 20);
    return { kind: 'sticker', b, wrap, w, h, x, y, tilt: num(b.tilt, 0), strike: null, update(t) {
      const p = (t - b.t) / frames(8);
      const s = popScale(p);
      put(wrap, x, y, this.tilt, s, s, 1);
    } };
  }

  function buildStamp(parent, b) {
    const label = String(b.text == null ? '' : b.text);
    const k = num(b.scale, 1);
    let size = 112;
    let tw = measure(label, size);
    if (tw > 1500) { size = Math.floor(size * 1500 / tw); tw = measure(label, size); }
    const w = Math.round(tw + 110), h = Math.round(size + 70);
    const wrap = g(parent);
    const body = g(wrap);
    rect(body, -w / 2 + 12, -h / 2 + 12, w, h, 16, INK);
    rect(body, -w / 2, -h / 2, w, h, 16, col(b.color || 'red'), INK, 10);
    rect(body, -w / 2 + 18, -h / 2 + 18, w - 36, h - 36, 8, 'none', INK, 4);
    text(body, label, 0, size * 0.35, size, INK, { anchor: 'middle', spacing: -1 });
    const x = num(b.x, 960), y = num(b.y, 520), tilt = num(b.tilt, -8);
    return { kind: 'stamp', b, wrap, update(t) {
      const p = (t - b.t) / frames(5);
      if (p < 0) { vis(wrap, false); return; }
      const s = k * lerp(2.6, 1, E.in2(clamp(p)));
      put(wrap, x, y, tilt, s, s, 1);
    } };
  }

  function buildCount(parent, b) {
    const to = clamp(Math.round(num(b.to, 5)), 1, 60);
    const wrap = g(parent);
    const marks = [];
    const tally = (b.style || 'tally') === 'tally';
    if (tally) {
      const groups = Math.ceil(to / 5), gw = 152, gap = 80;
      const totalW = groups * gw + (groups - 1) * gap;
      for (let m = 0; m < to; m++) {
        const gi = Math.floor(m / 5), k = m % 5;
        const gx = -totalW / 2 + gi * (gw + gap);
        const mg = g(wrap);
        const mk = (x1, y1, x2, y2) => { line(mg, x1, y1, x2, y2, INK, 26); line(mg, x1, y1, x2, y2, C.paper, 12); };
        if (k < 4) { const cx = gx + 8 + k * 38; mk(cx, -52, cx, 52); marks.push({ mg, cx, cy: 0 }); }
        else { mk(gx - 10, 40, gx + gw + 10, -40); marks.push({ mg, cx: gx + gw / 2, cy: 0 }); }
      }
    } else {
      const label = String(b.text == null ? '×' : b.text);
      const step = Math.min(120, 1500 / to);
      for (let m = 0; m < to; m++) {
        const mg = g(wrap);
        const cx = -((to - 1) * step) / 2 + m * step;
        text(mg, label, cx, 30, 96, C.lime, { anchor: 'middle', mono: true });
        marks.push({ mg, cx, cy: 0 });
      }
    }
    const x = num(b.x, 960), y = num(b.y, 770);
    wrap.setAttribute('transform', `translate(${x} ${y})`);
    return { kind: 'count', b, wrap, update(t) {
      for (let m = 0; m < marks.length; m++) {
        const mk = marks[m];
        const p = (t - (b.t + m * frames(1.5))) / frames(3);
        if (p < 0) { vis(mk.mg, false); continue; }
        const s = lerp(1.8, 1, E.out2(clamp(p)));
        mk.mg.setAttribute('transform', `translate(${f2(mk.cx)} ${f2(mk.cy)}) scale(${f2(s)}) translate(${f2(-mk.cx)} ${f2(-mk.cy)})`);
        vis(mk.mg, true);
      }
    } };
  }

  function buildStrike(parent, b, items) {
    let host = null;
    if (!b.target || b.target === 'last-sticker') for (const it of items) if (it.kind === 'sticker' && it.b.t <= b.t + 1e-6) host = it;
    const lg = g(host ? host.wrap : parent);
    let x1, x2, y1, y2;
    if (host) { x1 = -host.w / 2 - 14; x2 = host.w / 2 + 14; y1 = y2 = 0; }
    else { x1 = 240; x2 = 1680; y1 = 400; y2 = 640; }
    line(lg, x1, y1, x2, y2, INK, 26);
    const red = line(lg, x1, y1, x2, y2, C.red, 18);
    const shadow = lg.firstChild;
    return { kind: 'strike', b, wrap: lg, update(t) {
      const p = clamp((t - b.t) / frames(6));
      if (t < b.t) { vis(lg, false); return; }
      vis(lg, true);
      const ex = lerp(x1, x2, E.out2(p)), ey = lerp(y1, y2, E.out2(p));
      red.setAttribute('x2', f2(ex)); red.setAttribute('y2', f2(ey));
      shadow.setAttribute('x2', f2(ex + (p < 1 ? 0 : 0))); shadow.setAttribute('y2', f2(ey));
    } };
  }

  // construit les calques de beats communs d'un plan ; renvoie {items, shakes[], freezeT}
  function buildOverlay(parent, shot) {
    const items = [], shakes = [];
    let freezeT = null;
    for (const b of shot.beats || []) {
      if (!b || typeof b.t !== 'number') continue;
      if (b.do === 'sticker') items.push(safe(() => buildSticker(parent, b)));
      else if (b.do === 'stamp') { const s = safe(() => buildStamp(parent, b)); if (s) items.push(s); shakes.push({ t0: b.t + frames(5), amp: num(b.amp, 14), dur: frames(12) }); }
      else if (b.do === 'count') items.push(safe(() => buildCount(parent, b)));
      else if (b.do === 'strike') items.push(safe(() => buildStrike(parent, b, items.filter(Boolean))));
      else if (b.do === 'shake') shakes.push({ t0: b.t, amp: num(b.amp, 10), dur: frames(12) });
      else if (b.do === 'freeze') { if (freezeT === null || b.t < freezeT) freezeT = b.t; }
    }
    return { items: items.filter(Boolean), shakes, freezeT };
  }

  /* ------------------------------------------------------------------ instances de plans */
  const inst = new Map();
  function getInst(shot) {
    let it = inst.get(shot.id);
    if (it) return it;
    const wrap = g(stage), shk = g(wrap), root = g(shk), over = g(shk);
    wrap.setAttribute('id', 'zv-' + shot.id);
    it = { shot, wrap, shk, root, over, st: null, impl: null, ov: null, missing: false };
    inst.set(shot.id, it);
    const compId = FORCE || shot.component;
    const impl = Z.REG[compId];
    let ok = false;
    if (impl && typeof impl.init === 'function') {
      try { it.st = impl.init(root, shot); it.impl = impl; ok = true; } catch (e) { console.error('[core] init', shot.id, compId, e && e.stack || e); while (root.firstChild) root.removeChild(root.firstChild); }
    }
    if (!ok) {
      it.missing = true;
      rect(root, 0, 0, W, H, 0, INK);
      text(root, `composant « ${compId} » manquant`, W / 2, 520, 70, C.red, { anchor: 'middle' });
      text(root, `plan ${shot.id}`, W / 2, 600, 36, C.paper, { anchor: 'middle', mono: true });
    }
    it.ov = safe(() => buildOverlay(over, shot), { items: [], shakes: [], freezeT: null });
    wrap.setAttribute('display', 'none'); wrap.__d = 'none';
    return it;
  }
  // met le plan à jour à l'instant T ; renvoie les décalages de tremblement (px)
  function drawInst(it, T) {
    const shot = it.shot;
    const t = clamp(T - shot.start, 0, shot.dur);
    let te = t;
    if (it.ov.freezeT !== null && te > it.ov.freezeT) te = it.ov.freezeT;
    if (it.impl) { try { it.impl.update(it.st, te, shot); } catch (e) { if (!it.warned) { it.warned = 1; console.error('[core] update', shot.id, e && e.stack || e); } } }
    for (const o of it.ov.items) safe(() => o.update(t));
    let dx = 0, dy = 0;
    for (const s of it.ov.shakes) { const [ax, ay] = shakeAt(t, s.t0, s.amp, s.dur); dx += ax; dy += ay; }
    it.shk.setAttribute('transform', dx || dy ? `translate(${f2(dx)} ${f2(dy)})` : '');
  }

  /* ------------------------------------------------------------------ transitions */
  const S_SLANT = Math.round(H * Math.tan(14 * Math.PI / 180));   // 269 px : bande inclinée de −14°
  let FX = null;
  function buildFx() {
    FX = {};
    FX.band = sv('polygon', { points: '0,0 0,0 0,0 0,0', fill: C.lime }, fxLayer);
    FX.blades = []; for (let i = 0; i < 5; i++) FX.blades.push(rect(fxLayer, i * 384 - 1, 0, 386, 0, 0, INK, null, 0, { 'shape-rendering': 'crispEdges' }));
    FX.iris = circle(fxLayer, 960, 540, 0, C.lime, INK, 10);
    FX.glitch = sv('g', {}, fxLayer);
    FX.slices = [];
    for (let i = 0; i < 9; i++) {
      const s = sv('svg', { x: 0, y: 0, width: W, height: 100, viewBox: `0 0 ${W} 100`, overflow: 'hidden' }, FX.glitch);
      const u = sv('use', {}, s);
      const bar = rect(s, 0, 0, W, 100, 0, INK);
      FX.slices.push({ s, u, bar });
    }
    for (const k in FX) if (k !== 'blades' && k !== 'slices') FX[k].setAttribute('display', 'none');
    FX.blades.forEach((b) => b.setAttribute('display', 'none'));
  }
  function fxOff() {
    FX.band.setAttribute('display', 'none'); FX.iris.setAttribute('display', 'none'); FX.glitch.setAttribute('display', 'none');
    for (const b of FX.blades) b.setAttribute('display', 'none');
  }
  function trSpec(id) {
    const spec = TL.transitions && TL.transitions[id];
    const n = spec && typeof spec.frames === 'number' ? spec.frames : 0;
    if (!(n > 0)) return null;
    const half = frames(n / 2), all = frames(n);
    if (id === 'wipe-lime' || id === 'wipe-red' || id === 'wipe-ink') return { id, kind: 'wipe', pre: half, post: half };
    if (id === 'shutter') return { id, kind: 'shutter', pre: half, post: half };
    if (id === 'push-left' || id === 'push-up') return { id, kind: 'push', pre: half, post: half };
    if (id === 'slam') return { id, kind: 'slam', pre: 0, post: all };
    if (id === 'iris-zero') return { id, kind: 'iris', pre: all, post: 0 };
    if (id === 'glitch') return { id, kind: 'glitch', pre: all, post: 0 };
    return null;
  }

  function drawBand(p, id) {
    const FAR = 260, k = S_SLANT / H;
    let xl, xr;
    if (p < 0.5) { xr = lerp(-S_SLANT, W, E.out2(p / 0.5)); xl = -S_SLANT - FAR; }
    else { xl = lerp(-S_SLANT, W, E.in2((p - 0.5) / 0.5)); xr = W + FAR; }
    const y0 = -12, y1 = H + 12;
    const at = (x, y) => `${f2(x + y * k)},${y}`;
    FX.band.setAttribute('points', `${at(xl, y0)} ${at(xr, y0)} ${at(xr, y1)} ${at(xl, y1)}`);
    FX.band.setAttribute('fill', id === 'wipe-red' ? C.red : id === 'wipe-ink' ? INK : C.lime);
    if (id === 'wipe-ink') { FX.band.setAttribute('stroke', C.lime); FX.band.setAttribute('stroke-width', 8); FX.band.setAttribute('stroke-linejoin', 'miter'); }
    else { FX.band.removeAttribute('stroke'); FX.band.removeAttribute('stroke-width'); }
    disp(FX.band, true); FX.band.setAttribute('display', 'inline');
  }
  function drawShutter(p) {
    const f = p * 10;
    for (let i = 0; i < 5; i++) {
      const c = clamp((f - i * 0.9) / 1.4), o = clamp((f - 5 - i * 0.9) / 1.4);
      let y = 0, h = 0;
      if (o > 0) { y = H * E.in2(o); h = H - y; } else { h = H * E.out2(c); }
      const b = FX.blades[i];
      if (h < 0.5) { b.setAttribute('display', 'none'); continue; }
      b.setAttribute('display', 'inline'); b.setAttribute('y', f2(y)); b.setAttribute('height', f2(h + 0.5));
    }
  }
  function drawIris(p, origin) {
    const [ox, oy] = origin;
    const R = Math.max(Math.hypot(ox, oy), Math.hypot(W - ox, oy), Math.hypot(ox, H - oy), Math.hypot(W - ox, H - oy)) + 12;
    const r = R * E.io2(Math.min(1, p * 1.08));
    FX.iris.setAttribute('cx', f2(ox)); FX.iris.setAttribute('cy', f2(oy)); FX.iris.setAttribute('r', f2(r));
    FX.iris.setAttribute('display', r < 0.5 ? 'none' : 'inline');
  }
  function drawGlitch(T, ws, oldId, seedBase) {
    const fi = Math.floor((T - ws) * FPS + 1e-4);
    const rnd = Z.rng(seedBase * 131 + fi * 7919 + 11);
    // 9 tranches de hauteurs aléatoires qui couvrent le cadre
    const wts = []; let sum = 0; for (let i = 0; i < 9; i++) { const v = 0.4 + rnd(); wts.push(v); sum += v; }
    const cuts = [0]; let acc = 0; for (let i = 0; i < 9; i++) { acc += wts[i] / sum; cuts.push(i === 8 ? 1 : acc); }
    FX.glitch.setAttribute('display', 'inline');
    for (let i = 0; i < 9; i++) {
      const y0 = Math.round(cuts[i] * H), y1 = Math.round(cuts[i + 1] * H), h = Math.max(1, y1 - y0);
      const sl = FX.slices[i];
      const r = rnd(), dx = (rnd() < 0.7 ? 1 : 0) * Math.round((rnd() - 0.5) * 2 * (60 + 180 * rnd()));
      sl.s.setAttribute('y', y0); sl.s.setAttribute('height', h); sl.s.setAttribute('viewBox', `0 ${y0} ${W} ${h}`);
      sl.u.setAttribute('href', '#zv-' + oldId); sl.u.setAttribute('transform', `translate(${dx} 0)`);
      const flat = r < 0.22;
      sl.bar.setAttribute('y', y0); sl.bar.setAttribute('height', h); sl.bar.setAttribute('fill', r < 0.11 ? C.lime : INK);
      sl.bar.setAttribute('display', flat ? 'inline' : 'none');
    }
  }

  /* ------------------------------------------------------------------ sous-titres karaoké */
  let CAP = null;       // {groups:[...]}
  const CS = 50, LH = 62, PX = 30, PY = 16;
  // Étiquette « locuteur » (débats à plusieurs voix) : les phrases du timeline portent alors `v` ('theo' | 'tom' | 'arthur').
  // Sans `v` nulle part : aucun changement de rendu (position du sticker 948 comprise).
  const SPK = { theo: { name: 'THÉO', bg: C.lime }, tom: { name: 'TOM', bg: C.red }, arthur: { name: 'ARTHUR', bg: C.paper } };
  const SPK_FS = 27, SPK_H = 42, SPK_OVER = 10, SPK_SHIFT = 20;   // corps du texte, hauteur, recouvrement du bord haut du sticker, descente du sticker (étiquette ≥ y 856 ; bas du sticker + ombre + tilt ≤ 1064)
  function chunkSentence(words, bounds) {
    const n = words.length;
    if (!n) return [];
    const best = new Array(n + 1).fill(Infinity), prev = new Array(n + 1).fill(-1);
    best[0] = 0;
    for (let b = 1; b <= n; b++) {
      for (let L = 1; L <= 9 && L <= b; L++) {
        const a = b - L;
        if (best[a] === Infinity) continue;
        let chars = -1; for (let i = a; i < b; i++) chars += words[i].w.length + 1;
        if (chars > 78 && L > 1) continue;
        let c = 8 + 0.5 * (L - 6) * (L - 6);
        if (L < 3 && n >= 3) c += 40 * (3 - L);
        if (b < n) {
          const last = words[b - 1].w, gap = words[b].start - words[b - 1].end;
          if (/[,;:]$/.test(last)) c -= 12; else if (gap >= 0.3) c -= 5;
          if (/^(le|la|les|l|un|une|de|des|du|d|à|au|aux|et|ou|que|qui|en|ce|se|ne|sa|son|ses|mon|ma|mes|ta|ton|tes|tu|il|elle|je|me|te|y|on|nous|vous|ils|elles|pas)$/i.test(last.replace(/[^\p{L}]/gu, ''))) c += 6;
        }
        for (const B of bounds) for (let ci = a + 1; ci < b; ci++) if (Math.abs(B - (words[ci - 1].end + words[ci].start) / 2) < 0.3) c += 30;
        if (best[a] + c < best[b]) { best[b] = best[a] + c; prev[b] = a; }
      }
    }
    const cuts = []; for (let b = n; b > 0; b = prev[b]) { if (prev[b] < 0) return [words]; cuts.push([prev[b], b]); }
    return cuts.reverse().map(([a, b]) => words.slice(a, b));
  }
  function buildCaptionIndex() {
    const bounds = TL.shots.slice(1).map((s) => s.start);
    const groups = [];
    for (const sen of TL.sentences || []) {
      const words = (sen.words || []).filter((w) => w && typeof w.w === 'string');
      const v = SPK[sen.v] ? sen.v : null;
      for (const ws of chunkSentence(words, bounds)) groups.push({ words: ws, start: ws[0].start - 0.1, end: ws[ws.length - 1].end + 0.25, node: null, v });
    }
    groups.sort((a, b) => a.start - b.start);
    for (let i = 0; i + 1 < groups.length; i++) if (groups[i].end > groups[i + 1].start) groups[i].end = Math.max(groups[i].start + 0.05, groups[i + 1].start);
    // locuteur : un groupe vient d'UNE phrase (chunkSentence), donc d'un seul `v` ; pop quand il change d'un groupe au suivant
    let hasV = false;
    for (let i = 0; i < groups.length; i++) { const gr = groups[i]; gr.newSpk = !!gr.v && (i === 0 || groups[i - 1].v !== gr.v); if (gr.v) hasV = true; }
    CAP = { groups, hasV };
  }
  function buildCaptionNode(grp) {
    const gw = sv('g', {});
    const ws = grp.words;
    const widths = ws.map((w) => measure(w.w, CS));
    const space = Math.max(8, measure('a a', CS) - measure('aa', CS));
    // coupe en 1 ou 2 lignes (40 caractères max par ligne si possible)
    const total = ws.reduce((s, w) => s + w.w.length + 1, -1);
    let lines = [ws.map((_, i) => i)];
    if (total > 40 && ws.length > 1) {
      let bestK = 1, bestV = Infinity;
      for (let k = 1; k < ws.length; k++) {
        let c1 = -1, c2 = -1; for (let i = 0; i < k; i++) c1 += ws[i].w.length + 1; for (let i = k; i < ws.length; i++) c2 += ws[i].w.length + 1;
        const v = Math.max(c1, c2); if (v < bestV) { bestV = v; bestK = k; }
      }
      lines = [Array.from({ length: bestK }, (_, i) => i), Array.from({ length: ws.length - bestK }, (_, i) => bestK + i)];
    }
    const lw = lines.map((l) => l.reduce((s, i) => s + widths[i], 0) + (l.length - 1) * space);
    const bw = Math.round(Math.max(...lw) + 2 * PX), bh = lines.length * LH + 2 * PY;
    rect(gw, -bw / 2 + 8, -bh / 2 + 8, bw, bh, 20, INK);
    rect(gw, -bw / 2, -bh / 2, bw, bh, 20, C.paper, INK, 6);
    const pill = rect(gw, 0, 0, 10, 10, 10, C.lime);
    const items = new Array(ws.length);
    lines.forEach((l, li) => {
      const cy = -bh / 2 + PY + LH * (li + 0.5);
      let x = -lw[li] / 2;
      for (const i of l) {
        const el = text(gw, ws[i].w, f2(x), f2(cy + CS * 0.35), CS, GREY, {});
        items[i] = { el, x, w: widths[i], cy, state: -1 };
        x += widths[i] + space;
      }
    });
    // étiquette locuteur, collée au coin supérieur gauche du sticker (origine du groupe lg = son coin inférieur gauche)
    let tag = null;
    if (grp.v) {
      const sp = SPK[grp.v], label = sp.name, ls = 1.5;
      const tw = measure(label, SPK_FS) + ls * label.length, w = Math.round(tw + 36), h = SPK_H;
      const lg = g(gw);
      rect(lg, 6, -h + 6, w, h, h / 2, INK);
      rect(lg, 0, -h, w, h, h / 2, sp.bg, INK, 4);
      text(lg, label, f2(w / 2 + ls / 2), f2(-h / 2 + SPK_FS * 0.35), SPK_FS, INK, { anchor: 'middle', spacing: ls });
      tag = { lg, x: -bw / 2 + 8, y: -bh / 2 + SPK_OVER };
      lg.setAttribute('transform', `translate(${f2(tag.x)} ${f2(tag.y)})`);
    }
    return { gw, items, pill, bw, bh, tag };
  }
  function drawCaptions(T, shot) {
    let grp = null;
    if (CAP && shot && shot.captions !== false && !Q.get('nocaps')) {
      const gs = CAP.groups; let lo = 0, hi = gs.length - 1, r = -1;
      while (lo <= hi) { const m = (lo + hi) >> 1; if (gs[m].start <= T) { r = m; lo = m + 1; } else hi = m - 1; }
      if (r >= 0 && T < gs[r].end) grp = gs[r];
    }
    if (!grp) { if (capsLayer.firstChild) capsLayer.replaceChildren(); return; }
    if (!grp.node) grp.node = buildCaptionNode(grp);
    const nd = grp.node;
    if (capsLayer.firstChild !== nd.gw) capsLayer.replaceChildren(nd.gw);
    const pa = prog(T, grp.start, grp.start + frames(4));
    const s = pa >= 1 ? 1 : lerp(0.8, 1, E.back(pa));
    nd.gw.setAttribute('transform', `translate(960 ${CAP.hasV ? 948 + SPK_SHIFT : 948}) rotate(-1) scale(${f2(s)})`);
    if (nd.tag) {
      const ps = grp.newSpk ? lerp(0.55, 1, E.back(prog(T, grp.start, grp.start + frames(3)))) : 1;
      nd.tag.lg.setAttribute('transform', `translate(${f2(nd.tag.x)} ${f2(nd.tag.y)}) scale(${f2(ps)})`);
    }
    const ws = grp.words;
    let lit = -1;
    for (let j = 0; j < ws.length; j++) {
      const w = ws[j];
      const end = Math.min(j + 1 < ws.length ? ws[j + 1].start : Infinity, w.end + 0.15);
      if (T >= w.start && T < end) lit = j;
      const st = T >= w.start ? 1 : 0;
      const it = nd.items[j];
      if (it.state !== st) { it.state = st; it.el.setAttribute('fill', st ? INK : GREY); }
    }
    if (lit < 0) nd.pill.setAttribute('display', 'none');
    else {
      const it = nd.items[lit], sc = lerp(1.06, 1, prog(T, ws[lit].start, ws[lit].start + frames(3)));
      const pw = (it.w + 16) * sc, ph = (CS + 8) * sc, cx = it.x + it.w / 2;
      nd.pill.setAttribute('display', 'inline');
      nd.pill.setAttribute('x', f2(cx - pw / 2)); nd.pill.setAttribute('y', f2(it.cy - ph / 2)); nd.pill.setAttribute('width', f2(pw)); nd.pill.setAttribute('height', f2(ph));
    }
  }

  /* ------------------------------------------------------------------ rendu d'une image */
  let shown = [];
  function present(list) {
    for (const it of shown) if (!list.includes(it)) disp(it.wrap, false);
    for (const it of list) { if (stage.lastChild !== it.wrap || list.length > 1) stage.appendChild(it.wrap); disp(it.wrap, true); }
    shown = list;
  }
  function wrapXf(it, x, y, s, cx, cy) {
    if (s === undefined) s = 1;
    it.wrap.setAttribute('transform', x || y || s !== 1 ? `translate(${f2(x + cx * (1 - s))} ${f2(y + cy * (1 - s))}) scale(${f2(s)})` : '');
  }
  function findShot(T) {
    const sh = TL.shots; let lo = 0, hi = sh.length - 1, r = 0;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (sh[m].start <= T) { r = m; lo = m + 1; } else hi = m - 1; }
    return r;
  }
  function render(T) {
    T = clamp(num(T, 0), 0, TOTAL - 1e-6);
    const sh = TL.shots, i = findShot(T), cur = sh[i];
    let mode = null;
    if (i > 0) { const tr = trSpec(cur.in); if (tr && tr.post > 0 && T < cur.start + tr.post) mode = { tr, old: sh[i - 1], neu: cur, B: cur.start, ni: i }; }
    if (!mode && i + 1 < sh.length) { const nx = sh[i + 1], tr = trSpec(nx.in); if (tr && tr.pre > 0 && T >= nx.start - tr.pre) mode = { tr, old: cur, neu: nx, B: nx.start, ni: i + 1 }; }
    fxOff();
    let activeShot = cur;
    if (!mode) {
      const a = getInst(cur); wrapXf(a, 0, 0, 1, 0, 0); present([a]); drawInst(a, T);
    } else {
      const { tr, old, neu, B } = mode;
      const ws = B - tr.pre, p = clamp((T - ws) / (tr.pre + tr.post), 0, 0.999999);
      const swapped = T >= B;
      const A = getInst(old), N = getInst(neu);
      if (tr.kind === 'wipe' || tr.kind === 'shutter') {
        const base = swapped ? N : A; activeShot = base.shot;
        wrapXf(base, 0, 0, 1, 0, 0); present([base]); drawInst(base, T);
        if (tr.kind === 'wipe') drawBand(p, tr.id); else drawShutter(p);
      } else if (tr.kind === 'push') {
        const e = E.io3(p), left = tr.id === 'push-left';
        activeShot = swapped ? neu : old;
        wrapXf(A, left ? -W * e : 0, left ? 0 : -H * e, 1, 0, 0);
        wrapXf(N, left ? W * (1 - e) : 0, left ? 0 : H * (1 - e), 1, 0, 0);
        present([A, N]); drawInst(A, T); drawInst(N, T);
      } else if (tr.kind === 'slam') {
        activeShot = neu;
        const s = lerp(1.15, 1, E.out2(p));
        const [sx, sy] = shakeAt(T, B, 10, 0.25);
        wrapXf(N, sx, sy, s, W / 2, H / 2); present([N]); drawInst(N, T);
      } else if (tr.kind === 'iris') {
        activeShot = old;
        wrapXf(A, 0, 0, 1, 0, 0); present([A]); drawInst(A, T);
        let o = [W / 2, H / 2];
        if (A.impl && typeof A.impl.irisOrigin === 'function') { const r = safe(() => A.impl.irisOrigin(A.st, A.shot), null); if (r && isFinite(r[0]) && isFinite(r[1])) o = r; }
        drawIris(p, o);
      } else if (tr.kind === 'glitch') {
        activeShot = old;
        wrapXf(A, 0, 0, 1, 0, 0); present([A]); drawInst(A, T);
        drawGlitch(T, ws, old.id, mode.ni);
      } else { const a = swapped ? N : A; wrapXf(a, 0, 0, 1, 0, 0); present([a]); drawInst(a, T); }
    }
    drawCaptions(T, activeShot);
  }
  window.renderAt = function renderAt(T) {
    try { render(T); } catch (e) { console.error('[core] renderAt', T, e && e.stack || e); }
    return true;
  };

  /* ------------------------------------------------------------------ démarrage */
  const loadScript = (src) => new Promise((res) => { const s = document.createElement('script'); s.src = src; s.onload = () => res(true); s.onerror = () => res(false); document.head.appendChild(s); });
  async function boot() {
    TL = await (await fetch((CFG && CFG.timelineUrl) || new URLSearchParams(location.search).get('tl') || '/output/video/data/timeline.json', CFG && CFG.timelineUrl ? {} : { cache: 'no-store' })).json();
    FPS = (TL.video && TL.video.fps) || 30;
    TOTAL = TL.total;
    const ids = [...new Set(TL.shots.map((s) => s.component))];
    const loaded = CFG && CFG.componentsInline ? ids.map(() => true) : await Promise.all(ids.map((id) => loadScript(`${COMP_DIR}${id}.js?v=${Date.now()}`)));
    if (FORCE) await loadScript(`${COMP_DIR}${FORCE}.js`);
    if (Q.get('extra')) await loadScript(Q.get('extra'));
    const need = (id) => document.fonts.load(`800 50px "${id}"`, 'AaÉéÀÔçœ0123456789 .,:;!?’«»·×÷€¢%/-');
    await Promise.all([need('Bricolage Grotesque'), need('JetBrains Mono'), document.fonts.load('800 50px "Bricolage Grotesque"', 'āēūŁ'), document.fonts.ready]);
    const fluid = !!(CFG && CFG.size === 'fluid');
    svg = sv('svg', fluid ? { viewBox: `0 0 ${W} ${H}`, width: '100%', height: '100%', preserveAspectRatio: 'xMidYMid meet' } : { viewBox: `0 0 ${W} ${H}`, width: W, height: H }, (CFG && CFG.mount) || document.getElementById('stage'));
    rect(svg, 0, 0, W, H, 0, INK);
    stage = g(svg); capsLayer = g(svg); fxLayer = g(svg);
    measureG = g(svg, { visibility: 'hidden' });
    buildFx();
    buildCaptionIndex();
    window.__info = { total: TOTAL, fps: FPS, shots: TL.shots.length, missing: ids.filter((id, k) => !loaded[k] || !Z.REG[id]) };
    window.__total = TOTAL; window.__fps = FPS;
    if (Q.get('t') !== null && Q.get('t') !== '') renderAt(parseFloat(Q.get('t')));
    window.__ready = true;
  }
  // API d'intégration (pages du site) : ready se résout quand la scène est montée et prête à rendre.
  let booting = null, resolveReady, rejectReady;
  const readyP = new Promise((res, rej) => { resolveReady = res; rejectReady = rej; });
  readyP.catch(() => {});
  const start = () => booting || (booting = boot().then(() => resolveReady(true), (e) => { console.error('[core] boot', e && e.stack || e); window.__error = String(e && e.message || e); rejectReady(e); }));
  window.ZVEmbed = {
    ready: readyP, boot: start,
    renderAt(T) { return TL ? window.renderAt(T) : false; },
    get total() { return TOTAL; }, get fps() { return FPS; }, get timeline() { return TL; }
  };
  if (!(CFG && CFG.autoBoot === false)) start();
})();
;
/* ==== tools/video/composition/embed-player.js ==== */
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
