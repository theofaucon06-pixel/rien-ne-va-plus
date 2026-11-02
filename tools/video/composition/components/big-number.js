// Composant « big-number » : voir tools/video/composition/INTERFACE.md. Fonction pure du temps du plan, aplats seulement.
(() => {
  /* ---- aides typographiques locales (mêmes lignes dans chaque composant du rôle « Typo ») ---- */
  const { C, F, E, clamp, prog, lerp, f2, put, g, rect, text, path, line, sv, circle } = ZV;
  const COL = { ink: C.ink, paper: C.paper, lime: C.lime, red: C.red, white: C.white };
  const TINT = { ink: '#1A1A1A', lime: '#B9EC22', paper: '#E4E0D3', red: '#F0452F' };
  const NB = ' ';
  let UID = 0;
  const colOf = (k, d) => COL[k] || k || d;
  // largeur d'une chaîne (mesure réelle via un <text> caché), ramenée à `size` px
  function mkProbe(root) {
    const n = sv('text', { x: 0, y: 0, 'font-size': 100, 'font-weight': 800, visibility: 'hidden' }, root);
    const cache = {};
    return function w(str, size, o) {
      o = o || {};
      const key = (o.mono ? 'm' : 'd') + (o.sp || 0) + '|' + str;
      let v = cache[key];
      if (v === undefined) {
        n.setAttribute('font-family', o.mono ? F.mono : F.display);
        n.setAttribute('letter-spacing', (o.sp || 0) * 100);
        n.textContent = str.replace(/ /g, NB);
        try { v = n.getComputedTextLength(); } catch (e) { v = 0; }
        if (!(v > 0)) v = str.length * (o.mono ? 60 : 58);
        cache[key] = v;
      }
      return v * size / 100;
    };
  }
  // 1 234,5 : espace fine insécable pour les milliers, virgule décimale
  function fnum(v, dec) {
    const s = Math.abs(v).toFixed(dec || 0).split('.');
    const i = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return (v < 0 ? '−' : '') + i + (s[1] ? ',' + s[1] : '');
  }
  // lie ponctuation et opérateurs au mot précédent (jamais de « ? » seul en début de ligne)
  const glue = (s) => String(s).replace(/ (?=[?:%!;€¢÷×=+−])/g, NB).replace(/([÷×=+−]) (?=\S)/g, '$1' + NB);
  // coupe `str` en ≤ maxRows lignes équilibrées tenant dans maxW (null si impossible)
  function breaks(str, S, maxW, wf, maxRows) {
    if (wf(str, S) <= maxW) return [str];
    const words = str.split(' ');
    if (words.length < 2 || maxRows < 2) return null;
    let best = null, bm = 1e9;
    for (let k = 1; k < words.length; k++) {
      const a = words.slice(0, k).join(' '), b = words.slice(k).join(' ');
      const m = Math.max(wf(a, S), wf(b, S));
      if (m < bm) { bm = m; best = [a, b]; }
    }
    if (bm <= maxW) return best;
    if (maxRows >= 3 && words.length >= 3) {
      bm = 1e9; best = null;
      for (let k = 1; k < words.length - 1; k++) for (let j = k + 1; j < words.length; j++) {
        const a = words.slice(0, k).join(' '), b = words.slice(k, j).join(' '), c = words.slice(j).join(' ');
        const m = Math.max(wf(a, S), wf(b, S), wf(c, S));
        if (m < bm) { bm = m; best = [a, b, c]; }
      }
      if (bm <= maxW) return best;
    }
    return null;
  }
  // fond plat + trame de points qui dérive doucement + repères de coupe aux angles
  function backdrop(root, bgk, uid, opt) {
    opt = opt || {};
    const tint = TINT[bgk] || TINT.ink;
    const fill = bgk === 'wheel' ? C.ink : colOf(bgk, C.ink);
    rect(root, 0, 0, 1920, 1080, 0, fill);
    const o = {};
    if (opt.dots !== false) {
      const defs = sv('defs', null, root);
      o.pat = sv('pattern', { id: uid + 'd', width: 64, height: 64, patternUnits: 'userSpaceOnUse' }, defs);
      circle(o.pat, 32, 32, 3.6, tint);
      rect(root, 0, 0, 1920, 1080, 0, `url(#${uid}d)`);
    }
    if (opt.marks !== false) {
      const mc = bgk === 'ink' || bgk === 'wheel' ? '#3A3A3A' : C.ink;
      path(root, 'M56 160V56H160M1760 56H1864V160M1864 920V1024H1760M160 1024H56V920', 'none', mc, 8, { 'stroke-linecap': 'butt', 'stroke-linejoin': 'miter' });
    }
    return o;
  }
  const drift = (o, t) => { if (o && o.pat) o.pat.setAttribute('patternTransform', `translate(${f2(t * 14)} ${f2(t * 9)})`); };
  // pastille Mono (kicker) : fond/texte selon l'aplat
  function pill(parent, str, bgk, size, W) {
    const dark = bgk === 'ink' || bgk === 'wheel';
    const fill = dark ? C.lime : C.ink;
    const tc = dark ? C.ink : (bgk === 'lime' ? C.lime : C.paper);
    const sp = 0.1;
    const w = W(str, size, { mono: true, sp }) + 64, h = size * 1.7;
    const gr = g(parent);
    rect(gr, -w / 2 + 7, -h / 2 + 7, w, h, 14, C.ink);
    rect(gr, -w / 2, -h / 2, w, h, 14, fill, C.ink, 5);
    text(gr, str, 0, size * 0.35, size, tc, { mono: true, anchor: 'middle', spacing: f2(sp * size) });
    return { g: gr, w, h };
  }
  // Définition d'un composant : `build` (une fois) / `draw` (pure). La mise en page dépend des mesures de police :
  // si les polices ne sont pas encore chargées à l'init, on reconstruit dès qu'elles le sont (puis on redessine).
  const FONTS = ['800 100px "Bricolage Grotesque"', '800 100px "JetBrains Mono"'];
  const fontsOk = () => { try { return FONTS.every((f) => document.fonts.check(f)); } catch (e) { return true; } };
  function defineTypo(id, impl) {
    const rebuild = (st) => {
      while (st.root.firstChild) st.root.removeChild(st.root.firstChild);
      st.s = impl.build(st.root, st.shot);
      st.ok = true;
      if (st.last !== null) impl.draw(st.s, st.last, st.shot);
    };
    ZV.define(id, {
      init(root, shot) {
        const st = { root, shot, last: null, ok: fontsOk() };
        st.s = impl.build(root, shot);
        if (!st.ok) { try { Promise.all(FONTS.map((f) => document.fonts.load(f))).then(() => { if (!st.ok && fontsOk()) rebuild(st); }); } catch (e) { /* tant pis */ } }
        return st;
      },
      update(st, t, shot) {
        st.last = t;
        if (!st.ok && fontsOk()) rebuild(st);
        impl.draw(st.s, t, shot || st.shot);
      }
    });
  }

  const FR = 1 / 30;
  const SPN = -0.02;                                  // tracking du gros chiffre (em)
  const BGS = ['ink', 'lime', 'paper', 'red'];

  defineTypo('big-number', {
    build(root, shot) {
      const P = shot.props || {};
      const mode = ['count', 'type', 'equation', 'split'].includes(P.mode) ? P.mode : 'count';
      const bgk = BGS.includes(P.bg) ? P.bg : 'ink';
      const dark = bgk === 'ink';
      const uid = 'bn' + (++UID);
      const W = mkProbe(root);
      const st = { shot, mode, bgk, dark, uid, W, P };
      const fg = colOf(P.color, dark ? C.paper : C.ink);
      const cue = (n, d) => { const v = ZV.cue(shot, n); return v === null ? d : v; };
      st.fg = fg;
      // pastille de survol (plaque) : lime sur sombre/papier/rouge, encre sur lime
      st.plateFill = bgk === 'lime' ? C.ink : C.lime;
      st.plateText = bgk === 'lime' ? C.lime : C.ink;

      if (mode === 'split') {
        st.bd = backdrop(root, bgk, uid, { marks: false });
        const items = (P.split || []).slice(0, 2);
        st.halves = items.map((it, i) => {
          const hb = BGS.includes(it.bg) ? it.bg : (i ? 'red' : 'lime');
          const gh = g(root);
          // fond du demi-écran (aplat + trame) ; le groupe glisse depuis le bord
          rect(gh, i ? 960 : 0, 0, 960, 1080, 0, colOf(hb));
          const pg = sv('defs', null, gh), pat = sv('pattern', { id: uid + 'h' + i, width: 64, height: 64, patternUnits: 'userSpaceOnUse' }, pg);
          circle(pat, 32, 32, 3.6, TINT[hb] || TINT.ink);
          rect(gh, i ? 960 : 0, 0, 960, 1080, 0, `url(#${uid}h${i})`);
          const cxh = i ? 1440 : 480;
          const pl = it.kicker ? pill(gh, String(it.kicker).toUpperCase(), hb, 40, W) : null;
          if (pl) put(pl.g, cxh, 262, 0, 1, 1, 1);
          // valeur : lignes équilibrées dans la demi-largeur
          const str = String(it.value || '').replace(/(\d) (?=[\d€%¢A-Z])/g, '$1' + NB).replace(/([−+×=]) (?=\S)/g, '$1' + NB);
          const wf = (s, S) => W(s, S, { sp: SPN });
          let S = 200, rows = null;
          for (; S > 50; S *= 0.96) { rows = breaks(str, S, 780, wf, 2); if (rows && (rows.length - 1) * 1.02 * S + 0.74 * S <= 400) break; rows = null; }
          if (!rows) { S = 50; rows = [str]; }
          const vg = g(gh);
          const h = (rows.length - 1) * 1.02 * S + 0.74 * S;
          rows.forEach((r, k) => {
            const rw = wf(r, S);
            text(vg, r.replace(/ /g, NB), -rw / 2, -h / 2 + 0.74 * S + k * 1.02 * S, S, colOf(it.color, C.ink), { spacing: f2(SPN * S) });
          });
          return { g: gh, vg, cx: cxh, cy: 560, i, t: cue(it.cue || (i ? 'right' : 'left'), i * 1.9), pl };
        });
        const dv = g(root); rect(dv, 953, 0, 14, 1080, 0, C.ink); st.divider = dv;
        return st;
      }

      st.bd = backdrop(root, bgk, uid, {});
      // kicker
      const kick = P.kicker ? pill(root, String(P.kicker).toUpperCase(), bgk, 42, W) : null;
      st.kick = kick;
      st.tKick = (mode === 'type' && ZV.cue(shot, 'label') !== null && !P.label) ? ZV.cue(shot, 'label') : 0.05;
      // étiquette
      if (P.label) {
        const str = String(P.label).toUpperCase(), size = 58, w = W(str, size, { sp: 0.02 }) + 70, h = size * 1.7;
        const gr = g(root);
        const lf = bgk === 'paper' ? C.ink : C.paper, lt = bgk === 'paper' ? C.paper : C.ink;
        rect(gr, -w / 2 + 10, -h / 2 + 10, w, h, 16, C.ink);
        rect(gr, -w / 2, -h / 2, w, h, 16, lf, C.ink, 6);
        text(gr, str, 0, size * 0.35, size, lt, { anchor: 'middle', spacing: f2(0.02 * size) });
        st.label = { g: gr, x: 960, y: 786, auto: true };
      }

      if (mode === 'count') {
        const from = typeof P.from === 'number' ? P.from : 0, to = typeof P.to === 'number' ? P.to : 0, dec = P.decimals || 0;
        st.from = from; st.to = to; st.dec = dec;
        const pre = P.prefix ? String(P.prefix).trim() : '', suf = P.suffix ? String(P.suffix).trim() : '';
        const finalS = fnum(to, dec);
        const lens = Math.max(fnum(from, dec).length, finalS.length);
        // largeur de cellule : chiffres tabulaires
        const wd = (S) => Math.max(...'0123456789'.split('').map((d) => W(d, S, { sp: SPN })));
        const cw = (ch, S) => (/\d/.test(ch) ? wd(S) : ch === ' ' ? 0.22 * S : W(ch, S, { sp: SPN }));
        const wnum = (s, S) => { let a = 0; for (const ch of s) a += cw(ch, S); return a; };
        const preW = (S) => (pre ? (pre === '≈' ? 0.82 * S : W(pre, S, { sp: SPN })) + 0.22 * S : 0);
        const sufW = (S) => (suf ? W(suf, S, { sp: SPN }) + 0.24 * S : 0);
        const maxNum = (S) => Math.max(wnum(fnum(from, dec), S), wnum(finalS, S));
        let S = 360;
        while (S > 80 && preW(S) + maxNum(S) + sufW(S) > 1640) S *= 0.97;
        st.S = S; st.cw = (ch) => cw(ch, S); st.preW = preW(S); st.sufW = sufW(S); st.pre = pre; st.suf = suf;
        st.maxNumW = maxNum(S);
        const totalFinal = preW(S) + wnum(finalS, S) + sufW(S);
        st.xr = 960 + totalFinal / 2 - sufW(S);        // bord droit du nombre (fixe)
        st.xc = 960 + (totalFinal - 0) / 2;
        st.gy = 520; st.by = 0.36 * S;
        // plaque (surlignage) derrière le nombre, dans le groupe animé
        const gn = g(root);
        const pw = totalFinal + 90;
        st.plate = g(gn);
        rect(st.plate, -pw / 2 + 12, -0.46 * S + 12 - 0.0, pw, 1.1 * S, 22, C.ink);
        rect(st.plate, -pw / 2, -0.46 * S, pw, 1.1 * S, 22, st.plateFill, C.ink, 8);
        st.plateW = pw;
        st.underline = rect(gn, -totalFinal / 2, 0.66 * S, totalFinal, 0.1 * S, 6, fg === C.red ? C.red : C.lime);
        st.gn = gn;
        st.chars = [];
        for (let i = 0; i < lens; i++) st.chars.push(text(gn, '', 0, st.by, S, fg, { anchor: 'middle', spacing: f2(SPN * S) }));
        st.preNode = null;
        if (pre === '≈') { st.preNode = path(gn, '', 'none', fg, 0.075 * S); }
        else if (pre) st.preNode = text(gn, pre, 0, st.by, S, fg, { spacing: f2(SPN * S) });
        st.sufNode = suf ? text(gn, suf, 0, st.by, S, fg, { spacing: f2(SPN * S) }) : null;
        st.totalFinal = totalFinal;
        st.go = cue('go', 0); st.land = ZV.cue(shot, 'land'); const lb = ZV.cue(shot, 'label');
        st.end = st.land !== null ? st.land : lb !== null ? lb : Math.min(shot.dur - 0.3, st.go + 1.2);
        if (st.end <= st.go + 0.2) st.end = st.go + 0.6;
        st.jit = !!(shot.beats.find((b) => b.do === 'cue' && b.name === 'go' && b.jitter));
        st.tLabel = lb !== null ? lb : st.end + 0.15;
        st.hl = fg !== C.red;
        if (st.label) st.label.y = Math.min(808, 520 + 0.64 * S + 115);
        return st;
      }

      if (mode === 'type') {
        const str = String(P.text || '').toUpperCase();
        const wf = (s, S) => W(s, S, { sp: SPN });
        let S = 300, rows = null;
        for (; S > 60; S *= 0.96) { rows = breaks(str.replace(/(\d) (?=\d)/g, '$1' + NB), S, 1600, wf, 2); if (rows && (rows.length - 1) * 1.04 * S + 0.74 * S <= 420) break; rows = null; }
        if (!rows) { S = 60; rows = [str]; }
        st.S = S;
        const h = (rows.length - 1) * 1.04 * S + 0.74 * S, top = 520 - h / 2;
        const gt = g(root); st.gt = gt;
        st.chars = [];
        let idx = 0, seenSur = false;
        rows.forEach((r, k) => {
          const rw = wf(r, S), x0 = 960 - rw / 2, by = top + 0.74 * S + k * 1.04 * S;
          let acc = '';
          for (const ch of r) {
            // le nombre final (après « SUR ») en lime
            const isNum = seenSur && /[\d  ]/.test(ch);
            const nd = text(gt, ch === ' ' ? NB : ch, x0 + wf(acc, S), by, S, isNum && !dark ? (bgk === 'lime' ? C.ink : C.ink) : isNum ? C.lime : fg, { spacing: f2(SPN * S) });
            if (isNum && !dark) nd.setAttribute('fill', bgk === 'paper' ? C.ink : C.ink);
            st.chars.push({ n: nd, x: x0 + wf(acc, S), w: wf(ch, S), y: by });
            acc += ch;
            idx++;
          }
          if (/SUR\s*$/.test(r.replace(/ /g, ' '))) seenSur = true;
          else if (/(^|\s)SUR(\s|$)/.test(r.replace(/ /g, ' ')) ) seenSur = true;
        });
        // recoloration fiable : tout après le mot SUR
        const full = rows.join(' ').replace(/ /g, ' ');
        const cut = full.indexOf(' SUR ');
        const flat = rows.join('');
        st.chars.forEach((c, i) => { /* indices alignés sur rows.join('') */ });
        let pos = 0;
        const flatStr = rows.join('');
        const surAt = flatStr.replace(/ /g, ' ').indexOf('SUR');
        st.chars.forEach((c, i) => { c.n.setAttribute('fill', surAt >= 0 && i >= surAt + 3 ? (dark ? C.lime : C.ink) : fg); });
        st.cursor = rect(gt, 0, 0, S * 0.36, S * 0.78, 0, dark ? C.lime : C.ink);
        st.n = st.chars.length;
        st.tGo = cue('go', 0);
        st.hlPlate = null;
        return st;
      }

      // ---- equation ----
      const toks = (P.tokens || []).map((tk, i) => ({ text: String(tk.text || '').toUpperCase(), cue: tk.cue || ('t' + (i + 1)), color: tk.color, i }));
      const wf = (s, S) => W(s, S, { sp: SPN });
      let S = 190;
      const strs = toks.map((tk) => tk.text.replace(/(\d) (?=\d)/g, '$1' + NB));
      for (; S > 60; S *= 0.96) { const mw = Math.max(...strs.map((s) => wf(s, S))); if (mw <= 1500 && toks.length * 1.18 * S <= 620) break; }
      const mw = Math.max(...strs.map((s) => wf(s, S)));
      const x0 = 960 - mw / 2, pitch = 1.2 * S;
      const top = 500 - (toks.length * pitch) / 2 + 0.1 * S;
      st.S = S; st.toks = toks.map((tk, i) => {
        const gr = g(root), by = top + i * pitch + 0.8 * S;
        const last = i === toks.length - 1 && toks.length > 1;
        const w = wf(strs[i], S);
        if (last) { rect(gr, x0 - 24 + 12, -0.92 * S + 12, mw + 48, 1.26 * S, 20, C.ink); rect(gr, x0 - 24, -0.92 * S, mw + 48, 1.26 * S, 20, st.plateFill, C.ink, 8); }
        const op = /^[×=+−]/.test(strs[i]) ? strs[i][0] : null;
        if (op) {
          const ow = wf(op + NB, S);
          text(gr, op, x0, 0, S, last ? st.plateText : C.red, { spacing: f2(SPN * S) });
          text(gr, strs[i].slice(2).replace(/ /g, NB), x0 + ow, 0, S, last ? st.plateText : colOf(tk.color, fg), { spacing: f2(SPN * S) });
        } else text(gr, strs[i].replace(/ /g, NB), x0, 0, S, last ? st.plateText : colOf(tk.color, fg), { spacing: f2(SPN * S) });
        if (last) rect(gr, x0 - 24, -1.04 * S, mw + 48, 10, 4, fg);   // trait de somme
        return { g: gr, y: by, t: cue(tk.cue, i * 0.9), last };
      });
      return st;
    },

    draw(st, t, shot) {
      drift(st.bd, t);
      const { mode } = st;
      const popK = () => { if (st.kick) { const p = ZV.E.back(clamp((t - st.tKick) / (8 * FR))); put(st.kick.g, 960, 212, 0, p, p, t >= st.tKick ? 1 : 0); } };
      const popL = (tl) => { if (st.label) { const p = ZV.E.back(clamp((t - tl) / (8 * FR))); put(st.label.g, st.label.x, st.label.y, -2 + (1 - p) * -6, p, p, t >= tl ? 1 : 0); } };

      if (mode === 'split') {
        for (const h of st.halves) {
          const tt = t - h.t, p = ZV.E.out3(clamp(tt / (6 * FR)));
          const off = (1 - p) * (h.i ? 960 : -960);
          h.g.setAttribute('transform', `translate(${f2(off)} 0)`);
          h.g.setAttribute('visibility', tt >= 0 ? 'visible' : 'hidden');
          const q = clamp((tt - 5 * FR) / (4 * FR)), s = lerp(1.35, 1, ZV.E.out3(q));
          const [sx, sy] = ZV.shakeAt(tt, 9 * FR, 10, 0.4);
          put(h.vg, h.cx + sx, h.cy + sy, 0, s, s, tt >= 5 * FR ? 1 : 0);
        }
        const r = st.halves[1];
        st.divider.setAttribute('visibility', r && t >= r.t ? 'visible' : 'hidden');
        return;
      }
      popK();

      if (mode === 'count') {
        const S = st.S, { go, end } = st;
        let v;
        if (t <= go) v = st.from;
        else if (t >= end) v = st.to;
        else {
          const p = (t - go) / (end - go);
          if (st.jit) {
            const base = lerp(st.from, st.to, ZV.E.out2(p));
            const amp = (st.from - st.to) * 1.6 * Math.pow(1 - p, 1.4);
            v = base + amp * 0.5 * (Math.sin(t * 31) * 0.6 + Math.sin(t * 17 + 1.3) * 0.4);
          } else v = lerp(st.from, st.to, Math.pow(p, 2.1));
        }
        const cs = fnum(v, st.dec);
        // nombre centré, chiffres tabulaires (cellules de largeur fixe)
        let numW = 0; for (const ch of cs) numW += st.cw(ch);
        const hasPre = !!st.pre, total = (hasPre ? st.preW : 0) + numW + st.sufW;
        let xx = -total / 2;
        if (st.preNode) {
          if (st.pre === '≈') {
            const w = 0.7 * S, x1 = xx, yy = st.by - 0.34 * S;
            st.preNode.setAttribute('d', `M${f2(x1)} ${f2(yy - 0.11 * S)}q${f2(w * 0.25)} ${f2(-0.12 * S)} ${f2(w * 0.5)} 0t${f2(w * 0.5)} 0M${f2(x1)} ${f2(yy + 0.11 * S)}q${f2(w * 0.25)} ${f2(-0.12 * S)} ${f2(w * 0.5)} 0t${f2(w * 0.5)} 0`);
          } else st.preNode.setAttribute('x', f2(xx));
          xx += st.preW;
        }
        for (let i = 0; i < st.chars.length; i++) {
          const nd = st.chars[i], ch = cs[i];
          if (ch === undefined) { nd.setAttribute('visibility', 'hidden'); nd.setAttribute('x', 0); nd.textContent = ''; continue; }
          const w = st.cw(ch);
          nd.setAttribute('visibility', 'visible');
          nd.textContent = ch;
          nd.setAttribute('x', f2(xx + w / 2));
          xx += w;
        }
        if (st.sufNode) st.sufNode.setAttribute('x', f2(xx + 0.24 * S));
        // arrivée : claque + surlignage
        const land = st.end, tl = t - land;
        let s = 1, sx = 0, sy = 0;
        if (tl >= 0) { s = lerp(1.08, 1, ZV.E.out3(clamp(tl / (6 * FR)))); const sh = ZV.shakeAt(tl, 0, 8, 0.4); sx = sh[0]; sy = sh[1]; }
        else if (t > go && t < end) { s = 1 + 0.0; }
        const on = tl >= 0 && st.hl;
        const pq = ZV.E.out3(clamp(tl / (5 * FR)));
        put(st.plate, 0, 0, 0, on ? pq : 0, 1, on ? 1 : 0);
        const col = on ? st.plateText : st.fg;
        for (const nd of st.chars) nd.setAttribute('fill', col);
        if (st.preNode) { st.preNode.setAttribute(st.pre === '≈' ? 'stroke' : 'fill', col); }
        if (st.sufNode) st.sufNode.setAttribute('fill', col);
        const uq = st.hl ? 0 : ZV.E.out3(clamp(tl / (6 * FR)));
        st.underline.setAttribute('width', f2(st.totalFinal * uq)); st.underline.setAttribute('visibility', uq > 0 ? 'visible' : 'hidden');
        put(st.gn, 960 + sx, st.gy + sy, 0, s, s, 1);
        popL(st.tLabel);
        return;
      }

      if (mode === 'type') {
        const S = st.S, tg = st.tGo;
        const natural = st.n * 2 * FR, tdur = Math.max(0.5, Math.min(natural, shot.dur - tg - 0.5));
        const q = t < tg ? 0 : clamp((t - tg) / tdur);
        const k = Math.floor(q * st.n + 1e-6);
        st.chars.forEach((c, i) => c.n.setAttribute('visibility', i < k ? 'visible' : 'hidden'));
        const cur = k > 0 ? st.chars[k - 1] : null;
        const nxt = k < st.n ? st.chars[k] : null;
        let cx, cy;
        if (nxt && (!cur || Math.abs(nxt.y - cur.y) < 1)) { cx = nxt.x; cy = nxt.y; }
        else if (nxt) { cx = nxt.x; cy = nxt.y; }
        else { cx = cur.x + cur.w; cy = cur.y; }
        const blink = q < 1 || Math.floor((t - tg - tdur) / 0.3) % 2 === 0;
        st.cursor.setAttribute('visibility', blink ? 'visible' : 'hidden');
        st.cursor.setAttribute('x', f2(cx + S * 0.03)); st.cursor.setAttribute('y', f2(cy - S * 0.76));
        // petit claquement à la fin de la frappe
        const te = tg + tdur, tl = t - te;
        let s = 1, sx = 0, sy = 0;
        if (tl >= 0 && tl < 0.4) { s = lerp(1.05, 1, ZV.E.out3(clamp(tl / (6 * FR)))); const sh = ZV.shakeAt(tl, 0, 6, 0.3); sx = sh[0]; sy = sh[1]; }
        put(st.gt, 960 + sx - 960 * s + 960 * (s - 1) * 0, 0, 0, 1, 1, 1);
        st.gt.setAttribute('transform', `translate(${f2(960 + sx)} ${f2(540 + sy)}) scale(${f2(s)}) translate(-960 -540)`);
        popL(ZV.cue(shot, 'label') !== null && st.label ? ZV.cue(shot, 'label') : te + 0.15);
        return;
      }

      // equation : le bloc visible reste centré (il remonte à chaque nouvelle ligne)
      let kEff = 0; for (const tk of st.toks) kEff += ZV.E.out3(clamp((t - tk.t) / 0.4));
      const sh0 = (st.toks.length - kEff) * 1.2 * st.S / 2;
      for (const tk of st.toks) {
        const tt = t - tk.t;
        if (tt < 0) { put(tk.g, 0, tk.y, 0, 1, 1, 0); continue; }
        const p = clamp(tt / 0.45), dy = (1 - ZV.E.bounce(p)) * (tk.y + 160) - sh0;
        let sx = 0, sy = 0; if (tk.last) { const sh = ZV.shakeAt(tt, 0.3, 8, 0.4); sx = sh[0]; sy = sh[1]; }
        put(tk.g, sx, tk.y - dy + sy, 0, 1, 1, 1);
      }
      popL(st.toks.length ? st.toks[st.toks.length - 1].t + 0.5 : 0);
    }
  });
  // largeur d'un préfixe texte (hors ≈)
  function W_(st, s) { return st.W(s, st.S, { sp: SPN }); }
})();
