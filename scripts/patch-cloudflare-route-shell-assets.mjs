import { readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const WORKER_PATH = resolve("dist/_worker.js");
const REDIRECTS_PATH = resolve("dist/_redirects");
const CATALOG_MANIFEST_PATH = resolve("dist/catalog-route-manifest.json");
const REQUIRED_ROUTE_SHELLS = ["products", "contact", "inquiry"];

const canonicalBefore = `    if (isStaticBuyerPath(pathname) && url.pathname !== pathname) {
      return canonicalPathRedirect(request, url, pathname);
    }`;

const canonicalAfter = `    if (
      (request.method === "GET" || request.method === "HEAD") &&
      pathname !== "/" &&
      url.pathname !== pathname &&
      isPublishedHtmlRoute(pathname) &&
      !looksLikeFile(pathname)
    ) {
      return canonicalPathRedirect(request, url, pathname);
    }`;

const aliasBefore = `    const aliasTarget = legacyAliasTarget(pathname);
    if (aliasTarget) return aliasRedirect(request, url, aliasTarget);`;

const aliasAfter = `    const aliasTarget = generatedLegacyAliasTarget(pathname) || legacyAliasTarget(pathname);
    if (aliasTarget) return aliasRedirect(request, url, aliasTarget);`;

const notFoundBefore = `    if ((request.method === "GET" || request.method === "HEAD") && !isKnownHtmlRoute(pathname)) {
      return notFoundResponse(request, pathname);
    }`;

const notFoundAfter = `    if ((request.method === "GET" || request.method === "HEAD") && !isPublishedHtmlRoute(pathname)) {
      return notFoundResponse(request, pathname);
    }`;

const helperMarker = "export default {";

function buildHelperBlock(publishedCatalogPaths, generatedRedirects) {
  return `const PUBLISHED_CATALOG_PATHS = new Set(${JSON.stringify(publishedCatalogPaths, null, 2)});
const GENERATED_LEGACY_ALIASES = new Map(${JSON.stringify(generatedRedirects, null, 2)});

const FUNCTIONAL_SPA_PATHS = new Set([
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

function generatedLegacyAliasTarget(pathname) {
  return GENERATED_LEGACY_ALIASES.get(normalizePath(pathname)) || null;
}

function isPublishedHtmlRoute(pathname) {
  const normalized = normalizePath(pathname);
  if (normalized.startsWith("/products/") || normalized.startsWith("/catalogue/")) {
    return PUBLISHED_CATALOG_PATHS.has(normalized) || GENERATED_LEGACY_ALIASES.has(normalized);
  }
  return isKnownHtmlRoute(normalized);
}

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
  if (!isPublishedHtmlRoute(normalized)) return null;
  return \`\${normalized}/index.html\`;
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
  headers.set("Content-Location", pathname === "/" ? APEX_ORIGIN : \`\${APEX_ORIGIN}\${pathname}\`);
  headers.set("Cache-Control", "public, max-age=300, must-revalidate");
  headers.set("X-Irha-Route-Shell-Asset", assetPath);

  return new Response(request.method === "HEAD" ? null : explicitResponse.body, {
    status: 200,
    headers,
  });
}

`;
}

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

function normalizeGeneratedPath(value) {
  if (typeof value !== "string" || !value.startsWith("/")) return null;
  const normalized = value.split(/[?#]/, 1)[0].replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/";
  if (normalized.includes("..") || /[\r\n\t ]/.test(normalized)) return null;
  return normalized;
}

async function collectIndexRoutes(directory, prefix = "") {
  const routes = [];
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    const child = resolve(directory, entry.name);
    const childEntries = await readdir(child, { withFileTypes: true });
    if (childEntries.some((candidate) => candidate.isFile() && candidate.name === "index.html")) {
      routes.push(`/${relative}`);
    }
    routes.push(...await collectIndexRoutes(child, relative));
  }
  return routes;
}

async function publishedCatalogPaths() {
  const paths = new Set(["/products", "/products/all"]);
  const productRoot = resolve("dist/products");
  for (const route of await collectIndexRoutes(productRoot, "products")) paths.add(route);

  const manifest = JSON.parse(await readFile(CATALOG_MANIFEST_PATH, "utf8"));
  if (manifest?.schemaVersion !== 1 || manifest?.productCount !== 254 || manifest?.products?.length !== 254) {
    throw new Error("Cloudflare catalogue route allowlist requires the complete 254-product manifest");
  }
  for (const product of manifest.products) {
    const canonical = normalizeGeneratedPath(product.canonical_path);
    if (!canonical) throw new Error(`Invalid canonical catalogue path: ${product.canonical_path}`);
    paths.add(canonical);
    paths.add(`/products/${product.main_category_slug}/${product.product_slug}/spec-sheet`);
  }
  return [...paths].sort();
}

async function generatedRedirects() {
  const source = await readFile(REDIRECTS_PATH, "utf8");
  const redirects = new Map();
  for (const rawLine of source.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const [rawFrom, rawTo, status] = line.split(/\s+/);
    if (status !== "301") continue;
    const from = normalizeGeneratedPath(rawFrom);
    const to = normalizeGeneratedPath(rawTo);
    if (!from || !to || from === to) continue;
    redirects.set(from, to);
  }
  return [...redirects.entries()].sort(([left], [right]) => left.localeCompare(right));
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
  const routePaths = await publishedCatalogPaths();
  const redirectEntries = await generatedRedirects();

  if (!worker.includes(canonicalBefore)) {
    throw new Error("Cloudflare worker canonical route block changed; explicit route patch was not applied");
  }
  worker = worker.replace(canonicalBefore, canonicalAfter);

  if (!worker.includes(aliasBefore)) {
    throw new Error("Cloudflare worker alias route block changed; generated redirect patch was not applied");
  }
  worker = worker.replace(aliasBefore, aliasAfter);

  if (!worker.includes(notFoundBefore)) {
    throw new Error("Cloudflare worker not-found route block changed; exact published-route patch was not applied");
  }
  worker = worker.replace(notFoundBefore, notFoundAfter);

  if (!worker.includes(helperMarker)) {
    throw new Error("Cloudflare worker export marker is missing");
  }
  worker = worker.replace(helperMarker, `${buildHelperBlock(routePaths, redirectEntries)}${helperMarker}`);

  if (!worker.includes(assetBefore)) {
    throw new Error("Cloudflare worker generic asset block changed; explicit route patch was not applied");
  }
  worker = worker.replace(assetBefore, assetAfter);

  const requiredWorkerTokens = [
    "PUBLISHED_CATALOG_PATHS",
    "GENERATED_LEGACY_ALIASES",
    "generatedLegacyAliasTarget",
    "isPublishedHtmlRoute",
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
  console.log(`Patched Cloudflare worker with ${routePaths.length} exact catalogue routes, ${redirectEntries.length} one-hop redirects, real missing-route 404s and functional/draft noindex handling`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
