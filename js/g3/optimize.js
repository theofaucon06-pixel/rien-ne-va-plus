// Runtime optimisations: static geometry merged per material and per room, room-based visibility,
// adaptive render resolution. Nothing here changes what the level looks like, only how it is drawn.
import * as THREE from 'three';
import { ROOMS } from '../world.js';

// Rooms whose contents can be seen from a given room (through open doors and aligned openings).
// Anything outside a room (sky, ground, façade…) is tagged 'none' and always drawn.
export const VISIBLE_FROM = {
  street: ['street', 'ruelle', 'hall', 'corridor'],
  ruelle: ['ruelle', 'street', 'labyrinth'],
  hall: ['hall', 'street', 'corridor', 'machines', 'tables', 'bar'],
  corridor: ['corridor', 'hall', 'machines', 'tables', 'street'],
  machines: ['machines', 'corridor', 'hall', 'labyrinth', 'tables'],
  toilettes: ['toilettes', 'bar'],
  tables: ['tables', 'hall', 'corridor', 'machines', 'vip', 'street'],
  bar: ['bar', 'hall', 'toilettes', 'hallway', 'labyrinth', 'street'],
  hallway: ['hallway', 'bar', 'labyrinth', 'hall', 'street'],
  labyrinth: ['labyrinth', 'machines', 'hallway', 'bar', 'ruelle', 'bureau'],
  vip: ['vip', 'tables'],
  bureau: ['bureau', 'labyrinth'],
};
const ALL = ROOMS.map(r => r.id);
export function visibleRooms(roomId) { return new Set(roomId && VISIBLE_FROM[roomId] ? VISIBLE_FROM[roomId] : ALL); }

// room id at a world position (metres), with a small tolerance so wall-mounted props stay with their room
export function roomOfPoint(x, z, S) {
  const px = x / S, py = z / S;
  for (const r of ROOMS) if (px >= r.x - 12 && px < r.x + r.w + 12 && py >= r.y - 12 && py < r.y + r.h + 12) return r.id;
  return 'none';
}

// ------------------------------------------------------------------ geometry merging
function mergeGeometries(geos) {
  const useIndex = geos.every(g => g.index);
  const names = Object.keys(geos[0].attributes);
  const merged = new THREE.BufferGeometry();
  for (const name of names) {
    const first = geos[0].attributes[name]; const size = first.itemSize;
    let count = 0; for (const g of geos) count += g.attributes[name].count;
    const arr = new Float32Array(count * size); let off = 0;
    for (const g of geos) { const a = g.attributes[name]; arr.set(a.array.subarray(0, a.count * size), off); off += a.count * size; }
    merged.setAttribute(name, new THREE.BufferAttribute(arr, size));
  }
  if (useIndex) {
    let total = 0; for (const g of geos) total += g.index.count;
    const vcount = merged.attributes.position.count;
    const idx = vcount > 65535 ? new Uint32Array(total) : new Uint16Array(total);
    let off = 0, base = 0;
    for (const g of geos) { const ia = g.index.array; for (let i = 0; i < ia.length; i++) idx[off + i] = ia[i] + base; off += ia.length; base += g.attributes.position.count; }
    merged.setIndex(new THREE.BufferAttribute(idx, 1));
  }
  return merged;
}

function bakedGeometry(mesh) {
  const g = mesh.geometry.clone();
  g.applyMatrix4(mesh.matrixWorld); // transforms position and normal
  return g;
}

/**
 * Merge every static, single-material mesh under `root` into one mesh per (material, room).
 * Skips: invisible meshes, instanced meshes, multi-material meshes, anything in `skip`,
 * and any subtree flagged `userData.dynamic`.
 * Returns { byRoom: Map<roomId, Mesh[]>, before, after }.
 */
export function mergeStatic(root, { skip = new Set(), S = 1 / 40 } = {}) {
  root.updateMatrixWorld(true);
  const buckets = new Map(); // key -> { material, room, renderOrder, meshes: [] }
  const toRemove = [];
  let before = 0;
  const _p = new THREE.Vector3();
  const walk = (o) => {
    if (o.userData && o.userData.dynamic) return;
    if (o.isMesh && !o.isInstancedMesh) {
      before++;
      if (o.children.length) { for (const c of o.children) walk(c); return; } // a mesh carrying children is never removed
      if (!o.visible || skip.has(o) || Array.isArray(o.material) || !o.geometry.attributes.position) return;
      if (o.geometry.attributes.position.count > 20000) return; // big single meshes stay as they are
      _p.setFromMatrixPosition(o.matrixWorld);
      const room = roomOfPoint(_p.x, _p.z, S);
      const sig = Object.keys(o.geometry.attributes).sort().join(',');
      const key = o.material.uuid + '|' + room + '|' + o.renderOrder + '|' + sig;
      if (!buckets.has(key)) buckets.set(key, { material: o.material, room, renderOrder: o.renderOrder, meshes: [] });
      buckets.get(key).meshes.push(o);
      return;
    }
    if (o.children) for (const c of o.children) walk(c);
  };
  walk(root);
  const byRoom = new Map();
  let after = 0;
  for (const b of buckets.values()) {
    if (b.meshes.length < 2) continue; // nothing to gain, keep the original mesh
    const geo = mergeGeometries(b.meshes.map(bakedGeometry));
    const m = new THREE.Mesh(geo, b.material);
    m.renderOrder = b.renderOrder; m.matrixAutoUpdate = false; m.userData.room = b.room; m.name = 'chunk:' + b.room;
    root.add(m); after++;
    if (!byRoom.has(b.room)) byRoom.set(b.room, []);
    byRoom.get(b.room).push(m);
    for (const src of b.meshes) toRemove.push(src);
  }
  for (const src of toRemove) { src.parent && src.parent.remove(src); src.geometry.dispose(); }
  // the untouched meshes still count as draws; tag them with a room so they can be gated too
  root.traverse(o => {
    if (!o.isMesh || o.userData.room !== undefined || skip.has(o)) return;
    if (o.userData.dynamic) return;
    _p.setFromMatrixPosition(o.matrixWorld);
    if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
    // instanced meshes and very large meshes span several rooms: never gate them
    const room = (o.isInstancedMesh || o.geometry.boundingSphere.radius > 25) ? 'none' : roomOfPoint(_p.x, _p.z, S);
    o.userData.room = room;
    if (!byRoom.has(room)) byRoom.set(room, []);
    byRoom.get(room).push(o);
  });
  return { byRoom, before, after: after + (before - toRemove.length) };
}

/** Show only the rooms visible from `roomId`; returns the visible set. */
export function applyRoomVisibility(byRoom, roomId) {
  const vis = visibleRooms(roomId);
  for (const [room, meshes] of byRoom) {
    const on = room === 'none' || vis.has(room);
    for (const m of meshes) if (!m.userData.dynamic) m.visible = on;
  }
  return vis;
}

// ------------------------------------------------------------------ adaptive quality
export const TIERS = [
  { name: 'Ultra', dpr: 1.5, msaa: 4, bloom: 1, hdr: true },
  { name: 'Haute', dpr: 1.25, msaa: 2, bloom: 0.5, hdr: true },
  { name: 'Moyenne', dpr: 1.0, msaa: 0, bloom: 0.5, hdr: false },
  { name: 'Basse', dpr: 0.8, msaa: 0, bloom: 0, hdr: false },
  { name: 'Minimale', dpr: 0.6, msaa: 0, bloom: 0, hdr: false },
];

/** Rolling frame-time monitor that steps a tier index up or down. */
export class Adaptive {
  constructor(apply, { start = 1 } = {}) {
    this.apply = apply; this.auto = true; this.tier = start;
    this.samples = []; this.cool = 0; this.calm = 0;
    apply(TIERS[this.tier]);
  }
  set(tier, auto = false) { this.auto = auto; this.tier = Math.max(0, Math.min(TIERS.length - 1, tier)); this.apply(TIERS[this.tier]); this.samples.length = 0; this.cool = 120; }
  push(ms) {
    if (!this.auto) return;
    if (this.cool > 0) { this.cool--; return; }
    this.samples.push(ms);
    if (this.samples.length < 45) return;
    const sorted = this.samples.slice().sort((a, b) => a - b); const med = sorted[sorted.length >> 1];
    this.samples.length = 0;
    if (med > 21 && this.tier < TIERS.length - 1) { this.tier++; this.apply(TIERS[this.tier]); this.cool = 90; this.calm = 0; }
    else if (med < 10 && this.tier > 0) { if (++this.calm >= 6) { this.calm = 0; this.tier--; this.apply(TIERS[this.tier]); this.cool = 90; } }
    else this.calm = 0;
  }
}
