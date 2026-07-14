import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const BUCKET = "crm-private-files";
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
const ALLOWED_STATUS = new Set(["pending_upload", "uploaded", "staged", "failed", "archived"]);

type JsonRecord = Record<string, unknown>;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!url || !anonKey || !serviceKey) return json({ error: "Supabase runtime is not configured" }, 500);

    const authorization = request.headers.get("Authorization") || "";
    const auth = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: userResult } = await auth.auth.getUser();
    const user = userResult.user;
    if (!user) return json({ error: "Unauthorized" }, 401);
    const { data: role } = await auth.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!role) return json({ error: "Admin only" }, 403);

    const service = createClient(url, serviceKey);
    const body = await request.json().catch(() => ({})) as JsonRecord;
    const action = clean(body.action, 40) || "health";

    if (action === "health") return await health(service);
    if (action === "lookup") return await lookup(service, body);
    if (action === "prepare") return await prepare(service, user.id, body);
    if (action === "confirm") return await confirm(service, body);
    if (action === "checkpoint") return await checkpoint(service, body);
    if (action === "signed_read") return await signedRead(service, body);
    return json({ error: "Unsupported action" }, 400);
  } catch (error) {
    console.error("lead-file-registry", errorText(error));
    return json({ error: errorText(error) }, 500);
  }
});

async function health(service: any) {
  const table = await service.from("lead_import_files").select("id", { head: true, count: "exact" }).limit(1);
  const bucket = await service.storage.getBucket(BUCKET);
  return json({
    ok: true,
    ready: !table.error && !bucket.error && bucket.data?.public === false,
    table_ready: !table.error,
    bucket_ready: !bucket.error,
    bucket_private: bucket.data?.public === false,
    max_file_bytes: MAX_FILE_BYTES,
    sends_external_messages: false,
    errors: [table.error?.message, bucket.error?.message].filter(Boolean),
  });
}

async function lookup(service: any, body: JsonRecord) {
  const identity = fileIdentity(body);
  if (!identity.ok) return json({ error: identity.error }, 400);
  const result = await service.from("lead_import_files").select("*").eq("object_path", identity.objectPath).maybeSingle();
  if (result.error) throw result.error;
  return json({ ok: true, found: Boolean(result.data), file: result.data || null, object_path: identity.objectPath });
}

async function prepare(service: any, userId: string, body: JsonRecord) {
  const campaignId = clean(body.campaign_id, 80);
  if (!uuidLike(campaignId)) return json({ error: "campaign_id is required" }, 400);
  const identity = fileIdentity(body);
  if (!identity.ok) return json({ error: identity.error }, 400);
  const sizeBytes = integer(body.size_bytes, 1, MAX_FILE_BYTES, 0);
  const mimeType = normalizeMime(body.mime_type, identity.fileName);
  if (!sizeBytes) return json({ error: "Invalid file size" }, 400);
  if (!ALLOWED_MIME.has(mimeType)) return json({ error: "Unsupported lead file type" }, 415);

  const campaign = await service.from("lead_campaigns").select("id").eq("id", campaignId).maybeSingle();
  if (campaign.error || !campaign.data) return json({ error: "Lead campaign not found" }, 404);

  let record = await service.from("lead_import_files").select("*").eq("object_path", identity.objectPath).maybeSingle();
  if (record.error) throw record.error;
  if (!record.data) {
    record = await service.from("lead_import_files").insert({
      campaign_id: campaignId,
      bucket: BUCKET,
      object_path: identity.objectPath,
      file_name: identity.fileName,
      mime_type: mimeType,
      size_bytes: sizeBytes,
      checksum_sha256: identity.checksum,
      sheet_name: identity.sheetName,
      parsed_row_count: integer(body.parsed_row_count, 0, 1_000_000, 0),
      staged_row_count: integer(body.staged_row_count, 0, 1_000_000, 0),
      duplicate_count: integer(body.duplicate_count, 0, 1_000_000, 0),
      blocked_count: integer(body.blocked_count, 0, 1_000_000, 0),
      status: "pending_upload",
      error: null,
      created_by: userId,
    }).select("*").single();
    if (record.error || !record.data) throw record.error || new Error("Lead file registry record was not created");
  } else if (record.data.campaign_id !== campaignId) {
    return json({ error: "This checksum is already linked to another lead campaign" }, 409);
  }

  const exists = await objectExists(service, identity.objectPath);
  if (exists) {
    const updated = await service.from("lead_import_files").update({ status: record.data.status === "staged" ? "staged" : "uploaded", error: null }).eq("id", record.data.id).select("*").single();
    if (updated.error || !updated.data) throw updated.error || new Error("Lead file registry update failed");
    return json({ ok: true, file: updated.data, upload_required: false, reused: true });
  }

  const signed = await service.storage.from(BUCKET).createSignedUploadUrl(identity.objectPath, { upsert: false });
  if (signed.error || !signed.data?.signedUrl) throw signed.error || new Error("Signed file route was not created");
  return json({
    ok: true,
    file: record.data,
    upload_required: true,
    reused: false,
    signed_url: signed.data.signedUrl,
    token: signed.data.token || null,
    object_path: identity.objectPath,
    mime_type: mimeType,
  });
}

async function confirm(service: any, body: JsonRecord) {
  const record = await loadRecord(service, body.file_id);
  if (!record.ok) return json({ error: record.error }, record.status);
  if (!await objectExists(service, record.data.object_path)) return json({ error: "Private file upload was not found" }, 409);
  const values = checkpointValues(body, "uploaded");
  const updated = await service.from("lead_import_files").update(values).eq("id", record.data.id).select("*").single();
  if (updated.error || !updated.data) throw updated.error || new Error("Private lead file confirmation failed");
  return json({ ok: true, file: updated.data, upload_confirmed: true });
}

async function checkpoint(service: any, body: JsonRecord) {
  const record = await loadRecord(service, body.file_id);
  if (!record.ok) return json({ error: record.error }, record.status);
  const status = clean(body.status, 40);
  if (!ALLOWED_STATUS.has(status)) return json({ error: "Invalid checkpoint status" }, 400);
  if (["uploaded", "staged"].includes(status) && !await objectExists(service, record.data.object_path)) {
    return json({ error: "Private source file is missing" }, 409);
  }
  const updated = await service.from("lead_import_files").update(checkpointValues(body, status)).eq("id", record.data.id).select("*").single();
  if (updated.error || !updated.data) throw updated.error || new Error("Private lead file checkpoint failed");
  return json({ ok: true, file: updated.data });
}

async function signedRead(service: any, body: JsonRecord) {
  const record = await loadRecord(service, body.file_id);
  if (!record.ok) return json({ error: record.error }, record.status);
  const signed = await service.storage.from(BUCKET).createSignedUrl(record.data.object_path, 300, { download: record.data.file_name });
  if (signed.error || !signed.data?.signedUrl) throw signed.error || new Error("Signed read URL was not created");
  return json({ ok: true, signed_url: signed.data.signedUrl, expires_in_seconds: 300, file: record.data });
}

async function loadRecord(service: any, value: unknown): Promise<any> {
  const id = clean(value, 80);
  if (!uuidLike(id)) return { ok: false, error: "file_id is required", status: 400 };
  const result = await service.from("lead_import_files").select("*").eq("id", id).maybeSingle();
  if (result.error || !result.data) return { ok: false, error: "Lead file record not found", status: 404 };
  return { ok: true, data: result.data };
}

async function objectExists(service: any, objectPath: string) {
  const parts = objectPath.split("/");
  const fileName = parts.pop() || "";
  const folder = parts.join("/");
  const listed = await service.storage.from(BUCKET).list(folder, { search: fileName, limit: 20 });
  if (listed.error) throw listed.error;
  return Boolean(listed.data?.some((item: any) => item.name === fileName));
}

function checkpointValues(body: JsonRecord, status: string) {
  return {
    parsed_row_count: integer(body.parsed_row_count, 0, 1_000_000, 0),
    staged_row_count: integer(body.staged_row_count, 0, 1_000_000, 0),
    duplicate_count: integer(body.duplicate_count, 0, 1_000_000, 0),
    blocked_count: integer(body.blocked_count, 0, 1_000_000, 0),
    status,
    error: status === "failed" ? clean(body.error, 4000) || "Lead staging failed" : null,
  };
}

function fileIdentity(body: JsonRecord): any {
  const checksum = clean(body.checksum_sha256, 80).toLowerCase();
  const sheetName = clean(body.sheet_name, 160) || "Lead table";
  const fileName = clean(body.file_name, 255);
  if (!/^[a-f0-9]{64}$/.test(checksum)) return { ok: false, error: "Valid SHA-256 checksum is required" };
  if (!fileName) return { ok: false, error: "file_name is required" };
  const lower = fileName.toLowerCase();
  if (!lower.endsWith(".csv") && !lower.endsWith(".xlsx")) return { ok: false, error: "Only CSV and XLSX files are supported" };
  return {
    ok: true,
    checksum,
    sheetName,
    fileName,
    objectPath: `lead-imports/${checksum}/${safePart(sheetName)}/${safePart(fileName)}`,
  };
}

function normalizeMime(value: unknown, fileName: string) {
  const mime = clean(value, 160).toLowerCase();
  if (fileName.toLowerCase().endsWith(".csv")) return ALLOWED_MIME.has(mime) ? mime : "text/csv";
  return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
}

function safePart(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 160) || "file";
}
function clean(value: unknown, max = 500) { return typeof value === "string" ? value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : ""; }
function integer(value: unknown, min: number, max: number, fallback: number) { const number = Number(value); return Number.isFinite(number) ? Math.max(min, Math.min(max, Math.round(number))) : fallback; }
function uuidLike(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
function errorText(error: unknown) { return error instanceof Error ? error.message : typeof error === "string" ? error : "Internal error"; }
function json(payload: unknown, status = 200) { return new Response(JSON.stringify(payload), { status, headers: { ...CORS, "Content-Type": "application/json" } }); }
