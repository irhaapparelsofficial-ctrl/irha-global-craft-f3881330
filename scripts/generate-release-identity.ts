import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  APPLICATION_FINGERPRINT_ALGORITHM,
  APPLICATION_FINGERPRINT_SCOPE,
  computeApplicationFingerprint,
} from "./application-fingerprint";
import { installI18nWorkerGateway } from "./install-i18n-worker-gateway";
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
const germanGatewayAssetPath = path.resolve(distDir, "_seo-static/de--gateway.irha");
const fingerprintPlaceholder = "0".repeat(64);

if (!existsSync(distDir)) {
  throw new Error(`Build output directory is missing: ${distDir}`);
}
if (!existsSync(publicManifestPath)) {
  throw new Error(`Base release manifest is missing: ${publicManifestPath}`);
}

installI18nWorkerGateway(distDir);

// SOURCE_SHA is set only after the workflow verifies the checked-out current
// main commit. Prefer it over GitHub's event SHA so a rerun of an older failed
// run cannot stamp a freshly checked-out build with stale release identity.
const identity = resolveSourceIdentity({
  ...process.env,
  GITHUB_SHA: process.env.SOURCE_SHA?.trim() || process.env.GITHUB_SHA,
});
const runtimeFingerprint = computeRuntimeFingerprint(distDir);
const applicationFingerprint = computeApplicationFingerprint(distDir);
const htmlFiles = listHtmlFiles(distDir);
if (htmlFiles.length === 0) {
  throw new Error(`No built HTML files found in ${distDir}`);
}
if (!existsSync(germanGatewayAssetPath)) {
  throw new Error(`German gateway flat asset is missing: ${germanGatewayAssetPath}`);
}
const identityDocuments = [...htmlFiles, germanGatewayAssetPath];

// First create the final HTML structure with a fixed-width full-build
// placeholder. Runtime and application fingerprints exclude host-generated
// document shells and are already final before identity metadata is injected.
for (const htmlPath of identityDocuments) {
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

for (const htmlPath of identityDocuments) {
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
const manifest = {
  ...createBuildManifest(
    readJsonObject(publicManifestPath),
    identity,
    buildFingerprint,
    runtimeFingerprint,
    builtAt,
  ),
  application_fingerprint: applicationFingerprint,
  application_fingerprint_algorithm: APPLICATION_FINGERPRINT_ALGORITHM,
  application_fingerprint_scope: APPLICATION_FINGERPRINT_SCOPE,
};
writeFileSync(distManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

console.log(
  `[release-identity] ${identity.sourceIdentityState}: ${identity.sourceCommit}; build ${buildFingerprint}; runtime ${runtimeFingerprint}; application ${applicationFingerprint} (${identityDocuments.length} identity-bearing documents)`,
);
