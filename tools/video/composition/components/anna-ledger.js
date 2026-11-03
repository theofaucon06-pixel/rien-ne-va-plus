// Composant `anna-ledger` : le journal d'Anna (S3 de l'épisode 3, « celle qui attend »). Carnet ouvert (sténographie = gribouillis réguliers), colonne de pointage, horloge plate, puis « l'autre côté de la table » (chaise vide).
// Cues : open, line-1, line-2, line-3, tally, clock, other-side. Fond pocket. Aucun dégradé, flou, lueur ni filter ; jamais de portrait (chaise vide seulement).
(() => {
  'use strict';
  const { C, E, clamp, prog, lerp, f2, sv, g, rect, circle, path, line, text, put, sticker } = ZV;
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const str = (v, d) => (typeof v === 'string' && v.trim() ? v.trim() : d);
  function fit(n, maxW) {
    try { const w = n.getComputedTextLength(); if (w > maxW && w > 0) { n.setAttribute('textLength', f2(maxW)); n.setAttribute('lengthAdjust', 'spacingAndGlyphs'); } } catch (e) { /* hors DOM */ }
  }
  function len(n, fallback) { try { const w = n.getComputedTextLength(); return w > 0 ? w : fallback; } catch (e) { return fallback; } }

  const SPINE = 780;
  const ROW0 = 170, ROWP = 205;
  const TX = 1510, TY = 340, TW = 320, TH = 460;
  const CLK = { x: 1670, y: 196, r: 100 };

  // trait de sténographie : boucles régulières ; renvoie { pts, d }
  function steno(r, x0, y0, w) {
    const pts = [];
    let x = x0;
    while (x < x0 + w) {
      const wl = 36 + r() * 90, end = Math.min(x + wl, x0 + w);
      const om = 0.5 + r() * 0.3, A = 2.6 + r() * 2.2, B = 6 + r() * 7;
      let s = 0;
      while (x < end) {
        x += 1.9; s += 1;
        pts.push([x + A * Math.sin(om * s), y0 - B * Math.cos(om * s) + B]);
      }
      const gap = 14 + r() * 12; x += gap;
      pts.push([x, y0 + 1]);
    }
    let d = `M${f2(pts[0][0])} ${f2(pts[0][1])}`;
    for (let i = 1; i < pts.length; i++) d += `L${f2(pts[i][0])} ${f2(pts[i][1])}`;
    return { pts, d };
  }

  ZV.define('anna-ledger', {
    init(root, shot) {
      const p = (shot && shot.props) || {};
      const beats = Array.isArray(shot && shot.beats) ? shot.beats : [];
      const dur = isNum(shot && shot.dur) && shot.dur > 0 ? shot.dur : 12;
      const cueT = (n) => { const b = beats.filter((x) => x && x.do === 'cue' && x.name === n && isNum(x.t)).sort((a, c) => a.t - c.t)[0]; return b ? b.t : null; };
      const defL = ['LES OBJETS EN GAGE', 'L’ATTENTE', 'LES SERMENTS'];
      const labels = defL.map((d, i) => str(Array.isArray(p.labels) ? p.labels[i] : null, d));
      const title = str(p.title, 'LE JOURNAL D’ANNA');
      const note = str(p.note, 'EN STÉNOGRAPHIE');
      const r = ZV.rng(1867);
      const st = { dur };
      st.tO = cueT('open'); st.tOS = cueT('other-side'); st.tTally = cueT('tally'); st.tClock = cueT('clock');
      st.tL = [cueT('line-1'), cueT('line-2'), cueT('line-3')];
      st.open0 = st.tO == null ? -5 : st.tO;

      rect(root, 0, 0, 1920, 1080, 0, C.pocket);

      /* ================= bureau (carnet + pointage + horloge) ================= */
      st.dk = g(root);
      const dk = st.dk;
      // couverture
      rect(dk, 80 + 14, 100 + 14, 1390, 720, 30, C.ink);
      rect(dk, 80, 100, 1390, 720, 30, C.red, C.ink, 8);
      // page de droite
      rect(dk, SPINE + 10, 124, 656, 672, 14, C.paper, C.ink, 6);
      // page de gauche (se déplie autour de la reliure)
      st.lp = g(dk);
      rect(st.lp, 104, 124, SPINE - 114, 672, 14, C.paper, C.ink, 6);
      // titre (2 lignes) + note
      let t1 = title, t2 = '';
      if (title.length > 11) {
        const w = title.split(/\s+/); let best = 1, bd = 1e9;
        for (let j = 1; j < w.length; j++) { const d = Math.abs(w.slice(0, j).join(' ').length - w.slice(j).join(' ').length); if (d < bd) { bd = d; best = j; } }
        t1 = w.slice(0, best).join(' '); t2 = w.slice(best).join(' ');
      }
      st.title = g(dk);
      fit(text(st.title, t1, 150, 232, 88, C.ink), 560);
      if (t2) fit(text(st.title, t2, 150, 322, 88, C.ink), 560);
      st.noteG = g(dk);
      {
        const nt = text(st.noteG, note, 0, 12, 34, C.ink, { anchor: 'middle', mono: true });
        fit(nt, 520);
        const w = Math.min(560, len(nt, note.length * 21) + 50);
        const bg = g(st.noteG);
        st.noteG.insertBefore(bg, nt);
        rect(bg, -w / 2 + 8, -34 + 8, w, 68, 10, C.ink);
        rect(bg, -w / 2, -34, w, 68, 10, C.lime, C.ink, 5);
      }
      // gribouillis de remplissage (page de gauche) : fixes, réguliers
      st.fill = g(st.lp);
      for (let k = 0; k < 8; k++) {
        const s = steno(r, 150, 470 + k * 38, k === 7 ? 260 : 560);
        path(st.fill, s.d, 'none', C.ink, 3.5, { opacity: 0.5 });
      }
      // reliure
      rect(dk, SPINE - 14, 100, 28, 720, 6, C.ink);
      for (let y = 150; y < 790; y += 70) line(dk, SPINE, y, SPINE, y + 28, C.paper, 5);
      // volet de couverture qui s'ouvre
      st.flap = g(dk);
      rect(st.flap, SPINE + 14, 100, 676, 720, 30, C.red, C.ink, 8);
      rect(st.flap, SPINE + 60, 150, 584, 620, 18, 'none', C.ink, 5);

      // lignes de sténo (page de droite)
      st.rows = [0, 1, 2].map((i) => {
        const y0 = ROW0 + i * ROWP;
        // lignes à écrire (réglure fantôme)
        line(dk, SPINE + 50, y0 + 96, SPINE + 640, y0 + 96, C.ink, 4, { opacity: 0.14 });
        line(dk, SPINE + 50, y0 + 148, SPINE + 640, y0 + 148, C.ink, 4, { opacity: 0.14 });
        // étiquette
        const lg = g(dk);
        const lt = text(lg, labels[i], 20, 12, 30, C.ink, { mono: true });
        fit(lt, 520);
        const lw = Math.min(570, len(lt, labels[i].length * 18) + 40);
        const bg = g(lg);
        lg.insertBefore(bg, lt);
        rect(bg, 8, -28 + 8, lw, 56, 8, C.ink);
        rect(bg, 0, -28, lw, 56, 8, i === 2 ? C.lime : C.white, C.ink, 5);
        // gribouillis
        const a = steno(r, SPINE + 50, y0 + 84, 580), b = steno(r, SPINE + 50, y0 + 136, 400);
        const pa = path(dk, a.d, 'none', C.ink, 4.5, { pathLength: 1, 'stroke-dasharray': '0 1.01' });
        const pb = path(dk, b.d, 'none', C.ink, 4.5, { pathLength: 1, 'stroke-dasharray': '0 1.01' });
        return { lg, x: SPINE + 36, y: y0 + 22, a, b, pa, pb };
      });
      // crayon
      st.pen = g(dk);
      {
        const pn = g(st.pen, { transform: 'rotate(-26)' });
        path(pn, 'M0 0 L32 -10 L32 10Z', C.paper, C.ink, 4);
        rect(pn, 32, -11, 124, 22, 3, C.lime, C.ink, 4);
        rect(pn, 156, -11, 16, 22, 0, C.paper, C.ink, 4);
        rect(pn, 172, -11, 26, 22, 6, C.red, C.ink, 4);
      }

      // colonne de pointage
      st.tal = g(dk);
      rect(st.tal, TX + 12, TY + 12, TW, TH, 12, C.ink);
      rect(st.tal, TX, TY, TW, TH, 12, C.paper, C.ink, 6);
      for (let k = 1; k < 4; k++) line(st.tal, TX + 20, TY + k * 112, TX + TW - 20, TY + k * 112, C.ink, 3, { opacity: 0.15 });
      st.marks = [];
      const M = 40;
      for (let j = 0; j < M; j++) {
        const grp = Math.floor(j / 5), k = j % 5, col = grp % 2, row = Math.floor(grp / 2);
        const gx = TX + 40 + col * 146, gy = TY + 24 + row * 112;
        let a;
        if (k < 4) a = { x1: gx + k * 24, y1: gy, x2: gx + k * 24 + (k % 2 ? 2 : -1), y2: gy + 80 };
        else a = { x1: gx - 12, y1: gy + 64, x2: gx + 100, y2: gy + 14 };
        st.marks.push({ n: line(st.tal, a.x1, a.y1, a.x2, a.y2, C.ink, 7, { visibility: 'hidden' }), a, s: -1 });
      }

      // horloge
      st.clk = g(dk);
      circle(st.clk, CLK.x + 10, CLK.y + 10, CLK.r, C.ink);
      circle(st.clk, CLK.x, CLK.y, CLK.r, C.paper, C.ink, 8);
      for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; line(st.clk, CLK.x + Math.sin(a) * 78, CLK.y - Math.cos(a) * 78, CLK.x + Math.sin(a) * 90, CLK.y - Math.cos(a) * 90, C.ink, i % 3 === 0 ? 7 : 4); }
      st.hh = line(st.clk, CLK.x, CLK.y, CLK.x, CLK.y - 50, C.ink, 11);
      st.mh = line(st.clk, CLK.x, CLK.y, CLK.x, CLK.y - 74, C.ink, 7);
      circle(st.clk, CLK.x, CLK.y, 10, C.red, C.ink, 4);

      /* ================= l'autre côté de la table ================= */
      st.chair = g(root);
      const ch = st.chair;
      rect(ch, -190 + 14, -300 + 14, 380, 270, 46, C.ink);
      rect(ch, -190, -300, 380, 270, 46, C.paper, C.ink, 8);
      for (const x of [-100, 0, 100]) rect(ch, x - 16, -262, 32, 190, 10, C.white, C.ink, 5);
      for (const x of [-196, 160]) rect(ch, x, 70, 36, 262, 8, C.paper, C.ink, 8);
      rect(ch, -190, 224, 380, 30, 6, C.paper, C.ink, 8);
      rect(ch, -230, 0, 460, 80, 22, C.red, C.ink, 8);
      st.legend = g(root);
      sticker(st.legend, 860, 96, C.lime, '', 1, C.ink, { sh: 12 });
      fit(text(st.legend, str(p.legend, 'L’AUTRE CÔTÉ DE LA TABLE'), 0, 20, 56, C.ink, { anchor: 'middle' }), 800);
      return st;
    },

    update(st, t) {
      const t0 = st.open0;
      /* ---- ouverture du carnet ---- */
      const op = E.io3(prog(t, t0, t0 + 0.8));
      const fx = Math.cos(op * Math.PI);                  // 1 → -1 : le volet passe de droite à gauche
      const flapOn = fx > 0.001;
      setA(st.flap, 'visibility', flapOn ? 'visible' : 'hidden');
      setA(st.flap, 'transform', `translate(${SPINE} 0) scale(${f2(Math.max(fx, 0.001))} 1) translate(${-SPINE} 0)`);
      const lx = flapOn ? 0 : -fx;
      setA(st.lp, 'visibility', lx > 0.001 ? 'visible' : 'hidden');
      setA(st.lp, 'transform', `translate(${SPINE} 0) scale(${f2(Math.max(lx, 0.001))} 1) translate(${-SPINE} 0)`);
      const tp = E.back(clamp((t - t0 - 0.7) / 0.35));
      setA(st.title, 'visibility', tp > 0 ? 'visible' : 'hidden');
      setA(st.title, 'transform', `translate(${f2((1 - Math.min(tp, 1)) * -40)} 0)`);
      setA(st.title, 'opacity', f2(Math.min(tp, 1)));
      const np = E.back(clamp((t - t0 - 0.95) / 0.35));
      put(st.noteG, 440, 410, -2, np, np, np > 0 ? 1 : 0);

      /* ---- lignes de sténo ---- */
      let pen = null;
      st.rows.forEach((R, i) => {
        const tl = st.tL[i];
        const lp = tl == null ? 0 : E.back(clamp((t - tl) / 0.25));
        put(R.lg, R.x, R.y, i === 1 ? 1.2 : -1.2, lp, lp, lp > 0 ? 1 : 0);
        const wd = tl == null ? 0 : clamp((t - tl - 0.2) / 1.7);
        const pa = Math.min(1, wd / 0.6), pb = clamp((wd - 0.6) / 0.4);
        setA(R.pa, 'stroke-dasharray', `${f2(pa)} 1.01`);
        setA(R.pb, 'stroke-dasharray', `${f2(pb)} 1.01`);
        setA(R.pa, 'visibility', pa > 0 ? 'visible' : 'hidden');
        setA(R.pb, 'visibility', pb > 0 ? 'visible' : 'hidden');
        if (wd > 0 && wd < 1) {
          const L = pb > 0 ? R.b : R.a, q = pb > 0 ? pb : pa;
          const pt = L.pts[Math.min(L.pts.length - 1, Math.floor(q * (L.pts.length - 1)))];
          pen = pt;
        }
      });
      setA(st.pen, 'visibility', pen ? 'visible' : 'hidden');
      if (pen) setA(st.pen, 'transform', `translate(${f2(pen[0])} ${f2(pen[1])})`);

      /* ---- pointage (monotone, ≤ 6 bâtons / s) ---- */
      const tt = st.tTally;
      st.marks.forEach((m, j) => {
        const key = Math.round((tt == null ? 0 : clamp((t - tt - j * 0.17) / 0.12)) * 10), q = key / 10;
        if (m.s === key) return;
        m.s = key;
        const a = m.a;
        setA(m.n, 'visibility', q > 0 ? 'visible' : 'hidden');
        setA(m.n, 'x2', f2(lerp(a.x1, a.x2, q))); setA(m.n, 'y2', f2(lerp(a.y1, a.y2, q)));
      });

      /* ---- horloge ---- */
      let hrs = 3;
      if (st.tClock != null) {
        let nxt = st.dur;
        if (st.tOS != null && st.tOS > st.tClock + 1.7) nxt = st.tOS;
        const Dc = clamp(nxt - st.tClock - 0.3, 1.5, 4.5);
        hrs = 3 + Dc * 1.2 * E.io2(prog(t, st.tClock, st.tClock + Dc));
      }
      const ha = (hrs / 12) * 360, ma = hrs * 360;
      setA(st.hh, 'transform', `rotate(${f2(ha % 360)} ${CLK.x} ${CLK.y})`);
      setA(st.mh, 'transform', `rotate(${f2(ma % 360)} ${CLK.x} ${CLK.y})`);

      /* ---- l'autre côté de la table ---- */
      const o = st.tOS == null ? 0 : E.io3(prog(t, st.tOS, st.tOS + 0.7));
      const s = lerp(1, 0.5, o);
      setA(st.dk, 'transform', `translate(${f2(lerp(960, 500, o))} ${f2(lerp(460, 470, o))}) scale(${f2(s)}) translate(-960 -460)`);
      const cq = st.tOS == null ? 0 : clamp((t - st.tOS - 0.25) / 0.7);
      put(st.chair, lerp(2350, 1400, E.back(cq)), 380, 0, 1, 1, cq > 0 ? 1 : 0);
      const lg = st.tOS == null ? 0 : E.back(clamp((t - st.tOS - 0.95) / 0.3));
      put(st.legend, 1400, 780, -2, lg, lg, lg > 0 ? 1 : 0);
    }
  });
})();
