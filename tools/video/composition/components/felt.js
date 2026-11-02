// Composant « felt » : tapis de roulette vu de dessus (1920×1080), jetons, râteau, pluie de jetons, compteur.
// Fonction pure du temps : tout est recalculé à partir de `t` et des repères (cues) du plan. Aplats seulement.
(() => {
  'use strict';
  const { C, E, clamp, prog, lerp, f2, sv, g, rect, circle, text, put, RED } = ZV;

  /* ---- géométrie du tapis (repère monde = repère écran à zoom 1) ---- */
  const X0 = 141, ZW = 150, GX = X0 + ZW, COLW = 124, ROWH = 142, Y0 = 208;
  const DOZ_Y = Y0 + 3 * ROWH, DOZ_H = 90, OUT_Y = DOZ_Y + DOZ_H, OUT_H = 100, OUT_W = 248;
  const TABLE_R = GX + 12 * COLW, TABLE_B = OUT_Y + OUT_H;
  const CHIP_R = 34;
  const cellXY = (n) => {
    if (n === 0) return [X0 + ZW / 2, Y0 + 1.5 * ROWH];
    const c = Math.floor((n - 1) / 3), r = 2 - ((n - 1) % 3);
    return [GX + c * COLW + COLW / 2, Y0 + r * ROWH + ROWH / 2];
  };
  const BOXES = ['1–18', 'PAIR', 'ROUGE', 'NOIR', 'IMPAIR', '19–36'];
  const boxXY = (name) => {
    const i = Math.max(0, BOXES.indexOf(String(name).toUpperCase()));
    return [GX + OUT_W * (i + 0.5), OUT_Y + OUT_H / 2];
  };
  const locate = (f) => {
    if (f == null) return null;
    if (typeof f === 'number') return cellXY(f);
    const s = String(f).toUpperCase();
    if (BOXES.includes(s)) return boxXY(s);
    const n = parseInt(s, 10);
    return Number.isFinite(n) && n >= 0 && n <= 36 ? cellXY(n) : null;
  };
  const frac = (x) => x - Math.floor(x);
  const hash = (a, b) => frac(Math.sin(a * 127.1 + b * 311.7 + 17.3) * 43758.5453);

  function makeChip(parent, label, fs) {
    const c = g(parent);
    circle(c, 8, 9, CHIP_R, C.ink);
    circle(c, 0, 0, CHIP_R, C.white, C.ink, 6);
    const nt = circle(c, 0, 0, 26.5, 'none', C.lime, 8);
    nt.setAttribute('stroke-dasharray', '11.6 8.9');
    text(c, label, 0, fs * 0.36, fs, C.ink, { anchor: 'middle', mono: true });
    return c;
  }

  ZV.define('felt', {
    init(root, shot) {
      const p = shot.props || {};
      const cue = (n) => ZV.cue(shot, n);
      const st = { p, dur: shot.dur };
      rect(root, 0, 0, 1920, 1080, 0, C.ink);

      /* ---- la caméra regroupe le tapis, les jetons ---- */
      st.cam = g(root);
      st.table = g(st.cam);
      // cases
      const grid = [];
      rect(st.table, X0, Y0, TABLE_R - X0, TABLE_B - Y0, 0, 'none', C.paper, 8);
      rect(st.table, X0, Y0, ZW, 3 * ROWH, 0, C.lime, C.paper, 4);
      text(st.table, '0', X0 + ZW / 2, Y0 + 1.5 * ROWH + 38, 120, C.ink, { anchor: 'middle' });
      st.cells = {};
      for (let n = 1; n <= 36; n++) {
        const [x, y] = cellXY(n);
        const isRed = RED.has(n);
        circle(st.table, x, y, 45, isRed ? C.red : C.pocket, C.paper, 4);
        text(st.table, String(n), x, y + 18, 54, isRed ? C.ink : C.paper, { anchor: 'middle' });
      }
      // traits du quadrillage (un seul tracé)
      let d = '';
      for (let r = 1; r < 3; r++) d += `M${GX} ${Y0 + r * ROWH}H${TABLE_R}`;
      for (let c = 0; c <= 12; c++) d += `M${GX + c * COLW} ${Y0}V${DOZ_Y}`;
      sv('path', { d, stroke: C.paper, 'stroke-width': 4, fill: 'none' }, st.table);
      // douzaines et chances simples
      ['1–12', '13–24', '25–36'].forEach((lab, i) => {
        rect(st.table, GX + i * 4 * COLW, DOZ_Y, 4 * COLW, DOZ_H, 0, 'none', C.paper, 4);
        text(st.table, lab, GX + (i * 4 + 2) * COLW, DOZ_Y + 60, 44, C.paper, { anchor: 'middle' });
      });
      BOXES.forEach((lab, i) => {
        const x = GX + i * OUT_W;
        const fill = lab === 'ROUGE' ? C.red : lab === 'NOIR' ? C.pocket : 'none';
        rect(st.table, x, OUT_Y, OUT_W, OUT_H, 0, fill, C.paper, 4);
        text(st.table, lab, x + OUT_W / 2, OUT_Y + 63, 46, lab === 'ROUGE' ? C.ink : C.paper, { anchor: 'middle' });
      });

      /* ---- surbrillance de la case gagnante ---- */
      st.win = rect(st.table, 0, 0, COLW - 8, ROWH - 8, 6, 'none', C.lime, 10, { visibility: 'hidden' });
      const wb = shot.beats.find((b) => b.do === 'cue' && b.name === 'winner');
      st.tWin = wb ? wb.t : null;
      st.winN = wb && wb.n != null ? wb.n : p.winner;
      if (st.tWin == null && p.winner != null && cue('winner') == null) st.winN = p.winner;
      if (st.winN != null) {
        const [wx, wy] = cellXY(+st.winN);
        const zero = +st.winN === 0;
        st.win.setAttribute('x', wx - (zero ? ZW : COLW) / 2 + 4); st.win.setAttribute('y', wy - (zero ? 3 * ROWH : ROWH) / 2 + 4);
        st.win.setAttribute('width', (zero ? ZW : COLW) - 8); st.win.setAttribute('height', (zero ? 3 * ROWH : ROWH) - 8);
      }

      /* ---- jetons ---- */
      st.chipLayer = g(st.cam);
      st.rings = [];
      st.items = [];
      const dropCues = ZV.cues(shot, 'chip-drop');
      (Array.isArray(p.chips) ? p.chips : []).forEach((c, i) => {
        const dc = dropCues.find((b) => b.n === c.n) || dropCues[i] || null;
        const [x, y] = cellXY(+c.n || 0);
        const n = makeChip(st.chipLayer, String(c.label == null ? '1 €' : c.label), 22);
        const ring = circle(st.chipLayer, x, y, 40, 'none', C.paper, 5);
        st.rings.push({ ring, x, y, t: dc ? dc.t : null });
        st.items.push({ kind: 'base', node: n, x, y, n: +c.n, t0: dc ? dc.t : 0, dropped: !!dc });
      });
      if (p.fill_all) {
        const tf = cue('fill-all');
        const tEnd = cue('counter') != null && tf != null && cue('counter') > tf + 0.8 ? cue('counter') - 0.15 : (tf == null ? 0 : tf + 2.0);
        const W = Math.max(0.6, tEnd - (tf == null ? 0 : tf));
        for (let k = 0; k <= 36; k++) {
          const n = k === 0 ? 0 : k;
          const [x, y] = cellXY(n);
          const t0 = tf == null ? -1 : tf + W * (1 - Math.pow(1 - k / 36, 1.8));
          st.items.push({ kind: 'base', node: makeChip(st.chipLayer, '1 €', 22), x, y, n, t0, dropped: tf != null, wave: k });
        }
      }
      // payout : N jetons qui glissent depuis le bord droit
      const pb = shot.beats.find((b) => b.do === 'cue' && b.name === 'payout');
      if (pb) {
        const N = Math.max(1, Math.min(80, Math.round(pb.count != null ? pb.count : (+p.payout || 35))));
        const tgt = pb.target != null ? pb.target : (p.bet_box || (st.winN != null ? st.winN : 17));
        let [tx, ty] = locate(tgt) || cellXY(17);
        const isBox = typeof tgt === 'string' && Number.isNaN(parseInt(tgt, 10));
        if (!isBox) tx += 150;
        const step = Math.min(0.025, 0.8 / N);
        // piles en pyramide, vues de trois quarts : chaque jeton monte de 11 px sur sa pile
        const ns = Math.max(3, Math.round(Math.sqrt(N / 2.2))), cc = (ns - 1) / 2;
        const wts = []; for (let i = 0; i < ns; i++) wts.push(1 - 0.62 * Math.abs(i - cc) / (cc + 0.5));
        const sw = wts.reduce((a, b) => a + b, 0);
        const hs = wts.map((w) => Math.floor(N * w / sw));
        let left = N - hs.reduce((a, b) => a + b, 0);
        for (let i = 0; left > 0; i = (i + 1) % ns) { const k = Math.round(cc + (i % 2 ? 1 : -1) * Math.floor((i + 1) / 2)); const kk = Math.max(0, Math.min(ns - 1, k)); hs[kk]++; left--; }
        const SP = isBox ? 56 : 58;
        let j = 0;
        for (let lev = 0; j < N && lev < 40; lev++) {
          for (let i = 0; i < ns && j < N; i++) {
            if (hs[i] <= lev) continue;
            const px = tx + (i - cc) * SP + (hash(j, 9) - 0.5) * 3, py = ty + 36 - lev * 14 + (hash(j, 5) - 0.5) * 3;
            st.items.push({ kind: 'pay', node: makeChip(st.chipLayer, '1 €', 22), x: px, y: py, t0: pb.t + j * step, jit: hash(j, 3) });
            j++;
          }
        }
      }
      // pluie de jetons
      const tRain = cue('rain'), tMore = cue('rain-more');
      st.rain = null;
      if (tRain != null || p.rain_tag) {
        st.tRain = tRain == null ? 0 : tRain; st.tMore = tMore;
        st.veil = rect(root, 0, 0, 1920, 1080, 0, C.ink, null, 0, { opacity: 0 });
        st.rainLayer = g(root);
        st.rain = [];
        const rr = ZV.rng(2701);
        const tag = p.rain_tag == null ? '−2,7 %' : p.rain_tag;
        for (let j = 0; j < 96; j++) {
          st.rain.push({ node: makeChip(st.rainLayer, tag, 14.5), j, speed: 760 + rr() * 520, s: 1.3 + rr() * 0.7, r0: rr() * 360, ts: j < 40 ? st.tRain + j * 0.05 : (tMore == null ? 1e9 : tMore + (j - 40) * 0.02) });
        }
      }

      /* ---- râteau (en repère écran) ---- */
      st.tRake = cue('rake');
      st.rakeMode = p.rake === 'all' || p.rake === 'losers' ? p.rake : 'none';
      st.rake = null;
      if (st.tRake != null && st.rakeMode !== 'none') {
        const rk = g(root, { visibility: 'hidden' });
        rect(rk, 20, 505, 1100, 70, 14, C.ink, C.paper, 6);                 // manche
        rect(rk, 12, 490, 40, 100, 10, C.paper, C.ink, 6);                  // virole
        rect(rk, 0, 0, 58, 1080, 0, C.paper, C.ink, 7);                     // tête
        let td = '';
        for (let y = 20; y < 1080; y += 52) td += `M0 ${y}L-36 ${y + 18}L0 ${y + 36}Z`;
        sv('path', { d: td, fill: C.paper, stroke: C.ink, 'stroke-width': 5, 'stroke-linejoin': 'round' }, rk);
        for (let y = 60; y < 1080; y += 160) circle(rk, 29, y, 7, C.ink);
        st.rake = rk;
      }

      /* ---- compteur (haut à droite) ---- */
      st.counter = null;
      if (p.counter) {
        const c = g(root);
        rect(c, 12, 12, 440, 140, 22, C.lime);
        rect(c, 0, 0, 440, 140, 22, C.ink, C.paper, 7);
        const lab = text(c, p.counter.label || '', 30, 46, 28, C.paper, { mono: true });
        const val = text(c, '0', 30, 120, 84, C.lime, { mono: true });
        st.counter = { c, lab, val, t0: cue('counter') == null ? 0.3 : cue('counter') };
      }
      st.camP = p.camera || {};
      st.focus = locate(st.camP.focus);
      st.zoom = st.camP.zoom == null ? 1 : st.camP.zoom;
      st.tPush = cue('camera-push');
      st.opening = st.tPush != null && st.tPush > 1.6;     // plan d'ouverture : noir 1 s, puis le tapis
      return st;
    },

    update(st, t, shot) {
      const p = st.p;
      /* ---- caméra ---- */
      let z = st.zoom;
      let appear = 0;
      if (st.opening) {
        appear = 1.0;
        const zpre = z * lerp(0.7, 0.78, prog(t, appear, st.tPush));
        z = lerp(zpre, st.zoom, E.io3(prog(t, st.tPush, st.tPush + 0.9)));
        z *= 1 + 0.07 * (1 - E.out3(prog(t, appear, appear + 0.17)));
      }
      const P = st.focus || [(X0 + TABLE_R) / 2, (Y0 + TABLE_B) / 2];
      const isBox = typeof st.camP.focus === 'string' && Number.isNaN(parseInt(st.camP.focus, 10));
      const S0 = isBox ? [960, 690] : [960, 450];
      const w = clamp((z - 1) / 0.6);
      const Sx = P[0] + (S0[0] - P[0]) * w, Sy = P[1] + (S0[1] - P[1]) * w;
      st.cam.setAttribute('transform', `translate(${f2(Sx)} ${f2(Sy)}) scale(${f2(z)}) translate(${f2(-P[0])} ${f2(-P[1])})`);
      st.table.setAttribute('visibility', t >= appear ? 'visible' : 'hidden');
      st.chipLayer.setAttribute('visibility', t >= appear ? 'visible' : 'hidden');

      /* ---- râteau : position écran → monde ---- */
      let rakeX = null, rakeScr = null;
      if (st.rake) {
        const dr = Math.min(0.4, Math.max(0.15, st.dur - st.tRake - 0.03));
        const rp = prog(t, st.tRake, st.tRake + dr);
        if (rp > 0) {
          rakeScr = lerp(2360, -330, E.io2(rp));
          rakeX = P[0] + (rakeScr - Sx) / z;
        }
        st.rake.setAttribute('visibility', rp > 0 && rp < 1 ? 'visible' : 'hidden');
        st.rake.setAttribute('transform', `translate(${f2(rakeScr == null ? 2400 : rakeScr)} 0)`);
      }
      const winN = st.winN == null ? null : +st.winN;

      /* ---- case gagnante : clignote 2 fois puis reste allumée ---- */
      let wOn = false;
      if (st.winN != null && st.tWin != null) {
        const u = (t - st.tWin) / 0.1;
        wOn = u >= 0 && (u < 1 || (u >= 2 && u < 3) || u >= 4);
      } else if (st.winN != null) wOn = true;
      st.win.setAttribute('visibility', wOn ? 'visible' : 'hidden');

      /* ---- jetons posés / glissants ---- */
      for (const it of st.items) {
        let x = it.x, y = it.y, s = 1, o = 1, rot = 0;
        if (it.kind === 'base') {
          const age = t - it.t0;
          if (!it.dropped) { o = 1; s = 1; }
          else if (age < 0) o = 0;
          else {
            const pp = prog(age, 0, 0.167);
            s = lerp(1.4, 1, E.in2(pp));
            if (age > 0.167) s = 1 + 0.04 * Math.sin(Math.PI * clamp((age - 0.167) / 0.14)) * 1;
            o = clamp(age / 0.04);
          }
        } else {
          const age = t - it.t0;
          if (age < 0) o = 0;
          else {
            const pp = E.out3(prog(age, 0, 0.32));
            const fromX = P[0] + (1920 + 120 - Sx) / z;
            x = lerp(fromX, it.x, pp); y = lerp(it.y - 40 - it.jit * 60, it.y, pp);
            rot = (1 - pp) * 160;
            s = 1 + 0.18 * (1 - pp);
          }
        }
        // balayé par le râteau
        if (rakeX != null && o > 0 && (st.rakeMode === 'all' || it.n !== winN || it.kind === 'pay')) {
          const lim = rakeX - (64 + 26 * hash(it.x, it.y)) / z;
          if (x > lim - 0) x = Math.min(x, lim);
        }
        put(it.node, x, y, rot, s, s, o);
      }
      for (const r of st.rings) {
        const age = r.t == null ? -1 : t - r.t - 0.14;
        const q = prog(age, 0, 0.3);
        r.ring.setAttribute('visibility', age > 0 && q < 1 && rakeX == null ? 'visible' : 'hidden');
        r.ring.setAttribute('r', f2(lerp(38, 92, E.out3(q)))); r.ring.setAttribute('opacity', f2(1 - q));
        r.ring.setAttribute('stroke-width', f2(lerp(7, 2, q)));
      }

      /* ---- pluie de jetons ---- */
      if (st.rain) {
        const k = prog(t, st.tRain, st.tRain + 0.35);
        st.veil.setAttribute('opacity', f2(0.58 * k));
        const Hh = 1080 + 220;
        for (const c of st.rain) {
          const age = t - c.ts;
          if (age < 0) { c.node.setAttribute('visibility', 'hidden'); continue; }
          const cyc = Hh / c.speed;
          const kk = Math.floor(age / cyc), loc = age - kk * cyc;
          const x = 90 + hash(c.j, kk) * 1740;
          put(c.node, x, -110 + c.speed * loc, c.r0 + age * 70 * (c.j % 2 ? 1 : -1), c.s, c.s, 1);
        }
      }

      /* ---- compteur ---- */
      if (st.counter) {
        const cn = p.counter, ct = st.counter;
        const pop = E.back(prog(t, ct.t0, ct.t0 + 0.3));
        ct.c.setAttribute('visibility', pop > 0.001 ? 'visible' : 'hidden');
        ct.c.setAttribute('transform', `translate(${f2(1430 + 220)} ${f2(40 + 70)}) scale(${f2(Math.max(pop, 0.001))}) translate(-220 -70)`);
        const from = cn.from == null ? 0 : cn.from, to = cn.to == null ? 0 : cn.to;
        const v = lerp(from, to, E.out2(prog(t, ct.t0 + 0.08, ct.t0 + Math.min(1.0, Math.max(0.5, st.dur - ct.t0 - 0.2)))));
        ct.val.textContent = ZV.fr(v) + (cn.suffix || '');
      }
    }
  });
})();
