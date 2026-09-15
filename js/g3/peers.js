import * as THREE from "three";
import { textTexture } from "./textures.js";
import { EMOTES } from "../shared.js";
// Remote avatars are deliberately distinct from witnesses: coloured explorer jackets and name badges.
export class PeerAvatars {
  constructor(scene) {
    this.scene = scene;
    this.avatars = new Map();
  }
  create(p) {
    const g = new THREE.Group(),
      mat = new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.9 }),
      skin = new THREE.MeshStandardMaterial({ color: "#eac7a4", roughness: 1 });
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.23, 0.55, 4, 8),
      mat,
    );
    body.position.y = 1.0;
    g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), skin);
    head.position.y = 1.64;
    g.add(head);
    const limbs = [];
    for (const x of [-0.12, 0.12]) {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.66, 0.18),
        new THREE.MeshStandardMaterial({ color: "#20352e" }),
      );
      m.position.set(x, 0.4, 0);
      g.add(m);
      limbs.push(m);
    }
    for (const x of [-0.34, 0.34]) {
      const m = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.065, 0.42, 3, 6),
        mat,
      );
      m.position.set(x, 1.03, 0);
      g.add(m);
      limbs.push(m);
    }
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.32, 0.37, 24),
      new THREE.MeshBasicMaterial({ color: p.color, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    g.add(ring);
    const badge = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: textTexture(p.name, {
          w: 512,
          h: 96,
          font: "600 38px sans-serif",
          color: "#f5eddb",
          bg: "#102b23",
        }),
        depthTest: true,
      }),
    );
    badge.position.y = 2.05;
    badge.scale.set(1.65, 0.31, 1);
    g.add(badge);
    const bubble = new THREE.Sprite(
      new THREE.SpriteMaterial({ transparent: true }),
    );
    bubble.position.y = 2.5;
    bubble.scale.set(2.8, 0.42, 1);
    bubble.visible = false;
    g.add(bubble);
    this.scene.add(g);
    const a = { g, limbs, bubble, emote: null };
    this.avatars.set(p.id, a);
    return a;
  }
  update(players, dt) {
    const ids = new Set(players.map((p) => p.id));
    for (const [id, a] of this.avatars)
      if (!ids.has(id)) {
        this.scene.remove(a.g);
        const mats = new Set();
        a.g.traverse((o) => {
          o.geometry?.dispose();
          if (o.material) mats.add(o.material);
        });
        for (const m of mats) {
          m.map?.dispose();
          m.dispose();
        }
        this.avatars.delete(id);
      }
    for (const p of players) {
      const a = this.avatars.get(p.id) || this.create(p);
      a.g.position.set(p.x / 40, 0, p.y / 40);
      a.g.rotation.y = p.yaw + Math.PI;
      for (let i = 0; i < a.limbs.length; i++)
        a.limbs[i].rotation.x = p.moving
          ? Math.sin(p.walk * 9) * (i % 2 ? 1 : -1) * 0.38
          : 0;
      const show = p.emote && p.emoteUntil > Date.now();
      a.bubble.visible = !!show;
      if (show && a.emote !== p.emote) {
        a.emote = p.emote;
        a.bubble.material.map?.dispose();
        a.bubble.material.map = textTexture(EMOTES[p.emote] || "", {
          w: 768,
          h: 96,
          font: "500 36px sans-serif",
          color: "#172d23",
          bg: "#f0e7d0",
        });
        a.bubble.material.needsUpdate = true;
      }
    }
  }
}
