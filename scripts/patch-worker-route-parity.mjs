import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const workerPath = resolve("dist/_worker.js");
const aliases = [
  [
    "/products/d22ac15e-d657-4a4c-804c-fb8697ceb050/plush-bathrobe-sleep-robe",
    "/products/leisure-nightwear/women/robes/womens-plush-robe",
    ["/products/leisure-nightwear/plush-bathrobe-sleep-robe"],
  ],
  [
    "/products/bavarian-trachten-wear/alpine-trachten-hat",
    "/products/bavarian-trachten-wear/accessories/alpine-hats/alpine-trachten-hat",
    ["/products/bavarian-trachten-wear"],
  ],
  [
    "/products/bavarian-trachten-wear/bavarian-checkered-shirt",
    "/products/bavarian-trachten-wear/men/trachten-shirts/bavarian-checkered-shirt",
    ["/products/bavarian-trachten-wear"],
  ],
  [
    "/products/bavarian-trachten-wear/bavarian-embroidered-vest",
    "/products/bavarian-trachten-wear/men/trachten-vests/bavarian-embroidered-vest",
    ["/products/bavarian-trachten-wear"],
  ],
  [
    "/products/sportswear-baseball",
    "/products/sportswear/team-club/baseball-uniforms",
    ["/products/sportswear"],
  ],
  [
    "/products/sportswear-basketball",
    "/products/sportswear/team-club/basketball-uniforms",
    ["/products/sportswear"],
  ],
  [
    "/products/sportswear-cricket",
    "/products/sportswear/team-club/cricket-uniforms",
    ["/products/sportswear"],
  ],
  [
    "/products/sportswear-rugby",
    "/products/sportswear/team-club/rugby-kits",
    ["/products/sportswear"],
  ],
  [
    "/products/sportswear-soccer",
    "/products/sportswear/team-club/football-kits",
    ["/products/sportswear"],
  ],
  [
    "/products/sportswear/athletic-onesie",
    "/products/sportswear/unisex/athletic-bodysuits/athletic-onesie",
    ["/products/sportswear/fitness-activewear/performance-activewear"],
  ],
  [
    "/products/sportswear/baseball-jersey",
    "/products/sportswear/team-club/baseball-uniforms/baseball-jersey",
    ["/products/sportswear"],
  ],
  [
    "/products/sportswear/baseball-uniform-kit",
    "/products/sportswear/team-club/baseball-uniforms/baseball-uniform-kit",
    ["/products/sportswear"],
  ],
  [
    "/products/sportswear/basketball-mesh-jersey",
    "/products/sportswear/team-club/basketball-uniforms/basketball-mesh-jersey",
    ["/products/sportswear"],
  ],
  [
    "/products/sportswear/basketball-uniform-kit",
    "/products/sportswear/team-club/basketball-uniforms/basketball-uniform-kit",
    ["/products/sportswear"],
  ],
];

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const mapStart = "const LEGACY_ALIASES = new Map([";

let worker = await readFile(workerPath, "utf8");
const startIndex = worker.indexOf(mapStart);
if (startIndex < 0) {
  throw new Error("Cloudflare worker legacy alias map is missing");
}
const endIndex = worker.indexOf("]);", startIndex + mapStart.length);
if (endIndex < 0) {
  throw new Error("Cloudflare worker legacy alias map is incomplete");
}

const missing = [];
for (const [sourcePath, canonicalTarget, acceptedStaleTargets] of aliases) {
  const aliasPattern = new RegExp(
    `\\[\\s*["']${escapeRegExp(sourcePath)}["']\\s*,\\s*["']([^"']+)["']\\s*,?\\s*\\]`,
  );
  const match = worker.match(aliasPattern);
  if (!match) {
    missing.push(`  ["${sourcePath}", "${canonicalTarget}"],`);
    continue;
  }

  const currentTarget = match[1];
  if (currentTarget !== canonicalTarget && !acceptedStaleTargets.includes(currentTarget)) {
    throw new Error(
      `Cloudflare worker alias ${sourcePath} points to unexpected target ${currentTarget}`,
    );
  }
  if (currentTarget !== canonicalTarget) {
    worker = worker.replace(aliasPattern, `["${sourcePath}", "${canonicalTarget}"]`);
  }
}

if (missing.length) {
  const refreshedEndIndex = worker.indexOf("]);", worker.indexOf(mapStart) + mapStart.length);
  worker = `${worker.slice(0, refreshedEndIndex)}${missing.join("\n")}\n${worker.slice(refreshedEndIndex)}`;
}

for (const [sourcePath, canonicalTarget] of aliases) {
  const verifiedPattern = new RegExp(
    `\\[\\s*["']${escapeRegExp(sourcePath)}["']\\s*,\\s*["']${escapeRegExp(canonicalTarget)}["']\\s*,?\\s*\\]`,
  );
  if (!verifiedPattern.test(worker)) {
    throw new Error(`Cloudflare worker alias could not be aligned: ${sourcePath}`);
  }
}

await writeFile(workerPath, worker, "utf8");
console.log(`Verified ${aliases.length} Cloudflare worker legacy aliases against canonical routes`);
