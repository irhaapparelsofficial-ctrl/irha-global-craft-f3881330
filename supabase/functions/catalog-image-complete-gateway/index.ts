import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.108.2";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "npm:jose@5.9.6";

const REPOSITORY = "irhaapparelsofficial-ctrl/irha-global-craft-f3881330";
const WORKFLOW_NAME = "Automatic AI Image Pipeline";
const WORKFLOW_FILE = ".github/workflows/automatic-ai-image-pipeline.yml";
const OIDC_ISSUER = "https://token.actions.githubusercontent.com";
const OIDC_AUDIENCE = "irha-image-pipeline";
const BUCKET = "site-media";
const CACHE_SECONDS = "31536000";
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const WIDTHS = [360, 720, 1200, 1600, 2400] as const;
const JWKS = createRemoteJWKSet(new URL(`${OIDC_ISSUER}/.well-known/jwks`));

const ROLE_SUFFIX: Record<string, string> = {
  hero: "front",
  three_quarter: "three-quarter-front",
  side: "side",
  rear_three_quarter: "three-quarter-rear",
  back: "back",
  macro: "detail",
  branding_detail: "branding-detail",
  packaging: "packaging",
  gallery: "view",
};

type Manifest = {
  sourceWidth?: number;
  sourceHeight?: number;
  masterWidth?: number;
  masterHeight?: number;
  qualityScore?: number;
};

type ServiceError = { message: string };
type UploadClient = {
  storage: {
    from: (bucket: string) => {
      upload: (
        path: string,
        file: File,
        options: { upsert: boolean; cacheControl: string; contentType: string },
      ) => Promise<{ error: ServiceError | null }>;
    };
  };
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const claims = await authenticateGitHub(req);
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return json({ error: "Multipart form data is required" }, 400);
    }

    const service = createClient(
      requiredEnv("SUPABASE_URL"),
      requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const uploadClient = service as unknown as UploadClient;

    const form = await req.formData();
    if (cleanText(form.get("action"), 40) !== "catalog_complete") {
      return json({ error: "Unsupported action" }, 400);
    }

    const id = uuidText(form.get("id"));
    const lockToken = uuidText(form.get("lock_token"));
    let manifest: Manifest;
    try {
      manifest = JSON.parse(String(form.get("manifest") || "{}")) as Manifest;
    } catch {
      return json({ error: "Invalid processing manifest" }, 400);
    }

    const master = await requiredWebp(form, "master");
    const variants = new Map<number, File>();
    for (const width of WIDTHS) {
      const variant = await requiredWebp(form, `variant_${width}`);
      variants.set(width, variant.file);
    }

    const { data: media, error: mediaError } = await service
      .from("media_assets")
      .select("id,ai_processing_status,ai_processing_lock_token")
      .eq("id", id)
      .eq("ai_processing_status", "processing")
      .eq("ai_processing_lock_token", lockToken)
      .maybeSingle();
    if (mediaError) throw new Error(mediaError.message);
    if (!media) return json({ error: "The image job lock is no longer valid" }, 409);

    const { data: driveFile, error: driveError } = await service
      .from("catalog_drive_files")
      .select("drive_file_id,product_drive_folder_id,source_name,role,role_index")
      .eq("media_asset_id", id)
      .maybeSingle();
    if (driveError) throw new Error(driveError.message);
    if (!driveFile) return json({ error: "The media asset is not linked to a Drive catalogue file" }, 422);

    const { data: folder, error: folderError } = await service
      .from("catalog_drive_folders")
      .select("drive_folder_id,reference_code,normalized_slug,product_id,folder_kind")
      .eq("drive_folder_id", driveFile.product_drive_folder_id)
      .eq("folder_kind", "product")
      .maybeSingle();
    if (folderError) throw new Error(folderError.message);
    if (!folder?.reference_code || !folder?.normalized_slug || !folder?.product_id) {
      return json({ error: "The Drive product folder is not fully mapped" }, 422);
    }

    const reference = safeReference(folder.reference_code);
    const productSlug = safeSlug(folder.normalized_slug);
    const role = cleanText(driveFile.role, 40);
    const suffix = ROLE_SUFFIX[role];
    if (!suffix) return json({ error: "Unsupported catalogue media role" }, 422);
    const roleIndex = Number(positiveInteger(driveFile.role_index, 1));
    const baseName = `${reference.toLowerCase()}-${productSlug}`;
    const indexedSuffix = roleIndex > 1 ? `${suffix}-${String(roleIndex).padStart(2, "0")}` : suffix;
    const fileName = `${baseName}-${indexedSuffix}.webp`;
    const objectPath = `catalog/products/${baseName}/${fileName}`;
    const thumbnailPath = `catalog/products/${baseName}/thumbnail/${fileName}`;
    const variantPaths = new Map<number, string>();
    for (const width of WIDTHS) {
      variantPaths.set(width, `catalog/products/${baseName}/responsive/${width}/${fileName}`);
    }

    await upload(uploadClient, objectPath, master.file);
    for (const width of WIDTHS) {
      await upload(uploadClient, variantPaths.get(width)!, variants.get(width)!);
    }
    await upload(uploadClient, thumbnailPath, variants.get(720)!);

    const checksum = await sha256(master.bytes);
    const publicUrl = service.storage.from(BUCKET).getPublicUrl(objectPath).data.publicUrl;
    const thumbnailUrl = service.storage.from(BUCKET).getPublicUrl(thumbnailPath).data.publicUrl;
    const totalVariantBytes = Array.from(variants.values()).reduce((sum, file) => sum + file.size, 0);
    const masterWidth = Number(positiveInteger(manifest.masterWidth, 0));
    const masterHeight = Number(positiveInteger(manifest.masterHeight, 0));
    if (masterWidth < 100 || masterHeight < 100) return json({ error: "Invalid master dimensions" }, 422);
    const thumbnailWidth = Math.min(720, masterWidth);
    const thumbnailHeight = Math.max(1, Math.round(masterHeight * (thumbnailWidth / masterWidth)));

    const now = new Date().toISOString();
    const { error: updateMediaError } = await service
      .from("media_assets")
      .update({
        bucket: BUCKET,
        object_path: objectPath,
        public_url: publicUrl,
        file_name: fileName,
        mime_type: "image/webp",
        size_bytes: master.file.size,
        width_px: masterWidth,
        height_px: masterHeight,
        checksum_sha256: checksum,
        verification_status: "verified",
        status: "active",
        ai_processing_status: "ready",
        ai_processing_error: null,
        ai_processing_locked_at: null,
        ai_processing_lock_token: null,
        ai_processing_worker: `github-actions:${claims.actor}`,
        ai_master_bucket: BUCKET,
        ai_master_object_path: objectPath,
        ai_master_url: publicUrl,
        ai_background_style: "source_preserved",
        ai_background_normalized: false,
        ai_enhanced: false,
        ai_upscaled: false,
        ai_quality_score: Math.max(0, Math.min(100, Number(manifest.qualityScore ?? 95))),
        ai_review_reason: null,
        ai_source_width_px: positiveInteger(manifest.sourceWidth, null),
        ai_source_height_px: positiveInteger(manifest.sourceHeight, null),
        ai_master_width_px: masterWidth,
        ai_master_height_px: masterHeight,
        ai_processed_at: now,
        thumbnail_bucket: BUCKET,
        thumbnail_object_path: thumbnailPath,
        thumbnail_url: thumbnailUrl,
        thumbnail_width_px: thumbnailWidth,
        thumbnail_height_px: thumbnailHeight,
        thumbnail_size_bytes: variants.get(720)!.size,
        thumbnail_generated_at: now,
        responsive_widths: [...WIDTHS],
        responsive_format: "image/webp",
        responsive_total_size_bytes: totalVariantBytes,
        responsive_generated_at: now,
        responsive_attempted_at: now,
        responsive_error: null,
        updated_at: now,
      })
      .eq("id", id)
      .eq("ai_processing_status", "processing")
      .eq("ai_processing_lock_token", lockToken);
    if (updateMediaError) throw new Error(updateMediaError.message);

    const { error: updateDriveError } = await service
      .from("catalog_drive_files")
      .update({
        web_bucket: BUCKET,
        web_object_path: objectPath,
        public_url: publicUrl,
        media_asset_id: id,
        checksum_sha256: checksum,
        mime_type: "image/webp",
        size_bytes: master.file.size,
        width_px: masterWidth,
        height_px: masterHeight,
        import_status: "mapped",
        last_error: null,
        imported_at: now,
        updated_at: now,
      })
      .eq("drive_file_id", driveFile.drive_file_id);
    if (updateDriveError) throw new Error(updateDriveError.message);

    const { data: refreshed, error: refreshError } = await service.rpc("refresh_drive_product_gallery", {
      _product_id: folder.product_id,
    });
    if (refreshError) throw new Error(refreshError.message);

    return json({
      ok: true,
      id,
      drive_file_id: driveFile.drive_file_id,
      reference_code: reference,
      role,
      status: "ready",
      public_url: publicUrl,
      object_path: objectPath,
      gallery: refreshed,
      actor: claims.actor,
    });
  } catch (error) {
    console.error("catalog-image-complete-gateway", safeError(error));
    const message = error instanceof Error ? error.message : "Catalogue image completion failed";
    const status = /authorization|token|claim|repository|workflow|ref/i.test(message) ? 401 : 500;
    return json({ error: message }, status);
  }
});

async function authenticateGitHub(req: Request) {
  const header = req.headers.get("authorization") || "";
  const token = header.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new Error("Authorization token is required");

  const { payload } = await jwtVerify(token, JWKS, {
    issuer: OIDC_ISSUER,
    audience: OIDC_AUDIENCE,
  });
  const repository = claim(payload, "repository");
  const ref = claim(payload, "ref");
  const workflow = claim(payload, "workflow");
  const workflowRef = claim(payload, "workflow_ref");
  const actor = claim(payload, "actor");

  if (repository !== REPOSITORY) throw new Error("Repository claim is not allowed");
  if (ref !== "refs/heads/main") throw new Error("Only the protected main ref may process production images");
  if (workflow !== WORKFLOW_NAME && !workflowRef.includes(WORKFLOW_FILE)) {
    throw new Error("Workflow claim is not allowed");
  }
  return { repository, ref, workflow, workflowRef, actor };
}

function claim(payload: JWTPayload, key: string): string {
  const value = payload[key];
  if (typeof value !== "string" || !value.trim()) throw new Error(`Required OIDC claim is missing: ${key}`);
  return value;
}

async function requiredWebp(form: FormData, key: string): Promise<{ file: File; bytes: Uint8Array }> {
  const value = form.get(key);
  if (!(value instanceof File)) throw new Error(`Missing file: ${key}`);
  if (value.size < 24 || value.size > MAX_FILE_BYTES) throw new Error(`Invalid file size: ${key}`);
  const bytes = new Uint8Array(await value.arrayBuffer());
  const valid = bytes.length > 12 &&
    bytes[0] === 82 && bytes[1] === 73 && bytes[2] === 70 && bytes[3] === 70 &&
    bytes[8] === 87 && bytes[9] === 69 && bytes[10] === 66 && bytes[11] === 80;
  if (!valid) throw new Error(`Invalid WebP signature: ${key}`);
  return { file: value, bytes };
}

async function upload(service: UploadClient, path: string, file: File) {
  const { error } = await service.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    cacheControl: CACHE_SECONDS,
    contentType: "image/webp",
  });
  if (error) throw new Error(`Could not upload ${path}: ${error.message}`);
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const buffer = bytes.slice().buffer as ArrayBuffer;
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", buffer));
  return Array.from(digest).map((value) => value.toString(16).padStart(2, "0")).join("");
}

function safeReference(value: unknown): string {
  const text = cleanText(value, 16).toUpperCase();
  if (!/^P\d{3}$/.test(text)) throw new Error("Invalid product reference code");
  return text;
}

function safeSlug(value: unknown): string {
  const text = cleanText(value, 140).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!text) throw new Error("Invalid product slug");
  return text;
}

function uuidText(value: unknown): string {
  const text = cleanText(value, 64);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)) {
    throw new Error("Invalid UUID");
  }
  return text;
}

function positiveInteger(value: unknown, fallback: number | null): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
}

function cleanText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing server environment: ${name}`);
  return value;
}

function safeError(error: unknown) {
  return error instanceof Error ? { name: error.name, message: error.message } : { message: String(error) };
}
