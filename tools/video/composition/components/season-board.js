// Composant `season-board` (épisode 0) : le sommaire de la saison, 9 cartes (3 × 3) retournées une par une, puis trois cartes dont le verso montre un témoin (un objet, jamais une personne) ; sert aussi au « premier épisode ».
// Props : title, episodes[9] {n,title,sub,picto}, witnesses[3] {cue,card,object,role,line}, start (closed|open), first_label.
// Cues : title, e1…e9, all, people, w-escroc / w-ecrivain / w-joueuse (noms modifiables par witnesses[].cue), first.
// Cue absent = l'étape n'a pas lieu ; sans aucun cue : start = open, 9 cartes face visibles, titre en place, immobile.
// Fonction pure du temps ; aplats, aucun dégradé / flou / lueur / filter ; rien d'important sous y = 840.
(() => {
  'use strict';
  const { C, F, E, clamp, f2, sv, g, rect, circle, path, line, text } = ZV;
  const I = 1 / 30;
  const INF = Infinity;
  const pg = (t, a, d) => (a === -INF ? 1 : a === INF ? 0 : clamp((t - a) / d));
  const str = (v, d) => (typeof v === 'string' && v.trim().length ? v.trim() : d);
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const vis = (n, on) => setA(n, 'display', on ? 'inline' : 'none');
  const tr = (n, x, y, r, sx, sy) => { let s = `translate(${f2(x)} ${f2(y)})`; if (r) s += ` rotate(${f2(r)})`; if (sx !== undefined && (sx !== 1 || (sy !== undefined && sy !== 1))) s += ` scale(${f2(Math.max(sx, 0.0001))} ${f2(Math.max(sy === undefined ? sx : sy, 0.0001))})`; setA(n, 'transform', s); };
  function metric(root) {
    const probe = sv('text', { x: 0, y: -3000, 'font-size': 100, 'font-weight': 800, visibility: 'hidden' }, root);
    const cache = {};
    const est = (s, mono) => { let a = 0; for (const ch of s) a += mono ? 60 : (ch === ' ' ? 26 : /[0-9]/.test(ch) ? 60 : /[A-ZÀÂÉÈÊÎÔÛÇ€%+×≠=?]/.test(ch) ? 68 : /[.,:;'’!|·]/.test(ch) ? 32 : 58); return a; };
    return (s, size, mono) => {
      s = String(s); const k = (mono ? 'm' : 'd') + s; let w = cache[k];
      if (w === undefined) {
        probe.setAttribute('font-family', mono ? F.mono : F.display); probe.setAttribute('font-weight', mono ? 600 : 800); probe.textContent = s;
        w = 0; try { w = probe.getComputedTextLength(); } catch (e) { w = 0; }
        if (!(w > 0)) w = est(s, mono);
        cache[k] = w;
      }
      return w * size / 100;
    };
  }
  // coupe en n lignes équilibrées sur les espaces : {w, lines}
  function split(M, s, n, sz, mono) {
    const words = String(s).split(/\s+/).filter(Boolean); if (!words.length) words.push(' ');
    n = Math.max(1, Math.min(n, words.length));
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
  }
  // meilleur découpage ≤ maxL lignes tenant dans maxW à la taille sz (le moins de lignes possible) ou null
  function fitLines(M, s, sz, maxW, maxL, mono) {
    const words = String(s).split(/\s+/).filter(Boolean).length || 1;
    for (let n = 1; n <= Math.min(maxL, words); n++) { const p = split(M, s, n, sz, mono); if (p.w <= maxW + 0.5) return p; }
    return null;
  }
  // texte placé avec largeur imposée
  function put(parent, s, x, y, size, fill, M, o) {
    o = o || {};
    const n = text(parent, s, x, y, f2(size), fill, { mono: o.mono, anchor: o.anchor, weight: o.weight });
    const w = M(s, size, o.mono);
    n.setAttribute('textLength', f2(o.maxW ? Math.min(w, o.maxW) : w)); n.setAttribute('lengthAdjust', 'spacingAndGlyphs');
    return n;
  }

  // ---------- pictos : zone 130 × 130 centrée sur (0,0) ----------
  const PAL = {
    face: { ln: C.ink, dk: C.ink, a: C.paper, b: C.white, lm: C.lime, rd: C.red, pk: C.pocket, lt: C.paper, ed: C.paper },
    inv: { ln: C.paper, dk: C.ink, a: C.ink, b: C.paper, lm: C.lime, rd: C.lime, pk: C.ink, lt: C.paper, ed: C.ink }
  };
  const ell = (p, cx, cy, rx, ry, fill, stroke, sw) => sv('ellipse', { cx, cy, rx, ry, fill, stroke, 'stroke-width': sw }, p);
  function pic(parent, kind, mode) {
    const p = PAL[mode], G = g(parent), W = 5;
    const R = (x, y, w, h, rx, fill, stroke, sw) => rect(G, x, y, w, h, rx, fill, stroke, sw);
    switch (kind) {
      case 'ball':
        circle(G, -16, 22, 30, p.b, p.ln, W);
        circle(G, 8, -4, 5, p.a, p.ln, 4); circle(G, 19, -18, 8, p.a, p.ln, 4);
        ell(G, 30, -42, 34, 22, p.a, p.ln, W);
        break;
      case 'slot':
        R(-46, -46, 92, 104, 8, p.pk, p.ln, W);
        R(-52, -60, 104, 26, 6, p.rd, p.ln, W);
        [-39, -13, 13].forEach((x) => { R(x, -20, 26, 40, 3, p.a, p.ln, 3); circle(G, x + 13, 0, 6, p.ln); });
        line(G, 46, -22, 62, -38, p.ln, 6); circle(G, 62, -40, 7, p.rd, p.ln, 4);
        R(-46, 36, 92, 22, 4, p.lm, p.ln, W);
        break;
      case 'ladder':
        [14, 28, 56, 84].forEach((h, i) => R(-60 + i * 30, 58 - h, 28, h, 2, i < 3 ? p.a : p.rd, p.ln, W));
        break;
      case 'chase':
        line(G, -62, 12, 62, 12, p.ln, 3, { 'stroke-dasharray': '6 7', 'stroke-linecap': 'butt' });
        path(G, 'M-56 12 L-12 -46 L26 38', 'none', p.ln, 10, { 'stroke-linejoin': 'round' });
        path(G, 'M43 35 L13 49 L38 64 Z', p.rd, p.ln, 5);
        break;
      case 'cards':
        [[-14, 0, -14], [16, 4, 12]].forEach((c) => {
          const cg = g(G, { transform: `translate(${c[0]} ${c[1]}) rotate(${c[2]})` });
          rect(cg, -28, -40, 56, 80, 7, 'none', p.dk, 12);
          rect(cg, -28, -40, 56, 80, 7, p.pk, p.lt, 5);
          rect(cg, -17, -29, 34, 58, 3, 'none', p.lt, 2.5);
        });
        break;
      case 'clock-off':
        circle(G, 0, 0, 44, p.a, p.ln, W);
        [[0, -36, 0, -28], [36, 0, 28, 0], [0, 36, 0, 28], [-36, 0, -28, 0]].forEach((l) => line(G, l[0], l[1], l[2], l[3], p.ln, 4));
        line(G, 0, 0, 0, -24, p.ln, 5); line(G, 0, 0, 17, 9, p.ln, 5);
        line(G, -54, -54, 54, 54, p.dk, 20); line(G, -54, -54, 54, 54, p.rd, 10);
        break;
      case 'carpet':
        path(G, 'M-58 60 L58 60 L17 -50 L-17 -50 Z', p.rd, p.ln, W);
        line(G, -46, 54, -12, -42, p.ed, 5); line(G, 46, 54, 12, -42, p.ed, 5);
        [[18, 33], [-12, 20]].forEach((a) => line(G, -a[1], a[0], a[1], a[0], p.ed, 3, { 'stroke-linecap': 'butt' }));
        line(G, -30, -50, 30, -50, p.ln, 5);
        break;
      case 'phone':
        R(-34, -58, 68, 116, 10, p.pk, p.ln, W);
        R(-26, -42, 52, 84, 3, p.b);
        circle(G, 0, -2, 22, p.lm, p.dk, 3);
        for (let i = 0; i < 3; i++) { const a = i * 60 * ZV.D2R; line(G, -22 * Math.cos(a), -2 - 22 * Math.sin(a), 22 * Math.cos(a), -2 + 22 * Math.sin(a), p.dk, 3, { 'stroke-linecap': 'butt' }); }
        R(-10, 48, 20, 4, 2, p.lt);
        break;
      case 'exit':
        R(-42, -56, 64, 112, 0, p.pk, p.ln, W);
        path(G, 'M-42 -56 L-14 -46 L-14 46 L-42 56 Z', p.a, p.ln, W);
        circle(G, -20, 0, 3.5, p.ln);
        path(G, 'M2 -8 H34 V-22 L62 0 L34 22 V8 H2 Z', p.lm, p.ln, W);
        break;
      // objets des témoins (palette fixe sur carte ink) : jamais de personne
      case 'tophat':
        line(G, -50, 58, 46, -40, C.paper, 16); line(G, -50, 58, 46, -40, C.lime, 8);
        path(G, 'M46 -40 q12 -14 22 -4', 'none', C.paper, 14); path(G, 'M46 -40 q12 -14 22 -4', 'none', C.lime, 7);
        ell(G, 0, 36, 54, 12, C.ink, C.paper, W);
        R(-32, -40, 64, 76, 0, C.ink, C.paper, W);
        R(-29, 12, 58, 16, 0, C.lime);
        ell(G, 0, -40, 32, 9, C.ink, C.paper, W);
        break;
      case 'quill':
        path(G, 'M-18 22 C-8 -28 22 -50 56 -60 C50 -30 32 2 -12 20 Z', C.paper, C.paper, 3);
        line(G, -18, 22, 46, -52, C.ink, 3);
        R(-48, 16, 44, 40, 6, C.ink, C.paper, W); R(-38, 6, 24, 12, 2, C.ink, C.paper, 4);
        R(16, -6, 9, 38, 0, C.paper); R(16, 28, 40, 9, 0, C.paper); line(G, 20, 36, 20, 58, C.paper, 7); line(G, 52, 36, 52, 58, C.paper, 7);
        break;
      case 'stool':
        R(-8, -12, 16, 62, 0, C.ink, C.paper, W);
        ell(G, 0, 52, 36, 8, C.ink, C.paper, W);
        R(-42, -34, 84, 22, 11, C.red, C.paper, W);
        circle(G, 52, 24, 14, C.lime, C.paper, W);
        break;
      default:
        circle(G, 0, 0, 40, p.a, p.ln, W);
    }
    return G;
  }

  const DEF_EP = [
    { n: '01', title: 'La bille n’a pas de mémoire', sub: '', picto: 'ball' },
    { n: '02', title: 'La zone', sub: '', picto: 'slot' },
    { n: '03', title: 'Le système infaillible', sub: 'qui ne l’est jamais', picto: 'ladder' },
    { n: '04', title: 'Se refaire', sub: 'perdre plus vite en voulant rattraper', picto: 'chase' },
    { n: '05', title: 'Le seul jeu qu’on peut battre', sub: '', picto: 'cards' },
    { n: '06', title: 'Une maison sans horloges', sub: '', picto: 'clock-off' },
    { n: '07', title: 'Le tapis rouge', sub: 'et qui le paie', picto: 'carpet' },
    { n: '08', title: 'Le casino dans la poche', sub: '', picto: 'phone' },
    { n: '09', title: 'La sortie', sub: '', picto: 'exit' }
  ];
  const DEF_W = [
    { cue: 'w-escroc', card: 1, object: 'tophat', role: 'Un escroc', line: 'qui a fait sauter la banque de Monte-Carlo' },
    { cue: 'w-ecrivain', card: 3, object: 'quill', role: 'Un écrivain russe', line: 'et la femme qui l’attendait' },
    { cue: 'w-joueuse', card: 2, object: 'stool', role: 'Une joueuse de Las Vegas', line: 'qui ne joue pas pour gagner' }
  ];
  const XS = [140, 700, 1260], YS = [130, 370, 610];

  ZV.define('season-board', {
    init(root, shot) {
      const P = shot.props || {};
      const M = metric(root);
      const sh = { beats: shot.beats || [] };
      const cu = (n) => { const v = ZV.cue(sh, n); return v == null ? null : v; };
      const st = { cards: [] };
      const titleTxt = str(P.title, 'SAISON 1 · 9 ÉPISODES').toUpperCase();
      const peopleTxt = 'AVEC DES GENS QUI L’ONT VÉCU';
      const firstTxt = str(P.first_label, 'PREMIER ÉPISODE').toUpperCase();
      const epP = Array.isArray(P.episodes) ? P.episodes : [];
      const eps = DEF_EP.map((d, i) => { const e = epP[i] && typeof epP[i] === 'object' ? epP[i] : {}; return { n: str(e.n, d.n), title: typeof e.title === 'string' ? e.title : d.title, sub: typeof e.sub === 'string' ? e.sub : d.sub, picto: str(e.picto, d.picto) }; });
      const wP = Array.isArray(P.witnesses) ? P.witnesses : [];
      const wit = wP.length ? wP : DEF_W;

      // ---- calendrier
      const tTitle = cu('title'), tAll = cu('all'), tPeople = cu('people'), tFirst = cu('first');
      const tE = eps.map((e, i) => cu('e' + (i + 1)));
      const anyE = tE.some((x) => x != null) || tAll != null;
      const closed = P.start === 'closed' ? true : P.start === 'open' ? false : anyE;
      st.k = { title: tTitle, people: tPeople, first: tFirst, all: tAll };
      const witByCard = {};
      const wEv = [];
      wit.forEach((w) => { const c = (w && +w.card) | 0; const tw = w ? cu(str(w.cue, '')) : null; if (c >= 1 && c <= 9) { witByCard[c - 1] = w; if (tw != null) wEv.push({ i: c - 1, t: tw }); } });

      // ---- décor
      rect(root, 0, 0, 1920, 1080, 0, C.lime);
      let gd = ''; for (let x = 0; x <= 1920; x += 120) gd += `M${x} 0V1080`; for (let y = 0; y <= 1080; y += 120) gd += `M0 ${y}H1920`;
      path(root, gd, 'none', C.ink, 2, { opacity: 0.12, 'stroke-linecap': 'butt' });
      const cardsG = g(root);

      // ---- événements de côté (face / dos / témoin) par carte
      const evs = eps.map((e, i) => {
        const a = [];
        if (closed && tE[i] != null) a.push({ t: tE[i], to: 'face' });
        const w = wEv.filter((x) => x.i === i); w.forEach((x) => a.push({ t: x.t, to: 'wit' }));
        if (tFirst != null) a.push({ t: tFirst, to: 'face' });
        return a;
      });
      if (closed && tAll != null) {
        let rank = 0;
        for (let i = 0; i < 9; i++) {
          if (evs[i].some((x) => x.t <= tAll)) continue;
          evs[i].push({ t: tAll + rank * 3 * I, to: 'face' }); rank++;
        }
      }
      const cardEv = evs.map((a) => {
        a.sort((x, y) => x.t - y.t);
        let cur = closed ? 'back' : 'face'; const out = [];
        a.forEach((x) => { if (x.to !== cur) { out.push({ t: x.t, from: cur, to: x.to }); cur = x.to; } });
        return out;
      });
      // événements « carte active »
      const act = [];
      tE.forEach((x, i) => { if (x != null) act.push({ t: x, c: i }); });
      [tAll, tPeople, tFirst].forEach((x) => { if (x != null) act.push({ t: x, c: -1 }); });
      act.sort((x, y) => x.t - y.t);
      st.act = act;
      const wSet = new Set(Object.keys(witByCard).map(Number));
      st.wSet = wSet;

      // ---- cartes (ordre DOM : 2…9 puis 1, pour que la 01 reste au-dessus quand elle grandit)
      const order = [1, 2, 3, 4, 5, 6, 7, 8, 0];
      const cards = [];
      order.forEach((i) => {
        const cx = XS[i % 3] + 260, cy = YS[Math.floor(i / 3)] + 100;
        const pos = g(cardsG), flip = g(pos);
        const c = { i, cx, cy, pos, flip, ev: cardEv[i], init: closed ? 'back' : 'face', drop: tTitle != null ? tTitle + i * 2 * I : -INF };
        c.shadow = rect(flip, -260 + 10, -100 + 10, 520, 200, 14, C.ink);
        const ep = eps[i];
        // dos
        c.back = g(flip);
        rect(c.back, -260, -100, 520, 200, 14, C.ink, C.paper, 4);
        put(c.back, ep.n, 0, 22, 64, C.lime, M, { anchor: 'middle', mono: true });
        // face / active
        const title = ep.title.toUpperCase(), sub = (ep.sub || '').toUpperCase();
        let sz = 42, tl = null, sl = null, blockH = 0;
        for (; sz >= 30; sz--) {
          tl = fitLines(M, title, sz, 336, 2, false); if (!tl) continue;
          sl = sub ? (fitLines(M, sub, 18, 336, 2, true) || fitLines(M, sub, 15, 336, 2, true)) : { lines: [], w: 0 };
          if (!sl) sl = { lines: [], w: 0 };
          blockH = tl.lines.length * sz * 1.05 + (sl.lines.length ? 8 + sl.lines.length * 21.6 : 0);
          if (blockH <= 140) break;
        }
        if (!tl) { sz = 30; tl = split(M, title, 2, 30, false); sl = sub ? split(M, sub, 2, 15, true) : { lines: [], w: 0 }; blockH = tl.lines.length * sz * 1.05 + (sl.lines.length ? 8 + sl.lines.length * 21.6 : 0); }
        const subSz = sub && fitLines(M, sub, 18, 336, 2, true) ? 18 : 15;
        const y0 = 14 - blockH / 2;
        [['face', C.paper, C.ink, C.ink, C.ink, C.lime, C.ink], ['act', C.ink, C.paper, C.lime, C.paper, C.lime, C.ink]].forEach((m, mi) => {
          const G = g(flip);
          if (mi === 0) rect(G, -260, -100, 520, 200, 14, C.paper, C.ink, 6); else rect(G, -260, -100, 520, 200, 14, C.ink, C.ink, 6);
          // onglet
          if (mi === 0) { rect(G, -236, -114, 76, 50, 0, C.ink); put(G, ep.n, -198, -114 + 25 + 10.5, 30, C.lime, M, { anchor: 'middle', mono: true }); }
          else { rect(G, -236, -114, 76, 50, 0, C.lime); put(G, ep.n, -198, -114 + 25 + 10.5, 30, C.ink, M, { anchor: 'middle', mono: true }); }
          tl.lines.forEach((l, j) => put(G, l, -236, y0 + j * sz * 1.05 + sz * 0.88, sz, mi === 0 ? C.ink : C.paper, M, { maxW: 336 }));
          const ys = y0 + tl.lines.length * sz * 1.05 + 8;
          sl.lines.forEach((l, j) => put(G, l, -236, ys + j * 21.6 + 17, subSz, mi === 0 ? C.ink : C.lime, M, { mono: true, weight: 600, maxW: 336 }));
          const pg2 = g(G, { transform: 'translate(175 0)' });
          pic(pg2, ep.picto, mi === 0 ? 'face' : 'inv');
          c[mi === 0 ? 'face' : 'actG'] = G;
        });
        // témoin
        const w = witByCard[i];
        c.hasW = !!w;
        if (w) {
          const G = c.witG = g(flip);
          rect(G, -260, -100, 520, 200, 14, C.ink, C.lime, 6);
          rect(G, -236, -114, 76, 50, 0, C.lime); put(G, ep.n, -198, -114 + 25 + 10.5, 30, C.ink, M, { anchor: 'middle', mono: true });
          pic(g(G, { transform: 'translate(-171 8)' }), str(w.object, 'tophat'), 'face');
          const role = str(w.role, '').toUpperCase(), ln = str(w.line, '');
          let rs = 34, rl = null, ll = null, bh = 0;
          for (; rs >= 26; rs--) {
            rl = fitLines(M, role, rs, 330, 2, false); if (!rl) continue;
            ll = ln ? (fitLines(M, ln, 18, 330, 3, true) || fitLines(M, ln, 15, 330, 3, true)) : { lines: [], w: 0 };
            if (!ll) ll = { lines: [], w: 0 };
            bh = rl.lines.length * rs * 1.05 + (ll.lines.length ? 8 + ll.lines.length * 21.6 : 0);
            if (bh <= 150) break;
          }
          if (!rl) { rs = 26; rl = split(M, role, 2, 26, false); ll = ln ? split(M, ln, 3, 15, true) : { lines: [], w: 0 }; bh = rl.lines.length * rs * 1.05 + (ll.lines.length ? 8 + ll.lines.length * 21.6 : 0); }
          const lsz = ln && fitLines(M, ln, 18, 330, 3, true) ? 18 : 15;
          const yw = 14 - bh / 2;
          rl.lines.forEach((l, j) => put(G, l, -90, yw + j * rs * 1.05 + rs * 0.88, rs, C.paper, M, { maxW: 330 }));
          const yl = yw + rl.lines.length * rs * 1.05 + 8;
          ll.lines.forEach((l, j) => put(G, l, -90, yl + j * 21.6 + 17, lsz, C.lime, M, { mono: true, weight: 600, maxW: 330 }));
        }
        c.veil = rect(flip, -260, -100, 520, 200, 14, C.ink); c.veil.setAttribute('opacity', 0);
        cards.push(c);
      });
      st.cards = cards.slice().sort((a, b) => a.i - b.i);

      // ---- titre (deux stickers : titre / « gens qui l'ont vécu »)
      const mkStk = (label, maxW) => {
        const o = g(root);
        let s = 52, w = M(label, s); if (w > maxW) { s = 52 * maxW / w; w = maxW; }
        const bw = Math.round(w + 80), bh = 70;
        rect(o, -bw / 2, -bh / 2, bw, bh, 12, C.ink, C.ink, 6);
        put(o, label, 0, s * 0.35, s, C.lime, M, { anchor: 'middle', maxW: w });
        return o;
      };
      st.tA = mkStk(titleTxt, 1500); st.tB = mkStk(peopleTxt, 1500);
      // sticker « premier épisode »
      const fo = st.fo = g(root);
      { const fs = 44, fw = Math.min(900, M(firstTxt, fs)), bw = Math.round(fw + 56), bh = Math.round(fs * 1.18 + 26);
        rect(fo, -bw / 2 + 10, -bh / 2 + 10, bw, bh, 14, C.ink); rect(fo, -bw / 2, -bh / 2, bw, bh, 14, C.red, C.ink, 6);
        put(fo, firstTxt, 0, fs * 0.35, fs, C.paper, M, { anchor: 'middle', maxW: fw });
        const a = 4 * Math.PI / 180; st.foY = 218 - ((bh / 2 + 10) * Math.cos(a) + (bw / 2) * Math.sin(a)); }
      return st;
    },

    update(st, t, shot) {
      const k = st.k;
      // titre
      const tp = k.title != null ? pg(t, k.title, 8 * I) : 1;
      const pe = k.people != null ? pg(t, k.people, 4 * I) : 0;
      const pf = k.first != null ? pg(t, k.first, 4 * I) : 0;
      const bOn = k.people != null ? pe * (1 - pf) : 0;
      const aOn = (1 - bOn) * (1 - pf);
      const sc = tp > 0 ? Math.max(0.0001, E.back(tp)) : 0;
      [[st.tA, aOn], [st.tB, bOn]].forEach((x) => { const o = x[0]; if (sc > 0 && x[1] > 0.001) { vis(o, true); tr(o, 960, 65, -2, sc); setA(o, 'opacity', f2(x[1])); } else vis(o, false); });
      // sticker premier épisode
      const fp = k.first != null ? pg(t, k.first + 0.3, 8 * I) : 0;
      if (fp > 0) { vis(st.fo, true); tr(st.fo, 960, st.foY, -4, Math.max(0.0001, E.back(fp))); } else vis(st.fo, false);

      const u1 = k.first != null ? E.out3(pg(t, k.first, 14 * I)) : 0;
      // carte active
      const act = st.act; let li = -1; for (let j = 0; j < act.length; j++) if (act[j].t <= t) li = j;
      for (let n = 0; n < 9; n++) {
        const c = st.cards[n], i = c.i;
        // chute
        if (t < c.drop) { vis(c.pos, false); continue; }
        const dp = pg(t, c.drop, 8 * I);
        const dy = c.drop === -INF ? 0 : -(c.cy + 130) * (1 - E.out3(dp));
        // côté
        let side = c.init, q = 1, prev = c.init, wA = 0;
        let ev = null; for (let j = 0; j < c.ev.length; j++) if (c.ev[j].t <= t) ev = c.ev[j];
        if (ev) {
          q = clamp((t - ev.t) / (10 * I)); prev = ev.from; side = ev.to;
          if (ev.to === 'wit') wA = q; else if (ev.from === 'wit') wA = 1 - q;
        }
        const e = E.io2(q);
        const shown = q < 1 && e < 0.5 ? prev : side;
        const sy = q < 1 ? Math.abs(Math.cos(Math.PI * e)) : 1;
        // active
        let a = 0;
        if (li >= 0) { const cur = act[li].c === i, pv = li > 0 && act[li - 1].c === i; const qa = clamp((t - act[li].t) / (6 * I)); a = cur ? qa : pv ? 1 - qa : 0; }
        // échelle / position
        let s = (1 + 0.06 * a) * (1 + 0.04 * wA), x = c.cx, y = c.cy + dy;
        if (i === 0) { s *= 1 + 0.9 * u1; x += (960 - c.cx) * u1; y += (430 - c.cy) * u1; }
        vis(c.pos, true); tr(c.pos, x, y, 0, s);
        setA(c.flip, 'transform', `scale(1 ${f2(Math.max(sy, 0.0001))})`);
        vis(c.flip, sy > 0.004);
        const sh = 10 + 4 * wA; setA(c.shadow, 'x', -260 + sh); setA(c.shadow, 'y', -100 + sh);
        vis(c.back, shown === 'back');
        vis(c.face, shown === 'face' && a < 0.5); vis(c.actG, shown === 'face' && a >= 0.5);
        if (c.witG) vis(c.witG, shown === 'wit');
        // voile
        let v = 0;
        if (k.people != null && !st.wSet.has(i)) v = pg(t, k.people, 4 * I);
        if (k.first != null && i !== 0) v = Math.max(v, pg(t, k.first, 10 * I));
        setA(c.veil, 'opacity', f2(0.62 * v)); vis(c.veil, v > 0.001);
      }
    }
  });
})();
