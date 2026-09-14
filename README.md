# Rien ne va plus — le casino, de l'intérieur

Un monde explorable (vue de dessus) pour comprendre, mécanique par mécanique,
pourquoi la maison gagne toujours. Toutes les probabilités sont réelles ;
l'argent, lui, est faux.

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
| Z Q S D · W A S D · flèches | se déplacer |
| Maj | courir |
| E · Entrée · Espace | parler, jouer, examiner |
| C | le carnet (révélations, témoins, ta soirée) |
| M | couper le son |
| Échap | fermer |

## Le contenu

- **10 mécaniques** à découvrir en les vivant : l'avantage de la maison, le sophisme
  du joueur, la zone, les pertes déguisées en gains, l'illusion de contrôle, la
  poursuite des pertes, l'architecture, le tapis rouge, le casino en ligne, la sortie.
- **10 témoins** : Charles Wells, Mollie, Katrina Bookman, Dostoïevski, Archie Karas,
  Terrance Watanabe, Harry Kakavas, un jeune joueur anonyme, l'architecte, Nour.
- **9 lieux** : le parvis, le hall, la salle des machines, les toilettes, la salle des
  tables, le bar, les couloirs, le salon VIP, le bureau — et la ruelle pour sortir.

Aucune dépendance, aucun asset externe : tout est dessiné et synthétisé dans le navigateur.

Si le jeu est un problème pour toi ou un proche : Joueurs Info Service, 09 74 75 13 13
(tous les jours de 8 h à 2 h, anonyme, non surtaxé) — joueurs-info-service.fr
