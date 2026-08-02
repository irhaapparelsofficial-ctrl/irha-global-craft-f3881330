import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import sharp from "sharp";

export const OFFICIAL_BRAND_MASTER = Object.freeze({
  path: "public/brand/irha-apparels-official-master.png",
  publicPath: "/brand/irha-apparels-official-master.png",
  sha256: "32eee79bc7038c53cff36bab46193c77e78702d7eef7883e8f94b145999a1b87",
  mimeType: "image/png",
  width: 1024,
  height: 1024,
  sizeBytes: 1023183,
});

export const OFFICIAL_BRAND_DERIVATIVES = Object.freeze([
  { path: "public/brand/irha-apparels-official-runtime-512.png", publicPath: "/brand/irha-apparels-official-runtime-512.png", size: 512, role: "runtime" },
  { path: "public/favicon-16x16.png", publicPath: "/favicon-16x16.png", size: 16, role: "favicon" },
  { path: "public/favicon-32x32.png", publicPath: "/favicon-32x32.png", size: 32, role: "favicon" },
  { path: "public/favicon-48x48.png", publicPath: "/favicon-48x48.png", size: 48, role: "favicon" },
  { path: "public/apple-touch-icon.png", publicPath: "/apple-touch-icon.png", size: 180, role: "apple-touch-icon" },
  { path: "public/icon-192x192.png", publicPath: "/icon-192x192.png", size: 192, role: "pwa" },
  { path: "public/icon-512x512.png", publicPath: "/icon-512x512.png", size: 512, role: "pwa" },
]);

const BRAND_VERSION = "ia-brand-master-e001-20260802-32eee79b";
const root = process.cwd();
const masterPath = resolve(root, OFFICIAL_BRAND_MASTER.path);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function writeEnsured(path, bytes) {
  const absolute = resolve(root, path);
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, bytes);
}

export async function verifyOfficialBrandMaster() {
  const bytes = await readFile(masterPath);
  const hash = sha256(bytes);
  if (hash !== OFFICIAL_BRAND_MASTER.sha256) {
    throw new Error(`Official brand master SHA-256 mismatch: ${hash}`);
  }
  if (bytes.length !== OFFICIAL_BRAND_MASTER.sizeBytes) {
    throw new Error(`Official brand master size mismatch: ${bytes.length}`);
  }
  const metadata = await sharp(bytes, { failOn: "error" }).metadata();
  if (metadata.format !== "png" || metadata.width !== OFFICIAL_BRAND_MASTER.width || metadata.height !== OFFICIAL_BRAND_MASTER.height) {
    throw new Error(`Official brand master decode mismatch: ${metadata.format} ${metadata.width}x${metadata.height}`);
  }
  return bytes;
}

export async function generateOfficialBrandAssets() {
  const master = await verifyOfficialBrandMaster();
  const generated = new Map();

  for (const derivative of OFFICIAL_BRAND_DERIVATIVES) {
    const bytes = await sharp(master, { failOn: "error" })
      .resize(derivative.size, derivative.size, {
        fit: "contain",
        position: "centre",
        withoutEnlargement: true,
        kernel: sharp.kernel.lanczos3,
      })
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toBuffer();
    await writeEnsured(derivative.path, bytes);
    generated.set(derivative.publicPath, { bytes, sha256: sha256(bytes), size: derivative.size, role: derivative.role });
  }

  const icon192 = generated.get("/icon-192x192.png").bytes;
  const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" role="img" aria-labelledby="title desc" data-master-sha256="${OFFICIAL_BRAND_MASTER.sha256}">\n  <title id="title">Irha Apparels</title>\n  <desc id="desc">Official Irha Apparels Manufacturing Specialists crest derived from the exact owner-uploaded master.</desc>\n  <image width="192" height="192" preserveAspectRatio="xMidYMid meet" href="data:image/png;base64,${icon192.toString("base64")}" />\n</svg>\n`;
  await writeEnsured("public/favicon.svg", faviconSvg);

  const runtime512 = generated.get("/brand/irha-apparels-official-runtime-512.png").bytes;
  const compatibilitySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-labelledby="title desc" data-master-sha256="${OFFICIAL_BRAND_MASTER.sha256}">\n  <title id="title">Irha Apparels Manufacturing Specialists</title>\n  <desc id="desc">Compatibility asset derived from the exact owner-uploaded Irha Apparels master logo.</desc>\n  <image width="512" height="512" preserveAspectRatio="xMidYMid meet" href="data:image/png;base64,${runtime512.toString("base64")}" />\n</svg>\n`;
  await writeEnsured("public/irha-brand-mark.svg", compatibilitySvg);

  const provenance = {
    schemaVersion: 1,
    executionId: "IA-BRAND-MASTER-E001",
    source: "owner-uploaded file in execution chat",
    master: OFFICIAL_BRAND_MASTER,
    generation: {
      implementation: "scripts/generate-official-brand-assets.mjs",
      library: "sharp",
      fit: "contain",
      kernel: "lanczos3",
      crop: false,
      stretch: false,
    },
    brandAssetVersion: BRAND_VERSION,
    derivatives: OFFICIAL_BRAND_DERIVATIVES.map((item) => ({
      path: item.path,
      publicPath: item.publicPath,
      width: item.size,
      height: item.size,
      role: item.role,
      sha256: generated.get(item.publicPath).sha256,
    })),
  };
  await writeEnsured("public/brand/brand-master.json", `${JSON.stringify(provenance, null, 2)}\n`);

  console.log(`Verified exact owner brand master ${OFFICIAL_BRAND_MASTER.sha256} and generated ${OFFICIAL_BRAND_DERIVATIVES.length} raster derivatives`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await generateOfficialBrandAssets();
}
