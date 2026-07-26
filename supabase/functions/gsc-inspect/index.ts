// Inspects Google Search Console indexing status for a batch of Irha Apparels URLs.
// Admin-only and read-only: validates JWT and `user_roles.role = 'admin'`.
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  getGscOAuthConfigurationPresence,
  googleSearchConsoleFetch,
  type GscOAuthFailureCode,
} from "../_shared/googleSearchConsoleOAuth.ts";

const GSC_SITE_PROPERTY = "sc-domain:irhaapparels.com";
const URL_INSPECTION_ENDPOINT = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect";
const MAX_INSPECTION_URLS = 25;
const ALLOWED_HOSTNAMES = new Set(["irhaapparels.com", "www.irhaapparels.com"]);

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

function jsonResp(payload: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function effectiveSearchConsoleProperty() {
  const configured = Deno.env.get("GSC_SITE_URL")?.trim();
  if (configured && configured !== GSC_SITE_PROPERTY) {
    return { property: null, error: "gsc_property_configuration_invalid" as const };
  }
  return { property: GSC_SITE_PROPERTY, error: null };
}

function allowedInspectionUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      && !url.username
      && !url.password
      && ALLOWED_HOSTNAMES.has(url.hostname);
  } catch {
    return false;
  }
}

async function requireAdmin(req: Request, headers: Record<string, string>): Promise<Response | null> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return jsonResp({ error: "Unauthorized" }, 401, headers);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userResult, error: userError } = await sb.auth.getUser();
  const user = userResult?.user;
  if (userError || !user) return jsonResp({ error: "Unauthorized" }, 401, headers);
  const { data: roleRow, error: roleError } = await sb
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (roleError || !roleRow) return jsonResp({ error: "Forbidden — admin only" }, 403, headers);
  return null;
}

interface InspectResult {
  url: string;
  verdict?: string;
  coverageState?: string;
  robotsTxtState?: string;
  indexingState?: string;
  pageFetchState?: string;
  lastCrawlTime?: string;
  googleCanonical?: string;
  userCanonical?: string;
  sitemap?: string[];
  inspectionLink?: string;
  error?: string;
  code?: GscOAuthFailureCode;
}

type InspectionPayload = {
  inspectionResult?: {
    inspectionResultLink?: unknown;
    indexStatusResult?: Record<string, unknown>;
  };
};

function safeFailureMessage(code: GscOAuthFailureCode) {
  if (code === "gsc_oauth_not_configured") return "Google Search Console OAuth is not configured";
  if (code === "gsc_oauth_invalid_client") return "Google OAuth client authentication failed";
  if (code === "gsc_oauth_reauthorization_required") return "Google OAuth reauthorization is required";
  if (code === "gsc_oauth_rate_limited") return "Google OAuth is temporarily rate limited";
  return "Google Search Console inspection request failed";
}

async function inspect(url: string, property: string): Promise<InspectResult> {
  const result = await googleSearchConsoleFetch<InspectionPayload>(URL_INSPECTION_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inspectionUrl: url, siteUrl: property }),
  });
  if (!result.ok) return { url, error: safeFailureMessage(result.code), code: result.code };

  const inspection = result.data?.inspectionResult ?? {};
  const index = inspection.indexStatusResult ?? {};
  return {
    url,
    verdict: typeof index.verdict === "string" ? index.verdict : undefined,
    coverageState: typeof index.coverageState === "string" ? index.coverageState : undefined,
    robotsTxtState: typeof index.robotsTxtState === "string" ? index.robotsTxtState : undefined,
    indexingState: typeof index.indexingState === "string" ? index.indexingState : undefined,
    pageFetchState: typeof index.pageFetchState === "string" ? index.pageFetchState : undefined,
    lastCrawlTime: typeof index.lastCrawlTime === "string" ? index.lastCrawlTime : undefined,
    googleCanonical: typeof index.googleCanonical === "string" ? index.googleCanonical : undefined,
    userCanonical: typeof index.userCanonical === "string" ? index.userCanonical : undefined,
    sitemap: Array.isArray(index.sitemap)
      ? index.sitemap.filter((value): value is string => typeof value === "string").slice(0, 20)
      : undefined,
    inspectionLink: typeof inspection.inspectionResultLink === "string"
      ? inspection.inspectionResultLink
      : undefined,
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return jsonResp({ error: "Method not allowed" }, 405, headers);
  if (origin && !isAllowedOrigin(origin)) return jsonResp({ error: "Origin not allowed" }, 403, headers);

  const denied = await requireAdmin(req, headers);
  if (denied) return denied;

  try {
    const site = effectiveSearchConsoleProperty();
    if (site.error || !site.property) {
      return jsonResp({ error: "Invalid Google Search Console property configuration", code: "gsc_property_configuration_invalid" }, 503, headers);
    }

    const configuration = getGscOAuthConfigurationPresence();
    if (!configuration.oauth_client_id || !configuration.oauth_client_secret || !configuration.oauth_refresh_token) {
      return jsonResp({ error: "Google Search Console OAuth is not configured", code: "gsc_oauth_not_configured" }, 503, headers);
    }

    const { urls } = await req.json();
    if (!Array.isArray(urls) || urls.length === 0) return jsonResp({ error: "urls[] required" }, 400, headers);
    if (urls.length > MAX_INSPECTION_URLS) {
      return jsonResp({ error: `A maximum of ${MAX_INSPECTION_URLS} URLs is allowed` }, 400, headers);
    }
    if (!urls.every(allowedInspectionUrl)) {
      return jsonResp({ error: "Only HTTPS URLs on irhaapparels.com or www.irhaapparels.com are allowed" }, 400, headers);
    }

    const results: InspectResult[] = [];
    for (const url of urls) results.push(await inspect(url, site.property));
    return jsonResp({ ok: true, property: site.property, results }, 200, headers);
  } catch {
    console.error("gsc-inspect unhandled failure");
    return jsonResp({ error: "Google Search Console inspection failed", code: "gsc_google_request_failed" }, 500, headers);
  }
});
