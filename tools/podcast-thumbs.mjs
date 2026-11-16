#!/usr/bin/env node
// Rend les miniatures du podcast (brand/miniature.html) en PNG avec Chrome headless, dans brand/miniatures/.
//   node tools/podcast-thumbs.mjs [--only cover|yt|tiktok|ep]
//   - cover-3000.png            couverture carrée 3000×3000 (annuaires de podcasts)
//   - saison-1-youtube.png      miniature générique 1280×720
//   - saison-1-tiktok.png       visuel vertical 1080×1920
//   - episode-NN-youtube.png    une miniature 1280×720 par épisode (00 = bande-annonce)
// Prérequis : Google Chrome, ffmpeg (~/.local/ffmpeg-6.0/ffmpeg) pour rogner la barre du bas que Chrome ajoute en capture headless.
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'brand', 'miniatures');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FFMPEG = path.join(homedir(), '.local/ffmpeg-6.0/ffmpeg');
const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.json': 'application/json' };

const server = createServer(async (req, res) => {
  try {
    const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const f = path.join(ROOT, u);
    if (!f.startsWith(ROOT)) throw new Error('hors racine');
    const data = await readFile(f);
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404); res.end('404'); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
mkdirSync(OUT, { recursive: true });

const jobs = [];
if (!only || only === 'cover') jobs.push({ q: 'fmt=cover', w: 3000, h: 3000, file: 'cover-3000.png' });
if (!only || only === 'yt') jobs.push({ q: 'fmt=yt', w: 1280, h: 720, file: 'saison-1-youtube.png' });
if (!only || only === 'tiktok') jobs.push({ q: 'fmt=tiktok', w: 1080, h: 1920, file: 'saison-1-tiktok.png' });
if (!only || only === 'ep') for (let n = 0; n <= 9; n++) jobs.push({ q: `fmt=yt&ep=${n}`, w: 1280, h: 720, file: `episode-${String(n).padStart(2, '0')}-youtube.png` });

const run = (cmd, args) => new Promise((res, rej) => { const p = spawn(cmd, args, { stdio: 'ignore' }); p.on('close', (c) => (c === 0 ? res() : rej(new Error(`${path.basename(cmd)} code ${c}`)))); });
for (const j of jobs) {
  const raw = path.join(tmpdir(), `zv-thumb-${process.pid}-${j.file}`);
  // Chrome rogne le bas de la capture headless : fenêtre plus haute de 120 px, puis on recoupe au bon format
  await run(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', `--window-size=${j.w},${j.h + 120}`, '--virtual-time-budget=6000', `--screenshot=${raw}`, `http://127.0.0.1:${port}/brand/miniature.html?${j.q}`]);
  await run(FFMPEG, ['-y', '-v', 'error', '-i', raw, '-vf', `crop=${j.w}:${j.h}:0:0`, path.join(OUT, j.file)]);
  rmSync(raw, { force: true });
  console.log('✔', path.relative(ROOT, path.join(OUT, j.file)));
}
server.close();
