// Composant `coin-flips` : pile ou face. Pièces en 3D plate (scaleY = |cos|), rebond, modes single / row / grid / balance.
(() => {
  const { C, sv, g, f2, E, prog, clamp, lerp, put, show, text, rect, circle, path } = ZV;
  const INK = C.ink;
  const PI = Math.PI;
  const Z0 = (v, d) => (v == null ? d : v);
  const popE = (p) => E.back(clamp(p));
  let UID = 0;

  const measCache = {};
  function meas(root, str, size, mono) {
    const key = str + '|' + size + '|' + (mono ? 1 : 0);
    if (measCache[key] != null) return measCache[key];
    let w = str.length * size * 0.6;
    try {
      const n = text(root, str, 0, 0, size, '#000', { mono });
      const b = n.getComputedTextLength();
      root.removeChild(n);
      if (b > 0) w = b;
    } catch (e) { /* estimation */ }
    measCache[key] = w;
    return w;
  }

  // une pièce de rayon R : deux faces (P sur lime, F sur paper) dont une seule est visible
  function makeCoin(parent, R) {
    const grp = g(parent);
    rect(grp, 0, 0, 0, 0, 0, 'none');
    const sh = circle(grp, R * 0.14, R * 0.14, R, INK);
    const body = g(grp);
    circle(body, 0, 0, R, C.white, INK, Math.max(4, R * 0.085));
    const fP = g(body), fF = g(body);
    circle(fP, 0, 0, R * 0.74, C.lime, INK, Math.max(3, R * 0.06));
    text(fP, 'P', 0, R * 0.36, R * 1.04, INK, { anchor: 'middle' });
    circle(fF, 0, 0, R * 0.74, C.paper, INK, Math.max(3, R * 0.06));
    text(fF, 'F', 0, R * 0.36, R * 1.04, INK, { anchor: 'middle' });
    return { grp, body, fP, fF, sh, R };
  }
  // pose la pièce à un instant d'un lancer : t0 début, dur durée du vol, f0 face de départ (1 = pile), f1 face finale, turns tours, hauteur du jet h
  function setCoin(c, x, y, t, t0, dur, f0, f1, turns, h, sc, vis) {
    const q = prog(t, t0, t0 + dur);
    const total = turns * 2 * PI + (f0 !== f1 ? PI : 0);
    const th = total * E.out2(q);
    const cs = Math.cos(th);
    const air = q < 1 ? -h * Math.sin(PI * Math.min(1, q * 1.0)) : 0;
    // petit rebond à l'atterrissage
    const u = prog(t, t0 + dur, t0 + dur + 0.28);
    const bounce = u > 0 && u < 1 ? -Math.abs(Math.sin(u * PI * 2)) * (h * 0.09) * (1 - u) : 0;
    const face = cs >= 0 ? f0 : 1 - f0;
    show(c.fP, face === 1); show(c.fF, face === 0);
    const sy = Math.max(Math.abs(cs), 0.045);
    c.body.setAttribute('transform', `scale(1 ${f2(sy)})`);
    c.sh.setAttribute('transform', `scale(1 ${f2(sy)})`);
    const s = sc == null ? 1 : sc;
    put(c.grp, x, y + air + bounce, 0, s, s, (vis === undefined ? t >= t0 : vis) ? 1 : 0);
    // l'ombre dure reste collée au sol quand la pièce est en l'air
    return q;
  }

  function bg(root, color) {
    rect(root, 0, 0, 1920, 1080, 0, color);
    const id = 'cf' + (++UID);
    const defs = sv('defs', null, root);
    const pat = sv('pattern', { id, width: 56, height: 56, patternUnits: 'userSpaceOnUse' }, defs);
    sv('circle', { cx: 28, cy: 28, r: 3.2, fill: C.paper, opacity: 0.1 }, pat);
    rect(root, 0, 0, 1920, 1080, 0, `url(#${id})`);
  }

  /* ------------------------------------------------------------------ */
  /*  single + row (+ grid, balance dans les fonctions suivantes)         */
  /* ------------------------------------------------------------------ */
  function buildSingle(st, root, shot, pr) {
    bg(root, INK);
    st.big = makeCoin(root, 210);
    st.tFlip = Z0(ZV.cue(shot, 'flip'), 1.0);
    st.rowDef = shot.beats.find((b) => b.do === 'cue' && b.name === 'row');
    st.tRow = st.rowDef ? st.rowDef.t : null;
    const rows = (st.rowDef && st.rowDef.rows) || pr.rows || null;
    st.rows = rows && rows[0] ? rows[0] : null;
    if (st.rows) {
      const r = ZV.rng(7);
      st.coins = st.rows.map(() => makeCoin(root, 74));
      st.f0 = st.rows.map(() => (r() < 0.5 ? 1 : 0));
    }
  }
  function tickSingle(st, t) {
    // pièce géante : pose sur le sol, lancer à t = flip, atterrit côté face, puis rétrécit quand la rangée arrive
    const shrink = st.tRow == null ? 0 : E.in3(prog(t, st.tRow - 0.05, st.tRow + 0.16));
    const sc = Math.max(0.0001, 1 - shrink);
    const pop = popE(prog(t, 0, 0.35));
    setCoin(st.big, 960, 520, t, st.tFlip, 0.75, 1, 0, 3, 250, sc * pop, shrink < 1);
    if (t < st.tFlip) { show(st.big.fP, true); show(st.big.fF, false); }
    if (st.rows && st.tRow != null) {
      st.rows.forEach((v, i) => {
        const t0 = st.tRow + i * 0.045;
        const x = 960 + (i - 4.5) * 164;
        const q = prog(t, t0, t0 + 0.42);
        const fall = -460 * (1 - E.out2(Math.min(1, q * 1.15)));
        setCoin(st.coins[i], x, 500 + Math.min(0, fall) * 0, t, t0, 0.42, st.f0[i], v, 2, 120, 1);
        // chute depuis le haut : décale en plus la position pendant la descente
        const cg = st.coins[i].grp;
        const cur = cg.getAttribute('transform');
        if (q < 1) { put(cg, x, 500 + fall - 0, 0, 1, 1, t >= t0 ? 1 : 0); }
      });
    }
  }

  function buildRows(st, root, shot, pr) {
    bg(root, INK);
    st.rows = (pr.rows && pr.rows.length ? pr.rows : [[1, 0, 1, 1, 0, 0, 1, 0, 1, 0]]).slice(0, 6);
    st.hi = pr.highlight_row == null ? -1 : pr.highlight_row;
    const rnd = ZV.rng(21);
    const R = 56, pitch = 128, rowH = 150;
    const x0 = 200 + R;
    st.R = R;
    st.coins = st.rows.map((row) => row.map(() => makeCoin(root, R)));
    st.f0 = st.rows.map((row) => row.map(() => (rnd() < 0.5 ? 1 : 0)));
    st.scores = pr.scores || st.rows.map((row) => { const p = row.reduce((a, b) => a + b, 0); return p + '-' + (row.length - p); });
    st.scoreN = st.scores.map((s, i) => {
      const w = 220;
      const lab = text(root, s, 0, 0, 76, C.paper, { anchor: 'middle' });
      return lab;
    });
    st.slot = (r, i) => [x0 + i * pitch, 262 + r * rowH];
    st.tFive = ZV.cue(shot, 'five');
    st.tGrid = Z0(ZV.cue(shot, 'grid'), 1.5);
    st.tSticker = ZV.cue(shot, 'sticker');
    // bandeau « ATTENDU : 5 PILES »
    const bw = meas(root, 'ATTENDU : 5 PILES', 62, false) + 70;
    st.banner = g(root);
    ZV.sticker(st.banner, bw, 106, C.lime, null, 62, INK, { sh: 10 });
    text(st.banner, 'ATTENDU : 5 PILES', 0, 22, 62, INK, { anchor: 'middle', len: bw - 70 });
    // sticker final
    const sw = meas(root, pr.sticker || '', 62, false) + 70;
    st.stk = g(root);
    ZV.sticker(st.stk, sw, 106, C.paper, null, 62, INK, { sh: 10 });
    text(st.stk, pr.sticker || '', 0, 22, 62, INK, { anchor: 'middle', len: sw - 70 });
    // cadre lime autour de la ligne 5-5
    st.frame = rect(root, 0, 0, 10, 10, 26, 'none', C.lime, 9);
    st.frame.setAttribute('visibility', 'hidden');
    st.hiRow = st.hi;
  }
  function tickRows(st, t) {
    const R = st.R;
    const hiR = st.hi;
    const nrows = st.rows.length;
    // ordre d'arrivée : les lignes non surlignées s'enchaînent
    const order = []; for (let r = 0; r < nrows; r++) if (r !== hiR) order.push(r);
    st.rows.forEach((row, r) => {
      row.forEach((v, i) => {
        const c = st.coins[r][i];
        const [sx, sy] = st.slot(r, i);
        if (r === hiR) {
          // la ligne 5-5 est déjà là (au centre) puis glisse vers sa place
          const gx = 960 + (i - 4.5) * 128, gy = 470;
          const e = E.io2(prog(t, st.tGrid, st.tGrid + 0.5));
          const x = lerp(gx, sx, e), y = lerp(gy, sy, e);
          setCoin(c, x, y, t, 0, 0.0001, st.f0[r][i], v, 0, 0, 1);
          // la ligne apparaît d'emblée avec la bonne face
          show(c.fP, v === 1); show(c.fF, v === 0);
          const pp = popE(prog(t, i * 0.02, i * 0.02 + 0.3));
          put(c.grp, x, y, 0, pp, pp, 1);
          c.body.setAttribute('transform', 'scale(1 1)'); c.sh.setAttribute('transform', 'scale(1 1)');
        } else {
          const k = order.indexOf(r);
          const t0 = st.tGrid + 0.15 + k * 0.28 + i * 0.035;
          const q = prog(t, t0, t0 + 0.45);
          const fall = -420 * (1 - E.out2(Math.min(1, q * 1.2)));
          setCoin(c, sx, sy, t, t0, 0.45, st.f0[r][i], v, 2, 90, 1);
          if (q < 1) put(c.grp, sx, sy + fall, 0, 1, 1, t >= t0 ? 1 : 0);
        }
      });
      // score de la ligne
      const lab = st.scoreN[r];
      const ts = r === hiR ? st.tGrid + 0.55 : st.tGrid + 0.15 + order.indexOf(r) * 0.28 + 0.9;
      const k = popE(prog(t, ts, ts + 0.25));
      const sx = 1613, sy = 262 + r * 150 + 26;
      lab.setAttribute('transform', `translate(${sx} ${sy}) scale(${f2(Math.max(k, 0.001))})`);
      lab.setAttribute('visibility', t >= ts ? 'visible' : 'hidden');
      lab.setAttribute('fill', r === hiR ? C.lime : C.paper);
    });
    // bandeau « ATTENDU »
    if (st.tFive != null) {
      const k = popE(prog(t, st.tFive, st.tFive + 0.3));
      const ex = E.io2(prog(t, st.tGrid, st.tGrid + 0.45));
      put(st.banner, lerp(960, 640, ex), lerp(130, 108, ex), -2, lerp(1.0, 0.82, ex) * k, lerp(1.0, 0.82, ex) * k, t >= st.tFive ? 1 : 0);
    } else put(st.banner, 0, 0, 0, 0, 0, 0);
    // cadre lime
    if (hiR >= 0) {
      const tf = st.tGrid + 1.35;
      const q = popE(prog(t, tf, tf + 0.25));
      const w = 10 * 128 - 12 + 44, h = R * 2 + 36;
      st.frame.setAttribute('x', f2(200 + R - R - 22)); st.frame.setAttribute('y', f2(262 + hiR * 150 - R - 18));
      st.frame.setAttribute('width', f2(w)); st.frame.setAttribute('height', f2(h));
      st.frame.setAttribute('opacity', f2(Math.min(1, q)));
      st.frame.setAttribute('visibility', t >= tf ? 'visible' : 'hidden');
    }
    // sticker (≈ 1 FOIS SUR 4)
    if (st.tSticker != null) {
      const k = popE(prog(t, st.tSticker, st.tSticker + 0.3));
      put(st.stk, 1430, 108, 3, k, k, t >= st.tSticker ? 1 : 0);
    } else put(st.stk, 0, 0, 0, 0, 0, 0);
  }

  /* ------------------------------------------------------------------ */
  /*  Balance                                                            */
  /* ------------------------------------------------------------------ */
  const SIDE = [
    [0, 0, 0, 0, 0, 1, 1, 1, 1, 1],   // 5-5
    [0, 0, 0, 0, 0, 0, 0, 1, 1, 1],   // 7-3
    [0, 0, 1, 1, 1, 1, 1, 1, 1, 1],   // 2-8
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 1]    // 6-4
  ];
  function buildBalance(st, root, shot, pr) {
    bg(root, INK);
    const PX = 960, PY = 280, HALF = 430;
    st.PX = PX; st.PY = PY; st.HALF = HALF;
    // pied
    rect(root, PX - 20 + 12, PY + 12, 40, 470, 8, '#2A2A2A');
    rect(root, PX - 20, PY, 40, 470, 8, C.white, INK, 6);
    rect(root, PX - 140 + 12, PY + 450 + 12, 280, 40, 14, '#2A2A2A');
    rect(root, PX - 140, PY + 450, 280, 40, 14, C.red, INK, 6);
    st.beam = g(root);
    rect(st.beam, -HALF, -14, HALF * 2, 28, 14, C.white, INK, 6);
    circle(root, PX, PY, 24, C.lime, INK, 6);
    st.pans = [0, 1].map((side) => {
      const strings = [sv('line', { stroke: C.paper, 'stroke-width': 5, 'stroke-linecap': 'round' }, root), sv('line', { stroke: C.paper, 'stroke-width': 5, 'stroke-linecap': 'round' }, root)];
      const pan = g(root);
      path(pan, 'M -170 0 H 170 A 170 70 0 0 1 -170 0 Z', side ? C.red : C.white, INK, 6);
      return { pan, strings };
    });
    const rnd = ZV.rng(5);
    st.coins = SIDE[0].map(() => makeCoin(root, 34));
    st.f0 = SIDE[0].map(() => (rnd() < 0.5 ? 1 : 0));
    st.t = {
      tilt: Z0(ZV.cue(shot, 'tilt'), 0.9), s1: Z0(ZV.cue(shot, 's1'), 1.9), s2: Z0(ZV.cue(shot, 's2'), 2.5), reflip: Z0(ZV.cue(shot, 'reflip'), 3.1)
    };
    const sc = pr.scores || ['7-3', '2-8'];
    st.labels = ['5-5', sc[0] || '7-3', sc[1] || '2-8', '6-4'];
    st.score = text(root, '5-5', 960, 168, 150, C.paper, { anchor: 'middle' });
    // rappel : P à gauche, F à droite
    const lp = g(root, { transform: 'translate(300 168)' });
    const lf = g(root, { transform: 'translate(1620 168)' });
    st.lp = lp; st.lf = lf;
    const c1 = makeCoin(lp, 46); put(c1.grp, 0, 0, 0, 1, 1, 1); show(c1.fP, true); show(c1.fF, false);
    const c2 = makeCoin(lf, 46); put(c2.grp, 0, 0, 0, 1, 1, 1); show(c2.fP, false); show(c2.fF, true);
    c1.body.setAttribute('transform', 'scale(1 1)'); c2.body.setAttribute('transform', 'scale(1 1)');
  }
  // angle du fléau pour un état (positif : côté droit plus bas)
  const angOf = (stage) => { const s = SIDE[stage]; const L = s.filter((x) => x === 0).length, Rn = s.length - L; return (Rn - L) * 3.2; };
  function tickBalance(st, t) {
    const T = st.t;
    const times = [0, T.s1, T.s2, T.reflip];
    const stage = t >= T.reflip ? 3 : t >= T.s2 ? 2 : t >= T.s1 ? 1 : 0;
    // angle : ressort amorti à chaque nouvel état + léger frémissement au repère `tilt`
    const A = (k) => angOf(k);
    let ang = 0;
    if (stage === 0) {
      const w = t - T.tilt;
      ang = w > 0 ? 3.2 * Math.sin(w * 7) * Math.exp(-w * 0.8) * 0.9 + 0 : 0;
    } else {
      const u = t - times[stage];
      const from = A(stage - 1), to = A(stage);
      ang = to + (from - to) * Math.exp(-u * 5.5) * Math.cos(u * 12);
    }
    st.beam.setAttribute('transform', `translate(${st.PX} ${st.PY}) rotate(${f2(ang)})`);
    const c = Math.cos(ang * PI / 180), s = Math.sin(ang * PI / 180);
    const ends = [[st.PX - st.HALF * c, st.PY - st.HALF * s], [st.PX + st.HALF * c, st.PY + st.HALF * s]];
    const panPos = ends.map((e) => [e[0], e[1] + 250]);
    st.pans.forEach((pn, k) => {
      const [ex, ey] = ends[k], [px, py] = panPos[k];
      pn.pan.setAttribute('transform', `translate(${f2(px)} ${f2(py)})`);
      pn.strings[0].setAttribute('x1', f2(ex)); pn.strings[0].setAttribute('y1', f2(ey)); pn.strings[0].setAttribute('x2', f2(px - 160)); pn.strings[0].setAttribute('y2', f2(py));
      pn.strings[1].setAttribute('x1', f2(ex)); pn.strings[1].setAttribute('y1', f2(ey)); pn.strings[1].setAttribute('x2', f2(px + 160)); pn.strings[1].setAttribute('y2', f2(py));
    });
    // pièces : chaque pièce a un côté (0 gauche = P, 1 droite = F) par état, et un rang dans le plateau
    const rank = (stageK, idx) => { let r = 0; const side = SIDE[stageK][idx]; for (let j = 0; j < idx; j++) if (SIDE[stageK][j] === side) r++; return r; };
    const slotPos = (stageK, idx, px, py) => {
      const side = SIDE[stageK][idx], r = rank(stageK, idx);
      const col = r % 4, row = Math.floor(r / 4);
      return [panPos[side][0] + (col - 1.5) * 76, panPos[side][1] - 34 - row * 66];
    };
    const reflipT = T.reflip;
    st.coins.forEach((cn, idx) => {
      // position : état courant (ou transition depuis l'état précédent si le côté a changé)
      const sA = SIDE[stage][idx], sP = stage > 0 ? SIDE[stage - 1][idx] : sA;
      const tStart = times[stage];
      const q = stage === 0 ? 1 : prog(t, tStart + (sA !== sP ? idx * 0.025 : 0), tStart + 0.55 + (sA !== sP ? idx * 0.025 : 0));
      const cur = slotPos(stage, idx), prev = stage > 0 ? slotPos(stage - 1, idx) : cur;
      // pour la transition, la position précédente suit le plateau actuel (les plateaux bougent)
      let x = cur[0], y = cur[1], face = sA === 0 ? 1 : 0;
      let flipScale = 1;
      if (stage > 0 && q < 1) {
        const e = E.io2(q);
        const pp = slotPos(stage - 1, idx);
        x = lerp(pp[0], cur[0], e); y = lerp(pp[1], cur[1], e);
        if (sA !== sP) {
          y -= Math.sin(q * PI) * 140;
          const th = q * 2 * PI * 1;
          flipScale = Math.cos(th);
          face = flipScale >= 0 ? (sP === 0 ? 1 : 0) : (sA === 0 ? 1 : 0);
        } else {
          y -= Math.sin(q * PI) * 30;
          face = sA === 0 ? 1 : 0;
        }
      }
      // `reflip` : toutes les pièces sautent et tournent sur place
      if (stage === 3) {
        const u = prog(t, reflipT + idx * 0.02, reflipT + idx * 0.02 + 0.5);
        if (u > 0 && u < 1 && sA === sP) { y -= Math.sin(u * PI) * 90; flipScale = Math.cos(u * 2 * PI * 1.5); face = flipScale >= 0 ? (sA === 0 ? 1 : 0) : (sA === 0 ? 0 : 1); }
      }
      show(cn.fP, face === 1); show(cn.fF, face === 0);
      const sy = Math.max(Math.abs(flipScale), 0.05);
      cn.body.setAttribute('transform', `scale(1 ${f2(sy)})`);
      cn.sh.setAttribute('transform', `scale(1 ${f2(sy)})`);
      const pop = popE(prog(t, idx * 0.03, idx * 0.03 + 0.3));
      put(cn.grp, x, y, 0, pop, pop, 1);
    });
    // score affiché
    st.score.textContent = st.labels[stage];
    st.score.setAttribute('visibility', 'visible');
  }

  ZV.define('coin-flips', {
    init(root, shot) {
      const pr = shot.props || {};
      const st = { mode: pr.mode || 'single' };
      try {
        if (st.mode === 'balance') buildBalance(st, root, shot, pr);
        else if (st.mode === 'grid' || st.mode === 'row') buildRows(st, root, shot, pr);
        else buildSingle(st, root, shot, pr);
      } catch (e) { if (window.ZV_DEBUG) console.error(e); }
      return st;
    },
    update(st, t, shot) {
      try {
        if (st.mode === 'balance') tickBalance(st, t);
        else if (st.mode === 'grid' || st.mode === 'row') tickRows(st, t);
        else tickSingle(st, t);
      } catch (e) { if (window.ZV_DEBUG) console.error(e); }
    }
  });
})();
