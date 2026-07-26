import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const GATEWAY_ROUTE = "/de";
const GATEWAY_CANONICAL = "/de/";
const GATEWAY_ASSET = "/_seo-static/de--gateway.irha";

function replaceOnce(source: string, search: string, replacement: string, label: string): string {
  const count = source.split(search).length - 1;
  if (count !== 1) {
    throw new Error(`Expected exactly one ${label} anchor, found ${count}`);
  }
  return source.replace(search, replacement);
}

export function installI18nWorkerGateway(distDir: string): void {
  const workerPath = path.join(distDir, "_worker.js");
  const gatewayHtmlPath = path.join(distDir, "de", "index.html");
  const gatewayAssetPath = path.join(distDir, GATEWAY_ASSET.slice(1));

  if (!existsSync(workerPath)) throw new Error(`Cloudflare worker is missing: ${workerPath}`);
  if (!existsSync(gatewayHtmlPath)) throw new Error(`German gateway HTML is missing: ${gatewayHtmlPath}`);

  const gatewayHtml = readFileSync(gatewayHtmlPath, "utf8");
  if (!gatewayHtml.includes('data-irha-german-gateway="published"')) {
    throw new Error("German gateway HTML is not the reviewed published shell");
  }
  if (!gatewayHtml.includes('<link rel="canonical" href="https://irhaapparels.com/de/"')) {
    throw new Error("German gateway HTML is missing its /de/ self canonical");
  }

  mkdirSync(path.dirname(gatewayAssetPath), { recursive: true });
  writeFileSync(gatewayAssetPath, gatewayHtml, "utf8");

  let worker = readFileSync(workerPath, "utf8");
  const assetEntry = `  ["/de", "/_seo-static/de--gateway.irha"],`;
  if (!worker.includes(assetEntry)) {
    worker = replaceOnce(
      worker,
      "const STATIC_BUYER_ASSETS = new Map([\n",
      `const STATIC_BUYER_ASSETS = new Map([\n${assetEntry}\n`,
      "STATIC_BUYER_ASSETS",
    );
  }

  const localeRegistry = `const LOCALE_GATEWAY_PATHS = new Map([\n  ["/de", "/de/"],\n]);\n\n`;
  if (!worker.includes("const LOCALE_GATEWAY_PATHS = new Map([")) {
    worker = replaceOnce(
      worker,
      "const PRIVATE_ROUTE_PREFIXES = [",
      `${localeRegistry}const PRIVATE_ROUTE_PREFIXES = [`,
      "PRIVATE_ROUTE_PREFIXES",
    );
  }

  const redirectFunction = `function localeGatewayRedirect(request, url, targetPath) {\n  const target = new URL(targetPath, url);\n  target.search = url.search;\n  const status = request.method === "GET" || request.method === "HEAD" ? 301 : 308;\n  return new Response(null, {\n    status,\n    headers: {\n      Location: target.toString(),\n      "Cache-Control": "public, max-age=3600",\n      "X-Irha-Canonical-Redirect": "locale-gateway-trailing-slash",\n    },\n  });\n}\n\n`;
  if (!worker.includes("function localeGatewayRedirect(request, url, targetPath)")) {
    worker = replaceOnce(
      worker,
      "function canonicalPathRedirect(request, url, pathname) {",
      `${redirectFunction}function canonicalPathRedirect(request, url, pathname) {`,
      "canonicalPathRedirect",
    );
  }

  const localeFetchGuard = `    const localeGatewayTarget = LOCALE_GATEWAY_PATHS.get(pathname);\n    if (localeGatewayTarget && url.pathname !== localeGatewayTarget) {\n      return localeGatewayRedirect(request, url, localeGatewayTarget);\n    }\n\n`;
  if (!worker.includes("const localeGatewayTarget = LOCALE_GATEWAY_PATHS.get(pathname);")) {
    const aliasAnchors = [
      "    const aliasTarget = generatedLegacyAliasTarget(pathname) || legacyAliasTarget(pathname);",
      "    const aliasTarget = legacyAliasTarget(pathname);",
    ];
    const matchingAliasAnchors = aliasAnchors.filter((anchor) => worker.includes(anchor));
    if (matchingAliasAnchors.length !== 1) {
      throw new Error(`Expected exactly one legacy alias fetch guard anchor, found ${matchingAliasAnchors.length}`);
    }
    const aliasAnchor = matchingAliasAnchors[0];
    worker = replaceOnce(
      worker,
      aliasAnchor,
      `${localeFetchGuard}${aliasAnchor}`,
      "legacy alias fetch guard",
    );
  }

  const staticRedirectBefore = "    if (isStaticBuyerPath(pathname) && url.pathname !== pathname) {";
  const staticRedirectAfter = "    if (isStaticBuyerPath(pathname) && url.pathname !== pathname && !LOCALE_GATEWAY_PATHS.has(pathname)) {";
  if (worker.includes(staticRedirectBefore)) {
    worker = replaceOnce(worker, staticRedirectBefore, staticRedirectAfter, "static buyer trailing-slash guard");
  } else if (!worker.includes(staticRedirectAfter)) {
    throw new Error("Static buyer trailing-slash guard is missing");
  }

  if (!worker.includes("const contentLocationPath = LOCALE_GATEWAY_PATHS.get(pathname) || pathname;")) {
    worker = replaceOnce(
      worker,
      "  const headers = new Headers(assetResponse.headers);",
      "  const contentLocationPath = LOCALE_GATEWAY_PATHS.get(pathname) || pathname;\n  const headers = new Headers(assetResponse.headers);",
      "static buyer response headers",
    );
  }
  const contentLocationBefore = '  headers.set("Content-Location", `${APEX_ORIGIN}${pathname}`);';
  const contentLocationAfter = '  headers.set("Content-Location", `${APEX_ORIGIN}${contentLocationPath}`);';
  if (worker.includes(contentLocationBefore)) {
    worker = replaceOnce(worker, contentLocationBefore, contentLocationAfter, "static buyer Content-Location");
  } else if (!worker.includes(contentLocationAfter)) {
    throw new Error("Static buyer Content-Location patch is missing");
  }

  for (const required of [
    assetEntry,
    '["/de", "/de/"]',
    "function localeGatewayRedirect(request, url, targetPath)",
    "!LOCALE_GATEWAY_PATHS.has(pathname)",
    "const contentLocationPath = LOCALE_GATEWAY_PATHS.get(pathname) || pathname;",
  ]) {
    if (!worker.includes(required)) throw new Error(`German locale gateway worker patch is incomplete: ${required}`);
  }

  writeFileSync(workerPath, worker, "utf8");
  console.log(`[i18n-worker] /de/ served from /_seo-static/de--gateway.irha; /de redirects to the canonical gateway`);
}
