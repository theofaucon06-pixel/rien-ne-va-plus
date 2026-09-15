# Rien ne va plus — le casino, de l'intérieur

Une simulation 3D à la première personne (Three.js, sans build) pour comprendre,
mécanique par mécanique, pourquoi la maison gagne toujours. Toutes les
probabilités sont réelles ; l'argent, lui, est faux. Une version 2D vue de
dessus reste disponible sur `classic.html` (tactile, petites machines).

## Lancer le jeu

Double-clique sur **`Lancer.command`** (ou, dans un terminal, `node serve.js`),
puis ouvre http://localhost:8787.

Le jeu doit être servi par un serveur local : ouvrir `index.html` directement
ne fonctionne pas (modules JavaScript).

## Déployer sur Vercel

Site 100 % statique, aucun build : importe le dépôt dans Vercel, laisse
« Framework Preset » sur **Other**, sans commande de build, dossier de sortie vide
(la racine). `vercel.json` gère les en-têtes de cache.

## Commandes

| Touche | Action |
| --- | --- |
| Souris | regarder (clic pour capturer la souris) |
| Z Q S D · W A S D · flèches | marcher |
| Maj | courir |
| E · Entrée · Espace | parler, jouer, examiner |
| C | le carnet (révélations, témoins, ta soirée, sources) |
| M | couper le son |
| F3 | mesures : i/s, draw calls, palier de qualité |
| Échap | fermer |

Le bouton **Qualité** du HUD force un palier (Ultra → Minimale) ; en « auto »
le jeu descend d'un cran tout seul s'il ne tient pas 60 i/s.

## Le contenu

- **12 mécaniques** à découvrir en les vivant : l'avantage de la maison, le sophisme
  du joueur, la zone, les pertes déguisées en gains, l'illusion de contrôle, la
  poursuite des pertes, l'illusion de compétence (blackjack), le prix de la
  simplicité (roue), l'architecture, le tapis rouge, le casino en ligne, la sortie.
- **Les jeux** : 98 machines à sous (cinq familles avec leurs vraies tables de
  paiement), roulette européenne, blackjack (assurance, doubler, croupier à 17),
  baccara punto banco, Big Six, et le casino en ligne du téléphone.
- **11 témoins** : Charles Wells, Mollie, Katrina Bookman, Dostoïevski, Archie Karas,
  Ken Uston, Terrance Watanabe, Harry Kakavas, un jeune joueur anonyme,
  l'architecte, Nour.
- **9 lieux** : le parvis, le hall, la salle des machines, les toilettes, la salle des
  tables, le bar, les couloirs, le salon VIP, le bureau — et la ruelle pour sortir.

Three.js (r160, build minifié) est embarqué dans `vendor/` ; les textures de
`assets/tex` ont été générées une fois (`tools/gen-textures.py`), le reste —
sons, personnages, écrans — est généré dans le navigateur. Le site est une PWA :
`manifest.webmanifest` + `sw.js` (Three.js et les textures en cache, le code du
jeu toujours pris sur le réseau quand il est joignable). Si un fichier de
`vendor/` ou `assets/` change de contenu sans changer de nom, incrémenter
`VERSION` dans `sw.js`.

## Vérifier avant de déployer

```
node tools/smoke.mjs
```

Lance le vrai jeu dans Chrome headless (aucune dépendance), traverse toutes les
pièces, ouvre chaque jeu, chaque machine spéciale, chaque personnage, sort par
la ruelle jusqu'à l'épilogue, puis rejoue l'essentiel en 2D. Toute erreur console
fait échouer l'étape qui l'a provoquée. Compter quatre minutes (rendu logiciel) ;
`--only 3d`, `--only 2d`, `--headed` pour regarder.

Les sources de chaque témoin, de chaque mécanique et de chaque chiffre sont
dans `js/content.js` (`SOURCES`) et affichées dans l'onglet « Sources » du carnet.

```
js/story.js      logique partagée (état, dialogues, révélations, sauvegarde)
js/games.js      mini-jeux (machines, roulette, blackjack, baccara, roue, téléphone)
js/g3/           moteur 3D (niveau, textures, personnages, joueur)
js/render.js     moteur 2D (classic.html)
js/world.js      plan du casino, partagé par les deux moteurs
```

Si le jeu est un problème pour toi ou un proche : Joueurs Info Service, 09 74 75 13 13
(tous les jours de 8 h à 2 h, anonyme, non surtaxé) — joueurs-info-service.fr
