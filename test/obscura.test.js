import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ALLOWED_DUMPS,
  buildFetchArgs,
  formatFetchResult,
  formatMcpHint,
  formatStatusResult,
  isSafeHttpUrl,
  resolveObscuraBin,
  toWinPath,
  toWslPath,
  truncateOutput,
} from "../lib/obscura.js";

describe("obscura path + url", () => {
  it("allows only http(s)", () => {
    assert.equal(isSafeHttpUrl("https://example.com/a").ok, true);
    assert.equal(isSafeHttpUrl("file:///etc/passwd").ok, false);
  });

  it("maps Windows ↔ WSL paths", () => {
    assert.equal(
      toWslPath("C:\\Users\\rchua\\Desktop\\obscura.exe"),
      "/mnt/c/Users/rchua/Desktop/obscura.exe",
    );
    assert.equal(
      toWinPath("/mnt/c/Users/rchua/Desktop/obscura.exe"),
      "C:\\Users\\rchua\\Desktop\\obscura.exe",
    );
  });

  it("resolves first existing candidate", () => {
    const r = resolveObscuraBin({
      binaryPath: "",
      candidates: ["/missing/a", "/ok/obscura.exe"],
      env: {},
      exists: (p) => p === "/ok/obscura.exe",
    });
    assert.equal(r.ok, true);
    assert.equal(r.bin, "/ok/obscura.exe");
  });
});

describe("fetch args", () => {
  it("builds stealth fetch with dump/eval", () => {
    const built = buildFetchArgs({
      url: "https://httpbin.org/html",
      dump: "text",
      evalExpr: "document.title",
      stealth: true,
      timeoutSec: 15,
      allowPrivateNetwork: true,
    });
    assert.equal(built.ok, true);
    assert.deepEqual(built.args, [
      "--stealth",
      "--allow-private-network",
      "fetch",
      "https://httpbin.org/html",
      "--dump",
      "text",
      "--eval",
      "document.title",
      "--timeout",
      "15",
    ]);
  });

  it("rejects bad dump", () => {
    const built = buildFetchArgs({ url: "https://x.test", dump: "pdf" });
    assert.equal(built.ok, false);
    assert.ok([...ALLOWED_DUMPS].length >= 4);
  });
});

describe("formatters", () => {
  it("truncates long output", () => {
    const t = truncateOutput("x".repeat(100), 10);
    assert.equal(t.truncated, true);
    assert.match(t.text, /truncated/);
  });

  it("formats status/fetch/mcp", () => {
    assert.match(formatStatusResult({ ok: false, error: "nope", tried: ["/a"] }), /tried/);
    assert.match(formatFetchResult({ ok: true, stdout: "hi" }), /hi/);
    assert.match(formatMcpHint({ winPath: "C:\\obscura.exe" }), /mcp/);
  });
});
