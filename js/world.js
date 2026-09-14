// World geometry: rooms, walls, objects, NPCs, lights. Units are world pixels.

export const WORLD = { w: 3024, h: 1952 };
const T = 24; // wall thickness

export const ROOMS = [
  { id: 'street',    x: 0,    y: 0,    w: 3024, h: 320,  floor: 'asphalt', dark: 0.55, label: 'Le parvis',            outdoor: true },
  { id: 'ruelle',    x: 0,    y: 320,  w: 176,  h: 1608, floor: 'concrete', dark: 0.62, label: 'La ruelle',            outdoor: true },
  { id: 'hall',      x: 1360, y: 344,  w: 480,  h: 400,  floor: 'marble',  dark: 0.30, label: 'Le hall' },
  { id: 'corridor',  x: 1160, y: 496,  w: 200,  h: 88,   floor: 'marble',  dark: 0.45, label: '' },
  { id: 'machines',  x: 200,  y: 344,  w: 960,  h: 1000, floor: 'carpet',  dark: 0.66, label: 'La salle des machines' },
  { id: 'toilettes', x: 1184, y: 880,  w: 152,  h: 200,  floor: 'tile',    dark: 0.28, label: 'Les toilettes' },
  { id: 'tables',    x: 1864, y: 344,  w: 1136, h: 1000, floor: 'carpet',  dark: 0.48, label: 'La salle des tables' },
  { id: 'bar',       x: 1360, y: 768,  w: 480,  h: 400,  floor: 'wood',    dark: 0.62, label: 'Le bar' },
  { id: 'hallway',   x: 1560, y: 1168, w: 80,   h: 200,  floor: 'carpet',  dark: 0.70, label: '' },
  { id: 'labyrinth', x: 200,  y: 1368, w: 1800, h: 560,  floor: 'carpet2', dark: 0.74, label: 'Les couloirs' },
  { id: 'vip',       x: 2024, y: 1368, w: 976,  h: 232,  floor: 'carpetred', dark: 0.42, label: 'Le salon VIP' },
  { id: 'bureau',    x: 2024, y: 1624, w: 376,  h: 304,  floor: 'wood',    dark: 0.50, label: 'Le bureau' },
];

// Solid walls
export const WALLS = [
  // world boundary
  { x: -T, y: -T, w: WORLD.w + 2 * T, h: T },
  { x: -T, y: 0, w: T, h: WORLD.h },
  { x: WORLD.w, y: 0, w: T, h: WORLD.h },
  { x: -T, y: 1928, w: WORLD.w + 2 * T, h: T },
  // façade (entrance gap 1480..1560)
  { x: 200, y: 320, w: 1280, h: T, id: 'facadeL' },
  { x: 1560, y: 320, w: 1440, h: T, id: 'facadeR' },
  // building east wall
  { x: 3000, y: 320, w: T, h: 1632 },
  // ruelle / building wall (exit gap 1850..1910)
  { x: 176, y: 320, w: T, h: 1530 },
  { x: 176, y: 1910, w: T, h: 18 },
  // strip between machines and hall (x 1160..1360), with corridor and toilets cutouts
  { x: 1160, y: 344, w: 200, h: 152 },
  { x: 1160, y: 584, w: 200, h: 296 },
  { x: 1160, y: 880, w: 24, h: 200 },
  { x: 1336, y: 880, w: 24, h: 60 },
  { x: 1336, y: 1020, w: 24, h: 60 },
  { x: 1160, y: 1080, w: 200, h: 264 },
  // hall / tables wall (door 496..584)
  { x: 1840, y: 344, w: T, h: 152 },
  { x: 1840, y: 584, w: T, h: 760 },
  // hall / bar wall (door 1560..1640)
  { x: 1360, y: 744, w: 200, h: T },
  { x: 1640, y: 744, w: 200, h: T },
  // bar bottom with hallway (1560..1640)
  { x: 1360, y: 1168, w: 200, h: 176 },
  { x: 1640, y: 1168, w: 200, h: 176 },
  // machines / labyrinth wall (gaps 700..780 and 1560..1640)
  { x: 200, y: 1344, w: 500, h: T },
  { x: 780, y: 1344, w: 780, h: T },
  { x: 1640, y: 1344, w: 360, h: T },
  // tables / vip wall (door 2100..2180)
  { x: 2000, y: 1344, w: 100, h: T },
  { x: 2180, y: 1344, w: 820, h: T },
  // labyrinth / vip+bureau wall (staff door 1700..1780)
  { x: 2000, y: 1368, w: T, h: 332 },
  { x: 2000, y: 1780, w: T, h: 148 },
  // vip / bureau
  { x: 2024, y: 1600, w: 976, h: T },
  { x: 2400, y: 1624, w: 600, h: 304 },
  // labyrinth lanes
  { x: 200, y: 1500, w: 1700, h: T },
  { x: 300, y: 1656, w: 1700, h: T },
  { x: 200, y: 1812, w: 1700, h: T },
  // labyrinth stubs (alcoves)
  { x: 520, y: 1368, w: T, h: 56 },
  { x: 1120, y: 1444, w: T, h: 56 },
  { x: 760, y: 1524, w: T, h: 56 },
  { x: 1520, y: 1600, w: T, h: 56 },
  { x: 900, y: 1680, w: T, h: 56 },
  { x: 1440, y: 1756, w: T, h: 56 },
];

// Slot machine banks (decorative + special)
export const SLOTS = [];
const rowsY = [440, 600, 760, 920, 1080, 1230];
rowsY.forEach((y, r) => {
  for (let i = 0; i < 7; i++) SLOTS.push({ x: 280 + i * 56, y, w: 44, h: 56, hue: (r * 60 + i * 40) % 360 });
  for (let i = 0; i < 7; i++) SLOTS.push({ x: 740 + i * 56, y, w: 44, h: 56, hue: (r * 60 + i * 40 + 180) % 360 });
});
// mark the three special machines
function mark(x, y, kind, label) { const m = SLOTS.find(s => s.x === x && s.y === y); m.kind = kind; m.label = label; m.special = true; }
mark(392, 440, 'lucky', 'Lucky 7');
mark(852, 600, 'mega', 'Mégalignes');
mark(504, 920, 'presque', 'Presque !');
// slot bank in the tables room
for (let i = 0; i < 6; i++) SLOTS.push({ x: 2320 + i * 56, y: 1230, w: 44, h: 56, hue: (i * 50 + 20) % 360 });
// labyrinth alcove machines
[[248, 1372], [560, 1372], [1160, 1444], [800, 1528], [1560, 1604], [940, 1684], [1480, 1760], [1700, 1840]].forEach(([x, y], i) => SLOTS.push({ x, y, w: 44, h: 56, hue: (i * 70) % 360, laby: true }));
// west-wall bank in the machine hall, facing east
for (let i = 0; i < 11; i++) SLOTS.push({ x: 208, y: 480 + i * 66, w: 44, h: 56, hue: (i * 33 + 200) % 360, rot: 'east' });
// every machine is playable: assign a game kind and a marquee name
export const SLOT_KINDS = ['lucky', 'fruits', 'presque', 'pharaon', 'mega'];
const SLOT_NAMES = {
  lucky: ['Lucky 7', 'Diamond Rush', 'Étoile filante', 'Golden Bell'],
  fruits: ["Fruits d'or", 'Cerises !', 'Juicy Jackpot', 'Tutti Frutti'],
  presque: ['Presque !', 'Hot Streak', 'Jackpot Fever', 'Encore !'],
  pharaon: ['Pharaon', 'Cléopâtre', 'Sphinx', 'Nil sacré'],
  mega: ['Mégalignes', 'Dragon 40', 'Neptune Lines', 'Big Bang 20']
};
SLOTS.forEach((m, i) => {
  if (m.special) return;
  m.kind = SLOT_KINDS[(i * 7 + Math.floor(i / 7)) % SLOT_KINDS.length];
  m.label = SLOT_NAMES[m.kind][i % 4];
});

// Interactable / solid objects
export const OBJECTS = [
  // street
  { id: 'busstop', x: 300, y: 96, w: 14, h: 60, solid: true, type: 'busstop', label: 'L\'arrêt de bus', r: 70 },
  { id: 'clock', x: 1240, y: 300, w: 60, h: 20, solid: false, type: 'clock', label: 'L\'horloge de la façade', r: 80 },
  { id: 'entrance', x: 1480, y: 300, w: 80, h: 30, solid: false, type: 'entrance', label: 'Le tourniquet', r: 70 },
  // hall
  { id: 'caisse', x: 1380, y: 470, w: 130, h: 36, solid: true, type: 'caisse', label: 'La caisse', r: 60 },
  { id: 'fidelite', x: 1690, y: 470, w: 130, h: 36, solid: true, type: 'fidelite', label: 'Carte de fidélité', r: 60 },
  { id: 'fountain', x: 1560, y: 500, w: 80, h: 80, solid: true, type: 'fountain' },
  { id: 'atm', x: 1700, y: 704, w: 44, h: 32, solid: true, type: 'atm', label: 'Distributeur', r: 56 },
  { id: 'wheel', x: 1400, y: 610, w: 56, h: 40, solid: true, type: 'wheel', label: 'La roue de la fortune', r: 66 },
  // tables
  { id: 'roulette', x: 2010, y: 460, w: 250, h: 130, solid: true, type: 'roulette', label: 'La roulette', r: 70 },
  { id: 'plaque', x: 2460, y: 344, w: 120, h: 14, solid: false, type: 'plaque', label: 'Une plaque de 1913', r: 60 },
  { id: 'baccarat', x: 2440, y: 830, w: 240, h: 130, solid: true, type: 'baccarat', label: 'La table haute', r: 70 },
  { id: 'bj1', x: 2720, y: 470, w: 200, h: 110, solid: true, type: 'blackjack', label: 'Blackjack', r: 66 },
  { id: 'bj2', x: 2070, y: 880, w: 200, h: 110, solid: true, type: 'blackjack', label: 'Blackjack', r: 66 },
  { id: 'roulette2', x: 2360, y: 470, w: 250, h: 130, solid: true, type: 'roulette', label: 'La roulette', r: 70 },
  { id: 'bj3', x: 2740, y: 860, w: 200, h: 110, solid: true, type: 'blackjack', label: 'Blackjack', r: 66 },
  { id: 'poker', x: 2080, y: 1090, w: 200, h: 120, solid: true, type: 'poker', label: 'Table de poker — tournoi à minuit', r: 66 },
  { id: 'craps', x: 2500, y: 1060, w: 260, h: 120, solid: true, type: 'craps', label: 'Craps — table fermée', r: 66 },
  { id: 'cage', x: 2950, y: 760, w: 44, h: 120, solid: true, type: 'cage', label: 'Caisse des tables', r: 66 },
  { id: 'vipdoor', x: 2100, y: 1344, w: 80, h: 24, solid: true, type: 'vipdoor', label: 'Salon VIP — membres', r: 60 },
  // bar
  { id: 'bar', x: 1400, y: 1060, w: 400, h: 36, solid: true, type: 'barcounter', label: 'Le bar', r: 60 },
  { id: 'btable1', x: 1420, y: 850, w: 56, h: 56, solid: true, type: 'roundtable' },
  { id: 'btable2', x: 1740, y: 850, w: 56, h: 56, solid: true, type: 'roundtable' },
  { id: 'btable3', x: 1420, y: 960, w: 56, h: 56, solid: true, type: 'roundtable' },
  { id: 'btable4', x: 1740, y: 960, w: 56, h: 56, solid: true, type: 'roundtable' },
  // toilettes
  { id: 'phone', x: 1220, y: 950, w: 30, h: 30, solid: false, type: 'phone', label: 'Ton téléphone vibre', r: 60 },
  { id: 'sink', x: 1200, y: 884, w: 120, h: 20, solid: true, type: 'sink' },
  // labyrinth
  { id: 'staffdoor', x: 2000, y: 1700, w: 24, h: 80, solid: false, type: 'staffdoor', label: 'Porte « Personnel »', r: 60 },
  { id: 'exitdoor', x: 176, y: 1850, w: 24, h: 60, solid: false, type: 'exitdoor', label: 'Une porte sans panneau', r: 64 },
  { id: 'sign1', x: 1000, y: 1372, w: 60, h: 14, solid: false, type: 'sign', text: 'RESTAURANT →' },
  { id: 'sign0', x: 2105, y: 1300, w: 70, h: 14, solid: false, type: 'sign', text: 'SALON VIP ↓' },
  { id: 'sign4', x: 1580, y: 1230, w: 44, h: 14, solid: false, type: 'sign', text: 'BAR ↑' },
  { id: 'sign2', x: 600, y: 1528, w: 60, h: 14, solid: false, type: 'sign', text: '← SPECTACLE' },
  { id: 'sign3', x: 1300, y: 1684, w: 60, h: 14, solid: false, type: 'sign', text: 'BAR →' },
  { id: 'mirror1', x: 400, y: 1840, w: 90, h: 8, solid: false, type: 'mirror' },
  { id: 'mirror2', x: 700, y: 1840, w: 90, h: 8, solid: false, type: 'mirror' },
  { id: 'mirror3', x: 1200, y: 1840, w: 90, h: 8, solid: false, type: 'mirror' },
  // vip
  { id: 'viptable', x: 2500, y: 1440, w: 200, h: 90, solid: true, type: 'viptable' },
  { id: 'sofa1', x: 2240, y: 1520, w: 120, h: 40, solid: true, type: 'sofa' },
  { id: 'sofa2', x: 2760, y: 1520, w: 120, h: 40, solid: true, type: 'sofa' },
  { id: 'theo', x: 2400, y: 1370, w: 80, h: 16, solid: false, type: 'theo', label: 'Écran : « Votre profil »', r: 60 },
  // bureau
  { id: 'desk', x: 2160, y: 1740, w: 120, h: 56, solid: true, type: 'desk' },
  { id: 'board', x: 2120, y: 1626, w: 200, h: 16, solid: false, type: 'board', label: 'Le tableau de bord', r: 70 },
  // ruelle
  { id: 'poster', x: 150, y: 1180, w: 24, h: 40, solid: false, type: 'poster', label: 'Une affiche', r: 60 },
  { id: 'dumpster', x: 40, y: 1700, w: 70, h: 40, solid: true, type: 'dumpster' },
];

// seated players at roughly a third of the machines
function machinePatrons() {
  const out = []; const cols = ['#6d5c7a', '#4e6b5a', '#7a6a4e', '#5a5a7a', '#7a4e5c', '#4e5a6b', '#6b4e3a', '#3a5a6b'];
  SLOTS.forEach((m, i) => {
    if (m.laby || m.rot) return;
    if ((i * 7 + 3) % 3 !== 0) return;
    if (m.special) return;
    out.push({ id: 'mp' + i, name: '', kind: 'patron', x: m.x + 22, y: m.y + 72, color: cols[i % cols.length], r: 0, facing: 'up', seat: i });
  });
  return out;
}
// NPCs. kind: ghost | staff | person | patron | walker
export const NPCS = [
  { id: 'vigile', name: 'Le vigile', kind: 'staff', x: 1420, y: 280, color: '#3F51B5', r: 64 },
  { id: 'wells', name: 'Charles Wells', kind: 'ghost', x: 1520, y: 650, witness: 'wells', r: 70 },
  { id: 'caissier', name: 'La caissière', kind: 'staff', x: 1445, y: 452, color: '#8D6E63', r: 0, behind: true },
  { id: 'hotesse', name: "L'hôtesse", kind: 'staff', x: 1755, y: 452, color: '#AD1457', r: 0, behind: true },
  { id: 'mollie', name: 'Mollie', kind: 'ghost', x: 862, y: 838, witness: 'mollie', r: 66 },
  { id: 'bookman', name: 'Katrina Bookman', kind: 'ghost', x: 980, y: 690, witness: 'bookman', r: 66 },
  { id: 'croupier', name: 'Le croupier', kind: 'staff', x: 2135, y: 448, color: '#212121', r: 0, behind: true },
  { id: 'croupier2', name: 'La croupière', kind: 'staff', x: 2560, y: 818, color: '#212121', r: 0, behind: true },
  { id: 'dosto', name: 'Fiodor Dostoïevski', kind: 'ghost', x: 1950, y: 660, witness: 'dosto', r: 70 },
  { id: 'karas', name: 'Archie Karas', kind: 'ghost', x: 2660, y: 1010, witness: 'karas', r: 70 },
  { id: 'uston', name: 'Ken Uston', kind: 'ghost', x: 2880, y: 660, witness: 'uston', r: 70 },
  { id: 'barman', name: 'Le barman', kind: 'staff', x: 1600, y: 1126, color: '#5D4037', r: 0, behind: true },
  { id: 'sami', name: 'Un jeune homme', kind: 'person', x: 1300, y: 1044, witness: 'sami', color: '#4FC3F7', r: 64 },
  { id: 'architecte', name: "L'architecte", kind: 'ghost', x: 1000, y: 1600, witness: 'architecte', r: 70 },
  { id: 'hote', name: 'Vincent', kind: 'staff', x: 2150, y: 1420, color: '#B71C1C', r: 66 },
  { id: 'watanabe', name: 'Terrance Watanabe', kind: 'ghost', x: 2300, y: 1490, witness: 'watanabe', r: 70 },
  { id: 'kakavas', name: 'Harry Kakavas', kind: 'ghost', x: 2820, y: 1470, witness: 'kakavas', r: 70 },
  { id: 'nour', name: 'Nour', kind: 'person', x: 360, y: 190, witness: 'nour', color: '#A5D6A7', r: 70, hidden: true },
  // silent patrons: they never look up
  ...machinePatrons(),
  { id: 'q1', name: '', kind: 'patron', x: 2400, y: 628, color: '#5a4e7a', r: 0, facing: 'up', standing: true },
  { id: 'q2', name: '', kind: 'patron', x: 2540, y: 628, color: '#7a5a4e', r: 0, facing: 'up', standing: true },
  { id: 'q3', name: '', kind: 'patron', x: 2770, y: 612, color: '#4e7a6b', r: 0, facing: 'up' },
  { id: 'q4', name: '', kind: 'patron', x: 2850, y: 612, color: '#6b4e7a', r: 0, facing: 'up' },
  { id: 'q5', name: '', kind: 'patron', x: 2120, y: 1022, color: '#7a6b4e', r: 0, facing: 'up' },
  { id: 'q6', name: '', kind: 'patron', x: 2200, y: 1022, color: '#4e5a7a', r: 0, facing: 'up' },
  { id: 'q7', name: '', kind: 'patron', x: 2800, y: 1002, color: '#5c4e3a', r: 0, facing: 'up' },
  { id: 'q8', name: '', kind: 'patron', x: 2600, y: 992, color: '#3a4e5c', r: 0, facing: 'up' },
  { id: 'q9', name: '', kind: 'patron', x: 1560, y: 1032, color: '#6b3a5c', r: 0, facing: 'down' },
  { id: 'q10', name: '', kind: 'patron', x: 2620, y: 1572, color: '#7a4e4e', r: 0, facing: 'up', standing: true },
  { id: 'q11', name: '', kind: 'patron', x: 1445, y: 565, color: '#4e6b7a', r: 0, facing: 'up', standing: true },
  { id: 'q12', name: '', kind: 'patron', x: 1428, y: 690, color: '#6b6b4e', r: 0, facing: 'up', standing: true },
  { id: 'q13', name: '', kind: 'patron', x: 2160, y: 1240, color: '#5a3a3a', r: 0, facing: 'up' },
  { id: 'q14', name: '', kind: 'patron', x: 2240, y: 1240, color: '#3a5a3a', r: 0, facing: 'up' },
  // walkers follow a path (px), looping or bouncing
  { id: 'w1', name: '', kind: 'walker', x: 722, y: 480, color: '#4e5a6b', r: 0, path: [[722, 470], [722, 1310]], bounce: true, speed: 42 },
  { id: 'w2', name: '', kind: 'walker', x: 320, y: 565, color: '#6b5a4e', r: 0, path: [[320, 565], [1120, 565], [1120, 725], [320, 725]], speed: 38 },
  { id: 'w3', name: '', kind: 'walker', x: 1900, y: 700, color: '#3a3a4e', r: 0, path: [[1900, 700], [2700, 700], [2700, 1010], [2350, 1010], [2350, 700]], speed: 40 },
  { id: 'w4', name: 'La serveuse', kind: 'walker', x: 1600, y: 620, color: '#1b1b22', r: 0, path: [[1600, 620], [1600, 1010], [1520, 1010], [1520, 800]], bounce: true, speed: 34, tray: true },
  { id: 'w5', name: '', kind: 'walker', x: 400, y: 1590, color: '#5a4e6b', r: 0, path: [[400, 1590], [1900, 1590]], bounce: true, speed: 36 },
  { id: 'w6', name: '', kind: 'walker', x: 600, y: 210, color: '#4e4e4e', r: 0, path: [[600, 210], [2800, 210]], bounce: true, speed: 45 },
  { id: 'p6', name: '', kind: 'patron', x: 2080, y: 618, color: '#4e5a7a', r: 0, facing: 'up' },
  { id: 'p7', name: '', kind: 'patron', x: 2215, y: 618, color: '#6b4e3a', r: 0, facing: 'up' },
  { id: 'p8', name: '', kind: 'patron', x: 2480, y: 992, color: '#3a5a6b', r: 0, facing: 'up' },
  { id: 'p9', name: '', kind: 'patron', x: 1440, y: 1032, color: '#5c4e7a', r: 0, facing: 'down' },
  { id: 'p10', name: '', kind: 'patron', x: 1680, y: 1032, color: '#7a5c4e', r: 0, facing: 'down' },
  { id: 'p11', name: '', kind: 'patron', x: 822, y: 1600, color: '#4e7a6b', r: 0, facing: 'up' },
  { id: 'p12', name: '', kind: 'patron', x: 2432, y: 1302, color: '#6b5c3a', r: 0, facing: 'up' },
];

// Lights: { x, y, r, color, a } ; 'a' = intensity of cut-out (0..1)
export const LIGHTS = [];
// street lamps
[520, 900, 1900, 2400, 2800].forEach(x => LIGHTS.push({ x, y: 150, r: 260, color: '#ffe0a8', a: 0.75, glow: 0.10 }));
LIGHTS.push({ x: 1520, y: 300, r: 340, color: '#ff4d6d', a: 0.9, glow: 0.18 }); // neon
LIGHTS.push({ x: 88, y: 900, r: 220, color: '#ffe0a8', a: 0.5, glow: 0.05 }); // ruelle lamp
// hall
LIGHTS.push({ x: 1600, y: 540, r: 420, color: '#ffe9c4', a: 1, glow: 0.06 });
LIGHTS.push({ x: 1260, y: 540, r: 160, color: '#ffe9c4', a: 0.8 });
// machines: each screen glows
SLOTS.forEach(s => LIGHTS.push({ x: s.x + s.w / 2, y: s.y + s.h + 6, r: s.special ? 150 : 95, color: `hsl(${s.hue} 90% 65%)`, a: s.special ? 0.9 : 0.55, glow: s.special ? 0.16 : 0.07, slot: true }));
// aisle lights for the 3D machine hall
[[500, 560], [900, 560], [500, 880], [900, 880], [500, 1200], [900, 1200]].forEach(([x, y]) => LIGHTS.push({ x, y, r: 260, color: '#ff9ac8', a: 0.5, aisle: true }));
// tables chandeliers
[[2135, 520], [2560, 890], [2820, 520], [2170, 930]].forEach(([x, y]) => LIGHTS.push({ x, y, r: 330, color: '#ffd9a0', a: 0.95, glow: 0.08 }));
LIGHTS.push({ x: 2520, y: 360, r: 120, color: '#ffd9a0', a: 0.6 });
// bar
[[1450, 1075], [1600, 1075], [1750, 1075]].forEach(([x, y]) => LIGHTS.push({ x, y, r: 170, color: '#ffb46a', a: 0.9, glow: 0.10 }));
LIGHTS.push({ x: 1600, y: 850, r: 240, color: '#ff9a5a', a: 0.5 });
// toilettes
LIGHTS.push({ x: 1260, y: 980, r: 180, color: '#dfe9ff', a: 0.95, glow: 0.04 });
LIGHTS.push({ x: 1600, y: 1260, r: 120, color: '#ffb46a', a: 0.6 });
// labyrinth: sparse
[[400, 1434], [1000, 1434], [1700, 1434], [500, 1590], [1300, 1590], [1900, 1590], [300, 1746], [1100, 1746], [1800, 1746], [600, 1880], [1200, 1880], [1800, 1880]].forEach(([x, y]) => LIGHTS.push({ x, y, r: 190, color: '#ffc78a', a: 0.6 }));
LIGHTS.push({ x: 190, y: 1880, r: 120, color: '#7fd0ff', a: 0.7, glow: 0.08 });
// vip
[[2200, 1420], [2600, 1400], [2880, 1420]].forEach(([x, y]) => LIGHTS.push({ x, y, r: 300, color: '#ffcf9a', a: 0.95, glow: 0.10 }));
// bureau
LIGHTS.push({ x: 2220, y: 1720, r: 240, color: '#e8f4ff', a: 0.95, glow: 0.05 });

export function roomAt(x, y) {
  for (const r of ROOMS) if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return r;
  return null;
}

export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export const PLAYER_START = { x: 1100, y: 190 };
