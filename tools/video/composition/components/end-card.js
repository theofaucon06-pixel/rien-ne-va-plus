// Composant « end-card » : voir tools/video/composition/INTERFACE.md. Fonction pure du temps du plan, aplats seulement.
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
  const MARQ_DEFAULT = 'ZÉRO VERT · LA MAISON GAGNE TOUJOURS · ';

  defineTypo('end-card', {
    build(root, shot) {
      const P = shot.props || {};
      const final = P.mode === 'final';
      const uid = 'ec' + (++UID);
      const W = mkProbe(root);
      const st = { shot, final, uid, W };
      const cue = (n, d) => { const v = ZV.cue(shot, n); return v === null ? d : v; };
      // fond lime + grille éditoriale (aplat plus foncé, filets pleins)
      rect(root, 0, 0, 1920, 1080, 0, C.lime);
      const grid = g(root);
      for (let x = 160; x < 1920; x += 160) rect(grid, x - 2, 96, 4, 984, 0, TINT.lime);
      for (let y = 96 + 108; y < 1080; y += 108) rect(grid, 0, y - 2, 1920, 4, 0, TINT.lime);
      // marquee en haut
      {
        const gm = g(root), sz = 38, sp = 0.06, MARQ = String(P.marquee || MARQ_DEFAULT);
        rect(gm, 0, 0, 1920, 88, 0, C.ink);
        const unit = W(MARQ, sz, { sp });
        const n = Math.ceil(1920 / unit) + 2;
        st.mq = { unit, node: text(gm, MARQ.repeat(n).replace(/ /g, NB), 0, 58, sz, C.lime, { spacing: f2(sp * sz) }) };
        rect(gm, 0, 88, 1920, 8, 0, C.ink);
      }
      const mkSticker = (str, fill, tcol, size, mono, tilt) => {
        const w = W(str, size, { mono, sp: mono ? 0.04 : 0 }) + 72, h = size * 1.75, gr = g(root);
        rect(gr, -w / 2 + 12, -h / 2 + 12, w, h, 18, C.ink); rect(gr, -w / 2, -h / 2, w, h, 18, fill, C.ink, 6);
        text(gr, str, 0, size * 0.36, size, tcol, { mono, anchor: 'middle', spacing: mono ? f2(0.04 * size) : 0 });
        return { g: gr, w, h, tilt };
      };
      const wf = (s, S) => W(s, S, { sp: 0 });

      if (!final) {
        // ---- À RETENIR : trois cartes numérotées qui restent ----
        st.title = mkSticker(String(P.heading || 'À RETENIR').toUpperCase(), C.ink, C.lime, 62, false, -2);
        st.title.x = 160 + st.title.w / 2; st.title.y = 176; st.tTitle = cue('title', 0.2);
        const items = (P.items || []).slice(0, 3).map((s) => String(s).replace(/ (?=[?:!;])/g, NB));
        const tilts = [-2, 1, -1], times = [cue('i1', 0.8), cue('i2', 2.6), cue('i3', 4.4)];
        const cw = 1560, tx = 150, tw = cw - tx - 56, gap = 34;
        let S = 62, cards = [], totalH = 0;
        for (; S >= 40; S -= 2) {
          cards = items.map((it) => { const rows = breaks(it, S, tw, wf, 4) || [it]; return { rows, h: Math.max(140, rows.length * S * 1.2 + 60) }; });
          totalH = cards.reduce((a, c) => a + c.h, 0) + gap * (cards.length - 1);
          if (totalH <= 790) break;
        }
        st.S = S;
        let y = Math.max(250, 250 + (1020 - 250 - totalH) / 2);
        st.cards = cards.map((c, i) => {
          const gr = g(root);
          rect(gr, -cw / 2 + 12, -c.h / 2 + 12, cw, c.h, 18, C.ink);
          rect(gr, -cw / 2, -c.h / 2, cw, c.h, 18, C.paper, C.ink, 8);
          circle(gr, -cw / 2 + 76, 0, 44, C.ink);
          text(gr, String(i + 1), -cw / 2 + 76, 0.36 * 54, 54, C.lime, { mono: true, anchor: 'middle' });
          c.rows.forEach((r, k) => text(gr, r.replace(/ /g, NB), -cw / 2 + tx, -c.h / 2 + (c.h - ((c.rows.length - 1) * S * 1.2 + 0.74 * S)) / 2 + 0.74 * S + k * S * 1.2, S, C.ink, { spacing: f2(-0.01 * S) }));
          const o = { g: gr, x: 960, y: y + c.h / 2, tilt: tilts[i], t: times[i] };
          y += c.h + gap;
          return o;
        });
        return st;
      }
      // ---- final : prochain épisode, aide, logo complet ----
      st.next = mkSticker(String(P.next || 'PROCHAIN ÉPISODE : LA ZONE').toUpperCase(), C.ink, C.lime, 66, false, -2);
      st.next.x = 960; st.next.y = 200; st.tNext = cue('next', 0.2);
      const help = P.help || {};
      const cw = 1500, ch = 450;
      const card = g(root); st.help = { g: card, x: 960, y: 545, tilt: 1, t: cue('help', 1) };
      path(card, `M${-cw / 2 + 14} ${-ch / 2 + 14}H${cw / 2 + 14}V${ch / 2 + 14}H${-cw / 2 + 14}Z`, C.ink);
      rect(card, -cw / 2, -ch / 2, cw, ch, 0, C.paper, C.ink, 8);
      text(card, String(help.name || 'Joueurs Info Service').toUpperCase(), -cw / 2 + 60, -ch / 2 + 84, 44, C.ink, { mono: true, spacing: 3 });
      line(card, -cw / 2 + 60, -ch / 2 + 114, cw / 2 - 60, -ch / 2 + 114, C.ink, 6, { 'stroke-linecap': 'butt' });
      const ph = String(help.phone || '09 74 75 13 13');
      text(card, ph.replace(/ /g, NB), 0, 30 + 0.36 * 120, 120, C.ink, { mono: true, anchor: 'middle' });
      rect(card, -W(ph, 120, { mono: true }) / 2, 30 + 0.36 * 120 + 22, W(ph, 120, { mono: true }), 16, 4, C.lime);
      text(card, String(help.hours || ''), 0, ch / 2 - 50, 40, '#2B2B2B', { anchor: 'middle' });
      // logo complet en bas
      const k = 1000 / LK.w;
      st.logo = { g: g(root), k };
      const lg = st.logo.g;
      const mk = mkMark(lg); const wd = mkWord(lg, C.ink);
      // on place la marque et les lettres dans le repère du logo (échelle 1) ; le groupe est ensuite mis à l'échelle k
      mk.g.setAttribute('transform', `translate(0 40) scale(${(880.6 / 512).toFixed(4)})`);
      wd.letters.forEach((l) => put(l.g, l.cx, l.cy + 40, 0, 1, 1, 1));
      mk.ball.setAttribute('cy', BALL_REST.y);
      st.logo.x = 960 - LK.w * k / 2; st.logo.y = 790; st.logo.t = cue('logo', 2.4);
      return st;
    },

    draw(st, t, shot) {
      const E = ZV.E;
      st.mq.node.setAttribute('x', f2(-((t * 140) % st.mq.unit)));
      const pop = (o, tp, rot0) => { if (!o) return; const p = E.back(clamp((t - tp) / (8 * FR))); put(o.g, o.x, lerp(o.y + 30, o.y, E.out3(clamp((t - tp) / (8 * FR)))), (o.tilt || 0) + (1 - p) * (rot0 === undefined ? -6 : rot0), p, p, t >= tp ? 1 : 0); };
      if (!st.final) {
        pop(st.title, st.tTitle);
        for (const c of st.cards) {
          const q = clamp((t - c.t) / (6 * FR)), p = E.out3(q);
          const [sx, sy] = ZV.shakeAt(t - c.t, 6 * FR, 7, 0.3);
          put(c.g, c.x + sx + lerp(0, 0, p), c.y + lerp(-420, 0, p) + sy, c.tilt, lerp(1.08, 1, p), lerp(1.08, 1, p), t >= c.t ? 1 : 0);
        }
        return;
      }
      pop(st.next, st.tNext);
      const h = st.help, hq = E.out3(clamp((t - h.t) / 0.35));
      put(h.g, h.x, lerp(h.y + 120, h.y, hq), h.tilt, 1, 1, t >= h.t ? 1 : 0);
      const lq = E.back(clamp((t - st.logo.t) / (10 * FR)));
      const L = st.logo, lk = L.k;
      L.g.setAttribute('transform', `translate(${f2(960)} ${f2(L.y)}) scale(${f2(Math.max(0.0001, lk * lerp(0.4, 1, lq)))}) translate(${f2(-LK.w / 2)} 0)`);
      L.g.setAttribute('display', t >= L.t ? 'inline' : 'none');
    }
  });
})();
