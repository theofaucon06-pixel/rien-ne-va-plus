// Composant « logo-reveal » : voir tools/video/composition/INTERFACE.md. Fonction pure du temps du plan, aplats seulement.
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

  /* ---- dessin du logo ZÉRO VERT (repris de assets/podcast/logo.svg et mark.svg) ---- */
  const ZERO_D = 'M328 14L328 14Q258 14 202 -8Q146 -30 107 -73Q68 -116 48 -180Q27 -244 27 -327L27 -327Q27 -445 66 -521Q104 -598 174 -636Q243 -674 334 -674L334 -674Q404 -674 460 -652Q515 -631 554 -588Q593 -545 614 -480Q634 -416 634 -331L634 -331Q634 -245 613 -180Q591 -115 551 -72Q510 -29 454 -7Q397 14 328 14M334 -119L334 -119Q379 -119 409 -141Q438 -164 453 -209Q467 -255 467 -324L467 -324Q467 -397 452 -445Q436 -493 406 -517Q375 -542 329 -542L329 -542Q285 -542 255 -518Q225 -495 210 -448Q195 -401 195 -331L195 -331Q195 -278 204 -238Q212 -198 230 -171Q247 -145 273 -132Q299 -119 334 -119';
  const LETTERS = [[0,'M337 0L14 0L14 -121L178 -532L178 -535L14 -535L14 -660L334 -660L334 -539L169 -129L169 -125L337 -125L337 0'],[343,'M175 0L20 0L20 -660L175 -660L175 0M312 0L130 0L130 -126L312 -126L312 0M286 -278L130 -278L130 -393L286 -393L286 -278M312 -534L130 -534L130 -660L312 -660L312 -534M295 -804L211 -695L86 -695L140 -804L295 -804'],[657,'M174 0L20 0L20 -660L202 -660Q236 -660 267 -652Q298 -645 324 -629Q349 -613 368 -590Q387 -567 398 -535Q408 -504 408 -464L408 -464Q408 -431 400 -402Q392 -373 375 -350Q357 -328 331 -312Q305 -297 269 -291L269 -291L269 -282Q322 -280 349 -260Q376 -240 387 -206Q398 -173 403 -129L403 -129L420 0L260 0L251 -106Q248 -140 243 -167Q238 -195 225 -211Q211 -227 181 -228L181 -228L174 -228L174 0M174 -537L174 -330L186 -330Q220 -330 237 -356Q253 -382 253 -440L253 -440Q253 -493 239 -515Q225 -537 194 -537L194 -537L174 -537'],[1078,'M328 14L328 14Q258 14 202 -8Q146 -30 107 -73Q68 -116 48 -180Q27 -244 27 -327L27 -327Q27 -445 66 -521Q104 -598 174 -636Q243 -674 334 -674L334 -674Q404 -674 460 -652Q515 -631 554 -588Q593 -545 614 -480Q634 -416 634 -331L634 -331Q634 -245 613 -180Q591 -115 551 -72Q510 -29 454 -7Q397 14 328 14M334 -119L334 -119Q379 -119 409 -141Q438 -164 453 -209Q467 -255 467 -324L467 -324Q467 -397 452 -445Q436 -493 406 -517Q375 -542 329 -542L329 -542Q285 -542 255 -518Q225 -495 210 -448Q195 -401 195 -331L195 -331Q195 -278 204 -238Q212 -198 230 -171Q247 -145 273 -132Q299 -119 334 -119'],[1881,'M327 0L109 0L4 -660L168 -660L217 -134L224 -134L281 -660L440 -660L327 0'],[2317,'M175 0L20 0L20 -660L175 -660L175 0M312 0L130 0L130 -126L312 -126L312 0M286 -278L130 -278L130 -393L286 -393L286 -278M312 -534L130 -534L130 -660L312 -660L312 -534'],[2631,'M174 0L20 0L20 -660L202 -660Q236 -660 267 -652Q298 -645 324 -629Q349 -613 368 -590Q387 -567 398 -535Q408 -504 408 -464L408 -464Q408 -431 400 -402Q392 -373 375 -350Q357 -328 331 -312Q305 -297 269 -291L269 -291L269 -282Q322 -280 349 -260Q376 -240 387 -206Q398 -173 403 -129L403 -129L420 0L260 0L251 -106Q248 -140 243 -167Q238 -195 225 -211Q211 -227 181 -228L181 -228L174 -228L174 0M174 -537L174 -330L186 -330Q220 -330 237 -356Q253 -382 253 -440L253 -440Q253 -493 239 -515Q225 -537 194 -537L194 -537L174 -537'],[3052,'M265 0L111 0L111 -660L265 -660L265 0M370 -535L5 -535L5 -660L370 -660L370 -535']];   // [x, d] en unités du logo, origine (1016, 770), lettres Z É R O V E R T
  const LET_CX = [171, 500, 867, 1408, 2103, 2474, 2841, 3239];
  const LK = { w: 4438, h: 920, top: -40, wx: 1016, wy: 770 };
  const BALL_REST = { x: 331, y: -240, r: 94 };
  // hauteur de la bille au-dessus de sa position de repos (chute puis trois rebonds), t en secondes depuis le lâcher
  function ballLift(t, H) {
    const seg = [[0.36, H], [0.26, H * 0.2], [0.17, H * 0.075], [0.11, H * 0.028]];
    let a = 0;
    for (let i = 0; i < seg.length; i++) {
      const d = seg[i][0], h = seg[i][1];
      if (t < a + d) { const u = (t - a) / d; return i === 0 ? h * (1 - u * u) : h * (1 - Math.pow(2 * u - 1, 2)); }
      a += d;
    }
    return 0;
  }
  const BALL_DUR = 0.9;
  // la marque (carré lime + « 0 » + bille), dans un repère 512×512 ; renvoie { g, ball }
  function mkMark(parent, ballOn) {
    const gr = g(parent);
    rect(gr, 12, 12, 488, 488, 116, C.lime, C.ink, 24);
    const z = g(gr, { transform: 'translate(77.3 440.43) scale(0.54)' });
    path(z, ZERO_D, C.ink);
    const ball = circle(z, BALL_REST.x, BALL_REST.y, BALL_REST.r, C.white, C.ink, 16);
    return { g: gr, ball, z };
  }
  // mot-symbole : lettres séparées (groupes centrés sur leur milieu, repère du logo)
  function mkWord(parent, fill) {
    const gr = g(parent), letters = [];
    LETTERS.forEach(([x, d], i) => {
      const lg = g(gr);
      path(lg, d, fill || C.ink, null, 0, { transform: `translate(${x - LET_CX[i]} 330)` });
      if (i === 3) circle(lg, 1395 - LET_CX[i], -240 + 330, 93, C.white, C.ink, 18);
      letters.push({ g: lg, cx: LET_CX[i] + LK.wx, cy: LK.wy - 330 });
    });
    return { g: gr, letters };
  }

  const FR = 1 / 30;

  defineTypo('logo-reveal', {
    build(root, shot) {
      const P = shot.props || {};
      const outro = P.mode === 'outro';
      const bgk = P.bg === 'lime' || (outro && P.bg !== 'ink') ? 'lime' : 'ink';
      const uid = 'lg' + (++UID);
      const W = mkProbe(root);
      const st = { shot, outro, bgk, uid, W };
      const cue = (n, d) => { const v = ZV.cue(shot, n); return v === null ? d : v; };
      st.bd = backdrop(root, outro ? 'lime' : bgk, uid, { marks: false });
      if (!outro) {
        // ---- intro : la case zéro grandit en iris, le carré se forme, la bille tombe, le mot s'écrit ----
        st.t = { iris: cue('iris', 0.5), ball: cue('ball', 1.7), word: cue('word', 2.4), tag: cue('tagline', 3.5) };
        st.pocket = g(root);
        circle(st.pocket, 0, 0, 92, C.lime, C.paper, 8);
        text(st.pocket, '0', 0, 24, 66, C.ink, { mono: true, anchor: 'middle' });
        st.irisC = circle(root, 960, 540, 10, C.lime);
        // lockup : marque (gauche) + mot-symbole, à l'échelle k
        const k = 1560 / LK.w; st.k = k;
        st.lx = 180; st.ly = 330;
        st.mark = mkMark(root);
        st.word = mkWord(root, C.ink);
        // légende (tagline) en Mono
        const tag = String(P.tagline || 'Le podcast qui t’explique comment la maison gagne.');
        const size = 44;
        st.tag = tag; st.tagW = W(tag, size, { mono: true });
        st.tagNode = text(root, '', 960 - st.tagW / 2, st.ly + (LK.h + LK.top * 0) * k + 70 + 40, size, C.ink, { mono: true });
        st.tagNode.setAttribute('style', 'white-space:pre');
        st.tagBar = rect(root, 960 - st.tagW / 2, st.ly + LK.h * k + 70 + 52, 10, 6, 0, C.ink);
        st.tagCursor = rect(root, 0, 0, size * 0.32, size * 0.9, 0, C.ink);
        st.size = size;
        return st;
      }
      // ---- outro : gros 0 ink sur lime, la bille tombe dedans, le mot-symbole claque, trait blanc souligné ----
      st.t = { ball: cue('ball', 1.1), word: cue('word', 2.7), under: cue('underline', 3.9) };
      st.z = g(root);
      const zs = 0.6;
      st.zs = zs;
      // le « 0 » est centré sur (960, 320) : sa boîte va de y = -674 à 14 (unités) et de x = 27 à 634
      st.zc = { x: 960, y: 320 };
      st.zx = 960 - 331 * zs; st.zy = 320 + 330 * zs;
      const zg = g(st.z, { transform: `translate(${f2(-331 * zs)} ${f2(330 * zs)}) scale(${zs})` });
      path(zg, ZERO_D, C.ink);
      st.ball = circle(g(root), 0, 0, BALL_REST.r, C.white, C.ink, 16);
      st.ballG = st.ball.parentNode;
      st.ball.setAttribute('transform', '');
      // mot-symbole : une seule ligne centrée
      const ks = 1500 / (LK.w - LK.wx); st.ks = ks;
      st.wordG = g(root);
      st.word = mkWord(st.wordG, C.ink);
      st.wy0 = 850;
      st.underR = rect(root, 0, 0, 10, 24, 6, C.white, C.ink, 6);
      return st;
    },

    draw(st, t, shot) {
      drift(st.bd, t);
      const E = ZV.E;
      if (!st.outro) {
        const T = st.t, k = st.k;
        // case zéro (avant l'iris) : pulsation douce
        const before = t < T.iris;
        const pulse = 1 + 0.06 * Math.sin(t * 9);
        put(st.pocket, 960, 540, 0, pulse, pulse, before ? 1 : 0);
        // iris lime (10 i)
        const iq = clamp((t - T.iris) / (10 * FR));
        const r = lerp(92, 1320, E.in2(iq));
        st.irisC.setAttribute('r', f2(r)); st.irisC.setAttribute('visibility', t >= T.iris ? 'visible' : 'hidden');
        const iEnd = T.iris + 10 * FR;
        // marque : se forme (pop) après l'iris, puis glisse vers sa place dans le lockup au début du mot
        const mq = E.back(clamp((t - (iEnd + 0.05)) / (10 * FR)));
        const ms0 = 440 / 512, msFinal = (880 * k) / 512;
        const sl = E.io3(clamp((t - (T.word - 0.32)) / 0.36));
        const sc = lerp(ms0, msFinal, sl);
        const mcx = lerp(960, st.lx + 440 * k, sl), mcy = lerp(420, st.ly + 480 * k, sl);
        const pop = t >= iEnd + 0.05 ? lerp(0.35, 1, mq) : 0;
        st.mark.g.setAttribute('transform', `translate(${f2(mcx)} ${f2(mcy)}) scale(${f2(Math.max(0.0001, sc * pop))}) translate(-256 -256)`);
        st.mark.g.setAttribute('visibility', t >= iEnd + 0.05 ? 'visible' : 'hidden');
        // bille : chute puis trois rebonds dans le « 0 »
        const lift = t < T.ball ? 900 : ballLift(t - T.ball, 900);
        st.mark.ball.setAttribute('cy', f2(BALL_REST.y - lift));
        st.mark.ball.setAttribute('visibility', t >= T.ball - 0.0 ? 'visible' : 'hidden');
        // mot-symbole : lettre par lettre, 3 i d'écart, rotation aléatoire qui se redresse
        const rg = ZV.rng(21);
        st.word.letters.forEach((l, i) => {
          const rot = (rg() * 24 - 12), t0 = T.word + i * 3 * FR, p = clamp((t - t0) / (8 * FR));
          const pb = E.back(p);
          const px = st.lx + (l.cx) * k, py = st.ly + (l.cy + 40) * k;
          const s = lerp(0.2, 1, pb) * k;
          put(l.g, px, py + (1 - p) * 40, rot * (1 - E.out3(p)), s, s, t >= t0 ? 1 : 0);
        });
        // légende Mono : s'écrit (caractère par caractère, calée dans le temps restant)
        const win = Math.max(0.2, shot.dur - T.tag - 0.12), per = Math.min(2 * FR, win / st.tag.length);
        const kk = t < T.tag ? 0 : Math.min(st.tag.length, Math.floor((t - T.tag) / per) + 1);
        st.tagNode.textContent = st.tag.slice(0, kk).replace(/ /g, NB);
        const wk = kk ? st.W(st.tag.slice(0, kk), st.size, { mono: true }) : 0;
        st.tagCursor.setAttribute('x', f2(960 - st.tagW / 2 + wk + 4)); st.tagCursor.setAttribute('y', f2(st.ly + LK.h * k + 70 + 40 - st.size * 0.74));
        st.tagCursor.setAttribute('visibility', t >= T.tag && (kk < st.tag.length || Math.floor((t - T.tag) / 0.3) % 2 === 0) ? 'visible' : 'hidden');
        st.tagBar.setAttribute('visibility', 'hidden');
        return;
      }
      // ---------- outro ----------
      const T = st.t;
      // « 0 » : arrive par un pop à t=0 (le plan démarre sur l'iris du noyau)
      const zq = E.back(clamp(t / (10 * FR))), zsc = Math.max(0.001, lerp(0.6, 1, zq));
      st.z.setAttribute('transform', `translate(${st.zc.x} ${st.zc.y}) scale(${f2(zsc)})`);
      // bille : chute puis trois rebonds dans le « 0 »
      const lift = t < T.ball ? 900 : ballLift(t - T.ball, 900);
      const bx = st.zx + BALL_REST.x * st.zs, by = st.zy + (BALL_REST.y - lift) * st.zs;
      st.ballG.setAttribute('transform', `translate(${f2(bx)} ${f2(by)}) scale(${f2(st.zs)})`);
      st.ballG.setAttribute('visibility', t >= T.ball - 0.2 ? 'visible' : 'hidden');
      // mot-symbole : claque d'un bloc (scale 2.4 -> 1 en 4 i + shake 12 px)
      const wt = t - T.word, wp = clamp(wt / (4 * FR)), ws = lerp(2.4, 1, E.out3(wp));
      const [sx, sy] = ZV.shakeAt(wt, 4 * FR, 12, 0.4);
      const ks = st.ks, WC = LK.wx + 1714, wy = st.wy0;
      st.word.letters.forEach((l) => {
        put(l.g, 960 + (l.cx - WC) * ks * ws + sx, (wy - 330 * ks) + sy, 0, ks * ws, ks * ws, wt >= 0 ? 1 : 0);
      });
      // trait blanc souligné qui se trace
      const uq = E.out3(clamp((t - T.under) / 0.45));
      st.underR.setAttribute('x', f2(960 - 750)); st.underR.setAttribute('y', f2(wy + 52)); st.underR.setAttribute('width', f2(Math.max(0.01, 1500 * uq))); st.underR.setAttribute('visibility', uq > 0 ? 'visible' : 'hidden');
    }
  });
})();
