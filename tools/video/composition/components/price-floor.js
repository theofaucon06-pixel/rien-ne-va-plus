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
