# Épisode 2 « La zone » : nouveaux composants (contrat)

Mêmes règles que `INTERFACE.md` (pure fonction du temps, repère 1920×1080, aplats, bordures ink 4–8 px, ombres dures, AUCUN dégradé / flou / lueur / filter,
Bricolage Grotesque 800 + JetBrains Mono, palette ink #0A0A0A · lime #C8FF2E · paper #F3F0E8 · red #FF4A36 · white · pocket #161616, rien d'important sous y = 840
car les sous-titres vivent en bas). Fichier : `tools/video/composition/components/<id>.js`, `ZV.define('<id>', { init(root, shot), update(st, t, shot) })`.
Le composant peint son propre fond. Les `props` ci-dessous sont facultatifs avec des valeurs par défaut sensées ; les `cues` sont les noms de beats `{do:'cue', name, t, …}`
que la réalisation posera (`ZV.cue(shot,'name')`, `ZV.cues`, `ZV.lastCue`). Un cue absent = l'étape ne se déclenche pas (le plan doit rester beau sans aucun cue).
Prévention : aucun gain n'est jamais désirable à l'écran. Le gain est un piège (clignotant, bruyant, creux), le compteur de crédits est le « témoin honnête » (sobre, qui descend).
Personnes réelles : nom et rôle seulement, jamais de portrait.

## `slot-machine`
Machine à sous vue de face, plate : caisson ink bordé paper 8 px, ombre dure, fronton avec ampoules (cercles lime/paper/red qui peuvent « courir »), fenêtre de 3 rouleaux
(fond paper, séparateurs ink, symboles plats : `cherry` cerise rouge + tige, `seven` « 7 » Bricolage rouge, `bar` barre ink « BAR », `lemon` ellipse lime, `bell` cloche paper bordée ink, `zero` cercle lime avec « 0 »),
ligne de gain rouge, bandeau Mono en bas (CRÉDIT / MISE / GAIN), gros bouton rond rouge « SPIN » (le bouton où la main ne quitte jamais) et levier optionnel.
Props : `credit` (nombre, défaut 100), `bet` (défaut 1), `reels` (3 symboles visibles au repos, défaut ["seven","bar","cherry"]), `lights` (bool), `side` (`left|center|right`, position, défaut center),
`label` (texte du fronton, défaut « ZÉRO VERT »).
Cues : `spin` (les 3 rouleaux défilent, flou de mouvement rendu par duplication de symboles décalés, jamais de filtre), `stop1` `stop2` `stop3` (chaque rouleau s'arrête avec rebond ;
param `sym` = symbole final), `near` (deux 7 alignés, le 3e rouleau s'arrête juste AU-DESSUS de la ligne : sticker « PRESQUE ! » + secousse + ampoules qui clignotent ; le gain affiché reste 0),
`fanfare` (ampoules qui courent, bandeau « GAIN » lime qui clignote, étincelles plates ; param `win` = montant affiché ; le crédit réel peut baisser : voir `ldw-meter`),
`hand` (une main plate pose un doigt sur le bouton SPIN et ne le quitte plus), `rapid` (enchaîne un tour toutes les 3 s tant que le plan dure, compteur « TOUR n » en Mono),
`dim` (la machine s'éteint : lumières coupées, seul le compteur de crédits reste allumé et descend ; param `credit_to`).

## `ldw-meter`
La « perte déguisée en gain » (Waterloo / Dixon) : un seul écran, deux lectures. À gauche un écran de machine stylisé (fanfare) ; à droite (ou après le cue `honest`) le compteur de crédits sobre.
Props : `credit` (défaut 100), `stake` (défaut 2), `win` (défaut 0.8), `lines` (défaut 20, ligne gagnante mise en avant), `currency` (« € »).
Cues : `bet` (la mise part : crédit − stake, chiffre Mono qui descend), `spin` (courte rotation des rouleaux), `win` (fanfare : lime clignotant, « GAIN 0,80 € » en gros, étincelles, haut-parleur plat qui « chante »),
`count` (le calcul s'écrit : « MISÉ 2,00 € » puis « REÇU 0,80 € »), `net` (le résultat « −1,20 € » tamponné en rouge, la fanfare s'éteint et se fait barrer),
`honest` (plein cadre sur le compteur de crédits ink/paper : sobre, immobile, qui descend lentement ; texte « LE SEUL TÉMOIN HONNÊTE »).

## `tick-grid`
Le rythme de jeu : « un tour toutes les 3 secondes ». Un anneau-minuteur de 3 s (arc qui se remplit) avec un point qui s'allume à chaque tour, puis une grille de 1 200 petits carrés (60 × 20, 22 px) qui se remplit.
Props : `period` (3 s), `per_minute` (20), `per_hour` (1200), `accent` (`lime|red`).
Cues : `tick` (un tour : l'anneau se remplit et le point s'allume, sticker « 3 s »), `minute` (20 points s'allument en cadence, compteur « 20 / MIN »), `hour` (la grille de 1 200 se remplit en accélérant, compteur « 1 200 / H » qui claque),
`hand` (le doigt sur le bouton en bas à droite, ne bouge pas), `no-pause` (étiquette barrée : « CROUPIER », « BILLE », « PAUSE »).

## `zone-tunnel`
« La zone » : plein cadre, des anneaux concentriques plats (ink / lime / paper / red en alternance, bordure ink) qui s'approchent du centre comme un tunnel, vitesse qui monte avec le temps (pure fonction de t).
Au centre un petit point. Des stickers flottent : « L'HEURE », « L'ARGENT », « TON CORPS », chacun aspiré vers le centre sur son cue.
Props : `speed` (défaut 1), `labels` (défaut ["L'HEURE","L'ARGENT","TON CORPS"]), `final` (défaut « LE TOUR SUIVANT »), `palette` (`lime|red`).
Cues : `enter` (le tunnel démarre, les anneaux accélèrent), `lose-1` `lose-2` `lose-3` (le sticker n°n est aspiré et disparaît), `next` (texte final au centre qui pulse, tunnel à pleine vitesse),
`exit` (le tunnel s'arrête, se désassemble en aplat paper : retour au réel ; sticker « PANNE » optionnel via param `text`).

## `jackpot-screen`
L'écran de Katrina Bookman (Queens, 23 août 2016) : écran d'une machine (bezel ink, vitre paper) affichant un montant Mono géant. Un téléphone plat au premier plan prend la photo.
Props : `amount` (défaut « 42 949 672,76 $ »), `real` (défaut « 2,25 $ »), `limit` (défaut « 6 500 $ »), `city` (défaut « QUEENS »).
Cues : `show` (le montant apparaît chiffre par chiffre de la gauche vers la droite), `flash` (clignotement lime/paper + ampoules), `selfie` (le téléphone entre, flash paper plein cadre 3 images, vignette de la photo),
`fail` (l'écran saute : tranches décalées, puis « PANNE » rouge tamponné, le montant se fait barrer), `small-print` (bande paper « UNE PANNE ANNULE TOUS LES PAIEMENTS ET TOUTES LES PARTIES » en Mono, défile),
`ticket` (un ticket de caisse sort de l'imprimante : « 2,25 $ »), `steak` (picto de steak plat à côté du ticket : forme rouge, os paper, bordure ink ; ton sobre, un peu amer), `limit` (sticker « MAX 6 500 $ » qui écrase le gros montant).

## `bit-overflow`
Le compteur qui déborde : un registre de 32 cases (2 rangées de 16, bits 0/1 en Mono, case allumée = lime, éteinte = pocket) qui se remplit comme un compteur binaire accéléré.
Props : `bits` (32), `big` (défaut « 4 294 967 296 »), `dollars` (défaut « 42 949 672,96 $ »), `shown` (défaut « 42 949 672,76 $ »), `gap` (défaut « 20 ¢ »).
Cues : `fill` (le compteur monte en accélérant, puissance 2.2, jusqu'à ce que tout soit allumé), `full` (32 bits à 1, le gros nombre « 2³² − 1 » claque), `wrap` (débordement : tout repasse à 0, flash rouge, « DÉBORDEMENT » tamponné),
`convert` (le gros nombre est divisé par 100 : en cents → en dollars, « 42 949 672,96 $ » s'écrit), `compare` (le montant affiché sur la machine s'écrit juste dessous, l'écart « 20 ¢ » est surligné lime).

## `rtp-bars`
« La case verte invisible » : le taux de redistribution. Deux grandes barres horizontales de 100 unités (largeur 1500 px) : la part rendue en paper, la part gardée par la maison en lime (la case verte !).
Props : `roulette` (part gardée, défaut 2.7), `machine` (défaut 15), `hour_stake` (défaut 1200), `hour_kept` (défaut 180), `unit` (« € »).
Cues : `roulette` (la barre ROULETTE se déroule : 97,3 rendus, tranche lime de 2,7 qui se détache avec son étiquette), `machine` (la barre MACHINE se déroule : 85 rendus, tranche lime de 15, étiquette),
`times` (sticker « × 5,5 » qui compare les deux tranches), `invisible` (la tranche lime de la machine devient hachurée / pointillée : on ne la voit pas sur la machine ; texte « LA CASE VERTE INVISIBLE »),
`hour` (le bas du plan : « 1 200 € MISÉS / H » puis « 180 € GARDÉS » en lime, compteurs qui montent), `law` (carton Mono « ARRÊTÉ DU 14 MAI 2007 · MIN. 85 % »).
