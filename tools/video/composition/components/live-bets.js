// Composant `live-bets` (épisode 8) : « l'appli ne finit jamais » — le pari en direct. Voir EP8-COMPONENTS.md. Fond ink. Trois modes (un par plan).
//  match   : terrain schématique, horloge de match, frise 0'–90' et une bulle de pari toutes les 10 minutes ; `never` (un 2e match commence), `weekend` (grille de 200 pastilles), `half` (barre « LES MISES »).
//  bet     : carte de pari, barres « ce que dit la cote » / « en réalité » (l'écart = la marge), puis 10 jetons misés → 8,84 € en moyenne, la différence part vers la maison.
//  cashout : carte « TON PARI », bouton SÉCURISER (pulsation, pression, barré → REVENDRE MOINS CHER), deux barres dont l'écart est « LA MAISON ». Aucun montant chiffré.
// Fonction pure du temps ; aplats, aucun dégradé / flou / filter.
// Cues : kickoff, whistle, never, weekend, half | card, implied, real, stake, average | button, press, value, relabel.
(() => {
  'use strict';
  const { C, E, clamp, prog, f2, sv, g, rect, circle, path, line, text } = ZV;
  const NB = ' ';
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const num = (v, d) => (v != null && v !== '' && isFinite(+v) ? +v : d);
  const str = (v, d) => (typeof v === 'string' && v.length ? v : d);
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const vis = (n, on) => setA(n, 'display', on ? 'inline' : 'none');          // display (et non visibility : un enfant « visible » réapparaîtrait)
  const mw = (s, size) => String(s).length * size * 0.6;                     // Mono : 0,6 em par caractère
  const measCache = {};
  function meas(root, s, size) {                                              // mesure réelle d'un texte Bricolage 800 (repli : estimation)
    const key = s + '|' + size;
    if (measCache[key] != null) return measCache[key];
    let w = String(s).length * size * 0.6;
    try { const n = text(root, s, 0, 0, size, '#000'); const b = n.getComputedTextLength(); root.removeChild(n); if (b > 0) w = b; } catch (e) { /* estimation */ }
    measCache[key] = w;
    return w;
  }
  function fit(parent, root, s, x, y, size, fill, max, o) {                   // Bricolage dont la largeur ne dépasse jamais `max`
    const n = text(parent, s, x, y, size, fill, o || {});
    if (meas(root, s, size) > max) { n.setAttribute('textLength', f2(max)); n.setAttribute('lengthAdjust', 'spacingAndGlyphs'); }
    return n;
  }
  const mono = (parent, s, x, y, size, fill, o) => text(parent, s, x, y, size, fill, Object.assign({ mono: true, len: f2(mw(s, size)) }, o || {}));
  // échelle / rotation / opacité autour d'un point absolu
  const xf = (n, cx, cy, s, o, rot, dx, dy) => {
    s = Math.max(s, 0.0001);
    setA(n, 'transform', `translate(${f2(cx + (dx || 0))} ${f2(cy + (dy || 0))}) rotate(${f2(rot || 0)}) scale(${f2(s)}) translate(${f2(-cx)} ${f2(-cy)})`);
    setA(n, 'opacity', f2(o)); vis(n, o > 0.001);
  };
  const clipWipe = (defs, id, x, y, w, h) => { const cp = sv('clipPath', { id }, defs); return rect(cp, x, y, w, h, 0, '#000'); };
  let UID = 0;

  /* ================= match ================= */
  const FX0 = 160, FW = 1600, FLY = 462, SCROLL = 1900;
  const GCOLS = 20, GROWS = 10;

  function initMatch(st, root, P, c, dur) {
    const minutes = Math.max(10, num(P.minutes, 90)), every = Math.max(1, num(P.every, 10));
    const nb = Math.max(1, Math.min(12, Math.floor(minutes / every)));
    const perMatch = Math.round(num(P.per_match, nb)), perWeek = Math.round(num(P.per_weekend, 200));
    Object.assign(st, { minutes, every, nb, perMatch, perWeek });
    // repères déduits
    let tK = c.kickoff, tE = c.whistle;
    const none = ['kickoff', 'whistle', 'never', 'weekend', 'half'].every((n) => c[n] == null);
    if (none) { tK = 0.4; tE = tK + Math.min(9, Math.max(2, dur - 1.2)); st.autoEnd = false; }
    else if (tK == null && tE != null) tK = Math.max(0.2, tE - 9);
    const tEnd = tE != null ? tE : tK != null ? tK + 9 : null;
    st.tK = tK; st.tEnd = tEnd; st.tWhistle = c.whistle != null ? c.whistle : none ? tEnd : null;
    st.tNv = c.never != null && tEnd != null ? Math.max(c.never, tEnd + 0.2) : null;
    st.tK2 = st.tNv != null ? st.tNv + 0.9 + 0.3 : null;
    st.tW = c.weekend != null ? c.weekend : c.half != null ? -50 : null;           // « half » sans « weekend » : la grille est déjà là
    st.tHalf = c.half;
    st.leave = c.weekend != null ? c.weekend : c.half != null ? c.half : null;
    const rate = tK != null && tEnd != null ? minutes / (tEnd - tK) : 10;           // minutes de match par seconde
    let step = every;
    for (const s of [1, 2, 5, 10, every]) if (every % s === 0 && s >= rate / 5) { step = s; break; }   // l'horloge change ≤ 5 fois par seconde
    st.step = step;
    const defs = sv('defs', null, root);
    st.defs = defs;

    // décor : bandes pocket calmes
    const bgs = g(root, { transform: 'rotate(-18 960 540)' });
    for (let k = -4; k <= 4; k++) rect(bgs, 960 + k * 300 - 70, -600, 140, 2300, 0, C.pocket);

    /* ---- couche « match » ---- */
    st.ml = g(root);
    const M = st.ml;
    st.pitch = g(M);
    {
      const pg = st.pitch;
      rect(pg, 220 + 10, 90 + 10, 1160, 240, 0, C.ink);
      rect(pg, 220, 90, 1160, 240, 0, C.pocket, C.paper, 4);
      line(pg, 800, 90, 800, 330, C.paper, 4, { 'stroke-linecap': 'butt' });
      circle(pg, 800, 210, 52, 'none', C.paper, 4);
      rect(pg, 220, 150, 120, 120, 0, 'none', C.paper, 4); rect(pg, 220, 187, 46, 46, 0, 'none', C.paper, 4);
      rect(pg, 1260, 150, 120, 120, 0, 'none', C.paper, 4); rect(pg, 1334, 187, 46, 46, 0, 'none', C.paper, 4);
    }
    // horloge
    st.clock = g(M);
    rect(st.clock, 800 - 110 + 8, 210 - 62 + 8, 220, 124, 14, C.ink);
    rect(st.clock, 800 - 110, 210 - 62, 220, 124, 14, C.ink, C.paper, 5);
    st.clockT = text(st.clock, "00'", 800, 244, 96, C.paper, { mono: true, anchor: 'middle', len: f2(mw("00'", 96)) });
    // compteur
    st.cnt = g(M);
    {
      const s = `${perMatch}${NB}/${NB}MATCH`;
      st.cntMax = Math.min(460, meas(root, s, 64));
      st.cntT = text(st.cnt, '', 1860, 190, 64, C.lime, { anchor: 'end' });
      st.cntBig = meas(root, s, 64) > 460;
    }
    // étiquettes de fin
    st.end = g(M); st.nvr = g(M);
    {
      const l = 'FIN DU MATCH', w = Math.min(meas(root, l, 44), 400) + 60;
      rect(st.end, 800 - w / 2 + 8, 372 - 29 + 8, w, 58, 12, C.ink);
      rect(st.end, 800 - w / 2, 372 - 29, w, 58, 12, C.lime, C.ink, 5);
      fit(st.end, root, l, 800, 372 + 15, 44, C.ink, w - 36, { anchor: 'middle' });
      const l2 = "L'APPLI" + NB + ':' + NB + 'JAMAIS', w2 = Math.min(meas(root, l2, 44), 520) + 60;
      rect(st.nvr, 800 - w2 / 2 + 8, 372 - 29 + 8, w2, 58, 12, C.ink);
      rect(st.nvr, 800 - w2 / 2, 372 - 29, w2, 58, 12, C.red, C.ink, 5);
      fit(st.nvr, root, l2, 800, 372 + 15, 44, C.ink, w2 - 36, { anchor: 'middle' });
    }
    // frise + bulles (2 jeux : match 1 et match 2 décalé)
    st.fr = g(M);
    st.curs = g(M);
    rect(st.curs, -6, 438, 12, 48, 3, C.lime, C.ink, 3);
    st.sets = [];
    for (let s = 0; s < 2; s++) {
      const ox = s * SCROLL, S = { g: g(st.fr, { transform: `translate(${ox} 0)` }), b: [] };
      line(S.g, FX0, FLY, FX0 + FW, FLY, C.paper, 8, { 'stroke-linecap': 'butt' });
      for (let m = 0; m <= minutes + 0.001; m += every) {
        const x = FX0 + FW * m / minutes;
        line(S.g, x, FLY - 12, x, FLY + 12, C.paper, 4, { 'stroke-linecap': 'butt' });
        const lb = m + "'";
        text(S.g, lb, x, 436, 22, C.paper, { mono: true, anchor: 'middle', len: f2(mw(lb, 22)) });
      }
      for (let i = 1; i <= nb; i++) {
        const x = FX0 + FW * (i * every) / minutes, top = i % 2 ? 510 : 625, B = { g: g(S.g), x, cy: top + 45 };
        line(B.g, x, FLY + 12, x, top, C.paper, 3, { 'stroke-linecap': 'butt' });
        rect(B.g, x - 75 + 6, top + 6, 150, 90, 12, C.lime);
        rect(B.g, x - 75, top, 150, 90, 12, C.paper, C.ink, 4);
        mono(B.g, 'BUT DANS', x, top + 25, 22, C.ink, { anchor: 'middle' });
        const l2 = `${every}${NB}MIN${NB}?`;
        mono(B.g, l2, x, top + 49, 22, C.ink, { anchor: 'middle' });
        mono(B.g, str(P.odd, '3,40'), x, top + 82, 30, C.ink, { anchor: 'middle' });
        S.b.push(B);
      }
      st.sets.push(S);
    }

    /* ---- couche « week-end » : grille de 200 pastilles + barre « les mises » ---- */
    st.wl = g(root);
    st.cells = [];
    {
      const n = GCOLS * GROWS, x0 = (1920 - ((GCOLS - 1) * 70 + 44)) / 2, y0 = 232;
      st.gridG = g(st.wl);
      for (let k = 0; k < n; k++) {
        const cx = x0 + (k % GCOLS) * 70 + 22, cy = y0 + Math.floor(k / GCOLS) * 56 + 22;
        st.cells.push({ n: rect(st.gridG, cx - 22, cy - 22, 44, 44, 4, C.lime), cx, cy });
      }
      st.wcnt = g(st.wl);
      const s = `${perWeek}${NB}/${NB}WEEK-END`;
      const mx = Math.min(620, meas(root, s, 64));
      st.wcntMax = mx;
      st.wcntT = text(st.wcnt, '', 1660, 190, 64, C.lime, { anchor: 'end' });
      st.wcntBig = meas(root, s, 64) > 620;
      // barre « les mises »
      st.half = g(st.wl);
      const h = st.half;
      mono(h, 'LES MISES', 260, 124, 26, C.paper, { anchor: 'start' });
      rect(h, 260, 136, 1400, 60, 0, C.pocket, C.paper, 6);
      st.halfFill = rect(h, 263, 139, 0, 54, 0, C.lime);
      st.halfFull = Math.round(1394 * 0.62);
      const cp = clipWipe(defs, st.uid + 'h', 280, 136, 0, 60);
      st.halfClip = cp;
      const lg = g(h, { 'clip-path': `url(#${st.uid}h)` });
      fit(lg, root, 'LE DIRECT' + NB + ': PLUS DE LA MOITIÉ', 282, 178, 38, C.ink, 640, { anchor: 'start' });
      line(h, 960, 128, 960, 204, C.ink, 8, { 'stroke-linecap': 'butt' });
      mono(h, '50' + NB + '%', 960, 120, 24, C.paper, { anchor: 'middle' });
    }
  }

  function updateMatch(st, t) {
    const { c, minutes, every, nb } = st;
    const leave = st.leave;
    const lp = leave != null ? E.io2(prog(t, leave, leave + 0.45)) : 0;           // la scène « match » rétrécit vers la 1re ligne de la grille
    const mOn = leave == null || t < leave + 0.55;
    vis(st.ml, mOn);
    if (mOn) {
      // temps de match
      const tK = st.tK, tE = st.tEnd;
      let m = 0, round = 0;
      if (tK != null && tE != null) {
        if (st.tNv != null && t >= st.tNv + 0.9) { round = 1; m = t >= st.tK2 ? clamp((t - st.tK2) / (tE - tK)) * minutes : 0; }
        else m = clamp((t - tK) / (tE - tK)) * minutes;
      }
      // horloge (quantifiée : jamais plus de ~5 changements/s)
      {
        const done = m >= minutes - 1e-6;
        const v = done ? minutes : Math.floor(m / st.step + 1e-6) * st.step;
        const s = String(Math.round(v)).padStart(2, '0') + "'";
        if (st.clockT.__s !== s) { st.clockT.__s = s; st.clockT.textContent = s; st.clockT.setAttribute('textLength', f2(mw(s, 96))); }
      }
      // bulles
      let n0 = 0, n1 = 0;
      for (let s = 0; s < 2; s++) {
        const S = st.sets[s], t0 = s ? st.tK2 : st.tK;
        for (let i = 1; i <= nb; i++) {
          const B = S.b[i - 1];
          const tb = t0 != null && st.tEnd != null ? t0 + (i * every / minutes) * (st.tEnd - st.tK) : null;
          const p = tb != null ? E.back(prog(t, tb, tb + 0.28)) : 0;
          xf(B.g, B.x, B.cy, p, p > 0.001 ? 1 : 0, 0);
          if (tb != null && t >= tb) { if (s) n1++; else n0++; }
        }
      }
      // compteur
      {
        const cnt = round ? n1 : n0;
        const s = cnt > 0 ? `${Math.min(cnt, st.perMatch)}${NB}/${NB}MATCH` : '';
        if (st.cntT.__s !== s) {
          st.cntT.__s = s; st.cntT.textContent = s;
          if (s && st.cntBig) { st.cntT.setAttribute('textLength', f2(st.cntMax)); st.cntT.setAttribute('lengthAdjust', 'spacingAndGlyphs'); }
        }
        vis(st.cnt, !!s);
      }
      // défilement vers le 2e match
      const sx = st.tNv != null ? SCROLL * E.io2(prog(t, st.tNv, st.tNv + 0.9)) : 0;
      // frise (rétrécit vers la 1re ligne de la grille à `weekend`)
      {
        const sy = 1 - 0.94 * lp, ty = FLY + (232 - FLY) * lp;
        setA(st.fr, 'transform', `translate(${f2(-sx)} ${f2(ty)}) scale(1 ${f2(Math.max(sy, 0.0001))}) translate(0 ${-FLY})`);
        setA(st.fr, 'opacity', f2(1 - prog(t, (leave != null ? leave : 1e9) + 0.3, (leave != null ? leave : 1e9) + 0.5)));
      }
      // curseur (écran) : suit l'horloge ; masqué pendant le défilement vers le 2e match
      {
        const x = FX0 + FW * m / minutes;
        let o = 1;
        if (st.tNv != null && t >= st.tNv && t < st.tK2) o = 0;
        o *= 1 - lp;
        setA(st.curs, 'transform', `translate(${f2(x)} 0)`);
        setA(st.curs, 'opacity', f2(o)); vis(st.curs, o > 0.001);
      }
      // coup de sifflet / jamais
      const fade = 1 - clamp(lp * 1.6);
      {
        const tw = st.tWhistle;
        const showEnd = tw != null && t >= tw && !(st.tNv != null && t >= st.tNv);
        const ep = tw != null ? E.back(prog(t, tw, tw + 0.3)) : 0;
        xf(st.end, 800, 372, ep, showEnd ? fade : 0, -1);
        const np = st.tNv != null ? E.back(prog(t, st.tNv, st.tNv + 0.3)) : 0;
        xf(st.nvr, 800, 372, np, st.tNv != null && t >= st.tNv ? fade : 0, 1.5);
      }
      for (const n of [st.pitch, st.clock, st.cnt]) setA(n, 'opacity', f2(fade));
    }

    /* ---- week-end ---- */
    const tW = st.tW;
    const wOn = tW != null && leave != null && t >= leave + 0.3;
    vis(st.wl, wOn);
    if (wOn) {
      const t0 = tW < 0 ? -100 : tW + 0.4, T = 2.5;
      const pf = clamp((t - t0) / T);
      for (let k = 0; k < st.cells.length; k++) {
        const tc = t0 + T * Math.pow((k + 1) / st.cells.length, 1 / 1.8);
        const p = E.out3(prog(t, tc - 0.12, tc));
        xf(st.cells[k].n, st.cells[k].cx, st.cells[k].cy, p, p > 0.001 ? 1 : 0, 0);
      }
      // compteur quantifié (≤ 6 changements/s)
      {
        const tq = pf >= 1 ? 1e9 : Math.floor(t * 6) / 6;
        const v = pf >= 1 ? st.perWeek : Math.floor(st.perWeek * Math.pow(clamp((tq - t0) / T), 1.8));
        const s = v > 0 ? `${v}${NB}/${NB}WEEK-END` : '';
        if (st.wcntT.__s !== s) {
          st.wcntT.__s = s; st.wcntT.textContent = s;
          if (s && st.wcntBig) { st.wcntT.setAttribute('textLength', f2(st.wcntMax)); st.wcntT.setAttribute('lengthAdjust', 'spacingAndGlyphs'); }
        }
        const half = st.tHalf != null ? 1 - E.out2(prog(t, st.tHalf, st.tHalf + 0.25)) : 1;
        setA(st.wcnt, 'opacity', f2(half)); vis(st.wcnt, !!s && half > 0.001);
      }
      // « half » : la grille s'estompe, la barre des mises se remplit
      {
        const th = st.tHalf;
        const dim = th != null ? E.out2(prog(t, th, th + 0.4)) : 0;
        setA(st.gridG, 'opacity', f2(1 - 0.55 * dim));
        const bp = th != null ? E.out3(prog(t, th + 0.15, th + 1.0)) : 0;
        vis(st.half, th != null && t >= th);
        setA(st.halfFill, 'width', f2(st.halfFull * bp));
        const lw = th != null ? E.out2(prog(t, th + 0.9, th + 1.5)) : 0;
        setA(st.halfClip, 'width', f2(660 * lw));
      }
    }
  }

  /* ================= bet ================= */
  const BX0 = 360, BW = 1200;
  function house(parent, cx, cy) {                                           // petite maison plate (picto `house` redessiné localement)
    const h = g(parent);
    path(h, `M ${cx - 112} ${cy - 62} L ${cx} ${cy - 150} L ${cx + 112} ${cy - 62} Z`, C.red, C.paper, 6);
    rect(h, cx - 90, cy - 62, 180, 124, 0, C.pocket, C.paper, 6);
    rect(h, cx - 24, cy - 8, 48, 70, 0, C.paper, C.ink, 4);
    rect(h, cx + 38, cy - 40, 34, 34, 0, C.paper, C.ink, 4);
    return h;
  }
  function arrowH(parent, x1, y, x2, col, sw, hs) {
    line(parent, x1, y, x2 - hs * 0.6, y, col, sw, { 'stroke-linecap': 'butt' });
    sv('path', { d: `M ${x2} ${y} L ${x2 - hs} ${y - hs * 0.6} L ${x2 - hs} ${y + hs * 0.6} Z`, fill: col }, parent);
  }

  function initBet(st, root, P, c, dur) {
    const question = str(P.question, 'BUT DANS LES 10 PROCHAINES MINUTES ?'), odd = str(P.odd, '3,40');
    const oddNum = parseFloat(odd.replace(',', '.')) || 3.4;
    const implied = num(P.implied, 29), real = num(P.real, 26);
    const stake = str(P.stake, '10' + NB + '€'), avg = str(P.avg, '8,84' + NB + '€');
    const none = ['card', 'implied', 'real', 'stake', 'average'].every((n) => c[n] == null);
    if (none) Object.assign(c, { card: +(0.03 * dur).toFixed(2), implied: +(0.17 * dur).toFixed(2), real: +(0.3 * dur).toFixed(2), stake: +(0.48 * dur).toFixed(2), average: +(0.64 * dur).toFixed(2) });
    st.tCard = c.card != null ? c.card : 0.2;
    st.tStake = c.stake != null ? c.stake : c.average != null ? Math.max(0, c.average - 1.0) : null;
    st.w1 = BW / oddNum; st.w2 = BW * real / 100;
    rect(root, 0, 0, 1920, 1080, 0, C.ink);
    const bgs = g(root, { transform: 'rotate(-18 960 540)' });
    for (let k = -4; k <= 4; k++) rect(bgs, 960 + k * 300 - 70, -600, 140, 2300, 0, C.pocket);

    /* carte + barres */
    st.top = g(root);
    const T = st.top;
    st.card = g(T);
    rect(st.card, BX0 + 14, 90 + 14, BW, 240, 28, C.lime);
    rect(st.card, BX0, 90, BW, 240, 28, C.paper, C.ink, 8);
    fit(st.card, root, question, 960, 165, 52, C.ink, 1090, { anchor: 'middle' });
    mono(st.card, 'COTE', BX0 + 50, 285, 28, C.ink, { anchor: 'start' });
    text(st.card, odd, 960, 295, 110, C.ink, { mono: true, anchor: 'middle', len: f2(mw(odd, 110)) });
    // pistes
    st.bars = g(T);
    rect(st.bars, BX0, 410, BW, 60, 0, C.pocket, C.paper, 3); rect(st.bars, BX0, 510, BW, 60, 0, C.pocket, C.paper, 3);
    mono(st.bars, '100' + NB + '%', BX0 + BW - 10, 396, 22, '#B9B5A8', { anchor: 'end' });
    st.b1 = rect(st.bars, BX0, 410, 0, 60, 0, C.paper, C.ink, 4);
    st.b2 = rect(st.bars, BX0, 510, 0, 60, 0, C.white, C.ink, 4);
    st.b1g = g(T); st.b2g = g(T); st.gapG = g(T);
    mono(st.b1g, '1' + NB + '÷' + NB + odd, BX0 + 18, 450, 30, C.ink, { anchor: 'start' });
    const l1 = `CE QUE DIT LA COTE${NB}·${NB}≈${NB}${implied}${NB}%`, l2 = `EN RÉALITÉ${NB}·${NB}≈${NB}${real}${NB}%`;
    mono(st.b1g, l1, BX0 + st.w1 + 24, 450, 28, C.paper, { anchor: 'start' });
    mono(st.b2g, l2, BX0 + st.w1 + 24, 550, 28, C.white, { anchor: 'start' });
    line(st.gapG, BX0 + st.w1, 410, BX0 + st.w1, 590, C.lime, 3, { 'stroke-dasharray': '8 7', 'stroke-linecap': 'butt' });
    st.gap = rect(st.gapG, BX0 + st.w2, 510, Math.max(0, st.w1 - st.w2), 60, 0, C.lime, C.ink, 4);
    fit(st.gapG, root, 'LA MARGE', BX0 + (st.w1 + st.w2) / 2, 640, 48, C.lime, 300, { anchor: 'middle' });
    sv('path', { d: `M ${f2(BX0 + (st.w1 + st.w2) / 2)} 578 l -11 18 l 22 0 Z`, fill: C.lime }, st.gapG);

    /* calcul de la moyenne */
    st.calc = g(root);
    const K = st.calc;
    st.chips = [];
    for (let k = 0; k < 10; k++) {
      const cg = g(K);
      const r = rect(cg, 330 - 115, 640 - 24 * (k + 1) + 1, 230, 22, 11, k % 2 ? C.paper : C.red, C.ink, 4);
      st.chips.push({ g: cg, r, y: 640 - 24 * (k + 1) + 12 });
    }
    st.stakeT = g(K);
    fit(st.stakeT, root, stake + NB + 'MISÉS', 330, 712, 56, C.paper, 400, { anchor: 'middle' });
    st.arrow = g(K);
    arrowH(st.arrow, 505, 446, 765, C.paper, 10, 38);
    st.res = g(K);
    fit(st.res, root, avg + NB + 'EN MOYENNE', 800, 482, 96, C.paper, 1020, { anchor: 'start' });
    st.house = g(K);
    house(st.house, 1500, 700);
    mono(st.house, 'LA MAISON', 1500, 812, 28, C.paper, { anchor: 'middle' });
    st.fly = g(K);
    rect(st.fly, -115, -11, 230, 22, 11, C.lime, C.ink, 4);
  }

  function updateBet(st, t) {
    const { c } = st;
    // carte
    { const p = E.back(prog(t, st.tCard, st.tCard + 0.35)); xf(st.card, 960, 210, p, p > 0.001 ? 1 : 0, 0); }
    // barres
    {
      const pi = c.implied != null ? E.out3(prog(t, c.implied, c.implied + 0.7)) : 0;
      const pr = c.real != null ? E.out3(prog(t, c.real, c.real + 0.7)) : 0;
      vis(st.bars, c.implied != null || c.real != null);
      setA(st.b1, 'width', f2(Math.max(0, st.w1 * pi))); vis(st.b1, pi > 0.001);
      setA(st.b2, 'width', f2(Math.max(0, st.w2 * pr))); vis(st.b2, pr > 0.001);
      const l1 = c.implied != null ? E.out2(prog(t, c.implied + 0.55, c.implied + 0.85)) : 0;
      setA(st.b1g, 'opacity', f2(l1)); vis(st.b1g, l1 > 0.001);
      const l2 = c.real != null ? E.out2(prog(t, c.real + 0.55, c.real + 0.85)) : 0;
      setA(st.b2g, 'opacity', f2(l2)); vis(st.b2g, l2 > 0.001);
      const gp = c.real != null ? E.back(prog(t, c.real + 0.7, c.real + 1.1)) : 0;
      xf(st.gapG, BX0 + (st.w1 + st.w2) / 2, 540, gp, gp > 0.001 && c.implied != null ? 1 : 0, 0);
    }
    // la scène du dessus s'efface quand le calcul commence
    {
      const ts = st.tStake;
      const ex = ts != null ? E.in3(prog(t, ts, ts + 0.4)) : 0;
      setA(st.top, 'transform', `translate(0 ${f2(-420 * ex)})`);
      vis(st.top, ex < 0.999);
    }
    // calcul : pile de 10 jetons, flèche, moyenne, maison
    {
      const ts = st.tStake, ta = c.average;
      const on = ts != null && t >= ts;
      vis(st.calc, on);
      if (on) {
        const t0 = ts + 0.35;                                                  // les jetons arrivent après la sortie de la scène du dessus
        const tFly = ta != null ? ta + 0.7 : null, FD = 0.9;
        for (let k = 0; k < 10; k++) {
          const ch = st.chips[k], a = t0 + k * 0.1;
          const p = E.out3(prog(t, a, a + 0.22));
          setA(ch.g, 'transform', `translate(0 ${f2((1 - p) * -60)})`);
          setA(ch.g, 'opacity', f2(p)); vis(ch.g, p > 0.001 && !(k === 9 && tFly != null && t >= tFly));
          setA(ch.r, 'fill', k === 9 && ta != null && t >= ta + 0.4 ? C.lime : k % 2 ? C.paper : C.red);
        }
        const sp = E.back(prog(t, t0 + 0.9, t0 + 1.2));
        xf(st.stakeT, 330, 690, sp, sp > 0.001 ? 1 : 0, 0);
        const ap = ta != null ? E.out3(prog(t, ta - 0.25, ta + 0.1)) : 0;
        setA(st.arrow, 'opacity', f2(ap)); vis(st.arrow, ap > 0.001);
        const rp = ta != null ? E.back(prog(t, ta, ta + 0.3)) : 0;
        xf(st.res, 800, 440, rp, rp > 0.001 ? 1 : 0, 0);
        const hp = ta != null ? E.back(prog(t, ta + 0.5, ta + 0.85)) : 0;
        xf(st.house, 1500, 700, hp, hp > 0.001 ? 1 : 0, 0);
        // le jeton lime part vers la maison (courbe de Bézier quadratique)
        if (tFly != null && t >= tFly) {
          const q = E.io2(prog(t, tFly, tFly + FD)), u = 1 - q;
          const x = u * u * 330 + 2 * u * q * 900 + q * q * 1500, y = u * u * 413 + 2 * u * q * 250 + q * q * 722;
          const s = 1 - 0.4 * q;
          setA(st.fly, 'transform', `translate(${f2(x)} ${f2(y)}) rotate(${f2(-14 * Math.sin(Math.PI * q))}) scale(${f2(s)})`);
          vis(st.fly, true);
        } else vis(st.fly, false);
      }
    }
  }

  /* ================= cashout ================= */
  function initCash(st, root, P, c, dur) {
    const none = ['button', 'press', 'value', 'relabel'].every((n) => c[n] == null);
    if (none) Object.assign(c, { button: +(0.06 * dur).toFixed(2), value: +(0.3 * dur).toFixed(2), press: +(0.55 * dur).toFixed(2), relabel: +(0.7 * dur).toFixed(2) });
    const bt = str(P.button, 'SÉCURISER'), rl = str(P.relabel, 'REVENDRE MOINS CHER');
    rect(root, 0, 0, 1920, 1080, 0, C.ink);
    const bgs = g(root, { transform: 'rotate(-18 960 540)' });
    for (let k = -4; k <= 4; k++) rect(bgs, 960 + k * 300 - 70, -600, 140, 2300, 0, C.pocket);
    const defs = sv('defs', null, root);
    st.defs = defs;
    // carte « TON PARI »
    st.card = g(root);
    rect(st.card, 360 + 14, 90 + 14, 1200, 160, 28, C.lime);
    rect(st.card, 360, 90, 1200, 160, 28, C.paper, C.ink, 8);
    text(st.card, 'TON PARI', 410, 195, 72, C.ink, { anchor: 'start' });
    rect(st.card, 880, 124, 560, 14, 7, C.ink); rect(st.card, 880, 156, 420, 14, 7, C.ink); rect(st.card, 880, 188, 500, 14, 7, C.ink);
    // bouton
    st.btn = g(root);
    st.btnSh = rect(st.btn, 0, 0, 760, 130, 40, C.red);
    st.btnBody = rect(st.btn, 0, 0, 760, 130, 40, C.lime, C.ink, 8);
    st.btnT = text(st.btn, bt, 960, 462, 64, C.ink, { anchor: 'middle' });
    st.btnW = meas(root, bt, 64);
    st.strike = line(st.btn, 960, 440, 960, 440, C.red, 14, { 'stroke-linecap': 'butt' });
    const cp = clipWipe(defs, st.uid + 'r', 700, 470, 0, 80);
    st.relClip = cp;
    const rg = g(st.btn, { 'clip-path': `url(#${st.uid}r)` });
    st.relT = fit(rg, root, rl, 960, 526, 48, C.red, 860, { anchor: 'middle' });
    st.relW = Math.min(meas(root, rl, 48), 860);
    // barres
    st.val = g(root);
    rect(st.val, 360, 640, 1200, 60, 0, C.pocket); rect(st.val, 360, 730, 1200, 60, 0, C.pocket);
    st.v1 = rect(st.val, 360, 640, 0, 60, 0, C.paper, C.ink, 4);
    st.v2 = rect(st.val, 360, 730, 0, 60, 0, C.paper, C.ink, 4);
    st.w2 = 1020;
    st.v1t = g(st.val); st.v2t = g(st.val);
    mono(st.v1t, 'CE QUE VAUT TON PARI', 384, 679, 28, C.ink, { anchor: 'start' });
    mono(st.v2t, "CE QU'ON T'EN PROPOSE", 384, 769, 28, C.ink, { anchor: 'start' });
    st.gapG = g(st.val);
    rect(st.gapG, 360 + st.w2, 730, 1200 - st.w2, 60, 0, C.lime, C.ink, 4);
    mono(st.gapG, 'LA MAISON', 360 + st.w2 + (1200 - st.w2) / 2, 768, 26, C.ink, { anchor: 'middle' });
  }

  function updateCash(st, t) {
    const { c } = st;
    { const p = E.back(prog(t, 0.1, 0.45)); xf(st.card, 960, 170, p, p > 0.001 ? 1 : 0, 0); }
    // bouton
    {
      const tb = c.button, tp = c.press, tr = c.relabel;
      const pop = tb != null ? E.back(prog(t, tb, tb + 0.35)) : 1;
      const u = tb != null ? clamp((t - (tb + 0.4)) / 0.4) : 1;
      const pulse = tb != null && u > 0 && u < 1 ? 1 + 0.05 * Math.sin(Math.PI * u) : 1;
      const rp = tr != null ? E.out3(prog(t, tr, tr + 8 / 30)) : 0;                 // le bouton s'agrandit en 8 i
      const w = 760 + 220 * rp, h = 130 + 100 * rp, cx = 960, cy = 440;
      const pressed = tp != null && t >= tp || tr != null && t >= tr;
      const dy = tp != null && t >= tp ? 6 : 0;
      setA(st.btnBody, 'x', f2(cx - w / 2)); setA(st.btnBody, 'y', f2(cy - h / 2 + dy)); setA(st.btnBody, 'width', f2(w)); setA(st.btnBody, 'height', f2(h)); setA(st.btnBody, 'rx', f2(40 + 10 * rp));
      const so = pressed && tp != null && t >= tp ? 4 : 10;
      setA(st.btnSh, 'x', f2(cx - w / 2 + so)); setA(st.btnSh, 'y', f2(cy - h / 2 + so)); setA(st.btnSh, 'width', f2(w)); setA(st.btnSh, 'height', f2(h)); setA(st.btnSh, 'rx', f2(40 + 10 * rp));
      setA(st.btnBody, 'fill', pressed ? C.paper : C.lime);
      // libellé : monte quand le nouveau mot arrive
      const ty = 462 + dy - 36 * rp;
      setA(st.btnT, 'y', f2(ty));
      const sp = tr != null ? E.out3(prog(t, tr + 0.05, tr + 0.05 + 6 / 30)) : 0;      // trait red 14 px en 6 i
      const half = st.btnW / 2 + 22;
      setA(st.strike, 'x1', f2(cx - half)); setA(st.strike, 'y1', f2(ty - 20)); setA(st.strike, 'x2', f2(cx - half + 2 * half * sp)); setA(st.strike, 'y2', f2(ty - 20 - 6 * sp));
      vis(st.strike, sp > 0.001);
      setA(st.relT, 'y', f2(526 + dy - 0));
      const wp = tr != null ? E.out2(prog(t, tr + 0.3, tr + 0.75)) : 0;
      setA(st.relClip, 'x', f2(cx - st.relW / 2 - 8)); setA(st.relClip, 'y', f2(cy - h / 2 + 30)); setA(st.relClip, 'width', f2((st.relW + 16) * wp)); setA(st.relClip, 'height', f2(h));
      setA(st.relT, 'opacity', f2(wp > 0 ? 1 : 0));
      xf(st.btn, cx, cy, pop * pulse, pop > 0.001 ? 1 : 0, 0);
    }
    // barres : ce que vaut ton pari / ce qu'on t'en propose
    {
      const tv = c.value;
      const p1 = tv != null ? E.out3(prog(t, tv, tv + 0.6)) : 0, p2 = tv != null ? E.out3(prog(t, tv + 0.25, tv + 0.85)) : 0;
      vis(st.val, tv != null && t >= tv);
      setA(st.v1, 'width', f2(1200 * p1)); vis(st.v1, p1 > 0.001);
      setA(st.v2, 'width', f2(st.w2 * p2)); vis(st.v2, p2 > 0.001);
      setA(st.v1t, 'opacity', f2(E.out2(prog(t, (tv || 0) + 0.4, (tv || 0) + 0.7)))); setA(st.v2t, 'opacity', f2(E.out2(prog(t, (tv || 0) + 0.65, (tv || 0) + 0.95))));
      const gp = tv != null ? E.back(prog(t, tv + 0.9, tv + 1.25)) : 0;
      xf(st.gapG, 360 + st.w2 + (1200 - st.w2) / 2, 760, gp, gp > 0.001 ? 1 : 0, 0);
    }
  }

  /* ================= composant ================= */
  const NAMES = ['kickoff', 'whistle', 'never', 'weekend', 'half', 'card', 'implied', 'real', 'stake', 'average', 'button', 'press', 'value', 'relabel'];
  ZV.define('live-bets', {
    init(root, shot) {
      const P = shot.props || {};
      const beats = Array.isArray(shot.beats) ? shot.beats : [];
      const dur = isNum(shot.dur) && shot.dur > 0 ? shot.dur : 10;
      const c = {};
      for (const n of NAMES) { let r = null; for (const b of beats) if (b && b.do === 'cue' && b.name === n && isNum(b.t) && (r == null || b.t < r)) r = b.t; c[n] = r; }
      const mode = P.mode === 'bet' || P.mode === 'cashout' ? P.mode : 'match';
      const st = { dur, c, mode, uid: 'lb' + (++UID) };
      if (mode === 'match') { rect(root, 0, 0, 1920, 1080, 0, C.ink); initMatch(st, root, P, c, dur); }
      else if (mode === 'bet') initBet(st, root, P, c, dur);
      else initCash(st, root, P, c, dur);
      return st;
    },
    update(st, t) {
      try {
        t = clamp(t, 0, st.dur + 1);
        if (st.mode === 'match') updateMatch(st, t);
        else if (st.mode === 'bet') updateBet(st, t);
        else updateCash(st, t);
      } catch (e) { /* jamais d'exception */ }
    }
  });
})();
