// Composant `rebate-loop` (épisode 7) : la remise sur les pertes. Voir EP7-COMPONENTS.md.
// À gauche une étiquette de prix (la perte) qui se balance au bout de sa ficelle, un sticker de remise, des liasses qui filent,
// un ruban cadeau qui tombe ; à droite une boucle de trois nœuds reliés par des flèches, parcourue par un jeton.
// Fonction pure du temps ; aplats, aucun dégradé / flou / filter. Cues : loss, rebate, gift, price, longer, more, spin.
(() => {
  'use strict';
  const { C, E, clamp, prog, f2, sv, g, rect, circle, path, line, text, put, rng, shakeAt } = ZV;
  let UID = 0;
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const str = (v, d) => (typeof v === 'string' && v.length ? v : v != null && typeof v !== 'object' && String(v).length ? String(v) : d);
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const vis = (n, on) => n.setAttribute('visibility', on ? 'visible' : 'hidden');   // non mis en cache : ZV.put pose aussi cet attribut
  const disp = (n, on) => setA(n, 'display', on ? 'inline' : 'none');      // pour les groupes dont les enfants posent leur propre visibility
  // largeurs réelles de Bricolage Grotesque 800 (em), mesurées ; Mono = 0,6 em
  const WT = {};
  '0:.67 1:.36 2:.61 3:.61 4:.64 5:.62 6:.66 7:.52 8:.66 9:.66 A:.71 B:.69 C:.69 D:.71 E:.63 F:.6 G:.73 H:.73 I:.3 J:.38 K:.7 L:.51 M:.96 N:.79 O:.73 P:.65 Q:.73 R:.69 S:.66 T:.58 U:.73 V:.68 W:1 X:.72 Y:.66 Z:.58 À:.71 Â:.71 É:.63 È:.63 Ê:.63 Î:.3 Ô:.73 Û:.73 Ç:.69 €:.75 %:.99 +:.53 ×:.53 −:.53 -:.36 .:.25 ,:.21 ::.26 ;:.24 \':.19 ’:.22 !:.3 ?:.43 |:.28 (:.33 ):.33 $:.65 ¢:.57 ≈:.55 →:1 ·:.25 /:.37 «:.48 »:.48 –:.55'.split(' ').forEach((p) => { WT[p[0]] = parseFloat(p.slice(2)); });
  const bw = (s, size) => { let a = 0; for (const ch of String(s)) a += WT[ch] !== undefined ? WT[ch] : /\s/.test(ch) ? 0.22 : 0.6; return a * size; };
  const mw = (s, size) => String(s).length * size * 0.6;
  // retour à la ligne mesuré, équilibré sur 2 lignes ; réduit la taille plutôt que de déborder
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
  const fitSize = (s, size, maxW, minS) => Math.max(minS, Math.min(size, Math.floor(maxW / Math.max(0.01, bw(s, 1)))));
  // texte qui s'écrit lettre à lettre : texte plein (textLength fixe) révélé par un clip ; set(n) = nombre de lettres visibles
  function typed(parent, defs, id, s, x, y, size, fill, o) {
    o = o || {};
    const w = o.mono ? mw(s, size) : bw(s, size), W = Math.min(w, o.maxW || 1e9);
    const x0 = o.anchor === 'middle' ? x - W / 2 : x;
    const cp = sv('clipPath', { id }, defs), cr = rect(cp, x0 - 6, y - size * 1.1, 0, size * 1.5, 0, '#000');
    const t = text(parent, s, x0, y, size, fill, { mono: o.mono, len: f2(W) });
    t.setAttribute('clip-path', `url(#${id})`);
    const chars = Array.from(s), cum = [0]; let acc = 0;
    for (const ch of chars) { acc += o.mono ? 0.6 : (WT[ch] !== undefined ? WT[ch] : 0.4); cum.push(acc); }
    return { t, n: chars.length, set(k) { k = Math.max(0, Math.min(chars.length, Math.floor(k))); const wv = k >= chars.length ? W + 12 : (cum[k] / acc) * W; setA(cr, 'width', f2(k <= 0 ? 0 : wv + 6)); vis(t, k > 0); } };
  }

  // positions des éléments (repère 1920×1080)
  const HX = 470, HY = 100, SL = 165;                                          // crochet, ficelle (l'œillet est à y = HY + SL)
  const NW = 360, NH = 150;
  const CN = [[1400, 205], [1640, 615], [1130, 615]];                          // centres des nœuds
  const LAP = 2.4;
  const PATHLEN = (() => { let a = 0; for (let i = 0; i < 3; i++) { const p = CN[i], q = CN[(i + 1) % 3]; a += Math.hypot(q[0] - p[0], q[1] - p[1]); } return a; })();
  const D3 = Math.hypot(CN[1][0] - CN[0][0], CN[1][1] - CN[0][1]) + Math.hypot(CN[2][0] - CN[1][0], CN[2][1] - CN[1][1]);   // distance au 3e nœud

  // flèche plate entre deux points (p = avancement du tracé) ; la pointe est toujours visible
  function mkArrow(parent, color) {
    const o = {};
    o.shaft = line(parent, 0, 0, 0, 0, color, 16); o.shaft.setAttribute('stroke-linecap', 'butt');
    o.head = sv('polygon', { points: '0,0 0,0 0,0', fill: color }, parent);
    o.set = (p, x1, y1, x2, y2) => {
      const dx = x2 - x1, dy = y2 - y1, L = Math.max(1, Math.hypot(dx, dy)), ux = dx / L, uy = dy / L;
      if (p <= 0.001) { vis(o.shaft, false); vis(o.head, false); return; }
      const len = L * p, hl = Math.min(40, len), hw = 27 * Math.min(1, len / 40);
      const tx = x1 + ux * len, ty = y1 + uy * len, bx = tx - ux * hl, by = ty - uy * hl;
      setA(o.shaft, 'x1', f2(x1)); setA(o.shaft, 'y1', f2(y1)); setA(o.shaft, 'x2', f2(bx + ux * 3)); setA(o.shaft, 'y2', f2(by + uy * 3)); vis(o.shaft, len > hl);
      setA(o.head, 'points', `${f2(tx)},${f2(ty)} ${f2(bx - uy * hw)},${f2(by + ux * hw)} ${f2(bx + uy * hw)},${f2(by - ux * hw)}`); vis(o.head, true);
    };
    return o;
  }
  function mkNode(parent, label) {
    const o = {}; const W = wrap(label, 44, NW - 50, 2, 30), n = W.lines.length;
    o.g = g(parent);
    rect(o.g, -NW / 2 + 10, -NH / 2 + 10, NW, NH, 18, C.ink);
    o.bd = rect(o.g, -NW / 2, -NH / 2, NW, NH, 18, C.ink, C.ink, 6);
    o.inn = rect(o.g, -NW / 2 + 11, -NH / 2 + 11, NW - 22, NH - 22, 11, 'none', C.paper, 3);
    o.tx = W.lines.map((l, i) => text(o.g, l, 0, (i - (n - 1) / 2) * W.size * 1.1 + W.size * 0.35, W.size, C.paper, { anchor: 'middle', len: f2(Math.min(bw(l, W.size), NW - 40)) }));
    o.paint = (fill, tf, inn) => { setA(o.bd, 'fill', fill); setA(o.inn, 'stroke', inn); o.tx.forEach((x) => setA(x, 'fill', tf)); };
    return o;
  }

  ZV.define('rebate-loop', {
    init(root, shot) {
      const P = shot.props || {};
      const beats = Array.isArray(shot.beats) ? shot.beats : [];
      const dur = isNum(shot.dur) && shot.dur > 0 ? shot.dur : 12;
      const first = (n) => { let r = null; for (const b of beats) if (b && b.do === 'cue' && b.name === n && isNum(b.t) && (r === null || b.t < r)) r = b.t; return r; };
      const NAMES = ['loss', 'rebate', 'gift', 'price', 'longer', 'more', 'spin'];
      const T = {}; NAMES.forEach((n) => { T[n] = first(n); });
      if (NAMES.every((n) => T[n] == null)) { const k = Math.min(1, dur / 13); const d = { loss: 0.4, rebate: 1.8, gift: 4.0, price: 5.4, longer: 6.8, more: 8.8, spin: 10.4 }; NAMES.forEach((n) => { T[n] = d[n] * k; }); }
      const loss = str(P.loss, '1 000 000 $'), rate = str(P.rate, '−15 %'), back = str(P.back, 'ON LUI REND 150 000 $');
      const nodes = Array.isArray(P.nodes) ? P.nodes.slice(0, 3) : [];
      const dn = ['LA PERTE COÛTE MOINS CHER', 'IL JOUE PLUS LONGTEMPS', 'IL PERD PLUS'];
      while (nodes.length < 3) nodes.push(dn[nodes.length]);
      const gift = str(P.gift, 'UN CADEAU ?'), price = str(P.price, 'LE PRIX DE LA PERTE BAISSE');
      const uid = 'rb' + (++UID);
      const st = { T, uid, dur };
      const r = rng(7007);

      /* ---- fond et décor ---- */
      rect(root, 0, 0, 1920, 1080, 0, C.paper);
      circle(root, 1390, 470, 360, '#ECE8DC');
      line(root, 905, 120, 905, 800, '#CFCABB', 6, { 'stroke-dasharray': '4 18' });
      const defs = sv('defs', null, root);

      /* ---- fantômes (le plan reste beau sans cue) ---- */
      st.ghostTag = path(root, `M${HX - 240} 150 L${HX + 240} 150 L${HX + 330} 240 L${HX + 330} 700 L${HX - 330} 700 L${HX - 330} 240 Z`, 'none', '#CFCABB', 6, { 'stroke-dasharray': '16 12' });
      st.ghostNodes = CN.map((c) => rect(root, c[0] - NW / 2, c[1] - NH / 2, NW, NH, 18, 'none', '#CFCABB', 6, { 'stroke-dasharray': '16 12' }));

      /* ---- étiquette de prix ---- */
      st.swing = g(root);
      st.string = path(st.swing, 'M0 0 L0 ' + SL, 'none', C.ink, 8);
      st.eyeG = g(st.swing, { transform: `translate(0 ${SL})` });
      st.body = g(st.eyeG);
      const poly = '-240,-50 240,-50 330,40 330,450 -330,450 -330,40';
      sv('polygon', { points: poly, fill: C.ink, transform: 'translate(14 14)', 'stroke-linejoin': 'round', stroke: C.ink, 'stroke-width': 8 }, st.body);
      sv('polygon', { points: poly, fill: C.paper, stroke: C.ink, 'stroke-width': 8, 'stroke-linejoin': 'round' }, st.body);
      circle(st.body, 0, 0, 24, C.paper, C.ink, 7);
      text(st.body, 'LA PERTE', -292, 112, 30, C.ink, { mono: true, spacing: 4, len: f2(mw('LA PERTE', 30) + 7 * 4) });
      const vs = fitSize(loss, 120, 600, 56);
      st.val = text(st.body, loss, 0, 318, vs, C.ink, { anchor: 'middle', len: f2(Math.min(bw(loss, vs), 600)) });
      rect(st.body, -296, 342, 592, 8, 0, C.ink);
      // sticker de remise
      st.rate = g(st.body);
      {
        const w = 270, h = 96, sz = fitSize(rate, 66, w - 40, 36);
        rect(st.rate, -w / 2 + 10, -h / 2 + 10, w, h, 14, C.ink);
        rect(st.rate, -w / 2, -h / 2, w, h, 14, C.lime, C.ink, 6);
        text(st.rate, rate, 0, sz * 0.35, sz, C.ink, { anchor: 'middle', len: f2(Math.min(bw(rate, sz), w - 40)) });
      }
      // sticker cadeau
      st.gift = g(st.body);
      {
        const w = 380, h = 78, sz = fitSize(gift, 46, w - 40, 30);
        rect(st.gift, -w / 2 + 8, -h / 2 + 8, w, h, 14, C.ink);
        rect(st.gift, -w / 2, -h / 2, w, h, 14, C.paper, C.ink, 6);
        text(st.gift, gift, 0, sz * 0.35, sz, C.ink, { anchor: 'middle', len: f2(Math.min(bw(gift, sz), w - 40)) });
      }
      // ruban (nœud plat lime)
      st.bow = g(st.body);
      {
        const lp = 'M0 0 C-52 -64 -102 -22 -76 26 C-56 44 -22 22 0 0 Z';
        path(st.bow, lp, C.lime, C.ink, 6);
        path(st.bow, lp, C.lime, C.ink, 6, { transform: 'scale(-1 1)' });
        path(st.bow, 'M-6 14 L-52 84 L-24 92 L6 30 Z', C.lime, C.ink, 6);
        path(st.bow, 'M6 14 L52 84 L24 92 L-6 30 Z', C.lime, C.ink, 6);
        rect(st.bow, -17, -17, 34, 34, 8, C.lime, C.ink, 6);
      }
      /* ---- liasses (devant l'étiquette) ---- */
      st.bills = [];
      for (let i = 0; i < 7; i++) {
        const o = { g: g(root) };
        rect(o.g, -39 + 5, -21 + 5, 78, 42, 5, C.ink);
        rect(o.g, -39, -21, 78, 42, 5, C.paper, C.ink, 5);
        rect(o.g, -9, -21, 18, 42, 0, C.lime, C.ink, 4);
        o.p0 = [300 + (r() - 0.5) * 120, 690 + (r() - 0.5) * 20];
        o.p1 = [30 + r() * 60, 690 + r() * 40];
        o.p2 = [190 + r() * 90, 786 + r() * 8];
        o.spin = (r() - 0.5) * 120; o.rot0 = (r() - 0.5) * 50; o.t0 = 0.2 + i * 0.16;
        st.bills.push(o);
      }

      /* ---- légendes sous l'étiquette ---- */
      st.band = g(root);
      {
        const sz = fitSize(back, 34, 640, 22), w = Math.min(700, mw(back, sz) + 56);
        rect(st.band, 8, 8, w, 56, 10, C.lime);
        rect(st.band, 0, 0, w, 56, 10, C.ink, C.ink, 5);
        st.bandT = typed(st.band, defs, uid + 'b', back, 28, 38, sz, C.paper, { mono: true, maxW: w - 50 });
        st.bandW = w;
      }
      st.band.setAttribute('transform', 'translate(120 778)');
      {
        const W = wrap(price, 52, 700, 2, 34); st.price = [];
        W.lines.forEach((l, i) => st.price.push(typed(root, defs, uid + 'p' + i, l, HX, 694 + i * W.size * 1.06, W.size, C.ink, { anchor: 'middle', maxW: 700 })));
        st.priceN = st.price.reduce((a, o) => a + o.n, 0);
      }

      /* ---- boucle ---- */
      st.arrows = [0, 1, 2].map(() => mkArrow(root, C.ink)); st.sc = [1, 1, 1];
      st.token = g(root);
      circle(st.token, 5, 5, 22, C.ink); circle(st.token, 0, 0, 22, C.lime, C.ink, 6);
      st.nodes = nodes.map((n) => mkNode(root, str(n, '')));
      st.stamp = g(root);
      {
        const lab = 'DONC IL PERD PLUS', sz = 46, w = Math.min(640, bw(lab, sz) + 70), h = 88;
        rect(st.stamp, -w / 2 + 9, -h / 2 + 9, w, h, 10, C.lime);
        rect(st.stamp, -w / 2, -h / 2, w, h, 10, C.ink, C.ink, 6);
        rect(st.stamp, -w / 2 + 9, -h / 2 + 9, w - 18, h - 18, 5, 'none', C.paper, 3);
        text(st.stamp, lab, 0, sz * 0.35, sz, C.paper, { anchor: 'middle', len: f2(Math.min(bw(lab, sz), w - 50)) });
      }
      return st;
    },

    update(st, t, shot) {
      const T = st.T;
      const has = (n) => T[n] != null && t >= T[n];
      const U = (n) => (T[n] != null ? t - T[n] : -1);

      /* ---- étiquette ---- */
      const tagOn = T.loss != null ? t >= T.loss : (T.rebate != null || T.gift != null || T.price != null);
      vis(st.ghostTag, !tagOn);
      disp(st.swing, tagOn);
      if (tagOn) {
        const u = T.loss != null ? t - T.loss : 99;
        const drop = u < 0.4 ? -780 * (1 - E.out3(prog(u, 0, 0.4))) : 0;
        const th = -4 + 14 * Math.exp(-3.2 * u) * Math.cos(10.5 * u);
        let sx = 0, sy = 0;
        if (T.rebate != null) { const s = shakeAt(t, T.rebate + 0.16, 6, 0.4); sx = s[0]; sy = s[1]; }
        setA(st.swing, 'transform', `translate(${f2(HX + sx)} ${f2(HY + sy + drop)}) rotate(${f2(th)})`);
        // rétrécissement + ficelle qui se détend
        const up = U('price');
        const k = up < 0 ? 0 : E.io2(prog(up, 0.25, 0.75)), sc = 1 - 0.2 * k;
        setA(st.body, 'transform', `scale(${f2(sc)})`);
        const sk = up < 0 ? 0 : E.io2(prog(up, 0.25, 0.9));
        const wob = up < 0.9 ? 0 : 10 * Math.exp(-4 * (up - 0.9)) * Math.sin((up - 0.9) * 14);
        setA(st.string, 'd', sk < 0.01 ? `M0 0 L0 ${SL}` : `M0 0 C${f2(64 * sk + wob)} ${f2(SL * 0.3)} ${f2(-74 * sk - wob)} ${f2(SL * 0.72)} 0 ${SL}`);
        // sticker de remise
        const ur = U('rebate');
        if (ur < 0) vis(st.rate, false); else { const p = prog(ur, 0, 0.18); put(st.rate, 170, 148, 7, 1 + 1.4 * (1 - E.out3(p)), undefined, 1); }
        // sticker cadeau + ruban
        const ug = U('gift');
        if (ug < 0) { vis(st.gift, false); vis(st.bow, false); } else {
          const p = E.back(prog(ug, 0, 0.3));
          put(st.gift, -110, 412, -5, p, undefined, 1);
          const fall = up < 0 ? 0 : E.in2(prog(up, 0, 0.7));
          if (fall >= 1) vis(st.bow, false); else put(st.bow, 226 + 40 * fall, 392 + 900 * fall, 12 + 70 * fall, p, undefined, 1);
        }
      }

      /* ---- liasses + bandeau « back » ---- */
      const ur = U('rebate');
      st.bills.forEach((b) => {
        const u = ur - b.t0, p = prog(u, 0, 0.8);
        if (ur < 0 || u < 0 || p >= 1) { vis(b.g, false); return; }
        const e = E.in2(p) * 0.6 + p * 0.4, a = 1 - e;
        const x = a * a * b.p0[0] + 2 * a * e * b.p1[0] + e * e * b.p2[0], y = a * a * b.p0[1] + 2 * a * e * b.p1[1] + e * e * b.p2[1];
        put(b.g, x, y, b.rot0 + b.spin * p, E.out2(prog(p, 0, 0.18)), undefined, 1);
      });
      if (ur < 0.5) disp(st.band, false); else { disp(st.band, true); const p = E.out3(prog(ur, 0.5, 0.7)); setA(st.band, 'transform', `translate(120 ${f2(778 + 60 * (1 - p))})`); st.bandT.set((ur - 0.7) * 30); }
      // légende du prix
      const up = U('price');
      const pn = up < 0.55 ? 0 : (up - 0.55) * 30;
      let rest = pn; st.price.forEach((o) => { o.set(rest); rest -= o.n; });

      /* ---- boucle ---- */
      const tl = T.longer, tm = T.more, ts = T.spin;
      const tA3 = tm != null ? tm : ts;
      const showN = [tl != null && t >= tl, tl != null && t >= tl + 0.7, (tl != null && t >= tl + 1.4) || (tm != null && t >= tm) || (ts != null && t >= ts)];
      const litT = [tl != null ? tl + 0.2 : null, tl != null ? tl + 0.9 : null];
      st.nodes.forEach((nd, i) => {
        const on = showN[i]; vis(st.ghostNodes[i], !on); vis(nd.g, on);
        if (!on) { st.sc[i] = 1; return; }
        const t0 = i === 0 ? tl : i === 1 ? tl + 0.7 : Math.min(...[tl != null ? tl + 1.4 : 1e9, tm != null ? tm : 1e9, ts != null ? ts : 1e9]);
        let s = E.back(prog(t - t0, 0, 0.3)), fill = C.ink, tf = C.paper, inn = C.paper;
        if (i < 2 && litT[i] != null && t >= litT[i]) { fill = C.lime; tf = C.ink; inn = C.ink; }
        if (i === 2) {
          const g0 = tm != null ? tm : ts;
          let grow = 1;
          if (g0 != null && t >= g0) { fill = C.red; grow = 1 + 0.2 * E.back(prog(t - g0, 0, 0.3)); }
          if (ts != null && t >= ts) {
            // chaque passage du jeton sur le 3e nœud le fait grossir de 4 % (plafond 1.4)
            let m = 0; const tp0 = ts + (D3 / PATHLEN) * LAP;
            for (let k = 0; k < 40; k++) { const q = (t - (tp0 + k * LAP)) / 0.25; if (q <= 0) break; m += E.out2(clamp(q)); }
            grow = Math.min(1.4, grow * Math.pow(1.04, m));
          }
          s *= grow;
        }
        nd.paint(fill, tf, inn);
        st.sc[i] = s; put(nd.g, CN[i][0], CN[i][1], 0, s, undefined, 1);
      });
      // flèches : de bord à bord, selon l'échelle courante des nœuds
      const edge = (i, ux, uy) => { const sc = st.sc[i], hw = 186 * sc, hh = 81 * sc; return Math.min(Math.abs(ux) < 1e-6 ? 1e9 : hw / Math.abs(ux), Math.abs(uy) < 1e-6 ? 1e9 : hh / Math.abs(uy)) + 12; };
      const arrow = (k, i, j, p) => {
        const a = CN[i], b = CN[j], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
        const d0 = edge(i, ux, uy), d1 = edge(j, -ux, -uy);
        st.arrows[k].set(L - d0 - d1 < 30 ? 0 : p, a[0] + ux * d0, a[1] + uy * d0, b[0] - ux * d1, b[1] - uy * d1);
      };
      arrow(0, 0, 1, tl == null ? 0 : E.out2(prog(t - tl, 0.25, 0.65)));
      arrow(1, 1, 2, tl == null ? 0 : E.out2(prog(t - tl, 0.95, 1.35)));
      arrow(2, 2, 0, tA3 == null ? 0 : E.out2(prog(t - tA3, 0.05, 0.5)));
      // tampon
      if (tm == null || t < tm + 0.35) vis(st.stamp, false); else { const p = prog(t - tm - 0.35, 0, 0.16); put(st.stamp, 1400, 792, -3, 1 + 1.3 * (1 - E.out3(p)), undefined, 1); }
      // jeton
      if (ts == null || t < ts) vis(st.token, false); else {
        let d = (((t - ts) / LAP) % 1) * PATHLEN, x = CN[0][0], y = CN[0][1];
        for (let i = 0; i < 3; i++) { const p = CN[i], q = CN[(i + 1) % 3], L = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d <= L) { x = p[0] + (q[0] - p[0]) * d / L; y = p[1] + (q[1] - p[1]) * d / L; break; } d -= L; }
        put(st.token, x, y, 0, 1, 1, 1);
      }
    }
  });
})();
