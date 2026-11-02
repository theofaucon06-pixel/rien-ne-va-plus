// ZÉRO VERT — motion design de l'épisode 1.
// Six scènes (SVG + un canvas), pilotées par une horloge unique : chaque scène est une fonction pure du temps
// `render(t)`. Ça permet de mettre en pause (onglet caché, scène hors écran), de rejouer, ou de figer l'image finale
// (prefers-reduced-motion) sans état caché. Aucune dépendance. Expose window.ZVStage = { show, ids, ... }.
(() => {
  'use strict';

  const IDS = ['wheel', 'wells', 'pockets', 'average', 'streak', 'outro'];
  const LABELS = { wheel: 'la roulette', wells: '1891', pockets: 'les 37 cases', average: 'la moyenne', streak: 'la série', outro: 'le zéro' };
  const W = 1600, H = 900;
  const C = { ink: '#0A0A0A', lime: '#C8FF2E', paper: '#F3F0E8', red: '#FF4A36', white: '#FFFFFF', pocket: '#161616' };
  const NS = 'http://www.w3.org/2000/svg';
  const D2R = Math.PI / 180;
  const ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
  const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

  /* ------------------------------------------------------------------ petits outils */
  const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  const prog = (t, a, b) => clamp((t - a) / (b - a));
  const lerp = (a, b, p) => a + (b - a) * p;
  const f = (n) => Math.round(n * 100) / 100;
  const E = {
    lin: (p) => p,
    in2: (p) => p * p,
    in3: (p) => p * p * p,
    out2: (p) => 1 - (1 - p) * (1 - p),
    out3: (p) => 1 - Math.pow(1 - p, 3),
    io3: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
    back: (p) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); },
    bounce: (p) => {
      const n = 7.5625, d = 2.75;
      if (p < 1 / d) return n * p * p;
      if (p < 2 / d) { p -= 1.5 / d; return n * p * p + 0.75; }
      if (p < 2.5 / d) { p -= 2.25 / d; return n * p * p + 0.9375; }
      p -= 2.625 / d; return n * p * p + 0.984375;
    }
  };
  function mulberry32(a) {
    return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const fr = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); // 1 000 000

  function sv(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  const g = (parent, attrs) => sv('g', attrs, parent);
  function mkSvg() {
    return sv('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'xMidYMid slice', class: 'zv-scene', focusable: 'false' });
  }
  function rect(parent, x, y, w, h, rx, fill, stroke, sw, extra) {
    const n = sv('rect', { x, y, width: w, height: h, rx: rx || 0, fill: fill || 'none' }, parent);
    if (stroke) { n.setAttribute('stroke', stroke); n.setAttribute('stroke-width', sw || 6); n.setAttribute('stroke-linejoin', 'round'); }
    if (extra) for (const k in extra) n.setAttribute(k, extra[k]);
    return n;
  }
  function circle(parent, cx, cy, r, fill, stroke, sw) {
    const n = sv('circle', { cx, cy, r, fill: fill || 'none' }, parent);
    if (stroke) { n.setAttribute('stroke', stroke); n.setAttribute('stroke-width', sw || 6); }
    return n;
  }
  // texte : mono => JetBrains Mono, sinon Bricolage. len => largeur imposée (indépendante de la police de secours)
  function tx(parent, str, x, y, size, fill, o) {
    o = o || {};
    const n = sv('text', { x, y, 'font-size': size, fill, class: o.mono ? 'zv-m' : 'zv-h' }, parent);
    if (o.anchor) n.setAttribute('text-anchor', o.anchor);
    if (o.len) { n.setAttribute('textLength', o.len); n.setAttribute('lengthAdjust', 'spacingAndGlyphs'); }
    n.textContent = str;
    return n;
  }
  // position / rotation / échelle / opacité d'un groupe dont la géométrie est centrée sur (0,0)
  function put(n, x, y, r, sx, sy, o) {
    if (r === undefined) r = 0;
    if (sx === undefined) sx = 1;
    if (sy === undefined) sy = sx;
    if (o === undefined) o = 1;
    n.setAttribute('transform', `translate(${f(x)} ${f(y)}) rotate(${f(r)}) scale(${f(sx || 0.0001)} ${f(sy || 0.0001)})`);
    n.setAttribute('opacity', f(o));
    n.setAttribute('visibility', o <= 0.001 || !sx || !sy ? 'hidden' : 'visible');
  }
  const wedge = (a0, a1, r1, r2) => {
    const p = (a, r) => [f(r * Math.sin(a * D2R)), f(-r * Math.cos(a * D2R))];
    const [x1, y1] = p(a0, r2), [x2, y2] = p(a1, r2), [x3, y3] = p(a1, r1), [x4, y4] = p(a0, r1);
    return `M${x1} ${y1}A${r2} ${r2} 0 0 1 ${x2} ${y2}L${x3} ${y3}A${r1} ${r1} 0 0 0 ${x4} ${y4}Z`;
  };
  // tremblement d'écran : amortissement rapide, déterministe
  function shakeAt(t, t0, amp, dur) {
    dur = dur || 0.4;
    const p = (t - t0) / dur;
    if (p < 0 || p > 1) return [0, 0];
    const a = amp * (1 - p) * (1 - p);
    return [a * Math.sin(p * 62), a * Math.cos(p * 47)];
  }
  const shakeSum = (t, list) => list.reduce((s, [t0, amp]) => { const [x, y] = shakeAt(t, t0, amp); return [s[0] + x, s[1] + y]; }, [0, 0]);

  /* ------------------------------------------------------------------ scène : wheel */
  function sceneWheel() {
    const dur = 9;
    const svg = mkSvg();
    rect(svg, 0, 0, W, H, 0, C.ink);
    const shake = g(svg);
    const gw = g(shake); // la roulette, centrée sur (0,0) puis posée en (800,450)
    circle(gw, 0, 0, 300, C.paper);
    circle(gw, 0, 0, 278, C.pocket, C.ink, 4);
    for (let i = 0; i < 8; i++) { const a = i * 45 * D2R; circle(gw, 289 * Math.sin(a), -289 * Math.cos(a), 6, C.ink); }
    const rot = g(gw);
    const step = 360 / 37;
    ORDER.forEach((n, k) => {
      const col = n === 0 ? C.lime : RED.has(n) ? C.red : C.pocket;
      const gp = g(rot, { transform: `rotate(${f(k * step)})` });
      sv('path', { d: wedge(-step / 2, step / 2, 170, 250), fill: col, stroke: C.paper, 'stroke-width': 3, 'stroke-linejoin': 'round' }, gp);
      tx(gp, String(n), 0, -224, 25, n === 0 || RED.has(n) ? C.ink : C.white, { mono: 1, anchor: 'middle' }).setAttribute('font-weight', 800);
    });
    circle(rot, 0, 0, 170, C.pocket, C.paper, 4);
    circle(rot, 0, 0, 118, C.ink, C.paper, 5);
    for (let i = 0; i < 4; i++) sv('line', { x1: 0, y1: -100, x2: 0, y2: 100, stroke: C.paper, 'stroke-width': 16, 'stroke-linecap': 'round', transform: `rotate(${i * 45})` }, rot);
    circle(rot, 0, 0, 34, C.paper, C.ink, 6);
    const dim = circle(gw, 0, 0, 300, C.ink); // voile plat sur la roue quand la poche gagnante se détache
    const win = g(gw, { transform: 'rotate(90)' });
    const winPop = g(win);
    const WIN = 23, wk = ORDER.indexOf(WIN), phi = wk * step;
    sv('path', { d: wedge(-step / 2, step / 2, 170, 250), fill: C.red, stroke: C.white, 'stroke-width': 4, 'stroke-linejoin': 'round' }, winPop);
    tx(winPop, String(WIN), 0, -224, 25, C.ink, { mono: 1, anchor: 'middle' }).setAttribute('font-weight', 800);
    const ball = g(gw);
    circle(ball, 0, 0, 15, C.white, C.ink, 4);

    // la roue s'arrête (t = 7) avec la poche gagnante à 3 h
    const T_STOP = 7, T_LAUNCH = 1.0, T_LAND = 5.6, T_POP = 7.0;
    const thF = 540 + ((((90 - phi - 540) % 360) + 360) % 360);
    const wheelAngle = (t) => thF * (1 - Math.pow(1 - prog(t, 0, T_STOP), 2.2));
    const landAngle = phi + wheelAngle(T_LAND);
    const D_BALL = 1620;

    const stamp = g(svg);
    rect(stamp, -478, -78, 980, 180, 20, C.paper);
    rect(stamp, -490, -90, 980, 180, 20, C.red, C.ink, 9);
    tx(stamp, 'RIEN NE VA PLUS', 0, 33, 100, C.ink, { anchor: 'middle', len: 880 });

    const sticker = g(svg);
    const stk = g(sticker);
    rect(stk, -156, -140, 340, 300, 26, C.lime);
    rect(stk, -170, -154, 340, 300, 26, C.paper, C.ink, 8);
    tx(stk, String(WIN), 0, 30, 190, C.ink, { anchor: 'middle' });
    rect(stk, -108, 62, 216, 62, 31, C.red, C.ink, 6);
    tx(stk, 'ROUGE', 0, 106, 40, C.ink, { mono: 1, anchor: 'middle' }).setAttribute('font-weight', 800);

    return {
      id: 'wheel', dur, el: svg,
      render(t) {
        const [sx, sy] = shakeSum(t, [[1.0, 14], [T_POP + 0.05, 8]]);
        shake.setAttribute('transform', `translate(${f(sx)} ${f(sy)})`);
        const pin = E.out3(prog(t, 0, 0.7));
        put(gw, 800 - 100 * E.io3(prog(t, 6.5, 7.1)), 445, -30 * (1 - pin), 0.95 * (0.6 + 0.4 * pin), 0.95 * (0.6 + 0.4 * pin), pin);
        const th = wheelAngle(t);
        rot.setAttribute('transform', `rotate(${f(th)})`);

        // la bille
        let a = 0, r = 264, bs = 1, bo = 1;
        if (t < T_LAUNCH) bo = 0;
        else if (t < T_LAND) {
          const p = (t - T_LAUNCH) / (T_LAND - T_LAUNCH);
          a = landAngle + D_BALL * Math.pow(1 - p, 2);
          r = p < 0.72 ? 264 : 264 - 54 * E.bounce((p - 0.72) / 0.28);
          bs = 0.4 + 0.6 * E.out3(prog(t, T_LAUNCH, T_LAUNCH + 0.2));
        } else { a = phi + th; r = 210; }
        const pp = E.back(prog(t, T_POP, T_POP + 0.5));
        const popD = 70 * pp, popS = 1 + 1.5 * pp;
        if (t >= T_POP) { r = 210 + popD; bs = 1 + 0.7 * pp; }
        put(ball, r * Math.sin(a * D2R), -r * Math.cos(a * D2R), 0, bs, bs, bo);

        // le tampon
        const ps = E.out3(prog(t, 1.0, 1.16));
        const exit = E.in3(prog(t, 2.9, 3.25));
        if (t < 1.0) put(stamp, 800, 445, 0, 1, 1, 0);
        else put(stamp, 800 + 260 * exit, 445 - 360 * exit, lerp(-24, -8, ps) - 24 * exit, lerp(2.6, 1, ps) * (1 - exit * 0.5), lerp(2.6, 1, ps) * (1 - exit * 0.5), 1 - exit);

        // la poche gagnante se détache
        dim.setAttribute('opacity', f(0.62 * prog(t, T_POP - 0.1, T_POP + 0.35)));
        win.setAttribute('visibility', t >= T_POP ? 'visible' : 'hidden');
        winPop.setAttribute('transform', `translate(0 ${f(-(210 + popD))}) scale(${f(popS)}) translate(0 210)`);
        const sp = E.back(prog(t, 7.35, 7.9));
        put(sticker, 1385, 445, 4 + (1 - sp) * 12, sp, sp, clamp(sp * 4));
      }
    };
  }

  /* ------------------------------------------------------------------ scène : wells (1891) */
  function sceneWells() {
    const dur = 8.5;
    const svg = mkSvg();
    rect(svg, 0, 0, W, H, 0, C.ink);
    const shake = g(svg);
    // le « décor » : deux moitiés de papier séparées par une déchirure en dents de scie
    const zig = [];
    for (let i = 0; i <= 15; i++) zig.push([f(905 - 0.2 * i * 60 + (i % 2 ? 26 : -26)), i * 60]);
    const left = g(shake), right = g(shake);
    sv('polygon', { points: [[-40, -40], ...zig.map((p, i) => (i === 0 ? [p[0], -40] : p)), [zig[15][0], 940], [-40, 940]].map((p) => p.join(',')).join(' '), fill: C.paper }, left);
    sv('polygon', { points: [[1640, -40], [zig[0][0], -40], ...zig, [zig[15][0], 940], [1640, 940]].map((p) => p.join(',')).join(' '), fill: C.paper }, right);
    circle(left, 150, 790, 230, C.lime);
    circle(right, 1490, 100, 210, C.lime);

    const card = g(shake);
    rect(card, -606, -201, 1240, 430, 30, C.ink);
    rect(card, -620, -215, 1240, 430, 30, C.white, C.ink, 8);
    const hl = rect(card, -575, -70, 1150, 172, 22, C.lime);
    const counter = tx(card, '0 F', 0, 62, 160, C.ink, { mono: 1, anchor: 'middle' });
    counter.setAttribute('font-weight', 800);
    const chip = g(card, { transform: 'translate(-585 -226) rotate(-2)' });
    rect(chip, 0, -40, 560, 80, 16, C.lime, C.ink, 6);
    tx(chip, 'MONTE-CARLO · 1891', 28, 14, 40, C.ink, { mono: 1 }).setAttribute('font-weight', 800);

    const banner = g(shake);
    rect(banner, -708, -58, 1440, 140, 10, C.ink);
    rect(banner, -720, -70, 1440, 140, 10, C.red, C.ink, 8);
    tx(banner, 'A FAIT SAUTER LA BANQUE', 0, 28, 88, C.ink, { anchor: 'middle', len: 1260 });

    const stop = g(shake);
    rect(stop, -488, -88, 1000, 200, 14, C.paper);
    rect(stop, -500, -100, 1000, 200, 14, C.red, C.ink, 9);
    tx(stop, 'ARRÊTÉ', 0, 56, 188, C.ink, { anchor: 'middle', len: 740 });

    return {
      id: 'wells', dur, el: svg,
      render(t) {
        const [sx, sy] = shakeSum(t, [[4.2, 14], [5.4, 7], [5.9, 16]]);
        shake.setAttribute('transform', `translate(${f(sx)} ${f(sy)})`);

        // compteur : 0 -> 1 000 000 F qui accélère, puis retombe à 0
        const up = Math.pow(prog(t, 0.9, 4.0), 2.1);
        const down = E.io3(prog(t, 6.15, 7.2));
        const v = t < 6.0 ? 1e6 * up : 1e6 * (1 - down);
        counter.textContent = fr(v) + ' F';
        counter.setAttribute('fill', t >= 6.0 ? C.red : C.ink);
        hl.setAttribute('opacity', t >= 4.0 && t < 6.0 ? 1 : 0);
        chip.setAttribute('opacity', t < 5.95 ? 1 : 0);
        const pin = E.back(prog(t, 0.15, 0.85));
        put(card, 800, 488 + (1 - pin) * 120, -3 - (1 - pin) * 10, 0.55 + 0.45 * pin, 0.55 + 0.45 * pin, clamp(pin * 3));

        // bannière : claque, puis part avant la déchirure
        const bp = E.out3(prog(t, 4.2, 4.4)), bx = E.in3(prog(t, 5.5, 5.85));
        if (t < 4.2) put(banner, 800, 600, 4, 1, 1, 0);
        else put(banner, 800 + 2300 * bx, 600, lerp(14, 4, bp) + 8 * bx, lerp(2.4, 1, bp), lerp(2.4, 1, bp), 1);

        // déchirure
        const tp = E.out3(prog(t, 5.5, 6.25));
        left.setAttribute('transform', `translate(${f(-700 * tp)} 0) rotate(${f(-3 * tp)} 800 450)`);
        right.setAttribute('transform', `translate(${f(700 * tp)} 0) rotate(${f(3 * tp)} 800 450)`);

        // ARRÊTÉ
        const sp = E.out3(prog(t, 5.95, 6.15));
        if (t < 5.95) put(stop, 800, 300, -6, 1, 1, 0);
        else put(stop, 800, 300, lerp(-16, -6, sp), lerp(3, 1, sp), lerp(3, 1, sp), 1);
      }
    };
  }

  /* ------------------------------------------------------------------ scène : pockets */
  function scenePockets() {
    const dur = 9.5;
    const svg = mkSvg();
    rect(svg, 0, 0, W, H, 0, C.ink);

    // phase A : 36 + 1
    const gridG = g(svg);
    const cells = [];
    ORDER.slice(1).forEach((n, i) => {
      const x = 175 + (i % 9) * 118, y = 300 + Math.floor(i / 9) * 114;
      const red = RED.has(n);
      const gc = g(gridG, { transform: `translate(${x} ${y})` });
      sv('circle', { r: 46, fill: 'none', stroke: C.paper, 'stroke-width': 4, 'stroke-dasharray': '8 10', opacity: 0.55 }, gc);
      const fill = g(gc);
      circle(fill, 0, 0, 43, red ? C.red : C.pocket, C.paper, 6);
      tx(fill, String(n), 0, 12, 34, red ? C.ink : C.white, { mono: 1, anchor: 'middle' }).setAttribute('font-weight', 800);
      cells.push({ x, y, fill });
    });
    const lab36 = tx(gridG, '36 CASES', 175 - 46, 236, 46, C.paper, { mono: 1 });
    lab36.setAttribute('font-weight', 800);
    const zeroG = g(svg);
    const zRing = sv('circle', { r: 140, fill: 'none', stroke: C.lime, 'stroke-width': 10 }, zeroG);
    const zRing2 = sv('circle', { r: 140, fill: 'none', stroke: C.lime, 'stroke-width': 10 }, zeroG);
    const zBody = g(zeroG);
    circle(zBody, 0, 0, 140, C.lime);
    tx(zBody, '0', 0, 76, 232, C.ink, { anchor: 'middle' });
    const lab1 = tx(svg, '+ 1 CASE', 1385, 236, 46, C.lime, { mono: 1, anchor: 'middle' });
    lab1.setAttribute('font-weight', 800);

    // phase B : la pièce de 1 € devient une barre
    const gc = g(svg);
    const bar = rect(gc, -170, -170, 340, 340, 170, C.white, C.ink, 8);
    const coinInner = g(gc);
    circle(coinInner, 0, 0, 138, 'none', C.ink, 6);
    tx(coinInner, '1 €', 0, 52, 150, C.ink, { anchor: 'middle' });
    const lbl100 = tx(gc, '1 € = 100 ¢', -650, -128, 52, C.paper, { mono: 1 });
    lbl100.setAttribute('font-weight', 800);
    const lbl97 = tx(gc, '97,3 ¢', -17, 52, 150, C.ink, { anchor: 'middle', len: 520 });
    const lime = g(gc);
    rect(lime, -17.5, -95, 35, 190, 4, C.lime, C.ink, 6);
    const stk = g(svg);
    sv('polygon', { points: '60,60 150,60 112,104', fill: C.lime, stroke: C.ink, 'stroke-width': 6, 'stroke-linejoin': 'round' }, stk);
    rect(stk, -190, -65, 380, 130, 26, C.lime, C.ink, 7);
    tx(stk, '2,7 ¢', 0, 40, 110, C.ink, { anchor: 'middle', len: 300 });
    const marge = tx(svg, 'le zéro = la marge', 800, 672, 96, C.lime, { anchor: 'middle', len: 940 });

    return {
      id: 'pockets', dur, el: svg,
      render(t) {
        // phase A
        const exitA = (i) => E.in2(prog(t, 4.6 + i * 0.008, 4.95 + i * 0.008));
        cells.forEach((c, i) => {
          const s = E.back(prog(t, 0.8 + i * 0.075, 1.05 + i * 0.075));
          const s2 = 1 - exitA(i);
          put(c.fill, 0, 0, 0, Math.max(0, s) * s2, Math.max(0, s) * s2, 1);
        });
        const aVis = t < 5.0 ? 1 : 0;
        gridG.setAttribute('visibility', aVis ? 'visible' : 'hidden');
        lab36.setAttribute('opacity', prog(t, 3.3, 3.5) * (1 - prog(t, 4.6, 4.8)));
        const zin = E.back(prog(t, 3.4, 3.95)), zout = E.in2(prog(t, 4.7, 5.0));
        const pulse = 1 + 0.06 * Math.sin(t * 9) * prog(t, 3.9, 4.3);
        put(zeroG, 1385, 470, 0, zin * (1 - zout) * pulse, zin * (1 - zout) * pulse, 1);
        const rp = ((t - 3.9) % 0.9) / 0.9;
        const rOn = t > 3.9 && t < 4.7;
        zRing.setAttribute('r', f(140 * (1 + 0.45 * rp)));
        zRing.setAttribute('opacity', rOn ? f(1 - rp) : 0);
        const rp2 = ((t - 3.9 + 0.45) % 0.9) / 0.9;
        zRing2.setAttribute('r', f(140 * (1 + 0.45 * rp2)));
        zRing2.setAttribute('opacity', rOn && t > 4.35 ? f(1 - rp2) : 0);
        lab1.setAttribute('opacity', prog(t, 3.9, 4.1) * (1 - prog(t, 4.6, 4.8)));

        // phase B
        const ci = E.back(prog(t, 5.1, 5.65));
        put(gc, 800, 450, (1 - ci) * -25, ci, ci, clamp(ci * 4));
        const m = E.io3(prog(t, 5.95, 6.65));
        const w = lerp(340, 1300, m), h = lerp(340, 190, m), rx = lerp(170, 26, m);
        bar.setAttribute('x', f(-w / 2)); bar.setAttribute('y', f(-h / 2));
        bar.setAttribute('width', f(w)); bar.setAttribute('height', f(h)); bar.setAttribute('rx', f(rx));
        put(coinInner, 0, 0, 0, 1, 1, 1 - prog(t, 5.9, 6.2));
        lbl100.setAttribute('opacity', prog(t, 6.5, 6.7));
        const p97 = E.back(prog(t, 6.5, 6.95));
        lbl97.setAttribute('opacity', clamp(p97 * 3));
        lbl97.setAttribute('transform', `translate(0 ${f((1 - p97) * 40)})`);
        const gl = E.back(prog(t, 7.2, 7.9));
        const wl = clamp(gl, 0, 1.2);
        put(lime, 650 - 17.5, 0, 0, wl, 1 + 0.4 * wl, clamp(gl * 5));
        const sp = E.back(prog(t, 7.7, 8.3));
        put(stk, 1318, 250, 3 + (1 - sp) * 10, sp, sp, clamp(sp * 4));
        const mp = E.out3(prog(t, 8.3, 8.8));
        marge.setAttribute('opacity', f(mp));
        marge.setAttribute('transform', `translate(0 ${f((1 - mp) * 40)})`);
      }
    };
  }

  /* ------------------------------------------------------------------ scène : average (canvas) */
  function sceneAverage() {
    const dur = 9;
    const cv = document.createElement('canvas');
    cv.className = 'zv-scene';
    const ctx = cv.getContext('2d');
    const R = 300, NP = 70, rnd = mulberry32(1891);
    const paths = [];
    for (let i = 0; i < NP; i++) {
      const a = new Float32Array(R + 1); let v = 100; a[0] = v;
      for (let k = 1; k <= R; k++) { v += rnd() < 18 / 37 ? 1 : -1; a[k] = v; }
      paths.push(a);
    }
    const winners = paths.filter((a) => a[R] > 100), losers = paths.filter((a) => a[R] <= 100);
    const X0 = 150, X1 = 1500;
    const px = (k) => X0 + (X1 - X0) * (k / R);
    const py = (v) => 700 - (v - 45) * (510 / 110);
    let cw = 0, ch = 0, dpr = 1, last = 0;

    function resize() {
      const r = cv.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(2, Math.round(r.width * dpr)), h = Math.max(2, Math.round(r.height * dpr));
      if (w !== cw || h !== ch) { cw = cv.width = w; ch = cv.height = h; return true; }
      return false;
    }
    function pill(text, x, y, size, bg, fg, rot, pop, mono) {
      if (pop <= 0) return;
      ctx.save();
      ctx.font = `800 ${size}px ${mono ? '"JetBrains Mono"' : '"Bricolage Grotesque"'}, system-ui, sans-serif`;
      const w = ctx.measureText(text).width + 56, h = size * 1.45;
      ctx.translate(x, y); ctx.rotate(rot * D2R); ctx.scale(pop, pop);
      ctx.fillStyle = C.ink; ctx.beginPath(); ctx.roundRect(8, 8, w, h, 18); ctx.fill();
      ctx.fillStyle = bg; ctx.strokeStyle = C.ink; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.roundRect(0, 0, w, h, 18); ctx.fill(); ctx.stroke();
      ctx.fillStyle = fg; ctx.textBaseline = 'alphabetic'; ctx.fillText(text, 28, h * 0.5 + size * 0.34);
      ctx.restore();
    }
    function trace(list, n) {
      ctx.beginPath();
      const whole = Math.floor(n), part = n - whole;
      for (const a of list) {
        ctx.moveTo(px(0), py(a[0]));
        for (let k = 1; k <= whole; k++) ctx.lineTo(px(k), py(a[k]));
        if (whole < R && part > 0) ctx.lineTo(px(whole + part), py(a[whole] + (a[whole + 1] - a[whole]) * part));
      }
    }
    function draw(t) {
      if (!cw) return;
      const s = Math.max(cw / W, ch / H);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = C.ink; ctx.fillRect(0, 0, cw, ch);
      ctx.setTransform(s, 0, 0, s, (cw - W * s) / 2, (ch - H * s) / 2);
      try { ctx.letterSpacing = '-0.5px'; } catch (e) { /* ancien navigateur */ }
      const minLw = (1.25 * dpr) / s; // une ligne « fine » reste visible sur mobile
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';

      // ligne de départ
      const ap = E.out3(prog(t, 0.1, 0.7));
      ctx.save();
      ctx.globalAlpha = 0.7 * ap; ctx.strokeStyle = C.paper; ctx.lineWidth = Math.max(5, minLw * 1.5); ctx.setLineDash([24, 18]);
      ctx.beginPath(); ctx.moveTo(X0, py(100)); ctx.lineTo(X0 + (X1 - X0) * ap, py(100)); ctx.stroke();
      ctx.restore();

      // les ~70 parties
      const n = R * E.io3(prog(t, 0.7, 5.6));
      const col = E.out2(prog(t, 5.6, 6.3));
      ctx.save();
      ctx.beginPath(); ctx.rect(X0 - 10, 150, X1 - X0 + 20, 560); ctx.clip();
      if (n > 0) {
        ctx.globalAlpha = 0.78 * (1 - col); ctx.strokeStyle = C.white; ctx.lineWidth = Math.max(2.6, minLw);
        trace(paths, n); ctx.stroke();
        if (col > 0) {
          ctx.globalAlpha = col * 0.95; ctx.strokeStyle = C.red; ctx.lineWidth = Math.max(3, minLw * 1.35);
          trace(losers, n); ctx.stroke();
          ctx.globalAlpha = col; ctx.strokeStyle = C.lime; ctx.lineWidth = Math.max(3.4, minLw * 1.45);
          trace(winners, n); ctx.stroke();
        }
      }
      ctx.restore();
      ctx.globalAlpha = 1;
      if (col > 0.6) { // bout de chaque courbe
        for (const a of paths) {
          ctx.fillStyle = a[R] > 100 ? C.lime : C.red;
          ctx.beginPath(); ctx.arc(px(R), py(a[R]), Math.max(6, minLw * 2.4), 0, 6.283); ctx.fill();
        }
      }

      // la moyenne : 100 - 0,027 × tours
      const mp = E.io3(prog(t, 6.5, 8.2));
      if (mp > 0) {
        const kEnd = R * mp;
        ctx.beginPath(); ctx.moveTo(px(0), py(100));
        for (let k = 1; k <= Math.floor(kEnd); k++) ctx.lineTo(px(k), py(100 - 0.027 * k));
        ctx.lineTo(px(kEnd), py(100 - 0.027 * kEnd));
        ctx.strokeStyle = C.ink; ctx.lineWidth = 34; ctx.stroke();
        ctx.strokeStyle = C.white; ctx.lineWidth = 17; ctx.stroke();
        ctx.fillStyle = C.white; ctx.beginPath(); ctx.arc(px(kEnd), py(100 - 0.027 * kEnd), 17, 0, 6.283); ctx.fill();
        ctx.lineWidth = 6; ctx.strokeStyle = C.ink; ctx.stroke();
        pill('MOYENNE −2,7 %', px(R) - 640, py(100 - 0.027 * R) + 62, 52, C.white, C.ink, 0, E.back(prog(t, 7.5, 8.0)), true);
      }

      // repère de départ, par-dessus les courbes
      if (ap > 0.95) {
        ctx.font = '800 40px "JetBrains Mono", monospace';
        const lw = ctx.measureText('MISE DE DÉPART').width;
        ctx.fillStyle = C.ink; ctx.fillRect(X0 - 4, py(100) + 14, lw + 24, 54);
        ctx.fillStyle = C.paper; ctx.fillText('MISE DE DÉPART', X0 + 8, py(100) + 54);
      }

      // textes
      const a1 = E.back(prog(t, 2.4, 2.9)) * (1 - E.in2(prog(t, 6.1, 6.4)));
      pill('certains gagnent ce soir', X0 + 6, 200, 62, C.lime, C.ink, -2, a1);
      const a2 = E.back(prog(t, 6.55, 7.1));
      pill('la moyenne, non.', X0 + 6, 200, 62, C.red, C.ink, -2, a2);
    }
    return {
      id: 'average', dur, el: cv,
      render(t) { last = t; if (!cw) resize(); draw(t); },
      resize() { if (resize()) draw(last); }
    };
  }

  /* ------------------------------------------------------------------ scène : streak */
  function sceneStreak() {
    const dur = 10;
    const svg = mkSvg();
    rect(svg, 0, 0, W, H, 0, C.ink);
    const N = 26;
    const tf = (i) => 0.9 + 5.0 * Math.pow(i / (N - 1), 1.7); // les flips accélèrent
    const tiles = [];
    for (let i = 0; i < N; i++) {
      const x = 144 + (i % 13) * 100, y = 236 + Math.floor(i / 13) * 100;
      const gt = g(svg);
      const empty = rect(gt, -44, -44, 88, 88, 14, 'none', C.paper, 4, { 'stroke-dasharray': '8 9', opacity: 0.6 });
      const full = g(gt);
      rect(full, -44, -44, 88, 88, 14, C.pocket, C.paper, 5);
      tx(full, String(i + 1), 0, 14, 38, C.white, { mono: 1, anchor: 'middle' }).setAttribute('font-weight', 800);
      tiles.push({ gt, empty, full, x, y });
    }
    const lab = tx(svg, 'NOIRS D’AFFILÉE', 100, 424, 38, C.paper, { mono: 1 });
    lab.setAttribute('font-weight', 800);
    const countG = g(svg);
    const count = tx(countG, '0', 0, 0, 215, C.lime);
    const probLab = tx(svg, 'LA PROBA D’EN VOIR 26 ?', 560, 424, 38, C.paper, { mono: 1 });
    probLab.setAttribute('font-weight', 800);
    const prob = sv('text', { x: 560, y: 548, 'font-size': 104, class: 'zv-h' }, svg);
    const pA = sv('tspan', { fill: C.paper }, prob), pB = sv('tspan', { fill: C.lime }, prob);
    const PROB = '1 sur 137 000 000';
    // panneau « prochain tour » : il ne change jamais
    const panel = g(svg);
    rect(panel, 112, 630, 1400, 96, 26, C.ink);
    rect(panel, 100, 618, 1400, 96, 26, C.paper, C.ink, 7);
    const ptile = g(panel);
    const pt = g(ptile);
    const ptB = g(pt), ptR = g(pt);
    rect(ptB, -34, -34, 68, 68, 12, C.pocket, C.ink, 6);
    tx(ptB, '?', 0, 16, 48, C.white, { mono: 1, anchor: 'middle' }).setAttribute('font-weight', 800);
    rect(ptR, -34, -34, 68, 68, 12, C.red, C.ink, 6);
    tx(ptR, '27', 0, 13, 40, C.ink, { mono: 1, anchor: 'middle' }).setAttribute('font-weight', 800);
    const l1 = tx(panel, 'PROCHAIN TOUR :', 214, 649, 32, C.ink, { mono: 1 });
    l1.setAttribute('font-weight', 800);
    const l2g = g(panel);
    const l2 = tx(l2g, '18/37 rouge', 0, 0, 60, C.ink);

    return {
      id: 'streak', dur, el: svg,
      render(t) {
        let n = 0, lf = -9;
        tiles.forEach((o, i) => {
          const pin = E.back(prog(t, 0.1 + i * 0.022, 0.1 + i * 0.022 + 0.35));
          const p = prog(t, tf(i), tf(i) + 0.3);
          if (t >= tf(i)) { n = i + 1; lf = tf(i); }
          const sx = p > 0 ? Math.abs(Math.cos(p * Math.PI)) : 1;
          o.empty.setAttribute('visibility', p < 0.5 ? 'visible' : 'hidden');
          o.full.setAttribute('visibility', p >= 0.5 ? 'visible' : 'hidden');
          const sc = Math.max(pin, 0);
          put(o.gt, o.x, o.y, 0, sc * Math.max(sx, 0.001), sc * (1 + 0.1 * Math.sin(p * Math.PI)), clamp(pin * 4));
        });
        const bump = lf > -9 ? 1 + 0.07 * (1 - prog(t, lf, lf + 0.16)) : 1;
        count.textContent = String(n);
        put(countG, 100, 600, 0, bump, bump, 1);
        // le panneau reste identique, il « tape » à chaque flip
        const pulse = lf > -9 ? 1 + 0.1 * (1 - prog(t, lf, lf + 0.2)) : 1;
        const pin2 = E.back(prog(t, 0.3, 0.8));
        put(panel, 0, (1 - pin2) * 160, 0, 1, 1, clamp(pin2 * 4));
        put(ptile, 152, 666, 0, 1, 1, 1);

        // probabilité : elle s'écrit
        probLab.setAttribute('opacity', f(prog(t, 6.2, 6.4)));
        const k = Math.floor(PROB.length * prog(t, 6.4, 8.0));
        pA.textContent = PROB.slice(0, Math.min(k, 6));
        pB.textContent = PROB.slice(6, k) + (k > 0 && k < PROB.length && Math.floor(t * 6) % 2 === 0 ? '_' : '');

        // la tuile rouge
        const fp = prog(t, 8.5, 8.85);
        const fs = Math.max(Math.abs(Math.cos(fp * Math.PI)), 0.001);
        ptB.setAttribute('visibility', fp < 0.5 ? 'visible' : 'hidden');
        ptR.setAttribute('visibility', fp >= 0.5 ? 'visible' : 'hidden');
        put(pt, 0, 0, 0, fs, 1 + 0.12 * Math.sin(fp * Math.PI), 1);
        const done = fp >= 0.5;
        l1.textContent = done ? 'MAIS LE TOUR SUIVANT ?' : 'PROCHAIN TOUR :';
        l2.textContent = done ? 'toujours 18/37' : '18/37 rouge';
        const fl = done ? 1 + 0.1 * (1 - prog(t, 8.7, 8.95)) : pulse;
        put(l2g, 214, 700, 0, fl, fl, 1);
      }
    };
  }

  /* ------------------------------------------------------------------ scène : outro */
  function sceneOutro() {
    const dur = 8;
    const svg = mkSvg();
    rect(svg, 0, 0, W, H, 0, C.lime);
    const ballG = g(svg); // derrière le « 0 » : elle disparaît derrière la paroi du haut et réapparaît dans la poche
    circle(ballG, 0, 0, 42, C.white, C.ink, 8);
    const zeroG = g(svg);
    // un « 0 » épais : anneau noir (ellipse extérieure moins ellipse intérieure)
    const ring = g(zeroG);
    sv('path', {
      d: 'M-170 0A170 235 0 1 0 170 0A170 235 0 1 0 -170 0ZM-76 0A76 145 0 1 1 76 0A76 145 0 1 1 -76 0Z',
      fill: C.ink, 'fill-rule': 'evenodd'
    }, ring);

    const letters = [];
    const rows = [
      { str: 'ZÉRO', y: 372, x: 700, fill: C.ink },
      { str: 'VERT', y: 596, x: 740, fill: C.lime }
    ];
    const plate = g(svg);
    rect(plate, -380, -115, 760, 230, 28, C.ink);
    const wm = g(svg);
    rows.forEach((row, ri) => {
      [...row.str].forEach((ch, ci) => {
        const gl = g(wm);
        const t1 = tx(gl, ch, 0, 0, 250, row.fill);
        letters.push({ gl, t1, row, ci, ri, w: 0 });
      });
    });
    const tag = tx(svg, 'la bille n’a pas de mémoire.', 1500, 686, 62, C.ink, { anchor: 'end', len: 860 });
    const bar = rect(svg, 640, 702, 860, 10, 5, C.white, C.ink, 4);

    const HOLE = { x: 400, y: 450 };
    function layout() {
      rows.forEach((row, ri) => {
        let x = row.x;
        letters.filter((l) => l.ri === ri).forEach((l) => {
          let w = 0;
          try { w = l.t1.getComputedTextLength(); } catch (e) { /* hors écran */ }
          if (!w) w = 250 * 0.62;
          l.w = w; l.x = x; x += w * 0.97;
        });
      });
    }
    const rnd = mulberry32(5);
    letters.forEach((l) => { l.r = (rnd() - 0.5) * 24; });

    return {
      id: 'outro', dur, el: svg,
      enter() { layout(); },
      render(t) {
        const zp = E.back(prog(t, 0.15, 0.85));
        const squash = 1 - 0.05 * Math.sin(Math.PI * prog(t, 2.4, 2.75)) * (t > 2.4 ? 1 : 0);
        put(zeroG, HOLE.x, HOLE.y, (1 - zp) * -30, zp, zp * squash, clamp(zp * 4));

        // la bille : arrive en haut à droite, passe derrière la paroi, tombe et rebondit au fond de la poche
        let bx, by, bs = 1, bo = 1;
        if (t < 1.1) bo = 0;
        if (t < 2.0) {
          const p = E.in2(prog(t, 1.1, 2.0));
          bx = lerp(1150, HOLE.x, p); by = lerp(-80, HOLE.y - 120, p) - 220 * Math.sin(Math.PI * p) * (1 - p);
        } else {
          const p = prog(t, 2.0, 2.9);
          bx = HOLE.x; by = lerp(HOLE.y - 120, HOLE.y + 100, E.bounce(p));
        }
        put(ballG, bx, by, (t - 1.1) * 400, bs, bs, bo);

        // wordmark, lettre par lettre
        letters.forEach((l, i) => {
          const a = 3.0 + i * 0.1 + (l.ri ? 0.15 : 0);
          const p = E.back(prog(t, a, a + 0.38));
          const py = l.row.y + (1 - p) * 140;
          put(l.gl, l.x + l.w / 2, py, l.r * (1 - p), p, p, clamp(p * 4));
          l.t1.setAttribute('x', f(-l.w / 2));
          l.t1.setAttribute('text-anchor', 'start');
        });
        const pl = E.back(prog(t, 3.5, 4.1));
        put(plate, 1060, 506, -1.5 * pl, pl, pl, clamp(pl * 4));
        // la ligne finale
        const tp = E.out3(prog(t, 5.0, 5.6));
        tag.setAttribute('opacity', f(tp));
        tag.setAttribute('transform', `translate(0 ${f((1 - tp) * 36)})`);
        const bp = E.out3(prog(t, 5.5, 6.1));
        bar.setAttribute('width', f(860 * bp));
      }
    };
  }

  /* ------------------------------------------------------------------ le plateau (HUD, wipe, horloge) */
  const FACTORY = { wheel: sceneWheel, wells: sceneWells, pockets: scenePockets, average: sceneAverage, streak: sceneStreak, outro: sceneOutro };
  const reduceMq = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false, addEventListener() {} };

  const stage = document.querySelector('.stage[data-stage]');
  const api = { ids: IDS.slice(), show() {}, seek() {}, durations: {} };
  window.ZVStage = api;
  if (!stage) return;
  const view = stage.querySelector('.stage-view');
  const hud = stage.querySelector('.stage-hud');
  if (!view || !hud) return;

  // la scène est décorative ; seuls les petits points de navigation sont dans l'arbre d'accessibilité
  stage.removeAttribute('aria-hidden');
  view.setAttribute('aria-hidden', 'true');

  const sections = [...document.querySelectorAll('.script-sec')];
  const secInfo = (i) => {
    const s = sections[i];
    return s ? { index: i, scene: s.dataset.scene || '', cap: s.dataset.cap || '', big: s.dataset.big || '' } : null;
  };

  const wipe = document.createElement('div');
  wipe.className = 'zv-wipe';
  view.appendChild(wipe);

  hud.textContent = '';
  const bigEl = document.createElement('div'); bigEl.className = 'hud-big'; bigEl.setAttribute('aria-hidden', 'true'); bigEl.hidden = true;
  const capEl = document.createElement('div'); capEl.className = 'hud-cap'; capEl.setAttribute('aria-hidden', 'true'); capEl.hidden = true;
  const dotsEl = document.createElement('div'); dotsEl.className = 'hud-dots'; dotsEl.setAttribute('role', 'group'); dotsEl.setAttribute('aria-label', 'Illustrations de l’épisode');
  const dots = IDS.map((id, k) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'hud-dot'; b.dataset.scene = id;
    b.setAttribute('aria-label', `Illustration ${k + 1} sur ${IDS.length} : ${LABELS[id]}`);
    b.addEventListener('click', () => {
      let idx = sections.findIndex((s) => s.dataset.scene === id);
      const info = idx >= 0 ? secInfo(idx) : { index: k, scene: id, cap: '', big: '' };
      document.dispatchEvent(new CustomEvent('pod:section', { detail: { ...info, scene: id, source: 'manual' } }));
    });
    dotsEl.appendChild(b);
    return b;
  });
  hud.append(bigEl, dotsEl, capEl);

  const cache = {};
  let cur = null, wiping = false, pending = null, wipeToggle = 0;
  let t = 0, raf = 0, lastNow = 0, onScreen = true, tabVisible = !document.hidden, reduced = reduceMq.matches, manual = false;

  function getScene(id) {
    if (!cache[id]) {
      try {
        cache[id] = FACTORY[id]();
        cache[id].el.setAttribute('data-zv', id);
        view.insertBefore(cache[id].el, wipe);
        api.durations[id] = cache[id].dur;
      } catch (e) { cache[id] = null; }
    }
    return cache[id];
  }

  function setHud(id, opts) {
    opts = opts || {};
    if (typeof opts.cap === 'string') { capEl.textContent = opts.cap; capEl.hidden = !opts.cap; }
    if (typeof opts.big === 'string') {
      const changed = bigEl.textContent !== opts.big;
      bigEl.textContent = opts.big; bigEl.hidden = !opts.big;
      if (changed && opts.big) { bigEl.classList.remove('pop'); void bigEl.offsetWidth; bigEl.classList.add('pop'); }
    }
    dots.forEach((b) => { if (b.dataset.scene === id) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
  }

  function frame() {
    if (!cur) return;
    cur.render(Math.min(t, cur.dur));
  }

  function loop(now) {
    raf = 0;
    if (!cur || manual) return;
    const dt = Math.min(0.1, Math.max(0, (now - lastNow) / 1000));
    lastNow = now;
    t += dt;
    frame();
    if (t < cur.dur && shouldRun()) raf = requestAnimationFrame(loop);
  }
  function shouldRun() { return !!cur && !reduced && onScreen && tabVisible && !manual && t < cur.dur; }
  function sync() {
    if (shouldRun()) { if (!raf) { lastNow = performance.now(); raf = requestAnimationFrame(loop); } }
    else if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }

  function activate(id) {
    const sc = getScene(id);
    if (!sc) return false;
    for (const k in cache) if (cache[k]) cache[k].el.classList.toggle('on', k === id);
    cur = sc;
    t = reduced ? sc.dur : 0;
    if (sc.enter) sc.enter();
    if (sc.resize) sc.resize();
    frame();
    sync();
    return true;
  }

  function show(sceneId, opts) {
    if (IDS.indexOf(sceneId) < 0) return; // scène inconnue : on ne fait rien
    opts = opts || {};
    if (cur && cur.id === sceneId && !wiping) { pending = null; setHud(sceneId, opts); return; } // même scène : pas de rejeu
    setHud(sceneId, opts);
    if (!cur || reduced || !stage.isConnected) { wiping = false; pending = null; activate(sceneId); return; }
    pending = sceneId;
    if (wiping) return; // la scène visée sera appliquée au milieu du volet en cours (ou juste après)
    wiping = true;
    let swapped = false;
    const doSwap = () => { if (swapped) return; swapped = true; activate(pending); };
    const colors = [C.lime, C.red];
    wipe.style.background = colors[wipeToggle++ % 2];
    wipe.style.visibility = 'visible';
    const sk = 'skewX(-14deg)';
    const a1 = wipe.animate([{ transform: `translateX(-115%) ${sk}` }, { transform: `translateX(0%) ${sk}` }], { duration: 200, easing: 'cubic-bezier(.7,0,.3,1)', fill: 'forwards' });
    const timer = setTimeout(doSwap, 260);
    a1.onfinish = () => {
      clearTimeout(timer); doSwap();
      const a2 = wipe.animate([{ transform: `translateX(0%) ${sk}` }, { transform: `translateX(115%) ${sk}` }], { duration: 200, easing: 'cubic-bezier(.7,0,.3,1)', fill: 'forwards' });
      const end = () => {
        if (!wiping) return;
        wiping = false; wipe.style.visibility = 'hidden';
        if (pending && cur && cur.id !== pending) show(pending, {}); // une demande est arrivée après le milieu du volet
      };
      a2.onfinish = end;
      setTimeout(() => { if (wiping) end(); }, 700);
    };
  }

  // l'image finale statique pour prefers-reduced-motion ; rejouer sinon
  function onReduce() {
    reduced = reduceMq.matches;
    if (cur) { if (reduced) { t = cur.dur; frame(); } sync(); }
  }
  if (reduceMq.addEventListener) reduceMq.addEventListener('change', onReduce);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => { onScreen = es[es.length - 1].isIntersecting; sync(); }, { threshold: 0.1 }).observe(stage);
  }
  document.addEventListener('visibilitychange', () => { tabVisible = !document.hidden; sync(); });
  if ('ResizeObserver' in window) new ResizeObserver(() => { if (cur && cur.resize) cur.resize(); }).observe(view);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (cur) { if (cur.enter) cur.enter(); if (cur.resize) cur.resize(); frame(); } }).catch(() => {});

  document.addEventListener('pod:section', (e) => {
    const d = e.detail || {};
    show(d.scene, { cap: d.cap, big: d.big, index: d.index });
  });

  api.show = show;
  // aide aux captures et au débogage : fige l'horloge sur l'instant `sec` de la scène courante (seek(null) la relance)
  api.seek = (sec) => {
    if (!cur) return;
    if (sec === null || sec === undefined) { manual = false; sync(); return; }
    manual = true; t = sec; if (raf) { cancelAnimationFrame(raf); raf = 0; }
    frame();
  };
  api.current = () => (cur ? { id: cur.id, t, dur: cur.dur } : null);

  // état initial : la première section de la page (ou la roulette)
  const first = secInfo(0);
  if (first && IDS.indexOf(first.scene) >= 0) show(first.scene, first);
  else show('wheel', {});
})();
