const APEX_ORIGIN = "https://irhaapparels.com";
const WWW_HOST = "www.irhaapparels.com";

function canonicalRedirect(request, url) {
  const target = new URL(`${url.pathname}${url.search}`, APEX_ORIGIN);
  const status = request.method === "GET" || request.method === "HEAD" ? 301 : 308;

  return new Response(null, {
    status,
    headers: {
      Location: target.toString(),
      "Cache-Control": "public, max-age=3600",
      "X-Irha-Canonical-Redirect": "www-to-apex",
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.hostname === WWW_HOST) {
      return canonicalRedirect(request, url);
    }

    if (!env?.ASSETS?.fetch) {
      return new Response("Static asset binding unavailable", {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      });
    }

    return env.ASSETS.fetch(request);
  },
};
