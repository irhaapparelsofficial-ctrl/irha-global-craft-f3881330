import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const manifestPath = path.resolve("scripts/product-media-manifest.json");
const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));

async function fetchImage(url) {
  const response = await fetch(url, {
    redirect: "follow",
    headers: { "user-agent": "Irha-Apparels-Media-Sync/1.0" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    throw new Error(`Expected image, received ${contentType || "unknown content type"} from ${url}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 10_000) throw new Error(`Image payload too small (${bytes.length} bytes) from ${url}`);
  return bytes;
}

for (const [slug, items] of Object.entries(manifest.products ?? {})) {
  const outputDir = path.resolve("public/product-media", slug);
  await fs.mkdir(outputDir, { recursive: true });

  for (const item of items) {
    let sourceBytes;
    let lastError;
    for (const url of [item.source, item.fallback].filter(Boolean)) {
      try {
        sourceBytes = await fetchImage(url);
        break;
      } catch (error) {
        lastError = error;
      }
    }
    if (!sourceBytes) throw lastError ?? new Error(`Unable to fetch ${slug}/${item.file}`);

    const outputPath = path.join(outputDir, item.file);
    await sharp(sourceBytes)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82, effort: 5 })
      .toFile(outputPath);

    const stat = await fs.stat(outputPath);
    if (stat.size < 8_000) throw new Error(`Optimized file too small: ${outputPath}`);
    console.log(`Synced ${slug}/${item.file} (${stat.size} bytes)`);
  }
}
