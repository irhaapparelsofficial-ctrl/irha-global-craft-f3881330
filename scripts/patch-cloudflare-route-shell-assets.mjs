import { readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { CORE_ROUTE_CONTENT } from "../src/lib/routeContent.mjs";
import { PUBLIC_IDENTITY } from "../src/lib/publicIdentity.mjs";

const WORKER_PATH = resolve("dist/_worker.js");
const REDIRECTS_PATH = resolve("dist/_redirects");
const CATALOG_MANIFEST_PATH = resolve("dist/catalog-route-manifest.json");
const SITE_URL = "https://irhaapparels.com";
const REQUIRED_CORE_ROUTE_SHELLS = ["/products", "/contact", "/inquiry"];
const OBSOLETE_GENERIC_FINGERPRINTS = [
  'data-irha-rich-route-shell="true"',
  "Five specialist apparel categories",
  "Request a Manufacturing Quote",
  "Experienced manufacturer. Newly built website.",
  "From requirement to shipping review.",
];

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
  "/products/all",
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
const FUNCTIONAL_NOINDEX_PATHS = new Set(["/studio", "/shortlist", "/compare", "/products/all"]);
const FUNCTIONAL_NOINDEX_PREFIXES = ["/intl/"];

function generatedLegacyAliasTarget(pathname) {
  return GENERATED_LEGACY_ALIASES.get(normalizePath(pathname)) || null;
}

function isPublishedHtmlRoute(pathname) {
  const normalized = normalizePath(pathname);
  if (FUNCTIONAL_SPA_PATHS.has(normalized)) return true;
  if (FUNCTIONAL_SPA_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return true;
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

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function collectSchemaNodes(value, nodes = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectSchemaNodes(item, nodes));
    return nodes;
  }
  if (!value || typeof value !== "object") return nodes;
  if (value["@type"] || value["@id"]) nodes.push(value);
  if (Array.isArray(value["@graph"])) value["@graph"].forEach((item) => collectSchemaNodes(item, nodes));
  for (const [key, child] of Object.entries(value)) {
    if (key === "@graph") continue;
    if (child && typeof child === "object") collectSchemaNodes(child, nodes);
  }
  return nodes;
}

function parseSchemaNodes(html, route) {
  const nodes = [];
  for (const match of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      collectSchemaNodes(JSON.parse(match[1]), nodes);
    } catch (error) {
      throw new Error(`${route}/index.html contains invalid JSON-LD: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return nodes;
}

function verifyCoreRouteSchema(html, route, content, canonical) {
  const pages = parseSchemaNodes(html, route).filter((node) => node["@id"] === `${canonical}#webpage`);
  if (pages.length !== 1) {
    throw new Error(`${route}/index.html must contain exactly one canonical route page node; found ${pages.length}`);
  }
  const page = pages[0];
  const requiredPage = {
    "@type": content.pageType,
    url: canonical,
    name: content.title,
    description: content.metaDescription,
  };
  for (const [field, expected] of Object.entries(requiredPage)) {
    if (page[field] !== expected) throw new Error(`${route}/index.html route page ${field} drift`);
  }
  if (page.isPartOf?.["@id"] !== PUBLIC_IDENTITY.websiteId
    || page.about?.["@id"] !== PUBLIC_IDENTITY.organizationId) {
    throw new Error(`${route}/index.html route page identity reference drift`);
  }
}

function verifyCanonicalOrganization(html, route) {
  const organizations = parseSchemaNodes(html, route).filter((node) =>
    node["@type"] === "Organization" && node["@id"] === PUBLIC_IDENTITY.organizationId,
  );
  if (organizations.length !== 1) {
    throw new Error(`${route}/index.html must contain exactly one canonical Organization node; found ${organizations.length}`);
  }
  const organization = organizations[0];
  const requiredIdentity = {
    name: PUBLIC_IDENTITY.name,
    url: PUBLIC_IDENTITY.url,
    logo: PUBLIC_IDENTITY.logoUrl,
    telephone: PUBLIC_IDENTITY.telephone,
    email: PUBLIC_IDENTITY.email,
  };
  for (const [field, expected] of Object.entries(requiredIdentity)) {
    if (organization[field] !== expected) {
      throw new Error(`${route}/index.html canonical Organization ${field} drift`);
    }
  }
  if (organization.address?.addressLocality !== PUBLIC_IDENTITY.address.locality
    || organization.address?.addressRegion !== PUBLIC_IDENTITY.address.region
    || organization.address?.addressCountry !== PUBLIC_IDENTITY.address.country) {
    throw new Error(`${route}/index.html canonical Organization address drift`);
  }
  if (JSON.stringify(organization.sameAs) !== JSON.stringify(PUBLIC_IDENTITY.sameAs)) {
    throw new Error(`${route}/index.html canonical Organization sameAs drift`);
  }
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

async function verifyCoreRouteShells() {
  for (const route of REQUIRED_CORE_ROUTE_SHELLS) {
    const content = CORE_ROUTE_CONTENT[route];
    if (!content || content.route !== route) {
      throw new Error(`Cloudflare core route verifier has no canonical route-content source for ${route}`);
    }
    const path = resolve("dist", route.slice(1), "index.html");
    const html = await readFile(path, "utf8");
    const canonical = `${SITE_URL}${route}`;
    const required = [
      `data-irha-route-shell="${route}"`,
      'data-irha-route-content="core"',
      `<link rel="canonical" href="${canonical}"`,
      `<title>${escapeHtml(content.title)}</title>`,
      `>${escapeHtml(content.h1)}</h1>`,
      escapeHtml(content.intro),
      ...content.sections.flatMap((section) => [
        section.heading,
        section.body,
        ...(section.items ?? []),
        ...(section.links ?? []).map((link) => link.label),
      ]).map(escapeHtml),
      escapeHtml(content.primaryCta.label),
      ...(content.secondaryCta ? [escapeHtml(content.secondaryCta.label)] : []),
    ];
    for (const token of required) {
      if (!html.includes(token)) throw new Error(`${route}/index.html is missing route-specific crawler token: ${token}`);
    }
    for (const fingerprint of OBSOLETE_GENERIC_FINGERPRINTS) {
      if (html.includes(fingerprint)) throw new Error(`${route}/index.html retained obsolete generic-shell fingerprint: ${fingerprint}`);
    }
    verifyCanonicalOrganization(html, route);
    verifyCoreRouteSchema(html, route, content, canonical);
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

  await verifyCoreRouteShells();
  await writeFile(WORKER_PATH, worker, "utf8");
  console.log(`Patched Cloudflare worker with ${routePaths.length} exact catalogue routes, ${redirectEntries.length} one-hop redirects, real missing-route 404s and functional/draft noindex handling`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
