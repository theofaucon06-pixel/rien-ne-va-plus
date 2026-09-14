// Game loop, input, interactions and story flow.
import { WORLD, ROOMS, WALLS, SLOTS, OBJECTS, NPCS, roomAt, rectsOverlap, PLAYER_START } from './world.js';
import { Renderer } from './render.js';
import { ui } from './ui.js';
import { audio } from './audio.js';
import { Games } from './games.js';
import { REVELATIONS, WITNESSES, STAFF, STORY, fmt, fmtSigned, fmtChips } from './content.js';

const canvas = document.getElementById('game');
const renderer = new Renderer(canvas);

const ROOM_HINTS = {
  street: 'Vendredi, 21 h. Ton ami est en retard.',
  hall: 'Tout se joue en jetons. La caisse est à gauche.',
  machines: 'Aucune horloge. Aucune fenêtre.',
  tables: 'Faites vos jeux.',
  bar: 'Le premier verre est offert.',
  toilettes: 'Du réseau, enfin.',
  labyrinth: 'Restaurant → · Spectacle → · Sortie : ?',
  vip: 'On vous attendait.',
  bureau: "Tu n'es pas censé être ici.",
  ruelle: "L'air est froid.",
  corridor: '', hallway: ''
};

function freshState() {
  return {
    player: { x: PLAYER_START.x, y: PLAYER_START.y, facing: 'right', moving: false, walk: 0, kind: 'player' },
    npcs: NPCS.map(n => ({ ...n, showName: false })),
    money: 500, chips: 0, bank: 0, debt: 0,
    timeMin: 21 * 60, drunkUntil: 0,
    flags: { entered: false, exited: false, chipsMode: false, card: false, vipOpen: false, vipInvited: false, suite: false, board: false, vigile: false, phoneSeen: false },
    revealed: new Set(), witnesses: new Set(), visited: new Set(), roomSeen: new Set(),
    stats: { spins: 0, rounds: 0, wagered: 0, returned: 0, net: 0, celebrations: 0, trueWins: 0, drinks: 0, theo: 0 },
    dynamicWalls: [], zone: false, activeSlot: null, roulette: null, phone: null, room: null, started: false
  };
}
let state = freshState();
const games = new Games(state, { reveal, hud: () => ui.updateHUD(state), addTime });
ui.init(state);

// --------------------------------------------------------------------- input
const keys = new Set();
const MOVE = { up: ['ArrowUp', 'w', 'W', 'z', 'Z'], down: ['ArrowDown', 's', 'S'], left: ['ArrowLeft', 'a', 'A', 'q', 'Q'], right: ['ArrowRight', 'd', 'D'] };
window.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey) return;
  if (ui.isOpen()) {
    if (ui.top() === 'panel' && e.key === ' ') { const b = document.querySelector('#panel .p-body'); if (b && b._spin) { e.preventDefault(); b._spin(); return; } }
    if (ui.top() === 'panel' && (e.key === 'c' || e.key === 'C')) return;
    const used = ui.handleKey(e);
    if (used) e.preventDefault();
    return;
  }
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
  if (e.key === 'c' || e.key === 'C') { ui.toggleCodex(); return; }
  if (['e', 'E', 'Enter', ' '].includes(e.key)) { interact(); return; }
  keys.add(e.key);
});
window.addEventListener('keyup', (e) => keys.delete(e.key));
window.addEventListener('blur', () => keys.clear());
const down = (dir) => MOVE[dir].some(k => keys.has(k));

// touch / on-screen controls
const pad = document.getElementById('pad');
if (pad) {
  pad.querySelectorAll('[data-k]').forEach(b => {
    const k = b.dataset.k;
    const on = (e) => { e.preventDefault(); if (k === 'E') interact(); else keys.add(k); };
    const off = (e) => { e.preventDefault(); keys.delete(k); };
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
  });
}

// --------------------------------------------------------------------- helpers
function addTime(min) { if (state.flags.entered && !state.flags.exited) state.timeMin += min; }
async function reveal(id, stats) {
  if (state.revealed.has(id)) return;
  state.revealed.add(id);
  const rev = REVELATIONS.find(r => r.id === id);
  await ui.reveal(rev, stats);
  ui.updateHUD(state);
  save();
}
function solids() {
  const list = WALLS.concat(state.dynamicWalls);
  return list;
}
function solidObjects() {
  const arr = [];
  for (const o of OBJECTS) { if (!o.solid) continue; if (o.type === 'vipdoor' && state.flags.vipOpen) continue; arr.push(o); }
  for (const s of SLOTS) arr.push({ x: s.x, y: s.y + 8, w: s.w, h: s.h + 10 });
  return arr;
}
function collides(box) {
  for (const w of solids()) if (rectsOverlap(box, w)) return true;
  for (const o of solidObjects()) if (rectsOverlap(box, o)) return true;
  return false;
}
function playerBox(x, y) { return { x: x - 9, y: y - 2, w: 18, h: 12 }; }

// --------------------------------------------------------------------- interaction targets
function nearestTarget() {
  const p = state.player; let best = null, bd = 1e9;
  const consider = (t, cx, cy, r) => { const d = Math.hypot(p.x - cx, p.y - cy); if (d < r && d < bd) { bd = d; best = t; } };
  for (const o of OBJECTS) {
    if (!o.label) continue;
    if (o.type === 'vipdoor' && state.flags.vipOpen) continue;
    const cx = Math.max(o.x, Math.min(p.x, o.x + o.w)), cy = Math.max(o.y, Math.min(p.y, o.y + o.h));
    consider({ kind: 'object', o }, cx, cy, o.r || 60);
  }
  for (const s of SLOTS) if (s.special) consider({ kind: 'slot', s }, s.x + s.w / 2, s.y + s.h + 10, 56);
  for (const n of state.npcs) { if (n.hidden || !n.r) continue; consider({ kind: 'npc', n }, n.x, n.y, n.r); }
  return best;
}
function targetLabel(t) {
  if (!t) return null;
  if (t.kind === 'slot') return `Jouer — ${t.s.label}`;
  if (t.kind === 'npc') return `Parler — ${t.n.name}`;
  const o = t.o;
  const verbs = { caisse: 'Changer — ', fidelite: '', atm: 'Retirer — ', roulette: 'Jouer — ', baccarat: 'Jouer — ', phone: '', exitdoor: 'Ouvrir — ', staffdoor: 'Entrer — ', theo: 'Lire — ', board: 'Lire — ', poster: 'Lire — ', plaque: 'Lire — ', busstop: '', clock: 'Regarder — ', entrance: '' };
  return (verbs[o.type] ?? '') + o.label;
}

// --------------------------------------------------------------------- dialogues
const say = (lines, who, opts = {}) => ui.dialog.run(lines, { speaker: who, ...opts });
const narr = (lines) => ui.dialog.run(lines, { speaker: '', initial: '·', color: '#c6a14f' });

async function talkWitness(n) {
  const w = WITNESSES.find(w => w.id === n.witness);
  const first = !state.witnesses.has(w.id);
  await ui.dialog.run(w.lines, { speaker: w.name, color: w.color, ghost: n.kind === 'ghost', initial: w.name[0] });
  if (first) {
    state.witnesses.add(w.id);
    await ui.witnessCard(w);
    save();
  }
  if (w.id === 'nour' && !state.revealed.has('sortie')) {
    await reveal('sortie', { time: ui.fmtTime(state.timeMin), net: state.stats.net, debt: state.debt + Math.max(0, -state.bank) });
  }
}

async function interact() {
  const t = nearestTarget();
  if (!t) return;
  audio.ensure(); audio.resume();
  if (t.kind === 'slot') { games.openSlot(t.s.kind); return; }
  if (t.kind === 'npc') return interactNPC(t.n);
  return interactObject(t.o);
}

async function interactNPC(n) {
  if (n.witness) return talkWitness(n);
  switch (n.id) {
    case 'vigile': {
      if (!state.flags.vigile) { state.flags.vigile = true; await say(STAFF.vigile.intro, STAFF.vigile.name, { color: '#9fa8da' }); }
      else await say(STAFF.vigile.again, STAFF.vigile.name, { color: '#9fa8da' });
      break;
    }
    case 'hote': {
      await say([
        "Bienvenue au salon. Vincent, votre hôte. Tout ce que vous voyez ici est offert.",
        { text: "La suite est prête si vous voulez souffler. Et si la soirée tourne mal, la maison fait crédit : 500 jetons, sans formalité. Vous réglerez plus tard.", choices: [
          { label: 'Accepter le crédit (500 jetons)', run: async () => { state.debt += 500; state.chips += 500; state.flags.chipsMode = true; audio.coin(); ui.updateHUD(state); ui.toast('500 jetons avancés. Dette : ' + fmt(state.debt)); await reveal('tapis', { theo: state.stats.theo, credit: true }); } },
          { label: 'Prendre la suite, se reposer', run: async () => { state.flags.suite = true; addTime(120); ui.flash('rgba(0,0,0,0.9)'); ui.toast('Tu dors deux heures. Personne ne t\'a réveillé.', 4000); } },
          { label: 'Voir mon profil', run: () => games.openTheo() },
          { label: 'Refuser poliment', run: () => {} }
        ] }
      ], 'Vincent, hôte VIP', { color: '#ef9a9a' });
      break;
    }
  }
}

async function interactObject(o) {
  switch (o.type) {
    case 'clock': await narr([`Il est ${ui.fmtTime(state.timeMin)}. Ton ami a dit « vers 21 h 30 ».`, 'C\'est la dernière horloge que tu verras ce soir.']); break;
    case 'entrance': await narr(state.flags.entered ? ['Le tourniquet est bloqué dans ce sens. La sortie est ailleurs.'] : ['Un tourniquet. Il tourne dans un seul sens.']); break;
    case 'busstop': {
      if (!state.flags.exited) { await narr(['Le prochain bus passe à 6 h 10. Ton ami finira bien par arriver.']); break; }
      await ui.dialog.run([{ text: 'Le bus arrive. Tu rentres ?', choices: [
        { label: 'Prendre le bus', run: async () => { if (!state.revealed.has('sortie')) await reveal('sortie', { time: ui.fmtTime(state.timeMin), net: state.stats.net, debt: state.debt + Math.max(0, -state.bank) }); endNight(); } },
        { label: 'Pas encore', run: () => {} }
      ] }], { speaker: '', initial: '·', color: '#c6a14f' });
      break;
    }
    case 'caisse': games.openCaisse(); break;
    case 'atm': games.openATM(); break;
    case 'fidelite': {
      if (state.flags.card) { await say(['Bonne soirée, membre Or. Vos points s\'accumulent à chaque mise.'], STAFF.hotesse.name, { color: '#f48fb1' }); break; }
      await say([
        'Une carte de fidélité ? C\'est gratuit. Vous cumulez des points à chaque mise, un verre offert au bar, et des surprises selon votre jeu.',
        { text: 'Il me faut juste un nom et une signature.', choices: [
          { label: 'Signer', run: () => { state.flags.card = true; audio.coin(); ui.toast('Carte Or activée. Chaque mise est maintenant enregistrée.', 4000); } },
          { label: 'Non merci', run: () => {} }
        ] }
      ], STAFF.hotesse.name, { color: '#f48fb1' });
      break;
    }
    case 'roulette': games.openRoulette(); break;
    case 'baccarat': games.openBaccarat(); break;
    case 'bj': await narr(['Table fermée. Le croupier fait une pause.', 'Il n\'y a pas d\'horloge pour dire depuis combien de temps.']); break;
    case 'plaque': await narr(['« Le 18 août 1913, à cette table, le noir est sorti vingt-six fois de suite. »', 'Quelqu\'un a gravé en dessous, plus petit : « et la salle a misé rouge pendant vingt tours ».']); break;
    case 'vipdoor': {
      if (state.flags.vipInvited) {
        await say(['Vous êtes attendu·e. Je vous en prie.'], 'Vincent, hôte VIP', { color: '#ef9a9a' });
        state.flags.vipOpen = true; audio.door();
      } else await say(['Réservé aux membres.', 'Continuez à jouer. On saura vous trouver.'], 'Un hôte', { color: '#ef9a9a' });
      break;
    }
    case 'barcounter': {
      const drunk = state.drunkUntil > state.timeMin;
      await say([
        drunk ? 'Un autre ? C\'est offert, comme le premier.' : 'C\'est offert. Ici, on ne fait pas payer les joueurs pour boire.',
        { text: 'Alors ?', choices: [
          { label: 'Accepter le verre', run: () => { state.stats.drinks++; state.drunkUntil = state.timeMin + 120; audio.drink(); addTime(15); ui.toast('Le compteur de tes pertes devient flou.', 3500); } },
          { label: 'Refuser', run: () => { ui.toast('« Comme vous voulez. Il restera là. »'); } }
        ] }
      ], STAFF.barman.name, { color: '#bcaaa4' });
      break;
    }
    case 'phone': { if (!state.flags.phoneSeen) { state.flags.phoneSeen = true; audio.vibrate(); } games.openPhone(); break; }
    case 'staffdoor': await narr(['« Personnel ». La porte n\'est pas fermée à clé.']); break;
    case 'exitdoor': {
      if (state.flags.exited) break;
      await ui.dialog.run(['Une porte grise, sans panneau. Derrière, de l\'air froid.', { text: 'Sortir ?', choices: [
        { label: 'Sortir', run: () => exitCasino() },
        { label: 'Pas encore', run: () => {} }
      ] }], { speaker: '', initial: '·', color: '#c6a14f' });
      break;
    }
    case 'theo': games.openTheo(); break;
    case 'board': games.openBoard(); break;
    case 'poster': await narr(['Joueurs Info Service — 09 74 75 13 13. Tous les jours, 8 h – 2 h.', 'Quelqu\'un a ajouté au marqueur : « ça marche ».']); break;
  }
}

async function exitCasino() {
  state.flags.exited = true;
  audio.door();
  state.player.x = 120; state.player.y = 1880; state.player.facing = 'up';
  renderer.updateCamera(state.player, 0, true);
  state.npcs.find(n => n.id === 'nour').hidden = false;
  audio.setRoom('ruelle', true);
  ui.updateHUD(state);
  const net = state.stats.net;
  const cashed = state.chips;
  if (cashed > 0) { state.money += cashed; state.chips = 0; }
  state.flags.chipsMode = false;
  ui.updateHUD(state);
  await ui.storyCards([
    'L\'air est froid.',
    `Il est <b>${ui.fmtTime(state.timeMin)}</b>.`,
    'Tu es entré à 21 h 00.',
    cashed > 0 ? `La caisse de sortie te rend tes jetons : <b>${fmt(cashed)}</b>.` : 'Il ne te reste aucun jeton à rendre.',
    `Bilan de la nuit : <b>${fmtSigned(net)}</b>${state.debt + Math.max(0, -state.bank) > 0 ? `, et <b>${fmt(state.debt + Math.max(0, -state.bank))}</b> de dette` : ''}.`,
    'Ton ami n\'est jamais venu.',
    'La ruelle remonte vers l\'arrêt de bus.'
  ]);
  save();
}

function endNight() {
  save();
  ui.epilogue(state, () => { localStorage.removeItem('rnvp-save'); location.reload(); });
}

// --------------------------------------------------------------------- rooms
function enterRoom(r) {
  const prev = state.room; state.room = r ? r.id : null;
  if (!r) return;
  ui.setRoom(r.label);
  audio.setRoom(r.id, !!r.outdoor);
  state.roomSeen.add(r.id);
  if (r.id === 'hall' && !state.flags.entered) {
    state.flags.entered = true;
    state.dynamicWalls.push({ x: 1480, y: 320, w: 80, h: 24 });
    audio.door();
    setTimeout(() => ui.toast('Le tourniquet se bloque derrière toi. Sens unique.', 4000), 600);
  }
  if (!state.visited.has(r.id) && r.label) {
    state.visited.add(r.id);
    ui.banner(r.label, ROOM_HINTS[r.id]);
  }
}

// --------------------------------------------------------------------- loop
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const p = state.player;
  const open = ui.isOpen();
  let dx = 0, dy = 0;
  if (!open) {
    if (down('up')) dy -= 1; if (down('down')) dy += 1; if (down('left')) dx -= 1; if (down('right')) dx += 1;
  }
  const drunk = state.drunkUntil > state.timeMin;
  document.body.classList.toggle('drunk', drunk && !state.flags.exited);
  if (dx || dy) {
    const len = Math.hypot(dx, dy); dx /= len; dy /= len;
    const run = keys.has('Shift');
    let sp = (run ? 330 : 215) * (drunk ? 0.85 : 1);
    if (drunk) { const w = Math.sin(now / 300) * 0.35; const ndx = dx * Math.cos(w) - dy * Math.sin(w); const ndy = dx * Math.sin(w) + dy * Math.cos(w); dx = ndx; dy = ndy; }
    const nx = p.x + dx * sp * dt, ny = p.y + dy * sp * dt;
    if (!collides(playerBox(nx, p.y))) p.x = nx;
    if (!collides(playerBox(p.x, ny))) p.y = ny;
    p.moving = true; p.walk += dt;
    p.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  } else p.moving = false;
  p.x = Math.max(4, Math.min(WORLD.w - 4, p.x)); p.y = Math.max(4, Math.min(WORLD.h - 4, p.y));

  // time flows inside
  if (state.flags.entered && !state.flags.exited && !open) state.timeMin += dt * (20 / 60);

  // room detection
  if (state.started) { const r = roomAt(p.x, p.y); if ((r && r.id) !== state.room) enterRoom(r); }

  // VIP invitation
  if (!state.flags.vipInvited && ((state.flags.card && state.stats.wagered >= 150) || state.stats.wagered >= 400)) {
    state.flags.vipInvited = true;
    ui.toast('Un hôte vous cherche : « Le salon VIP vous attend. Par la salle des tables, au fond. »', 6000);
  }

  // prompt & name labels
  const t = open ? null : nearestTarget();
  ui.setPrompt(targetLabel(t));
  for (const n of state.npcs) n.showName = !!(t && t.kind === 'npc' && t.n === n) || (Math.hypot(n.x - p.x, n.y - p.y) < 110 && n.kind === 'ghost');

  state.zone = document.body.classList.contains('zone');
  renderer.updateCamera(p, dt);
  renderer.draw(state, dt);
  hudTick += dt; if (hudTick > 0.25) { hudTick = 0; ui.updateHUD(state); }
  requestAnimationFrame(frame);
window.__game = { state, tp: (x, y) => { state.player.x = x; state.player.y = y; renderer.updateCamera(state.player, 0, true); }, ui, games, interact };
}
let hudTick = 0;

// --------------------------------------------------------------------- save
function save() {
  try {
    const s = state;
    const data = { player: { x: s.player.x, y: s.player.y }, money: s.money, chips: s.chips, bank: s.bank, debt: s.debt, timeMin: s.timeMin, drunkUntil: s.drunkUntil, flags: s.flags, revealed: [...s.revealed], witnesses: [...s.witnesses], visited: [...s.visited], roomSeen: [...s.roomSeen], stats: s.stats, dynamicWalls: s.dynamicWalls, roulette: s.roulette, phone: s.phone };
    localStorage.setItem('rnvp-save', JSON.stringify(data));
  } catch (e) { }
}
function load() {
  try {
    const d = JSON.parse(localStorage.getItem('rnvp-save')); if (!d) return false;
    state.player.x = d.player.x; state.player.y = d.player.y;
    Object.assign(state, { money: d.money, chips: d.chips, bank: d.bank, debt: d.debt, timeMin: d.timeMin, drunkUntil: d.drunkUntil, stats: d.stats, dynamicWalls: d.dynamicWalls || [], roulette: d.roulette, phone: d.phone });
    state.flags = { ...state.flags, ...d.flags }; state.revealed = new Set(d.revealed); state.witnesses = new Set(d.witnesses); state.visited = new Set(d.visited); state.roomSeen = new Set(d.roomSeen || d.visited);
    if (state.flags.exited) state.npcs.find(n => n.id === 'nour').hidden = false;
    return true;
  } catch (e) { return false; }
}
setInterval(save, 15000);

// --------------------------------------------------------------------- boot
const hasSave = !!localStorage.getItem('rnvp-save');
const cont = document.getElementById('btn-continue');
if (hasSave && cont) { cont.hidden = false; cont.addEventListener('click', () => { if (!ui._introGo) return; load(); ui.updateHUD(state); ui._introGo(); }); }
ui.intro(async () => {
  ui.updateHUD(state);
  renderer.updateCamera(state.player, 0, true);
  if (!state.flags.entered && !state.visited.size) await ui.storyCards(STORY.intro);
  state.started = true;
  const r = roomAt(state.player.x, state.player.y); enterRoom(r);
});
requestAnimationFrame(frame);
window.__game = { state, tp: (x, y) => { state.player.x = x; state.player.y = y; renderer.updateCamera(state.player, 0, true); }, ui, games, interact };
