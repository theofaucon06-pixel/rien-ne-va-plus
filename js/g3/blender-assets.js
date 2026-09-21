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
export function loadBlenderCasinoProps(root, { blackjack = [], roulette = [], slots = [], models = [], facade, hall } = {}) {
  const requests = [];
  if (blackjack.length) requests.push(getAsset('assets/models/blackjack-reference-v2.glb').then(model => installTables(root, model, blackjack, 'tables', models, { proportional: true, name: 'BlackjackTable' })));
  if (roulette.length) requests.push(getAsset('assets/models/roulette-reference-v2.glb').then(model => installTables(root, model, roulette, 'tables', models, { proportional: true, name: 'EuropeanRouletteTable' })));
  if (slots.length) requests.push(getAsset('assets/models/luxury_slot_machine.glb').then(model => installSlots(root, model, slots, models)));
  if (facade) requests.push(getAsset('assets/models/casino-facade-v1.glb').then(model => installFacade(root, model, facade, models)));
  if (hall) requests.push(getAsset('assets/models/casino-hall-v1.glb').then(model => installHall(root, model, hall, models)));
  return Promise.allSettled(requests);
}

function installHall(root, template, { fallback, level: L }, models) {
  const model = clone(template, 'hall'); model.name = 'CasinoHall';
  model.position.set(40, 0, 13.5);
  const water = model.getObjectByName('FountainWater'), rotor = model.getObjectByName('FortuneRotor');
  if (!water || !rotor) throw new Error('Hall export is missing its animated fountain or wheel');
  model.traverse(node => {
    if (!node.isMesh) return;
    const mat = node.material;
    mat.envMapIntensity = mat.metalness > .5 ? .42 : .22;
    if (mat.name === 'Hall noir marble' || mat.name === 'Hall walnut') mat.envMapIntensity = .65;
    // Preserve the dark wood grain under the game's much softer night lighting.
    if (mat.name === 'Hall walnut') mat.color.setScalar(2);
    if (mat.name === 'Hall warm lamps') mat.emissiveIntensity = 1.15;
    if (mat.transparent) mat.depthWrite = false;
  });
  // The room shares the existing furniture footprints and all four doorways.
  // Gameplay hit targets and colliders stay outside the replaceable decoration.
  root.add(model); models.push(model); L.dynamic.hall = model; fallback.visible = false;
  for (const light of L.lightSpots) if (light.hallFallback) light.intensity = 0;
  for (const [x,z,intensity] of [[40,13.5,12],[36.1,10.8,8],[43.9,10.8,8],[36.1,16.6,8],[43.9,16.6,8]]) {
    L.lightSpots.push({ x, y:3.35, z, color:new THREE.Color(0xffdfb1), intensity, distance:8, room:'hall' });
  }
  L.updaters.push(Object.assign((t) => {
    rotor.rotation.z = t * .12;
    water.rotation.y = t * .035;
  }, { room:'hall' }));
}

function installFacade(root, template, { fallback, walls, level: L, state }, models) {
  const model = clone(template, 'street'); model.name = 'CasinoFacade';
  model.position.set(38, 0, 8); model.rotation.y = Math.PI;
  const left = model.getObjectByName('DoorLeft'), right = model.getObjectByName('DoorRight');
  if (!left || !right) throw new Error('Facade export is missing its door hinges');
  const materials = {};
  model.traverse(node => { if (node.isMesh) {
    materials[node.material.name] = node.material;
    if (node.material.transparent) node.material.depthWrite = false;
  } });
  const stone = materials['Facade limestone'], marble = materials['Facade dark marble'], cap = materials['Facade canopy charcoal'];
  // RoomEnvironment is an indoor studio: its default reflection strength blows
  // out pale exterior stone and polished brass, especially with HDR bloom.
  for (const material of Object.values(materials)) {
    material.envMapIntensity = material.metalness > .5 ? .35 : .15;
    if (material.name === 'Facade brushed brass') material.roughness = .42;
    if (material.name === 'Facade warm light') material.emissiveIntensity = .8;
  }
  const dressing = new THREE.Group(); dressing.name = 'FacadeWings';
  dressing.userData.dynamic = true; dressing.userData.room = 'street';
  const block = (w,h,d,mat,x,y,z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat); m.position.set(x,y,z); dressing.add(m);
  };
  // Carry the reference's stone, plinth and coping along the original building.
  for (const wall of walls) {
    const width = wall.geometry.parameters.width, cx = wall.position.x;
    const finish = stone.clone(); finish.map = stone.map.clone(); finish.map.wrapS = finish.map.wrapT = THREE.RepeatWrapping;
    finish.map.repeat.set(width / 2, 3); finish.map.needsUpdate = true;
    wall.material = [...wall.material]; wall.material[5] = finish;
    const start = cx < 38 ? cx-width/2 : 42.22;
    const end = cx < 38 ? 33.78 : cx+width/2;
    const span = end-start, center = (start+end)/2;
    block(span,.48,.05,marble,center,.24,7.968);
    block(span,.10,.22,cap,center,4.40,7.96);
    block(span,.07,.18,stone,center,4.29,7.95);
    const joint = new THREE.MeshStandardMaterial({ color: 0xa69d89, roughness: 1 });
    for (let y=.65;y<4.2;y+=.63) block(span,.008,.008,joint,center,y,7.989);
  }
  root.add(model, dressing); models.push(model, dressing); fallback.visible = false;
  L.dynamic.facade = model;
  const hit = L.hits.find(h => h.userData.target?.o?.type === 'entrance');
  if (hit) hit.userData.target.o = { ...hit.userData.target.o, label: 'Les portes du casino', glassDoors: true };
  L.colliders.push({ x0:33.78,x1:37.08,z0:7.45,z1:8.01 }, { x0:38.92,x1:42.22,z0:7.45,z1:8.01 });
  const doorCollider = { x0:37.08,x1:38.92,z0:7.68,z1:7.84,disabled:false }; L.colliders.push(doorCollider);
  let angle = 0;
  L.updaters.push((_t,dt) => {
    const near = Math.abs(state.player.x / 40 - 38) < 2.3 && Math.abs(state.player.y / 40 - 7.78) < 3;
    const target = near ? Math.PI / 2 : 0;
    angle += (target-angle)*(1-Math.exp(-8*dt));
    left.rotation.y = -angle; right.rotation.y = angle;
    doorCollider.disabled = angle > 1.2;
    model.userData.doorOpen = doorCollider.disabled;
  });
  L.groundHeight = (x,z) => {
    const dx = Math.abs(x-38);
    if (z>=8 && z<=8.67 && dx<.98) return .24*(1-(z-8)/.67);
    if (z>=7.36 && z<8 && dx<2.09) return .24;
    if (z>=6.81 && z<7.97 && dx<2.30) return .16;
    if (z>=6.26 && z<7.98 && dx<2.50) return .08;
    return 0;
  };
  // The old sign and lanterns disappear with the fallback geometry; their light
  // sources must disappear too. Keep them untouched if the new asset fails.
  for (const light of L.lightSpots) if (light.facadeFallback) light.intensity = 0;
  for (const x of [36.45,38,39.55]) L.lightSpots.push({ x,y:2.91,z:7.10,color:new THREE.Color(0xffd5a0),intensity:2.25,distance:4,room:'street' });
  L.lightSpots.push({ x:38,y:4.65,z:6.6,color:new THREE.Color(0xffdfb4),intensity:3,distance:5,room:'street' });
}
