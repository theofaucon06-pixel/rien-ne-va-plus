// Composant `twin-drain` (épisode 4) : la soustraction. Même soirée, même nombre de tours, deux mises. Voir EP4-COMPONENTS.md.
// Deux couloirs (A, B) : mise, « MISÉ », barre de perte moyenne (linéaire avec les tours : c'est une moyenne, pas un tirage).
// Fonction pure du temps ; aplats, aucun dégradé / flou / filter.
// Cues : rule, lane-a, run-a (dur), mean, lane-b, run-b (dur), race (dur), verdict. Props `bg` (paper|ink), `from` (none|a|ab).
(() => {
  'use strict';
  const { C, F, E, clamp, prog, f2, sv, g, rect, text, put, fr } = ZV;
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const num = (v, d) => (v != null && v !== '' && isFinite(+v) ? +v : d);
  const sstr = (v, d) => (typeof v === 'string' && v.length ? v : d);
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const vis = (n, on) => setA(n, 'visibility', on ? 'visible' : 'hidden');
  const setTxt = (n, s) => { if (n.__s !== s) { n.__s = s; n.textContent = s; } };
  const NEVER = -1e6;

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
  // « 100 000 € MISÉS » -> { pre:'', n:100000, post:' € MISÉS' } (null si aucun nombre)
  function parseAmount(s) {
    const m = /\d[\d   ]*/.exec(s);
    if (!m) return null;
    const n = parseInt(m[0].replace(/\D/g, ''), 10);
    if (!isFinite(n)) return null;
    return { pre: s.slice(0, m.index), n, post: s.slice(m.index + m[0].length).replace(/^/, (m[0].match(/[   ]+$/) || [''])[0]) };
  }

  const DEF_LANES = [
    { bet: '100 € / TOUR', sub: 'AU DÉPART', staked: '100 000 € MISÉS', loss: '≈ −2 700 €', value: 2700 },
    { bet: '200 € / TOUR', sub: 'POUR TE REFAIRE', staked: '200 000 € MISÉS', loss: '≈ −5 400 €', value: 5400 }
  ];
  const NAMES = ['rule', 'lane-a', 'run-a', 'mean', 'lane-b', 'run-b', 'race', 'verdict'];
  const OPT = { 3: true };                                // `mean` reste optionnel (jamais impliqué)
  const BX = 580, BARMAX = 1200, BH = 70, LX0 = 80, LW = 1760, LH = 210;
  const LY = [260, 520];

  ZV.define('twin-drain', {
    init(root, shot) {
      const P = (shot && shot.props) || {};
      const beats = Array.isArray(shot && shot.beats) ? shot.beats : [];
      const dur = isNum(shot && shot.dur) && shot.dur > 0 ? shot.dur : 10;
      const cueB = (n) => { let r = null; for (const b of beats) if (b && b.do === 'cue' && b.name === n && isNum(b.t) && (r == null || b.t < r.t)) r = b; return r; };
      const from = P.from === 'a' || P.from === 'ab' ? P.from : 'none';
      const fromIdx = from === 'ab' ? 6 : from === 'a' ? 4 : 0;   // étapes < fromIdx déjà dessinées
      const ink = P.bg === 'ink';
      const TH = ink
        ? { bg: C.ink, panel: C.pocket, line: C.paper, tx: C.paper, sub: '#B9B5A8', track: '#262626', bar: C.red, shadow: '#000000', bandBg: C.paper, bandTx: C.ink, stickBg: C.paper, stickTx: C.ink }
        : { bg: C.paper, panel: C.white, line: C.ink, tx: C.ink, sub: C.grey, track: '#ECE8DC', bar: C.red, shadow: C.ink, bandBg: C.ink, bandTx: C.paper, stickBg: C.ink, stickTx: C.paper };

      const rounds = Math.max(1, Math.round(num(P.rounds, 1000)));
      const lanes = [0, 1].map((i) => {
        const d = DEF_LANES[i], l = (Array.isArray(P.lanes) && P.lanes[i]) || {};
        return { bet: sstr(l.bet, d.bet), sub: sstr(l.sub, d.sub), staked: sstr(l.staked, d.staked), loss: sstr(l.loss, d.loss), value: Math.max(1, num(l.value, d.value)) };
      });
      const maxVal = Math.max(lanes[0].value, lanes[1].value);
      const rule = sstr(P.rule, 'ROULETTE EUROPÉENNE · LE ZÉRO PREND 2,7 % DE CHAQUE MISE');
      const meanTxt = sstr(P.mean, 'LA MOYENNE FINIT TOUJOURS PAR AVOIR RAISON');
      const speedTxt = sstr(P.speed, '2 × PLUS VITE');
      const verdict = sstr(P.verdict, "MISER PLUS NE RATTRAPE RIEN. ÇA ACCÉLÈRE.");

      /* ---- événements et calendrier ---- */
      const evCue = { a: cueB('run-a'), b: cueB('run-b'), race: cueB('race'), lb: cueB('lane-b') };
      const dOf = (b, d) => (b && isNum(b.dur) && b.dur > 0 ? b.dur : d);
      const raw = NAMES.map((n) => { const b = cueB(n); return b ? b.t : null; });
      let T = [];
      let evs;
      if (from === 'none' && raw.every((x) => x == null)) {
        const k = Math.min(1, (dur * 0.92) / 17.5);
        T = [0.3 * k, 1.2 * k, 1.8 * k, 5.4 * k, 7.0 * k, 7.6 * k, 11.6 * k, 16.2 * k];
        evs = [{ k: 'a', t0: T[2], d: 3 * k }, { k: 'lb', t0: T[4], d: 0 }, { k: 'b', t0: T[5], d: 3 * k }, { k: 'race', t0: T[6], d: 4 * k }];
      } else {
        for (let k = 0; k < NAMES.length; k++) {
          if (k < fromIdx) T[k] = NEVER;
          else if (raw[k] != null) T[k] = raw[k];
          else if (!OPT[k] && raw.slice(k + 1).some((x) => x != null)) T[k] = NEVER;
          else T[k] = null;
        }
        evs = [];
        if (evCue.a) evs.push({ k: 'a', t0: evCue.a.t, d: dOf(evCue.a, 4) });
        if (evCue.lb) evs.push({ k: 'lb', t0: evCue.lb.t, d: 0 });
        if (evCue.b) evs.push({ k: 'b', t0: evCue.b.t, d: dOf(evCue.b, 4) });
        if (evCue.race) evs.push({ k: 'race', t0: evCue.race.t, d: dOf(evCue.race, 5) });
      }
      evs.sort((x, y) => x.t0 - y.t0);
      const st = { T, evs, dur, from, rounds, lanes, maxVal, TH };
      const meas = mkMeasure(root);

      /* ---- fond ---- */
      rect(root, 0, 0, 1920, 1080, 0, TH.bg);

      /* ---- bandeau du haut ---- */
      st.rule = g(root);
      rect(st.rule, 100 + 6, 68 + 6, 64, 64, 0, TH.shadow);
      rect(st.rule, 100, 68, 64, 64, 0, C.lime, TH.line, 5);
      text(st.rule, '0', 132, 112, 44, C.ink, { anchor: 'middle' });
      {
        let s = 30, w = meas(rule, s, true);
        if (w > 1630) { s = Math.floor(s * 1630 / w); }
        text(st.rule, rule, 192, 110, s, TH.tx, { mono: true });
      }
      rect(st.rule, 100, 148, 1720, 4, 0, TH.line);

      /* ---- compteur de tours commun ---- */
      st.tour = text(root, 'TOUR 0', 960, 202, 48, TH.tx, { mono: true, anchor: 'middle' });
      st.tour.setAttribute('visibility', 'hidden');

      /* ---- couloirs ---- */
      st.lanes = lanes.map((L, i) => {
        const o = { L, i, y0: LY[i] };
        o.g = g(root);
        rect(o.g, LX0 + 8, o.y0 + 8, LW, LH, 0, TH.shadow);
        rect(o.g, LX0, o.y0, LW, LH, 0, TH.panel, TH.line, 5);
        // mise + sous-titre
        let bs = 64, bw = meas(L.bet, bs);
        if (bw > 400) bs = Math.floor(bs * 400 / bw);
        text(o.g, L.bet, 112, o.y0 + 100, bs, TH.tx);
        let ss = 24, sw = meas(L.sub, ss, true);
        if (sw > 400) ss = Math.floor(ss * 400 / sw);
        text(o.g, L.sub, 112, o.y0 + 150, ss, TH.sub, { mono: true });
        rect(o.g, 542, o.y0 + 24, 3, LH - 48, 0, TH.line);
        // MISÉ
        o.am = parseAmount(L.staked);
        o.staked = text(o.g, L.staked, BX, o.y0 + 62, 40, TH.tx, { mono: true });
        // piste + barre
        rect(o.g, BX, o.y0 + 84, BARMAX, BH, 0, TH.track);
        o.bar = rect(o.g, BX, o.y0 + 84, 0, BH, 0, TH.bar, ink ? C.paper : C.ink, 6);
        o.full = BARMAX * L.value / maxVal;
        text(o.g, 'PERTE MOYENNE ATTENDUE', BX, o.y0 + 188, 22, TH.sub, { mono: true });
        // valeur finale : à droite de la barre si la place le permet, sinon DANS la barre (white, alignée à droite)
        let vs = 56, vw = meas(L.loss, vs);
        if (vw > 560) { vs = Math.floor(vs * 560 / vw); vw = meas(L.loss, vs); }
        const outside = BX + o.full + 24 + vw <= 1830;
        o.vs = vs; o.outside = outside;
        o.val = g(o.g);
        const vy = o.y0 + 84 + BH / 2 + vs * 0.36;
        if (outside) text(o.val, L.loss, 0, 0, vs, TH.tx, { len: f2(vw) });
        else text(o.val, L.loss, 0, 0, vs, C.white, { anchor: 'end', len: f2(vw) });
        o.valX = outside ? BX + o.full + 24 : BX + o.full - 22;
        o.valY = vy;
        return o;
      });

      /* ---- sticker « la moyenne… » (au-dessus de la barre A) ---- */
      {
        const words = meanTxt.split(/\s+/).filter(Boolean);
        let size = 34, lines = split2(words, meas, size);
        while (size > 22 && Math.max(meas(lines[0], size), meas(lines[1], size)) > 480) { size -= 1; lines = split2(words, meas, size); }
        const w = Math.max(meas(lines[0], size), meas(lines[1], size)) + 56, h = lines[1] ? size * 2.2 + 20 : size * 1.4 + 30;
        st.mean = g(root);
        rect(st.mean, -w / 2 + 9, -h / 2 + 9, w, h, 8, TH.shadow === C.ink ? '#555555' : C.paper);
        rect(st.mean, -w / 2, -h / 2, w, h, 8, TH.stickBg, TH.line, 5);
        const y1 = lines[1] ? -size * 0.12 : size * 0.35;
        text(st.mean, lines[0], 0, y1, size, TH.stickTx, { anchor: 'middle', len: f2(meas(lines[0], size)) });
        if (lines[1]) text(st.mean, lines[1], 0, y1 + size * 1.15, size, TH.stickTx, { anchor: 'middle', len: f2(meas(lines[1], size)) });
        st.meanX = Math.min(1800 - w / 2, 1530);
      }
      /* ---- sticker rouge « 2 × plus vite » sur le couloir B ---- */
      {
        let size = 48, w = meas(speedTxt, size);
        if (w > 440) { size = Math.floor(size * 440 / w); w = meas(speedTxt, size); }
        const bw2 = w + 56, h = size * 1.4 + 18;
        st.speed = g(root);
        rect(st.speed, -bw2 / 2 + 9, -h / 2 + 9, bw2, h, 10, TH.shadow);
        rect(st.speed, -bw2 / 2, -h / 2, bw2, h, 10, C.red, ink ? C.paper : C.ink, 6);
        text(st.speed, speedTxt, 0, size * 0.35, size, ink ? C.ink : C.ink, { anchor: 'middle', len: f2(w) });
        st.speedX = Math.min(1800 - bw2 / 2, 1560);
      }
      /* ---- bandeau verdict ---- */
      {
        const m = /^(.*?)([^.!?]*[.!?])\s*$/.exec(verdict);
        let p1 = m ? m[1].trim() : verdict, p2 = m ? m[2].trim() : '';
        if (!p1) { p1 = verdict; p2 = ''; }
        let size = 46;
        const gap = size * 0.3;
        let w1 = meas(p1, size), w2 = p2 ? meas(p2, size) : 0;
        const room = 1720 - 70;
        if (w1 + w2 + (p2 ? gap : 0) > room) { const k = room / (w1 + w2 + gap); size = Math.floor(size * k); w1 = meas(p1, size); w2 = p2 ? meas(p2, size) : 0; }
        const tot = w1 + w2 + (p2 ? size * 0.3 : 0);
        st.verdict = g(root);
        rect(st.verdict, 80 + 8, 750 + 8, 1760, 70, 0, TH.shadow);
        rect(st.verdict, 80, 750, 1760, 70, 0, TH.bandBg, TH.line, 4);
        const x0 = 960 - tot / 2;
        text(st.verdict, p1, x0, 750 + 35 + size * 0.36, size, TH.bandTx, { len: f2(w1) });
        if (p2) text(st.verdict, p2, x0 + w1 + size * 0.3, 750 + 35 + size * 0.36, size, C.red, { len: f2(w2) });
      }
      meas.done();
      return st;
    },

    update(st, t) {
      try {
        t = clamp(t, 0, st.dur + 1);
        const { T, evs, lanes } = st;
        const at = (k) => T[k] != null && t >= T[k];
        const ph = (k, d, o) => (T[k] == null ? 0 : prog(t, T[k] + (o || 0), T[k] + (o || 0) + d));
        const fromAll = st.from !== 'none';

        /* état des deux couloirs à l'instant tt : fractions, tours, instants d'arrivée */
        const state = (tt) => {
          const s = { f: [st.from === 'none' ? 0 : 1, st.from === 'ab' ? 1 : 0], r: fromAll ? 1 : 0, done: [fromAll ? NEVER : null, st.from === 'ab' ? NEVER : null], t0: 0 };
          for (const e of evs) {
            if (tt < e.t0) break;
            s.t0 = e.t0;
            if (e.k === 'lb') { s.r = 0; continue; }
            const p = e.d > 0 ? prog(tt, e.t0, e.t0 + e.d) : 1;
            const v = Math.pow(p, 1.5);
            s.r = v;
            const fin = p >= 1 ? e.t0 + e.d : null;
            if (e.k === 'a' || e.k === 'race') { s.f[0] = v; s.done[0] = fin; }
            if (e.k === 'b' || e.k === 'race') { s.f[1] = v; s.done[1] = fin; }
          }
          return s;
        };
        const S = state(t);
        // affichage des compteurs : 10 mises à jour par seconde (jamais en retard sur un début d'étape)
        const tq = Math.max(Math.floor(t * 10) / 10, S.t0);
        const Q = state(Math.min(tq, t));
        const fq = (i) => (S.f[i] >= 1 ? 1 : Q.f[i]);
        const rq = S.r >= 1 ? 1 : Q.r;

        /* bandeau */
        {
          const p = E.out3(ph(0, 0.3));
          put(st.rule, 0, -40 * (1 - p), 0, 1, 1, at(0) ? p : 0);
        }
        /* compteur de tours */
        {
          const on = at(1) || (T[1] == null && false);
          vis(st.tour, on);
          setTxt(st.tour, 'TOUR ' + fr(Math.round(rq * st.rounds)));
        }
        /* couloirs */
        st.lanes.forEach((o, i) => {
          const k = i === 0 ? 1 : 4;
          const on = at(k);
          const p = E.back(ph(k, 0.4));
          setA(o.g, 'transform', `translate(0 ${f2(60 * (1 - p))})`);
          setA(o.g, 'opacity', f2(on ? clamp(p * 3) : 0));
          vis(o.g, on);
          const f = S.f[i];
          const w = o.full * f;
          setA(o.bar, 'width', f2(Math.max(0, w)));
          vis(o.bar, w >= 1);
          // MISÉ
          if (o.am) setTxt(o.staked, o.am.pre + fr(Math.round(fq(i) * o.am.n)) + o.am.post);
          // valeur : claque à l'arrivée de la barre
          const td = S.done[i];
          const done = f >= 1 && td != null;
          const vp = done ? prog(t, td, td + 0.22) : 0;
          const sc = done ? 1 + 0.45 * (1 - E.out3(vp)) : 1;
          setA(o.val, 'transform', `translate(${f2(o.valX)} ${f2(o.valY)}) scale(${f2(sc)})`);
          vis(o.val, done);
        });
        /* sticker « la moyenne… » : de `mean` jusqu'à l'arrivée du couloir B */
        {
          const tEnd = T[4] != null ? T[4] : null;
          const on = at(3) && (tEnd == null || t < tEnd);
          const p = T[3] != null && T[3] > -1e5 ? E.back(ph(3, 0.3)) : 1;
          put(st.mean, st.meanX, 270, -3, p, p, on ? 1 : 0);
        }
        /* sticker rouge à l'arrivée de la course */
        {
          const ev = evs.find((e) => e.k === 'race');
          const td = ev ? ev.t0 + ev.d : null;
          const on = td != null && t >= td && S.f[1] >= 1;
          const p = td != null ? E.back(prog(t, td, td + 0.3)) : 0;
          put(st.speed, st.speedX, 538, 2.5, p, p, on ? 1 : 0);
        }
        /* verdict */
        {
          const p = E.out3(ph(7, 0.3));
          put(st.verdict, 0, 40 * (1 - p), 0, 1, 1, at(7) ? p : 0);
        }
      } catch (e) { /* jamais d'exception */ }
    }
  });
})();
