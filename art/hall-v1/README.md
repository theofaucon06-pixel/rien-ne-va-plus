# Hall d’entrée — références du 21 septembre 2026

Modèle natif créé dans Blender à partir des cinq vues fournies : murs de marbre
sombre, sol et colonnes ivoire, laiton, deux comptoirs en noyer avec vitrages,
fontaine circulaire, lustre à deux anneaux et roue de la fortune.

- Source éditable : `casino-hall.blend`.
- Générateur reproductible : `tools/hall_reference.py` à la racine du dépôt.
- Export web : `assets/models/casino-hall-v1.glb`, environ 6,04 Mo.
- 127 501 triangles, 18 lots de matériaux. Textures originales incorporées.
- Deux rendus Cycles : `01-entrance.png` et `02-details.png`.

La pièce mesure 12 × 10 × 4,2 m. Le modèle s’installe aux coordonnées Three.js
(40, 0, 13,5), à échelle uniforme. Les ouvertures vers le parvis, les machines,
les tables et le bar correspondent à la carte existante. Les empreintes des
comptoirs, colonnes, plantes et de la fontaine conservent les collisions du jeu.

`FortuneRotor` et `FountainWater` restent séparés pour l’animation. Le décor
initial et son éclairage restent disponibles pendant le téléchargement ou si
celui-ci échoue ; les interactions ne dépendent pas du chargement du GLB.

L’éclairage Cycles sert aux rendus de travail. Dans le site, le hall utilise le
groupe de lumières limité du moteur, avec des reflets et émissions réglés pour
le rendu HDR. Les salles voisines, personnages et jeux viennent du niveau.

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background \
  --python tools/hall_reference.py -- --render
```
