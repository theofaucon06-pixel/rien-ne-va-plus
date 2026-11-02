// Composant `chip-stacks` : piles de jetons vues de face, hauteur exacte (1 jeton = même hauteur partout), compteur, étiquettes, écart `diff`.
(() => {
  const { C, sv, g, f2, E, prog, clamp, lerp, put, show, text, rect } = ZV;
  const INK = C.ink;
  const Z0 = (v, d) => (v == null ? d : v);
  const popE = (p) => E.back(clamp(p));
  const CW = 220;           // largeur d'un jeton
  const FLOOR = 700;        // ligne de sol
  const MAXVIS = 40;
  let UID = 0;

  const measCache = {};
  function meas(root, str, size, mono) {
    const key = str + '|' + size + '|' + (mono ? 1 : 0);
    if (measCache[key] != null) return measCache[key];
    let w = str.length * size * 0.6;
    try {
      const n = text(root, str, 0, 0, size, '#000', { mono });
      const b = n.getComputedTextLength();
      root.removeChild(n);
      if (b > 0) w = b;
    } catch (e) { /* estimation */ }
    measCache[key] = w;
    return w;
  }
  const colorOf = (c) => (c === 'lime' ? C.lime : c === 'red' ? C.red : c === 'paper' ? C.paper : C.white);
  const accentOf = (c) => (c === 'lime' ? C.white : c === 'red' ? C.white : C.lime);

  ZV.define('chip-stacks', {
    init(root, shot) {
      const pr = shot.props || {};
      const st = { shot };
      // fond ink à pois
      rect(root, 0, 0, 1920, 1080, 0, INK);
      const id = 'cs' + (++UID);
      const defs = sv('defs', null, root);
      const pat = sv('pattern', { id, width: 56, height: 56, patternUnits: 'userSpaceOnUse' }, defs);
      sv('circle', { cx: 28, cy: 28, r: 3.2, fill: C.paper, opacity: 0.1 }, pat);
      rect(root, 0, 0, 1920, 1080, 0, `url(#${id})`);
      rect(root, 120, FLOOR, 1680, 8, 0, C.paper);

      const defs2 = (pr.stacks && pr.stacks.length ? pr.stacks : [{ label: '', value: 10, unit: '', color: 'white' }]).slice(0, 4);
      const n = defs2.length;
      const vals = defs2.map((s) => Math.max(0, Math.round(s.value || 0)));
      const maxVis = Math.max(1, Math.min(MAXVIS, Math.max.apply(null, vals)));
      st.pitch = clamp(540 / maxVis, 8, 24);
      const hasRight = !!(pr.diff || ZV.cue(shot, 'total') != null);
      const xs = n === 1 ? [hasRight ? 600 : 960] : n === 2 ? [520, 980] : n === 3 ? [400, 800, 1200] : [300, 620, 940, 1260];
      // repères de croissance : grow-1, grow-2…
      const growT = defs2.map((s, i) => Z0(ZV.cue(shot, 'grow-' + (i + 1)), i * 0.8));
      const evT = ['grow-1', 'grow-2', 'grow-3', 'grow-4', 'total', 'diff'].map((k) => ZV.cue(shot, k)).filter((x) => x != null);
      st.stacks = defs2.map((s, i) => {
        const val = vals[i];
        const vis = Math.min(val, MAXVIS);
        const start = growT[i];
        const next = evT.filter((x) => x > start + 0.01).sort((a, b) => a - b)[0];
        const D = clamp(Math.min(vis * 0.07, (next == null ? 3 : next - start) - 0.06), 0.3, 3.0);
        const grp = g(root);
        const col = colorOf(s.color), acc = accentOf(s.color);
        // ombre dure d'ensemble
        const shadow = rect(grp, -CW / 2 + 10, -10, CW, 1, 4, '#2A2A2A');
        const chips = [];
        const cg = g(grp);
        for (let k = 0; k < vis; k++) {
          const c = g(cg);
          rect(c, -CW / 2, -(k + 1) * st.pitch, CW, st.pitch, 3, col, INK, 3.5);
          const sh = Math.max(3, st.pitch - 8);
          for (let q = -1; q <= 1; q++) rect(c, q * 66 - 12, -(k + 1) * st.pitch + (st.pitch - sh) / 2, 24, sh, 2, acc);
          chips.push(c);
        }
        let zig = null;
        if (val > MAXVIS) {
          zig = sv('path', { d: `M -118 ${f2(-20 * st.pitch + 5)} l 17 -14 l 17 14 l 17 -14 l 17 14 l 17 -14 l 17 14 l 17 -14 l 17 14 l 17 -14 l 17 14 l 17 -14 l 17 14 V ${f2(-20 * st.pitch - 20)} H -118 Z`, fill: INK, stroke: C.paper, 'stroke-width': 4 }, grp);
        }
        // compteur Mono au-dessus
        const cnt = text(grp, '', 0, 0, 92, C.paper, { mono: 1, anchor: 'middle' });
        // étiquette sticker inclinée sous le sol
        const lab = g(root);
        const L = (s.label || '');
        const lines = L.indexOf(' : ') > 0 ? [L.slice(0, L.indexOf(' : ') + 2), L.slice(L.indexOf(' : ') + 3)] : [L];
        const lsz = lines.length > 1 ? 36 : 46;
        const w = Math.max.apply(null, lines.map((l) => meas(root, l, lsz, true))) + 44, h = lines.length > 1 ? 108 : 76;
        if (L) {
          ZV.sticker(lab, Math.min(w, 440), h, C.paper, null, lsz, INK, { sh: 8, r: 14, sw: 5 });
          lines.forEach((l, k) => text(lab, l, 0, (lines.length > 1 ? -4 : 15) + k * 40, lsz, INK, { mono: 1, anchor: 'middle', len: Math.min(meas(root, l, lsz, true), 440 - 44) }));
        }
        return { grp, x: xs[i], val, vis, start, D, chips, cnt, shadow, lab, col, acc, unit: s.unit || '', tilt: i % 2 ? 2.5 : -2.5, hasLabel: !!L, zig };
      });
      // écart / total
      st.diffDef = pr.diff || null;
      st.tDiff = ZV.cue(shot, 'diff');
      const totalBeat = shot.beats.find((b) => b.do === 'cue' && b.name === 'total');
      st.tTotal = totalBeat ? totalBeat.t : null;
      st.totalText = totalBeat && totalBeat.text ? totalBeat.text : '';
      if (st.totalText) {
        const w = meas(root, st.totalText, 190, false);
        st.total = text(root, st.totalText, 1460 - w / 2, 480, 190, C.lime, { len: w });
        st.totalW = w;
      }
      if (st.diffDef && n >= 2) {
        const a = st.stacks[0], b = st.stacks[1];
        const short = a.val <= b.val ? a : b;
        const idx = a.val <= b.val ? 0 : 1;
        const gap = Math.abs(a.val - b.val);
        const dc = st.diffDef.color === 'lime' ? C.lime : C.red;
        const ds = g(root);
        st.diff = { short, gap, ds, slots: [], fills: [], idx };
        for (let k = 0; k < gap; k++) {
          const y = -(short.vis + k + 1) * st.pitch;
          const gs = g(ds, { transform: `translate(${short.x} ${FLOOR})` });
          const dr = sv('rect', { x: -CW / 2, y, width: CW, height: st.pitch, rx: 3, fill: 'none', stroke: C.paper, 'stroke-width': 4, 'stroke-dasharray': '12 9' }, gs);
          const fl = g(gs);
          rect(fl, -CW / 2, y, CW, st.pitch, 3, dc, INK, 4);
          for (let q = -1; q <= 1; q++) rect(fl, q * 66 - 12, y + (st.pitch - Math.max(3, st.pitch - 8)) / 2, 24, Math.max(3, st.pitch - 8), 2, C.white);
          st.diff.slots.push(dr); st.diff.fills.push(fl);
        }
        // sticker de l'écart
        const sz = 70, w = meas(root, st.diffDef.text || '', sz, false) + 64;
        const sg = g(root);
        ZV.sticker(sg, w, 112, dc, null, sz, st.diffDef.color === 'lime' ? INK : INK, { sh: 10 });
        text(sg, st.diffDef.text || '', 0, 25, sz, INK, { anchor: 'middle', len: w - 64 });
        st.diff.sg = sg; st.diff.w = w;
        const slotTopY = FLOOR - (short.vis + gap / 2) * st.pitch;
        // à droite de la pile la plus courte si elle est la dernière, sinon à gauche
        const right = idx === n - 1 || idx === 1;
        st.diff.sx = short.x + (right ? 1 : -1) * (CW / 2 + 40 + w / 2);
        st.diff.sy = Math.max(190, Math.min(slotTopY, 560));
        st.diff.right = right;
        // trait de rappel
        st.diff.leader = rect(root, 0, 0, 40, 8, 0, dc);
      }
      return st;
    },
    update(st, t, shot) {
      try {
        const P = st.pitch;
        st.stacks.forEach((s) => {
          const p = prog(t, s.start, s.start + s.D);
          const cnt = t < s.start ? 0 : Math.min(s.vis, Math.floor(s.vis * Math.pow(p, 1.6) + 1e-9));
          const shown = t >= s.start;
          put(s.grp, s.x, FLOOR, 0, 1, 1, shown ? 1 : 0);
          for (let k = 0; k < s.vis; k++) {
            const on = k < cnt;
            const c = s.chips[k];
            if (!on) { c.setAttribute('visibility', 'hidden'); continue; }
            // « tac » de chaque jeton qui se pose : il tombe de 26 px
            const tk = s.start + s.D * Math.pow(k / Math.max(1, s.vis), 1 / 1.6);
            const q = prog(t, tk, tk + 0.1);
            const dy = -26 * (1 - E.out2(q)) * (k === cnt - 1 ? 1 : 0);
            c.setAttribute('transform', `translate(0 ${f2(dy)})`);
            c.setAttribute('visibility', 'visible');
          }
          if (s.zig) show(s.zig, cnt >= 22);
          const hgt = cnt * P;
          s.shadow.setAttribute('y', f2(-hgt - 0));
          s.shadow.setAttribute('height', f2(Math.max(hgt + 10, 1)));
          const top = -hgt - 22 - (st.diff && st.diff.short === s ? st.diff.gap * P : 0);
          const shownVal = t < s.start ? 0 : Math.round(s.val * Math.min(1, Math.pow(p, 1.6)));
          s.cnt.textContent = shownVal + s.unit;
          s.cnt.setAttribute('y', f2(top));
          s.cnt.setAttribute('visibility', shown && cnt > 0 ? 'visible' : 'hidden');
          const lp = popE(prog(t, s.start + 0.08, s.start + 0.4));
          if (s.hasLabel) put(s.lab, s.x, FLOOR + 80, s.tilt, lp, lp, shown ? 1 : 0);
        });
        // total « = 36 € »
        if (st.total) {
          const k = popE(prog(t, st.tTotal, st.tTotal + 0.28));
          st.total.setAttribute('transform', `translate(${f2(1460)} ${f2(480)}) scale(${f2(Math.max(k, 0.001))}) translate(${f2(-1460)} ${f2(-480)})`);
          st.total.setAttribute('visibility', t >= st.tTotal ? 'visible' : 'hidden');
        }
        // écart : place des jetons manquants en pointillés puis remplie de couleur + sticker
        if (st.diff && st.tDiff != null) {
          const d = st.diff;
          const td = st.tDiff;
          d.slots.forEach((r, k) => {
            const q = popE(prog(t, td + k * 0.05, td + k * 0.05 + 0.2));
            r.setAttribute('opacity', f2(q > 0 ? 1 : 0));
            r.setAttribute('visibility', t >= td && t < td + 0.45 ? 'visible' : 'hidden');
          });
          d.fills.forEach((f, k) => {
            const q = popE(prog(t, td + 0.45 + k * 0.05, td + 0.45 + k * 0.05 + 0.22));
            f.setAttribute('transform', `translate(0 ${f2(-20 * (1 - Math.min(1, q)))})`);
            f.setAttribute('visibility', t >= td + 0.45 ? 'visible' : 'hidden');
          });
          const k = popE(prog(t, td + 0.5, td + 0.8));
          put(d.sg, d.sx, d.sy, d.right ? 4 : -4, k, k, t >= td + 0.5 ? 1 : 0);
          // trait de rappel du sticker vers l'emplacement
          const ex = d.short.x + (d.right ? 1 : -1) * (CW / 2 + 4), len = Math.abs(d.sx - (d.w / 2) * (d.right ? 1 : -1) - ex);
          const lx = d.right ? ex : ex - len;
          d.leader.setAttribute('x', f2(lx)); d.leader.setAttribute('y', f2(d.sy - 4)); d.leader.setAttribute('width', f2(Math.max(0, len)));
          d.leader.setAttribute('visibility', t >= td + 0.5 ? 'visible' : 'hidden');
        }
      } catch (e) { if (window.ZV_DEBUG) console.error(e); }
    }
  });
})();
