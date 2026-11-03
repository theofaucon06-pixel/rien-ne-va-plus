// Composant `self-exclusion` (épisode 9, S5, « Demain matin ») : l'interdiction volontaire de jeux. Deux tableaux enchaînés : `form` (formulaire générique plat + chrono comparant la demande à une mi-temps)
// puis `doors` (4 façades : casinos, clubs, sites agréés, et en rouge hachuré les sites illégaux qui ne consultent pas le fichier). Voir EP9-COMPONENTS.md.
// Cues : form, id, duration, send, timer, doors, bar, hole. Props : form_kicker, form_title, duration, you_label, half_label, faster, doors[], doors_kicker, illegal, bar_label, hole, layout (form|doors).
// Fonction pure du temps ; aplats, aucun dégradé / flou / lueur / filter ; aucun shake ni tampon rouge sur la personne ; aucun nom de marque ; rien d'important sous y = 800.
(() => {
  'use strict';
  const { C, F, E, clamp, prog, f2, sv, g, rect, circle, path, line, text } = ZV;
  const I = 1 / 30;
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const num = (v, d) => (v != null && v !== '' && isFinite(+v) ? +v : d);
  const str = (v, d) => (typeof v === 'string' && v.trim().length ? v.trim() : d);
  const arr = (v, d) => (Array.isArray(v) && v.length ? v : d);
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const vis = (n, on) => setA(n, 'visibility', on ? 'visible' : 'hidden');
  const dsp = (n, on) => setA(n, 'display', on ? 'inline' : 'none');
  const op = (n, o) => { o = clamp(o); setA(n, 'opacity', f2(o)); setA(n, 'visibility', o <= 0.001 ? 'hidden' : 'visible'); };
  const tr = (n, x, y, r, sx, sy) => { let s = `translate(${f2(x)} ${f2(y)})`; if (r) s += ` rotate(${f2(r)})`; if (sx !== undefined && (sx !== 1 || (sy !== undefined && sy !== 1))) s += ` scale(${f2(Math.max(sx, 0.0001))} ${f2(Math.max(sy === undefined ? sx : sy, 0.0001))})`; setA(n, 'transform', s); };
  const setT = (n, s) => { if (n.__t !== s) { n.__t = s; n.textContent = s; } };
  const pop = (n, x, y, rot, p) => { if (p <= 0) { vis(n, false); return; } vis(n, true); tr(n, x, y, rot, Math.max(0.0001, E.back(clamp(p)))); };
  // mesure réelle du texte (getComputedTextLength), repli sur une estimation hors DOM
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
  // texte ajusté : réduit la taille jusqu'à o.min si dépasse o.maxW, puis impose la largeur (textLength) ; o.free = pas de textLength (machine à écrire)
  const mkT = (M) => function T(parent, s, x, y, size, fill, o) {
    o = o || {}; s = String(s);
    let w = M(s, size, o.mono);
    if (o.maxW && w > o.maxW) { size = Math.max(o.min || 10, size * o.maxW / w); w = M(s, size, o.mono); }
    const n = text(parent, s, x, y, f2(size), fill, { mono: o.mono, anchor: o.anchor });
    if (!o.free) { const lim = o.maxW ? Math.min(w, o.maxW) : w; n.setAttribute('textLength', f2(lim)); n.setAttribute('lengthAdjust', 'spacingAndGlyphs'); w = lim; }
    n.__w = w; n.__s = size; return n;
  };
  // coupe en lignes équilibrées (≤ maxL) ; réduit la taille jusqu'à min si besoin
  const mkWrap = (M) => {
    const part = (words, n, sz, mono) => {
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
    };
    return (s, size, maxW, maxL, mono, min) => {
      const words = String(s).split(/\s+/).filter(Boolean); if (!words.length) words.push(' ');
      maxL = Math.max(1, Math.min(maxL, words.length)); min = min || 12;
      for (let sz = size; ; sz -= 1) {
        for (let n = 1; n <= maxL; n++) { const p = part(words, n, sz, mono); if (p.w <= maxW) return { lines: p.lines, size: sz, w: p.w }; }
        if (sz <= min) { const p = part(words, maxL, sz, mono); return { lines: p.lines, size: sz, w: Math.min(p.w, maxW) }; }
      }
    };
  };
  // bloc plat + ombre dure décalée
  function blk(parent, x, y, w, h, fill, r, sw, sh) {
    const grp = g(parent);
    if (sh) rect(grp, x + sh, y + sh, w, h, r, C.ink);
    rect(grp, x, y, w, h, r, fill, sw === 0 ? null : C.ink, sw || 6);
    return grp;
  }
  // sticker centré sur (0,0), lignes centrées
  function stk(parent, lines, size, fill, tfill, o, M, T) {
    o = o || {}; lines = [].concat(lines);
    const lh = size * 1.18;
    let mw = 0; lines.forEach((l) => { mw = Math.max(mw, M(l, size, o.mono)); });
    const padX = o.padX === undefined ? 30 : o.padX;
    const w = Math.round(mw + padX * 2), h = Math.round(lines.length * lh + (o.padY === undefined ? 26 : o.padY));
    const grp = g(parent), sh = o.sh === undefined ? 10 : o.sh;
    if (sh) rect(grp, -w / 2 + sh, -h / 2 + sh, w, h, o.r === undefined ? 14 : o.r, C.ink);
    rect(grp, -w / 2, -h / 2, w, h, o.r === undefined ? 14 : o.r, fill, C.ink, o.sw || 6);
    lines.forEach((l, i) => T(grp, l, 0, -h / 2 + (h - lines.length * lh) / 2 + lh * (i + 0.5) + size * 0.34, size, tfill, { anchor: 'middle', mono: o.mono }));
    grp.__w = w; grp.__h = h; return grp;
  }

  let UID = 0;
  const lerp = ZV.lerp;
  // case à cocher dessinée au trait (longueur ≈ 33)
  const CHK = 'M-10 0 L-3 8 L11 -9';

  ZV.define('self-exclusion', {
    init(root, shot) {
      const P = (shot && shot.props) || {};
      const beats = Array.isArray(shot && shot.beats) ? shot.beats : [];
      const cu = (n) => { const a = beats.filter((b) => b && b.do === 'cue' && b.name === n && isNum(b.t)).map((b) => b.t).sort((x, y) => x - y); return a.length ? a[0] : null; };
      const M = metric(root), T = mkT(M), WR = mkWrap(M);
      const uid = 'se' + (++UID);
      const kicker = str(P.form_kicker, 'EN LIGNE · MAQUETTE'), title = str(P.form_title, "DEMANDE D'INTERDICTION VOLONTAIRE DE JEUX");
      const duration = str(P.duration, '3 ANS MINIMUM'), youL = str(P.you_label, 'TA DEMANDE · ≈ 10 MIN'), halfL = str(P.half_label, 'UNE MI-TEMPS');
      const faster = str(P.faster, "MOINS QU'UNE MI-TEMPS");
      const doorsL = arr(P.doors, ['CASINOS', 'CLUBS DE JEUX', 'SITES AGRÉÉS']).slice(0, 3).map(String);
      const doorsK = str(P.doors_kicker, 'EN FRANCE · POUR AU MOINS 3 ANS'), illegal = str(P.illegal, 'SITES ILLÉGAUX');
      const barL = str(P.bar_label, 'INTERDIT DE JEUX'), holeL = str(P.hole, 'NE CONSULTENT PAS LE FICHIER');
      const layout = P.layout === 'doors' ? 'doors' : 'form';
      const c = {};
      ['form', 'id', 'duration', 'send', 'timer', 'doors', 'bar', 'hole'].forEach((n) => { c[n] = cu(n); });

      rect(root, 0, 0, 1920, 1080, 0, C.paper);
      const defs = sv('defs', null, root);

      /* ================= tableau FORM ================= */
      const fs = g(root);
      blk(fs, 120, 90, 780, 700, C.paper, 18, 8, 14);
      path(fs, 'M124 146 V108 Q124 94 138 94 H882 Q896 94 896 108 V146 Z', C.ink);
      T(fs, kicker, 150, 128, 22, C.paper, { mono: true, maxW: 640, min: 14 });
      [[842, 120], [864, 120], [886, 120]].forEach(([x, y]) => circle(fs, x - 4, y, 6, C.paper));
      { const w = WR(title, 46, 720, 2, false, 34); w.lines.forEach((l, i) => T(fs, l, 150, 208 + i * 54, w.size, C.ink, { maxW: 724 })); }
      // rangée 1 : pièce d'identité
      T(fs, "PIÈCE D'IDENTITÉ", 150, 314, 22, C.ink, { mono: true });
      rect(fs, 150, 326, 720, 138, 12, C.white, C.ink, 4, { 'stroke-dasharray': '16 12' });
      const plus = g(fs);
      line(plus, 490, 395, 530, 395, C.grey, 6); line(plus, 510, 375, 510, 415, C.grey, 6);
      const idc = g(fs);
      rect(idc, -112, -50, 240, 116, 10, C.ink);
      rect(idc, -120, -58, 240, 116, 10, C.white, C.ink, 5);
      rect(idc, -100, -40, 52, 52, 0, C.pocket);
      rect(idc, -26, -38, 108, 14, 4, C.ink); rect(idc, -26, -14, 84, 12, 4, C.ink); rect(idc, -26, 6, 98, 12, 4, C.ink);
      rect(idc, -100, 26, 200, 12, 4, C.lime, C.ink, 3);
      const idOk = g(fs);
      circle(idOk, 0, 0, 24, C.lime, C.ink, 5);
      const idChk = path(idOk, CHK, 'none', C.ink, 9); idChk.setAttribute('stroke-dasharray', '34 40');
      // rangée 2 : durée
      T(fs, 'DURÉE', 150, 502, 22, C.ink, { mono: true });
      const selBox = rect(fs, 150, 514, 720, 60, 12, C.white, C.ink, 5);
      const selGhost = rect(fs, 172, 536, 170, 16, 5, C.grey);
      const selTxt = T(fs, duration, 176, 556, 34, C.ink, { maxW: 560, min: 22 });
      const chev = g(fs); path(chev, 'M-12 -6 L0 7 L12 -6', 'none', C.ink, 7);
      const lst = g(fs);
      const rowsY = [580, 622, 664], opts = [];
      rowsY.forEach((y, i) => { rect(lst, 150, y, 720, 42, 0, C.white, C.ink, 4); rect(lst, 172, y + 14, [120, 200, 150][i], 14, 5, C.grey); });
      const hil = g(lst); rect(hil, 150, 0, 720, 42, 0, C.lime, C.ink, 5); T(hil, duration, 176, 30, 28, C.ink, { maxW: 560, min: 18 });
      // bouton
      const btn = g(fs);
      const btnBody = rect(btn, -360, -30, 720, 60, 14, C.ink, C.ink, 5);
      const btn1 = T(btn, 'ENVOYER', 0, 12, 34, C.paper, { anchor: 'middle', maxW: 400 });
      const btn2 = g(btn);
      { const sl = T(btn2, 'ENVOYÉ', 0, 12, 34, C.ink, { maxW: 400, min: 22 }); const tot = 40 + 14 + sl.__w, left = -tot / 2; sl.setAttribute('x', f2(left + 54)); path(btn2, `M${f2(left + 4)} 2 L${f2(left + 16)} 15 L${f2(left + 38)} -12`, 'none', C.ink, 9); }
      // chrono (à droite)
      const youLab = T(fs, youL, 1000, 252, 26, C.ink, { mono: true, maxW: 780, min: 16 });
      const halfLab = T(fs, halfL, 1000, 422, 26, C.ink, { mono: true, maxW: 780, min: 16 });
      rect(fs, 1000, 266, 760, 80, 6, 'none', C.grey, 3, { 'stroke-dasharray': '12 10' });
      rect(fs, 1000, 436, 760, 80, 6, 'none', C.grey, 3, { 'stroke-dasharray': '12 10' });
      const bar1 = rect(fs, 1000, 266, 10, 80, 6, C.lime, C.ink, 6);
      const bar2 = rect(fs, 1000, 436, 10, 80, 6, C.paper, C.ink, 6);
      const ball = g(fs);
      circle(ball, 0, 0, 32, C.paper, C.ink, 6);
      path(ball, 'M0 -12 L11 -4 L7 9 L-7 9 L-11 -4 Z', C.ink, C.ink, 3);
      for (let k = 0; k < 5; k++) { const a = (k * 72) * Math.PI / 180; line(ball, f2(Math.sin(a) * 12), f2(-Math.cos(a) * 12), f2(Math.sin(a) * 24), f2(-Math.cos(a) * 24), C.ink, 4); }
      const fastW = WR(faster, 44, 640, 1, false, 30);
      const fastS = stk(fs, fastW.lines, fastW.size, C.lime, C.ink, { sh: 12, padX: 34, padY: 30, sw: 6 }, M, T);

      /* ================= tableau DOORS ================= */
      const ds = g(root);
      const kick = T(ds, doorsK, 120, 116, 28, C.ink, { mono: true, maxW: 1680, min: 18 });
      const FX = [120, 540, 960, 1380], FY = 200, FW = 380, FH = 460;
      const facs = [];
      const clipId = uid + 'h';
      sv('rect', { x: FX[3], y: FY, width: FW, height: FH }, sv('clipPath', { id: clipId }, defs));
      for (let i = 0; i < 4; i++) {
        const fg = g(ds), x = FX[i], cx = x + FW / 2, ill = i === 3;
        const lab = illegal, name = ill ? lab : (doorsL[i] || '');
        T(fg, name, cx, 176, 38, C.ink, { anchor: 'middle', maxW: 372, min: 26 });
        rect(fg, x + 12, FY + 12, FW, FH, 0, C.ink);
        rect(fg, x, FY, FW, FH, 0, ill ? C.red : C.white, C.ink, 6);
        if (ill) {
          let d = ''; for (let x0 = x - FH; x0 < x + FW; x0 += 44) d += `M${x0} ${FY + FH} L${x0 + FH} ${FY} `;
          path(fg, d, 'none', C.ink, 9, { 'clip-path': `url(#${clipId})`, 'stroke-linecap': 'butt' });
          rect(fg, x, FY, FW, FH, 0, 'none', C.ink, 6);
        } else circle(fg, cx, 296, 30, C.lime, C.ink, 5);
        rect(fg, x + 3, FY + 3, FW - 6, 26, 0, C.ink);
        const dw = g(fg);
        rect(dw, cx - 80, 372, 160, 285, 0, C.ink);
        const leaf = rect(dw, cx - 80, 372, 160, 285, 0, C.paper, C.ink, 6);
        const knob = circle(dw, cx + 52, 528, 9, C.ink);
        facs.push({ g: fg, leaf, knob, cx, ill });
      }
      // verrous
      const locks = [0, 1, 2].map((i) => { const lg = g(ds); rect(lg, -22, 0, 44, 36, 6, C.ink); path(lg, 'M-12 2 V-12 A12 12 0 0 1 12 -12 V2', 'none', C.ink, 8); circle(lg, 0, 17, 5, C.paper); return { g: lg, x: FX[i] + FW / 2, y: 568 }; });
      // barrière
      const bar = g(ds);
      const bw = 1240, cl2 = uid + 'b';
      { const cp = sv('clipPath', { id: cl2 }, defs); sv('rect', { x: 4, y: -31, width: 190, height: 62 }, cp); sv('rect', { x: bw - 194, y: -31, width: 190, height: 62 }, cp); }
      rect(bar, 8, -27, bw, 70, 6, C.ink);
      rect(bar, 0, -35, bw, 70, 6, C.lime, C.ink, 8);
      { let d = ''; for (let x0 = -40; x0 < bw; x0 += 40) d += `M${x0} 35 L${x0 + 40} -35 `; path(bar, d, 'none', C.ink, 14, { 'clip-path': `url(#${cl2})`, 'stroke-linecap': 'butt' }); }
      T(bar, barL, bw / 2, 14, 40, C.ink, { anchor: 'middle', maxW: 800, min: 26 });
      circle(bar, 28, 0, 22, C.ink, C.ink, 4); circle(bar, 28, 0, 8, C.paper);
      // sticker du trou
      const hw = WR(holeL, 32, 330, 2, false, 24);
      const holeS = stk(ds, hw.lines, hw.size, C.red, C.ink, { sh: 10, padX: 26, padY: 24, sw: 6 }, M, T);

      return { c, layout, fs, ds, plus, idc, idOk, idChk, selBox, selGhost, selTxt, chev, lst, hil, btn, btnBody, btn1, btn2, bar1, bar2, ball, fastS, facs, locks, bar, holeS, kick, rowsY };
    },

    update(st, t) {
      const c = st.c, doorsMode = st.layout === 'doors';
      /* ---- bascule entre les tableaux ---- */
      const dp = doorsMode ? 1 : (c.doors == null ? 0 : E.io2(prog(t, c.doors, c.doors + 12 * I)));
      const fp = c.form == null ? 1 : E.out3(prog(t, c.form, c.form + 10 * I));
      const formOn = !doorsMode && dp < 1;
      dsp(st.fs, formOn);
      dsp(st.ds, doorsMode || dp > 0);
      if (formOn) {
        tr(st.fs, 0, (1 - fp) * 900 - 1100 * E.in3(dp));
        // pièce d'identité
        const ip = c.id == null ? 0 : prog(t, c.id, c.id + 12 * I);
        dsp(st.plus, ip <= 0); dsp(st.idc, ip > 0);
        tr(st.idc, lerp(-300, 510, E.out3(ip)), 392, 0);
        const kp = c.id == null ? 0 : prog(t, c.id + 12 * I, c.id + 18 * I);
        pop(st.idOk, 840, 354, 0, kp);
        setA(st.idChk, 'stroke-dashoffset', f2(34 * (1 - kp)));
        // durée : le sélecteur s'ouvre puis se fixe
        const f = c.duration == null ? -1 : (t - c.duration) / I;
        const o = f < 0 ? 0 : f < 8 ? E.out3(f / 8) : f < 22 ? 1 : f < 30 ? 1 - E.in2((f - 22) / 8) : 0;
        dsp(st.lst, o > 0.001);
        setA(st.lst, 'transform', `translate(0 580) scale(1 ${f2(Math.max(o, 0.001))}) translate(0 -580)`);
        tr(st.hil, 0, lerp(st.rowsY[0], st.rowsY[1], E.io2(prog(f, 8, 18))), 0);
        const sel = f >= 24;
        setA(st.selBox, 'fill', sel ? C.lime : C.white);
        dsp(st.selTxt, sel); dsp(st.selGhost, !sel);
        tr(st.chev, 840, 544, f >= 0 && f < 26 ? 180 : 0);
        // envoi
        const dt = c.send == null ? -1 : t - c.send;
        const sc = dt < 0 ? 1 : dt < 3 * I ? 1 - 0.06 * (dt / (3 * I)) : dt < 6 * I ? 0.94 + 0.06 * ((dt - 3 * I) / (3 * I)) : 1;
        tr(st.btn, 510, 746, 0, sc);
        const done = dt >= 3 * I;
        setA(st.btnBody, 'fill', done ? C.lime : C.ink);
        dsp(st.btn1, !done); dsp(st.btn2, done);
        // chrono
        const tf = c.timer == null ? -1 : (t - c.timer) / I;
        const w1 = 760 * 10 / 45 * E.out2(prog(tf, 0, 6)), w2 = 760 * E.out2(prog(tf, 6, 16));
        dsp(st.bar1, w1 >= 1); setA(st.bar1, 'width', f2(Math.max(w1, 0.01)));
        dsp(st.bar2, w2 >= 1); setA(st.bar2, 'width', f2(Math.max(w2, 0.01)));
        pop(st.ball, 1760, 476, 0, c.timer == null ? 0 : prog(t, c.timer + 16 * I, c.timer + 22 * I));
        pop(st.fastS, 1400, 612, -2, c.timer == null ? 0 : prog(t, c.timer + 18 * I, c.timer + 26 * I));
      }
      if (!(doorsMode || dp > 0)) return;
      st.facs.forEach((fc, i) => {
        const e = doorsMode || c.doors == null ? 1 : E.out3(prog(t, c.doors + i * 4 * I, c.doors + i * 4 * I + 12 * I));
        tr(fc.g, 0, (1 - e) * 900);
      });
      const e0 = doorsMode || c.doors == null ? 1 : E.out3(prog(t, c.doors, c.doors + 12 * I));
      tr(st.kick, 0, (1 - e0) * 900);
      /* ---- barrière, verrous, trou ---- */
      const bp = c.bar == null ? 0 : prog(t, c.bar, c.bar + 16 * I);
      if (bp <= 0) dsp(st.bar, false); else { dsp(st.bar, true); setA(st.bar, 'transform', `translate(120 455) rotate(${f2(-82 * (1 - E.out3(bp)))})`); }
      st.locks.forEach((l, i) => { pop(l.g, l.x, l.y, 0, c.bar == null ? 0 : prog(t, c.bar + 18 * I + i * 4 * I, c.bar + 24 * I + i * 4 * I)); });
      const hp = c.hole == null ? 0 : E.out3(prog(t, c.hole, c.hole + 8 * I));
      const f4 = st.facs[3];
      setA(f4.leaf, 'x', f2(f4.cx - 80 + 40 * hp)); setA(f4.leaf, 'width', f2(160 - 40 * hp)); setA(f4.knob, 'cx', f2(f4.cx + 52 + 0 * hp));
      pop(st.holeS, 1590, 286, 3, c.hole == null ? 0 : prog(t, c.hole + 4 * I, c.hole + 12 * I));
    }
  });
})();
