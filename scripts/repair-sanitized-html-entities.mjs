import { readdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

const DIST_DIR = resolve(process.env.IRHA_DIST_DIR || "dist");
const TEXT_EXTENSIONS = new Set([".html", ".js", ".json", ".txt", ".xml", ".webmanifest"]);
const MALFORMED_APOSTROPHE = /(&#39|&#x27|&apos)\s+product style;([sS])\b/g;
const REMAINING_CORRUPTION = /(?:&#39|&#x27|&apos)\s+product style;[sS]\b/i;

async function listTextFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listTextFiles(absolute));
    else if (entry.isFile() && TEXT_EXTENSIONS.has(extname(entry.name).toLowerCase())) files.push(absolute);
  }
  return files;
}

const files = await listTextFiles(DIST_DIR);
let repairedFiles = 0;
let repairedEntities = 0;

for (const file of files) {
  const source = await readFile(file, "utf8");
  let fileRepairs = 0;
  const repaired = source.replace(MALFORMED_APOSTROPHE, (_match, entity, suffix) => {
    fileRepairs += 1;
    return `${entity};${suffix}`;
  });
  if (fileRepairs > 0) {
    await writeFile(file, repaired, "utf8");
    repairedFiles += 1;
    repairedEntities += fileRepairs;
  }
}

const violations = [];
for (const file of files) {
  const source = await readFile(file, "utf8");
  if (REMAINING_CORRUPTION.test(source)) violations.push(file.slice(DIST_DIR.length + 1));
}
if (violations.length > 0) {
  throw new Error(`Malformed sanitized apostrophe entities remain in: ${violations.slice(0, 50).join(", ")}`);
}

console.log(JSON.stringify({ repairedFiles, repairedEntities, remainingCorruptions: 0 }));
