// Composant `phone-night` (épisode 8) : « trois heures du matin, ton lit, ta couette, ton téléphone ». Voir EP8-COMPONENTS.md.
// Fond ink stable (jamais d'écran qui s'allume/s'éteint), couette + oreiller + réveil, smartphone plat (5 écrans : slots, stream, site, notifs, odds),
// main plate (aplat, aucun ongle ni pli), étiquettes latérales, roue du zéro. Fonction pure du temps ; aplats seulement ; aucun dégradé, flou, lueur, filter.
// Cues : screen(to), hands-off, zoom-out, label-1..4, strike-label-1..4, link, no-id, no-age, no-limit, deposit, pizza, crypto, euros, notif, hook, zero-move, hide-in-odds.
(() => {
  'use strict';
  const { C, E, clamp, prog, lerp, f2, sv, g, rect, circle, path, line, text, put, shakeAt, rng } = ZV;
  let UID = 0;
  const NB = ' ';
  const SCREENS = ['slots', 'stream', 'site', 'notifs', 'odds'];
  const SW = 344, SH = 704;                        // écran (repère local de l'écran)
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const str = (v, d) => (typeof v === 'string' && v.trim() ? v.trim() : d);
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const bw = (s, size) => { let a = 0; for (const ch of String(s)) a += size * (ch === ' ' || ch === NB ? 0.26 : /[0-9]/.test(ch) ? 0.6 : /[A-ZÀÂÉÈÊÎÔÛÇ◆▸●]/.test(ch) ? 0.66 : /[.,:;'’!|]/.test(ch) ? 0.3 : 0.56); return a; };
  // mesure réelle si possible (dans le DOM, polices chargées), sinon estimation ; impose textLength seulement si ça déborde
  function fit(n, maxW) {
    try { const w = n.getComputedTextLength(); if (w > maxW && w > 0) { n.setAttribute('textLength', f2(maxW)); n.setAttribute('lengthAdjust', 'spacingAndGlyphs'); } } catch (e) { /* hors DOM */ }
  }
  const mono = (parent, s, x, y, size, fill, o) => text(parent, s, x, y, size, fill, Object.assign({ mono: true }, o || {}));
  // coupe en au plus 2 lignes de largeur maxW ; renvoie [lignes, taille]
  function wrap2(s, size, maxW) {
    for (let sz = size; sz >= 14; sz -= 1) {
      const cw = sz * 0.6, per = Math.floor(maxW / cw);
      if (s.length <= per) return [[s], sz];
      const words = s.split(' '); let l1 = '';
      for (const w of words) { if ((l1 ? l1 + ' ' + w : w).length <= per) l1 = l1 ? l1 + ' ' + w : w; else break; }
      const l2 = s.slice(l1.length).trim();
      if (l1 && l2.length <= per) return [[l1, l2], sz];
    }
    return [[s], 14];
  }

  /* ---- symboles plats de la machine (comme `slot-machine`), cellule 192×140 centrée ---- */
  const SYMS = ['cherry', 'seven', 'bar', 'lemon', 'bell', 'zero'];
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
  function drawHook(parent, s) {   // petit hameçon plat lime bordé ink, centré sur (0,0)
    const d = 'M0 -16 V6 A12 12 0 0 0 24 6 V-4 M24 -4 L16 4';
    const h = g(parent, { transform: `translate(-12 0) scale(${s || 1})` });
    path(h, d, 'none', C.ink, 15);
    path(h, d, 'none', C.lime, 7);
    circle(h, 0, -21, 6, C.lime, C.ink, 4);
    return h;
  }

  ZV.define('phone-night', {
    init(root, shot) {
      const P = shot.props || {};
      const uid = 'pn' + (++UID);
      const st = { uid, dur: Math.max(0.1, shot.dur || 1) };
      st.side = ['left', 'center', 'right'].includes(P.side) ? P.side : 'center';
      st.cx = st.side === 'right' ? 1380 : st.side === 'left' ? 560 : 960;
      st.dir = st.side === 'left' ? -1 : 1;                         // sens de la main (miroir si le téléphone est à gauche)
      st.x0 = st.cx - 190; st.y0 = 70;
      st.screen0 = SCREENS.includes(P.screen) ? P.screen : 'slots';
      st.clock = str(P.clock, '03:00');
      st.hand = P.hand !== false;
      st.bed = P.bed !== false;
      st.steps = clamp(Math.round(isNum(P.credit_steps) ? P.credit_steps : 40), 4, 400);
      const labels = Array.isArray(P.side_labels) ? P.side_labels.filter((s) => typeof s === 'string' && s.trim()).slice(0, 4) : null;
      st.labels = (labels && labels.length ? labels : ['PAS D’ADRESSE', 'PAS DE VIGILE', 'JAMAIS FERMÉ', 'DANS TA MAIN']).map((s) => s.toUpperCase());
      const notifs = Array.isArray(P.notifs) ? P.notifs.filter((s) => typeof s === 'string' && s.trim()).slice(0, 4) : null;
      st.notifs = (notifs && notifs.length ? notifs : ['TU NOUS MANQUES', 'UN BONUS T’ATTEND', 'TON SOLDE T’ATTEND', 'ENCORE UN TOUR ?']).map((s) => s.toUpperCase());
      st.deposit = str(P.deposit, '10' + NB + '€').replace(/ /g, NB);
      st.crypto = str(P.crypto, '0,02' + NB + '◆').replace(/ /g, NB);
      st.euros = str(P.euros, '800' + NB + '€').replace(/ /g, NB);

      const cu = (n) => ZV.cue(shot, n);
      st.c = { off: cu('hands-off'), zoom: cu('zoom-out'), link: cu('link'), noId: cu('no-id'), noAge: cu('no-age'), noLimit: cu('no-limit'), deposit: cu('deposit'), pizza: cu('pizza'), crypto: cu('crypto'), euros: cu('euros'), hook: cu('hook'), zero: cu('zero-move'), hide: cu('hide-in-odds') };
      st.labelC = [1, 2, 3, 4].map((i) => cu('label-' + i));
      st.strikeC = [1, 2, 3, 4].map((i) => cu('strike-label-' + i));
      st.notifC = ZV.cues(shot, 'notif').map((b) => b.t).sort((a, b) => a - b).slice(0, 4);
      st.screenC = ZV.cues(shot, 'screen').filter((b) => SCREENS.includes(b.to)).map((b) => ({ t: b.t, to: b.to })).sort((a, b) => a.t - b.t);

      const { cx, x0, y0, dir } = st;
      const R = rng(80808);

      /* ---- fond ink stable, puis le « monde » (zoom-out) ---- */
      rect(root, 0, 0, 1920, 1080, 0, C.ink);
      st.world = g(root);
      const W = st.world;
      const defs = sv('defs', null, W);
      const clip = sv('clipPath', { id: uid + 'c' }, defs); sv('rect', { x: 0, y: 0, width: SW, height: SH, rx: 40 }, clip);
      const clipR = sv('clipPath', { id: uid + 'r' }, defs); sv('rect', { x: 0, y: 0, width: 300, height: 130 }, clipR);
      const symDefs = {};
      SYMS.forEach((s) => { const gg = g(defs, { id: `${uid}-${s}` }); drawSym(gg, s); symDefs[s] = `#${uid}-${s}`; });

      /* ---- décor : oreiller, réveil, couette ---- */
      const mir = st.side === 'left';
      const MX = (x, w) => (mir ? 1920 - x - w : x);
      st.bedG = g(W);
      if (st.bed) {
        const B = st.bedG;
        rect(B, MX(80, 340) + 8, 700 + 8, 340, 120, 40, C.pocket);
        rect(B, MX(80, 340), 700, 340, 120, 40, C.paper, C.ink, 6);
        path(B, `M${MX(80, 340) + 60} 760 Q${MX(80, 340) + 170} 735 ${MX(80, 340) + 280} 760`, 'none', C.ink, 4);
        // réveil
        const kx = MX(150, 320);
        rect(B, kx + 14, 150 + 14, 320, 150, 18, C.pocket);
        circle(B, kx + 56, 138, 26, C.paper, C.paper, 6); circle(B, kx + 264, 138, 26, C.paper, C.paper, 6);
        rect(B, kx, 150, 320, 150, 18, C.ink, C.paper, 6);
        rect(B, kx + 40, 296, 36, 22, 6, C.paper); rect(B, kx + 244, 296, 36, 22, 6, C.paper);
        const ct = mono(B, st.clock, kx + 160, 150 + 99, 92, C.red, { anchor: 'middle', weight: 800 });
        fit(ct, 280);
        // couette : vague plate à 2 bosses
        const pts = [];
        for (let x = -100; x <= 2020; x += 40) pts.push(`${x} ${f2(805 - 22 * Math.cos(((x - 640) / 640) * 2 * Math.PI))}`);
        const duvet = path(B, `M-100 1500 L${pts.join(' L')} L2020 1500Z`, C.pocket, C.paper, 6);
        for (let k = 0; k < 4; k++) path(B, `M-100 ${900 + k * 70} Q${400 + k * 60} ${870 + k * 70} 960 ${900 + k * 70} T2020 ${900 + k * 70}`, 'none', C.ink, 4, { 'stroke-dasharray': '18 26' });
        st.stand = g(B);
        path(st.stand, `M${cx - 90} 836 L${cx - 60} 800 L${cx + 60} 800 L${cx + 90} 836Z`, C.pocket, C.paper, 6);
      }

      /* ---- roue du zéro (zero-move) ---- */
      st.wx = Math.min(300, x0 - 170); st.wy = st.bed ? 470 : 260;
      st.wheel = g(W);
      {
        const wg = st.wheel;
        circle(wg, 0, 0, 120, C.ink, C.paper, 7);
        st.wedges = [];
        const N = 37, a = (Math.PI * 2) / N, r0 = 46, r1 = 108;
        for (let i = 0; i < N; i++) {
          const num = ZV.ORDER[i], col = ZV.colorOf(num);
          const a0 = -Math.PI / 2 + (i - 0.5) * a, a1 = a0 + a;
          const P0 = [Math.cos(a0) * r0, Math.sin(a0) * r0], P1 = [Math.cos(a0) * r1, Math.sin(a0) * r1], P2 = [Math.cos(a1) * r1, Math.sin(a1) * r1], P3 = [Math.cos(a1) * r0, Math.sin(a1) * r0];
          const d = `M${f2(P0[0])} ${f2(P0[1])} L${f2(P1[0])} ${f2(P1[1])} A${r1} ${r1} 0 0 1 ${f2(P2[0])} ${f2(P2[1])} L${f2(P3[0])} ${f2(P3[1])} A${r0} ${r0} 0 0 0 ${f2(P0[0])} ${f2(P0[1])}Z`;
          const w = path(wg, d, col === 'lime' ? C.lime : col === 'red' ? C.red : C.pocket, C.ink, 2);
          st.wedges.push(w);
        }
        circle(wg, 0, 0, 40, C.ink, C.paper, 5);
      }
      st.disc = g(W);
      circle(st.disc, 0, 0, 40, C.lime, C.ink, 7);
      st.discTxt = text(st.disc, '0', 0, 19, 56, C.ink, { anchor: 'middle' });

      /* ---- main (derrière : doigts ; devant : avant-bras + pouce) ---- */
      st.handBack = g(W); st.handFront = g(W);
      st.B = { x: x0 + 404, y: y0 + 672 };                          // base du pouce (repère non miroir)
      st.idleTip = { x: x0 + 378, y: y0 + 536 };
      if (st.hand) {
        for (let k = 0; k < 4; k++) rect(st.handBack, x0 - 30, y0 + 470 + k * 58, 56, 50, 25, C.paper, C.ink, 6);
        // l'avant-bras vient de la droite, légèrement penché, bombé contre le bord du téléphone
        const A = (dx, dy) => `${x0 + dx} ${y0 + dy}`;
        path(st.handFront, `M${A(372, 592)} L${A(560, 596)} Q${A(620, 632)} ${A(700, 652)} L${A(1250, 704)} L${A(1250, 856)} L${A(700, 786)} Q${A(600, 772)} ${A(540, 794)} L${A(372, 772)} Q${A(326, 682)} ${A(372, 592)}Z`, C.paper, C.ink, 6);
      }

      /* ---- le téléphone ---- */
      st.ph = g(W);
      const ph = st.ph;
      rect(ph, 14, 14, 380, 740, 56, C.ink);
      rect(ph, 0, 0, 380, 740, 56, C.pocket, C.paper, 8);
      const scrG = g(ph, { transform: 'translate(18 18)' });
      rect(scrG, 0, 0, SW, SH, 40, C.ink);
      const clipG = g(scrG, { 'clip-path': `url(#${uid}c)` });
      st.sc = {};
      SCREENS.forEach((n) => { st.sc[n] = g(clipG); });

      /* -- slots -- */
      {
        const S = st.sc.slots;
        rect(S, 20, 110, 304, 130, 14, C.paper);
        const reelsG = g(S, { transform: 'translate(22 110)', 'clip-path': `url(#${uid}r)` });
        st.reels = [];
        const ini = ['seven', 'bar', 'cherry'];
        for (let i = 0; i < 3; i++) {
          const strip = SYMS.slice();
          for (let k = strip.length - 1; k > 0; k--) { const j = Math.floor(R() * (k + 1)); const tmp = strip[k]; strip[k] = strip[j]; strip[j] = tmp; }
          const rg = g(reelsG, { transform: `translate(${i * 100} 0)` });
          const uses = [0, 1, 2].map(() => sv('use', { href: symDefs.cherry }, rg));
          // résultats de chaque tour (perdants : jamais trois identiques), positions cumulées sur la bande
          st.reels.push({ strip, uses, F: [strip.indexOf(ini[i])], ini: strip.indexOf(ini[i]) });
        }
        const K = Math.ceil(st.dur / 2.5) + 3;
        for (let k = 0; k < K; k++) {
          let res; do { res = [0, 1, 2].map(() => SYMS[Math.floor(R() * 6) % 6]); } while (res[0] === res[1] && res[1] === res[2]);
          for (let i = 0; i < 3; i++) {
            const r = st.reels[i], prev = r.F[r.F.length - 1], idx = r.strip.indexOf(res[i]);
            r.F.push(prev + 4 + ((((idx - prev - 4) % 6) + 6) % 6));
          }
        }
        for (let i = 1; i < 3; i++) line(S, 22 + i * 100, 110, 22 + i * 100, 240, C.ink, 4, { 'stroke-linecap': 'butt' });
        rect(S, 20, 110, 304, 130, 14, 'none', C.lime, 5);
        rect(S, 20, 270, 92, 40, 20, C.lime, C.ink, 4);
        mono(S, 'AUTO', 66, 298, 24, C.ink, { anchor: 'middle' });
        mono(S, 'AUTO-SPIN', 128, 298, 22, C.paper);
        mono(S, 'SOLDE', 20, 392, 24, C.paper);
        rect(S, 20, 404, 304, 44, 10, C.pocket, C.paper, 4);
        st.gauge = rect(S, 22, 406, 300, 40, 8, C.paper);
        st.gaugeG = S;
        if (st.steps <= 16) for (let k = 1; k < st.steps; k++) line(S, f2(22 + (300 * k) / st.steps), 406, f2(22 + (300 * k) / st.steps), 446, C.ink, 2, { 'stroke-linecap': 'butt', opacity: 0.55 });
        rect(S, 20, 404, 304, 44, 10, 'none', C.ink, 4);
      }

      /* -- stream -- */
      {
        const S = st.sc.stream;
        rect(S, 16, 76, 312, 176, 8, C.ink, C.paper, 4);
        // table de cartes vue de dessus
        const cardsX = [48, 112, 176];
        ['7', '2', '9'].forEach((d, i) => { const cg = g(S, { transform: `translate(${cardsX[i] + 28} 172) rotate(${[-8, 3, -4][i]})` }); rect(cg, -28, -40, 56, 80, 6, C.paper, C.ink, 3); mono(cg, d, 0, 14, 44, C.ink, { anchor: 'middle' }); });
        // incrustation : silhouette générique (aucun trait), casque
        rect(S, 240, 160, 80, 84, 6, C.pocket, C.paper, 3);
        path(S, 'M246 244 Q246 214 280 214 Q314 214 314 244Z', C.pocket, C.paper, 3);
        circle(S, 280, 190, 18, C.pocket, C.paper, 3);
        path(S, 'M259 190 A21 21 0 0 1 301 190', 'none', C.paper, 5);
        rect(S, 253, 186, 8, 16, 4, C.paper); rect(S, 299, 186, 8, 16, 4, C.paper);
        rect(S, 24, 84, 124, 28, 14, C.red, C.ink, 3);
        mono(S, '● EN DIRECT', 86, 105, 17, C.paper, { anchor: 'middle', weight: 800 });
        // titre figuré
        rect(S, 16, 272, 296, 16, 8, C.paper); rect(S, 16, 298, 214, 16, 8, C.paper); rect(S, 16, 324, 130, 16, 8, C.paper);
        mono(S, 'DESCRIPTION', 16, 378, 22, C.paper);
        rect(S, 16, 392, 312, 4, 2, C.paper);
        rect(S, 16, 410, 250, 12, 6, C.pocket, C.paper, 2); rect(S, 16, 432, 180, 12, 6, C.pocket, C.paper, 2);
        st.linkC = { x: 94, y: 492 };
        st.linkPill = g(S);
        rect(st.linkPill, -78, -24, 156, 48, 24, C.lime, C.ink, 4);
        const lt = mono(st.linkPill, '▸ LE LIEN', 0, 8, 22, C.ink, { anchor: 'middle', weight: 800 }); fit(lt, 130);
        rect(st.linkPill, -56, 14, 112, 4, 2, C.ink);
        st.linkPill.setAttribute('transform', `translate(${st.linkC.x} ${st.linkC.y})`);
      }

      /* -- site -- */
      {
        const S = st.sc.site;
        rect(S, 0, 56, SW, 60, 0, C.pocket);
        circle(S, 34, 86, 15, C.lime, C.ink, 4);
        const ct = text(S, 'CASINO', 60, 101, 40, C.paper); fit(ct, 130);
        rect(S, 16, 128, 188, 30, 15, 'none', C.red, 3);
        mono(S, 'HORS DE FRANCE', 110, 149, 17, C.red, { anchor: 'middle', weight: 800 });
        const ROWS = [['PIÈCE D’IDENTITÉ', 'NON DEMANDÉE'], ['ÂGE', 'NON VÉRIFIÉ'], ['LIMITE DE DÉPÔT', 'AUCUNE']];
        st.rows = ROWS.map((r, i) => {
          const rg = g(S), y = 172 + i * 92;
          rect(rg, 16, y, 312, 80, 12, C.pocket, C.paper, 3);
          mono(rg, r[0], 32, y + 30, 22, C.paper);
          const ans = mono(rg, r[1], 32, y + 64, 24, C.red, { weight: 800 });
          circle(rg, 292, y + 40, 20, C.red, C.ink, 4);
          path(rg, `M283 ${y + 31} L301 ${y + 49} M301 ${y + 31} L283 ${y + 49}`, 'none', C.ink, 6);
          return rg;
        });
        st.btn = g(S);
        rect(st.btn, 16, 452, 312, 70, 18, C.lime, C.ink, 6);
        st.btnT = text(st.btn, 'DÉPOSER' + NB + st.deposit, 172, 499, 38, C.ink, { anchor: 'middle' });
        fit(st.btnT, 270);
        st.btnTxt = ['DÉPOSER' + NB + st.deposit, st.deposit + NB + 'DÉPOSÉS'];
        st.btnR = rect(st.btn, 16, 452, 312, 70, 18, C.paper, C.ink, 6); st.btnR.setAttribute('display', 'none');
        st.btnT2 = text(st.btn, st.btnTxt[1], 172, 499, 38, C.ink, { anchor: 'middle' }); fit(st.btnT2, 270); st.btnT2.setAttribute('display', 'none');
        st.btnT2.parentNode.appendChild(st.btnT2);
        mono(S, 'SOLDE', 16, 560, 22, C.paper).setAttribute('display', 'none');
        st.soldeLab = S.lastChild;
        st.cry = text(S, st.crypto, 16, 620, 72, C.lime, { weight: 800 }); fit(st.cry, 312);
        st.eur = text(S, '=' + NB + st.euros, 16, 692, 72, C.red, { weight: 800 }); fit(st.eur, 312);
      }

      /* -- notifs (écran verrouillé) -- */
      {
        const S = st.sc.notifs;
        const clk = text(S, st.clock, SW / 2, 214, 110, C.paper, { anchor: 'middle' }); fit(clk, 300);
        mono(S, 'NUIT', SW / 2, 106, 22, C.paper, { anchor: 'middle' });
        st.nc = [];
        for (let i = 0; i < st.notifs.length; i++) {
          const y = 262 + i * 106, ng = g(S);
          rect(ng, 16, y, 312, 94, 22, C.paper, C.ink, 4);
          st.nc.push({ g: ng, y, ic: circle(ng, 54, y + 47, 20, C.lime, C.ink, 5), dot: circle(ng, 54, y + 47, 7, C.ink), hook: null });
          const [lines, sz] = wrap2(st.notifs[i], 22, 232);
          lines.forEach((ln, li) => { const tn = mono(ng, ln, 88, y + (lines.length === 1 ? 54 : 41 + li * 28), sz, C.ink, { weight: 800 }); fit(tn, 232); });
          const hk = g(ng, { transform: `translate(54 ${y + 47})` });
          drawHook(hk, 1.1);
          st.nc[i].hook = hk;
        }
      }

      /* -- odds -- */
      {
        const S = st.sc.odds;
        const tt = text(S, 'ÉQUIPE A — ÉQUIPE B', SW / 2, 126, 30, C.paper, { anchor: 'middle' }); fit(tt, 312);
        st.tiles = [];
        const OD = ['1,55', '4,20', '5,80'];
        OD.forEach((o, i) => {
          const y = 222 + i * 118, tg = g(S);
          rect(tg, 16, y, 312, 104, 18, C.ink, C.paper, 4);
          if (i === 0) {
            const lx = SW / 2 - 64.8;
            mono(tg, '1', lx + 16.2, y + 70, 54, C.paper, { anchor: 'middle', weight: 800 });
            st.comma = mono(tg, ',', lx + 48.6, y + 70, 54, C.paper, { anchor: 'middle', weight: 800 });
            mono(tg, '55', lx + 97.2, y + 70, 54, C.paper, { anchor: 'middle', weight: 800, len: 64.8 });
            st.commaPos = { x: lx + 48.6, y: y + 70 + 2 };
            st.tile1y = y;
          } else mono(tg, o, SW / 2, y + 70, 54, C.paper, { anchor: 'middle', weight: 800 });
          st.tiles.push(tg);
        });
        st.ici = g(S);
        mono(st.ici, 'ICI', st.commaPos.x, st.tile1y - 30, 28, C.lime, { anchor: 'middle', weight: 800 });
        path(st.ici, `M${st.commaPos.x - 11} ${st.tile1y - 18} L${st.commaPos.x + 11} ${st.tile1y - 18} L${st.commaPos.x} ${st.tile1y - 4}Z`, C.lime, C.ink, 3);
      }

      // barre d'état (fixe) : heure, notch, soleil (luminosité au minimum)
      st.status = g(clipG);
      mono(st.status, st.clock, 28, 42, 22, C.paper, { weight: 800 });
      rect(st.status, 112, 12, 120, 30, 15, C.ink, C.paper, 3);
      {
        const sx = 262, sy = 30;
        circle(st.status, sx, sy, 6, C.paper);
        for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4; line(st.status, f2(sx + Math.cos(a) * 9), f2(sy + Math.sin(a) * 9), f2(sx + Math.cos(a) * 13), f2(sy + Math.sin(a) * 13), C.paper, 3); }
        line(st.status, 282, sy, 326, sy, C.paper, 3); circle(st.status, 285, sy, 5, C.paper, C.ink, 2);
      }

      // pouce (devant le téléphone) + anneau de tape
      if (st.hand) {
        const hf = st.handFront;
        st.thumbO = line(hf, st.B.x, st.B.y, st.idleTip.x, st.idleTip.y, C.ink, 62);
        st.thumbP = line(hf, st.B.x, st.B.y, st.idleTip.x, st.idleTip.y, C.paper, 50);
        circle(hf, st.B.x, st.B.y, 40, C.paper);
      }
      W.appendChild(st.handFront);                                 // la main passe devant le téléphone
      W.appendChild(st.disc);                                      // le disque lime passe devant l'écran
      st.tapG = g(W);
      st.tapA = circle(st.tapG, 0, 0, 15, 'none', C.paper, 10);
      st.tapB = circle(st.tapG, 0, 0, 15, 'none', C.ink, 5);

      /* ---- pizza, étiquettes ---- */
      st.pizza = g(W);
      {
        const pz = st.pizza;
        // hors de la colonne d'étiquettes : sous elles (center), ou à l'autre bout du lit (left / right)
        st.pzBase = st.side === 'center' ? { x: 570, y: 630 } : st.side === 'right' ? { x: 330, y: 520 } : { x: 1590, y: 520 };
        path(pz, 'M-84 -60 L84 -60 L0 88Z', C.paper, C.ink, 7);
        rect(pz, -92, -82, 184, 28, 12, C.paper, C.ink, 7);
        [[-30, -20], [30, -20], [0, 36]].forEach((p) => circle(pz, p[0], p[1], 14, C.red, C.ink, 4));
        const lb = mono(pz, '10' + NB + '€ = UNE PIZZA', 0, 150, 28, C.paper, { anchor: 'middle', weight: 800 }); fit(lb, 300);
      }
      st.lab = [];
      {
        const n = st.labels.length;
        let size = 84;
        st.labels.forEach((s) => { size = Math.min(size, 560 / (bw(s, 1) || 1)); });
        size = clamp(Math.floor(size), 64, 84);
        const base = st.side === 'center' ? [[-1, 380], [1, 300], [-1, 520], [1, 480]] : [[0, 250], [0, 410], [0, 570], [0, 730]];
        for (let i = 0; i < n; i++) {
          const [sd, by] = base[i];
          let anchor, x;
          if (st.side === 'center') { anchor = sd < 0 ? 'end' : 'start'; x = sd < 0 ? x0 - 30 : x0 + 380 + 30; }
          else if (st.side === 'right') { anchor = 'end'; x = x0 - 30; }
          else { anchor = 'start'; x = x0 + 380 + 30; }
          const lg = g(W);
          const tn = text(lg, st.labels[i], 0, 0, size, C.paper, { anchor });
          fit(tn, 556);
          let w = 0; try { w = tn.getComputedTextLength(); } catch (e) { w = 0; }
          if (!(w > 0)) w = Math.min(556, bw(st.labels[i], size));
          const x1 = anchor === 'end' ? -w : 0, x2 = anchor === 'end' ? 0 : w;
          const sk = line(lg, x1 - 8, -size * 0.32, x2 + 8, -size * 0.32, C.red, 10);
          st.lab.push({ g: lg, x, y: by, sk, x1: x1 - 8, x2: x2 + 8, anchor });
        }
      }
      st.ring = null;
      return st;
    },

    update(st, t, shot) {
      try { draw(st, t); } catch (e) { /* jamais d'exception */ }
    }
  });

  /* ---- positions du pouce : approche, contact, retrait ---- */
  function thumbTargets(st) {
    const L = [];
    const ax = st.x0 + 18, ay = 88;
    if (st.c.link !== null) L.push({ tc: st.c.link + 1.0, x: ax + st.linkC.x, y: ay + st.linkC.y });
    if (st.c.deposit !== null) L.push({ tc: st.c.deposit, x: ax + 172, y: ay + 487 });
    L.sort((a, b) => a.tc - b.tc);
    return L;
  }

  function draw(st, t) {
    const { cx, x0, y0, dir } = st, c = st.c;
    const NBSP = NB;
    /* zoom-out : tout le décor recule autour du téléphone */
    const zs = c.zoom === null ? 1 : lerp(1, 0.62, E.io2(prog(t, c.zoom, c.zoom + 16 / 30)));
    const zy = y0 + 370;
    setA(st.world, 'transform', zs === 1 ? '' : `translate(${f2(cx)} ${f2(zy)}) scale(${f2(zs * 1000) / 1000}) translate(${f2(-cx)} ${f2(-zy)})`);

    /* vibration du téléphone (notif) */
    let sx = 0, sy = 0;
    for (const tn of st.notifC) { const s = shakeAt(t, tn, 3, 0.25); sx += s[0]; sy += s[1]; }
    sx = f2(sx); sy = f2(sy);
    setA(st.ph, 'transform', `translate(${f2(x0 + sx)} ${f2(y0 + sy)})`);

    /* hands-off */
    const h = c.off === null ? 0 : E.io2(prog(t, c.off, c.off + 0.6));
    if (st.bed && st.stand) setA(st.stand, 'display', c.off !== null && t >= c.off ? 'inline' : 'none');
    const hx = 80 * h, hy = 190 * h;
    const mirror = dir < 0 ? `translate(${2 * cx} 0) scale(-1 1) ` : '';
    const htr = `translate(${sx} ${sy}) ${mirror}translate(${f2(hx)} ${f2(hy)})`;
    if (st.hand) {
      setA(st.handFront, 'transform', htr);
      setA(st.handBack, 'transform', `translate(${sx} ${sy}) ${mirror}`);
      const fo = c.off === null ? 1 : 1 - prog(t, c.off, c.off + 0.25);
      setA(st.handBack, 'opacity', f2(fo)); setA(st.handBack, 'display', fo <= 0.01 ? 'none' : 'inline');
    }

    /* écrans : glissement de droite à gauche en 10 i */
    let cur = st.screen0, prev = null, t0 = -1;
    for (const s of st.screenC) if (t >= s.t && s.to !== cur) { prev = cur; cur = s.to; t0 = s.t; }
    const sp = t0 < 0 ? 1 : prog(t, t0, t0 + 10 / 30);
    if (sp >= 1) prev = null;
    const se = E.io3(sp);
    for (const n of SCREENS) {
      const g0 = st.sc[n];
      if (n === cur) { setA(g0, 'display', 'inline'); setA(g0, 'transform', prev ? `translate(${f2((1 - se) * SW)} 0)` : ''); }
      else if (n === prev) { setA(g0, 'display', 'inline'); setA(g0, 'transform', `translate(${f2(-se * SW)} 0)`); }
      else setA(g0, 'display', 'none');
    }
    st.cur = cur;

    /* ---- slots : rouleaux et jauge ---- */
    if (cur === 'slots' || prev === 'slots') {
      const T0 = 0.6, PERIOD = 2.5, CELL = 130;
      const k = t < T0 ? -1 : Math.floor((t - T0) / PERIOD);
      for (let i = 0; i < 3; i++) {
        const r = st.reels[i];
        let pos;
        if (k < 0) pos = r.F[0];
        else {
          const kk = Math.min(k, r.F.length - 2), ts = T0 + PERIOD * k, dur = 0.9 + 0.2 * i, p = prog(t, ts, ts + dur);
          const e = 0.3 * p + 0.7 * (1 - (1 - p) * (1 - p));
          pos = r.F[kk] + (r.F[kk + 1] - r.F[kk]) * e;
          const u = (t - (ts + dur)) / (4 / 30);
          if (u > 0 && u < 1) pos += 0.1 * Math.sin(Math.PI * u);
        }
        const cn = Math.round(pos);
        for (let j = 0; j < 3; j++) {
          const n = cn - 1 + j, sym = r.strip[((n % 6) + 6) % 6];
          setA(r.uses[j], 'href', '#' + st.uid + '-' + sym);
          setA(r.uses[j], 'transform', `translate(50 ${f2(65 + (pos - n) * CELL)}) scale(0.52)`);
        }
      }
      // jauge SOLDE : un cran de moins à chaque tour, jamais de remontée
      const e0 = T0 + 1.3;
      let used = 0;
      if (t >= e0) { const m = Math.floor((t - e0) / PERIOD); used = m + prog(t - e0 - PERIOD * m, 0, 0.25); }
      const lvl = clamp(1 - used / st.steps, 0.02, 1);
      setA(st.gauge, 'width', f2(300 * lvl));
    }

    /* ---- stream : pastille « LE LIEN » ---- */
    if (cur === 'stream' || prev === 'stream') {
      let s = 1, press = 0;
      if (c.link !== null) {
        const p = prog(t, c.link, c.link + 1.0);
        s = p >= 1 ? 1 : 1 + 0.08 * Math.sin(Math.PI * ((p * 2) % 1));
        press = prog(t, c.link + 1.0, c.link + 1.08) * (1 - prog(t, c.link + 1.25, c.link + 1.4));
      }
      s = s - 0.05 * press;
      setA(st.linkPill, 'transform', `translate(${st.linkC.x} ${st.linkC.y}) scale(${f2(s * 1000) / 1000})`);
    }

    /* ---- site : contrôles, bouton, solde ---- */
    if (cur === 'site' || prev === 'site') {
      const rc = [c.noId, c.noAge, c.noLimit];
      st.rows.forEach((rg, i) => {
        const tc = rc[i];
        if (tc === null || t < tc) { setA(rg, 'display', 'none'); return; }
        const p = prog(t, tc, tc + 0.2);
        setA(rg, 'display', 'inline'); setA(rg, 'opacity', f2(E.out2(p)));
        setA(rg, 'transform', `translate(${f2((1 - E.out3(p)) * 40)} 0)`);
      });
      const dep = c.deposit !== null && t >= c.deposit;
      const dp = c.deposit === null ? 0 : prog(t, c.deposit, c.deposit + 0.1);
      setA(st.btn, 'transform', `translate(0 ${f2(4 * dp)})`);
      setA(st.btnR, 'display', dep ? 'inline' : 'none');
      setA(st.btnT, 'display', dep ? 'none' : 'inline');
      setA(st.btnT2, 'display', dep ? 'inline' : 'none');
      const popIn = (n, tc) => {
        if (tc === null || t < tc) { setA(n, 'display', 'none'); return; }
        const p = prog(t, tc, tc + 0.18);
        setA(n, 'display', 'inline'); setA(n, 'opacity', f2(p));
        setA(n, 'transform', `translate(0 ${f2((1 - E.out3(p)) * 24)})`);
      };
      popIn(st.cry, c.crypto); popIn(st.eur, c.euros);
      setA(st.soldeLab, 'display', c.crypto !== null && t >= c.crypto ? 'inline' : 'none');
    }

    /* ---- notifs ---- */
    if (cur === 'notifs' || prev === 'notifs') {
      st.nc.forEach((n, i) => {
        const tc = st.notifC[i] === undefined ? null : st.notifC[i];
        if (tc === null || t < tc) { setA(n.g, 'display', 'none'); return; }
        const p = prog(t, tc, tc + 8 / 30);
        setA(n.g, 'display', 'inline'); setA(n.g, 'opacity', f2(Math.min(1, p * 2)));
        setA(n.g, 'transform', `translate(0 ${f2(-(1 - E.out3(p)) * 70)})`);
        const hp = c.hook === null ? 0 : E.back(prog(t, c.hook + i * 0.08, c.hook + i * 0.08 + 0.25));
        setA(n.ic, 'display', hp > 0.02 ? 'none' : 'inline'); setA(n.dot, 'display', hp > 0.02 ? 'none' : 'inline');
        setA(n.hook, 'display', hp > 0.02 ? 'inline' : 'none');
        setA(n.hook, 'transform', `translate(54 ${n.y + 47}) scale(${f2(Math.max(0.01, hp) * 100) / 100})`);
      });
    }

    /* ---- odds + roue du zéro ---- */
    const zf = c.zero === null ? null : c.zero;         // pose de la roue
    const L = { x: cx, y: y0 + 18 + 630 };              // point de pose sur l'écran
    if (st.cur === 'odds' || prev === 'odds') {
      const hp = c.hide === null ? 0 : prog(t, c.hide + 0.4, c.hide + 0.7);
      setA(st.ici, 'display', hp > 0 ? 'inline' : 'none'); setA(st.ici, 'opacity', f2(hp));
    }
    const sc = x0 + 18;                                 // origine écran en x
    const comma = { x: sc + st.commaPos.x, y: y0 + 18 + st.commaPos.y };
    // roue
    if (zf === null) { setA(st.wheel, 'display', 'none'); setA(st.disc, 'display', 'none'); }
    else {
      const flyA = zf + 0.3, flyB = flyA + 1.2, fadeA = flyB, fadeB = fadeA + 10 / 30;
      const wi = E.back(prog(t, zf, zf + 0.3)), wo = 1 - prog(t, fadeA, fadeB);
      const S0 = { x: st.wx, y: st.wy - 78 };
      if (t < zf || wo <= 0.001) setA(st.wheel, 'display', 'none');
      else { setA(st.wheel, 'display', 'inline'); put(st.wheel, st.wx, st.wy, 0, Math.max(0.01, wi), Math.max(0.01, wi), wo); setA(st.wheel, 'opacity', f2(wo)); }
      st.wedges[0].setAttribute('fill', t >= flyA ? C.ink : C.lime);
      if (t < flyA) setA(st.disc, 'display', 'none');
      else {
        let x, y, s = 1;
        const hide0 = c.hide === null ? null : c.hide;
        const fp = prog(t, flyA, flyB);
        if (fp < 1) {
          const e = E.io2(fp);
          x = lerp(S0.x, L.x, e); y = lerp(S0.y, L.y, e) - 170 * 4 * fp * (1 - fp);
          s = lerp(0.3, 1, E.out2(prog(t, flyA, flyA + 0.3)));
        } else { x = L.x; y = L.y; s = 1 + 0.12 * Math.sin(Math.PI * clamp((t - flyB) / 0.2)); }
        let txtO = 1;
        if (hide0 !== null && t >= hide0) {
          const hp = E.io2(prog(t, hide0, hide0 + 0.8));
          x = lerp(L.x, comma.x, hp); y = lerp(L.y, comma.y, hp); s = lerp(1, 0.17, hp); txtO = 1 - prog(hp, 0, 0.45);
          if (cur === 'odds' && hp >= 1) setA(st.comma, 'display', 'none'); else setA(st.comma, 'display', 'inline');
        } else if (st.comma) setA(st.comma, 'display', 'inline');
        setA(st.disc, 'display', 'inline'); put(st.disc, x, y, 0, s, s, 1);
        setA(st.discTxt, 'display', txtO > 0.05 ? 'inline' : 'none');
      }
    }

    /* ---- pouce ---- */
    const tg = thumbTargets(st);
    if (st.hand) {
      const R = st.B;
      let tipX, tipY, w = 0, tapAt = null, ev = null;
      for (const e of tg) if (t >= e.tc - 0.35 && (c.off === null || e.tc < c.off)) ev = e;
      if (ev) {
        const a = E.out2(prog(t, ev.tc - 0.35, ev.tc)), b = 1 - E.io2(prog(t, ev.tc + 0.25, ev.tc + 0.55));
        w = Math.min(a, b);
        if (t >= ev.tc && t <= ev.tc + 8 / 30) tapAt = { dt: t - ev.tc, x: ev.x, y: ev.y };
      }
      const idle = st.idleTip;
      const tx = ev ? (dir > 0 ? ev.x : 2 * cx - ev.x) : idle.x, ty = ev ? ev.y : idle.y;   // cible dans le repère non miroir
      tipX = lerp(idle.x, tx, w); tipY = lerp(idle.y, ty, w);
      // main à plat : le pouce se replie le long de la paume
      const lx = lerp(tipX, R.x - 86, h), ly = lerp(tipY, R.y - 6, h);
      setA(st.thumbO, 'x2', f2(lx)); setA(st.thumbO, 'y2', f2(ly));
      setA(st.thumbP, 'x2', f2(lx)); setA(st.thumbP, 'y2', f2(ly));
      if (tapAt) {
        const p = tapAt.dt / (8 / 30), r = lerp(15, 48, E.out2(p));
        setA(st.tapG, 'display', 'inline'); setA(st.tapG, 'transform', `translate(${f2(tapAt.x)} ${f2(tapAt.y)})`);
        setA(st.tapA, 'r', f2(r)); setA(st.tapB, 'r', f2(r)); setA(st.tapG, 'opacity', f2(1 - p * 0.9));
      } else setA(st.tapG, 'display', 'none');
    } else setA(st.tapG, 'display', 'none');

    /* ---- pizza ---- */
    {
      const tc = c.pizza;
      if (tc === null || t < tc) setA(st.pizza, 'display', 'none');
      else {
        const p = E.back(prog(t, tc, tc + 0.35)), o = prog(t, tc, tc + 0.12);
        const off = (1 - Math.min(1, p)) * 90 * (st.pzBase.x < cx ? -1 : 1);
        setA(st.pizza, 'display', 'inline'); put(st.pizza, st.pzBase.x + off, st.pzBase.y, -6 * (1 - Math.min(1, p)), Math.max(0.01, 0.6 + 0.4 * p), Math.max(0.01, 0.6 + 0.4 * p), o);
      }
    }

    /* ---- étiquettes latérales ---- */
    st.lab.forEach((l, i) => {
      const tc = st.labelC[i];
      if (tc === null || t < tc) { setA(l.g, 'display', 'none'); return; }
      const p = prog(t, tc, tc + 0.25), s = Math.max(0.01, 0.55 + 0.45 * E.back(p));
      setA(l.g, 'display', 'inline'); setA(l.g, 'opacity', f2(Math.min(1, p * 3)));
      setA(l.g, 'transform', `translate(${l.x} ${l.y}) scale(${f2(s * 1000) / 1000})`);
      const sc2 = st.strikeC[i];
      const sp2 = sc2 === null ? 0 : prog(t, sc2, sc2 + 0.2);
      if (sp2 <= 0) setA(l.sk, 'display', 'none');
      else {
        setA(l.sk, 'display', 'inline');
        const a = l.anchor === 'end' ? l.x2 - (l.x2 - l.x1) * sp2 : l.x1;
        const b = l.anchor === 'end' ? l.x2 : l.x1 + (l.x2 - l.x1) * sp2;
        setA(l.sk, 'x1', f2(a)); setA(l.sk, 'x2', f2(b));
      }
    });
  }
})();
