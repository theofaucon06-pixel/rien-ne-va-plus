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

function installTables(root, template, targets, room, models, { proportional = false, name } = {}) {
  const size = new THREE.Box3().setFromObject(template).getSize(new THREE.Vector3());
  for (const target of targets) {
    const model = clone(template, room);
    model.position.copy(target.g.position);
    model.rotation.copy(target.g.rotation);
    if (proportional) {
      // Preserve the approved silhouette and the circular wheel. The old fit
      // stretched depth independently and made the wheel oval.
      const scale = Math.min(target.w / size.x, target.d / size.z);
      model.scale.setScalar(scale);
      const bounds = new THREE.Box3().setFromObject(model);
      Object.assign(target.bodyCollider, {
        x0: bounds.min.x - 0.04, x1: bounds.max.x + 0.04,
        z0: bounds.min.z - 0.04, z1: bounds.max.z + 0.04,
      });
    } else model.scale.set(target.w / size.x, 1, target.d / size.z);
    if (name) model.name = name;
    root.add(model);
    models.push(model);
    target.g.visible = false;
  }
}

function installSlots(root, template, targets, models) {
  for (const target of targets) {
    const model = clone(template, 'machines');
    model.position.set(target.x, 0, target.z);
    model.rotation.y = target.yaw;
    root.add(model);
    models.push(model);
  }
}

/** Stream detailed Blender assets after the low-cost procedural casino is ready. */
export function loadBlenderCasinoProps(root, { blackjack = [], roulette = [], slots = [], models = [] } = {}) {
  const requests = [];
  if (blackjack.length) requests.push(getAsset('assets/models/blackjack-reference-v2.glb').then(model => installTables(root, model, blackjack, 'tables', models, { proportional: true, name: 'BlackjackTable' })));
  if (roulette.length) requests.push(getAsset('assets/models/roulette-reference-v2.glb').then(model => installTables(root, model, roulette, 'tables', models, { proportional: true, name: 'EuropeanRouletteTable' })));
  if (slots.length) requests.push(getAsset('assets/models/luxury_slot_machine.glb').then(model => installSlots(root, model, slots, models)));
  return Promise.allSettled(requests);
}
