#!/usr/bin/env bash
set -euo pipefail
BIN=/mnt/c/Users/rchua/Desktop/AIFullStackDevelopment/obscura/target/release/obscura.exe
PLUGIN=/mnt/c/Users/rchua/Desktop/AIFullStackDevelopment/dsh-wsl-obscura

echo "== WSL interop version =="
"$BIN" --version

echo "== WSL interop fetch =="
"$BIN" --stealth fetch https://httpbin.org/html --eval "document.title" --timeout 15 2>/dev/null | tail -5 || true

echo "== npm test in WSL =="
cd "$PLUGIN"
npm test

echo "== dsh plugin =="
command -v dsh
dsh plugin --help 2>&1 | head -50 || true
echo "== dsh plugin list =="
dsh plugin --profile web list 2>&1 | head -60 || true
