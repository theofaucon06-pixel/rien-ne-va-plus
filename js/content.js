// All narrative content: revelations (the 10 mechanics), witnesses (the ghosts),
// and staff dialogues. French only, tutoiement, short sentences.

export const REVELATIONS = [
  {
    id: 'avantage', n: 1,
    title: 'La maison gagne toujours',
    sub: "L'avantage de la maison",
    hint: 'Joue quinze tours sur une machine, ou quelques coups à la roulette.',
    text: (s) => `Tu viens de faire ${s.spins} tours. Tu as misé ${fmt(s.wagered)} et la machine t'a rendu ${fmt(s.returned)}. Peut-être que ce soir tu es en avance. Ça ne change rien.

Chaque jeu est réglé avec un pourcentage pour la maison : 2,7 % à la roulette européenne, jusqu'à 15 % sur une machine à sous en France. Sur un tour, ce chiffre n'existe pas. Sur mille tours, il devient une loi.

Sur mille tours à cette mise, la machine te prend en moyenne ${fmt(s.projected)}. Sans tricher. Sans malchance. Juste la moyenne.`,
    keep: "L'avantage de la maison n'est pas une opinion. C'est une soustraction, répétée jusqu'à devenir certaine."
  },
  {
    id: 'memoire', n: 2,
    title: "La bille n'a pas de mémoire",
    sub: 'Le sophisme du joueur',
    hint: 'À la roulette, mise contre une série.',
    text: (s) => `Tu as misé ${s.betName} après ${s.streak} ${s.streakName} de suite. Tu as senti que « c'était dû ».

La bille ne sait pas ce qu'elle a fait il y a une minute. Au tour suivant, le rouge avait exactement 18 chances sur 37. Comme au premier tour. Comme toujours.

Le tableau des derniers numéros au-dessus de la table n'a aucune valeur. Il est là pour ça : nourrir ton intuition, et faire monter les mises. Le 18 août 1913, à Monte-Carlo, le noir est sorti vingt-six fois de suite. La salle a perdu des millions en misant rouge.`,
    keep: "Une série n'est pas un signal. C'est un souvenir. Et la bille n'en a aucun."
  },
  {
    id: 'zone', n: 3,
    title: 'La zone',
    sub: 'Le presque-gagné et le temps sur machine',
    hint: 'Reste longtemps sur une machine à sous.',
    text: (s) => `Trente tours sans lever les yeux. Tu n'as pas remarqué que la lumière a baissé, que le bouton Quitter a rétréci, que le son s'est éloigné.

Ce n'est pas toi. C'est la machine. Un tour toutes les trois secondes, un « presque » affiché plus souvent que le hasard ne le ferait, un siège confortable, jamais de pause : l'industrie appelle ça le temps sur machine, et c'est le seul chiffre qu'elle optimise.

Les joueurs que l'anthropologue Natasha Dow Schüll a suivis à Las Vegas ne jouaient pas pour gagner. Ils jouaient pour rester dans la zone. L'un d'eux disait qu'un gros gain le dérangeait : ça interrompait.`,
    keep: "La machine n'est pas réglée pour te faire perdre vite. Elle est réglée pour te faire rester."
  },
  {
    id: 'ldw', n: 4,
    title: 'Gagner en perdant',
    sub: 'Les pertes déguisées en gains',
    hint: 'Joue sur la machine Mégalignes.',
    text: (s) => `La machine a fait la fête ${s.celebrations} fois. Tu as vraiment gagné ${s.trueWins} fois. Ton solde sur cette machine : ${fmtSigned(s.net)}.

Vingt lignes à la fois. Une ligne « gagne » 30 centimes sur 1 jeton misé, et la machine s'illumine, sonne, affiche GAIN. Tu viens de perdre 70 centimes.

Les chercheurs de l'université de Waterloo ont mesuré ton corps pendant ces faux gains : même accélération qu'un vrai gain. Et après la séance, les joueurs surestiment toujours le nombre de fois où ils ont gagné.`,
    keep: 'Quand une machine fait la fête, regarde le compteur. Lui ne ment pas. C\'est le seul.'
  },
  {
    id: 'systeme', n: 5,
    title: 'Le système infaillible',
    sub: "L'illusion de contrôle",
    hint: 'Essaie le système de Dostoïevski à la roulette.',
    text: (s) => `Doubler après chaque perte. Sur le papier, imparable : le rouge finit toujours par sortir. Ton système s'est arrêté à ${fmt(s.maxBet)} de mise, ${s.reason}.

Deux murs attendent toute martingale : ton argent, et le plafond de la table. Dix rouges perdus d'affilée ont une chance sur 785. Sur une soirée, ça arrive une fois sur cinq. Et pour récupérer 10 jetons, la onzième mise est de 10 240.

Choisir son numéro, lancer les dés, appuyer sur stop, doubler : autant de gestes qui donnent le sentiment de peser sur un tirage qui n'en a que faire. Ellen Langer l'a montré en 1975 : on valorise plus un billet de loterie qu'on a choisi soi-même. Il a exactement les mêmes chances.`,
    keep: "Le seul système qui marche s'appelle l'avantage de la maison. Il appartient au casino."
  },
  {
    id: 'refaire', n: 6,
    title: 'Se refaire',
    sub: 'Courir après ses pertes',
    hint: 'Perds à la table haute, puis essaie de te refaire.',
    text: (s) => `Tu as doublé ta mise pour te refaire. ${s.times} fois. Résultat de la table : ${fmtSigned(s.net)}.

Perdre fait mal. Perdre et s'arrêter fait plus mal encore, parce que la perte devient définitive. Alors on rejoue, « juste pour rattraper ». C'est le critère central du trouble du jeu dans les manuels de psychiatrie.

Le problème est arithmétique : l'avantage s'applique à chaque jeton misé. Miser plus pour rattraper, c'est perdre plus vite. Archie Karas a transformé 50 dollars en 40 millions. Puis il a perdu 11 millions en une nuit, et il a voulu se refaire. Trois semaines plus tard, il ne restait rien.`,
    keep: '« Se refaire » n\'est pas un plan. C\'est le nom que prend la perte quand elle demande à continuer.'
  },
  {
    id: 'competence', n: 7,
    title: 'Le jeu où on a une chance',
    sub: "L'illusion de compétence",
    hint: 'Joue une dizaine de mains de blackjack.',
    text: (s) => `Dix mains de blackjack. Résultat : ${fmtSigned(s.net)}.${s.insurance ? ` Tu as pris l'assurance ${s.insurance} fois : c'est le pari le plus cher de la table, 7,4 % pour la maison.` : ''}

Le blackjack est le jeu « où l'on peut gagner » : avec la stratégie de base parfaite, l'avantage de la maison tombe à 0,5 %. Presque personne ne la joue parfaitement. Le joueur moyen laisse 2 %, et chaque écart — tirer sur 16 face à un 6, ne pas doubler, prendre l'assurance — ajoute sa dîme.

Et si tu deviens vraiment bon ? Ken Uston comptait les cartes. Il a gagné. Les casinos l'ont interdit, puis ont multiplié les paquets et mélangé plus tôt. Le seul moyen de battre la maison, c'est qu'elle te mette dehors.`,
    keep: 'Le jeu qui donne une chance est celui qui fait croire que les autres en donnent une aussi.'
  },
  {
    id: 'simplicite', n: 8,
    title: 'Le prix de la simplicité',
    sub: 'La roue de la fortune',
    hint: 'Fais tourner la grande roue du hall.',
    text: (s) => `${s.spins} tours de roue. Tu as misé ${fmt(s.wagered)}, la roue t'a rendu ${fmt(s.returned)}.

Cinquante-quatre cases, une aiguille, un seul geste : c'est le jeu le plus simple du casino. C'est aussi le plus cher. Selon la case, la maison garde entre 11 % et 24 % de chaque mise — dix fois la roulette, quarante fois un blackjack bien joué.

Ce n'est pas un hasard qu'elle soit près de l'entrée, brillante et bruyante. Plus un jeu est simple à comprendre, plus il peut se permettre d'être mauvais : personne ne calcule ce qu'il n'a pas besoin de comprendre.`,
    keep: "Quand un jeu n'exige aucune réflexion, c'est qu'il a déjà réfléchi à ta place."
  },
  {
    id: 'maison', n: 9,
    title: 'Une maison sans horloges',
    sub: "L'architecture, les jetons, l'alcool",
    hint: "Trouve l'architecte dans les couloirs.",
    text: (s) => `Depuis que tu es entré, tu n'as vu ni fenêtre, ni horloge, ni panneau Sortie. Tu as échangé tes euros contre des jetons qui ne pèsent rien.${s.drank ? ' Tu as accepté un verre offert, et ton compteur de pertes est devenu flou.' : ''}

Rien de tout ça n'est un hasard. En 2000, Bill Friedman, ancien joueur compulsif devenu directeur de casino, a écrit le manuel : pas de fenêtres, pas d'horloges, plafonds bas, allées en labyrinthe, machines visibles de partout, sortie jamais en ligne droite.

On ne perd pas la notion du temps dans un casino. On te l'enlève, et c'est un métier.`,
    keep: "Quand tout est fait pour que tu restes, rester n'est plus une décision."
  },
  {
    id: 'tapis', n: 10,
    title: 'Le tapis rouge',
    sub: 'Les hôtes, les cadeaux, le crédit',
    hint: 'Fais-toi inviter au salon VIP.',
    text: (s) => `Le casino connaît ton chiffre : ta perte théorique. Mise moyenne × tours × avantage. Ce soir, ton « théo » est de ${fmt(s.theo)}. Tout ce qu'on t'a offert${s.credit ? ', y compris le crédit,' : ''} a été calculé dessus.

Les cadeaux ne sont jamais une générosité : c'est une fraction, prévue, de ce que tu vas perdre. Pour le grand public, ça s'appelle une carte de fidélité. Pour les gros joueurs, un hôte dont le métier est de te rappeler.

Harry Kakavas était un joueur pathologique connu, exclu d'un autre casino. Le Crown de Melbourne l'a fait revenir en jet privé. Il a misé 1,43 milliard en quatorze mois. En 2013, la justice australienne a jugé que le casino n'avait pas à le protéger de lui-même.`,
    keep: 'Quand un casino t\'offre quelque chose, demande-toi ce qu\'il a estimé que tu valais.'
  },
  {
    id: 'poche', n: 11,
    title: 'Le casino dans la poche',
    sub: 'Le casino en ligne',
    hint: 'Regarde ton téléphone aux toilettes.',
    text: (s) => `Le dépôt a pris deux secondes. Le retrait prend « 3 à 5 jours ouvrés », après avoir misé quarante fois le bonus. ${s.autoSpins ? `L'auto-spin a joué ${s.autoSpins} tours pendant que tu regardais.` : ''}

En France, les jeux de casino en ligne sont illégaux. Les sites qui te ciblent sont à l'étranger, souvent en cryptomonnaie, sans limite de dépôt, sans interdiction volontaire, sans recours. Et des streamers les mettent en scène chaque soir.

Tout ce que tu as vu dans ce bâtiment tient dans ton téléphone. Sans horloge, sans fenêtre, sans personne pour te voir partir. À trois heures du matin.`,
    keep: "Le casino n'a plus besoin que tu viennes. Il est déjà là, dans ta poche."
  },
  {
    id: 'sortie', n: 12,
    title: 'Rien ne va plus',
    sub: 'La sortie',
    hint: 'Sors du casino et parle à quelqu\'un.',
    text: (s) => `Il est ${s.time}. Tu es entré à 21 h. Tu es ressorti avec ${fmtSigned(s.net)}${s.debt ? `, et une dette de ${fmt(s.debt)}` : ''}.

Onze mécaniques, empilées sur la même personne. À la fin, ce n'est plus un jeu de hasard : c'est un dispositif, et le résultat est écrit d'avance.

Les signes : rejouer pour se refaire, miser plus pour ressentir la même chose, mentir sur le temps ou l'argent, y penser quand on ne joue pas. Un seul mérite une conversation. Deux méritent un appel. Joueurs Info Service : 09 74 75 13 13, tous les jours de 8 h à 2 h, anonyme, non surtaxé.`,
    keep: 'Le casino gagne toujours à la fin. La seule chose qu\'il ne contrôle pas, c\'est quand tu décides que c\'est la fin.'
  }
];

export const WITNESSES = [
  {
    id: 'wells', name: 'Charles Wells', sub: 'Monte-Carlo, 1891', color: '#C6A14F',
    where: 'Le hall',
    lines: [
      "Tu entres ? Bien. Moi aussi je suis entré, un jour de juillet 1891. Je suis ressorti avec un million de francs.",
      "J'ai fait sauter la banque. Douze fois. On a recouvert ma table d'un drap noir, le temps de la regarnir. Une chanson porte encore mon nom.",
      "Je disais avoir un système. Je n'en avais pas. J'avais une série favorable, et de l'argent volé à des investisseurs.",
      "Je suis revenu l'année suivante. La banque avait rouvert le lendemain de chacun de mes exploits, avec de l'argent frais. Moi, je n'avais que le mien.",
      "Je suis mort en 1922, sans un sou. Une fosse commune. Faire sauter la banque, c'est gagner une bataille contre quelqu'un qui a déjà gagné la guerre."
    ]
  },
  {
    id: 'mollie', name: 'Mollie', sub: 'Las Vegas, années 2000', color: '#7FB7A6',
    where: 'La salle des machines',
    lines: [
      "Ne me parle pas trop fort. Je suis dans la zone.",
      "Les gens croient qu'on joue pour gagner. Moi je joue pour ça : plus de temps, plus d'argent, plus de corps. Juste le tour suivant.",
      "Un gros gain ? Ça m'agace. Ça interrompt. Il faut attendre que quelqu'un vienne, signer un papier. Puis je rejoue tout pour retrouver la zone.",
      "Une anthropologue est venue nous écouter pendant quinze ans. Elle a compris que la zone n'était pas dans ma tête. Elle est dans la machine. Ils l'ont conçue, tour après tour.",
      "Je sais exactement quand je sors de la zone. Quand il n'y a plus de crédits."
    ]
  },
  {
    id: 'bookman', name: 'Katrina Bookman', sub: 'New York, 2016', color: '#E9A6C9',
    where: 'La salle des machines',
    lines: [
      "Tu vois cet écran ? Regarde bien ce qu'il affiche, et ce que le compteur dit. Ce n'est pas la même chose.",
      "Août 2016, Queens. Ma machine s'est figée sur 42 949 672 dollars et 76 cents. Je me suis prise en photo devant. On m'a dit de revenir le lendemain.",
      "Le lendemain : « dysfonctionnement ». Cette machine ne pouvait pas payer plus de 6 500 dollars. Le règlement, imprimé dessus, dit qu'une panne annule tout.",
      "Ils m'ont proposé ce que mon tour avait vraiment rapporté : 2 dollars 25. Et un steak.",
      "Mon jackpot était juste une perte déguisée en gain, portée à 42 millions. La tienne est plus discrète. Mais c'est la même machine."
    ]
  },
  {
    id: 'dosto', name: 'Fiodor Dostoïevski', sub: 'Baden-Baden, 1867', color: '#9FA8DA',
    where: 'La salle des tables',
    lines: [
      "Écoute-moi. J'ai trouvé le secret. Il suffit de garder son sang-froid. Ne jamais s'emballer. Alors on gagne. Je l'ai écrit à ma famille.",
      "Été 1867. Nous arrivons à Baden-Baden, Anna et moi. Je perds dès le premier jour.",
      "Puis je mets en gage son alliance. Ses boucles d'oreilles. Mon manteau. Nous emménageons dans deux chambres au-dessus d'une forge.",
      "En novembre, je lui écris que j'ai perdu les dernières pièces d'or qu'il nous restait. J'ai écrit Le Joueur en vingt-six jours pour payer mes dettes. Il n'a pas suffi.",
      "Le système n'a jamais marché. Pas une fois. Mais à chaque perte, j'étais sûr que c'était parce que je m'étais emballé."
    ]
  },
  {
    id: 'karas', name: 'Archie Karas', sub: 'Las Vegas, 1992-1995', color: '#F4B266',
    where: 'La salle des tables',
    lines: [
      "Cinquante dollars. C'est ce que j'avais en arrivant à Vegas, en décembre 1992. Deux ans et demi plus tard : quarante millions. Personne n'a jamais fait ça.",
      "Je jouais contre les meilleurs joueurs du monde à des tables où plus personne n'osait s'asseoir. Je transportais mes jetons dans des sacs.",
      "Janvier 1995. Onze millions perdus en une nuit, aux dés. Tu sais ce que j'ai fait ? Je suis revenu le lendemain. Pour me refaire.",
      "Dix-sept millions de plus au baccara, en trois semaines. Zéro. Quarante millions n'ont pas suffi à battre un pour cent d'avantage.",
      "Tes deux cents euros non plus. Ce n'est pas la somme qui compte. C'est la soustraction."
    ]
  },
  {
    id: 'watanabe', name: 'Terrance Watanabe', sub: 'Las Vegas, 2007', color: '#E57373',
    where: 'Le salon VIP',
    lines: [
      "Assieds-toi. Ils ont réservé cette suite pour moi. Toute l'année 2007, j'ai vécu ici. Mangé ici. Dormi ici. Joué ici, vingt-quatre heures d'affilée.",
      "J'avais vendu l'entreprise familiale. Des hôtes rien que pour moi. Des cadeaux. Des remises sur mes pertes. De l'alcool, à volonté. Et des antidouleurs, quand je demandais.",
      "Un autre casino m'avait exclu la même année : jeu compulsif, alcoolisme. Celui-ci a laissé ses portes ouvertes. Je représentais 5,6 % de leurs recettes de jeu à Las Vegas.",
      "En un an, j'ai misé 825 millions de dollars. Perdu 127 millions. Quand j'ai refusé de payer les 14 derniers, ils m'ont fait poursuivre au pénal.",
      "Je suis le client parfait. C'est pour ça que personne, dans l'industrie, ne prononce jamais mon nom."
    ]
  },
  {
    id: 'kakavas', name: 'Harry Kakavas', sub: 'Melbourne, 2006', color: '#BA68C8',
    where: 'Le salon VIP',
    lines: [
      "Le jet privé, c'était eux. Les suites, les cadeaux, la boîte de 50 000 dollars en « argent porte-bonheur » : eux aussi.",
      "Ils savaient que j'étais malade. Exclu du casino de Sydney. J'avais moi-même demandé à être interdit ici. Ils m'ont rappelé quand même.",
      "Entre juin 2005 et août 2006, j'ai misé 1,43 milliard de dollars au baccara. Jusqu'à 300 000 la main. Perte nette : 20 millions et demi.",
      "J'ai attaqué le casino. En 2013, la Haute Cour d'Australie a tranché : ils n'avaient pas l'obligation de me protéger de moi-même. Mon addiction n'était pas leur problème.",
      "Le tapis rouge est légal. Chaque cadeau était calculé sur ce que j'allais perdre. Vérifie ce que le tien a estimé que tu valais."
    ]
  },
  {
    id: 'sami', name: 'Un jeune homme', sub: 'France, 2020-2025', color: '#4FC3F7',
    where: 'Les toilettes',
    lines: [
      "Non, ça va. Je regarde juste mon téléphone. Je n'ai jamais mis les pieds dans un casino, tu sais. Je n'en ai pas eu besoin.",
      "J'avais seize ans, au printemps 2020. Confiné. J'ai découvert le blackjack en ligne, sur des sites en crypto qui ne demandent pas de pièce d'identité. Les premiers dépôts faisaient dix euros.",
      "Début 2024, j'avais 15 000 euros de côté. L'alternance, et un peu le jeu — j'avais gagné, au début. Puis un accident de voiture, l'été. Les dépôts sont passés à 500, parfois 1 000 par jour.",
      "Deux mois : 5 000. Quelques mois de plus : zéro. Maintenant c'est chaque salaire, presque en entier.",
      "J'ai écrit mon histoire sur le site de Joueurs Info Service, et j'ai pris rendez-vous dans un centre. Je te le dis parce que tu as le même téléphone que moi."
    ]
  },
  {
    id: 'uston', name: 'Ken Uston', sub: 'Las Vegas, Atlantic City, 1975-1987', color: '#80CBC4',
    where: 'La salle des tables',
    lines: [
      "Assieds-toi, mais regarde le sabot, pas le croupier. Six paquets. Tu vois ? Ils ont changé ça à cause de moi.",
      "Je comptais les cartes. Ce n'est pas tricher : c'est se souvenir. Quand le sabot est riche en figures, on mise gros. Sinon, on mise petit. Avec ça, j'ai gagné. Beaucoup.",
      "Alors ils m'ont interdit. Partout. Déguisements, faux noms, perruques : je revenais, ils me reconnaissaient, ils me sortaient.",
      "En 1982, j'ai gagné mon procès dans le New Jersey : un casino ne pouvait plus m'exclure pour avoir trop bien joué. Ils ont répondu en ajoutant des paquets et en mélangeant plus tôt. Mon avantage a fondu.",
      "Retiens ça : le blackjack est le seul jeu de cette salle où l'on peut battre la maison. Et le jour où tu y arrives, la maison change les règles."
    ]
  },
  {
    id: 'architecte', name: "L'architecte", sub: 'Consultant, Las Vegas, 2000', color: '#B0BEC5',
    where: 'Les couloirs',
    lines: [
      "Perdu ? Non. Tu es exactement là où je t'ai mis.",
      "Pas de fenêtres, pas d'horloges. Plafonds bas, allées qui tournent, machines visibles de partout. La sortie jamais en ligne droite. J'ai écrit le manuel en 2000. Tous l'ont lu.",
      "Les jetons ? Pour que l'argent ne pèse rien. Le verre offert ? Pour que le compteur devienne flou. Le siège ? Pour que tu ne te lèves pas.",
      "J'étais joueur compulsif, avant. C'est pour ça que j'étais bon : je savais ce qui m'aurait fait rester.",
      "La sortie est à l'ouest, tout au bout, derrière les miroirs. Il n'y a pas de panneau. Il n'y en aura jamais."
    ]
  },
  {
    id: 'nour', name: 'Nour', sub: 'Écoutante, Joueurs Info Service', color: '#A5D6A7',
    where: "L'arrêt de bus",
    lines: [
      "Tu sors ? Il est tôt. Ou tard, ça dépend. Moi je finis ma nuit d'écoute.",
      "Les gens appellent à trois heures du matin, en général. Pas pour qu'on les juge. Pour dire à quelqu'un ce qu'ils n'ont dit à personne.",
      "On ne demande pas de nom. On demande ce qui s'est passé ce soir, et ce qu'on peut faire demain matin. Souvent, c'est une interdiction volontaire : trois ans, tous les casinos et sites légaux de France. Ça se fait en ligne, en dix minutes.",
      "73 000 personnes l'ont fait. Ce n'est pas un échec. C'est la première mise gagnante de leur vie.",
      "09 74 75 13 13. Tous les jours, de 8 h à 2 h. Garde-le. Pour toi, ou pour quelqu'un."
    ]
  }
];

// Staff & object dialogues -------------------------------------------------

export const STAFF = {
  vigile: {
    name: 'Le vigile',
    intro: [
      "Bonsoir. Vous venez pour la soirée ? Entrée libre, les portes ferment à… enfin, elles ne ferment pas.",
      "Votre ami ? Il n'est pas encore arrivé. Il vous rejoindra à l'intérieur, sûrement.",
      "La sortie ? Vous verrez. C'est indiqué. Quelque part."
    ],
    again: ["Bonne soirée. La sortie ? C'est indiqué. Quelque part."]
  },
  caissier: { name: 'La caissière' },
  hotesse: { name: "L'hôtesse" },
  barman: { name: 'Le barman' },
  hote: { name: 'Vincent, hôte VIP' },
  croupier: { name: 'Le croupier' },
};

export const STORY = {
  intro: [
    "Vendredi. 21 h.",
    "Tu as 500 € sur toi. C'est ce qu'il te reste jusqu'à la fin du mois.",
    "Un ami t'a donné rendez-vous au casino. Il n'est pas encore là.",
    "Ce soir, tu vas voir comment la maison gagne. Ressors avec ce que tu peux."
  ],
  controls3d: [
    ['Souris', 'Regarder autour de toi'],
    ['Z Q S D / W A S D / Flèches', 'Marcher'],
    ['Maj', 'Courir'],
    ['E / clic', 'Parler, jouer, examiner'],
    ['C', 'Ouvrir le carnet des révélations'],
    ['M', 'Couper le son'],
    ['Échap', 'Fermer, libérer la souris']
  ],
  controls: [
    ['Z Q S D / W A S D / Flèches', 'Se déplacer'],
    ['Maj', 'Courir'],
    ['E / Entrée / Espace', 'Parler, jouer, examiner'],
    ['C', 'Ouvrir le carnet des révélations'],
    ['M', 'Couper le son'],
    ['Échap', 'Fermer']
  ]
};

export const NUMBERS = {
  pbj: '14 milliards €', casinos: '2,7 milliards €', slotsShare: '81,8 %',
  problem: '1 170 000', excessOnline: '60,6 %', selfExcl: '73 439'
};

export function fmt(n) {
  const v = Math.round(n * 100) / 100;
  const s = Number.isInteger(v) ? v.toLocaleString('fr-FR') : v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return s + ' €';
}
export function fmtSigned(n) {
  return (n > 0 ? '+' : n < 0 ? '−' : '') + fmt(Math.abs(n));
}
export function fmtChips(n) {
  const v = Math.round(n * 100) / 100;
  return (Number.isInteger(v) ? v.toLocaleString('fr-FR') : v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })) + ' jeton' + (Math.abs(v) >= 2 ? 's' : '');
}
