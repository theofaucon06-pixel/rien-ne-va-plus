// Composant `saga` : la saga de Charles Wells en quatre saisons (cartes), calendrier de deux mois, barre de vie.
(() => {
  const { C, sv, g, f2, E, prog, clamp, lerp, put, show, text, rect, circle, path } = ZV;
  const INK = C.ink;
  const Z0 = (v, d) => (v == null ? d : v);
  const popE = (p) => E.back(clamp(p));
  let UID = 0;

  const DEFAULT_CARDS = [
    { n: 1, kicker: 'JUILLET 1891', title: 'MONTE-CARLO', picto: 'casino' },
    { n: 2, kicker: 'NOVEMBRE', title: 'IL REVIENT', picto: 'chip' },
    { n: 3, kicker: '1892', title: 'LE YACHT', picto: 'ship' },
    { n: 4, kicker: '1893', title: 'LA CHUTE', picto: 'gavel' }
  ];

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
  function pict(parent, name, o) {
    if (ZV.PICTO && ZV.PICTO.mk) return ZV.PICTO.mk(parent, name, o);
    const gg = g(parent);
    rect(gg, -100, -100, 200, 200, 20, C.paper, INK, 6);
    return { root: gg, body: gg, refs: {}, shRefs: {} };
  }
  function dots(root, color, op) {
    const id = 'sg' + (++UID);
    const defs = sv('defs', null, root);
    const pat = sv('pattern', { id, width: 56, height: 56, patternUnits: 'userSpaceOnUse' }, defs);
    sv('circle', { cx: 28, cy: 28, r: 3.2, fill: color, opacity: op }, pat);
    rect(root, 0, 0, 1920, 1080, 0, `url(#${id})`);
  }

  /* ------------------------------------------------------------------ */
  /*  Mode seasons                                                       */
  /* ------------------------------------------------------------------ */
  function buildSeasons(st, root, shot, pr) {
    rect(root, 0, 0, 1920, 1080, 0, INK);
    dots(root, C.paper, 0.1);
    // frise lime façon pellicule
    rect(root, -10, 318, 1940, 404, 0, C.lime, INK, 6);
    const id = 'sgf' + (++UID);
    const defs = sv('defs', null, root);
    const pat = sv('pattern', { id, width: 60, height: 40, patternUnits: 'userSpaceOnUse' }, defs);
    sv('rect', { x: 14, y: 8, width: 32, height: 22, rx: 5, fill: INK }, pat);
    rect(root, -10, 332, 1940, 40, 0, `url(#${id})`);
    rect(root, -10, 668, 1940, 40, 0, `url(#${id})`);
    st.active = clamp(Math.round(pr.active || 1), 1, 4);
    const cards = (pr.cards && pr.cards.length ? pr.cards : DEFAULT_CARDS);
    const order = [1, 2, 3, 4].filter((n) => n !== st.active).concat([st.active]);   // la carte active est dessinée en dernier
    st.cards = [];
    st.kt = ZV.cue(shot, 'kicker');
    st.pt = ZV.cue(shot, 'picto');
    st.wt = ZV.cue(shot, 'wells-in');
    st.stampsDef = (pr.stamps || []).map((s) => ({ t: ZV.cue(shot, s.cue), text: s.text }));
    st.first = st.active === 1;
    st.tAct = st.first ? 0.55 : 0.08;
    const lay = g(root);
    order.forEach((n) => {
      const data = cards.find((c) => c.n === n) || DEFAULT_CARDS[n - 1];
      const dark = n === 4;
      const i = n - 1;
      const cx = 960 + (i - 1.5) * 420;
      const grp = g(lay);
      // ombre dure + corps
      rect(grp, -190 + 12, -250 + 12, 380, 500, 22, INK);
      rect(grp, -190, -250, 380, 500, 22, dark ? C.pocket : C.paper, dark ? C.paper : INK, 8);
      // bandeau de saison
      rect(grp, -186, -246, 372, 76, 18, dark ? C.lime : INK);
      rect(grp, -186, -210, 372, 40, 0, dark ? C.lime : INK);
      text(grp, 'SAISON ' + n, 0, -192, 50, dark ? INK : C.lime, { anchor: 'middle', len: 270 });
      // pictogramme
      const pg = g(grp, { transform: 'translate(0 -42)' });
      const hasCue = n === st.active && st.pt != null;
      const pic = pict(pg, data.picto || 'chip', { bg: dark ? 'ink' : 'paper', n: 6 });
      const pictoScale = 0.98;
      put(pic.root, 0, 0, 0, pictoScale, pictoScale, 1);
      if ((data.picto || '') === 'ship') {
        // étiquette de prix rouge accrochée au yacht
        const tg = g(pic.body, { transform: 'translate(78 -64) rotate(16)' });
        path(tg, 'M -40 -24 L 26 -24 L 46 0 L 26 24 L -40 24 Z', C.red, INK, 5);
        circle(tg, 30, 0, 5.5, INK);
        text(tg, '€€€', -6, 9, 26, C.paper, { mono: 1, anchor: 'middle' });
      }
      // titre
      const tw = Math.min(340, meas(root, data.title || '', 50, false));
      text(grp, data.title || '', 0, 150, 50, dark ? C.paper : INK, { anchor: 'middle', len: tw });
      // kicker (date dite dans le script)
      const kg = g(grp, { transform: 'translate(0 205)' });
      const kw = meas(root, data.kicker || '', 32, true) + 36;
      rect(kg, -kw / 2, -28, kw, 56, 14, C.lime, INK, 5);
      text(kg, data.kicker || '', 0, 11, 32, INK, { mono: 1, anchor: 'middle' });
      // voile ink 62 %
      const veil = rect(grp, -190, -250, 380, 500, 22, INK);
      veil.setAttribute('opacity', 0);
      const card = { n, i, cx, grp, kg, pic, pg, veil, hasCue, data, picto: data.picto, stampGroups: [] };
      // Wells (silhouette plate) : n'existe que si le plan le demande
      if (n === st.active && st.wt != null) {
        card.wells = pict(grp, 'wells', { bg: 'paper' });
      }
      // tampons de la carte active
      if (n === st.active && st.stampsDef.length) {
        st.stampsDef.forEach((sd, k) => {
          const sg = g(grp);
          const sz = 50, w = meas(root, sd.text, sz, false) + 60, h = 92;
          rect(sg, -w / 2 + 8, -h / 2 + 8, w, h, 10, INK);
          rect(sg, -w / 2, -h / 2, w, h, 10, C.red, INK, 6);
          rect(sg, -w / 2 + 12, -h / 2 + 12, w - 24, h - 24, 5, 'none', INK, 3);
          text(sg, sd.text, 0, sz * 0.35, sz, INK, { anchor: 'middle', len: w - 60 });
          card.stampGroups.push({ sg, t: sd.t, rot: k % 2 ? 7 : -9, x: k % 2 ? 8 : -6, y: k % 2 ? 78 : -54 });
        });
      }
      st.cards.push(card);
    });
  }

  function tickSeasons(st, t) {
    const a = E.out3(prog(t, st.tAct, st.tAct + 0.47));
    const tilt = st.active % 2 ? -3 : 3;
    for (const c of st.cards) {
      const act = c.n === st.active;
      let sc = 1, rot = 0, dy = 0, op = 1;
      if (st.first) {
        const p = prog(t, c.i * 0.1, c.i * 0.1 + 0.36);
        sc = popE(p); op = p > 0 ? 1 : 0;
      }
      if (act) { sc *= 1 + 0.25 * a; rot = tilt * a; dy = -10 * a; }
      put(c.grp, c.cx, 520 + dy, rot, Math.max(sc, 0.001), Math.max(sc, 0.001), op);
      c.veil.setAttribute('opacity', f2(act ? 0 : 0.62 * a));
      // kicker : visible si saison passée ; sinon sur le repère `kicker` pour la carte active
      let kv = 0;
      if (act) { const kt = Z0(st.kt, st.tAct + 0.45); kv = popE(prog(t, kt, kt + 0.3)); } else if (c.n < st.active) kv = 1;
      put(c.kg, 0, 205, 0, kv, kv, kv > 0 ? 1 : 0);
      // pictogramme de la carte active qui entre sur son repère (ex. le yacht, par la droite)
      if (act && c.hasCue) {
        const p = prog(t, st.pt, st.pt + 0.55);
        const sway = Math.sin((t - st.pt) * 6) * 5 * (1 - E.out2(prog(t, st.pt, st.pt + 1.2)));
        put(c.pic.root, 760 * (1 - E.out3(p)), 0, sway, 0.98, 0.98, t >= st.pt ? 1 : 0);
      }
      // Wells entre au casino
      if (act && c.wells) {
        const wp = prog(t, st.wt, st.wt + 1.0);
        const w = E.io2(wp);
        const x = lerp(-215, -8, w), bob = Math.abs(Math.sin(wp * Math.PI * 6)) * -9;
        const sc2 = lerp(0.62, 0.46, w) * (1 - E.in2(prog(wp, 0.82, 1)));
        put(c.wells.root, x, 12 + bob, 0, Math.max(sc2, 0.001), Math.max(sc2, 0.001), t >= st.wt && sc2 > 0.01 ? 1 : 0);
      }
      // tampons
      c.stampGroups.forEach((s) => {
        if (s.t == null) { put(s.sg, 0, 0, 0, 0, 0, 0); return; }
        const p = prog(t, s.t, s.t + 5 / 30);
        const k = 2.6 - 1.6 * E.out3(p);
        const sh = ZV.shakeAt(t, s.t + 5 / 30, 14, 0.4);
        put(s.sg, s.x + sh[0], s.y + sh[1], s.rot, k, k, t >= s.t ? 1 : 0);
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Mode calendar                                                      */
  /* ------------------------------------------------------------------ */
  function buildCalendar(st, root, shot, pr) {
    rect(root, 0, 0, 1920, 1080, 0, INK);
    dots(root, C.paper, 0.1);
    const months = pr.months && pr.months.length ? pr.months : [{ name: 'JUILLET', days: 11 }, { name: 'NOVEMBRE', days: 5 }];
    const total = { JUILLET: 31, NOVEMBRE: 30 };
    st.panels = months.slice(0, 2).map((m, k) => {
      const cx = k === 0 ? 520 : 1400, cy = 490;
      const grp = g(root);
      rect(grp, -380 + 14, -280 + 14, 760, 560, 26, INK);
      rect(grp, -380, -280, 760, 560, 26, C.paper, INK, 8);
      rect(grp, -376, -276, 752, 116, 22, INK);
      rect(grp, -376, -230, 752, 70, 0, INK);
      text(grp, m.name, -340, -190, 76, C.lime, { len: Math.min(430, meas(root, m.name, 76, false)) });
      const pill = g(grp, { transform: 'translate(252 -216)' });
      rect(pill, -108, -34, 216, 68, 16, C.lime, INK, 5);
      const cnt = text(pill, '0', 0, 14, 38, INK, { mono: 1, anchor: 'middle' });
      const cells = [];
      const ncell = total[m.name] || (k === 0 ? 31 : 30);
      for (let i = 0; i < 35; i++) {
        const col = i % 7, row = Math.floor(i / 7);
        const cg = g(grp, { transform: `translate(${-281 + col * 82 + 35} ${-142 + row * 82 + 35})` });
        if (i >= ncell) { cg.setAttribute('visibility', 'hidden'); cells.push(null); continue; }
        const bx = rect(cg, -35, -35, 70, 70, 10, C.white, INK, 5);
        const tick = g(cg);
        rect(tick, -35, -35, 70, 70, 10, C.lime, INK, 5);
        path(tick, 'M -18 2 L -5 16 L 20 -16', 'none', INK, 9);
        cells.push({ cg, tick });
      }
      return { grp, cx, cy, cnt, cells, days: m.days || 0, name: m.name, t0: ZV.cue(shot, 'tick-' + (k + 1)), k };
    });
  }
  function tickCalendar(st, t) {
    for (const p of st.panels) {
      const pop = popE(prog(t, p.k * 0.14, p.k * 0.14 + 0.38));
      put(p.grp, p.cx, p.cy, p.k ? 1.2 : -1.2, pop, pop, pop > 0 ? 1 : 0);
      const t0 = Z0(p.t0, 99), per = 0.085;
      let done = 0;
      p.cells.forEach((c, i) => {
        if (!c) return;
        const ti = t0 + i * per;
        const on = i < p.days && t >= ti;
        if (on) done++;
        const q = on ? popE(prog(t, ti, ti + 0.2)) : 0;
        put(c.tick, 0, 0, 0, q, q, on ? 1 : 0);
      });
      p.cnt.textContent = done + (done > 1 ? ' JOURS' : ' JOUR');
      p.cnt.setAttribute('font-size', 38);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Mode lifeline                                                      */
  /* ------------------------------------------------------------------ */
  function buildLife(st, root, shot, pr) {
    rect(root, 0, 0, 1920, 1080, 0, C.paper);
    dots(root, INK, 0.1);
    const life = pr.life || { lime: '16 JOURS', rest: 'LE RESTE D’UNE VIE' };
    st.x0 = 160; st.w = 1600; st.y = 420; st.h = 130;
    rect(root, st.x0 + 12, st.y + 12, st.w, st.h, 24, INK);
    const track = g(root);
    rect(track, st.x0, st.y, st.w, st.h, 24, C.white, INK, 8);
    st.rest = rect(track, st.x0 + 14, st.y + 4, 1, st.h - 8, 0, C.red);
    st.limeSeg = rect(track, st.x0 + 4, st.y + 4, 14, st.h - 8, 0, C.lime);
    rect(root, st.x0, st.y, st.w, st.h, 24, 'none', INK, 8);
    // repères de vie : graduations (barres pleines)
    for (let k = 1; k < 10; k++) rect(root, st.x0 + k * 160 - 3, st.y + st.h - 26, 6, 26, 0, INK).setAttribute('opacity', 0.9);
    // étiquette « 16 JOURS » avec ligne de rappel
    st.lt = Z0(ZV.cue(shot, 'lime'), 0.9);
    st.rt = Z0(ZV.cue(shot, 'rest'), 2.0);
    const lw = meas(root, life.lime, 64, false) + 70;
    st.leader = rect(root, st.x0 + 5, st.y - 80, 6, 80, 0, INK);
    st.lbl1 = g(root);
    ZV.sticker(st.lbl1, lw, 104, C.lime, null, 64, INK, { sh: 10 });
    text(st.lbl1, life.lime, 0, 22, 64, INK, { anchor: 'middle', len: lw - 70 });
    st.lw = lw;
    st.lbl2 = g(root);
    const w2 = Math.min(1100, meas(root, life.rest, 88, false));
    text(st.lbl2, life.rest, 0, 0, 88, INK, { anchor: 'middle', len: w2 });
  }
  function tickLife(st, t) {
    const lp = prog(t, st.lt, st.lt + 0.3), lk = popE(lp);
    st.limeSeg.setAttribute('width', f2(14 * clamp(lp * 1.4)));
    show(st.limeSeg, t >= st.lt);
    st.leader.setAttribute('transform', `translate(0 ${f2(80 * (1 - lk))}) scale(1 ${f2(Math.max(lk, 0.001))})`);
    st.leader.setAttribute('visibility', t >= st.lt ? 'visible' : 'hidden');
    put(st.lbl1, st.x0 + st.lw / 2 + 6, st.y - 120, -3, lk, lk, t >= st.lt ? 1 : 0);
    const rp = E.io2(prog(t, st.rt, st.rt + 0.95));
    st.rest.setAttribute('width', f2(Math.max(0.001, (st.w - 22) * rp)));
    show(st.rest, t >= st.rt);
    const rk = popE(prog(t, st.rt + 0.5, st.rt + 0.85));
    put(st.lbl2, 1060, st.y - 52, 0, rk, rk, t >= st.rt + 0.5 ? 1 : 0);
  }

  ZV.define('saga', {
    init(root, shot) {
      const pr = shot.props || {};
      const st = { mode: pr.mode || 'seasons' };
      try {
        if (st.mode === 'calendar') buildCalendar(st, root, shot, pr);
        else if (st.mode === 'lifeline') buildLife(st, root, shot, pr);
        else buildSeasons(st, root, shot, pr);
      } catch (e) { if (window.ZV_DEBUG) console.error(e); }
      return st;
    },
    update(st, t, shot) {
      try {
        if (st.mode === 'calendar') tickCalendar(st, t);
        else if (st.mode === 'lifeline') tickLife(st, t);
        else tickSeasons(st, t);
      } catch (e) { if (window.ZV_DEBUG) console.error(e); }
    }
  });
})();
