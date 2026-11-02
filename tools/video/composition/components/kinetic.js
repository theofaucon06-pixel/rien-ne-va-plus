// Composant « kinetic » : voir tools/video/composition/INTERFACE.md. Fonction pure du temps du plan, aplats seulement.
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
  const NSP = -0.04;                       // tracking en em
  // fond « roue » : cylindre simplifié qui tourne derrière un voile ink 62 %
  function wheelBg(parent) {
    const gr = g(parent), R2 = 640, R1 = 470, n = 37, step = 360 / n;
    circle(gr, 0, 0, R2 + 28, C.ink, C.paper, 10);
    const pt = (r, a) => `${f2(r * Math.cos(a * ZV.D2R))} ${f2(r * Math.sin(a * ZV.D2R))}`;
    for (let i = 0; i < n; i++) {
      const a0 = i * step - step / 2 - 90, a1 = a0 + step, k = ZV.colorOf(ZV.ORDER[i]);
      path(gr, `M${pt(R1, a0)}L${pt(R2, a0)}A${R2} ${R2} 0 0 1 ${pt(R2, a1)}L${pt(R1, a1)}A${R1} ${R1} 0 0 0 ${pt(R1, a0)}Z`, k === 'lime' ? C.lime : k === 'red' ? C.red : C.pocket, C.paper, 4);
      const am = (a0 + a1) / 2, tg = g(gr);
      text(tg, String(ZV.ORDER[i]), 0, 13, 40, k === 'lime' ? C.ink : C.paper, { mono: true, anchor: 'middle' });
      tg.setAttribute('transform', `translate(${pt(555, am)}) rotate(${f2(am + 90)})`);
    }
    circle(gr, 0, 0, R1, C.pocket, C.paper, 8);
    circle(gr, 0, 0, 250, '#222', C.paper, 6);
    circle(gr, 0, 0, 70, C.paper, C.ink, 6);
    return gr;
  }

  defineTypo('kinetic', {
    build(root, shot) {
      const P = shot.props || {};
      const bgk = ['ink', 'lime', 'paper', 'red', 'wheel'].includes(P.bg) ? P.bg : 'ink';
      const uid = 'kn' + (++UID);
      const W = mkProbe(root);
      const wf = (s, S) => W(s, S, { sp: NSP });
      const dark = bgk === 'ink' || bgk === 'wheel';
      const st = { shot, bgk, lines: [], uid, W, dark };
      const bd = backdrop(root, bgk, uid, { dots: bgk !== 'wheel', marks: true });
      st.bd = bd;
      if (bgk === 'wheel') { st.wheel = wheelBg(root); rect(root, 0, 0, 1920, 1080, 0, C.ink, null, 0, { opacity: 0.62 }); }

      const align = P.align === 'left' ? 'left' : 'center';
      const cx = 960, x0 = 170, maxW = align === 'left' ? 1580 : 1600;
      const defs = (P.lines || []).map((l, i) => {
        const style = ['slam', 'pop', 'type', 'stack', 'stamp', 'label'].includes(l.style) ? l.style : 'pop';
        let kc = l.color || (dark ? 'paper' : 'ink');
        const plate = kc === 'lime' && (bgk === 'paper' || bgk === 'lime') && style !== 'stamp' && style !== 'label';
        return { i, l, style, kc, plate, str: glue(String(l.text || '').toUpperCase()), cue: l.cue || ('l' + (i + 1)) };
      });
      const bubbleLine = P.bubble && defs.length ? defs[0] : null;
      const stack = defs.filter((d) => d !== bubbleLine);

      // ---- calcul de la mise en page ----
      const topY = 120, botY = 840;
      const kH = P.kicker ? 124 : 0, ballH = P.ball ? 236 : 0;
      // bulle (phrase entendue)
      let bubH = 0, bubS = 0, bubRows = null;
      if (bubbleLine) {
        for (bubS = 190; bubS > 50; bubS *= 0.95) { bubRows = breaks(bubbleLine.str, bubS, 1460, wf, 3); if (bubRows && bubRows.length * bubS * 0.98 <= 360) break; bubRows = null; }
        if (!bubRows) { bubS = 52; bubRows = [bubbleLine.str]; }
        bubH = (bubRows.length - 1) * 0.97 * bubS + 0.72 * bubS + 2 * 54 + 70 + 44;
      }
      const availH = botY - topY - kH - ballH - bubH;
      const base = [0, 420, 260, 200, 150, 125][Math.min(stack.length, 5)] || 120;
      const pad = (d) => (d.style === 'stamp' ? [70, 44] : d.plate ? [46, 26] : d.style === 'label' ? [56, 30] : [0, 0]);
      const fit = (S, maxRows) => {
        const out = []; let H = 0;
        for (const d of stack) {
          const [px, py] = pad(d);
          const Si = S * (d.style === 'slam' && stack.length > 1 ? 1.4 : 1);       // la chute (slam) est plus grosse
          const rows = breaks(d.str, Si, maxW - 2 * px, wf, d.style === 'label' ? 1 : maxRows);
          if (!rows) return null;
          const h = (rows.length - 1) * 0.97 * Si + 0.72 * Si;
          const pyy = d.style === 'stamp' ? py + 0.07 * Math.max(...rows.map((r) => wf(r, Si))) : py;
          out.push({ rows, h, px, py: pyy, S: Si });
          H += h + 2 * pyy;
        }
        H += Math.max(0, stack.length - 1) * 0.46 * S;
        return H <= availH ? { out, H } : null;
      };
      let S1 = 0, S2 = 0, f1 = null, f2_ = null;
      for (let S = base; S > 40; S *= 0.97) { const f = fit(S, 1); if (f) { S1 = S; f1 = f; break; } }
      for (let S = base; S > 40; S *= 0.97) { const f = fit(S, 3); if (f) { S2 = S; f2_ = f; break; } }
      let S = S2, F_ = f2_;
      if (f1 && S1 >= (stack.some((d) => d.style === 'stamp') ? 0.5 : 0.74) * S2) { S = S1; F_ = f1; }
      if (!F_) { S = 40; F_ = { out: stack.map((d) => ({ rows: [d.str], h: 0.72 * 40, px: 0, py: 0, S: 40 })), H: 40 * stack.length }; }

      const total = kH + ballH + bubH + (stack.length ? F_.H : 0);
      let y = clamp(484 - total / 2, topY - 6, 400);
      if (P.kicker) {
        const pl = pill(root, String(P.kicker).toUpperCase(), bgk, 42, W);
        const kx = align === 'left' ? x0 + pl.w / 2 : cx;
        st.kicker = { g: pl.g, x: kx, y: y + pl.h / 2 };
        y += kH;
      }
      if (P.ball) {
        const gr = g(root);
        const bg_ = g(gr);
        circle(bg_, 9, 9, 76, C.ink);
        circle(bg_, 0, 0, 76, C.white, C.ink, 8);
        path(bg_, 'M-46 -30A56 56 0 0 1 -12 -58', 'none', '#CFCFCF', 9);
        const tr = g(root);
        [[1062, y + 20, 10], [1100, y - 14, 15], [1156, y - 60, 24]].forEach(([tx, ty, tr_]) => circle(tr, tx, ty, tr_, C.white, C.ink, 5));
        st.ball = { g: gr, x: cx, y: y + 78, trail: tr.childNodes, trailG: tr };
        y += ballH;
      }
      const mkLine = (d, S_, rows, h, px, py, gx, gy, inBubble) => {
        const gr = g(root);
        const wmax = Math.max(...rows.map((r) => wf(r, S_)));
        const L = { d, g: gr, S: S_, rows: [], gx, gy, w: wmax, h, px, py, style: d.style, tCue: 0, bub: !!inBubble, n: rows.join('').length };
        L.t0 = ZV.cue(shot, d.cue);
        if (L.t0 === null) L.t0 = 0.1 + d.i * 0.5;
        const nxt = shot.beats.filter((b) => b.do === 'cue' && b.t > L.t0 + 0.05).map((b) => b.t);
        L.win = (nxt.length ? Math.min(...nxt) : shot.dur) - L.t0;
        const kcol = colOf(d.kc);
        let tcol = kcol;
        // décor derrière le texte
        if (inBubble) {
          const bw = wmax + 2 * 70, bh = h + 2 * 54, ty = bh / 2 + 56;
          rect(gr, -bw / 2 + 14, -bh / 2 + 14, bw, bh, 50, C.ink);
          path(gr, `M${-bw / 2 + 120} ${bh / 2 - 3}L${-bw / 2 + 70} ${bh / 2 + 112}L${-bw / 2 + 280} ${bh / 2 - 3}Z`, C.paper, C.ink, 8);
          rect(gr, -bw / 2, -bh / 2, bw, bh, 50, C.paper, C.ink, 8);
          line(gr, -bw / 2 + 132, bh / 2 + 1, -bw / 2 + 264, bh / 2 + 1, C.paper, 14, { 'stroke-linecap': 'butt' });
          L.bubTop = -bh / 2; L.bubBot = bh / 2;
          tcol = C.ink;
        } else if (d.style === 'stamp') {
          const bw = wmax + 2 * px, bh = h + 88;
          rect(gr, -bw / 2 + 12, -bh / 2 + 12, bw, bh, 18, C.ink);
          rect(gr, -bw / 2, -bh / 2, bw, bh, 18, C.ink, kcol, 10);
          rect(gr, -bw / 2 + 22, -bh / 2 + 22, bw - 44, bh - 44, 8, 'none', kcol, 4);
          L.tilt = typeof d.l.tilt === 'number' ? d.l.tilt : -8;
        } else if (d.plate) {
          const bw = wmax + 2 * px, bh = h + 2 * py;
          rect(gr, -bw / 2 + 12, -bh / 2 + 12, bw, bh, 22, C.ink);
          rect(gr, -bw / 2, -bh / 2, bw, bh, 22, C.lime, C.ink, 8);
          tcol = C.ink;
        } else if (d.style === 'label') {
          const bw = wmax + 2 * px, bh = h + 2 * py;
          L.band = rect(gr, -bw / 2, -bh / 2, bw, bh, 16, kcol === C.ink ? C.ink : kcol, null, 0);
          L.bandW = bw;
          L.bandX = -bw / 2;
          line(gr, -bw / 2, -bh / 2 + 10, bw / 2, -bh / 2 + 10, '#4A4A4A', 3, { 'stroke-linecap': 'butt' });
          line(gr, -bw / 2, bh / 2 - 10, bw / 2, bh / 2 - 10, '#4A4A4A', 3, { 'stroke-linecap': 'butt' });
          [-1, 1].forEach((sd) => circle(gr, sd * (bw / 2 - 24), 0, 9, dark ? C.ink : C.paper));
          tcol = C.paper;
          L.tilt = -2;
        }
        L.tcol = tcol;
        const lead = h / -2 + 0.72 * S_;
        rows.forEach((r, k) => {
          const rw = wf(r, S_);
          const rx = align === 'left' || inBubble && false ? -wmax / 2 : -rw / 2;
          const ry = lead + k * 0.97 * S_;
          const row = { str: r, x: inBubble ? -rw / 2 : rx, y: ry, w: rw, off: rows.slice(0, k).join('').length };
          if (d.style === 'label') row.shadow = text(gr, r.replace(/ /g, NB), row.x + 4, ry + 5, S_, '#6A6A6A', { spacing: f2(NSP * S_) });
          if (d.style !== 'label' && d.style !== 'stamp' && !inBubble && !d.plate && d.kc === 'red' && (bgk === 'lime' || bgk === 'paper')) row.shadow = text(gr, r.replace(/ /g, NB), row.x + S_ * 0.04, ry + S_ * 0.04, S_, C.ink, { spacing: f2(NSP * S_) });
          const hl = !(d.style === 'type' || d.style === 'label' || d.plate || inBubble);
          const re = /[\u2212+]?\d+(?:[,.]\d+)?(?:\u00A0(?:%|\u00F7\u00A0\d+(?:[,.]\d+)?))?/g;
          let m, last = 0, any = false; const parts = []; row.plates = [];
          if (hl) while ((m = re.exec(r))) { if (m.index > last) parts.push([r.slice(last, m.index), 0]); parts.push([m[0], 1]); last = m.index + m[0].length; any = true; }
          if (any) {
            if (last < r.length) parts.push([r.slice(last), 0]);
            const hf = bgk === 'lime' ? C.ink : bgk === 'red' ? C.paper : C.lime, ht = bgk === 'lime' ? C.lime : C.ink;
            let acc = '';
            for (const [ps, on] of parts) {
              if (on) { const pw = wf(ps, S_), px_ = row.x + wf(acc, S_); row.plates.push(rect(gr, px_ - 11, ry - 0.84 * S_, pw + 22, 1.0 * S_, 14, hf, C.ink, 6)); }
              acc += ps;
            }
            row.node = text(gr, '', row.x, ry, S_, tcol, { spacing: f2(NSP * S_) }); 
            for (const [ps, on] of parts) { const ts = sv('tspan', on ? { fill: ht } : {}, row.node); ts.textContent = ps.replace(/ /g, NB); }
          } else row.node = text(gr, r.replace(/ /g, NB), row.x, ry, S_, tcol, { spacing: f2(NSP * S_) });
          L.rows.push(row);
        });
        if (d.style === 'type' || d.style === 'label') {
          L.cursor = rect(gr, 0, 0, S_ * 0.34, S_ * 0.78, 0, d.style === 'label' ? C.paper : (inBubble ? C.ink : (dark ? C.lime : C.ink)));
        }
        // barre rouge « strike-lN »
        L.strikes = L.rows.map((r) => line(gr, r.x - 14, r.y - S_ * 0.28, r.x - 14, r.y - S_ * 0.28, C.red, 18));
        L.ts = ZV.cue(shot, 'strike-' + d.cue);
        // éclats d'impact (slam / stamp)
        if (d.style === 'slam' || d.style === 'stamp') {
          L.burst = [];
          const bgc = dark ? C.lime : (bgk === 'red' ? C.paper : C.ink);
          const rg = ZV.rng(7 + d.i * 13);
          for (let k = 0; k < 14; k++) L.burst.push({ n: line(gr, 0, 0, 0, 0, bgc, 10), a: (k / 14) * Math.PI * 2 + (rg() - 0.5) * 0.25, l: 36 + rg() * 40 });
          L.bgc = bgc;
        }
        return L;
      };

      if (bubbleLine) {
        const gy = y + 54 + ((bubRows.length - 1) * 0.97 * bubS + 0.72 * bubS) / 2;
        const L = mkLine(bubbleLine, bubS, bubRows, (bubRows.length - 1) * 0.97 * bubS + 0.72 * bubS, 0, 0, cx, gy, true);
        L.gy = gy; st.lines.push(L);
        y += bubH;
      }
      stack.forEach((d, k) => {
        const o = F_.out[k];
        y += o.py;
        const gy = y + o.h / 2;
        const rows = o.rows;
        const wmax = Math.max(...rows.map((r) => wf(r, o.S)));
        const gx = align === 'left' ? x0 + o.px + wmax / 2 : cx;
        const L = mkLine(d, o.S, rows, o.h, o.px, o.py, gx, gy, false);
        st.lines.push(L);
        y += o.h + o.py + 0.46 * S;
      });
      st.align = align;
      // recentrage progressif : à chaque nouvelle ligne, le bloc déjà visible glisse pour rester centré
      const ord = st.lines.slice().sort((a, b) => a.t0 - b.t0);
      let top = 1e9, bot = -1e9; st.steps = [];
      for (const L of ord) {
        const tp = L.bub ? L.gy + L.bubTop : L.gy - L.h / 2 - L.py, bt = L.bub ? L.gy + L.bubBot + 112 : L.gy + L.h / 2 + L.py;
        top = Math.min(top, tp); bot = Math.max(bot, bt);
        st.steps.push({ t: L.t0, c: (top + bot) / 2 });
      }
      st.cEnd = st.steps.length ? st.steps[st.steps.length - 1].c : 0;
      return st;
    },

    draw(st, t, shot) {
      const { bgk, dark } = st;
      drift(st.bd, t);
      if (st.wheel) st.wheel.setAttribute('transform', `translate(960 560) rotate(${f2(t * 24)})`);
      if (st.kicker) { const p = ZV.E.back(prog(t, 0.05, 0.3)); put(st.kicker.g, st.kicker.x, st.kicker.y, 0, p, p, t >= 0.05 ? 1 : 0); }
      if (st.ball) {
        const tb = ZV.cue(shot, 'ball-think');
        let rot = 0, dx = 0, dy = 0;
        const pp = ZV.E.back(prog(t, 0, 0.3));
        if (tb !== null && t >= tb) { const q = t - tb, dec = Math.exp(-q * 1.4); rot = 9 * Math.sin(q * 11) * dec + 3 * Math.sin(q * 5); dx = 12 * Math.sin(q * 5.5) * dec; dy = -6 * Math.abs(Math.sin(q * 5.5)) * dec; }
        put(st.ball.g, st.ball.x + dx, st.ball.y + dy, rot, pp, pp, 1);
        // bulle de pensée : trois cercles qui montent l'un après l'autre
        const kids = st.ball.trail;
        for (let k = 0; k < kids.length; k++) { const q = tb === null ? 0 : ZV.E.back(prog(t, tb + 0.06 + k * 0.1, tb + 0.06 + k * 0.1 + 0.2)); const c = kids[k]; c.setAttribute('visibility', q > 0.01 ? 'visible' : 'hidden'); c.setAttribute('transform', `translate(${f2(parseFloat(c.getAttribute('cx')) * (1 - q))} ${f2(parseFloat(c.getAttribute('cy')) * (1 - q))}) scale(${f2(q)})`); }
      }
      let cNow = st.cEnd;
      if (st.steps.length) {
        cNow = st.steps[0].c;
        for (let i = 1; i < st.steps.length; i++) { const q = ZV.E.out3(clamp((t - st.steps[i].t) / 0.35)); if (q > 0) cNow = lerp(st.steps[i - 1].c, st.steps[i].c, q); }
      }
      const dy0 = st.cEnd - cNow;
      for (const L of st.lines) {
        const tt = t - L.t0, W = st.W;
        const gr = L.g;
        if (tt < 0) {
          if (L.style === 'type' && !L.bub && L.cursor) {   // curseur qui clignote en attendant la frappe
            gr.setAttribute('visibility', 'visible'); put(gr, L.gx, L.gy + dy0, 0, 1, 1, 1);
            for (const row of L.rows) { row.node.textContent = ''; if (row.shadow) row.shadow.textContent = ''; }
            L.cursor.setAttribute('visibility', Math.floor(t / 0.28) % 2 === 0 ? 'visible' : 'hidden');
            L.cursor.setAttribute('x', f2(L.rows[0].x + L.S * 0.06)); L.cursor.setAttribute('y', f2(L.rows[0].y - L.S * 0.74));
          } else gr.setAttribute('visibility', 'hidden');
          continue;
        }
        gr.setAttribute('visibility', 'visible');
        let x = L.gx, y = L.gy + dy0, r = 0, s = 1, o = 1;
        const dur4 = 4 * FR;
        if (L.style === 'slam') {
          const p = clamp(tt / dur4); s = lerp(2.4, 1, ZV.E.out3(p));
          const [sx, sy] = ZV.shakeAt(tt, dur4, 12, 0.4); x += sx; y += sy;
        } else if (L.style === 'pop') {
          const p = clamp(tt / (8 * FR)); s = lerp(0.35, 1, ZV.E.back(p)); r = lerp(-4, 0, ZV.E.out3(p));
        } else if (L.style === 'stack') {
          const p = clamp(tt / 0.55); y -= (1 - ZV.E.bounce(p)) * (L.gy + dy0 + 160);
          s = 1;
        } else if (L.style === 'stamp') {
          const p = clamp(tt / (5 * FR)); s = lerp(2.6, 1, ZV.E.in2(p)); r = L.tilt + lerp(-5, 0, p);
          const [sx, sy] = ZV.shakeAt(tt, 5 * FR, 14, 0.4); x += sx; y += sy;
        } else if (L.style === 'label') {
          r = L.tilt;
          const p = clamp(tt / 0.2); L.band.setAttribute('width', f2(L.bandW * ZV.E.out3(p)));
        } else if (L.bub) {
          const p = clamp(tt / (8 * FR)); s = lerp(0.4, 1, ZV.E.back(p)); r = lerp(-5, 0, p);
        }
        // mise à plat de l'éventuelle bulle : pas de rotation, bulle pop
        put(gr, x, y, r, s, s, o);
        // frappe lettre à lettre
        if (L.style === 'type' || L.style === 'label') {
          const natural = L.n * 2 * FR * (L.style === 'label' ? 1.4 : 1);
          const tdur = Math.max(0.45, Math.min(natural, L.win - (L.style === 'label' ? 0.45 : 0.3)));
          const t1 = L.style === 'label' ? 0.2 : (L.bub ? 8 * FR : 0);
          const q = clamp((tt - t1) / tdur);
          const k = Math.floor(q * L.n + 1e-6);
          let curX = null, curY = 0;
          for (const row of L.rows) {
            const m = clamp(k - row.off, 0, row.str.length);
            const sub = row.str.slice(0, m);
            row.node.textContent = sub.replace(/ /g, NB);
            if (row.shadow) row.shadow.textContent = sub.replace(/ /g, NB);
            if (m > 0 || curX === null) { curX = row.x + (m ? W(sub, L.S, { sp: NSP }) : 0); curY = row.y; }
          }
          if (L.style === 'label') { const jit = Math.sin(k * 12.9) * 1.8; for (const row of L.rows) { row.node.setAttribute('dy', f2(jit)); } }
          if (L.cursor) {
            const blink = q < 1 ? true : Math.floor((tt - t1 - tdur) / 0.28) % 2 === 0;
            L.cursor.setAttribute('visibility', blink && tt >= t1 ? 'visible' : 'hidden');
            L.cursor.setAttribute('x', f2((curX === null ? L.rows[0].x : curX) + L.S * 0.06));
            L.cursor.setAttribute('y', f2(curY - L.S * 0.74));
          }
        }
        // éclats d'impact
        if (L.burst) {
          const ti = tt - (L.style === 'stamp' ? 5 * FR : dur4), on = ti >= 0 && ti < 0.24;
          const rx = L.w / 2 + L.px + 30, ry = L.h / 2 + L.py + 24;
          const e = ZV.E.out3(clamp(ti / 0.24));
          for (const b of L.burst) {
            if (!on) { b.n.setAttribute('visibility', 'hidden'); continue; }
            const c = Math.cos(b.a), sn = Math.sin(b.a), k0 = 1 + 0.08 + 0.35 * e, len = b.l * (1 - e * 0.85);
            b.n.setAttribute('visibility', 'visible');
            b.n.setAttribute('x1', f2(c * rx * k0)); b.n.setAttribute('y1', f2(sn * ry * k0));
            b.n.setAttribute('x2', f2(c * (rx * k0 + len))); b.n.setAttribute('y2', f2(sn * (ry * k0 + len)));
          }
        }
        // barré
        if (L.ts !== null) {
          const p = ZV.E.out2(prog(t, L.ts, L.ts + 6 * FR));
          L.rows.forEach((row, k) => {
            const ln = L.strikes[k], xa = row.x - 18, xb = row.x + row.w + 18;
            ln.setAttribute('x2', f2(lerp(xa, xb, p)));
            ln.setAttribute('x1', f2(xa));
            const yy = row.y - L.S * 0.28;
            ln.setAttribute('y1', f2(yy + 6)); ln.setAttribute('y2', f2(yy + 6 - 12 * p));
            ln.setAttribute('visibility', p > 0 ? 'visible' : 'hidden');
            const dm = p >= 1 ? 0.55 : 1; row.node.setAttribute('opacity', dm); if (row.plates) for (const pl of row.plates) pl.setAttribute('opacity', dm);
          });
        } else L.strikes.forEach((ln) => ln.setAttribute('visibility', 'hidden'));
      }
    }
  });
})();
