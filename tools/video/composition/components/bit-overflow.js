// Composant « bit-overflow » (épisode 2) : le compteur 32 bits qui déborde, 2³² centimes = 42 949 672,96 $ contre 42 949 672,76 $ affichés. Voir EP2-COMPONENTS.md.
// Fonction pure du temps du plan ; aplats seulement.
(() => {
  const { C, E, clamp, prog, lerp, f2, put, g, rect, text, sv } = ZV;
  const str = (v, d) => (v != null && v !== '' ? String(v) : d);
  const bw = (s, size) => { let a = 0; for (const ch of String(s)) a += size * (ch === ' ' ? 0.26 : /[0-9]/.test(ch) ? 0.6 : /[A-ZÀÂÉÈÊÎÔÛÇ]/.test(ch) ? 0.66 : /[.,:;'’!|]/.test(ch) ? 0.3 : 0.56); return a; };
  const MAXV = 4294967295;
  const CELL = 88, GAP = 12, BX = 140, BY = 60, BW = 1640, BH = 250;
  const SA = 118, SB = 108;                        // tailles Mono des lignes A (compteur / gros nombre) et B, C (dollars)
  const YA = 470, YB = 640, YC = 800;              // lignes de base

  function monoRow(parent, size, fill) {           // texte Mono centré dont la largeur suit le nombre de caractères
    const n = text(parent, '', 960, 0, size, fill, { mono: true, anchor: 'middle' });
    n.setAttribute('textLength', 1); n.setAttribute('lengthAdjust', 'spacingAndGlyphs');
    return n;
  }
  function setRow(n, s, size, y) {
    n.textContent = s; n.setAttribute('y', f2(y)); n.setAttribute('textLength', f2(Math.max(1, s.length * size * 0.6)));
  }

  ZV.define('bit-overflow', {
    init(root, shot) {
      const P = shot.props || {};
      const st = { dur: Math.max(0.1, shot.dur || 1) };
      st.big = str(P.big, '4 294 967 296'); st.dollars = str(P.dollars, '42 949 672,96 $'); st.shown = str(P.shown, '42 949 672,76 $'); st.gap = str(P.gap, '20 ¢');
      const cu = (n) => ZV.cue(shot, n);
      st.cFill = cu('fill'); st.cFull = cu('full'); st.cWrap = cu('wrap'); st.cConv = cu('convert'); st.cComp = cu('compare');
      if ([st.cFill, st.cFull, st.cWrap, st.cConv, st.cComp].every((x) => x === null)) { st.cFill = 0.3; st.cFull = 3.8; }
      if (st.cFill === null) st.cFill = Math.max(0, (st.cFull !== null ? st.cFull : 3.5) - 3.5);
      st.fillEnd = st.cFull !== null ? Math.max(st.cFill + 0.4, st.cFull) : st.cFill + 3.5;
      const bits = Math.max(1, Math.min(32, P.bits | 0 || 32));
      st.bits = bits;

      rect(root, 0, 0, 1920, 1080, 0, C.pocket);
      st.board = g(root);
      rect(st.board, BX + 12, BY + 12, BW, BH, 22, C.ink);
      st.frame = rect(st.board, BX, BY, BW, BH, 22, C.ink, C.paper, 8);
      st.cells = [];
      const x0 = BX + (BW - (16 * CELL + 15 * GAP)) / 2;
      for (let i = 0; i < 32; i++) {
        const row = Math.floor(i / 16), col = i % 16, x = x0 + col * (CELL + GAP), y = BY + 26 + row * (84 + 14);
        const r = rect(st.board, x, y, CELL, 84, 10, C.pocket, '#3A3A3A', 4);
        const tx = text(st.board, '0', x + CELL / 2, y + 60, 54, '#5A5A5A', { mono: true, anchor: 'middle' });
        st.cells.push({ r, tx, bit: 31 - i });     // bit de poids fort à gauche
      }
      st.rowA = monoRow(root, SA, C.paper);
      st.sticker = g(root);
      {
        const lab = '2³² − 1', size = 150, w = bw(lab, size) + 100, h = size * 1.5;
        rect(st.sticker, -w / 2 + 14, -h / 2 + 14, w, h, 18, C.ink);
        rect(st.sticker, -w / 2, -h / 2, w, h, 18, C.lime, C.ink, 8);
        text(st.sticker, lab, 0, size * 0.35, size, C.ink, { anchor: 'middle', len: f2(bw(lab, size)) });
      }
      st.stamp = g(root);
      {
        const lab = 'DÉBORDEMENT', size = 120, w = bw(lab, size) + 90, h = 190;
        rect(st.stamp, -w / 2, -h / 2, w, h, 12, C.ink, C.red, 14);
        rect(st.stamp, -w / 2 + 14, -h / 2 + 14, w - 28, h - 28, 6, 'none', C.red, 4);
        text(st.stamp, lab, 0, size * 0.35, size, C.red, { anchor: 'middle', len: f2(bw(lab, size)) });
      }
      st.divS = g(root);
      {
        const w = 330, h = 78;
        rect(st.divS, -w / 2 + 10, -h / 2 + 10, w, h, 16, C.ink);
        rect(st.divS, -w / 2, -h / 2, w, h, 16, C.red, C.ink, 6);
        text(st.divS, '÷ 100', 0, 26, 74, C.ink, { anchor: 'middle', len: f2(bw('÷ 100', 74)) });
      }
      // lignes B (dollars) et C (affiché), avec cellule surlignée sur les chiffres qui diffèrent
      const nB = st.dollars.length, nC = st.shown.length;
      st.cwB = SB * 0.6;
      st.xB = 960 - (nB * st.cwB) / 2; st.xC = 960 - (nC * st.cwB) / 2;
      st.hiB = []; st.hiC = [];
      for (let k = 1; k <= Math.min(nB, nC); k++) {
        const a = st.dollars[nB - k], b = st.shown[nC - k];
        if (a !== b && /\d/.test(a) && /\d/.test(b)) { st.hiB.push(nB - k); st.hiC.push(nC - k); }
      }
      st.hlB = st.hiB.map((i) => rect(root, st.xB + i * st.cwB, YB - SB * 0.82, st.cwB, SB * 1.0, 6, C.lime));
      st.hlC = st.hiC.map((i) => rect(root, st.xC + i * st.cwB, YC - SB * 0.82, st.cwB, SB * 1.0, 6, C.lime));
      st.chB = []; st.chC = [];
      for (let i = 0; i < nB; i++) st.chB.push(st.dollars[i] === ' ' ? null : text(root, st.dollars[i], f2(st.xB + i * st.cwB + st.cwB / 2), YB, SB, C.paper, { mono: true, anchor: 'middle', len: f2(st.cwB) }));
      for (let i = 0; i < nC; i++) st.chC.push(st.shown[i] === ' ' ? null : text(root, st.shown[i], f2(st.xC + i * st.cwB + st.cwB / 2), YC, SB, C.paper, { mono: true, anchor: 'middle', len: f2(st.cwB) }));
      st.lblC = text(root, 'SUR LA MACHINE', st.xC, YC - SB * 0.82 - 16, 28, '#B9B5A8', { mono: true, anchor: 'start', len: f2(14 * 28 * 0.6) });
      st.lblB = text(root, 'EN DOLLARS', st.xB, YB - SB * 0.82 - 16, 28, '#B9B5A8', { mono: true, anchor: 'start', len: f2(10 * 28 * 0.6) });
      st.gapS = g(root);
      {
        const size = 84, w = bw(st.gap, size) + 90, h = size * 1.45;
        rect(st.gapS, -w / 2 + 12, -h / 2 + 12, w, h, 18, C.ink);
        rect(st.gapS, -w / 2, -h / 2, w, h, 18, C.lime, C.ink, 7);
        text(st.gapS, st.gap, 0, size * 0.35, size, C.ink, { anchor: 'middle', len: f2(bw(st.gap, size)) });
      }
      st.flashR = rect(root, 0, 0, 1920, 1080, 0, C.red);
      return st;
    },

    update(st, t, shot) {
      try {
        t = clamp(t, 0, st.dur + 1);
        const wrapped = st.cWrap !== null && t >= st.cWrap;
        // ---- valeur du registre ----
        let v = 0;
        if (!wrapped && t >= st.cFill) { const tq = t >= st.fillEnd ? st.fillEnd : st.cFill + Math.floor((t - st.cFill) * 3) / 3; v = Math.floor(MAXV * Math.pow(clamp((tq - st.cFill) / (st.fillEnd - st.cFill)), 2.2)); }   // 3 pas/s : jamais plus de 3 changements/s
        const full = v >= MAXV;
        const sh = st.cFull !== null ? ZV.shakeAt(t, st.cFull, 9, 0.4) : [0, 0];
        st.board.setAttribute('transform', `translate(${f2(sh[0])} ${f2(sh[1])})`);
        const redBoard = wrapped && !(st.cConv !== null && t >= st.cConv);
        st.frame.setAttribute('stroke', redBoard ? C.red : C.paper);
        const flashW = wrapped && t < st.cWrap + 0.1;
        for (const c of st.cells) {
          const on = !wrapped && c.bit < st.bits && Math.floor(v / Math.pow(2, c.bit)) % 2 === 1;
          const fl = flashW && c.bit < st.bits;
          c.r.setAttribute('fill', fl ? C.red : on ? C.lime : C.pocket);
          c.r.setAttribute('stroke', fl ? C.ink : on ? C.ink : '#3A3A3A');
          c.tx.textContent = on || fl ? '1' : '0';
          c.tx.setAttribute('fill', fl ? C.ink : on ? C.ink : '#5A5A5A');
        }
        // ---- ligne A : compteur, puis 0, puis le gros nombre en centimes ----
        let a = ''; let ac = C.paper;
        const conv = st.cConv !== null && t >= st.cConv;
        if (conv) { a = st.big + ' ¢'; ac = C.paper; }
        else if (wrapped) { a = '0'; ac = C.red; }
        else { a = ZV.fr(v); ac = full ? C.lime : C.paper; }
        setRow(st.rowA, a, SA, YA);
        st.rowA.setAttribute('fill', ac);
        // ---- sticker 2³² − 1 / tampon DÉBORDEMENT ----
        {
          const tf = st.cFull;
          const on = tf !== null && t >= tf && !wrapped && !(st.cConv !== null && t >= st.cConv);
          const p = tf !== null ? E.back(prog(t, tf, tf + 0.22)) : 0, k = lerp(1.9, 1, E.out3(prog(t, tf !== null ? tf : 0, (tf !== null ? tf : 0) + 0.15)));
          put(st.sticker, 960, 610, -3, on ? Math.max(0.01, p * k) : 0, on ? Math.max(0.01, p * k) : 0, on ? 1 : 0);
          const tw = st.cWrap, off = conv;
          const on2 = tw !== null && t >= tw + 0.12 && !off;
          const p2 = tw !== null ? E.back(prog(t, tw + 0.12, tw + 0.34)) : 0;
          const s2 = tw !== null ? ZV.shakeAt(t, tw + 0.3, 10, 0.4) : [0, 0];
          put(st.stamp, 960 + s2[0], 610 + s2[1], -6, on2 ? Math.max(0.01, p2) : 0, on2 ? Math.max(0.01, p2) : 0, on2 ? 1 : 0);
          st.flashR.setAttribute('visibility', tw !== null && t >= tw && t < tw + 0.1 ? 'visible' : 'hidden');
        }
        // ---- conversion : ÷ 100 puis dollars ----
        {
          const tc = st.cConv;
          const on = tc !== null && t >= tc;
          const p = tc !== null ? E.back(prog(t, tc, tc + 0.25)) : 0;
          put(st.divS, 280, 590, -3, on ? Math.max(0.01, p) : 0, on ? Math.max(0.01, p) : 0, on ? 1 : 0);
          const t0 = tc !== null ? tc + 0.45 : 1e9;
          for (let i = 0; i < st.chB.length; i++) { const n = st.chB[i]; if (n) n.setAttribute('visibility', t >= t0 + i * 0.06 ? 'visible' : 'hidden'); }
          const doneB = t0 + st.chB.length * 0.06;
          const cmp = st.cComp !== null && t >= st.cComp;
          for (let i = 0; i < st.chB.length; i++) { const n = st.chB[i]; if (n) n.setAttribute('fill', cmp && st.hiB.indexOf(i) >= 0 ? C.ink : C.lime); }
          st.lblB.setAttribute('visibility', on ? 'visible' : 'hidden');
          st.hlB.forEach((r) => r.setAttribute('visibility', cmp ? 'visible' : 'hidden'));
          const sh2 = tc !== null ? ZV.shakeAt(t, doneB, 6, 0.3) : [0, 0];
          for (let i = 0; i < st.chB.length; i++) { const n = st.chB[i]; if (n) n.setAttribute('transform', t >= doneB ? `translate(${f2(sh2[0])} ${f2(sh2[1])})` : ''); }
        }
        // ---- comparaison : le montant de la machine, l'écart ----
        {
          const tp = st.cComp;
          const on = tp !== null && t >= tp;
          for (let i = 0; i < st.chC.length; i++) { const n = st.chC[i]; if (!n) continue; n.setAttribute('visibility', on && t >= tp + i * 0.05 ? 'visible' : 'hidden'); n.setAttribute('fill', st.hiC.indexOf(i) >= 0 ? C.ink : C.paper); }
          st.lblC.setAttribute('visibility', on ? 'visible' : 'hidden');
          const tg = tp !== null ? tp + st.chC.length * 0.05 + 0.1 : 1e9;
          st.hlC.forEach((r) => r.setAttribute('visibility', t >= tg ? 'visible' : 'hidden'));
          const pg = E.back(prog(t, tg, tg + 0.25)), sg = ZV.shakeAt(t, tg + 0.2, 8, 0.4);
          put(st.gapS, 1620 + sg[0], 745 + sg[1], 4, t >= tg ? Math.max(0.01, pg) : 0, t >= tg ? Math.max(0.01, pg) : 0, t >= tg ? 1 : 0);
        }
      } catch (e) { /* jamais d'exception */ }
    }
  });
})();
