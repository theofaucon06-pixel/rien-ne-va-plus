// ZÉRO VERT — brand generator. Writes the podcast identity files into assets/podcast/ (deterministic, no dependency, no font at runtime).
// Run: node tools/podcast-brand.mjs   (npm run podcast does it before building the pages)
//
// Concept: the zero of the roulette is the green pocket, the one that pays 35 to 1 on 37 pockets. The mark is a lime pocket holding an
// ultra-bold "0" whose counter is a roulette pocket with the little white ball resting in it. The wordmark is the real Bricolage Grotesque
// ExtraBold (SIL OFL 1.1, Google Fonts), condensed instance (wdth 75), converted to outlines — the O of ZÉRO is the wide one (wdth 100),
// so the zero is the one letter that opens up to host the ball. The glyph outlines are embedded below (1000 units/em, y down, baseline 0).
//
// Files written:
//   mark.svg      512x512   square icon (lime tile, ink 0, white ball)
//   favicon.svg   512x512   same idea, thicker and simpler to stay readable at 16-32 px
//   logo.svg      horizontal lockup: mark + ZÉRO VERT in ink, transparent background (for paper / lime backgrounds)
//   logo-dark.svg same lockup, wordmark in lime (for ink backgrounds)
//   cover.svg     1000x1000 viewBox, square 1:1 cover for podcast directories (flat colours, no gradient, no glow)
//   cover.png     1400x1400, NOT written by this script. Export it from cover.svg on macOS:
//       d=$(mktemp -d) && qlmanage -t -s 2800 -o "$d" assets/podcast/cover.svg && sips -Z 1400 "$d/cover.svg.png" --out assets/podcast/cover.png
//       sips -g pixelWidth -g pixelHeight assets/podcast/cover.png      # must say 1400 x 1400
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'assets', 'podcast');

const INK = '#0A0A0A';
const LIME = '#C8FF2E';
const RED = '#FF4A36';
const WHITE = '#FFFFFF';
const CAP = 660; // cap height of the outlines (font units)
const BALL_R = 102; // outer radius of the ball, outline included (the counter is about 270 wide)
const BALL_Y = -240; // y of the ball's centre inside the O's counter (the counter spans -542..-119): it rests at the bottom

// Bricolage Grotesque ExtraBold, wdth 75 (key = character) and wdth 100 for the round O (key "WO").
const GLYPHS = {
  "Z": { adv: 351, x1: 14, x2: 337, d: 'M337 0L14 0L14 -121L178 -532L178 -535L14 -535L14 -660L334 -660L334 -539L169 -129L169 -125L337 -125L337 0' },
  "É": { adv: 322, x1: 20, x2: 312, d: 'M175 0L20 0L20 -660L175 -660L175 0M312 0L130 0L130 -126L312 -126L312 0M286 -278L130 -278L130 -393L286 -393L286 -278M312 -534L130 -534L130 -660L312 -660L312 -534M295 -804L211 -695L86 -695L140 -804L295 -804' },
  "E": { adv: 322, x1: 20, x2: 312, d: 'M175 0L20 0L20 -660L175 -660L175 0M312 0L130 0L130 -126L312 -126L312 0M286 -278L130 -278L130 -393L286 -393L286 -278M312 -534L130 -534L130 -660L312 -660L312 -534' },
  "R": { adv: 429, x1: 20, x2: 420, d: 'M174 0L20 0L20 -660L202 -660Q236 -660 267 -652Q298 -645 324 -629Q349 -613 368 -590Q387 -567 398 -535Q408 -504 408 -464L408 -464Q408 -431 400 -402Q392 -373 375 -350Q357 -328 331 -312Q305 -297 269 -291L269 -291L269 -282Q322 -280 349 -260Q376 -240 387 -206Q398 -173 403 -129L403 -129L420 0L260 0L251 -106Q248 -140 243 -167Q238 -195 225 -211Q211 -227 181 -228L181 -228L174 -228L174 0M174 -537L174 -330L186 -330Q220 -330 237 -356Q253 -382 253 -440L253 -440Q253 -493 239 -515Q225 -537 194 -537L194 -537L174 -537' },
  "V": { adv: 444, x1: 4, x2: 440, d: 'M327 0L109 0L4 -660L168 -660L217 -134L224 -134L281 -660L440 -660L327 0' },
  "T": { adv: 375, x1: 5, x2: 370, d: 'M265 0L111 0L111 -660L265 -660L265 0M370 -535L5 -535L5 -660L370 -660L370 -535' },
  "L": { adv: 332, x1: 20, x2: 327, d: 'M176 0L20 0L20 -660L176 -660L176 0M327 0L46 0L46 -130L327 -130L327 0' },
  "P": { adv: 424, x1: 20, x2: 417, d: 'M177 -174L131 -174L131 -298L187 -298Q223 -298 239 -327Q255 -356 255 -423L255 -423Q255 -480 239 -508Q223 -537 190 -537L190 -537L131 -537L131 -660L209 -660Q242 -660 278 -646Q314 -632 346 -603Q378 -574 398 -527Q417 -481 417 -416L417 -416Q417 -337 387 -283Q356 -229 302 -201Q248 -174 177 -174L177 -174M174 0L20 0L20 -660L174 -660L174 0' },
  "D": { adv: 430, x1: 20, x2: 415, d: 'M195 0L87 0L87 -123L189 -123Q211 -123 227 -139Q243 -155 252 -200Q261 -245 261 -330L261 -330Q261 -396 256 -436Q251 -477 241 -499Q231 -521 217 -529Q203 -537 186 -537L186 -537L87 -537L87 -660L180 -660Q253 -660 306 -621Q358 -583 387 -509Q415 -435 415 -329L415 -329Q415 -242 400 -183Q384 -124 359 -87Q333 -51 304 -32Q274 -13 246 -6Q217 0 195 0L195 0M174 0L20 0L20 -660L174 -660L174 0' },
  "C": { adv: 424, x1: 16, x2: 413, d: 'M225 12L225 12Q163 12 122 -11Q81 -34 58 -77Q35 -121 26 -184Q16 -247 16 -328L16 -328Q16 -402 25 -465Q33 -528 55 -574Q77 -620 118 -645Q159 -671 223 -671L223 -671Q284 -671 323 -649Q361 -627 380 -590Q399 -553 402 -506Q405 -459 396 -409L396 -409L252 -393Q258 -443 256 -479Q254 -515 244 -534Q234 -553 216 -553L216 -553Q203 -553 195 -541Q186 -530 181 -505Q176 -481 174 -441Q171 -402 171 -346L171 -346Q171 -256 176 -203Q181 -150 192 -127Q203 -105 220 -105L220 -105Q243 -105 253 -134Q262 -164 263 -210Q263 -257 257 -307L257 -307L405 -288Q417 -212 411 -155Q405 -99 382 -62Q358 -25 319 -6Q279 12 225 12' },
  "A": { adv: 441, x1: 2, x2: 439, d: 'M163 0L2 0L112 -660L330 -660L439 0L279 0L222 -543L214 -543L163 0M333 -110L102 -110L102 -210L333 -210L333 -110' },
  "S": { adv: 412, x1: 14, x2: 402, d: 'M208 12L208 12Q151 12 110 -5Q69 -22 45 -54Q21 -87 16 -132Q10 -178 25 -235L25 -235L167 -254Q161 -216 162 -180Q163 -145 174 -122Q185 -100 210 -100L210 -100Q222 -100 231 -106Q239 -112 244 -124Q248 -136 248 -155L248 -155Q248 -192 233 -218Q217 -245 193 -265Q169 -285 144 -302L144 -302Q122 -318 99 -336Q76 -355 57 -378Q38 -402 27 -432Q15 -462 15 -501L15 -501Q15 -552 37 -590Q59 -629 102 -650Q144 -672 204 -672L204 -672Q272 -672 316 -645Q359 -618 378 -567Q396 -517 388 -447L388 -447L249 -429Q252 -453 252 -475Q251 -498 246 -516Q241 -534 231 -544Q220 -555 204 -555L204 -555Q193 -555 185 -549Q176 -543 172 -532Q167 -522 167 -507L167 -507Q167 -482 179 -463Q191 -445 211 -430Q230 -416 251 -402L251 -402Q280 -383 307 -361Q334 -340 356 -313Q377 -286 390 -251Q402 -216 402 -170L402 -170Q402 -118 383 -76Q363 -35 321 -11Q278 12 208 12' },
  "3": { adv: 400, x1: 7, x2: 391, d: 'M193 14L193 14Q144 14 107 0Q69 -15 45 -44Q20 -73 12 -116Q3 -160 12 -218L12 -218L153 -241Q149 -208 150 -182Q150 -156 156 -138Q161 -120 171 -111Q180 -102 193 -102L193 -102Q204 -102 214 -109Q223 -116 229 -133Q235 -150 235 -179L235 -179Q235 -226 220 -253Q204 -281 175 -297Q146 -313 105 -323L105 -323L105 -363L207 -531L207 -534L24 -534L24 -660L364 -660L364 -541L258 -380L258 -375Q307 -354 336 -325Q365 -297 378 -261Q391 -225 391 -182L391 -182Q391 -121 368 -77Q345 -33 301 -9Q257 14 193 14' },
  "5": { adv: 422, x1: 16, x2: 409, d: 'M207 14L207 14Q141 14 98 -9Q54 -33 34 -75Q13 -117 16 -175L16 -175L162 -206Q161 -160 174 -130Q187 -101 208 -101L208 -101Q230 -101 240 -133Q250 -165 250 -226L250 -226Q250 -252 248 -273Q246 -295 242 -310Q238 -325 232 -333Q225 -341 215 -341L215 -341Q207 -341 201 -336Q194 -331 189 -321Q184 -311 180 -298Q175 -285 171 -268L171 -268L16 -268L29 -660L388 -660L388 -533L161 -533L154 -314L160 -314Q172 -386 195 -420Q217 -454 263 -454L263 -454Q311 -454 344 -422Q376 -391 393 -338Q409 -285 409 -218L409 -218Q409 -140 387 -88Q364 -37 319 -11Q274 14 207 14' },
  ":": { adv: 174, x1: 12, x2: 162, d: 'M87 -5L87 -5Q50 -5 31 -27Q12 -50 12 -95L12 -95Q12 -141 31 -163Q49 -186 87 -186L87 -186Q125 -186 144 -163Q162 -141 162 -95L162 -95Q162 -5 87 -5M87 -331L87 -331Q50 -331 31 -353Q12 -376 12 -421L12 -421Q12 -467 31 -489Q49 -512 87 -512L87 -512Q125 -512 144 -489Q162 -467 162 -421L162 -421Q162 -331 87 -331' },
  "1": { adv: 244, x1: 6, x2: 224, d: 'M224 0L67 0L67 -438L6 -438L6 -577Q41 -577 61 -597Q80 -617 89 -660L89 -660L224 -660L224 0' },
  "WO": { adv: 661, x1: 27, x2: 634, d: 'M328 14L328 14Q258 14 202 -8Q146 -30 107 -73Q68 -116 48 -180Q27 -244 27 -327L27 -327Q27 -445 66 -521Q104 -598 174 -636Q243 -674 334 -674L334 -674Q404 -674 460 -652Q515 -631 554 -588Q593 -545 614 -480Q634 -416 634 -331L634 -331Q634 -245 613 -180Q591 -115 551 -72Q510 -29 454 -7Q397 14 328 14M334 -119L334 -119Q379 -119 409 -141Q438 -164 453 -209Q467 -255 467 -324L467 -324Q467 -397 452 -445Q436 -493 406 -517Q375 -542 329 -542L329 -542Q285 -542 255 -518Q225 -495 210 -448Q195 -401 195 -331L195 -331Q195 -278 204 -238Q212 -198 230 -171Q247 -145 273 -132Q299 -119 334 -119' },
};

const f = (n) => String(Math.round(n * 100) / 100);
const glyphOf = (ch) => GLYPHS[ch === 'O' ? 'WO' : ch];

// Lays a string out on one baseline. Returns the outline paths (origin = left ink edge of the first glyph, baseline y = 0),
// the ink width, and where the O's counter is (for the ball).
function setText(str, { track = 0, space = 170, kern = {} } = {}) {
  let x = 0;
  let first = null;
  let paths = '';
  let right = 0;
  let o = null;
  let prev = '';
  for (const ch of str) {
    if (ch === ' ') { x += space; prev = ''; continue; }
    const g = glyphOf(ch);
    if (!g) throw new Error(`missing glyph ${ch}`);
    x += kern[prev + ch] || 0;
    if (first === null) first = x + g.x1;
    paths += `<path transform="translate(${f(x)} 0)" d="${g.d}"/>`;
    if (ch === 'O') o = { cx: x + 331, cy: BALL_Y };
    right = x + g.x2;
    x += g.adv + track;
    prev = ch;
  }
  const dx = -first;
  return { paths, width: right - first, dx, o: o && { cx: o.cx + dx, cy: o.cy } };
}

// Ball resting at the bottom of the zero's counter (units of the text, y down). `r` is the outer radius, stroke included.
const ball = (cx, cy, r, { stroke = 14 } = {}) =>
  `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r - stroke / 2)}" fill="${WHITE}" stroke="${INK}" stroke-width="${f(stroke)}"/>`;

// The round "0" of the mark, centred on (cx, cy) with an ink height `h`, holding the ball.
function zero(cx, cy, h, { ballR = BALL_R, ballStroke = 16 } = {}) {
  const s = h / 688; // O ink box is 688 high (-674..14) and 607 wide (27..634), centre (330.5, -330)
  const g = GLYPHS.WO;
  const t = `translate(${f(cx - 330.5 * s)} ${f(cy + 330 * s)}) scale(${f(s)})`;
  return `<g transform="${t}"><path fill="${INK}" d="${g.d}"/>${ball(331, BALL_Y, ballR, { stroke: ballStroke })}</g>`;
}

const svgOpen = (w, h, vb, title, desc) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${w}" height="${h}" role="img" aria-labelledby="t">\n<title id="t">${title}</title>\n`;

// ---- mark.svg : lime tile, ink border, ink zero, white ball -----------------------------------------------------------------------
function markGroup() {
  return `<rect x="12" y="12" width="488" height="488" rx="116" fill="${LIME}" stroke="${INK}" stroke-width="24"/>` +
    zero(256, 262, 372);
}
const mark = svgOpen(512, 512, '0 0 512 512', 'ZÉRO VERT') + markGroup() + '\n</svg>\n';

// ---- favicon.svg : no border, bigger zero, bigger ball ---------------------------------------------------------------------------
const favicon = svgOpen(512, 512, '0 0 512 512', 'ZÉRO VERT') +
  `<rect width="512" height="512" rx="120" fill="${LIME}"/>` +
  zero(256, 258, 440, { ballR: 108, ballStroke: 26 }) + '\n</svg>\n';

// ---- logo.svg : mark + ZÉRO VERT on one line ------------------------------------------------------------------------------------
function lockup(wordColor, title) {
  const wm = setText('ZÉRO VERT', { track: -8, space: 150 });
  const H = 880; // mark height in text units
  const gap = 150;
  const textTop = (H - CAP) / 2;
  const totalW = H + gap + wm.width;
  const padTop = 40; // room for the accent of the É
  const vb = `0 ${-padTop} ${f(totalW)} ${H + padTop}`;
  const markScale = H / 512;
  const w = Math.round(totalW / 10), h = Math.round((H + padTop) / 10);
  const word = `<g fill="${wordColor}" transform="translate(${f(H + gap + wm.dx)} ${f(textTop + CAP)})">${wm.paths}${ball(wm.o.cx, wm.o.cy, BALL_R, { stroke: 18 })}</g>`;
  return svgOpen(w, h, vb, title) + `<g transform="scale(${f(markScale)})">${markGroup()}</g>` + word + '\n</svg>\n';
}
const logo = lockup(INK, 'ZÉRO VERT');
const logoDark = lockup(LIME, 'ZÉRO VERT');

// ---- cover.svg ----------------------------------------------------------------------------------------------------------------------------
function cover() {
  const M = 48, W = 1000 - 2 * M;
  const z = setText('ZÉRO', { track: -14 });
  const s = W / z.width;
  // VERT: same scale, tracking solved to get the same width
  const probe = setText('VERT', { track: 0 });
  const t2 = (W / s - probe.width) / 3;
  const v = setText('VERT', { track: t2 });
  const cap = CAP * s;
  const base2 = 1000 - M;
  const base1 = base2 - cap - 34;
  const line1 = `<g transform="translate(${M} ${f(base1)}) scale(${f(s)}) translate(${f(z.dx)} 0)" fill="${INK}">${z.paths}${ball(z.o.cx, z.o.cy, BALL_R, { stroke: 16 })}</g>`;
  const line2 = `<g transform="translate(${M} ${f(base2)}) scale(${f(s)}) translate(${f(v.dx)} 0)" fill="${INK}">${v.paths}</g>`;
  // pill "LE PODCAST"
  const pt = setText('LE PODCAST', { track: 12, space: 150 });
  const ps = 38 / CAP;
  const pw = pt.width * ps + 52, ph = 70;
  const pill = `<g transform="translate(${M} 40)"><rect width="${f(pw)}" height="${ph}" rx="${ph / 2}" fill="${INK}"/><g fill="${LIME}" transform="translate(26 ${f(ph / 2 + 19)}) scale(${f(ps)}) translate(${f(pt.dx)} 0)">${pt.paths}</g></g>`;
  // sticker 35:1
  const st = setText('35:1', { track: 0 });
  const ss = 104 / CAP;
  const sw = st.width * ss + 80, sh = 148;
  const sx = 1000 - M - sw - 8, sy = 34;
  const sticker = `<g transform="translate(${f(sx + sw / 2)} ${f(sy + sh / 2)}) rotate(-6)"><g transform="translate(${f(-sw / 2 + 12)} ${f(-sh / 2 + 12)})"><rect width="${f(sw)}" height="${sh}" rx="34" fill="${INK}"/></g>` +
    `<rect x="${f(-sw / 2)}" y="${f(-sh / 2)}" width="${f(sw)}" height="${sh}" rx="34" fill="${RED}" stroke="${INK}" stroke-width="8"/>` +
    `<g fill="${INK}" transform="translate(${f(-st.width * ss / 2)} ${f(56)}) scale(${f(ss)}) translate(${f(st.dx)} 0)">${st.paths}</g></g>`;
  return svgOpen(1000, 1000, '0 0 1000 1000', 'ZÉRO VERT — le podcast qui t’explique comment la maison gagne') +
    `<rect width="1000" height="1000" fill="${LIME}"/>\n${pill}\n${sticker}\n${line1}\n${line2}\n</svg>\n`;
}

mkdirSync(outDir, { recursive: true });
const files = { 'mark.svg': mark, 'favicon.svg': favicon, 'logo.svg': logo, 'logo-dark.svg': logoDark, 'cover.svg': cover() };
for (const [name, body] of Object.entries(files)) writeFileSync(path.join(outDir, name), body);
console.log(`podcast brand: wrote ${Object.keys(files).join(', ')}`);
