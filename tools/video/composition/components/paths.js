// Composant « paths » : les 70 trajectoires de joueurs (+1 si le rouge sort, −1 sinon, p = 18/37), 1920×1080.
// Graine FIXE (6901, un flux par joueur) cherchée hors ligne : à 100 / 1 000 / 10 000 tours, 25 / 13 / 0 joueurs sur 70
// finissent devant (strictement au-dessus de la mise de départ). Les mêmes 70 marches servent aux trois horizons
// (le plan à 1 000 tours est le préfixe du plan à 10 000 tours). Modes : walks | converge | one-winner | drown.
(() => {
  'use strict';
  const { C, E, clamp, prog, lerp, f2, sv, g, rect, circle, text, put, fr } = ZV;
  const SEED_WALKS = 6901;        // 25 / 13 / 0 devant à 100 / 1 000 / 10 000 tours
  const SEED_COIN = 341;          // pile ou face : très forte oscillation puis ≈ 50,1 % à 2 000 lancers
  const P_RED = 18 / 37;
  const PX0 = 350, PX1 = 1580, PY0 = 252, PY1 = 790;
  const NP_MAX = 70;
  const pseed = (s, i) => (Math.imul(s, 7919) + Math.imul(i + 1, 104729)) | 0;
  const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const WHITE = rgb('#FFFFFF'), LIME = rgb('#C8FF2E'), RED = rgb('#FF4A36');
  const mix = (a, b, p) => `rgb(${Math.round(a[0] + (b[0] - a[0]) * p)},${Math.round(a[1] + (b[1] - a[1]) * p)},${Math.round(a[2] + (b[2] - a[2]) * p)})`;

  function makeWalks(np, R) {
    const W = [];
    for (let i = 0; i < np; i++) {
      const r = ZV.rng(pseed(SEED_WALKS, i)), a = new Int16Array(R + 1);
      let v = 0;
      for (let k = 1; k <= R; k++) { v += r() < P_RED ? 1 : -1; a[k] = v; }
      W.push(a);
    }
    return W;
  }
  function pill(parent, w, h, fill, label, size, tfill, o) {
    o = o || {};
    const grp = g(parent);
    rect(grp, -w / 2 + 10, -h / 2 + 10, w, h, o.r || 20, C.ink);
    rect(grp, -w / 2, -h / 2, w, h, o.r || 20, fill, C.ink, 6);
    const t = text(grp, label, 0, size * 0.35, size, tfill || C.ink, { anchor: 'middle', mono: o.mono });
    return { grp, t };
  }
  const wrapPill = (n, x, y, tilt, p) => put(n, x, y, tilt, E.back(clamp(p)) || 0.0001, E.back(clamp(p)) || 0.0001, p > 0 ? 1 : 0);

  ZV.define('paths', {
    init(root, shot) {
      const p = shot.props || {};
      const mode = ['walks', 'converge', 'one-winner', 'drown'].includes(p.mode) ? p.mode : 'walks';
      const cue = (n) => ZV.cue(shot, n);
      const st = { p, mode, dur: shot.dur };
      rect(root, 0, 0, 1920, 1080, 0, C.ink);

      if (mode === 'converge') return initConverge(st, root, shot, p, cue);

      /* ---- données ---- */
      const NP = Math.max(1, Math.min(NP_MAX, p.players || NP_MAX));
      const events = [];
      let Rmax = p.rounds || 100;
      for (const b of shot.beats) if (b.do === 'cue' && /^rounds-/.test(b.name)) { events.push({ t: b.t, R: b.rounds || Rmax, label: b.label, ahead: b.ahead, stat: b.stat }); Rmax = Math.max(Rmax, b.rounds || 0); }
      st.R0 = p.rounds || 100; st.events = events; st.Rmax = Math.max(Rmax, 100);
      const W = makeWalks(NP, st.Rmax);
      st.W = W; st.NP = NP;
      st.cMax = new Int32Array(st.Rmax + 1); st.cMin = new Int32Array(st.Rmax + 1);
      { let mx = 0, mn = 0; for (let k = 0; k <= st.Rmax; k++) { for (let i = 0; i < NP; i++) { const v = W[i][k]; if (v > mx) mx = v; if (v < mn) mn = v; } st.cMax[k] = mx; st.cMin[k] = mn; } }
      let best = 0; for (let i = 1; i < NP; i++) if (W[i][100] > W[best][100]) best = i;
      st.best = best;

      /* ---- plan : tracé ---- */
      const clipId = 'zvp-' + String(shot.id || 'x').replace(/[^\w-]/g, '');
      const defs = sv('defs', null, root);
      const cp = sv('clipPath', { id: clipId }, defs);
      sv('rect', { x: PX0 - 20, y: PY0 - 40, width: PX1 - PX0 + 60, height: PY1 - PY0 + 80 }, cp);
      st.clipId = clipId;
      st.base = g(root);                                      // ligne de départ, repères
      st.baseLine = sv('line', { x1: PX0, x2: PX1, y1: 0, y2: 0, stroke: C.paper, 'stroke-width': 5, 'stroke-dasharray': '24 18', opacity: 0.7, 'stroke-linecap': 'round' }, st.base);
      const clip = g(root, { 'clip-path': `url(#${clipId})` });
      st.lowL = g(clip); st.topL = g(clip);
      // quelles lignes passent devant à l'un des horizons montrés : calque supérieur
      const hz = [st.R0].concat(events.map((e) => e.R));
      st.lines = [];
      for (let i = 0; i < NP; i++) {
        const top = hz.some((R) => W[i][Math.min(R, st.Rmax)] > 0) || (mode !== 'walks' && i === best);
        const n = sv('path', { d: '', fill: 'none', stroke: '#fff', 'stroke-width': 3.2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', opacity: 0.78 }, top ? st.topL : st.lowL);
        st.lines.push(n);
      }
      st.winOut = sv('path', { d: '', fill: 'none', stroke: C.ink, 'stroke-width': 18, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', visibility: 'hidden' }, clip);
      st.winLine = sv('path', { d: '', fill: 'none', stroke: C.lime, 'stroke-width': 9, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', visibility: 'hidden' }, clip);
      st.dots = g(root);
      st.dotNodes = [];
      for (let i = 0; i < NP; i++) st.dotNodes.push(circle(st.dots, 0, 0, 8, C.red, C.ink, 3));
      // moyenne
      if (p.show_mean) {
        st.mean = g(root);
        st.meanOut = sv('line', { x1: PX0, y1: 0, x2: PX0, y2: 0, stroke: C.ink, 'stroke-width': 30, 'stroke-linecap': 'round' }, st.mean);
        st.meanIn = sv('line', { x1: PX0, y1: 0, x2: PX0, y2: 0, stroke: C.white, 'stroke-width': 16, 'stroke-linecap': 'round' }, st.mean);
        st.meanDot = circle(st.mean, PX0, 0, 17, C.white, C.ink, 6);
        const mp = pill(root, 440, 84, C.white, p.mean_label || 'MOYENNE −2,7 %', 40, C.ink, { mono: true });
        st.meanPill = mp.grp;
        st.tMean = cue('mean');
      }
      // textes fixes
      st.base2 = g(root);
      st.baseTxt = text(st.base2, 'MISE', PX0 - 28, 0, 34, C.paper, { mono: true, anchor: 'end' });          // repère « MISE DE DÉPART »
      st.baseTxt2 = text(st.base2, 'DE DÉPART', PX0 - 28, 0, 34, C.paper, { mono: true, anchor: 'end' });
      st.title = text(root, '', 190, 168, 88, C.paper);
      st.sub = text(root, p.label ? '70 JOUEURS · TOUS MISENT SUR LE ROUGE' : '', 190, 212, 28, C.paper, { mono: true, spacing: 1 });
      st.sub.setAttribute('opacity', 0.75);
      st.axL = text(root, '0', PX0, 836, 30, C.paper, { mono: true, anchor: 'middle' });
      st.axR = text(root, '', PX1, 836, 30, C.paper, { mono: true, anchor: 'end' });
      st.axL.setAttribute('opacity', 0.7); st.axR.setAttribute('opacity', 0.7);
      const sp = pill(root, 640, 112, C.lime, '', 54, C.ink);
      st.stat = sp.grp; st.statT = sp.t;
      st.legA = text(root, '', PX1 + 40, 0, 34, C.lime, { mono: true });
      st.legB = text(root, '', PX1 + 40, 0, 34, C.red, { mono: true });
      st.stats = shot.beats.filter((b) => b.do === 'cue' && b.name === 'stat').map((b) => ({ t: Math.min(b.t, shot.dur - 0.45), text: b.stat != null ? b.stat : (p.stat || '') }));
      if (!st.stats.length && p.stat) st.stats.push({ t: Infinity, text: p.stat });

      /* ---- calendrier ---- */
      const tDraw = cue('draw'), tMean = st.tMean, tWin = cue('winner'), tFlood = cue('flood');
      st.pre = tDraw == null && tMean != null && mode === 'walks';
      st.tDraw = st.pre ? -5 : (mode === 'drown' ? 0 : (tDraw == null ? 0 : tDraw));
      const tColor = cue('color');
      const dEnd = mode === 'drown' ? 0 : (st.pre ? -3 : (tColor != null ? Math.max(st.tDraw + 0.8, tColor - 0.3) : st.tDraw + 1.0));
      st.dEnd = dEnd; st.tColor = st.pre ? -2 : (tColor != null ? tColor : dEnd + 0.05);
      st.tWin = tWin; st.tFlood = tFlood;
      if (mode === 'drown') initDrown(st, root, shot, p);
      return st;
    },

    update(st, t, shot) {
      if (st.mode === 'converge') return updConverge(st, t, shot);
      const p = st.p, W = st.W, NP = st.NP;
      // horizon courant R (réel) : change au fil des repères rounds-N
      let R = st.R0, base = st.R0, label = p.label, aheadTarget = p.ahead, lt = -9, trans = false;
      for (const e of st.events) {
        const pr = prog(t, e.t, e.t + 0.6);
        if (pr > 0) { R = Math.exp(lerp(Math.log(base), Math.log(e.R), E.io3(pr))); if (pr < 1) trans = true; }
        if (t >= e.t) { base = e.R; if (e.label != null) { label = e.label; lt = e.t; } if (e.ahead != null) aheadTarget = e.ahead; }
      }
      if (st.mode === 'drown') R = 100;
      R = Math.max(1, Math.min(R, st.Rmax));
      const iR = Math.min(st.Rmax, Math.floor(R));
      let lo0 = Math.min(st.cMin[iR], Math.floor(-0.027 * R) - 1), hi0 = Math.max(st.cMax[iR], 2);
      if (st.mode === 'drown') { lo0 = st.fMin; hi0 = st.fMax; }
      const pad = (hi0 - lo0) * 0.07, lo = lo0 - pad, hi = hi0 + pad;
      const X = (k) => PX0 + (PX1 - PX0) * k / R;
      const Y = (v) => PY1 - (v - lo) / (hi - lo) * (PY1 - PY0);
      const y0 = Y(0);

      const vis = E.io3(prog(t, st.tDraw, st.dEnd));
      const col = E.out2(prog(t, st.tColor, st.tColor + 0.35));
      const showWin = st.mode === 'one-winner' && st.tWin != null && t >= st.tWin;
      const winP = st.tWin == null ? 0 : prog(t, st.tWin, st.tWin + 0.3);

      /* ---- repères ---- */
      st.baseLine.setAttribute('y1', f2(y0)); st.baseLine.setAttribute('y2', f2(y0));
      const ap = E.out3(prog(t, st.tDraw - 0.05, st.tDraw + 0.5));
      st.baseLine.setAttribute('x2', f2(lerp(PX0, PX1, st.pre ? 1 : (st.mode === 'drown' ? E.out3(prog(t, 0, 0.5)) : ap))));
      st.baseTxt.setAttribute('y', f2(y0 - 4)); st.baseTxt2.setAttribute('y', f2(y0 + 34));
      st.base2.setAttribute('visibility', ap > 0.9 ? 'visible' : 'hidden');
      if (st.mode === 'one-winner') label = st.tWin != null && t >= st.tWin ? 'UNE LIGNE SUR 70' : '';
      if (st.mode === 'drown') label = st.tWin != null && t >= st.tWin ? 'TA SOIRÉE GAGNANTE' : '';
      if (st.mode !== 'walks') lt = st.tWin == null ? 0 : st.tWin;
      st.title.textContent = label || '';
      const tp = label ? E.back(prog(t, lt < -5 ? 0 : lt, (lt < -5 ? 0 : lt) + 0.28)) : 0;
      st.title.setAttribute('transform', `translate(0 ${f2((1 - tp) * -30)})`);
      st.title.setAttribute('opacity', f2(clamp(tp * 3)));
      st.sub.setAttribute('visibility', label && st.mode === 'walks' ? 'visible' : 'hidden');
      st.axR.textContent = st.mode === 'walks' ? fr(Math.round(R)) + ' TOURS' : '';

      /* ---- les 70 lignes ---- */
      const n = R * vis;
      const M = Math.max(1, Math.min(300, Math.ceil(R)));
      const endV = new Float64Array(NP);
      const winner = st.best;
      let nA = 0;
      const half = (st.mode === 'one-winner' && showWin) ? 0.5 : 1;
      for (let i = 0; i < NP; i++) {
        const a = W[i];
        const vAt = (k) => { const kk = Math.min(Math.floor(k), st.Rmax), f = k - kk; return a[kk] + ((a[Math.min(kk + 1, st.Rmax)] - a[kk]) * f); };
        endV[i] = vAt(R);
        if (endV[i] > 0) nA++;
        let d = '';
        for (let j = 0; j <= M; j++) {
          const k = j * R / M;
          if (k > n) { if (j > 0 && n > 0) d += `L${Math.round(X(n))} ${Math.round(Y(vAt(n)))}`; break; }
          d += (j ? 'L' : 'M') + Math.round(X(k)) + ' ' + Math.round(Y(vAt(k)));
        }
        const ahead = endV[i] > 0;
        const ln = st.lines[i];
        ln.setAttribute('d', d);
        let c;
        if (st.mode === 'one-winner') c = mix(WHITE, RED, col);
        else c = mix(WHITE, ahead ? LIME : RED, col);
        ln.setAttribute('stroke', c);
        ln.setAttribute('stroke-width', f2(ahead && st.mode !== 'one-winner' ? 3.2 + 1.3 * col : 3.2 + 0.4 * col));
        ln.setAttribute('opacity', f2((0.78 + (0.95 - 0.78) * col) * (showWin && i !== winner ? lerp(1, 0.6, winP) : 1)));
        if (st.mode === 'drown') ln.setAttribute('visibility', 'hidden');
      }
      // dot de fin
      const dotsOn = col > 0.55 && vis > 0.98 && st.mode !== 'drown';
      let yA = 0, nAA = 0, yB = 0, nBB = 0;
      for (let i = 0; i < NP; i++) {
        const dn = st.dotNodes[i];
        const ahead = endV[i] > 0 && st.mode !== 'one-winner';
        const isWin = st.mode === 'one-winner' && showWin && i === winner;
        dn.setAttribute('visibility', dotsOn ? 'visible' : 'hidden');
        if (!dotsOn) continue;
        const yy = Y(endV[i]);
        dn.setAttribute('cx', PX1); dn.setAttribute('cy', f2(yy));
        dn.setAttribute('fill', ahead || isWin ? C.lime : C.red);
        dn.setAttribute('r', isWin ? 14 : 8);
        if (endV[i] > 0) { yA += yy; nAA++; } else { yB += yy; nBB++; }
      }
      /* ---- ligne gagnante (one-winner / drown) ---- */
      const wv = (k) => { const kk = Math.min(Math.floor(k), 100); return W[winner][kk] + ((W[winner][Math.min(kk + 1, 100)] - W[winner][kk]) * (k - kk)); };
      if (st.mode === 'one-winner') {
        let d = '';
        for (let j = 0; j <= 100; j++) d += (j ? 'L' : 'M') + Math.round(X(j * R / 100)) + ' ' + Math.round(Y(wv(j * R / 100)));
        st.winLine.setAttribute('d', d); st.winOut.setAttribute('d', d);
        const on = showWin && vis > 0.98;
        st.winLine.setAttribute('visibility', on ? 'visible' : 'hidden'); st.winOut.setAttribute('visibility', on ? 'visible' : 'hidden');
        const w = lerp(4, 11, E.back(winP));
        st.winLine.setAttribute('stroke-width', f2(w)); st.winOut.setAttribute('stroke-width', f2(w + 9));
      }
      if (st.mode === 'drown') updDrown(st, t, X, Y, wv);

      /* ---- moyenne ---- */
      if (st.mean) {
        const mp = st.tMean == null ? 1 : E.io3(prog(t, st.tMean, st.tMean + 1.3));
        const kEnd = R * mp, xe = X(kEnd), ye = Y(-0.027 * kEnd);
        for (const l of [st.meanOut, st.meanIn]) { l.setAttribute('x1', PX0); l.setAttribute('y1', f2(y0)); l.setAttribute('x2', f2(xe)); l.setAttribute('y2', f2(ye)); }
        st.meanDot.setAttribute('cx', f2(xe)); st.meanDot.setAttribute('cy', f2(ye));
        st.mean.setAttribute('visibility', mp > 0 ? 'visible' : 'hidden');
        const pp = st.tMean == null ? 1 : prog(t, st.tMean + 0.9, st.tMean + 1.3);
        wrapPill(st.meanPill, Math.min(X(R) - 250, 1560 - 20), Y(-0.027 * R) + 82, -2, pp);
      }

      /* ---- stat (pop à chaque repère) ---- */
      let cur = null; for (const s of st.stats) if (t >= s.t) cur = s;
      if (cur && st.mode === 'walks') {
        st.statT.textContent = cur.text;
        wrapPill(st.stat, 1420, 150, 2, prog(t, cur.t, cur.t + 0.3));
      } else wrapPill(st.stat, 1420, 150, 2, 0);

      /* ---- légende : devant / derrière ---- */
      const legOn = st.mode === 'walks' && dotsOn && !trans && !st.mean;
      st.legA.setAttribute('visibility', legOn && nAA ? 'visible' : 'hidden');
      st.legB.setAttribute('visibility', legOn && nBB ? 'visible' : 'hidden');
      if (legOn) {
        let ya = nAA ? yA / nAA : 0, yb = nBB ? yB / nBB : 0;
        if (nAA && nBB && yb - ya < 110) { const m = (ya + yb) / 2; ya = m - 55; yb = m + 55; }
        st.legA.textContent = `${nAA} DEVANT`; st.legB.textContent = `${nBB} DERRIÈRE`;
        st.legA.setAttribute('y', f2(ya + 12)); st.legB.setAttribute('y', f2(yb + 12));
      }
    }
  });

  /* ============================================================ drown ============ */
  function initDrown(st, root, shot, p) {
    const N = 420, r = ZV.rng(7117);
    st.flood = [];
    const lay = g(root, { 'clip-path': `url(#${st.clipId})` });
    st.floodLayer = lay;
    st.floodData = [];
    for (let i = 0; i < N; i++) {
      const a = new Int16Array(101); let v = 0;
      for (let k = 1; k <= 100; k++) { v += r() < P_RED ? 1 : -1; a[k] = v; }
      st.floodData.push(a);
      st.flood.push({ n: sv('path', { d: '', fill: 'none', stroke: C.red, 'stroke-width': 3.4, 'stroke-linejoin': 'round', pathLength: 1, opacity: 0.9, visibility: 'hidden' }, lay), ts: 0 });
    }
    st.fMin = 0; st.fMax = 0;
    for (const a of st.floodData) for (let k = 0; k <= 100; k++) { if (a[k] < st.fMin) st.fMin = a[k]; if (a[k] > st.fMax) st.fMax = a[k]; }
    st.fMax = Math.max(st.fMax, st.cMax[100]); st.fMin = Math.min(st.fMin, st.cMin[100]);
  }
  function updDrown(st, t, X, Y, wv) {
    // ligne lime : tracée dès « winner », épaisse, bordée d'ink
    const tw = st.tWin == null ? 0 : st.tWin;
    const q = E.io2(prog(t, tw, tw + 1.5));
    let d = '';
    const nn = 100 * q;
    for (let j = 0; j <= 100; j++) { if (j > nn) { d += `L${Math.round(X(nn))} ${Math.round(Y(wv(nn)))}`; break; } d += (j ? 'L' : 'M') + Math.round(X(j)) + ' ' + Math.round(Y(wv(j))); }
    st.winLine.setAttribute('d', d); st.winOut.setAttribute('d', d);
    const on = t >= tw;
    st.winLine.setAttribute('visibility', on ? 'visible' : 'hidden'); st.winOut.setAttribute('visibility', on ? 'visible' : 'hidden');
    st.winLine.setAttribute('stroke-width', 11); st.winOut.setAttribute('stroke-width', 21);
    const dim = lerp(1, 0.22, prog(t, (st.tFlood == null ? 1e9 : st.tFlood) + 0.9, (st.tFlood == null ? 1e9 : st.tFlood) + 1.7));
    st.winLine.setAttribute('opacity', f2(dim)); st.winOut.setAttribute('opacity', f2(dim));
    // la marée rouge
    const tf = st.tFlood == null ? 1e9 : st.tFlood;
    const N = st.flood.length;
    for (let i = 0; i < N; i++) {
      const f = st.flood[i], a = st.floodData[i];
      const ts = tf + Math.pow(i / N, 0.85) * 1.15, p = prog(t, ts, ts + 0.5);
      if (p <= 0) { f.n.setAttribute('visibility', 'hidden'); continue; }
      if (!f.built) { // géométrie figée (dépend seulement des échelles qui ne changent pas en mode drown)
        let dd = ''; for (let j = 0; j <= 100; j++) dd += (j ? 'L' : 'M') + Math.round(X(j)) + ' ' + Math.round(Y(a[j]));
        f.n.setAttribute('d', dd); f.built = true;
      }
      f.n.setAttribute('visibility', 'visible');
      f.n.setAttribute('stroke-dasharray', p >= 1 ? 'none' : `${f2(E.out2(p))} 2`);
    }
  }

  /* ============================================================ converge ============ */
  function initConverge(st, root, shot, p, cue) {
    const N = 2000, r = ZV.rng(SEED_COIN);
    st.N = N; st.share = new Float64Array(N + 1);
    let h = 0; for (let n = 1; n <= N; n++) { h += r() < 0.5 ? 1 : 0; st.share[n] = h / n; }
    st.X = (n) => PX0 + (PX1 - PX0) * Math.log(n) / Math.log(N);
    st.Y = (q) => PY1 - q * (PY1 - PY0);
    // axes
    for (const q of [0, 0.5, 1]) {
      sv('line', { x1: PX0, x2: PX1, y1: st.Y(q), y2: st.Y(q), stroke: C.paper, 'stroke-width': q === 0.5 ? 0 : 3, 'stroke-dasharray': '14 14', opacity: 0.5 }, root);
      text(root, `${q * 100} %`, PX0 - 22, st.Y(q) + 11, 30, C.paper, { mono: true, anchor: 'end' }).setAttribute('opacity', 0.75);
    }
    st.half = sv('line', { x1: PX0, x2: PX1, y1: st.Y(0.5), y2: st.Y(0.5), stroke: C.lime, 'stroke-width': 7, 'stroke-dasharray': '26 16', 'stroke-linecap': 'round' }, root);
    for (const n of [1, 10, 100, 1000]) {
      sv('line', { x1: st.X(n), x2: st.X(n), y1: PY1, y2: PY1 + 14, stroke: C.paper, 'stroke-width': 4, opacity: 0.75 }, root);
      text(root, fr(n), st.X(n), PY1 + 48, 28, C.paper, { mono: true, anchor: 'middle' }).setAttribute('opacity', 0.75);
    }
    text(root, 'LANCERS', PX0 - 40, PY1 + 48, 28, C.paper, { mono: true, anchor: 'end' }).setAttribute('opacity', 0.75);
    st.title = text(root, p.label || 'PART DE PILES', PX0, 168, 88, C.paper);
    st.read = text(root, '', PX0, 214, 34, C.lime, { mono: true });
    const lay = g(root);
    st.cOut = sv('path', { d: '', fill: 'none', stroke: C.ink, 'stroke-width': 17, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, lay);
    st.cLine = sv('path', { d: '', fill: 'none', stroke: C.white, 'stroke-width': 8, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, lay);
    st.cDot = circle(lay, 0, 0, 15, C.white, C.ink, 6);
    const sp = pill(root, 300, 120, C.lime, p.stat || '50 %', 74, C.ink);
    st.stat = sp.grp;
    st.tDraw = cue('draw') == null ? 0.5 : cue('draw');
    st.tSettle = cue('settle') == null ? st.tDraw + 2 : cue('settle');
    return st;
  }
  function updConverge(st, t) {
    const u = E.io2(prog(t, st.tDraw, st.tDraw + Math.max(2.4, st.tSettle - st.tDraw + 1.7)));
    const nv = Math.exp(Math.log(st.N) * u);
    const n = Math.max(1, nv);
    let d = '';
    const M = 420;
    let last = 0;
    for (let j = 0; j <= M; j++) {
      const k = Math.pow(st.N, j / M);
      if (k > n) break;
      const kk = Math.max(1, Math.min(st.N, Math.round(k)));
      if (kk === last) continue;
      last = kk;
      d += (d ? 'L' : 'M') + Math.round(st.X(kk)) + ' ' + Math.round(st.Y(st.share[kk]));
    }
    const nk = Math.max(1, Math.min(st.N, Math.floor(n)));
    d += (d ? 'L' : 'M') + f2(st.X(n)) + ' ' + f2(st.Y(st.share[nk]));
    st.cOut.setAttribute('d', d); st.cLine.setAttribute('d', d);
    st.cDot.setAttribute('cx', f2(st.X(n))); st.cDot.setAttribute('cy', f2(st.Y(st.share[nk])));
    st.cLine.setAttribute('stroke', t >= st.tSettle + 0.2 ? C.lime : C.white);
    st.cDot.setAttribute('fill', t >= st.tSettle + 0.2 ? C.lime : C.white);
    st.cOut.parentNode.setAttribute('visibility', t >= st.tDraw ? 'visible' : 'hidden');
    st.read.textContent = t >= st.tDraw ? `${Math.round(st.share[nk] * 100)} % DE PILES SUR ${fr(nk)} LANCER${nk > 1 ? 'S' : ''}` : '';
    st.half.setAttribute('opacity', f2(0.35 + 0.65 * prog(t, st.tSettle - 0.2, st.tSettle + 0.2)));
    const sp = prog(t, st.tSettle + 0.5, st.tSettle + 0.85);
    wrapPill(st.stat, st.X(st.N) - 190, st.Y(0.5) - 96, -3, sp);
  }
})();
