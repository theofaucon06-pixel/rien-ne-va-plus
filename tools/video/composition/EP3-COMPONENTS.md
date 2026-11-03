# Épisode 3 « Le système infaillible » : nouveaux composants (contrat)

Mêmes règles que `INTERFACE.md` et `EP2-COMPONENTS.md` (pure fonction du temps, repère 1920×1080, aplats, bordures ink 4–8 px, ombres dures, AUCUN dégradé / flou / lueur / filter,
Bricolage Grotesque 800 + JetBrains Mono, palette ink #0A0A0A · lime #C8FF2E · paper #F3F0E8 · red #FF4A36 · white · pocket #161616, rien d'important sous y = 840 : les sous-titres vivent en bas).
Fichier : `tools/video/composition/components/<id>.js`, `ZV.define('<id>', { init(root, shot), update(st, t, shot) })`. Le composant peint son propre fond. Les `props` sont facultatifs avec des valeurs par défaut sensées ;
les `cues` sont les beats `{do:'cue', name, t}` que la réalisation posera (`ZV.cue`, `ZV.cues`, `ZV.lastCue`) ; un cue absent = l'étape ne se déclenche pas, et le plan doit rester beau sans aucun cue.
**Sécurité photosensible** : aucun clignotement plein écran / grande surface au-delà de 3 alternances par seconde ; petits éléments ≤ ~6 changements/s ; les flashs sont uniques et brefs.
**Lisibilité** : aucun texte ne doit être coupé par le cadre ni masqué par un autre élément dans l'état FINAL de chaque cue (vérifie par capture à la fin de chaque étape, pas seulement en cours d'animation) ; mesure les textes réels (`textLength`).
Personnes réelles (Dostoïevski, Anna Grigorievna, Ellen Langer) : nom et rôle seulement, jamais de portrait ni de visage (silhouette générique plate autorisée).
Prévention : la martingale et tout « système » sont montrés comme des pièges : la grosse perte arrive, aucun gain n'est désirable.

## `martingale-ladder`
L'escalier de la martingale (S4 de l'épisode, « je double à chaque perte »). Colonne de lignes (une par tour) : numéro du tour, mise (Mono 800 « 10 € », « 20 € », « 40 € »… doublée à chaque ligne), pastille de résultat (rouge = tu avais misé rouge ; la bille tombe NOIR : pastille noire, ligne « PERDU »), et à droite le cumul des pertes qui monte.
La hauteur disponible est limitée (y 60–800) : au-delà de ~6 lignes visibles la colonne défile vers le haut (la ligne courante reste visible), avec un compteur géant de cumul.
Props : `start` (défaut 10), `currency` (« € »), `max_rows` (défaut 10), `table_limit` (nombre, défaut 5000, plafond de la table), `bankroll` (défaut 2500, « ton argent »).
Cues : `rule` (première ligne : « 10 € sur le rouge », intitulé de la règle « JE DOUBLE À CHAQUE PERTE »), `lose` (ajoute la ligne suivante, perdue ; chaque cue `lose` ajoute une ligne, tu peux en poser 10), `win` (le rouge sort : la ligne passe en lime « +10 € », bandeau « TOUTES TES PERTES RÉCUPÉRÉES + 10 € »),
`rush` (les lignes s'enchaînent en accélérant jusqu'à la 10e, sans cues individuels), `total` (le cumul « 10 230 € » claque en rouge, sticker « POUR GAGNER 10 € »), `eleventh` (la 11e mise fantôme « 10 240 € » apparaît),
`wall-money` (un mur « TON ARGENT » en ink bordé lime tombe de la droite et bloque la ligne), `wall-limit` (un second mur « PLAFOND DE LA TABLE » tombe de la gauche ; la 11e mise s'écrase dessus, secousse brève).

## `bilan-scale`
Le bilan de la martingale : une balance à deux plateaux (aplats ; bras ink, plateaux paper). Plateau gauche : « ≈ 800 PETITES VICTOIRES » (une grille de 800 minuscules carrés lime 10 × 80, qui se remplit) = « ≈ 8 000 € ». Plateau droit : « 1 CATASTROPHE » = un gros bloc rouge « −10 230 € ».
Props : `wins` (défaut 800), `win_amount` (défaut « 8 000 € »), `loss_amount` (défaut « −10 230 € »), `net` (défaut « −2 230 € »).
Cues : `wins` (la grille de petites victoires se remplit en accélérant, le plateau gauche descend, compteur « ≈ 8 000 € » qui monte), `crash` (le bloc rouge tombe sur le plateau droit, la balance bascule du mauvais côté, secousse), `net` (tampon rouge « −2 230 € » incliné sur la balance, sticker « PLUS DE 2 000 € DE PERTE »), `odds` (étiquette « ≈ 1 CHANCE SUR 800 » en haut).

## `no-lose-loop`
Le piège logique : un schéma qui ne peut pas donner tort (S5). Un nœud « MON SYSTÈME » à gauche, deux branches qui partent vers « JE GAGNE » (haut) et « JE PERDS » (bas) ; la branche du haut va à « LE SYSTÈME MARCHE » ; la branche du bas passe par « JE M'ÉTAIS EMBALLÉ » puis aboutit au MÊME « LE SYSTÈME MARCHE » (qui est dessiné une seule fois, à droite, les deux flèches s'y rejoignent). Flèches plates épaisses ink / lime / red.
Props : `system` (défaut « MON SYSTÈME »), `win` (« JE GAGNE »), `lose` (« JE PERDS »), `excuse` (« JE M’ÉTAIS EMBALLÉ »), `works` (« LE SYSTÈME MARCHE »), `verdict` (« AUCUN RÉSULTAT NE PEUT LUI DONNER TORT »).
Cues : `system`, `win` (branche du haut jusqu'à `works`, coche lime), `lose` (branche du bas), `excuse` (la boîte d'excuse apparaît sur la branche du bas), `works` (les deux flèches convergent, « LE SYSTÈME MARCHE » claque avec coche), `verdict` (bandeau/tampon final).

## `calendar-26`
Le délai de 26 jours (S2) : une grille de 26 cases-jours (2 rangées de 13, numéros Mono) qui se barrent une par une ; en haut une feuille « CONTRAT » (paper) avec une clause « S’IL RATE L’ÉCHÉANCE : TOUS SES FUTURS LIVRES » (large, lisible) ; à droite une pile de feuilles manuscrites qui grandit à chaque jour.
Props : `days` (défaut 26), `clause` (défaut « S’IL RATE L’ÉCHÉANCE : TOUS SES FUTURS LIVRES »), `title` (défaut « LE JOUEUR »), `done` (défaut « RENDU À TEMPS »).
Cues : `contract` (la feuille de contrat arrive, la clause s'écrit), `grid` (la grille des 26 jours apparaît), `days` (les jours se barrent en accélérant jusqu'à 26, la pile de feuilles monte, compteur « J 26 »), `stack` (la pile seule, gros plan), `done` (tampon lime « RENDU À TEMPS », sticker « 26 JOURS »).

## `pawn-counter`
Le comptoir du mont-de-piété (Baden-Baden, S3) : un comptoir plat (ink/paper) vu de face, un tiroir ouvert, des objets plats posés un à un puis remplacés par une étiquette « EN GAGE » : `ring` (alliance : anneau paper + cabochon lime), `earrings` (boucles d'oreilles), `dress` (robe : forme rouge simple), `coat` (manteau : forme ink bordée paper). À chaque objet une étiquette Mono « EN GAGE » et un compteur « OBJETS EN GAGE : n ».
Puis `forge` : bascule sur une enclume plate + marteau qui frappe en rythme (≈ 2 coups/s, étincelles = éclats plats), avec un réveil barré « 5 H » ; `empty` : le comptoir vide, étiquette « PLUS RIEN ».
Props : `labels` (défaut {ring:"L’ALLIANCE", earrings:"LES BOUCLES D’OREILLES", dress:"LA ROBE", coat:"SON MANTEAU"}), `tag` (« EN GAGE »).
Cues : `ring`, `earrings`, `dress`, `coat` (chacun dépose l'objet sur le comptoir, tampon d'étiquette, compteur +1), `forge` (scène de la forge), `alarm` (le réveil sonne puis est barré), `empty` (comptoir vide).

## `anna-ledger`
Le journal d'Anna (S3, « celle qui attend ») : un carnet ouvert vu de face (pages paper, reliure ink, bords arrondis) rempli de lignes de sténographie (traits courbes et boucles plats en ink : jamais de vrai texte illisible, juste des gribouillis réguliers), avec à droite une colonne de pointage (bâtons de comptage ink qui s'ajoutent) et en haut à droite une horloge plate (cercle paper, aiguilles) qui tourne.
Props : `labels` (défaut ["LES OBJETS EN GAGE","L’ATTENTE","LES SERMENTS"]), `title` (défaut « LE JOURNAL D’ANNA »), `note` (défaut « EN SÉNOGRAPHIE »).
Cues : `open` (le carnet s'ouvre, titre), `line-1` `line-2` `line-3` (chaque ligne de sténo s'écrit de gauche à droite avec son étiquette Mono ; une fois sur trois sticker lime), `tally` (les bâtons de comptage s'accumulent), `clock` (l'horloge tourne vite, les heures défilent), `other-side` (le plan bascule : carnet à gauche, grande chaise vide à droite, légende « L’AUTRE CÔTÉ DE LA TABLE »).

## `ticket-choice`
L'expérience d'Ellen Langer (S5, 1975) : deux colonnes de six billets de loterie (rectangles paper aux bords crantés, numéros Mono). Colonne gauche « ILS CHOISISSENT » : un pictogramme main plate pointe/entoure un billet. Colonne droite « ON LEUR DONNE » : le billet arrive tout seul.
Props : `left` (défaut « ILS CHOISISSENT »), `right` (défaut « ON LEUR DONNE »), `banner` (défaut « MÊME LOTERIE · MÊMES CHANCES »).
Cues : `setup` (les 12 billets apparaissent en deux colonnes), `choose` (gauche : un billet est choisi et surligné lime), `give` (droite : un billet glisse dans la main), `same` (bandeau « MÊME LOTERIE · MÊMES CHANCES » avec signe égal), `offer` (une pancarte « JE TE LE RACHÈTE ? » entre les colonnes), `price-left` (grosse étiquette de prix « BEAUCOUP PLUS CHER » à gauche, qui enfle), `price-right` (petite étiquette de prix à droite), `illusion` (tampon « ILLUSION DE CONTRÔLE » en bas ; aucun chiffre de prix inventé).
