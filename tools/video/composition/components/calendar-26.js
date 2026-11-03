// Composant `calendar-26` : le délai de 26 jours (S2 de l'épisode 3). Feuille « CONTRAT » (clause), grille de 26 cases-jours qui se barrent, pile de feuilles manuscrites qui monte.
// Cues : contract, grid, days, stack, done. Fond paper. Aucun dégradé, flou, lueur ni filter ; rien ne clignote (tout est monotone).
(() => {
  'use strict';
  const { C, E, clamp, prog, lerp, f2, sv, g, rect, circle, path, line, text, put, sticker, shakeAt } = ZV;
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  let UID = 0;

  // ajuste un texte à une largeur max (mesure réelle), sans jamais jeter
  function fit(n, maxW) {
    try { const w = n.getComputedTextLength(); if (w > maxW && w > 0) { n.setAttribute('textLength', f2(maxW)); n.setAttribute('lengthAdjust', 'spacingAndGlyphs'); } } catch (e) { /* hors DOM */ }
  }
  // gribouillis de manuscrit : `rows` lignes ondulées dans une boîte
  function scribble(r, x0, y0, w, rows, gap) {
    let d = '';
    for (let k = 0; k < rows; k++) {
      let x = x0, y = y0 + k * gap;
      const end = x0 + w * (k === rows - 1 ? 0.55 : 0.9 + r() * 0.1);
      d += `M${f2(x)} ${f2(y)}`;
      while (x < end) {
        const dx = 7 + r() * 11, up = (r() - 0.5) * 12;
        d += ` q${f2(dx * 0.5)} ${f2(-8 - r() * 5)} ${f2(dx)} ${f2(up * 0.2)}`;
        x += dx;
      }
    }
    return d;
  }

  ZV.define('calendar-26', {
    init(root, shot) {
      const p = (shot && shot.props) || {};
      const beats = Array.isArray(shot && shot.beats) ? shot.beats : [];
      const dur = isNum(shot && shot.dur) && shot.dur > 0 ? shot.dur : 10;
      const cueT = (n) => { const b = beats.filter((x) => x && x.do === 'cue' && x.name === n && isNum(x.t)).sort((a, c) => a.t - c.t)[0]; return b ? b.t : null; };
      const N = clamp(Math.round(isNum(+p.days) && p.days != null ? +p.days : 26), 2, 40);
      const cols = Math.ceil(N / 2);
      const clause = typeof p.clause === 'string' && p.clause.trim() ? p.clause.trim() : 'S’IL RATE L’ÉCHÉANCE : TOUS SES FUTURS LIVRES';
      const title = typeof p.title === 'string' && p.title.trim() ? p.title.trim() : 'LE JOUEUR';
      const doneTxt = typeof p.done === 'string' && p.done.trim() ? p.done.trim() : 'RENDU À TEMPS';
      const r = ZV.rng(2606);
      const id = ++UID;
      const st = { N, cols, dur };

      /* ---- repères ---- */
      const tContract = cueT('contract'), tGrid = cueT('grid'), tDays = cueT('days'), tStack = cueT('stack'), tDone = cueT('done');
      st.tC = tContract == null ? -5 : tContract;
      st.tG = tGrid != null ? tGrid : tDays != null ? Math.max(st.tC, tDays - 0.4) : tContract != null ? tContract + 1.6 : -5;
      st.tStack = tStack; st.tDone = tDone;
      // instants où chaque jour se barre (accélération progressive)
      st.dayT = [];
      const anchor = tDays != null ? tDays : (tStack != null ? tStack : (tDone != null ? tDone - 0.6 : null));
      if (anchor != null) {
        let nxt = dur - 0.4;
        for (const c of [tStack, tDone]) if (c != null && c > anchor + 1.2) nxt = Math.min(nxt, c - 0.35);
        const D = tDays != null ? clamp(nxt - anchor, 1.6, 6.5) : 0.6;
        const m = 0.6;
        for (let k = 1; k <= N; k++) { const x = k / N; st.dayT.push(anchor + 0.12 + D * (x * (1 - m) + m * (1 - (1 - x) * (1 - x)))); }
      }
      st.lastDay = st.dayT.length ? st.dayT[N - 1] : null;
      // gros plan de la pile : de `stack` jusqu'à `done` (ou la fin)
      st.zEnd = tStack != null ? (tDone != null && tDone > tStack + 0.3 ? tDone : 1e9) : null;

      rect(root, 0, 0, 1920, 1080, 0, C.paper);

      /* ---- bureau : contrat + grille + tampon (glisse hors cadre pendant le gros plan) ---- */
      st.desk = g(root);

      // contrat
      st.cG = g(st.desk);
      const cg = st.cG;
      rect(cg, -645 + 14, -186 + 14, 1290, 372, 14, C.ink);
      rect(cg, -645, -186, 1290, 372, 14, C.white, C.ink, 6);
      path(cg, 'M-645 -116 L-645 -172 A14 14 0 0 1 -631 -186 L631 -186 A14 14 0 0 1 645 -172 L645 -116Z', C.ink);
      text(cg, 'CONTRAT', -608, -128, 56, C.paper);
      const tt = text(cg, `« ${title} »`, 608, -134, 34, C.lime, { anchor: 'end', mono: true });
      fit(tt, 520);
      // lignes de papier (très discrètes) + signature
      line(cg, 180, 168, 590, 168, C.ink, 4, { opacity: 0.35 });
      text(cg, '✕', 150, 172, 30, C.ink, { mono: true, anchor: 'middle' });
      path(cg, 'M215 150 q18 -30 30 -4 q10 22 28 -16 q12 -20 22 6 q8 18 40 -4 q30 -16 60 3 q40 16 90 -8', 'none', C.ink, 4.5);
      // clause (2 lignes, révélées par un masque)
      let l1 = clause, l2 = '';
      const ci = clause.indexOf(':');
      if (ci > 0 && ci < clause.length - 2) { l1 = clause.slice(0, ci + 1).trim(); l2 = clause.slice(ci + 1).trim(); }
      else { const w = clause.split(/\s+/); const h = Math.ceil(w.length / 2); l1 = w.slice(0, h).join(' '); l2 = w.slice(h).join(' '); }
      st.clip = [];
      const lineSpec = [{ s: l1, y: -30, bar: false, x0: -610 }, { s: l2, y: 85, bar: true, x0: -610 }];
      lineSpec.forEach((L, i) => {
        if (!L.s) return;
        const cid = `cal26c${id}_${i}`;
        const cp = sv('clipPath', { id: cid }, cg);
        const cr = sv('rect', { x: -640, y: i === 0 ? -110 : 0, width: 0, height: 120 }, cp);
        st.clip.push(cr);
        const lg = g(cg, { 'clip-path': `url(#${cid})` });
        if (L.bar) rect(lg, -625, 8, 1250, 108, 6, C.red, C.ink, 5);
        const tn = text(lg, L.s, L.x0 + 6, L.y, 76, C.ink);
        fit(tn, 1210);
      });
      st.nClip = st.clip.length;

      // grille de jours
      st.gridG = g(st.desk);
      const pitch = Math.min(100, Math.floor(1290 / cols)), csz = pitch - 10;
      const gx0 = 90, gy0 = 444, rowP = csz + 14;
      st.cells = [];
      for (let i = 0; i < N; i++) {
        const cx = gx0 + (i % cols) * pitch + csz / 2, cy = gy0 + Math.floor(i / cols) * rowP + csz / 2;
        const cell = g(st.gridG, { transform: `translate(${f2(cx)} ${f2(cy)})` });
        rect(cell, -csz / 2 + 6, -csz / 2 + 6, csz, csz, 8, C.ink);
        const body = g(cell);
        rect(body, -csz / 2, -csz / 2, csz, csz, 8, C.white, C.ink, 5);
        const bg = rect(body, -csz / 2, -csz / 2, csz, csz, 8, C.ink, C.ink, 5, { opacity: 0 });
        const nt = text(body, String(i + 1), 0, 15, 42, C.ink, { anchor: 'middle', mono: true });
        const hx = csz / 2 - 12;
        const x1 = line(body, -hx, -hx, -hx, -hx, C.red, 6);
        const x2 = line(body, hx, -hx, hx, -hx, C.red, 6);
        st.cells.push({ cell, body, bg, nt, x1, x2, hx, s: -1 });
      }

      // tampon + sticker (fin)
      st.stampG = g(st.desk);
      rect(st.stampG, -270 + 12, -62 + 12, 540, 124, 14, C.ink);
      rect(st.stampG, -270, -62, 540, 124, 14, C.lime, C.ink, 8);
      rect(st.stampG, -252, -46, 504, 92, 8, 'none', C.ink, 3);
      fit(text(st.stampG, doneTxt, 0, 24, 66, C.ink, { anchor: 'middle' }), 480);
      st.stickG = g(st.desk);
      sticker(st.stickG, 280, 84, C.ink, `${N} JOURS`, 52, C.lime, { sh: 9, r: 12 });

      /* ---- compteur (reste visible pendant le gros plan) ---- */
      st.cnt = g(root);
      rect(st.cnt, -125 + 10, -46 + 10, 250, 92, 14, C.ink);
      rect(st.cnt, -125, -46, 250, 92, 14, C.lime, C.ink, 6);
      st.cntT = text(st.cnt, 'J 0', 0, 21, 62, C.ink, { anchor: 'middle', mono: true });

      /* ---- pile de feuilles ---- */
      st.pile = g(root);
      const step = Math.min(14, 200 / Math.max(1, N - 1));
      st.step = step;
      rect(st.pile, -165 + 12, 146 + 12, 330, 28, 4, C.ink);
      rect(st.pile, -165, 146, 330, 28, 4, C.pocket, C.ink, 5);
      rect(st.pile, -140, -150, 280, 300, 8, 'none', C.ink, 4, { 'stroke-dasharray': '14 12', opacity: 0.35 });
      st.sheets = [];
      for (let i = 0; i < N; i++) {
        const sg = g(st.pile);
        rect(sg, -130, -150, 260, 300, 8, C.white, C.ink, 5);
        path(sg, scribble(r, -100, -90, 190, 6, 34), 'none', C.ink, 4);
        fit(text(sg, title, -104, -110, 30, C.ink), 200);
        st.sheets.push({ sg, jx: (r() - 0.5) * 18, rot: (r() - 0.5) * 5, s: -1 });
      }
      return st;
    },

    update(st, t) {
      const { N } = st;
      /* ---- gros plan de la pile ---- */
      let z = 0;
      if (st.tStack != null) {
        const span = Math.min(0.6, Math.max(0.2, (st.zEnd - st.tStack) / 2));
        z = E.io3(prog(t, st.tStack, st.tStack + span));
        if (st.zEnd < 1e8) z *= 1 - E.io3(prog(t, st.zEnd - 0.5, st.zEnd));
      }
      setA(st.desk, 'transform', `translate(${f2(-1900 * z)} 0)`);

      /* ---- contrat ---- */
      const cp = prog(t, st.tC, st.tC + 0.5);
      const ce = E.back(cp);
      put(st.cG, 735, lerp(-260, 222, ce), lerp(-6, -0.6, ce), 1, 1, cp > 0 ? 1 : 0);
      const w1 = E.out2(prog(t, st.tC + 0.4, st.tC + 1.25)), w2 = E.out2(prog(t, st.tC + 1.25, st.tC + 2.2));
      if (st.nClip > 0) setA(st.clip[0], 'width', f2(1290 * w1));
      if (st.nClip > 1) setA(st.clip[1], 'width', f2(1290 * w2));

      /* ---- grille ---- */
      const gp = E.out3(prog(t, st.tG, st.tG + 0.45));
      setA(st.gridG, 'visibility', gp > 0 ? 'visible' : 'hidden');
      setA(st.gridG, 'opacity', f2(gp));
      setA(st.gridG, 'transform', `translate(0 ${f2((1 - gp) * 40)})`);

      // jours barrés : un bloc fixe d'aiguilles par case
      let crossed = 0;
      for (let i = 0; i < N; i++) {
        const c = st.cells[i];
        const dt = st.dayT.length ? st.dayT[i] : 1e9;
        const key = Math.round(clamp((t - dt) / 0.14) * 20), q = key / 20;
        if (q >= 1) crossed++;
        if (c.s !== key) {
          c.s = key;
          const a = Math.min(1, q * 2), b = clamp(q * 2 - 1);
          const hx = c.hx;
          setA(c.x1, 'x2', f2(lerp(-hx, hx, a))); setA(c.x1, 'y2', f2(lerp(-hx, hx, a)));
          setA(c.x2, 'x2', f2(lerp(hx, -hx, b))); setA(c.x2, 'y2', f2(lerp(-hx, hx, b)));
          setA(c.x1, 'visibility', q > 0 ? 'visible' : 'hidden');
          setA(c.x2, 'visibility', b > 0 ? 'visible' : 'hidden');
          setA(c.bg, 'opacity', q > 0.5 ? 1 : 0); setA(c.nt, 'fill', q > 0.5 ? C.paper : C.ink);
          const pop = q > 0 && q < 1 ? 1 + 0.12 * Math.sin(Math.PI * q) : 1;
          setA(c.body, 'transform', `scale(${f2(pop)})`);
        }
      }

      /* ---- compteur de jours (≤ 6 changements / s) ---- */
      let tq = t;
      if (st.lastDay == null || t < st.lastDay + 0.17) tq = Math.floor(t * 6) / 6;
      let k = 0;
      for (let i = 0; i < N; i++) if (st.dayT.length && st.dayT[i] + 0.14 <= tq) k++;
      const ctxt = `J ${k}`;
      if (st.cntT.textContent !== ctxt) st.cntT.textContent = ctxt;
      const cvis = gp > 0 ? 1 : 0;
      const ca = E.back(clamp((t - st.tG) / 0.4));
      const bump = st.lastDay != null && t >= st.lastDay + 0.14 ? 1 + 0.12 * Math.sin(Math.PI * clamp((t - st.lastDay - 0.14) / 0.4)) : 1;
      put(st.cnt, lerp(215, 560, z), lerp(770, 440, z), 0, lerp(1, 1.8, z) * ca * bump, lerp(1, 1.8, z) * ca * bump, cvis);

      /* ---- pile ---- */
      const pz = z;
      const ps = lerp(1, 1.45, pz);
      st.pile.setAttribute('transform', `translate(${f2(lerp(1640, 1250, pz))} ${f2(lerp(665, 585, pz))}) scale(${f2(ps)})`);
      setA(st.pile, 'visibility', gp > 0 ? 'visible' : 'hidden');
      for (let i = 0; i < N; i++) {
        const s = st.sheets[i];
        const dt = st.dayT.length ? st.dayT[i] : 1e9;
        const key = Math.round(clamp((t - dt) / 0.2) * 20), q = key / 20;
        if (s.s !== key) {
          s.s = key;
          const e = E.out3(q);
          if (q <= 0) setA(s.sg, 'visibility', 'hidden');
          else {
            setA(s.sg, 'visibility', 'visible');
            setA(s.sg, 'transform', `translate(${f2(s.jx + (1 - e) * 60)} ${f2(-st.step * i - (1 - e) * 280)}) rotate(${f2(s.rot + (1 - e) * 10)})`);
          }
        }
      }

      /* ---- tampon « rendu à temps » + sticker ---- */
      const td = st.tDone;
      const sp = td == null ? 0 : clamp((t - td) / 0.22);
      const ss = sp > 0 ? 1 + 1.6 * (1 - E.out3(sp)) : 0;
      const sh = td == null ? [0, 0] : shakeAt(t, td + 0.2, 7, 0.3);
      put(st.stampG, 770 + sh[0], 770 + sh[1], -6, ss, ss, sp > 0 ? 1 : 0);
      const kp = td == null ? 0 : E.back(clamp((t - td - 0.35) / 0.3));
      put(st.stickG, 1250, 770, 4, kp, kp, kp > 0 ? 1 : 0);
    }
  });
})();
