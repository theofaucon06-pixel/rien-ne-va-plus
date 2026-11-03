// Composant `run-curve` : la courbe de fortune d'Archie Karas en trois saisons (échelle LINÉAIRE : 40 M$ = 560 px).
// Cues : start, climb(dur), summit, seed, yours, night, baccarat, zero(dur), ghost, loop, 2013, blacklist, 2024, recap.
// Montée en paper (jamais lime), chute en rouge, boucle en paper ; le lime est réservé au sol (le zéro). Aucun clignotement.
(() => {
  'use strict';
  const { C, E, clamp, prog, lerp, f2, sv, g, rect, circle, path, line, text, put, shakeAt } = ZV;
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const str = (v, d) => (typeof v === 'string' && v.trim() ? v.trim() : d);
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const vis = (n, on) => setA(n, 'visibility', on ? 'visible' : 'hidden');
  const measure = (n, size) => { try { const w = n.getComputedTextLength(); if (w > 0) return w; } catch (e) { /* hors DOM */ } return (n.textContent || '').length * size * 0.62; };
  const YV = (m) => 720 - m * 14;           // m en M$ → y
  const GY = 720;                           // sol

  // coupe en deux lignes équilibrées (« | » force la coupure)
  function split2(s) {
    if (s.indexOf('|') >= 0) return s.split('|').map((x) => x.trim());
    if (s.length < 20) return [s];
    const mid = s.length / 2; let best = -1, bd = 1e9;
    for (let i = 1; i < s.length; i++) if (s[i] === ' ' && !/[:·→]/.test(s[i + 1] || '') && Math.abs(i - mid) < bd) { bd = Math.abs(i - mid); best = i; }
    return best < 0 ? [s] : [s.slice(0, best), s.slice(best + 1)];
  }
  // étiquette plate centrée sur (0,0) ; lines = tableau de lignes
  function mkTag(parent, lines, size, o) {
    o = o || {};
    if (typeof lines === 'string') lines = [lines];
    const grp = g(parent), lh = size * 1.22;
    const txs = lines.map((s, i) => text(grp, s, 0, (i - (lines.length - 1) / 2) * lh + size * 0.35, size, o.tfill || C.ink, { anchor: 'middle', mono: o.mono }));
    let w = Math.max.apply(null, txs.map((n) => measure(n, size)));
    if (o.maxW && w > o.maxW) { const k = o.maxW / w; txs.forEach((n, i) => { n.setAttribute('font-size', f2(size * k)); n.setAttribute('y', f2((i - (lines.length - 1) / 2) * lh * k + size * k * 0.35)); }); w = o.maxW; }
    const bw = w + 2 * (o.padX === undefined ? 20 : o.padX), bh = lh * lines.length * (o.maxW && w === o.maxW ? 1 : 1) + (o.padY === undefined ? 18 : o.padY), sh = o.sh === undefined ? 8 : o.sh, r = o.r === undefined ? 10 : o.r;
    const a = rect(grp, -bw / 2 + sh, -bh / 2 + sh, bw, bh, r, o.shFill || C.ink);
    const b = rect(grp, -bw / 2, -bh / 2, bw, bh, r, o.fill || C.paper, o.stroke || C.ink, o.sw || 5);
    grp.insertBefore(a, txs[0]); grp.insertBefore(b, txs[0]);
    return { g: grp, w: bw, h: bh };
  }
  function poly(pts) {
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return { pts, cum, L: cum[cum.length - 1] };
  }
  function at(pl, s) {
    s = clamp(s, 0, pl.L);
    let i = 1; while (i < pl.pts.length - 1 && pl.cum[i] < s) i++;
    const a = pl.pts[i - 1], b = pl.pts[i], d = pl.cum[i] - pl.cum[i - 1], k = d > 0 ? (s - pl.cum[i - 1]) / d : 0;
    return [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  }
  const dstr = (pts, ox, oy, sx, sy) => pts.map((p, i) => `${i ? 'L' : 'M'}${f2((ox || 0) + p[0] * (sx || 1))} ${f2((oy || 0) + p[1] * (sy || sx || 1))}`).join('');
  // trait de courbe (bordure ink + corps), tracé progressif par dasharray
  function stroke(parent, pl, col, w, ink) {
    const d = dstr(pl.pts);
    const a = path(parent, d, 'none', ink || C.ink, w + 8, { 'stroke-linecap': 'butt' });
    const b = path(parent, d, 'none', col, w, { 'stroke-linecap': 'butt' });
    return { a, b, pl };
  }
  function reveal(st, s) {
    const on = s > 0.5, v = Math.min(s, st.pl.L);
    vis(st.a, on); vis(st.b, on);
    const da = `${f2(v)} ${f2(st.pl.L + 50)}`;
    setA(st.a, 'stroke-dasharray', da); setA(st.b, 'stroke-dasharray', da);
  }

  function buildClimb(rnd) {
    const ph = [{ n: 7, x0: 200, x1: 420, h0: 0, h1: 14, e: 1.2 }, { n: 6, x0: 420, x1: 620, h0: 14, h1: 120, e: 2.3 }, { n: 7, x0: 620, x1: 840, h0: 120, h1: 560, e: 1.6 }];
    const T = [], X = [];
    let k = 0;
    ph.forEach((p) => { for (let i = 0; i < p.n; i++, k++) { const u = (i + 1) / p.n; T.push(p.h0 + (p.h1 - p.h0) * Math.pow(u, p.e)); X.push(lerp(p.x0, p.x1, u)); } });
    const dips = { 3: 3, 9: 12, 15: 45 };
    for (const i in dips) { const ii = +i; T[ii] = Math.max(0, T[ii - 1] - dips[i]); }
    const pts = [[200, GY - 0.5]];
    let xa = 200, ha = 0;
    for (let i = 0; i < T.length; i++) {
      const xb = X[i], w = xb - xa, hb = i === T.length - 1 ? 560 : T[i], f = 0.4 + rnd() * 0.2;
      pts.push([xa + w * f, GY - ha - 0.5], [xa + w * (f + 0.18), GY - hb - 0.5], [xb, GY - hb - 0.5]);
      xa = xb; ha = hb;
    }
    pts[pts.length - 1] = [840, 160];
    return pts;
  }

  ZV.define('run-curve', {
    init(root, shot) {
      const p = (shot && shot.props) || {};
      const beats = Array.isArray(shot && shot.beats) ? shot.beats : [];
      const cueOf = (n) => { const b = beats.filter((x) => x && x.do === 'cue' && x.name === n && isNum(x.t)).sort((a, c) => a.t - c.t)[0]; return b || null; };
      const st = {};
      const T = {};
      ['start', 'climb', 'summit', 'seed', 'yours', 'night', 'baccarat', 'zero', 'ghost', 'loop', '2013', 'blacklist', '2024', 'recap'].forEach((n) => { const b = cueOf(n); T[n] = b ? b.t : null; st['d_' + n] = b && isNum(b.dur) && b.dur > 0 ? b.dur : null; });
      st.T = T;
      st.from = ['climb', 'fall', 'all'].indexOf(p.from) >= 0 ? p.from : 'empty';
      st.fromRank = { empty: 0, climb: 1, fall: 2, all: 3 }[st.from];
      const rnd = ZV.rng(1992);

      rect(root, 0, 0, 1920, 1080, 0, C.ink);
      // repère 40 M$ et graduations
      line(root, 200, 160, 860, 160, C.paper, 2, { 'stroke-dasharray': '10 10', 'stroke-linecap': 'butt' });
      text(root, '40 M$', 186, 170, 30, C.paper, { anchor: 'end', mono: true });
      [10, 20, 30, 40].forEach((m) => line(root, 192, YV(m), 214, YV(m), C.paper, 3, { 'stroke-linecap': 'butt' }));
      [860, 1180].forEach((x) => line(root, x, 110, x, 720, C.paper, 3, { 'stroke-dasharray': '8 10', 'stroke-linecap': 'butt' }));
      // séparer : bande du sol
      rect(root, 60, GY, 1720, 40, 0, C.lime);
      text(root, '0', 140, GY + 32, 40, C.ink, { anchor: 'middle', mono: true });
      // en-têtes
      st.hd = [['SAISON 1 · LA MONTÉE', 530], ['SAISON 2 · LA CHUTE', 1020], ['SAISON 3 · LA BOUCLE', 1450]].map((h) => { const n = text(root, h[0], h[1], 92, 24, C.paper, { anchor: 'middle', mono: true }); return n; });
      // traits de rappel (derrière les courbes)
      st.leadN = line(root, 642, 245, 876, 237, C.paper, 3, { 'stroke-dasharray': '6 8', 'stroke-linecap': 'butt' });
      st.leadB = line(root, 578, 337, 956, 433, C.paper, 3, { 'stroke-dasharray': '6 8', 'stroke-linecap': 'butt' });
      // ghost
      st.ghostL = line(root, 860, 160, 1720, 160, C.paper, 2, { 'stroke-dasharray': '10 10', 'stroke-linecap': 'butt' });
      st.ghostT = text(root, str(p.ghost, 'LÀ OÙ IL ÉTAIT EN JANVIER 1995'), 1720, 146, 26, C.paper, { anchor: 'end', mono: true });
      // courbes
      st.climb = stroke(root, poly(buildClimb(rnd)), C.paper, 10);
      const FALL = [[840, 160], [880, 160], [880, YV(29)], [960, YV(29)], [960, YV(12)], [990, YV(12)], [1000, 600], [1040, 600], [1050, 650], [1090, 650], [1100, 690], [1130, 690], [1140, GY], [1160, GY]];
      st.shk = g(root);
      st.fall = stroke(st.shk, poly(FALL), C.red, 10);
      st.iN = 2; st.iB = 4; // indices des fins de falaise
      const lp = [[1160, GY], [1200, GY]];
      for (let i = 0; i < 4; i++) { const x0 = 1200 + i * 125; lp.push([x0 + 40, GY], [x0 + 62, GY - 14], [x0 + 85, GY], [x0 + 125, GY]); }
      st.loop = stroke(root, poly(lp), C.paper, 10);
      // stickers de phase
      st.ph = [['POKER', 300, 668, 215], ['BILLARD', 468, 618, 430], ['DÉS', 790, 560, 640]].map((a) => { const t = mkTag(root, a[0], 26, { mono: true, padY: 16, sh: 6, sw: 4 }); return { g: t.g, x: a[1], y: a[2], thr: a[3] }; });
      // départ
      st.startG = g(root);
      const sg = g(st.startG);
      rect(sg, 210 + 8, 546 + 8, 340, 92, 8, C.ink);
      path(sg, 'M230 636 L284 636 L206 694Z', C.paper, C.ink, 5);
      rect(sg, 210, 546, 340, 92, 8, C.paper, C.ink, 5);
      rect(sg, 236, 634, 46, 8, 0, C.paper);
      const kk = text(sg, str(p.start_kicker, 'LAS VEGAS · DÉC. 1992'), 380, 576, 22, C.ink, { anchor: 'middle', mono: true });
      const kw = measure(kk, 22); if (kw > 310) { kk.setAttribute('font-size', f2(22 * 310 / kw)); }
      const sm = text(sg, str(p.start, '50 $ EN POCHE'), 380, 620, 44, C.ink, { anchor: 'middle' });
      const sw = measure(sm, 44); if (sw > 310) { sm.setAttribute('font-size', f2(44 * 310 / sw)); }
      // sommet
      st.sumT = text(root, str(p.summit, '≈ 40 M$'), 810, 146, 56, C.paper, { anchor: 'end' });
      st.brace = g(root);
      path(st.brace, 'M200 772 L200 784 L840 784 L840 772 M520 784 L520 794', 'none', C.paper, 4, { 'stroke-linecap': 'butt' });
      text(st.brace, str(p.span, '2 ANS ½'), 520, 824, 26, C.paper, { anchor: 'middle', mono: true });
      st.fac = mkTag(root, str(p.factor, '× 800 000'), 60, { padY: 24, sh: 10, sw: 6, maxW: 360 });
      st.seed = mkTag(root, split2(str(p.seed, 'PAS UNE STRATÉGIE : UN SOUVENIR')), 24, { mono: true, padY: 22 });
      st.pin = g(root);
      line(st.pin, 840, 160, 840, 118, C.ink, 12);
      line(st.pin, 840, 160, 840, 118, C.lime, 6);
      circle(st.pin, 840, 108, 17, C.lime, C.ink, 5);
      // « ton run »
      st.yours = g(root);
      rect(st.yours, 1240 + 10, 200 + 10, 460, 240, 6, C.ink);
      rect(st.yours, 1240, 200, 460, 240, 6, C.paper, C.ink, 6);
      const mini = stroke(st.yours, poly(buildClimb(ZV.rng(1992)).map((q) => [1268 + (q[0] - 200) * 0.3, 410 - (GY - q[1]) * 0.3])), C.ink, 5, C.paper);
      line(st.yours, 1268, 412, 1480, 412, C.ink, 5, { 'stroke-linecap': 'butt' });
      st.mini = mini;
      const yl = split2(str(p.yours, 'TON RUN, À TA TAILLE').replace(/, /, ',|'));
      yl.forEach((s, i) => text(st.yours, s, 1584, 316 + i * 34, 24, C.ink, { anchor: 'middle', mono: true }));
      // chute : stickers
      st.night = mkTag(st.shk, split2(str(p.night, 'JANV. 1995 · −11 M$ EN UNE NUIT, AUX DÉS')), 26, { mono: true, padY: 20 });
      st.bacc = mkTag(root, str(p.baccarat, '−17 M$ · BACCARA'), 28, { mono: true, padY: 20 });
      st.zero = mkTag(root, split2(str(p.zero, '3 SEMAINES PLUS TARD : 0')), 26, { mono: true, padY: 20 });
      // boucle : loupe
      st.lens = g(root);
      const ln = st.lens;
      [1220, 1700].forEach((x, i) => line(ln, x, 480, i ? 1700 : 1200, 716, C.paper, 3, { 'stroke-dasharray': '6 8', 'stroke-linecap': 'butt' }));
      rect(ln, 1220 + 12, 260 + 12, 480, 220, 6, C.ink);
      rect(ln, 1220, 260, 480, 220, 6, C.paper, C.ink, 6);
      line(ln, 1250, 322, 1590, 322, C.ink, 2, { 'stroke-dasharray': '8 8', 'stroke-linecap': 'butt' });
      rect(ln, 1240, 436, 360, 14, 0, C.lime, C.ink, 3);
      const mp = []; for (let i = 0; i < 4; i++) { const x0 = 1260 + i * 80; mp.push([x0, 436], [x0 + 26, 436], [x0 + 40, 330], [x0 + 54, 436], [x0 + 80, 436]); }
      mp.unshift([1250, 436]);
      st.lensC = stroke(ln, poly(mp), C.ink, 8, C.paper);
      const loL = Array.isArray(p.loop_labels) ? p.loop_labels : ['1 M$', '0'];
      text(ln, str(loL[0], '1 M$'), 1604, 332, 28, C.ink, { mono: true });
      text(ln, str(loL[1], '0'), 1604, 446, 28, C.ink, { mono: true });
      // drapeaux
      const FL = Array.isArray(p.flags) && p.flags.length ? p.flags : [{ cue: '2013', text: '2013 · ARRÊTÉ|CARTES MARQUÉES' }, { cue: 'blacklist', text: 'LISTE NOIRE|DU NEVADA' }, { cue: '2024', text: '2024|SANS FORTUNE' }];
      const FX = [1290, 1470, 1650], FY = [500, 572, 606];
      st.flags = FL.slice(0, 3).map((f, i) => {
        const fg = g(root), x = FX[i], y0 = FY[i];
        line(fg, x, y0 + 4, x, GY - 2, C.paper, 4, { 'stroke-linecap': 'butt' });
        const ls = String(f && f.text || '').split('|');
        const tag = mkTag(fg, ls, 22, { mono: true, padY: 14, sh: 5, sw: 4, r: 4, padX: 12 });
        tag.g.setAttribute('transform', `translate(${f2(x + 2 + tag.w / 2)} ${y0 + 25})`);
        return { g: fg, cue: String(f && f.cue || ['2013', 'blacklist', '2024'][i]), y: y0, h: GY - y0 };
      });
      // tête
      st.head = g(st.shk);
      circle(st.head, 0, 0, 18, C.white, C.ink, 5);
      // récap
      const ring = (cx, cy, r) => `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
      st.veil = path(root, `M0 0 H1920 V1080 H0Z ${ring(200, GY, 44)} ${ring(1700, GY, 44)}`, C.ink, null, 0, { 'fill-rule': 'evenodd' });
      st.rings = g(root);
      [200, 1700].forEach((x) => { circle(st.rings, x, GY, 38, 'none', C.ink, 18); circle(st.rings, x, GY, 38, 'none', C.lime, 8); });
      st.recap = mkTag(root, str(p.recap, '50 $ → 0'), 140, { padY: 50, padX: 50, sh: 14, sw: 8, maxW: 900, r: 16 });
      return st;
    },

    update(st, t) {
      if (!st || !st.T) return;
      const T = st.T, fr = st.fromRank, tt = (n) => T[n];
      const past = (n, d) => (tt(n) != null && t >= tt(n) + (d || 0));

      /* ---- avancement de chaque courbe ---- */
      const cl = st.climb.pl, fl = st.fall.pl, lp = st.loop.pl;
      const cDur = st.d_climb || 6;
      let sC = fr >= 1 ? cl.L : tt('climb') == null ? 0 : cl.L * Math.pow(prog(t, tt('climb'), tt('climb') + cDur), 1.6);
      let sF = fr >= 2 ? fl.L : Math.max(
        tt('night') == null ? 0 : fl.cum[st.iN] * prog(t, tt('night'), tt('night') + 0.2),
        tt('baccarat') == null ? 0 : (prog(t, tt('baccarat'), tt('baccarat') + 0.4) > 0 ? fl.cum[st.iN] + (fl.cum[st.iB] - fl.cum[st.iN]) * prog(t, tt('baccarat'), tt('baccarat') + 0.4) : 0),
        tt('zero') == null ? 0 : (prog(t, tt('zero'), tt('zero') + (st.d_zero || 2)) > 0 ? fl.cum[st.iB] + (fl.L - fl.cum[st.iB]) * prog(t, tt('zero'), tt('zero') + (st.d_zero || 2)) : 0));
      const pL = fr >= 3 ? 1 : tt('loop') == null ? 0 : prog(t, tt('loop'), tt('loop') + (st.d_loop || 3));
      const sL = lp.L * pL;
      reveal(st.climb, sC); reveal(st.fall, sF); reveal(st.loop, sL);

      /* ---- en-têtes de saison ---- */
      vis(st.hd[0], fr >= 1 || tt('start') != null && t >= tt('start') || tt('climb') != null && t >= tt('climb'));
      vis(st.hd[1], fr >= 2 || past('night'));
      vis(st.hd[2], fr >= 3 || past('loop'));

      /* ---- tête ---- */
      const startOn = fr >= 1 || (tt('start') != null && t >= tt('start')) || sC > 0;
      let hp, hs = 1;
      if (sL > 0.5) hp = at(lp, sL); else if (sF > 0.5) hp = at(fl, sF); else hp = at(cl, sC);
      if (tt('start') != null && fr < 1 && sC <= 0) hs = E.back(prog(t, tt('start'), tt('start') + 0.25));
      put(st.head, hp[0], hp[1], 0, hs, hs, startOn ? 1 : 0);
      const nSk = tt('night') == null ? [0, 0] : shakeAt(t, tt('night'), 12, 0.4);
      setA(st.shk, 'transform', `translate(${f2(nSk[0])} ${f2(nSk[1])})`);

      /* ---- départ ---- */
      const sQ = fr >= 1 || tt('start') == null ? 0 : prog(t, tt('start'), tt('start') + 0.3);
      const sOut = tt('climb') == null ? 0 : prog(t, tt('climb'), tt('climb') + 0.3);
      const ssc = sQ > 0 ? E.back(sQ) : 0;
      setA(st.startG, 'transform', `translate(380 640) scale(${f2(ssc || 0.0001)}) translate(-380 -640)`);
      vis(st.startG, sQ > 0 && sOut < 1);
      setA(st.startG, 'opacity', f2(1 - sOut));

      /* ---- stickers de phase ---- */
      const night = tt('night') == null ? (fr >= 2 ? 1 : 0) : (fr >= 2 ? 1 : prog(t, tt('night'), tt('night') + 0.3));
      st.ph.forEach((o, i) => {
        const x = hp[0];
        const passed = fr >= 1 || (sC > 0 && cl.pts && (sC >= cl.L * [0.0, 0.19, 0.5][i]));
        const q = fr >= 1 ? 1 : clamp((sC - cl.L * [0.0, 0.19, 0.5][i]) / (cl.L * 0.03));
        const s = q > 0 ? E.back(q) : 0;
        put(st.ph[i].g, o.x, o.y, i % 2 ? 2 : -2, s, s, q > 0 && (fr < 1 || true) ? 1 : 0);
      });

      /* ---- sommet ---- */
      const sm = fr >= 1 ? 1 : tt('summit') == null ? 0 : prog(t, tt('summit'), tt('summit') + 0.3);
      const fade = 1 - night;
      const smE = sm > 0 && fade > 0 ? 1 : 0;
      const spop = sm > 0 ? E.out3(sm) : 0;
      vis(st.sumT, smE); setA(st.sumT, 'opacity', f2(spop * fade));
      setA(st.brace, 'opacity', f2(spop * fade)); vis(st.brace, smE);
      const fq = tt('summit') == null ? 0 : prog(t, tt('summit') + 0.15, tt('summit') + 0.4);
      const fs = fq > 0 && fade > 0 ? 1 + 0.5 * (1 - E.out3(fq)) : 0;
      put(st.fac.g, 420, 300, -4, fs, fs, fs > 0 ? fade : 0);
      const sd = tt('seed') == null ? 0 : prog(t, tt('seed'), tt('seed') + 0.3);
      put(st.seed.g, 430, 410, 2, sd > 0 ? E.back(sd) : 0, sd > 0 ? E.back(sd) : 0, sd > 0 ? fade : 0);
      const pinQ = fr >= 2 ? 1 : sd;
      put(st.pin, 0, 0, 0, 1, 1, pinQ > 0 ? 1 : 0);
      st.pin.setAttribute('transform', `translate(840 ${f2(160 - 52 * (1 - E.out3(pinQ)))})  translate(-840 -160)`);
      // ton run
      const yq = tt('yours') == null ? 0 : prog(t, tt('yours'), tt('yours') + 0.3);
      const yOn = yq > 0 && fade > 0 && fr < 2;
      vis(st.yours, yOn); setA(st.yours, 'opacity', f2(fade));
      reveal(st.mini, st.mini.pl.L * (tt('yours') == null ? 0 : E.out2(prog(t, tt('yours') + 0.2, tt('yours') + 1.2))));
      st.yours.setAttribute('transform', `translate(${f2(1470 * (1 - E.out3(yq)) * 0.0)} ${f2(-30 * (1 - E.out3(yq)))})`);

      /* ---- chute ---- */
      const nQ = fr >= 2 ? 1 : tt('night') == null ? 0 : prog(t, tt('night') + 0.1, tt('night') + 0.4);
      put(st.night.g, 440, 245, -2, nQ > 0 ? E.back(nQ) : 0, nQ > 0 ? E.back(nQ) : 0, nQ > 0 ? 1 : 0);
      vis(st.leadN, nQ > 0.6);
      const bQ = fr >= 2 ? 1 : tt('baccarat') == null ? 0 : prog(t, tt('baccarat') + 0.1, tt('baccarat') + 0.4);
      put(st.bacc.g, 410, 337, 2, bQ > 0 ? E.back(bQ) : 0, bQ > 0 ? E.back(bQ) : 0, bQ > 0 ? 1 : 0);
      vis(st.leadB, bQ > 0.6);
      const zQ = fr >= 2 ? 1 : tt('zero') == null ? 0 : prog(t, tt('zero') + (st.d_zero || 2) - 0.1, tt('zero') + (st.d_zero || 2) + 0.2);
      put(st.zero.g, 400, 425, -2, zQ > 0 ? E.back(zQ) : 0, zQ > 0 ? E.back(zQ) : 0, zQ > 0 ? 1 : 0);

      /* ---- ghost ---- */
      const gq = fr >= 3 ? 1 : tt('ghost') == null ? 0 : prog(t, tt('ghost'), tt('ghost') + 0.8);
      vis(st.ghostL, gq > 0); setA(st.ghostL, 'x2', f2(lerp(860, 1720, E.out2(gq))));
      const gt = fr >= 3 ? 1 : tt('ghost') == null ? 0 : prog(t, tt('ghost') + 0.4, tt('ghost') + 0.7);
      vis(st.ghostT, gt > 0); setA(st.ghostT, 'opacity', f2(gt));

      /* ---- boucle : loupe ---- */
      const lq = fr >= 3 ? 1 : tt('loop') == null ? 0 : prog(t, tt('loop'), tt('loop') + 0.3);
      const ls = lq > 0 ? E.out3(lq) : 0;
      vis(st.lens, lq > 0); setA(st.lens, 'opacity', f2(ls));
      reveal(st.lensC, st.lensC.pl.L * pL);

      /* ---- drapeaux ---- */
      st.flags.forEach((f) => {
        const tf = tt(f.cue); const q = fr >= 3 ? 1 : tf == null ? 0 : prog(t, tf, tf + 0.35);
        vis(f.g, q > 0);
        const e = q > 0 ? E.out3(q) : 0;
        // le mât pousse du sol : on rogne par clip simple via échelle verticale ancrée au sol
        f.g.setAttribute('transform', `translate(0 ${GY}) scale(1 ${f2(0.2 + 0.8 * e)}) translate(0 ${-GY})`);
        setA(f.g, 'opacity', f2(Math.min(1, q * 3)));
      });

      /* ---- récap ---- */
      const rq = tt('recap') == null ? 0 : prog(t, tt('recap'), tt('recap') + 0.35);
      vis(st.veil, rq > 0); setA(st.veil, 'fill-opacity', f2(0.62 * rq));
      vis(st.rings, rq > 0);
      const rs = rq > 0 ? 1 + 0.6 * (1 - E.out3(rq)) : 0;
      put(st.recap.g, 960, 420, -2, rs, rs, rq > 0 ? 1 : 0);
    }
  });
})();
