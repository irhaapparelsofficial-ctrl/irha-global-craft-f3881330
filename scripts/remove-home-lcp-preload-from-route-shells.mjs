import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const DIST_DIR = resolve("dist");
const ROOT_INDEX = join(DIST_DIR, "index.html");
const HOME_LCP_PRELOAD = /\s*<link\s+data-irha-home-lcp\b[^>]*>\s*/gi;

async function collectIndexFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectIndexFiles(path));
    if (entry.isFile() && entry.name === "index.html") files.push(path);
  }
  return files;
}

async function main() {
  const rootHtml = await readFile(ROOT_INDEX, "utf8");
  if (!rootHtml.includes("data-irha-home-lcp")) {
    throw new Error("Homepage LCP preload marker is missing from dist/index.html");
  }

  const indexFiles = await collectIndexFiles(DIST_DIR);
  let patched = 0;
  for (const file of indexFiles) {
    if (file === ROOT_INDEX) continue;
    const html = await readFile(file, "utf8");
    const next = html.replace(HOME_LCP_PRELOAD, "\n");
    if (next !== html) {
      await writeFile(file, next, "utf8");
      patched += 1;
    }
  }

  console.log(`Removed homepage-only LCP preload from ${patched} non-home route shells`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
