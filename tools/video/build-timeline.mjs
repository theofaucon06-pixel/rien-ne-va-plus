// Résout toutes les ancres de direction.json sur la ligne de temps réelle (timing.json) et écrit output/video/data/timeline.json.
//   node tools/video/build-timeline.mjs
// Les plans sont rendus jointifs par construction : la fin d'un plan est le début du suivant.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTiming, resolve } from './lib/anchors.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
// ZV_EP (ex. « ep2 ») : épisode traité, dans output/video/<ZV_EP>/ ; vide = épisode 1 (output/video/). ZV_SLUG : slug de l'épisode (défaut : épisode 1).
const EP = process.env.ZV_EP || '';
const SLUG = process.env.ZV_SLUG || 'la-bille-n-a-pas-de-memoire';
const data = path.join(root, 'output', 'video', EP, 'data');
const timing = loadTiming(path.join(data, 'timing.json'));
const dir = JSON.parse(readFileSync(path.join(data, 'direction.json'), 'utf8'));
const r3 = (n) => Math.round(n * 1000) / 1000;
const total = timing.total;

const starts = dir.shots.map((s) => resolve(timing, s.from));
const shots = dir.shots.map((s, i) => {
  const start = i === 0 ? 0 : starts[i];
  const end = i + 1 < dir.shots.length ? starts[i + 1] : total;
  if (i + 1 < dir.shots.length) {
    const declared = resolve(timing, s.to);
    if (Math.abs(declared - end) > 0.35) console.warn(`avertissement : ${s.id} déclare finir à ${declared.toFixed(2)} s mais le plan suivant commence à ${end.toFixed(2)} s`);
  }
  const dur = end - start;
  const beats = (s.beats || [])
    .map(({ at, ...rest }) => ({ t: r3(Math.min(Math.max(resolve(timing, at) - start, 0), dur)), ...rest }))
    .sort((a, b) => a.t - b.t);
  return { id: s.id, component: s.component, props: s.props || {}, start: r3(start), end: r3(end), dur: r3(dur), in: s.in || 'cut', out: s.out || 'cut', captions: s.captions !== false, beats, notes: s.notes || '' };
});

const sentences = [];
const sections = [];
for (const sec of timing.sections) {
  sections.push({ index: sec.index, start: r3(sec.start), end: r3(sec.end) });
  for (const p of sec.paragraphs) for (const st of p.sentences) sentences.push({ s: sec.index, p: p.index, start: r3(st.start), end: r3(st.end), words: st.words.map((w) => ({ w: w.w, start: r3(w.start), end: r3(w.end) })) });
}
const out = { video: dir.video, total: r3(total), lead_in: timing.lead_in, tail: timing.tail, sections, shots, sentences, captions: dir.captions, transitions: dir.transitions };
writeFileSync(path.join(data, 'timeline.json'), JSON.stringify(out));
// Copie compacte, COMMITÉE : la page de l'épisode (lecteur « motion ») la charge. On retire seulement ce que le rendu n'utilise pas (les notes de réalisation).
const SITE_TIMELINE = path.join(root, 'assets', 'podcast', `${SLUG}.timeline.json`);
const compact = { ...out, shots: out.shots.map(({ notes, ...s }) => s) };
mkdirSync(path.dirname(SITE_TIMELINE), { recursive: true });
writeFileSync(SITE_TIMELINE, JSON.stringify(compact));
console.log(`copie du site : ${path.relative(root, SITE_TIMELINE)} (${(JSON.stringify(compact).length / 1024).toFixed(1)} Ko)`);
const d = shots.map((s) => s.dur);
console.log(`${shots.length} plans, ${sentences.length} phrases, durée ${total.toFixed(2)} s ; plan le plus court ${Math.min(...d).toFixed(2)} s, le plus long ${Math.max(...d).toFixed(2)} s`);
