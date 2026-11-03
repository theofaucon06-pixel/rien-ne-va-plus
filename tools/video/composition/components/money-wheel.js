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
