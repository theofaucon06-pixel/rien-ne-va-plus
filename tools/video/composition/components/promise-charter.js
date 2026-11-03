// Composant `promise-charter` : « La promesse » (S3 de l'épisode 0). Une charte d'une page qui se coche clause par clause, chaque clause avec sa vignette :
// 1 le réel (fiche + étiquette COMPOSITE agrafée), 2 le chiffre sourcé (renvoi pointillé vers la note de bas de page + loupe), 3 pas de sermon (bulle barrée), 4 pas de système (boîte vide tamponnée).
// Cues : sheet, c1, c2, c3, c4, tag, footnote, verify, open, none, sealed. Fond ink. Aucun dégradé, flou, lueur ni filter. Aucune personne dessinée.
// Règle des cues absents : un élément sans cue est affiché dans son état final dès t = 0 (sauf `sealed`, facultatif : visible seulement si le plan n'a AUCUN cue).
(() => {
  'use strict';
  const { C, E, prog, lerp, f2, sv, g, rect, circle, path, line, text, put } = ZV;
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const str = (v, d) => (typeof v === 'string' && v.trim() ? v.trim() : d);
  const I = 1 / 30;
  const len = (n, fb) => { try { const w = n.getComputedTextLength(); return w > 0 ? w : fb; } catch (e) { return fb; } };
  // réduit la police jusqu'à `min`, puis impose la largeur : jamais de débordement
  function fit(n, size, maxW, min) {
    try {
      let w = n.getComputedTextLength();
      if (w > maxW && w > 0) {
        const s = Math.max(min, Math.floor((size * maxW) / w));
        n.setAttribute('font-size', s);
        w = n.getComputedTextLength();
        if (w > maxW) { n.setAttribute('textLength', f2(maxW)); n.setAttribute('lengthAdjust', 'spacingAndGlyphs'); }
      }
    } catch (e) { /* hors DOM */ }
  }
  let UID = 0;

  const ROW_Y = [240, 380, 520, 660];
  const DEF_CLAUSES = [
    { text: 'DU RÉEL', sub: 'COMPOSITE OU FICTIF : JE TE LE DIS' },
    { text: 'CHAQUE CHIFFRE SOURCÉ', sub: 'EN BAS DE LA PAGE, POUR QUE TU VÉRIFIES' },
    { text: 'PAS DE SERMON', sub: 'TA SOIRÉE T’APPARTIENT' },
    { text: 'PAS DE SYSTÈME POUR GAGNER', sub: 'C’EST JUSTEMENT LE SUJET' }
  ];
  const CUE_NAMES = ['sheet', 'c1', 'c2', 'c3', 'c4', 'tag', 'footnote', 'verify', 'open', 'none', 'sealed'];

  // tampon à double bordure ink : renvoie { grp, w, h } centré sur (0,0)
  function stampBox(parent, fill, lines, size, pitch, padX, padY, minW, maxW) {
    const grp = g(parent);
    const tmp = g(grp);
    const nodes = lines.map((s) => text(tmp, s, 0, 0, size, C.ink, { anchor: 'middle' }));
    let tw = 0;
    nodes.forEach((n) => { tw = Math.max(tw, len(n, n.textContent.length * size * 0.62)); });
    let fs = size;
    if (tw + 2 * padX > maxW) { fs = Math.max(26, Math.floor((size * (maxW - 2 * padX)) / tw)); tw = tw * fs / size; nodes.forEach((n) => n.setAttribute('font-size', fs)); }
    const w = Math.min(maxW, Math.max(minW, tw + 2 * padX));
    const h = lines.length * pitch * (fs / size) + 2 * padY;
    grp.removeChild(tmp);
    rect(grp, -w / 2 + 8, -h / 2 + 8, w, h, 4, C.ink);
    rect(grp, -w / 2, -h / 2, w, h, 4, fill, C.ink, 6);
    rect(grp, -w / 2 + 11, -h / 2 + 11, w - 22, h - 22, 2, 'none', C.ink, 3);
    const p = pitch * (fs / size);
    nodes.forEach((n, i) => {
      grp.appendChild(n);
      n.setAttribute('x', 0);
      n.setAttribute('y', f2(-((lines.length - 1) * p) / 2 + i * p + fs * 0.35));
      if (len(n, 0) > w - 2 * padX) { n.setAttribute('textLength', f2(w - 2 * padX)); n.setAttribute('lengthAdjust', 'spacingAndGlyphs'); }
    });
    return { grp, w, h };
  }

  ZV.define('promise-charter', {
    init(root, shot) {
      const p = (shot && shot.props) || {};
      const beats = Array.isArray(shot && shot.beats) ? shot.beats : [];
      const cueT = (n) => { const b = beats.filter((x) => x && x.do === 'cue' && x.name === n && isNum(x.t)).sort((a, c) => a.t - c.t)[0]; return b ? b.t : null; };
      const uid = 'pc' + (++UID);
      const kicker = str(p.kicker, 'ZÉRO VERT · SAISON 1');
      const title = str(p.title, 'LA PROMESSE');
      const clauses = DEF_CLAUSES.map((d, i) => {
        const c = Array.isArray(p.clauses) ? p.clauses[i] : null;
        return { text: str(c && c.text, d.text), sub: str(c && c.sub, d.sub) };
      });
      const tagTxt = str(p.tag, 'COMPOSITE');
      const figTxt = str(p.figure, 'CHIFFRE');
      const footTxt = str(p.footnote, '¹ SOURCE · AUTEUR · ANNÉE');
      const boxTxt = str(p.box, 'SYSTÈME POUR GAGNER');
      const noneTxt = str(p.none, 'IL N’EN EXISTE PAS');
      const totalTxt = str(p.stamp_total, 'PROMIS');

      const st = {};
      st.tS = cueT('sheet');
      st.tC = [cueT('c1'), cueT('c2'), cueT('c3'), cueT('c4')];
      st.tTag = cueT('tag'); st.tFoot = cueT('footnote'); st.tVer = cueT('verify'); st.tOpen = cueT('open'); st.tNone = cueT('none'); st.tSeal = cueT('sealed');
      st.anyCue = CUE_NAMES.some((n) => cueT(n) != null);
      st.title = title;

      rect(root, 0, 0, 1920, 1080, 0, C.ink);

      /* ---------- clips ---------- */
      const defs = sv('defs', null, root);
      const clip = (id, x, y, w, h) => { const cp = sv('clipPath', { id }, defs); sv('rect', { x, y, width: w, height: h }, cp); return `url(#${id})`; };
      const clipRows = clip(uid + 'r', 296, 226, 1332, 580);
      const clipNone = clip(uid + 'n', 1230, 618, 360, 182);
      const clipSeal = clip(uid + 's', 1240, 62, 330, 150);

      /* ---------- feuille ---------- */
      st.sheet = g(root);
      const sh = st.sheet;
      const SHEET = 'M300 50H1560L1620 110V800H300Z';
      path(sh, SHEET, C.lime, null, 0, { transform: 'translate(16 16)' });
      path(sh, SHEET, C.paper, C.ink, 8);
      path(sh, 'M1560 50V110H1620Z', C.ink, C.ink, 8);

      /* en-tête */
      const kn = text(sh, kicker, 360, 114, 24, C.ink, { mono: true, weight: 700 });
      fit(kn, 24, 860, 18);
      st.tn = text(sh, title, 360, 196, 92, C.ink);
      fit(st.tn, 92, 860, 56);
      st.tn.textContent = '';
      line(sh, 360, 215, 1560, 215, C.ink, 6, { 'stroke-linecap': 'butt' });
      st.titleN = -1;
      // longueur utile du titre (lettres tapées une à une, alignées à gauche)
      st.titleLen = title.length;

      /* ---------- rangées ---------- */
      st.clipG = g(sh, { 'clip-path': clipRows });
      st.rows = [];
      for (let i = 0; i < 4; i++) {
        const y0 = ROW_Y[i], cy = y0 + 60;
        const R = { y0, cy };
        R.g = g(st.clipG);
        if (i < 3) line(R.g, 350, y0 + 125, 1570, y0 + 125, C.ink, 3, { 'stroke-linecap': 'butt' });
        // case à cocher
        rect(R.g, 355, cy - 27, 64, 64, 0, C.ink);
        R.box = rect(R.g, 350, cy - 32, 64, 64, 0, C.paper, C.ink, 6);
        R.chk = path(R.g, `M362 ${cy + 1}L377 ${cy + 15}L403 ${cy - 16}`, 'none', C.ink, 12, { pathLength: 1, 'stroke-dasharray': '0 2', visibility: 'hidden' });
        // texte
        const tx = text(R.g, clauses[i].text, 450, y0 + 62, 50, C.ink);
        fit(tx, 50, 760, 38);
        const sb = text(R.g, clauses[i].sub, 450, y0 + 98, 22, C.ink, { mono: true, weight: 600 });
        fit(sb, 22, 760, 18);
        R.v = g(R.g);
        st.rows.push(R);
      }

      /* ---- 1 : réel ---- */
      {
        const R = st.rows[0], v = R.v, cy = R.cy;
        rect(v, 1296, cy - 42, 150, 96, 4, C.ink);
        rect(v, 1290, cy - 48, 150, 96, 4, C.paper, C.ink, 5);
        circle(v, 1322, cy - 14, 19, C.pocket);
        rect(v, 1352, cy - 26, 72, 10, 0, C.ink);
        rect(v, 1352, cy - 8, 56, 10, 0, C.ink);
        rect(v, 1306, cy + 18, 118, 10, 0, C.ink);
        // étiquette Dymo + agrafe
        st.tag = g(v);
        const lt = text(st.tag, tagTxt, 0, 8, 22, C.paper, { anchor: 'middle', mono: true, weight: 800 });
        fit(lt, 22, 200, 18);
        const lw = Math.min(236, Math.max(110, len(lt, tagTxt.length * 13.2) + 36));
        const lh = 40;
        const bg = g(st.tag);
        st.tag.insertBefore(bg, lt);
        rect(bg, -lw / 2 + 5, -lh / 2 + 5, lw, lh, 5, C.ink);
        rect(bg, -lw / 2, -lh / 2, lw, lh, 5, C.red, C.ink, 4);
        st.staple = rect(st.tag, -lw / 2 + 4, -11, 7, 22, 1, C.ink);
        st.tagX = 1440; st.tagY = cy + 22 + 0; st.tagLeft = Math.max(1290 + lw / 2 - 0, 0);
        // la fiche occupe 1290-1440 ; l'étiquette dépasse un peu vers la droite, bornée par la zone (≤ 1580)
        st.tagX = Math.min(1580 - lw / 2 - 8, 1300 + lw / 2 + 18);
      }

      /* ---- 2 : sourcé ---- */
      {
        const R = st.rows[1], v = R.v, y0 = R.y0;
        const fg = text(v, figTxt, 1250, y0 + 48, 48, C.ink);
        fit(fg, 48, 215, 30);
        const fw = len(fg, figTxt.length * 30);
        const px = Math.round(1250 + fw + 26), py = y0 + 24;
        circle(v, px, py, 18, C.ink);
        text(v, '¹', px, py + 9, 26, C.lime, { anchor: 'middle', mono: true, weight: 800 });
        st.dot = line(v, px, py + 20, px, 466, C.ink, 5, { 'stroke-linecap': 'butt', 'stroke-dasharray': '9 8', visibility: 'hidden' });
        st.dotY0 = py + 20; st.dotY1 = 466; st.dotX = px;
        // bande de bas de page
        st.band = g(v, { transform: 'translate(1246 466)' });
        rect(st.band, 0, 0, 300, 34, 0, C.pocket);
        const bt = text(st.band, footTxt, 8, 24, 18, C.paper, { mono: true, weight: 600 });
        fit(bt, 18, 276, 14);
        // loupe plate (verre creux : le texte dessous reste lisible)
        st.lens = g(v);
        line(st.lens, 24, -24, 38, -40, C.ink, 12, { 'stroke-linecap': 'round' });
        circle(st.lens, 0, 0, 34, 'none', C.ink, 8);
        st.lensX = 1568; st.lensY = y0 + 92;
        // coche lime sur pastille ink
        st.vok = g(v);
        circle(st.vok, 0, 0, 22, C.ink);
        path(st.vok, 'M-11 1L-3 10L12 -9', 'none', C.lime, 10);
        st.vokX = 1536; st.vokY = y0 + 28;
      }

      /* ---- 3 : sans sermon ---- */
      {
        const R = st.rows[2], v = R.v, y0 = R.y0;
        rect(v, 1306, y0 + 12, 220, 80, 18, C.ink);
        path(v, `M1342 ${y0 + 88}L1372 ${y0 + 88}L1336 ${y0 + 112}Z`, C.ink, C.ink, 6);
        path(v, `M1338 ${y0 + 84}L1366 ${y0 + 84}L1332 ${y0 + 106}Z`, C.paper, C.ink, 6);
        rect(v, 1300, y0 + 6, 220, 80, 18, C.paper, C.ink, 6);
        rect(v, 1342, y0 + 76, 22, 14, 0, C.paper);
        // index levé (silhouette plate)
        const fx = 1410, fy = y0 + 48;
        rect(v, fx - 7, fy - 30, 14, 36, 7, C.ink);
        rect(v, fx - 23, fy - 6, 46, 32, 9, C.ink);
        rect(v, fx - 32, fy + 1, 16, 14, 6, C.ink);
        st.x1 = line(v, 1314, y0 + 18, 1506, y0 + 74, C.red, 14, { visibility: 'hidden' });
        st.x2 = line(v, 1506, y0 + 18, 1314, y0 + 74, C.red, 14, { visibility: 'hidden' });
        st.xy0 = y0;
      }

      /* ---- 4 : pas de système ---- */
      {
        const R = st.rows[3], v = R.v, y0 = R.y0;
        const H = y0 + 36;                   // charnière (arrière de l'ouverture)
        // corps de la boîte
        rect(v, 1250, H, 320, 84, 0, C.ink);
        rect(v, 1258, H + 6, 304, 40, 0, C.pocket);
        rect(v, 1266, H + 12, 288, 28, 0, 'none', C.paper, 4, { 'stroke-dasharray': '10 8', 'stroke-linejoin': 'miter' });
        const bl = text(v, boxTxt, 1410, y0 + 109, 22, C.lime, { anchor: 'middle', mono: true, weight: 800 });
        fit(bl, 22, 292, 18);
        // couvercle : bascule autour de la charnière (hauteur apparente = L·cos θ)
        st.lid = g(v);
        st.lidR = rect(st.lid, 0, 0, 320, 50, 0, C.paper, C.ink, 6, { 'vector-effect': 'non-scaling-stroke' });
        st.lidH = H;
        // tampon
        st.nclip = g(v, { 'clip-path': clipNone });
        const sb = stampBox(st.nclip, C.red, splitStamp(noneTxt), 36, 36, 20, 8, 150, 300);
        st.nstamp = sb.grp;
        st.nx = 1450; st.ny = y0 + 26;
      }

      /* ---------- tampon « sealed » ---------- */
      st.sclip = g(sh, { 'clip-path': clipSeal });
      {
        const sb = stampBox(st.sclip, C.lime, [totalTxt], 64, 64, 22, 14, 150, 280);
        st.sstamp = sb.grp;
      }
      // bordure de la feuille par-dessus les rangées qui glissent
      path(sh, SHEET, 'none', C.ink, 8);
      path(sh, 'M1560 50V110H1620Z', C.ink, C.ink, 8);
      return st;
    },

    update(st, t, shot) {
      try { draw(st, t); } catch (e) { /* jamais d'exception */ }
    }
  });

  // « IL N’EN EXISTE PAS » : 2 lignes équilibrées sur les espaces
  function splitStamp(s) {
    const w = s.split(/\s+/);
    if (w.length < 2) return [s];
    let best = 1, bd = 1e9;
    for (let j = 1; j < w.length; j++) { const d = Math.abs(w.slice(0, j).join(' ').length - w.slice(j).join(' ').length); if (d < bd) { bd = d; best = j; } }
    return [w.slice(0, best).join(' '), w.slice(best).join(' ')];
  }

  const ph = (t, t0, d) => (t0 == null ? 1 : prog(t, t0, t0 + d));
  const on = (t, t0) => t0 == null || t >= t0;

  function draw(st, t) {
    /* feuille */
    const ps = ph(t, st.tS, 14 * I);
    const es = E.out3(ps);
    setA(st.sheet, 'visibility', on(t, st.tS) ? 'visible' : 'hidden');
    setA(st.sheet, 'transform', `translate(0 ${f2((1 - es) * 900)}) rotate(${f2(lerp(-4, -1, es))} 960 425)`);
    // titre lettre à lettre (2 i par lettre) après l'arrivée de la feuille
    let n = st.titleLen;
    if (st.tS != null) { const dt = t - (st.tS + 14 * I); n = dt < 0 ? 0 : Math.min(st.titleLen, Math.floor(dt / (2 * I)) + 1); }
    if (n !== st.titleN) { st.titleN = n; st.tn.textContent = st.title.slice(0, n); }

    /* rangées */
    for (let i = 0; i < 4; i++) {
      const R = st.rows[i], t0 = st.tC[i];
      const p1 = ph(t, t0, 10 * I);
      setA(R.g, 'visibility', on(t, t0) ? 'visible' : 'hidden');
      setA(R.g, 'transform', `translate(${f2(-(1 - E.out3(p1)) * 340)} 0)`);
      const pc = ph(t, t0 == null ? null : t0 + 10 * I, 6 * I);
      setA(R.box, 'fill', pc > 0 ? C.lime : C.paper);
      setA(R.chk, 'visibility', pc > 0 ? 'visible' : 'hidden');
      setA(R.chk, 'stroke-dasharray', `${f2(pc)} 2`);
    }

    /* 1 : étiquette collée */
    {
      const p = ph(t, st.tTag, 6 * I), e = E.out3(p);
      put(st.tag, st.tagX + (1 - e) * 44, st.rows[0].cy + 24 - (1 - e) * 70, -8 - (1 - e) * 14, 1 + (1 - e) * 0.5, 1 + (1 - e) * 0.5, on(t, st.tTag) ? 1 : 0);
      setA(st.staple, 'visibility', p >= 1 ? 'visible' : 'hidden');
    }

    /* 2 : renvoi de source, loupe */
    {
      const pd = ph(t, st.tFoot, 12 * I);
      setA(st.dot, 'visibility', pd > 0 ? 'visible' : 'hidden');
      setA(st.dot, 'y2', f2(lerp(st.dotY0, st.dotY1, pd)));
      const pb = ph(t, st.tFoot == null ? null : st.tFoot + 8 * I, 4 * I);
      setA(st.band, 'visibility', pb > 0 ? 'visible' : 'hidden');
      setA(st.band, 'transform', `translate(1246 466) scale(${f2(Math.max(pb, 0.0001))} 1)`);
      const pv = ph(t, st.tVer, 10 * I);
      setA(st.lens, 'visibility', on(t, st.tVer) ? 'visible' : 'hidden');
      setA(st.lens, 'transform', `translate(${f2(st.lensX + (1 - E.out3(pv)) * 340)} ${st.lensY})`);
      const pk = ph(t, st.tVer == null ? null : st.tVer + 10 * I, 5 * I);
      put(st.vok, st.vokX, st.vokY, 0, E.back(pk), E.back(pk), pk > 0 ? 1 : 0);
    }

    /* 3 : croix rouge (2 traits de 3 i, 8 i après la coche) */
    {
      const t3 = st.tC[2];
      const base = t3 == null ? null : t3 + 18 * I;
      const a = ph(t, base, 3 * I), b = ph(t, base == null ? null : base + 3 * I, 3 * I);
      const y0 = st.xy0;
      setA(st.x1, 'visibility', a > 0 ? 'visible' : 'hidden');
      setA(st.x1, 'x2', f2(lerp(1314, 1506, a))); setA(st.x1, 'y2', f2(lerp(y0 + 18, y0 + 74, a)));
      setA(st.x2, 'visibility', b > 0 ? 'visible' : 'hidden');
      setA(st.x2, 'x2', f2(lerp(1506, 1314, b))); setA(st.x2, 'y2', f2(lerp(y0 + 18, y0 + 74, b)));
    }

    /* 4 : couvercle (0 → −110°) puis tampon */
    {
      const po = ph(t, st.tOpen, 10 * I);
      const th = E.io2(po) * 110 * ZV.D2R;
      const c = Math.cos(th);
      setA(st.lid, 'transform', `translate(1250 ${st.lidH}) scale(1 ${f2(Math.abs(c) < 0.0001 ? 0.0001 : c)})`);
      setA(st.lidR, 'fill', c >= 0 ? C.paper : C.white);
      const on_ = on(t, st.tNone);
      const pn = ph(t, st.tNone, 5 * I), s = lerp(2.4, 1, E.in2(pn));
      const sk = st.tNone == null ? [0, 0] : ZV.shakeAt(t, st.tNone + 5 * I, 10, 0.35);
      put(st.nstamp, st.nx + sk[0], st.ny + sk[1], -8, s, s, on_ ? 1 : 0);
    }

    /* tampon « sealed » : seulement s'il est cué, ou si le plan n'a aucun cue (état final) */
    {
      const shown = st.tSeal != null ? t >= st.tSeal : !st.anyCue;
      const pn = st.tSeal == null ? 1 : prog(t, st.tSeal, st.tSeal + 5 * I), s = lerp(2.4, 1, E.in2(pn));
      const sk = st.tSeal == null ? [0, 0] : ZV.shakeAt(t, st.tSeal + 5 * I, 6, 0.3);
      put(st.sstamp, 1405 + sk[0], 140 + sk[1], 6, s, s, shown ? 1 : 0);
    }
  }
})();
