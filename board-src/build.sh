#!/usr/bin/env bash
set -euo pipefail

# Render board-src/ → .board-staged/ (injects Detailed Reads from materials.json),
# then encrypt the staged tree into /board/ with StaticCrypt.
# Run from anywhere; the script changes to the repo root.

cd "$(dirname "$0")/.."

STAGED=.board-staged

echo "Rendering…"
node board-src/render.mjs --out "$STAGED"

if [ -z "${STATICRYPT_PASSWORD:-}" ]; then
  read -s -p "Board password: " STATICRYPT_PASSWORD
  echo
  export STATICRYPT_PASSWORD
fi

COMMON=(
  --short
  --remember 30
  --template-button "Open"
  --template-color-primary "#2020FF"
  --template-color-secondary "#FBEFD2"
  --template-placeholder "Password"
  --template-instructions "Password-protected. Enter the board password to continue."
)

# 1) Board index
mkdir -p board
npx staticrypt "$STAGED/index.html" \
  -d board \
  --template-title "Board materials — locked" \
  "${COMMON[@]}"
echo "  → board/index.html"

# 2) Every meeting directory (rendered output mirrors board-src/<yyyymm>/)
shopt -s nullglob
for dir in "$STAGED"/[0-9][0-9][0-9][0-9][0-9][0-9]/; do
  meeting=$(basename "$dir")
  src="${dir}index.html"
  if [ ! -f "$src" ]; then
    echo "  ! skipping $meeting (no index.html)"
    continue
  fi
  mkdir -p "board/$meeting"
  npx staticrypt "$src" \
    -d "board/$meeting" \
    --template-title "Board pack — $meeting" \
    "${COMMON[@]}"
  echo "  → board/$meeting/index.html"
done

echo
echo "Done. Commit board/ + .staticrypt.json + any new board-src/ changes, then push."
