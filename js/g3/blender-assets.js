// Web delivery for the native Blender models in assets/models.
// Each request is optional: the procedural prop stays visible if an asset fails to load.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const cache = new Map();

function getAsset(path) {
  if (!cache.has(path)) cache.set(path, new Promise((resolve, reject) => loader.load(path, gltf => resolve(gltf.scene), undefined, reject)));
  return cache.get(path);
}

function prepare(model, room) {
  model.userData.dynamic = true;
  model.userData.room = room;
  model.traverse(node => {
    if (!node.isMesh) return;
    node.castShadow = false;
    node.receiveShadow = false;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials) {
      if (!material) continue;
      material.envMapIntensity = Math.max(material.envMapIntensity || 0, 0.72);
      material.needsUpdate = true;
    }
  });
  return model;
}

function clone(template, room) { return prepare(template.clone(true), room); }

function installTables(root, template, targets, room) {
  const size = new THREE.Box3().setFromObject(template).getSize(new THREE.Vector3());
  for (const target of targets) {
    const model = clone(template, room);
    model.position.copy(target.g.position);
    model.rotation.copy(target.g.rotation);
    model.scale.set(target.w / size.x, 1, target.d / size.z);
    root.add(model);
    target.g.visible = false;
  }
}

function installSlots(root, template, targets) {
  for (const target of targets) {
    const model = clone(template, 'machines');
    model.position.set(target.x, 0, target.z);
    model.rotation.y = target.yaw;
    root.add(model);
  }
}

/** Stream detailed Blender assets after the low-cost procedural casino is ready. */
export function loadBlenderCasinoProps(root, { blackjack = [], roulette = [], slots = [] } = {}) {
  if (blackjack.length) getAsset('assets/models/blackjack_table.glb').then(model => installTables(root, model, blackjack, 'tables')).catch(() => {});
  if (roulette.length) getAsset('assets/models/roulette_table.glb').then(model => installTables(root, model, roulette, 'tables')).catch(() => {});
  if (slots.length) getAsset('assets/models/luxury_slot_machine.glb').then(model => installSlots(root, model, slots)).catch(() => {});
}
