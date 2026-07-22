import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const workerPath = resolve("dist/_worker.js");
const sourcePath = "/products/d22ac15e-d657-4a4c-804c-fb8697ceb050/plush-bathrobe-sleep-robe";
const staleTarget = "/products/leisure-nightwear/plush-bathrobe-sleep-robe";
const canonicalTarget = "/products/leisure-nightwear/women/robes/womens-plush-robe";

let worker = await readFile(workerPath, "utf8");
const stalePair = `["${sourcePath}",\n    "${staleTarget}",\n  ]`;
const canonicalPair = `["${sourcePath}",\n    "${canonicalTarget}",\n  ]`;

if (worker.includes(stalePair)) worker = worker.replace(stalePair, canonicalPair);
if (!worker.includes(canonicalPair)) {
  throw new Error("Cloudflare worker alias could not be aligned to the verified plush robe canonical");
}
if (worker.includes(staleTarget)) {
  throw new Error("Cloudflare worker still contains the dead plush robe target");
}

await writeFile(workerPath, worker, "utf8");
console.log("Aligned Cloudflare worker legacy plush robe alias to the verified live canonical");
