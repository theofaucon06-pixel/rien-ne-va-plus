# Composition vidéo : contrat entre les agents

Lis d'abord `tools/video/SPEC.md`, puis `output/video/data/direction.md` (la mise en scène complète : intention, transitions, beats, bibliothèque de composants) et
`output/video/data/direction.json` (source de vérité : `components[]` donne pour chaque composant la description et les props exacts ; `shots[]` donne chaque plan).

## Données prêtes
`node tools/video/build-timeline.mjs` (déjà lancé) écrit `output/video/data/timeline.json` : toutes les ancres sont résolues en secondes.
```
{ video:{w,h,fps}, total, lead_in, tail, sections:[{index,start,end}], transitions:{…},
  shots:[ { id, component, props, start, end, dur, in, out, captions:bool, notes,
            beats:[ { t, do, name?, …params } ] } ],      // t = secondes RELATIVES au début du plan, triés
  sentences:[ { s, p, start, end, words:[ { w, start, end } ] } ],   // pour les sous-titres, temps ABSOLUS
  captions:{…style…} }
```
Les plans sont jointifs (la fin d'un plan = le début du suivant). 114 plans, 493,61 s, 30 i/s.

## Contrat d'un composant (un fichier `tools/video/composition/components/<id>.js`)
```js
ZV.define('wheel', {
  init(root, shot) { /* root = <g> SVG vide, repère 1920×1080 ; construis ici TOUT le DOM (une fois) ; renvoie un objet d'état */ return st; },
  update(st, t, shot) { /* t = secondes depuis le début du plan (0 ≤ t ≤ shot.dur) ; ne fait que poser des attributs ; AUCUNE horloge, AUCUN état muable entre appels */ }
});
```
- **Pure fonction du temps** : `update(st, t)` doit donner la même image quel que soit l'ordre des appels (le rendu est parallélisé et peut sauter de t en t). Pas de `Date.now`, pas d'`Math.random` : utilise `ZV.rng(seed)` créé dans `init`.
- Les repères du plan sont dans `shot.beats` (`do:'cue'`, `name`, `t`, + paramètres). Aides : `ZV.cue(shot,'go')` (premier t ou null), `ZV.cues(shot,'ping')`, `ZV.lastCue(shot,t)`. Les `props.cues` du composant disent quels noms existent.
- **Les beats communs** `sticker`, `stamp`, `strike`, `shake`, `count`, `freeze` ne sont PAS gérés par les composants : le noyau (`core.js`) les dessine/applique par-dessus. `freeze` fige déjà le `t` qu'on te passe.
- Fond : le noyau ne peint pas de fond ; chaque composant peint le sien (rect plein cadre) sauf mention contraire dans sa description.
- Polices : Bricolage Grotesque 800 / JetBrains Mono déjà chargées par la page (`ZV.F`). Aplats, bordures ink 4 à 8 px, ombres dures décalées ; AUCUN dégradé, flou, lueur, ni `filter`.
- Performance : un plan doit se dessiner en < 15 ms ; pas de milliers de nœuds ; réutilise les nœuds, ne les recrée pas dans `update`.
- Sûreté : si une prop est absente, prends une valeur par défaut sensée ; ne jette jamais d'exception.
- Aperçu d'un plan seul : `http://localhost:PORT/tools/video/composition/preview.html?shot=s0-02&t=3.5` (serveur statique à la racine du dépôt : `python3 -m http.server PORT --directory /Users/theofaucon/Documents/rien-ne-va-plus`), puis capture Chrome headless 1920×1080 :
  `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars --window-size=1920,1080 --virtual-time-budget=3000 --screenshot=/chemin/out.png "<url>"` et `Read` du PNG.
  `window.__ready` passe à `true` quand la page est prête. La page `preview.html` ne gère que le composant (ni beats communs, ni sous-titres, ni transitions).

## Répartition (quatre agents en parallèle : ne modifie QUE tes fichiers)
| Agent | Possède |
|---|---|
| **Noyau** (port 8801) | `core.js`, `index.html`, `render.mjs`, `build-timeline.mjs` (existe : à améliorer si besoin) ; beats communs `sticker`, `stamp`, `strike`, `shake`, `count`, `freeze` ; les 10 transitions ; les sous-titres karaoké ; le rendu parallèle |
| **Typo** (port 8802) | composants `kinetic` (21 plans), `chapter-card`, `big-number`, `doc-card`, `logo-reveal`, `end-card`, `division` |
| **Récit** (port 8803) | composants `pictos` (15 plans), `saga`, `newspaper`, `coin-flips`, `chip-stacks`, `pocket-grid` |
| **Casino** (port 8804) | composants `wheel`, `felt`, `paths`, `streak-board`, `last-numbers` |
| Orchestrateur (déjà fait) | `lib.js`, `preview.html`, ce fichier |
`lib.js` n'est modifié que par l'orchestrateur : si un outil manque, définis-le localement dans ton composant et signale-le dans ton rapport.

## Rendu final (rôle Noyau)
`tools/video/render.mjs` : lance un serveur statique, ouvre N pages Chrome (CDP, sans dépendance : WebSocket global de Node), chaque page expose `renderAt(T)` (T en secondes absolues, 0 → `total`),
capture chaque image 1920×1080 à 30 i/s (JPEG qualité 92 ou PNG), les envoie dans l'ordre à ffmpeg (`$HOME/.local/ffmpeg-6.0/ffmpeg`, `image2pipe`) pour produire `output/video/video-silent.mp4` (H.264, yuv420p, crf 16, preset medium, sans audio).
Options : `--from <s> --to <s>` (extrait), `--workers N`, `--fps`, `--scale 0.5` (brouillon rapide), `--out`. Une image doit être identique quel que soit le worker qui la produit.
