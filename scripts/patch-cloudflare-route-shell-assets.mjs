import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const WORKER_PATH = resolve("dist/_worker.js");
const SITEMAP_PATH = resolve("dist/sitemap.xml");
const SITE_ORIGIN = "https://irhaapparels.com";
const REQUIRED_ROUTE_SHELLS = ["products", "contact", "inquiry"];
const REQUIRED_MANIFEST_ROUTES = [
  "/",
  "/products",
  "/products/bavarian-trachten-wear",
  "/catalogue",
  "/contact",
  "/inquiry",
];

const canonicalBefore = `    if (isStaticBuyerPath(pathname) && url.pathname !== pathname) {
      return canonicalPathRedirect(request, url, pathname);
    }`;

const canonicalAfter = `    if (
      (request.method === "GET" || request.method === "HEAD") &&
      pathname !== "/" &&
      url.pathname !== pathname &&
      isKnownHtmlRoute(pathname) &&
      !looksLikeFile(pathname)
    ) {
      return canonicalPathRedirect(request, url, pathname);
    }`;

const knownRouteBefore = `export function isKnownHtmlRoute(pathname) {
  const normalized = normalizePath(pathname);
  if (STATIC_BUYER_ASSETS.has(normalized)) return true;
  if (MARKET_PATHS.has(normalized) || EXACT_PUBLIC_PATHS.has(normalized)) return true;
  if (normalized.startsWith("/markets/")) return false;
  if (BUYER_INTENT_PATH.test(normalized)) return true;
  if (looksLikeFile(normalized)) return true;
  return PUBLIC_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}`;

const helperMarker = "export default {";
const assetBefore = `    const assetResponse = await env.ASSETS.fetch(request);
    if (shouldNoIndex(pathname)) {
      return withNoIndexHeaders(assetResponse, "private-route");
    }
    if (shouldNoIndexCategoryQuery(pathname, url.searchParams)) {
      return withNoIndexHeaders(assetResponse, "functional-category-query");
    }
    return assetResponse;`;

const assetAfter = `    const explicitAssetPath = explicitRouteAssetPath(pathname);
    const assetResponse = explicitAssetPath
      ? await routeShellAssetResponse(request, env, pathname, explicitAssetPath)
      : await env.ASSETS.fetch(request);
    if (shouldNoIndex(pathname)) {
      return withNoIndexHeaders(assetResponse, "private-route");
    }
    if (shouldNoIndexCategoryQuery(pathname, url.searchParams)) {
      return withNoIndexHeaders(assetResponse, "functional-category-query");
    }
    return assetResponse;`;

function cleanPath(pathname) {
  if (pathname === "/") return "/";
  return pathname.replace(/\/+$/, "") || "/";
}

function extractManifestRoutes(sitemap) {
  const routes = new Set();
  for (const match of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const raw = match[1].replace(/&amp;/g, "&");
    const url = new URL(raw);
    if (url.origin !== SITE_ORIGIN) continue;
    const path = cleanPath(decodeURIComponent(url.pathname));
    if (!path.startsWith("/") || path.includes("..")) continue;
    routes.add(path);
  }
  return [...routes].sort();
}

function knownRouteAfter(routes) {
  const manifest = JSON.stringify(routes);
  return `const GENERATED_PUBLIC_ROUTES = new Set(${manifest});
const FUNCTIONAL_HTML_PREFIXES = [
  "/admin/",
  "/auth/",
  "/.well-known/",
  "/openapi/",
  "/skills/",
  "/docs/",
  "/mcp/",
  "/assets/",
  "/media/",
  "/catalogs/",
];

export function isKnownHtmlRoute(pathname) {
  const normalized = normalizePath(pathname);
  if (STATIC_BUYER_ASSETS.has(normalized)) return true;
  if (MARKET_PATHS.has(normalized) || EXACT_PUBLIC_PATHS.has(normalized)) return true;
  if (normalized.startsWith("/markets/")) return false;
  if (GENERATED_PUBLIC_ROUTES.has(normalized)) return true;
  if (looksLikeFile(normalized)) return true;
  return FUNCTIONAL_HTML_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}`;
}

function helperBlock() {
  return `function explicitRouteAssetPath(pathname) {
  const normalized = normalizePath(pathname);
  if (normalized === "/" || looksLikeFile(normalized) || isStaticBuyerPath(normalized)) return null;
  if (!isKnownHtmlRoute(normalized)) return null;
  return \`${"${normalized}"}/index.html\`;
}

async function routeShellAssetResponse(request, env, pathname, assetPath) {
  const assetUrl = new URL(request.url);
  assetUrl.pathname = assetPath;
  assetUrl.search = "";
  assetUrl.hash = "";

  const explicitResponse = await env.ASSETS.fetch(
    new Request(assetUrl.toString(), {
      method: "GET",
      headers: { Accept: "text/html" },
    }),
  );

  if (!explicitResponse.ok) return notFoundResponse(request, pathname);

  const headers = new Headers(explicitResponse.headers);
  headers.delete("Location");
  headers.set("Content-Type", "text/html; charset=utf-8");
  headers.set("Content-Location", pathname === "/" ? APEX_ORIGIN : \`${"${APEX_ORIGIN}${pathname}"}\`);
  headers.set("Cache-Control", "public, max-age=300, must-revalidate");
  headers.set("X-Irha-Route-Shell-Asset", assetPath);

  return new Response(request.method === "HEAD" ? null : explicitResponse.body, {
    status: 200,
    headers,
  });
}

`;
}

async function verifyRichRouteShells() {
  for (const route of REQUIRED_ROUTE_SHELLS) {
    const path = resolve("dist", route, "index.html");
    const html = await readFile(path, "utf8");
    const required = [
      'data-irha-rich-route-shell="true"',
      "info@irhaapparels.com",
      "+92 320 4110066",
      "Five specialist apparel categories",
      "Request a Manufacturing Quote",
    ];
    for (const token of required) {
      if (!html.includes(token)) throw new Error(`${route}/index.html is missing crawler token: ${token}`);
    }
  }
}

async function main() {
  let worker = await readFile(WORKER_PATH, "utf8");
  const sitemap = await readFile(SITEMAP_PATH, "utf8");
  const routes = extractManifestRoutes(sitemap);

  if (routes.length < 25) throw new Error(`Generated route manifest is unexpectedly small: ${routes.length}`);
  for (const route of REQUIRED_MANIFEST_ROUTES) {
    if (!routes.includes(route)) throw new Error(`Generated route manifest is missing required route: ${route}`);
  }

  if (!worker.includes(knownRouteBefore)) {
    throw new Error("Cloudflare worker known-route block changed; exact route manifest was not applied");
  }
  worker = worker.replace(knownRouteBefore, knownRouteAfter(routes));

  if (!worker.includes(canonicalBefore)) {
    throw new Error("Cloudflare worker canonical route block changed; explicit route patch was not applied");
  }
  worker = worker.replace(canonicalBefore, canonicalAfter);

  if (!worker.includes(helperMarker)) {
    throw new Error("Cloudflare worker export marker is missing");
  }
  worker = worker.replace(helperMarker, `${helperBlock()}${helperMarker}`);

  if (!worker.includes(assetBefore)) {
    throw new Error("Cloudflare worker generic asset block changed; explicit route patch was not applied");
  }
  worker = worker.replace(assetBefore, assetAfter);

  const requiredWorkerTokens = [
    "GENERATED_PUBLIC_ROUTES",
    "FUNCTIONAL_HTML_PREFIXES",
    "explicitRouteAssetPath",
    "routeShellAssetResponse",
    "X-Irha-Route-Shell-Asset",
    'return `${normalized}/index.html`',
    "canonicalPathRedirect(request, url, pathname)",
    "if (!explicitResponse.ok) return notFoundResponse(request, pathname)",
  ];
  for (const token of requiredWorkerTokens) {
    if (!worker.includes(token)) throw new Error(`Patched Cloudflare worker is missing: ${token}`);
  }
  if (worker.includes("return PUBLIC_PREFIXES.some")) {
    throw new Error("Cloudflare worker still blanket-allows dynamic public prefixes");
  }

  await verifyRichRouteShells();
  await writeFile(WORKER_PATH, worker, "utf8");
  console.log(`Patched Cloudflare worker with ${routes.length} exact sitemap routes and explicit rich route assets`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
