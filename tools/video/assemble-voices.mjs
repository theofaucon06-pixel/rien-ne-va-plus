#!/usr/bin/env node
// Assemble les prises de voix d'un épisode à plusieurs voix en un fichier par section, au format attendu par align.py :
//   output/video/ep<N>/assets/vo/s<S>.mp3 (S = 1..6), les tours de parole bout à bout avec un petit silence entre deux tours.
//   ZV_EP=ep5 node tools/video/assemble-voices.mjs [--gap 0.35]
// Les prises vivent dans output/video/ep<N>/assets/parts/ et sont décrites soit par `plan.json` ({ "1": ["theo-s1-t00.mp3", …], "2": […] }),
// soit, à défaut, déduites du texte de l'épisode (js/podcast-data.js : `p` = tours de parole, `v` = locuteurs) : <locuteur>-s<S>-t<TT>.mp3.
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const EP = process.env.ZV_EP;
if (!EP) { console.error('ZV_EP manquant (ex. ZV_EP=ep5)'); process.exit(2); }
const argv = process.argv.slice(2);
const gapArg = argv.indexOf('--gap');
const GAP = gapArg >= 0 ? Number(argv[gapArg + 1]) : 0.35;
const FF = path.join(homedir(), '.local/ffmpeg-6.0/ffmpeg');
const PARTS = path.join(ROOT, 'output/video', EP, 'assets/parts');
const OUT = path.join(ROOT, 'output/video', EP, 'assets/vo');
mkdirSync(OUT, { recursive: true });

let plan;
if (existsSync(path.join(PARTS, 'plan.json'))) plan = JSON.parse(readFileSync(path.join(PARTS, 'plan.json'), 'utf8'));
else {
  const { EPISODES } = await import(pathToFileURL(path.join(ROOT, 'js/podcast-data.js')).href);
  const ep = EPISODES.find((e) => e.slug === process.env.ZV_SLUG);
  if (!ep) { console.error(`épisode ${process.env.ZV_SLUG} introuvable (ZV_SLUG)`); process.exit(2); }
  plan = {};
  ep.sections.forEach((sec, i) => {
    if (!sec.v || sec.v.length !== sec.p.length) { console.error(`section ${i + 1} sans locuteurs (v)`); process.exit(2); }
    plan[i + 1] = sec.p.map((_, t) => `${sec.v[t]}-s${i + 1}-t${String(t).padStart(2, '0')}.mp3`);
  });
}
const missing = [];
for (const files of Object.values(plan)) for (const f of files) if (!existsSync(path.join(PARTS, f))) missing.push(f);
if (missing.length) { console.error(`prises manquantes (${missing.length}) :\n  ${missing.join('\n  ')}`); process.exit(1); }

const TMP = path.join(ROOT, 'output/video', EP, 'work/assemble');
rmSync(TMP, { recursive: true, force: true }); mkdirSync(TMP, { recursive: true });
for (const [s, files] of Object.entries(plan)) {
  const inputs = [], chain = [];
  files.forEach((f, i) => {
    inputs.push('-i', path.join(PARTS, f));
    chain.push(`[${i}:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=mono[a${i}]`);
    if (i < files.length - 1) chain.push(`aevalsrc=0:d=${GAP}:s=44100:c=mono[g${i}]`);
  });
  const order = files.map((_, i) => (i < files.length - 1 ? `[a${i}][g${i}]` : `[a${i}]`)).join('');
  const fc = `${chain.join(';')};${order}concat=n=${files.length * 2 - 1}:v=0:a=1[o]`;
  const out = path.join(OUT, `s${s}.mp3`);
  const r = spawnSync(FF, ['-y', '-hide_banner', '-loglevel', 'error', ...inputs, '-filter_complex', fc, '-map', '[o]', '-c:a', 'libmp3lame', '-b:a', '192k', out], { encoding: 'utf8' });
  if (r.status !== 0) { console.error(`échec section ${s} : ${r.stderr}`); process.exit(1); }
  const d = spawnSync(path.join(homedir(), '.local/ffmpeg-6.0/ffprobe'), ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out], { encoding: 'utf8' }).stdout.trim();
  console.log(`section ${s} : ${files.length} prises → ${path.relative(ROOT, out)} (${Number(d).toFixed(1)} s)`);
}
