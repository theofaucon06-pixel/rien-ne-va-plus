#!/usr/bin/env node
// Smoke test: drives the real game in headless Chrome and fails on the first console error.
//
//   node tools/smoke.mjs            # 3D then 2D, ~4 minutes (software WebGL)
//   node tools/smoke.mjs --only 2d  # or --only 3d
//   node tools/smoke.mjs --headed   # watch it run
//
// No dependency: Chrome is driven over the DevTools protocol with Node's own WebSocket (Node ≥ 22)
// or a tiny fallback client. Every step below teleports the player, interacts with something
// (every witness, every table, every special machine, every door…) and then closes whatever
// opened, exactly through the UI's own keyboard handlers. Any console.error, uncaught exception
// or failed assertion is reported with the step that caused it.
import { spawn, execSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import crypto from 'node:crypto';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const headed = args.includes('--headed');
const PORT = 8790;

// ---------------------------------------------------------------- minimal WebSocket client (fallback for Node < 22)
class MiniWS {
  constructor(url) {
    this.handlers = {}; this.buf = Buffer.alloc(0);
    const u = new URL(url);
    const key = crypto.randomBytes(16).toString('base64');
    const req = http.request({ host: u.hostname, port: u.port, path: u.pathname + u.search, headers: { Connection: 'Upgrade', Upgrade: 'websocket', 'Sec-WebSocket-Version': '13', 'Sec-WebSocket-Key': key } });
    req.on('upgrade', (res, socket) => { this.sock = socket; socket.on('data', d => this.onData(d)); socket.on('close', () => this.emit('close')); this.emit('open'); });
    req.on('error', e => this.emit('error', e));
    req.end();
  }
  on(ev, fn) { (this.handlers[ev] = this.handlers[ev] || []).push(fn); }
  emit(ev, ...a) { (this.handlers[ev] || []).forEach(f => f(...a)); }
  addEventListener(ev, fn) { this.on(ev, (d) => fn(ev === 'message' ? { data: d } : d)); }
  send(text) {
    const payload = Buffer.from(text); const len = payload.length; let header;
    if (len < 126) header = Buffer.from([0x81, 0x80 | len]);
    else if (len < 65536) { header = Buffer.alloc(4); header[0] = 0x81; header[1] = 0x80 | 126; header.writeUInt16BE(len, 2); }
    else { header = Buffer.alloc(10); header[0] = 0x81; header[1] = 0x80 | 127; header.writeBigUInt64BE(BigInt(len), 2); }
    const mask = crypto.randomBytes(4); const masked = Buffer.alloc(len); for (let i = 0; i < len; i++) masked[i] = payload[i] ^ mask[i % 4];
    this.sock.write(Buffer.concat([header, mask, masked]));
  }
  onData(d) {
    this.buf = Buffer.concat([this.buf, d]);
    for (;;) {
      if (this.buf.length < 2) return;
      const op = this.buf[0] & 0x0f; let len = this.buf[1] & 0x7f, off = 2;
      if (len === 126) { if (this.buf.length < 4) return; len = this.buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (this.buf.length < 10) return; len = Number(this.buf.readBigUInt64BE(2)); off = 10; }
      if (this.buf.length < off + len) return;
      const data = this.buf.subarray(off, off + len); this.buf = this.buf.subarray(off + len);
      if (op === 1) this.emit('message', data.toString());
      else if (op === 8) { this.emit('close'); return; }
    }
  }
  close() { this.sock && this.sock.end(); }
}

// ---------------------------------------------------------------- CDP
class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.listeners = []; ws.addEventListener('message', (m) => this.onMessage(typeof m.data === 'string' ? m.data : m.data.toString())); }
  static connect(url) {
    return new Promise((resolve, reject) => {
      const ws = typeof WebSocket !== 'undefined' ? new WebSocket(url) : new MiniWS(url);
      const done = () => resolve(new CDP(ws));
      if (ws.addEventListener) { ws.addEventListener('open', done); ws.addEventListener('error', reject); } else { ws.on('open', done); ws.on('error', reject); }
    });
  }
  onMessage(text) {
    const msg = JSON.parse(text);
    if (msg.id && this.pending.has(msg.id)) { const { resolve, reject } = this.pending.get(msg.id); this.pending.delete(msg.id); msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result); }
    else if (msg.method) this.listeners.forEach(l => l(msg));
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id; const msg = { id, method, params }; if (sessionId) msg.sessionId = sessionId;
    this.ws.send(JSON.stringify(msg));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
  on(fn) { this.listeners.push(fn); }
  close() { this.ws.close(); }
}

// ---------------------------------------------------------------- helpers
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
function findChrome() {
  const c = [process.env.CHROME, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean);
  for (const p of c) if (existsSync(p)) return p;
  try { return execSync('which google-chrome chromium chromium-browser 2>/dev/null | head -1').toString().trim() || null; } catch { return null; }
}
function waitForLoad(cdp, sid, ms = 20000) {
  return new Promise((resolve) => { const t = setTimeout(resolve, ms); cdp.on((msg) => { if (msg.method === 'Page.loadEventFired' && msg.sessionId === sid) { clearTimeout(t); resolve(); } }); });
}
async function waitForServer(url, ms = 8000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { await new Promise((res, rej) => http.get(url, r => { r.resume(); res(); }).on('error', rej)); return; } catch { await sleep(150); } }
  throw new Error('static server did not start');
}

// ---------------------------------------------------------------- the scenario, run inside the page
// Everything here executes in the browser; `g` is window.__game. Each step returns quickly and the
// harness attributes any console error to the step that was running.
const PAGE_HELPERS = `
  window.__smoke = (() => {
    const g = () => window.__game;
    const frames = (n = 2) => new Promise(r => { const f = () => (--n <= 0 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    const key = (k) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
    const ui = () => g().ui;
    async function closeAll(max = 40) {
      for (let i = 0; i < max && ui().isOpen(); i++) {
        const t = ui().top();
        if (t === 'dialog') {
          // Enter finishes the typewriter effect, then advances; a choice line takes the first answer
          const d = ui().dialog; const pick = () => { const line = d.lines[d.i]; if (line && line.choices && !d.typing) key('1'); else key('Enter'); };
          pick(); await wait(25); if (ui().top() === 'dialog') pick();
        }
        else if (t === 'panel') { const b = document.querySelector('#panel .p-close'); if (b) b.click(); else key('Escape'); }
        else if (t === 'modal') key('Enter');
        else if (t === 'codex') ui().closeCodex();
        else if (t === 'intro') key('Enter');
        else if (t === 'epilogue') return 'epilogue';
        await wait(30); await frames(1);
      }
      return ui().isOpen() ? 'still open: ' + ui().top() : 'closed';
    }
    async function go(x, y, lookX, lookY) {
      g().tp(x, y); g().state.player.x = x; g().state.player.y = y;
      if (g().camera && lookX !== undefined) g().camera.lookAt(lookX / 40, 1.3, lookY / 40);
      await frames(3);
    }
    async function clickButtons(sel, n = 4, pause = 400) {
      let clicked = 0;
      for (let i = 0; i < n; i++) {
        const btns = [...document.querySelectorAll(sel + ' button')].filter(b => !b.disabled && !b.classList.contains('p-close') && !/quitter|fermer/i.test(b.textContent));
        if (!btns.length || !ui().isOpen() || ui().top() !== 'panel') break;
        btns[i % btns.length].click(); clicked++;
        await wait(pause); await frames(2);
      }
      return clicked;
    }
    return { frames, wait, key, closeAll, go, clickButtons };
  })();
`;

async function run3D(cdp, sid, errors, report) {
  const ev = async (expr) => { const r = await cdp.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }, sid); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
  const step = async (name, expr) => {
    const before = errors.length, t0 = Date.now();
    let value, err = null;
    try { value = await ev(`(async () => { ${expr} })()`); } catch (e) { err = e.message; }
    const errs = errors.slice(before);
    report.push({ name, value, err, errs });
    const mark = err || errs.length ? '✗' : '✓';
    console.log(`  ${mark} ${name} (${((Date.now() - t0) / 1000).toFixed(1)} s)${value !== undefined ? ' — ' + JSON.stringify(value).slice(0, 110) : ''}${err ? '\n      ' + err : ''}${errs.map(e => '\n      ' + e).join('')}`);
  };

  await cdp.send('Page.navigate', { url: `http://localhost:${PORT}/?smoke=1` }, sid);
  await step('chargement', `
    const t0 = performance.now();
    while (!window.__game && performance.now() - t0 < 30000) await new Promise(r => setTimeout(r, 100));
    if (!window.__game) throw new Error('window.__game absent après 30 s');
    ${PAGE_HELPERS}
    return { ms: Math.round(performance.now() - t0), tier: window.__game.quality && window.__game.quality.tier };`);
  await step('intro → soirée', `
    const S = window.__smoke, g = window.__game;
    localStorage.removeItem('rnvp-save');
    document.querySelector('#btn-start').click(); await S.wait(900);
    for (let i = 0; i < 6 && !g.state.started; i++) { S.key('Enter'); await S.wait(250); }
    await S.closeAll();
    if (!g.state.started) throw new Error('la soirée ne démarre pas');
    return { started: g.state.started, money: g.state.money };`);
  await step('rendu', `
    const g = window.__game; const r = g.renderOnce(); if (!r.calls) throw new Error('aucun draw call');
    const c = document.getElementById('game'); const gl = c.getContext('webgl2'); if (!gl) throw new Error('pas de WebGL2');
    return r;`);
  await step('toutes les pièces', `
    const S = window.__smoke, g = window.__game; const W = await import('/js/world.js');
    const seen = [];
    for (const r of W.ROOMS) { const cx = r.x + r.w / 2, cy = r.y + r.h / 2; await S.go(cx, cy, cx, cy - 100); const at = W.roomAt(g.state.player.x, g.state.player.y); if (!at || at.id !== r.id) throw new Error('roomAt(' + r.id + ') = ' + (at && at.id)); const rr = g.renderOnce(); if (!rr.calls) throw new Error('rien dessiné dans ' + r.id); seen.push(r.id + ':' + rr.calls); }
    await S.closeAll();
    return seen.join(' ');`);
  await step('tous les objets', `
    const S = window.__smoke, g = window.__game; const W = await import('/js/world.js');
    g.state.chips = 200; g.state.money = 500;
    const done = [];
    for (const o of W.OBJECTS) {
      if (!o.label || o.type === 'exitdoor' || o.type === 'busstop') continue;
      await S.go(o.x + o.w / 2, o.y + o.h + 40, o.x + o.w / 2, o.y);
      g.interactTarget({ kind: 'object', o }); await S.wait(300); await S.frames(3);
      if (ui_top() === 'panel') await S.clickButtons('#panel', 3, 350);
      const c = await S.closeAll(); if (c !== 'closed') throw new Error(o.id + ': ' + c);
      done.push(o.id);
    }
    function ui_top() { return g.ui.top(); }
    return done.length + ' objets: ' + done.join(',');`);
  await step('les jeux (mises réelles)', `
    const S = window.__smoke, g = window.__game; const W = await import('/js/world.js');
    const play = async (id, presses) => {
      const o = W.OBJECTS.find(x => x.id === id); g.state.chips = 300; g.state.money = 500;
      await S.go(o.x + o.w / 2, o.y + o.h + 40, o.x + o.w / 2, o.y);
      g.interactTarget({ kind: 'object', o }); await S.wait(300); await S.frames(2);
      if (g.ui.top() !== 'panel') throw new Error(id + ': pas de panneau (' + g.ui.top() + ')');
      let n = 0;
      for (const p of presses) { const b = [...document.querySelectorAll('#panel button')].find(b => p.test(b.textContent)); if (b && !b.disabled) { b.click(); n++; } await S.wait(p === presses[presses.length - 1] ? 3500 : 700); await S.frames(2); if (g.ui.top() !== 'panel') break; }
      await S.closeAll(); return id + ':' + n;
    };
    const out = [];
    out.push(await play('roulette', [/rouge/i, /lancer/i]));
    out.push(await play('bj1', [/miser|jouer|distribuer/i, /tirer/i, /rester/i]));
    out.push(await play('baccarat', [/joueur|banque/i, /distribuer|jouer|lancer/i]));
    out.push(await play('wheel', [/1|2/, /tourner|lancer/i]));
    out.push(await play('caisse', [/50|20/]));
    out.push(await play('atm', [/retirer|50|100/i]));
    await S.closeAll();
    return out.join(' ');`);
  await step('les machines spéciales et quelques autres', `
    const S = window.__smoke, g = window.__game; const W = await import('/js/world.js');
    const list = W.SLOTS.filter(s => s.special).concat([W.SLOTS[5], W.SLOTS[40], W.SLOTS[W.SLOTS.length - 1]]);
    const out = [];
    for (const s of list) {
      const seat = W.slotSeat(s); g.state.chips = 100;
      await S.go(seat.x, seat.y, s.x + s.w / 2, s.y + s.h / 2);
      g.interactTarget({ kind: 'slot', s }); await S.wait(250); await S.frames(2);
      if (g.ui.top() !== 'panel') throw new Error(s.label + ': pas de panneau');
      for (let i = 0; i < 2; i++) { const b = document.querySelector('#panel .p-body'); if (b && b._spin) b._spin(); await S.wait(900); }
      await S.closeAll(); out.push(s.label);
    }
    return out.join(', ');`);
  await step('tous les personnages', `
    const S = window.__smoke, g = window.__game;
    const out = [];
    for (const n of g.state.npcs) {
      if (n.hidden || !(n.r || n.witness || n.kind === 'staff')) continue;
      if (n.kind === 'patron' && !n.witness) continue;
      await S.go(n.x, n.y + 50, n.x, n.y);
      g.interactTarget({ kind: 'npc', n }); await S.wait(250); await S.frames(2);
      const c = await S.closeAll(); if (c !== 'closed') throw new Error(n.id + ': ' + c);
      out.push(n.id);
      // second visit: the "more" lines and the ask menu
      g.interactTarget({ kind: 'npc', n }); await S.wait(200); await S.closeAll();
    }
    return out.length + ' personnages: ' + out.join(',');`);
  await step('carnet + sources', `
    const S = window.__smoke, g = window.__game;
    g.ui.openCodex('sources'); await S.frames(2);
    const n = document.querySelectorAll('#codex .src').length; if (n < 20) throw new Error('sources incomplètes: ' + n);
    g.ui.closeCodex(); await S.frames(2);
    return n + ' blocs de sources';`);
  await step('salon VIP, bureau, sortie, arrêt de bus', `
    const S = window.__smoke, g = window.__game; const W = await import('/js/world.js');
    g.state.flags.vipOpen = true; g.state.chips = 100;
    const board = W.OBJECTS.find(o => o.id === 'board'); await S.go(2220, 1700, 2220, 1634); g.interactTarget({ kind: 'object', o: board }); await S.wait(300); await S.closeAll();
    const door = W.OBJECTS.find(o => o.id === 'exitdoor'); await S.go(230, 1880, 176, 1880); g.interactTarget({ kind: 'object', o: door }); await S.wait(400); await S.closeAll(60);
    const bus = W.OBJECTS.find(o => o.id === 'busstop'); await S.go(330, 200, 307, 126); g.interactTarget({ kind: 'object', o: bus }); await S.wait(500);
    for (let i = 0; i < 40 && g.ui.isOpen() && g.ui.top() !== 'epilogue'; i++) { await S.closeAll(5); await S.wait(100); }
    return { exited: g.state.flags.exited, top: g.ui.top(), money: g.state.money };`);
  await step('épilogue → recommencer', `
    const g = window.__game;
    const b = document.querySelector('#epi-restart'); if (!b) throw new Error("pas d'épilogue affiché (" + g.ui.top() + ')');
    window.__reloading = true; setTimeout(() => b.click(), 50);
    return 'clic';`);
  await waitForLoad(cdp, sid);
  await step('rechargement après la nuit', `
    const t0 = performance.now();
    if (window.__reloading) throw new Error('la page ne recharge pas');
    while (!window.__game && performance.now() - t0 < 30000) await new Promise(r => setTimeout(r, 100));
    if (!window.__game) throw new Error('jeu absent après rechargement');
    return { continueButton: !document.querySelector('#btn-continue').hidden };`);
}

async function run2D(cdp, sid, errors, report) {
  const ev = async (expr) => { const r = await cdp.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }, sid); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
  const step = async (name, expr) => {
    const before = errors.length, t0 = Date.now(); let value, err = null;
    try { value = await ev(`(async () => { ${expr} })()`); } catch (e) { err = e.message; }
    const errs = errors.slice(before); report.push({ name: '2D · ' + name, value, err, errs });
    console.log(`  ${err || errs.length ? '✗' : '✓'} ${name} (${((Date.now() - t0) / 1000).toFixed(1)} s)${value !== undefined ? ' — ' + JSON.stringify(value).slice(0, 110) : ''}${err ? '\n      ' + err : ''}${errs.map(e => '\n      ' + e).join('')}`);
  };
  await cdp.send('Page.navigate', { url: `http://localhost:${PORT}/classic.html?smoke=1` }, sid);
  await step('chargement', `
    const t0 = performance.now(); while (!window.__game && performance.now() - t0 < 20000) await new Promise(r => setTimeout(r, 100));
    if (!window.__game) throw new Error('window.__game absent'); ${PAGE_HELPERS} return Math.round(performance.now() - t0) + ' ms';`);
  await step('intro → soirée', `
    const S = window.__smoke, g = window.__game; localStorage.removeItem('rnvp-save');
    document.querySelector('#btn-start').click(); await S.wait(900);
    for (let i = 0; i < 6 && !g.state.started; i++) { S.key('Enter'); await S.wait(250); }
    await S.closeAll(); if (!g.state.started) throw new Error('la soirée ne démarre pas'); return g.state.started;`);
  await step('pièces, un objet par pièce, machines orientées', `
    const S = window.__smoke, g = window.__game; const W = await import('/js/world.js');
    for (const r of W.ROOMS) { await S.go(r.x + r.w / 2, r.y + r.h / 2); const at = W.roomAt(g.state.player.x, g.state.player.y); if (!at || at.id !== r.id) throw new Error('roomAt ' + r.id); }
    g.state.chips = 100;
    for (const s of W.SLOTS.filter(s => s.special).concat([W.SLOTS[20], W.SLOTS[W.SLOTS.length - 1]])) { const seat = W.slotSeat(s); await S.go(seat.x, seat.y); g.interact(); await S.wait(200); if (g.ui.top() !== 'panel') throw new Error(s.label + ': la cible 2D ne trouve pas la machine'); await S.closeAll(); }
    for (const id of ['roulette', 'bj1', 'caisse', 'bar', 'phone', 'wheel']) { const o = W.OBJECTS.find(x => x.id === id); await S.go(o.x + o.w / 2, o.y + o.h + 30); g.interactTarget({ kind: 'object', o }); await S.wait(250); await S.closeAll(); }
    for (const id of ['vigile', 'wells', 'mollie', 'hote', 'nour']) { const n = g.state.npcs.find(x => x.id === id); await S.go(n.x, n.y + 40); g.interactTarget({ kind: 'npc', n }); await S.wait(250); await S.closeAll(); }
    return 'ok';`);
}

// ---------------------------------------------------------------- main
(async () => {
  const chrome = findChrome();
  if (!chrome) { console.error('Chrome introuvable (définis CHROME=/chemin/vers/chrome)'); process.exit(2); }
  const server = spawn('node', [join(root, 'serve.js')], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
  const profile = mkdtempSync(join(tmpdir(), 'rnvp-smoke-'));
  const flags = [headed ? null : '--headless=new', `--remote-debugging-port=0`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--window-size=960,600', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', '--disable-features=Translate', 'about:blank'].filter(Boolean);
  const browser = spawn(chrome, flags, { stdio: ['ignore', 'ignore', 'pipe'] });
  let wsUrl = null; let stderr = '';
  browser.stderr.on('data', (d) => { stderr += d; const m = stderr.match(/DevTools listening on (ws:\/\/\S+)/); if (m) wsUrl = m[1]; });
  const cleanup = () => { try { browser.kill(); } catch {} try { server.kill(); } catch {} try { rmSync(profile, { recursive: true, force: true }); } catch {} };
  process.on('exit', cleanup); process.on('SIGINT', () => { cleanup(); process.exit(130); });
  try {
    await waitForServer(`http://localhost:${PORT}/`);
    const t0 = Date.now(); while (!wsUrl && Date.now() - t0 < 15000) await sleep(100);
    if (!wsUrl) throw new Error('Chrome ne répond pas:\n' + stderr.slice(-800));
    const cdp = await CDP.connect(wsUrl);
    const { targetInfos } = await cdp.send('Target.getTargets');
    const page = targetInfos.find(t => t.type === 'page');
    const { sessionId: sid } = await cdp.send('Target.attachToTarget', { targetId: page.targetId, flatten: true });
    await cdp.send('Page.enable', {}, sid); await cdp.send('Runtime.enable', {}, sid); await cdp.send('Log.enable', {}, sid);
    const errors = [];
    const noise = /pointer lock|PointerLock|requestPointerLock|AudioContext was not allowed|favicon|GPU stall|SwiftShader|WebGL: too many errors|Automatic fallback to software WebGL/i;
    const push = (s) => { if (!noise.test(s)) errors.push(s); };
    cdp.on((msg) => {
      if (msg.method === 'Runtime.exceptionThrown') push('exception: ' + (msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text).split('\n')[0]);
      else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') push('console.error: ' + msg.params.args.map(a => a.value ?? a.description ?? '').join(' ').split('\n')[0]);
      else if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') push('log: ' + msg.params.entry.text.split('\n')[0]);
    });
    const report = [];
    if (only !== '2d') { console.log('3D — index.html'); await run3D(cdp, sid, errors, report); }
    if (only !== '3d') { console.log('2D — classic.html'); await run2D(cdp, sid, errors, report); }
    cdp.close();
    const failed = report.filter(r => r.err || r.errs.length);
    console.log(`\n${report.length - failed.length}/${report.length} étapes propres` + (failed.length ? ` — ${failed.length} en échec : ${failed.map(f => f.name).join(', ')}` : ' — aucune erreur console.'));
    cleanup();
    process.exit(failed.length ? 1 : 0);
  } catch (e) {
    console.error('smoke: ' + e.message);
    cleanup();
    process.exit(2);
  }
})();
