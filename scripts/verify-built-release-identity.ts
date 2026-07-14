import { readFileSync } from "node:fs";
import path from "node:path";
import {
  extractMetaContent,
  listHtmlFiles,
  normalizeCommitSha,
  readJsonObject,
} from "./release-identity";

const distDir = path.resolve(process.cwd(), "dist");
const expectedCommit = normalizeCommitSha(process.env.GITHUB_SHA);

if (!expectedCommit) {
  throw new Error("GITHUB_SHA must be an exact 40-character Git SHA for release verification");
}

const manifest = readJsonObject(path.join(distDir, "build.json"));
const sourceCommit = manifest.source_commit;
const sourceCommitShort = manifest.source_commit_short;
const identityState = manifest.source_identity_state;
const builtAt = manifest.built_at;

if (sourceCommit !== expectedCommit) {
  throw new Error(`Built source_commit mismatch: expected ${expectedCommit}, received ${String(sourceCommit)}`);
}
if (sourceCommitShort !== expectedCommit.slice(0, 12)) {
  throw new Error(
    `Built source_commit_short mismatch: expected ${expectedCommit.slice(0, 12)}, received ${String(sourceCommitShort)}`,
  );
}
if (identityState !== "verified") {
  throw new Error(`Built source identity is not verified: ${String(identityState)}`);
}
if (typeof builtAt !== "string" || Number.isNaN(Date.parse(builtAt))) {
  throw new Error(`Built built_at is not a valid ISO timestamp: ${String(builtAt)}`);
}

const htmlFiles = listHtmlFiles(distDir);
if (htmlFiles.length === 0) {
  throw new Error(`No built HTML files found in ${distDir}`);
}

for (const htmlPath of htmlFiles) {
  const html = readFileSync(htmlPath, "utf8");
  const htmlCommit = extractMetaContent(html, "x-irha-source-commit");
  const htmlState = extractMetaContent(html, "x-irha-source-identity-state");

  if (htmlCommit !== expectedCommit) {
    throw new Error(
      `${path.relative(process.cwd(), htmlPath)} source commit mismatch: expected ${expectedCommit}, received ${String(htmlCommit)}`,
    );
  }
  if (htmlState !== "verified") {
    throw new Error(
      `${path.relative(process.cwd(), htmlPath)} source identity is not verified: ${String(htmlState)}`,
    );
  }
}

console.log(`[release-identity] verified exact Git SHA ${expectedCommit} across build.json and ${htmlFiles.length} HTML files`);
