// Composant `strategy-chart` (épisode 5) : le tableau gratuit de la stratégie de base. Voir EP5-COMPONENTS.md.
// Grille 10 × 10 (mains dures, six paquets) : T tirer (paper), R rester (lime), D doubler (pocket bordé lime). Fonction pure du temps ; aplats seulement.
// Cues : grid, axes, free, ignored, belief, vs7, insurance. Un cue absent = l'étape ne se déclenche pas ; sans cue `grid` / `axes` le tableau est posé d'emblée.
(() => {
  'use strict';
  const { C, E, clamp, prog, lerp, f2, sv, g, rect, circle, path, line, text } = ZV;
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const str = (v, d) => (typeof v === 'string' && v.trim() ? v.trim() : d);
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const vis = (n, on) => setA(n, 'display', on ? 'inline' : 'none');
  const SH = '#2A2A2A';
  const bwEst = (s, size) => { let a = 0; for (const ch of String(s)) a += size * (ch === ' ' ? 0.28 : /[0-9]/.test(ch) ? 0.5 : /[A-ZÀÂÉÈÊÎÔÛÇ€%+×≈]/.test(ch) ? 0.66 : /[.,:;'’!|]/.test(ch) ? 0.3 : 0.56); return a; };
  let PROBE = null; const BWC = {};
  const bw = (s, size) => {
    s = String(s); const k = size + '|' + s;
    if (BWC[k] !== undefined) return BWC[k];
    if (PROBE) { try { PROBE.textContent = s; PROBE.setAttribute('font-size', size); const w = PROBE.getComputedTextLength(); if (w > 0) { BWC[k] = w; return w; } } catch (e) { /* hors DOM */ } }
    return bwEst(s, size);
  };
  const mw = (s, size) => String(s).length * size * 0.6;
  const putc = (n, x, y, r, sx, sy, o) => {
    if (r === undefined) r = 0; if (sx === undefined) sx = 1; if (sy === undefined) sy = sx; if (o === undefined) o = 1;
    const hid = o <= 0.001 || !sx || !sy;
    setA(n, 'display', hid ? 'none' : 'inline');
    if (hid) return;
    setA(n, 'transform', `translate(${f2(x)} ${f2(y)}) rotate(${f2(r)}) scale(${f2(sx)} ${f2(sy)})`);
    setA(n, 'opacity', f2(o));
  };
  const popS = (t, t0, d) => (t0 == null || t < t0 ? 0 : E.back(prog(t, t0, t0 + (d || 0.3))));
  const mlab = (parent, s, x, y, size, fill, anchor, sp) => { const n = text(parent, s, x, y, size, fill, { mono: true, anchor: anchor || 'start', len: f2(mw(s, size) + (sp ? sp * (String(s).length - 1) : 0)) }); if (sp) n.setAttribute('letter-spacing', sp); return n; };
  function mkTag(parent, lines, size, fill, tfill, o) {
    o = o || {};
    const ls = Array.isArray(lines) ? lines : [lines];
    const lh = size * 1.12, px = o.padX || 26, py = o.padY || 14;
    let tw = 0; ls.forEach((s) => { tw = Math.max(tw, bw(s, size)); });
    const w = tw + px * 2, h = ls.length * lh + py * 2 - (lh - size) * 0.2;
    const grp = g(parent);
    const sh = o.sh || 9, r = o.r === undefined ? 14 : o.r;
    rect(grp, -w / 2 + sh, -h / 2 + sh, w, h, r, o.shc || (fill === C.paper ? C.lime : C.paper));
    rect(grp, -w / 2, -h / 2, w, h, r, fill, C.ink, o.sw || 6);
    ls.forEach((s, i) => text(grp, s, 0, -h / 2 + py + size * 0.82 + i * lh, size, tfill, { anchor: 'middle', len: f2(bw(s, size)) }));
    return { g: grp, w, h };
  }
  const parsePct = (s, d) => { const m = /([0-9]+(?:[.,][0-9]+)?)/.exec(String(s)); return m ? parseFloat(m[1].replace(',', '.')) || d : d; };

  const ROWS = ['8 ET −', '9', '10', '11', '12', '13', '14', '15', '16', '17 ET +'];
  const COLS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'A'];
  const DATA = [
    'TTTTTTTTTT', 'TDDDDTTTTT', 'DDDDDDDDTT', 'DDDDDDDDDT', 'TTRRRTTTTT',
    'RRRRRTTTTT', 'RRRRRTTTTT', 'RRRRRTTTTT', 'RRRRRTTTTT', 'RRRRRRRRRR'
  ];
  const CX0 = 310, CY0 = 180, PW = 93, PH = 61, CW = 91, CH = 59;
  const cx = (c) => CX0 + c * PW + CW / 2, cy = (r) => CY0 + r * PH + CH / 2;
  const PIV = [680, 450];

  ZV.define('strategy-chart', {
    init(root, shot) {
      const P = (shot && shot.props) || {};
      const beats = Array.isArray(shot && shot.beats) ? shot.beats : [];
      const dur = isNum(shot && shot.dur) && shot.dur > 0 ? shot.dur : 10;
      const c1 = (n) => { const a = beats.filter((b) => b && b.do === 'cue' && b.name === n && isNum(b.t)).sort((a, b) => a.t - b.t)[0]; return a ? a.t : null; };
      const title = str(P.title, 'LA STRATÉGIE DE BASE');
      const edge = str(P.edge, '≈ 0,5 %');
      const belief = str(P.belief, 'JE NE TIRE JAMAIS SUR 16');
      const insurance = str(P.insurance, '≈ 7,4 %');
      const ratio = str(P.ratio, 'PRÈS DE 15 ×');
      const st = { dur };
      PROBE = text(root, '', 0, -500, 100, 'none'); PROBE.setAttribute('visibility', 'hidden');
      st.T = { grid: c1('grid'), axes: c1('axes'), free: c1('free'), ignored: c1('ignored'), belief: c1('belief'), vs7: c1('vs7'), insurance: c1('insurance') };
      const T = st.T;
      st.pa = parsePct(edge, 0.5); st.pb = parsePct(insurance, 7.4);

      rect(root, 0, 0, 1920, 1080, 0, C.ink);
      const bgs = g(root, { transform: 'rotate(-18 960 540)' });
      for (let k = -4; k <= 4; k++) rect(bgs, 960 + k * 300 - 60, -600, 120, 2300, 0, C.pocket);
      text(root, title, 120, 62, 40, C.paper, { len: f2(bw(title, 40)) });

      /* ---- groupe du tableau (s'incline à `ignored`) ---- */
      st.G = g(root);
      const G = st.G;
      st.cells = [];
      for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) {
        const L = DATA[r][c];
        const n = g(G);
        if (L === 'T') { rect(n, -CW / 2, -CH / 2, CW, CH, 4, C.paper); text(n, 'T', 0, 13, 36, C.ink, { anchor: 'middle', len: f2(bw('T', 36)) }); }
        else if (L === 'R') { rect(n, -CW / 2, -CH / 2, CW, CH, 4, C.lime); text(n, 'R', 0, 13, 36, C.ink, { anchor: 'middle', len: f2(bw('R', 36)) }); }
        else { rect(n, -CW / 2 + 1.5, -CH / 2 + 1.5, CW - 3, CH - 3, 4, C.pocket, C.lime, 3); text(n, 'D', 0, 13, 36, C.lime, { anchor: 'middle', len: f2(bw('D', 36)) }); }
        st.cells.push({ n, r, c, x: cx(c), y: cy(r) });
      }
      st.rh = ROWS.map((s, r) => { const n = text(G, s, 290, cy(r) + 12, 34, C.paper, { mono: true, anchor: 'end', len: f2(mw(s, 34)) }); return n; });
      st.ch = COLS.map((s, c) => { const n = g(G); text(n, s, 0, 0, 34, C.paper, { mono: true, anchor: 'middle', len: f2(mw(s, 34)) }); return n; });
      st.axH = mlab(G, 'CARTE DU CROUPIER', 775, 98, 26, C.paper, 'middle', 4);
      st.axV = g(G); { const t = mlab(st.axV, 'TA MAIN', 0, 0, 26, C.paper, 'middle', 4); }
      st.ring = rect(G, 106, CY0 + 8 * PH - 5, 1138, CH + 10, 28, 'none', C.paper, 6);
      st.col7 = rect(G, CX0 + 5 * PW - 4, 104, CW + 8, 692, 8, 'none', C.lime, 6);
      st.veil = rect(G, 40, 90, 1220, 716, 0, C.ink);
      st.ignTag = mkTag(root, 'PRESQUE PERSONNE NE LE SUIT', 46, C.paper, C.ink, { sh: 9 });

      /* ---- panneau de droite ---- */
      st.legend = g(root);
      [['T', C.paper, 'TIRER', null], ['R', C.lime, 'RESTER', null], ['D', C.pocket, 'DOUBLER', C.lime]].forEach((o, i) => {
        const y = 262 + i * 50;
        rect(st.legend, 1400, y, 44, 40, 4, o[1], o[3] || C.ink, o[3] ? 3 : 4);
        text(st.legend, o[2], 1462, y + 33, 40, C.paper, { len: f2(bw(o[2], 40)) });
      });
      mlab(st.legend, '+ SÉPARER : TABLEAU DES PAIRES', 1400, 424, 22, C.paper);
      st.grat = mkTag(root, 'GRATUIT', 48, C.lime, C.ink, { sh: 9 });
      st.card = g(root);
      rect(st.card, 1350, 566, 490, 230, 14, C.lime);
      rect(st.card, 1340, 556, 490, 230, 14, C.paper, C.ink, 7);
      mlab(st.card, 'AVANTAGE MAISON', 1372, 608, 28, C.ink);
      st.edgeT = text(st.card, edge, 1372, 748, 120, C.red, { len: f2(Math.min(bw(edge, 120), 430)) });

      st.bubble = g(root);
      {
        const ls = bw(belief, 44) > 430 ? (() => { const w = belief.split(' '); let best = null; for (let k = 1; k < w.length; k++) { const a = w.slice(0, k).join(' '), b = w.slice(k).join(' '); const m = Math.max(bw(a, 44), bw(b, 44)); if (!best || m < best.m) best = { a, b, m }; } return best ? [best.a, best.b] : [belief]; })() : [belief];
        const w = 500, h = ls.length * 52 + 36;
        const x0 = 1830 - w, y0 = 100;
        path(st.bubble, `M${x0 + 16} ${y0 + h - 4} L${x0 + 56} ${y0 + h - 4} L1250 690 Z`, C.paper, C.ink, 8);
        rect(st.bubble, x0 + 10, y0 + 10, w, h, 18, SH);
        rect(st.bubble, x0, y0, w, h, 18, C.paper, C.ink, 8);
        // le recouvrement du trait de la queue sur la bulle
        rect(st.bubble, x0 + 12, y0 + h - 8, 48, 14, 0, C.paper);
        ls.forEach((s, i) => text(st.bubble, s, x0 + w / 2, y0 + 52 + i * 52, 44, C.ink, { anchor: 'middle', len: f2(bw(s, 44)) }));
        st.bubStrike = line(st.bubble, x0 + 16, y0 + h / 2 + 4, x0 + w - 16, y0 + h / 2 - 12, C.red, 12);
        st.bubStrike.setAttribute('stroke-linecap', 'butt');
        st.bubW = w; st.bubH = h;
      }

      /* ---- zoom 16 × 7 ---- */
      st.zoom = g(root);
      rect(st.zoom, -125 + 10, -78 + 10, 250, 156, 10, SH);
      rect(st.zoom, -125, -78, 250, 156, 10, C.paper, C.ink, 8);
      text(st.zoom, 'T', 0, 18, 100, C.ink, { anchor: 'middle', len: f2(bw('T', 100)) });
      mlab(st.zoom, 'TIRER', 0, 62, 34, C.ink, 'middle');

      /* ---- panneau assurance ---- */
      st.ins = g(root);
      rect(st.ins, 1310, 130, 540, 600, 12, SH);
      rect(st.ins, 1300, 120, 540, 600, 12, C.paper, C.ink, 8);
      text(st.ins, 'ASSURANCE', 1340, 196, 64, C.ink, { len: f2(bw('ASSURANCE', 64)) });
      const SC = 420 / Math.max(st.pa, st.pb);
      const rows = [[edge, 'LA STRATÉGIE DE BASE', st.pa, 215], [insurance, 'L\'ASSURANCE', st.pb, 490]];
      st.insBars = rows.map((r) => {
        const y0 = r[3];
        text(st.ins, r[0], 1340, y0 + 60, 64, C.red, { len: f2(Math.min(bw(r[0], 64), 440)) });
        mlab(st.ins, r[1], 1340, y0 + 92, 22, C.ink);
        const w = Math.max(14, r[2] * SC);
        rect(st.ins, 1340, y0 + 112, 440, 46, 4, 'none', C.ink, 3);
        const b = rect(st.ins, 1340, y0 + 112, w, 46, 4, C.red, C.ink, 5);
        return { b, w };
      });
      st.insTag = mkTag(st.ins, ratio, 44, C.lime, C.ink, { sh: 8 });
      st.insTag.g.setAttribute('transform', 'translate(1570 438) rotate(-3)');
      PROBE.parentNode.removeChild(PROBE); PROBE = null;
      return st;
    },

    update(st, t) {
      try {
        t = clamp(t, 0, st.dur + 1);
        const T = st.T;
        const noGrid = T.grid == null, noAx = T.axes == null;

        /* grille : vague diagonale depuis le coin haut gauche (1,2 s, back-ease) */
        for (const c of st.cells) {
          let s = 1;
          if (!noGrid) { const t0 = T.grid + ((c.r + c.c) / 18) * 0.85; s = t < t0 ? 0 : E.back(prog(t, t0, t0 + 0.35)); }
          putc(c.n, c.x, c.y, 0, s, s, s > 0 ? 1 : 0);
        }
        st.rh.forEach((n, r) => { const p = noGrid ? 1 : E.out3(prog(t, T.grid + r * 0.07, T.grid + r * 0.07 + 0.3)); setA(n, 'opacity', f2(p)); vis(n, p > 0.001); });
        st.ch.forEach((n, c) => { const p = noGrid ? 1 : E.out3(prog(t, T.grid + c * 0.07, T.grid + c * 0.07 + 0.3)); putc(n, cx(c), 160 + (1 - p) * 20, 0, 1, 1, p); });
        // axes + légende
        const pa = noAx ? 1 : E.out3(prog(t, T.axes, T.axes + 0.4));
        setA(st.axH, 'opacity', f2(pa)); vis(st.axH, pa > 0.001);
        putc(st.axV, 78, 485, -90, 1, 1, pa);
        const lg = noAx ? 1 : E.out3(prog(t, T.axes + 0.2, T.axes + 0.6));
        const insOn = T.insurance != null && t >= T.insurance + 0.1;
        putc(st.legend, 0, 0, 0, 1, 1, insOn ? 0 : lg);
        setA(st.legend, 'transform', `translate(${f2((1 - lg) * 60)} 0)`);

        /* free */
        const fg = T.free;
        putc(st.grat.g, 1500, 494, -4, popS(t, fg), popS(t, fg), fg != null && t >= fg && !insOn ? 1 : 0);
        const fc = fg == null ? 0 : E.back(prog(t, fg + 0.45, fg + 0.85));
        putc(st.card, 0, 0, 0, 1, 1, fg != null && t >= fg + 0.45 && !insOn ? 1 : 0);
        setA(st.card, 'transform', `translate(0 ${f2((1 - Math.min(1, fc)) * 60)})`);

        /* ignored : voile + inclinaison, relevés au cue suivant */
        let tEnd = null;
        if (T.ignored != null) for (const k of ['belief', 'vs7', 'insurance']) if (T[k] != null && T[k] > T.ignored && (tEnd == null || T[k] < tEnd)) tEnd = T[k];
        let ign = 0;
        if (T.ignored != null && t >= T.ignored) ign = tEnd != null && t >= tEnd ? 1 - E.io2(prog(t, tEnd, tEnd + 0.35)) : E.out3(prog(t, T.ignored, T.ignored + 0.4));
        setA(st.G, 'transform', `rotate(${f2(-4 * ign)} ${PIV[0]} ${PIV[1]})`);
        setA(st.veil, 'opacity', f2(0.62 * ign)); vis(st.veil, ign > 0.001);
        const igT = T.ignored != null && t >= T.ignored + 0.15 ? clamp(ign * 1.2) : 0;
        putc(st.ignTag.g, PIV[0], PIV[1], -2, popS(t, T.ignored == null ? null : T.ignored + 0.15) * (tEnd != null && t >= tEnd ? 1 - prog(t, tEnd, tEnd + 0.2) : 1), undefined, igT > 0 ? 1 : 0);

        /* belief : la ligne 16 cerclée, bulle en haut à droite */
        const tb = T.belief;
        const bOn = tb != null && t >= tb && !insOn;
        const rp = tb == null ? 0 : E.out3(prog(t, tb, tb + 0.4));
        vis(st.ring, rp > 0.001);
        if (rp > 0.001) { setA(st.ring, 'stroke-dasharray', `${f2(2400 * rp)} 3000`); }
        const bp = popS(t, tb == null ? null : tb + 0.25);
        putc(st.bubble, 0, 0, 0, 1, 1, bOn && bp > 0 ? 1 : 0);
        if (bOn) setA(st.bubble, 'transform', `translate(${f2((1 - Math.min(1, bp)) * 40)} 0)`);
        const bs = T.vs7 == null ? 0 : prog(t, T.vs7 + 0.7, T.vs7 + 1.0);
        vis(st.bubStrike, bs > 0.001);
        if (bs > 0.001) setA(st.bubStrike, 'stroke-dasharray', `${f2(bs * 520)} 600`);

        /* vs7 : colonne 7 surlignée, cellule 16 × 7 agrandie */
        const t7 = T.vs7;
        const cp = t7 == null ? 0 : E.out3(prog(t, t7, t7 + 0.4));
        vis(st.col7, cp > 0.001);
        if (cp > 0.001) { setA(st.col7, 'stroke-dasharray', `${f2(1500 * cp)} 3000`); }
        const zp = t7 == null ? 0 : E.back(prog(t, t7 + 0.4, t7 + 0.85));
        const zs = lerp(0.4167, 1, Math.min(1, zp));
        // la cellule zoomée vit dans le repère du tableau (le tableau est à plat à ce moment-là)
        putc(st.zoom, cx(5), cy(8), 0, zs, zs, t7 != null && t >= t7 + 0.4 ? 1 : 0);

        /* assurance */
        const ti = T.insurance;
        const ip = ti == null ? 0 : E.out3(prog(t, ti, ti + 0.45));
        vis(st.ins, ip > 0.001);
        if (ip > 0.001) {
          setA(st.ins, 'transform', `translate(${f2((1 - ip) * 620)} 0)`);
          st.insBars.forEach((b, i) => { const q = E.out3(prog(t, ti + 0.5 + i * 0.5, ti + 1.0 + i * 0.5)); setA(b.b, 'width', f2(Math.max(0.01, b.w * q))); vis(b.b, q > 0.001); });
          const sp = popS(t, ti + 1.0);
          putc(st.insTag.g, 1570, 438, -3, sp, sp, sp > 0 ? 1 : 0);
        }
      } catch (e) { /* jamais d'exception */ }
    }
  });
})();
