import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Irha favicon branding", () => {
  it("uses the exact owner-supplied crest across search metadata and fallbacks", () => {
    const index = read("index.html");
    const favicon = read("public/favicon.svg");
    const redirects = read("public/_redirects");
    const workerPatch = read("scripts/patch-cloudflare-route-shell-assets.mjs");
    const liveVerification = read(".github/workflows/verify-official-brand-live.yml");
    const manifest = JSON.parse(read("public/manifest.webmanifest")) as {
      icons: Array<{ src: string; sizes: string; type: string; purpose?: string }>;
    };

    expect(index).toContain(
      '<link rel="icon" type="image/svg+xml" sizes="any" href="/favicon.svg" />',
    );
    expect(index).toContain('<link rel="shortcut icon" href="/favicon.svg" />');
    expect(index.toLowerCase()).not.toContain("lovable favicon");

    expect(favicon).toContain('viewBox="0 0 192 192"');
    expect(favicon).toContain('<title id="title">Irha Apparels</title>');
    expect(favicon).toContain("Official Irha Apparels Manufacturing Specialists crest supplied by the owner");
    expect(favicon).toContain('<image width="192" height="192"');
    expect(favicon).toContain('href="data:image/webp;base64,');
    expect(favicon.toLowerCase()).not.toContain("lovable");

    expect(redirects).toContain("/favicon.ico /favicon.svg 200");
    expect(redirects).not.toContain("/favicon.ico /favicon.svg 301");
    expect(workerPatch).toContain("officialFaviconResponse");
    expect(workerPatch).toContain('pathname === "/favicon.ico"');
    expect(workerPatch).toContain('assetUrl.pathname = "/favicon.svg"');
    expect(workerPatch).toContain('X-Irha-Favicon-Source\", \"official-owner-crest');
    expect(workerPatch).toContain('headers.delete("Location")');
    expect(workerPatch).toContain("status: 200");

    expect(liveVerification).toContain('workflows: ["IndexNow After Verified Production"]');
    expect(liveVerification).not.toContain("\n  push:\n");
    expect(liveVerification).toContain("Resolve exact search-verified production SHA");
    expect(liveVerification).toContain("source_identity_state");
    expect(liveVerification).toContain('.context == "Irha Search Discovery"');
    expect(liveVerification).toContain('[ "$source_sha" = "$latest_main" ]');
    expect(liveVerification).toContain('"repos/$GITHUB_REPOSITORY/statuses/$SOURCE_SHA"');
    expect(liveVerification).toContain('context="Irha Brand Live"');
    expect(liveVerification).toContain("Official Irha Apparels Manufacturing Specialists crest supplied by the owner");

    expect(manifest.icons[0]).toEqual({
      src: "/favicon.svg",
      sizes: "any",
      type: "image/svg+xml",
      purpose: "any",
    });

    expect(existsSync(resolve(process.cwd(), "public/irha-search-favicon-2026.svg"))).toBe(false);
  });
});
