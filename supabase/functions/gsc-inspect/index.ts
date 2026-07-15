// Inspects Google Search Console indexing status for a batch of URLs.
// Admin-only: validates JWT and `user_roles.role = 'admin'`.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_SITE_URL = "sc-domain:irhaapparels.com";
const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";

function jsonResp(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function searchConsoleProperty() {
  return (Deno.env.get("GSC_SITE_URL") || DEFAULT_SITE_URL).trim();
}

async function requireAdmin(req: Request): Promise<Response | null> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return jsonResp({ error: "Unauthorized" }, 401);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: ud } = await sb.auth.getUser();
  if (!ud?.user) return jsonResp({ error: "Unauthorized" }, 401);
  const { data: roleRow } = await sb.from("user_roles").select("role").eq("user_id", ud.user.id).eq("role", "admin").maybeSingle();
  if (!roleRow) return jsonResp({ error: "Forbidden — admin only" }, 403);
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

async function inspect(url: string): Promise<InspectResult> {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const gscKey = Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY");
  if (!lovableKey || !gscKey) return { url, error: "Missing API credentials" };

  try {
    const res = await fetch(`${GATEWAY}/v1/urlInspection/index:inspect`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": gscKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inspectionUrl: url,
        siteUrl: searchConsoleProperty(),
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { url, error: `HTTP ${res.status}: ${text.slice(0, 200)}` };
    }
    const data = await res.json();
    const r = data.inspectionResult ?? {};
    const idx = r.indexStatusResult ?? {};
    return {
      url,
      verdict: idx.verdict,
      coverageState: idx.coverageState,
      robotsTxtState: idx.robotsTxtState,
      indexingState: idx.indexingState,
      pageFetchState: idx.pageFetchState,
      lastCrawlTime: idx.lastCrawlTime,
      googleCanonical: idx.googleCanonical,
      userCanonical: idx.userCanonical,
      sitemap: idx.sitemap,
      inspectionLink: r.inspectionResultLink,
    };
  } catch (e) {
    return { url, error: (e as Error).message };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResp({ error: "Method not allowed" }, 405);

  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const { urls } = await req.json();
    if (!Array.isArray(urls) || urls.length === 0) return jsonResp({ error: "urls[] required" }, 400);
    const safe = urls
      .filter((u: unknown): u is string => typeof u === "string" && u.startsWith("https://"))
      .slice(0, 25);

    // Sequential to respect GSC quota (approximately 600/minute; conservative here).
    const results: InspectResult[] = [];
    for (const u of safe) {
      results.push(await inspect(u));
    }
    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("gsc-inspect error", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});