import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

function irhaLovableRuntimeKey(): string | undefined {
  if (Deno.env.get("IRHA_ENABLE_LOVABLE_RUNTIME") !== "true") return undefined;
  return Deno.env.get("LOVABLE_API_KEY") || undefined;
}

function gscOAuthConfigured(): boolean {
  return Boolean(
    Deno.env.get("GSC_OAUTH_CLIENT_ID")?.trim() &&
    Deno.env.get("GSC_OAUTH_CLIENT_SECRET")?.trim() &&
    Deno.env.get("GSC_OAUTH_REFRESH_TOKEN")?.trim(),
  );
}

const PROJECT_SITE = "https://irhaapparels.com";
const ALLOWED_ACTIONS = new Set(["health", "heartbeat", "daily", "email_queue", "cleanup", "manual_test"]);
type Json = Record<string, unknown>;

const json = (payload: unknown, status = 200) => new Response(JSON.stringify(payload), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
});

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !serviceKey) return json({ error: "runtime_not_configured" }, 500);
  const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const body = await req.json().catch(() => ({})) as Json;
  const action = typeof body.action === "string" && ALLOWED_ACTIONS.has(body.action) ? body.action : "";
  const triggerSource = body.trigger_source === "manual" ? "manual" : body.trigger_source === "cron" ? "cron" : "system";
  if (!action) return json({ error: "invalid_action" }, 400);

  const token = req.headers.get("x-irha-ops-token") || "";
  if (!/^[0-9a-f-]{36}$/i.test(token)) return json({ error: "unauthorized" }, 401);
  const nowIso = new Date().toISOString();
  const { data: claimed, error: claimError } = await service
    .from("operations_call_tokens")
    .update({ consumed_at: nowIso })
    .eq("id", token)
    .eq("action", action)
    .is("consumed_at", null)
    .gt("expires_at", nowIso)
    .select("id")
    .maybeSingle();
  if (claimError || !claimed) return json({ error: "invalid_or_consumed_token" }, 401);

  const { data: control } = await service.from("operations_control").select("*").eq("id", "default").maybeSingle();
  if (!control?.enabled) return json({ error: "operations_disabled" }, 503);

  const { data: run, error: runError } = await service.from("operations_runs").insert({
    action,
    trigger_source: triggerSource,
    status: "running",
  }).select("id,started_at").single();
  if (runError || !run) return json({ error: runError?.message || "run_create_failed" }, 500);

  const started = Date.now();
  try {
    let result: Json;
    if (action === "email_queue") result = await processEmailQueue(service, url, serviceKey);
    else if (action === "cleanup") result = await cleanup(service);
    else if (action === "daily") result = await daily(service, run.id, control, url, serviceKey);
    else result = await heartbeat(service, run.id, control, action !== "health");

    const status = result.ok === false ? "partial" : "completed";
    const completedAt = new Date().toISOString();
    await service.from("operations_runs").update({
      status,
      completed_at: completedAt,
      duration_ms: Date.now() - started,
      summary: result,
      error: result.ok === false ? String(result.error || "degraded") : null,
    }).eq("id", run.id);

    const controlUpdate: Json = { updated_at: completedAt, last_success_at: completedAt, last_error: null };
    if (action === "heartbeat" || action === "health" || action === "manual_test") controlUpdate.last_heartbeat_at = completedAt;
    if (action === "daily") controlUpdate.last_daily_run_at = completedAt;
    if (action === "email_queue") controlUpdate.last_email_run_at = completedAt;
    await service.from("operations_control").update(controlUpdate).eq("id", "default");
    return json({ ok: status === "completed", run_id: run.id, action, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const completedAt = new Date().toISOString();
    await service.from("operations_runs").update({
      status: "failed",
      completed_at: completedAt,
      duration_ms: Date.now() - started,
      error: message.slice(0, 4000),
    }).eq("id", run.id);
    await service.from("operations_control").update({ last_error: message.slice(0, 4000), updated_at: completedAt }).eq("id", "default");
    console.error("operations-orchestrator", action, message);
    return json({ ok: false, run_id: run.id, action, error: message }, 500);
  }
});

async function daily(service: any, runId: string, control: any, url: string, serviceKey: string): Promise<Json> {
  const { data: planningId, error: planningError } = await service.rpc("create_automation_planning_cycle", { _trigger_source: "system" });
  const [health, sitemapSubmission] = await Promise.all([
    heartbeat(service, runId, control, true),
    submitCanonicalSitemap(url, serviceKey),
  ]);
  const ok = !planningError && health.ok !== false && sitemapSubmission.ok !== false;
  return {
    ok,
    error: ok ? null : "daily_operations_degraded",
    planning_run_id: planningId || null,
    planning_error: planningError?.message || null,
    sitemap_submission: sitemapSubmission,
    health,
    external_messages_sent: false,
    external_posts_published: false,
    owner_approval_preserved: true,
  };
}

async function submitCanonicalSitemap(url: string, serviceKey: string): Promise<Json> {
  try {
    const response = await fetch(`${url}/functions/v1/sitemap-ping`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        "content-type": "application/json",
      },
      body: "{}",
      signal: AbortSignal.timeout(45_000),
    });
    const text = await response.text();
    let payload: unknown = text;
    try { payload = JSON.parse(text); } catch { payload = text.slice(0, 2000); }
    const result = payload && typeof payload === "object" ? payload as Json : {};
    if (!response.ok || result.ok !== true) {
      return {
        ok: false,
        status: response.status,
        error: "sitemap_submission_failed",
        response: payload,
      };
    }
    return {
      ok: true,
      status: response.status,
      site_property: result.site_property || "sc-domain:irhaapparels.com",
      sitemap: result.sitemap || `${PROJECT_SITE}/sitemap.xml`,
      submitted_at: new Date().toISOString(),
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: "sitemap_submission_request_failed",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

async function heartbeat(service: any, runId: string, control: any, recover: boolean): Promise<Json> {
  const staleMinutes = Math.max(10, Math.min(240, Number(control?.stale_run_minutes || 30)));
  const cutoff = new Date(Date.now() - staleMinutes * 60_000).toISOString();
  const recovered: Json = {};

  if (recover) {
    const [automation, campaigns, searches, renders, actions] = await Promise.all([
      service.from("automation_runs").update({ status: "failed", error: "Recovered stale running automation", completed_at: new Date().toISOString() }).eq("status", "running").lt("started_at", cutoff).select("id"),
      service.from("lead_campaigns").update({ status: "paused", error: "Recovered stale running lead campaign" }).eq("status", "running").lt("last_run_at", cutoff).select("id"),
      service.from("lead_search_runs").update({ status: "failed", error: "Recovered stale lead search", completed_at: new Date().toISOString() }).eq("status", "running").lt("started_at", cutoff).select("id"),
      service.from("social_render_jobs").update({ status: "failed", error_message: "Recovered stale render lock", locked_at: null }).in("status", ["queued", "rendering"]).lt("updated_at", cutoff).select("id"),
      service.from("ai_actions").update({ status: "failed", error: "Recovered stale AI action", executed_at: new Date().toISOString() }).eq("status", "running").lt("updated_at", cutoff).select("id"),
    ]);
    recovered.automation_runs = automation.data?.length || 0;
    recovered.lead_campaigns = campaigns.data?.length || 0;
    recovered.lead_search_runs = searches.data?.length || 0;
    recovered.social_render_jobs = renders.data?.length || 0;
    recovered.ai_actions = actions.data?.length || 0;
  }

  const [products, categories, leads, tasks, inquiries, outreachDrafts, seoDrafts, mediaVerified, socialAccounts, recentFailures] = await Promise.all([
    count(service, "products", { column: "is_published", value: true }),
    count(service, "categories", { column: "is_published", value: true }),
    count(service, "b2b_leads"),
    count(service, "crm_tasks", { column: "status", values: ["open", "in_progress", "pending"] }),
    count(service, "inquiries"),
    count(service, "outreach_messages", { column: "status", value: "draft" }),
    count(service, "seo_localized_pages", { column: "status", values: ["draft", "ai_reviewed", "approved"] }),
    count(service, "media_assets", { column: "verification_status", value: "verified" }),
    service.from("social_platform_accounts").select("platform,enabled,verification_status,last_verified_at,last_health"),
    service.from("operations_runs").select("id,action,status,error,started_at").eq("status", "failed").gte("started_at", new Date(Date.now() - 24 * 60 * 60_000).toISOString()).limit(20),
  ]);

  const smokeEnabled = control?.public_smoke_tests_enabled !== false;
  const smoke = smokeEnabled ? await publicSmokeTests() : { enabled: false, ok: true, checks: [] };
  const accounts = socialAccounts.data || [];
  const connectedSocial = accounts.filter((row: any) => row.enabled && row.verification_status === "verified").length;
  const providerConfig = {
    ai_gateway: Boolean(irhaLovableRuntimeKey()),
    gsc: gscOAuthConfigured(),
    social_renderer: Boolean(Deno.env.get("SOCIAL_RENDER_PROVIDER") && Deno.env.get("SOCIAL_RENDER_API_URL") && Deno.env.get("SOCIAL_RENDER_API_KEY")),
    whatsapp: Boolean(Deno.env.get("WHATSAPP_ACCESS_TOKEN") && Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")),
  };
  const blockers: string[] = [];
  if (!smoke.ok) blockers.push("public_site_smoke_test_failed");
  if (connectedSocial === 0) blockers.push("social_accounts_not_connected");
  if (!providerConfig.gsc) blockers.push("google_search_console_not_connected");
  if (!providerConfig.whatsapp) blockers.push("whatsapp_cloud_api_not_connected");
  if (!providerConfig.social_renderer) blockers.push("social_renderer_not_connected");

  const components = {
    database: { ready: true },
    catalog: { ready: products >= 1 && categories >= 1, published_products: products, published_categories: categories },
    crm: { ready: true, leads, open_tasks: tasks, inquiries },
    outreach: { ready: true, drafts: outreachDrafts, automatic_sending: false },
    seo: { ready: true, review_queue: seoDrafts, automatic_publishing: false },
    media: { ready: mediaVerified >= 1, verified_assets: mediaVerified },
    public_site: smoke,
    providers: { ...providerConfig, connected_social_accounts: connectedSocial },
  };
  const overall = !smoke.ok ? "failed" : blockers.length ? "degraded" : "healthy";
  const metrics = { products, categories, leads, tasks, inquiries, outreach_drafts: outreachDrafts, seo_review_queue: seoDrafts, media_verified: mediaVerified, recent_operation_failures: recentFailures.data?.length || 0, recovered };

  await service.from("operations_health_snapshots").insert({
    run_id: runId,
    overall_status: overall,
    components,
    metrics,
    blockers,
  });

  return { ok: overall !== "failed", overall_status: overall, components, metrics, blockers, checked_at: new Date().toISOString() };
}

async function processEmailQueue(service: any, url: string, serviceKey: string): Promise<Json> {
  const { data: control } = await service.from("operations_control").select("email_queue_enabled").eq("id", "default").maybeSingle();
  if (control?.email_queue_enabled === false) return { ok: true, skipped: true, reason: "email_queue_disabled" };
  const response = await fetch(`${url}/functions/v1/process-email-queue`, {
    method: "POST",
    headers: { authorization: `Bearer ${serviceKey}`, apikey: serviceKey, "content-type": "application/json" },
    body: JSON.stringify({ trigger: "operations-orchestrator" }),
    signal: AbortSignal.timeout(55_000),
  });
  const text = await response.text();
  let payload: unknown = text;
  try { payload = JSON.parse(text); } catch { payload = text.slice(0, 2000); }
  if (!response.ok) return { ok: false, status: response.status, error: "email_queue_processor_failed", response: payload };
  return { ok: true, status: response.status, response: payload, outreach_drafts_sent: false };
}

async function cleanup(service: any): Promise<Json> {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
  const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60_000).toISOString();
  const [tokens, snapshots] = await Promise.all([
    service.from("operations_call_tokens").delete().lt("expires_at", dayAgo).select("id"),
    service.from("operations_health_snapshots").delete().lt("checked_at", sixMonthsAgo).select("id"),
  ]);
  return { ok: !tokens.error && !snapshots.error, deleted_tokens: tokens.data?.length || 0, deleted_old_health_snapshots: snapshots.data?.length || 0, errors: [tokens.error?.message, snapshots.error?.message].filter(Boolean) };
}

async function publicSmokeTests() {
  const paths = ["/", "/products", "/sitemap.xml"];
  const checks = [];
  for (const path of paths) {
    const started = Date.now();
    try {
      const response = await fetch(`${PROJECT_SITE}${path}`, { redirect: "follow", signal: AbortSignal.timeout(10_000), headers: { "user-agent": "IrhaOperationsHealth/1.0" } });
      checks.push({ path, ok: response.ok, status: response.status, duration_ms: Date.now() - started, final_url: response.url });
    } catch (error) {
      checks.push({ path, ok: false, status: 0, duration_ms: Date.now() - started, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return { enabled: true, ok: checks.every((item: any) => item.ok), checks };
}

async function count(service: any, table: string, filter?: { column: string; value?: unknown; values?: unknown[] }) {
  let query = service.from(table).select("*", { head: true, count: "exact" });
  if (filter?.values) query = query.in(filter.column, filter.values);
  else if (filter && "value" in filter) query = query.eq(filter.column, filter.value);
  const { count, error } = await query;
  if (error) throw new Error(`${table}: ${error.message}`);
  return count || 0;
}
