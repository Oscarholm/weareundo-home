#!/usr/bin/env bash
set -euo pipefail

# Encrypt /board-src/ → /board/ with StaticCrypt.
# Run from anywhere; the script changes to the repo root.
# Auto-discovers every board-src/<yyyymm>/index.html and encrypts it.

cd "$(dirname "$0")/.."

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
npx staticrypt board-src/index.html \
  -d board \
  --template-title "Board materials — locked" \
  "${COMMON[@]}"
echo "  → board/index.html"

# 2) Every meeting directory (board-src/<yyyymm>/index.html)
shopt -s nullglob
for dir in board-src/[0-9][0-9][0-9][0-9][0-9][0-9]/; do
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
