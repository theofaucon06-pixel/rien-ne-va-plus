// Scripted events: things that happen around the player as the night goes on. Each event fires once,
// is remembered in state.events, and can be re-applied after a reload (`restore`) so that people who
// appeared stay there. Time is the in-game clock (state.timeMin keeps counting past midnight: 24 h = 1440).
import { audio } from './audio.js';

const H = (h, m = 0) => h * 60 + m;
const npc = (s, id) => s.npcs.find(n => n.id === id);
const show = (s, id, on = true) => { const n = npc(s, id); if (n) n.hidden = !on; };

export const EVENTS = [
  {
    id: 'jackpot',
    when: (s) => s.room === 'machines' && (s.stats.spins >= 6 || s.timeMin >= H(21, 40)),
    run: async (s, api) => {
      audio.fanfare(true); setTimeout(() => audio.fanfare(true), 700);
      api.flash('rgba(255,220,120,0.55)');
      api.banner('JACKPOT · MACHINE 37', '12 480 € — Mégalignes');
      show(s, 'gagnante'); show(s, 'hotesse2');
      api.toast('Des applaudissements. Une hôtesse arrive avec un chèque en carton et un photographe.', 5000);
      setTimeout(() => api.toast('Un gagnant visible. Les deux cents perdants de la même minute ne font pas de bruit.', 6000), 5200);
      s.flags.jackpot = true;
    },
    restore: (s) => { show(s, 'gagnante'); show(s, 'hotesse2'); s.flags.jackpot = true; }
  },
  {
    id: 'tirage1',
    when: (s) => s.timeMin >= H(22, 5),
    run: async (s, api) => { api.chime(); api.toast('Au micro, partout dans la salle : « Mesdames, messieurs, tirage au sort dans dix minutes. Restez dans la salle pour valider votre lot. »', 6500); }
  },
  {
    id: 'tirage2',
    when: (s) => s.timeMin >= H(22, 17) && s.events.has('tirage1'),
    run: async (s, api) => {
      api.chime(); api.toast('« Le numéro gagnant est le 4-4-1-8. » Ton numéro de client est le 4417.', 6000);
      setTimeout(() => api.toast('Le tirage ne coûte rien à la maison. Il t\'a coûté douze minutes de plus, et il y aura un autre tirage dans une heure.', 6500), 6200);
    }
  },
  {
    id: 'chaude',
    when: (s) => s.timeMin >= H(22, 30) && s.room === 'tables',
    run: async (s, api) => {
      audio.fanfare(false);
      show(s, 'q15'); show(s, 'q16'); show(s, 'q17');
      api.toast('La deuxième roulette s\'emballe : quelqu\'un vient de toucher un numéro plein. Une grappe de gens se forme autour de la table.', 6000);
      setTimeout(() => api.toast('Une table « chaude » n\'existe pas. Une table entourée, si : c\'est elle qui rapporte le plus.', 6000), 6200);
      s.flags.hotTable = true;
    },
    restore: (s) => { show(s, 'q15'); show(s, 'q16'); show(s, 'q17'); s.flags.hotTable = true; }
  },
  {
    id: 'expulsion',
    when: (s) => s.timeMin >= H(23, 0) && ['hall', 'tables', 'corridor'].includes(s.room),
    run: async (s, api) => {
      show(s, 'expulse'); audio.door();
      api.toast('Un homme crie qu\'il « reviendra demain, avec de quoi ». Deux vigiles le raccompagnent vers la sortie, sans un mot.', 6500);
      setTimeout(() => { show(s, 'expulse', false); }, 70000);
    }
  },
  {
    id: 'pleurs',
    when: (s) => s.timeMin >= H(23, 20) && s.room === 'hall',
    run: async (s, api) => {
      show(s, 'pleure');
      api.toast('Une femme pleure devant le distributeur. Personne ne s\'arrête. Le vigile regarde ailleurs.', 5500);
    },
    restore: (s) => show(s, 'pleure')
  },
  {
    id: 'karim',
    when: (s) => s.night !== 2 && s.timeMin >= H(24, 0) && s.flags.vipInvited && !s.flags.exited,
    run: async (s, api) => {
      show(s, 'karim');
      api.toast('Un hôte passe près de toi : « Votre ami vient d\'arriver. Il vous attend au salon, au fond de la salle des tables. »', 7000);
      s.flags.karimArrived = true;
    },
    restore: (s) => { show(s, 'karim'); s.flags.karimArrived = true; }
  },
  {
    id: 'deux_heures',
    when: (s) => s.timeMin >= H(26, 0),
    run: async (s, api) => {
      thinCrowd(s, 2);
      show(s, 'menage');
      api.toast('La salle s\'est vidée sans que tu le voies. Une femme passe l\'aspirateur entre les rangées. Personne ne lui demande l\'heure.', 7000);
      s.flags.late = true;
    },
    restore: (s) => { thinCrowd(s, 2); show(s, 'menage'); s.flags.late = true; }
  },
  {
    id: 'quatre_heures',
    when: (s) => s.timeMin >= H(28, 0),
    run: async (s, api) => {
      thinCrowd(s, 1);
      api.toast('Il ne reste que toi, une femme à la troisième machine de la rangée, et le bruit.', 7000);
      s.flags.veryLate = true;
    },
    restore: (s) => { thinCrowd(s, 1); s.flags.veryLate = true; }
  }
];

// hide most of the crowd: every 2nd person at 2 a.m., everyone but a few at 4 a.m.
function thinCrowd(s, keepEvery) {
  const keep = new Set(['mollie', 'wells', 'bookman', 'dosto', 'karas', 'uston', 'watanabe', 'kakavas', 'architecte', 'nour', 'sami', 'anna', 'parieur', 'main', 'karim', 'gagnante', 'menage', 'pleure', 'vigile', 'caissier', 'hotesse', 'croupier', 'croupier2', 'barman', 'hote', 'w4', 'w6', 'w1']);
  let i = 0;
  for (const n of s.npcs) {
    if (keep.has(n.id) || n.kind === 'staff' || n.kind === 'ghost' || n.witness) continue;
    if (n.hidden) continue;
    i++;
    if (keepEvery === 1 ? (n.id !== 'mp3' && n.id !== 'q13') : (i % keepEvery === 0)) n.hidden = true;
  }
}

/** Called every frame from the story tick. Fires at most one event, with a cooldown between two. */
export function runEvents(s, api, uiOpen) {
  if (!s.started || !s.flags.entered || s.flags.exited || uiOpen) return;
  const now = performance.now();
  if (s.eventCool && now < s.eventCool) return;
  for (const e of EVENTS) {
    if (s.events.has(e.id)) continue;
    if (!e.when(s)) continue;
    s.events.add(e.id);
    s.eventCool = now + 25000;
    e.run(s, api);
    return;
  }
}

/** After a reload: put back everyone who appeared during the events already fired. */
export function restoreEvents(s) {
  for (const e of EVENTS) if (s.events.has(e.id) && e.restore) e.restore(s);
}
