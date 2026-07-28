import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";

class ArtifactAuditError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ArtifactAuditError";
    this.code = code;
  }
}

const TEXT_EXTENSIONS = new Set([
  ".html", ".js", ".mjs", ".cjs", ".css", ".json", ".txt", ".xml", ".svg", ".webmanifest",
]);

const SECRET_PATTERNS = [
  ["supabase-secret", /sb_secret_[A-Za-z0-9_-]{12,}/g],
  ["supabase-management-token", /(?:SUPABASE_ACCESS_TOKEN|sbp_[A-Za-z0-9]{20,})/gi],
  ["service-role-assignment", /(?:SUPABASE_SERVICE_ROLE_KEY|service_role_key)\s*[:=]\s*["'`][^"'`\s]{12,}/gi],
  ["service-role-jwt-payload", /["']?role["']?\s*:\s*["']service_role["']/gi],
  ["private-key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ["bearer-credential", /authorization\s*[:=]\s*["'`]bearer\s+[A-Za-z0-9._-]{20,}/gi],
  ["runner-debug-path", /(?:\/home\/runner\/work\/|\/tmp\/user_fn_[A-Za-z0-9_-]+)/g],
  ["private-migration-ledger", /private\.(?:irha_repository_migration_ledger|irha_forward_migrations|checkpoint_\d+_b2b_migration_ledger)/g],
  ["vault-object-reference", /vault\.(?:secrets|decrypted_secrets)/g],
];

function fail(code, message) {
  throw new ArtifactAuditError(code, message);
}

function listFiles(root) {
  const files = [];
  const visit = (directory) => {
    for (const name of readdirSync(directory).sort()) {
      const path = join(directory, name);
      const stats = statSync(path);
      if (stats.isDirectory()) visit(path);
      else if (stats.isFile()) files.push(path);
    }
  };
  visit(root);
  return files;
}

function scanText(label, content) {
  if (/sourceMappingURL\s*=|\/\/[#@]\s*sourceMappingURL=/i.test(content)) {
    fail("SOURCE_MAP_REFERENCE", `${label} contains a sourceMappingURL reference`);
  }
  for (const [kind, pattern] of SECRET_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(content)) fail("PUBLIC_SECRET_OR_DEBUG_LEAK", `${label} contains ${kind}`);
  }
}

function auditDirectory(directory) {
  const root = resolve(directory);
  const files = listFiles(root);
  if (files.length === 0) fail("EMPTY_ARTIFACT", `No files found in ${root}`);

  const mapFiles = files.filter((path) => path.toLowerCase().endsWith(".map"));
  if (mapFiles.length > 0) {
    fail("SOURCE_MAP_FILE", `Production artifact contains source maps: ${mapFiles.map((path) => relative(root, path)).join(", ")}`);
  }

  let scanned = 0;
  for (const path of files) {
    if (!TEXT_EXTENSIONS.has(extname(path).toLowerCase())) continue;
    const content = readFileSync(path, "utf8");
    scanText(relative(root, path), content);
    scanned += 1;
  }

  return { mode: "directory", root, files: files.length, text_files_scanned: scanned, source_maps: 0 };
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    return await fetch(url, {
      redirect: "follow",
      cache: "no-store",
      ...options,
      signal: controller.signal,
      headers: {
        "cache-control": "no-cache",
        ...(options.headers ?? {}),
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

function assetUrls(html, origin) {
  const urls = new Set();
  const expression = /(?:src|href)=["']([^"']+\.(?:js|mjs|css)(?:\?[^"']*)?)["']/gi;
  for (const match of html.matchAll(expression)) {
    const url = new URL(match[1], origin);
    if (url.origin === new URL(origin).origin) urls.add(url.href);
  }
  return [...urls].sort();
}

function predictableMapUrls(assetUrl) {
  const url = new URL(assetUrl);
  const withoutQuery = `${url.origin}${url.pathname}`;
  const candidates = new Set([`${withoutQuery}.map`]);
  if (/\.(?:js|mjs|css)$/i.test(withoutQuery)) candidates.add(withoutQuery.replace(/\.(js|mjs|css)$/i, ".$1.map"));
  return [...candidates];
}

async function auditOrigin(origin, expectedSha) {
  const normalized = new URL(origin).origin;
  const cacheBust = `${expectedSha.slice(0, 12)}-${Date.now()}`;
  const buildResponse = await fetchWithTimeout(`${normalized}/build.json?sec_m02=${cacheBust}`);
  if (!buildResponse.ok) fail("BUILD_IDENTITY_UNAVAILABLE", `${normalized}/build.json returned ${buildResponse.status}`);
  const buildText = await buildResponse.text();
  scanText(`${normalized}/build.json`, buildText);
  let build;
  try {
    build = JSON.parse(buildText);
  } catch {
    fail("BUILD_IDENTITY_MALFORMED", `${normalized}/build.json is not valid JSON`);
  }
  if (build.source_commit !== expectedSha || build.source_identity_state !== "verified") {
    fail("BUILD_IDENTITY_MISMATCH", `${normalized} does not serve exact SHA ${expectedSha}`);
  }

  const htmlResponse = await fetchWithTimeout(`${normalized}/?sec_m02=${cacheBust}`);
  if (!htmlResponse.ok) fail("HTML_UNAVAILABLE", `${normalized} returned ${htmlResponse.status}`);
  const html = await htmlResponse.text();
  scanText(`${normalized}/`, html);

  const assets = assetUrls(html, normalized);
  if (assets.length === 0) fail("ASSET_INVENTORY_EMPTY", `${normalized} HTML exposed no JavaScript or CSS assets`);

  let checkedMapPaths = 0;
  for (const asset of assets) {
    const response = await fetchWithTimeout(asset);
    if (!response.ok) fail("ASSET_UNAVAILABLE", `${asset} returned ${response.status}`);
    const content = await response.text();
    scanText(asset, content);
    for (const mapUrl of predictableMapUrls(asset)) {
      const mapResponse = await fetchWithTimeout(mapUrl, { redirect: "manual" });
      checkedMapPaths += 1;
      if (mapResponse.status >= 200 && mapResponse.status < 300) {
        fail("PUBLIC_SOURCE_MAP", `${mapUrl} is publicly accessible (${mapResponse.status})`);
      }
    }
  }

  return {
    origin: normalized,
    exact_sha: expectedSha,
    assets_scanned: assets.length,
    predictable_map_paths_checked: checkedMapPaths,
    public_source_maps: 0,
  };
}

async function auditRemote(origins, expectedSha) {
  if (!/^[0-9a-f]{40}$/.test(expectedSha)) fail("INVALID_SHA", "EXPECTED_SHA must be a 40-character lowercase Git SHA");
  const results = [];
  for (const origin of origins) results.push(await auditOrigin(origin, expectedSha));
  return { mode: "remote", results };
}

async function main() {
  const mode = process.env.ARTIFACT_AUDIT_MODE ?? "directory";
  let result;
  if (mode === "directory") {
    result = auditDirectory(process.env.ARTIFACT_DIRECTORY ?? "dist");
  } else if (mode === "remote") {
    const expectedSha = String(process.env.EXPECTED_SHA ?? "").trim();
    const origins = String(process.env.ARTIFACT_ORIGINS ?? "https://irha-apparels.pages.dev,https://irhaapparels.com")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    if (origins.length === 0) fail("MISSING_ORIGIN", "ARTIFACT_ORIGINS must contain at least one origin");
    result = await auditRemote(origins, expectedSha);
  } else {
    fail("INVALID_MODE", `Unsupported ARTIFACT_AUDIT_MODE ${mode}`);
  }
  console.log(JSON.stringify({ ok: true, ...result }, null, 2));
}

main().catch((error) => {
  const code = error instanceof ArtifactAuditError ? error.code : "UNEXPECTED_FAILURE";
  console.error(`${code}: ${error.message}`);
  process.exitCode = 1;
});
