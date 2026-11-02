// Composant « doc-card » : voir tools/video/composition/INTERFACE.md. Fonction pure du temps du plan, aplats seulement.
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
  const NSD = -0.03;
  // carte à coin plié : polygone + ombre dure + pli
  function foldedCard(parent, w, h, fill, foldFill, f, sh) {
    const poly = (ox, oy) => `M${-w / 2 + ox} ${-h / 2 + oy}L${w / 2 - f + ox} ${-h / 2 + oy}L${w / 2 + ox} ${-h / 2 + f + oy}L${w / 2 + ox} ${h / 2 + oy}L${-w / 2 + ox} ${h / 2 + oy}Z`;
    path(parent, poly(sh, sh), C.ink);
    path(parent, poly(0, 0), fill, C.ink, 8);
    path(parent, `M${w / 2 - f} ${-h / 2}L${w / 2 - f} ${-h / 2 + f}L${w / 2} ${-h / 2 + f}Z`, foldFill, C.ink, 8);
  }
  function silhouette(parent, x, y, fill) {
    const gr = g(parent);
    circle(gr, 0, 0, 100, fill, C.ink, 7);
    circle(gr, 0, -34, 36, C.ink);
    path(gr, 'M-70 72Q-72 12 0 12Q72 12 70 72A100 100 0 0 1 -70 72Z', C.ink);
    gr.setAttribute('data-x', x);
    return gr;
  }
  function bookIcon(parent) {
    const gr = g(parent);
    rect(gr, -80 + 12, -108 + 12, 170, 220, 10, C.ink);
    rect(gr, -80, -108, 170, 220, 10, C.lime, C.ink, 7);
    rect(gr, -80, -108, 30, 220, 10, C.ink);
    line(gr, -20, -60, 62, -60, C.ink, 12); line(gr, -20, -28, 48, -28, C.ink, 12);
    circle(gr, 20, 48, 26, C.paper, C.ink, 6);
    text(gr, '0', 20, 58, 30, C.ink, { mono: true, anchor: 'middle' });
    return gr;
  }

  defineTypo('doc-card', {
    build(root, shot) {
      const P = shot.props || {};
      const variant = ['source', 'article', 'help'].includes(P.variant) ? P.variant : 'source';
      const bgk = variant === 'help' ? 'paper' : variant === 'article' ? 'ink' : 'lime';
      const uid = 'dc' + (++UID);
      const W = mkProbe(root);
      const st = { shot, variant, bgk, uid, W };
      st.bd = backdrop(root, bgk, uid, { marks: variant !== 'help' });
      const cue = (n, d) => { const v = ZV.cue(shot, n); return v === null ? d : v; };
      const wf = (s, S) => W(s, S, { sp: NSD });
      const kickStr = String(P.kicker || '').toUpperCase();
      const title = String(P.title || '');

      if (variant === 'source') {
        const lines = (P.lines || []).map(String);
        const cw = 1480, hasLines = lines.length > 0;
        const textX = -cw / 2 + 360, textW = cw - 360 - 70;
        // titre : au plus 2 lignes équilibrées
        const tt = title.toUpperCase().replace(/ (?=[&])/g, NB);
        let S = 150, rows = null, S1 = 150, r1 = null;
        for (; S > 50; S *= 0.96) { rows = breaks(tt, S, textW, wf, 2); if (rows) break; }
        for (; S1 > 50; S1 *= 0.96) { r1 = breaks(tt, S1, textW, wf, 1); if (r1) break; }
        if (r1 && S1 >= 0.75 * S) { S = S1; rows = r1; }
        if (!rows) { S = 50; rows = [tt]; }
        const th = (rows.length - 1) * 1.02 * S + 0.74 * S;
        const lineH = hasLines ? lines.length * 74 + 24 : 0;
        const ch = Math.max(520, 150 + th + lineH + 70);
        st.cw = cw; st.ch = ch;
        const card = g(root); st.card = card;
        foldedCard(card, cw, ch, C.paper, C.ink, 110, 16);
        // en-tête
        text(card, kickStr, -cw / 2 + 56, -ch / 2 + 82, 40, C.ink, { mono: true, spacing: 3 });
        line(card, -cw / 2 + 56, -ch / 2 + 112, cw / 2 - 150, -ch / 2 + 112, C.ink, 6, { 'stroke-linecap': 'butt' });
        st.kick = card.lastChild.previousSibling;
        st.kickLine = card.lastChild;
        // icône
        const nPers = title.indexOf('&') >= 0 ? 2 : 1;
        const book = /livre/i.test(lines.join(' ')) ;
        const ic = g(card); st.icon = ic;
        if (book) { const b = bookIcon(ic); put(b, 0, 0, -4, 1, 1, 1); }
        else if (nPers === 2) { const a = silhouette(ic, 0, 0, C.lime), b = silhouette(ic, 0, 0, C.paper); a.setAttribute('transform', 'translate(-48 -34) scale(0.72)'); b.setAttribute('transform', 'translate(48 40) scale(0.72)'); }
        else { const a = silhouette(ic, 0, 0, C.lime); }
        st.iconPos = { x: -cw / 2 + 190, y: 40 };
        // titre
        const tg = g(card); st.titleG = tg;
        const topT = -ch / 2 + 150 + 6;
        const blockH = th + lineH;
        const y0 = topT + (ch - 150 - 40 - blockH) / 2 + 20;
        st.tRows = rows.map((r, k) => text(tg, r.replace(/ /g, NB), textX, y0 + 0.74 * S + k * 1.02 * S, S, C.ink, { spacing: f2(NSD * S) }));
        // détails (écrits à la machine)
        st.lines = lines.map((l, i) => {
          const nd = text(card, '', textX, y0 + th + 24 + 52 + i * 74, 52, '#2B2B2B', { mono: true, spacing: 0 });
          return { node: nd, str: l, t: cue('line-' + (i + 1), cue('title', 0.5) + 0.8 + i * 0.6), n: l.length };
        });
        st.tTitle = cue('title', 0.3); st.tKick = cue('kicker', 0);
        const firstCue = Math.min(...shot.beats.filter((b) => b.do === 'cue').map((b) => b.t), 0.6);
        st.tCard = Math.max(0.05, firstCue - 0.3);
        st.S = S;
        return st;
      }

      if (variant === 'article') {
        const sw = 1260;
        const tt = title.replace(/ (?=[?:!;»])/g, NB).replace(/«\s*/g, '«' + NB);
        const maxW = sw - 140;
        let S = 100, rows = null, S2 = 100, r2 = null;
        for (; S > 40; S *= 0.96) { rows = breaks(tt, S, maxW, wf, 3); if (rows) break; }
        for (; S2 > 40; S2 *= 0.96) { r2 = breaks(tt, S2, maxW, wf, 2); if (r2) break; }
        if (r2 && S2 >= 0.8 * S) { S = S2; rows = r2; }
        if (!rows) { S = 40; rows = [tt]; }
        const tH = (rows.length - 1) * 1.05 * S + 0.74 * S;
        const sh = 150 + tH + 70 + 5 * 34 + 14 + 56;
        const sheet = g(root); st.card = sheet;
        foldedCard(sheet, sw, sh, C.paper, C.lime, 100, 16);
        text(sheet, kickStr, -sw / 2 + 56, -sh / 2 + 80, 40, C.ink, { mono: true, spacing: 3 });
        line(sheet, -sw / 2 + 56, -sh / 2 + 110, sw / 2 - 140, -sh / 2 + 110, C.ink, 6, { 'stroke-linecap': 'butt' });
        const gt = g(sheet), top = -sh / 2 + 150;
        st.aRows = rows.map((r, k) => ({ node: text(gt, '', -sw / 2 + 70, top + 0.74 * S + k * 1.05 * S, S, C.ink, { spacing: f2(NSD * S) }), str: r.replace(/ /g, NB), S, n: r.length }));
        const bot = top + tH;
        const rg = ZV.rng(11);
        st.bars = [];
        const colW = (sw - 140 - 80) / 3, by0 = bot + 70;
        for (let c = 0; c < 3; c++) for (let r = 0; r < 6; r++) {
          const y = by0 + r * 34; if (y + 14 > sh / 2 - 36) continue;
          const w = colW * (r === 5 ? 0.55 : 0.78 + rg() * 0.22);
          st.bars.push({ n: rect(sheet, -sw / 2 + 70 + c * (colW + 40), y, w, 14, 3, C.ink), i: c * 6 + r });
        }
        st.tTitle = cue('title', 0.8); st.S = S;
        st.tCard = Math.max(0.05, st.tTitle - 0.3);
        return st;
      }

      // ---- aide : numéro écrit groupe par groupe ----
      const cw = 1500, ch = 640;
      const card = g(root); st.card = card;
      foldedCard(card, cw, ch, C.white, C.lime, 110, 16);
      const hdr = kickStr && kickStr.toUpperCase() === title.toUpperCase() ? "NUMÉRO D’AIDE" : kickStr;
      text(card, hdr, -cw / 2 + 60, -ch / 2 + 84, 40, C.ink, { mono: true, spacing: 3 });
      line(card, -cw / 2 + 60, -ch / 2 + 114, cw / 2 - 150, -ch / 2 + 114, C.ink, 6, { 'stroke-linecap': 'butt' });
      text(card, title, -cw / 2 + 60, -ch / 2 + 240, 112, C.ink, { spacing: f2(NSD * 112) });
      const digits = P.digits || ['09', '74', '75', '13', '13'];
      const dsz = 150, cwid = 0.6 * dsz, gap = 56;
      const gw = digits.map((d) => d.length * cwid);
      const totalW = gw.reduce((a, b) => a + b, 0) + gap * (digits.length - 1);
      let x = -totalW / 2;
      const dy = 140;
      st.dg = digits.map((d, i) => {
        const bar = rect(card, x, dy + 24, gw[i], 16, 4, C.lime);
        const nd = text(card, '', x, dy, dsz, C.ink, { mono: true });
        const o = { node: nd, bar, str: d, w: gw[i], t: cue('d' + (i + 1), 1 + i * 0.6) };
        x += gw[i] + gap;
        return o;
      });
      // pastilles
      const mk = (str, fill) => {
        const size = 50, w = W(str, size, { sp: 0.02 }) + 64, h = size * 1.7, gr = g(root);
        rect(gr, -w / 2 + 10, -h / 2 + 10, w, h, 16, C.ink); rect(gr, -w / 2, -h / 2, w, h, 16, fill, C.ink, 6);
        text(gr, str, 0, size * 0.35, size, C.ink, { anchor: 'middle', spacing: f2(0.02 * size) });
        return { g: gr, w, h };
      };
      const sb = (n) => shot.beats.find((b) => b.do === 'cue' && b.name === n);
      const s1 = sb('s1'), s2 = sb('s2');
      st.s1 = s1 ? Object.assign(mk(String(s1.text || 'TOUS LES JOURS').toUpperCase(), C.lime), { t: s1.t, x: 700, y: 760, tilt: -3 }) : null;
      st.s2 = s2 ? Object.assign(mk(String(s2.text || 'ANONYME').toUpperCase(), C.lime), { t: s2.t, x: 1360, y: 770, tilt: 3 }) : null;
      st.tCard = Math.max(0.05, cue('d1', 1) - 0.9);
      return st;
    },

    draw(st, t, shot) {
      drift(st.bd, t);
      const { variant } = st;
      const cardPose = (rot0, y0) => {
        const q = t - st.tCard, p = ZV.E.back(clamp(q / (10 * FR)));
        put(st.card, 960, y0, lerp(rot0 - 7, rot0, ZV.E.out3(clamp(q / (10 * FR)))), lerp(0.7, 1, p), lerp(0.7, 1, p), q >= 0 ? 1 : 0);
      };
      const typed = (node, str, t0, per, extra) => {
        const k = t < t0 ? 0 : Math.min(str.length, Math.floor((t - t0) / per + 1e-6) + 1);
        node.textContent = str.slice(0, k).replace(/ /g, NB);
        return k;
      };

      if (variant === 'source') {
        cardPose(-2, 480);
        // en-tête
        const kq = t >= st.tKick || st.tKick === 0 ? 1 : 0;
        st.kick.setAttribute('visibility', t >= st.tKick ? 'visible' : 'hidden');
        // icône
        const iq = ZV.E.back(clamp((t - st.tCard - 0.2) / (8 * FR)));
        put(st.icon, st.iconPos.x, st.iconPos.y, 0, iq, iq, t >= st.tCard + 0.2 ? 1 : 0);
        // titre : pop
        const tt = t - st.tTitle, p = ZV.E.back(clamp(tt / (8 * FR)));
        put(st.titleG, 0, 0, 0, 1, 1, tt >= 0 ? 1 : 0);
        st.titleG.setAttribute('transform', `translate(${f2(lerp(-60, 0, ZV.E.out3(clamp(tt / (8 * FR)))))} 0)`);
        st.titleG.setAttribute('opacity', tt >= 0 ? 1 : 0);
        for (const ln of st.lines) typed(ln.node, ln.str, ln.t, Math.max(1 / 60, Math.min(2 * FR, 0.9 / ln.n)));
        return;
      }

      if (variant === 'article') {
        cardPose(1.5, 500);
        let tcur = st.tTitle;
        let done = 0;
        for (const r of st.aRows) {
          const per = Math.min(1.5 * FR, 0.5 / r.n);
          const k = typed(r.node, r.str, tcur, per);
          tcur += r.n * per + 0.12;
          done = tcur;
        }
        for (const b of st.bars) {
          const q = ZV.E.out3(clamp((t - (done + 0.05 + b.i * 0.02)) / 0.25));
          const wmax = parseFloat(b.n.getAttribute('data-w') || b.n.getAttribute('width'));
          if (!b.n.getAttribute('data-w')) b.n.setAttribute('data-w', wmax);
          b.n.setAttribute('width', f2(wmax * q)); b.n.setAttribute('visibility', q > 0 ? 'visible' : 'hidden');
        }
        return;
      }

      // aide : calme (aucun shake, entrée douce)
      {
        const q = t - st.tCard, p = ZV.E.out3(clamp(q / 0.4));
        put(st.card, 960, lerp(560, 470, p), -1, 1, 1, q >= 0 ? 1 : 0);
        for (const d of st.dg) {
          typed(d.node, d.str, d.t, 2 * FR);
          const bq = ZV.E.out3(clamp((t - d.t) / 0.35));
          d.bar.setAttribute('width', f2(d.w * bq)); d.bar.setAttribute('visibility', bq > 0 ? 'visible' : 'hidden');
        }
        for (const s of [st.s1, st.s2]) if (s) { const pp = ZV.E.out3(clamp((t - s.t) / 0.3)); put(s.g, s.x, lerp(s.y + 40, s.y, pp), s.tilt, 1, 1, t >= s.t ? pp : 0); }
      }
    }
  });
})();
