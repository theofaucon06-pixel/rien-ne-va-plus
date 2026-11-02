// Composant « streak-board » : la série des 26 noirs (2 rangées de 13 tuiles), gros compteur lime, bulles de la salle,
// panneau « PROCHAIN TOUR : 18/37 ROUGE » qui ne change jamais, tuile « ? », répartition fantôme 50/50, flèche « RATTRAPER ? ».
// Fonction pure du temps ; les flips suivent les repères `flip` / `run`, sinon ils s'accélèrent (puissance 1.7).
(() => {
  'use strict';
  const { C, E, clamp, prog, lerp, f2, sv, g, rect, circle, text, put } = ZV;
  const N = 26, PER = 13, TS = 100, PITCH = 124, GX = 216, ROW_Y = [420, 550];
  const FLIP = 0.3;
  const tilePos = (i) => [GX + (i % PER) * PITCH, ROW_Y[Math.floor(i / PER)]];

  ZV.define('streak-board', {
    init(root, shot) {
      const p = shot.props || {};
      const cue = (n) => ZV.cue(shot, n);
      const st = { p, dur: shot.dur };
      rect(root, 0, 0, 1920, 1080, 0, C.ink);
      const startAt = clamp(Math.round(p.start_at || 0), 0, N), flipTo = clamp(Math.round(p.flip_to == null ? startAt : p.flip_to), startAt, N);
      st.startAt = startAt; st.flipTo = flipTo;

      /* ---- calendrier des flips ---- */
      const ft = new Array(N).fill(1e9);
      for (let i = 0; i < startAt; i++) ft[i] = -10;
      let idx = startAt;
      const flipCues = ZV.cues(shot, 'flip').map((b) => b.t);
      const runs = ZV.cues(shot, 'run');
      const tCount = cue('count'), tGhost = cue('ghost');
      for (const t of flipCues) if (idx < flipTo) ft[idx++] = t;
      runs.forEach((r, k) => {
        const to = clamp(Math.round(r.to == null ? flipTo : r.to), idx, flipTo);
        let end = shot.dur - 0.3;
        if (runs[k + 1]) end = Math.min(end, runs[k + 1].t - 0.1);
        if (tCount != null && tCount > r.t + 0.3) end = Math.min(end, tCount - 0.12);
        if (tGhost != null && tGhost > r.t + 0.4) end = Math.min(end, tGhost - 0.12);
        end = Math.max(end, r.t + 0.45);
        const n = to - idx;
        for (let j = 0; j < n; j++) { const x = n > 1 ? j / (n - 1) : 0; ft[idx + j] = r.t + Math.max(0, end - r.t - FLIP) * (1 - Math.pow(1 - x, 1.7)); }
        idx = to;
      });
      if (!flipCues.length && !runs.length && flipTo > idx) {
        const n = flipTo - idx;
        for (let j = 0; j < n; j++) { const x = n > 1 ? j / (n - 1) : 0; ft[idx + j] = 0.3 + (shot.dur - 0.9) * (1 - Math.pow(1 - x, 1.7)); }
      }
      st.ft = ft;

      /* ---- côté du compteur : on évite les stickers du noyau ---- */
      const stk = shot.beats.filter((b) => b.do === 'sticker');
      let side = 'right';
      if (stk.some((b) => b.x < 700)) side = 'right';
      else if (stk.some((b) => b.x > 1100 && b.y < 330)) side = 'left';
      if (p.arrow) side = 'left';
      st.side = side;
      st.popIn = startAt === 0 || shot.in !== 'cut';

      /* ---- tuiles ---- */
      st.tiles = [];
      for (let i = 0; i < N; i++) {
        const [x, y] = tilePos(i);
        const gt = g(root);
        const empty = rect(gt, -TS / 2, -TS / 2, TS, TS, 16, 'none', C.paper, 5, { 'stroke-dasharray': '9 10', opacity: 0.6 });
        const full = g(gt);
        rect(full, -TS / 2 + 8, -TS / 2 + 8, TS, TS, 16, C.ink);
        rect(full, -TS / 2, -TS / 2, TS, TS, 16, C.pocket, C.paper, 5);
        text(full, String(i + 1), 0, 14, 42, C.white, { anchor: 'middle', mono: true });
        st.tiles.push({ gt, empty, full, x, y });
      }

      /* ---- compteur ---- */
      const cx = side === 'right' ? 1754 : 166, anch = side === 'right' ? 'end' : 'start';
      st.lab = text(root, 'NOIRS D’AFFILÉE', cx, 108, 36, C.paper, { mono: true, anchor: anch });
      st.countG = g(root);
      st.count = text(st.countG, '0', 0, 0, 215, C.lime, { anchor: anch });
      st.cx = cx; st.anch = anch;
      st.tCount = tCount;

      /* ---- bulles de la salle ---- */
      st.bubbles = [];
      (Array.isArray(p.bubbles) ? p.bubbles : []).forEach((b, k) => {
        const t0 = cue(b.cue);
        const size = 46 + 14 * k, len = Math.round(String(b.text).length * size * 0.6);
        const w = len + 80, h = size * 1.5 + 30;
        const bg = g(root);
        const inner = g(bg);
        rect(inner, -w / 2 + 12, -h / 2 + 12, w, h, 30, C.ink);
        rect(inner, -w / 2, -h / 2, w, h, 30, C.paper, C.ink, 7);
        text(inner, b.text, 0, size * 0.36, size, C.ink, { anchor: 'middle', len });
        if (k === 0) {
          circle(bg, -w / 2 + 70, h / 2 + 30, 13, C.paper, C.ink, 5);
          circle(bg, -w / 2 + 92, h / 2 + 58, 8, C.paper, C.ink, 5);
        }
        st.bubbles.push({ bg, w, h, t0: t0 == null ? 1e9 : t0, k, tilt: k % 2 ? 2.5 : -3 });
      });

      /* ---- date (si le noyau ne dessine pas déjà le sticker) ---- */
      st.date = null;
      if (p.date && !stk.some((b) => String(b.text).toUpperCase() === String(p.date).toUpperCase())) {
        const dg = g(root); const inner = g(dg);
        const len = Math.round(String(p.date).length * 44 * 0.6), w = len + 70;
        rect(inner, -w / 2 + 10, -42 + 10, w, 84, 18, C.ink);
        rect(inner, -w / 2, -42, w, 84, 18, C.paper, C.ink, 6);
        text(inner, p.date, 0, 15, 44, C.ink, { anchor: 'middle', len });
        st.date = dg;
      }

      /* ---- panneau « prochain tour » ---- */
      st.panel = null;
      if (p.panel) {
        const pg = g(root), inner = g(pg);
        const text0 = p.panel_text || 'PROCHAIN TOUR : 18/37 ROUGE';
        const len = Math.min(1080, Math.round(text0.length * 62 * 0.58)), w = len + 250, h = 128;
        rect(inner, -w / 2 + 12, -h / 2 + 12, w, h, 28, C.ink);
        rect(inner, -w / 2, -h / 2, w, h, 28, C.paper, C.ink, 7);
        const tile = g(inner, { transform: `translate(${-w / 2 + 92} 0)` });
        rect(tile, -44, -44, 88, 88, 14, C.pocket, C.ink, 6);
        text(tile, '?', 0, 20, 62, C.white, { anchor: 'middle', mono: true });
        text(inner, text0, -w / 2 + 170 + len / 2, 22, 62, C.ink, { anchor: 'middle', len });
        st.panel = { pg, w, y: 722 };
        st.tPulse = ZV.cues(shot, 'panel-pulse').map((b) => b.t);
      }

      /* ---- fantôme moitié-moitié ---- */
      st.ghost = null;
      if (p.ghost) {
        const n = Math.max(2, flipTo || 6), half = Math.ceil(n / 2);
        const gg = g(root), items = [];
        for (let i = 0; i < n; i++) {
          const x = GX + i * PITCH, y = 720;
          const red = i < half;
          const gt = g(gg);
          rect(gt, -TS / 2, -TS / 2, TS, TS, 16, 'none', red ? C.red : C.paper, 9);
          if (red) rect(gt, -TS / 2 + 14, -TS / 2 + 14, TS - 28, TS - 28, 8, C.red, null, 0, { opacity: 0.25 });
          items.push({ gt, x, y });
        }
        const lab = text(gg, 'ATTENDU : MOITIÉ-MOITIÉ', GX - TS / 2, 640, 34, C.paper, { mono: true });
        const pl = g(root), inner = g(pl);
        const txt = `${n - half} / ${half}`;
        rect(inner, -120 + 10, -48 + 10, 240, 96, 20, C.ink);
        rect(inner, -120, -48, 240, 96, 20, C.lime, C.ink, 6);
        text(inner, txt, 0, 24, 64, C.ink, { anchor: 'middle', mono: true });
        st.ghost = { items, lab, pl, t0: tGhost == null ? 0.2 : tGhost, px: GX + (n - 1) * PITCH + 230, py: 720 };
      }

      /* ---- flèche « RATTRAPER ? » ---- */
      st.arrow = null;
      if (p.arrow) {
        const t0 = cue('arrow');
        const ag = g(root), shaft = g(ag);
        const len = 330;
        rect(shaft, 0, -22, len - 60, 44, 8, C.red, C.ink, 7);
        sv('path', { d: `M${len - 70} -62L${len + 10} 0L${len - 70} 62Z`, fill: C.red, stroke: C.ink, 'stroke-width': 7, 'stroke-linejoin': 'round' }, shaft);
        const pl = g(root), inner = g(pl);
        const w = Math.round(String(p.arrow).length * 56 * 0.6) + 80;
        rect(inner, -w / 2 + 10, -52 + 10, w, 104, 22, C.ink);
        rect(inner, -w / 2, -52, w, 104, 22, C.red, C.ink, 6);
        text(inner, p.arrow, 0, 20, 56, C.ink, { anchor: 'middle', len: w - 80 });
        const [lx, ly] = tilePos(Math.min(flipTo, N - 1));
        st.arrow = { shaft, pl, t0: t0 == null ? 0.5 : t0, x: Math.min(lx - 40, 1480), y: ly };
      }
      return st;
    },

    update(st, t, shot) {
      const { ft } = st;
      let n = 0, lf = -9;
      const pop = (i) => (st.popIn ? E.back(prog(t, 0.05 + i * 0.02, 0.05 + i * 0.02 + 0.3)) : 1);
      for (let i = 0; i < N; i++) {
        const o = st.tiles[i];
        const pin = pop(i);
        const f = ft[i];
        const pf = prog(t, f, f + FLIP);
        if (t >= f + FLIP) { n++; if (f + FLIP > lf) lf = f + FLIP; }
        else if (f <= t) { /* en cours de retournement : pas encore compté */ }
        const sx = pf > 0 && pf < 1 ? Math.max(Math.abs(Math.cos(pf * Math.PI)), 0.001) : 1;
        o.empty.setAttribute('visibility', pf < 0.5 ? 'visible' : 'hidden');
        o.full.setAttribute('visibility', pf >= 0.5 ? 'visible' : 'hidden');
        const sc = Math.max(pin, 0);
        put(o.gt, o.x, o.y, 0, sc * sx, sc * (1 + 0.1 * Math.sin(pf * Math.PI)), clamp(pin * 4));
      }
      /* ---- compteur : « tape » à chaque flip, claque sur « count » ---- */
      let bump = lf > -9 ? 1 + 0.07 * (1 - prog(t, lf, lf + 0.16)) : 1;
      let hot = false;
      if (st.tCount != null && t >= st.tCount) { const q = prog(t, st.tCount, st.tCount + 0.28); bump = lerp(1.5, 1, E.out3(q)); hot = q < 1; }
      st.count.textContent = String(n);
      st.count.setAttribute('fill', hot ? C.paper : C.lime);
      st.countG.setAttribute('transform', `translate(${st.cx} 322) scale(${f2(bump)})`);
      const lp = E.back(prog(t, 0.05, 0.35));
      st.lab.setAttribute('opacity', f2(clamp(lp * 3)));

      /* ---- bulles : elles s'empilent à gauche et grossissent ---- */
      let by = 300;
      for (const b of st.bubbles) {
        const q = prog(t, b.t0, b.t0 + 0.32);
        const sc = q > 0 ? E.back(q) : 0;
        const cy = by - b.h / 2;
        put(b.bg, 150 + b.w / 2, cy - 14 * (1 - E.out3(q)), b.tilt, sc, sc, q > 0 ? 1 : 0);
        by = cy - b.h / 2 - 22;
      }
      /* ---- date ---- */
      if (st.date) { const q = E.back(prog(t, 0.2, 0.5)); put(st.date, 330, 170, -3, q, q, q > 0 ? 1 : 0); }

      /* ---- panneau : il ne change jamais, il pulse ---- */
      if (st.panel) {
        const pin = st.popIn ? E.back(prog(t, 0.3, 0.7)) : 1;
        let pulse = lf > -9 ? 0.07 * (1 - prog(t, lf, lf + 0.2)) : 0;
        for (const tp of st.tPulse) if (t >= tp) pulse = Math.max(pulse, 0.1 * (1 - prog(t, tp, tp + 0.24)));
        const sc = Math.max(pin, 0) * (1 + pulse);
        put(st.panel.pg, 960, st.panel.y + (1 - Math.min(pin, 1)) * 160, 0, sc, sc, clamp(pin * 4));
      }
      /* ---- fantôme ---- */
      if (st.ghost) {
        const gh = st.ghost;
        gh.items.forEach((it, i) => { const q = prog(t, gh.t0 + i * 0.045, gh.t0 + i * 0.045 + 0.3); const s = q > 0 ? E.back(q) : 0; put(it.gt, it.x, it.y, 0, s, s, q > 0 ? 1 : 0); });
        gh.lab.setAttribute('visibility', t >= gh.t0 ? 'visible' : 'hidden');
        const q = prog(t, gh.t0 + 0.25, gh.t0 + 0.6);
        put(gh.pl, Math.min(gh.px, 1740), gh.py, 3, E.back(q) || 0.0001, E.back(q) || 0.0001, q > 0 ? 1 : 0);
      }
      /* ---- flèche ---- */
      if (st.arrow) {
        const a = st.arrow, q = prog(t, a.t0, a.t0 + 0.3), qs = prog(t, a.t0 + 0.2, a.t0 + 0.5);
        put(a.shaft, a.x, a.y, 0, Math.max(E.out3(q), 0.0001), 1, q > 0 ? 1 : 0);
        put(a.pl, a.x + 175, a.y - 118, -3, E.back(qs) || 0.0001, E.back(qs) || 0.0001, qs > 0 ? 1 : 0);
      }
    }
  });
})();
