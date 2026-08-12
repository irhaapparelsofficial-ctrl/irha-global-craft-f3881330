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

function readQuotedHtmlAttribute(tag: string, attribute: string): string | null {
  const match = tag.match(new RegExp(`(?:^|\\s)${attribute}\\s*=\\s*(["'])(.*?)\\1`, "i"));
  return match?.[2] ?? null;
}

function canonicalLinkTags(html: string): string[] {
  return (html.match(/<link\b[^>]*>/gi) ?? []).filter((tag) => {
    const rel = readQuotedHtmlAttribute(tag, "rel");
    return rel?.split(/\s+/).some((token) => token.toLowerCase() === "canonical") ?? false;
  });
}

function patchStaticBuyerResponse(worker: string): string {
  const functionStart = worker.indexOf("async function staticBuyerResponse(");
  if (functionStart < 0) throw new Error("Static buyer response function is missing");
  const bodyStart = worker.indexOf("{", functionStart);
  if (bodyStart < 0) throw new Error("Static buyer response function body is missing");

  let depth = 0;
  let endOffset = -1;
  for (let index = bodyStart; index < worker.length; index += 1) {
    if (worker[index] === "{") depth += 1;
    if (worker[index] === "}") {
      depth -= 1;
      if (depth === 0) {
        endOffset = index + 1;
        break;
      }
    }
  }
  if (endOffset < 0) throw new Error("Static buyer response function boundary is missing");

  let block = worker.slice(functionStart, endOffset);
  if (!block.includes("const contentLocationPath = LOCALE_GATEWAY_PATHS.get(pathname) || pathname;")) {
    block = replaceOnce(
      block,
      "  const headers = new Headers(assetResponse.headers);",
      "  const contentLocationPath = LOCALE_GATEWAY_PATHS.get(pathname) || pathname;\n  const headers = new Headers(assetResponse.headers);",
      "static buyer response headers",
    );
  }

  const contentLocationBefore = '  headers.set("Content-Location", `${APEX_ORIGIN}${pathname}`);';
  const contentLocationAfter = '  headers.set("Content-Location", `${APEX_ORIGIN}${contentLocationPath}`);';
  if (block.includes(contentLocationBefore)) {
    block = replaceOnce(block, contentLocationBefore, contentLocationAfter, "static buyer Content-Location");
  } else if (!block.includes(contentLocationAfter)) {
    throw new Error("Static buyer Content-Location patch is missing");
  }

  return `${worker.slice(0, functionStart)}${block}${worker.slice(endOffset)}`;
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
  const canonicalLinks = canonicalLinkTags(gatewayHtml);
  if (canonicalLinks.length !== 1) {
    throw new Error(`German gateway HTML must contain exactly one canonical link, found ${canonicalLinks.length}`);
  }
  if (readQuotedHtmlAttribute(canonicalLinks[0], "href") !== "https://irhaapparels.com/de/") {
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

  const localeRegistry = `const LOCALE_GATEWAY_PATHS = new Map([\n  ["/de", "/de/"],\n  ["/fr", "/fr/"],\n  ["/nl", "/nl/"],\n]);\n\n`;
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
  const publishedRedirectBefore = `      isPublishedHtmlRoute(pathname) &&\n      !looksLikeFile(pathname)`;
  const publishedRedirectAfter = `      !LOCALE_GATEWAY_PATHS.has(pathname) &&\n      isPublishedHtmlRoute(pathname) &&\n      !looksLikeFile(pathname)`;
  if (worker.includes(staticRedirectBefore)) {
    worker = replaceOnce(worker, staticRedirectBefore, staticRedirectAfter, "static buyer trailing-slash guard");
  } else if (worker.includes(publishedRedirectBefore)) {
    worker = replaceOnce(worker, publishedRedirectBefore, publishedRedirectAfter, "published route trailing-slash guard");
  } else if (!worker.includes(staticRedirectAfter) && !worker.includes(publishedRedirectAfter)) {
    throw new Error("Published route trailing-slash guard is missing");
  }

  worker = patchStaticBuyerResponse(worker);

  for (const required of [
    assetEntry,
    '["/de", "/de/"]',
    '["/fr", "/fr/"]',
    '["/nl", "/nl/"]',
    "function localeGatewayRedirect(request, url, targetPath)",
    "!LOCALE_GATEWAY_PATHS.has(pathname)",
    "const contentLocationPath = LOCALE_GATEWAY_PATHS.get(pathname) || pathname;",
  ]) {
    if (!worker.includes(required)) throw new Error(`Locale gateway worker patch is incomplete: ${required}`);
  }

  writeFileSync(workerPath, worker, "utf8");
  console.log(`[i18n-worker] /de/, /fr/ and /nl/ are canonical locale gateways; slashless requests redirect canonically`);
}
