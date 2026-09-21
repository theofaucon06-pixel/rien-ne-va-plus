# Rien ne va plus — le casino, de l'intérieur

Une simulation 3D à la première personne (Three.js, sans build) pour comprendre,
mécanique par mécanique, comment fonctionne l’avantage de la maison. Toutes les
probabilités sont réelles ; l'argent, lui, est faux. Une version 2D vue de
dessus reste disponible sur `classic.html` (tactile, petites machines).

## Lancer le jeu

Double-clique sur **`Lancer.command`** (ou, dans un terminal, `node serve.js`),
puis ouvre http://localhost:8787. Node.js 20 ou plus récent est nécessaire.

Le jeu doit être servi par un serveur local : ouvrir `index.html` directement
ne fonctionne pas (modules JavaScript).

## Jouer entre amis — édition collective

Clique sur **Entrer entre amis**, choisis un pseudo et crée un salon privé.
Partage son lien ou son code de six caractères. Jusqu’à **8 personnes** peuvent
explorer ensemble, en 3D ou en 2D : avatars interpolés, carte commune, messages
rapides, découvertes collectives, quiz de cinq questions et roulette commune.
Les soldes et les jeux du casino restent individuels ; l’atelier roulette et
le quiz sont synchronisés et arbitrés par le serveur, sans mises ni argent réel.

Le créateur anime le salon et lance les activités. En cas de déconnexion,
l’animation passe à un autre participant après quinze secondes. Une place est
conservée soixante secondes pour permettre une reconnexion. Une actualisation
reprend le salon grâce à une session privée stockée dans l’onglet. Les salons
sont temporaires ; en mode local, ils disparaissent au redémarrage du serveur. La sauvegarde du
parcours individuel reste sur l’appareil.

### Sur le même réseau Wi-Fi

Lance `npm start` (Node 20+, aucune installation de dépendances). Le terminal
affiche l’adresse `http://IP-DU-MAC:8787`. Tous les participants doivent ouvrir
**cette même adresse**, puis partager le lien du salon. Une adresse `localhost`
ne fonctionne que sur la machine où le serveur tourne. Le pare-feu du réseau
doit autoriser les connexions au port choisi.

### Sur Internet — Vercel et Supabase

Le site public est https://rien-ne-va-plus.vercel.app. `js/cloud.js` relie ce
nom de domaine à la fonction Supabase `casino` du projet `rien-ne-va-plus`.
Aucun compte joueur ni clé secrète n’est requis dans le navigateur.

- L’Edge Function valide chaque action et chaque session ; Postgres conserve
  les salons privés. Les tables sont inaccessibles aux rôles navigateur.
- Les positions et l’état du salon sont actualisés par requêtes courtes
  (environ toutes les 650 ms, plus le temps réseau ; 3 s en arrière-plan).
  Les actions du quiz et de la roulette partent immédiatement.
- Chaque mise à jour vérifie la révision du salon pour préserver les actions
  simultanées. Les réponses obsolètes sont ignorées par le navigateur.
- Les sessions expirent après 60 s sans contact. Les anciens salons sont
  nettoyés à la création de nouveaux salons. Les sauvegardes solo restent locales.

Le serveur Node local reste autonome, avec son flux SSE habituel.
Pour tester **le vrai Supabase** avec l’interface locale, ouvrir
`http://localhost:8787/classic.html?cloud=1`. Les salons locaux et Internet
ont des sessions séparées. L’API cloud accepte uniquement le domaine public et
les origines locales de test déclarées dans la fonction.

#### Publier une modification

1. Modifier les sources et lancer `npm test`.
2. Si les questions ou la carte changent : `node tools/cloud-content.mjs`.
3. Appliquer les nouvelles migrations SQL dans Supabase et déployer
   `supabase/functions/casino` avec `supabase functions deploy casino
   --project-ref ydcforyxwlmmgdgyypiu` (CLI authentifiée).
4. Pousser puis intégrer la branche dans `main` pour déclencher Vercel.
5. Vérifier une invitation depuis deux navigateurs sur le site public.

La désactivation de `verify_jwt` dans `supabase/config.toml` est intentionnelle :
la fonction utilise ses propres jetons de session aléatoires (empreintes SHA-256
stockées en base). Seules la santé, la création et la connexion par code sont
publiques ; les autres actions nécessitent le jeton privé du salon. Les clés
serveur proviennent exclusivement de l’environnement Supabase.

`Dockerfile` et `render.yaml` restent une alternative pour héberger le serveur
Node complet sur une instance unique. Vercel seul, sans la connexion Supabase,
sert uniquement le jeu solo.

## Nouvelle expérience

- Accueil éditorial responsive, modes solo et entre amis.
- Carte (`P`), guidage vers les lieux et quinze clés lisibles sans miser.
- Salon (`G`) : amis, messages rapides, quiz collectif et atelier roulette.
- Mode confort : animations et mouvement de caméra réduits, dialogues immédiats.
- Commandes tactiles en 2D et 3D ; glisser sur le monde 3D pour regarder.
- Sauvegarde uniquement après le démarrage, à la sortie et toutes les 15 secondes.
  La reprise en 3D restaure aussi la position et la direction de la caméra.

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

- **15 mécaniques** à découvrir en les vivant : l'avantage de la maison, le sophisme
  du joueur, la zone, les pertes déguisées en gains, l'illusion de contrôle, la
  poursuite des pertes, l'illusion de compétence (blackjack), le prix de la
  simplicité (roue), l'architecture, le tapis rouge, le casino en ligne, le pari
  sportif, les mises côte à côte (craps), la sortie — et le retour, la deuxième
  soirée.
- **Les jeux** : 101 machines à sous (cinq familles avec leurs vraies tables de
  paiement), roulette européenne, blackjack (sabot de six paquets, partage, double, assurance, abandon, croupier à 17),
  baccara punto banco, Big Six, craps (quatre mises, quatre prix), une table de
  poker à regarder (le rake), le casino en ligne du téléphone et une appli de
  paris sportifs branchée sur le match de la télé du bar (`js/match.js`).
- **14 témoins** : Charles Wells, Mollie, Katrina Bookman, Dostoïevski, Archie Karas,
  Ken Uston, Terrance Watanabe, Harry Kakavas, un jeune joueur anonyme,
  l'architecte, Nour, un parieur sportif, Anna Dostoïevskaïa, un croupier en pause.
  Et Karim, l'ami « en retard », qui était au salon VIP depuis 22 h.
- **La nuit qui avance** (`js/events.js`) : le jackpot d'un autre, le tirage au
  sort au micro, la table « chaude », une expulsion, une femme en pleurs au
  distributeur, le spectacle de 23 h, la salle qui se vide à 2 h puis à 4 h.
- **13 lieux** : le parvis, le hall, la salle des machines, les toilettes, la salle
  des tables, le bar, les couloirs, le salon VIP, le bureau, le restaurant, la
  salle de spectacle, la terrasse fumeurs (la seule fenêtre : le ciel), le
  prêteur sur gages de l'autre côté de la porte — et la ruelle pour sortir.
- **Après la nuit** : un quiz de quatorze questions, et « revenir vendredi
  prochain » — une deuxième soirée avec la dette, la carte et le carnet de la
  première.

Three.js (r160, build minifié) est embarqué dans `vendor/` ; les textures de
`assets/tex` ont été générées une fois (`tools/gen-textures.py`), le reste —
sons, personnages, écrans — est généré dans le navigateur. Le site est une PWA :
`manifest.webmanifest` + `sw.js` (Three.js et les textures en cache, le code du
jeu toujours pris sur le réseau quand il est joignable). Si un fichier de
`vendor/` ou `assets/` change de contenu sans changer de nom, incrémenter
`VERSION` dans `sw.js`.

### Modèles Blender

Les éléments les plus visibles de la salle des tables sont aussi modélisés dans
Blender : les tables de blackjack, les roulettes européennes et les trois
machines spéciales. Les sources du blackjack et des machines sont conservées dans
`assets/models/casino_props.blend`. Pour les régénérer avec Blender 5.2 LTS :

```
/Applications/Blender.app/Contents/MacOS/Blender --background --python tools/generate_blender_models.py
```

Les deux roulettes utilisent le modèle validé d’après les quatre références,
conservé dans `art/roulette-v2/roulette-reference.blend`. Son export est copié
à l’identique dans `assets/models/roulette-reference-v2.glb` (4,45 Mo), avec une
échelle uniforme pour conserver la roue circulaire. Les sièges et les écrans
des derniers résultats restent des éléments du niveau. Pour le reconstruire :

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python tools/roulette_reference.py -- --render
cp art/roulette-v2/roulette-reference.glb assets/models/roulette-reference-v2.glb
```

Le premier générateur conserve son ancien export de roulette comme archive ;
le jeu charge uniquement la version `roulette-reference-v2.glb`.

`js/g3/blender-assets.js` les charge après le décor de base. En cas d’échec de
téléchargement, les éléments procéduraux déjà présents restent affichés et le
casino demeure jouable.

## Vérifier avant de déployer

```
npm test
node tools/smoke.mjs
```

Lance le vrai jeu dans Chrome headless (aucune dépendance), traverse toutes les
pièces, ouvre chaque jeu, chaque machine spéciale, chaque personnage, sort par
la ruelle jusqu'à l'épilogue, puis rejoue l'essentiel en 2D. Toute erreur console
fait échouer l'étape qui l'a provoquée. Le rendu logiciel peut être lent selon la machine ;
`--only 3d`, `--only 2d`, `--headed` pour regarder.

Les sources de chaque témoin, de chaque mécanique et de chaque chiffre sont
dans `js/content.js` (`SOURCES`) et affichées dans l'onglet « Sources » du carnet.

```
js/story.js      logique partagée (état, dialogues, révélations, sauvegarde)
js/games.js      mini-jeux (machines, roulette, blackjack, baccara, roue, téléphone)
js/g3/           moteur 3D (niveau, textures, personnages, joueur)
assets/models/    sources Blender et modèles GLB diffusés dans le navigateur
js/render.js     moteur 2D (classic.html)
js/world.js      plan du casino, partagé par les deux moteurs
```

Si le jeu est un problème pour toi ou un proche : Joueurs Info Service, 09 74 75 13 13
(tous les jours de 8 h à 2 h, anonyme, non surtaxé) — joueurs-info-service.fr

## Architecture du multijoueur et tests

- `server.mjs` : HTTP, salons privés, sessions aléatoires, flux SSE, validation
  et limitation des actions, réponses du quiz privées jusqu’à la correction.
- `js/multiplayer.js` : connexion, reconnexion, synchronisation à environ 5 Hz.
- `js/experience.js` / `css/experience.css` : accueil, carte, guidage et activités.
- `js/g3/peers.js` : avatars 3D ; `js/render.js` dessine les avatars 2D.
- `tests/multiplayer.test.mjs` : deux flux réels, quiz complet, roulette,
  authentification, données invalides, places, reprise, départ et expiration.
- `tools/browser-check.cjs` : scénario Playwright avec deux contextes navigateur
  indépendants, parcours des interfaces et régression de sauvegarde. Avec le
  serveur lancé : `playwright-cli run-code --filename tools/browser-check.cjs`.

Les messages sont prédéfinis ; les pseudos sont limités à vingt caractères.
Les fichiers internes du serveur ne sont pas servis. Les réponses de l’API
et les événements multijoueurs sont exclus du cache hors ligne. La découverte
personnelle est déclarée par le client et ne constitue pas un score compétitif.

Les résultats et la portée des vérifications sont détaillés dans `VALIDATION.md`.

### Vérifications Supabase

- `npm test` : règles locales et moteur cloud, sans accès réseau.
- `node tools/cloud-smoke.mjs` : vrai Supabase, concurrence, accès, quiz, roulette
  et sessions (crée puis quitte des salons de test).
- `playwright-cli run-code --filename tools/browser-cloud.cjs` : deux navigateurs
  sur l’interface locale utilisant le vrai backend Supabase.
- `npx deno check supabase/functions/casino/index.ts` : vérification du runtime.

## Blackjack et hasard

La table propose une variante américaine précise : six paquets mélangés (312 cartes),
carte fermée vérifiée avant les décisions, croupier restant sur 17 souple,
blackjack payé 3:2, égalité remboursée. Double sur les deux premières cartes,
même après partage ; partage des cartes de même valeur jusqu’à quatre mains.
Les As partagés reçoivent une seule carte, sans repartage. Un 21 après partage
est une main ordinaire. Assurance 2:1 et paiement égal avec un blackjack contre
un As ; abandon tardif de la main initiale avec remboursement de la demi-mise.
Les choix de variante sont affichés dans la table ; les casinos peuvent en proposer d’autres.
Référence : [Massachusetts Gaming Commission, règles de blackjack](https://massgaming.com/wp-content/uploads/RULES-Blackjack-4-9-26.pdf).

Le sabot utilise un mélange Fisher–Yates et crypto.getRandomValues, sans remise.
Une carte est brûlée au début ; mélange après environ 75 % du sabot, entre les manches.
Aucun solde, dette ou résultat passé n’influence les tirages. La probabilité d’un
blackjack naturel dans un sabot neuf est 2 × 24 × 96 / (312 × 311), soit 4,749 %.
Le taux de mains gagnantes dépend des règles et décisions : aucun quota de pertes
n’est programmé. Les coefficients du profil « théo » sont des estimations pédagogiques,
séparées du calcul des résultats. Les machines ont leurs propres tables de gains.

La main, les mises et le sabot sont sauvegardés après chaque décision, y compris
si l’on ferme la table ou recharge la page. Le découvert fictif est sans plafond
au distributeur et sur les deux applications du téléphone. Les frais de retrait
et les limites de mise propres à chaque table restent affichés.
