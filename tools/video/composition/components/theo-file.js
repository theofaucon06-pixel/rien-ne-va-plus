// Composant `theo-file` (épisode 7) : la perte théorique (le « théo ») et la valeur à vie. Voir EP7-COMPONENTS.md.
// Mode `formula` : 4 tuiles (mise × tours × avantage = théo) puis UN panneau à la fois (tonight, card, free, comps, barman).
// Mode `lifetime` : 52 vendredis, compteur, escalade. Cues formula : formula, bet, rounds, edge, theo, tonight, card, free, comps, barman.
// Cues lifetime : one, year, total, easier, escalade. Fonction pure du temps ; aplats, aucun dégradé / flou / filter.
(() => {
  'use strict';
  const { C, E, clamp, prog, f2, sv, g, rect, circle, path, line, text, rng, shakeAt } = ZV;
  let UID = 0;
  const NB = ' ', NNB = ' ';
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const str = (v, d) => (typeof v === 'string' ? v : v == null ? d : String(v));
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const vis = (n, on) => setA(n, 'visibility', on ? 'visible' : 'hidden');
  const BW = { '0': .67, '1': .36, '2': .61, '3': .61, '4': .64, '5': .62, '6': .66, '7': .52, '8': .66, '9': .66, A: .71, B: .69, C: .69, D: .71, E: .63, F: .6, G: .73, H: .73, I: .3, J: .38, K: .7, L: .51, M: .96, N: .79, O: .73, P: .65, Q: .73, R: .69, S: .66, T: .58, U: .73, V: .68, W: 1, X: .72, Y: .66, Z: .58, 'À': .71, 'Â': .71, 'É': .63, 'È': .63, 'Ê': .63, 'Ë': .63, 'Î': .3, 'Ï': .3, 'Ô': .73, 'Û': .73, 'Ù': .73, 'Ç': .69, 'Œ': 1, ' ': .22, ' ': .22, ' ': .22, ',': .21, '.': .25, ':': .26, ';': .24, "'": .19, '’': .22, '!': .3, '?': .43, '|': .28, '%': .99, '€': .75, '≈': .55, '×': .53, '−': .53, '+': .53, '→': 1, '·': .25, '(': .33, ')': .33, '-': .36, '/': .37, '"': .38, '–': .55 };
  const bw = (s, z) => { let a = 0; for (const ch of String(s)) { const w = BW[ch]; a += z * (w !== undefined ? w : ch >= 'a' && ch <= 'z' ? 0.6 : 0.7); } return a; };
  const mw = (s, z) => Array.from(String(s)).length * z * 0.6;
  const fitSize = (s, z, maxW) => Math.min(z, z * maxW / Math.max(1, bw(s, z)));
  const fitMono = (s, z, maxW) => Math.min(z, z * maxW / Math.max(1, mw(s, z)));
  const BT = (p, s, x, y, z, fill, o) => text(p, s, x, y, z, fill, Object.assign({ len: f2(bw(s, z)) }, o || {}));
  const MT = (p, s, x, y, z, fill, o) => text(p, s, x, y, z, fill, Object.assign({ mono: true, len: f2(mw(s, z)) }, o || {}));
  function TY(parent, s, x, y, z, fill, o) {                                    // texte « machine à écrire » : textLength fixe + clipPath (ancre à gauche)
    o = o || {};
    const chars = Array.from(s), w = o.mono ? mw(s, z) : bw(s, z);
    const grp = g(parent), id = 'tf' + (++UID) + 'c';
    const cr = sv('rect', { x: x - 6, y: y - z * 1.05, width: 0, height: z * 1.45 }, sv('clipPath', { id }, grp));
    const tn = text(grp, s, x, y, z, fill, { mono: o.mono, len: f2(Math.max(1, w)) });
    tn.setAttribute('clip-path', `url(#${id})`);
    const cum = [0]; let a = 0;
    for (const ch of chars) { a += o.mono ? z * 0.6 : bw(ch, z); cum.push(a); }
    const k = w / Math.max(a, 1); for (let i = 0; i < cum.length; i++) cum[i] *= k;
    return { g: grp, tn, cr, cum, n: chars.length, w };
  }
  const tyShow = (o, n) => { n = clamp(Math.floor(n), 0, o.n); setA(o.cr, 'width', n === 0 ? 0 : f2(o.cum[n] + (n >= o.n ? 14 : 4))); };
  const pop = (t, t0, d) => (t < t0 ? 0 : E.back(prog(t, t0, t0 + (d || 0.25))));
  const sc = (s) => Math.max(0.001, s);
  const shadowRect = (p, x, y, w, h, r, d, col) => rect(p, x + d, y + d, w, h, r, col || C.ink);

  /* ---- pictos plats (centrés sur 0,0, ±75) : verre, assiette, clé, carte ---- */
  const PIC = {
    glass: [['p', 'M -44 -66 L 44 -66 Q 44 2 0 12 Q -44 2 -44 -66 Z', C.white], ['p', 'M -38 -34 L 38 -34 Q 35 -5 0 5 Q -35 -5 -38 -34 Z', C.lime, 0], ['r', -5, 10, 10, 46, 0, C.ink], ['r', -38, 54, 76, 14, 7, C.ink]],
    plate: [['c', 0, 4, 46, C.white], ['c', 0, 4, 28, C.paper], ['r', -76, -58, 22, 40, 6, C.white], ['r', -70, -22, 10, 74, 5, C.white], ['p', 'M 60 -58 Q 76 -40 72 -14 L 72 -10 L 60 -10 Z', C.white], ['r', 60, -14, 12, 66, 5, C.white]],
    key: [['c', -34, -10, 32, C.white], ['c', -34, -10, 11, C.ink, 0], ['r', -4, -19, 76, 17, 4, C.white], ['r', 40, -4, 12, 24, 2, C.white], ['r', 22, -4, 10, 15, 2, C.white], ['r', -62, 28, 56, 40, 8, C.red], ['c', -34, 40, 6, C.paper, 0]],
    card: [['r', -70, -46, 140, 92, 12, C.white], ['r', -70, -28, 140, 22, 0, C.ink, 0], ['r', -56, 10, 32, 24, 5, C.lime], ['r', -12, 14, 54, 7, 3, C.ink, 0], ['r', -12, 28, 36, 7, 3, C.ink, 0]]
  };
  function picto(parent, kind, shadow) {
    const grp = g(parent), spec = PIC[kind] || PIC.card;
    const BASE = { p: 3, r: 7, c: 5 };
    const draw = (gr, sh) => {
      for (const s of spec) {
        const base = BASE[s[0]], noStroke = s.length > base && s[base] === 0;
        const fill = sh ? C.ink : s[base - 1], stroke = sh || !noStroke ? C.ink : null;
        if (s[0] === 'p') path(gr, s[1], fill, stroke, 6);
        else if (s[0] === 'r') rect(gr, s[1], s[2], s[3], s[4], s[5], fill, stroke, 6);
        else circle(gr, s[1], s[2], s[3], fill, stroke, 6);
      }
    };
    if (shadow !== false) draw(g(grp, { transform: 'translate(8 8)' }), true);
    draw(g(grp), false);
    return grp;
  }

  ZV.define('theo-file', {
    init(root, shot) {
      const P = shot.props || {};
      const beats = Array.isArray(shot.beats) ? shot.beats : [];
      const dur = isNum(shot.dur) && shot.dur > 0 ? shot.dur : 20;
      const cl = (n) => beats.filter((b) => b && b.do === 'cue' && b.name === n && isNum(b.t)).map((b) => b.t).sort((a, b) => a - b);
      const FNAMES = ['formula', 'bet', 'rounds', 'edge', 'theo', 'tonight', 'card', 'free', 'comps', 'barman'];
      const LNAMES = ['one', 'year', 'total', 'easier', 'escalade'];
      const hasF = FNAMES.some((n) => cl(n).length), hasL = LNAMES.some((n) => cl(n).length);
      const lifeProps = ['nights', 'theo_night', 'steps', 'first', 'you'].some((k) => P[k] != null);
      const life = P.mode === 'lifetime' || (P.mode !== 'formula' && (hasL && !hasF || (!hasF && !hasL && lifeProps)));
      const st = { life, dur, uid: 'tf' + (++UID) };

      /* ---- fond paper, trame ink très légère ---- */
      rect(root, 0, 0, 1920, 1080, 0, C.paper);
      const defs = sv('defs', null, root);
      const pt = sv('pattern', { id: st.uid + 'h', width: 32, height: 32, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
      sv('rect', { x: 0, y: 0, width: 32, height: 32, fill: C.paper }, pt);
      sv('rect', { x: 0, y: 0, width: 4, height: 32, fill: '#E6E2D6' }, pt);
      rect(root, 0, 0, 1920, 1080, 0, `url(#${st.uid}h)`);
      return life ? buildLife(root, st, P, cl, dur, defs) : buildForm(root, st, P, cl, dur, defs);
    },
    update(st, t, shot) { return st.life ? updLife(st, t) : updForm(st, t); }
  });

  /* =========================================================== MODE FORMULA */
  function buildForm(root, st, P, cl, dur, defs) {
    const bet = str(P.bet, '10' + NB + '€'), rounds = str(P.rounds, '200'), edge = str(P.edge, '2,7' + NB + '%');
    const staked = str(P.staked, '2' + NNB + '000' + NB + '€' + NB + 'MISÉS'), theo = str(P.theo, '≈' + NB + '54' + NB + '€');
    const gifts = (Array.isArray(P.gifts) && P.gifts.length ? P.gifts : ['LE VERRE', 'LE REPAS', 'LA CHAMBRE', 'LE CRÉDIT']).slice(0, 6).map((x) => (typeof x === 'string' ? x : str(x && x.label, '')));
    st.gifts = gifts;
    /* repères */
    const cues = { formula: cl('formula')[0], bet: cl('bet')[0], rounds: cl('rounds')[0], edge: cl('edge')[0], theo: cl('theo')[0] };
    const ev = [];
    for (const n of ['tonight', 'card', 'free', 'comps', 'barman']) for (const t of cl(n)) ev.push({ t, id: n });
    ev.sort((a, b) => a.t - b.t);
    const any = ev.length || Object.values(cues).some((x) => x != null);
    if (!any) {
      const k = Math.min(1, dur / 24), at = (x) => x * k;
      Object.assign(cues, { formula: at(0.3), bet: at(1.3), rounds: at(2.2), edge: at(3.3), theo: at(4.4) });
      [['tonight', 6], ['card', 10], ['free', 14.5], ['comps', 18], ['barman', 22]].forEach(([id, x]) => ev.push({ t: at(x), id }));
    } else if (cues.formula == null) { cues.formula = -20; for (const n of ['bet', 'rounds', 'edge', 'theo']) if (cues[n] == null) cues[n] = -20; }
    st.cues = cues; st.ev = ev;

    /* tuiles */
    const TW = 340, TH = 230, TY0 = 130, GAP = (1920 - 160 - 4 * TW) / 3;
    const labs = ['MISE MOYENNE', 'NOMBRE DE TOURS', 'AVANTAGE DE LA MAISON', 'TON THÉO'], vals = [bet, rounds, edge, theo];
    const lz = Math.min(26, ...labs.map((l) => fitMono(l, 26, TW - 44)));
    st.tiles = [];
    for (let i = 0; i < 4; i++) {
      const x = 80 + i * (TW + GAP), cx = x + TW / 2, cy = TY0 + TH / 2;
      const tg = g(root); const o = { g: tg, x, cx, cy, i };
      shadowRect(tg, -TW / 2, -TH / 2, TW, TH, 10, 12);
      o.plate = rect(tg, -TW / 2, -TH / 2, TW, TH, 10, i === 3 ? C.red : C.paper, C.ink, 8);
      o.lab = MT(tg, labs[i], 0, -TH / 2 + 56, lz, i === 3 ? C.paper : C.ink, { anchor: 'middle' });
      const z = fitSize(vals[i], 96, TW - 44), w = bw(vals[i], z);
      o.vg = g(tg, { transform: `translate(0 ${f2(34)})` });
      o.val = TY(o.vg, vals[i], -w / 2, z * 0.35, z, i === 3 ? C.paper : C.ink);
      st.tiles.push(o);
    }
    st.GAP = GAP; st.TW = TW; st.TY0 = TY0; st.TH = TH;
    st.signs = ['×', '×', '='].map((s, i) => {
      const n = g(root);
      BT(n, s, 0, 120 * 0.35, 120, C.ink, { anchor: 'middle' });
      return { g: n, x: 80 + i * (TW + GAP) + TW + GAP / 2, y: TY0 + TH / 2 };
    });
    st.sub = g(root);
    {
      const lab = '= ' + staked, z = fitSize(lab, 36, 520), w = bw(lab, z) + 44, h = 54;
      shadowRect(st.sub, -w / 2, -h / 2, w, h, 10, 7);
      rect(st.sub, -w / 2, -h / 2, w, h, 10, C.paper, C.ink, 5);
      BT(st.sub, lab, 0, z * 0.35, z, C.ink, { anchor: 'middle' });
      st.subX = (80 + 80 + 2 * TW + GAP) / 2 + 0; st.subY = 394;
    }
    /* zone des panneaux */
    const slot = g(root, { 'clip-path': `url(#${st.uid}s)` });
    rect(sv('clipPath', { id: st.uid + 's' }, defs), 0, 428, 1920, 408, 0, '#000');
    st.P = {};
    st.P.tonight = pTonight(slot, st);
    st.P.card = pCard(slot, st, bet, rounds, theo);
    st.P.free = pFree(slot);
    st.P.comps = pComps(slot, st, theo, gifts);
    st.P.barman = pBarman(slot);
    return st;
  }

  function pTonight(parent, st) {
    const p = { g: g(parent) }, G = p.g, X0 = 210, X1 = 1710, AX = 560;
    p.l1 = MT(G, 'CE SOIR', X0, 472, 30, C.ink, { anchor: 'start' });
    p.axis = line(G, X0, AX, X1, AX, C.ink, 3, { 'stroke-dasharray': '14 12', 'stroke-linecap': 'butt' });
    p.plus = MT(G, '+', 160, AX - 52, 46, C.ink, { anchor: 'middle' });
    p.minus = MT(G, '−', 160, AX + 66, 46, C.ink, { anchor: 'middle' });
    const r = rng(1307); let d = '', s = 1;
    for (let i = 0; i <= 40; i++) {
      const x = X0 + (X1 - X0) * i / 40, a = i === 0 ? 0 : (22 + r() * 56) * s * (0.55 + 0.45 * Math.sin(i * 0.55));
      d += (i ? ' L ' : 'M ') + f2(x) + ' ' + f2(AX + a); s = -s;
    }
    p.trace = path(G, d, 'none', C.ink, 7, { pathLength: 1000, 'stroke-linejoin': 'round' });
    p.l2 = MT(G, 'TON THÉO', X0, 694, 30, C.ink, { anchor: 'start' });
    p.bar = rect(G, X0, 712, X1 - X0, 28, 0, C.red);
    p.stk = g(G);
    { const lab = 'NE BOUGE PAS', z = 30, w = mw(lab, z) + 36, h = 46; rect(p.stk, -w / 2, -h / 2, w, h, 8, C.ink); MT(p.stk, lab, 0, z * 0.33, z, C.paper, { anchor: 'middle' }); p.stkW = w; }
    p.lock = g(G);
    path(p.lock, 'M -17 -6 L -17 -22 Q -17 -42 0 -42 Q 17 -42 17 -22 L 17 -6', 'none', C.ink, 9);
    rect(p.lock, -28, -8, 56, 44, 6, C.ink); circle(p.lock, 0, 12, 6, C.paper);
    p.upd = (tau) => {
      vis(p.l1, tau >= 0); vis(p.axis, tau >= 0); vis(p.plus, tau >= 0.1); vis(p.minus, tau >= 0.1);
      const a = E.io2(prog(tau, 0.25, 1.7)); setA(p.trace, 'stroke-dasharray', `${f2(a * 1000)} 1100`); vis(p.trace, a > 0);
      vis(p.l2, tau >= 1.9);
      const b = E.out3(prog(tau, 1.9, 2.6)); setA(p.bar, 'width', f2(Math.max(0.01, 1500 * b))); vis(p.bar, b > 0);
      const k = pop(tau, 2.6, 0.3); setA(p.lock, 'transform', `translate(1768 726) scale(${f2(sc(k))})`); vis(p.lock, k > 0.001);
      const k2 = pop(tau, 2.9, 0.3); setA(p.stk, 'transform', `translate(${f2(1710 - p.stkW / 2)} 678) scale(${f2(sc(k2))})`); vis(p.stk, k2 > 0.001);
    };
    return p;
  }

  function pCard(parent, st, bet, rounds, theo) {
    const p = { g: g(parent) }, G = p.g;
    const nPts = Math.max(10, parseInt(String(rounds).replace(/\D/g, ''), 10) || 200);
    MT(G, 'TU CROIS CUMULER :', 70, 470, 28, C.ink, { anchor: 'start' });
    BT(G, 'DES POINTS', 70, 540, fitSize('DES POINTS', 64, 440), C.ink, { anchor: 'start' });
    p.left = g(G);
    shadowRect(p.left, 70, 580, 380, 84, 10, 8);
    rect(p.left, 70, 580, 380, 84, 10, C.white, C.ink, 6);
    p.cnt = MT(p.left, '0 PTS', 436, 636, 44, C.ink, { anchor: 'end' });
    p.nPts = nPts;
    /* lecteur + carte */
    p.card = g(G);
    rect(p.card, -125, 0, 250, 150, 14, C.white, C.ink, 6);
    rect(p.card, -122, 3, 244, 32, 11, C.lime);
    line(p.card, -122, 35, 122, 35, C.ink, 5, { 'stroke-linecap': 'butt' });
    rect(p.card, -102, 48, 38, 26, 5, C.ink);
    MT(p.card, 'CARTE DE FIDÉLITÉ', -102, 98, 20, C.ink, { anchor: 'start' });
    p.rd = g(G);
    shadowRect(p.rd, 575, 612, 250, 86, 14, 8);
    rect(p.rd, 575, 612, 250, 86, 14, C.ink);
    rect(p.rd, 592, 628, 216, 10, 4, C.lime);
    MT(p.rd, 'LECTEUR', 700, 678, 18, C.paper, { anchor: 'middle' });
    /* colonne de droite : deux fois plus grande */
    MT(G, 'LE CASINO CUMULE :', 870, 470, 30, C.ink, { anchor: 'start' });
    const dz = fitSize('DES DONNÉES', 84, 900);
    BT(G, 'DES DONNÉES', 870, 552, dz, C.ink, { anchor: 'start' });
    p.rows = [`MISE MOYENNE · ${bet}`, `TOURS · ${rounds}`, `THÉO · ${theo}`].map((s, i) => {
      const y = 584 + i * 74, o = { s, i, y }; o.g = g(G);
      shadowRect(o.g, 870, y, 960, 62, 8, 7);
      rect(o.g, 870, y, 960, 62, 8, i === 2 ? C.red : C.white, C.ink, 5);
      o.ty = TY(o.g, s, 896, y + 43, fitMono(s, 34, 900), C.ink, { mono: true });
      return o;
    });
    p.upd = (tau) => {
      const c = E.out3(prog(tau, 0, 0.7));
      setA(p.card, 'transform', `translate(700 ${f2(440 + (497 - 440) * c)})`);
      const q = Math.floor(clamp((tau - 0.9) / 1.6) * 6) / 6, n = tau >= 2.5 ? p.nPts : Math.round(p.nPts * E.in2(q));
      const tx = n + NB + 'PTS'; if (p.cnt.__s !== tx) { p.cnt.__s = tx; p.cnt.textContent = tx; p.cnt.setAttribute('textLength', f2(mw(tx, 44))); }
      vis(p.left, tau >= 0.1);
      p.rows.forEach((o, i) => { const a = 1.1 + 0.6 * i; vis(o.g, tau >= a); tyShow(o.ty, (tau - a - 0.1) / 0.04); });
    };
    return p;
  }

  function pFree(parent) {
    const p = { g: g(parent) }, G = p.g;
    p.tab = g(G);
    { const lab = 'UN CLIENT DU JEU', w = mw(lab, 26) + 40; rect(p.tab, 330, 438, w, 42, 6, C.ink); MT(p.tab, lab, 330 + w / 2, 467, 26, C.paper, { anchor: 'middle' }); }
    p.bub = g(G);
    const B = p.bub;
    shadowRect(B, 330, 478, 1260, 132, 34, 10);
    rect(B, 330, 478, 1260, 132, 34, C.white, C.ink, 6);
    path(B, 'M 400 606 L 392 646 L 458 608', C.white, C.ink, 6);
    line(B, 406, 606, 452, 606, C.white, 9, { 'stroke-linecap': 'butt' });
    const lab = 'LA CARTE DE FIDÉLITÉ, C’EST GRATUIT', z = fitSize(lab, 64, 1130), w = bw(lab, z);
    BT(B, lab, 960, 544 + z * 0.35, z, C.ink, { anchor: 'middle' });
    p.strike = path(G, `M ${f2(960 - w / 2 - 26)} 556 L ${f2(960 + w / 2 + 26)} 534`, 'none', C.red, 18, { pathLength: 1000 });
    const l2 = 'CE SONT TES MISES QUI LA PAIENT', z2 = fitSize(l2, 84, 1560);
    p.t2 = g(G);
    BT(p.t2, l2, 0, z2 * 0.35, z2, C.ink, { anchor: 'middle' });
    const pre = 'CE SONT ', ux = -bw(l2, z2) / 2 + bw(pre, z2);
    rect(p.t2, ux, z2 * 0.35 + 12, bw('TES MISES', z2), 12, 0, C.red);
    p.t2y = 722;
    p.upd = (tau) => {
      const k = pop(tau, 0, 0.3); setA(p.bub, 'transform', `translate(960 544) scale(${f2(sc(k))}) translate(-960 -544)`); vis(p.bub, k > 0.001);
      setA(p.tab, 'transform', `translate(0 0)`); vis(p.tab, tau >= 0.05);
      const s = E.out2(prog(tau, 0.9, 1.3)); setA(p.strike, 'stroke-dasharray', `${f2(s * 1000)} 1100`); vis(p.strike, s > 0);
      const k2 = pop(tau, 1.8, 0.3); setA(p.t2, 'transform', `translate(960 ${p.t2y}) scale(${f2(sc(k2))})`); vis(p.t2, k2 > 0.001);
    };
    return p;
  }

  function pComps(parent, st, theo, gifts) {
    const p = { g: g(parent) }, G = p.g, n = Math.max(1, gifts.length);
    const kinds = ['glass', 'plate', 'key', 'card'];
    shadowRect(G, 210, 440, 1500, 110, 0, 10);
    rect(G, 210, 440, 1500, 110, 0, C.red, C.ink, 6);
    const bl = 'TON THÉO ' + theo;
    BT(G, bl, 960, 495 + 64 * 0.35, 64, C.paper, { anchor: 'middle', len: f2(Math.min(bw(bl, 64), 1300)) });
    const cw = Math.min(330, (1500 - (n - 1) * 40) / n), gap = n > 1 ? (1500 - n * cw) / (n - 1) : 0;
    p.cards = gifts.map((s, i) => {
      const x = 210 + i * (cw + gap), o = { x, cx: x + cw / 2, t0: 0.6 + 0.5 * i }; o.g = g(G);
      shadowRect(o.g, 0, 0, cw, 150, 10, 8);
      rect(o.g, 0, 0, cw, 150, 10, C.paper, C.ink, 6);
      const pg = g(o.g, { transform: `translate(${f2(cw / 2)} 56) scale(0.58)` }); picto(pg, kinds[i % 4], false);
      BT(o.g, s, cw / 2, 134, fitSize(s, 30, cw - 28), C.ink, { anchor: 'middle' });
      o.sl = rect(G, 0, 0, 46, 42, 4, C.red, C.ink, 5);                          // la tranche qui se détache
      return o;
    });
    p.leg = MT(G, 'UNE FRACTION, PRÉVUE, DE CE QUE TU VAS PERDRE', 210, 798, 28, C.ink, { anchor: 'start' });
    p.stk = g(G);
    { const lab = 'PAS UNE GÉNÉROSITÉ', z = 28, w = mw(lab, z) + 44, h = 52; rect(p.stk, -w / 2, -h / 2, w, h, 8, C.ink); MT(p.stk, lab, 0, z * 0.33, z, C.paper, { anchor: 'middle' }); }
    p.upd = (tau) => {
      p.cards.forEach((o) => {
        const u = prog(tau, o.t0, o.t0 + 0.45), arrived = u >= 1;
        const sx = 232, sy = 552, ex = o.cx, ey = 600;
        const e = E.out2(u), fall = E.in2(u);
        const x = sx + (ex - sx) * e, y = sy + (ey - sy) * fall - 30 * Math.sin(Math.PI * u) * (1 - u);
        vis(o.sl, tau >= o.t0 && !arrived);
        setA(o.sl, 'transform', `translate(${f2(x - 23)} ${f2(y)}) scale(${f2(1 - 0.2 * u)})`);
        const k = arrived ? pop(tau, o.t0 + 0.45, 0.25) : 0;
        setA(o.g, 'transform', `translate(${f2(o.cx)} 660) scale(${f2(sc(k))}) translate(${f2(-p.cw / 2)} -75)`);
        vis(o.g, k > 0.001);
      });
      const tl = 0.6 + 0.5 * (p.cards.length - 1) + 0.8;
      vis(p.leg, tau >= tl);
      const k = pop(tau, tl + 0.3, 0.3); setA(p.stk, 'transform', `translate(1500 784) rotate(-3) scale(${f2(sc(k))})`); vis(p.stk, k > 0.001);
    };
    p.cw = cw;
    return p;
  }
  
  function pBarman(parent) {
    const p = { g: g(parent) }, G = p.g;
    shadowRect(G, 260, 700, 1400, 90, 0, 10);
    rect(G, 260, 700, 1400, 90, 0, C.ink);
    p.glass = g(G); const gg = g(p.glass, { transform: 'translate(760 570) scale(1.7)' }); picto(gg, 'glass', true);
    p.tag = g(G);
    const T = p.tag, lab = 'IL CONNAÎT TON THÉO', z = fitSize(lab, 52, 470);
    shadowRect(T, -300, -56, 600, 112, 16, 9);
    rect(T, -300, -56, 600, 112, 16, C.white, C.ink, 6);
    circle(T, -268, 0, 11, C.paper, C.ink, 5);
    BT(T, lab, 14, z * 0.35, z, C.ink, { anchor: 'middle' });
    p.str = line(G, 838, 572, 952, 578, C.ink, 5);
    p.upd = (tau) => {
      const k = pop(tau, 0, 0.3); setA(p.glass, 'transform', `translate(760 700) scale(${f2(sc(k))}) translate(-760 -700)`); vis(p.glass, k > 0.001);
      const k2 = pop(tau, 0.6, 0.35), bob = 8 * Math.sin(tau * 3.1);
      setA(p.tag, 'transform', `translate(1220 ${f2(560 + bob)}) rotate(-4) scale(${f2(sc(k2))})`); vis(p.tag, k2 > 0.001);
      setA(p.str, 'y2', f2(578.7 + bob)); vis(p.str, k2 > 0.5);
    };
    return p;
  }

  function updForm(st, t) {
    const c = st.cues, tF = c.formula;
    /* tuiles, signes */
    st.tiles.forEach((o, i) => {
      const t0 = tF == null ? Infinity : tF + i * 0.2, u = prog(t, t0, t0 + 0.4), on = t >= t0;
      const e = E.back(u);
      setA(o.g, 'transform', `translate(${f2(o.cx)} ${f2(o.cy - 520 * (1 - e))})`);
      vis(o.g, on);
      const tv = i === 0 ? c.bet : i === 1 ? c.rounds : i === 2 ? c.edge : c.theo;
      if (i === 2) { const inv = tv != null && t >= tv; setA(o.plate, 'fill', inv ? C.ink : C.paper); setA(o.lab, 'fill', inv ? C.paper : C.ink); setA(o.val.tn, 'fill', inv ? C.lime : C.ink); }
      if (tv == null || t < tv) { tyShow(o.val, 0); setA(o.vg, 'transform', 'translate(0 34)'); return; }
      if (i === 3) {
        const s = 1 + 0.12 * (1 - E.out3(prog(t, tv, tv + 0.3))), [dx, dy] = shakeAt(t, tv, 8, 0.4);
        setA(o.vg, 'transform', `translate(${f2(dx)} ${f2(34 + dy)}) scale(${f2(s)})`); tyShow(o.val, 99);
      } else tyShow(o.val, (t - tv) / 0.07 + 1);
    });
    st.signs.forEach((s, i) => {
      const t0 = tF == null ? Infinity : tF + (i + 1) * 0.2 + 0.1, k = pop(t, t0, 0.25);
      setA(s.g, 'transform', `translate(${f2(s.x)} ${f2(s.y)} ) scale(${f2(sc(k))})`); vis(s.g, k > 0.001);
    });
    {
      const tr = c.rounds; const k = tr != null ? pop(t, tr + 0.07 * 3 + 0.2, 0.3) : 0;
      setA(st.sub, 'transform', `translate(${f2(st.subX)} ${f2(st.subY)}) rotate(-2) scale(${f2(sc(k))})`); vis(st.sub, k > 0.001);
    }
    /* panneaux : le dernier cue remplace le précédent (sortie vers le bas 8 i, entrée par le haut 10 i) */
    const ev = st.ev; let j = -1;
    for (let i = 0; i < ev.length; i++) if (ev[i].t <= t) j = i;
    for (const id in st.P) vis(st.P[id].g, false);
    if (j >= 0) {
      const cur = ev[j], prev = j > 0 ? ev[j - 1] : null, ex = prev && prev.id !== cur.id ? 8 / 30 : 0;
      if (prev && prev.id !== cur.id && t < cur.t + ex) {
        const pp = st.P[prev.id]; vis(pp.g, true);
        setA(pp.g, 'transform', `translate(0 ${f2(430 * E.in2(prog(t, cur.t, cur.t + ex)))})`);
        pp.upd(1e3);
      } else if (t >= cur.t + ex) {
        const cp = st.P[cur.id]; vis(cp.g, true);
        setA(cp.g, 'transform', `translate(0 ${f2(-430 * (1 - E.out3(prog(t, cur.t + ex, cur.t + ex + 10 / 30))))})`);
        cp.upd(t - (cur.t + ex + 0.2));
      }
    }
  }

  /* =========================================================== MODE LIFETIME */
  function buildLife(root, st, P, cl, dur) {
    const nights = clamp(Math.round(isNum(+P.nights) && P.nights != null ? +P.nights : 52), 1, 52), tn = isNum(+P.theo_night) && P.theo_night != null ? +P.theo_night : 54;
    const total = str(P.total, '≈' + NB + '2' + NNB + '800' + NB + '€'), first = str(P.first, 'TA PREMIÈRE SOIRÉE : PAS GRAND-CHOSE'), you = str(P.you, 'TOI, SI.');
    const steps = (Array.isArray(P.steps) && P.steps.length ? P.steps : ['LA CARTE DANS TA POCHE', 'L’HÔTE TE SALUE', 'LE VERRE ARRIVE TOUT SEUL', 'LA MISE MIN. TE PARAÎT PETITE']).slice(0, 6).map((s) => str(s, ''));
    const amt = tn + NB + '€', theoTxt = '≈' + NB + amt;
    const cues = { one: cl('one')[0], year: cl('year')[0], total: cl('total')[0], easier: cl('easier')[0], escalade: cl('escalade')[0] };
    if (Object.values(cues).every((x) => x == null)) { const k = Math.min(1, dur / 13); Object.assign(cues, { one: 0.6 * k, year: 2.2 * k, total: 6.0 * k, easier: 8.0 * k, escalade: 10.8 * k }); }
    st.cues = cues; st.nights = nights; st.tn = tn; st.total = total; st.amt = amt;
    /* tuile du haut */
    const tl = g(root);
    shadowRect(tl, 90, 90, 450, 160, 10, 11);
    rect(tl, 90, 90, 450, 160, 10, C.paper, C.ink, 8);
    MT(tl, '1 SOIRÉE', 315, 138, 30, C.ink, { anchor: 'middle' });
    { const z = fitSize(theoTxt, 96, 400); BT(tl, theoTxt, 315, 220 + (96 - z) * 0.1, z, C.ink, { anchor: 'middle' }); }
    /* compteur */
    st.cntSize = 140; st.cnt = g(root);
    st.cntT = text(st.cnt, '', 0, 0, 140, C.ink, { anchor: 'end' });
    /* stickers */
    st.stkFirst = g(root);
    { const z = fitSize(first, 28, 760), w = bw(first, z) + 40, h = 44; shadowRect(st.stkFirst, -w / 2, -h / 2, w, h, 8, 6); rect(st.stkFirst, -w / 2, -h / 2, w, h, 8, C.paper, C.ink, 5); BT(st.stkFirst, first, 0, z * 0.35, z, C.ink, { anchor: 'middle' }); st.stkFirstX = 90 + w / 2 + 6; }
    st.stkYou = g(root);
    { const z = fitSize(you, 64, 360), w = bw(you, z) + 56, h = 90; shadowRect(st.stkYou, -w / 2, -h / 2, w, h, 12, 9); rect(st.stkYou, -w / 2, -h / 2, w, h, 12, C.red, C.ink, 6); BT(st.stkYou, you, 0, z * 0.35, z, C.ink, { anchor: 'middle' }); }
    /* grille */
    const GX = 90, GY = 322, PX = 118, PY = 94;
    st.cells = [];
    for (let i = 0; i < nights; i++) {
      const x = GX + (i % 13) * PX, y = GY + Math.floor(i / 13) * PY, o = { x, y };
      o.r = rect(root, x, y, 104, 80, 6, C.paper, C.ink, 4);
      o.l = MT(root, 'VEN.', x + 8, y + 22, 18, C.ink, { anchor: 'start' });
      o.a = MT(root, amt, x + 52, y + 64, 26, C.ink, { anchor: 'middle' });
      st.cells.push(o);
    }
    st.ring = g(root);
    if (nights > 1) {
      const c2 = st.cells[1];
      rect(st.ring, c2.x - 10, c2.y - 10, 124, 100, 14, 'none', C.ink, 18);
      rect(st.ring, c2.x - 10, c2.y - 10, 124, 100, 14, 'none', C.lime, 10);
    }
    /* étiquettes d'escalade */
    const lz0 = 26;
    let lz = lz0, widths = steps.map((s) => mw(s, lz) + 40);
    const gapL = 26, avail = 1740;
    const tot = () => widths.reduce((a, b) => a + b, 0) + gapL * (steps.length - 1);
    while (tot() > avail && lz > 18) { lz -= 1; widths = steps.map((s) => mw(s, lz) + 40); }
    let x = (1920 - tot()) / 2;
    st.steps = steps.map((s, i) => {
      const o = { x, w: widths[i], i }; o.g = g(root);
      shadowRect(o.g, 0, 0, widths[i], 56, 8, 6);
      rect(o.g, 0, 0, widths[i], 56, 8, C.paper, C.ink, 5);
      MT(o.g, s, widths[i] / 2, 56 / 2 + lz * 0.33, lz, C.ink, { anchor: 'middle' });
      x += widths[i] + gapL; return o;
    });
    /* flèche-escalier */
    st.esc = g(root);
    {
      const n = st.steps.length, y0 = 745, dy = 12;
      let d = `M ${f2(st.steps[0].x)} ${y0}`;
      for (let i = 1; i < n; i++) { const bx = st.steps[i].x - gapL / 2; d += ` L ${f2(bx)} ${y0 - dy * (i - 1)} L ${f2(bx)} ${y0 - dy * i}`; }
      const last = st.steps[n - 1], xe = last.x + last.w + 8, ye = y0 - dy * (n - 1);
      d += ` L ${f2(xe)} ${ye}`;
      st.escP = path(st.esc, d, 'none', C.ink, 20, { pathLength: 1000, 'stroke-linejoin': 'miter', 'stroke-linecap': 'butt' });
      st.escR = path(st.esc, d, 'none', C.red, 12, { pathLength: 1000, 'stroke-linejoin': 'miter', 'stroke-linecap': 'butt' });
      st.escH = g(st.esc);
      path(st.escH, `M ${f2(xe + 46)} ${ye} L ${f2(xe)} ${ye - 22} L ${f2(xe)} ${ye + 22} Z`, C.red, C.ink, 6);
      st.escXe = xe; st.escYe = ye;
    }
    st.stamp = g(root);
    { const lab = 'L’ESCALADE', z = 38, w = bw(lab, z) + 44, h = 78; rect(st.stamp, -w / 2, -h / 2, w, h, 6, C.ink); rect(st.stamp, -w / 2 + 6, -h / 2 + 6, w - 12, h - 12, 3, 'none', C.paper, 3); BT(st.stamp, lab, 0, z * 0.35, z, C.paper, { anchor: 'middle' }); }
    return st;
  }

  function updLife(st, t) {
    const c = st.cues, n = st.nights, tn = st.tn;
    const fillT = 3.0;
    let filled = 0;                                                              // nombre de cases pleines (1re comprise)
    if (c.one != null && t >= c.one) filled = 1;
    let q = 0;                                                                   // état du compteur : nombre affiché
    if (c.year != null && t >= c.year) { const p = prog(t - c.year, 0, fillT); filled = 1 + Math.floor((n - 1) * Math.pow(p, 2.1) + 1e-6); if (p >= 1) filled = n; q = p >= 1 ? n : Math.max(1, 1 + Math.floor((n - 1) * Math.pow(Math.floor(p * fillT * 6) / (fillT * 6), 2.1))); }
    else if (filled) q = 1;
    st.cells.forEach((o, i) => {
      const on = i < filled;
      setA(o.r, 'fill', on ? C.lime : C.paper);
      vis(o.a, on);
      if (i === 0 && c.one != null && t >= c.one && t < c.one + 0.3) { /* petit pop de la 1re case */ }
    });
    /* compteur */
    let label = '', ts = 0;
    const tT = c.total;
    if (tT != null && t >= tT) { label = st.total; ts = tT; }
    else if (q) label = st.amt + NB + '×' + NB + q;
    const z = Math.min(140, 140 * 740 / Math.max(1, bw(label, 140)));
    if (st.cntT.__s !== label || st.cntT.__z !== z) {
      st.cntT.__s = label; st.cntT.__z = z; st.cntT.textContent = label;
      setA(st.cntT, 'font-size', f2(z)); setA(st.cntT, 'textLength', f2(Math.max(1, bw(label, z))));
    }
    setA(st.cntT, 'fill', tT != null && t >= tT ? C.red : C.ink);
    if (tT != null && t >= tT) {
      const s = 1 + 0.15 * (1 - E.out3(prog(t, tT, tT + 0.3))), [dx, dy] = shakeAt(t, tT, 8, 0.4);
      setA(st.cnt, 'transform', `translate(${f2(1820 + dx)} ${f2(232 + dy)}) translate(0 -50) scale(${f2(s)}) translate(0 50)`);
    } else setA(st.cnt, 'transform', 'translate(1820 232)');
    vis(st.cnt, !!label);
    /* stickers */
    const kf = c.one != null ? pop(t, c.one + 0.3, 0.3) : 0;
    setA(st.stkFirst, 'transform', `translate(${f2(st.stkFirstX)} 292) rotate(-1) scale(${f2(sc(kf))})`); vis(st.stkFirst, kf > 0.001);
    const ky = tT != null ? pop(t, tT + 0.15, 0.3) : 0;
    setA(st.stkYou, 'transform', `translate(880 190) rotate(-6) scale(${f2(sc(ky))})`); vis(st.stkYou, ky > 0.001);
    /* 2e case cerclée, étiquettes, escalade */
    const tE = c.easier;
    const kr = tE != null ? pop(t, tE, 0.3) : 0;
    if (st.cells.length > 1) { const c2 = st.cells[1], cx = c2.x + 52, cy = c2.y + 40; setA(st.ring, 'transform', `translate(${cx} ${cy}) scale(${f2(sc(kr))}) translate(${-cx} ${-cy})`); }
    vis(st.ring, kr > 0.001);
    st.steps.forEach((o, i) => {
      const t0 = tE == null ? Infinity : tE + 0.15 + 0.4 * i, u = prog(t, t0, t0 + 0.32), e = E.back(u);
      setA(o.g, 'transform', `translate(${f2(o.x)} ${f2(760 - 90 * (1 - e))})`); vis(o.g, t >= t0);
    });
    const tX = c.escalade;
    const a = tX != null ? E.io2(prog(t, tX, tX + 1.1)) : 0;
    setA(st.escP, 'stroke-dasharray', `${f2(a * 1000)} 1100`); setA(st.escR, 'stroke-dasharray', `${f2(a * 1000)} 1100`);
    vis(st.esc, a > 0.001);
    vis(st.escH, a >= 1);
    const [sx, sy] = tX != null ? shakeAt(t, tX + 1.1, 6, 0.35) : [0, 0];
    setA(st.stamp, 'transform', `translate(${f2(1770 + sx)} ${f2(520 + sy)}) rotate(-8) scale(${f2(1 + 0.8 * (1 - E.out3(prog(t, (tX == null ? 0 : tX) + 1.1, (tX == null ? 0 : tX) + 1.4))))})`); vis(st.stamp, tX != null && t >= tX + 1.1);
  }
})();
