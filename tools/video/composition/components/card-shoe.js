// Composant `card-shoe` (épisode 5) : le sabot qui a de la mémoire, le comptage, la maison qui change le jeu. Voir EP5-COMPONENTS.md.
// Trois modes : memory | count | rules. Fonction pure du temps : la séquence de cartes, les tournées et les mélanges sont simulés dans init() à partir des cues ;
// update() ne fait que poser des attributs. Aplats seulement : aucun dégradé, flou, lueur ni filter.
// Cues : shoe, deal (répétable), discard, meter, burst (n), memory, shuffle ; count : rich, poor, no-gadget, edge ; rules : decks, cut, rules, edge, same.
(() => {
  'use strict';
  const { C, E, clamp, prog, lerp, f2, sv, g, rect, circle, path, line, text, rng } = ZV;
  let UID = 0;
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const num = (v, d) => (v != null && v !== '' && isFinite(+v) ? +v : d);
  const str = (v, d) => (typeof v === 'string' && v.trim() ? v.trim() : d);
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const vis = (n, on) => setA(n, 'display', on ? 'inline' : 'none');
  const bwEst = (s, size) => { let a = 0; for (const ch of String(s)) a += size * (ch === ' ' ? 0.28 : /[0-9]/.test(ch) ? 0.5 : /[A-ZÀÂÉÈÊÎÔÛÇ€%+×≈]/.test(ch) ? 0.66 : /[.,:;'’!|]/.test(ch) ? 0.3 : 0.56); return a; };
  // largeur réelle mesurée à l'init (sonde cachée) ; repli sur l'estimation si la mesure est impossible
  let PROBE = null; const BWC = {};
  const bw = (s, size) => {
    s = String(s); const k = size + '|' + s;
    if (BWC[k] !== undefined) return BWC[k];
    if (PROBE) { try { PROBE.textContent = s; PROBE.setAttribute('font-size', size); const w = PROBE.getComputedTextLength(); if (w > 0) { BWC[k] = w; return w; } } catch (e) { /* hors DOM */ } }
    return bwEst(s, size);
  };
  const mw = (s, size) => String(s).length * size * 0.6;
  const SH = '#2A2A2A';
  // groupe centré sur (0,0) : position / rotation / échelle / opacité (avec cache)
  const putc = (n, x, y, r, sx, sy, o) => {
    if (r === undefined) r = 0; if (sx === undefined) sx = 1; if (sy === undefined) sy = sx; if (o === undefined) o = 1;
    const hid = o <= 0.001 || !sx || !sy;
    setA(n, 'display', hid ? 'none' : 'inline');
    if (hid) return;
    setA(n, 'transform', `translate(${f2(x)} ${f2(y)}) rotate(${f2(r)}) scale(${f2(sx)} ${f2(sy)})`);
    setA(n, 'opacity', f2(o));
  };
  const popS = (t, t0, d) => (t0 == null || t < t0 ? 0 : E.back(prog(t, t0, t0 + (d || 0.3))));
  function mkTag(parent, lines, size, fill, tfill, o) {
    o = o || {};
    const ls = Array.isArray(lines) ? lines : [lines];
    const lh = size * 1.12, px = o.padX || 26, py = o.padY || 14;
    let tw = 0; ls.forEach((s) => { tw = Math.max(tw, o.mono ? mw(s, size) : bw(s, size)); });
    const w = tw + px * 2, h = ls.length * lh + py * 2 - (lh - size) * 0.2;
    const grp = g(parent);
    const sh = o.sh || 9, r = o.r === undefined ? 14 : o.r;
    rect(grp, -w / 2 + sh, -h / 2 + sh, w, h, r, o.shc || (fill === C.paper ? C.lime : fill === C.pocket ? C.paper : C.paper));
    rect(grp, -w / 2, -h / 2, w, h, r, fill, o.stroke || C.ink, o.sw || 6);
    ls.forEach((s, i) => text(grp, s, 0, -h / 2 + py + size * 0.82 + i * lh, size, tfill, { anchor: 'middle', mono: o.mono, len: f2(o.mono ? mw(s, size) : bw(s, size)) }));
    return { g: grp, w, h };
  }
  const mlab = (parent, s, x, y, size, fill, anchor) => text(parent, s, x, y, size, fill, { mono: true, anchor: anchor || 'start', len: f2(mw(s, size)) });

  const DEF_SEQ = ['R', '4', '9', 'D', '2', 'A', '6', '10', '3', 'V', '5', '8', '2', '4', '6', '3', '7', '5', '2', 'A', '10'];
  const catOf = (r) => (/^[2-6]$/.test(r) ? 0 : /^[7-9]$/.test(r) ? 1 : 2);
  const SUITS = ['heart', 'spade', 'diamond', 'club'];

  function drawSuit(parent, name, col) {
    const s = g(parent);
    if (name === 'heart') path(s, 'M0 26 L-29 -3 A16 16 0 0 1 0 -16 A16 16 0 0 1 29 -3 Z', col, C.ink, 3);
    else if (name === 'diamond') path(s, 'M0 -30 L22 0 L0 30 L-22 0Z', col, C.ink, 3);
    else if (name === 'spade') path(s, 'M0 -30 L29 2 A15 15 0 0 1 3 17 L9 30 L-9 30 L-3 17 A15 15 0 0 1 -29 2 Z', col, C.ink, 3);
    else { circle(s, 0, -13, 13, col); circle(s, -15, 7, 13, col); circle(s, 15, 7, 13, col); path(s, 'M-7 30 L0 2 L7 30Z', col); }
    return s;
  }
  function mkCard(parent, rank, suit) {
    const grp = g(parent);
    const red = suit === 'heart' || suit === 'diamond';
    rect(grp, -52, -76, 120, 168, 12, SH);
    const face = g(grp), back = g(grp);
    rect(face, -60, -84, 120, 168, 12, C.paper, C.ink, 5);
    text(face, rank, -44, -22, 64, red ? C.red : C.ink, { len: f2(bw(rank, 64) > 80 ? 80 : bw(rank, 64)) });
    const sg = drawSuit(face, suit, red ? C.red : C.ink);
    sg.setAttribute('transform', 'translate(0 26) scale(1.05)');
    rect(back, -60, -84, 120, 168, 12, C.pocket, C.paper, 5);
    rect(back, -46, -70, 92, 140, 6, 'none', C.paper, 2);
    text(back, '0', 0, 26, 84, C.lime, { anchor: 'middle', len: f2(bw('0', 84)) });
    return { g: grp, face, back };
  }
  function pictoEye(p) {
    line(p, -44, -42, 44, -42, C.paper, 6); line(p, 0, -42, 0, -26, C.paper, 6);
    path(p, 'M-38 6 C-20 -22 20 -22 38 6 C20 34 -20 34 -38 6Z', C.white, C.ink, 4);
    circle(p, 0, 6, 11, C.lime, C.ink, 3); circle(p, 0, 6, 4, C.ink);
  }
  function pictoEar(p) {
    path(p, 'M-6 -36 C-36 -36 -36 12 -6 12 L8 12', 'none', C.paper, 9);
    rect(p, 4, 2, 30, 20, 8, C.lime, C.ink, 4);
    path(p, 'M18 22 C18 40 -4 36 -4 46', 'none', C.paper, 4);
  }
  function pictoBox(p) {
    rect(p, -36, -16, 72, 52, 8, C.paper, C.ink, 4);
    line(p, 22, -16, 34, -42, C.paper, 5); circle(p, 34, -44, 6, C.lime, C.ink, 3);
    rect(p, -26, -8, 34, 22, 3, C.lime, C.ink, 3); circle(p, 22, 4, 6, C.ink); circle(p, 22, 22, 6, C.ink);
  }

  /* ---- géométrie ---- */
  const LANE_Y = 385, SLOT_Y = 292, PX = 1610;
  const GX0 = 370, GW = 1500, GY = 668, GH = 80;

  ZV.define('card-shoe', {
    init(root, shot) {
      const P = (shot && shot.props) || {};
      const beats = Array.isArray(shot && shot.beats) ? shot.beats : [];
      const dur = isNum(shot && shot.dur) && shot.dur > 0 ? shot.dur : 10;
      const mode = P.mode === 'count' || P.mode === 'rules' ? P.mode : 'memory';
      const decks = clamp(Math.round(num(P.decks, 6)), 1, 12);
      const seq = Array.isArray(P.sequence) && P.sequence.length ? P.sequence.map((x) => String(x).toUpperCase()) : DEF_SEQ;
      const bubble = str(P.bubble, 'LA BILLE : AUCUNE MÉMOIRE');
      const edgeTxt = str(P.edge, '1 À 2 %');
      const uid = 'cs' + (++UID);
      PROBE = text(root, '', 0, -500, 100, 'none'); PROBE.setAttribute('visibility', 'hidden');
      ['RICHE EN FIGURES', 'PAUVRE EN FIGURES'].forEach((l) => bw(l, 32));
      const cbs = (n) => beats.filter((b) => b && b.do === 'cue' && b.name === n && isNum(b.t)).sort((a, b) => a.t - b.t);
      const c1 = (n) => { const a = cbs(n)[0]; return a ? a.t : null; };
      const NAMES = ['shoe', 'deal', 'discard', 'meter', 'burst', 'memory', 'shuffle', 'rich', 'poor', 'no-gadget', 'edge', 'decks', 'cut', 'rules', 'same'];
      const noCue = !NAMES.some((n) => cbs(n).length);
      const rules = mode === 'rules';
      const st = { dur, mode, decks, uid, noCue, rules };
      st.T = {};
      NAMES.forEach((n) => { st.T[n] = c1(n); });
      const T = st.T;
      st.bandW = clamp(288 / decks, 24, 48);
      st.MAXLINE = rules ? 3 : 5;
      st.LX0 = rules ? 920 : 620;
      st.SP = rules ? 130 : 140;
      st.PY = rules ? 392 : 348;
      st.EXTN = 7;

      /* ---- simulation (déterministe) ---- */
      const evs = [];
      const pri = { shuffle: 0, discard: 1, deal: 2, burst: 3 };
      cbs('deal').forEach((b) => evs.push({ t: b.t, type: 'deal' }));
      cbs('discard').forEach((b) => evs.push({ t: b.t, type: 'discard' }));
      cbs('shuffle').forEach((b) => evs.push({ t: b.t, type: 'shuffle' }));
      cbs('burst').forEach((b) => evs.push({ t: b.t, type: 'burst', n: clamp(Math.round(num(b.n, 14)), 1, 40), d: num(b.dur, 2.5) }));
      if (rules) {
        for (let i = 0; i < 3; i++) evs.push({ t: -6 + i * 0.1, type: 'deal' });
        const tc = T.cut;
        if (tc != null) {
          evs.push({ t: tc + 0.6, type: 'discard' }, { t: tc + 1.2, type: 'shuffle' });
          [1.7, 1.95, 2.2].forEach((d) => evs.push({ t: tc + d, type: 'deal' }));
          evs.push({ t: tc + 3.0, type: 'discard' }, { t: tc + 3.6, type: 'shuffle' });
          [4.1, 4.35, 4.6].forEach((d) => evs.push({ t: tc + d, type: 'deal' }));
        }
      }
      evs.sort((a, b) => a.t - b.t || pri[a.type] - pri[b.type]);
      const cards = [], rounds = [], shufTs = [];
      let seqPos = 0, lineC = [], pile = [], cur = null;
      const rr = rng(5151);
      const mk = (emit, kind) => {
        const rank = seq[seqPos++ % seq.length];
        const c = { rank, suit: SUITS[Math.floor(rr() * 4)], cat: catOf(rank), emit, kind, round: null, k: 0, discT: null, retT: null, base: emit < -1 };
        cards.push(c); return c;
      };
      const sweep = (t) => { lineC.forEach((c, i) => { c.discT = t + i * 0.03; pile.push(c); }); lineC = []; cur = null; };
      if (rules) for (let i = 0; i < 14; i++) { const c = mk(-9, 'burst'); c.rank = seq[i % seq.length]; c.cat = catOf(c.rank); pile.push(c); }
      for (const ev of evs) {
        if (cards.length > 150) break;
        if (ev.type === 'deal') {
          if (lineC.length >= st.MAXLINE) sweep(ev.t);
          const c = mk(ev.t, 'deal');
          if (!cur) { cur = { cards: [] }; rounds.push(cur); }
          c.round = cur; c.k = lineC.length; cur.cards.push(c); lineC.push(c);
        } else if (ev.type === 'discard') { if (lineC.length) sweep(ev.t); }
        else if (ev.type === 'burst') {
          for (let j = 0; j < ev.n; j++) { const c = mk(ev.t + ev.d * Math.pow(j / ev.n, 1 / 1.8), 'burst'); pile.push(c); }
        } else if (ev.type === 'shuffle') {
          const all = lineC.concat(pile);
          all.forEach((c, i) => { c.retT = ev.t + 0.35 * (i / Math.max(1, all.length - 1)); c.shufBase = ev.t; });
          lineC = []; pile = []; cur = null; seqPos = 0; shufTs.push(ev.t);
        }
      }
      st.cards = cards; st.shufTs = shufTs;
      const spacing = (c) => { const m = c.round ? c.round.cards.length : 1; return m > 1 ? Math.min(st.SP, (1300 - st.LX0 - 120) / (m - 1)) : st.SP; };
      cards.forEach((c) => {
        if (c.kind === 'deal') c.lx = st.LX0 + 60 + c.k * spacing(c);
        c.land = c.kind === 'burst' ? c.emit + 0.3 : c.discT != null ? c.discT + 0.4 : null;
      });
      st.pileH = (t) => { let n = 6; for (const c of cards) if (c.land != null && c.land <= t && (c.retT == null || t < c.retT)) n++; return Math.min(n, 140); };
      cards.forEach((c) => {
        if (c.retT == null) return;
        const inPile = c.land != null && c.land <= c.shufBase + 0.0001;
        const flying = c.land != null && !inPile;
        c.retFrom = inPile || flying ? [PX, st.PY - st.pileH(c.shufBase - 1e-4) + 84, false] : [c.lx, LANE_Y, true];
      });

      /* ---- décor ---- */
      rect(root, 0, 0, 1920, 1080, 0, C.ink);
      const bgs = g(root, { transform: 'rotate(-18 960 540)' });
      for (let k = -4; k <= 4; k++) rect(bgs, 960 + k * 300 - 60, -600, 120, 2300, 0, C.pocket);
      const B = g(root);
      st.laneG = g(B);
      rect(st.laneG, st.LX0 - 24, 290, 1324 - st.LX0 + 24, 192, 18, C.pocket, SH, 4);

      /* sabot */
      st.shoeG = g(B);
      const sg = st.shoeG;
      st.shP1 = path(sg, 'M0 0', SH); st.shP1.setAttribute('transform', 'translate(10 10)');
      st.shP2 = path(sg, 'M0 0', C.ink, C.paper, 8);
      st.win = rect(sg, 128, 352, 300, 188, 6, C.pocket, C.paper, 4);
      st.bands = [];
      const NB = decks + st.EXTN;
      for (let i = 0; i < NB; i++) st.bands.push(rect(sg, 0, 384, 10, 146, 2, C.paper, C.ink, 3));
      st.cut = rect(sg, 0, 366, 12, 164, 2, C.red, C.ink, 3);
      st.slot = rect(sg, 0, 266, 34, 48, 4, C.ink, C.paper, 5);
      st.shLab = null;
      if (!rules) {
        st.shLab = mlab(sg, `${decks} PAQUETS · SANS REMISE`, 100, 226, 24, C.paper);
      }
      st.mixTag = mkTag(B, 'MÉLANGE', 40, C.paper, C.ink, { sh: 8 });
      st.decksTag = mkTag(B, 'PLUS DE PAQUETS', 40, C.lime, C.ink, { sh: 8 });
      st.cutTag = mkTag(B, 'MÉLANGE PLUS TÔT', 36, C.paper, C.ink, { sh: 8 });
      st.cutArrow = g(B);
      st.cutArr = path(st.cutArrow, 'M0 0', C.red, C.ink, 3);
      st.memTag = mkTag(B, 'LE SABOT, LUI, SE SOUVIENT', 40, C.lime, C.ink, { sh: 9 });

      /* défausse */
      st.disG = g(B);
      st.dBody = rect(st.disG, PX - 52, 0, 120, 10, 12, SH);
      st.dMain = rect(st.disG, PX - 60, 0, 120, 10, 12, C.pocket, C.paper, 5);
      st.dTop = rect(st.disG, PX - 60, 0, 120, 168, 12, C.pocket, C.paper, 5);
      st.dIn = rect(st.disG, PX - 46, 0, 92, 140, 6, 'none', C.paper, 2);
      st.dZero = text(st.disG, '0', PX, 0, 84, C.lime, { anchor: 'middle', len: f2(bw('0', 84)) });
      mlab(st.disG, 'DÉFAUSSE', PX, st.PY + 168 + 44, 26, C.paper, 'middle');
      st.discTag = mkTag(B, ['NE REVIENT PAS', 'AVANT LE MÉLANGE'], 34, C.paper, C.ink, { sh: 8 });

      /* jauge */
      st.gG = g(B);
      mlab(st.gG, 'CE QUI RESTE DANS LE SABOT', GX0, 650, 26, C.paper);
      const segs = [[C.paper, C.ink], [C.pocket, C.paper], [C.lime, C.ink]];
      st.ghost = [0, 1].map(() => line(st.gG, 0, 658, 0, 760, C.paper, 3, { 'stroke-dasharray': '6 6', 'stroke-linecap': 'butt' }));
      st.gSh = rect(st.gG, GX0 + 9, GY + 9, GW, GH, 4, SH);
      st.seg = segs.map((s) => rect(st.gG, GX0, GY, 10, GH, 2, s[0], s[1], 4));
      const legs = ['PETITES · 2 À 6', 'MOYENNES · 7 À 9', 'FIGURES ET AS'];
      st.leg = legs.map((s) => mlab(st.gG, s, 0, 784, 22, C.paper, 'middle'));
      st.richLab = text(st.gG, '', 0, GY + 53, 32, C.ink, { anchor: 'middle' });
      st.richLab.__s = '';
      st.sliceMini = rect(st.gG, GX0 - 2, GY - 6, 24, GH + 12, 3, 'none', C.lime, 4);
      // cartouche de la bille
      st.memG = g(B);
      rect(st.memG, 40, 650, 300, 134, 12, SH);
      rect(st.memG, 30, 640, 300, 134, 12, C.pocket, C.paper, 5);
      circle(st.memG, 74, 707, 24, C.white, C.ink, 5);
      circle(st.memG, 66, 699, 7, C.paper);
      {
        const i = bubble.indexOf(' : ');
        const ls = i > 0 ? [bubble.slice(0, i + 2), bubble.slice(i + 3)] : [bubble];
        ls.forEach((s, k) => text(st.memG, s, 116, 700 + k * 36, 24, C.paper, { mono: true, len: f2(Math.min(mw(s, 24), 200)) }));
      }

      /* count : jetons, gadgets, tranche */
      st.chG = g(B);
      st.chips = [];
      for (let k = 0; k < 10; k++) {
        const c = g(st.chG);
        rect(c, -50, -(k + 1) * 22, 100, 22, 3, C.lime, C.ink, 3.5);
        for (let q = -1; q <= 1; q++) rect(c, q * 30 - 10, -(k + 1) * 22 + 5, 20, 12, 2, C.ink);
        st.chips.push(c);
      }
      rect(st.chG, -58, 0, 116, 8, 2, SH);
      st.chLab = text(B, '', 1336, 318, 26, C.paper, { mono: true });
      st.chLab.__s = '';
      st.gad = g(B);
      st.gadI = [pictoEye, pictoEar, pictoBox].map((fn, i) => { const p = g(st.gad); fn(p); const s = line(p, -46, 46, 46, -46, C.red, 8); return { p, s, x: 1520 + i * 120 }; });
      mlab(st.gad, 'PAS DE GADGET', 1640, 246, 26, C.paper, 'middle');
      st.slice = g(B);
      rect(st.slice, 0, 0, 22, 30, 2, C.lime, C.ink, 3);
      st.sliceT = text(B, edgeTxt, 1400, 616, 44, C.lime, { len: f2(bw(edgeTxt, 44)) });
      const kick = 'BIEN FAIT, AVEC BEAUCOUP D\'ARGENT DERRIÈRE';
      st.kick = mlab(B, kick, 1870, 652, 22, C.paper, 'end');

      /* rules : feuille */
      st.sheetLab = mlab(B, 'RÈGLES MODIFIÉES', 1360, 82, 26, C.paper);
      st.sheet = g(B);
      rect(st.sheet, 1370, 106, 480, 208, 6, SH);
      rect(st.sheet, 1360, 96, 480, 208, 6, C.paper, C.ink, 6);
      text(st.sheet, 'RÈGLES', 1396, 148, 44, C.ink, { len: f2(bw('RÈGLES', 44)) });
      st.rl = [0, 1, 2].map((i) => {
        const y = 172 + i * 44, w = [300, 360, 250][i];
        rect(st.sheet, 1396, y, w, 14, 4, C.ink);
        const strike = rect(st.sheet, 1390, y + 4, w + 12, 6, 2, C.red);
        const nw = [220, 0, 330][i];
        const nb = nw ? rect(st.sheet, 1396, y + 18, nw, 14, 4, C.lime, C.ink, 3) : null;
        return { strike, nb, w, y, fix: i !== 1 };
      });

      /* voiles / cadre / panneau edge */
      st.veilS = rect(root, 0, 0, 1920, 1080, 0, C.ink);
      st.cardsG = g(root);
      st.clipR = rect(sv('clipPath', { id: uid + 'k' }, sv('defs', null, root)), 0, 0, 1920, 1080, 0, '#000');
      st.cardsG.setAttribute('clip-path', `url(#${uid}k)`);
      st.cn = cards.map((c) => { const n = mkCard(st.cardsG, c.rank, c.suit); n.g.setAttribute('display', 'none'); return n; });
      st.veilE = rect(root, 0, 0, 1920, 1080, 0, C.ink);
      st.eP = g(root);
      rect(st.eP, 700, 130, 650, 520, 12, SH);
      rect(st.eP, 690, 120, 650, 520, 12, C.pocket, C.paper, 6);
      st.eCap = mkTag(st.eP, 'L\'AVANTAGE D\'USTON FOND', 36, C.paper, C.ink, { sh: 8 });
      st.eCap.g.setAttribute('transform', 'translate(1015 196)');
      rect(st.eP, 730, 462, 570, 8, 2, C.paper);
      mlab(st.eP, 'AVANTAGE JOUEUR', 730, 440, 22, C.paper);
      mlab(st.eP, 'AVANTAGE MAISON', 730, 510, 22, C.red);
      st.eUp = rect(st.eP, 955, 462, 120, 10, 3, C.lime, C.ink, 4);
      st.eDn = rect(st.eP, 955, 470, 120, 10, 3, C.red, C.ink, 4);
      st.eTxt = text(st.eP, edgeTxt, 1105, 400, 60, C.lime, { len: f2(bw(edgeTxt, 60)) });
      st.eKick = null;
      st.sameO = g(root);
      st.sameFrame = rect(st.sameO, 0, 0, 10, 10, 18, 'none', C.paper, 8);
      st.sameTag = mkTag(st.sameO, 'VU DE LA TABLE : LE MÊME JEU', 40, C.paper, C.ink, { sh: 8 });
      PROBE.parentNode.removeChild(PROBE); PROBE = null;
      return st;
    },

    update(st, t) {
      try {
        t = clamp(t, 0, st.dur + 1);
        const T = st.T, rules = st.rules, mode = st.mode, decks = st.decks;
        const nc = st.noCue;
        const pS = T.shoe == null ? 1 : E.out3(prog(t, T.shoe, T.shoe + 0.55));
        const pPop = T.shoe == null ? 1 : popS(t, T.shoe, 0.35);

        /* consommation du sabot (par catégorie) */
        const cons = (tt) => {
          let k = -1;
          for (let i = 0; i < st.shufTs.length; i++) if (st.shufTs[i] <= tt) k = i;
          const from = k >= 0 ? st.shufTs[k] : -1e9;
          const v = [0, 0, 0];
          for (const c of st.cards) if (c.emit >= from && c.emit <= tt + 0.0001) v[c.cat] += E.out2(prog(tt, c.emit, c.emit + 0.2));
          if (k >= 0) {
            const w = 1 - E.io2(prog(tt, st.shufTs[k], st.shufTs[k] + 0.6));
            if (w > 0) { const pv = cons(st.shufTs[k] - 1e-4); for (let j = 0; j < 3; j++) v[j] += pv[j] * w; }
          }
          return v;
        };
        const v = cons(t);
        const consumed = v[0] + v[1] + v[2];

        /* extension du sabot (rules) */
        const ext = rules && T.decks != null ? Math.min(st.EXTN, Math.max(0, (t - T.decks) / 0.25)) : 0;
        const bw0 = st.bandW;
        const xr = 212 + (decks + ext) * bw0;
        const totalW = (decks + ext) * bw0;
        const effW = Math.max(0, totalW - consumed * bw0 / 52);
        const d1 = `M100 560 L100 340 L${f2(xr - 110)} 262 L${f2(xr)} 262 L${f2(xr)} 560 Z`;
        setA(st.shP1, 'd', d1); setA(st.shP2, 'd', d1);
        setA(st.win, 'width', f2(xr - 66 - 128));
        setA(st.slot, 'x', f2(xr - 24));
        st.bands.forEach((b, i) => {
          const w = clamp(effW - i * bw0, 0, bw0);
          if (w < 7) { vis(b, false); return; }
          vis(b, true); setA(b, 'x', f2(140 + i * bw0 + 2)); setA(b, 'width', f2(w - 4));
        });
        // carte de coupe
        let cutFrac = 0.25;
        if (rules && T.cut != null) cutFrac = lerp(0.25, 0.7, E.io3(prog(t, T.cut, T.cut + 0.8)));
        let lift = 0;
        for (const ts of st.shufTs) lift = Math.max(lift, 92 * E.out2(prog(t, ts, ts + 0.25)) * (1 - E.in2(prog(t, ts + 0.6, ts + 0.9))));
        const cutX = Math.min(140 + cutFrac * totalW, 140 + effW - 8);
        vis(st.cut, effW > 40);
        setA(st.cut, 'x', f2(cutX - 6));
        setA(st.cut, 'transform', `translate(0 ${f2(-lift)})`);

        /* groupes de gauche */
        setA(st.shoeG, 'transform', `translate(${f2(-(1 - pS) * 640)} 0)`);
        vis(st.shoeG, pS > 0.001);
        putc(st.laneG, 0, 0, 0, 1, 1, pS > 0.001 ? 1 : 0);
        if (st.shLab) {
          // étiquette « 6 PAQUETS · SANS REMISE » : posée avec le sabot
          vis(st.shLab, T.shoe == null ? true : pS > 0.3);
        }
        // stickers d'étiquette
        putc(st.memTag.g, 480, 150, -2, popS(t, T.memory), popS(t, T.memory), T.memory != null && t >= T.memory ? 1 : 0);
        putc(st.discTag.g, 1610, 170, 2, popS(t, T.discard), popS(t, T.discard), T.discard != null && t >= T.discard ? 1 : 0);
        const tMix = st.shufTs.length ? Math.max.apply(null, st.shufTs.filter((x) => x <= t).concat([-1])) : -1;
        const mixOn = T.shuffle != null && t >= T.shuffle;
        putc(st.mixTag.g, 720, 240, -3, mixOn ? popS(t, T.shuffle) : 0, mixOn ? popS(t, T.shuffle) : 0, mixOn ? 1 : 0);
        const tagOn = !(T.same != null && t >= T.same);
        putc(st.decksTag.g, 480, 206, -2, popS(t, T.decks), popS(t, T.decks), T.decks != null && t >= T.decks && tagOn ? 1 : 0);
        putc(st.cutTag.g, 300, 612, -2, popS(t, T.cut), popS(t, T.cut), T.cut != null && t >= T.cut && tagOn ? 1 : 0);
        // flèche rouge de la coupe
        if (T.cut != null && t >= T.cut) {
          const x0 = 140 + 0.25 * totalW, x1 = 140 + cutFrac * totalW;
          const L = Math.max(0, x1 - x0) * E.out2(prog(t, T.cut, T.cut + 0.5));
          vis(st.cutArrow, L > 4);
          if (L > 4) setA(st.cutArr, 'd', `M${f2(x0)} 320 H${f2(x0 + L - 22)} V308 L${f2(x0 + L + 8)} 326 L${f2(x0 + L - 22)} 344 V332 H${f2(x0)} Z`);
        } else vis(st.cutArrow, false);

        /* défausse : (rules) elle reste, la feuille est au-dessus */
        const h = st.pileH(t);
        const topY = st.PY - h;
        setA(st.disG, 'transform', `translate(${f2((1 - pS) * 520)} 0)`); vis(st.disG, pS > 0.001);
        setA(st.dBody, 'y', f2(topY + 8)); setA(st.dBody, 'height', f2(168 + h));
        setA(st.dMain, 'y', f2(topY)); setA(st.dMain, 'height', f2(168 + h));
        setA(st.dTop, 'y', f2(topY)); setA(st.dIn, 'y', f2(topY + 14));
        setA(st.dZero, 'y', f2(topY + 110));

        /* cartes */
        for (let i = 0; i < st.cards.length; i++) {
          const c = st.cards[i], n = st.cn[i];
          const s = cardSt(st, c, t, h, xr);
          if (!s) { vis(n.g, false); continue; }
          const pop = c.base ? pPop : 1;
          if (pop <= 0.001) { vis(n.g, false); continue; }
          putc(n.g, s.x, s.y, s.rot || 0, (s.sx === undefined ? 1 : s.sx) * pop, pop, 1);
          vis(n.face, s.face); vis(n.back, !s.face);
        }
        setA(st.clipR, 'x', f2(xr)); setA(st.clipR, 'width', f2(1920 - xr));

        /* jauge */
        const tG = [T.meter, T.rich, T.poor].filter((x) => x != null);
        const tGauge = tG.length ? Math.min.apply(null, tG) : null;
        const gp = tGauge == null ? (nc ? 1 : 0) : E.out3(prog(t, tGauge, tGauge + 0.4));
        if (rules) { vis(st.gG, false); vis(st.memG, false); } else {
          putc(st.gG, 0, (1 - gp) * 40, 0, 1, 1, gp);
          const rem = [Math.max(1, 20 * decks - v[0]), Math.max(1, 12 * decks - v[1]), Math.max(1, 20 * decks - v[2])];
          const sum = rem[0] + rem[1] + rem[2];
          let fr = [rem[0] / sum, rem[1] / sum, rem[2] / sum];
          const f0 = [20 / 52, 12 / 52, 20 / 52];
          // basculement riche / pauvre (mode count)
          let rich = 0, ovp = 0, richLabel = '';
          if (mode === 'count') {
            const sw = [];
            cbsOf(st, 'rich').forEach((x) => sw.push({ t: x, to: 1 }));
            cbsOf(st, 'poor').forEach((x) => sw.push({ t: x, to: 0 }));
            sw.sort((a, b) => a.t - b.t);
            if (sw.length) {
              ovp = E.io2(prog(t, sw[0].t, sw[0].t + 0.6));
              let val = sw[0].to; let prev = sw[0].to;
              for (let i = 0; i < sw.length; i++) {
                if (t < sw[i].t) break;
                const from = i === 0 ? sw[0].to : sw[i - 1].to;
                val = i === 0 ? sw[0].to : lerp(from, sw[i].to, E.io2(prog(t, sw[i].t, sw[i].t + 0.6)));
                prev = sw[i].to;
                richLabel = prev ? 'RICHE EN FIGURES' : 'PAUVRE EN FIGURES';
              }
              if (t >= sw[0].t) {
                rich = val;
                const tgt = lerp(0.25, 0.5, rich);
                const nat = fr[2];
                const fg = lerp(nat, tgt, ovp);
                const ratio = fr[0] / (fr[0] + fr[1]);
                fr = [(1 - fg) * ratio, (1 - fg) * (1 - ratio), fg];
              }
            }
          }
          let x = GX0;
          const mids = [];
          for (let i = 0; i < 3; i++) {
            const w = fr[i] * GW;
            setA(st.seg[i], 'x', f2(x)); setA(st.seg[i], 'width', f2(w));
            mids.push(x + w / 2); x += w;
          }
          st.leg.forEach((l, i) => setA(l, 'x', f2(mids[i])));
          const g0 = [f0[0] * GW + GX0, (f0[0] + f0[1]) * GW + GX0];
          st.ghost.forEach((l, i) => { setA(l, 'x1', f2(g0[i])); setA(l, 'x2', f2(g0[i])); });
          // étiquette riche / pauvre dans le tronçon lime
          if (richLabel) {
            const wseg = fr[2] * GW;
            if (st.richLab.__s !== richLabel) { st.richLab.__s = richLabel; st.richLab.textContent = richLabel; }
            const len = Math.min(bw(richLabel, 32), wseg - 34);
            setA(st.richLab, 'textLength', f2(len)); setA(st.richLab, 'lengthAdjust', 'spacingAndGlyphs');
            setA(st.richLab, 'x', f2(mids[2])); vis(st.richLab, true);
          } else vis(st.richLab, false);
          vis(st.sliceMini, mode === 'count' && T.edge != null && t >= T.edge);
          // cartouche bille
          const mp = popS(t, T.memory);
          putc(st.memG, 0, 0, 0, 1, 1, T.memory != null && t >= T.memory ? Math.min(1, mp) : 0);
          setA(st.memG, 'transform', `translate(0 ${f2((1 - Math.min(1, mp)) * 30)})`);

          // jetons
          if (mode === 'count') {
            const sw2 = [];
            cbsOf(st, 'rich').forEach((x) => sw2.push({ t: x, to: 1 }));
            cbsOf(st, 'poor').forEach((x) => sw2.push({ t: x, to: 0 }));
            sw2.sort((a, b) => a.t - b.t);
            if (sw2.length && t >= sw2[0].t - 0.001) {
              let cnt = 1; let lab = '';
              for (let i = 0; i < sw2.length; i++) {
                if (t < sw2[i].t) break;
                const base = i === 0 ? 0 : sw2[i - 1].to;
                const a = i === 0 ? 1 : lerp(1, 10, base), b = lerp(1, 10, sw2[i].to);
                const sp = sw2[i].to ? 0.7 : 0.5;
                cnt = lerp(a, b, E.out2(prog(t, sw2[i].t, sw2[i].t + sp)));
                lab = sw2[i].to ? 'MISE GROSSE' : 'MISE PETITE';
              }
              vis(st.chG, true);
              setA(st.chG, 'transform', 'translate(1372 560)');
              st.chips.forEach((c, k) => { const s = clamp(cnt - k); if (s <= 0.01) vis(c, false); else { vis(c, true); setA(c, 'transform', `translate(0 0) scale(1 ${f2(s)})`); } });
              if (st.chLab.__s !== lab) { st.chLab.__s = lab; st.chLab.textContent = lab; setA(st.chLab, 'textLength', f2(mw(lab, 26))); }
              setA(st.chLab, 'y', f2(Math.max(318, 560 - cnt * 22 - 22)));
              vis(st.chLab, true);
            } else { vis(st.chG, false); vis(st.chLab, false); }
          } else { vis(st.chG, false); vis(st.chLab, false); }
        }
        if (mode !== 'count') { vis(st.gad, false); vis(st.slice, false); vis(st.sliceT, false); vis(st.kick, false); }
        else {
          // pas de gadget
          const ng = T['no-gadget'];
          vis(st.gad, ng != null && t >= ng);
          if (ng != null && t >= ng) {
            st.gadI.forEach((it, i) => {
              const s = popS(t, ng + i * 0.18, 0.3);
              putc(it.p, it.x, 150, 0, s * 1.2, s * 1.2, s > 0 ? 1 : 0);
              const q = prog(t, ng + 0.5 + i * 0.18, ng + 0.7 + i * 0.18);
              setA(it.s, 'x2', f2(lerp(-46, 46, q))); setA(it.s, 'y2', f2(lerp(46, -46, q)));
              vis(it.s, q > 0);
            });
          }
          // tranche 1 à 2 %
          const te = T.edge;
          const on = te != null && t >= te;
          vis(st.slice, on); vis(st.sliceT, on); vis(st.kick, on);
          if (on) {
            const q = E.out3(prog(t, te, te + 0.5));
            setA(st.slice, 'transform', `translate(1361 ${f2(lerp(552, 588, q))})`);
            setA(st.sliceT, 'opacity', f2(prog(t, te + 0.3, te + 0.5)));
            setA(st.kick, 'opacity', f2(prog(t, te + 0.7, te + 0.9)));
          }
        }
        if (mode === 'count') { /* sticker mémoire non utilisé */ }

        /* rules : feuille */
        const tr = T.rules;
        if (rules && tr != null && t >= tr) {
          const q = E.back(prog(t, tr, tr + 0.5));
          setA(st.sheet, 'transform', `translate(0 ${f2(-(1 - q) * 360)})`); vis(st.sheet, true);
          setA(st.sheetLab, 'opacity', f2(prog(t, tr + 0.3, tr + 0.5))); vis(st.sheetLab, true);
          st.rl.forEach((r, i) => {
            const t1 = tr + 0.7 + i * 0.35;
            const q1 = prog(t, t1, t1 + 0.25);
            const hasFix = r.fix;
            vis(r.strike, hasFix && q1 > 0);
            if (hasFix) setA(r.strike, 'width', f2((r.w + 12) * q1));
            if (r.nb) { const q2 = prog(t, t1 + 0.3, t1 + 0.55); vis(r.nb, q2 > 0); setA(r.nb, 'width', f2(Math.max(1, (i === 0 ? 220 : 330) * q2))); }
          });
        } else { vis(st.sheet, false); vis(st.sheetLab, false); }

        /* same / edge */
        const tS = T.same;
        const sameOn = rules && tS != null && t >= tS;
        const tE = T.edge;
        const edgeOn = rules && tE != null && t >= tE && !(tS != null && t >= tS);
        setA(st.veilS, 'opacity', f2(sameOn ? 0.62 * prog(t, tS, tS + 0.25) : 0)); vis(st.veilS, sameOn);
        vis(st.sameO, sameOn);
        if (sameOn) {
          const x0 = st.LX0 - 28;
          setA(st.sameFrame, 'x', x0); setA(st.sameFrame, 'y', 280); setA(st.sameFrame, 'width', 1328 - x0); setA(st.sameFrame, 'height', 212);
          const p = popS(t, tS + 0.1);
          putc(st.sameTag.g, rules ? 979 : 960, 215, -1.5, p, p, 1);
        }
        setA(st.veilE, 'opacity', f2(edgeOn ? 0.62 * prog(t, tE, tE + 0.25) : 0)); vis(st.veilE, edgeOn);
        vis(st.eP, edgeOn);
        if (edgeOn) {
          const q = E.out3(prog(t, tE, tE + 0.35));
          setA(st.eP, 'transform', `translate(0 ${f2((1 - q) * 40)})`);
          const melt = E.io2(prog(t, tE + 0.3, tE + 1.8));
          const hu = 220 * (1 - melt);
          vis(st.eUp, hu > 3); setA(st.eUp, 'y', f2(462 - hu)); setA(st.eUp, 'height', f2(Math.max(1, hu)));
          setA(st.eTxt, 'y', f2(462 - hu * 0.5 + 24)); setA(st.eTxt, 'opacity', f2(clamp(hu / 100)));
          vis(st.eTxt, hu > 6);
          const hd = 74 * E.back(prog(t, tE + 1.8, tE + 2.25));
          vis(st.eDn, hd > 3); setA(st.eDn, 'height', f2(Math.max(1, hd)));
        }
      } catch (e) { /* jamais d'exception */ }
    }
  });

  function cbsOf(st, name) {
    if (!st.__cb) st.__cb = {};
    if (!st.__cb[name]) st.__cb[name] = st.__beats(name);
    return st.__cb[name];
  }

  // état d'une carte à l'instant t (null = invisible)
  function cardSt(st, c, t, h, xr) {
    if (t < c.emit) return null;
    const sx0 = xr - 40, sy0 = 330;
    const px = PX, py = st.PY - h + 84;
    if (c.retT != null && t >= c.retT) {
      const p = prog(t, c.retT, c.retT + 0.25);
      if (p >= 1) return null;
      const e = E.in2(p), fr = c.retFrom || [px, py, false];
      return { x: lerp(fr[0], sx0, e), y: lerp(fr[1], sy0, e), sx: 1 - 0.3 * e, rot: -10 * e, face: fr[2] };
    }
    if (c.kind === 'burst') {
      const p = prog(t, c.emit, c.emit + 0.3);
      if (p >= 1) return null;
      const e = E.io2(p);
      return { x: lerp(sx0, px, e), y: lerp(sy0, py, e) - 50 * Math.sin(Math.PI * p), rot: 12 * p, face: true };
    }
    if (c.discT != null && t >= c.discT) {
      const p = prog(t, c.discT, c.discT + 0.4);
      if (p >= 1) return null;
      const e = E.io2(p), q = clamp(p / 0.45);
      return { x: lerp(c.lx, px, e), y: lerp(LANE_Y, py, e) - 40 * Math.sin(Math.PI * p), sx: Math.max(Math.abs(1 - 2 * q), 0.04), rot: 6 * p, face: q < 0.5 };
    }
    const p = prog(t, c.emit, c.emit + 0.3333);
    const e = E.out3(p), q = clamp((p - 0.2) / 0.6);
    return { x: lerp(sx0, c.lx, e), y: lerp(sy0, LANE_Y, e), sx: Math.max(Math.abs(1 - 2 * q), 0.04), face: q >= 0.5 };
  }
  // rattache la lecture des cues à l'état (init n'a pas accès direct depuis update)
  const _init = ZV.REG['card-shoe'].init;
  ZV.REG['card-shoe'].init = function (root, shot) {
    const st = _init.call(this, root, shot);
    const beats = Array.isArray(shot && shot.beats) ? shot.beats : [];
    st.__beats = (n) => beats.filter((b) => b && b.do === 'cue' && b.name === n && isNum(b.t)).map((b) => b.t).sort((a, b) => a - b);
    return st;
  };
})();
