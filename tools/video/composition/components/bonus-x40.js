// Composant `bonus-x40` (épisode 8) : « deux secondes pour entrer » puis « un cadeau qui coûte plus cher qu'il ne rapporte ». Voir EP8-COMPONENTS.md.
// Fond ink. Temps 1 : deux chronomètres (DÉPÔT 2 s / RETRAIT 3 à 5 jours) + cadenas. Temps 2 : le paquet cadeau, 100 € × 40 = 4 000 € à miser,
// la barre « MISÉ » et le compteur « LA MAISON GARDE » (2,7 % du misé), puis la comparaison 100 € < ≈ 108 € EN MOYENNE.
// Cues : deposit, withdraw, lock, gift, open, times, total, wager, compare. Fonction pure du temps ; aplats seulement.
(() => {
  'use strict';
  const { C, E, clamp, prog, lerp, f2, sv, g, rect, circle, path, line, text, fr } = ZV;
  const NB = ' ';
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const str = (v, d) => (typeof v === 'string' && v.trim() ? v.trim() : d);
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const setT = (n, s) => { if (n.__s !== s) { n.__s = s; n.textContent = s; } };
  const mono = (parent, s, x, y, size, fill, o) => text(parent, s, x, y, size, fill, Object.assign({ mono: true }, o || {}));
  function fit(n, maxW) {
    try { const w = n.getComputedTextLength(); if (w > maxW && w > 0) { n.setAttribute('textLength', f2(maxW)); n.setAttribute('lengthAdjust', 'spacingAndGlyphs'); } } catch (e) { /* hors DOM */ }
  }
  function measure(n, fallback) { let w = 0; try { w = n.getComputedTextLength(); } catch (e) { w = 0; } return w > 0 ? w : fallback; }
  function fitSize(n, worst, size, maxW) {
    const keep = n.textContent; n.textContent = worst;
    try { const w = n.getComputedTextLength(); if (w > maxW && w > 0) n.setAttribute('font-size', f2(size * maxW / w)); } catch (e) { /* hors DOM */ }
    n.textContent = keep;
  }
  const eur = (n) => fr(Math.max(0, Math.round(n))) + NB + '€';
  const sc = (n, x, y, s, o, r) => {
    const S = Math.max(0.0001, s); setA(n, 'transform', `translate(${f2(x)} ${f2(y)})${r ? ` rotate(${f2(r)})` : ''} scale(${f2(S * 1000) / 1000})`);
    if (o !== undefined) setA(n, 'opacity', f2(o));
    setA(n, 'display', (o !== undefined && o <= 0.001) || s <= 0.001 ? 'none' : 'inline');
  };
  // aplat « sticker » : ombre dure + face, derrière le texte tn
  function box(grp, tn, w, h, face, shadow, r, sw, sh) {
    const a = rect(grp, -w / 2 + sh, -h / 2 + sh, w, h, r, shadow, shadow === C.ink ? undefined : C.ink, 4);
    const b = rect(grp, -w / 2, -h / 2, w, h, r, face, C.ink, sw);
    if (tn) { grp.insertBefore(a, tn); grp.insertBefore(b, tn); }
    return b;
  }
  const arc = (r, a0, a1) => {                                   // arc de cercle centré en (0,0), angles en degrés (0 = haut), sens horaire
    const A = Math.min(a1 - a0, 359.9), s = (a0 - 90) * ZV.D2R, e = (a0 + A - 90) * ZV.D2R;
    return `M${f2(Math.cos(s) * r)} ${f2(Math.sin(s) * r)} A${r} ${r} 0 ${A > 180 ? 1 : 0} 1 ${f2(Math.cos(e) * r)} ${f2(Math.sin(e) * r)}`;
  };

  const CY = 330, R = 170, X1 = 520, X2 = 1400;                  // chronomètres
  const BAR = { x: 180, y: 600, w: 1560, h: 80 };

  function stopwatch(parent, cx, cy) {
    const sg = g(parent, { transform: `translate(${cx} ${cy})` });
    circle(sg, 10, 10, R, C.pocket);
    rect(sg, -22 + 6, -R - 40 + 6, 44, 40, 8, C.pocket);
    rect(sg, -22, -R - 40, 44, 40, 8, C.paper, C.ink, 6);
    rect(sg, -66, -R - 4, 28, 36, 8, C.paper, C.ink, 5).setAttribute('transform', `rotate(-38 -52 ${-R})`);
    circle(sg, 0, 0, R, C.paper, C.ink, 8);
    circle(sg, 0, 0, R - 18, 'none', C.ink, 3);
    for (let k = 0; k < 12; k++) { const a = (k * 30 - 90) * ZV.D2R, r0 = k % 3 === 0 ? 112 : 124; line(sg, f2(Math.cos(a) * r0), f2(Math.sin(a) * r0), f2(Math.cos(a) * 140), f2(Math.sin(a) * 140), C.ink, k % 3 === 0 ? 8 : 5, { 'stroke-linecap': 'butt' }); }
    return sg;
  }

  ZV.define('bonus-x40', {
    init(root, shot) {
      const P = shot.props || {};
      const st = { dur: Math.max(0.1, shot.dur || 1) };
      st.depS = clamp(isNum(P.deposit_s) ? P.deposit_s : 2, 0.5, 10);
      st.wLab = str(P.withdraw_label, '3 À 5 JOURS OUVRÉS').toUpperCase();
      st.lockLab = str(P.lock_label, 'APRÈS 40 × LE BONUS').toUpperCase();
      st.bonus = clamp(isNum(P.bonus) ? P.bonus : 100, 1, 1e6);
      st.factor = clamp(isNum(P.factor) ? P.factor : 40, 1, 1000);
      st.edge = clamp(isNum(P.edge) ? P.edge : 2.7, 0.1, 50);
      st.startGift = P.start === 'gift';
      st.target = st.bonus * st.factor;
      st.keep = Math.round(st.target * st.edge / 100);
      const cu = (n) => ZV.cue(shot, n);
      const c = { dep: cu('deposit'), wd: cu('withdraw'), lock: cu('lock'), gift: cu('gift'), open: cu('open'), times: cu('times'), total: cu('total'), wager: cu('wager'), cmp: cu('compare') };
      st.c = c;
      st.gp = c.gift !== null ? c.gift : (st.startGift ? -1 : null);       // instant de bascule vers le temps 2

      rect(root, 0, 0, 1920, 1080, 0, C.ink);

      /* ================= Temps 1 : les chronos ================= */
      st.p1 = g(root);
      const p1 = st.p1;
      st.sw1 = stopwatch(p1, X1, CY); st.sw2 = stopwatch(p1, X2, CY);
      // DÉPÔT : arc lime (contour ink) + aiguille + « 2 S »
      st.arcO = path(st.sw1, arc(124, 0, 1), 'none', C.ink, 30, { 'stroke-linecap': 'butt' });
      st.arcL = path(st.sw1, arc(124, 0, 1), 'none', C.lime, 18, { 'stroke-linecap': 'butt' });
      st.hand1 = g(st.sw1); line(st.hand1, 0, 14, 0, -118, C.ink, 10); circle(st.hand1, 0, 0, 15, C.ink);
      st.two = g(st.sw1);
      circle(st.two, 0, 0, 140, C.ink, C.ink, 6);
      { const t = mono(st.two, '2 S', 0, 38, 110, C.lime, { anchor: 'middle', weight: 800 }); fit(t, 220); }
      // RETRAIT : aiguille lente
      st.hand2 = g(st.sw2); line(st.hand2, 0, 14, 0, -118, C.ink, 10); circle(st.hand2, 0, 0, 15, C.ink);
      st.t1 = text(p1, 'DÉPÔT', X1, 592, 72, C.paper, { anchor: 'middle' }); fit(st.t1, 330);
      st.t2 = text(p1, 'RETRAIT', X2, 592, 72, C.paper, { anchor: 'middle' }); fit(st.t2, 330);
      // frise de 5 jours
      st.days = [];
      ['LUN', 'MAR', 'MER', 'JEU', 'VEN'].forEach((d, i) => {
        const x = X2 - 320 + i * 132, dg = g(p1);
        const r0 = rect(dg, x, 628, 120, 56, 8, C.paper, C.ink, 4);
        const rf = rect(dg, x, 628, 120, 56, 8, C.lime, C.ink, 4); rf.setAttribute('display', 'none');
        mono(dg, d, x + 60, 666, 28, C.ink, { anchor: 'middle', weight: 800 });
        st.days.push({ r0, rf });
      });
      st.wl = mono(p1, st.wLab, X2, 735, 32, C.paper, { anchor: 'middle', weight: 800 }); fit(st.wl, 700);
      // cadenas + étiquette
      st.lock = g(p1);
      path(st.lock, 'M-44 -30 L-44 -70 A44 44 0 0 1 44 -70 L44 -30', 'none', C.ink, 30);
      path(st.lock, 'M-44 -30 L-44 -70 A44 44 0 0 1 44 -70 L44 -30', 'none', C.paper, 16);
      rect(st.lock, -76 + 8, -34 + 8, 152, 120, 14, C.ink);
      rect(st.lock, -76, -34, 152, 120, 14, C.red, C.ink, 6);
      circle(st.lock, 0, 12, 15, C.ink); rect(st.lock, -6, 20, 12, 36, 4, C.ink);
      st.lockLabG = g(p1);
      { const t = text(st.lockLabG, st.lockLab, 0, 15, 44, C.ink, { anchor: 'middle' }); fit(t, 520); const w = Math.min(540, measure(t, st.lockLab.length * 27)) + 60; box(st.lockLabG, t, w, 78, C.lime, C.ink, 14, 6, 9); }

      /* ================= Temps 2 : le calcul ================= */
      st.p2 = g(root);
      const p2 = st.p2;
      // paquet cadeau (centre 350, 370)
      st.gift = g(p2);
      st.giftBody = g(st.gift);
      rect(st.giftBody, 180 + 10, 290 + 10, 340, 230, 14, C.pocket);
      st.bodyFace = rect(st.giftBody, 180, 290, 340, 230, 14, C.paper, C.ink, 8);
      st.ribbon = g(st.giftBody);
      rect(st.ribbon, 320, 290, 60, 230, 0, C.lime, C.ink, 5);
      rect(st.ribbon, 180, 372, 340, 56, 0, C.lime, C.ink, 5);
      st.reveal = g(st.giftBody); st.reveal.setAttribute('display', 'none');
      rect(st.reveal, 180, 290, 340, 230, 14, C.ink, C.paper, 8);
      st.rv1 = text(st.reveal, eur(st.bonus), 350, 420, 120, C.lime, { anchor: 'middle' }); fit(st.rv1, 300);
      mono(st.reveal, 'DE BONUS', 350, 482, 32, C.paper, { anchor: 'middle', weight: 800 });
      st.lid = g(st.gift);
      rect(st.lid, 164 + 10, 226 + 10, 372, 72, 12, C.pocket);
      rect(st.lid, 164, 226, 372, 72, 12, C.paper, C.ink, 8);
      rect(st.lid, 320, 226, 60, 72, 0, C.lime, C.ink, 5);
      path(st.lid, 'M350 226 C300 176 262 190 276 226Z', C.lime, C.ink, 5);
      path(st.lid, 'M350 226 C400 176 438 190 424 226Z', C.lime, C.ink, 5);
      circle(st.lid, 350, 224, 20, C.lime, C.ink, 5);
      // équation : jetons plats qui tombent
      const mkPlate = (str1, size, face, tcol, maxW) => {
        const pg = g(p2);
        const t = text(pg, str1, 0, size * 0.34, size, tcol, { anchor: 'middle' }); fit(t, maxW);
        const w = Math.min(maxW, measure(t, bwEst(str1, size))) + 64;
        box(pg, t, w, 116, face, C.ink, 18, 7, 10);
        // l'ombre ink sur fond ink n'est pas visible : liseré paper fin sous le contour
        return { g: pg, w, h: 116 };
      };
      const bwEst = (s, size) => { let a = 0; for (const ch of String(s)) a += size * (ch === ' ' || ch === NB ? 0.26 : /[0-9]/.test(ch) ? 0.6 : /[A-ZÀÂÉÈÊÎÔÛÇ×=€]/.test(ch) ? 0.68 : 0.56); return a; };
      st.pl1 = mkPlate(eur(st.bonus), 96, C.paper, C.ink, 480);
      st.pl2 = mkPlate('× ' + fr(st.factor), 96, C.paper, C.ink, 400);
      st.pl3 = mkPlate('= ' + eur(st.target) + ' À MISER', 96, C.lime, C.ink, 1100);
      const gx = 620;
      st.pl1.cx = gx + st.pl1.w / 2; st.pl1.cy = 262;
      st.pl2.cx = gx + st.pl1.w + 36 + st.pl2.w / 2; st.pl2.cy = 262;
      st.pl3.cx = gx + st.pl3.w / 2; st.pl3.cy = 404;
      // barre de mise + compteur + kicker
      st.bar = g(p2);
      rect(st.bar, BAR.x, BAR.y, BAR.w, BAR.h, 14, 'none', C.paper, 6);
      st.barFill = rect(st.bar, BAR.x + 6, BAR.y + 6, 1, BAR.h - 12, 8, C.paper);
      st.barLab = mono(st.bar, 'MISÉ : ' + eur(0) + ' / ' + eur(st.target), BAR.x, 738, 34, C.paper, { weight: 800 });
      fitSize(st.barLab, 'MISÉ : ' + eur(st.target) + ' / ' + eur(st.target), 34, 900);
      st.cnt = text(st.bar, 'LA MAISON GARDE ≈' + NB + eur(0), BAR.x, 580, 48, C.lime);
      fitSize(st.cnt, 'LA MAISON GARDE ≈' + NB + eur(st.keep), 48, 800);
      st.kick = mono(st.bar, 'ROULETTE EUROPÉENNE · ' + String(st.edge).replace('.', ',') + ' %', BAR.x + BAR.w, 536, 26, C.paper, { anchor: 'end', weight: 800 }); fit(st.kick, 640);
      // comparaison
      st.cmp = g(p2);
      const BOT = 780, K = 4.4;
      st.hA = st.bonus * K * 0 + 440; st.hB = Math.round(st.hA * st.keep / st.bonus);
      if (st.hB > 500) { const f = 500 / st.hB; st.hA *= f; st.hB = 500; }
      st.blkA = g(st.cmp); st.blkB = g(st.cmp);
      st.rA = rect(st.blkA, 380, BOT - st.hA, 520, st.hA, 14, C.paper, C.ink, 8);
      st.rB = rect(st.blkB, 1020, BOT - st.hB, 520, st.hB, 14, C.lime, C.ink, 8);
      st.txA = g(st.blkA); st.txB = g(st.blkB);
      { const a = text(st.txA, 'LE CADEAU', 640, BOT - st.hA + 84, 52, C.ink, { anchor: 'middle' }); fit(a, 460);
        const b = text(st.txA, eur(st.bonus), 640, BOT - st.hA + 220, 124, C.ink, { anchor: 'middle' }); fit(b, 460);
        const c1 = text(st.txB, 'CE QUE GARDE', 1280, BOT - st.hB + 78, 44, C.ink, { anchor: 'middle' }); fit(c1, 460);
        const c2 = text(st.txB, 'LA MAISON', 1280, BOT - st.hB + 128, 44, C.ink, { anchor: 'middle' }); fit(c2, 460);
        const c3 = text(st.txB, '≈' + NB + eur(st.keep), 1280, BOT - st.hB + 262, 112, C.ink, { anchor: 'middle' }); fit(c3, 470);
        const c4 = mono(st.txB, 'EN MOYENNE', 1280, BOT - st.hB + 322, 36, C.ink, { anchor: 'middle', weight: 800 }); fit(c4, 460); }
      st.lt = g(st.cmp);
      circle(st.lt, 8, 8, 46, C.pocket, C.paper, 4);
      circle(st.lt, 0, 0, 46, C.paper, C.ink, 7);
      text(st.lt, '<', 0, 31, 90, C.ink, { anchor: 'middle' });
      return st;
    },

    update(st, t, shot) { try { draw(st, t); } catch (e) { /* jamais d'exception */ } }
  });

  function draw(st, t) {
    const c = st.c, gp = st.gp;

    /* ---------- temps 1 ---------- */
    const slide = gp === null ? 0 : (gp < 0 ? 1 : E.in3(prog(t, gp, gp + 0.4)));
    if (slide >= 1) setA(st.p1, 'display', 'none');
    else { setA(st.p1, 'display', 'inline'); setA(st.p1, 'transform', `translate(0 ${f2(-1150 * slide)})`); }

    // DÉPÔT : un tour d'arc lime en exactement deposit_s, puis « 2 S »
    const dp = c.dep === null ? 0 : prog(t, c.dep, c.dep + st.depS);
    setA(st.hand1, 'transform', `rotate(${f2(dp * 360)})`);
    if (dp > 0.002) { const d = arc(124, 0, dp * 360); setA(st.arcO, 'd', d); setA(st.arcL, 'd', d); setA(st.arcO, 'display', 'inline'); setA(st.arcL, 'display', 'inline'); }
    else { setA(st.arcO, 'display', 'none'); setA(st.arcL, 'display', 'none'); }
    if (c.dep !== null && t >= c.dep + st.depS) {
      const p = E.back(prog(t, c.dep + st.depS, c.dep + st.depS + 0.25));
      setA(st.two, 'display', 'inline'); setA(st.two, 'transform', `scale(${f2(Math.max(0.01, p) * 1000) / 1000})`);
      setA(st.hand1, 'display', 'none');
    } else { setA(st.two, 'display', 'none'); setA(st.hand1, 'display', 'inline'); }

    // RETRAIT : aiguille lente, jours remplis un par un (~0,5 s par case)
    const wd = c.wd;
    setA(st.hand2, 'transform', `rotate(${f2(wd === null ? 0 : Math.max(0, t - wd) * 14)})`);
    st.days.forEach((d, i) => { const on = wd !== null && t >= wd + 0.25 + i * 0.5; setA(d.rf, 'display', on ? 'inline' : 'none'); });

    // cadenas : tombe avec rebond (6 i) sur le chrono RETRAIT
    if (c.lock === null || t < c.lock) { setA(st.lock, 'display', 'none'); setA(st.lockLabG, 'display', 'none'); }
    else {
      const p = prog(t, c.lock, c.lock + 0.5), y = lerp(-120, CY - 6, E.bounce(p));
      setA(st.lock, 'display', 'inline'); setA(st.lock, 'transform', `translate(${X2} ${f2(y)})`);
      const q = E.back(prog(t, c.lock + 0.35, c.lock + 0.6));
      sc(st.lockLabG, X2, 468, 0.7 + 0.3 * q, prog(t, c.lock + 0.35, c.lock + 0.45));
    }

    /* ---------- temps 2 ---------- */
    if (gp === null) { setA(st.p2, 'display', 'none'); return; }
    setA(st.p2, 'display', 'inline');
    const cmp = c.cmp;
    const out = cmp === null ? 0 : prog(t, cmp, cmp + 0.3);           // le reste du temps 2 s'efface pour laisser la comparaison
    const arrive = gp < 0 ? 1 : E.out3(prog(t, gp + 0.3, gp + 0.8));
    const outO = 1 - out;
    // paquet
    if (gp >= 0 && t < gp + 0.3) setA(st.gift, 'display', 'none');
    else {
      setA(st.gift, 'display', outO <= 0.01 ? 'none' : 'inline');
      setA(st.gift, 'transform', `translate(0 ${f2((1 - arrive) * 520 + out * 40)})`); setA(st.gift, 'opacity', f2(outO));
      const op = c.open === null ? 0 : prog(t, c.open, c.open + 0.5);
      if (op <= 0) { setA(st.lid, 'transform', ''); setA(st.reveal, 'display', 'none'); setA(st.ribbon, 'display', 'inline'); }
      else {
        const e = E.out3(prog(op, 0, 0.7)), h = Math.sin(Math.PI * Math.min(1, op * 1.6)) * 30;
        setA(st.lid, 'transform', `translate(${f2(e * 110)} ${f2(-e * 120 - h)}) rotate(${f2(-14 * e)} 350 262)`);
        setA(st.reveal, 'display', 'inline'); setA(st.ribbon, 'display', 'none');
        const pr = E.back(prog(op, 0.1, 0.55)); setA(st.reveal, 'opacity', 1);
        setA(st.rv1, 'transform', `translate(350 ${f2(420 - (1 - Math.min(1, pr)) * 0)}) scale(${f2(Math.max(0.01, pr) * 1000) / 1000}) translate(-350 -420)`);
      }
    }
    // équation
    const drop = (pl, tc, size) => {
      if (tc === null || t < tc) { setA(pl.g, 'display', 'none'); return; }
      const p = prog(t, tc, tc + 0.55), y = lerp(pl.cy - 460, pl.cy, E.bounce(p));
      const op = outO;
      setA(pl.g, 'display', op <= 0.01 ? 'none' : 'inline'); setA(pl.g, 'opacity', f2(op));
      setA(pl.g, 'transform', `translate(${f2(pl.cx)} ${f2(y)}${size ? '' : ''})`);
    };
    drop(st.pl1, c.open === null ? null : c.open + 0.45);
    drop(st.pl2, c.times);
    if (c.total === null || t < c.total) setA(st.pl3.g, 'display', 'none');
    else { const p = E.out3(prog(t, c.total, c.total + 0.22)); sc(st.pl3.g, st.pl3.cx, st.pl3.cy, 1 + 0.45 * (1 - p), outO); }

    // barre de mise
    const wg = c.wager;
    if (wg === null || t < wg) setA(st.bar, 'display', 'none');
    else {
      const e = 1 - Math.pow(1 - prog(t, wg + 0.15, wg + 3.15), 1.4);
      setA(st.bar, 'display', outO <= 0.01 ? 'none' : 'inline'); setA(st.bar, 'opacity', f2(Math.min(outO, prog(t, wg, wg + 0.15))));
      setA(st.barFill, 'width', f2(Math.max(1, (BAR.w - 12) * e)));
      const mis = st.target * e;
      setT(st.barLab, 'MISÉ : ' + eur(mis) + ' / ' + eur(st.target));
      setT(st.cnt, 'LA MAISON GARDE ≈' + NB + eur(mis * st.edge / 100));
    }

    // comparaison finale : deux blocs à la même échelle, du bas (y 780) vers le haut
    if (cmp === null || t < cmp + 0.25) { setA(st.cmp, 'display', 'none'); return; }
    setA(st.cmp, 'display', 'inline');
    const BOT = 780, t0 = cmp + 0.25;
    const rise = (blk, rEl, txG, H, d) => {
      const p = E.out3(prog(t, t0 + d, t0 + d + 0.6)), h = H * p;
      setA(rEl, 'y', f2(BOT - h)); setA(rEl, 'height', f2(Math.max(0.1, h)));
      setA(txG, 'display', p >= 1 ? 'inline' : 'none');
      setA(blk, 'display', p <= 0.001 ? 'none' : 'inline');
    };
    rise(st.blkA, st.rA, st.txA, st.hA, 0);
    rise(st.blkB, st.rB, st.txB, st.hB, 0.15);
    { const p = E.back(prog(t, t0 + 0.9, t0 + 1.2)); sc(st.lt, 960, 540, p, prog(t, t0 + 0.9, t0 + 1.0)); }
  }
})();
