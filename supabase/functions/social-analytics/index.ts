import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type JsonRecord = Record<string, unknown>;
type DbClient = ReturnType<typeof createClient>;
const MAX_BATCH = 20;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const auth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await auth.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "Unauthorized" }, 401);
    const { data: role } = await auth.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!role) return json({ error: "Admin access required" }, 403);

    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json().catch(() => ({}));
    const action = typeof body?.action === "string" ? body.action : "health";

    if (action === "health") return await health(service);
    if (action === "collect") return await collect(service, user.id, body);
    if (action === "recommend") return await recommend(service, user.id);
    return json({ error: "Unsupported action" }, 400);
  } catch (error) {
    console.error("social-analytics", error);
    return json({ error: error instanceof Error ? error.message : "Internal error" }, 500);
  }
});

async function health(service: DbClient) {
  const tables = ["social_calendar_items", "social_metric_snapshots", "social_attribution_events", "social_growth_recommendations"];
  const readiness = await Promise.all(tables.map(async (table) => {
    const { error } = await service.from(table).select("*", { count: "exact", head: true }).limit(1);
    return { table, ready: !error, error: error?.message ?? null };
  }));
  const { count: published } = await service.from("social_calendar_items").select("id", { count: "exact", head: true }).eq("status", "published");
  const { count: measured } = await service.from("social_metric_snapshots").select("item_id", { count: "exact", head: true }).eq("verified", true);
  return json({
    ok: readiness.every((item) => item.ready),
    database_ready: readiness.every((item) => item.ready),
    tables: readiness,
    published_items: published ?? 0,
    verified_snapshots: measured ?? 0,
    meta_configured: Boolean(Deno.env.get("META_ACCESS_TOKEN")),
    generic_gateway_configured: Boolean(Deno.env.get("SOCIAL_ANALYTICS_GATEWAY_URL") && Deno.env.get("SOCIAL_ANALYTICS_GATEWAY_SECRET")),
    linkedin_metrics_configured: Boolean(Deno.env.get("LINKEDIN_ANALYTICS_TOKEN")),
    tiktok_metrics_configured: Boolean(Deno.env.get("TIKTOK_ANALYTICS_TOKEN")),
    note: "Health checks do not publish, edit or delete social posts.",
  });
}

async function collect(service: DbClient, userId: string, body: JsonRecord) {
  const requestedIds = Array.isArray(body.item_ids) ? body.item_ids.filter((value): value is string => typeof value === "string").slice(0, MAX_BATCH) : [];
  let query = service
    .from("social_calendar_items")
    .select("id,platform,status,external_post_id,external_post_url,published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(MAX_BATCH);
  if (requestedIds.length > 0) query = query.in("id", requestedIds);
  const { data: items, error } = await query;
  if (error) throw new Error(error.message);

  const outcomes: JsonRecord[] = [];
  for (const item of items ?? []) {
    const hasEvidence = Boolean(item.external_post_id || (item.external_post_url && /^https:\/\//i.test(item.external_post_url)));
    if (!hasEvidence) {
      outcomes.push({ item_id: item.id, status: "skipped", reason: "Exact publication evidence missing" });
      continue;
    }
    try {
      const result = await fetchMetrics(item as JsonRecord);
      if (result.status !== "collected") {
        outcomes.push({ item_id: item.id, platform: item.platform, status: result.status, reason: result.reason });
        continue;
      }
      const snapshotAt = new Date().toISOString();
      const providerKey = `${result.source}:${item.external_post_id || item.id}:${snapshotAt.slice(0, 16)}`;
      const metrics = sanitizeMetrics(result.metrics);
      const { error: insertError } = await service.from("social_metric_snapshots").upsert({
        item_id: item.id,
        platform: item.platform,
        external_post_id: item.external_post_id,
        external_post_url: item.external_post_url,
        snapshot_at: snapshotAt,
        ...metrics,
        source: result.source,
        verified: true,
        provider_snapshot_key: providerKey,
        raw_metrics: result.raw,
        collected_by: userId,
      }, { onConflict: "item_id,provider_snapshot_key" });
      if (insertError) throw new Error(insertError.message);
      await service.from("social_calendar_items").update({ metrics_last_collected_at: snapshotAt }).eq("id", item.id);
      outcomes.push({ item_id: item.id, platform: item.platform, status: "collected", source: result.source, snapshot_at: snapshotAt });
    } catch (metricError) {
      outcomes.push({ item_id: item.id, platform: item.platform, status: "failed", error: metricError instanceof Error ? metricError.message : "Metric collection failed" });
    }
  }

  const collected = outcomes.filter((item) => item.status === "collected").length;
  const failed = outcomes.filter((item) => item.status === "failed").length;
  return json({ ok: failed === 0, collected, failed, outcomes, note: "Metrics only. No social post was changed or published." });
}

async function recommend(service: DbClient, userId: string) {
  const { data: rows, error } = await service.from("social_growth_latest").select("*").order("published_at", { ascending: false }).limit(200);
  if (error) throw new Error(error.message);
  let created = 0;
  const outcomes: JsonRecord[] = [];

  for (const row of rows ?? []) {
    const recommendation = recommendationForRow(row as JsonRecord);
    if (!recommendation) continue;
    const { data: existing } = await service
      .from("social_growth_recommendations")
      .select("id")
      .eq("item_id", row.item_id)
      .eq("recommendation_type", recommendation.type)
      .in("status", ["open", "approved"])
      .maybeSingle();
    if (existing) continue;
    const { error: insertError } = await service.from("social_growth_recommendations").insert({
      item_id: row.item_id,
      recommendation_type: recommendation.type,
      priority: recommendation.priority,
      reason: recommendation.reason,
      proposed_action: recommendation.action,
      evidence: recommendation.evidence,
      created_by: userId,
    });
    if (insertError) {
      outcomes.push({ item_id: row.item_id, status: "failed", error: insertError.message });
      continue;
    }
    created += 1;
    outcomes.push({ item_id: row.item_id, status: "created", type: recommendation.type });
  }
  return json({ ok: true, created, outcomes, note: "Recommendations are internal drafts only. Nothing was posted." });
}

async function fetchMetrics(item: JsonRecord): Promise<{ status: "collected" | "manual_required"; source: string; metrics: JsonRecord; raw: JsonRecord; reason?: string }> {
  const gatewayUrl = Deno.env.get("SOCIAL_ANALYTICS_GATEWAY_URL");
  const gatewaySecret = Deno.env.get("SOCIAL_ANALYTICS_GATEWAY_SECRET");
  if (gatewayUrl && gatewaySecret) {
    const response = await fetch(gatewayUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${gatewaySecret}` },
      body: JSON.stringify({ action: "collect", item: redactItem(item) }),
    });
    const payload = await safeJson(response);
    if (!response.ok) throw new Error(readError(payload, `Analytics gateway returned ${response.status}`));
    if (!isRecord(payload) || payload.status !== "collected" || !isRecord(payload.metrics)) {
      return { status: "manual_required", source: "generic_gateway", metrics: {}, raw: isRecord(payload) ? payload : {}, reason: "Gateway returned no verified metric result" };
    }
    return { status: "collected", source: "generic_gateway", metrics: payload.metrics, raw: payload };
  }

  if ((item.platform === "facebook" || item.platform === "instagram") && Deno.env.get("META_ACCESS_TOKEN") && item.external_post_id) {
    const version = Deno.env.get("META_GRAPH_VERSION") || "v19.0";
    const fields = "impressions,reach,video_views,post_reactions_by_type_total,post_clicks,post_activity_by_action_type";
    const url = `https://graph.facebook.com/${version}/${encodeURIComponent(String(item.external_post_id))}/insights?metric=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(Deno.env.get("META_ACCESS_TOKEN")!)}`;
    const response = await fetch(url);
    const payload = await safeJson(response);
    if (!response.ok) throw new Error(readError(payload, `Meta returned ${response.status}`));
    const metrics = parseMetaMetrics(payload);
    return { status: "collected", source: "meta_graph", metrics, raw: isRecord(payload) ? payload : {} };
  }

  const platform = String(item.platform || "");
  return { status: "manual_required", source: platform === "linkedin" ? "linkedin_api" : platform === "tiktok" ? "tiktok_api" : "meta_graph", metrics: {}, raw: {}, reason: `${platform} analytics credentials or permission are not configured` };
}

function recommendationForRow(row: JsonRecord): { type: string; priority: number; reason: string; action: string; evidence: JsonRecord } | null {
  const published = row.status === "published" && Boolean(row.external_post_id || row.external_post_url);
  if (!published) return null;
  const verified = row.metric_verified === true;
  if (!verified) return { type: "collect_metrics", priority: 90, reason: "Published post has no verified metric snapshot.", action: "Collect platform metrics or enter a verified manual snapshot.", evidence: { external_post_id: row.external_post_id, external_post_url: row.external_post_url } };
  const snapshotAt = typeof row.snapshot_at === "string" ? new Date(row.snapshot_at).getTime() : 0;
  const ageDays = snapshotAt ? (Date.now() - snapshotAt) / 86_400_000 : 999;
  if (ageDays > 14) return { type: "refresh_metrics", priority: 80, reason: `Latest verified snapshot is ${Math.floor(ageDays)} days old.`, action: "Refresh metrics before making a content decision.", evidence: { snapshot_at: row.snapshot_at } };
  const engagement = number(row.likes) + number(row.comments) + number(row.shares) + number(row.saves);
  const clicks = number(row.clicks);
  if (clicks === 0 && engagement >= 5) return { type: "improve_cta", priority: 65, reason: "Observed engagement exists but no verified link clicks are recorded.", action: "Prepare a new draft with a clearer B2B quote, catalogue or factory-call CTA.", evidence: { engagement, clicks } };
  const denominator = Math.max(number(row.reach), number(row.impressions), number(row.views), 1);
  const rate = engagement / denominator * 100;
  if (rate >= 3 && number(row.shares) + number(row.saves) >= 3) return { type: "repurpose", priority: 55, reason: "Verified engagement, shares or saves are comparatively strong.", action: "Prepare a platform-native draft using the same verified angle. Keep owner approval before publication.", evidence: { engagement_rate: rate, shares: row.shares, saves: row.saves } };
  if (!row.tracking_url) return { type: "review_tracking", priority: 45, reason: "Published post has no stored UTM tracking URL.", action: "Prepare a verified HTTPS tracking URL before the next content revision.", evidence: {} };
  return null;
}

function sanitizeMetrics(value: JsonRecord) {
  return {
    impressions: number(value.impressions),
    reach: number(value.reach),
    views: number(value.views),
    likes: number(value.likes),
    comments: number(value.comments),
    shares: number(value.shares),
    saves: number(value.saves),
    clicks: number(value.clicks),
    profile_visits: number(value.profile_visits),
    followers_delta: signedNumber(value.followers_delta),
  };
}

function parseMetaMetrics(payload: unknown): JsonRecord {
  const result: JsonRecord = {};
  if (!isRecord(payload) || !Array.isArray(payload.data)) return result;
  for (const entry of payload.data) {
    if (!isRecord(entry) || typeof entry.name !== "string" || !Array.isArray(entry.values)) continue;
    const last = entry.values.at(-1);
    const raw = isRecord(last) ? last.value : 0;
    if (entry.name === "impressions") result.impressions = scalar(raw);
    if (entry.name === "reach") result.reach = scalar(raw);
    if (entry.name === "video_views") result.views = scalar(raw);
    if (entry.name === "post_clicks") result.clicks = scalar(raw);
    if (entry.name === "post_reactions_by_type_total") result.likes = objectTotal(raw);
    if (entry.name === "post_activity_by_action_type" && isRecord(raw)) {
      result.comments = number(raw.comment);
      result.shares = number(raw.share);
      result.profile_visits = number(raw.other);
    }
  }
  return result;
}

function redactItem(item: JsonRecord) {
  return { id: item.id, platform: item.platform, external_post_id: item.external_post_id, external_post_url: item.external_post_url, published_at: item.published_at };
}
function scalar(value: unknown) { return typeof value === "number" ? value : typeof value === "string" ? Number(value) || 0 : objectTotal(value); }
function objectTotal(value: unknown) { return isRecord(value) ? Object.values(value).reduce((sum, current) => sum + number(current), 0) : number(value); }
function number(value: unknown) { const parsed = Number(value ?? 0); return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0; }
function signedNumber(value: unknown) { const parsed = Number(value ?? 0); return Number.isFinite(parsed) ? Math.trunc(parsed) : 0; }
function clamp(value: unknown, min: number, max: number, fallback: number) { const parsed = Number(value); return Number.isFinite(parsed) ? Math.max(min, Math.min(max, Math.floor(parsed))) : fallback; }
function isRecord(value: unknown): value is JsonRecord { return Boolean(value && typeof value === "object" && !Array.isArray(value)); }
async function safeJson(response: Response): Promise<unknown> { try { return await response.json(); } catch { return {}; } }
function readError(value: unknown, fallback: string) { if (isRecord(value) && typeof value.error === "string") return value.error; if (isRecord(value) && isRecord(value.error) && typeof value.error.message === "string") return value.error.message; return fallback; }
function json(value: unknown, status = 200) { return new Response(JSON.stringify(value), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
