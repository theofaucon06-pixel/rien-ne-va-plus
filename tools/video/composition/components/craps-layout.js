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
