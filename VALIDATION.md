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
Le long parcours 3D exhaustif de `smoke.mjs` n’est pas intégralement validé ici.

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
