// Résolveur d'ancres partagé (voir tools/video/SPEC.md, « Ancres »).
//   loadTiming(path)          -> objet timing (output/video/data/timing.json)
//   resolve(timing, anchor)   -> secondes sur la ligne de temps finale
// Une ancre est { s, p?, phrase, nth?, edge?, dt? } ou { at: 'video-start' | 'voice-start' | 'voice-end' | 'video-end' }
// ou { s, at: 'section-start' | 'section-end' }.
//
// Normalisation des phrases (script ET ancre) : sans casse, sans accents, sans ponctuation ; tirets et apostrophes
// = séparateurs (« n’a » = « n a », « trente-six » = « trente six ») ; les nombres écrits en chiffres sont lus en
// toutes lettres (« 36 divisé par 37 » = « trente-six divisé par trente-sept », « 97,3 » = « quatre-vingt-dix-sept virgule trois »).
import { readFileSync } from 'node:fs';

const UNITS = ['zero', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze',
  'treize', 'quatorze', 'quinze', 'seize', 'dix sept', 'dix huit', 'dix neuf'];
const TENS = { 20: 'vingt', 30: 'trente', 40: 'quarante', 50: 'cinquante', 60: 'soixante' };

function below100(n) {
  if (n < 20) return UNITS[n];
  if (n < 70) {
    const t = Math.floor(n / 10) * 10, u = n % 10;
    return u === 0 ? TENS[t] : TENS[t] + (u === 1 ? ' et un' : ' ' + UNITS[u]);
  }
  if (n < 80) return 'soixante' + (n === 71 ? ' et ' : ' ') + below100(n - 60);
  if (n === 80) return 'quatre vingt';
  return 'quatre vingt ' + below100(n - 80);
}

function intWords(n) {
  if (n < 100) return below100(n);
  if (n < 1000) {
    const h = Math.floor(n / 100), r = n % 100;
    return (h === 1 ? 'cent' : UNITS[h] + ' cent') + (r ? ' ' + below100(r) : '');
  }
  const th = Math.floor(n / 1000), r = n % 1000;
  return (th === 1 ? 'mille' : intWords(th) + ' mille') + (r ? ' ' + intWords(r) : '');
}

function numberWords(txt) {
  const m = /^(\d{1,6})(?:[.,](\d{1,3}))?$/.exec(txt);
  if (!m) return null;
  let out = intWords(parseInt(m[1], 10));
  if (m[2]) out += ' virgule ' + intWords(parseInt(m[2], 10));
  return out.split(' ');
}

/** Un mot (du script ou d'une ancre) -> jetons normalisés. */
export function normTokens(word) {
  let w = String(word).trim();
  const pct = /^(.*?)(%|€)[^\p{L}\p{N}]*$/u.exec(w);
  if (pct) return [...(pct[1] ? normTokens(pct[1]) : []), ...(pct[2] === '%' ? ['pour', 'cent'] : ['euros'])];
  const core = w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
  const num = numberWords(core);
  if (num) return num;
  w = w.replace(/œ/gi, 'oe').replace(/æ/gi, 'ae').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  w = w.replace(/[’'`´\-‐‑–—_]/g, ' ').replace(/[^a-z0-9 ]/g, '');
  return w.split(' ').filter(Boolean);
}

function phraseTokens(phrase) {
  // on découpe sur les blancs d'abord (les nombres restent entiers), puis chaque morceau est normalisé
  return String(phrase).split(/[\s ]+/).flatMap((w) => normTokens(w));
}

export function loadTiming(path) {
  const t = JSON.parse(readFileSync(path, 'utf8'));
  indexOf(t);
  return t;
}

const INDEX = new WeakMap();

/** Index par paragraphe : jetons -> mot (indice dans le paragraphe). */
function indexOf(timing) {
  let idx = INDEX.get(timing);
  if (idx) return idx;
  idx = timing.sections.map((sec) => sec.paragraphs.map((par) => {
    const words = par.sentences.flatMap((se) => se.words);
    const toks = [], owner = [];
    words.forEach((w, wi) => { for (const t of normTokens(w.w)) { toks.push(t); owner.push(wi); } });
    return { words, toks, owner };
  }));
  INDEX.set(timing, idx);
  return idx;
}

const fmt = (a) => JSON.stringify(a);

function lastWordEnd(timing) {
  const sec = timing.sections[timing.sections.length - 1];
  return sec.paragraphs[sec.paragraphs.length - 1].end;
}

function section(timing, a) {
  if (!Number.isInteger(a.s) || a.s < 0 || a.s >= timing.sections.length) {
    throw new Error(`Ancre ${fmt(a)} : section "s" invalide (0 à ${timing.sections.length - 1}).`);
  }
  return timing.sections[a.s];
}

export function resolve(timing, anchor) {
  const a = anchor;
  if (!a || typeof a !== 'object') throw new Error(`Ancre invalide : ${fmt(a)}`);
  const dt = a.dt === undefined ? 0 : a.dt;
  if (typeof dt !== 'number' || !Number.isFinite(dt)) throw new Error(`Ancre ${fmt(a)} : "dt" doit être un nombre.`);
  let t;
  if (a.at !== undefined) {
    switch (a.at) {
      case 'video-start': t = 0; break;
      case 'voice-start': t = timing.lead_in; break;
      case 'voice-end': t = lastWordEnd(timing); break;
      case 'video-end': t = timing.total; break;
      case 'section-start': t = section(timing, a).start; break;
      case 'section-end': t = section(timing, a).end; break;
      default: throw new Error(`Ancre ${fmt(a)} : "at" inconnu (video-start, voice-start, voice-end, video-end, section-start, section-end).`);
    }
    return t + dt;
  }
  if (typeof a.phrase !== 'string' || !a.phrase.trim()) throw new Error(`Ancre ${fmt(a)} : "phrase" ou "at" requis.`);
  const edge = a.edge === undefined ? 'start' : a.edge;
  if (edge !== 'start' && edge !== 'end') throw new Error(`Ancre ${fmt(a)} : "edge" doit valoir "start" ou "end".`);
  const want = phraseTokens(a.phrase);
  if (!want.length) throw new Error(`Ancre ${fmt(a)} : phrase vide après normalisation.`);
  const idx = indexOf(timing);
  const sections = a.s === undefined ? idx.map((_, i) => i) : (section(timing, a), [a.s]);
  const hits = [];
  for (const si of sections) {
    const pars = idx[si];
    const ps = a.p === undefined ? pars.map((_, i) => i) : [a.p];
    if (a.p !== undefined && !pars[a.p]) throw new Error(`Ancre ${fmt(a)} : paragraphe "p" invalide (section ${si} : 0 à ${pars.length - 1}).`);
    for (const pi of ps) {
      const { toks, owner, words } = pars[pi];
      for (let i = 0; i + want.length <= toks.length; i++) {
        let ok = true;
        for (let k = 0; k < want.length; k++) if (toks[i + k] !== want[k]) { ok = false; break; }
        if (ok) hits.push({ si, pi, first: words[owner[i]], last: words[owner[i + want.length - 1]], ctx: words.slice(Math.max(0, owner[i] - 3), owner[i] + 6).map((w) => w.w).join(' ') });
      }
    }
  }
  const scope = a.s === undefined ? 'épisode' : a.p === undefined ? `section ${a.s}` : `section ${a.s}, paragraphe ${a.p}`;
  if (!hits.length) throw new Error(`Ancre ${fmt(a)} : phrase introuvable dans ${scope} (normalisée : « ${want.join(' ')} »).`);
  let hit;
  if (a.nth === undefined) {
    if (hits.length > 1) {
      throw new Error(`Ancre ${fmt(a)} : phrase ambiguë dans ${scope} (${hits.length} occurrences) ; précise "nth" (1 à ${hits.length}) ou "p". Occurrences : ` +
        hits.map((h, i) => `#${i + 1} s${h.si}/p${h.pi} « …${h.ctx}… »`).join(' ; '));
    }
    hit = hits[0];
  } else {
    if (!Number.isInteger(a.nth) || a.nth < 1 || a.nth > hits.length) {
      throw new Error(`Ancre ${fmt(a)} : "nth" hors limites (${hits.length} occurrence(s) dans ${scope}).`);
    }
    hit = hits[a.nth - 1];
  }
  t = edge === 'start' ? hit.first.start : hit.last.end;
  return t + dt;
}
