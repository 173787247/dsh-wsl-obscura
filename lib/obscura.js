import { existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Default dumps allowed by obscura fetch --dump */
export const ALLOWED_DUMPS = new Set(["html", "text", "links", "markdown", "assets", "original"]);

/** Sensible local Windows build locations (WSL paths). Override with config / OBSCURA_BIN. */
export const DEFAULT_CANDIDATES = [
  "/mnt/c/Users/rchua/Desktop/AIFullStackDevelopment/obscura/target/release/obscura.exe",
];

export function isSafeHttpUrl(raw) {
  let u;
  try {
    u = new URL(String(raw ?? "").trim());
  } catch {
    return { ok: false, error: "invalid URL" };
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    return { ok: false, error: "only http/https allowed" };
  }
  return { ok: true, href: u.href };
}

/**
 * Map Windows path (C:\...) ↔ WSL (/mnt/c/...).
 * Leaves POSIX paths unchanged; leaves already-/mnt/c paths unchanged.
 */
export function toWslPath(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  if (s.startsWith("/")) return s;
  const m = s.match(/^([A-Za-z]):[\\/](.*)$/);
  if (!m) return s;
  const drive = m[1].toLowerCase();
  const rest = m[2].replace(/\\/g, "/");
  return `/mnt/${drive}/${rest}`;
}

export function toWinPath(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  const m = s.match(/^\/mnt\/([a-zA-Z])\/(.*)$/);
  if (!m) return s;
  return `${m[1].toUpperCase()}:\\${m[2].replace(/\//g, "\\")}`;
}

/**
 * Resolve obscura binary for WSL interop or native Linux.
 * Priority: config.binaryPath → OBSCURA_BIN → candidates → `obscura` on PATH (checked as file only if absolute).
 */
export function resolveObscuraBin({
  binaryPath,
  candidates = DEFAULT_CANDIDATES,
  env = process.env,
  exists = existsSync,
} = {}) {
  const list = [
    binaryPath,
    env.OBSCURA_BIN,
    env.OBSCURA_PATH,
    ...(Array.isArray(candidates) ? candidates : []),
  ]
    .map((p) => (p == null ? "" : String(p).trim()))
    .filter(Boolean)
    .map(toWslPath);

  const seen = new Set();
  for (const p of list) {
    if (seen.has(p)) continue;
    seen.add(p);
    if (exists(p)) return { ok: true, bin: p, winPath: toWinPath(p) };
  }
  return {
    ok: false,
    error:
      "obscura binary not found; set config.binaryPath or OBSCURA_BIN to the WSL path of obscura.exe (or a Linux build)",
    tried: [...seen],
  };
}

export function buildFetchArgs({
  url,
  dump,
  evalExpr,
  stealth,
  timeoutSec,
  allowPrivateNetwork,
  screenshot,
} = {}) {
  const args = [];
  if (stealth) args.push("--stealth");
  if (allowPrivateNetwork) args.push("--allow-private-network");
  args.push("fetch", url);

  if (dump != null && dump !== "") {
    const d = String(dump).toLowerCase();
    if (!ALLOWED_DUMPS.has(d)) {
      return { ok: false, error: `invalid dump (allowed: ${[...ALLOWED_DUMPS].join(", ")})` };
    }
    args.push("--dump", d);
  }
  if (evalExpr != null && String(evalExpr).trim()) {
    args.push("--eval", String(evalExpr));
  }
  if (timeoutSec != null && Number(timeoutSec) > 0) {
    args.push("--timeout", String(Math.floor(Number(timeoutSec))));
  }
  if (screenshot != null && String(screenshot).trim()) {
    args.push("--screenshot", String(screenshot));
  }
  return { ok: true, args };
}

export function truncateOutput(text, maxChars = 32_000) {
  const s = String(text ?? "");
  if (s.length <= maxChars) return { text: s, truncated: false };
  return {
    text: `${s.slice(0, maxChars)}\n…[truncated ${s.length - maxChars} chars]`,
    truncated: true,
  };
}

export async function runObscura(bin, args, { timeoutMs = 60_000, exec = execFileAsync } = {}) {
  try {
    const { stdout, stderr } = await exec(bin, args, {
      timeout: timeoutMs,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
      windowsHide: true,
    });
    return {
      ok: true,
      stdout: String(stdout ?? ""),
      stderr: String(stderr ?? ""),
    };
  } catch (err) {
    const e = err instanceof Error ? err : new Error(String(err));
    const stdout = String(e.stdout ?? "");
    const stderr = String(e.stderr ?? e.message ?? "");
    return {
      ok: false,
      stdout,
      stderr,
      error: e.message || String(err),
      code: e.code,
    };
  }
}

export function formatStatusResult(value) {
  if (!value.ok) {
    const lines = [`obscura_status failed: ${value.error}`];
    if (value.tried?.length) lines.push(`tried:\n- ${value.tried.join("\n- ")}`);
    return lines.join("\n");
  }
  const lines = [`bin: ${value.bin}`, `version: ${value.version || "(unknown)"}`];
  if (value.winPath) lines.push(`windows: ${value.winPath}`);
  if (value.note) lines.push(value.note);
  return lines.join("\n");
}

export function formatFetchResult(value) {
  if (!value.ok) {
    const parts = [`obscura_fetch failed: ${value.error || "unknown"}`];
    if (value.stderr) parts.push(value.stderr.trim());
    if (value.stdout) parts.push(value.stdout.trim());
    return parts.filter(Boolean).join("\n");
  }
  const body = (value.stdout || "").trim() || "(empty stdout)";
  const lines = [body];
  if (value.truncated) lines.push("(output truncated)");
  if (value.stderr?.trim()) lines.push(`stderr: ${value.stderr.trim()}`);
  return lines.join("\n");
}

export function formatMcpHint(value) {
  const lines = [
    "Obscura MCP (for DSH / Cursor MCP client — not the same as win_open_url):",
    "",
    "stdio:",
    `  command: ${value.winPath || value.bin || "obscura.exe"}`,
    "  args: [\"mcp\"]",
    "",
    "optional stealth:",
    "  args: [\"mcp\", \"--stealth\"]",
    "",
    "HTTP (bind on Windows, reach from WSL via Windows host IP if needed):",
    `  ${value.winPath || value.bin || "obscura.exe"} mcp --http --port 8080`,
    "  endpoint: http://127.0.0.1:8080/mcp",
    "",
    "CDP (Puppeteer/Playwright):",
    `  ${value.winPath || value.bin || "obscura.exe"} serve --port 9222 --stealth`,
    "",
    "This plugin wraps CLI fetch; prefer native MCP when the host supports it.",
  ];
  if (value.note) lines.push("", value.note);
  return lines.join("\n");
}
