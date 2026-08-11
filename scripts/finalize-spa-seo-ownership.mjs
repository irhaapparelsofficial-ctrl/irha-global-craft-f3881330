import { access, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { CORE_ROUTE_CONTENT } from "../src/lib/routeContent.mjs";

const DIST = resolve("dist");
const MANIFEST_PATH = join(DIST, "seo-route-manifest.json");
const WORKER_PATH = join(DIST, "_worker.js");
const FALLBACK_MARKER = 'data-irha-fallback-seo="true"';
const CANONICAL_PATTERN = /<link\b[^>]*\brel=["']canonical["'][^>]*>/gi;
const HREF_PATTERN = /\bhref=["']([^"']+)["']/i;

function normalizePath(value) {
  if (!value || value === "/") return "/";
  return String(value).replace(/\/+$/, "") || "/";
}

function routeHtmlPath(pathname) {
  const normalized = normalizePath(pathname);
  return normalized === "/" ? join(DIST, "index.html") : join(DIST, normalized.slice(1), "index.html");
}

function escapeAttribute(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function canonicalTags(html) {
  return [...html.matchAll(CANONICAL_PATTERN)].map((match) => match[0]);
}

function sealStaticCanonical(html, route) {
  const tags = canonicalTags(html);
  if (tags.length !== 1) {
    throw new Error(`${route.path}: expected exactly one static canonical before SPA ownership seal, found ${tags.length}`);
  }
  const currentHref = tags[0].match(HREF_PATTERN)?.[1] || "";
  if (currentHref !== route.canonicalUrl) {
    throw new Error(`${route.path}: canonical drift before SPA ownership seal: ${currentHref || "missing"} != ${route.canonicalUrl}`);
  }
  const replacement = `<link ${FALLBACK_MARKER} rel="canonical" href="${escapeAttribute(route.canonicalUrl)}" />`;
  const output = html.replace(CANONICAL_PATTERN, replacement);
  const sealed = canonicalTags(output);
  if (sealed.length !== 1 || !sealed[0].includes(FALLBACK_MARKER)) {
    throw new Error(`${route.path}: static canonical ownership marker was not sealed deterministically`);
  }
  const href = sealed[0].match(HREF_PATTERN)?.[1] || "";
  if (href !== route.canonicalUrl) {
    throw new Error(`${route.path}: sealed canonical mismatch: ${href || "missing"} != ${route.canonicalUrl}`);
  }
  return output;
}

async function sealStaticHtml(manifest) {
  let sealedCount = 0;
  for (const route of manifest.routes.filter((candidate) => candidate.indexable !== false && candidate.sitemap !== false)) {
    const path = routeHtmlPath(route.path);
    await access(path);
    const html = await readFile(path, "utf8");
    const output = sealStaticCanonical(html, route);
    if (output !== html) await writeFile(path, output, "utf8");
    sealedCount += 1;
  }
  return sealedCount;
}

function publishedCorePaths() {
  return [...new Set(
    Object.values(CORE_ROUTE_CONTENT)
      .filter((route) => route && route.indexable !== false && typeof route.route === "string")
      .map((route) => normalizePath(route.route)),
  )].sort();
}

async function sealWorkerCoreRoutes(corePaths) {
  let worker = await readFile(WORKER_PATH, "utf8");
  const setName = "GP4V_PUBLISHED_CORE_PATHS";
  const declaration = `const ${setName} = new Set(${JSON.stringify(corePaths, null, 2)});\n`;

  if (!worker.includes(`const ${setName} = new Set(`)) {
    const anchor = "const PUBLISHED_CATALOG_PATHS = new Set(";
    const index = worker.indexOf(anchor);
    if (index < 0) throw new Error("Cloudflare worker published-catalog anchor is missing");
    worker = `${worker.slice(0, index)}${declaration}${worker.slice(index)}`;
  }

  const functionAnchor = `function isPublishedHtmlRoute(pathname) {\n  const normalized = normalizePath(pathname);`;
  const ownedFunctionAnchor = `${functionAnchor}\n  if (${setName}.has(normalized)) return true;`;
  if (!worker.includes(ownedFunctionAnchor)) {
    if (!worker.includes(functionAnchor)) throw new Error("Cloudflare worker published-route function anchor is missing");
    worker = worker.replace(functionAnchor, ownedFunctionAnchor);
  }

  for (const route of corePaths) {
    if (route === "/") continue;
    await access(routeHtmlPath(route));
  }

  if (!worker.includes('"/factory-capability-video"')) {
    throw new Error("Cloudflare worker core-route authority does not include /factory-capability-video");
  }
  if (!worker.includes(`if (${setName}.has(normalized)) return true;`)) {
    throw new Error("Cloudflare worker core-route authority dispatch was not sealed");
  }
  await writeFile(WORKER_PATH, worker, "utf8");
}

async function main() {
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
  if (!Array.isArray(manifest.routes) || manifest.routes.length === 0) {
    throw new Error("SPA SEO ownership seal requires a non-empty SEO route manifest");
  }
  const sealedCount = await sealStaticHtml(manifest);
  const corePaths = publishedCorePaths();
  await sealWorkerCoreRoutes(corePaths);
  console.log(JSON.stringify({
    phase: "gp4v-r2-spa-seo-ownership",
    staticCanonicalOwner: "marked-build-shell-before-react",
    runtimeCanonicalOwner: "react-helmet-after-mount",
    sealedStaticRoutes: sealedCount,
    publishedCoreRoutes: corePaths.length,
    watchRoutePublished: corePaths.includes("/factory-capability-video"),
  }, null, 2));
}

main().catch((error) => {
  console.error("GP-4V-R2 SPA SEO ownership seal failed");
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});
