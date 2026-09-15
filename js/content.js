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
    id: 'pari', n: 12,
    title: 'Le pari qui a l\'air d\'un savoir',
    sub: 'Les paris sportifs',
    hint: 'Sur ton téléphone, parie sur le match du bar.',
    text: (s) => `Tu as placé ${s.bets} pari${s.bets > 1 ? 's' : ''} sur un match que tu connais. Résultat : ${fmtSigned(s.net)}.

Regarde les trois cotes du match : ${s.odds}. Convertis-les en probabilités et additionne : ${s.overround} %. Les ${s.margin} % au-dessus de cent, c'est la marge de l'opérateur. Elle est prélevée quel que soit le vainqueur, avant même le coup d'envoi. Connaître le foot ne change rien à cette addition : les cotes ont été calculées par des gens qui le connaissent mieux que toi.

Le « pari en direct » multiplie les occasions : un but dans les dix minutes, cote 3,4 pour une probabilité réelle d'environ 26 %. Neuf occasions par match, deux cents par week-end. Et le cash-out te rachète ton pari toujours un peu moins cher qu'il ne vaut. En France, c'est le jeu qui grandit le plus vite, chez les hommes de 18 à 34 ans.`,
    keep: 'Une cote n\'est pas une prédiction. C\'est un prix, avec la marge dedans.'
  },
  {
    id: 'bruit', n: 13,
    title: 'Les mises côte à côte',
    sub: 'La complexité cache la marge',
    hint: 'Joue aux dés, à la table la plus bruyante.',
    text: (s) => `Sur la table de craps, tu as joué ${s.rolls} lancers. Les mises que tu as posées avaient un avantage maison entre ${s.best} % et ${s.worst} %.

Le même tapis, les mêmes dés, le même croupier : la ligne de passe prend 1,4 %, le « n'importe quel 7 » prend 16,7 %. Douze fois plus. Rien ne le signale : les cases sont de la même couleur, les paiements sont annoncés « 4 pour 1 » ou « 5 contre 1 » pour que personne ne les compare.

Plus un jeu a de mises différentes, plus il en cache de mauvaises. Le bruit, la vitesse et les cris de la table servent à ce que tu poses tes jetons là où on te dit, pas là où c'est le moins cher.`,
    keep: 'Quand une table propose vingt mises, c\'est qu\'elle en a dix-neuf à te vendre.'
  },
  {
    id: 'sortie', n: 14,
    title: 'Rien ne va plus',
    sub: 'La sortie',
    hint: 'Sors du casino et parle à quelqu\'un.',
    text: (s) => `Il est ${s.time}. Tu es entré à 21 h. Tu es ressorti avec ${fmtSigned(s.net)}${s.debt ? `, et une dette de ${fmt(s.debt)}` : ''}.

Treize mécaniques, empilées sur la même personne. À la fin, ce n'est plus un jeu de hasard : c'est un dispositif, et le résultat est écrit d'avance.

Les signes : rejouer pour se refaire, miser plus pour ressentir la même chose, mentir sur le temps ou l'argent, y penser quand on ne joue pas. Un seul mérite une conversation. Deux méritent un appel. Joueurs Info Service : 09 74 75 13 13, tous les jours de 8 h à 2 h, anonyme, non surtaxé.`,
    keep: 'Le casino gagne toujours à la fin. La seule chose qu\'il ne contrôle pas, c\'est quand tu décides que c\'est la fin.'
  },
  {
    id: 'retour', n: 15,
    title: 'Le retour',
    sub: 'La semaine suivante',
    hint: 'Reviens une deuxième fois.',
    text: (s) => `Tu es revenu. Tu t'étais dit que non. Il y avait un SMS : « Votre suite vous attend vendredi. » Il connaissait ton prénom.

La première soirée t'a coûté ${fmtSigned(s.first)}. Le casino ne cherchait pas à gagner ce soir-là. Il cherchait à te faire revenir : c'est le seul chiffre qui compte pour lui, celui qu'il appelle la « valeur à vie » d'un client. Une soirée perdue, c'est une soirée. Un client qui revient, c'est une rente.

Tout est un peu plus facile la deuxième fois : la carte est déjà dans ta poche, l'hôte te salue, le verre arrive sans que tu le demandes, la mise minimale te paraît petite. C'est ce qu'on appelle l'escalade, et personne ne la voit de l'intérieur.`,
    keep: 'Le casino ne veut pas que tu gagnes ce soir. Il veut que tu reviennes.'
  }
];

export const WITNESSES = [
  {
    id: 'wells', name: 'Charles Wells', sub: 'Monte-Carlo, 1891', color: '#C6A14F',
    where: 'Le hall',
    lines: [
      "Tu entres ? Bien. Moi aussi je suis entré, un jour de juillet 1891. Je suis ressorti avec un million de francs.",
      "J'ai fait sauter la banque. Douze fois. On a recouvert ma table d'un drap noir, le temps de la regarnir. Les journaux ont parlé de moi de Londres à New York. Une chanson porte encore mon nom.",
      "Je disais avoir un système. Je n'en avais pas. J'avais une série favorable, et de l'argent volé : des investisseurs anglais qui croyaient financer mes inventions.",
      "Je suis revenu en novembre. Encore gagné. Puis en 1892, sur un yacht acheté avec leur argent, avec une maîtresse et un orchestre à bord. La loi des grands nombres m'attendait à la table.",
      "En quelques jours, tout. Puis l'arrestation, l'extradition, huit ans de prison en Angleterre. À ma sortie, j'ai recommencé sous un autre nom, en France. Condamné encore.",
      "Je suis mort en 1922, sans un sou. Une fosse commune. Faire sauter la banque, c'est gagner une bataille contre quelqu'un qui a déjà gagné la guerre."
    ],
    ask: { q: 'Tu veux savoir…', choices: [
      { label: 'Comment on fait sauter une banque ?', lines: ["On ne la fait pas sauter. On vide la caisse d'une table, celle du soir, pas celle du casino. Ils vont chercher de l'argent au coffre, ils remettent un drap noir, et ça repart. J'ai « fait sauter la banque » douze fois. Le casino n'a jamais fermé une heure."] },
      { label: "Est-ce que tu avais vraiment un système ?", lines: ["J'ai juré que oui à tous les journalistes. Miser sur les numéros sortis, doubler, tripler. Ça a marché pendant onze jours en juillet et cinq en novembre. Un système qui marche seize jours et échoue le reste d'une vie, ça s'appelle une série."] }
    ] },
    more: [
      ["Tu es encore là ? La banque aussi. C'est la différence entre nous deux."],
      ["Les gens se souviennent de la chanson, pas de la fosse commune. C'est comme ça que le casino fait sa publicité : gratuitement."]
    ]
  },
  {
    id: 'mollie', name: 'Mollie', sub: 'Las Vegas, années 2000', color: '#7FB7A6',
    where: 'La salle des machines',
    lines: [
      "Ne me parle pas trop fort. Je suis dans la zone.",
      "Les gens croient qu'on joue pour gagner. Moi je joue pour ça : plus de temps, plus d'argent, plus de corps. Juste le tour suivant. Puis le suivant.",
      "Je travaille à l'accueil d'un hôtel, à deux rues. Mes pauses, mes soirées, mes jours de repos : ici. Toujours la même machine, la troisième de la rangée. Si quelqu'un est dessus, je l'attends.",
      "Un gros gain ? Ça m'agace. Ça interrompt. Il faut attendre que quelqu'un vienne, signer un papier, sourire. Puis je rejoue tout pour retrouver la zone.",
      "Une anthropologue est venue nous écouter pendant quinze ans. Elle a compris que la zone n'était pas dans ma tête. Elle est dans la machine. Ils l'ont conçue, tour après tour, avec des ingénieurs et des psychologues.",
      "Je sais exactement quand je sors de la zone. Quand il n'y a plus de crédits."
    ],
    ask: { q: 'Tu veux savoir…', choices: [
      { label: "C'est quoi, la zone, exactement ?", lines: ["C'est quand tu ne penses plus. Ni à la journée, ni à l'argent, ni au corps qui a faim. Le rythme fait tout. Un tour toutes les trois secondes, sans jamais lever la main du bouton. Certaines personnes restent douze heures. Il y a des sièges avec un trou, tu sais. Pour ne pas avoir à se lever."] },
      { label: 'Pourquoi cette machine-là ?', lines: ["Parce qu'elle me connaît. Enfin, c'est ce que je ressens. En vrai, elle a le même programme que les cent autres. Mais quand j'ai appris ça, je n'ai pas changé de machine. La zone n'a pas besoin que ce soit vrai."] }
    ] },
    more: [
      ["Encore toi. Tu vois la lumière de mon écran ? Elle change quand je perds trop vite. Plus douce. Ils ont testé la couleur."],
      ["Ma fille m'a demandé un jour ce que je faisais ici. J'ai dit : je me repose. C'était vrai. C'est ça, le problème."]
    ]
  },
  {
    id: 'bookman', name: 'Katrina Bookman', sub: 'New York, 2016', color: '#E9A6C9',
    where: 'La salle des machines',
    lines: [
      "Tu vois cet écran ? Regarde bien ce qu'il affiche, et ce que le compteur dit. Ce n'est pas la même chose.",
      "Août 2016, Queens. Une machine à un cent. Ma machine s'est figée sur 42 949 672 dollars et 76 cents. Je me suis prise en photo devant. Je pensais à mes quatre enfants, à la maison que j'allais acheter.",
      "Le personnel m'a escortée dehors en me disant de revenir le lendemain.",
      "Le lendemain : « dysfonctionnement ». Cette machine ne pouvait pas payer plus de 6 500 dollars. Le règlement, imprimé dessus en petit, dit qu'une panne annule tous les paiements et toutes les parties.",
      "Ils m'ont proposé ce que mon tour avait vraiment rapporté : 2 dollars 25. Et un steak. J'ai attaqué en justice. J'ai perdu.",
      "Mon jackpot était juste une perte déguisée en gain, portée à 42 millions. La tienne est plus discrète : trente centimes sur un jeton, avec de la musique. Mais c'est la même machine."
    ],
    ask: { q: 'Tu veux savoir…', choices: [
      { label: 'Le chiffre 42 949 672,76 ?', lines: ["C'est 2 puissance 32 divisé par 100. La valeur maximale que le compteur de la machine peut contenir avant de déborder. Un bug informatique, pas un jackpot. Mais pendant une nuit, j'ai été la femme la plus riche du Queens."] },
      { label: "Qu'est-ce que tu ferais aujourd'hui ?", lines: ["Je lirais la petite étiquette avant de m'asseoir. Elle dit ce que la machine peut payer au maximum, et que tout gain affiché peut être annulé. Tout le monde la voit. Personne ne la lit. C'est fait pour."] }
    ] },
    more: [
      ["Regarde le compteur de crédits en bas. Lui seul compte. Le reste, c'est du spectacle."],
      ["Ils m'ont offert un steak. Je l'ai refusé. C'est la seule chose que j'ai gagnée ce soir-là : dire non."]
    ]
  },
  {
    id: 'dosto', name: 'Fiodor Dostoïevski', sub: 'Baden-Baden, 1867', color: '#9FA8DA',
    where: 'La salle des tables',
    lines: [
      "Écoute-moi. J'ai trouvé le secret. Il suffit de garder son sang-froid. Ne jamais s'emballer. Alors on gagne. Je l'ai écrit à ma belle-sœur avec la certitude d'un mathématicien.",
      "Wiesbaden, 1863. Première fois. J'ai gagné dix mille francs en une heure. Tu comprends ? Une heure. Ce jour-là a décidé de dix ans de ma vie.",
      "Été 1867. Nous arrivons à Baden-Baden, Anna et moi, mariés depuis quatre mois. Je perds dès le premier jour.",
      "Puis je mets en gage son alliance. Ses boucles d'oreilles. Mon manteau. Sa robe. Nous emménageons dans deux chambres au-dessus d'une forge, le marteau commence à cinq heures du matin.",
      "En novembre, je lui écris que j'ai perdu les dernières pièces d'or qu'il nous restait. Je lui demande pardon. Puis de l'argent. Elle envoie les deux.",
      "J'ai écrit Le Joueur en vingt-six jours pour payer mes dettes, avec un éditeur qui aurait pris tous mes livres si j'avais eu un jour de retard. Le roman est un chef-d'œuvre. Il n'a rien réglé. Je n'ai arrêté qu'en 1871, à Wiesbaden, une dernière nuit.",
      "Le système n'a jamais marché. Pas une fois. Mais à chaque perte, j'étais sûr que c'était parce que je m'étais emballé."
    ],
    ask: { q: 'Tu veux savoir…', choices: [
      { label: 'Pourquoi tu revenais ?', lines: ["Parce que perdre ne suffisait pas à me convaincre. Chaque perte prouvait seulement que j'avais mal appliqué le système. La seule chose qui aurait pu me convaincre, c'est gagner, et gagner ne serait jamais arrivé assez longtemps. Tu vois le piège ? Il n'a pas d'issue par la logique."] },
      { label: "Et Anna ?", lines: ["Elle a tout noté dans son journal, en sténographie pour que je ne lise pas. Le manteau mis en gage, la robe, ses larmes. Elle est restée. C'est elle qui a fini par tenir les comptes, éditer mes livres, sauver la famille. Le joueur n'est jamais le seul à payer."] }
    ] },
    more: [
      ["Tu as essayé le système ? Il marche, au début. C'est bien ça, le pire."],
      ["Un jour à Wiesbaden, j'ai senti quelque chose se casser. Je n'ai plus jamais joué. Je ne sais pas pourquoi ce jour-là. Peut-être qu'il n'y avait plus rien à mettre en gage."]
    ]
  },
  {
    id: 'karas', name: 'Archie Karas', sub: 'Las Vegas, 1992-1995', color: '#F4B266',
    where: 'La salle des tables',
    lines: [
      "Cinquante dollars. C'est ce que j'avais en arrivant à Vegas, en décembre 1992. J'avais tout perdu à Los Angeles la semaine d'avant. Deux ans et demi plus tard : quarante millions. Personne n'a jamais fait ça.",
      "Poker d'abord, contre un joueur que j'avais connu. Puis le billard, à des sommes qui font peur. Puis les dés, ici, à cette table. Je jouais les mises maximales, plusieurs à la fois. Le casino a relevé ses plafonds pour moi.",
      "Je jouais contre les meilleurs joueurs du monde à des tables où plus personne n'osait s'asseoir. Je transportais mes jetons dans des sacs. Je dormais deux heures.",
      "Janvier 1995. Onze millions perdus en une nuit, aux dés. Tu sais ce que j'ai fait ? Je suis revenu le lendemain. Pour me refaire.",
      "Dix-sept millions de plus au baccara, en trois semaines. Zéro. Quarante millions n'ont pas suffi à battre un pour cent d'avantage.",
      "J'ai rejoué toute ma vie, par cycles. Un million, zéro, un million, zéro. En 2013, arrêté pour avoir marqué des cartes dans un casino de Californie. Inscrit sur la liste noire du Nevada. Mort en 2024, sans fortune.",
      "Tes deux cents euros non plus. Ce n'est pas la somme qui compte. C'est la soustraction."
    ],
    ask: { q: 'Tu veux savoir…', choices: [
      { label: "Comment on perd 11 millions en une nuit ?", lines: ["Comme on en perd cent : une mise après l'autre. Sauf que quand tu as gagné quarante millions, une mise de deux cent mille te paraît petite. L'échelle bouge avec toi. Le pourcentage, lui, ne bouge jamais."] },
      { label: "Tu regrettes ?", lines: ["Le Run ? Jamais. C'est la plus belle chose que j'aie faite. Et c'est exactement ça qui m'a tué : je savais que c'était possible. Je l'avais fait. Alors je pouvais le refaire. Tous les joueurs ont un Run, en plus petit. Ton premier gain est ton Run."] }
    ] },
    more: [
      ["Le baccara. C'est là que ça s'est fini. Regarde comme la table est calme."],
      ["On m'appelait « The Greek ». On aurait dû m'appeler « la preuve » : la preuve que la taille de la fortune ne change rien à l'équation."]
    ]
  },
  {
    id: 'uston', name: 'Ken Uston', sub: 'Las Vegas, Atlantic City, 1975-1987', color: '#80CBC4',
    where: 'La salle des tables',
    lines: [
      "Assieds-toi, mais regarde le sabot, pas le croupier. Six paquets. Tu vois ? Ils ont changé ça à cause de moi.",
      "J'étais vice-président à la Bourse de San Francisco. Un jour, un ami m'a montré comment compter les cartes. J'ai démissionné.",
      "Compter, ce n'est pas tricher : c'est se souvenir. Quand le sabot est riche en figures, on mise gros. Sinon, on mise petit. Avec des équipes, des signaux, des déguisements, on a gagné. Des millions.",
      "Alors ils m'ont interdit. Partout. Barbes postiches, perruques, faux noms : je revenais, ils me reconnaissaient, ils me sortaient. Un soir, des vigiles m'ont cassé la mâchoire.",
      "En 1982, j'ai gagné mon procès dans le New Jersey : un casino ne pouvait plus m'exclure pour avoir trop bien joué. Ils ont répondu en ajoutant des paquets, en mélangeant plus tôt, en changeant les règles. Mon avantage a fondu.",
      "Retiens ça : le blackjack est le seul jeu de cette salle où l'on peut battre la maison. Et le jour où tu y arrives, la maison change les règles."
    ],
    ask: { q: 'Tu veux savoir…', choices: [
      { label: 'Combien ça rapporte, compter ?', lines: ["Bien fait, avec une grosse bankroll et des heures de travail, un ou deux pour cent d'avantage. Un pour cent. Pour ça, il faut des années de pratique, des équipes, et accepter d'être jeté dehors. Si quelqu'un te vend une méthode facile pour gagner au blackjack, il te vend du vent."] },
      { label: 'Et la stratégie de base ?', lines: ["Un tableau : ta main, la carte du croupier, la bonne décision. Ça ramène l'avantage de la maison à un demi pour cent. Elle est gratuite, elle est partout. Presque personne ne la suit. Regarde autour de toi : ils tirent à 16 contre un 6 et prennent l'assurance. Le casino compte là-dessus."] }
    ] },
    more: [
      ["Tu comptes ? Non ? Alors tu joues à un jeu où la maison a l'avantage, avec le sentiment que ce n'est pas le cas. C'est le pire des deux mondes."],
      ["J'ai écrit des livres, fait la télévision. Ils m'ont interdit quand même. Un casino n'a rien contre le talent. Il a quelque chose contre les gens qui gagnent."]
    ]
  },
  {
    id: 'watanabe', name: 'Terrance Watanabe', sub: 'Las Vegas, 2007', color: '#E57373',
    where: 'Le salon VIP',
    lines: [
      "Assieds-toi. Ils ont réservé cette suite pour moi. Toute l'année 2007, j'ai vécu ici. Mangé ici. Dormi ici. Joué ici, vingt-quatre heures d'affilée, plusieurs mains à la fois.",
      "J'avais vendu l'entreprise familiale, des articles de fête, à Omaha. Cinquante ans, célibataire, riche, et personne pour me dire non.",
      "Des hôtes rien que pour moi. Des cadeaux. Quinze pour cent de remise sur mes pertes. Trois millions de crédit dans une boîte. De l'alcool, à volonté. Et des antidouleurs, quand je demandais. C'est du moins ce que j'ai affirmé au tribunal.",
      "Un autre casino m'avait exclu la même année : jeu compulsif, alcoolisme. Celui-ci a laissé ses portes ouvertes. Je représentais 5,6 % de leurs recettes de jeu à Las Vegas.",
      "En un an, j'ai misé 825 millions de dollars. Perdu 127 millions. Quand j'ai refusé de payer les 14 derniers, ils m'ont fait poursuivre au pénal. On a fini par s'arranger, en silence.",
      "Je suis le client parfait. C'est pour ça que personne, dans l'industrie, ne prononce jamais mon nom."
    ],
    ask: { q: 'Tu veux savoir…', choices: [
      { label: 'Comment on mise 825 millions ?', lines: ["Pas en une fois. Cinquante mille par main, trois mains à la fois, vingt heures par jour, pendant des mois. Chaque mise repassait à la banque avec un petit pourcentage en moins. Multiplie un petit pourcentage par 825 millions : ça fait 127."] },
      { label: "Quelqu'un a essayé de t'arrêter ?", lines: ["Ma sœur. Elle a appelé le casino. On lui a répondu que j'étais un adulte. Ce qui était vrai. Un adulte à qui l'on servait à boire à la table, avec un hôte chargé de me rappeler dès que je m'éloignais."] }
    ] },
    more: [
      ["Le lit est là-bas. Je ne m'en suis presque pas servi. On m'apportait des couvertures à la table."],
      ["Ils m'ont donné une plaque « joueur de l'année ». Sérieusement."]
    ]
  },
  {
    id: 'kakavas', name: 'Harry Kakavas', sub: 'Melbourne, 2006', color: '#BA68C8',
    where: 'Le salon VIP',
    lines: [
      "Le jet privé, c'était eux. Les suites, les cadeaux, la boîte de 50 000 dollars en « argent porte-bonheur » : eux aussi.",
      "Ils savaient que j'étais malade. Exclu du casino de Sydney. J'avais moi-même demandé à être interdit ici, des années plus tôt. Condamné pour une fraude commise pour financer mon jeu. Ils m'ont rappelé quand même. Un hôte a fait le voyage jusque chez moi.",
      "Entre juin 2005 et août 2006, j'ai misé 1,43 milliard de dollars au baccara. Jusqu'à 300 000 la main. Une séance de cinq heures et demie. Perte nette sur la période : 20 millions et demi.",
      "J'ai attaqué le casino : j'étais malade, ils le savaient, ils m'ont exploité. Il y avait des preuves. Les remises sur pertes, les vols, les cadeaux.",
      "En 2013, la Haute Cour d'Australie a tranché, à l'unanimité : le casino n'avait pas l'obligation de me protéger de moi-même. Mon addiction n'était pas un « désavantage spécial ». Un homme d'affaires qui perd est un homme d'affaires.",
      "Le tapis rouge est légal. Chaque cadeau était calculé sur ce que j'allais perdre. Vérifie ce que le tien a estimé que tu valais."
    ],
    ask: { q: 'Tu veux savoir…', choices: [
      { label: "C'est quoi, une remise sur pertes ?", lines: ["Tu perds un million, ils t'en rendent deux cent mille. Généreux ? Non : ça baisse le prix de la perte, donc tu joues plus longtemps, donc tu perds plus. C'est une réduction sur le poison. La version grand public s'appelle « points fidélité »."] },
      { label: 'Tu aurais voulu quoi, du tribunal ?', lines: ["Qu'il dise une chose simple : quand une entreprise sait que vous ne pouvez pas vous arrêter, elle n'a pas le droit de vous inviter. Il a dit le contraire. Alors retiens-le : personne ne t'arrêtera à ta place. Pas ici."] }
    ] },
    more: [
      ["Ils ont mon dossier, quelque part. Ce que je buvais, à quelle heure je craquais. Le tien est en train de s'écrire."],
      ["Un jet privé pour aller perdre vingt millions. Je l'ai raconté comme une victoire pendant des années."]
    ]
  },
  {
    id: 'sami', name: 'Un jeune homme', sub: 'France, 2020-2025', color: '#4FC3F7',
    where: 'Les toilettes',
    lines: [
      "Non, ça va. Je regarde juste mon téléphone. Je n'ai jamais mis les pieds dans un casino, tu sais. Je n'en ai pas eu besoin.",
      "J'avais seize ans, au printemps 2020. Confiné. Un streamer que je regardais jouait au blackjack en direct, avec un lien en description. Sites en crypto, aucune pièce d'identité. Les premiers dépôts faisaient dix euros.",
      "Au début, je gagnais. Enfin, je crois. Je ne comptais pas. Puis l'alternance, un salaire. Début 2024, j'avais 15 000 euros de côté : le travail, et un peu le jeu.",
      "Un accident de voiture, l'été. Rien de grave, mais je suis resté chez moi. Les dépôts sont passés de 100 par semaine à 500, parfois 1 000 par jour. Depuis mon lit.",
      "Deux mois : 5 000. Quelques mois de plus : zéro. Maintenant c'est chaque salaire, presque en entier, le jour où il tombe. Je mens à ma mère sur le loyer.",
      "J'ai écrit mon histoire sur le site de Joueurs Info Service, et j'ai pris rendez-vous dans un centre. Je te le dis parce que tu as le même téléphone que moi."
    ],
    ask: { q: 'Tu veux savoir…', choices: [
      { label: "Pourquoi les sites en crypto ?", lines: ["Parce qu'il n'y a rien. Pas d'âge, pas de limite, pas d'auto-exclusion, pas de recours. Et parce que la crypto, ça ne ressemble pas à de l'argent. 0,02 de je-ne-sais-quoi, ça fait moins mal que 800 euros. C'est le jeton, version 2020."] },
      { label: 'Le centre, ça donne quoi ?', lines: ["Ils ne m'ont pas fait la morale. Ils m'ont demandé de bloquer les sites avec un logiciel, de donner ma carte à quelqu'un de confiance, et de venir toutes les deux semaines. Ça fait trois mois. J'ai rechuté une fois. Ils ont dit : c'est normal, on continue."] }
    ] },
    more: [
      ["Le bonus de bienvenue, c'est le pire. Tu crois que tu joues avec leur argent. Tu joues avec ton temps."],
      ["Si tu connais quelqu'un qui regarde ces streams, dis-lui que le streamer est payé pour perdre en souriant."]
    ]
  },
  {
    id: 'architecte', name: "L'architecte", sub: 'Consultant, Las Vegas, 2000', color: '#B0BEC5',
    where: 'Les couloirs',
    lines: [
      "Perdu ? Non. Tu es exactement là où je t'ai mis.",
      "Pas de fenêtres, pas d'horloges. Plafonds bas, allées qui tournent, machines visibles de partout. La sortie jamais en ligne droite. J'ai écrit le manuel en 2000, six cents pages, treize principes. Tous l'ont lu.",
      "Les jetons ? Pour que l'argent ne pèse rien. Le verre offert ? Pour que le compteur devienne flou. Le siège ? Pour que tu ne te lèves pas. La moquette chargée ? Pour que tu regardes les machines, pas le sol.",
      "Le tapis rouge à l'entrée, la fontaine, les colonnes : c'est pour la première minute. Après, on baisse le plafond et on serre les allées. Un joueur dans une allée étroite se sent à l'abri. Il reste.",
      "J'étais joueur compulsif, avant. C'est pour ça que j'étais bon : je savais ce qui m'aurait fait rester.",
      "La sortie est à l'ouest, tout au bout, derrière les miroirs. Il n'y a pas de panneau. Il n'y en aura jamais."
    ],
    ask: { q: 'Tu veux savoir…', choices: [
      { label: 'Pourquoi les miroirs ?', lines: ["Ils agrandissent l'espace et ils cassent les repères. Tu ne sais plus quel couloir tu as déjà pris. Et ils te montrent un joueur, pas une personne fatiguée. C'est le même truc que les écrans : on te montre ce que tu veux voir."] },
      { label: "L'école d'en face, la lumière et les jardins ?", lines: ["Roger Thomas, chez Wynn. Il a fait l'inverse de moi : plafonds hauts, lumière naturelle, œuvres d'art. Il a prouvé qu'un joueur détendu mise plus. Deux écoles, un seul indicateur. Ce n'est pas le décor qui compte. C'est qu'il a été choisi pour toi."] }
    ] },
    more: [
      ["Regarde le sol. Les motifs pointent vers les machines. Tu ne l'avais pas vu. C'est le but."],
      ["On teste tout : la température, l'odeur, la musique. Tu n'as jamais eu froid ici. Tu ne l'as jamais remarqué non plus."]
    ]
  },
  {
    id: 'nour', name: 'Nour', sub: 'Écoutante, Joueurs Info Service', color: '#A5D6A7',
    where: "L'arrêt de bus",
    lines: [
      "Tu sors ? Il est tôt. Ou tard, ça dépend. Moi je finis ma nuit d'écoute.",
      "Les gens appellent à trois heures du matin, en général. Pas pour qu'on les juge. Pour dire à quelqu'un ce qu'ils n'ont dit à personne. Souvent c'est la première fois qu'ils le disent à voix haute.",
      "On ne demande pas de nom. On demande ce qui s'est passé ce soir, et ce qu'on peut faire demain matin. Souvent, c'est une interdiction volontaire : trois ans minimum, tous les casinos et sites légaux de France. Ça se fait en ligne, sur le site de l'ANJ, en dix minutes, avec une pièce d'identité.",
      "Puis on parle argent, concrètement : donner sa carte à un proche, bloquer les paiements vers les sites de jeu, un rendez-vous dans un CSAPA, gratuit, dans chaque département.",
      "73 000 personnes se sont interdites de jeu. Ce n'est pas un échec. C'est la première mise gagnante de leur vie.",
      "09 74 75 13 13. Tous les jours, de 8 h à 2 h. Garde-le. Pour toi, ou pour quelqu'un."
    ],
    ask: { q: 'Tu veux savoir…', choices: [
      { label: "Et si c'est un proche qui joue ?", lines: ["Tu ne le feras pas arrêter. Mais tu peux dire ce que tu vois, sans accuser : « je m'inquiète, voilà ce que j'ai remarqué ». Ne rembourse pas ses dettes, ne mens pas pour lui. Et appelle-nous, toi aussi : le numéro est pour les proches. Ils sont la moitié des appels."] },
      { label: "Comment on sait que c'est un problème ?", lines: ["Trois questions. Tu rejoues pour te refaire ? Tu mens sur le temps ou l'argent ? Tu y penses quand tu ne joues pas ? Un oui mérite une conversation. Deux, un appel. Ce n'est pas une maladie de faibles. C'est un produit conçu pour ça."] }
    ] },
    more: [
      ["Le bus va arriver. Rentre. Et si demain c'est dur, tu sais où appeler."]
    ]
  },
  {
    id: 'parieur', name: 'Un parieur', sub: 'France, 2023-2025', color: '#42a5f5',
    where: 'Le bar',
    lines: [
      "Tu regardes le match ? Moi je regarde ma mise. Ce n'est pas pareil.",
      "Je n'avais jamais mis un pied dans un casino avant ce soir. Je suis venu pour la télé et le réseau. Mon appli marche mieux ici.",
      "Ça a commencé avec un pari gratuit. Dix euros offerts, « sans dépôt ». Le foot, je connais. Je pensais que connaître, ça suffisait.",
      "Le premier mois, j'ai gagné 340 €. Je l'ai dit à tout le monde. Les huit mois d'après, j'ai perdu 6 200 €. Je ne l'ai dit à personne.",
      "Le pire, c'est le « en direct ». Un but dans les dix prochaines minutes, cote 3,4. Toutes les dix minutes, une nouvelle occasion. Un match, c'est neuf occasions. Un week-end, c'est deux cents.",
      "Le cash-out, ils appellent ça « sécuriser ». Ils te rachètent ton pari moins cher qu'il ne vaut. J'ai sécurisé mes pertes pendant un an."
    ],
    ask: { q: 'Tu veux savoir…', choices: [
      { label: 'Pourquoi le foot ?', lines: ["Parce que je m'y connais. C'est exactement pour ça qu'ils m'ont choisi. Les cotes sont calculées par des gens qui s'y connaissent plus que moi, avec huit pour cent de marge dedans. Connaître le foot ne change pas les huit pour cent."] },
      { label: 'Comment tu as arrêté ?', lines: ["Je n'ai pas arrêté. J'ai bloqué l'appli, puis je l'ai réinstallée. Puis je me suis interdit de jeu sur le site de l'ANJ. Ça, ça tient : trois ans, toutes les plateformes, casinos compris. C'est le seul pari que j'ai gagné."] }
    ] },
    more: [
      ["Toujours là ? Mon équipe mène 1-0. Ma cote, elle, a déjà perdu."],
      ["Le match finit dans vingt minutes. L'appli, elle, ne finit jamais."]
    ]
  },
  {
    id: 'anna', name: 'Anna Dostoïevskaïa', sub: 'Baden-Baden, 1867', color: '#b39ddb',
    where: 'Le bar',
    lines: [
      "Vous attendez quelqu'un ? Moi aussi. Depuis cent cinquante ans.",
      "Je m'appelle Anna. J'avais vingt ans, j'étais mariée depuis quatre mois. Fiodor jouait à la roulette du matin au soir. Je l'attendais dans une chambre dont nous ne pouvions plus payer le loyer.",
      "Il a mis en gage mon alliance. Puis mes boucles d'oreilles, celles de ma mère. Puis ma robe de soirée. Puis son manteau. Il revenait, il pleurait, il jurait. Il repartait.",
      "Il avait un système. Il me l'expliquait le soir : rester calme, miser petit, s'arrêter à temps. Il écrivait la même chose dans ses lettres. Il n'a jamais tenu une seule fois.",
      "Ce que personne ne raconte, c'est ce que ça fait à celle qui attend. Je comptais les heures avec la faim. Je n'ai jamais pu lui en vouloir. C'est ça, le pire : on n'arrive pas à leur en vouloir.",
      "Il a arrêté en 1871, à Wiesbaden. D'un coup, après dix ans. Il m'a écrit : « Une grande chose s'est accomplie en moi. » Je l'ai cru le jour où il n'est pas reparti."
    ],
    ask: { q: 'Tu veux savoir…', choices: [
      { label: "Comment on vit à côté d'un joueur ?", lines: ["On cache l'argent. On ment aux voisins. On apprend à reconnaître le pas dans l'escalier : léger, il a gagné ; lourd, il a tout perdu ; très léger, il vient chercher ce qui reste. Aujourd'hui il y a un numéro pour ceux qui attendent, aussi. Ce n'est pas rien."] },
      { label: 'Vous avez lu Le Joueur ?', lines: ["Je l'ai écrit sous sa dictée, en vingt-six jours, pour payer une dette de jeu. Il y raconte tout : la chaleur, la bille qui n'a pas de mémoire, le « demain je m'arrête ». Il savait exactement ce qu'il faisait. Savoir ne l'a pas protégé."] }
    ] },
    more: [
      ["Vous attendez toujours votre ami ? Asseyez-vous. On finit par s'y faire."],
      ["Joueurs Info Service répond aussi aux proches. Personne ne me l'avait dit, en 1867."]
    ]
  },
  {
    id: 'main', name: 'Un croupier en pause', sub: 'Personnel de salle, 2025', color: '#90a4ae',
    where: 'Les couloirs',
    lines: [
      "Pause. Dix minutes. Je ne peux pas parler des clients. Je peux parler de mes mains.",
      "Je fais tourner la roulette trois cents fois par nuit, cinq nuits par semaine. Trente-sept tours sur mille reviennent à la maison, sans que personne le voie. Je ne suis pas croupier. Je suis le mécanisme.",
      "On nous apprend à sourire, à dire « bonne chance », à pousser les jetons vite. On nous apprend aussi à repérer celui qui ne devrait plus être là. Et à ne rien dire, sauf s'il fait du bruit.",
      "Les pourboires, c'est notre salaire. Alors on encourage. Un gros gagnant, on l'applaudit. Un gros perdant, on lui dit « ça va tourner ». On le pense presque.",
      "Le pire soir ? Un homme a perdu sa voiture et sa montre, et il m'a remercié en partant. Pour le service. J'ai gardé le pourboire. Je l'ai encore.",
      "Des collègues jouent en sortant, dans le casino d'à côté. Ils savent tout. Ça ne les protège pas plus que vous."
    ],
    ask: { q: 'Tu veux savoir…', choices: [
      { label: "Vous pouvez arrêter quelqu'un ?", lines: ["Non. On peut prévenir le chef de table, qui prévient le directeur, qui propose « une pause ». La loi dit qu'on doit repérer. La maison dit qu'on doit servir. Devine qui gagne."] },
      { label: 'Ça vous fait quoi ?', lines: ["La première année, rien : c'est un métier. La deuxième, on arrête de regarder les visages. La troisième, on compte les tours pour ne pas compter les gens."] }
    ] },
    more: [
      ["Ma pause est finie. Table 4. Si vous venez, je dirai « bonne chance ». C'est le règlement."],
      ["Les casinos doivent former leur personnel à repérer les joueurs en difficulté. J'ai eu deux heures de formation. En cinq ans."]
    ]
  }
];

// Ambient lines for the crowd — each one is a small piece of prevention
export const PATRON_LINES = {
  machines: [
    "Elle n'a pas payé depuis une heure, celle-là. Elle est chaude. — Non. Elle a le même programme qu'hier.",
    "Je suis à moins quarante. Je m'arrête à zéro. — Il est là depuis midi.",
    "J'ai eu deux sept. Deux ! Le troisième était juste au-dessus. — C'est réglé pour.",
    "Cette machine m'aime bien. — Elle ne sait pas que tu existes.",
    "Encore dix euros et je rentre. — Il l'a dit à dix-neuf heures.",
    "Tu vois cette lumière ? Ça veut dire qu'elle va lâcher. — Ça veut dire qu'elle est allumée.",
    "Je joue une pièce à la fois, comme ça je ne perds pas. — Six cents fois par heure.",
    "Le type d'à côté a gagné trois cents. — Il en avait mis huit cents."
  ],
  tables: [
    "Le rouge est sorti six fois. Le noir est dû. — La bille ne sait pas compter.",
    "Je double à chaque perte. Impossible de perdre. — Sauf au dixième coup.",
    "Je ne tire jamais sur 16. Jamais. — Contre un 7, il faut.",
    "L'assurance, c'est plus sûr. — C'est le pari le plus cher de la table.",
    "J'ai un système sur les douzaines. — Tout le monde a un système.",
    "Ce croupier me porte malheur. — Il tourne une bille.",
    "Le zéro sort toujours quand je mise gros. — Le zéro sort une fois sur trente-sept.",
    "Je sens que ça vient. — Ça vient depuis 1913."
  ],
  bar: [
    "Un verre et je repars aux tables. C'est offert, après tout. — Rien n'est offert.",
    "J'ai perdu, mais j'ai passé une bonne soirée. — C'est le slogan.",
    "Il est quelle heure ? — Personne ne sait.",
    "J'attends un ami. — Depuis 21 h.",
    "Le barman connaît mon prénom. — Il connaît ton théo."
  ],
  hall: [
    "Je change cent euros. Pas plus. — C'est ce que tout le monde change en premier.",
    "La carte de fidélité, c'est gratuit. — Ce sont tes mises qui la paient.",
    "La roue, c'est pour s'amuser, ce n'est pas du vrai jeu. — C'est le pire taux de la maison.",
    "Ma femme croit que je suis au cinéma. — Le film dure longtemps."
  ],
  vip: [
    "Ici, tout est offert. — Sur la base de ce que tu perds.",
    "Ils m'ont envoyé une voiture. — Ils viendront aussi chercher le chèque."
  ],
  labyrinth: [
    "La sortie, c'est par là ? — Il n'y a pas de panneau.",
    "Je cherche le restaurant depuis dix minutes. — Il y a des machines dans chaque coin, en attendant.",
    "Je crois que je suis déjà passé ici. — Les miroirs sont là pour ça."
  ],
  street: [
    "Vous avez l'heure ? — Vous êtes le premier à le demander ce soir.",
    "J'ai fait une pause. Je retourne. — Le vigile hoche la tête."
  ],
  restaurant: [
    "C'est offert, tout ça ? — Tout ce que tu manges est déjà compté dans ce que tu vas perdre.",
    "On mange, et après on retourne jouer, c'est le circuit. — Le circuit est dessiné sur le plan du bâtiment.",
    "Le maître d'hôtel connaît mon prénom. — Il connaît ta carte."
  ],
  scene: [
    "Elle chante bien, non ? Les paroles parlent de chance. — Toutes les chansons d'ici parlent de chance.",
    "Le spectacle était censé commencer à 22 h. — Il commence toujours dans une heure.",
    "Après, on repasse par les tables, c'est sur le chemin. — C'est le seul chemin."
  ],
  jackpot: [
    "T'as vu ? Douze mille ! À la 37 ! — Tu as vu le chèque. Tu n'as pas vu les deux ans de mises.",
    "Je vais me mettre sur celle d'à côté, elles sont liées. — Elles ne sont liées à rien.",
    "Elle l'a mérité, elle vient tous les soirs. — C'est exactement ce que la maison voulait te faire penser.",
    "Ça prouve que c'est possible. — Ça prouve qu'une fois sur quarante mille, ça arrive."
  ],
  hot: [
    "Il a touché le 23 en plein ! Trente-cinq fois la mise ! — Il avait misé le 23 les trente-six tours d'avant.",
    "Cette table est chaude, je te dis. — Elle a la même bille que l'autre.",
    "Je mise sur les mêmes numéros que lui. — Lui non plus ne sait pas pourquoi ils sont sortis.",
    "Quand ça tourne, il faut être là. — Tout le monde est là. C'est ça, la table qui rapporte."
  ],
  default: ["Bonsoir.", "…", "Excusez-moi."]
};

export const STAFF_LINES = {
  croupier: [
    "Faites vos jeux. — La roulette ne se souvient de rien. Les joueurs, si.",
    "Rien ne va plus. — Ce que vous voyez sur l'écran là-haut, ce sont les derniers numéros. Ça ne prédit rien. Mais ça fait miser.",
    "Le zéro ? C'est lui, notre salaire. Une case sur trente-sept."
  ],
  croupier2: [
    "Joueur ou Banque ? La Banque gagne un peu plus souvent. C'est pour ça qu'on prend cinq pour cent dessus.",
    "Les gros joueurs adorent le baccara. Ils croient qu'il n'y a pas de stratégie à rater. C'est vrai. Il n'y a que la soustraction.",
    "La table haute. Minimum vingt-cinq. Il y a eu des soirs à trois cent mille la main, ici."
  ],
  caissier: [
    "Un jeton, un euro. Vous les rendez quand vous voulez. — Presque personne ne vient les rendre.",
    "Le distributeur est au fond. Les frais sont affichés. En petit."
  ],
  vigile: ["Bonne soirée. La sortie ? C'est indiqué. Quelque part."]
};

// 3D-only narration points (id → lines)
export const NARRATIONS = {
  mirror: ["Tu te vois dans le miroir. Tu as l'air fatigué. Le miroir, lui, sert à agrandir le couloir."],
  fakedoor: ["Fermé. Ce n'était pas une sortie. Aucune de ces portes n'en est une."],
  piano: ["Personne ne joue. Le pianiste vient à 23 h, pour que la salle ait l'air d'une fête à 23 h."],
  tv: ["Un match. Toujours un match. Et en bas de l'écran, la cote du prochain."],
  bookshelf: ["Des manuels de gestion de casino. L'un d'eux s'appelle « Designing Casinos to Dominate the Competition ». Six cents pages sur toi."],
  safe: ["Le coffre. Ce qui est dedans vient de la salle. Ce qui va dans la salle vient de la caisse. La boucle est fermée."],
  fountain: ["Des pièces au fond de l'eau. Des vœux. C'est la seule mise du bâtiment sans avantage pour la maison."],
  ticker: ["Le jackpot progressif monte de quelques centimes à chaque mise, dans tout le pays. Il monte avec ce que les gens perdent."],
  champagne: ["Champagne offert. Ce soir, il coûte exactement ce que tu vas perdre en plus."],
  car: ["Une voiture garée depuis des heures. Le parking est gratuit, tant qu'on joue."],
  taxi: ["Le taxi attend. Les casinos paient parfois la course. À l'aller."],
  showposter: ["Un spectacle à 23 h. La salle est de l'autre côté du bâtiment : derrière la salle des tables, derrière le restaurant. Le panneau, lui, est ici, dans le couloir des machines."],
  showbill: ["« Ce soir : Nuit de chance — chansons et cabaret. Entrée libre. Dès 23 h. » Le mot « chance » est écrit plus gros que le reste."],
  vitrine: ["Des montres, trois alliances, une console de jeu, une guitare, un téléphone. Une étiquette sur chaque objet : un prénom et une date. Les dates sont toutes des vendredis."],
  bench: ["Un banc dans le couloir. Pour se reposer entre deux machines. Jamais pour partir."],
  pillar: ["Une colonne de marbre. Fausse. Le marbre, c'est pour la première minute."]
};

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
  intro2: [
    "Vendredi suivant. 21 h.",
    "Tu t'étais dit que tu ne reviendrais pas.",
    "Mardi, un SMS : « Votre suite vous attend vendredi. » Il connaissait ton prénom.",
    "Tu as 500 € pour finir le mois. Et la dette de la semaine dernière.",
    "La carte est déjà dans ta poche."
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

// Twelve-plus questions, one per mechanic, for the end-of-night quiz (index of the right answer in `ok`)
export const QUIZ = [
  { id: 'avantage', q: 'À la roulette européenne, sur 1 000 mises de 10 € sur le rouge, combien le casino garde-t-il en moyenne ?', a: ['270 €', '0 € : rouge ou noir, c\'est 50/50', '1 000 €'], ok: 0, why: '37 cases, 18 rouges : 2,7 % de chaque mise, soit 270 € sur 10 000 € misés.' },
  { id: 'memoire', q: 'Le noir est sorti huit fois de suite. Au prochain tour, la probabilité du rouge est :', a: ['plus élevée, il est « dû »', '18 sur 37, comme toujours', 'plus faible, la table est noire'], ok: 1, why: 'La bille n\'a pas de mémoire. Chaque tour est indépendant.' },
  { id: 'zone', q: 'Le seul chiffre qu\'une machine à sous est réglée pour maximiser, c\'est :', a: ['le nombre de jackpots', 'la taille des gains', 'le temps que tu passes dessus'], ok: 2, why: 'Le « temps sur machine » : plus tu restes, plus la soustraction s\'applique.' },
  { id: 'ldw', q: 'Sur une machine à 20 lignes, tu mises 2 € et la machine fête un « gain » de 0,80 €. Tu as :', a: ['gagné 0,80 €', 'perdu 1,20 €', 'fait match nul'], ok: 1, why: 'Une perte déguisée en gain : la fanfare sonne, le compteur baisse.' },
  { id: 'systeme', q: 'Doubler sa mise après chaque perte (la martingale) :', a: ['gagne à coup sûr avec assez de patience', 'réduit l\'avantage de la maison', 'échoue à cause du plafond de table et du capital fini'], ok: 2, why: 'L\'espérance reste négative ; la ruine devient seulement plus rare et plus grosse.' },
  { id: 'refaire', q: 'Retourner jouer pour « se refaire » après une perte, c\'est :', a: ['une stratégie de gestion du risque', 'un critère du trouble du jeu dans le DSM-5', 'sans importance'], ok: 1, why: 'C\'est l\'un des neuf critères diagnostiques du jeu pathologique.' },
  { id: 'competence', q: 'Au blackjack, avec la stratégie de base parfaite, l\'avantage de la maison est d\'environ :', a: ['0,5 % — toujours pour la maison', '0 % : le jeu est équitable', '−1 % : en faveur du joueur'], ok: 0, why: 'Il ne devient négatif qu\'en comptant les cartes, ce que les casinos empêchent.' },
  { id: 'simplicite', q: 'La roue de la fortune (Big Six) a un avantage maison de :', a: ['2,7 %, comme la roulette', 'entre 11 et 24 % selon le secteur', 'moins de 1 %'], ok: 1, why: 'Le jeu le plus simple du casino est le plus cher.' },
  { id: 'maison', q: 'Pourquoi les casinos n\'ont-ils ni horloge ni fenêtre ?', a: ['par tradition architecturale', 'pour la sécurité des clients', 'pour que tu perdes la notion du temps'], ok: 2, why: 'Tout le bâtiment est conçu pour que rester ne soit plus une décision.' },
  { id: 'tapis', q: 'Les cadeaux d\'un casino (verre, suite, hôte dédié) sont calculés sur :', a: ['ta perte théorique', 'ta sympathie', 'le hasard'], ok: 0, why: 'Le « théo » : ce que tu vas perdre en moyenne. Le cadeau en est une fraction.' },
  { id: 'poche', q: 'Les casinos en ligne (machines, roulette) sont, en France :', a: ['légaux avec une licence ANJ', 'illégaux', 'légaux après minuit'], ok: 1, why: 'Seuls paris sportifs, hippiques et poker sont autorisés en ligne. Les casinos en ligne qui te ciblent sont à l\'étranger, sans recours.' },
  { id: 'pari', q: 'Les trois cotes d\'un match additionnent 108 % de probabilités. Les 8 % sont :', a: ['une erreur de calcul', 'un bonus pour le parieur', 'la marge de l\'opérateur, quel que soit le résultat'], ok: 2, why: 'La marge est prélevée avant le coup d\'envoi. Connaître le foot n\'y change rien.' },
  { id: 'bruit', q: 'Sur une table de craps, l\'écart entre la meilleure et la pire mise est :', a: ['nul : mêmes dés, mêmes chances', '1,4 % contre 16,7 %', 'environ 1 %'], ok: 1, why: 'Douze fois plus cher, sur le même tapis, sans rien qui le signale.' },
  { id: 'sortie', q: 'Le numéro de Joueurs Info Service :', a: ['3919', '09 74 75 13 13', '112'], ok: 1, why: 'Tous les jours de 8 h à 2 h, anonyme et non surtaxé. Aussi pour les proches.' }
];

// Sources: what is real, what is composite, and where each story and figure comes from.
// Shown in the codex (« Sources ») so that every claim in the game can be checked.
export const SOURCES = {
  witnesses: [
    { id: 'wells', status: 'réel', refs: [
      'Robin Quinn, <i>The Man Who Broke the Bank at Monte Carlo: Charles Deville Wells, Gambler and Fraudster Extraordinaire</i>, The History Press, 2016.',
      'Fred Gilbert, chanson <i>The Man Who Broke the Bank at Monte Carlo</i> (1891-1892), créée par Charles Coborn.',
      'Archives de presse britannique sur le procès de 1893 (Old Bailey) et la condamnation de 1912 en France.'
    ] },
    { id: 'mollie', status: 'réelle, sous pseudonyme', refs: [
      'Natasha Dow Schüll, <i>Addiction by Design: Machine Gambling in Las Vegas</i>, Princeton University Press, 2012 — Mollie est l\'une des joueuses suivies pendant quinze ans par l\'anthropologue ; la « zone » est son mot.'
    ] },
    { id: 'bookman', status: 'réelle', refs: [
      'Resorts World Casino, Queens (New York), 23 août 2016 : la machine affiche 42 949 672,76 $ ; le casino invoque un dysfonctionnement et propose un dîner et 2,25 $.',
      'Couverture par CNN, le New York Daily News et The Guardian, août 2016 - juin 2017 (plainte déposée contre le casino).'
    ] },
    { id: 'dosto', status: 'réel', refs: [
      'Fiodor Dostoïevski, <i>Le Joueur</i> (1866), écrit en vingt-six jours pour rembourser une dette de jeu.',
      'Anna Dostoïevskaïa, <i>Journal</i> (1867) et <i>Mémoires</i> : les étés de Baden-Baden, les objets mis en gage, les lettres de Wiesbaden (1871) où il jure d\'arrêter.'
    ] },
    { id: 'karas', status: 'réel', refs: [
      'Michael Konik, portrait d\'Archie Karas dans <i>Cigar Aficionado</i>, 1996 : de 50 $ à environ 40 millions de dollars entre 1992 et 1995, puis tout perdu en quelques mois.',
      'Las Vegas Review-Journal et San Diego Union-Tribune, 2013 : arrestation pour marquage de cartes au casino Barona.'
    ] },
    { id: 'uston', status: 'réel', refs: [
      'Ken Uston, <i>The Big Player</i> (1977) et <i>Million Dollar Blackjack</i> (1981).',
      '<i>Uston v. Resorts International Hotel, Inc.</i>, Cour suprême du New Jersey, 1982 : un casino de l\'État ne peut pas exclure un compteur de cartes ; les casinos ont répondu en changeant les règles et les sabots.',
      'Décès à Paris en septembre 1987.'
    ] },
    { id: 'watanabe', status: 'réel', refs: [
      'Alexandra Berzon, « The Gambler Who Blew $127 Million », <i>The Wall Street Journal</i>, 5 décembre 2009 : environ 127 millions de dollars perdus en 2007 au Caesars Palace et au Rio (groupe Harrah\'s), l\'alcool et les médicaments servis pendant le jeu, les hôtes dédiés.',
      'Poursuites pour 14,7 millions de dollars de dettes impayées abandonnées en 2010 après un accord.'
    ] },
    { id: 'kakavas', status: 'réel', refs: [
      '<i>Kakavas v Crown Melbourne Ltd</i> [2013] HCA 25, Haute Cour d\'Australie : 20,5 millions de dollars australiens perdus en quatorze mois (2005-2006), environ 1,5 milliard misés, jets privés et cadeaux fournis par le casino ; le recours pour « exploitation d\'une vulnérabilité » est rejeté.'
    ] },
    { id: 'sami', status: 'personnage composite', refs: [
      'Construit à partir de témoignages publiés par Joueurs Info Service et de l\'enquête OFDT / Santé publique France, <i>Les jeux d\'argent et de hasard en France en 2024</i> : 3,9 millions de joueurs en ligne, une pratique problématique concentrée chez les hommes jeunes.',
      'ANJ, communications 2023-2025 sur les casinos en ligne illégaux et les sites de « crypto-casino » bloqués.'
    ] },
    { id: 'architecte', status: 'composite, d\'après deux vrais consultants', refs: [
      'Bill Friedman, <i>Designing Casinos to Dominate the Competition</i>, Institute for the Study of Gambling and Commercial Gaming, University of Nevada, Reno, 2000 : les treize principes (plafonds bas, dédale, pas d\'horloge ni de fenêtre, machines dès l\'entrée).',
      'Roger Thomas (Wynn Design) et le « playground design », qui a contesté Friedman avec des espaces ouverts — et les mêmes objectifs.',
      'Natasha Dow Schüll, <i>Addiction by Design</i>, chapitres sur l\'ergonomie des salles.'
    ] },
    { id: 'parieur', status: 'personnage composite', refs: [
      'ANJ, <i>Analyse annuelle du marché</i>, 2023-2024 : les paris sportifs en ligne sont le segment qui croît le plus vite, avec une clientèle très majoritairement masculine et jeune ; les paris « en direct » y représentent plus de la moitié des mises.',
      'OFDT / Santé publique France, 2024 : pratique problématique concentrée chez les hommes de 18 à 34 ans ; campagnes ANJ 2023-2025 sur les paris sportifs.',
      'Marge des cotes (« overround ») : la somme des probabilités implicites d\'un match dépasse 100 % de 5 à 12 % selon l\'opérateur — c\'est la commission, quel que soit le résultat.'
    ] },
    { id: 'anna', status: 'réelle', refs: [
      'Anna Grigorievna Dostoïevskaïa, <i>Journal</i> (Genève et Baden-Baden, 1867) et <i>Mémoires</i> (rédigés 1911-1916) : les objets mis en gage, l\'attente, les serments.',
      'Lettres de Fiodor Dostoïevski à Anna, Wiesbaden, avril 1871 : « une grande chose s\'est accomplie en moi » ; il ne rejoua jamais.',
      'Le roman <i>Le Joueur</i> fut dicté à Anna, alors sténographe, en vingt-six jours d\'octobre 1866, pour honorer un contrat lié à des dettes de jeu.'
    ] },
    { id: 'main', status: 'personnage composite', refs: [
      'Témoignages d\'anciens croupiers dans la presse française (Le Monde, France Inter, Libération, 2015-2024) et sur les forums professionnels ; salaires largement composés de pourboires (la « cagnotte » partagée).',
      'Obligation légale : l\'arrêté du 14 mai 2007 et la loi du 12 mai 2010 imposent aux casinos un dispositif de repérage et de prise en charge des joueurs excessifs, avec formation du personnel ; l\'ANJ contrôle ces dispositifs depuis 2020.'
    ] },
    { id: 'nour', status: 'personnage fictif, service réel', refs: [
      'Joueurs Info Service, dispositif de Santé publique France : 09 74 75 13 13, tous les jours de 8 h à 2 h, appel anonyme et non surtaxé ; joueurs-info-service.fr (chat, forum, annuaire des consultations).'
    ] }
  ],
  mechanics: [
    { id: 'avantage', refs: ['Espérance de la roulette européenne : 37 cases, gains payés 35 contre 1, soit −2,7 % par mise ; roulette américaine (double zéro) : −5,26 %. Edward O. Thorp, <i>The Mathematics of Gambling</i>, 1984.', 'Taux de redistribution des machines à sous en France : minimum légal de 85 % (arrêté du 14 mai 2007 relatif à la réglementation des jeux dans les casinos).'] },
    { id: 'memoire', refs: ['Amos Tversky & Daniel Kahneman, « Belief in the law of small numbers », <i>Psychological Bulletin</i>, 1971.', 'La série de 26 noirs du 18 août 1913 à Monte-Carlo est rapportée par Darrell Huff, <i>How to Take a Chance</i>, 1959 — et reprise depuis dans tous les manuels sur le sophisme du joueur.'] },
    { id: 'zone', refs: ['Natasha Dow Schüll, <i>Addiction by Design</i>, 2012.', 'R. L. Reid, « The psychology of the near miss », <i>Journal of Gambling Behavior</i>, 1986.', 'Luke Clark et al., « Gambling near-misses enhance motivation to gamble and recruit win-related brain circuitry », <i>Neuron</i>, 2009.'] },
    { id: 'ldw', refs: ['Mike J. Dixon, Kevin A. Harrigan, Rajwant Sandhu, Karen Collins & Jonathan A. Fugelsang, « Losses disguised as wins in modern multi-line video slot machines », <i>Addiction</i>, 105(10), 2010.'] },
    { id: 'systeme', refs: ['Ellen J. Langer, « The illusion of control », <i>Journal of Personality and Social Psychology</i>, 1975.', 'La martingale (doubler après chaque perte) échoue par le plafond de table et le capital fini : l\'espérance reste −2,7 % par mise, la ruine devient seulement plus rare et plus grosse.'] },
    { id: 'refaire', refs: ['Henry R. Lesieur, <i>The Chase: Career of the Compulsive Gambler</i>, 1977.', '« Après avoir perdu de l\'argent au jeu, retourne souvent jouer pour se refaire » est l\'un des neuf critères du trouble lié au jeu d\'argent, DSM-5, American Psychiatric Association, 2013.'] },
    { id: 'competence', refs: ['Edward O. Thorp, <i>Beat the Dealer</i>, 1962 : avec la stratégie de base, l\'avantage de la maison au blackjack tombe autour de 0,5 % ; il ne devient négatif qu\'en comptant les cartes — ce que les casinos interdisent ou neutralisent.', 'Ken Uston, <i>Million Dollar Blackjack</i>, 1981.'] },
    { id: 'simplicite', refs: ['Roue de la fortune (Big Six) : avantage de la maison de 11 % à 24 % selon le secteur — Michael Shackleford, <i>The Wizard of Odds</i>, « Big Six / Money Wheel ».'] },
    { id: 'maison', refs: ['Bill Friedman, <i>Designing Casinos to Dominate the Competition</i>, 2000.', 'Natasha Dow Schüll, <i>Addiction by Design</i>, 2012 : jetons, cartes de fidélité, boissons, absence d\'horloges.'] },
    { id: 'tapis', refs: ['Alexandra Berzon, <i>The Wall Street Journal</i>, 2009 (Watanabe) ; <i>Kakavas v Crown Melbourne Ltd</i>, 2013.', 'Schüll, chapitre sur le suivi des joueurs (player tracking) : la carte de fidélité sert d\'abord à mesurer la « valeur théorique » d\'un client.'] },
    { id: 'poche', refs: ['OFDT, <i>Les jeux d\'argent et de hasard en France en 2024</i> (2025) : 3,9 millions de joueurs en ligne (+7,7 %).', 'ANJ, rapports d\'activité 2023 et 2024 : la part du chiffre d\'affaires en ligne provenant de joueurs problématiques, et les casinos en ligne illégaux.'] },
    { id: 'pari', refs: ['ANJ, <i>Analyse annuelle du marché des jeux d\'argent et de hasard</i>, 2023-2024 : paris sportifs en ligne, part des paris en direct, profil des joueurs.', 'La marge (overround) se lit dans les cotes elles-mêmes : 1/1,55 + 1/4,20 + 1/5,80 = 1,06, soit 6 % de commission avant le coup d\'envoi. Le cash-out est valorisé en dessous de l\'espérance du pari (voir les conditions générales des opérateurs).'] },
    { id: 'bruit', refs: ['Avantages du craps par mise : ligne de passe 1,41 %, field (2 et 12 payés double) 5,56 %, hard 8 9,09 %, any seven 16,67 % — calculs standard, par ex. Michael Shackleford, <i>The Wizard of Odds</i>, « Craps ».'] },
    { id: 'sortie', refs: ['Interdiction volontaire de jeux : demande auprès du ministère de l\'Intérieur (interdits de jeux), valable trois ans minimum, applicable aux casinos, clubs et sites agréés.', 'Joueurs Info Service — 09 74 75 13 13.'] },
    { id: 'retour', refs: ['La « valeur à vie » (customer lifetime value) et la relance des clients par SMS, courrier et hôtes sont décrites dans les manuels de marketing de casino et dans Schüll, <i>Addiction by Design</i> (le suivi des joueurs) ; en France, le démarchage des joueurs interdits est prohibé, celui des autres ne l\'est pas.'] }
  ],
  figures: [
    'Produit brut des jeux en France en 2024, près de 14 milliards d\'euros ; joueurs problématiques, 2,5 % des 18-75 ans, soit environ 1 170 000 personnes : OFDT, <i>Les jeux d\'argent et de hasard en France en 2024</i>, 2025.',
    'Recettes des casinos et part des machines à sous : ANJ, <i>Analyse annuelle du marché des jeux d\'argent et de hasard en France</i>, 2023, et ministère de l\'Intérieur (saison 2022-2023).',
    'Part du chiffre d\'affaires en ligne venant de joueurs excessifs : ANJ, rapport d\'activité 2023 (étude sur les joueurs problématiques et le PBJ en ligne).',
    'Personnes en interdiction volontaire de jeux : ministère de l\'Intérieur, fichier des interdits de jeux, chiffre 2024 repris par l\'ANJ.',
    'Probabilités des jeux de ce monde : les règles jouées sont les règles réelles (roulette à 37 cases, baccara avec la règle de la troisième carte, blackjack S17 payé 3 contre 2, roue à 54 secteurs). Les taux de redistribution des machines sont fixés dans <code>js/games.js</code> entre 85 et 90 %.'
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
