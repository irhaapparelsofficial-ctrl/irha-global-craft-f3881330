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
};

const SHA_PATTERN = /^[0-9a-f]{40}$/;

export function normalizeCommitSha(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return SHA_PATTERN.test(normalized) ? normalized : null;
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
  builtAt = new Date().toISOString(),
): BuildManifest {
  if (Number.isNaN(Date.parse(builtAt))) {
    throw new Error(`Invalid built_at timestamp: ${builtAt}`);
  }

  return {
    ...baseManifest,
    source_commit: identity.sourceCommit,
    source_commit_short: identity.sourceCommitShort,
    built_at: builtAt,
    source_identity_state: identity.sourceIdentityState,
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

function upsertMeta(html: string, name: string, content: string): string {
  const escapedName = escapeRegExp(name);
  const existingTag = new RegExp(
    `<meta\\b(?=[^>]*\\bname=["']${escapedName}["'])[^>]*>\\s*`,
    "gi",
  );
  const withoutExisting = html.replace(existingTag, "");
  const tag = `    <meta name="${name}" content="${escapeHtmlAttribute(content)}" />\n`;

  if (!/<\/head>/i.test(withoutExisting)) {
    throw new Error("Cannot inject release identity meta tags: </head> is missing");
  }

  return withoutExisting.replace(/<\/head>/i, `${tag}</head>`);
}

export function injectSourceIdentityMetas(html: string, identity: SourceIdentity): string {
  return upsertMeta(
    upsertMeta(html, "x-irha-source-commit", identity.sourceCommit),
    "x-irha-source-identity-state",
    identity.sourceIdentityState,
  );
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
