# Épisode 0 « Bande-annonce » : nouveaux composants (contrat)

Mêmes règles que `INTERFACE.md`, `EP2-COMPONENTS.md` et `EP3-COMPONENTS.md` (pure fonction du temps, repère 1920×1080, aplats, bordures ink 4–8 px, ombres dures, AUCUN dégradé / flou / lueur / filter,
Bricolage Grotesque 800 + JetBrains Mono, palette ink #0A0A0A · lime #C8FF2E · paper #F3F0E8 · red #FF4A36 · white · pocket #161616, rien d'important sous y = 840 : les sous-titres vivent en bas).
Fichier : `tools/video/composition/components/<id>.js`, `ZV.define('<id>', { init(root, shot), update(st, t, shot) })`. Le composant peint son propre fond. Les `props` sont facultatifs avec des valeurs par défaut sensées ;
les `cues` sont les beats `{do:'cue', name, t}` que la réalisation posera (`ZV.cue`, `ZV.cues`, `ZV.lastCue`) ; un cue absent = l'étape ne se déclenche pas, et le plan doit rester beau sans aucun cue.
**Règle des cues absents (commune aux trois composants)** : un élément dont le cue d'apparition est absent est affiché dans son état final dès t = 0 ; un plan sans AUCUN cue montre donc l'état final complet, immobile (sauf les mouvements continus décrits).
**Pure fonction du temps** : `update(st, t)` donne la même image quel que soit l'ordre des appels ; rotations, compteurs, défilements = fonctions de `t − t_cue` ; aléa uniquement par `ZV.rng(seed)` créé dans `init`.
**Sécurité photosensible** : aucun clignotement plein écran / grande surface au-delà de 3 alternances par seconde ; petits éléments ≤ ~6 changements/s ; les flashs sont uniques et brefs.
**Lisibilité** : aucun texte ne doit être coupé par le cadre ni masqué par un autre élément dans l'état FINAL de chaque cue (vérifie par capture à la fin de chaque étape, pas seulement en cours d'animation) ; mesure les textes réels (`textLength` / `getComputedTextLength`) et réduis la taille de police (pas en dessous des minimums indiqués) ou passe à la ligne plutôt que de déborder.
Personnes réelles : nom et rôle seulement, jamais de portrait ni de visage. Personnages composites ou fictifs : jamais de visage réaliste. Ici, AUCUNE personne n'est dessinée : on montre des objets (haut-de-forme, plume, tabouret vide), jamais une silhouette humaine.
**Aucune marque** : aucun vrai nom de casino, de site de paris, d'application ou de média, aucun logo, aucune imitation reconnaissable d'un vrai lieu (pas de dôme de Monte-Carlo, pas de panneau de Las Vegas) ni d'une vraie interface. Le seul nom propre de marque autorisé est celui du podcast, ZÉRO VERT.
Prévention : aucun gain n'est jamais désirable à l'écran. La maison est un mécanisme froid qui encaisse ; rien ne brille comme une récompense. Chiffres affichés = ceux du texte (aucun chiffre inventé).

Texte de l'épisode : `output/season1/00-bande-annonce.json` (3 sections : « Rien ne va plus » / « Neuf épisodes » / « La promesse » ; voix Théo, Tom, Arthur). Ce qui est couvert par l'existant (rappel pour la réalisation, rien à écrire) :
le jeton et la bille (`felt` chip-drop, `wheel` launch/clack/land), « rien ne va plus » (`kinetic` stamp), « souffler sur tes doigts, fixer la roue » (`pictos` breath + eye, strike-all), la case verte (`wheel` zero-outline / zero-light, focus 0),
« Zéro Vert » (`logo-reveal` intro / outro), « Moi, c'est Théo / Tom / Arthur » (`kinetic` style `label`, bande Dymo, jamais de photo), le « 9 » (`big-number` / `chapter-card`), la ligne d'aide (`doc-card` variante `help`, chiffres 09 · 74 · 75 · 13 · 13, horaires « 8 h à 2 h »),
« Premier épisode : la bille n'a pas de mémoire » (`chapter-card` variante `next` ou `season-board` cue `first`), la carte de fin (`end-card` retenir / final).

## `backstage-engine`
« L'autre côté du décor » et « elle travaille pour la maison à chaque tour, sans pause et sans mauvaise soirée » (fin de S1, début de S2). Un décor de théâtre plat représentant une façade de casino GÉNÉRIQUE pivote et révèle, derrière, la vraie machine : la case verte du zéro, devenue volant moteur, qui tourne sans fin et remplit la caisse de la maison.
Fond ink plein cadre, ligne de sol paper 8 px à y = 770 (de x 80 à x 1840).
**La façade** (côté face) : panneau paper centré x 960, 1 240 × 600 px, haut y = 150, bas posé sur le sol (y 750), bordure ink 8 px, ombre dure 14 px. Dessin générique, sans lieu reconnaissable : un fronton rectangulaire plat (bande ink 90 px) portant l'enseigne `sign` en Bricolage 800 paper 110 px (mesurée, ≤ 900 px de large), une rangée de 14 ampoules sous le fronton (cercles r 12, lime / paper / red en alternance, bordure ink 3 px, qui « courent » à 2 pas/s au plus), 6 colonnes (rectangles paper 70 × 380, bordure ink 6 px, chapiteau = bande ink 18 px), deux portes centrales (rectangles pocket bordés ink, poignées lime), un tapis rouge trapézoïdal plat qui descend des portes jusqu'au sol. Deux petits étais en biais visibles aux deux bords (barres ink 14 px), pour qu'on devine déjà un décor.
**Le dos du décor** (après `turn`) : le même panneau vu de dos = un cadre ouvert, pas de panneau plein : montants et traverses paper 26 px bordés ink 5 px, deux diagonales de contreventement, deux étais triangulaires au sol, inscription au pochoir Mono 800 ink 28 px sur une traverse « DÉCOR · FACE A », trois serre-joints plats (petits rectangles red). On voit l'arrière-plan à travers le cadre.
**La machine** (après `engine`) : le volant = la case du zéro, centre (820, 430), disque lime r 200, bordure ink 8 px, « 0 » Bricolage 800 ink 230 px au centre, 6 rayons ink 14 px du moyeu (disque ink r 30) au bord intérieur (r 160), le « 0 » reste droit (ne tourne pas), seuls les rayons et une couronne de 12 encoches ink sur le bord tournent ; rotation = `rpm` tours/min × (t − t_engine), départ en 0,8 s (ease-in), puis constante, sans arrêt jusqu'à la fin du plan.
À droite, une courroie (deux tangentes ink 10 px entre le volant et une petite poulie r 50 en (1420, 300), tirets paper 18 px qui défilent à la vitesse de la courroie) entraîne un compteur à rouleaux Mono : boîtier ink bordé paper 6 px, x 1500–1800, y 220–380, titre Mono 800 paper 26 px « TOURS » au-dessus (y 205), valeur Mono 800 lime 90 px = nombre de tours entiers du volant depuis `engine` (chiffre qui roule verticalement sur 6 i à chaque passage).
Sous le compteur, la caisse : boîtier paper bordé ink 8 px, ombre dure 12 px, x 1500–1800, y 470–740, fente ink en haut, étiquette `house` en Bricolage 800 ink 54 px dans une bande Dymo ink (lettres paper) sur la face, jauge intérieure visible par une fenêtre (x 1530–1770, y 560–720) qui se remplit d'un aplat lime : +1 cran de 8 px par tour, plafonnée à pleine fenêtre (puis reste pleine).
Une goulotte inclinée (bande paper bordée ink 6 px) part du bas droit du volant (≈ 1000, 560) jusqu'à la fente de la caisse (1650, 470) : à chaque tour complet, un petit jeton plat (disque white r 18, bordure ink 4 px, liseré lime) glisse dans la goulotte en 18 i et disparaît dans la fente (le cran de jauge monte à ce moment). Jamais plus d'un jeton par seconde à l'écran à `rpm` = 30.
Pendant `engine`, le cadre du dos du décor glisse vers la gauche (14 i, ease-out) et se range, mis à l'échelle 0,3 (372 × 180 px), posé sur le sol en bas à gauche (x 60–432, y 570–750) : un décor rangé en coulisse, qui ne touche pas le volant.
Props : `sign` (défaut « CASINO » : mot générique, jamais un nom de lieu ou de marque), `house` (défaut « LA MAISON »), `rpm` (défaut 30), `start` (`facade | engine`, défaut `facade` ; `engine` = le plan commence directement sur la machine, sans façade ni décor, pour la fin de S1),
`caption` (défaut « L’AUTRE CÔTÉ DU DÉCOR »), `labels` (défaut ["À CHAQUE TOUR","SANS PAUSE","SANS MAUVAISE SOIRÉE"]).
Cues :
- `facade` : la façade tombe du haut (12 i, back-ease, shake 6 px à l'impact), puis les ampoules s'allument de gauche à droite (1 ampoule / 2 i) et commencent à courir.
- `turn` : le panneau pivote autour de son axe vertical (largeur apparente = 1 240 × |cos θ|, θ de 0 à π en 18 i, ease-in-out ; à θ > π/2 on dessine le dos) ; ampoules éteintes au dos. À la fin, sticker paper incliné −3° `caption` en Bricolage 800 ink 56 px centré en haut (y 40–120).
- `engine` : le volant zéro apparaît (scale 0 → 1 en 10 i, back-ease) derrière le cadre, le cadre se range à gauche, la rotation démarre.
- `belt` : la courroie, la poulie, le compteur TOURS et la caisse entrent (slide depuis la droite, 12 i, décalés de 3 i) ; le compte des tours et les jetons dans la goulotte commencent à ce cue (avant `belt`, le volant tourne seul).
- `label-1`, `label-2`, `label-3` : chaque étiquette de `labels` arrive en sticker (pop back-ease 8 i) : n°1 lime incliné −4° posé sur la goulotte (≈ x 1120, y 610), n°2 paper incliné +3° sous le compteur à gauche (≈ x 1180, y 180), n°3 red texte paper incliné −2°, ancré à gauche à x 80, y 150–210 (au-dessus du volant, sous la ligne du `caption`). Bricolage 800 44 px, chaque sticker mesuré, aucun ne chevauche un autre texte.
- `house` : l'étiquette de la caisse claque (scale 1.3 → 1 en 5 i, shake 8 px) et la fenêtre de jauge reçoit un contour lime 8 px (fixe, ne clignote pas).
- `front` (facultatif) : courroie, compteur, caisse et stickers sortent par la droite (10 i) ; le décor revient au centre et repivote côté façade (18 i), ampoules rallumées : « devant, rien n'a changé » ; le volant reste visible et continue de tourner dans une vignette en bas à droite (cadre ink bordé lime 6 px, x 1600–1840, y 560–780, volant ×0,5) qui ne recouvre pas la façade (x 340–1580).
État final lisible : volant qui tourne, compteur TOURS, caisse étiquetée, 3 stickers, `caption` en haut, rien sous y = 840.

## `season-board`
« Neuf épisodes » (S2) : le sommaire de la saison sous forme de tableau de 9 cartes (3 × 3), retournées une par une au rythme de l'énumération de Tom, puis trois cartes dont le dos révèle « des gens qui l'ont vécu » (Arthur). Sert aussi à la toute fin pour « Premier épisode : la bille n'a pas de mémoire ».
Fond lime plein cadre, grille éditoriale fine (traits ink 2 px tous les 120 px, opacité 0,12 ; pas de dégradé). En haut, sticker ink incliné −2° « `title` » en Bricolage 800 lime 52 px (y 30–100, centré).
Grille : 9 cartes de 520 × 200 px, espacement 40 px ; colonnes x = 140, 700, 1260 ; rangées y = 130, 370, 610 (bas de la dernière rangée = 810). Ordre de lecture : ligne par ligne, 01–03 en haut.
**Carte face** : aplat paper, bordure ink 6 px, ombre dure 10 px, coins 14 px. Onglet numéro en haut à gauche : rectangle ink 76 × 50 débordant de 14 px vers le haut, Mono 800 lime 30 px « 01 »… « 09 ». Titre Bricolage 800 ink, 42 px (minimum 30), interligne 1,05, 2 lignes max, zone x +24 à +360, aligné à gauche, mesuré et passé à la ligne sur les espaces ; sous-titre facultatif Mono 600 ink 18 px (interligne 1,2, 2 lignes max, même largeur) sous le titre ; le bloc titre + sous-titre est centré verticalement entre y +44 et y +184 (la taille du titre descend jusqu'à ce que le bloc tienne).
Picto plat (zone 130 × 130 à droite, x +370 à +500, centré verticalement), aplats lime / red / paper / white / pocket bordés ink 5 px, aucun personnage :
`ball` (bille white + petite bulle de pensée vide), `slot` (mini machine 3 rouleaux, rouleaux paper, fronton red), `ladder` (escalier de 4 marches qui doublent, la dernière red), `chase` (flèche ink qui monte puis retombe plus bas que son départ, pointe red),
`cards` (deux cartes à dos pocket bordées paper, sans figure ni marque), `clock-off` (horloge paper barrée d'un trait red 10 px), `carpet` (tapis red en trapèze qui part vers le fond, bord paper), `phone` (téléphone générique pocket, écran paper avec une mini-roue lime à 6 secteurs, aucune interface reconnaissable), `exit` (porte ouverte : cadre ink, battant paper, flèche lime qui sort).
**Carte dos (fermée)** : aplat ink, bordure paper 4 px, seul le numéro Mono 800 lime 64 px centré.
**Carte témoin** (verso montré par les cues `w-*`) : aplat ink, bordure lime 6 px, picto objet paper/lime à gauche (zone 130 × 130, x +24), texte à droite (x +170 à +500) : `role` en Bricolage 800 paper 34 px (minimum 26, 2 lignes max) puis `line` en Mono 600 lime 18 px (3 lignes max). Onglet numéro conservé (lime, chiffre ink).
Objets des témoins (jamais de personne) : `tophat` (haut-de-forme ink bordé paper + canne lime en diagonale), `quill` (plume paper + encrier ink + petite chaise vide à côté, aplat paper), `stool` (tabouret de machine vide : assise red, pied ink, et un gros bouton rond lime à côté).
Retournement : rotation plate autour de l'axe horizontal (hauteur apparente = 200 × |cos θ|, θ de 0 à π en 10 i, ease-in-out), le contenu change à θ = π/2.
**Carte active** : la dernière carte retournée par un cue `e*` devient **ink avec titre et picto paper/lime** (onglet lime, chiffre ink) et scale 1.06 autour de son centre ; elle redevient face paper normale (scale 1) au cue `e*` suivant (transition 6 i). Une seule carte active à la fois.
Props : `title` (défaut « SAISON 1 · 9 ÉPISODES »),
`episodes` (défaut, textes exacts des titres de la saison) :
```
[{n:"01", title:"La bille n’a pas de mémoire", sub:"", picto:"ball"},
 {n:"02", title:"La zone", sub:"", picto:"slot"},
 {n:"03", title:"Le système infaillible", sub:"qui ne l’est jamais", picto:"ladder"},
 {n:"04", title:"Se refaire", sub:"perdre plus vite en voulant rattraper", picto:"chase"},
 {n:"05", title:"Le seul jeu qu’on peut battre", sub:"", picto:"cards"},
 {n:"06", title:"Une maison sans horloges", sub:"", picto:"clock-off"},
 {n:"07", title:"Le tapis rouge", sub:"et qui le paie", picto:"carpet"},
 {n:"08", title:"Le casino dans la poche", sub:"", picto:"phone"},
 {n:"09", title:"La sortie", sub:"", picto:"exit"}]
```
(titres et sous-titres affichés en MAJUSCULES par le composant),
`witnesses` (défaut, dans l'ordre où Arthur les cite) :
```
[{cue:"w-escroc",   card:1, object:"tophat", role:"Un escroc",                line:"qui a fait sauter la banque de Monte-Carlo"},
 {cue:"w-ecrivain", card:3, object:"quill",  role:"Un écrivain russe",        line:"et la femme qui l’attendait"},
 {cue:"w-joueuse",  card:2, object:"stool",  role:"Une joueuse de Las Vegas", line:"qui ne joue pas pour gagner"}]
```
`start` (`closed | open`, défaut `closed` si au moins un cue `e*` ou `all` existe, sinon `open` : toutes les cartes face visible dès t = 0), `first_label` (défaut « PREMIER ÉPISODE »).
Cues :
- `title` : le sticker de titre arrive (pop back-ease 8 i) ; les 9 dos de carte tombent en cascade (drop 8 i, 2 i d'écart, ordre de lecture).
- `e1` … `e9` : la carte n se retourne côté face et devient la carte active (sticker de titre inchangé). Les cues peuvent être posés sur chaque titre prononcé.
- `all` : toutes les cartes encore fermées se retournent en cascade (3 i d'écart), aucune carte active à la fin.
- `people` : le sticker de titre est remplacé (cross-fade dur, 4 i) par « AVEC DES GENS QUI L’ONT VÉCU » (même style, mesuré, ≤ 1 500 px) ; les 6 cartes sans témoin passent sous un voile ink 62 % (jamais de flou).
- `w-escroc`, `w-ecrivain`, `w-joueuse` : la carte désignée se retourne côté témoin (10 i), scale 1.04 autour de son centre, ombre 14 px ; elle reste côté témoin ensuite. Les trois peuvent coexister (cartes 01, 02, 03 = rangée du haut : rien ne se chevauche, chaque carte grandit autour de son centre, la rangée reste dans x 110–1810).
- `first` : retour à la face pour toutes les cartes (10 i), voile ink 62 % sur 02–09, la carte 01 grandit et vient au centre du cadre (x 960, y 430, scale 1.9 ; translation 14 i, ease-out) devant les autres, onglet « 01 », et un sticker red texte paper incliné −4° « `first_label` » (Bricolage 800 44 px) posé au-dessus d'elle (bas du sticker ≥ 20 px au-dessus du haut de la carte, haut ≥ y 60).
État final lisible : chaque carte entière dans le cadre, aucun texte tronqué (vérifie les titres longs 01, 05, 06, 08 et la carte témoin 02 à 34 px).

## `promise-charter`
« La promesse » (S3) : une charte d'une page qui se coche clause par clause, chaque clause avec son geste visuel (le réel signalé, le chiffre qui renvoie à sa source en bas de page, pas de sermon, et le « système pour gagner » qui est une boîte vide). C'est le gros mot de la section, « SOURCÉ », mis en image.
Fond ink plein cadre. Feuille paper : x 300–1620, y 50–800, bordure ink 8 px, ombre dure 16 px, rotation −1° autour de son centre, coin haut droit plié (triangle ink 60 px).
En-tête (y 80–220) : kicker Mono 700 ink 24 px « `kicker` », titre Bricolage 800 ink 92 px « `title` », filet ink 6 px sous le titre (x 360–1560, y 215).
Quatre clauses (rangées de 130 px, y de départ 240, 380, 520, 660 ; chaque rangée finit au plus à y + 120, la dernière à 780) :
- case à cocher 64 × 64 (bordure ink 6 px, fond paper) à x 350, centrée verticalement ;
- texte de la clause Bricolage 800 ink 50 px (minimum 38) à x 450, largeur max 760 px, 1 ligne ; sous-ligne Mono 600 ink 22 px (minimum 18, 1 ligne, largeur max 760) juste dessous ;
- vignette visuelle à droite dans la zone x 1240–1580 × hauteur de la rangée (340 × 120), dessinée en aplats bordés ink 5 px.
Au cue de la clause : la rangée glisse depuis la gauche (10 i, ease-out), puis la case se remplit de lime et une coche ink 12 px se trace (6 i).
Vignettes (le cœur du composant) :
1. **réel** : une petite fiche paper (idcard plate : rectangle 150 × 96, une pastille ronde pocket SANS visage, 3 barres ink de texte) ; au cue `tag`, une étiquette Dymo red (lettres paper, Mono 800 22 px) « `tag` » vient se coller en biais (−8°) sur la fiche, avec une agrafe ink.
2. **sourcé** : le mot « `figure` » en Bricolage 800 ink 48 px suivi d'un exposant lime sur pastille ink « ¹ » (Mono 800 26 px) ; au cue `footnote`, un trait pointillé ink 5 px descend de l'exposant vers une mini-bande de bas de page (rectangle pocket 300 × 34 en bas de la vignette) portant en Mono 600 paper 18 px « `footnote` » ; au cue `verify`, une loupe plate (cercle paper r 34 bordé ink 8 px, manche ink 12 px) glisse de la droite et s'arrête sur la bande, puis une coche lime 10 px apparaît à côté (pas de zoom optique, pas de flou).
3. **sans sermon** : une bulle de parole paper (bordure ink 6 px) contenant un index levé plat (forme ink simple, sans main réaliste) ; au cue de la clause, deux traits red 14 px la barrent en croix (6 i).
4. **pas de système** : une boîte ink ouverte (couvercle paper qui bascule de 0 à −110° en 10 i au cue `open`) dont l'étiquette Mono 800 lime 22 px dit « `box` » ; l'intérieur est VIDE (aplat pocket, contour pointillé paper 4 px) ; au cue `none`, tampon red à double bordure ink « `none` » (Bricolage 800 36 px, 2 lignes max, incliné −8°, scale 2.4 → 1 en 5 i, shake 10 px) posé SUR la vignette uniquement (x 1230–1590), jamais sur le texte de la clause.
Props : `kicker` (défaut « ZÉRO VERT · SAISON 1 »), `title` (défaut « LA PROMESSE »),
`clauses` (défaut, 4 éléments `{text, sub}`) : [{text:"DU RÉEL", sub:"COMPOSITE OU FICTIF : JE TE LE DIS"}, {text:"CHAQUE CHIFFRE SOURCÉ", sub:"EN BAS DE LA PAGE, POUR QUE TU VÉRIFIES"}, {text:"PAS DE SERMON", sub:"TA SOIRÉE T’APPARTIENT"}, {text:"PAS DE SYSTÈME POUR GAGNER", sub:"C’EST JUSTEMENT LE SUJET"}],
`tag` (défaut « COMPOSITE »), `figure` (défaut « CHIFFRE » : jamais un nombre inventé), `footnote` (défaut « ¹ SOURCE · AUTEUR · ANNÉE »), `box` (défaut « SYSTÈME POUR GAGNER »), `none` (défaut « IL N’EN EXISTE PAS »), `stamp_total` (défaut « PROMIS »).
Cues :
- `sheet` : la feuille arrive (slide depuis le bas, 14 i, ease-out, rotation −4° → −1°), puis le titre s'écrit lettre à lettre (2 i par lettre).
- `c1`, `c2`, `c3`, `c4` : la clause n entre et se coche (voir plus haut). Pour `c3`, la croix red sur la bulle se trace 8 i après la coche.
- `tag` : l'étiquette « COMPOSITE » se colle sur la fiche (clause 1).
- `footnote` : le pointillé descend de l'exposant vers la bande de source (12 i), la bande apparaît.
- `verify` : la loupe arrive sur la bande, coche lime.
- `open` : le couvercle de la boîte (clause 4) s'ouvre : boîte vide.
- `none` : le tampon « IL N’EN EXISTE PAS » s'abat sur la boîte.
- `sealed` (facultatif) : tampon lime à double bordure ink « `stamp_total` » (Bricolage 800 64 px, incliné +6°, scale 2.4 → 1 en 5 i) dans l'en-tête, à droite du titre (x 1250–1560, y 80–200), sans toucher le titre ni le coin plié.
État final lisible : les 4 clauses cochées avec leurs sous-lignes, les 4 vignettes complètes (étiquette, source + loupe, bulle barrée, boîte vide tamponnée), rien sous y = 800.
