// Composant « jackpot-screen » (épisode 2) : l'écran de Katrina Bookman, Queens, 23 août 2016. Voir EP2-COMPONENTS.md.
// Fonction pure du temps du plan ; aplats seulement. Le téléphone ne montre aucun portrait (viseur + barres de texte).
(() => {
  const { C, F, E, clamp, prog, lerp, f2, put, g, rect, text, path, circle, sv } = ZV;
  let UID = 0;
  const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
  const str = (v, d) => (v != null && v !== '' ? String(v) : d);
  const bw = (s, size) => { let a = 0; for (const ch of String(s)) a += size * (ch === ' ' ? 0.26 : /[0-9]/.test(ch) ? 0.6 : /[A-ZÀÂÉÈÊÎÔÛÇ]/.test(ch) ? 0.66 : /[.,:;'’!|]/.test(ch) ? 0.3 : 0.56); return a; };
  const mono = (parent, s, x, y, size, fill, anchor) => text(parent, s, x, y, size, fill, { mono: true, anchor, len: f2(String(s).length * size * 0.6) });
  const GX = 235, GY = 195, GW = 1450, GH = 360;            // vitre
  const BAND = 6;                                            // tranches de l'écran qui saute
  const SLOT = { x: 1410, w: 280 }, TX = 1550;               // imprimante, axe du ticket
  const BULBS = [];
  for (let k = 0; k < 11; k++) { BULBS.push(240 + 52 * k); BULBS.push(1680 - 52 * k); }

  ZV.define('jackpot-screen', {
    init(root, shot) {
      const P = shot.props || {};
      const uid = 'jp' + (++UID);
      const st = { dur: Math.max(0.1, shot.dur || 1) };
      st.amount = str(P.amount, '42 949 672,76 $'); st.real = str(P.real, '2,25 $'); st.limit = str(P.limit, '6 500 $'); st.city = str(P.city, 'QUEENS').toUpperCase();
      const cu = (n) => ZV.cue(shot, n);
      st.cShow = cu('show'); st.cFlash = cu('flash'); st.cSelfie = cu('selfie'); st.cFail = cu('fail'); st.cSmall = cu('small-print');
      st.cTicket = cu('ticket'); st.cSteak = cu('steak'); st.cLimit = cu('limit');
      const none = [st.cShow, st.cFlash, st.cSelfie, st.cFail, st.cSmall, st.cTicket, st.cSteak, st.cLimit].every((x) => x === null);
      st.hasShow = st.cShow !== null;
      if (none) st.cShow = null;

      // fond paper + trame de points
      rect(root, 0, 0, 1920, 1080, 0, C.paper);
      const defs = sv('defs', null, root);
      const pat = sv('pattern', { id: uid + 'd', width: 64, height: 64, patternUnits: 'userSpaceOnUse' }, defs);
      circle(pat, 32, 32, 3.4, '#E0DCCE');
      rect(root, 0, 0, 1920, 1080, 0, `url(#${uid}d)`);

      // ticket (derrière la machine, sort de l'imprimante)
      st.ticket = g(root);
      {
        const w = 240, y0 = 560, y1 = 838, x0 = TX - w / 2;
        let d = `M${x0} ${y0}H${x0 + w}V${y1}`;
        const zz = 12; for (let k = zz; k > 0; k--) d += `L${f2(x0 + (w * (k - 0.5)) / zz)} ${y1 - 14}L${f2(x0 + (w * (k - 1)) / zz)} ${y1}`;
        d += 'Z';
        path(st.ticket, d, C.ink, C.ink, 6).setAttribute('transform', 'translate(12 12)');
        path(st.ticket, d, C.white, C.ink, 6);
        mono(st.ticket, 'BON DE CAISSE', TX, 733, 26, C.ink, 'middle');
        rect(st.ticket, x0 + 24, 746, w - 48, 4, 0, C.ink);
        mono(st.ticket, st.real, TX, 800, Math.min(58, (w - 40) / (st.real.length * 0.6)), C.ink, 'middle');
      }

      // bande « petits caractères »
      st.band = g(root);
      {
        rect(st.band, -20 + 10, 735 + 10, 1960, 76, 0, C.ink);
        rect(st.band, -20, 735, 1960, 76, 0, C.paper, C.ink, 6);
        sv('clipPath', { id: uid + 'c' }, defs).appendChild(sv('rect', { x: 0, y: 735, width: 1920, height: 76 }));
        const cg = g(st.band, { 'clip-path': `url(#${uid}c)` });
        st.bandStr = 'UNE PANNE ANNULE TOUS LES PAIEMENTS ET TOUTES LES PARTIES';
        st.bandLen = st.bandStr.length * 40 * 0.6; st.bandPer = st.bandLen + 280;
        st.bt = [0, 1].map(() => mono(cg, st.bandStr, 0, 786, 40, C.ink, 'start'));
      }

      // steak (picto plat) : créé après le caisson pour passer devant
      const mkSteak = (parent) => {
        const sg = g(parent);
        path(sg, 'M-80 -10C-90 -60 -40 -85 20 -80C80 -78 110 -40 100 5C92 50 50 78 -10 74C-60 70 -76 40 -80 -10Z', C.red, C.ink, 7);
        path(sg, 'M-58 -20C-44 -50 -6 -58 24 -52', 'none', C.paper, 6);
        path(sg, 'M-52 28C-30 52 14 54 46 34', 'none', C.paper, 6);
        const T = 'M-34 -14H46M6 -14V46';                     // l'os en T
        path(sg, T, 'none', C.ink, 30);
        path(sg, T, 'none', C.paper, 16);
        return sg;
      };

      // caisson de la machine
      const cab = g(root); st.cab = cab;
      rect(cab, 170 + 16, 40 + 16, 1580, 650, 26, C.ink);
      rect(cab, 170, 40, 1580, 650, 26, C.red, C.ink, 8);
      rect(cab, 210, 70, 1500, 86, 14, C.ink);
      st.bulbs = BULBS.map((x) => circle(cab, x, 113, 15, C.pocket, C.paper, 3));
      text(cab, 'JACKPOT', 960, 133, 62, C.lime, { anchor: 'middle', len: f2(bw('JACKPOT', 62)) });
      rect(cab, 215, 175, 1490, 400, 22, C.ink);
      st.glass = rect(cab, GX, GY, GW, GH, 10, C.paper, C.ink, 4);
      mono(cab, 'GAIN', GX + 34, GY + 50, 34, C.ink, 'start');
      mono(cab, `${st.city} · 23 AOÛT 2016`, GX + 34, GY + GH - 26, 32, C.ink, 'start').setAttribute('opacity', 0.75);
      // montant : une cellule Mono par caractère
      const n = st.amount.length, S = Math.min(150, 1330 / (n * 0.6)), cw = S * 0.6;
      st.S = S; st.cw = cw; st.n = n; st.x0 = 960 - (n * cw) / 2; st.by = 425;
      st.idle = mono(cab, 'PRÊT À JOUER', 960, 410, 66, '#5A5A5A', 'middle');
      st.amtG = g(cab);
      st.chars = [];
      for (let i = 0; i < n; i++) {
        const ch = st.amount[i];
        st.chars.push(ch === ' ' ? null : text(st.amtG, ch, f2(st.x0 + i * cw + cw / 2), st.by, S, C.ink, { mono: true, anchor: 'middle', len: f2(cw) }));
      }
      st.strike = rect(st.amtG, st.x0 - 10, st.by - S * 0.36, n * cw + 20, 14, 3, C.red);
      // tranches pour « l'écran saute »
      const rnd = ZV.rng(2016);
      st.sl = [];
      for (let k = 0; k < BAND; k++) {
        const h = GH / BAND, y = GY + k * h;
        sv('clipPath', { id: `${uid}s${k}` }, defs).appendChild(sv('rect', { x: GX, y: f2(y), width: GW, height: f2(h) }));
        const cg = g(cab, { 'clip-path': `url(#${uid}s${k})` });
        const inner = g(cg);
        rect(inner, GX - 300, y, GW + 600, h, 0, k % 2 ? C.paper : '#E4E0D3');
        mono(inner, st.amount, 960, st.by, S, k % 2 ? C.ink : C.red, 'middle');
        const bar = rect(cg, GX, y + h * 0.3, 300 + rnd() * 240, h * 0.4, 0, C.ink);
        st.sl.push({ cg, inner, bar, base: (70 + rnd() * 110) * (k % 2 ? 1 : -1), bx: GX + rnd() * 900 });
      }
      st.panne = g(cab);
      {
        const w = bw('PANNE', 130) + 80, h = 170;
        rect(st.panne, -w / 2, -h / 2, w, h, 12, C.paper, C.red, 14);
        rect(st.panne, -w / 2 + 14, -h / 2 + 14, w - 28, h - 28, 6, 'none', C.red, 4);
        text(st.panne, 'PANNE', 0, 45, 130, C.red, { anchor: 'middle', len: f2(bw('PANNE', 130)) });
      }
      // sticker « MAX … »
      st.lim = g(cab);
      {
        const lab = 'MAX ' + st.limit, size = Math.min(150, 1250 / (bw(lab, 1) || 1)), w = bw(lab, size) + 100, h = size * 1.5;
        rect(st.lim, -w / 2 + 14, -h / 2 + 14, w, h, 18, C.ink);
        rect(st.lim, -w / 2, -h / 2, w, h, 18, C.lime, C.ink, 8);
        text(st.lim, lab, 0, size * 0.35, size, C.ink, { anchor: 'middle', len: f2(bw(lab, size)) });
      }
      // bandeau d'information et imprimante
      rect(cab, 210, 595, 1500, 72, 12, C.ink);
      mono(cab, 'RESORTS WORLD CASINO', 240, 643, 36, C.paper, 'start');
      mono(cab, 'KATRINA BOOKMAN', 1680, 643, 36, C.lime, 'end');
      rect(cab, SLOT.x, 664, SLOT.w, 26, 6, C.ink, C.paper, 4);
      cab.appendChild(st.panne); cab.appendChild(st.lim);

      st.steak = mkSteak(root);
      // téléphone (viseur : aucun portrait)
      st.phone = g(root);
      {
        const ph = st.phone;
        rect(ph, -125 + 14, -190 + 14, 250, 380, 38, C.ink);
        rect(ph, -125, -190, 250, 380, 38, C.ink, C.ink, 6);
        rect(ph, -105, -162, 210, 310, 14, C.paper);
        const bx = 78, by = 100;
        path(ph, `M${-bx} ${-by + 26}V${-by}H${-bx + 26}M${bx - 26} ${-by}H${bx}V${-by + 26}M${bx} ${by - 26}V${by}H${bx - 26}M${-bx + 26} ${by}H${-bx}V${by - 26}`, 'none', C.ink, 7);
        rect(ph, -62, -66, 124, 22, 4, C.ink); rect(ph, -62, -26, 124, 22, 4, C.ink); rect(ph, -62, 14, 78, 22, 4, C.ink);
        circle(ph, 0, 168, 18, C.paper, C.paper, 4);
        circle(ph, 0, -176, 5, C.pocket);
      }
      st.vig = g(root);
      {
        const v = st.vig;
        rect(v, -105 + 10, -75 + 10, 210, 150, 8, C.ink);
        rect(v, -105, -75, 210, 150, 8, C.white, C.ink, 6);
        rect(v, -88, -58, 176, 116, 4, C.paper, C.ink, 3);
        rect(v, -76, -36, 152, 26, 3, C.ink); rect(v, -76, 4, 100, 18, 3, C.ink);
        rect(v, -76, 32, 60, 12, 3, C.red);
      }
      st.flashR = rect(root, 0, 0, 1920, 1080, 0, C.paper);
      return st;
    },

    update(st, t, shot) {
      try {
        t = clamp(t, 0, st.dur + 1);
        const C_ = C;
        const inWin = (a, d) => a !== null && t >= a && t < a + d;
        const tFail = st.cFail;
        const failed = tFail !== null && t >= tFail;
        // ---- montant : chiffre par chiffre ----
        const tShow = st.cShow;
        const pre = tShow !== null && t < tShow;
        st.idle.setAttribute('visibility', pre ? 'visible' : 'hidden');
        const fail0 = failed && t < tFail + 0.55;
        for (let i = 0; i < st.n; i++) {
          const nd = st.chars[i]; if (!nd) continue;
          const on = tShow === null || t >= tShow + i * 0.085;
          nd.setAttribute('visibility', on ? 'visible' : 'hidden');
          nd.setAttribute('fill', failed ? '#5A5A5A' : C_.ink);
        }
        st.amtG.setAttribute('visibility', pre || fail0 ? 'hidden' : 'visible');
        // clignotement (flash) : vitre lime / paper + ampoules qui courent
        const fEnd = tFail !== null ? tFail : 1e9;
        const flashing = st.cFlash !== null && t >= st.cFlash && t < Math.min(st.cFlash + 2.4, fEnd);
        st.glass.setAttribute('fill', flashing && Math.floor((t - st.cFlash) * 2) % 2 === 0 ? C_.lime : C_.paper);
        const cyc = [C_.lime, C_.paper, C_.red];
        for (let k = 0; k < st.bulbs.length; k++) {
          let fill;
          if (failed) fill = C_.pocket;
          else if (flashing) fill = (Math.floor((t - st.cFlash) * 5) + k) % 3 === 0 ? cyc[(k >> 1) % 3] : C_.pocket;
          else fill = cyc[k % 3];
          st.bulbs[k].setAttribute('fill', fill);
        }
        // ---- l'écran saute ----
        const pf = tFail !== null ? prog(t, tFail, tFail + 0.55) : 1;
        const gl = tFail !== null && t >= tFail && pf < 1;
        for (let k = 0; k < st.sl.length; k++) {
          const s = st.sl[k], flip = (Math.floor((t - (tFail || 0)) * 3) + k) % 2 ? 1 : -1;
          const tt = t - (tFail || 0);
          s.cg.setAttribute('visibility', gl ? 'visible' : 'hidden');
          s.inner.setAttribute('transform', `translate(${f2(gl ? s.base * (1 - pf) * flip : 0)} 0)`);
          const bv = gl && (Math.floor(tt * 3) + k) % 3 === 0;
          s.bar.setAttribute('visibility', bv ? 'visible' : 'hidden');
          s.bar.setAttribute('x', f2(s.bx + (gl ? 200 * flip * (1 - pf) : 0)));
        }
        // montant barré, tampon « PANNE »
        const tp = tFail !== null ? tFail + 0.55 : 1e9;
        const sq = st.cLimit !== null && t >= st.cLimit ? E.out3(prog(t, st.cLimit + 0.12, st.cLimit + 0.3)) : 0;
        const ps = tFail !== null ? E.out3(prog(t, tp, tp + 0.35)) : 0;
        const sc = lerp(1, 0.6, ps);
        st.strike.setAttribute('width', f2((st.n * st.cw + 20) * (tFail !== null ? E.out2(prog(t, tp, tp + 0.25)) : 0)));
        st.strike.setAttribute('visibility', t >= tp ? 'visible' : 'hidden');
        const sy = sc * lerp(1, 0.16, sq);
        const piv = lerp(375, 470, sq);
        st.amtG.setAttribute('transform', `translate(960 ${f2(piv + lerp(0, -100, ps) * (1 - sq))}) scale(${f2(sc)} ${f2(sy)}) translate(-960 ${-f2(piv)})`);
        {
          const tt = tp + 0.25, p = E.back(prog(t, tt, tt + 0.2)), sh = ZV.shakeAt(t, tt + 0.12, 10, 0.4);
          put(st.panne, 1000 + sh[0], 445 + sh[1], -7, p, p, tFail !== null && t >= tt && !(st.cLimit !== null && t >= st.cLimit + 0.15) ? 1 : 0);
        }
        // sticker « MAX … » qui écrase
        {
          const tl = st.cLimit;
          if (tl === null || t < tl) put(st.lim, 960, 395, -3, 1, 1, 0);
          else {
            const p = prog(t, tl, tl + 0.2), sh = ZV.shakeAt(t, tl + 0.2, 14, 0.45), k = lerp(2.3, 1, E.in3(p));
            put(st.lim, 960 + sh[0], lerp(100, 395, E.in3(p)) + sh[1], -3, k, k, 1);
          }
        }
        // ---- bande petits caractères ----
        {
          const ts = st.cSmall;
          const gone = st.cTicket !== null && t >= st.cTicket;
          const on = ts !== null && t >= ts && !gone;
          const sl = on ? E.out3(prog(t, ts, ts + 0.3)) : gone ? 1 - E.in3(prog(t, st.cTicket, st.cTicket + 0.25)) : 0;
          st.band.setAttribute('transform', `translate(0 ${f2((1 - sl) * 160)})`);
          st.band.setAttribute('visibility', sl > 0.001 ? 'visible' : 'hidden');
          if (ts !== null) {
            const off = (240 * Math.max(0, t - ts)) % st.bandPer;
            for (let k = 0; k < 2; k++) st.bt[k].setAttribute('x', f2(1920 - off - st.bandPer * k));
          }
        }
        // ---- ticket, steak ----
        {
          const tk = st.cTicket;
          let dy = -300, vis = false;
          if (tk !== null && t >= tk) { vis = true; const p = clamp((t - tk) / 1.0); dy = -300 * (1 - (0.5 * Math.floor(p * 16) / 16 + 0.5 * E.out2(p))); if (p >= 1) dy = 0; }
          st.ticket.setAttribute('transform', `translate(0 ${f2(dy)})`);
          st.ticket.setAttribute('visibility', vis ? 'visible' : 'hidden');
          const ss = st.cSteak;
          if (ss === null || t < ss) put(st.steak, 1130, 765, -6, 0.9, 0.9, 0);
          else { const p = E.bounce(prog(t, ss, ss + 0.5)); put(st.steak, 1130, 765 + lerp(-120, 0, p), -6, 0.9, 0.9, 1); }
        }
        // ---- selfie ----
        {
          const ts = st.cSelfie;
          if (ts === null) { put(st.phone, 380, 1400, -8, 1, 1, 0); put(st.vig, 700, 755, 6, 1, 1, 0); st.flashR.setAttribute('visibility', 'hidden'); }
          else {
            const pin = E.back(prog(t, ts, ts + 0.5));
            const pout = tFail !== null && t >= tFail ? E.in3(prog(t, tFail, tFail + 0.4)) : 0;
            const sh = ZV.shakeAt(t, ts + 0.5, 6, 0.3);
            put(st.phone, 380 + sh[0], lerp(1300, 655, pin) + 700 * pout, -8, 1, 1, t >= ts && pout < 1 ? 1 : 0);
            const tv = ts + 0.75, pv = E.back(prog(t, tv, tv + 0.3));
            put(st.vig, 700, 755, 6, pv, pv, t >= tv && pout < 1 ? 1 : 0);
            st.flashR.setAttribute('visibility', t >= ts + 0.5 && t < ts + 0.6 ? 'visible' : 'hidden');
          }
        }
      } catch (e) { /* jamais d'exception */ }
    }
  });
})();
