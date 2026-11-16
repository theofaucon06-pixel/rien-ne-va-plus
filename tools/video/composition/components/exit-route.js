// Composant `exit-route` (épisode 9) : la sortie qu'aucun casino ne dessine. Deux modes.
// `plan` (S1, S6) : plan de dessus d'un bâtiment sans issue (8 salles = 8 épisodes), un pion TOI dans le couloir ; cues plan, room (répétable), rooms, no-exit, sign, route, step-1..4, leave.
// `road` (S5) : une route en S ; le marcheur avance d'un poteau toutes les `pace` s, rechute, repart, est rejoint par deux accompagnants ; le trait lime ne recule jamais ; cues walk, relapse, continue, together, door.
// Props : mode, rooms[], no_exit, exit, steps[], leave_label ; start, markers, markers_kicker, walker, walker_note, pace, relapse_back, relapse_label, continue_label, trail_label, not_door, path_label, together.
// Fonction pure du temps ; aplats, aucun dégradé / flou / lueur / filter ; aucun portrait ; rien d'important sous y = 840.
(() => {
  'use strict';
  const { C, F, E, clamp, prog, f2, sv, g, rect, circle, path, line, text } = ZV;
  const I = 1 / 30;
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const num = (v, d) => (v != null && v !== '' && isFinite(+v) ? +v : d);
  const str = (v, d) => (typeof v === 'string' && v.trim().length ? v.trim() : d);
  const arr = (v, d) => (Array.isArray(v) && v.length ? v : d);
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const vis = (n, on) => setA(n, 'visibility', on ? 'visible' : 'hidden');
  const dsp = (n, on) => setA(n, 'display', on ? 'inline' : 'none');
  const op = (n, o) => { o = clamp(o); setA(n, 'opacity', f2(o)); setA(n, 'visibility', o <= 0.001 ? 'hidden' : 'visible'); };
  const tr = (n, x, y, r, sx, sy) => { let s = `translate(${f2(x)} ${f2(y)})`; if (r) s += ` rotate(${f2(r)})`; if (sx !== undefined && (sx !== 1 || (sy !== undefined && sy !== 1))) s += ` scale(${f2(Math.max(sx, 0.0001))} ${f2(Math.max(sy === undefined ? sx : sy, 0.0001))})`; setA(n, 'transform', s); };
  const setT = (n, s) => { if (n.__t !== s) { n.__t = s; n.textContent = s; } };
  const pop = (n, x, y, rot, p) => { if (p <= 0) { vis(n, false); return; } vis(n, true); tr(n, x, y, rot, Math.max(0.0001, E.back(clamp(p)))); };
  // mesure réelle du texte (getComputedTextLength), repli sur une estimation hors DOM
  function metric(root) {
    const probe = sv('text', { x: 0, y: -3000, 'font-size': 100, 'font-weight': 800, visibility: 'hidden' }, root);
    const cache = {};
    const est = (s, mono) => { let a = 0; for (const ch of s) a += mono ? 60 : (ch === ' ' ? 26 : /[0-9]/.test(ch) ? 60 : /[A-ZÀÂÉÈÊÎÔÛÇ€%+×≠=?]/.test(ch) ? 68 : /[.,:;'’!|·]/.test(ch) ? 32 : 58); return a; };
    return (s, size, mono) => {
      s = String(s); const k = (mono ? 'm' : 'd') + s; let w = cache[k];
      if (w === undefined) {
        probe.setAttribute('font-family', mono ? F.mono : F.display); probe.textContent = s;
        w = 0; try { w = probe.getComputedTextLength(); } catch (e) { w = 0; }
        if (!(w > 0)) w = est(s, mono);
        cache[k] = w;
      }
      return w * size / 100;
    };
  }
  // texte ajusté : réduit la taille jusqu'à o.min si dépasse o.maxW, puis impose la largeur (textLength) ; o.free = pas de textLength (machine à écrire)
  const mkT = (M) => function T(parent, s, x, y, size, fill, o) {
    o = o || {}; s = String(s);
    let w = M(s, size, o.mono);
    if (o.maxW && w > o.maxW) { size = Math.max(o.min || 10, size * o.maxW / w); w = M(s, size, o.mono); }
    const n = text(parent, s, x, y, f2(size), fill, { mono: o.mono, anchor: o.anchor });
    if (!o.free) { const lim = o.maxW ? Math.min(w, o.maxW) : w; n.setAttribute('textLength', f2(lim)); n.setAttribute('lengthAdjust', 'spacingAndGlyphs'); w = lim; }
    n.__w = w; n.__s = size; return n;
  };
  // coupe en lignes équilibrées (≤ maxL) ; réduit la taille jusqu'à min si besoin
  const mkWrap = (M) => {
    const part = (words, n, sz, mono) => {
      const wl = (a, b) => M(words.slice(a, b).join(' '), sz, mono);
      let best = null;
      const rec = (start, left, cuts, mx) => {
        if (left === 1) { const m = Math.max(mx, wl(start, words.length)); if (!best || m < best.w - 0.5) best = { w: m, cuts: cuts.slice() }; return; }
        for (let e = start + 1; e <= words.length - (left - 1); e++) { cuts.push(e); rec(e, left - 1, cuts, Math.max(mx, wl(start, e))); cuts.pop(); }
      };
      rec(0, n, [], 0);
      const lines = []; let s0 = 0;
      for (const c of best.cuts.concat([words.length])) { lines.push(words.slice(s0, c).join(' ')); s0 = c; }
      return { w: best.w, lines };
    };
    return (s, size, maxW, maxL, mono, min) => {
      const words = String(s).split(/\s+/).filter(Boolean); if (!words.length) words.push(' ');
      maxL = Math.max(1, Math.min(maxL, words.length)); min = min || 12;
      for (let sz = size; ; sz -= 1) {
        for (let n = 1; n <= maxL; n++) { const p = part(words, n, sz, mono); if (p.w <= maxW) return { lines: p.lines, size: sz, w: p.w }; }
        if (sz <= min) { const p = part(words, maxL, sz, mono); return { lines: p.lines, size: sz, w: Math.min(p.w, maxW) }; }
      }
    };
  };
  // bloc plat + ombre dure décalée
  function blk(parent, x, y, w, h, fill, r, sw, sh) {
    const grp = g(parent);
    if (sh) rect(grp, x + sh, y + sh, w, h, r, C.ink);
    rect(grp, x, y, w, h, r, fill, sw === 0 ? null : C.ink, sw || 6);
    return grp;
  }
  // sticker centré sur (0,0), lignes centrées
  function stk(parent, lines, size, fill, tfill, o, M, T) {
    o = o || {}; lines = [].concat(lines);
    const lh = size * 1.18;
    let mw = 0; lines.forEach((l) => { mw = Math.max(mw, M(l, size, o.mono)); });
    const padX = o.padX === undefined ? 30 : o.padX;
    const w = Math.round(mw + padX * 2), h = Math.round(lines.length * lh + (o.padY === undefined ? 26 : o.padY));
    const grp = g(parent), sh = o.sh === undefined ? 10 : o.sh;
    if (sh) rect(grp, -w / 2 + sh, -h / 2 + sh, w, h, o.r === undefined ? 14 : o.r, C.ink);
    rect(grp, -w / 2, -h / 2, w, h, o.r === undefined ? 14 : o.r, fill, C.ink, o.sw || 6);
    lines.forEach((l, i) => T(grp, l, 0, -h / 2 + (h - lines.length * lh) / 2 + lh * (i + 0.5) + size * 0.34, size, tfill, { anchor: 'middle', mono: o.mono }));
    grp.__w = w; grp.__h = h; return grp;
  }

  let UID = 0;
  const lerp = ZV.lerp;
  const RX = [120, 480, 840, 1200];            // x des 4 colonnes de salles
  const CY = 455;                              // axe du couloir
  const STEPX = [0, 1, 2, 3].map((k) => 420 + k * 980 / 3);
  const OUTER = 'M1560 410 V100 H120 V800 H1560 V500', OUTER_L = 310 + 1440 + 700 + 1440 + 300;
  const BAIES = [[255, 345], [615, 705], [975, 1065], [1335, 1425]];
  const WALLS = (() => {
    let d = '', L = 0;
    [410, 500].forEach((y) => { let x0 = 120; BAIES.forEach(([a, b]) => { d += `M${x0} ${y} H${a} `; L += a - x0; x0 = b; }); d += `M${x0} ${y} H1560 `; L += 1560 - x0; });
    [480, 840, 1200].forEach((x) => { d += `M${x} 100 V410 M${x} 500 V800 `; L += 310 + 300; });
    return { d, L };
  })();
  // pion plat (tête + corps), origine = centre de la route au niveau des pieds
  function pawnShape(parent, fill, stroke, sw, k) {
    const gp = g(parent);
    path(gp, `M${-30 * k} ${12 * k} Q${-30 * k} ${-26 * k} 0 ${-26 * k} Q${30 * k} ${-26 * k} ${30 * k} ${12 * k} Z`, fill, stroke, sw);
    circle(gp, 0, -44 * k, 24 * k, fill, stroke, sw);
    return gp;
  }

  ZV.define('exit-route', {
    init(root, shot) {
      const P = (shot && shot.props) || {};
      const beats = Array.isArray(shot && shot.beats) ? shot.beats : [];
      const cuL = (n) => beats.filter((b) => b && b.do === 'cue' && b.name === n && isNum(b.t)).map((b) => b.t).sort((x, y) => x - y);
      const cu = (n) => { const a = cuL(n); return a.length ? a[0] : null; };
      const M = metric(root), T = mkT(M), WR = mkWrap(M);
      const uid = 'er' + (++UID);
      const mode = P.mode === 'road' ? 'road' : 'plan';
      const st = { mode, c: {}, uid };
      const defs = sv('defs', null, root);

      if (mode === 'plan') {
        const rooms = arr(P.rooms, ['LA CASE VERTE', 'LES MACHINES QUI COMPTENT TON TEMPS', 'LE SYSTÈME INFAILLIBLE', 'SE REFAIRE', "LE SEUL JEU QU'ON PEUT BATTRE", 'SANS HORLOGES', 'LES CADEAUX CALCULÉS SUR TES PERTES', 'LE CASINO DANS LA POCHE']).slice(0, 8).map(String);
        while (rooms.length < 8) rooms.push('');
        const noExit = str(P.no_exit, 'AUCUN PANNEAU SORTIE'), exitT = str(P.exit, 'SORTIE');
        const steps = arr(P.steps, ['REPÉRER LES SIGNES', 'APPELER', "S'INTERDIRE", 'SE FAIRE AIDER']).slice(0, 4).map(String);
        const leaveL = str(P.leave_label, 'SE LEVER DE LA TABLE');
        const c = st.c;
        ['plan', 'no-exit', 'sign', 'route', 'leave'].forEach((n) => { c[n] = cu(n); });
        [1, 2, 3, 4].forEach((n) => { c['step-' + n] = cu('step-' + n); });
        // allumage des salles : `room` allume la suivante, `rooms` toutes les éteintes en cascade (4 i)
        const ev = cuL('room').map((t) => ({ t, k: 'r' })).concat(cuL('rooms').map((t) => ({ t, k: 'a' }))).sort((a, b) => a.t - b.t || (a.k < b.k ? 1 : -1));
        const lit = [null, null, null, null, null, null, null, null];
        ev.forEach((e) => {
          if (e.k === 'r') { const i = lit.indexOf(null); if (i >= 0) lit[i] = e.t; }
          else { let n = 0; for (let i = 0; i < 8; i++) if (lit[i] == null) { lit[i] = e.t + n * 4 * I; n++; } }
        });
        st.lit = lit;

        rect(root, 0, 0, 1920, 1080, 0, C.ink);
        const bld = st.bld = g(root);
        rect(bld, 120, 100, 1440, 700, 0, C.paper);
        st.rm = [];
        for (let i = 0; i < 8; i++) {
          const col = i % 4, row = i < 4 ? 0 : 1, x = RX[col];
          const ry = row ? 506 : 106, rh = row ? 288 : 298;
          const lime = rect(bld, x + 6, ry, 348, rh, 0, C.lime);
          const wl = WR(rooms[i] || ' ', 30, 310, 2, false, 24);
          const lh = 36, nl = wl.lines.length;
          const numY = row ? 776 : 172;
          const base = row ? (numY - 34 - (nl - 1) * lh) : 214;
          const veil = rect(bld, x + 6, ry, 348, rh, 0, C.ink);
          const tg = g(bld), tx = [];
          tx.push(T(tg, String(i + 1).padStart(2, '0'), x + 26, numY, 26, C.ink, { mono: true }));
          wl.lines.forEach((l, j) => tx.push(T(tg, l, x + 26, base + j * lh, wl.size, C.ink, { maxW: 312 })));
          st.rm.push({ lime, tg, veil, tx, ax: x + 26, ay: row ? 740 : 190 });
        }
        // murs
        const wl1 = path(bld, WALLS.d, 'none', C.ink, 12, { 'stroke-linecap': 'butt', 'stroke-linejoin': 'miter' });
        const outer = path(bld, OUTER, 'none', C.ink, 12, { 'stroke-linecap': 'butt', 'stroke-linejoin': 'miter' });
        const dw = rect(bld, 1548, 410, 24, 90, 0, C.ink);
        st.walls = wl1; st.outer = outer; st.dw = dw;
        st.floorAll = bld;
        // route et jalons
        const clipId = uid + 'r';
        st.clipR = sv('rect', { x: 200, y: 420, width: 0, height: 70 }, sv('clipPath', { id: clipId }, defs));
        const rg = st.route = g(root, { 'clip-path': `url(#${clipId})` });
        [[22, C.ink], [14, C.lime]].forEach(([w, col]) => path(rg, `M220 ${CY} H1560`, 'none', col, w, { 'stroke-dasharray': '10 44', 'stroke-linecap': 'round' }));
        st.steps = steps.map((s, i) => {
          const sg = g(root);
          const w = Math.round(M(s, 22, true) + 24);
          const top = i % 2 === 0, left = i >= 2;
          const x0 = left ? -24 - w : 24, y0 = top ? -38 : 10;
          rect(sg, x0, y0, w, 28, 6, C.paper, C.ink, 3);
          T(sg, s, x0 + w / 2, y0 + 21, 22, C.ink, { mono: true, anchor: 'middle', maxW: w - 12, min: 14 });
          const dot = circle(sg, 0, 0, 18, C.lime, C.ink, 5);
          return { g: sg, dot, x: STEPX[i] };
        });
        st.pawn = circle(root, 0, 0, 24, C.white, C.ink, 6);
        // plaque de sortie
        const pl = st.plaque = g(root);
        rect(pl, -108, -50, 240, 120, 12, C.ink);
        rect(pl, -120, -60, 240, 120, 12, C.lime, C.ink, 8);
        rect(pl, -100, -26, 30, 52, 3, C.ink); circle(pl, -78, 2, 3, C.lime);
        line(pl, -62, 0, -34, 0, C.ink, 8); path(pl, 'M-46 -13 L-32 0 L-46 13', 'none', C.ink, 8);
        T(pl, exitT, -20, 16, 44, C.ink, { maxW: 124, min: 26 });
        // stickers
        st.noExit = stk(root, [noExit], 44, C.paper, C.ink, { sh: 8, padX: 28, padY: 20, sw: 6 }, M, T);
        const wlv = WR(leaveL, 44, 248, 2, false, 30);
        st.leaveS = stk(root, wlv.lines, wlv.size, C.paper, C.ink, { sh: 10, padX: 26, padY: 28, sw: 6 }, M, T);
      } else {
        /* ================= mode road ================= */
        const c = st.c;
        ['walk', 'relapse', 'continue', 'together', 'door'].forEach((n) => { c[n] = cu(n); });
        const startT = str(P.start, 'CENTRE DE SOINS · GRATUIT'), nMark = Math.max(2, Math.min(16, Math.round(num(P.markers, 8))));
        const mkK = str(P.markers_kicker, 'UN RENDEZ-VOUS TOUTES LES DEUX SEMAINES');
        const walker = str(P.walker, 'SAMI'), wnote = str(P.walker_note, 'PERSONNAGE COMPOSITE');
        const pace = Math.max(0.2, num(P.pace, 1.4)), back = Math.max(0, num(P.relapse_back, 1.5));
        const relL = str(P.relapse_label, 'RECHUTE'), contL = str(P.continue_label, "C'EST NORMAL, ON CONTINUE."), trailL = str(P.trail_label, "UNE RECHUTE N'EFFACE PAS LE CHEMIN");
        const notDoor = str(P.not_door, 'PAS UNE PORTE'), pathL = str(P.path_label, 'UN CHEMIN'), together = str(P.together, "PERSONNE N'OBLIGE À LE FAIRE SEUL");
        // courbe de Bézier fixe et table d'abscisses curvilignes
        const PB = [[100, 640], [700, 820], [1150, 190], [1820, 360]], NS = 600, X = [], Y = [], S = [0];
        for (let i = 0; i <= NS; i++) { const u = i / NS, v = 1 - u; X.push(v * v * v * PB[0][0] + 3 * v * v * u * PB[1][0] + 3 * v * u * u * PB[2][0] + u * u * u * PB[3][0]); Y.push(v * v * v * PB[0][1] + 3 * v * v * u * PB[1][1] + 3 * v * u * u * PB[2][1] + u * u * u * PB[3][1]); if (i) S.push(S[i - 1] + Math.hypot(X[i] - X[i - 1], Y[i] - Y[i - 1])); }
        const L = S[NS];
        const at = (s) => {
          s = clamp(s, 0, L); let lo = 0, hi = NS; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (S[m] <= s) lo = m; else hi = m; }
          const f = (s - S[lo]) / Math.max(1e-6, S[hi] - S[lo]), x = lerp(X[lo], X[hi], f), y = lerp(Y[lo], Y[hi], f);
          let tx = X[hi] - X[lo], ty = Y[hi] - Y[lo]; const n = Math.hypot(tx, ty) || 1; tx /= n; ty /= n;
          return { x, y, tx, ty, ux: ty, uy: -tx };     // (ux,uy) : normale vers le haut
        };
        const DEL = 0.77 * L / (nMark - 1);
        st.L = L; st.at = at; st.DEL = DEL; st.nMark = nMark; st.pace = pace; st.back = back;
        // trajet du marcheur : segments { t0, t1, p0, p1, k } (p en intervalles de poteau)
        const maxP = nMark - 1, segs = [];
        if (c.walk == null) segs.push({ t0: -1e9, t1: 1e9, p0: 0, p1: 0, k: 'still' });
        else {
          let tt = c.walk, pp = 0, moving = true;
          const evs = [];
          if (c.relapse != null && c.relapse >= c.walk) evs.push({ t: c.relapse, k: 'r' });
          if (c['continue'] != null && c['continue'] >= c.walk) evs.push({ t: c['continue'], k: 'c' });
          evs.sort((a, b) => a.t - b.t);
          segs.push({ t0: -1e9, t1: c.walk, p0: 0, p1: 0, k: 'still' });
          const run = (tEnd) => {      // avance jusqu'à tEnd (ou l'arrivée au dernier poteau)
            const tArr = tt + (maxP - pp) * pace;
            if (tArr <= tEnd) { segs.push({ t0: tt, t1: tArr, p0: pp, p1: maxP, k: 'move' }); segs.push({ t0: tArr, t1: tEnd, p0: maxP, p1: maxP, k: 'still' }); pp = maxP; }
            else { const p1 = pp + (tEnd - tt) / pace; segs.push({ t0: tt, t1: tEnd, p0: pp, p1, k: 'move' }); pp = p1; }
            tt = tEnd;
          };
          evs.forEach((e) => {
            if (e.k === 'r' && moving) { run(e.t); const p1 = Math.max(0, pp - back); segs.push({ t0: tt, t1: tt + 10 * I, p0: pp, p1, k: 'slide' }); tt += 10 * I; pp = p1; moving = false; st.relStop = { t: e.t + 10 * I, p: p1 }; }
            else if (e.k === 'c' && !moving && e.t >= tt) { segs.push({ t0: tt, t1: e.t, p0: pp, p1: pp, k: 'still' }); tt = e.t; moving = true; }
          });
          if (moving) { const tArr = tt + (maxP - pp) * pace; segs.push({ t0: tt, t1: tArr, p0: pp, p1: maxP, k: 'move' }); segs.push({ t0: tArr, t1: 1e9, p0: maxP, p1: maxP, k: 'still' }); }
          else segs.push({ t0: tt, t1: 1e9, p0: pp, p1: pp, k: 'still' });
        }
        st.segs = segs;

        rect(root, 0, 0, 1920, 1080, 0, C.paper);
        T(root, mkK, 100, 100, 26, C.ink, { mono: true, maxW: 760, min: 16 });
        const dMain = `M${PB[0][0]} ${PB[0][1]} C${PB[1][0]} ${PB[1][1]} ${PB[2][0]} ${PB[2][1]} ${PB[3][0]} ${PB[3][1]}`;
        const extD = 'M1820 360 L2090 428';
        const cid = uid + 'x';
        st.clipX = sv('rect', { x: 1800, y: 300, width: 0, height: 300 }, sv('clipPath', { id: cid }, defs));
        path(root, dMain, 'none', C.ink, 72);
        const ext = st.ext = g(root, { 'clip-path': `url(#${cid})` });
        path(ext, extD, 'none', C.ink, 72);
        path(root, dMain, 'none', C.paper, 56);
        path(ext, extD, 'none', C.paper, 56);
        st.lime = path(root, dMain, 'none', C.lime, 56, { 'stroke-linecap': 'butt', 'stroke-dasharray': `0 ${f2(L * 3)}` });
        path(root, dMain, 'none', C.ink, 6, { 'stroke-dasharray': '34 26', 'stroke-linecap': 'butt' });
        path(ext, extD, 'none', C.ink, 6, { 'stroke-dasharray': '34 26', 'stroke-linecap': 'butt' });
        // poteaux « RDV »
        for (let k = 1; k < nMark; k++) {
          const a = at(k * DEL), bx = a.x + a.ux * 40, by = a.y + a.uy * 40;
          line(root, f2(bx), f2(by + 4), f2(bx), f2(by - 70), C.ink, 9).setAttribute('stroke-linecap', 'butt');
          rect(root, f2(bx + 5), f2(by - 76), 62, 30, 5, C.paper, C.ink, 4);
          T(root, 'RDV', f2(bx + 36), f2(by - 54), 22, C.ink, { mono: true, anchor: 'middle' });
        }
        // poteau-panneau de départ
        { const a = at(0), sx = 150, sy = a.y + a.uy * 40; const sw2 = WR(startT, 30, 270, 2, false, 22);
          line(root, sx + 30, sy + 6, sx + 30, 470, C.ink, 10).setAttribute('stroke-linecap', 'butt');
          const bw2 = Math.round(sw2.w + 44), bh2 = sw2.lines.length * 36 + 26;
          const bx0 = sx - 50, by0 = 470 - bh2;
          rect(root, bx0 + 8, by0 + 8, bw2, bh2, 8, C.ink); rect(root, bx0, by0, bw2, bh2, 8, C.lime, C.ink, 6);
          sw2.lines.forEach((l, i) => T(root, l, bx0 + bw2 / 2, by0 + 13 + 28 + i * 36 - 2, sw2.size, C.ink, { anchor: 'middle', maxW: bw2 - 24 })); }
        // cadre de porte
        const door = st.door = g(root);
        rect(door, -70, -240, 140, 240, 0, C.ink);
        rect(door, -54, -224, 108, 224, 0, C.paper);
        rect(door, -54, -224, 108, 224, 0, 'none', C.ink, 6);
        circle(door, 32, -110, 9, C.ink);
        const cross = st.cross = g(door);
        line(cross, -46, -204, 46, -26, C.ink, 26); line(cross, 46, -204, -46, -26, C.ink, 26);
        st.cr1 = line(cross, -46, -204, 46, -26, C.red, 18); st.cr2 = line(cross, 46, -204, -46, -26, C.red, 18);
        { const nd = WR(notDoor, 36, 330, 1, false, 24); st.notDoor = stk(root, nd.lines, nd.size, C.ink, C.paper, { sh: 8, padX: 26, padY: 22, sw: 4 }, M, T); }
        { const pw = WR(pathL, 52, 262, 2, false, 40); st.pathL = stk(root, pw.lines, pw.size, C.lime, C.ink, { sh: 10, padX: 28, padY: 26, sw: 6 }, M, T); }
        // repère de rechute
        const rc = st.relMark = g(root);
        line(rc, -16, -16, 16, 16, C.red, 10); line(rc, 16, -16, -16, 16, C.red, 10);
        // compagnons et marcheur
        st.comp = [0, 1].map(() => { const cg = g(root); pawnShape(cg, C.ink, C.ink, 12, 0.62); pawnShape(cg, C.paper, C.lime, 6, 0.62); return cg; });
        st.wk = pawnShape(root, C.white, C.ink, 6, 1);
        // étiquette du marcheur
        { const w = Math.round(Math.max(M(walker, 30), M(wnote, 20, true)) + 36), h = 86; const tg = st.tag = g(root);
          rect(tg, -w / 2 + 8, -h / 2 + 8, w, h, 10, C.ink); rect(tg, -w / 2, -h / 2, w, h, 10, C.paper, C.ink, 5);
          T(tg, walker, 0, -h / 2 + 36, 30, C.ink, { anchor: 'middle', maxW: w - 24 }); T(tg, wnote, 0, -h / 2 + 66, 20, C.ink, { mono: true, anchor: 'middle', maxW: w - 20, min: 14 });
          tg.__w = w; tg.__h = h; }
        // stickers du récit
        { const rw = WR(relL, 32, 300, 1, false, 24); st.relS = stk(root, rw.lines, rw.size, C.red, C.ink, { sh: 8, padX: 24, padY: 22, sw: 6 }, M, T); }
        { const tw = WR(trailL, 24, 560, 1, true, 16); st.trailS = stk(root, tw.lines, tw.size, C.paper, C.ink, { sh: 8, padX: 22, padY: 22, sw: 5, mono: true }, M, T); }
        { const bw = WR(contL, 40, 760, 1, false, 26); const h = bw.size * 1.18 + 38, w = Math.round(bw.w + 64);
          const bg = st.bubble = g(root);
          path(bg, 'M-24 -22 L0 8 L24 -22Z', C.ink, C.ink, 6).setAttribute('transform', 'translate(7 7)');
          rect(bg, -w / 2 + 8, -h - 22 + 8, w, h, 22, C.ink);
          path(bg, 'M-24 -24 L0 8 L24 -24Z', C.paper, C.ink, 6);
          rect(bg, -w / 2, -h - 22, w, h, 22, C.paper, C.ink, 6);
          rect(bg, -19, -27, 38, 8, 0, C.paper);
          bw.lines.forEach((l, i) => T(bg, l, 0, -h - 22 + h / 2 + bw.size * 0.34, bw.size, C.ink, { anchor: 'middle', maxW: w - 40 }));
          bg.__w = w; bg.__h = h + 30; }
        { const tw = WR(together, 40, 840, 1, false, 30); st.togS = stk(root, tw.lines, tw.size, C.lime, C.ink, { sh: 10, padX: 30, padY: 24, sw: 6 }, M, T); st.togS.__w2 = tw.w + 60; }
      }
      return st;
    },

    update(st, t) {
      if (st.mode === 'plan') return updPlan(st, t);
      return updRoad(st, t);
    }
  });

  function updPlan(st, t) {
    const c = st.c;
    const p = c.plan == null ? 1 : prog(t, c.plan, c.plan + 20 * I);
    const on = p > 0;
    dsp(st.bld, on);
    const pOn = c.plan == null ? 1 : prog(t, c.plan + 12 * I, c.plan + 20 * I);
    dsp(st.pawn, pOn > 0);
    if (!on) { dsp(st.route, false); st.steps.forEach((s) => dsp(s.g, false)); dsp(st.plaque, false); dsp(st.noExit, false); dsp(st.leaveS, false); return; }
    // murs : tracé progressif
    const wp = E.io2(p);
    if (wp >= 1) { setA(st.walls, 'stroke-dasharray', 'none'); setA(st.outer, 'stroke-dasharray', 'none'); }
    else { setA(st.walls, 'stroke-dasharray', `${f2(WALLS.L)} ${f2(WALLS.L + 10)}`); setA(st.walls, 'stroke-dashoffset', f2(WALLS.L * (1 - wp))); setA(st.outer, 'stroke-dasharray', `${OUTER_L} ${OUTER_L + 10}`); setA(st.outer, 'stroke-dashoffset', f2(OUTER_L * (1 - wp))); }
    // contour rouge, une seule fois, 10 i
    const flash = c['no-exit'] != null && t >= c['no-exit'] && t < c['no-exit'] + 10 * I;
    setA(st.outer, 'stroke', flash ? C.red : C.ink); setA(st.dw, 'fill', flash ? C.red : C.ink);
    // mur-porte qui glisse
    const sp = c.sign == null ? 0 : E.io2(prog(t, c.sign, c.sign + 10 * I));
    dsp(st.dw, sp < 1); tr(st.dw, 0, -92 * sp);
    const vp = c.sign == null ? 0 : prog(t, c.sign, c.sign + 8 * I);
    // salles
    st.rm.forEach((r, i) => {
      const lt = st.lit[i];
      const q = lt == null ? 0 : prog(t, lt, lt + 8 * I);
      dsp(r.lime, lt != null && t >= lt);
      if (q <= 0) dsp(r.tg, false); else { dsp(r.tg, true); const s = Math.max(0.0001, E.back(q)); setA(r.tg, 'transform', `translate(${r.ax} ${r.ay}) scale(${f2(s)}) translate(${-r.ax} ${-r.ay})`); }
      const vo = 0.62 * vp * (lt != null && t >= lt ? 1 : 0);
      dsp(r.veil, vo > 0.001); setA(r.veil, 'opacity', f2(vo));
      const tf = vp > 0 ? C.paper : C.ink; r.tx.forEach((n) => setA(n, 'fill', tf));
    });
    // route
    const rp = c.route == null ? 0 : E.out2(prog(t, c.route, c.route + 24 * I));
    dsp(st.route, rp > 0); setA(st.clipR, 'width', f2(1380 * rp));
    // marche
    const lv = c.leave == null ? 0 : c.leave, pl1 = c.leave == null ? 0 : E.io2(prog(t, lv, lv + 2)), pl2 = c.leave == null ? 0 : E.out3(prog(t, lv + 2, lv + 2.5));
    let px = lerp(220, 1560, pl1), py = CY;
    if (pl2 > 0) { px = lerp(1560, 1710, pl2); py = lerp(CY, 560, pl2); }
    tr(st.pawn, px, py, 0);
    st.steps.forEach((s, i) => {
      const cn = c['step-' + (i + 1)], q = cn == null ? 0 : prog(t, cn, cn + 8 * I);
      if (q <= 0) dsp(s.g, false); else { dsp(s.g, true); const k = Math.max(0.0001, E.back(q)); setA(s.g, 'transform', `translate(${f2(s.x)} ${CY}) scale(${f2(k)})`); }
      setA(s.dot, 'fill', c.leave != null && px >= s.x ? C.ink : C.lime);
    });
    // plaque, stickers
    pop(st.plaque, 1710, 390, 0, c.sign == null ? 0 : prog(t, c.sign, c.sign + 8 * I));
    pop(st.noExit, 840, 100, -3, c['no-exit'] == null ? 0 : prog(t, c['no-exit'], c['no-exit'] + 8 * I));
    pop(st.leaveS, 1740, 682, 2, c.leave == null ? 0 : prog(t, c.leave + 2.5, c.leave + 2.5 + 8 * I));
  }

  function updRoad(st, t) {
    const c = st.c, segs = st.segs, DEL = st.DEL, at = st.at;
    // position du marcheur et atteinte maximale (en intervalles de poteau)
    let pos = 0, mx = 0, moving = false, segT = 0, segE = 1e9;
    for (const sg of segs) {
      if (t < sg.t0) break;
      const te = Math.min(t, sg.t1);
      const val = sg.k === 'move' ? sg.p0 + (te - sg.t0) / st.pace : sg.k === 'slide' ? sg.p0 + (sg.p1 - sg.p0) * E.out2(prog(te, sg.t0, sg.t1)) : sg.p0;
      mx = Math.max(mx, sg.p0, val);
      if (t <= sg.t1 || sg === segs[segs.length - 1]) { pos = val; moving = sg.k === 'move' && t < sg.t1; segT = sg.t0; segE = sg.t1; break; }
    }
    pos = clamp(pos, 0, st.nMark - 1); mx = Math.max(mx, pos);
    // trait lime : jusqu'à la distance maximale atteinte
    const ml = mx * DEL;
    dsp(st.lime, ml >= 1); setA(st.lime, 'stroke-dasharray', `${f2(ml)} ${f2(st.L * 3)}`);
    // marcheur
    const A = at(pos * DEL);
    const ramp = moving ? Math.min(1, (t - segT) / 0.12, (segE - t) / 0.12) : 0;
    const bob = moving ? -6 * Math.abs(Math.sin(Math.PI * t / 0.34)) * clamp(ramp) : 0;
    const wx = A.x, wy = A.y + 12 + bob;
    tr(st.wk, wx, wy, moving ? 3 * Math.sin(Math.PI * t / 0.34) : 0);
    const tw = st.tag.__w / 2, twx = clamp(wx, tw + 40, 1920 - tw - 40);
    tr(st.tag, twx, A.y + 101 + bob * 0.5, 0);
    // rechute
    const tr0 = st.relStop ? st.relStop.t : null;
    if (tr0 != null && t >= tr0) {
      const B = at(st.relStop.p * DEL), B2 = at(Math.max(0, st.relStop.p * DEL - 56));
      dsp(st.relMark, true); tr(st.relMark, B2.x, B2.y, 0, Math.max(0.0001, E.back(prog(t, tr0, tr0 + 6 * I))));
      const cT = c['continue'];
      const relOn = cT == null || t < cT;
      pop(st.relS, B.x, B.y - 152, -2, relOn ? prog(t, tr0, tr0 + 8 * I) : 0);
      // bande lime devant le marcheur : étiquette sous la bande, à côté de l'étiquette du marcheur
      const ahead = mx - pos > 0.04;
      const w2 = st.trailS.__w / 2, th = st.tag.__w / 2;
      let lx = A.x + th + 18 + w2; if (lx + w2 > 1860) lx = A.x - th - 18 - w2;
      pop(st.trailS, clamp(lx, w2 + 40, 1920 - w2 - 40), Math.min(800, A.y + 58 + st.trailS.__h / 2), 0, ahead ? prog(t, tr0 + 6 * I, tr0 + 14 * I) : 0);
    } else { dsp(st.relMark, false); pop(st.relS, 0, 0, 0, 0); pop(st.trailS, 0, 0, 0, 0); }
    // bulle « on continue »
    if (c['continue'] != null && t >= c['continue']) {
      const tc = c['continue'], f = at(pos0(st, Math.min(t, tc + 2)) * DEL);
      const bw2 = st.bubble.__w / 2, bx = clamp(f.x, bw2 + 30, Math.max(bw2 + 30, 1460 - bw2));
      const by = lerp(f.y - 100, 267, E.io2(prog(t, tc, tc + 2)));
      pop(st.bubble, bx, by, 0, prog(t, tc, tc + 8 * I));
    } else pop(st.bubble, 0, 0, 0, 0);
    // compagnons
    const tg = c.together, e = tg == null ? 0 : E.out3(prog(t, tg, tg + 1));
    st.comp.forEach((cg, i) => {
      if (tg == null || t < tg) { dsp(cg, false); return; }
      dsp(cg, true);
      const sd = i ? -1 : 1, tx = A.x + A.ux * 46 * sd, ty = A.y + 12 + A.uy * 46 * sd + bob;
      tr(cg, tx, lerp(1130, ty, e), 0);
    });
    pop(st.togS, 1860 - st.togS.__w2 / 2 + 0, 120, 0, tg == null ? 0 : prog(t, tg + 0.5, tg + 0.5 + 8 * I));
    // porte
    const dt = c.door;
    const D = at(0.85 * st.L);
    pop(st.door, D.x, D.y + 76, 0, dt == null ? 0 : prog(t, dt, dt + 8 * I));
    const cp = dt == null ? 0 : prog(t, dt + 10 * I, dt + 16 * I);
    setA(st.cr1, 'x2', f2(lerp(-46, 46, Math.min(1, cp * 2)))); setA(st.cr1, 'y2', f2(lerp(-204, -26, Math.min(1, cp * 2))));
    dsp(st.cr2, cp > 0.5); setA(st.cr2, 'x2', f2(lerp(46, -46, clamp(cp * 2 - 1)))); setA(st.cr2, 'y2', f2(lerp(-204, -26, clamp(cp * 2 - 1))));
    dsp(st.cross, cp > 0);
    pop(st.notDoor, D.x, D.y + 76 + 124, -2, dt == null ? 0 : prog(t, dt + 16 * I, dt + 24 * I));
    const xp = dt == null ? 0 : E.out3(prog(t, dt + 36 * I, dt + 50 * I));
    dsp(st.ext, xp > 0); setA(st.clipX, 'width', f2(300 * xp));
    pop(st.pathL, 1766, 250, 0, dt == null ? 0 : prog(t, dt + 52 * I, dt + 60 * I));
  }
  // position (en intervalles de poteau) du marcheur à t, sans effets : version réutilisable
  function pos0(st, t) {
    let pos = 0;
    for (const sg of st.segs) {
      if (t < sg.t0) break;
      const te = Math.min(t, sg.t1);
      pos = sg.k === 'move' ? sg.p0 + (te - sg.t0) / st.pace : sg.k === 'slide' ? sg.p0 + (sg.p1 - sg.p0) * E.out2(prog(te, sg.t0, sg.t1)) : sg.p0;
      if (t <= sg.t1) break;
    }
    return clamp(pos, 0, st.nMark - 1);
  }
})();
