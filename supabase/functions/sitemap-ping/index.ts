// Daily re-submits the sitemap to Google Search Console via the connector
// gateway. Triggered by pg_cron (see daily schedule in DB). Idempotent.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const SITE_URL = "https://www.irhaapparels.com/";
const SITEMAP_URL = "https://www.irhaapparels.com/sitemap.xml";
const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const gscKey = Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY");
  if (!lovableKey || !gscKey) {
    return new Response(JSON.stringify({ error: "Missing credentials" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const siteEnc = encodeURIComponent(SITE_URL);
    const smEnc = encodeURIComponent(SITEMAP_URL);

    // PUT submits (or re-submits) a sitemap for a verified property.
    const res = await fetch(
      `${GATEWAY}/webmasters/v3/sites/${siteEnc}/sitemaps/${smEnc}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": gscKey,
        },
      },
    );

    const body = await res.text();
    console.log("sitemap-ping", res.status, body.slice(0, 200));

    return new Response(
      JSON.stringify({ status: res.status, ok: res.ok, body: body.slice(0, 200) }),
      {
        status: res.ok ? 200 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("sitemap-ping error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
