#!/usr/bin/env bash
# Smoke: exercise plugin lib against real obscura.exe from WSL (no dsh UI needed).
set -euo pipefail
PLUGIN=/mnt/c/Users/rchua/Desktop/AIFullStackDevelopment/dsh-wsl-obscura
cd "$PLUGIN"
node --input-type=module <<'EOF'
import { resolveObscuraBin, buildFetchArgs, runObscura, isSafeHttpUrl } from "./lib/obscura.js";
import { detectWsl } from "./lib/wsl-host.js";

console.log("wsl=", detectWsl());
const r = resolveObscuraBin({});
console.log("resolve=", r);
if (!r.ok) process.exit(1);

const ver = await runObscura(r.bin, ["--version"], { timeoutMs: 15000 });
console.log("version ok=", ver.ok, "out=", (ver.stdout || ver.stderr).trim());

const url = isSafeHttpUrl("https://httpbin.org/user-agent");
const built = buildFetchArgs({ url: url.href, dump: "text", stealth: true, timeoutSec: 20 });
const fetch = await runObscura(r.bin, built.args, { timeoutMs: 45000 });
console.log("fetch ok=", fetch.ok);
console.log((fetch.stdout || "").trim().slice(0, 400) || "(empty stdout)");
if (fetch.stderr) console.log("stderr=", fetch.stderr.trim().slice(0, 200));
if (!fetch.ok) process.exit(2);
EOF
