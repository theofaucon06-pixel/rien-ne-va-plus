# Édition collective — validation du 15 septembre 2026

## Vérifications réussies

- `npm test` : **11 tests serveur et moteur cloud**. Deux flux temps réel indépendants ; positions,
  identités et découvertes ; quiz complet à cinq questions et score ; roulette
  commune ; accès, entrées invalides, capacité, reprise, départ et expiration.
- `node tools/smoke.mjs --only 2d` : **3/3 étapes**, sans erreur console.
  Démarrage, pièces, machines, objets et dialogues représentatifs.
- `tools/browser-check.cjs` : **6 scénarios** dans deux contextes Chrome
  indépendants. Création/invitation, roulette, quiz, présence, carte et
  conservation de la sauvegarde après seize secondes sur l’accueil.
- `tools/browser-3d-mobile.cjs` : **3 scénarios**. Joueur 2D tactile visible en 3D,
  déplacement transmis, reprise de la position, de l’orientation et du solde 3D.
  Aucune erreur JavaScript pendant le scénario.
- `tools/browser-save-transitions.cjs` : **2 scénarios**. Dette/découvertes
  conservées en deuxième soirée, réinitialisation effective de la partie.
- Inspection visuelle de l’accueil sur ordinateur et mobile, du salon mobile,
  de la carte et du rendu 3D. Vérification de syntaxe et `git diff --check`.

Les scénarios navigateur s’exécutent avec le serveur local sur le port 8787 :
`playwright-cli run-code --filename tools/NOM-DU-SCENARIO.cjs`.
Le fichier doit être passé comme fonction Playwright, pas lancé avec Node.

## Portée de la validation

Le mobile est testé en émulation Chrome, pas sur des téléphones physiques.
Le test 3D inter-appareils utilise la qualité minimale pour le rendu logiciel ;
il vérifie le rendu et la synchronisation, pas les performances de chaque GPU.
Le parcours 3D exhaustif a été rejoué après l’ajout des modèles Blender ; il
contrôle les interactions et les transitions, pas les performances sur chaque GPU.

## Supabase et publication

- API `casino` déployée dans le projet Supabase `rien-ne-va-plus`.
- `tools/cloud-smoke.mjs` : sept vérifications sur le vrai serveur, dont deux
  actions simultanées, l’absence de fuite de jetons, un tirage unique et le quiz.
- `tools/browser-cloud.cjs` : les six scénarios d’interface passent avec deux
  navigateurs et le véritable backend Supabase, sans erreur JavaScript.
- `tools/browser-cloud-3d.cjs` : avatar 2D mobile en 3D, déplacement tactile et
  reprise 3D validés avec Supabase, sans erreur JavaScript.
- `deno check` valide le code de la fonction. Les tables et RPC privés ne sont
  accessibles ni au rôle `anon` ni aux utilisateurs authentifiés.
- L’advisor Supabase ne remonte plus d’avertissement de sécurité. Les deux
  informations « RLS enabled, no policy » correspondent au refus volontaire
  de tout accès client aux tables réservées à la fonction serveur.

La version cloud utilise des requêtes courtes, espacées d’environ 650 ms plus
la latence réseau (3 s en arrière-plan). Ce n’est pas un flux WebSocket.
Les salons sont temporaires ; les sessions inactives expirent après 60 s.
Les anciennes lignes sont nettoyées à la création de nouveaux salons.
Aucun essai de charge massive n’a été réalisé.

Le serveur Node local continue à utiliser SSE et des salons en mémoire ; un
redémarrage les ferme. Les sauvegardes personnelles restent dans le navigateur.
Le Dockerfile n’a pas été construit sur ce poste, où Docker est absent.

## Blackjack et découvert — mise à jour

- `npm test` : **24 tests réussis**, dont 13 sur le blackjack. Composition et
  renouvellement du sabot, absence d’influence du solde, paiement 3:2, égalités,
  vérification du blackjack du croupier, assurance/paiement égal, S17, doubles,
  partages et repartages, As partagés, abandon, dépassement, reprise JSON,
  mise maximale de 100 000 jetons et refus des valeurs supérieures.
- `tools/browser-blackjack.cjs` : **7 scénarios réussis** dans Chrome :
  mise libre de 100 000 jetons, partage/double avec fermeture puis rechargement, abandon, assurance,
  croupier sur 17 souple, quatre mains sur écran de 390 px, découvert dépassant
  1 000 € dans les trois parcours. Aucune erreur JavaScript.
- `tools/browser-blackjack-3d.cjs` : démarrage 3D, manche complète avec un sabot
  aléatoire et ouverture des règles. Aucune erreur JavaScript.
- Parcours général 2D relancé : **3/3 étapes**, sans erreur console.
- Inspection des captures de la table 3D et du partage en quatre mains mobile.

Les sabots fixes des tests servent uniquement à atteindre les cas de règles.
La production utilise le générateur cryptographique du navigateur. Ces tests
valident les transitions et paiements, pas une certification de jeu d’argent.

## Modèles Blender — mise à jour

- `tools/generate_blender_models.py` a été exécuté avec Blender 5.2.2 LTS. La
  scène source est conservée dans `assets/models/casino_props.blend` ; elle
  exporte une table de blackjack (1,08 Mo), une roulette européenne (717 ko) et
  une machine à sous haut de gamme (220 ko), soit 2,02 Mo de GLB transmis au
  navigateur.
- `tools/browser-blender-assets.cjs` : chargement WebGL réel des trois fichiers
  à HTTP 200, sans erreur JavaScript. Il vérifie les 3 tables de blackjack, les
  2 roulettes et les 3 machines spéciales installées dans le niveau, puis prend
  des captures dans la salle des tables.
- `npm test` : **24 tests réussis**. `tools/browser-blackjack-3d.cjs` a aussi
  été relancé sans erreur avec les modèles chargés.
- `node tools/smoke.mjs --only 3d` : **16/16 étapes propres**, sans erreur
  console. Le parcours couvre les pièces, 29 objets, les jeux, les machines
  spéciales, les personnages, les événements, les deux soirées, le quiz et
  l’épilogue.

## Roulette validée — intégration du 21 septembre 2026

- Les deux tables chargent `assets/models/roulette-reference-v2.glb`, identique
  octet pour octet au modèle approuvé dans `art/roulette-v2/` (SHA-256 vérifié).
  Chaque instance conserve une échelle uniforme et ses 10 groupes de matériaux.
- `tools/browser-roulette-model.cjs` : téléchargement retardé puis réussi, et
  téléchargement en échec. Dans les deux scénarios, une partie complète est
  jouée depuis chacune des deux tables, sans erreur JavaScript. Les sièges et
  les écrans restent présents. Le décor de secours reste intact pendant le
  chargement, puis disparaît seulement si le modèle est disponible.
- Inspection des captures du modèle intégré et du décor de secours dans la
  salle ; aucune ancienne table superposée au modèle validé.
- `npm test` : **24/24 tests réussis** ; vérification syntaxique des trois
  modules 3D modifiés et `git diff --check` réussis.

## Blackjack de référence — 21 septembre 2026

- Modèle généré dans Blender 5.2.2 : source native, deux rendus inspectés et
  export GLB de 2,69 Mo, 39 152 triangles et neuf groupes de matériaux.
- `tools/browser-blackjack-model.cjs` : trois modèles, proportions uniformes,
  quinze sièges conservés ; une main complète sur chacune des trois tables,
  puis les mêmes vérifications avec un téléchargement en échec. Six mains
  terminées sans erreur JavaScript. Capture dans le casino inspectée.
- `npm test` : **24/24 réussis**. Syntaxe des modules modifiés et
  `git diff --check` vérifiés. Les règles et paiements restent inchangés.
