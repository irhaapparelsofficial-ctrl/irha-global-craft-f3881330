import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const redirects = readFileSync("public/_redirects", "utf8");
const routeShellGenerator = readFileSync("scripts/generate-static-route-shells.ts", "utf8");

const GENERATED_DIRECTORY_ROUTES = [
  "/products",
  "/catalogue",
  "/buyer-trust",
  "/factory-video-call",
  "/inquiry",
  "/products/bavarian-trachten-wear",
  "/products/premium-leather-apparel",
  "/products/sportswear",
  "/products/streetwear-activewear",
  "/products/leisure-nightwear",
] as const;

describe("Cloudflare generated-directory redirect contract", () => {
  it("does not reverse Cloudflare's directory canonicalization", () => {
    for (const route of GENERATED_DIRECTORY_ROUTES) {
      expect(redirects).not.toMatch(new RegExp(`^${route.replaceAll("/", "\\/")}\\/\\s+${route.replaceAll("/", "\\/")}\\s+30[18]$`, "m"));
    }
  });

  it("keeps directory canonicalization one-way without a reverse loop", () => {
    const permanent = redirects
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => line.split(/\s+/))
      .filter((parts) => parts[2] === "301" || parts[2] === "308");
    const direct = new Map(permanent.map(([from, to]) => [from, to]));
    for (const [from, to] of direct) {
      expect(direct.get(to)).not.toBe(from);
    }
  });

  it("confirms route shells are emitted as directory index files", () => {
    expect(routeShellGenerator).toContain('join(DIST_DIR, path.slice(1), "index.html")');
  });

  it("keeps unrelated legacy aliases intact", () => {
    expect(redirects).toContain("/buyer-trust-center /buyer-trust 301");
    expect(redirects).toContain("/germany /markets/germany 301");
  });
});
