#!/usr/bin/env bash
set -euo pipefail
WEB=/home/rchua/.dsh/profiles/web
echo "=== cordis.yml ==="
cat "$WEB/cordis.yml"
echo
echo "=== package.json dsh / deps keys ==="
node --input-type=module <<'EOF'
import { readFileSync } from "node:fs";
const p = JSON.parse(readFileSync("/home/rchua/.dsh/profiles/web/package.json", "utf8"));
console.log("dsh keys", Object.keys(p.dsh || {}));
console.log("dsh", JSON.stringify(p.dsh, null, 2).slice(0, 1500));
const deps = Object.keys(p.dependencies || {}).filter((k) => k.includes("wsl") || k.includes("obscura") || k.includes("repeat") || k.includes("budget"));
console.log("relevant deps", deps);
console.log("has obscura", Boolean(p.dependencies["dsh-wsl-obscura"]));
EOF
echo "=== sample plugin package dsh.bundle ==="
node --input-type=module <<'EOF'
import { readFileSync } from "node:fs";
for (const name of ["dsh-wsl-browser", "dsh-wsl-obscura", "dsh-wsl-env"]) {
  try {
    const p = JSON.parse(readFileSync(`/home/rchua/.dsh/profiles/web/node_modules/${name}/package.json`, "utf8"));
    console.log(name, "main=", p.main, "dsh=", JSON.stringify(p.dsh));
  } catch (e) {
    console.log(name, "ERR", e.message);
  }
}
EOF
echo "=== dsh web running? ==="
pgrep -af 'dsh web|dsh-port-relay' || echo none
echo "=== recent log ==="
tail -40 /tmp/dsh-web.log 2>/dev/null || echo no log
echo "=== cordis patch style in kit (insert) vs profile (id only) ==="
head -5 /mnt/c/Users/rchua/Desktop/AIFullStackDevelopment/dsh-wsl-kit/cordis.patch.yml
echo "..."
head -5 "$WEB/cordis.patch.yml"
