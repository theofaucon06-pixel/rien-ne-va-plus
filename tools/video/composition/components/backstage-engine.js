// Composant `backstage-engine` (épisode 0) : « l'autre côté du décor ». Une façade de casino générique pivote, révèle son dos, puis la vraie machine : la case du zéro devenue volant moteur,
// courroie, compteur de tours, goulotte à jetons, caisse de la maison qui se remplit.
// Props : sign, house, rpm, start (facade|engine), caption, labels[3].
// Cues : facade, turn, engine, belt, label-1..3, house, front.
// Cue absent : chaîne facade/turn/engine = l'étape suivante d'une étape présente n'a pas lieu (un plan « facade » seul reste sur la façade) ; sans aucun cue de la chaîne, l'état final (dos rangé + machine) est là dès t = 0 ;
// belt / labels / house absents = affichés dès que le volant existe ; front absent = n'a pas lieu.
// Fonction pure du temps ; aplats, aucun dégradé / flou / lueur / filter ; rien d'important sous y = 840.
(() => {
  'use strict';
  const { C, F, E, clamp, f2, sv, g, rect, circle, path, line, text } = ZV;
  const I = 1 / 30;
  const INF = Infinity;
  // progression 0→1 qui tolère ±Infinity
  const pg = (t, a, d) => (a === -INF ? 1 : a === INF ? 0 : clamp((t - a) / d));
  const num = (v, d) => (v != null && v !== '' && isFinite(+v) ? +v : d);
  const str = (v, d) => (typeof v === 'string' && v.trim().length ? v.trim() : d);
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const vis = (n, on) => setA(n, 'display', on ? 'inline' : 'none');
  const tr = (n, x, y, r, sx, sy) => { let s = `translate(${f2(x)} ${f2(y)})`; if (r) s += ` rotate(${f2(r)})`; if (sx !== undefined && (sx !== 1 || (sy !== undefined && sy !== 1))) s += ` scale(${f2(Math.max(sx, 0.0001))} ${f2(Math.max(sy === undefined ? sx : sy, 0.0001))})`; setA(n, 'transform', s); };
  const setT = (n, s) => { if (n.__t !== s) { n.__t = s; n.textContent = s; } };
  function metric(root) {
    const probe = sv('text', { x: 0, y: -3000, 'font-size': 100, 'font-weight': 800, visibility: 'hidden' }, root);
    const cache = {};
    const est = (s, mono) => { let a = 0; for (const ch of s) a += mono ? 60 : (ch === ' ' ? 26 : /[0-9]/.test(ch) ? 60 : /[A-ZÀÂÉÈÊÎÔÛÇ€%+×≠=?]/.test(ch) ? 68 : /[.,:;'’!|·]/.test(ch) ? 32 : 58); return a; };
    return (s, size, mono) => {
      s = String(s); const k = (mono ? 'm' : 'd') + s; let w = cache[k];
      if (w === undefined) {
        probe.setAttribute('font-family', mono ? F.mono : F.display); probe.textContent = s;
        w = 0; try { w = probe.getComputedTextLength(); } catch (e) { w = 0; }
        if (!(w > 0)) w = est(s, mono);
        cache[k] = w;
      }
      return w * size / 100;
    };
  }
  const mkT = (M) => function T(parent, s, x, y, size, fill, o) {
    o = o || {}; s = String(s);
    let w = M(s, size, o.mono);
    if (o.maxW && w > o.maxW) { size = Math.max(o.min || 10, size * o.maxW / w); w = M(s, size, o.mono); }
    const n = text(parent, s, x, y, f2(size), fill, { mono: o.mono, anchor: o.anchor, spacing: o.spacing });
    if (!o.free) { const lim = o.maxW ? Math.min(w, o.maxW) : w; n.setAttribute('textLength', f2(lim)); n.setAttribute('lengthAdjust', 'spacingAndGlyphs'); w = lim; }
    n.__w = w; n.__s = size; return n;
  };
  // barre épaisse bordée : ligne `border` large dessous, ligne `fill` dessus
  function beam(parent, x1, y1, x2, y2, w, fill, border, bw) {
    line(parent, x1, y1, x2, y2, border, w + 2 * bw, { 'stroke-linecap': 'butt' });
    line(parent, x1, y1, x2, y2, fill, w, { 'stroke-linecap': 'butt' });
  }
  // sticker centré sur (0,0)
  function stk(parent, label, size, fill, tfill, maxW, minS, M, T) {
    const grp = g(parent);
    let s = size, w = M(label, s);
    if (w > maxW) { s = Math.max(minS, size * maxW / w); w = Math.min(M(label, s), maxW); }
    const bw = Math.round(w + 60), bh = Math.round(s * 1.18 + 26);
    rect(grp, -bw / 2 + 10, -bh / 2 + 10, bw, bh, 14, C.ink);
    rect(grp, -bw / 2, -bh / 2, bw, bh, 14, fill, C.ink, 6);
    T(grp, label, 0, s * 0.35, s, tfill, { anchor: 'middle', maxW: w + 0.5 });
    grp.__w = bw; grp.__h = bh; return grp;
  }
  // tangentes extérieures de deux cercles : [haute, basse] = [[p1,p2],[p1,p2]] (p1 sur c1, p2 sur c2)
  function tang(x1, y1, r1, x2, y2, r2) {
    const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy) || 1, ph = Math.atan2(dy, dx);
    const a = Math.acos(clamp((r1 - r2) / d, -1, 1));
    const mk = (th) => { const nx = Math.cos(th), ny = Math.sin(th); return [[x1 + r1 * nx, y1 + r1 * ny], [x2 + r2 * nx, y2 + r2 * ny]]; };
    return [mk(ph - a), mk(ph + a)];
  }
  let UID = 0;

  ZV.define('backstage-engine', {
    init(root, shot) {
      const P = shot.props || {};
      const M = metric(root), T = mkT(M);
      const sh = { beats: shot.beats || [] };
      const cu = (n) => { const v = ZV.cue(sh, n); return v == null ? null : v; };
      const startEng = str(P.start, 'facade') === 'engine';
      const sign = str(P.sign, 'CASINO').toUpperCase(), house = str(P.house, 'LA MAISON').toUpperCase();
      const caption = typeof P.caption === 'string' ? P.caption.trim() : 'L’AUTRE CÔTÉ DU DÉCOR';
      const dl = ['À CHAQUE TOUR', 'SANS PAUSE', 'SANS MAUVAISE SOIRÉE'];
      const labelsP = Array.isArray(P.labels) ? P.labels : dl;
      const labels = [0, 1, 2].map((i) => str(labelsP[i], dl[i]).toUpperCase());
      const rpm = clamp(num(P.rpm, 30), 1, 90);
      const st = { rpm, startEng };

      // ---- calendrier effectif
      const cF = cu('facade'), cT = cu('turn'), cE = cu('engine'), cB = cu('belt'), cH = cu('house'), cFr = cu('front');
      const cL = [cu('label-1'), cu('label-2'), cu('label-3')];
      const k = st.k = {};
      if (startEng) {
        k.fac = INF; k.turn = -INF; k.eng = cE != null ? cE : -INF;
      } else {
        const hasF = cF != null, hasT = cT != null;
        k.fac = hasF ? cF : -INF;
        k.turn = hasT ? cT : (hasF ? INF : -INF);
        k.eng = cE != null ? cE : ((hasF || hasT) ? INF : -INF);
      }
      k.belt = Math.max(cB != null ? cB : -INF, k.eng);
      k.lab = cL.map((c) => Math.max(c != null ? c : -INF, k.eng));
      k.house = cH != null ? cH : -INF;
      k.front = cFr != null ? cFr : INF;
      k.tRot = cE != null ? cE : -1.2;
      k.cap = k.turn === INF ? INF : (k.turn === -INF ? -INF : k.turn + 18 * I);
      k.gate = k.belt + 0.6;

      // ---- décor fixe
      rect(root, 0, 0, 1920, 1080, 0, C.ink);
      rect(root, 80, 766, 1760, 8, 0, C.paper);

      // vignette (front) : cadre
      const vig = st.vig = g(root);
      rect(vig, -120 + 8, -110 + 8, 240, 220, 0, C.pocket);
      rect(vig, -120, -110, 240, 220, 0, C.ink, C.lime, 6);

      // ---- machine : courroie
      const beltG = st.beltG = g(root);
      st.ringW = circle(beltG, 0, 0, 208, 'none', C.paper, 10); st.ringW.setAttribute('stroke-dasharray', '18 18');
      st.ringP = circle(beltG, 0, 0, 56, 'none', C.paper, 10); st.ringP.setAttribute('stroke-dasharray', '18 18');
      st.bTop = line(beltG, 0, 0, 0, 0, C.paper, 10, { 'stroke-dasharray': '18 18', 'stroke-linecap': 'butt' });
      st.bBot = line(beltG, 0, 0, 0, 0, C.paper, 10, { 'stroke-dasharray': '18 18', 'stroke-linecap': 'butt' });

      // goulotte
      const chS = [975, 580], chE = [1650, 486];
      st.chS = chS; st.chE = chE;
      const chL = Math.hypot(chE[0] - chS[0], chE[1] - chS[1]), chA = Math.atan2(chE[1] - chS[1], chE[0] - chS[0]) * 180 / Math.PI;
      st.chA = chA;
      const chute = st.chute = g(root);
      rect(chute, 6, -20 + 8, chL, 40, 0, C.pocket);
      rect(chute, 0, -20, chL, 40, 0, C.paper, C.ink, 6);
      line(chute, 6, 8, chL - 6, 8, C.ink, 4, { 'stroke-linecap': 'butt' });

      // caisse
      const crate = st.crate = g(root);
      rect(crate, 1512, 482, 300, 270, 0, C.pocket);
      rect(crate, 1500, 470, 300, 270, 0, C.paper, C.ink, 8);
      rect(crate, 1570, 477, 160, 14, 0, C.ink);
      st.houseLab = g(crate);
      const hl = st.houseLab;
      const hw = Math.min(268, Math.max(150, M(house, 54) + 44));
      rect(hl, -hw / 2, -25, hw, 50, 6, C.ink);
      T(hl, house, 0, 19, 54, C.paper, { anchor: 'middle', maxW: hw - 36, min: 28 });
      rect(crate, 1530, 560, 240, 160, 0, C.pocket, C.ink, 6);
      st.gauge = rect(crate, 1533, 717, 234, 0.01, 0, C.lime);
      let tk = ''; for (let y = 717 - 8; y > 563; y -= 8) tk += `M1533 ${y}H1767`;
      path(crate, tk, 'none', C.ink, 2, { opacity: 0.55 });
      st.hOut = rect(crate, 1523, 553, 254, 174, 0, 'none', C.lime, 8);

      // compteur
      const cnt = st.cnt = g(root);
      rect(cnt, 1510, 230, 300, 160, 0, C.pocket);
      rect(cnt, 1500, 220, 300, 160, 0, C.ink, C.paper, 6);
      T(cnt, 'TOURS', 1650, 205, 26, C.paper, { anchor: 'middle', mono: true, maxW: 200, free: true });
      const cid = 'zvbe' + (++UID);
      const defs = sv('defs', null, cnt);
      const cp = sv('clipPath', { id: cid }, defs);
      sv('rect', { x: 1530, y: 244, width: 240, height: 112 }, cp);
      const dg = g(cnt, { 'clip-path': `url(#${cid})` });
      st.dig = [];
      for (let i = 0; i < 4; i++) {
        const x = 1650 + (i - 1.5) * 58;
        const a = text(dg, '0', x, 332, 90, C.lime, { anchor: 'middle', mono: true, weight: 800 });
        const b = text(dg, '0', x, 432, 90, C.lime, { anchor: 'middle', mono: true, weight: 800 });
        st.dig.push({ a, b });
      }

      // poulie
      const pul = st.pul = g(root);
      circle(pul, 0, 0, 50, C.paper, C.ink, 6);
      const pr = st.pulRot = g(pul);
      for (let i = 0; i < 3; i++) { const a = i * 60 * ZV.D2R; line(pr, -34 * Math.cos(a), -34 * Math.sin(a), 34 * Math.cos(a), 34 * Math.sin(a), C.ink, 8, { 'stroke-linecap': 'butt' }); }
      circle(pul, 0, 0, 10, C.ink);

      // volant
      const wheel = st.wheel = g(root);
      circle(wheel, 0, 0, 200, C.lime, C.ink, 8);
      const rot = st.rot = g(wheel);
      for (let i = 0; i < 6; i++) { const a = i * 60 * ZV.D2R; line(rot, 62 * Math.cos(a), 62 * Math.sin(a), 160 * Math.cos(a), 160 * Math.sin(a), C.ink, 14, { 'stroke-linecap': 'butt' }); }
      for (let i = 0; i < 12; i++) { const n = rect(rot, -10, -196, 20, 28, 0, C.ink); n.setAttribute('transform', `rotate(${i * 30})`); }
      circle(rot, 128, 0, 15, C.red, C.ink, 4);
      const z = text(wheel, '0', 0, 82, 230, C.ink, { anchor: 'middle' });
      z.setAttribute('stroke', C.lime); z.setAttribute('stroke-width', 16); z.setAttribute('stroke-linejoin', 'round'); z.setAttribute('paint-order', 'stroke');

      // jetons
      st.tok = [];
      for (let i = 0; i < 3; i++) {
        const tg = g(root);
        circle(tg, 0, 0, 18, C.white, C.ink, 4);
        circle(tg, 0, 0, 11, 'none', C.lime, 3);
        st.tok.push(tg);
      }

      // ---- panneau (façade / dos), repère local centré sur (0,0) = (960,450)
      const panel = st.panel = g(root);
      const face = st.face = g(panel), back = st.back = g(panel);
      beam(face, -560, 0, -650, 320, 14, C.ink, C.paper, 4); beam(face, 560, 0, 650, 320, 14, C.ink, C.paper, 4);
      rect(face, -620 + 14, -300 + 14, 1240, 600, 0, C.pocket);
      rect(face, -560, 300, 70, 20, 0, C.ink, C.paper, 4); rect(face, 490, 300, 70, 20, 0, C.ink, C.paper, 4);
      rect(face, -620, -300, 1240, 600, 0, C.paper, C.ink, 8);
      rect(face, -617, -297, 1234, 97, 0, C.ink, C.paper, 6);
      const sg = T(face, sign, 0, -215, 110, C.paper, { anchor: 'middle', maxW: 900, min: 60 });
      sg.setAttribute('y', f2(-250 + 0.365 * sg.__s));
      st.bulbs = [];
      for (let i = 0; i < 14; i++) st.bulbs.push(circle(face, -560 + i * (1120 / 13), -166, 12, C.pocket, C.ink, 3));
      [-540, -400, -260, 260, 400, 540].forEach((cx) => {
        rect(face, cx - 35, -130, 70, 370, 0, C.paper, C.ink, 6);
        rect(face, cx - 45, -140, 90, 18, 0, C.ink);
        rect(face, cx - 45, 224, 90, 16, 0, C.ink);
        line(face, cx - 12, -112, cx - 12, 222, C.ink, 4, { 'stroke-linecap': 'butt' }); line(face, cx + 12, -112, cx + 12, 222, C.ink, 4, { 'stroke-linecap': 'butt' });
      });
      rect(face, -616, 240, 1232, 20, 0, C.ink);
      rect(face, -200, -100, 400, 34, 0, C.ink);
      for (let i = 0; i < 5; i++) circle(face, -160 + i * 80, -83, 7, C.lime);
      path(face, 'M-150 240 L150 240 L230 320 L-230 320 Z', C.red, C.ink, 6);
      rect(face, -170, -52, 164, 292, 0, C.pocket, C.ink, 6); rect(face, 6, -52, 164, 292, 0, C.pocket, C.ink, 6);
      circle(face, -24, 100, 11, C.lime, C.ink, 3); circle(face, 24, 100, 11, C.lime, C.ink, 3);
      // dos : cadre ouvert
      ['M-620 60 L-620 320 L-790 320 Z', 'M620 60 L620 320 L790 320 Z'].forEach((d) => { path(back, d, 'none', C.paper, 30); path(back, d, 'none', C.ink, 20); });
      beam(back, -594, -274, 0, 274, 26, C.paper, C.ink, 5); beam(back, 594, -274, 0, 274, 26, C.paper, C.ink, 5);
      rect(back, -560, 300, 70, 20, 0, C.paper, C.ink, 5); rect(back, 490, 300, 70, 20, 0, C.paper, C.ink, 5);
      rect(back, -620, -300, 26, 600, 0, C.paper, C.ink, 5); rect(back, 594, -300, 26, 600, 0, C.paper, C.ink, 5);
      rect(back, -620, -300, 1240, 26, 0, C.paper, C.ink, 5); rect(back, -620, 274, 1240, 26, 0, C.paper, C.ink, 5);
      rect(back, -594, -22, 1188, 44, 0, C.paper, C.ink, 5);
      text(back, 'DÉCOR · FACE A', 0, 10, 28, C.ink, { anchor: 'middle', mono: true, spacing: 3 });
      [[-630, -150, 34, 52], [596, 130, 34, 52]].forEach((c) => { rect(back, c[0], c[1], c[2] + 8, c[3], 3, C.red, C.ink, 4); line(back, c[0] + c[2] / 2 + 4, c[1] - 12, c[0] + c[2] / 2 + 4, c[1], C.paper, 6, { 'stroke-linecap': 'butt' }); });
      rect(back, 230, -304, 52, 34, 3, C.red, C.ink, 4);

      // ---- stickers
      st.lab = [];
      const labSpec = [[C.lime, C.ink, -4, 520], [C.paper, C.ink, 3, 480], [C.red, C.paper, -2, 620]];
      for (let i = 0; i < 3; i++) {
        const o = g(root), s = stk(o, labels[i], 44, labSpec[i][0], labSpec[i][1], labSpec[i][3], 30, M, T);
        let x, y;
        if (i === 0) { x = Math.max(1120, 1012 + s.__w / 2); y = 624; }
        else if (i === 1) { x = 1180; y = 172; }
        else { x = 80 + s.__w / 2; y = 196; }
        st.lab.push({ g: o, x, y, r: labSpec[i][2] });
      }
      st.capG = null;
      if (caption) { const o = g(root); stk(o, caption.toUpperCase(), 56, C.paper, C.ink, 1200, 36, M, T); st.capG = o; }
      return st;
    },

    update(st, t, shot) {
      const k = st.k;
      const r = st.rpm / 60; // tours/s
      const A = (tt) => { const tau = tt - k.tRot; if (!(tau > 0)) return 0; return tau < 0.8 ? r * tau * tau / 1.6 : r * (tau - 0.4); };
      const Tk = (n) => k.tRot + (n <= 0.4 * r ? Math.sqrt(1.6 * n / r) : n / r + 0.4);
      const engOn = t >= k.eng;
      const frontOn = t >= k.front;
      const fp = pg(t, k.front, 14 * I);

      // ---------- panneau
      let pu, theta;
      const piv = Math.PI * (1 - E.io2(pg(t, k.front + 0.2, 18 * I)));
      if (st.startEng) {
        pu = 1 - E.out3(fp); theta = piv;
      } else {
        const se = E.out3(pg(t, k.eng, 14 * I));
        pu = se * (1 - E.out3(fp));
        theta = frontOn && se > 0 ? piv : Math.PI * E.io2(pg(t, k.turn, 18 * I));
      }
      const pshow = st.startEng ? frontOn : t >= k.fac;
      const xs = st.startEng ? -300 : 246;
      const px = 960 + (xs - 960) * pu, py = 450 + (670 - 450) * pu, ps = 1 - 0.7 * pu;
      let fy = 0, fx = 0;
      if (!st.startEng && k.fac > -INF && k.fac < INF && t >= k.fac) {
        const q = t - k.fac;
        if (q < 0.32) fy = -760 * (1 - (q / 0.32) * (q / 0.32));
        else if (q < 0.42) fy = -10 * Math.sin(Math.PI * (q - 0.32) / 0.1);
        const s = ZV.shakeAt(t, k.fac + 0.32, 6, 0.3); fx = s[0]; fy += s[1];
      }
      const sx = Math.abs(Math.cos(theta));
      vis(st.panel, pshow && sx > 0.004);
      tr(st.panel, px + fx, py + fy, 0, ps * Math.max(sx, 0.0001), ps);
      const onFace = theta < Math.PI / 2;
      vis(st.face, onFace); vis(st.back, !onFace);

      // ampoules
      let base = null;
      if (frontOn) { const pe = k.front + 0.2 + 18 * I; if (t >= pe) base = pe; }
      else if (t < k.turn) base = k.fac > -INF ? k.fac + 0.4 : -1;
      if (base !== null && onFace) {
        const stp = Math.floor(Math.max(0, t - base - 0.95) * 2);
        for (let i = 0; i < 14; i++) setA(st.bulbs[i], 'fill', t >= base + i * 2 * I ? [C.lime, C.paper, C.red][(i + stp) % 3] : C.pocket);
      } else for (let i = 0; i < 14; i++) setA(st.bulbs[i], 'fill', C.pocket);

      // ---------- volant
      const wp = engOn ? Math.max(0, E.back(pg(t, k.eng, 10 * I))) : 0;
      const fw = E.out3(fp);
      const wx = 820 + 900 * fw, wy = 430 + 240 * fw, wsc = (1 - 0.5 * fw) * wp;
      vis(st.wheel, engOn && wsc > 0.002);
      tr(st.wheel, wx, wy, 0, Math.max(wsc, 0.0001));
      setA(st.rot, 'transform', `rotate(${f2((360 * A(t)) % 360)})`);
      const vp = frontOn ? pg(t, k.front, 8 * I) : 0;
      vis(st.vig, vp > 0); tr(st.vig, 1720, 670, 0, Math.max(E.back(vp), 0.0001));

      // ---------- courroie, compteur, caisse
      const ex = frontOn ? E.in2(pg(t, k.front, 10 * I)) : 0;
      const gone = frontOn && ex >= 1;
      const e0 = E.out3(pg(t, k.belt, 12 * I));
      const e1 = E.out3(pg(t, k.belt + 3 * I, 12 * I));
      const e2 = E.out3(pg(t, k.belt + 6 * I, 12 * I));
      const on0 = t >= k.belt && !gone;
      const dB = 700 * (1 - e0) + 700 * ex, dC = 450 * (1 - e1) + 500 * ex, dK = 450 * (1 - e2) + 500 * ex;
      vis(st.beltG, on0); vis(st.pul, on0);
      if (on0) {
        const pcx = 1420 + dB, pcy = 300;
        tr(st.pul, pcx, pcy, 0, 1);
        const rw = Math.max(1, 208 * wsc);
        const s = 480 * A(t);
        const off = f2(-(s % 36));
        const tg = tang(wx, wy, rw, pcx, pcy, 56);
        const L1 = st.bTop, L2 = st.bBot;
        setA(L1, 'x1', f2(tg[0][0][0])); setA(L1, 'y1', f2(tg[0][0][1])); setA(L1, 'x2', f2(tg[0][1][0])); setA(L1, 'y2', f2(tg[0][1][1]));
        setA(L2, 'x1', f2(tg[1][1][0])); setA(L2, 'y1', f2(tg[1][1][1])); setA(L2, 'x2', f2(tg[1][0][0])); setA(L2, 'y2', f2(tg[1][0][1]));
        setA(L1, 'stroke-dashoffset', off); setA(L2, 'stroke-dashoffset', off);
        setA(st.ringW, 'cx', f2(wx)); setA(st.ringW, 'cy', f2(wy)); setA(st.ringW, 'r', f2(rw)); setA(st.ringW, 'stroke-dashoffset', off);
        setA(st.ringP, 'cx', f2(pcx)); setA(st.ringP, 'cy', pcy); setA(st.ringP, 'stroke-dashoffset', off);
        setA(st.pulRot, 'transform', `rotate(${f2(((s / 50) * 180 / Math.PI) % 360)})`);
      }
      vis(st.cnt, on0); vis(st.crate, on0); vis(st.chute, on0);
      if (on0) {
        tr(st.cnt, dC, 0, 0, 1); tr(st.crate, dK, 0, 0, 1);
        const n = Math.min(9999, Math.floor(A(t)));
        const q = n >= 1 ? E.out3(clamp((t - Tk(n)) / (6 * I))) : 1;
        const len = String(n).length, lenP = String(Math.max(n - 1, 0)).length;
        for (let i = 0; i < 4; i++) {
          const pw = Math.pow(10, 3 - i), pos = 3 - i;
          const nd = Math.floor(n / pw) % 10, od = Math.floor(Math.max(n - 1, 0) / pw) % 10;
          const d = st.dig[i], roll = q < 1 && nd !== od;
          setT(d.a, String(roll ? od : nd)); setA(d.a, 'fill', (roll ? pos >= lenP : pos >= len) ? C.grey : C.lime);
          setA(d.a, 'y', f2(roll ? 332 - 100 * q : 332));
          setT(d.b, String(nd)); setA(d.b, 'fill', pos >= len ? C.grey : C.lime);
          vis(d.b, roll); setA(d.b, 'y', f2(432 - 100 * q));
        }
        const cg = E.out3(pg(t, k.belt + 6 * I, 12 * I)) * (1 - ex);
        tr(st.chute, st.chS[0], st.chS[1], st.chA, Math.max(cg, 0.0001), 1);
        const kLo = Math.floor(A(k.gate));
        const cr = Math.max(0, Math.floor(A(t - 0.6)) - kLo);
        const gh = Math.min(152, 8 * cr);
        setA(st.gauge, 'y', f2(717 - gh)); setA(st.gauge, 'height', f2(Math.max(gh, 0.01)));
        let hs = 1, shk = [0, 0];
        if (k.house > -INF && t >= k.house) { hs = 1 + 0.3 * (1 - E.out2(clamp((t - k.house) / (5 * I)))); shk = ZV.shakeAt(t, k.house, 8, 0.4); }
        tr(st.houseLab, 1650 + shk[0], 522 + shk[1], 0, hs);
        vis(st.hOut, t >= k.house);
        const nL = Math.floor(A(t));
        for (let j = 0; j < 3; j++) {
          const kk = nL - j, tg = st.tok[j];
          let shown = false;
          if (kk >= 1 && kk > kLo && !frontOn) {
            const p = (t - Tk(kk)) / 0.6;
            if (p >= 0 && p < 1) {
              shown = true;
              const q2 = Math.pow(p, 1.5);
              const x = st.chS[0] + (st.chE[0] - st.chS[0]) * q2, y = st.chS[1] + (st.chE[1] - st.chS[1]) * q2 - 2;
              const sc = Math.min(1, p / 0.12), sy = p > 0.85 ? Math.max(0.0001, 1 - (p - 0.85) / 0.15) : 1;
              tr(tg, x, y + (p > 0.85 ? (p - 0.85) * 40 : 0), 0, sc, sc * sy);
            }
          }
          vis(tg, shown);
        }
      } else for (let j = 0; j < 3; j++) vis(st.tok[j], false);

      // ---------- stickers
      const exL = 2100 * ex;
      for (let i = 0; i < 3; i++) {
        const L = st.lab[i];
        const p = t >= k.lab[i] ? pg(t, k.lab[i], 8 * I) : 0;
        if (p > 0 && !gone) { vis(L.g, true); tr(L.g, L.x + exL, L.y, L.r, Math.max(0.0001, E.back(p))); } else vis(L.g, false);
      }
      if (st.capG) {
        const p = t >= k.cap ? pg(t, k.cap, 8 * I) : 0;
        if (p > 0) { vis(st.capG, true); tr(st.capG, 960, 80, -3, Math.max(0.0001, E.back(p))); } else vis(st.capG, false);
      }
    }
  });
})();
