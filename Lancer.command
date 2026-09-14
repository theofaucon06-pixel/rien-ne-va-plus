#!/bin/bash
# Double-clique sur ce fichier : il lance le serveur local et ouvre le jeu.
cd "$(dirname "$0")"
PORT=8787
if lsof -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Un serveur tourne déjà sur le port $PORT — ouverture directe."
  open "http://localhost:$PORT"
  exit 0
fi
if command -v node >/dev/null 2>&1; then
  node serve.js &
else
  python3 -m http.server $PORT &
fi
sleep 1
open "http://localhost:$PORT"
echo ""
echo "Rien ne va plus tourne sur http://localhost:$PORT"
echo "Ferme cette fenêtre (ou Ctrl+C) pour arrêter le serveur."
wait
