import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import {
  EXECUTION_ID,
  MEDIA_VERSION,
  PRODUCTS,
  RESPONSIVE_WIDTHS,
  SITE_MEDIA_BUCKET,
} from "../ops/ia-media-e001/media-plan.mjs";

const PROJECT_REF = "pvzjiozismyxqrzmtfbi";
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;
const ARTIFACT_DIR = resolve("artifacts/ia-media-e001-stage");

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
};

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const productCode = (product) => product.sku.replace(/^IRHA-/, "").toLowerCase();
const productStorageRoot = (product) =>
  `catalog/products/${productCode(product)}-${product.slug}/${MEDIA_VERSION}`;
const targetOriginalPath = (product, image) =>
  `${productStorageRoot(product)}/${String(image.displayOrder).padStart(2, "0")}-${image.role}-${image.driveFileId}.webp`;
const variantPath = (originalPath, width) => width === 720
  ? `thumbnails/${originalPath}.webp`
  : `responsive/${width}/${originalPath}.webp`;

async function managementRequest(path) {
  const token = required("SUPABASE_ACCESS_TOKEN");
  const response = await fetch(`https://api.supabase.com${path}`, {
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Supabase Management API ${response.status}: ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : null;
}

async function elevatedProjectKey() {
  const keys = await managementRequest(`/v1/projects/${PROJECT_REF}/api-keys?reveal=true`);
  const key = keys.find((candidate) => candidate.type === "secret" && candidate.api_key)
    ?? keys.find((candidate) => candidate.name === "service_role" && candidate.api_key);
  if (!key?.api_key) throw new Error("No elevated Supabase project key is available to the guarded workflow");
  return key.api_key;
}

async function downloadOrThrow(client, bucket, path) {
  const { data, error } = await client.storage.from(bucket).download(path);
  if (error || !data) throw new Error(`Storage download failed for ${bucket}/${path}: ${error?.message ?? "missing data"}`);
  return Buffer.from(await data.arrayBuffer());
}

async function uploadImmutable(client, path, buffer) {
  const checksumSha256 = sha256(buffer);
  const { error } = await client.storage.from(SITE_MEDIA_BUCKET).upload(path, buffer, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });
  if (!error) return { reused: false, checksumSha256, sizeBytes: buffer.length };
  if (!/already exists|duplicate/i.test(error.message)) throw error;

  const existing = await downloadOrThrow(client, SITE_MEDIA_BUCKET, path);
  if (sha256(existing) !== checksumSha256) throw new Error(`Immutable target collision at ${path}`);
  return { reused: true, checksumSha256, sizeBytes: existing.length };
}

async function verifyWebp(client, path, expectedWidth, expectedChecksum) {
  const buffer = await downloadOrThrow(client, SITE_MEDIA_BUCKET, path);
  const metadata = await sharp(buffer, { failOn: "error" }).metadata();
  if (metadata.format !== "webp") throw new Error(`${path} decoded as ${metadata.format}, expected webp`);
  if (metadata.width !== expectedWidth) throw new Error(`${path} width ${metadata.width}, expected ${expectedWidth}`);
  if (sha256(buffer) !== expectedChecksum) throw new Error(`${path} checksum mismatch after staging`);
  return { width: metadata.width, height: metadata.height, sizeBytes: buffer.length };
}

async function generateObjects(client, catalogById) {
  const generated = [];
  const sources = [];

  for (const product of PRODUCTS) {
    for (const image of product.images) {
      const source = catalogById.get(image.driveFileId);
      if (!source) throw new Error(`Missing catalog provenance row for ${image.driveFileId}`);
      if (source.product_drive_folder_id !== product.driveFolderId) {
        throw new Error(`${image.driveFileId} belongs to unexpected Drive folder`);
      }
      if (!source.media_asset_id) throw new Error(`${image.driveFileId} has no canonical media asset linkage`);

      const sourceBuffer = await downloadOrThrow(client, source.original_bucket, source.original_object_path);
      const sourceChecksumSha256 = sha256(sourceBuffer);
      if (sourceChecksumSha256 !== source.checksum_sha256) {
        throw new Error(`Original checksum mismatch for ${image.driveFileId}`);
      }
      const sourceMetadata = await sharp(sourceBuffer, { failOn: "error" }).metadata();
      if (!sourceMetadata.width || !sourceMetadata.height) {
        throw new Error(`Could not decode source dimensions for ${image.driveFileId}`);
      }

      const originalPath = targetOriginalPath(product, image);
      const canonical = await sharp(sourceBuffer, { failOn: "error" })
        .rotate()
        .webp({ quality: 92, effort: 6, smartSubsample: true })
        .toBuffer({ resolveWithObject: true });
      generated.push({
        productSku: product.sku,
        productSlug: product.slug,
        sourceDriveFileId: image.driveFileId,
        mediaAssetId: source.media_asset_id,
        role: image.role,
        displayOrder: image.displayOrder,
        path: originalPath,
        width: canonical.info.width,
        height: canonical.info.height,
        buffer: canonical.data,
      });

      for (const width of RESPONSIVE_WIDTHS) {
        const output = await sharp(sourceBuffer, { failOn: "error" })
          .rotate()
          .resize({ width, fit: "inside", withoutEnlargement: false, kernel: sharp.kernel.lanczos3 })
          .webp({
            quality: width >= 1600 ? 90 : width >= 1200 ? 88 : width >= 720 ? 86 : 82,
            effort: 6,
            smartSubsample: true,
          })
          .toBuffer({ resolveWithObject: true });
        if (output.info.width !== width) {
          throw new Error(`Generated ${image.driveFileId} ${width}px variant at ${output.info.width}px`);
        }
        generated.push({
          productSku: product.sku,
          productSlug: product.slug,
          sourceDriveFileId: image.driveFileId,
          mediaAssetId: source.media_asset_id,
          role: image.role,
          displayOrder: image.displayOrder,
          path: variantPath(originalPath, width),
          width: output.info.width,
          height: output.info.height,
          buffer: output.data,
        });
      }

      sources.push({
        productSku: product.sku,
        productSlug: product.slug,
        sourceDriveFileId: image.driveFileId,
        sourceDriveFolderId: product.driveFolderId,
        mediaAssetId: source.media_asset_id,
        originalFilename: source.source_name,
        originalMimeType: source.source_mime_type,
        originalDimensions: { width: sourceMetadata.width, height: sourceMetadata.height },
        sourceChecksumSha256,
        sourceStorage: { bucket: source.original_bucket, path: source.original_object_path },
        canonicalProductPath: originalPath,
        role: image.role,
        displayOrder: image.displayOrder,
        confidence: image.confidence,
        visualIdentificationReasons: image.visualIdentificationReasons,
      });
    }
  }

  return { generated, sources };
}

async function main() {
  await mkdir(ARTIFACT_DIR, { recursive: true });
  const serviceKey = await elevatedProjectKey();
  const client = createClient(SUPABASE_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-irha-execution": `${EXECUTION_ID}-STAGE` } },
  });

  const selectedIds = PRODUCTS.flatMap((product) => product.images.map((image) => image.driveFileId));
  const { data: catalogRows, error } = await client
    .from("catalog_drive_files")
    .select("drive_file_id,product_drive_folder_id,source_name,source_mime_type,checksum_sha256,original_bucket,original_object_path,media_asset_id")
    .in("drive_file_id", selectedIds);
  if (error) throw error;
  if (catalogRows.length !== selectedIds.length) {
    throw new Error(`Expected ${selectedIds.length} provenance rows, received ${catalogRows.length}`);
  }

  const { generated, sources } = await generateObjects(
    client,
    new Map(catalogRows.map((row) => [row.drive_file_id, row])),
  );
  const uploaded = [];

  try {
    for (const object of generated) {
      const result = await uploadImmutable(client, object.path, object.buffer);
      const decoded = await verifyWebp(client, object.path, object.width, result.checksumSha256);
      uploaded.push({
        productSku: object.productSku,
        productSlug: object.productSlug,
        sourceDriveFileId: object.sourceDriveFileId,
        mediaAssetId: object.mediaAssetId,
        role: object.role,
        displayOrder: object.displayOrder,
        bucket: SITE_MEDIA_BUCKET,
        path: object.path,
        publicUrl: `${SUPABASE_URL}/storage/v1/object/public/${SITE_MEDIA_BUCKET}/${object.path}`,
        mimeType: "image/webp",
        checksumSha256: result.checksumSha256,
        sizeBytes: decoded.sizeBytes,
        width: decoded.width,
        height: decoded.height,
        reused: result.reused,
      });
    }
  } catch (stageError) {
    const newPaths = uploaded.filter((item) => !item.reused).map((item) => item.path);
    if (newPaths.length > 0) {
      const { error: removeError } = await client.storage.from(SITE_MEDIA_BUCKET).remove(newPaths);
      if (removeError) throw new AggregateError([stageError, removeError], "Staging failed and immutable-object rollback also failed");
    }
    throw stageError;
  }

  const result = {
    executionId: EXECUTION_ID,
    mediaVersion: MEDIA_VERSION,
    canonicalPathPolicy: "catalog/products/<product-code>-<slug>/<version>/",
    stagedAt: new Date().toISOString(),
    databaseMutated: false,
    responsiveWidths: RESPONSIVE_WIDTHS,
    sourceCount: sources.length,
    objectCount: uploaded.length,
    sources,
    objects: uploaded,
    rollback: uploaded
      .filter((item) => !item.reused)
      .map((item) => ({ bucket: item.bucket, path: item.path, checksumSha256: item.checksumSha256 })),
  };
  await writeFile(resolve(ARTIFACT_DIR, "stage-result.json"), `${JSON.stringify(result, null, 2)}\n`);
  await writeFile(resolve(ARTIFACT_DIR, "stage-result.sha256"), `${sha256(JSON.stringify(result))}  stage-result.json\n`);
  console.log(`Staged and verified ${uploaded.length} immutable objects from ${sources.length} owner sources; database mutation: false`);
}

await main();
