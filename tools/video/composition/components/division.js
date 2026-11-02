// Composant « division » : voir tools/video/composition/INTERFACE.md. Fonction pure du temps du plan, aplats seulement.
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
  const SPD = -0.02;

  defineTypo('division', {
    build(root, shot) {
      const P = shot.props || {};
      const uid = 'dv' + (++UID);
      const W = mkProbe(root);
      const st = { shot, uid, W };
      st.bd = backdrop(root, 'ink', uid, {});
      const cue = (n, d) => { const v = ZV.cue(shot, n); return v === null ? d : v; };
      const wf = (s, S) => W(s, S, { sp: SPD });
      const eq = String(P.equation || '36 ÷ 37').split(/\s+/);       // ["36", "÷", "37"]
      const resStr = String(P.result || '0,973');
      st.t = { eq: cue('equation', 0), result: cue('result', 1.6), coin: cue('coin', 2), bar: cue('bar', 3.1), keep: cue('keep', 4.1), split: cue('split', 7), gapLabel: cue('gap-label', 8.5) };

      // ---- équation (jeton par jeton), taille 220 ----
      const BS = 220, gap = 46;
      const ew = eq.map((s) => wf(s, BS));
      const eqTotal = ew.reduce((a, b) => a + b, 0) + gap * (eq.length - 1);
      st.eqG = g(root);
      let x = -eqTotal / 2;
      st.eqTok = eq.map((s, i) => {
        const gr = g(st.eqG);
        const op = !/\d/.test(s);
        text(gr, s, -ew[i] / 2, 0.36 * BS, BS, op ? C.lime : C.paper, { spacing: f2(SPD * BS) });
        const o = { g: gr, x: x + ew[i] / 2, i };
        x += ew[i] + gap;
        return o;
      });
      st.eqTotal = eqTotal; st.BS = BS;
      // ---- résultat « = 0,973 » (taille 130) qui roule ----
      const RS = 130, rs = RS / BS;
      const dw = Math.max(...'0123456789'.split('').map((d) => wf(d, RS)));
      const cw = (ch) => (/\d/.test(ch) ? dw : wf(ch, RS));
      const eqW = eqTotal * rs, eqSignW = wf('=', RS), resChars = resStr.split('');
      const resW = resChars.reduce((a, ch) => a + cw(ch), 0);
      const rowTotal = eqW + 40 + eqSignW + 44 + resW;
      st.rowY = 178;
      const rx0 = 960 - rowTotal / 2;
      st.eqFinal = { x: rx0 + eqW / 2, y: st.rowY, s: rs };
      st.resG = g(root, { transform: `translate(0 ${st.rowY})` });
      text(st.resG, '=', rx0 + eqW + 40, 0.36 * RS, RS, C.paper, { spacing: f2(SPD * RS) });
      let cx = rx0 + eqW + 40 + eqSignW + 44;
      st.resDigits = resChars.map((ch, i) => {
        const nd = text(st.resG, ch, cx + cw(ch) / 2, 0.36 * RS, RS, C.lime, { anchor: 'middle', spacing: f2(SPD * RS) });
        const o = { n: nd, ch, i, isD: /\d/.test(ch) };
        cx += cw(ch);
        return o;
      });
      // plaque lime derrière le résultat une fois posé
      st.resPlateX = rx0 + eqW + 40 + eqSignW + 44 - 22; st.resPlateW = resW + 44;
      st.resPlate = rect(st.resG, st.resPlateX + 10, 0.36 * RS - 0.82 * RS + 10, st.resPlateW, 1.0 * RS, 16, C.ink);
      st.resG.insertBefore(st.resPlate, st.resG.firstChild);
      st.resPlate2 = rect(st.resG, st.resPlateX, 0.36 * RS - 0.82 * RS, st.resPlateW, 1.0 * RS, 16, C.lime, C.ink, 6);
      st.resG.insertBefore(st.resPlate2, st.resPlate.nextSibling);
      st.resRS = RS;

      // ---- pièce → barre ----
      const BY = 568, BH = 190, BW = 1300;
      st.BY = BY; st.BH = BH; st.BW = BW;
      const defs = sv('defs', null, root);
      const mkPiece = (side) => {
        const clip = sv('clipPath', { id: uid + side }, defs);
        const cr = rect(clip, 0, 0, 10, 10);
        const gr = g(root, { 'clip-path': `url(#${uid}${side})` });
        const sh = rect(gr, 0, 0, 10, 10, 95, C.ink);
        const body = rect(gr, 0, 0, 10, 10, 95, C.white);
        const ov = null;
        const bd = rect(gr, 0, 0, 10, 10, 95, 'none', C.ink, 8);
        const cut = line(gr, 0, 0, 0, 0, C.ink, 6, { 'stroke-linecap': 'butt' });
        return { g: gr, clip: cr, sh, body, ov, bd, cut };
      };
      st.pL = mkPiece('L'); st.pR = mkPiece('R');
      st.brace = path(root, '', 'none', C.lime, 12, { 'stroke-linecap': 'butt' });
      st.coinTxt = text(root, '1 €', 960, BY + 0.36 * 84, 84, C.ink, { anchor: 'middle', spacing: f2(SPD * 84) });
      st.keepTxt = text(root, P.keep || '97,3 ¢', 960, BY + 0.36 * 120, 120, C.ink, { anchor: 'middle', spacing: f2(SPD * 120) });
      // étiquettes
      const mkSticker = (str, fill, tcol, size, mono, w0) => {
        const w = W(str, size, { mono, sp: mono ? 0.04 : 0 }) + 64, h = size * 1.75, gr = g(root);
        rect(gr, -w / 2 + 10, -h / 2 + 10, w, h, 16, C.ink); rect(gr, -w / 2, -h / 2, w, h, 16, fill, C.ink, 6);
        text(gr, str, 0, size * 0.36, size, tcol, { mono, anchor: 'middle', spacing: mono ? f2(0.04 * size) : 0 });
        return { g: gr, w, h };
      };
      st.barLabel = mkSticker(String(P.bar_label || '1 € = 100 ¢'), C.paper, C.ink, 52, true);
      st.gapSt = mkSticker(String(P.gap || '2,7 ¢'), C.lime, C.ink, 60, false);
      st.gapLabel = mkSticker(String(P.gap_label || 'L’AVANTAGE DE LA MAISON').toUpperCase(), C.paper, C.ink, 46, false);
      return st;
    },

    draw(st, t, shot) {
      drift(st.bd, t);
      const T = st.t, E = ZV.E;
      // ---------- équation ----------
      const q = clamp((t - T.result) / 0.5), qe = E.io3(q);
      const ef = st.eqFinal;
      for (const tk of st.eqTok) {
        const t0 = T.eq + tk.i * 0.3, tt = t - t0;
        if (tt < 0) { put(tk.g, tk.x, -300, 0, 1, 1, 0); continue; }
        const p = clamp(tt / 0.55), y = lerp(-300, 0, E.bounce(p));
        put(tk.g, tk.x, y, 0, 1, 1, 1);
      }
      // groupe de l'équation : centre (960,470) -> rangée du haut
      const gx = lerp(960, ef.x, qe), gy = lerp(480, ef.y, qe), gs = lerp(1, ef.s, qe);
      st.eqG.setAttribute('transform', `translate(${f2(gx)} ${f2(gy)}) scale(${f2(gs)})`);
      // ---------- résultat qui roule ----------
      const tr = T.result + 0.25;
      const RS = st.resRS;
      st.resG.setAttribute('visibility', t >= tr ? 'visible' : 'hidden');
      let allIn = 0;
      for (const d of st.resDigits) {
        if (!d.isD) continue;
        const dq = clamp((t - (tr + d.i * 0.13)) / 0.6);
        const fin = parseInt(d.ch, 10);
        const shift = Math.floor(18 * Math.pow(1 - dq, 1.6));
        d.n.textContent = String((fin + shift) % 10);
        d.n.setAttribute('transform', `translate(0 ${f2(Math.sin(t * 60 + d.i) * (1 - dq) * 10)})`);
        allIn = Math.max(allIn, dq);
      }
      const doneT = tr + st.resDigits.length * 0.13 + 0.6;
      const pq = E.out3(clamp((t - doneT) / 0.2));
      st.resPlate.setAttribute('visibility', pq > 0 ? 'visible' : 'hidden');
      st.resPlate2.setAttribute('visibility', pq > 0 ? 'visible' : 'hidden');
      for (const d of st.resDigits) d.n.setAttribute('fill', pq > 0.5 ? C.ink : C.lime);
      // ---------- pièce / barre ----------
      const cy = st.BY, bh = st.BH, bw0 = bh, cp = clamp((t - T.coin) / (8 * FR));
      const bp = E.out3(clamp((t - T.bar) / 0.5));
      const w = lerp(bw0, st.BW, bp);
      const coinOn = t >= T.coin;
      const shk = ZV.shakeAt(t, T.split, 6, 0.35);
      const scl = coinOn ? lerp(0.2, 1, E.back(cp)) : 0;
      const left = 960 - w / 2 + shk[0], top = cy - bh / 2 + (t >= T.bar ? shk[1] : 0);
      const cutX = left + w * 0.973;
      const split = t >= T.split;
      const sp = E.back(clamp((t - T.split - 0.1) / 0.55));
      // placer les rectangles d'une pièce (dx : décalage de la lamelle)
      const place = (pc, side) => {
        const r = pc;
        const sx = side === 'R' ? sp * 150 : 0, sy = side === 'R' ? sp * 26 : 0, rot = side === 'R' ? sp * 9 : 0;
        r.g.setAttribute('transform', side === 'R' ? `translate(${f2(cutX + sx)} ${f2(cy + sy)}) rotate(${f2(rot)}) translate(${f2(-cutX)} ${f2(-cy)})` : '');
        // le grossissement de la pièce : scale autour du centre
        const ww = w * (coinOn ? scl : 0) , hh = bh * scl;
        const L = 960 - ww / 2 + shk[0], Tt = cy - hh / 2 + (t >= T.bar ? shk[1] : 0), cutXs = L + ww * 0.973;
        for (const [node, ox] of [[r.sh, 12], [r.body, 0], [r.bd, 0]]) { node.setAttribute('x', f2(L + ox)); node.setAttribute('y', f2(Tt + ox)); node.setAttribute('width', f2(Math.max(0.01, ww))); node.setAttribute('height', f2(Math.max(0.01, hh))); node.setAttribute('rx', f2(Math.min(hh / 2, lerp(bh / 2, 28, bp) * scl))); }
        if (side === 'R') { r.g.setAttribute('transform', `translate(${f2(sx)} ${f2(sy)}) rotate(${f2(rot)} ${f2(cutXs + 18)} ${f2(cy)})`); }
        const cx0 = side === 'L' ? L - 40 : cutXs, cw0 = side === 'L' ? cutXs - (L - 40) : ww + 60;
        r.clip.setAttribute('x', f2(cx0)); r.clip.setAttribute('y', f2(Tt - 30)); r.clip.setAttribute('width', f2(Math.max(0, cw0 + (side === 'L' ? 0 : 0)))); r.clip.setAttribute('height', f2(hh + 80));
        r.cut.setAttribute('x1', f2(cutXs)); r.cut.setAttribute('x2', f2(cutXs)); r.cut.setAttribute('y1', f2(Tt - 4)); r.cut.setAttribute('y2', f2(Tt + hh + 4));
        r.cut.setAttribute('visibility', split ? 'visible' : 'hidden');
        return { L, Tt, ww, hh, cutXs };
      };
      const gl = place(st.pL, 'L'), gr_ = place(st.pR, 'R');
      st.pL.g.setAttribute('visibility', coinOn ? 'visible' : 'hidden');
      st.pR.g.setAttribute('visibility', coinOn ? 'visible' : 'hidden');
      // accolade lime sous la barre : « ce qui te revient » (97,3 %)
      const kq = E.out3(clamp((t - T.keep) / 0.5));
      {
        const x1 = gl.L + 14, x2 = x1 + (gl.cutXs - gl.L - 30) * kq, yb = gl.Tt + gl.hh + 46;
        st.brace.setAttribute('d', `M${f2(x1)} ${f2(yb - 26)}V${f2(yb)}H${f2(x2)}${kq > 0.98 ? `V${f2(yb - 26)}` : ''}`);
        st.brace.setAttribute('visibility', kq > 0 ? 'visible' : 'hidden');
      }
      // la lamelle devient lime au moment de la coupe
      st.pR.body.setAttribute('fill', split ? C.lime : C.white);
      // pièce : « 1 € » qui s'efface quand la barre s'étire
      st.coinTxt.setAttribute('x', 960 + shk[0]);
      st.coinTxt.setAttribute('opacity', f2(clamp(1 - bp * 3)));
      st.coinTxt.setAttribute('visibility', coinOn && bp < 0.34 ? 'visible' : 'hidden');
      st.coinTxt.setAttribute('transform', `translate(960 ${f2(st.BY)}) scale(${f2(scl)}) translate(-960 ${f2(-st.BY)})`);
      // texte 97,3 ¢
      const keepOn = kq > 0.55;
      const kx = (gl.L + gl.cutXs) / 2;
      st.keepTxt.setAttribute('visibility', keepOn ? 'visible' : 'hidden');
      st.keepTxt.setAttribute('x', f2(kx));
      const kp = E.back(clamp((t - T.keep - 0.25) / 0.3));
      st.keepTxt.setAttribute('transform', `translate(${f2(kx)} ${f2(cy)}) scale(${f2(lerp(0.5, 1, kp))}) translate(${f2(-kx)} ${f2(-cy)})`);
      // étiquette « 1 € = 100 ¢ » au-dessus de la barre
      const lp = E.back(clamp((t - T.bar - 0.15) / (8 * FR)));
      put(st.barLabel.g, 960 - st.BW / 2 + st.barLabel.w / 2 + 10, st.BY - bh / 2 - 66, -2, lp, lp, t >= T.bar + 0.15 ? 1 : 0);
      // sticker « 2,7 ¢ » sur la lamelle, puis étiquette « L’AVANTAGE DE LA MAISON »
      const sx = 960 + st.BW / 2 - 6;
      const gp = E.back(clamp((t - T.split - 0.35) / (8 * FR)));
      put(st.gapSt.g, sx + 130, st.BY - bh / 2 - 74, 5, gp, gp, t >= T.split + 0.35 ? 1 : 0);
      const lq = E.back(clamp((t - T.gapLabel) / (8 * FR)));
      put(st.gapLabel.g, sx - st.gapLabel.w / 2 + 70, st.BY + bh / 2 + 120, -2, lq, lq, t >= T.gapLabel ? 1 : 0);
    }
  });
})();
