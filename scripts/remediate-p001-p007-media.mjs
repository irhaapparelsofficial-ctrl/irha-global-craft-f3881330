import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import {
  EXECUTION_ID,
  MEDIA_VERSION,
  PRODUCTS,
  REJECTED_CANDIDATES,
  RESPONSIVE_WIDTHS,
  SITE_MEDIA_BUCKET,
} from "../ops/ia-media-e001/media-plan.mjs";

const PROJECT_REF = "pvzjiozismyxqrzmtfbi";
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;
const SITE_ORIGIN = "https://irhaapparels.com";
const ARTIFACT_DIR = resolve("artifacts/ia-media-e001");
const MODE = process.env.IA_MEDIA_MODE ?? "plan";
const APPLY_CONFIRMATION = "APPLY_IA_MEDIA_E001";

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
};

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const publicUrl = (path) => `${SUPABASE_URL}/storage/v1/object/public/${SITE_MEDIA_BUCKET}/${path}`;
const sqlLiteral = (value) => `'${String(value).replaceAll("'", "''")}'`;
const jsonbLiteral = (value) => `${sqlLiteral(JSON.stringify(value))}::jsonb`;
const targetOriginalPath = (product, image) =>
  `catalog/recovery/${MEDIA_VERSION}/${product.slug}/${String(image.displayOrder).padStart(2, "0")}-${image.role}-${image.driveFileId}.webp`;
const variantPath = (originalPath, width) => width === 720
  ? `thumbnails/${originalPath}.webp`
  : `responsive/${width}/${originalPath}.webp`;

async function managementRequest(path, options = {}) {
  const token = required("SUPABASE_ACCESS_TOKEN");
  const response = await fetch(`https://api.supabase.com${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(options.headers ?? {}),
    },
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

async function runSql(query) {
  return managementRequest(`/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    body: JSON.stringify({ query, read_only: false }),
  });
}

async function downloadOrThrow(client, bucket, path) {
  const { data, error } = await client.storage.from(bucket).download(path);
  if (error || !data) throw new Error(`Storage download failed for ${bucket}/${path}: ${error?.message ?? "missing data"}`);
  return Buffer.from(await data.arrayBuffer());
}

async function uploadImmutable(client, path, buffer) {
  const expectedHash = sha256(buffer);
  const { error } = await client.storage.from(SITE_MEDIA_BUCKET).upload(path, buffer, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) {
    if (!/already exists|duplicate/i.test(error.message)) throw error;
    const existing = await downloadOrThrow(client, SITE_MEDIA_BUCKET, path);
    if (sha256(existing) !== expectedHash) {
      throw new Error(`Immutable target collision at ${path}`);
    }
    return { reused: true, checksumSha256: expectedHash, sizeBytes: existing.length };
  }
  return { reused: false, checksumSha256: expectedHash, sizeBytes: buffer.length };
}

async function verifyWebp(client, path, expectedWidth, expectedChecksum) {
  const buffer = await downloadOrThrow(client, SITE_MEDIA_BUCKET, path);
  const metadata = await sharp(buffer, { failOn: "error" }).metadata();
  if (metadata.format !== "webp") throw new Error(`${path} decoded as ${metadata.format}, expected webp`);
  if (metadata.width !== expectedWidth) throw new Error(`${path} width ${metadata.width}, expected ${expectedWidth}`);
  if (sha256(buffer) !== expectedChecksum) throw new Error(`${path} checksum mismatch after upload`);
  return { width: metadata.width, height: metadata.height, sizeBytes: buffer.length };
}

async function prepareMedia(client, catalogById) {
  const resolvedProducts = [];
  const generatedObjects = [];

  for (const product of PRODUCTS) {
    const resolvedImages = [];
    for (const planned of product.images) {
      const source = catalogById.get(planned.driveFileId);
      if (!source) throw new Error(`Missing catalog provenance row for ${planned.driveFileId}`);
      if (source.product_drive_folder_id !== product.driveFolderId) {
        throw new Error(`${planned.driveFileId} belongs to unexpected Drive folder`);
      }
      const sourceBuffer = await downloadOrThrow(client, source.original_bucket, source.original_object_path);
      const actualSourceChecksum = sha256(sourceBuffer);
      if (actualSourceChecksum !== source.checksum_sha256) {
        throw new Error(`Original checksum mismatch for ${planned.driveFileId}`);
      }

      const sourceMetadata = await sharp(sourceBuffer, { failOn: "error" }).metadata();
      if (!sourceMetadata.width || !sourceMetadata.height) {
        throw new Error(`Could not decode source dimensions for ${planned.driveFileId}`);
      }

      const canonical = await sharp(sourceBuffer, { failOn: "error" })
        .rotate()
        .webp({ quality: 92, effort: 6, smartSubsample: true })
        .toBuffer({ resolveWithObject: true });
      const originalPath = targetOriginalPath(product, planned);
      const derivatives = [];

      for (const width of RESPONSIVE_WIDTHS) {
        const output = await sharp(sourceBuffer, { failOn: "error" })
          .rotate()
          .resize({ width, fit: "inside", withoutEnlargement: false, kernel: sharp.kernel.lanczos3 })
          .webp({ quality: width >= 1600 ? 90 : width >= 1200 ? 88 : width >= 720 ? 86 : 82, effort: 6, smartSubsample: true })
          .toBuffer({ resolveWithObject: true });
        if (output.info.width !== width) throw new Error(`Generated ${planned.driveFileId} ${width}px variant at ${output.info.width}px`);
        const path = variantPath(originalPath, width);
        derivatives.push({
          width,
          height: output.info.height,
          path,
          mimeType: "image/webp",
          sizeBytes: output.data.length,
          checksumSha256: sha256(output.data),
          upscaled: sourceMetadata.width < width,
        });
        generatedObjects.push({ path, buffer: output.data, expectedWidth: width });
      }

      const canonicalRecord = {
        path: originalPath,
        mimeType: "image/webp",
        width: canonical.info.width,
        height: canonical.info.height,
        sizeBytes: canonical.data.length,
        checksumSha256: sha256(canonical.data),
      };
      generatedObjects.push({ path: originalPath, buffer: canonical.data, expectedWidth: canonical.info.width });

      resolvedImages.push({
        productSku: product.sku,
        productSlug: product.slug,
        productName: product.name,
        sourceDriveFileId: source.drive_file_id,
        sourceDrivePath: `${product.driveFolderId}/${source.source_name}`,
        sourceDriveFolderId: product.driveFolderId,
        originalFilename: source.source_name,
        originalMimeType: source.source_mime_type,
        originalDimensions: { width: sourceMetadata.width, height: sourceMetadata.height },
        originalSizeBytes: sourceBuffer.length,
        sourceChecksumSha256: actualSourceChecksum,
        assignedGalleryRole: planned.role,
        roleIndex: planned.roleIndex,
        selectedDisplayOrder: planned.displayOrder,
        visualIdentificationReasons: planned.visualIdentificationReasons,
        confidence: planned.confidence,
        sourceOriginalStorage: {
          bucket: source.original_bucket,
          path: source.original_object_path,
        },
        destinationStorage: {
          bucket: SITE_MEDIA_BUCKET,
          canonical: canonicalRecord,
          derivatives,
          publicUrl: publicUrl(originalPath),
        },
      });
    }
    resolvedProducts.push({ ...product, images: resolvedImages });
  }
  return { resolvedProducts, generatedObjects };
}

function buildMutationSql(productUpdates, fileUpdates) {
  const selectedIds = fileUpdates.map((row) => row.drive_file_id);
  return `
BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.products
    WHERE slug IN (${PRODUCTS.map((product) => sqlLiteral(product.slug)).join(", ")})
      AND is_published IS TRUE
    GROUP BY slug
    HAVING count(*) <> 1
  ) THEN
    RAISE EXCEPTION 'Published product uniqueness changed before IA-MEDIA-E001 mutation';
  END IF;
END $$;

WITH selected AS (
  SELECT drive_file_id, row_number() OVER (ORDER BY drive_file_id) AS sequence
  FROM public.catalog_drive_files
  WHERE drive_file_id IN (${selectedIds.map(sqlLiteral).join(", ")})
)
UPDATE public.catalog_drive_files AS target
SET role = 'gallery'::public.slot_media_role,
    role_index = 1000 + selected.sequence,
    published_in_gallery = false,
    updated_at = now()
FROM selected
WHERE target.drive_file_id = selected.drive_file_id;

WITH payload AS (
  SELECT *
  FROM jsonb_to_recordset(${jsonbLiteral(fileUpdates)}) AS item(
    drive_file_id text,
    role text,
    role_index integer,
    web_object_path text,
    public_url text,
    size_bytes bigint,
    width_px integer,
    height_px integer,
    published_in_gallery boolean
  )
)
UPDATE public.catalog_drive_files AS target
SET role = payload.role::public.slot_media_role,
    role_index = payload.role_index,
    web_bucket = ${sqlLiteral(SITE_MEDIA_BUCKET)},
    web_object_path = payload.web_object_path,
    public_url = payload.public_url,
    import_status = 'mapped',
    last_error = NULL,
    imported_at = now(),
    updated_at = now(),
    angle_classification_source = 'visual_review',
    angle_confidence = 'high',
    visual_review_status = 'verified',
    mime_type = 'image/webp',
    size_bytes = payload.size_bytes,
    width_px = payload.width_px,
    height_px = payload.height_px,
    published_in_gallery = payload.published_in_gallery
FROM payload
WHERE target.drive_file_id = payload.drive_file_id;

UPDATE public.catalog_drive_files
SET published_in_gallery = false,
    visual_review_status = 'rejected',
    angle_classification_source = 'visual_review',
    angle_confidence = 'high',
    updated_at = now()
WHERE drive_file_id = '1N2HfKQMsBuAQSUMjJXuKVLjPlfUAdSG3';

WITH payload AS (
  SELECT *
  FROM jsonb_to_recordset(${jsonbLiteral(productUpdates)}) AS item(
    id uuid,
    image_url text,
    gallery jsonb
  )
)
UPDATE public.products AS target
SET image_url = payload.image_url,
    gallery = ARRAY(SELECT jsonb_array_elements_text(payload.gallery)),
    updated_at = now()
FROM payload
WHERE target.id = payload.id
  AND target.is_published IS TRUE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.products
    WHERE slug IN (${PRODUCTS.map((product) => sqlLiteral(product.slug)).join(", ")})
      AND is_published IS TRUE
    GROUP BY slug
    HAVING count(*) <> 1
  ) THEN
    RAISE EXCEPTION 'Published product uniqueness failed after IA-MEDIA-E001 mutation';
  END IF;
END $$;

COMMIT;`;
}

function buildRollbackSql(rollback) {
  const productRows = rollback.products.map((row) => ({
    id: row.id,
    image_url: row.image_url,
    gallery: row.gallery ?? [],
    updated_at: row.updated_at,
  }));
  const fileRows = rollback.catalogFiles.map((row) => ({
    drive_file_id: row.drive_file_id,
    role: row.role,
    role_index: row.role_index,
    web_bucket: row.web_bucket,
    web_object_path: row.web_object_path,
    public_url: row.public_url,
    import_status: row.import_status,
    last_error: row.last_error,
    imported_at: row.imported_at,
    updated_at: row.updated_at,
    angle_classification_source: row.angle_classification_source,
    angle_confidence: row.angle_confidence,
    visual_review_status: row.visual_review_status,
    mime_type: row.mime_type,
    size_bytes: row.size_bytes,
    width_px: row.width_px,
    height_px: row.height_px,
    published_in_gallery: row.published_in_gallery,
  }));
  return `
BEGIN;
WITH selected AS (
  SELECT drive_file_id, row_number() OVER (ORDER BY drive_file_id) AS sequence
  FROM public.catalog_drive_files
  WHERE drive_file_id IN (${fileRows.map((row) => sqlLiteral(row.drive_file_id)).join(", ")})
)
UPDATE public.catalog_drive_files AS target
SET role = 'gallery'::public.slot_media_role,
    role_index = 5000 + selected.sequence,
    published_in_gallery = false
FROM selected
WHERE target.drive_file_id = selected.drive_file_id;

WITH payload AS (
  SELECT * FROM jsonb_to_recordset(${jsonbLiteral(fileRows)}) AS item(
    drive_file_id text, role text, role_index integer, web_bucket text,
    web_object_path text, public_url text, import_status text, last_error text,
    imported_at timestamptz, updated_at timestamptz, angle_classification_source text,
    angle_confidence text, visual_review_status text, mime_type text, size_bytes bigint,
    width_px integer, height_px integer, published_in_gallery boolean
  )
)
UPDATE public.catalog_drive_files AS target
SET role = payload.role::public.slot_media_role,
    role_index = payload.role_index,
    web_bucket = payload.web_bucket,
    web_object_path = payload.web_object_path,
    public_url = payload.public_url,
    import_status = payload.import_status,
    last_error = payload.last_error,
    imported_at = payload.imported_at,
    updated_at = payload.updated_at,
    angle_classification_source = payload.angle_classification_source,
    angle_confidence = payload.angle_confidence,
    visual_review_status = payload.visual_review_status,
    mime_type = payload.mime_type,
    size_bytes = payload.size_bytes,
    width_px = payload.width_px,
    height_px = payload.height_px,
    published_in_gallery = payload.published_in_gallery
FROM payload
WHERE target.drive_file_id = payload.drive_file_id;

WITH payload AS (
  SELECT * FROM jsonb_to_recordset(${jsonbLiteral(productRows)}) AS item(
    id uuid, image_url text, gallery jsonb, updated_at timestamptz
  )
)
UPDATE public.products AS target
SET image_url = payload.image_url,
    gallery = ARRAY(SELECT jsonb_array_elements_text(payload.gallery)),
    updated_at = payload.updated_at
FROM payload
WHERE target.id = payload.id;
COMMIT;`;
}

async function main() {
  if (!new Set(["plan", "apply", "verify"]).has(MODE)) throw new Error(`Unsupported IA_MEDIA_MODE: ${MODE}`);
  if (MODE === "apply" && process.env.IA_MEDIA_CONFIRM !== APPLY_CONFIRMATION) {
    throw new Error(`Apply mode requires IA_MEDIA_CONFIRM=${APPLY_CONFIRMATION}`);
  }
  await mkdir(ARTIFACT_DIR, { recursive: true });

  const serviceKey = await elevatedProjectKey();
  const client = createClient(SUPABASE_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-irha-execution": EXECUTION_ID } },
  });
  const selectedIds = PRODUCTS.flatMap((product) => product.images.map((image) => image.driveFileId));

  const { data: productRows, error: productError } = await client
    .from("products")
    .select("id,reference_code,sku,slug,name,image_url,gallery,is_published,publish_state,updated_at")
    .in("slug", PRODUCTS.map((product) => product.slug));
  if (productError) throw productError;
  const publishedRows = productRows.filter((row) => row.is_published);
  for (const product of PRODUCTS) {
    const matches = publishedRows.filter((row) => row.slug === product.slug);
    if (matches.length !== 1) throw new Error(`${product.slug} has ${matches.length} published rows`);
  }

  const { data: catalogRows, error: catalogError } = await client
    .from("catalog_drive_files")
    .select("*")
    .in("drive_file_id", [...selectedIds, "1N2HfKQMsBuAQSUMjJXuKVLjPlfUAdSG3"]);
  if (catalogError) throw catalogError;
  const catalogById = new Map(catalogRows.map((row) => [row.drive_file_id, row]));
  const rollback = {
    executionId: EXECUTION_ID,
    capturedAt: new Date().toISOString(),
    products: productRows,
    catalogFiles: catalogRows,
    removalOnRollback: [],
  };
  await writeFile(resolve(ARTIFACT_DIR, "rollback-manifest.json"), `${JSON.stringify(rollback, null, 2)}\n`);

  const { resolvedProducts, generatedObjects } = await prepareMedia(client, catalogById);
  const resolvedManifest = {
    executionId: EXECUTION_ID,
    mediaVersion: MEDIA_VERSION,
    generatedAt: new Date().toISOString(),
    sourcePolicy: "Owner Drive originals downloaded from the preserved catalog-originals bucket and SHA-256 verified before processing.",
    products: resolvedProducts,
    rejectedCandidates: REJECTED_CANDIDATES,
  };
  await writeFile(resolve(ARTIFACT_DIR, "remediation-manifest.resolved.json"), `${JSON.stringify(resolvedManifest, null, 2)}\n`);
  await writeFile(resolve(ARTIFACT_DIR, "remediation-manifest.sha256"), `${sha256(JSON.stringify(resolvedManifest))}  remediation-manifest.resolved.json\n`);

  if (MODE === "plan") {
    console.log(`Prepared and checksum-verified ${generatedObjects.length} objects without production mutation`);
    return;
  }

  if (MODE === "verify") {
    for (const product of resolvedProducts) {
      for (const image of product.images) {
        const canonical = image.destinationStorage.canonical;
        await verifyWebp(client, canonical.path, canonical.width, canonical.checksumSha256);
        for (const derivative of image.destinationStorage.derivatives) {
          await verifyWebp(client, derivative.path, derivative.width, derivative.checksumSha256);
        }
      }
    }
    console.log("All immutable IA-MEDIA-E001 objects decode and match their manifest checksums");
    return;
  }

  const uploadedPaths = [];
  let databaseMutated = false;
  try {
    for (const object of generatedObjects) {
      const result = await uploadImmutable(client, object.path, object.buffer);
      uploadedPaths.push({ path: object.path, ...result });
      await verifyWebp(client, object.path, object.expectedWidth, result.checksumSha256);
    }
    rollback.removalOnRollback = uploadedPaths.map(({ path, checksumSha256 }) => ({
      bucket: SITE_MEDIA_BUCKET,
      path,
      checksumSha256,
    }));
    await writeFile(resolve(ARTIFACT_DIR, "rollback-manifest.json"), `${JSON.stringify(rollback, null, 2)}\n`);

    const fileUpdates = resolvedProducts.flatMap((product) => product.images.map((image) => ({
      drive_file_id: image.sourceDriveFileId,
      role: image.assignedGalleryRole,
      role_index: image.roleIndex,
      web_object_path: image.destinationStorage.canonical.path,
      public_url: image.destinationStorage.publicUrl,
      size_bytes: image.destinationStorage.canonical.sizeBytes,
      width_px: image.destinationStorage.canonical.width,
      height_px: image.destinationStorage.canonical.height,
      published_in_gallery: true,
    })));
    const productUpdates = resolvedProducts.map((product) => {
      const row = publishedRows.find((candidate) => candidate.slug === product.slug);
      const gallery = [...product.images]
        .sort((a, b) => a.selectedDisplayOrder - b.selectedDisplayOrder)
        .map((image) => image.destinationStorage.publicUrl);
      return { id: row.id, image_url: gallery[0], gallery };
    });
    await runSql(buildMutationSql(productUpdates, fileUpdates));
    databaseMutated = true;

    const { data: verifiedProducts, error: verifyProductError } = await client
      .from("products")
      .select("id,slug,image_url,gallery,is_published")
      .in("slug", PRODUCTS.map((product) => product.slug));
    if (verifyProductError) throw verifyProductError;
    for (const product of resolvedProducts) {
      const rows = verifiedProducts.filter((row) => row.slug === product.slug && row.is_published);
      if (rows.length !== 1) throw new Error(`${product.slug} failed exact published-row verification`);
      const expectedGallery = product.images
        .sort((a, b) => a.selectedDisplayOrder - b.selectedDisplayOrder)
        .map((image) => image.destinationStorage.publicUrl);
      if (JSON.stringify(rows[0].gallery) !== JSON.stringify(expectedGallery)) {
        throw new Error(`${product.slug} gallery differs from resolved manifest`);
      }
      if (rows[0].image_url !== expectedGallery[0]) throw new Error(`${product.slug} hero differs from resolved manifest`);
    }

    const { data: verifiedFiles, error: verifyFilesError } = await client
      .from("catalog_drive_files")
      .select("drive_file_id,role,role_index,web_object_path,public_url,published_in_gallery,visual_review_status,angle_classification_source")
      .in("drive_file_id", selectedIds);
    if (verifyFilesError) throw verifyFilesError;
    if (verifiedFiles.length !== selectedIds.length) throw new Error("Catalog provenance row count changed after mutation");
    if (verifiedFiles.some((row) => !row.published_in_gallery || row.visual_review_status !== "verified" || row.angle_classification_source !== "visual_review")) {
      throw new Error("Catalog provenance post-verification failed");
    }

    await writeFile(resolve(ARTIFACT_DIR, "apply-result.json"), `${JSON.stringify({
      executionId: EXECUTION_ID,
      appliedAt: new Date().toISOString(),
      storageObjects: uploadedPaths,
      productUpdates,
      fileUpdates,
      databaseMutated,
    }, null, 2)}\n`);
    console.log(`Applied ${uploadedPaths.length} immutable objects and ${productUpdates.length} product mappings`);
  } catch (error) {
    if (databaseMutated) {
      try {
        await runSql(buildRollbackSql(rollback));
      } catch (rollbackError) {
        throw new AggregateError([error, rollbackError], "IA-MEDIA-E001 failed and database rollback also failed");
      }
    }
    const newPaths = uploadedPaths.filter((item) => !item.reused).map((item) => item.path);
    if (newPaths.length > 0) {
      const { error: removeError } = await client.storage.from(SITE_MEDIA_BUCKET).remove(newPaths);
      if (removeError) throw new AggregateError([error, removeError], "IA-MEDIA-E001 failed and Storage rollback also failed");
    }
    throw error;
  }
}

await main();
