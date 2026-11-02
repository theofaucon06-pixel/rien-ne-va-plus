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
export const EPISODES = [
  {
    slug: 'bande-annonce',
    status: 'soon',
    number: 0,
    kind: 'trailer',
    title: 'Rien ne va plus',
    hook: 'Trois mots, et plus rien de ce que tu fais ne compte.',
    summary:
      'Ce que signifie vraiment la phrase du croupier, ce que ce podcast promet, et ce qu’il ne fera jamais : te donner un système pour gagner.',
    themes: ['maths'],
    mechanics: ['avantage'],
    witnesses: [],
    audio: null,
    sections: [
      {
        h: 'La phrase du croupier',
        p: [
          'À la roulette, le croupier lance la bille, puis il dit : « Rien ne va plus. »',
          'Ça veut dire que les mises sont closes. La bille tourne encore. La roue tourne encore. Mais tout ce que tu pourrais faire à partir de maintenant ne change plus rien.',
          'Ce podcast est construit sur cette idée : dans un casino, l’essentiel est décidé avant que tu n’aies posé le premier jeton.'
        ]
      },
      {
        h: 'Ce que tu vas entendre',
        p: [
          'Chaque épisode prend un mécanisme réel. L’avantage de la maison. Le temps passé sur une machine. L’architecture sans horloges. Le cadeau qui n’en est pas un.',
          'Et chaque fois, une personne réelle qui l’a vécu. Un joueur de Monte-Carlo en 1891. Un écrivain russe. Une anthropologue qui a écouté des joueuses pendant quinze ans. Quand un personnage est composite ou fictif, je te le dis.',
          'Les chiffres viennent de sources publiques. Elles sont listées au bas de chaque épisode, pour que tu puisses vérifier.'
        ]
      },
      {
        h: 'Ce que tu n’entendras pas',
        p: [
          'Aucun système pour gagner. Il n’y en a pas. C’est justement le sujet.',
          'Aucun sermon non plus. Beaucoup de gens jouent sans que cela devienne un problème, et personne n’a besoin d’un cours de morale pour ça.',
          'Juste de quoi regarder le décor de l’autre côté. Et savoir quoi faire, ou quoi dire à quelqu’un, quand ça ne va plus.'
        ]
      }
    ],
    retenir: [
      'Quand la bille est lancée, tes décisions ne changent plus le tirage.',
      'Ce podcast ne vend aucun système : il explique pourquoi il n’en existe pas.',
      'Chaque affirmation chiffrée est sourcée en bas de l’épisode.'
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
    audio: null,
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
    status: 'soon',
    number: 2,
    title: 'La zone',
    hook: 'Une joueuse de Las Vegas ne joue pas pour gagner. Elle joue pour que ça ne s’arrête pas.',
    summary:
      'Les machines à sous, du temps sur machine aux « presque gagné » et aux pertes déguisées en gains. Avec Mollie, suivie quinze ans par une anthropologue, et le jackpot qui n’existait pas.',
    themes: ['psycho', 'histoires', 'lieux'],
    mechanics: ['zone', 'ldw'],
    witnesses: ['mollie', 'bookman'],
    audio: null,
    sections: [
      {
        h: 'Mollie',
        p: [
          'Mollie est une joueuse de machines à sous. Elle travaille à l’accueil d’un hôtel, à deux rues du casino. Ses pauses, ses soirées, ses jours de repos : toujours la même machine, la troisième de la rangée. Si quelqu’un est dessus, elle attend.',
          'Mollie est réelle, mais son nom est un pseudonyme. C’est l’une des joueuses que l’anthropologue Natasha Dow Schüll a suivies pendant quinze ans à Las Vegas. Le résultat s’appelle « Addiction by Design », publié en 2012.',
          'Ce que Mollie explique à Schüll est contre-intuitif. Elle ne joue pas pour gagner. Elle joue pour entrer dans ce qu’elle appelle la zone : un état où le temps, l’argent et son propre corps s’effacent. Un gros gain, dit-elle, l’agace. Ça interrompt.',
          'Elle sait exactement quand elle sort de la zone. Quand il n’y a plus de crédits.'
        ]
      },
      {
        h: 'Le temps sur machine',
        p: [
          'Du point de vue du casino, le chiffre qui compte, ce n’est pas ce que tu perds par tour. C’est le temps que tu restes.',
          'Un tour toutes les trois secondes. Un siège confortable. Pas de pause naturelle. Des « presque » affichés plus souvent que le hasard ne le ferait : deux symboles gagnants, le troisième juste au-dessus de la ligne.',
          'Des chercheurs ont mesuré l’effet de ces presque-gains. Le chercheur R. L. Reid les décrit dès 1986. En 2009, une équipe dirigée par Luke Clark, dans la revue Neuron, montre qu’ils activent des circuits du cerveau liés au gain, et renforcent l’envie de rejouer.',
          'Un presque-gain est une perte. Ton cerveau le traite pourtant comme un encouragement.'
        ]
      },
      {
        h: 'Gagner en perdant',
        p: [
          'Les machines modernes ont jusqu’à vingt lignes de gain à la fois. Tu en joues vingt, avec un jeton chacune. Une seule ligne gagne, et elle te rend trente centimes sur un jeton misé.',
          'La machine s’illumine. Elle sonne. Elle affiche « gain ». Tu viens de perdre soixante-dix centimes.',
          'Ce phénomène a un nom : les pertes déguisées en gains. Il a été décrit en 2010 par Mike Dixon et ses collègues de l’université de Waterloo, dans la revue Addiction. Leur mesure : pendant ces faux gains, le corps réagit presque comme pour un vrai. Et après la séance, les joueurs surestiment le nombre de fois où ils ont gagné.',
          'Le seul indicateur honnête, c’est le compteur de crédits. Lui ne fait pas la fête.'
        ]
      },
      {
        h: '42 949 672 dollars et 76 cents',
        p: [
          'Août 2016, au Resorts World Casino, dans le Queens, à New York. Katrina Bookman joue sur une machine à un cent. L’écran s’arrête sur 42 949 672 dollars et 76 cents. Elle se prend en photo devant. Elle pense à ses enfants, à une maison.',
          'Le casino invoque un dysfonctionnement. D’après lui, cette machine ne pouvait pas payer plus de six mille cinq cents dollars. Le règlement, imprimé en petit sur la machine, dit qu’une panne annule les paiements et les parties.',
          'Ce que le casino lui propose : un dîner, et deux dollars vingt-cinq, ce que son tour avait réellement rapporté. Elle porte plainte.',
          'Retiens la morale discrète : l’écran affichait quarante-deux millions. Le règlement affichait autre chose. Dans un casino, c’est toujours le règlement qui gagne.'
        ]
      },
      {
        h: 'Ce que dit la loi',
        p: [
          'En France, le taux de redistribution d’une machine à sous doit être d’au moins quatre-vingt-cinq pour cent, d’après l’arrêté du 14 mai 2007. Autrement dit, la machine peut légalement garder jusqu’à quinze centimes de chaque euro.',
          'À comparer avec la roulette européenne, qui en garde un peu moins de trois. C’est l’un des jeux les plus chers de la salle. Et c’est celui sur lequel on reste le plus longtemps.'
        ]
      }
    ],
    retenir: [
      'Le casino mesure le temps que tu restes, pas ce que tu perds par tour.',
      'Un « presque gagné » est une perte, même s’il ressemble à un encouragement.',
      'Quand une machine fait la fête, regarde le compteur : lui ne ment pas.'
    ]
  },

  {
    slug: 'le-systeme-infaillible',
    status: 'soon',
    number: 3,
    title: 'Le système infaillible',
    hook: 'Dostoïevski a écrit un chef-d’œuvre en vingt-six jours pour payer ses dettes de jeu. Son système, lui, n’a jamais marché.',
    summary:
      'La martingale, l’illusion de contrôle et l’histoire du Joueur. Avec une voix rare : celle d’Anna, qui attendait dans la chambre.',
    themes: ['maths', 'psycho', 'histoires'],
    mechanics: ['systeme'],
    witnesses: ['dosto', 'anna'],
    audio: null,
    sections: [
      {
        h: 'Wiesbaden, 1863',
        p: [
          'La première fois, Fiodor Dostoïevski gagne dix mille francs en une heure, à Wiesbaden. Une heure. Ce jour-là, dira-t-il, a décidé de dix ans de sa vie.',
          'Il est convaincu d’avoir trouvé le secret. Garder son sang-froid. Ne jamais s’emballer. Il l’écrit à sa belle-sœur avec la certitude d’un mathématicien.',
          'À chaque perte, il est sûr que c’est parce qu’il s’est emballé. Le système, jamais, n’est en cause.'
        ]
      },
      {
        h: 'Vingt-six jours',
        p: [
          'En octobre 1866, Dostoïevski est ruiné. Il a signé avec un éditeur un contrat qui lui prendrait tous ses futurs livres s’il rate une échéance. Il a vingt-six jours.',
          'Il engage une sténographe, une jeune femme de vingt ans nommée Anna Grigorievna. Il lui dicte « Le Joueur », un roman sur un homme et une roulette. Le livre est rendu à temps. Quelques mois plus tard, Anna devient sa femme.',
          'Le roman est un chef-d’œuvre. Il n’a rien réglé.'
        ]
      },
      {
        h: 'Baden-Baden, 1867',
        p: [
          'Été 1867. Fiodor et Anna arrivent à Baden-Baden, mariés depuis quatre mois. Il perd dès le premier jour.',
          'Il met en gage l’alliance d’Anna. Puis ses boucles d’oreilles. Puis sa robe. Puis son propre manteau. Ils finissent dans deux chambres au-dessus d’une forge, où le marteau commence à cinq heures du matin.',
          'Anna a consigné cette période dans un journal, puis dans des mémoires rédigés plus tard. Elle décrit un homme qui revient, pleure, jure, et repart.',
          'Ce que personne ne raconte, dit-elle, c’est ce que ça fait à celle qui attend. Compter les heures avec la faim. Et ne jamais arriver à lui en vouloir : c’est ça, le pire.',
          'Il arrête en avril 1871, à Wiesbaden, une dernière nuit. Il écrit à Anna : « Une grande chose s’est accomplie en moi. » Il ne rejouera plus.'
        ]
      },
      {
        h: 'La martingale',
        p: [
          'Le système classique s’appelle la martingale. Tu mises sur le rouge. Si tu perds, tu doubles. Tu perds encore, tu doubles encore. Quand le rouge sort enfin, tu récupères toutes tes pertes, plus ta mise de départ.',
          'Sur le papier, imparable. Le rouge finit toujours par sortir.',
          'Deux murs t’attendent. Le premier, ton argent. Le second, le plafond de la table. Partons de dix euros. Après dix pertes d’affilée, tu as déjà perdu dix mille deux cent trente euros. Et la onzième mise doit être de dix mille deux cent quarante.',
          'Dix rouges perdus d’affilée, c’est environ une chance sur huit cents. Rare. Mais sur de nombreux tours, ça arrive. Et ce jour-là, la perte est énorme.',
          'La martingale ne bat pas l’avantage de la maison. Elle rend les petites pertes rares et la grosse perte presque certaine, un jour ou l’autre. L’espérance reste moins 2,7 pour cent de chaque mise.'
        ]
      },
      {
        h: 'L’illusion de contrôle',
        p: [
          'Pourquoi croit-on à un système ? La psychologue Ellen Langer l’a montré en 1975. Elle propose à des gens un billet de loterie. Certains choisissent leur billet, d’autres le reçoivent. Ensuite, elle propose de le racheter.',
          'Ceux qui avaient choisi leur billet en demandent beaucoup plus. Le billet a exactement les mêmes chances. Mais choisir donne le sentiment d’avoir pesé sur le résultat.',
          'Choisir son numéro. Lancer les dés soi-même. Appuyer sur « stop ». Doubler. Autant de gestes qui donnent l’impression de peser sur un tirage qui n’en a que faire.'
        ]
      }
    ],
    retenir: [
      'Doubler après chaque perte ne bat pas l’avantage de la maison : cela retarde la perte et la grossit.',
      'Choisir soi-même un numéro, un geste ou un moment ne change pas la probabilité.',
      'Le seul système qui marche s’appelle l’avantage de la maison. Il appartient au casino.'
    ]
  },

  {
    slug: 'se-refaire',
    status: 'soon',
    number: 4,
    title: 'Se refaire',
    hook: 'Il a transformé 50 dollars en 40 millions. Puis il a voulu se refaire.',
    summary:
      'L’histoire d’Archie Karas et la mécanique de la poursuite des pertes : pourquoi « juste pour rattraper » est le nom que prend la perte quand elle demande à continuer.',
    themes: ['psycho', 'histoires', 'maths'],
    mechanics: ['refaire'],
    witnesses: ['karas'],
    audio: null,
    sections: [
      {
        h: 'Cinquante dollars',
        p: [
          'Décembre 1992. Archie Karas arrive à Las Vegas avec cinquante dollars. Il vient de tout perdre à Los Angeles, la semaine précédente.',
          'Deux ans et demi plus tard, il en a environ quarante millions. Poker d’abord, contre un joueur qu’il connaît. Puis le billard, à des sommes qui font peur. Puis les dés, avec des mises maximales jouées en parallèle. Le casino relève ses plafonds pour lui.',
          'Le journaliste Michael Konik raconte cette série dans Cigar Aficionado, en 1996. Personne, à sa connaissance, n’avait jamais fait ça.'
        ]
      },
      {
        h: 'Onze millions en une nuit',
        p: [
          'Janvier 1995. Karas perd onze millions de dollars en une nuit, aux dés.',
          'Qu’est-ce qu’on fait, quand on vient de perdre onze millions ? Lui raconte qu’il est revenu le lendemain. Pour se refaire.',
          'Dix-sept millions de plus s’évaporent au baccara, en trois semaines. Au bout, il ne reste rien.',
          'Il rejouera toute sa vie, par cycles. Un million, zéro. Un million, zéro. En 2013, il est arrêté pour avoir marqué des cartes dans un casino de Californie. Il meurt en 2024, sans fortune.'
        ]
      },
      {
        h: 'Pourquoi on veut se refaire',
        p: [
          'Perdre fait mal. Perdre et s’arrêter fait plus mal encore, parce que la perte devient définitive. Tant qu’on joue, elle reste provisoire. On rejoue, « juste pour rattraper ».',
          'Le sociologue Henry Lesieur appelait ça « la chasse », dès 1977, dans un livre sur la carrière du joueur compulsif. Aujourd’hui, c’est l’un des neuf critères du trouble lié au jeu d’argent dans les manuels de psychiatrie : après avoir perdu, retourner souvent jouer pour se refaire.',
          'La difficulté, c’est que la perte est toujours liée à une promesse de récupération. Et la promesse est toujours pour la prochaine fois.'
        ]
      },
      {
        h: 'L’arithmétique de la poursuite',
        p: [
          'Prenons un peu de calcul. L’avantage de la maison s’applique à chaque euro misé, pas à chaque soirée. Il ne s’éteint jamais.',
          'Tu mises cent euros par tour. Mille tours, cela fait cent mille euros misés. À la roulette européenne, la perte moyenne attendue est de deux mille sept cents euros.',
          'Maintenant, tu veux te refaire. Tu doubles tes mises. Même soirée, même nombre de tours : deux cent mille euros misés, cinq mille quatre cents euros de perte attendue.',
          'Miser plus pour rattraper ne rattrape pas. Ça accélère le rythme de la perte moyenne.',
          'Karas a joué contre un avantage d’environ un pour cent au baccara. Quarante millions n’ont pas suffi à battre un pour cent. Ce n’est pas la somme qui compte. C’est la soustraction.'
        ]
      }
    ],
    retenir: [
      'Se refaire n’est pas un plan : miser plus pour rattraper fait perdre plus vite en moyenne.',
      'Aucun capital ne suffit contre un avantage qui s’applique à chaque mise.',
      'Rejouer pour récupérer est l’un des signes à prendre au sérieux. Un seul mérite déjà une conversation.'
    ]
  },

  {
    slug: 'le-seul-jeu-quon-peut-battre',
    status: 'soon',
    number: 5,
    title: 'Le seul jeu qu’on peut battre',
    hook: 'Au blackjack, on peut gagner. Et le jour où on y arrive, la maison change les règles.',
    summary:
      'Blackjack, stratégie de base et comptage de cartes avec Ken Uston. Puis deux jeux où c’est la simplicité, ou la confusion, qui coûte cher : la roue de la fortune et les dés.',
    themes: ['maths', 'histoires'],
    mechanics: ['competence', 'simplicite', 'bruit'],
    witnesses: ['uston'],
    audio: null,
    sections: [
      {
        h: 'Un jeu où les décisions comptent',
        p: [
          'Au blackjack, tes décisions changent vraiment quelque chose. Tirer, rester, doubler, séparer : mal jouer coûte, bien jouer rapporte.',
          'Dès 1962, le mathématicien Edward Thorp montre dans « Beat the Dealer » qu’avec une stratégie de base adaptée aux règles, l’avantage de la maison peut tomber autour de un demi pour cent.',
          'Ce chiffre varie avec les règles de la table et avec tes décisions. Ce n’est pas un taux de mains perdues. Tu peux gagner, perdre, ou faire égalité.',
          'À l’inverse, certaines options coûtent cher. L’assurance, par exemple, vaut environ 7,4 % d’avantage pour la maison avec un sabot neuf de six paquets.'
        ]
      },
      {
        h: 'Ken Uston',
        p: [
          'Ken Uston était vice-président à la Bourse de San Francisco. Un ami lui montre comment compter les cartes. Il démissionne.',
          'Compter, ce n’est pas tricher. C’est se souvenir. Quand le sabot est riche en figures, il mise gros. Sinon, il mise petit. Avec des équipes, des signaux, des déguisements, il gagne des millions.',
          'Les casinos l’interdisent. Partout. Il revient avec des barbes, des perruques, de faux noms. On le reconnaît. On le sort. Un soir, selon lui, des vigiles lui cassent la mâchoire.',
          'En 1982, la Cour suprême du New Jersey juge, dans l’affaire Uston contre Resorts International, qu’un casino de l’État ne peut pas exclure un compteur de cartes. Victoire. Les casinos répondent en changeant le jeu : plus de paquets, un mélange plus précoce, des règles modifiées.',
          'Son avantage fond. Il meurt à Paris, en septembre 1987.',
          'Retiens l’ironie. Le blackjack est le seul jeu de la salle où l’on peut battre la maison. Et le jour où on y arrive, la maison change les règles.'
        ]
      },
      {
        h: 'La roue de la fortune',
        p: [
          'Cinquante-quatre cases, une aiguille, un geste. C’est le jeu le plus simple du casino. C’est aussi l’un des plus chers.',
          'Selon la case sur laquelle tu mises, la maison garde entre onze et vingt-quatre pour cent de chaque mise. C’est dix fois la roulette. Quarante fois un blackjack bien joué.',
          'Pourquoi ce jeu est-il placé près de l’entrée, brillant et bruyant ? Parce que plus un jeu est simple à comprendre, plus il peut se permettre d’être mauvais. Personne ne calcule ce qu’il n’a pas besoin de comprendre.'
        ]
      },
      {
        h: 'Les dés, et le bruit',
        p: [
          'Le craps est l’inverse. Un tapis plein de cases, des cris, des annonces : « quatre pour un », « cinq contre un ».',
          'Sur ce tapis, la ligne de passe garde 1,41 % des mises. La mise « n’importe quel sept » en garde 16,67 %. Soit douze fois plus. Les cases sont de la même couleur. Rien ne le signale.',
          'Plus un jeu propose de mises différentes, plus il peut en cacher de mauvaises. Le bruit, la vitesse et les cris servent à ce que tu poses tes jetons là où on te le dit, pas là où c’est le moins cher.'
        ]
      }
    ],
    retenir: [
      'Au blackjack, bien jouer réduit l’avantage de la maison sans l’annuler.',
      'Plus un jeu est simple, plus il peut être cher : la roue prend de 11 à 24 %.',
      'Quand une table propose vingt mises, elle en a dix-neuf à te vendre.'
    ]
  },

  {
    slug: 'une-maison-sans-horloges',
    status: 'soon',
    number: 6,
    title: 'Une maison sans horloges',
    hook: 'Depuis que tu es entré, as-tu vu une fenêtre ? Une horloge ? Un panneau « Sortie » ?',
    summary:
      'L’architecture des casinos, du manuel de Bill Friedman aux jetons et aux boissons offertes. Avec deux personnages composites : l’architecte, et un croupier en pause.',
    themes: ['lieux', 'psycho'],
    mechanics: ['maison'],
    witnesses: ['architecte', 'main'],
    audio: null,
    sections: [
      {
        h: 'Le manuel',
        p: [
          'En 2000, un homme publie un manuel de six cents pages. Il s’appelle Bill Friedman. Il a été joueur compulsif, puis directeur de casino. Le titre : « Designing Casinos to Dominate the Competition ». Concevoir des casinos pour dominer la concurrence.',
          'Ses recommandations tiennent en une liste. Pas de fenêtres, pas d’horloges. Des plafonds bas. Des allées qui tournent. Des machines visibles de partout. Une sortie qui n’est jamais en ligne droite.',
          'Plus tard, un autre consultant, Roger Thomas, défend le contraire : des espaces ouverts, de la lumière, un « terrain de jeu ». Les moyens changent. L’objectif, lui, reste le même : que tu restes.'
        ]
      },
      {
        h: 'L’architecte',
        p: [
          'Dans notre jeu, on l’appelle l’architecte. Précisons : c’est un personnage composite, construit d’après ces deux consultants réels.',
          'Il dirait : tu n’es pas perdu. Tu es exactement là où je t’ai mis.',
          'Les jetons ? Pour que l’argent ne pèse rien. Le verre offert ? Pour que le compteur de pertes devienne flou. Le siège ? Pour que tu ne te lèves pas. La moquette chargée ? Pour que tu regardes les machines, pas le sol.',
          'Le tapis rouge, la fontaine et les colonnes, à l’entrée, servent la première minute. Ensuite, on baisse le plafond et on serre les allées. Dans une allée étroite, un joueur se sent à l’abri. Il reste.',
          'Natasha Dow Schüll décrit les mêmes principes dans « Addiction by Design » : l’ergonomie des salles, les cartes de fidélité, les jetons, les boissons, l’absence d’horloges.'
        ]
      },
      {
        h: 'Un croupier en pause',
        p: [
          'Autre personnage composite, bâti à partir de témoignages d’anciens croupiers publiés dans la presse française : un croupier en pause.',
          'Il fait tourner la roulette trois cents fois par nuit, cinq nuits par semaine. Il dit : je ne suis pas croupier, je suis le mécanisme.',
          'On lui apprend à sourire, à dire « bonne chance », à pousser les jetons vite. On lui apprend aussi à repérer celui qui ne devrait plus être là, et à ne rien dire, sauf s’il fait du bruit.',
          'Les pourboires sont une grande part de son salaire. Alors on encourage. Un gros gagnant, on l’applaudit. Un gros perdant, on lui dit « ça va tourner ».',
          'Certains collègues jouent en sortant. Ils savent tout. Cela ne les protège pas plus que quiconque.'
        ]
      },
      {
        h: 'Ce que la loi impose en France',
        p: [
          'Le tableau n’est pas entièrement sombre. L’arrêté du 14 mai 2007 et la loi du 12 mai 2010 imposent aux casinos un dispositif de repérage et de prise en charge des joueurs excessifs, avec formation du personnel. Depuis 2020, l’Autorité nationale des jeux, l’ANJ, contrôle ces dispositifs.',
          'La question, c’est l’écart entre ce que la loi demande et ce que le décor fait. Un dispositif de repérage fonctionne mieux quand rien, dans la salle, n’est conçu pour t’empêcher de lever les yeux.'
        ]
      }
    ],
    retenir: [
      'Absence de fenêtres, d’horloges et de sortie visible : tout cela est conçu pour que tu restes.',
      'Les jetons et l’alcool servent à brouiller la mémoire de ce que tu dépenses.',
      'Quand tout est fait pour rester, rester n’est plus vraiment une décision.'
    ]
  },

  {
    slug: 'le-tapis-rouge',
    status: 'soon',
    number: 7,
    title: 'Le tapis rouge',
    hook: 'Le casino connaît ton chiffre. Tout ce qu’on t’offre a été calculé dessus.',
    summary:
      'Hôtes, cadeaux, crédit, SMS : comment un casino valorise un client. Deux dossiers réels, Terrance Watanabe à Las Vegas et Harry Kakavas à Melbourne.',
    themes: ['lieux', 'histoires'],
    mechanics: ['tapis', 'retour'],
    witnesses: ['watanabe', 'kakavas'],
    audio: null,
    sections: [
      {
        h: 'Le « théo »',
        p: [
          'Dans un casino, chaque joueur a un chiffre. On l’appelle la perte théorique, ou le « théo ».',
          'Le calcul est simple : ta mise moyenne, multipliée par le nombre de tours, multipliée par l’avantage de la maison. C’est ce que tu es censé laisser en moyenne.',
          'Ton verre, ta chambre, ton repas, ton cadeau, ton crédit : tout est décidé à partir de ce chiffre. Un cadeau n’est jamais une générosité. C’est une fraction, prévue, de ce que tu vas perdre.',
          'Pour le grand public, cela s’appelle une carte de fidélité. Pour les gros joueurs, un hôte dont le métier est de te rappeler.'
        ]
      },
      {
        h: 'Terrance Watanabe, Las Vegas, 2007',
        p: [
          'Terrance Watanabe a vendu l’entreprise familiale d’articles de fête, à Omaha. Il est riche. Il joue.',
          'En 2007, il perd environ cent vingt-sept millions de dollars, dans deux casinos de Las Vegas. La journaliste Alexandra Berzon reconstitue l’affaire dans le Wall Street Journal, en décembre 2009.',
          'Ce qu’il dit avoir reçu : des hôtes rien que pour lui, des cadeaux, une remise sur ses pertes, des millions de crédit, de l’alcool à volonté. Il dit aussi que des antidouleurs lui étaient fournis, c’est du moins ce qu’il a affirmé au tribunal.',
          'Un autre casino l’avait exclu la même année pour jeu compulsif. Celui-ci a laissé ses portes ouvertes.',
          'Quand il refuse de payer les quatorze millions sept cent mille dollars restants, le casino le poursuit. L’affaire se règle en 2010, après un accord.',
          'Lui se décrit ainsi : le client parfait. C’est pour ça, dit-il, que personne dans l’industrie ne prononce jamais son nom.'
        ]
      },
      {
        h: 'Harry Kakavas, Melbourne, 2005',
        p: [
          'Harry Kakavas est un joueur pathologique connu. Exclu du casino de Sydney. Il avait lui-même demandé à être interdit au Crown de Melbourne, des années plus tôt. Condamné pour une fraude commise pour financer son jeu.',
          'Le Crown le rappelle quand même. Un hôte a fait le voyage jusqu’à chez lui. Un jet privé l’amène. Suites, cadeaux, une boîte de cinquante mille dollars en « argent porte-bonheur ».',
          'Entre juin 2005 et août 2006, il mise environ un milliard quatre cent trente millions de dollars australiens au baccara, jusqu’à trois cent mille la main. Pour une perte nette d’environ vingt millions et demi.',
          'Il attaque le casino : j’étais malade, ils le savaient, ils m’ont exploité. En 2013, la Haute Cour d’Australie rejette sa demande, à l’unanimité. Le casino n’avait pas l’obligation de le protéger de lui-même.',
          'Le tapis rouge est légal. C’est tout le problème.'
        ]
      },
      {
        h: 'Revenir, c’est la valeur',
        p: [
          'Quelques jours après une première soirée, un SMS : « Votre suite vous attend vendredi. » Il connaît ton prénom.',
          'Une soirée perdue n’est qu’une soirée. Un client qui revient, c’est une rente. Les manuels de marketing de casino appellent ça la « valeur à vie » d’un client.',
          'Tout devient plus facile la deuxième fois. La carte est déjà dans ta poche. L’hôte te salue. Le verre arrive sans que tu le demandes. La mise minimale te paraît petite. On appelle cela l’escalade, et personne ne la voit de l’intérieur.',
          'En France, le démarchage des joueurs placés en interdiction de jeu est interdit. Celui des autres ne l’est pas.'
        ]
      }
    ],
    retenir: [
      'Un cadeau de casino est calculé à partir de ce que le casino estime que tu vas perdre.',
      'Légal ne veut pas dire protecteur : la justice australienne a jugé que Crown n’avait pas à protéger Kakavas de lui-même.',
      'Un casino ne cherche pas ta perte de ce soir. Il cherche ton retour.'
    ]
  },

  {
    slug: 'le-casino-dans-la-poche',
    status: 'soon',
    number: 8,
    title: 'Le casino dans la poche',
    hook: 'Il n’a jamais mis les pieds dans un casino. Il n’en a pas eu besoin.',
    summary:
      'Casinos en ligne illégaux, streamers, paris sportifs et cotes truquées par une marge invisible. Deux personnages composites, un jeune homme et un parieur, pour comprendre le jeu qui grandit le plus vite en France.',
    themes: ['ligne', 'maths'],
    mechanics: ['poche', 'pari'],
    witnesses: ['sami', 'parieur'],
    audio: null,
    sections: [
      {
        h: 'Un jeune homme',
        p: [
          'Précision d’abord : ce personnage est composite. Il est construit à partir de témoignages publiés par Joueurs Info Service et des données de l’enquête de l’OFDT et de Santé publique France. Mais chaque élément de son histoire correspond à des situations réelles.',
          'Printemps 2020. Il a seize ans. Confiné. Un streamer qu’il regarde joue au blackjack en direct, avec un lien en description. Des sites payés en cryptomonnaie, sans pièce d’identité. Les premiers dépôts font dix euros.',
          'Au début, il gagne. Enfin, il croit : il ne compte pas. Puis il a un salaire, une alternance. Début 2024, il a quinze mille euros de côté.',
          'Un accident de voiture, l’été. Rien de grave, mais il reste chez lui. Les dépôts passent de cent euros par semaine à cinq cents, parfois mille par jour. Depuis son lit.',
          'Aujourd’hui, c’est presque tout son salaire, le jour où il tombe. Il ment à sa mère sur le loyer.'
        ]
      },
      {
        h: 'Un casino qui tient dans un téléphone',
        p: [
          'Un fait de droit, d’abord : en France, les jeux de casino en ligne sont illégaux. Les sites qui s’adressent à toi sont à l’étranger, souvent en cryptomonnaie, sans limite de dépôt, sans interdiction volontaire, sans recours.',
          'Le dépôt prend deux secondes. Le retrait, « trois à cinq jours ouvrés », après avoir misé quarante fois le bonus. L’auto-spin joue des tours à ta place pendant que tu regardes ailleurs.',
          'Ce que tu voyais dans les épisodes précédents tient dans ce téléphone. Sans horloge, sans fenêtre, sans personne pour te voir partir. À trois heures du matin.',
          'Les chiffres de l’OFDT pour 2024 : trois millions neuf cent mille joueurs en ligne, en hausse de 7,7 %.'
        ]
      },
      {
        h: 'Un parieur',
        p: [
          'Autre personnage composite, d’après les données de l’ANJ et de l’OFDT. Il regarde un match et sa mise en même temps.',
          'Tout a commencé par un pari gratuit : dix euros offerts, « sans dépôt ». Le foot, il connaît. Il pense que connaître, ça suffit.',
          'Le premier mois, il gagne trois cent quarante euros. Il le dit à tout le monde. Les huit mois suivants, il perd six mille deux cents euros. Il ne le dit à personne.',
          'Les données de l’ANJ vont dans le même sens : les paris sportifs en ligne sont le segment qui croît le plus vite, avec une clientèle très majoritairement masculine et jeune. Selon l’OFDT, la pratique problématique se concentre chez les hommes de 18 à 34 ans.'
        ]
      },
      {
        h: 'La marge cachée dans la cote',
        p: [
          'Un match. Trois cotes : 1,55 pour la victoire de l’équipe A, 4,20 pour le nul, 5,80 pour la victoire de l’équipe B.',
          'Convertis chaque cote en probabilité, en prenant un divisé par la cote. Ça donne environ 64,5 %, 23,8 % et 17,2 %. Additionne. Tu obtiens 105,6 %. Une probabilité totale ne peut pas dépasser cent.',
          'Les 5,6 % au-dessus de cent, c’est la marge de l’opérateur. Elle se prélève quel que soit le vainqueur, avant même le coup d’envoi. Selon les opérateurs, elle varie en général de 5 à 12 %.',
          'Connaître le foot ne change rien à cette addition : les cotes ont été fixées par des gens qui le connaissent mieux que toi.',
          'Le pari en direct multiplie les occasions. Un but dans les dix minutes, cote 3,4 : cela correspond à une probabilité implicite de 29 %, pour une probabilité réelle d’environ 26 %. Neuf occasions par match. Deux cents par week-end.',
          'Et le cash-out, que l’on appelle « sécuriser », te rachète ton pari toujours un peu moins cher qu’il ne vaut.'
        ]
      }
    ],
    retenir: [
      'En France, les casinos en ligne sont illégaux : aucun recours, aucune interdiction volontaire.',
      'Une cote n’est pas une prédiction. C’est un prix, avec la marge dedans.',
      'Le casino n’a plus besoin que tu viennes. Il est déjà dans ta poche.'
    ]
  },

  {
    slug: 'la-sortie',
    status: 'soon',
    number: 9,
    title: 'La sortie',
    hook: 'Une soirée gagnante est possible. Elle ne supprime pas l’avantage mathématique des jeux.',
    summary:
      'Les signes à repérer, l’interdiction volontaire de jeux, les consultations gratuites et le numéro à garder. Avec Nour, écoutante : un personnage fictif pour un service très réel.',
    themes: ['aide'],
    mechanics: ['sortie'],
    witnesses: ['nour'],
    audio: null,
    sections: [
      {
        h: 'Ce que ce podcast ne dit pas',
        p: [
          'Avant de finir, une précision. Ce podcast ne dit pas que tu perdras forcément ce soir. Les tirages restent aléatoires et tu peux finir en gain.',
          'Il dit autre chose : que l’avantage mathématique et les incitations à rejouer s’additionnent, et que beaucoup de gens, sur la durée, laissent plus que prévu.',
          'La question n’est donc pas « est-ce que je vais gagner ? ». C’est : « est-ce que je décide encore ? »'
        ]
      },
      {
        h: 'Les signes',
        p: [
          'Rejouer pour se refaire. Miser plus pour ressentir la même chose. Mentir sur le temps passé ou l’argent dépensé. Y penser quand on ne joue pas.',
          'Un seul de ces signes mérite une conversation. Deux méritent un appel.',
          'Selon l’OFDT, en 2024, environ 2,5 % des 18-75 ans ont une pratique problématique : à peu près un million cent soixante-dix mille personnes en France. Le produit brut des jeux atteint près de quatorze milliards d’euros par an.'
        ]
      },
      {
        h: 'Nour',
        p: [
          'Nour est un personnage fictif. Elle représente un service réel : celui des écoutants de Joueurs Info Service, un dispositif de Santé publique France.',
          'Elle finit sa nuit d’écoute. Les gens appellent à trois heures du matin, en général. Pas pour qu’on les juge. Pour dire à quelqu’un ce qu’ils n’ont dit à personne. Souvent, c’est la première fois qu’ils le disent à voix haute.',
          'Elle ne demande pas de nom. Elle demande ce qui s’est passé ce soir, et ce qu’on peut faire demain matin.',
          'Souvent, c’est une interdiction volontaire de jeux.'
        ]
      },
      {
        h: 'L’interdiction volontaire',
        p: [
          'Elle dure trois ans au minimum. Elle s’applique à tous les casinos, clubs de jeux et sites agréés en France. Elle se demande en ligne, sur le site de l’ANJ, en une dizaine de minutes, avec une pièce d’identité.',
          'En 2024, plus de soixante-treize mille personnes étaient inscrites au fichier des interdits de jeux. Ce n’est pas un échec. C’est, pour beaucoup, la première mise gagnante.',
          'Ensuite, on parle d’argent, concrètement. Confier sa carte bancaire à un proche. Bloquer les paiements vers les sites de jeu. Prendre rendez-vous dans un centre de soins, gratuit, dans chaque département.',
          'Le fichier ne s’applique qu’aux opérateurs agréés : les sites illégaux ne le consultent pas. D’où l’intérêt de bloquer aussi les paiements.'
        ]
      },
      {
        h: 'Le numéro à garder',
        p: [
          'Joueurs Info Service : zéro neuf, soixante-quatorze, soixante-quinze, treize, treize. Tous les jours, de huit heures à deux heures du matin. Appel anonyme et non surtaxé. Il existe aussi un site, avec chat, forum et annuaire des consultations.',
          'Garde-le. Pour toi, ou pour quelqu’un.',
          'Merci d’avoir écouté cette première saison. Rien ne va plus. Mais tu peux encore te lever de la table.'
        ]
      }
    ],
    retenir: [
      'Un signe mérite une conversation, deux méritent un appel.',
      'L’interdiction volontaire dure au moins trois ans et se demande en ligne, en dix minutes.',
      'Joueurs Info Service : 09 74 75 13 13, tous les jours de 8 h à 2 h, anonyme et non surtaxé.'
    ]
  }
];
