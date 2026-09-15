// Procedural canvas textures and shared materials for the 3D casino.
import * as THREE from 'three';

const TAU = Math.PI * 2;
const cache = {};

function canvas(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h); return c;
}
function tex(c, { repeat = true, srgb = true, filter = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = repeat ? 4 : 1; // tiling surfaces benefit from it, text and signs do not
  if (!filter) { t.magFilter = THREE.NearestFilter; }
  return t;
}

// Floor / wall patterns. `size` = physical size of one tile in metres.
export const PATTERNS = {
  carpet: { size: 1.2, draw: (g, w, h) => {
    g.fillStyle = '#17392c'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(198,161,79,0.28)'; g.lineWidth = 2;
    for (const [ox, oy] of [[0, 0], [w / 2, h / 2]]) { g.beginPath(); g.moveTo(ox + w / 4, oy); g.lineTo(ox + w / 2, oy + h / 4); g.lineTo(ox + w / 4, oy + h / 2); g.lineTo(ox, oy + h / 4); g.closePath(); g.stroke(); }
    g.fillStyle = 'rgba(198,161,79,0.22)';
    for (const [ox, oy] of [[w / 4, h / 4], [3 * w / 4, 3 * h / 4], [3 * w / 4, h / 4], [w / 4, 3 * h / 4]]) { g.beginPath(); g.arc(ox, oy, 5, 0, TAU); g.fill(); }
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`; g.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
  } },
  carpet2: { size: 1.0, draw: (g, w, h) => {
    g.fillStyle = '#2b1d3c'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,170,90,0.16)'; g.lineWidth = 2;
    for (let i = -w; i < 2 * w; i += w / 4) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + w, h); g.stroke(); }
    g.fillStyle = 'rgba(255,200,120,0.12)';
    for (let x = w / 8; x < w; x += w / 4) for (let y = h / 8; y < h; y += h / 4) g.fillRect(x - 2, y - 2, 4, 4);
  } },
  carpetred: { size: 1.2, draw: (g, w, h) => {
    g.fillStyle = '#4c1418'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,200,120,0.2)'; g.lineWidth = 2.5;
    for (const [ox, oy] of [[0, 0], [w / 2, h / 2]]) { g.beginPath(); g.arc(ox + w / 4, oy + h / 4, w * 0.19, 0, TAU); g.stroke(); }
    g.fillStyle = 'rgba(255,200,120,0.14)';
    for (const [ox, oy] of [[w / 4, h / 4], [3 * w / 4, 3 * h / 4], [3 * w / 4, h / 4], [w / 4, 3 * h / 4]]) { g.beginPath(); g.arc(ox, oy, 7, 0, TAU); g.fill(); }
  } },
  marble: { size: 1.6, draw: (g, w, h) => {
    g.fillStyle = '#d9d2c4'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) { g.strokeStyle = `rgba(120,110,95,${0.08 + Math.random() * 0.12})`; g.lineWidth = 1 + Math.random() * 2; g.beginPath(); let x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (Math.random() - 0.5) * 120; y += (Math.random() - 0.5) * 120; g.lineTo(x, y); } g.stroke(); }
    g.strokeStyle = 'rgba(80,70,60,0.35)'; g.lineWidth = 3; g.strokeRect(1, 1, w / 2 - 2, h / 2 - 2); g.strokeRect(w / 2 + 1, h / 2 + 1, w / 2 - 2, h / 2 - 2); g.strokeRect(w / 2 + 1, 1, w / 2 - 2, h / 2 - 2); g.strokeRect(1, h / 2 + 1, w / 2 - 2, h / 2 - 2);
  } },
  tile: { size: 0.6, draw: (g, w, h) => {
    g.fillStyle = '#cfd8dc'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#b0bec5'; g.fillRect(w / 2, 0, w / 2, h / 2); g.fillRect(0, h / 2, w / 2, h / 2);
    g.strokeStyle = 'rgba(60,80,90,0.4)'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, w / 2 - 3, h / 2 - 3); g.strokeRect(w / 2 + 1.5, h / 2 + 1.5, w / 2 - 3, h / 2 - 3); g.strokeRect(w / 2 + 1.5, 1.5, w / 2 - 3, h / 2 - 3); g.strokeRect(1.5, h / 2 + 1.5, w / 2 - 3, h / 2 - 3);
  } },
  wood: { size: 1.2, draw: (g, w, h) => {
    g.fillStyle = '#4e3626'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += h / 4) { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, y, w, 3); g.fillStyle = 'rgba(255,200,150,0.06)'; g.fillRect(0, y + h / 8, w, 2); }
    for (let i = 0; i < 40; i++) { g.strokeStyle = 'rgba(0,0,0,0.14)'; g.lineWidth = 1.5; g.beginPath(); const y = Math.random() * h; g.moveTo(0, y); g.bezierCurveTo(w / 3, y + 6, 2 * w / 3, y - 6, w, y); g.stroke(); }
  } },
  asphalt: { size: 2.0, draw: (g, w, h) => {
    g.fillStyle = '#22252a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.07})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  } },
  concrete: { size: 1.5, draw: (g, w, h) => {
    g.fillStyle = '#4a4d52'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.14})`; g.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4);
  } },
  brick: { size: 0.8, draw: (g, w, h) => {
    g.fillStyle = '#5a3b33'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#7a4f42';
    const bw = w / 2 - 4, bh = h / 4 - 4;
    for (let r = 0; r < 4; r++) { const off = r % 2 ? -w / 4 : 0; for (let c = -1; c < 3; c++) g.fillRect(off + c * w / 2 + 2, r * h / 4 + 2, bw, bh); }
  } },
  ceiling: { size: 1.5, draw: (g, w, h) => {
    g.fillStyle = '#1a1a20'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.06)'; g.lineWidth = 2; g.strokeRect(1, 1, w / 2 - 2, h / 2 - 2); g.strokeRect(w / 2 + 1, h / 2 + 1, w / 2 - 2, h / 2 - 2); g.strokeRect(w / 2 + 1, 1, w / 2 - 2, h / 2 - 2); g.strokeRect(1, h / 2 + 1, w / 2 - 2, h / 2 - 2);
  } },
  wall: { size: 3, draw: (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#3a3a46'); grd.addColorStop(0.55, '#2a2a33'); grd.addColorStop(1, '#1b1b21');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(198,161,79,0.55)'; g.fillRect(0, h * 0.62, w, 4); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(0, h * 0.97, w, h * 0.03);
    for (let i = 0; i < 600; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.03})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  } },
  wallpaper: { size: 2, draw: (g, w, h) => {
    g.fillStyle = '#3a1518'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,200,120,0.18)'; g.lineWidth = 2;
    for (let x = 0; x < w; x += w / 4) for (let y = 0; y < h; y += h / 4) { g.beginPath(); g.ellipse(x + w / 8, y + h / 8, w / 12, h / 16, 0, 0, TAU); g.stroke(); }
    g.fillStyle = 'rgba(198,161,79,0.55)'; g.fillRect(0, h * 0.62, w, 4);
  } },
};

export function patternTexture(name, px = 256) {
  const key = name + px;
  if (cache[key]) return cache[key];
  const p = PATTERNS[name];
  const t = tex(canvas(px, px, p.draw));
  cache[key] = t; return t;
}

// Text label texture (for signs, marquees, name tags)
export function textTexture(text, { w = 512, h = 128, font = 'bold 64px Inter, sans-serif', color = '#fff', bg = 'rgba(0,0,0,0)', glow = null, pad = 0 } = {}) {
  const c = canvas(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (glow) { g.shadowColor = glow; g.shadowBlur = 24; }
    g.fillStyle = color;
    // long labels are squeezed to fit the canvas rather than clipped
    const tw = g.measureText(text).width, maxW = w - 24;
    if (tw > maxW) { g.save(); g.translate(w / 2, h / 2 + pad); g.scale(maxW / tw, 1); g.fillText(text, 0, 0); g.restore(); }
    else g.fillText(text, w / 2, h / 2 + pad);
  });
  const t = tex(c, { repeat: false }); t.minFilter = THREE.LinearFilter; return t;
}

// European roulette wheel face
export function wheelTexture(R = 256) {
  const ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
  const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  const c = canvas(R * 2, R * 2, (g) => {
    const cx = R, cy = R;
    g.fillStyle = '#3b2412'; g.fillRect(0, 0, R * 2, R * 2);
    for (let i = 0; i < 37; i++) {
      const a0 = i / 37 * TAU - Math.PI / 2, a1 = (i + 1) / 37 * TAU - Math.PI / 2; const num = ORDER[i];
      g.fillStyle = num === 0 ? '#1e7a4c' : REDS.has(num) ? '#b3261e' : '#161616';
      g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R - 8, a0, a1); g.closePath(); g.fill();
      const am = (a0 + a1) / 2; g.save(); g.translate(cx + Math.cos(am) * (R - 30), cy + Math.sin(am) * (R - 30)); g.rotate(am + Math.PI / 2); g.fillStyle = '#f5f1e8'; g.font = `bold ${Math.round(R * 0.085)}px Inter, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(num), 0, 0); g.restore();
    }
    g.strokeStyle = '#c6a14f'; g.lineWidth = 4; g.beginPath(); g.arc(cx, cy, R - 8, 0, TAU); g.stroke();
    g.fillStyle = '#2b1a0e'; g.beginPath(); g.arc(cx, cy, R * 0.55, 0, TAU); g.fill(); g.stroke();
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; g.strokeStyle = '#c6a14f'; g.lineWidth = 6; g.beginPath(); g.moveTo(cx + Math.cos(a) * 14, cy + Math.sin(a) * 14); g.lineTo(cx + Math.cos(a) * R * 0.5, cy + Math.sin(a) * R * 0.5); g.stroke(); }
    g.fillStyle = '#c6a14f'; g.beginPath(); g.arc(cx, cy, 14, 0, TAU); g.fill();
  });
  return tex(c, { repeat: false });
}

// Big six wheel face
export function bigSixTexture(R = 256) {
  const pattern = ['1', '2', '1', '5', '1', '2', '1', '10', '1', '2', '1', '5', '1', '2', '1', '20', '1', '2', '1', '5', '1', '2', '1', '10', '1', '2', '1', 'J', '1', '2', '1', '5', '1', '2', '1', '10', '1', '2', '1', '5', '1', '2', '1', '20', '1', '2', '1', '5', '1', '2', '1', '10', '1', 'L'];
  const COL = { '1': '#f5f1e8', '2': '#c6a14f', '5': '#b3261e', '10': '#1e7a4c', '20': '#1565c0', 'J': '#7b1fa2', 'L': '#ff6f00' };
  const c = canvas(R * 2, R * 2, (g) => {
    const cx = R, cy = R, n = pattern.length;
    g.fillStyle = '#3b2412'; g.fillRect(0, 0, R * 2, R * 2);
    for (let i = 0; i < n; i++) { const a0 = i / n * TAU - Math.PI / 2, a1 = (i + 1) / n * TAU - Math.PI / 2; g.fillStyle = COL[pattern[i]]; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R - 6, a0, a1); g.closePath(); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 2; g.stroke(); }
    g.fillStyle = '#3b2412'; g.beginPath(); g.arc(cx, cy, R * 0.28, 0, TAU); g.fill(); g.strokeStyle = '#c6a14f'; g.lineWidth = 6; g.stroke(); g.beginPath(); g.arc(cx, cy, R - 6, 0, TAU); g.stroke();
    g.fillStyle = '#c6a14f'; g.font = `bold ${Math.round(R * 0.16)}px "Bodoni 72", Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('BIG 6', cx, cy);
  });
  return tex(c, { repeat: false });
}

// Felt textures for tables
export function feltTexture(kind) {
  const key = 'felt-' + kind; if (cache[key]) return cache[key];
  const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  const c = canvas(1024, 512, (g, w, h) => {
    const base = { roulette: '#1e5b41', blackjack: '#1e5b41', baccarat: '#4a1a52', vip: '#5a1414' }[kind] || '#1e5b41';
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.08})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 3; g.font = 'bold 30px Inter, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (kind === 'roulette') {
      const x0 = 420, y0 = 90, cw = 44, ch = 100;
      for (let i = 0; i < 12; i++) for (let j = 0; j < 3; j++) { const n = 3 * i + (3 - j); g.fillStyle = REDS.has(n) ? 'rgba(179,38,30,0.9)' : 'rgba(0,0,0,0.55)'; g.fillRect(x0 + i * cw, y0 + j * ch, cw - 3, ch - 3); g.fillStyle = '#fff'; g.fillText(String(n), x0 + i * cw + cw / 2, y0 + j * ch + ch / 2); }
      g.fillStyle = 'rgba(30,122,76,0.9)'; g.fillRect(x0 - 60, y0, 56, 3 * ch - 3); g.fillStyle = '#fff'; g.fillText('0', x0 - 32, y0 + 1.5 * ch);
      g.strokeRect(x0, y0 + 3 * ch + 6, 12 * cw, 40); for (let k = 0; k < 6; k++) g.strokeRect(x0 + k * 2 * cw, y0 + 3 * ch + 50, 2 * cw, 40);
      g.fillStyle = 'rgba(255,255,255,0.7)'; g.font = '600 20px Inter, sans-serif';
      ['1-18', 'PAIR', 'ROUGE', 'NOIR', 'IMPAIR', '19-36'].forEach((t, k) => g.fillText(t, x0 + k * 2 * cw + cw, y0 + 3 * ch + 70));
    } else if (kind === 'blackjack') {
      g.beginPath(); g.ellipse(w / 2, 120, 380, 90, 0, 0, Math.PI); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.75)'; g.font = 'bold 28px "Bodoni 72", Georgia, serif'; g.fillText('BLACKJACK PAIE 3 POUR 2', w / 2, 250);
      g.font = '600 18px Inter, sans-serif'; g.fillText('LE CROUPIER RESTE À 17 · ASSURANCE 2 POUR 1', w / 2, 290);
      for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(200 + k * 156, 400, 40, 0, TAU); g.stroke(); }
    } else if (kind === 'baccarat') {
      g.fillStyle = 'rgba(255,255,255,0.2)'; g.font = 'bold 90px "Bodoni 72", Georgia, serif'; g.fillText('BACCARA', w / 2, h / 2 + 30);
      g.beginPath(); g.ellipse(w / 2, 120, 360, 70, 0, 0, Math.PI); g.stroke();
      g.font = '600 24px Inter, sans-serif'; g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillText('JOUEUR', 260, 420); g.fillText('ÉGALITÉ', 512, 420); g.fillText('BANQUE', 764, 420);
    } else if (kind === 'vip') {
      g.fillStyle = 'rgba(198,161,79,0.6)'; g.font = 'bold 110px "Bodoni 72", Georgia, serif'; g.fillText('PRIVÉ', w / 2, h / 2 + 30);
    }
  });
  const t = tex(c, { repeat: false }); cache[key] = t; return t;
}

// Slot machine screen animation (shared per kind). Returns { texture, update(t) }.
// reel symbols drawn once into a sprite strip (emoji text is slow to rasterise every frame)
let symStrip = null;
function symbolStrip() {
  if (symStrip) return symStrip;
  const SYMS = ['🍒', '🍋', '🔔', '⭐', '7', '💎'];
  const c = document.createElement('canvas'); c.width = 6 * 68; c.height = 60;
  const g = c.getContext('2d'); g.textAlign = 'center'; g.textBaseline = 'middle';
  SYMS.forEach((sym, i) => { g.font = sym === '7' ? 'bold 44px "Bodoni 72", Georgia, serif' : '40px serif'; g.fillStyle = sym === '7' ? '#b3261e' : '#222'; g.fillText(sym, i * 68 + 34, 30); });
  return (symStrip = c);
}
export function slotScreen(kind) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 192;
  const g = c.getContext('2d');
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
  const speeds = [1.3, 1.7, 2.1];
  let bg = null; loadImage('slot_' + kind, (img) => { bg = img; last = -1; });
  // static layers (background, header, footer text) are drawn once into their own canvas
  const base = document.createElement('canvas'); base.width = 256; base.height = 192; const gb = base.getContext('2d');
  let baseFor = null;
  const drawBase = () => {
    gb.fillStyle = '#0a0a12'; gb.fillRect(0, 0, 256, 192);
    if (bg) { gb.drawImage(bg, 0, 0, 256, 192); gb.fillStyle = 'rgba(0,0,0,0.25)'; gb.fillRect(0, 0, 256, 192); }
    gb.fillStyle = 'rgba(255,255,255,0.85)'; gb.fillRect(0, 0, 256, 26);
    gb.fillStyle = '#111'; gb.font = 'bold 15px Inter, sans-serif'; gb.textAlign = 'center'; gb.textBaseline = 'middle';
    gb.fillText(kind === 'mega' ? '20 LIGNES · JACKPOT' : kind === 'pharaon' ? 'JACKPOT 500×' : 'JACKPOT 100×', 128, 13);
    for (let r = 0; r < 3; r++) { gb.fillStyle = '#f4f1ea'; gb.fillRect(14 + r * 80, 40, 68, 120); }
    baseFor = bg;
  };
  let last = -1;
  const update = (time, force = false) => {
    if (!force && time - last < 0.1) return; // 10 fps is plenty for a reel seen from a metre away
    last = time;
    if (baseFor !== bg) drawBase();
    const strip = symbolStrip();
    g.drawImage(base, 0, 0);
    for (let r = 0; r < 3; r++) {
      const x = 14 + r * 80;
      const off = (time * speeds[r]) % 1; const b = Math.floor(time * speeds[r]);
      g.save(); g.beginPath(); g.rect(x, 40, 68, 120); g.clip();
      for (let k = -1; k < 3; k++) { const si = ((b + k) % 6 + 6) % 6; g.drawImage(strip, si * 68, 0, 68, 60, x, 100 + (k - off) * 60 - 30, 68, 60); }
      g.restore();
    }
    const pulse = 0.5 + 0.5 * Math.sin(time * 4);
    g.fillStyle = `rgba(255,220,120,${0.35 + 0.5 * pulse})`; g.fillRect(0, 170, 256, 22);
    g.fillStyle = '#111'; g.font = 'bold 12px Inter, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(kind === 'presque' ? 'LA CHANCE EST PROCHE' : 'MISEZ · GAGNEZ · REJOUEZ', 128, 181);
    t.needsUpdate = true;
  };
  update(0, true);
  return { texture: t, update };
}

export function clockTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const update = (mins) => {
    g.clearRect(0, 0, 256, 256);
    g.fillStyle = '#efe9dc'; g.beginPath(); g.arc(128, 128, 120, 0, TAU); g.fill(); g.strokeStyle = '#2b2b30'; g.lineWidth = 10; g.stroke();
    g.fillStyle = '#2b2b30'; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; g.fillRect(128 + Math.cos(a) * 100 - 3, 128 + Math.sin(a) * 100 - 3, 6, 6); }
    const hA = ((mins / 60) % 12) / 12 * TAU - Math.PI / 2, mA = (mins % 60) / 60 * TAU - Math.PI / 2;
    g.strokeStyle = '#1b1b22'; g.lineWidth = 10; g.lineCap = 'round'; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.cos(hA) * 60, 128 + Math.sin(hA) * 60); g.stroke();
    g.lineWidth = 6; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.cos(mA) * 92, 128 + Math.sin(mA) * 92); g.stroke();
    t.needsUpdate = true;
  };
  update(21 * 60);
  return { texture: t, update };
}

export function screenTexture(kind) {
  // fake dashboard / profile screens
  const c = canvas(512, 256, (g, w, h) => {
    g.fillStyle = '#0b1220'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#4fc3f7'; for (let i = 0; i < 14; i++) { const bh = 30 + ((i * 53) % 120); g.fillRect(40 + i * 32, h - 40 - bh, 22, bh); }
    g.fillStyle = '#fff'; g.font = 'bold 26px Inter, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillText(kind === 'theo' ? 'VOTRE PROFIL · MEMBRE OR' : 'TEMPS SUR MACHINE · +12 %', 40, 40);
    g.font = '18px Inter, sans-serif'; g.fillStyle = '#9fc4e8'; g.fillText(kind === 'theo' ? 'perte théorique · cadeaux · prochaine offre' : 'PBJ ce soir · 81,8 % machines · joueurs excessifs 60,6 %', 40, 72);
  });
  const t = tex(c, { repeat: false }); return t;
}

export function gradientSky() {
  const geo = new THREE.SphereGeometry(400, 24, 12);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color('#05060f') }, bottom: { value: new THREE.Color('#1a1626') }, mix: { value: 0 } },
    vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float h = normalize(vP).y; float k = smoothstep(-0.1, 0.6, h); gl_FragColor = vec4(mix(bottom, top, k), 1.0); }`
  });
  const mesh = new THREE.Mesh(geo, mat); mesh.renderOrder = -10; return mesh;
}

// ---------------------------------------------------------------- extra dressing textures
export function blobTexture() {
  const key = 'blob'; if (cache[key]) return cache[key];
  const c = canvas(128, 128, (g) => { const grd = g.createRadialGradient(64, 64, 6, 64, 64, 64); grd.addColorStop(0, 'rgba(0,0,0,0.7)'); grd.addColorStop(0.6, 'rgba(0,0,0,0.25)'); grd.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = grd; g.fillRect(0, 0, 128, 128); });
  const t = tex(c, { repeat: false }); cache[key] = t; return t;
}

export function artTexture(i) {
  const key = 'art' + i; if (cache[key]) return cache[key];
  const palettes = [['#1b4636', '#c6a14f', '#f5f1e8'], ['#b3261e', '#141210', '#c6a14f'], ['#0e2a20', '#7a1f22', '#ffd98a'], ['#2b1a0e', '#e8501c', '#f5f1e8']];
  const pal = palettes[i % palettes.length];
  const c = canvas(256, 320, (g, w, h) => {
    g.fillStyle = pal[0]; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 7; k++) { g.fillStyle = pal[(k + i) % 3]; g.globalAlpha = 0.85; const rx = (k * 61 + i * 37) % w, ry = (k * 97 + i * 53) % h; if (k % 2) { g.beginPath(); g.arc(rx, ry, 30 + (k * 23) % 60, 0, TAU); g.fill(); } else g.fillRect(rx - 40, ry - 20, 80 + (k * 17) % 60, 40); }
    g.globalAlpha = 1;
  });
  const t = tex(c, { repeat: false }); cache[key] = t; return t;
}

export function posterTexture(lines, colors = ['#141210', '#ffd98a', '#f5f1e8']) {
  const c = canvas(256, 384, (g, w, h) => {
    g.fillStyle = colors[0]; g.fillRect(0, 0, w, h);
    g.strokeStyle = colors[1]; g.lineWidth = 6; g.strokeRect(12, 12, w - 24, h - 24);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    lines.forEach((l, k) => { g.fillStyle = k === 0 ? colors[1] : colors[2]; g.font = k === 0 ? 'bold 44px "Bodoni 72", Georgia, serif' : '600 22px Inter, sans-serif'; g.fillText(l, w / 2, 90 + k * 60); });
    g.fillStyle = colors[1]; g.beginPath(); g.arc(w / 2, h - 70, 26, 0, TAU); g.fill();
  });
  return tex(c, { repeat: false });
}

// Scrolling jackpot ticker. Returns { texture, update(t) }.
export function tickerTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 96;
  const g = c.getContext('2d');
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
  const msg = 'JACKPOT PROGRESSIF  1 248 391 €   ·   MÉGA JACKPOT  87 214 €   ·   DERNIER GAGNANT : JEAN-MARC, 4 200 €   ·   BONUS FIDÉLITÉ CE SOIR   ·   ';
  // the glowing text is rasterised once into a strip; each frame only copies a window of it
  g.font = 'bold 54px "Bodoni 72", Georgia, serif';
  const wdt = Math.ceil(g.measureText(msg).width);
  const strip = document.createElement('canvas'); strip.width = wdt * 2; strip.height = 96;
  const gs = strip.getContext('2d'); gs.fillStyle = '#0a0a12'; gs.fillRect(0, 0, strip.width, 96);
  gs.font = g.font; gs.textBaseline = 'middle'; gs.fillStyle = '#ff9ab0'; gs.shadowColor = '#ff4d6d'; gs.shadowBlur = 14;
  gs.fillText(msg, 0, 50); gs.fillText(msg, wdt, 50);
  let last = -1;
  const update = (time) => {
    if (time - last < 1 / 15) return; last = time;
    const off = Math.floor((time * 90) % wdt);
    g.drawImage(strip, off, 0, 1024, 96, 0, 0, 1024, 96);
    t.needsUpdate = true;
  };
  update(0); return { texture: t, update };
}

// Fake sports broadcast for the bar TV
export function tvTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 288;
  const g = c.getContext('2d');
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.minFilter = THREE.LinearFilter;
  let last = -1;
  const update = (time) => {
    if (time - last < 0.1) return; last = time;
    g.fillStyle = '#2e7d32'; g.fillRect(0, 0, 512, 288);
    g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 3; g.strokeRect(20, 20, 472, 248); g.beginPath(); g.moveTo(256, 20); g.lineTo(256, 268); g.stroke(); g.beginPath(); g.arc(256, 144, 50, 0, TAU); g.stroke();
    for (let i = 0; i < 10; i++) { g.fillStyle = i < 5 ? '#e53935' : '#1e88e5'; const x = 60 + ((i * 97 + time * (20 + i * 3)) % 400), y = 50 + ((i * 53 + time * (15 + i * 2)) % 190); g.fillRect(x, y, 10, 20); }
    g.fillStyle = '#fff'; g.beginPath(); g.arc(256 + Math.sin(time * 1.3) * 150, 144 + Math.cos(time * 0.9) * 80, 6, 0, TAU); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.7)'; g.fillRect(140, 8, 232, 34); g.fillStyle = '#fff'; g.font = 'bold 22px Inter, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('PSG 1 – 1 OM   78\'', 256, 25);
    t.needsUpdate = true;
  };
  update(0); return { texture: t, update };
}

// Roulette results board (last numbers). Returns { texture, update(hist) }.
export function historyBoardTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.minFilter = THREE.LinearFilter;
  const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  const update = (hist) => {
    g.fillStyle = '#05070d'; g.fillRect(0, 0, 512, 256);
    g.fillStyle = '#c6a14f'; g.font = 'bold 26px Inter, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('DERNIERS NUMÉROS', 24, 34);
    const last = hist.slice(-12);
    last.forEach((n, i) => { const x = 40 + (i % 6) * 76, y = 90 + Math.floor(i / 6) * 76; g.fillStyle = n === 0 ? '#1e7a4c' : REDS.has(n) ? '#b3261e' : '#222'; g.beginPath(); g.arc(x, y, 30, 0, TAU); g.fill(); g.strokeStyle = '#c6a14f'; g.lineWidth = 2; g.stroke(); g.fillStyle = '#fff'; g.font = 'bold 30px Inter, sans-serif'; g.textAlign = 'center'; g.fillText(String(n), x, y + 1); });
    const streak = (() => { if (!hist.length) return null; const col = (n) => n === 0 ? 'v' : REDS.has(n) ? 'R' : 'N'; const c0 = col(hist[hist.length - 1]); let k = 0; for (let i = hist.length - 1; i >= 0 && col(hist[i]) === c0; i--) k++; return k >= 3 ? `${c0 === 'R' ? 'ROUGE' : c0 === 'N' ? 'NOIR' : 'ZÉRO'} × ${k}` : null; })();
    if (streak) { g.fillStyle = '#ffb74d'; g.font = 'bold 28px Inter, sans-serif'; g.textAlign = 'right'; g.fillText(streak, 488, 34); }
    t.needsUpdate = true;
  };
  update([]); return { texture: t, update };
}

export function neonTexture(text, color, glow) {
  return textTexture(text, { w: 512, h: 160, font: 'bold 110px "Bodoni 72", Didot, Georgia, serif', color, bg: 'rgba(0,0,0,0)', glow });
}

// ---------------------------------------------------------------- generated image assets (optional, procedural fallback)
const ASSET_MAP = { carpet: 'carpet_green', carpet2: 'carpet_purple', carpetred: 'carpet_red', marble: 'marble', wood: 'wood', brick: 'brick', wall: 'wall', wallpaper: 'wallpaper', ceiling: 'ceiling', tile: 'tile' };
const loader = new THREE.TextureLoader();
// the renderer registers itself here so a freshly loaded image is uploaded to the GPU right away,
// off the critical path, instead of stalling the first frame that happens to use it
let textureInit = null;
export function setTextureInit(fn) { textureInit = fn; }
export function loadAsset(name, cb, opts = {}) {
  loader.load(`assets/tex/${name}.jpg`, (t) => {
    if (opts.repeat !== false) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.needsUpdate = true;
    if (textureInit) textureInit(t);
    cb(t);
  }, undefined, () => {});
}
// Swap a material's procedural map for the generated image once it is available
export function upgradeMaterial(material, patternName) {
  const asset = ASSET_MAP[patternName]; if (!asset) return;
  loadAsset(asset, (t) => { material.map = t; material.needsUpdate = true; });
}
export function loadImage(name, cb) { const img = new Image(); img.onload = () => cb(img); img.onerror = () => {}; img.src = `assets/tex/${name}.jpg`; }
