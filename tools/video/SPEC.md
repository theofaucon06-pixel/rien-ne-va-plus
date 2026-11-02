# Zéro Vert — épisode 1 en vidéo : spécification du pipeline

Objectif : une vidéo MP4 (1920×1080, 30 i/s, ≈ 8 min 15) de l'épisode 1 « La bille n'a pas de mémoire » : la voix « theo » (ElevenLabs), un motion design
synchronisé mot à mot sur la voix, des sous-titres, et un vrai sound design (effets sonores + lit musical + mixage).
Tout est piloté par **le texte** : les calages visuels et sonores s'accrochent à des *phrases du script*, jamais à des secondes écrites en dur.

## Environnement
- Dépôt : `/Users/theofaucon/Documents/rien-ne-va-plus`. Node : `export PATH=$HOME/.local/node-v26.13.0/bin:$PATH`.
- ffmpeg 6.0 (libx264, aac, sidechaincompress, loudnorm, adelay, amix, drawtext) : `$HOME/.local/ffmpeg-6.0/ffmpeg` et `ffprobe`.
- Chrome : `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`. Python 3.9 système (`python3 -m venv` autorisé, installations pip autorisées dans un venv hors dépôt).
- Sources du pipeline : `tools/video/` (versionnées). Médias et données générés : `output/video/` (ignoré par git).
- Direction artistique, tokens et polices : voir `css/podcast.css`, `css/podcast-fonts.css`, `assets/podcast/*.svg`.
  Palette : `--ink #0A0A0A`, `--lime #C8FF2E`, `--paper #F3F0E8`, `--red #FF4A36`, `--white`, `--pocket #161616`. Polices : Bricolage Grotesque 800 + JetBrains Mono.
- Scènes déjà animées (à réutiliser ou refaire plus riches) : `js/podcast-motion.js` (wheel, wells, pockets, average, streak, outro : fonctions pures du temps).
- Script : `js/podcast-data.js`, épisode `la-bille-n-a-pas-de-memoire` (6 sections, 32 paragraphes, 1 442 mots).

## Voix (déjà générées)
`output/video/assets/vo/s1.mp3` … `s6.mp3` : une prise par section (durées 68,1 / 82,5 / 73,9 / 66,3 / 81,0 / 68,6 s), le texte exact des paragraphes de chaque section joints par une ligne vide.

## Ligne de temps finale (créée par l'étape « Alignement »)
Les six prises sont découpées aux frontières de paragraphes (coupe au milieu du silence entre le dernier mot d'un paragraphe et le premier du suivant) puis
ré-assemblées avec des silences maîtrisés pour donner du rythme :
`LEAD_IN = 2.2 s` (avant le 1er mot) · entre deux paragraphes `0.9 s` au total · entre deux sections `3.2 s` · `TAIL = 14.0 s` après le dernier mot (carte de fin).
Le silence naturel en tête et en queue de chaque morceau est d'abord réduit à ≈ 0.12 s. Aucune modification de vitesse ni de hauteur de la voix.
Résultat : `output/video/data/voice.wav` (48 kHz, mono, 16 bits) et `output/video/data/timing.json`.

`timing.json` :
```json
{ "total": 494.2, "lead_in": 2.2, "tail": 14.0,
  "sections": [ { "index": 0, "start": 2.2, "end": 70.1,
     "paragraphs": [ { "index": 0, "text": "…", "start": 2.2, "end": 12.5,
        "sentences": [ { "text": "…", "start": 2.2, "end": 4.1,
           "words": [ { "w": "Tu", "start": 2.2, "end": 2.35 } ] } ] } ] } ] }
```
Les mots de `words[].w` sont ceux du script (avec casse et ponctuation d'origine), alignés sur l'audio ; chaque mot a `start` ≤ `end`.

## Ancres (comment tout s'accroche au texte)
Une ancre est un objet JSON :
`{ "s": 2, "phrase": "trente-six divisé par trente-sept", "nth": 1, "edge": "start" }`
- `s` : index de section (0 à 5). `p` : index de paragraphe dans la section (optionnel, restreint la recherche).
- `phrase` : suite de mots du script ; comparée sans casse, sans accents, sans ponctuation, tirets = espaces. Elle doit être **unique** dans le périmètre (section ou paragraphe) ou préciser `nth` (1 = première occurrence).
- `edge` : `"start"` (début du premier mot, défaut) ou `"end"` (fin du dernier mot de la phrase).
- `dt` (optionnel, secondes, positif ou négatif) : décalage ajouté au temps résolu.
Ancres spéciales : `{ "at": "video-start" }` (0 s), `{ "at": "voice-start" }` (= `lead_in`), `{ "at": "voice-end" }` (fin du dernier mot), `{ "at": "video-end" }` (= `total`),
`{ "s": 3, "at": "section-start" }` / `{ "s": 3, "at": "section-end" }`.
Résolveur partagé : `tools/video/lib/anchors.mjs` exporte `loadTiming(path)` et `resolve(timing, anchor) → secondes` (lève une erreur claire si la phrase est introuvable ou ambiguë).

## `direction.json` (créé par l'étape « Réalisation », lu par la composition et le mixage)
```json
{ "video": { "w": 1920, "h": 1080, "fps": 30 },
  "components": [ { "id": "wheel", "desc": "…", "props": { "…": "…" } } ],
  "shots": [ { "id": "s1-01", "from": {anchor}, "to": {anchor}, "component": "wheel", "props": {}, "in": "wipe-lime", "out": "cut", "notes": "…" } ],
  "captions": { "enabled": true, "style": "…" },
  "sfx": [ { "id": "ball-spin", "at": {anchor}, "dur": 3.0, "prompt": "texte pour le générateur d'effets sonores", "gain_db": -8, "pan": 0, "layer": "foley" } ],
  "music": [ { "id": "bed-1", "from": {anchor}, "to": {anchor}, "prompt": "texte pour le générateur de musique", "gain_db": -20, "fade_in": 2.0, "fade_out": 3.0 } ],
  "mix": { "voice_lufs": -16, "master_lufs": -14, "duck_db": -9, "notes": "…" } }
```
Les plans (`shots`) se suivent sans trou ni chevauchement de la première à la dernière seconde (`video-start` → `video-end`).

## Répartition (ne modifie QUE tes fichiers)
| Rôle | Fichiers |
|---|---|
| Alignement | `tools/video/align.py` (ou .mjs), `tools/video/lib/anchors.mjs`, `output/video/data/voice.wav`, `output/video/data/timing.json` |
| Réalisation | `output/video/data/direction.json`, `output/video/data/direction.md` |
| Composition | `tools/video/composition/*`, `tools/video/render.mjs` |
| Son | `tools/video/sound/*`, `output/video/assets/sfx/*`, `output/video/assets/music/*`, `output/video/data/mix.*` |

Règles : pas de `git add`/`commit`/`push`. N'utilise PAS le navigateur intégré de l'application ; Chrome headless seulement, ports 88NN propres à ton rôle. Fichiers temporaires hors du dépôt. Sois économe et termine par un rapport court (≤ 15 lignes).

## Relancer de bout en bout (état final)
```
python3 tools/video/align.py                   # voix → voice.wav + timing.json (premier passage : ≈ 7 min, télécharge le modèle)
node tools/video/check-anchors.mjs             # vérifie toutes les ancres de direction.json sur le texte
node tools/video/build-timeline.mjs            # ancres → timeline.json
node tools/video/sound/mix.mjs                 # mixage → audio-mix.wav / .m4a (≈ 1 min)
node tools/video/render.mjs                    # rendu 1920×1080 → output/video/video-silent.mp4 (≈ 2 min)
$HOME/.local/ffmpeg-6.0/ffmpeg -i output/video/video-silent.mp4 -i output/video/audio-mix.m4a -map 0:v -map 1:a -c copy -movflags +faststart output/video/zero-vert-episode-1.mp4
```
Les voix (`output/video/assets/vo`), effets (`assets/sfx`) et musiques (`assets/music`) viennent d'ElevenLabs (voix « theo », texte-vers-son, musique) et ne sont pas versionnés.
