// « Zéro Vert » — the podcast of the Rien ne va plus universe.
// One source of truth: the pages in /podcast, the RSS feed and the tests are all generated from this file
// by `npm run podcast`. Facts and references come from js/content.js (REVELATIONS, WITNESSES, SOURCES):
// an episode only lists the ids it draws on, and its sources are pulled from there.
//
// To publish a recording: put the mp3 in assets/podcast/ and fill `audio` (see README, « Le podcast »).
// Until then the episode page offers the text and a synthetic reading by the browser.

export const SHOW = {
  name: 'Zéro Vert',
  tagline: 'Le podcast qui t’explique comment la maison gagne.',
  description:
    'Chaque épisode prend un mécanisme réel d’un casino, une personne réelle qui l’a vécu, et montre comment la maison gagne. ' +
    'Sans conseil pour gagner, sans sermon : des chiffres, des histoires et des sources. Un podcast de prévention par le récit, ' +
    'compagnon du jeu Rien ne va plus.',
  host: 'Théo Faucon',
  language: 'fr-FR',
  baseUrl: 'https://rien-ne-va-plus.vercel.app',
  category: 'Society & Culture',
  subcategory: 'Documentary',
  explicit: false,
  season: 1,
  seasonTitle: 'Les mécanismes',
  published: '2026-11-02',
  help: {
    name: 'Joueurs Info Service',
    phone: '09 74 75 13 13',
    hours: 'tous les jours de 8 h à 2 h, appel anonyme et non surtaxé',
    url: 'https://www.joueurs-info-service.fr/'
  }
};

export const THEMES = {
  maths: 'Les maths',
  psycho: 'Les illusions',
  histoires: 'Les histoires vraies',
  lieux: 'Les lieux',
  ligne: 'En ligne',
  aide: 'En sortir'
};

// `status`: 'published' (page + feed) or 'soon' (draft kept in the data, shown as a teaser, no page).
// `audio`: null, or { file: 'assets/podcast/xx.mp3', bytes: 12345678, seconds: 1234 }
// `sections[].v`: optional, the speaker of each paragraph of `p` (same length, 'tom' | 'arthur' | 'theo'), for episodes with several voices; the pages ignore it, the voice generation reads it.
// `experience`: optional, 'motion' = the page plays the video's motion design live on top of the audio (needs assets/podcast/<slug>.timeline.json); `poster`: the still shown before playing.
export const EPISODES = [
  {
    slug: 'bande-annonce',
    status: 'soon',
    number: 0,
    kind: 'trailer',
    title: 'Bande-annonce',
    hook: 'Trois mots, une case verte, neuf épisodes : comment la maison gagne, raconté par des gens qui l’ont vécu.',
    summary:
      'La bande-annonce de la saison un de Zéro Vert : neuf épisodes, chacun avec un mécanisme réel du casino et une histoire vraie. Des sources, pas de sermon, et aucun système pour gagner.',
    themes: ['maths', 'histoires', 'aide'],
    mechanics: ['avantage'],
    witnesses: [],
    audio: null,
    sections: [
      {
        h: 'Rien ne va plus',
        cap: 'Trois mots, puis plus rien',
        big: '0',
        p: [
          'Tu poses un jeton. La bille part. Le croupier dit trois mots : rien ne va plus.',
          'À partir de là, tu peux souffler sur tes doigts, fixer la roue très fort : plus rien de ce que tu fais ne compte. Ce qui compte a été décidé avant. Par une petite case verte, avec un zéro dessus. Elle travaille pour la maison à chaque tour, sans pause et sans mauvaise soirée.',
          'Ce podcast porte son nom. Zéro Vert. Moi, c’est Théo.'
        ],
        v: ['theo', 'theo', 'theo']
      },
      {
        h: 'Neuf épisodes',
        cap: 'Saison un, les mécanismes',
        big: '9',
        p: [
          'Moi, c’est Tom. Neuf épisodes pour voir le casino de l’autre côté du décor. La bille, et pourquoi elle n’a pas de mémoire. La zone des machines à sous. Le système infaillible, qui ne l’est jamais. Se refaire, ou comment perdre plus vite en voulant rattraper. Le seul jeu qu’on peut battre, et ce que fait la maison quand on y arrive. Une maison sans horloges. Le tapis rouge, et qui le paie. Le casino dans la poche. Et la sortie.',
          'Et moi, c’est Arthur. Avec des gens qui l’ont vécu. Un escroc qui a fait sauter la banque de Monte-Carlo. Un écrivain russe et la femme qui l’attendait. Une joueuse de Las Vegas qui ne joue pas pour gagner.'
        ],
        v: ['tom', 'arthur']
      },
      {
        h: 'La promesse',
        cap: 'Réel, sourcé, sans sermon',
        big: 'SOURCÉ',
        p: [
          'La promesse est simple. Du réel. Quand un personnage est composite ou fictif, je te le dis. Chaque chiffre est sourcé en bas de la page, pour que tu vérifies. Pas de sermon : ta soirée t’appartient. Et pas de système pour gagner. Il n’en existe pas. C’est justement le sujet.',
          'Et si le jeu prend trop de place, pour toi ou pour un proche, Joueurs Info Service répond au zéro neuf, soixante-quatorze, soixante-quinze, treize, treize, tous les jours de huit heures à deux heures, de façon anonyme et non surtaxée.',
          'Premier épisode : la bille n’a pas de mémoire. Installe-toi. Ici, c’est Zéro Vert.'
        ],
        v: ['arthur', 'arthur', 'arthur']
      }
    ],
    retenir: [
      'Neuf épisodes, neuf mécanismes réels du casino, chacun avec une histoire vraie.',
      'Aucun système pour gagner : le podcast explique pourquoi il n’en existe pas.',
      'Joueurs Info Service : 09 74 75 13 13, tous les jours de 8 h à 2 h, anonyme et non surtaxé.'
    ]
  },

  {
    slug: 'la-bille-n-a-pas-de-memoire',
    status: 'published',
    number: 1,
    title: 'La bille n’a pas de mémoire',
    hook: 'Un homme fait sauter la banque, le noir sort vingt-six fois : et c’est quand même le zéro vert qui gagne.',
    summary:
      'Charles Wells à Monte-Carlo, de la banque qui saute à la fosse commune. La division qui donne 97,3 centimes, l’espérance mathématique dite simplement, la nuit des vingt-six noirs et la loi des petits nombres. Pourquoi l’avantage de la maison est une moyenne et pas un quota, et pourquoi la bille ne se souvient de rien.',
    themes: ['maths', 'psycho', 'histoires'],
    mechanics: ['avantage', 'memoire'],
    witnesses: ['wells'],
    audio: { file: 'assets/podcast/01-la-bille-n-a-pas-de-memoire.mp3', bytes: 8107279, seconds: 494 },
    // Page « expérience motion » : la scène de la vidéo est rejouée en direct, calée sur l'audio (voir README). `poster` = instant de l'affiche (s).
    experience: 'motion',
    poster: 10.9,
    sections: [
      {
        h: 'Rien ne va plus',
        scene: 'wheel',
        cap: 'La bille est lancée',
        big: '3 MOTS',
        p: [
          'Tu poses un jeton sur le dix-sept. Le croupier lance la bille. Elle file, elle claque, elle hésite. Et lui, il lâche trois mots : rien ne va plus.',
          'Traduction : les mises sont fermées. Tu peux souffler sur tes doigts, fixer la roue très fort, négocier avec l’univers. À partir de là, c’est la bille contre la roue, et ton avis n’intéresse plus personne.',
          'Enfin, presque. Regarde bien la roue. Des cases rouges, des cases noires. Et puis une case à part. Ni rouge, ni noire. Elle est verte, elle porte un zéro, et elle bosse pour la maison à chaque tour. Pas de pause, pas de congés, jamais de mauvaise soirée. Ce podcast porte son nom. Bienvenue dans Zéro Vert.',
          'Le principe : un mécanisme réel du casino. Une histoire vraie. Et les sources en bas de la page, pour que tu vérifies. Pas de système pour gagner : il n’en existe pas. Pas de sermon non plus : ta soirée t’appartient. Je veux juste que tu saches qui est assis en face de toi.',
          'Au programme aujourd’hui : un escroc qui a fait sauter la banque de Monte-Carlo, une division que le casino adore, une nuit où le noir est sorti vingt-six fois de suite. Et une question qui a l’air bête. Est-ce que la bille se souvient ? Spoiler : non.'
        ]
      },
      {
        h: 'Il a fait sauter la banque',
        scene: 'wells',
        cap: 'Monte-Carlo, juillet 1891',
        big: '1 M FRANCS',
        p: [
          'L’histoire de Charles Wells, c’est une série en quatre saisons. Saison un : juillet 1891, Monte-Carlo. Wells entre au casino. Il en ressort avec un million de francs. Il a fait sauter la banque. Douze fois.',
          'En vrai, faire sauter la banque, c’est vider la caisse d’une table, pas celle du casino. Drap noir sur la table, on va chercher de l’argent au coffre, et ça repart. Le casino n’a pas fermé une heure. Mais les journaux s’enflamment, de Londres à New York, et une chanson naît : L’homme qui a fait sauter la banque à Monte-Carlo.',
          'Il jure aux journalistes qu’il a un système. Et il cache un secret : l’argent qu’il joue n’est pas à lui. Il vient d’investisseurs anglais qui croient financer ses inventions.',
          'Saison deux : il revient en novembre, et il gagne encore. Saison trois : 1892. Il débarque en yacht, acheté avec l’argent des autres. À bord, une maîtresse et un orchestre. Oui, un orchestre. Cette fois, il perd tout. En quelques jours.',
          'Saison quatre, la moins glamour. Arrestation. Extradition. Procès à Londres en 1893. Huit ans de prison. À sa sortie, il recommence en France, sous un autre nom. Condamné encore. Il meurt en 1922, sans un sou, dans une fosse commune.',
          'Son système a marché onze jours en juillet et cinq en novembre. Un système qui marche seize jours et échoue le reste d’une vie, ça s’appelle une série. Et tout le monde se souvient de la chanson. Personne de la fosse commune. Pour le casino, c’est de la publicité gratuite.'
        ]
      },
      {
        h: 'Trente-six sur trente-sept',
        scene: 'pockets',
        cap: 'Le zéro change tout',
        big: '97,3 ¢',
        p: [
          'Alors, comment la maison gagne sans tricher ? Pas d’aimant sous la table, pas de croupier véreux. Il suffit de compter les cases. Trente-sept : de un à trente-six, plus le zéro. Le vert.',
          'Tu mets un euro sur un numéro. S’il sort, le casino te paie trente-cinq contre un. Ton euro revient, plus trente-cinq : trente-six en tout. Ça a l’air juste. Sauf que tu avais une chance sur trente-sept. Pas sur trente-six.',
          'Imagine. Un euro sur chacune des trente-sept cases. Trente-sept euros sur le tapis. Une case gagne forcément, donc tu gagnes à coup sûr. Le casino te rend trente-six euros. Bravo : tu as gagné, et tu as perdu un euro.',
          'Trente-six divisé par trente-sept : pour chaque euro misé, tu récupères en moyenne 97,3 centimes. Les 2,7 centimes qui manquent, c’est l’avantage de la maison. Les matheux appellent ça l’espérance mathématique. En clair : ce que rapporte une mise en moyenne, si on la rejouait un nombre énorme de fois. À la roulette, elle est négative. Pour toi. Et elle n’existe qu’à cause du zéro.',
          'Sur le rouge, c’est pareil : le zéro le fait perdre comme le noir. Exemple : dix euros par tour, pendant mille tours. Ça fait dix mille euros misés. En moyenne, environ deux cent soixante-dix restent à la maison.',
          'Et la roulette américaine ? Elle ajoute un double zéro. L’avantage grimpe à 5,26 pour cent. Même bille, même roue. Deux fois plus de vert.'
        ]
      },
      {
        h: 'Une moyenne, pas un quota',
        scene: 'average',
        cap: 'Tu peux gagner ce soir',
        big: '2,7 %',
        p: [
          'Attention, piège. Un avantage de 2,7 pour cent ne veut pas dire que tu perds 2,7 pour cent ce soir. C’est une moyenne. Pas un quota.',
          'Prends une pièce. Pile ou face, une chance sur deux. Lance-la dix fois. En moyenne, ça fait cinq piles. Mais le cinq-cinq parfait, tu ne l’obtiens qu’environ une fois sur quatre. Le reste du temps, ça penche. Sept-trois, deux-huit, ça arrive sans arrêt. La moyenne ne dit pas ce qui va se passer ce soir. Elle dit où ça se tasse, à la longue.',
          'La roulette, c’est pareil, avec un petit poids en plus du côté de la maison. Mise sur le rouge pendant cent tours : un peu plus d’une fois sur trois, tu finis devant. Sur mille tours, moins d’une fois sur cinq. Sur dix mille tours, environ trois fois sur mille. Plus ça dure, plus le zéro se fait entendre.',
          'Donc oui, ce soir, tu peux gagner. Pour de vrai. Et c’est exactement pour ça que ça accroche. On gagne assez souvent pour y croire. Le gain de ce soir, c’est l’hameçon.',
          'Le casino, lui, ne joue pas une soirée. Il joue tous les soirs, à toutes les tables. Ta soirée gagnante ne l’inquiète pas : elle se noie dans toutes les autres. Et l’avantage s’applique à chaque jeton. Plus on mise, plus la moyenne travaille. Sans tricher. Sans malchance. Juste la moyenne.'
        ]
      },
      {
        h: 'Vingt-six noirs',
        scene: 'streak',
        cap: 'Monte-Carlo, 18 août 1913',
        big: '26 NOIRS',
        p: [
          'Retour à Monte-Carlo. Le 18 août 1913, le noir sort. Puis encore. Puis encore. Vingt-six fois de suite. L’histoire est racontée par l’auteur Darrell Huff, dans un livre de 1959.',
          'Autour de la table, ça s’excite. Après dix noirs, le rouge est forcément dû. Après quinze, c’est sûr. Après vingt, c’est une évidence. Tout le monde mise rouge. La salle perd des millions.',
          'Sauf que la bille n’a pas de mémoire. Elle ne sait pas ce qu’elle a fait il y a une minute. Au tour suivant, le rouge a dix-huit chances sur trente-sept. Comme au premier tour. Comme toujours. Croire le contraire, ça a un nom : le sophisme du joueur.',
          'En 1971, deux psychologues, Amos Tversky et Daniel Kahneman, mettent un nom savant sur ce réflexe. Leur article s’intitule : la croyance en la loi des petits nombres. L’idée : on attend d’une courte série qu’elle ressemble déjà à la moyenne. Dix noirs, ce n’est pas moitié-moitié, donc le rouge devrait rattraper. Sauf que la roue ne rattrape rien.',
          'Et le casino entretient le réflexe. Au-dessus de la table, un tableau affiche les derniers numéros sortis. Il ne prédit rien. Il est là pour nourrir ton intuition et faire monter les mises. Tu connais la phrase du joueur : je sens que ça vient. Réponse honnête : ça vient depuis 1913.',
          'Une série pareille, à partir d’un tour donné, c’est à peu près une chance sur cent trente-sept millions. Mais quand elle arrive, elle ne change rien au tour d’après.'
        ]
      },
      {
        h: 'Le zéro ne perd jamais',
        scene: 'outro',
        cap: 'Le zéro, c’est la marge',
        big: '0',
        p: [
          'Wells a gagné un million. La salle de 1913 a perdu des millions. Dans les deux cas, la roue n’a rien fait de spécial. Elle a tourné.',
          'Wells croyait à son système. Les joueurs de 1913 croyaient à une série. Ni l’un ni l’autre n’existait. Ce qui existe, c’est une case qui fait payer trente-cinq contre un sur trente-sept cases. Tu peux lui prendre une bataille. Wells l’a fait. La guerre, elle l’avait gagnée avant que tu t’assoies.',
          'Tu entendras aussi, à la table : le zéro sort toujours quand je mise gros. Non. Le zéro sort une fois sur trente-sept, comme les autres. Mais il n’a même pas besoin de sortir pour travailler. Il est déjà dans le prix : trente-cinq contre un, au lieu des trente-six qu’il faudrait pour un jeu équitable.',
          'Prochain épisode : La zone. Les machines à sous, et Mollie, une joueuse de Las Vegas qui ne joue pas pour gagner, mais pour que ça ne s’arrête pas.',
          'Et si le jeu prend trop de place, chez toi ou chez quelqu’un que tu aimes, Joueurs Info Service répond au zéro neuf, soixante-quatorze, soixante-quinze, treize, treize, tous les jours, anonymement.',
          'D’ici là, la prochaine fois que tu entends rien ne va plus, oublie le tableau des derniers numéros. Regarde la case verte. La bille n’a pas de mémoire. Le zéro, lui, n’oublie aucun jeton. C’était Zéro Vert.'
        ]
      }
    ],
    retenir: [
      'Pour un euro misé, la roulette européenne rend en moyenne 97,3 centimes. Le reste, c’est le zéro vert.',
      'L’avantage de la maison est une moyenne, pas un quota : tu peux gagner ce soir, le casino gagne sur la durée.',
      'Une série n’est pas un signal. La bille n’a pas de mémoire.'
    ]
  },

  {
    slug: 'la-zone',
    status: 'published',
    number: 2,
    title: 'La zone',
    hook: 'Une joueuse qui déteste gagner, une machine qui fête tes pertes, et un jackpot de 42 millions à 2,25 $.',
    summary:
      'Les machines à sous vues de l’intérieur : le temps sur machine, les presque-gagnés, les pertes déguisées en gains. Avec Mollie, suivie par une anthropologue à Las Vegas, et Katrina Bookman, face à un jackpot qui n’existait pas.',
    themes: ['psycho', 'histoires', 'lieux', 'maths'],
    mechanics: ['zone', 'ldw'],
    witnesses: ['mollie', 'bookman'],
    audio: { file: 'assets/podcast/02-la-zone.mp3', bytes: 7819299, seconds: 489 },
    experience: 'motion',
    poster: 11.5,
    sections: [
      {
        h: 'Deux femmes, deux écrans',
        cap: 'Deux écrans, deux histoires',
        big: '42 M$',
        p: [
          'Août 2016, dans le Queens, à New York. Une femme fixe l’écran d’une machine à sous. Il affiche quarante-deux millions neuf cent quarante-neuf mille six cent soixante-douze dollars et soixante-seize cents. Elle sort son téléphone. Elle se prend en photo devant.',
          'Quelques années plus tôt, à Las Vegas. Une autre femme, une autre machine. Elle, quand l’écran annonce un gros gain, elle soupire. Un gros gain l’agace. Ça interrompt.',
          'La première, on va lui proposer un steak. La deuxième ne joue pas pour gagner. Et entre les deux, il y a à peu près tout ce qu’une machine à sous sait faire de toi.',
          'Bienvenue dans Zéro Vert. La dernière fois, on était à la roulette : trente-sept cases, une case verte, et une bille qui n’a pas de mémoire. Aujourd’hui, on change de salle. On passe chez les machines. Là-bas, pas de croupier, pas de bille, pas de roue. Et pas de case verte non plus. Enfin, pas de case verte que tu peux voir.',
          'Au programme : une joueuse qui cherche la zone, un écran qui fait la fête quand tu perds, et un jackpot de quarante-deux millions qui valait deux dollars vingt-cinq. Comme d’habitude : des faits réels, les sources en bas de la page, et aucun système pour gagner. Installe-toi. Pas trop confortablement, quand même. C’est justement le sujet.'
        ]
      },
      {
        h: 'Mollie',
        cap: 'Las Vegas, années 2000',
        big: 'LA ZONE',
        p: [
          'Commençons par Las Vegas. Elle s’appelle Mollie. Enfin, c’est le nom qu’on lui donne. Mollie est une personne réelle, mais Mollie est un pseudonyme. C’est l’une des joueuses que l’anthropologue Natasha Dow Schüll a suivies pendant quinze ans, à Las Vegas. Le livre qui en est sorti, en deux mille douze, s’appelle Addiction by Design. En gros : l’addiction, conçue exprès.',
          'Mollie travaille à l’accueil d’un hôtel, à deux rues du casino. Ses pauses, ses soirées, ses jours de repos, elle les passe au même endroit. Toujours la même machine : la troisième de la rangée. Si quelqu’un est assis dessus, elle attend qu’il parte. Pas une autre machine. Celle-là.',
          'Ce qu’elle raconte à Schüll retourne tout ce qu’on croit savoir sur le jeu. Mollie ne joue pas pour gagner. Elle joue pour entrer dans ce qu’elle appelle la zone. Un état où plus rien n’existe : ni l’heure, ni l’argent, ni son propre corps. Juste le tour suivant. Puis le suivant.',
          'Alors un gros gain, pour elle, c’est une panne. Il faut attendre qu’un employé arrive, signer un papier, sourire. Ensuite, elle rejoue tout, pour retrouver la zone. Le jackpot n’est pas la récompense. C’est l’interruption.',
          'Et pourquoi la troisième de la rangée ? Une machine ne sait pas qui est assis devant elle. Elle ne t’aime pas, elle ne te déteste pas, elle ne te reconnaît pas. Mais la zone n’a pas besoin que ce soit vrai.'
        ]
      },
      {
        h: 'Trois secondes',
        cap: 'Le temps sur machine',
        big: '1 200 / H',
        p: [
          'Maintenant, regarde la machine depuis l’autre côté. Du côté de ceux qui la conçoivent. Le chiffre qui compte pour eux, ce n’est pas combien tu perds par tour. C’est combien de temps tu restes. L’industrie a un nom pour ça : le temps sur machine.',
          'Un tour toutes les trois secondes. Ça fait vingt tours par minute. Mille deux cents par heure. Pas de croupier à attendre, pas de bille qui roule, pas de pause entre deux parties. Un siège confortable. Et une main qui ne quitte jamais le bouton.',
          'Pour que la main reste sur le bouton, il y a le presque. Deux symboles gagnants alignés. Le troisième s’arrête juste au-dessus de la ligne. Tu l’avais presque. Sauf que les machines affichent ces presque plus souvent que le hasard ne le ferait. Ils ne tombent pas par accident. Ils font partie du réglage.',
          'Les chercheurs s’y intéressent depuis longtemps. En mille neuf cent quatre-vingt-six, un chercheur nommé Reid publie un article sur la psychologie du presque-gagné. En deux mille neuf, l’équipe de Luke Clark regarde ce qui se passe dans le cerveau des joueurs, et publie ses résultats dans la revue Neuron. Verdict : un presque-gagné active des circuits du cerveau liés au gain. Et il donne envie de rejouer.',
          'Relis bien. Un presque-gagné, c’est une perte. Ton crédit baisse. Mais ton cerveau le range dans la case encouragement. C’est comme un prof qui te rend une copie à zéro sur vingt, avec écrit en rouge : presque ! Et toi, tu repars motivé.'
        ]
      },
      {
        h: 'Gagner en perdant',
        cap: 'La fanfare ment',
        big: '−1,20 €',
        p: [
          'Deuxième tour de magie. Celui-là a été mesuré à l’université de Waterloo. Pas la bataille. L’université.',
          'Une machine moderne joue plusieurs lignes à la fois. Disons vingt. Tu mises deux euros par tour, dix centimes par ligne. Les rouleaux tournent. Une ligne gagne : quatre-vingts centimes. Et là, tout s’allume. Ça sonne, ça clignote, l’écran affiche gain en lettres d’or.',
          'Fais le compte. Tu as misé deux euros. Tu en récupères quatre-vingts centimes. Tu viens de perdre un euro vingt. Avec une fanfare. À la roulette, quand tu perds, le croupier ratisse tes jetons et personne ne joue de la trompette. Ici, on t’applaudit pendant qu’on te fait les poches.',
          'Ce tour a un nom : les pertes déguisées en gains. Mike Dixon et ses collègues le décrivent en deux mille dix, dans la revue Addiction. Ils mesurent les réactions du corps des joueurs pendant ces faux gains. Résultat : le corps s’emballe presque comme pour un vrai gain. Et après la séance, les joueurs surestiment le nombre de fois où ils ont gagné.',
          'Logique. Ta mémoire ne retient pas le compteur. Elle retient la musique. Une soirée pleine de fanfares ressemble à une soirée de gagnant, même quand le solde dit le contraire.',
          'Le seul témoin honnête dans tout ce vacarme, c’est le compteur de crédits, en bas de l’écran. Lui ne danse pas. Lui ne chante pas. Il descend.'
        ]
      },
      {
        h: 'Quarante-deux millions',
        cap: 'Queens, 23 août 2016',
        big: '42 949 672',
        p: [
          'Retour dans le Queens. Le vingt-trois août deux mille seize, au Resorts World Casino. Katrina Bookman joue sur une machine à un cent. Et l’écran s’arrête sur ce nombre : quarante-deux millions neuf cent quarante-neuf mille six cent soixante-douze dollars et soixante-seize cents. Elle se prend en photo devant. Elle pense à ses quatre enfants. À la maison qu’elle va pouvoir acheter. Le personnel la raccompagne et lui dit de revenir le lendemain.',
          'Le lendemain, changement d’ambiance. Le casino parle de dysfonctionnement. D’après lui, cette machine ne pouvait pas payer plus de six mille cinq cents dollars. Et le règlement, imprimé en petit sur la machine, dit qu’une panne annule tous les paiements et toutes les parties.',
          'Ce qu’on lui propose à la place : ce que son tour avait vraiment rapporté. Deux dollars vingt-cinq. Plus un repas. Un steak. Elle porte plainte contre le casino, et l’histoire fait le tour de la presse, jusqu’au journal britannique The Guardian.',
          'Et ce nombre bizarre ? Il ne tombe pas du ciel. Prends deux puissance trente-deux, compte-le en centimes : ça fait quarante-deux millions neuf cent quarante-neuf mille six cent soixante-douze dollars et quatre-vingt-seize cents. À vingt centimes près, le jackpot de Katrina. Or deux puissance trente-deux, c’est pile la limite d’un compteur informatique très courant. Bref, ça ressemble furieusement à un compteur qui déborde. Pas à un jackpot.',
          'Retiens la morale. L’écran affichait quarante-deux millions. Le règlement disait six mille cinq cents dollars maximum. Devine lequel le casino a écouté. Et note l’ironie : pour une fois, l’écran exagérait dans ton sens. D’habitude, c’est l’inverse. Il fait la fête pendant que tu perds.'
        ]
      },
      {
        h: 'La case verte invisible',
        cap: 'Le zéro est dans le programme',
        big: '85 %',
        p: [
          'Alors, où est la case verte, sur une machine ? Elle est dans le programme. Elle s’appelle le taux de redistribution : la part des mises rendue en moyenne. En France, d’après l’arrêté du quatorze mai deux mille sept, il doit être d’au moins quatre-vingt-cinq pour cent. Traduction : la machine peut légalement garder jusqu’à quinze centimes par euro misé. À la roulette, le zéro en gardait deux virgule sept. Ici, la case verte peut être plus de cinq fois plus grosse.',
          'Maintenant, le temps. Un euro par tour, mille deux cents tours par heure : mille deux cents euros misés. Au minimum légal, il en reste en moyenne cent quatre-vingts à la maison. Par heure. Et pas besoin d’avoir cette somme sur toi : tes petits gains repartent dans la machine, qui en garde un morceau à chaque passage.',
          'Mollie savait quand elle sortait de la zone : quand il n’y avait plus de crédits. La machine ne cherche pas à te battre vite. Elle cherche à te garder.',
          'Prochain épisode : le système infaillible. Dostoïevski, persuadé d’avoir trouvé le secret de la roulette, et Anna, qui l’attendait dans la chambre.',
          'Et si le jeu prend trop de place, pour toi ou pour quelqu’un que tu aimes, Joueurs Info Service répond au zéro neuf, soixante-quatorze, soixante-quinze, treize, treize, tous les jours de huit heures à deux heures, de façon anonyme et non surtaxée.',
          'Si une machine te fait la fête, regarde le compteur. Ici, la case verte ne se voit pas, et elle ne fait jamais de pause. C’était Zéro Vert.'
        ]
      }
    ],
    retenir: [
      'Une machine à sous n’est pas réglée pour te faire perdre vite, mais pour te faire rester.',
      'Un presque-gagné est une perte. Une fanfare sur un gain plus petit que ta mise aussi.',
      'En France, une machine peut garder jusqu’à 15 centimes par euro : la case verte est dans le programme.'
    ]
  },

  {
    slug: 'le-systeme-infaillible',
    status: 'published',
    number: 3,
    title: 'Le système infaillible',
    hook: 'Dostoïevski croyait avoir trouvé le secret de la roulette. Anna, elle, comptait les heures dans la chambre.',
    summary:
      'Dostoïevski, de Wiesbaden à Baden-Baden : le roman dicté en vingt-six jours, l’alliance mise en gage, l’attente d’Anna. Puis la martingale, ses deux murs, et l’illusion de contrôle d’Ellen Langer.',
    themes: ['maths', 'psycho', 'histoires'],
    mechanics: ['systeme'],
    witnesses: ['dosto', 'anna'],
    audio: { file: 'assets/podcast/03-le-systeme-infaillible.mp3', bytes: 8061731, seconds: 504 },
    experience: 'motion',
    poster: 276,
    sections: [
      {
        h: 'Une heure',
        cap: 'Wiesbaden, 1863',
        big: '10 000 F',
        p: [
          'Wiesbaden, en Allemagne, mille huit cent soixante-trois. Un écrivain russe s’assoit pour la première fois à une table de roulette. En une heure, il gagne dix mille francs. Une heure.',
          'Il s’appelle Fiodor Dostoïevski. Et ce jour-là, il tire de cette heure une conclusion fatale : il a trouvé le secret. Le secret, c’est le sang-froid. Ne jamais s’emballer. Garder la tête froide, et la roulette paie. Il l’écrit même à sa belle-sœur, avec l’assurance d’un mathématicien qui vient de résoudre une équation.',
          'Il a tort. Et cette heure-là va lui coûter huit ans. Huit ans de tables, de dettes, d’objets mis en gage et de serments. Jusqu’à une nuit d’avril mille huit cent soixante et onze où quelque chose, enfin, lâche.',
          'Bienvenue dans Zéro Vert. Il y a deux épisodes, on a vu que la bille n’a pas de mémoire. La dernière fois, que la machine à sous veut surtout que tu restes. Aujourd’hui, on s’attaque au rêve le plus coriace du joueur : le système. La méthode. Le truc qui marche.',
          'Avec un génie de la littérature qui y a cru dur comme fer. Avec la femme qui l’attendait, et qui a tout noté. Et avec une question : pourquoi des gens très intelligents croient-ils qu’on peut battre une roue qui ne sait même pas qu’ils existent ? Spoiler, comme d’habitude : la roue gagne. Mais le comment est passionnant.'
        ]
      },
      {
        h: 'Vingt-six jours',
        cap: 'Octobre 1866, un roman dicté',
        big: '26 JOURS',
        p: [
          'Octobre mille huit cent soixante-six. Dostoïevski est ruiné. Et il a signé avec un éditeur un contrat très dangereux : s’il rate l’échéance, l’éditeur pourra prendre tous ses futurs livres. Tous. Il lui reste vingt-six jours pour livrer un roman entier.',
          'Alors il a une idée. Il engage une sténographe. La sténo, c’est l’art d’écrire aussi vite que les gens parlent. Elle s’appelle Anna Grigorievna. Elle a vingt ans.',
          'Il dicte. Elle note. Jour après jour. Le roman s’appelle Le Joueur. L’histoire d’un homme et d’une roulette. Dostoïevski y décrit la fièvre du jeu de l’intérieur, comme peu d’écrivains l’ont jamais fait. Normal : il écrit sur ce qu’il vit.',
          'Le livre est rendu à temps. Vingt-six jours. Et quelques mois plus tard, la sténographe devient sa femme. Oui : il a rencontré sa femme à cause d’une dette de jeu. Ne prends pas ça pour une technique de drague.',
          'Mais voilà le paradoxe de cette histoire. À ce moment-là, Dostoïevski sait tout du jeu. Il connaît la fièvre, les serments, les rechutes. Il vient d’en faire un livre entier. Le roman est un chef-d’œuvre. Il n’a rien réglé.',
          'Retiens ça, parce qu’on va le recroiser toute la saison : savoir ne protège pas. On peut connaître le piège par cœur, l’avoir décrit mieux que personne, et marcher dedans quand même.'
        ]
      },
      {
        h: 'Celle qui attend',
        cap: 'Baden-Baden, été 1867',
        big: 'L’ALLIANCE',
        p: [
          'Été mille huit cent soixante-sept. Fiodor et Anna arrivent à Baden-Baden, une autre ville allemande à casino. Ils sont mariés depuis quatre mois. Il perd dès le premier jour.',
          'Ensuite, tout va très vite. Il met en gage l’alliance d’Anna. Puis ses boucles d’oreilles. Puis sa robe. Puis son propre manteau. Ils finissent dans deux chambres au-dessus d’une forge, où le marteau commence à cinq heures du matin. Plus besoin de réveil. De toute façon, il n’y aurait plus rien pour en payer un.',
          'Anna tient un journal. En sténographie. C’est pratique : Fiodor ne peut pas le lire. Elle y note tout. Les objets mis en gage, l’attente, les serments. Bien plus tard, elle en tirera des mémoires.',
          'Le schéma se répète, encore et encore. Il part à la table. Il perd. Il revient, il pleure, il jure que c’est fini. Il repart. Et chaque fois, il a une explication : il s’est emballé, il a perdu son sang-froid. Le système, lui, n’est jamais en cause.',
          'Un jour de novembre, il lui écrit qu’il a perdu les dernières pièces d’or. Il lui demande pardon. Puis il lui demande de l’argent. Elle envoie les deux.',
          'Ce que ce journal raconte, et que les romans racontent rarement, c’est l’autre côté de la table. Celle qui attend. Qui compte les heures, et les pièces. Le joueur n’est jamais le seul à payer.'
        ]
      },
      {
        h: 'La martingale',
        cap: 'Doubler après chaque perte',
        big: '10 230 €',
        p: [
          'Le système de Dostoïevski, c’était le calme. Le plus célèbre du monde, lui, s’appelle la martingale. Tu l’as peut-être entendu au bar : je double à chaque perte, impossible de perdre.',
          'Le principe. Tu mises dix euros sur le rouge. Tu perds ? Tu doubles : vingt. Puis quarante. Puis quatre-vingts. Quand le rouge sort, tu récupères toutes tes pertes, plus tes dix euros de départ. Et le rouge finit toujours par sortir. Sur le papier, imparable.',
          'Sauf que deux murs t’attendent. Ton argent. Et le plafond de la table : au-delà d’une certaine mise, le casino refuse. Or la martingale grimpe vite. Après dix pertes d’affilée, tu as déjà perdu dix mille deux cent trente euros. La onzième mise devrait être de dix mille deux cent quarante. Tout ça pour gagner dix euros.',
          'Dix rouges perdus d’affilée, c’est rare : environ une chance sur huit cents. Mais joue soir après soir, et le rare finit par arriver. Fais le bilan. Pour une catastrophe, tu encaisses en moyenne à peu près huit cents petites victoires de dix euros, environ huit mille euros. Puis la catastrophe t’en reprend dix mille deux cent trente. Plus de deux mille euros de perte.',
          'La martingale ne bat pas l’avantage de la maison. Elle le déguise : les petites pertes deviennent rares, et la grosse perte presque certaine, à la longue. Sur chaque mise, l’espérance reste moins deux virgule sept pour cent. Le zéro vert ne lit pas ton plan de mises. Il prend sa part sur chacune.',
          'Le pire ? Ça marche. Au début.'
        ]
      },
      {
        h: 'L’illusion de contrôle',
        cap: 'Choisir ne change rien',
        big: '1975',
        p: [
          'Alors pourquoi on y croit ? Pourquoi un génie qui vient d’écrire un roman sur le sujet croit-il encore à un système ? Une psychologue a une bonne partie de la réponse. Elle s’appelle Ellen Langer. En mille neuf cent soixante-quinze, elle publie un article au titre parfait : l’illusion de contrôle.',
          'Son expérience est d’une simplicité désarmante. Elle propose des billets de loterie. Certains participants choisissent leur billet eux-mêmes. Les autres le reçoivent, tout simplement. Ensuite, elle propose de leur racheter. Ceux qui avaient choisi leur billet en demandent beaucoup plus cher. Même loterie. Mêmes chances. Mais choisir donne le sentiment d’avoir pesé sur le résultat.',
          'C’est ça, l’illusion de contrôle. Choisir son numéro. Lancer les dés soi-même. Appuyer sur stop au bon moment. Doubler après une perte. Autant de gestes qui te donnent un rôle. Et autant de gestes dont le tirage se fiche complètement.',
          'Le système de Dostoïevski, c’était l’illusion de contrôle à l’état pur. Le hasard devient une affaire de caractère : si je reste calme, je gagne. Et regarde le piège. S’il gagne, le système marche. S’il perd, c’est qu’il s’est emballé, donc le système marche aussi. Aucun résultat ne peut lui donner tort. On ne sort pas de ce piège par la logique.',
          'Au casino, tu entendras souvent : j’ai un système sur les douzaines. Et le voisin qui répond : tout le monde a un système. C’est vrai. Les systèmes ne diffèrent que par la façon dont ils perdent. Petit à petit, ou d’un seul coup.'
        ]
      },
      {
        h: 'Une grande chose',
        cap: 'Wiesbaden, avril 1871',
        big: '1871',
        p: [
          'Avril mille huit cent soixante et onze. Wiesbaden, encore. Là où tout avait commencé. Une dernière nuit à la table. Puis Dostoïevski écrit à Anna une lettre, avec cette phrase : « Une grande chose s’est accomplie en moi. » Elle a déjà entendu beaucoup de serments. Mais cette fois, il tient. Il ne rejouera plus jamais.',
          'Ce n’est pas un calcul qui l’a arrêté. Pas un système. Huit ans de roulette, et la porte se ferme sans aucune martingale. Anna, elle, finit par tenir les comptes de la famille et par éditer les livres de son mari. Celle qui attendait dans la chambre devient celle qui sauve la maison.',
          'Il existe bien un système qui marche à tous les coups. Il s’appelle l’avantage de la maison, et il appartient au casino. Tous les autres sont des façons de lui donner ton argent avec le sentiment d’avoir un plan.',
          'Et retiens ça : en mille huit cent soixante-sept, il n’existait aucun numéro pour Anna. Aujourd’hui, il y en a un, et il répond aussi aux proches.',
          'Prochain épisode : se refaire. Un homme a transformé cinquante dollars en quarante millions. Puis il a voulu se refaire. Si le jeu prend trop de place, pour toi ou pour quelqu’un que tu attends, Joueurs Info Service répond au zéro neuf, soixante-quatorze, soixante-quinze, treize, treize, tous les jours de huit heures à deux heures, de façon anonyme et non surtaxée.',
          'D’ici là, méfie-toi des systèmes infaillibles. Le seul qui existe est vert, il a un zéro dessus, et il ne joue pas pour toi. C’était Zéro Vert.'
        ]
      }
    ],
    retenir: [
      'Doubler après chaque perte ne bat pas l’avantage de la maison : la martingale retarde la perte et la grossit.',
      'Choisir son numéro ou son moment donne un sentiment de contrôle, pas une meilleure chance.',
      'Savoir ne protège pas. Et le joueur n’est jamais le seul à payer.'
    ]
  },

  {
    slug: 'se-refaire',
    status: 'published',
    number: 4,
    title: 'Se refaire',
    hook: 'Il a transformé cinquante dollars en quarante millions. Puis il a voulu se refaire.',
    summary:
      'Archie Karas, de cinquante dollars à environ quarante millions, puis à zéro. La chasse selon Henry Lesieur, le critère des psychiatres, et le calcul qui montre pourquoi miser plus pour rattraper fait perdre plus vite.',
    themes: ['psycho', 'histoires', 'maths'],
    mechanics: ['refaire'],
    witnesses: ['karas'],
    audio: { file: 'assets/podcast/04-se-refaire.mp3', bytes: 7690571, seconds: 481 },
    experience: 'motion',
    poster: 106.3,
    sections: [
      {
        h: 'Je m’arrête à zéro',
        cap: 'Juste pour rattraper',
        big: '−40 €',
        p: [
          'Tu connais forcément la phrase. Elle se dit devant une machine, à voix basse : je suis à moins quarante, je m’arrête à zéro. Et quelqu’un, à côté, glisse : il est là depuis midi.',
          'Elle a l’air raisonnable, cette phrase. Presque sage. Tu ne demandes rien au casino. Pas de jackpot, pas de yacht. Tu veux juste repartir avec ce que tu avais en arrivant. Il y a un mot pour ça. Se refaire. Ça sonne comme une marche arrière. C’est souvent un accélérateur.',
          'Bienvenue dans Zéro Vert. Ici, chaque épisode démonte un mécanisme réel du casino, avec une histoire vraie et des sources que tu peux vérifier. Pas de système pour gagner : il n’en existe pas. Pas de sermon non plus. Juste le décor, vu de l’autre côté.',
          'Aujourd’hui, le mot le plus dangereux du vocabulaire du joueur. Avec un homme qui a transformé cinquante dollars en quarante millions. Personne, semble-t-il, n’avait jamais fait ça. Et puis un soir, il a perdu gros. Et il a voulu se refaire.',
          'On va aussi répondre à une question qui a l’air simple. Quand tu as perdu, est-ce que miser plus t’aide à revenir à zéro ? Réponse courte : non. C’est même l’inverse. Et ce n’est pas une opinion. C’est une soustraction. On la fera ensemble, promis, avec des chiffres ronds et sans calculatrice.'
        ]
      },
      {
        h: 'Cinquante dollars',
        cap: 'Las Vegas, décembre 1992',
        big: '50 $',
        p: [
          'L’histoire d’Archie Karas, c’est une série en trois saisons. Saison un : la montée. Décembre mille neuf cent quatre-vingt-douze. Il arrive à Las Vegas avec cinquante dollars en poche. La semaine d’avant, à Los Angeles, il a tout perdu. Il ne lui reste rien. Sauf l’envie de jouer.',
          'D’abord le poker, contre un joueur qu’il connaît. Il gagne. Puis le billard, à des sommes qui font peur. Il gagne encore. Puis les dés, avec les mises maximales, plusieurs à la fois. Le casino relève ses plafonds pour lui. Il transporte ses jetons dans des sacs. Il dort deux heures par nuit.',
          'Deux ans et demi plus tard, il a environ quarante millions de dollars. Fais le calcul : ses cinquante dollars ont été multipliés par huit cent mille. Le journaliste Michael Konik raconte cette série en mille neuf cent quatre-vingt-seize, dans le magazine Cigar Aficionado. La série, on l’appelle le Run. Lui, on le surnomme le Grec.',
          'Maintenant, écoute bien, parce que tout se joue là. Ce que Karas vient d’apprendre, ce n’est pas comment gagner. C’est que c’est possible. Il l’a fait une fois. Donc il peut le refaire. Voilà la graine. Pas une stratégie. Un souvenir.',
          'Et ce raisonnement, tu le connais, en plus petit. Le premier gain d’une soirée. Le billet sorti d’une machine le premier soir. Tout joueur a son Run, à sa taille. La bille n’a pas de mémoire. Le joueur, lui, se souvient de tout. Surtout de ce qui a marché.'
        ]
      },
      {
        h: 'Onze millions en une nuit',
        cap: 'Janvier 1995',
        big: '11 M$',
        p: [
          'Saison deux : la chute. Janvier mille neuf cent quatre-vingt-quinze. Karas perd onze millions de dollars en une nuit, aux dés. Plus d’un quart de sa fortune. En une seule nuit.',
          'Comment on perd onze millions en une nuit ? Comme on en perd cent : une mise après l’autre. Sauf que quand tu possèdes quarante millions, une mise de deux cent mille dollars a l’air petite. À ton échelle, c’est comme miser deux euros cinquante quand tu en as cinq cents. L’échelle bouge avec toi. Le pourcentage, lui, ne bouge jamais.',
          'Et le lendemain ? Il revient. Pour se refaire. C’est lui-même qui le raconte. Il ne cherche pas à gagner davantage. Il veut juste retrouver la nuit d’avant. Il passe au baccara. Dix-sept millions de plus s’évaporent. Trois semaines plus tard, il ne reste rien. Quarante millions, aller simple vers zéro.',
          'Saison trois : la boucle. Karas rejoue toute sa vie, par cycles. Un million, zéro. Un million, zéro. En deux mille treize, il est arrêté pour avoir marqué des cartes dans un casino de Californie. Il finit sur la liste noire du Nevada. Il meurt en deux mille vingt-quatre, sans fortune.',
          'Il n’y a pas de saison quatre. Pas de rédemption au ralenti, pas de musique triste. Juste un homme qui, pendant presque trente ans, a essayé de revenir là où il était en janvier mille neuf cent quatre-vingt-quinze. Il n’a jamais arrêté de se refaire. Il a seulement changé de table.'
        ]
      },
      {
        h: 'La chasse',
        cap: 'Un critère officiel',
        big: '9 CRITÈRES',
        p: [
          'Pourquoi revenir le lendemain ? Pourquoi ne pas s’arrêter avec ce qu’il reste ? Parce que perdre fait mal. Mais perdre et s’arrêter fait encore plus mal. Tant que tu joues, la perte est provisoire. Elle est en attente. Le jour où tu te lèves, elle devient définitive. Elle devient vraie.',
          'Alors on rejoue. Juste pour rattraper. Le sociologue Henry Lesieur a donné un nom à ça dès mille neuf cent soixante-dix-sept, dans un livre sur la carrière du joueur compulsif. Il l’appelle la chasse. Le joueur ne court plus après un gain. Il court après ce qu’il a perdu. Ce n’est pas un défaut de caractère. C’est un mécanisme, décrit et classé.',
          'Et ce n’est pas qu’une image. En deux mille treize, le manuel de référence des psychiatres américains, dans sa cinquième édition, liste neuf critères du trouble lié au jeu d’argent. L’un d’eux dit, en substance : après avoir perdu de l’argent au jeu, retourner souvent jouer pour se refaire. Neuf critères. Se refaire en fait partie, noir sur blanc.',
          'Le piège, c’est que se refaire ressemble à de la prudence. Tu ne cherches pas à t’enrichir. Tu répares. Mais chaque réparation se paie en nouvelles mises. Et la promesse est toujours pour la prochaine fois.',
          'Tu as sûrement déjà entendu celle-là : encore dix euros et je rentre. Petit détail : il l’a dit à dix-neuf heures. Se refaire, c’est le nom que prend la perte quand elle demande à continuer.'
        ]
      },
      {
        h: 'La soustraction',
        cap: 'Miser plus, perdre plus vite',
        big: '5 400 €',
        p: [
          'Passons aux chiffres. Rappel de l’épisode un : à la roulette européenne, le zéro vert prend deux virgule sept pour cent de chaque mise. De chaque mise. Pas de chaque soirée. Il ne s’éteint jamais. Il ne fait pas de pause parce que tu es dans le rouge.',
          'Tu mises cent euros par tour. Mille tours, ça fait cent mille euros misés. Perte moyenne attendue : environ deux mille sept cents euros. Je ne parle pas d’une soirée malchanceuse. Je parle de la moyenne, celle qui finit toujours par avoir raison sur la durée.',
          'Maintenant, tu veux te refaire. Alors tu doubles tes mises : deux cents euros par tour. Même soirée, même nombre de tours. Ça fait deux cent mille euros misés. Perte moyenne attendue : environ cinq mille quatre cents euros.',
          'Tu as doublé la mise pour rattraper. Tu as surtout doublé la vitesse à laquelle tu perds, en moyenne. Miser plus ne rattrape rien. Ça accélère. Tu reconnais la cousine de la martingale, celle de l’épisode trois : la même idée, avec l’urgence en plus.',
          'Oui, un soir, tu peux revenir à zéro. Ça arrive. Et c’est précisément ce qui t’apprend à recommencer la fois suivante. Avec des mises plus grosses, et la certitude que ça a déjà marché.',
          'Karas, lui, a fini au baccara, contre un avantage d’environ un pour cent. Un pour cent. Quarante millions n’ont pas suffi à le battre. Ce n’est pas la somme qui compte. C’est la soustraction.'
        ]
      },
      {
        h: 'Ta mémoire, pas la sienne',
        cap: 'Se refaire n’est pas un plan',
        big: '50 $ → 0',
        p: [
          'Karas a gagné quarante millions. Il les a perdus. Et le casino n’a rien fait de spécial. Pas de piège, pas de croupier véreux, pas de malchance. Juste une soustraction, répétée à chaque mise, pendant qu’un homme essayait de revenir là où il était.',
          'Dans l’épisode un, on disait : la bille n’a pas de mémoire. C’est vrai. Mais toi, tu en as une. Tu te souviens de ce que tu avais en entrant. Tu te souviens de ton Run, même petit. Et c’est cette mémoire-là que le casino laisse travailler. Le zéro prend sa part du jeton. Ta mémoire te pousse à en remettre un.',
          'Alors, un repère simple. Rejouer pour récupérer ce qu’on a perdu, c’est l’un des signes à prendre au sérieux. Un seul signe mérite déjà une conversation. Avec quelqu’un de proche, ou avec des gens dont c’est le métier.',
          'Prochain épisode : Le seul jeu qu’on peut battre. Le blackjack, et Ken Uston, un homme qui a vraiment battu la maison. Devine ce qu’elle a fait.',
          'Et si le jeu prend trop de place, chez toi ou chez quelqu’un que tu aimes, Joueurs Info Service répond au zéro neuf, soixante-quatorze, soixante-quinze, treize, treize, tous les jours de huit heures à deux heures, anonyme et non surtaxé.',
          'D’ici là, la prochaine fois que tu entends je m’arrête à zéro, souviens-toi de qui tient le zéro. Il est vert. Et il ne rend rien. C’était Zéro Vert.'
        ]
      }
    ],
    retenir: [
      'Se refaire n’est pas un plan : c’est le nom que prend la perte quand elle demande à continuer.',
      'Doubler ses mises pour rattraper, c’est doubler sa perte moyenne : elle passe de 2 700 à 5 400 euros.',
      'Rejouer pour se refaire est un critère officiel du trouble du jeu. Un seul signe mérite déjà une conversation.'
    ]
  },

  {
    slug: 'le-seul-jeu-quon-peut-battre',
    status: 'published',
    number: 5,
    title: 'Le seul jeu qu’on peut battre',
    hook: 'Au blackjack, on peut battre la maison. Ken Uston l’a fait. Alors la maison a changé les règles.',
    summary:
      'Le blackjack, la stratégie de base d’Edward Thorp et le comptage de cartes de Ken Uston, jusqu’au procès de 1982. Puis les deux jeux où c’est l’inverse : la roue de la fortune, simple et chère, et le craps, bruyant et cher.',
    themes: ['maths', 'histoires'],
    mechanics: ['competence', 'simplicite', 'bruit'],
    witnesses: ['uston'],
    audio: { file: 'assets/podcast/05-le-seul-jeu-quon-peut-battre.mp3', bytes: 8699545, seconds: 544 },
    experience: 'motion',
    poster: 363.3,
    sections: [
      {
        h: 'Une table à part',
        cap: 'La seule faille de la salle',
        big: '21',
        p: [
          'Bienvenue dans Zéro Vert. Moi, c’est Tom.',
          'Et moi, c’est Arthur. Ici, on démonte un mécanisme réel du casino, avec une histoire vraie et les sources en bas de la page. Pas de système pour gagner. Pas de sermon.',
          'Un soir, un homme se fait sortir d’un casino. Il a la mâchoire cassée. Selon lui, ce sont des vigiles. Devine ce qu’il avait fait.',
          'Il avait triché.',
          'Non. Il n’a pas triché. Il n’a rien volé. Il a joué. Trop bien.',
          'Un crime que je ne risque pas de commettre.',
          'Depuis le début, tu me répètes que mes décisions ne changent rien. La bille n’a pas de mémoire. Mon numéro, ma machine, mon moment : rien ne change le calcul.',
          'Et au baccara d’Archie Karas, dans l’épisode précédent, il ne restait que la soustraction. Je maintiens.',
          'Eh bien aujourd’hui, exception. Il existe une table où ce que tu fais compte vraiment. Le blackjack. Et un homme qui l’a battue, pour de vrai, avec une méthode légale.',
          'Je te l’accorde sans me battre. Une seule table. Mais garde ton enthousiasme au chaud, et attends la fin de l’histoire.',
          'Au programme : un mathématicien, et un tableau gratuit que presque personne n’utilise. Un ancien cadre de la Bourse en perruque. Un procès.',
          'Et deux autres tables de la salle. L’une est trop simple. L’autre est trop bruyante. Les deux coûtent très cher.'
        ],
        v: ['tom', 'arthur', 'tom', 'arthur', 'tom', 'arthur', 'tom', 'arthur', 'tom', 'arthur', 'tom', 'arthur']
      },
      {
        h: 'Le sabot a de la mémoire',
        cap: 'La stratégie de base',
        big: '0,5 %',
        p: [
          'Le blackjack, en deux phrases. Tu reçois des cartes, le croupier aussi, et il faut s’approcher de vingt et un sans dépasser. À chaque main, tu choisis : tirer, rester, doubler, séparer.',
          'Et voilà la différence avec la roulette. La bille n’a pas de mémoire. Le sabot, lui, en a une. Six paquets mélangés, sans remise. Une carte sortie ne revient pas avant le prochain mélange.',
          'Donc ce qui reste dans le sabot change à chaque main. Et mes décisions comptent. Enfin !',
          'Elles comptent.',
          'Et j’ai une caution scientifique. En mille neuf cent soixante-deux, le mathématicien Edward Thorp publie Beat the Dealer. Battre le croupier. Avec une stratégie de base adaptée aux règles, l’avantage de la maison tombe autour d’un demi pour cent. Autant dire zéro.',
          'Pas zéro. Toujours pour la maison. Dix euros par main, cent mains, mille euros misés : la maison garde en moyenne environ cinq euros. À la roulette, vingt-sept.',
          'Cinq euros pour mille misés ? C’est le prix d’un café.',
          'C’est une moyenne, pas un taux de mains perdues. Ce soir, tu peux gagner, perdre ou faire égalité. Et ce tableau gratuit, presque personne ne le suit.',
          'Moi, je le connais. Ta main, la carte du croupier, la bonne décision. Et j’ai mes principes : je ne tire jamais sur seize.',
          'Contre un sept, il faut.',
          'Ah. Bon. Mais l’assurance, au moins, c’est plus sûr.',
          'C’est l’une des mises les plus chères de la table. Environ sept virgule quatre pour cent pour la maison, avec un sabot neuf de six paquets. Près de quinze fois le demi pour cent.'
        ],
        v: ['tom', 'arthur', 'tom', 'arthur', 'tom', 'arthur', 'tom', 'arthur', 'tom', 'arthur', 'tom', 'arthur']
      },
      {
        h: 'L’homme aux perruques',
        cap: 'Compter, c’est se souvenir',
        big: '1 À 2 %',
        p: [
          'Maintenant, mon héros. Ken Uston. Son histoire, c’est une série en quatre saisons.',
          'Vas-y. Je vérifie.',
          'Saison un : la démission. Uston est vice-président à la Bourse de San Francisco. Un costume, un bureau. Un jour, un ami lui montre comment compter les cartes. Il démissionne.',
          'Et précisons tout de suite : compter, ce n’est pas tricher. C’est se souvenir.',
          'Tu suis les cartes qui sortent. Quand le sabot est riche en figures, tu mises gros. Sinon, tu mises petit.',
          'Pas de gadget, pas de complice au plafond. Juste la mémoire du sabot, retournée contre la maison.',
          'Saison deux : les millions. Uston joue en équipe. Des signaux, des déguisements, une organisation de cambrioleurs, sauf que tout est légal. Ils gagnent des millions.',
          'Il écrit des livres, The Big Player en mille neuf cent soixante-dix-sept, Million Dollar Blackjack en mille neuf cent quatre-vingt-un. Mais combien ça rapporte, au juste ? Bien fait, avec beaucoup d’argent derrière et des heures de travail, un ou deux pour cent d’avantage.',
          'Un ou deux pour cent ? C’est tout ?',
          'C’est tout. Et pour ça, il faut des années de pratique, des équipes, et accepter d’être jeté dehors.',
          'Justement, saison trois : les casinos l’interdisent. Partout. Il revient avec des barbes postiches, des perruques, de faux noms.',
          'On le reconnaît. On le sort. On le reconnaît encore. On le sort encore. Et un soir, selon lui, des vigiles lui cassent la mâchoire.',
          'Attends. C’est l’homme du début.',
          'C’est l’homme du début.'
        ],
        v: ['tom', 'arthur', 'tom', 'arthur', 'tom', 'arthur', 'tom', 'arthur', 'tom', 'arthur', 'tom', 'arthur', 'tom', 'arthur']
      },
      {
        h: 'La maison change les règles',
        cap: 'New Jersey, 1982',
        big: '1982',
        p: [
          'Saison quatre, ma préférée : le procès. En mille neuf cent quatre-vingt-deux, la Cour suprême du New Jersey tranche l’affaire Uston contre Resorts International. Verdict : un casino de l’État ne peut pas exclure un compteur de cartes. Battu à la table, battu au tribunal !',
          'Victoire. Et la maison, elle fait quoi ?',
          'Elle s’incline ?',
          'Elle change le jeu. Plus de paquets dans le sabot. Un mélange plus précoce, pour que la mémoire du sabot ne serve plus à grand-chose. Des règles modifiées.',
          'Mais vu de la table, c’est toujours le même jeu.',
          'Toujours. Mais l’avantage d’Uston fond. Le règlement, c’est la maison qui l’écrit.',
          'Uston meurt à Paris, en septembre mille neuf cent quatre-vingt-sept. Et ça me laisse un goût bizarre. Le seul jeu de la salle où l’on peut battre la maison, et le jour où on y arrive, elle change les règles.',
          'L’ironie la plus nette de la saison. Un casino n’a rien contre le talent. Il a quelque chose contre les gens qui gagnent.',
          'D’accord. Mais moi, je ne compte pas les cartes. Je joue, c’est tout.',
          'Alors tu joues à un jeu où la maison garde l’avantage, avec le sentiment que ce n’est pas le cas. Le pire des deux mondes. Et une méthode facile pour gagner au blackjack, c’est du vent.',
          'Donc cette table, au fond, elle sert à quoi ?',
          'À sa réputation. Le jeu qui donne une chance fait croire que les autres en donnent une aussi. Alors retourne-toi. Regarde ce qui brille autour.'
        ],
        v: ['tom', 'arthur', 'tom', 'arthur', 'tom', 'arthur', 'tom', 'arthur', 'tom', 'arthur', 'tom', 'arthur']
      },
      {
        h: 'La roue de l’entrée',
        cap: 'Simple, donc cher',
        big: '24 %',
        p: [
          'Ce qui brille, je le vois d’ici. Près de l’entrée, la grande roue. Brillante, bruyante. Et j’avoue, c’est tout à fait mon genre.',
          'Décris-la-moi.',
          'Cinquante-quatre cases, une aiguille, un seul geste. Tu poses ton jeton sur une case, on lance, l’aiguille s’arrête. Aucune règle à apprendre. Aucune décision à prendre.',
          'Le jeu le plus simple du casino. Et l’un des plus chers. Selon la case sur laquelle tu mises, la maison garde entre onze et vingt-quatre pour cent de chaque mise.',
          'Attends. Vingt-quatre ?',
          'Vingt-quatre. Pas deux virgule sept, comme à la roulette. Vingt-quatre. Pour une attraction de fête foraine.',
          'Je reprends ton exemple. Mille euros misés. Au blackjack bien joué, environ cinq euros pour la maison. À la roulette, vingt-sept. Et à la roue ?',
          'Entre cent dix et deux cent quarante. Dans le pire des cas, près de neuf fois la roulette, et près de cinquante fois le blackjack bien joué.',
          'Mais la roue, c’est pour s’amuser. Ce n’est pas du vrai jeu.',
          'C’est pourtant le pire taux de la maison. Et elle est à l’entrée, pas au fond de la salle.',
          'Parce que tout le monde comprend la règle ?',
          'Exactement. Plus un jeu est simple à comprendre, plus il peut se permettre d’être mauvais. Personne ne calcule ce qu’il n’a pas besoin de comprendre.',
          'Je ne vais plus la regarder pareil.',
          'Quand un jeu n’exige aucune réflexion, c’est qu’il a déjà réfléchi à ta place.'
        ],
        v: ['tom', 'arthur', 'tom', 'arthur', 'tom', 'arthur', 'tom', 'arthur', 'tom', 'arthur', 'tom', 'arthur', 'tom', 'arthur']
      },
      {
        h: 'Le bruit des dés',
        cap: 'Même tapis, douze fois plus',
        big: '×12',
        p: [
          'Dernier arrêt : le craps. Là, au moins, ça vit. Un tapis couvert de cases, des cris, des annonces qui fusent : quatre pour un, cinq contre un.',
          'L’inverse de la roue. Ces annonces, ce sont deux façons de dire un paiement, pour que personne ne compare.',
          'Et sur le tapis, toutes les cases se valent ?',
          'Pas du tout. La ligne de passe garde un virgule quarante et un pour cent des mises. La mise n’importe quel sept en garde seize virgule soixante-sept pour cent.',
          'Non.',
          'Si. Près de douze fois plus. Sur mille euros misés, environ quatorze euros d’un côté, environ cent soixante-sept de l’autre. Mêmes dés, même croupier, cases de la même couleur. Rien ne le signale.',
          'Donc quand une table propose vingt mises ?',
          'Elle en a dix-neuf à te vendre.',
          'Je récapitule. Le seul jeu qu’on peut battre, la maison le modifie dès qu’on le bat. Le jeu simple coûte cher parce que je ne réfléchis pas. Le jeu compliqué coûte cher parce que je ne peux pas tout suivre.',
          'Rien à corriger. Partout, la case verte change de forme. Jamais de propriétaire.',
          'Prochain épisode : Une maison sans horloges. Depuis que tu es entré, as-tu vu une fenêtre ? Une horloge ? On visite le bâtiment lui-même.',
          'Et si le jeu prend trop de place, chez toi ou chez quelqu’un que tu aimes, Joueurs Info Service répond au zéro neuf, soixante-quatorze, soixante-quinze, treize, treize, tous les jours de huit heures à deux heures, de façon anonyme et non surtaxée.',
          'D’ici là, souviens-toi : quand la maison perd, elle change les règles.',
          'Quand elle gagne, elle les garde. C’était Zéro Vert.'
        ],
        v: ['tom', 'arthur', 'tom', 'arthur', 'tom', 'arthur', 'tom', 'arthur', 'tom', 'arthur', 'tom', 'arthur', 'tom', 'arthur']
      }
    ],
    retenir: [
      'Au blackjack, bien jouer ramène l’avantage de la maison à un demi pour cent, sans l’annuler.',
      'Le jour où quelqu’un bat la maison, la maison change les règles.',
      'Simple ou bruyant, un jeu cache sa marge : jusqu’à 24 % à la roue, 16,67 % sur le n’importe quel sept.'
    ]
  },

  {
    slug: 'une-maison-sans-horloges',
    status: 'soon',
    number: 6,
    title: 'Une maison sans horloges',
    hook: 'Depuis que tu es entré, as-tu vu une fenêtre ? Une horloge ? Un panneau Sortie ? Ce n’est pas un oubli.',
    summary:
      'Le manuel de Bill Friedman, l’école d’en face de Roger Thomas, les jetons, le verre offert et le siège. Un architecte et un croupier en pause, deux personnages composites, et ce que la loi française demande aux casinos.',
    themes: ['lieux', 'psycho'],
    mechanics: ['maison'],
    witnesses: ['architecte', 'main'],
    audio: null,
    sections: [
      {
        h: 'Il est quelle heure ?',
        cap: 'Sans regarder ton téléphone',
        big: '?? H ??',
        p: [
          'Petit test avant de commencer. Ne regarde pas ton téléphone. Il est quelle heure, là ? Tu hésites ? Normal. Tu as peut-être une fenêtre à côté de toi, un four qui affiche l’heure, un chat qui réclame sa gamelle toujours au même moment. Et tu hésites quand même.',
          'Maintenant, enlève tout ça. Pas de fenêtre. Pas d’horloge au mur. Pas de panneau Sortie en vue. Une lumière qui ne change jamais, de l’après-midi jusqu’au milieu de la nuit. Tu viens d’imaginer une salle de casino. Et dans cette salle, rien n’est un oubli.',
          'Bienvenue dans Zéro Vert. Dans l’épisode un, on regardait la case verte de la roulette, celle qui travaille pour la maison à chaque tour. Aujourd’hui, on lève les yeux de la table. Les murs, le plafond, la moquette, le verre posé à côté de toi. Parce que le zéro n’est pas seulement sur la roue. Il est dans le plan du bâtiment.',
          'Au programme : un manuel de six cents pages écrit par un ancien joueur compulsif. Un architecte qui t’explique pourquoi tu ne trouves pas la sortie. Un croupier en pause, qui n’a pas le droit de parler des clients, seulement de ses mains. Et ce que la loi française demande aux casinos. Spoiler : quelque chose. Pas tout.',
          'Une précision avant d’entrer. L’architecte et le croupier sont des personnages composites, construits d’après des personnes et des témoignages réels. Les sources sont en bas de la page.'
        ]
      },
      {
        h: 'Le manuel',
        cap: 'Bill Friedman, 2000',
        big: '600 PAGES',
        p: [
          'En deux mille, un livre sort d’un institut de l’université du Nevada, à Reno. Six cents pages. Le titre, en anglais : Designing Casinos to Dominate the Competition. Concevoir des casinos pour dominer la concurrence. Pas vraiment un roman de plage.',
          'Son auteur s’appelle Bill Friedman. Son parcours, en deux lignes. Ancien joueur compulsif. Devenu directeur de casino. Il a connu les deux côtés de la table, et il a tout mis dans un manuel. Treize principes.',
          'La liste fait froid dans le dos tellement elle est simple. Pas de fenêtres. Pas d’horloges. Des plafonds bas. Des allées en labyrinthe, qui tournent au lieu d’aller tout droit. Des machines visibles de partout, dès l’entrée. Et la sortie, jamais en ligne droite.',
          'Pourquoi pas de fenêtres ? Parce qu’une fenêtre, c’est une horloge. Le soleil qui se couche, la nuit noire, le ciel qui pâlit au petit matin : autant de signaux qui disent à ton corps qu’il serait temps de rentrer. On les enlève, et la soirée n’a plus de bords.',
          'Plus tard, un autre consultant, Roger Thomas, de chez Wynn, prend le contre-pied. Lui défend des plafonds hauts, la lumière naturelle, des œuvres d’art, des espaces ouverts comme un terrain de jeu. Tout oppose les deux écoles. Tout, sauf l’objectif : que tu restes. Le décor change. Le but, jamais.',
          'On ne perd pas la notion du temps dans un casino. On te l’enlève. Et c’est un métier.'
        ]
      },
      {
        h: 'L’architecte',
        cap: 'Un personnage composite',
        big: '13 PRINCIPES',
        p: [
          'Dans le jeu Rien ne va plus, tu le croises dans les couloirs. On l’appelle l’architecte. C’est un personnage composite, construit d’après ces deux vrais consultants, Friedman et Thomas. Il te dit : perdu ? Non. Tu es exactement là où je t’ai mis.',
          'Et il a réponse à tout. Les jetons ? Pour que l’argent ne pèse rien. Le verre offert ? Pour que ton compteur devienne flou. Le siège ? Pour que tu ne te lèves pas. La moquette aux motifs chargés ? Pour que tu regardes les machines, pas le sol. D’ailleurs, regarde bien : les motifs pointent vers les machines.',
          'À l’entrée, le grand jeu. Tapis rouge, fontaine, colonnes. Ça, dit-il, c’est pour la première minute. Ensuite, on baisse le plafond et on serre les allées. Dans une allée étroite, un joueur se sent à l’abri. Et un joueur à l’abri, il reste.',
          'Les miroirs ? Ils agrandissent l’espace et ils cassent les repères. Tu ne sais plus quel couloir tu as déjà pris. Et ils te montrent un joueur, pas une personne fatiguée. Dans le jeu, un client marmonne : je crois que je suis déjà passé ici. Réponse : les miroirs sont là pour ça.',
          'Tu connais ces grands magasins de meubles où tu entres pour une lampe, et d’où tu ressors trois heures plus tard avec un plaid, deux plantes et une poêle ? Même école. Sauf qu’au casino, la poêle, c’était ton loyer.'
        ]
      },
      {
        h: 'Des jetons qui ne pèsent rien',
        cap: 'Un jeton, un euro',
        big: '1 JETON',
        p: [
          'Prenons les objets un par un, parce que chacun a un job. Le jeton d’abord. À la caisse, tu changes cent euros. On te rend une petite pile de plastique coloré. Dans le jeu, la caissière te le dit avec le sourire : un jeton, un euro, vous les rendez quand vous voulez. Puis elle précise que presque personne ne vient les rendre.',
          'Un billet de cinquante, tu le sens partir. Tu le plies, tu hésites, il a un poids. Un jeton, non. Il glisse, il claque, il revient, il repart. Il ne ressemble plus à des courses ou à un bout de loyer. Il ressemble à un jeu. C’est exactement le but.',
          'Ensuite, le verre. Offert. L’anthropologue Natasha Dow Schüll, dans son livre Addiction by Design, range les boissons dans la même boîte à outils que les jetons, les cartes de fidélité et l’absence d’horloges. Un verre, ça détend. Deux verres, ça arrondit les chiffres. Et le compteur de pertes, dans ta tête, devient flou.',
          'L’architecte du jeu l’avoue sans gêne : on teste tout, la température, l’odeur, la musique. Tu n’as jamais eu froid dans un casino. Tu ne l’as jamais remarqué non plus.',
          'Rappelle-toi l’épisode un : la bille n’a pas de mémoire. Le bâtiment, lui, est construit pour que tu perdes la tienne. L’heure qu’il est. L’argent déjà sorti. Tout ce dont tu aurais besoin pour décider de partir.'
        ]
      },
      {
        h: 'Un croupier en pause',
        cap: 'Un autre personnage composite',
        big: '300 TOURS',
        p: [
          'Dans un couloir, un homme compte ses dix minutes de pause. Lui, il a le droit de savoir l’heure. Deuxième personnage composite : un croupier en pause, bâti d’après des témoignages d’anciens croupiers dans la presse française. Il ne peut pas parler des clients. Il peut parler de ses mains.',
          'Ses mains font tourner la roulette trois cents fois par nuit, cinq nuits par semaine. Ça fait mille cinq cents tours. Le zéro sort une fois sur trente-sept, donc une quarantaine de fois par semaine. Et même sans sortir, il est dans le prix de chaque mise. Il résume : je ne suis pas croupier, je suis le mécanisme.',
          'On lui a appris à sourire, à dire bonne chance, à pousser les jetons vite. On lui a appris aussi à repérer celui qui ne devrait plus être là. Et à ne rien dire, sauf s’il fait du bruit.',
          'Le salaire d’un croupier repose en grande partie sur les pourboires, mis en commun dans une cagnotte. Alors on encourage. Un gros gagnant, on l’applaudit. Un gros perdant, on lui dit : ça va tourner. Son pire soir ? Un homme a perdu sa voiture et sa montre, et l’a remercié en partant. Pour le service. Le pourboire, il l’a gardé.',
          'Peut-il arrêter quelqu’un ? Non. Il peut prévenir le chef de table, qui prévient le directeur, qui propose une pause. La première année, c’est un métier. La deuxième, on arrête de regarder les visages. La troisième, on compte les tours pour ne pas compter les gens.'
        ]
      },
      {
        h: 'Ce que la loi demande',
        cap: 'France, 2007, 2010, 2020',
        big: '2 HEURES',
        p: [
          'Le tableau n’est pas tout noir. En France, l’arrêté du quatorze mai deux mille sept, puis la loi du douze mai deux mille dix, imposent aux casinos un dispositif de repérage et de prise en charge des joueurs excessifs, avec formation du personnel. Depuis deux mille vingt, l’Autorité nationale des jeux contrôle ces dispositifs. C’est une obligation.',
          'Notre croupier raconte deux heures de formation. En cinq ans. Et il résume le dilemme : la loi dit qu’on doit repérer, la maison dit qu’on doit servir. Devine qui gagne.',
          'C’est tout l’écart entre le texte et le décor. Un dispositif de repérage marche mieux quand rien, dans la salle, n’est conçu pour t’empêcher de lever les yeux. Or quand tout est fait pour que tu restes, rester n’est plus vraiment une décision. Alors reprends-la avant d’entrer. Regarde l’heure, choisis celle où tu sors, et mets une alarme. Ton téléphone, au moins, a une horloge.',
          'Prochain épisode : Le tapis rouge. Les hôtes, les cadeaux, le crédit, et deux hommes à qui l’on a déroulé ce tapis jusqu’au bout, à Las Vegas et à Melbourne.',
          'Et si le jeu prend trop de place, pour toi ou pour quelqu’un que tu aimes, appelle Joueurs Info Service au zéro neuf, soixante-quatorze, soixante-quinze, treize, treize, tous les jours de huit heures à deux heures, c’est anonyme et non surtaxé.',
          'D’ici là, la prochaine fois que tu passes la porte d’un casino, cherche l’horloge. Tu ne la trouveras pas. Le zéro, lui, n’a pas besoin de montre. C’était Zéro Vert.'
        ]
      }
    ],
    retenir: [
      'Pas de fenêtres, pas d’horloges, pas de sortie en ligne droite : rien n’est un oubli.',
      'Les jetons et le verre offert servent à brouiller ce que tu dépenses.',
      'Quand tout est fait pour que tu restes, rester n’est plus une décision.'
    ]
  },

  {
    slug: 'le-tapis-rouge',
    status: 'soon',
    number: 7,
    title: 'Le tapis rouge',
    hook: 'Un texto t’offre une suite, avec ton prénom. Le casino connaît ton chiffre. Tout a été calculé dessus.',
    summary:
      'La perte théorique, le « théo », dite simplement. Terrance Watanabe, un an dans une suite de Las Vegas. Harry Kakavas, ramené en jet privé à Melbourne. Pourquoi un casino veut moins ta soirée que ton retour.',
    themes: ['lieux', 'histoires', 'maths'],
    mechanics: ['tapis', 'retour'],
    witnesses: ['watanabe', 'kakavas'],
    audio: null,
    sections: [
      {
        h: 'Votre suite vous attend',
        cap: 'Un texto, ton prénom',
        big: '1 TEXTO',
        p: [
          'Bienvenue dans Zéro Vert. Moi, c’est Théo.',
          'Moi, c’est Tom.',
          'Et moi, c’est Arthur.',
          'Mardi, Tom, ton téléphone vibre. Un texto, avec ton prénom : votre suite vous attend vendredi. Tu n’as rien réservé. Tu es allé au casino une fois, la semaine dernière, en te disant que tu n’y retournerais pas.',
          'Franchement ? Je suis flatté. Une suite gratuite, avec mon prénom.',
          'Ce n’est pas un ami qui t’écrit. Quelqu’un a regardé un chiffre à côté de ton nom. Et ce chiffre a dit : celui-là, ça vaut une suite.',
          'Ou alors ils m’ont trouvé sympathique.',
          'Non.',
          'Épisode un, la case verte, la marge qui travaille à chaque tour. Épisode six, les murs sans horloges. Aujourd’hui, ce que le casino fait de cette marge quand il te connaît. Les hôtes, les cadeaux, le crédit. Le tapis rouge.',
          'Et au programme, un homme d’Omaha qui a vécu un an dans une suite de Las Vegas. Ça, ça me plaît.',
          'Et un Australien qu’un casino est allé chercher en jet privé, alors qu’il avait lui-même demandé à en être interdit.',
          'Un jet privé, quand même. J’imagine qu’à la fin, un juge a tapé du poing sur la table.',
          'Un tribunal a répondu : c’est légal.',
          'Attends. Quoi ?',
          'On y viendra. Deux histoires vraies, deux noms réels, une enquête de presse, une décision de justice, les sources en bas de la page. Et ici, personne ne te réserve de suite.'
        ],
        v: ['theo', 'tom', 'arthur', 'theo', 'tom', 'arthur', 'tom', 'arthur', 'theo', 'tom', 'arthur', 'tom', 'arthur', 'tom', 'theo']
      },
      {
        h: 'Ton chiffre',
        cap: 'La perte théorique',
        big: 'THÉO',
        p: [
          'Arthur, ce chiffre à côté du nom de Tom, c’est quoi ?',
          'La perte théorique. Entre initiés, le théo.',
          'Pardon ?',
          'Pas toi. Ce n’est pas ce que tu as perdu ce soir, c’est ce que tu es censé laisser, en moyenne, vu ta façon de jouer. La formule : ta mise moyenne, fois le nombre de tours, fois l’avantage de la maison.',
          'Vas-y, prends-moi. Dix euros par tour à la roulette, deux cents tours. Ça fait deux mille euros misés.',
          'Le zéro en garde deux virgule sept pour cent. Ton théo : environ cinquante-quatre euros.',
          'Et je peux quand même repartir gagnant ce soir.',
          'Tu peux. Ton théo, lui, ne bouge pas.',
          'Et la carte de fidélité ? Selon l’anthropologue Natasha Dow Schüll, elle sert d’abord à ça : mesurer ta valeur théorique.',
          'Tu crois cumuler des points. Le casino, lui, cumule des données.',
          'Dans le jeu Rien ne va plus, un client s’en vante : la carte de fidélité, c’est gratuit.',
          'Ce sont tes mises qui la paient. Le verre, le repas, la chambre, le crédit : tout est calculé là-dessus. Pas une générosité. Une fraction, prévue, de ce que tu vas perdre.',
          'Même le barman qui connaît mon prénom ?',
          'Il connaît ton théo.',
          'Pour les très gros joueurs, la carte a un visage : un hôte, dont le métier est de te rappeler. Quand le théo se compte en millions, le tapis rouge devient très, très long.'
        ],
        v: ['theo', 'arthur', 'theo', 'arthur', 'tom', 'arthur', 'tom', 'arthur', 'theo', 'arthur', 'tom', 'arthur', 'tom', 'arthur', 'theo']
      },
      {
        h: 'Un an dans une suite',
        cap: 'Terrance Watanabe, Las Vegas, 2007',
        big: '825 M$',
        p: [
          'Terrance Watanabe, saison un. Omaha.',
          'Il a vendu l’entreprise familiale, des articles de fête. La cinquantaine, célibataire, riche. Le rêve.',
          'Et, dans le récit qu’en fait notre jeu, il n’a personne pour lui dire non.',
          'Saison deux : deux mille sept.',
          'Il s’installe à Las Vegas, au Caesars Palace et au Rio, deux casinos du groupe Harrah’s, pour toute l’année. Il y mange, il y dort, il y joue, parfois vingt-quatre heures d’affilée, sur plusieurs mains à la fois. On le traite en roi : des hôtes rien que pour lui, des cadeaux, des millions de crédit, l’alcool servi à la table.',
          'Et une remise de quinze pour cent sur ses pertes.',
          'Ça, je le défends. Il perd un million, on lui en rend cent cinquante mille. C’est généreux.',
          'Ça ressemble à un cadeau. En vrai, ça baisse le prix de la perte. Donc on joue plus longtemps. Donc on perd plus.',
          'Bon. Mais là, je suis de son côté : il affirmera devant la justice qu’on lui fournissait des antidouleurs pendant qu’il jouait.',
          'Et la même année, un autre casino l’avait exclu pour jeu compulsif. Celui-ci a laissé ses portes ouvertes.',
          'Le total, Arthur.',
          'Huit cent vingt-cinq millions de dollars misés en un an. Cent vingt-sept millions perdus : un peu plus de quinze centimes par dollar posé sur la table. Et dans le récit du jeu, il pèse cinq virgule six pour cent des recettes de jeu de ses hôtes à Las Vegas.',
          'Plus d’un vingtième de la caisse. Un seul homme.'
        ],
        v: ['theo', 'tom', 'arthur', 'theo', 'tom', 'theo', 'tom', 'arthur', 'tom', 'arthur', 'theo', 'arthur', 'tom']
      },
      {
        h: 'Joueur de l’année',
        cap: 'Le client parfait',
        big: '14,7 M$',
        p: [
          'Saison trois. Toujours selon le récit du jeu, sa sœur appelle le casino pour qu’on l’arrête. On lui répond qu’il est adulte.',
          'Il est adulte, c’est vrai. Il dépense son argent comme il veut.',
          'C’est vrai. Un adulte à qui l’on sert à boire à la table, avec un hôte chargé de le rappeler dès qu’il s’éloigne.',
          'D’accord. Dit comme ça, l’adulte est très entouré.',
          'Il reçoit même une plaque. Joueur de l’année.',
          'Sans doute le seul trophée au monde qu’on remporte en perdant.',
          'Saison quatre, la moins dorée. Il cesse de payer.',
          'Il reste quatorze millions sept cent mille dollars de dettes. Le casino le poursuit. Accord en deux mille dix. Pas de grand procès, pas de verdict. Le silence.',
          'Alors comment on connaît son histoire ?',
          'Grâce à une journaliste, Alexandra Berzon, dans le Wall Street Journal, le cinq décembre deux mille neuf. Une longue enquête, titrée : le joueur qui a flambé cent vingt-sept millions de dollars.',
          'Et notre jeu lui fait dire qu’il était le client parfait. Que c’est pour ça que personne, dans l’industrie, ne prononce jamais son nom.',
          'Le client parfait ne gagne pas. Il revient, il reste, et il a les moyens de continuer. Jusqu’au jour où il ne les a plus.',
          'Mais moi, je ne mise pas des millions. Mon tapis rouge, c’est un verre offert.',
          'Exact. Mais le calcul qui a fixé son tapis rouge fixe aussi ton verre. Seule la virgule change de place.'
        ],
        v: ['theo', 'tom', 'arthur', 'tom', 'theo', 'tom', 'theo', 'arthur', 'tom', 'theo', 'tom', 'arthur', 'tom', 'arthur']
      },
      {
        h: 'Un jet pour Melbourne',
        cap: 'Harry Kakavas, Melbourne, 2005-2006',
        big: '1,43 Md$',
        p: [
          'Changement d’hémisphère. Harry Kakavas, Australie. Lui, son dossier est connu avant même qu’il entre.',
          'Joueur pathologique, exclu du casino de Sydney, condamné pour une fraude commise pour financer son jeu.',
          'Et surtout : des années plus tôt, il avait lui-même demandé à être interdit au Crown, le casino de Melbourne.',
          'Donc là, au moins, on le laisse tranquille.',
          'Non. Le Crown le fait revenir quand même.',
          'Un hôte fait le voyage jusque chez lui. Un jet privé l’amène. Des suites, des cadeaux, et une boîte de cinquante mille dollars en argent porte-bonheur. Ça, au moins, c’est offert.',
          'De l’argent offert, pour aller jouer. Tu vois le circuit : il finit toujours au même guichet.',
          'Entre juin deux mille cinq et août deux mille six, en quatorze mois, il mise un milliard quatre cent trente millions de dollars australiens au baccara. Jusqu’à trois cent mille dollars la main. Plus de cent millions par mois, en moyenne.',
          'Perte nette sur la période : vingt millions et demi.',
          'Attends. Plus d’un milliard misé, pour vingt millions perdus ? Ça fait environ un virgule quatre pour cent. Presque bien joué.',
          'Presque rien sur une mise. Sur plus d’un milliard, ça fait vingt millions. L’épisode un, version jet privé : le pourcentage est minuscule, le volume fait le reste.',
          'Et il attaque le casino.',
          'Son argument est imparable : il était malade, le casino le savait, et il l’a exploité.',
          'En deux mille treize, la Haute Cour d’Australie tranche, à l’unanimité. Son addiction n’est pas reconnue comme un désavantage spécial. Le casino n’avait pas l’obligation de le protéger de lui-même.',
          'Sérieusement ?',
          'Le tapis rouge est légal. C’est tout le problème.'
        ],
        v: ['theo', 'tom', 'arthur', 'tom', 'arthur', 'tom', 'arthur', 'tom', 'arthur', 'tom', 'arthur', 'theo', 'tom', 'arthur', 'tom', 'theo']
      },
      {
        h: 'Revenir, c’est la valeur',
        cap: 'La valeur à vie',
        big: '52 VENDREDIS',
        p: [
          'Retour au texto du début. Pourquoi une suite, après une seule soirée ?',
          'Parce qu’une soirée perdue n’est qu’une soirée. Un client qui revient, c’est une rente.',
          'Les manuels de marketing de casino appellent ça la valeur à vie d’un client. Ton exemple, Tom ?',
          'Un théo d’environ cinquante-quatre euros par soirée. Et je reviens chaque vendredi pendant un an.',
          'Cinquante-deux soirées : environ deux mille huit cents euros de théo. Ta première soirée ne valait pas grand-chose. Toi, si.',
          'Je peux aussi y aller une fois, et ne jamais revenir.',
          'Sauf que la deuxième fois, tout est plus facile. La carte est dans ta poche, l’hôte te salue, le verre arrive sans que tu le demandes, la mise minimale te paraît petite.',
          'On appelle ça l’escalade. Et personne ne la voit de l’intérieur.',
          'Et la loi, dans tout ça ? En France, démarcher un joueur interdit de jeu est prohibé. Démarcher les autres ne l’est pas.',
          'Alors au prochain texto, je me poserai une seule question : combien ont-ils estimé que je valais ?',
          'La bille n’a pas de mémoire. Ton dossier, si.',
          'Prochain épisode : Le casino dans la poche. Avec un jeune homme qui n’a jamais mis les pieds dans un casino. Il n’en a pas eu besoin.',
          'Et si le jeu prend trop de place, pour toi ou pour quelqu’un que tu aimes, appelle Joueurs Info Service au zéro neuf, soixante-quatorze, soixante-quinze, treize, treize, tous les jours de huit heures à deux heures, de façon anonyme et non surtaxée.',
          'Le tapis rouge finit toujours devant la case verte. C’était Zéro Vert.'
        ],
        v: ['theo', 'arthur', 'theo', 'tom', 'arthur', 'tom', 'theo', 'arthur', 'theo', 'tom', 'arthur', 'theo', 'arthur', 'theo']
      }
    ],
    retenir: [
      'Ton « théo » : mise moyenne, fois nombre de tours, fois avantage de la maison. Tout cadeau en est une fraction.',
      'Légal ne veut pas dire protecteur : le Crown n’avait pas à protéger Kakavas de lui-même.',
      'Un casino ne cherche pas ta perte de ce soir. Il cherche ton retour.'
    ]
  },

  {
    slug: 'le-casino-dans-la-poche',
    status: 'soon',
    number: 8,
    title: 'Le casino dans la poche',
    hook: 'Il n’a jamais mis les pieds dans un casino. Il n’en a pas eu besoin : le casino tenait dans sa poche.',
    summary:
      'Casinos en ligne illégaux, bonus à miser quarante fois, paris en direct et cash-out. Deux personnages composites, un jeune homme et un parieur, et trois cotes qui additionnées font 105,6 %. Le zéro vert s’est caché dans la cote.',
    themes: ['ligne', 'maths', 'histoires'],
    mechanics: ['poche', 'pari'],
    witnesses: ['sami', 'parieur'],
    audio: null,
    sections: [
      {
        h: 'Trois heures du matin',
        cap: 'Pas de croupier, pas de porte',
        big: '3 H',
        p: [
          'Il est trois heures du matin. Pas de lustre, pas de tapis vert, pas de croupier. Juste ton lit, ta couette et ton téléphone, luminosité au minimum pour ne réveiller personne. Sur l’écran, des rouleaux tournent tout seuls. Tu ne les touches même plus.',
          'Bienvenue dans un casino d’un genre nouveau. Il n’a pas d’adresse. Pas de vigile à l’entrée. Il ne ferme jamais. Et il tient dans ta main.',
          'Tu écoutes Zéro Vert, le podcast qui t’explique comment la maison gagne. Le zéro vert, tu le connais depuis le premier épisode : la case de la roulette qui bosse pour la maison à chaque tour. Aujourd’hui, on va voir qu’elle a déménagé. Elle a quitté la roue, elle s’est installée dans une appli, et elle s’est trouvé une cachette : les cotes des paris sportifs.',
          'Pour raconter ça, deux personnages. Un jeune homme, que j’appellerai Sami, et un parieur. Je te le dis tout de suite : ce sont deux personnages composites. Ils sont construits à partir de témoignages publiés par Joueurs Info Service et de données publiques sur le jeu en France. Aucun des deux n’existe tel quel. Mais chaque morceau de leur histoire, quelqu’un l’a vécu.',
          'Au programme : un casino illégal qui te parle tous les soirs, un cadeau qui coûte plus cher qu’il ne rapporte, et une addition de trois chances qui dépasse cent pour cent. Et non, ce n’est pas une faute de frappe.'
        ]
      },
      {
        h: 'Sami, en quatre saisons',
        cap: 'Seize ans, un lien en description',
        big: '15 000 €',
        p: [
          'L’histoire de Sami, c’est une série en quatre saisons. Saison un : printemps deux mille vingt. Il a seize ans. Confiné, comme tout le monde. Le soir, il regarde un streamer qui joue au blackjack en direct. Sous la vidéo, un lien en description.',
          'Le lien mène à des sites payés en cryptomonnaie. Pas de pièce d’identité. Personne ne lui demande son âge. Les premiers dépôts font dix euros. Dix euros, c’est le prix d’une pizza. Ça ne ressemble pas du tout à un problème.',
          'Saison deux. Au début, il gagne. Enfin, il croit. Il ne compte pas. Puis il entre en alternance, il touche un salaire. Début deux mille vingt-quatre, il a quinze mille euros de côté. Le travail, surtout. Et un peu le jeu, se dit-il.',
          'Saison trois : l’été. Un accident de voiture. Rien de grave, mais il reste coincé chez lui, avec son téléphone. Les dépôts passent de cent euros par semaine à cinq cents. Puis parfois mille par jour. Depuis son lit. En deux mois, cinq mille euros sont partis. Quelques mois plus tard, il ne reste plus rien des quinze mille.',
          'Saison quatre, la moins glamour. Chaque salaire part presque en entier, le jour même où il tombe. Il ment à sa mère sur le loyer. Il a le même téléphone que toi. Et il n’a toujours jamais vu un vrai casino. Il n’en a pas eu besoin. Le casino est venu à lui.'
        ]
      },
      {
        h: 'Deux secondes pour entrer',
        cap: 'Illégal, et pourtant là',
        big: '× 40',
        p: [
          'Petit point de droit, qui change tout. En France, les jeux de casino en ligne sont illégaux. Machines à sous, roulette, blackjack sur un site : interdit. En ligne, seuls les paris sportifs, les paris hippiques et le poker sont autorisés.',
          'Les sites qui accueillent Sami sont donc installés à l’étranger. Souvent en cryptomonnaie. Pas de vérification d’âge, pas de limite de dépôt, pas d’interdiction volontaire, aucun recours. Et la crypto ne ressemble pas à de l’argent. Zéro virgule zéro deux de quelque chose, ça fait moins mal que huit cents euros. C’est le jeton du casino, version deux mille vingt.',
          'Maintenant, chronomètre. Le dépôt prend deux secondes. Le retrait, lui, prend trois à cinq jours ouvrés. Et seulement après avoir misé quarante fois le bonus de bienvenue.',
          'Fais le calcul. Cent euros de bonus, fois quarante : quatre mille euros à miser avant de retirer quoi que ce soit. Même sur une roulette européenne, avec ses deux virgule sept pour cent, ça laisse en moyenne cent huit euros à la maison. Le cadeau est remboursé, avec les intérêts, avant que tu aies le droit de partir. Sami le dit à sa façon : tu crois jouer avec leur argent, tu joues avec ton temps.',
          'Ajoute l’auto-spin, qui enchaîne les tours pendant que tu regardes ailleurs. Pas d’horloge, pas de fenêtre, personne pour te voir partir. Toute la saison, dans un écran.',
          'Selon l’Observatoire français des drogues et des tendances addictives, la France comptait en deux mille vingt-quatre trois millions neuf cent mille joueurs en ligne, en hausse de sept virgule sept pour cent.'
        ]
      },
      {
        h: 'Le parieur qui connaît le foot',
        cap: 'Il regarde sa mise',
        big: '−6 200 €',
        p: [
          'Deuxième personnage, composite lui aussi, construit d’après les données de l’Autorité nationale des jeux et de l’Observatoire. Quand il regarde un match, il ne regarde pas vraiment le match. Il regarde sa mise. Ce n’est pas pareil.',
          'Tout commence par un cadeau. Un pari gratuit : dix euros offerts, sans dépôt. Et le foot, il connaît. Les joueurs, les entraîneurs, les classements. Il se dit que connaître, ça suffit.',
          'Le premier mois, il gagne trois cent quarante euros. Il le dit à tout le monde. Les huit mois suivants, il perd six mille deux cents euros. Il ne le dit à personne.',
          'Fais la soustraction : moins cinq mille huit cent soixante euros en neuf mois. Mais dans sa tête, le chiffre qui reste, c’est le premier. Le gain du début, c’est l’hameçon. On le disait déjà au premier épisode : on gagne assez souvent pour y croire.',
          'Il n’a rien d’une exception. Selon l’Autorité nationale des jeux, les paris sportifs en ligne sont le segment qui grandit le plus vite, avec une clientèle très majoritairement masculine et jeune. Selon l’Observatoire, la pratique problématique se concentre chez les hommes de dix-huit à trente-quatre ans.',
          'Et un chiffre à lire lentement. D’après l’Autorité nationale des jeux, soixante virgule six pour cent du chiffre d’affaires du jeu en ligne vient de joueurs excessifs. Plus de la moitié de l’argent vient des gens pour qui le jeu déborde déjà. Pour l’opérateur, le parieur n’est pas un accident de parcours. C’est le gros du chiffre.'
        ]
      },
      {
        h: 'Plus de cent pour cent',
        cap: 'Une cote, c’est un prix',
        big: '105,6 %',
        p: [
          'Ouvrons l’appli. Un match, trois cotes. Un virgule cinquante-cinq si l’équipe A gagne. Quatre virgule vingt pour le nul. Cinq virgule quatre-vingts si l’équipe B gagne. La cote, c’est ce que tu touches pour un euro misé si tu as raison. Ça a l’air d’une prédiction. C’est un prix.',
          'Et un prix, ça se retourne. Un divisé par la cote, et tu obtiens une probabilité. Un divisé par un virgule cinquante-cinq, environ soixante-quatre virgule cinq pour cent : à peu près deux chances sur trois pour l’équipe A. Fais pareil pour le nul et pour l’équipe B, additionne. Tu obtiens cent cinq virgule six pour cent.',
          'Petit problème. Il n’y a que trois issues possibles. Ensemble, leurs chances font cent pour cent. Pas un poil de plus. Les cinq virgule six pour cent qui dépassent, ce n’est pas une erreur de calcul. C’est la marge de l’opérateur. Selon les opérateurs, elle va en général de cinq à douze pour cent.',
          'Tu veux la voir à l’œil nu ? Refais l’expérience du premier épisode, celle des trente-sept euros posés sur toutes les cases. Mise sur les trois résultats à la fois, dans les bonnes proportions, pour toucher cent euros quoi qu’il arrive. Il faut miser cent cinq euros et cinquante-sept centimes. Bravo : tu gagnes à coup sûr. Et tu as perdu plus de cinq euros.',
          'Cette marge est prélevée avant le coup d’envoi, quel que soit le vainqueur. Connaître le foot ne change rien à l’addition : les cotes ont été fixées par des gens qui le connaissent mieux que toi. Le zéro vert n’a pas disparu. Il s’est caché dans la virgule.'
        ]
      },
      {
        h: 'L’appli ne finit jamais',
        cap: 'Deux cents occasions par week-end',
        big: '200',
        p: [
          'Le pire, d’après le parieur, c’est le direct. En plein match : un but dans les dix prochaines minutes ? Cote trois virgule quatre. Ça veut dire environ vingt-neuf pour cent de chances. En réalité, c’est plutôt vingt-six pour cent. Résultat : dix euros misés là-dessus te rendent en moyenne huit euros quatre-vingt-quatre.',
          'Toutes les dix minutes, une nouvelle occasion. Neuf par match. Deux cents par week-end. Selon l’Autorité nationale des jeux, le direct fait plus de la moitié des mises. Le match finit au coup de sifflet. L’appli, jamais.',
          'Et quand ça tourne mal, il y a le cash-out. L’appli appelle ça sécuriser. En vrai, elle te rachète ton pari un peu moins cher qu’il ne vaut. Le parieur résume : j’ai sécurisé mes pertes pendant un an.',
          'Le parieur, lui, a bloqué l’appli. Puis il l’a réinstallée. Puis il s’est interdit de jeu sur le site de l’Autorité nationale des jeux : trois ans, tous les sites agréés, les casinos compris. Le seul pari qu’il a gagné, dit-il. Sami a écrit son histoire sur le site de Joueurs Info Service et pris rendez-vous dans un centre. Comment on fait, c’est le dernier épisode de la saison : La sortie, avec Nour, une écoutante.',
          'Si le jeu prend trop de place, chez toi ou chez quelqu’un que tu aimes, Joueurs Info Service répond au zéro neuf, soixante-quatorze, soixante-quinze, treize, treize, tous les jours de huit heures à deux heures, anonyme et non surtaxé.',
          'La prochaine fois qu’une appli t’offre dix euros, cherche la case verte. Elle est dans la cote. C’était Zéro Vert.'
        ]
      }
    ],
    retenir: [
      'En France, les casinos en ligne sont illégaux : pas de limite, pas d’interdiction volontaire, pas de recours.',
      'Une cote n’est pas une prédiction. C’est un prix, avec la marge dedans.',
      'Le casino n’a plus besoin que tu viennes. Il est déjà dans ta poche.'
    ]
  },

  {
    slug: 'la-sortie',
    status: 'soon',
    number: 9,
    title: 'La sortie',
    hook: 'Dans un casino, il n’y a jamais de panneau vers la sortie. Ce dernier épisode en dessine un.',
    summary:
      'Table ronde de fin de saison : les signes qui doivent alerter, l’appel à Joueurs Info Service, l’interdiction volontaire, les centres de soins gratuits, quoi dire à un proche. Avec Nour, écoutante : personnage fictif, service réel.',
    themes: ['aide', 'psycho'],
    mechanics: ['sortie'],
    witnesses: ['nour'],
    audio: null,
    sections: [
      {
        h: 'Il est tôt. Ou tard.',
        cap: 'Fin de saison, arrêt de bus',
        big: 'LA SORTIE',
        p: [
          'Bienvenue dans Zéro Vert. Dernier épisode de la saison, et on est trois autour de la table. Moi, c’est Théo.',
          'Moi, c’est Tom. Je défends celui qui joue. Quelqu’un doit bien le faire.',
          'Et moi, c’est Arthur. Je vérifie les chiffres. Quelqu’un doit bien le faire aussi.',
          'Fin de nuit. Un arrêt de bus, en face d’un casino. Une femme attend, les mains dans les poches. Elle te voit sortir, elle sourit à moitié : tu sors ? Il est tôt, ou tard, ça dépend.',
          'Elle s’appelle Nour, elle finit sa nuit d’écoute. Nour est un personnage fictif, mais elle représente un service bien réel : les écoutants de Joueurs Info Service, un dispositif de Santé publique France.',
          'Huit épisodes à regarder la maison. La case verte, les machines qui comptent ton temps, le bâtiment sans horloges, les cadeaux calculés sur tes pertes, le casino dans la poche. À un moment, je me suis demandé s’il restait une porte.',
          'C’est le sujet de ce soir. Comment on repère que le jeu déborde, ce qu’on fait ce soir, et demain matin. Et ce qu’on fait pour quelqu’un qu’on aime, quand c’est lui qui ne se lève plus.',
          'Une condition. Pas de sermon.',
          'Promis. Juste du concret. Et une idée à garder tout l’épisode : demander de l’aide, ce n’est pas perdre la partie. C’est se lever de la table.'
        ],
        v: ['theo', 'tom', 'arthur', 'theo', 'arthur', 'tom', 'theo', 'tom', 'arthur']
      },
      {
        h: 'Ce que ce podcast ne dit pas',
        cap: 'Pas une maladie de faibles',
        big: '1 170 000',
        p: [
          'Une objection d’abord. Toute la saison, j’ai eu peur qu’on entende : tu vas perdre, c’est écrit. Or il y a des soirs où on gagne.',
          'Exact. Les tirages restent aléatoires, tu peux finir une soirée en gain. L’avantage de la maison est une moyenne, pas un quota. Mais l’avantage mathématique et les incitations à rejouer s’additionnent.',
          'Le zéro dans le prix, le verre offert, la carte de fidélité, la notification à minuit. Je connais la chanson : sur la durée, beaucoup de gens laissent plus que prévu.',
          'Beaucoup, c’est combien ?',
          'Selon l’Observatoire français des drogues et des tendances addictives, en deux mille vingt-quatre, environ deux virgule cinq pour cent des dix-huit à soixante-quinze ans ont une pratique problématique du jeu. À peu près un million cent soixante-dix mille personnes en France.',
          'Pas une poignée de cas à part, donc. Des collègues, des voisins, des pères, des fils.',
          'Et en face ?',
          'Le produit brut des jeux, ce que les joueurs misent moins ce qu’ils récupèrent : près de quatorze milliards d’euros en deux mille vingt-quatre. C’est ce qui reste à la maison, toutes maisons confondues.',
          'Alors si quelqu’un se reconnaît dans la suite, je ne veux pas qu’il se dise faible.',
          'Il ne l’est pas. Ce n’est pas une maladie de faibles, c’est un produit conçu pour ça. La vraie question n’est pas : est-ce que je vais gagner ? C’est : est-ce que je décide encore ?'
        ],
        v: ['tom', 'arthur', 'tom', 'theo', 'arthur', 'tom', 'theo', 'arthur', 'tom', 'theo']
      },
      {
        h: 'Trois questions',
        cap: 'Un oui, une conversation',
        big: '3 QUESTIONS',
        p: [
          'Comment on sait que ça déborde ? Nour pose trois questions. Pas pour coller une étiquette, pour y voir clair. Pose-les-toi maintenant, dans ta tête. Personne n’écoute.',
          'Un : est-ce que tu rejoues pour te refaire ? On l’a vu dans l’épisode quatre : les psychiatres en ont fait l’un des critères officiels du trouble lié au jeu.',
          'Deux : est-ce que tu mens sur le temps ou sur l’argent ? Une soirée qui devient une petite heure quand tu la racontes. Un relevé de compte que tu caches. Un loyer qui change d’histoire, comme Sami avec sa mère, dans l’épisode huit.',
          'Trois : est-ce que tu y penses quand tu ne joues pas ? Au travail, à table, dans le bus. Le prochain match, la prochaine paie, la prochaine fois.',
          'Et il y a un quatrième signe, plus discret. Miser plus pour ressentir la même chose. Dix euros qui ne font plus rien. Alors cinquante.',
          'Et la règle de Nour ?',
          'Un seul de ces signes mérite une conversation. Deux méritent un appel. Et ça vaut aussi quand c’est quelqu’un d’autre que tu regardes jouer.',
          'Attends. Un seul signe ? Tout le monde a déjà repensé à un match au boulot. Tu vas mettre tout le monde en salle d’attente.',
          'Non. Ce n’est pas un diagnostic. C’est un feu orange.',
          'Un feu orange. D’accord, ça, je signe.',
          'Personne ne te demande de te déclarer malade ce soir. Juste de ne pas faire comme si tu n’avais rien vu.'
        ],
        v: ['theo', 'arthur', 'tom', 'arthur', 'tom', 'theo', 'arthur', 'tom', 'arthur', 'tom', 'theo']
      },
      {
        h: 'Ce qui se passe quand tu appelles',
        cap: 'On ne demande pas ton nom',
        big: 'ANONYME',
        p: [
          'Bon. Imaginons deux signes. Appeler un numéro à une heure du matin, ça fait quand même très dramatique.',
          'Pas plus qu’un appel normal. Joueurs Info Service : zéro neuf, soixante-quatorze, soixante-quinze, treize, treize. Tous les jours, de huit heures du matin à deux heures du matin, anonyme et non surtaxé.',
          'Et qui décroche ?',
          'Quelqu’un comme Nour. On ne te demande pas ton nom. On ne te juge pas. On te demande ce qui s’est passé ce soir, et ce qu’on peut faire demain matin.',
          'Les gens appellent tard, en général, raconte Nour. Pas pour qu’on les juge. Pour dire à quelqu’un ce qu’ils n’ont dit à personne. Souvent, c’est la première fois qu’ils le disent à voix haute.',
          'Le vrai obstacle, il est là. Pas le numéro. Le dire. Et si je n’ai pas envie de parler ?',
          'Le dire, c’est déjà sortir un peu de la table. Mais tu peux aussi taper Joueurs Info Service dans ton moteur de recherche : un chat, un forum où d’autres racontent leur histoire, un annuaire des consultations près de chez toi.',
          'Et ce numéro, il est aussi pour les proches. Une mère qui ne comprend plus où passe l’argent. Une copine qui voit le téléphone s’allumer à chaque but. Un frère qui a déjà prêté trois fois.',
          'Alors un truc à faire maintenant : enregistre-le dans tes contacts. Pas forcément pour toi. Un jour, quelqu’un autour de toi en aura besoin.'
        ],
        v: ['tom', 'arthur', 'tom', 'theo', 'arthur', 'tom', 'arthur', 'tom', 'theo']
      },
      {
        h: 'Demain matin',
        cap: 'Trois ans, dix minutes',
        big: '3 ANS',
        p: [
          'Demain matin, alors. Il existe un outil qui tient vraiment ?',
          'L’interdiction volontaire de jeux. Tu demandes toi-même à être interdit, pour au moins trois ans. Ça s’applique à tous les casinos, à tous les clubs de jeux et à tous les sites agréés en France.',
          'Là, je proteste. Trois ans, s’interdire soi-même comme un enfant puni. C’est violent, non ?',
          'Personne ne te l’impose, c’est toi qui le demandes. En ligne, sur le site de l’Autorité nationale des jeux, avec une pièce d’identité et une dizaine de minutes. Moins qu’une mi-temps.',
          'Le parieur de l’épisode huit l’a fait. Il dit que c’est le seul pari qu’il a gagné. Bon. Je retire « violent ».',
          'En deux mille vingt-quatre, plus de soixante-treize mille personnes étaient inscrites au fichier des interdits de jeux. Pour beaucoup, c’est la première mise gagnante de leur vie.',
          'Il y a quand même un trou dans la raquette. Les sites illégaux, ceux de Sami, ne consultent pas ce fichier.',
          'Alors on parle argent. Confier sa carte bancaire à quelqu’un de confiance, bloquer les paiements vers les sites de jeu, installer un logiciel qui bloque les sites.',
          'Et prendre rendez-vous dans un centre de soins spécialisé. C’est gratuit, et il y en a dans chaque département.',
          'Sami y est allé. On ne lui a pas fait la morale. On lui a demandé de revenir toutes les deux semaines. Il a rechuté une fois. On lui a dit : c’est normal, on continue.',
          'Une rechute n’efface pas le chemin. La sortie n’est pas une porte qu’on franchit une fois pour toutes. C’est un chemin, et personne n’oblige à le faire seul.'
        ],
        v: ['theo', 'arthur', 'tom', 'arthur', 'tom', 'arthur', 'tom', 'arthur', 'theo', 'tom', 'theo']
      },
      {
        h: 'Se lever de la table',
        cap: 'Tu peux encore te lever',
        big: 'ZÉRO VERT',
        p: [
          'Il me reste la question la plus dure. Et si c’est quelqu’un que j’aime qui joue ?',
          'Nour est claire : tu ne le feras pas arrêter. Mais tu peux dire ce que tu vois, sans accuser. Par exemple : je m’inquiète, voilà ce que j’ai remarqué. Ne rembourse pas ses dettes, ne mens pas pour lui. Et appelle, toi aussi.',
          'Ne pas rembourser. C’est dur à entendre. Mais je comprends.',
          'C’est la fin de la saison. On ne sait pas encore ce qu’on racontera ensuite. Un bilan chacun ?',
          'On a commencé à Monte-Carlo, avec un homme qui avait fait sauter la banque et qui a fini dans une fosse commune. Moi, je retiens qu’on a parlé des joueurs sans jamais se moquer d’eux. J’y tenais.',
          'Moi, que la bille n’a pas de mémoire. Qu’un presque-gagné est une perte. Que la martingale retarde la perte et la grossit. Et que le zéro se cache dans chaque prix, à la roulette comme dans une cote.',
          'Une dernière chose sur la case verte. Elle gagne à chaque tour, parce qu’elle est dans le prix. Mais elle ne touche rien sur la mise que tu ne poses pas, la soirée où tu te lèves, l’appel que tu passes.',
          'Rien ne va plus, dit le croupier : tu ne peux plus rien changer au tour en cours.',
          'Il ne dit rien du suivant. Tu peux encore te lever de la table.',
          'Joueurs Info Service, zéro neuf, soixante-quatorze, soixante-quinze, treize, treize, tous les jours de huit heures à deux heures, de façon anonyme et non surtaxée. Pour toi, ou pour quelqu’un que tu aimes.',
          'Merci d’avoir écouté cette saison. La bille n’a pas de mémoire. Toi, si. Souviens-toi de la case verte, et de ce numéro. C’était Zéro Vert.'
        ],
        v: ['tom', 'arthur', 'tom', 'theo', 'tom', 'arthur', 'theo', 'tom', 'theo', 'arthur', 'theo']
      }
    ],
    retenir: [
      'Un signe mérite une conversation. Deux méritent un appel.',
      'L’interdiction volontaire dure au moins trois ans et se demande en ligne, en dix minutes.',
      'Joueurs Info Service : 09 74 75 13 13, tous les jours de 8 h à 2 h, anonyme et non surtaxé, aussi pour les proches.'
    ]
  }
];
