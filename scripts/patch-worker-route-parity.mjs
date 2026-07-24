import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const workerPath = resolve("dist/_worker.js");
const sourcePath = "/products/d22ac15e-d657-4a4c-804c-fb8697ceb050/plush-bathrobe-sleep-robe";
const staleTarget = "/products/leisure-nightwear/plush-bathrobe-sleep-robe";
const canonicalTarget = "/products/leisure-nightwear/women/robes/womens-plush-robe";

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const aliasPattern = new RegExp(
  `\\[\\s*["']${escapeRegExp(sourcePath)}["']\\s*,\\s*["']([^"']+)["']\\s*,?\\s*\\]`,
);

let worker = await readFile(workerPath, "utf8");
const initialMatch = worker.match(aliasPattern);
if (!initialMatch) {
  throw new Error("Cloudflare worker is missing the verified plush robe legacy alias");
}

const initialTarget = initialMatch[1];
if (initialTarget === staleTarget) {
  worker = worker.replace(
    aliasPattern,
    `["${sourcePath}", "${canonicalTarget}"]`,
  );
} else if (initialTarget !== canonicalTarget) {
  throw new Error(`Cloudflare worker plush robe alias points to an unexpected target: ${initialTarget}`);
}

const verifiedMatch = worker.match(aliasPattern);
if (!verifiedMatch || verifiedMatch[1] !== canonicalTarget) {
  throw new Error("Cloudflare worker alias could not be aligned to the verified plush robe canonical");
}
if (worker.includes(staleTarget)) {
  throw new Error("Cloudflare worker still contains the dead plush robe target");
}

await writeFile(workerPath, worker, "utf8");
console.log("Verified Cloudflare worker legacy plush robe alias against the live canonical");
