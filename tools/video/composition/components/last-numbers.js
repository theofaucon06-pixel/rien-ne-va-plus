// Composant « last-numbers » : l'afficheur des derniers numéros au-dessus de la table (1920×1080).
// Boîtier ink bordé paper 8 px, colonne de 12 numéros (rouges à droite, noirs à gauche, zéro au centre) qui défile à chaque bip,
// descente depuis le haut (drop), tampon, balayage « intuition », pile de mises avec flèche rouge, barré, sortie du cadre.
// Fonction pure du temps ; les numéros sont illustratifs.
(() => {
  'use strict';
  const { C, E, clamp, prog, lerp, f2, sv, g, rect, circle, text, put, shakeAt, colorOf } = ZV;
  const ROWS = 12, PITCH = 54, BW = 520, TOP = 40, HEAD = 92, ROW0 = TOP + HEAD;       // en repère local (origine : centre du boîtier)
  const BH = HEAD + ROWS * PITCH + 24;
  const rowY = (r) => ROW0 + r * PITCH + PITCH / 2;

  ZV.define('last-numbers', {
    init(root, shot) {
      const p = shot.props || {};
      const cue = (n) => ZV.cue(shot, n);
      const st = { p, dur: shot.dur };
      rect(root, 0, 0, 1920, 1080, 0, C.ink);
      const nums = (Array.isArray(p.numbers) && p.numbers.length ? p.numbers : [26, 4, 33, 15, 20, 11, 8, 35, 2, 17, 6, 31]).slice(0, ROWS);
      while (nums.length < ROWS) nums.push(nums[nums.length % Math.max(1, nums.length)] || 0);
      st.nums = nums;
      st.cx = p.mises ? 640 : 960;
      st.tDrop = cue('drop'); st.tFill = cue('fill'); st.tStamp = cue('stamp'); st.tInt = cue('intuition');
      st.tMises = cue('mises-up'); st.tStrike = cue('strike'); st.tExit = cue('exit');

      /* ---- boîtier ---- */
      st.board = g(root);
      const b = st.board;
      for (const dx of [-170, 170]) {                                         // fils de suspension
        rect(b, dx - 18, -1200, 36, 1200 + TOP + 20, 6, C.ink, C.paper, 6);
      }
      rect(b, -BW / 2 + 14, TOP + 14, BW, BH, 24, C.lime);                     // ombre dure
      rect(b, -BW / 2, TOP, BW, BH, 24, C.ink, C.paper, 8);
      text(b, 'DERNIERS NUMÉROS', 0, TOP + 56, 28, C.paper, { anchor: 'middle', mono: true, len: 330 });
      st.led = [circle(b, -BW / 2 + 44, TOP + 46, 11, C.lime), circle(b, BW / 2 - 44, TOP + 46, 11, C.lime)];
      sv('line', { x1: -BW / 2 + 28, x2: BW / 2 - 28, y1: ROW0 - 6, y2: ROW0 - 6, stroke: C.paper, 'stroke-width': 4, 'stroke-linecap': 'round', opacity: 0.8 }, b);
      for (let r = 1; r < ROWS; r++) sv('line', { x1: -BW / 2 + 40, x2: BW / 2 - 40, y1: ROW0 + r * PITCH, y2: ROW0 + r * PITCH, stroke: C.paper, 'stroke-width': 2, opacity: 0.22 }, b);
      // lignes : défilent dans une fenêtre découpée
      const cid = 'zvl-' + String(shot.id || 'x').replace(/[^\w-]/g, '');
      const defs = sv('defs', null, b);
      sv('rect', { x: -BW / 2 + 12, y: ROW0 - 2, width: BW - 24, height: ROWS * PITCH + 4 }, sv('clipPath', { id: cid }, defs));
      const rows = g(b, { 'clip-path': `url(#${cid})` });
      st.rows = [];
      for (let i = 0; i < ROWS; i++) {
        const rg = g(rows);
        const bg = rect(rg, -75, -22, 150, 44, 12, C.pocket, C.paper, 4);
        const tx = text(rg, '', 0, 13, 36, C.white, { anchor: 'middle', mono: true });
        st.rows.push({ rg, bg, tx });
      }
      // balayage « intuition »
      st.scan = rect(b, -BW / 2 + 20, 0, BW - 40, PITCH - 6, 12, 'none', C.lime, 8, { visibility: 'hidden' });
      st.qs = [0, 1, 2].map((i) => {
        const q = g(b);
        circle(q, 0, 0, 34, C.lime, C.ink, 6);
        text(q, '?', 0, 17, 48, C.ink, { anchor: 'middle', mono: true });
        return q;
      });
      // barré (croix rouge)
      st.xs = [];
      for (const dir of [1, -1]) {
        const grp = g(b);
        const y1 = TOP + 150 + (dir < 0 ? BH - 190 : 0), y2 = TOP + 150 + (dir < 0 ? 0 : BH - 190);
        const mk = (col, w) => sv('line', { x1: -BW / 2 + 36, y1, x2: -BW / 2 + 36, y2: y1, stroke: col, 'stroke-width': w, 'stroke-linecap': 'round' }, grp);
        st.xs.push({ grp, a: mk(C.ink, 34), b: mk(C.red, 20), x1: -BW / 2 + 36, y1, x2: BW / 2 - 36, y2 });
      }

      /* ---- tampon (cue `stamp`) ---- */
      st.stamp = null;
      if (st.tStamp != null && p.stamp) {
        const sg = g(root), inner = g(sg);
        const words = String(p.stamp).split(' ');
        const half = Math.ceil(words.length / 2);
        const lines = words.length > 2 ? [words.slice(0, half - 1 + (words.length > 3 ? 0 : 0)).join(' '), words.slice(half - 1).join(' ')] : [String(p.stamp)];
        const l = lines.length === 2 ? [words.slice(0, 2).join(' '), words.slice(2).join(' ')] : lines;
        const fs = 78, lw = Math.max(...l.map((x) => x.length)) * fs * 0.6, w = lw + 90, h = l.length * fs * 1.05 + 50;
        rect(inner, -w / 2 + 14, -h / 2 + 14, w, h, 18, C.ink);
        rect(inner, -w / 2, -h / 2, w, h, 18, C.red, C.ink, 9);
        rect(inner, -w / 2 + 14, -h / 2 + 14, w - 28, h - 28, 10, 'none', C.ink, 4);
        l.forEach((ln, i) => text(inner, ln, 0, -h / 2 + 25 + fs * 0.86 + i * fs * 1.05, fs, C.ink, { anchor: 'middle', len: Math.round(ln.length * fs * 0.6) }));
        st.stamp = sg;
      }

      /* ---- pile de mises (option) ---- */
      st.pile = null;
      if (p.mises) {
        const px = 1340, gy = 800;
        const pg = g(root);
        sv('line', { x1: px - 130, x2: px + 130, y1: gy + 4, y2: gy + 4, stroke: C.paper, 'stroke-width': 8, 'stroke-linecap': 'round' }, pg);
        const chips = [];
        for (let i = 0; i < 16; i++) {
          const cg = g(pg);
          rect(cg, -75 + 7, -12 + 7, 150, 26, 8, C.ink);
          rect(cg, -75, -12, 150, 26, 8, C.white, C.ink, 5);
          rect(cg, -48, -12, 22, 26, 0, C.lime);
          rect(cg, 26, -12, 22, 26, 0, C.lime);
          rect(cg, -75, -12, 150, 26, 8, 'none', C.ink, 5);
          chips.push(cg);
        }
        const ag = g(pg);
        const shaft = rect(ag, -17, -300, 34, 300, 6, C.red, C.ink, 7);
        const head = sv('path', { d: 'M-52 0L0 -76L52 0Z', fill: C.red, stroke: C.ink, 'stroke-width': 7, 'stroke-linejoin': 'round' }, ag);
        const lab = text(pg, 'MISES', px, gy + 56, 34, C.paper, { mono: true, anchor: 'middle' });
        st.pile = { pg, chips, ag, shaft, head, lab, px, gy };
      }
      return st;
    },

    update(st, t, shot) {
      const p = st.p;
      /* ---- entrée / sortie du boîtier ---- */
      let by = 0;
      if (st.tDrop != null) {
        const a = t - st.tDrop;
        if (a < 0) by = -1500;
        else if (a < 0.28) by = -1500 * (1 - E.in3(a / 0.28));
        else by = -24 * Math.sin(Math.PI * clamp((a - 0.28) / 0.22)) * (1 - clamp((a - 0.28) / 0.22));
      }
      if (st.tExit != null) {
        const d = Math.min(0.3, Math.max(0.12, st.dur - st.tExit - 0.02));
        by += -1500 * E.in3(prog(t, st.tExit, st.tExit + d));
      }
      const [shx, shy] = st.tDrop != null && t >= st.tDrop + 0.28 ? shakeAt(t, st.tDrop + 0.28, 8, 0.3) : [0, 0];
      st.board.setAttribute('transform', `translate(${f2(st.cx + shx)} ${f2(by + shy)})`);

      /* ---- les 12 lignes : défilement à chaque bip ---- */
      const nums = st.nums;
      let m = ROWS, slide = 1, lastBeep = -9;
      if (st.tFill != null) {
        const gap = clamp((st.dur - st.tFill - 0.3) / ROWS, 0.06, 0.2);
        const u = (t - st.tFill) / gap;
        m = u < 0 ? 0 : Math.min(ROWS, Math.floor(u) + 1);
        const tk = st.tFill + (m - 1) * gap;
        slide = m === 0 ? 1 : E.out3(prog(t, tk, tk + Math.min(0.09, gap)));
        lastBeep = m === 0 ? -9 : tk;
      }
      for (let r = 0; r < ROWS; r++) {
        const o = st.rows[r];
        const on = r < m;
        o.rg.setAttribute('visibility', on ? 'visible' : 'hidden');
        if (!on) continue;
        const n = nums[ROWS - m + r];
        const c = colorOf(n);
        const x = c === 'red' ? 105 : c === 'black' ? -105 : 0;
        const y = rowY(r) - PITCH * (1 - slide) * (st.tFill != null && m < ROWS + 1 ? 1 : 0);
        o.rg.setAttribute('transform', `translate(${x} ${f2(y)})`);
        o.bg.setAttribute('fill', c === 'red' ? C.red : c === 'lime' ? C.lime : C.pocket);
        o.bg.setAttribute('stroke', c === 'black' ? C.paper : C.ink);
        o.tx.setAttribute('fill', c === 'black' ? C.white : C.ink);
        o.tx.textContent = String(n);
      }
      // le bip : les deux voyants s'allument
      const beep = lastBeep > -9 ? 1 - prog(t, lastBeep, lastBeep + 0.08) : 0;
      st.led.forEach((l) => l.setAttribute('r', f2(11 + 5 * beep)));

      /* ---- balayage « intuition » ---- */
      const ti = st.tInt;
      if (ti != null) {
        const q = prog(t, ti, ti + 1.1);
        const r = q * (ROWS - 1);
        st.scan.setAttribute('visibility', t >= ti && t < ti + 1.5 ? 'visible' : 'hidden');
        st.scan.setAttribute('y', f2(ROW0 + Math.floor(r) * PITCH + 3));
        st.qs.forEach((qn, i) => {
          const qq = prog(t, ti + 0.15 + i * 0.28, ti + 0.15 + i * 0.28 + 0.25);
          const gone = t > ti + 1.5;
          const s = gone ? 0 : (qq > 0 ? E.back(qq) : 0);
          put(qn, BW / 2 + 56 + (i % 2) * 34, ROW0 + 90 + i * 190 + Math.sin(t * 7 + i) * 4, (i - 1) * 7, s, s, s > 0 ? 1 : 0);
        });
      } else { st.scan.setAttribute('visibility', 'hidden'); st.qs.forEach((qn) => put(qn, 0, 0, 0, 0, 0, 0)); }

      /* ---- barré : deux traits rouges tracés en 6 i chacun ---- */
      st.xs.forEach((o, i) => {
        const q = st.tStrike == null ? 0 : E.out3(prog(t, st.tStrike + i * 0.1, st.tStrike + i * 0.1 + 0.2));
        o.grp.setAttribute('visibility', q > 0 ? 'visible' : 'hidden');
        for (const ln of [o.a, o.b]) { ln.setAttribute('x2', f2(lerp(o.x1, o.x2, q))); ln.setAttribute('y2', f2(lerp(o.y1, o.y2, q))); }
      });

      /* ---- tampon ---- */
      if (st.stamp) {
        const a = t - st.tStamp;
        const k = prog(t, st.tStamp, st.tStamp + 5 / 30);
        const sc = lerp(2.6, 1, E.out3(k));
        const [dx, dy] = shakeAt(t, st.tStamp + 5 / 30, 14, 0.4);
        put(st.stamp, st.cx + 70 + dx, 440 + dy, -8, a < 0 ? 0 : sc, a < 0 ? 0 : sc, a < 0 ? 0 : clamp(k * 4));
      }

      /* ---- pile de mises ---- */
      if (st.pile) {
        const pl = st.pile;
        const t0 = st.tDrop == null ? 0 : st.tDrop + 0.5;
        const appear = st.tDrop == null ? 1 : E.back(prog(t, t0, t0 + 0.3));
        const up = st.tMises == null ? 0 : E.io2(prog(t, st.tMises, st.tMises + Math.min(1.3, Math.max(0.5, st.dur - st.tMises - 0.1))));
        const c = 2 + 13 * up;
        pl.pg.setAttribute('visibility', appear > 0 ? 'visible' : 'hidden');
        pl.chips.forEach((cg, i) => {
          const born = i < 2 ? 1 : clamp(c - i);
          const s = i < 2 ? Math.max(appear, 0) : (born > 0 && appear > 0 ? E.back(born) : 0);
          put(cg, pl.px, pl.gy - 13 - i * 24, (i % 2 ? 1.5 : -1.5), s, s, s > 0 ? 1 : 0);
        });
        const q = st.tMises == null ? 0 : prog(t, st.tMises, st.tMises + 0.3);
        const hgt = 24 * (c - 2) + 60;
        pl.ag.setAttribute('transform', `translate(${pl.px + 170} ${pl.gy - 6})`);
        pl.shaft.setAttribute('y', f2(-hgt)); pl.shaft.setAttribute('height', f2(hgt));
        pl.head.setAttribute('transform', `translate(0 ${f2(-hgt)})`);
        pl.ag.setAttribute('visibility', q > 0 ? 'visible' : 'hidden');
      }
    }
  });
})();
