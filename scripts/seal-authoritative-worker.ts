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

  const previewGuard = `
    if (url.hostname.endsWith(".pages.dev")) {
      return withNoIndexHeaders(assetResponse, "preview-host");
    }
`;
  worker = replaceRequired(
    worker,
    /(const assetResponse = await env\.ASSETS\.fetch\(request\);\n)/,
    `$1${previewGuard}`,
    "preview-host guard",
  );

  writeFileSync(WORKER_PATH, worker);
  console.log(`Sealed worker with ${knownPaths.length} exact HTML routes; pages.dev responses are noindex`);
}

main();
