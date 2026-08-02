import { readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const DIST_ROOT = resolve("dist");
const BRAND_VERSION = "ia-brand-master-e001-20260802-32eee79b";
const VERSIONED_FAVICON = `/favicon.svg?v=${BRAND_VERSION}`;
const VERSIONED_APPLE_ICON = `/apple-touch-icon.png?v=${BRAND_VERSION}`;
const VERSIONED_MANIFEST = `/manifest.webmanifest?v=${BRAND_VERSION}`;

async function collectHtmlFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectHtmlFiles(path));
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(path);
  }
  return files;
}

function versionHtml(html) {
  return html
    .replaceAll('href="/favicon.svg"', `href="${VERSIONED_FAVICON}"`)
    .replaceAll('href="/icon-512x512.png"', `href="${VERSIONED_APPLE_ICON}"`)
    .replaceAll('href="/apple-touch-icon.png"', `href="${VERSIONED_APPLE_ICON}"`)
    .replaceAll('href="/manifest.webmanifest"', `href="${VERSIONED_MANIFEST}"`);
}

const htmlFiles = await collectHtmlFiles(DIST_ROOT);
if (htmlFiles.length === 0) throw new Error("Official brand versioning found no built HTML files");

for (const path of htmlFiles) {
  const before = await readFile(path, "utf8");
  const after = versionHtml(before);
  if (after.includes('href="/favicon.svg"')) {
    throw new Error(`Unversioned favicon link remains in ${path}`);
  }
  if (after !== before) await writeFile(path, after);
}

const manifestPath = resolve(DIST_ROOT, "manifest.webmanifest");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
manifest.icons = manifest.icons.map((icon) => ({
  ...icon,
  src: icon.src.includes("?") ? icon.src : `${icon.src}?v=${BRAND_VERSION}`,
}));
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Versioned official brand assets in ${htmlFiles.length} built HTML files`);
