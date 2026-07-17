// Admin-only, read-only release evidence for Irha Apparels.
// No deployment, migration, message, payment, shipment or data mutation occurs here.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const REPOSITORY = "irhaapparelsofficial-ctrl/irha-global-craft-f3881330";
const APEX_ORIGIN = "https://irhaapparels.com";
const WWW_ORIGIN = "https://www.irhaapparels.com";
const OWNER_PROJECT_REF = "pvzjiozismyxqrzmtfbi";
const REQUIRED_HEADERS = [
  "strict-transport-security",
  "content-security-policy",
  "x-content-type-options",
  "referrer-policy",
  "permissions-policy",
] as const;

const allowedOrigins = new Set([
  APEX_ORIGIN,
  WWW_ORIGIN,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

function corsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  const previewAllowed = /^https:\/\/[a-z0-9-]+\.irha-apparels\.pages\.dev$/i.test(origin);
  const allowOrigin = allowedOrigins.has(origin) || previewAllowed ? origin : APEX_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

type JsonRecord = Record<string, unknown>;
type WorkflowRun = {
  id?: number;
  name?: string;
  head_sha?: string;
  head_branch?: string;
  status?: string;
  conclusion?: string | null;
  html_url?: string;
  run_number?: number;
  created_at?: string;
  updated_at?: string;
};

Deno.serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, cors);

  try {
    const origin = req.headers.get("Origin") ?? "";
    if (origin && cors["Access-Control-Allow-Origin"] !== origin) {
      return json({ error: "Origin not allowed" }, 403, cors);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: "Unauthorized" }, 401, cors);

    const { data: roleRow, error: roleError } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (roleError || !roleRow) return json({ error: "Admin only" }, 403, cors);

    const body = await safeRequestJson(req);
    if (body.action !== "read") return json({ error: "Unsupported action" }, 400, cors);

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const [github, production, database] = await Promise.all([
      collectGitHubEvidence(),
      collectProductionEvidence(),
      collectDatabaseEvidence(service),
    ]);

    const parity = Boolean(
      github.latest_main_sha
      && production.source_sha
      && github.latest_main_sha === production.source_sha,
    );
    const criticalHeadersReady = REQUIRED_HEADERS.every(
      (header) => production.security_headers[header]?.present === true,
    ) && production.security_headers["content-security-policy"]?.frame_ancestors === true;

    const blockers: string[] = [];
    if (!github.latest_main_sha) blockers.push("latest_github_main_unavailable");
    if (production.home_status !== 200) blockers.push("production_home_not_200");
    if (production.build_status !== 200) blockers.push("production_build_identity_not_200");
    if (!production.source_sha) blockers.push("production_source_sha_unavailable");
    if (production.source_identity_state !== "verified") blockers.push("production_source_identity_unverified");
    if (production.source_branch !== "main") blockers.push("production_source_branch_not_main");
    if (production.repository !== REPOSITORY) blockers.push("production_repository_identity_mismatch");
    if (!parity) blockers.push("production_main_sha_mismatch_or_unproven");
    if (!production.www_redirect.ok) blockers.push("www_canonical_redirect_failed");
    if (!production.not_found.ok) blockers.push("real_404_failed");
    if (!criticalHeadersReady) blockers.push("security_headers_incomplete");
    if (!production.sitemap.ok || production.sitemap.url_count === 0) blockers.push("sitemap_missing_or_empty");
    if (production.supabase_project_ref !== OWNER_PROJECT_REF) blockers.push("wrong_production_supabase_project");

    const warnings: string[] = [];
    if (github.quality_gate?.conclusion !== "success") warnings.push("latest_quality_gate_not_green");
    if (github.dependency_security?.conclusion !== "success") warnings.push("dependency_security_missing_or_not_green");
    if (github.production_smoke?.conclusion !== "success") warnings.push("production_smoke_missing_or_not_green");
    if (github.cloudflare_release?.conclusion !== "success") warnings.push("cloudflare_release_missing_or_not_green");
    if (!database.read_ok) warnings.push("database_release_evidence_incomplete");
    if (!database.sitemap.last_success_at) warnings.push("search_console_sitemap_never_succeeded");
    if (database.backup.status !== "verified") warnings.push("fresh_backup_unverified");
    if (database.operations.overall_status && database.operations.overall_status !== "ready") warnings.push("operations_health_degraded");

    return json({
      ok: blockers.length === 0,
      checked_at: new Date().toISOString(),
      overall_status: blockers.length ? "blocked" : warnings.length ? "degraded" : "ready",
      repository: REPOSITORY,
      deployment_environment: "production",
      supabase_project_ref: OWNER_PROJECT_REF,
      github,
      production: { ...production, parity_with_latest_main: parity },
      database,
      blockers,
      warnings,
      rollback_reference: production.source_sha || null,
      definitions: {
        ready: "Current live evidence passed every required release check.",
        degraded: "No critical parity failure was found, but one or more required external or backup checks remain incomplete.",
        blocked: "At least one production identity, redirect, 404, header or project-identity requirement failed or could not be proven.",
      },
      destructive_write: false,
    }, 200, cors);
  } catch (error) {
    console.error("release-health error", error);
    return json({
      error: error instanceof Error ? redact(error.message) : "Release health failed",
      destructive_write: false,
    }, 500, cors);
  }
});

async function collectGitHubEvidence() {
  const token = Deno.env.get("GITHUB_READ_TOKEN") || Deno.env.get("GITHUB_TOKEN") || "";
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "irha-release-health",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const [commitResult, runsResult] = await Promise.all([
    fetchJson(`https://api.github.com/repos/${REPOSITORY}/commits/main`, { headers }),
    fetchJson(`https://api.github.com/repos/${REPOSITORY}/actions/runs?branch=main&per_page=100`, { headers }),
  ]);

  const commit = isObject(commitResult.data) ? commitResult.data : {};
  const runsPayload = isObject(runsResult.data) ? runsResult.data : {};
  const runs = Array.isArray(runsPayload.workflow_runs)
    ? runsPayload.workflow_runs.filter(isObject) as WorkflowRun[]
    : [];

  const latestMain = typeof commit.sha === "string" ? commit.sha : null;
  const latest = (predicate: (run: WorkflowRun) => boolean) =>
    runs.find((run) => run.head_branch === "main" && predicate(run)) ?? null;

  return {
    configured: Boolean(token),
    accessible: commitResult.ok && runsResult.ok,
    latest_main_sha: latestMain,
    quality_gate: compactRun(latest((run) => run.name === "Quality Gate")),
    dependency_security: compactRun(latest((run) => /dependency.*security|security.*dependency/i.test(run.name ?? ""))),
    production_smoke: compactRun(latest((run) => /production smoke/i.test(run.name ?? ""))),
    cloudflare_release: compactRun(latest((run) => /cloudflare.*(reconcile|production)|production.*cloudflare/i.test(run.name ?? ""))),
    note: commitResult.ok && runsResult.ok
      ? token ? "GitHub release evidence read with an admin-only server secret." : "GitHub repository was readable without a token."
      : "GitHub evidence is unavailable. Configure an admin-only GITHUB_READ_TOKEN if the repository is private or rate-limited.",
    http_status: { commit: commitResult.status, runs: runsResult.status },
  };
}

async function collectProductionEvidence() {
  const stamp = Date.now();
  const randomPath = `/__irha-release-health-not-found-${stamp}`;
  const [home, build, www, notFound, sitemap] = await Promise.all([
    fetchWithTimeout(`${APEX_ORIGIN}/?release_health=${stamp}`, { redirect: "manual" }, 12_000),
    fetchWithTimeout(`${APEX_ORIGIN}/build.json?release_health=${stamp}`, { redirect: "manual" }, 12_000),
    fetchWithTimeout(`${WWW_ORIGIN}/products/sportswear?release_health=${stamp}`, { redirect: "manual" }, 12_000),
    fetchWithTimeout(`${APEX_ORIGIN}${randomPath}`, { redirect: "manual" }, 12_000),
    fetchWithTimeout(`${APEX_ORIGIN}/sitemap.xml?release_health=${stamp}`, { redirect: "manual" }, 12_000),
  ]);

  const manifest = build.ok ? await safeResponseJson(build) : {};
  const sitemapText = sitemap.ok ? await sitemap.text() : "";
  const sourceSha = stringValue(manifest.source_commit)
    || stringValue(manifest.source_sha)
    || stringValue(manifest.git_sha)
    || null;
  const csp = home.headers.get("content-security-policy") ?? "";

  const securityHeaders = Object.fromEntries(REQUIRED_HEADERS.map((name) => [name, {
    present: Boolean(home.headers.get(name)),
    value: sanitizeHeader(home.headers.get(name)),
    ...(name === "content-security-policy" ? { frame_ancestors: /(?:^|;)\s*frame-ancestors\s+/i.test(csp) } : {}),
  }])) as Record<string, { present: boolean; value: string | null; frame_ancestors?: boolean }>;

  const location = www.headers.get("location");
  const wwwRedirectOk = (www.status === 301 || www.status === 308)
    && Boolean(resolveUrl(location, WWW_ORIGIN)?.startsWith(`${APEX_ORIGIN}/products/sportswear`));

  return {
    home_status: home.status,
    build_status: build.status,
    source_sha: sourceSha,
    source_identity_state: stringValue(manifest.source_identity_state) || null,
    source_branch: stringValue(manifest.source_branch) || null,
    built_at: stringValue(manifest.built_at) || null,
    build_fingerprint: stringValue(manifest.build_fingerprint) || null,
    application_fingerprint: stringValue(manifest.application_fingerprint) || null,
    supabase_project_ref: stringValue(manifest.supabase_project_id) || null,
    repository: stringValue(manifest.repository) || null,
    www_redirect: {
      ok: wwwRedirectOk,
      status: www.status,
      location: location ? resolveUrl(location, WWW_ORIGIN) : null,
      marker: sanitizeHeader(www.headers.get("x-irha-canonical-redirect")),
    },
    not_found: {
      ok: notFound.status === 404,
      status: notFound.status,
      path: randomPath,
    },
    security_headers: securityHeaders,
    sitemap: {
      ok: sitemap.ok,
      status: sitemap.status,
      url_count: (sitemapText.match(/<loc>/g) || []).length,
    },
  };
}

async function collectDatabaseEvidence(service: ReturnType<typeof createClient>) {
  const [operations, sitemap, checkpoint, inquiryCount, catalogueCount, submissionCount] = await Promise.all([
    service.from("operations_health_snapshots")
      .select("id,overall_status,components,metrics,blockers,checked_at")
      .order("checked_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    service.from("sitemap_submission_control")
      .select("id,last_attempt_at,last_success_at,last_http_status,last_error,last_request_id,updated_at")
      .eq("id", "default")
      .maybeSingle(),
    service.from("backend_activation_checkpoints")
      .select("checkpoint_key,project_ref,auth_user_count,admin_role_count,recorded_migration_count,created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    service.from("inquiries").select("id", { head: true, count: "exact" }),
    service.from("catalogue_leads").select("id", { head: true, count: "exact" }),
    service.from("public_submission_events").select("id", { head: true, count: "exact" }),
  ]);

  const errors = [operations.error, sitemap.error, checkpoint.error, inquiryCount.error, catalogueCount.error, submissionCount.error]
    .filter(Boolean)
    .map((error) => redact(error?.message ?? "Database read failed"));

  const latestCheckpoint = checkpoint.data as JsonRecord | null;
  const sitemapRow = sitemap.data as JsonRecord | null;
  const operationsRow = operations.data as JsonRecord | null;

  return {
    read_ok: errors.length === 0,
    errors,
    operations: {
      overall_status: stringValue(operationsRow?.overall_status),
      checked_at: stringValue(operationsRow?.checked_at),
      blockers: Array.isArray(operationsRow?.blockers) ? operationsRow?.blockers : [],
      metrics: isObject(operationsRow?.metrics) ? operationsRow?.metrics : {},
    },
    sitemap: {
      last_attempt_at: stringValue(sitemapRow?.last_attempt_at),
      last_success_at: stringValue(sitemapRow?.last_success_at),
      last_http_status: numberValue(sitemapRow?.last_http_status),
      last_error: redact(stringValue(sitemapRow?.last_error) || "") || null,
      last_request_id: numberValue(sitemapRow?.last_request_id),
    },
    forms: {
      inquiry_rows: inquiryCount.count ?? null,
      catalogue_request_rows: catalogueCount.count ?? null,
      submission_audit_rows: submissionCount.count ?? null,
      controlled_current_release_test: "unverified",
    },
    backup: {
      status: "unverified",
      identifier: null,
      note: "The database exposes an activation checkpoint, not proof of a fresh restorable backup. A verified backup identifier is required before production DDL.",
    },
    latest_checkpoint: latestCheckpoint ? {
      key: stringValue(latestCheckpoint.checkpoint_key),
      project_ref: stringValue(latestCheckpoint.project_ref),
      auth_user_count: numberValue(latestCheckpoint.auth_user_count),
      admin_role_count: numberValue(latestCheckpoint.admin_role_count),
      recorded_migration_count: numberValue(latestCheckpoint.recorded_migration_count),
      created_at: stringValue(latestCheckpoint.created_at),
    } : null,
  };
}

function compactRun(run: WorkflowRun | null) {
  if (!run) return null;
  return {
    id: run.id ?? null,
    name: run.name ?? null,
    head_sha: run.head_sha ?? null,
    status: run.status ?? null,
    conclusion: run.conclusion ?? null,
    run_number: run.run_number ?? null,
    created_at: run.created_at ?? null,
    updated_at: run.updated_at ?? null,
    url: run.html_url ? resolveUrl(run.html_url, "https://github.com") : null,
  };
}

async function fetchJson(url: string, init: RequestInit = {}) {
  try {
    const response = await fetchWithTimeout(url, init, 12_000);
    const data = await safeResponseJson(response);
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, status: 0, data: { error: error instanceof Error ? redact(error.message) : "Request failed" } };
  }
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
}

async function safeRequestJson(req: Request): Promise<JsonRecord> {
  try {
    const value = await req.json();
    return isObject(value) ? value : {};
  } catch {
    return {};
  }
}

async function safeResponseJson(response: Response): Promise<JsonRecord> {
  const text = await response.text();
  if (!text) return {};
  try {
    const value = JSON.parse(text);
    return isObject(value) ? value : {};
  } catch {
    return {};
  }
}

function isObject(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function sanitizeHeader(value: string | null) {
  if (!value) return null;
  return value.replace(/[\r\n]/g, " ").slice(0, 500);
}

function resolveUrl(value: string | null, base: string) {
  if (!value) return null;
  try {
    const url = new URL(value, base);
    url.username = "";
    url.password = "";
    return url.toString().slice(0, 500);
  } catch {
    return null;
  }
}

function redact(value: string) {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, "Bearer [redacted]")
    .replace(/((?:api[_-]?key|token|secret|password))\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]")
    .slice(0, 500);
}

function json(payload: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
