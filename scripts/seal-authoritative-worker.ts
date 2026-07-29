import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { SeoRouteEntry } from "./finalize-seo-route-manifest";

const WORKER_PATH = resolve("dist/_worker.js");
const MANIFEST_PATH = resolve("dist/seo-route-manifest.json");

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

function arrayLiteral(values: string[]): string {
  return values.slice().sort().map((value) => `  ${JSON.stringify(value)},`).join("\n");
}

function replaceRequired(input: string, pattern: RegExp, replacement: string, label: string): string {
  if (!pattern.test(input)) throw new Error(`Worker patch point missing: ${label}`);
  return input.replace(pattern, replacement);
}

function main() {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as Manifest;
  const canonicalPaths = manifest.routes
    .filter((route) => route.indexable && route.sitemap)
    .map((route) => route.path);
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
    /(const assetResponse = explicitAssetPath\n\s*\? await routeShellAssetResponse\(request, env, pathname, explicitAssetPath\)\n\s*: await env\.ASSETS\.fetch\(request\);\n)/,
    `$1    if (isPreviewHost) {\n      return withNoIndexHeaders(assetResponse, "preview-host");\n    }\n`,
    "preview asset response policy",
  );

  writeFileSync(WORKER_PATH, worker);
  console.log(`Sealed worker with ${knownPaths.length} exact HTML routes; pages.dev HTML and robots are noindex`);
}

main();
