# Façade du casino — références utilisateur

Modèle créé dans Blender à partir des cinq vues fournies : pierre calcaire
claire, joints de panneaux, pilastres cannelés, socle et marches en marbre sombre,
lettres CASINO en relief, encadrements en laiton, verre teinté et marquise noire
avec trois spots encastrés. Les textures minérales sont originales et incorporées.

- `casino-facade.blend` : source modifiable, deux caméras et studio de rendu.
- `01-front.png`, `02-perspective.png` : rendus Blender de l’entrée.
- `manifest.json` : géométrie, marches et noms des pivots de porte.
- `../../assets/models/casino-facade-v1.glb` : export pour le jeu.

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python tools/facade_reference.py -- --render
```

La façade est ajustée à l’ouverture existante de deux mètres. Le bâtiment
conserve son plan ; le moteur prolonge les matériaux sur les murs latéraux.
Les pivots `DoorLeft` et `DoorRight` restent séparés des groupes statiques pour
ouvrir les portes à l’approche des joueurs. Les collisions, les marches de
8/16/24 cm et la pente de raccord au hall sont gérées par le moteur 3D.
Les lampes sont émissives dans le GLB ; le jeu ajoute les points lumineux.
Le fond du vestibule utilisé dans les rendus studio n’est pas exporté : en jeu,
les portes donnent sur le vrai hall. L’ancien décor reste actif si le GLB échoue.
