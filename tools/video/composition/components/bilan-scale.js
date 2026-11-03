// Composant `bilan-scale` (épisode 3) : le bilan de la martingale. Une balance : à gauche ≈ 800 petites victoires (≈ 8 000 €), à droite 1 catastrophe (−10 230 €).
// Fonction pure du temps ; aplats, bras ink, plateaux paper, aucun dégradé / flou / filter. Voir EP3-COMPONENTS.md.
// Cues : wins, crash, net, odds.
(() => {
  'use strict';
  const { C, E, clamp, prog, lerp, f2, sv, g, rect, circle, path, line, text, put, fr, shakeAt } = ZV;
  let UID = 0;
  const NB = ' ';
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const num = (v, d) => (v != null && v !== '' && isFinite(+v) ? +v : d);
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const bw = (s, size) => { let a = 0; for (const ch of String(s)) a += size * (ch === ' ' || ch === ' ' ? 0.26 : /[0-9]/.test(ch) ? 0.6 : /[A-ZÀÂÉÈÊÎÔÛÇ€%+×≈−]/.test(ch) ? 0.66 : /[.,:;'’!|]/.test(ch) ? 0.3 : 0.56); return a; };
  const mw = (s, size) => String(s).length * size * 0.6;
  const PX = 960, PY = 465, L = 560, SL = 170, TH = 36;                          // pivot, demi-bras, longueur des suspentes, épaisseur de plateau
  const GRID_W = 512, FILL_D = 2.6, FALL_D = 0.5;

  ZV.define('bilan-scale', {
    init(root, shot) {
      const P = shot.props || {};
      const beats = Array.isArray(shot.beats) ? shot.beats : [];
      const dur = isNum(shot.dur) && shot.dur > 0 ? shot.dur : 8;
      const cue = (n) => { const b = beats.filter((x) => x && x.do === 'cue' && x.name === n && isNum(x.t)).map((x) => x.t).sort((a, b2) => a - b2); return b.length ? b[0] : null; };
      const wins = clamp(Math.round(num(P.wins, 800)), 10, 2000);
      const winAmt = typeof P.win_amount === 'string' ? P.win_amount : '8 000 €';
      const lossAmt = typeof P.loss_amount === 'string' ? P.loss_amount : '−10 230 €';
      const netAmt = typeof P.net === 'string' ? P.net : '−2 230 €';
      const unit = winAmt.replace(/[\d\s  ≈,.\-−+]/g, '') || '€';
      const winVal = +(winAmt.replace(/[^\d]/g, '')) || 8000;
      const uid = 'bs' + (++UID);
      const st = { dur, wins, winVal, unit };
      st.c = { wins: cue('wins'), crash: cue('crash'), net: cue('net'), odds: cue('odds') };
      if (Object.values(st.c).every((x) => x == null)) st.c = { odds: 0.3, wins: 1.0, crash: 4.2, net: 5.8 };

      /* fond paper rayé */
      rect(root, 0, 0, 1920, 1080, 0, C.paper);
      const bgs = g(root, { transform: 'rotate(-18 960 540)' });
      for (let k = -4; k <= 4; k++) rect(bgs, 960 + k * 300 - 70, -600, 140, 2300, 0, '#E9E5D9');
      st.world = g(root);
      const W = st.world;

      /* pied de la balance */
      path(W, `M${PX - 34} ${PY} L${PX + 34} ${PY} L${PX + 110} 800 L${PX - 110} 800Z`, C.ink, C.ink, 6);
      rect(W, PX - 160, 796, 320, 30, 6, C.ink, C.ink, 6);

      /* plateau gauche : cageot de 800 petits carrés lime */
      st.pl = g(W);
      const mkTray = (grp, w) => {
        line(grp, 0, 0, -(w / 2 - 22), SL, C.ink, 6, { 'stroke-linecap': 'butt' });
        line(grp, 0, 0, (w / 2 - 22), SL, C.ink, 6, { 'stroke-linecap': 'butt' });
        circle(grp, 0, 0, 12, C.paper, C.ink, 6);
      };
      const wL = 580, wR = 480;
      mkTray(st.pl, wL);
      rect(st.pl, -wL / 2 + 9, SL + 9, wL, TH, 8, C.ink);
      rect(st.pl, -wL / 2, SL, wL, TH, 8, C.paper, C.ink, 7);
      const rows = clamp(Math.ceil(wins / 80), 1, 14), cols = Math.ceil(wins / rows);
      const pitch = Math.min(12, GRID_W / cols), gw = cols * pitch, gh = rows * pitch;
      const cH = gh + 20, cW = gw + 20;
      st.gx = -gw / 2; st.gy = SL - cH + 10;
      rect(st.pl, -cW / 2, SL - cH, cW, cH + 2, 4, C.ink, C.ink, 5);
      const defs = sv('defs', null, root);
      const sq = pitch * 0.74;
      const mkPat = (id, fill) => {
        const pt = sv('pattern', { id: uid + id, x: st.gx, y: st.gy, width: pitch, height: pitch, patternUnits: 'userSpaceOnUse' }, defs);
        sv('rect', { x: (pitch - sq) / 2, y: (pitch - sq) / 2, width: sq, height: sq, fill }, pt);
      };
      mkPat('e', '#3a3a3a'); mkPat('l', C.lime);
      rect(st.pl, st.gx, st.gy, gw, gh, 0, `url(#${uid}e)`);
      st.fillA = rect(st.pl, st.gx, st.gy, 0.01, gh, 0, `url(#${uid}l)`);
      st.fillB = rect(st.pl, st.gx, st.gy, pitch, 0.01, 0, `url(#${uid}l)`);
      st.pitch = pitch; st.rows = rows; st.gh = gh;

      /* plateau droit : plateau + bloc rouge (la catastrophe) */
      st.pr = g(W);
      mkTray(st.pr, wR);
      rect(st.pr, -wR / 2 + 9, SL + 9, wR, TH, 8, C.ink);
      rect(st.pr, -wR / 2, SL, wR, TH, 8, C.paper, C.ink, 7);
      st.blk = g(st.pr);
      {
        const bwid = 400, bh = 140, lab = lossAmt;
        rect(st.blk, -bwid / 2 + 10, -bh + 10, bwid, bh, 8, C.ink);
        rect(st.blk, -bwid / 2, -bh, bwid, bh, 8, C.red, C.ink, 8);
        const size = 66;
        text(st.blk, lab, 0, -bh / 2 + size * 0.35, size, C.ink, { anchor: 'middle', len: f2(Math.min(bw(lab, size), bwid - 50)) });
        rect(st.blk, -bwid / 2 + 14, -bh + 14, bwid - 28, 8, 0, C.ink);
      }
      st.blk.setAttribute('visibility', 'hidden');

      /* bras et pivot */
      st.beam = g(W);
      rect(st.beam, -L - 30 + 8, -13 + 8, 2 * L + 60, 26, 13, '#8f8c82');
      rect(st.beam, -L - 30, -13, 2 * L + 60, 26, 13, C.ink, C.ink, 6);
      circle(st.beam, -L, 0, 15, C.paper, C.ink, 6);
      circle(st.beam, L, 0, 15, C.paper, C.ink, 6);
      circle(W, PX, PY, 30, C.lime, C.ink, 8);

      /* intitulés fixes */
      {
        const t1 = `≈ ${wins} PETITES VICTOIRES`;
        st.h1 = text(W, t1, 70, 192, 48, C.ink, { anchor: 'start', len: f2(Math.min(bw(t1, 48), 760)) });
        rect(W, 70, 206, Math.min(bw(t1, 48), 760), 10, 0, C.ink);
        const t2 = '1 CATASTROPHE';
        text(W, t2, 1850, 192, 64, C.ink, { anchor: 'end', len: f2(bw(t2, 64)) });
        rect(W, 1850 - bw(t2, 64), 206, bw(t2, 64), 10, 0, C.red);
      }
      /* compteur gauche */
      st.cnt = g(W);
      {
        const w = 540, h = 96;
        rect(st.cnt, 70 + 10, 240 + 10, w, h, 14, C.ink);
        rect(st.cnt, 70, 240, w, h, 14, C.ink, C.ink, 6);
        rect(st.cnt, 70 + 5, 240 + 5, w - 10, h - 10, 10, 'none', C.lime, 5);
        st.cntT = text(st.cnt, '', 70 + w / 2, 240 + 66, 62, C.lime, { mono: true, anchor: 'middle' });
      }
      /* odds (en haut) */
      st.odds = g(W);
      {
        const lab = '≈ 1 CHANCE SUR ' + wins, w = 560, h = 78, size = 44;
        rect(st.odds, -w / 2 + 10, -h / 2 + 10, w, h, 14, C.ink);
        rect(st.odds, -w / 2, -h / 2, w, h, 14, C.lime, C.ink, 6);
        text(st.odds, lab, 0, size * 0.35, size, C.ink, { anchor: 'middle', len: f2(Math.min(bw(lab, size), w - 50)) });
      }
      /* tampon du bilan + sticker */
      st.stamp = g(W);
      {
        const size = 82, w = Math.min(bw(netAmt, size), 400) + 64, h = 118;
        rect(st.stamp, -w / 2 + 10, -h / 2 + 10, w, h, 14, C.ink);
        rect(st.stamp, -w / 2, -h / 2, w, h, 14, C.ink, C.red, 12);
        text(st.stamp, netAmt, 0, size * 0.35, size, C.red, { anchor: 'middle', len: f2(Math.min(bw(netAmt, size), 400)) });
      }
      st.stk = g(W);
      {
        const l1 = 'PLUS DE 2 000 €', l2 = 'DE PERTE', w = 400, h = 120;
        rect(st.stk, -w / 2 + 10, -h / 2 + 10, w, h, 14, C.ink);
        rect(st.stk, -w / 2, -h / 2, w, h, 14, C.lime, C.ink, 6);
        text(st.stk, l1, 0, -4, 46, C.ink, { anchor: 'middle', len: f2(Math.min(bw(l1, 46), w - 40)) });
        text(st.stk, l2, 0, 40, 46, C.ink, { anchor: 'middle', len: f2(Math.min(bw(l2, 46), w - 40)) });
      }
      return st;
    },

    update(st, t) {
      try {
        t = clamp(t, 0, st.dur + 1);
        const { c } = st;
        const ph = (t0, d) => (t0 == null ? 0 : prog(t, t0, t0 + d));

        /* remplissage de la grille (en accélérant) */
        const fp = c.wins != null ? Math.pow(ph(c.wins, FILL_D), 1.8) : 0;
        const K = Math.round(st.wins * fp);
        const cFull = Math.floor(K / st.rows), rPart = K - cFull * st.rows;
        setA(st.fillA, 'width', f2(Math.max(0.01, cFull * st.pitch)));
        setA(st.fillB, 'x', f2(st.gx + cFull * st.pitch));
        setA(st.fillB, 'height', f2(Math.max(0.01, rPart * st.pitch)));

        /* compteur « ≈ 8 000 € » */
        {
          const v = Math.round(st.winVal * (K / st.wins));
          const s = '≈' + NB + fr(v) + NB + st.unit;
          if (st.cntT.__s !== s) { st.cntT.__s = s; st.cntT.textContent = s; st.cntT.setAttribute('textLength', f2(mw(s, 62))); }
          const on = c.wins != null && t >= c.wins;
          const p = on ? E.back(prog(t, c.wins, c.wins + 0.3)) : 0;
          st.cnt.setAttribute('visibility', on ? 'visible' : 'hidden');
          st.cnt.setAttribute('transform', `translate(340 288) scale(${f2(Math.max(p, 0.01))}) translate(-340 -288)`);
        }

        /* chute du bloc rouge puis ressort de la balance */
        const tc = c.crash;
        const tImp = tc != null ? tc + FALL_D : null;
        const fall = tc != null ? E.in2(ph(tc, FALL_D)) : 0;
        const s = tImp != null ? Math.max(0, t - tImp) : 0;
        const r = tImp != null && t >= tImp ? 1 - Math.exp(-5 * s) * Math.cos(8 * s) : 0;
        let th = -8 * E.io2(fp) + 18 * r;
        th = clamp(th, -8, 13.5);
        const cs = Math.cos(th * ZV.D2R), sn = Math.sin(th * ZV.D2R);
        const exL = PX - L * cs, eyL = PY - L * sn, exR = PX + L * cs, eyR = PY + L * sn;
        const sk = tImp != null ? shakeAt(t, tImp, 12, 0.4) : [0, 0];
        setA(st.world, 'transform', `translate(${f2(sk[0])} ${f2(sk[1])})`);
        setA(st.beam, 'transform', `translate(${PX} ${PY}) rotate(${f2(th)})`);
        setA(st.pl, 'transform', `translate(${f2(exL)} ${f2(eyL)})`);
        setA(st.pr, 'transform', `translate(${f2(exR)} ${f2(eyR)})`);
        const bOn = tc != null && t >= tc;
        setA(st.blk, 'visibility', bOn ? 'visible' : 'hidden');
        setA(st.blk, 'transform', `translate(0 ${f2(SL - (1 - fall) * 700)})`);

        /* odds */
        {
          const to = c.odds, on = to != null && t >= to, p = on ? E.back(prog(t, to, to + 0.3)) : 0;
          put(st.odds, 960, 72, -1.5, Math.max(p, 0), Math.max(p, 0), on ? 1 : 0);
        }
        /* tampon + sticker */
        {
          const tn = c.net;
          if (tn == null || t < tn) put(st.stamp, 960, 615, -8, 0, 0, 0);
          else {
            const q = prog(t, tn, tn + 0.22), sc = lerp(2.6, 1, E.out3(q));
            const sh = shakeAt(t, tn + 0.2, 10, 0.3);
            put(st.stamp, 960 + sh[0], 615 + sh[1], -8, Math.max(sc, 0.01), Math.max(sc, 0.01), Math.min(1, q * 4));
          }
          const ts = tn != null ? tn + 0.55 : null, on = ts != null && t >= ts, p = on ? E.back(prog(t, ts, ts + 0.28)) : 0;
          put(st.stk, 960, 768, 2.5, Math.max(p, 0), Math.max(p, 0), on ? 1 : 0);
        }
      } catch (e) { /* jamais d'exception */ }
    }
  });
})();
