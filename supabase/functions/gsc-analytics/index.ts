// GSC Search Analytics — returns top queries / pages / countries for the property.
// Admin-only: validates the caller's JWT and checks `user_roles.role = 'admin'`.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";
const SITE_URL = "https://irhaapparels.com/";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // ── auth: must be an admin ───────────────────────────────
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Unauthorized" }, 401);

    const supaUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const sb = createClient(supaUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });

    const { data: userRes, error: uErr } = await sb.auth.getUser();
    if (uErr || !userRes.user) return json({ error: "Unauthorized" }, 401);
    const { data: roleRow } = await sb.from("user_roles").select("role").eq("user_id", userRes.user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return json({ error: "Forbidden — admin only" }, 403);

    const { dimension = "query", days = 28 } = await req.json().catch(() => ({}));
    if (!["query", "page", "country", "device"].includes(dimension)) {
      return json({ error: "invalid dimension" }, 400);
    }


    const LOVABLE = Deno.env.get("LOVABLE_API_KEY");
    const GSC_KEY = Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY");
    if (!LOVABLE || !GSC_KEY) return json({ error: "Missing connector credentials" }, 500);

    const end = new Date();
    const start = new Date(end.getTime() - Number(days) * 86400000);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    const url = `${GATEWAY}/webmasters/v3/sites/${encodeURIComponent(SITE_URL)}/searchAnalytics/query`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE}`,
        "X-Connection-Api-Key": GSC_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate: fmt(start),
        endDate: fmt(end),
        dimensions: [dimension],
        rowLimit: 100,
      }),
    });

    const body = await res.text();
    if (!res.ok) return json({ error: `GSC ${res.status}: ${body.slice(0, 300)}` }, 502);
    const parsed = JSON.parse(body);
    return json({ rows: parsed.rows ?? [] });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
