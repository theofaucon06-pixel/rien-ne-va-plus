// Composant `head-counter` (épisode 6, S4 « Des jetons qui ne pèsent rien ») : ce que les objets font à tes comptes. Voir EP6-COMPONENTS.md.
// Mode weigh : un billet qui pèse (plié, hésitant, posé sur une balance) face à un jeton qui glisse sans poids. Cues : bill, fold, weight, slide, clack, back, again, untag.
// Mode head  : la tête, l'écran de comptes qui se brouille. Cues : cash, chips, glass-1, glass-2, seat, no-clock, memory, ball.
// Aplats, bordures, ombres dures ; aucun dégradé / flou / lueur / filter. « Flou » = chiffres doublés décalés. Rien ne clignote (un seul fondu ou mouvement par étape).
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
  // texte centré sur (cx,cy) dans une boîte maxW × maxH : 1 ligne si possible, sinon 2 lignes équilibrées, sinon police réduite
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
  const mix = (a, b, k) => { const h = (s, i) => parseInt(s.slice(1 + i * 2, 3 + i * 2), 16); let r = '#'; for (let i = 0; i < 3; i++) r += ('0' + Math.round(h(a, i) + (h(b, i) - h(a, i)) * k).toString(16)).slice(-2); return r; };
  let UID = 0;

  const WEIGH_CUES = ['bill', 'fold', 'weight', 'slide', 'clack', 'back', 'again', 'untag'];
  const HEAD_CUES = ['cash', 'chips', 'glass-1', 'glass-2', 'seat', 'no-clock', 'memory', 'ball'];

  /* =========================================================== */
  /*  MODE weigh                                                  */
  /* =========================================================== */
  const A_X = 1170, B_X = 1716, CHIP_Y = 440;     // jeton : repos / contre le bord
  const DISH_Y = 620, BILL_REST_Y = DISH_Y - 130, HOVER_Y = 300;

  function billFace(par, part, label, uid) {
    const grp = g(par);
    let fillN = null;
    if (part === 'all') fillN = rect(grp, -260, -130, 520, 260, 14, C.paper, C.ink, 8);
    else if (part === 'L') {
      fillN = path(grp, 'M0 -130 L-246 -130 Q-260 -130 -260 -116 L-260 116 Q-260 130 -246 130 L0 130 Z', C.paper);
      path(grp, 'M0 -130 L-246 -130 Q-260 -130 -260 -116 L-260 116 Q-260 130 -246 130 L0 130', 'none', C.ink, 8);
    } else {
      fillN = path(grp, 'M0 -130 L246 -130 Q260 -130 260 -116 L260 116 Q260 130 246 130 L0 130 Z', C.paper);
      path(grp, 'M0 -130 L246 -130 Q260 -130 260 -116 L260 116 Q260 130 246 130 L0 130', 'none', C.ink, 8);
    }
    const cg = g(grp);
    if (part !== 'all') {
      const defs = sv('defs', null, grp), cp = sv('clipPath', { id: uid + part }, defs);
      sv('rect', part === 'L' ? { x: -270, y: -140, width: 270, height: 280 } : { x: 0, y: -140, width: 270, height: 280 }, cp);
      cg.setAttribute('clip-path', `url(#${uid + part})`);
    }
    rect(cg, -256, -126, 52, 252, 0, C.lime);
    line(cg, -188, -104, 238, -104, C.ink, 4); line(cg, -188, 104, 238, 104, C.ink, 4);
    fitW(text(cg, label, -58, 42, 120, C.ink, { anchor: 'middle' }), 262);
    // rosace géométrique plate (aucun motif de vrai billet)
    let d = '';
    for (let i = 0; i < 24; i++) { const a = i * Math.PI / 12, r = i % 2 ? 40 : 64; d += (i ? 'L' : 'M') + f2(170 + Math.sin(a) * r) + ' ' + f2(Math.cos(a) * r); }
    circle(cg, 170, 0, 76, 'none', C.ink, 5);
    path(cg, d + 'Z', C.lime, C.ink, 4);
    circle(cg, 170, 0, 18, C.ink);
    return fillN;
  }

  function initWeigh(root, st, p) {
    const T = st.T, first = st.first;
    const uid = 'hcb' + (++UID);
    const label = str(p.bill, '50 €'), chipTxt = str(p.chip, '1 €');
    const tagsIn = Array.isArray(p.tags) && p.tags.length ? p.tags.map((x) => str(x, '')).filter(Boolean).slice(0, 2) : ['LES COURSES', 'UN BOUT DE LOYER'];
    const gameTxt = str(p.game, 'UN JEU');
    const none = !WEIGH_CUES.some((n) => T[n]);
    const fo = (names) => { let r = null; names.forEach((n) => { const v = first(n); if (v != null && (r == null || v < r)) r = v; }); return r; };
    st.tBill = none ? -99 : (fo(['bill', 'fold', 'weight', 'untag']) != null ? fo(['bill', 'fold', 'weight', 'untag']) : -99);
    st.tChip = none ? -99 : (fo(['slide', 'clack', 'back', 'again', 'untag']) != null ? fo(['slide', 'clack', 'back', 'again', 'untag']) : -99);
    st.tFold = first('fold'); st.tWeight = first('weight'); st.tUntag = first('untag');
    st.clacks = (T.clack || []).slice();
    // déplacements du jeton
    const mv = [];
    (T.slide || []).forEach((t) => mv.push({ t, to: B_X, kind: 'go' }));
    (T.again || []).forEach((t) => mv.push({ t, to: B_X, kind: 'go' }));
    (T.back || []).forEach((t) => mv.push({ t, to: A_X, kind: 'back' }));
    mv.sort((a, b) => a.t - b.t);
    mv.forEach((m, i) => {
      if (m.kind === 'go') { const nc = st.clacks.find((c) => c > m.t + 0.2); m.d = nc != null ? clamp(nc - m.t, 0.25, 2.2) : 0.6; } else m.d = 0.7;
      m.ease = m.kind === 'go' ? E.in2 : E.io2;
      m.from = A_X;
      if (i > 0) { const q = mv[i - 1]; m.from = lerp(q.from, q.to, q.ease(prog(m.t, q.t, q.t + q.d))); }
    });
    st.moves = mv;

    rect(root, 0, 0, 1920, 1080, 0, C.paper);
    /* ---- gauche : balance + billet ---- */
    st.lg = g(root);
    rect(st.lg, 450, 640, 60, 150, 0, C.ink);                                 // colonne
    path(st.lg, 'M 340 812 L 620 812 L 590 780 L 370 780 Z', C.ink, C.ink, 6);   // pied
    st.dish = g(st.lg);
    path(st.dish, 'M -330 0 L 330 0 L 270 40 L -270 40 Z', C.ink, C.ink, 6);
    rect(st.dish, -330, -6, 660, 10, 3, C.lime, C.ink, 4);
    st.bill = g(st.lg);
    st.bSh = rect(st.bill, -250, -120, 520, 260, 14, C.ink);
    st.flat = g(st.bill); billFace(st.flat, 'all', label, uid);
    st.fold = g(st.bill);
    st.fL = g(st.fold); billFace(st.fL, 'L', label, uid);
    st.fR = g(st.fold); st.rFill = billFace(st.fR, 'R', label, uid);
    st.crease = line(st.fold, 0, -126, 0, 126, C.ink, 4);
    // étiquettes Dymo (ficelles + rubans ink)
    st.tags = tagsIn.map((s, i) => {
      const sg = i === 0 ? -1 : 1;
      const str1 = line(st.lg, 0, 0, 0, 0, C.ink, 4);
      const tg = g(st.lg);
      const tx = text(tg, s, 0, 0, 26, C.paper, { anchor: 'middle', mono: true });
      const w = fitW(tx, 300) + 40;
      rect(tg, -w / 2 + 6, -10 + 6, w, 62, 6, C.ink);
      const rr = rect(tg, -w / 2, -10, w, 62, 6, C.ink, C.ink, 4);
      rect(tg, -w / 2 + 6, -4, w - 12, 50, 3, 'none', C.paper, 2);
      circle(tg, 0, -1, 5, C.lime, C.paper, 2);
      tg.appendChild(tx); tx.setAttribute('y', 38);
      return { sg, str1, tg, rr };
    });
    // stickers
    st.sHes = g(st.lg); ZV.sticker(st.sHes, 380, 84, C.lime, 'TU HÉSITES', 50, C.ink, { sh: 8 });
    st.sWei = g(st.lg); ZV.sticker(st.sWei, 470, 84, C.ink, 'IL A UN POIDS', 50, C.paper, { sh: 8 });

    /* ---- droite : jeton ---- */
    line(root, 960, 0, 960, 1080, C.ink, 6);
    st.rg = g(root);
    rect(st.rg, 990, 560, 940, 160, 0, C.ink);
    line(st.rg, 1010, 640, 1900, 640, C.lime, 4, { 'stroke-dasharray': '22 18' });
    rect(st.rg, 1836, 380, 34, 340, 4, C.red, C.ink, 6);
    st.chip = g(st.rg);
    circle(st.chip, 10, 10, 120, C.ink);
    circle(st.chip, 0, 0, 120, C.white, C.ink, 8);
    for (let k = 0; k < 8; k++) { const n = g(st.chip, { transform: `rotate(${k * 45})` }); rect(n, -16, -116, 32, 38, 4, C.lime, C.ink, 4); }
    circle(st.chip, 0, 0, 74, C.white, C.ink, 5);
    text(st.chip, chipTxt, 0, 22, 64, C.ink, { anchor: 'middle', mono: true });
    st.spark = [-130, -90, -50].map((a) => ({ a: a * Math.PI / 180, n: line(st.rg, 0, 0, 0, 0, C.ink, 9) }));
    st.sGame = g(st.rg); ZV.sticker(st.sGame, 300, 88, C.lime, gameTxt, 54, C.ink, { sh: 9 });
  }

  function updWeigh(st, t) {
    const tw = st.tWeight, tf = st.tFold, tU = st.tUntag;
    /* billet : plié (accordéon par moitiés) */
    let f = 0;
    if (tf != null) {
      const e = t - tf;
      if (e > 0) f = e < 0.33 ? E.io2(e / 0.33) : e < 0.9 ? 1 : e < 1.25 ? lerp(1, 0.4, E.io2((e - 0.9) / 0.35)) : e < 1.5 ? 0.4 : e < 1.8 ? lerp(0.4, 1, E.io2((e - 1.5) / 0.3)) : 1;
    }
    if (tw != null) f *= 1 - E.io2(prog(t, tw, tw + 0.25));
    const s = 1 - 0.5 * f;
    const folded = f > 0.002;
    vis(st.flat, !folded); vis(st.fold, folded);
    if (folded) {
      setA(st.fL, 'transform', `scale(${f2(s)} 1)`); setA(st.fR, 'transform', `scale(${f2(s)} 1)`);
      setA(st.rFill, 'fill', mix(C.paper, '#D6D0BF', Math.min(1, f)));
    }
    setA(st.bSh, 'x', f2(-260 * s + 10)); setA(st.bSh, 'width', f2(520 * s));

    /* billet : position */
    const en = prog(t, st.tBill, st.tBill + 0.55);
    const bob = (x) => 3 * Math.sin(x * 2.1);
    const hover = (x) => lerp(-250, HOVER_Y, E.back(prog(x, st.tBill, st.tBill + 0.55))) + bob(Math.min(x, tw == null ? 1e9 : tw));
    let cy = hover(t), rot = lerp(-9, 0, E.out3(en));
    let dep = 0, tImp = null;
    if (tw != null) {
      tImp = tw + 0.3;
      if (t >= tw) {
        const q = prog(t, tw, tImp);
        cy = lerp(hover(tw), BILL_REST_Y, E.in2(q)); rot = lerp(rot, 0, q);
        if (t > tImp) { const tau = t - tImp; dep = 60 * (1 - Math.exp(-6 * tau) * Math.cos(16 * tau)); cy = BILL_REST_Y + dep; rot = 0; }
      }
    }
    const bOn = t >= st.tBill;
    const sh = tImp != null ? shakeAt(t, tImp, 8, 0.4) : [0, 0];
    setA(st.lg, 'transform', `translate(${f2(sh[0])} ${f2(sh[1])})`);
    put(st.bill, 480, cy, rot, 1, 1, bOn ? 1 : 0);
    setA(st.dish, 'transform', `translate(480 ${f2(DISH_Y + dep)})`);

    /* étiquettes */
    const r = rot * Math.PI / 180;
    st.tags.forEach((tag, i) => {
      const lx = tag.sg * 130 * s, ly = 130;
      const ax = 480 + Math.cos(r) * lx - Math.sin(r) * ly, ay = cy + Math.sin(r) * lx + Math.cos(r) * ly;
      let tx = 480 + tag.sg * 138 + 3 * Math.sin(t * 2.2 + i * 1.9), ty = ay + 38, tr = 0, on = bOn;
      let e = 0;
      if (tU != null) e = t - (tU + i * 0.14);
      if (e > 0) { tx += tag.sg * 90 * e; ty += 0.5 * 2700 * e * e; tr = tag.sg * 170 * e; if (e > 1.3) on = false; }
      vis(tag.tg, on); vis(tag.str1, on);
      if (!on) return;
      setA(tag.tg, 'transform', `translate(${f2(tx)} ${f2(ty)}) rotate(${f2(tr)})`);
      if (e > 0) { setA(tag.str1, 'x1', f2(tx)); setA(tag.str1, 'y1', f2(ty + 3)); setA(tag.str1, 'x2', f2(tx - Math.sin(tr * Math.PI / 180) * -26)); setA(tag.str1, 'y2', f2(ty - 26)); }
      else { setA(tag.str1, 'x1', f2(ax)); setA(tag.str1, 'y1', f2(ay)); setA(tag.str1, 'x2', f2(tx)); setA(tag.str1, 'y2', f2(ty + 3)); }
    });

    /* stickers de la scène gauche */
    let hs = 0;
    if (tf != null) hs = E.back(prog(t, tf + 1.25, tf + 1.5));
    if (tw != null && t >= tw) hs = Math.min(hs, 1 - prog(t, tw, tw + 0.15));
    put(st.sHes, 480, 108, -3, hs, hs, hs > 0.001 ? 1 : 0);
    const ws = tw != null ? E.back(prog(t, tw + 0.35, tw + 0.65)) : 0;
    put(st.sWei, 480, 108, -2, ws, ws, ws > 0.001 ? 1 : 0);

    /* jeton */
    const cp = E.back(prog(t, st.tChip, st.tChip + 0.35));
    let x = A_X, lastKind = null;
    for (let i = 0; i < st.moves.length; i++) {
      const m = st.moves[i];
      if (t < m.t) break;
      x = lerp(m.from, m.to, m.ease(prog(t, m.t, m.t + m.d))); lastKind = m;
    }
    if (lastKind && lastKind.to === B_X && t >= lastKind.t + lastKind.d) {
      for (let i = 0; i < st.clacks.length; i++) { const c = st.clacks[i]; if (t >= c && t < c + 0.22) x -= 12 * Math.sin(Math.PI * (t - c) / 0.22); }
    }
    put(st.chip, x, CHIP_Y, 0, cp, cp, t >= st.tChip ? 1 : 0);
    // éclat plat de 3 traits au claquement
    let lc = null;
    for (let i = 0; i < st.clacks.length; i++) if (st.clacks[i] <= t) lc = st.clacks[i];
    const ce = lc == null ? 9 : t - lc;
    st.spark.forEach((sp) => {
      const q = ce / 0.3;
      if (q >= 1) { vis(sp.n, false); return; }
      const ro = 14 + 56 * E.out2(q), ri = 10 + 52 * E.in2(q);
      vis(sp.n, true);
      setA(sp.n, 'x1', f2(1851 + Math.cos(sp.a) * ri)); setA(sp.n, 'y1', f2(376 + Math.sin(sp.a) * ri));
      setA(sp.n, 'x2', f2(1851 + Math.cos(sp.a) * ro)); setA(sp.n, 'y2', f2(376 + Math.sin(sp.a) * ro));
    });
    // étiquette « UN JEU » sur le jeton (après la chute des étiquettes du billet)
    const gp = tU != null ? E.back(prog(t, tU + 0.55, tU + 0.85)) : 0;
    put(st.sGame, x, CHIP_Y - 172, -4, gp, gp, gp > 0.001 ? 1 : 0);
  }

  /* =========================================================== */
  /*  MODE head                                                   */
  /* =========================================================== */
  const HEAD_D = 'M 120 800 C 120 725 190 695 300 672 C 330 665 345 650 346 625 C 230 590 170 480 170 366 C 176 190 322 70 500 70 C 690 70 828 188 836 338 C 840 410 826 456 808 492 C 798 514 792 536 790 566 C 788 600 774 628 748 646 C 770 664 846 684 868 710 L 868 800 Z';
  const SCR = { x: 500, y: 340 };
  const CW = 43.2;                                // largeur d'un caractère Mono 72 px
  const ROW_Y = (i) => 180 + 135 * i;
  const OBJ_X = 1065, LEG_X = 1170;
  const LINE_END = { chips: 412, glass: 424, seat: 436, noclock: 280 };

  function mkGlass(par) {
    const o = g(par);
    path(o, 'M -36 -52 L 36 -52 L 28 52 L -28 52 Z', C.paper, C.ink, 5);
    path(o, 'M -32.6 -8 L 32.6 -8 L 28 52 L -28 52 Z', C.lime, C.ink, 4);
    rect(o, -2, -26, 26, 26, 4, C.paper, C.ink, 4).setAttribute('transform', 'rotate(14 11 -13)');
    rect(o, -40, -58, 80, 10, 4, C.paper, C.ink, 4);
    return o;
  }
  function mkNoClock(par) {
    const o = g(par);
    circle(o, 0, 0, 52, C.paper, C.ink, 5);
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; line(o, Math.sin(a) * 40, -Math.cos(a) * 40, Math.sin(a) * 47, -Math.cos(a) * 47, C.ink, i % 3 ? 3 : 5); }
    line(o, 0, 0, 22, 12, C.ink, 6); line(o, 0, 0, -6, -32, C.ink, 5);
    line(o, -50, -50, 50, 50, C.red, 12); line(o, 50, -50, -50, 50, C.red, 12);
    return o;
  }
  function mkPic(par, name, scale) {
    let o;
    try { if (ZV.PICTO && ZV.PICTO.mk) { const pk = ZV.PICTO.mk(par, name, { bg: 'ink', color: 'white', text: '€' }); pk.root.setAttribute('transform', `scale(${scale})`); return pk.root; } } catch (e) { /* repli */ }
    o = g(par);
    if (name === 'chip') { circle(o, 0, 0, 58, C.white, C.ink, 5); circle(o, 0, 0, 34, C.white, C.ink, 4); } else { rect(o, -30, -64, 60, 60, 8, C.white, C.ink, 4); rect(o, -38, -4, 76, 18, 6, C.red, C.ink, 4); rect(o, -30, 14, 10, 50, 2, C.pocket); rect(o, 20, 14, 10, 50, 2, C.pocket); }
    return o;
  }

  function initHead(root, st, p) {
    const T = st.T, first = st.first;
    const amount = str(String(p.amount !== undefined ? p.amount : '100'), '100'), unit = str(p.unit, '€'), chipsUnit = str(p.chips_unit, 'JETONS');
    const question = str(p.question, '?? H ??');
    const need = str(p.need, 'TOUT CE DONT TU AURAIS BESOIN POUR DÉCIDER DE PARTIR');
    const erase = str(p.erase, 'LE BÂTIMENT EFFACE LA TIENNE');
    const bill = str(p.ball_text, 'LA BILLE N’A PAS DE MÉMOIRE');
    const none = !HEAD_CUES.some((n) => T[n]);
    st.amount = amount; st.unit = unit; st.chipsUnit = chipsUnit; st.question = question;
    const fo = (names) => { let r = null; names.forEach((n) => { const v = first(n); if (v != null && (r == null || v < r)) r = v; }); return r; };
    st.tOn = none ? -99 : fo(['cash', 'chips', 'glass-1', 'glass-2', 'seat', 'no-clock', 'memory']);
    st.tCh = first('chips'); st.tG1 = first('glass-1'); st.tG2 = first('glass-2'); st.tSeat = first('seat'); st.tNC = first('no-clock'); st.tMem = first('memory'); st.tBall = first('ball');

    rect(root, 0, 0, 1920, 1080, 0, C.ink);
    /* ---- silhouette (aucun trait de visage : contour seul) ---- */
    path(root, HEAD_D, C.pocket, C.paper, 6);
    st.pad = g(root);
    rect(st.pad, 100, 790, 800, 30, 8, C.grey, C.paper, 5);
    /* ---- écran ---- */
    st.scr = g(root);
    st.scrR = rect(st.scr, -260, -150, 520, 300, 20, C.ink, C.paper, 8);
    st.sc = g(st.scr);
    text(st.sc, 'L’HEURE', -228, -52, 26, C.ink, { mono: true });
    line(st.sc, -228, -6, 228, -6, C.ink, 3, { opacity: 0.25 });
    text(st.sc, 'DÉJÀ SORTI', -228, 28, 26, C.ink, { mono: true });
    // cadran à aiguilles (sans chiffres)
    st.dial = g(st.sc);
    st.dialR = g(st.dial);
    circle(st.dialR, 0, 0, 44, C.paper, C.ink, 5);
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; line(st.dialR, Math.sin(a) * 34, -Math.cos(a) * 34, Math.sin(a) * 40, -Math.cos(a) * 40, C.ink, i % 3 ? 2 : 4); }
    st.hands = g(st.dial);
    line(st.hands, 0, 0, 22, 12, C.ink, 7); line(st.hands, 0, 0, -8, -30, C.ink, 5); circle(st.hands, 0, 0, 5, C.ink);
    st.q1 = text(st.sc, question, 0, 14, 40, C.ink, { mono: true, anchor: 'middle' });
    fitW(st.q1, 190);
    st.q1size = parseFloat(st.q1.getAttribute('font-size'));
    // valeur
    st.vG = g(st.sc);
    st.vC2 = text(st.vG, '', 0, 104, 72, C.grey, { mono: true });
    st.vC1 = text(st.vG, '', 0, 104, 72, C.red, { mono: true });
    st.vNum = text(st.vG, amount, 0, 104, 72, C.ink, { mono: true });
    st.vUnit = text(st.vG, unit, 0, 104, 72, C.ink, { mono: true });
    st.vChip = g(st.vG);
    circle(st.vChip, 0, 0, 27, C.white, C.ink, 5);
    for (let k = 0; k < 4; k++) { const n = g(st.vChip, { transform: `rotate(${k * 90})` }); rect(n, -5, -26, 10, 12, 2, C.lime, C.ink, 2); }
    circle(st.vChip, 0, 0, 13, C.white, C.ink, 3);
    [st.vC2, st.vC1, st.vNum, st.vUnit].forEach((n) => { n.setAttribute('xml:space', 'preserve'); });

    /* ---- colonne d'objets (jamais plus de 4) ---- */
    st.col = g(root);
    const kinds = [
      { key: 'chips', t0: st.tCh },
      { key: 'glass', t0: fo(['glass-1', 'glass-2']) },
      { key: 'seat', t0: st.tSeat },
      { key: 'noclock', t0: st.tNC }
    ].filter((k) => k.t0 != null).sort((a, b) => a.t0 - b.t0);
    const lg = p.legends && typeof p.legends === 'object' ? p.legends : {};
    const L = {
      chips: str(lg.chips, 'ÇA RESSEMBLE À UN JEU'), g1: str(lg.glass1, 'UN VERRE, ÇA DÉTEND'), g2: str(lg.glass2, 'DEUX VERRES, ÇA ARRONDIT'),
      seat: str(lg.seat, 'POUR QUE TU NE TE LÈVES PAS'), noclock: str(lg.noclock, 'PLUS D’HORLOGE')
    };
    st.objs = kinds.map((k, i) => {
      const y = ROW_Y(i), o = { key: k.key, t0: k.t0, y };
      o.line = line(st.col, 985, y, 761, LINE_END[k.key], C.paper, 4, { opacity: 0.8 });
      o.g = g(st.col);
      if (k.key === 'chips') {
        const pk = mkPic(o.g, 'chip', 0.58); pk.setAttribute('transform', `translate(${OBJ_X} ${y}) ` + (pk.getAttribute('transform') || ''));
        o.stk = g(o.g);
        const tx = text(o.stk, L.chips, 0, 9, 26, C.ink, { anchor: 'middle', mono: true });
        const w = fitW(tx, 560) + 52;
        rect(o.stk, -w / 2 + 8, -29 + 8, w, 58, 10, C.paper);
        rect(o.stk, -w / 2, -29, w, 58, 10, C.lime, C.ink, 5);
        o.stk.appendChild(tx);
        o.stkX = LEG_X + w / 2; o.stkY = y;
      } else if (k.key === 'glass') {
        const a = mkGlass(o.g); a.setAttribute('transform', `translate(${OBJ_X - 40} ${y}) scale(1.05)`);
        o.g2 = mkGlass(o.g); o.gx = OBJ_X + 42; o.gy = y;
        o.leg1 = text(o.g, L.g1, LEG_X + 50, y + 9, 26, C.paper, { mono: true }); fitW(o.leg1, 590);
        o.leg2 = text(o.g, L.g2, LEG_X + 50, y + 9, 26, C.paper, { mono: true }); fitW(o.leg2, 590);
      } else if (k.key === 'seat') {
        const pk = mkPic(o.g, 'chair', 0.5); pk.setAttribute('transform', `translate(${OBJ_X} ${y}) ` + (pk.getAttribute('transform') || ''));
        o.leg1 = text(o.g, L.seat, LEG_X, y + 9, 26, C.paper, { mono: true }); fitW(o.leg1, 620);
      } else {
        const c = mkNoClock(o.g); c.setAttribute('transform', `translate(${OBJ_X} ${y}) scale(0.95)`);
        o.leg1 = text(o.g, L.noclock, LEG_X, y + 9, 26, C.paper, { mono: true }); fitW(o.leg1, 620);
      }
      return o;
    });

    /* ---- bandeaux red ---- */
    const mkBan = (x, w, s, size) => {
      const b = g(root);
      rect(b, x, 700, w, 90, 6, C.red, C.paper, 5);
      mkWrapped(b, s, x + w / 2, 745, w - 56, 80, size, C.ink, {});
      return b;
    };
    st.b1 = mkBan(140, 1640, need, 50);
    st.b2 = mkBan(120, 760, erase, 44);
    /* ---- la bille ---- */
    st.ball = g(root);
    circle(st.ball, 0, 0, 60, C.white, C.paper, 4);
    path(st.ball, 'M -36 -20 A 42 42 0 0 1 -8 -42', 'none', C.lime, 8);
    st.ballT = mkWrapped(root, bill, 1390, 440, 780, 130, 54, C.paper, {});
  }

  function updHead(st, t) {
    const tOn = st.tOn, tCh = st.tCh, tG1 = st.tG1, tG2 = st.tG2, tNC = st.tNC, tMem = st.tMem, tBall = st.tBall, tSeat = st.tSeat;
    const on = tOn != null && t >= tOn;
    setA(st.scrR, 'fill', on ? C.paper : C.ink); setA(st.scrR, 'stroke', on ? C.ink : C.paper);
    setA(st.sc, 'display', on ? 'inline' : 'none');
    // inclinaison et coins (verre)
    const tg = tG1 != null ? tG1 : tG2;
    const gp = tg == null ? 0 : E.io2(prog(t, tg, tg + 0.5));
    setA(st.scrR, 'rx', f2(lerp(20, 64, gp)));
    setA(st.scr, 'transform', `translate(${SCR.x} ${SCR.y}) rotate(${f2(3 * gp)})`);

    /* ---- ligne 1 : cadran / ?? H ?? / ? ---- */
    const mem = tMem != null && t >= tMem;
    const hs = Math.min(tNC == null ? 1 : 1 - E.in2(prog(t, tNC, tNC + 0.3)), tMem == null ? 1 : 1 - prog(t, tMem, tMem + 0.2));
    const rs = Math.min(tNC == null ? 1 : 1 - E.in2(prog(t, tNC + 0.3, tNC + 0.5)), tMem == null ? 1 : 1 - prog(t, tMem, tMem + 0.2));
    put(st.hands, 0, 0, 0, hs, hs, hs > 0.01 ? 1 : 0);
    put(st.dialR, 0, 0, 0, rs, rs, rs > 0.01 ? 1 : 0);
    put(st.dial, 650 - SCR.x, -62, 0, 1, 1, 1);
    let qs = 0, qTxt = st.question;
    if (mem) { qTxt = '?'; qs = E.back(prog(t, tMem + 0.1, tMem + 0.4)); }
    else if (tNC != null && t >= tNC) qs = E.back(prog(t, tNC + 0.4, tNC + 0.7));
    if (qTxt === '?') { setA(st.q1, 'font-size', 72); setA(st.q1, 'y', 26); } else { setA(st.q1, 'font-size', f2(st.q1size)); setA(st.q1, 'y', 14); }
    setT(st.q1, qTxt);
    setA(st.q1, 'x', 0);
    put(st.q1, 650 - SCR.x, -62, 0, qs, qs, qs > 0.001 ? 1 : 0);

    /* ---- ligne 2 : la valeur ---- */
    let numS = st.amount, unitS = st.unit, copies = 0;
    const g2 = tG2 != null && t >= tG2;
    const ch = tCh != null && t >= tCh && !g2 && !mem;
    if (mem) { numS = '?'; unitS = ''; }
    else if (g2) { numS = '≈ ' + st.amount; unitS = ''; copies = 10 * E.out2(prog(t, tG2 + 0.4, tG2 + 1.2)); }
    else if (ch) unitS = st.chipsUnit;
    if (mem) copies = 10 * E.out2(prog(tG2 == null ? 0 : tG2 + 0.4, 0, 1)) * (1 - prog(t, tMem, tMem + 0.25)) * (tG2 == null ? 0 : 1);
    const nN = numS.length;
    let left, unitX, chipOp = 0, unitOp = 1, uScale = 1, txt2 = unitS;
    const wUnit = (n) => (n ? (nN + 1 + n) * CW : nN * CW);
    if (ch && !mem) {
      const e = t - tCh, w0 = (nN + 2) * CW, w1 = (nN + 1 + st.chipsUnit.length) * CW;
      left = lerp(-w0 / 2, -w1 / 2, E.io2(prog(e, 0.55, 0.8)));
      unitX = left + (nN + 1) * CW;
      if (e < 0.15) { txt2 = st.unit; uScale = 1 - prog(e, 0, 0.15); chipOp = 0; unitOp = 1; }
      else { txt2 = st.chipsUnit; unitOp = prog(e, 0.6, 0.8); uScale = 1; chipOp = e < 0.55 ? 1 : 1 - prog(e, 0.55, 0.75); }
      const cs = e < 0.15 ? 0 : prog(e, 0.15, 0.3);
      put(st.vChip, unitX + CW / 2, 78, 0, cs, 1, chipOp > 0.01 && cs > 0.01 ? chipOp : 0);
      if (e < 0.15) { setA(st.vUnit, 'transform', `translate(${f2(unitX + CW / 2)} 0) scale(${f2(Math.max(uScale, 0.001))} 1) translate(${f2(-(unitX + CW / 2))} 0)`); }
      else setA(st.vUnit, 'transform', '');
      setA(st.vUnit, 'opacity', f2(unitOp));
      setA(st.vUnit, 'x', f2(unitX));
      vis(st.vUnit, unitOp > 0.01 && (e < 0.15 || e >= 0.6));
      setT(st.vUnit, e < 0.15 ? st.unit : st.chipsUnit);
    } else {
      const w = wUnit(unitS.length);
      left = -w / 2; unitX = left + (nN + 1) * CW;
      vis(st.vChip, false);
      if (tCh == null && !g2 && !mem) {
        // cash seul (ou repos) : « 100 € »
      }
      setA(st.vUnit, 'transform', ''); setA(st.vUnit, 'opacity', 1);
      setT(st.vUnit, unitS); setA(st.vUnit, 'x', f2(unitX)); vis(st.vUnit, !!unitS);
    }
    setT(st.vNum, numS); setA(st.vNum, 'x', f2(left));
    const vis2 = copies > 0.05;
    [st.vC1, st.vC2].forEach((n, i) => { vis(n, vis2); if (vis2) { setT(n, numS); setA(n, 'x', f2(left + (i ? 0.8 : -1) * copies * (i ? 1 : 1))); setA(n, 'y', f2(104 + (i ? -0.6 : 0.5) * copies)); } });
    // taille / pop de la valeur
    const totW = (nN + (ch ? Math.max(1, st.chipsUnit.length) + 1 : (unitS ? unitS.length + 1 : 0))) * CW + 14;
    const fitK = Math.min(1, 440 / Math.max(totW, 1));
    const tPop = g2 ? tG2 : mem ? tMem : (tOn != null && t >= tOn ? tOn : null);
    const bump = tPop == null ? 1 : 1 + 0.1 * Math.sin(Math.PI * prog(t, tPop, tPop + 0.3));
    setA(st.vG, 'transform', `translate(0 78) scale(${f2(fitK * bump)}) translate(0 -78)`);

    /* ---- objets ---- */
    const exitQ = tBall == null ? 0 : prog(t, tBall, tBall + 0.35);
    st.objs.forEach((o) => {
      const e = t - o.t0;
      const pe = E.out3(prog(e, 0, 0.4)), op = prog(e, 0, 0.2) * (1 - exitQ);
      const show = e >= 0 && exitQ < 1;
      setA(o.g, 'display', show ? 'inline' : 'none');
      setA(o.g, 'transform', `translate(${f2((1 - pe) * 260 + exitQ * 300)} 0)`);
      setA(o.g, 'opacity', f2(op));
      const lp = prog(e, 0.2, 0.5);
      vis(o.line, show && lp > 0.01);
      setA(o.line, 'x1', f2(985)); setA(o.line, 'x2', f2(lerp(985, 761, lp)));
      setA(o.line, 'y2', f2(lerp(o.y, LINE_END[o.key], lp)));
      setA(o.line, 'opacity', f2(0.8 * (1 - exitQ)));
      if (o.key === 'chips') {
        const sp = E.back(prog(e, 0.25, 0.5));
        put(o.stk, o.stkX, o.stkY, -1.5, sp, sp, sp > 0.001 ? 1 : 0);
      } else if (o.key === 'glass') {
        const second = tG2 != null && t >= tG2;
        const b = second ? E.back(prog(t, tG2, tG2 + 0.3)) : 0;
        put(o.g2, o.gx, o.gy, 0, 1.05 * b, 1.05 * b, b > 0.001 ? 1 : 0);
        const lq = E.out2(prog(second ? t - tG2 : e, 0.05, 0.3));
        vis(o.leg1, !second); vis(o.leg2, second);
        const ln = second ? o.leg2 : o.leg1;
        setA(ln, 'opacity', f2(lq));
      }
    });
    // siège sous la silhouette
    const sq = tSeat == null ? 0 : E.out3(prog(t, tSeat, tSeat + 0.5));
    setA(st.pad, 'transform', `translate(${f2((1 - sq) * -820)} 0)`);
    vis(st.pad, tSeat != null && sq > 0.001);

    /* ---- bandeaux ---- */
    const showB1 = tMem != null && t >= tMem + 0.2 && (tBall == null || t < tBall + 0.3);
    const q1 = tMem == null ? 0 : E.out3(prog(t, tMem + 0.2, tMem + 0.55));
    const out1 = tBall == null ? 0 : E.in2(prog(t, tBall, tBall + 0.3));
    setA(st.b1, 'transform', `translate(0 ${f2((1 - q1) * 150 + out1 * 150)})`);
    vis(st.b1, showB1);
    const q2 = tBall == null ? 0 : E.out3(prog(t, tBall + 0.3, tBall + 0.65));
    setA(st.b2, 'transform', `translate(0 ${f2((1 - q2) * 150)})`);
    vis(st.b2, tBall != null && t >= tBall + 0.3);
    // bille
    const bp = tBall == null ? 0 : E.back(prog(t, tBall + 0.35, tBall + 0.75));
    put(st.ball, 1390, 270, 0, bp, bp, bp > 0.001 ? 1 : 0);
    const bt = tBall == null ? 0 : E.out2(prog(t, tBall + 0.6, tBall + 0.9));
    setA(st.ballT, 'opacity', f2(bt)); vis(st.ballT, bt > 0.001);
  }

  ZV.define('head-counter', {
    init(root, shot) {
      const p = (shot && shot.props) || {};
      const beats = Array.isArray(shot && shot.beats) ? shot.beats : [];
      const T = {};
      beats.forEach((b) => { if (b && b.do === 'cue' && typeof b.name === 'string' && isNum(b.t)) (T[b.name] || (T[b.name] = [])).push(b.t); });
      Object.keys(T).forEach((k) => T[k].sort((a, c) => a - c));
      const first = (n) => (T[n] ? T[n][0] : null);
      const hasW = WEIGH_CUES.some((n) => T[n]), hasH = HEAD_CUES.some((n) => T[n]);
      const mode = p.mode === 'head' ? 'head' : p.mode === 'weigh' ? 'weigh' : (hasH && !hasW ? 'head' : 'weigh');
      const st = { mode, T, first };
      try { if (mode === 'head') initHead(root, st, p); else initWeigh(root, st, p); } catch (e) { st.err = e; }
      return st;
    },
    update(st, t) {
      if (!st || st.err) return;
      t = isNum(t) ? t : 0;
      try { if (st.mode === 'head') updHead(st, t); else updWeigh(st, t); } catch (e) { /* jamais d'exception */ }
    }
  });
})();
