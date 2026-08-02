import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const MASTER_PATH = "public/brand/irha-apparels-official-master.png";
const MASTER_PUBLIC_PATH = "/brand/irha-apparels-official-master.png";
const RUNTIME_PATH = "/brand/irha-apparels-official-runtime-512.png";
const MASTER_SHA256 = "32eee79bc7038c53cff36bab46193c77e78702d7eef7883e8f94b145999a1b87";
const BRAND_VERSION = "ia-brand-master-e001-20260802-32eee79b";

const readText = (path: string) => readFileSync(resolve(ROOT, path), "utf8");
const readBytes = (path: string) => readFileSync(resolve(ROOT, path));
const hash = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

async function decoded(path: string, width: number, height: number) {
  const image = sharp(readBytes(path), { failOn: "error" });
  const metadata = await image.metadata();
  expect(metadata).toMatchObject({ format: "png", width, height });
  return image.raw().toBuffer();
}

describe("IA-BRAND-MASTER-E001 official brand master contract", () => {
  it("locks the exact owner-uploaded master by immutable identity", async () => {
    const bytes = readBytes(MASTER_PATH);
    expect(hash(bytes)).toBe(MASTER_SHA256);
    expect(bytes.byteLength).toBe(1023183);
    const metadata = await sharp(bytes, { failOn: "error" }).metadata();
    expect(metadata).toMatchObject({ format: "png", width: 1024, height: 1024 });
    await sharp(bytes, { failOn: "error" }).raw().toBuffer();
  });

  it("records one explicit provenance chain from locked master to every technical derivative", () => {
    const provenance = JSON.parse(readText("public/brand/brand-master.json"));
    expect(provenance).toMatchObject({
      schemaVersion: 1,
      executionId: "IA-BRAND-MASTER-E001",
      source: "owner-uploaded file in execution chat",
      master: {
        path: MASTER_PATH,
        publicPath: MASTER_PUBLIC_PATH,
        sha256: MASTER_SHA256,
        mimeType: "image/png",
        width: 1024,
        height: 1024,
        sizeBytes: 1023183,
      },
      generation: {
        implementation: "scripts/generate-official-brand-assets.mjs",
        library: "sharp",
        fit: "contain",
        kernel: "lanczos3",
        crop: false,
        stretch: false,
      },
      brandAssetVersion: BRAND_VERSION,
    });
    expect(provenance.derivatives.map((item: { publicPath: string }) => item.publicPath)).toEqual(expect.arrayContaining([
      RUNTIME_PATH,
      "/favicon-16x16.png",
      "/favicon-32x32.png",
      "/favicon-48x48.png",
      "/apple-touch-icon.png",
      "/icon-192x192.png",
      "/icon-512x512.png",
    ]));
  });

  it("proves committed raster derivatives are no-crop resizes of the locked master", async () => {
    const master = readBytes(MASTER_PATH);
    for (const [path, size] of [
      ["public/brand/irha-apparels-official-runtime-512.png", 512],
      ["public/favicon-16x16.png", 16],
      ["public/favicon-32x32.png", 32],
      ["public/favicon-48x48.png", 48],
      ["public/apple-touch-icon.png", 180],
      ["public/icon-192x192.png", 192],
      ["public/icon-512x512.png", 512],
    ] as const) {
      const actual = await decoded(path, size, size);
      const expected = await sharp(master, { failOn: "error" })
        .resize(size, size, {
          fit: "contain",
          position: "centre",
          withoutEnlargement: true,
          kernel: sharp.kernel.lanczos3,
        })
        .raw()
        .toBuffer();
      expect(Buffer.compare(actual, expected), path).toBe(0);
    }
  });

  it("keeps header, footer, fallback and canonical identity on the official master lineage", () => {
    const brandAssets = readText("src/lib/brandAssets.ts");
    const navbar = readText("src/components/layout/Navbar.tsx");
    const footer = readText("src/components/layout/Footer.tsx");
    const imageLoading = readText("src/lib/imageLoading.ts");
    const publicIdentity = readText("src/lib/publicIdentity.mjs");
    const siteSettings = readText("src/lib/siteSettings.ts");

    expect(brandAssets).toContain(`BRAND_ASSET_VERSION = "${BRAND_VERSION}"`);
    expect(brandAssets).toContain(`path: "${MASTER_PUBLIC_PATH}"`);
    expect(brandAssets).toContain(`sha256: "${MASTER_SHA256}"`);
    expect(brandAssets).toContain(`const OFFICIAL_RUNTIME_CREST = "${RUNTIME_PATH}"`);
    expect(brandAssets).not.toContain('const OFFICIAL_OWNER_CREST = "/icon-512x512.png"');
    expect(navbar).toContain("BRAND_ASSETS.headerLogo");
    expect(footer).toContain("BRAND_ASSETS.footerLogo");
    expect(imageLoading).toContain("BRAND_ASSETS.controlledFallback");
    expect(publicIdentity).toContain(`logoUrl: "https://irhaapparels.com${RUNTIME_PATH}"`);
    expect(siteSettings).toContain(`logoUrl: "${RUNTIME_PATH}"`);
  });

  it("locks favicon and PWA metadata to the same official provenance", async () => {
    const favicon = readText("public/favicon.svg");
    const manifest = JSON.parse(readText("public/manifest.webmanifest"));
    expect(favicon).toContain(`data-master-sha256="${MASTER_SHA256}"`);
    expect(favicon).toContain("data:image/png;base64,");
    const prefix = 'href="data:image/png;base64,';
    const start = favicon.indexOf(prefix) + prefix.length;
    const end = favicon.indexOf('"', start);
    expect(start).toBeGreaterThan(prefix.length - 1);
    expect(end).toBeGreaterThan(start);
    expect(Buffer.compare(
      Buffer.from(favicon.slice(start, end).replace(/\s+/g, ""), "base64"),
      readBytes("public/icon-192x192.png"),
    )).toBe(0);
    await decoded("public/icon-192x192.png", 192, 192);
    await decoded("public/icon-512x512.png", 512, 512);
    expect(manifest.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ src: "/favicon.svg", sizes: "any" }),
      expect.objectContaining({ src: "/icon-192x192.png", sizes: "192x192" }),
      expect.objectContaining({ src: "/icon-512x512.png", sizes: "512x512" }),
    ]));
  });

  it("keeps the permanent generator and live verifier hash-locked to this owner master", () => {
    const generator = readText("scripts/generate-official-brand-assets.mjs");
    const liveVerification = readText(".github/workflows/verify-official-brand-live.yml");
    expect(generator).toContain(`path: "${MASTER_PATH}"`);
    expect(generator).toContain(`sha256: "${MASTER_SHA256}"`);
    expect(generator).toContain('fit: "contain"');
    expect(generator).toContain("sharp.kernel.lanczos3");
    expect(generator).toContain("crop: false");
    expect(generator).toContain("stretch: false");
    expect(liveVerification).toContain(MASTER_SHA256);
    expect(liveVerification).toContain(MASTER_PUBLIC_PATH);
    expect(liveVerification).toContain(RUNTIME_PATH);
  });
});
