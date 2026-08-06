import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { SeoRouteEntry } from "./finalize-seo-route-manifest";

const WORKER_PATH = resolve("dist/_worker.js");
const MANIFEST_PATH = resolve("dist/seo-route-manifest.json");
const ROUTES_PATH = resolve("dist/_routes.json");

const UTILITY_ROUTES = [
  "/admin",
  "/auth",
  "/dashboard",
  "/login",
  "/log-in",
  "/signin",
  "/sign-in",
  "/seo-indexing",
  "/studio",
  "/compare",
  "/connect",
  "/inquiry-cart",
  "/shortlist",
  "/products/all",
];

const UTILITY_PREFIXES = [
  "/admin",
  "/auth",
  "/dashboard",
  "/login",
  "/log-in",
  "/signin",
  "/sign-in",
  "/seo-indexing",
  "/studio",
  "/compare",
  "/connect",
  "/inquiry-cart",
  "/shortlist",
  "/products/all",
];

const SAFE_PUBLIC_PREFIXES = [
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
  "/responsive/",
  "/thumbnails/",
];

type Manifest = { routes: SeoRouteEntry[] };
type CloudflareRoutes = { version: number; include: string[]; exclude: string[] };

const RELEASE_BOUNDARY_HELPERS = `function isReleaseBuildAssetPath(pathname) {
  return normalizePath(pathname).startsWith("/assets/");
}

function withDeploymentSafeHtmlHeaders(response) {
  const contentType = (response.headers.get("Content-Type") || "").toLowerCase();
  if (!contentType.includes("text/html")) return response;

  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-store, no-transform, max-age=0, must-revalidate");
  headers.set("CDN-Cache-Control", "no-store, no-transform");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Irha-Release-HTML", "deployment-safe");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function releaseBuildAssetResponse(request, env, pathname) {
  const assetResponse = await env.ASSETS.fetch(request);
  const contentType = (assetResponse.headers.get("Content-Type") || "").toLowerCase();
  const invalidAsset = !assetResponse.ok || contentType.includes("text/html");

  if (invalidAsset) {
    return new Response(request.method === "HEAD" ? null : "Build asset not found", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store, no-transform, max-age=0, must-revalidate",
        "CDN-Cache-Control": "no-store, no-transform",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
        "X-Irha-Asset-Status": "missing-release-asset",
        "X-Irha-Requested-Asset": pathname.slice(0, 500),
      },
    });
  }

  const headers = new Headers(assetResponse.headers);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("CDN-Cache-Control", "public, max-age=31536000, immutable");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Irha-Asset-Status", "current-release-asset");
  return new Response(request.method === "HEAD" ? null : assetResponse.body, {
    status: assetResponse.status,
    statusText: assetResponse.statusText,
    headers,
  });
}
`;

function arrayLiteral(values: string[]): string {
  return values.slice().sort().map((value) => `  ${JSON.stringify(value)},`).join("\n");
}

function workerLookupPath(path: string): string {
  if (path === "/") return "/";
  return path.replace(/\/+$/, "") || "/";
}

function replaceRequired(input: string, pattern: RegExp, replacement: string, label: string): string {
  if (!pattern.test(input)) throw new Error(`Worker patch point missing: ${label}`);
  return input.replace(pattern, replacement);
}

function main() {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as Manifest;
  const routes = JSON.parse(readFileSync(ROUTES_PATH, "utf8")) as CloudflareRoutes;
  if (routes.version !== 1 || !Array.isArray(routes.include) || !Array.isArray(routes.exclude)) {
    throw new Error("Cloudflare routes manifest is invalid");
  }
  if (routes.exclude.includes("/assets/*")) {
    throw new Error("Cloudflare release assets must pass through the Worker release-boundary guard");
  }

  const canonicalPaths = manifest.routes
    .filter((route) => route.indexable && route.sitemap)
    .map((route) => workerLookupPath(route.path));
  const knownPaths = [...new Set([...canonicalPaths, ...UTILITY_ROUTES])];

  let worker = readFileSync(WORKER_PATH, "utf8");
  worker = replaceRequired(
    worker,
    /const EXACT_PUBLIC_PATHS = new Set\(\[[\s\S]*?\]\);/,
    `const EXACT_PUBLIC_PATHS = new Set([\n${arrayLiteral(knownPaths)}\n]);`,
    "EXACT_PUBLIC_PATHS",
  );
  worker = replaceRequired(
    worker,
    /const PRIVATE_ROUTE_PREFIXES = \[[\s\S]*?\];/,
    `const PRIVATE_ROUTE_PREFIXES = [\n${arrayLiteral(UTILITY_PREFIXES)}\n];`,
    "PRIVATE_ROUTE_PREFIXES",
  );
  worker = replaceRequired(
    worker,
    /const PUBLIC_PREFIXES = \[[\s\S]*?\];/,
    `const PUBLIC_PREFIXES = [\n${arrayLiteral(SAFE_PUBLIC_PREFIXES)}\n];`,
    "PUBLIC_PREFIXES",
  );
  worker = replaceRequired(
    worker,
    /export function isKnownHtmlRoute\(pathname\) \{[\s\S]*?\n\}/,
    `export function isKnownHtmlRoute(pathname) {
  const normalized = normalizePath(pathname);
  if (STATIC_BUYER_ASSETS.has(normalized)) return true;
  if (EXACT_PUBLIC_PATHS.has(normalized)) return true;
  if (LEGACY_ALIASES.has(normalized)) return true;
  if (looksLikeFile(normalized)) return true;
  return PUBLIC_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}`,
    "isKnownHtmlRoute",
  );

  worker = replaceRequired(
    worker,
    /\nexport default \{/,
    `\n${RELEASE_BOUNDARY_HELPERS}\nexport default {`,
    "release-boundary helpers",
  );
  worker = replaceRequired(
    worker,
    /(const pathname = normalizePath\(url\.pathname\);\n)/,
    `$1    const isPreviewHost = url.hostname.endsWith(".pages.dev");\n`,
    "preview host flag",
  );
  worker = replaceRequired(
    worker,
    /(if \(\(request\.method === "GET" \|\| request\.method === "HEAD"\) && pathname === "\/robots\.txt"\) \{\n)(\s*)return robotsResponse\(request\);/,
    `$1$2if (isPreviewHost) {\n$2  return new Response(request.method === "HEAD" ? null : "User-agent: *\\nDisallow: /\\n", {\n$2    status: 200,\n$2    headers: {\n$2      "Content-Type": "text/plain; charset=utf-8",\n$2      "Cache-Control": "no-store",\n$2      "X-Robots-Tag": "noindex, nofollow, noarchive",\n$2    },\n$2  });\n$2}\n$2return robotsResponse(request);`,
    "preview robots policy",
  );
  worker = replaceRequired(
    worker,
    /if \(\(request\.method === "GET" \|\| request\.method === "HEAD"\) && isStaticBuyerPath\(pathname\)\) \{\n\s*return staticBuyerResponse\(request, env, pathname\);\n\s*\}/,
    `if ((request.method === "GET" || request.method === "HEAD") && isStaticBuyerPath(pathname)) {
      const staticResponse = await staticBuyerResponse(request, env, pathname);
      return isPreviewHost ? withNoIndexHeaders(staticResponse, "preview-host") : staticResponse;
    }`,
    "preview static buyer policy",
  );
  worker = replaceRequired(
    worker,
    /(\s+const explicitAssetPath = explicitRouteAssetPath\(pathname\);\n)/,
    `    if ((request.method === "GET" || request.method === "HEAD") && isReleaseBuildAssetPath(pathname)) {\n      return releaseBuildAssetResponse(request, env, pathname);\n    }\n\n$1`,
    "release build asset guard",
  );
  worker = replaceRequired(
    worker,
    /(const assetResponse = explicitAssetPath\n\s*\? await routeShellAssetResponse\(request, env, pathname, explicitAssetPath\)\n\s*: await env\.ASSETS\.fetch\(request\);\n)/,
    `$1    if (isPreviewHost) {\n      return withNoIndexHeaders(assetResponse, "preview-host");\n    }\n`,
    "preview asset response policy",
  );
  worker = replaceRequired(
    worker,
    /if \(shouldNoIndexCategoryQuery\(pathname, url\.searchParams\)\) \{\n\s*return withNoIndexHeaders\(assetResponse, "functional-category-query"\);\n\s*\}\n\s*return assetResponse;/,
    `if (shouldNoIndexCategoryQuery(pathname, url.searchParams)) {
      return withNoIndexHeaders(assetResponse, "functional-category-query");
    }
    return withDeploymentSafeHtmlHeaders(assetResponse);`,
    "deployment-safe HTML response",
  );

  writeFileSync(WORKER_PATH, worker);
  console.log(`Sealed worker with ${knownPaths.length} exact HTML routes; pages.dev HTML and robots are noindex; release assets are guarded`);
}

main();
