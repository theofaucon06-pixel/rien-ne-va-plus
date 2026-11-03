// Composant `red-carpet` (épisode 7) : le tapis rouge déroulé, les cadeaux posés le long, et la case verte au bout. Voir EP7-COMPONENTS.md.
// Cues : unroll, g1…g6 (cadeaux), long (serpentin), compare (deux bandes + virgule), end (le tapis finit devant la case verte).
// Fonction pure du temps ; aplats, aucun dégradé / flou / filter ; aucune marque.
(() => {
  'use strict';
  const { C, E, clamp, prog, lerp, f2, sv, g, rect, circle, path, line, text, shakeAt } = ZV;
  const NB = ' ';
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const num = (v, d) => (v != null && v !== '' && isFinite(+v) ? +v : d);
  const str = (v, d) => (typeof v === 'string' ? v : v == null ? d : String(v));
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const vis = (n, on) => setA(n, 'visibility', on ? 'visible' : 'hidden');
  const BW = { '0': .67, '1': .36, '2': .61, '3': .61, '4': .64, '5': .62, '6': .66, '7': .52, '8': .66, '9': .66, A: .71, B: .69, C: .69, D: .71, E: .63, F: .6, G: .73, H: .73, I: .3, J: .38, K: .7, L: .51, M: .96, N: .79, O: .73, P: .65, Q: .73, R: .69, S: .66, T: .58, U: .73, V: .68, W: 1, X: .72, Y: .66, Z: .58, 'À': .71, 'Â': .71, 'É': .63, 'È': .63, 'Ê': .63, 'Ë': .63, 'Î': .3, 'Ï': .3, 'Ô': .73, 'Û': .73, 'Ù': .73, 'Ç': .69, 'Œ': 1, ' ': .22, ' ': .22, ' ': .22, ',': .21, '.': .25, ':': .26, ';': .24, "'": .19, '’': .22, '!': .3, '?': .43, '|': .28, '%': .99, '€': .75, '≈': .55, '×': .53, '−': .53, '+': .53, '→': 1, '·': .25, '(': .33, ')': .33, '-': .36, '/': .37, '"': .38, '–': .55 };
  const bw = (s, z) => { let a = 0; for (const ch of String(s)) { const w = BW[ch]; a += z * (w !== undefined ? w : ch >= 'a' && ch <= 'z' ? 0.6 : 0.7); } return a; };
  const mw = (s, z) => Array.from(String(s)).length * z * 0.6;
  const fitSize = (s, z, maxW) => Math.min(z, z * maxW / Math.max(1, bw(s, z)));
  const fitMono = (s, z, maxW) => Math.min(z, z * maxW / Math.max(1, mw(s, z)));
  const BT = (p, s, x, y, z, fill, o) => text(p, s, x, y, z, fill, Object.assign({ len: f2(bw(s, z)) }, o || {}));
  const MT = (p, s, x, y, z, fill, o) => text(p, s, x, y, z, fill, Object.assign({ mono: true, len: f2(mw(s, z)) }, o || {}));
  const pop = (t, t0, d) => (t < t0 ? 0 : E.back(prog(t, t0, t0 + (d || 0.25))));
  const sc = (s) => Math.max(0.001, s);
  const TR = (x, y, s, r) => `translate(${f2(x)} ${f2(y)})${r ? ` rotate(${f2(r)})` : ''} scale(${f2(sc(s))})`;

  /* ---- pictos plats (centrés sur 0,0, ±75) ; dernier champ : 0 = sans trait, chaîne = couleur du trait (défaut ink) ---- */
  const PIC = {
    glass: [['p', 'M -44 -66 L 44 -66 Q 44 2 0 12 Q -44 2 -44 -66 Z', C.white], ['p', 'M -38 -34 L 38 -34 Q 35 -5 0 5 Q -35 -5 -38 -34 Z', C.paper, 0], ['r', -8, 10, 16, 46, 0, C.paper], ['r', -40, 54, 80, 16, 8, C.paper]],
    plate: [['c', 0, 4, 46, C.white], ['c', 0, 4, 28, C.paper], ['r', -76, -58, 22, 40, 6, C.white], ['r', -72, -22, 14, 74, 6, C.white], ['p', 'M 60 -58 Q 76 -40 72 -14 L 72 -10 L 60 -10 Z', C.white], ['r', 60, -14, 12, 66, 5, C.white]],
    key: [['c', -34, -10, 32, C.white], ['c', -34, -10, 11, C.ink, 0], ['r', -4, -20, 76, 20, 4, C.white], ['r', 40, -4, 12, 24, 2, C.white], ['r', 22, -4, 10, 15, 2, C.white], ['r', -62, 28, 56, 40, 8, C.paper], ['c', -34, 40, 6, C.ink, 0]],
    card: [['r', -70, -46, 140, 92, 12, C.white], ['r', -70, -28, 140, 22, 0, C.ink, 0], ['r', -56, 10, 32, 24, 5, C.paper], ['r', -12, 14, 54, 7, 3, C.ink, 0], ['r', -12, 28, 36, 7, 3, C.ink, 0]],
    host: [['p', 'M -70 72 Q -70 14 -30 6 L 30 6 Q 70 14 70 72 Z', C.ink, C.paper], ['p', 'M -20 6 L 20 6 L 0 56 Z', C.white], ['c', 0, -34, 30, C.paper], ['p', 'M -28 -2 L 0 10 L -28 22 Z', C.lime], ['p', 'M 28 -2 L 0 10 L 28 22 Z', C.lime], ['c', 0, 10, 7, C.lime]],
    suite: [['r', -70, -46, 16, 106, 4, C.paper], ['r', -60, 16, 130, 32, 5, C.white], ['r', -54, -10, 42, 28, 12, C.paper], ['r', -8, 0, 78, 24, 5, C.paper], ['r', -66, 60, 12, 14, 2, C.paper], ['r', 58, 60, 12, 14, 2, C.paper]],
    jet: [['p', 'M -70 -2 L -86 -46 L -50 -16 Z', C.ink, C.paper], ['p', 'M -4 18 L 30 64 L 8 64 L -32 18 Z', C.ink, C.paper], ['p', 'M -72 6 Q -72 -14 -40 -16 L 46 -16 Q 74 -10 82 6 Q 74 22 46 22 L -50 22 Q -72 22 -72 6 Z', C.ink, C.paper], ['r', -64, 3, 134, 8, 0, C.red, 0], ['c', -34, -4, 5, C.paper, 0], ['c', -14, -4, 5, C.paper, 0], ['c', 6, -4, 5, C.paper, 0], ['c', 26, -4, 5, C.paper, 0]]
  };
  function picto(parent, kind, shadowCol) {
    const grp = g(parent), spec = PIC[kind] || PIC.card, BASE = { p: 3, r: 7, c: 5 };
    const draw = (gr, sh) => {
      for (const s of spec) {
        const base = BASE[s[0]], extra = s.length > base ? s[base] : undefined;
        const fill = sh ? shadowCol : s[base - 1], stroke = sh ? shadowCol : extra === 0 ? null : typeof extra === 'string' ? extra : C.ink;
        if (s[0] === 'p') path(gr, s[1], fill, stroke, 4);
        else if (s[0] === 'r') rect(gr, s[1], s[2], s[3], s[4], s[5], fill, stroke, 4);
        else circle(gr, s[1], s[2], s[3], fill, stroke, 4);
      }
    };
    if (shadowCol) draw(g(grp, { transform: 'translate(10 10)' }), true);
    draw(g(grp), false);
    return grp;
  }
  // bande de tapis (parallélogramme) entre x0 et x1, bord haut yT, bord bas yB, inclinaison sk ; renvoie les nœuds à mettre à jour
  function mkStrip(parent, yT, yB, sk, lis) {
    const o = { yT, yB, sk };
    o.poly = path(parent, '', C.red);
    o.top = line(parent, 0, yT, 0, yT, C.paper, lis, { 'stroke-linecap': 'butt' });
    o.bot = line(parent, 0, yB, 0, yB, C.paper, lis, { 'stroke-linecap': 'butt' });
    return o;
  }
  function setStrip(o, x0, x1, show) {
    vis(o.poly, show); vis(o.top, show); vis(o.bot, show);
    if (!show) return;
    setA(o.poly, 'd', `M ${f2(x0 + o.sk)} ${o.yT} L ${f2(x1 + o.sk)} ${o.yT} L ${f2(x1)} ${o.yB} L ${f2(x0)} ${o.yB} Z`);
    setA(o.top, 'x1', f2(x0 + o.sk)); setA(o.top, 'x2', f2(x1 + o.sk));
    setA(o.bot, 'x1', f2(x0)); setA(o.bot, 'x2', f2(x1));
  }

  ZV.define('red-carpet', {
    init(root, shot) {
      const P = shot.props || {};
      const beats = Array.isArray(shot.beats) ? shot.beats : [];
      const dur = isNum(shot.dur) && shot.dur > 0 ? shot.dur : 12;
      const cl = (n) => beats.filter((b) => b && b.do === 'cue' && b.name === n && isNum(b.t)).map((b) => b.t).sort((a, b) => a - b);
      const dflt = [{ cue: 'g1', icon: 'glass', label: 'LE VERRE' }, { cue: 'g2', icon: 'plate', label: 'LE REPAS' }, { cue: 'g3', icon: 'key', label: 'LA CHAMBRE' }, { cue: 'g4', icon: 'card', label: 'LE CRÉDIT' }];
      const icons = ['glass', 'plate', 'key', 'card', 'host', 'suite', 'jet'];
      const gifts = (Array.isArray(P.gifts) && P.gifts.length ? P.gifts : dflt).slice(0, 6).map((x, i) => {
        const o = x && typeof x === 'object' ? x : { label: str(x, '') };
        return { cue: str(o.cue, 'g' + (i + 1)), icon: icons.includes(o.icon) ? o.icon : icons[i % 4], label: str(o.label, '') };
      });
      const length = clamp(num(P.length, 0.75), 0.2, 0.95);
      const zero = P.zero !== false;
      const small = str(P.small, 'TON VERRE'), big = str(P.big, 'LEUR TAPIS ROUGE'), same = str(P.same, 'MÊME CALCUL');
      const endLabel = str(P.end_label, 'IL FINIT TOUJOURS DEVANT LA CASE VERTE');
      const st = { dur, gifts, zero, length, xfLen: 80 + length * 1840 };

      /* ---- repères ---- */
      const c = { unroll: cl('unroll')[0], g: gifts.map((x) => cl(x.cue)[0]) };
      const ev = [];
      for (const k of [['long', 'B'], ['compare', 'C'], ['end', 'E']]) for (const t of cl(k[0])) ev.push({ t, kind: k[1] });
      ev.sort((a, b) => a.t - b.t);
      const any = c.unroll != null || c.g.some((x) => x != null) || ev.length;
      if (!any) {
        const k = Math.min(1, dur / 8);
        c.unroll = 0.4 * k; c.g = gifts.map((_, i) => (2.3 + 0.65 * i) * k);
        ev.push({ t: (2.3 + 0.65 * gifts.length + 0.6) * k, kind: 'E' });
      } else if (c.unroll == null) c.unroll = -10;
      st.c = c; st.ev = ev;

      /* ---- fond ---- */
      rect(root, 0, 0, 1920, 1080, 0, C.ink);
      const bgs = g(root, { transform: 'rotate(-18 960 540)' });
      for (let k = -4; k <= 4; k++) rect(bgs, 960 + k * 300 - 70, -600, 140, 2300, 0, C.pocket);

      /* =========== scène principale =========== */
      st.main = g(root);
      st.world = g(st.main);
      line(st.world, 0, 640, 1920, 640, C.paper, 6, { 'stroke-linecap': 'butt' });
      st.strip = mkStrip(st.world, 520, 620, 60, 6);
      st.dia = [];
      for (let k = 0; k < 17; k++) st.dia.push(path(st.world, 'M -15 0 L 0 -9 L 15 0 L 0 9 Z', C.paper));
      // cadeaux sur socles, espacés entre x 200 et x 1440
      const n = gifts.length;
      st.gfx = gifts.map((gf, i) => {
        const x = n === 1 ? 820 : 200 + i * (1240 / (n - 1)), o = { x, g: g(st.world) };
        const inner = g(o.g);
        picto(g(inner, { transform: 'translate(0 337)' }), gf.icon, C.pocket);
        rect(inner, -98 + 10, 412 + 10, 196, 30, 4, C.pocket);
        rect(inner, -98, 412, 196, 30, 4, C.paper, C.ink, 6);
        o.lab = g(o.g);
        MT(o.lab, gf.label, 0, 474, 28, C.paper, { anchor: 'middle', len: f2(Math.min(mw(gf.label, 28), 230)) });
        o.inner = inner;
        return o;
      });
      // serpentin (long)
      st.serp = g(st.main);
      const xL = 140, xR = 1780, xE = 1690, ys = [199.5, 325, 450, 575, 700];
      const wp = [[0.35 * (st.xfLen + 30), ys[0]], [xR, ys[0]], [xR, ys[1]], [xL, ys[1]], [xL, ys[2]], [xR, ys[2]], [xR, ys[3]], [xL, ys[3]], [xL, ys[4]], [xE, ys[4]]];
      const poly = [wp[0]], rc = 34;
      for (let i = 1; i < wp.length - 1; i++) {
        const a = wp[i - 1], b = wp[i], d = wp[i + 1];
        const l1 = Math.hypot(b[0] - a[0], b[1] - a[1]), l2 = Math.hypot(d[0] - b[0], d[1] - b[1]);
        const p1 = [b[0] + (a[0] - b[0]) / l1 * rc, b[1] + (a[1] - b[1]) / l1 * rc], p2 = [b[0] + (d[0] - b[0]) / l2 * rc, b[1] + (d[1] - b[1]) / l2 * rc];
        for (let k = 0; k <= 8; k++) { const u = k / 8, w = 1 - u; poly.push([w * w * p1[0] + 2 * w * u * b[0] + u * u * p2[0], w * w * p1[1] + 2 * w * u * b[1] + u * u * p2[1]]); }
      }
      poly.push(wp[wp.length - 1]);
      const cum = [0]; for (let i = 1; i < poly.length; i++) cum.push(cum[i - 1] + Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]));
      st.poly = poly; st.cum = cum; st.L = cum[cum.length - 1];
      const d = poly.map((p, i) => (i ? 'L ' : 'M ') + f2(p[0]) + ' ' + f2(p[1])).join(' ');
      st.sA = path(st.serp, d, 'none', C.paper, 44, { 'stroke-linejoin': 'round', 'stroke-linecap': 'butt' });
      st.sB = path(st.serp, d, 'none', C.red, 32, { 'stroke-linejoin': 'round', 'stroke-linecap': 'butt' });
      const distOf = (yRun, x, left) => { for (let i = 0; i < poly.length; i++) if (Math.abs(poly[i][1] - yRun) < 1.5 && (left ? poly[i][0] <= x : poly[i][0] >= x)) return cum[i]; return st.L * 0.5; };
      st.sg = [['host', ys[1], 1150, true, 'L’HÔTE'], ['suite', ys[2], 620, false, 'LA SUITE'], ['jet', ys[3], 1300, true, 'LE JET']].map(([kind, y, x, left, lab]) => {
        const o = { y, x, dist: distOf(y, x, left), g: g(st.serp) };
        const inner = g(o.g); o.inner = inner;
        picto(g(inner, { transform: 'translate(0 -57) scale(0.44)' }), kind, null);
        MT(inner, lab, 44, -48, 24, C.paper, { anchor: 'start' });
        return o;
      });
      // la fonction qui donne la distance déroulée dans le serpentin (τ depuis le début de l'étape) : io2 entre 1,2 s et 5,2 s
      st.dFrac = (tau) => E.io2(prog(tau, 1.2, 5.2));
      st.tLand = (dist) => { let a = 1.2, b = 5.2; const f = dist / st.L; for (let i = 0; i < 24; i++) { const m = (a + b) / 2; if (st.dFrac(m) < f) a = m; else b = m; } return b; };
      st.sg.forEach((o) => { o.tl = st.tLand(o.dist) + 0.15; });
      st.mil = g(st.serp);
      { const lab = 'QUAND LE THÉO SE COMPTE EN MILLIONS', z = fitMono(lab, 36, 1100); MT(st.mil, lab, 0, z * 0.33, z, C.paper, { anchor: 'middle' }); }
      st.pointAt = (dist) => {
        dist = clamp(dist, 0, st.L); let lo = 0, hi = cum.length - 1;
        while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= dist) lo = m; else hi = m; }
        const u = (dist - cum[lo]) / Math.max(1e-6, cum[hi] - cum[lo]);
        return [lerp(poly[lo][0], poly[hi][0], u), lerp(poly[lo][1], poly[hi][1], u)];
      };
      // rouleau (hors du monde : sa position est calculée)
      st.roll = g(st.main);
      circle(st.roll, 0, 0, 1, C.red, C.ink, 6).setAttribute('vector-effect', 'non-scaling-stroke');
      {
        let sp = '';
        for (let i = 0; i <= 64; i++) { const u = i / 64, a = u * 2.6 * 2 * Math.PI, r = 0.1 + 0.8 * u; sp += (i ? ' L ' : 'M ') + f2(r * Math.cos(a)) + ' ' + f2(r * Math.sin(a)); }
        path(st.roll, sp, 'none', C.ink, 4, { 'vector-effect': 'non-scaling-stroke' });
      }
      // case verte
      st.box = g(st.main);
      if (zero) {
        rect(st.box, -120 + 10, -240 + 10, 240, 240, 36, C.pocket);
        rect(st.box, -120, -240, 240, 240, 36, C.lime, C.ink, 8);
        BT(st.box, '0', 0, -120 + 180 * 0.35, 180, C.ink, { anchor: 'middle' });
      }
      // étiquette de fin
      st.endL = g(st.main);
      {
        const z = fitSize(endLabel, 64, 1740), w = bw(endLabel, z);
        BT(st.endL, endLabel, 0, z * 0.35, z, C.paper, { anchor: 'middle' });
        const k = endLabel.indexOf('CASE VERTE');
        if (k >= 0) { const x0 = -w / 2 + bw(endLabel.slice(0, k), z); rect(st.endL, x0, z * 0.35 + 12, bw('CASE VERTE', z), 10, 0, C.lime); }
      }

      /* =========== vue « compare » =========== */
      st.cmp = g(root);
      const Cg = st.cmp;
      line(Cg, 60, 306, 1860, 306, C.paper, 6, { 'stroke-linecap': 'butt' });
      line(Cg, 0, 770, 1920, 770, C.paper, 6, { 'stroke-linecap': 'butt' });
      st.cS = mkStrip(Cg, 268, 300, 24, 4);
      st.cB = mkStrip(Cg, 668, 748, 50, 6);
      st.cGlass = g(Cg);
      picto(g(st.cGlass, { transform: 'translate(0 190) scale(0.62)' }), 'glass', null);
      rect(st.cGlass, -48, 238, 96, 22, 4, C.paper, C.ink, 4);
      st.cSmall = g(Cg);
      { const z = fitSize(small, 56, 520); BT(st.cSmall, small, 0, z * 0.35, z, C.paper, { anchor: 'start' }); }
      st.cBig = g(Cg);
      { const z = fitSize(big, 56, 700); BT(st.cBig, big, 0, z * 0.35, z, C.paper, { anchor: 'start' }); }
      st.cG = [['host', 900], ['suite', 1250], ['jet', 1600]].map(([k, x]) => {
        const o = { x, g: g(Cg) }; const inner = g(o.g); o.inner = inner;
        picto(g(inner, { transform: 'translate(0 560)' }), k, C.pocket);
        rect(inner, -98 + 10, 636 + 10, 196, 26, 4, C.pocket);
        rect(inner, -98, 636, 196, 26, 4, C.paper, C.ink, 6);
        return o;
      });
      st.cSame = g(Cg);
      { const z = fitSize(same, 72, 800); BT(st.cSame, same, 0, z * 0.35, z, C.paper, { anchor: 'start' }); }
      st.cComma = g(Cg);
      {
        const tail = 'M 22 -10 C 34 30 18 74 -28 96 L -14 52 C 6 40 8 18 -12 4 Z';
        path(st.cComma, tail, C.ink, C.ink, 16); circle(st.cComma, 0, -28, 40, C.ink, C.ink, 16);
        path(st.cComma, tail, C.lime); circle(st.cComma, 0, -28, 40, C.lime);
      }
      st.cStk = g(Cg);
      {
        const lab = 'SEULE LA VIRGULE CHANGE DE PLACE', z = fitSize(lab, 44, 940), w = bw(lab, z) + 56, h = 68;
        rect(st.cStk, -w / 2 + 9, -h / 2 + 9, w, h, 12, C.pocket);
        rect(st.cStk, -w / 2, -h / 2, w, h, 12, C.paper, C.ink, 6);
        BT(st.cStk, lab, 0, z * 0.35, z, C.ink, { anchor: 'middle' });
      }
      return st;
    },

    update(st, t, shot) {
      const ev = st.ev, c = st.c;
      /* ---- étape de vue courante ---- */
      let j = -1; for (let i = 0; i < ev.length; i++) if (ev[i].t <= t) j = i;
      const seg = j >= 0 ? ev[j] : null, kind = seg ? seg.kind : 'A', prevKind = j > 0 ? ev[j - 1].kind : 'A';
      const ts = seg ? seg.t + (prevKind === 'C' && kind !== 'C' ? 0.5 : 0) : 0;
      /* conveyor main <-> compare */
      let offM = 0, mainOn = true, offC = 0, cmpOn = false, cmpT0 = 0;
      if (kind === 'C') {
        offM = -1080 * E.io2(prog(t, seg.t, seg.t + 0.3)); mainOn = t < seg.t + 0.32;
        offC = 1080 * (1 - E.out3(prog(t, seg.t + 0.15, seg.t + 0.5))); cmpOn = t >= seg.t + 0.15; cmpT0 = seg.t + 0.5;
      } else if (prevKind === 'C' && seg) {
        offC = -1080 * E.io2(prog(t, seg.t, seg.t + 0.3)); cmpOn = t < seg.t + 0.32; cmpT0 = ev[j - 1].t + 0.5;
        offM = 1080 * (1 - E.out3(prog(t, seg.t + 0.15, seg.t + 0.5))); mainOn = t >= seg.t + 0.15;
      }
      vis(st.main, mainOn); vis(st.cmp, cmpOn);
      setA(st.main, 'transform', `translate(0 ${f2(offM)})`);
      setA(st.cmp, 'transform', `translate(0 ${f2(offC)})`);
      if (cmpOn) updCompare(st, t - cmpT0);
      if (!mainOn) return;

      /* ---- scène principale ---- */
      const xfLen = st.xfLen;
      let s = 1, pS = 0;
      const tauB = t - ts;
      if (kind === 'B') { s = lerp(1, 0.35, E.io2(prog(tauB, 0, 1.4))); pS = st.dFrac(tauB); }
      else if (kind === 'E' && prevKind === 'B') { s = lerp(0.35, 1, E.io2(prog(t, ts, ts + 1.0))); pS = 1 - E.in2(prog(t, ts, ts + 0.8)); }
      let xf = lerp(80, xfLen, E.out3(prog(t, c.unroll, c.unroll + 1.6)));
      if (kind === 'E') xf = lerp(xfLen, 1700, E.out3(prog(t, ts, ts + 1.2)));
      setA(st.world, 'transform', `scale(${f2(s)})`);
      setStrip(st.strip, 80, xf, xf > 90);
      st.dia.forEach((n, k) => { const x = 140 + k * 110; const on = x < xf - 10 && xf > 90; vis(n, on); if (on) setA(n, 'transform', `translate(${f2(x + 30)} 570)`); });
      /* cadeaux */
      st.gfx.forEach((o, i) => {
        const t0 = c.g[i], u = t0 == null ? -1 : t - t0;
        const on = t0 != null && u >= 0;
        vis(o.g, on);
        if (!on) return;
        const fall = 300, p = clamp(u / 0.2), dy = u < 0.2 ? -fall * (1 - p * p) : -0.04 * fall * Math.sin(Math.PI * clamp((u - 0.2) / 0.133));
        setA(o.g, 'transform', `translate(${f2(o.x)} ${f2(dy)})`);
        const k = pop(u, 0.2, 0.25); setA(o.lab, 'transform', `translate(0 474) scale(${f2(sc(k))}) translate(0 -474)`);
      });
      /* serpentin */
      const serpOn = pS > 0.0005;
      vis(st.serp, serpOn);
      if (serpOn) {
        const dd = pS * st.L;
        setA(st.sA, 'stroke-dasharray', `${f2(dd)} ${f2(st.L + 60)}`); setA(st.sB, 'stroke-dasharray', `${f2(dd)} ${f2(st.L + 60)}`);
        st.sg.forEach((o) => {
          const u = kind === 'B' ? tauB - o.tl : -1, on = kind === 'B' && u >= 0;
          vis(o.g, on);
          if (!on) return;
          const p = clamp(u / 0.2), dy = u < 0.2 ? -160 * (1 - p * p) : -6 * Math.sin(Math.PI * clamp((u - 0.2) / 0.133));
          setA(o.g, 'transform', `translate(${f2(o.x)} ${f2(o.y + dy)})`);
        });
        const k = pop(tauB, 1.0, 0.3); setA(st.mil, 'transform', `translate(1280 72) scale(${f2(sc(kind === 'B' ? k : 0))})`); vis(st.mil, kind === 'B' && k > 0.001);
      } else { vis(st.mil, false); }
      /* rouleau */
      {
        const r0 = lerp(50, 18, clamp((xf - 80) / 1620));
        let px = s * (xf + 30), py = s * 570, r = s * r0;
        if (serpOn) { const tip = st.pointAt(pS * st.L), w = clamp(pS / 0.03); px = lerp(px, tip[0], w); py = lerp(py, tip[1], w); r = lerp(r, 15, w); }
        const ang = (0.6 * (xf - 80) / Math.max(r0, 8) + (serpOn ? pS * st.L / 140 : 0)) * 57.2958;
        setA(st.roll, 'transform', `translate(${f2(px)} ${f2(py)}) rotate(${f2(ang)}) scale(${f2(sc(r))})`);
        vis(st.roll, true);                                                          // en fin de course, la case (au premier plan) recouvre le rouleau
      }
      /* case verte */
      if (st.zero) {
        const sBase = (x) => lerp(0.55, 1, E.io2(prog(x, 900, 1500)));
        let bx = 1680, by = 620, sb = sBase(kind === 'A' ? xf : xfLen);
        if (kind === 'B') {
          const w = E.io2(prog(tauB, 1.0, 2.2)), ws = sBase(xfLen) * s;
          bx = lerp(1680 * s, 1700, w); by = lerp(620 * s, 742, w); sb = lerp(ws, 0.55, w);
        } else if (kind === 'E') {
          const b0 = sBase(xfLen);
          sb = lerp(b0, 1.25, E.back(prog(t, ts + 1.0, ts + 1.6)));
          if (prevKind === 'B') { const w = E.io2(prog(t, ts, ts + 1.0)); bx = lerp(1700, bx, w); by = lerp(742, by, w); sb = lerp(0.55, sb, w); }
          const [dx, dy] = shakeAt(t, ts + 1.0, 6, 0.4); bx += dx; by += dy;
        }
        setA(st.box, 'transform', `translate(${f2(bx)} ${f2(by)}) scale(${f2(sc(sb))})`);
      }
      /* étiquette de fin */
      {
        const k = kind === 'E' ? pop(t, ts + 1.5, 0.3) : 0;
        setA(st.endL, 'transform', `translate(960 215) scale(${f2(sc(k))})`); vis(st.endL, k > 0.001);
      }
    }
  });

  /* vue « compare » : τ = secondes depuis le début de la vue (après le conveyor) */
  function updCompare(st, tau) {
    // bande du haut : tapis minuscule, un seul verre
    const a = E.out3(prog(tau, 0.1, 0.5));
    setStrip(st.cS, 200, 200 + 160 * a, a > 0.02);
    const kg = tau < 0.4 ? 0 : 1, fall = 160, u = tau - 0.4;
    const dy = u < 0 ? -fall : u < 0.2 ? -fall * (1 - (u / 0.2) * (u / 0.2)) : -0.04 * fall * Math.sin(Math.PI * clamp((u - 0.2) / 0.133));
    setA(st.cGlass, 'transform', `translate(282 ${f2(dy)})`); vis(st.cGlass, kg > 0);
    const k1 = pop(tau, 0.7, 0.25); setA(st.cSmall, 'transform', `translate(430 215) scale(${f2(sc(k1))})`); vis(st.cSmall, k1 > 0.001);
    // bande du bas : tapis qui traverse tout le cadre
    const b = E.out3(prog(tau, 0.7, 1.7));
    setStrip(st.cB, -90, -90 + 2100 * b, b > 0.01);
    st.cG.forEach((o, i) => {
      const t0 = 1.5 + 0.2 * i, v = tau - t0, on = v >= 0; vis(o.g, on);
      if (!on) return;
      const f = 300, d = v < 0.2 ? -f * (1 - (v / 0.2) * (v / 0.2)) : -0.04 * f * Math.sin(Math.PI * clamp((v - 0.2) / 0.133));
      setA(o.g, 'transform', `translate(${o.x} ${f2(d)})`);
    });
    const k2 = pop(tau, 2.0, 0.25); setA(st.cBig, 'transform', `translate(100 515) scale(${f2(sc(k2))})`); vis(st.cBig, k2 > 0.001);
    const k3 = pop(tau, 2.6, 0.25); setA(st.cSame, 'transform', `translate(100 420) scale(${f2(sc(k3))})`); vis(st.cSame, k3 > 0.001);
    // la virgule : saute de la bande du haut à la bande du bas
    const x0 = 1000, y0 = 222, x1 = 520, y1 = 652, tj = 3.4, p = prog(tau, tj, tj + 10 / 30), e = E.back(p);
    const kc = tau < 2.6 ? 0 : tau < tj ? pop(tau, 2.6, 0.25) : 1;
    const cx = lerp(x0, x1, e), cy = lerp(y0, y1, e) - 230 * Math.sin(Math.PI * clamp(p));
    setA(st.cComma, 'transform', `translate(${f2(cx)} ${f2(cy)}) rotate(${f2(-24 * Math.sin(Math.PI * clamp(p)))}) scale(${f2(sc(kc) * 1.2)})`); vis(st.cComma, kc > 0.001);
    const k4 = pop(tau, 3.9, 0.3); setA(st.cStk, 'transform', `translate(1190 392) rotate(-2) scale(${f2(sc(k4))})`); vis(st.cStk, k4 > 0.001);
  }
})();
