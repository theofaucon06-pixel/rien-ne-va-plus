// Procedural audio: no assets, everything synthesised with the Web Audio API.

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.ambient = null;
    this.room = null;
    this.lowpass = null;
  }
  ensure() {
    if (this.ctx) return true;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.8;
      this.lowpass = this.ctx.createBiquadFilter();
      this.lowpass.type = 'lowpass';
      this.lowpass.frequency.value = 18000;
      this.lowpass.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.sfx = this.ctx.createGain(); this.sfx.gain.value = 0.9; this.sfx.connect(this.lowpass);
      this.amb = this.ctx.createGain(); this.amb.gain.value = 0.0; this.amb.connect(this.lowpass);
      this.startAmbient();
      return true;
    } catch (e) { return false; }
  }
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.05);
  }
  setZone(on) {
    if (!this.lowpass) return;
    this.lowpass.frequency.setTargetAtTime(on ? 900 : 18000, this.ctx.currentTime, 0.6);
  }

  // --- ambient bed -------------------------------------------------------
  startAmbient() {
    const c = this.ctx;
    // brown-ish noise
    const buf = c.createBuffer(1, c.sampleRate * 3, c.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
    const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400;
    this.noiseGain = c.createGain(); this.noiseGain.gain.value = 0.35;
    src.connect(f); f.connect(this.noiseGain); this.noiseGain.connect(this.amb); src.start();
    // drone
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = 55;
    const o2 = c.createOscillator(); o2.type = 'triangle'; o2.frequency.value = 82.5;
    this.droneGain = c.createGain(); this.droneGain.gain.value = 0.08;
    o.connect(this.droneGain); o2.connect(this.droneGain); this.droneGain.connect(this.amb); o.start(); o2.start();
    // machine chatter scheduler
    this.chatter = 0;
    this._tick = () => {
      if (this.room === 'machines' || this.room === 'labyrinth') {
        if (Math.random() < (this.room === 'machines' ? 0.5 : 0.15)) this.bleep(0.05 + Math.random() * 0.05, 800 + Math.random() * 1400, Math.random() * 2 - 1);
      }
      setTimeout(this._tick, 350 + Math.random() * 900);
    };
    setTimeout(this._tick, 800);
  }
  setRoom(id, outdoor) {
    if (!this.ctx) return;
    this.room = id;
    const t = this.ctx.currentTime;
    const targets = { street: 0.25, ruelle: 0.2, hall: 0.45, machines: 0.7, tables: 0.5, bar: 0.6, toilettes: 0.25, labyrinth: 0.55, vip: 0.45, bureau: 0.3, corridor: 0.5, hallway: 0.5 };
    this.amb.gain.setTargetAtTime(targets[id] ?? 0.4, t, 0.8);
    this.droneGain.gain.setTargetAtTime(outdoor ? 0.02 : 0.08, t, 0.8);
    this.noiseGain.gain.setTargetAtTime(outdoor ? 0.5 : 0.35, t, 0.8);
  }

  // --- one-shots ---------------------------------------------------------
  env(node, t, a, d, peak = 1) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    node.connect(g); g.connect(this.sfx);
    return g;
  }
  bleep(vol, freq, pan = 0, dur = 0.12, type = 'square') {
    if (!this.ctx || this.muted) return;
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(); o.type = type; o.frequency.value = freq;
    const p = c.createStereoPanner ? c.createStereoPanner() : null;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    if (p) { p.pan.value = pan; g.connect(p); p.connect(this.sfx); } else g.connect(this.sfx);
    o.start(t); o.stop(t + dur + 0.05);
  }
  click() { this.bleep(0.15, 1200, 0, 0.05, 'triangle'); }
  step() {
    if (!this.ctx || this.muted) return;
    const c = this.ctx, t = c.currentTime;
    const buf = c.createBuffer(1, 1200, c.sampleRate); const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500 + Math.random() * 300;
    const g = c.createGain(); g.gain.value = 0.16;
    src.connect(f); f.connect(g); g.connect(this.sfx); src.start(t);
  }
  coin() {
    if (!this.ctx) return;
    this.bleep(0.18, 2200, 0, 0.09, 'sine');
    setTimeout(() => this.bleep(0.14, 2900, 0, 0.12, 'sine'), 60);
  }
  spinTick(i) { this.bleep(0.08, 300 + (i % 3) * 60, 0, 0.03, 'square'); }
  reelStop() { this.bleep(0.2, 180, 0, 0.08, 'triangle'); }
  fanfare(big = false) {
    if (!this.ctx || this.muted) return;
    const notes = big ? [523, 659, 784, 1047, 1319, 1568] : [523, 659, 784, 1047];
    notes.forEach((f, i) => setTimeout(() => this.bleep(0.22, f, 0, 0.22, 'square'), i * (big ? 90 : 70)));
    if (big) setTimeout(() => { for (let i = 0; i < 12; i++) setTimeout(() => this.coin(), i * 70); }, 500);
  }
  lose() { this.bleep(0.12, 160, 0, 0.18, 'sawtooth'); }
  ballTick(rate) { this.bleep(0.09, 1500, 0, 0.02, 'square'); }
  ballDrop() { this.bleep(0.25, 500, 0, 0.12, 'triangle'); setTimeout(() => this.bleep(0.2, 380, 0, 0.2, 'triangle'), 90); }
  card() { this.bleep(0.1, 900, 0, 0.03, 'triangle'); }
  reveal() {
    if (!this.ctx || this.muted) return;
    [330, 392, 494, 659].forEach((f, i) => setTimeout(() => this.bleep(0.16, f, 0, 0.5, 'sine'), i * 120));
  }
  door() { this.bleep(0.2, 120, 0, 0.3, 'sawtooth'); }
  drink() { this.bleep(0.15, 1800, 0, 0.1, 'sine'); setTimeout(() => this.bleep(0.15, 2400, 0, 0.2, 'sine'), 120); }
  vibrate() { for (let i = 0; i < 3; i++) setTimeout(() => this.bleep(0.12, 90, 0, 0.12, 'square'), i * 200); }
  talk() { this.bleep(0.06, 500 + Math.random() * 300, 0, 0.03, 'triangle'); }
}

export const audio = new AudioEngine();
