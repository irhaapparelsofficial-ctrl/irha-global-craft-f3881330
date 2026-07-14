import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

export const SOURCE_COMMIT_ENV_KEYS = [
  "GITHUB_SHA",
  "CF_PAGES_COMMIT_SHA",
  "VERCEL_GIT_COMMIT_SHA",
  "LOVABLE_GIT_COMMIT_SHA",
  "SOURCE_COMMIT_SHA",
] as const;

export const BUILD_FINGERPRINT_ALGORITHM = "sha256" as const;

const RELEASE_META_NAMES = [
  "x-irha-source-commit",
  "x-irha-source-identity-state",
  "x-irha-build-fingerprint",
  "x-irha-build-fingerprint-algorithm",
] as const;

const FINGERPRINT_EXCLUDED_PATHS = new Set([
  "build.json",
  "cloudflare-deployment.json",
]);

export type SourceIdentityState = "verified" | "unverified";

export type SourceIdentity = {
  sourceCommit: string;
  sourceCommitShort: string;
  sourceIdentityState: SourceIdentityState;
};

export type BuildManifest = Record<string, unknown> & {
  source_commit: string;
  source_commit_short: string;
  built_at: string;
  source_identity_state: SourceIdentityState;
  build_fingerprint: string;
  build_fingerprint_algorithm: typeof BUILD_FINGERPRINT_ALGORITHM;
};

export type BuildFingerprintEntry = {
  path: string;
  content: Buffer | string;
};

const SHA_PATTERN = /^[0-9a-f]{40}$/;
const FINGERPRINT_PATTERN = /^[0-9a-f]{64}$/;

export function normalizeCommitSha(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return SHA_PATTERN.test(normalized) ? normalized : null;
}

export function normalizeBuildFingerprint(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return FINGERPRINT_PATTERN.test(normalized) ? normalized : null;
}

export function readGitHead(): string | null {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

export function resolveSourceIdentity(
  env: Record<string, string | undefined> = process.env,
  gitHead: () => string | null = readGitHead,
): SourceIdentity {
  for (const key of SOURCE_COMMIT_ENV_KEYS) {
    const commit = normalizeCommitSha(env[key]);
    if (commit) {
      return {
        sourceCommit: commit,
        sourceCommitShort: commit.slice(0, 12),
        sourceIdentityState: "verified",
      };
    }
  }

  const gitCommit = normalizeCommitSha(gitHead());
  if (gitCommit) {
    return {
      sourceCommit: gitCommit,
      sourceCommitShort: gitCommit.slice(0, 12),
      sourceIdentityState: "verified",
    };
  }

  return {
    sourceCommit: "unverified",
    sourceCommitShort: "unverified",
    sourceIdentityState: "unverified",
  };
}

export function createBuildManifest(
  baseManifest: Record<string, unknown>,
  identity: SourceIdentity,
  buildFingerprint: string,
  builtAt = new Date().toISOString(),
): BuildManifest {
  const normalizedFingerprint = normalizeBuildFingerprint(buildFingerprint);
  if (!normalizedFingerprint) {
    throw new Error(`Invalid build fingerprint: ${buildFingerprint}`);
  }
  if (Number.isNaN(Date.parse(builtAt))) {
    throw new Error(`Invalid built_at timestamp: ${builtAt}`);
  }

  return {
    ...baseManifest,
    source_commit: identity.sourceCommit,
    source_commit_short: identity.sourceCommitShort,
    built_at: builtAt,
    source_identity_state: identity.sourceIdentityState,
    build_fingerprint: normalizedFingerprint,
    build_fingerprint_algorithm: BUILD_FINGERPRINT_ALGORITHM,
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function removeMeta(html: string, name: string): string {
  const escapedName = escapeRegExp(name);
  return html.replace(
    new RegExp(`<meta\\b(?=[^>]*\\bname=["']${escapedName}["'])[^>]*>\\s*`, "gi"),
    "",
  );
}

function upsertMeta(html: string, name: string, content: string): string {
  const withoutExisting = removeMeta(html, name);
  const tag = `    <meta name="${name}" content="${escapeHtmlAttribute(content)}" />\n`;

  if (!/<\/head>/i.test(withoutExisting)) {
    throw new Error("Cannot inject release identity meta tags: </head> is missing");
  }

  return withoutExisting.replace(/<\/head>/i, `${tag}</head>`);
}

export function normalizeHtmlForBuildFingerprint(html: string): string {
  let normalized = html;
  for (const name of RELEASE_META_NAMES) {
    normalized = removeMeta(normalized, name);
  }
  return normalized.replace(/\r\n/g, "\n");
}

function normalizeFingerprintPath(filePath: string): string {
  return filePath.replaceAll("\\", "/").replace(/^\.\//, "");
}

export function computeBuildFingerprintFromEntries(entries: BuildFingerprintEntry[]): string {
  const normalizedEntries = entries
    .map((entry) => ({
      path: normalizeFingerprintPath(entry.path),
      content: Buffer.isBuffer(entry.content) ? entry.content : Buffer.from(entry.content, "utf8"),
    }))
    .filter((entry) => !FINGERPRINT_EXCLUDED_PATHS.has(entry.path))
    .map((entry) => ({
      ...entry,
      content: entry.path.toLowerCase().endsWith(".html")
        ? Buffer.from(normalizeHtmlForBuildFingerprint(entry.content.toString("utf8")), "utf8")
        : entry.content,
    }))
    .sort((a, b) => a.path.localeCompare(b.path));

  const seen = new Set<string>();
  const hash = createHash(BUILD_FINGERPRINT_ALGORITHM);

  for (const entry of normalizedEntries) {
    if (!entry.path || entry.path.startsWith("../") || path.isAbsolute(entry.path)) {
      throw new Error(`Invalid build fingerprint path: ${entry.path}`);
    }
    if (seen.has(entry.path)) {
      throw new Error(`Duplicate build fingerprint path: ${entry.path}`);
    }
    seen.add(entry.path);

    hash.update(entry.path, "utf8");
    hash.update("\0", "utf8");
    hash.update(String(entry.content.byteLength), "utf8");
    hash.update("\0", "utf8");
    hash.update(entry.content);
    hash.update("\0", "utf8");
  }

  if (normalizedEntries.length === 0) {
    throw new Error("Cannot fingerprint an empty build output");
  }

  return hash.digest("hex");
}

export function listBuildFingerprintEntries(rootDir: string, currentDir = rootDir): BuildFingerprintEntry[] {
  const entries: BuildFingerprintEntry[] = [];

  for (const name of readdirSync(currentDir)) {
    const absolutePath = path.join(currentDir, name);
    const stats = statSync(absolutePath);
    if (stats.isDirectory()) {
      entries.push(...listBuildFingerprintEntries(rootDir, absolutePath));
      continue;
    }
    if (!stats.isFile()) continue;

    const relativePath = normalizeFingerprintPath(path.relative(rootDir, absolutePath));
    if (FINGERPRINT_EXCLUDED_PATHS.has(relativePath)) continue;
    entries.push({ path: relativePath, content: readFileSync(absolutePath) });
  }

  return entries;
}

export function computeBuildFingerprint(rootDir: string): string {
  return computeBuildFingerprintFromEntries(listBuildFingerprintEntries(rootDir));
}

export function injectSourceIdentityMetas(
  html: string,
  identity: SourceIdentity,
  buildFingerprint: string,
): string {
  const normalizedFingerprint = normalizeBuildFingerprint(buildFingerprint);
  if (!normalizedFingerprint) {
    throw new Error(`Invalid build fingerprint: ${buildFingerprint}`);
  }

  const metas: Array<[string, string]> = [
    ["x-irha-source-commit", identity.sourceCommit],
    ["x-irha-source-identity-state", identity.sourceIdentityState],
    ["x-irha-build-fingerprint", normalizedFingerprint],
    ["x-irha-build-fingerprint-algorithm", BUILD_FINGERPRINT_ALGORITHM],
  ];

  return metas.reduce((result, [name, content]) => upsertMeta(result, name, content), html);
}

export function extractMetaContent(html: string, name: string): string | null {
  const escapedName = escapeRegExp(name);
  const tagPattern = new RegExp(
    `<meta\\b(?=[^>]*\\bname=["']${escapedName}["'])[^>]*>`,
    "i",
  );
  const tag = html.match(tagPattern)?.[0];
  if (!tag) return null;

  const content = tag.match(/\bcontent=["']([^"']*)["']/i)?.[1];
  return content ?? null;
}

export function listHtmlFiles(rootDir: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(rootDir)) {
    const absolutePath = path.join(rootDir, entry);
    const stats = statSync(absolutePath);
    if (stats.isDirectory()) {
      files.push(...listHtmlFiles(absolutePath));
    } else if (stats.isFile() && entry.toLowerCase().endsWith(".html")) {
      files.push(absolutePath);
    }
  }

  return files.sort();
}

export function readJsonObject(filePath: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(readFileSync(filePath, "utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Expected a JSON object in ${filePath}`);
  }
  return parsed as Record<string, unknown>;
}
