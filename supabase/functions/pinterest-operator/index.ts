import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getAccessToken, PINTEREST_API, safeJson, serviceClient, sha256Hex } from "./pinterest.ts";

type Pin = {
  id: string;
  title?: string | null;
  description?: string | null;
  alt_text?: string | null;
  link?: string | null;
  board_id?: string | null;
  board_owner?: { username?: string | null } | null;
  is_owner?: boolean | null;
  is_removable?: boolean | null;
  creative_type?: string | null;
  parent_pin_id?: string | null;
};
type Product = { id: string; name: string; canonical_path: string | null; primary_material: string | null; audience_group: string | null; product_type: string | null; main_category: string | null; };
type Job = { id: string; action: string; payload: Record<string, unknown>; expires_at: string; status: string; used_at: string | null; };
type ApiFailureDetails = { api_status: number; api_code: string | null; api_message: string | null };

class PinterestApiError extends Error {
  details: ApiFailureDetails;

  constructor(operation: string, status: number, payload: unknown) {
    const record = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
    const apiCode = sanitizeApiValue(record.code);
    const apiMessage = sanitizeApiValue(record.message);
    super(`pinterest_${operation}_failed:${status}`);
    this.name = "PinterestApiError";
    this.details = { api_status: status, api_code: apiCode, api_message: apiMessage };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return safeJson({ error: "method_not_allowed" }, 405);
  const body = await req.json().catch(() => ({}));
  const operatorToken = typeof body?.token === "string" ? body.token : "";
  if (!/^[A-Za-z0-9_-]{40,120}$/.test(operatorToken)) return safeJson({ error: "forbidden" }, 403);

  const service = serviceClient();
  const tokenHash = await sha256Hex(operatorToken);
  const { data: row, error: readError } = await service
    .from("pinterest_operator_jobs")
    .select("id,action,payload,expires_at,status,used_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (readError || !row) return safeJson({ error: "forbidden" }, 403);
  const job = row as Job;
  if (job.status !== "pending" || job.used_at) return safeJson({ error: "job_not_available" }, 409);
  if (new Date(job.expires_at).getTime() <= Date.now()) {
    await service.from("pinterest_operator_jobs").update({ status: "expired", finished_at: new Date().toISOString() }).eq("id", job.id).eq("status", "pending");
    return safeJson({ error: "job_expired" }, 410);
  }

  const now = new Date().toISOString();
  const { data: claimed, error: claimError } = await service
    .from("pinterest_operator_jobs")
    .update({ status: "running", used_at: now, started_at: now })
    .eq("id", job.id)
    .eq("status", "pending")
    .is("used_at", null)
    .select("id")
    .maybeSingle();
  if (claimError || !claimed) return safeJson({ error: "job_not_available" }, 409);

  try {
    let result: Record<string, unknown>;
    if (job.action === "inventory") result = await inventory();
    else if (job.action === "dry_run_missing") result = await updateMissing(readLimit(job.payload, 10), true);
    else if (job.action === "update_one") result = await updateOne(job.payload?.pin_id, false);
    else if (job.action === "update_missing") result = await updateMissing(readLimit(job.payload, 10), false);
    else throw new Error("unsupported_action");

    await service.from("pinterest_operator_jobs").update({ status: "succeeded", result, finished_at: new Date().toISOString(), error_code: null }).eq("id", job.id);
    return safeJson({ ok: true, job_id: job.id, action: job.action, result });
  } catch (error) {
    const code = sanitizeError(error instanceof Error ? error.message : "operation_failed");
    const failureResult = error instanceof PinterestApiError ? error.details : null;
    await service.from("pinterest_operator_jobs").update({ status: "failed", result: failureResult, error_code: code, finished_at: new Date().toISOString() }).eq("id", job.id);
    console.error("pinterest_operator_failed", code, failureResult?.api_status ?? null, failureResult?.api_code ?? null);
    return safeJson({ ok: false, job_id: job.id, error: code, result: failureResult }, 500);
  }
});

function readLimit(payload: Record<string, unknown>, fallback: number) {
  const value = Number(payload?.limit);
  return Math.min(Math.max(Number.isFinite(value) ? Math.trunc(value) : fallback, 1), 25);
}

function sanitizeApiValue(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const normalized = String(value).replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
  return normalized ? normalized.slice(0, 240) : null;
}

function safePinSnapshot(pin: Pin) {
  return {
    id: pin.id,
    title: pin.title || null,
    link: pin.link || null,
    board_id: pin.board_id || null,
    board_owner_username: pin.board_owner?.username || null,
    is_owner: typeof pin.is_owner === "boolean" ? pin.is_owner : null,
    is_removable: typeof pin.is_removable === "boolean" ? pin.is_removable : null,
    creative_type: pin.creative_type || null,
    parent_pin_id: pin.parent_pin_id || null,
    alt_text_present: Boolean(String(pin.alt_text || "").trim()),
  };
}

async function fetchAllPins() {
  const token = await getAccessToken();
  const pins: Pin[] = [];
  let bookmark: string | null = null;
  let pages = 0;
  do {
    const url = new URL(`${PINTEREST_API}/pins`);
    url.searchParams.set("page_size", "250");
    if (bookmark) url.searchParams.set("bookmark", bookmark);
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new PinterestApiError("list", response.status, payload);
    if (Array.isArray(payload?.items)) pins.push(...payload.items);
    bookmark = typeof payload?.bookmark === "string" && payload.bookmark ? payload.bookmark : null;
    pages += 1;
    if (pages >= 10 && bookmark) throw new Error("pinterest_inventory_page_guard");
  } while (bookmark);
  return { pins, pages };
}

async function inventory() {
  const { pins, pages } = await fetchAllPins();
  const missing = pins.filter((pin) => !String(pin.alt_text || "").trim());
  const matched = await countMatchable(missing);
  return {
    total_pins: pins.length,
    pages,
    missing_alt_text: missing.length,
    with_alt_text: pins.length - missing.length,
    matchable_missing: matched.matchable,
    unmatched_missing: matched.unmatched,
    sample_missing: missing.slice(0, 10).map(safePinSnapshot),
    sample_unmatched: matched.sampleUnmatched,
  };
}

async function countMatchable(pins: Pin[]) {
  let matchable = 0;
  let unmatched = 0;
  const sampleUnmatched: ReturnType<typeof safePinSnapshot>[] = [];
  for (const pin of pins) {
    const plan = await buildAltText(pin);
    if (plan) matchable += 1;
    else {
      unmatched += 1;
      if (sampleUnmatched.length < 10) sampleUnmatched.push(safePinSnapshot(pin));
    }
  }
  return { matchable, unmatched, sampleUnmatched };
}

async function updateOne(pinId: unknown, dryRun: boolean) {
  if (typeof pinId !== "string" || !/^\d+$/.test(pinId)) throw new Error("invalid_pin_id");
  const token = await getAccessToken();
  const response = await fetch(`${PINTEREST_API}/pins/${pinId}`, { headers: { Authorization: `Bearer ${token}` } });
  const payload = await response.json().catch(() => ({}));
  const pin = payload as Pin;
  if (!response.ok) throw new PinterestApiError("get_pin", response.status, payload);
  if (String(pin.alt_text || "").trim()) return { skipped: true, reason: "alt_text_present", pin: safePinSnapshot(pin) };
  const plan = await buildAltText(pin);
  if (!plan) return { skipped: true, reason: "product_match_missing", pin: safePinSnapshot(pin) };
  if (dryRun) return { dry_run: true, pin: safePinSnapshot(pin), product: plan.product.name, alt_text: plan.altText };
  const updated = await patchAltText(token, pin.id, plan.altText);
  return { dry_run: false, pin: safePinSnapshot(updated), product: plan.product.name, alt_text: updated.alt_text || plan.altText };
}

async function updateMissing(limit: number, dryRun: boolean) {
  const token = await getAccessToken();
  const { pins } = await fetchAllPins();
  const missing = pins.filter((pin) => !String(pin.alt_text || "").trim());
  const results: Array<Record<string, unknown>> = [];
  let unmatchedSeen = 0;
  for (const pin of missing) {
    if (results.length >= limit) break;
    const plan = await buildAltText(pin);
    if (!plan) { unmatchedSeen += 1; continue; }
    if (dryRun) results.push({ pin: safePinSnapshot(pin), product: plan.product.name, alt_text: plan.altText, dry_run: true });
    else {
      const updated = await patchAltText(token, pin.id, plan.altText);
      results.push({ pin: safePinSnapshot(updated), product: plan.product.name, alt_text: updated.alt_text || plan.altText, dry_run: false });
      await new Promise((resolve) => setTimeout(resolve, 75));
    }
  }
  return { dry_run: dryRun, processed: results.length, missing_before_run: missing.length, unmatched_seen_before_limit: unmatchedSeen, results };
}

async function patchAltText(token: string, pinId: string, altText: string) {
  const response = await fetch(`${PINTEREST_API}/pins/${pinId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ alt_text: altText }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new PinterestApiError("update", response.status, payload);
  return payload as Pin;
}

async function buildAltText(pin: Pin) {
  const link = typeof pin.link === "string" ? pin.link.trim() : "";
  let path = "";
  try {
    const url = new URL(link);
    if (!/(^|\.)irhaapparels\.com$/i.test(url.hostname)) return null;
    path = url.pathname.replace(/\/$/, "");
  } catch { return null; }
  if (!path.startsWith("/products/")) return null;

  const service = serviceClient();
  const { data, error } = await service
    .from("products")
    .select("id,name,canonical_path,primary_material,audience_group,product_type,main_category")
    .eq("canonical_path", path)
    .eq("is_published", true)
    .maybeSingle();
  if (error || !data) return null;
  const product = data as Product;
  const material = product.primary_material?.trim();
  const descriptor = material && !product.name.toLowerCase().includes(material.toLowerCase()) ? ` made with ${material}` : "";
  const altText = `Product image of ${product.name}${descriptor} from Irha Apparels.`.slice(0, 500);
  return { product, altText };
}

function sanitizeError(message: string) {
  const allowed = ["pinterest_runtime_not_configured","pinterest_not_connected","pinterest_refresh_token_missing","pinterest_inventory_page_guard","invalid_pin_id","unsupported_action"];
  if (allowed.includes(message)) return message;
  for (const prefix of ["pinterest_list_failed:","pinterest_get_pin_failed:","pinterest_update_failed:","pinterest_refresh_failed:"]) if (message.startsWith(prefix)) return message;
  return "pinterest_operation_failed";
}
