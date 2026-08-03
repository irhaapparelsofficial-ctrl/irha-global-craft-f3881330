// Re-submits the canonical sitemap to Google Search Console through the same
// owner-controlled direct Google OAuth source used by the private GSC tools.
// Admin users can trigger it from the private SEO monitor. The daily scheduler
// uses a separate high-entropy Vault token whose SHA-256 digest is safe to keep
// in source; the raw token never leaves Vault or the protected cron request.
import { createClient } from "npm:@supabase/supabase-js@2";
import { googleSearchConsoleFetch } from "../_shared/googleSearchConsoleOAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-irha-sitemap-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SITE_PROPERTY = "sc-domain:irhaapparels.com";
const SITEMAP_URL = "https://irhaapparels.com/sitemap.xml";
const SCHEDULER_TOKEN_HASH = "c2afdce4118bd4604f4090fe17fb7f4b4e54ca7f45ba8b069b1ab9fa7ec33368";

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
  const schedulerToken = req.headers.get("x-irha-sitemap-token") || "";
  if (/^[A-Za-z0-9_-]{40,120}$/.test(schedulerToken)) {
    const providedHash = await sha256Hex(schedulerToken);
    if (constantTimeEqual(providedHash, SCHEDULER_TOKEN_HASH)) return null;
  }

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

  const siteEnc = encodeURIComponent(SITE_PROPERTY);
  const sitemapEnc = encodeURIComponent(SITEMAP_URL);
  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${siteEnc}/sitemaps/${sitemapEnc}`;
  const upstream = await googleSearchConsoleFetch<null>(endpoint, { method: "PUT" });

  if (!upstream.ok) {
    console.error("sitemap-ping direct Google request failed", upstream.code, upstream.upstream_status ?? "no-status");
    const status = upstream.code === "gsc_oauth_not_configured" ? 503 : 502;
    return json({
      error: upstream.code,
      property: SITE_PROPERTY,
      sitemap: SITEMAP_URL,
      upstream_status: upstream.upstream_status ?? null,
    }, status);
  }

  return json({
    ok: true,
    status: upstream.status,
    property: SITE_PROPERTY,
    sitemap: SITEMAP_URL,
    submitted_at: new Date().toISOString(),
  }, 200);
});

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}
