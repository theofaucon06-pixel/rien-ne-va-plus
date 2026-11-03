// Composant `no-lose-loop` (épisode 3) : le piège logique, un schéma qui ne peut pas donner tort.
// MON SYSTÈME → JE GAGNE → LE SYSTÈME MARCHE ; MON SYSTÈME → JE PERDS → JE M'ÉTAIS EMBALLÉ → le MÊME « LE SYSTÈME MARCHE ». Voir EP3-COMPONENTS.md.
// Fonction pure du temps ; flèches plates épaisses ink / lime / red ; aucun dégradé / flou / filter.
// Cues : system, win, lose, excuse, works, verdict.
(() => {
  'use strict';
  const { C, E, clamp, prog, lerp, f2, sv, g, rect, circle, path, text, put, shakeAt } = ZV;
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const bw = (s, size) => { let a = 0; for (const ch of String(s)) a += size * (ch === ' ' ? 0.26 : /[0-9]/.test(ch) ? 0.6 : /[A-ZÀÂÉÈÊÎÔÛÇ€%+×≈−]/.test(ch) ? 0.66 : /[.,:;'’!|]/.test(ch) ? 0.3 : 0.56); return a; };
  const str = (v, d) => (typeof v === 'string' && v.length ? v : d);

  const YT = 175, YC = 380, YB = 575;                                           // rangées : haut, centre, bas
  const XS = 230, XW = 700, XL = 700, XE = 1290, XK = 1650;                     // colonnes : système, gagne/perds, excuse, marche
  const NODE = {
    sys: { x: XS, y: YC, w: 340, h: 170 }, win: { x: XW, y: YT, w: 330, h: 110 }, lose: { x: XL, y: YB, w: 330, h: 110 },
    exc: { x: XE, y: YB, w: 540, h: 110 }, works: { x: XK, y: YC, w: 460, h: 200 }
  };

  // met un libellé sur 1 ou 2 lignes dans la largeur `maxW` ; renvoie { lines, size }
  function fit(s, size, maxW, two) {
    const one = bw(s, size);
    const sp = [];
    for (let i = 0; i < s.length; i++) if (s[i] === ' ') sp.push(i);
    if (!sp.length || (!two && one <= maxW)) return { lines: [s], size: Math.min(size, size * maxW / Math.max(1, one)) };
    let best = sp[0], bd = 1e9;
    for (const i of sp) { const d = Math.abs(bw(s.slice(0, i), size) - bw(s.slice(i + 1), size)); if (d < bd) { bd = d; best = i; } }
    const a = s.slice(0, best), b = s.slice(best + 1);
    const m = Math.max(bw(a, size), bw(b, size));
    return { lines: [a, b], size: Math.min(size, size * maxW / Math.max(1, m)) };
  }

  function mkNode(parent, n, fill, textFill, label, size, o) {
    o = o || {};
    const d = { n };
    d.g = g(parent);
    rect(d.g, -n.w / 2 + 10, -n.h / 2 + 10, n.w, n.h, 16, C.ink);
    rect(d.g, -n.w / 2, -n.h / 2, n.w, n.h, 16, fill, C.ink, 7);
    const f = fit(label, size, n.w - 56, !!o.two);
    const lh = f.size * 1.05, y0 = f.lines.length === 1 ? f.size * 0.35 : -lh / 2 + f.size * 0.35;
    f.lines.forEach((ln, i) => text(d.g, ln, 0, y0 + i * lh, f.size, textFill, { anchor: 'middle', len: f2(bw(ln, f.size)) }));
    return d;
  }
  // pastille ronde : coche (ok) ou croix (non)
  function mkBadge(parent, kind, r) {
    const b = g(parent);
    circle(b, 5, 5, r, C.ink);
    circle(b, 0, 0, r, kind === 'ok' ? C.lime : C.red, C.ink, 7);
    if (kind === 'ok') path(b, `M${-r * 0.42} ${r * 0.04} L${-r * 0.1} ${r * 0.38} L${r * 0.46} ${-r * 0.36}`, 'none', C.ink, r * 0.2);
    else { path(b, `M${-r * 0.36} ${-r * 0.36} L${r * 0.36} ${r * 0.36}`, 'none', C.ink, r * 0.2); path(b, `M${r * 0.36} ${-r * 0.36} L${-r * 0.36} ${r * 0.36}`, 'none', C.ink, r * 0.2); }
    return b;
  }
  // flèche plate épaisse : tracé (pathLength 1) + pointe ; pts = [[x,y],…], tip = [x,y], ang = direction de la pointe (deg)
  function mkArrow(parent, pts, color, tip, ang) {
    const d = 'M' + pts.map((p) => p[0] + ' ' + p[1]).join(' L');
    const a = { color };
    const common = { d, fill: 'none', pathLength: 1, 'stroke-linejoin': 'round', 'stroke-linecap': 'butt', visibility: 'hidden' };
    a.out = sv('path', Object.assign({ stroke: C.ink, 'stroke-width': 34 }, common), parent);
    a.fill = sv('path', Object.assign({ stroke: color, 'stroke-width': color === C.ink ? 22 : 17 }, common), parent);
    a.head = g(parent, { visibility: 'hidden' });
    path(a.head, 'M0 0 L-36 -32 L-36 32Z', color, C.ink, 7);
    a.tip = tip; a.ang = ang;
    return a;
  }

  ZV.define('no-lose-loop', {
    init(root, shot) {
      const P = shot.props || {};
      const beats = Array.isArray(shot.beats) ? shot.beats : [];
      const dur = isNum(shot.dur) && shot.dur > 0 ? shot.dur : 8;
      const cue = (n) => { const b = beats.filter((x) => x && x.do === 'cue' && x.name === n && isNum(x.t)).map((x) => x.t).sort((a, b2) => a - b2); return b.length ? b[0] : null; };
      const st = { dur };
      let T = { system: cue('system'), win: cue('win'), lose: cue('lose'), excuse: cue('excuse'), works: cue('works'), verdict: cue('verdict') };
      const all = Object.values(T);
      if (all.every((x) => x == null)) T = { system: 0.3, win: 1.4, lose: 3.2, excuse: 4.6, works: 6.0, verdict: 7.6 };
      else {
        const others = [T.win, T.lose, T.excuse, T.works].filter((x) => x != null);
        if (T.system == null && others.length) T.system = Math.max(0, Math.min(...others) - 0.4);   // le point de départ précède toujours ses branches
        if (T.lose == null && T.excuse != null) T.lose = Math.max(0, T.excuse - 0.8);              // l'excuse suit forcément une perte
      }
      st.T = T;

      rect(root, 0, 0, 1920, 1080, 0, C.paper);
      const bgs = g(root, { transform: 'rotate(-18 960 540)' });
      for (let k = -4; k <= 4; k++) rect(bgs, 960 + k * 300 - 70, -600, 140, 2300, 0, '#E9E5D9');
      st.world = g(root);
      const W = st.world;

      /* flèches (sous les nœuds) */
      st.A = {
        win1: mkArrow(W, [[400, YC - 30], [440, YC - 30], [440, YT], [506, YT]], C.ink, [535, YT], 0),
        win2: mkArrow(W, [[870, YT], [XK, YT], [XK, 250]], C.lime, [XK, 285], 90),
        lose1: mkArrow(W, [[400, YC + 40], [480, YC + 40], [480, YB], [506, YB]], C.ink, [535, YB], 0),
        lose2: mkArrow(W, [[870, YB], [986, YB]], C.red, [1020, YB], 0),
        end: mkArrow(W, [[1565, YB], [XK, YB], [XK, 522]], C.red, [XK, 485], -90)
      };
      /* le MÊME « LE SYSTÈME MARCHE » : fantôme pointillé, puis plein */
      st.ghost = rect(W, XK - 230, YC - 100, 460, 200, 16, 'none', C.ink, 6, { 'stroke-dasharray': '18 12' });
      st.ghost.setAttribute('visibility', 'hidden');

      const nodes = {};
      nodes.sys = mkNode(W, NODE.sys, C.ink, C.lime, str(P.system, 'MON SYSTÈME'), 64, { two: true });
      nodes.win = mkNode(W, NODE.win, C.lime, C.ink, str(P.win, 'JE GAGNE'), 48);
      nodes.lose = mkNode(W, NODE.lose, C.red, C.ink, str(P.lose, 'JE PERDS'), 48);
      nodes.exc = mkNode(W, NODE.exc, C.white, C.ink, str(P.excuse, 'JE M’ÉTAIS EMBALLÉ'), 44);
      nodes.works = mkNode(W, NODE.works, C.lime, C.ink, str(P.works, 'LE SYSTÈME MARCHE'), 58, { two: true });
      st.N = nodes;
      st.bWin = mkBadge(W, 'ok', 36); st.bLose = mkBadge(W, 'no', 36); st.bWorks = mkBadge(W, 'ok', 42);

      /* verdict */
      st.verdict = g(W);
      {
        const lab = str(P.verdict, 'AUCUN RÉSULTAT NE PEUT LUI DONNER TORT'), w = 1640, h = 104, size0 = 58;
        const size = Math.min(size0, size0 * (w - 90) / Math.max(1, bw(lab, size0)));
        rect(st.verdict, -w / 2 + 12, -h / 2 + 12, w, h, 14, C.red);
        rect(st.verdict, -w / 2, -h / 2, w, h, 14, C.ink, C.ink, 7);
        text(st.verdict, lab, 0, size * 0.35, size, C.paper, { anchor: 'middle', len: f2(Math.min(bw(lab, size), w - 90)) });
      }
      return st;
    },

    update(st, t) {
      try {
        t = clamp(t, 0, st.dur + 1);
        const { T, A, N } = st;
        const ph = (t0, d) => (t0 == null ? 0 : prog(t, t0, t0 + d));
        const pop = (grp, n, t0, extra) => {
          const on = t0 != null && t >= t0;
          const p = on ? E.back(prog(t, t0, t0 + 0.3)) : 0;
          const sk = on && extra ? shakeAt(t, t0 + 0.25, extra, 0.35) : [0, 0];
          put(grp, n.x + sk[0], n.y + sk[1], 0, Math.max(p, 0), Math.max(p, 0), on ? 1 : 0);
        };
        const arrow = (a, t0, d) => {
          const p = t0 == null ? 0 : E.io2(prog(t, t0, t0 + d));
          const on = p > 0;
          for (const n of [a.out, a.fill]) { setA(n, 'visibility', on ? 'visible' : 'hidden'); setA(n, 'stroke-dasharray', p >= 1 ? '1.01 1.01' : `${f2(p)} 1.01`); }
          const hp = t0 == null ? 0 : E.back(prog(t, t0 + d * 0.8, t0 + d + 0.15));
          setA(a.head, 'visibility', hp > 0 ? 'visible' : 'hidden');
          setA(a.head, 'transform', `translate(${a.tip[0]} ${a.tip[1]}) rotate(${a.ang}) scale(${f2(Math.max(hp, 0.01))})`);
        };

        /* secousse du « marche » */
        const tW = T.works;
        const tEnd = T.excuse != null && tW != null ? Math.max(tW, T.excuse + 0.6) : null;   // la flèche du bas arrive après l'excuse
        const tWf = tW != null ? tW + 0.35 : null;                                             // le nœud claque quand les flèches arrivent

        pop(N.sys.g, NODE.sys, T.system);
        arrow(A.win1, T.win, 0.4);
        pop(N.win.g, NODE.win, T.win != null ? T.win + 0.35 : null);
        arrow(A.win2, T.win != null ? T.win + 0.7 : null, 0.9);
        arrow(A.lose1, T.lose, 0.4);
        pop(N.lose.g, NODE.lose, T.lose != null ? T.lose + 0.35 : null);
        arrow(A.lose2, T.excuse != null ? T.excuse : null, 0.35);
        pop(N.exc.g, NODE.exc, T.excuse != null ? T.excuse + 0.3 : null, 6);
        arrow(A.end, tEnd, 0.45);
        pop(N.works.g, NODE.works, tWf, 12);

        /* fantôme du nœud d'arrivée */
        {
          const first = [T.win, T.lose, T.excuse].filter((x) => x != null);
          const t0 = first.length ? Math.min(...first) + 0.5 : null;
          setA(st.ghost, 'visibility', t0 != null && t >= t0 && !(tWf != null && t >= tWf) ? 'visible' : 'hidden');
        }

        /* coches / croix */
        const badge = (b, x, y, t0, r) => {
          const on = t0 != null && t >= t0, p = on ? E.back(prog(t, t0, t0 + 0.28)) : 0;
          put(b, x, y, 0, Math.max(p, 0), Math.max(p, 0), on ? 1 : 0);
        };
        badge(st.bWin, NODE.win.x + NODE.win.w / 2 - 6, NODE.win.y - NODE.win.h / 2 + 2, T.win != null ? T.win + 0.7 : null);
        badge(st.bLose, NODE.lose.x + NODE.lose.w / 2 - 6, NODE.lose.y - NODE.lose.h / 2 + 2, T.lose != null ? T.lose + 0.7 : null);
        badge(st.bWorks, NODE.works.x + NODE.works.w / 2 - 16, NODE.works.y - NODE.works.h / 2 - 2, tWf != null ? tWf + 0.3 : null);

        /* verdict */
        {
          const tv = T.verdict;
          if (tv == null || t < tv) put(st.verdict, 960, 770, -1.2, 0, 0, 0);
          else {
            const p = E.out3(prog(t, tv, tv + 0.3)), sh = shakeAt(t, tv + 0.25, 8, 0.3);
            put(st.verdict, 960 + sh[0], lerp(900, 770, p) + sh[1], -1.2, 1, 1, 1);
          }
        }
      } catch (e) { /* jamais d'exception */ }
    }
  });
})();
