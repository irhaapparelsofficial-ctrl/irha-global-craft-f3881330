import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ALLOWED_ORIGINS = new Set([
  "https://irhaapparels.com",
  "https://www.irhaapparels.com",
]);
const MAX_BODY_BYTES = 16_384;

function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "apikey, authorization, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

function json(value: unknown, status: number, origin: string): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "";
  if (!ALLOWED_ORIGINS.has(origin)) {
    return new Response(null, { status: 403, headers: { "Cache-Control": "no-store" } });
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (req.method !== "POST") return json(false, 405, origin);

  const length = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) return json(false, 413, origin);

  const raw = await req.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return json(false, 413, origin);

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return json(false, 400, origin);
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return json(false, 400, origin);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) return json(false, 503, origin);

  const forwardedFor =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for") ??
    "unknown";

  const upstream = await fetch(`${supabaseUrl}/rest/v1/rpc/record_public_app_incident`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
      accept: "application/json",
      origin,
      "x-forwarded-for": forwardedFor.slice(0, 200),
      "user-agent": (req.headers.get("user-agent") ?? "unknown").slice(0, 500),
    },
    body: JSON.stringify(payload),
  });

  if (!upstream.ok) return json(false, 502, origin);
  const accepted = (await upstream.json().catch(() => false)) === true;
  return json(accepted, 200, origin);
});
