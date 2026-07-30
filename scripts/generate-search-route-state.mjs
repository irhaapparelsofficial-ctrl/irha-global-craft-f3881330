import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const CANONICAL_ORIGIN = "https://irhaapparels.com";
export const DEFAULT_ROUTE_MANIFEST_PATH = resolve("public/seo-route-manifest.json");
export const DEFAULT_ROUTE_STATE_PATH = resolve("seo/search-route-state.json");

function parseArguments(args = process.argv.slice(2)) {
  const options = {
    input: DEFAULT_ROUTE_MANIFEST_PATH,
    output: DEFAULT_ROUTE_STATE_PATH,
    check: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--input") {
      const value = args[index + 1];
      if (!value) throw new Error("--input requires a path");
      options.input = resolve(value);
      index += 1;
    } else if (argument === "--output") {
      const value = args[index + 1];
      if (!value) throw new Error("--output requires a path");
      options.output = resolve(value);
      index += 1;
    } else if (argument === "--check") {
      options.check = true;
    } else if (argument === "--write") {
      options.check = false;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  return options;
}

function canonicalPathname(url) {
  return url.pathname === "/" ? "/" : url.pathname.replace(/\/+$/, "");
}

function normalizeCanonicalUrl(value) {
  const url = new URL(String(value ?? "").trim());
  if (url.origin !== CANONICAL_ORIGIN) {
    throw new Error(`Search route must use canonical origin ${CANONICAL_ORIGIN}: ${url.href}`);
  }
  url.pathname = canonicalPathname(url);
  url.search = "";
  url.hash = "";
  return url.href;
}

function stableValue(value, key = "") {
  // lastmod is intentionally excluded from the material route digest. A timestamp-only
  // touch must not create a search-engine notification when the buyer-visible route,
  // metadata, hierarchy, image, schema contract and query targeting are unchanged.
  if (key === "lastmod") return undefined;
  if (Array.isArray(value)) {
    return value.map((entry) => stableValue(entry)).filter((entry) => entry !== undefined);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((entryKey) => [entryKey, stableValue(value[entryKey], entryKey)])
        .filter(([, entryValue]) => entryValue !== undefined),
    );
  }
  return value;
}

function sha256(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function canonicalJson(value) {
  return JSON.stringify(stableValue(value));
}

export function buildSearchRouteState(manifest) {
  if (!manifest || typeof manifest !== "object") {
    throw new Error("SEO route manifest must be a JSON object");
  }
  if (manifest.schemaVersion !== 1) {
    throw new Error(`Unsupported SEO route manifest schema version: ${manifest.schemaVersion}`);
  }
  if (manifest.canonicalOrigin !== CANONICAL_ORIGIN) {
    throw new Error(`SEO route manifest canonical origin must be ${CANONICAL_ORIGIN}`);
  }
  if (!Array.isArray(manifest.routes) || manifest.routes.length === 0) {
    throw new Error("SEO route manifest must contain routes");
  }
  if (manifest.routeCount !== manifest.routes.length) {
    throw new Error(`SEO route manifest route count mismatch: ${manifest.routeCount} != ${manifest.routes.length}`);
  }

  const routeEntries = [];
  const seenUrls = new Set();

  for (const route of manifest.routes) {
    if (route?.indexable !== true || route?.sitemap !== true) continue;
    const url = normalizeCanonicalUrl(route.canonicalUrl);
    if (seenUrls.has(url)) throw new Error(`Duplicate canonical route in SEO manifest: ${url}`);
    seenUrls.add(url);

    routeEntries.push({
      url,
      digest: sha256(canonicalJson(route)),
    });
  }

  routeEntries.sort((left, right) => left.url.localeCompare(right.url));
  if (routeEntries.length === 0) throw new Error("SEO route manifest has no indexable sitemap routes");
  if (manifest.sitemapCount !== routeEntries.length) {
    throw new Error(`SEO route manifest sitemap count mismatch: ${manifest.sitemapCount} != ${routeEntries.length}`);
  }

  const stateWithoutDigest = {
    schemaVersion: 1,
    canonicalOrigin: CANONICAL_ORIGIN,
    routeCount: routeEntries.length,
    routes: routeEntries,
  };

  return {
    ...stateWithoutDigest,
    contentDigest: sha256(canonicalJson(stateWithoutDigest)),
  };
}

export function renderSearchRouteState(state) {
  return `${JSON.stringify(state, null, 2)}\n`;
}

function buildStateFromManifest(inputPath) {
  const manifest = JSON.parse(readFileSync(inputPath, "utf8"));
  return buildSearchRouteState(manifest);
}

export function generateSearchRouteState({
  inputPath = DEFAULT_ROUTE_MANIFEST_PATH,
  outputPath = DEFAULT_ROUTE_STATE_PATH,
} = {}) {
  const state = buildStateFromManifest(inputPath);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, renderSearchRouteState(state), "utf8");
  return state;
}

export function checkSearchRouteState({
  inputPath = DEFAULT_ROUTE_MANIFEST_PATH,
  outputPath = DEFAULT_ROUTE_STATE_PATH,
} = {}) {
  const state = buildStateFromManifest(inputPath);
  const expected = renderSearchRouteState(state);
  let committed;
  try {
    committed = readFileSync(outputPath, "utf8");
  } catch (error) {
    throw new Error(`Committed material search route state is missing at ${outputPath}: ${String(error)}`);
  }
  if (committed !== expected) {
    throw new Error(
      `Committed material search route state is stale. Run node scripts/generate-search-route-state.mjs --write before merging.`,
    );
  }
  return state;
}

export function main(args = process.argv.slice(2)) {
  const options = parseArguments(args);
  const state = options.check
    ? checkSearchRouteState({ inputPath: options.input, outputPath: options.output })
    : generateSearchRouteState({ inputPath: options.input, outputPath: options.output });
  const mode = options.check ? "verified" : "written";
  console.log(`[search-route-state] ${mode} routes=${state.routeCount} digest=${state.contentDigest}`);
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  try {
    main();
  } catch (error) {
    console.error(`[search-route-state] ${(error && error.message) || error}`);
    process.exitCode = 1;
  }
}
