// Composant « chapter-card » : voir tools/video/composition/INTERFACE.md. Fonction pure du temps du plan, aplats seulement.
(() => {
  /* ---- aides typographiques locales (mêmes lignes dans chaque composant du rôle « Typo ») ---- */
  const { C, F, E, clamp, prog, lerp, f2, put, g, rect, text, path, line, sv, circle } = ZV;
  const COL = { ink: C.ink, paper: C.paper, lime: C.lime, red: C.red, white: C.white };
  const TINT = { ink: '#1A1A1A', lime: '#B9EC22', paper: '#E4E0D3', red: '#F0452F' };
  const NB = ' ';
  let UID = 0;
  const colOf = (k, d) => COL[k] || k || d;
  // largeur d'une chaîne (mesure réelle via un <text> caché), ramenée à `size` px
  function mkProbe(root) {
    const n = sv('text', { x: 0, y: 0, 'font-size': 100, 'font-weight': 800, visibility: 'hidden' }, root);
    const cache = {};
    return function w(str, size, o) {
      o = o || {};
      const key = (o.mono ? 'm' : 'd') + (o.sp || 0) + '|' + str;
      let v = cache[key];
      if (v === undefined) {
        n.setAttribute('font-family', o.mono ? F.mono : F.display);
        n.setAttribute('letter-spacing', (o.sp || 0) * 100);
        n.textContent = str.replace(/ /g, NB);
        try { v = n.getComputedTextLength(); } catch (e) { v = 0; }
        if (!(v > 0)) v = str.length * (o.mono ? 60 : 58);
        cache[key] = v;
      }
      return v * size / 100;
    };
  }
  // 1 234,5 : espace fine insécable pour les milliers, virgule décimale
  function fnum(v, dec) {
    const s = Math.abs(v).toFixed(dec || 0).split('.');
    const i = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return (v < 0 ? '−' : '') + i + (s[1] ? ',' + s[1] : '');
  }
  // lie ponctuation et opérateurs au mot précédent (jamais de « ? » seul en début de ligne)
  const glue = (s) => String(s).replace(/ (?=[?:%!;€¢÷×=+−])/g, NB).replace(/([÷×=+−]) (?=\S)/g, '$1' + NB);
  // coupe `str` en ≤ maxRows lignes équilibrées tenant dans maxW (null si impossible)
  function breaks(str, S, maxW, wf, maxRows) {
    if (wf(str, S) <= maxW) return [str];
    const words = str.split(' ');
    if (words.length < 2 || maxRows < 2) return null;
    let best = null, bm = 1e9;
    for (let k = 1; k < words.length; k++) {
      const a = words.slice(0, k).join(' '), b = words.slice(k).join(' ');
      const m = Math.max(wf(a, S), wf(b, S));
      if (m < bm) { bm = m; best = [a, b]; }
    }
    if (bm <= maxW) return best;
    if (maxRows >= 3 && words.length >= 3) {
      bm = 1e9; best = null;
      for (let k = 1; k < words.length - 1; k++) for (let j = k + 1; j < words.length; j++) {
        const a = words.slice(0, k).join(' '), b = words.slice(k, j).join(' '), c = words.slice(j).join(' ');
        const m = Math.max(wf(a, S), wf(b, S), wf(c, S));
        if (m < bm) { bm = m; best = [a, b, c]; }
      }
      if (bm <= maxW) return best;
    }
    return null;
  }
  // fond plat + trame de points qui dérive doucement + repères de coupe aux angles
  function backdrop(root, bgk, uid, opt) {
    opt = opt || {};
    const tint = TINT[bgk] || TINT.ink;
    const fill = bgk === 'wheel' ? C.ink : colOf(bgk, C.ink);
    rect(root, 0, 0, 1920, 1080, 0, fill);
    const o = {};
    if (opt.dots !== false) {
      const defs = sv('defs', null, root);
      o.pat = sv('pattern', { id: uid + 'd', width: 64, height: 64, patternUnits: 'userSpaceOnUse' }, defs);
      circle(o.pat, 32, 32, 3.6, tint);
      rect(root, 0, 0, 1920, 1080, 0, `url(#${uid}d)`);
    }
    if (opt.marks !== false) {
      const mc = bgk === 'ink' || bgk === 'wheel' ? '#3A3A3A' : C.ink;
      path(root, 'M56 160V56H160M1760 56H1864V160M1864 920V1024H1760M160 1024H56V920', 'none', mc, 8, { 'stroke-linecap': 'butt', 'stroke-linejoin': 'miter' });
    }
    return o;
  }
  const drift = (o, t) => { if (o && o.pat) o.pat.setAttribute('patternTransform', `translate(${f2(t * 14)} ${f2(t * 9)})`); };
  // pastille Mono (kicker) : fond/texte selon l'aplat
  function pill(parent, str, bgk, size, W) {
    const dark = bgk === 'ink' || bgk === 'wheel';
    const fill = dark ? C.lime : C.ink;
    const tc = dark ? C.ink : (bgk === 'lime' ? C.lime : C.paper);
    const sp = 0.1;
    const w = W(str, size, { mono: true, sp }) + 64, h = size * 1.7;
    const gr = g(parent);
    rect(gr, -w / 2 + 7, -h / 2 + 7, w, h, 14, C.ink);
    rect(gr, -w / 2, -h / 2, w, h, 14, fill, C.ink, 5);
    text(gr, str, 0, size * 0.35, size, tc, { mono: true, anchor: 'middle', spacing: f2(sp * size) });
    return { g: gr, w, h };
  }
  // Définition d'un composant : `build` (une fois) / `draw` (pure). La mise en page dépend des mesures de police :
  // si les polices ne sont pas encore chargées à l'init, on reconstruit dès qu'elles le sont (puis on redessine).
  const FONTS = ['800 100px "Bricolage Grotesque"', '800 100px "JetBrains Mono"'];
  const fontsOk = () => { try { return FONTS.every((f) => document.fonts.check(f)); } catch (e) { return true; } };
  function defineTypo(id, impl) {
    const rebuild = (st) => {
      while (st.root.firstChild) st.root.removeChild(st.root.firstChild);
      st.s = impl.build(st.root, st.shot);
      st.ok = true;
      if (st.last !== null) impl.draw(st.s, st.last, st.shot);
    };
    ZV.define(id, {
      init(root, shot) {
        const st = { root, shot, last: null, ok: fontsOk() };
        st.s = impl.build(root, shot);
        if (!st.ok) { try { Promise.all(FONTS.map((f) => document.fonts.load(f))).then(() => { if (!st.ok && fontsOk()) rebuild(st); }); } catch (e) { /* tant pis */ } }
        return st;
      },
      update(st, t, shot) {
        st.last = t;
        if (!st.ok && fontsOk()) rebuild(st);
        impl.draw(st.s, t, shot || st.shot);
      }
    });
  }

  const FR = 1 / 30;
  const MARQ_DEFAULT = 'ZÉRO VERT · LA MAISON GAGNE TOUJOURS · ';
  // symboles des rouleaux de la machine à sous (dessinés à plat)
  function slotSymbol(parent, kind, cell) {
    const gr = g(parent);
    if (kind === 0) { circle(gr, 0, 0, cell * 0.32, C.lime, C.ink, 6); text(gr, '0', 0, cell * 0.17, cell * 0.46, C.ink, { mono: true, anchor: 'middle' }); }
    else if (kind === 1) { text(gr, '7', 0, cell * 0.28, cell * 0.8, C.red, { anchor: 'middle' }); }
    else if (kind === 2) { rect(gr, -cell * 0.36, -cell * 0.2, cell * 0.72, cell * 0.4, 10, C.ink); for (let k = -1; k <= 1; k++) line(gr, -cell * 0.24, k * cell * 0.1, cell * 0.24, k * cell * 0.1, C.paper, 5); }
    else if (kind === 3) { circle(gr, 0, 0, cell * 0.26, C.red, C.ink, 6); }
    else { rect(gr, -cell * 0.24, -cell * 0.24, cell * 0.48, cell * 0.48, 8, C.paper, C.ink, 6); }
    return gr;
  }

  defineTypo('chapter-card', {
    build(root, shot) {
      const P = shot.props || {};
      const next = P.variant === 'next';
      const bgk = P.bg === 'lime' ? 'lime' : 'ink';
      const dark = bgk === 'ink';
      const uid = 'cc' + (++UID);
      const W = mkProbe(root);
      const st = { shot, bgk, dark, next, uid, W };
      st.bd = backdrop(root, bgk, uid, { marks: false });
      const accent = dark ? C.lime : C.ink;           // couleur d'accent (stickers de repère)
      const onAccent = dark ? C.ink : C.lime;
      const fg = dark ? C.paper : C.ink;
      const cue = (n, d) => { const v = ZV.cue(shot, n); return v === null ? d : v; };

      // ---- fantôme géant (le « gros mot ») ----
      if (P.big) {
        const big = String(P.big).toUpperCase();
        const w100 = W(big, 100, { sp: -0.03 });
        const S = Math.min(780, 1760 / (w100 / 100));
        const gg = g(root);
        const tx = text(gg, big, 0, 0, S, 'none', { anchor: 'middle', spacing: f2(-0.03 * S) });
        tx.setAttribute('stroke', dark ? '#3C3C3C' : C.ink); tx.setAttribute('stroke-width', 4); if (!dark) tx.setAttribute('opacity', 0.3); tx.setAttribute('stroke-linejoin', 'round');
        st.ghost = { g: gg, y: 640 + 0.36 * S };
      }
      // ---- bandeau marquee en haut ----
      {
        const gm = g(root), sz = 38, sp = 0.06, MARQ = String(P.marquee || MARQ_DEFAULT);
        rect(gm, 0, 0, 1920, 88, 0, dark ? C.lime : C.ink);
        const unit = W(MARQ, sz, { mono: false, sp });
        const n = Math.ceil(1920 / unit) + 2;
        st.mq = { unit, node: text(gm, MARQ.repeat(n).replace(/ /g, NB), 0, 58, sz, dark ? C.ink : C.lime, { spacing: f2(sp * sz) }) };
        rect(gm, 0, 88, 1920, 8, 0, C.ink);
      }
      // ---- pastille / numéro ----
      const mkSticker = (str, fill, tcol, size, mono, tilt) => {
        const w = W(str, size, { mono, sp: mono ? 0.04 : 0 }) + 64, h = size * 1.75;
        const gr = g(root);
        rect(gr, -w / 2 + 10, -h / 2 + 10, w, h, 16, C.ink);
        rect(gr, -w / 2, -h / 2, w, h, 16, fill, C.ink, 6);
        text(gr, str, 0, size * 0.36, size, tcol, { mono, anchor: 'middle', spacing: mono ? f2(0.04 * size) : 0 });
        return { g: gr, w, h, tilt };
      };
      st.num = P.num ? mkSticker(String(P.num), accent, onAccent, 54, true, -3) : null;
      if (st.num) { st.num.x = 160 + st.num.w / 2; st.num.y = 196; }
      if (next) {
        st.kick = mkSticker(String(P.kick || 'PROCHAIN ÉPISODE').toUpperCase(), C.paper, C.ink, 46, true, 2);
        st.kick.x = 160 + st.kick.w / 2; st.kick.y = 236;
        if (st.num) { st.num.x = 160 + st.num.w / 2; st.num.y = 720; }
      }

      // ---- titre : mot par mot ----
      const title = String(P.title || '').replace(/ (?=[?:!;])/g, NB);
      const wf = (s, S) => W(s, S, { sp: -0.03 });
      const maxW = next ? 920 : 1560;
      let S = next ? 300 : 200, rows = null;
      for (; S > 60; S *= 0.96) { rows = breaks(title, S, maxW, wf, next ? 1 : 2); if (rows && (rows.length - 1) * 1.0 * S + 0.74 * S <= (next ? 400 : 330)) break; rows = null; }
      if (!rows) { S = 60; rows = [title]; }
      const th = (rows.length - 1) * 1.0 * S + 0.74 * S;
      const top = next ? 390 : 290;
      st.words = [];
      let wi = 0;
      const nWords = title.split(' ').length;
      rows.forEach((row, ri) => {
        const words = row.split(' ');
        let acc = '';
        words.forEach((wd, k) => {
          const wx = 160 + wf(acc, S), ww = wf(wd, S);
          const by = top + 0.74 * S + ri * S;
          const gr = g(root);
          const last = ++wi === nWords;
          if (last) {
            rect(gr, -ww / 2 - 16 + 10, -0.47 * S + 10, ww + 32, 1.12 * S, 16, C.ink);
            rect(gr, -ww / 2 - 16, -0.47 * S, ww + 32, 1.12 * S, 16, accent, C.ink, 6);
          }
          text(gr, wd.replace(/ /g, NB), -ww / 2, 0.37 * S, S, last ? onAccent : fg, { spacing: f2(-0.03 * S) });
          st.words.push({ g: gr, x: wx + ww / 2, y: by - 0.37 * S, i: st.words.length });
          acc += wd + ' ';
        });
      });
      st.tTitle = cue('title', next ? 0 : 0.3);
      const bottom = top + th;

      // ---- légende (cap), sticker de repère, onglets ----
      if (P.cap && !next) {
        st.cap = mkSticker(String(P.cap), C.paper, C.ink, 54, false, 2);
        st.cap.x = 160 + st.cap.w / 2; st.cap.y = bottom + 122;
        st.tCap = cue('cap', st.tTitle + 0.35 + 0.11 * nWords + 0.4);
      }
      const sb = shot.beats.find((b) => b.do === 'cue' && b.name === 'sticker');
      if (sb && sb.text && !next) {
        st.stk = mkSticker(String(sb.text).toUpperCase(), accent, onAccent, 54, false, 4);
        st.stk.x = 1920 - 150 - st.stk.w / 2; st.stk.y = bottom + 122; st.tStk = sb.t;
      }
      const tb = shot.beats.find((b) => b.do === 'cue' && b.name === 'tabs');
      if (tb && !next) {
        st.tabs = (tb.tabs || ['S1', 'S2', 'S3', 'S4']).map((s, i) => {
          const gr = g(root);
          rect(gr, -58 + 7, -32 + 7, 116, 64, 12, C.ink);
          rect(gr, -58, -32, 116, 64, 12, C.paper, C.ink, 5);
          text(gr, String(s), 0, 14, 38, C.ink, { mono: true, anchor: 'middle' });
          return { g: gr, x: 160 + 58 + i * 136, y: bottom + 232, t: tb.t + i * 0.12 };
        });
      }

      // ---- variante « prochain épisode » : machine à sous ----
      if (next) {
        const gs = g(root), body = g(gs);
        rect(body, -270 + 16, -250 + 16, 540, 500, 36, C.ink);
        rect(body, -270, -250, 540, 500, 36, C.red, C.ink, 8);
        rect(body, -230, -226, 460, 70, 18, C.ink);
        text(body, String(P.brand || 'ZÉRO VERT'), 0, -176, 44, C.lime, { mono: true, anchor: 'middle', spacing: 4 });
        const wx = -216, wy = -128, ww = 432, wh = 230;
        rect(body, wx - 10, wy - 10, ww + 20, wh + 20, 22, C.ink);
        rect(body, wx, wy, ww, wh, 14, C.paper);
        const clipId = uid + 'c';
        const defs = sv('defs', null, gs);
        const cp = sv('clipPath', { id: clipId }, defs); rect(cp, wx, wy, ww, wh, 14);
        const reelsG = g(gs, { 'clip-path': `url(#${clipId})` });
        const cell = 118, N = 5, seqs = [[1, 0, 2, 3, 4], [0, 2, 1, 4, 3], [3, 1, 0, 2, 4]];
        st.reels = seqs.map((seq, k) => {
          const rx = wx + ww / 6 + k * (ww / 3);
          const col = g(reelsG);
          for (let c = 0; c < N * 2; c++) { const sg = slotSymbol(col, seq[c % N], cell); sg.setAttribute('transform', `translate(0 ${c * cell})`); }
          col.setAttribute('data-x', rx);
          if (k > 0) line(gs, wx + k * (ww / 3), wy, wx + k * (ww / 3), wy + wh, C.ink, 5);
          return { col, x: rx, cell, N, v: [640 + k * 130, 1500 + k * 210] };
        });
        rect(gs, wx, wy, ww, wh, 14, 'none', C.ink, 6);
        // ligne de gain + plateau
        line(gs, wx - 22, wy + wh / 2, wx + 22, wy + wh / 2, C.lime, 8);
        line(gs, wx + ww - 22, wy + wh / 2, wx + ww + 22, wy + wh / 2, C.lime, 8);
        rect(gs, -200, 130, 400, 60, 14, C.ink);
        circle(gs, -120, 160, 14, C.lime); circle(gs, 0, 160, 14, C.paper); circle(gs, 120, 160, 14, C.red);
        // levier
        st.lever = g(gs);
        line(st.lever, 0, 0, 0, -150, C.ink, 14);
        circle(st.lever, 0, -160, 30, C.lime, C.ink, 7);
        st.lever.setAttribute('data-x', 300);
        st.slot = gs; st.tSlot = cue('slot', 1.5); st.tReels = ZV.cue(shot, 'reels');
        st.reelsG = reelsG;
      }
      return st;
    },

    draw(st, t, shot) {
      drift(st.bd, t);
      const dark = st.dark;
      // marquee
      st.mq.node.setAttribute('x', f2(-((t * 140) % st.mq.unit)));
      // fantôme
      if (st.ghost) {
        const q = clamp(t / 0.35), s = lerp(1.25, 1, ZV.E.out3(q));
        const [sx, sy] = ZV.shakeAt(t, 0.12, 10, 0.4);
        put(st.ghost.g, 960 + lerp(46, -46, clamp(t / shot.dur)) + sx, st.ghost.y + sy, 0, s, s, t >= 0.02 ? 1 : 0);
      }
      const pop = (o, tp, extraRot) => { if (!o) return; const p = ZV.E.back(clamp((t - tp) / (8 * FR))); put(o.g, o.x, o.y, (o.tilt || 0) + (1 - p) * (extraRot || -6), p, p, t >= tp ? 1 : 0); };
      pop(st.num, 0.05);
      pop(st.kick, 0.0);
      // titre
      for (const w of st.words) {
        const tw = st.tTitle + w.i * 0.11, tt = t - tw;
        if (tt < 0) { put(w.g, w.x, w.y, 0, 1, 1, 0); continue; }
        const p = clamp(tt / (4 * FR)), s = lerp(2.1, 1, ZV.E.out3(p));
        const [sx, sy] = ZV.shakeAt(tt, 4 * FR, 8, 0.3);
        put(w.g, w.x + sx, w.y + sy, 0, s, s, 1);
      }
      pop(st.cap, st.tCap || 0);
      pop(st.stk, st.tStk || 0, 8);
      if (st.tabs) for (const tb of st.tabs) pop(tb, tb.t, 0);
      // machine à sous
      if (st.slot) {
        const ts = st.tSlot, q = clamp((t - ts) / (10 * FR));
        const y = lerp(-420, 500, q < 1 ? ZV.E.in2(q) : 1);
        let yy = y;
        if (t > ts + 10 * FR) { const b = (t - ts - 10 * FR); yy = 500 + (b < 0.35 ? -26 * Math.exp(-b * 9) * Math.abs(Math.sin(b * 16)) : 0); }
        put(st.slot, 1420, yy, t >= ts ? 2.5 : 0, 1.1, 1.1, t >= ts ? 1 : 0);
        for (const r of st.reels) {
          const span = r.cell * r.N, t0 = ts + 0.2;
          const tr = st.tReels !== null && st.tReels !== undefined ? st.tReels : 1e9;
          const d1 = Math.max(0, Math.min(t, tr) - t0), d2 = Math.max(0, t - tr);
          const pos = (r.v[0] * d1 + r.v[1] * d2) % span;
          r.col.setAttribute('transform', `translate(${r.x} ${f2(-(pos) - r.cell * 0.5)})`);
        }
        // levier : tiré au repère « reels », relâché ensuite
        const tr = st.tReels;
        let pull = 0; if (tr !== null && tr !== undefined) { const q2 = t - tr; pull = q2 < 0 ? 0 : q2 < 0.18 ? q2 / 0.18 : Math.max(0, 1 - (q2 - 0.18) / 0.3); }
        put(st.lever, 300, -60 + 70 * pull, 0, 1, 1 - 0.0 * pull, 1);
        st.lever.setAttribute('transform', `translate(300 ${f2(-50 + 60 * pull)}) scale(1 ${f2(1 - 0.55 * pull)})`);
      }
    }
  });
})();
