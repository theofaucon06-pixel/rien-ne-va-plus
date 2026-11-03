// Composant `dealer-week` (épisode 6, S5 « Un croupier en pause »). Voir EP6-COMPONENTS.md.
// Mode week  : 5 colonnes de 300 cases (une par nuit), les zéros, la pièce lime dans chaque case, « LE MÉCANISME », les gens. Cues : night, week, zeros, price, mechanism, people.
// Mode chain : la chaîne de décision (croupier → chef de table → directeur → pause ?). Cues : question, no, c1…c4, slow.
// Aplats, bordures, ombres dures ; aucun dégradé / flou / lueur / filter. Pas de clignotement : fondus et mouvements uniques, flèches qui pulsent à moins de 2 alternances/s.
(() => {
  'use strict';
  const { C, E, clamp, prog, lerp, f2, sv, g, rect, circle, path, line, text, put, shakeAt } = ZV;
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const str = (v, d) => (typeof v === 'string' && v.trim() ? v.trim() : d);
  const num = (v, d) => (isNum(v) ? v : d);
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const vis = (n, on) => setA(n, 'visibility', on ? 'visible' : 'hidden');
  const setT = (n, s) => { if (n.textContent !== s) n.textContent = s; };
  const measure = (n) => {
    try { const w = n.getComputedTextLength(); if (w > 0) return w; } catch (e) { /* hors DOM */ }
    return (n.textContent || '').length * (parseFloat(n.getAttribute('font-size')) || 30) * 0.62;
  };
  function mkWrapped(parent, s, cx, cy, maxW, maxH, size0, fill, o) {
    o = o || {};
    const grp = g(parent), lh = 1.08;
    const n1 = text(grp, s, cx, cy + size0 * 0.35, size0, fill, { anchor: 'middle', mono: o.mono });
    let w = measure(n1);
    if (w <= maxW) return grp;
    const words = s.split(/\s+/);
    if (words.length < 2) { const k = maxW / w; n1.setAttribute('font-size', f2(size0 * k)); n1.setAttribute('y', f2(cy + size0 * k * 0.35)); return grp; }
    let best = 1, bd = 1e9;
    for (let j = 1; j < words.length; j++) { const d = Math.abs(words.slice(0, j).join(' ').length - words.slice(j).join(' ').length); if (d < bd) { bd = d; best = j; } }
    n1.textContent = words.slice(0, best).join(' ');
    const n2 = text(grp, words.slice(best).join(' '), cx, 0, size0, fill, { anchor: 'middle', mono: o.mono });
    let size = Math.min(size0, maxH / (2 * lh));
    n1.setAttribute('font-size', f2(size)); n2.setAttribute('font-size', f2(size));
    w = Math.max(measure(n1), measure(n2));
    if (w > maxW) { size *= maxW / w; n1.setAttribute('font-size', f2(size)); n2.setAttribute('font-size', f2(size)); }
    n1.setAttribute('y', f2(cy - lh * size / 2 + size * 0.35)); n2.setAttribute('y', f2(cy + lh * size / 2 + size * 0.35));
    return grp;
  }
  function fitW(n, maxW) { const w = measure(n); if (w > maxW) n.setAttribute('font-size', f2((parseFloat(n.getAttribute('font-size')) || 30) * maxW / w)); return Math.min(w, maxW); }
  // texte qui s'écrit : start-anchor, x calculé une fois sur la largeur finale
  function mkTyper(parent, s, cx, y, size, fill, o) {
    const n = text(parent, s, cx, y, size, fill, { mono: !!(o && o.mono) });
    const w = fitW(n, (o && o.maxW) || 1700);
    n.setAttribute('x', f2(cx - w / 2));
    n.__full = s; n.__w = w;
    return n;
  }
  const typeTo = (n, k) => { const s = n.__full.slice(0, Math.max(0, Math.min(n.__full.length, Math.floor(k * n.__full.length + 1e-6)))); setT(n, s); };

  const WEEK_CUES = ['night', 'week', 'zeros', 'price', 'mechanism', 'people'];
  const CHAIN_CUES = ['question', 'no', 'c1', 'c2', 'c3', 'c4', 'slow'];

  /* =========================================================== */
  /*  MODE week                                                   */
  /* =========================================================== */
  const COLS = 15, GY = 230;

  function initWeek(root, st, p) {
    const T = st.T, first = st.first;
    const nights = Math.round(clamp(num(p.nights, 5), 1, 7));
    const perNight = Math.round(clamp(num(p.per_night, 300), 15, 600));
    const rows = Math.ceil(perNight / COLS);
    const total = nights * perNight;
    const zerosN = Math.round(clamp(num(p.zeros, 40), 0, total));
    const GAP = 40;
    const colW = Math.min(285, (1584 - (nights - 1) * GAP) / nights);
    const pitch = Math.min(colW / COLS, 380 / rows, 19);
    const cell = Math.max(4, pitch - 3);
    const gridW = COLS * pitch - 3;
    const x0 = (1920 - (nights * gridW + (nights - 1) * GAP)) / 2;
    Object.assign(st, { nights, perNight, rows, total, pitch, cell, gridW, x0 });
    st.tNight = first('night'); st.tWeek = first('week'); st.tZeros = first('zeros'); st.tPrice = first('price'); st.tMech = first('mechanism'); st.tPeople = first('people');
    st.noFill = st.tNight == null && st.tWeek == null;                 // aucun cue de remplissage : repos = semaine complète
    st.firstWeekCol = st.tNight != null ? 1 : 0;
    const title = str(p.title, 'CROUPIER'), mech = str(p.mechanism, 'LE MÉCANISME'), odds = str(p.odds, '1 SUR 37');
    st.zerosN = zerosN;

    rect(root, 0, 0, 1920, 1080, 0, C.ink);
    // titre
    st.title = text(root, title, 960, 100, 72, C.paper, { anchor: 'middle' });
    fitW(st.title, 1000);
    const tw = measure(st.title);
    st.titleW = tw;
    st.strike = line(root, 960 - tw / 2 - 14, 74, 960 - tw / 2 - 14, 74, C.red, 12);
    st.mechT = mkTyper(root, mech, 960, 162, 50, C.lime, { maxW: 900 });
    // grille : cases vides (un seul tracé), cases jouées / pièces / gens par colonne
    let dEmpty = '';
    const rng = ZV.rng(Math.round(num(p.seed, 6)));
    st.cols = [];
    for (let c = 0; c < nights; c++) {
      const cx = x0 + c * (gridW + GAP);
      const col = { cx, played: '', off: [0], coin: '', coff: [0], pc: '', pp: '' };
      for (let k = 0; k < perNight; k++) {
        const x = cx + (k % COLS) * pitch, y = GY + Math.floor(k / COLS) * pitch;
        dEmpty += `M${f2(x)} ${f2(y)}h${f2(cell)}v${f2(cell)}h${f2(-cell)}z`;
        col.played += `M${f2(x)} ${f2(y)}h${f2(cell)}v${f2(cell)}h${f2(-cell)}z`;
        col.off.push(col.played.length);
        const ct = Math.max(2, Math.min(6, cell * 0.38));
        col.coin += `M${f2(x + cell - ct)} ${f2(y)}h${f2(ct)}v${f2(ct)}z`;
        col.coff.push(col.coin.length);
        if (k % 25 === 0) {
          const mx = x + cell / 2, my = y + cell / 2, u = cell / 16;
          col.pc += `M${f2(x)} ${f2(y)}h${f2(cell)}v${f2(cell)}h${f2(-cell)}z`;
          col.pp += `M${f2(mx - 3.2 * u)} ${f2(my - 3.6 * u)}a${f2(3.2 * u)} ${f2(3.2 * u)} 0 1 0 ${f2(6.4 * u)} 0a${f2(3.2 * u)} ${f2(3.2 * u)} 0 1 0 ${f2(-6.4 * u)} 0z`;
          col.pp += `M${f2(mx - 6.4 * u)} ${f2(my + 6.6 * u)}Q${f2(mx - 6.4 * u)} ${f2(my + 0.6 * u)} ${f2(mx)} ${f2(my + 0.6 * u)}Q${f2(mx + 6.4 * u)} ${f2(my + 0.6 * u)} ${f2(mx + 6.4 * u)} ${f2(my + 6.6 * u)}z`;
        }
      }
      st.cols.push(col);
    }
    path(root, dEmpty, 'none', C.pocket, 2);
    // en-têtes
    const nl = str(p.night_label, 'NUIT');
    for (let c = 0; c < nights; c++) fitW(text(root, `${nl} ${c + 1}`, st.cols[c].cx + gridW / 2, 200, 28, C.paper, { anchor: 'middle', mono: true }), gridW);
    st.cols.forEach((col) => {
      col.played_n = path(root, '', C.paper); col.coin_n = path(root, '', C.lime);
      col.pc_n = path(root, col.pc, C.ink); col.pp_n = path(root, col.pp, C.paper);
      [col.pc_n, col.pp_n].forEach((n) => setA(n, 'visibility', 'hidden'));
    });
    // zéros : exactement zerosN cases réparties sur l'ensemble des tours (strates + rng)
    const idx = [], seg = total / Math.max(1, zerosN);
    for (let z = 0; z < zerosN; z++) { const a = Math.floor(z * seg), b = Math.max(a + 1, Math.floor((z + 1) * seg)); idx.push(Math.min(total - 1, a + Math.floor(rng() * (b - a)))); }
    st.zeros = idx.map((gi) => {
      const c = Math.floor(gi / perNight), k = gi % perNight;
      const cx = st.cols[c].cx + (k % COLS) * pitch + cell / 2, cy = GY + Math.floor(k / COLS) * pitch + cell / 2;
      const n = g(root);
      rect(n, -cell / 2, -cell / 2, cell, cell, 1, C.lime);
      text(n, '0', 0, cell * 0.22, Math.max(6, cell * 0.62), C.ink, { anchor: 'middle', mono: true });
      put(n, cx, cy, 0, 0, 0, 0);
      return { n, cx, cy, tz: 0 };
    });
    if (st.zeros.length) {
      const xs = st.zeros.map((z) => z.cx), mn = Math.min.apply(null, xs), mx = Math.max.apply(null, xs);
      st.zeros.forEach((z) => { z.tz = mx > mn ? (z.cx - mn) / (mx - mn) * 1.3 : 0; });
    }
    // compteur
    st.cnt = g(root);
    st.cNum = text(st.cnt, '0', 0, 0, 120, C.paper, { anchor: 'end' });
    st.cUnit = text(st.cnt, 'TOURS / NUIT', 36, 0, 34, C.paper, { mono: true });
    // stickers et légendes
    st.sZero = g(root);
    ZV.sticker(st.sZero, 560, 78, C.lime, `${odds} · ≈ ${zerosN} PAR SEMAINE`, 28, C.ink, { sh: 9, mono: true });
    fitW(st.sZero.lastChild, 500);
    st.leg1 = mkTyper(root, str(p.price_text, 'ET DANS LE PRIX DE CHAQUE MISE'), 960, 648, 30, C.lime, { mono: true, maxW: 1500 });
    st.peopleY = st.tMech != null ? 648 : 156;
    st.leg2 = mkTyper(root, str(p.people_text, 'ON COMPTE LES TOURS POUR NE PAS COMPTER LES GENS'), 960, st.peopleY, 30, C.paper, { mono: true, maxW: 1500 });
  }

  function updWeek(st, t) {
    const { nights, perNight, tNight, tWeek } = st;
    /* remplissage */
    const filled = [];
    let sum = 0, lastEnd = null;
    for (let c = 0; c < nights; c++) {
      let n;
      if (st.noFill) n = perNight;
      else if (c === 0 && tNight != null) { n = Math.floor(perNight * Math.pow(prog(t, tNight, tNight + 2.5), 2.1) + 1e-9); if (t >= tNight + 2.5) n = perNight; }
      else if (tWeek != null && c >= st.firstWeekCol) {
        const s0 = tWeek + (c - st.firstWeekCol) * 0.45, d = 1.3, q = prog(t, s0, s0 + d);
        n = Math.floor(perNight * Math.pow(q, 2.1) + 1e-9); if (q >= 1) n = perNight;
        lastEnd = s0 + d;
      } else n = 0;
      filled.push(n); sum += n;
    }
    st.cols.forEach((col, c) => {
      const n = filled[c];
      vis(col.played_n, n > 0); setA(col.played_n, 'd', col.played.slice(0, col.off[n]));
    });
    /* coins lime (dans le prix de chaque mise) : vague gauche → droite */
    const tP = st.tPrice;
    st.cols.forEach((col, c) => {
      let k = 0;
      if (tP != null) k = Math.min(filled[c], Math.floor(perNight * prog(t, tP + c * 0.9 / nights, tP + c * 0.9 / nights + 0.5)));
      vis(col.coin_n, k > 0); setA(col.coin_n, 'd', col.coin.slice(0, col.coff[k]));
    });
    /* gens : une case sur 25 devient une silhouette pendant 1,5 s */
    const tPe = st.tPeople;
    const pe = tPe == null ? 0 : Math.min(prog(t - tPe, 0, 0.25), 1 - prog(t - tPe, 1.25, 1.5));
    st.cols.forEach((col, c) => {
      const on = pe > 0.001 && filled[c] >= perNight;
      vis(col.pc_n, on); vis(col.pp_n, on);
      if (on) { setA(col.pc_n, 'opacity', f2(pe)); setA(col.pp_n, 'opacity', f2(pe)); }
    });
    /* zéros en vague */
    const tZ = st.tZeros;
    st.zeros.forEach((z) => {
      const q = tZ == null ? 0 : E.back(prog(t - tZ - z.tz, 0, 0.3));
      const s = 0.55 + 0.45 * q + (q > 0 ? 0 : 0);
      put(z.n, z.cx, z.cy, 0, tZ == null || t < tZ + z.tz ? 0 : s, tZ == null || t < tZ + z.tz ? 0 : s, tZ != null && t >= tZ + z.tz ? 1 : 0);
    });
    const zs = tZ == null ? 0 : E.back(prog(t, tZ + 1.35, tZ + 1.7));
    put(st.sZero, 1500, 735, -2, zs, zs, zs > 0.001 ? 1 : 0);

    /* compteur */
    const week = st.noFill || (tWeek != null && t >= tWeek);
    const show = sum > 0;
    let cs = 1;
    if (tWeek != null) {
      const endW = Math.max(lastEnd == null ? tWeek : lastEnd, tWeek);
      cs = 1 + 0.08 * Math.sin(Math.PI * clamp(1 - (t - endW) / 0.25)) * (t >= endW && t < endW + 0.25 ? 1 : 0);
    }
    setT(st.cNum, ZV.fr(sum)); setT(st.cUnit, week ? 'TOURS / SEMAINE' : 'TOURS / NUIT');
    setA(st.cNum, 'x', 0); setA(st.cUnit, 'x', 34);
    setA(st.cnt, 'transform', `translate(760 775) translate(0 -40) scale(${f2(cs)}) translate(0 40)`);
    vis(st.cnt, show);

    /* légendes */
    const lp1 = tP == null ? 0 : prog(t, tP + 0.3, tP + 1.3);
    const hide1 = tPe != null && st.peopleY === 648 ? prog(t, tPe, tPe + 0.15) : 0;
    typeTo(st.leg1, lp1); vis(st.leg1, lp1 > 0 && hide1 < 1);
    setA(st.leg1, 'opacity', f2(1 - hide1));
    typeTo(st.leg2, tPe == null ? 0 : prog(t, tPe + 0.25, tPe + 1.2)); vis(st.leg2, tPe != null && t >= tPe + 0.25);

    /* le mécanisme */
    const tM = st.tMech;
    const sp = tM == null ? 0 : E.out2(prog(t, tM, tM + 0.3));
    vis(st.strike, sp > 0.001);
    setA(st.strike, 'x2', f2(960 - st.titleW / 2 - 14 + (st.titleW + 28) * sp));
    typeTo(st.mechT, tM == null ? 0 : prog(t, tM + 0.35, tM + 1.0)); vis(st.mechT, tM != null && t >= tM + 0.35);
  }

  /* =========================================================== */
  /*  MODE chain                                                  */
  /* =========================================================== */
  const BY = 380, BH = 140;
  function initChain(root, st, p) {
    const T = st.T, first = st.first;
    const steps = (Array.isArray(p.steps) && p.steps.length ? p.steps.map((x) => str(x, '')).filter(Boolean) : ['LE CROUPIER', 'LE CHEF DE TABLE', 'LE DIRECTEUR', 'UNE PAUSE ?']).slice(0, 5);
    const n = steps.length;
    const question = str(p.question, 'PEUT-IL ARRÊTER QUELQU’UN ?'), answer = str(p.answer, 'NON');
    st.none = !CHAIN_CUES.some((k) => T[k]) && !T.c5;
    st.tQ = first('question'); st.tNo = first('no'); st.tSlow = first('slow');
    st.n = n;
    st.tC = steps.map((s, i) => first('c' + (i + 1)));
    rect(root, 0, 0, 1920, 1080, 0, C.ink);
    st.q = mkTyper(root, question, 960, 120 + 22, 64, C.paper, { maxW: 1400 });
    const qw = st.q.__w, qRight = 960 + qw / 2;
    // chaîne
    const widths = steps.map((s, i) => (i === n - 1 && n > 1 ? 250 : 300));
    const sumW = widths.reduce((a, b) => a + b, 0);
    const gap = n > 1 ? Math.max(110, Math.min(200, (1680 - sumW) / (n - 1))) : 0;
    let x = (1920 - (sumW + gap * (n - 1))) / 2;
    st.boxes = steps.map((s, i) => {
      const w = widths[i], last = i === n - 1 && n > 1, h = last ? 120 : BH, cy = BY + BH / 2;
      const b = { x, w, h, cy, g: g(root) };
      const dashed = last;
      if (!dashed) {
        rect(b.g, -w / 2 + 10, -h / 2 + 10, w, h, 16, C.lime);
        rect(b.g, -w / 2, -h / 2, w, h, 16, C.paper, C.ink, 8);
        mkWrapped(b.g, s, 0, 0, w - 44, h - 34, 40, C.ink, {});
      } else {
        rect(b.g, -w / 2, -h / 2, w, h, 16, C.pocket, C.lime, 6, { 'stroke-dasharray': '18 12' });
        mkWrapped(b.g, s, 0, 0, w - 44, h - 30, 36, C.lime, {});
      }
      x += w + gap;
      return b;
    });
    st.arrows = [];
    for (let i = 1; i < n; i++) {
      const a = st.boxes[i - 1], b = st.boxes[i];
      const ax = a.x + a.w + 16, bx = b.x - 16, y = BY + BH / 2;
      const gr = g(root);
      const shaft = line(gr, ax, y, ax, y, C.lime, 14);
      const head = path(gr, 'M0 -24 L38 0 L0 24Z', C.lime, C.lime, 6);
      st.arrows.push({ gr, shaft, head, ax, bx, y, dur: [0.27, 0.47, 0.8, 1.2][Math.min(i - 1, 3)] });
    }
    // tampon « NON »
    st.no = g(root);
    const sw = 250;
    rect(st.no, -sw / 2 + 10, -66 + 10, sw, 132, 14, C.paper);
    rect(st.no, -sw / 2, -66, sw, 132, 14, C.red, C.ink, 8);
    fitW(text(st.no, answer, 0, 34, 96, C.ink, { anchor: 'middle' }), sw - 40);
    st.noX = Math.min(1920 - 60 - sw / 2, qRight + 70 + sw / 2);
    // horloge plate
    st.clock = g(root);
    circle(st.clock, 8, 8, 84, C.lime);
    circle(st.clock, 0, 0, 84, C.paper, C.ink, 8);
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; line(st.clock, Math.sin(a) * 62, -Math.cos(a) * 62, Math.sin(a) * 72, -Math.cos(a) * 72, C.ink, i % 3 ? 3 : 6); }
    st.hH = line(st.clock, 0, 0, 0, -40, C.ink, 9); st.hM = line(st.clock, 0, 0, 0, -58, C.ink, 6);
    circle(st.clock, 0, 0, 9, C.red, C.ink, 3);
    st.slowT = mkTyper(root, str(p.slow_text, 'ÇA PREND DU TEMPS'), 960, 590, 30, C.paper, { mono: true, maxW: 1200 });
  }

  function updChain(st, t) {
    const none = st.none;
    const tQ = st.tQ, tNo = st.tNo, tS = st.tSlow;
    typeTo(st.q, none ? 1 : tQ == null ? 0 : prog(t, tQ, tQ + 0.9)); vis(st.q, none || (tQ != null && t >= tQ));
    // tampon : un seul claquement
    let ns = 0, rot = 8, ox = 0, oy = 0;
    if (none) ns = 1;
    else if (tNo != null && t >= tNo) { const q = prog(t, tNo, tNo + 0.14); ns = lerp(2.0, 1, E.in2(q)); const sh = shakeAt(t, tNo + 0.14, 7, 0.3); ox = sh[0]; oy = sh[1]; }
    put(st.no, st.noX + ox, 112 + oy, rot, ns, ns, ns > 0.001 ? 1 : 0);
    // boîtes et flèches
    const pulse = tS != null && t >= tS ? 0.7 + 0.3 * Math.sin(2 * Math.PI * 0.85 * (t - tS) + Math.PI / 2) : 1;
    st.boxes.forEach((b, i) => {
      const tc = none ? -99 : st.tC[i];
      const q = tc == null ? 0 : E.back(prog(t, tc, tc + 0.3));
      put(b.g, b.x + b.w / 2, b.cy, 0, q, q, tc != null && t >= tc ? 1 : 0);
      if (i > 0) {
        const a = st.arrows[i - 1];
        const pa = tc == null ? 0 : E.out2(prog(t, tc, tc + a.dur));
        const xe = lerp(a.ax, a.bx, pa), headOn = pa > 0.02;
        vis(a.gr, tc != null && t >= tc);
        setA(a.shaft, 'x2', f2(Math.max(a.ax, xe - 20)));
        vis(a.head, headOn);
        setA(a.head, 'transform', `translate(${f2(xe - 38)} ${a.y})`);
        setA(a.gr, 'opacity', f2(pa >= 1 ? pulse : 1));
      }
    });
    // horloge + « ça prend du temps »
    const cq = tS == null ? 0 : E.back(prog(t, tS, tS + 0.35));
    put(st.clock, 960, 250, 0, cq, cq, cq > 0.001 ? 1 : 0);
    const e = tS == null ? 0 : Math.max(0, t - tS);
    setA(st.hM, 'transform', `rotate(${f2(e * 110)})`); setA(st.hH, 'transform', `rotate(${f2(e * 110 / 12 + 60)})`);
    typeTo(st.slowT, tS == null ? 0 : prog(t, tS + 0.3, tS + 1.0)); vis(st.slowT, tS != null && t >= tS + 0.3);
  }

  ZV.define('dealer-week', {
    init(root, shot) {
      const p = (shot && shot.props) || {};
      const beats = Array.isArray(shot && shot.beats) ? shot.beats : [];
      const T = {};
      beats.forEach((b) => { if (b && b.do === 'cue' && typeof b.name === 'string' && isNum(b.t)) (T[b.name] || (T[b.name] = [])).push(b.t); });
      Object.keys(T).forEach((k) => T[k].sort((a, c) => a - c));
      const first = (n) => (T[n] ? T[n][0] : null);
      const hasW = WEEK_CUES.some((n) => T[n]), hasC = CHAIN_CUES.some((n) => T[n]);
      const mode = p.mode === 'chain' ? 'chain' : p.mode === 'week' ? 'week' : (hasC && !hasW ? 'chain' : 'week');
      const st = { mode, T, first };
      try { if (mode === 'chain') initChain(root, st, p); else initWeek(root, st, p); } catch (e) { st.err = e; }
      return st;
    },
    update(st, t) {
      if (!st || st.err) return;
      t = isNum(t) ? t : 0;
      try { if (st.mode === 'chain') updChain(st, t); else updWeek(st, t); } catch (e) { /* jamais d'exception */ }
    }
  });
})();
