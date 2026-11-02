// Composant `pictos` : petites illustrations plates animées (famille cohérente de dessins SVG simples).
// Expose aussi `ZV.PICTO` (le jeu de pictogrammes) pour `saga` et `newspaper`.
(() => {
  const { C, sv, g, f2, E, prog, clamp, lerp, put, show, text, rect, circle } = ZV;
  const INK = C.ink;
  const D2R = Math.PI / 180;
  let UID = 0;

  /* ------------------------------------------------------------------ */
  /*  Contexte de dessin : même code pour le dessin et son ombre dure     */
  /* ------------------------------------------------------------------ */
  function ctx(par, flat, sober, fcol) {
    const FC = fcol || INK;
    const K = (c) => {
      if (c == null || c === 'none') return 'none';
      if (flat) return FC;
      if (sober && (c === 'lime' || c === 'red')) c = 'paper';
      return C[c] || c;
    };
    const S = (n, sw, sc) => {
      n.setAttribute('stroke', flat ? FC : (sc ? K(sc) : INK));
      n.setAttribute('stroke-width', sw == null ? 5 : sw);
      n.setAttribute('stroke-linejoin', 'round');
      n.setAttribute('stroke-linecap', 'round');
      return n;
    };
    const P = {
      flat, node: par,
      r(x, y, w, h, rx, fill, sw, sc) { const n = sv('rect', { x, y, width: w, height: h, rx: rx || 0, fill: K(fill) }, par); return sw === 0 ? n : S(n, sw, sc); },
      c(cx, cy, r, fill, sw, sc) { const n = sv('circle', { cx, cy, r, fill: K(fill) }, par); return sw === 0 ? n : S(n, sw, sc); },
      e(cx, cy, rx, ry, fill, sw, sc) { const n = sv('ellipse', { cx, cy, rx, ry, fill: K(fill) }, par); return sw === 0 ? n : S(n, sw, sc); },
      p(d, fill, sw, sc) { const n = sv('path', { d, fill: K(fill) }, par); return sw === 0 ? n : S(n, sw, sc); },
      l(x1, y1, x2, y2, color, w) { const n = sv('line', { x1, y1, x2, y2, stroke: K(color), 'stroke-width': w || 5, 'stroke-linecap': 'round' }, par); return n; },
      // trait épais bordé d'ink
      tl(d, color, w, cap) {
        const o = sv('path', { d, fill: 'none', stroke: flat ? FC : INK, 'stroke-width': w + 10, 'stroke-linecap': cap || 'round', 'stroke-linejoin': 'round' }, par);
        if (flat) return o;
        return sv('path', { d, fill: 'none', stroke: K(color), 'stroke-width': w, 'stroke-linecap': cap || 'round', 'stroke-linejoin': 'round' }, par);
      },
      t(str, x, y, size, fill, o) { if (flat) return null; return text(par, str, x, y, size, K(fill), o); },
      g(tr) { const n = sv('g', tr ? { transform: tr } : {}, par); const q = ctx(n, flat, sober, fcol); q.node = n; return q; }
    };
    return P;
  }

  /* ------------------------------------------------------------------ */
  /*  Le jeu de pictogrammes (boîte nominale ±120)                       */
  /* ------------------------------------------------------------------ */
  const B = {};

  B.chip = (P, o) => {
    const main = o.color || 'white', acc = main === 'white' ? 'lime' : 'white';
    P.c(0, 0, 100, main);
    if (!P.flat) for (let k = 0; k < 8; k++) P.g(`rotate(${k * 45})`).r(-13, -98, 26, 34, 5, acc, 4);
    P.c(0, 0, 58, main);
    P.t(o.text || '€', 0, 22, 64, 'ink', { mono: 1, anchor: 'middle' });
    return {};
  };
  B.ball = (P) => {
    P.c(0, 0, 66, 'white');
    if (!P.flat) { P.p('M -40 -22 A 46 46 0 0 1 -8 -46', 'none', 9, 'lime'); P.c(0, 0, 66, 'none'); }
    return {};
  };
  B['wheel-mini'] = (P) => {
    P.c(0, 0, 106, 'pocket');
    if (!P.flat) {
      const rin = 50, rout = 90;
      for (let k = 0; k < 12; k++) {
        const a0 = k * 30 * D2R, a1 = (k + 1) * 30 * D2R, X = (r, a) => f2(Math.cos(a) * r) + ' ' + f2(Math.sin(a) * r);
        P.p(`M ${X(rin, a0)} L ${X(rout, a0)} A ${rout} ${rout} 0 0 1 ${X(rout, a1)} L ${X(rin, a1)} A ${rin} ${rin} 0 0 0 ${X(rin, a0)} Z`, k % 2 ? 'pocket' : 'red', 4, 'paper');
      }
      P.c(0, 0, 106, 'none', 6, 'paper');
      P.c(0, 0, 34, 'paper');
      P.c(0, 0, 13, 'lime', 4);
    }
    return {};
  };
  B.hand = (P) => {
    const h = [66, 88, 94, 78];
    P.g('translate(-58 40) rotate(-52)').r(-13, -64, 28, 76, 14, 'white');
    for (let i = 0; i < 4; i++) P.r(-54 + i * 28, -h[i], 25, h[i] + 40, 12, 'white');
    P.r(-62, -10, 124, 104, 30, 'white');
    if (!P.flat) P.r(-48, -14, 96, 24, 0, 'white', 0);
    return {};
  };
  B.breath = (P) => {
    const q = [[-72, 14, 38], [-28, -8, 48], [20, 14, 36]];
    q.forEach((c) => P.c(c[0], c[1], c[2], 'white'));
    if (!P.flat) q.forEach((c) => P.c(c[0], c[1], c[2], 'white', 0));
    P.tl('M 44 -42 H 112', 'lime', 12);
    P.tl('M 62 6 H 128', 'red', 12);
    P.tl('M 44 54 H 104', 'lime', 12);
    return {};
  };
  B.eye = (P) => {
    P.p('M -112 0 C -60 -78 60 -78 112 0 C 60 78 -60 78 -112 0 Z', 'white');
    const iris = P.g();
    iris.c(0, 0, 46, 'lime');
    iris.c(0, 0, 20, 'ink');
    if (!P.flat) iris.c(12, -14, 8, 'white', 0);
    return { iris: iris.node };
  };
  B.planet = (P) => {
    const ring = P.g('rotate(-18)');
    ring.tl('M -126 0 A 126 34 0 0 1 126 0', 'white', 12);
    P.c(0, 0, 70, 'lime');
    if (!P.flat) P.c(-24, -26, 14, 'white', 0);
    P.g('rotate(-18)').tl('M -126 0 A 126 34 0 0 0 126 0', 'white', 12);
    return {};
  };
  B.magnet = (P) => {
    P.tl('M -62 -78 V 8 A 62 62 0 0 0 62 8 V -78', 'red', 44, 'butt');
    P.tl('M -62 -78 V -44', 'white', 44, 'butt');
    P.tl('M 62 -78 V -44', 'white', 44, 'butt');
    if (!P.flat) {
      P.l(-62, -108, -62, -122, 'lime', 7); P.l(62, -108, 62, -122, 'lime', 7);
      P.l(-86, -100, -98, -112, 'lime', 7); P.l(86, -100, 98, -112, 'lime', 7);
    }
    return {};
  };
  B['croupier-hand'] = (P) => {
    const q = P.g('translate(14 -28) rotate(-24 0 40)');
    q.r(-176, 6, 120, 70, 8, 'pocket');
    q.r(-62, 2, 22, 78, 4, 'white');
    for (let i = 0; i < 3; i++) q.r(10, 10 + i * 24, 70, 22, 11, 'white');
    q.g('translate(-30 18) rotate(-52)').r(-14, -66, 28, 74, 14, 'white');
    q.r(-44, 8, 66, 66, 16, 'white');
    if (!P.flat) { q.r(14, 6, 20, 70, 0, 'white', 0); q.c(86, 52, 20, 'red'); }
    return {};
  };
  B.cashbox = (P) => {
    const refs = { stack: [], coins: [] };
    P.r(-105, -52, 210, 70, 10, 'pocket');
    if (!P.flat) {
      for (let k = 0; k < 5; k++) refs.stack.push(P.e(-72 + k * 36, -28, 18, 12, k % 2 ? 'white' : 'lime'));
    }
    P.r(-105, -8, 210, 104, 12, 'lime');
    P.r(-34, 28, 68, 28, 7, 'white');
    P.r(-105, -8, 210, 18, 6, 'ink', 0);
    if (!P.flat) {
      for (let k = 0; k < 5; k++) { const cn = P.c(0, 0, 18, k % 2 ? 'white' : 'lime'); cn.setAttribute('visibility', 'hidden'); refs.coins.push(cn); }
    }
    return refs;
  };
  B.casino = (P) => {
    P.r(-106, -34, 212, 130, 6, 'white');
    P.p('M -126 -30 L 0 -112 L 126 -30 Z', 'red');
    if (!P.flat) {
      [-78, -26, 26, 78].forEach((x) => P.r(x - 12, -22, 24, 96, 4, 'lime'));
      P.c(0, -62, 20, 'lime');
      P.t('€', 0, -50, 32, 'ink', { mono: 1, anchor: 'middle' });
    }
    P.r(-124, 94, 248, 22, 4, 'pocket');
    return {};
  };
  B.cloth = (P) => {
    P.p('M -112 -76 L 112 -76 L 122 66 Q 98 104 76 68 Q 50 112 22 68 Q -6 108 -34 68 Q -62 106 -88 68 Q -106 92 -122 66 Z', 'pocket', 5, 'paper');
    if (!P.flat) {
      P.p('M -60 -72 Q -52 -10 -62 50', 'none', 4, 'paper');
      P.p('M 0 -72 Q 10 -10 2 60', 'none', 4, 'paper');
      P.p('M 62 -72 Q 52 -10 66 50', 'none', 4, 'paper');
    }
    return {};
  };
  B.table = (P) => {
    P.r(-104, 40, 24, 74, 4, 'pocket');
    P.r(80, 40, 24, 74, 4, 'pocket');
    P.p('M -100 -58 L 100 -58 L 140 44 L -140 44 Z', 'red');
    P.r(-140, 44, 280, 32, 5, 'red');
    if (!P.flat) {
      P.p('M -80 -44 L 80 -44 L 114 32 L -114 32 Z', 'lime');
      P.c(-34, -6, 12, 'white', 4); P.c(8, -18, 12, 'white', 4); P.c(44, 2, 12, 'white', 4);
    }
    return {};
  };
  B.safe = (P) => {
    const refs = {};
    P.r(-100, -100, 200, 200, 16, 'white');
    if (!P.flat) {
      P.r(-78, -78, 156, 156, 8, 'pocket');
      P.c(-20, 52, 24, 'lime'); P.c(30, 56, 22, 'lime'); P.c(4, 18, 24, 'white'); P.c(-34, 8, 20, 'lime');
      const door = P.g('translate(-78 0)');
      door.r(0, -78, 156, 156, 8, 'lime');
      door.c(78, 0, 38, 'white');
      door.c(78, 0, 14, 'pocket');
      door.r(66, -5, 52, 10, 4, 'ink', 0);
      door.r(14, -60, 10, 120, 4, 'ink', 0);
      refs.door = door.node;
      P.r(-100, 100, 20, 14, 3, 'pocket'); P.r(80, 100, 20, 14, 3, 'pocket');
    }
    return refs;
  };
  B['sign-open'] = (P) => {
    const refs = {};
    P.l(0, -120, -66, -50, 'ink', 5); P.l(0, -120, 66, -50, 'ink', 5);
    P.c(0, -120, 9, 'white');
    const pl = P.g('translate(0 8)');
    const f1 = pl.g();
    f1.r(-108, -50, 216, 112, 14, 'red');
    f1.t('FERMÉ', 0, 22, 62, 'white', { anchor: 'middle', len: 168 });
    if (!P.flat) {
      const f2g = pl.g();
      f2g.r(-108, -50, 216, 112, 14, 'lime');
      f2g.t('OUVERT', 0, 22, 62, 'ink', { anchor: 'middle', len: 176 });
      refs.f2 = f2g.node;
    }
    refs.pl = pl.node; refs.f1 = f1.node;
    return refs;
  };
  B.mic = (P) => {
    P.p('M -22 4 L 22 4 L 15 106 Q 0 120 -15 106 Z', 'red');
    P.c(0, -56, 48, 'white');
    if (!P.flat) {
      P.p('M -48 -56 H 48 M 0 -104 V -8 M -34 -90 L 34 -22 M 34 -90 L -34 -22', 'none', 4);
      P.c(0, -56, 48, 'none');
    }
    P.r(-30, -8, 60, 18, 5, 'lime');
    return {};
  };
  B.bubble = (P, o) => {
    const shape = 'M -112 -58 Q -112 -78 -92 -78 H 92 Q 112 -78 112 -58 V 36 Q 112 56 92 56 H 8 L -60 112 L -44 56 H -92 Q -112 56 -112 36 Z';
    const refs = {};
    const fr = P.g();
    fr.p(shape, 'white');
    const lines = (o.lines || ['J’AI UN', 'SYSTÈME']);
    fr.t(lines[0], 0, -14, 50, 'ink', { anchor: 'middle', len: 150 });
    fr.t(lines[1], 0, 40, 50, 'ink', { anchor: 'middle', len: 188 });
    refs.front = fr.node;
    if (!P.flat) {
      const bk = P.g();
      bk.p(shape, 'red');
      bk.t('UN', 0, -14, 50, 'white', { anchor: 'middle', len: 70 });
      bk.t('SECRET', 0, 40, 50, 'white', { anchor: 'middle', len: 170 });
      refs.back = bk.node;
    }
    return refs;
  };
  B.envelope = (P) => {
    const refs = { coins: [] };
    if (!P.flat) {
      P.p('M -104 -62 L 0 -142 L 104 -62 Z', 'lime');
    }
    P.r(-104, -66, 208, 134, 10, 'white');
    if (!P.flat) {
      P.p('M -104 -62 L 0 16 L 104 -62', 'none', 5);
      P.c(0, 12, 17, 'red', 4);
    }
    return refs;
  };
  B.coins = (P, o) => {
    const pos = [[-74, 62], [0, 62], [74, 62], [-37, 10], [37, 10], [0, -42]];
    const refs = { coin: [] };
    const n = o.n == null ? 6 : o.n;
    pos.forEach((p, k) => {
      if (k >= pos.length) return;
      const q = P.g(`translate(${p[0]} ${p[1]})`);
      q.c(0, 0, 38, k % 2 ? 'white' : 'lime');
      if (!P.flat) { q.c(0, 0, 24, 'none', 3.5); q.t('€', 0, 9, 26, 'ink', { mono: 1, anchor: 'middle' }); }
      refs.coin.push(q.node);
      if (k >= n) q.node.setAttribute('visibility', 'hidden');
    });
    return refs;
  };
  B.ship = (P) => {
    P.p('M -112 12 H 112 L 82 76 H -86 Z', 'white');
    if (!P.flat) P.p('M -100 36 H 100', 'none', 8, 'red');
    P.r(-62, -34, 124, 46, 8, 'lime');
    P.r(-30, -78, 60, 44, 8, 'white');
    if (!P.flat) {
      [-84, -36, 12, 60].forEach((x) => P.c(x + 6, -12, 9, 'white', 4));
      P.c(-6, -56, 9, 'ink', 0); P.c(14, -56, 9, 'ink', 0);
    }
    P.r(36, -102, 24, 36, 5, 'red');
    P.p('M -112 98 q 14 -16 28 0 t 28 0 t 28 0 t 28 0 t 28 0 t 28 0 t 28 0 t 28 0', 'none', 8, 'ink');
    return {};
  };
  B.heart = (P) => {
    P.p('M 0 80 C -152 -20 -64 -112 0 -42 C 64 -112 152 -20 0 80 Z', 'red');
    if (!P.flat) P.p('M -58 -38 Q -46 -64 -18 -60', 'none', 10, 'white');
    return {};
  };
  B.violin = (P) => {
    P.tl('M 0 -30 V -112', 'pocket', 18, 'butt');
    P.c(0, -122, 15, 'pocket');
    P.c(0, 50, 56, 'white');
    P.c(0, -10, 42, 'white');
    P.r(-40, -18, 80, 40, 0, 'white', 0);
    if (!P.flat) {
      P.c(0, 50, 56, 'white', 0); P.c(0, -10, 42, 'white', 0);
      P.p('M -28 14 q -8 18 0 36 M 28 14 q 8 18 0 36', 'none', 6);
      P.r(-22, 66, 44, 10, 3, 'pocket');
      P.tl('M 88 104 L 100 -70', 'white', 8);
    }
    return {};
  };
  B.trumpet = (P) => {
    P.tl('M 14 -14 H -96 A 21 21 0 0 0 -96 28 H 14', 'white', 18);
    P.p('M 14 -34 L 104 -80 L 104 94 L 14 56 Z', 'red');
    if (!P.flat) {
      [-56, -26, 4].forEach((x) => { P.r(x - 7, -60, 14, 34, 4, 'pocket'); P.c(x, -64, 10, 'lime', 4); });
    }
    return {};
  };
  B.drum = (P) => {
    P.r(-92, -22, 184, 102, 10, 'red');
    if (!P.flat) {
      P.p('M -78 -22 L -52 80 L -26 -22 L 0 80 L 26 -22 L 52 80 L 78 -22', 'none', 6, 'white');
    }
    P.e(0, -22, 92, 28, 'white');
    P.e(0, 80, 92, 28, 'red', 0);
    P.p('M -92 80 A 92 28 0 0 0 92 80', 'none', 5);
    if (!P.flat) {
      P.l(-70, -112, 22, -34, 'white', 13); P.c(-72, -114, 12, 'lime');
      P.l(70, -112, -22, -34, 'white', 13); P.c(72, -114, 12, 'lime');
    }
    return {};
  };
  B.gavel = (P) => {
    const refs = {};
    P.r(-124, 52, 110, 44, 8, 'red');
    P.r(-110, 96, 82, 12, 3, 'pocket');
    const m = P.g('translate(78 14) rotate(0)');
    m.r(-150, -9, 154, 18, 8, 'white');
    m.r(-186, -44, 52, 88, 10, 'lime');
    if (!P.flat) { m.r(-170, -44, 8, 88, 0, 'ink', 0); }
    refs.mallet = m.node;
    return refs;
  };
  B.bars = (P) => {
    for (let i = 0; i < 6; i++) P.r(-90 + i * 36 - 9, -100, 18, 200, 5, 'white');
    P.r(-114, -112, 228, 28, 6, 'red');
    P.r(-114, 84, 228, 28, 6, 'red');
    return {};
  };
  B.idcard = (P) => {
    const refs = {};
    P.r(-116, -76, 232, 152, 14, 'white');
    P.r(-116, -76, 232, 34, 14, 'lime');
    P.r(-116, -56, 232, 14, 0, 'lime', 0);
    if (!P.flat) {
      P.p('M -116 -42 H 116', 'none', 4);
      P.r(-98, -28, 66, 78, 6, 'lime');
      P.c(-65, -6, 14, 'ink', 0);
      P.p('M -88 48 Q -88 20 -65 18 Q -42 20 -42 48 Z', 'ink', 0);
      refs.old = P.r(-14, -24, 104, 16, 3, 'ink', 0);
      refs.nu = P.r(-14, 2, 70, 16, 3, 'lime', 4);
      P.r(-14, 30, 82, 11, 3, 'ink', 0);
      P.r(-14, 49, 56, 11, 3, 'ink', 0);
      refs.scr = sv('path', { d: 'M -20 -12 L -4 -34 L 4 -4 L 20 -34 L 28 -4 L 44 -34 L 52 -4 L 68 -34 L 76 -4 L 94 -34', fill: 'none', stroke: C.red, 'stroke-width': 8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', pathLength: 1, 'stroke-dasharray': 1, 'stroke-dashoffset': 1 }, P.node);
    }
    return refs;
  };
  B.mound = (P, o) => {
    const col = o.color || 'paper';
    P.p('M -128 80 L -128 66 Q -112 62 -96 62 Q -58 56 -34 34 Q -8 10 22 14 Q 52 16 74 40 Q 96 60 128 66 L 128 80 Z', col);
    if (!P.flat) {
      const neg = col === 'ink' ? 'paper' : 'ink';
      P.l(-70, 70, -40, 70, neg, 6); P.l(-14, 56, 22, 56, neg, 6); P.l(50, 70, 92, 70, neg, 6);
    }
    return {};
  };
  B.hook = (P) => {
    P.l(0, -1500, 0, 6, 'white', 7);
    P.tl('M 0 0 V 40 C 0 116 -84 120 -84 52', 'white', 14);
    P.p('M -84 54 L -108 22 L -62 26 Z', 'white');
    return {};
  };
  B.scale = (P, o) => {
    const refs = {};
    P.p('M -22 122 L 22 122 L 12 -64 L -12 -64 Z', 'white');
    P.r(-74, 102, 148, 22, 8, 'red');
    const beam = P.g('translate(0 -70)');
    beam.r(-124, -9, 248, 18, 9, 'white');
    refs.beam = beam.node;
    P.c(0, -70, 15, 'lime');
    const mkPan = (side) => {
      const q = P.g();
      const strings = [];
      if (!P.flat) {
        strings.push(P.l(0, 0, 0, 0, 'ink', 4)); strings.push(P.l(0, 0, 0, 0, 'ink', 4));
      }
      const pan = P.g();
      pan.p('M -64 0 H 64 A 64 40 0 0 1 -64 0 Z', side < 0 ? 'white' : 'red');
      return { pan: pan.node, strings };
    };
    refs.L = mkPan(-1); refs.R = mkPan(1);
    refs.set = (a) => {
      const c = Math.cos(a * D2R), s = Math.sin(a * D2R);
      refs.beam.setAttribute('transform', `translate(0 -70) rotate(${f2(a)})`);
      [[refs.L, -124 * c, -70 - 124 * s], [refs.R, 124 * c, -70 + 124 * s]].forEach(([pr, ex, ey]) => {
        pr.pan.setAttribute('transform', `translate(${f2(ex)} ${f2(ey + 96)})`);
        if (pr.strings.length) {
          pr.strings[0].setAttribute('x1', f2(ex)); pr.strings[0].setAttribute('y1', f2(ey)); pr.strings[0].setAttribute('x2', f2(ex - 54)); pr.strings[0].setAttribute('y2', f2(ey + 96));
          pr.strings[1].setAttribute('x1', f2(ex)); pr.strings[1].setAttribute('y1', f2(ey)); pr.strings[1].setAttribute('x2', f2(ex + 54)); pr.strings[1].setAttribute('y2', f2(ey + 96));
        }
      });
    };
    refs.set(0);
    return refs;
  };
  B.chair = (P, o) => {
    P.r(-52, -112, 104, 106, 14, 'white');
    P.r(-66, -10, 132, 32, 10, 'red');
    P.r(-56, 20, 18, 92, 4, 'pocket'); P.r(38, 20, 18, 92, 4, 'pocket');
    return {};
  };
  B['zero-seat'] = (P) => {
    const refs = {};
    P.r(-60, -118, 120, 112, 16, 'white');
    P.r(-76, -10, 152, 34, 12, 'red');
    P.r(-66, 22, 20, 98, 4, 'pocket'); P.r(46, 22, 20, 98, 4, 'pocket');
    const z = P.g();
    z.c(0, -48, 70, 'lime');
    z.t('0', 0, -7, 112, 'ink', { anchor: 'middle' });
    refs.zero = z.node;
    return refs;
  };
  B.slot = (P) => {
    P.r(-96, -112, 176, 228, 18, 'red');
    P.r(-72, -98, 128, 36, 8, 'lime');
    P.r(-74, -40, 132, 92, 8, 'white');
    if (!P.flat) {
      P.l(-30, -40, -30, 52, 'ink', 4); P.l(14, -40, 14, 52, 'ink', 4);
      ['7', '0', '€'].forEach((s, i) => P.t(s, -52 + i * 44, 28, 60, i === 1 ? 'red' : 'ink', { mono: 1, anchor: 'middle' }));
    }
    P.r(-60, 74, 100, 22, 5, 'pocket');
    P.tl('M 88 -50 L 118 -100', 'white', 10);
    P.c(120, -104, 17, 'lime');
    return {};
  };
  B.house = (P) => {
    P.r(-90, -22, 180, 120, 6, 'white');
    P.r(44, -102, 28, 52, 4, 'pocket');
    P.p('M -112 -18 L 0 -112 L 112 -18 Z', 'red');
    if (!P.flat) {
      P.r(-24, 36, 48, 62, 6, 'lime');
      P.r(-76, 4, 34, 34, 4, 'lime'); P.r(42, 4, 34, 34, 4, 'lime');
    }
    return {};
  };
  B.wells = (P, o) => {
    const col = o.color || 'ink', neg = col === 'ink' ? 'paper' : 'ink';
    P.p('M -64 124 Q -64 44 -26 30 L 26 30 Q 64 44 64 124 Z', col, 0);
    P.r(-13, 6, 26, 36, 4, col, 0);
    P.e(0, -16, 33, 40, col, 0);
    P.r(-54, -66, 108, 13, 6, col, 0);
    P.r(-35, -132, 70, 72, 6, col, 0);
    if (!P.flat) {
      P.p('M -24 6 Q -11 -5 0 4 Q 11 -5 24 6 Q 11 13 0 9 Q -11 13 -24 6 Z', neg, 0);
      P.r(-35, -86, 70, 12, 0, neg, 0);
    }
    return {};
  };

  const NOSHADOW = { scale: 1 };
  // ombre portée aussi pour les parties animées (gavel) : liste des animations par picto
  function mkPicto(parent, name, o) {
    o = o || {};
    const root = g(parent);
    const fcol = o.bg === 'ink' ? '#2A2A2A' : INK;
    const sh = g(root, { transform: 'translate(7 7)' });
    const body = g(root);
    const fn = B[name] || B.chip;
    const shRefs = NOSHADOW[name] ? (sh.setAttribute('visibility', 'hidden'), {}) : (fn(ctx(sh, true, !!o.sober, fcol), o) || {});
    const refs = fn(ctx(body, false, !!o.sober), o) || {};
    return { root, body, shadow: sh, refs, shRefs, name };
  }
  ZV.PICTO = { mk: mkPicto, names: Object.keys(B), ctx };

  /* ------------------------------------------------------------------ */
  /*  Outils de mise en page                                              */
  /* ------------------------------------------------------------------ */
  const measCache = {};
  function meas(root, str, size, mono) {
    const key = str + '|' + size + '|' + (mono ? 1 : 0);
    if (measCache[key] != null) return measCache[key];
    let w = str.length * size * (mono ? 0.6 : 0.6);
    try {
      const n = text(root, str, 0, 0, size, '#000', { mono });
      const b = n.getComputedTextLength();
      root.removeChild(n);
      if (b > 0) w = b;
    } catch (e) { /* estimation */ }
    measCache[key] = w;
    return w;
  }
  function bgFill(bg) { return bg === 'paper' ? C.paper : bg === 'lime' ? C.lime : C.ink; }
  function bgNodes(root, bg) {
    rect(root, 0, 0, 1920, 1080, 0, bgFill(bg));
    const id = 'pg' + (++UID);
    const defs = sv('defs', null, root);
    const pat = sv('pattern', { id, width: 56, height: 56, patternUnits: 'userSpaceOnUse' }, defs);
    sv('circle', { cx: 28, cy: 28, r: 3.2, fill: bg === 'ink' ? C.paper : INK, opacity: bg === 'ink' ? 0.1 : 0.1 }, pat);
    rect(root, 0, 0, 1920, 1080, 0, `url(#${id})`);
  }
  const inkOn = (bg) => (bg === 'ink' ? C.paper : INK);

  // légende Mono sous un picto : une ou deux lignes, ajustée à maxW
  function makeLabel(root, str, size, maxW, fill) {
    const grp = g(root);
    if (!str) return { grp, h: 0 };
    const w1 = meas(root, str, size, true);
    const lines = [];
    if (w1 <= maxW) lines.push([str, size]);
    else {
      const words = str.split(' ');
      let best = null;
      for (let k = 1; k < words.length; k++) {
        const a = words.slice(0, k).join(' '), b = words.slice(k).join(' ');
        const m = Math.max(meas(root, a, size, true), meas(root, b, size, true));
        if (!best || m < best.m) best = { a, b, m };
      }
      if (best) { const sz = Math.min(size, size * maxW / best.m); lines.push([best.a, sz], [best.b, sz]); } else lines.push([str, size * maxW / w1]);
    }
    lines.forEach((ln, i) => text(grp, ln[0], 0, i * size * 1.15, ln[1], fill, { mono: 1, anchor: 'middle' }));
    return { grp, h: lines.length * size * 1.15 };
  }

  const popE = (p) => E.back(clamp(p));

  // entrée d'un picto : renvoie [dx, dy, scale, rot, opacity]
  function entry(style, p, slow) {
    p = clamp(p);
    if (style === 'drop') { const b = E.bounce(p); return [0, -460 * (1 - b), 1, 0, p > 0 ? 1 : 0]; }
    if (style === 'slide') { return [560 * (1 - E.out3(p)), 0, 1, 0, p > 0 ? 1 : 0]; }
    if (style === 'rise') { return [0, 420 * (1 - E.out3(p)), 1, 0, p > 0 ? 1 : 0]; }
    const s = slow ? E.out2(p) : popE(p);
    return [0, 0, s, 0, p > 0 ? 1 : 0];
  }
  const ENT_DUR = { pop: 0.34, drop: 0.62, slide: 0.45, rise: 0.5 };

  function strikeCross(root, sober, R) {
    const grp = g(root);
    const col = sober ? C.paper : C.red;
    const mk = (x1, y1, x2, y2) => {
      const o = sv('line', { x1, y1, x2: x1, y2: y1, stroke: INK, 'stroke-width': 28, 'stroke-linecap': 'round' }, grp);
      const l = sv('line', { x1, y1, x2: x1, y2: y1, stroke: col, 'stroke-width': 18, 'stroke-linecap': 'round' }, grp);
      return { o, l, x1, y1, x2, y2 };
    };
    const a = mk(-R, -R, R, R), b = mk(R, -R, -R, R);
    const set = (ln, p) => {
      const x = ln.x1 + (ln.x2 - ln.x1) * p, y = ln.y1 + (ln.y2 - ln.y1) * p;
      [ln.o, ln.l].forEach((n) => { n.setAttribute('x2', f2(x)); n.setAttribute('y2', f2(y)); });
    };
    return { grp, set: (p) => { set(a, clamp(p * 2)); set(b, clamp(p * 2 - 1)); grp.setAttribute('visibility', p > 0 ? 'visible' : 'hidden'); } };
  }

  function titleSticker(root, str, bg, y) {
    const size = 70, w = meas(root, str, size, false) + 90, h = 116;
    const fill = bg === 'paper' ? 'lime' : 'paper';
    const grp = g(root);
    const stk = ZV.sticker(grp, w, h, fill === 'lime' ? C.lime : C.paper, null, size, INK, { sh: 10 });
    text(stk, str, 0, size * 0.35, size, INK, { anchor: 'middle', len: w - 90 });
    return { grp, y: y || 150 };
  }

  /* ------------------------------------------------------------------ */
  /*  Scènes dédiées (mode `scene`), clé = noms des pictos triés          */
  /* ------------------------------------------------------------------ */
  const SC = {};
  const cueAct = (shot, name, action) => { const b = shot.beats.find((x) => x.do === 'cue' && x.name === name && (action ? x.action === action : !x.action)); return b ? b.t : null; };
  const Z0 = (v, d) => (v == null ? d : v);

  // vue depuis ta chaise : la table devant, la chaise d'en face occupée par un gros 0
  SC['table+zero-seat'] = {
    init(st) {
      const o = { bg: st.bg };
      st.seat = mkPicto(st.root, 'zero-seat', o);
      st.table = mkPicto(st.root, 'table', o);
      const w = meas(st.root, 'EN FACE DE TOI', 64, false) + 80;
      st.stk = ZV.sticker(st.root, w, 110, C.lime, null, 64, INK, { sh: 10 });
      text(st.stk, 'EN FACE DE TOI', 0, 22, 64, INK, { anchor: 'middle', len: w - 80 });
      st.ta = Z0(cueAct(st.shot, 'a'), 0); st.tb = Z0(cueAct(st.shot, 'b'), 1.5);
    },
    tick(st, t) {
      const { ta, tb } = st;
      const p = E.out3(prog(t, ta, ta + 0.5));
      put(st.table.root, 960, 690 + 420 * (1 - p), 0, 1.95, 1.95, t >= ta ? 1 : 0);
      const q = popE(prog(t, tb, tb + 0.4));
      put(st.seat.root, 960, 390, 0, 2.0 * q, 2.0 * q, t >= tb ? 1 : 0);
      const d = prog(t, tb + 0.3, tb + 0.8), zr = st.seat.refs.zero;
      zr.setAttribute('transform', `translate(0 ${f2(-330 * (1 - E.bounce(d)))})`);
      zr.setAttribute('visibility', t >= tb + 0.3 ? 'visible' : 'hidden');
      const k = popE(prog(t, tb + 0.7, tb + 1.05));
      put(st.stk, 1480, 300, 3, k, k, t >= tb + 0.7 ? 1 : 0);
    }
  };

  // drap noir sur la table, coffre qui s'ouvre, drap tiré, pancarte qui se retourne
  SC['cloth+safe+sign-open'] = {
    init(st) {
      const o = { bg: st.bg };
      st.table = mkPicto(st.root, 'table', o);
      st.cloth = mkPicto(st.root, 'cloth', o);
      st.safe = mkPicto(st.root, 'safe', o);
      st.sign = mkPicto(st.root, 'sign-open', o);
      st.l1 = makeLabel(st.root, 'DRAP NOIR', 40, 440, inkOn(st.bg));
      st.l2 = makeLabel(st.root, 'LE COFFRE', 40, 440, inkOn(st.bg));
      st.l3 = makeLabel(st.root, 'OUVERT', 40, 440, inkOn(st.bg));
      st.ta = Z0(cueAct(st.shot, 'a'), 0); st.tb = Z0(cueAct(st.shot, 'b'), 1.9);
      st.tp = Z0(cueAct(st.shot, 'a', 'pull-off'), 2.6); st.tc = Z0(cueAct(st.shot, 'c'), 3.5);
    },
    tick(st, t) {
      const { ta, tb, tp, tc } = st;
      // la table est là dès le début
      put(st.table.root, 460, 580, 0, 1.9, 1.9, 1);
      // le drap tombe puis est tiré vers la gauche
      let cx = 460, cy = 500, cr = 0;
      const fall = prog(t, ta, ta + 0.55);
      cy = 500 - 700 * (1 - E.bounce(fall));
      const pull = E.in2(prog(t, tp, tp + 0.5));
      cx = 460 - 900 * pull; cr = -26 * pull; cy -= 70 * pull;
      put(st.cloth.root, cx, cy, cr, 2.3, 2.3, t >= ta ? 1 : 0);
      put(st.l1.grp, 460, 820, 0, 1, 1, popE(prog(t, ta + 0.5, ta + 0.8)));
      // coffre
      const sb = popE(prog(t, tb, tb + 0.36));
      put(st.safe.root, 960, 560, 0, 1.85 * sb, 1.85 * sb, t >= tb ? 1 : 0);
      const open = E.io2(prog(t, tb + 0.3, tb + 0.8));
      st.safe.refs.door.setAttribute('transform', `translate(-78 0) scale(${f2(1 - 0.84 * open)} 1)`);
      put(st.l2.grp, 960, 820, 0, 1, 1, popE(prog(t, tb + 0.3, tb + 0.6)));
      // pancarte : entre en se balançant puis se retourne FERMÉ -> OUVERT
      const sp = prog(t, tc, tc + 0.5), sc = E.back(sp);
      const sway = Math.sin((t - tc) * 7) * 9 * Math.pow(1 - clamp((t - tc) / 1.4), 2);
      put(st.sign.root, 1450, 570 - 40 * (1 - E.out3(sp)), sway, 1.75 * sc, 1.75 * sc, t >= tc ? 1 : 0);
      const fl = prog(t, tc + 0.55, tc + 1.0), cs = Math.cos(fl * Math.PI);
      const pr = st.sign.refs;
      pr.pl.setAttribute('transform', `translate(0 8) scale(${f2(Math.max(Math.abs(cs), 0.001))} 1)`);
      show(pr.f1, cs > 0); show(pr.f2, cs <= 0);
      put(st.l3.grp, 1450, 820, 0, 1, 1, popE(prog(t, tc + 0.9, tc + 1.2)));
    }
  };

  // micro, bulle qui se retourne, tas de pièces
  SC['bubble+coins+mic'] = {
    init(st) {
      const o = { bg: st.bg };
      st.mic = mkPicto(st.root, 'mic', o);
      st.bub = mkPicto(st.root, 'bubble', o);
      st.hp = mkPicto(st.root, 'coins', { bg: st.bg, n: 6 });
      st.l1 = makeLabel(st.root, '« J’AI UN SYSTÈME »', 38, 520, inkOn(st.bg));
      st.l2 = makeLabel(st.root, 'PAS À LUI', 44, 460, inkOn(st.bg));
      st.ta = Z0(cueAct(st.shot, 'a'), 0); st.tb = Z0(cueAct(st.shot, 'b'), 1.3);
      st.tf = Z0(cueAct(st.shot, 'b', 'flip'), 2.6); st.tc = Z0(cueAct(st.shot, 'c'), 4.6);
    },
    tick(st, t) {
      const { ta, tb, tf, tc } = st;
      const pm = popE(prog(t, ta, ta + 0.4));
      put(st.mic.root, 400, 540, -8, 2.2 * pm, 2.2 * pm, t >= ta ? 1 : 0);
      const pb = prog(t, tb, tb + 0.5);
      const bs = E.back(pb);
      const bx = lerp(520, 980, E.out3(pb)), by = lerp(430, 460, E.out3(pb));
      const fl = prog(t, tf, tf + 0.5), cs = Math.cos(fl * Math.PI);
      put(st.bub.root, bx, by, -3, 2.3 * bs * Math.max(Math.abs(cs), 0.001), 2.3 * bs, t >= tb ? 1 : 0);
      show(st.bub.refs.front, cs > 0); show(st.bub.refs.back, cs <= 0);
      put(st.l1.grp, 980, 810, 0, popE(prog(t, tb + 0.3, tb + 0.6)), 1, 1);
      const pc = popE(prog(t, tc, tc + 0.45));
      put(st.hp.root, 1520, 540, 0, 1.85 * pc, 1.85 * pc, t >= tc ? 1 : 0);
      put(st.l2.grp, 1520, 810, 0, popE(prog(t, tc + 0.3, tc + 0.6)), 1, 1);
    }
  };

  // enveloppe des investisseurs -> pièces qui voyagent vers Wells
  SC['coins+envelope'] = {
    init(st) {
      const o = { bg: st.bg };
      st.env = mkPicto(st.root, 'envelope', o);
      st.wells = mkPicto(st.root, 'wells', { bg: st.bg });
      st.heap = mkPicto(st.root, 'coins', { bg: st.bg, n: 6 });
      st.fly = [];
      for (let k = 0; k < 6; k++) st.fly.push(mkPicto(st.root, 'chip', { bg: st.bg, color: k % 2 ? 'white' : 'lime', text: '€' }));
      st.l1 = makeLabel(st.root, 'INVESTISSEURS ANGLAIS', 36, 560, inkOn(st.bg));
      st.l2 = makeLabel(st.root, 'WELLS', 44, 360, inkOn(st.bg));
      st.ta = Z0(cueAct(st.shot, 'a'), 0);
    },
    tick(st, t) {
      const { ta } = st;
      const pe = popE(prog(t, ta, ta + 0.4));
      put(st.env.root, 460, 560, -3, 2.1 * pe, 2.1 * pe, t >= ta ? 1 : 0);
      put(st.l1.grp, 460, 810, 0, popE(prog(t, ta + 0.3, ta + 0.6)), 1, 1);
      const pw = popE(prog(t, ta + 0.5, ta + 0.95));
      put(st.wells.root, 1600, 520, 0, 1.4 * pw, 1.4 * pw, t >= ta + 0.5 ? 1 : 0);
      put(st.l2.grp, 1600, 790, 0, popE(prog(t, ta + 0.8, ta + 1.1)), 1, 1);
      let landed = 0;
      for (let k = 0; k < 6; k++) {
        const t0 = ta + 0.9 + k * 0.3, dur = 0.8, q = prog(t, t0, t0 + dur);
        const f = st.fly[k];
        if (q <= 0 || q >= 1) { put(f.root, 0, 0, 0, 0, 0, 0); if (q >= 1) landed++; continue; }
        const e = E.io2(q);
        const x = lerp(470, 1250, e), y = lerp(400, 560, e) - Math.sin(q * Math.PI) * 230;
        const sx = (Math.abs(Math.cos(q * Math.PI * 4)) * 0.8 + 0.2) * 0.6;
        put(f.root, x, y, 0, Math.max(sx, 0.02), 0.6, 1);
      }
      put(st.heap.root, 1240, 620, 0, 1.4, 1.4, landed > 0 ? 1 : 0);
      st.heap.refs.coin.forEach((c, k) => show(c, k < landed));
      st.heap.shRefs.coin.forEach((c, k) => show(c, k < landed));
    }
  };

  // marteau puis barreaux
  SC['bars+gavel'] = {
    init(st) {
      const o = { bg: st.bg };
      st.gav = mkPicto(st.root, 'gavel', o);
      st.bars = mkPicto(st.root, 'bars', o);
      st.l1 = makeLabel(st.root, 'PROCÈS', 54, 440, inkOn(st.bg));
      st.l2 = makeLabel(st.root, '8 ANS', 54, 440, inkOn(st.bg));
      st.ta = Z0(cueAct(st.shot, 'a'), 0); st.tb = Z0(cueAct(st.shot, 'b'), 2.2);
    },
    tick(st, t) {
      const { ta, tb } = st;
      const pg = popE(prog(t, ta, ta + 0.3));
      put(st.gav.root, 660, 570, 0, 2.0 * pg, 2.0 * pg, t >= ta ? 1 : 0);
      // deux coups : levé (55°) puis abattu (0°) avec petit rebond
      const hit = (t0) => { const q = prog(t, t0, t0 + 0.14); return q; };
      let ang = 58;
      const h1 = ta + 0.55, h2 = ta + 1.4;
      if (t < h1) ang = 58 - 6 * Math.sin(prog(t, ta, h1) * Math.PI);
      else if (t < h2) { const q = prog(t, h1, h1 + 0.12); const rb = prog(t, h1 + 0.12, h2 - 0.15); ang = q < 1 ? 58 * (1 - E.in2(q)) : (rb < 1 ? 26 * Math.sin(rb * Math.PI) * (1 - rb) : 0); if (rb >= 1) ang = 58 * E.out2(prog(t, h2 - 0.15, h2)); }
      else { const q = prog(t, h2, h2 + 0.12); ang = 58 * (1 - E.in2(q)); const rb = prog(t, h2 + 0.12, h2 + 0.5); if (q >= 1) ang = 14 * Math.sin(rb * Math.PI) * (1 - rb); }
      [st.gav.refs, st.gav.shRefs].forEach((r) => r && r.mallet && r.mallet.setAttribute('transform', `translate(78 14) rotate(${f2(ang)})`));
      put(st.l1.grp, 600, 822, 0, popE(prog(t, ta + 0.4, ta + 0.7)), 1, 1);
      // barreaux : tombent du haut
      const pb = prog(t, tb, tb + 0.6);
      put(st.bars.root, 1330, 530 - 760 * (1 - E.bounce(pb)), 0, 2.0, 2.0, t >= tb ? 1 : 0);
      put(st.l2.grp, 1330, 822, 0, popE(prog(t, tb + 0.4, tb + 0.7)), 1, 1);
    }
  };

  // carte d'identité dont le nom est gribouillé
  SC.idcard = {
    init(st) {
      st.card = mkPicto(st.root, 'idcard', { bg: st.bg });
      st.l1 = makeLabel(st.root, 'UN AUTRE NOM', 50, 700, inkOn(st.bg));
      const tt = cueAct(st.shot, 'title');
      st.t0 = tt == null ? 0.3 : tt + 0.4;
      st.ts = Z0(cueAct(st.shot, 'a', 'scribble-name'), st.t0 + 1);
    },
    tick(st, t) {
      const pc = popE(prog(t, st.t0, st.t0 + 0.45));
      put(st.card.root, 960, 520, -3, 3.1 * pc, 3.1 * pc, t >= st.t0 ? 1 : 0);
      const r = st.card.refs;
      const sp = prog(t, st.ts, st.ts + 0.5);
      r.scr.setAttribute('stroke-dashoffset', f2(1 - sp));
      show(r.nu, t >= st.ts + 0.6);
      const k = popE(prog(t, st.ts + 0.6, st.ts + 0.9));
      r.nu.setAttribute('transform', `translate(-14 10) scale(${f2(Math.max(k, 0.001))} 1) translate(14 -10)`);
      put(st.l1.grp, 960, 830, 0, popE(prog(t, st.ts + 0.5, st.ts + 0.8)), 1, 1);
    }
  };

  // balance : un petit poids lime marqué 0 tombe du côté de la maison
  SC['chip+scale'] = {
    init(st) {
      const o = { bg: st.bg };
      st.sc = mkPicto(st.root, 'scale', o);
      const mkStack = (pan, n, color) => {
        const arr = [];
        for (let k = 0; k < n; k++) {
          const c = g(pan, { transform: `translate(${(k - (n - 1) / 2) * 44} -16)` });
          circle(c, 0, 0, 20, color, INK, 5);
          arr.push(c);
        }
        return arr;
      };
      mkStack(st.sc.refs.L.pan, 3, C.white); mkStack(st.sc.refs.R.pan, 3, C.white);
      st.wt = mkPicto(st.root, 'chip', { bg: st.bg, color: 'lime', text: '0' });
      st.l1 = makeLabel(st.root, 'CÔTÉ MAISON', 44, 460, inkOn(st.bg));
      st.ta = Z0(cueAct(st.shot, 'a'), 0); st.tb = Z0(cueAct(st.shot, 'b'), 1.7);
    },
    tick(st, t) {
      const { ta, tb } = st;
      const S = 2.2, cx = 960, cy = 540;
      const ps = popE(prog(t, ta, ta + 0.45));
      put(st.sc.root, cx, cy, 0, S * ps, S * ps, t >= ta ? 1 : 0);
      const fallT = 0.5, q = prog(t, tb, tb + fallT);
      // tilt : ressort amorti après l'impact
      const ti = t - (tb + fallT);
      const A = ti < 0 ? 0 : 9 * (1 - Math.exp(-ti * 6) * Math.cos(ti * 14));
      st.sc.refs.set(A);
      // position du plateau droit dans le repère écran
      const ex = 124 * Math.cos(A * D2R), ey = -70 + 124 * Math.sin(A * D2R) + 96;
      const px = cx + ex * S, py = cy + ey * S;
      const wy = lerp(-380, py - 56, E.in2(q));
      const landed = t >= tb + fallT;
      const by = landed ? py - 20 * S * 0.75 - 22 * 0 : wy;
      const bob = landed ? Math.max(0, 1 - ti * 2.5) * Math.abs(Math.sin(ti * 16)) * -26 : 0;
      put(st.wt.root, px + 6, (landed ? py - 50 : wy) + bob, 0, 0.58, 0.58, t >= tb ? 1 : 0);
      put(st.l1.grp, px + 170, 800, 0, popE(prog(t, tb + 0.5, tb + 0.8)), 1, 1);
    }
  };

  // hameçon et jeton lime en appât
  SC['chip+hook'] = {
    init(st) {
      const o = { bg: st.bg };
      st.hook = mkPicto(st.root, 'hook', o);
      st.bait = mkPicto(st.root, 'chip', { bg: st.bg, color: 'lime', text: '€' });
      st.l1 = makeLabel(st.root, 'LE GAIN DE CE SOIR', 44, 640, inkOn(st.bg));
      st.ta = Z0(cueAct(st.shot, 'a'), 1.4); st.tb = Z0(cueAct(st.shot, 'b'), 3.3);
      st.ts = Z0(cueAct(st.shot, 'a', 'snap'), st.shot.dur - 1.5);
    },
    tick(st, t) {
      const { ta, tb, ts } = st;
      // l'hameçon descend du haut du cadre jusqu'à y=330 en se balançant légèrement
      const pd = E.out3(prog(t, ta, ta + 1.1));
      let hy = lerp(-120, 330, pd);
      const snapQ = prog(t, ts, ts + 0.12);
      hy -= 210 * E.out2(snapQ);
      const rec = ts + 0.12;
      if (t > rec) { const u = t - rec; hy += 54 * (1 - Math.exp(-u * 4)) * 1 - 0; hy += Math.sin(u * 22) * 10 * Math.exp(-u * 3.5); }
      const sway = t > ta ? Math.sin((t - ta) * 3.2) * 2.2 * (1 - 0.6 * snapQ) : 0;
      put(st.hook.root, 1040, hy, sway, 2.1, 2.1, t >= ta ? 1 : 0);
      // le jeton se pique à la pointe de l'hameçon
      const pb = popE(prog(t, tb, tb + 0.42));
      const rad = sway * D2R;
      const tipX = 1040 + (-84 * Math.cos(rad) - 62 * Math.sin(rad)) * 2.1, tipY = hy + (-84 * Math.sin(rad) + 62 * Math.cos(rad)) * 2.1;
      put(st.bait.root, tipX - 6, tipY + 72, sway * 1.6, 0.85 * pb, 0.85 * pb, t >= tb ? 1 : 0);
      put(st.l1.grp, 1000, 800, 0, popE(prog(t, tb + 0.35, tb + 0.7)), 1, 1);
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Mode multiply : une table devient 4, 16, 64                         */
  /* ------------------------------------------------------------------ */
  function buildMultiply(st) {
    const root = st.root;
    st.tables = [];
    const tg = g(root);
    for (let k = 0; k < 64; k++) {
      const n = g(tg);
      sv('path', { d: 'M -94 -52 L 106 -52 L 146 50 L -134 50 Z', fill: INK }, n).setAttribute('transform', 'translate(7 9)');
      sv('rect', { x: -104, y: 40, width: 24, height: 74, rx: 4, fill: C.pocket, stroke: INK, 'stroke-width': 6 }, n);
      sv('rect', { x: 80, y: 40, width: 24, height: 74, rx: 4, fill: C.pocket, stroke: INK, 'stroke-width': 6 }, n);
      sv('path', { d: 'M -100 -58 L 100 -58 L 140 44 L -140 44 Z', fill: C.red, stroke: INK, 'stroke-width': 7, 'stroke-linejoin': 'round' }, n);
      sv('rect', { x: -140, y: 44, width: 280, height: 32, rx: 5, fill: C.red, stroke: INK, 'stroke-width': 7 }, n);
      sv('path', { d: 'M -80 -44 L 80 -44 L 114 32 L -114 32 Z', fill: C.lime, stroke: INK, 'stroke-width': 6, 'stroke-linejoin': 'round' }, n);
      st.tables.push(n);
    }
    // positions finales de chaque palier (centrées dans la zone 1920x(150..820))
    const grids = [[1, 1, 1.9, 0, 0], [2, 2, 1.1, 330, 262], [4, 4, 0.7, 236, 140], [8, 8, 0.4, 150, 72]];
    st.slots = grids.map(([cols, rows, scale, pw, ph]) => {
      const arr = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        arr.push({ x: 960 + (c - (cols - 1) / 2) * pw, y: 500 + (r - (rows - 1) / 2) * ph - 28 * scale, s: scale });
      }
      return arr;
    });
    st.cnt = text(root, '× 1', 960, 168, 120, inkOn(st.bg), { anchor: 'middle' });
    st.lab = makeLabel(root, (st.shot.props.items && st.shot.props.items[0] && st.shot.props.items[0].label) || '', 46, 700, inkOn(st.bg));
    st.ta = Z0(cueAct(st.shot, 'a'), 0.4);
    st.t4 = Z0(cueAct(st.shot, 'x4'), st.ta + 1.2);
    st.t16 = Z0(cueAct(st.shot, 'x16'), st.t4 + 0.9);
    st.t64 = st.t16 + 0.42;
  }
  function tickMultiply(st, t) {
    const stage = t >= st.t64 ? 3 : t >= st.t16 ? 2 : t >= st.t4 ? 1 : 0;
    const t0s = [st.ta, st.t4, st.t16, st.t64];
    const cur = st.slots[stage], prev = stage ? st.slots[stage - 1] : null;
    const q = prog(t, t0s[stage], t0s[stage] + (stage === 0 ? 0.4 : stage === 3 ? 0.4 : 0.34));
    st.tables.forEach((n, k) => {
      if (stage === 0 && t < st.ta) { put(n, 0, 0, 0, 0, 0, 0); return; }
      if (k >= cur.length) { put(n, 0, 0, 0, 0, 0, 0); return; }
      const to = cur[k];
      if (!prev) { const s = popE(q); put(n, to.x, to.y, 0, to.s * s, to.s * s, 1); return; }
      // les tables existantes (index < prev.length) glissent vers leur nouvelle place ; les nouvelles « se dédoublent » depuis leur parente
      const parentIdx = k < prev.length ? k : k % prev.length;
      const from = prev[parentIdx];
      const e = k < prev.length ? E.io2(q) : E.out3(q);
      const x = lerp(from.x, to.x, e), y = lerp(from.y, to.y, e), s = lerp(from.s, to.s, e);
      put(n, x, y, 0, s, s, 1);
    });
    const num = [1, 4, 16, 64][stage];
    const bump = 1 + 0.12 * Math.sin(clamp(q) * Math.PI);
    st.cnt.textContent = '× ' + num;
    st.cnt.setAttribute('transform', `translate(0 0)`);
    st.cnt.setAttribute('visibility', t >= st.ta ? 'visible' : 'hidden');
    const lp = stage === 0 ? popE(prog(t, st.ta + 0.3, st.ta + 0.6)) : 0;
    put(st.lab.grp, 960, 740, 0, lp, lp, lp);
  }

  /* ------------------------------------------------------------------ */
  /*  Définition                                                         */
  /* ------------------------------------------------------------------ */
  // caisse qui se vide : les pièces sautent de la caisse et tombent
  function cashboxTick(I, u) {
    const r = I.node.refs; if (!r.coins) return;
    const t0 = 0.5, per = 0.28;
    r.coins.forEach((cn, k) => {
      const s = t0 + k * per, q = (u - s) / 0.95;
      if (q < 0 || q > 1) { cn.setAttribute('visibility', 'hidden'); return; }
      const dir = k % 2 ? 1 : -1;
      const x = -60 + k * 30 + dir * q * 70, y = -40 - 210 * q + 330 * q * q, sh = 1 - prog(q, 0.78, 1);
      cn.setAttribute('transform', `translate(${f2(x)} ${f2(y)}) scale(${f2((Math.abs(Math.cos(q * 9)) * 0.7 + 0.3) * sh)} ${f2(sh)})`);
      cn.setAttribute('visibility', 'visible');
    });
    r.stack.forEach((s, k) => show(s, u < t0 + k * per));
  }

  ZV.define('pictos', {
    init(root, shot) {
      const pr = shot.props || {};
      const bg = pr.bg || 'ink';
      const st = { root, shot, bg, mode: pr.mode || 'row', sober: shot.id === 's1-17' };
      bgNodes(root, bg);
      const layer = g(root);
      st.root = layer;
      const items = (pr.items || []).slice();
      st.title = pr.title ? titleSticker(layer, pr.title, bg, 150) : null;
      st.tTitle = ZV.cue(shot, 'title');
      if (st.title && st.tTitle == null) st.tTitle = 0.1;
      st.fx = {};
      if (st.mode === 'multiply') { buildMultiply(st); return st; }
      const key = items.map((i) => i.picto).sort().join('+');
      if (st.mode === 'scene' && SC[key]) {
        st.scene = SC[key];
        st.scene.init(st);
        return st;
      }
      // mise en page « rangée »
      const n = Math.max(1, Math.min(items.length, 4));
      const sc = [2.2, 2.2, 1.95, 1.7, 1.4][n];
      const sp = [0, 600, 600, 540, 440][n];
      const cy = pr.title ? 480 : 450;
      const lsz = n <= 2 ? 48 : n === 3 ? 42 : 34;
      st.items = items.slice(0, 4).map((it, i) => {
        const node = mkPicto(layer, it.picto, { bg, sober: st.sober, color: it.picto === 'mound' ? (bg === 'ink' ? 'paper' : 'ink') : undefined });
        const x = 960 + (i - (n - 1) / 2) * sp;
        const style = st.sober ? 'pop' : ['pop', 'drop', 'slide', 'pop'][i];
        const t0 = Z0(ZV.cue(shot, it.cue), 0);
        const lab = makeLabel(layer, it.label || '', lsz, sp - 40, inkOn(bg));
        const R = 82;
        const cross = strikeCross(layer, st.sober, R);
        let ts = ZV.cue(shot, 'strike-' + it.cue);
        if (ts == null) ts = ZV.cue(shot, 'strike-all');
        return { it, node, x, y: cy, s: sc, style, t0, lab, labY: cy + 120 * sc + 54, cross, ts, name: it.picto };
      });
      return st;
    },
    update(st, t, shot) {
      try {
        if (st.title) {
          const q = popE(prog(t, st.tTitle, st.tTitle + 0.36));
          put(st.title.grp, 960, st.title.y, -2, q, q, t >= st.tTitle ? 1 : 0);
        }
        if (st.mode === 'multiply') { tickMultiply(st, t); return; }
        if (st.scene) { st.scene.tick(st, t); return; }
        const slow = st.sober ? 1.8 : 1;
        for (const I of st.items) {
          const dur = (ENT_DUR[I.style] || 0.34) * slow;
          const p = prog(t, I.t0, I.t0 + dur);
          const e = entry(I.style, p, st.sober);
          const vis = t >= I.t0 ? 1 : 0;
          let extra = 0, sx = 1;
          if (I.name === 'heart') { sx = 1 + 0.05 * Math.sin((t - I.t0) * (st.sober ? 3 : 5)) * clamp(p * 3); }
          if (I.name === 'cashbox') cashboxTick(I, t - I.t0);
          if (I.name === 'eye') { const k = I.node.refs.iris; if (k) k.setAttribute('transform', `translate(${f2(Math.sin(t * 1.7) * 14)} ${f2(Math.cos(t * 1.1) * 4)})`); }
          const wob = I.style === 'pop' ? 0 : (1 - E.out2(p)) * 4;
          put(I.node.root, I.x + e[0], I.y + e[1], e[3] + wob, I.s * e[2] * sx, I.s * e[2] * sx, vis * e[4]);
          const lp = popE(prog(t, I.t0 + dur * 0.8, I.t0 + dur * 0.8 + 0.3));
          put(I.lab.grp, I.x, I.labY, 0, lp, lp, vis);
          const sp = I.ts == null ? 0 : prog(t, I.ts, I.ts + 0.2);
          I.cross.set(sp);
          put(I.cross.grp, I.x, I.y, 0, I.s / 1.0 * 1, I.s * 1, sp > 0 ? 1 : 0);
          I.cross.grp.setAttribute('visibility', sp > 0 ? 'visible' : 'hidden');
        }
      } catch (e) { if (window.ZV_DEBUG) console.error(e); }
    }
  });
})();
