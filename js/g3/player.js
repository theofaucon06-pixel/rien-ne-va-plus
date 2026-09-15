// First-person controller: pointer lock look, WASD/ZQSD movement, circle-vs-AABB collision, head bob.
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

export const EYE = 1.62;

export class Player {
  constructor(camera, dom) {
    this.camera = camera;
    this.controls = new PointerLockControls(camera, dom);
    this.radius = 0.36;
    this.keys = new Set();
    this.bob = 0; this.moving = false; this.stepPhase = 0; this.onStep = null;
    this.vel = new THREE.Vector3();
    this.colliders = [];
    this._dir = new THREE.Vector3(); this._right = new THREE.Vector3(); this._up = new THREE.Vector3(0, 1, 0);
  }
  get locked() { return this.controls.isLocked; }
  lock() {
    // same as PointerLockControls.lock(), but the browser's promise is caught: a refused lock (too soon after
    // Escape, or no user gesture) must not surface as an uncaught error
    try { const p = this.controls.domElement.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { }
  }
  unlock() { if (this.controls.isLocked) this.controls.unlock(); }
  setPosition(x, z, yaw) {
    this.camera.position.set(x, EYE, z);
    if (yaw !== undefined) this.camera.rotation.set(0, yaw, 0, 'YXZ');
  }
  down(dir) {
    const M = { f: ['ArrowUp', 'w', 'W', 'z', 'Z'], b: ['ArrowDown', 's', 'S'], l: ['ArrowLeft', 'a', 'A', 'q', 'Q'], r: ['ArrowRight', 'd', 'D'] };
    return M[dir].some(k => this.keys.has(k));
  }
  blocked(x, z) {
    const r = this.radius;
    for (const c of this.colliders) {
      if (c.disabled) continue;
      const cx = Math.max(c.x0, Math.min(x, c.x1)), cz = Math.max(c.z0, Math.min(z, c.z1));
      const dx = x - cx, dz = z - cz;
      if (dx * dx + dz * dz < r * r) return true;
    }
    return false;
  }
  update(dt, { enabled = true, drunk = false, t = 0 } = {}) {
    const cam = this.camera;
    let f = 0, s = 0;
    if (enabled) { if (this.down('f')) f += 1; if (this.down('b')) f -= 1; if (this.down('r')) s += 1; if (this.down('l')) s -= 1; }
    const run = this.keys.has('Shift');
    const speed = (run ? 5.6 : 3.3) * (drunk ? 0.8 : 1);
    // desired velocity in world space
    cam.getWorldDirection(this._dir); this._dir.y = 0; this._dir.normalize();
    this._right.crossVectors(this._dir, this._up).normalize();
    const want = new THREE.Vector3().addScaledVector(this._dir, f).addScaledVector(this._right, s);
    if (want.lengthSq() > 0) want.normalize().multiplyScalar(speed);
    if (drunk && want.lengthSq() > 0) { const a = Math.sin(t * 1.3) * 0.5; const c = Math.cos(a), sn = Math.sin(a); const x = want.x * c - want.z * sn, z = want.x * sn + want.z * c; want.set(x, 0, z); }
    // smooth acceleration
    const k = 1 - Math.pow(0.0005, dt);
    this.vel.lerp(want, k);
    const nx = cam.position.x + this.vel.x * dt, nz = cam.position.z + this.vel.z * dt;
    const stuck = this.blocked(cam.position.x, cam.position.z); // never trap the player inside geometry
    if (stuck || !this.blocked(nx, cam.position.z)) cam.position.x = nx; else this.vel.x = 0;
    if (stuck || !this.blocked(cam.position.x, nz)) cam.position.z = nz; else this.vel.z = 0;
    // head bob + footsteps
    const sp = Math.hypot(this.vel.x, this.vel.z);
    this.moving = sp > 0.4;
    if (this.moving) {
      const prev = this.stepPhase; this.stepPhase += dt * (run ? 11 : 8);
      if (Math.floor(prev / Math.PI) !== Math.floor(this.stepPhase / Math.PI) && this.onStep) this.onStep();
      this.bob = Math.sin(this.stepPhase) * 0.035 * Math.min(1, sp / 3);
    } else { this.bob *= 0.85; }
    const roll = drunk ? Math.sin(t * 0.9) * 0.03 : 0;
    cam.position.y = EYE + this.bob + (drunk ? Math.sin(t * 1.7) * 0.02 : 0);
    cam.rotation.z = roll;
  }
}
