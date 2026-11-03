// Composant `odds-overround` (épisode 8) : « une cote, c'est un prix » et trois chances qui font 105,6 %. Voir EP8-COMPONENTS.md.
// Carte de match (3 tuiles de cote) → étiquettes de prix → tuiles retournées (1 ÷ cote) → cadre « 100 % » où s'empilent les trois chances (total qui défile
// puis se pose une seule fois) → dépassement lime = la marge → règle 5 → 12 % → sifflet. Mode `dutch` : piles de mises, flèches, « TU TOUCHES : 100 € », « −5,57 € ».
// `comma` : retour sur la carte, zoom sur la virgule de « 1,55 » (le zéro vert). Fonction pure du temps ; aplats, aucun dégradé / flou / filter.
// Cues : odds, price, p1, p2, p3, flip-all, stack, overflow, range, kickoff, dutch, stakes, staked, payout, loss, comma.
(() => {
  'use strict';
  const { C, E, clamp, prog, f2, sv, g, rect, circle, path, line, text, F } = ZV;
  let UID = 0;
  const NB = '\u00A0';
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const num = (v, d) => (v != null && v !== '' && isFinite(+v) ? +v : d);
  const str = (v, d) => (typeof v === 'string' && v.length ? v : d);
  const arr3 = (v, d) => (Array.isArray(v) && v.length >= 3 ? [0, 1, 2].map((i) => (v[i] != null ? String(v[i]) : d[i])) : d.slice());
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const vis = (n, on) => setA(n, 'display', on ? 'inline' : 'none');          // display (et non visibility : un enfant « visible » réapparaîtrait)
  const fmt1 = (v) => v.toFixed(1).replace('.', ',');
  const fmt2 = (v) => v.toFixed(2).replace('.', ',');
  const mw = (s, size) => String(s).length * size * 0.6;                     // Mono : 0,6 em par caractère
  // mesure réelle d'un texte Bricolage 800 (repli : estimation)
  const measCache = {};
  function meas(root, s, size, mono) {
    const key = s + '|' + size + '|' + (mono ? 1 : 0);
    if (measCache[key] != null) return measCache[key];
    let w = mono ? mw(s, size) : String(s).length * size * 0.6;
    try {
      const n = text(root, s, 0, 0, size, '#000', { mono, weight: 800 });
      const b = n.getComputedTextLength();
      root.removeChild(n);
      if (b > 0) w = b;
    } catch (e) { /* estimation */ }
    measCache[key] = w;
    return w;
  }
  // texte Bricolage dont la largeur ne dépasse jamais `max` (compression plutôt que débordement)
  function fit(parent, root, s, x, y, size, fill, max, o) {
    const n = text(parent, s, x, y, size, fill, o || {});
    const w = meas(root, s, size, false);
    if (w > max) { n.setAttribute('textLength', f2(max)); n.setAttribute('lengthAdjust', 'spacingAndGlyphs'); }
    return n;
  }
  // transformation autour d'un point absolu (échelle / rotation / décalage) + opacité
  const xf = (n, cx, cy, s, o, rot, dx, dy) => {
    s = Math.max(s, 0.0001);
    setA(n, 'transform', `translate(${f2(cx + (dx || 0))} ${f2(cy + (dy || 0))}) rotate(${f2(rot || 0)}) scale(${f2(s)}) translate(${f2(-cx)} ${f2(-cy)})`);
    setA(n, 'opacity', f2(o)); vis(n, o > 0.001);
  };
  // flèche pleine (trait + pointe) dont on peut déplacer l'extrémité : setArrow(A, x2, y2, k) k = taille de la pointe (0..1)
  const arrow = (parent, x1, y1, x2, y2, col, sw, hs) => {
    const A = { x1, y1, x2, y2, hs, ln: line(parent, x1, y1, x2, y2, col, sw), hd: sv('path', { d: '', fill: col }, parent) };
    setArrow(A, x1, y1, x2, y2, 1);
    return A;
  };
  function setArrow(A, x1, y1, x2, y2, k) {
    const a = Math.atan2(y2 - y1, x2 - x1), ca = Math.cos(a), sa = Math.sin(a), h = A.hs * Math.max(k, 0.0001);
    setA(A.ln, 'x1', f2(x1)); setA(A.ln, 'y1', f2(y1)); setA(A.ln, 'x2', f2(x2 - ca * h * 0.6)); setA(A.ln, 'y2', f2(y2 - sa * h * 0.6));
    setA(A.hd, 'd', `M ${f2(x2)} ${f2(y2)} L ${f2(x2 - ca * h + sa * h * 0.55)} ${f2(y2 - sa * h - ca * h * 0.55)} L ${f2(x2 - ca * h - sa * h * 0.55)} ${f2(y2 - sa * h + ca * h * 0.55)} Z`);
  }

  const CX = [510, 960, 1410], CY = 273, TW = 380, TH = 170;
  const TAGD = 'M -130 -85 L 172 -85 Q 190 -85 190 -67 L 190 67 Q 190 85 172 85 L -130 85 L -190 0 Z';
  const FX0 = 210, FW = 1500, FY = 470, FH = 170;                              // cadre « 100 % »
  const NAMES = ['odds', 'price', 'p1', 'p2', 'p3', 'flip-all', 'stack', 'overflow', 'range', 'kickoff', 'dutch', 'stakes', 'staked', 'payout', 'loss', 'comma'];

  ZV.define('odds-overround', {
    init(root, shot) {
      const P = shot.props || {};
      const beats = Array.isArray(shot.beats) ? shot.beats : [];
      const dur = isNum(shot.dur) && shot.dur > 0 ? shot.dur : 10;
      const cu = (n) => { let r = null; for (const b of beats) if (b && b.do === 'cue' && b.name === n && isNum(b.t) && (r == null || b.t < r)) r = b.t; return r; };
      const c = {};
      for (const n of NAMES) c[n] = cu(n);
      const mode0 = P.mode === 'dutch' ? 'dutch' : 'overround';
      if (!NAMES.some((n) => c[n] != null)) {                                  // aucun repère : le plan se joue seul, réparti sur sa durée
        const D = dur, at = (f) => Math.round(f * D * 100) / 100;
        if (mode0 === 'dutch') Object.assign(c, { stakes: at(0.12), staked: at(0.36), payout: at(0.55), loss: at(0.74) });
        else Object.assign(c, { odds: at(0.03), price: at(0.16), p1: at(0.27), stack: at(0.4), overflow: at(0.6), range: at(0.74), kickoff: at(0.86) });
      }
      const uid = 'oo' + (++UID);

      /* ---- données ---- */
      const DEF = [1.55, 4.2, 5.8];
      const odds = Array.isArray(P.odds) && P.odds.length >= 3 ? [0, 1, 2].map((i) => Math.max(1.01, num(P.odds[i], DEF[i]))) : DEF.slice();
      const inv = odds.map((o) => 1 / o);
      const sum = inv[0] + inv[1] + inv[2];
      const labels = arr3(P.labels, ['A GAGNE', 'NUL', 'B GAGNE']);
      const teams = str(P.teams, 'ÉQUIPE A — ÉQUIPE B');
      const oddTxt = odds.map(fmt2);
      const probs = arr3(P.probs, inv.map((v) => '≈' + NB + fmt1(v * 100) + NB + '%'));
      const total = str(P.total, fmt1(sum * 100) + NB + '%');
      const margin = str(P.margin, fmt1((sum - 1) * 100) + NB + '%');
      const range = str(P.range, 'EN GÉNÉRAL' + NB + ': 5 À 12' + NB + '%');
      const stakes = arr3(P.stakes, inv.map((v) => fmt2(v * 100) + NB + '€'));
      const staked = str(P.staked, fmt2(sum * 100) + NB + '€');
      const payout = str(P.payout, '100' + NB + '€');
      const loss = str(P.loss, '−' + fmt2(sum * 100 - 100) + NB + '€');
      const derived = P.show_derived !== false;
      const totalNum = parseFloat(String(total).replace(',', '.')) || sum * 100;
      const st = { dur, c, mode0, odds, inv, sum, derived, total, totalNum, uid, margin };

      /* ---- repères déduits ---- */
      st.tDutch = mode0 === 'dutch' ? -10 : c.dutch != null ? c.dutch : c.stakes != null ? Math.max(0, c.stakes - 0.45) : null;
      const first = [c.overflow, c.kickoff].filter((x) => x != null);
      st.tStack = c.stack != null ? c.stack : first.length ? Math.max(0.1, Math.min(...first) - 2.0) : null;
      st.tFrame = st.tStack != null ? Math.max(0, Math.min(st.tStack, ...first) - 0.5) : null;
      st.tOdds = c.odds != null ? c.odds : 0.2;
      st.tSeg = [0, 1, 2].map((i) => (st.tStack != null ? st.tStack + i * 0.55 : null));
      st.tSettle = st.tStack != null ? st.tStack + 2 * 0.55 + 0.45 + 0.2 : null;
      st.tFlip = [0, 1, 2].map((i) => {
        const a = c['p' + (i + 1)], b = c['flip-all'] != null ? c['flip-all'] + i * (4 / 30) : null;
        return a != null && b != null ? Math.min(a, b) : a != null ? a : b;
      });

      /* ---- fond ---- */
      rect(root, 0, 0, 1920, 1080, 0, C.paper);
      const defs = sv('defs', null, root);
      const mkClip = (x, y, h) => { const cp = sv('clipPath', { id: uid + 'c' + (mkClip.n = (mkClip.n || 0) + 1) }, defs); const r = rect(cp, x, y, 0, h, 0, '#000'); return { id: cp.getAttribute('id'), r }; };

      /* ---- carte de match + tuiles ---- */
      st.card = g(root);
      rect(st.card, 274, 84, 1400, 302, 28, C.ink);
      rect(st.card, 260, 70, 1400, 302, 28, C.white, C.ink, 8);
      st.title = fit(st.card, root, teams, 960, 128, 54, C.ink, 1260, { anchor: 'middle' });
      st.tiles = [];
      for (let i = 0; i < 3; i++) {
        const T = { g: g(st.card) };
        T.lab = text(T.g, labels[i], 0, -99, 26, C.ink, { mono: true, anchor: 'middle', len: f2(mw(labels[i], 26)) });
        // ficelle de l'étiquette de prix (ne se retourne pas avec la tuile)
        T.str = g(T.g);
        path(T.str, 'M -148 0 C -172 4 -196 22 -198 64', 'none', C.ink, 4);
        circle(T.str, -198, 64, 6, C.ink);
        T.prix = text(T.str, 'PRIX', -218, 42, 20, C.ink, { mono: true, anchor: 'middle', len: f2(mw('PRIX', 20)) });
        T.prix.setAttribute('transform', 'rotate(-90 -218 42)');
        T.flip = g(T.g);
        // face avant
        T.front = g(T.flip);
        T.rectF = rect(T.front, -190, -85, TW, TH, 18, C.ink);
        T.tagF = path(T.front, TAGD, C.ink);
        T.eyeF = g(T.front);
        circle(T.eyeF, -148, 0, 15, C.paper); circle(T.eyeF, -148, 0, 7, C.white);
        T.oddG = g(T.front);
        const s = oddTxt[i], k = s.indexOf(',');
        const pre = k >= 0 ? s.slice(0, k) : s, post = k >= 0 ? s.slice(k + 1) : '';
        const cell = 66, x0 = -s.length * cell / 2;
        text(T.oddG, pre, x0, 40, 110, C.paper, { mono: true, anchor: 'start', len: f2(pre.length * cell) });
        T.comma = k >= 0 ? text(T.oddG, ',', x0 + pre.length * cell, 40, 110, C.paper, { mono: true, anchor: 'start', len: cell }) : null;
        if (post) text(T.oddG, post, x0 + (pre.length + 1) * cell, 40, 110, C.paper, { mono: true, anchor: 'start', len: f2(post.length * cell) });
        T.cx = x0 + pre.length * cell + cell / 2;                                // centre de la case de la virgule (repère local de oddG)
        T.disk = circle(T.oddG, T.cx, 32, 16, C.lime, C.ink, 4);
        vis(T.disk, false);
        // face arrière : 1 ÷ cote et pourcentage
        T.back = g(T.flip);
        T.rectB = rect(T.back, -190, -85, TW, TH, 18, C.lime, C.ink, 6);
        T.tagB = path(T.back, TAGD, C.lime, C.ink, 6);
        T.eyeB = g(T.back);
        circle(T.eyeB, -148, 0, 15, C.paper, C.ink, 4); circle(T.eyeB, -148, 0, 6, C.white, C.ink, 3);
        T.bkG = g(T.back);
        const l1 = '1 ÷ ' + oddTxt[i];
        const showP = derived || i === 0;
        text(T.bkG, showP ? l1 : l1, 0, showP ? -26 : 12, showP ? 34 : 50, C.ink, { mono: true, weight: 700, anchor: 'middle', len: f2(mw(l1, showP ? 34 : 50)) });
        if (showP) {
          const ps = probs[i];
          text(T.bkG, ps, 0, 46, 58, C.ink, { mono: true, anchor: 'middle', len: f2(Math.min(mw(ps, 58), 290)) });
        }
        T.cxScreen = CX[i];
        st.tiles.push(T);
      }

      /* ---- calque « 100 % » (cadre, segments, total, marge, règle, sifflet) ---- */
      st.over = g(root);
      const O = st.over;
      st.frame = g(O);
      text(st.frame, '3 ISSUES POSSIBLES = 100' + NB + '%', FX0, 452, 28, C.ink, { mono: true, anchor: 'start', len: f2(mw('3 ISSUES POSSIBLES = 100 %', 28)) });
      rect(st.frame, FX0, FY, FW, FH, 0, 'none', C.ink, 8);
      st.segs = [];
      {
        let x = FX0;
        for (let i = 0; i < 3; i++) {
          const w = FW * inv[i], S = { g: g(O), x0: x, w };
          rect(S.g, x, FY, w, FH, 0, i === 1 ? C.white : C.paper, C.ink, 6);
          const lab = labels[i];
          text(S.g, lab, x + 16, 506, 22, C.ink, { mono: true, anchor: 'start', len: f2(mw(lab, 22)) });
          const inner = Math.min(x + w, FX0 + FW) - x;                           // partie visible dans le cadre
          const mid = x + Math.min(w, inner) / 2 - (i === 2 ? 0 : 0);
          let pt = probs[i].replace(/^≈\s*/, ''), sz = 40;
          if (!derived && i > 0) { pt = '1 ÷ ' + oddTxt[i]; sz = 32; }
          text(S.g, pt, mid, 596, sz, C.ink, { mono: true, anchor: 'middle', len: f2(Math.min(mw(pt, sz), inner - 36)) });
          st.segs.push(S);
          x += w;
        }
      }
      const exX = FX0 + FW, exW = Math.max(0, FW * (sum - 1));
      st.bump = rect(O, exX + 6, FY + 3, Math.max(0, exW - 9), FH - 6, 0, C.lime);
      st.limit = line(O, exX, FY - 20, exX, FY + FH + 22, C.ink, 12, { 'stroke-linecap': 'butt' });
      st.limitR = line(O, exX, FY - 20, exX, FY + FH + 22, C.red, 12, { 'stroke-linecap': 'butt' });
      // total
      st.tot = g(O);
      {
        const w = meas(root, 'TOTAL' + NB + ':' + NB + total, 96, false);
        st.totT = text(st.tot, '', 1710, 790, f2(Math.min(96, 96 * 860 / Math.max(w, 1))), C.ink, { anchor: 'end' });
      }
      // contexte (gauche)
      st.ctx = text(O, '', FX0, 704, 28, C.ink, { mono: true, anchor: 'start' });
      // marge : étiquette + flèche
      st.mar = g(O);
      {
        const lab = '+' + NB + margin + NB + ': LA MARGE', sz = 52;
        const w = Math.min(meas(root, lab, sz, false), 560) + 52, x1 = 1690, h = 62;
        rect(st.mar, x1 - w + 8, 396 + 8, w, h, 14, C.ink);
        rect(st.mar, x1 - w, 396, w, h, 14, C.lime, C.ink, 6);
        fit(st.mar, root, lab, x1 - w / 2, 396 + 46, sz, C.ink, w - 40, { anchor: 'middle' });
        arrow(st.mar, x1 + 6, 428, 1752, 466, C.ink, 6, 20);
      }
      // règle 5 → 12
      st.rng = g(O);
      {
        const cl = mkClip(FX0 - 12, 716, 120);
        st.clipRange = cl;
        const rg = g(st.rng, { 'clip-path': `url(#${cl.id})` });
        text(rg, range, FX0, 744, 28, C.ink, { mono: true, anchor: 'start', len: f2(mw(range, 28)) });
        const k = 440 / 9, X = (v) => FX0 + k * (v - 4);
        for (let v = 4; v <= 13; v++) line(rg, X(v), 772, X(v), 800, C.ink, 3, { 'stroke-linecap': 'butt' });
        line(rg, X(5), 786, X(12), 786, C.ink, 10, { 'stroke-linecap': 'butt' });
        text(rg, '5', X(5), 826, 22, C.ink, { mono: true, anchor: 'middle', len: f2(mw('5', 22)) });
        text(rg, '12', X(12), 826, 22, C.ink, { mono: true, anchor: 'middle', len: f2(mw('12', 22)) });
        sv('path', { d: `M ${f2(X(5.6))} 773 l -9 -15 l 18 0 Z`, fill: C.red, stroke: C.ink, 'stroke-width': 2 }, rg);
      }
      // sifflet + étiquette
      st.kick = g(O);
      {
        const wh = g(st.kick);
        st.whistle = wh;
        rect(wh, 1318, 676, 28, 18, 4, C.ink);
        circle(wh, 1358, 684, 17, C.ink);
        circle(wh, 1358, 684, 6, C.paper);
        rect(wh, 1348, 662, 16, 8, 2, C.ink);
        const lab = 'PRÉLEVÉE AVANT LE COUP D\'ENVOI';
        const cl = mkClip(1380, 666, 44);
        st.clipKick = cl;
        const kg = g(st.kick, { 'clip-path': `url(#${cl.id})` });
        text(kg, lab, 1860, 698, 26, C.ink, { mono: true, anchor: 'end', len: f2(mw(lab, 26)) });
        line(st.kick, 1754, 640, 1754, 664, C.ink, 4);
        sv('path', { d: 'M 1754 636 l -8 12 l 16 0 Z', fill: C.ink }, st.kick);
        st.kickW = 1860 - 1380;
      }

      /* ---- calque « dutch » ---- */
      st.dg = g(root);
      {
        const D = st.dg;
        st.cols = [];
        for (let i = 0; i < 3; i++) {
          const K = { g: g(D), n: Math.max(1, Math.min(10, Math.round(100 * inv[i] / 8))), chips: [] };
          for (let k = 0; k < K.n; k++) {
            const cg = g(K.g);
            rect(cg, CX[i] - 75, 560 - 17 * (k + 1) - 1, 150, 18, 8, k % 2 ? C.white : C.red, C.ink, 4);
            K.chips.push(cg);
          }
          if (derived) {
            K.val = text(K.g, stakes[i], CX[i], 622, 52, C.ink, { mono: true, anchor: 'middle', len: f2(Math.min(mw(stakes[i], 52), 300)) });
          }
          st.cols.push(K);
        }
        // total misé
        st.sk = g(D);
        fit(st.sk, root, 'MISÉ' + NB + ': ' + staked, 150, 764, 54, C.ink, 520, { anchor: 'start' });
        // bloc « tu touches »
        st.pay = g(D);
        const BX = 700, BY = 692, BW = 520, BH = 112;
        st.arrows = [];
        const tx = [BX + 120, BX + BW / 2, BX + BW - 120];
        for (let i = 0; i < 3; i++) {
          st.arrows.push(arrow(st.pay, CX[i], 642, tx[i], BY - 6, C.ink, 6, 18));
        }
        st.blk = g(st.pay);
        rect(st.blk, BX + 10, BY + 10, BW, BH, 14, C.ink);
        rect(st.blk, BX, BY, BW, BH, 14, C.paper, C.ink, 7);
        fit(st.blk, root, 'TU TOUCHES' + NB + ': ' + payout, BX + BW / 2, BY + 54, 48, C.ink, BW - 44, { anchor: 'middle' });
        text(st.blk, 'QUOI QU\'IL ARRIVE', BX + BW / 2, BY + 92, 24, C.red, { mono: true, anchor: 'middle', len: f2(mw('QUOI QU\'IL ARRIVE', 24)) });
        // perte
        st.ls = g(D);
        fit(st.ls, root, loss, 1830, 800, 108, C.red, 470, { anchor: 'end' });
        {
          const lab = 'GAGNÉ À COUP SÛR… ET PERDU';
          const cl = mkClip(1380, 670, 50);
          st.clipLoss = cl;
          const lg = g(st.ls, { 'clip-path': `url(#${cl.id})` });
          text(lg, lab, 1830, 704, 24, C.ink, { mono: true, anchor: 'end', len: f2(mw(lab, 24)) });
          st.lossW = 450;
        }
      }

      /* ---- légende « le zéro vert » (comma) ---- */
      st.cm = g(root);
      {
        const lab = 'LE ZÉRO VERT';
        text(st.cm, lab, 960, 806, 44, C.ink, { mono: true, anchor: 'middle', len: f2(mw(lab, 44)) });
        st.cmArrow = arrow(st.cm, 952, 766, 940, 646, C.red, 8, 26);
      }
      return st;
    },

    update(st, t) {
      try {
        t = clamp(t, 0, st.dur + 1);
        const { c } = st;
        const tC = c.comma;
        const cp = tC != null ? prog(t, tC, tC + 0.2) : 0;                       // fondu des autres éléments au retour sur la carte
        const zoom = tC != null ? E.io3(prog(t, tC, tC + 16 / 30)) : 0;

        /* carte : zoom sur la tuile 1 */
        {
          const S = 1 + 0.9 * zoom, ex = 510 + (960 - 510) * zoom, ey = CY + (540 - CY) * zoom;
          setA(st.card, 'transform', `translate(${f2(ex)} ${f2(ey)}) scale(${f2(S)}) translate(-510 ${-CY})`);
        }
        setA(st.title, 'opacity', f2(1 - cp));

        /* tuiles */
        for (let i = 0; i < 3; i++) {
          const T = st.tiles[i];
          const tp = st.tOdds + i * 0.2;
          const pop = E.back(prog(t, tp, tp + 0.3));
          const tPr = c.price != null ? c.price + i * 0.1 : null;
          const priced = tPr != null && t >= tPr;
          const u = priced ? t - tPr : 0;
          const pp = priced ? E.out3(prog(t, tPr, tPr + 0.25)) : 0;
          const wob = priced ? 5 * Math.exp(-4 * u) * Math.sin(16 * u) : 0;
          const pulse = priced ? 1 + 0.08 * Math.sin(Math.PI * clamp(u / 0.25)) : 1;
          // retournement (le comma continue le geste si la tuile était déjà retournée)
          let th = 0;
          const tf = st.tFlip[i];
          if (tf != null) th = Math.PI * E.io2(prog(t, tf, tf + 10 / 30));
          if (i === 0 && tC != null && tf != null && tf + 10 / 30 <= tC) th += Math.PI * E.io2(prog(t, tC, tC + 10 / 30));
          const cs = Math.cos(th);
          const backFace = (th % (2 * Math.PI)) > Math.PI / 2 && (th % (2 * Math.PI)) < 3 * Math.PI / 2;
          const sc = Math.max(0, pop) * pulse;
          const o = i === 0 ? 1 : 1 - cp;
          setA(T.g, 'transform', `translate(${CX[i]} ${CY}) rotate(${f2(wob)}) scale(${f2(Math.max(sc, 0.0001))})`);
          setA(T.g, 'opacity', f2(o)); vis(T.g, o > 0.001 && pop > 0.001);
          setA(T.lab, 'opacity', f2(i === 0 ? 1 : 1));
          vis(T.rectF, !priced); vis(T.tagF, priced); vis(T.eyeF, priced);
          vis(T.rectB, !priced); vis(T.tagB, priced); vis(T.eyeB, priced);
          vis(T.str, priced); setA(T.str, 'opacity', f2(pp));
          const ox = 22 * pp;
          setA(T.oddG, 'transform', `translate(${f2(ox)} 0)`);
          setA(T.bkG, 'transform', `translate(${f2(ox)} 0)`);
          setA(T.flip, 'transform', `scale(1 ${f2(Math.max(Math.abs(cs), 0.0001))})`);
          vis(T.front, !backFace); vis(T.back, backFace);
          // virgule → disque lime (tuile 1)
          if (i === 0) {
            const dp = tC != null ? E.back(prog(t, tC + 0.4, tC + 0.7)) : 0;
            vis(T.disk, dp > 0.01);
            if (T.comma) vis(T.comma, dp < 0.2);
            setA(T.disk, 'transform', `translate(${f2(T.cx)} 32) scale(${f2(Math.max(dp, 0.0001))}) translate(${f2(-T.cx)} -32)`);
          }
        }

        /* calque 100 % */
        const dutchP = st.tDutch != null ? prog(t, st.tDutch, st.tDutch + 0.4) : 0;
        const overOn = st.mode0 !== 'dutch' && (1 - cp) > 0.001 && dutchP < 0.999;
        vis(st.over, overOn);
        if (overOn) {
          const tO = c.overflow;
          const sh = tO != null ? ZV.shakeAt(t, tO, 6, 0.35) : [0, 0];
          setA(st.over, 'transform', `translate(${f2(sh[0])} ${f2(sh[1] + 520 * E.in3(dutchP))})`);
          setA(st.over, 'opacity', f2(1 - cp));
          // cadre
          const fp = st.tFrame != null ? E.out3(prog(t, st.tFrame, st.tFrame + 0.35)) : 0;
          setA(st.frame, 'opacity', f2(fp)); vis(st.frame, fp > 0.001);
          setA(st.frame, 'transform', `translate(0 ${f2((1 - fp) * 24)})`);
          // segments
          for (let i = 0; i < 3; i++) {
            const S = st.segs[i], ts = st.tSeg[i];
            const p = ts != null ? E.out3(prog(t, ts, ts + 0.45)) : 0;
            setA(S.g, 'transform', `translate(${f2((1 - p) * 260)} 0)`);
            setA(S.g, 'opacity', f2(p)); vis(S.g, p > 0.001);
          }
          // limite + dépassement
          const ovP = tO != null ? prog(t, tO, tO + 0.25) : 0;
          const limOn = st.tFrame != null && fp > 0.001;
          vis(st.limit, limOn); setA(st.limit, 'opacity', f2(fp));
          vis(st.bump, tO != null && t >= tO);
          const y2 = FY - 20 + (FH + 42) * E.out3(ovP);
          vis(st.limitR, ovP > 0.001); setA(st.limitR, 'y2', f2(y2));
          { const mp = tO != null ? E.back(prog(t, tO + 0.15, tO + 0.45)) : 0; xf(st.mar, 1690, 427, mp, mp > 0.001 ? 1 : 0, 0); }
          // total
          {
            let txt = '', on = false, scl = 1;
            if (st.tStack != null && t >= st.tSeg[0]) {
              on = true;
              if (t >= st.tSettle) {
                txt = 'TOTAL' + NB + ':' + NB + st.total;
                const q = t - st.tSettle;
                scl = 1 + 0.07 * Math.sin(Math.PI * clamp(q / 0.3));
              } else {
                const tq = Math.floor(t * 6) / 6;                                // ≤ 6 changements par seconde
                let v = 0;
                for (let i = 0; i < 3; i++) v += 100 * st.inv[i] * E.out2(prog(tq, st.tSeg[i], st.tSeg[i] + 0.45));
                v = Math.min(v, st.totalNum - 0.4);                              // ne montre jamais 105,5 en route
                txt = 'TOTAL' + NB + ':' + NB + fmt1(Math.max(0, v)) + NB + '%';
              }
            }
            if (st.totT.__s !== txt) { st.totT.__s = txt; st.totT.textContent = txt; }
            setA(st.totT, 'fill', tO != null && t >= tO ? C.red : C.ink);
            setA(st.tot, 'transform', `translate(1710 790) scale(${f2(scl)}) translate(-1710 -790)`);
            vis(st.tot, on);
          }
          // contexte
          {
            let s = '';
            if (c.overflow != null && t >= c.overflow + 0.3) s = '= 100' + NB + '% + ' + st.margin;
            else if (st.tStack != null && t >= st.tSeg[0]) s = 'SOMME DES 1 ÷ COTE';
            if (st.ctx.__s !== s) { st.ctx.__s = s; st.ctx.textContent = s; setA(st.ctx, 'textLength', f2(Math.max(1, mw(s, 28)))); }
          }
          // règle
          {
            const rp = c.range != null ? E.out2(prog(t, c.range, c.range + 0.7)) : 0;
            vis(st.rng, rp > 0.001);
            setA(st.clipRange.r, 'width', f2(500 * rp));
          }
          // sifflet
          {
            const kp = c.kickoff != null ? E.back(prog(t, c.kickoff, c.kickoff + 0.3)) : 0;
            vis(st.kick, kp > 0.001);
            xf(st.whistle, 1340, 684, kp, kp > 0.001 ? 1 : 0, (1 - kp) * -20);
            const lp = c.kickoff != null ? E.out2(prog(t, c.kickoff + 0.15, c.kickoff + 0.8)) : 0;
            setA(st.clipKick.r, 'x', f2(1860 - st.kickW * lp)); setA(st.clipKick.r, 'width', f2(st.kickW * lp + 4));
          }
        }

        /* calque dutch */
        {
          const ds = st.tDutch;
          const on = ds != null && t >= ds && (1 - cp) > 0.001;
          vis(st.dg, on);
          if (on) {
            setA(st.dg, 'opacity', f2(1 - cp));
            for (let i = 0; i < 3; i++) {
              const K = st.cols[i];
              const t0 = c.stakes != null ? c.stakes + i * 0.3 : null;
              for (let k = 0; k < K.n; k++) {
                const a = t0 != null ? t0 + k * 0.06 : null;
                const p = a != null ? E.out3(prog(t, a, a + 0.2)) : 0;
                setA(K.chips[k], 'transform', `translate(0 ${f2((1 - p) * -36)})`);
                setA(K.chips[k], 'opacity', f2(p)); vis(K.chips[k], p > 0.001);
              }
              if (K.val) {
                const a = t0 != null ? t0 + K.n * 0.06 : null;
                const p = a != null ? E.back(prog(t, a, a + 0.25)) : 0;
                xf(K.val, CX[i], 604, p, p > 0.001 ? 1 : 0, 0);
              }
            }
            { const p = c.staked != null ? E.back(prog(t, c.staked, c.staked + 0.3)) : 0; xf(st.sk, 150, 750, p, p > 0.001 ? 1 : 0, 0); vis(st.sk, p > 0.001); }
            {
              const tp = c.payout;
              for (let i = 0; i < 3; i++) {
                const a = tp != null ? tp + i * 0.1 : null;
                const p = a != null ? E.out3(prog(t, a, a + 0.4)) : 0;
                const A = st.arrows[i];
                vis(A.ln, p > 0.001); vis(A.hd, p > 0.001);
                setArrow(A, A.x1, A.y1, A.x1 + (A.x2 - A.x1) * p, A.y1 + (A.y2 - A.y1) * p, E.out2(clamp(p * 2)));
              }
              const bp = tp != null ? E.back(prog(t, tp + 0.35, tp + 0.65)) : 0;
              xf(st.blk, 960, 748, bp, bp > 0.001 ? 1 : 0, 0);
              vis(st.pay, tp != null && t >= tp);
            }
            {
              const tl = c.loss;
              const fall = tl != null ? prog(t, tl, tl + 0.5) : 0;
              const dy = (1 - E.bounce(fall)) * -240;
              setA(st.ls, 'transform', `translate(0 ${f2(dy)})`);
              setA(st.ls, 'opacity', f2(fall > 0 ? 1 : 0)); vis(st.ls, fall > 0);
              const lp = tl != null ? E.out2(prog(t, tl + 0.45, tl + 1.0)) : 0;
              setA(st.clipLoss.r, 'x', f2(1830 - st.lossW * lp)); setA(st.clipLoss.r, 'width', f2(st.lossW * lp + 4));
            }
          }
        }

        /* comma : légende « le zéro vert » + flèche vers la virgule */
        {
          const T = st.tiles[0];
          const ox = 22 * (c.price != null && t >= c.price ? E.out3(prog(t, c.price, c.price + 0.25)) : 0);
          const p = tC != null ? E.back(prog(t, tC + 0.7, tC + 1.0)) : 0;
          const dx = 960 + 1.9 * (ox + T.cx);
          xf(st.cm, 960, 790, p, p > 0.001 ? 1 : 0, 0);
          setArrow(st.cmArrow, 952, 766, dx, 642, E.out2(clamp(p)));
        }
      } catch (e) { /* jamais d'exception */ }
    }
  });
})();
