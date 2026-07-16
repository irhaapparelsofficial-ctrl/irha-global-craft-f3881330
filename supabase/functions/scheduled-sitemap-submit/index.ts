import "jsr:@supabase/functions-js/edge-runtime.d.ts";

function irhaLovableRuntimeKey(): string | undefined {
  if (Deno.env.get("IRHA_ENABLE_LOVABLE_RUNTIME") !== "true") return undefined;
  return Deno.env.get("LOVABLE_API_KEY") || undefined;
}

const SITE_PROPERTY = "sc-domain:irhaapparels.com";
const SITEMAP_URL = "https://irhaapparels.com/sitemap.xml";
const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";

// A SHA-256 digest is not a credential. The matching raw token is generated
// inside Postgres, stored only in Vault, and injected into the scheduled call.
const SCHEDULER_TOKEN_HASH = "c2afdce4118bd4604f4090fe17fb7f4b4e54ca7f45ba8b069b1ab9fa7ec33368";

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
  const providedHash = await sha256Hex(token);
  if (!constantTimeEqual(providedHash, SCHEDULER_TOKEN_HASH)) return json({ error: "unauthorized" }, 401);

  const lovableKey = irhaLovableRuntimeKey() || "";
  const gscKey = Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY") || "";
  if (!lovableKey || !gscKey) return json({ error: "gsc_connection_not_configured" }, 503);

  try {
    const endpoint = `${GATEWAY}/webmasters/v3/sites/${encodeURIComponent(SITE_PROPERTY)}/sitemaps/${encodeURIComponent(SITEMAP_URL)}`;
    const response = await fetch(endpoint, {
      method: "PUT",
      headers: {
        authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": gscKey,
      },
      signal: AbortSignal.timeout(45_000),
    });
    const text = await response.text();

    if (!response.ok) {
      console.error("scheduled-sitemap-submit", response.status, text.slice(0, 200));
      return json({ ok: false, error: "google_submission_failed", status: response.status }, 502);
    }

    return json({
      ok: true,
      submitted: true,
      site_property: SITE_PROPERTY,
      sitemap: SITEMAP_URL,
      status: response.status,
      submitted_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("scheduled-sitemap-submit", error instanceof Error ? error.message : String(error));
    return json({ ok: false, error: "submission_request_failed" }, 502);
  }
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
