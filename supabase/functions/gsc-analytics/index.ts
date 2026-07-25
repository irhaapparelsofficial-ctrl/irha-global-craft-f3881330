// Google Search Console analytics for the private owner admin.
// Read-only: validates the caller, checks admin role and returns exact connector results.
import { createClient } from "npm:@supabase/supabase-js@2";

function gscManagedConnectorKey(): string | undefined {
  return Deno.env.get("LOVABLE_API_KEY") || undefined;
}

const GSC_SITE_PROPERTY = "sc-domain:irhaapparels.com";
const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";
const ALLOWED_DIMENSIONS = new Set(["query", "page", "country", "device"]);
const ALLOWED_WINDOWS = new Set([28, 90]);

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
    return { property: null, error: "Invalid Google Search Console property configuration" };
  }
  return { property: GSC_SITE_PROPERTY, error: null };
}

function connectionState() {
  const connectorGatewayKey = Boolean(gscManagedConnectorKey());
  const searchConsoleConnectionKey = Boolean(Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY"));
  const site = effectiveSearchConsoleProperty();
  return {
    ready: connectorGatewayKey && searchConsoleConnectionKey && Boolean(site.property) && !site.error,
    configuration: {
      connector_gateway_key: connectorGatewayKey,
      search_console_connection_key: searchConsoleConnectionKey,
      site_url: Boolean(site.property) && !site.error,
    },
    site_url: site.property,
    configuration_error: site.error,
  };
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
    const state = connectionState();

    if (state.configuration_error) {
      return json({
        error: state.configuration_error,
        code: "gsc_property_configuration_invalid",
        configuration: state.configuration,
      }, 503, headers);
    }

    if (action === "health") {
      return json({
        ok: true,
        ready: state.ready,
        state: state.ready ? "ready" : "blocked",
        configuration: state.configuration,
        site_url: state.site_url,
        notes: ["Secret values are never returned.", "Health performs no Search Console query."],
      }, 200, headers);
    }

    if (!state.ready || !state.site_url) {
      return json({
        error: "Google Search Console connection is not configured",
        code: "gsc_connection_not_configured",
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
    const connectorToken = gscManagedConnectorKey()!;
    const connectionKey = Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY")!;
    const endpoint = `${GATEWAY}/webmasters/v3/sites/${encodeURIComponent(state.site_url)}/searchAnalytics/query`;

    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${connectorToken}`,
        "X-Connection-Api-Key": connectionKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate: formatDate(start),
        endDate: formatDate(end),
        dimensions: [dimension],
        rowLimit: 100,
      }),
    });

    const payload = await upstream.json().catch(() => ({})) as Record<string, unknown>;
    if (!upstream.ok) {
      return json({
        error: `Google Search Console returned HTTP ${upstream.status}`,
        code: "gsc_upstream_error",
      }, 502, headers);
    }

    return json({
      ok: true,
      dimension,
      days,
      property: state.site_url,
      site_url: state.site_url,
      rows: Array.isArray(payload.rows) ? payload.rows : [],
    }, 200, headers);
  } catch (error) {
    console.error("gsc-analytics error", error instanceof Error ? error.message : error);
    return json({ error: "Google Search Console analytics failed" }, 500, headers);
  }
});
