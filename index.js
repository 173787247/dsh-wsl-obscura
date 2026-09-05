import { detectWsl } from "./lib/wsl-host.js";
import {
  DEFAULT_CANDIDATES,
  buildFetchArgs,
  formatFetchResult,
  formatMcpHint,
  formatStatusResult,
  isSafeHttpUrl,
  resolveObscuraBin,
  runObscura,
  truncateOutput,
} from "./lib/obscura.js";

export const name = "dsh-wsl-obscura";
export const inject = ["tools", "systemPrompt"];

export function apply(ctx, config = {}) {
  const timeoutMs = positive(config.timeoutMs, 60_000);
  const maxOutputChars = positive(config.maxOutputChars, 32_000);
  const candidates = Array.isArray(config.candidates) && config.candidates.length
    ? config.candidates.map(String)
    : DEFAULT_CANDIDATES;
  const binaryPath = config.binaryPath ? String(config.binaryPath) : "";
  const defaultStealth = Boolean(config.defaultStealth);
  const wsl = detectWsl();
  console.log(`[dsh-wsl-obscura] loaded wsl=${wsl} defaultStealth=${defaultStealth}`);

  ctx.systemPrompt.section({
    name: "tool:obscura",
    order: 126,
    text: [
      "Use obscura_status / obscura_fetch for headless page fetch via the Obscura engine (Windows .exe or Linux binary).",
      "Use obscura_mcp_hint for MCP/CDP setup — do not confuse with win_open_url (opens the default GUI browser only).",
      "Prefer http(s) public URLs; pass allowPrivateNetwork only for intentional localhost/LAN targets.",
    ].join(" "),
  });

  ctx.tools.register({
    name: "obscura_status",
    description: "Resolve the Obscura binary and report --version (WSL → Windows .exe via interop).",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          ok: { type: "boolean" },
          bin: { type: "string" },
          winPath: { type: "string" },
          version: { type: "string" },
          error: { type: "string" },
          tried: { type: "array", items: { type: "string" } },
          note: { type: "string" },
        },
      },
      render: (_args, value) => [{ type: "text", text: formatStatusResult(value) }],
    },
    timeoutMs: Math.min(timeoutMs, 20_000),
    isConcurrencySafe: () => true,
    async execute() {
      if (!wsl) return { ok: false, error: "not running in WSL (plugin targets WSL → Windows Obscura)" };
      const resolved = resolveObscuraBin({ binaryPath, candidates });
      if (!resolved.ok) return resolved;
      const run = await runObscura(resolved.bin, ["--version"], { timeoutMs: 15_000 });
      if (!run.ok) {
        return {
          ok: false,
          bin: resolved.bin,
          winPath: resolved.winPath,
          error: run.error || run.stderr || "version failed",
        };
      }
      return {
        ok: true,
        bin: resolved.bin,
        winPath: resolved.winPath,
        version: (run.stdout || run.stderr || "").trim().split(/\r?\n/)[0] || "",
        note: "CLI ready; for agent tools prefer MCP (obscura_mcp_hint) when available.",
      };
    },
    presentCall: () => ({ card: "generic", title: "Obscura status" }),
    presentResult: (_args, result) => (
      result.isError
        ? { card: "generic", title: "Obscura status failed", content: result.content }
        : { card: "generic", title: "Obscura status", content: result.content }
    ),
  });

  ctx.tools.register({
    name: "obscura_fetch",
    description:
      "Fetch/render a page with Obscura (optional --dump / --eval / --stealth). Not for opening the GUI browser.",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["url"],
      properties: {
        url: { type: "string", description: "http or https URL." },
        dump: {
          type: "string",
          description: "html | text | links | markdown | assets | original",
        },
        eval: {
          type: "string",
          description: "JavaScript expression to evaluate on the page.",
        },
        stealth: {
          type: "boolean",
          description: "Enable Obscura stealth transport/fingerprint (requires stealth-built binary).",
        },
        timeoutSec: {
          type: "number",
          description: "Navigation timeout in seconds (passed to obscura --timeout).",
        },
        allowPrivateNetwork: {
          type: "boolean",
          description: "Allow private/LAN hosts (SSRF guard off). Default false.",
        },
      },
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          ok: { type: "boolean" },
          href: { type: "string" },
          bin: { type: "string" },
          stdout: { type: "string" },
          stderr: { type: "string" },
          truncated: { type: "boolean" },
          error: { type: "string" },
        },
      },
      render: (_args, value) => [{ type: "text", text: formatFetchResult(value) }],
    },
    timeoutMs,
    isConcurrencySafe: () => false,
    async execute(args) {
      if (!wsl) return { ok: false, error: "not running in WSL" };
      const checked = isSafeHttpUrl(args?.url);
      if (!checked.ok) return checked;

      const resolved = resolveObscuraBin({ binaryPath, candidates });
      if (!resolved.ok) return { ok: false, error: resolved.error, href: checked.href };

      const stealth = args?.stealth == null ? defaultStealth : Boolean(args.stealth);
      const built = buildFetchArgs({
        url: checked.href,
        dump: args?.dump,
        evalExpr: args?.eval,
        stealth,
        timeoutSec: args?.timeoutSec,
        allowPrivateNetwork: Boolean(args?.allowPrivateNetwork),
      });
      if (!built.ok) return { ok: false, error: built.error, href: checked.href };

      const run = await runObscura(resolved.bin, built.args, { timeoutMs });
      const out = truncateOutput(run.stdout, maxOutputChars);
      if (!run.ok) {
        return {
          ok: false,
          href: checked.href,
          bin: resolved.bin,
          stdout: out.text,
          stderr: run.stderr,
          truncated: out.truncated,
          error: run.error || "fetch failed",
        };
      }
      return {
        ok: true,
        href: checked.href,
        bin: resolved.bin,
        stdout: out.text,
        stderr: run.stderr,
        truncated: out.truncated,
      };
    },
    presentCall: () => ({ card: "generic", title: "Obscura fetch" }),
    presentResult: (_args, result) => (
      result.isError
        ? { card: "generic", title: "Obscura fetch failed", content: result.content }
        : { card: "generic", title: "Obscura fetch", content: result.content }
    ),
  });

  ctx.tools.register({
    name: "obscura_mcp_hint",
    description: "Print how to wire Obscura MCP / CDP for DSH (does not start a server).",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          ok: { type: "boolean" },
          bin: { type: "string" },
          winPath: { type: "string" },
          hint: { type: "string" },
          note: { type: "string" },
          error: { type: "string" },
        },
      },
      render: (_args, value) => [{ type: "text", text: value.hint || formatMcpHint(value) }],
    },
    timeoutMs: 10_000,
    isConcurrencySafe: () => true,
    async execute() {
      if (!wsl) return { ok: false, error: "not running in WSL", hint: formatMcpHint({}) };
      const resolved = resolveObscuraBin({ binaryPath, candidates });
      const payload = {
        ok: resolved.ok,
        bin: resolved.bin || "",
        winPath: resolved.winPath || "",
        note: resolved.ok
          ? ""
          : "Binary missing — still showing generic MCP commands; set binaryPath / OBSCURA_BIN.",
        error: resolved.ok ? undefined : resolved.error,
      };
      payload.hint = formatMcpHint(payload);
      return payload;
    },
    presentCall: () => ({ card: "generic", title: "Obscura MCP hint" }),
    presentResult: (_args, result) => (
      { card: "generic", title: "Obscura MCP hint", content: result.content }
    ),
  });
}

function positive(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
