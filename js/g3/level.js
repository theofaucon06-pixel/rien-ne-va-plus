// Builds the 3D casino from the shared 2D layout (world.js). 1 world px = 1/40 m.
import * as THREE from 'three';
import { ROOMS, WALLS, SLOTS, OBJECTS, LIGHTS, WORLD } from '../world.js';
import { patternTexture, textTexture, wheelTexture, bigSixTexture, feltTexture, slotScreen, clockTexture, screenTexture, gradientSky, blobTexture, artTexture, posterTexture, tickerTexture, tvTexture, historyBoardTexture, neonTexture, upgradeMaterial, loadAsset } from './textures.js';

export const S = 1 / 40;
const TAU = Math.PI * 2;
const WALL_H = 4.2;
export const CEIL = { hall: 4.2, corridor: 2.6, machines: 2.7, toilettes: 2.6, tables: 3.6, bar: 3.0, hallway: 2.6, labyrinth: 2.5, vip: 3.0, bureau: 2.8 };
const TABLE_SCALE = 0.72;

// ------------------------------------------------------------------ helpers
const mats = {};
function std(key, opts) { if (!mats[key]) mats[key] = new THREE.MeshStandardMaterial({ envMapIntensity: 0.35, ...opts }); return mats[key]; }
function basic(key, opts) { if (!mats[key]) mats[key] = new THREE.MeshBasicMaterial(opts); return mats[key]; }
function box(w, h, d, material, x, y, z) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material); m.position.set(x, y, z); return m; }
function cyl(rt, rb, h, material, x, y, z, seg = 24) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material); m.position.set(x, y, z); return m; }
function plane(w, h, material, x, y, z, ry = 0, rx = 0) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); return m; }
function floorMat(name) { const key = 'floor-' + name; const fresh = !mats[key]; const m = std(key, { map: patternTexture(name, 512), roughness: name === 'marble' ? 0.55 : 0.92, metalness: 0, envMapIntensity: name === 'marble' ? 0.25 : 0.1 }); if (fresh) upgradeMaterial(m, name); return m; }
function scaledUV(geo, w, h, size) { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / size, uv.getY(i) * h / size); uv.needsUpdate = true; }
const YAW = { east: -Math.PI / 2, west: Math.PI / 2, north: Math.PI, south: 0 };

export function buildLevel(scene, state) {
  const L = { colliders: [], hits: [], wallMeshes: [], updaters: [], lightSpots: [], dynamic: {}, rouletteBoards: [] };
  const root = new THREE.Group(); scene.add(root);
  const wallMat = std('wall', { map: patternTexture('wall', 256), roughness: 0.85 }); upgradeMaterial(wallMat, 'wall');
  const brickMat = std('brick', { map: patternTexture('brick', 256), roughness: 0.95 }); upgradeMaterial(brickMat, 'brick');
  const wallpaperMat = std('wallpaper', { map: patternTexture('wallpaper', 256), roughness: 0.9 }); upgradeMaterial(wallpaperMat, 'wallpaper');
  const ceilMat = std('ceil', { map: patternTexture('ceiling', 256), roughness: 1, color: 0x9a9aa6 }); upgradeMaterial(ceilMat, 'ceiling');
  const gold = std('gold', { color: 0xc6a14f, metalness: 0.9, roughness: 0.25, envMapIntensity: 0.9 });
  const chrome = std('chrome', { color: 0xd8dde3, metalness: 1, roughness: 0.2, envMapIntensity: 0.9 });
  const wood = std('wood', { map: patternTexture('wood', 256), roughness: 0.55 }); upgradeMaterial(wood, 'wood');
  const darkMetal = std('metal', { color: 0x2c2c36, metalness: 0.6, roughness: 0.4 });
  const black = std('black', { color: 0x111114, roughness: 0.9 });
  const white = std('white', { color: 0xf5f1e8, roughness: 0.8 });
  const marbleWhite = std('marbleW', { map: patternTexture('marble', 256), roughness: 0.5, metalness: 0.0, envMapIntensity: 0.25 }); upgradeMaterial(marbleWhite, 'marble');
  const velvet = std('velvet', { color: 0x7a1f22, roughness: 1 });
  const leather = std('leather', { color: 0x3b2418, roughness: 0.7 });
  const glass = std('glass', { color: 0x9fd0ff, transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.1, side: THREE.DoubleSide });
  const mirrorMat = std('mirror', { color: 0xc8dbe8, metalness: 1, roughness: 0.05, envMapIntensity: 1.2 });
  const blobMat = new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false, opacity: 0.75 });
  const blob = (x, z, sx, sz = sx) => { const m = plane(1, 1, blobMat, x, 0.012, z, 0, -Math.PI / 2); m.scale.set(sx, sz, 1); m.renderOrder = 1; root.add(m); return m; };

  // ------------------------------------------------------------ sky & ground
  const sky = gradientSky(); scene.add(sky); L.sky = sky;
  const stars = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(Array.from({ length: 1200 * 3 }, (_, i) => { const k = i % 3; const a = Math.random() * TAU, e = Math.random() * 0.9 + 0.1; const r = 380; return k === 0 ? Math.cos(a) * Math.cos(e) * r : k === 1 ? Math.sin(e) * r : Math.sin(a) * Math.cos(e) * r; }), 3)), new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: true, transparent: true, opacity: 0.85 }));
  stars.position.set(WORLD.w * S / 2, 0, WORLD.h * S / 2); scene.add(stars); L.stars = stars;
  const moon = new THREE.Mesh(new THREE.SphereGeometry(6, 16, 16), basic('moon', { color: 0xfff2d0 })); moon.position.set(WORLD.w * S / 2 + 120, 120, -220); scene.add(moon);
  const ground = plane(600, 600, floorMat('asphalt'), WORLD.w * S / 2, -0.02, WORLD.h * S / 2, 0, -Math.PI / 2); scaledUV(ground.geometry, 600, 600, 2); root.add(ground);

  // ------------------------------------------------------------ floors, ceilings, cove lights, moldings
  const COVE = { hall: 0xffd9a0, machines: 0xff8fc0, tables: 0xffd0a0, bar: 0xff9a5a, vip: 0xffb070, labyrinth: 0xff9a60, bureau: 0xcfe4ff, toilettes: 0xdde9ff, corridor: 0xffd9a0, hallway: 0xffb070 };
  for (const r of ROOMS) {
    const w = r.w * S, h = r.h * S, cx = (r.x + r.w / 2) * S, cz = (r.y + r.h / 2) * S;
    if (r.id === 'street') {
      const road = plane(w, 110 * S, floorMat('asphalt'), cx, 0.001, 55 * S, 0, -Math.PI / 2); scaledUV(road.geometry, w, 110 * S, 2); root.add(road);
      const side = plane(w, (r.h - 110) * S, floorMat('concrete'), cx, 0.02, (110 + (r.h - 110) / 2) * S, 0, -Math.PI / 2); scaledUV(side.geometry, w, (r.h - 110) * S, 1.5); root.add(side);
      root.add(box(w, 0.06, 0.25, std('curb', { color: 0x5a5d63 }), cx, 0.03, 110 * S));
      for (let x = 0; x < w; x += 1.5) root.add(box(0.8, 0.005, 0.12, basic('mark', { color: 0xdddddd }), x + 0.4, 0.004, 55 * S));
      continue;
    }
    const fl = plane(w, h, floorMat(r.floor), cx, 0, cz, 0, -Math.PI / 2); scaledUV(fl.geometry, w, h, { carpet: 1.2, carpet2: 1, carpetred: 1.2, marble: 1.6, tile: 0.6, wood: 1.2, asphalt: 2, concrete: 1.5 }[r.floor] || 1.5); root.add(fl);
    if (!CEIL[r.id]) continue;
    const H = CEIL[r.id];
    const ce = plane(w, h, ceilMat, cx, H, cz, 0, Math.PI / 2); scaledUV(ce.geometry, w, h, 1.5); root.add(ce);
    const x0 = r.x * S, z0 = r.y * S, x1 = (r.x + r.w) * S, z1 = (r.y + r.h) * S;
    const coveMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(COVE[r.id] || 0xffd9a0).multiplyScalar(0.75), toneMapped: false });
    const edges = [[x0, z0, x1, z0], [x0, z1, x1, z1], [x0, z0, x0, z1], [x1, z0, x1, z1]];
    for (const [ax, az, bx, bz] of edges) {
      const horiz = az === bz; const len = horiz ? bx - ax : bz - az;
      const mx = (ax + bx) / 2, mz = (az + bz) / 2;
      root.add(box(horiz ? len : 0.12, 0.12, horiz ? 0.12 : len, gold, mx + (horiz ? 0 : (ax === x0 ? 0.06 : -0.06)), H - 0.06, mz + (horiz ? (az === z0 ? 0.06 : -0.06) : 0)));
      if (r.id !== 'toilettes' && r.id !== 'corridor' && r.id !== 'hallway') root.add(box(horiz ? len - 0.6 : 0.05, 0.03, horiz ? 0.05 : len - 0.6, coveMat, mx + (horiz ? 0 : (ax === x0 ? 0.32 : -0.32)), H - 0.2, mz + (horiz ? (az === z0 ? 0.32 : -0.32) : 0)));
      root.add(box(horiz ? len : 0.05, 0.14, horiz ? 0.05 : len, std('baseboard', { color: 0x2a1a10, roughness: 0.6 }), mx + (horiz ? 0 : (ax === x0 ? 0.025 : -0.025)), 0.07, mz + (horiz ? (az === z0 ? 0.025 : -0.025) : 0)));
    }
  }

  // ------------------------------------------------------------ walls
  function addWall(wl) {
    const w = wl.w * S, d = wl.h * S, cx = (wl.x + wl.w / 2) * S, cz = (wl.y + wl.h / 2) * S;
    let m = wallMat;
    const isFacade = wl.id === 'facadeL' || wl.id === 'facadeR';
    const isAlley = wl.x === 176 && wl.w === 24;
    const isVip = wl.y >= 1344 && wl.x >= 2000 && wl.y < 1624;
    if (isFacade) m = [wallMat, wallMat, wallMat, wallMat, wallMat, brickMat];
    else if (isAlley) m = [wallMat, brickMat, wallMat, wallMat, wallMat, wallMat];
    else if (isVip) m = wallpaperMat;
    const mesh = box(w, WALL_H, d, m, cx, WALL_H / 2, cz);
    root.add(mesh); L.wallMeshes.push(mesh);
    L.colliders.push({ x0: wl.x * S, z0: wl.y * S, x1: (wl.x + wl.w) * S, z1: (wl.y + wl.h) * S });
    return mesh;
  }
  WALLS.forEach((w, i) => { if (i < 4) { L.colliders.push({ x0: w.x * S, z0: w.y * S, x1: (w.x + w.w) * S, z1: (w.y + w.h) * S }); return; } addWall(w); });
  root.add(box((3000 - 200) * S, 0.3, (1928 - 320) * S, black, 1600 * S, WALL_H + 0.15, 1124 * S));

  // buildings across the street with lit windows and neon shop signs
  const bMat = std('bldg', { color: 0x2a2c34, roughness: 0.95 });
  const winOn = basic('winOn', { color: 0xffe2a8, toneMapped: false }), winOff = std('winOff', { color: 0x14151c });
  let bx = -20, seed = 7; const shops = [['HÔTEL', '#8fd0ff', '#4fa8ff'], ['BAR', '#ff6b85', '#ff4d6d'], ['TABAC', '#ff8a80', '#ff3b30'], ['OUVERT 24/24', '#9be7a6', '#3ddc84'], ['PARKING', '#8fd0ff', '#4fa8ff']];
  while (bx < WORLD.w * S + 20) {
    const bw = 8 + (seed * 37 % 9), bh = 9 + (seed * 53 % 12), bd = 10; seed++;
    root.add(box(bw, bh, bd, bMat, bx + bw / 2, bh / 2, -8 - bd / 2));
    for (let fy = 2.5; fy < bh - 1; fy += 3) for (let fx = 1; fx < bw - 1; fx += 2.2) { const on = ((seed * 13 + Math.floor(fx * 7) + Math.floor(fy * 3)) % 5) === 0; root.add(box(1.0, 1.3, 0.05, on ? winOn : winOff, bx + fx + 0.5, fy, -8 + 0.03)); }
    if (seed % 2 === 0) { const sh = shops[seed % shops.length]; root.add(plane(Math.min(bw - 1, 5), 1.1, new THREE.MeshBasicMaterial({ map: neonTexture(sh[0], sh[1], sh[2]), transparent: true, toneMapped: false }), bx + bw / 2, 3.0, -8 + 0.08)); L.lightSpots.push({ x: bx + bw / 2, y: 3, z: -7.5, color: new THREE.Color(sh[2]), intensity: 30, distance: 10 }); }
    bx += bw + 1.5;
  }
  L.colliders.push({ x0: -50, z0: -12, x1: 200, z1: -6.5 });

  // ------------------------------------------------------------ pillars
  const pillar = (px, py, h, mat = marbleWhite, r = 0.32) => { const x = px * S, z = py * S; root.add(cyl(r, r, h, mat, x, h / 2, z, 20)); root.add(cyl(r + 0.08, r + 0.08, 0.16, gold, x, 0.08, z, 20)); root.add(cyl(r + 0.1, r + 0.02, 0.22, gold, x, h - 0.11, z, 20)); L.colliders.push({ x0: x - r, z0: z - r, x1: x + r, z1: z + r }); blob(x, z, 1.4); };
  [[1500, 400], [1700, 400], [1440, 700], [1760, 700]].forEach(([x, y]) => pillar(x, y, CEIL.hall));
  [[680, 520], [680, 840], [680, 1160]].forEach(([x, y]) => pillar(x, y, CEIL.machines, darkMetal, 0.28));
  [[1960, 750], [2860, 750], [1960, 1250], [2860, 1250]].forEach(([x, y]) => pillar(x, y, CEIL.tables));

  // ------------------------------------------------------------ chandeliers & ceiling fixtures
  const fixture = (x, z, y, color = 0xfff1d6, w = 1.2, d = 0.4) => { const m = box(w, 0.06, d, basic('fx' + color, { color, toneMapped: false })); m.position.set(x, y - 0.03, z); root.add(m); };
  const chand = new THREE.Group();
  for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; const b = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), basic('bulbc', { color: 0xf0d8a0, toneMapped: false })); b.position.set(Math.cos(a) * 0.95, (i % 2) * 0.28, Math.sin(a) * 0.95); chand.add(b); chand.add(cyl(0.02, 0.02, 0.28, chrome, Math.cos(a) * 0.95, (i % 2) * 0.28 - 0.16, Math.sin(a) * 0.95, 6)); }
  chand.add(cyl(0.05, 0.05, 1.0, gold, 0, 0.7, 0)); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.045, 8, 40), gold); ring.rotation.x = Math.PI / 2; chand.add(ring); const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.035, 8, 32), gold); ring2.rotation.x = Math.PI / 2; ring2.position.y = 0.3; chand.add(ring2);
  const putChand = (x, y, h, sc = 1) => { const g = chand.clone(); g.position.set(x * S, h - 1.0, y * S); g.scale.setScalar(sc); root.add(g); };
  putChand(1600, 540, CEIL.hall, 1.2);
  [[2135, 520], [2480, 520], [2820, 520], [2560, 900], [2170, 940], [2620, 1200]].forEach(([x, y]) => putChand(x, y, CEIL.tables, 0.8));
  [[2200, 1420], [2600, 1400], [2880, 1420]].forEach(([x, y]) => putChand(x, y, CEIL.vip, 0.6));
  for (const y of [520, 680, 840, 1000, 1160]) for (let x = 300; x < 1120; x += 200) fixture(x * S, y * S, CEIL.machines, 0xffd8f0, 2.5, 0.25);
  [1450, 1600, 1750].forEach(x => { root.add(cyl(0.02, 0.02, 0.9, black, x * S, CEIL.bar - 0.45, 1075 * S)); root.add(cyl(0.12, 0.28, 0.25, std('shade', { color: 0x3b2412, side: THREE.DoubleSide }), x * S, CEIL.bar - 1.0, 1075 * S)); const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), basic('bulbw', { color: 0xffc37a, toneMapped: false })); b.position.set(x * S, CEIL.bar - 1.08, 1075 * S); root.add(b); });
  fixture(1260 * S, 980 * S, CEIL.toilettes, 0xe9f2ff, 1.6, 0.6); fixture(1600 * S, 1260 * S, CEIL.hallway, 0xffd0a0, 0.6, 0.6); fixture(1260 * S, 540 * S, CEIL.corridor, 0xffe9c4, 0.6, 0.6); fixture(2220 * S, 1720 * S, CEIL.bureau, 0xe9f2ff, 1.8, 0.6);
  LIGHTS.filter(l => l.y > 1368 && l.x < 2000).forEach(l => fixture(l.x * S, l.y * S, CEIL.labyrinth, 0xffc78a, 0.5, 0.5));

  // ------------------------------------------------------------ slot machines (instanced, detailed)
  const screens = {};
  const N = SLOTS.length;
  const dummy = new THREE.Object3D();
  const cabinetMat = std('cabinet', { color: 0x1c1c26, metalness: 0.5, roughness: 0.35 });
  const partDefs = {
    base: { geo: new THREE.BoxGeometry(1.0, 0.55, 0.62), mat: darkMetal, pos: [0, 0.275, 0] },
    body: { geo: new THREE.BoxGeometry(1.0, 1.0, 0.56), mat: cabinetMat, pos: [0, 1.05, -0.03] },
    bezel: { geo: new THREE.BoxGeometry(0.92, 0.74, 0.05), mat: black, pos: [0, 1.4, 0.26] },
    topper: { geo: new THREE.BoxGeometry(0.94, 0.32, 0.36), mat: darkMetal, pos: [0, 2.05, -0.05] },
    deck: { geo: new THREE.BoxGeometry(0.94, 0.08, 0.36), mat: darkMetal, pos: [0, 0.95, 0.22], rot: [0.35, 0, 0] },
    button: { geo: new THREE.CylinderGeometry(0.065, 0.065, 0.035, 14), mat: new THREE.MeshBasicMaterial({ color: 0xff3b30, toneMapped: false }), pos: [0, 1.01, 0.29], rot: [0.35, 0, 0] },
    btn2: { geo: new THREE.CylinderGeometry(0.035, 0.035, 0.03, 10), mat: new THREE.MeshBasicMaterial({ color: 0xffd54f, toneMapped: false }), pos: [-0.22, 1.0, 0.3], rot: [0.35, 0, 0] },
    btn3: { geo: new THREE.CylinderGeometry(0.035, 0.035, 0.03, 10), mat: new THREE.MeshBasicMaterial({ color: 0x66bb6a, toneMapped: false }), pos: [0.22, 1.0, 0.3], rot: [0.35, 0, 0] },
    tray: { geo: new THREE.BoxGeometry(0.7, 0.14, 0.16), mat: chrome, pos: [0, 0.66, 0.35] },
    acceptor: { geo: new THREE.BoxGeometry(0.14, 0.09, 0.06), mat: chrome, pos: [0.36, 0.86, 0.3] },
    led: { geo: new THREE.BoxGeometry(0.03, 0.015, 0.01), mat: new THREE.MeshBasicMaterial({ color: 0x40ff70, toneMapped: false }), pos: [0.36, 0.92, 0.33] },
    stripL: { geo: new THREE.BoxGeometry(0.035, 1.9, 0.06), mat: new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), pos: [-0.518, 1.05, 0.12], tint: true },
    stripR: { geo: new THREE.BoxGeometry(0.035, 1.9, 0.06), mat: new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), pos: [0.518, 1.05, 0.12], tint: true },
    stoolTop: { geo: new THREE.CylinderGeometry(0.23, 0.23, 0.08, 18), mat: leather, pos: [0, 0.56, 0.88] },
    stoolBack: { geo: new THREE.BoxGeometry(0.4, 0.3, 0.05), mat: leather, pos: [0, 0.78, 1.08] },
    stoolPole: { geo: new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8), mat: chrome, pos: [0, 0.27, 0.88] },
    stoolBase: { geo: new THREE.CylinderGeometry(0.2, 0.23, 0.04, 18), mat: chrome, pos: [0, 0.02, 0.88] },
    shadow: { geo: new THREE.PlaneGeometry(1.7, 2.2), mat: blobMat, pos: [0, 0.011, 0.3], rot: [-Math.PI / 2, 0, 0] },
  };
  const parts = {};
  for (const [k, d] of Object.entries(partDefs)) { const im = new THREE.InstancedMesh(d.geo, d.mat, N); im.frustumCulled = false; if (k === 'shadow') im.renderOrder = 1; parts[k] = im; root.add(im); }
  const byKind = {}, byLabel = {}; const slotHues = [];
  const rotG = new THREE.Object3D();
  const placeInstance = (im, j, s, lx, ly, lz) => { const cx = (s.x + s.w / 2) * S, cz = (s.y + s.h / 2) * S; const yaw = s.rot ? YAW[s.rot] : 0; rotG.position.set(cx, 0, cz); rotG.rotation.set(0, yaw, 0); rotG.updateMatrixWorld(true); dummy.position.set(lx, ly, lz); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); im.setMatrixAt(j, new THREE.Matrix4().multiplyMatrices(rotG.matrixWorld, dummy.matrix)); };
  SLOTS.forEach((s, i) => {
    const kind = s.kind || 'lucky'; const label = (s.label || 'SLOTS').toUpperCase();
    (byKind[kind] = byKind[kind] || []).push(i); (byLabel[label] = byLabel[label] || []).push(i);
    const cx = (s.x + s.w / 2) * S, cz = (s.y + s.h / 2) * S; const yaw = s.rot ? YAW[s.rot] : 0;
    const hue = new THREE.Color().setHSL(s.hue / 360, 0.85, 0.55); slotHues.push(hue);
    rotG.position.set(cx, 0, cz); rotG.rotation.set(0, yaw, 0); rotG.updateMatrixWorld(true);
    for (const [k, d] of Object.entries(partDefs)) {
      dummy.position.set(d.pos[0], d.pos[1], d.pos[2]); dummy.rotation.set(d.rot ? d.rot[0] : 0, d.rot ? d.rot[1] : 0, d.rot ? d.rot[2] : 0); dummy.scale.set(...(d.scale || [1, 1, 1])); dummy.updateMatrix();
      parts[k].setMatrixAt(i, new THREE.Matrix4().multiplyMatrices(rotG.matrixWorld, dummy.matrix)); if (d.tint) parts[k].setColorAt(i, hue);
    }
    const cs = Math.cos(yaw), sn = Math.sin(yaw);
    const toW = (lx, lz) => [cx + lx * cs + lz * sn, cz - lx * sn + lz * cs];
    const [bx2, bz2] = toW(0, 0.88);
    const half = s.rot ? [0.35, 0.52] : [0.52, 0.35];
    L.colliders.push({ x0: cx - half[0], z0: cz - half[1], x1: cx + half[0], z1: cz + half[1] });
    L.colliders.push({ x0: bx2 - 0.25, z0: bz2 - 0.25, x1: bx2 + 0.25, z1: bz2 + 0.25 });
    const hit = box(1.05, 2.3, 0.8, basic('hit', { visible: false }), cx, 1.15, cz); hit.rotation.y = yaw; hit.visible = false; hit.userData = { target: { kind: 'slot', s } }; root.add(hit); L.hits.push(hit);
  });
  for (const im of Object.values(parts)) { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; }
  const tmpC = new THREE.Color();
  L.updaters.push((t) => { for (let i = 0; i < N; i++) { const k = 0.55 + 0.45 * Math.max(0, Math.sin(t * 2.2 + i * 0.7)); tmpC.copy(slotHues[i]).multiplyScalar(k); parts.stripL.setColorAt(i, tmpC); parts.stripR.setColorAt(i, tmpC); } parts.stripL.instanceColor.needsUpdate = true; parts.stripR.instanceColor.needsUpdate = true; });
  const screenGeo = new THREE.PlaneGeometry(0.82, 0.62);
  for (const [kind, idx] of Object.entries(byKind)) {
    screens[kind] = slotScreen(kind); L.updaters.push((t) => screens[kind].update(t));
    const im = new THREE.InstancedMesh(screenGeo, new THREE.MeshBasicMaterial({ map: screens[kind].texture, toneMapped: false }), idx.length); im.frustumCulled = false;
    idx.forEach((i, j) => { const s = SLOTS[i]; placeInstance(im, j, s, 0, 1.4, 0.29); im.setColorAt(j, new THREE.Color().setHSL(s.hue / 360, 0.85, 0.55).lerp(new THREE.Color(0xffffff), 0.6)); });
    im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; root.add(im);
  }
  const marqueeGeo = new THREE.PlaneGeometry(0.9, 0.28);
  for (const [label, idx] of Object.entries(byLabel)) {
    const im = new THREE.InstancedMesh(marqueeGeo, new THREE.MeshBasicMaterial({ map: textTexture(label, { w: 512, h: 150, font: 'bold 78px "Bodoni 72", Georgia, serif', color: '#fff', bg: '#1a1a26', glow: 'rgba(255,255,255,0.8)' }), toneMapped: false }), idx.length); im.frustumCulled = false;
    idx.forEach((i, j) => { const s = SLOTS[i]; placeInstance(im, j, s, 0, 2.05, 0.135); im.setColorAt(j, new THREE.Color().setHSL(s.hue / 360, 0.9, 0.7)); });
    im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; root.add(im);
  }

  // ------------------------------------------------------------ tables
  const wheelTex = wheelTexture(256);
  const chip = (x, y, z, color) => cyl(0.045, 0.045, 0.012, std('chip' + color, { color, roughness: 0.5 }), x, y, z, 16);
  const chipStack = (g, x, z, color, n) => { for (let k = 0; k < n; k++) g.add(chip(x, 0.94 + k * 0.013, z, color)); };
  const tableStool = (g, x, z, face = 0) => { const st = new THREE.Group(); st.position.set(x, 0, z); st.rotation.y = face; st.add(cyl(0.23, 0.23, 0.08, leather, 0, 0.6, 0, 18)); st.add(box(0.42, 0.34, 0.05, leather, 0, 0.84, 0.2)); st.add(cyl(0.03, 0.03, 0.56, chrome, 0, 0.3, 0, 8)); st.add(cyl(0.2, 0.23, 0.04, chrome, 0, 0.02, 0, 18)); g.add(st); };
  const chipRack = (g, x, z) => { g.add(box(0.7, 0.05, 0.22, darkMetal, x, 0.95, z)); [0xb3261e, 0x1565c0, 0x2e7d32, 0x111111, 0xc6a14f].forEach((c, k) => { for (let j = 0; j < 8; j++) { const ch = cyl(0.04, 0.04, 0.012, std('chip' + c, { color: c, roughness: 0.5 }), x - 0.28 + k * 0.14, 0.98, z - 0.08 + j * 0.02, 12); ch.rotation.x = Math.PI / 2; g.add(ch); } }); };
  const tableBase = (o, kind, opts = {}) => {
    const w = o.w * S * TABLE_SCALE, d = o.h * S * TABLE_SCALE, cx = (o.x + o.w / 2) * S, cz = (o.y + o.h / 2) * S;
    const g = new THREE.Group(); g.position.set(cx, 0, cz);
    g.add(box(w + 0.32, 0.12, d + 0.32, wood, 0, 0.86, 0));
    g.add(box(w * 0.8, 0.8, d * 0.8, std('tblbase', { color: 0x2b1a0e, roughness: 0.9 }), 0, 0.4, 0));
    g.add(box(w + 0.32, 0.05, 0.14, leather, 0, 0.94, d / 2 + 0.09));
    const felt = new THREE.Mesh(new THREE.PlaneGeometry(w, d), std('felt-' + kind, { map: feltTexture(kind), roughness: 1 })); felt.rotation.x = -Math.PI / 2; felt.position.y = 0.925; g.add(felt);
    if (opts.stools) for (let k = 0; k < opts.stools; k++) tableStool(g, -w / 2 + 0.5 + k * (w - 1) / (opts.stools - 1), d / 2 + 0.55, Math.PI);
    if (opts.rack) chipRack(g, 0, -d / 2 + 0.25);
    blob(cx, cz, w + 1.2, d + 1.6);
    L.colliders.push({ x0: cx - w / 2 - 0.18, z0: cz - d / 2 - 0.18, x1: cx + w / 2 + 0.18, z1: cz + d / 2 + 0.18 });
    if (opts.stools) for (let k = 0; k < opts.stools; k++) { const sx = cx - w / 2 + 0.5 + k * (w - 1) / (opts.stools - 1), sz = cz + d / 2 + 0.55; L.colliders.push({ x0: sx - 0.24, z0: sz - 0.24, x1: sx + 0.24, z1: sz + 0.24 }); }
    return { g, w, d, cx, cz };
  };
  const roulette = (o) => {
    const t = tableBase(o, 'roulette', { stools: 3 });
    const wx = -t.w / 2 + 0.85;
    t.g.add(cyl(0.68, 0.72, 0.1, std('wheelSide', { color: 0x3b2412 }), wx, 0.97, 0, 48));
    const wheel = cyl(0.6, 0.62, 0.16, [std('wheelSide', { color: 0x3b2412 }), new THREE.MeshStandardMaterial({ map: wheelTex, roughness: 0.6 }), std('wheelSide', { color: 0x3b2412 })], wx, 1.02, 0, 48);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.035, 10, 48), gold); rim.rotation.x = Math.PI / 2; rim.position.set(wx, 1.1, 0);
    t.g.add(wheel, rim); L.updaters.push((tm) => { wheel.rotation.y = tm * 0.6; });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 10), white); t.g.add(ball); L.updaters.push((tm) => { ball.position.set(wx + Math.cos(-tm * 2.4) * 0.5, 1.12, Math.sin(-tm * 2.4) * 0.5); });
    chipStack(t.g, 0.3, 0.3, 0xb3261e, 4); chipStack(t.g, 0.8, -0.2, 0x1565c0, 3); chipStack(t.g, 1.2, 0.4, 0xc6a14f, 6); chipStack(t.g, 0.5, -0.5, 0xffffff, 2);
    t.g.add(cyl(0.02, 0.03, 0.12, chrome, 0.95, 1.0, 0.1, 8));
    const hb = historyBoardTexture(); L.rouletteBoards.push(hb);
    const px = t.w / 2 + 0.6, pz = -t.d / 2 - 0.4;
    t.g.add(cyl(0.03, 0.04, 2.2, chrome, px, 1.1, pz, 8)); t.g.add(box(1.3, 0.72, 0.06, black, px, 2.45, pz)); t.g.add(plane(1.24, 0.66, new THREE.MeshBasicMaterial({ map: hb.texture, toneMapped: false }), px, 2.45, pz + 0.035));
    root.add(t.g); return t;
  };
  for (const o of OBJECTS) {
    const cx = (o.x + o.w / 2) * S, cz = (o.y + o.h / 2) * S, w = o.w * S, d = o.h * S;
    let hitSize = null, hx = cx, hz = cz, hy = null;
    switch (o.type) {
      case 'caisse': case 'fidelite': case 'cage': {
        const isCage = o.type === 'cage';
        root.add(box(w, 1.05, d, wood, cx, 0.525, cz)); root.add(box(w + 0.06, 0.06, d + 0.1, marbleWhite, cx, 1.08, cz));
        if (isCage) { for (let k = 0; k < 7; k++) root.add(cyl(0.015, 0.015, 1.2, gold, cx, 1.7, cz - d / 2 + 0.2 + k * (d - 0.4) / 6, 6)); root.add(box(0.06, 0.06, d, gold, cx, 2.3, cz)); }
        else root.add(plane(w * 0.9, 0.9, glass, cx, 1.6, cz));
        const label = o.type === 'fidelite' ? 'FIDÉLITÉ' : 'CAISSE';
        const sign = plane(isCage ? 0.36 : w * 0.9, isCage ? 2.0 : 0.36, new THREE.MeshBasicMaterial({ map: textTexture(label, { w: 512, h: 128, font: 'bold 70px Inter, sans-serif', color: '#ffe8b0', bg: '#1b1b22' }), toneMapped: false }), isCage ? cx - w / 2 - 0.02 : cx, 2.3, isCage ? cz : cz + d / 2 + 0.02, isCage ? Math.PI / 2 : 0); if (isCage) sign.rotation.z = -Math.PI / 2; root.add(sign);
        blob(cx, cz, w + 0.8, d + 0.8);
        L.colliders.push({ x0: cx - w / 2, z0: cz - d / 2, x1: cx + w / 2, z1: cz + d / 2 }); hitSize = [w + 0.2, 2.2, d + 0.6];
        break;
      }
      case 'fountain': {
        root.add(cyl(1.1, 1.25, 0.5, marbleWhite, cx, 0.25, cz, 32)); const lip = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.06, 10, 48), marbleWhite); lip.rotation.x = Math.PI / 2; lip.position.set(cx, 0.5, cz); root.add(lip);
        const water = cyl(1.0, 1.0, 0.06, new THREE.MeshStandardMaterial({ color: 0x2b6f8a, emissive: 0x1d6fa0, emissiveIntensity: 0.6, transparent: true, opacity: 0.85, roughness: 0.05, metalness: 0.4 }), cx, 0.5, cz, 32); root.add(water);
        root.add(cyl(0.12, 0.18, 0.9, gold, cx, 0.9, cz, 12)); root.add(cyl(0.45, 0.3, 0.1, gold, cx, 1.3, cz, 24)); const orb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), gold); orb.position.set(cx, 1.5, cz); root.add(orb);
        const drops = []; for (let k = 0; k < 8; k++) { const dm = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), std('drop', { color: 0x9fd0ff, transparent: true, opacity: 0.7 })); root.add(dm); drops.push(dm); }
        L.updaters.push((t) => { water.material.emissiveIntensity = 0.5 + 0.25 * Math.sin(t * 2); drops.forEach((dm, k) => { const ph = (t * 1.6 + k / 8) % 1; const a = k / 8 * TAU; dm.position.set(cx + Math.cos(a) * (0.2 + ph * 0.7), 1.5 + Math.sin(ph * Math.PI) * 0.5 - ph * 0.9, cz + Math.sin(a) * (0.2 + ph * 0.7)); }); });
        blob(cx, cz, 3.0);
        L.colliders.push({ x0: cx - 1.25, z0: cz - 1.25, x1: cx + 1.25, z1: cz + 1.25 });
        break;
      }
      case 'atm': {
        root.add(box(w, 1.75, d, chrome, cx, 0.875, cz)); root.add(box(w - 0.06, 1.6, d - 0.06, darkMetal, cx, 0.88, cz + 0.02));
        root.add(plane(w * 0.8, 0.5, new THREE.MeshBasicMaterial({ map: textTexture('RETRAIT', { w: 256, h: 128, font: 'bold 54px Inter, sans-serif', color: '#e8f4ff', bg: '#0b3a55' }), toneMapped: false }), cx, 1.3, cz + d / 2 + 0.005));
        root.add(box(w * 0.6, 0.03, 0.02, basic('slotgold', { color: 0xffca28, toneMapped: false }), cx, 0.85, cz + d / 2 + 0.01)); root.add(box(w * 0.7, 0.16, 0.08, darkMetal, cx, 1.0, cz + d / 2 + 0.04));
        blob(cx, cz, w + 0.6, d + 0.6);
        L.colliders.push({ x0: cx - w / 2, z0: cz - d / 2, x1: cx + w / 2, z1: cz + d / 2 }); hitSize = [w + 0.2, 1.9, d + 0.4];
        break;
      }
      case 'roulette': { const t = roulette(o); hitSize = [t.w + 0.4, 1.6, t.d + 0.4]; break; }
      case 'baccarat': case 'blackjack': case 'viptable': case 'poker': {
        const kind = o.type === 'viptable' ? 'vip' : o.type === 'poker' ? 'blackjack' : o.type;
        const t = tableBase(o, kind, { stools: o.type === 'viptable' ? 0 : 5, rack: o.type !== 'viptable' });
        chipStack(t.g, -0.6, 0.3, 0xc6a14f, 3); chipStack(t.g, 0.7, -0.3, 0x1565c0, 5); chipStack(t.g, 0.2, 0.5, 0xb3261e, 2);
        const cardMat = std('cardw', { color: 0xffffff, roughness: 0.5 });
        [[-0.3, -0.2], [-0.15, -0.22], [0.5, 0.1], [0.9, -0.1]].forEach(([x, z], k) => { const c = box(0.12, 0.004, 0.17, cardMat, x, 0.935, z); c.rotation.y = (k * 0.7) % 0.5; t.g.add(c); });
        if (o.type !== 'viptable') t.g.add(box(0.28, 0.1, 0.18, black, t.w / 2 - 0.35, 0.98, -t.d / 2 + 0.25));
        if (o.type === 'poker') { t.g.add(plane(1.2, 0.3, new THREE.MeshBasicMaterial({ map: textTexture('TOURNOI · MINUIT', { w: 512, h: 128, font: 'bold 60px Inter, sans-serif', color: '#ffd98a', bg: '#101018' }), toneMapped: false, side: THREE.DoubleSide }), 0, 1.5, 0)); t.g.add(cyl(0.02, 0.02, 0.6, chrome, 0, 1.2, 0, 8)); }
        root.add(t.g); hitSize = o.label ? [t.w + 0.4, 1.6, t.d + 0.4] : null;
        break;
      }
      case 'craps': {
        const t = tableBase(o, 'blackjack', { stools: 0 });
        t.g.add(box(t.w + 0.3, 0.45, 0.16, leather, 0, 1.12, -t.d / 2 - 0.08)); t.g.add(box(t.w + 0.3, 0.45, 0.16, leather, 0, 1.12, t.d / 2 + 0.08)); t.g.add(box(0.16, 0.45, t.d + 0.3, leather, -t.w / 2 - 0.08, 1.12, 0)); t.g.add(box(0.16, 0.45, t.d + 0.3, leather, t.w / 2 + 0.08, 1.12, 0));
        [[0.6, 0.2], [0.72, 0.28]].forEach(([x, z]) => t.g.add(box(0.06, 0.06, 0.06, white, x, 0.96, z)));
        t.g.add(plane(1.0, 0.3, new THREE.MeshBasicMaterial({ map: textTexture('TABLE FERMÉE', { w: 512, h: 128, font: 'bold 60px Inter, sans-serif', color: '#f5f1e8', bg: '#3a1518' }), toneMapped: false, side: THREE.DoubleSide }), 0, 1.35, 0));
        root.add(t.g); hitSize = [t.w + 0.4, 1.6, t.d + 0.4];
        break;
      }
      case 'wheel': {
        const g = new THREE.Group(); g.position.set(cx, 0, cz);
        g.add(cyl(0.14, 0.24, 1.3, darkMetal, 0, 0.65, 0, 12)); g.add(cyl(0.5, 0.55, 0.08, darkMetal, 0, 0.04, 0, 20));
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.08, 54), [std('wheelSide', { color: 0x3b2412 }), new THREE.MeshStandardMaterial({ map: bigSixTexture(256), roughness: 0.6 }), std('wheelSide', { color: 0x3b2412 })]);
        disc.rotation.x = Math.PI / 2; disc.position.set(0, 1.75, 0.1); g.add(disc);
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.87, 0.04, 10, 54), gold); rim.position.set(0, 1.75, 0.1); g.add(rim);
        L.updaters.push((t) => { disc.rotation.y = t * 0.25; });
        const pointer = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 8), white); pointer.position.set(0, 2.7, 0.12); pointer.rotation.x = Math.PI; g.add(pointer);
        for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; const b = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), basic('bulb', { color: 0xffe9b8, toneMapped: false })); b.position.set(Math.cos(a) * 0.98, 1.75 + Math.sin(a) * 0.98, 0.12); g.add(b); }
        g.add(plane(1.6, 0.3, new THREE.MeshBasicMaterial({ map: textTexture('ROUE DE LA FORTUNE', { w: 768, h: 128, font: 'bold 60px "Bodoni 72", Georgia, serif', color: '#ffd98a', bg: '#101018', glow: '#ffb46a' }), toneMapped: false, side: THREE.DoubleSide }), 0, 3.0, 0.1));
        root.add(g); blob(cx, cz, 1.6);
        L.colliders.push({ x0: cx - 0.5, z0: cz - 0.3, x1: cx + 0.5, z1: cz + 0.3 }); hitSize = [1.9, 2.8, 0.7];
        break;
      }
      case 'barcounter': {
        root.add(box(w, 1.05, d, wood, cx, 0.525, cz)); root.add(box(w + 0.2, 0.06, d + 0.2, std('bartop', { color: 0x2b1a0e, roughness: 0.25, metalness: 0.1 }), cx, 1.08, cz));
        root.add(box(w, 0.04, 0.04, basic('barled', { color: 0xffb46a, toneMapped: false }), cx, 0.98, cz + d / 2 + 0.01)); root.add(box(w, 0.06, 0.06, chrome, cx, 0.3, cz + d / 2 + 0.2));
        const shelfZ = (1168 - 6) * S; root.add(box(w, 2.3, 0.3, std('shelfbg', { color: 0x1a0f0a }), cx, 1.15, shelfZ)); root.add(box(w, 0.6, 0.3, basic('shelflight', { color: 0xff9a5a, toneMapped: false }), cx, 1.2, shelfZ - 0.02)); root.add(box(w, 0.04, 0.3, chrome, cx, 1.5, shelfZ - 0.1)); root.add(box(w, 0.04, 0.3, chrome, cx, 1.95, shelfZ - 0.1));
        const cols = [0xff7043, 0xffca28, 0x29b6f6, 0xab47bc, 0x66bb6a, 0xef5350, 0x26c6da, 0xf5f1e8];
        for (let i = 0; i < 26; i++) { root.add(cyl(0.04, 0.05, 0.3 + (i % 3) * 0.06, new THREE.MeshStandardMaterial({ color: cols[i % cols.length], transparent: true, opacity: 0.85, roughness: 0.1, metalness: 0.1 }), cx - w / 2 + 0.3 + i * (w - 0.6) / 25, 1.68, shelfZ - 0.2, 10)); root.add(cyl(0.045, 0.05, 0.28, new THREE.MeshStandardMaterial({ color: cols[(i + 3) % cols.length], transparent: true, opacity: 0.85, roughness: 0.1 }), cx - w / 2 + 0.45 + i * (w - 0.9) / 25, 2.12, shelfZ - 0.2, 10)); }
        for (let i = 0; i < 5; i++) root.add(cyl(0.04, 0.03, 0.12, glass, cx - w / 2 + 1 + i * 2, 1.17, cz - 0.15, 10));
        [1440, 1500, 1560, 1620, 1680, 1740].forEach(x => { const sx = x * S, sz = 1040 * S; root.add(cyl(0.23, 0.23, 0.08, leather, sx, 0.7, sz, 18)); root.add(cyl(0.03, 0.03, 0.66, chrome, sx, 0.35, sz, 8)); root.add(cyl(0.2, 0.23, 0.04, chrome, sx, 0.02, sz, 18)); L.colliders.push({ x0: sx - 0.24, z0: sz - 0.24, x1: sx + 0.24, z1: sz + 0.24 }); });
        root.add(plane(2.2, 0.7, new THREE.MeshBasicMaterial({ map: neonTexture('BAR', '#ff9a5a', '#ff6b35'), transparent: true, toneMapped: false }), cx, 2.55, shelfZ - 0.17));
        blob(cx, cz, w + 1, d + 1.5);
        L.colliders.push({ x0: cx - w / 2 - 0.1, z0: cz - d / 2 - 0.1, x1: cx + w / 2 + 0.1, z1: cz + d / 2 + 0.1 }); hitSize = [w, 1.6, d + 0.6];
        break;
      }
      case 'roundtable': {
        root.add(cyl(0.6, 0.6, 0.05, wood, cx, 0.75, cz, 24)); root.add(cyl(0.05, 0.05, 0.75, chrome, cx, 0.37, cz, 8)); root.add(cyl(0.35, 0.4, 0.04, chrome, cx, 0.02, cz, 24));
        root.add(cyl(0.04, 0.03, 0.12, glass, cx + 0.2, 0.86, cz + 0.1, 10)); root.add(cyl(0.02, 0.02, 0.25, basic('candle', { color: 0xffe0a8, toneMapped: false }), cx - 0.15, 0.87, cz - 0.1, 8));
        for (const [ox, oz] of [[-0.85, 0], [0.85, 0]]) { const ch = new THREE.Group(); ch.position.set(cx + ox, 0, cz + oz); ch.rotation.y = ox < 0 ? -Math.PI / 2 : Math.PI / 2; ch.add(box(0.45, 0.06, 0.45, leather, 0, 0.45, 0)); ch.add(box(0.45, 0.5, 0.06, leather, 0, 0.73, -0.2)); [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]].forEach(([lx, lz]) => ch.add(box(0.04, 0.45, 0.04, darkMetal, lx, 0.22, lz))); root.add(ch); L.colliders.push({ x0: cx + ox - 0.25, z0: cz + oz - 0.25, x1: cx + ox + 0.25, z1: cz + oz + 0.25 }); }
        blob(cx, cz, 2.4, 1.4);
        L.colliders.push({ x0: cx - 0.6, z0: cz - 0.6, x1: cx + 0.6, z1: cz + 0.6 });
        break;
      }
      case 'sink': {
        root.add(box(w, 0.85, d, white, cx, 0.425, cz)); for (let i = 0; i < 3; i++) { const sx = cx - w / 2 + 0.5 + i * (w - 1) / 2; root.add(cyl(0.16, 0.14, 0.12, std('basin', { color: 0xdde3e6, roughness: 0.2 }), sx, 0.9, cz, 16)); root.add(cyl(0.015, 0.015, 0.22, chrome, sx, 0.98, cz - 0.15, 8)); }
        root.add(plane(w, 0.9, mirrorMat, cx, 1.6, (o.y + 2) * S + 0.01)); root.add(box(0.2, 0.3, 0.12, white, cx + w / 2 + 0.5, 1.3, (o.y + 2) * S + 0.1));
        L.colliders.push({ x0: cx - w / 2, z0: cz - d / 2, x1: cx + w / 2, z1: cz + d / 2 + 0.2 });
        break;
      }
      case 'phone': {
        root.add(box(0.08, 0.01, 0.16, black, cx, 0.86, cz));
        const scr = plane(0.07, 0.14, new THREE.MeshBasicMaterial({ color: 0x4fc3f7, toneMapped: false }), cx, 0.866, cz, 0, -Math.PI / 2); root.add(scr);
        L.updaters.push((t) => { scr.material.color.setHSL(0.55, 0.9, 0.45 + 0.25 * Math.max(0, Math.sin(t * 6))); });
        hitSize = [0.6, 0.5, 0.6]; hy = 0.86;
        break;
      }
      case 'sofa': {
        root.add(box(w, 0.45, d, velvet, cx, 0.225, cz)); root.add(box(w, 0.5, 0.25, velvet, cx, 0.7, cz - d / 2 + 0.125)); root.add(box(0.25, 0.3, d, velvet, cx - w / 2 + 0.125, 0.6, cz)); root.add(box(0.25, 0.3, d, velvet, cx + w / 2 - 0.125, 0.6, cz));
        root.add(box(0.5, 0.12, 0.5, std('cushion', { color: 0xc6a14f, roughness: 1 }), cx - w / 4, 0.5, cz + 0.1)); blob(cx, cz, w + 0.6, d + 0.6);
        L.colliders.push({ x0: cx - w / 2, z0: cz - d / 2, x1: cx + w / 2, z1: cz + d / 2 });
        break;
      }
      case 'desk': {
        root.add(box(w, 0.06, d, wood, cx, 0.76, cz)); root.add(box(w - 0.3, 0.7, d - 0.4, std('deskbody', { color: 0x2b1a0e }), cx, 0.36, cz));
        root.add(box(0.6, 0.4, 0.04, black, cx - 0.5, 1.05, cz)); root.add(plane(0.55, 0.34, new THREE.MeshBasicMaterial({ map: screenTexture('board'), toneMapped: false }), cx - 0.5, 1.05, cz + 0.025)); root.add(box(0.3, 0.02, 0.4, white, cx + 0.5, 0.8, cz)); root.add(cyl(0.05, 0.05, 0.12, black, cx + 1.0, 0.85, cz - 0.3, 10));
        const chair = new THREE.Group(); chair.position.set(cx, 0, cz - 1.0); chair.add(box(0.5, 0.08, 0.5, leather, 0, 0.5, 0)); chair.add(box(0.5, 0.6, 0.08, leather, 0, 0.85, -0.22)); chair.add(cyl(0.04, 0.04, 0.5, chrome, 0, 0.25, 0, 8)); root.add(chair);
        root.add(box(2.4, 2.2, 0.35, std('shelf', { color: 0x2b1a0e }), 2080 * S, 1.1, 1624 * S + 0.2)); for (let sh = 0; sh < 3; sh++) for (let b = 0; b < 12; b++) root.add(box(0.14, 0.32 + (b % 3) * 0.06, 0.24, new THREE.MeshStandardMaterial({ color: [0x7a1f22, 0x1b4636, 0xc6a14f, 0x3a3a4e, 0x8d6e63][(b + sh) % 5] }), 2080 * S - 1.05 + b * 0.19, 0.5 + sh * 0.65, 1624 * S + 0.2));
        L.colliders.push({ x0: cx - w / 2, z0: cz - d / 2, x1: cx + w / 2, z1: cz + d / 2 }); L.colliders.push({ x0: 2080 * S - 1.2, z0: 1624 * S, x1: 2080 * S + 1.2, z1: 1624 * S + 0.4 });
        break;
      }
      case 'dumpster': { root.add(box(w, 1.1, d, std('dump', { color: 0x2e7d32, roughness: 0.9 }), cx, 0.55, cz)); root.add(box(w, 0.08, d, std('dumplid', { color: 0x1b5e20 }), cx, 1.12, cz)); L.colliders.push({ x0: cx - w / 2, z0: cz - d / 2, x1: cx + w / 2, z1: cz + d / 2 }); break; }
      case 'busstop': {
        const px = (o.x + 7) * S, pz = (o.y + 60) * S;
        root.add(cyl(0.04, 0.04, 3, darkMetal, px, 1.5, pz, 8));
        root.add(plane(0.9, 0.6, new THREE.MeshBasicMaterial({ map: textTexture('BUS', { w: 256, h: 170, font: 'bold 90px Inter, sans-serif', color: '#fff', bg: '#1565c0' }), toneMapped: false, side: THREE.DoubleSide }), px, 2.8, pz));
        root.add(box(1.8, 0.06, 0.4, wood, 9.9, 0.45, 4.0)); root.add(box(0.06, 0.45, 0.4, darkMetal, 9.1, 0.22, 4.0)); root.add(box(0.06, 0.45, 0.4, darkMetal, 10.7, 0.22, 4.0));
        root.add(box(3.2, 0.06, 1.6, glass, 9.9, 2.6, 4.0)); root.add(cyl(0.03, 0.03, 2.6, darkMetal, 8.4, 1.3, 4.7, 8)); root.add(cyl(0.03, 0.03, 2.6, darkMetal, 11.4, 1.3, 4.7, 8)); root.add(plane(3.0, 1.8, glass, 9.9, 1.6, 4.75));
        { const pm = new THREE.MeshStandardMaterial({ map: posterTexture(['SPECTACLE', 'CE SOIR 22 H', 'GRAND CASINO']), roughness: 0.9, side: THREE.DoubleSide }); loadAsset('poster_show', (t) => { pm.map = t; pm.needsUpdate = true; }, { repeat: false }); root.add(plane(0.9, 1.3, pm, 11.2, 1.6, 4.72)); }
        L.colliders.push({ x0: 9.0, z0: 3.8, x1: 10.8, z1: 4.2 }); L.colliders.push({ x0: px - 0.1, z0: pz - 0.1, x1: px + 0.1, z1: pz + 0.1 });
        hitSize = [2.4, 3, 1.6]; hx = 9.9; hz = 4.0;
        break;
      }
      case 'clock': {
        const ck = clockTexture(); L.clock = ck;
        const face = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.08, 32), [darkMetal, new THREE.MeshBasicMaterial({ map: ck.texture, toneMapped: false }), darkMetal]);
        face.rotation.x = Math.PI / 2; face.position.set(1270 * S, 2.9, 320 * S - 0.06); root.add(face); const cring = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.03, 8, 32), gold); cring.position.set(1270 * S, 2.9, 320 * S - 0.1); root.add(cring);
        hitSize = [1.2, 1.2, 0.8]; hx = 1270 * S; hz = 320 * S - 0.4; hy = 2.9;
        break;
      }
      case 'entrance': {
        const x0 = 1480 * S, x1 = 1560 * S, z = 332 * S;
        root.add(cyl(0.05, 0.05, 1.1, gold, x0 + 0.08, 0.55, z, 10)); root.add(cyl(0.05, 0.05, 1.1, gold, x1 - 0.08, 0.55, z, 10));
        root.add(plane(2.0, 0.34, new THREE.MeshBasicMaterial({ map: textTexture('BIENVENUE', { w: 512, h: 96, font: 'bold 60px "Bodoni 72", Georgia, serif', color: '#ffd98a', bg: '#101018', glow: '#ffb46a' }), toneMapped: false }), (x0 + x1) / 2, 2.4, 344 * S + 0.02));
        hitSize = [2, 1.6, 1.2];
        break;
      }
      case 'plaque': {
        root.add(plane(w, 0.4, new THREE.MeshStandardMaterial({ map: textTexture('18 AOÛT 1913 · LE NOIR EST SORTI 26 FOIS', { w: 1024, h: 128, font: 'bold 48px Inter, sans-serif', color: '#3b2412', bg: '#c6a14f' }), metalness: 0.6, roughness: 0.4 }), cx, 1.9, (o.y + 24) * S + 0.02));
        hitSize = [w, 1, 1.2]; hz = (o.y + 24) * S + 0.5; hy = 1.9;
        break;
      }
      case 'theo': case 'board': {
        const wd = o.type === 'theo' ? 2.2 : 4.5, ht = o.type === 'theo' ? 1.2 : 1.6; const z = o.y * S + 0.03;
        root.add(box(wd + 0.1, ht + 0.1, 0.06, black, cx, 2.0, z - 0.03)); root.add(plane(wd, ht, new THREE.MeshBasicMaterial({ map: screenTexture(o.type), toneMapped: false }), cx, 2.0, z));
        hitSize = [wd, 2, 1.4]; hz = z + 0.6; hy = 2.0;
        break;
      }
      case 'sign': {
        const face = o.id === 'sign0' ? -1 : 1;
        root.add(plane(1.6, 0.4, new THREE.MeshBasicMaterial({ map: textTexture(o.text, { w: 512, h: 128, font: 'bold 60px Inter, sans-serif', color: '#ffd08a', bg: '#101018', glow: 'rgba(255,180,106,0.9)' }), toneMapped: false, side: THREE.DoubleSide }), cx, 2.15, cz + (face > 0 ? 0.02 : -0.02), face > 0 ? 0 : Math.PI));
        break;
      }
      case 'mirror': { root.add(plane(w, 1.6, mirrorMat, cx, 1.5, o.y * S - 0.04)); root.add(box(w + 0.1, 1.7, 0.03, gold, cx, 1.5, o.y * S - 0.06)); break; }
      case 'staffdoor': {
        const dz = (o.y + o.h / 2) * S, dx = (o.x + o.w / 2) * S;
        root.add(box(0.1, 2.1, o.h * S - 0.1, std('door', { color: 0x5a5f66, roughness: 0.7 }), dx, 1.05, dz)); root.add(box(0.02, 0.06, 0.1, gold, dx - 0.06, 1.0, dz + 0.5));
        root.add(plane(0.8, 0.2, new THREE.MeshBasicMaterial({ map: textTexture('PERSONNEL', { w: 512, h: 128, font: 'bold 64px Inter, sans-serif', color: '#e0e0e0', bg: '#333' }), toneMapped: false, side: THREE.DoubleSide }), dx - 0.06, 1.75, dz, -Math.PI / 2));
        hitSize = [1.2, 2.2, 2.2]; hx = dx; hz = dz;
        break;
      }
      case 'exitdoor': {
        const dz = (o.y + o.h / 2) * S, dx = (o.x + o.w / 2) * S;
        const door = box(0.1, 2.1, o.h * S - 0.1, std('exitdoor', { color: 0x44484f, roughness: 0.7 }), dx, 1.05, dz); root.add(door); L.dynamic.exitDoor = door;
        root.add(box(0.03, 0.06, 0.06, gold, dx + 0.06, 1.0, dz + 0.5)); root.add(box(0.2, 0.06, 0.4, basic('exitlamp', { color: 0x7fd0ff, toneMapped: false }), dx + 0.2, 2.35, dz));
        hitSize = [1.4, 2.2, 2.2]; hx = dx; hz = dz;
        break;
      }
      case 'vipdoor': {
        const z = (o.y + o.h / 2) * S, x0 = o.x * S, x1 = (o.x + o.w) * S;
        const g = new THREE.Group();
        g.add(cyl(0.04, 0.06, 1.0, gold, x0 + 0.15, 0.5, z, 10)); g.add(cyl(0.04, 0.06, 1.0, gold, x1 - 0.15, 0.5, z, 10));
        const k1 = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), gold); k1.position.set(x0 + 0.15, 1.02, z); g.add(k1); const k2 = k1.clone(); k2.position.x = x1 - 0.15; g.add(k2);
        const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(x0 + 0.15, 0.95, z), new THREE.Vector3((x0 + x1) / 2, 0.7, z), new THREE.Vector3(x1 - 0.15, 0.95, z));
        g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.03, 8, false), velvet));
        g.visible = !state.flags.vipOpen; root.add(g); L.dynamic.vipRope = g;
        const c = { x0: x0, z0: z - 0.2, x1: x1, z1: z + 0.2, vip: true }; L.colliders.push(c); L.dynamic.vipCollider = c;
        hitSize = state.flags.vipOpen ? null : [2.2, 1.6, 1.2];
        break;
      }
      case 'poster': {
        root.add(plane(0.55, 0.9, new THREE.MeshStandardMaterial({ map: textTexture('JOUEURS INFO SERVICE · 09 74 75 13 13', { w: 512, h: 840, font: 'bold 44px Inter, sans-serif', color: '#1b4636', bg: '#f5f1e8' }), roughness: 0.9 }), 176 * S - 0.02, 1.6, cz, -Math.PI / 2));
        hitSize = [1.0, 1.4, 1.2]; hx = 176 * S - 0.4; hy = 1.6;
        break;
      }
    }
    if (hitSize && o.label) {
      const hit = box(hitSize[0], hitSize[1], hitSize[2], basic('hit', { visible: false }), hx, hy ?? hitSize[1] / 2, hz); hit.visible = false; hit.userData = { target: { kind: 'object', o } }; root.add(hit); L.hits.push(hit);
      if (o.type === 'vipdoor') L.dynamic.vipHit = hit;
    }
  }

  // ------------------------------------------------------------ street & building dressing
  const neonTex = textTexture('CASINO', { w: 1024, h: 256, font: 'bold 190px "Bodoni 72", Didot, Georgia, serif', color: '#ff6b85', bg: 'rgba(0,0,0,0)', glow: '#ff4d6d' });
  const neonMat = new THREE.MeshBasicMaterial({ map: neonTex, transparent: true, toneMapped: false });
  root.add(plane(6.4, 1.6, neonMat, 1520 * S, 3.45, 320 * S - 0.12, Math.PI));
  root.add(box(6.8, 1.9, 0.12, std('marqueeBox', { color: 0x15161c }), 1520 * S, 3.45, 320 * S - 0.03));
  root.add(box(6.8, 0.06, 0.06, gold, 1520 * S, 4.42, 320 * S - 0.1)); root.add(box(6.8, 0.06, 0.06, gold, 1520 * S, 2.48, 320 * S - 0.1));
  const bulbs = []; for (let i = 0; i < 22; i++) { for (const y of [2.6, 4.3]) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffe082, toneMapped: false })); b.position.set(1520 * S - 3.2 + i * 0.305, y, 320 * S - 0.14); root.add(b); bulbs.push(b); } }
  L.updaters.push((t) => { const on = Math.floor(t * 6); bulbs.forEach((b, i) => { b.material.color.setHex((on + i) % 4 === 0 ? 0x4d3d1f : 0xffe082); }); neonMat.opacity = 0.85 + 0.15 * Math.sin(t * 6); });
  root.add(box(3.2, 0.08, 1.4, velvet, 1520 * S, 2.35, 320 * S - 0.8)); root.add(box(3.2, 0.12, 0.08, gold, 1520 * S, 2.3, 320 * S - 1.5));
  for (let k = 0; k < 4; k++) root.add(cyl(0.02, 0.02, 0.5, gold, 1520 * S - 1.5 + k, 2.6, 320 * S - 1.45, 6));
  root.add(box(1.6, 0.02, 4.6, velvet, 1520 * S, 0.01, 350 * S));
  [1380, 1660, 900, 2200, 2700].forEach(x => { root.add(box(0.2, 0.35, 0.2, darkMetal, x * S, 2.6, 320 * S - 0.15)); root.add(box(0.14, 0.2, 0.14, basic('lantern', { color: 0xffd9a0, toneMapped: false }), x * S, 2.6, 320 * S - 0.16)); L.lightSpots.push({ x: x * S, y: 2.6, z: 320 * S - 0.6, color: new THREE.Color(0xffd9a0), intensity: 22, distance: 8 }); });
  for (const x of [520, 900, 1900, 2400, 2800]) { const lx = x * S, lz = 150 * S; root.add(cyl(0.05, 0.08, 4.5, darkMetal, lx, 2.25, lz, 10)); root.add(box(0.5, 0.08, 0.3, darkMetal, lx, 4.5, lz)); root.add(box(0.4, 0.05, 0.22, basic('lampbulb', { color: 0xffe0a8, toneMapped: false }), lx, 4.44, lz)); L.colliders.push({ x0: lx - 0.1, z0: lz - 0.1, x1: lx + 0.1, z1: lz + 0.1 }); blob(lx, lz, 0.8); }
  [[700, 0x8d2f2f, false], [1150, 0x2f4f8d, false], [1700, 0xf5c518, true], [2100, 0x3a3a3a, false], [2650, 0x6f6f6f, false]].forEach(([x, c, taxi]) => {
    const cx = (x + 60) * S, cz = 88 * S; const g = new THREE.Group(); g.position.set(cx, 0, cz);
    const paint = new THREE.MeshStandardMaterial({ color: c, metalness: 0.7, roughness: 0.25, envMapIntensity: 1 });
    g.add(box(3.0, 0.5, 1.6, paint, 0, 0.5, 0)); g.add(box(1.7, 0.5, 1.4, paint, -0.1, 1.0, 0)); g.add(box(1.5, 0.42, 1.42, glass, -0.1, 1.02, 0));
    [[-1.0, 0.7], [1.0, 0.7], [-1.0, -0.7], [1.0, -0.7]].forEach(([wx, wz]) => { const wh = cyl(0.3, 0.3, 0.2, black, wx, 0.3, wz, 14); wh.rotation.x = Math.PI / 2; g.add(wh); const hub = cyl(0.14, 0.14, 0.22, chrome, wx, 0.3, wz, 12); hub.rotation.x = Math.PI / 2; g.add(hub); });
    g.add(box(0.1, 0.12, 0.3, basic('headlight', { color: 0xffe9a8, toneMapped: false }), 1.5, 0.55, 0.55)); g.add(box(0.1, 0.12, 0.3, basic('headlight', { color: 0xffe9a8, toneMapped: false }), 1.5, 0.55, -0.55));
    g.add(box(0.1, 0.1, 0.3, basic('taillight', { color: 0xff3b30, toneMapped: false }), -1.5, 0.55, 0.55)); g.add(box(0.1, 0.1, 0.3, basic('taillight', { color: 0xff3b30, toneMapped: false }), -1.5, 0.55, -0.55));
    if (taxi) g.add(plane(0.7, 0.22, new THREE.MeshBasicMaterial({ map: textTexture('TAXI', { w: 256, h: 80, font: 'bold 56px Inter, sans-serif', color: '#111', bg: '#ffe082' }), toneMapped: false, side: THREE.DoubleSide }), -0.1, 1.38, 0));
    root.add(g); blob(cx, cz, 3.6, 2.2); L.colliders.push({ x0: cx - 1.5, z0: cz - 0.8, x1: cx + 1.5, z1: cz + 0.8 });
  });
  root.add(cyl(0.25, 0.22, 0.9, darkMetal, 458 * S, 0.45, 158 * S, 12));
  root.add(box(0.3, 0.3, 0.3, darkMetal, 176 * S - 0.2, 3.2, 878 * S)); root.add(box(0.2, 0.06, 0.2, basic('lampbulb', { color: 0xffe0a8, toneMapped: false }), 176 * S - 0.25, 3.05, 878 * S));
  const puddle = cyl(0.9, 0.9, 0.005, new THREE.MeshStandardMaterial({ color: 0x8fb3d9, metalness: 0.9, roughness: 0.05, transparent: true, opacity: 0.5 }), 70 * S, 0.01, 700 * S, 24); puddle.scale.z = 0.4; root.add(puddle);
  root.add(box(0.6, 0.5, 0.5, std('cardboard', { color: 0x8d6e63, roughness: 1 }), 1.2, 0.25, 40)); root.add(box(0.5, 0.4, 0.4, std('cardboard', {}), 1.5, 0.7, 40.1)); const pipe = cyl(0.06, 0.06, 40, darkMetal, 176 * S - 0.12, 2.5, 28, 8); pipe.rotation.x = Math.PI / 2; root.add(pipe);
  root.add(plane(0.7, 1.0, new THREE.MeshStandardMaterial({ map: posterTexture(['CONCERT', 'SAMEDI', 'COMPLET'], ['#7a1f22', '#ffd98a', '#f5f1e8']), roughness: 0.9 }), 176 * S - 0.02, 1.7, 22, -Math.PI / 2));

  // ------------------------------------------------------------ interior dressing
  const plant = (x, z, big = false) => { const g = new THREE.Group(); g.position.set(x, 0, z); const sc = big ? 1.5 : 1; g.add(cyl(0.22 * sc, 0.18 * sc, 0.4 * sc, std('pot', { color: 0x5d4037 }), 0, 0.2 * sc, 0, 12)); for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.16 * sc, 0.95 * sc, 6), std('leaf', { color: 0x2e7d32, roughness: 1 })); leaf.position.set(Math.cos(a) * 0.2 * sc, 0.78 * sc, Math.sin(a) * 0.2 * sc); leaf.rotation.set(Math.sin(a) * 0.55, 0, -Math.cos(a) * 0.55); g.add(leaf); } root.add(g); blob(x, z, 0.9 * sc); L.colliders.push({ x0: x - 0.3, z0: z - 0.3, x1: x + 0.3, z1: z + 0.3 }); };
  [[1390, 720], [1810, 720], [1880, 1300], [2980, 1300], [2060, 1560], [2960, 1560], [240, 380], [1120, 380], [1380, 380], [1820, 380], [2200, 1900], [300, 1900]].forEach(([x, y], i) => plant(x * S, y * S, i < 6));
  const frame = (x, y, z, ry, i, w = 1.0, h = 1.3) => { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; g.add(box(w + 0.12, h + 0.12, 0.05, gold, 0, 0, -0.02)); const m = new THREE.MeshStandardMaterial({ map: artTexture(i), roughness: 0.8 }); loadAsset('art' + (1 + (i % 3)), (t) => { m.map = t; m.needsUpdate = true; }, { repeat: false }); g.add(plane(w, h, m, 0, 0, 0.01)); root.add(g); };
  frame(2300 * S, 1.9, 1368 * S + 0.03, 0, 0); frame(2700 * S, 1.9, 1368 * S + 0.03, 0, 1); frame(2500 * S, 1.9, 1600 * S - 0.03, Math.PI, 2, 1.6, 1.0);
  frame(1400 * S, 1.9, 768 * S + 0.03, 0, 3, 0.9, 1.2); frame(2350 * S, 1.8, 1624 * S + 0.03, 0, 1, 0.8, 1.0);
  root.add(box(1.0, 0.7, 0.5, gold, 2920 * S, 0.35, 1412 * S)); [0xffca28, 0x29b6f6, 0xef5350].forEach((c, i) => root.add(cyl(0.04, 0.05, 0.3, new THREE.MeshStandardMaterial({ color: c, transparent: true, opacity: 0.8 }), 2920 * S - 0.3 + i * 0.3, 0.85, 1412 * S, 10)));
  root.add(cyl(0.16, 0.12, 0.28, chrome, 2600 * S, 1.06, 1440 * S + 0.3, 14)); root.add(cyl(0.05, 0.06, 0.34, std('champ', { color: 0x1b4636 }), 2600 * S, 1.3, 1440 * S + 0.3, 10));
  L.colliders.push({ x0: 2920 * S - 0.5, z0: 1412 * S - 0.25, x1: 2920 * S + 0.5, z1: 1412 * S + 0.25 });
  root.add(box(1.0, 1.25, 1.0, std('safe', { color: 0x37474f, metalness: 0.7, roughness: 0.4 }), 2360 * S, 0.625, 1865 * S)); const dial = cyl(0.12, 0.12, 0.05, gold, 2360 * S - 0.52, 0.7, 1865 * S, 12); dial.rotation.z = Math.PI / 2; root.add(dial);
  L.colliders.push({ x0: 2360 * S - 0.5, z0: 1865 * S - 0.5, x1: 2360 * S + 0.5, z1: 1865 * S + 0.5 });
  root.add(box(1.0, 2.0, 0.05, std('stall', { color: 0xb0bec5 }), 1310 * S, 1.0, 1050 * S)); root.add(box(0.05, 2.0, 0.8, std('stall', { color: 0xb0bec5 }), 1290 * S, 1.0, 1066 * S)); root.add(box(0.3, 0.4, 0.2, chrome, 1184 * S + 0.12, 1.3, 1000 * S));
  const ticker = tickerTexture(); L.updaters.push((t) => { if (Math.floor(t * 30) % 2 === 0) ticker.update(t); });
  root.add(box(8.2, 0.7, 0.14, black, 680 * S, 2.35, 344 * S + 0.07)); root.add(plane(8, 0.6, new THREE.MeshBasicMaterial({ map: ticker.texture, toneMapped: false }), 680 * S, 2.35, 344 * S + 0.15));
  root.add(box(1.2, 1.4, 0.6, chrome, 1120 * S, 0.7, 1300 * S)); root.add(plane(1.0, 0.3, new THREE.MeshBasicMaterial({ map: textTexture('MONNAIE', { w: 512, h: 128, font: 'bold 60px Inter, sans-serif', color: '#ffe8b0', bg: '#1b1b22' }), toneMapped: false }), 1120 * S, 1.6, 1300 * S + 0.31)); L.colliders.push({ x0: 1120 * S - 0.6, z0: 1300 * S - 0.3, x1: 1120 * S + 0.6, z1: 1300 * S + 0.3 });
  const tv = tvTexture(); L.updaters.push((t) => { if (Math.floor(t * 30) % 3 === 0) tv.update(t); });
  root.add(box(0.06, 1.0, 1.7, black, 1840 * S - 0.06, 2.1, 900 * S)); root.add(plane(1.6, 0.9, new THREE.MeshBasicMaterial({ map: tv.texture, toneMapped: false }), 1840 * S - 0.1, 2.1, 900 * S, -Math.PI / 2));
  const piano = new THREE.Group(); piano.position.set(1400 * S, 0, 800 * S); piano.add(box(1.5, 0.5, 0.7, std('piano', { color: 0x0d0d10, metalness: 0.4, roughness: 0.15, envMapIntensity: 0.8 }), 0, 0.85, 0)); piano.add(box(1.4, 0.03, 0.2, white, 0, 1.11, 0.3)); for (let k = 0; k < 20; k++) if (k % 7 !== 2 && k % 7 !== 6) piano.add(box(0.03, 0.03, 0.12, black, -0.66 + k * 0.07, 1.14, 0.26)); [[-0.65, -0.3], [0.65, -0.3], [-0.65, 0.3], [0.65, 0.3]].forEach(([x, z]) => piano.add(box(0.08, 0.6, 0.08, black, x, 0.3, z))); piano.add(cyl(0.2, 0.2, 0.06, leather, 0, 0.55, 0.75, 14)); piano.add(cyl(0.03, 0.03, 0.5, chrome, 0, 0.27, 0.75, 8)); root.add(piano); blob(1400 * S, 800 * S, 2.2, 1.6);
  L.colliders.push({ x0: 1400 * S - 0.8, z0: 800 * S - 0.4, x1: 1400 * S + 0.8, z1: 800 * S + 0.95 });
  root.add(plane(1.6, 0.3, new THREE.MeshBasicMaterial({ map: textTexture('RESTAURANT · SPECTACLE ↓', { w: 768, h: 128, font: 'bold 52px Inter, sans-serif', color: '#ffd08a', bg: '#101018' }), toneMapped: false, side: THREE.DoubleSide }), 1600 * S, 2.2, 1172 * S + 0.03));
  const fakeDoor = (x, z, label) => { root.add(box(1.2, 2.2, 0.08, std('door2', { color: 0x3b2412, roughness: 0.6 }), x, 1.1, z)); root.add(box(0.05, 0.08, 0.1, gold, x + 0.45, 1.0, z + 0.06)); root.add(plane(1.0, 0.24, new THREE.MeshBasicMaterial({ map: textTexture(label, { w: 512, h: 128, font: 'bold 64px Inter, sans-serif', color: '#ffd08a', bg: '#101018' }), toneMapped: false }), x, 2.35, z + 0.06)); };
  fakeDoor(1400 * S, 1368 * S + 0.05, 'RESTAURANT'); fakeDoor(1800 * S, 1656 * S + 0.05, 'SPECTACLE'); fakeDoor(500 * S, 1812 * S + 0.05, 'RÉSERVÉ');
  [[600, 1372, ['SPECTACLE', 'CE SOIR 22 H', 'GRAND CASINO']], [1200, 1528, ['BUFFET', 'À VOLONTÉ', 'DÈS 19 H']], [700, 1684, ['JACKPOT', '1 248 391 €', 'TENTEZ-LE']], [1500, 1816, ['NOUVEAU', 'MÉGALIGNES', 'SALLE DES MACHINES']]].forEach(([x, y, lines], i) => root.add(plane(0.8, 1.15, new THREE.MeshStandardMaterial({ map: posterTexture(lines, i % 2 ? ['#141210', '#ffd98a', '#f5f1e8'] : ['#0e2a20', '#c6a14f', '#f5f1e8']), roughness: 0.9 }), x * S, 1.7, y * S + 0.04)));
  [[350, 1450], [1650, 1600], [1000, 1760]].forEach(([x, y]) => { root.add(box(1.4, 0.06, 0.45, leather, x * S, 0.45, y * S)); root.add(box(0.06, 0.45, 0.45, darkMetal, x * S - 0.6, 0.22, y * S)); root.add(box(0.06, 0.45, 0.45, darkMetal, x * S + 0.6, 0.22, y * S)); L.colliders.push({ x0: x * S - 0.7, z0: y * S - 0.25, x1: x * S + 0.7, z1: y * S + 0.25 }); });

  // ------------------------------------------------------------ point-light candidates
  for (const li of LIGHTS) {
    if (li.slot) continue;
    L.lightSpots.push({ x: li.x * S, y: li.aisle ? CEIL.machines - 0.3 : (li.y < 320 ? 4.3 : 2.4), z: li.y * S, color: new THREE.Color(li.color), intensity: li.a * 42 * (li.color === '#ff4d6d' ? 1.4 : 1) * (li.y > 1368 && li.x < 2000 ? 1.8 : 1), distance: li.r * S * 2.6, neon: li.color === '#ff4d6d' });
  }
  L.lightSpots.forEach(l => { if (Math.abs(l.x - 1600 * S) < 0.5 && Math.abs(l.z - 540 * S) < 0.5) l.y = 3.2; });

  L.root = root;
  return L;
}
