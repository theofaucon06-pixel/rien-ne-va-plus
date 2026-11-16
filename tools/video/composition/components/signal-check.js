// Composant `signal-check` : « Trois questions » et la règle de Nour (épisode 9, S3) : un signe = une conversation, deux = un appel ; un feu orange, pas un diagnostic.
// Cues : card, q1..q4, check-1, rule-1, check-2, rule-2, orange, other. Props : title, aside, rows[{q,ex}], checked[] (numéros de rangée 1..4), rule1, rule2, orange, not_diag, other.
// Fond lime (calme), aucun shake, amber #FFB21E réservé à la lampe du milieu et au sticker « FEU ORANGE ».
// Sans aucun cue `card` / `q*` le plan montre carte et 4 questions complètes (état final) ; sinon chaque étape attend son cue. Pure fonction du temps.
// Choix : `checked` est lu en numéros de rangée 1-4 (comme les carrés numérotés). Le feu passe lime -> amber au premier check posé (check-1, ou check-2 s'il est seul).
(() => {
  'use strict';
  const { C, E, clamp, prog, lerp, f2, sv, g, rect, circle, path, line, text, put, F } = ZV;
  const FR = 1 / 30;
  const AMBER = '#FFB21E';
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const str = (v, d) => (typeof v === 'string' && v.trim() ? v.trim() : d);
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const setT = (n, s) => { if (n.__s !== s) { n.__s = s; n.textContent = s; } };
  const firstCue = (beats, n) => { let r = null; for (const b of beats) if (b && b.do === 'cue' && b.name === n && isNum(b.t) && (r === null || b.t < r)) r = b.t; return r; };

  function textW(n, size, mono, len) {
    try { const w = n.getComputedTextLength(); if (w > 0) return w; } catch (e) { /* hors DOM */ }
    return len * size * (mono ? 0.6 : 0.64);
  }
  function fit(n, maxW, base, min) {
    n.setAttribute('font-size', base);
    const mono = n.getAttribute('font-family') === F.mono, L = (n.textContent || '').length;
    let w = textW(n, base, mono, L);
    if (w > maxW && w > 0) {
      const s = Math.max(min || base * 0.6, base * maxW / w);
      n.setAttribute('font-size', f2(s));
      w = textW(n, s, mono, L);
      if (w > maxW) { n.setAttribute('textLength', f2(maxW)); n.setAttribute('lengthAdjust', 'spacingAndGlyphs'); w = maxW; }
    }
    return w;
  }
  // taille réduite seulement (sans textLength) : pour le texte qui s'écrit caractère par caractère
  function fitSize(n, maxW, base, min) {
    n.setAttribute('font-size', base);
    const mono = n.getAttribute('font-family') === F.mono, L = (n.textContent || '').length;
    const w = textW(n, base, mono, L);
    if (w > maxW && w > 0) n.setAttribute('font-size', f2(Math.max(min, base * maxW / w)));
    return Math.min(w, maxW);
  }
  function wrap(parent, s, size, maxW, maxLines) {
    const probe = sv('text', { 'font-size': size, 'font-family': F.display, 'font-weight': 800, visibility: 'hidden' }, parent);
    const w = (x) => { probe.textContent = x; return textW(probe, size, false, x.length); };
    const lines = []; let cur = '';
    for (const wd of s.split(/\s+/).filter(Boolean)) { const nx = cur ? cur + ' ' + wd : wd; if (cur && w(nx) > maxW) { lines.push(cur); cur = wd; } else cur = nx; }
    if (cur) lines.push(cur);
    if (maxLines && lines.length > maxLines) { const rest = lines.splice(maxLines - 1).join(' '); lines.push(rest); }
    parent.removeChild(probe);
    return lines;
  }
  const pivot = (n, cx, cy, s) => { n.setAttribute('transform', `translate(${f2(cx)} ${f2(cy)}) scale(${f2(Math.max(0.0001, s))}) translate(${f2(-cx)} ${f2(-cy)})`); };

  const DEF_ROWS = [
    { q: 'TU REJOUES POUR TE REFAIRE ?', ex: 'ÉPISODE 4 · UN CRITÈRE OFFICIEL DU TROUBLE' },
    { q: "TU MENS SUR LE TEMPS OU SUR L'ARGENT ?", ex: 'UNE SOIRÉE → « UNE PETITE HEURE »' },
    { q: 'TU Y PENSES QUAND TU NE JOUES PAS ?', ex: 'AU TRAVAIL · À TABLE · DANS LE BUS' },
    { q: 'TU MISES PLUS POUR RESSENTIR PAREIL ?', ex: '10 € → 50 €' }
  ];
  const CX0 = 100, CX1 = 1200, CY0 = 80, CY1 = 790;
  const ROW_Y = (i) => 200 + 140 * i;
  const LX = 1530, LAMP_Y = [200, 400, 600], LAMP_R = 76;

  ZV.define('signal-check', {
    init(root, shot) {
      const p = (shot && shot.props) || {};
      const beats = Array.isArray(shot && shot.beats) ? shot.beats : [];
      const st = {};
      st.tCard = firstCue(beats, 'card');
      st.tQ = [1, 2, 3, 4].map((n) => firstCue(beats, 'q' + n));
      st.anyQ = st.tCard != null || st.tQ.some((x) => x != null);
      st.tC1 = firstCue(beats, 'check-1'); st.tR1 = firstCue(beats, 'rule-1'); st.tC2 = firstCue(beats, 'check-2'); st.tR2 = firstCue(beats, 'rule-2');
      st.tOr = firstCue(beats, 'orange'); st.tOt = firstCue(beats, 'other');

      rect(root, 0, 0, 1920, 1080, 0, C.lime);

      /* ---- carte ---- */
      st.card = g(root);
      rect(st.card, CX0 + 14, CY0 + 14, CX1 - CX0, CY1 - CY0, 0, C.ink);
      rect(st.card, CX0, CY0, CX1 - CX0, CY1 - CY0, 0, C.paper, C.ink, 8);
      const tt = text(st.card, str(p.title, '3 QUESTIONS'), 134, 160, 56, C.ink);
      const tw = fit(tt, 520, 56, 36);
      const as = text(st.card, str(p.aside, "DANS TA TÊTE · PERSONNE N'ÉCOUTE"), 0, 8, 24, C.paper, { mono: true, anchor: 'middle' });
      const aw = fit(as, 1150 - (134 + tw + 36) - 44, 24, 15) + 44;
      const ag = g(st.card);
      ag.appendChild(as);
      ag.insertBefore(rect(ag, -aw / 2, -26, aw, 52, 4, C.ink), as);
      put(ag, 1150 - aw / 2, 130, 2, 1, 1, 1);
      line(st.card, 120, 340, 1180, 340, C.ink, 3); line(st.card, 120, 480, 1180, 480, C.ink, 3);

      /* ---- rangées ---- */
      const rows = [];
      const src = Array.isArray(p.rows) && p.rows.length ? p.rows : DEF_ROWS;
      for (let i = 0; i < 4 && i < src.length; i++) {
        const r = src[i] || {}, d = DEF_ROWS[i];
        rows.push({ q: str(r.q, d.q), ex: str(r.ex, d.ex) });
      }
      let ck = Array.isArray(p.checked) ? p.checked.filter(isNum).map((x) => Math.round(x)) : [1, 3];
      ck = ck.filter((x) => x >= 1 && x <= rows.length);
      if (!ck.length) ck = [Math.min(1, rows.length), Math.min(3, rows.length)].filter((x, i, a) => a.indexOf(x) === i);
      st.checked = ck;
      st.rows = rows.map((r, i) => {
        const top = ROW_Y(i), o = { top, cy: top + 70 };
        o.hi = rect(st.card, 116, top + 4, 1068, 132, 0, C.lime);                 // surlignage quand la rangée est cochée
        o.hi.setAttribute('visibility', 'hidden');
        o.g = g(st.card);
        rect(o.g, 132, top + 20, 64, 64, 0, C.ink);
        text(o.g, String(i + 1), 164, top + 66, 40, C.paper, { mono: true, anchor: 'middle' });
        const q = text(o.g, r.q, 220, top + 58, 44, C.ink);
        fit(q, 840, 44, 32);
        o.ex = text(o.g, '', 220, top + 98, 24, C.ink, { mono: true });
        o.ex.textContent = r.ex; fitSize(o.ex, 840, 24, 16); o.ex.textContent = ''; o.full = r.ex;
        // case à cocher
        rect(o.g, 1090, top + 22, 72, 72, 0, C.white, C.ink, 6);
        o.ck = path(o.g, `M${1090 + 14} ${top + 22 + 38} L${1090 + 30} ${top + 22 + 54} L${1090 + 60} ${top + 22 + 16}`, 'none', C.ink, 12, { pathLength: 1, 'stroke-dasharray': '1 1', 'stroke-dashoffset': 1 });
        o.ck.setAttribute('visibility', 'hidden');
        if (i === 3) {
          rect(o.g, 118, top + 6, 1064, 102, 0, 'none', C.ink, 3, { 'stroke-dasharray': '14 10' });
          const lb = g(o.g);
          const lt = text(lb, 'SIGNE DISCRET', 0, 7, 20, C.ink, { mono: true, anchor: 'middle' });
          const lw = fit(lt, 220, 20, 14) + 20;
          lb.insertBefore(rect(lb, -lw / 2, -15, lw, 30, 0, C.paper), lt);
          put(lb, 1040, top + 6, 0, 1, 1, 1);
        }
        // « 10 € » barré quand « 50 € » apparaît (dernière rangée, exemple de la forme « a → b »)
        o.strike = null;
        const ai = r.ex.indexOf('→');
        if (i === 3 && ai > 0 && ai < r.ex.length - 1) {
          const probe = text(o.g, r.ex.slice(0, ai).trim(), 220, top + 98, 24, C.ink, { mono: true });
          probe.setAttribute('font-size', o.ex.getAttribute('font-size'));
          probe.setAttribute('visibility', 'hidden');
          const pw = textW(probe, 24, true, r.ex.slice(0, ai).trim().length);
          o.g.removeChild(probe);
          const fs = parseFloat(o.ex.getAttribute('font-size')) || 24;
          o.strike = { line: line(o.g, 214, top + 98 - fs * 0.32, 214 + pw + 12, top + 98 - fs * 0.32, C.ink, 6, { visibility: 'hidden' }), x0: 214, w: pw + 12, at: ai + 2, y: top + 98 - fs * 0.32 };
        }
        return o;
      });

      /* ---- feu tricolore ---- */
      rect(root, 1410 + 12, 100 + 12, 240, 600, 40, C.pocket);
      rect(root, 1410, 100, 240, 600, 40, C.ink, C.paper, 4);
      st.lamps = [AMBER, AMBER, AMBER].map((_, i) => circle(root, LX, LAMP_Y[i], LAMP_R, C.pocket, C.paper, 4));
      st.lampCol = [C.red, AMBER, C.lime];

      /* ---- étiquettes de règle ---- */
      const mkRule = (s, y) => {
        const gg = g(root);
        const tx = text(gg, s, 0, 12, 34, C.ink, { anchor: 'middle' });
        const w = fit(tx, 580, 34, 28) + 30;
        gg.insertBefore(rect(gg, -w / 2 + 5, -21 + 5, w, 42, 0, C.ink), tx);
        gg.insertBefore(rect(gg, -w / 2, -21, w, 42, 0, C.paper, C.ink, 4), tx);
        return { g: gg, y };
      };
      st.r1 = mkRule(str(p.rule1, '1 SIGNE → UNE CONVERSATION'), 733);
      st.r2 = mkRule(str(p.rule2, '2 SIGNES → UN APPEL'), 779);

      /* ---- sticker « feu orange » (côté gauche du boîtier) ---- */
      st.or = g(root);
      const ol = wrap(st.or, str(p.orange, 'FEU ORANGE'), 40, 190, 2);
      const oh = ol.length * 44 + 30;
      const ots = ol.map((l, i) => text(st.or, l, 0, -oh / 2 + 15 + 36 + i * 44, 40, C.ink, { anchor: 'middle' }));
      const ow = Math.max(...ots.map((n) => fit(n, 190, 40, 28))) + 44;
      st.or.insertBefore(rect(st.or, -ow / 2 + 9, -oh / 2 + 9, ow, oh, 10, C.ink), st.or.firstChild);
      st.or.insertBefore(rect(st.or, -ow / 2, -oh / 2, ow, oh, 10, AMBER, C.ink, 6), st.or.children[1]);
      st.orX = Math.max(1222 + ow / 2, 1410 - 6 - ow / 2 + 40); st.orX = 1214 + 12 + ow / 2; st.orY = 400;

      /* ---- tampon « pas un diagnostic » (ink, en travers du haut du boîtier) ---- */
      st.nd = g(root);
      const nl = wrap(st.nd, str(p.not_diag, 'PAS UN DIAGNOSTIC'), 40, 320, 2);
      const nh = nl.length * 44 + 34;
      const nts = nl.map((l, i) => text(st.nd, l, 0, -nh / 2 + 17 + 36 + i * 44, 40, C.ink, { anchor: 'middle' }));
      const nw = Math.max(...nts.map((n) => fit(n, 330, 40, 26))) + 52;
      st.nd.insertBefore(rect(st.nd, -nw / 2 + 8, -nh / 2 + 8, nw, nh, 6, C.ink), st.nd.firstChild);
      st.nd.insertBefore(rect(st.nd, -nw / 2, -nh / 2, nw, nh, 6, C.paper, C.ink, 8), st.nd.children[1]);
      st.nd.insertBefore(rect(st.nd, -nw / 2 + 9, -nh / 2 + 9, nw - 18, nh - 18, 2, 'none', C.ink, 3), st.nd.children[2]);
      st.ndY = 100 + 8 + nh / 2 + 36;

      /* ---- sticker « aussi quand c'est un proche » ---- */
      st.ot = g(root);
      const otx = text(st.ot, str(p.other, "AUSSI QUAND C'EST UN PROCHE"), 0, 10, 28, C.ink, { anchor: 'middle' });
      const otw = fit(otx, 560, 28, 20) + 40;
      st.ot.insertBefore(rect(st.ot, -otw / 2 + 6, -22 + 6, otw, 44, 6, C.ink), otx);
      st.ot.insertBefore(rect(st.ot, -otw / 2, -22, otw, 44, 6, C.paper, C.ink, 4), otx);
      st.otX = CX1 - 24 - otw / 2; st.otY = 761;
      return st;
    },

    update(st, t) {
      const live = st.anyQ;
      /* ---- carte ---- */
      let cy = 0, cardOn = true;
      if (st.tCard != null) { if (t < st.tCard) cardOn = false; else cy = (1 - E.out3(prog(t, st.tCard, st.tCard + 10 * FR))) * 900; }
      else if (live && st.tQ.some((x) => x != null)) cardOn = true;
      setA(st.card, 'visibility', cardOn ? 'visible' : 'hidden');
      st.card.setAttribute('transform', `translate(0 ${f2(cy)})`);

      /* ---- rangées ---- */
      const dy = cy;
      const nCk = st.checked;
      const tCk = [st.tC1, st.tC2];
      for (let i = 0; i < st.rows.length; i++) {
        const o = st.rows[i], tq = st.tQ[i];
        let tt = tq;
        if (!live) tt = -1e3;                                  // aucun cue de rangée : tout est posé
        const on = cardOn && tt != null && t >= tt;
        setA(o.g, 'visibility', on ? 'visible' : 'hidden');
        if (on) {
          const pq = prog(t, tt, tt + 8 * FR);
          const s = 0.55 + 0.45 * E.back(pq);
          pivot(o.g, 660, o.cy, s);
          const n = Math.floor((t - (tt + 8 * FR)) / FR) + 1;
          const k = clamp(n, 0, o.full.length);
          setT(o.ex, o.full.slice(0, k));
          if (o.strike) {
            const ts = tt + 8 * FR + (o.strike.at - 1) * FR;
            const q = prog(t, ts, ts + 4 * FR);
            setA(o.strike.line, 'visibility', q > 0 ? 'visible' : 'hidden');
            setA(o.strike.line, 'x2', f2(o.strike.x0 + o.strike.w * q));
          }
        }
        // coche
        let tc = null;
        for (let j = 0; j < nCk.length && j < 2; j++) if (nCk[j] === i + 1 && tCk[j] != null) tc = tc == null ? tCk[j] : Math.min(tc, tCk[j]);
        const cq = tc == null ? 0 : prog(t, tc, tc + 6 * FR);
        const hiOn = tc != null && t >= tc;
        setA(o.hi, 'visibility', hiOn && on && cardOn ? 'visible' : 'hidden');
        setA(o.ck, 'visibility', cq > 0 ? 'visible' : 'hidden');
        setA(o.ck, 'stroke-dashoffset', f2(1 - cq));
      }

      /* ---- feu ---- */
      let tAmber = null;
      for (const x of [st.tC1, st.tC2]) if (x != null && (tAmber == null || x < tAmber)) tAmber = x;
      const amber = tAmber != null && t >= tAmber;
      for (let i = 0; i < 3; i++) {
        const lit = i === 2 ? !amber : (i === 1 ? amber : false);
        setA(st.lamps[i], 'fill', lit ? st.lampCol[i] : C.pocket);
        setA(st.lamps[i], 'stroke', lit ? C.ink : C.paper);
        setA(st.lamps[i], 'stroke-width', lit ? 6 : 4);
      }

      /* ---- règles ---- */
      const rl = (r, t0) => {
        if (t0 == null || t < t0) { ZV.show(r.g, false); return; }
        const q = prog(t, t0, t0 + 7 * FR);
        const s = Math.max(0.01, E.back(q));
        put(r.g, 1535, r.y - 16 * (1 - E.out2(q)), 0, s, s, 1);
      };
      rl(st.r1, st.tR1); rl(st.r2, st.tR2);

      /* ---- feu orange + tampon ---- */
      if (st.tOr == null || t < st.tOr) { ZV.show(st.or, false); ZV.show(st.nd, false); }
      else {
        const s = Math.max(0.01, E.back(prog(t, st.tOr, st.tOr + 8 * FR)));
        put(st.or, st.orX, st.orY, -3, s, s, 1);
        const t2 = st.tOr + 0.6;
        if (t < t2) ZV.show(st.nd, false);
        else { const q = E.out3(prog(t, t2, t2 + 5 * FR)); const sc = lerp(1.7, 1, q); put(st.nd, 1530, st.ndY, 4, sc, sc, clamp(q * 4, 0, 1)); }
      }

      /* ---- « aussi un proche » ---- */
      if (st.tOt == null || t < st.tOt) ZV.show(st.ot, false);
      else { const s = Math.max(0.01, E.back(prog(t, st.tOt, st.tOt + 8 * FR))); put(st.ot, st.otX, st.otY, -1.5, s, s, 1); }
    }
  });
})();
