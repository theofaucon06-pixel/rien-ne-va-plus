#!/usr/bin/env node
// Rendu de la composition ZÉRO VERT : Chrome headless (CDP, sans dépendance) → ffmpeg → output/video/video-silent.mp4
//   node tools/video/render.mjs [--from 0] [--to <total>] [--workers 4] [--fps 30] [--scale 1] [--out output/video/video-silent.mp4]
//                               [--jpeg-quality 92] [--format jpeg|png] [--port 8801] [--crf 16] [--preset medium]
//                               [--mount /préfixe=/dossier] [--frame-dir dossier] [--query 'force=x&extra=/y.js'] [--serve]
//                               [--width 1920] [--height 1080] [--page /tools/video/composition/index.html] [--profile high]
// Version verticale TikTok : voir render-tiktok.mjs (--page tiktok.html --width 1080 --height 1920).
// Chaque image est une fonction pure de T (window.renderAt) : le résultat ne dépend pas du worker qui la produit.
// --serve : démarre seulement le serveur statique (racine = dépôt) pour la mise au point.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const HOME = os.homedir();
const EP = process.env.ZV_EP || ''; // épisode traité (dossier output/video/<EP>/), vide = épisode 1
const VIDEO_DIR = path.join(ROOT, 'output/video', EP);

/* ---------------------------------------------------------------- arguments */
const A = { from: 0, to: null, workers: Math.max(2, Math.min(8, os.cpus().length - 4)), fps: null, scale: 1, out: path.join(VIDEO_DIR, 'video-silent.mp4'),
  'jpeg-quality': 92, format: 'jpeg', port: 8801, crf: 16, preset: 'medium', mount: [], 'frame-dir': '', serve: false,
  ffmpeg: path.join(HOME, '.local/ffmpeg-6.0/ffmpeg'), chrome: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', page: '/tools/video/composition/index.html', query: '', quiet: false, width: 1920, height: 1080, profile: '' };
{
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const m = /^--([\w-]+)(?:=(.*))?$/.exec(argv[i]);
    if (!m) { console.error(`argument inconnu : ${argv[i]}`); process.exit(2); }
    const k = m[1];
    if (!(k in A)) { console.error(`option inconnue : --${k}`); process.exit(2); }
    if (typeof A[k] === 'boolean') { A[k] = m[2] === undefined ? true : m[2] !== 'false'; continue; }
    const v = m[2] !== undefined ? m[2] : argv[++i];
    if (v === undefined) { console.error(`--${k} attend une valeur`); process.exit(2); }
    if (k === 'mount') A.mount.push(v);
    else A[k] = typeof A[k] === 'number' || A[k] === null ? Number(v) : v;
  }
  A.out = path.resolve(A.out);
}

/* ---------------------------------------------------------------- serveur statique */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.woff2': 'font/woff2', '.woff': 'font/woff', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.mp4': 'video/mp4' };
function startServer() {
  const mounts = [['', ROOT], ...A.mount.map((m) => { const [p, d] = m.split('='); return [p.replace(/\/$/, ''), path.resolve(d)]; })].sort((a, b) => b[0].length - a[0].length);
  const server = http.createServer((req, res) => {
    try {
      const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      let file = null;
      for (const [prefix, dir] of mounts) {
        if (prefix && url !== prefix && !url.startsWith(prefix + '/')) continue;
        const f = path.resolve(dir, '.' + url.slice(prefix.length));
        if (f !== dir && !f.startsWith(dir + path.sep)) continue;
        if (fs.existsSync(f) && fs.statSync(f).isFile()) { file = f; break; }
      }
      if (!file) { res.writeHead(404); res.end('404'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(file).pipe(res);
    } catch (e) { res.writeHead(500); res.end(String(e)); }
  });
  return new Promise((resolve, reject) => {
    const tryListen = (port, fallback) => {
      server.once('error', (e) => { if (e.code === 'EADDRINUSE' && fallback) { console.error(`port ${port} occupé, port libre choisi`); tryListen(0, false); } else reject(e); });
      server.listen(port, '127.0.0.1', () => resolve({ server, port: server.address().port }));
    };
    tryListen(A.port, true);
  });
}

/* ---------------------------------------------------------------- CDP minimal */
class CDP {
  constructor(url) {
    this.id = 0; this.pending = new Map(); this.listeners = [];
    this.ws = new WebSocket(url);
    this.ready = new Promise((res, rej) => { this.ws.onopen = res; this.ws.onerror = () => rej(new Error('connexion CDP impossible')); });
    this.ws.onmessage = (ev) => {
      const m = JSON.parse(typeof ev.data === 'string' ? ev.data : Buffer.from(ev.data).toString());
      if (m.id !== undefined) { const p = this.pending.get(m.id); if (p) { this.pending.delete(m.id); m.error ? p.rej(new Error(`${p.method}: ${m.error.message}`)) : p.res(m.result); } }
      else for (const l of this.listeners) l(m);
    };
    this.ws.onclose = () => { for (const p of this.pending.values()) p.rej(new Error('connexion CDP fermée')); this.pending.clear(); };
  }
  send(method, params = {}, sessionId) {
    return new Promise((res, rej) => {
      const id = ++this.id; this.pending.set(id, { res, rej, method });
      this.ws.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }));
    });
  }
  close() { try { this.ws.close(); } catch {} }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function launchChrome() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zv-chrome-'));
  const args = [`--user-data-dir=${dir}`, '--remote-debugging-port=0', '--headless=new', '--hide-scrollbars', '--mute-audio', '--no-first-run', '--no-default-browser-check',
    '--force-device-scale-factor=1', `--window-size=${A.width},${A.height}`, '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
    '--disable-features=CalculateNativeWinOcclusion,Translate', '--disable-extensions', '--disable-sync', '--disable-component-update', '--autoplay-policy=no-user-gesture-required', 'about:blank'];
  const proc = spawn(A.chrome, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let errBuf = ''; proc.stderr.on('data', (d) => { errBuf = (errBuf + d).slice(-2000); });
  const portFile = path.join(dir, 'DevToolsActivePort');
  for (let i = 0; i < 150; i++) {
    if (proc.exitCode !== null) throw new Error(`Chrome s'est arrêté : ${errBuf}`);
    if (fs.existsSync(portFile)) { const [port, p] = fs.readFileSync(portFile, 'utf8').split('\n'); if (port && p) return { proc, dir, wsUrl: `ws://127.0.0.1:${port}${p}` }; }
    await sleep(100);
  }
  proc.kill(); throw new Error('Chrome ne répond pas');
}

/* ---------------------------------------------------------------- programme */
const state = { stopped: false, chrome: null, ff: null, cdp: null, server: null };
function cleanup() {
  try { state.cdp && state.cdp.close(); } catch {}
  if (state.chrome) { try { state.chrome.proc.kill('SIGKILL'); } catch {} try { fs.rmSync(state.chrome.dir, { recursive: true, force: true }); } catch {} }
  try { state.server && state.server.close(); } catch {}
}
async function main() {
  const { server, port } = await startServer();
  state.server = server;
  const base = `http://127.0.0.1:${port}`;
  if (A.serve) { console.log(`serveur statique : ${base}${A.page}  (Ctrl+C pour arrêter)`); return new Promise(() => {}); }

  const tl = JSON.parse(fs.readFileSync(path.join(VIDEO_DIR, 'data/timeline.json'), 'utf8'));
  const fps = A.fps || tl.video.fps || 30;
  const total = tl.total;
  const from = Math.max(0, A.from), to = Math.min(A.to == null ? total : A.to, total);
  const nFrames = Math.max(1, Math.round((to - from) * fps));
  const scale = A.scale;
  const VW = A.width, VH = A.height;
  const outW = Math.round(VW * scale / 2) * 2, outH = Math.round(VH * scale / 2) * 2;
  fs.mkdirSync(path.dirname(A.out), { recursive: true });
  if (A['frame-dir']) fs.mkdirSync(A['frame-dir'], { recursive: true });
  const png = A.format === 'png';
  const ext = png ? 'png' : 'jpg';

  // ffmpeg : les images arrivent dans l'ordre sur stdin
  const vf = (png ? 'scale=out_range=tv:out_color_matrix=bt709' : 'scale=in_range=pc:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709') + ',format=yuv420p';
  const ffArgs = ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', png ? 'png' : 'mjpeg', '-i', 'pipe:0', '-vf', vf,
    '-c:v', 'libx264', ...(A.profile ? ['-profile:v', A.profile] : []), '-preset', A.preset, '-crf', String(A.crf), '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', '-r', String(fps), '-movflags', '+faststart', A.out];
  const ff = spawn(A.ffmpeg, ffArgs, { stdio: ['pipe', 'ignore', 'pipe'] });
  state.ff = ff;
  let ffErr = ''; ff.stderr.on('data', (d) => { ffErr = (ffErr + d).slice(-3000); process.stderr.write(d); });
  const ffDone = new Promise((res) => ff.on('close', (code) => res(code)));
  let fatal = null;
  ff.stdin.on('error', (e) => { fatal = fatal || new Error(`ffmpeg : ${e.message}`); wake(); });
  ff.on('close', (code) => { if (code !== 0 && !state.stopped) { fatal = fatal || new Error(`ffmpeg a échoué (code ${code}) ${ffErr}`); wake(); } });

  state.chrome = await launchChrome();
  const cdp = new CDP(state.chrome.wsUrl); state.cdp = cdp; await cdp.ready;

  // pages
  const nW = Math.max(1, Math.min(A.workers, nFrames));
  const epQuery = [EP ? `tl=${encodeURIComponent(`/output/video/${EP}/data/timeline.json`)}` : '', process.env.ZV_SLUG ? `slug=${encodeURIComponent(process.env.ZV_SLUG)}` : ''].filter(Boolean).join('&');
  const userQuery = A.query ? (A.query[0] === '?' ? A.query.slice(1) : A.query) : '';
  const fullQuery = [userQuery, epQuery].filter(Boolean).join('&');
  const pageUrl = `${base}${A.page}${fullQuery ? '?' + fullQuery : ''}`;
  const pages = [];
  for (let i = 0; i < nW; i++) {
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank', width: VW, height: VH, newWindow: true });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    const send = (m, p) => cdp.send(m, p, sessionId);
    await send('Page.enable'); await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: VW, height: VH, deviceScaleFactor: 1, mobile: false });
    try { await send('Emulation.setFocusEmulationEnabled', { enabled: true }); } catch {}
    pages.push({ send, sessionId, targetId, id: i });
  }
  cdp.listeners.push((m) => {
    if (m.method === 'Runtime.exceptionThrown') console.error(`\n[page] exception : ${m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text}`);
    else if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error') && !A.quiet) console.error(`\n[page] ${m.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 400)}`);
    else if (m.method === 'Inspector.targetCrashed' || m.method === 'Target.targetCrashed') fatal = fatal || new Error('une page Chrome a planté');
  });
  await Promise.all(pages.map(async (pg) => {
    await pg.send('Page.navigate', { url: pageUrl });
    for (let i = 0; i < 1200; i++) {
      const r = await pg.send('Runtime.evaluate', { expression: 'window.__error || window.__ready === true', returnByValue: true });
      if (r.result.value === true) return;
      if (typeof r.result.value === 'string') throw new Error(`page ${pg.id} : ${r.result.value}`);
      await sleep(100);
    }
    throw new Error(`page ${pg.id} : délai dépassé (window.__ready)`);
  }));
  const info = (await pages[0].send('Runtime.evaluate', { expression: 'JSON.stringify(window.__info)', returnByValue: true })).result.value;
  console.error(`prêt : ${nFrames} images (${from.toFixed(2)} s → ${(from + nFrames / fps).toFixed(2)} s, ${fps} i/s, ${outW}×${outH}), ${nW} workers, ${info}`);

  /* ordonnancement : les workers prennent les images dans l'ordre, l'écriture vers ffmpeg est ordonnée */
  const shotParams = { format: png ? 'png' : 'jpeg', ...(png ? {} : { quality: A['jpeg-quality'] }), optimizeForSpeed: true, fromSurface: true, captureBeyondViewport: false };
  if (scale !== 1) shotParams.clip = { x: 0, y: 0, width: VW, height: VH, scale };
  let next = 0, writeIdx = 0, flushing = false, written = 0;
  const results = new Map(), waiters = [];
  const maxAhead = nW * 3;
  function wake() { while (waiters.length) waiters.shift()(); }
  const waitSignal = () => new Promise((r) => waiters.push(r));
  const t0 = Date.now(); let lastPrint = 0;
  function progress(force) {
    const now = Date.now();
    if (!force && now - lastPrint < (process.stderr.isTTY ? 400 : 5000)) return;
    lastPrint = now;
    const el = (now - t0) / 1000, rate = written / Math.max(el, 0.001), eta = rate > 0 ? (nFrames - written) / rate : 0;
    const fmt = (s) => `${Math.floor(s / 3600) ? Math.floor(s / 3600) + 'h' : ''}${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}m${String(Math.floor(s % 60)).padStart(2, '0')}s`;
    const line = `images ${written}/${nFrames} (${(100 * written / nFrames).toFixed(1)} %)  ${rate.toFixed(1)} i/s  écoulé ${fmt(el)}  reste ≈ ${fmt(eta)}`;
    process.stderr.write(process.stderr.isTTY ? `\r${line}   ` : line + '\n');
  }
  async function flush() {
    if (flushing) return; flushing = true;
    try {
      while (results.has(writeIdx) && !fatal) {
        const buf = results.get(writeIdx); results.delete(writeIdx);
        if (A['frame-dir']) fs.writeFileSync(path.join(A['frame-dir'], `f${String(writeIdx).padStart(6, '0')}.${ext}`), buf);
        writeIdx++; written++;
        if (!ff.stdin.write(buf)) await new Promise((r) => { const done = () => { ff.stdin.off('drain', done); ff.off('close', done); r(); }; ff.stdin.once('drain', done); ff.once('close', done); });
        wake(); progress(false);
      }
    } finally { flushing = false; }
  }
  async function grab(pg, k) {
    const T = from + k / fps;
    for (let attempt = 0; ; attempt++) {
      try {
        const ev = pg.send('Runtime.evaluate', { expression: `renderAt(${T.toFixed(6)})`, returnByValue: true });
        const shot = pg.send('Page.captureScreenshot', shotParams);
        const [r, s] = await Promise.all([ev, shot]);
        if (r.exceptionDetails) throw new Error(`renderAt(${T}) : ${r.exceptionDetails.exception?.description || r.exceptionDetails.text}`);
        return Buffer.from(s.data, 'base64');
      } catch (e) { if (attempt >= 2 || state.stopped) throw e; await sleep(200); }
    }
  }
  async function worker(pg) {
    while (!state.stopped && !fatal) {
      if (next >= nFrames) return;
      if (next - writeIdx >= maxAhead) { await waitSignal(); continue; }
      const k = next++;
      const buf = await grab(pg, k);
      results.set(k, buf); flush();
    }
  }
  try {
    await Promise.all(pages.map((pg) => worker(pg).catch((e) => { fatal = fatal || e; wake(); })));
    while (flushing || (results.has(writeIdx) && !fatal)) { await flush(); await sleep(5); }
  } finally { /* nettoyage plus bas */ }
  if (fatal) throw fatal;
  if (state.stopped) throw new Error('arrêté');
  progress(true); process.stderr.write('\n');
  ff.stdin.end();
  const code = await ffDone;
  if (code !== 0) throw new Error(`ffmpeg a échoué (code ${code})`);
  const secs = (Date.now() - t0) / 1000;
  const size = fs.statSync(A.out).size;
  console.error(`terminé : ${A.out} (${(size / 1e6).toFixed(1)} Mo) en ${secs.toFixed(1)} s : ${(nFrames / secs).toFixed(2)} i/s ; pour 14 800 images ≈ ${(14800 / (nFrames / secs) / 60).toFixed(1)} min`);
}

let exiting = false;
async function onSignal(sig) {
  if (exiting) process.exit(130);
  exiting = true; state.stopped = true;
  process.stderr.write(`\n${sig} : arrêt, finalisation du fichier partiel…\n`);
  try { state.ff && state.ff.stdin.end(); } catch {}
  cleanup();
  setTimeout(() => process.exit(130), 8000).unref();
  if (state.ff) await new Promise((r) => state.ff.on('close', r));
  process.exit(130);
}
process.on('SIGINT', () => onSignal('SIGINT'));
process.on('SIGTERM', () => onSignal('SIGTERM'));
process.on('exit', () => { try { state.chrome && state.chrome.proc.kill('SIGKILL'); } catch {} });

main().then(() => { cleanup(); process.exit(0); }).catch((e) => {
  if (exiting) return;   // arrêt demandé : onSignal finalise ffmpeg puis quitte
  console.error(`\nerreur : ${e.message || e}`);
  try { state.ff && state.ff.stdin.destroy(); state.ff && state.ff.kill('SIGKILL'); } catch {}
  cleanup(); process.exit(1);
});
