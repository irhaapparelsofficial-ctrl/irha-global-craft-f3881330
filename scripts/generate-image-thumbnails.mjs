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

function outputDetails(relativePath) {
  const outputRelativePath = `${relativePath}.webp`;
  return {
    outputRelativePath,
    outputPath: path.join(STAGE_DIR, outputRelativePath),
    publicPath: `/thumbnails/${outputRelativePath.split(path.sep).join("/")}`,
  };
}

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

async function sourceMetadata(relativePath) {
  const sourcePath = path.join(PUBLIC_DIR, relativePath);
  const sourceBuffer = await readFile(sourcePath);
  const sourceInfo = await stat(sourcePath);
  return { sourcePath, sourceBuffer, sourceInfo };
}

async function buildOne(relativePath) {
  const { sourceBuffer, sourceInfo } = await sourceMetadata(relativePath);
  const { outputRelativePath, outputPath, publicPath } = outputDetails(relativePath);
  await mkdir(path.dirname(outputPath), { recursive: true });

  const outputBuffer = await sharp(sourceBuffer, { animated: false, failOn: "error" })
    .rotate()
    .resize({
      width: MAX_EDGE,
      height: MAX_EDGE,
      fit: "inside",
      withoutEnlargement: true,
      fastShrinkOnLoad: true,
    })
    .webp({ quality: QUALITY, effort: 4, smartSubsample: true })
    .toBuffer();

  await writeFile(outputPath, outputBuffer);
  const metadata = await sharp(outputBuffer).metadata();

  return {
    source: `/${relativePath.split(path.sep).join("/")}`,
    thumbnail: publicPath,
    sourceBytes: sourceInfo.size,
    thumbnailBytes: outputBuffer.length,
    width: metadata.width ?? null,
    height: metadata.height ?? null,
    sourceSha256: sha256(sourceBuffer),
    thumbnailSha256: sha256(outputBuffer),
    fallback: false,
    outputRelativePath,
  };
}

async function buildFallback(relativePath, sourceError) {
  const { sourceBuffer, sourceInfo } = await sourceMetadata(relativePath);
  const { outputRelativePath, outputPath, publicPath } = outputDetails(relativePath);
  await mkdir(path.dirname(outputPath), { recursive: true });

  const label = escapeXml(path.basename(relativePath).replace(/[-_]+/g, " ").slice(0, 58));
  const fallbackSvg = Buffer.from(`
    <svg width="720" height="720" viewBox="0 0 720 720" xmlns="http://www.w3.org/2000/svg">
      <rect width="720" height="720" fill="#101010"/>
      <rect x="34" y="34" width="652" height="652" fill="none" stroke="#b9944a" stroke-width="2"/>
      <circle cx="360" cy="285" r="88" fill="none" stroke="#b9944a" stroke-width="6"/>
      <path d="M304 312l38-42 35 36 30-29 45 52H278z" fill="#b9944a" opacity="0.82"/>
      <text x="360" y="430" text-anchor="middle" fill="#d9bd7a" font-family="Arial, sans-serif" font-size="29" letter-spacing="5">IRHA APPARELS</text>
      <text x="360" y="482" text-anchor="middle" fill="#f2f2f2" font-family="Arial, sans-serif" font-size="20">Preview unavailable</text>
      <text x="360" y="526" text-anchor="middle" fill="#9d9d9d" font-family="Arial, sans-serif" font-size="15">${label}</text>
    </svg>
  `);
  const outputBuffer = await sharp(fallbackSvg)
    .webp({ quality: QUALITY, effort: 4, smartSubsample: true })
    .toBuffer();
  await writeFile(outputPath, outputBuffer);
  const metadata = await sharp(outputBuffer).metadata();

  return {
    source: `/${relativePath.split(path.sep).join("/")}`,
    thumbnail: publicPath,
    sourceBytes: sourceInfo.size,
    thumbnailBytes: outputBuffer.length,
    width: metadata.width ?? 720,
    height: metadata.height ?? 720,
    sourceSha256: sha256(sourceBuffer),
    thumbnailSha256: sha256(outputBuffer),
    fallback: true,
    sourceError,
    outputRelativePath,
  };
}

async function main() {
  await rm(STAGE_DIR, { recursive: true, force: true });
  await mkdir(STAGE_DIR, { recursive: true });

  const files = await collectFiles(PUBLIC_DIR);
  const results = new Array(files.length);
  const fatalFailures = [];
  let cursor = 0;

  async function worker() {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= files.length) return;
      const relativePath = files[index];
      try {
        results[index] = await buildOne(relativePath);
      } catch (error) {
        const sourceError = error instanceof Error ? error.message : String(error);
        try {
          results[index] = await buildFallback(relativePath, sourceError);
          console.warn(`Generated safe fallback thumbnail for ${relativePath}: ${sourceError}`);
        } catch (fallbackError) {
          fatalFailures.push({
            source: relativePath,
            error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
            sourceError,
          });
        }
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  if (fatalFailures.length > 0) {
    await rm(STAGE_DIR, { recursive: true, force: true });
    console.error("Thumbnail generation failed. Originals and the previous thumbnail set were not changed.");
    for (const failure of fatalFailures.slice(0, 20)) {
      console.error(`- ${failure.source}: ${failure.error} (source decode: ${failure.sourceError})`);
    }
    if (fatalFailures.length > 20) console.error(`- and ${fatalFailures.length - 20} more`);
    process.exitCode = 1;
    return;
  }

  const manifestEntries = results.map(({ outputRelativePath: _outputRelativePath, ...item }) => item);
  const fallbackEntries = manifestEntries.filter((item) => item.fallback);
  const manifest = {
    version: 2,
    generatedAt: new Date().toISOString(),
    maxEdge: MAX_EDGE,
    quality: QUALITY,
    sourceCount: files.length,
    fallbackCount: fallbackEntries.length,
    fallbacks: fallbackEntries.map((item) => ({ source: item.source, error: item.sourceError })),
    thumbnails: manifestEntries,
  };
  await writeFile(path.join(STAGE_DIR, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

  await rm(OUTPUT_DIR, { recursive: true, force: true });
  await rename(STAGE_DIR, OUTPUT_DIR);

  const originalBytes = manifestEntries.reduce((total, item) => total + item.sourceBytes, 0);
  const thumbnailBytes = manifestEntries.reduce((total, item) => total + item.thumbnailBytes, 0);
  const reduction = originalBytes > 0 ? Math.round((1 - thumbnailBytes / originalBytes) * 100) : 0;
  console.log(`Generated ${manifestEntries.length} thumbnails (${reduction}% smaller in aggregate; ${fallbackEntries.length} safe fallback previews).`);
}

await main();
