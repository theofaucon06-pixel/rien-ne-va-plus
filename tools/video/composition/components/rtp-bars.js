// Composant « rtp-bars » (épisode 2) : « la case verte invisible », le taux de redistribution. Voir EP2-COMPONENTS.md.
// Deux barres de 100 unités (1500 px) : part rendue en paper, part gardée en lime. Fonction pure du temps du plan ; aplats seulement.
(() => {
  const { C, E, clamp, prog, lerp, f2, put, g, rect, text, line, sv } = ZV;
  let UID = 0;
  const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
  const bw = (s, size) => { let a = 0; for (const ch of String(s)) a += size * (ch === ' ' ? 0.26 : /[0-9]/.test(ch) ? 0.6 : /[A-ZÀÂÉÈÊÎÔÛÇ]/.test(ch) ? 0.66 : /[.,:;'’!|]/.test(ch) ? 0.3 : 0.56); return a; };
  const dec = (n) => String(Math.round(n * 10) / 10).replace('.', ',');
  const X0 = 210, U = 15, BH = 100;

  function mkBar(root, uid, y, name, kept, ip) {
    const b = { y, kept, rend: 100 - kept };
    text(root, name, X0, y - 17, 52, C.paper, { len: f2(bw(name, 52)) });
    b.g = g(root);
    rect(b.g, X0 + 12, y + 12, 100 * U, BH, 6, C.ink);              // ombre dure du cadre
    rect(b.g, X0, y, 100 * U, BH, 6, C.pocket, C.paper, 6);          // cadre : l'emplacement des 100 unités
    b.paper = rect(b.g, X0, y, 1, BH, 4, C.paper, C.ink, 6);
    b.pct = text(b.g, dec(b.rend) + ' % RENDUS', X0 + (b.rend * U) / 2, y + 66, 46, C.ink, { mono: true, anchor: 'middle', len: f2((dec(b.rend).length + 9) * 46 * 0.6) });
    // tranche gardée par la maison (lime), qui se détache
    b.sl = g(root);
    const w = kept * U;
    rect(b.sl, 9, 9, w, BH, 4, C.ink);
    b.slBase = rect(b.sl, 0, 0, w, BH, 4, C.lime, C.ink, 6);
    b.slHat = rect(b.sl, 0, 0, w, BH, 4, `url(#${uid}h${ip})`, C.lime, 4);
    b.slHat.setAttribute('stroke-dasharray', '10 8');
    b.w = w; b.sx = X0 + b.rend * U;
    b.tick = line(root, 0, y + BH, 0, y + BH + 30, C.lime, 6);
    const lab = dec(kept) + ' % GARDÉS';
    b.lab = text(root, lab, X0 + 100 * U, y + BH + 72, 42, C.lime, { anchor: 'end', len: f2(bw(lab, 42)) });
    return b;
  }

  ZV.define('rtp-bars', {
    init(root, shot) {
      const P = shot.props || {};
      const uid = 'rb' + (++UID);
      const st = { dur: Math.max(0.1, shot.dur || 1) };
      st.rou = clamp(num(P.roulette, 2.7), 0.1, 60); st.mac = clamp(num(P.machine, 15), 0.1, 60);
      st.stake = num(P.hour_stake, 1200); st.keptH = num(P.hour_kept, 180); st.unit = P.unit != null ? String(P.unit) : '€';
      const cu = (n) => ZV.cue(shot, n);
      st.c = { roulette: cu('roulette'), machine: cu('machine'), times: cu('times'), invisible: cu('invisible'), hour: cu('hour'), law: cu('law') };
      if (Object.values(st.c).every((x) => x === null)) st.c = { roulette: 0.2, machine: 1.5, times: 3.2, invisible: null, hour: 4.4, law: 6.0 };
      st.ratio = Math.floor((st.mac / st.rou) * 10 + 1e-6) / 10;

      rect(root, 0, 0, 1920, 1080, 0, C.ink);
      const defs = sv('defs', null, root);
      [0, 1].forEach((i) => {
        const pt = sv('pattern', { id: `${uid}h${i}`, width: 18, height: 18, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
        sv('rect', { x: 0, y: 0, width: 18, height: 18, fill: C.pocket }, pt);
        sv('rect', { x: 0, y: 0, width: 8, height: 18, fill: C.lime }, pt);
      });
      text(root, 'TAUX DE REDISTRIBUTION', X0, 104, 30, '#B9B5A8', { mono: true, len: f2(22 * 30 * 0.6) });
      st.rb = mkBar(root, uid, 185, 'ROULETTE', st.rou, 0);
      st.mb = mkBar(root, uid, 455, 'MACHINE À SOUS', st.mac, 1);
      // × 5,5
      st.times = g(root);
      {
        const lab = '× ' + dec(st.ratio), size = 78, w = bw(lab, size) + 80, h = 104;
        rect(st.times, -w / 2 + 11, -h / 2 + 11, w, h, 18, C.ink);
        rect(st.times, -w / 2, -h / 2, w, h, 18, C.paper, C.ink, 7);
        text(st.times, lab, 0, size * 0.35, size, C.ink, { anchor: 'middle', len: f2(bw(lab, size)) });
      }
      st.inv = text(root, 'LA CASE VERTE INVISIBLE', 960, 705, 76, C.lime, { anchor: 'middle', len: f2(bw('LA CASE VERTE INVISIBLE', 76)) });
      // heure de jeu
      const sA = '1 200', lab1 = ' ' + st.unit + ' MISÉS / H', lab2 = ' ' + st.unit + ' GARDÉS';
      st.fmt = (v) => ZV.fr(v);
      const mk = (cx, fill, tail, final, wTxt) => {
        const gr = g(root), size = 52, w = (String(final).length + tail.length) * size * 0.6 + 90, h = 104;
        rect(gr, -w / 2 + 11, -h / 2 + 11, w, h, 18, C.ink);
        rect(gr, -w / 2, -h / 2, w, h, 18, fill, C.ink, 7);
        const tx = text(gr, '', -w / 2 + 45, size * 0.35, size, C.ink, { mono: true, anchor: 'start' });
        tx.setAttribute('textLength', 1); tx.setAttribute('lengthAdjust', 'spacingAndGlyphs');
        return { g: gr, tx, cx, tail, size, final, w };
      };
      st.hA = mk(620, C.paper, lab1, st.fmt(st.stake));
      st.hB = mk(1330, C.lime, lab2, st.fmt(st.keptH));
      st.hArrow = text(root, '→', 0, 32, 90, C.paper, { anchor: 'middle', len: f2(bw('→', 90) + 20) });
      // carton de loi
      st.law = g(root);
      {
        const lab = 'ARRÊTÉ DU 14 MAI 2007 · MIN. 85 %', w = lab.length * 30 * 0.6 + 60, h = 66;
        rect(st.law, -w / 2 + 9, -h / 2 + 9, w, h, 10, C.paper);
        rect(st.law, -w / 2, -h / 2, w, h, 10, C.ink, C.paper, 5);
        text(st.law, lab, 0, 11, 30, C.paper, { mono: true, anchor: 'middle', len: f2(lab.length * 30 * 0.6) });
        st.lawW = w;
      }
      return st;
    },

    update(st, t, shot) {
      try {
        t = clamp(t, 0, st.dur + 1);
        const c = st.c;
        const bar = (b, tc, inv) => {
          const on = tc !== null && t >= tc;
          const p = on ? E.out3(prog(t, tc, tc + 0.9)) : 0;
          const wr = b.rend * U * p;
          b.paper.setAttribute('width', f2(Math.max(0.01, wr)));
          b.paper.setAttribute('visibility', on ? 'visible' : 'hidden');
          b.pct.setAttribute('visibility', on && p > 0.7 ? 'visible' : 'hidden');
          // la tranche arrive au bout de la part rendue, puis se soulève
          const ts = (tc !== null ? tc : 0) + 0.9;
          const dropIn = on ? E.out3(prog(t, tc + 0.55, ts)) : 0;
          const lift = on ? E.back(prog(t, ts, ts + 0.4)) : 0;
          let dy = -26 * lift, x = b.sx + lerp(160, 0, dropIn);
          const pi = inv !== null ? E.out3(prog(t, inv, inv + 0.35)) : 0;
          dy *= 1 - pi;
          const hid = !on || t < tc + 0.55;
          put(b.sl, x, b.y + dy, 0, 1, 1, hid ? 0 : 1);
          b.slBase.setAttribute('fill', pi > 0.5 ? C.pocket : C.lime);
          b.slBase.setAttribute('stroke', pi > 0.5 ? C.lime : C.ink);
          b.slBase.setAttribute('stroke-dasharray', pi > 0.5 ? '10 8' : '');
          b.slHat.setAttribute('visibility', pi > 0.5 ? 'visible' : 'hidden');
          const tl = ts + 0.35, lo = on && t >= tl;
          const lp = E.back(prog(t, tl, tl + 0.25));
          b.lab.setAttribute('visibility', lo ? 'visible' : 'hidden');
          b.lab.setAttribute('opacity', 1);
          b.tick.setAttribute('visibility', lo ? 'visible' : 'hidden');
          b.tick.setAttribute('x1', f2(b.sx + b.w / 2)); b.tick.setAttribute('x2', f2(b.sx + b.w / 2));
          b.tick.setAttribute('y2', f2(b.y + BH + 30 * Math.min(1, lp)));
          b.lab.setAttribute('transform', `translate(0 ${f2((1 - Math.min(1, lp)) * 14)})`);
        };
        bar(st.rb, c.roulette, null);
        bar(st.mb, c.machine, c.invisible);
        // × 5,5
        {
          const tt = c.times, on = tt !== null && t >= tt, p = on ? E.back(prog(t, tt, tt + 0.25)) : 0, sh = tt !== null ? ZV.shakeAt(t, tt + 0.2, 8, 0.4) : [0, 0];
          put(st.times, 1250 + sh[0], 392 + sh[1], -4, on ? Math.max(0.01, p) : 0, on ? Math.max(0.01, p) : 0, on ? 1 : 0);
        }
        // case verte invisible
        {
          const ti = c.invisible, on = ti !== null && t >= ti + 0.25, p = on ? E.back(prog(t, ti + 0.25, ti + 0.5)) : 0;
          st.inv.setAttribute('visibility', on ? 'visible' : 'hidden');
          st.inv.setAttribute('transform', `translate(960 705) scale(${f2(Math.max(0.01, p))}) translate(-960 -705)`);
        }
        // heure de jeu : deux compteurs
        {
          const th = c.hour;
          const part = (h, t0, v1) => {
            const on = th !== null && t >= t0;
            const p = on ? E.back(prog(t, t0, t0 + 0.25)) : 0;
            put(h.g, h.cx, 785, 0, on ? Math.max(0.01, p) : 0, on ? Math.max(0.01, p) : 0, on ? 1 : 0);
            const v = Math.round(v1 * E.out3(prog(t, t0 + 0.1, t0 + 1.1)));
            const s = ZV.fr(v) + h.tail;
            h.tx.textContent = s; h.tx.setAttribute('textLength', f2(s.length * h.size * 0.6));
          };
          part(st.hA, th !== null ? th : 0, st.stake);
          part(st.hB, th !== null ? th + 1.4 : 0, st.keptH);
          const ta = th !== null ? th + 1.25 : 0, on = th !== null && t >= ta;
          const p = E.back(prog(t, ta, ta + 0.2));
          put(st.hArrow, 975, 785, 0, on ? Math.max(0.01, p) : 0, on ? Math.max(0.01, p) : 0, on ? 1 : 0);
        }
        // carton de loi
        {
          const tl = c.law, on = tl !== null && t >= tl, p = on ? E.out3(prog(t, tl, tl + 0.3)) : 0;
          put(st.law, 1710 - st.lawW / 2 + (1 - p) * 700, 94, 0, 1, 1, on ? 1 : 0);
        }
      } catch (e) { /* jamais d'exception */ }
    }
  });
})();
