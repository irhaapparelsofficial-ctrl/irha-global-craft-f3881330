import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const readBytes = (path: string) => readFileSync(resolve(process.cwd(), path));
const BRAND_VERSION = "ia-brand-master-e001-20260802-32eee79b";
const MASTER_SHA256 = "32eee79bc7038c53cff36bab46193c77e78702d7eef7883e8f94b145999a1b87";

async function expectPngDecodes(path: string, width: number, height: number) {
  const bytes = readBytes(path);
  const image = sharp(bytes, { failOn: "error" });
  const metadata = await image.metadata();
  expect(metadata).toMatchObject({ format: "png", width, height });
  await image.raw().toBuffer();
}

describe("Irha favicon branding", () => {
  it("uses the exact owner-supplied crest across search metadata and fallbacks", async () => {
    const index = read("index.html");
    const favicon = read("public/favicon.svg");
    const brandAssets = read("src/lib/brandAssets.ts");
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

    expect(brandAssets).toContain('const OFFICIAL_RUNTIME_CREST = "/brand/irha-apparels-official-runtime-512.png"');
    expect(brandAssets).toContain('path: "/brand/irha-apparels-official-master.png"');
    expect(brandAssets).toContain(`sha256: "${MASTER_SHA256}"`);
    expect(brandAssets).toContain(`BRAND_ASSET_VERSION = "${BRAND_VERSION}"`);
    expect(navbar).toContain("BRAND_ASSETS.headerLogo");
    expect(navbar).toContain("Official Irha Apparels Manufacturing Specialists logo");
    expect(navbar).not.toContain('src="/favicon.svg"');
    expect(imageLoading).toContain("BRAND_ASSETS.controlledFallback");
    expect(imageLoading).not.toContain('CONTROLLED_IMAGE_FALLBACK = "/favicon.svg"');

    expect(favicon).toContain('viewBox="0 0 192 192"');
    expect(favicon).toContain('<title id="title">Irha Apparels</title>');
    expect(favicon).toContain("Official Irha Apparels Manufacturing Specialists crest derived from the exact owner-uploaded master.");
    expect(favicon).toContain(`data-master-sha256="${MASTER_SHA256}"`);
    expect(favicon).toContain('<image width="192" height="192"');
    expect(favicon).toContain('href="data:image/png;base64,');
    expect(favicon.toLowerCase()).not.toContain("lovable");

    const crestPrefix = 'href="data:image/png;base64,';
    const crestStart = favicon.indexOf(crestPrefix);
    expect(crestStart).toBeGreaterThanOrEqual(0);
    const payloadStart = crestStart + crestPrefix.length;
    const crestEnd = favicon.indexOf('"', payloadStart);
    expect(crestEnd).toBeGreaterThan(payloadStart);
    const encodedCrest = favicon.slice(payloadStart, crestEnd).replace(/\s+/g, "");
    expect(encodedCrest).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
    const embeddedCrest = Buffer.from(encodedCrest, "base64");
    expect(Buffer.compare(embeddedCrest, readBytes("public/icon-192x192.png"))).toBe(0);
    const faviconImage = sharp(embeddedCrest, { failOn: "error" });
    const faviconMeta = await faviconImage.metadata();
    expect(faviconMeta).toMatchObject({ format: "png", width: 192, height: 192 });
    await faviconImage.raw().toBuffer();

    await expectPngDecodes("public/favicon-16x16.png", 16, 16);
    await expectPngDecodes("public/favicon-32x32.png", 32, 32);
    await expectPngDecodes("public/favicon-48x48.png", 48, 48);
    await expectPngDecodes("public/apple-touch-icon.png", 180, 180);
    await expectPngDecodes("public/icon-192x192.png", 192, 192);
    await expectPngDecodes("public/icon-512x512.png", 512, 512);

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
    expect(workerPatch).toContain('X-Irha-Favicon-Source", "official-owner-crest');
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
    expect(liveVerification).toContain(MASTER_SHA256);
    expect(liveVerification).toContain("/brand/irha-apparels-official-master.png");
    expect(liveVerification).toContain("data:image/png;base64,");

    expect(manifest.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ src: "/favicon.svg", sizes: "any", type: "image/svg+xml" }),
      expect.objectContaining({ src: "/icon-192x192.png", sizes: "192x192", type: "image/png" }),
      expect.objectContaining({ src: "/icon-512x512.png", sizes: "512x512", type: "image/png" }),
    ]));
    expect(manifest.icons.every((icon) => !icon.src.includes("?"))).toBe(true);

    expect(existsSync(resolve(process.cwd(), "public/irha-search-favicon-2026.svg"))).toBe(false);
  });
});
