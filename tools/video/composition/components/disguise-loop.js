// Composant `disguise-loop` (épisode 5) : « On le reconnaît. On le sort. » Voir EP5-COMPONENTS.md.
// Fond paper. Une entrée de casino générique, un œil plat, une silhouette SANS visage (déguisements = formes plates), deux mains qui poussent dehors.
// Cues : enter (répétable), spot (répétable), out (répétable), banned, night, recall, name. Fonction pure du temps : l'état de la silhouette est reconstruit
// depuis la liste des cues. Aplats seulement : aucun dégradé, flou, lueur ni filter. Jamais de coup montré.
(() => {
  'use strict';
  const { C, E, clamp, prog, lerp, f2, sv, g, rect, circle, path, line, text } = ZV;
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const str = (v, d) => (typeof v === 'string' && v.trim() ? v.trim() : d);
  const setA = (n, k, v) => { const c = n.__c || (n.__c = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } };
  const vis = (n, on) => setA(n, 'display', on ? 'inline' : 'none');
  const SH = '#2A2A2A';
  const bwEst = (s, size) => { let a = 0; for (const ch of String(s)) a += size * (ch === ' ' ? 0.28 : /[0-9]/.test(ch) ? 0.5 : /[A-ZÀÂÉÈÊÎÔÛÇ€%+×≈]/.test(ch) ? 0.66 : /[.,:;'’!|]/.test(ch) ? 0.34 : 0.56); return a; };
  let PROBE = null; const BWC = {};
  const bw = (s, size) => {
    s = String(s); const k = size + '|' + s;
    if (BWC[k] !== undefined) return BWC[k];
    if (PROBE) { try { PROBE.textContent = s; PROBE.setAttribute('font-size', size); const w = PROBE.getComputedTextLength(); if (w > 0) { BWC[k] = w; return w; } } catch (e) { /* hors DOM */ } }
    return bwEst(s, size);
  };
  const mw = (s, size) => String(s).length * size * 0.6;
  const putc = (n, x, y, r, sx, sy, o) => {
    if (r === undefined) r = 0; if (sx === undefined) sx = 1; if (sy === undefined) sy = sx; if (o === undefined) o = 1;
    const hid = o <= 0.001 || !sx || !sy;
    setA(n, 'display', hid ? 'none' : 'inline');
    if (hid) return;
    setA(n, 'transform', `translate(${f2(x)} ${f2(y)}) rotate(${f2(r)}) scale(${f2(sx)} ${f2(sy)})`);
    setA(n, 'opacity', f2(o));
  };
  const popS = (t, t0, d) => (t0 == null || t < t0 ? 0 : E.back(prog(t, t0, t0 + (d || 0.3))));
  const mlab = (parent, s, x, y, size, fill, anchor) => text(parent, s, x, y, size, fill, { mono: true, anchor: anchor || 'start', len: f2(mw(s, size)) });
  function mkTag(parent, lines, size, fill, tfill, o) {
    o = o || {};
    const ls = Array.isArray(lines) ? lines : [lines];
    const lh = size * 1.12, px = o.padX || 26, py = o.padY || 14;
    let tw = 0; ls.forEach((s) => { tw = Math.max(tw, bw(s, size)); });
    const w = tw + px * 2, h = ls.length * lh + py * 2 - (lh - size) * 0.2;
    const grp = g(parent);
    const sh = o.sh || 9, r = o.r === undefined ? 14 : o.r;
    rect(grp, -w / 2 + sh, -h / 2 + sh, w, h, r, o.shc || (fill === C.lime ? C.ink : fill === C.paper ? C.lime : C.ink));
    rect(grp, -w / 2, -h / 2, w, h, r, fill, C.ink, o.sw || 6);
    ls.forEach((s, i) => text(grp, s, 0, -h / 2 + py + size * 0.82 + i * lh, size, tfill, { anchor: 'middle', mono: o.mono, len: f2(o.mono ? mw(s, size) : bw(s, size)) }));
    return { g: grp, w, h };
  }

  const SX = 420;                       // x de repos de la silhouette
  const GROUND = 794;
  const DC = [960, 460];                // centre de la porte
  const S1 = 204 / 680;                 // échelle d'une porte miniature
  const CELL = (c, r) => [560 + c * 300, 212 + r * 232];
  const MAIN = [1, 1];

  function mkDoor(parent, band) {
    const d = g(parent);
    rect(d, 620, 230, 680, 570, 0, C.ink);
    rect(d, 632, 236, 656, 558, 0, C.pocket);
    rect(d, 632, 744, 656, 50, 0, C.ink);
    rect(d, 632, 236, 656, 8, 0, C.lime);
    const bats = [0, 1].map((i) => {
      const b = g(d);
      rect(b, 0, 0, 328, 558, 0, C.pocket, C.paper, 6);
      rect(b, 28, 40, 272, 220, 4, 'none', C.paper, 3);
      rect(b, 28, 300, 272, 220, 4, 'none', C.paper, 3);
      circle(b, 296, 280, 13, C.lime, C.ink, 4);
      b.setAttribute('transform', i ? 'translate(1288 236) scale(-1 1)' : 'translate(632 236) scale(1 1)');
      return b;
    });
    rect(d, 620, 120, 680, 116, 0, C.paper, C.ink, 8);
    circle(d, 668, 178, 14, C.lime, C.ink, 5); circle(d, 1252, 178, 14, C.lime, C.ink, 5);
    text(d, 'CASINO', 960, 204, 80, C.ink, { anchor: 'middle', len: f2(bw('CASINO', 80)) });
    let bg = null;
    if (band) {
      bg = g(d);
      const bnd = g(bg, { transform: 'translate(960 470) rotate(-14)' });
      rect(bnd, -350 + 10, -64 + 10, 700, 128, 8, C.ink);
      rect(bnd, -350, -64, 700, 128, 8, C.red, C.ink, 8);
      text(bnd, 'INTERDIT', 0, 34, 100, C.ink, { anchor: 'middle', len: f2(bw('INTERDIT', 100)) });
    }
    return { g: d, bats, band: bg };
  }
  const batT = (b, i, o) => {
    const sx = lerp(1, 0.16, o);
    setA(b, 'transform', i ? `translate(1288 236) scale(${f2(-sx)} 1)` : `translate(632 236) scale(${f2(sx)} 1)`);
  };

  /* ---- déguisements (formes plates) ---- */
  const DRAW = {
    costume(p) {
      path(p, 'M-16 -442 L0 -420 L-16 -404 Z', C.paper); path(p, 'M16 -442 L0 -420 L16 -404 Z', C.paper);
      path(p, 'M0 -426 L13 -408 L9 -330 L0 -298 L-9 -330 L-13 -408 Z', C.lime, C.ink, 3);
      path(p, 'M104 -238 V-262 H150 V-238', 'none', C.ink, 9);
      rect(p, 66, -240, 124, 86, 8, C.red, C.ink, 5);
      rect(p, 116, -208, 24, 16, 3, C.ink);
    },
    wig(p) {
      [[-46, -494, 24], [-22, -520, 26], [14, -524, 26], [44, -496, 24], [-54, -464, 18], [54, -464, 18], [0, -508, 30]].forEach((c) => circle(p, c[0], c[1], c[2], C.lime, C.ink, 5));
    },
    beard(p) { path(p, 'M-36 -456 Q-44 -406 0 -398 Q44 -406 36 -456 Q0 -438 -36 -456 Z', C.paper, C.ink, 5); },
    hat(p) {
      rect(p, -72, -532, 144, 18, 8, C.red, C.ink, 5);
      rect(p, -40, -588, 80, 62, 10, C.red, C.ink, 5);
      rect(p, -40, -548, 80, 12, 0, C.ink);
      circle(p, -18, -480, 14, 'none', C.paper, 6); circle(p, 18, -480, 14, 'none', C.paper, 6);
      line(p, -4, -480, 4, -480, C.paper, 5); line(p, -32, -482, -46, -486, C.paper, 5); line(p, 32, -482, 46, -486, C.paper, 5);
    }
  };

  ZV.define('disguise-loop', {
    init(root, shot) {
      const P = (shot && shot.props) || {};
      const beats = Array.isArray(shot && shot.beats) ? shot.beats : [];
      const dur = isNum(shot && shot.dur) && shot.dur > 0 ? shot.dur : 10;
      const cl = (n) => beats.filter((b) => b && b.do === 'cue' && b.name === n && isNum(b.t)).map((b) => b.t).sort((a, b) => a - b);
      const name = str(P.name, 'KEN USTON'), role = str(P.role, 'EX-VICE-PRÉSIDENT · BOURSE DE SAN FRANCISCO');
      const fake = str(P.fake, 'FAUX NOM'), night = str(P.night, 'SELON LUI : DES VIGILES, LA MÂCHOIRE CASSÉE'), recall = str(P.recall, 'L\'HOMME DU DÉBUT');
      const diss = (Array.isArray(P.disguises) && P.disguises.length ? P.disguises : ['costume', 'wig', 'beard', 'hat']).map(String).filter((d) => DRAW[d]);
      if (!diss.length) diss.push('costume');
      const st = { dur, name, role, fake, diss };
      PROBE = text(root, '', 0, -500, 100, 'none'); PROBE.setAttribute('visibility', 'hidden');
      st.enters = cl('enter'); st.spots = cl('spot'); st.outs = cl('out');
      st.tBanned = cl('banned'); st.tNight = cl('night'); st.tRecall = cl('recall')[0]; st.tName = cl('name')[0];
      const NAMES = ['enter', 'spot', 'out', 'banned', 'night', 'recall', 'name'];
      st.noCue = !NAMES.some((n) => cl(n).length);
      // événements ordonnés qui pilotent la silhouette
      st.evs = [];
      st.enters.forEach((t, i) => st.evs.push({ t, k: 'E', n: i }));
      st.outs.forEach((t) => st.evs.push({ t, k: 'O' }));
      st.tNight.forEach((t) => st.evs.push({ t, k: 'N' }));
      st.evs.sort((a, b) => a.t - b.t);
      // intervalles « banned » : jusqu'au prochain cue qui montre à nouveau la scène
      st.ban = st.tBanned.map((t) => {
        let e = null;
        [st.enters, st.spots, st.outs, st.tNight, st.tRecall != null ? [st.tRecall] : [], st.tName != null ? [st.tName] : []].forEach((a) => a.forEach((x) => { if (x > t + 0.01 && (e == null || x < e)) e = x; }));
        return { a: t, b: e };
      });

      rect(root, 0, 0, 1920, 1080, 0, C.paper);
      const bgs = g(root, { transform: 'rotate(-18 960 540)' });
      for (let k = -4; k <= 4; k++) rect(bgs, 960 + k * 300 - 40, -600, 80, 2300, 0, '#EAE6DA');

      /* ---- monde (porte, sol, silhouette) ---- */
      st.W = g(root);
      st.ground = rect(st.W, 0, GROUND, 1920, 14, 0, C.ink);
      st.door = mkDoor(st.W, true);
      st.frame = rect(st.W, SX - 100, 262, 200, GROUND - 262 + 6, 6, 'none', C.red, 6);
      st.sil = g(st.W);                       // origine = pieds, centré sur x
      const S = st.sil;
      rect(S, -38, -204, 30, 204, 8, C.ink); rect(S, 8, -204, 30, 204, 8, C.ink);
      line(S, -66, -414, -86, -250, C.ink, 30); line(S, 66, -414, 86, -250, C.ink, 30);
      path(S, 'M-62 -430 L62 -430 L52 -190 L-52 -190 Z', C.ink, C.ink, 14);
      rect(S, -14, -452, 28, 28, 4, C.ink);
      circle(S, 0, -478, 42, C.ink);
      st.dis = {};
      diss.forEach((d) => { if (!st.dis[d]) { const gg = g(S); DRAW[d](gg); st.dis[d] = gg; } });
      st.badge = g(st.W);                     // le badge ne s'incline pas avec la silhouette
      st.bsh = rect(st.badge, -90, -90, 200, 56, 8, C.ink);
      st.bg = rect(st.badge, -100, -100, 200, 56, 8, C.paper, C.ink, 6);
      st.bt = [0, 1, 2].map(() => text(st.badge, '', 0, 0, 30, C.ink, { mono: true, anchor: 'middle' }));
      st.bar = rect(st.badge, -120, 0, 240, 22, 2, C.ink);
      st.spotTag = mkTag(st.W, 'RECONNU', 44, C.red, C.ink, { sh: 8 });
      {
        const ls = bw(recall, 44) > 330 ? (() => { const w = recall.split(' '); let best = null; for (let k = 1; k < w.length; k++) { const a = w.slice(0, k).join(' '), b = w.slice(k).join(' '); const m = Math.max(bw(a, 44), bw(b, 44)); if (!best || m < best.m) best = { a, b, m }; } return best ? [best.a, best.b] : [recall]; })() : [recall];
        st.rec = g(st.W);
        st.recTag = mkTag(st.rec, ls, 44, C.lime, C.ink, { sh: 9 });
        path(st.rec, 'M0 -16 H24 V-32 L52 0 L24 32 V16 H0 Z', C.lime, C.ink, 5);
        st.recW = st.recTag.w;
        st.recArrow = st.rec.lastChild;
      }

      /* ---- grille « banned » ---- */
      st.minis = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
        if (c === MAIN[0] && r === MAIN[1]) continue;
        const m = g(root);
        mkDoor(m, true);
        st.minis.push({ g: m, c, r, i: st.minis.length });
      }
      st.partout = mkTag(root, 'PARTOUT', 64, C.lime, C.ink, { sh: 10 });

      /* ---- hud : œil, compteur, carte de nuit, mains ---- */
      st.eye = g(root);
      path(st.eye, 'M -112 0 C -60 -78 60 -78 112 0 C 60 78 -60 78 -112 0 Z', C.white, C.ink, 8);
      st.iris = g(st.eye);
      circle(st.iris, 0, 0, 46, C.lime, C.ink, 5); circle(st.iris, 0, 0, 20, C.ink);
      st.cnt = mkTag(root, 'SORTI : 0', 30, C.lime, C.ink, { sh: 7, padX: 16, padY: 9, sw: 5 });
      st.cntT = st.cnt.g.querySelectorAll('text')[0];
      st.nightG = g(root);
      {
        const maxc = 26, words = night.split(' '), ls = []; let cur = '';
        words.forEach((w) => { if ((cur + ' ' + w).trim().length > maxc && cur) { ls.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); });
        if (cur) ls.push(cur);
        const w = Math.max.apply(null, ls.map((s) => mw(s, 26))) + 48, h = ls.length * 40 + 36;
        st.nightLs = ls; st.nightW = w;
        const x0 = 1860 - w, y0 = 340;
        rect(st.nightG, x0 + 10, y0 + 10, w, h, 10, C.red);
        rect(st.nightG, x0, y0, w, h, 10, C.ink, C.ink, 6);
        st.nightT = ls.map((s, i) => { const n = text(st.nightG, '', x0 + 24, y0 + 50 + i * 40, 26, C.paper, { mono: true }); return n; });
        st.nx0 = x0;
      }
      st.hands = [0, 1].map((i) => {
        const h = g(root);
        rect(h, -30, -34, 70, 68, 18, C.ink);
        rect(h, -74, -30, 48, 16, 8, C.ink); rect(h, -78, -8, 52, 16, 8, C.ink); rect(h, -72, 14, 46, 16, 8, C.ink);
        rect(h, -10, -50, 30, 24, 10, C.ink);
        return h;
      });
      PROBE.parentNode.removeChild(PROBE); PROBE = null;
      return st;
    },

    update(st, t) {
      try {
        t = clamp(t, 0, st.dur + 1);

        /* ---- état de la silhouette ---- */
        let cur = st.enters.length ? { m: 'absent' } : { m: 'idle', t0: -1, d: 0, pass: 0 };
        let nEnter = 0;
        for (const e of st.evs) {
          if (e.t > t) break;
          if (e.k === 'E') { nEnter++; cur = { m: 'in', t0: e.t, d: e.n, pass: e.n }; }
          else if (e.k === 'O') { if (cur.m === 'in' || cur.m === 'idle') cur = { m: 'out', t0: e.t, d: cur.d, pass: cur.pass }; }
          else cur = { m: 'night', t0: e.t, d: -1, pass: cur.pass || 0 };
        }
        let sx = SX, sVis = false, sRot = 0, sBob = 0, door = 0;
        if (cur.m === 'in') {
          const p = prog(t, cur.t0, cur.t0 + 0.9);
          sx = lerp(-220, SX, E.out3(p)); sVis = true;
          sBob = p < 1 ? Math.abs(Math.sin(p * 9)) * 6 : 0;
          door = E.out3(prog(t, cur.t0 + 0.4, cur.t0 + 0.8));
        } else if (cur.m === 'idle') { sVis = true; door = 0.6; }
        else if (cur.m === 'out') {
          const q = prog(t, cur.t0, cur.t0 + 0.467);
          sx = lerp(SX, -280, E.in2(q)); sVis = q < 1;
          door = 1 - E.out3(prog(t, cur.t0 + 0.5, cur.t0 + 0.9));
        } else if (cur.m === 'night') {
          sVis = true; sx = SX - 10; sRot = -7 * E.out3(prog(t, cur.t0 + 0.2, cur.t0 + 0.8));
          door = 1 - E.out3(prog(t, cur.t0, cur.t0 + 0.4));
        }
        const night = cur.m === 'night';

        /* ---- banned : dézoom vers la grille de 12 portes ---- */
        let bp = 0;
        for (const b of st.ban) {
          if (t < b.a) continue;
          const v = b.b != null && t >= b.b ? 1 - E.io3(prog(t, b.b, b.b + 0.35)) : E.io3(prog(t, b.a, b.a + 0.65));
          bp = Math.max(bp, v);
        }
        const cel = CELL(MAIN[0], MAIN[1]);
        const sc = lerp(1, S1, bp);
        const cxw = lerp(DC[0], cel[0], bp), cyw = lerp(DC[1], cel[1], bp);
        setA(st.W, 'transform', `translate(${f2(cxw - sc * DC[0])} ${f2(cyw - sc * DC[1])}) scale(${f2(sc)})`);
        vis(st.ground, bp < 0.5);
        vis(st.door.band, bp > 0.02);
        if (bp > 0.02) setA(st.door.band, 'opacity', f2(clamp((bp - 0.3) / 0.4)));
        // portes
        const om = bp > 0.02 ? 0 : door;
        batT(st.door.bats[0], 0, door * (1 - clamp(bp * 3))); batT(st.door.bats[1], 1, door * (1 - clamp(bp * 3)));
        st.minis.forEach((m) => {
          const t0 = (st.ban.length ? 0 : 0);
          // pop échelonné pendant le dézoom
          const p = clamp((bp - 0.15 - m.i * 0.05) / 0.35);
          const s = S1 * E.back(p);
          const c = CELL(m.c, m.r);
          putc(m.g, c[0] - s * DC[0], c[1] - s * DC[1], 0, s, s, p > 0 ? 1 : 0);
        });
        const pp = clamp((bp - 0.5) / 0.5);
        putc(st.partout.g, 225, 440, -6, E.back(pp), E.back(pp), pp > 0 ? 1 : 0);

        /* ---- silhouette + déguisement ---- */
        const sil = sVis && bp < 0.34 ? 1 : 0;
        const fade = 1 - clamp(bp * 3);
        putc(st.sil, sx, GROUND + 0, sRot, 1, 1, sil * fade);
        if (sil) {
          setA(st.sil, 'transform', `translate(${f2(sx)} ${f2(GROUND - sBob)}) rotate(${f2(sRot)})`);
          const dn = cur.d >= 0 ? st.diss[Math.min(cur.d, st.diss.length - 1)] : null;
          for (const k in st.dis) vis(st.dis[k], k === dn);
        }

        /* ---- badge ---- */
        let l1, l2 = null, l3 = null, redact = false;
        const nameOn = st.tName != null && t >= st.tName;
        if (nameOn) {
          l1 = st.name;
          const i = st.role.indexOf(' · ');
          if (i > 0) { l2 = st.role.slice(0, i); l3 = st.role.slice(i + 3); }
          else { const w = st.role.split(' '); const h = Math.ceil(w.length / 2); l2 = w.slice(0, h).join(' '); l3 = w.slice(h).join(' '); }
        } else if (cur.pass >= 1 && cur.m !== 'night') { l1 = st.fake; redact = true; }
        else l1 = cur.m === 'night' ? '' : 'UN CLIENT';
        const sz1 = nameOn ? 34 : 30, sz2 = 24;
        const wTxt = Math.max(mw(l1 || '', sz1), l2 ? mw(l2, sz2) : 0, l3 ? mw(l3, sz2) : 0, redact ? 240 : 0);
        const bw_ = wTxt + 50;
        const nl = (l1 ? 1 : 0) + (l2 ? 1 : 0) + (l3 ? 1 : 0) + (redact ? 1 : 0);
        const bh = !l1 ? 0 : (nameOn ? 46 + 80 : redact ? 56 + 38 : 56);
        const by = -(GROUND - 186);          // bas du badge à y = 186 (repère local : y écran − GROUND)
        const top = by - bh;
        const bPop = nameOn ? popS(t, st.tName, 0.3) : 1;
        vis(st.badge, !!l1 && sil > 0);
        setA(st.badge, 'transform', `translate(${f2(sx)} ${f2(GROUND)})`);
        if (l1) {
          setA(st.bg, 'x', f2(-bw_ / 2)); setA(st.bg, 'y', f2(top)); setA(st.bg, 'width', f2(bw_)); setA(st.bg, 'height', f2(bh));
          setA(st.bsh, 'x', f2(-bw_ / 2 + 8)); setA(st.bsh, 'y', f2(top + 8)); setA(st.bsh, 'width', f2(bw_)); setA(st.bsh, 'height', f2(bh));
          const set = (n, s, y, size) => { if (s == null) { vis(n, false); return; } vis(n, true); if (n.__s !== s) { n.__s = s; n.textContent = s; setA(n, 'textLength', f2(mw(s, size))); } setA(n, 'font-size', size); setA(n, 'y', f2(y)); };
          set(st.bt[0], l1, top + (nameOn ? 38 : 38), sz1);
          set(st.bt[1], l2, top + 78, sz2);
          set(st.bt[2], l3, top + 108, sz2);
          vis(st.bar, redact);
          if (redact) { setA(st.bar, 'x', f2(-120)); setA(st.bar, 'y', f2(top + 56)); setA(st.bar, 'width', 240); setA(st.bar, 'height', 22); }
          setA(st.badge, 'opacity', f2(Math.min(1, bPop)));
        }
        void nl;

        /* ---- spot : cadre rouge + RECONNU ; le cadre dure jusqu'au `out` suivant ---- */
        let spotOn = false, spotT = null;
        const enders = st.outs.map((x) => x + 0.05).concat(st.enters, st.tNight, st.tBanned);
        for (const s of st.spots) if (s <= t) {
          const ended = enders.some((x) => x > s + 0.01 && x <= t);
          if (!ended) { spotOn = true; spotT = s; }
        }
        spotOn = spotOn && sil > 0 && cur.m !== 'out';
        if (spotOn) {
          const q = popS(t, spotT, 0.25);
          setA(st.frame, 'x', f2(sx - 100)); vis(st.frame, true);
          setA(st.frame, 'opacity', f2(Math.min(1, q)));
          putc(st.spotTag.g, 160, 650, -6, q, q, 1);
        } else { vis(st.frame, false); putc(st.spotTag.g, 160, 650, -6, 0, 0, 0); }

        /* ---- recall ---- */
        const tr = st.tRecall;
        const rp = tr != null && t >= tr && sil > 0 ? popS(t, tr, 0.3) : 0;
        putc(st.rec, 165, 470, -5, rp, rp, rp > 0 ? 1 : 0);
        if (rp > 0) { setA(st.recArrow, 'transform', `translate(${f2(st.recW / 2 + 4)} 0)`); }

        /* ---- œil : s'ouvre à 0,2 s, balaie ; se tourne vers la silhouette au `spot` ---- */
        const open = E.out3(prog(t, 0.2, 0.7));
        const eyeOn = bp < 0.05 ? 1 : 0;
        const look = spotOn ? E.out3(prog(t, spotT, spotT + 0.25)) : 0;
        const swx = Math.sin(t * 1.4) * 22, swy = Math.cos(t * 0.9) * 5;
        const ix = lerp(swx, -34, look), iy = lerp(swy, 8, look);
        putc(st.eye, 1640, 200, 0, 1.05, 1.05 * Math.max(0.04, open), eyeOn ? 1 : 0);
        setA(st.iris, 'transform', `translate(${f2(ix)} ${f2(iy)})`);

        /* ---- compteur « SORTI : n » ---- */
        let nOut = 0, tLast = null;
        for (const o of st.outs) if (o <= t) { nOut++; tLast = o; }
        const cs = nOut > 0 ? 1 + 0.25 * (1 - E.out3(prog(t, tLast, tLast + 0.25))) : 0;
        putc(st.cnt.g, 30 + st.cnt.w / 2, 78, 0, cs, cs, nOut > 0 ? 1 : 0);
        const ctxt = 'SORTI : ' + nOut;
        if (st.cntT.__s !== ctxt) { st.cntT.__s = ctxt; st.cntT.textContent = ctxt; }

        /* ---- carte de nuit (typewriter, sous l'œil) ---- */
        const tn = st.tNight.filter((x) => x <= t).pop();
        const nOn = night && tn != null;
        vis(st.nightG, nOn);
        if (nOn) {
          const total = st.nightLs.reduce((a, s) => a + s.length, 0);
          let shown = Math.floor(total * prog(t, tn + 0.5, tn + 2.0));
          st.nightLs.forEach((s, i) => { const part = s.slice(0, Math.max(0, Math.min(s.length, shown))); shown -= s.length; const n = st.nightT[i]; if (n.__s !== part) { n.__s = part; n.textContent = part; } });
          setA(st.nightG, 'opacity', f2(prog(t, tn + 0.4, tn + 0.6)));
        }

        /* ---- mains qui poussent : arrivent par le bord du cadre, jamais de coup ---- */
        let hOn = 0, hx = 2100;
        const lastOut = st.outs.filter((x) => x - 0.3 <= t).pop();
        if (lastOut != null && bp < 0.05 && cur.m === 'out' && cur.t0 === lastOut) {
          const arrive = E.out3(prog(t, lastOut - 0.3, lastOut - 0.02));
          const push = prog(t, lastOut, lastOut + 0.467);
          const back = E.in2(prog(t, lastOut + 0.5, lastOut + 0.85));
          hx = lerp(2100, SX + 176, arrive) + (sx - SX) * 1 + back * 1900;
          hOn = 1;
        } else {
          // la main arrive juste avant le cue (la silhouette est encore en place)
          const nextOut = st.outs.find((x) => x > t);
          if (nextOut != null && bp < 0.05 && t >= nextOut - 0.3 && sil > 0) { hx = lerp(2100, SX + 176, E.out3(prog(t, nextOut - 0.3, nextOut - 0.02))); hOn = 1; }
        }
        st.hands.forEach((h, i) => putc(h, hx, i ? 560 : 440, i ? 4 : -4, 1, 1, hOn));
      } catch (e) { /* jamais d'exception */ }
    }
  });
})();
