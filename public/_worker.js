const APEX_ORIGIN = "https://irhaapparels.com";
const WWW_HOST = "www.irhaapparels.com";

const VALID_ROBOTS_TXT = `# Irha Apparels public B2B website
User-agent: *
Allow: /
Disallow: /admin
Disallow: /auth
Disallow: /dashboard
Disallow: /login
Disallow: /log-in
Disallow: /signin
Disallow: /sign-in
Disallow: /seo-indexing
Disallow: /catalogs/

Sitemap: https://irhaapparels.com/sitemap.xml
`;

const STATIC_BUYER_CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://static.cloudflareinsights.com",
  "script-src-elem 'self' 'unsafe-inline' https://www.googletagmanager.com https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com https://static.cloudflareinsights.com https://cloudflareinsights.com https://*.cloudflareinsights.com",
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
  "upgrade-insecure-requests",
].join("; ");

const MARKET_PATHS = new Set([
  "/markets",
  "/markets/germany",
  "/markets/austria",
  "/markets/switzerland",
  "/markets/netherlands",
  "/markets/united-states",
  "/markets/united-kingdom",
  "/markets/canada",
  "/markets/australia",
  "/markets/new-zealand",
]);

const STATIC_BUYER_ASSETS = new Map([
  [
    "/de/bekleidungshersteller-deutschland",
    "/_seo-static/de--bekleidungshersteller-deutschland.irha",
  ],
  [
    "/custom-sportswear-manufacturer-germany",
    "/_seo-static/custom-sportswear-manufacturer-germany.irha",
  ],
  [
    "/de/sportbekleidung-hersteller",
    "/_seo-static/de--sportbekleidung-hersteller.irha",
  ],
  [
    "/leather-apparel-manufacturer-germany",
    "/_seo-static/leather-apparel-manufacturer-germany.irha",
  ],
  [
    "/de/lederbekleidung-hersteller",
    "/_seo-static/de--lederbekleidung-hersteller.irha",
  ],
  [
    "/docs/data-deletion",
    "/_seo-static/meta-data-deletion.irha",
  ],
]);

const EXACT_PUBLIC_PATHS = new Set([
  "/",
  "/about",
  "/products",
  "/manufacturing",
  "/compliance",
  "/buyer-trust",
  "/factory-video-call",
  "/resources",
  "/faq",
  "/blog",
  "/sustainability",
  "/inquiry",
  "/repeat-order",
  "/contact",
  "/privacy-policy",
  "/terms-of-service",
  "/connect",
  "/catalogue",
  "/catalog",
  "/studio",
  "/shortlist",
  "/compare",
  "/journal",
  "/auth",
  "/admin",
  "/login",
  "/signin",
  "/sign-in",
  "/log-in",
  "/dashboard",
  "/de",
  "/de/katalog",
  "/legacy-home",
  "/seo-indexing",
]);

const LEGACY_ALIASES = new Map([
  ["/buyer-trust-center", "/buyer-trust"],
  ["/buyer-trust-centre", "/buyer-trust"],
  ["/buyer-resources", "/resources"],
  ["/buyer-faq", "/faq"],
  ["/shipping-returns", "/resources"],
  ["/privacy", "/privacy-policy"],
  ["/terms", "/terms-of-service"],
  [
    "/products/d22ac15e-d657-4a4c-804c-fb8697ceb050/plush-bathrobe-sleep-robe",
    "/products/leisure-nightwear/plush-bathrobe-sleep-robe",
  ],
  ["/germany", "/markets/germany"],
  ["/austria", "/markets/austria"],
  ["/switzerland", "/markets/switzerland"],
  ["/netherlands", "/markets/netherlands"],
  ["/usa", "/markets/united-states"],
  ["/united-states", "/markets/united-states"],
  ["/uk", "/markets/united-kingdom"],
  ["/united-kingdom", "/markets/united-kingdom"],
  ["/canada", "/markets/canada"],
  ["/australia", "/markets/australia"],
  ["/new-zealand", "/markets/new-zealand"],
]);

const PRIVATE_ROUTE_PREFIXES = [
  "/admin",
  "/auth",
  "/dashboard",
  "/login",
  "/log-in",
  "/signin",
  "/sign-in",
  "/seo-indexing",
];

const PUBLIC_PREFIXES = [
  "/products/",
  "/catalogue/",
  "/blog/",
  "/intl/",
  "/admin/",
  "/auth/",
  "/de/",
  "/journal/",
  "/.well-known/",
  "/openapi/",
  "/skills/",
  "/docs/",
  "/mcp/",
  "/assets/",
  "/media/",
  "/catalogs/",
];

const BUYER_INTENT_PATH = /^\/[a-z0-9-]*(?:apparel-manufacturer|clothing-manufacturer|sportswear-manufacturer|streetwear-manufacturer|leather-jacket-manufacturer|lederhosen-manufacturer|dirndl-manufacturer|grosshandel|hersteller)[a-z0-9-]*$/;
const CATEGORY_ROUTE = /^\/products\/[^/]+(?:\/all-products)?$/;

function normalizePath(pathname) {
  if (pathname === "/") return "/";
  return pathname.replace(/\/+$/, "") || "/";
}

function looksLikeFile(pathname) {
  const segment = pathname.split("/").pop() || "";
  return segment.includes(".");
}

export function robotsText() {
  return VALID_ROBOTS_TXT;
}

export function legacyAliasTarget(pathname) {
  return LEGACY_ALIASES.get(normalizePath(pathname)) || null;
}

export function staticBuyerAssetPath(pathname) {
  return STATIC_BUYER_ASSETS.get(normalizePath(pathname)) || null;
}

export function isStaticBuyerPath(pathname) {
  return Boolean(staticBuyerAssetPath(pathname));
}

export function shouldNoIndex(pathname) {
  const normalized = normalizePath(pathname);
  return PRIVATE_ROUTE_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
}

export function shouldNoIndexCategoryQuery(pathname, input) {
  const normalized = normalizePath(pathname);
  if (!CATEGORY_ROUTE.test(normalized)) return false;

  const params = input instanceof URLSearchParams
    ? input
    : new URLSearchParams(String(input || "").replace(/^\?/, ""));
  const query = params.get("q")?.trim();
  const sort = params.get("sort")?.trim();
  const subcategory = params.get("subcategory")?.trim();

  return Boolean(
    query ||
      (sort && sort !== "recommended") ||
      (subcategory && subcategory !== "all"),
  );
}

export function isKnownHtmlRoute(pathname) {
  const normalized = normalizePath(pathname);
  if (STATIC_BUYER_ASSETS.has(normalized)) return true;
  if (MARKET_PATHS.has(normalized) || EXACT_PUBLIC_PATHS.has(normalized)) return true;
  if (normalized.startsWith("/markets/")) return false;
  if (BUYER_INTENT_PATH.test(normalized)) return true;
  if (looksLikeFile(normalized)) return true;
  return PUBLIC_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

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

function aliasRedirect(request, url, targetPath) {
  const target = new URL(targetPath, APEX_ORIGIN);
  target.search = url.search;
  const status = request.method === "GET" || request.method === "HEAD" ? 301 : 308;
  return new Response(null, {
    status,
    headers: {
      Location: target.toString(),
      "Cache-Control": "public, max-age=3600",
      "X-Irha-Legacy-Redirect": "canonical-alias",
    },
  });
}

function canonicalPathRedirect(request, url, pathname) {
  const target = new URL(pathname, APEX_ORIGIN);
  target.search = url.search;
  const status = request.method === "GET" || request.method === "HEAD" ? 301 : 308;
  return new Response(null, {
    status,
    headers: {
      Location: target.toString(),
      "Cache-Control": "public, max-age=3600",
      "X-Irha-Canonical-Redirect": "remove-trailing-slash",
    },
  });
}

function robotsResponse(request) {
  return new Response(request.method === "HEAD" ? null : VALID_ROBOTS_TXT, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store, no-transform, max-age=0, must-revalidate",
      "CDN-Cache-Control": "no-store, no-transform",
      "X-Content-Type-Options": "nosniff",
      "X-Irha-Robots-Source": "worker-valid",
    },
  });
}

function visitorContextResponse(request) {
  const cf = request.cf || {};
  const body = JSON.stringify({
    countryCode: typeof cf.country === "string" ? cf.country : null,
    country: null,
    region: typeof cf.region === "string" ? cf.region : null,
    city: typeof cf.city === "string" ? cf.city : null,
    timezone: typeof cf.timezone === "string" ? cf.timezone : null,
  });

  return new Response(request.method === "HEAD" ? null : body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "CDN-Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "Cross-Origin-Resource-Policy": "same-origin",
      "X-Irha-Visitor-Context": "coarse-edge-geo-no-ip",
    },
  });
}

function notFoundResponse(request, pathname) {
  const safePath = pathname.replace(/[&<>"']/g, "");
  const body = request.method === "HEAD" ? null : `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex,follow"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page Not Found — Irha Apparels</title></head><body style="margin:0;background:#0a0a0a;color:#f5f1e8;font-family:Arial,sans-serif"><main style="max-width:760px;margin:0 auto;padding:96px 24px"><p style="color:#c9a45c;text-transform:uppercase;letter-spacing:.18em">404 — Page not found</p><h1 style="font-size:48px;line-height:1.05">This page does not exist.</h1><p style="color:#c9c1b5;line-height:1.7">The requested path <code>${safePath}</code> is not a published Irha Apparels page.</p><p><a href="/products" style="color:#e8c477">Browse products</a> · <a href="/markets" style="color:#e8c477">International markets</a> · <a href="/inquiry" style="color:#e8c477">Request a quote</a></p></main></body></html>`;
  return new Response(body, {
    status: 404,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, max-age=0, must-revalidate",
      "X-Robots-Tag": "noindex, follow",
      "X-Irha-Route-Status": "not-found",
    },
  });
}

function withNoIndexHeaders(response, reason) {
  const headers = new Headers(response.headers);
  headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
  headers.set("X-Irha-Noindex-Reason", reason);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function staticBuyerResponse(request, env, pathname) {
  const assetPath = staticBuyerAssetPath(pathname);
  if (!assetPath) {
    return new Response("Static buyer asset mapping unavailable", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const assetUrl = new URL(request.url);
  assetUrl.pathname = assetPath;
  assetUrl.search = "";
  assetUrl.hash = "";
  const assetResponse = await env.ASSETS.fetch(
    new Request(assetUrl.toString(), {
      method: "GET",
      headers: { Accept: "text/html" },
    }),
  );

  if (!assetResponse.ok) {
    return new Response("Static buyer asset unavailable", {
      status: 503,
      headers: {
        "Cache-Control": "no-store",
        "X-Irha-Static-Buyer-Asset-Status": String(assetResponse.status),
      },
    });
  }

  const headers = new Headers(assetResponse.headers);
  headers.delete("Location");
  headers.set("Content-Type", "text/html; charset=utf-8");
  headers.set("Content-Location", `${APEX_ORIGIN}${pathname}`);
  headers.set("Content-Security-Policy", STATIC_BUYER_CSP);
  headers.set("X-Irha-Static-Buyer-Shell", "runtime-free");
  headers.set("X-Irha-Static-Buyer-Asset", assetPath);
  headers.set("Cache-Control", "public, max-age=300, must-revalidate");
  return new Response(request.method === "HEAD" ? null : assetResponse.body, {
    status: 200,
    headers,
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = normalizePath(url.pathname);

    if (url.hostname === WWW_HOST) return canonicalRedirect(request, url);

    if ((request.method === "GET" || request.method === "HEAD") && pathname === "/robots.txt") {
      return robotsResponse(request);
    }

    if ((request.method === "GET" || request.method === "HEAD") && pathname === "/api/visitor-context") {
      return visitorContextResponse(request);
    }

    const aliasTarget = legacyAliasTarget(pathname);
    if (aliasTarget) return aliasRedirect(request, url, aliasTarget);

    if (isStaticBuyerPath(pathname) && url.pathname !== pathname) {
      return canonicalPathRedirect(request, url, pathname);
    }

    if ((request.method === "GET" || request.method === "HEAD") && !isKnownHtmlRoute(pathname)) {
      return notFoundResponse(request, pathname);
    }

    if (!env?.ASSETS?.fetch) {
      return new Response("Static asset binding unavailable", {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      });
    }

    if ((request.method === "GET" || request.method === "HEAD") && isStaticBuyerPath(pathname)) {
      return staticBuyerResponse(request, env, pathname);
    }

    const assetResponse = await env.ASSETS.fetch(request);
    if (shouldNoIndex(pathname)) {
      return withNoIndexHeaders(assetResponse, "private-route");
    }
    if (shouldNoIndexCategoryQuery(pathname, url.searchParams)) {
      return withNoIndexHeaders(assetResponse, "functional-category-query");
    }
    return assetResponse;
  },
};