// World geometry: rooms, walls, objects, NPCs, lights. Units are world pixels.

export const WORLD = { w: 3824, h: 1952 };
export const BUILDING = { x0: 200, x1: 3800 }; // the façade runs from x0 to x1
const T = 24; // wall thickness

export const ROOMS = [
  { id: 'street',    x: 0,    y: 0,    w: 3824, h: 320,  floor: 'asphalt', dark: 0.55, label: 'Le parvis',            outdoor: true },
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
  // east wing: restaurant, show room, smokers' terrace (open sky) and, on the street, the pawnbroker
  { id: 'restaurant', x: 3024, y: 344, w: 560, h: 540, floor: 'wood',      dark: 0.45, label: 'Le restaurant' },
  { id: 'scene',      x: 3024, y: 908, w: 560, h: 436, floor: 'carpetred', dark: 0.70, label: 'La salle de spectacle' },
  { id: 'fumoir',     x: 3608, y: 544, w: 192, h: 240, floor: 'concrete',  dark: 0.50, label: 'La terrasse fumeurs', outdoor: true },
  { id: 'gages',      x: 3608, y: 344, w: 192, h: 176, floor: 'tile',      dark: 0.35, label: 'Le prêteur sur gages' },
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
  { x: 1560, y: 320, w: 2120, h: T, id: 'facadeR' },
  { x: 3740, y: 320, w: 60, h: T, id: 'facadeE' },
  // tables / restaurant wall (door 600..680), then the east wall of the VIP and the office
  { x: 3000, y: 320, w: T, h: 280 },
  { x: 3000, y: 680, w: T, h: 1272 },
  // east wing
  { x: 3024, y: 884, w: 236, h: T }, { x: 3340, y: 884, w: 244, h: T },     // restaurant / show room (door 3260..3340)
  { x: 3584, y: 344, w: T, h: 276 }, { x: 3584, y: 700, w: T, h: 184 },     // restaurant / terrace (door 620..700)
  { x: 3584, y: 884, w: T, h: 460 },                                        // show room east wall
  { x: 3024, y: 1344, w: 584, h: T },                                       // show room south wall
  { x: 3608, y: 520, w: 192, h: T },                                        // pawnbroker / terrace
  { x: 3608, y: 784, w: 216, h: T },                                        // terrace south wall
  { x: 3800, y: 320, w: T, h: 488 },                                        // east end of the building
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
// Real casino banks: a row along the north wall, then three back-to-back islands (a north-facing
// row glued to a south-facing one) and a last row against the south wall. Walkways of 2.3 m run
// between the islands; the 3.5 m central aisle (x 642..780) stays clear of the south door (700..780)
// and the corridor door (y 496..584) opens onto the wide entrance walkway.
// `rot` is the direction the machine's screen faces (default: south).
const ROWS = [[380, 'south'], [600, 'north'], [640, 'south'], [820, 'north'], [860, 'south'], [1040, 'north'], [1080, 'south'], [1270, 'north']];
ROWS.forEach(([y, face], r) => {
  const rot = face === 'south' ? undefined : face;
  for (let i = 0; i < 7; i++) SLOTS.push({ x: 250 + i * 56, y, w: 44, h: 56, hue: (r * 60 + i * 40) % 360, rot });
  for (let i = 0; i < 5; i++) SLOTS.push({ x: 780 + i * 56, y, w: 44, h: 56, hue: (r * 60 + i * 40 + 180) % 360, rot });
});
// mark the three special machines (all on south-facing rows, seen when walking in from the corridor)
function mark(x, y, kind, label) { const m = SLOTS.find(s => s.x === x && s.y === y); m.kind = kind; m.label = label; m.special = true; }
mark(362, 380, 'lucky', 'Lucky 7');
mark(892, 640, 'mega', 'Mégalignes');
mark(474, 860, 'presque', 'Presque !');
// small bank along the east wall of the tables room, screens facing west (the seats are on the room side)
for (let i = 0; i < 5; i++) SLOTS.push({ x: 2950, y: 1000 + i * 66, w: 44, h: 56, hue: (i * 50 + 20) % 360, rot: 'west' });
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
  { id: 'craps', x: 2500, y: 1060, w: 260, h: 120, solid: true, type: 'craps', label: 'Craps', r: 66 },
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
  // restaurant
  { id: 'buffet', x: 3070, y: 380, w: 300, h: 44, solid: true, type: 'buffet', label: 'Le buffet — « offert aux membres »', r: 64 },
  { id: 'rtable1', x: 3090, y: 560, w: 56, h: 56, solid: true, type: 'roundtable' },
  { id: 'rtable2', x: 3270, y: 560, w: 56, h: 56, solid: true, type: 'roundtable' },
  { id: 'rtable3', x: 3450, y: 560, w: 56, h: 56, solid: true, type: 'roundtable' },
  { id: 'rtable4', x: 3090, y: 730, w: 56, h: 56, solid: true, type: 'roundtable' },
  { id: 'rtable5', x: 3450, y: 730, w: 56, h: 56, solid: true, type: 'roundtable' },
  { id: 'signrest', x: 2930, y: 610, w: 60, h: 14, solid: false, type: 'sign', text: 'RESTAURANT →' },
  // show room
  { id: 'stage', x: 3084, y: 1190, w: 440, h: 130, solid: true, type: 'stage', label: 'La scène', r: 80 },
  { id: 'chairs1', x: 3084, y: 960, w: 440, h: 28, solid: true, type: 'chairs' },
  { id: 'chairs2', x: 3084, y: 1040, w: 440, h: 28, solid: true, type: 'chairs' },
  { id: 'chairs3', x: 3084, y: 1120, w: 440, h: 28, solid: true, type: 'chairs' },
  { id: 'showbill', x: 3040, y: 912, w: 60, h: 14, solid: false, type: 'narr', key: 'showbill', label: "L'affiche du spectacle", r: 60 },
  // terrace
  { id: 'ciel', x: 3680, y: 600, w: 60, h: 20, solid: false, type: 'sky', label: 'Le ciel', r: 90 },
  { id: 'bench2', x: 3620, y: 700, w: 100, h: 30, solid: true, type: 'bench' },
  { id: 'ashtray', x: 3750, y: 660, w: 24, h: 24, solid: true, type: 'ashtray' },
  // pawnbroker
  { id: 'gagesdesk', x: 3640, y: 400, w: 130, h: 36, solid: true, type: 'desk', label: "Le comptoir — « achat d'or · prêt sur gage »", r: 64 },
  { id: 'vitrine', x: 3624, y: 470, w: 60, h: 40, solid: true, type: 'narr', key: 'vitrine', label: 'La vitrine', r: 60 },
  // ruelle
  { id: 'poster', x: 150, y: 1180, w: 24, h: 40, solid: false, type: 'poster', label: 'Une affiche', r: 60 },
  { id: 'dumpster', x: 40, y: 1700, w: 70, h: 40, solid: true, type: 'dumpster' },
];

// where a player sits in front of a machine (px), and which way they look
export function slotSeat(m) {
  const cx = m.x + m.w / 2, cy = m.y + m.h / 2;
  switch (m.rot) {
    case 'north': return { x: cx, y: cy - 44, facing: 'down' };
    case 'west': return { x: cx - 44, y: cy, facing: 'right' };
    case 'east': return { x: cx + 44, y: cy, facing: 'left' };
    default: return { x: cx, y: cy + 44, facing: 'up' };
  }
}
// seated players at roughly a third of the machines
function machinePatrons() {
  const out = []; const cols = ['#6d5c7a', '#4e6b5a', '#7a6a4e', '#5a5a7a', '#7a4e5c', '#4e5a6b', '#6b4e3a', '#3a5a6b'];
  SLOTS.forEach((m, i) => {
    if (m.laby) return;
    if ((i * 7 + 3) % 3 !== 0) return;
    if (m.special) return;
    const seat = slotSeat(m);
    out.push({ id: 'mp' + i, name: '', kind: 'patron', x: seat.x, y: seat.y, color: cols[i % cols.length], r: 44, facing: seat.facing, seat: i });
  });
  return out;
}
// NPCs. kind: ghost | staff | person | patron | walker
export const NPCS = [
  { id: 'vigile', name: 'Le vigile', kind: 'staff', x: 1420, y: 280, color: '#3F51B5', r: 64 },
  { id: 'wells', name: 'Charles Wells', kind: 'ghost', x: 1520, y: 650, witness: 'wells', r: 70 },
  { id: 'caissier', name: 'La caissière', kind: 'staff', x: 1445, y: 452, color: '#8D6E63', r: 0, behind: true },
  { id: 'hotesse', name: "L'hôtesse", kind: 'staff', x: 1755, y: 452, color: '#AD1457', r: 0, behind: true },
  { id: 'mollie', name: 'Mollie', kind: 'ghost', x: 900, y: 758, witness: 'mollie', r: 66 },
  { id: 'bookman', name: 'Katrina Bookman', kind: 'ghost', x: 1000, y: 528, witness: 'bookman', r: 66 },
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
  { id: 'q1', name: '', kind: 'patron', x: 2400, y: 628, color: '#5a4e7a', r: 44, facing: 'up', standing: true },
  { id: 'q2', name: '', kind: 'patron', x: 2540, y: 628, color: '#7a5a4e', r: 44, facing: 'up', standing: true },
  { id: 'q3', name: '', kind: 'patron', x: 2770, y: 612, color: '#4e7a6b', r: 44, facing: 'up' },
  { id: 'q4', name: '', kind: 'patron', x: 2850, y: 612, color: '#6b4e7a', r: 44, facing: 'up' },
  { id: 'q5', name: '', kind: 'patron', x: 2120, y: 1022, color: '#7a6b4e', r: 44, facing: 'up' },
  { id: 'q6', name: '', kind: 'patron', x: 2200, y: 1022, color: '#4e5a7a', r: 44, facing: 'up' },
  { id: 'q7', name: '', kind: 'patron', x: 2800, y: 1002, color: '#5c4e3a', r: 44, facing: 'up' },
  { id: 'q8', name: '', kind: 'patron', x: 2600, y: 992, color: '#3a4e5c', r: 44, facing: 'up' },
  { id: 'q9', name: '', kind: 'patron', x: 1560, y: 1032, color: '#6b3a5c', r: 44, facing: 'down' },
  { id: 'q10', name: '', kind: 'patron', x: 2620, y: 1572, color: '#7a4e4e', r: 44, facing: 'up', standing: true },
  { id: 'q11', name: '', kind: 'patron', x: 1445, y: 565, color: '#4e6b7a', r: 44, facing: 'up', standing: true },
  { id: 'q12', name: '', kind: 'patron', x: 1452, y: 692, color: '#6b6b4e', r: 44, facing: 'up', standing: true },
  { id: 'q13', name: '', kind: 'patron', x: 2928, y: 1094, color: '#5a3a3a', r: 44, facing: 'right' },
  { id: 'q14', name: '', kind: 'patron', x: 2928, y: 1226, color: '#3a5a3a', r: 44, facing: 'right' },
  // walkers follow a path (px), looping or bouncing
  { id: 'w1', name: '', kind: 'walker', x: 705, y: 470, color: '#4e5a6b', r: 44, path: [[705, 470], [705, 1310]], bounce: true, speed: 42 },
  { id: 'w2', name: '', kind: 'walker', x: 300, y: 655, color: '#6b5a4e', r: 44, path: [[225, 540], [1132, 540], [1132, 980], [225, 980]], speed: 38 },
  { id: 'w3', name: '', kind: 'walker', x: 1900, y: 700, color: '#3a3a4e', r: 44, path: [[1900, 700], [2700, 700], [2700, 1010], [2350, 1010], [2350, 700]], speed: 40 },
  { id: 'w4', name: 'La serveuse', kind: 'walker', x: 1600, y: 620, color: '#1b1b22', r: 44, path: [[1600, 620], [1600, 1010], [1520, 1010], [1520, 800]], bounce: true, speed: 34, tray: true },
  { id: 'w5', name: '', kind: 'walker', x: 400, y: 1590, color: '#5a4e6b', r: 44, path: [[400, 1590], [1900, 1590]], bounce: true, speed: 36 },
  { id: 'w6', name: '', kind: 'walker', x: 600, y: 210, color: '#4e4e4e', r: 44, path: [[600, 210], [2800, 210]], bounce: true, speed: 45 },
  { id: 'p6', name: '', kind: 'patron', x: 2080, y: 618, color: '#4e5a7a', r: 44, facing: 'up' },
  { id: 'p7', name: '', kind: 'patron', x: 2215, y: 618, color: '#6b4e3a', r: 44, facing: 'up' },
  { id: 'p8', name: '', kind: 'patron', x: 2480, y: 992, color: '#3a5a6b', r: 44, facing: 'up' },
  { id: 'p9', name: '', kind: 'patron', x: 1440, y: 1032, color: '#5c4e7a', r: 44, facing: 'down' },
  { id: 'p10', name: '', kind: 'patron', x: 1680, y: 1032, color: '#7a5c4e', r: 44, facing: 'down' },
  { id: 'p11', name: '', kind: 'patron', x: 822, y: 1600, color: '#4e7a6b', r: 44, facing: 'up' },
  // people who appear as the night goes on (js/events.js) — hidden until their event fires
  { id: 'gagnante', name: 'La gagnante', kind: 'patron', x: 914, y: 712, color: '#e0b04a', r: 60, facing: 'up', hidden: true, pool: 'jackpot', say: ["Douze mille ! Douze mille ! Vous avez vu ? Ça fait deux ans que je viens tous les soirs. Deux ans ! — Deux ans à cinquante euros par soir, ça fait trente-six mille."] },
  { id: 'hotesse2', name: 'Une hôtesse', kind: 'staff', x: 914, y: 772, color: '#AD1457', r: 56, facing: 'up', hidden: true, say: ["Souriez pour la photo, madame ! Elle sera affichée dans le hall dès demain. — La photo restera dans le hall. Le chèque repartira dans les machines : c'est ce que font neuf jackpots sur dix."] },
  { id: 'expulse', name: '', kind: 'walker', x: 2300, y: 700, color: '#8d6e63', r: 0, hidden: true, once: true, path: [[2300, 700], [1900, 540], [1600, 540], [1520, 400], [1520, 200]], speed: 70 },
  { id: 'pleure', name: '', kind: 'person', x: 1722, y: 672, color: '#7986cb', r: 56, facing: 'down', hidden: true, say: ["…Non, ça va. Ça va. Il me refuse. Le distributeur me refuse, et il faut que je récupère au moins le loyer. — Le loyer est dans la caisse depuis 22 h. Il n'y a pas de bouton pour le récupérer.", "Laissez-moi. — Elle retourne devant l'écran. Le distributeur affiche encore « opération refusée »."] },
  { id: 'q15', name: '', kind: 'patron', x: 2460, y: 640, color: '#4e5a7a', r: 44, facing: 'up', standing: true, hidden: true, pool: 'hot' },
  { id: 'q16', name: '', kind: 'patron', x: 2330, y: 560, color: '#7a5a4e', r: 44, facing: 'right', standing: true, hidden: true, pool: 'hot' },
  { id: 'q17', name: '', kind: 'patron', x: 2640, y: 560, color: '#5a4e7a', r: 44, facing: 'left', standing: true, hidden: true, pool: 'hot' },
  { id: 'menage', name: 'La femme de ménage', kind: 'walker', x: 705, y: 440, color: '#546e7a', r: 50, hidden: true, path: [[705, 440], [705, 1300]], bounce: true, speed: 16, say: ["L'heure ? Je n'ai pas le droit de vous la dire. C'est dans le règlement, sérieusement. — Le règlement est écrit pour que tu restes.", "Je passe à 2 h et à 5 h. Les mêmes personnes sont assises aux mêmes machines. Elles ne me voient pas. — Tu ne l'avais pas vue non plus."] },
  { id: 'karim', name: 'Karim', kind: 'person', x: 2720, y: 1470, color: '#ff8a65', r: 66, facing: 'down', hidden: true },
  { id: 'karim2', name: 'Karim', kind: 'person', x: 380, y: 230, color: '#ff8a65', r: 66, facing: 'left', hidden: true, say: ["… — Il ne dit rien. Il regarde ses chaussures. Le bus arrive dans dix minutes."] },
  // east wing
  { id: 'maitre', name: "Le maître d'hôtel", kind: 'staff', x: 3220, y: 448, color: '#37474f', r: 60, facing: 'down', behind: true },
  { id: 'r1', name: '', kind: 'patron', x: 3118, y: 636, color: '#6d5c7a', r: 44, facing: 'up', pool: 'restaurant' },
  { id: 'r2', name: '', kind: 'patron', x: 3478, y: 636, color: '#4e6b5a', r: 44, facing: 'up', pool: 'restaurant' },
  { id: 'r3', name: '', kind: 'patron', x: 3298, y: 520, color: '#7a6a4e', r: 44, facing: 'down', pool: 'restaurant' },
  { id: 'chanteuse', name: 'La chanteuse', kind: 'person', x: 3304, y: 1230, color: '#c2185b', r: 0, facing: 'up', hidden: true },
  { id: 'spec1', name: '', kind: 'patron', x: 3160, y: 1080, color: '#5a5a7a', r: 44, facing: 'down', hidden: true, pool: 'scene' },
  { id: 'spec2', name: '', kind: 'patron', x: 3300, y: 1080, color: '#7a4e5c', r: 44, facing: 'down', hidden: true, pool: 'scene' },
  { id: 'spec3', name: '', kind: 'patron', x: 3440, y: 1160, color: '#4e5a6b', r: 44, facing: 'down', hidden: true, pool: 'scene' },
  { id: 'fumeur', name: '', kind: 'person', x: 3760, y: 620, color: '#455a64', r: 56, facing: 'left', say: ["On sort fumer, on voit le ciel, on se dit « déjà ? ». Et on retourne. — C'est la seule fenêtre du bâtiment. Elle donne sur la seule chose qu'ils ne peuvent pas éteindre.", "Ma femme croit que je finis à minuit. Il est quelle heure, à ton avis ? — Regarde le ciel. Lui ne ment pas."] },
  { id: 'preteur', name: 'Le prêteur', kind: 'staff', x: 3705, y: 462, color: '#5d4037', r: 0, facing: 'up', behind: true },
  // new witnesses (js/content.js)
  { id: 'parieur', name: 'Un parieur', kind: 'person', x: 1768, y: 926, witness: 'parieur', color: '#42a5f5', r: 64, facing: 'up' },
  { id: 'anna', name: 'Anna Dostoïevskaïa', kind: 'ghost', x: 1448, y: 926, witness: 'anna', r: 70, facing: 'up' },
  { id: 'main', name: 'Un croupier en pause', kind: 'person', x: 1900, y: 1740, witness: 'main', color: '#212121', r: 64, facing: 'left' },
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
SLOTS.forEach(s => { const seat = slotSeat(s); LIGHTS.push({ x: (s.x + s.w / 2 + seat.x) / 2, y: (s.y + s.h / 2 + seat.y) / 2, r: s.special ? 150 : 95, color: `hsl(${s.hue} 90% 65%)`, a: s.special ? 0.9 : 0.55, glow: s.special ? 0.16 : 0.07, slot: true }); });
// aisle lights for the 3D machine hall
[[450, 540], [900, 540], [450, 760], [900, 760], [450, 980], [900, 980], [450, 1210], [900, 1210]].forEach(([x, y]) => LIGHTS.push({ x, y, r: 260, color: '#ff9ac8', a: 0.5, aisle: true }));
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
// east wing
[[3160, 520], [3440, 520], [3300, 760]].forEach(([x, y]) => LIGHTS.push({ x, y, r: 260, color: '#ffd9a0', a: 0.9, glow: 0.06 }));
LIGHTS.push({ x: 3220, y: 400, r: 200, color: '#fff1d0', a: 0.8 });
[[3160, 1200], [3440, 1200]].forEach(([x, y]) => LIGHTS.push({ x, y, r: 260, color: '#ff6b9d', a: 0.9, glow: 0.12 }));
LIGHTS.push({ x: 3304, y: 1000, r: 220, color: '#7fb0ff', a: 0.4 });
LIGHTS.push({ x: 3700, y: 660, r: 220, color: '#c8d8ff', a: 0.5, glow: 0.04 });
LIGHTS.push({ x: 3704, y: 460, r: 200, color: '#dfe9ff', a: 0.45, glow: 0.04 });

export function roomAt(x, y) {
  for (const r of ROOMS) if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return r;
  return null;
}

export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export const PLAYER_START = { x: 1100, y: 190 };
