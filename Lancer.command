#!/bin/bash
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 20 ou plus récent est nécessaire pour le site et le multijoueur."
  echo "Installe Node.js, puis relance ce fichier."
  read -r -p "Appuie sur Entrée pour fermer."
  exit 1
fi
CASINO_PORT=8787
while lsof -iTCP:"$CASINO_PORT" -sTCP:LISTEN >/dev/null 2>&1; do
  if curl -fsS "http://localhost:$CASINO_PORT/api/health" 2>/dev/null | grep -q '"multiplayer":true'; then
    open "http://localhost:$CASINO_PORT"
    exit 0
  fi
  CASINO_PORT=$((CASINO_PORT+1))
  if [ "$CASINO_PORT" -gt 8797 ]; then echo "Aucun port libre entre 8787 et 8797."; exit 1; fi
done
PORT="$CASINO_PORT" node serve.js &
CASINO_SERVER=$!
trap 'kill "$CASINO_SERVER" 2>/dev/null' EXIT INT TERM
for attempt in {1..30}; do
  if curl -fsS "http://localhost:$CASINO_PORT/api/health" >/dev/null 2>&1; then break; fi
  if ! kill -0 "$CASINO_SERVER" 2>/dev/null; then wait "$CASINO_SERVER"; exit 1; fi
  sleep 0.2
done
open "http://localhost:$CASINO_PORT"
echo "Pour jouer ensemble sur le même Wi-Fi, partage l’adresse réseau affichée ci-dessus."
echo "Garde cette fenêtre ouverte pendant la soirée."
wait "$CASINO_SERVER"
