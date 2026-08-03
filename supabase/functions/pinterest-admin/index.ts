import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  appCredentials,
  getAccessToken,
  PINTEREST_API,
  PINTEREST_CALLBACK_URL,
  PINTEREST_OAUTH_URL,
  PINTEREST_SCOPES,
  requireAdmin,
  safeJson,
  serviceClient,
  sha256Hex,
} from "../_shared/pinterest.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://irhaapparels.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Pin = {
  id: string;
  title?: string | null;
  description?: string | null;
  alt_text?: string | null;
  link?: string | null;
  board_id?: string | null;
  media?: unknown;
};

type Product = {
  id: string;
  name: string;
  canonical_path: string | null;
  primary_material: string | null;
  audience_group: string | null;
  product_type: string | null;
  main_category: string | null;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return safeJson({ error: "method_not_allowed" }, 405, corsHeaders);

  const admin = await requireAdmin(req);
  if (!admin) return safeJson({ error: "admin_only" }, 403, corsHeaders);

  try {
    const body = await req.json().catch(() => ({}));
    const action = typeof body?.action === "string" ? body.action : "status";

    if (action === "begin_oauth") return beginOauth(admin.id);
    if (action === "status") return status();
    if (action === "inventory") return inventory();
    if (action === "update_one") return updateOne(body?.pin_id, body?.dry_run !== false);
    if (action === "update_missing") {
      const limit = Math.min(Math.max(Number(body?.limit) || 10, 1), 25);
      return updateMissing(limit, body?.dry_run !== false);
    }
    return safeJson({ error: "unsupported_action" }, 400, corsHeaders);
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal_error";
    console.error("pinterest_admin_failed", message);
    return safeJson({ error: sanitizeError(message) }, 500, corsHeaders);
  }
});

async function beginOauth(userId: string) {
  const { appId } = appCredentials();
  const service = serviceClient();
  const state = randomToken(32);
  const stateHash = await sha256Hex(state);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await service.from("pinterest_oauth_states").delete().lt("expires_at", new Date().toISOString());
  const { error } = await service.from("pinterest_oauth_states").insert({ state_hash: stateHash, requested_by: userId, expires_at: expiresAt });
  if (error) throw new Error(`oauth_state_store_failed:${error.message}`);

  const url = new URL(PINTEREST_OAUTH_URL);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", PINTEREST_CALLBACK_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", PINTEREST_SCOPES);
  url.searchParams.set("state", state);
  return safeJson({ ok: true, authorization_url: url.toString(), expires_at: expiresAt }, 200, corsHeaders);
}

async function status() {
  const service = serviceClient();
  const { data, error } = await service
    .from("pinterest_oauth_credentials")
    .select("scope,access_token_expires_at,refresh_token_expires_at,connected_at,updated_at")
    .eq("id", "default")
    .maybeSingle();
  if (error) throw new Error(`status_read_failed:${error.message}`);
  return safeJson({ ok: true, connected: Boolean(data), ...(data || {}) }, 200, corsHeaders);
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
    if (!response.ok) throw new Error(`pinterest_list_failed:${response.status}`);
    if (Array.isArray(payload?.items)) pins.push(...payload.items);
    bookmark = typeof payload?.bookmark === "string" && payload.bookmark ? payload.bookmark : null;
    pages += 1;
    if (pages >= 10) throw new Error("pinterest_inventory_page_guard");
  } while (bookmark);
  return pins;
}

async function inventory() {
  const pins = await fetchAllPins();
  const missing = pins.filter((pin) => !String(pin.alt_text || "").trim());
  return safeJson({
    ok: true,
    total_pins: pins.length,
    missing_alt_text: missing.length,
    with_alt_text: pins.length - missing.length,
    sample_missing: missing.slice(0, 10).map((pin) => ({ id: pin.id, title: pin.title || null, link: pin.link || null })),
  }, 200, corsHeaders);
}

async function updateOne(pinId: unknown, dryRun: boolean) {
  if (typeof pinId !== "string" || !/^\d+$/.test(pinId)) return safeJson({ error: "invalid_pin_id" }, 400, corsHeaders);
  const token = await getAccessToken();
  const pinResponse = await fetch(`${PINTEREST_API}/pins/${pinId}`, { headers: { Authorization: `Bearer ${token}` } });
  const pin = await pinResponse.json().catch(() => ({})) as Pin;
  if (!pinResponse.ok) throw new Error(`pinterest_get_pin_failed:${pinResponse.status}`);
  if (String(pin.alt_text || "").trim()) return safeJson({ ok: true, skipped: true, reason: "alt_text_present", pin_id: pinId }, 200, corsHeaders);
  const plan = await buildAltText(pin);
  if (!plan) return safeJson({ ok: true, skipped: true, reason: "product_match_missing", pin_id: pinId }, 200, corsHeaders);
  if (dryRun) return safeJson({ ok: true, dry_run: true, pin_id: pinId, alt_text: plan.altText, product: plan.product.name }, 200, corsHeaders);
  const updated = await patchAltText(token, pinId, plan.altText);
  return safeJson({ ok: true, dry_run: false, pin_id: pinId, alt_text: updated.alt_text || plan.altText, product: plan.product.name }, 200, corsHeaders);
}

async function updateMissing(limit: number, dryRun: boolean) {
  const token = await getAccessToken();
  const pins = (await fetchAllPins()).filter((pin) => !String(pin.alt_text || "").trim());
  const results: Array<Record<string, unknown>> = [];
  for (const pin of pins) {
    if (results.length >= limit) break;
    const plan = await buildAltText(pin);
    if (!plan) continue;
    if (dryRun) {
      results.push({ pin_id: pin.id, product: plan.product.name, alt_text: plan.altText, dry_run: true });
      continue;
    }
    const updated = await patchAltText(token, pin.id, plan.altText);
    results.push({ pin_id: pin.id, product: plan.product.name, alt_text: updated.alt_text || plan.altText, dry_run: false });
  }
  return safeJson({ ok: true, dry_run: dryRun, processed: results.length, remaining_missing_before_run: pins.length, results }, 200, corsHeaders);
}

async function patchAltText(token: string, pinId: string, altText: string) {
  const response = await fetch(`${PINTEREST_API}/pins/${pinId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ alt_text: altText }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`pinterest_update_failed:${response.status}`);
  return payload as Pin;
}

async function buildAltText(pin: Pin) {
  const link = typeof pin.link === "string" ? pin.link : "";
  let path = "";
  try {
    const url = new URL(link);
    if (!/(^|\.)irhaapparels\.com$/i.test(url.hostname)) return null;
    path = url.pathname.replace(/\/$/, "");
  } catch {
    return null;
  }
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
  const altText = `Product image of ${product.name}${descriptor} from the Irha Apparels B2B apparel catalogue.`.slice(0, 500);
  return { product, altText };
}

function randomToken(bytes: number) {
  const raw = crypto.getRandomValues(new Uint8Array(bytes));
  let binary = "";
  for (const byte of raw) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function sanitizeError(message: string) {
  const known = [
    "pinterest_runtime_not_configured",
    "pinterest_not_connected",
    "pinterest_refresh_token_missing",
    "pinterest_inventory_page_guard",
  ];
  if (known.includes(message)) return message;
  if (message.startsWith("pinterest_list_failed:")) return message;
  if (message.startsWith("pinterest_get_pin_failed:")) return message;
  if (message.startsWith("pinterest_update_failed:")) return message;
  if (message.startsWith("pinterest_refresh_failed:")) return message;
  return "pinterest_operation_failed";
}
