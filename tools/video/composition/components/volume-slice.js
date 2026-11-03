// Composant `volume-slice` (épisode 7) : « le pourcentage est minuscule, le volume fait le reste ». Voir EP7-COMPONENTS.md.
// Un mur de blocs (la mise), une tranche red en haut de chaque bloc (la part de la maison), un compteur MISÉ / PERDU, une loupe,
// la colonne des tranches réunies, puis la part d'un seul homme dans les recettes (barre graduée, 1/20). Fonction pure du temps ;
// aplats, aucun dégradé / flou / filter. Cues : wagered, blocks, hand, unit (param text), sum, share, twentieth.
(() => {
  'use strict';
  const { C, E, clamp, prog, f2, sv, g, rect, circle, path, line, text, put, fr } = ZV;
  let UID = 0;
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const num = (v, d) => (v != null && v !== '' && isFinite(+v) ? +v : d);
  const str = (v, d) => (typeof v === 'string' && v.length ? v : v != null && typeof v !== 'object' && String(v).length ? String(v) : d);
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const vis = (n, on) => n.setAttribute('visibility', on ? 'visible' : 'hidden');   // non mis en cache : ZV.put pose aussi cet attribut
  const disp = (n, on) => setA(n, 'display', on ? 'inline' : 'none');      // pour les groupes dont les enfants posent leur propre visibility
  const WT = {};
  '0:.67 1:.36 2:.61 3:.61 4:.64 5:.62 6:.66 7:.52 8:.66 9:.66 A:.71 B:.69 C:.69 D:.71 E:.63 F:.6 G:.73 H:.73 I:.3 J:.38 K:.7 L:.51 M:.96 N:.79 O:.73 P:.65 Q:.73 R:.69 S:.66 T:.58 U:.73 V:.68 W:1 X:.72 Y:.66 Z:.58 À:.71 Â:.71 É:.63 È:.63 Ê:.63 Î:.3 Ô:.73 Û:.73 Ç:.69 €:.75 %:.99 +:.53 ×:.53 −:.53 -:.36 .:.25 ,:.21 ::.26 ;:.24 \':.19 ’:.22 !:.3 ?:.43 |:.28 (:.33 ):.33 $:.65 ¢:.57 ≈:.55 →:1 ·:.25 /:.37 «:.48 »:.48 –:.55'.split(' ').forEach((p) => { WT[p[0]] = parseFloat(p.slice(2)); });
  const bw = (s, size) => { let a = 0; for (const ch of String(s)) a += WT[ch] !== undefined ? WT[ch] : /\s/.test(ch) ? 0.22 : 0.6; return a * size; };
  const mw = (s, size) => String(s).length * size * 0.6;
  const fitSize = (s, size, maxW, minS, mono) => Math.max(minS, Math.min(size, Math.floor(maxW / Math.max(0.01, mono ? mw(s, 1) : bw(s, 1)))));
  const setTxt = (n, s, size) => { if (n.__s !== s) { n.__s = s; n.textContent = s; n.setAttribute('textLength', f2(Math.max(1, bw(s, size)))); } };
  function typed(parent, defs, id, s, x, y, size, fill, o) {
    o = o || {};
    const w = o.mono ? mw(s, size) : bw(s, size), W = Math.min(w, o.maxW || 1e9);
    const x0 = o.anchor === 'middle' ? x - W / 2 : x;
    const cp = sv('clipPath', { id }, defs), cr = rect(cp, x0 - 6, y - size * 1.1, 0, size * 1.5, 0, '#000');
    const t = text(parent, s, x0, y, size, fill, { mono: o.mono, len: f2(W) });
    t.setAttribute('clip-path', `url(#${id})`);
    const chars = Array.from(s), cum = [0]; let acc = 0;
    for (const ch of chars) { acc += o.mono ? 0.6 : (WT[ch] !== undefined ? WT[ch] : 0.4); cum.push(acc); }
    return { t, W, n: chars.length, set(k) { k = Math.max(0, Math.min(chars.length, Math.floor(k))); setA(cr, 'width', f2(k <= 0 ? 0 : k >= chars.length ? W + 12 : (cum[k] / acc) * W + 6)); vis(t, k > 0); } };
  }
  // « 1,43 MD$ » → { pre, suf, val, dec } ; null si illisible
  function parseAmt(s) {
    const m = /^([^0-9]*)([0-9]+(?:[\s\u00a0\u202f][0-9]{3})*(?:[.,][0-9]+)?)(.*)$/.exec(String(s)); if (!m) return null;
    const raw = m[2].replace(/[\s  ]/g, ''), dm = /[.,]([0-9]+)$/.exec(raw);
    const v = parseFloat(raw.replace(',', '.')); if (!isFinite(v)) return null;
    return { pre: m[1], suf: m[3], val: v, dec: dm ? dm[1].length : 0 };
  }
  const fmtAmt = (a, v) => { const fx = Math.max(0, v).toFixed(a.dec), i = fx.indexOf('.'); return a.pre + fr(+(i < 0 ? fx : fx.slice(0, i))) + (i < 0 ? '' : ',' + fx.slice(i + 1)) + a.suf; };
  const quant = (t) => Math.floor(t * 6 + 1e-6) / 6;                       // les compteurs changent au plus 6 fois par seconde

  const X0 = 80, WWID = 1600, WY0 = 280, WH = 420, WY1 = 700;
  const COLX = 1710, COLW = 120;
  const BX = 160, BY = 380, BWID = 1600, BH = 160;                           // barre de la part

  ZV.define('volume-slice', {
    init(root, shot) {
      const P = shot.props || {};
      const beats = Array.isArray(shot.beats) ? shot.beats : [];
      const dur = isNum(shot.dur) && shot.dur > 0 ? shot.dur : 14;
      const first = (n) => { let r = null; for (const b of beats) if (b && b.do === 'cue' && b.name === n && isNum(b.t) && (r === null || b.t < r)) r = b.t; return r; };
      const NAMES = ['wagered', 'blocks', 'hand', 'unit', 'sum', 'share', 'twentieth'];
      const T = {}; NAMES.forEach((n) => { T[n] = first(n); });
      const kicker = str(P.kicker, 'TERRANCE WATANABE · LAS VEGAS · 2007');
      const wagered = str(P.wagered, '825 M$'), lost = str(P.lost, '127 M$');
      const rate = clamp(num(P.rate, 0.154), 0.001, 0.6);
      const rateText = str(P.rate_text, '≈ 15 ¢ PAR DOLLAR'), unit = str(P.unit, '1 $');
      const n = clamp(Math.round(num(P.blocks, 12)), 1, 24);
      const blockLabel = typeof P.block_label === 'string' && P.block_label ? P.block_label : null;
      const sumLabel = str(P.sum_label, 'LE VOLUME FAIT LE RESTE');
      const maxHand = typeof P.max_hand === 'string' && P.max_hand ? P.max_hand : null;
      const share = clamp(num(P.share, 5.6), 0.1, 100), shareText = str(P.share_text, '5,6 %');
      const shareLabel = str(P.share_label, 'RECETTES DE JEU DE SES HÔTES À LAS VEGAS'), shareNote = str(P.share_note, 'DANS LE RÉCIT DU JEU'), who = str(P.who, 'UN SEUL HOMME');
      if (NAMES.every((k) => T[k] == null)) {
        const k = Math.min(1, dur / 14);
        const d = { wagered: 0.5, blocks: blockLabel ? 2.5 : null, hand: maxHand ? 3.3 : null, unit: 4.4, sum: 7.0, share: 10.0, twentieth: 12.6 };
        NAMES.forEach((q) => { T[q] = d[q] == null ? null : d[q] * k; });
      }
      let unitText = null;
      for (const b of beats) if (b && b.do === 'cue' && b.name === 'unit' && typeof b.text === 'string' && b.text) { unitText = b.text; break; }
      const uid = 'vs' + (++UID);
      const st = { T, n, rate, dur, wagered: parseAmt(wagered), lost: parseAmt(lost), wagTxt: wagered, lostTxt: lost, share, uid };
      const defs = sv('defs', null, root);

      /* ---- fond, kicker, compteurs ---- */
      rect(root, 0, 0, 1920, 1080, 0, C.ink);
      text(root, kicker, X0, 84, fitSize(kicker, 30, 1760, 18, true), C.paper, { mono: true, len: f2(Math.min(mw(kicker, 30), 1760)) });
      text(root, 'MISÉ', X0, 128, 26, '#B9B5A8', { mono: true, spacing: 4, len: f2(mw('MISÉ', 26) + 3 * 4) });
      text(root, 'PERDU', 780, 128, 26, '#B9B5A8', { mono: true, spacing: 4, len: f2(mw('PERDU', 26) + 4 * 4) });
      st.cW = text(root, '', X0, 220, 110, C.paper, { anchor: 'start' });
      st.cL = text(root, '', 780, 220, 110, C.red, { anchor: 'start' });

      /* ---- le mur (groupe qui s'efface vers le bas) ---- */
      st.wall = g(root);
      const W = st.wall;
      const bwid = WWID / n, hs = clamp(rate * WH, 4, 200);
      st.hs = hs;
      line(W, X0 - 20, WY1 + 3, X0 + WWID + 20, WY1 + 3, C.paper, 6);
      st.ghost = []; st.blocks = []; st.slots = []; st.slices = []; st.labels = [];
      for (let i = 0; i < n; i++) st.ghost.push(rect(W, X0 + i * bwid, WY0, bwid, WH, 0, 'none', '#303030', 3, { 'stroke-dasharray': '10 8' }));
      for (let i = 0; i < n; i++) {
        const x = X0 + i * bwid;
        st.blocks.push(rect(W, x, WY1, bwid, 0, 0, C.paper, C.ink, 6));
        st.slots.push(rect(W, x + 4, WY0 + 4, bwid - 8, Math.max(2, hs - 4), 0, 'none', '#5A5A5A', 3, { 'stroke-dasharray': '8 6' }));
      }
      for (let i = 0; i < n; i++) st.slices.push(rect(W, X0 + i * bwid, WY1, bwid, 0, 0, C.red, C.ink, hs < 14 ? 1.5 : 4));
      if (blockLabel) {
        const sz = fitSize(blockLabel, 24, bwid - 14, 12, true);
        for (let i = 0; i < n; i++) { const t = text(W, blockLabel, 0, 0, sz, C.paper, { mono: true, anchor: 'middle', len: f2(Math.min(mw(blockLabel, sz), bwid - 10)) }); st.labels.push(t); }
        st.labelSz = sz;
      }
      // sticker « plafond de la main »
      st.hand = null;
      if (maxHand) {
        st.hand = g(W);
        const sz = fitSize(maxHand, 26, 700, 16, true), w = Math.min(760, mw(maxHand, sz) + 44), h = 54;
        rect(st.hand, -w / 2 + 8, -h / 2 + 8, w, h, 10, C.ink);
        rect(st.hand, -w / 2, -h / 2, w, h, 10, C.lime, C.ink, 5);
        text(st.hand, maxHand, 0, sz * 0.35, sz, C.ink, { mono: true, anchor: 'middle', len: f2(Math.min(mw(maxHand, sz), w - 30)) });
        st.handW = w;
      }
      // colonne des tranches réunies
      st.hh = Math.min(hs, 440 / n);
      st.colLab = typed(W, defs, uid + 'l', sumLabel, 960, 812, fitSize(sumLabel, 60, 1500, 34), C.paper, { anchor: 'middle', maxW: 1500 });
      // loupe
      st.lens = g(W);
      {
        line(st.lens, 40, 40, 112, 112, C.ink, 24); line(st.lens, 40, 40, 112, 112, C.paper, 10);
        circle(st.lens, 0, 0, 58, 'none', C.ink, 22); circle(st.lens, 0, 0, 58, 'none', C.paper, 8);
      }
      st.lensX = X0 + Math.min(bwid, 140) / 2; st.lensY = WY0 + 14;
      // pastille agrandie
      st.pas = g(W);
      {
        const cp = sv('clipPath', { id: uid + 'c' }, defs); circle(cp, 0, 0, 212, '#000');
        circle(st.pas, 14, 14, 220, C.grey);
        circle(st.pas, 0, 0, 220, C.ink, C.paper, 8);
        const ig = g(st.pas, { 'clip-path': `url(#${uid}c)` });
        const hs2 = clamp(rate * 400, 14, 150);
        rect(ig, -260, -112, 520, 360, 0, C.paper, C.ink, 6);
        rect(ig, -262, -112, 524, hs2, 0, C.red, C.ink, hs2 < 24 ? 3 : 6);
        const us = fitSize(unit, 76, 330, 36);
        text(ig, unit, 0, 62, us, C.ink, { anchor: 'middle', len: f2(Math.min(bw(unit, us), 330)) });
        const rs = fitSize(rateText, 30, 290, 16, true);
        text(ig, rateText, 0, 134, rs, C.ink, { mono: true, anchor: 'middle', len: f2(Math.min(mw(rateText, rs), 290)) });
        const x6 = g(st.pas); x6.setAttribute('transform', 'translate(-168 -168) rotate(-8)');
        rect(x6, -44 + 6, -28 + 6, 88, 56, 8, C.grey); rect(x6, -44, -28, 88, 56, 8, C.lime, C.ink, 5); text(x6, '×6', 0, 12, 34, C.ink, { mono: true, anchor: 'middle', len: f2(mw('×6', 34)) });
        st.pasTxt = null;
        if (unitText) {
          st.pasTxt = g(st.pas);
          const sz = fitSize(unitText, 42, 400, 24), w = Math.min(440, bw(unitText, sz) + 46), h = 70;
          rect(st.pasTxt, -w / 2 + 8, -h / 2 + 8, w, h, 12, C.grey); rect(st.pasTxt, -w / 2, -h / 2, w, h, 12, C.red, C.ink, 6);
          text(st.pasTxt, unitText, 0, sz * 0.35, sz, C.paper, { anchor: 'middle', len: f2(Math.min(bw(unitText, sz), w - 36)) });
          st.pasTxtX = Math.min(200, 1880 - 1500 - w / 2);
        }
      }

      /* ---- la part d'un seul homme ---- */
      st.bar = g(root);
      const B = st.bar;
      rect(B, BX + 12, BY + 12, BWID, BH, 4, C.grey);
      rect(B, BX, BY, BWID, BH, 4, C.paper, C.ink, 8);
      st.fill = rect(B, BX + 4, BY + 4, 0, BH - 8, 0, C.lime);
      st.ticks = [];
      for (let k = 0; k <= 20; k++) {
        const x = BX + BWID * k / 20, major = k % 5 === 0;
        st.ticks.push(line(B, x, BY + BH + 8, x, BY + BH + (major ? 36 : 22), C.paper, major ? 5 : 3));
      }
      st.tk20 = line(B, BX + BWID / 20, BY + BH + 8, BX + BWID / 20, BY + BH + 44, C.red, 8);
      st.redLine = rect(B, BX + BWID / 20 - 4, BY - 4, 8, BH + 8, 0, C.red);
      text(B, '0', BX, BY + BH + 72, 22, C.paper, { mono: true, anchor: 'middle', len: f2(mw('0', 22)) });
      text(B, '100 %', BX + BWID, BY + BH + 72, 22, C.paper, { mono: true, anchor: 'end', len: f2(mw('100 %', 22)) });
      st.lab20 = text(B, '1/20', BX + BWID / 20, BY + BH + 78, 30, C.paper, { mono: true, anchor: 'middle', len: f2(mw('1/20', 30)) });
      {
        const ls = fitSize(shareLabel, 26, 1130, 14, true);
        st.sLab = typed(B, defs, uid + 's', shareLabel, 330, BY - 24, ls, C.paper, { mono: true, maxW: 1130 });
        const nsz = fitSize(shareNote, 22, 400, 14, true), nx = 330 + st.sLab.W + 36;
        st.sNote = text(B, shareNote, Math.min(nx, 1760 - mw(shareNote, nsz)), BY - 24, nsz, '#B9B5A8', { mono: true, len: f2(Math.min(mw(shareNote, nsz), 1760 - nx)) });
      }
      {
        const z = 52, a = shareText, b = '· ' + who, wa = bw(a, z), gap = 18, wb = Math.min(bw(b, z), 1760 - BX - wa - gap);
        st.sTxtA = text(B, a, BX, 700, z, C.lime, { len: f2(wa) });
        st.sTxtB = text(B, b, BX + wa + gap, 700, z, C.paper, { len: f2(wb) });
      }
      // flèche « plus d'un vingtième »
      st.twG = g(root);
      {
        const lab = 'PLUS D\'UN VINGTIÈME DE LA CAISSE', sz = fitSize(lab, 46, 1500, 28);
        text(st.twG, lab, BX, 300, sz, C.lime, { len: f2(Math.min(bw(lab, sz), 1500)) });
        const x = BX + BWID / 20;
        line(st.twG, x, 322, x, 354, C.lime, 16, { 'stroke-linecap': 'butt' });
        sv('polygon', { points: `${x},378 ${x - 26},350 ${x + 26},350`, fill: C.lime }, st.twG);
      }
      return st;
    },

    update(st, t, shot) {
      const T = st.T, n = st.n, W = st.wall;
      const U = (k) => (T[k] == null ? -1 : t - T[k]);
      const tw = T.wagered, tb = T.blocks, ts = T.sum, tsh = T.share;
      const bwid = WWID / n, hs = st.hs;

      /* ---- le mur ---- */
      const wallOut = tsh != null && t >= tsh ? E.in3(prog(t - tsh, 0, 0.6)) : 0;
      if (wallOut >= 1) disp(W, false); else { disp(W, true); setA(W, 'transform', `translate(0 ${f2(900 * wallOut)})`); }
      let grown = 0;
      for (let i = 0; i < n; i++) {
        const u = tw == null ? -1 : t - (tw + i * 0.12);
        const hgt = u < 0 ? 0 : WH * E.out3(prog(u, 0, 0.3));
        const x = X0 + i * bwid, top = WY1 - hgt;
        vis(st.ghost[i], hgt < WH - 0.5);
        // tranche : détachée vers la colonne pendant `sum`
        const pu = ts == null ? 0 : E.io2(prog(t - (ts + i * 0.05), 0, 0.7));
        const detached = pu > 0;
        const blk = st.blocks[i], sl = st.slices[i];
        if (hgt <= 0.5) { vis(blk, false); vis(sl, false); vis(st.slots[i], false); if (st.labels[i]) vis(st.labels[i], false); continue; }
        const slotH = detached ? Math.min(hs, hgt) : 0;
        vis(blk, hgt - slotH > 0.5); setA(blk, 'y', f2(top + slotH)); setA(blk, 'height', f2(Math.max(0, hgt - slotH)));
        vis(st.slots[i], detached && hgt >= WH - 0.5);
        const sh0 = Math.min(hs, hgt);
        const tx = COLX, ty = WY1 - (i + 1) * st.hh, th = st.hh;
        const sx = x + (tx - x) * pu, sy = top + (ty - top) * pu - Math.sin(Math.PI * pu) * 70, sw = bwid + (COLW - bwid) * pu, sht = sh0 + (th - sh0) * pu;
        vis(sl, true); setA(sl, 'x', f2(sx)); setA(sl, 'y', f2(sy)); setA(sl, 'width', f2(sw)); setA(sl, 'height', f2(Math.max(0.5, sht)));
        if (hgt >= WH - 0.5) grown++;
        if (st.labels[i]) {
          const lu = tb == null ? -1 : t - (tb + i * 0.05), p = lu < 0 ? 0 : E.back(prog(lu, 0, 0.18));
          put(st.labels[i], x + bwid / 2, WY1 + 40, 0, p, undefined, 1);
        }
      }
      // sticker « plafond de la main »
      if (st.hand) { const u = U('hand'); if (u < 0) vis(st.hand, false); else { const p = E.back(prog(u, 0, 0.25)); put(st.hand, X0 + 30 + st.handW / 2, 440, -3, p, undefined, 1); } }
      // loupe + pastille
      const uu = U('unit'), closing = ts != null && t >= ts ? E.in2(prog(t - ts, 0, 0.25)) : 0;
      if (uu < 0 || closing >= 1) { vis(st.lens, false); vis(st.pas, false); } else {
        const k = 1 - closing;
        put(st.lens, st.lensX, st.lensY, -12, E.back(prog(uu, 0, 0.25)) * k, undefined, 1);
        put(st.pas, 1500, 470, 0, E.back(prog(uu, 0.25, 0.65)) * k, undefined, 1);
        if (st.pasTxt) { const q = E.back(prog(uu, 0.9, 1.15)); put(st.pasTxt, st.pasTxtX, 180, -3, q, undefined, 1); }
      }
      // légende de la somme
      {
        const u = U('sum'), k = u < 1.2 ? 0 : (u - 1.2) * 30;
        st.colLab.set(k);
      }

      /* ---- compteurs ---- */
      {
        let s;
        if (st.wagered == null) s = tw != null && t >= tw ? st.wagTxt : '0';
        else if (tw == null || t < tw) s = fmtAmt(st.wagered, 0);
        else { const dd = (n - 1) * 0.12 + 0.3, p = clamp((quant(t) - tw) / dd); s = p >= 1 || t >= tw + dd ? st.wagTxt : fmtAmt(st.wagered, st.wagered.val * E.in2(p)); }
        setTxt(st.cW, s, 110);
        if (st.lost == null) s = ts != null && t >= ts + 1.8 ? st.lostTxt : '0';
        else if (ts == null || t < ts + 0.2) s = fmtAmt(st.lost, 0);
        else { const p = clamp((quant(t) - ts - 0.2) / 1.6); s = p >= 1 || t >= ts + 1.8 ? st.lostTxt : fmtAmt(st.lost, st.lost.val * E.io2(p)); }
        setTxt(st.cL, s, 110);
      }

      /* ---- la barre de la part ---- */
      const us = tsh == null ? -1 : t - tsh;
      if (us < 0.4) disp(st.bar, false); else {
        disp(st.bar, true);
        setA(st.bar, 'transform', `translate(0 ${f2(260 * (1 - E.out3(prog(us, 0.4, 0.9))))})`);
        st.sLab.set((us - 0.9) * 30);
        vis(st.sNote, us > 0.9 + st.sLab.n / 30);
        st.ticks.forEach((tk, k) => vis(tk, us > 0.7 + k * 0.03));
        const fp = E.out2(prog(us, 1.1, 2.0));
        setA(st.fill, 'width', f2((BWID - 8) * (st.share / 100) * fp)); vis(st.fill, fp > 0);
        const tt = us > 2.0 ? 1 : 0;
        vis(st.sTxtA, tt > 0); vis(st.sTxtB, tt > 0);
        const ut = tsh == null || T.twentieth == null ? -1 : t - T.twentieth;
        vis(st.tk20, ut >= 0); vis(st.redLine, ut >= 0 && ut < 99);
        setA(st.lab20, 'fill', ut >= 0 ? C.red : C.paper);
      }
      const ut2 = T.twentieth == null || tsh == null || us < 0.4 ? -1 : t - T.twentieth;
      if (ut2 < 0.15) vis(st.twG, false); else { vis(st.twG, true); setA(st.twG, 'transform', `translate(0 ${f2(-60 * (1 - E.out3(prog(ut2, 0.15, 0.5))))})`); }
    }
  });
})();
