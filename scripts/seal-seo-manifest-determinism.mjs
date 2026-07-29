import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const manifestPath = resolve(process.argv[2] || "public/seo-route-manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

if (!Array.isArray(manifest.routes) || manifest.routeCount !== manifest.routes.length) {
  throw new Error("SEO route manifest cannot be sealed because its route inventory is invalid");
}

delete manifest.generatedAt;

const canonicalPayload = JSON.stringify({
  schemaVersion: manifest.schemaVersion,
  canonicalOrigin: manifest.canonicalOrigin,
  slashPolicy: manifest.slashPolicy,
  routeCount: manifest.routeCount,
  sitemapCount: manifest.sitemapCount,
  productCount: manifest.productCount,
  blogArticleCount: manifest.blogArticleCount,
  routeTypeCounts: manifest.routeTypeCounts,
  routes: manifest.routes,
});
manifest.contentDigest = `sha256:${createHash("sha256").update(canonicalPayload).digest("hex")}`;

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Sealed deterministic SEO manifest ${manifest.contentDigest}`);
