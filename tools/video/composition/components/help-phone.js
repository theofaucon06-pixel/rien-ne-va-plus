// Composant `help-phone` (épisode 9, S4) : « Ce qui se passe quand tu appelles ». Un téléphone générique plat (vues : dial, call, search, save) et, à droite, un panneau lime
// qui montre le dernier contenu déclenché (hours, noname, first-time, relatives, saved). Voir EP9-COMPONENTS.md.
// Cues : dial, d1..d5, call, hours, noname, first-time, search, results, relatives, save, saved. Fonction pure du temps ; aplats, aucun dégradé / flou / lueur / filter ; aucun shake.
// Aucune marque : maquette plate générique (ni icône reconnaissable, ni logo). Rien d'important sous y = 800.
(() => {
  'use strict';
  const { C, F, E, clamp, prog, f2, sv, g, rect, circle, path, line, text } = ZV;
  const I = 1 / 30;
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const num = (v, d) => (v != null && v !== '' && isFinite(+v) ? +v : d);
  const str = (v, d) => (typeof v === 'string' && v.trim().length ? v.trim() : d);
  const arr = (v, d) => (Array.isArray(v) && v.length ? v : d);
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const vis = (n, on) => setA(n, 'visibility', on ? 'visible' : 'hidden');
  const dsp = (n, on) => setA(n, 'display', on ? 'inline' : 'none');
  const op = (n, o) => { o = clamp(o); setA(n, 'opacity', f2(o)); setA(n, 'visibility', o <= 0.001 ? 'hidden' : 'visible'); };
  const tr = (n, x, y, r, sx, sy) => { let s = `translate(${f2(x)} ${f2(y)})`; if (r) s += ` rotate(${f2(r)})`; if (sx !== undefined && (sx !== 1 || (sy !== undefined && sy !== 1))) s += ` scale(${f2(Math.max(sx, 0.0001))} ${f2(Math.max(sy === undefined ? sx : sy, 0.0001))})`; setA(n, 'transform', s); };
  const setT = (n, s) => { if (n.__t !== s) { n.__t = s; n.textContent = s; } };
  const pop = (n, x, y, rot, p) => { if (p <= 0) { vis(n, false); return; } vis(n, true); tr(n, x, y, rot, Math.max(0.0001, E.back(clamp(p)))); };
  // mesure réelle du texte (getComputedTextLength), repli sur une estimation hors DOM
  function metric(root) {
    const probe = sv('text', { x: 0, y: -3000, 'font-size': 100, 'font-weight': 800, visibility: 'hidden' }, root);
    const cache = {};
    const est = (s, mono) => { let a = 0; for (const ch of s) a += mono ? 60 : (ch === ' ' ? 26 : /[0-9]/.test(ch) ? 60 : /[A-ZÀÂÉÈÊÎÔÛÇ€%+×≠=?]/.test(ch) ? 68 : /[.,:;'’!|·]/.test(ch) ? 32 : 58); return a; };
    return (s, size, mono) => {
      s = String(s); const k = (mono ? 'm' : 'd') + s; let w = cache[k];
      if (w === undefined) {
        probe.setAttribute('font-family', mono ? F.mono : F.display); probe.textContent = s;
        w = 0; try { w = probe.getComputedTextLength(); } catch (e) { w = 0; }
        if (!(w > 0)) w = est(s, mono);
        cache[k] = w;
      }
      return w * size / 100;
    };
  }
  // texte ajusté : réduit la taille jusqu'à o.min si dépasse o.maxW, puis impose la largeur (textLength) ; o.free = pas de textLength (machine à écrire)
  const mkT = (M) => function T(parent, s, x, y, size, fill, o) {
    o = o || {}; s = String(s);
    let w = M(s, size, o.mono);
    if (o.maxW && w > o.maxW) { size = Math.max(o.min || 10, size * o.maxW / w); w = M(s, size, o.mono); }
    const n = text(parent, s, x, y, f2(size), fill, { mono: o.mono, anchor: o.anchor });
    if (!o.free) { const lim = o.maxW ? Math.min(w, o.maxW) : w; n.setAttribute('textLength', f2(lim)); n.setAttribute('lengthAdjust', 'spacingAndGlyphs'); w = lim; }
    n.__w = w; n.__s = size; return n;
  };
  // coupe en lignes équilibrées (≤ maxL) ; réduit la taille jusqu'à min si besoin
  const mkWrap = (M) => {
    const part = (words, n, sz, mono) => {
      const wl = (a, b) => M(words.slice(a, b).join(' '), sz, mono);
      let best = null;
      const rec = (start, left, cuts, mx) => {
        if (left === 1) { const m = Math.max(mx, wl(start, words.length)); if (!best || m < best.w - 0.5) best = { w: m, cuts: cuts.slice() }; return; }
        for (let e = start + 1; e <= words.length - (left - 1); e++) { cuts.push(e); rec(e, left - 1, cuts, Math.max(mx, wl(start, e))); cuts.pop(); }
      };
      rec(0, n, [], 0);
      const lines = []; let s0 = 0;
      for (const c of best.cuts.concat([words.length])) { lines.push(words.slice(s0, c).join(' ')); s0 = c; }
      return { w: best.w, lines };
    };
    return (s, size, maxW, maxL, mono, min) => {
      const words = String(s).split(/\s+/).filter(Boolean); if (!words.length) words.push(' ');
      maxL = Math.max(1, Math.min(maxL, words.length)); min = min || 12;
      for (let sz = size; ; sz -= 1) {
        for (let n = 1; n <= maxL; n++) { const p = part(words, n, sz, mono); if (p.w <= maxW) return { lines: p.lines, size: sz, w: p.w }; }
        if (sz <= min) { const p = part(words, maxL, sz, mono); return { lines: p.lines, size: sz, w: Math.min(p.w, maxW) }; }
      }
    };
  };
  // bloc plat + ombre dure décalée
  function blk(parent, x, y, w, h, fill, r, sw, sh) {
    const grp = g(parent);
    if (sh) rect(grp, x + sh, y + sh, w, h, r, C.ink);
    rect(grp, x, y, w, h, r, fill, sw === 0 ? null : C.ink, sw || 6);
    return grp;
  }
  // sticker centré sur (0,0), lignes centrées
  function stk(parent, lines, size, fill, tfill, o, M, T) {
    o = o || {}; lines = [].concat(lines);
    const lh = size * 1.18;
    let mw = 0; lines.forEach((l) => { mw = Math.max(mw, M(l, size, o.mono)); });
    const padX = o.padX === undefined ? 30 : o.padX;
    const w = Math.round(mw + padX * 2), h = Math.round(lines.length * lh + (o.padY === undefined ? 26 : o.padY));
    const grp = g(parent), sh = o.sh === undefined ? 10 : o.sh;
    if (sh) rect(grp, -w / 2 + sh, -h / 2 + sh, w, h, o.r === undefined ? 14 : o.r, C.ink);
    rect(grp, -w / 2, -h / 2, w, h, o.r === undefined ? 14 : o.r, fill, C.ink, o.sw || 6);
    lines.forEach((l, i) => T(grp, l, 0, -h / 2 + (h - lines.length * lh) / 2 + lh * (i + 0.5) + size * 0.34, size, tfill, { anchor: 'middle', mono: o.mono }));
    grp.__w = w; grp.__h = h; return grp;
  }
  let UID = 0;
  const PX = 302, PY = 140, PW = 376, PH = 600;          // contenu de l'écran du téléphone
  const BX = 868, BY = 98, BW = 924, BH = 694;           // intérieur du panneau
  const VIEWS = ['dial', 'call', 'search', 'save'];
  const PANELS = ['hours', 'noname', 'first-time', 'relatives', 'saved'];
  const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
  const D2R = Math.PI / 180;

  // combiné téléphonique plat (centré sur 0,0), sans visage
  function handset(parent, fill) {
    const h = g(parent);
    path(h, 'M-40 -14 Q0 34 40 -14', 'none', fill, 20);
    for (const sx of [-1, 1]) rect(h, -15, -19, 30, 38, 9, fill).setAttribute('transform', `translate(${sx * 44} -22) rotate(${-sx * 22})`);
    return h;
  }
  const lastIdx = (ev, t) => { let r = -1; for (let i = 0; i < ev.length; i++) if (ev[i].t <= t) r = i; return r; };

  ZV.define('help-phone', {
    init(root, shot) {
      const P = shot.props || {};
      const beats = Array.isArray(shot.beats) ? shot.beats : [];
      const cu = (n) => { const a = beats.filter((b) => b && b.do === 'cue' && b.name === n && isNum(b.t)).map((b) => b.t).sort((x, y) => x - y); return a.length ? a[0] : null; };
      const M = metric(root), T = mkT(M), WR = mkWrap(M);
      const uid = 'hp' + (++UID);
      const clock = str(P.clock, '01:00');
      const digits = arr(P.digits, ['09', '74', '75', '13', '13']).slice(0, 5).map(String);
      const name = str(P.name, 'JOUEURS INFO SERVICE'), query = str(P.query, 'joueurs info service');
      const results = arr(P.results, ['CHAT', 'FORUM · DES HISTOIRES', 'ANNUAIRE DES CONSULTATIONS']).slice(0, 3).map(String);
      const first = str(P.first, 'LE DIRE À VOIX HAUTE, SOUVENT POUR LA PREMIÈRE FOIS');
      const relTitle = str(P.relatives_title, 'AUSSI POUR LES PROCHES');
      const rels = arr(P.relatives, [{ who: 'UNE MÈRE', what: "OÙ PASSE L'ARGENT ?" }, { who: 'UNE COPINE', what: "LE TÉLÉPHONE S'ALLUME À CHAQUE BUT" }, { who: 'UN FRÈRE', what: 'A DÉJÀ PRÊTÉ TROIS FOIS' }]).slice(0, 3).map((r) => ({ who: str(r && r.who, ''), what: str(r && r.what, '') }));
      const savedTxt = str(P.saved, 'ENREGISTRÉ'), someday = str(P.someday, "UN JOUR, QUELQU'UN EN AURA BESOIN");
      const numTxt = digits.join(' ');
      const c = {};
      ['dial', 'd1', 'd2', 'd3', 'd4', 'd5', 'call', 'hours', 'noname', 'first-time', 'search', 'results', 'relatives', 'save', 'saved'].forEach((n) => { c[n] = cu(n); });
      const td = [c.d1, c.d2, c.d3, c.d4, c.d5];

      rect(root, 0, 0, 1920, 1080, 0, C.paper);

      /* ---------- panneau droit (fond lime fixe, contenu qui glisse) ---------- */
      blk(root, 860, 90, 940, 710, C.lime, 26, 8, 14);
      const defs = sv('defs', null, root);
      sv('rect', { x: BX, y: BY, width: BW, height: BH }, sv('clipPath', { id: uid + 'p' }, defs));
      sv('rect', { x: PX, y: PY, width: PW, height: PH }, sv('clipPath', { id: uid + 'v' }, defs));
      const panelLayer = g(root, { 'clip-path': `url(#${uid}p)` });
      const pg = {}, pu = {};

      // -- hours : cadran 24 h
      {
        const hg = pg.hours = g(panelLayer);
        const cx = 1330, cy = 440, R = 250, Rr = 165;
        const a2p = (deg, r) => [cx + r * Math.sin(deg * D2R), cy - r * Math.cos(deg * D2R)];
        circle(hg, cx + 12, cy + 12, R, C.ink);
        circle(hg, cx, cy, R, C.paper, C.ink, 8);
        for (let h = 0; h < 24; h++) { const maj = h % 6 === 0, p0 = a2p(h * 15, R - (maj ? 44 : 24)), p1 = a2p(h * 15, R - 8); line(hg, f2(p0[0]), f2(p0[1]), f2(p1[0]), f2(p1[1]), C.ink, maj ? 8 : 4).setAttribute('stroke-linecap', 'butt'); }
        [[0, '0'], [90, '6'], [180, '12'], [270, '18']].forEach(([a, s]) => { const p = a2p(a, 288); T(hg, s, f2(p[0]), f2(p[1] + 10), 32, C.ink, { mono: true, anchor: 'middle' }); });
        const s0 = a2p(120, Rr), s1 = a2p(30, Rr);
        const d = `M${f2(s0[0])} ${f2(s0[1])} A${Rr} ${Rr} 0 1 1 ${f2(s1[0])} ${f2(s1[1])}`;
        const L = Rr * 270 * D2R;
        const ringInk = path(hg, d, 'none', C.ink, 72), ringLime = path(hg, d, 'none', C.lime, 60);
        [ringInk, ringLime].forEach((n) => { n.setAttribute('stroke-dasharray', `${f2(L)} ${f2(L + 20)}`); });
        const cl = WR('TOUS LES JOURS', 40, 200, 2, false, 28);
        cl.lines.forEach((l, i) => T(hg, l, cx, cy + (i - (cl.lines.length - 1) / 2) * cl.size * 1.1 + cl.size * 0.34, cl.size, C.ink, { anchor: 'middle', maxW: 210 }));
        const pill = (label, a) => { const gp = g(hg), p = a2p(a, R); const w = Math.round(M(label, 24, true) + 28); rect(gp, -w / 2 + 5, -19 + 5, w, 38, 10, C.ink); rect(gp, -w / 2, -19, w, 38, 10, C.ink, C.paper, 3); T(gp, label, 0, 8, 24, C.paper, { mono: true, anchor: 'middle' }); tr(gp, p[0], p[1], 0); return gp; };
        const p8 = pill('8 H', 120), p2 = pill('2 H', 30);
        // index à 1 h et son étiquette
        const ix = g(hg);
        const tip = a2p(15, R + 6), bs = a2p(15, R + 52), nx = Math.cos(15 * D2R), ny = Math.sin(15 * D2R);
        path(ix, `M${f2(tip[0])} ${f2(tip[1])} L${f2(bs[0] + nx * 15)} ${f2(bs[1] + ny * 15)} L${f2(bs[0] - nx * 15)} ${f2(bs[1] - ny * 15)}Z`, C.ink, C.ink, 5);
        line(ix, f2(bs[0]), f2(bs[1]), 1534, f2(bs[1]), C.ink, 5).setAttribute('stroke-linecap', 'butt');
        const lab = stk(ix, ['1 H DU MATIN :', 'ÇA DÉCROCHE'], 24, C.paper, C.ink, { mono: true, sh: 8, padX: 20, padY: 22 }, M, T);
        const lx = 1534 + lab.__w / 2 - 2, ly = f2(bs[1]);
        tr(lab, lx, ly, 0);
        pu.hours = (tp) => {
          const p = E.io2(prog(tp, 10 * I, 30 * I));
          const dd = L * p;
          if (dd < 1) { vis(ringInk, false); vis(ringLime, false); } else { vis(ringInk, true); vis(ringLime, true); const o = f2(L - dd); setA(ringInk, 'stroke-dashoffset', o); setA(ringLime, 'stroke-dashoffset', o); }
          pop(p8, ...a2p(120, R), 0, prog(tp, 10 * I, 18 * I));
          pop(p2, ...a2p(30, R), 0, prog(tp, 30 * I, 38 * I));
          const pi = prog(tp, 34 * I, 42 * I);
          if (pi <= 0) vis(ix, false); else { vis(ix, true); const s = E.out3(pi); tr(ix, (1 - s) * 40, 0, 0); op(ix, s * 3); }
        };
      }

      // -- noname : « ON NE TE DEMANDE PAS TON NOM. » / « ON NE TE JUGE PAS. »
      {
        const ng = pg.noname = g(panelLayer);
        const w1 = WR("ON NE TE DEMANDE PAS TON NOM.", 64, 820, 2, false, 46);
        const lh = w1.size * 1.2;
        const l1 = g(ng);
        w1.lines.forEach((l, i) => T(l1, l, 930, 292 + i * lh, w1.size, C.ink, { maxW: 830 }));
        const y2 = 292 + (w1.lines.length - 1) * lh + 62;
        const l2 = g(ng);
        const t2 = "ON NE TE JUGE PAS.";
        const s2 = Math.min(w1.size, 64), tw2 = Math.min(820, M(t2, s2));
        blk(l2, 920, y2, tw2 + 60, s2 * 1.45, C.paper, 14, 6, 12);
        T(l2, t2, 950, y2 + s2 * 1.45 / 2 + s2 * 0.34, s2, C.ink, { maxW: 820 });
        const cyy = y2 + s2 * 0.72;
        pu.noname = (tp) => {
          const a = prog(tp, 8 * I, 16 * I);
          if (a <= 0) vis(l1, false); else { vis(l1, true); tr(l1, (1 - E.out3(a)) * 30, 0, 0); op(l1, a * 3); }
          const b = prog(tp, 1.0 + 8 * I, 1.0 + 16 * I);
          if (b <= 0) vis(l2, false); else { vis(l2, true); const s = Math.max(0.0001, E.back(b)); setA(l2, 'transform', `translate(930 ${f2(cyy)}) scale(${f2(s)}) translate(-930 ${f2(-cyy)})`); }
        };
      }

      // -- first-time : grande bulle de BD sortant côté téléphone
      {
        const fg = pg['first-time'] = g(panelLayer);
        const inner = g(fg), tipX = 884, tipY = 520;
        const bx = 960, by = 190, bw = 790, bh = 470;
        const body = g(inner, { transform: `translate(${-tipX} ${-tipY})` });
        const tail = `M${bx + 6} 470 L${tipX} ${tipY} L${bx + 6} 568 Z`;
        path(body, tail, C.ink, C.ink, 8).setAttribute('transform', 'translate(14 14)');
        rect(body, bx + 14, by + 14, bw, bh, 36, C.ink);
        path(body, tail, C.paper, C.ink, 8);
        rect(body, bx, by, bw, bh, 36, C.paper, C.ink, 8);
        rect(body, bx - 2, 477, 16, 84, 0, C.paper);
        const wf = WR(first, 54, bw - 110, 3, false, 36);
        const lh = wf.size * 1.2, y0 = by + bh / 2 - (wf.lines.length * lh) / 2 + lh * 0.5 + wf.size * 0.34;
        wf.lines.forEach((l, i) => T(body, l, bx + bw / 2 + 6, f2(y0 + i * lh), wf.size, C.ink, { anchor: 'middle', maxW: bw - 100 }));
        pu['first-time'] = (tp) => {
          const p = prog(tp, 6 * I, 18 * I);
          if (p <= 0) { vis(inner, false); return; }
          vis(inner, true); const s = Math.max(0.0001, E.back(p));
          setA(inner, 'transform', `translate(${tipX} ${tipY}) scale(${f2(s)})`);
        };
      }

      // -- relatives : trois cartes inclinées
      {
        const rg = pg.relatives = g(panelLayer);
        T(rg, relTitle, 930, 182, 56, C.ink, { maxW: 840 });
        const rots = [-2, 1, -1], cards = [];
        rels.forEach((r, i) => {
          const cg = g(rg), y0 = 222 + i * 172;
          blk(cg, -400, -70, 800, 140, C.paper, 14, 6, 10);
          rect(cg, -400, -70, 22, 140, 0, C.ink);
          T(cg, r.who, -356, -14, 40, C.ink, { maxW: 740 });
          T(cg, r.what, -356, 40, 24, C.ink, { mono: true, maxW: 740, min: 18 });
          cards.push({ g: cg, x: 1330, y: y0 + 70, r: rots[i] });
        });
        pu.relatives = (tp) => {
          cards.forEach((k, i) => {
            const p = prog(tp, 14 * I + i * 10 * I, 22 * I + i * 10 * I);
            if (p <= 0) { vis(k.g, false); return; }
            vis(k.g, true); const e = E.back(p);
            tr(k.g, k.x, k.y + (1 - clamp(e, 0, 1)) * 60, k.r * (0.4 + 0.6 * clamp(p)), Math.max(0.0001, 0.85 + 0.15 * e));
            op(k.g, p * 4);
          });
        };
      }

      // -- saved : sticker « un jour, quelqu'un en aura besoin »
      {
        const sg = pg.saved = g(panelLayer);
        const ws = WR(someday, 48, 640, 2, false, 34);
        const st = stk(sg, ws.lines, ws.size, C.paper, C.ink, { sh: 14, padX: 36, padY: 44, sw: 8, r: 18 }, M, T);
        pu.saved = (tp) => { pop(st, 1330, 440, -2, prog(tp, 8 * I, 18 * I)); };
      }
      PANELS.forEach((k) => { if (!pu[k]) pu[k] = () => {}; });

      /* ---------- téléphone ---------- */
      rect(root, 294, 84, 420, 740, 56, C.lime, C.ink, 6);
      rect(root, 280, 70, 420, 740, 56, C.ink);
      rect(root, 302, 92, 376, 696, 38, C.paper);
      T(root, clock, 326, 124, 22, C.ink, { mono: true, free: true });
      [[590, 10], [606, 16], [622, 22]].forEach(([x, h]) => rect(root, x, 126 - h, 10, h, 2, C.ink));
      rect(root, 640, 108, 26, 16, 4, 'none', C.ink, 3);
      rect(root, 644, 112, 16, 8, 1, C.ink);
      rect(root, 440, 758, 100, 8, 4, C.ink);

      const viewLayer = g(root, { 'clip-path': `url(#${uid}v)` });
      const vg = {};
      // -- dial
      const dial = vg.dial = g(viewLayer);
      rect(dial, 20, 14, 336, 72, 16, C.white, C.ink, 4);
      const caret = rect(dial, 40, 32, 5, 36, 0, C.ink);
      const fieldTxt = T(dial, '', 38, 62, 34, C.ink, { mono: true, free: true });
      const keyC = {};
      KEYS.forEach((k, i) => {
        const cx = [66, 188, 310][i % 3], cy = 144 + Math.floor(i / 3) * 96;
        keyC[k] = circle(dial, cx, cy, 38, C.paper, C.ink, 4);
        T(dial, k, cx, cy + (k === '*' ? 22 : 15), 44, C.ink, { mono: true, anchor: 'middle', free: true });
      });
      blk(dial, 20, 504, 336, 72, C.lime, 36, 5, 0);
      const hs0 = handset(dial, C.ink); tr(hs0, 98, 541, -40, 0.62);
      T(dial, 'APPELER', 148, 553, 30, C.ink, { maxW: 190 });
      // -- call
      const call = vg.call = g(viewLayer);
      circle(call, 188, 112, 88, C.lime, C.ink, 6);
      const hs1 = handset(call, C.ink); tr(hs1, 188, 112, -40, 1.25);
      const wn = WR(name, 36, 330, 2, false, 26);
      wn.lines.forEach((l, i) => T(call, l, 188, 244 + i * 40, wn.size, C.ink, { anchor: 'middle', maxW: 336 }));
      const ny0 = 244 + (wn.lines.length - 1) * 40;
      T(call, 'APPEL EN COURS', 188, ny0 + 40, 22, C.ink, { mono: true, anchor: 'middle' });
      const timer = T(call, '00:00', 188, ny0 + 104, 56, C.ink, { mono: true, anchor: 'middle', free: true });
      {
        const labs = ['ANONYME', 'NON SURTAXÉ'], ws = labs.map((l) => Math.round(M(l, 20, true) + 30));
        let x = 188 - (ws[0] + ws[1] + 12) / 2;
        labs.forEach((l, i) => { blk(call, x, ny0 + 126, ws[i], 40, C.white, 20, 4, 0); T(call, l, x + ws[i] / 2, ny0 + 126 + 27, 20, C.ink, { mono: true, anchor: 'middle' }); x += ws[i] + 12; });
      }
      const nfY = ny0 + 190;
      rect(call, 20, nfY, 336, 70, 14, C.white, C.ink, 4);
      T(call, 'NOM : ______', 40, nfY + 45, 28, C.ink, { mono: true, free: true });
      const strike = line(call, 30, nfY + 35, 30, nfY + 35, C.red, 10); vis(strike, false);
      // -- search
      const srch = vg.search = g(viewLayer);
      rect(srch, 20, 14, 336, 74, 37, C.white, C.ink, 4);
      circle(srch, 62, 49, 13, 'none', C.ink, 5); line(srch, 72, 59, 84, 71, C.ink, 6);
      const qs = Math.min(24, 240 / (query.length * 0.6));
      const qTxt = T(srch, '', 98, 49 + qs * 0.34, qs, C.ink, { mono: true, free: true });
      const tiles = results.map((r, i) => {
        const tg = g(srch), y0 = 130 + i * 128;
        blk(tg, 0, 0, 336, 112, C.paper, 14, 4, 6);
        circle(tg, 34, 56, 14, C.lime, C.ink, 4);
        const w = WR(r, 28, 250, 2, false, 20);
        w.lines.forEach((l, j) => T(tg, l, 64, 56 + (j - (w.lines.length - 1) / 2) * w.size * 1.15 + w.size * 0.34, w.size, C.ink, { maxW: 256 }));
        return { g: tg, x: 20, y: y0 };
      });
      // -- save
      const save = vg.save = g(viewLayer);
      circle(save, 188, 62, 40, C.lime, C.ink, 5);
      line(save, 188, 44, 188, 80, C.ink, 8); line(save, 170, 62, 206, 62, C.ink, 8);
      T(save, 'NOUVEAU CONTACT', 188, 150, 30, C.ink, { anchor: 'middle', maxW: 330 });
      rect(save, 20, 176, 336, 100, 14, C.white, C.ink, 4);
      T(save, 'NOM', 36, 198, 16, C.grey, { mono: true });
      { const w = WR(name, 28, 300, 2, false, 22); w.lines.forEach((l, i) => T(save, l, 36, 232 + i * 31, w.size, C.ink, { maxW: 304 })); }
      rect(save, 20, 292, 336, 84, 14, C.white, C.ink, 4);
      T(save, 'NUMÉRO', 36, 314, 16, C.grey, { mono: true });
      T(save, numTxt, 36, 358, 34, C.ink, { mono: true, maxW: 304, min: 24 });
      const btn = g(save);
      const btnBody = rect(btn, -168, -36, 336, 72, 16, C.ink, C.ink, 5);
      const btnL1 = T(btn, 'ENREGISTRER', 0, 12, 32, C.paper, { anchor: 'middle', maxW: 300 });
      const sv2 = g(btn);
      const sl = T(sv2, savedTxt, 0, 12, 32, C.ink, { maxW: 250, min: 20 });
      const tot = 36 + 12 + sl.__w, left = -tot / 2;
      sl.setAttribute('x', f2(left + 48));
      path(sv2, `M${f2(left + 4)} 2 L${f2(left + 15)} 14 L${f2(left + 34)} -10`, 'none', C.ink, 8);
      VIEWS.forEach((k) => dsp(vg[k], false));

      return { c, td, digits, numTxt, query, uid, vg, pg, pu, fieldTxt, caret, keyC, timer, strike, nfY, qTxt, tiles, btn, btnBody, btnL1, sv2,
        vEv: VIEWS.map((k) => ({ key: k, t: c[k] })).filter((e) => e.t != null).sort((a, b) => a.t - b.t).filter((e, i, a) => !i || a[i - 1].key !== e.key),
        pEv: PANELS.map((k) => ({ key: k, t: c[k] })).filter((e) => e.t != null).sort((a, b) => a.t - b.t) };
    },

    update(st, t, shot) {
      const c = st.c;
      /* ---- vues de l'écran ---- */
      const vi = lastIdx(st.vEv, t);
      const cur = vi >= 0 ? st.vEv[vi].key : 'dial', prev = vi >= 0 ? (vi > 0 ? st.vEv[vi - 1].key : 'dial') : null;
      const vp = vi >= 0 ? prog(t, st.vEv[vi].t, st.vEv[vi].t + 10 * I) : 1;
      VIEWS.forEach((k) => {
        const n = st.vg[k];
        if (k === cur) { dsp(n, true); tr(n, PX + (1 - E.out3(vp)) * PW, PY, 0); }
        else if (k === prev && vp < 1) { dsp(n, true); tr(n, PX - E.out3(vp) * PW, PY, 0); }
        else dsp(n, false);
      });
      // dial : numéro et touches
      let k = -1;
      for (let i = 0; i < st.digits.length; i++) if (st.td[i] != null && st.td[i] <= t) k = i;
      setT(st.fieldTxt, st.digits.slice(0, k + 1).join(' '));
      vis(st.caret, k < 0);
      const lit = {};
      for (let i = 0; i < st.digits.length; i++) if (st.td[i] != null && t >= st.td[i] && t < st.td[i] + 4 * I) for (const ch of st.digits[i]) lit[ch] = true;
      for (const key in st.keyC) setA(st.keyC[key], 'fill', lit[key] ? C.lime : C.paper);
      // call : chronomètre et barré
      const t0 = c.call != null ? c.call : (c.noname != null ? c.noname : 0), sec = Math.max(0, Math.floor(t - t0));
      setT(st.timer, String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0'));
      if (c.noname != null && t >= c.noname) { vis(st.strike, true); setA(st.strike, 'x2', f2(30 + 316 * E.out2(prog(t, c.noname, c.noname + 6 * I)))); } else vis(st.strike, false);
      // search : requête tapée, tuiles qui tombent
      const nq = c.search == null || t < c.search ? 0 : Math.min(st.query.length, Math.floor((t - c.search) * 30) + 1);
      setT(st.qTxt, st.query.slice(0, nq));
      st.tiles.forEach((tl, i) => {
        const p = c.results == null ? 0 : prog(t, c.results + i * 7 * I, c.results + i * 7 * I + 12 * I);
        if (p <= 0) { vis(tl.g, false); return; }
        vis(tl.g, true); tr(tl.g, tl.x, tl.y - (1 - E.bounce(p)) * (tl.y + 130), 0);
      });
      // save : bouton
      {
        const dt = c.saved == null ? -1 : t - c.saved;
        const sc = dt < 0 ? 1 : dt < 3 * I ? 1 - 0.06 * (dt / (3 * I)) : dt < 6 * I ? 0.94 + 0.06 * ((dt - 3 * I) / (3 * I)) : 1;
        tr(st.btn, 188, 470, 0, sc);
        const done = dt >= 3 * I;
        setA(st.btnBody, 'fill', done ? C.lime : C.ink);
        vis(st.btnL1, !done); vis(st.sv2, done);
      }

      /* ---- panneau ---- */
      const pi = lastIdx(st.pEv, t);
      const ck = pi >= 0 ? st.pEv[pi].key : null, pk = pi > 0 ? st.pEv[pi - 1].key : null;
      const pp = pi >= 0 ? prog(t, st.pEv[pi].t, st.pEv[pi].t + 12 * I) : 1;
      PANELS.forEach((key) => {
        const n = st.pg[key];
        if (key === ck) { dsp(n, true); tr(n, (1 - E.out3(pp)) * 940, 0, 0); st.pu[key](t - st.pEv[pi].t); }
        else if (key === pk && pp < 1) { dsp(n, true); tr(n, -E.out3(pp) * 940, 0, 0); st.pu[key](t - st.pEv[pi - 1].t); }
        else dsp(n, false);
      });
    }
  });
})();
