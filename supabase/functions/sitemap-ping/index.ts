// Re-submits the canonical sitemap to Google Search Console.
// Admin users can trigger it from the private SEO monitor; service-role callers
// remain supported for a future secure scheduler. Submission is idempotent.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SITE_PROPERTY = "sc-domain:irhaapparels.com";
const SITEMAP_URL = "https://irhaapparels.com/sitemap.xml";
const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function parseJwtRole(token: string): string | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const decoded = JSON.parse(atob(padded));
    return typeof decoded.role === "string" ? decoded.role : null;
  } catch {
    return null;
  }
}

async function authorize(req: Request): Promise<Response | null> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Unauthorized" }, 401);
  if (parseJwtRole(token) === "service_role") return null;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) return json({ error: "Authentication is not configured" }, 500);

  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userResult, error: userError } = await client.auth.getUser();
  const user = userResult?.user;
  if (userError || !user) return json({ error: "Unauthorized" }, 401);

  const { data: adminRole, error: roleError } = await client
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (roleError || !adminRole) return json({ error: "Admin only" }, 403);
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const denied = await authorize(req);
  if (denied) return denied;

  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const gscKey = Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY");
  if (!lovableKey || !gscKey) return json({ error: "Google Search Console connection is not configured" }, 503);

  try {
    const siteEnc = encodeURIComponent(SITE_PROPERTY);
    const sitemapEnc = encodeURIComponent(SITEMAP_URL);
    const upstream = await fetch(
      `${GATEWAY}/webmasters/v3/sites/${siteEnc}/sitemaps/${sitemapEnc}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": gscKey,
        },
      },
    );

    const raw = await upstream.text();
    console.log("sitemap-ping", upstream.status, raw.slice(0, 200));
    if (!upstream.ok) {
      return json({
        error: `Google Search Console returned HTTP ${upstream.status}`,
        property: SITE_PROPERTY,
        sitemap: SITEMAP_URL,
        detail: raw.slice(0, 300),
      }, 502);
    }

    return json({
      ok: true,
      status: upstream.status,
      property: SITE_PROPERTY,
      sitemap: SITEMAP_URL,
      submitted_at: new Date().toISOString(),
    }, 200);
  } catch (error) {
    console.error("sitemap-ping error", error instanceof Error ? error.message : error);
    return json({ error: "Sitemap submission failed" }, 500);
  }
});
