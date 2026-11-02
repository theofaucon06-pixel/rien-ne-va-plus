// Composant `tick-grid` : « un tour toutes les 3 secondes ». Anneau-minuteur de 3 s + point qui s'allume, puis grille de 1 200 carrés (60 × 20, 22 px) qui se remplit.
// Cues : tick, minute, hour, hand, no-pause. Fond paper. Aucun dégradé, flou, lueur ni filter ; remplissage = progression (rien ne clignote).
(() => {
  'use strict';
  const { C, E, clamp, prog, lerp, f2, sv, g, rect, circle, path, line, text, put, sticker, shakeAt } = ZV;
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const NB = ' ';
  const COLS = 60, ROWS = 20, PITCH = 22, SZ = 17, GX = 300, GY = 300, N = COLS * ROWS;
  const RR = 190;
  const pad5 = (n) => { const s = String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, NB); return NB.repeat(Math.max(0, 5 - s.length)) + s; };
  const dsec = (v) => (Math.round(v * 10) / 10).toFixed(1).replace('.', ',');

  function drawHand(parent) {
    const h = g(parent);
    rect(h, -52, 150, 124, 190, 46, C.paper, C.ink, 5);
    for (let k = 0; k < 3; k++) rect(h, 8, 104 + k * 36, 60 - k * 5, 32, 16, C.paper, C.ink, 5);
    path(h, 'M-19 19 A19 19 0 0 1 19 19 L19 206 L-19 206Z', C.paper);
    path(h, 'M-19 206 L-19 19 A19 19 0 0 1 19 19 L19 206', 'none', C.ink, 5);
    const th = g(h, { transform: 'translate(-48 176) rotate(30)' });
    sv('ellipse', { cx: 0, cy: 0, rx: 17, ry: 44, fill: C.paper, stroke: C.ink, 'stroke-width': 5 }, th);
    rect(h, -62, 330, 142, 150, 6, C.red, C.ink, 5);
    rect(h, -62, 352, 142, 16, 0, C.ink);
    return h;
  }

  ZV.define('tick-grid', {
    init(root, shot) {
      const p = shot.props || {};
      const beats = Array.isArray(shot.beats) ? shot.beats : [];
      const dur = isNum(shot.dur) && shot.dur > 0 ? shot.dur : 8;
      const cueL = (n) => beats.filter((b) => b && b.do === 'cue' && b.name === n && isNum(b.t)).sort((a, b) => a.t - b.t);
      const period = isNum(+p.period) && p.period != null && +p.period > 0 ? +p.period : 3;
      const perMin = isNum(+p.per_minute) && p.per_minute != null && +p.per_minute > 0 ? Math.round(+p.per_minute) : 20;
      const perHour = isNum(+p.per_hour) && p.per_hour != null && +p.per_hour > 0 ? Math.round(+p.per_hour) : 1200;
      const accent = p.accent === 'red' ? C.red : C.lime;
      const st = { dur, period, perMin, perHour: Math.min(perHour, N), accent, dKey: -1 };

      rect(root, 0, 0, 1920, 1080, 0, C.paper);

      /* ---- grille : 1 200 carrés, remplissage colonne par colonne (1 colonne = 1 minute) ---- */
      st.gridG = g(root);
      st.cells = [];
      for (let i = 0; i < N; i++) {
        const c = Math.floor(i / ROWS), r = i % ROWS;
        st.cells.push({ n: rect(st.gridG, GX + c * PITCH + 2.5, GY + r * PITCH + 2.5, SZ, SZ, 3, C.ink, null, 0, { opacity: 0.12 }), s: 0 });
      }
      st.curN = 0;

      /* ---- compteur (plaque) ---- */
      st.plate = g(root);
      rect(st.plate, -410 + 12, -70 + 12, 820, 140, 16, C.ink);
      rect(st.plate, -410, -70, 820, 140, 16, accent, C.ink, 6);
      st.cnt = text(st.plate, '', -330, 34, 96, C.ink, { mono: true, weight: 800 });

      /* ---- anneau ---- */
      st.ringG = g(root);
      circle(st.ringG, 0, 0, RR, 'none', C.ink, 48);
      circle(st.ringG, 0, 0, RR, 'none', C.paper, 34);
      st.arc = sv('circle', { cx: 0, cy: 0, r: RR, fill: 'none', stroke: accent, 'stroke-width': 34, pathLength: 1, transform: 'rotate(-90)', 'stroke-dasharray': '0 1.01' }, st.ringG);
      st.dot = g(st.ringG, { transform: `translate(0 ${-RR})` });
      st.dotC = circle(st.dot, 0, 0, 22, C.paper, C.ink, 7);
      st.clock = text(st.ringG, '3 s', 0, 32, 92, C.ink, { anchor: 'middle', mono: true, weight: 800 });
      st.mini = [];
      for (let i = 0; i < 8; i++) st.mini.push(circle(st.ringG, (i - 3.5) * 36, RR + 78, 13, C.paper, C.ink, 5));
      st.stk = g(root);
      sticker(st.stk, 150, 80, accent, '3 s', 50, C.ink, { sh: 8 });

      /* ---- no-pause, bouton, main ---- */
      st.labels = ['CROUPIER', 'BILLE', 'PAUSE'].map((lab) => {
        const gg = g(root);
        sticker(gg, 330, 78, C.white, lab, 44, C.ink, { sh: 9, r: 12 });
        const k0 = sv('line', { x1: -170, y1: 8, x2: 170, y2: -8, stroke: C.ink, 'stroke-width': 13, 'stroke-linecap': 'round' }, gg);
        const k1 = sv('line', { x1: -170, y1: 8, x2: 170, y2: -8, stroke: C.red, 'stroke-width': 6, 'stroke-linecap': 'round' }, gg);
        return { gg, k0, k1 };
      });
      st.btn = g(root, { transform: 'translate(1760 770)' });
      circle(st.btn, 0, 0, 74, C.paper, C.ink, 6);
      circle(st.btn, 0, 10, 56, C.ink);
      st.btnTop = g(st.btn);
      circle(st.btnTop, 0, 0, 56, C.red, C.ink, 6);
      text(st.btnTop, 'SPIN', 0, 13, 36, C.ink, { anchor: 'middle', len: 88 });
      st.handG = g(root);
      st.hand = drawHand(st.handG);

      /* ---- repères ---- */
      const ticks = cueL('tick').map((b) => b.t);
      const tm = (cueL('minute')[0] || {}).t, thh = (cueL('hour')[0] || {}).t, tnp = (cueL('no-pause')[0] || {}).t, thand = (cueL('hand')[0] || {}).t;
      st.tm = tm; st.th = thh; st.tnp = tnp; st.thand = thand;
      st.tg = tm != null && thh != null ? Math.min(tm, thh) : tm != null ? tm : thh;
      st.laps = ticks.map((t0, i) => {
        const bound = i + 1 < ticks.length ? ticks[i + 1] : dur;
        const fd = bound - t0 >= period + 0.3 ? period : Math.max(0.8, bound - t0 - 0.3);
        return { t0, fd };
      });
      st.hourD = clamp(dur - (thh == null ? 0 : thh) - 0.8, 1.2, 3.2);
      st.base = tm != null ? perMin : 0;
      st.lblY = st.tg != null && tnp != null && tnp >= st.tg ? 785 : 770;
      return st;
    },

    update(st, t) {
      const { tm, th, tg, tnp, thand } = st;
      /* ---- grille visible à partir de tg ---- */
      const gp = tg == null ? 0 : E.out3(prog(t, tg, tg + 0.35));
      const gv = gp > 0;
      setA(st.gridG, 'visibility', gv ? 'visible' : 'hidden');
      setA(st.gridG, 'transform', `translate(0 ${GY}) scale(1 ${f2(Math.max(gp, 0.001))}) translate(0 ${-GY})`);
      setA(st.plate, 'visibility', gv ? 'visible' : 'hidden');

      /* ---- remplissage ---- */
      let n = 0, hourMode = false;
      if (tm != null) n = clamp(Math.floor((t - tm - 0.35) / 0.1) + 1, 0, st.perMin);
      let clap = 0, tEnd = null;
      if (th != null) {
        const q = prog(t, th + 0.2, th + 0.2 + st.hourD);
        if (t >= th) { hourMode = true; n = Math.max(n, Math.floor(st.base + (st.perHour - st.base) * Math.pow(q, 2.2))); }
        tEnd = th + 0.2 + st.hourD;
        if (t >= tEnd) clap = prog(t, tEnd, tEnd + 0.4);
      }
      n = Math.min(n, N);
      // styles : 0 éteint, 1 allumé, 2 front (les 24 dernières)
      const lo = Math.max(0, Math.min(st.curN, n) - 26), hi = Math.min(N, Math.max(st.curN, n) + 1);
      for (let i = lo; i < hi; i++) {
        const s = i >= n ? 0 : i >= n - 24 && n < st.perHour ? 2 : 1;
        const c = st.cells[i];
        if (c.s === s) continue;
        c.s = s;
        const nn = c.n;
        if (s === 0) { nn.setAttribute('fill', C.ink); nn.setAttribute('opacity', 0.12); nn.removeAttribute('stroke'); nn.removeAttribute('stroke-width'); }
        else if (s === 1) { nn.setAttribute('fill', st.accent); nn.setAttribute('opacity', 1); nn.setAttribute('stroke', C.ink); nn.setAttribute('stroke-width', 2.5); }
        else { nn.setAttribute('fill', C.ink); nn.setAttribute('opacity', 1); nn.setAttribute('stroke', C.ink); nn.setAttribute('stroke-width', 2.5); }
      }
      st.curN = n;
      // compteur quantifié (4 pas / s en phase heure)
      let shown = n;
      if (hourMode && t < tEnd) { const tq = Math.floor(t * 4) / 4; const q = prog(tq, th + 0.2, th + 0.2 + st.hourD); shown = Math.min(st.perHour, Math.floor(st.base + (st.perHour - st.base) * Math.pow(q, 2.2))); }
      if (hourMode && t >= tEnd) shown = st.perHour;
      const txt = hourMode ? `${pad5(shown)} / H` : `${pad5(shown)} / MIN`;
      if (st.cnt.textContent !== txt) st.cnt.textContent = txt;
      const cs = 1 + 0.1 * Math.sin(Math.PI * clap), sh = clap > 0 && clap < 1 ? shakeAt(t, tEnd, 6, 0.35) : [0, 0];
      const pp = gv ? E.back(clamp((t - tg) / 0.4)) : 0;
      put(st.plate, 960 + sh[0], 205 + sh[1], 0, pp * cs, pp * cs, gv ? 1 : 0);

      /* ---- anneau ---- */
      let lap = null, done = 0;
      for (const l of st.laps) { if (l.t0 <= t) lap = l; if (t >= l.t0 + l.fd) done++; }
      const pr = lap ? clamp((t - lap.t0) / lap.fd) : 0;
      setA(st.arc, 'stroke-dasharray', `${f2(pr)} 1.01`);
      setA(st.arc, 'visibility', pr > 0 ? 'visible' : 'hidden');
      const full = lap && pr >= 1;
      const dp = full ? E.back(clamp((t - (lap.t0 + lap.fd)) / 0.3)) : 0;
      setA(st.dotC, 'fill', full ? st.accent : C.paper);
      st.dot.setAttribute('transform', `translate(0 ${-RR}) scale(${f2(full ? 0.6 + 0.9 * Math.min(dp, 1.2) * (dp > 1 ? 1 : 1) : 1)})`);
      const ck = lap ? (full ? `${dsec(lap.fd)} s` : `${dsec(pr * lap.fd)} s`) : `${st.period} s`;
      if (st.clock.textContent !== ck) st.clock.textContent = ck;
      st.mini.forEach((m, i) => { setA(m, 'fill', i < done ? st.accent : C.paper); setA(m, 'visibility', gp < 0.5 ? 'visible' : 'hidden'); });
      const gp2 = E.io3(prog(t, tg == null ? 1e9 : tg, (tg == null ? 1e9 : tg) + 0.55));
      const rs = lerp(1, 0.46, gp2), rx = lerp(960, 240, gp2), ry = lerp(430, 200, gp2);
      put(st.ringG, rx, ry, 0, rs, rs, 1);
      // sticker « 3 s » à chaque tour
      let so = 0, sa = 0;
      if (lap) { const s = t - lap.t0; sa = E.back(clamp(s / 0.25)); if (s > 1.4) sa *= 1 - E.in2(prog(s, 1.4, 1.65)); so = s >= 0 && sa > 0.001 ? 1 : 0; }
      put(st.stk, rx + 215 * rs + 30, ry - 190 * rs - 10, -7, sa * (0.6 + 0.4 * rs), sa * (0.6 + 0.4 * rs), so);

      /* ---- no-pause ---- */
      st.labels.forEach((L, i) => {
        const t0 = tnp == null ? 1e9 : tnp + i * 0.55;
        const q = prog(t, t0, t0 + 0.25), sc = q > 0 ? E.back(q) : 0;
        put(L.gg, 700 + i * 340, st.lblY, i === 1 ? 2 : -2, sc, sc, q > 0 ? 1 : 0);
        const k = E.out3(prog(t, t0 + 0.5, t0 + 0.75));
        for (const kn of [L.k0, L.k1]) { setA(kn, 'visibility', k > 0 ? 'visible' : 'hidden'); kn.setAttribute('x2', f2(lerp(-170, 170, k))); kn.setAttribute('y2', f2(lerp(8, -8, k))); }
      });

      /* ---- bouton + main ---- */
      const hp = thand == null ? 0 : E.out3(prog(t, thand, thand + 0.45));
      setA(st.btn, 'visibility', hp > 0 ? 'visible' : 'hidden');
      setA(st.btnTop, 'transform', `translate(0 ${hp >= 0.97 ? 8 : 0})`);
      setA(st.handG, 'visibility', hp > 0 ? 'visible' : 'hidden');
      const k = 1 - hp;
      st.hand.setAttribute('transform', `translate(${f2(1768 + 150 * k)} ${f2(770 + 36 + 420 * k + (hp >= 0.97 ? 6 : 0))}) rotate(-12)`);
    }
  });
})();
