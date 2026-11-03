// Noyau de la composition ZÉRO VERT : assemble les plans, les beats communs, les transitions et les sous-titres.
// Expose window.renderAt(T) (T absolu en secondes) et window.__ready. TOUT est une fonction pure de T : aucun état entre appels visible
// dans l'image, aucune horloge. Les instances de composants sont créées une fois (init) puis seulement mises à jour (update).
// Paramètres d'URL de mise au point : ?t=12.5 (rend cet instant) · ?force=<id> (tous les plans utilisent ce composant) ·
// ?extra=<url> (script supplémentaire chargé après les composants) · ?nocaps=1.
// Intégration dans une page du site (sans changer le rendu vidéo) : définir AVANT ce fichier
//   window.ZV_CONFIG = { timelineUrl, componentsInline: true, mount: <élément>, size: 'fluid', autoBoot: false }
// puis utiliser window.ZVEmbed = { ready: Promise, boot(), renderAt(T), total, fps, timeline }. Sans ZV_CONFIG, rien ne change.
(() => {
  'use strict';
  const Z = window.ZV;
  const { C, W, H, E, clamp, prog, lerp, f2, sv, g, rect, circle, path, line, text, put, shakeAt, sticker } = Z;
  const CFG = window.ZV_CONFIG || null;   // null = page de rendu (index.html) ; sinon intégration dans le site
  const Q = new URLSearchParams(CFG ? '' : location.search);
  const COMP_DIR = '/tools/video/composition/components/';
  const INK = C.ink, GREY = C.grey;
  let TL = null, FPS = 30, TOTAL = 0;
  let svg, stage, capsLayer, fxLayer, measureG;
  const FORCE = Q.get('force') || '';

  /* ------------------------------------------------------------------ utilitaires */
  const frames = (n) => n / FPS;
  const col = (c) => ({ lime: C.lime, paper: C.paper, red: C.red, white: C.white, ink: C.ink, grey: C.grey, pocket: C.pocket })[c] || (typeof c === 'string' && c[0] === '#' ? c : C.lime);
  const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
  function measure(str, size, mono, weight) {
    try {
      const n = Z.text(measureG, str, 0, 0, size, '#000', { mono, weight });
      let w = n.getComputedTextLength();
      measureG.removeChild(n);
      if (!(w > 0)) w = str.length * size * 0.6;
      return w;
    } catch (e) { return str.length * size * 0.6; }
  }
  const safe = (fn, fallback) => { try { return fn(); } catch (e) { if (!safe.warned) { safe.warned = 1; console.error('[core]', e && e.stack || e); } return fallback; } };
  function setT(n, x, y, r, sx, sy) { n.setAttribute('transform', `translate(${f2(x)} ${f2(y)}) rotate(${f2(r)}) scale(${f2(sx)} ${f2(sy === undefined ? sx : sy)})`); }
  const vis = (n, on) => n.setAttribute('visibility', on ? 'visible' : 'hidden');
  const disp = (n, on) => { const v = on ? 'inline' : 'none'; if (n.__d !== v) { n.__d = v; n.setAttribute('display', v); } };

  /* ------------------------------------------------------------------ beats communs (par-dessus le composant) */
  // pop back-ease (scale 0 → 1.12 → 1) sur `dur` secondes
  function popScale(p) { if (p <= 0) return 0; if (p >= 1) return 1; return p < 0.6 ? lerp(0, 1.12, E.out2(p / 0.6)) : lerp(1.12, 1, (p - 0.6) / 0.4); }

  function buildSticker(parent, b) {
    const label = String(b.text == null ? '' : b.text);
    let size = 60;
    let tw = measure(label, size);
    if (tw > 1000) { size = Math.max(32, Math.floor(size * 1000 / tw)); tw = measure(label, size); }
    const w = Math.round(tw + 68), h = Math.round(size + 40);
    const wrap = g(parent);
    const inner = Z.sticker(wrap, w, h, col(b.color), label, size, INK);
    const x = clamp(num(b.x, 1400), w / 2 + 30, W - w / 2 - 30), y = clamp(num(b.y, 240), h / 2 + 20, H - h / 2 - 20);
    return { kind: 'sticker', b, wrap, w, h, x, y, tilt: num(b.tilt, 0), strike: null, update(t) {
      const p = (t - b.t) / frames(8);
      const s = popScale(p);
      put(wrap, x, y, this.tilt, s, s, 1);
    } };
  }

  function buildStamp(parent, b) {
    const label = String(b.text == null ? '' : b.text);
    const k = num(b.scale, 1);
    let size = 112;
    let tw = measure(label, size);
    if (tw > 1500) { size = Math.floor(size * 1500 / tw); tw = measure(label, size); }
    const w = Math.round(tw + 110), h = Math.round(size + 70);
    const wrap = g(parent);
    const body = g(wrap);
    rect(body, -w / 2 + 12, -h / 2 + 12, w, h, 16, INK);
    rect(body, -w / 2, -h / 2, w, h, 16, col(b.color || 'red'), INK, 10);
    rect(body, -w / 2 + 18, -h / 2 + 18, w - 36, h - 36, 8, 'none', INK, 4);
    text(body, label, 0, size * 0.35, size, INK, { anchor: 'middle', spacing: -1 });
    const x = num(b.x, 960), y = num(b.y, 520), tilt = num(b.tilt, -8);
    return { kind: 'stamp', b, wrap, update(t) {
      const p = (t - b.t) / frames(5);
      if (p < 0) { vis(wrap, false); return; }
      const s = k * lerp(2.6, 1, E.in2(clamp(p)));
      put(wrap, x, y, tilt, s, s, 1);
    } };
  }

  function buildCount(parent, b) {
    const to = clamp(Math.round(num(b.to, 5)), 1, 60);
    const wrap = g(parent);
    const marks = [];
    const tally = (b.style || 'tally') === 'tally';
    if (tally) {
      const groups = Math.ceil(to / 5), gw = 152, gap = 80;
      const totalW = groups * gw + (groups - 1) * gap;
      for (let m = 0; m < to; m++) {
        const gi = Math.floor(m / 5), k = m % 5;
        const gx = -totalW / 2 + gi * (gw + gap);
        const mg = g(wrap);
        const mk = (x1, y1, x2, y2) => { line(mg, x1, y1, x2, y2, INK, 26); line(mg, x1, y1, x2, y2, C.paper, 12); };
        if (k < 4) { const cx = gx + 8 + k * 38; mk(cx, -52, cx, 52); marks.push({ mg, cx, cy: 0 }); }
        else { mk(gx - 10, 40, gx + gw + 10, -40); marks.push({ mg, cx: gx + gw / 2, cy: 0 }); }
      }
    } else {
      const label = String(b.text == null ? '×' : b.text);
      const step = Math.min(120, 1500 / to);
      for (let m = 0; m < to; m++) {
        const mg = g(wrap);
        const cx = -((to - 1) * step) / 2 + m * step;
        text(mg, label, cx, 30, 96, C.lime, { anchor: 'middle', mono: true });
        marks.push({ mg, cx, cy: 0 });
      }
    }
    const x = num(b.x, 960), y = num(b.y, 770);
    wrap.setAttribute('transform', `translate(${x} ${y})`);
    return { kind: 'count', b, wrap, update(t) {
      for (let m = 0; m < marks.length; m++) {
        const mk = marks[m];
        const p = (t - (b.t + m * frames(1.5))) / frames(3);
        if (p < 0) { vis(mk.mg, false); continue; }
        const s = lerp(1.8, 1, E.out2(clamp(p)));
        mk.mg.setAttribute('transform', `translate(${f2(mk.cx)} ${f2(mk.cy)}) scale(${f2(s)}) translate(${f2(-mk.cx)} ${f2(-mk.cy)})`);
        vis(mk.mg, true);
      }
    } };
  }

  function buildStrike(parent, b, items) {
    let host = null;
    if (!b.target || b.target === 'last-sticker') for (const it of items) if (it.kind === 'sticker' && it.b.t <= b.t + 1e-6) host = it;
    const lg = g(host ? host.wrap : parent);
    let x1, x2, y1, y2;
    if (host) { x1 = -host.w / 2 - 14; x2 = host.w / 2 + 14; y1 = y2 = 0; }
    else { x1 = 240; x2 = 1680; y1 = 400; y2 = 640; }
    line(lg, x1, y1, x2, y2, INK, 26);
    const red = line(lg, x1, y1, x2, y2, C.red, 18);
    const shadow = lg.firstChild;
    return { kind: 'strike', b, wrap: lg, update(t) {
      const p = clamp((t - b.t) / frames(6));
      if (t < b.t) { vis(lg, false); return; }
      vis(lg, true);
      const ex = lerp(x1, x2, E.out2(p)), ey = lerp(y1, y2, E.out2(p));
      red.setAttribute('x2', f2(ex)); red.setAttribute('y2', f2(ey));
      shadow.setAttribute('x2', f2(ex + (p < 1 ? 0 : 0))); shadow.setAttribute('y2', f2(ey));
    } };
  }

  // construit les calques de beats communs d'un plan ; renvoie {items, shakes[], freezeT}
  function buildOverlay(parent, shot) {
    const items = [], shakes = [];
    let freezeT = null;
    for (const b of shot.beats || []) {
      if (!b || typeof b.t !== 'number') continue;
      if (b.do === 'sticker') items.push(safe(() => buildSticker(parent, b)));
      else if (b.do === 'stamp') { const s = safe(() => buildStamp(parent, b)); if (s) items.push(s); shakes.push({ t0: b.t + frames(5), amp: num(b.amp, 14), dur: frames(12) }); }
      else if (b.do === 'count') items.push(safe(() => buildCount(parent, b)));
      else if (b.do === 'strike') items.push(safe(() => buildStrike(parent, b, items.filter(Boolean))));
      else if (b.do === 'shake') shakes.push({ t0: b.t, amp: num(b.amp, 10), dur: frames(12) });
      else if (b.do === 'freeze') { if (freezeT === null || b.t < freezeT) freezeT = b.t; }
    }
    return { items: items.filter(Boolean), shakes, freezeT };
  }

  /* ------------------------------------------------------------------ instances de plans */
  const inst = new Map();
  function getInst(shot) {
    let it = inst.get(shot.id);
    if (it) return it;
    const wrap = g(stage), shk = g(wrap), root = g(shk), over = g(shk);
    wrap.setAttribute('id', 'zv-' + shot.id);
    it = { shot, wrap, shk, root, over, st: null, impl: null, ov: null, missing: false };
    inst.set(shot.id, it);
    const compId = FORCE || shot.component;
    const impl = Z.REG[compId];
    let ok = false;
    if (impl && typeof impl.init === 'function') {
      try { it.st = impl.init(root, shot); it.impl = impl; ok = true; } catch (e) { console.error('[core] init', shot.id, compId, e && e.stack || e); while (root.firstChild) root.removeChild(root.firstChild); }
    }
    if (!ok) {
      it.missing = true;
      rect(root, 0, 0, W, H, 0, INK);
      text(root, `composant « ${compId} » manquant`, W / 2, 520, 70, C.red, { anchor: 'middle' });
      text(root, `plan ${shot.id}`, W / 2, 600, 36, C.paper, { anchor: 'middle', mono: true });
    }
    it.ov = safe(() => buildOverlay(over, shot), { items: [], shakes: [], freezeT: null });
    wrap.setAttribute('display', 'none'); wrap.__d = 'none';
    return it;
  }
  // met le plan à jour à l'instant T ; renvoie les décalages de tremblement (px)
  function drawInst(it, T) {
    const shot = it.shot;
    const t = clamp(T - shot.start, 0, shot.dur);
    let te = t;
    if (it.ov.freezeT !== null && te > it.ov.freezeT) te = it.ov.freezeT;
    if (it.impl) { try { it.impl.update(it.st, te, shot); } catch (e) { if (!it.warned) { it.warned = 1; console.error('[core] update', shot.id, e && e.stack || e); } } }
    for (const o of it.ov.items) safe(() => o.update(t));
    let dx = 0, dy = 0;
    for (const s of it.ov.shakes) { const [ax, ay] = shakeAt(t, s.t0, s.amp, s.dur); dx += ax; dy += ay; }
    it.shk.setAttribute('transform', dx || dy ? `translate(${f2(dx)} ${f2(dy)})` : '');
  }

  /* ------------------------------------------------------------------ transitions */
  const S_SLANT = Math.round(H * Math.tan(14 * Math.PI / 180));   // 269 px : bande inclinée de −14°
  let FX = null;
  function buildFx() {
    FX = {};
    FX.band = sv('polygon', { points: '0,0 0,0 0,0 0,0', fill: C.lime }, fxLayer);
    FX.blades = []; for (let i = 0; i < 5; i++) FX.blades.push(rect(fxLayer, i * 384 - 1, 0, 386, 0, 0, INK, null, 0, { 'shape-rendering': 'crispEdges' }));
    FX.iris = circle(fxLayer, 960, 540, 0, C.lime, INK, 10);
    FX.glitch = sv('g', {}, fxLayer);
    FX.slices = [];
    for (let i = 0; i < 9; i++) {
      const s = sv('svg', { x: 0, y: 0, width: W, height: 100, viewBox: `0 0 ${W} 100`, overflow: 'hidden' }, FX.glitch);
      const u = sv('use', {}, s);
      const bar = rect(s, 0, 0, W, 100, 0, INK);
      FX.slices.push({ s, u, bar });
    }
    for (const k in FX) if (k !== 'blades' && k !== 'slices') FX[k].setAttribute('display', 'none');
    FX.blades.forEach((b) => b.setAttribute('display', 'none'));
  }
  function fxOff() {
    FX.band.setAttribute('display', 'none'); FX.iris.setAttribute('display', 'none'); FX.glitch.setAttribute('display', 'none');
    for (const b of FX.blades) b.setAttribute('display', 'none');
  }
  function trSpec(id) {
    const spec = TL.transitions && TL.transitions[id];
    const n = spec && typeof spec.frames === 'number' ? spec.frames : 0;
    if (!(n > 0)) return null;
    const half = frames(n / 2), all = frames(n);
    if (id === 'wipe-lime' || id === 'wipe-red' || id === 'wipe-ink') return { id, kind: 'wipe', pre: half, post: half };
    if (id === 'shutter') return { id, kind: 'shutter', pre: half, post: half };
    if (id === 'push-left' || id === 'push-up') return { id, kind: 'push', pre: half, post: half };
    if (id === 'slam') return { id, kind: 'slam', pre: 0, post: all };
    if (id === 'iris-zero') return { id, kind: 'iris', pre: all, post: 0 };
    if (id === 'glitch') return { id, kind: 'glitch', pre: all, post: 0 };
    return null;
  }

  function drawBand(p, id) {
    const FAR = 260, k = S_SLANT / H;
    let xl, xr;
    if (p < 0.5) { xr = lerp(-S_SLANT, W, E.out2(p / 0.5)); xl = -S_SLANT - FAR; }
    else { xl = lerp(-S_SLANT, W, E.in2((p - 0.5) / 0.5)); xr = W + FAR; }
    const y0 = -12, y1 = H + 12;
    const at = (x, y) => `${f2(x + y * k)},${y}`;
    FX.band.setAttribute('points', `${at(xl, y0)} ${at(xr, y0)} ${at(xr, y1)} ${at(xl, y1)}`);
    FX.band.setAttribute('fill', id === 'wipe-red' ? C.red : id === 'wipe-ink' ? INK : C.lime);
    if (id === 'wipe-ink') { FX.band.setAttribute('stroke', C.lime); FX.band.setAttribute('stroke-width', 8); FX.band.setAttribute('stroke-linejoin', 'miter'); }
    else { FX.band.removeAttribute('stroke'); FX.band.removeAttribute('stroke-width'); }
    disp(FX.band, true); FX.band.setAttribute('display', 'inline');
  }
  function drawShutter(p) {
    const f = p * 10;
    for (let i = 0; i < 5; i++) {
      const c = clamp((f - i * 0.9) / 1.4), o = clamp((f - 5 - i * 0.9) / 1.4);
      let y = 0, h = 0;
      if (o > 0) { y = H * E.in2(o); h = H - y; } else { h = H * E.out2(c); }
      const b = FX.blades[i];
      if (h < 0.5) { b.setAttribute('display', 'none'); continue; }
      b.setAttribute('display', 'inline'); b.setAttribute('y', f2(y)); b.setAttribute('height', f2(h + 0.5));
    }
  }
  function drawIris(p, origin) {
    const [ox, oy] = origin;
    const R = Math.max(Math.hypot(ox, oy), Math.hypot(W - ox, oy), Math.hypot(ox, H - oy), Math.hypot(W - ox, H - oy)) + 12;
    const r = R * E.io2(Math.min(1, p * 1.08));
    FX.iris.setAttribute('cx', f2(ox)); FX.iris.setAttribute('cy', f2(oy)); FX.iris.setAttribute('r', f2(r));
    FX.iris.setAttribute('display', r < 0.5 ? 'none' : 'inline');
  }
  function drawGlitch(T, ws, oldId, seedBase) {
    const fi = Math.floor((T - ws) * FPS + 1e-4);
    const rnd = Z.rng(seedBase * 131 + fi * 7919 + 11);
    // 9 tranches de hauteurs aléatoires qui couvrent le cadre
    const wts = []; let sum = 0; for (let i = 0; i < 9; i++) { const v = 0.4 + rnd(); wts.push(v); sum += v; }
    const cuts = [0]; let acc = 0; for (let i = 0; i < 9; i++) { acc += wts[i] / sum; cuts.push(i === 8 ? 1 : acc); }
    FX.glitch.setAttribute('display', 'inline');
    for (let i = 0; i < 9; i++) {
      const y0 = Math.round(cuts[i] * H), y1 = Math.round(cuts[i + 1] * H), h = Math.max(1, y1 - y0);
      const sl = FX.slices[i];
      const r = rnd(), dx = (rnd() < 0.7 ? 1 : 0) * Math.round((rnd() - 0.5) * 2 * (60 + 180 * rnd()));
      sl.s.setAttribute('y', y0); sl.s.setAttribute('height', h); sl.s.setAttribute('viewBox', `0 ${y0} ${W} ${h}`);
      sl.u.setAttribute('href', '#zv-' + oldId); sl.u.setAttribute('transform', `translate(${dx} 0)`);
      const flat = r < 0.22;
      sl.bar.setAttribute('y', y0); sl.bar.setAttribute('height', h); sl.bar.setAttribute('fill', r < 0.11 ? C.lime : INK);
      sl.bar.setAttribute('display', flat ? 'inline' : 'none');
    }
  }

  /* ------------------------------------------------------------------ sous-titres karaoké */
  let CAP = null;       // {groups:[...]}
  const CS = 50, LH = 62, PX = 30, PY = 16;
  // Étiquette « locuteur » (débats à plusieurs voix) : les phrases du timeline portent alors `v` ('theo' | 'tom' | 'arthur').
  // Sans `v` nulle part : aucun changement de rendu (position du sticker 948 comprise).
  const SPK = { theo: { name: 'THÉO', bg: C.lime }, tom: { name: 'TOM', bg: C.red }, arthur: { name: 'ARTHUR', bg: C.paper } };
  const SPK_FS = 27, SPK_H = 42, SPK_OVER = 10, SPK_SHIFT = 20;   // corps du texte, hauteur, recouvrement du bord haut du sticker, descente du sticker (étiquette ≥ y 856 ; bas du sticker + ombre + tilt ≤ 1064)
  function chunkSentence(words, bounds) {
    const n = words.length;
    if (!n) return [];
    const best = new Array(n + 1).fill(Infinity), prev = new Array(n + 1).fill(-1);
    best[0] = 0;
    for (let b = 1; b <= n; b++) {
      for (let L = 1; L <= 9 && L <= b; L++) {
        const a = b - L;
        if (best[a] === Infinity) continue;
        let chars = -1; for (let i = a; i < b; i++) chars += words[i].w.length + 1;
        if (chars > 78 && L > 1) continue;
        let c = 8 + 0.5 * (L - 6) * (L - 6);
        if (L < 3 && n >= 3) c += 40 * (3 - L);
        if (b < n) {
          const last = words[b - 1].w, gap = words[b].start - words[b - 1].end;
          if (/[,;:]$/.test(last)) c -= 12; else if (gap >= 0.3) c -= 5;
          if (/^(le|la|les|l|un|une|de|des|du|d|à|au|aux|et|ou|que|qui|en|ce|se|ne|sa|son|ses|mon|ma|mes|ta|ton|tes|tu|il|elle|je|me|te|y|on|nous|vous|ils|elles|pas)$/i.test(last.replace(/[^\p{L}]/gu, ''))) c += 6;
        }
        for (const B of bounds) for (let ci = a + 1; ci < b; ci++) if (Math.abs(B - (words[ci - 1].end + words[ci].start) / 2) < 0.3) c += 30;
        if (best[a] + c < best[b]) { best[b] = best[a] + c; prev[b] = a; }
      }
    }
    const cuts = []; for (let b = n; b > 0; b = prev[b]) { if (prev[b] < 0) return [words]; cuts.push([prev[b], b]); }
    return cuts.reverse().map(([a, b]) => words.slice(a, b));
  }
  function buildCaptionIndex() {
    const bounds = TL.shots.slice(1).map((s) => s.start);
    const groups = [];
    for (const sen of TL.sentences || []) {
      const words = (sen.words || []).filter((w) => w && typeof w.w === 'string');
      const v = SPK[sen.v] ? sen.v : null;
      for (const ws of chunkSentence(words, bounds)) groups.push({ words: ws, start: ws[0].start - 0.1, end: ws[ws.length - 1].end + 0.25, node: null, v });
    }
    groups.sort((a, b) => a.start - b.start);
    for (let i = 0; i + 1 < groups.length; i++) if (groups[i].end > groups[i + 1].start) groups[i].end = Math.max(groups[i].start + 0.05, groups[i + 1].start);
    // locuteur : un groupe vient d'UNE phrase (chunkSentence), donc d'un seul `v` ; pop quand il change d'un groupe au suivant
    let hasV = false;
    for (let i = 0; i < groups.length; i++) { const gr = groups[i]; gr.newSpk = !!gr.v && (i === 0 || groups[i - 1].v !== gr.v); if (gr.v) hasV = true; }
    CAP = { groups, hasV };
  }
  function buildCaptionNode(grp) {
    const gw = sv('g', {});
    const ws = grp.words;
    const widths = ws.map((w) => measure(w.w, CS));
    const space = Math.max(8, measure('a a', CS) - measure('aa', CS));
    // coupe en 1 ou 2 lignes (40 caractères max par ligne si possible)
    const total = ws.reduce((s, w) => s + w.w.length + 1, -1);
    let lines = [ws.map((_, i) => i)];
    if (total > 40 && ws.length > 1) {
      let bestK = 1, bestV = Infinity;
      for (let k = 1; k < ws.length; k++) {
        let c1 = -1, c2 = -1; for (let i = 0; i < k; i++) c1 += ws[i].w.length + 1; for (let i = k; i < ws.length; i++) c2 += ws[i].w.length + 1;
        const v = Math.max(c1, c2); if (v < bestV) { bestV = v; bestK = k; }
      }
      lines = [Array.from({ length: bestK }, (_, i) => i), Array.from({ length: ws.length - bestK }, (_, i) => bestK + i)];
    }
    const lw = lines.map((l) => l.reduce((s, i) => s + widths[i], 0) + (l.length - 1) * space);
    const bw = Math.round(Math.max(...lw) + 2 * PX), bh = lines.length * LH + 2 * PY;
    rect(gw, -bw / 2 + 8, -bh / 2 + 8, bw, bh, 20, INK);
    rect(gw, -bw / 2, -bh / 2, bw, bh, 20, C.paper, INK, 6);
    const pill = rect(gw, 0, 0, 10, 10, 10, C.lime);
    const items = new Array(ws.length);
    lines.forEach((l, li) => {
      const cy = -bh / 2 + PY + LH * (li + 0.5);
      let x = -lw[li] / 2;
      for (const i of l) {
        const el = text(gw, ws[i].w, f2(x), f2(cy + CS * 0.35), CS, GREY, {});
        items[i] = { el, x, w: widths[i], cy, state: -1 };
        x += widths[i] + space;
      }
    });
    // étiquette locuteur, collée au coin supérieur gauche du sticker (origine du groupe lg = son coin inférieur gauche)
    let tag = null;
    if (grp.v) {
      const sp = SPK[grp.v], label = sp.name, ls = 1.5;
      const tw = measure(label, SPK_FS) + ls * label.length, w = Math.round(tw + 36), h = SPK_H;
      const lg = g(gw);
      rect(lg, 6, -h + 6, w, h, h / 2, INK);
      rect(lg, 0, -h, w, h, h / 2, sp.bg, INK, 4);
      text(lg, label, f2(w / 2 + ls / 2), f2(-h / 2 + SPK_FS * 0.35), SPK_FS, INK, { anchor: 'middle', spacing: ls });
      tag = { lg, x: -bw / 2 + 8, y: -bh / 2 + SPK_OVER };
      lg.setAttribute('transform', `translate(${f2(tag.x)} ${f2(tag.y)})`);
    }
    return { gw, items, pill, bw, bh, tag };
  }
  function drawCaptions(T, shot) {
    let grp = null;
    if (CAP && shot && shot.captions !== false && !Q.get('nocaps')) {
      const gs = CAP.groups; let lo = 0, hi = gs.length - 1, r = -1;
      while (lo <= hi) { const m = (lo + hi) >> 1; if (gs[m].start <= T) { r = m; lo = m + 1; } else hi = m - 1; }
      if (r >= 0 && T < gs[r].end) grp = gs[r];
    }
    if (!grp) { if (capsLayer.firstChild) capsLayer.replaceChildren(); return; }
    if (!grp.node) grp.node = buildCaptionNode(grp);
    const nd = grp.node;
    if (capsLayer.firstChild !== nd.gw) capsLayer.replaceChildren(nd.gw);
    const pa = prog(T, grp.start, grp.start + frames(4));
    const s = pa >= 1 ? 1 : lerp(0.8, 1, E.back(pa));
    nd.gw.setAttribute('transform', `translate(960 ${CAP.hasV ? 948 + SPK_SHIFT : 948}) rotate(-1) scale(${f2(s)})`);
    if (nd.tag) {
      const ps = grp.newSpk ? lerp(0.55, 1, E.back(prog(T, grp.start, grp.start + frames(3)))) : 1;
      nd.tag.lg.setAttribute('transform', `translate(${f2(nd.tag.x)} ${f2(nd.tag.y)}) scale(${f2(ps)})`);
    }
    const ws = grp.words;
    let lit = -1;
    for (let j = 0; j < ws.length; j++) {
      const w = ws[j];
      const end = Math.min(j + 1 < ws.length ? ws[j + 1].start : Infinity, w.end + 0.15);
      if (T >= w.start && T < end) lit = j;
      const st = T >= w.start ? 1 : 0;
      const it = nd.items[j];
      if (it.state !== st) { it.state = st; it.el.setAttribute('fill', st ? INK : GREY); }
    }
    if (lit < 0) nd.pill.setAttribute('display', 'none');
    else {
      const it = nd.items[lit], sc = lerp(1.06, 1, prog(T, ws[lit].start, ws[lit].start + frames(3)));
      const pw = (it.w + 16) * sc, ph = (CS + 8) * sc, cx = it.x + it.w / 2;
      nd.pill.setAttribute('display', 'inline');
      nd.pill.setAttribute('x', f2(cx - pw / 2)); nd.pill.setAttribute('y', f2(it.cy - ph / 2)); nd.pill.setAttribute('width', f2(pw)); nd.pill.setAttribute('height', f2(ph));
    }
  }

  /* ------------------------------------------------------------------ rendu d'une image */
  let shown = [];
  function present(list) {
    for (const it of shown) if (!list.includes(it)) disp(it.wrap, false);
    for (const it of list) { if (stage.lastChild !== it.wrap || list.length > 1) stage.appendChild(it.wrap); disp(it.wrap, true); }
    shown = list;
  }
  function wrapXf(it, x, y, s, cx, cy) {
    if (s === undefined) s = 1;
    it.wrap.setAttribute('transform', x || y || s !== 1 ? `translate(${f2(x + cx * (1 - s))} ${f2(y + cy * (1 - s))}) scale(${f2(s)})` : '');
  }
  function findShot(T) {
    const sh = TL.shots; let lo = 0, hi = sh.length - 1, r = 0;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (sh[m].start <= T) { r = m; lo = m + 1; } else hi = m - 1; }
    return r;
  }
  function render(T) {
    T = clamp(num(T, 0), 0, TOTAL - 1e-6);
    const sh = TL.shots, i = findShot(T), cur = sh[i];
    let mode = null;
    if (i > 0) { const tr = trSpec(cur.in); if (tr && tr.post > 0 && T < cur.start + tr.post) mode = { tr, old: sh[i - 1], neu: cur, B: cur.start, ni: i }; }
    if (!mode && i + 1 < sh.length) { const nx = sh[i + 1], tr = trSpec(nx.in); if (tr && tr.pre > 0 && T >= nx.start - tr.pre) mode = { tr, old: cur, neu: nx, B: nx.start, ni: i + 1 }; }
    fxOff();
    let activeShot = cur;
    if (!mode) {
      const a = getInst(cur); wrapXf(a, 0, 0, 1, 0, 0); present([a]); drawInst(a, T);
    } else {
      const { tr, old, neu, B } = mode;
      const ws = B - tr.pre, p = clamp((T - ws) / (tr.pre + tr.post), 0, 0.999999);
      const swapped = T >= B;
      const A = getInst(old), N = getInst(neu);
      if (tr.kind === 'wipe' || tr.kind === 'shutter') {
        const base = swapped ? N : A; activeShot = base.shot;
        wrapXf(base, 0, 0, 1, 0, 0); present([base]); drawInst(base, T);
        if (tr.kind === 'wipe') drawBand(p, tr.id); else drawShutter(p);
      } else if (tr.kind === 'push') {
        const e = E.io3(p), left = tr.id === 'push-left';
        activeShot = swapped ? neu : old;
        wrapXf(A, left ? -W * e : 0, left ? 0 : -H * e, 1, 0, 0);
        wrapXf(N, left ? W * (1 - e) : 0, left ? 0 : H * (1 - e), 1, 0, 0);
        present([A, N]); drawInst(A, T); drawInst(N, T);
      } else if (tr.kind === 'slam') {
        activeShot = neu;
        const s = lerp(1.15, 1, E.out2(p));
        const [sx, sy] = shakeAt(T, B, 10, 0.25);
        wrapXf(N, sx, sy, s, W / 2, H / 2); present([N]); drawInst(N, T);
      } else if (tr.kind === 'iris') {
        activeShot = old;
        wrapXf(A, 0, 0, 1, 0, 0); present([A]); drawInst(A, T);
        let o = [W / 2, H / 2];
        if (A.impl && typeof A.impl.irisOrigin === 'function') { const r = safe(() => A.impl.irisOrigin(A.st, A.shot), null); if (r && isFinite(r[0]) && isFinite(r[1])) o = r; }
        drawIris(p, o);
      } else if (tr.kind === 'glitch') {
        activeShot = old;
        wrapXf(A, 0, 0, 1, 0, 0); present([A]); drawInst(A, T);
        drawGlitch(T, ws, old.id, mode.ni);
      } else { const a = swapped ? N : A; wrapXf(a, 0, 0, 1, 0, 0); present([a]); drawInst(a, T); }
    }
    drawCaptions(T, activeShot);
  }
  window.renderAt = function renderAt(T) {
    try { render(T); } catch (e) { console.error('[core] renderAt', T, e && e.stack || e); }
    return true;
  };

  /* ------------------------------------------------------------------ démarrage */
  const loadScript = (src) => new Promise((res) => { const s = document.createElement('script'); s.src = src; s.onload = () => res(true); s.onerror = () => res(false); document.head.appendChild(s); });
  async function boot() {
    TL = await (await fetch((CFG && CFG.timelineUrl) || new URLSearchParams(location.search).get('tl') || '/output/video/data/timeline.json', CFG && CFG.timelineUrl ? {} : { cache: 'no-store' })).json();
    FPS = (TL.video && TL.video.fps) || 30;
    TOTAL = TL.total;
    const ids = [...new Set(TL.shots.map((s) => s.component))];
    const loaded = CFG && CFG.componentsInline ? ids.map(() => true) : await Promise.all(ids.map((id) => loadScript(`${COMP_DIR}${id}.js?v=${Date.now()}`)));
    if (FORCE) await loadScript(`${COMP_DIR}${FORCE}.js`);
    if (Q.get('extra')) await loadScript(Q.get('extra'));
    const need = (id) => document.fonts.load(`800 50px "${id}"`, 'AaÉéÀÔçœ0123456789 .,:;!?’«»·×÷€¢%/-');
    await Promise.all([need('Bricolage Grotesque'), need('JetBrains Mono'), document.fonts.load('800 50px "Bricolage Grotesque"', 'āēūŁ'), document.fonts.ready]);
    const fluid = !!(CFG && CFG.size === 'fluid');
    svg = sv('svg', fluid ? { viewBox: `0 0 ${W} ${H}`, width: '100%', height: '100%', preserveAspectRatio: 'xMidYMid meet' } : { viewBox: `0 0 ${W} ${H}`, width: W, height: H }, (CFG && CFG.mount) || document.getElementById('stage'));
    rect(svg, 0, 0, W, H, 0, INK);
    stage = g(svg); capsLayer = g(svg); fxLayer = g(svg);
    measureG = g(svg, { visibility: 'hidden' });
    buildFx();
    buildCaptionIndex();
    window.__info = { total: TOTAL, fps: FPS, shots: TL.shots.length, missing: ids.filter((id, k) => !loaded[k] || !Z.REG[id]) };
    window.__total = TOTAL; window.__fps = FPS;
    if (Q.get('t') !== null && Q.get('t') !== '') renderAt(parseFloat(Q.get('t')));
    window.__ready = true;
  }
  // API d'intégration (pages du site) : ready se résout quand la scène est montée et prête à rendre.
  let booting = null, resolveReady, rejectReady;
  const readyP = new Promise((res, rej) => { resolveReady = res; rejectReady = rej; });
  readyP.catch(() => {});
  const start = () => booting || (booting = boot().then(() => resolveReady(true), (e) => { console.error('[core] boot', e && e.stack || e); window.__error = String(e && e.message || e); rejectReady(e); }));
  window.ZVEmbed = {
    ready: readyP, boot: start,
    renderAt(T) { return TL ? window.renderAt(T) : false; },
    get total() { return TOTAL; }, get fps() { return FPS; }, get timeline() { return TL; }
  };
  if (!(CFG && CFG.autoBoot === false)) start();
})();
