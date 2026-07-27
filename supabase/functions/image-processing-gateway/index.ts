import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.108.2";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "npm:jose@5.9.6";

const REPOSITORY = "irhaapparelsofficial-ctrl/irha-global-craft-f3881330";
const WORKFLOW_NAME = "Automatic AI Image Pipeline";
const WORKFLOW_FILE = ".github/workflows/automatic-ai-image-pipeline.yml";
const OIDC_ISSUER = "https://token.actions.githubusercontent.com";
const OIDC_AUDIENCE = "irha-image-pipeline";
const MAX_FILE_BYTES = 16 * 1024 * 1024;
const CACHE_SECONDS = "31536000";
const WIDTHS = [360, 720, 1200, 1600] as const;
const JWKS = createRemoteJWKSet(new URL(`${OIDC_ISSUER}/.well-known/jwks`));

type ServiceError = { message: string };
type ServiceClient = {
  rpc: (
    functionName: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: ServiceError | null }>;
  storage: {
    from: (bucket: string) => {
      upload: (
        path: string,
        file: File,
        options?: Record<string, unknown>,
      ) => Promise<{ error: ServiceError | null }>;
      getPublicUrl: (path: string) => { data: { publicUrl: string } };
    };
  };
};

type Manifest = {
  status?: "ready" | "review_required";
  backgroundStyle?: string;
  backgroundHex?: string;
  enhanced?: boolean;
  upscaled?: boolean;
  qualityScore?: number;
  reviewReason?: string | null;
  sourceWidth?: number;
  sourceHeight?: number;
  masterWidth?: number;
  masterHeight?: number;
};

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const claims = await authenticateGitHub(req);
    const service = createClient(
      requiredEnv("SUPABASE_URL"),
      requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false, autoRefreshToken: false } },
    ) as unknown as ServiceClient;

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      return await completeJob(req, service, claims);
    }

    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const action = cleanText(body.action, 40) || "claim";
    if (action === "claim") return await claimJobs(body, service, claims);
    if (action === "fail") return await failJob(body, service, claims);
    if (action === "health") {
      return json({
        ok: true,
        repository: REPOSITORY,
        workflow: WORKFLOW_NAME,
        ref: claims.ref,
        actor: claims.actor,
      });
    }
    return json({ error: "Unsupported action" }, 400);
  } catch (error) {
    console.error("image-processing-gateway", safeError(error));
    const message = error instanceof Error ? error.message : "Unauthorized request";
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

async function claimJobs(body: Record<string, unknown>, service: ServiceClient, claims: { actor: string }) {
  const requested = Number(body.limit ?? 2);
  const limit = Number.isFinite(requested) ? Math.max(1, Math.min(3, Math.floor(requested))) : 2;
  const worker = `github-actions:${cleanText(body.run_id, 80) || "unknown"}:${claims.actor}`;
  const { data, error } = await service.rpc("claim_ai_image_processing_jobs", {
    _limit: limit,
    _worker: worker,
  });
  if (error) return json({ error: error.message }, 422);
  const jobs = Array.isArray(data) ? data : [];
  return json({ ok: true, jobs, count: jobs.length });
}

async function failJob(body: Record<string, unknown>, service: ServiceClient, claims: { actor: string }) {
  const id = uuidText(body.id);
  const lockToken = uuidText(body.lock_token);
  const message = cleanText(body.message, 1800) || "Image processor reported a failure";
  const reviewRequired = body.review_required === true;
  const { data, error } = await service.rpc("fail_ai_image_processing_job", {
    _id: id,
    _lock_token: lockToken,
    _message: `${message} [actor:${claims.actor}]`,
    _review_required: reviewRequired,
  });
  if (error) return json({ error: error.message }, 422);
  if (!data) return json({ error: "The image job lock is no longer valid" }, 409);
  return json({ ok: true, id, status: reviewRequired ? "review_required" : "failed" });
}

async function completeJob(
  req: Request,
  service: ServiceClient,
  claims: { actor: string; workflowRef: string },
) {
  const form = await req.formData();
  const action = cleanText(form.get("action"), 40);
  if (action !== "complete") return json({ error: "Multipart action must be complete" }, 400);

  const id = uuidText(form.get("id"));
  const lockToken = uuidText(form.get("lock_token"));
  const objectPath = safeObjectPath(form.get("object_path"));
  const bucket = cleanText(form.get("bucket"), 80) || "site-media";
  if (bucket !== "site-media") return json({ error: "Only the site-media bucket is supported" }, 400);

  let manifest: Manifest;
  try {
    manifest = JSON.parse(String(form.get("manifest") || "{}")) as Manifest;
  } catch {
    return json({ error: "Invalid processing manifest" }, 400);
  }

  const published = manifest.status === "ready";
  const prefix = published
    ? ""
    : `ai-review/${id}/${lockToken}/`;
  const masterPath = published
    ? `ai-master/${objectPath}.webp`
    : `${prefix}master.webp`;
  const variantPaths = new Map<number, string>();
  for (const width of WIDTHS) {
    const path = published
      ? width === 720
        ? `thumbnails/${objectPath}.webp`
        : `responsive/${width}/${objectPath}.webp`
      : `${prefix}${width}.webp`;
    variantPaths.set(width, path);
  }

  const master = requiredWebp(form, "master");
  const variants = new Map<number, File>();
  for (const width of WIDTHS) variants.set(width, requiredWebp(form, `variant_${width}`));
  const totalBytes = Array.from(variants.values()).reduce((sum, file) => sum + file.size, 0);

  await upload(service, bucket, masterPath, master);
  for (const width of WIDTHS) {
    await upload(service, bucket, variantPaths.get(width)!, variants.get(width)!);
  }

  const masterUrl = service.storage.from(bucket).getPublicUrl(masterPath).data.publicUrl;
  const thumbnailPath = variantPaths.get(720)!;
  const thumbnailUrl = service.storage.from(bucket).getPublicUrl(thumbnailPath).data.publicUrl;
  const thumbnail = variants.get(720)!;

  const { data, error } = await service.rpc("complete_ai_image_processing_job", {
    _id: id,
    _lock_token: lockToken,
    _published: published,
    _master_bucket: bucket,
    _master_object_path: masterPath,
    _master_url: masterUrl,
    _responsive_widths: [...WIDTHS],
    _responsive_total_size_bytes: totalBytes,
    _thumbnail_object_path: thumbnailPath,
    _thumbnail_url: thumbnailUrl,
    _thumbnail_width_px: integer(manifest.masterWidth, 2400) >= 720 ? 720 : integer(manifest.masterWidth, 720),
    _thumbnail_height_px: Math.max(1, Math.round(integer(manifest.masterHeight, 3000) * (720 / integer(manifest.masterWidth, 2400)))),
    _thumbnail_size_bytes: thumbnail.size,
    _background_style: cleanText(manifest.backgroundStyle, 80) || "charcoal_studio_v1",
    _background_hex: cleanText(manifest.backgroundHex, 16) || "#101722",
    _enhanced: manifest.enhanced === true,
    _upscaled: manifest.upscaled === true,
    _quality_score: decimal(manifest.qualityScore, 0),
    _review_reason: cleanText(manifest.reviewReason, 1200) || null,
    _source_width_px: integer(manifest.sourceWidth, 0) || null,
    _source_height_px: integer(manifest.sourceHeight, 0) || null,
    _master_width_px: integer(manifest.masterWidth, 2400),
    _master_height_px: integer(manifest.masterHeight, 3000),
  });

  if (error) return json({ error: error.message, uploaded: true }, 422);
  if (!data) return json({ error: "The image job lock expired before completion", uploaded: true }, 409);

  return json({
    ok: true,
    id,
    status: published ? "ready" : "review_required",
    published,
    master_url: masterUrl,
    responsive_widths: WIDTHS,
    total_bytes: totalBytes,
    actor: claims.actor,
    workflow_ref: claims.workflowRef,
  });
}

async function upload(service: ServiceClient, bucket: string, path: string, file: File) {
  const { error } = await service.storage.from(bucket).upload(path, file, {
    upsert: true,
    cacheControl: CACHE_SECONDS,
    contentType: "image/webp",
  });
  if (error) throw new Error(`Could not upload ${path}: ${error.message}`);
}

function requiredWebp(form: FormData, key: string): File {
  const value = form.get(key);
  if (!(value instanceof File)) throw new Error(`Missing file: ${key}`);
  if (value.size < 24 || value.size > MAX_FILE_BYTES) throw new Error(`Invalid file size: ${key}`);
  return value;
}

function safeObjectPath(value: unknown): string {
  const path = cleanText(value, 900).replace(/^\/+/, "");
  if (!path || path.includes("..") || !/^[a-zA-Z0-9._/-]+$/.test(path)) throw new Error("Invalid object path");
  if (/^(?:responsive|thumbnails|ai-master|ai-review)\//i.test(path)) throw new Error("Generated paths cannot be processed as originals");
  return path;
}

function uuidText(value: unknown): string {
  const text = cleanText(value, 64);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)) {
    throw new Error("Invalid UUID");
  }
  return text;
}

function cleanText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function integer(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : fallback;
}

function decimal(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : fallback;
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing server environment: ${name}`);
  return value;
}

function safeError(error: unknown) {
  return error instanceof Error ? { name: error.name, message: error.message } : { message: String(error) };
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
