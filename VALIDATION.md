# Édition collective — validation du 15 septembre 2026

## Vérifications réussies

- `npm test` : **5 tests serveur**. Deux flux temps réel indépendants ; positions,
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
Le long parcours 3D exhaustif de `smoke.mjs` n’est pas intégralement validé ici.

Le serveur écoute sur toutes les interfaces : le site et les salons sont prêts
pour ce Mac et le réseau local. Le déploiement public n’a pas été effectué.
Le Dockerfile et la configuration d’hébergement sont préparés ; l’image Docker
n’a pas été construite sur ce poste, où Docker n’est pas disponible.
Les salons vivent en mémoire sur une seule instance ; un redémarrage les ferme.
Les sauvegardes personnelles restent dans le navigateur.
