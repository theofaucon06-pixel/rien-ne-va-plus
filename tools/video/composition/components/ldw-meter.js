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
