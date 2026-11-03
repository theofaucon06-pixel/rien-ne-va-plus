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
