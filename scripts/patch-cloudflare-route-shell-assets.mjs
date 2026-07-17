import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const WORKER_PATH = resolve("dist/_worker.js");
const REQUIRED_ROUTE_SHELLS = ["products", "contact", "inquiry"];

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

const helperMarker = "export default {";
const helperBlock = `const FUNCTIONAL_SPA_PATHS = new Set([
  "/studio",
  "/shortlist",
  "/compare",
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
  "/sustainability",
  "/catalog",
  "/journal",
]);

const FUNCTIONAL_SPA_PREFIXES = ["/admin/", "/auth/", "/journal/"];
const FUNCTIONAL_NOINDEX_PATHS = new Set(["/studio", "/shortlist", "/compare"]);
const FUNCTIONAL_NOINDEX_PREFIXES = ["/intl/"];

async function officialFaviconResponse(request, env) {
  const assetUrl = new URL(request.url);
  assetUrl.pathname = "/favicon.svg";
  assetUrl.search = "";
  assetUrl.hash = "";

  const assetResponse = await env.ASSETS.fetch(
    new Request(assetUrl.toString(), {
      method: "GET",
      headers: { Accept: "image/svg+xml" },
    }),
  );

  if (!assetResponse.ok) {
    return new Response("Official favicon unavailable", {
      status: 503,
      headers: {
        "Cache-Control": "no-store",
        "X-Irha-Favicon-Asset-Status": String(assetResponse.status),
      },
    });
  }

  const headers = new Headers(assetResponse.headers);
  headers.delete("Location");
  headers.set("Content-Type", "image/svg+xml; charset=utf-8");
  headers.set("Content-Location", APEX_ORIGIN + "/favicon.svg");
  headers.set("Cache-Control", "public, max-age=86400, must-revalidate");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Irha-Favicon-Source", "official-owner-crest");

  return new Response(request.method === "HEAD" ? null : assetResponse.body, {
    status: 200,
    headers,
  });
}

function explicitRouteAssetPath(pathname) {
  const normalized = normalizePath(pathname);
  if (normalized === "/" || looksLikeFile(normalized) || isStaticBuyerPath(normalized)) return null;
  if (FUNCTIONAL_SPA_PATHS.has(normalized)) return null;
  if (FUNCTIONAL_SPA_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return null;
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

const assetBefore = `    const assetResponse = await env.ASSETS.fetch(request);
    if (shouldNoIndex(pathname)) {
      return withNoIndexHeaders(assetResponse, "private-route");
    }
    if (shouldNoIndexCategoryQuery(pathname, url.searchParams)) {
      return withNoIndexHeaders(assetResponse, "functional-category-query");
    }
    return assetResponse;`;

const assetAfter = `    if (
      (request.method === "GET" || request.method === "HEAD") &&
      pathname === "/favicon.ico"
    ) {
      return officialFaviconResponse(request, env);
    }

    const explicitAssetPath = explicitRouteAssetPath(pathname);
    const assetResponse = explicitAssetPath
      ? await routeShellAssetResponse(request, env, pathname, explicitAssetPath)
      : await env.ASSETS.fetch(request);
    if (FUNCTIONAL_NOINDEX_PATHS.has(pathname)) {
      return withNoIndexHeaders(assetResponse, "functional-public-tool");
    }
    if (FUNCTIONAL_NOINDEX_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
      return withNoIndexHeaders(assetResponse, "localized-draft");
    }
    if (shouldNoIndex(pathname)) {
      return withNoIndexHeaders(assetResponse, "private-route");
    }
    if (shouldNoIndexCategoryQuery(pathname, url.searchParams)) {
      return withNoIndexHeaders(assetResponse, "functional-category-query");
    }
    return assetResponse;`;

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

  if (!worker.includes(canonicalBefore)) {
    throw new Error("Cloudflare worker canonical route block changed; explicit route patch was not applied");
  }
  worker = worker.replace(canonicalBefore, canonicalAfter);

  if (!worker.includes(helperMarker)) {
    throw new Error("Cloudflare worker export marker is missing");
  }
  worker = worker.replace(helperMarker, `${helperBlock}${helperMarker}`);

  if (!worker.includes(assetBefore)) {
    throw new Error("Cloudflare worker generic asset block changed; explicit route patch was not applied");
  }
  worker = worker.replace(assetBefore, assetAfter);

  const requiredWorkerTokens = [
    "officialFaviconResponse",
    'pathname === "/favicon.ico"',
    'assetUrl.pathname = "/favicon.svg"',
    'X-Irha-Favicon-Source", "official-owner-crest',
    "explicitRouteAssetPath",
    "routeShellAssetResponse",
    "X-Irha-Route-Shell-Asset",
    'return `${normalized}/index.html`',
    "canonicalPathRedirect(request, url, pathname)",
    "FUNCTIONAL_SPA_PATHS",
    "FUNCTIONAL_NOINDEX_PATHS",
    "FUNCTIONAL_NOINDEX_PREFIXES",
    'withNoIndexHeaders(assetResponse, "localized-draft")',
    "return notFoundResponse(request, pathname)",
    'withNoIndexHeaders(assetResponse, "functional-public-tool")',
  ];
  for (const token of requiredWorkerTokens) {
    if (!worker.includes(token)) throw new Error(`Patched Cloudflare worker is missing: ${token}`);
  }

  await verifyRichRouteShells();
  await writeFile(WORKER_PATH, worker, "utf8");
  console.log("Patched Cloudflare worker with the official favicon route, explicit rich route assets, missing-route 404s and functional/draft noindex handling");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
