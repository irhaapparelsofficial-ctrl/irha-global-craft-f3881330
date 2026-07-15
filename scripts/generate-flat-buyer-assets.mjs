import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const DIST_DIR = resolve("dist");

const STATIC_BUYER_ASSETS = new Map([
  ["/de/bekleidungshersteller-deutschland", "/_seo-static/de--bekleidungshersteller-deutschland.irha"],
  ["/custom-sportswear-manufacturer-germany", "/_seo-static/custom-sportswear-manufacturer-germany.irha"],
  ["/de/sportbekleidung-hersteller", "/_seo-static/de--sportbekleidung-hersteller.irha"],
  ["/leather-apparel-manufacturer-germany", "/_seo-static/leather-apparel-manufacturer-germany.irha"],
  ["/de/lederbekleidung-hersteller", "/_seo-static/de--lederbekleidung-hersteller.irha"],
]);

function verifyRuntimeFreeHtml(html, routePath) {
  if (!html.includes(`data-irha-route-shell="${routePath}"`)) {
    throw new Error(`Route marker missing from static buyer asset source: ${routePath}`);
  }
  if (!html.includes('data-irha-static-buyer-shell="true"')) {
    throw new Error(`Static buyer marker missing from source: ${routePath}`);
  }
  if (!html.includes(`<link rel="canonical" href="https://irhaapparels.com${routePath}"`)) {
    throw new Error(`Canonical URL missing from source: ${routePath}`);
  }
  const withoutJsonLd = html.replace(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi,
    "",
  );
  if (/<script\b/i.test(withoutJsonLd)) {
    throw new Error(`Application JavaScript leaked into flat buyer asset: ${routePath}`);
  }
  if (/rel=["'](?:stylesheet|modulepreload)["']/i.test(html)) {
    throw new Error(`Application CSS or module preload leaked into flat buyer asset: ${routePath}`);
  }
}

async function main() {
  for (const [routePath, assetPath] of STATIC_BUYER_ASSETS) {
    const sourcePath = join(DIST_DIR, routePath.slice(1), "index.html");
    const outputPath = join(DIST_DIR, assetPath.slice(1));
    const html = await readFile(sourcePath, "utf8");
    verifyRuntimeFreeHtml(html, routePath);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, html, "utf8");

    const written = await readFile(outputPath, "utf8");
    if (written !== html) {
      throw new Error(`Flat buyer asset differs from generated source: ${assetPath}`);
    }
  }

  console.log(`Generated ${STATIC_BUYER_ASSETS.size} redirect-free flat buyer assets`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
