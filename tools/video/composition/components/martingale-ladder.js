// Composant `martingale-ladder` (épisode 3) : l'escalier de la martingale. Voir EP3-COMPONENTS.md.
// Une colonne de lignes (tour, mise doublée, pastille rouge = ta mise, bille noire = perdu, cumul des pertes), un compteur géant,
// deux murs (TON ARGENT / PLAFOND DE LA TABLE) et une 11e mise fantôme. Fonction pure du temps ; aplats, aucun dégradé / flou / filter.
// Cues : rule, lose (× n), win, rush, total, eleventh, wall-money, wall-limit.
(() => {
  'use strict';
  const { C, E, clamp, prog, f2, sv, g, rect, circle, text, put, rng, fr, shakeAt } = ZV;
  let UID = 0;
  const NB = ' ';
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const num = (v, d) => (v != null && v !== '' && isFinite(+v) ? +v : d);
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const vis = (n, on) => setA(n, 'visibility', on ? 'visible' : 'hidden');
  // largeur estimée d'un texte Bricolage 800 (sert de textLength, donc indépendante de la police de secours)
  const bw = (s, size) => { let a = 0; for (const ch of String(s)) a += size * (ch === ' ' || ch === ' ' ? 0.26 : /[0-9]/.test(ch) ? 0.6 : /[A-ZÀÂÉÈÊÎÔÛÇ€%+×]/.test(ch) ? 0.66 : /[.,:;'’!|]/.test(ch) ? 0.3 : 0.56); return a; };
  const mw = (s, size) => String(s).length * size * 0.6;                       // Mono : 0,6 em par caractère
  // texte dynamique en Mono : contenu + textLength mis à jour seulement si la chaîne change
  const setTxt = (n, s, size) => { if (n.__s !== s) { n.__s = s; n.textContent = s; n.setAttribute('textLength', f2(Math.max(1, mw(s, size)))); } };

  const RX = 330, RW = 800, RY0 = 170, RH = 100, PH = 86, VIS = 6, CLIP0 = 156, CLIP1 = 786;
  const PX = 1635;                                                              // axe du panneau de droite

  function mkRow(parent, i, bet, cumTxt, gainTxt, ghost) {
    const o = { i, ghost };
    o.g = g(parent);
    o.sh = rect(o.g, RX + 9, 9, RW, PH, 10, C.ink);
    o.pl = rect(o.g, RX, 0, RW, PH, 10, C.pocket, C.paper, 4);
    const cy = PH / 2, base = cy + 18;
    o.n = text(o.g, String(i), RX + 38, cy + 12, 32, '#B9B5A8', { mono: true, anchor: 'middle', len: f2(mw(String(i), 32)) });
    o.bet = text(o.g, bet, RX + 322, base, 50, C.paper, { mono: true, anchor: 'end', len: f2(mw(bet, 50)) });
    o.chip = circle(o.g, RX + 364, cy, 20, C.red, C.ink, 4);
    o.slot = circle(o.g, RX + 430, cy, 27, 'none', C.paper, 4);
    o.slot.setAttribute('stroke-dasharray', '8 7');
    o.q = text(o.g, '?', RX + 430, cy + 11, 32, C.paper, { mono: true, anchor: 'middle', len: f2(mw('?', 32)) });
    o.ball = circle(o.g, RX + 430, cy, 27, C.ink, C.paper, 4);
    o.tag = text(o.g, '', RX + 476, cy + 9, 26, C.paper, { mono: true, anchor: 'start' });
    o.cum = text(o.g, cumTxt, RX + RW - 24, cy + 14, 40, C.red, { mono: true, anchor: 'end', len: f2(mw(cumTxt, 40)) });
    o.gain = text(o.g, gainTxt, RX + RW - 24, cy + 14, 40, C.ink, { mono: true, anchor: 'end', len: f2(mw(gainTxt, 40)) });
    return o;
  }

  ZV.define('martingale-ladder', {
    init(root, shot) {
      const P = shot.props || {};
      const beats = Array.isArray(shot.beats) ? shot.beats : [];
      const dur = isNum(shot.dur) && shot.dur > 0 ? shot.dur : 10;
      const cl = (n) => beats.filter((b) => b && b.do === 'cue' && b.name === n && isNum(b.t)).map((b) => b.t).sort((a, b) => a - b);
      const start = Math.max(1, num(P.start, 10));
      const cur = typeof P.currency === 'string' ? P.currency : '€';
      const maxRows = clamp(Math.round(num(P.max_rows, 10)), 1, 12);
      const limit = num(P.table_limit, 5000), bank = num(P.bankroll, 2500);
      const money = (v) => fr(v) + NB + cur;
      const uid = 'ml' + (++UID);
      const st = { dur, start, cur, maxRows, money, uid };

      /* ---- repères ---- */
      let c = { rule: cl('rule')[0], lose: cl('lose'), win: cl('win')[0], rush: cl('rush')[0], total: cl('total')[0], eleventh: cl('eleventh')[0], wm: cl('wall-money')[0], wl: cl('wall-limit')[0] };
      const none = [c.rule, c.win, c.rush, c.total, c.eleventh, c.wm, c.wl].every((x) => x == null) && !c.lose.length;
      if (none) c = { rule: 0.3, lose: [1.0, 1.6, 2.1], win: null, rush: 2.7, total: 6.0, eleventh: 7.2, wm: 8.6, wl: 10.0 };
      let lossT = c.lose.slice();
      if (c.rush != null) {
        lossT = lossT.filter((x) => x < c.rush);
        let tt = c.rush + 0.15, gap = 0.55;                                      // les lignes s'enchaînent en accélérant (≥ 0,17 s : photosensibilité)
        while (lossT.length < maxRows) { lossT.push(tt); tt += gap; gap = Math.max(0.17, gap * 0.82); }
      }
      if (c.win != null) lossT = lossT.filter((x) => x < c.win);
      lossT = lossT.slice(0, maxRows);
      const tWin = c.win != null && lossT.length < maxRows ? c.win : null;
      const firstEv = [lossT[0], tWin].filter((x) => x != null);
      const tStart = c.rule != null ? c.rule : firstEv.length ? Math.max(0, Math.min(...firstEv) - 0.3) : null;
      const nRows = tStart == null ? 0 : Math.min(lossT.length + 1, maxRows);
      const a = [];                                                              // a[i] = instant d'apparition de la ligne i (1-based) ; nRows+1 = fantôme
      for (let i = 1; i <= nRows; i++) a[i] = i === 1 ? tStart : lossT[i - 2];
      const winRow = tWin != null && nRows >= 1 ? lossT.length + 1 : 0;
      if (winRow) a[winRow] = Math.min(a[winRow], tWin - 0.25);
      const tGhost = c.eleventh != null ? c.eleventh : (c.wl != null ? c.wl : null);
      const ghostI = nRows + 1;
      if (tGhost != null) a[ghostI] = tGhost;
      Object.assign(st, { c, lossT, tWin, tStart, nRows, a, winRow, ghostI, tGhost, nTot: tGhost != null ? ghostI : nRows });
      const cum = (k) => start * (Math.pow(2, k) - 1);                           // cumul après k pertes
      st.cum = cum; st.cumAll = cum(maxRows);

      /* ---- décor ---- */
      rect(root, 0, 0, 1920, 1080, 0, C.ink);
      const bgs = g(root, { transform: 'rotate(-18 960 540)' });
      for (let k = -4; k <= 4; k++) rect(bgs, 960 + k * 300 - 70, -600, 140, 2300, 0, C.pocket);
      const defs = sv('defs', null, root);
      const pt = sv('pattern', { id: uid + 'h', width: 26, height: 26, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
      sv('rect', { x: 0, y: 0, width: 26, height: 26, fill: C.ink }, pt);
      sv('rect', { x: 0, y: 0, width: 12, height: 26, fill: C.lime }, pt);
      const clip = sv('clipPath', { id: uid + 'c' }, defs);
      rect(clip, 0, CLIP0, 1920, CLIP1 - CLIP0, 0, '#000');
      st.world = g(root);
      const W = st.world;

      /* ---- zone gauche : compteur de tour (remplacé par le mur du plafond) ---- */
      st.tour = g(W);
      text(st.tour, 'TOUR', 170, 300, 34, C.paper, { mono: true, anchor: 'middle', spacing: 6 });
      st.tourN = text(st.tour, '1', 170, 470, 190, C.lime, { anchor: 'middle', len: f2(bw('1', 190)) });
      rect(st.tour, 70, 500, 200, 12, 0, C.lime);

      /* ---- bandeau de la règle ---- */
      st.rule = g(W);
      {
        const lab = 'JE DOUBLE À CHAQUE PERTE', size = 48, w = 800, h = 80;
        rect(st.rule, -w / 2 + 10, -h / 2 + 10, w, h, 14, C.paper);
        rect(st.rule, -w / 2, -h / 2, w, h, 14, C.lime, C.paper, 6);
        text(st.rule, lab, 0, size * 0.35, size, C.ink, { anchor: 'middle', len: f2(Math.min(bw(lab, size), 740)) });
      }

      /* ---- ×2 dans le couloir de droite (couvert par le mur d'argent) ---- */
      st.x2 = g(W);
      rect(st.x2, -75 + 8, -50 + 8, 150, 100, 16, C.ink);
      rect(st.x2, -75, -50, 150, 100, 16, C.paper, C.ink, 6);
      text(st.x2, '×2', 0, 26, 76, C.ink, { anchor: 'middle', len: f2(bw('×2', 76)) });

      /* ---- lignes (dans un groupe écrêté) ---- */
      const cg = g(W, { 'clip-path': `url(#${uid}c)` });
      st.rows = [];
      for (let i = 1; i <= nRows; i++) {
        const gain = '+' + NB + money(start);
        st.rows[i] = mkRow(cg, i, money(start * Math.pow(2, i - 1)), money(cum(i)), gain, false);
      }
      if (tGhost != null) {
        const r = mkRow(cg, 11, money(start * Math.pow(2, maxRows)), '', '', true);
        r.n.textContent = String(maxRows + 1); r.n.setAttribute('textLength', f2(mw(String(maxRows + 1), 32)));
        r.pl.setAttribute('stroke-dasharray', '16 10');
        r.chip.setAttribute('visibility', 'hidden'); r.slot.setAttribute('visibility', 'hidden'); r.q.setAttribute('visibility', 'hidden'); r.ball.setAttribute('visibility', 'hidden');
        r.cum.setAttribute('visibility', 'hidden'); r.gain.setAttribute('visibility', 'hidden');
        st.rows[ghostI] = r;
      }

      /* ---- panneau de droite : compteur géant, stickers ---- */
      st.ct = g(W);
      rect(st.ct, PX - 255 + 10, 180 + 10, 510, 240, 16, C.ink);
      st.ctPl = rect(st.ct, PX - 255, 180, 510, 240, 16, C.pocket, C.paper, 6);
      text(st.ct, 'TES PERTES', PX, 236, 34, C.paper, { mono: true, anchor: 'middle', spacing: 6, len: f2(mw('TES PERTES', 34) + 9 * 6) });
      st.ctNum = text(st.ct, '', PX, 366, 92, C.paper, { mono: true, anchor: 'middle' });
      st.stk = g(W);
      {
        const lab = `POUR GAGNER ${money(start)}`, w = 470, h = 86;
        rect(st.stk, -w / 2 + 10, -h / 2 + 10, w, h, 16, C.ink);
        rect(st.stk, -w / 2, -h / 2, w, h, 16, C.paper, C.ink, 6);
        text(st.stk, lab, 0, 16, 46, C.ink, { anchor: 'middle', len: f2(Math.min(bw(lab, 46), w - 50)) });
      }
      st.win = g(W);
      {
        const w = 480, h = 210;
        rect(st.win, -w / 2 + 10, -h / 2 + 10, w, h, 16, C.ink);
        rect(st.win, -w / 2, -h / 2, w, h, 16, C.lime, C.ink, 7);
        const l1 = 'TOUTES TES PERTES', l2 = 'RÉCUPÉRÉES', l3 = '+ ' + money(start);
        text(st.win, l1, 0, -42, 40, C.ink, { anchor: 'middle', len: f2(Math.min(bw(l1, 40), w - 50)) });
        text(st.win, l2, 0, 2, 40, C.ink, { anchor: 'middle', len: f2(Math.min(bw(l2, 40), w - 50)) });
        text(st.win, l3, 0, 76, 76, C.ink, { anchor: 'middle', len: f2(Math.min(bw(l3, 76), w - 50)) });
      }

      /* ---- murs ---- */
      const mkWall = (cx, l1, s1, l2, s2) => {
        const wg = g(W), w = 200, h = 690;
        rect(wg, -w / 2 + 12, -h / 2 + 12, w, h, 6, C.red);
        rect(wg, -w / 2, -h / 2, w, h, 6, C.ink, C.lime, 8);
        rect(wg, -w / 2 + 4, -h / 2 + 4, w - 8, 30, 0, `url(#${uid}h)`);
        rect(wg, -w / 2 + 4, h / 2 - 34, w - 8, 30, 0, `url(#${uid}h)`);
        const tg = g(wg, { transform: 'rotate(-90)' });
        text(tg, l1, 0, -14, s1, C.paper, { anchor: 'middle', len: f2(Math.min(bw(l1, s1), 580)) });
        text(tg, l2, 0, 62, s2, C.lime, { anchor: 'middle', mono: true, len: f2(mw(l2, s2)) });
        return { g: wg, cx };
      };
      st.wm = mkWall(1255, 'TON ARGENT', 68, money(bank), 56);
      st.wl = mkWall(170, 'PLAFOND DE LA TABLE', 48, money(limit), 56);

      /* ---- éclats de l'écrasement ---- */
      const rr = rng(4242);
      st.deb = [];
      for (let k = 0; k < 9; k++) {
        const s = 8 + rr() * 10;
        const n = rect(root, -s / 2, -s / 2, s, s, 1, [C.red, C.paper, C.lime][k % 3], C.ink, 3);
        n.setAttribute('visibility', 'hidden');
        st.deb.push({ n, vx: 120 + rr() * 260, vy: -160 - rr() * 260, rot: rr() * 360 });
      }
      return st;
    },

    update(st, t) {
      try {
        t = clamp(t, 0, st.dur + 1);
        const { c, a, rows, lossT } = st;
        const ph = (t0, d) => (t0 == null ? 0 : prog(t, t0, t0 + d));

        /* secousse globale (écrasement contre le plafond) */
        const tCrash = c.wl != null && st.tGhost != null ? c.wl + 0.45 : null;
        const sh = tCrash != null ? shakeAt(t, tCrash, 12, 0.35) : [0, 0];
        setA(st.world, 'transform', `translate(${f2(sh[0])} ${f2(sh[1])})`);

        /* défilement : la colonne monte quand il y a plus de VIS lignes */
        let off = 0;
        for (let i = VIS + 1; i <= st.nTot; i++) if (a[i] != null) off += E.out3(ph(a[i], 0.35));

        /* état de chaque ligne */
        let shown = 0;
        for (let i = 1; i <= st.nTot; i++) {
          const r = rows[i];
          if (!r) continue;
          const ai = a[i];
          const on = ai != null && t >= ai;
          const y0 = RY0 + (i - 1) * RH - off * RH;
          if (!on || y0 + PH < CLIP0 + 8 || y0 > CLIP1 + 20) { vis(r.g, false); setA(r.g, 'opacity', 0); setA(r.g, 'transform', 'translate(0 0)'); if (on && !r.ghost) shown = i; continue; }
          if (!r.ghost) shown = i;
          const p = E.out3(prog(t, ai, ai + 0.25));
          vis(r.g, true);
          setA(r.g, 'opacity', f2(p));
          if (r.ghost) {
            const crashed = tCrash != null && t >= tCrash;
            const dx = crashed ? 0 : 0;
            setA(r.g, 'transform', `translate(${dx} ${f2(y0 + (1 - p) * 34)})`);
            setA(r.pl, 'stroke', crashed ? C.red : C.paper);
            setA(r.pl, 'stroke-width', crashed ? 6 : 4);
            setTxt(r.tag, crashed ? 'REFUSÉE' : 'TA 11e MISE', 26);
            setA(r.tag, 'fill', crashed ? C.red : C.paper);
            setA(r.sh, 'fill', C.ink);
            continue;
          }
          const lostT = i <= lossT.length ? lossT[i - 1] : null;
          const lost = lostT != null && t >= lostT;
          const won = i === st.winRow && t >= st.tWin;
          const s = lost ? 'lost' : won ? 'won' : 'pend';
          const sk = lost ? shakeAt(t, lostT, 4, 0.22) : [0, 0];
          setA(r.g, 'transform', `translate(${f2(sk[0])} ${f2(y0 + (1 - p) * 34 + sk[1])})`);
          setA(r.pl, 'fill', s === 'won' ? C.lime : s === 'pend' ? C.paper : C.pocket);
          setA(r.pl, 'stroke', s === 'pend' ? C.ink : s === 'won' ? C.ink : C.paper);
          setA(r.pl, 'stroke-width', s === 'lost' ? 4 : 6);
          setA(r.sh, 'fill', s === 'pend' ? C.lime : C.ink);
          setA(r.bet, 'fill', s === 'lost' ? C.paper : C.ink);
          setA(r.n, 'fill', s === 'lost' ? '#B9B5A8' : C.ink);
          vis(r.slot, s === 'pend'); vis(r.q, s === 'pend');
          setA(r.slot, 'stroke', C.ink); setA(r.q, 'fill', C.ink);
          const bp = s === 'pend' ? 0 : E.back(prog(t, s === 'lost' ? lostT : st.tWin, (s === 'lost' ? lostT : st.tWin) + 0.22));
          vis(r.ball, s !== 'pend');
          setA(r.ball, 'fill', s === 'won' ? C.red : C.ink);
          setA(r.ball, 'stroke', s === 'won' ? C.ink : C.paper);
          setA(r.ball, 'r', f2(27 * Math.max(0.01, bp)));
          setTxt(r.tag, s === 'lost' ? 'PERDU' : s === 'won' ? 'ROUGE !' : 'SUR LE ROUGE', 26);
          setA(r.tag, 'fill', s === 'lost' ? C.red : C.ink);
          vis(r.cum, s === 'lost'); vis(r.gain, s === 'won');
        }

        /* règle (bandeau) */
        {
          const p = c.rule != null ? E.back(ph(c.rule, 0.3)) : 0;
          put(st.rule, 730, 98, -1.5, Math.max(p, 0), Math.max(p, 0), c.rule != null && t >= c.rule ? 1 : 0);
        }

        /* compteur de tour (zone gauche) */
        {
          const ts = st.tStart;
          const wl = c.wl != null ? E.in3(ph(c.wl, 0.45)) : 0;
          const n = Math.max(1, Math.min(shown, st.maxRows));
          const s = String(n);
          if (st.tourN.__s !== s) { st.tourN.__s = s; st.tourN.textContent = s; st.tourN.setAttribute('textLength', f2(bw(s, 190))); }
          vis(st.tour, ts != null && t >= ts && wl < 0.5);
        }

        /* ×2 (couloir de droite) */
        {
          const wm = c.wm != null ? E.in3(ph(c.wm, 0.45)) : 0;
          const p = c.rule != null ? E.back(ph(c.rule + 0.2, 0.3)) : (st.tStart != null ? E.back(ph(st.tStart, 0.3)) : 0);
          put(st.x2, 1255, 150, 4, Math.max(p, 0), Math.max(p, 0), wm < 0.5 && p > 0 ? 1 : 0);
        }

        /* compteur géant du cumul */
        {
          let v = 0, lastK = 0;
          for (let k = 0; k < lossT.length; k++) if (t >= lossT[k]) lastK = k + 1;
          if (lastK > 0) {
            const t0 = lossT[lastK - 1];
            v = st.cum(lastK - 1) + (st.cum(lastK) - st.cum(lastK - 1)) * E.out3(prog(t, t0, t0 + 0.3));
          }
          const tt = c.total;
          if (tt != null && t >= tt) v = Math.max(v, st.cum(lastK) + (st.cumAll - st.cum(lastK)) * E.out3(prog(t, tt, tt + 0.5)));
          const on = v > 0;
          const hot = tt != null && t >= tt;
          const sTxt = st.money(Math.round(v));
          const size = Math.min(92, 440 / (sTxt.length * 0.6));
          if (st.ctNum.__s !== sTxt) { st.ctNum.__s = sTxt; st.ctNum.textContent = sTxt; }
          setA(st.ctNum, 'font-size', f2(size)); setA(st.ctNum, 'textLength', f2(mw(sTxt, size)));
          setA(st.ctNum, 'fill', hot ? C.red : C.paper);
          setA(st.ctPl, 'stroke', hot ? C.red : C.paper);
          const q = hot ? prog(t, tt, tt + 0.22) : 1;
          const scl = hot ? 1 + 0.14 * (1 - E.out3(q)) : 1;
          const sk2 = hot ? shakeAt(t, tt + 0.1, 10, 0.4) : [0, 0];
          setA(st.ct, 'transform', `translate(${f2(PX + sk2[0])} ${f2(300 + sk2[1])}) scale(${f2(scl)}) translate(${-PX} -300)`);
          vis(st.ct, on);
        }

        /* sticker « POUR GAGNER 10 € » */
        {
          const tt = c.total != null ? c.total + 0.3 : null;
          const p = tt != null ? E.back(ph(tt, 0.28)) : 0;
          put(st.stk, PX, 505, 2.5, Math.max(p, 0), Math.max(p, 0), tt != null && t >= tt ? 1 : 0);
        }

        /* bandeau de victoire */
        {
          const tw = st.tWin != null ? st.tWin + 0.3 : null;
          const p = tw != null ? E.back(ph(tw, 0.3)) : 0;
          put(st.win, PX, 685, -2.5, Math.max(p, 0), Math.max(p, 0), tw != null && t >= tw ? 1 : 0);
        }

        /* mur de l'argent (tombe de la droite) */
        {
          const tm = c.wm;
          const p = tm != null ? E.in3(ph(tm, 0.45)) : 0;
          const s2 = tm != null ? shakeAt(t, tm + 0.45, 9, 0.35) : [0, 0];
          put(st.wm.g, st.wm.cx + (1 - p) * 900 + s2[0], 450 + s2[1], 0, 1, 1, tm != null && t >= tm ? 1 : 0);
        }
        /* plafond de la table (tombe de la gauche) */
        {
          const tm = c.wl;
          const p = tm != null ? E.in3(ph(tm, 0.45)) : 0;
          const s2 = tm != null ? shakeAt(t, tm + 0.45, 9, 0.35) : [0, 0];
          put(st.wl.g, st.wl.cx - (1 - p) * 600 + s2[0], 450 + s2[1], 0, 1, 1, tm != null && t >= tm ? 1 : 0);
        }

        /* éclats de l'écrasement : la 11e mise contre le plafond */
        {
          const gr = st.rows[st.ghostI];
          const q = tCrash != null ? t - tCrash : -1;
          const ok = gr && q >= 0 && q < 0.6;
          const gy = RY0 + (st.ghostI - 1) * RH - ((() => { let o = 0; for (let i = VIS + 1; i <= st.nTot; i++) if (a[i] != null) o += E.out3(prog(t, a[i], a[i] + 0.35)); return o; })()) * RH + PH / 2;
          for (const d of st.deb) {
            if (!ok) { vis(d.n, false); continue; }
            vis(d.n, true);
            d.n.setAttribute('transform', `translate(${f2(RX + 4 + d.vx * q * 0.5)} ${f2(gy + d.vy * q + 700 * q * q)}) rotate(${f2(d.rot + q * 300)})`);
            setA(d.n, 'opacity', f2(1 - E.in2(q / 0.6)));
          }
        }
      } catch (e) { /* jamais d'exception */ }
    }
  });
})();
