// Shared story logic (renderer-agnostic): state, interactions, rooms, time,
// reveals, exit sequence, save/load. Used by both the 2D and the 3D versions.
import { NPCS, roomAt, PLAYER_START } from './world.js';
import { ui } from './ui.js';
import { audio } from './audio.js';
import { Games } from './games.js';
import { REVELATIONS, WITNESSES, STAFF, STORY, PATRON_LINES, STAFF_LINES, NARRATIONS, fmt, fmtSigned } from './content.js';
import { runEvents, restoreEvents } from './events.js';

export const ROOM_HINTS = {
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
  restaurant: 'Buffet à volonté. Offert aux membres.',
  scene: 'Le spectacle commence à 23 h.',
  fumoir: 'La seule fenêtre du bâtiment : le ciel.',
  gages: "Achat d'or · prêt sur gage · ouvert toute la nuit",
  corridor: '', hallway: ''
};

export function freshState() {
  return {
    player: { x: PLAYER_START.x, y: PLAYER_START.y, facing: 'right', moving: false, walk: 0, kind: 'player' },
    npcs: NPCS.map(n => ({ ...n, showName: false })),
    money: 500, chips: 0, bank: 0, debt: 0, points: 0, rewards: [],
    timeMin: 21 * 60, drunkUntil: 0,
    flags: { entered: false, exited: false, chipsMode: false, card: false, vipOpen: false, vipInvited: false, suite: false, board: false, vigile: false, phoneSeen: false },
    revealed: new Set(), witnesses: new Set(), visited: new Set(), roomSeen: new Set(), events: new Set(),
    stats: { spins: 0, rounds: 0, wagered: 0, returned: 0, net: 0, celebrations: 0, trueWins: 0, drinks: 0, theo: 0 },
    dynamicWalls: [], zone: false, activeSlot: null, roulette: null, phone: null, room: null, started: false,
    night: 1, prev: null
  };
}

// ctx: { onTeleport(px, py, facing), onEntered(), onVipOpen(), onExited() } — renderer hooks
const REWARDS = [
  { at: 100, label: 'un verre offert au bar', apply: (state) => { state.flags.freeDrink = true; } },
  { at: 250, label: "l'invitation au salon VIP", apply: (state) => { state.flags.vipInvited = true; } },
  { at: 500, label: 'la suite offerte et une ligne de crédit', apply: (state) => { state.flags.suiteOffered = true; } },
  { at: 1000, label: 'le statut Platine', apply: (state) => { state.flags.platine = true; } }
];
const tier = (pts) => pts >= 1000 ? 'Platine' : pts >= 500 ? 'Or+' : 'Or';

export function createStory(ctx = {}) {
  const state = freshState();
  const games = new Games(state, { reveal, hud: () => ui.updateHUD(state), addTime });
  ui.init(state);

  function addTime(min) { if (state.flags.entered && !state.flags.exited) state.timeMin += min; }
  async function reveal(id, stats) {
    if (state.revealed.has(id)) return;
    state.revealed.add(id);
    const rev = REVELATIONS.find(r => r.id === id);
    await ui.reveal(rev, stats);
    ui.updateHUD(state);
    save();
  }

  const say = (lines, who, opts = {}) => ui.dialog.run(lines, { speaker: who, ...opts });
  const narr = (lines) => ui.dialog.run(lines, { speaker: '', initial: '·', color: '#c6a14f' });

  const visits = {};
  async function talkWitness(n) {
    const w = WITNESSES.find(w => w.id === n.witness);
    const first = !state.witnesses.has(w.id);
    const opts = { speaker: w.name, color: w.color, ghost: n.kind === 'ghost', initial: w.name[0] };
    if (first) {
      await ui.dialog.run(w.lines, opts);
      if (w.ask) {
        let picked = null;
        await ui.dialog.run([{ text: w.ask.q, choices: w.ask.choices.map(c => ({ label: c.label, run: () => { picked = c; } })).concat([{ label: 'Rien. Merci.', run: () => {} }]) }], opts);
        if (picked) await ui.dialog.run(picked.lines, opts);
      }
      state.witnesses.add(w.id); await ui.witnessCard(w); save();
    } else {
      const k = (visits[w.id] = (visits[w.id] || 0) + 1);
      const pool = w.more && w.more.length ? w.more : [w.lines.slice(-1)];
      await ui.dialog.run(pool[(k - 1) % pool.length], opts);
      if (w.ask && k % 2 === 0) {
        let picked = null;
        await ui.dialog.run([{ text: w.ask.q, choices: w.ask.choices.map(c => ({ label: c.label, run: () => { picked = c; } })).concat([{ label: 'Rien. Merci.', run: () => {} }]) }], opts);
        if (picked) await ui.dialog.run(picked.lines, opts);
      }
    }
    if (w.id === 'architecte' && !state.revealed.has('maison')) await reveal('maison', { time: ui.fmtTime(state.timeMin), drank: state.stats.drinks > 0 });
    if (w.id === 'nour' && !state.revealed.has('sortie')) {
      await reveal('sortie', { time: ui.fmtTime(state.timeMin), net: state.stats.net, debt: state.debt + Math.max(0, -state.bank) });
    }
  }
  const said = {};
  function pick(id, arr) { const k = (said[id] = (said[id] || 0) + 1); return arr[(k - 1 + Math.floor(id.length * 7)) % arr.length]; }
  async function talkLines(n, lines) {
    // scripted lines "what they say — what is true", one pair per visit
    const line = pick(n.id, lines);
    const [a, b] = line.split(' — ');
    const who = n.name || 'Quelqu\'un';
    await ui.dialog.run([a], { speaker: who, color: n.color || '#9e9e9e', initial: who[0] });
    if (b) await ui.dialog.run([b], { speaker: '', initial: '·', color: '#c6a14f' });
  }
  async function talkPatron(n) {
    const r = roomAt(n.x, n.y);
    let pool = PATRON_LINES[n.pool] || PATRON_LINES[r ? r.id : 'default'] || PATRON_LINES.default;
    if (!n.pool && r && r.id === 'machines' && state.flags.jackpot && Math.random() < 0.5) pool = PATRON_LINES.jackpot;
    const line = pick(n.id, pool);
    const [a, b] = line.split(' — ');
    const who = n.name || (n.kind === 'walker' ? 'Un passant' : 'Un joueur');
    await ui.dialog.run([a], { speaker: who, color: n.color || '#9e9e9e', initial: who[0] });
    if (b) await ui.dialog.run([b], { speaker: '', initial: '·', color: '#c6a14f' });
  }

  // target: { kind: 'slot', s } | { kind: 'npc', n } | { kind: 'object', o }
  async function interact(t) {
    if (!t) return;
    audio.ensure(); audio.resume();
    if (t.kind === 'slot') { games.openSlot(t.s.kind, t.s.label); return; }
    if (t.kind === 'npc') return interactNPC(t.n);
    return interactObject(t.o);
  }
  function targetLabel(t) {
    if (!t) return null;
    if (t.kind === 'slot') return `Jouer — ${t.s.label}`;
    if (t.kind === 'npc') return `Parler — ${t.n.name}`;
    const o = t.o;
    const verbs = { buffet: '', stage: '', sky: 'Regarder — ', narr: 'Regarder — ', caisse: 'Changer — ', cage: 'Changer — ', fidelite: '', atm: 'Retirer — ', roulette: 'Jouer — ', baccarat: 'Jouer — ', blackjack: 'Jouer — ', wheel: 'Jouer — ', poker: 'Regarder — ', craps: 'Jouer — ', phone: '', exitdoor: 'Ouvrir — ', staffdoor: 'Entrer — ', theo: 'Lire — ', board: 'Lire — ', poster: 'Lire — ', plaque: 'Lire — ', busstop: '', clock: 'Regarder — ', entrance: '' };
    return (verbs[o.type] ?? '') + o.label;
  }

  async function interactNPC(n) {
    if (n.witness) return talkWitness(n);
    if (n.id === 'karim') return talkKarim();
    if (n.say) return talkLines(n, n.say);
    if (n.kind === 'patron' || n.kind === 'walker') return talkPatron(n);
    switch (n.id) {
      case 'vigile': {
        if (state.night === 2 && !state.flags.vigile) { state.flags.vigile = true; await say(["Bon retour parmi nous. On vous attendait : l'hôtesse a votre carte.", state.flags.karimMet ? "Votre ami ? Il est passé mardi. Pas pour jouer : pour déposer un papier. Il ne reviendra pas avant trois ans." : "Votre ami ? Pas vu cette semaine."], STAFF.vigile.name, { color: '#9fa8da' }); break; }
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
      case 'caissier': { await say([pick('caissier', STAFF_LINES.caissier)], STAFF.caissier.name, { color: '#bcaaa4' }); games.openCaisse(); break; }
      case 'hotesse': return interactObject({ type: 'fidelite' });
      case 'maitre': return interactObject({ type: 'buffet' });
      case 'preteur': return interactObject({ type: 'desk', id: 'gagesdesk' });
      case 'barman': return interactObject({ type: 'barcounter' });
      case 'croupier': case 'croupier2': {
        const open = n.id === 'croupier' ? () => games.openRoulette() : () => games.openBaccarat();
        await ui.dialog.run([pick(n.id, STAFF_LINES[n.id]), { text: n.id === 'croupier' ? 'Vous prenez place ?' : 'Une main ?', choices: [{ label: 'Jouer', run: open }, { label: 'Plus tard', run: () => {} }] }], { speaker: n.name, color: '#e0e0e0', initial: 'C' });
        break;
      }
    }
  }

  // the friend who was "late": he was upstairs all along
  async function talkKarim() {
    const K = { speaker: 'Karim', color: '#ff8a65', initial: 'K' };
    if (state.flags.karimTalked) {
      if (state.flags.karimOut) await ui.dialog.run(['Encore une main. Encore une. Je te rejoins dehors, promis.'], K);
      else if (state.flags.lent) await ui.dialog.run(['Je me refais, t\'inquiète. Lundi, je te rends tout. Lundi.'], K);
      else await ui.dialog.run(['Vincent m\'a arrangé. Ça va aller. Va jouer, profite.'], K);
      return;
    }
    state.flags.karimTalked = true;
    await ui.dialog.run([
      'T\'es là ! Désolé, désolé. J\'étais… en fait j\'étais là depuis 22 h. Ici, en haut. Ils m\'avaient invité. Un hôte m\'a appelé mardi, il connaissait mon prénom.',
      'Écoute. Je suis à sec. Complètement. Ils m\'ont fait crédit deux fois ce soir. Je suis à moins mille deux cents.',
      { text: 'Tu peux me prêter deux cents ? Je te les rends lundi. Promis. Lundi.', choices: [
        { label: state.chips >= 200 ? 'Prêter 200 jetons' : 'Prêter 200 jetons (tu ne les as pas)', run: async () => {
          if (state.chips < 200) { await ui.dialog.run(['T\'as plus rien non plus ? Ah. Ah, ok.', 'On est deux, alors.'], K); return; }
          state.chips -= 200; state.flags.lent = true; ui.updateHUD(state);
          await ui.dialog.run(['T\'es un frère. Je me refais et je te rends tout. Va boire un verre, c\'est offert.'], K);
          await narr(['Tu viens de faire exactement ce que le casino fait depuis 21 h : avancer de l\'argent à quelqu\'un qui ne peut plus s\'arrêter.']);
        } },
        { label: 'Refuser', run: async () => { state.flags.refused = true; await ui.dialog.run(['Ok. Ok. C\'est pas grave. Je vais voir Vincent, il comprend, lui.'], K); await narr(['Il retourne vers l\'hôte. L\'hôte lui sourit.']); } },
        { label: 'Lui dire de sortir avec toi', run: async () => { state.flags.karimOut = true; await ui.dialog.run(['Sortir ? … Ouais. Ouais, peut-être. Encore une main et je te suis. Une seule.'], K); await narr(['Il ne te suivra pas tout de suite. Mais quelqu\'un lui a dit le mot « sortir » ce soir. Ça compte.']); } }
      ] }
    ], K);
    save();
  }

  async function interactObject(o) {
    switch (o.type) {
      case 'clock': await narr([`Il est ${ui.fmtTime(state.timeMin)}. Ton ami a dit « vers 21 h 30 ».`, 'C\'est la dernière horloge que tu verras ce soir.']); break;
      case 'entrance': await narr(state.flags.entered ? ['Le tourniquet grince. Dehors, la nuit continue sans toi.'] : ['Un tourniquet. Il grince un peu, mais il tourne.']); break;
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
        if (state.flags.card) {
          const pts = Math.floor(state.points || 0); const next = REWARDS.find(r => pts < r.at);
          await say([
            `Bonne soirée, membre ${tier(pts)}. Vous avez ${pts} point${pts > 1 ? 's' : ''} : un point par jeton misé, sur toutes les tables.`,
            next ? `Prochain palier à ${next.at} points : ${next.label}. ${REWARDS.filter(r => pts >= r.at).length ? 'Vos avantages déjà débloqués vous attendent.' : 'Continuez à jouer, ça vient vite.'}` : 'Vous avez tout débloqué. La maison vous appelle par votre prénom, maintenant.',
            { text: 'La boutique fidélité vous intéresse ? Nos cadeaux sont juste là.', choices: [
              { label: 'Voir la boutique', run: () => games.openShop() },
              { label: 'Plus tard', run: () => {} }
            ] }
          ], STAFF.hotesse.name, { color: '#f48fb1' });
          break;
        }
        await say([
          'Une carte de fidélité ? C\'est gratuit. Vous cumulez des points à chaque mise, un verre offert au bar, et des surprises selon votre jeu.',
          { text: 'Il me faut juste un nom et une signature.', choices: [
            { label: 'Signer', run: () => { state.flags.card = true; state.points = state.points || 0; audio.coin(); ui.updateHUD(state); ui.toast('Carte Or activée : 1 point par jeton misé. Un verre offert dès 100 points.', 4500); } },
            { label: 'Non merci', run: () => {} }
          ] }
        ], STAFF.hotesse.name, { color: '#f48fb1' });
        break;
      }
      case 'roulette': games.openRoulette(); break;
      case 'baccarat': games.openBaccarat(); break;
      case 'blackjack': games.openBlackjack(); break;
      case 'wheel': games.openWheel(); break;
      case 'cage': games.openCaisse(); break;
      case 'poker': games.openPokerWatch(); break;
      case 'craps': games.openCraps(); break;
      case 'plaque': await narr(['« Le 18 août 1913, à cette table, le noir est sorti vingt-six fois de suite. »', 'Quelqu\'un a gravé en dessous, plus petit : « et la salle a misé rouge pendant vingt tours ».']); break;
      case 'vipdoor': {
        if (state.flags.vipInvited) {
          await say(['Vous êtes attendu·e. Je vous en prie.'], 'Vincent, hôte VIP', { color: '#ef9a9a' });
          state.flags.vipOpen = true; audio.door(); ctx.onVipOpen && ctx.onVipOpen();
        } else await say(['Réservé aux membres.', 'Continuez à jouer. On saura vous trouver.'], 'Un hôte', { color: '#ef9a9a' });
        break;
      }
      case 'barcounter': {
        const drunk = state.drunkUntil > state.timeMin;
        await say([
          drunk ? 'Un autre ? C\'est offert, comme le premier.' : state.flags.freeDrink ? 'Votre carte Or vous offre un verre. Champagne ?' : 'C\'est offert. Ici, on ne fait pas payer les joueurs pour boire.',
          { text: 'Alors ?', choices: [
            { label: 'Accepter le verre', run: () => { state.stats.drinks++; state.drunkUntil = state.timeMin + 120; audio.drink(); addTime(15); ui.toast('Le compteur de tes pertes devient flou.', 3500); } },
            { label: 'Refuser', run: () => { ui.toast('« Comme vous voulez. Il restera là. »'); } }
          ] }
        ], STAFF.barman.name, { color: '#bcaaa4' });
        break;
      }
      case 'phone': { if (state.flags.phoneSold) { await narr(['Tu l\'as vendu. Quatre-vingts euros. Il est dans une vitrine, de l\'autre côté de la rue.']); break; } if (!state.flags.phoneSeen) { state.flags.phoneSeen = true; audio.vibrate(); } games.openPhone(); break; }
      case 'buffet': {
        if (state.flags.ate) { await say(['Encore faim ? Servez-vous. C\'est toujours offert.'], "Le maître d'hôtel", { color: '#b0bec5' }); break; }
        await say([
          state.flags.card ? 'Bonsoir. Le buffet est offert aux membres. Prenez votre temps, la salle des tables ne ferme pas.' : 'Bonsoir. Le buffet est réservé aux membres… mais ce soir, allez-y. On vous fera une carte au passage.',
          { text: 'Vous mangez ?', choices: [
            { label: 'Manger (45 minutes)', run: async () => { state.flags.ate = true; state.stats.drinks++; addTime(45); ui.flash('rgba(0,0,0,0.85)'); await narr(['Quarante-cinq minutes. Le repas était bon. L\'addition n\'est jamais venue.', 'Un repas offert vaut vingt euros pour le casino. Il t\'a gardé dans le bâtiment. La sortie du restaurant donne sur la salle des tables.']); if (!state.revealed.has('maison')) await reveal('maison', { time: ui.fmtTime(state.timeMin), drank: state.stats.drinks > 0 }); } },
            { label: 'Non merci', run: () => {} }
          ] }
        ], "Le maître d'hôtel", { color: '#b0bec5' });
        break;
      }
      case 'stage': {
        if (state.timeMin < 23 * 60) { await narr(['La scène est vide. Le spectacle commence à 23 h — « juste après », dit l\'affiche, quelle que soit l\'heure.', 'En attendant, la salle des tables est à deux portes.']); break; }
        if (state.flags.showSeen) { await narr(['La chanteuse reprend la même chanson. Les paroles parlent de chance.']); break; }
        await ui.dialog.run([{ text: 'Le spectacle a commencé. Tu t\'assieds ?', choices: [
          { label: 'S\'asseoir (une heure)', run: async () => { state.flags.showSeen = true; addTime(60); ui.flash('rgba(0,0,0,0.85)'); await narr(['Une heure de chansons sur la chance, le destin et les nuits qui ne finissent pas. Le bar de la salle a servi deux verres.', 'À la sortie, la salle des tables est sur le chemin. C\'est le chemin.']); } },
          { label: 'Rester debout, repartir', run: () => {} }
        ] }], { speaker: '', initial: '·', color: '#c6a14f' });
        break;
      }
      case 'sky': {
        const t = state.timeMin;
        if (t < 24 * 60 + 4 * 60 + 40) await narr(['Noir. Pas une étoile : les néons de la rue les effacent.', 'C\'est la seule fenêtre du bâtiment, et elle donne sur le ciel. Regarde-la de temps en temps.']);
        else if (t < 24 * 60 + 6 * 60 + 20) await narr(['Le ciel grisonne à l\'est. Il est bientôt cinq heures — ou six.', 'La seule horloge du casino est dehors. Personne ne la regarde.']);
        else await narr(['Le jour. Il fait jour.', 'Tu es entré hier.']);
        if (!state.revealed.has('maison')) await reveal('maison', { time: ui.fmtTime(state.timeMin), drank: state.stats.drinks > 0 });
        break;
      }
      case 'desk': {
        if (o.id !== 'gagesdesk') break;
        const P = { speaker: 'Le prêteur', color: '#bcaaa4', initial: 'P' };
        const items = [];
        if (!state.flags.soldWatch) items.push({ label: 'Vendre ta montre — 150 €', run: async () => { state.flags.soldWatch = true; state.money += 150; audio.coin(); ui.updateHUD(state); await ui.dialog.run(['Cent cinquante. Elle en vaut trois cents, mais il est tard.', 'Vous pourrez la racheter. Deux cents. Dans le mois.'], P); await narr(['Ta montre est dans la vitrine. Tu ne sauras plus l\'heure, mais ça, tu ne la savais déjà plus.']); } });
        if (!state.flags.phoneSold) items.push({ label: 'Vendre ton téléphone — 80 €', run: async () => { state.flags.phoneSold = true; state.money += 80; audio.coin(); ui.updateHUD(state); await ui.dialog.run(['Quatre-vingts. Il y a une appli de casino dessus ? Tout le monde en a une, ici.'], P); await narr(['Sans téléphone, plus de casino dans la poche. Le vrai est à vingt mètres.']); } });
        items.push({ label: 'Rien, juste regarder', run: async () => { await narr(['Des montres, des alliances, une console, une guitare. Chaque objet a été déposé par quelqu\'un qui allait « se refaire ».', 'Dostoïevski a mis en gage l\'alliance de sa femme. La boutique d\'en face existait déjà.']); } });
        await ui.dialog.run([state.flags.soldWatch || state.flags.phoneSold ? 'Re-bonsoir. Il vous reste quelque chose ?' : 'Bonsoir. Ouvert toute la nuit, comme en face. Or, montres, téléphones, tout ce qui se revend.', { text: 'Alors ?', choices: items }], P);
        break;
      }
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
      case 'narr': await narr(NARRATIONS[o.key] || ['…']); break;
    }
  }

  async function exitCasino() {
    state.flags.exited = true;
    audio.door();
    state.player.x = 120; state.player.y = 1880; state.player.facing = 'up';
    ctx.onTeleport && ctx.onTeleport(120, 1880, 'up');
    state.npcs.find(n => n.id === 'nour').hidden = false;
    audio.setRoom('ruelle', true);
    const net = state.stats.net;
    const cashed = state.chips;
    if (cashed > 0) { state.money += cashed; state.chips = 0; }
    state.flags.chipsMode = false;
    ui.updateHUD(state);
    ctx.onExited && ctx.onExited();
    await ui.storyCards([
      'L\'air est froid.',
      `Il est <b>${ui.fmtTime(state.timeMin)}</b>.`,
      'Tu es entré à 21 h 00.',
      cashed > 0 ? `La caisse de sortie te rend tes jetons : <b>${fmt(cashed)}</b>.` : 'Il ne te reste aucun jeton à rendre.',
      `Bilan de la nuit : <b>${fmtSigned(net)}</b>${state.debt + Math.max(0, -state.bank) > 0 ? `, et <b>${fmt(state.debt + Math.max(0, -state.bank))}</b> de dette` : ''}.`,
      state.flags.karimOut ? 'Karim t\'a suivi dix minutes plus tard. Il n\'a pas dit un mot jusqu\'à l\'arrêt de bus.' : state.flags.lent ? 'Karim est resté. Tes 200 jetons aussi.' : state.flags.refused ? 'Karim est resté. L\'hôte lui a trouvé une solution.' : state.flags.karimArrived ? 'Karim était là depuis 22 h, au salon. Tu ne l\'as pas vu.' : 'Ton ami n\'est jamais venu.',
      'La ruelle remonte vers l\'arrêt de bus.'
    ]);
    if (state.flags.karimOut) { const k = state.npcs.find(n => n.id === 'karim2'); if (k) k.hidden = false; }
    save();
  }

  function endNight() {
    save();
    ui.epilogue(state, () => { localStorage.removeItem('rnvp-save'); location.reload(); }, state.night === 1 ? nextNight : null);
  }

  // the week after: same casino, same person, one debt and one loyalty card heavier
  function nextNight() {
    const st = state.stats;
    const prev = { net: st.net, timeMin: state.timeMin, wagered: st.wagered, debt: state.debt + Math.max(0, -state.bank) };
    const keep = { points: state.points, rewards: state.rewards, bought: state.bought || [], revealed: [...state.revealed], witnesses: [...state.witnesses], flags: state.flags, matchSeed: null };
    const fresh = freshState();
    const data = {
      player: fresh.player, money: 500, chips: 0, bank: 0, debt: prev.debt, timeMin: 21 * 60, drunkUntil: 0,
      points: keep.points, rewards: keep.rewards, bought: keep.bought,
      flags: { ...fresh.flags, card: keep.flags.card, vipInvited: keep.flags.card || keep.flags.vipInvited, vipOpen: false, freeDrink: true, karimMet: !!keep.flags.karimTalked, karimOut: false, lent: false, refused: false, night2: true },
      revealed: keep.revealed, witnesses: keep.witnesses, visited: [], roomSeen: [], events: [], stats: { spins: 0, rounds: 0, wagered: 0, returned: 0, net: 0, celebrations: 0, trueWins: 0, drinks: 0, theo: 0 },
      dynamicWalls: [], roulette: null, phone: null, bets: null, matchSeed: null, matchGoals: null, night: 2, prev
    };
    try { localStorage.setItem('rnvp-save', JSON.stringify(data)); localStorage.setItem('rnvp-night2', '1'); } catch (e) { }
    location.reload();
  }

  function enterRoom(r) {
    state.room = r ? r.id : null;
    if (!r) return;
    ui.setRoom(r.label);
    audio.setRoom(r.id, !!r.outdoor);
    state.roomSeen.add(r.id);
    if (r.id === 'hall' && !state.flags.entered) {
      state.flags.entered = true;
      audio.door();
      ctx.onEntered && ctx.onEntered();
      if (state.night === 2) {
        setTimeout(async () => { ui.toast('L\'hôtesse te fait signe de la main. Elle a déjà sorti ta carte.', 4500); if (!state.revealed.has('retour')) await reveal('retour', { first: state.prev ? state.prev.net : 0 }); }, 900);
      } else setTimeout(() => ui.toast('Dernier coup d\'œil dehors : il est 21 h. Il n\'y a plus une seule horloge à partir d\'ici.', 4500), 600);
    }
    if (!state.visited.has(r.id) && r.label) {
      state.visited.add(r.id);
      ui.banner(r.label, ROOM_HINTS[r.id]);
    }
  }

  // per-frame bookkeeping shared by both renderers
  function tick(dt, uiOpen) {
    if (state.flags.entered && !state.flags.exited && !uiOpen) state.timeMin += dt * (20 / 60);
    if (state.started) { const r = roomAt(state.player.x, state.player.y); if ((r && r.id) !== state.room) enterRoom(r); }
    if (state.flags.card) {
      for (const r of REWARDS) if (state.points >= r.at && !state.rewards.includes(r.at)) {
        state.rewards.push(r.at); r.apply(state); audio.coin();
        ui.toast(`Carte Or · ${r.at} points : ${r.label}.${r.at === 250 ? ' Par la salle des tables, au fond.' : ''}`, 6000);
      }
    }
    if (!state.flags.vipInvited && state.stats.wagered >= 400) {
      state.flags.vipInvited = true;
      ui.toast('Un hôte vous cherche : « Le salon VIP vous attend. Par la salle des tables, au fond. »', 6000);
    }
    document.body.classList.toggle('drunk', state.drunkUntil > state.timeMin && !state.flags.exited);
    state.zone = document.body.classList.contains('zone');
    runEvents(state, eventApi, uiOpen);
  }
  const eventApi = { toast: (t, ms) => ui.toast(t, ms), banner: (t, sub) => ui.banner(t, sub), flash: (c) => ui.flash(c), chime: () => audio.chime(), narr, reveal };

  function save() {
    try {
      const s = state;
      const data = { player: { x: s.player.x, y: s.player.y }, money: s.money, chips: s.chips, bank: s.bank, debt: s.debt, timeMin: s.timeMin, drunkUntil: s.drunkUntil, points: s.points, rewards: s.rewards, flags: s.flags, revealed: [...s.revealed], witnesses: [...s.witnesses], visited: [...s.visited], roomSeen: [...s.roomSeen], events: [...s.events], stats: s.stats, bets: s.bets, matchSeed: s.matchSeed, matchGoals: s.matchGoals, bought: s.bought, night: s.night, prev: s.prev, dynamicWalls: s.dynamicWalls, roulette: s.roulette, phone: s.phone };
      localStorage.setItem('rnvp-save', JSON.stringify(data));
    } catch (e) { }
  }
  function load() {
    try {
      const d = JSON.parse(localStorage.getItem('rnvp-save')); if (!d) return false;
      state.player.x = d.player.x; state.player.y = d.player.y;
      Object.assign(state, { money: d.money, chips: d.chips, bank: d.bank, debt: d.debt, points: d.points || 0, rewards: d.rewards || [], timeMin: d.timeMin, drunkUntil: d.drunkUntil, stats: d.stats, dynamicWalls: d.dynamicWalls || [], roulette: d.roulette, phone: d.phone });
      state.flags = { ...state.flags, ...d.flags }; state.revealed = new Set(d.revealed); state.witnesses = new Set(d.witnesses); state.visited = new Set(d.visited); state.roomSeen = new Set(d.roomSeen || d.visited);
      state.events = new Set(d.events || []); restoreEvents(state);
      state.bets = d.bets || null; state.matchSeed = d.matchSeed || null; state.matchGoals = d.matchGoals || null; state.bought = d.bought || [];
      state.night = d.night || 1; state.prev = d.prev || null;
      if (state.flags.exited) { state.npcs.find(n => n.id === 'nour').hidden = false; if (state.flags.karimOut) state.npcs.find(n => n.id === 'karim2').hidden = false; }
      return true;
    } catch (e) { return false; }
  }
  setInterval(save, 15000);

  // boot: intro → optional story cards → start
  function boot(onStart) {
    const hasSave = !!localStorage.getItem('rnvp-save');
    const night2 = localStorage.getItem('rnvp-night2') === '1';
    const cont = document.getElementById('btn-continue');
    if (hasSave && cont) {
      cont.hidden = false; cont.textContent = night2 ? 'Revenir vendredi prochain' : 'Continuer la soirée';
      if (night2) { const st = document.getElementById('btn-start'); if (st) { st.textContent = 'Recommencer depuis le début'; st.classList.remove('primary'); } cont.classList.add('primary'); }
      cont.addEventListener('click', () => { if (!ui._introGo) return; load(); ui.updateHUD(state); ctx.onLoaded && ctx.onLoaded(); ui._introGo(); });
    }
    ui.intro(async () => {
      ui.updateHUD(state);
      if (night2 && state.night === 2) { localStorage.removeItem('rnvp-night2'); await ui.storyCards(STORY.intro2); }
      else if (!state.flags.entered && !state.visited.size) await ui.storyCards(STORY.intro);
      state.started = true;
      const r = roomAt(state.player.x, state.player.y); enterRoom(r);
      onStart && onStart();
    });
  }

  return { state, games, interact, targetLabel, reveal, addTime, enterRoom, tick, save, load, boot, exitCasino, endNight };
}
