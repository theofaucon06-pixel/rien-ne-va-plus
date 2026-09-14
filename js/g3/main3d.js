// 3D first-person client. Story logic lives in ../story.js; the level in level.js.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ROOMS, roomAt } from '../world.js';
import { ui } from '../ui.js';
import { audio } from '../audio.js';
import { createStory } from '../story.js';
import { buildLevel, S } from './level.js';
import { buildActors, updateActors } from './actors.js';
import { Player, EYE } from './player.js';

// ------------------------------------------------------------------ renderer
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060f);
scene.fog = new THREE.FogExp2(0x07080f, 0.035);
const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 500);
const hemi = new THREE.HemisphereLight(0x8fa3c8, 0x3a2a1c, 0.9); scene.add(hemi);
const amb = new THREE.AmbientLight(0x4a4a5a, 0.8); scene.add(amb);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.55, 0.45, 0.82);
composer.addPass(bloom);
composer.addPass(new OutputPass());
window.addEventListener('resize', () => { renderer.setSize(window.innerWidth, window.innerHeight); composer.setSize(window.innerWidth, window.innerHeight); camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); });

// ------------------------------------------------------------------ story + level
const player = new Player(camera, document.body);
const story = createStory({
  onTeleport: (px, py, facing) => { player.setPosition(px * S, py * S, { up: Math.PI, down: 0, left: Math.PI / 2, right: -Math.PI / 2 }[facing] ?? 0); },
  onEntered: () => {},
  onVipOpen: () => { if (L.dynamic.vipRope) L.dynamic.vipRope.visible = false; if (L.dynamic.vipCollider) L.dynamic.vipCollider.disabled = true; if (L.dynamic.vipHit) { L.dynamic.vipHit.userData = {}; L.hits.splice(L.hits.indexOf(L.dynamic.vipHit), 1); } },
  onExited: () => { setDawn(true); if (L.dynamic.exitDoor) L.dynamic.exitDoor.material = new THREE.MeshStandardMaterial({ color: 0x7fd0ff, emissive: 0x3a90c0, emissiveIntensity: 0.5 }); },
  onLoaded: () => {}
});
const { state, interact, targetLabel, tick } = story;
const L = buildLevel(scene, state);
const actors = buildActors(scene, state, L);
player.colliders = L.colliders;
player.onStep = () => audio.step();
// restore geometry state after a load
function syncFromState() {
  player.setPosition(state.player.x * S, state.player.y * S, state.player.facing === 'up' ? Math.PI : state.player.facing === 'left' ? Math.PI / 2 : state.player.facing === 'down' ? 0 : -Math.PI / 2);
  player.colliders = L.colliders;
  if (state.flags.vipOpen) { if (L.dynamic.vipRope) L.dynamic.vipRope.visible = false; if (L.dynamic.vipCollider) L.dynamic.vipCollider.disabled = true; if (L.dynamic.vipHit && L.hits.includes(L.dynamic.vipHit)) { L.dynamic.vipHit.userData = {}; L.hits.splice(L.hits.indexOf(L.dynamic.vipHit), 1); } }
  if (state.flags.exited) setDawn(true);
}
player.setPosition(state.player.x * S, state.player.y * S, -Math.PI / 2);

// dawn after the exit
function setDawn(on) {
  const sky = L.sky.material.uniforms;
  sky.top.value.set(on ? '#2b3a66' : '#05060f'); sky.bottom.value.set(on ? '#f2a06a' : '#1a1626');
  hemi.color.set(on ? 0xffd9b0 : 0x8fa3c8); hemi.intensity = on ? 1.6 : 0.9;
  L.stars.visible = !on;
}

// ------------------------------------------------------------------ light pool
const POOL = 12;
const pool = []; for (let i = 0; i < POOL; i++) { const pl = new THREE.PointLight(0xffffff, 0, 10, 2); scene.add(pl); pool.push(pl); }
function updateLights() {
  const p = camera.position;
  const sorted = L.lightSpots.map(l => ({ l, d: (l.x - p.x) ** 2 + (l.z - p.z) ** 2 })).sort((a, b) => a.d - b.d).slice(0, POOL);
  for (let i = 0; i < POOL; i++) {
    const pl = pool[i], e = sorted[i];
    if (!e) { pl.intensity = 0; continue; }
    pl.position.set(e.l.x, e.l.y, e.l.z); pl.color.copy(e.l.color); pl.distance = e.l.distance; pl.intensity = e.l.intensity * (e.l.neon ? 0.85 + 0.15 * Math.sin(clock.elapsedTime * 6) : 1);
  }
}

// ------------------------------------------------------------------ input
window.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey) return;
  if (ui.isOpen()) {
    if (ui.top() === 'panel' && e.key === ' ') { const b = document.querySelector('#panel .p-body'); if (b && b._spin) { e.preventDefault(); b._spin(); return; } }
    if (ui.top() === 'panel' && (e.key === 'c' || e.key === 'C')) return;
    const used = ui.handleKey(e); if (used) e.preventDefault();
    return;
  }
  if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
  if (e.key === 'c' || e.key === 'C') { ui.toggleCodex(); player.unlock(); return; }
  if (['e', 'E', 'Enter', ' '].includes(e.key)) { if (hovered) { interact(hovered); } return; }
  player.keys.add(e.key);
});
window.addEventListener('keyup', (e) => player.keys.delete(e.key));
window.addEventListener('blur', () => player.keys.clear());
canvas.addEventListener('click', () => { if (!ui.isOpen() && state.started) { audio.ensure(); audio.resume(); if (player.locked && hovered) interact(hovered); else player.lock(); } });
const lockOverlay = document.getElementById('lock');
lockOverlay.addEventListener('click', () => { if (!ui.isOpen() && state.started) player.lock(); });
player.controls.addEventListener('lock', () => { lockOverlay.hidden = true; });
player.controls.addEventListener('unlock', () => { if (!ui.isOpen() && state.started) lockOverlay.hidden = false; });
// release the mouse when any UI layer opens; show the resume overlay when everything closes
let wasOpen = false;
function watchUI() {
  const open = ui.isOpen();
  if (open && !wasOpen) { player.unlock(); lockOverlay.hidden = true; }
  if (!open && wasOpen && state.started && !player.locked) lockOverlay.hidden = false;
  wasOpen = open;
}

// ------------------------------------------------------------------ interaction (crosshair raycast)
const ray = new THREE.Raycaster(); ray.far = 3.4;
let hovered = null; let rayTick = 0;
const crosshair = document.getElementById('crosshair');
function updateHover() {
  hovered = null;
  ray.setFromCamera({ x: 0, y: 0 }, camera);
  const hits = ray.intersectObjects(L.hits.concat(L.wallMeshes), false);
  if (hits.length) {
    const h = hits[0];
    if (h.object.userData.target) {
      const t = h.object.userData.target;
      if (!(t.kind === 'npc' && t.n.hidden)) hovered = t;
    }
  }
  ui.setPrompt(player.locked ? targetLabel(hovered) : null);
  crosshair.classList.toggle('on', !!hovered);
}

// ------------------------------------------------------------------ loop
const clock = new THREE.Clock();
let hudTick = 0, fogTarget = 0.035;
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.elapsedTime;
  const open = ui.isOpen();
  watchUI();
  const drunk = state.drunkUntil > state.timeMin && !state.flags.exited;
  player.update(dt, { enabled: !open && player.locked && state.started, drunk, t });
  // mirror position into the shared state (px units)
  state.player.x = camera.position.x / S; state.player.y = camera.position.z / S;
  state.player.moving = player.moving;
  tick(dt, open);
  // fog per room
  const r = roomAt(state.player.x, state.player.y);
  fogTarget = !r || r.outdoor ? (state.flags.exited ? 0.008 : 0.016) : r.id === 'machines' ? 0.05 : r.id === 'labyrinth' ? 0.06 : 0.032;
  scene.fog.density += (fogTarget - scene.fog.density) * 0.05;
  const fogCol = !r || r.outdoor ? (state.flags.exited ? 0x6b5570 : 0x07080f) : 0x07080f; scene.fog.color.setHex(fogCol);
  // zone: narrow the field of view a little
  const wantFov = document.body.classList.contains('zone') ? 60 : 72; if (Math.abs(camera.fov - wantFov) > 0.1) { camera.fov += (wantFov - camera.fov) * 0.05; camera.updateProjectionMatrix(); }
  bloom.strength = document.body.classList.contains('zone') ? 0.9 : 0.55;
  rayTick++; if (rayTick % 3 === 0 && !open) updateHover(); else if (open) { hovered = null; ui.setPrompt(null); }
  for (const u of L.updaters) u(t, dt);
  if (L.clock && Math.floor(t * 2) % 10 === 0) L.clock.update(state.timeMin);
  updateActors(actors, t, camera.position, hovered);
  updateLights();
  composer.render();
  hudTick += dt; if (hudTick > 0.25) { hudTick = 0; ui.updateHUD(state); }
}

story.boot(() => { syncFromState(); setTimeout(() => { if (!ui.isOpen()) lockOverlay.hidden = false; }, 300); });
frame();
window.__game = { renderer, state, ui, games: story.games, player, tp: (px, py) => player.setPosition(px * S, py * S), L, scene, camera, interact: () => interact(hovered) };
