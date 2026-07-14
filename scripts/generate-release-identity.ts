import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
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

if (!existsSync(distDir)) {
  throw new Error(`Build output directory is missing: ${distDir}`);
}
if (!existsSync(publicManifestPath)) {
  throw new Error(`Base release manifest is missing: ${publicManifestPath}`);
}

const identity = resolveSourceIdentity();
const builtAt = process.env.SOURCE_BUILT_AT?.trim() || new Date().toISOString();
const manifest = createBuildManifest(readJsonObject(publicManifestPath), identity, builtAt);

writeFileSync(distManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

const htmlFiles = listHtmlFiles(distDir);
if (htmlFiles.length === 0) {
  throw new Error(`No built HTML files found in ${distDir}`);
}

for (const htmlPath of htmlFiles) {
  const html = readFileSync(htmlPath, "utf8");
  writeFileSync(htmlPath, injectSourceIdentityMetas(html, identity), "utf8");
}

console.log(
  `[release-identity] ${identity.sourceIdentityState}: ${identity.sourceCommit} (${htmlFiles.length} HTML files)`,
);
