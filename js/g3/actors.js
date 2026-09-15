// Low-poly characters: ghosts (witnesses), staff, patrons, walkers, plus name tags and animation.
// Each character is 7 draw calls: body, head, two arms, two legs and a blob shadow. Rigid parts are
// merged into one geometry with vertex colours, and every human shares a single material.
import * as THREE from 'three';
import { textTexture, blobTexture } from './textures.js';
import { S } from './level.js';
import { roomOfPoint } from './optimize.js';

const TAU = Math.PI * 2;
const SKINS = [0xe8b58f, 0xd9a07a, 0xb07a55, 0x8a5a3c, 0xf1c9a5, 0x6b4a34];
const HAIRS = [0x3e2723, 0x111111, 0x8d6e63, 0xd7b377, 0xb71c1c, 0x424242];
const PANTS = [0x1b1b22, 0x2a2a3a, 0x3b2418, 0x1f2d3d];
let blobMat = null, humanMat = null, ghostSprite = null;

function hash(str) { let h = 7; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h; }

// tessellate each primitive once; parts are cloned and baked into the merged meshes
const geoCache = new Map();
function geo(kind, ...args) {
  const key = kind + ':' + args.join(',');
  if (!geoCache.has(key)) geoCache.set(key, new THREE[kind + 'Geometry'](...args));
  return geoCache.get(key);
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
/** Merge parts [{ g, p:[x,y,z], r:[x,y,z]?, s:[x,y,z]?, c: colour }] into one mesh with a vertex-colour attribute. */
function partsMesh(parts, material) {
  const geos = parts.map(({ g, p, r, s }) => {
    const c = g.clone();
    _e.set(r ? r[0] : 0, r ? r[1] : 0, r ? r[2] : 0); _q.setFromEuler(_e); _s.set(s ? s[0] : 1, s ? s[1] : 1, s ? s[2] : 1); _p.set(p[0], p[1], p[2]);
    _m.compose(_p, _q, _s); c.applyMatrix4(_m);
    return c;
  });
  const useIndex = geos.every(g => g.index);
  const merged = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'uv']) {
    let count = 0; for (const g of geos) count += g.attributes[name].count;
    const size = geos[0].attributes[name].itemSize; const arr = new Float32Array(count * size); let off = 0;
    for (const g of geos) { const a = g.attributes[name]; arr.set(a.array.subarray(0, a.count * size), off); off += a.count * size; }
    merged.setAttribute(name, new THREE.BufferAttribute(arr, size));
  }
  const col = new Float32Array(merged.attributes.position.count * 3); let o = 0; const tmp = new THREE.Color();
  geos.forEach((g, i) => { tmp.setHex(parts[i].c); for (let k = 0; k < g.attributes.position.count; k++) { col[o++] = tmp.r; col[o++] = tmp.g; col[o++] = tmp.b; } });
  merged.setAttribute('color', new THREE.BufferAttribute(col, 3));
  if (useIndex) {
    let total = 0; for (const g of geos) total += g.index.count;
    const idx = merged.attributes.position.count > 65535 ? new Uint32Array(total) : new Uint16Array(total); let off = 0, base = 0;
    for (const g of geos) { const ia = g.index.array; for (let i = 0; i < ia.length; i++) idx[off + i] = ia[i] + base; off += ia.length; base += g.attributes.position.count; }
    merged.setIndex(new THREE.BufferAttribute(idx, 1));
  }
  geos.forEach(g => g.dispose());
  return new THREE.Mesh(merged, material);
}

function humanoid(n) {
  const ghost = n.kind === 'ghost', staff = n.kind === 'staff', seated = n.kind === 'patron' && !n.standing;
  const h = hash(n.id);
  const g = new THREE.Group();
  if (!humanMat) humanMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, envMapIntensity: 0.2 });
  const mat = ghost
    ? new THREE.MeshStandardMaterial({ color: 0xcfe7ff, emissive: 0x7fb0ff, emissiveIntensity: 0.55, transparent: true, opacity: 0.55, roughness: 1, depthWrite: false })
    : humanMat;
  const body = n.color ? parseInt(n.color.replace('#', ''), 16) : 0x607d8b;
  const skin = SKINS[h % SKINS.length], hair = HAIRS[(h >> 3) % HAIRS.length], pants = PANTS[(h >> 5) % PANTS.length], white = 0xf5f1e8, shoe = 0x111111;
  const dress = !ghost && !staff && ((h >> 7) % 3 === 0);
  const legH = seated ? 0.42 : 0.82, legY = seated ? 0.21 : 0.41;
  const torsoY = (seated ? 0.62 : 0.82) + 0.34;
  const headY = torsoY + 0.56;

  // ---- body: everything that never moves relative to the character
  const bodyParts = [];
  if (seated) { bodyParts.push({ g: geo('Box', 0.14, 0.45, 0.15), p: [-0.1, 0.24, 0.32], c: pants }, { g: geo('Box', 0.14, 0.45, 0.15), p: [0.1, 0.24, 0.32], c: pants }); }
  for (const x of [-0.1, 0.1]) bodyParts.push({ g: geo('Box', 0.16, 0.08, 0.26), p: [x, 0.04, seated ? 0.36 : 0.04], c: shoe });
  bodyParts.push({ g: geo('Capsule', 0.21, 0.4, 4, 12), p: [0, torsoY, 0], c: body });
  if (dress) bodyParts.push({ g: geo('Cone', 0.3, 0.55, 12, 1, true), p: [0, torsoY - 0.45, 0], c: body });
  for (const x of [-0.2, 0.2]) bodyParts.push({ g: geo('Sphere', 0.11, 10, 10), p: [x, torsoY + 0.2, 0], c: body });
  if (staff) { bodyParts.push({ g: geo('Box', 0.18, 0.4, 0.06), p: [0, torsoY + 0.02, 0.21], c: white }, { g: geo('Box', 0.05, 0.24, 0.02), p: [0, torsoY, 0.25], c: 0xb3261e }); }
  if (n.tray) { bodyParts.push({ g: geo('Cylinder', 0.22, 0.22, 0.02, 16), p: [0.32, torsoY + 0.1, 0.3], c: 0xc0c0c0 }, { g: geo('Cylinder', 0.04, 0.03, 0.12, 8), p: [0.32, torsoY + 0.18, 0.3], c: 0x9fd0ff }); }
  bodyParts.push({ g: geo('Cylinder', 0.06, 0.07, 0.1, 8), p: [0, torsoY + 0.38, 0], c: skin });
  if (n.id === 'hote' || n.id === 'croupier' || n.id === 'croupier2') bodyParts.push({ g: geo('Box', 0.4, 0.42, 0.24), p: [0, torsoY - 0.02, 0.05], c: 0x111114 });
  const torso = partsMesh(bodyParts, mat); g.add(torso);

  // ---- legs (walkers swing them)
  const legs = [-0.1, 0.1].map(x => { const m = partsMesh([{ g: geo('Box', 0.15, legH, 0.17), p: [0, 0, 0], c: pants }], mat); m.position.set(x, seated ? 0.55 : legY, seated ? 0.12 : 0); if (seated) m.rotation.x = -1.2; g.add(m); return m; });

  // ---- arms: pivot at the shoulder
  const arms = [-0.31, 0.31].map((x, k) => {
    const pivot = new THREE.Group(); pivot.position.set(x, torsoY + 0.2, 0);
    pivot.add(partsMesh([{ g: geo('Capsule', 0.06, 0.42, 4, 8), p: [0, -0.26, 0], c: body }, { g: geo('Sphere', 0.06, 8, 8), p: [0, -0.55, 0], c: skin }], mat));
    pivot.rotation.z = k === 0 ? 0.14 : -0.14; g.add(pivot); return pivot;
  });

  // ---- head: skull, hair style, eyes, hats
  const style = (h >> 9) % 4;
  const headParts = [{ g: geo('Sphere', 0.17, 16, 16), p: [0, 0, 0], s: [0.95, 1.05, 0.95], c: skin }];
  if (style === 0) headParts.push({ g: geo('Sphere', 0.18, 14, 8, 0, TAU, 0, Math.PI / 2), p: [0, 0.02, 0], c: hair });
  else if (style === 1) headParts.push({ g: geo('Sphere', 0.185, 14, 10, 0, TAU, 0, Math.PI * 0.7), p: [0, 0.02, 0], c: hair }, { g: geo('Cylinder', 0.17, 0.12, 0.3, 12), p: [0, -0.1, -0.06], c: hair });
  else if (style === 2) headParts.push({ g: geo('Sphere', 0.18, 14, 8, 0, TAU, 0, Math.PI / 2), p: [0, 0.02, 0], c: 0x1a237e }, { g: geo('Box', 0.2, 0.02, 0.12), p: [0, 0.06, 0.2], c: 0x1a237e });
  else headParts.push({ g: geo('Sphere', 0.17, 12, 6, 0, TAU, 0, Math.PI / 3), p: [0, 0.03, 0], c: hair });
  if (n.id === 'vigile') headParts.push({ g: geo('Cylinder', 0.19, 0.19, 0.1, 14), p: [0, 0.12, 0], c: 0x1a237e });
  if (n.id === 'dosto') headParts.push({ g: geo('Box', 0.16, 0.12, 0.1), p: [0, -0.12, 0.1], c: hair });
  for (const x of [-0.06, 0.06]) headParts.push({ g: geo('Sphere', 0.02, 6, 6), p: [x, 0.02, 0.15], c: ghost ? 0x0d1a26 : 0x111111 });
  const head = partsMesh(headParts, mat); head.position.y = headY; g.add(head);

  if (!ghost) { if (!blobMat) blobMat = new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false, opacity: 0.7 }); const sh = new THREE.Mesh(geo('Plane', 0.9, 0.9), blobMat); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.013; sh.renderOrder = 1; g.add(sh); }
  g.userData.parts = { torso, head, arms, legs, headY };
  g.userData.height = headY + 0.2;
  return g;
}

const INTERACTIVE_STAFF = new Set(['vigile', 'caissier', 'hotesse', 'barman', 'hote', 'croupier', 'croupier2']);
export function buildActors(scene, state, L) {
  const actors = [];
  const hitGeo = new THREE.BoxGeometry(0.9, 2.0, 0.9), hitMat = new THREE.MeshBasicMaterial({ visible: false });
  for (const n of state.npcs) {
    const ghost = n.kind === 'ghost';
    const g = humanoid(n);
    const x = n.x * S, z = n.y * S;
    g.position.set(x, 0, z);
    g.rotation.y = { up: Math.PI, down: 0, left: -Math.PI / 2, right: Math.PI / 2 }[n.facing || 'down'] ?? 0;
    if (n.id === 'sami') { g.position.y = -0.3; g.rotation.y = 0; }
    if (n.kind === 'patron' && !n.standing) g.position.z += 0.02;
    scene.add(g);
    if (ghost) {
      if (!ghostSprite) { const c = document.createElement('canvas'); c.width = c.height = 128; const gg = c.getContext('2d'); const grd = gg.createRadialGradient(64, 64, 4, 64, 64, 64); grd.addColorStop(0, 'rgba(170,220,255,0.55)'); grd.addColorStop(1, 'rgba(170,220,255,0)'); gg.fillStyle = grd; gg.fillRect(0, 0, 128, 128); ghostSprite = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }); }
      const sp = new THREE.Sprite(ghostSprite); sp.scale.set(2.2, 2.6, 1); sp.position.y = 1.0; g.add(sp);
    }
    let tag = null;
    if (n.name) {
      const tex = textTexture(n.name, { w: 512, h: 128, font: '600 54px Inter, sans-serif', color: ghost ? '#dcecff' : '#f5f1e8', bg: 'rgba(10,10,14,0.7)' });
      tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })); tag.scale.set(1.6, 0.4, 1); tag.position.y = g.userData.height + 0.25; tag.material.opacity = 0; tag.visible = false; g.add(tag);
    }
    const interactive = !!n.r || INTERACTIVE_STAFF.has(n.id);
    const hit = new THREE.Mesh(hitGeo, hitMat); hit.visible = false; hit.position.set(x, 1.0, z);
    if (interactive) { hit.userData = { target: { kind: 'npc', n } }; scene.add(hit); L.hits.push(hit); }
    const a = { n, g, tag, hit, ghost, base: g.position.y, phase: Math.random() * TAU, pressT: 2 + Math.random() * 4, room: roomOfPoint(x, z, S), roomTick: 0 };
    if (n.kind === 'walker') { a.path = n.path.map(([px, py]) => new THREE.Vector3(px * S, 0, py * S)); a.idx = 1; a.dir = 1; a.speed = (n.speed || 40) * S; }
    actors.push(a);
  }
  return actors;
}

const _tmp = new THREE.Vector3();
/** visibleRooms: Set of room ids in view (null = everything). Characters out of view are neither animated nor drawn. */
export function updateActors(actors, t, dt, playerPos, hovered, visibleRooms = null) {
  for (const a of actors) {
    const n = a.n, p = a.g.userData.parts;
    if (n.kind === 'walker' && ++a.roomTick % 20 === 0) a.room = roomOfPoint(a.g.position.x, a.g.position.z, S);
    const shown = !n.hidden && (!visibleRooms || a.room === 'none' || visibleRooms.has(a.room));
    a.g.visible = shown;
    if (!shown) continue;
    const dx = playerPos.x - a.g.position.x, dz = playerPos.z - a.g.position.z; const dist = Math.hypot(dx, dz);
    const far = dist > 26; // deep in the fog: skip the idle animation
    if (a.ghost) {
      a.g.position.y = a.base + Math.sin(t * 1.4 + a.phase) * 0.06;
      if (dist < 9) { const want = Math.atan2(dx, dz); a.g.rotation.y += wrapAngle(want - a.g.rotation.y) * 0.04; }
      p.torso.material.emissiveIntensity = 0.45 + 0.2 * Math.sin(t * 2 + a.phase);
    } else if (n.kind === 'walker') {
      const target = a.path[a.idx]; _tmp.subVectors(target, a.g.position); _tmp.y = 0; const d = _tmp.length();
      if (d < 0.15) { a.idx += a.dir; if (a.idx >= a.path.length || a.idx < 0) { if (n.bounce) { a.dir *= -1; a.idx += a.dir * 2; } else a.idx = 0; } }
      else { _tmp.normalize(); a.g.position.addScaledVector(_tmp, a.speed * dt); const want = Math.atan2(_tmp.x, _tmp.z); a.g.rotation.y += wrapAngle(want - a.g.rotation.y) * 0.12; }
      if (!far) {
        const sw = Math.sin(t * 7 + a.phase) * 0.45;
        p.legs[0].rotation.x = sw; p.legs[1].rotation.x = -sw; p.arms[0].rotation.x = -sw * 0.7; p.arms[1].rotation.x = sw * 0.7;
        a.g.position.y = Math.abs(Math.sin(t * 7 + a.phase)) * 0.02;
      }
      a.hit.position.copy(a.g.position); a.hit.position.y = 1;
    } else if (far) {
      // nothing to do
    } else if (n.kind === 'patron' && !n.standing) {
      // seated player: occasionally slaps the spin button
      a.pressT -= dt;
      if (a.pressT < 0) { a.pressT = 2 + Math.random() * 5; a.pressing = 0.35; }
      if (a.pressing > 0) { a.pressing -= dt; p.arms[1].rotation.x = -1.1; } else p.arms[1].rotation.x = -0.5 + Math.sin(t * 1.2 + a.phase) * 0.05;
      p.arms[0].rotation.x = -0.5;
      p.head.rotation.y = Math.sin(t * 0.7 + a.phase) * 0.08;
    } else {
      p.head.position.y = p.headY + Math.sin(t * 1.5 + a.phase) * 0.01;
      if ((n.kind === 'staff' || n.witness) && dist < 6) { const want = Math.atan2(dx, dz); a.g.rotation.y += wrapAngle(want - a.g.rotation.y) * 0.05; }
      else if (n.kind === 'patron') { p.head.rotation.y = Math.sin(t * 0.5 + a.phase) * 0.25; a.g.rotation.z = Math.sin(t * 0.9 + a.phase) * 0.012; }
    }
    if (a.tag) {
      const show = (hovered && hovered.kind === 'npc' && hovered.n === n) || (a.ghost && dist < 7) || (n.witness && dist < 4);
      const op = a.tag.material.opacity + ((show ? 1 : 0) - a.tag.material.opacity) * 0.15;
      a.tag.material.opacity = op; a.tag.visible = op > 0.02;
    }
  }
}
function wrapAngle(a) { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; }
