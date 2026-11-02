#!/usr/bin/env node
// Version verticale TikTok (1080×1920, 30 i/s, 9:16) de l'épisode 1 : rend composition/tiktok.html puis assemble avec le MÊME mixage que la version 16:9.
//   node tools/video/render-tiktok.mjs [--workers 6] [--from 0] [--to <s>] [--scale 1] [--no-mux] [--out output/video/video-silent-tiktok.mp4] [autres options de render.mjs]
// 1) render.mjs --page /tools/video/composition/tiktok.html --width 1080 --height 1920 --crf 18 --profile high → output/video/video-silent-tiktok.mp4
// 2) ffmpeg -i video-silent-tiktok.mp4 -i audio-mix.m4a -map 0:v -map 1:a -c:v copy -c:a copy -movflags +faststart → output/video/zero-vert-episode-1-tiktok.mp4
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(DIR, '..', '..');
const EP = process.env.ZV_EP || '';
const EP_N = EP.replace(/\D/g, '') || '1';
const OUTV = path.join(ROOT, 'output/video', EP);
const args = process.argv.slice(2);
const noMux = args.includes('--no-mux');
const rest = args.filter((a) => a !== '--no-mux');
const has = (k) => rest.some((a) => a === `--${k}` || a.startsWith(`--${k}=`));
const silent = path.join(OUTV, 'video-silent-tiktok.mp4');
const renderArgs = [path.join(DIR, 'render.mjs'), '--page', '/tools/video/composition/tiktok.html', '--width', '1080', '--height', '1920', '--crf', '18', '--profile', 'high', '--port', '8805'];
if (!has('out')) renderArgs.push('--out', silent);
const run = (cmd, a) => new Promise((res, rej) => { const p = spawn(cmd, a, { stdio: 'inherit' }); p.on('close', (c) => (c === 0 ? res() : rej(new Error(`${cmd} a échoué (code ${c})`)))); });

const t0 = Date.now();
await run(process.execPath, [...renderArgs, ...rest]);
console.error(`rendu : ${((Date.now() - t0) / 1000).toFixed(0)} s`);
if (!noMux && !has('from') && !has('to') && !has('out') && !has('scale')) {
  const ff = path.join(os.homedir(), '.local/ffmpeg-6.0/ffmpeg');
  await run(ff, ['-y', '-hide_banner', '-loglevel', 'error', '-i', silent, '-i', path.join(OUTV, 'audio-mix.m4a'), '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'copy', '-movflags', '+faststart', path.join(OUTV, `zero-vert-episode-${EP_N}-tiktok.mp4`)]);
  console.error(`assemblé : ${path.join(OUTV, `zero-vert-episode-${EP_N}-tiktok.mp4`)}`);
}
