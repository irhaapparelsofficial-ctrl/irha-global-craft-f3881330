import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const crawler = readFileSync(resolve("scripts/crawl-production-route-parity.ts"), "utf8");

describe("production route parity locale gateways", () => {
  it("preserves the approved trailing-slash canonicals without weakening other route checks", () => {
    expect(crawler).toContain('const CANONICAL_TRAILING_SLASH_PATHS = new Set(["/de/", "/fr/", "/nl/"])');
    expect(crawler).toContain("if (CANONICAL_TRAILING_SLASH_PATHS.has(pathname)) return pathname;");
    expect(crawler).toContain('if (hops.length) add(findings, "critical", "canonical_redirect"');
    expect(crawler).toContain('if (canonical !== canonicalUrl(path)) add(findings, "critical", "wrong_canonical"');
    expect(crawler).toContain('if (counts.critical || counts.high) process.exitCode = 1');
  });
});
