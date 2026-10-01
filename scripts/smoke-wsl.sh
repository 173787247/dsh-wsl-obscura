#!/usr/bin/env bash
set -euo pipefail
PLUGIN="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# obscura's own checkout normally sits beside this one; override with OBSCURA_BIN.
BIN="${OBSCURA_BIN:-$(dirname "$PLUGIN")/obscura/target/release/obscura.exe}"

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
