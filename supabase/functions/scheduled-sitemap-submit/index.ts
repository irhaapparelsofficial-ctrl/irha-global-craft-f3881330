import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

function irhaLovableRuntimeKey(): string | undefined {
  if (Deno.env.get("IRHA_ENABLE_LOVABLE_RUNTIME") !== "true") return undefined;
  return Deno.env.get("LOVABLE_API_KEY") || undefined;
}

const SITE_PROPERTY = "sc-domain:irhaapparels.com";
const SITEMAP_URL = "https://irhaapparels.com/sitemap.xml";

type Json = Record<string, unknown>;

const json = (payload: unknown, status = 200) => new Response(JSON.stringify(payload), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  },
});

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const token = req.headers.get("x-irha-sitemap-token") || "";
  if (!/^[A-Za-z0-9_-]{40,120}$/.test(token)) return json({ error: "unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const gatewayKey = irhaLovableRuntimeKey() || "";
  if (!supabaseUrl || !serviceRoleKey || !gatewayKey) return json({ error: "runtime_not_configured" }, 500);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: claimed, error: claimError } = await supabase.rpc("claim_sitemap_submission", {
    _token: token,
  });
  if (claimError) return json({ error: "claim_failed" }, 500);
  if (claimed !== true) return json({ ok: true, skipped: true, reason: "not_due_or_invalid" });

  let httpStatus = 0;
  try {
    const endpoint = `https://ai.gateway.lovable.dev/google-search-console/webmasters/v3/sites/${encodeURIComponent(SITE_PROPERTY)}/sitemaps/${encodeURIComponent(SITEMAP_URL)}`;
    const response = await fetch(endpoint, {
      method: "PUT",
      headers: {
        authorization: `Bearer ${gatewayKey}`,
        "content-type": "application/json",
      },
      signal: AbortSignal.timeout(45_000),
    });
    httpStatus = response.status;
    const text = await response.text();

    if (!response.ok) {
      await recordResult(supabase, token, false, response.status, `google_submission_failed:${text.slice(0, 500)}`);
      return json({ ok: false, error: "google_submission_failed", status: response.status }, 502);
    }

    await recordResult(supabase, token, true, response.status, null);
    return json({
      ok: true,
      submitted: true,
      site_property: SITE_PROPERTY,
      sitemap: SITEMAP_URL,
      status: response.status,
      submitted_at: new Date().toISOString(),
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    await recordResult(supabase, token, false, httpStatus, detail.slice(0, 500));
    return json({ ok: false, error: "submission_request_failed" }, 502);
  }
});

async function recordResult(
  supabase: ReturnType<typeof createClient>,
  token: string,
  ok: boolean,
  status: number,
  error: string | null,
) {
  const { error: recordError } = await supabase.rpc("record_sitemap_submission_result", {
    _token: token,
    _ok: ok,
    _http_status: status,
    _error: error,
  });
  if (recordError) console.error("record_sitemap_submission_result", recordError.message);
}
