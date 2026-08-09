// GP-2 Google Search Console analytics + private search measurement control plane.
// Read-only against Google. Sanitized observations are persisted for evidence and trend analysis.
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  GSC_SITES_LIST_ENDPOINT,
  getGscOAuthConfigurationPresence,
  googleSearchConsoleFetch,
  type GscOAuthFailureCode,
} from "../_shared/googleSearchConsoleOAuth.ts";

const GSC_SITE_PROPERTY = "sc-domain:irhaapparels.com";
const SEARCH_ANALYTICS_BASE = "https://www.googleapis.com/webmasters/v3/sites";
const ALLOWED_DIMENSIONS = new Set(["query", "page", "country", "device"]);
const ALLOWED_WINDOWS = new Set([28, 90]);
const MAX_ROW_COUNT = 5000;
const AUTH_MODE = "google_oauth_refresh_token";
const SITE_ORIGIN = "https://irhaapparels.com";

type Json = Record<string, unknown>;
type SearchRow = { keys?: unknown[]; clicks?: unknown; impressions?: unknown; ctr?: unknown; position?: unknown };
type SitesListPayload = { siteEntry?: Array<{ siteUrl?: unknown; permissionLevel?: unknown }> };
type SearchAnalyticsPayload = { rows?: SearchRow[] };

function isAllowedOrigin(origin: string) {
  try {
    const url = new URL(origin);
    return url.hostname === "irhaapparels.com"
      || url.hostname === "www.irhaapparels.com"
      || url.hostname === "localhost"
      || url.hostname === "127.0.0.1"
      || url.hostname.endsWith(".lovable.app")
      || url.hostname === "irha-apparels.pages.dev"
      || url.hostname.endsWith(".irha-apparels.pages.dev");
  } catch {
    return false;
  }
}

function corsHeaders(origin: string | null) {
  const allowedOrigin = origin && isAllowedOrigin(origin) ? origin : SITE_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function json(payload: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function bearer(req: Request) {
  const match = (req.headers.get("Authorization") || "").match(/^Bearer\s+(\S+)$/i);
  return match?.[1] || "";
}

async function requireAdminOrService(req: Request, headers: Record<string, string>) {
  const token = bearer(req);
  if (!token) return { mode: null, response: json({ error: "Unauthorized" }, 401, headers) };
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (serviceKey && token === serviceKey) return { mode: "service" as const, response: null };

  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data: userResult, error: userError } = await client.auth.getUser();
  const user = userResult?.user;
  if (userError || !user) return { mode: null, response: json({ error: "Unauthorized" }, 401, headers) };
  const { data: role, error: roleError } = await client
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (roleError || !role) return { mode: null, response: json({ error: "Admin only" }, 403, headers) };
  return { mode: "admin" as const, response: null };
}

function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

function effectiveSearchConsoleProperty() {
  const configured = Deno.env.get("GSC_SITE_URL")?.trim();
  if (configured && configured !== GSC_SITE_PROPERTY) return { property: null, error: "gsc_property_configuration_invalid" as const };
  return { property: GSC_SITE_PROPERTY, error: null };
}

function configurationState() {
  const oauth = getGscOAuthConfigurationPresence();
  const site = effectiveSearchConsoleProperty();
  return {
    configuration: { ...oauth, site_url: Boolean(site.property) && !site.error },
    property: site.property,
    configurationError: site.error,
    oauthConfigured: oauth.oauth_client_id && oauth.oauth_client_secret && oauth.oauth_refresh_token,
  };
}

function safeFailureMessage(code: GscOAuthFailureCode | "gsc_property_configuration_invalid") {
  switch (code) {
    case "gsc_oauth_not_configured": return "Google Search Console OAuth is not configured";
    case "gsc_oauth_invalid_client": return "Google OAuth client authentication failed";
    case "gsc_oauth_reauthorization_required": return "Google OAuth reauthorization is required";
    case "gsc_oauth_rate_limited": return "Google OAuth is temporarily rate limited";
    case "gsc_property_configuration_invalid": return "Invalid Google Search Console property configuration";
    default: return "Google Search Console request failed";
  }
}

async function readHealth() {
  const state = configurationState();
  const google = { token_exchange: false, property_access: false, permission_level: null as string | null };
  let failureCode: GscOAuthFailureCode | "gsc_property_configuration_invalid" | null = null;
  if (state.configurationError || !state.property) failureCode = "gsc_property_configuration_invalid";
  else if (!state.oauthConfigured) failureCode = "gsc_oauth_not_configured";
  else {
    const result = await googleSearchConsoleFetch<SitesListPayload>(GSC_SITES_LIST_ENDPOINT, { method: "GET" });
    google.token_exchange = result.token_exchange;
    if (!result.ok) failureCode = result.code;
    else {
      const exactSite = Array.isArray(result.data?.siteEntry)
        ? result.data.siteEntry.find((entry) => entry?.siteUrl === GSC_SITE_PROPERTY)
        : undefined;
      google.property_access = Boolean(exactSite);
      google.permission_level = typeof exactSite?.permissionLevel === "string" ? exactSite.permissionLevel.slice(0, 64) : null;
      if (!exactSite) failureCode = "gsc_google_request_failed";
    }
  }
  const ready = !failureCode && state.oauthConfigured && state.configuration.site_url && google.token_exchange && google.property_access;
  return {
    ready: Boolean(ready),
    state: ready ? "ready" : "blocked",
    auth_mode: AUTH_MODE,
    configuration: state.configuration,
    google,
    effective_property: state.property,
    site_url: state.property,
    failure_code: ready ? null : failureCode,
  };
}

function formatDate(date: Date) { return date.toISOString().slice(0, 10); }
function shiftedDate(days: number) { return new Date(Date.now() + days * 86_400_000); }

async function querySearchAnalytics(dimensions: string[], startDate: string, endDate: string, rowLimit = MAX_ROW_COUNT) {
  const state = configurationState();
  if (!state.property) throw new Error("gsc_property_configuration_invalid");
  const endpoint = `${SEARCH_ANALYTICS_BASE}/${encodeURIComponent(state.property)}/searchAnalytics/query`;
  const upstream = await googleSearchConsoleFetch<SearchAnalyticsPayload>(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ startDate, endDate, dimensions, rowLimit: Math.max(1, Math.min(25_000, rowLimit)) }),
  });
  if (!upstream.ok) throw new Error(upstream.code);
  return Array.isArray(upstream.data?.rows) ? upstream.data.rows : [];
}

function safeNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
}

function isSensitiveSearchQuery(value: string) {
  return /@/.test(value) || /(?:\+?\d[\d\s().-]{6,}\d)/.test(value);
}

function safeKey(value: unknown, dimensionType: string) {
  const text = typeof value === "string" ? value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, 1000) : "";
  if (!text) return null;
  if ((dimensionType === "query" || dimensionType === "query_page") && isSensitiveSearchQuery(text)) return null;
  return text;
}

function canonicalPathFromPage(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !["irhaapparels.com", "www.irhaapparels.com"].includes(url.hostname)) return null;
    const path = url.pathname === "/" ? "/" : url.pathname.replace(/\/{2,}/g, "/").replace(/\/$/, "");
    return path || "/";
  } catch {
    return null;
  }
}

function observationRows(runId: string, period: string, dimensionType: string, rows: SearchRow[]) {
  return rows.flatMap((row) => {
    const keys = Array.isArray(row.keys) ? row.keys : [];
    const first = safeKey(keys[0], dimensionType);
    if (!first) return [];
    const second = dimensionType === "query_page" ? safeKey(keys[1], "page") : "";
    if (dimensionType === "query_page" && !second) return [];
    const pageKey = dimensionType === "page" ? first : dimensionType === "query_page" ? second! : "";
    return [{
      run_id: runId,
      period,
      dimension_type: dimensionType,
      key_1: first,
      key_2: second || "",
      canonical_path: pageKey ? canonicalPathFromPage(pageKey) : null,
      clicks: safeNumber(row.clicks),
      impressions: safeNumber(row.impressions),
      ctr: Math.min(1, safeNumber(row.ctr)),
      position: safeNumber(row.position),
    }];
  });
}

async function insertChunks(service: ReturnType<typeof createClient>, rows: Record<string, unknown>[]) {
  for (let index = 0; index < rows.length; index += 500) {
    const { error } = await service.from("search_console_observations").insert(rows.slice(index, index + 500));
    if (error) throw error;
  }
}

async function syncSearchMeasurement() {
  const service = serviceClient();
  const health = await readHealth();
  const currentEnd = shiftedDate(-2);
  const currentStart = new Date(currentEnd.getTime() - 27 * 86_400_000);
  const previousEnd = new Date(currentStart.getTime() - 86_400_000);
  const previousStart = new Date(previousEnd.getTime() - 27 * 86_400_000);
  const { data: run, error: runError } = await service.from("search_measurement_runs").insert({
    property: GSC_SITE_PROPERTY,
    status: health.ready ? "running" : "blocked",
    failure_code: health.failure_code,
    permission_level: health.google.permission_level,
    data_start_date: formatDate(currentStart),
    data_end_date: formatDate(currentEnd),
    summary: { health, data_lag_days: 2 },
    completed_at: health.ready ? null : new Date().toISOString(),
  }).select("id").single();
  if (runError || !run) throw new Error(runError?.message || "search_measurement_run_create_failed");
  if (!health.ready) return { ok: false, run_id: run.id, health, state: "blocked" };

  try {
    const currentDefinitions: Array<[string, string[], number]> = [
      ["query", ["query"], 5000],
      ["page", ["page"], 5000],
      ["country", ["country"], 1000],
      ["device", ["device"], 100],
      ["query_page", ["query", "page"], 10000],
    ];
    const allCurrent: Record<string, unknown>[] = [];
    for (const [type, dimensions, limit] of currentDefinitions) {
      const rows = await querySearchAnalytics(dimensions, formatDate(currentStart), formatDate(currentEnd), limit);
      allCurrent.push(...observationRows(run.id, "current_28d", type, rows));
    }
    const previousPages = await querySearchAnalytics(["page"], formatDate(previousStart), formatDate(previousEnd), 5000);
    const allPrevious = observationRows(run.id, "previous_28d", "page", previousPages);
    await insertChunks(service, [...allCurrent, ...allPrevious]);

    const summary = {
      health,
      data_lag_days: 2,
      current_rows: allCurrent.length,
      previous_rows: allPrevious.length,
      dimensions: ["query", "page", "country", "device", "query_page"],
      separate_generative_ai_reporting: "NOT CURRENTLY AVAILABLE",
    };
    const { error: updateError } = await service.from("search_measurement_runs").update({
      status: "complete",
      completed_at: new Date().toISOString(),
      failure_code: null,
      current_rows: allCurrent.length,
      previous_rows: allPrevious.length,
      summary,
    }).eq("id", run.id);
    if (updateError) throw updateError;
    return { ok: true, run_id: run.id, ...summary };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await service.from("search_measurement_runs").update({
      status: "failed",
      completed_at: new Date().toISOString(),
      failure_code: message.slice(0, 120),
    }).eq("id", run.id);
    throw error;
  }
}

function eventSummary(rows: Array<Record<string, unknown>>) {
  const counts: Record<string, number> = {};
  const pageIntent = new Map<string, number>();
  for (const row of rows) {
    const name = String(row.event_name || "unknown");
    counts[name] = (counts[name] || 0) + 1;
    if (["inquiry_cta_click", "whatsapp_click", "email_click", "sample_cta_click", "quote_cta_click", "rfq_start", "rfq_submit", "general_inquiry_submit", "product_inquiry_submit"].includes(name)) {
      const path = String(row.canonical_path || "/");
      pageIntent.set(path, (pageIntent.get(path) || 0) + 1);
    }
  }
  return {
    counts,
    top_intent_pages: [...pageIntent.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([path, events]) => ({ path, events })),
  };
}

async function controlPlane() {
  const service = serviceClient();
  const { data: latest } = await service.from("search_measurement_runs").select("*").eq("status", "complete").order("completed_at", { ascending: false }).limit(1).maybeSingle();
  const runId = latest?.id || null;
  const empty = { queries: [], pages: [], countries: [], devices: [], query_pages: [] };
  let search: Record<string, unknown> = empty;
  if (runId) {
    const [queries, pages, countries, devices, queryPages, previousPages] = await Promise.all([
      service.from("search_console_observations").select("key_1,clicks,impressions,ctr,position,canonical_path").eq("run_id", runId).eq("period", "current_28d").eq("dimension_type", "query").order("impressions", { ascending: false }).limit(100),
      service.from("search_console_observations").select("key_1,clicks,impressions,ctr,position,canonical_path").eq("run_id", runId).eq("period", "current_28d").eq("dimension_type", "page").order("impressions", { ascending: false }).limit(300),
      service.from("search_console_observations").select("key_1,clicks,impressions,ctr,position").eq("run_id", runId).eq("period", "current_28d").eq("dimension_type", "country").order("impressions", { ascending: false }).limit(100),
      service.from("search_console_observations").select("key_1,clicks,impressions,ctr,position").eq("run_id", runId).eq("period", "current_28d").eq("dimension_type", "device").order("impressions", { ascending: false }).limit(20),
      service.from("search_console_observations").select("key_1,key_2,clicks,impressions,ctr,position,canonical_path").eq("run_id", runId).eq("period", "current_28d").eq("dimension_type", "query_page").order("impressions", { ascending: false }).limit(500),
      service.from("search_console_observations").select("key_1,impressions,clicks").eq("run_id", runId).eq("period", "previous_28d").eq("dimension_type", "page").limit(5000),
    ]);
    const queryPageRows = queryPages.data || [];
    const highImpressionLowCtr = queryPageRows.filter((row: any) => Number(row.impressions) >= 10 && Number(row.ctr) < 0.02).slice(0, 30);
    const nearWins = queryPageRows.filter((row: any) => Number(row.impressions) > 0 && Number(row.position) >= 4 && Number(row.position) <= 15).slice(0, 50);
    const previous = new Map((previousPages.data || []).map((row: any) => [row.key_1, Number(row.impressions) || 0]));
    const losingPages = (pages.data || []).flatMap((row: any) => {
      const prior = previous.get(row.key_1) || 0;
      const current = Number(row.impressions) || 0;
      return prior >= 10 && current < prior ? [{ ...row, previous_impressions: prior, impression_delta: current - prior }] : [];
    }).sort((a: any, b: any) => a.impression_delta - b.impression_delta).slice(0, 30);
    search = {
      queries: queries.data || [],
      pages: pages.data || [],
      countries: countries.data || [],
      devices: devices.data || [],
      query_pages: queryPageRows,
      opportunities: { high_impression_low_ctr: highImpressionLowCtr, near_wins: nearWins, losing_pages: losingPages },
    };
  }

  const since = new Date(Date.now() - 28 * 86_400_000).toISOString();
  const [products, categories, events, inquiryCount, visitorCount, socialCount] = await Promise.all([
    service.from("gp2_product_search_observability").select("*").order("impressions", { ascending: false, nullsFirst: false }).limit(500),
    service.from("gp2_category_observability").select("*").order("observed_impressions", { ascending: false }).limit(20),
    service.from("commercial_measurement_events").select("event_name,canonical_path,main_category,reference_code,source,medium,occurred_at").gte("occurred_at", since).order("occurred_at", { ascending: false }).limit(5000),
    service.from("inquiries").select("id", { count: "exact", head: true }).gte("created_at", since),
    service.from("site_visitors").select("visitor_session_id", { count: "exact", head: true }).gte("first_seen_at", since),
    service.from("social_attribution_events").select("id", { count: "exact", head: true }).gte("occurred_at", since),
  ]);

  const productRows = products.data || [];
  return {
    ok: true,
    property: GSC_SITE_PROPERTY,
    latest_run: latest || null,
    data_state: latest ? "OBSERVED" : "NO DATA / NOT OBSERVED",
    search,
    products: productRows,
    categories: categories.data || [],
    measurement: {
      window_days: 28,
      visitors: visitorCount.count ?? null,
      accepted_inquiries: inquiryCount.count ?? null,
      social_attribution_events: socialCount.count ?? null,
      commercial_events: eventSummary((events.data || []) as Array<Record<string, unknown>>),
      products_total: productRows.length,
      products_with_search_data: productRows.filter((row: any) => row.search_data_state === "OBSERVED").length,
      products_without_search_data: productRows.filter((row: any) => row.search_data_state !== "OBSERVED").length,
    },
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, headers);
  if (origin && !isAllowedOrigin(origin)) return json({ error: "Origin not allowed" }, 403, headers);

  try {
    const actor = await requireAdminOrService(req, headers);
    if (actor.response) return actor.response;
    const body = await req.json().catch(() => ({}));
    const action = typeof body?.action === "string" ? body.action : "query";

    if (action === "health") return json({ ok: true, ...(await readHealth()) }, 200, headers);
    if (action === "sync") {
      const result = await syncSearchMeasurement();
      return json(result, result.ok ? 200 : 503, headers);
    }
    if (action === "control_plane") return json(await controlPlane(), 200, headers);

    const state = configurationState();
    if (state.configurationError || !state.property) return json({ error: safeFailureMessage("gsc_property_configuration_invalid"), code: "gsc_property_configuration_invalid", configuration: state.configuration }, 503, headers);
    if (!state.oauthConfigured) return json({ error: safeFailureMessage("gsc_oauth_not_configured"), code: "gsc_oauth_not_configured", configuration: state.configuration }, 503, headers);

    const dimension = typeof body?.dimension === "string" ? body.dimension : "query";
    const days = Number(body?.days ?? 28);
    if (!ALLOWED_DIMENSIONS.has(dimension)) return json({ error: "Invalid dimension" }, 400, headers);
    if (!ALLOWED_WINDOWS.has(days)) return json({ error: "Days must be 28 or 90" }, 400, headers);
    const end = new Date();
    const start = new Date(end.getTime() - days * 86_400_000);
    try {
      const rows = await querySearchAnalytics([dimension], formatDate(start), formatDate(end), MAX_ROW_COUNT);
      return json({ ok: true, dimension, days, property: state.property, site_url: state.property, rows }, 200, headers);
    } catch (error) {
      const code = (error instanceof Error ? error.message : "gsc_google_request_failed") as GscOAuthFailureCode;
      return json({ error: safeFailureMessage(code), code }, 502, headers);
    }
  } catch (error) {
    console.error("gsc-analytics unhandled failure", error instanceof Error ? error.message : "unknown");
    return json({ error: "Google Search Console analytics failed", code: "gsc_google_request_failed" }, 500, headers);
  }
});
