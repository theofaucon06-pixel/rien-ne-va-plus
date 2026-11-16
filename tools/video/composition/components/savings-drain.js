// Composant `savings-drain` (épisode 8) : l'argent de Sami, saison par saison. Voir EP8-COMPONENTS.md.
// Fond paper. Gauche : la jauge du compte ; droite : téléphone + lit ; entre les deux, un tuyau où défilent les jetons de dépôt.
// Mode `payday` : frise de 3 mois, le salaire tombe dans la jauge et repart le jour même par un seul gros jeton red.
// Cues : save, belief, r10, r100, r500, r1000 (noms = props.rates[].cue), bed, two-months, empty, payday (xN), rent.
// Fonction pure du temps ; aplats seulement ; aucun dégradé, flou, lueur, filter ; au plus 4 jetons émis par seconde.
(() => {
  'use strict';
  const { C, E, clamp, prog, lerp, f2, sv, g, rect, circle, path, line, text, put, shakeAt, fr } = ZV;
  let UID = 0;
  const NB = ' ';
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const str = (v, d) => (typeof v === 'string' && v.trim() ? v.trim() : d);
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const setT = (n, s) => { if (n.__s !== s) { n.__s = s; n.textContent = s; } };
  const mono = (parent, s, x, y, size, fill, o) => text(parent, s, x, y, size, fill, Object.assign({ mono: true }, o || {}));
  function fit(n, maxW) {
    try { const w = n.getComputedTextLength(); if (w > maxW && w > 0) { n.setAttribute('textLength', f2(maxW)); n.setAttribute('lengthAdjust', 'spacingAndGlyphs'); } } catch (e) { /* hors DOM */ }
  }
  // réduit la taille de police pour que le pire cas tienne dans maxW (texte dynamique)
  function fitSize(n, worst, size, maxW) {
    const keep = n.textContent;
    n.textContent = worst;
    try { const w = n.getComputedTextLength(); if (w > maxW && w > 0) n.setAttribute('font-size', f2(size * maxW / w)); } catch (e) { /* hors DOM */ }
    n.textContent = keep;
  }
  // boîte « sticker » (ombre dure + face) placée derrière le texte `tn`
  function boxBehind(grp, tn, w, h, face, shadow, r, sw, sh) {
    const a = rect(grp, -w / 2 + sh, -h / 2 + sh, w, h, r, shadow, C.ink, 4);
    const b = rect(grp, -w / 2, -h / 2, w, h, r, face, C.ink, sw);
    grp.insertBefore(a, tn); grp.insertBefore(b, tn);
  }
  const eur = (n) => fr(Math.max(0, Math.round(n))) + NB + '€';

  const GX = 140, GY = 150, GW = 300, GH = 630, GI = 8;            // jauge
  const PX0 = 440, PX1 = 1540, PY = 380, PH = 90;                  // tuyau
  const SPEED = 640;
  const TOK = [{ w: 34, h: 22, f: 0, rate: 0.8 }, { w: 100, h: 50, f: 28, rate: 1.6 }, { w: 124, h: 58, f: 32, rate: 2.6 }, { w: 150, h: 66, f: 36, rate: 3.6 }];
  const POOL = 14;

  ZV.define('savings-drain', {
    init(root, shot) {
      const P = shot.props || {};
      const uid = 'sd' + (++UID);
      const st = { uid, dur: Math.max(0.1, shot.dur || 1) };
      st.mode = P.mode === 'payday' ? 'payday' : 'seasons';
      st.savings = clamp(isNum(P.savings) ? P.savings : 15000, 1, 1e9);
      st.start = clamp(isNum(P.start_level) ? P.start_level : 0, 0, st.savings);
      st.months = clamp(Math.round(isNum(P.months) ? P.months : 3), 1, 3);
      st.belief = str(P.belief, '« UN PEU LE JEU », SE DIT-IL');
      const dr = [{ cue: 'r10', label: '10' + NB + '€', amount: 10 }, { cue: 'r100', label: '100' + NB + '€ / SEMAINE', amount: 100 }, { cue: 'r500', label: '500' + NB + '€ / SEMAINE', amount: 500 }, { cue: 'r1000', label: '1' + ' ' + '000' + NB + '€ / JOUR', amount: 1000 }];
      st.rates = (Array.isArray(P.rates) && P.rates.length ? P.rates.slice(0, 6) : dr).map((r, i) => ({
        cue: str(r && r.cue, dr[i] ? dr[i].cue : 'r' + i), label: str(r && r.label, dr[i] ? dr[i].label : '').replace(/ /g, NB), amount: isNum(r && r.amount) ? r.amount : (dr[i] ? dr[i].amount : 100), tok: TOK[Math.min(i, TOK.length - 1)]
      }));

      /* ---- repères ---- */
      const cu = (n) => ZV.cue(shot, n);
      const c = { save: cu('save'), belief: cu('belief'), bed: cu('bed'), two: cu('two-months'), empty: cu('empty'), rent: cu('rent') };
      st.rc = st.rates.map((r) => cu(r.cue));
      st.pay = ZV.cues(shot, 'payday').map((b) => b.t).sort((a, b) => a - b).slice(0, st.months);
      const none = Object.values(c).every((x) => x === null) && st.rc.every((x) => x === null) && !st.pay.length;
      if (none) {
        const f = Math.min(1, st.dur / 14);
        if (st.mode === 'payday') st.pay = [0.15, 0.43, 0.71].slice(0, st.months).map((x) => x * st.dur);
        else { c.save = 0.3 * f; c.belief = 3.0 * f; st.rc = st.rates.map((r, i) => (4.4 + 1.2 * i) * f); c.bed = 9.4 * f; c.two = 10.6 * f; c.empty = 12.4 * f; }
      }
      if (st.mode === 'payday' && !st.pay.length && !none) st.pay = [];
      st.c = c;

      /* ---- segments de cadence + liste des jetons (déterministe) ---- */
      const segs = [];
      const order = st.rc.map((t, i) => ({ t, i })).filter((x) => x.t !== null).sort((a, b) => a.t - b.t);
      const tStop = Math.min(c.two !== null ? c.two : Infinity, c.empty !== null ? c.empty : Infinity, st.dur + 1);
      order.forEach((o, k) => { const end = Math.min(k + 1 < order.length ? order[k + 1].t : Infinity, tStop); if (end > o.t) segs.push({ a: o.t, b: end, i: o.i }); });
      st.segs = segs;
      st.tokens = [];
      if (st.mode === 'seasons') {
        segs.forEach((s) => { const tk = st.rates[s.i].tok, step = 1 / tk.rate; for (let te = s.a + 0.12; te < s.b - 0.02; te += step) st.tokens.push({ te, i: s.i }); });
        if (c.empty !== null) { const N = 6, last = st.rates.length - 1; for (let j = 0; j < N; j++) st.tokens.push({ te: c.empty + 1.7 * (1 - Math.sqrt(1 - j / N)) * 1.0 + 0.05, i: last }); }
        st.tokens.sort((a, b) => a.te - b.te);
      }
      // flux naturel (€ par seconde, continu) pour la jauge ; mis à l'échelle pour valoir exactement 5 000 € à `two-months`
      st.flow = segs.map((s) => ({ a: s.a, b: s.b, v: st.rates[s.i].amount * st.rates[s.i].tok.rate }));
      st.nat = (t) => { let d = 0; for (const f of st.flow) d += f.v * clamp(t - f.a, 0, f.b - f.a); return d; };
      st.tStart = (c.save !== null ? c.save + 2.5 : 0);
      if (c.two !== null) { const N = st.nat(c.two); st.twoN = N; }

      /* ---- décor ---- */
      rect(root, 0, 0, 1920, 1080, 0, C.paper);
      const defs = sv('defs', null, root);
      const pt = sv('pattern', { id: uid + 'h', width: 16, height: 16, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
      sv('rect', { x: 0, y: 0, width: 16, height: 16, fill: C.lime }, pt); sv('rect', { x: 0, y: 0, width: 5, height: 16, fill: C.ink }, pt);
      const clipB = sv('clipPath', { id: uid + 'cb' }, defs); sv('rect', { x: 0, y: 0, width: 1920, height: GY + 2 }, clipB);

      /* tuyau */
      rect(root, PX0 + 8, PY + 8, PX1 - PX0, PH, 6, C.ink);
      rect(root, PX0, PY, PX1 - PX0, PH, 6, C.pocket, C.ink, 6);
      line(root, PX0 + 20, PY + PH / 2, PX1 - 20, PY + PH / 2, '#2A2A2A', 3, { 'stroke-dasharray': '2 24', 'stroke-linecap': 'butt' });
      /* jetons (réserve) */
      st.tk = [];
      for (let k = 0; k < POOL; k++) {
        const tg = g(root); tg.setAttribute('display', 'none');
        const r = rect(tg, 0, 0, 100, 50, 12, C.red, C.ink, 4);
        const tx = mono(tg, '', 50, 34, 28, C.paper, { anchor: 'middle', weight: 800 });
        st.tk.push({ g: tg, r, tx });
      }
      /* gros jeton du jour de paie */
      st.big = g(root); st.big.setAttribute('display', 'none');
      rect(st.big, 0, 0, 240, 70, 14, C.red, C.ink, 5);
      { const t = text(st.big, 'SALAIRE', 120, 49, 40, C.paper, { anchor: 'middle' }); fit(t, 200); }

      /* jauge */
      st.gaugeG = g(root);
      rect(st.gaugeG, GX + 10, GY + 10, GW, GH, 20, C.ink);
      rect(st.gaugeG, GX, GY, GW, GH, 20, C.white);
      st.fill = rect(st.gaugeG, GX + GI, GY + GH - GI, GW - 2 * GI, 0, 6, C.lime);
      st.slice = rect(st.gaugeG, GX + GI, GY + GI, GW - 2 * GI, 36, 6, `url(#${uid}h)`, C.ink, 3);
      rect(st.gaugeG, GX, GY, GW, GH, 20, 'none', C.ink, 8);
      st.gaugeG.insertBefore(st.fill, st.slice);

      /* blocs « SALAIRE » qui tombent dans la jauge */
      st.blk = [];
      { const bg = g(root, { 'clip-path': `url(#${uid}cb)` }); const nb = st.mode === 'payday' ? 1 : 6;
        for (let k = 0; k < nb; k++) { const b = g(bg); b.setAttribute('display', 'none'); const w = st.mode === 'payday' ? 230 : 210, h = st.mode === 'payday' ? 66 : 50; rect(b, -w / 2 + 6, -h / 2 + 6, w, h, 10, C.ink); rect(b, -w / 2, -h / 2, w, h, 10, C.paper, C.ink, 6); const t = text(b, 'SALAIRE', 0, h * 0.18, st.mode === 'payday' ? 44 : 32, C.ink, { anchor: 'middle' }); fit(t, w - 24); st.blk.push(b); } }

      /* solde, étiquette, compteur */
      st.bal = text(root, eur(st.start), GX, 92, 84, C.ink);
      fitSize(st.bal, eur(st.savings), 84, 360);
      st.balLab = mono(root, st.mode === 'payday' ? 'SOLDE' : 'DE CÔTÉ', GX, 134, 26, C.ink, { weight: 800 });
      st.cnt = mono(root, 'PARTIS : ' + eur(0), PX0 + 60, 585, 40, C.ink, { weight: 800 });
      fitSize(st.cnt, 'PARTIS : ' + eur(st.savings), 40, 560);
      if (st.mode === 'payday') { st.bal.setAttribute('display', 'none'); st.cnt.setAttribute('display', 'none'); }

      /* étiquette « belief » à droite de la jauge */
      st.beliefLab = mono(root, st.belief, GX + GW + 24, 186, 24, C.ink, { weight: 800 }); fit(st.beliefLab, 640);

      /* stickers de rythme */
      st.rs = st.rates.map((r) => {
        const sg = g(root); sg.setAttribute('display', 'none');
        const t = text(sg, r.label, 0, 19, 56, C.lime, { anchor: 'middle' });
        let w = 300; try { w = t.getComputedTextLength(); } catch (e) { w = r.label.length * 34; } if (!(w > 0)) w = r.label.length * 34;
        w = Math.min(w, 640); if (w >= 640) { t.setAttribute('textLength', 640); t.setAttribute('lengthAdjust', 'spacingAndGlyphs'); }
        const bw = w + 64;
        boxBehind(sg, t, bw, 84, C.ink, C.lime, 16, 6, 10);
        return sg;
      });

      /* téléphone + lit */
      st.pg = g(root);
      const PG = st.pg;
      rect(PG, 1440 + 8, 640 + 8, 400, 120, 24, C.ink);
      rect(PG, 1440, 640, 400, 120, 24, C.paper, C.ink, 6);
      rect(PG, 1458, 618, 110, 54, 22, C.white, C.ink, 5);
      rect(PG, 1590, 690, 236, 56, 16, C.pocket, C.ink, 4);
      rect(PG, 1540 + 12, 220 + 12, 220, 420, 34, C.ink);
      rect(PG, 1540, 220, 220, 420, 34, C.pocket, C.ink, 8);
      rect(PG, 1556, 250, 188, 360, 22, C.ink);
      rect(PG, 1610, 236, 80, 12, 6, C.ink);
      st.scr = [0, 1, 2].map((i) => rect(PG, 1572 + i * 60, 300, 52, 52, 8, C.paper));
      st.pbar = rect(PG, 1572, 400, 156, 22, 6, C.paper); rect(PG, 1572, 440, 100, 22, 6, C.pocket, C.paper, 3);
      rect(PG, 1572, 400, 156, 22, 6, 'none', C.paper, 3);
      st.bedLab = g(root);
      { const t = text(st.bedLab, 'DEPUIS SON LIT', 0, 12, 34, C.lime, { anchor: 'middle' }); fit(t, 300); boxBehind(st.bedLab, t, 340, 60, C.ink, C.lime, 14, 5, 8); }
      st.bedLab.setAttribute('display', 'none');

      /* « EN 2 MOIS », tampon « PLUS RIEN » */
      st.two = g(root);
      { rect(st.two, -150 + 10, -42 + 10, 300, 84, 14, C.ink); rect(st.two, -150, -42, 300, 84, 14, C.red, C.ink, 6); const t = text(st.two, 'EN 2 MOIS', 0, 19, 56, C.ink, { anchor: 'middle' }); fit(t, 260); }
      st.two.setAttribute('display', 'none');
      st.stamp = g(root);
      { rect(st.stamp, -170 + 8, -46 + 8, 340, 92, 10, C.paper); rect(st.stamp, -170, -46, 340, 92, 10, C.ink, C.ink, 5); const t = text(st.stamp, 'PLUS RIEN', 0, 17, 52, C.paper, { anchor: 'middle' }); fit(t, 300); }
      st.stamp.setAttribute('display', 'none');

      /* le loyer */
      st.rent = g(root);
      { rect(st.rent, -160 + 10, -60 + 10, 320, 120, 16, C.ink); rect(st.rent, -160, -60, 320, 120, 16, C.paper, C.ink, 6);
        const t = text(st.rent, 'LE LOYER', -140, 14, 42, C.ink); fit(t, 210);
        text(st.rent, '?', 140, 40, 130, C.red, { anchor: 'end' }); }
      st.rent.setAttribute('display', 'none');

      /* frise de 3 mois (mode payday) */
      st.cells = [];
      if (st.mode === 'payday') {
        const X0 = 560, CW = 40, CH = 26;
        for (let m = 0; m < st.months; m++) {
          const y = 110 + m * 30;
          mono(root, 'MOIS ' + (m + 1), X0 - 14, y + 19, 18, C.ink, { anchor: 'end', weight: 800 });
          for (let d = 1; d <= 30; d++) {
            const x = X0 + (d - 1) * CW;
            const r = rect(root, x + 1, y, CW - 3, CH, 3, C.paper, C.ink, 3);
            const t = mono(root, String(d), x + (CW - 3) / 2 + 1, y + 19, 18, C.ink, { anchor: 'middle', weight: 700 });
            if (d === 28) st.cells.push({ r, t, x: x + (CW - 3) / 2 + 1, y });
          }
        }
        st.same = g(root); st.same.setAttribute('display', 'none');
        { const t = mono(st.same, 'LE JOUR MÊME', 0, 0, 24, C.red, { anchor: 'middle', weight: 800 }); fit(t, 200);
          path(st.same, 'M-10 12 L10 12 L0 26Z', C.red, C.ink, 2); }
        st.sameX = st.cells.length ? st.cells[0].x : 1659;
      }
      return st;
    },

    update(st, t, shot) { try { draw(st, t); } catch (e) { /* jamais d'exception */ } }
  });

  function draw(st, t) {
    const c = st.c, S = st.savings;
    /* ---- niveau du compte ---- */
    let lvl, partis = 0, emptied = false, lvlFrac;
    const payday = st.mode === 'payday';
    let payLvl = 0, payIdx = -1, payP = 0;
    if (payday) {
      for (let m = 0; m < st.pay.length; m++) if (t >= st.pay[m] - 0.001) { payIdx = m; payP = t - st.pay[m]; }
      if (payIdx >= 0) payLvl = 0.7 * E.out2(prog(payP, 0.28, 0.55)) * (1 - E.in2(prog(payP, 0.62, 1.1)));
      lvl = payLvl * S;
    } else {
      const base = c.save === null ? st.start : st.start + (S - st.start) * (1 - Math.pow(1 - prog(t, c.save, c.save + 2.5), 1.6));
      const baseAt = (tt) => (c.save === null ? st.start : st.start + (S - st.start) * (1 - Math.pow(1 - prog(tt, c.save, c.save + 2.5), 1.6)));
      const Dat = (tt) => {
        if (c.two !== null && tt >= c.two) return 5000;
        const nat = st.nat(tt);
        if (c.two !== null) {
          if (st.twoN > 0) return 5000 * nat / st.twoN;
          return 5000 * prog(tt, st.tStart, c.two);
        }
        return Math.min(nat, 0.75 * S);
      };
      const te = c.empty !== null ? Math.min(t, c.empty) : t;
      const D = Math.min(Dat(te), baseAt(te));
      lvl = Math.max(0, base - D);
      partis = D;
      if (c.empty !== null && t > c.empty) {
        const l0 = Math.max(0, baseAt(c.empty) - Math.min(Dat(c.empty), baseAt(c.empty))), p = prog(t, c.empty, c.empty + 1.8), q = Math.pow(p, 1.6);
        lvl = l0 * (1 - q); partis = D + l0 * q; emptied = p >= 1;
      }
    }
    lvlFrac = clamp(lvl / S, 0, 1);
    const IH = GH - 2 * GI, fh = IH * lvlFrac;
    setA(st.fill, 'y', f2(GY + GH - GI - fh)); setA(st.fill, 'height', f2(fh));
    if (!payday) {
      setT(st.bal, eur(lvl)); setA(st.bal, 'fill', emptied ? C.red : C.ink);
      setT(st.cnt, 'PARTIS : ' + eur(partis));
    }

    /* tranche « belief » : en haut de la jauge, lime hachurée */
    if (c.belief === null || t < c.belief || payday) { setA(st.slice, 'display', 'none'); setA(st.beliefLab, 'display', 'none'); }
    else {
      const p = E.out2(prog(t, c.belief, c.belief + 0.3));
      const top = GY + GH - GI - fh, hh = Math.min(36, fh);
      setA(st.slice, 'display', hh > 2 ? 'inline' : 'none'); setA(st.slice, 'y', f2(top)); setA(st.slice, 'height', f2(hh * p));
      setA(st.beliefLab, 'display', hh > 2 ? 'inline' : 'none'); setA(st.beliefLab, 'opacity', f2(p));
      setA(st.beliefLab, 'y', f2(clamp(top + 28, 186, 346)));
    }

    /* blocs SALAIRE */
    if (payday) {
      const b = st.blk[0];
      if (payIdx < 0 || payP > 0.7) setA(b, 'display', 'none');
      else { const k = prog(payP, 0, 0.42); setA(b, 'display', 'inline'); setA(b, 'transform', `translate(${GX + GW / 2} ${f2(lerp(-80, GY + 20, E.in2(k)))})`); }
    } else {
      st.blk.forEach((b, j) => {
        const t0 = c.save === null ? null : c.save + j * 0.4, k = t0 === null ? -1 : prog(t, t0, t0 + 0.4);
        if (t0 === null || t < t0 || k >= 1) { setA(b, 'display', 'none'); return; }
        setA(b, 'display', 'inline'); setA(b, 'transform', `translate(${GX + GW / 2} ${f2(lerp(-70, GY + 24, E.in2(k)))})`);
      });
    }

    /* jetons dans le tuyau */
    let used = 0;
    const emitted = payday ? [] : st.tokens;
    const ypos = PY + (PH - 0) / 2;
    // premier jeton encore dans le tuyau (liste triée par instant d'émission)
    let first = 0; while (first < emitted.length && (t - emitted[first].te) * SPEED > 1300) first++;
    for (let k = first; k < emitted.length && used < POOL; k++) {
      const e = emitted[k]; if (e.te > t) break;
      const tk = st.rates[e.i].tok, node = st.tk[k % POOL], x = 360 + (t - e.te) * SPEED;
      if (x > 1580) continue;
      setA(node.g, 'display', 'inline'); setA(node.g, 'transform', `translate(${f2(x)} ${f2(ypos - tk.h / 2)})`);
      setA(node.r, 'width', tk.w); setA(node.r, 'height', tk.h); setA(node.r, 'rx', Math.min(12, tk.h / 3));
      if (tk.f) { setA(node.tx, 'display', 'inline'); setA(node.tx, 'x', tk.w / 2); setA(node.tx, 'y', f2(tk.h / 2 + tk.f * 0.35)); setA(node.tx, 'font-size', tk.f); setT(node.tx, fr(st.rates[e.i].amount)); }
      else setA(node.tx, 'display', 'none');
      used++; node.on = t;
    }
    const aliveSet = new Set();
    for (let k = first; k < emitted.length; k++) { if (emitted[k].te > t) break; const x = 360 + (t - emitted[k].te) * SPEED; if (x <= 1580) aliveSet.add(k % POOL); }
    st.tk.forEach((n, i) => { if (!aliveSet.has(i)) setA(n.g, 'display', 'none'); });
    // gros jeton du jour de paie
    if (payday && payIdx >= 0 && payP >= 0.6 && payP < 2.2) {
      const x = 330 + (payP - 0.6) * 760; setA(st.big, 'display', x < 1580 ? 'inline' : 'none'); setA(st.big, 'transform', `translate(${f2(x)} ${f2(ypos - 35)})`);
    } else setA(st.big, 'display', 'none');

    /* rythme courant */
    let cur = -1, tcur = 0;
    st.rc.forEach((tc, i) => { if (tc !== null && t >= tc && tc >= tcur - 1e-9 && (cur < 0 || tc >= tcur)) { cur = i; tcur = tc; } });
    st.rs.forEach((sg, i) => {
      if (payday || i !== cur || (c.empty !== null && t >= c.empty + 1.8)) { setA(sg, 'display', 'none'); return; }
      const p = prog(t, tcur, tcur + 0.25), s = 0.6 + 0.4 * E.back(p);
      setA(sg, 'display', 'inline'); setA(sg, 'transform', `translate(990 282) scale(${f2(s * 1000) / 1000})`);
    });

    /* téléphone + lit : secousse unique, étiquette */
    let sx = 0, sy = 0;
    if (c.bed !== null) { const s = shakeAt(t, c.bed, 4, 0.4); sx = s[0]; sy = s[1]; }
    setA(st.pg, 'transform', `translate(${f2(sx)} ${f2(sy)})`);
    if (c.bed === null || t < c.bed) setA(st.bedLab, 'display', 'none');
    else { const p = E.back(prog(t, c.bed, c.bed + 0.3)); setA(st.bedLab, 'display', 'inline'); setA(st.bedLab, 'transform', `translate(1640 ${f2(804 - (1 - Math.min(1, p)) * 0)}) scale(${f2(Math.max(0.01, p) * 1000) / 1000})`); }

    /* « EN 2 MOIS » et tampon « PLUS RIEN » */
    if (c.two === null || t < c.two || payday) setA(st.two, 'display', 'none');
    else { const p = E.back(prog(t, c.two, c.two + 0.3)); setA(st.two, 'display', 'inline'); setA(st.two, 'transform', `translate(1220 585) rotate(-3) scale(${f2(Math.max(0.01, p) * 1000) / 1000})`); }
    if (c.empty === null || t < c.empty + 1.8 || payday) setA(st.stamp, 'display', 'none');
    else { const p = E.in2(1 - prog(t, c.empty + 1.8, c.empty + 2.05)); const s = 1 + 0.6 * p; setA(st.stamp, 'display', 'inline'); setA(st.stamp, 'opacity', f2(1 - p)); setA(st.stamp, 'transform', `translate(${GX + GW / 2} ${GY + GH / 2}) rotate(-6) scale(${f2(s * 1000) / 1000})`); }

    /* loyer */
    if (c.rent === null || t < c.rent) setA(st.rent, 'display', 'none');
    else { const p = E.back(prog(t, c.rent, c.rent + 0.35)); setA(st.rent, 'display', 'inline'); setA(st.rent, 'transform', `translate(1260 700) rotate(3) scale(${f2(Math.max(0.01, p) * 1000) / 1000})`); }

    /* frise des paies */
    if (payday) {
      st.cells.forEach((cl, m) => {
        const tp = st.pay[m], on = tp !== undefined && t >= tp + 0.55;
        setA(cl.r, 'fill', on ? C.red : C.paper); setA(cl.t, 'fill', on ? C.paper : C.ink);
      });
      if (payIdx < 0 || payP < 0.6) setA(st.same, 'display', 'none');
      else {
        const p = E.back(prog(payP, 0.6, 0.85)), cl = st.cells[payIdx] || st.cells[0];
        setA(st.same, 'display', 'inline');
        setA(st.same, 'transform', `translate(${f2(st.sameX)} 82) scale(${f2(Math.max(0.01, p) * 1000) / 1000})`);
      }
    }
  }
})();
