import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

export const APPLICATION_FINGERPRINT_ALGORITHM = "sha256" as const;
export const APPLICATION_FINGERPRINT_SCOPE = "compiled-assets-js-css-wasm" as const;

export type ApplicationFingerprintEntry = {
  path: string;
  content: Buffer | string;
};

const COMPILED_APPLICATION_FILE = /\.(?:js|mjs|cjs|css|wasm)$/i;

function normalizePath(filePath: string): string {
  return filePath.replaceAll("\\", "/").replace(/^\.\//, "");
}

export function isApplicationFingerprintPath(filePath: string): boolean {
  const normalized = normalizePath(filePath).toLowerCase();
  return normalized.startsWith("assets/") && COMPILED_APPLICATION_FILE.test(normalized);
}

export function computeApplicationFingerprintFromEntries(
  entries: ApplicationFingerprintEntry[],
): string {
  const normalizedEntries = entries
    .map((entry) => ({
      path: normalizePath(entry.path),
      content: Buffer.isBuffer(entry.content)
        ? entry.content
        : Buffer.from(entry.content, "utf8"),
    }))
    .filter((entry) => isApplicationFingerprintPath(entry.path))
    .sort((a, b) => a.path.localeCompare(b.path));

  if (normalizedEntries.length === 0) {
    throw new Error("Cannot fingerprint an empty compiled application payload");
  }

  const seen = new Set<string>();
  const hash = createHash(APPLICATION_FINGERPRINT_ALGORITHM);

  for (const entry of normalizedEntries) {
    if (!entry.path || entry.path.startsWith("../") || path.isAbsolute(entry.path)) {
      throw new Error(`Invalid application fingerprint path: ${entry.path}`);
    }
    if (seen.has(entry.path)) {
      throw new Error(`Duplicate application fingerprint path: ${entry.path}`);
    }
    seen.add(entry.path);

    hash.update(entry.path, "utf8");
    hash.update("\0", "utf8");
    hash.update(String(entry.content.byteLength), "utf8");
    hash.update("\0", "utf8");
    hash.update(entry.content);
    hash.update("\0", "utf8");
  }

  return hash.digest("hex");
}

export function listApplicationFingerprintEntries(
  rootDir: string,
  currentDir = rootDir,
): ApplicationFingerprintEntry[] {
  const entries: ApplicationFingerprintEntry[] = [];

  for (const name of readdirSync(currentDir)) {
    const absolutePath = path.join(currentDir, name);
    const stats = statSync(absolutePath);
    if (stats.isDirectory()) {
      entries.push(...listApplicationFingerprintEntries(rootDir, absolutePath));
      continue;
    }
    if (!stats.isFile()) continue;

    const relativePath = normalizePath(path.relative(rootDir, absolutePath));
    if (!isApplicationFingerprintPath(relativePath)) continue;
    entries.push({ path: relativePath, content: readFileSync(absolutePath) });
  }

  return entries;
}

export function computeApplicationFingerprint(rootDir: string): string {
  return computeApplicationFingerprintFromEntries(
    listApplicationFingerprintEntries(rootDir),
  );
}
