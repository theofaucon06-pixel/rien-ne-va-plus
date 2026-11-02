// Generates podcast/*.html and podcast/feed.xml from js/podcast-data.js.
//   node tools/build-podcast.mjs          write the files
//   node tools/build-podcast.mjs --check  fail if a generated file is missing or stale (used by npm test)
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAll } from './podcast-render.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
const files = buildAll();
const dir = path.join(root, 'podcast');

if (check) {
  const problems = [];
  for (const [rel, content] of files) {
    const abs = path.join(root, rel);
    if (!existsSync(abs)) problems.push(`manquant : ${rel}`);
    else if (readFileSync(abs, 'utf8') !== content) problems.push(`périmé : ${rel}`);
  }
  if (existsSync(dir))
    for (const f of readdirSync(dir)) if (!files.has(`podcast/${f}`)) problems.push(`orphelin : podcast/${f}`);
  if (problems.length) {
    console.error(problems.join('\n') + '\nLance : npm run podcast');
    process.exit(1);
  }
  console.log(`podcast à jour (${files.size} fichiers)`);
} else {
  mkdirSync(dir, { recursive: true });
  for (const f of readdirSync(dir)) if (!files.has(`podcast/${f}`)) rmSync(path.join(dir, f));
  for (const [rel, content] of files) writeFileSync(path.join(root, rel), content);
  console.log(`${files.size} fichiers écrits dans podcast/`);
}
