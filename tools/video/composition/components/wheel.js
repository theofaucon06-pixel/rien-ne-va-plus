// Composant « wheel » : roulette européenne (ou américaine) vue de dessus, 1920×1080, fonction pure du temps.
// Roue en aplats (cylindre paper, 37 cases dans l'ordre réel, croisillon), bille qui orbite / claque / hésite / tombe,
// caméra (zoom + recentrage sur une case), voile ink 62 % sur les cases non mises en avant, allumage lime du zéro,
// morph vers la roulette américaine (00). Aucun dégradé, flou ni lueur.
(() => {
  'use strict';
  const { C, E, clamp, prog, lerp, f2, sv, g, rect, circle, text, put, shakeAt, ORDER, RED } = ZV;
  const D2R = Math.PI / 180;
  const AMER = [0, 28, 9, 26, 30, 11, 7, 20, 32, 17, 5, 22, 34, 15, 3, 24, 36, 13, 1, '00', 27, 10, 25, 29, 12, 8, 19, 31, 18, 6, 21, 33, 16, 4, 23, 35, 14, 2];
  const R_RIM = 372, R_TRK = 342, R_PO = 290, R_PI = 196, R_BT = 316, R_REST = 222, R_NUM = 266, R_CAM = 262;
  const W_SLOW = 10, W_FAST = 110, W_ON = 200, RAMP = 0.6;
  const MORPH = 10 / 30;
  const HOP = 0.26;                                   // une sautille entre deux frettes
  const wnorm = (a) => ((a % 360) + 360) % 360;
  const wdiff = (a) => wnorm(a + 180) - 180;
  const pol = (a, r) => [r * Math.sin(a * D2R), -r * Math.cos(a * D2R)];
  const wedge = (a0, a1, r1, r2) => {
    const [x1, y1] = pol(a0, r2), [x2, y2] = pol(a1, r2), [x3, y3] = pol(a1, r1), [x4, y4] = pol(a0, r1);
    return `M${f2(x1)} ${f2(y1)}A${r2} ${r2} 0 0 1 ${f2(x2)} ${f2(y2)}L${f2(x3)} ${f2(y3)}A${r1} ${r1} 0 0 0 ${f2(x4)} ${f2(y4)}Z`;
  };
  const idxEU = {}; ORDER.forEach((n, i) => { idxEU[String(n)] = i; });
  const idxAM = {}; AMER.forEach((n, i) => { idxAM[String(n)] = i; });
  const isZero = (l) => l === '0' || l === '00';
  const kind = (l) => (isZero(l) ? 'zero' : RED.has(+l) ? 'red' : 'black');

  ZV.define('wheel', {
    init(root, shot) {
      const p = shot.props || {};
      const dur = shot.dur || 4;
      const cx = p.x == null ? 960 : p.x, cy = p.y == null ? 500 : p.y;
      const spin = ['slow', 'fast', 'decel', 'stop'].includes(p.spin) ? p.spin : 'slow';
      const ballMode = ['none', 'orbit', 'rest'].includes(p.ball) ? p.ball : 'none';
      const american0 = !!p.american;
      const cue = (n) => ZV.cue(shot, n);
      const st = { cx, cy, spin, ballMode, dur, american0, dKey: -1, shot };

      /* ---- fond + caméra ---- */
      rect(root, 0, 0, 1920, 1080, 0, C.ink);
      st.cam = g(root);
      const wg = g(st.cam, { transform: `translate(${cx} ${cy})` });
      circle(wg, 20, 22, R_RIM, C.pocket);                              // ombre dure
      circle(wg, 0, 0, R_RIM, C.paper, C.ink, 6);                         // cylindre
      for (let i = 0; i < 8; i++) { const [x, y] = pol(i * 45, R_RIM - 15); circle(wg, x, y, 7, C.ink); }
      circle(wg, 0, 0, R_TRK, C.ink, C.ink, 6);                           // piste de la bille
      circle(wg, 0, 0, R_BT, 'none', C.pocket, 46);
      for (let i = 0; i < 8; i++) {                                       // losanges fixes (déflecteurs)
        const a = i * 45 + 22.5, [x, y] = pol(a, R_TRK - 20);
        const dg = g(wg, { transform: `translate(${f2(x)} ${f2(y)}) rotate(${a})` });
        sv('path', { d: 'M0 -17L10 0L0 17L-10 0Z', fill: C.paper, stroke: C.ink, 'stroke-width': 3, 'stroke-linejoin': 'round' }, dg);
      }
      circle(wg, 0, 0, R_PO + 3, C.pocket);
      st.rot = g(wg);                                                     // tout ce qui tourne

      /* ---- cases : 38 nœuds (37 + 00) ---- */
      st.labels = ORDER.map(String).concat(['00']);
      st.nodes = st.labels.map((l) => {
        const pg = g(st.rot);
        const body = sv('path', { d: '', fill: C.pocket, stroke: C.paper, 'stroke-width': 3.5, 'stroke-linejoin': 'round' }, pg);
        const lg = g(pg);
        const k = kind(l);
        body.setAttribute('fill', k === 'red' ? C.red : k === 'zero' ? C.lime : C.pocket);
        const tx = text(lg, l, 0, 8, l === '00' ? 22 : 25, k === 'black' ? C.white : C.ink, { anchor: 'middle', mono: true });
        const veil = sv('path', { d: '', fill: C.ink, opacity: 0 }, pg);
        return { l, k, pg, body, lg, tx, veil, ie: idxEU[l], ia: idxAM[l] };
      });
      st.zero = st.nodes[0]; st.dz = st.nodes[37];
      // croisillon central
      circle(st.rot, 0, 0, R_PI, C.pocket, C.paper, 4);
      circle(st.rot, 0, 0, 140, C.ink, C.paper, 5);
      for (let i = 0; i < 4; i++) {
        const a = i * 45 * D2R;
        sv('line', { x1: -112 * Math.sin(a), y1: 112 * Math.cos(a), x2: 112 * Math.sin(a), y2: -112 * Math.cos(a), stroke: C.paper, 'stroke-width': 16, 'stroke-linecap': 'round' }, st.rot);
      }
      circle(st.rot, 0, 0, 34, C.paper, C.ink, 6);
      // surcouche du zéro : contour lime et anneaux
      st.zOut = sv('path', { d: '', fill: 'none', stroke: C.lime, 'stroke-width': 9, 'stroke-linejoin': 'round', pathLength: 1, visibility: 'hidden' }, st.rot);
      st.rings = [0, 1].map(() => circle(st.rot, 0, -(R_PI + R_PO) / 2, 10, 'none', C.lime, 8));

      /* ---- la bille (par-dessus la roue) ---- */
      st.trail = [0, 1, 2].map(() => circle(wg, 0, 0, 12, C.white));
      st.ball = g(wg);
      circle(st.ball, 5, 6, 14, C.ink);
      circle(st.ball, 0, 0, 14, C.white, C.ink, 4);

      /* ---- pastilles ROUGE / NOIRE (plans de gros plan sur la case) ---- */
      st.pills = [];
      const sr = cue('strike-red'), sb = cue('strike-black');
      if (sr != null || sb != null) {
        const mk = (label, fill, tx, edge, x, y, tStrike, tPop) => {
          const pg = g(root);
          const inner = g(pg);
          rect(inner, -190 + 12, -80 + 12, 380, 160, 30, C.ink);
          rect(inner, -190, -80, 380, 160, 30, fill, edge, 8);
          text(inner, label, 0, 32, 96, tx, { anchor: 'middle' });
          const k1 = ZV.sv('line', { x1: -225, y1: 70, x2: 225, y2: -70, stroke: C.ink, 'stroke-width': 34, 'stroke-linecap': 'round' }, pg);
          const k2 = ZV.sv('line', { x1: -225, y1: 70, x2: 225, y2: -70, stroke: C.red, 'stroke-width': 18, 'stroke-linecap': 'round' }, pg);
          return { pg, inner, k1, k2, x, y, tStrike, tPop };
        };
        const pr = Math.max(0.25, (sr == null ? 1.4 : sr) - 1.25);
        const pb = Math.max(pr + 0.5, (sb == null ? 2.2 : sb) - 1.0);
        st.pills.push(mk('ROUGE', C.red, C.ink, C.ink, 470, 250, sr, pr));
        st.pills.push(mk('NOIRE', C.pocket, C.white, C.paper, 1450, 250, sb, pb));
      }

      /* ---- paramètres de la roue ---- */
      const label0 = (v) => String(v);
      const phiOf = (l, am) => (am ? idxAM[l] * 360 / 38 : idxEU[l] * 360 / 37);
      const focusL = p.focus == null ? null : label0(p.focus);
      const landL = label0(p.land == null ? 17 : p.land);
      st.focusL = focusL;
      const tOn = cue('spin-on'), tZL = cue('zero-light');
      st.tOn = tOn;
      const T = dur * 0.96;
      st.T = T;
      st.D = W_FAST * T / 2.2;
      const phi = (t) => {
        if (spin === 'stop') return 0;
        if (spin === 'fast') return W_FAST * t;
        if (spin === 'decel') return -st.D * Math.pow(1 - Math.min(t, T) / T, 2.2);
        let v = W_SLOW * t;
        if (tOn != null && t > tOn) { const d = W_ON - W_SLOW, x = Math.min(t - tOn, RAMP); v += d * x * x / (2 * RAMP); if (t > tOn + RAMP) v += d * (t - tOn - RAMP); }
        return v;
      };
      st.phi = phi;

      /* ---- bille : scénario ---- */
      const tl = ballMode === 'orbit' ? (cue('launch') == null ? 0 : cue('launch')) : 0;
      const tClack = cue('clack'), tHes = cue('hesitate');
      let tLand = cue('land');
      const landBeat = shot.beats.find((b) => b.do === 'cue' && b.name === 'land' && b.n != null);
      const landLab = landBeat ? label0(landBeat.n) : landL;
      st.tl = tl; st.tClack = tClack; st.tHes = tHes; st.tLand = tLand; st.landLab = landLab;
      const phiK = phiOf(landLab, american0);
      let scen = 'C';
      if (ballMode === 'orbit') scen = tClack != null ? 'B' : tLand != null ? 'A' : 'C';
      st.scen = scen;
      // scénario B : orbite → claque → rebonds → hésite → tombe
      const A_C = 292.5;                                        // angle du losange percuté
      if (scen === 'B') {
        const T1 = Math.max(0.3, tClack - tl);
        const turns = Math.max(1, Math.round(T1 * 0.85));
        const Dball = 360 * turns;
        st.v0 = Dball / (0.775 * T1); st.v1 = 0.55 * st.v0; st.T1 = T1;
        const tH = tHes == null ? tClack + 0.9 : tHes;
        st.tH = tH; st.T2 = Math.max(0.2, tH - tClack);
        st.aNat2 = (q) => A_C - st.T2 * st.v1 * (q - 0.425 * q * q);
        st.hopDur = HOP * 3;
        st.tFall = tH + st.hopDur;
      }
      /* ---- décalage de la roue (θ(t) = phi(t) + off) ---- */
      let off = 0;
      const tRef = spin === 'decel' ? T : (tZL == null ? dur * 0.5 : tZL);
      if (focusL != null) {
        const pf = phiOf(focusL, american0);
        let tgt = 0;
        if (ballMode === 'orbit' && (scen === 'A' || scen === 'B') && landLab !== focusL) tgt = -wdiff(phiK - pf) / 2;
        off = tgt - pf - phi(tRef);
      } else if (scen === 'B') {
        // la bille arrive sur la case voisine A au moment exact de l'hésitation
        const idxK = american0 ? idxAM[landLab] : idxEU[landLab];
        const n = american0 ? 38 : 37;
        const phiA = ((idxK + 1) % n) * 360 / n;
        const aH = st.aNat2(1);
        off = aH - phiA - phi(st.tH);
      } else off = 20;
      st.off = off;
      st.theta = (t) => phi(t) + off;
      st.phiK = phiK; st.phiA = ((((american0 ? idxAM[landLab] : idxEU[landLab]) + 1) % (american0 ? 38 : 37))) * 360 / (american0 ? 38 : 37);

      /* ---- caméra : zoom ---- */
      st.z0 = p.zoom == null ? 1 : p.zoom;
      st.zEv = [];
      for (const b of shot.beats) if (b.do === 'cue' && b.name === 'zoom' && b.zoom != null) st.zEv.push({ t: b.t, z: b.zoom });
      if (tOn != null) st.zEv.push({ t: tOn, z: 1.4 });
      const tDZ = cue('add-double-zero');
      st.tDZ = tDZ;
      if (tDZ != null) st.zEv.push({ t: tDZ, z: 1.18 });
      st.zEv.sort((a, b) => a.t - b.t);

      /* ---- surbrillance : machine à états ---- */
      st.hl = [{ t: -1, m: p.highlight == null ? 'none' : p.highlight }];
      for (const b of shot.beats) if (b.do === 'cue' && (b.name === 'highlight-red' || b.name === 'highlight-black')) st.hl.push({ t: b.t, m: b.name === 'highlight-red' ? 'red' : 'black' });
      st.hl.sort((a, b) => a.t - b.t);

      st.tOut = cue('zero-outline'); st.tZL = tZL;
      st.zeroPaper = p.zero_state === 'paper';
      return st;
    },

    update(st, t, shot) {
      const { cx, cy, dur } = st;
      const theta = st.theta(t);

      /* ---- morph américain ---- */
      let m = st.american0 ? 1 : 0;
      if (st.tDZ != null) m = clamp(ZV.E.io3(prog(t, st.tDZ, st.tDZ + MORPH)) + (st.american0 ? 1 : 0));
      const key = Math.round(m * 1000);
      const s = 360 / (37 + m);
      if (key !== st.dKey) {
        st.dKey = key;
        const d = wedge(-s / 2, s / 2, R_PI, R_PO);
        for (const n of st.nodes) {
          n.body.setAttribute('d', d); n.veil.setAttribute('d', d);
          let ang;
          if (n.l === '00') ang = 180;
          else { const ae = n.ie * 360 / 37, aa = n.ia * 360 / 38; ang = ae + wdiff(aa - ae) * m; }
          n.ang = ang;
          const sc = n.l === '00' ? E.back(clamp(m / 0.55)) : 1;
          n.pg.setAttribute('transform', `rotate(${f2(ang)})`);
          n.pg.setAttribute('visibility', n.l === '00' && m <= 0.001 ? 'hidden' : 'visible');
          n.lg.setAttribute('transform', `translate(0 ${-R_NUM}) scale(${f2(Math.max(sc, 0.001))})`);
        }
        st.zOut.setAttribute('d', d);
      }
      st.rot.setAttribute('transform', `rotate(${f2(theta)})`);

      /* ---- voile ink 62 % ---- */
      let cur = st.hl[0], prev = st.hl[0];
      for (let i = 0; i < st.hl.length; i++) if (st.hl[i].t <= t) { prev = st.hl[Math.max(0, i - 1)]; cur = st.hl[i]; }
      const bl = cur.t < 0 ? 1 : prog(t, cur.t, cur.t + 0.2);
      const lit = (mode, n) => {
        if (mode === 'none' || mode == null) return true;
        if (mode === 'red') return n.k === 'red';
        if (mode === 'black') return n.k === 'black';
        if (mode === 'zero') return n.k === 'zero';
        if (Array.isArray(mode)) return mode.map(String).includes(n.l);
        return true;
      };
      for (const n of st.nodes) {
        const v = lerp(lit(prev.m, n) ? 0 : 0.62, lit(cur.m, n) ? 0 : 0.62, bl);
        n.veil.setAttribute('opacity', f2(v));
      }

      /* ---- le zéro : paper → contour lime → aplat lime + anneaux ---- */
      const zl = st.tZL, zo = st.tOut;
      const zeroLit = !st.zeroPaper || (zl != null && t >= zl);
      st.zero.body.setAttribute('fill', zeroLit ? C.lime : C.paper);
      st.dz.body.setAttribute('fill', C.lime);
      const lp = zl == null ? 1 : E.back(prog(t, zl, zl + 0.32));
      const zs = st.zeroPaper && zl != null ? (t < zl ? 1 : 0.35 + 0.65 * lp) : 1;
      st.zero.lg.setAttribute('transform', `translate(0 ${-R_NUM}) scale(${f2(Math.max(zs, 0.01))})`);
      const zAng = st.zero.ang || 0;
      const op = zo == null ? 0 : prog(t, zo, zo + 0.4);
      st.zOut.setAttribute('visibility', op > 0 ? 'visible' : 'hidden');
      st.zOut.setAttribute('stroke-dasharray', `${f2(op)} 2`);
      st.zOut.setAttribute('transform', `rotate(${f2(zAng)})`);
      for (let i = 0; i < 2; i++) {
        const q = zl == null ? 0 : prog(t, zl + i * 0.2, zl + i * 0.2 + 0.7);
        const r = st.rings[i];
        r.setAttribute('visibility', q > 0 && q < 1 ? 'visible' : 'hidden');
        r.setAttribute('r', f2(lerp(24, 250, E.out3(q))));
        r.setAttribute('stroke-width', f2(lerp(10, 2, q)));
        r.setAttribute('opacity', f2(1 - q * q));
        const [rx, ry] = pol(zAng, (R_PI + R_PO) / 2);
        r.setAttribute('cx', f2(rx)); r.setAttribute('cy', f2(ry));
      }

      /* ---- la bille ---- */
      const ball = ballAt(st, t, theta);
      { const [bx, by] = pol(ball.a, ball.r); put(st.ball, bx, by, 0, ball.s, ball.s, ball.o); }
      for (let i = 0; i < 3; i++) {
        const tt = t - 0.03 * (i + 1);
        const b2 = tt > st.tl && st.ballMode === 'orbit' && ball.fast ? ballAt(st, tt, st.theta(tt)) : null;
        const n = st.trail[i];
        if (!b2 || !b2.o) { n.setAttribute('visibility', 'hidden'); continue; }
        const [x, y] = pol(b2.a, b2.r);
        n.setAttribute('visibility', 'visible'); n.setAttribute('cx', f2(x)); n.setAttribute('cy', f2(y));
        n.setAttribute('r', f2(13 * b2.s * (0.78 - i * 0.18))); n.setAttribute('opacity', f2(0.55 - i * 0.16));
      }

      /* ---- caméra ---- */
      let z = st.z0;
      for (const e of st.zEv) z = lerp(z, e.z, E.io3(prog(t, e.t, e.t + 0.55)));
      let wf = st.focusL == null ? 0 : clamp((z - 1.1) / 0.5);
      if (st.tOn != null) wf *= 1 - E.io3(prog(t, st.tOn, st.tOn + 0.55));
      if (st.tDZ != null) wf *= 1 - E.io3(prog(t, st.tDZ, st.tDZ + 0.55));
      const Py = lerp(cy, cy - R_CAM, wf);
      const Sx = lerp(cx, 960, wf), Sy = lerp(cy, 470, wf);
      let [shx, shy] = st.tClack != null ? shakeAt(t, st.tClack, 10, 0.4) : [0, 0];
      const camT = `translate(${f2(Sx + shx)} ${f2(Sy + shy)}) scale(${f2(z)}) translate(${f2(-cx)} ${f2(-Py)})`;
      st.cam.setAttribute('transform', camT);

      /* ---- pastilles ROUGE / NOIRE ---- */
      for (const pl of st.pills) {
        const pp = prog(t, pl.tPop, pl.tPop + 0.4);
        const hop = pp <= 0 ? 0 : E.bounce(clamp(pp));
        const sc = pp <= 0 ? 0 : E.back(clamp(pp * 1.6));
        put(pl.pg, pl.x, pl.y - 110 * (1 - hop), -4 * (pl.x > 960 ? -1 : 1), sc, sc, pp > 0 ? 1 : 0);
        const sk = pl.tStrike == null ? 0 : prog(t, pl.tStrike, pl.tStrike + 0.2);
        for (const k of [pl.k1, pl.k2]) {
          k.setAttribute('visibility', sk > 0 ? 'visible' : 'hidden');
          k.setAttribute('x2', f2(lerp(-225, 225, E.out3(sk)))); k.setAttribute('y2', f2(lerp(70, -70, E.out3(sk))));
        }
      }
    }
  });

  // pose de la bille à l'instant t : { a: angle monde (deg), r, s: échelle, o: opacité, fast }
  function ballAt(st, t, theta) {
    const none = { a: 0, r: R_BT, s: 1, o: 0, fast: false };
    if (st.ballMode === 'none') return none;
    if (st.ballMode === 'rest') return { a: st.phiK + theta, r: R_REST, s: 1, o: 1, fast: false };
    const tl = st.tl;
    if (t < tl) return none;
    const pop = E.out3(prog(t, tl, tl + 0.2));
    const s0 = 0.4 + 0.6 * pop;
    const o = clamp((t - tl) / 0.05);
    if (st.scen === 'C') return { a: 300 - 260 * (t - tl), r: R_BT, s: s0, o, fast: true };
    if (st.scen === 'A') {
      const tLand = st.tLand;
      const landA = st.phiK + st.theta(tLand);
      if (t < tLand) {
        const p = (t - tl) / Math.max(0.2, tLand - tl);
        const D = (tLand - tl) > 1.2 ? 720 : 360;
        const a = landA + D * (1 - p) * (1 - p);
        const r = p < 0.72 ? R_BT : R_BT - (R_BT - R_REST) * E.bounce((p - 0.72) / 0.28);
        return { a, r, s: s0, o, fast: p < 0.72 };
      }
      return { a: st.phiK + theta, r: R_REST, s: 1, o: 1, fast: false };
    }
    // scénario B
    const tc = st.tClack;
    if (t < tc) {
      const p = clamp((t - tl) / st.T1);
      const dist = st.T1 * ((st.v0 * (1 - p)) + (st.v1 - st.v0) * (1 - p * p) / 2);
      return { a: 292.5 + dist, r: R_BT, s: s0, o, fast: true };
    }
    if (t < st.tH) {
      const q = clamp((t - tc) / st.T2);
      const a = st.aNat2(q);
      const rr = E.bounce(clamp((t - tc) / 0.4));
      let r = R_BT - (R_BT - R_REST) * rr, sc = 1;
      if (t - tc >= 0.4) { const hq = (t - tc - 0.4) / (st.T2 - 0.4 + 1e-6); const hop = (1 - hq) * Math.abs(Math.sin(hq * Math.PI * 4)); r = R_REST + 14 * hop; sc = 1 + 0.35 * hop; }
      return { a, r, s: sc, o: 1, fast: q < 0.35 };
    }
    if (t < st.tFall) {
      const u = (t - st.tH) / HOP, i = Math.min(2, Math.floor(u)), fr = u - i;
      const seq = [st.phiA, st.phiK, st.phiA, st.phiK];
      const sm = E.io2(fr);
      const psi = seq[i] + wdiff(seq[i + 1] - seq[i]) * sm;
      const ap = Math.sin(fr * Math.PI);
      return { a: psi + theta, r: R_REST + 18 * ap, s: 1 + 0.4 * ap, o: 1, fast: false };
    }
    return { a: st.phiK + theta, r: R_REST, s: 1, o: 1, fast: false };
  }
})();
