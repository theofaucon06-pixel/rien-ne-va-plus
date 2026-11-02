// Composant `slot-machine` : machine à sous vue de face, plate, 1920×1080, fonction pure du temps.
// Caisson ink bordé paper, fronton à ampoules, 3 rouleaux (flou de mouvement par symboles dupliqués, jamais de filtre), ligne de gain,
// bandeau Mono CRÉDIT / MISE / GAIN, bouton SPIN, levier. Cues : spin, stop1-3, near, fanfare, hand, rapid, dim.
// Aucun dégradé, flou, lueur ni filter. Le gain est un piège (clignotant, creux) ; le compteur de crédits est le témoin sobre.
(() => {
  'use strict';
  const { C, E, clamp, prog, lerp, f2, sv, g, rect, circle, path, line, text, put, shakeAt, sticker, rng, fr } = ZV;
  let UID = 0;
  const SYMS = ['cherry', 'seven', 'bar', 'lemon', 'bell', 'zero'];
  const CELL = 140, RW = 192, NB = 28, MY = 440;
  const COLS = [C.lime, C.paper, C.red];
  const V0 = 11;                                   // cellules par seconde en croisière
  const AA = 0.22, QQ = 0.28;                       // accélération (s), fraction de vitesse à l'impact

  // écrit un attribut seulement s'il change (miroir du DOM, aucun état logique)
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const dec2 = (v) => (Math.round(v * 100) / 100).toFixed(2).replace('.', ',');
  const mod6 = (a) => ((a % 6) + 6) % 6;
  const fixT = (n, s) => { n.textContent = s; };

  /* ---- symboles plats, centrés sur (0,0), cellule 192×140 ---- */
  function drawSym(gg, name) {
    if (name === 'cherry') {
      path(gg, 'M-22 12 Q-18 -30 8 -48', 'none', C.ink, 7);
      path(gg, 'M26 20 Q24 -26 8 -48', 'none', C.ink, 7);
      path(gg, 'M8 -48 Q34 -70 56 -42 Q30 -30 8 -48Z', C.lime, C.ink, 5);
      circle(gg, -24, 24, 25, C.red, C.ink, 6);
      circle(gg, 28, 32, 25, C.red, C.ink, 6);
      circle(gg, -33, 15, 6, C.paper);
      circle(gg, 19, 23, 6, C.paper);
    } else if (name === 'seven') {
      const sh = text(gg, '7', 6, 58, 150, C.ink, { anchor: 'middle' });
      sh.setAttribute('stroke', C.ink); sh.setAttribute('stroke-width', 9); sh.setAttribute('stroke-linejoin', 'round');
      const t7 = text(gg, '7', 0, 52, 150, C.red, { anchor: 'middle' });
      t7.setAttribute('stroke', C.ink); t7.setAttribute('stroke-width', 9); t7.setAttribute('stroke-linejoin', 'round'); t7.setAttribute('paint-order', 'stroke');
    } else if (name === 'bar') {
      rect(gg, -68 + 6, -27 + 7, 136, 54, 8, C.red);
      rect(gg, -68, -27, 136, 54, 8, C.ink, C.ink, 6);
      rect(gg, -60, -19, 120, 38, 4, 'none', C.paper, 3);
      text(gg, 'BAR', 0, 12, 34, C.paper, { anchor: 'middle', len: 92 });
    } else if (name === 'lemon') {
      const lg = g(gg, { transform: 'rotate(-14)' });
      path(lg, 'M-64 0 Q-44 -44 0 -42 Q44 -44 64 0 Q44 44 0 42 Q-44 44 -64 0Z', C.lime, C.ink, 6);
      path(lg, 'M-30 -14 Q-10 -28 16 -26', 'none', C.paper, 6);
      circle(lg, -62, 0, 6, C.ink); circle(lg, 62, 0, 6, C.ink);
    } else if (name === 'bell') {
      path(gg, 'M-48 40 L48 40 C42 22 38 -4 32 -22 C26 -38 12 -44 0 -44 C-12 -44 -26 -38 -32 -22 C-38 -4 -42 22 -48 40Z', C.paper, C.ink, 6);
      path(gg, 'M14 -42 C26 -37 29 -30 32 -22 C38 -4 42 22 48 40 L24 40 C23 10 21 -20 14 -42Z', C.ink);
      path(gg, 'M-48 40 L48 40 C42 22 38 -4 32 -22 C26 -38 12 -44 0 -44 C-12 -44 -26 -38 -32 -22 C-38 -4 -42 22 -48 40Z', 'none', C.ink, 6);
      path(gg, 'M-40 22 L42 22', 'none', C.red, 8);
      circle(gg, 0, -50, 9, C.paper, C.ink, 5);
      circle(gg, 0, 50, 11, C.ink);
    } else {
      circle(gg, 0, 0, 48, C.lime, C.ink, 7);
      text(gg, '0', 0, 26, 78, C.ink, { anchor: 'middle' });
    }
    return gg;
  }

  // main plate : doigt tendu (pointe en (0,0), vers le haut), manche rouge
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

  function cleanSyms(a, fallback) {
    if (!Array.isArray(a) || a.length < 3) return fallback;
    const r = a.slice(0, 3).map((s) => (SYMS.includes(s) ? s : null));
    return r.every(Boolean) ? r : fallback;
  }

  ZV.define('slot-machine', {
    init(root, shot) {
      const p = shot.props || {};
      const beats = Array.isArray(shot.beats) ? shot.beats : [];
      const dur = isNum(shot.dur) && shot.dur > 0 ? shot.dur : 6;
      const cueL = (n) => beats.filter((b) => b && b.do === 'cue' && b.name === n && isNum(b.t)).sort((a, b) => a.t - b.t);
      const uid = ++UID;
      const side = p.side === 'left' || p.side === 'right' ? p.side : 'center';
      const cx = side === 'left' ? 560 : side === 'right' ? 1360 : 950;
      const credit0 = isNum(+p.credit) && p.credit != null ? +p.credit : 100;
      const bet = isNum(+p.bet) && p.bet != null ? +p.bet : 1;
      const reels0 = cleanSyms(p.reels, ['seven', 'bar', 'cherry']);
      const label = typeof p.label === 'string' && p.label ? p.label : 'ZÉRO VERT';
      const st = { uid, cx, dur, lights: p.lights !== false, lever: p.lever !== false, shot, credit0, bet };

      /* ---- fond ---- */
      rect(root, 0, 0, 1920, 1080, 0, C.ink);
      const bgs = g(root, { transform: 'rotate(-18 960 540)' });
      for (let k = -4; k <= 4; k++) rect(bgs, 960 + k * 300 - 70, -600, 140, 2300, 0, C.pocket);

      const defs = sv('defs', null, root);
      SYMS.forEach((n) => drawSym(g(defs, { id: `sm${uid}-${n}` }), n));
      const clip = sv('clipPath', { id: `sm${uid}-clip` }, defs);
      rect(clip, -288, -190, 576, 280, 0, '#000');

      /* ---- machine ---- */
      const m = st.m = g(root);
      st.shadow = rect(m, 20 - 350, 20 - 400, 700, 800, 40, C.lime);
      rect(m, -350, -400, 700, 800, 40, C.ink, C.paper, 8);

      // fronton
      rect(m, -316, -372, 632, 140, 24, C.pocket, C.paper, 5);
      st.label = text(m, label, 0, -279, 66, C.paper, { anchor: 'middle', len: clamp(label.length * 50, 160, 470) });
      st.bulbs = [];
      const PW = 600, PH = 108, PP = 2 * (PW + PH);
      for (let i = 0; i < NB; i++) {
        let s = i * PP / NB, x, y;
        if (s < PW) { x = -300 + s; y = -356; }
        else if (s < PW + PH) { x = 300; y = -356 + (s - PW); }
        else if (s < 2 * PW + PH) { x = 300 - (s - PW - PH); y = -248; }
        else { x = -300; y = -248 - (s - 2 * PW - PH); }
        st.bulbs.push(circle(m, f2(x), f2(y), 9, C.pocket, C.grey, 3));
      }

      // fenêtre des rouleaux
      st.frameFill = rect(m, -304, -204, 608, 308, 14, C.ink);
      const rg = g(m, { 'clip-path': `url(#sm${uid}-clip)` });
      st.reels = [0, 1, 2].map((i) => {
        const gr = g(rg, { transform: `translate(${(i - 1) * RW} -50)` });
        rect(gr, -RW / 2, -140, RW, 280, 0, C.paper);
        line(gr, -RW / 2, 0, RW / 2, 0, C.ink, 12);
        line(gr, -RW / 2, 0, RW / 2, 0, C.red, 6);
        const slots = [];
        for (let k = 0; k < 4; k++) {
          const sg = g(gr);
          const u = [0, 1, 2].map(() => sv('use', { href: `#sm${uid}-cherry` }, sg));
          slots.push({ sg, u });
        }
        return { slots };
      });
      for (const sx of [-96, 96]) rect(rg, sx - 4, -190, 8, 280, 0, C.ink);
      rect(rg, -288, -190, 576, 30, 0, C.ink, null, 0, { opacity: 0.16 });
      rect(rg, -288, 60, 576, 30, 0, C.ink, null, 0, { opacity: 0.16 });
      for (const sg of [-1, 1]) { line(m, sg * 288, -50, sg * 262, -50, C.ink, 14, { 'stroke-linecap': 'butt' }); line(m, sg * 288, -50, sg * 262, -50, C.red, 7, { 'stroke-linecap': 'butt' }); }
      for (const sg of [-1, 1]) path(m, `M${sg * 340} -66 L${sg * 316} -50 L${sg * 340} -34Z`, C.red, C.ink, 4);
      st.frame = rect(m, -304, -204, 608, 308, 14, 'none', C.paper, 6);

      // bandeau CRÉDIT / MISE / GAIN (le crédit est dessiné plus haut dans la pile, voir plus bas)
      const cellBox = (x, lab) => {
        rect(m, x - 94, 130, 188, 92, 10, C.pocket, C.paper, 4);
        text(m, lab, x, 160, 18, C.paper, { anchor: 'middle', mono: true, weight: 700, spacing: 3 }).setAttribute('opacity', 0.7);
      };
      cellBox(-200, 'CRÉDIT'); cellBox(0, 'MISE'); cellBox(200, 'GAIN');
      st.miseT = text(m, '', 0, 207, 42, C.white, { anchor: 'middle', mono: true, weight: 700 });
      st.gainBox = rect(m, 106, 130, 188, 92, 10, C.pocket, C.paper, 4);
      st.gainLab = text(m, 'GAIN', 200, 160, 18, C.paper, { anchor: 'middle', mono: true, weight: 700, spacing: 3 });
      st.gainT = text(m, '', 200, 207, 42, C.white, { anchor: 'middle', mono: true, weight: 700 });
      st.tourT = text(m, '', -200, 326, 30, C.paper, { anchor: 'middle', mono: true, weight: 700 });

      // bouton SPIN
      const bg = g(m, { transform: 'translate(0 318)' });
      circle(bg, 0, 0, 78, C.pocket, C.paper, 5);
      circle(bg, 0, 10, 62, C.ink);
      st.btn = g(bg);
      circle(st.btn, 0, 0, 62, C.red, C.ink, 6);
      path(st.btn, 'M-42 -20 A46 46 0 0 1 -8 -46', 'none', C.paper, 6, { opacity: 0.7 });
      text(st.btn, 'SPIN', 0, 14, 40, C.ink, { anchor: 'middle', len: 98 });

      // levier
      st.leverG = g(m);
      if (st.lever) {
        st.arc = line(st.leverG, 352, 30, 412, -110, C.ink, 24);
        st.arm = line(st.leverG, 352, 30, 412, -110, C.paper, 12);
        circle(st.leverG, 352, 30, 22, C.pocket, C.paper, 5);
        st.knob = g(st.leverG);
        circle(st.knob, 0, 0, 28, C.red, C.ink, 6);
        circle(st.knob, -8, -9, 7, C.paper);
      }

      // extinction : voile ink par-dessus la machine, puis crédit seul allumé
      st.veil = rect(m, -350, -400, 700, 800, 40, C.ink, null, 0, { opacity: 0 });
      st.creditBox = rect(m, -294, 130, 188, 92, 10, C.pocket, C.paper, 4);
      st.creditLab = text(m, 'CRÉDIT', -200, 160, 18, C.paper, { anchor: 'middle', mono: true, weight: 700, spacing: 3 });
      st.creditLab.setAttribute('opacity', 0.7);
      st.creditT = text(m, '', -200, 207, 42, C.white, { anchor: 'middle', mono: true, weight: 700 });
      st.bigG = g(m);
      text(st.bigG, 'CRÉDIT', 0, -150, 34, C.paper, { anchor: 'middle', mono: true, weight: 700, spacing: 8 });
      st.bigT = text(st.bigG, '', 0, -20, 150, C.paper, { anchor: 'middle', mono: true, weight: 800 });

      // étincelles plates
      const rr = rng(4242);
      st.sparks = [];
      for (let i = 0; i < 18; i++) {
        const ang = rr() * Math.PI * 2;
        const n = sv('path', { d: 'M0 -1L0.3 -0.3L1 0L0.3 0.3L0 1L-0.3 0.3L-1 0L-0.3 -0.3Z', fill: COLS[i % 3], stroke: C.ink, 'stroke-width': 3, 'stroke-linejoin': 'round', visibility: 'hidden' }, m);
        n.setAttribute('vector-effect', 'non-scaling-stroke');
        st.sparks.push({ n, dx: Math.cos(ang), dy: Math.sin(ang), sp: 170 + rr() * 260, sz: 22 + rr() * 30, dl: rr() * 0.5, rot: rr() * 90, rv: (rr() - 0.5) * 360 });
      }

      // sticker « PRESQUE ! »
      st.nearG = g(m);
      sticker(st.nearG, 380, 110, C.red, 'PRESQUE !', 64, C.ink, { sh: 10 });

      // main (hors du groupe qui tremble)
      st.hand = drawHand(g(root));
      st.handG = st.hand.parentNode;

      /* ---- repères ---- */
      const fans = cueL('fanfare');
      st.fans = fans;
      st.tn = (cueL('near')[0] || {}).t;
      st.td = (cueL('dim')[0] || {}).t;
      st.th = (cueL('hand')[0] || {}).t;
      st.hasRapid = cueL('rapid').length > 0;
      st.tRapid = st.hasRapid ? cueL('rapid')[0].t : null;

      /* ---- plan des tours : cycles { ts, reel[3] { te, sym, off, r0, V, a, d, J, rest } } ---- */
      const R = rng(777);
      const starts = cueL('spin').map((b) => ({ ts: b.t, rapid: false }));
      if (st.hasRapid) for (let k = 0, tt = st.tRapid; tt < dur - 0.3 && k < 60; k++, tt += 3) starts.push({ ts: tt, rapid: true });
      starts.sort((a, b) => a.ts - b.ts);
      const stopB = [1, 2, 3].map((n) => cueL('stop' + n));
      const nearB = cueL('near');
      const ov = [new Map(), new Map(), new Map()];
      reels0.forEach((s, i) => ov[i].set(0, s));
      const rests = [0, 0, 0];
      const pickRand = () => { const pool = ['cherry', 'bar', 'lemon', 'bell', 'zero', 'seven', 'cherry', 'bar', 'lemon', 'bell']; return pool[Math.floor(R() * pool.length) % pool.length]; };
      st.cycles = starts.map((s, c) => {
        const ts = s.ts, nextTs = c + 1 < starts.length ? starts[c + 1].ts : Infinity;
        const inWin = (b) => b.t > ts + 0.15 && b.t < nextTs;
        const nb = s.rapid ? null : nearB.find(inWin) || null;
        const te = [null, null, null], sym = [null, null, null], user = [false, false, false];
        for (let i = 0; i < 3; i++) {
          if (s.rapid) { te[i] = ts + 1.1 + 0.4 * i; continue; }
          const b = stopB[i].find(inWin);
          if (b) { te[i] = b.t; if (SYMS.includes(b.sym)) { sym[i] = b.sym; user[i] = true; } }
        }
        if (nb) {
          if (te[2] == null) te[2] = nb.t;
          if (te[0] == null) te[0] = Math.max(ts + 0.7, nb.t - 1.1);
          if (te[1] == null) te[1] = Math.max(ts + 0.9, nb.t - 0.55);
          for (let i = 0; i < 3; i++) if (!user[i]) sym[i] = 'seven';
          if (!user[2]) sym[2] = 'seven';
        }
        for (let i = 0; i < 3; i++) {
          if (te[i] == null && nextTs < Infinity) te[i] = Math.max(ts + 0.6, nextTs - 0.12);
          if (te[i] != null && te[i] < ts + 0.4) te[i] = ts + 0.4;
        }
        for (let i = 0; i < 3; i++) if (!sym[i]) sym[i] = pickRand();
        if (!nb && !user.some(Boolean) && sym[0] === sym[1] && sym[1] === sym[2]) sym[2] = sym[2] === 'bar' ? 'cherry' : 'bar';
        const cy = { ts, rapid: s.rapid, near: nb ? nb.t : null, reel: [] };
        for (let i = 0; i < 3; i++) {
          const r0 = rests[i], Rl = { ts, te: te[i], r0, a: AA, sym: sym[i], inf: te[i] == null };
          if (!Rl.inf) {
            const L = te[i] - ts, aa = Math.min(AA, L * 0.3), dd = Math.min(0.42, L * 0.4);
            const K = aa / 2 + (L - aa - dd) + dd * (1 + QQ) / 2;
            const off = nb && i === 2 ? 0.42 : 0;
            const Jf = Math.max(Math.round(r0 + V0 * K + off), Math.ceil(r0 + off + 3));
            Rl.a = aa; Rl.d = dd; Rl.off = off; Rl.J = Jf; Rl.rest = Jf - off; Rl.V = (Rl.rest - r0) / K;
            ov[i].set(Jf, sym[i]); rests[i] = Rl.rest;
          } else { Rl.V = V0; }
          cy.reel.push(Rl);
        }
        return cy;
      });
      st.ov = ov;
      st.perm = [0, 1, 2].map((i) => { const rq = rng(31 + i * 17), a = SYMS.slice(); for (let k = 5; k > 0; k--) { const j = Math.floor(rq() * (k + 1)); const x = a[k]; a[k] = a[j]; a[j] = x; } return a; });
      st.shift = [0, 2, 4];

      /* ---- crédit : événements séquentiels ---- */
      const ev = [];
      st.cycles.forEach((cy) => ev.push({ t0: cy.ts, t1: cy.ts + 0.3, d: -bet }));
      fans.forEach((b) => { if (isNum(+b.credit) && b.credit != null) ev.push({ t0: b.t, t1: b.t + 0.5, abs: +b.credit }); });
      if (st.td != null) {
        const db = cueL('dim')[0];
        ev.push({ t0: st.td + 0.7, t1: Math.max(st.td + 3, dur - 0.2), cap: true, to: isNum(+db.credit_to) && db.credit_to != null ? +db.credit_to : null });
      }
      ev.sort((a, b) => a.t0 - b.t0);
      let cur = credit0, allInt = Number.isInteger(credit0) && Number.isInteger(bet);
      for (const e of ev) {
        e.from = cur;
        if (e.abs != null) e.to = e.abs; else if (e.cap) { if (e.to == null) e.to = Math.max(0, Math.floor(cur * 0.6)); } else e.to = Math.max(0, cur + e.d);
        if (!Number.isInteger(e.to)) allInt = false;
        cur = e.to;
      }
      st.ev = ev; st.dec = !allInt;
      st.miseT.textContent = st.dec ? dec2(bet) : String(bet);
      return st;
    },

    update(st, t, shot) {
      const cy = st.cycles;
      const reelPos = (i, tt) => {
        let c = null;
        for (let k = cy.length - 1; k >= 0; k--) if (tt >= cy[k].ts) { c = cy[k]; break; }
        if (!c) return 0;
        const Rl = c.reel[i], s = tt - Rl.ts, a = Rl.a;
        if (Rl.inf) return Rl.r0 + Rl.V * (s < a ? s * s / (2 * a) : a / 2 + (s - a));
        if (tt >= Rl.te) { const w = tt - Rl.te; return Rl.rest + (w < 0.7 ? 0.2 * Math.exp(-6.5 * w) * Math.sin(2 * Math.PI * 2.3 * w) : 0); }
        const L = Rl.te - Rl.ts, d = Rl.d, V = Rl.V;
        if (s < a) return Rl.r0 + V * s * s / (2 * a);
        if (s < L - d) return Rl.r0 + V * (a / 2 + s - a);
        const w = s - (L - d);
        return Rl.r0 + V * (a / 2 + L - a - d) + V * (w - (1 - QQ) * w * w / (2 * d));
      };
      const symAt = (i, j) => {
        const o = st.ov[i];
        if (o.has(j)) return o.get(j);
        const P = st.perm[i], sh = st.shift[i];
        let s = P[mod6(j + sh)];
        if (o.get(j - 1) === s || o.get(j + 1) === s) s = P[mod6(j + sh + 3)];
        return s;
      };

      const td = st.td, dimmed = td != null && t >= td;
      let fan = null;
      if (!dimmed) for (const b of st.fans) if (b.t <= t) fan = b;
      const tn = st.tn, nearOn = !dimmed && tn != null && t >= tn && t < tn + 2.0;

      /* ---- rouleaux ---- */
      let spinning = false, shx = 0, shy = 0;
      for (let i = 0; i < 3; i++) {
        const r = reelPos(i, t);
        const v = (r - reelPos(i, t - 0.025)) / 0.025;
        if (v > 2) spinning = true;
        const gh = clamp(v * CELL * 0.02, 0, 56);
        const base = Math.floor(r);
        const slots = st.reels[i].slots;
        for (let k = 0; k < 4; k++) {
          const j = base - 1 + k, y = (r - j) * CELL, sl = slots[k];
          const vis = Math.abs(y) < 216;
          setA(sl.sg, 'visibility', vis ? 'visible' : 'hidden');
          if (!vis) continue;
          setA(sl.sg, 'transform', `translate(0 ${f2(y)})`);
          const href = `#sm${st.uid}-${symAt(i, j)}`;
          for (let q = 0; q < 3; q++) setA(sl.u[q], 'href', href);
          const gv = gh > 2.5;
          setA(sl.u[0], 'visibility', gv ? 'visible' : 'hidden'); setA(sl.u[1], 'visibility', gv ? 'visible' : 'hidden');
          if (gv) {
            setA(sl.u[0], 'transform', `translate(0 ${f2(-gh)})`); setA(sl.u[1], 'transform', `translate(0 ${f2(gh)})`);
            setA(sl.u[0], 'opacity', 0.5); setA(sl.u[1], 'opacity', 0.5);
          }
          setA(sl.u[2], 'opacity', gv ? 0.88 : 1);
        }
      }
      // tremblements : impacts des rouleaux, presque, fanfare
      for (const c of cy) {
        if (t < c.ts || t > c.ts + 8) continue;
        for (let i = 0; i < 3; i++) { const Rl = c.reel[i]; if (!Rl.inf) { const s = shakeAt(t, Rl.te, 3, 0.2); shx += s[0]; shy += s[1]; } }
      }
      if (tn != null) { const s = shakeAt(t, tn, 16, 0.55); shx += s[0]; shy += s[1]; }
      if (fan) { const s = shakeAt(t, fan.t, 7, 0.4); shx += s[0]; shy += s[1]; }
      st.m.setAttribute('transform', `translate(${f2(st.cx + shx)} ${f2(MY + shy)})`);

      /* ---- ampoules ---- */
      const nbk = st.bulbs.length;
      for (let i = 0; i < nbk; i++) {
        let on = st.lights, col = COLS[i % 3];
        if (dimmed) on = false;
        else if (fan) { on = true; col = COLS[(i + Math.floor((t - fan.t) * 5)) % 3]; }
        else if (nearOn) { on = true; col = ((i + Math.floor((t - tn) * 5)) & 1) ? C.red : C.lime; }
        else if (spinning) on = st.lights && mod6(i - Math.floor(t * 6)) % 3 === 0;
        const b = st.bulbs[i];
        setA(b, 'fill', on ? col : C.pocket); setA(b, 'stroke', on ? C.ink : C.grey);
      }

      /* ---- fanfare : cadre, fronton, GAIN, étincelles ---- */
      const blink = fan ? Math.floor((t - fan.t) * 2.5) % 2 === 0 : false;
      setA(st.frame, 'stroke', fan ? (blink ? C.lime : C.red) : C.paper);
      setA(st.label, 'fill', fan ? (blink ? C.lime : C.white) : C.paper);
      setA(st.shadow, 'fill', dimmed ? C.pocket : fan && !blink ? C.red : C.lime);
      const winTxt = fan && fan.win != null ? (typeof fan.win === 'string' ? fan.win : (Number.isInteger(+fan.win) ? fr(+fan.win) : dec2(+fan.win))) : '0';
      if (st.gainT.textContent !== winTxt) st.gainT.textContent = winTxt;
      setA(st.gainBox, 'fill', fan ? (blink ? C.lime : C.pocket) : C.pocket);
      setA(st.gainT, 'fill', fan ? (blink ? C.ink : C.lime) : C.white);
      setA(st.gainLab, 'fill', fan && blink ? C.ink : C.paper);
      for (const sp of st.sparks) {
        let s = fan ? (t - fan.t - sp.dl) : -1;
        let q = -1;
        if (s >= 0) { s %= 1.3; q = s / 1.0; }
        if (q < 0 || q >= 1) { setA(sp.n, 'visibility', 'hidden'); continue; }
        const e = E.out3(q), sz = sp.sz * (1 - 0.6 * q);
        setA(sp.n, 'visibility', 'visible');
        sp.n.setAttribute('transform', `translate(${f2(sp.dx * sp.sp * e)} ${f2(-50 + sp.dy * sp.sp * e)}) rotate(${f2(sp.rot + sp.rv * q)}) scale(${f2(sz)})`);
      }

      /* ---- sticker PRESQUE ! ---- */
      if (tn != null) {
        const pp = prog(t, tn, tn + 0.28), po = 1 - E.in2(prog(t, tn + 2.6, tn + 2.85));
        const sc = E.back(pp) * (t > tn + 2.6 ? Math.max(po, 0) : 1);
        put(st.nearG, 200, -212, -7, sc, sc, pp > 0 ? 1 : 0);
      } else put(st.nearG, 200, -212, -7, 0, 0, 0);

      /* ---- crédit, mise, tours ---- */
      let cr = st.credit0;
      for (const e of st.ev) {
        if (t >= e.t1) cr = e.to;
        else { if (t > e.t0) cr = lerp(e.from, e.to, (t - e.t0) / (e.t1 - e.t0)); break; }
      }
      const crT = st.dec ? dec2(cr) : fr(Math.round(cr));
      if (st.creditT.textContent !== crT) st.creditT.textContent = crT;
      if (st.hasRapid) {
        let n = 0; for (const c of cy) if (c.rapid && c.ts <= t) n++;
        const tt = n ? 'TOUR ' + n : '';
        if (st.tourT.textContent !== tt) st.tourT.textContent = tt;
      }

      /* ---- bouton, levier, main ---- */
      let press = 0, pull = 0;
      for (const c of cy) {
        if (t < c.ts) break;
        const s = t - c.ts;
        press = Math.max(press, s < 0.1 ? s / 0.1 : s < 0.35 ? 1 - (s - 0.1) / 0.25 : 0);
        if (s < 0.18) pull = Math.max(pull, E.out2(s / 0.18)); else if (s < 0.6) pull = Math.max(pull, 1 - E.io2((s - 0.18) / 0.42));
      }
      const th = st.th;
      const hp = th == null ? 0 : E.out3(prog(t, th, th + 0.45));
      press = Math.max(press, hp >= 0.97 ? 0.9 : 0);
      setA(st.btn, 'transform', `translate(0 ${f2(8 * press)})`);
      if (st.lever) {
        const kx = lerp(412, 424, pull), ky = lerp(-110, 130, pull);
        for (const n of [st.arc, st.arm]) { n.setAttribute('x2', f2(kx)); n.setAttribute('y2', f2(ky)); }
        const ks = 1 + 0.18 * pull;
        st.knob.setAttribute('transform', `translate(${f2(kx)} ${f2(ky)}) scale(${f2(ks)})`);
      }
      if (th == null || hp <= 0) setA(st.handG, 'visibility', 'hidden');
      else {
        const k = 1 - hp;
        const tx = st.cx + 10 + 150 * k, ty = MY + 318 + 36 + 420 * k + (hp >= 0.97 ? 6 : 0);
        setA(st.handG, 'visibility', 'visible');
        st.hand.setAttribute('transform', `translate(${f2(tx)} ${f2(ty)}) rotate(-12)`);
      }

      /* ---- extinction ---- */
      if (td != null) {
        const pd = E.io3(prog(t, td, td + 0.6)), pb = prog(t, td + 0.5, td + 0.9);
        setA(st.veil, 'opacity', f2(0.95 * pd));
        const showBig = pb > 0;
        setA(st.bigG, 'visibility', showBig ? 'visible' : 'hidden'); setA(st.bigG, 'opacity', f2(pb));
        if (st.bigT.textContent !== crT) st.bigT.textContent = crT;
      } else { setA(st.veil, 'opacity', 0); setA(st.bigG, 'visibility', 'hidden'); }
    }
  });
})();
