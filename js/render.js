// Canvas renderer: floors, walls, furniture, characters, lighting.
import { ROOMS, WALLS, SLOTS, OBJECTS, LIGHTS, WORLD, roomAt } from './world.js';

const TAU = Math.PI * 2;
const WHEEL_ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.light = document.createElement('canvas');
    this.lctx = this.light.getContext('2d');
    this.cam = { x: 0, y: 0, zoom: 1 };
    this.time = 0;
    this.patterns = {};
    this.wheelSprite = this.makeWheelSprite(52);
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.dpr = dpr;
    this.w = window.innerWidth; this.h = window.innerHeight;
    this.canvas.width = this.w * dpr; this.canvas.height = this.h * dpr;
    this.canvas.style.width = this.w + 'px'; this.canvas.style.height = this.h + 'px';
    this.light.width = this.canvas.width; this.light.height = this.canvas.height;
    this.cam.zoom = Math.max(1.3, Math.min(2.4, Math.min(this.w / 720, this.h / 450)));
    this.patterns = {};
  }

  // ---------------------------------------------------------------- patterns
  pattern(name) {
    if (this.patterns[name]) return this.patterns[name];
    const c = document.createElement('canvas');
    const g = c.getContext('2d');
    const P = (w, h, fn) => { c.width = w; c.height = h; fn(g, w, h); };
    switch (name) {
      case 'carpet': P(96, 96, (g, w, h) => {
        g.fillStyle = '#15382c'; g.fillRect(0, 0, w, h);
        g.strokeStyle = 'rgba(198,161,79,0.22)'; g.lineWidth = 1.2;
        for (const [ox, oy] of [[0, 0], [48, 48]]) { g.beginPath(); g.moveTo(ox + 24, oy); g.lineTo(ox + 48, oy + 24); g.lineTo(ox + 24, oy + 48); g.lineTo(ox, oy + 24); g.closePath(); g.stroke(); }
        g.fillStyle = 'rgba(198,161,79,0.18)';
        for (const [ox, oy] of [[24, 24], [72, 72], [72, 24], [24, 72]]) { g.beginPath(); g.arc(ox, oy, 2.2, 0, TAU); g.fill(); }
        for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.08})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
      }); break;
      case 'carpet2': P(80, 80, (g, w, h) => {
        g.fillStyle = '#2a1d3a'; g.fillRect(0, 0, w, h);
        g.strokeStyle = 'rgba(255,170,90,0.14)'; g.lineWidth = 1;
        for (let i = -80; i < 160; i += 20) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 80, 80); g.stroke(); }
        g.fillStyle = 'rgba(255,200,120,0.10)';
        for (let x = 10; x < w; x += 20) for (let y = 10; y < h; y += 20) g.fillRect(x - 1, y - 1, 2, 2);
      }); break;
      case 'carpetred': P(96, 96, (g, w, h) => {
        g.fillStyle = '#4a1418'; g.fillRect(0, 0, w, h);
        g.strokeStyle = 'rgba(255,200,120,0.18)'; g.lineWidth = 1.2;
        for (const [ox, oy] of [[0, 0], [48, 48]]) { g.beginPath(); g.arc(ox + 24, oy + 24, 18, 0, TAU); g.stroke(); }
        g.fillStyle = 'rgba(255,200,120,0.12)';
        for (const [ox, oy] of [[24, 24], [72, 72], [72, 24], [24, 72]]) { g.beginPath(); g.arc(ox, oy, 3, 0, TAU); g.fill(); }
      }); break;
      case 'marble': P(128, 128, (g, w, h) => {
        g.fillStyle = '#d9d2c4'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 12; i++) { g.strokeStyle = `rgba(120,110,95,${0.08 + Math.random() * 0.1})`; g.lineWidth = 1 + Math.random(); g.beginPath(); let x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (Math.random() - 0.5) * 60; y += (Math.random() - 0.5) * 60; g.lineTo(x, y); } g.stroke(); }
        g.strokeStyle = 'rgba(80,70,60,0.25)'; g.lineWidth = 1.5; g.strokeRect(0.5, 0.5, 64, 64); g.strokeRect(64.5, 64.5, 64, 64); g.strokeRect(64.5, 0.5, 64, 64); g.strokeRect(0.5, 64.5, 64, 64);
      }); break;
      case 'tile': P(48, 48, (g, w, h) => {
        g.fillStyle = '#cfd8dc'; g.fillRect(0, 0, w, h);
        g.strokeStyle = 'rgba(60,80,90,0.35)'; g.lineWidth = 1.5; g.strokeRect(0.75, 0.75, 24, 24); g.strokeRect(24.75, 24.75, 24, 24); g.strokeRect(24.75, 0.75, 24, 24); g.strokeRect(0.75, 24.75, 24, 24);
        g.fillStyle = '#b0bec5'; g.fillRect(24, 0, 24, 24); g.fillRect(0, 24, 24, 24);
      }); break;
      case 'wood': P(120, 60, (g, w, h) => {
        g.fillStyle = '#4e3626'; g.fillRect(0, 0, w, h);
        for (let y = 0; y < h; y += 15) { g.fillStyle = `rgba(0,0,0,${0.12 + (y / 15 % 2) * 0.08})`; g.fillRect(0, y, w, 1.5); g.fillStyle = 'rgba(255,200,150,0.05)'; g.fillRect(0, y + 7, w, 1); }
        for (let i = 0; i < 20; i++) { g.strokeStyle = 'rgba(0,0,0,0.12)'; g.beginPath(); const y = Math.random() * h; g.moveTo(0, y); g.bezierCurveTo(40, y + 3, 80, y - 3, 120, y); g.stroke(); }
      }); break;
      case 'asphalt': P(64, 64, (g, w, h) => {
        g.fillStyle = '#23262b'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.06})`; g.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5); }
      }); break;
      case 'concrete': P(96, 96, (g, w, h) => {
        g.fillStyle = '#4a4d52'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
        g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2; g.strokeRect(1, 1, 94, 94);
      }); break;
      case 'brick': P(64, 32, (g, w, h) => {
        g.fillStyle = '#5a3b33'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#7a4f42';
        g.fillRect(1, 1, 30, 14); g.fillRect(33, 1, 30, 14); g.fillRect(-15, 17, 30, 14); g.fillRect(17, 17, 30, 14); g.fillRect(49, 17, 30, 14);
      }); break;
    }
    const p = this.ctx.createPattern(c, 'repeat');
    this.patterns[name] = p;
    return p;
  }

  makeWheelSprite(R) {
    const c = document.createElement('canvas'); c.width = c.height = R * 2 + 4;
    const g = c.getContext('2d'); const cx = R + 2, cy = R + 2;
    g.fillStyle = '#3b2412'; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill();
    const n = 37;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * TAU - Math.PI / 2, a1 = ((i + 1) / n) * TAU - Math.PI / 2;
      const num = WHEEL_ORDER[i];
      g.fillStyle = num === 0 ? '#1e7a4c' : REDS.has(num) ? '#b3261e' : '#161616';
      g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R - 4, a0, a1); g.closePath(); g.fill();
    }
    g.strokeStyle = '#c6a14f'; g.lineWidth = 1.5; g.beginPath(); g.arc(cx, cy, R - 4, 0, TAU); g.stroke();
    g.fillStyle = '#2b1a0e'; g.beginPath(); g.arc(cx, cy, R * 0.45, 0, TAU); g.fill();
    g.strokeStyle = '#c6a14f'; g.beginPath(); g.arc(cx, cy, R * 0.45, 0, TAU); g.stroke();
    g.fillStyle = '#c6a14f'; g.beginPath(); g.arc(cx, cy, 4, 0, TAU); g.fill();
    return c;
  }

  // ---------------------------------------------------------------- camera
  updateCamera(target, dt, snap = false) {
    const z = this.cam.zoom;
    const vw = this.w / z, vh = this.h / z;
    let tx = target.x - vw / 2, ty = target.y - vh / 2 - 20;
    tx = Math.max(-40, Math.min(WORLD.w - vw + 40, tx));
    ty = Math.max(-40, Math.min(WORLD.h - vh + 40, ty));
    if (snap) { this.cam.x = tx; this.cam.y = ty; return; }
    const k = 1 - Math.pow(0.001, dt);
    this.cam.x += (tx - this.cam.x) * k; this.cam.y += (ty - this.cam.y) * k;
  }
  visible(r, pad = 80) {
    const z = this.cam.zoom;
    return r.x + r.w > this.cam.x - pad && r.x < this.cam.x + this.w / z + pad && r.y + r.h > this.cam.y - pad && r.y < this.cam.y + this.h / z + pad;
  }

  // ---------------------------------------------------------------- main draw
  draw(state, dt) {
    this.time += dt;
    if (window.innerWidth !== this.w || window.innerHeight !== this.h) this.resize();
    const ctx = this.ctx, z = this.cam.zoom, dpr = this.dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#05070c'; ctx.fillRect(0, 0, this.w, this.h);
    ctx.setTransform(dpr * z, 0, 0, dpr * z, -this.cam.x * dpr * z, -this.cam.y * dpr * z);
    ctx.imageSmoothingEnabled = true;

    this.drawFloors(state);
    this.drawRoomDetails(state);
    this.drawWalls(state);
    this.drawWallMounted(state);
    this.drawEntities(state);
    this.drawLighting(state);
    this.drawDoors(state);
    this.drawOverlays(state);
  }

  // doors are drawn after the lighting so they stay readable in the dark
  drawDoors(state) {
    const ctx = this.ctx, z = this.cam.zoom, dpr = this.dpr;
    ctx.setTransform(dpr * z, 0, 0, dpr * z, -this.cam.x * dpr * z, -this.cam.y * dpr * z);
    for (const o of OBJECTS) {
      if (!this.visible(o)) continue;
      if (o.type === 'staffdoor') {
        ctx.fillStyle = '#5a5f66'; ctx.fillRect(o.x, o.y, o.w, o.h); ctx.fillStyle = '#c6a14f'; ctx.fillRect(o.x + 16, o.y + 38, 3, 6);
        ctx.save(); ctx.translate(o.x + 12, o.y + 40); ctx.rotate(-Math.PI / 2); ctx.fillStyle = '#e0e0e0'; ctx.font = '600 6px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('PERSONNEL', 0, -4); ctx.restore();
      } else if (o.type === 'exitdoor') {
        ctx.fillStyle = state.flags.exited ? '#7fd0ff' : '#5a5f66'; ctx.fillRect(o.x, o.y, o.w, o.h); ctx.fillStyle = '#c6a14f'; ctx.fillRect(o.x + 5, o.y + 28, 3, 6);
        ctx.fillStyle = 'rgba(127,208,255,0.35)'; ctx.fillRect(o.x + 6, o.y - 4, 12, 3);
      } else if (o.type === 'vipdoor' && !state.flags.vipOpen) {
        ctx.fillStyle = '#c6a14f'; ctx.fillRect(o.x + 4, o.y - 8, 5, 32); ctx.fillRect(o.x + o.w - 9, o.y - 8, 5, 32);
        ctx.strokeStyle = '#b3261e'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(o.x + 6, o.y); ctx.quadraticCurveTo(o.x + o.w / 2, o.y + 14, o.x + o.w - 6, o.y); ctx.stroke();
      }
    }
  }

  drawFloors(state) {
    const ctx = this.ctx;
    for (const r of ROOMS) {
      if (!this.visible(r)) continue;
      ctx.fillStyle = this.pattern(r.floor);
      ctx.fillRect(r.x, r.y, r.w, r.h);
    }
    // hall red carpet
    ctx.fillStyle = '#7a1f22'; ctx.fillRect(1490, 344, 60, 150);
    ctx.fillStyle = 'rgba(255,220,150,0.25)'; ctx.fillRect(1490, 344, 3, 150); ctx.fillRect(1547, 344, 3, 150);
    // street: road + sidewalk edge
    if (this.visible({ x: 0, y: 0, w: WORLD.w, h: 320 })) {
      ctx.fillStyle = '#1b1d21'; ctx.fillRect(0, 0, WORLD.w, 110);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.setLineDash([30, 26]); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 55); ctx.lineTo(WORLD.w, 55); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#5a5d63'; ctx.fillRect(0, 110, WORLD.w, 8);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
      for (let x = 0; x < WORLD.w; x += 64) { ctx.beginPath(); ctx.moveTo(x, 118); ctx.lineTo(x, 320); ctx.stroke(); }
    }
    // parked cars on the road
    if (this.visible({ x: 0, y: 0, w: WORLD.w, h: 120 })) {
      [[700, '#8d2f2f'], [1150, '#2f4f8d'], [2100, '#3a3a3a'], [2650, '#6f6f6f']].forEach(([x, c]) => {
        ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(x + 4, 82, 120, 40);
        ctx.fillStyle = c; this.rr(x, 66, 120, 44, 10); ctx.fill();
        ctx.fillStyle = '#9fc4e8'; this.rr(x + 22, 70, 76, 14, 4); ctx.fill();
        ctx.fillStyle = '#111'; ctx.fillRect(x + 12, 62, 18, 6); ctx.fillRect(x + 90, 62, 18, 6); ctx.fillRect(x + 12, 108, 18, 6); ctx.fillRect(x + 90, 108, 18, 6);
        ctx.fillStyle = '#ffe9a8'; ctx.fillRect(x + 114, 72, 5, 8); ctx.fillRect(x + 114, 96, 5, 8);
      });
      // bench + bin near the bus stop
      ctx.fillStyle = '#3e2723'; ctx.fillRect(360, 150, 70, 14); ctx.fillRect(364, 164, 6, 10); ctx.fillRect(420, 164, 6, 10);
      ctx.fillStyle = '#37474f'; ctx.fillRect(450, 146, 16, 24);
    }
  }

  drawRoomDetails(state) {
    const ctx = this.ctx, t = this.time;
    // hall fountain
    if (this.visible({ x: 1560, y: 500, w: 80, h: 80 })) {
      ctx.fillStyle = '#9e9482'; ctx.beginPath(); ctx.arc(1600, 540, 44, 0, TAU); ctx.fill();
      ctx.fillStyle = '#2b6f8a'; ctx.beginPath(); ctx.arc(1600, 540, 36, 0, TAU); ctx.fill();
      for (let i = 0; i < 3; i++) { const p = ((t * 0.5 + i / 3) % 1); ctx.strokeStyle = `rgba(200,240,255,${0.5 * (1 - p)})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(1600, 540, 6 + p * 28, 0, TAU); ctx.stroke(); }
      ctx.fillStyle = '#c6a14f'; ctx.beginPath(); ctx.arc(1600, 540, 6, 0, TAU); ctx.fill();
    }
    // toilettes: mirror + sink
    if (this.visible({ x: 1184, y: 880, w: 152, h: 200 })) {
      ctx.fillStyle = '#eceff1'; ctx.fillRect(1200, 884, 120, 18);
      ctx.fillStyle = '#90a4ae'; ctx.fillRect(1215, 888, 20, 10); ctx.fillRect(1250, 888, 20, 10); ctx.fillRect(1285, 888, 20, 10);
      ctx.fillStyle = '#b0bec5'; ctx.fillRect(1290, 1050, 40, 26); // stall
    }
    // bar shelves (on south wall band)
    if (this.visible({ x: 1360, y: 1100, w: 480, h: 70 })) {
      ctx.fillStyle = '#2e1b12'; ctx.fillRect(1400, 1140, 400, 28);
      const cols = ['#ff7043', '#ffca28', '#29b6f6', '#ab47bc', '#66bb6a', '#ef5350', '#26c6da'];
      for (let i = 0; i < 26; i++) { ctx.fillStyle = cols[i % cols.length]; ctx.fillRect(1410 + i * 15, 1146 + (i % 2) * 3, 7, 16 - (i % 2) * 3); }
      // stools
      ctx.fillStyle = '#6d4c41'; [1440, 1500, 1560, 1620, 1680, 1740].forEach(x => { ctx.beginPath(); ctx.arc(x, 1040, 9, 0, TAU); ctx.fill(); });
    }
    // vip extras: bar cart, plants
    if (this.visible({ x: 2024, y: 1368, w: 976, h: 232 })) {
      ctx.fillStyle = '#c6a14f'; ctx.fillRect(2900, 1400, 40, 26);
      ctx.fillStyle = '#ffca28'; ctx.fillRect(2905, 1392, 6, 10); ctx.fillStyle = '#29b6f6'; ctx.fillRect(2916, 1390, 6, 12); ctx.fillStyle = '#ef5350'; ctx.fillRect(2927, 1393, 6, 9);
      this.plant(2060, 1560); this.plant(2960, 1560);
    }
    // bureau: safe + papers
    if (this.visible({ x: 2024, y: 1624, w: 376, h: 304 })) {
      ctx.fillStyle = '#37474f'; ctx.fillRect(2340, 1840, 40, 50); ctx.fillStyle = '#c6a14f'; ctx.beginPath(); ctx.arc(2360, 1865, 6, 0, TAU); ctx.fill();
      ctx.fillStyle = '#cfd8dc'; ctx.fillRect(2050, 1840, 30, 40); ctx.fillRect(2054, 1850, 30, 40);
    }
    // ruelle puddles
    if (this.visible({ x: 0, y: 320, w: 176, h: 1608 })) {
      ctx.fillStyle = 'rgba(120,160,200,0.18)'; ctx.beginPath(); ctx.ellipse(70, 700, 40, 14, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(110, 1500, 30, 10, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = this.pattern('brick'); ctx.fillRect(176, 320, 24, 1608);
    }
    // hall plants
    this.plant(1390, 720); this.plant(1810, 720); this.plant(1880, 1300); this.plant(2980, 1300);
  }
  plant(x, y) {
    const ctx = this.ctx;
    ctx.fillStyle = '#5d4037'; ctx.beginPath(); ctx.arc(x, y, 10, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2e7d32';
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * 9, y - 6 + Math.sin(a) * 6, 9, 4, a, 0, TAU); ctx.fill(); }
  }

  drawWalls(state) {
    const ctx = this.ctx;
    const walls = WALLS;
    for (const w of walls) {
      if (!this.visible(w)) continue;
      ctx.fillStyle = '#1b1b22'; ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.fillStyle = '#34343f'; ctx.fillRect(w.x, w.y, w.w, Math.min(6, w.h));
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(w.x, w.y + w.h, w.w, 6);
      // gold trim line on inner walls
      ctx.fillStyle = 'rgba(198,161,79,0.35)'; ctx.fillRect(w.x, w.y + w.h - 3, w.w, 2);
    }
  }

  drawWallMounted(state) {
    const ctx = this.ctx, t = this.time;
    // Neon CASINO sign above entrance (marquee)
    if (this.visible({ x: 1380, y: 240, w: 300, h: 90 })) {
      ctx.fillStyle = '#15161c'; ctx.fillRect(1400, 262, 240, 54);
      ctx.strokeStyle = '#c6a14f'; ctx.lineWidth = 2; ctx.strokeRect(1400, 262, 240, 54);
      const pulse = 0.85 + 0.15 * Math.sin(t * 6);
      ctx.save(); ctx.shadowColor = '#ff4d6d'; ctx.shadowBlur = 24 * pulse;
      ctx.fillStyle = '#ff6b85'; ctx.font = 'bold 34px "Bodoni 72", Didot, Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('CASINO', 1520, 289);
      ctx.restore();
      for (let i = 0; i < 20; i++) { const on = Math.floor(t * 8 + i) % 4 !== 0; ctx.fillStyle = on ? '#ffe082' : '#4d3d1f'; ctx.beginPath(); ctx.arc(1406 + i * 12.2, 268, 2, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(1406 + i * 12.2, 310, 2, 0, TAU); ctx.fill(); }
      // turnstile
      ctx.fillStyle = '#8c8c94'; ctx.fillRect(1478, 318, 6, 26); ctx.fillRect(1556, 318, 6, 26);

    }
    // façade clock
    if (this.visible({ x: 1230, y: 280, w: 80, h: 60 })) {
      ctx.fillStyle = '#efe9dc'; ctx.beginPath(); ctx.arc(1270, 298, 18, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#2b2b30'; ctx.lineWidth = 2; ctx.stroke();
      const mins = state.timeMin; const hA = ((mins / 60) % 12) / 12 * TAU - Math.PI / 2; const mA = (mins % 60) / 60 * TAU - Math.PI / 2;
      ctx.strokeStyle = '#1b1b22'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(1270, 298); ctx.lineTo(1270 + Math.cos(hA) * 9, 298 + Math.sin(hA) * 9); ctx.stroke();
      ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(1270, 298); ctx.lineTo(1270 + Math.cos(mA) * 14, 298 + Math.sin(mA) * 14); ctx.stroke();
    }
    // street lamps
    [520, 900, 1900, 2400, 2800].forEach(x => { if (!this.visible({ x: x - 10, y: 120, w: 20, h: 60 })) return; ctx.fillStyle = '#3a3d44'; ctx.fillRect(x - 3, 130, 6, 40); ctx.fillStyle = '#ffe0a8'; ctx.beginPath(); ctx.arc(x, 128, 7, 0, TAU); ctx.fill(); });
    // ruelle lamp + poster
    ctx.fillStyle = '#3a3d44'; ctx.fillRect(84, 880, 5, 30); ctx.fillStyle = '#ffe0a8'; ctx.beginPath(); ctx.arc(86, 878, 6, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f5f1e8'; ctx.fillRect(152, 1180, 22, 40); ctx.fillStyle = '#1b4636'; ctx.fillRect(154, 1182, 18, 10); ctx.fillStyle = '#b3261e'; ctx.fillRect(156, 1200, 14, 3); ctx.fillRect(156, 1206, 14, 3);
    // labyrinth signs & mirrors
    for (const o of OBJECTS) {
      if (!this.visible(o)) continue;
      if (o.type === 'sign') {
        ctx.fillStyle = '#101018'; ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.save(); ctx.shadowColor = '#ffb46a'; ctx.shadowBlur = 8; ctx.fillStyle = '#ffd08a'; ctx.font = '600 8px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(o.text, o.x + o.w / 2, o.y + o.h / 2 + 0.5); ctx.restore();
      } else if (o.type === 'mirror') {
        const g = ctx.createLinearGradient(o.x, o.y, o.x + o.w, o.y); g.addColorStop(0, '#9fb8c8'); g.addColorStop(0.5, '#e6f2fa'); g.addColorStop(1, '#9fb8c8');
        ctx.fillStyle = g; ctx.fillRect(o.x, o.y, o.w, o.h); ctx.strokeStyle = '#c6a14f'; ctx.lineWidth = 1; ctx.strokeRect(o.x, o.y, o.w, o.h);
      } else if (o.type === 'plaque') {
        ctx.fillStyle = '#c6a14f'; ctx.fillRect(o.x, o.y + 2, o.w, o.h); ctx.fillStyle = '#3b2412'; ctx.font = '600 7px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('18 AOÛT 1913', o.x + o.w / 2, o.y + 9);
      } else if (o.type === 'theo' || o.type === 'board') {
        ctx.fillStyle = '#0b1220'; ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.fillStyle = '#4fc3f7'; for (let i = 0; i < 8; i++) ctx.fillRect(o.x + 6 + i * 9, o.y + o.h - 4 - (3 + ((i * 7 + Math.floor(t)) % 9)), 5, 3 + ((i * 7 + Math.floor(t)) % 9));
      }
    }
    // hallway sign
    if (this.visible({ x: 1560, y: 1168, w: 80, h: 30 })) { ctx.fillStyle = '#101018'; ctx.fillRect(1566, 1172, 68, 12); ctx.fillStyle = '#ffd08a'; ctx.font = '600 7px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('RESTAURANT · SPECTACLE ↓', 1600, 1178.5); }
    // machines room banner
    if (this.visible({ x: 500, y: 344, w: 360, h: 40 })) { ctx.fillStyle = '#101018'; ctx.fillRect(560, 348, 240, 16); ctx.save(); ctx.shadowColor = '#ff4d6d'; ctx.shadowBlur = 8; ctx.fillStyle = '#ff9ab0'; ctx.font = 'bold 10px "Bodoni 72", Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('JACKPOT PROGRESSIF  ·  1 248 391 €', 680, 356.5); ctx.restore(); }
  }

  // ---------------------------------------------------------------- entities
  drawEntities(state) {
    const items = [];
    for (const s of SLOTS) if (this.visible(s)) items.push({ y: s.y + s.h, draw: () => this.drawSlot(s, state) });
    for (const o of OBJECTS) if (this.visible(o) && o.solid !== false) items.push({ y: o.y + o.h, draw: () => this.drawObject(o, state) });
    for (const n of state.npcs) if (!n.hidden && this.visible({ x: n.x - 20, y: n.y - 40, w: 40, h: 50 })) items.push({ y: n.y + 6, draw: () => this.drawCharacter(n, state, false) });
    items.push({ y: state.player.y + 6, draw: () => this.drawCharacter(state.player, state, true) });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.draw();
  }

  drawSlot(s, state) {
    const ctx = this.ctx, t = this.time;
    const { x, y, w, h } = s;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x + 2, y + h - 2, w, 6);
    const g = ctx.createLinearGradient(x, y, x + w, y); g.addColorStop(0, '#2c2c34'); g.addColorStop(0.5, '#45454f'); g.addColorStop(1, '#232329');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    // topper
    ctx.fillStyle = s.special ? '#c6a14f' : '#55555f'; ctx.fillRect(x + 4, y, w - 8, 6);
    // screen
    const active = state.activeSlot === s;
    const bright = 55 + 12 * Math.sin(t * 3 + s.x * 0.05);
    ctx.fillStyle = `hsl(${s.hue} 85% ${bright}%)`; ctx.fillRect(x + 6, y + 10, w - 12, 22);
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x + 6, y + 10, w - 12, 5);
    // reels
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; for (let i = 0; i < 3; i++) ctx.fillRect(x + 9 + i * 10, y + 17, 8, 12);
    ctx.fillStyle = '#fff'; for (let i = 0; i < 3; i++) { const k = Math.floor((t * (active ? 12 : 0.6) + i * 3 + s.x) % 3); ctx.fillRect(x + 11 + i * 10, y + 20 + k * 3, 4, 2); }
    // button row
    ctx.fillStyle = '#e53935'; ctx.beginPath(); ctx.arc(x + w / 2, y + 42, 4, 0, TAU); ctx.fill();
    ctx.fillStyle = '#9e9e9e'; ctx.fillRect(x + 8, y + 40, 8, 4); ctx.fillRect(x + w - 16, y + 40, 8, 4);
    ctx.fillStyle = '#111'; ctx.fillRect(x + 6, y + h - 8, w - 12, 5);
    // stool
    ctx.fillStyle = '#3e2723'; ctx.beginPath(); ctx.arc(x + w / 2, y + h + 12, 7, 0, TAU); ctx.fill();
    if (s.special) {
      ctx.save(); ctx.shadowColor = `hsl(${s.hue} 90% 60%)`; ctx.shadowBlur = 10;
      ctx.fillStyle = '#fff'; ctx.font = 'bold 8px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(s.label.toUpperCase(), x + w / 2, y - 3); ctx.restore();
    }
  }

  drawObject(o, state) {
    const ctx = this.ctx, t = this.time;
    const { x, y, w, h } = o;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x + 3, y + h - 3, w, 6);
    switch (o.type) {
      case 'busstop':
        ctx.fillStyle = '#3a3d44'; ctx.fillRect(x + 4, y, 6, h);
        ctx.fillStyle = '#1565c0'; ctx.fillRect(x - 12, y - 4, 38, 24); ctx.fillStyle = '#fff'; ctx.font = 'bold 9px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('BUS', x + 7, y + 8);
        ctx.fillStyle = '#5a5d63'; ctx.fillRect(x - 40, y + 40, 100, 6); ctx.fillRect(x - 36, y + 46, 5, 14); ctx.fillRect(x + 52, y + 46, 5, 14);
        break;
      case 'caisse': case 'fidelite': {
        ctx.fillStyle = '#3b2412'; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#5a3a1e'; ctx.fillRect(x, y, w, 8); ctx.fillStyle = '#c6a14f'; ctx.fillRect(x, y + 8, w, 2);
        ctx.fillStyle = 'rgba(120,200,255,0.35)'; ctx.fillRect(x + 8, y - 26, w - 16, 26);
        ctx.fillStyle = '#ffe8b0'; ctx.font = '600 9px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(o.type === 'caisse' ? 'CAISSE' : 'FIDÉLITÉ', x + w / 2, y + h / 2 + 4);
        break;
      }
      case 'fountain': break;
      case 'atm':
        ctx.fillStyle = '#263238'; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#4fc3f7'; ctx.fillRect(x + 6, y + 5, w - 12, 12); ctx.fillStyle = '#fff'; ctx.font = '600 6px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('RETRAIT', x + w / 2, y + 11);
        ctx.fillStyle = '#ffca28'; ctx.fillRect(x + 12, y + 22, w - 24, 3);
        break;
      case 'roulette': {
        this.felt(x, y, w, h, '#1e5b41');
        // grid
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1;
        for (let i = 0; i <= 12; i++) { ctx.beginPath(); ctx.moveTo(x + 100 + i * 11, y + 22); ctx.lineTo(x + 100 + i * 11, y + 88); ctx.stroke(); }
        for (let j = 0; j <= 3; j++) { ctx.beginPath(); ctx.moveTo(x + 100, y + 22 + j * 22); ctx.lineTo(x + 232, y + 22 + j * 22); ctx.stroke(); }
        for (let i = 0; i < 12; i++) for (let j = 0; j < 3; j++) { const n = 3 * i + (3 - j); ctx.fillStyle = REDS.has(n) ? 'rgba(179,38,30,0.8)' : 'rgba(0,0,0,0.5)'; ctx.fillRect(x + 101 + i * 11, y + 23 + j * 22, 9, 20); }
        ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x + 100, y + 92, 132, 14); ctx.fillRect(x + 100, y + 108, 132, 14);
        // wheel
        ctx.save(); ctx.translate(x + 52, y + h / 2); ctx.rotate(t * 0.8); ctx.drawImage(this.wheelSprite, -this.wheelSprite.width / 2, -this.wheelSprite.height / 2); ctx.restore();
        const ba = -t * 3.2; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + 52 + Math.cos(ba) * 40, y + h / 2 + Math.sin(ba) * 40, 3.5, 0, TAU); ctx.fill();
        // chips on table
        this.chip(x + 150, y + 100, '#b3261e'); this.chip(x + 175, y + 60, '#1565c0'); this.chip(x + 210, y + 40, '#c6a14f');
        break;
      }
      case 'baccarat': {
        this.felt(x, y, w, h, '#4a1a52');
        ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.font = 'bold 22px "Bodoni 72", Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('BACCARA', x + w / 2, y + h / 2 + 10);
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x + w / 2, y + 30, 90, 18, 0, 0, Math.PI); ctx.stroke();
        this.card(x + 60, y + 60); this.card(x + 76, y + 62); this.card(x + 150, y + 60, true); this.card(x + 166, y + 62, true);
        this.chip(x + 200, y + 100, '#c6a14f'); this.chip(x + 40, y + 100, '#1565c0');
        break;
      }
      case 'blackjack': {
        this.felt(x, y, w, h, '#1e5b41');
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.ellipse(x + w / 2, y + 30, 80, 20, 0, 0, Math.PI); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '600 7px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('BLACKJACK PAIE 3 POUR 2', x + w / 2, y + h / 2 + 8);
        this.card(x + 40, y + 60); this.card(x + 56, y + 62, true); this.card(x + 140, y + 60, true);
        break;
      }
      case 'wheel': {
        ctx.fillStyle = '#3b2412'; ctx.fillRect(x + w / 2 - 6, y + 10, 12, h - 10);
        ctx.save(); ctx.translate(x + w / 2, y + 8); ctx.rotate(t * 0.6); ctx.drawImage(this.wheelSprite, -26, -26, 52, 52); ctx.restore();
        ctx.fillStyle = '#f5f1e8'; ctx.beginPath(); ctx.moveTo(x + w / 2, y - 22); ctx.lineTo(x + w / 2 - 4, y - 30); ctx.lineTo(x + w / 2 + 4, y - 30); ctx.closePath(); ctx.fill();
        break;
      }
      case 'viptable': {
        this.felt(x, y, w, h, '#5a1414');
        ctx.fillStyle = '#c6a14f'; ctx.font = 'bold 14px "Bodoni 72", Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('PRIVÉ', x + w / 2, y + h / 2);
        this.chip(x + 30, y + 60, '#c6a14f'); this.chip(x + 50, y + 66, '#c6a14f'); this.chip(x + 170, y + 30, '#b3261e');
        break;
      }
      case 'barcounter': {
        ctx.fillStyle = '#6d4c41'; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#8d6e63'; ctx.fillRect(x, y, w, 8); ctx.fillStyle = '#c6a14f'; ctx.fillRect(x, y + 8, w, 2);
        for (let i = 0; i < 5; i++) { ctx.fillStyle = 'rgba(255,220,180,0.6)'; ctx.fillRect(x + 40 + i * 80, y + 14, 8, 12); }
        break;
      }
      case 'roundtable': ctx.fillStyle = '#3e2723'; ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, w / 2, 0, TAU); ctx.fill(); ctx.fillStyle = '#5d4037'; ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, w / 2 - 6, 0, TAU); ctx.fill(); break;
      case 'sofa': ctx.fillStyle = '#7a1f22'; this.rr(x, y, w, h, 8); ctx.fill(); ctx.fillStyle = '#9c2b2f'; this.rr(x + 6, y + 6, w - 12, h - 14, 5); ctx.fill(); break;
      case 'desk': ctx.fillStyle = '#3b2412'; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#5a3a1e'; ctx.fillRect(x + 3, y + 3, w - 6, h - 10); ctx.fillStyle = '#0b1220'; ctx.fillRect(x + 20, y + 8, 40, 26); ctx.fillStyle = '#4fc3f7'; ctx.fillRect(x + 23, y + 11, 34, 20); ctx.fillStyle = '#cfd8dc'; ctx.fillRect(x + 75, y + 14, 30, 22); break;
      case 'sink': break;
      case 'dumpster': ctx.fillStyle = '#2e7d32'; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#1b5e20'; ctx.fillRect(x, y, w, 8); break;
      case 'vipdoor': break;
      default: ctx.fillStyle = '#444'; ctx.fillRect(x, y, w, h);
    }
  }
  felt(x, y, w, h, color) {
    const ctx = this.ctx;
    ctx.fillStyle = '#3b2412'; this.rr(x - 6, y - 6, w + 12, h + 12, 16); ctx.fill();
    ctx.fillStyle = color; this.rr(x, y, w, h, 12); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.05)'; this.rr(x, y, w, h / 2, 12); ctx.fill();
  }
  chip(x, y, c) { const ctx = this.ctx; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1; ctx.setLineDash([2, 2]); ctx.beginPath(); ctx.arc(x, y, 3.5, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
  card(x, y, red = false) { const ctx = this.ctx; ctx.fillStyle = '#fff'; this.rr(x, y, 14, 20, 2); ctx.fill(); ctx.fillStyle = red ? '#b3261e' : '#111'; ctx.fillRect(x + 3, y + 3, 4, 5); }
  rr(x, y, w, h, r) { const c = this.ctx; c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

  drawCharacter(ch, state, isPlayer) {
    const ctx = this.ctx, t = this.time;
    const ghost = ch.kind === 'ghost';
    const bob = ghost ? Math.sin(t * 1.6 + ch.x) * 2.5 : (ch.moving ? Math.abs(Math.sin(ch.walk * 9)) * 2 : 0);
    const x = ch.x, y = ch.y - bob;
    // shadow
    ctx.fillStyle = ghost ? 'rgba(120,200,255,0.10)' : 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(ch.x, ch.y + 8, 12, 5, 0, 0, TAU); ctx.fill();
    ctx.save();
    if (ghost) {
      const g = ctx.createRadialGradient(x, y - 8, 4, x, y - 8, 34); g.addColorStop(0, 'rgba(160,220,255,0.35)'); g.addColorStop(1, 'rgba(160,220,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y - 8, 34, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.78;
    }
    const facing = ch.facing || 'down';
    const body = isPlayer ? '#e8501c' : ghost ? '#cfe7ff' : (ch.color || '#607d8b');
    const skin = ghost ? '#e6f2ff' : (ch.skin || '#e8b58f');
    // legs
    ctx.fillStyle = ghost ? 'rgba(207,231,255,0.5)' : '#1b1b22';
    const sw = ch.moving ? Math.sin(ch.walk * 9) * 3 : 0;
    ctx.fillRect(x - 7, y + 2 + sw * 0.4, 5, 8); ctx.fillRect(x + 2, y + 2 - sw * 0.4, 5, 8);
    // body
    ctx.fillStyle = body; this.rr(x - 10, y - 16, 20, 22, 7); ctx.fill();
    if (ch.kind === 'staff') { ctx.fillStyle = '#fff'; ctx.fillRect(x - 3, y - 15, 6, 12); ctx.fillStyle = '#b3261e'; ctx.fillRect(x - 1, y - 14, 2, 8); }
    if (isPlayer) { ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x - 10, y - 16, 20, 6); }
    // arms
    ctx.fillStyle = body; ctx.fillRect(x - 14, y - 12 + sw * 0.5, 4, 12); ctx.fillRect(x + 10, y - 12 - sw * 0.5, 4, 12);
    // head
    ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(x, y - 24, 9, 0, TAU); ctx.fill();
    // hair
    ctx.fillStyle = ghost ? 'rgba(200,225,255,0.9)' : (ch.hair || (isPlayer ? '#2b1a0e' : '#3e2723'));
    ctx.beginPath(); ctx.arc(x, y - 26, 9, Math.PI, TAU); ctx.fill();
    if (ch.id === 'dosto') { ctx.fillStyle = 'rgba(200,225,255,0.9)'; ctx.fillRect(x - 6, y - 20, 12, 6); }
    if (ch.id === 'vigile') { ctx.fillStyle = '#1a237e'; ctx.fillRect(x - 10, y - 32, 20, 5); }
    // eyes (facing)
    ctx.fillStyle = '#111';
    if (facing !== 'up') { const dx = facing === 'left' ? -3 : facing === 'right' ? 3 : 0; ctx.fillRect(x - 4 + dx, y - 25, 2, 2); ctx.fillRect(x + 2 + dx, y - 25, 2, 2); }
    ctx.restore();
    if (ch.id === 'sami') { ctx.fillStyle = '#4fc3f7'; ctx.fillRect(x + 9, y - 10, 6, 9); }
    // name label
    if (!isPlayer && ch.showName) {
      ctx.font = '600 9px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      const tw = ctx.measureText(ch.name).width + 10;
      ctx.fillStyle = 'rgba(10,10,14,0.75)'; this.rr(x - tw / 2, y - 52, tw, 14, 4); ctx.fill();
      ctx.fillStyle = ghost ? '#cfe7ff' : '#f5f1e8'; ctx.fillText(ch.name, x, y - 41);
    }
  }

  // ---------------------------------------------------------------- lighting
  drawLighting(state) {
    const ctx = this.ctx, l = this.lctx, z = this.cam.zoom, dpr = this.dpr;
    l.setTransform(1, 0, 0, 1, 0, 0);
    l.globalCompositeOperation = 'source-over';
    l.clearRect(0, 0, this.light.width, this.light.height);
    l.setTransform(dpr * z, 0, 0, dpr * z, -this.cam.x * dpr * z, -this.cam.y * dpr * z);
    const dawn = state.flags.exited ? 1 : 0;
    // darkness per room
    const seen = (r) => state.visited.has(r.id) || state.roomSeen && state.roomSeen.has(r.id);
    // base: everything unseen is near-black
    l.fillStyle = 'rgba(4,6,16,0.985)'; l.fillRect(this.cam.x - 50, this.cam.y - 50, this.w / z + 100, this.h / z + 100);
    for (const r of ROOMS) {
      if (!this.visible(r) || !seen(r)) continue;
      let d = r.dark;
      if (r.outdoor) d = state.flags.exited ? 0.12 : d;
      l.clearRect(r.x - 30, r.y - 30, r.w + 60, r.h + 60);
      l.fillStyle = r.outdoor && state.flags.exited ? `rgba(60,40,70,${d})` : `rgba(4,6,16,${d})`;
      l.fillRect(r.x - 30, r.y - 30, r.w + 60, r.h + 60);
    }
    const inSeen = (x, y) => { const r = roomAt(x, y); return !r || seen(r); };
    // wall areas get fully dark cap so lights don't bleed strangely: skip (walls drawn above already)
    l.globalCompositeOperation = 'destination-out';
    const drawLight = (x, y, r, a) => {
      const g = l.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(0.55, `rgba(0,0,0,${a * 0.55})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      l.fillStyle = g; l.beginPath(); l.arc(x, y, r, 0, TAU); l.fill();
    };
    for (const li of LIGHTS) { if (!this.visible({ x: li.x - li.r, y: li.y - li.r, w: li.r * 2, h: li.r * 2 }) || !inSeen(li.x, li.y)) continue; const flick = li.color === '#ff4d6d' ? 0.85 + 0.15 * Math.sin(this.time * 6) : 1; drawLight(li.x, li.y, li.r, li.a * flick); }
    // player lantern
    drawLight(state.player.x, state.player.y - 10, 150, 0.6);
    // ghosts glow
    for (const n of state.npcs) if (n.kind === 'ghost' && !n.hidden && inSeen(n.x, n.y)) drawLight(n.x, n.y - 10, 90, 0.5);
    // unseen rooms stay dark whatever the lights
    l.globalCompositeOperation = 'source-over';
    for (const r of ROOMS) { if (!this.visible(r) || seen(r)) continue; l.fillStyle = 'rgba(4,6,16,0.985)'; l.fillRect(r.x - 30, r.y - 30, r.w + 60, r.h + 60); }
    // composite light layer
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.drawImage(this.light, 0, 0, this.w, this.h);
    // colored glows (additive)
    ctx.setTransform(dpr * z, 0, 0, dpr * z, -this.cam.x * dpr * z, -this.cam.y * dpr * z);
    ctx.globalCompositeOperation = 'lighter';
    for (const li of LIGHTS) {
      if (!li.glow || !this.visible({ x: li.x - li.r, y: li.y - li.r, w: li.r * 2, h: li.r * 2 }) || !inSeen(li.x, li.y)) continue;
      const g = ctx.createRadialGradient(li.x, li.y, 0, li.x, li.y, li.r * 0.9);
      g.addColorStop(0, li.color); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = li.glow * (li.color === '#ff4d6d' ? 0.85 + 0.15 * Math.sin(this.time * 6) : 1);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(li.x, li.y, li.r * 0.9, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    // dawn sky tint over outdoor
    if (dawn) {
      ctx.fillStyle = 'rgba(255,170,110,0.10)'; ctx.fillRect(0, 0, WORLD.w, 320); ctx.fillRect(0, 320, 176, 1608);
    }
  }

  drawOverlays(state) {
    const ctx = this.ctx, dpr = this.dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // vignette
    const g = ctx.createRadialGradient(this.w / 2, this.h / 2, Math.min(this.w, this.h) * 0.35, this.w / 2, this.h / 2, Math.max(this.w, this.h) * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${state.zone ? 0.85 : 0.55})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, this.w, this.h);
  }
}
