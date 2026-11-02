// Composant `pocket-grid` : les cases détachées de la roue. Modes grid (36 + le zéro lime géant), bar (37 cellules jointives), bar-compare (37 / 38 cases).
(() => {
  const { C, sv, g, f2, E, prog, clamp, lerp, put, show, text, rect, circle, path } = ZV;
  const INK = C.ink;
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
  function bg(root) {
    rect(root, 0, 0, 1920, 1080, 0, INK);
    const id = 'pk' + (++UID);
    const defs = sv('defs', null, root);
    const pat = sv('pattern', { id, width: 56, height: 56, patternUnits: 'userSpaceOnUse' }, defs);
    sv('circle', { cx: 28, cy: 28, r: 3.2, fill: C.paper, opacity: 0.1 }, pat);
    rect(root, 0, 0, 1920, 1080, 0, `url(#${id})`);
  }
  const fillOf = (col) => (col === 'red' ? C.red : col === 'lime' ? C.lime : C.pocket);
  const txtOf = (col) => (col === 'black' ? C.white : INK);

  /* ------------------------------------------------------------------ */
  /*  Mode grid                                                          */
  /* ------------------------------------------------------------------ */
  function buildGrid(st, root, shot, pr) {
    bg(root);
    st.tCount = ZV.cue(shot, 'count');
    st.tZero = ZV.cue(shot, 'zero-in');
    st.tPulse = ZV.cue(shot, 'zero-pulse');
    const gridG = g(root);
    st.discs = [];
    for (let i = 0; i < 36; i++) {
      const n = i + 1;
      const x = 175 + (i % 9) * 118, y = 300 + Math.floor(i / 9) * 114;
      const red = ZV.RED.has(n);
      const gc = g(gridG, { transform: `translate(${x} ${y})` });
      sv('circle', { r: 46, fill: 'none', stroke: C.paper, 'stroke-width': 4, 'stroke-dasharray': '8 10', opacity: 0.55 }, gc);
      const fill = g(gc);
      circle(fill, 0, 0, 43, red ? C.red : C.pocket, C.paper, 6);
      text(fill, String(n), 0, 12, 34, red ? INK : C.white, { mono: 1, anchor: 'middle' });
      st.discs.push({ fill, n });
    }
    st.count = text(root, '', 129, 236, 46, C.paper, { mono: 1 });
    st.zeroG = g(root);
    st.rings = [0, 1].map(() => sv('circle', { r: 140, fill: 'none', stroke: C.lime, 'stroke-width': 10 }, st.zeroG));
    st.ring3 = sv('circle', { r: 140, fill: 'none', stroke: C.lime, 'stroke-width': 10 }, st.zeroG);
    st.zBody = g(st.zeroG);
    circle(st.zBody, 0, 0, 140, C.lime);
    text(st.zBody, '0', 0, 76, 232, INK, { anchor: 'middle' });
    st.lab1 = text(root, '+ 1 CASE', 1420, 280, 46, C.lime, { mono: 1, anchor: 'middle' });
    st.cl = pr.count_label || '37 CASES';
    // durée du comptage : il se termine avant l'arrivée du zéro
    st.cD = st.tCount == null ? 0 : clamp((st.tZero == null ? st.tCount + 3 : st.tZero - 0.9) - st.tCount, 1.0, 3.4);
    st.dT = (i) => st.tCount + st.cD * (1 - Math.pow(1 - i / 36, 1.5));
  }
  function tickGrid(st, t) {
    let shown = 0;
    st.discs.forEach((d, i) => {
      let s = 1;
      if (st.tCount != null) {
        const ti = st.dT(i);
        s = popE(prog(t, ti, ti + 0.25));
        if (t >= ti) shown = i + 1;
      } else shown = 36;
      put(d.fill, 0, 0, 0, Math.max(s, 0), Math.max(s, 0), s > 0.01 ? 1 : 0);
    });
    // zéro géant
    const hasZero = st.tZero != null;
    const zs = hasZero ? popE(prog(t, st.tZero, st.tZero + 0.5)) : 1;
    let pulse = 1;
    if (st.tPulse != null) { const q = prog(t, st.tPulse, st.tPulse + 0.45); pulse = 1 + 0.14 * Math.sin(Math.PI * q); }
    put(st.zBody, 0, 0, 0, Math.max(zs * pulse, 0.0001), Math.max(zs * pulse, 0.0001), 1);
    st.zeroG.setAttribute('transform', 'translate(1420 470)');
    st.zeroG.setAttribute('visibility', !hasZero || t >= st.tZero ? 'visible' : 'hidden');
    // anneaux plats qui s'élargissent à l'arrivée puis au pulse
    const ringAt = (node, t0, dly) => {
      const q = prog(t, t0 + dly, t0 + dly + 0.9);
      node.setAttribute('r', f2(140 + q * 190));
      node.setAttribute('stroke-width', f2(14 * (1 - q)));
      node.setAttribute('visibility', q > 0 && q < 1 ? 'visible' : 'hidden');
    };
    if (hasZero) { ringAt(st.rings[0], st.tZero, 0.1); ringAt(st.rings[1], st.tZero, 0.32); } else { st.rings.forEach((r) => r.setAttribute('visibility', 'hidden')); }
    if (st.tPulse != null) ringAt(st.ring3, st.tPulse, 0); else st.ring3.setAttribute('visibility', 'hidden');
    // libellés
    const zeroDone = !hasZero ? true : t >= st.tZero;
    if (zeroDone && (st.tCount == null || hasZero)) {
      st.count.textContent = st.cl;
    } else {
      st.count.textContent = shown > 0 ? shown + (shown > 1 ? ' CASES' : ' CASE') : '';
    }
    show(st.lab1, hasZero && t >= st.tZero + 0.2);
    st.lab1.setAttribute('visibility', hasZero && t >= st.tZero + 0.2 ? 'visible' : 'hidden');
  }

  /* ------------------------------------------------------------------ */
  /*  Barres de 37 cellules                                              */
  /* ------------------------------------------------------------------ */
  function cellSpec(order, i, total, greens) {
    // renvoie { col, label }
    if (order === 'wheel') { const n = ZV.ORDER[i]; return { col: ZV.colorOf(n), label: String(n) }; }
    if (order === 'numeric') { const n = i; return { col: ZV.colorOf(n), label: String(n) }; }
    // colors : 18 rouges, 18 noires, puis les verts
    if (i < 18) return { col: 'red', label: '' };
    if (i < 36) return { col: 'black', label: '' };
    return { col: 'lime', label: greens > 1 && i === 37 ? '00' : '0' };
  }
  function makeBar(root, x0, y, cw, h, n, order, greens) {
    const grp = g(root);
    const cells = [];
    for (let i = 0; i < n; i++) {
      const sp = cellSpec(order, i, n, greens);
      const cx = x0 + i * cw + cw / 2;
      const cg = g(grp, { transform: `translate(${cx} ${y + h / 2})` });
      rect(cg, -cw / 2, -h / 2, cw, h, 0, fillOf(sp.col), INK, 3);
      const lab = sp.label ? text(cg, sp.label, 0, 8, sp.label.length > 1 && cw < 46 ? 22 : 24, txtOf(sp.col), { mono: 1, anchor: 'middle' }) : null;
      const ov = rect(cg, -cw / 2, -h / 2, cw, h, 0, INK); ov.setAttribute('opacity', 0.62); ov.setAttribute('visibility', 'hidden');
      const cross = text(cg, '✕', 0, 15, 44, C.red, { anchor: 'middle' }); cross.setAttribute('visibility', 'hidden');
      const dot = rect(cg, -9, h / 2 + 12, 18, 12, 3, C.lime); dot.setAttribute('visibility', 'hidden');
      cells.push({ cg, cx, col: sp.col, ov, cross, dot, i, lab });
    }
    const frame = rect(root, x0 - 4, y - 4, n * cw + 8, h + 8, 14, 'none', C.paper, 8);
    return { grp, cells, x0, y, cw, h, n, frame };
  }
  // cadres lime (pool) autour des plages de cellules allumées
  function makeFrames(root, count) {
    const arr = [];
    for (let k = 0; k < count; k++) { const r = rect(root, 0, 0, 10, 10, 10, 'none', C.lime, 9); r.setAttribute('visibility', 'hidden'); arr.push(r); }
    return arr;
  }
  function applyFrames(bar, frames, lit) {
    let k = 0;
    let i = 0;
    while (i < bar.n && k < frames.length) {
      if (lit[i]) {
        let j = i; while (j + 1 < bar.n && lit[j + 1]) j++;
        const f = frames[k++];
        f.setAttribute('x', f2(bar.x0 + i * bar.cw + 3)); f.setAttribute('y', f2(bar.y + 3));
        f.setAttribute('width', f2((j - i + 1) * bar.cw - 6)); f.setAttribute('height', f2(bar.h - 6));
        f.setAttribute('visibility', 'visible');
        i = j + 1;
      } else i++;
    }
    for (; k < frames.length; k++) frames[k].setAttribute('visibility', 'hidden');
  }
  function popBar(bar, t, t0, stag) {
    bar.cells.forEach((c, i) => {
      const q = popE(prog(t, t0 + i * (stag || 0.011), t0 + i * (stag || 0.011) + 0.26));
      put(c.cg, c.cx, bar.y + bar.h / 2, 0, 1, Math.max(q, 0.0001), q > 0.001 ? 1 : 0);
    });
    const a = prog(t, t0, t0 + 0.2);
    bar.frame.setAttribute('opacity', f2(a));
  }

  function buildBar(st, root, shot, pr) {
    bg(root);
    st.order = pr.order || 'colors';
    st.cw = 44; st.h = 120; st.x0 = (1920 - 37 * st.cw) / 2; st.y = 430;
    st.bar = makeBar(root, st.x0, st.y, st.cw, st.h, 37, st.order, 1);
    st.frames = makeFrames(root, 24);
    st.cl = pr.count_label || '37 CASES';
    st.top = text(root, st.cl, st.x0, st.y - 36, 48, C.paper, { mono: 1 });
    st.big = text(root, '', 960, st.y + st.h + 200, 132, C.lime, { anchor: 'middle' });
    st.sub = text(root, '', 960, st.y + st.h + 200, 132, C.lime, { anchor: 'middle' });
    st.tag = g(root);
    st.tagText = null;
    // étiquette rouge « PERD »
    const mkTag = () => {
      const tg = g(root);
      const w = meas(root, 'PERD', 52, false) + 56;
      rect(tg, -w / 2 + 7, -36 + 7, w, 72, 12, INK);
      rect(tg, -w / 2, -36, w, 72, 12, C.red, INK, 6);
      text(tg, 'PERD', 0, 19, 52, INK, { anchor: 'middle', len: w - 56 });
      return tg;
    };
    st.tagZero = mkTag(); st.tagBlack = mkTag();
    // accolade « 36 » sous la barre (PAS 1 / 36)
    st.brace = g(root);
    const bw = 36 * st.cw;
    rect(st.brace, st.x0, st.y + st.h + 20, bw, 9, 0, C.paper);
    rect(st.brace, st.x0, st.y + st.h + 12, 9, 17, 0, C.paper);
    rect(st.brace, st.x0 + bw - 9, st.y + st.h + 12, 9, 17, 0, C.paper);
    text(st.brace, '36', st.x0 + bw / 2, st.y + st.h + 80, 52, C.paper, { mono: 1, anchor: 'middle' });
    const pl = g(st.brace);
    rect(pl, st.x0 + bw + 8, st.y + st.h + 20, st.cw - 8, 9, 0, C.lime);
    st.cues = {
      pick: ZV.cue(shot, 'pick-one'), extra: ZV.cue(shot, 'extra-zero'), lightRed: ZV.cue(shot, 'light-red'),
      loseZero: ZV.cue(shot, 'lose-zero'), loseBlack: ZV.cue(shot, 'lose-black'), each: ZV.cue(shot, 'each-once')
    };
    const lab = (name) => { const b = shot.beats.find((x) => x.do === 'cue' && x.name === name); return b && b.label ? b.label : ''; };
    st.labels = { pick: lab('pick-one'), extra: lab('extra-zero'), lightRed: lab('light-red') };
    st.hl = pr.highlight || [];
    st.dur = shot.dur;
  }
  function tickBar(st, t) {
    const bar = st.bar, cu = st.cues;
    popBar(bar, t, 0.02, 0.011);
    const lit = new Array(bar.n).fill(false);
    let label = '', labelT = 0, labelColor = C.lime;
    // 1 / 37 puis PAS 1 / 36
    if (cu.pick != null) {
      const k = 11;
      if (t >= cu.pick) lit[k] = true;
      if (t >= cu.pick) { label = st.labels.pick || '1 / 37'; labelT = cu.pick; }
    }
    const brace = cu.extra != null ? popE(prog(t, cu.extra + 0.25, cu.extra + 0.5)) : 0;
    if (cu.extra != null && t >= cu.extra) {
      label = st.labels.extra || 'PAS 1 / 36'; labelT = cu.extra;
      // la 37e case (le zéro) clignote en lime
      const blink = Math.floor((t - cu.extra) * 7) % 2 === 0 || t > cu.extra + 1.3;
      lit[36] = blink;
      const q = popE(prog(t, cu.extra, cu.extra + 0.3));
      const c = bar.cells[36];
      put(c.cg, c.cx, bar.y + bar.h / 2, 0, 1 + 0.12 * Math.sin(Math.PI * clamp(q)), 1 + 0.12 * Math.sin(Math.PI * clamp(q)), 1);
    }
    st.brace.setAttribute('visibility', brace > 0.001 ? 'visible' : 'hidden');
    // lime sur le rouge (18 / 37 ou « ta mise : rouge »)
    if (cu.lightRed != null && t >= cu.lightRed) {
      const dur = st.labels.lightRed.indexOf('/') > 0 ? 1.1 : 0.45;
      const n = Math.min(18, Math.floor(18 * prog(t, cu.lightRed, cu.lightRed + dur) + 0.0001) + (t >= cu.lightRed ? 1 : 0));
      for (let i = 0; i < n; i++) lit[i] = true;
      labelT = cu.lightRed;
      label = st.labels.lightRed || '';
      if (st.labels.lightRed.indexOf('/') > 0) label = `${n} / 37`;
    }
    // cases perdantes
    const lose = (i, on, t0, idx) => {
      const c = bar.cells[i];
      const q = on ? popE(prog(t, t0 + idx * 0.03, t0 + idx * 0.03 + 0.2)) : 0;
      c.ov.setAttribute('visibility', on && q > 0.001 ? 'visible' : 'hidden');
      c.cross.setAttribute('visibility', on && q > 0.001 ? 'visible' : 'hidden');
      c.cross.setAttribute('transform', `scale(${f2(Math.max(q, 0.001))})`);
    };
    if (cu.loseZero != null) lose(36, t >= cu.loseZero, cu.loseZero, 0);
    if (cu.loseBlack != null) for (let i = 18; i < 36; i++) lose(i, t >= cu.loseBlack, cu.loseBlack, i - 18);
    const tagK = (t0) => (t0 == null ? 0 : popE(prog(t, t0 + 0.05, t0 + 0.35)));
    const kz = tagK(cu.loseZero), kb = tagK(cu.loseBlack);
    put(st.tagZero, bar.cells[36].cx - 30, bar.y - 78, -4, kz, kz, kz > 0.001 ? 1 : 0);
    put(st.tagBlack, bar.x0 + 27 * bar.cw, bar.y - 78, 3, kb, kb, kb > 0.001 ? 1 : 0);
    // chacune une fois (ordre du cylindre)
    let each = null;
    if (cu.each != null) {
      const per = 0.058;
      const k = clamp(Math.floor((t - cu.each) / per), -1, 36);
      each = k;
      for (let i = 0; i <= k && i < bar.n; i++) { const c = bar.cells[i]; c.dot.setAttribute('visibility', 'visible'); }
      for (let i = k + 1; i < bar.n; i++) bar.cells[i].dot.setAttribute('visibility', 'hidden');
      if (k >= 0 && k < bar.n) lit[Math.min(k, 36)] = true;
      st.top.textContent = (k >= 0 ? Math.min(k + 1, 37) : 0) + ' / 37';
      if (t >= cu.each + per * 37) st.top.textContent = '37 / 37';
    } else st.top.textContent = st.cl;
    applyFrames(bar, st.frames, lit);
    // gros libellé sous la barre
    if (label) {
      const k = popE(prog(t, labelT, labelT + 0.3));
      st.big.textContent = label;
      st.big.setAttribute('transform', `translate(960 ${f2(st.y + st.h + 200)}) scale(${f2(Math.max(k, 0.001))}) translate(-960 ${f2(-(st.y + st.h + 200))})`);
      st.big.setAttribute('visibility', 'visible');
    } else st.big.setAttribute('visibility', 'hidden');
    st.sub.setAttribute('visibility', 'hidden');
  }

  /* ------------------------------------------------------------------ */
  /*  bar-compare                                                        */
  /* ------------------------------------------------------------------ */
  function buildCompare(st, root, shot, pr) {
    bg(root);
    const cmp = pr.compare || { top: { cells: 37, greens: 1, label: 'EUROPÉENNE' }, bottom: { cells: 38, greens: 2, label: 'AMÉRICAINE' } };
    const cw = 42, h = 108;
    st.items = [cmp.top, cmp.bottom].map((d, k) => {
      const n = d.cells || (k ? 38 : 37), gr = d.greens || (k ? 2 : 1);
      const x0 = 160, y = k ? 470 : 240;
      // couleurs : 18 rouges, 18 noires, puis les verts (le 38e = « 00 »)
      const bar = makeBar(root, x0, y, cw, h, n, 'colors', gr);
      const lab = text(root, `${d.label || ''} · ${n} CASES`, x0, y - 26, 44, C.paper, { mono: 1 });
      const tag = g(root);
      const txt = gr > 1 ? gr + ' VERTES' : gr + ' VERTE';
      const w = meas(root, txt, 40, true) + 40;
      rect(tag, -w / 2 + 6, -26 + 6, w, 52, 12, '#2A2A2A');
      rect(tag, -w / 2, -26, w, 52, 12, C.lime, INK, 5);
      text(tag, txt, 0, 12, 40, INK, { mono: 1, anchor: 'middle' });
      return { bar, lab, tag, gr, n, x0, y, k, frames: makeFrames(root, 2) };
    });
    st.t0 = Z0(ZV.cue(shot, 'show'), 0);
  }
  function tickCompare(st, t) {
    st.items.forEach((it) => {
      const t0 = st.t0 + it.k * 0.32;
      popBar(it.bar, t, t0, 0.009);
      const q = popE(prog(t, t0 + 0.2, t0 + 0.5));
      it.lab.setAttribute('visibility', t >= t0 + 0.1 ? 'visible' : 'hidden');
      // étiquette « n VERTE(S) » au-dessus des cases vertes
      const gx = it.bar.x0 + (it.n - it.gr) * it.bar.cw + (it.gr * it.bar.cw) / 2;
      const ty = it.y - 28;
      put(it.tag, Math.min(gx, 1760) - (it.gr > 1 ? 40 : 28), ty - 40, 2, q, q, t >= t0 + 0.2 ? 1 : 0);
      const lit = new Array(it.n).fill(false);
      const blink = t >= t0 + 0.5 && (Math.floor((t - t0 - 0.5) * 6) % 2 === 0 || t > t0 + 1.6);
      for (let i = it.n - it.gr; i < it.n; i++) lit[i] = blink;
      applyFrames(it.bar, it.frames, lit);
    });
  }

  ZV.define('pocket-grid', {
    init(root, shot) {
      const pr = shot.props || {};
      const st = { mode: pr.mode || 'grid' };
      try {
        if (st.mode === 'bar-compare') buildCompare(st, root, shot, pr);
        else if (st.mode === 'bar') buildBar(st, root, shot, pr);
        else buildGrid(st, root, shot, pr);
      } catch (e) { if (window.ZV_DEBUG) console.error(e); }
      return st;
    },
    update(st, t, shot) {
      try {
        if (st.mode === 'bar-compare') tickCompare(st, t);
        else if (st.mode === 'bar') tickBar(st, t);
        else tickGrid(st, t);
      } catch (e) { if (window.ZV_DEBUG) console.error(e); }
    }
  });
})();
