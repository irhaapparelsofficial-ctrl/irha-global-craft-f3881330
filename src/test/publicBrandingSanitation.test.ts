import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const readText = (path: string) => readFileSync(resolve(root, path), "utf8");
const readBytes = (path: string) => readFileSync(resolve(root, path));

function pngDimensions(path: string) {
  const bytes = readBytes(path);
  expect(bytes.subarray(1, 4).toString("ascii")).toBe("PNG");
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function runSanitizer(content: string) {
  const directory = mkdtempSync(join(tmpdir(), "irha-public-branding-"));
  const target = join(directory, "index.html");
  writeFileSync(target, content, "utf8");
  const result = spawnSync(process.execPath, [resolve(root, "scripts/sanitize-unsupported-trust-copy.mjs")], {
    cwd: root,
    env: { ...process.env, IRHA_DIST_DIR: directory },
    encoding: "utf8",
  });
  const output = readFileSync(target, "utf8");
  rmSync(directory, { recursive: true, force: true });
  return { ...result, output };
}

describe("IA-CONTENT-E001 public branding sanitation", () => {
  it("removes internal, artificial and website-age presentation wording from built output", () => {
    const result = runSanitizer(`<!doctype html><html><head>
      <meta name="description" content="Experienced manufacturer. Newly built website." />
    </head><body>
      <p>Digital catalogue reference</p>
      <p>AI-generated mockups</p>
      <p>Genuine factory photography and video is pending. This page uses process information—not concept visuals—as its evidence.</p>
      <img src="/placeholder.svg" alt="Image unavailable" />
    </body></html>`);

    expect(result.status).toBe(0);
    expect(result.output).not.toMatch(/newly built website|digital catalogue reference|AI-generated|pending|concept visuals|placeholder\.svg|image unavailable/i);
    expect(result.output).toContain("Product style");
    expect(result.output).toContain("Visual previews");
    expect(result.output).toContain("/favicon.svg");
    expect(result.stdout).toContain('"prohibitedPresentationAfter":0');
  });

  it("blocks unsupported certification claims rather than publishing them", () => {
    const result = runSanitizer("<html><body><p>ISO 9001 certified apparel manufacturer</p></body></html>");
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Buyer-facing content or branding guard failed");
  });

  it("uses the official Irha crest for fallbacks and restrained card chrome", () => {
    const imageLoading = readText("src/lib/imageLoading.ts");
    const resilientImage = readText("src/components/ResilientImage.tsx");
    const cards = readText("src/components/catalog/CatalogListingCard.tsx");
    const hero = readText("src/components/HeroCarousel.tsx");
    const placeholder = readText("public/placeholder.svg");

    expect(imageLoading).toContain('CONTROLLED_IMAGE_FALLBACK = "/favicon.svg"');
    expect(resilientImage).toContain('data-brand-fallback={controlledFallbackActive ? "irha-official-crest" : undefined}');
    expect(resilientImage).not.toMatch(/Image unavailable|question mark/i);
    expect(cards).toContain('data-card-brand="irha-official-crest"');
    expect(cards).toContain("pointer-events-none");
    expect(cards).toContain("h-7 w-7");
    expect(hero).toContain('data-card-brand="irha-official-crest"');
    expect(placeholder).toContain('href="/favicon.svg"');
    expect(placeholder.toLowerCase()).not.toContain("lovable");
  });

  it("publishes complete official favicon and manifest assets at exact dimensions", () => {
    expect(pngDimensions("public/favicon-16x16.png")).toEqual({ width: 16, height: 16 });
    expect(pngDimensions("public/favicon-32x32.png")).toEqual({ width: 32, height: 32 });
    expect(pngDimensions("public/favicon-48x48.png")).toEqual({ width: 48, height: 48 });
    expect(pngDimensions("public/apple-touch-icon.png")).toEqual({ width: 180, height: 180 });
    expect(pngDimensions("public/icon-192x192.png")).toEqual({ width: 192, height: 192 });
    expect(pngDimensions("public/icon-512x512.png")).toEqual({ width: 512, height: 512 });

    const ico = readBytes("public/favicon.ico");
    expect(ico.readUInt16LE(0)).toBe(0);
    expect(ico.readUInt16LE(2)).toBe(1);
    expect(ico.readUInt16LE(4)).toBeGreaterThanOrEqual(3);

    const manifest = JSON.parse(readText("public/manifest.webmanifest")) as {
      id: string;
      name: string;
      start_url: string;
      icons: Array<{ src: string; sizes: string; type: string }>;
    };
    expect(manifest.id).toBe("/");
    expect(manifest.name).toBe("Irha Apparels");
    expect(manifest.start_url).toBe("/");
    expect(manifest.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ src: "/favicon.svg", sizes: "any", type: "image/svg+xml" }),
      expect.objectContaining({ src: "/icon-192x192.png", sizes: "192x192", type: "image/png" }),
      expect.objectContaining({ src: "/icon-512x512.png", sizes: "512x512", type: "image/png" }),
    ]));
  });

  it("preserves internal operational status language outside the public artifact guard", () => {
    const admin = readText("src/components/admin/WebsiteInquiriesPanel.tsx");
    expect(admin).toMatch(/status|pending|processing/i);
    expect(readText("scripts/sanitize-unsupported-trust-copy.mjs")).toContain("DIST_DIR");
  });
});
