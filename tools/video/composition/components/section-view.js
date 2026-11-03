// Composant `section-view` (épisode 6) : le bâtiment en COUPE (profil), pour la hauteur du plafond, la lumière, le décor. Voir EP6-COMPONENTS.md.
// Mode `schools` : deux écoles, un seul but (cues left, right, versus, goal, verdict).
// Mode `walk` : longue coupe parcourue par la caméra + bande-plan (cues enter, lower, narrow, shelter).
// Fonction pure du temps ; aplats, aucun dégradé / flou / lueur / filter. Aucun nom d'entreprise.
(() => {
  'use strict';
  const { C, E, clamp, prog, lerp, f2, sv, g, rect, circle, path, line, text, shakeAt } = ZV;
  let UID = 0;
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const str = (v, d) => (typeof v === 'string' && v.length ? v : d);
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const vis = (n, on) => setA(n, 'visibility', on ? 'visible' : 'hidden');
  const op = (n, o) => { o = clamp(o); setA(n, 'opacity', f2(o)); setA(n, 'visibility', o <= 0.001 ? 'hidden' : 'visible'); };
  const tr = (n, x, y, r, sx, sy) => setA(n, 'transform', `translate(${f2(x)} ${f2(y)})` + (r ? ` rotate(${f2(r)})` : '') + ((sx !== undefined && (sx !== 1 || (sy !== undefined && sy !== 1))) ? ` scale(${f2(Math.max(sx, 0.0001))} ${f2(Math.max(sy === undefined ? sx : sy, 0.0001))})` : ''));
  const bw = (s, size) => { let a = 0; for (const ch of String(s)) a += size * (ch === ' ' ? 0.26 : /[0-9]/.test(ch) ? 0.6 : /[A-ZÀÂÉÈÊÎÔÛÇ€%+×≠=?]/.test(ch) ? 0.66 : /[.,:;'’!|]/.test(ch) ? 0.3 : 0.56); return a; };
  const mw = (s, size) => String(s).length * size * 0.6;
  function T(parent, s, x, y, size, fill, o) {
    o = o || {};
    const est = (sz) => (o.mono ? mw(s, sz) : bw(s, sz));
    if (o.maxW && est(size) > o.maxW) size = size * o.maxW / est(size);
    const n = text(parent, s, x, y, size, fill, { mono: o.mono, anchor: o.anchor, weight: o.weight });
    n.setAttribute('textLength', f2(est(size)));
    n.setAttribute('lengthAdjust', 'spacingAndGlyphs');
    n.__size = size; n.__w = est(size);
    return n;
  }
  function stk(parent, label, size, fill, textFill, h, maxW) {
    h = h || Math.round(size * 1.7);
    const sz = maxW && bw(label, size) + 56 > maxW ? (maxW - 56) / bw(label, size) * size : size;
    const w = Math.round(bw(label, sz) + 56);
    const grp = g(parent);
    rect(grp, -w / 2 + 10, -h / 2 + 10, w, h, 14, C.ink);
    rect(grp, -w / 2, -h / 2, w, h, 14, fill, C.ink, 6);
    T(grp, label, 0, sz * 0.35, sz, textFill, { anchor: 'middle' });
    grp.__w = w; grp.__h = h;
    return grp;
  }
  const halo = (n) => { n.setAttribute('stroke', C.white); n.setAttribute('stroke-width', 8); n.setAttribute('paint-order', 'stroke'); n.setAttribute('stroke-linejoin', 'round'); };
  const pop = (n, x, y, rot, p, k) => { if (p <= 0) { vis(n, false); return; } vis(n, true); const s = Math.max(0.0001, E.back(clamp(p))) * (k || 1); tr(n, x, y, rot, s, s); setA(n, 'opacity', f2(clamp(p * 5))); };
  const smooth = (x, s) => { const u = clamp((x - s + 30) / 60); return u * u * (3 - 2 * u); };

  // machine vue de face (centrée sur (0,0) au sol : le bas est à y = 0)
  function machine(parent, w, h, red) {
    const grp = g(parent);
    rect(grp, -w / 2, -h, w, h, 8, red ? C.red : C.ink, C.ink, 5);
    rect(grp, -w * 0.34, -h + 14, w * 0.68, h * 0.36, 5, red ? C.ink : C.paper);
    rect(grp, -w * 0.3, -h * 0.4, w * 0.6, 10, 2, C.lime, C.ink, 3);
    rect(grp, -w * 0.4, -14, w * 0.8, 14, 2, C.ink);
    return grp;
  }
  function chair(parent) {                                                       // chaise de profil, tournée vers la droite, posée au sol
    const grp = g(parent);
    rect(grp, -22, -78, 10, 76, 2, C.ink);
    rect(grp, -22, -42, 46, 12, 2, C.ink);
    rect(grp, -22, -42, 6, 42, 0, C.ink);
    rect(grp, 16, -42, 6, 42, 0, C.ink);
    return grp;
  }
  function toiDisc(parent, r) {
    const grp = g(parent);
    circle(grp, 0, 0, r, C.lime, C.ink, 5);
    T(grp, 'TOI', 0, 6, 17, C.ink, { mono: true, anchor: 'middle', weight: 800 });
    return grp;
  }
  // flèche lime cernée d'ink, de (x1,y) vers (x2,y)
  function arrow(parent) {
    const grp = g(parent);
    st_line(grp);
    return grp;
  }
  function st_line(grp) {
    grp.__a = line(grp, 0, 0, 0, 0, C.ink, 16, { 'stroke-linecap': 'butt' });
    grp.__b = line(grp, 0, 0, 0, 0, C.lime, 8, { 'stroke-linecap': 'butt' });
    grp.__h = path(grp, 'M0 -18 L28 0 L0 18 Z', C.lime, C.ink, 5);
  }
  function setArrow(grp, x1, x2, y, p) {
    const xe = x1 + (x2 - x1) * p;
    vis(grp, p > 0.01);
    setA(grp.__a, 'x1', f2(x1)); setA(grp.__a, 'x2', f2(xe - 4)); setA(grp.__a, 'y1', y); setA(grp.__a, 'y2', y);
    setA(grp.__b, 'x1', f2(x1)); setA(grp.__b, 'x2', f2(xe - 8)); setA(grp.__b, 'y1', y); setA(grp.__b, 'y2', y);
    setA(grp.__h, 'transform', `translate(${f2(xe - 24)} ${y})`);
  }

  /* =========================================================== schools */
  const PXL = 80, PXR = 980, PY = 140, PWD = 860, PHT = 560, FLOOR = 690, SLAB0 = 148;
  const BAND = { x: 120, y: 540, w: 1680, h: 80 };

  function initSchools(root, st, P, c, dur) {
    const left = Object.assign({ kicker: 'ÉCOLE FRIEDMAN', title: 'LE LABYRINTHE' }, P.left && typeof P.left === 'object' ? P.left : {});
    const right = Object.assign({ kicker: 'ÉCOLE THOMAS', title: 'LE TERRAIN DE JEU' }, P.right && typeof P.right === 'object' ? P.right : {});
    const goal = str(P.goal, 'OBJECTIF : QUE TU RESTES'), verdict = str(P.verdict, 'LE DÉCOR CHANGE. LE BUT, JAMAIS.');
    const uid = 'sv' + (++UID);
    rect(root, 0, 0, 1920, 1080, 0, C.paper);
    const defs = sv('defs', null, root);
    st.sch = { uid };

    /* en-têtes : au-dessus des panneaux, collés aux bords extérieurs (le milieu reste libre pour le tampon) */
    T(root, left.kicker, 80, 70, 26, C.ink, { mono: true, weight: 800, maxW: 500 });
    T(root, left.title, 80, 122, 44, C.ink, { maxW: 600 });
    T(root, right.kicker, 1840, 70, 26, C.ink, { mono: true, weight: 800, anchor: 'end', maxW: 500 });
    T(root, right.title, 1840, 122, 44, C.ink, { anchor: 'end', maxW: 600 });

    const panel = (px, key) => {
      const cp = sv('clipPath', { id: `${uid}${key}` }, defs);
      rect(cp, px + 4, PY + 4, PWD - 8, PHT - 8, 0, '#000');
      rect(root, px + 14, PY + 14, PWD, PHT, 0, C.ink);
      rect(root, px, PY, PWD, PHT, 0, C.paper, C.ink, 8);
      return g(root, { 'clip-path': `url(#${uid}${key})` });
    };
    /* ---- gauche : le labyrinthe ---- */
    const L = st.L = {};
    L.g = panel(PXL, 'l');
    L.floor = rect(L.g, PXL + 8, FLOOR, PWD - 16, 10, 0, C.ink);
    L.slab = rect(L.g, PXL + 8, SLAB0, PWD - 16, 40, 0, C.ink);
    L.wl = rect(L.g, PXL + 8, FLOOR, 52, 10, 0, C.ink);
    L.wr = rect(L.g, PXL + PWD - 60, FLOOR, 52, 10, 0, C.ink);
    L.back = []; L.front = [];
    [[425, 0], [515, 1], [605, 0], [695, 1]].forEach(([x, k], i) => {
      const m = machine(L.g, 66, 120, false); m.__x = PXL + x; m.__y = FLOOR - 8; m.__s = 0.82; m.__t = 0.9 + i * 0.12; L.back.push(m);
    });
    [[470, 1], [560, 0], [650, 1], [740, 0]].forEach(([x, k], i) => {
      const m = machine(L.g, 80, 150, !!k); m.__x = PXL + x; m.__y = FLOOR; m.__s = 1; m.__t = 0.85 + i * 0.12; L.front.push(m);
    });
    L.clock = g(L.g);
    circle(L.clock, 0, 0, 26, C.paper, C.ink, 5); line(L.clock, 0, 0, 0, -16, C.ink, 4); line(L.clock, 0, 0, 12, 6, C.ink, 4);
    L.clockX = g(L.clock); line(L.clockX, -24, -24, 24, 24, C.red, 7); line(L.clockX, 24, -24, -24, 24, C.red, 7);
    L.chair = chair(L.g); L.toi = toiDisc(L.g, 26); L.arr = arrow(L.g);

    /* ---- droite : le terrain de jeu ---- */
    const R = st.R = {};
    R.g = panel(PXR, 'r');
    R.floor = rect(R.g, PXR + 8, FLOOR, PWD - 16, 10, 0, C.ink);
    R.slab = rect(R.g, PXL + 8 + 900, SLAB0, PWD - 16, 40, 0, C.ink);
    R.glass = g(R.g);                                                            // verrière sur le mur du fond
    {
      const gx = PXR + 300, gy = 215, gw = 400, gh = 160;
      R.glassH = gh; R.glassY = gy + gh / 2;
      const gg = R.glassIn = g(R.glass);
      rect(gg, gx + 8, gy + 8, gw, gh, 0, C.ink);
      rect(gg, gx, gy, gw, gh, 0, C.paper, C.ink, 8);
      line(gg, gx + gw / 3, gy, gx + gw / 3, gy + gh, C.ink, 6); line(gg, gx + gw * 2 / 3, gy, gx + gw * 2 / 3, gy + gh, C.ink, 6);
      line(gg, gx, gy + gh / 2, gx + gw, gy + gh / 2, C.ink, 6);
      circle(gg, gx + 332, gy + 40, 40, C.lime, C.ink, 5);
      R.glass.__c = [gx + gw / 2, gy + gh / 2];
      gg.setAttribute('transform', `translate(${-R.glass.__c[0]} ${-R.glass.__c[1]})`);
    }
    R.art = g(R.g);
    {
      const ax = PXR + 70, ay = 235;
      rect(R.art, -50 + 6, -80 + 6, 100, 160, 0, C.ink);
      rect(R.art, -50, -80, 100, 160, 0, C.paper, C.ink, 7);
      circle(R.art, -6, -28, 24, C.lime, C.ink, 4);
      rect(R.art, -30, 8, 40, 40, 0, C.red, C.ink, 4);
      path(R.art, 'M8 54 L34 14 L40 54 Z', C.paper, C.ink, 4);
      R.art.__c = [ax + 40, ay + 80];
    }
    R.tree = g(R.g);
    {
      path(R.tree, 'M-34 0 L34 0 L26 -52 L-26 -52 Z', C.ink, C.ink, 4);
      rect(R.tree, -5, -150, 10, 100, 0, C.ink);
      circle(R.tree, 0, -190, 42, C.lime, C.ink, 5); circle(R.tree, -34, -160, 30, C.lime, C.ink, 5); circle(R.tree, 34, -166, 32, C.lime, C.ink, 5);
      R.tree.__c = [PXR + 770, FLOOR];
    }
    R.mach = [[1530, 1], [1690, 0]].map(([x, k], i) => { const m = machine(R.g, 80, 150, !!k); m.__x = x; m.__y = FLOOR; m.__t = 1.6 + i * 0.15; return m; });
    R.chair = chair(R.g); R.toi = toiDisc(R.g, 26); R.arr = arrow(R.g);

    /* ---- ≠ / =, étiquettes, bandeau, tampon ---- */
    st.vs = g(root);
    {
      circle(st.vs, 5, 5, 48, C.ink); circle(st.vs, 0, 0, 48, C.ink, C.paper, 6);
      st.neq = T(st.vs, '≠', 0, 22, 64, C.paper, { anchor: 'middle', maxW: 60 });
      st.eq = T(st.vs, '=', 0, 22, 64, C.lime, { anchor: 'middle', maxW: 60 });
    }
    const tag = (lab, cx) => { const grp = g(root); const w = Math.round(mw(lab, 28) + 40); rect(grp, -w / 2 + 6, -22 + 6, w, 44, 6, C.ink); rect(grp, -w / 2, -22, w, 44, 6, C.red, C.ink, 5); T(grp, lab, 0, 10, 28, C.ink, { mono: true, anchor: 'middle', weight: 800 }); grp.__cx = cx; return grp; };
    st.tagL = tag('BAS · FERMÉ · SANS JOUR', PXL + PWD / 2);
    st.tagR = tag('HAUT · OUVERT · LUMIÈRE', PXR + PWD / 2);
    st.band = g(root);
    {
      rect(st.band, -BAND.w / 2 + 10, -BAND.h / 2 + 10, BAND.w, BAND.h, 6, C.red);
      rect(st.band, -BAND.w / 2, -BAND.h / 2, BAND.w, BAND.h, 6, C.ink, C.paper, 5);
      T(st.band, goal, 0, 20, 56, C.lime, { anchor: 'middle', maxW: BAND.w - 100 });
    }
    st.stamp = g(root);
    {
      const lines = verdict.indexOf('. ') > 0 ? [verdict.slice(0, verdict.indexOf('. ') + 1), verdict.slice(verdict.indexOf('. ') + 2)] : [verdict];
      const fs = 36, w = Math.round(Math.max(...lines.map((l) => bw(l, fs))) + 64), h = Math.round(lines.length * fs * 1.2 + 36);
      rect(st.stamp, -w / 2, -h / 2, w, h, 10, C.paper, C.red, 8);
      rect(st.stamp, -w / 2 + 9, -h / 2 + 9, w - 18, h - 18, 4, 'none', C.red, 3);
      lines.forEach((l, i) => T(st.stamp, l, 0, -h / 2 + 18 + fs * 0.95 + i * fs * 1.2, fs, C.red, { anchor: 'middle' }));
      st.stamp.__h = h;
    }
  }

  function updateSchools(st, t, c) {
    const has = (x) => x != null && t >= x;
    const pr = (t0, d) => (t0 == null ? 0 : prog(t, t0, t0 + d));
    const L = st.L, R = st.R;
    /* ---- panneau gauche ---- */
    {
      const lt = c.left == null ? -1 : t - c.left, on = lt >= 0;
      vis(L.floor, on && lt >= 0);
      setA(L.floor, 'width', f2((PWD - 16) * E.out2(prog(lt, 0, 0.2))));
      const und = lerp(190, 470, E.in2(prog(lt, 0.4, 0.8)));
      const wtop = lt < 0.4 ? lerp(FLOOR, 190, E.out2(prog(lt, 0.15, 0.4))) : und;
      vis(L.wl, on && lt >= 0.15); vis(L.wr, on && lt >= 0.15);
      for (const w of [L.wl, L.wr]) { setA(w, 'y', f2(wtop)); setA(w, 'height', f2(Math.max(0, FLOOR - wtop))); }
      vis(L.slab, on && lt >= 0.4); setA(L.slab, 'height', f2(Math.max(1, und - SLAB0)));
      L.back.forEach((m) => pop(m, m.__x, m.__y, 0, on ? prog(lt, m.__t, m.__t + 0.25) : 0, 0.82));
      L.front.forEach((m) => pop(m, m.__x, m.__y, 0, on ? prog(lt, m.__t, m.__t + 0.25) : 0));
      pop(L.clock, PXL + 610, 507, 0, on ? prog(lt, 1.5, 1.8) : 0);
      const xp = on ? prog(lt, 1.85, 2.1) : 0;
      vis(L.clockX, xp > 0);
      pop(L.toi, PXL + 150, FLOOR - 26, 0, (on ? prog(lt, 2.0, 2.3) : 0) || (has(c.goal) ? 1 : 0));
      const ch = (on ? prog(lt, 1.9, 2.2) : 0) || (has(c.goal) ? 1 : 0);
      pop(L.chair, PXL + 300, FLOOR, 0, ch);
    }
    /* ---- panneau droit ---- */
    {
      const rt = c.right == null ? -1 : t - c.right, on = rt >= 0;
      vis(R.floor, on); setA(R.floor, 'width', f2((PWD - 16) * E.out2(prog(rt, 0, 0.2))));
      const und = lerp(470, 190, E.out3(prog(rt, 0.15, 0.55)));
      vis(R.slab, on); setA(R.slab, 'x', PXR + 8); setA(R.slab, 'height', f2(Math.max(1, und - SLAB0)));
      const gp = on ? E.out3(prog(rt, 0.65, 1.05)) : 0;
      if (gp <= 0) vis(R.glass, false); else { vis(R.glass, true); tr(R.glass, R.glass.__c[0], R.glass.__c[1], 0, 1, gp); }
      pop(R.art, R.art.__c[0], R.art.__c[1], 0, on ? prog(rt, 1.15, 1.45) : 0);
      pop(R.tree, R.tree.__c[0], R.tree.__c[1], 0, on ? prog(rt, 1.35, 1.7) : 0);
      R.mach.forEach((m) => { const p = on ? prog(rt, m.__t, m.__t + 0.25) : 0; pop(m, m.__x, m.__y, 0, p); });
      pop(R.toi, PXR + 150, FLOOR - 26, 0, (on ? prog(rt, 1.95, 2.25) : 0) || (has(c.goal) ? 1 : 0));
      pop(R.chair, PXR + 300, FLOOR, 0, (on ? prog(rt, 1.9, 2.2) : 0) || (has(c.goal) ? 1 : 0));
    }
    /* ---- ≠, étiquettes ---- */
    const tvis = [c.versus, c.goal].filter((x) => x != null);
    const tvs = tvis.length ? Math.min(...tvis) : null;
    const eqOn = c.goal != null && t >= c.goal + 0.95;
    if (tvs == null) vis(st.vs, false); else { pop(st.vs, 960, 420, 0, prog(t, tvs, tvs + 0.35)); }
    const sw = c.goal == null ? 0 : prog(t, c.goal + 0.95, c.goal + 1.1);
    op(st.neq, 1 - sw); op(st.eq, sw);
    void eqOn;
    for (const tg of [st.tagL, st.tagR]) {
      const p = c.versus == null ? 0 : prog(t, c.versus + 0.3 + (tg === st.tagR ? 0.12 : 0), c.versus + 0.6 + (tg === st.tagR ? 0.12 : 0));
      if (p <= 0) vis(tg, false); else { vis(tg, true); tr(tg, tg.__cx, 752 + 14 * (1 - E.out3(p)), 0, 1, 1); setA(tg, 'opacity', f2(p)); }
    }
    /* ---- but : flèches vers la chaise, bandeau ---- */
    const ga = c.goal == null ? 0 : E.out2(prog(t, c.goal, c.goal + 0.45));
    const gb = c.goal == null ? 0 : E.out2(prog(t, c.goal + 0.2, c.goal + 0.65));
    setArrow(L.arr, PXL + 150 + 36, PXL + 300 - 34, 646, ga);
    setArrow(R.arr, PXR + 150 + 36, PXR + 300 - 34, 646, gb);
    const bp = c.goal == null ? 0 : E.out3(prog(t, c.goal + 0.7, c.goal + 1.15));
    if (bp <= 0) vis(st.band, false); else { vis(st.band, true); tr(st.band, 960, 580, 0, bp, 1); }
    /* ---- verdict ---- */
    const vp = c.verdict == null ? 0 : prog(t, c.verdict, c.verdict + 0.22);
    if (vp <= 0) vis(st.stamp, false);
    else { vis(st.stamp, true); const s = 1 + 0.5 * (1 - E.out3(vp)); tr(st.stamp, 960, 100, -6, s, s); setA(st.stamp, 'opacity', f2(clamp(vp * 4))); }
  }

  /* =========================================================== walk */
  const WORLD = 4200, GROUND = 560, PLAN_Y = 700;
  const STEPS = [1500, 1900, 2500];
  const aisleHalf = (x, p) => lerp(70, 70 - 48 * clamp((x - 1500) / 1500), p);
  const ceilY = (x) => 150 + 110 * smooth(x, 1500) + 100 * smooth(x, 1900) + 60 * smooth(x, 2500);

  function initWalk(root, st, P, c, dur) {
    const first = str(P.first, 'LA PREMIÈRE MINUTE'), safe = str(P.safe, "UN JOUEUR À L'ABRI, IL RESTE.");
    rect(root, 0, 0, 1920, 1080, 0, C.paper);
    const W = st.W = {};
    W.world = g(root);
    const wd = W.world;
    /* coupe : fond blanc, dalle du plafond en marches, sol */
    rect(wd, -40, 130, WORLD + 80, GROUND - 130, 0, C.white);
    path(wd, `M-40 120 L${WORLD + 40} 120 L${WORLD + 40} 420 L2500 420 L2500 360 L1900 360 L1900 260 L1500 260 L1500 150 L-40 150 Z`, C.ink, C.ink, 4).setAttribute('stroke-linejoin', 'miter');
    rect(wd, -40, GROUND, WORLD + 80, 24, 0, C.ink);
    /* entrée : colonnes, fontaine, tapis rouge */
    W.enter = g(wd);
    W.carpet = rect(W.enter, 0, GROUND - 14, 1500, 14, 0, C.red, C.ink, 4);
    W.cols = [330, 530, 730].map((x) => {
      const cg = g(W.enter);
      rect(cg, -22, 176 - GROUND, 44, GROUND - 14 - 176 - 14, 0, C.ink);
      rect(cg, -38, 150 - GROUND, 76, 30, 0, C.ink); rect(cg, -38, -28, 76, 14, 0, C.ink);
      cg.__x = x;
      return cg;
    });
    W.fount = g(W.enter);
    {
      const f = W.fount;
      rect(f, -150, -34, 300, 34, 4, C.lime, C.ink, 6);
      rect(f, -22, -112, 44, 80, 0, C.ink);
      path(f, 'M-104 -116 Q0 -40 104 -116 Z', C.paper, C.ink, 6);
      for (const d of ['M0 -116 L0 -240', 'M-6 -116 C-14 -230 -50 -270 -92 -214', 'M6 -116 C14 -230 50 -270 92 -214']) {
        path(f, d, 'none', C.ink, 20); path(f, d, 'none', C.paper, 9);
      }
      f.__x = 1180; f.__y = GROUND - 14;
    }
    W.stFirst = stk(root, first, 44, C.paper, C.ink, 70, 900);
    /* machines de la coupe (se rapprochent pendant `narrow`) */
    W.mach = [];
    for (let k = 0; k < 24; k++) { const m = machine(wd, 70, 112, k % 2 === 0); m.__k = k; W.mach.push(m); }
    /* abri : aplat ink débordant sous le plafond, au-dessus de TOI */
    W.shelter = rect(wd, 0, 420, 270, 56, 0, C.ink);
    W.shelterEdge = rect(wd, 0, 470, 270, 6, 0, C.lime);
    /* bande-plan */
    rect(wd, -40, 596, WORLD + 80, 208, 0, C.ink);
    W.aisle = path(wd, 'M0 700 L1 700 Z', C.white);
    W.pm = [];
    for (let k = 0; k < 70; k++) {
      const x = 30 + k * 60, red = k % 2 === 0;
      W.pm.push([rect(wd, x - 22, 600, 44, 24, 2, red ? C.red : C.paper, red ? C.paper : C.ink, 3), rect(wd, x - 22, 700, 44, 24, 2, red ? C.red : C.paper, red ? C.paper : C.ink, 3), x]);
    }
    /* TOI sur les deux vues */
    W.toi1 = toiDisc(wd, 24); W.toi2 = toiDisc(wd, 20);
    /* cotes qui suivent TOI */
    W.cv = g(wd);
    W.cvBar = rect(W.cv, -8, 0, 16, 10, 0, C.lime, C.ink, 4);
    W.cvA = path(W.cv, 'M-14 8 L14 8 L0 -10 Z', C.ink); W.cvB = path(W.cv, 'M-14 0 L14 0 L0 18 Z', C.ink);
    W.cvT = T(W.cv, 'PLAFOND', 24, 0, 22, C.ink, { mono: true, weight: 800 });
    halo(W.cvT);
    W.ch = g(wd);
    W.chBar = rect(W.ch, -8, 0, 16, 10, 0, C.lime, C.ink, 4);
    W.chA = path(W.ch, 'M-14 8 L14 8 L0 -10 Z', C.ink); W.chB = path(W.ch, 'M-14 0 L14 0 L0 18 Z', C.ink);
    W.chT = T(W.ch, 'ALLÉE', 24, 0, 22, C.ink, { mono: true, weight: 800 });
    halo(W.chT);
    /* textes fixes à l'écran */
    W.safe = T(root, safe, 960, 92, 60, C.ink, { anchor: 'middle', maxW: 1700 });
    W.stStay = stk(root, 'IL RESTE', 52, C.red, C.ink, 84);
  }

  function walkGeom(st, c, dur) {
    const tL = c.lower, tS = c.shelter;
    let Dl = 5.5;
    const nxt = [c.narrow, c.shelter].filter((x) => x != null && tL != null && x > tL);
    if (nxt.length) Dl = clamp((Math.min(...nxt) - tL) * 0.92, 1.5, 5.5);
    const x0 = 160, xL = 2700, xS = 3300;
    const lowerX = (t) => (tL == null ? x0 : lerp(x0, xL, E.io2(prog(t, tL, tL + Dl))));
    let Ds = 1.6;
    if (tS != null) Ds = Math.max(1.6, Math.abs(xS - lowerX(tS)) / 900);
    const xAt = (t) => {
      if (tS != null && t >= tS) return lerp(lowerX(tS), xS, E.io2(prog(t, tS, tS + Ds)));
      return lowerX(t);
    };
    // instants où TOI franchit chaque marche (secousse)
    const hits = [];
    let prev = xAt(0);
    for (let t = 0.02; t <= dur + 0.5; t += 0.02) {
      const x = xAt(t);
      for (const s of STEPS) if (prev < s && x >= s) hits.push(t);
      prev = x;
    }
    return { xAt, hits, Ds, Dl };
  }

  function updateWalk(st, t, c) {
    const W = st.W, G = st.G;
    const has = (x) => x != null && t >= x;
    const pr = (t0, d) => (t0 == null ? 0 : prog(t, t0, t0 + d));
    const x = G.xAt(t);
    const camX = clamp(x - 520, 0, WORLD - 1920);
    let sx = 0, sy = 0;
    for (const h of G.hits) { const s = shakeAt(t, h, 6, 0.3); sx += s[0] * 0.4; sy += s[1]; }
    setA(W.world, 'transform', `translate(${f2(-camX + sx)} ${f2(sy)})`);
    const sc = (wx) => wx - camX;                                               // abscisse d'écran

    /* entrée */
    const pe = c.enter == null ? 1 : pr(c.enter, 0.5);
    vis(W.enter, pe > 0);
    W.cols.forEach((cg, i) => { const p = c.enter == null ? 1 : prog(t, c.enter + i * 0.1, c.enter + i * 0.1 + 0.3); pop(cg, cg.__x, GROUND, 0, p); });
    pop(W.fount, W.fount.__x, W.fount.__y, 0, c.enter == null ? 1 : prog(t, c.enter + 0.3, c.enter + 0.7));
    setA(W.carpet, 'width', f2(1500 * (c.enter == null ? 1 : E.out2(pr(c.enter, 0.5)))));
    {
      const so = c.enter == null ? 0 : pr(c.enter + 0.6, 0.3), si = c.lower == null ? 0 : pr(c.lower, 0.3);
      if (so * (1 - si) <= 0) vis(W.stFirst, false); else { pop(W.stFirst, 960, 74, -2, so); setA(W.stFirst, 'opacity', f2(clamp(so * 5) * (1 - si))); }
    }

    /* resserrement */
    const pN = c.narrow == null ? 0 : E.io2(pr(c.narrow, 1.6));
    const pitch = lerp(170, 105, pN);
    W.mach.forEach((m, k) => {
      const mx = 1650 + k * pitch;
      const vis_ = c.enter == null || t >= c.enter + 0.6;
      if (!vis_ || mx > WORLD + 100) { vis(m, false); return; }
      vis(m, true); tr(m, mx, GROUND, 0, 1, 1);
    });
    {
      const key = Math.round(pN * 300);
      if (W.aisle.__k !== key) {
        W.aisle.__k = key;
        let top = '', bot = '';
        for (let xx = 0; xx <= WORLD; xx += 60) { const a = aisleHalf(xx, pN); top += `${xx === 0 ? 'M' : 'L'}${xx} ${f2(PLAN_Y - a)} `; bot = `L${xx} ${f2(PLAN_Y + a)} ` + bot; }
        W.aisle.setAttribute('d', top + bot + 'Z');
        for (const [r1, r2, px] of W.pm) { const a = aisleHalf(px, pN); r1.setAttribute('y', f2(PLAN_Y - a - 24)); r2.setAttribute('y', f2(PLAN_Y + a)); }
      }
    }

    /* TOI, cotes */
    vis(W.toi1, true); tr(W.toi1, x, GROUND - 24, 0, 1, 1);
    vis(W.toi2, true); tr(W.toi2, x, PLAN_Y, 0, 1, 1);
    {
      const xc = x + 62, yc = ceilY(xc), aw = aisleHalf(xc, pN);
      const on = c.enter == null ? 1 : pr(c.enter + 0.8, 0.3);
      op(W.cv, on); op(W.ch, on);
      setA(W.cv, 'transform', `translate(${f2(xc)} 0)`);
      setA(W.cvBar, 'y', f2(yc + 8)); setA(W.cvBar, 'height', f2(Math.max(4, GROUND - 8 - yc - 8)));
      setA(W.cvA, 'transform', `translate(0 ${f2(yc)})`); setA(W.cvB, 'transform', `translate(0 ${f2(GROUND - 18)})`);
      setA(W.cvT, 'y', f2((yc + GROUND) / 2 + 8));
      setA(W.ch, 'transform', `translate(${f2(xc)} 0)`);
      setA(W.chBar, 'y', f2(PLAN_Y - aw + 8)); setA(W.chBar, 'height', f2(Math.max(4, aw * 2 - 16)));
      setA(W.chA, 'transform', `translate(0 ${f2(PLAN_Y - aw)})`); setA(W.chB, 'transform', `translate(0 ${f2(PLAN_Y + aw - 18)})`);
      setA(W.chT, 'y', PLAN_Y + 8);
    }

    /* abri + textes */
    {
      const arrive = c.shelter == null ? null : c.shelter + G.Ds;
      const ov = arrive == null ? 0 : E.out2(pr(arrive, 0.4));
      vis(W.shelter, ov > 0); vis(W.shelterEdge, ov > 0);
      setA(W.shelter, 'x', f2(x - 135)); setA(W.shelter, 'height', f2(56 * ov)); setA(W.shelter, 'y', 420);
      setA(W.shelterEdge, 'x', f2(x - 135)); setA(W.shelterEdge, 'y', f2(420 + 56 * ov - 6));
      op(W.safe, arrive == null ? 0 : pr(arrive + 0.15, 0.3));
      const sp = arrive == null ? 0 : pr(arrive + 0.9, 0.3);
      if (sp <= 0) vis(W.stStay, false); else pop(W.stStay, clamp(sc(x), 160, 1760), 270, -3, sp);
    }
  }

  ZV.define('section-view', {
    init(root, shot) {
      const P = shot.props || {};
      const beats = Array.isArray(shot.beats) ? shot.beats : [];
      const dur = isNum(shot.dur) && shot.dur > 0 ? shot.dur : 10;
      const cu = (n) => { const a = beats.filter((b) => b && b.do === 'cue' && b.name === n && isNum(b.t)).map((b) => b.t).sort((x, y) => x - y); return a.length ? a[0] : null; };
      const walk = P.mode === 'walk';
      const names = walk ? ['enter', 'lower', 'narrow', 'shelter'] : ['left', 'right', 'versus', 'goal', 'verdict'];
      let c = {};
      names.forEach((n) => { c[n] = cu(n); });
      if (names.every((n) => c[n] == null)) {                                    // aucun cue : une composition d'ensemble sobre et complète
        const f = walk ? { enter: 0 } : { left: 0.04, right: 0.16, versus: 0.3, goal: 0.42, verdict: 0.62 };
        for (const n in f) c[n] = f[n] * dur;
        if (walk) c.enter = null;
      }
      const st = { dur, walk, c };
      if (walk) { initWalk(root, st, P, c, dur); st.G = walkGeom(st, c, dur); }
      else initSchools(root, st, P, c, dur);
      return st;
    },
    update(st, t) {
      try {
        t = clamp(t, 0, st.dur + 1);
        if (st.walk) updateWalk(st, t, st.c); else updateSchools(st, t, st.c);
      } catch (e) { /* jamais d'exception */ }
    }
  });
})();
