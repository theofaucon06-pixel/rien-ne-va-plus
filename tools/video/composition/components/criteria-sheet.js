// Composant `criteria-sheet` (épisode 4) : la fiche officielle des critères. Voir EP4-COMPONENTS.md.
// Fond ink, feuille paper inclinée, 9 lignes de critère illisibles (barres) dont UNE écrite en clair et surlignée.
// Fonction pure du temps ; aplats, aucun dégradé / flou / filter.
// Cues : sheet, count, focus, ink, one-sign. Prop `from` : none | focus.
(() => {
  'use strict';
  const { C, F, E, clamp, prog, f2, sv, g, rect, path, text, put, rng } = ZV;
  let UID = 0;
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const num = (v, d) => (v != null && v !== '' && isFinite(+v) ? +v : d);
  const sstr = (v, d) => (typeof v === 'string' && v.length ? v : d);
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const vis = (n, on) => setA(n, 'visibility', on ? 'visible' : 'hidden');
  const NEVER = -1e6;

  // mesure réelle d'un texte (repli : estimation) ; la sonde est retirée après l'init
  function mkMeasure(root) {
    const n = sv('text', { x: 0, y: 0, visibility: 'hidden' }, root);
    const m = (s, size, mono) => {
      try {
        n.setAttribute('font-family', mono ? F.mono : F.display); n.setAttribute('font-weight', 800); n.setAttribute('font-size', size);
        n.textContent = s;
        const w = n.getComputedTextLength();
        if (w > 0) return w;
      } catch (e) { /* repli */ }
      return String(s).length * size * (mono ? 0.6 : 0.62);
    };
    m.done = () => { try { root.removeChild(n); } catch (e) { /* rien */ } };
    return m;
  }
  // coupe une liste de mots en 2 lignes de largeur la plus équilibrée
  function split2(words, meas, size) {
    if (words.length < 2) return [words.join(' '), ''];
    let best = null;
    for (let k = 1; k < words.length; k++) {
      const a = words.slice(0, k).join(' '), b = words.slice(k).join(' ');
      const w = Math.max(meas(a, size), meas(b, size));
      if (!best || w < best.w) best = { a, b, w };
    }
    return [best.a, best.b];
  }

  const SX0 = 360, SX1 = 1560, SY0 = 60, SY1 = 800, FOLD = 54;
  const LM = 430;                                   // marge gauche du contenu (numéros)
  const ROW0 = 215, ROWMAX = 785;                   // zone des lignes
  const HLH = 116, NORMH = 56;
  const NAMES = ['sheet', 'count', 'focus', 'ink', 'one-sign'];
  const OPTIONAL = { 3: true };                     // `ink` n'est jamais impliqué par un cue plus tardif

  ZV.define('criteria-sheet', {
    init(root, shot) {
      const P = (shot && shot.props) || {};
      const beats = Array.isArray(shot && shot.beats) ? shot.beats : [];
      const dur = isNum(shot && shot.dur) && shot.dur > 0 ? shot.dur : 10;
      const cueT = (n) => { let r = null; for (const b of beats) if (b && b.do === 'cue' && b.name === n && isNum(b.t) && (r == null || b.t < r)) r = b.t; return r; };
      const from = P.from === 'focus' ? 'focus' : 'none';
      const fromIdx = from === 'focus' ? 3 : 0;

      /* ---- calendrier des étapes ---- */
      const raw = NAMES.map(cueT);
      let T = [];
      if (from === 'none' && raw.every((x) => x == null)) {
        const k = Math.min(1, (dur * 0.92) / 8.6);
        T = [0.3 * k, 1.4 * k, 3.2 * k, 5.6 * k, 7.0 * k];
      } else {
        for (let k = 0; k < NAMES.length; k++) {
          if (k < fromIdx) T[k] = NEVER;
          else if (raw[k] != null) T[k] = raw[k];
          else if (!OPTIONAL[k] && raw.slice(k + 1).some((x) => x != null)) T[k] = NEVER;
          else T[k] = null;
        }
      }

      /* ---- props ---- */
      const header = sstr(P.header, 'MANUEL DE RÉFÉRENCE DES PSYCHIATRES AMÉRICAINS · 5ᵉ ÉDITION · 2013');
      const title = sstr(P.title, "TROUBLE LIÉ AU JEU D'ARGENT");
      const count = clamp(Math.round(num(P.count, 9)), 1, 12);
      const hl = clamp(Math.round(num(P.highlight, 6)), 1, count);
      const criterion = sstr(P.criterion, "APRÈS AVOIR PERDU DE L'ARGENT AU JEU, RETOURNER SOUVENT JOUER POUR SE REFAIRE");
      const note = sstr(P.note, 'EN SUBSTANCE');
      const big = sstr(P.big, '9 CRITÈRES');
      const ink = sstr(P.ink, 'NOIR SUR BLANC');
      const sign = sstr(P.sign, 'UN SEUL SIGNE MÉRITE DÉJÀ UNE CONVERSATION');

      const uid = 'cs' + (++UID);
      const st = { T, dur, count, hl };
      const meas = mkMeasure(root);

      /* ---- fond : ink + bandes pocket (l'ombre dure ink reste lisible) ---- */
      rect(root, 0, 0, 1920, 1080, 0, C.ink);
      const bgs = g(root, { transform: 'rotate(-18 960 540)' });
      for (let k = -4; k <= 4; k++) rect(bgs, 960 + k * 300 - 70, -600, 140, 2300, 0, C.pocket);
      const defs = sv('defs', null, root);
      const mkClip = (id, x, y, h) => { const cp = sv('clipPath', { id: uid + id }, defs); return rect(cp, x, y, 0, h, 0, '#000'); };
      st.clipH = mkClip('h', LM, 70, 60);
      st.clipT = mkClip('t', LM, 115, 90);

      /* ---- la feuille (groupe incliné) ---- */
      st.sheetOut = g(root);
      const sheet = g(st.sheetOut, { transform: 'rotate(-1.5 960 430)' });
      const poly = (dx) => `M${SX0 + FOLD + dx} ${SY0 + dx} L${SX1 + dx} ${SY0 + dx} L${SX1 + dx} ${SY1 + dx} L${SX0 + dx} ${SY1 + dx} L${SX0 + dx} ${SY0 + FOLD + dx} Z`;
      path(sheet, poly(16), C.ink);
      path(sheet, poly(0), C.paper, C.ink, 8);
      path(sheet, `M${SX0} ${SY0 + FOLD} L${SX0 + FOLD} ${SY0} L${SX0 + FOLD} ${SY0 + FOLD} Z`, '#CFCABA', C.ink, 6);

      // en-tête et titre (révélés par un balayage)
      let hs = 22, hw = meas(header, hs, true);
      if (hw > 1070) { hs = Math.floor(hs * 1070 / hw * 10) / 10; }
      st.head = text(sheet, header, LM, 108, hs, C.ink, { mono: true });
      st.head.setAttribute('clip-path', `url(#${uid}h)`);
      let ts = 52, tw = meas(title, ts);
      if (tw > 1070) ts = Math.floor(ts * 1070 / tw);
      st.titleT = text(sheet, title, LM, 168, ts, C.ink);
      st.titleT.setAttribute('clip-path', `url(#${uid}t)`);
      st.filet = rect(sheet, LM, 187, 1080, 6, 0, C.ink);

      /* ---- lignes ---- */
      const rowH = count > 1 ? Math.min(NORMH, (ROWMAX - ROW0 - HLH) / (count - 1)) : NORMH;
      const r = rng(2013);
      st.rows = [];
      let y = ROW0;
      const rowY = [], rowHt = [];
      for (let i = 0; i < count; i++) { rowY[i] = y; rowHt[i] = i === hl - 1 ? HLH : rowH; y += rowHt[i]; }
      st.endY = y;
      for (let i = 0; i < count; i++) {
        const o = { y0: rowY[i], h: rowHt[i], hl: i === hl - 1 };
        o.g = g(sheet);
        const cy = o.y0 + o.h / 2;
        const lateRow = i >= count - 2;
        if (i < count - 1 || count === 1) rect(o.g, LM, o.y0 + o.h - 1, 1080, 2, 0, '#CFCABA');
        const num2 = String(i + 1).padStart(2, '0');
        text(o.g, num2, LM, cy + 10, 28, C.ink, { mono: true });
        o.box = rect(o.g, 490, cy - 17, 34, 34, 0, C.paper, C.ink, 4);
        o.bars = g(o.g);
        const two = o.hl || r() > 0.38;
        const max1 = lateRow ? 650 : 940, min1 = lateRow ? 330 : 520;
        const w1 = min1 + r() * (max1 - min1);
        const bh = 14;
        const by = two ? (o.hl ? cy - 22 : cy - 17) : cy - bh / 2;
        rect(o.bars, 556, by, w1, bh, bh / 2, C.ink);
        if (two) rect(o.bars, 556, by + 22 + (o.hl ? 8 : 0), (lateRow ? 120 : 160) + r() * (lateRow ? 330 : 520), bh, bh / 2, C.ink);
        if (o.hl) {
          o.hlRect = rect(o.g, 548, o.y0 + 4, 0, o.h - 8, 4, C.lime);
          o.g.insertBefore(o.hlRect, o.g.firstChild);
          // texte en clair, mot par mot
          const words = criterion.split(/\s+/).filter(Boolean);
          let size = 34;
          const maxW = 788 - 36;
          let lines = split2(words, meas, size);
          while (size > 24 && Math.max(meas(lines[0], size), meas(lines[1], size)) > maxW) { size -= 1; lines = split2(words, meas, size); }
          const gap = size * 0.3;
          o.words = [];
          const hy0 = o.y0 + 4;
          const lh = size * 1.35;
          const base1 = hy0 + (o.h - 8 - (size * 0.72 + lh)) / 2 + size * 0.72;
          lines.forEach((ln, li) => {
            let x = 566;
            const wl = ln.split(/\s+/).filter(Boolean);
            wl.forEach((wd) => {
              const w = meas(wd, size);
              const tn = text(o.g, wd, x, base1 + li * lh, size, C.ink, { len: f2(w) });
              tn.setAttribute('visibility', 'hidden');
              o.words.push(tn);
              x += w + gap;
            });
            if (li === 1) { o.lineEnd = x - gap; o.line2y = base1 + li * lh; }
          });
          o.size = size;
          o.under = rect(o.g, 566, o.line2y + 10, 0, 8, 0, C.ink);
          o.underW = Math.max(40, o.lineEnd - 566);
          // petit sticker « en substance »
          const nw = meas(note, 20, true) + 30;
          o.note = g(sheet);
          rect(o.note, -nw / 2 + 5, -17 + 5, nw, 34, 6, C.ink);
          rect(o.note, -nw / 2, -17, nw, 34, 6, C.white, C.ink, 4);
          text(o.note, note, 0, 7, 20, C.ink, { mono: true, anchor: 'middle', len: f2(meas(note, 20, true)) });
          o.noteX = 1440; o.noteY = o.y0 + o.h / 2;
          // coche (tracée à `one-sign`)
          o.check = path(o.g, `M${490 + 6} ${cy + 1} L${490 + 14} ${cy + 11} L${490 + 34} ${cy - 20}`, 'none', C.ink, 10);
          o.check.setAttribute('stroke-dasharray', '48 48');
          o.check.setAttribute('visibility', 'hidden');
          o.cy = cy;
        }
        st.rows.push(o);
      }
      // voiles ink 62 % sur les autres lignes
      const hr = st.rows[hl - 1];
      st.veils = [];
      if (hl > 1) st.veils.push(rect(sheet, SX0 + 4, ROW0 - 2, SX1 - SX0 - 8, hr.y0 - ROW0 + 2, 0, C.ink, null, 0, { opacity: 0, visibility: 'hidden' }));
      if (hl < count) st.veils.push(rect(sheet, SX0 + 4, hr.y0 + hr.h, SX1 - SX0 - 8, st.endY - (hr.y0 + hr.h) + 6, 0, C.ink, null, 0, { opacity: 0, visibility: 'hidden' }));
      // la ligne en clair et le sticker passent au-dessus des voiles
      sheet.appendChild(hr.g);
      sheet.appendChild(hr.note);
      st.hr = hr;

      /* ---- sticker lime « 9 CRITÈRES » ---- */
      {
        let bs = 46, bwid = meas(big, bs);
        if (bwid > 300) { bs = Math.floor(bs * 300 / bwid); bwid = meas(big, bs); }
        const w = bwid + 50, h = 92;
        st.big = g(root);
        rect(st.big, -w / 2 + 10, -h / 2 + 10, w, h, 16, C.ink);
        rect(st.big, -w / 2, -h / 2, w, h, 16, C.lime, C.paper, 6);
        text(st.big, big, 0, bs * 0.35, bs, C.ink, { anchor: 'middle', len: f2(bwid) });
        st.bigX = Math.min(1800 - w / 2, 1640);
      }

      /* ---- tampon rouge « NOIR SUR BLANC » (marge gauche) ---- */
      {
        const words = ink.split(/\s+/).filter(Boolean);
        let size = 46, lines = split2(words, meas, size);
        while (size > 24 && Math.max(meas(lines[0], size), meas(lines[1], size)) > 210) { size -= 1; lines = split2(words, meas, size); }
        const w = Math.min(252, Math.max(meas(lines[0], size), meas(lines[1], size)) + 44), h = (lines[1] ? 2 : 1) * size * 1.1 + 40;
        st.stamp = g(root);
        rect(st.stamp, -w / 2, -h / 2, w, h, 6, C.ink, C.red, 8);
        rect(st.stamp, -w / 2 + 12, -h / 2 + 12, w - 24, h - 24, 2, 'none', C.red, 3);
        const ly = lines[1] ? [-size * 0.1, size * 1.0] : [size * 0.35];
        text(st.stamp, lines[0], 0, ly[0], size, C.red, { anchor: 'middle', len: f2(meas(lines[0], size)) });
        if (lines[1]) text(st.stamp, lines[1], 0, ly[1], size, C.red, { anchor: 'middle', len: f2(meas(lines[1], size)) });
      }

      /* ---- sticker « un seul signe… » ---- */
      {
        const words = sign.split(/\s+/).filter(Boolean);
        let size = 38, lines = split2(words, meas, size);
        while (size > 24 && Math.max(meas(lines[0], size), meas(lines[1], size)) > 560) { size -= 1; lines = split2(words, meas, size); }
        const w = Math.min(640, Math.max(meas(lines[0], size), meas(lines[1], size)) + 56), h = 104;
        st.sign = g(root);
        rect(st.sign, -w / 2 + 10, -h / 2 + 10, w, h, 14, C.ink);
        rect(st.sign, -w / 2, -h / 2, w, h, 14, C.paper, C.ink, 6);
        const l0 = lines[1] ? -size * 0.2 : size * 0.35;
        text(st.sign, lines[0], 0, l0, size, C.ink, { anchor: 'middle', len: f2(meas(lines[0], size)) });
        if (lines[1]) text(st.sign, lines[1], 0, size * 0.98, size, C.ink, { anchor: 'middle', len: f2(meas(lines[1], size)) });
        st.signX = Math.min(1570, 1895 - w / 2 - 10);
      }
      meas.done();
      return st;
    },

    update(st, t) {
      try {
        t = clamp(t, 0, st.dur + 1);
        const T = st.T;
        const at = (k) => T[k] != null && t >= T[k];
        const ph = (k, d, o) => (T[k] == null ? 0 : prog(t, T[k] + (o || 0), T[k] + (o || 0) + d));

        /* feuille : arrive du bas avec rebond */
        {
          const on = at(0);
          const p = ph(0, 0.55);
          vis(st.sheetOut, on);
          setA(st.sheetOut, 'transform', `translate(0 ${f2(900 * (1 - E.back(p)))})`);
          st.clipH.setAttribute('width', f2(1080 * E.out2(ph(0, 0.35, 0.35))));
          st.clipT.setAttribute('width', f2(1080 * E.out2(ph(0, 0.35, 0.6))));
          setA(st.filet, 'width', f2(1080 * E.out3(ph(0, 0.3, 0.75))));
        }

        /* lignes en cascade (3 i d'écart) */
        for (let i = 0; i < st.rows.length; i++) {
          const o = st.rows[i];
          const ti = T[1] == null ? null : T[1] + i * 0.1;
          const on = ti != null && t >= ti;
          const p = on ? E.out3(prog(t, ti, ti + 0.2)) : 0;
          vis(o.g, on);
          setA(o.g, 'opacity', f2(p));
          setA(o.g, 'transform', `translate(${f2(-40 * (1 - p))} 0)`);
        }
        // sticker « 9 CRITÈRES »
        {
          const p = ph(1, 0.3, 0.05);
          const on = at(1);
          put(st.big, st.bigX, 150, 4, E.back(p), E.back(p), on ? clamp(p * 4) : 0);
        }

        /* focus : voile, surlignage, texte mot par mot */
        const hr = st.hr;
        {
          const tf = T[2];
          const fo = at(2);
          const vp = E.out2(ph(2, 0.2));
          for (const v of st.veils) { setA(v, 'opacity', f2(0.62 * vp)); vis(v, vp > 0.001); }
          setA(hr.hlRect, 'width', f2(788 * E.out3(ph(2, 0.3))));
          vis(hr.hlRect, fo);
          vis(hr.bars, !fo);
          const t0 = tf == null ? 0 : tf + 0.25;
          let last = -1;
          hr.words.forEach((w, k) => { const on = tf != null && t >= t0 + k * 0.12; vis(w, on); if (on) last = k; });
          const tNote = t0 + hr.words.length * 0.12;
          const np = tf == null ? 0 : E.back(prog(t, tNote, tNote + 0.25));
          const on = tf != null && t >= tNote;
          put(hr.note, hr.noteX, hr.noteY, 3, np, np, on ? 1 : 0);
        }

        /* ink : soulignement + tampon */
        {
          const p = ph(3, 8 / 30);
          setA(hr.under, 'width', f2(hr.underW * p));
          vis(hr.under, p > 0);
          const sp = ph(3, 0.2);
          const k = 1 + 0.7 * (1 - E.out3(sp));
          put(st.stamp, 200, 550, -8, k, k, at(3) ? clamp(sp * 5) : 0);
        }

        /* un seul signe : coche + sticker calme */
        {
          const p = ph(4, 6 / 30);
          vis(hr.check, p > 0);
          setA(hr.check, 'stroke-dashoffset', f2(48 * (1 - p)));
          const sp = ph(4, 0.3, 0.2);
          const k = E.out3(sp);
          put(st.sign, st.signX, 752, 2, 0.85 + 0.15 * k, 0.85 + 0.15 * k, at(4) && T[4] + 0.2 <= t ? clamp(sp * 4) : 0);
        }
      } catch (e) { /* jamais d'exception */ }
    }
  });
})();
