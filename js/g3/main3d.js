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
import { createExperience } from '../experience.js';
import { PeerAvatars } from './peers.js';
import { audio } from '../audio.js';
import { createStory } from '../story.js';
import { buildLevel, S } from './level.js';
import { buildActors, updateActors } from './actors.js';
import { Player } from './player.js';
import { mergeStatic, applyRoomVisibility, Adaptive, TIERS, roomOfPoint } from './optimize.js';
import { setTextureInit } from './textures.js';

// ------------------------------------------------------------------ renderer
const canvas = document.getElementById('game');
// anti-aliasing is done on the composer's render target (MSAA), never on the canvas: the canvas only
// ever receives the final full-screen quad, so canvas MSAA would cost memory for nothing
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
renderer.setPixelRatio(1);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.info.autoReset = false;
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
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, { type: THREE.HalfFloatType, samples: 2 }));
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.42, 0.4, 0.9);
// the bloom chain runs at a fraction of the frame resolution (it is a blur anyway)
let bloomScale = 0.5;
const bloomSetSize = bloom.setSize.bind(bloom);
bloom.setSize = (w, h) => bloomSetSize(Math.max(64, Math.round(w * bloomScale)), Math.max(64, Math.round(h * bloomScale)));
composer.addPass(bloom);
composer.addPass(new OutputPass());
const film = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, vig: { value: 0.5 }, grain: { value: 0.035 }, zone: { value: 0 }, drunk: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float time, vig, grain, zone, drunk; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec2 uv = vUv;
      vec4 c;
      if (drunk > 0.001) {
        // a slow sway, a soft double image and a saturation push: the bar's cocktails, done in four taps
        uv += vec2(sin(time * 0.8), cos(time * 0.6)) * 0.004 * drunk;
        vec2 o = vec2(0.0035, 0.0) * drunk, o2 = vec2(0.0, 0.0035) * drunk;
        c = (texture2D(tDiffuse, uv + o) + texture2D(tDiffuse, uv - o) + texture2D(tDiffuse, uv + o2) + texture2D(tDiffuse, uv - o2)) * 0.25;
        float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
        c.rgb = mix(vec3(l), c.rgb, 1.0 + 0.35 * drunk);
      } else c = texture2D(tDiffuse, uv);
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
// ------------------------------------------------------------------ quality (resolution, MSAA, bloom) — adaptive by default
let dpr = 1;
function applyTier(tier) {
  dpr = Math.min(window.devicePixelRatio || 1, tier.dpr);
  bloom.enabled = tier.bloom > 0; bloomScale = tier.bloom || 0.5;
  // MSAA and the 16-bit (HDR) colour buffer are the two big bandwidth costs; both are recreated on change
  const type = tier.hdr ? THREE.HalfFloatType : THREE.UnsignedByteType;
  for (const rt of [composer.renderTarget1, composer.renderTarget2]) { if (rt.samples !== tier.msaa || rt.texture.type !== type) { rt.samples = tier.msaa; rt.texture.type = type; rt.dispose(); } }
  renderer.setPixelRatio(dpr); composer.setPixelRatio(dpr);
  renderer.setSize(window.innerWidth, window.innerHeight); composer.setSize(window.innerWidth, window.innerHeight);
  const b = document.getElementById('btn-quality'); if (b) b.textContent = 'Qualité : ' + (quality && !quality.auto ? tier.name : 'auto (' + tier.name.toLowerCase() + ')');
}
const weak = (navigator.hardwareConcurrency || 8) <= 4 || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
let quality = null; quality = new Adaptive(applyTier, { start: weak ? 2 : 1 });
if (new URLSearchParams(location.search).has('smoke')) quality.set(TIERS.length - 1, false); // the headless test renders in software
window.addEventListener('resize', () => { renderer.setSize(window.innerWidth, window.innerHeight); composer.setSize(window.innerWidth, window.innerHeight); camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); });
const btnQuality = document.getElementById('btn-quality');
if (btnQuality) btnQuality.addEventListener('click', () => { // auto → ultra → haute → moyenne → basse → minimale → auto
  if (quality.auto) quality.set(0, false); else if (quality.tier >= TIERS.length - 1) { quality.auto = true; quality.set(weak ? 2 : 1, true); } else quality.set(quality.tier + 1, false);
  btnQuality.blur();
});

// ------------------------------------------------------------------ story + level
const player = new Player(camera, document.body);
const story = createStory({
  onTeleport: (px, py, facing) => { player.setPosition(px * S, py * S, { up: 0, down: Math.PI, left: Math.PI / 2, right: -Math.PI / 2 }[facing] ?? 0); },
  onEntered: () => {},
  onVipOpen: () => { if (L.dynamic.vipRope) L.dynamic.vipRope.visible = false; if (L.dynamic.vipCollider) L.dynamic.vipCollider.disabled = true; if (L.dynamic.vipHit) { L.dynamic.vipHit.userData = {}; const i = L.hits.indexOf(L.dynamic.vipHit); if (i >= 0) L.hits.splice(i, 1); } },
  onExited: () => { setDawn(true); if (L.dynamic.exitDoor) L.dynamic.exitDoor.material = new THREE.MeshStandardMaterial({ color: 0x7fd0ff, emissive: 0x3a90c0, emissiveIntensity: 0.5 }); },
  onLoaded: () => syncFromState()
});
const { state, interact, targetLabel, tick } = story;
const experience = createExperience(story);
const peers = new PeerAvatars(scene);
const L = buildLevel(scene, state);
const actors = buildActors(scene, state, L);
// static props are merged into one mesh per material and per room, then rooms out of sight are hidden
const chunks = mergeStatic(L.root, { skip: new Set([...L.wallMeshes, ...L.hits]), S });
let curRoomId = null, visibleSet = applyRoomVisibility(chunks.byRoom, null);
for (const l of L.lightSpots) l.room = roomOfPoint(l.x, l.z, S);
player.colliders = L.colliders;
player.onStep = () => audio.step();
// Upload generated textures when ready; keep the opaque welcome screen inexpensive.
setTextureInit((t) => renderer.initTexture(t));
// The welcome screen is opaque: compile shaders without drawing the entire casino.
setTimeout(() => renderer.compile(scene, camera), 0);
function syncFromState() {
  player.setPosition(state.player.x * S, state.player.y * S, Number.isFinite(state.player.yaw) ? state.player.yaw : state.player.facing === 'up' ? 0 : state.player.facing === 'left' ? Math.PI / 2 : state.player.facing === 'down' ? Math.PI : -Math.PI / 2);
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
// eight point lights follow the player (every light costs a full BRDF evaluation per pixel)
const POOL = 8;
const pool = []; for (let i = 0; i < POOL; i++) { const pl = new THREE.PointLight(0xffffff, 0, 10, 2); scene.add(pl); pool.push(pl); }
let spotOrder = [];
function updateLights(t, force = false) {
  const p = camera.position;
  if (force || (lightTick++ % 6 === 0)) {
    // re-rank the closest spots ~10 times a second; between two ranks only intensities move
    // rank by influence at the player's position (a bright chandelier matters more than a near, dim glow)
    const score = (l) => { if (l.room !== 'none' && !visibleSet.has(l.room)) return 0; const d2 = Math.max(1, (l.x - p.x) ** 2 + (l.z - p.z) ** 2); const reach = l.distance * l.distance; return d2 > reach ? 0 : l.intensity / d2; };
    spotOrder = L.lightSpots.map((l, i) => i).sort((a, b) => score(L.lightSpots[b]) - score(L.lightSpots[a])).slice(0, POOL);
    for (let i = 0; i < POOL; i++) {
      const pl = pool[i], e = L.lightSpots[spotOrder[i]];
      if (!e) { pl.intensity = 0; pl.userData.base = 0; continue; }
      pl.position.set(e.x, e.y, e.z); pl.color.copy(e.color); pl.distance = e.distance; pl.userData.base = e.intensity; pl.userData.neon = !!e.neon;
    }
  }
  for (let i = 0; i < POOL; i++) { const pl = pool[i]; pl.intensity = (pl.userData.base || 0) * (pl.userData.neon ? 0.85 + 0.15 * Math.sin(t * 6) : 1); }
}
let lightTick = 0;

// ------------------------------------------------------------------ input & pointer lock
const lockOverlay = document.getElementById('lock');
function tryLock() { if (!state.started || ui.isOpen() || player.locked || player.touch) return; player.lock(); }
window.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.target.closest?.('input,textarea,select,[contenteditable]')) return;
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

// Touch: left pad walks, drag on the world to look, action button interacts.
player.touch = matchMedia('(pointer: coarse)').matches;
let touchLook = null;
canvas.style.touchAction = 'none';
canvas.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' && state.started && !ui.isOpen()) { player.touch = true; touchLook = {id:e.pointerId,x:e.clientX,y:e.clientY}; canvas.setPointerCapture(e.pointerId); } });
canvas.addEventListener('pointermove', e => { if (!touchLook || e.pointerId !== touchLook.id || ui.isOpen()) return; camera.rotation.order='YXZ'; camera.rotation.y -= (e.clientX-touchLook.x)*.004; camera.rotation.x = Math.max(-1.35,Math.min(1.35,camera.rotation.x-(e.clientY-touchLook.y)*.004)); touchLook.x=e.clientX;touchLook.y=e.clientY; });
for (const type of ['pointerup','pointercancel']) canvas.addEventListener(type,()=>touchLook=null);
for (const b of document.querySelectorAll('#pad [data-k]')) {
  b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);if(ui.isOpen())return;if(b.dataset.k==='E'){if(hovered)interact(hovered);}else player.keys.add(b.dataset.k);});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,()=>player.keys.delete(b.dataset.k));
}

// ------------------------------------------------------------------ interaction (crosshair raycast)
const ray = new THREE.Raycaster(); ray.far = 3.4;
let hovered = null; let rayTick = 0;
const crosshair = document.getElementById('crosshair');
const rayOrigin = { x: 0, y: 0 }; let rayTargets = [], rayTargetsFor = -1;
function updateHover() {
  hovered = null;
  ray.setFromCamera(rayOrigin, camera);
  if (rayTargetsFor !== L.hits.length) { rayTargets = L.hits.concat(L.wallMeshes); rayTargetsFor = L.hits.length; }
  const hits = ray.intersectObjects(rayTargets, false);
  if (hits.length) {
    const h = hits[0];
    if (h.object.userData.target) { const t = h.object.userData.target; if (!(t.kind === 'npc' && t.n.hidden)) hovered = t; }
  }
  ui.setPrompt(player.locked || player.touch ? targetLabel(hovered) : null);
  crosshair.classList.toggle('on', !!hovered);
}

// ------------------------------------------------------------------ perf overlay (F3)
const perf = { el: null, acc: 0, n: 0, last: performance.now() };
window.addEventListener('keydown', (e) => { if (e.key === 'F3') { e.preventDefault(); if (!perf.el) { perf.el = document.createElement('pre'); perf.el.id = 'perf'; document.body.appendChild(perf.el); } else { perf.el.remove(); perf.el = null; } } });

// ------------------------------------------------------------------ loop
const clock = new THREE.Clock();
let hudTick = 0, fogTarget = 0.035, boardLen = -1, frameIdx = 0;
function frame() {
  requestAnimationFrame(frame);
  const frameStart = performance.now();
  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.elapsedTime;
  renderer.info.reset();
  if (!state.started) { experience.frame(dt); return; }
  const open = ui.isOpen();
  watchUI();
  const drunk = state.drunkUntil > state.timeMin && !state.flags.exited;
  const calm = document.body.classList.contains('calm-mode');
  player.update(dt, { enabled: !open && (player.locked || player.touch) && state.started, drunk: drunk && !calm, t, calm });
  camera.position.y += L.groundHeight?.(camera.position.x, camera.position.z) || 0;
  state.player.x = camera.position.x / S; state.player.y = camera.position.z / S;
  state.player.moving = player.moving; state.player.yaw = camera.rotation.y;
  tick(dt, open);
  experience.frame(dt); peers.update(state.remotePlayers || [], dt);
  const r = roomAt(state.player.x, state.player.y);
  const rid = r ? r.id : null;
  if (rid !== curRoomId) { curRoomId = rid; visibleSet = applyRoomVisibility(chunks.byRoom, rid); updateLights(t, true); }
  for (const model of L.blenderModels) model.visible = visibleSet.has(model.userData.room);
  fogTarget = !r || r.outdoor ? (state.flags.exited ? 0.008 : 0.016) : r.id === 'machines' ? 0.045 : r.id === 'labyrinth' ? 0.055 : 0.03;
  scene.fog.density += (fogTarget - scene.fog.density) * 0.05;
  scene.fog.color.setHex(!r || r.outdoor ? (state.flags.exited ? 0x6b5570 : 0x07080f) : 0x07080f);
  const zone = document.body.classList.contains('zone');
  const wantFov = zone && !calm ? 60 : 72; if (Math.abs(camera.fov - wantFov) > 0.1) { camera.fov += (wantFov - camera.fov) * 0.05; camera.updateProjectionMatrix(); }
  bloom.strength = zone ? 0.8 : 0.42;
  film.uniforms.time.value = t; film.uniforms.zone.value += ((zone ? 1 : 0) - film.uniforms.zone.value) * 0.05; film.uniforms.vig.value = drunk ? 0.7 : 0.5; film.uniforms.drunk.value += ((drunk ? 1 : 0) - film.uniforms.drunk.value) * 0.03;
  if (calm) { film.uniforms.drunk.value = 0; film.uniforms.grain.value = 0; } else film.uniforms.grain.value = 0.035;
  rayTick++; if (rayTick % 3 === 0 && !open) updateHover(); else if (open) { hovered = null; ui.setPrompt(null); }
  for (const u of L.updaters) if (!u.room || visibleSet.has(u.room)) u(t, dt);
  updateDust(t, dt);
  if (L.clock && Math.floor(t * 2) % 10 === 0) L.clock.update(state.timeMin);
  if (state.roulette && state.roulette.hist.length !== boardLen) { boardLen = state.roulette.hist.length; L.rouletteBoards.forEach(b => b.update(state.roulette.hist)); }
  updateActors(actors, t, dt, camera.position, hovered, visibleSet);
  updateLights(t);
  // behind an open menu the world only needs a few frames a second
  frameIdx++; if (!open || frameIdx % 3 === 0) composer.render();
  hudTick += dt; if (hudTick > 0.25) { hudTick = 0; ui.updateHUD(state); }
  // frame pacing → adaptive quality; F3 overlay
  const now = performance.now(); const ms = now - perf.last; perf.last = now;
  if (document.visibilityState === 'visible' && ms < 250) quality.push(ms);
  if (perf.el) { perf.acc += ms; if (++perf.n >= 20) { const cpu = (now - frameStart).toFixed(1); perf.el.textContent = `${(1000 / (perf.acc / perf.n)).toFixed(0)} fps · ${(perf.acc / perf.n).toFixed(1)} ms (cpu ${cpu})\n${renderer.info.render.calls} draws · ${(renderer.info.render.triangles / 1000).toFixed(0)}k tris\n${TIERS[quality.tier].name}${quality.auto ? ' (auto)' : ''} · dpr ${dpr.toFixed(2)} · ${rid || 'dehors'}`; perf.acc = 0; perf.n = 0; } }
}

story.boot(() => { syncFromState(); tryLock(); setTimeout(() => { if (!ui.isOpen() && !player.locked && !player.touch) lockOverlay.hidden = false; }, 400); });
frame();
window.__game = { experience, peers, renderer, state, ui, games: story.games, player, tp: (px, py) => player.setPosition(px * S, py * S), L, scene, camera, interact: () => interact(hovered), interactTarget: (t) => interact(t), quality, chunks, actors, renderOnce: () => { renderer.info.reset(); composer.render(); return { calls: renderer.info.render.calls, tris: renderer.info.render.triangles }; } };
