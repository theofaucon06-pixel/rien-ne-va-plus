// Composant `ticket-choice` : l'expérience d'Ellen Langer (1975, S5 de l'épisode 3). Deux blocs de six billets de loterie : « ILS CHOISISSENT » (une main entoure un billet) / « ON LEUR DONNE » (un billet glisse dans la main).
// Cues : setup, choose, give, same, offer, price-left, price-right, illusion. Fond pocket. Aucun dégradé, flou, lueur ni filter ; aucun chiffre de prix ; mains plates sans visage.
(() => {
  'use strict';
  const { C, E, clamp, prog, lerp, f2, sv, g, rect, circle, path, line, text, put, sticker, shakeAt } = ZV;
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const str = (v, d) => (typeof v === 'string' && v.trim() ? v.trim() : d);
  function fit(n, maxW) {
    try { const w = n.getComputedTextLength(); if (w > maxW && w > 0) { n.setAttribute('textLength', f2(maxW)); n.setAttribute('lengthAdjust', 'spacingAndGlyphs'); } } catch (e) { /* hors DOM */ }
  }

  const TW = 250, TH = 116, GAPX = 22, GAPY = 22, TOPY = 250;
  const BLOCK_X = [90, 1308];                  // gauche, droite
  const CHOSEN = 4, GIVEN = 5;                  // billets visés (rangée du bas)
  const GIVE_END = { x: 1700, y: 706 };

  // billet cranté, centré sur (0,0)
  function ticketPath(w, h) {
    const hw = w / 2, hh = h / 2, br = 7, rc = 14;
    let d = `M${-hw} ${-hh}`;
    for (let x = -hw + 30; x <= hw - 30; x += 30) d += `L${x - br} ${-hh}A${br} ${br} 0 0 0 ${x + br} ${-hh}`;
    d += `L${hw} ${-hh}L${hw} ${-rc}A${rc} ${rc} 0 0 0 ${hw} ${rc}L${hw} ${hh}`;
    for (let x = hw - 30; x >= -hw + 30; x -= 30) d += `L${x + br} ${hh}A${br} ${br} 0 0 0 ${x - br} ${hh}`;
    d += `L${-hw} ${hh}L${-hw} ${rc}A${rc} ${rc} 0 0 0 ${-hw} ${-rc}Z`;
    return d;
  }
  function split2(s) {
    const w = s.split(/\s+/); if (w.length < 2) return [s, ''];
    let best = 1, bd = 1e9;
    for (let j = 1; j < w.length; j++) { const d = Math.abs(w.slice(0, j).join(' ').length - w.slice(j).join(' ').length); if (d < bd) { bd = d; best = j; } }
    return [w.slice(0, best).join(' '), w.slice(best).join(' ')];
  }
  function drawPointer(parent) {
    const h = g(parent);
    rect(h, -62, 120, 150, 150, 40, C.paper, C.ink, 6);
    for (let k = 0; k < 3; k++) rect(h, 26, 110 + k * 36, 52 - k * 4, 34, 17, C.paper, C.ink, 6);
    sv('ellipse', { cx: -64, cy: 190, rx: 19, ry: 46, fill: C.paper, stroke: C.ink, 'stroke-width': 6, transform: 'rotate(24 -64 190)' }, h);
    rect(h, -20, 0, 40, 160, 20, C.paper, C.ink, 6);
    rect(h, -14, 128, 28, 40, 0, C.paper);
    rect(h, -66, 270, 158, 52, 4, C.red, C.ink, 6);
    rect(h, -52, 322, 130, 420, 4, C.paper, C.ink, 6);
    return h;
  }
  function drawPalm(parent) {
    const h = g(parent);
    for (let k = 0; k < 4; k++) rect(h, -250 + k * 8, 2 + k * 15, 120 - k * 4, 14, 7, C.paper, C.ink, 4);
    rect(h, -170, 0, 330, 74, 32, C.paper, C.ink, 6);
    rect(h, 142, -6, 52, 78, 4, C.red, C.ink, 6);
    rect(h, 194, 0, 400, 66, 4, C.paper, C.ink, 6);
    return h;
  }

  ZV.define('ticket-choice', {
    init(root, shot) {
      const p = (shot && shot.props) || {};
      const beats = Array.isArray(shot && shot.beats) ? shot.beats : [];
      const cueT = (n) => { const b = beats.filter((x) => x && x.do === 'cue' && x.name === n && isNum(x.t)).sort((a, c) => a.t - c.t)[0]; return b ? b.t : null; };
      const r = ZV.rng(1975);
      const st = {};
      for (const k of ['choose', 'give', 'same', 'offer', 'price-left', 'price-right', 'illusion']) st[k] = cueT(k);
      const ts = cueT('setup');
      st.tS = ts == null ? -5 : ts;

      rect(root, 0, 0, 1920, 1080, 0, C.pocket);

      /* ---- bandeau « même loterie » ---- */
      st.ban = g(root);
      rect(st.ban, -800 + 12, -45 + 12, 1600, 90, 14, C.ink);
      rect(st.ban, -800, -45, 1600, 90, 14, C.lime, C.ink, 7);
      circle(st.ban, -730, 0, 46, C.paper, C.ink, 6);
      rect(st.ban, -754, -17, 48, 11, 3, C.ink);
      rect(st.ban, -754, 6, 48, 11, 3, C.ink);
      fit(text(st.ban, str(p.banner, 'MÊME LOTERIE · MÊMES CHANCES'), 50, 19, 54, C.ink, { anchor: 'middle' }), 1380);

      /* ---- en-têtes ---- */
      st.heads = [str(p.left, 'ILS CHOISISSENT'), str(p.right, 'ON LEUR DONNE')].map((s, i) => {
        const hg = g(root);
        sticker(hg, 520, 80, i ? C.white : C.lime, '', 1, C.ink, { sh: 9, r: 14 });
        fit(text(hg, s, 0, 17, 48, C.ink, { anchor: 'middle' }), 470);
        return hg;
      });

      /* ---- billets ---- */
      const d = ticketPath(TW, TH);
      st.tk = [];
      for (let side = 0; side < 2; side++) {
        for (let i = 0; i < 6; i++) {
          const col = i % 2, row = Math.floor(i / 2);
          const x = BLOCK_X[side] + col * (TW + GAPX) + TW / 2, y = TOPY + row * (TH + GAPY) + TH / 2;
          const ghost = path(root, d, 'none', C.paper, 4, { 'stroke-dasharray': '10 10', opacity: 0.5, visibility: 'hidden', transform: `translate(${f2(x)} ${f2(y)})` });
          const tg = g(root);
          path(tg, d, C.ink, null, 0, { transform: 'translate(7 7)' });
          const body = g(tg);
          const bp = path(body, d, C.paper, C.ink, 5);
          line(body, -TW / 2 + 70, -TH / 2 + 14, -TW / 2 + 70, TH / 2 - 14, C.ink, 3, { 'stroke-dasharray': '6 8' });
          for (let b = 0; b < 4; b++) rect(body, -TW / 2 + 16 + b * 13, -22 + (b % 2) * 6, 6 + (b % 3) * 2, 44 - (b % 2) * 12, 1, C.ink);
          const num = String(1000 + Math.floor(r() * 8999));
          text(body, num, 34, 17, 48, C.ink, { anchor: 'middle', mono: true });
          st.tk.push({ tg, body, bp, ghost, x, y, side, i, rot: (r() - 0.5) * 4, num });
        }
      }
      // marqueur rouge autour du billet choisi
      const ct = st.tk[CHOSEN];
      st.mark = sv('ellipse', { cx: ct.x, cy: ct.y, rx: 168, ry: 84, fill: 'none', stroke: C.red, 'stroke-width': 9, pathLength: 1, 'stroke-dasharray': '0 1.01', 'stroke-linecap': 'round', transform: `rotate(-6 ${ct.x} ${ct.y})` }, root);

      /* ---- mains ---- */
      st.hand1 = g(root);
      st.hand1i = drawPointer(st.hand1);
      st.hand2 = g(root);
      st.hand2i = drawPalm(st.hand2);

      /* ---- milieu : offre, prix, tampon ---- */
      st.offerG = g(root);
      sticker(st.offerG, 620, 112, C.white, '', 1, C.ink, { sh: 11 });
      fit(text(st.offerG, str(p.offer, 'JE TE LE RACHÈTE ?'), 0, 19, 56, C.ink, { anchor: 'middle' }), 560);
      st.pl = g(root);
      rect(st.pl, -180 + 12, -75 + 12, 360, 150, 16, C.ink);
      rect(st.pl, -180, -75, 360, 150, 16, C.red, C.ink, 8);
      {
        const s = str(p.price_left, 'BEAUCOUP PLUS CHER'); const w = split2(s);
        if (w[1]) { fit(text(st.pl, w[0], 0, -8, 56, C.ink, { anchor: 'middle' }), 320); fit(text(st.pl, w[1], 0, 52, 56, C.ink, { anchor: 'middle' }), 320); }
        else fit(text(st.pl, s, 0, 18, 56, C.ink, { anchor: 'middle' }), 320);
      }
      st.pr = g(root);
      rect(st.pr, -110 + 8, -40 + 8, 220, 80, 12, C.ink);
      rect(st.pr, -110, -40, 220, 80, 12, C.white, C.ink, 6);
      fit(text(st.pr, str(p.price_right, 'BIEN MOINS'), 0, 12, 34, C.ink, { anchor: 'middle' }), 190);
      st.stamp = g(root);
      rect(st.stamp, -280 + 12, -85 + 12, 560, 170, 14, C.ink);
      rect(st.stamp, -280, -85, 560, 170, 14, C.red, C.ink, 9);
      rect(st.stamp, -262, -67, 524, 134, 8, 'none', C.ink, 4);
      {
        const s = str(p.stamp, 'ILLUSION DE CONTRÔLE'); const w = split2(s);
        if (w[1]) { fit(text(st.stamp, w[0], 0, -6, 62, C.ink, { anchor: 'middle' }), 480); fit(text(st.stamp, w[1], 0, 54, 62, C.ink, { anchor: 'middle' }), 480); }
        else fit(text(st.stamp, s, 0, 20, 64, C.ink, { anchor: 'middle' }), 480);
      }
      return st;
    },

    update(st, t) {
      /* ---- bandeau ---- */
      const bq = st.same == null ? 0 : clamp((t - st.same) / 0.45);
      const by = lerp(-160, 73, E.back(bq));
      put(st.ban, 960, by, 0, 1, 1, bq > 0 ? 1 : 0);

      /* ---- en-têtes + billets ---- */
      st.heads.forEach((h, i) => {
        const q = E.back(clamp((t - st.tS - i * 0.05) / 0.3));
        put(h, i ? 1569 : 351, 190, i ? 1.5 : -1.5, q, q, q > 0 ? 1 : 0);
      });
      const tkC = st.tk[CHOSEN], tkG = st.tk[GIVEN];
      st.tk.forEach((k) => {
        const idx = k.i * 2 + k.side;
        const q = clamp((t - st.tS - 0.12 - idx * 0.05) / 0.28);
        let x = k.x, y = k.y, rot = k.rot, sc = E.back(q), lime = false, vis = q > 0;
        if (k.side === 0 && k.i === CHOSEN && st.choose != null) {
          const lp = E.out3(clamp((t - st.choose - 0.5) / 0.25));
          y -= 14 * lp; lime = lp > 0.01; rot = lerp(rot, 0, lp);
        }
        let ghost = false;
        if (k.side === 1 && k.i === GIVEN && st.give != null) {
          const gp = E.io3(clamp((t - st.give - 0.35) / 0.9));
          ghost = gp > 0.001;
          x = lerp(k.x, GIVE_END.x, gp); y = lerp(k.y, GIVE_END.y, gp); rot = lerp(k.rot, -5, gp);
        }
        put(k.tg, x, y, rot, sc, sc, vis ? 1 : 0);
        setA(k.bp, 'fill', lime ? C.lime : C.paper);
        if (k.side === 1 && k.i === GIVEN) {
          // la case vide reste en pointillés à sa place d'origine
          setA(k.ghost, 'visibility', ghost ? 'visible' : 'hidden');
        }
      });

      /* ---- main qui choisit ---- */
      const hp = st.choose == null ? 0 : E.out3(clamp((t - st.choose) / 0.5));
      setA(st.hand1, 'visibility', hp > 0 ? 'visible' : 'hidden');
      st.hand1.setAttribute('transform', `translate(${f2(tkC.x)} ${f2(tkC.y + TH / 2 + 10 + (1 - hp) * 330)}) rotate(${f2(-4 * hp)})`);
      const mk = st.choose == null ? 0 : E.io2(clamp((t - st.choose - 0.6) / 0.55));
      setA(st.mark, 'visibility', mk > 0 ? 'visible' : 'hidden');
      setA(st.mark, 'stroke-dasharray', `${f2(mk)} 1.01`);

      /* ---- main qui reçoit ---- */
      const gq = st.give == null ? 0 : E.out3(clamp((t - st.give) / 0.5));
      setA(st.hand2, 'visibility', gq > 0 ? 'visible' : 'hidden');
      st.hand2.setAttribute('transform', `translate(${f2(GIVE_END.x - 12 + (1 - gq) * 360)} ${f2(GIVE_END.y + 56 + (1 - gq) * 50)})`);

      /* ---- offre, prix, tampon ---- */
      const oq = st.offer == null ? 0 : E.back(clamp((t - st.offer) / 0.35));
      put(st.offerG, 960, 310, -3, oq, oq, oq > 0 ? 1 : 0);
      let ps = 0;
      if (st['price-left'] != null) { const q = clamp((t - st['price-left']) / 1.3); ps = q > 0 ? 0.35 + 0.77 * E.out3(q) + 0.08 * Math.sin(Math.PI * clamp(q * 1.6)) * (1 - q) : 0; }
      put(st.pl, 840, 480, -2, ps, ps, ps > 0 ? 1 : 0);
      const rq = st['price-right'] == null ? 0 : E.back(clamp((t - st['price-right']) / 0.3));
      put(st.pr, 1182, 480, 2, rq, rq, rq > 0 ? 1 : 0);
      const iq = st.illusion == null ? 0 : clamp((t - st.illusion) / 0.22);
      const is = iq > 0 ? 1 + 1.6 * (1 - E.out3(iq)) : 0;
      const sh = st.illusion == null ? [0, 0] : shakeAt(t, st.illusion + 0.2, 7, 0.3);
      put(st.stamp, 960 + sh[0], 690 + sh[1], -5, is, is, iq > 0 ? 1 : 0);
    }
  });
})();
