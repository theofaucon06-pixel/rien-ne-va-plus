// Composant `floor-plan` (épisode 6) : le plan du casino vu de dessus, façon dessin d'architecte, et la liste des 13 principes. Voir EP6-COMPONENTS.md.
// Fonction pure du temps ; aplats, aucun dégradé / flou / lueur / filter. Aucun nom réel : un lieu générique.
// Cues : draw, no-windows, no-clocks, low-ceiling, maze, sightlines, exit, others, you, carpet, mirrors, zero.
(() => {
  'use strict';
  const { C, E, clamp, prog, f2, sv, g, rect, circle, path, line, text, rng } = ZV;
  let UID = 0;
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const num = (v, d) => (v != null && v !== '' && isFinite(+v) ? +v : d);
  const str = (v, d) => (typeof v === 'string' && v.length ? v : d);
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const vis = (n, on) => setA(n, 'visibility', on ? 'visible' : 'hidden');
  const op = (n, o) => { o = clamp(o); setA(n, 'opacity', f2(o)); setA(n, 'visibility', o <= 0.001 ? 'hidden' : 'visible'); };
  const tr = (n, x, y, r, s) => setA(n, 'transform', `translate(${f2(x)} ${f2(y)})` + (r ? ` rotate(${f2(r)})` : '') + (s !== undefined && s !== 1 ? ` scale(${f2(Math.max(s, 0.0001))})` : ''));
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
  // sticker plat centré sur (0,0)
  function stk(parent, label, size, fill, textFill, h) {
    h = h || Math.round(size * 1.7);
    const w = Math.round(bw(label, size) + 56);
    const grp = g(parent);
    rect(grp, -w / 2 + 10, -h / 2 + 10, w, h, 14, C.ink);
    rect(grp, -w / 2, -h / 2, w, h, 14, fill, C.ink, 6);
    T(grp, label, 0, size * 0.35, size, textFill, { anchor: 'middle' });
    grp.__w = w; grp.__h = h;
    return grp;
  }
  // bulle de BD paper bordée ink : lignes centrées, queue pointée vers (tx, ty) (coordonnées relatives au centre de la bulle)
  function bubble(parent, lines, size, tx, ty) {
    const w = Math.round(Math.max(...lines.map((l) => bw(l, size))) + 70), h = Math.round(lines.length * size * 1.22 + 44);
    const grp = g(parent);
    const dx = clamp(tx * 0.4, -w / 2 + 50, w / 2 - 50), by = h / 2;
    const tail = `M${f2(dx - 36)} ${by - 4} L${f2(tx)} ${f2(ty)} L${f2(dx + 36)} ${by - 4} Z`;
    path(grp, tail, C.ink, C.ink, 6).setAttribute('transform', 'translate(10 10)');
    rect(grp, -w / 2 + 10, -h / 2 + 10, w, h, 22, C.ink);
    path(grp, tail, C.paper, C.ink, 6);
    rect(grp, -w / 2, -h / 2, w, h, 22, C.paper, C.ink, 6);
    rect(grp, dx - 31, by - 9, 65, 13, 0, C.paper);
    lines.forEach((l, i) => T(grp, l, 0, -h / 2 + 22 + size * 0.95 + i * size * 1.22, size, C.ink, { anchor: 'middle' }));
    grp.__w = w; grp.__h = h;
    return grp;
  }
  const popT = (n, x, y, rot, p) => { if (p <= 0) { vis(n, false); return; } const s = Math.max(0.0001, E.back(clamp(p))); vis(n, true); tr(n, x, y, rot, s); };

  /* ---------- géométrie du plan (repère local 1120 × 730) ---------- */
  const PW = 1120, PHT = 730;
  const ISL = [
    [80, 90, 260, 90], [400, 90, 200, 90], [680, 90, 160, 90],
    [80, 260, 110, 170], [250, 260, 130, 90], [740, 260, 120, 170], [930, 230, 110, 200],
    [240, 480, 160, 80], [480, 550, 220, 90], [780, 540, 150, 80]
  ];
  const CIR = { x: 560, y: 365, r: 110 };
  const WINS = [[360, 20, 0], [620, 20, 0], [20, 200, 90], [20, 420, 90], [640, 710, 0], [1100, 330, 90]];
  const CLKS = [[200, 52], [520, 52], [760, 52]];
  const ENTR = [150, 710], EXITP = [950, 20];
  const MAZE = [[150, 710], [150, 630], [440, 630], [440, 415], [220, 415], [220, 220], [900, 220], [900, 505], [600, 505]];
  const ROUTE = [[600, 505], [1070, 505], [1070, 150], [950, 150], [950, 20]];
  const MIRR = [[270, 462, 100, 16, 'h', 470], [722, 300, 16, 100, 'v', 730], [450, 184, 100, 16, 'h', 192], [934, 548, 16, 64, 'v', 942]];
  const NAMED = ['no-windows', 'no-clocks', 'low-ceiling', 'maze', 'sightlines', 'exit'];

  function poly(pts) {
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return { pts, cum, len: cum[cum.length - 1], d: 'M' + pts.map((p) => p[0] + ' ' + p[1]).join(' L') };
  }
  function at(pl, s) {
    s = clamp(s, 0, pl.len);
    for (let i = 1; i < pl.pts.length; i++) if (s <= pl.cum[i] + 1e-6) { const k = (s - pl.cum[i - 1]) / Math.max(1e-6, pl.cum[i] - pl.cum[i - 1]); return [pl.pts[i - 1][0] + (pl.pts[i][0] - pl.pts[i - 1][0]) * k, pl.pts[i - 1][1] + (pl.pts[i][1] - pl.pts[i - 1][1]) * k]; }
    return pl.pts[pl.pts.length - 1];
  }
  // pointillés (a, b) révélés sur la longueur d (chaîne mise en cache)
  function dashes(node, d, a, b) {
    d = Math.round(d);
    if (node.__d === d) return;
    node.__d = d;
    if (d <= 0) { vis(node, false); return; }
    const arr = []; let pos = 0;
    while (pos < d) { const da = Math.min(a, d - pos); arr.push(da); pos += da; if (pos >= d) break; arr.push(b); pos += b; }
    if (arr.length % 2) arr.push(5000);
    else arr[arr.length - 1] = 5000;
    node.setAttribute('stroke-dasharray', arr.join(' '));
    vis(node, true);
  }
  const solid = (node, len, d) => {
    d = Math.round(d * 2) / 2;
    if (node.__d === d) return;
    node.__d = d;
    node.setAttribute('stroke-dasharray', `${f2(len)} ${f2(len + 10)}`);
    node.setAttribute('stroke-dashoffset', f2(len - d));
    vis(node, d > 0);
  };

  ZV.define('floor-plan', {
    init(root, shot) {
      const P = shot.props || {};
      const beats = Array.isArray(shot.beats) ? shot.beats : [];
      const dur = isNum(shot.dur) && shot.dur > 0 ? shot.dur : 10;
      const cu = (n) => { const a = beats.filter((b) => b && b.do === 'cue' && b.name === n && isNum(b.t)).map((b) => b.t).sort((x, y) => x - y); return a.length ? a[0] : null; };
      const c = {};
      ['draw', 'no-windows', 'no-clocks', 'low-ceiling', 'maze', 'sightlines', 'exit', 'others', 'you', 'carpet', 'mirrors', 'zero'].forEach((n) => { c[n] = cu(n); });
      const principles = Array.isArray(P.principles) && P.principles.length ? P.principles.slice(0, 10).map(String) : ['PAS DE FENÊTRES', "PAS D'HORLOGES", 'PLAFONDS BAS', 'ALLÉES EN LABYRINTHE', 'MACHINES VISIBLES DE PARTOUT', 'SORTIE JAMAIS EN LIGNE DROITE'];
      const unnamed = clamp(Math.round(num(P.unnamed, 7)), 0, 10);
      const title = str(P.title, '13 PRINCIPES'), source = str(P.source, "D'APRÈS BILL FRIEDMAN, 2000"), youLab = str(P.you, 'TOI');
      const hasList = P.list !== false;
      const nRows = principles.length + unnamed;
      const px = hasList ? 100 : 400, py = 70;
      const st = { dur, c, hasList, nRows, nNamed: principles.length, px, py };
      const uid = 'fp' + (++UID);

      rect(root, 0, 0, 1920, 1080, 0, C.paper);
      const defs = sv('defs', null, root);
      const clip = sv('clipPath', { id: uid + 'c' }, defs);
      rect(clip, 25, 25, PW - 50, PHT - 45, 0, '#000');
      const pg = st.pg = g(root, { transform: `translate(${px} ${py})` });

      /* ---- machines : positions calculées une fois ---- */
      const mach = [];                                                           // [x, y, island, color]
      const islG = [];
      let col = 0;
      /* moquette (au fond) */
      st.carpetG = g(pg);
      /* îlots */
      ISL.forEach(([x, y, w, h], i) => {
        const grp = g(pg), cx = x + w / 2, cy = y + h / 2;
        rect(grp, -w / 2 + 6, -h / 2 + 6, w, h, 18, C.ink);
        rect(grp, -w / 2, -h / 2, w, h, 18, C.paper, C.ink, 6);
        const horiz = w >= h, Ls = horiz ? w : h, Ss = horiz ? h : w;
        const cols = Ss >= 75 ? 2 : 1, per = cols === 1 ? clamp(Math.round(Ls / 45), 3, 6) : clamp(Math.round(Ls / 60), 2, 3);
        for (let a = 0; a < cols; a++) for (let k = 0; k < per; k++) {
          const u = -Ls / 2 + 30 + (Ls - 60) * (per === 1 ? 0.5 : k / (per - 1));
          const v = cols === 1 ? 0 : (a === 0 ? -1 : 1) * 21;
          const mx = horiz ? u : v, my = horiz ? v : u, red = (col++ % 2) === 0;
          if (red) rect(grp, mx - 11, my - 11, 22, 22, 2, C.red, C.ink, 3); else rect(grp, mx - 11, my - 11, 22, 22, 2, C.ink, C.ink, 3);
          mach.push([cx + mx, cy + my]);
        }
        grp.__c = [cx, cy];
        islG.push(grp);
      });
      {
        const grp = g(pg);
        st.cirFill = circle(grp, 0, 0, CIR.r, C.paper, C.ink, 6);
        st.cirRing = circle(grp, 0, 0, 62, 'none', C.ink, 4);
        st.cirRing.setAttribute('stroke-dasharray', '10 10');
        st.zero = T(grp, '0', 0, 56, 160, C.ink, { anchor: 'middle' });
        grp.__c = [CIR.x, CIR.y];
        st.cirG = grp;
        // dents du cylindre autour du cercle (37 cases)
        st.cyl = [];
        const cg = g(pg);
        for (let k = 0; k < 37; k++) {
          const a = k / 37 * Math.PI * 2, s = Math.sin(a), co = -Math.cos(a);
          st.cyl.push(line(cg, CIR.x + s * 117, CIR.y + co * 117, CIR.x + s * 125, CIR.y + co * 125, C.ink, 5, { 'stroke-linecap': 'butt' }));
        }
      }
      st.islG = islG;

      /* ---- moquette : chevrons sur la grille de 40 px, hors îlots ---- */
      st.chev = [];
      for (let gy = 0; gy < 17; gy++) for (let gx = 0; gx < 27; gx++) {
        const cx = 40 + gx * 40, cy = 40 + gy * 40;
        if (ISL.some(([x, y, w, h]) => cx > x - 16 && cx < x + w + 16 && cy > y - 16 && cy < y + h + 16)) continue;
        if (Math.hypot(cx - CIR.x, cy - CIR.y) < CIR.r + 20) continue;
        if (cx < 32 || cx > PW - 32 || cy < 32 || cy > PHT - 40) continue;
        let best = 1e9, ang = 0;
        for (const m of mach) { const d = Math.hypot(m[0] - cx, m[1] - cy); if (d < best) { best = d; ang = Math.atan2(m[1] - cy, m[0] - cx) * 180 / Math.PI; } }
        const n = path(st.carpetG, 'M-5 -8 L5 0 L-5 8', 'none', C.ink, 3.5);
        st.chev.push({ n, cx, cy, ang, dl: cx / PW * 0.5 });
      }
      st.carpetG.setAttribute('opacity', '0.55');

      /* ---- tracés ---- */
      const mz = st.mz = poly(MAZE);
      const atEntrance = c.exit != null && c.you != null && c.exit < c.you;       // TOI n'a pas encore marché : il est à l'entrée
      st.sp = atEntrance ? [150, 698] : [600, 505];
      const rt = st.rt = poly(atEntrance ? MAZE.concat(ROUTE.slice(1)) : ROUTE);
      st.ghost = MIRR.map((m) => {
        const pts = MAZE.map(([x, y]) => (m[4] === 'h' ? [x, 2 * m[5] - y] : [2 * m[5] - x, y]));
        const gg = g(pg, { 'clip-path': `url(#${uid}c)` });
        const n = path(gg, poly(pts).d, 'none', C.pocket, 6);
        n.setAttribute('stroke-dasharray', '1 9999'); n.setAttribute('opacity', '0.55');
        return { g: gg, n, len: poly(pts).len };
      });
      st.mzN = path(pg, mz.d, 'none', C.ink, 8, { 'stroke-linecap': 'butt', 'stroke-linejoin': 'miter' });
      st.rtN = path(pg, rt.d, 'none', C.ink, 9, { 'stroke-linecap': 'butt', 'stroke-linejoin': 'miter' });
      // rayons : de l'entrée vers 14 machines
      {
        const sorted = mach.map((m) => ({ m, a: Math.atan2(m[1] - ENTR[1], m[0] - ENTR[0]) })).sort((p, q) => p.a - q.a);
        st.rays = [];
        for (let k = 0; k < 14; k++) {
          const m = sorted[Math.round(k * (sorted.length - 1) / 13)].m;
          st.rays.push({ n: line(pg, ENTR[0], ENTR[1] - 8, m[0], m[1], C.red, 4, { 'stroke-linecap': 'butt' }), x: m[0], y: m[1] });
        }
      }
      st.straight = line(pg, st.sp[0], st.sp[1], EXITP[0], EXITP[1] + 6, C.red, 5, { 'stroke-linecap': 'butt' });
      st.straight.setAttribute('stroke-dasharray', '14 10');
      st.xg = g(pg);
      line(st.xg, -22, -22, 22, 22, C.red, 8); line(st.xg, 22, -22, -22, 22, C.red, 8);
      st.sTag = g(pg);
      {
        const lab = 'EN LIGNE DROITE', w = Math.round(mw(lab, 22) + 30);
        rect(st.sTag, -w / 2 + 5, -17 + 5, w, 34, 6, C.ink);
        rect(st.sTag, -w / 2, -17, w, 34, 6, C.red, C.ink, 4);
        T(st.sTag, lab, 0, 8, 22, C.ink, { mono: true, anchor: 'middle', weight: 800 });
      }

      /* ---- murs, fenêtres, horloges, ouvertures ---- */
      st.walls = [
        path(pg, 'M200 710 L1100 710 L1100 20 L1000 20', 'none', C.ink, 10, { 'stroke-linecap': 'square', 'stroke-linejoin': 'miter', pathLength: 1, 'stroke-dasharray': '1 1' }),
        path(pg, 'M900 20 L20 20 L20 710 L100 710', 'none', C.ink, 10, { 'stroke-linecap': 'square', 'stroke-linejoin': 'miter', pathLength: 1, 'stroke-dasharray': '1 1' })
      ];
      st.furn = g(pg);
      st.wins = WINS.map(([x, y, r]) => {
        const grp = g(st.furn, { transform: `translate(${x} ${y}) rotate(${r})` });
        rect(grp, -45, -8, 90, 16, 0, C.paper);
        line(grp, -45, -8, 45, -8, C.ink, 2.5, { 'stroke-linecap': 'butt' }); line(grp, -45, 8, 45, 8, C.ink, 2.5, { 'stroke-linecap': 'butt' });
        line(grp, -45, -8, -45, 8, C.ink, 2.5, { 'stroke-linecap': 'butt' }); line(grp, 45, -8, 45, 8, C.ink, 2.5, { 'stroke-linecap': 'butt' });
        const plug = g(grp); rect(plug, -45, -8, 90, 16, 0, C.ink);
        plug.__r = r;
        return { g: grp, plug };
      });
      st.clks = CLKS.map(([x, y]) => {
        const grp = g(st.furn, { transform: `translate(${x} ${y})` });
        circle(grp, 0, 0, 18, C.paper, C.ink, 4);
        line(grp, 0, 0, 0, -11, C.ink, 3); line(grp, 0, 0, 8, 4, C.ink, 3);
        const xx = g(grp); line(xx, -17, -17, 17, 17, C.red, 5); line(xx, 17, -17, -17, 17, C.red, 5);
        const l1 = xx.childNodes[0], l2 = xx.childNodes[1];
        return { g: grp, x1: l1, x2: l2 };
      });
      st.labE = T(st.furn, 'ENTRÉE', ENTR[0], 758, 22, C.ink, { mono: true, anchor: 'middle', weight: 800 });
      path(st.furn, `M${ENTR[0] - 12} 738 L${ENTR[0] + 12} 738 L${ENTR[0]} 721 Z`, C.ink, C.ink, 3);
      st.labS = T(st.furn, 'SORTIE', EXITP[0], 8, 22, C.ink, { mono: true, anchor: 'middle', weight: 800 });

      /* ---- miroirs ---- */
      st.mirrors = MIRR.map(([x, y, w, h, o]) => {
        const grp = g(pg), cx = x + w / 2, cy = y + h / 2;
        rect(grp, -w / 2 + 5, -h / 2 + 5, w, h, 3, C.ink);
        rect(grp, -w / 2, -h / 2, w, h, 3, C.paper, C.ink, 4);
        if (o === 'h') { line(grp, -w / 2 + 14, 4, -w / 2 + 34, -4, C.ink, 3); line(grp, -w / 2 + 40, 4, -w / 2 + 60, -4, C.ink, 3); }
        else { line(grp, -3, -h / 2 + 10, 3, -h / 2 + 24, C.ink, 3); line(grp, -3, -h / 2 + 30, 3, -h / 2 + 44, C.ink, 3); }
        grp.__c = [cx, cy];
        return grp;
      });

      /* ---- TOI ---- */
      st.toi = g(pg);
      circle(st.toi, 0, 0, 18, C.lime, C.ink, 5);
      {
        const tl = text(st.toi, youLab, 28, 8, 22, C.ink, { mono: true, weight: 800 });
        tl.setAttribute('stroke', C.paper); tl.setAttribute('stroke-width', 7); tl.setAttribute('paint-order', 'stroke'); tl.setAttribute('stroke-linejoin', 'round');
      }

      /* ---- autocollants, bulles, légendes (superposés, gérés en créneaux) ---- */
      st.ovs = [];
      const oAdd = (node, x, y, rot, t0, slot, life) => { node.setAttribute('visibility', 'hidden'); if (t0 != null) st.ovs.push({ n: node, x, y, rot, t0, slot, life }); };
      const sLow = stk(pg, 'PLAFOND BAS', 46, C.red, C.ink, 72);
      oAdd(sLow, 560, 365, -6, c['low-ceiling'], 'S', 3.0);
      const sLost = stk(pg, 'PERDU ?', 56, C.paper, C.ink, 84);
      oAdd(sLost, 760, 410, -4, c.you != null ? c.you + 3.2 : null, 'S');
      const bNon = bubble(pg, ["NON. TU ES EXACTEMENT", "LÀ OÙ JE T'AI MIS."], 40, 62, 150);
      oAdd(bNon, 538, 325, 0, c.you != null ? c.you + 4.4 : null, 'S', 4.5);
      const bMir = bubble(pg, ['JE CROIS QUE JE SUIS', 'DÉJÀ PASSÉ ICI.'], 40, 62, 150);
      oAdd(bMir, 538, 325, 0, c.mirrors != null ? c.mirrors + 2.0 : null, 'S', 2.6);
      const sMir = stk(pg, 'LES MIROIRS SONT LÀ POUR ÇA', 40, C.paper, C.ink, 66);
      oAdd(sMir, 560, 365, -2, c.mirrors != null ? c.mirrors + 4.6 : null, 'S');
      const sZero = stk(pg, 'LE ZÉRO EST DANS LE PLAN', 42, C.paper, C.ink, 68);
      oAdd(sZero, 560, 44, -2, c.zero != null ? c.zero + 0.6 : null, 'S');
      const mkLeg = (lab) => { const grp = g(pg); const w = Math.round(mw(lab, 26) + 40); rect(grp, -w / 2, -18, w, 36, 4, C.ink); T(grp, lab, 0, 9, 26, C.paper, { mono: true, anchor: 'middle', weight: 800 }); return grp; };
      oAdd(mkLeg("VISIBLES DÈS L'ENTRÉE"), 560, 745, 0, c.sightlines != null ? c.sightlines + 0.5 : null, 'L');
      oAdd(mkLeg('LES MOTIFS POINTENT VERS LES MACHINES'), 560, 745, 0, c.carpet != null ? c.carpet + 1.0 : null, 'L');
      st.ovs.sort((a, b) => a.t0 - b.t0);
      st.ovs.forEach((o, i) => { o.out = o.life ? o.t0 + o.life : null; for (let j = i + 1; j < st.ovs.length; j++) if (st.ovs[j].slot === o.slot && st.ovs[j].t0 > o.t0) { o.out = o.out == null ? st.ovs[j].t0 : Math.min(o.out, st.ovs[j].t0); break; } });

      /* ---- liste des principes ---- */
      st.list = g(root);
      if (hasList) {
        const L = st.list, LX = 1270;
        {
          const w = Math.round(bw(title, 52) + 70);
          rect(L, LX + 8, 90 + 8, w, 70, 12, C.lime);
          rect(L, LX, 90, w, 70, 12, C.ink, C.ink, 4);
          T(L, title, LX + w / 2, 90 + 52, 52, C.lime, { anchor: 'middle' });
        }
        const pitch = Math.min(40, 520 / Math.max(1, nRows));
        st.rows = [];
        for (let i = 0; i < nRows; i++) {
          const y = 190 + i * pitch, named = i < principles.length, r = { i, named };
          const rg = g(L);
          line(rg, LX, y + pitch - 1, 1820, y + pitch - 1, '#CFC9B8', 2);
          if (named) {
            const lw = mw(principles[i], 26) + 16;
            r.hl = rect(rg, LX + 38, y + 4, Math.min(lw, 500), pitch - 8, 4, C.lime);
            T(rg, principles[i], LX + 46, y + pitch * 0.7, 26, C.ink, { mono: true, weight: 800, maxW: 490 });
          } else rect(rg, LX + 46, y + pitch / 2 - 7, 260, 14, 0, C.pocket);
          rect(rg, LX + 2, y + pitch / 2 - 13, 26, 26, 3, C.paper, C.ink, 4);
          const ck = g(rg);
          const d = `M${LX + 7} ${y + pitch / 2} L${LX + 14} ${y + pitch / 2 + 8} L${LX + 25} ${y + pitch / 2 - 12}`;
          path(ck, d, 'none', C.ink, 11, { 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
          r.ck = path(ck, d, 'none', C.lime, 6, { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', pathLength: 1, 'stroke-dasharray': '1 1' });
          r.ckg = ck; r.y = y;
          st.rows.push(r);
        }
        st.count = g(L);
        T(st.count, `${nRows} / ${nRows}`, LX, 756, 42, C.ink, { mono: true, weight: 800 });
        T(L, source, LX, 800 - 8, 22, C.ink, { mono: true, weight: 800, maxW: 540 });
      }
      return st;
    },

    update(st, t) {
      try {
        t = clamp(t, 0, st.dur + 1);
        const { c } = st;
        const has = (x) => x != null && t >= x;
        const pr = (t0, d) => (t0 == null ? 0 : prog(t, t0, t0 + d));

        /* ---- dessin initial : sans cue `draw`, le plan est déjà fait ---- */
        const td = c.draw;
        const wallP = td == null ? 1 : pr(td, 1.0);
        for (const w of st.walls) { vis(w, wallP > 0); setA(w, 'stroke-dashoffset', f2(1 - wallP)); }
        const fP = td == null ? 1 : pr(td + 1.0, 0.25);
        op(st.furn, fP);
        st.islG.forEach((grp, i) => {
          const p = td == null ? 1 : pr(td + 1.0 + i * 0.12, 0.32);
          if (p <= 0) { vis(grp, false); return; }
          vis(grp, true); tr(grp, grp.__c[0], grp.__c[1], 0, E.back(p));
        });
        {
          const p = td == null ? 1 : pr(td + 1.0 + 10 * 0.12, 0.32);
          const zp = c.zero == null ? 0 : pr(c.zero, 0.45);
          if (p <= 0) vis(st.cirG, false);
          else { vis(st.cirG, true); tr(st.cirG, st.cirG.__c[0], st.cirG.__c[1], 0, E.back(p)); }
          setA(st.cirFill, 'fill', zp > 0.001 ? C.lime : C.paper);
          op(st.cirRing, 1 - clamp(zp * 3));
          const zs = zp > 0 ? Math.max(0.0001, E.back(zp)) : 0;
          setA(st.zero, 'transform', `scale(${f2(zs || 0.0001)})`);
          vis(st.zero, zp > 0.001);
          st.cyl.forEach((l, k) => op(l, c.zero == null ? 0 : pr(c.zero + 0.3 + k * 0.015, 0.1)));
        }
        const pgOn = td == null || t >= td;
        vis(st.pg, pgOn);

        /* ---- fenêtres bouchées ---- */
        st.wins.forEach((w, i) => { const p = c['no-windows'] == null ? 0 : E.out2(pr(c['no-windows'] + i * (4 / 30), 0.12)); setA(w.plug, 'transform', `scale(${f2(Math.max(p, 0.0001))} 1)`); vis(w.plug, p > 0); });
        /* ---- horloges barrées puis retirées ---- */
        st.clks.forEach((k, i) => {
          const t0 = c['no-clocks'];
          const p = t0 == null ? 0 : pr(t0 + i * 0.12, 0.2);
          const gone = t0 == null ? 0 : pr(t0 + 0.75 + i * 0.1, 0.2);
          op(k.g, 1 - gone);
          vis(k.x1.parentNode, p > 0);
          setA(k.x1, 'stroke-dasharray', `${f2(48 * p)} 100`); setA(k.x2, 'stroke-dasharray', `${f2(48 * clamp(p * 1.4 - 0.4))} 100`);
        });

        /* ---- moquette ---- */
        const t0c = c.carpet;
        st.chev.forEach((ch) => {
          const a = t0c == null ? 0 : pr(t0c + ch.dl, 0.15);
          if (a <= 0) { vis(ch.n, false); ch.n.__k = null; return; }
          let an = ch.ang; an = an > 180 ? an - 360 : an;
          const r = E.io2(pr(t0c + 0.9, 20 / 30));
          const key = Math.round(r * 200) + ':' + Math.round(a * 4);
          if (ch.n.__k === key) return;
          ch.n.__k = key;
          vis(ch.n, true);
          ch.n.setAttribute('transform', `translate(${ch.cx} ${ch.cy}) rotate(${f2(an * r)}) scale(${f2(0.4 + 0.6 * a)})`);
        });

        /* ---- chemin, rayons, sortie ---- */
        dashes(st.mzN, c.maze == null ? 0 : st.mz.len * E.io2(pr(c.maze, 2.0)), 18, 12);
        st.rays.forEach((r, k) => {
          const p = c.sightlines == null ? 0 : E.out2(pr(c.sightlines + k * (12 / 30 / 14), 0.2));
          vis(r.n, p > 0);
          setA(r.n, 'x2', f2(150 + (r.x - 150) * p)); setA(r.n, 'y2', f2(702 + (r.y - 702) * p));
        });
        {
          const te = c.exit;
          const sp = te == null ? 0 : E.out2(pr(te, 0.55));
          vis(st.straight, sp > 0);
          setA(st.straight, 'x2', f2(st.sp[0] + (EXITP[0] - st.sp[0]) * sp)); setA(st.straight, 'y2', f2(st.sp[1] + (EXITP[1] + 6 - st.sp[1]) * sp));
          const mx = (st.sp[0] + EXITP[0]) / 2, my = (st.sp[1] + EXITP[1]) / 2;
          const tp = te == null ? 0 : pr(te + 0.45, 0.3);
          popT(st.sTag, 790, 472, -3, tp);
          const xp = te == null ? 0 : pr(te + 0.85, 0.2);
          popT(st.xg, mx, my - 26, 0, xp);
          solid(st.rtN, st.rt.len, te == null ? 0 : st.rt.len * E.io2(pr(te + 1.2, 1.6)));
        }

        /* ---- miroirs et copies fantômes ---- */
        st.mirrors.forEach((m, i) => { const p = c.mirrors == null ? 0 : pr(c.mirrors + i * 0.15, 0.3); if (p <= 0) vis(m, false); else { vis(m, true); tr(m, m.__c[0], m.__c[1], 0, E.back(p)); } });
        st.ghost.forEach((gh, i) => dashes(gh.n, c.mirrors == null ? 0 : st.mz.len * E.io2(pr(c.mirrors + 0.9 + i * 0.35, 1.0)), 8, 10));

        /* ---- TOI ---- */
        {
          const ty = c.you, endPt = MAZE[MAZE.length - 1];
          const firsts = [ty, c.exit, c.mirrors].filter((x) => x != null);
          const tv = firsts.length ? Math.min(...firsts) : null;
          if (tv == null || t < tv) vis(st.toi, false);
          else {
            let pos = endPt;
            if (ty != null) pos = at(st.mz, st.mz.len * clamp((t - ty) / 3));
            vis(st.toi, true); setA(st.toi, 'opacity', f2(clamp((t - tv) / 0.2)));
            tr(st.toi, pos[0], pos[1], 0, 1);
          }
        }

        /* ---- stickers / bulles / légendes : un seul à la fois par créneau ---- */
        for (const o of st.ovs) {
          const pin = pr(o.t0, 0.28), pout = o.out == null ? 0 : pr(o.out, 0.2);
          if (pin <= 0 || pout >= 1) { vis(o.n, false); continue; }
          vis(o.n, true);
          tr(o.n, o.x, o.y, o.rot, Math.max(0.0001, E.back(pin)));
          setA(o.n, 'opacity', f2(clamp(pin * 5) * (1 - pout)));
        }

        /* ---- liste ---- */
        if (st.hasList) {
          const lp = td == null ? 1 : pr(td, 0.4);
          op(st.list, lp); setA(st.list, 'transform', `translate(${f2(40 * (1 - E.out3(lp)))} 0)`);
          const tOth = c.others;
          st.rows.forEach((r) => {
            let tc = null;
            if (r.named) { const nm = r.i < NAMED.length ? NAMED[r.i] : null; tc = nm ? c[nm] : null; }
            else if (tOth != null) tc = tOth + (r.i - st.nNamed) * 0.1;
            const p = tc == null ? 0 : pr(tc, 0.22);
            setA(r.ck, 'stroke-dashoffset', f2(1 - E.out2(p)));
            vis(r.ckg, p > 0);
            if (r.hl) op(r.hl, p > 0 ? 1 : 0);
          });
          const cp = tOth == null ? 0 : pr(tOth + (st.nRows - st.nNamed) * 0.1 + 0.1, 0.25);
          if (cp <= 0) vis(st.count, false);
          else { vis(st.count, true); const s = 1.08 - 0.08 * E.out3(cp); setA(st.count, 'transform', `translate(1270 756) scale(${f2(s)}) translate(-1270 -756)`); setA(st.count, 'opacity', f2(clamp(cp * 4))); }
        }
      } catch (e) { /* jamais d'exception */ }
    }
  });
})();
