#!/usr/bin/env node
// Zéro Vert, vidéo de l'épisode 1 : vérifie `output/video/data/direction.json` SANS timing.json.
//
// Pour chaque ancre (plans, beats des plans, effets sonores et leurs boucles, segments musicaux et leurs silences) :
//  - la phrase existe dans le texte du script (js/podcast-data.js), dans la section `s` (et le paragraphe `p` s'il est donné) ;
//  - elle y est unique, ou `nth` désigne une occurrence existante ;
//  - elle est faite de mots entiers, ne traverse ni une fin de phrase ni un signe isolé (« : », « ? », « » ») ;
//  - le résultat est le même que l'apostrophe ou la virgule décimale soient supprimées ou remplacées par une espace
//    (les deux lectures possibles de « sans ponctuation »), pour ne dépendre d'aucun détail du résolveur.
// Normalisation (spec) : sans casse, sans accents, sans ponctuation, tirets = espaces.
// Ensuite : les plans se suivent sans trou (to[i] === from[i+1], du début à la fin de la vidéo), les beats tombent dans leur
// plan, chaque intervalle est dans le bon ordre. Les durées sont ESTIMÉES (durée des prises au prorata des caractères)
// uniquement pour signaler un plan trop court ou trop long ; l'estimation n'est jamais une cause d'échec, sauf ordre inversé.
//
// Usage : node tools/video/check-anchors.mjs [direction.json] [--table] [--quiet]
//   --table : imprime la liste des plans, des effets et de la musique avec les temps estimés.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
const FLAGS = new Set(argv.filter((a) => a.startsWith('--')));
const FILE = path.resolve(argv.find((a) => !a.startsWith('--')) || path.join(ROOT, 'output/video/data/direction.json'));
const SLUG = 'la-bille-n-a-pas-de-memoire';
// durées des prises par section (spec) et constantes de la ligne de temps, pour l'estimation seulement
const TAKES = [68.1, 82.5, 73.9, 66.3, 81.0, 68.6];
const LEAD_IN = 2.2, PARA_GAP = 0.9, SECTION_GAP = 3.2, TAIL = 14.0, NATURAL_PARA_PAUSE = 0.15, TRIM = 0.2;
const SPECIAL = new Set(['video-start', 'voice-start', 'voice-end', 'video-end', 'section-start', 'section-end']);
const LAYERS = new Set(['ambience', 'foley', 'design']);

const errors = [], warnings = [];
const err = (where, msg) => errors.push(`${where} : ${msg}`);
const warn = (where, msg) => warnings.push(`${where} : ${msg}`);

/* ------------------------------------------------------------------ texte et normalisation */
// variante « drop » : la ponctuation disparaît (l’homme → lhomme, 97,3 → 973) ; « space » : elle devient une espace.
const VARIANTS = ['drop', 'space'];
function norm(str, variant) {
  let s = str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  s = s.replace(/œ/g, 'oe').replace(/æ/g, 'ae');
  s = s.replace(/[-‐-―−]/g, ' '); // tirets = espaces
  s = s.replace(/[^\p{L}\p{N}\s]/gu, variant === 'drop' ? '' : ' ');
  return s.split(/\s+/).filter(Boolean);
}
const ENDS_SENTENCE = /[.!?…]["»”’)]*$/;

const { EPISODES } = await import(pathToFileURL(path.join(ROOT, 'js/podcast-data.js')).href);
const ep = EPISODES.find((e) => e.slug === SLUG);
if (!ep) { console.error(`épisode ${SLUG} introuvable dans js/podcast-data.js`); process.exit(2); }

// index : pour chaque section, ses paragraphes, chaque paragraphe ses mots (comme le découpage de timing.json : espaces)
const SECTIONS = ep.sections.map((sec, s) => ({
  s,
  paras: sec.p.map((text, p) => {
    const words = text.split(/\s+/).filter(Boolean);
    const toks = {};
    for (const v of VARIANTS) {
      toks[v] = [];
      words.forEach((w, wi) => {
        const sub = norm(w, v);
        sub.forEach((t, k) => toks[v].push({ t, wi, first: k === 0, last: k === sub.length - 1 }));
      });
    }
    return { p, text, words, toks };
  })
}));

/* ------------------------------------------------------------------ estimation des temps (indicative) */
(function estimate() {
  let t = LEAD_IN;
  for (const sec of SECTIONS) {
    const np = sec.paras.length;
    const chars = sec.paras.reduce((n, pa) => n + pa.words.reduce((m, w) => m + w.length + 1, 0), 0);
    const speech = TAKES[sec.s] - TRIM - NATURAL_PARA_PAUSE * (np - 1);
    const rate = speech / chars;
    sec.start = t;
    let c = 0;
    sec.paras.forEach((pa, p) => {
      pa.wt = pa.words.map((w) => {
        const st = t + c * rate + PARA_GAP * p;
        c += w.length + 1;
        return { start: st, end: st + (w.length + 1) * rate };
      });
    });
    sec.end = sec.paras[np - 1].wt.at(-1).end;
    t = sec.end + SECTION_GAP;
  }
})();
const VOICE_END = SECTIONS.at(-1).end;
const TOTAL = VOICE_END + TAIL;

/* ------------------------------------------------------------------ résolution d'une ancre */
function findAll(sec, pIdx, phrase, v) {
  const q = norm(phrase, v);
  const out = [];
  if (!q.length) return out;
  for (const pa of sec.paras) {
    if (pIdx !== undefined && pa.p !== pIdx) continue;
    const T = pa.toks[v];
    for (let i = 0; i + q.length <= T.length; i++) {
      let ok = true;
      for (let k = 0; k < q.length; k++) if (T[i + k].t !== q[k]) { ok = false; break; }
      if (!ok) continue;
      out.push({ p: pa.p, w0: T[i].wi, w1: T[i + q.length - 1].wi, whole: T[i].first && T[i + q.length - 1].last });
    }
  }
  return out;
}

// → { sec, p, w0, w1, time, key } ou null (erreur déjà consignée)
function resolve(a, where) {
  if (!a || typeof a !== 'object') { err(where, 'ancre absente'); return null; }
  const dt = a.dt === undefined ? 0 : a.dt;
  if (typeof dt !== 'number' || !Number.isFinite(dt)) { err(where, '`dt` doit être un nombre'); return null; }
  if (a.at !== undefined) {
    if (!SPECIAL.has(a.at)) { err(where, `ancre spéciale inconnue « ${a.at} »`); return null; }
    if (a.phrase !== undefined) { err(where, '`at` et `phrase` sont exclusifs'); return null; }
    let base, key;
    if (a.at === 'section-start' || a.at === 'section-end') {
      if (!Number.isInteger(a.s) || !SECTIONS[a.s]) { err(where, `${a.at} demande un \`s\` valide (0 à ${SECTIONS.length - 1})`); return null; }
      const sec = SECTIONS[a.s];
      base = a.at === 'section-start' ? sec.start : sec.end;
      key = a.at === 'section-start' ? [a.s, 0, -1] : [a.s, 99, 1e6];
    } else {
      base = { 'video-start': 0, 'voice-start': LEAD_IN, 'voice-end': VOICE_END, 'video-end': TOTAL }[a.at];
      key = { 'video-start': [-2, 0, 0], 'voice-start': [-1, 0, 0], 'voice-end': [5, 99, 1e6], 'video-end': [9, 0, 0] }[a.at];
    }
    return { time: base + dt, key: [...key, dt], label: a.at };
  }
  if (!Number.isInteger(a.s) || !SECTIONS[a.s]) { err(where, `\`s\` invalide (${a.s})`); return null; }
  if (typeof a.phrase !== 'string' || !a.phrase.trim()) { err(where, '`phrase` manquante'); return null; }
  const sec = SECTIONS[a.s];
  if (a.p !== undefined && (!Number.isInteger(a.p) || !sec.paras[a.p])) { err(where, `\`p\` invalide (${a.p}) pour la section ${a.s}`); return null; }
  if (a.edge !== undefined && a.edge !== 'start' && a.edge !== 'end') { err(where, '`edge` vaut "start" ou "end"'); return null; }
  if (a.nth !== undefined && (!Number.isInteger(a.nth) || a.nth < 1)) { err(where, '`nth` est un entier ≥ 1'); return null; }
  const scope = a.p !== undefined ? `s${a.s}.p${a.p}` : `s${a.s}`;
  const res = VARIANTS.map((v) => findAll(sec, a.p, a.phrase, v));
  const sig = (l) => l.map((m) => `${m.p}:${m.w0}-${m.w1}`).join(',');
  if (sig(res[0]) !== sig(res[1])) {
    err(where, `« ${a.phrase} » (${scope}) se résout différemment selon que la ponctuation interne (’ , .) est supprimée ou remplacée par une espace ; choisis des mots entiers sans chiffre décimal`);
    return null;
  }
  const all = res[0];
  if (!all.length) { err(where, `« ${a.phrase} » introuvable dans ${scope}`); return null; }
  if (a.nth === undefined && all.length > 1) { err(where, `« ${a.phrase} » est ambiguë dans ${scope} (${all.length} occurrences) : ajoute \`nth\` ou \`p\``); return null; }
  const n = a.nth || 1;
  if (n > all.length) { err(where, `« ${a.phrase} » : nth=${n} mais seulement ${all.length} occurrence(s) dans ${scope}`); return null; }
  const m = all[n - 1];
  const pa = sec.paras[m.p];
  if (!m.whole) err(where, `« ${a.phrase} » ne couvre pas des mots entiers (${pa.words.slice(m.w0, m.w1 + 1).join(' ')})`);
  for (let w = m.w0; w <= m.w1; w++) {
    const word = pa.words[w];
    if (!norm(word, 'space').length) err(where, `« ${a.phrase} » traverse un signe isolé « ${word} » : coupe la phrase avant ou après`);
    else if (w < m.w1 && ENDS_SENTENCE.test(word)) err(where, `« ${a.phrase} » traverse une fin de phrase (« ${word} »)`);
  }
  const edge = a.edge || 'start';
  const wt = edge === 'start' ? pa.wt[m.w0].start : pa.wt[m.w1].end;
  const key = [a.s, m.p, edge === 'start' ? m.w0 : m.w1 + 0.5, dt];
  return { time: wt + dt, key, label: `${scope} « ${a.phrase} »${edge === 'end' ? ' (fin)' : ''}${dt ? ` ${dt > 0 ? '+' : ''}${dt}s` : ''}`, s: a.s, p: m.p };
}

// ordre : d'abord la position dans le texte (fiable), puis l'estimation pour départager les décalages `dt`
function cmpKey(x, y) {
  for (let i = 0; i < 3; i++) if (x.key[i] !== y.key[i]) return x.key[i] - y.key[i];
  return x.key[3] - y.key[3];
}
function before(x, y) { // x strictement avant y ?
  const sameWord = x.key[0] === y.key[0] && x.key[1] === y.key[1] && x.key[2] === y.key[2];
  if (sameWord) return x.key[3] < y.key[3];
  // positions différentes : on se fie à l'estimation quand un dt est en jeu, sinon au texte
  if (x.key[3] || y.key[3]) return x.time < y.time;
  return cmpKey(x, y) < 0;
}

/* ------------------------------------------------------------------ lecture de direction.json */
let D;
try { D = JSON.parse(await readFile(FILE, 'utf8')); }
catch (e) { console.error(`impossible de lire ${FILE} : ${e.message}`); process.exit(2); }

if (!D.video || D.video.w !== 1920 || D.video.h !== 1080 || D.video.fps !== 30) err('video', 'attendu { w: 1920, h: 1080, fps: 30 }');

// composants
const comps = new Map();
for (const [i, c] of (D.components || []).entries()) {
  const where = `components[${i}]`;
  if (!c.id) { err(where, 'id manquant'); continue; }
  if (comps.has(c.id)) err(where, `id en double « ${c.id} »`);
  if (!c.desc || c.desc.length < 40) err(`component ${c.id}`, 'description trop courte');
  if (!c.props || typeof c.props !== 'object') err(`component ${c.id}`, '`props` manquants');
  comps.set(c.id, c);
}
if (comps.size < 12 || comps.size > 18) warn('components', `${comps.size} composants (attendu 12 à 18)`);
const TRANSITIONS = new Set(Object.keys(D.transitions || {}));
if (!TRANSITIONS.size) err('transitions', 'dictionnaire des transitions manquant');

// plans
const shots = D.shots || [];
if (!shots.length) err('shots', 'aucun plan');
const ids = new Set();
const resolved = [];
shots.forEach((sh, i) => {
  const where = `shot ${sh.id || i}`;
  if (!sh.id) err(where, 'id manquant');
  else if (ids.has(sh.id)) err(where, 'id en double');
  ids.add(sh.id);
  if (!comps.has(sh.component)) err(where, `composant inconnu « ${sh.component} »`);
  for (const k of ['in', 'out']) if (!TRANSITIONS.has(sh[k])) err(where, `transition \`${k}\` inconnue « ${sh[k]} »`);
  const from = resolve(sh.from, `${where}.from`), to = resolve(sh.to, `${where}.to`);
  if (from && to && !before(from, to)) err(where, `fin avant le début (${from.label} → ${to.label})`);
  const r = { sh, from, to, beats: [] };
  (sh.beats || []).forEach((b, k) => {
    const bw = `${where}.beats[${k}]`;
    if (!b.do) err(bw, '`do` manquant');
    const at = resolve(b.at, bw);
    if (at && from && to) {
      const lo = from.time - 0.35, hi = to.time + 0.35;
      const textInside = cmpKey(from, at) <= 0 && cmpKey(at, to) <= 0;
      if (!textInside && !(at.time >= lo && at.time <= hi)) err(bw, `hors du plan (${at.label})`);
    }
    r.beats.push(at);
  });
  resolved.push(r);
});
if (shots.length) {
  if (!isDeepStrictEqual(shots[0].from, { at: 'video-start' })) err(`shot ${shots[0].id}`, 'le premier plan doit commencer à { "at": "video-start" }');
  if (!isDeepStrictEqual(shots.at(-1).to, { at: 'video-end' })) err(`shot ${shots.at(-1).id}`, 'le dernier plan doit finir à { "at": "video-end" }');
}
for (let i = 0; i + 1 < shots.length; i++) {
  const a = shots[i], b = shots[i + 1];
  if (!isDeepStrictEqual(a.to, b.from)) err(`shot ${a.id} → ${b.id}`, `trou ou chevauchement : \`to\` ${JSON.stringify(a.to)} ≠ \`from\` ${JSON.stringify(b.from)}`);
  if (a.out !== b.in) err(`shot ${a.id} → ${b.id}`, `\`out\` (${a.out}) ≠ \`in\` du plan suivant (${b.in})`);
}
for (const r of resolved) {
  if (!r.from || !r.to) continue;
  const d = r.to.time - r.from.time;
  r.dur = d;
  if (d < 1.6) warn(`shot ${r.sh.id}`, `très court (≈ ${d.toFixed(1)} s estimées)`);
  if (d > 10.5) warn(`shot ${r.sh.id}`, `long (≈ ${d.toFixed(1)} s estimées)`);
}

// sous-titres
if (!D.captions || typeof D.captions.enabled !== 'boolean' || !D.captions.style) err('captions', '`enabled` et `style` attendus');

// effets sonores
const sfxIds = new Set();
const sfxRes = [];
(D.sfx || []).forEach((x, i) => {
  const where = `sfx ${x.id || i}`;
  if (!x.id) err(where, 'id manquant'); else if (sfxIds.has(x.id)) err(where, 'id en double');
  sfxIds.add(x.id);
  const at = resolve(x.at, `${where}.at`);
  if (typeof x.dur !== 'number' || x.dur < 0.5 || x.dur > 6) err(where, `dur ${x.dur} hors de [0,5 ; 6] s`);
  if (typeof x.prompt !== 'string' || !x.prompt.trim()) err(where, 'prompt manquant');
  else if (x.prompt.length > 200) err(where, `prompt trop long (${x.prompt.length} > 200)`);
  if (typeof x.gain_db !== 'number' || x.gain_db > 0 || x.gain_db < -40) err(where, `gain_db ${x.gain_db} hors de [−40 ; 0]`);
  if (typeof x.pan !== 'number' || x.pan < -1 || x.pan > 1) err(where, `pan ${x.pan} hors de [−1 ; 1]`);
  if (!LAYERS.has(x.layer)) err(where, `layer « ${x.layer} » (attendu ${[...LAYERS].join(' | ')})`);
  if (x.align !== undefined && !['start', 'end', 'peak'].includes(x.align)) err(where, '`align` vaut "start", "end" ou "peak"');
  let until = null;
  if (x.loop_to !== undefined) {
    until = resolve(x.loop_to, `${where}.loop_to`);
    if (at && until && !before(at, until)) err(where, 'loop_to avant at');
  }
  sfxRes.push({ x, at, until });
});
const nSfx = (D.sfx || []).length;
if (nSfx < 45 || nSfx > 70) warn('sfx', `${nSfx} effets (attendu 45 à 70)`);

// musique
const musRes = [];
(D.music || []).forEach((m, i) => {
  const where = `music ${m.id || i}`;
  const from = resolve(m.from, `${where}.from`), to = resolve(m.to, `${where}.to`);
  if (from && to && !before(from, to)) err(where, 'fin avant le début');
  if (typeof m.prompt !== 'string' || !m.prompt.trim()) err(where, 'prompt manquant');
  else if (m.prompt.length > 400) err(where, `prompt trop long (${m.prompt.length} > 400)`);
  if (typeof m.gain_db !== 'number') err(where, 'gain_db manquant');
  const mutes = (m.mutes || []).map((u, k) => {
    const a = resolve(u.from, `${where}.mutes[${k}].from`), b = resolve(u.to, `${where}.mutes[${k}].to`);
    if (a && b && !before(a, b)) err(`${where}.mutes[${k}]`, 'fin avant le début');
    if (a && from && !before(from, a) && !isDeepStrictEqual(u.from, m.from)) err(`${where}.mutes[${k}]`, 'commence avant le segment');
    if (b && to && before(to, b)) err(`${where}.mutes[${k}]`, 'finit après le segment');
    return [a, b];
  });
  musRes.push({ m, from, to, mutes });
});
for (let i = 0; i + 1 < musRes.length; i++) {
  const a = musRes[i], b = musRes[i + 1];
  if (a.to && b.from && before(b.from, a.to)) warn(`music ${a.m.id} → ${b.m.id}`, 'les segments se chevauchent');
}
const nMus = (D.music || []).length;
if (nMus < 4 || nMus > 6) warn('music', `${nMus} segments (attendu 4 à 6)`);
if (!D.mix || typeof D.mix.voice_lufs !== 'number' || typeof D.mix.master_lufs !== 'number' || typeof D.mix.duck_db !== 'number') err('mix', 'voice_lufs, master_lufs et duck_db attendus');

/* ------------------------------------------------------------------ rapport */
const mmss = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
if (FLAGS.has('--json')) { // temps estimés, pour outiller la documentation (direction.md) ; rien d'autre sur stdout
  const r2 = (t) => (t === undefined ? null : Math.round(t * 10) / 10);
  console.log(JSON.stringify({
    total: r2(TOTAL), ok: !errors.length, errors,
    shots: resolved.map((r) => ({ id: r.sh.id, start: r2(r.from?.time), dur: r2(r.dur) })),
    sfx: sfxRes.map((s) => ({ id: s.x.id, t: r2(s.at?.time), until: r2(s.until?.time) })),
    music: musRes.map((m) => ({ id: m.m.id, from: r2(m.from?.time), to: r2(m.to?.time), mutes: m.mutes.map(([a, b]) => [r2(a?.time), r2(b?.time)]) }))
  }));
  process.exit(errors.length ? 1 : 0);
}
if (FLAGS.has('--table')) {
  console.log('\nPLANS (temps estimés, à titre indicatif)');
  for (const r of resolved) {
    if (!r.from || !r.to) continue;
    console.log(`${r.sh.id.padEnd(7)} ${mmss(r.from.time).padStart(7)} ${r.dur.toFixed(1).padStart(5)}s  ${r.sh.component.padEnd(14)} ${r.from.label}`);
  }
  console.log('\nEFFETS');
  for (const s of sfxRes) if (s.at) console.log(`${s.x.id.padEnd(22)} ${mmss(s.at.time).padStart(7)}  ${s.x.layer.padEnd(8)} ${String(s.x.gain_db).padStart(4)} dB  ${s.until ? `→ ${mmss(s.until.time)}` : ''}`);
  console.log('\nMUSIQUE');
  for (const m of musRes) if (m.from && m.to) console.log(`${m.m.id.padEnd(22)} ${mmss(m.from.time)} → ${mmss(m.to.time)}  (${(m.to.time - m.from.time).toFixed(0)} s, ${m.mutes.length} silence(s))`);
}
const nAnchors = resolved.reduce((n, r) => n + 2 + r.beats.length, 0) + sfxRes.reduce((n, s) => n + 1 + (s.x.loop_to ? 1 : 0), 0) +
  musRes.reduce((n, m) => n + 2 + 2 * m.mutes.length, 0);
for (const w of warnings) console.warn(`avertissement · ${w}`);
for (const e of errors) console.error(`ERREUR · ${e}`);
const durs = resolved.filter((r) => r.dur !== undefined).map((r) => r.dur);
const avg = durs.reduce((a, b) => a + b, 0) / (durs.length || 1);
console.log(`${path.relative(ROOT, FILE)} : ${comps.size} composants, ${shots.length} plans (≈ ${avg.toFixed(1)} s en moyenne), ` +
  `${nSfx} effets, ${nMus} segments musicaux, ${nAnchors} ancres ; durée estimée ≈ ${mmss(TOTAL)}.`);
if (errors.length) { console.error(`ÉCHEC : ${errors.length} erreur(s).`); process.exit(1); }
console.log(`OK : toutes les ancres sont valides et uniques, les plans s'enchaînent sans trou${warnings.length ? ` (${warnings.length} avertissement(s))` : ''}.`);
