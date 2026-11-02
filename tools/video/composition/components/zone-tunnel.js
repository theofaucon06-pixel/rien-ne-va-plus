// Composant « zone-tunnel » (épisode 2, « La zone ») : voir tools/video/composition/EP2-COMPONENTS.md. Fonction pure du temps du plan, aplats seulement.
// Anneaux concentriques qui viennent vers nous ; la distance parcourue est une table cumulée (fonction de t seulement), des stickers sont aspirés au centre.
(() => {
  const { C, E, clamp, prog, lerp, f2, put, g, rect, text, circle } = ZV;
  const CX = 960, CY = 500, N = 18;
  const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
  // largeur approchée d'un libellé Bricolage 800 (on impose textLength : la mise en page ne dépend pas de la police chargée)
  const bw = (s, size) => { let a = 0; for (const ch of String(s)) a += size * (ch === ' ' ? 0.26 : /[0-9]/.test(ch) ? 0.6 : /[A-ZÀÂÉÈÊÎÔÛÇ]/.test(ch) ? 0.66 : /[.,:;'’!|]/.test(ch) ? 0.3 : 0.56); return a; };
  function stk(parent, w, h, fill, str, size, tc, sh) {
    const gr = g(parent);
    rect(gr, -w / 2 + sh, -h / 2 + sh, w, h, 18, C.ink);
    rect(gr, -w / 2, -h / 2, w, h, 18, fill, C.ink, 7);
    text(gr, str, 0, size * 0.35, size, tc, { anchor: 'middle', len: f2(bw(str, size)) });
    return gr;
  }
  const CYC = {
    lime: [C.ink, C.lime, C.ink, C.paper, C.ink, C.lime, C.ink, C.red],
    red: [C.ink, C.red, C.ink, C.paper, C.ink, C.red, C.ink, C.lime]
  };
  const SPOTS = [[470, 255, -5], [1450, 330, 4], [640, 690, -3]];
  const FILLS = [C.paper, C.lime, C.white];

  ZV.define('zone-tunnel', {
    init(root, shot) {
      const P = shot.props || {};
      const st = { dur: Math.max(0.1, shot.dur || 1) };
      st.speed = clamp(num(P.speed, 1), 0.1, 4);
      st.labels = (Array.isArray(P.labels) && P.labels.length ? P.labels : ["L'HEURE", "L'ARGENT", 'TON CORPS']).slice(0, 3).map(String);
      st.final = P.final != null ? String(P.final) : 'LE TOUR SUIVANT';
      st.cyc = CYC[P.palette === 'red' ? 'red' : 'lime'];
      const cu = (n) => ZV.cue(shot, n);
      st.cE = cu('enter'); st.cN = cu('next'); st.cX = cu('exit');
      st.lose = [cu('lose-1'), cu('lose-2'), cu('lose-3')];
      const none = st.cE === null && st.cN === null && st.cX === null && st.lose.every((x) => x === null);
      if (none) st.cE = 0.3;
      const ex = ZV.cues(shot, 'exit')[0];
      st.exitText = ex && ex.text ? String(ex.text) : '';
      // distance cumulée (en anneaux) : table à 60 pas/s, interpolée
      const rate = (t) => {
        let v = 0.16;
        if (st.cE !== null && t >= st.cE) v = 0.16 + 1.9 * E.io2(prog(t, st.cE, st.cE + 3.5)) + Math.min(0.9, 0.12 * Math.max(0, t - st.cE - 3.5));
        if (st.cN !== null && t >= st.cN) v += 2.6 * E.out2(prog(t, st.cN, st.cN + 0.9));
        if (st.cX !== null && t >= st.cX) v *= 1 - E.out2(prog(t, st.cX, st.cX + 0.9));
        return Math.min(3, v * st.speed * 0.54);        // ≤ 3 anneaux/s : un point de l'écran ne change jamais de couleur plus de 3 fois par seconde
      };
      const STEP = 1 / 60, n = Math.ceil(st.dur / STEP) + 3;
      st.tab = new Float64Array(n);
      for (let i = 1; i < n; i++) st.tab[i] = st.tab[i - 1] + 0.5 * STEP * (rate((i - 1) * STEP) + rate(i * STEP));
      st.STEP = STEP; st.rateEnd = rate((n - 1) * STEP);

      rect(root, 0, 0, 1920, 1080, 0, C.paper);
      st.rings = [];
      for (let j = 0; j < N; j++) st.rings.push(circle(root, CX, CY, 10, C.ink, C.ink, 4));
      st.cover = circle(root, CX, CY, 1, C.paper, C.ink, 8);   // aplat paper qui s'étend une seule fois (retour au réel)
      st.dot = g(root);
      circle(st.dot, 0, 0, 20, C.white, C.ink, 6);
      st.lab = st.labels.map((s, i) => {
        const size = 62, w = bw(s, size) + 84, gr = stk(root, w, 104, FILLS[i % 3], s, size, C.ink, 10);
        return { g: gr };
      });
      const fs = Math.min(128, 1320 / (bw(st.final, 1) || 1));
      st.fin = stk(root, bw(st.final, fs) + 130, fs * 1.55, C.lime, st.final, fs, C.ink, 14);
      const ps = 170;
      st.pan = st.exitText ? stk(root, bw(st.exitText, ps) + 110, ps * 1.5, C.red, st.exitText, ps, C.ink, 14) : null;
      return st;
    },

    update(st, t, shot) {
      try {
        t = clamp(t, 0, st.dur + 1);
        const fi = Math.min(st.tab.length - 2, Math.max(0, t / st.STEP)), i0 = Math.floor(fi);
        const s = lerp(st.tab[i0], st.tab[i0 + 1], fi - i0);
        const base = Math.floor(s), frac = s - base, L = st.cyc.length;
        const tD = st.cX !== null ? st.cX + 0.9 : 1e9;
        for (let j = 0; j < N; j++) {
          const i = N - 1 - j, u = (frac + i) / N;
          let r = 8 + 1330 * Math.pow(u, 2.1);
          const nd = st.rings[j];
          nd.setAttribute('r', f2(Math.max(0.01, r)));
          nd.setAttribute('fill', st.cyc[(((base - i) % L) + L) % L]);
          nd.setAttribute('stroke-width', f2(2 + 7 * u));
          nd.setAttribute('visibility', r < 0.5 ? 'hidden' : 'visible');
        }
        { const q = E.in2(prog(t, tD, tD + 0.6)), rr = 1350 * q; st.cover.setAttribute('r', f2(Math.max(0.01, rr))); st.cover.setAttribute('visibility', q > 0 ? 'visible' : 'hidden'); }
        // point central
        const gone = t > tD + 0.2;
        const pul = 1 + 0.12 * Math.sin(t * 7) + (st.cN !== null && t >= st.cN ? 0.35 : 0);
        put(st.dot, CX, CY, 0, gone ? 0 : pul, gone ? 0 : pul, gone ? 0 : 1);
        // stickers « L'HEURE » …
        for (let k = 0; k < st.lab.length; k++) {
          const sp = SPOTS[k], tl = st.lose[k];
          const pop = E.back(prog(t, 0.15 + 0.14 * k, 0.55 + 0.14 * k));
          let x = sp[0] + 10 * Math.sin(t * 1.7 + k * 2.1), y = sp[1] + 12 * Math.cos(t * 1.3 + k * 1.7), r = sp[2] + 1.5 * Math.sin(t * 2.2 + k), sc = pop, o = 1;
          if (tl !== null && t >= tl) {
            const p = prog(t, tl, tl + 0.8), e = E.in3(p);
            x = lerp(x, CX, e); y = lerp(y, CY, e); r += 520 * e; sc = lerp(1, 0.04, e);
            if (p >= 1) o = 0;
          }
          if (t > tD - 0.9 && st.cX !== null) o = 0;
          put(st.lab[k].g, x, y, r, sc, sc, o);
        }
        // texte final
        let fo = 0, fs = 1;
        if (st.cN !== null && t >= st.cN + 0.2) {
          fs = E.back(prog(t, st.cN + 0.2, st.cN + 0.5)) * (1 + 0.035 * Math.sin((t - st.cN) * 9));
          fo = 1;
          if (st.cX !== null && t > st.cX + 0.3) fo = 0;
        }
        put(st.fin, CX, CY, -2, fs, fs, fo);
        if (st.pan) {
          const tp = tD + 0.5, p = E.back(prog(t, tp, tp + 0.25)), sh = ZV.shakeAt(t, tp + 0.18, 9, 0.35);
          put(st.pan, CX + sh[0], CY + sh[1], -6, p, p, t >= tp ? 1 : 0);
        }
      } catch (e) { /* jamais d'exception */ }
    }
  });
})();
