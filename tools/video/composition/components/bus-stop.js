// Composant `bus-stop` : « Fin de nuit. Un arrêt de bus, en face d'un casino » (ouverture et retour à l'aube, épisode 9).
// Cues : door, nour, bubble, service, walk, dawn, night. Props : sign, name, role, service, service_note, bubble[2], you, time (night|dawn).
// Rue vue de face : ciel 3 bandes plates, abribus à gauche, façade générique à droite (marquise + 16 ampoules), Nour (silhouette sans visage), TOI (pion).
// Écart assumé : le panneau « PROCHAIN BUS » est posé sur la paroi vitrée (x 196-356) et non à x 560-700, pour que Nour (x ≈ 600) ne le masque pas.
// Fond peint par le composant. Aucun dégradé, flou, lueur ni filter. Pure fonction du temps.
(() => {
  'use strict';
  const { C, E, clamp, prog, lerp, f2, sv, g, rect, circle, path, line, text, put, F } = ZV;
  const FR = 1 / 30;
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const str = (v, d) => (typeof v === 'string' && v.trim() ? v.trim() : d);
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const setT = (n, s) => { if (n.__s !== s) { n.__s = s; n.textContent = s; } };

  function textW(n, size, mono, len) {
    try { const w = n.getComputedTextLength(); if (w > 0) return w; } catch (e) { /* hors DOM */ }
    return len * size * (mono ? 0.6 : 0.62);
  }
  // réduit la taille (jusqu'à min) puis impose la largeur si ça déborde encore
  function fit(n, maxW, base, min) {
    n.setAttribute('font-size', base);
    let w = textW(n, base, n.getAttribute('font-family') === F.mono, (n.textContent || '').length);
    if (w > maxW && w > 0) {
      const s = Math.max(min || base * 0.6, base * maxW / w);
      n.setAttribute('font-size', f2(s));
      w = textW(n, s, n.getAttribute('font-family') === F.mono, (n.textContent || '').length);
      if (w > maxW) { n.setAttribute('textLength', f2(maxW)); n.setAttribute('lengthAdjust', 'spacingAndGlyphs'); w = maxW; }
    }
    return w;
  }
  function wrap(parent, s, size, maxW, mono, maxLines) {
    const probe = sv('text', { 'font-size': size, 'font-family': mono ? F.mono : F.display, 'font-weight': 800, visibility: 'hidden' }, parent);
    const words = s.split(/\s+/).filter(Boolean);
    const w = (x) => { probe.textContent = x; return textW(probe, size, mono, x.length); };
    let lines = [], cur = '';
    for (const wd of words) {
      const nx = cur ? cur + ' ' + wd : wd;
      if (cur && w(nx) > maxW) { lines.push(cur); cur = wd; } else cur = nx;
    }
    if (cur) lines.push(cur);
    if (maxLines && lines.length > maxLines) { const rest = lines.splice(maxLines - 1).join(' '); lines.push(rest); }
    parent.removeChild(probe);
    return lines;
  }
  const firstCue = (beats, n) => { let r = null; for (const b of beats) if (b && b.do === 'cue' && b.name === n && isNum(b.t) && (r === null || b.t < r)) r = b.t; return r; };

  const BULBS = 16, BX0 = 1140 + 18.75, BDX = 37.5, BY = 360;
  const DOOR = { x: 1360, y: 440, w: 160, h: 260 };
  const NOUR = { x: 600, y: 700 }, TOI_X0 = 1440, TOI_X1 = 820;

  ZV.define('bus-stop', {
    init(root, shot) {
      const p = (shot && shot.props) || {};
      const beats = Array.isArray(shot && shot.beats) ? shot.beats : [];
      const st = {};
      st.tDoor = firstCue(beats, 'door'); st.tNour = firstCue(beats, 'nour'); st.tBub = firstCue(beats, 'bubble');
      st.tSrv = firstCue(beats, 'service'); st.tWalk = firstCue(beats, 'walk');
      st.tod = beats.filter((b) => b && b.do === 'cue' && (b.name === 'dawn' || b.name === 'night') && isNum(b.t)).map((b) => ({ t: b.t, k: b.name })).sort((a, c) => a.t - c.t);
      st.init = p.time === 'dawn' ? 'dawn' : 'night';

      const sign = str(p.sign, 'CASINO'), nameS = str(p.name, 'NOUR'), roleS = str(p.role, 'ÉCOUTANTE · PERSONNAGE FICTIF');
      const service = str(p.service, 'JOUEURS INFO SERVICE'), note = str(p.service_note, 'UN SERVICE RÉEL · SANTÉ PUBLIQUE FRANCE');
      const bub = Array.isArray(p.bubble) && p.bubble.length ? p.bubble.map((x) => str(x, '')).filter(Boolean) : [];
      const b1 = bub[0] || 'TU SORS ?', b2 = bub[1] || 'IL EST TÔT. OU TARD.';
      const youS = str(p.you, 'TOI');

      /* ---- ciel (3 bandes), étoiles, mur, trottoir, chaussée ---- */
      st.sky = [rect(root, 0, 0, 1920, 260, 0, C.ink), rect(root, 0, 260, 1920, 220, 0, C.ink), rect(root, 0, 480, 1920, 140, 0, C.pocket)];
      st.stars = g(root);
      const r = ZV.rng(2409);
      for (let i = 0; i < 18; i++) { const s = 5 + Math.floor(r() * 4); rect(st.stars, Math.round(40 + r() * 1840), Math.round(20 + r() * 150), s, s, 0, C.paper, null, 0, { opacity: f2(0.55 + r() * 0.4) }); }
      rect(root, 0, 620, 1920, 90, 0, C.pocket);
      for (let x = 0; x < 1920; x += 160) rect(root, x, 620, 4, 90, 0, C.ink);
      st.horizon = rect(root, 0, 628, 1920, 8, 0, C.lime);
      rect(root, -10, 700, 1940, 60, 0, C.paper, C.ink, 6);
      rect(root, 0, 760, 1920, 320, 0, C.ink);
      for (let x = 40; x < 1920; x += 240) rect(root, x, 900, 120, 10, 0, C.grey);

      /* ---- façade du casino (bloc sans fenêtre) ---- */
      rect(root, 1080, 190, 720, 510, 0, C.ink, C.paper, 6);
      rect(root, 1092, 392, 696, 8, 0, C.pocket); rect(root, 1092, 596, 696, 8, 0, C.pocket);
      for (const x of [1220, 1660]) rect(root, x, 404, 8, 192, 0, C.pocket);
      rect(root, 1140, 230, 600, 100, 10, C.pocket, C.paper, 6);
      rect(root, 1150, 238, 580, 8, 0, C.red); rect(root, 1150, 314, 580, 8, 0, C.red);
      const sg = text(root, sign, 1440, 308, 96, C.paper, { anchor: 'middle' });
      fit(sg, 520, 96, 56);
      st.bulbs = [];
      for (let i = 0; i < BULBS; i++) st.bulbs.push(circle(root, f2(BX0 + i * BDX), BY, 12, C.paper, C.paper, 3));
      // porte : ouverture sombre + battant paper qui glisse
      rect(root, DOOR.x, DOOR.y, DOOR.w, DOOR.h, 0, C.pocket, C.paper, 6);
      st.leaf = g(root);
      rect(st.leaf, DOOR.x, DOOR.y, DOOR.w, DOOR.h, 0, C.paper, C.ink, 6);
      line(st.leaf, DOOR.x + DOOR.w / 2, DOOR.y + 4, DOOR.x + DOOR.w / 2, DOOR.y + DOOR.h - 4, C.ink, 5);
      line(st.leaf, DOOR.x + 6, DOOR.y + 130, DOOR.x + DOOR.w - 6, DOOR.y + 130, C.ink, 5);
      rect(st.leaf, DOOR.x + DOOR.w / 2 - 22, DOOR.y + 150, 8, 56, 3, C.ink); rect(st.leaf, DOOR.x + DOOR.w / 2 + 14, DOOR.y + 150, 8, 56, 3, C.ink);
      // trapèze de lumière
      st.light = path(root, 'M1360 700 L1520 700 L1640 860 L1240 860Z', C.white);

      /* ---- abribus ---- */
      rect(root, 160, 330, 16, 370, 0, C.ink, C.paper, 3); rect(root, 696, 330, 16, 370, 0, C.ink, C.paper, 3);
      rect(root, 180, 330, 340, 360, 0, C.paper, C.ink, 6);
      path(root, 'M430 332 L494 332 L402 688 L338 688Z', C.white, null, 0, { opacity: 0.7 });
      rect(root, 516, 330, 10, 360, 0, C.ink);
      rect(root, 140, 300, 580, 30, 0, C.ink, C.paper, 4);
      // banc
      rect(root, 190, 676, 322, 16, 3, C.ink, C.paper, 3); rect(root, 214, 690, 14, 10, 0, C.ink); rect(root, 474, 690, 14, 10, 0, C.ink);
      // panneau horaires
      rect(root, 196, 342, 160, 146, 0, C.paper, C.ink, 6);
      rect(root, 199, 345, 154, 36, 0, C.ink);
      fit(text(root, 'PROCHAIN BUS', 276, 370, 19, C.paper, { anchor: 'middle', mono: true }), 140, 19, 14);
      text(root, '— —', 276, 456, 60, C.ink, { anchor: 'middle', mono: true });

      /* ---- carte du service (sur la paroi vitrée) ---- */
      const sl = wrap(root, service, 34, 286, false, 2), nl = wrap(root, note, 20, 286, true, 2);
      const ch = 18 + sl.length * 38 + 10 + nl.length * 25 + 14;
      st.srv = g(root);
      rect(st.srv, -150 + 10, -ch / 2 + 10, 300, ch, 0, C.ink);
      rect(st.srv, -150, -ch / 2, 300, ch, 0, C.paper, C.ink, 6);
      let yy = -ch / 2 + 18 + 28;
      sl.forEach((l) => { fit(text(st.srv, l, -134, yy, 34, C.ink), 268, 34, 26); yy += 38; });
      yy += -4;
      rect(st.srv, -134, yy - 14, 268, 4, 0, C.ink); yy += 14;
      nl.forEach((l) => { fit(text(st.srv, l, -134, yy, 20, C.ink, { mono: true }), 268, 20, 15); yy += 25; });
      st.srvY = 592; st.srvX = 350;

      /* ---- Nour ---- */
      st.nour = g(root);
      const n = st.nour;
      rect(n, -30, -52, 22, 52, 3, C.ink); rect(n, 8, -52, 22, 52, 3, C.ink);
      path(n, 'M-48 -222 L48 -222 L68 -50 L-68 -50Z', C.lime, C.ink, 6);
      line(n, 0, -220, 0, -54, C.ink, 4);
      path(n, 'M-48 -218 L-24 -218 L-30 -92 L-64 -92Z', C.lime, C.ink, 6);
      path(n, 'M48 -218 L24 -218 L30 -92 L64 -92Z', C.lime, C.ink, 6);
      line(n, -66, -104, -36, -92, C.ink, 5); line(n, 66, -104, 36, -92, C.ink, 5);
      rect(n, -14, -236, 28, 18, 0, C.ink);
      circle(n, 0, -266, 36, C.paper, C.ink, 6);
      path(n, 'M-35 -262 A36 36 0 0 1 35 -262 Q0 -282 -35 -262Z', C.ink);
      // étiquette (au-dessus de la tête)
      st.nlab = g(root);
      const nn = text(st.nlab, nameS, 0, -8, 52, C.ink, { anchor: 'middle' });
      const rr = text(st.nlab, roleS, 0, 28, 24, C.ink, { anchor: 'middle', mono: true });
      const nw = Math.max(fit(nn, 480, 52, 34), fit(rr, 480, 24, 16));
      const lw = Math.max(200, nw + 44);
      st.nlab.insertBefore(rect(st.nlab, -lw / 2 + 10, -58 + 10, lw, 100, 8, C.ink), st.nlab.firstChild);
      st.nlab.insertBefore(rect(st.nlab, -lw / 2, -58, lw, 100, 8, C.paper, C.ink, 6), st.nlab.children[1]);
      st.nlabX = NOUR.x; st.nlabY = 336;

      /* ---- bulle (pointe en (0,0) du repère local) ---- */
      st.bub = g(root);
      const tipX = 650, tipY = 266;
      const m1 = text(st.bub, b1, 0, 0, 44, C.ink), m2 = text(st.bub, b2, 0, 0, 44, C.ink);
      const bw = Math.min(660, Math.max(fit(m1, 600, 44, 30), fit(m2, 600, 44, 30), 330) + 64);
      st.bub.removeChild(m1); st.bub.removeChild(m2);
      const bh = 62 * 2 + 40;
      const bx = 740 - bw - tipX, by = 60 - tipY;
      const tailX = clamp(tipX - 20, 140, 700) - tipX;
      const bd = `M${bx} ${by} h${bw} v${bh} H${tailX + 70} L0 0 L${tailX + 10} ${by + bh} H${bx}Z`;
      path(st.bub, bd, C.ink, null, 0, { transform: 'translate(10 10)' });
      path(st.bub, bd, C.paper, C.ink, 6);
      st.bub.appendChild(m1); st.bub.appendChild(m2);
      m1.setAttribute('x', bx + 32); m1.setAttribute('y', by + 68); m2.setAttribute('x', bx + 32); m2.setAttribute('y', by + 68 + 62);
      st.t1 = m1; st.t2 = m2; st.tipX = tipX; st.tipY = tipY;

      /* ---- TOI ---- */
      st.toi = g(root);
      rect(st.toi, -35, -110, 70, 110, 30, C.white, C.ink, 6);
      circle(st.toi, 0, -140, 26, C.white, C.ink, 6);
      const yl = text(st.toi, youS, 0, -190, 22, C.ink, { anchor: 'middle', mono: true });
      const yw = fit(yl, 140, 22, 16);
      st.toi.insertBefore(rect(st.toi, -yw / 2 - 12, -212, yw + 24, 32, 6, C.paper, C.ink, 4), yl);
      return st;
    },

    update(st, t) {
      /* ---- jour / nuit ---- */
      let last = null; for (const e of st.tod) if (e.t <= t) last = e;
      const dawn = last ? last.k === 'dawn' : st.init === 'dawn';
      const t0 = last && dawn ? last.t : -1e3;
      const k0 = dawn && t >= t0, k1 = dawn && t >= t0 + 12 * FR, k2 = dawn && t >= t0 + 24 * FR, k3 = dawn && t >= t0 + 36 * FR;
      setA(st.sky[0], 'fill', k0 ? C.pocket : C.ink);
      setA(st.sky[1], 'fill', k1 ? C.paper : C.ink);
      setA(st.sky[2], 'fill', k2 ? C.lime : C.pocket);
      setA(st.horizon, 'visibility', k3 ? 'visible' : 'hidden');
      setA(st.stars, 'visibility', k0 ? 'hidden' : 'visible');
      const step = Math.floor(Math.max(0, t) * 2);
      for (let i = 0; i < BULBS; i++) {
        const off = dawn && t >= t0 + (BULBS - 1 - i) * FR;
        const col = off ? C.ink : ((i + step) & 1 ? C.lime : C.paper);
        setA(st.bulbs[i], 'fill', col); setA(st.bulbs[i], 'stroke', off ? C.grey : col);
      }

      /* ---- porte ---- */
      const td = st.tDoor;
      let open = 0;
      if (td != null) open = E.io2(prog(t, td, td + 8 * FR)) - E.io2(prog(t, td + 1.9, td + 1.9 + 8 * FR));
      st.leaf.setAttribute('transform', `translate(${DOOR.x} 0) scale(${f2(Math.max(0.0001, 1 - 0.88 * open))} 1) translate(${-DOOR.x} 0)`);
      const lightOn = td != null && t >= td + 3 * FR && t < td + 1.9 + 8 * FR;
      if (lightOn) { const q = E.out2(prog(t, td + 3 * FR, td + 9 * FR)); st.light.setAttribute('transform', `translate(0 700) scale(1 ${f2(Math.max(0.001, q))}) translate(0 -700)`); }
      setA(st.light, 'visibility', lightOn ? 'visible' : 'hidden');

      /* ---- TOI ---- */
      const tE = td != null ? td + 8 * FR : null, tw = st.tWalk;
      const tShow = tE != null && tw != null ? Math.min(tE, tw) : (tE != null ? tE : tw);
      if (tShow == null || t < tShow) { ZV.show(st.toi, false); }
      else {
        const door = tE != null && tShow === tE;
        const e = door ? E.out2(prog(t, tShow, tShow + 0.7)) : E.back(prog(t, tShow, tShow + 8 * FR));
        let x = TOI_X0, rot = 0;
        if (tw != null && t >= tw) { const w = prog(t, tw, tw + 2.4); x = lerp(TOI_X0, TOI_X1, E.io2(w)); rot = 3 * Math.sin(w * 6 * Math.PI); }
        const y = door ? lerp(700, 735, e) : 735, sc = door ? lerp(0.86, 1, e) : Math.max(0.01, e);
        put(st.toi, x, y, rot, sc, sc, 1);
      }

      /* ---- Nour ---- */
      const tn = st.tNour;
      if (tn == null || t < tn) { ZV.show(st.nour, false); ZV.show(st.nlab, false); }
      else {
        const q = E.back(prog(t, tn, tn + 8 * FR));
        put(st.nour, NOUR.x, NOUR.y, 0, Math.max(0.01, q), Math.max(0.01, q), 1);
        const ql = prog(t, tn + 0.45, tn + 0.45 + 6 * FR);
        if (ql <= 0) ZV.show(st.nlab, false);
        else { const s = Math.max(0.01, E.back(ql)); put(st.nlab, st.nlabX, st.nlabY, -2, s, s, 1); }
      }

      /* ---- bulle ---- */
      const tb = st.tBub;
      if (tb == null || t < tb) ZV.show(st.bub, false);
      else {
        const s = Math.max(0.01, E.back(prog(t, tb, tb + 6 * FR)));
        put(st.bub, st.tipX, st.tipY, 0, s, s, 1);
        setA(st.t2, 'visibility', t >= tb + 1.0 ? 'visible' : 'hidden');
      }

      /* ---- carte du service ---- */
      const ts = st.tSrv;
      if (ts == null || t < ts) ZV.show(st.srv, false);
      else { const s = Math.max(0.01, E.back(prog(t, ts, ts + 8 * FR))); put(st.srv, st.srvX, st.srvY, -1.5, s, s, 1); }
    }
  });
})();
