// Composant `pawn-counter` : le comptoir du mont-de-piété (Baden-Baden, S3 de l'épisode 3), puis la forge sous leur chambre.
// Cues : ring, earrings, dress, coat, forge, alarm, empty. Objets plats posés un à un puis étiquetés « EN GAGE » ; scène forge (enclume, marteau ≈ 2 coups/s, éclats plats, réveil barré 5 H) ; comptoir vide.
// Fond paper (comptoir) / red (forge). Aucun dégradé, flou, lueur ni filter ; rien ne clignote (le marteau est un mouvement, les éclats sont des formes plates).
(() => {
  'use strict';
  const { C, E, clamp, prog, lerp, f2, sv, g, rect, circle, path, line, text, put, sticker, shakeAt } = ZV;
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  function fit(n, maxW) {
    try { const w = n.getComputedTextLength(); if (w > maxW && w > 0) { n.setAttribute('textLength', f2(maxW)); n.setAttribute('lengthAdjust', 'spacingAndGlyphs'); } } catch (e) { /* hors DOM */ }
  }
  const str = (v, d) => (typeof v === 'string' && v.trim() ? v.trim() : d);

  const KEYS = ['ring', 'earrings', 'dress', 'coat'];
  const DEF = { ring: 'L’ALLIANCE', earrings: 'LES BOUCLES D’OREILLES', dress: 'LA ROBE', coat: 'SON MANTEAU' };
  const SLOT_X = [250, 600, 950, 1300];
  const TOP = 556;            // dessus du comptoir
  const TAGY = 716;           // centre des étiquettes
  const PIV = { x: 1250, y: 350 }, HL = 470, A_UP = -28, A_DN = 17, TH = 0.5; // marteau

  /* ---- objets plats (origine = milieu du bas de l'objet) ---- */
  function drawRing(o) {
    path(o, 'M-92 0 L-72 -38 L72 -38 L92 0Z', C.ink, C.ink, 6);
    circle(o, 0, -112, 66, 'none', C.ink, 42);
    circle(o, 0, -112, 66, 'none', C.paper, 26);
    path(o, 'M0 -214 L26 -186 L0 -158 L-26 -186Z', C.lime, C.ink, 6);
  }
  function drawEarrings(o) {
    rect(o, -104, -22, 208, 22, 4, C.ink);
    rect(o, -7, -250, 14, 230, 3, C.ink);
    rect(o, -112, -262, 224, 16, 6, C.ink);
    for (const sx of [-68, 68]) {
      line(o, sx, -246, sx, -206, C.ink, 5);
      path(o, `M${sx} -206 q-14 -4 -14 -18`, 'none', C.ink, 5);
      circle(o, sx, -150, 44, C.paper, C.ink, 7);
      circle(o, sx, -150, 17, C.lime, C.ink, 5);
    }
  }
  function drawDress(o) {
    line(o, 0, -258, 0, -282, C.ink, 5);
    path(o, 'M0 -282 q22 -2 22 -18 q0 -18 -22 -18 q-22 0 -22 18', 'none', C.ink, 5);
    path(o, 'M-44 -252 L-24 -252 L0 -224 L24 -252 L44 -252 L32 -150 L128 -2 Q0 18 -128 -2 L-32 -150Z', C.red, C.ink, 7);
    rect(o, -33, -160, 66, 16, 2, C.ink);
    path(o, 'M-60 -60 Q-40 -40 -66 -20 M60 -60 Q40 -40 66 -20', 'none', C.ink, 4);
  }
  function drawCoat(o) {
    const body = 'M-50 -246 L-26 -258 L0 -236 L26 -258 L50 -246 L108 -196 L92 -78 L58 -86 L58 0 L-58 0 L-58 -86 L-92 -78 L-108 -196Z';
    path(o, body, C.ink, C.ink, 14);
    path(o, body, C.ink, C.paper, 5, { transform: 'translate(0 -122) scale(0.9) translate(0 122)' });
    path(o, 'M-26 -256 L0 -150 L26 -256', 'none', C.paper, 5);
    line(o, 0, -150, 0, -6, C.paper, 5);
    for (const y of [-120, -80, -40]) circle(o, 14, y, 6, C.paper);
    path(o, 'M-44 -50 L-18 -50 M18 -50 L44 -50', 'none', C.paper, 5);
  }
  const DRAW = { ring: drawRing, earrings: drawEarrings, dress: drawDress, coat: drawCoat };

  function drawClock(parent) {
    const c = g(parent);
    for (const s of [-1, 1]) {
      circle(c, s * 66, -100, 38, C.lime, C.ink, 7);
      line(c, s * 40, -80, s * 52, -64, C.ink, 7);
    }
    line(c, 0, -118, 0, -128, C.ink, 8);
    line(c, -60, 90, -80, 124, C.ink, 9); line(c, 60, 90, 80, 124, C.ink, 9);
    circle(c, 0, 0, 104, C.ink);
    circle(c, 0, 0, 104, C.paper, C.ink, 8);
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; line(c, Math.sin(a) * 80, -Math.cos(a) * 80, Math.sin(a) * 92, -Math.cos(a) * 92, C.ink, i % 3 === 0 ? 7 : 4); }
    const ha = 150 * Math.PI / 180;
    line(c, 0, 0, Math.sin(ha) * 50, -Math.cos(ha) * 50, C.ink, 11);
    line(c, 0, 0, 0, -74, C.ink, 7);
    circle(c, 0, 0, 10, C.red, C.ink, 4);
    return c;
  }

  ZV.define('pawn-counter', {
    init(root, shot) {
      const p = (shot && shot.props) || {};
      const beats = Array.isArray(shot && shot.beats) ? shot.beats : [];
      const dur = isNum(shot && shot.dur) && shot.dur > 0 ? shot.dur : 10;
      const cueT = (n) => { const b = beats.filter((x) => x && x.do === 'cue' && x.name === n && isNum(x.t)).sort((a, c) => a.t - c.t)[0]; return b ? b.t : null; };
      const labels = Object.assign({}, DEF, p.labels && typeof p.labels === 'object' ? p.labels : {});
      const tagTxt = str(p.tag, 'EN GAGE');
      const st = { dur, tag: tagTxt, tc: {}, n: -1 };
      KEYS.forEach((k) => { st.tc[k] = cueT(k); });
      st.tF = cueT('forge'); st.tA = cueT('alarm'); st.tE = cueT('empty');
      st.eAfter = st.tF != null && st.tE != null && st.tE > st.tF + 0.5;
      st.rng = ZV.rng(1866);

      /* ================= scène comptoir ================= */
      st.cs = g(root);
      const cs = st.cs;
      rect(cs, 0, 0, 1920, 1080, 0, C.paper);
      // mur : plinthe et traits
      rect(cs, 0, 300, 1920, 10, 0, C.ink, null, 0, { opacity: 0.12 });
      rect(cs, 0, 318, 1920, 4, 0, C.ink, null, 0, { opacity: 0.12 });
      // enseigne et plaque de compte
      const sg = g(cs, { transform: 'translate(430 112) rotate(-2)' });
      sticker(sg, 640, 104, C.lime, '', 1, C.ink, { sh: 10 });
      fit(text(sg, 'MONT-DE-PIÉTÉ', 0, 20, 62, C.ink, { anchor: 'middle' }), 580);
      st.plaque = g(cs);
      sticker(st.plaque, 700, 96, C.white, '', 1, C.ink, { sh: 10, r: 14 });
      st.plaqueT = text(st.plaque, 'OBJETS EN GAGE : 0', 0, 15, 44, C.ink, { anchor: 'middle', mono: true });
      // comptoir
      rect(cs, -10, TOP, 1940, 64, 0, C.ink);
      line(cs, 0, TOP + 12, 1920, TOP + 12, C.paper, 4, { opacity: 0.55 });
      rect(cs, -10, TOP + 64, 1940, 500, 0, C.pocket, C.ink, 6);
      for (let x = 100; x < 1920; x += 240) line(cs, x, TOP + 76, x, 1080, C.ink, 5);
      // tiroir ouvert (à droite)
      st.drawer = g(cs);
      path(st.drawer, 'M1556 636 L1848 636 L1894 700 L1510 700Z', C.lime, C.ink, 6);
      path(st.drawer, 'M1556 636 L1848 636 L1894 700 L1510 700Z', 'none', C.ink, 6);
      line(st.drawer, 1540, 662, 1864, 662, C.ink, 4, { opacity: 0.25 });
      rect(st.drawer, 1510, 700, 384, 108, 6, C.pocket, C.paper, 6);
      rect(st.drawer, 1640, 740, 124, 18, 9, C.paper, C.ink, 4);

      // objets
      st.items = KEYS.map((k, i) => {
        const og = g(cs);
        DRAW[k](og);
        return { k, og, x: SLOT_X[i] };
      });
      // étiquettes
      st.tags = KEYS.map((k, i) => {
        const tg = g(cs);
        rect(tg, -160 + 10, -84 + 10, 320, 168, 10, C.ink);
        rect(tg, -160, -84, 320, 168, 10, C.white, C.ink, 6);
        path(tg, 'M-160 -30 L-160 -74 A10 10 0 0 1 -150 -84 L150 -84 A10 10 0 0 1 160 -74 L160 -30Z', C.red, C.ink, 6);
        fit(text(tg, tagTxt, 0, -40, 40, C.ink, { anchor: 'middle', mono: true }), 290);
        const lab = str(labels[k], DEF[k]);
        let a = lab, b = '';
        if (lab.length > 13) {
          const w = lab.split(/\s+/); let best = 1, bd = 1e9;
          for (let j = 1; j < w.length; j++) { const d = Math.abs(w.slice(0, j).join(' ').length - w.slice(j).join(' ').length); if (d < bd) { bd = d; best = j; } }
          a = w.slice(0, best).join(' '); b = w.slice(best).join(' ');
        }
        if (b) { fit(text(tg, a, 0, 14, 36, C.ink, { anchor: 'middle' }), 290); fit(text(tg, b, 0, 56, 36, C.ink, { anchor: 'middle' }), 290); }
        else fit(text(tg, a, 0, 38, 40, C.ink, { anchor: 'middle' }), 290);
        return { tg, x: SLOT_X[i], rot: (i % 2 ? 2.5 : -2.5) };
      });
      // « PLUS RIEN »
      st.empty = g(cs);
      rect(st.empty, -390 + 12, -100 + 12, 780, 200, 18, C.ink);
      rect(st.empty, -390, -100, 780, 200, 18, C.red, C.ink, 8);
      circle(st.empty, -340, 0, 14, C.paper, C.ink, 5);
      fit(text(st.empty, 'PLUS RIEN', 20, 38, 116, C.ink, { anchor: 'middle' }), 640);

      /* ================= scène forge ================= */
      st.fs = g(root);
      const fs = st.fs;
      rect(fs, 0, 0, 1920, 1080, 0, C.red);
      rect(fs, 0, 760, 1920, 330, 0, C.ink);
      line(fs, 0, 764, 1920, 764, C.paper, 6);
      const fl = g(fs, { transform: 'translate(390 110) rotate(-2)' });
      sticker(fl, 640, 92, C.white, '', 1, C.ink, { sh: 10 });
      fit(text(fl, str(p.forge_label, 'AU-DESSUS D’UNE FORGE'), 0, 15, 44, C.ink, { anchor: 'middle' }), 580);
      // enclume
      st.anvil = g(fs);
      const an = 'M430 556 L560 536 L1010 536 L1032 582 L960 592 Q902 602 902 656 L962 720 L1042 720 L1042 762 L520 762 L520 720 L600 720 L660 656 Q660 602 602 592 L560 584 Q482 578 430 556Z';
      path(st.anvil, an, C.ink, C.paper, 7);
      rect(st.anvil, 568, 536, 440, 14, 0, C.paper);
      // bras (silhouette plate) + marteau
      path(fs, 'M1250 308 L1960 138 L1960 256 L1250 396Z', C.ink, C.paper, 6);
      st.sparks = [];
      for (let i = 0; i < 9; i++) {
        const s = g(fs);
        path(s, 'M0 -12 L9 8 L-9 8Z', i % 2 ? C.lime : C.paper, C.ink, 3);
        st.sparks.push({ s, ang: (-160 + i * 17.5 + (st.rng() - 0.5) * 8) * Math.PI / 180, sp: 330 + st.rng() * 280 });
      }
      st.ham = g(fs);
      rect(st.ham, -HL, -15, HL + 120, 30, 8, C.paper, C.ink, 6);
      rect(st.ham, -HL - 42, -68, 84, 136, 10, C.ink, C.paper, 6);
      rect(st.ham, -HL + 8, -68, 10, 136, 0, C.lime);
      circle(st.ham, 0, 0, 44, C.ink, C.paper, 6);
      // réveil
      st.clock = g(fs);
      st.clockG = drawClock(st.clock);
      st.strike = g(st.clock);
      line(st.strike, -120, -120, 120, 120, C.ink, 30);
      line(st.strike, 120, -120, -120, 120, C.ink, 30);
      st.k1 = line(st.strike, -120, -120, 120, 120, C.red, 16);
      st.k2 = line(st.strike, 120, -120, -120, 120, C.red, 16);
      st.h5 = g(fs);
      sticker(st.h5, 200, 110, C.lime, '5 H', 76, C.ink, { sh: 10, mono: true });
      return st;
    },

    update(st, t) {
      const { tF, tA, tE, eAfter } = st;
      /* ---- glissement entre scènes ---- */
      const pf = tF == null ? 0 : E.io3(prog(t, tF, tF + 0.5));
      const pe = eAfter ? E.io3(prog(t, tE, tE + 0.5)) : 0;
      const cx = -1920 * pf + 1920 * pe, fx = 1920 * (1 - pf) + 1920 * pe;
      setA(st.cs, 'transform', `translate(${f2(cx)} 0)`);
      setA(st.cs, 'visibility', Math.abs(cx) >= 1920 ? 'hidden' : 'visible');
      setA(st.fs, 'transform', `translate(${f2(fx)} 0)`);
      setA(st.fs, 'visibility', Math.abs(fx) >= 1920 || tF == null ? 'hidden' : 'visible');

      /* ---- comptoir : objets ---- */
      let itemK = 1;
      if (tE != null) itemK = eAfter ? (t >= tE ? 0 : 1) : 1 - E.in2(prog(t, tE, tE + 0.3));
      let n = 0;
      st.items.forEach((it, i) => {
        const tc = st.tc[it.k];
        const q = tc == null ? 0 : prog(t, tc, tc + 0.55);
        const on = q > 0 && itemK > 0;
        const off = (1 - E.bounce(q)) * -460;
        put(it.og, it.x, TOP + off, 0, itemK, itemK, on ? 1 : 0);
        // étiquette
        const tg = st.tags[i];
        const tq = tc == null ? 0 : prog(t, tc + 0.5, tc + 0.72);
        if (tq >= 1 && itemK > 0) n++;
        const sc = tq > 0 ? 1 + 1.3 * (1 - E.out3(tq)) : 0;
        put(tg.tg, it.x, TAGY, tg.rot * (1 + (1 - E.out3(tq))), sc * itemK, sc * itemK, tq > 0 && itemK > 0 ? 1 : 0);
      });
      const nAll = KEYS.reduce((a, k) => a + (st.tc[k] != null && t >= st.tc[k] + 0.72 ? 1 : 0), 0);
      const shown = nAll;
      const txt = `OBJETS EN GAGE : ${shown}`;
      if (st.plaqueT.textContent !== txt) st.plaqueT.textContent = txt;
      let lastTag = null;
      for (const k of KEYS) { const tc = st.tc[k]; if (tc != null && t >= tc + 0.5 && (lastTag == null || tc > lastTag)) lastTag = tc; }
      const bump = lastTag == null ? 1 : 1 + 0.14 * Math.sin(Math.PI * clamp((t - lastTag - 0.5) / 0.35));
      put(st.plaque, 1450, 112, 1.5, bump, bump, 1);

      // comptoir vide
      const eq = tE == null ? 0 : prog(t, tE + (eAfter ? 0.5 : 0.15), tE + (eAfter ? 0.5 : 0.15) + 0.4);
      const es = eq > 0 ? E.back(eq) : 0;
      put(st.empty, 960, 410, -3, es, es, eq > 0 ? 1 : 0);

      /* ---- forge ---- */
      if (tF != null) {
        const t0 = tF + 0.5;
        const nS = t < t0 ? -1 : Math.floor((t - t0) / TH + 1e-9);
        const lastS = nS < 0 ? null : t0 + nS * TH;
        // angle du marteau
        const nextS = t <= t0 ? t0 : t0 + Math.ceil((t - t0) / TH - 1e-9) * TH;
        const d = nextS - t;
        let a;
        if (d <= 0.1) a = lerp(A_UP, A_DN, E.in3(1 - d / 0.1));
        else { const e = lastS == null ? 9 : t - lastS; a = lerp(A_DN, A_UP, E.out2(prog(e, 0, 0.28))); }
        st.ham.setAttribute('transform', `translate(${PIV.x} ${PIV.y}) rotate(${f2(-a)})`);
        const age = lastS == null ? 9 : t - lastS;
        setA(st.anvil, 'transform', `translate(0 ${f2(age < 0.12 ? 5 * (1 - age / 0.12) : 0)})`);
        // éclats plats
        const flip = nS % 2 ? -1 : 1;
        st.sparks.forEach((s, i) => {
          if (age >= 0.42 || lastS == null) { setA(s.s, 'visibility', 'hidden'); return; }
          const x = 800 + Math.cos(s.ang) * s.sp * age * flip, y = 530 + Math.sin(s.ang) * s.sp * age + 1300 * age * age;
          const sc = 1 - E.in2(age / 0.42);
          setA(s.s, 'visibility', 'visible');
          setA(s.s, 'transform', `translate(${f2(x)} ${f2(y)}) rotate(${f2(age * 500 * flip + i * 40)}) scale(${f2(Math.max(0.01, sc))})`);
        });
        // réveil
        const ap = tA == null ? 0 : prog(t, tA, tA + 0.3);
        const ring = tA != null && t >= tA && t < tA + 1.6 ? 1 : 0;
        const rs = ring ? Math.sin((t - tA) * 2 * Math.PI * 5) : 0;
        const ck = ap > 0 ? E.back(ap) : 0;
        put(st.clock, 1560, 590, ring ? rs * 5 : 0, ck, ck, ap > 0 ? 1 : 0);
        const kp = tA == null ? 0 : prog(t, tA + 1.6, tA + 2.0);
        setA(st.strike, 'visibility', kp > 0 ? 'visible' : 'hidden');
        const k1 = Math.min(1, kp * 2), k2 = clamp(kp * 2 - 1);
        setA(st.k1, 'x2', f2(lerp(-120, 120, k1))); setA(st.k1, 'y2', f2(lerp(-120, 120, k1)));
        setA(st.k2, 'visibility', k2 > 0 ? 'visible' : 'hidden');
        setA(st.k2, 'x2', f2(lerp(120, -120, k2))); setA(st.k2, 'y2', f2(lerp(-120, 120, k2)));
        const hp = tA == null ? 0 : E.back(clamp((t - tA - 0.3) / 0.3));
        put(st.h5, 1790, 600, 5, hp, hp, hp > 0 ? 1 : 0);
      } else {
        put(st.clock, 0, 0, 0, 0, 0, 0); put(st.h5, 0, 0, 0, 0, 0, 0);
      }
    }
  });
})();
