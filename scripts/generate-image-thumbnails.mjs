import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, "public");
const OUTPUT_DIR = path.join(PUBLIC_DIR, "thumbnails");
const STAGE_DIR = path.join(PUBLIC_DIR, `.thumbnail-build-${process.pid}`);
const SUPPORTED = new Set([".avif", ".gif", ".jpeg", ".jpg", ".png", ".webp"]);
const MAX_EDGE = 720;
const QUALITY = 72;
const CONCURRENCY = Math.max(1, Math.min(4, Number(process.env.THUMBNAIL_CONCURRENCY || 4)));

function shouldSkip(relativePath) {
  const normalized = relativePath.split(path.sep).join("/");
  return normalized.startsWith("thumbnails/")
    || normalized.startsWith("catalogs/thumbs/")
    || normalized.startsWith(".thumbnail-build-");
}

async function collectFiles(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = prefix ? path.join(prefix, entry.name) : entry.name;
    if (shouldSkip(relativePath)) continue;
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...await collectFiles(absolutePath, relativePath));
      continue;
    }

    if (!entry.isFile() || !SUPPORTED.has(path.extname(entry.name).toLowerCase())) continue;
    files.push(relativePath);
  }

  return files.sort((a, b) => a.localeCompare(b));
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function buildOne(relativePath) {
  const sourcePath = path.join(PUBLIC_DIR, relativePath);
  const outputRelativePath = `${relativePath}.webp`;
  const outputPath = path.join(STAGE_DIR, outputRelativePath);
  await mkdir(path.dirname(outputPath), { recursive: true });

  const sourceBuffer = await readFile(sourcePath);
  const pipeline = sharp(sourceBuffer, { animated: false, failOn: "error" })
    .rotate()
    .resize({
      width: MAX_EDGE,
      height: MAX_EDGE,
      fit: "inside",
      withoutEnlargement: true,
      fastShrinkOnLoad: true,
    })
    .webp({ quality: QUALITY, effort: 4, smartSubsample: true });

  const outputBuffer = await pipeline.toBuffer();
  await writeFile(outputPath, outputBuffer);
  const metadata = await sharp(outputBuffer).metadata();
  const sourceInfo = await stat(sourcePath);

  return {
    source: `/${relativePath.split(path.sep).join("/")}`,
    thumbnail: `/thumbnails/${outputRelativePath.split(path.sep).join("/")}`,
    sourceBytes: sourceInfo.size,
    thumbnailBytes: outputBuffer.length,
    width: metadata.width ?? null,
    height: metadata.height ?? null,
    sourceSha256: sha256(sourceBuffer),
    thumbnailSha256: sha256(outputBuffer),
  };
}

async function main() {
  await rm(STAGE_DIR, { recursive: true, force: true });
  await mkdir(STAGE_DIR, { recursive: true });

  const files = await collectFiles(PUBLIC_DIR);
  const results = new Array(files.length);
  const failures = [];
  let cursor = 0;

  async function worker() {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= files.length) return;
      try {
        results[index] = await buildOne(files[index]);
      } catch (error) {
        failures.push({
          source: files[index],
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  if (failures.length > 0) {
    await rm(STAGE_DIR, { recursive: true, force: true });
    console.error("Thumbnail generation failed. Originals were not changed.");
    for (const failure of failures.slice(0, 20)) {
      console.error(`- ${failure.source}: ${failure.error}`);
    }
    if (failures.length > 20) console.error(`- and ${failures.length - 20} more`);
    process.exitCode = 1;
    return;
  }

  const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    maxEdge: MAX_EDGE,
    quality: QUALITY,
    sourceCount: files.length,
    thumbnails: results,
  };
  await writeFile(path.join(STAGE_DIR, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

  await rm(OUTPUT_DIR, { recursive: true, force: true });
  await rename(STAGE_DIR, OUTPUT_DIR);

  const originalBytes = results.reduce((total, item) => total + item.sourceBytes, 0);
  const thumbnailBytes = results.reduce((total, item) => total + item.thumbnailBytes, 0);
  const reduction = originalBytes > 0 ? Math.round((1 - thumbnailBytes / originalBytes) * 100) : 0;
  console.log(`Generated ${results.length} thumbnails (${reduction}% smaller in aggregate).`);
}

await main();
