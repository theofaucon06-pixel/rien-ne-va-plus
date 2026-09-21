# Table de blackjack — références utilisateur

Modèle natif Blender créé à partir des quatre vues fournies : plateau en
demi-lune, accoudoir continu en cuir noir, feutre vert, deux piédestaux tournés
en noyer, sept cadres de mise dorés, inscription « BLACKJACK PAYS 3 TO 2 »,
bac à douze compartiments et sabot avec couvercle acrylique transparent.

- `blackjack-reference.blend` : source modifiable, matériaux et textures
  incorporés, textes, courbes, éclairage de studio et deux caméras.
- `01-perspective.png` et `02-dessus.png` : rendus du modèle dans Blender.
- `manifest.json` : géométrie et taille de l’export.
- `../../assets/models/blackjack-reference-v2.glb` : export optimisé par
  matériau, utilisé par les trois tables du casino. Les sièges viennent du niveau.

Reconstruction depuis la racine du dépôt :

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python tools/blackjack_reference.py -- --render
```

Le générateur réutilise les matériaux incorporés dans la source de la roulette
`art/roulette-v2/roulette-reference.blend` ; aucun téléchargement n’est nécessaire.
Georgia est utilisée si elle est installée, sinon la police Blender. Le GLB
contient la géométrie des lettres. Le noyer et le feutre ont des textures
incorporées ; le microrelief procédural reste dans la source Blender.

L’échelle est uniforme dans le jeu ; les collisions suivent les dimensions du
modèle. Si le GLB ne se charge pas, la table de secours reste jouable.
