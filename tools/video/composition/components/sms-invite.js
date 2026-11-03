// Composant `sms-invite` (épisode 7) : le texto d'invitation et le fichier client. Voir EP7-COMPONENTS.md.
// Un téléphone générique plat (aucune heure, aucun logo), une bulle de message écrite lettre à lettre, puis le fichier « CLIENTS » où le prénom devient une ligne et une case chiffre.
// Cues : buzz, message, name, sender, reveal, figure, question. Fonction pure du temps ; aplats, aucun dégradé / flou / filter.
(() => {
  'use strict';
  const { C, E, clamp, prog, f2, sv, g, rect, circle, path, line, text, rng, shakeAt } = ZV;
  let UID = 0;
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const str = (v, d) => (typeof v === 'string' ? v : v == null ? d : String(v));
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const vis = (n, on) => setA(n, 'visibility', on ? 'visible' : 'hidden');
  // largeurs mesurées de Bricolage Grotesque 800 (em par caractère) : sert de textLength, donc indépendant de la police de secours
  const BW = { '0': .67, '1': .36, '2': .61, '3': .61, '4': .64, '5': .62, '6': .66, '7': .52, '8': .66, '9': .66, A: .71, B: .69, C: .69, D: .71, E: .63, F: .6, G: .73, H: .73, I: .3, J: .38, K: .7, L: .51, M: .96, N: .79, O: .73, P: .65, Q: .73, R: .69, S: .66, T: .58, U: .73, V: .68, W: 1, X: .72, Y: .66, Z: .58, 'À': .71, 'Â': .71, 'É': .63, 'È': .63, 'Ê': .63, 'Ë': .63, 'Î': .3, 'Ï': .3, 'Ô': .73, 'Û': .73, 'Ù': .73, 'Ç': .69, 'Œ': 1, ' ': .22, ' ': .22, ' ': .22, ',': .21, '.': .25, ':': .26, ';': .24, "'": .19, '’': .22, '!': .3, '?': .43, '|': .28, '%': .99, '€': .75, '≈': .55, '×': .53, '−': .53, '+': .53, '→': 1, '·': .25, '(': .33, ')': .33, '-': .36, '/': .37, '"': .38, '–': .55 };
  const bw = (s, z) => { let a = 0; for (const ch of String(s)) { const w = BW[ch]; a += z * (w !== undefined ? w : ch >= 'a' && ch <= 'z' ? 0.6 : 0.7); } return a; };
  const mw = (s, z) => Array.from(String(s)).length * z * 0.6;
  const fitSize = (s, z, maxW) => Math.min(z, z * maxW / Math.max(1, bw(s, z)));
  const BT = (p, s, x, y, z, fill, o) => text(p, s, x, y, z, fill, Object.assign({ len: f2(bw(s, z)) }, o || {}));
  const MT = (p, s, x, y, z, fill, o) => text(p, s, x, y, z, fill, Object.assign({ mono: true, len: f2(mw(s, z)) }, o || {}));
  // texte « machine à écrire » : le texte entier porte un textLength fixe, un clipPath le découvre caractère par caractère (ancre à gauche)
  function TY(parent, s, x, y, z, fill, o) {
    o = o || {};
    const chars = Array.from(s), w = o.mono ? mw(s, z) : bw(s, z);
    const grp = g(parent), id = 'sm' + (++UID) + 'c';
    const cr = sv('rect', { x: x - 6, y: y - z * 1.05, width: 0, height: z * 1.45 }, sv('clipPath', { id }, grp));
    const tn = text(grp, s, x, y, z, fill, { mono: o.mono, len: f2(Math.max(1, w)) });
    tn.setAttribute('clip-path', `url(#${id})`);
    const cum = [0]; let a = 0;
    for (const ch of chars) { a += o.mono ? z * 0.6 : bw(ch, z); cum.push(a); }
    const k = w / Math.max(a, 1); for (let i = 0; i < cum.length; i++) cum[i] *= k;
    return { g: grp, cr, cum, n: chars.length, w };
  }
  const tyShow = (o, n) => { n = clamp(Math.floor(n), 0, o.n); setA(o.cr, 'width', n === 0 ? 0 : f2(o.cum[n] + (n >= o.n ? 14 : 4))); };
  const pop = (t, t0, d) => (t < t0 ? 0 : E.back(prog(t, t0, t0 + (d || 0.25))));
  const shadowRect = (p, x, y, w, h, r, d, col) => rect(p, x + d, y + d, w, h, r, col || C.ink);

  ZV.define('sms-invite', {
    init(root, shot) {
      const P = shot.props || {};
      const beats = Array.isArray(shot.beats) ? shot.beats : [];
      const dur = isNum(shot.dur) && shot.dur > 0 ? shot.dur : 9;
      const cl = (n) => beats.filter((b) => b && b.do === 'cue' && b.name === n && isNum(b.t)).map((b) => b.t).sort((a, b) => a - b);
      const sender = str(P.sender, 'LA MAISON'), name = str(P.name, 'TOM');
      const msg = str(P.text, 'TOM, VOTRE SUITE VOUS ATTEND VENDREDI.');
      const figure = P.figure == null || P.figure === '' ? null : str(P.figure, null);
      const verdict = P.verdict === '' ? '' : str(P.verdict, '→ ÇA VAUT UNE SUITE');
      const question = str(P.question, 'COMBIEN ONT-ILS ESTIMÉ QUE JE VALAIS ?');
      const st = { dur };

      /* ---- repères ---- */
      let c = { buzz: cl('buzz'), message: cl('message')[0], name: cl('name')[0], sender: cl('sender')[0], reveal: cl('reveal')[0], figure: cl('figure')[0], question: cl('question')[0] };
      const any = c.buzz.length || [c.message, c.name, c.sender, c.reveal, c.figure, c.question].some((x) => x != null);
      if (!any) { const k = Math.min(1, dur / 9); c = { buzz: [0.4 * k], message: 1.2 * k, name: 2.9 * k, sender: 3.6 * k, reveal: 4.6 * k, figure: 6.3 * k, question: null }; }
      else if (c.message == null) c.message = -10;                                    // le message est déjà là (plan de suite)
      st.c = c;

      /* ---- décor ---- */
      rect(root, 0, 0, 1920, 1080, 0, C.ink);
      const bgs = g(root, { transform: 'rotate(-18 960 540)' });
      for (let k = -4; k <= 4; k++) rect(bgs, 960 + k * 300 - 70, -600, 140, 2300, 0, C.pocket);

      /* ---- le fichier (à droite) ---- */
      const SX = 980, SY = 120, SW = 860, SH = 640, ROWY = 445;
      st.fl = g(root);
      shadowRect(st.fl, SX, SY, SW, SH, 6, 14, C.lime);
      rect(st.fl, SX, SY, SW, SH, 6, C.paper, C.ink, 8);
      MT(st.fl, 'CLIENTS', SX + 32, SY + 56, 34, C.ink, { anchor: 'start', spacing: 0 });
      line(st.fl, SX + 32, SY + 78, SX + SW - 32, SY + 78, C.ink, 6);
      const anon = [[222, 300], [280, 380], [338, 250], [592, 340], [642, 280]];
      for (const [ay, aw] of anon) {
        line(st.fl, SX + 40, ay + 22, SX + 40 + aw, ay + 22, C.ink, 14);
        rect(st.fl, SX + SW - 32 - 150, ay, 150, 44, 6, C.pocket);
      }
      rect(st.fl, SX + 14, ROWY - 55, SW - 28, 110, 4, 'none', C.ink, 5);
      const nm = fitSize(name, 60, 520);
      BT(st.fl, name, SX + 40, ROWY + nm * 0.35, nm, C.ink, { anchor: 'start' });
      st.box = g(st.fl, { transform: `translate(${SX + SW - 32 - 110} ${ROWY})` });
      rect(st.box, -110 + 8, -45 + 8, 220, 90, 10, C.ink);
      rect(st.box, -110, -45, 220, 90, 10, C.lime, C.ink, 6);
      const fgTxt = figure != null ? figure : '?';
      const fz = fitSize(fgTxt, 76, 188);
      st.boxT = BT(st.box, fgTxt, 0, fz * 0.35, fz, C.ink, { anchor: 'middle' });
      st.vd = g(st.fl);
      if (verdict) {
        const z = fitSize(verdict, 44, 760), w = bw(verdict, z) + 56, h = 66;
        shadowRect(st.vd, -w / 2, -h / 2, w, h, 12, 9);
        rect(st.vd, -w / 2, -h / 2, w, h, 12, C.red, C.ink, 6);
        BT(st.vd, verdict, 0, z * 0.35, z, C.ink, { anchor: 'middle' });
      }
      st.vdX = SX + SW / 2; st.vdY = 538;

      /* ---- le téléphone ---- */
      st.ph = g(root);
      const ph = st.ph;
      st.arcs = g(ph);
      for (const s of [-1, 1]) {
        const cx = s < 0 ? 410 : 870;
        path(st.arcs, `M ${cx} 405 Q ${cx + s * 22} 445 ${cx} 485`, 'none', C.paper, 7);
        path(st.arcs, `M ${cx + s * 4} 365 Q ${cx + s * 52} 445 ${cx + s * 4} 525`, 'none', C.paper, 7);
      }
      shadowRect(ph, 440, 80, 400, 720, 56, 14, C.red);
      rect(ph, 440, 80, 400, 720, 56, C.ink, C.paper, 8);
      rect(ph, 458, 98, 364, 684, 40, C.paper);
      for (let i = 0; i < 3; i++) rect(ph, 484 + i * 14, 140 - (10 + i * 6), 9, 10 + i * 6, 2, C.ink);
      rect(ph, 752, 120, 46, 20, 5, 'none', C.ink, 4); rect(ph, 757, 125, 30, 10, 2, C.ink); rect(ph, 801, 126, 4, 8, 1, C.ink);
      MT(ph, 'MARDI', 640, 188, 26, C.ink, { anchor: 'middle', spacing: 0 });
      // cartouche de l'expéditeur
      {
        const z = fitSize(sender, 44, 270), w = Math.min(330, bw(sender, z) + 52), h = 64;
        st.cart = rect(ph, 640 - w / 2, 200, w, h, 12, C.ink);
        st.cartT = BT(ph, sender, 640, 200 + h / 2 + z * 0.35, z, C.paper, { anchor: 'middle' });
        // sticker « PAS UN AMI » (collé au bord droit du cartouche, il suit le téléphone)
        const lab = 'PAS UN AMI', sz = 30, sw = bw(lab, sz) + 40, shh = 52;
        st.stk = g(ph);
        shadowRect(st.stk, -sw / 2, -shh / 2, sw, shh, 8, 6);
        rect(st.stk, -sw / 2, -shh / 2, sw, shh, 8, C.paper, C.ink, 5);
        BT(st.stk, lab, 0, sz * 0.35, sz, C.ink, { anchor: 'middle' });
        st.stkX = 640 + w / 2 + sw / 2 - 4; st.stkY = 208;
      }
      // zone de saisie décorative
      rect(ph, 482, 714, 316, 44, 22, 'none', C.ink, 4);
      circle(ph, 776, 736, 13, C.ink);
      rect(ph, 590, 770, 100, 6, 3, C.ink);

      /* ---- la bulle ---- */
      let size = 36, lines = null;
      const words = msg.split(/\s+/).filter(Boolean);
      for (let z = 52; z >= 36; z -= 2) {
        if (words.some((w) => bw(w, z) > 300)) continue;
        const ls = []; let cur = '';
        for (const w of words) { const tryS = cur ? cur + ' ' + w : w; if (cur && bw(tryS, z) > 300) { ls.push(cur); cur = w; } else cur = tryS; }
        if (cur) ls.push(cur);
        if (ls.length <= 4 || z === 36) { size = z; lines = ls; break; }
      }
      if (!lines) { size = 34; lines = [msg]; }
      const lh = size * 1.12, bh = lines.length * lh + 40, BX = 478, BTOP = 312, BBOT = BTOP + bh;
      st.bb = g(ph);
      const bb = st.bb;
      rect(bb, 8, -bh + 8, 336, bh, 28, C.ink, null);
      rect(bb, 0, -bh, 336, bh, 28, C.paper, C.ink, 5);
      path(bb, 'M 3 -44 L -22 -6 L 13 -12 Z', C.paper, C.ink, 5);
      line(bb, 0, -39, 0, -15, C.paper, 8, { 'stroke-linecap': 'butt' });
      // surlignage du prénom (sous le texte)
      const nU = name.toUpperCase().replace(/[^A-ZÀ-Ý]/g, '');
      let hl = null;
      lines.forEach((ln, li) => {
        if (hl) return;
        const ws = ln.split(' '); let pre = '';
        for (const w of ws) {
          if (w.toUpperCase().replace(/[^A-ZÀ-Ý]/g, '') === nU && nU) { const core = w.replace(/[,.;:!?]+$/, ''); hl = { li, x: 18 + bw(pre, size) + (pre ? bw(' ', size) : 0), w: bw(core, size) }; return; }
          pre += (pre ? ' ' : '') + w;
        }
      });
      st.hl = null;
      if (hl) {
        const top = -bh + 20 + hl.li * lh;
        st.hl = rect(bb, hl.x - 4, top + size * 0.02, hl.w + 8, size * 1.02, 4, C.lime);
        st.hlW = hl.w + 8; st.hlAbs = { x: BX + hl.x + hl.w / 2, y: BTOP + 20 + hl.li * lh };
      } else st.hlAbs = { x: BX + 80, y: BTOP + 20 };
      st.ty = []; st.tyOff = []; let acc = 0;
      lines.forEach((ln, li) => {
        const o = TY(bb, ln, 18, -bh + 20 + li * lh + size * 0.84, size, C.ink);
        st.ty.push(o); st.tyOff.push(acc); acc += o.n + 1;
      });
      st.nLet = acc; st.bBot = BBOT; st.bX = BX;

      /* ---- la flèche lime du prénom à la ligne ---- */
      st.arw = g(root);
      {
        const ax = st.hlAbs.x - 300, ay = st.hlAbs.y - 14, rx = SX + 20, d = `M ${f2(ax)} ${f2(ay)} L ${f2(ax)} 284 L 900 284 L 900 ${ROWY} L ${rx - 44} ${ROWY}`;
        st.arwU = path(st.arw, d, 'none', C.ink, 24, { pathLength: 1000, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
        st.arwL = path(st.arw, d, 'none', C.lime, 14, { pathLength: 1000, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
        st.head = g(st.arw);
        path(st.head, `M ${rx + 8} ${ROWY} L ${rx - 44} ${ROWY - 30} L ${rx - 44} ${ROWY + 30} Z`, C.ink, C.ink, 10);
        path(st.head, `M ${rx + 8} ${ROWY} L ${rx - 44} ${ROWY - 30} L ${rx - 44} ${ROWY + 30} Z`, C.lime, null);
        st.headX = rx + 8;
      }

      /* ---- la bande de la question (au premier plan) ---- */
      st.qb = g(root);
      {
        const z = fitSize(question, 56, 1560), w = bw(question, z);
        shadowRect(st.qb, -840, -50, 1680, 100, 10, 10, C.lime);
        rect(st.qb, -840, -50, 1680, 100, 10, C.paper, C.ink, 6);
        st.qt = TY(st.qb, question, -w / 2, z * 0.35, z, C.ink);
      }
      return st;
    },

    update(st, t, shot) {
      const c = st.c;
      /* téléphone : entrée, vibration, glissement */
      let bz = 0, arcs = false;
      for (const tb of c.buzz) { const u = t - tb; if (u >= 0 && u <= 0.8) { bz = 6 * Math.sin(u * 2 * Math.PI * 2.5) * (1 - prog(u, 0.68, 0.8)); arcs = true; } }
      const tR = c.reveal;
      const sh = tR != null ? -300 * E.out3(prog(t, tR, tR + 0.4)) : 0;
      const dy = 120 * (1 - E.out3(prog(t, 0, 0.35)));
      setA(st.ph, 'transform', `translate(${f2(sh + bz)} ${f2(dy)})`);
      vis(st.arcs, arcs);

      /* bulle */
      const tM = c.message;
      const has = tM != null && t >= tM;
      vis(st.bb, has);
      if (has) {
        const s = E.back(prog(t, tM, tM + 8 / 30));
        setA(st.bb, 'transform', `translate(${st.bX} ${f2(st.bBot)}) scale(${f2(Math.max(0.001, s))})`);
        const n = Math.floor(Math.max(0, t - tM - 8 / 30) * 30) + (t >= tM + 8 / 30 ? 1 : 0);
        for (let i = 0; i < st.ty.length; i++) tyShow(st.ty[i], n - st.tyOff[i]);
        if (st.hl) {
          const tN = c.name;
          const p = tN != null ? E.out2(prog(t, tN, tN + 0.2)) : 0;
          setA(st.hl, 'width', f2(Math.max(0, st.hlW * p)));
          vis(st.hl, p > 0);
        }
      }

      /* expéditeur */
      const tS = c.sender, sOn = tS != null && t >= tS;
      setA(st.cart, 'fill', sOn ? C.red : C.ink);
      setA(st.cartT, 'fill', sOn ? C.ink : C.paper);
      {
        const s = tS != null ? pop(t, tS + 0.08, 0.25) : 0;
        setA(st.stk, 'transform', `translate(${f2(st.stkX)} ${f2(st.stkY)}) rotate(-8) scale(${f2(Math.max(0.001, s))})`);
        vis(st.stk, s > 0.001);
      }

      /* fichier */
      if (tR == null) { vis(st.fl, false); vis(st.arw, false); }
      else {
        const p = E.out3(prog(t, tR + 0.1, tR + 0.1 + 14 / 30));
        vis(st.fl, t >= tR + 0.1);
        setA(st.fl, 'transform', `translate(${f2(1000 * (1 - p))} 0)`);
        const pa = E.out2(prog(t, tR + 0.55, tR + 1.15));
        vis(st.arw, pa > 0);
        setA(st.arwU, 'stroke-dasharray', `${f2(pa * 1000)} 1100`);
        setA(st.arwL, 'stroke-dasharray', `${f2(pa * 1000)} 1100`);
        const hp = pa >= 1 ? E.back(prog(t, tR + 1.15, tR + 1.4)) : 0;
        setA(st.head, 'transform', `translate(${st.headX} ${ROWY_()}) scale(${f2(Math.max(0.001, hp))}) translate(${-st.headX} ${-ROWY_()})`);
        vis(st.head, hp > 0.001);
      }

      /* case chiffre + verdict */
      const tF = c.figure;
      if (tF == null || t < tF) { vis(st.boxT, false); vis(st.vd, false); setA(st.box, 'transform', st.boxBase || (st.boxBase = st.box.getAttribute('transform'))); }
      else {
        const base = st.boxBase || (st.boxBase = st.box.getAttribute('transform'));
        const m = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(base);
        const [dx, dy2] = shakeAt(t, tF, 6, 0.4);
        const sc = 1 + 0.5 * (1 - E.out3(prog(t, tF, tF + 0.2)));
        setA(st.box, 'transform', `translate(${f2(+m[1] + dx)} ${f2(+m[2] + dy2)}) scale(${f2(sc)})`);
        vis(st.boxT, true);
        const v = pop(t, tF + 0.3, 0.25);
        setA(st.vd, 'transform', `translate(${st.vdX} ${st.vdY}) rotate(-2) scale(${f2(Math.max(0.001, v))})`);
        vis(st.vd, v > 0.001);
      }

      /* question */
      const tQ = c.question;
      if (tQ == null || t < tQ) vis(st.qb, false);
      else {
        const s = E.back(prog(t, tQ, tQ + 0.25));
        setA(st.qb, 'transform', `translate(960 740) scale(1 ${f2(Math.max(0.001, s))})`);
        vis(st.qb, true);
        tyShow(st.qt, (t - tQ - 0.15) / 0.035);
      }
    }
  });
  const ROWY_ = () => 445;
})();
