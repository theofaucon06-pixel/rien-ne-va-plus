# Roulette — étude à partir des quatre références

Proposition isolée, destinée à être examinée avant une intégration au casino.
Elle reprend le plateau arrondi, les panneaux de cuir noir, la ceinture en
noyer, les deux pieds tournés et la cuvette creusée des références fournies.
Les proportions sont estimées à partir des images, sans plans cotés.
La génération utilise Georgia si cette police est installée sur le Mac, sinon
la police Blender. Le GLB contient les formes des lettres et ne dépend d’aucune
police installée.

- `roulette-reference.blend` : scène native, textes et courbes modifiables,
  texture de noyer incorporée, matériaux et quatre caméras de studio.
- `roulette-reference.glb` : export pour examiner le modèle dans un navigateur,
  regroupé par matériau. Aucun changement aux modèles du jeu en production.
- `01-perspective.png` à `04-cuir-bois.png` : rendus du vrai modèle dans Blender.
- `preview.html` : modèle interactif, rotation, zoom et quatre points de vue.
- `manifest.json` : ordre des cases, géométrie et taille de l’export.

Le tapis contient une seule case zéro et les nombres 1 à 36. Les numéros de la
roue utilisent le même ordre européen que `js/games.js`. Les chiffres incohérents
des images de référence ne sont pas reproduits. Le veinage est une texture
originale calculée, et non une photo prélevée sur un fabricant.

Depuis la racine du dépôt :

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python tools/roulette_reference.py -- --render
python3 -m http.server 8791 --bind 127.0.0.1
```

Ouvrir ensuite `http://127.0.0.1:8791/art/roulette-v2/preview.html`.
La prévisualisation est servie séparément : le serveur du jeu ne distribue pas
le dossier de travail `art/`.

Les éclairages du studio et du navigateur diffèrent. Le microrelief procédural
du cuir et des fibres est présent dans Blender ; il n’est pas encore cuit en
cartes de normales pour le GLB. La texture de noyer et les couleurs sont
incorporées à l’export. Cette étape permet de valider forme et matières avant
leur adaptation définitive au moteur du casino.

Vérifications : les quatre vues de la page interactive fonctionnent dans Chrome,
sans erreur JavaScript. L’export est un GLB 2.0 autonome (texture incorporée),
avec 10 groupes de matériaux et 97 053 triangles. Les 37 numéros de la roue sont
uniques et couvrent 0 à 36. Les quatre images sont inspectées après rendu.
