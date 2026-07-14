import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  computeBuildFingerprint,
  computeRuntimeFingerprint,
  createBuildManifest,
  injectSourceIdentityMetas,
  listHtmlFiles,
  readJsonObject,
  resolveSourceIdentity,
} from "./release-identity";

const rootDir = process.cwd();
const distDir = path.resolve(rootDir, "dist");
const publicManifestPath = path.resolve(rootDir, "public/build.json");
const distManifestPath = path.resolve(distDir, "build.json");
const fingerprintPlaceholder = "0".repeat(64);

if (!existsSync(distDir)) {
  throw new Error(`Build output directory is missing: ${distDir}`);
}
if (!existsSync(publicManifestPath)) {
  throw new Error(`Base release manifest is missing: ${publicManifestPath}`);
}

const identity = resolveSourceIdentity();
const runtimeFingerprint = computeRuntimeFingerprint(distDir);
const htmlFiles = listHtmlFiles(distDir);
if (htmlFiles.length === 0) {
  throw new Error(`No built HTML files found in ${distDir}`);
}

// First create the final HTML structure with a fixed-width full-build
// placeholder. Runtime fingerprinting excludes host-generated document shells
// and therefore is already final before HTML identity metadata is injected.
for (const htmlPath of htmlFiles) {
  const html = readFileSync(htmlPath, "utf8");
  writeFileSync(
    htmlPath,
    injectSourceIdentityMetas(
      html,
      identity,
      fingerprintPlaceholder,
      runtimeFingerprint,
    ),
    "utf8",
  );
}

const buildFingerprint = computeBuildFingerprint(distDir);
const placeholderAttribute = `content="${fingerprintPlaceholder}"`;
const fingerprintAttribute = `content="${buildFingerprint}"`;

for (const htmlPath of htmlFiles) {
  const html = readFileSync(htmlPath, "utf8");
  const occurrences = html.split(placeholderAttribute).length - 1;
  if (occurrences !== 1) {
    throw new Error(
      `Expected exactly one build fingerprint placeholder in ${htmlPath}, found ${occurrences}`,
    );
  }
  writeFileSync(
    htmlPath,
    html.replace(placeholderAttribute, fingerprintAttribute),
    "utf8",
  );
}

const builtAt = process.env.SOURCE_BUILT_AT?.trim() || new Date().toISOString();
const manifest = createBuildManifest(
  readJsonObject(publicManifestPath),
  identity,
  buildFingerprint,
  runtimeFingerprint,
  builtAt,
);
writeFileSync(distManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

console.log(
  `[release-identity] ${identity.sourceIdentityState}: ${identity.sourceCommit}; build ${buildFingerprint}; runtime ${runtimeFingerprint} (${htmlFiles.length} HTML files)`,
);
