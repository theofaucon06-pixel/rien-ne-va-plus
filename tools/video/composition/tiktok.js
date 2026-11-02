// ZÉRO VERT : version VERTICALE (TikTok, 1080×1920, 9:16) de la composition de l'épisode 1.
// La scène 16:9 (1920×1080, dessinée par core.js + les 18 composants) est mise à l'échelle par transform CSS dans un cadre à coins doux ;
// autour : en-tête (logo, sticker ÉPISODE 1, titre, indicateur de chapitre), sous-titres karaoké GRANDS, bandeau marquee, ligne d'aide.
// Chargé APRÈS lib.js et AVANT core.js (voir tiktok.html) : il intercepte window.__ready et window.renderAt que pose le noyau,
// pour que le rendu attende aussi le HUD et dessine scène + HUD à chaque image. core.js n'est pas modifié.
// Tout est une fonction pure de T. Paramètres : ?t=12.5 (rend cet instant) ; nocaps est forcé par tiktok.html.
(() => {
  'use strict';
  const Z = window.ZV;
  const { C, clamp, prog, lerp, f2, E, sv, g, rect, text } = Z;
  const CW = 1080, CH = 1920;
  const Q = new URLSearchParams(location.search);
  const INK = C.ink, LIME = C.lime, PAPER = C.paper, RED = C.red, POCKET = C.pocket, GREY = C.grey;

  /* ------------------------------------------------------------------ mise en page (px dans le repère 1080×1920) */
  const SC = { x: 28, y: 594, w: 1024 };           // scène 16:9 : 1024×576, bordure lime 10 px autour
  SC.h = SC.w * 9 / 16; SC.k = SC.w / 1920; SC.r = 14;
  const CAP = { cx: 476, cy: 1372, maxW: 760, px: 36, py: 26, sizeMax: 92, sizeMin: 78 };   // sous-titres : bloc x ≈ 58–894, y ≈ 1250–1520
  const MARQUEE = { y: 1650, h: 56, speed: 90 };
  const FALLBACK_TITLES = ['Rien ne va plus', 'Il a fait sauter la banque', 'Trente-six sur trente-sept', 'Une moyenne, pas un quota', 'Vingt-six noirs', 'Le zéro ne perd jamais'];

  /* ------------------------------------------------------------------ interception du noyau */
  let coreReady = false, hudReady = false, coreRender = null, hudRender = null;
  Object.defineProperty(window, '__ready', { configurable: true, get: () => coreReady && hudReady, set: (v) => { coreReady = !!v; } });
  Object.defineProperty(window, 'renderAt', {
    configurable: true,
    get: () => function renderAt(T) {
      if (coreRender) coreRender(T);
      if (hudRender) { try { hudRender(T); } catch (e) { console.error('[tiktok] hud', e && e.stack || e); } }
      return true;
    },
    set: (fn) => { coreRender = fn; }
  });

  // cadre de la scène : position et échelle (le contenu 1920×1080 n'est jamais recomposé)
  const frame = document.getElementById('frame'), scene = document.getElementById('scene');
  Object.assign(frame.style, { left: SC.x + 'px', top: SC.y + 'px', width: SC.w + 'px', height: SC.h + 'px', borderRadius: SC.r + 'px' });
  scene.style.transform = `scale(${SC.k})`;

  /* ------------------------------------------------------------------ HUD */
  async function initHud() {
    const [TL, mod] = await Promise.all([
      fetch(new URLSearchParams(location.search).get('tl') || '/output/video/data/timeline.json', { cache: 'no-store' }).then((r) => r.json()),
      import('/js/podcast-data.js').catch(() => null)
    ]);
    const need = (id) => document.fonts.load(`800 50px "${id}"`, 'AaÉéÀÔçœ0123456789 .,:;!?’«»·×÷€¢%/-');
    const logoImg = new Image(); logoImg.src = '/assets/podcast/logo-dark.svg';
    await Promise.all([need('Bricolage Grotesque'), need('JetBrains Mono'), document.fonts.ready, logoImg.decode().catch(() => null)]);

    // épisode : ?slug=<slug> (défaut = épisode 1) ; numéro, titre et titres de sections viennent de js/podcast-data.js
    const SLUG = Q.get('slug') || 'la-bille-n-a-pas-de-memoire';
    let titles = FALLBACK_TITLES, EP_NUM = 1, EP_TITLE = ['La bille n’a pas', 'de mémoire'], EP_NAME = 'La bille n’a pas de mémoire', epTitleAuto = false, EP_ONE_LINE = false;
    try {
      const ep = mod && mod.EPISODES.find((e) => e.slug === SLUG);
      if (ep) {
        if (ep.sections && ep.sections.length >= 2) titles = ep.sections.map((s) => s.h);
        if (Number.isFinite(ep.number)) EP_NUM = ep.number;
        if (ep.title) { EP_NAME = ep.title; epTitleAuto = SLUG !== 'la-bille-n-a-pas-de-memoire'; }
      }
    } catch (e) { /* titres de secours */ }
    const NS = titles.length;   // nombre de chapitres (6 pour la saison 1)

    const back = document.getElementById('back'), front = document.getElementById('front');
    const meas = g(front, { visibility: 'hidden' });
    const mcache = new Map();
    // largeur d'un texte à 100 px (mise à l'échelle linéaire ensuite), mémorisée
    function mw(str, mono) {
      const key = (mono ? 'm|' : 'b|') + str;
      let w = mcache.get(key);
      if (w === undefined) {
        const n = text(meas, str, 0, 0, 100, '#000', { mono });
        w = n.getComputedTextLength(); meas.removeChild(n);
        if (!(w > 0)) w = str.length * 60;
        mcache.set(key, w);
      }
      return w;
    }
    const SP = Math.max(14, mw('a a') - mw('aa'));   // espace entre mots à 100 px
    // titre de l'épisode (hors épisode 1, dont la coupe est fixée) : coupe en 2 lignes équilibrées en largeur
    if (epTitleAuto) {
      const ws = EP_NAME.split(' '); let best = [EP_NAME, ''], bw = Infinity;
      for (let i = 1; i < ws.length; i++) {
        const a = ws.slice(0, i).join(' '), b = ws.slice(i).join(' '), m = Math.max(mw(a), mw(b));
        if (m < bw) { bw = m; best = [a, b]; }
      }
      EP_TITLE = best[1] ? best : [EP_NAME];
      // un titre court tient sur une seule ligne (dernier mot en lime) ; sinon deux lignes
      EP_ONE_LINE = !!best[1] && (mw(best[0]) + SP + mw(best[1])) <= 960;
    }

    /* ---------- fond (aplats) + ombre dure du cadre */
    rect(back, 0, 0, CW, CH, 0, INK);
    sv('circle', { cx: 960, cy: 250, r: 330, fill: POCKET }, back);
    sv('circle', { cx: 80, cy: 1830, r: 250, fill: POCKET }, back);
    rect(back, SC.x - 14 + 16, SC.y - 14 + 16, SC.w + 28, SC.h + 28, SC.r + 14, RED);

    /* ---------- cadre lime autour de la scène (par-dessus) */
    rect(front, SC.x - 10, SC.y - 10, SC.w + 20, SC.h + 20, SC.r + 10, 'none', LIME, 8);   // anneau lime extérieur
    rect(front, SC.x - 3, SC.y - 3, SC.w + 6, SC.h + 6, SC.r + 3, 'none', INK, 6);          // anneau ink intérieur : sépare la scène des plans lime

    /* ---------- en-tête : logo, sticker ÉPISODE n, titre */
    const logoH = 84, logoW = Math.round(logoH * 4438 / 920);
    sv('image', { href: '/assets/podcast/logo-dark.svg', x: 52, y: 162, width: logoW, height: logoH }, front);

    const stk = g(front);
    {
      const lab = `ÉPISODE ${EP_NUM}`, fs = 40, tw = mw(lab) * fs / 100, w = Math.round(tw + 56), h = 64;
      rect(stk, -w / 2 + 8, -h / 2 + 8, w, h, 14, LIME);
      rect(stk, -w / 2, -h / 2, w, h, 14, RED, INK, 6);
      text(stk, lab, 0, fs * 0.35, fs, INK, { anchor: 'middle' });
      stk.__cx = CW - 52 - w / 2 - 4; stk.__cy = 204;
    }

    // titre en grand : on ajuste la taille pour tenir dans 960 px
    const tFs = Math.min(100, Math.floor(960 / Math.max(...EP_TITLE.map((s) => mw(s) / 100))));
    text(front, EP_TITLE[0], 52, 352, tFs, PAPER, {});
    if (EP_ONE_LINE) text(front, EP_TITLE[1], 52 + Math.round((mw(EP_TITLE[0]) + SP) * tFs / 100), 352, tFs, LIME, {});
    else if (EP_TITLE[1]) text(front, EP_TITLE[1], 52, 352 + Math.round(tFs * 0.98), tFs, LIME, {});

    /* ---------- indicateur de chapitre : 6 pastilles de progression + titre de la section (pop au changement) */
    const sw = [0];
    for (let k = 1; k < NS; k++) {
      const cc = TL.shots.find((s) => s.id === `s${k}-00` && s.component === 'chapter-card');
      sw.push(cc ? cc.start : (TL.sections[k] ? TL.sections[k].start - 3 : sw[k - 1] + 60));
    }
    const swEnd = TL.total - (TL.tail || 14);
    const PG = 14, PX0 = 52, PY = 480, PH = 16, PW = Math.floor((958 - (NS - 1) * PG) / NS);   // 148 px pour 6 chapitres
    const pills = [];
    for (let k = 0; k < NS; k++) {
      const x = PX0 + k * (PW + PG);
      const base = rect(front, x, PY, PW, PH, 8, POCKET, GREY, 3);
      const fill = rect(front, x, PY, 1, PH, 8, LIME);
      pills.push({ x, base, fill });
    }
    const chips = titles.map((tt, k) => {
      const lab = tt, num = `${String(k + 1).padStart(2, '0')}/${String(NS).padStart(2, '0')}`;
      const nfs = 24, nw = Math.round(mw(num, true) * nfs / 100) + 28;
      const fs = Math.min(40, Math.floor((976 - nw - 44 - 8) / (mw(lab) / 100)));   // 40 px, réduit seulement si le titre ne tient pas dans la largeur
      const tw = mw(lab) * fs / 100;
      const w = Math.round(nw + tw + 44), h = 58;
      const gw = g(front);
      rect(gw, 8, 8, w, h, 14, LIME);                         // ombre dure
      rect(gw, 0, 0, w, h, 14, PAPER, INK, 5);
      rect(gw, 0, 0, nw, h, 14, INK, INK, 5);
      text(gw, num, nw / 2, h / 2 + nfs * 0.34, nfs, LIME, { anchor: 'middle', mono: true });
      text(gw, lab, nw + 20, h / 2 + fs * 0.35, fs, INK, {});
      return { gw, w, h };
    });
    const CHIP_X = 52, CHIP_Y = 508;
    const curSection = (T) => { let c = 0; for (let k = 1; k < NS; k++) if (T >= sw[k]) c = k; return c; };

    /* ---------- sous-titres karaoké (groupes de 2 à 5 mots, 2 lignes max, 78–92 px) */
    const FN = /^(le|la|les|l|un|une|de|des|du|d|à|au|aux|et|ou|que|qui|en|ce|se|ne|sa|son|ses|mon|ma|mes|ta|ton|tes|tu|il|elle|je|me|te|y|on|nous|vous|ils|elles|pas|n|qu|s|c|j|m|t|a|est|sur|par|pour|dans|avec|sans|mais|donc|ni|car|si)$/i;
    // taille max (≤ 92) à laquelle les mots tiennent en 1 ou 2 lignes de CAP.maxW ; null si même 78 px est trop grand
    function layout(ws) {
      const n = ws.length, wd0 = ws.map((w) => mw(w.w));
      for (let size = CAP.sizeMax; size >= CAP.sizeMin; size -= 2) {
        const k = size / 100, wd = wd0.map((v) => v * k), sp = SP * k;
        const sum = (a, b) => { let s = 0; for (let i = a; i < b; i++) s += wd[i]; return s + Math.max(0, b - a - 1) * sp; };
        if (sum(0, n) <= CAP.maxW) return { size, lines: [[0, n]], lw: [sum(0, n)], wd, sp };
        let best = null;
        for (let c = 1; c < n; c++) {
          const a = sum(0, c), b = sum(c, n), m = Math.max(a, b);
          if (m <= CAP.maxW && (!best || m < best.m)) best = { c, m, a, b };
        }
        if (best) return { size, lines: [[0, best.c], [best.c, n]], lw: [best.a, best.b], wd, sp };
      }
      return null;
    }
    function chunk(words) {
      const n = words.length;
      if (!n) return [];
      const best = new Array(n + 1).fill(Infinity), prev = new Array(n + 1).fill(-1);
      best[0] = 0;
      for (let b = 1; b <= n; b++) {
        for (let L = 1; L <= 5 && L <= b; L++) {
          const a = b - L;
          if (best[a] === Infinity) continue;
          const sub = words.slice(a, b);
          if (!layout(sub) && L > 1) continue;
          let c = 6 + 1.2 * (L - 3.2) * (L - 3.2);
          if (L === 1 && n >= 2) c += 30;
          if (b < n) {
            const last = words[b - 1].w, gap = words[b].start - words[b - 1].end;
            if (/[,;:]$/.test(last)) c -= 10; else if (gap >= 0.3) c -= 4;
            if (FN.test(last.replace(/[^\p{L}]/gu, ''))) c += 7;
          }
          if (best[a] + c < best[b]) { best[b] = best[a] + c; prev[b] = a; }
        }
      }
      if (best[n] === Infinity) return words.map((w) => [w]);
      const cuts = []; for (let b = n; b > 0; b = prev[b]) cuts.push([prev[b], b]);
      return cuts.reverse().map(([a, b]) => words.slice(a, b));
    }
    const groups = [];
    for (const sen of TL.sentences || []) {
      const words = (sen.words || []).filter((w) => w && typeof w.w === 'string');
      for (const ws of chunk(words)) groups.push({ words: ws, start: ws[0].start - 0.08, end: ws[ws.length - 1].end + 0.25, node: null, idx: groups.length });
    }
    groups.sort((a, b) => a.start - b.start);
    for (let i = 0; i + 1 < groups.length; i++) if (groups[i].end > groups[i + 1].start) groups[i].end = Math.max(groups[i].start + 0.05, groups[i + 1].start);

    const capsLayer = g(front);
    function buildGroup(grp) {
      const ws = grp.words, lay = layout(ws) || (() => { const size = CAP.sizeMin, k = size / 100, wd = ws.map((w) => mw(w.w) * k); return { size, lines: [[0, ws.length]], lw: [wd.reduce((s, v) => s + v, 0) + (ws.length - 1) * SP * k], wd, sp: SP * k }; })();
      const size = lay.size, LH = Math.round(size * 1.14);
      const bw = Math.round(Math.max(...lay.lw) + 2 * CAP.px), bh = lay.lines.length * LH + 2 * CAP.py;
      const gw = g(capsLayer);
      rect(gw, -bw / 2 + 10, -bh / 2 + 10, bw, bh, 24, LIME);
      rect(gw, -bw / 2, -bh / 2, bw, bh, 24, PAPER, INK, 6);
      const pill = rect(gw, 0, 0, 10, 10, 16, LIME, INK, 4);
      const items = new Array(ws.length);
      lay.lines.forEach(([a, b], li) => {
        const cy = -bh / 2 + CAP.py + LH * (li + 0.5);
        let x = -lay.lw[li] / 2;
        for (let i = a; i < b; i++) {
          const el = text(gw, ws[i].w, f2(x), f2(cy + size * 0.35), size, GREY, {});
          items[i] = { el, x, w: lay.wd[i], cy, state: -1 };
          x += lay.wd[i] + lay.sp;
        }
      });
      gw.setAttribute('display', 'none');
      return { gw, items, pill, bw, bh, size };
    }
    function drawCaptions(T) {
      let grp = null;
      const gs = groups; let lo = 0, hi = gs.length - 1, r = -1;
      while (lo <= hi) { const m = (lo + hi) >> 1; if (gs[m].start <= T) { r = m; lo = m + 1; } else hi = m - 1; }
      if (r >= 0 && T < gs[r].end) grp = gs[r];
      for (const gg of groups) if (gg.node && gg !== grp && gg.node.shown) { gg.node.gw.setAttribute('display', 'none'); gg.node.shown = false; }
      if (!grp) return;
      if (!grp.node) grp.node = buildGroup(grp);
      const nd = grp.node;
      if (!nd.shown) { nd.gw.setAttribute('display', 'inline'); nd.shown = true; }
      const pa = prog(T, grp.start, grp.start + 4 / 30);
      const s = pa >= 1 ? 1 : lerp(0.78, 1, E.back(pa));
      nd.gw.setAttribute('transform', `translate(${CAP.cx} ${CAP.cy}) rotate(${grp.idx % 2 ? 1.5 : -1.5}) scale(${f2(s)})`);
      const ws = grp.words;
      let lit = -1;
      for (let j = 0; j < ws.length; j++) {
        const w = ws[j];
        const end = Math.min(j + 1 < ws.length ? ws[j + 1].start : Infinity, w.end + 0.15);
        if (T >= w.start && T < end) lit = j;
        const st = T >= w.start ? 1 : 0, it = nd.items[j];
        if (it.state !== st) { it.state = st; it.el.setAttribute('fill', st ? INK : GREY); }
      }
      if (lit < 0) nd.pill.setAttribute('display', 'none');
      else {
        const it = nd.items[lit], sc = lerp(1.1, 1, prog(T, ws[lit].start, ws[lit].start + 3 / 30));
        const pw = (it.w + 18) * sc, ph = (nd.size * 1.02) * sc, cx = it.x + it.w / 2;
        nd.pill.setAttribute('display', 'inline');
        nd.pill.setAttribute('x', f2(cx - pw / 2)); nd.pill.setAttribute('y', f2(it.cy - ph / 2)); nd.pill.setAttribute('width', f2(pw)); nd.pill.setAttribute('height', f2(ph));
      }
    }

    /* ---------- bandeau marquee discret (bas de la zone utile) */
    const mq = g(front);
    rect(mq, 0, MARQUEE.y - MARQUEE.h / 2, CW, MARQUEE.h, 0, POCKET);
    rect(mq, 0, MARQUEE.y - MARQUEE.h / 2, CW, 3, 0, LIME);
    rect(mq, 0, MARQUEE.y + MARQUEE.h / 2 - 3, CW, 3, 0, LIME);
    const MQ_FS = 26, MQ_TXT = `ZÉRO VERT  ·  LA MAISON GAGNE TOUJOURS  ·  ${EP_NAME.toUpperCase()}  ·  ÉPISODE ${EP_NUM}  ·  `;
    const mqRow = g(mq);
    const mqNodes = [0, 1, 2].map(() => text(mqRow, MQ_TXT, 0, MARQUEE.y + MQ_FS * 0.35, MQ_FS, LIME, { mono: true, spacing: 2 }));
    mqNodes.forEach((n) => n.setAttribute('style', 'white-space:pre'));
    const MQ_P = Math.round(MQ_TXT.length * (mw('M', true) * MQ_FS / 100 + 2));   // avance mono + letter-spacing, par caractère
    mqNodes.forEach((n, i) => n.setAttribute('x', f2(i * MQ_P)));

    /* ---------- ligne d'aide Joueurs Info Service (pendant la carte de fin, zone sûre) */
    const hp = (TL.shots[TL.shots.length - 1].props || {}).help || {};
    const HELP = { name: hp.name || 'Joueurs Info Service', phone: hp.phone || '09 74 75 13 13', hours: hp.hours || 'tous les jours de 8 h à 2 h, appel anonyme et non surtaxé' };
    const helpT0 = TL.total - (TL.tail || 14);
    const help = g(front);
    {
      const w = 820, h = 300;
      rect(help, -w / 2 + 12, -h / 2 + 12, w, h, 26, LIME);
      rect(help, -w / 2, -h / 2, w, h, 26, PAPER, INK, 7);
      rect(help, -w / 2 + 28, -h / 2 + 28, 130, 34, 17, RED, INK, 4);
      text(help, 'AIDE', -w / 2 + 28 + 65, -h / 2 + 28 + 25, 22, INK, { anchor: 'middle', mono: true });
      text(help, HELP.name, -w / 2 + 180, -h / 2 + 60, 44, INK, {});
      const pfs = Math.min(112, Math.floor((w - 80) / (mw(HELP.phone) / 100)));
      text(help, HELP.phone, 0, 22 + pfs * 0.1, pfs, INK, { anchor: 'middle' });
      const parts = HELP.hours.split(/,\s*/);
      const lines = parts.length >= 2 ? [parts[0], parts.slice(1).join(', ')] : [HELP.hours];
      lines.forEach((ln, i) => text(help, ln, 0, h / 2 - 70 + i * 38, 30, GREY, { anchor: 'middle', mono: true }));
      help.setAttribute('display', 'none');
    }
    const HELP_CX = CAP.cx + 4, HELP_CY = 1372;

    /* ---------- une image du HUD */
    let lastSec = -1;
    hudRender = function (T) {
      T = clamp(Number.isFinite(T) ? T : 0, 0, TL.total);
      // sticker ÉPISODE n : léger balancement
      stk.setAttribute('transform', `translate(${f2(stk.__cx)} ${f2(stk.__cy)}) rotate(${f2(4 + 1.6 * Math.sin(T * 2.4))})`);
      // chapitre
      const cur = curSection(T);
      for (let k = 0; k < NS; k++) {
        const p = pills[k];
        const a = sw[k], b = k < NS - 1 ? sw[k + 1] : swEnd;
        const frac = k < cur ? 1 : k > cur ? 0 : clamp((T - a) / Math.max(0.1, b - a));
        const w = frac <= 0 ? 0 : Math.max(PH, PW * frac);
        const popP = k === cur ? prog(T, sw[k], sw[k] + 8 / 30) : 1;
        const grow = k === cur && T >= 0.5 ? 1 + 0.35 * Math.sin(Math.PI * popP) : 1;
        const hh = PH * grow, yy = PY - (hh - PH) / 2;
        p.fill.setAttribute('display', w > 0 ? 'inline' : 'none');
        p.fill.setAttribute('width', f2(Math.min(PW, w))); p.fill.setAttribute('y', f2(yy)); p.fill.setAttribute('height', f2(hh));
        p.base.setAttribute('y', f2(yy)); p.base.setAttribute('height', f2(hh));
      }
      for (let k = 0; k < NS; k++) {
        const c = chips[k];
        if (k !== cur) { if (c.gw.__d !== 'none') { c.gw.__d = 'none'; c.gw.setAttribute('display', 'none'); } continue; }
        if (c.gw.__d !== 'inline') { c.gw.__d = 'inline'; c.gw.setAttribute('display', 'inline'); }
        const pp = T < 0.5 ? 1 : prog(T, sw[k], sw[k] + 9 / 30);
        const s = pp >= 1 ? 1 : lerp(0.7, 1, E.back(pp)), dy = pp >= 1 ? 0 : (1 - pp) * 14;
        c.gw.setAttribute('transform', `translate(${CHIP_X} ${f2(CHIP_Y + dy)}) translate(${f2(c.w / 2)} ${f2(c.h / 2)}) scale(${f2(s)}) translate(${f2(-c.w / 2)} ${f2(-c.h / 2)})`);
      }
      lastSec = cur;
      // marquee
      const off = (T * MARQUEE.speed) % MQ_P;
      mqRow.setAttribute('transform', `translate(${f2(-off)} 0)`);
      // sous-titres / ligne d'aide
      if (T >= helpT0) {
        for (const gg of groups) if (gg.node && gg.node.shown) { gg.node.gw.setAttribute('display', 'none'); gg.node.shown = false; }
        const pa = prog(T, helpT0, helpT0 + 6 / 30), s = pa >= 1 ? 1 : lerp(0.7, 1, E.back(pa));
        help.setAttribute('display', 'inline');
        help.setAttribute('transform', `translate(${HELP_CX} ${HELP_CY}) rotate(-1) scale(${f2(s)})`);
      } else {
        help.setAttribute('display', 'none');
        drawCaptions(T);
      }
    };
    window.__hud = { groups: groups.length, sw, titles, mqP: MQ_P };
    hudReady = true;
    if (Q.get('t') !== null && Q.get('t') !== '') hudRender(parseFloat(Q.get('t')));
  }
  initHud().catch((e) => { console.error('[tiktok] init', e && e.stack || e); window.__error = String(e && e.message || e); });
})();
