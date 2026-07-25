// Inspects Google Search Console indexing status for a batch of Irha Apparels URLs.
// Admin-only: validates JWT and `user_roles.role = 'admin'`.
import { createClient } from "npm:@supabase/supabase-js@2";

function gscManagedConnectorKey(): string | undefined {
  return Deno.env.get("LOVABLE_API_KEY") || undefined;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GSC_SITE_PROPERTY = "sc-domain:irhaapparels.com";
const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";
const MAX_INSPECTION_URLS = 25;
const ALLOWED_HOSTNAMES = new Set(["irhaapparels.com", "www.irhaapparels.com"]);

function jsonResp(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function effectiveSearchConsoleProperty() {
  const configured = Deno.env.get("GSC_SITE_URL")?.trim();
  if (configured && configured !== GSC_SITE_PROPERTY) {
    return { property: null, error: "Invalid Google Search Console property configuration" };
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

async function requireAdmin(req: Request): Promise<Response | null> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return jsonResp({ error: "Unauthorized" }, 401);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userResult, error: userError } = await sb.auth.getUser();
  const user = userResult?.user;
  if (userError || !user) return jsonResp({ error: "Unauthorized" }, 401);
  const { data: roleRow, error: roleError } = await sb
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (roleError || !roleRow) return jsonResp({ error: "Forbidden — admin only" }, 403);
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
}

async function inspect(url: string, property: string): Promise<InspectResult> {
  const connectorToken = gscManagedConnectorKey();
  const connectionKey = Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY");
  if (!connectorToken || !connectionKey) return { url, error: "Google Search Console connection is not configured" };

  try {
    const res = await fetch(`${GATEWAY}/v1/urlInspection/index:inspect`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${connectorToken}`,
        "X-Connection-Api-Key": connectionKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inspectionUrl: url,
        siteUrl: property,
      }),
    });
    if (!res.ok) {
      return { url, error: `Google Search Console returned HTTP ${res.status}` };
    }
    const data = await res.json();
    const result = data.inspectionResult ?? {};
    const index = result.indexStatusResult ?? {};
    return {
      url,
      verdict: index.verdict,
      coverageState: index.coverageState,
      robotsTxtState: index.robotsTxtState,
      indexingState: index.indexingState,
      pageFetchState: index.pageFetchState,
      lastCrawlTime: index.lastCrawlTime,
      googleCanonical: index.googleCanonical,
      userCanonical: index.userCanonical,
      sitemap: index.sitemap,
      inspectionLink: result.inspectionResultLink,
    };
  } catch {
    return { url, error: "Google Search Console inspection request failed" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return jsonResp({ error: "Method not allowed" }, 405);

  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const site = effectiveSearchConsoleProperty();
    if (site.error || !site.property) {
      return jsonResp({ error: site.error, code: "gsc_property_configuration_invalid" }, 503);
    }

    const { urls } = await req.json();
    if (!Array.isArray(urls) || urls.length === 0) return jsonResp({ error: "urls[] required" }, 400);
    if (urls.length > MAX_INSPECTION_URLS) {
      return jsonResp({ error: `A maximum of ${MAX_INSPECTION_URLS} URLs is allowed` }, 400);
    }
    if (!urls.every(allowedInspectionUrl)) {
      return jsonResp({ error: "Only HTTPS URLs on irhaapparels.com or www.irhaapparels.com are allowed" }, 400);
    }

    // Sequential to respect the Search Console URL Inspection quota.
    const results: InspectResult[] = [];
    for (const url of urls) {
      results.push(await inspect(url, site.property));
    }
    return jsonResp({ ok: true, property: site.property, results }, 200);
  } catch (error) {
    console.error("gsc-inspect error", error instanceof Error ? error.message : error);
    return jsonResp({ error: "Internal error" }, 500);
  }
});
