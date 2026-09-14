// Builds the 3D casino from the shared 2D layout (world.js). 1 world px = 1/40 m.
import * as THREE from 'three';
import { ROOMS, WALLS, SLOTS, OBJECTS, LIGHTS, WORLD } from '../world.js';
import { patternTexture, textTexture, wheelTexture, bigSixTexture, feltTexture, slotScreen, clockTexture, screenTexture, gradientSky } from './textures.js';

export const S = 1 / 40;
const TAU = Math.PI * 2;
const WALL_H = 4.2;
const CEIL = { hall: 4.2, corridor: 2.6, machines: 2.7, toilettes: 2.6, tables: 3.6, bar: 3.0, hallway: 2.6, labyrinth: 2.5, vip: 3.0, bureau: 2.8 };
const TABLE_SCALE = 0.72;

// ------------------------------------------------------------------ helpers
const mats = {};
function std(key, opts) { if (!mats[key]) mats[key] = new THREE.MeshStandardMaterial(opts); return mats[key]; }
function basic(key, opts) { if (!mats[key]) mats[key] = new THREE.MeshBasicMaterial(opts); return mats[key]; }
function box(w, h, d, material, x, y, z) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material); m.position.set(x, y, z); return m; }
function cyl(rt, rb, h, material, x, y, z, seg = 24) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material); m.position.set(x, y, z); return m; }
function plane(w, h, material, x, y, z, ry = 0, rx = 0) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); return m; }
function floorMat(name) { return std('floor-' + name, { map: patternTexture(name, 256), roughness: 0.95, metalness: 0 }); }
function scaledUV(geo, w, h, size) { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / size, uv.getY(i) * h / size); uv.needsUpdate = true; }

export function buildLevel(scene, state) {
  const L = { colliders: [], hits: [], wallMeshes: [], updaters: [], lightSpots: [], dynamic: {}, screens: {}, npcAnchors: {} };
  const root = new THREE.Group(); scene.add(root);
  const wallMat = std('wall', { map: patternTexture('wall', 256), roughness: 0.85 });
  const brickMat = std('brick', { map: patternTexture('brick', 256), roughness: 0.95 });
  const wallpaperMat = std('wallpaper', { map: patternTexture('wallpaper', 256), roughness: 0.9 });
  const ceilMat = std('ceil', { map: patternTexture('ceiling', 256), roughness: 1, color: 0x9a9aa6 });
  const gold = std('gold', { color: 0xc6a14f, metalness: 0.85, roughness: 0.3 });
  const wood = std('wood', { map: patternTexture('wood', 256), roughness: 0.6 });
  const darkMetal = std('metal', { color: 0x23232b, metalness: 0.6, roughness: 0.45 });
  const black = std('black', { color: 0x111114, roughness: 0.9 });
  const white = std('white', { color: 0xf5f1e8, roughness: 0.8 });
  const red = std('red', { color: 0xb3261e, roughness: 0.7 });
  const velvet = std('velvet', { color: 0x7a1f22, roughness: 1 });
  const glass = std('glass', { color: 0x9fd0ff, transparent: true, opacity: 0.25, roughness: 0.05, metalness: 0.1 });
  const mirrorMat = std('mirror', { color: 0xb8cfe0, metalness: 1, roughness: 0.08 });
  const stoolMat = std('stool', { color: 0x3e2723, roughness: 0.8 });

  // ------------------------------------------------------------ sky & ground
  const sky = gradientSky(); scene.add(sky); L.sky = sky;
  const stars = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(Array.from({ length: 900 * 3 }, (_, i) => { const k = i % 3; const a = Math.random() * TAU, e = Math.random() * 0.9 + 0.1; const r = 380; return k === 0 ? Math.cos(a) * Math.cos(e) * r : k === 1 ? Math.sin(e) * r : Math.sin(a) * Math.cos(e) * r; }), 3)), new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: true, transparent: true, opacity: 0.85 }));
  stars.position.set(WORLD.w * S / 2, 0, WORLD.h * S / 2); scene.add(stars); L.stars = stars;
  const moon = new THREE.Mesh(new THREE.SphereGeometry(6, 16, 16), basic('moon', { color: 0xfff2d0 })); moon.position.set(WORLD.w * S / 2 + 120, 120, -220); scene.add(moon);
  // ground plane far around
  const ground = plane(600, 600, floorMat('asphalt'), WORLD.w * S / 2, -0.02, WORLD.h * S / 2, 0, -Math.PI / 2); scaledUV(ground.geometry, 600, 600, 2); root.add(ground);

  // ------------------------------------------------------------ floors & ceilings
  for (const r of ROOMS) {
    const w = r.w * S, h = r.h * S, cx = (r.x + r.w / 2) * S, cz = (r.y + r.h / 2) * S;
    if (r.id === 'street') {
      const road = plane(w, 110 * S, floorMat('asphalt'), cx, 0.001, 55 * S, 0, -Math.PI / 2); scaledUV(road.geometry, w, 110 * S, 2); root.add(road);
      const side = plane(w, (r.h - 110) * S, floorMat('concrete'), cx, 0.02, (110 + (r.h - 110) / 2) * S, 0, -Math.PI / 2); scaledUV(side.geometry, w, (r.h - 110) * S, 1.5); root.add(side);
      // curb + road markings
      root.add(box(w, 0.06, 0.25, std('curb', { color: 0x5a5d63 }), cx, 0.03, 110 * S));
      for (let x = 0; x < w; x += 1.5) root.add(box(0.8, 0.005, 0.12, basic('mark', { color: 0xdddddd }), x + 0.4, 0.004, 55 * S));
      continue;
    }
    const fl = plane(w, h, floorMat(r.floor), cx, 0, cz, 0, -Math.PI / 2); scaledUV(fl.geometry, w, h, { carpet: 1.2, carpet2: 1, carpetred: 1.2, marble: 1.6, tile: 0.6, wood: 1.2, asphalt: 2, concrete: 1.5 }[r.floor] || 1.5); root.add(fl);
    if (CEIL[r.id]) {
      const ce = plane(w, h, ceilMat, cx, CEIL[r.id], cz, 0, Math.PI / 2); scaledUV(ce.geometry, w, h, 1.5); root.add(ce);
    }
  }

  // ------------------------------------------------------------ walls
  const wallGeoCache = {};
  function addWall(wl, dynamic = false) {
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
    const c = { x0: wl.x * S, z0: wl.y * S, x1: (wl.x + wl.w) * S, z1: (wl.y + wl.h) * S, dynamic };
    L.colliders.push(c);
    return mesh;
  }
  WALLS.forEach((w, i) => { if (i < 4) { L.colliders.push({ x0: w.x * S, z0: w.y * S, x1: (w.x + w.w) * S, z1: (w.y + w.h) * S }); return; } addWall(w); });
  // buildings across the street, with a few lit windows
  const bMat = std('bldg', { color: 0x2a2c34, roughness: 0.95 });
  const winOn = basic('winOn', { color: 0xffe2a8, toneMapped: false }), winOff = std('winOff', { color: 0x14151c });
  let bx = -20; let seed = 7;
  while (bx < WORLD.w * S + 20) {
    const bw = 8 + (seed * 37 % 9), bh = 9 + (seed * 53 % 12), bd = 10; seed++;
    const m = box(bw, bh, bd, bMat, bx + bw / 2, bh / 2, -8 - bd / 2); root.add(m);
    for (let fy = 2.5; fy < bh - 1; fy += 3) for (let fx = 1; fx < bw - 1; fx += 2.2) { const on = ((seed * 13 + Math.floor(fx * 7) + Math.floor(fy * 3)) % 5) === 0; root.add(box(1.0, 1.3, 0.05, on ? winOn : winOff, bx + fx + 0.5, fy, -8 + 0.03)); }
    bx += bw + 1.5;
  }
  L.colliders.push({ x0: -50, z0: -12, x1: 200, z1: -6.5 });
  L.addDynamicWall = (wl) => addWall(wl, true);
  // building roof (so you can't see into rooms from the street at grazing angles)
  const roof = box((3000 - 200) * S, 0.3, (1928 - 320) * S, black, 1600 * S, WALL_H + 0.15, 1124 * S); root.add(roof);
  // gold skirting along the labyrinth lanes & hall (decorative strip lights)
  // ceiling light fixtures
  const fixture = (x, z, y, color = 0xfff1d6, w = 1.2, d = 0.4) => { const m = box(w, 0.06, d, basic('fx' + color, { color })); m.position.set(x, y - 0.03, z); root.add(m); };
  // hall chandelier
  const chand = new THREE.Group(); chand.position.set(1600 * S, CEIL.hall - 0.9, 540 * S);
  for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; const b = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), basic('bulb', { color: 0xffe9b8 })); b.position.set(Math.cos(a) * 0.9, (i % 2) * 0.25, Math.sin(a) * 0.9); chand.add(b); }
  chand.add(cyl(0.05, 0.05, 0.9, gold, 0, 0.6, 0)); chand.add(new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.04, 8, 32), gold)); chand.children[chand.children.length - 1].rotation.x = Math.PI / 2;
  root.add(chand);
  // tables chandeliers
  [[2135, 520], [2560, 890], [2820, 520], [2170, 930]].forEach(([x, y]) => { const g = chand.clone(); g.position.set(x * S, CEIL.tables - 0.9, y * S); g.scale.set(0.8, 0.8, 0.8); root.add(g); });
  // machines hall strips
  for (const y of [520, 680, 840, 1000, 1160]) for (let x = 300; x < 1120; x += 200) fixture(x * S, y * S, CEIL.machines, 0xffd8f0, 2.5, 0.25);
  // bar pendants
  [1450, 1600, 1750].forEach(x => { root.add(cyl(0.02, 0.02, 0.9, black, x * S, CEIL.bar - 0.45, 1075 * S)); root.add(cyl(0.12, 0.28, 0.25, std('shade', { color: 0x3b2412, side: THREE.DoubleSide }), x * S, CEIL.bar - 1.0, 1075 * S)); const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), basic('bulbw', { color: 0xffc37a })); b.position.set(x * S, CEIL.bar - 1.08, 1075 * S); root.add(b); });
  // toilets panel, hallway, corridor, bureau, vip pendants, labyrinth spots
  fixture(1260 * S, 980 * S, CEIL.toilettes, 0xe9f2ff, 1.6, 0.6);
  fixture(1600 * S, 1260 * S, CEIL.hallway, 0xffd0a0, 0.6, 0.6);
  fixture(1260 * S, 540 * S, CEIL.corridor, 0xffe9c4, 0.6, 0.6);
  fixture(2220 * S, 1720 * S, CEIL.bureau, 0xe9f2ff, 1.8, 0.6);
  [[2200, 1420], [2600, 1400], [2880, 1420]].forEach(([x, y]) => { root.add(cyl(0.02, 0.02, 0.7, black, x * S, CEIL.vip - 0.35, y * S)); const b = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10), basic('bulbv', { color: 0xffd2a0 })); b.position.set(x * S, CEIL.vip - 0.75, y * S); root.add(b); });
  LIGHTS.filter(l => l.y > 1368 && l.x < 2000).forEach(l => fixture(l.x * S, l.y * S, CEIL.labyrinth, 0xffc78a, 0.4, 0.4));

  // ------------------------------------------------------------ slot machines (instanced)
  const screens = {};
  const N = SLOTS.length;
  const dummy = new THREE.Object3D();
  const partDefs = {
    body: { geo: new THREE.BoxGeometry(1.0, 0.9, 0.6), mat: darkMetal, pos: [0, 0.45, 0] },
    top: { geo: new THREE.BoxGeometry(1.0, 0.95, 0.5), mat: darkMetal, pos: [0, 1.35, -0.05] },
    topper: { geo: new THREE.BoxGeometry(0.92, 0.3, 0.36), mat: darkMetal, pos: [0, 1.98, -0.05] },
    deck: { geo: new THREE.BoxGeometry(0.92, 0.07, 0.34), mat: darkMetal, pos: [0, 0.93, 0.2], rot: [0.35, 0, 0] },
    button: { geo: new THREE.CylinderGeometry(0.06, 0.06, 0.03, 12), mat: basic('btn', { color: 0xff3b30 }), pos: [0, 0.99, 0.27], rot: [0.35, 0, 0] },
    stoolTop: { geo: new THREE.CylinderGeometry(0.22, 0.22, 0.07, 16), mat: std('stool', { color: 0x3e2723, roughness: 0.8 }), pos: [0, 0.55, 0.85] },
    stoolPole: { geo: new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8), mat: darkMetal, pos: [0, 0.27, 0.85] },
    stoolBase: { geo: new THREE.CylinderGeometry(0.2, 0.22, 0.04, 16), mat: darkMetal, pos: [0, 0.02, 0.85] },
    stripL: { geo: new THREE.BoxGeometry(0.03, 1.85, 0.05), mat: new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), pos: [-0.515, 1.0, 0.1], tint: true },
    stripR: { geo: new THREE.BoxGeometry(0.03, 1.85, 0.05), mat: new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), pos: [0.515, 1.0, 0.1], tint: true },
  };
  const parts = {};
  for (const [k, d] of Object.entries(partDefs)) { const im = new THREE.InstancedMesh(d.geo, d.mat, N); im.frustumCulled = false; parts[k] = im; root.add(im); }
  const byKind = {}, byLabel = {};
  SLOTS.forEach((s, i) => {
    const kind = s.kind || 'lucky'; const label = (s.label || 'SLOTS').toUpperCase();
    (byKind[kind] = byKind[kind] || []).push(i); (byLabel[label] = byLabel[label] || []).push(i);
    const cx = (s.x + s.w / 2) * S, cz = (s.y + s.h / 2) * S;
    const hue = new THREE.Color().setHSL(s.hue / 360, 0.85, 0.55);
    for (const [k, d] of Object.entries(partDefs)) {
      dummy.position.set(cx + d.pos[0], d.pos[1], cz + d.pos[2]); dummy.rotation.set(d.rot ? d.rot[0] : 0, 0, 0); dummy.updateMatrix();
      parts[k].setMatrixAt(i, dummy.matrix); if (d.tint) parts[k].setColorAt(i, hue);
    }
    L.colliders.push({ x0: cx - 0.52, z0: cz - 0.35, x1: cx + 0.52, z1: cz + 0.35 });
    L.colliders.push({ x0: cx - 0.24, z0: cz + 0.62, x1: cx + 0.24, z1: cz + 1.08 });
    const hit = box(1.05, 2.2, 0.75, basic('hit', { visible: false }), cx, 1.1, cz); hit.visible = false; hit.userData = { target: { kind: 'slot', s } }; root.add(hit); L.hits.push(hit);
  });
  for (const im of Object.values(parts)) { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; }
  // screens: one instanced mesh per kind (shared animated texture, per-instance tint)
  const screenGeo = new THREE.PlaneGeometry(0.8, 0.6);
  for (const [kind, idx] of Object.entries(byKind)) {
    screens[kind] = slotScreen(kind); L.updaters.push((t) => screens[kind].update(t));
    const im = new THREE.InstancedMesh(screenGeo, new THREE.MeshBasicMaterial({ map: screens[kind].texture, toneMapped: false }), idx.length); im.frustumCulled = false;
    idx.forEach((i, j) => { const s = SLOTS[i]; const cx = (s.x + s.w / 2) * S, cz = (s.y + s.h / 2) * S; dummy.position.set(cx, 1.38, cz + 0.205); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); im.setMatrixAt(j, dummy.matrix); im.setColorAt(j, new THREE.Color().setHSL(s.hue / 360, 0.85, 0.55).lerp(new THREE.Color(0xffffff), 0.6)); });
    im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; root.add(im);
  }
  // marquees: one instanced mesh per name (text texture), tinted per machine
  const marqueeGeo = new THREE.PlaneGeometry(0.88, 0.26);
  for (const [label, idx] of Object.entries(byLabel)) {
    const im = new THREE.InstancedMesh(marqueeGeo, new THREE.MeshBasicMaterial({ map: textTexture(label, { w: 512, h: 150, font: 'bold 78px "Bodoni 72", Georgia, serif', color: '#fff', bg: '#1a1a26', glow: 'rgba(255,255,255,0.8)' }), toneMapped: false }), idx.length); im.frustumCulled = false;
    idx.forEach((i, j) => { const s = SLOTS[i]; const cx = (s.x + s.w / 2) * S, cz = (s.y + s.h / 2) * S; dummy.position.set(cx, 1.98, cz + 0.131); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); im.setMatrixAt(j, dummy.matrix); im.setColorAt(j, new THREE.Color().setHSL(s.hue / 360, 0.9, 0.7)); });
    im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; root.add(im);
  }

  // ------------------------------------------------------------ objects
  const tableBase = (o, kind) => {
    const w = o.w * S * TABLE_SCALE, d = o.h * S * TABLE_SCALE, cx = (o.x + o.w / 2) * S, cz = (o.y + o.h / 2) * S;
    const g = new THREE.Group(); g.position.set(cx, 0, cz);
    g.add(box(w + 0.3, 0.12, d + 0.3, wood, 0, 0.86, 0));
    g.add(box(w * 0.85, 0.8, d * 0.85, std('tblbase', { color: 0x2b1a0e, roughness: 0.9 }), 0, 0.4, 0));
    const felt = new THREE.Mesh(new THREE.PlaneGeometry(w, d), std('felt-' + kind, { map: feltTexture(kind), roughness: 1 })); felt.rotation.x = -Math.PI / 2; felt.position.y = 0.925; g.add(felt);
    L.colliders.push({ x0: cx - w / 2 - 0.15, z0: cz - d / 2 - 0.15, x1: cx + w / 2 + 0.15, z1: cz + d / 2 + 0.15 });
    return { g, w, d, cx, cz };
  };
  const chip = (x, y, z, color) => { const c = cyl(0.045, 0.045, 0.012, std('chip' + color, { color, roughness: 0.5 }), x, y, z, 16); return c; };
  const wheelTex = wheelTexture(256);
  for (const o of OBJECTS) {
    const cx = (o.x + o.w / 2) * S, cz = (o.y + o.h / 2) * S, w = o.w * S, d = o.h * S;
    let hitSize = null;
    switch (o.type) {
      case 'caisse': case 'fidelite': {
        root.add(box(w, 1.05, d, wood, cx, 0.525, cz)); root.add(box(w, 0.06, d + 0.1, std('counterTop', { color: 0x1b1b22, roughness: 0.4 }), cx, 1.08, cz));
        const gl = plane(w * 0.9, 0.9, glass, cx, 1.6, cz, 0); gl.material.side = THREE.DoubleSide; root.add(gl);
        const sign = plane(w * 0.9, 0.36, new THREE.MeshBasicMaterial({ map: textTexture(o.type === 'caisse' ? 'CAISSE' : 'FIDÉLITÉ', { w: 512, h: 128, font: 'bold 70px Inter, sans-serif', color: '#ffe8b0', bg: '#1b1b22' }), toneMapped: false }), cx, 2.3, cz + d / 2 + 0.02); root.add(sign);
        L.colliders.push({ x0: cx - w / 2, z0: cz - d / 2, x1: cx + w / 2, z1: cz + d / 2 }); hitSize = [w, 2.2, d + 0.4];
        break;
      }
      case 'fountain': {
        root.add(cyl(1.1, 1.2, 0.5, std('stone', { color: 0x9e9482, roughness: 0.9 }), cx, 0.25, cz, 32));
        const water = cyl(0.95, 0.95, 0.06, new THREE.MeshStandardMaterial({ color: 0x2b6f8a, emissive: 0x1d6fa0, emissiveIntensity: 0.6, transparent: true, opacity: 0.85 }), cx, 0.5, cz, 32); root.add(water);
        root.add(cyl(0.12, 0.16, 0.9, gold, cx, 0.9, cz, 12)); root.add(new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), gold).translateX(cx).translateY(1.4).translateZ(cz));
        L.updaters.push((t) => { water.material.emissiveIntensity = 0.5 + 0.25 * Math.sin(t * 2); });
        L.colliders.push({ x0: cx - 1.2, z0: cz - 1.2, x1: cx + 1.2, z1: cz + 1.2 });
        break;
      }
      case 'atm': {
        root.add(box(w, 1.7, d, darkMetal, cx, 0.85, cz));
        root.add(plane(w * 0.8, 0.5, new THREE.MeshBasicMaterial({ map: textTexture('RETRAIT', { w: 256, h: 128, font: 'bold 54px Inter, sans-serif', color: '#e8f4ff', bg: '#0b3a55' }), toneMapped: false }), cx, 1.25, cz + d / 2 + 0.005));
        root.add(box(w * 0.6, 0.03, 0.02, basic('slotgold', { color: 0xffca28 }), cx, 0.85, cz + d / 2 + 0.01));
        L.colliders.push({ x0: cx - w / 2, z0: cz - d / 2, x1: cx + w / 2, z1: cz + d / 2 }); hitSize = [w, 1.8, d + 0.3];
        break;
      }
      case 'roulette': {
        const t = tableBase(o, 'roulette');
        const wheel = cyl(0.6, 0.65, 0.16, [std('wheelSide', { color: 0x3b2412 }), new THREE.MeshStandardMaterial({ map: wheelTex, roughness: 0.6 }), std('wheelSide', { color: 0x3b2412 })], -t.w / 2 + 0.85, 1.0, 0, 48);
        t.g.add(wheel); L.updaters.push((tm) => { wheel.rotation.y = tm * 0.6; });
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 10), white); t.g.add(ball); L.updaters.push((tm) => { ball.position.set(-t.w / 2 + 0.85 + Math.cos(-tm * 2.4) * 0.5, 1.1, Math.sin(-tm * 2.4) * 0.5); });
        [[0.3, 0.3, 0xb3261e], [0.8, -0.2, 0x1565c0], [1.2, 0.4, 0xc6a14f], [0.5, -0.5, 0xffffff]].forEach(([x, z, c]) => t.g.add(chip(x, 0.94, z, c)));
        root.add(t.g); hitSize = [t.w + 0.4, 1.6, t.d + 0.4];
        break;
      }
      case 'baccarat': case 'blackjack': case 'viptable': {
        const kind = o.type === 'viptable' ? 'vip' : o.type;
        const t = tableBase(o, kind);
        [[-0.6, 0.3, 0xc6a14f], [0.7, -0.3, 0x1565c0], [0.2, 0.5, 0xb3261e]].forEach(([x, z, c]) => t.g.add(chip(x, 0.94, z, c)));
        // a couple of cards
        const cardMat = std('cardw', { color: 0xffffff, roughness: 0.5 });
        [[-0.3, -0.2], [-0.15, -0.22], [0.5, 0.1]].forEach(([x, z]) => { const c = box(0.12, 0.004, 0.17, cardMat, x, 0.935, z); c.rotation.y = Math.random() * 0.4; t.g.add(c); });
        root.add(t.g); hitSize = o.label ? [t.w + 0.4, 1.6, t.d + 0.4] : null;
        break;
      }
      case 'wheel': {
        // Big six: vertical wheel on a stand, facing +z
        const g = new THREE.Group(); g.position.set(cx, 0, cz);
        g.add(cyl(0.12, 0.2, 1.3, darkMetal, 0, 0.65, 0, 12));
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.08, 54), [std('wheelSide', { color: 0x3b2412 }), new THREE.MeshStandardMaterial({ map: bigSixTexture(256), roughness: 0.6 }), std('wheelSide', { color: 0x3b2412 })]);
        disc.rotation.x = Math.PI / 2; disc.position.set(0, 1.75, 0.1); g.add(disc);
        L.updaters.push((t) => { disc.rotation.y = t * 0.25; });
        const pointer = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 8), white); pointer.position.set(0, 2.66, 0.12); pointer.rotation.x = Math.PI; g.add(pointer);
        for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; const b = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), basic('bulb', { color: 0xffe9b8 })); b.position.set(Math.cos(a) * 0.95, 1.75 + Math.sin(a) * 0.95, 0.12); g.add(b); }
        root.add(g);
        L.colliders.push({ x0: cx - 0.5, z0: cz - 0.3, x1: cx + 0.5, z1: cz + 0.3 }); hitSize = [1.9, 2.8, 0.6];
        break;
      }
      case 'barcounter': {
        root.add(box(w, 1.05, d, wood, cx, 0.525, cz)); root.add(box(w + 0.2, 0.06, d + 0.2, std('bartop', { color: 0x2b1a0e, roughness: 0.3 }), cx, 1.08, cz));
        root.add(box(w, 0.04, 0.04, basic('barled', { color: 0xffb46a, toneMapped: false }), cx, 0.98, cz + d / 2 + 0.01));
        // back bar shelf with bottles
        const shelfZ = (1168 - 6) * S; root.add(box(w, 2.2, 0.3, std('shelfbg', { color: 0x1a0f0a }), cx, 1.1, shelfZ)); root.add(box(w, 0.6, 0.3, basic('shelflight', { color: 0xff9a5a, toneMapped: false }), cx, 1.15, shelfZ - 0.02));
        const cols = [0xff7043, 0xffca28, 0x29b6f6, 0xab47bc, 0x66bb6a, 0xef5350, 0x26c6da];
        for (let i = 0; i < 26; i++) { const b = cyl(0.04, 0.05, 0.3 + (i % 3) * 0.06, new THREE.MeshStandardMaterial({ color: cols[i % cols.length], transparent: true, opacity: 0.8, roughness: 0.2 }), cx - w / 2 + 0.3 + i * (w - 0.6) / 25, 1.6, shelfZ - 0.2, 10); root.add(b); }
        // stools
        [1440, 1500, 1560, 1620, 1680, 1740].forEach(x => { const sx = x * S, sz = 1040 * S; root.add(cyl(0.22, 0.22, 0.07, stoolMat, sx, 0.7, sz, 16)); root.add(cyl(0.03, 0.03, 0.66, darkMetal, sx, 0.35, sz, 8)); root.add(cyl(0.2, 0.22, 0.04, darkMetal, sx, 0.02, sz, 16)); L.colliders.push({ x0: sx - 0.24, z0: sz - 0.24, x1: sx + 0.24, z1: sz + 0.24 }); });
        L.colliders.push({ x0: cx - w / 2, z0: cz - d / 2, x1: cx + w / 2, z1: cz + d / 2 }); hitSize = [w, 1.6, d + 0.6];
        break;
      }
      case 'roundtable': {
        root.add(cyl(0.7, 0.7, 0.05, wood, cx, 0.75, cz, 24)); root.add(cyl(0.05, 0.05, 0.75, darkMetal, cx, 0.37, cz, 8)); root.add(cyl(0.35, 0.4, 0.04, darkMetal, cx, 0.02, cz, 24));
        L.colliders.push({ x0: cx - 0.7, z0: cz - 0.7, x1: cx + 0.7, z1: cz + 0.7 });
        break;
      }
      case 'sink': {
        root.add(box(w, 0.85, d, white, cx, 0.425, cz)); for (let i = 0; i < 3; i++) root.add(cyl(0.16, 0.14, 0.12, std('basin', { color: 0xdde3e6 }), cx - w / 2 + 0.5 + i * (w - 1) / 2, 0.9, cz, 16));
        const mirror = plane(w, 0.9, mirrorMat, cx, 1.6, (o.y + 2) * S + 0.01); root.add(mirror);
        L.colliders.push({ x0: cx - w / 2, z0: cz - d / 2, x1: cx + w / 2, z1: cz + d / 2 + 0.2 });
        break;
      }
      case 'phone': {
        const ph = box(0.08, 0.01, 0.16, black, cx, 0.86, cz); root.add(ph);
        const scr = plane(0.07, 0.14, new THREE.MeshBasicMaterial({ color: 0x4fc3f7, toneMapped: false }), cx, 0.866, cz, 0, -Math.PI / 2); root.add(scr);
        L.updaters.push((t) => { scr.material.color.setHSL(0.55, 0.9, 0.45 + 0.25 * Math.max(0, Math.sin(t * 6))); });
        hitSize = [0.6, 0.5, 0.6]; L.phoneHit = { cx, cz };
        break;
      }
      case 'sofa': {
        root.add(box(w, 0.45, d, velvet, cx, 0.225, cz)); root.add(box(w, 0.5, 0.25, velvet, cx, 0.7, cz - d / 2 + 0.125)); root.add(box(0.25, 0.3, d, velvet, cx - w / 2 + 0.125, 0.6, cz)); root.add(box(0.25, 0.3, d, velvet, cx + w / 2 - 0.125, 0.6, cz));
        L.colliders.push({ x0: cx - w / 2, z0: cz - d / 2, x1: cx + w / 2, z1: cz + d / 2 });
        break;
      }
      case 'desk': {
        root.add(box(w, 0.06, d, wood, cx, 0.76, cz)); root.add(box(w - 0.3, 0.7, d - 0.4, std('deskbody', { color: 0x2b1a0e }), cx, 0.36, cz));
        const mon = box(0.6, 0.4, 0.04, black, cx - 0.5, 1.05, cz); root.add(mon); root.add(plane(0.55, 0.34, new THREE.MeshBasicMaterial({ map: screenTexture('board'), toneMapped: false }), cx - 0.5, 1.05, cz + 0.025));
        L.colliders.push({ x0: cx - w / 2, z0: cz - d / 2, x1: cx + w / 2, z1: cz + d / 2 });
        break;
      }
      case 'dumpster': { root.add(box(w, 1.1, d, std('dump', { color: 0x2e7d32, roughness: 0.9 }), cx, 0.55, cz)); root.add(box(w, 0.08, d, std('dumplid', { color: 0x1b5e20 }), cx, 1.12, cz)); L.colliders.push({ x0: cx - w / 2, z0: cz - d / 2, x1: cx + w / 2, z1: cz + d / 2 }); break; }
      case 'busstop': {
        const px = (o.x + 7) * S, pz = (o.y + 60) * S;
        root.add(cyl(0.04, 0.04, 3, darkMetal, px, 1.5, pz, 8));
        root.add(plane(0.9, 0.6, new THREE.MeshBasicMaterial({ map: textTexture('BUS', { w: 256, h: 170, font: 'bold 90px Inter, sans-serif', color: '#fff', bg: '#1565c0' }), toneMapped: false, side: THREE.DoubleSide }), px, 2.8, pz));
        // bench
        root.add(box(1.8, 0.06, 0.4, wood, 9.9, 0.45, 4.0)); root.add(box(0.06, 0.45, 0.4, darkMetal, 9.1, 0.22, 4.0)); root.add(box(0.06, 0.45, 0.4, darkMetal, 10.7, 0.22, 4.0));
        // shelter roof
        root.add(box(3.2, 0.06, 1.6, glass, 9.9, 2.6, 4.0)); root.add(cyl(0.03, 0.03, 2.6, darkMetal, 8.4, 1.3, 4.7, 8)); root.add(cyl(0.03, 0.03, 2.6, darkMetal, 11.4, 1.3, 4.7, 8));
        L.colliders.push({ x0: 9.0, z0: 3.8, x1: 10.8, z1: 4.2 }); L.colliders.push({ x0: px - 0.1, z0: pz - 0.1, x1: px + 0.1, z1: pz + 0.1 });
        hitSize = [2.4, 3, 1.6]; L.busHit = { cx: 9.9, cz: 4.0 };
        break;
      }
      case 'clock': {
        const ck = clockTexture(); L.clock = ck;
        const face = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.08, 32), [darkMetal, new THREE.MeshBasicMaterial({ map: ck.texture, toneMapped: false }), darkMetal]);
        face.rotation.x = Math.PI / 2; face.rotation.z = 0; face.position.set(1270 * S, 2.9, 320 * S - 0.06); root.add(face);
        hitSize = [1.2, 1.2, 0.8]; L.clockHit = { cx: 1270 * S, cz: 320 * S - 0.4, cy: 2.9 };
        break;
      }
      case 'entrance': {
        const x0 = 1480 * S, x1 = 1560 * S, z = 332 * S;
        root.add(cyl(0.05, 0.05, 1.1, gold, x0 + 0.08, 0.55, z, 10)); root.add(cyl(0.05, 0.05, 1.1, gold, x1 - 0.08, 0.55, z, 10));
        const bar = box(x1 - x0 - 0.2, 0.05, 0.05, red, (x0 + x1) / 2, 0.9, z); bar.visible = !!state.flags.entered; root.add(bar); L.dynamic.turnstile = bar;
        hitSize = [2, 1.6, 1.2];
        break;
      }
      case 'plaque': {
        root.add(plane(w, 0.4, new THREE.MeshStandardMaterial({ map: textTexture('18 AOÛT 1913 · LE NOIR EST SORTI 26 FOIS', { w: 1024, h: 128, font: 'bold 48px Inter, sans-serif', color: '#3b2412', bg: '#c6a14f' }), metalness: 0.6, roughness: 0.4 }), cx, 1.9, (o.y + 24) * S + 0.02));
        hitSize = [w, 1, 1.2]; L.plaqueHit = { cx, cz: (o.y + 24) * S + 0.5 };
        break;
      }
      case 'theo': case 'board': {
        const wd = o.type === 'theo' ? 2.2 : 4.5, ht = o.type === 'theo' ? 1.2 : 1.6;
        const z = (o.y) * S + 0.03;
        root.add(box(wd + 0.1, ht + 0.1, 0.06, black, cx, 2.0, z - 0.03)); root.add(plane(wd, ht, new THREE.MeshBasicMaterial({ map: screenTexture(o.type), toneMapped: false }), cx, 2.0, z));
        hitSize = [wd, 2, 1.4]; L[o.type + 'Hit'] = { cx, cz: z + 0.6 };
        break;
      }
      case 'sign': {
        const face = o.id === 'sign0' ? -1 : 1;
        const m = plane(1.6, 0.4, new THREE.MeshBasicMaterial({ map: textTexture(o.text, { w: 512, h: 128, font: 'bold 60px Inter, sans-serif', color: '#ffd08a', bg: '#101018', glow: 'rgba(255,180,106,0.9)' }), toneMapped: false, side: THREE.DoubleSide }), cx, 2.15, cz + (face > 0 ? 0.02 : -0.02), face > 0 ? 0 : Math.PI);
        root.add(m); break;
      }
      case 'mirror': { const m = plane(w, 1.6, mirrorMat, cx, 1.5, (o.y) * S - 0.04); root.add(m); root.add(box(w + 0.1, 1.7, 0.03, gold, cx, 1.5, (o.y) * S - 0.06)); break; }
      case 'staffdoor': {
        const dz = (o.y + o.h / 2) * S, dx = (o.x + o.w / 2) * S;
        root.add(box(0.1, 2.1, o.h * S - 0.1, std('door', { color: 0x5a5f66, roughness: 0.7 }), dx, 1.05, dz));
        root.add(plane(0.8, 0.2, new THREE.MeshBasicMaterial({ map: textTexture('PERSONNEL', { w: 512, h: 128, font: 'bold 64px Inter, sans-serif', color: '#e0e0e0', bg: '#333' }), toneMapped: false, side: THREE.DoubleSide }), dx - 0.06, 1.75, dz, -Math.PI / 2));
        hitSize = [1.2, 2.2, 2.2]; L.staffHit = { cx: dx, cz: dz };
        break;
      }
      case 'exitdoor': {
        const dz = (o.y + o.h / 2) * S, dx = (o.x + o.w / 2) * S;
        const door = box(0.1, 2.1, o.h * S - 0.1, std('exitdoor', { color: 0x44484f, roughness: 0.7 }), dx, 1.05, dz); root.add(door); L.dynamic.exitDoor = door;
        root.add(box(0.03, 0.06, 0.06, gold, dx + 0.06, 1.0, dz + 0.5));
        const lamp = box(0.2, 0.06, 0.4, basic('exitlamp', { color: 0x7fd0ff, toneMapped: false }), dx + 0.2, 2.35, dz); root.add(lamp);
        hitSize = [1.4, 2.2, 2.2]; L.exitHit = { cx: dx, cz: dz };
        break;
      }
      case 'vipdoor': {
        const z = (o.y + o.h / 2) * S, x0 = o.x * S, x1 = (o.x + o.w) * S;
        const g = new THREE.Group();
        g.add(cyl(0.04, 0.06, 1.0, gold, x0 + 0.15, 0.5, z, 10)); g.add(cyl(0.04, 0.06, 1.0, gold, x1 - 0.15, 0.5, z, 10));
        const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(x0 + 0.15, 0.95, z), new THREE.Vector3((x0 + x1) / 2, 0.7, z), new THREE.Vector3(x1 - 0.15, 0.95, z));
        g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.03, 8, false), velvet));
        g.visible = !state.flags.vipOpen; root.add(g); L.dynamic.vipRope = g;
        const c = { x0: x0, z0: z - 0.2, x1: x1, z1: z + 0.2, vip: true }; L.colliders.push(c); L.dynamic.vipCollider = c;
        hitSize = state.flags.vipOpen ? null : [2.2, 1.6, 1.2];
        break;
      }
      case 'poster': {
        const m = plane(0.55, 0.9, new THREE.MeshStandardMaterial({ map: textTexture('JOUEURS INFO SERVICE · 09 74 75 13 13', { w: 512, h: 840, font: 'bold 44px Inter, sans-serif', color: '#1b4636', bg: '#f5f1e8' }), roughness: 0.9 }), 176 * S - 0.02, 1.6, cz, -Math.PI / 2); root.add(m);
        hitSize = [1.0, 1.4, 1.2]; L.posterHit = { cx: 176 * S - 0.4, cz };
        break;
      }
    }
    if (hitSize && o.label) {
      const hp = L[o.type + 'Hit'] || L.exitHit && o.type === 'exitdoor' ? L.exitHit : null;
      let hx = cx, hz = cz, hy = hitSize[1] / 2;
      if (o.type === 'clock') { hx = L.clockHit.cx; hz = L.clockHit.cz; hy = L.clockHit.cy; }
      else if (o.type === 'busstop') { hx = L.busHit.cx; hz = L.busHit.cz; }
      else if (o.type === 'plaque') { hx = L.plaqueHit.cx; hz = L.plaqueHit.cz; hy = 1.9; }
      else if (o.type === 'theo' || o.type === 'board') { hx = L[o.type + 'Hit'].cx; hz = L[o.type + 'Hit'].cz; hy = 2.0; }
      else if (o.type === 'staffdoor') { hx = L.staffHit.cx; hz = L.staffHit.cz; }
      else if (o.type === 'exitdoor') { hx = L.exitHit.cx; hz = L.exitHit.cz; }
      else if (o.type === 'poster') { hx = L.posterHit.cx; hz = L.posterHit.cz; hy = 1.6; }
      const hit = box(hitSize[0], hitSize[1], hitSize[2], basic('hit', { visible: false }), hx, hy, hz); hit.visible = false; hit.userData = { target: { kind: 'object', o } }; root.add(hit); L.hits.push(hit);
      if (o.type === 'vipdoor') L.dynamic.vipHit = hit;
    }
  }

  // ------------------------------------------------------------ street & alley dressing
  // neon CASINO sign
  const neonTex = textTexture('CASINO', { w: 1024, h: 256, font: 'bold 190px "Bodoni 72", Didot, Georgia, serif', color: '#ff6b85', bg: 'rgba(0,0,0,0)', glow: '#ff4d6d' });
  const neonMat = new THREE.MeshBasicMaterial({ map: neonTex, transparent: true, toneMapped: false });
  const neon = plane(6.4, 1.6, neonMat, 1520 * S, 3.45, 320 * S - 0.12, Math.PI); root.add(neon);
  root.add(box(6.8, 1.9, 0.12, std('marqueeBox', { color: 0x15161c }), 1520 * S, 3.45, 320 * S - 0.03));
  root.add(box(6.8, 0.06, 0.06, gold, 1520 * S, 4.42, 320 * S - 0.1)); root.add(box(6.8, 0.06, 0.06, gold, 1520 * S, 2.48, 320 * S - 0.1));
  const bulbs = []; for (let i = 0; i < 22; i++) { for (const y of [2.6, 4.3]) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffe082, toneMapped: false })); b.position.set(1520 * S - 3.2 + i * 0.305, y, 320 * S - 0.14); root.add(b); bulbs.push(b); } }
  L.updaters.push((t) => { const on = Math.floor(t * 6); bulbs.forEach((b, i) => { b.material.color.setHex((on + i) % 4 === 0 ? 0x4d3d1f : 0xffe082); }); neonMat.opacity = 0.85 + 0.15 * Math.sin(t * 6); });
  // awning over the entrance
  root.add(box(3.2, 0.08, 1.4, velvet, 1520 * S, 2.35, 320 * S - 0.8));
  // street lamps
  for (const x of [520, 900, 1900, 2400, 2800]) { const lx = x * S, lz = 150 * S; root.add(cyl(0.05, 0.08, 4.5, darkMetal, lx, 2.25, lz, 10)); root.add(box(0.5, 0.08, 0.3, darkMetal, lx, 4.5, lz)); root.add(box(0.4, 0.05, 0.22, basic('lampbulb', { color: 0xffe0a8, toneMapped: false }), lx, 4.44, lz)); L.colliders.push({ x0: lx - 0.1, z0: lz - 0.1, x1: lx + 0.1, z1: lz + 0.1 }); }
  // parked cars
  [[700, 0x8d2f2f], [1150, 0x2f4f8d], [2100, 0x3a3a3a], [2650, 0x6f6f6f]].forEach(([x, c]) => {
    const cx = (x + 60) * S, cz = 88 * S; const g = new THREE.Group(); g.position.set(cx, 0, cz);
    const paint = new THREE.MeshStandardMaterial({ color: c, metalness: 0.6, roughness: 0.35 });
    g.add(box(3.0, 0.5, 1.6, paint, 0, 0.5, 0)); g.add(box(1.7, 0.5, 1.4, paint, -0.1, 1.0, 0)); g.add(box(1.5, 0.42, 1.42, glass, -0.1, 1.02, 0));
    [[-1.0, 0.7], [1.0, 0.7], [-1.0, -0.7], [1.0, -0.7]].forEach(([wx, wz]) => { const wh = cyl(0.3, 0.3, 0.2, black, wx, 0.3, wz, 14); wh.rotation.x = Math.PI / 2; g.add(wh); });
    g.add(box(0.1, 0.12, 0.3, basic('headlight', { color: 0xffe9a8, toneMapped: false }), 1.5, 0.55, 0.55)); g.add(box(0.1, 0.12, 0.3, basic('headlight', { color: 0xffe9a8, toneMapped: false }), 1.5, 0.55, -0.55));
    g.add(box(0.1, 0.1, 0.3, basic('taillight', { color: 0xff3b30, toneMapped: false }), -1.5, 0.55, 0.55)); g.add(box(0.1, 0.1, 0.3, basic('taillight', { color: 0xff3b30, toneMapped: false }), -1.5, 0.55, -0.55));
    root.add(g); L.colliders.push({ x0: cx - 1.5, z0: cz - 0.8, x1: cx + 1.5, z1: cz + 0.8 });
  });
  // trash bin near the bus stop
  root.add(cyl(0.25, 0.22, 0.9, darkMetal, 458 * S, 0.45, 158 * S, 12));
  // alley lamp
  root.add(box(0.3, 0.3, 0.3, darkMetal, 176 * S - 0.2, 3.2, 878 * S)); root.add(box(0.2, 0.06, 0.2, basic('lampbulb', { color: 0xffe0a8, toneMapped: false }), 176 * S - 0.25, 3.05, 878 * S));
  // plants (hall, tables, vip)
  const plant = (x, z) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.add(cyl(0.22, 0.18, 0.4, std('pot', { color: 0x5d4037 }), 0, 0.2, 0, 12)); for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.9, 6), std('leaf', { color: 0x2e7d32, roughness: 1 })); leaf.position.set(Math.cos(a) * 0.2, 0.75, Math.sin(a) * 0.2); leaf.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); g.add(leaf); } root.add(g); L.colliders.push({ x0: x - 0.3, z0: z - 0.3, x1: x + 0.3, z1: z + 0.3 }); };
  [[1390, 720], [1810, 720], [1880, 1300], [2980, 1300], [2060, 1560], [2960, 1560]].forEach(([x, y]) => plant(x * S, y * S));
  // VIP bar cart
  root.add(box(1.0, 0.7, 0.5, gold, 2920 * S, 0.35, 1412 * S)); [0xffca28, 0x29b6f6, 0xef5350].forEach((c, i) => root.add(cyl(0.04, 0.05, 0.3, new THREE.MeshStandardMaterial({ color: c, transparent: true, opacity: 0.8 }), 2920 * S - 0.3 + i * 0.3, 0.85, 1412 * S, 10)));
  L.colliders.push({ x0: 2920 * S - 0.5, z0: 1412 * S - 0.25, x1: 2920 * S + 0.5, z1: 1412 * S + 0.25 });
  // bureau safe
  root.add(box(1.0, 1.25, 1.0, std('safe', { color: 0x37474f, metalness: 0.7, roughness: 0.4 }), 2360 * S, 0.625, 1865 * S)); root.add(cyl(0.12, 0.12, 0.05, gold, 2360 * S - 0.52, 0.7, 1865 * S, 12).rotateZ(Math.PI / 2));
  L.colliders.push({ x0: 2360 * S - 0.5, z0: 1865 * S - 0.5, x1: 2360 * S + 0.5, z1: 1865 * S + 0.5 });
  // toilets stall
  root.add(box(1.0, 2.0, 0.05, std('stall', { color: 0xb0bec5 }), 1310 * S, 1.0, 1050 * S)); root.add(box(0.05, 2.0, 0.8, std('stall', { color: 0xb0bec5 }), 1290 * S, 1.0, 1066 * S));
  // jackpot banner in the machine hall
  root.add(plane(6, 0.5, new THREE.MeshBasicMaterial({ map: textTexture('JACKPOT PROGRESSIF · 1 248 391 €', { w: 1024, h: 96, font: 'bold 60px "Bodoni 72", Georgia, serif', color: '#ff9ab0', bg: '#101018', glow: '#ff4d6d' }), toneMapped: false }), 680 * S, 2.35, 344 * S + 0.03));
  // hallway sign
  root.add(plane(1.6, 0.3, new THREE.MeshBasicMaterial({ map: textTexture('RESTAURANT · SPECTACLE ↓', { w: 768, h: 128, font: 'bold 52px Inter, sans-serif', color: '#ffd08a', bg: '#101018' }), toneMapped: false, side: THREE.DoubleSide }), 1600 * S, 2.2, 1172 * S + 0.03));
  // exit lamp light & "fire exit" nothing else. Alley puddle
  const puddle = cyl(0.9, 0.9, 0.005, new THREE.MeshStandardMaterial({ color: 0x8fb3d9, metalness: 0.9, roughness: 0.1, transparent: true, opacity: 0.5 }), 70 * S, 0.01, 700 * S, 24); puddle.scale.z = 0.4; root.add(puddle);

  // ------------------------------------------------------------ point-light candidates
  for (const li of LIGHTS) {
    if (li.slot) continue;
    L.lightSpots.push({ x: li.x * S, y: li.aisle ? CEIL.machines - 0.3 : (li.y < 320 ? 4.3 : 2.4), z: li.y * S, color: new THREE.Color(li.color), intensity: li.a * 60 * (li.color === '#ff4d6d' ? 1.4 : 1) * (li.y > 1368 && li.x < 2000 ? 1.6 : 1), distance: li.r * S * 2.6, neon: li.color === '#ff4d6d' });
  }
  // aisle lights sit at ceiling height; hall chandelier a bit higher
  L.lightSpots.forEach(l => { if (Math.abs(l.x - 1600 * S) < 0.5 && Math.abs(l.z - 540 * S) < 0.5) l.y = 3.2; });

  L.root = root;
  return L;
}

// Compute the rooms's outdoor status for fog/sky
export const CEILINGS = CEIL;
