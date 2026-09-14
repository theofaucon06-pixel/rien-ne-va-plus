// 3D first-person client. Story logic lives in ../story.js; the level in level.js.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { roomAt } from '../world.js';
import { ui } from '../ui.js';
import { audio } from '../audio.js';
import { createStory } from '../story.js';
import { buildLevel, S } from './level.js';
import { buildActors, updateActors } from './actors.js';
import { Player } from './player.js';

// ------------------------------------------------------------------ renderer
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060f);
scene.fog = new THREE.FogExp2(0x07080f, 0.035);
const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 500);
const hemi = new THREE.HemisphereLight(0x8fa3c8, 0x3a2a1c, 0.7); scene.add(hemi);
const amb = new THREE.AmbientLight(0x4a4a5a, 0.6); scene.add(amb);
// image-based lighting for metals, glass and marble
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

// post-processing: bloom, then a film pass (vignette, grain, warm grade)
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.42, 0.4, 0.9);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const film = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, vig: { value: 0.5 }, grain: { value: 0.035 }, zone: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float time, vig, grain, zone; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 d = vUv - 0.5; float r = length(d) * 1.15;
      float v = smoothstep(0.95, 0.35, r);
      c.rgb *= mix(1.0 - vig - zone * 0.35, 1.0, v);
      c.rgb += (hash(vUv * 1000.0 + fract(time)) - 0.5) * grain;
      c.rgb = mix(c.rgb, c.rgb * vec3(1.04, 0.99, 0.94), 0.55);
      float lum = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      c.rgb = mix(c.rgb, vec3(lum), zone * 0.35);
      gl_FragColor = c;
    }`
});
composer.addPass(film);
window.addEventListener('resize', () => { renderer.setSize(window.innerWidth, window.innerHeight); composer.setSize(window.innerWidth, window.innerHeight); camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); });

// ------------------------------------------------------------------ story + level
const player = new Player(camera, document.body);
const story = createStory({
  onTeleport: (px, py, facing) => { player.setPosition(px * S, py * S, { up: Math.PI, down: 0, left: Math.PI / 2, right: -Math.PI / 2 }[facing] ?? 0); },
  onEntered: () => {},
  onVipOpen: () => { if (L.dynamic.vipRope) L.dynamic.vipRope.visible = false; if (L.dynamic.vipCollider) L.dynamic.vipCollider.disabled = true; if (L.dynamic.vipHit) { L.dynamic.vipHit.userData = {}; const i = L.hits.indexOf(L.dynamic.vipHit); if (i >= 0) L.hits.splice(i, 1); } },
  onExited: () => { setDawn(true); if (L.dynamic.exitDoor) L.dynamic.exitDoor.material = new THREE.MeshStandardMaterial({ color: 0x7fd0ff, emissive: 0x3a90c0, emissiveIntensity: 0.5 }); },
  onLoaded: () => {}
});
const { state, interact, targetLabel, tick } = story;
const L = buildLevel(scene, state);
const actors = buildActors(scene, state, L);
player.colliders = L.colliders;
player.onStep = () => audio.step();
function syncFromState() {
  player.setPosition(state.player.x * S, state.player.y * S, state.player.facing === 'up' ? Math.PI : state.player.facing === 'left' ? Math.PI / 2 : state.player.facing === 'down' ? 0 : -Math.PI / 2);
  player.colliders = L.colliders;
  if (state.flags.vipOpen) { if (L.dynamic.vipRope) L.dynamic.vipRope.visible = false; if (L.dynamic.vipCollider) L.dynamic.vipCollider.disabled = true; if (L.dynamic.vipHit && L.hits.includes(L.dynamic.vipHit)) { L.dynamic.vipHit.userData = {}; L.hits.splice(L.hits.indexOf(L.dynamic.vipHit), 1); } }
  if (state.flags.exited) setDawn(true);
}
player.setPosition(state.player.x * S, state.player.y * S, -Math.PI / 2);

function setDawn(on) {
  const sky = L.sky.material.uniforms;
  sky.top.value.set(on ? '#2b3a66' : '#05060f'); sky.bottom.value.set(on ? '#f2a06a' : '#1a1626');
  hemi.color.set(on ? 0xffd9b0 : 0x8fa3c8); hemi.intensity = on ? 1.6 : 0.9;
  L.stars.visible = !on;
}

// ------------------------------------------------------------------ dust motes around the player
const DUST = 500;
const dustGeo = new THREE.BufferGeometry();
const dustPos = new Float32Array(DUST * 3); for (let i = 0; i < DUST; i++) { dustPos[i * 3] = (Math.random() - 0.5) * 16; dustPos[i * 3 + 1] = Math.random() * 3; dustPos[i * 3 + 2] = (Math.random() - 0.5) * 16; }
dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
const dustTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'); const grd = g.createRadialGradient(16, 16, 0, 16, 16, 16); grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = grd; g.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); })();
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xffe6c0, size: 0.06, map: dustTex, alphaMap: dustTex, transparent: true, opacity: 0.28, depthWrite: false, sizeAttenuation: true }));
scene.add(dust);
function updateDust(t, dt) {
  const p = camera.position; dust.position.set(Math.round(p.x / 4) * 4, 0, Math.round(p.z / 4) * 4);
  const a = dustGeo.attributes.position.array;
  for (let i = 0; i < DUST; i++) { a[i * 3 + 1] += Math.sin(t * 0.5 + i) * 0.0015 + 0.0008; if (a[i * 3 + 1] > 3) a[i * 3 + 1] = 0; a[i * 3] += Math.cos(t * 0.3 + i * 0.7) * 0.0012; }
  dustGeo.attributes.position.needsUpdate = true;
}

// ------------------------------------------------------------------ light pool
const POOL = 14;
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

// ------------------------------------------------------------------ input & pointer lock
const lockOverlay = document.getElementById('lock');
function tryLock() { if (!state.started || ui.isOpen() || player.locked) return; player.lock(); }
window.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey) return;
  if (ui.isOpen()) {
    if (ui.top() === 'panel' && e.key === ' ') { const b = document.querySelector('#panel .p-body'); if (b && b._spin) { e.preventDefault(); b._spin(); return; } }
    if (ui.top() === 'panel' && (e.key === 'c' || e.key === 'C')) return;
    const used = ui.handleKey(e); if (used) e.preventDefault();
    return;
  }
  if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
  if (e.key === 'c' || e.key === 'C') { ui.toggleCodex(); return; }
  if (['e', 'E', 'Enter', ' '].includes(e.key)) { if (hovered) interact(hovered); else if (!player.locked) tryLock(); return; }
  player.keys.add(e.key);
});
window.addEventListener('keyup', (e) => player.keys.delete(e.key));
window.addEventListener('blur', () => player.keys.clear());
canvas.addEventListener('click', () => { if (ui.isOpen() || !state.started) return; audio.ensure(); audio.resume(); if (player.locked) { if (hovered) interact(hovered); } else tryLock(); });
lockOverlay.addEventListener('click', tryLock);
player.controls.addEventListener('lock', () => { lockOverlay.hidden = true; });
player.controls.addEventListener('unlock', () => { setTimeout(() => { if (!ui.isOpen() && state.started && !player.locked) lockOverlay.hidden = false; }, 150); });
document.addEventListener('pointerlockerror', () => { if (!ui.isOpen() && state.started) lockOverlay.hidden = false; });
// menus release the mouse; closing the last menu grabs it back (still inside the user's click/keypress)
ui.onIdle = () => { if (state.started) { lockOverlay.hidden = true; tryLock(); } };
let wasOpen = false;
function watchUI() {
  const open = ui.isOpen();
  if (open && !wasOpen) { player.unlock(); lockOverlay.hidden = true; }
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
    if (h.object.userData.target) { const t = h.object.userData.target; if (!(t.kind === 'npc' && t.n.hidden)) hovered = t; }
  }
  ui.setPrompt(player.locked ? targetLabel(hovered) : null);
  crosshair.classList.toggle('on', !!hovered);
}

// ------------------------------------------------------------------ loop
const clock = new THREE.Clock();
let hudTick = 0, fogTarget = 0.035, boardLen = -1;
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.elapsedTime;
  const open = ui.isOpen();
  watchUI();
  const drunk = state.drunkUntil > state.timeMin && !state.flags.exited;
  player.update(dt, { enabled: !open && player.locked && state.started, drunk, t });
  state.player.x = camera.position.x / S; state.player.y = camera.position.z / S;
  state.player.moving = player.moving;
  tick(dt, open);
  const r = roomAt(state.player.x, state.player.y);
  fogTarget = !r || r.outdoor ? (state.flags.exited ? 0.008 : 0.016) : r.id === 'machines' ? 0.045 : r.id === 'labyrinth' ? 0.055 : 0.03;
  scene.fog.density += (fogTarget - scene.fog.density) * 0.05;
  scene.fog.color.setHex(!r || r.outdoor ? (state.flags.exited ? 0x6b5570 : 0x07080f) : 0x07080f);
  const zone = document.body.classList.contains('zone');
  const wantFov = zone ? 60 : 72; if (Math.abs(camera.fov - wantFov) > 0.1) { camera.fov += (wantFov - camera.fov) * 0.05; camera.updateProjectionMatrix(); }
  bloom.strength = zone ? 0.8 : 0.42;
  film.uniforms.time.value = t; film.uniforms.zone.value += ((zone ? 1 : 0) - film.uniforms.zone.value) * 0.05; film.uniforms.vig.value = drunk ? 0.7 : 0.5;
  rayTick++; if (rayTick % 3 === 0 && !open) updateHover(); else if (open) { hovered = null; ui.setPrompt(null); }
  for (const u of L.updaters) u(t, dt);
  updateDust(t, dt);
  if (L.clock && Math.floor(t * 2) % 10 === 0) L.clock.update(state.timeMin);
  if (state.roulette && state.roulette.hist.length !== boardLen) { boardLen = state.roulette.hist.length; L.rouletteBoards.forEach(b => b.update(state.roulette.hist)); }
  updateActors(actors, t, dt, camera.position, hovered);
  updateLights();
  composer.render();
  hudTick += dt; if (hudTick > 0.25) { hudTick = 0; ui.updateHUD(state); }
}

story.boot(() => { syncFromState(); tryLock(); setTimeout(() => { if (!ui.isOpen() && !player.locked) lockOverlay.hidden = false; }, 400); });
frame();
window.__game = { renderer, state, ui, games: story.games, player, tp: (px, py) => player.setPosition(px * S, py * S), L, scene, camera, interact: () => interact(hovered) };
