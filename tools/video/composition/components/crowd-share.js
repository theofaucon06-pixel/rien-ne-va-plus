// Composant `crowd-share` : « Pas une poignée de cas à part » (épisode 9, S2). 2,5 % des 18-75 ans, ≈ 1 170 000 personnes ; et en face, ce qui reste à la maison.
// Cues : grid (vague de pions, 30 i), highlight (les pions touchés passent au rouge, 3 i d'écart ; titre = share_label ; sticker ratio), count (compteur 0 → count, 2 s),
// tags (étiquettes reliées aux pions rouges de tag_cols, 10 i d'écart), house (la grille se réduit à gauche, panneau lime à droite).
// Props : cols, rows, share, share_label, count, count_prefix, count_label, kicker, ratio, tags[], tag_cols[], house_value, house_kicker, house_label.
// Sans cue `grid` la grille est présente dès le début ; sans autre cue le plan reste kicker + grille. Fond paper. Aucun dégradé, flou, lueur ni filter.
// Écarts assumés : l'étiquette ratio se masque au cue `house` (le panneau occupe la moitié droite) ; en vue `house`, les étiquettes de colonne sont à l'échelle ≈ 0.75 (et non 0.5) pour rester lisibles.
(() => {
  'use strict';
  const { C, E, clamp, prog, lerp, f2, sv, g, rect, circle, path, line, text, put, F } = ZV;
  const FR = 1 / 30;
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const str = (v, d) => (typeof v === 'string' && v.trim() ? v.trim() : d);
  const num = (v, d, a, b) => (isNum(v) ? clamp(v, a, b) : d);
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const setT = (n, s) => { if (n.__s !== s) { n.__s = s; n.textContent = s; } };
  const firstCue = (beats, n) => { let r = null; for (const b of beats) if (b && b.do === 'cue' && b.name === n && isNum(b.t) && (r === null || b.t < r)) r = b.t; return r; };
  const NNBSP = ' ';
  const fmt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, NNBSP);

  function textW(n, size, mono, len) {
    try { const w = n.getComputedTextLength(); if (w > 0) return w; } catch (e) { /* hors DOM */ }
    return len * size * 0.62;
  }
  function fit(n, maxW, base, min) {
    n.setAttribute('font-size', base);
    const mono = n.getAttribute('font-family') === F.mono, L = (n.textContent || '').length;
    let w = textW(n, base, mono, L);
    if (w > maxW && w > 0) {
      const s = Math.max(min || base * 0.6, base * maxW / w);
      n.setAttribute('font-size', f2(s));
      w = textW(n, s, mono, L);
      if (w > maxW) { n.setAttribute('textLength', f2(maxW)); n.setAttribute('lengthAdjust', 'spacingAndGlyphs'); w = maxW; }
    }
    return w;
  }
  function wrap(parent, s, size, maxW, maxLines) {
    const probe = sv('text', { 'font-size': size, 'font-family': F.display, 'font-weight': 800, visibility: 'hidden' }, parent);
    const w = (x) => { probe.textContent = x; return textW(probe, size, false, x.length); };
    const lines = []; let cur = '';
    for (const wd of s.split(/\s+/).filter(Boolean)) { const nx = cur ? cur + ' ' + wd : wd; if (cur && w(nx) > maxW) { lines.push(cur); cur = wd; } else cur = nx; }
    if (cur) lines.push(cur);
    if (maxLines && lines.length > maxLines) { const rest = lines.splice(maxLines - 1).join(' '); lines.push(rest); }
    parent.removeChild(probe);
    return lines;
  }

  ZV.define('crowd-share', {
    init(root, shot) {
      const p = (shot && shot.props) || {};
      const beats = Array.isArray(shot && shot.beats) ? shot.beats : [];
      const cols = Math.round(num(p.cols, 40, 4, 60)), rows = Math.round(num(p.rows, 10, 2, 16));
      const share = num(p.share, 2.5, 0, 100), count = num(p.count, 1170000, 0, 1e9);
      const st = { cols, rows, count };
      st.tGrid = firstCue(beats, 'grid'); st.tHi = firstCue(beats, 'highlight'); st.tCount = firstCue(beats, 'count');
      st.tTags = firstCue(beats, 'tags'); st.tHouse = firstCue(beats, 'house');
      const shareLabel = str(p.share_label, '2,5 %'), prefix = typeof p.count_prefix === 'string' ? p.count_prefix : '≈';
      st.prefix = prefix;

      rect(root, 0, 0, 1920, 1080, 0, C.paper);

      /* ---- en-tête (kicker, titre, compteur, étiquette du compteur, ratio) ---- */
      st.head = g(root);
      const kick = text(st.head, str(p.kicker, 'OFDT · 2024 · 18–75 ANS'), 160, 114, 26, C.ink, { mono: true, spacing: 1 });
      fit(kick, 1000, 26, 18);
      st.tt = g(st.head);                               // titre « share_label » (origine = début de ligne de base)
      const ts = text(st.tt, shareLabel, 7, 7, 150, C.ink);
      const tm = text(st.tt, shareLabel, 0, 0, 150, C.red);
      fit(tm, 1300, 150, 80); ts.setAttribute('font-size', tm.getAttribute('font-size'));
      if (tm.getAttribute('textLength')) { ts.setAttribute('textLength', tm.getAttribute('textLength')); ts.setAttribute('lengthAdjust', 'spacingAndGlyphs'); }
      st.cnt = text(st.head, '', 160, 236, 140, C.ink, { mono: true });
      st.cl = g(st.head);
      const clt = text(st.cl, str(p.count_label, 'PERSONNES EN FRANCE · JEU PROBLÉMATIQUE'), 0, 0, 28, C.ink, { mono: true });
      fit(clt, 1500, 28, 18);
      st.ratioG = null;
      if (typeof p.ratio === 'string' && p.ratio.trim()) {
        st.ratioG = g(st.head);
        const rt = text(st.ratioG, p.ratio.trim(), 0, 18, 52, C.ink, { anchor: 'middle' });
        const rw = fit(rt, 420, 52, 30) + 56;
        st.ratioG.insertBefore(rect(st.ratioG, -rw / 2 + 9, -40 + 9, rw, 80, 14, C.ink), rt);
        st.ratioG.insertBefore(rect(st.ratioG, -rw / 2, -40, rw, 80, 14, C.lime, C.ink, 6), rt);
      }

      /* ---- grille de pions ---- */
      const step = Math.min(40, 1600 / cols, 400 / rows), k = step / 40;
      const x0 = 960 - (cols * step) / 2, y0 = 500 - (rows * step) / 2;
      st.step = step; st.k = k;
      st.grid = g(root);
      st.links = g(st.grid);
      const D = 'M-13 16 A13 18 0 0 1 13 16 Z M8 -12 A8 8 0 1 0 -8 -12 A8 8 0 1 0 8 -12 Z';
      // pions touchés : un par rangée, colonnes distinctes, tag_cols incluses
      const rr = ZV.rng(1170);
      const pool = []; for (let i = 0; i < rows; i++) pool.push(i);
      for (let i = rows - 1; i > 0; i--) { const j = Math.floor(rr() * (i + 1)); const tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp; }
      const n = Math.round(clamp(Math.round(cols * rows * share / 100), 0, cols * rows));
      let tagCols = Array.isArray(p.tag_cols) ? p.tag_cols : [4, 15, 26, 36];
      tagCols = tagCols.filter((c, i) => isNum(c) && c >= 0 && c < cols && tagCols.indexOf(c) === i).map(Math.round).slice(0, Math.max(n, 0));
      const taken = new Set(), touched = [];
      const addT = (c, r) => { taken.add(r * cols + c); touched.push({ c, r }); };
      tagCols.forEach((c, i) => addT(c, pool[i % rows]));
      while (touched.length < n) {
        const r = pool[touched.length % rows];
        let c = -1;
        for (let a = 0; a < 40 && c < 0; a++) { const cc = Math.floor(rr() * cols); if (!taken.has(r * cols + cc) && !touched.some((q) => q.c === cc && (touched.length < cols))) c = cc; }
        if (c < 0) for (let cc = 0; cc < cols && c < 0; cc++) if (!taken.has(r * cols + cc)) c = cc;
        if (c < 0) break;
        addT(c, r);
      }
      const order = touched.slice().sort((a, b) => a.c - b.c || a.r - b.r);   // ordre d'allumage : de gauche à droite
      const idx = new Map(); order.forEach((q, i) => idx.set(q.r * cols + q.c, i));
      st.pawns = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const nd = sv('path', { d: D, fill: C.pocket, visibility: 'hidden' }, st.grid);
        const ti = idx.has(r * cols + c) ? idx.get(r * cols + c) : -1;
        st.pawns.push({ nd, x: x0 + step / 2 + c * step, y: y0 + step / 2 + r * step, c, ti, tc: cols > 1 ? c / (cols - 1) : 0 });
      }
      st.touched = order.map((q) => ({ x: x0 + step / 2 + q.c * step, y: y0 + step / 2 + q.r * step, c: q.c }));

      /* ---- étiquettes de colonne ---- */
      const tagTxt = Array.isArray(p.tags) ? p.tags.map((x) => str(x, '')).filter(Boolean) : ['UN COLLÈGUE', 'UN VOISIN', 'UN PÈRE', 'UN FILS'];
      const nT = Math.min(tagTxt.length, tagCols.length);
      st.tags = [];
      for (let i = 0; i < nT; i++) {
        const tg = g(root);
        const tt = text(tg, tagTxt[i], 0, 11, 30, C.ink, { anchor: 'middle' });
        const w = fit(tt, 300, 30, 20) + 36;
        tg.insertBefore(rect(tg, -w / 2 + 5, -28 + 5, w, 56, 6, C.ink), tt);
        tg.insertBefore(rect(tg, -w / 2, -28, w, 56, 6, C.paper, C.ink, 4), tt);
        const c = tagCols[i], q = st.touched.find((z) => z.c === c) || { x: x0 + step / 2 + c * step, y: y0 + step / 2 };
        st.tags.push({ tg, w, px: q.x, py: q.y, lx: q.x });
      }
      // recalage : dans x 170-1750, sans chevauchement
      st.tags.sort((a, b) => a.px - b.px);
      st.tags.forEach((t) => { t.lx = clamp(t.px, 170 + t.w / 2, 1750 - t.w / 2); });
      for (let i = 1; i < st.tags.length; i++) { const a = st.tags[i - 1], b = st.tags[i], need = (a.w + b.w) / 2 + 14; if (b.lx - a.lx < need) b.lx = a.lx + need; }
      for (let i = st.tags.length - 2; i >= 0; i--) { const a = st.tags[i], b = st.tags[i + 1], need = (a.w + b.w) / 2 + 14; if (b.lx - a.lx < need) a.lx = b.lx - need; }
      let minGap = 1e9;
      st.tags.forEach((t, i) => {
        t.link = sv('path', { d: `M${f2(t.px)} ${f2(t.py)} L${f2(t.px)} 716 L${f2(t.lx)} 740`, fill: 'none', stroke: C.ink, 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', pathLength: 1, 'stroke-dasharray': '1 1', 'stroke-dashoffset': 1 }, st.links);
        if (i) minGap = Math.min(minGap, (t.lx - st.tags[i - 1].lx) * 0.5 - 12);
      });
      let kT = 0.75;
      st.tags.forEach((t, i) => { if (i) { const a = st.tags[i - 1]; kT = Math.min(kT, (minGap) / ((a.w + t.w) / 2)); } });
      st.kTag = clamp(kT, 0.5, 0.75);

      /* ---- panneau « en face » ---- */
      st.hp = g(root);
      rect(st.hp, 1000 + 14, 200 + 14, 840, 500, 0, C.ink);
      rect(st.hp, 1000, 200, 840, 500, 0, C.lime, C.ink, 8);
      const hk = text(st.hp, str(p.house_kicker, 'PRODUIT BRUT DES JEUX · 2024'), 1044, 276, 26, C.ink, { mono: true, spacing: 1 });
      fit(hk, 752, 26, 16);
      const vl = wrap(st.hp, str(p.house_value, 'PRÈS DE 14 MILLIARDS €'), 96, 752, 2);
      const vy = vl.length > 1 ? 392 : 430;
      vl.forEach((l, i) => { fit(text(st.hp, l, 1044, vy + i * 102, 96, C.ink), 752, 96, 60); });
      st.hl = g(st.hp);
      const hlt = text(st.hl, str(p.house_label, 'CE QUI RESTE À LA MAISON'), 0, 13, 38, C.paper, { anchor: 'middle' });
      const hw = fit(hlt, 700, 38, 24) + 56;
      st.hl.insertBefore(rect(st.hl, -hw / 2 + 9, -36 + 9, hw, 72, 8, C.pocket), hlt);
      st.hl.insertBefore(rect(st.hl, -hw / 2, -36, hw, 72, 8, C.ink, C.ink, 6), hlt);
      st.hlX = 1000 + 44 + hw / 2; st.hlY = 604;
      st.hlX = Math.min(st.hlX, 1840 - hw / 2 - 20);
      return st;
    },

    update(st, t) {
      const th = st.tHouse;
      const ph = th == null ? 0 : E.io2(prog(t, th, th + 14 * FR));
      /* ---- en-tête ---- */
      const hs = lerp(1, 0.62, ph);
      st.head.setAttribute('transform', `translate(${f2(lerp(0, -9.2, ph))} ${f2(lerp(0, 154.2, ph))}) scale(${f2(hs)})`);
      const th0 = st.tHi, tc = st.tCount;
      const counting = tc != null && t >= tc;
      if (counting) {
        const q = prog(t, tc, tc + 2), v = st.count * (1 - Math.pow(1 - q, 2.1));
        setT(st.cnt, (st.prefix ? st.prefix + ' ' : '') + fmt(v));
        setA(st.cnt, 'visibility', 'visible');
      } else setA(st.cnt, 'visibility', 'hidden');
      if (!counting && th0 == null && tc == null) put(st.tt, 160, 236, 0, 1, 1, 1);   // aucun cue de titre : le plan garde son titre
      else if (!counting && th0 != null && t >= th0) { const s = lerp(1.5, 1, E.out3(prog(t, th0, th0 + 5 * FR))); put(st.tt, 160, 236, 0, s, s, 1); }
      else ZV.show(st.tt, false);
      if (counting && t >= tc + 2) { const s = Math.max(0.01, E.back(prog(t, tc + 2, tc + 2 + 6 * FR))); put(st.cl, 160, 284, 0, 1, s, 1); } else ZV.show(st.cl, false);
      if (st.ratioG) {
        if (th0 != null && t >= th0 + 0.15 && !(th != null && t >= th)) { const s = Math.max(0.01, E.back(prog(t, th0 + 0.15, th0 + 0.15 + 8 * FR))); put(st.ratioG, 1560, 190, 3, s, s, 1); }
        else ZV.show(st.ratioG, false);
      }

      /* ---- grille ---- */
      const gs = lerp(1, 0.5, ph), gtx = lerp(0, 10, ph), gty = lerp(0, 240, ph);
      st.grid.setAttribute('transform', `translate(${f2(gtx)} ${f2(gty)}) scale(${f2(gs)})`);
      const tg = st.tGrid, hi = st.tHi, k = st.k;
      for (let i = 0; i < st.pawns.length; i++) {
        const w = st.pawns[i];
        let s = 0;
        if (tg == null) s = 1; else { const q = prog(t, tg + w.tc * 1.0, tg + w.tc * 1.0 + 5 * FR); s = q <= 0 ? 0 : 0.35 + 0.65 * E.out2(q); }
        let on = 0;
        if (w.ti >= 0 && hi != null) {
          const q = prog(t, hi + w.ti * 3 * FR, hi + w.ti * 3 * FR + 0.2);
          if (q > 0) { on = 1; s *= 1 + 0.15 * E.back(q); }
        }
        const sc = s * k;
        setA(w.nd, 'visibility', s > 0.001 ? 'visible' : 'hidden');
        if (s > 0.001) setA(w.nd, 'transform', `translate(${f2(w.x)} ${f2(w.y)}) scale(${f2(sc)})`);
        setA(w.nd, 'fill', on ? C.red : C.pocket);
        setA(w.nd, 'stroke', on ? C.ink : 'none');
        setA(w.nd, 'stroke-width', on ? 3 : 0);
      }

      /* ---- étiquettes de colonne ---- */
      const tt = st.tTags;
      st.tags.forEach((z, i) => {
        const t0 = tt == null ? null : tt + i * 10 * FR;
        const lq = t0 == null ? 0 : prog(t, t0, t0 + 0.2);
        setA(z.link, 'stroke-dashoffset', f2(1 - E.out2(lq)));
        setA(z.link, 'visibility', lq > 0 ? 'visible' : 'hidden');
        const pq = t0 == null ? 0 : prog(t, t0 + 0.2, t0 + 0.2 + 6 * FR);
        if (pq <= 0) { ZV.show(z.tg, false); return; }
        const s = Math.max(0.01, E.back(pq)) * lerp(1, st.kTag, ph);
        put(z.tg, gtx + gs * z.lx, gty + gs * 762, 0, s, s, 1);
      });

      /* ---- panneau « en face » ---- */
      if (th == null || t < th + 0.2) ZV.show(st.hp, false);
      else {
        const q = E.out3(prog(t, th + 0.2, th + 0.2 + 12 * FR));
        st.hp.setAttribute('transform', `translate(${f2((1 - q) * 900)} 0)`);
        ZV.show(st.hp, true);
        const lq = prog(t, th + 0.2 + 12 * FR, th + 0.2 + 20 * FR);
        if (lq <= 0) ZV.show(st.hl, false); else { const s = Math.max(0.01, E.back(lq)); put(st.hl, st.hlX, st.hlY, -2, s, s, 1); }
      }
    }
  });
})();
