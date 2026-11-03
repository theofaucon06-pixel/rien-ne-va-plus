// Composant `sealed-room` (épisode 6) : la salle sans repères. Voir EP6-COMPONENTS.md.
// Un mur de face (fenêtre, horloge, panneau Sortie, lampe fixe), un sol ink portant la frise du temps (DEHORS / DEDANS), un téléphone final.
// Fonction pure du temps ; aplats, aucun dégradé / flou / lueur / filter ; le ciel change par fondus lents (jamais d'alternance).
// Cues : ask, hours (dur), window-clock, no-window, no-clock, no-exit, no-edges, phone.
(() => {
  'use strict';
  const { C, E, clamp, prog, f2, sv, g, rect, circle, path, line, text } = ZV;
  let UID = 0;
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const num = (v, d) => (v != null && v !== '' && isFinite(+v) ? +v : d);
  const str = (v, d) => (typeof v === 'string' && v.length ? v : d);
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const vis = (n, on) => setA(n, 'visibility', on ? 'visible' : 'hidden');
  const op = (n, o) => { o = clamp(o); setA(n, 'opacity', f2(o)); setA(n, 'visibility', o <= 0.001 ? 'hidden' : 'visible'); };
  const tr = (n, x, y, r, s) => setA(n, 'transform', `translate(${f2(x)} ${f2(y)})` + (r ? ` rotate(${f2(r)})` : '') + (s !== undefined && s !== 1 ? ` scale(${f2(Math.max(s, 0.0001))})` : ''));
  // largeurs estimées (servent de textLength : indépendantes de la police de secours)
  const bw = (s, size) => { let a = 0; for (const ch of String(s)) a += size * (ch === ' ' ? 0.26 : /[0-9]/.test(ch) ? 0.6 : /[A-ZÀÂÉÈÊÎÔÛÇ€%+×≠=?]/.test(ch) ? 0.66 : /[.,:;'’!|]/.test(ch) ? 0.3 : 0.56); return a; };
  const mw = (s, size) => String(s).length * size * 0.6;
  // texte posé avec largeur imposée ; maxW réduit la police plutôt que de laisser déborder
  function T(parent, s, x, y, size, fill, o) {
    o = o || {};
    const est = (sz) => (o.mono ? mw(s, sz) : bw(s, sz));
    if (o.maxW && est(size) > o.maxW) size = size * o.maxW / est(size);
    const n = text(parent, s, x, y, size, fill, { mono: o.mono, anchor: o.anchor, weight: o.weight, spacing: o.spacing });
    n.setAttribute('textLength', f2(est(size)));
    n.setAttribute('lengthAdjust', 'spacingAndGlyphs');
    n.__size = size; n.__w = est(size);
    return n;
  }
  // texte dynamique en Mono : contenu + longueur mis à jour seulement si la chaîne change
  const setTxt = (n, s, size) => { if (n.__s !== s) { n.__s = s; n.textContent = s; n.setAttribute('textLength', f2(Math.max(1, mw(s, size)))); } };
  // sticker plat : renvoie le groupe centré sur (0,0) et sa largeur
  function stk(parent, label, size, fill, textFill, maxW, h) {
    h = h || Math.round(size * 1.75);
    const sz = (maxW && bw(label, size) + 56 > maxW) ? (maxW - 56) / bw(label, size) * size : size;
    const w = Math.round(bw(label, sz) + 56);
    const grp = g(parent);
    rect(grp, -w / 2 + 10, -h / 2 + 10, w, h, 14, C.ink);
    rect(grp, -w / 2, -h / 2, w, h, 14, fill, C.ink, 6);
    T(grp, label, 0, sz * 0.35, sz, textFill, { anchor: 'middle' });
    grp.__w = w;
    return grp;
  }
  const popT = (n, x, y, rot, p) => { const s = E.back(clamp(p)); if (p <= 0) { vis(n, false); return; } vis(n, true); tr(n, x, y, rot, Math.max(0.0001, s)); setA(n, 'opacity', f2(clamp(p * 4))); };

  const CX = 960, CY = 330, CR = 130;                       // horloge murale
  const WX = 190, WY = 170, WW = 400, WH = 390;             // cadre de la fenêtre
  const GX = 200, GY = 180, GW = 380, GH = 370;             // vitre
  const GCX = 390, GCY = 365;                               // croisillon
  const LAB_Y = 604;
  const FX = 190, FW = 1540, FY1 = 668, FY2 = 742, FH = 44; // frise
  const SIGN = { x: 1350, y: 260, w: 380, h: 150 };
  const PH = { x: 1440, y: 110, w: 280, h: 480 };

  function hand(parent, len, w) {
    const grp = g(parent);
    line(grp, 0, 12, 0, -len, C.ink, w);
    return grp;
  }

  ZV.define('sealed-room', {
    init(root, shot) {
      const P = shot.props || {};
      const beats = Array.isArray(shot.beats) ? shot.beats : [];
      const dur = isNum(shot.dur) && shot.dur > 0 ? shot.dur : 10;
      const cb = (n) => beats.filter((b) => b && b.do === 'cue' && b.name === n && isNum(b.t)).sort((a, b) => a.t - b.t);
      const cu = (n) => { const a = cb(n); return a.length ? a[0].t : null; };
      const L = Object.assign({ window: 'FENÊTRE', clock: 'HORLOGE', exit: 'SORTIE' }, P.labels && typeof P.labels === 'object' ? P.labels : {});
      const outside = Array.isArray(P.outside) && P.outside.length ? P.outside.slice(0, 6).map(String) : ['APRÈS-MIDI', 'SOIR', 'NUIT', 'PETIT MATIN'];
      const inside = str(P.inside, 'LA MÊME LUMIÈRE');
      const question = str(P.question, '?? H ??');
      const phoneText = str(P.phone_text, "ALARME : L'HEURE OÙ TU SORS");
      const skyIdx = Math.max(0, ['day', 'sunset', 'night', 'dawn'].indexOf(P.sky));
      const hb = cb('hours')[0];
      const st = {
        dur, L, outside, inside, question, skyIdx,
        ta: cu('ask'), th: hb ? hb.t : null, hd: hb ? clamp(num(hb.dur, 4), 2, 30) : 4,
        twc: cu('window-clock'), tnw: cu('no-window'), tnc: cu('no-clock'), tnx: cu('no-exit'), tne: cu('no-edges'), tp: cu('phone'),
        timeline: !!P.timeline
      };
      const uid = 'sr' + (++UID);

      /* ---- mur, plafond, sol ---- */
      rect(root, 0, 0, 1920, 1080, 0, C.paper);
      rect(root, 0, 0, 1920, 56, 0, C.ink);
      rect(root, 0, 630, 1920, 450, 0, C.ink);

      /* ---- lampe : strictement fixe ---- */
      line(root, 960, 56, 960, 94, C.ink, 6);
      path(root, 'M934 94 L986 94 L1022 146 L898 146 Z', C.ink, C.ink, 4);
      circle(root, 960, 152, 13, C.paper, C.ink, 5);

      /* ---- fenêtre ---- */
      st.win = g(root);
      rect(st.win, WX + 12, WY + 12, WW, WH, 0, C.ink);
      rect(st.win, WX, WY, WW, WH, 0, C.ink);
      const sky = [];
      const sg = (i) => { const n = g(st.win); sky[i] = n; return n; };
      {
        const d = sg(0);
        rect(d, GX, GY, GW, GH, 0, C.white);
        st.sunDay = circle(d, 300, 264, 56, C.lime, C.ink, 5);
        const s = sg(1);
        rect(s, GX, GY, GW, GH, 0, C.red);
        st.sunSet = circle(s, 468, 478, 50, C.red, C.ink, 6);
        const bl = [[200, 54, 48], [254, 40, 72], [294, 62, 40], [356, 36, 86], [392, 56, 52], [448, 44, 68], [492, 38, 44], [530, 50, 78]];
        for (const [x, w, h] of bl) rect(s, x, GY + GH - h, w, h, 0, C.ink);
        const n = sg(2);
        rect(n, GX, GY, GW, GH, 0, C.ink);
        circle(n, 470, 262, 46, C.paper);
        circle(n, 490, 248, 40, C.ink);
        for (const [x, y] of [[240, 236], [322, 300], [350, 212], [292, 430], [520, 378], [548, 230], [440, 480]]) rect(n, x, y, 6, 6, 0, C.paper);
        const w = sg(3);
        rect(w, GX, GY, GW, 200, 0, C.pocket);
        rect(w, GX, GY + 200, GW, GH - 200, 0, C.paper);
        rect(w, GX, GY + 196, GW, 8, 0, C.lime);
      }
      st.sky = sky;
      rect(st.win, GCX - 4, GY, 8, GH, 0, C.ink);
      rect(st.win, GX, GCY - 4, GW, 8, 0, C.ink);
      // graduations de la fenêtre-horloge (ink cerné de paper pour rester lisibles sur la nuit)
      st.ticks = [];
      for (let k = 0; k < 12; k++) {
        const a = k * Math.PI / 6, dx = Math.sin(a), dy = -Math.cos(a);
        const s = Math.min(Math.abs(dx) > 1e-6 ? (GW / 2 - 6) / Math.abs(dx) : 1e9, Math.abs(dy) > 1e-6 ? (GH / 2 - 6) / Math.abs(dy) : 1e9);
        const L1 = k % 3 === 0 ? 36 : 24;
        const x2 = GCX + dx * s, y2 = GCY + dy * s * (GH / GW > 0 ? 1 : 1), x1 = x2 - dx * L1, y1 = y2 - dy * L1;
        const tg = g(st.win);
        line(tg, x1, y1, x2, y2, C.paper, 14, { 'stroke-linecap': 'butt' });
        line(tg, x1, y1, x2, y2, C.ink, 8, { 'stroke-linecap': 'butt' });
        st.ticks.push(tg);
      }
      st.wsun = circle(st.win, 260, 470, 40, C.lime, C.ink, 5);
      // murage
      {
        const clip = sv('clipPath', { id: uid + 'w' }, sv('defs', null, st.win));
        rect(clip, GX, GY, GW, GH, 0, '#000');
        const bg = g(st.win, { 'clip-path': `url(#${uid}w)` });
        st.rows = [];
        for (let r = 0; r < 8; r++) {
          const rg = g(bg), top = GY + GH - 40.25 - 46.25 * r;
          rect(rg, GX, top - 6, GW, 46.25, 0, C.paper);
          const off = r % 2 ? -51 : 0;
          for (let k = 0; k < 5; k++) rect(rg, GX + off + 102 * k, top, 96, 40.25, 0, C.ink);
          st.rows.push(rg);
        }
      }
      st.lblW = T(root, L.window, WX + WW / 2, LAB_Y, 30, C.ink, { mono: true, anchor: 'middle', weight: 800 });
      st.strikeW = rect(root, WX + WW / 2 - 130, LAB_Y - 11, 260, 7, 0, C.red);
      st.stkWin = stk(root, 'UNE FENÊTRE, C\'EST UNE HORLOGE', 36, C.paper, C.ink, 640, 66);

      /* ---- horloge : trace + clou, puis l'horloge ---- */
      st.trace = g(root);
      circle(st.trace, CX, CY, 146, C.white);
      circle(st.trace, CX, CY, 146, 'none', '#CFC9B8', 4).setAttribute('stroke-dasharray', '14 12');
      circle(root, CX, CY - 112, 9, C.ink, C.ink, 3);
      st.clockOuter = g(root);
      st.clock = g(st.clockOuter);
      circle(st.clock, 12, 12, CR + 5, C.ink);
      circle(st.clock, 0, 0, CR, C.paper, C.ink, 10);
      for (let k = 0; k < 12; k++) {
        const a = k * Math.PI / 6, s = Math.sin(a), c = -Math.cos(a), r0 = k % 3 === 0 ? 100 : 104, r1 = 118;
        line(st.clock, s * r0, c * r0, s * r1, c * r1, C.ink, k % 3 === 0 ? 8 : 6, { 'stroke-linecap': 'butt' });
      }
      st.hHour = hand(st.clock, 70, 12);
      st.hMin = hand(st.clock, 102, 8);
      st.qm = T(st.clock, question, 0, 0, 84, C.ink, { anchor: 'middle', maxW: 176 });
      st.qm.setAttribute('y', f2(st.qm.__size * 0.35));
      st.dot = circle(st.clock, 0, 0, 12, C.lime, C.ink, 5);
      st.lblC = T(root, L.clock, CX, LAB_Y, 30, C.ink, { mono: true, anchor: 'middle', weight: 800 });

      /* ---- panneau Sortie ---- */
      st.screws = g(root);
      circle(st.screws, SIGN.x + 22, SIGN.y + 22, 8, C.ink, C.ink, 3);
      circle(st.screws, SIGN.x + SIGN.w - 22, SIGN.y + SIGN.h - 22, 8, C.ink, C.ink, 3);
      st.exit = g(root);
      rect(st.exit, SIGN.x + 12, SIGN.y + 12, SIGN.w, SIGN.h, 6, C.ink);
      rect(st.exit, SIGN.x, SIGN.y, SIGN.w, SIGN.h, 6, C.lime, C.ink, 8);
      {
        const ex = st.exit, cy = SIGN.y + SIGN.h / 2, fx = SIGN.x + 52;
        // silhouette plate qui court (aucun trait de visage)
        circle(ex, fx + 10, cy - 38, 11, C.ink);
        line(ex, fx + 6, cy - 22, fx - 4, cy + 10, C.ink, 13);
        line(ex, fx + 6, cy - 20, fx + 28, cy - 4, C.ink, 10);
        line(ex, fx - 2, cy - 14, fx - 22, cy - 6, C.ink, 9);
        line(ex, fx - 4, cy + 8, fx + 14, cy + 32, C.ink, 11);
        line(ex, fx - 2, cy + 8, fx - 26, cy + 26, C.ink, 11);
        // flèche →
        line(ex, fx + 34, cy, fx + 62, cy, C.ink, 11, { 'stroke-linecap': 'butt' });
        path(ex, `M${fx + 58} ${cy - 20} L${fx + 84} ${cy} L${fx + 58} ${cy + 20} Z`, C.ink, C.ink, 4);
        T(ex, 'SORTIE', SIGN.x + SIGN.w - 18, cy + 22, 64, C.ink, { anchor: 'end', maxW: 206 });
      }
      st.lblX = T(root, L.exit, SIGN.x + SIGN.w / 2, LAB_Y, 30, C.ink, { mono: true, anchor: 'middle', weight: 800 });

      /* ---- frise du temps ---- */
      st.fr = g(root);
      const fr = st.fr;
      st.outG = g(fr);
      {
        const segW = FW / outside.length, cols = [[C.paper, C.ink], [C.red, C.ink], [C.pocket, C.paper], [C.paper, C.ink]];
        outside.forEach((lab, i) => {
          const [bg, fg] = cols[i % 4], x = FX + segW * i;
          rect(st.outG, x, FY1, segW + 0.5, FH, 0, bg);
          if (i % 4 === 3) rect(st.outG, x, FY1 + FH - 12, segW + 0.5, 12, 0, C.lime);
          T(st.outG, lab, x + segW / 2, FY1 + 30, 24, fg, { mono: true, anchor: 'middle', weight: 800, maxW: segW - 24 });
        });
        rect(st.outG, FX, FY1, FW, FH, 0, 'none', C.paper, 4);
        st.lblOut = T(fr, 'DEHORS', 36, FY1 + 30, 24, C.paper, { mono: true, weight: 800 });
        st.strikeOut = rect(fr, FX - 6, FY1 + FH / 2 - 4, FW + 12, 8, 0, C.red);
      }
      st.inFill = rect(fr, FX, FY2, FW, FH, 0, C.paper, C.paper, 4);
      st.inEdge = rect(fr, FX + 6, FY2 + 6, FW - 12, FH - 12, 0, 'none', C.ink, 3);
      st.lblIn = T(fr, 'DEDANS', 36, FY2 + 30, 24, C.paper, { mono: true, weight: 800 });
      T(fr, inside, CX, FY2 + 30, 24, C.ink, { mono: true, anchor: 'middle', weight: 800, maxW: 460 });
      st.cur = g(fr);
      line(st.cur, 0, FY1, 0, FY1 + FH, C.paper, 12, { 'stroke-linecap': 'butt' });
      line(st.cur, 0, FY1, 0, FY1 + FH, C.ink, 5, { 'stroke-linecap': 'butt' });
      path(st.cur, `M-17 ${FY1 - 22} L17 ${FY1 - 22} L0 ${FY1 + 2} Z`, C.ink, C.paper, 4);
      st.capEdges = T(root, "LA SOIRÉE N'A PLUS DE BORDS", CX, FY2 - 20, 30, C.paper, { mono: true, anchor: 'middle', weight: 800, maxW: 1200 });

      /* ---- téléphone ---- */
      st.phone = g(root);
      {
        const ph = st.phone;
        rect(ph, 0, 0, PH.w, PH.h, 44, C.ink);
        rect(ph, 3, 3, PH.w - 6, PH.h - 6, 41, 'none', C.paper, 6);
        rect(ph, 24, 24, PH.w - 48, PH.h - 48, 26, C.paper, C.ink, 4);
        const cx = PH.w / 2, cy = 168;
        circle(ph, cx, cy, 72, C.white, C.ink, 7);
        for (let k = 0; k < 12; k++) {
          const a = k * Math.PI / 6, s = Math.sin(a), c = -Math.cos(a);
          line(ph, cx + s * 52, cy + c * 52, cx + s * 62, cy + c * 62, C.ink, k % 3 === 0 ? 6 : 4, { 'stroke-linecap': 'butt' });
        }
        const hh = g(ph, { transform: `translate(${cx} ${cy}) rotate(300)` }); line(hh, 0, 6, 0, -34, C.ink, 8);
        const hm = g(ph, { transform: `translate(${cx} ${cy}) rotate(60)` }); line(hm, 0, 6, 0, -50, C.ink, 6);
        circle(ph, cx, cy, 8, C.lime, C.ink, 4);
        T(ph, 'ALARME', cx, 318, 26, C.ink, { mono: true, anchor: 'middle', weight: 800 });
        st.track = rect(ph, cx - 66, 342, 132, 66, 33, C.white, C.ink, 6);
        st.knob = circle(ph, cx - 33, 375, 22, C.ink);
        st.onTxt = T(ph, 'ON', cx - 24, 384, 26, C.ink, { mono: true, weight: 800 });
        st.knobX0 = cx - 33; st.knobX1 = cx + 33;
      }
      st.phoneCap = T(root, phoneText, PH.x + PH.w / 2, 690, 28, C.paper, { mono: true, anchor: 'middle', weight: 800, maxW: 560 });
      st.stkPhone = stk(root, 'TON TÉLÉPHONE, LUI, A UNE HORLOGE', 38, C.lime, C.ink, 1000, 68);
      st.phoneStkX = clamp(Math.min(PH.x + PH.w / 2, 1840 - st.stkPhone.__w / 2), st.stkPhone.__w / 2 + 40, 1880);
      return st;
    },

    update(st, t) {
      try {
        t = clamp(t, 0, st.dur + 1);
        const { ta, th, hd, twc, tnw, tnc, tnx, tne, tp } = st;
        const has = (x) => x != null && t >= x;

        /* ---- ciel : fondus lents par paliers, jamais d'alternance ---- */
        const o = [1, 0, 0, 0];
        for (let j = 1; j < 4; j++) o[j] = j <= st.skyIdx ? 1 : 0;
        if (has(th)) {
          const f = clamp(hd / 4 * 0.8, 0.4, 0.6);
          for (let j = 1; j < 4; j++) o[j] = prog(t, th + hd * j / 4, th + hd * j / 4 + f);
        }
        for (let j = 0; j < 4; j++) op(st.sky[j], o[j]);
        const sunsOn = !has(twc);
        vis(st.sunDay, sunsOn); vis(st.sunSet, sunsOn);

        /* ---- fenêtre-horloge ---- */
        const wcP = twc == null ? 0 : t - twc;
        st.ticks.forEach((tk, k) => op(tk, twc == null ? 0 : prog(wcP, k * 0.045, k * 0.045 + 0.12)));
        if (!has(twc)) vis(st.wsun, false);
        else {
          const u = E.io2(prog(wcP, 0.4, 2.4));
          const x = 260 + 260 * u, y = 478 - 215 * Math.sin(Math.PI * u);
          vis(st.wsun, true); setA(st.wsun, 'cx', f2(x)); setA(st.wsun, 'cy', f2(y));
        }
        popT(st.stkWin, 390, 106, -2, twc == null ? 0 : prog(wcP, 0.2, 0.55));

        /* ---- murage ---- */
        const BR = 0.15;
        st.rows.forEach((rg, r) => {
          const p = tnw == null ? 0 : prog(t, tnw + r * BR, tnw + r * BR + 0.12);
          op(rg, p > 0 ? 1 : 0);
          tr(rg, 0, (1 - p) * 14, 0, 1);
        });
        const endBr = tnw == null ? 1e9 : tnw + 8 * BR;
        const sP = tnw == null ? 0 : prog(t, endBr + 0.05, endBr + 0.3);
        const swapW = tnw != null && t >= endBr + 0.3;
        setTxt(st.lblW, swapW ? 'PAS DE FENÊTRE' : st.L.window, 30);
        vis(st.strikeW, tnw != null && sP > 0 && !swapW);
        if (sP > 0) { setA(st.strikeW, 'x', f2(390 - st.lblW.__w / 2 - 6)); setA(st.strikeW, 'width', f2((st.lblW.__w + 12) * sP)); }
        // centrage des étiquettes changeantes (textLength fixe : on recalcule l'ancre via text-anchor middle)

        /* ---- horloge murale ---- */
        let hOp = 1, qOp = 0;
        if (has(ta)) { hOp = 1 - prog(t, ta, ta + 8 / 30); qOp = prog(t, ta + 0.1, ta + 0.4); }
        if (has(th) && ta != null && th > ta) { hOp = prog(t, th, th + 0.25); qOp = 1 - prog(t, th, th + 0.2); }
        else if (has(th) && ta == null) { hOp = 1; qOp = 0; }
        let rotH = 305, rotM = 60;
        if (th != null) { const u = E.io2(prog(t, th, th + hd)); rotH += 360 * u; rotM += 360 * 12 * u; }
        setA(st.hHour, 'transform', `rotate(${f2(rotH)})`);
        setA(st.hMin, 'transform', `rotate(${f2(rotM)})`);
        op(st.hHour, hOp); op(st.hMin, hOp); op(st.qm, qOp); op(st.dot, 1 - qOp);
        let sway = 0;
        if (ta != null) { const tau = t - ta; if (tau >= 0 && tau <= 1) sway = 4 * Math.sin(tau * Math.PI * 4) * (1 - tau); }
        let dy = 0;
        if (tnc != null) {
          dy = -40 * E.out2(prog(t, tnc, tnc + 0.3)) - 620 * E.in3(prog(t, tnc + 0.3, tnc + 0.7));
        }
        const gone = tnc != null && t >= tnc + 0.7;
        vis(st.clockOuter, !gone);
        setA(st.clockOuter, 'transform', `translate(${CX} ${f2(CY + dy)}) rotate(${f2(sway)})`);
        setA(st.clock, 'transform', 'translate(0 0)');
        op(st.trace, tnc != null && t >= tnc + 0.3 ? 1 : 0);
        setTxt(st.lblC, gone ? "PAS D'HORLOGE" : st.L.clock, 30);

        /* ---- panneau Sortie ---- */
        const slideNx = tnx == null ? 0 : E.in2(prog(t, tnx, tnx + 14 / 30));
        const slideP = tp == null ? 0 : E.in2(prog(t, tp, tp + 10 / 30));
        const sx = Math.max(slideNx, slideP) * 640;
        setA(st.exit, 'transform', `translate(${f2(sx)} 0)`);
        vis(st.exit, sx < 639);
        const swapX = tnx != null && t >= tnx + 14 / 30;
        setTxt(st.lblX, swapX ? 'PAS DE PANNEAU SORTIE' : st.L.exit, 30);
        setA(st.lblX, 'transform', `translate(${f2(slideP * 640)} 0)`);
        vis(st.lblX, slideP < 0.999);

        /* ---- frise ---- */
        let tf = null;
        if (st.timeline) tf = -1;
        else { const c = [th, tne].filter((x) => x != null); if (c.length) tf = Math.min(...c); }
        let frOp = tf == null ? 0 : (tf < 0 ? 1 : prog(t, tf, tf + 0.35));
        if (tp != null) frOp *= 1 - prog(t, tp, tp + 8 / 30);
        op(st.fr, frOp);
        setA(st.fr, 'transform', `translate(0 ${f2(tf != null && tf >= 0 ? 24 * (1 - prog(t, tf, tf + 0.35)) : 0)})`);
        // curseur
        let curOp = th == null ? 0 : 1;
        if (tne != null) curOp *= 1 - prog(t, tne, tne + 0.2);
        op(st.cur, curOp);
        if (th != null) setA(st.cur, 'transform', `translate(${f2(FX + FW * clamp((t - th) / hd))} 0)`);
        // plus de bords
        let stP = 0, outP = 1, capP = 0, sXP = 0;
        if (tne != null) {
          sXP = prog(t, tne, tne + 0.35);
          const tfade = tne + 0.5;
          outP = 1 - prog(t, tfade, tfade + 0.25);
          stP = E.io2(prog(t, tfade + 0.15, tfade + 0.95));
          capP = prog(t, tfade + 0.5, tfade + 0.8);
        }
        op(st.outG, outP); op(st.lblOut, outP);
        op(st.strikeOut, outP > 0 && sXP > 0 ? 1 : 0);
        setA(st.strikeOut, 'width', f2((FW + 12) * sXP));
        const bx = FX + (-40 - FX) * stP, bwid = FW + (2000 - FW) * stP;
        setA(st.inFill, 'x', f2(bx)); setA(st.inFill, 'width', f2(bwid));
        setA(st.inEdge, 'x', f2(bx + 6)); setA(st.inEdge, 'width', f2(bwid - 12));
        op(st.lblIn, 1 - prog(t, tne == null ? 1e9 : tne + 0.65, tne == null ? 1e9 : tne + 0.85));
        op(st.capEdges, capP * (tp == null ? 1 : 1 - prog(t, tp, tp + 8 / 30)));

        /* ---- téléphone ---- */
        const pIn = tp == null ? 0 : E.out3(prog(t, tp + 0.3, tp + 0.85));
        vis(st.phone, pIn > 0);
        setA(st.phone, 'transform', `translate(${PH.x} ${f2(PH.y + (1 - pIn) * 1000)})`);
        const sw = tp == null ? 0 : E.io2(prog(t, tp + 1.1, tp + 1.3));
        setA(st.knob, 'cx', f2(st.knobX0 + (st.knobX1 - st.knobX0) * sw));
        setA(st.track, 'fill', sw > 0.5 ? C.lime : C.white);
        op(st.onTxt, sw > 0.5 ? 1 : 0);
        op(st.phoneCap, tp == null ? 0 : prog(t, tp + 0.9, tp + 1.15));
        popT(st.stkPhone, st.phoneStkX, 756, 0, tp == null ? 0 : prog(t, tp + 1.5, tp + 1.85));
      } catch (e) { /* jamais d'exception */ }
    }
  });
})();
