#!/usr/bin/env bash
set -euo pipefail
WEB=/home/rchua/.dsh/profiles/web
echo "=== package.json deps ==="
grep -n obscura "$WEB/package.json" || true
echo "=== node_modules link ==="
ls -la "$WEB/node_modules/dsh-wsl-obscura" 2>&1 | head -3
echo "=== cordis files ==="
ls -la "$WEB/cordis.yml" "$WEB/cordis.patch.yml" 2>&1
echo "=== grep obscura/browser in cordis ==="
grep -n "dsh-wsl-browser\|dsh-wsl-obscura\|obscura" "$WEB/cordis.yml" "$WEB/cordis.patch.yml" 2>/dev/null || echo "(no matches)"
echo "=== cordis.patch.yml (full if short) ==="
wc -l "$WEB/cordis.patch.yml"
cat "$WEB/cordis.patch.yml"
echo "=== cordis.yml snippet around plugins ==="
grep -n "dsh-wsl-browser\|plugins\|id:" "$WEB/cordis.yml" | head -60
echo "=== plugin cordis.patch ==="
cat /mnt/c/Users/rchua/Desktop/AIFullStackDevelopment/dsh-wsl-obscura/cordis.patch.yml
# Compare with how browser got into profile
echo "=== browser package dsh.bundle ==="
node -e "const p=require('/home/rchua/.dsh/profiles/web/node_modules/dsh-wsl-browser/package.json'); console.log(JSON.stringify(p.dsh,null,2))"
node -e "const p=require('/home/rchua/.dsh/profiles/web/node_modules/dsh-wsl-obscura/package.json'); console.log(JSON.stringify(p.dsh,null,2))"
