// 2D (top-down) client: input, collision, camera, interaction targets. Story logic lives in story.js.
import { WORLD, WALLS, SLOTS, OBJECTS, rectsOverlap, slotSeat } from './world.js';
import { Renderer } from './render.js';
import { ui } from './ui.js';
import { createStory } from './story.js';

const canvas = document.getElementById('game');
const renderer = new Renderer(canvas);
const story = createStory({
  onTeleport: () => renderer.updateCamera(state.player, 0, true),
  onLoaded: () => renderer.updateCamera(state.player, 0, true)
});
const { state, interact, targetLabel, tick } = story;

// --------------------------------------------------------------------- input
const keys = new Set();
const MOVE = { up: ['ArrowUp', 'w', 'W', 'z', 'Z'], down: ['ArrowDown', 's', 'S'], left: ['ArrowLeft', 'a', 'A', 'q', 'Q'], right: ['ArrowRight', 'd', 'D'] };
window.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey) return;
  if (ui.isOpen()) {
    if (ui.top() === 'panel' && e.key === ' ') { const b = document.querySelector('#panel .p-body'); if (b && b._spin) { e.preventDefault(); b._spin(); return; } }
    if (ui.top() === 'panel' && (e.key === 'c' || e.key === 'C')) return;
    const used = ui.handleKey(e);
    if (used) e.preventDefault();
    return;
  }
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
  if (e.key === 'c' || e.key === 'C') { ui.toggleCodex(); return; }
  if (['e', 'E', 'Enter', ' '].includes(e.key)) { interact(nearestTarget()); return; }
  keys.add(e.key);
});
window.addEventListener('keyup', (e) => keys.delete(e.key));
window.addEventListener('blur', () => keys.clear());
const down = (dir) => MOVE[dir].some(k => keys.has(k));

const pad = document.getElementById('pad');
if (pad) {
  pad.querySelectorAll('[data-k]').forEach(b => {
    const k = b.dataset.k;
    const on = (e) => { e.preventDefault(); if (k === 'E') interact(nearestTarget()); else keys.add(k); };
    const off = (e) => { e.preventDefault(); keys.delete(k); };
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
  });
}

// --------------------------------------------------------------------- collision
function solidObjects() {
  const arr = [];
  for (const o of OBJECTS) { if (!o.solid) continue; if (o.type === 'vipdoor' && state.flags.vipOpen) continue; arr.push(o); }
  for (const s of SLOTS) { if (s.rot === 'north') arr.push({ x: s.x, y: s.y - 6, w: s.w, h: s.h + 4 }); else if (s.rot) arr.push({ x: s.x, y: s.y + 8, w: s.w, h: s.h - 8 }); else arr.push({ x: s.x, y: s.y + 8, w: s.w, h: s.h + 10 }); }
  return arr;
}
function collides(box) {
  for (const w of WALLS) if (rectsOverlap(box, w)) return true;
  for (const o of solidObjects()) if (rectsOverlap(box, o)) return true;
  return false;
}
function playerBox(x, y) { return { x: x - 9, y: y - 2, w: 18, h: 12 }; }

// --------------------------------------------------------------------- interaction targets
function nearestTarget() {
  const p = state.player; let best = null, bd = 1e9;
  const consider = (t, cx, cy, r) => { const d = Math.hypot(p.x - cx, p.y - cy); if (d < r && d < bd) { bd = d; best = t; } };
  for (const o of OBJECTS) {
    if (!o.label) continue;
    if (o.type === 'vipdoor' && state.flags.vipOpen) continue;
    const cx = Math.max(o.x, Math.min(p.x, o.x + o.w)), cy = Math.max(o.y, Math.min(p.y, o.y + o.h));
    consider({ kind: 'object', o }, cx, cy, o.r || 60);
  }
  for (const s of SLOTS) if (s.kind) { const seat = slotSeat(s); consider({ kind: 'slot', s }, seat.x, seat.y, 52); }
  for (const n of state.npcs) { if (n.hidden || !n.r) continue; consider({ kind: 'npc', n }, n.x, n.y, n.r); }
  return best;
}

// --------------------------------------------------------------------- loop
let last = performance.now(), hudTick = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const p = state.player;
  const open = ui.isOpen();
  let dx = 0, dy = 0;
  if (!open) { if (down('up')) dy -= 1; if (down('down')) dy += 1; if (down('left')) dx -= 1; if (down('right')) dx += 1; }
  const drunk = state.drunkUntil > state.timeMin;
  if (dx || dy) {
    const len = Math.hypot(dx, dy); dx /= len; dy /= len;
    let sp = (keys.has('Shift') ? 330 : 215) * (drunk ? 0.85 : 1);
    if (drunk) { const w = Math.sin(now / 300) * 0.35; const ndx = dx * Math.cos(w) - dy * Math.sin(w); const ndy = dx * Math.sin(w) + dy * Math.cos(w); dx = ndx; dy = ndy; }
    const nx = p.x + dx * sp * dt, ny = p.y + dy * sp * dt;
    if (!collides(playerBox(nx, p.y))) p.x = nx;
    if (!collides(playerBox(p.x, ny))) p.y = ny;
    p.moving = true; p.walk += dt;
    p.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  } else p.moving = false;
  p.x = Math.max(4, Math.min(WORLD.w - 4, p.x)); p.y = Math.max(4, Math.min(WORLD.h - 4, p.y));

  tick(dt, open);

  const t = open ? null : nearestTarget();
  ui.setPrompt(targetLabel(t));
  for (const n of state.npcs) n.showName = !!(t && t.kind === 'npc' && t.n === n) || (Math.hypot(n.x - p.x, n.y - p.y) < 110 && n.kind === 'ghost');

  renderer.updateCamera(p, dt);
  renderer.draw(state, dt);
  hudTick += dt; if (hudTick > 0.25) { hudTick = 0; ui.updateHUD(state); }
  requestAnimationFrame(frame);
}

story.boot(() => renderer.updateCamera(state.player, 0, true));
requestAnimationFrame(frame);
window.__game = { state, tp: (x, y) => { state.player.x = x; state.player.y = y; renderer.updateCamera(state.player, 0, true); }, ui, games: story.games, interact: () => interact(nearestTarget()) };
