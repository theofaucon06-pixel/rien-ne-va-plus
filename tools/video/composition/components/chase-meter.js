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
