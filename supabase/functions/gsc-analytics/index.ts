// Google Search Console analytics for the private owner admin.
// Read-only: validates the caller, checks admin role and returns sanitized evidence.
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
const MAX_ROW_COUNT = 100;
const AUTH_MODE = "google_oauth_refresh_token";

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
  const allowedOrigin = origin && isAllowedOrigin(origin) ? origin : "https://irhaapparels.com";
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

async function requireAdmin(req: Request, headers: Record<string, string>) {
  const authHeader = req.headers.get("Authorization") || "";
  if (!/^Bearer\s+\S+/i.test(authHeader)) return { response: json({ error: "Unauthorized" }, 401, headers) };

  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data: userResult, error: userError } = await client.auth.getUser();
  const user = userResult?.user;
  if (userError || !user) return { response: json({ error: "Unauthorized" }, 401, headers) };

  const { data: role, error: roleError } = await client
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (roleError || !role) return { response: json({ error: "Admin only" }, 403, headers) };
  return { response: null };
}

function effectiveSearchConsoleProperty() {
  const configured = Deno.env.get("GSC_SITE_URL")?.trim();
  if (configured && configured !== GSC_SITE_PROPERTY) {
    return { property: null, error: "gsc_property_configuration_invalid" as const };
  }
  return { property: GSC_SITE_PROPERTY, error: null };
}

function configurationState() {
  const oauth = getGscOAuthConfigurationPresence();
  const site = effectiveSearchConsoleProperty();
  return {
    configuration: {
      ...oauth,
      site_url: Boolean(site.property) && !site.error,
    },
    property: site.property,
    configurationError: site.error,
    oauthConfigured: oauth.oauth_client_id && oauth.oauth_client_secret && oauth.oauth_refresh_token,
  };
}

function safeFailureMessage(code: GscOAuthFailureCode | "gsc_property_configuration_invalid") {
  switch (code) {
    case "gsc_oauth_not_configured":
      return "Google Search Console OAuth is not configured";
    case "gsc_oauth_invalid_client":
      return "Google OAuth client authentication failed";
    case "gsc_oauth_reauthorization_required":
      return "Google OAuth reauthorization is required";
    case "gsc_oauth_rate_limited":
      return "Google OAuth is temporarily rate limited";
    case "gsc_property_configuration_invalid":
      return "Invalid Google Search Console property configuration";
    default:
      return "Google Search Console request failed";
  }
}

type SitesListPayload = {
  siteEntry?: Array<{ siteUrl?: unknown; permissionLevel?: unknown }>;
};

type SearchAnalyticsPayload = {
  rows?: unknown[];
};

async function healthResponse(headers: Record<string, string>) {
  const state = configurationState();
  const google = {
    token_exchange: false,
    property_access: false,
    permission_level: null as string | null,
  };

  let failureCode: GscOAuthFailureCode | "gsc_property_configuration_invalid" | null = null;
  if (state.configurationError || !state.property) {
    failureCode = "gsc_property_configuration_invalid";
  } else if (!state.oauthConfigured) {
    failureCode = "gsc_oauth_not_configured";
  } else {
    const result = await googleSearchConsoleFetch<SitesListPayload>(GSC_SITES_LIST_ENDPOINT, { method: "GET" });
    google.token_exchange = result.token_exchange;
    if (!result.ok) {
      failureCode = result.code;
    } else {
      const exactSite = Array.isArray(result.data?.siteEntry)
        ? result.data.siteEntry.find((entry) => entry?.siteUrl === GSC_SITE_PROPERTY)
        : undefined;
      google.property_access = Boolean(exactSite);
      google.permission_level = typeof exactSite?.permissionLevel === "string"
        ? exactSite.permissionLevel.slice(0, 64)
        : null;
      if (!exactSite) failureCode = "gsc_google_request_failed";
    }
  }

  const ready = !failureCode
    && state.oauthConfigured
    && state.configuration.site_url
    && google.token_exchange
    && google.property_access;

  return json({
    ok: true,
    ready,
    state: ready ? "ready" : "blocked",
    auth_mode: AUTH_MODE,
    configuration: state.configuration,
    google,
    effective_property: state.property,
    site_url: state.property,
    failure_code: ready ? null : failureCode,
  }, 200, headers);
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, headers);
  if (origin && !isAllowedOrigin(origin)) return json({ error: "Origin not allowed" }, 403, headers);

  try {
    const auth = await requireAdmin(req, headers);
    if (auth.response) return auth.response;

    const body = await req.json().catch(() => ({}));
    const action = typeof body?.action === "string" ? body.action : "query";
    if (action === "health") return await healthResponse(headers);

    const state = configurationState();
    if (state.configurationError || !state.property) {
      return json({
        error: safeFailureMessage("gsc_property_configuration_invalid"),
        code: "gsc_property_configuration_invalid",
        configuration: state.configuration,
      }, 503, headers);
    }
    if (!state.oauthConfigured) {
      return json({
        error: safeFailureMessage("gsc_oauth_not_configured"),
        code: "gsc_oauth_not_configured",
        configuration: state.configuration,
      }, 503, headers);
    }

    const dimension = typeof body?.dimension === "string" ? body.dimension : "query";
    const days = Number(body?.days ?? 28);
    if (!ALLOWED_DIMENSIONS.has(dimension)) return json({ error: "Invalid dimension" }, 400, headers);
    if (!ALLOWED_WINDOWS.has(days)) return json({ error: "Days must be 28 or 90" }, 400, headers);

    const end = new Date();
    const start = new Date(end.getTime() - days * 86_400_000);
    const formatDate = (date: Date) => date.toISOString().slice(0, 10);
    const endpoint = `${SEARCH_ANALYTICS_BASE}/${encodeURIComponent(state.property)}/searchAnalytics/query`;
    const upstream = await googleSearchConsoleFetch<SearchAnalyticsPayload>(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startDate: formatDate(start),
        endDate: formatDate(end),
        dimensions: [dimension],
        rowLimit: MAX_ROW_COUNT,
      }),
    });

    if (!upstream.ok) {
      return json({ error: safeFailureMessage(upstream.code), code: upstream.code }, 502, headers);
    }

    return json({
      ok: true,
      dimension,
      days,
      property: state.property,
      site_url: state.property,
      rows: Array.isArray(upstream.data?.rows) ? upstream.data.rows : [],
    }, 200, headers);
  } catch {
    console.error("gsc-analytics unhandled failure");
    return json({ error: "Google Search Console analytics failed", code: "gsc_google_request_failed" }, 500, headers);
  }
});
