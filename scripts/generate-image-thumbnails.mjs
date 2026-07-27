import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, "public");
const THUMBNAIL_DIR = path.join(PUBLIC_DIR, "thumbnails");
const RESPONSIVE_DIR = path.join(PUBLIC_DIR, "responsive");
const AI_MASTER_DIR = path.join(PUBLIC_DIR, "ai-master");
const STAGE_ROOT = path.join(PUBLIC_DIR, `.image-build-${process.pid}`);
const STAGE_THUMBNAIL_DIR = path.join(STAGE_ROOT, "thumbnails");
const STAGE_RESPONSIVE_DIR = path.join(STAGE_ROOT, "responsive");
const BACKUP_ROOT = path.join(PUBLIC_DIR, `.image-backup-${process.pid}`);
const SUPPORTED = new Set([".avif", ".gif", ".jpeg", ".jpg", ".png", ".webp"]);
const WIDTHS = [360, 720, 1200, 1600];
const CONCURRENCY = Math.max(1, Math.min(4, Number(process.env.THUMBNAIL_CONCURRENCY || 4)));

function qualityFor(width) {
  if (width <= 360) return 68;
  if (width <= 720) return 74;
  if (width <= 1200) return 80;
  return 84;
}

function shouldSkip(relativePath) {
  const normalized = relativePath.split(path.sep).join("/");
  return normalized.startsWith("thumbnails/")
    || normalized.startsWith("responsive/")
    || normalized.startsWith("ai-master/")
    || normalized.startsWith("ai-review/")
    || normalized.startsWith("catalogs/thumbs/")
    || normalized.startsWith(".image-build-")
    || normalized.startsWith(".image-backup-");
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

function variantDetails(relativePath, width) {
  const normalized = relativePath.split(path.sep).join("/");
  if (width === 720) {
    return {
      width,
      outputPath: path.join(STAGE_THUMBNAIL_DIR, `${relativePath}.webp`),
      publicPath: `/thumbnails/${normalized}.webp`,
    };
  }
  return {
    width,
    outputPath: path.join(STAGE_RESPONSIVE_DIR, String(width), `${relativePath}.webp`),
    publicPath: `/responsive/${width}/${normalized}.webp`,
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

async function pathExists(value) {
  try {
    await stat(value);
    return true;
  } catch {
    return false;
  }
}

async function sourceMetadata(relativePath) {
  const sourcePath = path.join(PUBLIC_DIR, relativePath);
  const aiMasterPath = path.join(AI_MASTER_DIR, `${relativePath}.webp`);
  const sourceBuffer = await readFile(sourcePath);
  const sourceInfo = await stat(sourcePath);
  const usesAiMaster = await pathExists(aiMasterPath);
  const processingBuffer = usesAiMaster ? await readFile(aiMasterPath) : sourceBuffer;
  return { sourceBuffer, sourceInfo, processingBuffer, usesAiMaster };
}

async function encodeVariants(inputBuffer) {
  const variants = [];
  for (const width of WIDTHS) {
    const outputBuffer = await sharp(inputBuffer, { animated: false, failOn: "error" })
      .rotate()
      .resize({
        width,
        fit: "inside",
        withoutEnlargement: true,
        fastShrinkOnLoad: true,
      })
      .webp({ quality: qualityFor(width), effort: 5, smartSubsample: true })
      .toBuffer();
    variants.push({ width, outputBuffer });
  }
  return variants;
}

async function writeVariants(relativePath, encodedVariants) {
  const written = [];
  for (const { width, outputBuffer } of encodedVariants) {
    const details = variantDetails(relativePath, width);
    await mkdir(path.dirname(details.outputPath), { recursive: true });
    await writeFile(details.outputPath, outputBuffer);
    const metadata = await sharp(outputBuffer).metadata();
    written.push({
      width,
      url: details.publicPath,
      bytes: outputBuffer.length,
      renderedWidth: metadata.width ?? null,
      renderedHeight: metadata.height ?? null,
      sha256: sha256(outputBuffer),
    });
  }
  return written;
}

async function buildOne(relativePath) {
  const { sourceBuffer, sourceInfo, processingBuffer, usesAiMaster } = await sourceMetadata(relativePath);
  const variants = await writeVariants(relativePath, await encodeVariants(processingBuffer));
  const thumbnail = variants.find((variant) => variant.width === 720);
  return {
    source: `/${relativePath.split(path.sep).join("/")}`,
    thumbnail: thumbnail?.url ?? null,
    sourceBytes: sourceInfo.size,
    thumbnailBytes: thumbnail?.bytes ?? null,
    width: thumbnail?.renderedWidth ?? null,
    height: thumbnail?.renderedHeight ?? null,
    sourceSha256: sha256(sourceBuffer),
    processingSha256: sha256(processingBuffer),
    thumbnailSha256: thumbnail?.sha256 ?? null,
    variants,
    aiMaster: usesAiMaster,
    fallback: false,
  };
}

async function buildFallback(relativePath, sourceError) {
  const { sourceBuffer, sourceInfo } = await sourceMetadata(relativePath);
  const label = escapeXml(path.basename(relativePath).replace(/[-_]+/g, " ").slice(0, 58));
  const fallbackSvg = Buffer.from(`
    <svg width="1200" height="1200" viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="1200" fill="#101722"/>
      <rect x="56" y="56" width="1088" height="1088" fill="none" stroke="#b9944a" stroke-width="3"/>
      <circle cx="600" cy="475" r="145" fill="none" stroke="#b9944a" stroke-width="10"/>
      <path d="M506 520l64-70 58 60 50-48 76 87H464z" fill="#b9944a" opacity="0.82"/>
      <text x="600" y="715" text-anchor="middle" fill="#d9bd7a" font-family="Arial, sans-serif" font-size="48" letter-spacing="8">IRHA APPARELS</text>
      <text x="600" y="800" text-anchor="middle" fill="#f2f2f2" font-family="Arial, sans-serif" font-size="34">Preview unavailable</text>
      <text x="600" y="870" text-anchor="middle" fill="#9d9d9d" font-family="Arial, sans-serif" font-size="24">${label}</text>
    </svg>
  `);
  const variants = await writeVariants(relativePath, await encodeVariants(fallbackSvg));
  const thumbnail = variants.find((variant) => variant.width === 720);
  return {
    source: `/${relativePath.split(path.sep).join("/")}`,
    thumbnail: thumbnail?.url ?? null,
    sourceBytes: sourceInfo.size,
    thumbnailBytes: thumbnail?.bytes ?? null,
    width: thumbnail?.renderedWidth ?? 720,
    height: thumbnail?.renderedHeight ?? 720,
    sourceSha256: sha256(sourceBuffer),
    processingSha256: sha256(fallbackSvg),
    thumbnailSha256: thumbnail?.sha256 ?? null,
    variants,
    aiMaster: false,
    fallback: true,
    sourceError,
  };
}

async function swapGeneratedDirectories() {
  await rm(BACKUP_ROOT, { recursive: true, force: true });
  await mkdir(BACKUP_ROOT, { recursive: true });
  const thumbnailBackup = path.join(BACKUP_ROOT, "thumbnails");
  const responsiveBackup = path.join(BACKUP_ROOT, "responsive");
  const hadThumbnails = await pathExists(THUMBNAIL_DIR);
  const hadResponsive = await pathExists(RESPONSIVE_DIR);
  if (hadThumbnails) await rename(THUMBNAIL_DIR, thumbnailBackup);
  if (hadResponsive) await rename(RESPONSIVE_DIR, responsiveBackup);
  try {
    await rename(STAGE_THUMBNAIL_DIR, THUMBNAIL_DIR);
    await rename(STAGE_RESPONSIVE_DIR, RESPONSIVE_DIR);
  } catch (error) {
    await rm(THUMBNAIL_DIR, { recursive: true, force: true });
    await rm(RESPONSIVE_DIR, { recursive: true, force: true });
    if (hadThumbnails && await pathExists(thumbnailBackup)) await rename(thumbnailBackup, THUMBNAIL_DIR);
    if (hadResponsive && await pathExists(responsiveBackup)) await rename(responsiveBackup, RESPONSIVE_DIR);
    throw error;
  } finally {
    await rm(BACKUP_ROOT, { recursive: true, force: true });
    await rm(STAGE_ROOT, { recursive: true, force: true });
  }
}

async function main() {
  await rm(STAGE_ROOT, { recursive: true, force: true });
  await mkdir(STAGE_THUMBNAIL_DIR, { recursive: true });
  await mkdir(STAGE_RESPONSIVE_DIR, { recursive: true });
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
          console.warn(`Generated safe fallback variants for ${relativePath}: ${sourceError}`);
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
    await rm(STAGE_ROOT, { recursive: true, force: true });
    console.error("Responsive image generation failed. Originals and the previous optimized image set were not changed.");
    for (const failure of fatalFailures.slice(0, 20)) {
      console.error(`- ${failure.source}: ${failure.error} (source decode: ${failure.sourceError})`);
    }
    if (fatalFailures.length > 20) console.error(`- and ${fatalFailures.length - 20} more`);
    process.exitCode = 1;
    return;
  }

  const fallbackEntries = results.filter((item) => item.fallback);
  const aiMasterEntries = results.filter((item) => item.aiMaster);
  const manifest = {
    version: 4,
    generatedAt: new Date().toISOString(),
    widths: WIDTHS,
    quality: Object.fromEntries(WIDTHS.map((width) => [width, qualityFor(width)])),
    sourceCount: files.length,
    aiMasterCount: aiMasterEntries.length,
    fallbackCount: fallbackEntries.length,
    fallbacks: fallbackEntries.map((item) => ({ source: item.source, error: item.sourceError })),
    images: results,
    thumbnails: results,
  };
  await writeFile(path.join(STAGE_THUMBNAIL_DIR, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  await swapGeneratedDirectories();

  const originalBytes = results.reduce((total, item) => total + item.sourceBytes, 0);
  const thumbnailBytes = results.reduce((total, item) => total + (item.thumbnailBytes || 0), 0);
  const reduction = originalBytes > 0 ? Math.round((1 - thumbnailBytes / originalBytes) * 100) : 0;
  console.log(`Generated ${results.length} responsive image sets at ${WIDTHS.join("/")}px (${reduction}% smaller 720px previews; ${aiMasterEntries.length} AI masters; ${fallbackEntries.length} safe fallbacks).`);
}

await main();
