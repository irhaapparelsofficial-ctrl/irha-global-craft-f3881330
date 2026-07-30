import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const BRAND_VERSION = "ia-media-e001-20260730";

describe("Irha favicon branding", () => {
  it("uses the exact owner-supplied crest across search metadata and fallbacks", () => {
    const index = read("index.html");
    const favicon = read("public/favicon.svg");
    const navbar = read("src/components/layout/Navbar.tsx");
    const imageLoading = read("src/lib/imageLoading.ts");
    const packageJson = read("package.json");
    const versioningScript = read("scripts/version-official-brand-assets.mjs");
    const redirects = read("public/_redirects");
    const workerPatch = read("scripts/patch-cloudflare-route-shell-assets.mjs");
    const brandDispatch = read(".github/workflows/brand-live-dispatch-controller.yml");
    const liveVerification = read(".github/workflows/verify-official-brand-live.yml");
    const manifest = JSON.parse(read("public/manifest.webmanifest")) as {
      icons: Array<{ src: string; sizes: string; type: string; purpose?: string }>;
    };

    expect(index).toContain(
      '<link rel="icon" type="image/svg+xml" sizes="any" href="/favicon.svg" />',
    );
    expect(index).toContain('<link rel="shortcut icon" href="/favicon.svg" />');
    expect(index.toLowerCase()).not.toContain("lovable favicon");

    expect(navbar).toContain("BRAND_ASSETS.headerLogo");
    expect(navbar).toContain("Official Irha Apparels Manufacturing Specialists logo");
    expect(navbar).not.toContain('src="/favicon.svg"');
    expect(imageLoading).toContain("BRAND_ASSETS.controlledFallback");
    expect(imageLoading).not.toContain('CONTROLLED_IMAGE_FALLBACK = "/favicon.svg"');

    expect(favicon).toContain('viewBox="0 0 192 192"');
    expect(favicon).toContain('<title id="title">Irha Apparels</title>');
    expect(favicon).toContain("Official Irha Apparels Manufacturing Specialists crest supplied by the owner");
    expect(favicon).toContain('<image width="192" height="192"');
    expect(favicon).toContain('href="data:image/webp;base64,');
    expect(favicon.toLowerCase()).not.toContain("lovable");

    expect(packageJson).toContain("node scripts/version-official-brand-assets.mjs");
    expect(versioningScript).toContain(`const BRAND_VERSION = "${BRAND_VERSION}"`);
    expect(versioningScript).toContain("Unversioned favicon link remains");
    expect(versioningScript).toContain('href="/favicon.svg"');
    expect(versioningScript).toContain('href="${VERSIONED_FAVICON}"');
    expect(versioningScript).toContain("manifest.icons = manifest.icons.map");

    expect(redirects).toContain("/favicon.ico /favicon.svg 200");
    expect(redirects).not.toContain("/favicon.ico /favicon.svg 301");
    expect(workerPatch).toContain("officialFaviconResponse");
    expect(workerPatch).toContain('pathname === "/favicon.ico"');
    expect(workerPatch).toContain('assetUrl.pathname = "/favicon.svg"');
    expect(workerPatch).toContain('X-Irha-Favicon-Source\", \"official-owner-crest');
    expect(workerPatch).toContain('headers.delete("Location")');
    expect(workerPatch).toContain("status: 200");

    expect(brandDispatch).toContain("issue_comment:");
    expect(brandDispatch).toContain("github.event.issue.number == 375");
    expect(brandDispatch).toContain("github.event.comment.body == '/run-brand-live'");
    expect(brandDispatch).toContain("Require exact search-verified current-main release");
    expect(brandDispatch).toContain('"Irha Quality Gate"');
    expect(brandDispatch).toContain('"Irha Cloudflare Production"');
    expect(brandDispatch).toContain('"Irha Search Discovery"');
    expect(brandDispatch).toContain('.source_commit == $sha and .source_identity_state == "verified"');
    expect(brandDispatch).toContain("gh workflow run verify-official-brand-live.yml");
    expect(brandDispatch).toContain("exact-main Brand Live already active");
    expect(brandDispatch).not.toContain("wrangler pages deploy");
    expect(brandDispatch).not.toContain("supabase db push");

    expect(liveVerification).toContain('workflows: ["IndexNow After Verified Production"]');
    expect(liveVerification).not.toContain("\n  push:\n");
    expect(liveVerification).toContain("Resolve exact search-verified production SHA");
    expect(liveVerification).toContain("source_identity_state");
    expect(liveVerification).toContain('.context == "Irha Search Discovery"');
    expect(liveVerification).toContain('[ "$source_sha" = "$latest_main" ]');
    expect(liveVerification).toContain('"repos/$GITHUB_REPOSITORY/statuses/$SOURCE_SHA"');
    expect(liveVerification).toContain('context="Irha Brand Live"');
    expect(liveVerification).toContain("Official Irha Apparels Manufacturing Specialists crest supplied by the owner");

    expect(manifest.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ src: "/favicon.svg", sizes: "any", type: "image/svg+xml" }),
      expect.objectContaining({ src: "/icon-192x192.png", sizes: "192x192", type: "image/png" }),
      expect.objectContaining({ src: "/icon-512x512.png", sizes: "512x512", type: "image/png" }),
    ]));
    expect(manifest.icons.every((icon) => !icon.src.includes("?"))).toBe(true);

    expect(existsSync(resolve(process.cwd(), "public/irha-search-favicon-2026.svg"))).toBe(false);
  });
});
