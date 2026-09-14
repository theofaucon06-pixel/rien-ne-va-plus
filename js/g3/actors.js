// Low-poly characters: ghosts (witnesses), staff, patrons, plus floating name tags.
import * as THREE from 'three';
import { textTexture } from './textures.js';
import { S } from './level.js';

const TAU = Math.PI * 2;

function humanoid({ body = 0x607d8b, skin = 0xe8b58f, hair = 0x3e2723, ghost = false, staff = false, seated = false }) {
  const g = new THREE.Group();
  const mk = (color, opts = {}) => ghost
    ? new THREE.MeshStandardMaterial({ color: 0xcfe7ff, emissive: 0x7fb0ff, emissiveIntensity: 0.55, transparent: true, opacity: 0.55, roughness: 1, depthWrite: false })
    : new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...opts });
  const bodyMat = mk(body), skinMat = mk(skin), hairMat = mk(hair), darkMat = mk(0x1b1b22), whiteMat = mk(0xf5f1e8);
  const legH = seated ? 0.45 : 0.8;
  const legY = seated ? 0.22 : 0.4;
  const legs = [new THREE.Mesh(new THREE.BoxGeometry(0.16, legH, 0.18), darkMat), new THREE.Mesh(new THREE.BoxGeometry(0.16, legH, 0.18), darkMat)];
  legs[0].position.set(-0.11, legY, 0); legs[1].position.set(0.11, legY, 0); g.add(legs[0], legs[1]);
  const torsoY = (seated ? 0.45 : 0.8) + 0.33;
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.42, 4, 10), bodyMat); torso.position.y = torsoY; g.add(torso);
  if (staff) { const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.36, 0.06), whiteMat); shirt.position.set(0, torsoY + 0.05, 0.2); g.add(shirt); const tie = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.22, 0.02), mk(0xb3261e)); tie.position.set(0, torsoY + 0.02, 0.24); g.add(tie); }
  const arms = [new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.4, 4, 8), bodyMat), new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.4, 4, 8), bodyMat)];
  arms[0].position.set(-0.3, torsoY, 0); arms[1].position.set(0.3, torsoY, 0); arms[0].rotation.z = 0.12; arms[1].rotation.z = -0.12; g.add(arms[0], arms[1]);
  const headY = torsoY + 0.52;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 14), skinMat); head.position.y = headY; g.add(head);
  const hairM = new THREE.Mesh(new THREE.SphereGeometry(0.175, 14, 8, 0, TAU, 0, Math.PI / 2), hairMat); hairM.position.y = headY + 0.02; g.add(hairM);
  const eyeMat = new THREE.MeshBasicMaterial({ color: ghost ? 0x0d1a26 : 0x111111 });
  [-0.06, 0.06].forEach(x => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), eyeMat); e.position.set(x, headY + 0.02, 0.15); g.add(e); });
  g.userData.parts = { torso, head, arms, legs };
  g.userData.height = headY + 0.2;
  return g;
}

export function buildActors(scene, state, L) {
  const actors = [];
  for (const n of state.npcs) {
    const ghost = n.kind === 'ghost', staff = n.kind === 'staff', patron = n.kind === 'patron';
    const color = n.color ? parseInt(n.color.replace('#', ''), 16) : 0x607d8b;
    const g = humanoid({ body: color, ghost, staff, seated: patron });
    const x = n.x * S, z = n.y * S;
    g.position.set(x, 0, z);
    const facing = n.facing || (ghost ? 'down' : 'down');
    g.rotation.y = { up: Math.PI, down: 0, left: -Math.PI / 2, right: Math.PI / 2 }[facing] ?? 0;
    if (n.id === 'sami') { g.position.y = -0.35; g.rotation.y = 0; }
    scene.add(g);
    // glow sprite for ghosts
    if (ghost) {
      const c = document.createElement('canvas'); c.width = c.height = 128; const gg = c.getContext('2d'); const grd = gg.createRadialGradient(64, 64, 4, 64, 64, 64); grd.addColorStop(0, 'rgba(170,220,255,0.55)'); grd.addColorStop(1, 'rgba(170,220,255,0)'); gg.fillStyle = grd; gg.fillRect(0, 0, 128, 128);
      const tex = new THREE.CanvasTexture(c); const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); sp.scale.set(2.2, 2.6, 1); sp.position.y = 1.0; g.add(sp);
    }
    // name tag
    let tag = null;
    if (n.name) {
      const tex = textTexture(n.name, { w: 512, h: 128, font: '600 54px Inter, sans-serif', color: ghost ? '#dcecff' : '#f5f1e8', bg: 'rgba(10,10,14,0.7)' });
      tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })); tag.scale.set(1.6, 0.4, 1); tag.position.y = g.userData.height + 0.25; tag.material.opacity = 0; g.add(tag);
    }
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.0, 0.9), new THREE.MeshBasicMaterial({ visible: false })); hit.visible = false; hit.position.set(x, 1.0, z); hit.userData = { target: { kind: 'npc', n } }; scene.add(hit);
    if (!n.r) hit.userData = {}; else L.hits.push(hit);
    actors.push({ n, g, tag, hit, ghost, base: g.position.y, phase: Math.random() * TAU });
  }
  return actors;
}

export function updateActors(actors, t, playerPos, hovered) {
  for (const a of actors) {
    const n = a.n;
    a.g.visible = !n.hidden; a.hit.visible = false;
    if (n.hidden) continue;
    const dx = playerPos.x - a.g.position.x, dz = playerPos.z - a.g.position.z; const dist = Math.hypot(dx, dz);
    if (a.ghost) {
      a.g.position.y = a.base + Math.sin(t * 1.4 + a.phase) * 0.06;
      if (dist < 9) { const want = Math.atan2(dx, dz); a.g.rotation.y += (want - a.g.rotation.y) * 0.04; }
      a.g.userData.parts.torso.material.emissiveIntensity = 0.45 + 0.2 * Math.sin(t * 2 + a.phase);
    } else {
      const p = a.g.userData.parts; p.torso.position.y += Math.sin(t * 1.8 + a.phase) * 0.0008;
      if (n.kind === 'staff' && dist < 6 && n.id !== 'hote') { const want = Math.atan2(dx, dz); a.g.rotation.y += (want - a.g.rotation.y) * 0.05; }
      if (n.id === 'hote' && dist < 8) { const want = Math.atan2(dx, dz); a.g.rotation.y += (want - a.g.rotation.y) * 0.05; }
    }
    if (a.tag) {
      const show = (hovered && hovered.kind === 'npc' && hovered.n === n) || (a.ghost && dist < 7) || (n.witness && dist < 4);
      a.tag.material.opacity += ((show ? 1 : 0) - a.tag.material.opacity) * 0.15;
    }
  }
}
