// Composant `jet-invite` (épisode 7) : le dossier que le casino connaît, l'invitation, le jet, l'argent « porte-bonheur ». Voir EP7-COMPONENTS.md.
// Scène 1 (fond paper) : la chemise cartonnée, quatre lignes qui s'écrivent, le tampon, la carte d'invitation à côté.
// Scène 2 (fond ink) : l'arc pointillé entre « chez lui » et la ville, l'hôte, le jet, les cadeaux, la boîte, le circuit jusqu'au guichet.
// Fonction pure du temps ; aplats, aucun dégradé / flou / filter, aucun marquage. Cues : file, flag-1..4, ban, anyway, host, jet, gifts, box, circuit.
(() => {
  'use strict';
  const { C, E, clamp, prog, f2, sv, g, rect, circle, path, line, text, put, shakeAt } = ZV;
  let UID = 0;
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const str = (v, d) => (typeof v === 'string' && v.length ? v : v != null && typeof v !== 'object' && String(v).length ? String(v) : d);
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const vis = (n, on) => n.setAttribute('visibility', on ? 'visible' : 'hidden');   // non mis en cache : ZV.put pose aussi cet attribut
  const disp = (n, on) => setA(n, 'display', on ? 'inline' : 'none');        // pour les groupes dont les enfants posent leur propre visibility
  const WT = {};
  '0:.67 1:.36 2:.61 3:.61 4:.64 5:.62 6:.66 7:.52 8:.66 9:.66 A:.71 B:.69 C:.69 D:.71 E:.63 F:.6 G:.73 H:.73 I:.3 J:.38 K:.7 L:.51 M:.96 N:.79 O:.73 P:.65 Q:.73 R:.69 S:.66 T:.58 U:.73 V:.68 W:1 X:.72 Y:.66 Z:.58 À:.71 Â:.71 É:.63 È:.63 Ê:.63 Î:.3 Ô:.73 Û:.73 Ç:.69 €:.75 %:.99 +:.53 ×:.53 −:.53 -:.36 .:.25 ,:.21 ::.26 ;:.24 \':.19 ’:.22 !:.3 ?:.43 |:.28 (:.33 ):.33 $:.65 ¢:.57 ≈:.55 →:1 ·:.25 /:.37 «:.48 »:.48 –:.55'.split(' ').forEach((p) => { WT[p[0]] = parseFloat(p.slice(2)); });
  const bw = (s, size) => { let a = 0; for (const ch of String(s)) a += WT[ch] !== undefined ? WT[ch] : /\s/.test(ch) ? 0.22 : 0.6; return a * size; };
  const mw = (s, size) => String(s).length * size * 0.6;
  const fitSize = (s, size, maxW, minS, mono) => Math.max(minS, Math.min(size, Math.floor(maxW / Math.max(0.01, mono ? mw(s, 1) : bw(s, 1)))));
  function layout(words, sz, maxW, maxL) {
    if (maxL <= 1) { const s = words.join(' '); return bw(s, sz) <= maxW ? [s] : null; }
    const lines = []; let cur = '';
    for (const w of words) { const nx = cur ? cur + ' ' + w : w; if (!cur || bw(nx, sz) <= maxW) cur = nx; else { lines.push(cur); cur = w; } }
    lines.push(cur);
    if (lines.length > maxL || lines.some((l) => bw(l, sz) > maxW)) return null;
    if (lines.length === 2 && maxL === 2) {
      let best = lines, bm = Math.max(bw(lines[0], sz), bw(lines[1], sz));
      for (let k = 1; k < words.length; k++) { const a = words.slice(0, k).join(' '), b = words.slice(k).join(' '), m = Math.max(bw(a, sz), bw(b, sz)); if (m < bm && m <= maxW) { bm = m; best = [a, b]; } }
      return best;
    }
    return lines;
  }
  function wrap(s, size, maxW, maxL, minS) {
    const words = String(s).split(/\s+/).filter(Boolean); if (!words.length) words.push('');
    for (let sz = size; sz >= minS; sz -= 2) { const L = layout(words, sz, maxW, maxL); if (L) return { lines: L, size: sz }; }
    return { lines: layout(words, minS, 1e9, maxL) || [words.join(' ')], size: minS };
  }
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

  /* ---- l'arc du voyage : courbe quadratique entre « chez lui » et la ville ---- */
  const A0 = [260, 640], AC = [960, -180], A1 = [1660, 640];
  const arcX = (s) => (1 - s) * (1 - s) * A0[0] + 2 * s * (1 - s) * AC[0] + s * s * A1[0];
  const arcY = (s) => (1 - s) * (1 - s) * A0[1] + 2 * s * (1 - s) * AC[1] + s * s * A1[1];
  const arcAng = (s) => Math.atan2(2 * (1 - s) * (AC[1] - A0[1]) + 2 * s * (A1[1] - AC[1]), 2 * (1 - s) * (AC[0] - A0[0]) + 2 * s * (A1[0] - AC[0])) / ZV.D2R;
  const GY = 662;                                                              // sol de la scène 2
  const BOXX = 1440, BOXY = 652;                                              // pied de la boîte cadeau
  const GUI = [1736, 598];                                                     // bord du guichet

  ZV.define('jet-invite', {
    init(root, shot) {
      const P = shot.props || {};
      const beats = Array.isArray(shot.beats) ? shot.beats : [];
      const dur = isNum(shot.dur) && shot.dur > 0 ? shot.dur : 20;
      const first = (n) => { let r = null; for (const b of beats) if (b && b.do === 'cue' && b.name === n && isNum(b.t) && (r === null || b.t < r)) r = b.t; return r; };
      const NAMES = ['file', 'flag-1', 'flag-2', 'flag-3', 'flag-4', 'ban', 'anyway', 'host', 'jet', 'gifts', 'box', 'circuit'];
      const T = {}; NAMES.forEach((n) => { T[n] = first(n); });
      if (NAMES.every((n) => T[n] == null)) {
        const k = Math.min(1, dur / 20), d = { file: 0.3, 'flag-1': 1.2, 'flag-2': 2.1, 'flag-3': 3.0, 'flag-4': 4.2, ban: 5.8, anyway: 6.8, host: 8.2, jet: 10.4, gifts: 13.2, box: 14.4, circuit: 16.0 };
        NAMES.forEach((n) => { T[n] = d[n] * k; });
      }
      const name = str(P.name, 'HARRY KAKAVAS'), role = str(P.role, 'JOUEUR · AUSTRALIE');
      const dflags = ['JOUEUR PATHOLOGIQUE', 'EXCLU DU CASINO DE SYDNEY', 'CONDAMNÉ POUR UNE FRAUDE (POUR FINANCER SON JEU)', 'A DEMANDÉ LUI-MÊME À ÊTRE INTERDIT AU CASINO DE MELBOURNE'];
      const flags = [0, 1, 2, 3].map((i) => str(Array.isArray(P.flags) ? P.flags[i] : null, dflags[i]));
      const ban = str(P.ban, 'INTERDIT À SA DEMANDE'), invite = str(P.invite, 'INVITATION');
      const gifts = (Array.isArray(P.gifts) ? P.gifts : ['DES SUITES', 'DES CADEAUX']).slice(0, 3).map((x) => str(x, '')).filter((x) => x);
      const box = str(P.box, '50 000 $'), boxLabel = str(P.box_label, 'ARGENT PORTE-BONHEUR'), circuit = str(P.circuit, 'IL FINIT TOUJOURS AU MÊME GUICHET');
      // la scène 2 s'ouvre sur `host` (ou 0,5 s avant son premier cue)
      let tS = T.host;
      if (tS == null) { const o = [T.jet, T.gifts, T.box, T.circuit].filter((x) => x != null); if (o.length) tS = Math.max(0, Math.min(...o) - 0.5); }
      const uid = 'ji' + (++UID);
      const st = { T, tS, uid, dur };
      const defs = sv('defs', null, root);
      const pt = sv('pattern', { id: uid + 'h', width: 30, height: 30, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
      sv('rect', { x: 0, y: 0, width: 30, height: 30, fill: C.paper }, pt);
      sv('rect', { x: 0, y: 0, width: 7, height: 30, fill: C.ink, 'fill-opacity': 0.08 }, pt);

      /* =================== scène 1 : le dossier =================== */
      rect(root, 0, 0, 1920, 1080, 0, C.paper);
      st.s1 = g(root);
      const S1 = st.s1;
      st.ghostCh = rect(S1, 260, 90, 1200, 710, 14, 'none', '#CFCABB', 6, { 'stroke-dasharray': '16 12' });
      st.ch = g(S1);
      const CH = st.ch;
      rect(CH, -600 + 16, -355 + 16, 1200, 710, 14, C.ink);
      rect(CH, -600, -355, 1200, 710, 14, `url(#${uid}h)`, C.ink, 8);
      rect(CH, -590, -355 - 46, 290, 56, 12, `url(#${uid}h)`, C.ink, 8);
      text(CH, 'DOSSIER', -445, -355 - 8, 28, C.ink, { mono: true, anchor: 'middle', spacing: 5, len: f2(mw('DOSSIER', 28) + 6 * 5) });
      rect(CH, -566, -322, 1132, 644, 6, C.white, C.ink, 4);
      const ns = fitSize(name, 84, 900, 40);
      text(CH, name, -536, -236, ns, C.ink, { len: f2(Math.min(bw(name, ns), 900)) });
      const rs = fitSize(role, 30, 1000, 16, true);
      text(CH, role, -536, -190, rs, C.grey, { mono: true, len: f2(Math.min(mw(role, rs), 1000)) });
      line(CH, -536, -166, 536, -166, C.ink, 4);
      // quatre lignes : taille commune, retour à la ligne mesuré (2 lignes au plus)
      let fs = 40, wr;
      for (; fs >= 30; fs -= 2) { wr = flags.map((f) => layout(String(f).split(/\s+/).filter(Boolean), fs, 670, 2)); if (wr.every((x) => x)) break; }
      if (!wr || !wr.every((x) => x)) { fs = 30; wr = flags.map((f) => layout(String(f).split(/\s+/).filter(Boolean), fs, 1e9, 2) || [String(f)]); }
      st.flags = [];
      const rowC = [-91, 23, 136, 250];
      flags.forEach((f, i) => {
        const o = { pen: g(CH), lines: [], n: 0 }, c = rowC[i], L = wr[i];
        line(o.pen, -536, c - 26, -536, c + 26, C.ink, 5);
        sv('polygon', { points: `-536,${c - 26} -494,${c - 11} -536,${c + 4}`, fill: C.red, stroke: C.ink, 'stroke-width': 3, 'stroke-linejoin': 'round' }, o.pen);
        o.cx = -536; o.cy = c;
        L.forEach((l, k) => {
          const y = c + (k - (L.length - 1) / 2) * fs * 1.08 + fs * 0.35;
          const ty = typed(CH, defs, `${uid}f${i}_${k}`, l, -470, y, fs, C.ink, { maxW: 676 });
          o.lines.push(ty); o.n += ty.n;
        });
        st.flags.push(o);
      });
      // tampon (marge droite)
      st.stamp = g(CH);
      {
        const w = 340, h = 190, W = wrap(ban, 52, 290, 2, 26), n = W.lines.length;
        rect(st.stamp, -w / 2, -h / 2, w, h, 6, C.white, C.red, 8);
        rect(st.stamp, -w / 2 + 16, -h / 2 + 16, w - 32, h - 32, 3, 'none', C.red, 3);
        W.lines.forEach((l, i) => text(st.stamp, l, 0, (i - (n - 1) / 2) * W.size * 1.1 + W.size * 0.35, W.size, C.red, { anchor: 'middle', len: f2(Math.min(bw(l, W.size), w - 56)) }));
      }
      // carte d'invitation, à côté de la chemise
      st.card = g(S1);
      {
        const w = 340, h = 230;
        rect(st.card, -w / 2 + 14, -h / 2 + 14, w, h, 12, C.ink);
        rect(st.card, -w / 2, -h / 2, w, h, 12, C.paper, C.red, 8);
        const sz = fitSize(invite, 40, w - 50, 20, true);
        text(st.card, invite, 0, -22, sz, C.ink, { mono: true, anchor: 'middle', len: f2(Math.min(mw(invite, sz), w - 50)) });
        rect(st.card, -110, 8, 220, 10, 0, C.ink); rect(st.card, -110, 36, 150, 10, 0, '#B9B5A8');
        circle(st.card, 100, 70, 26, C.red, C.ink, 5);
      }
      st.quand = g(S1);
      {
        const lab = 'QUAND MÊME', w = 320, h = 70, sz = fitSize(lab, 42, w - 40, 24);
        rect(st.quand, -w / 2 + 9, -h / 2 + 9, w, h, 12, '#8A8578');
        rect(st.quand, -w / 2, -h / 2, w, h, 12, C.ink, C.ink, 6);
        text(st.quand, lab, 0, sz * 0.35, sz, C.paper, { anchor: 'middle', len: f2(Math.min(bw(lab, sz), w - 40)) });
      }

      /* =================== scène 2 : le voyage =================== */
      st.s2 = g(root);
      const S2 = st.s2;
      rect(S2, 0, 0, 1920, 1080, 0, C.ink);
      line(S2, 100, GY, 1900, GY, C.paper, 6);
      // maison « chez lui »
      path(S2, 'M138 654 L138 604 L184 566 L230 604 L230 654 Z', C.ink, C.paper, 5);
      rect(S2, 170, 622, 28, 32, 0, 'none', C.paper, 4);
      // l'arc pointillé (tracé par un clip qui s'ouvre de gauche à droite)
      const cpArc = sv('clipPath', { id: uid + 'a' }, defs);
      st.arcClip = rect(cpArc, 200, 0, 0, 1080, 0, '#000');
      const arcG = g(S2, { 'clip-path': `url(#${uid}a)` });
      path(arcG, `M${A0[0]} ${A0[1]} Q${AC[0]} ${AC[1]} ${A1[0]} ${A1[1]}`, 'none', C.paper, 8, { 'stroke-dasharray': '24 18', 'stroke-linecap': 'butt' });
      circle(S2, A0[0], A0[1], 18, C.lime, C.paper, 5);
      circle(S2, A1[0], A1[1], 18, C.lime, C.paper, 5);
      text(S2, 'CHEZ LUI', A0[0], 712, 30, C.paper, { mono: true, anchor: 'middle', len: f2(mw('CHEZ LUI', 30)) });
      text(S2, 'MELBOURNE', A1[0], 712, 30, C.paper, { mono: true, anchor: 'middle', len: f2(mw('MELBOURNE', 30)) });
      // flèche du circuit
      st.arrow = g(S2);
      st.arrowL = line(st.arrow, BOXX + 80, GUI[1], BOXX + 80, GUI[1], C.lime, 20, { 'stroke-linecap': 'butt' });
      st.arrowH = sv('polygon', { points: '0,0 0,0 0,0', fill: C.lime }, st.arrow);
      // liasses du circuit (sous le bâtiment : elles disparaissent derrière lui)
      st.bills = [];
      for (let i = 0; i < 3; i++) {
        const b = g(S2);
        rect(b, -33 + 5, -19 + 5, 66, 38, 5, '#5A5A5A'); rect(b, -33, -19, 66, 38, 5, C.paper, C.ink, 4); rect(b, -8, -19, 16, 38, 0, C.lime, C.ink, 3);
        st.bills.push(b);
      }
      // bâtiment au guichet (blocs ink bordés paper, aucune enseigne)
      st.bld = g(S2);
      {
        const B = st.bld;
        line(B, 1840, 330, 1840, 384, C.paper, 5);
        rect(B, 1800, 384, 80, 60, 0, C.ink, C.paper, 5);
        rect(B, 1770, 440, 120, 66, 0, C.ink, C.paper, 5);
        rect(B, 1740, 500, 160, 160, 0, C.ink, C.paper, 5);
        for (let r = 0; r < 2; r++) for (let k = 0; k < 3; k++) rect(B, 1784 + k * 34, 456 + r * 24 - (r ? 0 : 0), 16, 12, 0, C.paper);
        rect(B, 1760, 548, 120, 84, 0, C.paper, C.paper, 4);
        for (let k = 0; k < 5; k++) rect(B, 1770 + k * 26, 548, 8, 84, 0, C.ink);
        rect(B, 1752, 630, 136, 12, 0, C.paper, C.ink, 4);
        text(B, 'LE GUICHET', 1820, 534, 22, C.paper, { mono: true, anchor: 'middle', len: f2(mw('LE GUICHET', 22)) });
      }
      // hôte (buste plat sans visage)
      st.host = g(S2);
      {
        const H = st.host;
        path(H, 'M-34 0 L-30 -26 Q0 -40 30 -26 L34 0 Z', C.ink, C.paper, 5);
        circle(H, 0, -52, 19, C.ink, C.paper, 5);
        path(H, 'M0 -26 L-14 -36 L-14 -18 Z', C.lime, C.ink, 3); path(H, 'M0 -26 L14 -36 L14 -18 Z', C.lime, C.ink, 3); rect(H, -4, -30, 8, 8, 2, C.lime, C.ink, 3);
      }
      st.hostLab = typed(S2, defs, uid + 'hl', 'UN HÔTE FAIT LE VOYAGE', 960, 470, 30, C.paper, { mono: true, anchor: 'middle', maxW: 800 });
      // jet privé plat (aucun marquage)
      st.jet = g(S2);
      {
        const J = st.jet;
        path(J, 'M-132 -20 L-136 -62 L-108 -62 L-76 -20 Z', C.ink, C.paper, 5); rect(J, -132, -64, 26, 8, 0, C.red);
        path(J, 'M-20 14 L-62 56 L-34 56 L28 14 Z', C.ink, C.paper, 5);
        rect(J, -104, -22, 214, 44, 22, C.ink, C.paper, 5);
        rect(J, -92, 4, 190, 9, 0, C.red);
        for (let k = 0; k < 6; k++) circle(J, -58 + k * 24, -8, 5.5, C.paper);
        path(J, 'M76 -18 Q92 -18 100 -6 L76 -6 Z', C.paper);
      }
      // étiquettes des cadeaux
      st.gifts = gifts.map((lab, i) => {
        const o = g(S2), w = 290, h = 64, sz = fitSize(lab, 40, w - 36, 22);
        rect(o, -w / 2 + 8, -h / 2 + 8, w, h, 12, '#5A5A5A'); rect(o, -w / 2, -h / 2, w, h, 12, C.paper, C.ink, 6);
        text(o, lab, 0, sz * 0.35, sz, C.ink, { anchor: 'middle', len: f2(Math.min(bw(lab, sz), w - 36)) });
        return o;
      });
      // boîte cadeau (red, ruban lime) + montant
      st.box = g(S2);
      {
        const B = st.box;
        rect(B, -65, -75, 130, 75, 4, C.red, C.paper, 5);
        rect(B, -13, -75, 26, 75, 0, C.lime, C.ink, 4);
        st.slot = rect(B, -58, -75, 116, 14, 0, C.ink);
        st.lid = g(B);
        rect(st.lid, -72, -38, 144, 38, 4, C.red, C.paper, 5); rect(st.lid, -13, -38, 26, 38, 0, C.lime, C.ink, 4);
      }
      {
        const sz = fitSize(box, 80, 340, 40);
        st.boxT = typed(S2, defs, uid + 'bx', box, 1360 - Math.min(bw(box, sz), 340), 574, sz, C.paper, { maxW: 340 });
        const ls = fitSize(boxLabel, 28, 340, 16, true);
        st.boxL = typed(S2, defs, uid + 'bl', boxLabel, 1360 - Math.min(mw(boxLabel, ls), 340), 614, ls, C.lime, { mono: true, maxW: 340 });
      }
      st.offert = g(S2);
      {
        const w = 190, h = 60;
        rect(st.offert, -w / 2 + 8, -h / 2 + 8, w, h, 12, '#5A5A5A'); rect(st.offert, -w / 2, -h / 2, w, h, 12, C.paper, C.ink, 6);
        text(st.offert, 'OFFERT', 0, 13, 38, C.ink, { anchor: 'middle', len: f2(bw('OFFERT', 38)) });
      }
      {
        const sz = fitSize(circuit, 56, 1700, 30);
        st.circT = typed(S2, defs, uid + 'ci', circuit, 960, 810, sz, C.paper, { anchor: 'middle', maxW: 1700 });
      }
      return st;
    },

    update(st, t, shot) {
      const T = st.T, tS = st.tS;
      const U = (k) => (T[k] == null ? -1 : t - T[k]);

      /* ---- bascule scène 1 → scène 2 (poussée en 12 images, un seul événement) ---- */
      const e = tS == null ? 0 : E.io3(prog(t - tS, 0, 0.4));
      disp(st.s1, e < 1); disp(st.s2, e > 0);
      if (e < 1) setA(st.s1, 'transform', `translate(${f2(-1920 * e)} 0)`);
      if (e > 0) setA(st.s2, 'transform', `translate(${f2(1920 * (1 - e))} 0)`);

      /* ---- scène 1 ---- */
      if (e < 1) {
        const uf = U('file');
        vis(st.ghostCh, uf < 0);
        if (uf < 0) disp(st.ch, false); else {
          disp(st.ch, true);
          let sx = 0, sy = 0;
          if (T.ban != null) { const s = shakeAt(t, T.ban + 0.14, 7, 0.4); sx = s[0]; sy = s[1]; }
          const slide = 900 * (1 - E.out3(prog(uf, 0, 0.55)));
          setA(st.ch, 'transform', `translate(${f2(860 + sx)} ${f2(445 + sy + slide)}) rotate(-1.5)`);
        }
        st.flags.forEach((o, i) => {
          const u = U('flag-' + (i + 1));
          if (u < 0) { vis(o.pen, false); o.lines.forEach((l) => l.set(0)); return; }
          const p = E.back(prog(u, 0, 0.2)); setA(o.pen, 'transform', `translate(${f2(o.cx)} ${f2(o.cy)}) scale(${f2(Math.max(0.001, p))}) translate(${f2(-o.cx)} ${f2(-o.cy)})`);
          vis(o.pen, true);
          let k = u * 30; o.lines.forEach((l) => { l.set(k); k -= l.n; });
        });
        const ub = U('ban');
        if (ub < 0) vis(st.stamp, false); else put(st.stamp, 402, 52, -10, 1 + 1.4 * (1 - E.out3(prog(ub, 0, 0.16))), undefined, 1);
        const ua = U('anyway');
        if (ua < 0) { vis(st.card, false); vis(st.quand, false); } else {
          put(st.card, 1670 + 520 * (1 - E.out3(prog(ua, 0, 0.5))), 400, 2, 1, 1, 1);
          const q = E.back(prog(ua, 0.55, 0.8)); put(st.quand, 1670, 590, 5, q, undefined, 1);
        }
      }

      /* ---- scène 2 ---- */
      if (e > 0) {
        const us = tS == null ? 0 : t - tS;
        setA(st.arcClip, 'width', f2(1500 * E.out2(prog(us, 0.35, 1.1))));
        // hôte : de la ville vers « chez lui », puis embarque dans le jet
        const uh = U('host'), uj = U('jet');
        const hostOn = uh >= 0.4 && (uj < 0);
        if (!hostOn) { vis(st.host, false); } else {
          const p = E.io2(prog(uh, 0.4, 2.8)), s = 1 - p, bob = p > 0 && p < 1 ? Math.abs(Math.sin(uh * 9)) * 7 : 0;
          put(st.host, arcX(s), arcY(s) - 24 - bob, 0, 1.35, undefined, 1);
        }
        st.hostLab.set(uh < 0.9 || uj >= 0 ? 0 : (uh - 0.9) * 30);
        // jet : décolle de « chez lui », suit l'arc, se pose
        if (uj < 0) vis(st.jet, false); else {
          const p = E.io2(prog(uj, 0, 2.5)), k = 1 - E.in2(prog(uj, 3.1, 3.4));
          put(st.jet, arcX(p), arcY(p) - 4, arcAng(p), 0.9 * k, undefined, 1);
        }
        // cadeaux : tombent l'un après l'autre au-dessus de la ville
        st.gifts.forEach((o, i) => {
          const ug = T.gifts == null ? -1 : t - T.gifts - i * 0.55;
          if (ug < 0) { vis(o, false); return; }
          const fall = E.bounce(prog(ug, 0, 0.5)), ty = 350 - i * 86;
          put(o, 1600, ty - 460 * (1 - fall), (i % 2 ? 3 : -3), 1, 1, 1);
        });
        // boîte cadeau
        const ux = U('box');
        if (ux < 0) { vis(st.box, false); vis(st.offert, false); st.boxT.set(0); st.boxL.set(0); } else {
          put(st.box, BOXX, BOXY, 0, E.back(prog(ux, 0, 0.3)), undefined, 1);
          { const lp = E.out3(prog(ux, 0.35, 0.8)); setA(st.lid, 'transform', `translate(${f2(10 * lp)} ${f2(-75 - 62 * lp)}) rotate(${f2(9 * lp)})`); vis(st.slot, lp > 0.02); }
          st.boxT.set((ux - 0.6) * 30); st.boxL.set((ux - 1.1) * 30);
          put(st.offert, 1230, 478, -6, E.back(prog(ux, 1.3, 1.55)), undefined, 1);
        }
        // circuit : flèche de la boîte au guichet, liasses
        const uc = U('circuit');
        if (uc < 0) { vis(st.arrow, false); st.bills.forEach((b) => vis(b, false)); st.circT.set(0); } else {
          const x0 = BOXX + 80, x1 = GUI[0], p = E.out2(prog(uc, 0, 0.5)), xe = x0 + (x1 - x0) * p, hl = Math.min(44, xe - x0);
          vis(st.arrow, true);
          setA(st.arrowL, 'x2', f2(Math.max(x0, xe - hl + 4))); setA(st.arrowL, 'x1', x0); setA(st.arrowL, 'y1', GUI[1]); setA(st.arrowL, 'y2', GUI[1]);
          setA(st.arrowH, 'points', `${f2(xe)},${GUI[1]} ${f2(xe - hl)},${GUI[1] - 26} ${f2(xe - hl)},${GUI[1] + 26}`);
          st.bills.forEach((b, i) => {
            const u = uc - 0.6 - i * 0.55, q = prog(u, 0, 0.7);
            if (u < 0 || q >= 1) { vis(b, false); return; }
            put(b, x0 + 20 + (x1 + 40 - x0 - 20) * q, GUI[1], 0, 1, 1, 1);
          });
          st.circT.set((uc - 0.4) * 40);
        }
      }
    }
  });
})();
