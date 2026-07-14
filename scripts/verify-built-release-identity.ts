import { readFileSync } from "node:fs";
import path from "node:path";
import {
  APPLICATION_FINGERPRINT_ALGORITHM,
  APPLICATION_FINGERPRINT_SCOPE,
  computeApplicationFingerprint,
} from "./application-fingerprint";
import {
  BUILD_FINGERPRINT_ALGORITHM,
  RUNTIME_FINGERPRINT_SCOPE,
  computeBuildFingerprint,
  computeRuntimeFingerprint,
  extractMetaContent,
  listHtmlFiles,
  normalizeBuildFingerprint,
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
const manifestFingerprint = normalizeBuildFingerprint(manifest.build_fingerprint);
const fingerprintAlgorithm = manifest.build_fingerprint_algorithm;
const manifestRuntimeFingerprint = normalizeBuildFingerprint(manifest.runtime_fingerprint);
const runtimeFingerprintAlgorithm = manifest.runtime_fingerprint_algorithm;
const runtimeFingerprintScope = manifest.runtime_fingerprint_scope;
const manifestApplicationFingerprint = normalizeBuildFingerprint(
  manifest.application_fingerprint,
);
const applicationFingerprintAlgorithm = manifest.application_fingerprint_algorithm;
const applicationFingerprintScope = manifest.application_fingerprint_scope;

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
if (!manifestFingerprint) {
  throw new Error(`Built build_fingerprint is invalid: ${String(manifest.build_fingerprint)}`);
}
if (fingerprintAlgorithm !== BUILD_FINGERPRINT_ALGORITHM) {
  throw new Error(
    `Built fingerprint algorithm mismatch: expected ${BUILD_FINGERPRINT_ALGORITHM}, received ${String(fingerprintAlgorithm)}`,
  );
}
if (!manifestRuntimeFingerprint) {
  throw new Error(`Built runtime_fingerprint is invalid: ${String(manifest.runtime_fingerprint)}`);
}
if (runtimeFingerprintAlgorithm !== BUILD_FINGERPRINT_ALGORITHM) {
  throw new Error(
    `Built runtime fingerprint algorithm mismatch: expected ${BUILD_FINGERPRINT_ALGORITHM}, received ${String(runtimeFingerprintAlgorithm)}`,
  );
}
if (runtimeFingerprintScope !== RUNTIME_FINGERPRINT_SCOPE) {
  throw new Error(
    `Built runtime fingerprint scope mismatch: expected ${RUNTIME_FINGERPRINT_SCOPE}, received ${String(runtimeFingerprintScope)}`,
  );
}
if (!manifestApplicationFingerprint) {
  throw new Error(
    `Built application_fingerprint is invalid: ${String(manifest.application_fingerprint)}`,
  );
}
if (applicationFingerprintAlgorithm !== APPLICATION_FINGERPRINT_ALGORITHM) {
  throw new Error(
    `Built application fingerprint algorithm mismatch: expected ${APPLICATION_FINGERPRINT_ALGORITHM}, received ${String(applicationFingerprintAlgorithm)}`,
  );
}
if (applicationFingerprintScope !== APPLICATION_FINGERPRINT_SCOPE) {
  throw new Error(
    `Built application fingerprint scope mismatch: expected ${APPLICATION_FINGERPRINT_SCOPE}, received ${String(applicationFingerprintScope)}`,
  );
}

const recomputedFingerprint = computeBuildFingerprint(distDir);
if (recomputedFingerprint !== manifestFingerprint) {
  throw new Error(
    `Built fingerprint mismatch: manifest ${manifestFingerprint}, recomputed ${recomputedFingerprint}`,
  );
}

const recomputedRuntimeFingerprint = computeRuntimeFingerprint(distDir);
if (recomputedRuntimeFingerprint !== manifestRuntimeFingerprint) {
  throw new Error(
    `Runtime fingerprint mismatch: manifest ${manifestRuntimeFingerprint}, recomputed ${recomputedRuntimeFingerprint}`,
  );
}

const recomputedApplicationFingerprint = computeApplicationFingerprint(distDir);
if (recomputedApplicationFingerprint !== manifestApplicationFingerprint) {
  throw new Error(
    `Application fingerprint mismatch: manifest ${manifestApplicationFingerprint}, recomputed ${recomputedApplicationFingerprint}`,
  );
}

const htmlFiles = listHtmlFiles(distDir);
if (htmlFiles.length === 0) {
  throw new Error(`No built HTML files found in ${distDir}`);
}

for (const htmlPath of htmlFiles) {
  const html = readFileSync(htmlPath, "utf8");
  const htmlCommit = extractMetaContent(html, "x-irha-source-commit");
  const htmlState = extractMetaContent(html, "x-irha-source-identity-state");
  const htmlFingerprint = extractMetaContent(html, "x-irha-build-fingerprint");
  const htmlFingerprintAlgorithm = extractMetaContent(
    html,
    "x-irha-build-fingerprint-algorithm",
  );
  const htmlRuntimeFingerprint = extractMetaContent(html, "x-irha-runtime-fingerprint");
  const htmlRuntimeFingerprintAlgorithm = extractMetaContent(
    html,
    "x-irha-runtime-fingerprint-algorithm",
  );
  const htmlRuntimeFingerprintScope = extractMetaContent(
    html,
    "x-irha-runtime-fingerprint-scope",
  );

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
  if (htmlFingerprint !== manifestFingerprint) {
    throw new Error(
      `${path.relative(process.cwd(), htmlPath)} fingerprint mismatch: expected ${manifestFingerprint}, received ${String(htmlFingerprint)}`,
    );
  }
  if (htmlFingerprintAlgorithm !== BUILD_FINGERPRINT_ALGORITHM) {
    throw new Error(
      `${path.relative(process.cwd(), htmlPath)} fingerprint algorithm mismatch: expected ${BUILD_FINGERPRINT_ALGORITHM}, received ${String(htmlFingerprintAlgorithm)}`,
    );
  }
  if (htmlRuntimeFingerprint !== manifestRuntimeFingerprint) {
    throw new Error(
      `${path.relative(process.cwd(), htmlPath)} runtime fingerprint mismatch: expected ${manifestRuntimeFingerprint}, received ${String(htmlRuntimeFingerprint)}`,
    );
  }
  if (htmlRuntimeFingerprintAlgorithm !== BUILD_FINGERPRINT_ALGORITHM) {
    throw new Error(
      `${path.relative(process.cwd(), htmlPath)} runtime fingerprint algorithm mismatch: expected ${BUILD_FINGERPRINT_ALGORITHM}, received ${String(htmlRuntimeFingerprintAlgorithm)}`,
    );
  }
  if (htmlRuntimeFingerprintScope !== RUNTIME_FINGERPRINT_SCOPE) {
    throw new Error(
      `${path.relative(process.cwd(), htmlPath)} runtime fingerprint scope mismatch: expected ${RUNTIME_FINGERPRINT_SCOPE}, received ${String(htmlRuntimeFingerprintScope)}`,
    );
  }
}

console.log(
  `[release-identity] verified exact Git SHA ${expectedCommit}, build ${manifestFingerprint}, runtime ${manifestRuntimeFingerprint}, and application ${manifestApplicationFingerprint} across build.json and ${htmlFiles.length} HTML files`,
);
