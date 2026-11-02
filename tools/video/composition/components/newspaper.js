// Composant `newspaper` : unes de journaux (spin), couverture de partition (sheet), partition qui danse contre tertre immobile (split).
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
  function bg(root, color, dotColor) {
    rect(root, 0, 0, 1920, 1080, 0, color);
    const id = 'np' + (++UID);
    const defs = sv('defs', null, root);
    const pat = sv('pattern', { id, width: 56, height: 56, patternUnits: 'userSpaceOnUse' }, defs);
    sv('circle', { cx: 28, cy: 28, r: 3.2, fill: dotColor, opacity: 0.1 }, pat);
    rect(root, 0, 0, 1920, 1080, 0, `url(#${id})`);
  }
  function pict(parent, name, o) {
    if (ZV.PICTO && ZV.PICTO.mk) return ZV.PICTO.mk(parent, name, o);
    const gg = g(parent);
    rect(gg, -100, -100, 200, 200, 20, C.paper, INK, 6);
    return { root: gg, body: gg, refs: {}, shRefs: {} };
  }
  // coupe « IL A FAIT SAUTER LA BANQUE » en deux lignes équilibrées
  function split2(str) {
    const w = str.split(' ');
    let best = null;
    for (let k = 1; k < w.length; k++) {
      const a = w.slice(0, k).join(' '), b = w.slice(k).join(' ');
      const d = Math.abs(a.length - b.length);
      if (!best || d < best.d) best = { a, b, d };
    }
    return best ? [best.a, best.b] : [str];
  }

  /* ------------------------------------------------------------------ */
  /*  La une                                                             */
  /* ------------------------------------------------------------------ */
  function buildSheet(root, page, seed, pw, ph) {
    const grp = g(root);
    const rnd = ZV.rng(seed);
    rect(grp, -pw / 2 + 14, -ph / 2 + 14, pw, ph, 12, INK);
    rect(grp, -pw / 2, -ph / 2, pw, ph, 12, C.paper, INK, 6);
    // en-tête : le nom de la ville seulement
    const mh = 92, top = -ph / 2 + 16;
    rect(grp, -pw / 2 + 16, top, pw - 32, mh, 6, INK);
    const name = page.masthead || '';
    const nw = Math.min(pw - 170, meas(root, name, 64, false));
    text(grp, name, 0, top + 66, 64, C.paper, { anchor: 'middle', len: nw });
    [-1, 1].forEach((s) => { const d = g(grp, { transform: `translate(${s * (nw / 2 + 44)} ${top + mh / 2}) rotate(45)` }); rect(d, -11, -11, 22, 22, 0, C.lime); });
    rect(grp, -pw / 2 + 16, top + mh + 14, pw - 32, 10, 0, INK);
    // gros titre sur 2 lignes
    const lines = split2(page.headline || '');
    const maxW = pw - 60;
    const wBase = Math.max(...lines.map((l) => meas(root, l, 100, false)));
    const hs = Math.min(86, 100 * maxW / wBase);
    lines.forEach((l, i) => text(grp, l, 0, top + mh + 14 + 10 + hs * 0.92 + i * hs * 1.02, hs, INK, { anchor: 'middle', len: Math.min(maxW, meas(root, l, hs, false)) }));
    const y0 = top + mh + 24 + lines.length * hs * 1.02 + 26;
    // photo : silhouette plate de Wells dans un cadre lime
    const phW = 250, phH = 176;
    rect(grp, -pw / 2 + 28, y0, phW, phH, 8, C.lime, INK, 6);
    const sil = pict(grp, 'wells', { bg: 'paper' });
    put(sil.root, -pw / 2 + 28 + phW / 2, y0 + phH - 70, 0, 0.62, 0.62, 1);
    rect(grp, -pw / 2 + 28 + 6, y0 + phH - 18, phW - 12, 12, 0, INK);
    // légende et colonnes : barres pleines de 14 px
    const bx = -pw / 2 + 28 + phW + 22, bw = pw / 2 - 28 - bx;
    for (let i = 0; i < 6; i++) rect(grp, bx, y0 + 4 + i * 29, bw * (i === 5 ? 0.55 : 0.86 + rnd() * 0.14), 14, 0, INK);
    const y1 = y0 + phH + 26, colW = (pw - 56 - 36) / 3;
    const rows = Math.max(3, Math.floor((ph / 2 - 28 - y1) / 26));
    for (let c = 0; c < 3; c++) for (let r = 0; r < rows; r++) {
      const last = r === rows - 1;
      rect(grp, -pw / 2 + 28 + c * (colW + 18), y1 + r * 26, colW * (last ? 0.5 + rnd() * 0.3 : 0.9 + rnd() * 0.1), 14, 0, INK);
    }
    return grp;
  }

  function buildSpin(st, root, shot, pr) {
    bg(root, C.lime, INK);
    const pages = pr.pages && pr.pages.length ? pr.pages : [{ cue: 'p1', masthead: 'LONDRES', headline: 'IL A FAIT SAUTER LA BANQUE' }];
    st.pages = pages.slice(0, 3).map((p, k) => {
      const pw = 620, ph = 700;
      const grp = buildSheet(root, p, 11 + k * 7, pw, ph);
      const n = pages.length;
      const fx = n === 1 ? 960 : 680 + k * (560 / Math.max(1, n - 1)), fy = 470 + (k % 2 ? 24 : -10);
      return { grp, t0: Z0(ZV.cue(shot, p.cue), k * 1.0), fx, fy, tilt: k % 2 ? 3.5 : -4, k };
    });
  }
  function tickSpin(st, t) {
    for (const p of st.pages) {
      const q = prog(t, p.t0, p.t0 + 18 / 30), e = E.out3(q);
      const sc = lerp(0.1, 1, e);
      const rot = p.tilt + 720 * (1 - e);
      const x = lerp(960, p.fx, e), y = lerp(560, p.fy, e);
      const sh = ZV.shakeAt(t, p.t0 + 18 / 30, 10, 0.4);
      put(p.grp, x + sh[0], y + sh[1], rot, sc, sc, t >= p.t0 ? 1 : 0);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Portée et notes qui sautillent                                     */
  /* ------------------------------------------------------------------ */
  function staff(parent, w, n, gap, color) {
    const grp = g(parent);
    const half = gap / 2;
    for (let i = 0; i < 5; i++) rect(grp, -w / 2, i * gap - 4, w, 8, 0, color || INK);
    const pat = [6, 3, 4, 1, 5, 2, 4, 0, 3, 5];
    const notes = [];
    for (let k = 0; k < n; k++) {
      const x = -w / 2 + (k + 0.7) * (w / (n + 0.4));
      const idx = pat[k % pat.length];
      const y = idx * half;
      const ng = g(grp, { transform: `translate(${f2(x)} ${f2(y)})` });
      const body = g(ng);
      rect(body, 13, -gap * 2.1, 7, gap * 2.1, 0, INK);
      const hd = g(body);
      sv('ellipse', { cx: 0, cy: 0, rx: 18, ry: 13, fill: INK, transform: 'rotate(-18)' }, hd);
      notes.push({ ng, body, x, y, k });
    }
    return { grp, notes };
  }
  function hop(notes, t, amp, rate, phase) {
    notes.forEach((n) => {
      const ph = t * rate + n.k * (phase || 0.13);
      const h = Math.abs(Math.sin(Math.PI * ph)) * amp;
      const sq = 1 - 0.18 * Math.pow(Math.max(0, 1 - Math.abs(Math.sin(Math.PI * ph)) * 5), 1);
      n.ng.setAttribute('transform', `translate(${f2(n.x)} ${f2(n.y - h)})`);
      n.body.setAttribute('transform', `scale(${f2(1 + (1 - sq))} ${f2(sq)})`);
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Couverture de partition                                            */
  /* ------------------------------------------------------------------ */
  function ornament(grp, w, h, color) {
    // cadre géométrique simple : deux bordures et des losanges aux coins
    rect(grp, -w / 2 + 22, -h / 2 + 22, w - 44, h - 44, 8, 'none', color, 12);
    rect(grp, -w / 2 + 44, -h / 2 + 44, w - 88, h - 88, 4, 'none', INK, 5);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
      const d = g(grp, { transform: `translate(${sx * (w / 2 - 36)} ${sy * (h / 2 - 36)}) rotate(45)` });
      rect(d, -22, -22, 44, 44, 4, color, INK, 5);
      rect(d, -9, -9, 18, 18, 0, INK);
    });
    for (let k = 0; k < 11; k++) {
      [-1, 1].forEach((s) => rect(grp, -w / 2 + 84 + k * ((w - 168 - 14) / 10), s * (h / 2 - 66) - 7, 14, 14, 0, INK));
    }
  }
  function buildCover(st, root, shot, pr) {
    bg(root, INK, C.paper);
    const W = 640, H = 740;
    const grp = g(root);
    st.cover = grp;
    rect(grp, -W / 2 + 14, -H / 2 + 14, W, H, 14, C.lime);
    rect(grp, -W / 2, -H / 2, W, H, 14, C.paper, INK, 7);
    ornament(grp, W, H, C.lime);
    const title = (pr.sheet_title || 'L’HOMME QUI A FAIT SAUTER LA BANQUE À MONTE-CARLO');
    const lines = ['L’HOMME QUI', 'A FAIT SAUTER', 'LA BANQUE', 'À MONTE-CARLO'];
    // si le titre diffère du titre prévu, on le découpe automatiquement en lignes équilibrées
    const full = lines.join(' ');
    let L = lines;
    if (full !== title) {
      const words = title.split(' ');
      const per = Math.ceil(title.length / 4);
      L = []; let cur = '';
      words.forEach((w) => { if ((cur + ' ' + w).trim().length > per && cur) { L.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); });
      if (cur) L.push(cur);
    }
    const wBase = Math.max(...L.map((l) => meas(root, l, 100, false)));
    const fs = Math.min(70, 100 * 470 / wBase);
    st.lines = L.map((l, i) => {
      const y = -H / 2 + 150 + i * fs * 1.12;
      const w = meas(root, l, fs, false);
      const last = i === L.length - 1;
      const hl = last ? rect(grp, -w / 2 - 14, y - fs * 0.84, w + 28, fs * 1.02, 6, C.lime) : null;
      const tn = text(grp, '', -w / 2, y, fs, INK, { anchor: 'start' });
      return { tn, str: l, hl };
    });
    st.total = L.reduce((a, l) => a + l.length, 0);
    st.stf = staff(grp, 470, 8, 24, INK);
    st.stf.grp.setAttribute('transform', `translate(0 ${H / 2 - 190})`);
    st.sheetT = Z0(ZV.cue(shot, 'sheet'), 0);
    st.titleT = Z0(ZV.cue(shot, 'title'), 1.0);
    st.dur = shot.dur;
  }
  function tickCover(st, t) {
    const q = prog(t, st.sheetT, st.sheetT + 0.5);
    const sc = E.out3(q) * 0.0 + popE(q);
    const beat = Math.pow(Math.max(0, Math.sin(Math.PI * t * 2)), 6);
    put(st.cover, 960, 470 - 0 * beat + 18 * (1 - E.out3(q)), -2 + 1.4 * Math.sin(t * Math.PI * 2 * 0.5) * clamp(q), sc * (1 + 0.012 * beat), sc * (1 + 0.012 * beat), t >= st.sheetT ? 1 : 0);
    // le titre s'écrit au rythme de la voix
    const rate = st.total / Math.max(1.5, (st.dur - st.titleT) * 0.8);
    let n = Math.max(0, Math.floor((t - st.titleT) * rate)) ;
    st.lines.forEach((l) => { const k = clamp(n, 0, l.str.length); l.tn.textContent = l.str.slice(0, k); if (l.hl) show(l.hl, k > 0); n -= l.str.length; });
    hop(st.stf.notes, t, 22, 2, 0.16);
  }

  /* ------------------------------------------------------------------ */
  /*  Split : la partition qui danse / le tertre immobile                */
  /* ------------------------------------------------------------------ */
  function buildSplit(st, root, shot, pr) {
    bg(root, C.paper, INK);
    rect(root, 951, 110, 18, 700, 0, INK);
    const sp = pr.split || { left: { cue: 'left', label: 'TOUT LE MONDE' }, right: { cue: 'right', label: 'PERSONNE' } };
    const side = (def, cx, k) => {
      const lab = g(root);
      const w = meas(root, def.label || '', 62, false) + 72;
      ZV.sticker(lab, w, 108, k ? C.ink : C.lime, null, 62, k ? C.paper : INK, { sh: 10 });
      text(lab, def.label || '', 0, 22, 62, k ? C.paper : INK, { anchor: 'middle', len: w - 72 });
      return { lab, cx, t0: Z0(ZV.cue(shot, def.cue), k ? 1.8 : 0.9) };
    };
    st.L = side(sp.left, 480, 0); st.R = side(sp.right, 1440, 1);
    // gauche : partition lime qui danse
    const sheet = g(root);
    st.sheet = sheet;
    rect(sheet, -216 + 14, -270 + 14, 432, 540, 14, INK);
    rect(sheet, -216, -270, 432, 540, 14, C.lime, INK, 7);
    rect(sheet, -190, -244, 380, 488, 6, 'none', INK, 5);
    st.stf = staff(sheet, 330, 7, 30, INK);
    st.stf.grp.setAttribute('transform', 'translate(0 -70)');
    const stf2 = staff(sheet, 330, 7, 30, INK);
    stf2.grp.setAttribute('transform', 'translate(0 110)');
    st.stf2 = stf2;
    // droite : tertre plat ink, immobile
    st.mound = pict(root, 'mound', { bg: 'paper', color: 'ink' });
    put(st.mound.root, 1440, 500, 0, 2.5, 2.5, 1);
  }
  function tickSplit(st, t) {
    const l = st.L, r = st.R;
    const pl = popE(prog(t, 0, 0.4));
    const bounce = Math.abs(Math.sin(Math.PI * t * 2));
    put(st.sheet, 480, 440 - bounce * 16, Math.sin(Math.PI * t * 2) * 3.2, pl, pl, 1);
    hop(st.stf.notes, t, 26, 2, 0.16);
    hop(st.stf2.notes, t, 26, 2, 0.16);
    const kl = popE(prog(t, l.t0, l.t0 + 0.32));
    put(l.lab, 480, 790, -2, kl, kl, t >= l.t0 ? 1 : 0);
    const kr = popE(prog(t, r.t0, r.t0 + 0.32));
    put(r.lab, 1440, 790, 2, kr, kr, t >= r.t0 ? 1 : 0);
  }

  ZV.define('newspaper', {
    init(root, shot) {
      const pr = shot.props || {};
      const st = { mode: pr.mode || 'spin' };
      try {
        if (st.mode === 'sheet') buildCover(st, root, shot, pr);
        else if (st.mode === 'split') buildSplit(st, root, shot, pr);
        else buildSpin(st, root, shot, pr);
      } catch (e) { if (window.ZV_DEBUG) console.error(e); }
      return st;
    },
    update(st, t, shot) {
      try {
        if (st.mode === 'sheet') tickCover(st, t);
        else if (st.mode === 'split') tickSplit(st, t);
        else tickSpin(st, t);
      } catch (e) { if (window.ZV_DEBUG) console.error(e); }
    }
  });
})();
