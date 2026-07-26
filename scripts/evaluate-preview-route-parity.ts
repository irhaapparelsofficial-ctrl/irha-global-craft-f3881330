import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { BuyerReadyCatalogRoute } from "./generate-buyer-ready-catalog-manifest";

const outputDir = resolve(process.env.CRAWL_OUTPUT_DIR || "artifacts/preview-route-parity");
const rawPath = join(outputDir, "production-route-parity.json");
const evaluationPath = join(outputDir, "preview-evaluation.json");
const summaryPath = join(outputDir, "preview-summary.md");
const manifestPath = resolve("dist/catalog-route-manifest.json");

type Severity = "critical" | "high" | "medium" | "low";
type Finding = { severity: Severity; code: string; path: string; message: string };
type CanonicalResult = {
  path: string;
  finalUrl: string;
  canonical: string;
  redirectHops: Array<{ status: number; from: string; to: string }>;
  robotsMeta: string;
  xRobotsTag: string;
  internalLinks: string[];
};
type CrawlReport = {
  inventory: {
    origin: string;
    canonicalOrigin: string;
    sourceCommit: string;
    expectedSourceCommit: string;
    sitemapUrlCount: number;
    dynamicProducts: number;
    dynamicTaxonomy: number;
    approvedRedirectRegistryRows: number;
    redirectsVerified: number;
  };
  summary: {
    redirectsFailed: number;
    functionalFailed: number;
    missingFailed: number;
  };
  canonicalResults: CanonicalResult[];
  findings: Finding[];
};
type Manifest = { productCount: number; products: BuyerReadyCatalogRoute[] };

const report = JSON.parse(await readFile(rawPath, "utf8")) as CrawlReport;
const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Manifest;

if (report.inventory.origin === report.inventory.canonicalOrigin) {
  throw new Error("Preview evaluator refuses to run against the production canonical origin");
}
if (report.inventory.sourceCommit !== report.inventory.expectedSourceCommit) {
  throw new Error("Preview crawl source identity is not exact");
}
if (report.inventory.dynamicProducts !== 254 || manifest.productCount !== 254 || manifest.products.length !== 254) {
  throw new Error("Preview evaluation requires the complete 254-product release");
}
if (report.inventory.dynamicTaxonomy !== 105 || report.inventory.sitemapUrlCount !== 408) {
  throw new Error("Preview route inventory is incomplete");
}
if (report.inventory.approvedRedirectRegistryRows < 1258 || report.inventory.redirectsVerified < 1258) {
  throw new Error("Preview redirect inventory is incomplete");
}
if (report.summary.redirectsFailed || report.summary.functionalFailed || report.summary.missingFailed) {
  throw new Error("Preview redirect, functional or missing-route verification failed");
}

const canonicalByPath = new Map(report.canonicalResults.map((item) => [item.path, item]));
const gateway = canonicalByPath.get("/de");
const gatewayCanonicalUrl = `${report.inventory.canonicalOrigin}/de/`;
const gatewayPreviewUrl = `${report.inventory.origin}/de/`;
const verifiedGatewaySlashCanonical = gateway?.canonical === gatewayCanonicalUrl
  && gateway.finalUrl === gatewayPreviewUrl
  && gateway.redirectHops.length === 1
  && gateway.redirectHops[0]?.status === 301
  && gateway.redirectHops[0]?.from === `${report.inventory.origin}/de`
  && gateway.redirectHops[0]?.to === gatewayPreviewUrl;
const gatewayNormalizationCodes = new Set([
  "sitemap_origin_mismatch",
  "canonical_redirect",
  "wrong_canonical",
]);
const ignored: Finding[] = [];
const blocking: Finding[] = [];

for (const finding of report.findings) {
  if (finding.code === "sitemap_noindex") {
    const page = canonicalByPath.get(finding.path);
    const previewHeaderNoindex = page?.xRobotsTag.toLowerCase().includes("noindex") === true;
    const documentNoindex = page?.robotsMeta.toLowerCase().includes("noindex") === true;
    if (previewHeaderNoindex && !documentNoindex) {
      ignored.push(finding);
      continue;
    }
  }

  if (finding.path === "/de" && verifiedGatewaySlashCanonical && gatewayNormalizationCodes.has(finding.code)) {
    ignored.push(finding);
    continue;
  }

  blocking.push(finding);
}

const counts = (items: Finding[]) => ({
  critical: items.filter((item) => item.severity === "critical").length,
  high: items.filter((item) => item.severity === "high").length,
  medium: items.filter((item) => item.severity === "medium").length,
  low: items.filter((item) => item.severity === "low").length,
});
const blockingCounts = counts(blocking);
const ignoredCounts = counts(ignored);
const evaluation = {
  schemaVersion: 1,
  evaluatedAt: new Date().toISOString(),
  sourceCommit: report.inventory.sourceCommit,
  previewOrigin: report.inventory.origin,
  canonicalOrigin: report.inventory.canonicalOrigin,
  inventory: report.inventory,
  ignoredPreviewContextFindings: ignoredCounts,
  blockingFindings: blockingCounts,
  blocking,
};
await writeFile(evaluationPath, `${JSON.stringify(evaluation, null, 2)}\n`, "utf8");
await writeFile(summaryPath, [
  "# Preview Route Parity Evaluation",
  "",
  `- Exact source: \`${report.inventory.sourceCommit}\``,
  `- Immutable preview: \`${report.inventory.origin}\``,
  `- Canonical production origin: \`${report.inventory.canonicalOrigin}\``,
  `- Sitemap URLs: ${report.inventory.sitemapUrlCount}`,
  `- Products: ${report.inventory.dynamicProducts}`,
  `- Taxonomy routes: ${report.inventory.dynamicTaxonomy}`,
  `- Redirects verified: ${report.inventory.redirectsVerified}`,
  `- Ignored preview-context findings: ${ignored.length}`,
  `- Blocking findings: critical ${blockingCounts.critical}, high ${blockingCounts.high}, medium ${blockingCounts.medium}, low ${blockingCounts.low}`,
  "",
  ...(blocking.length
    ? ["## Blocking findings", "", ...blocking.slice(0, 200).map((item) => `- **${item.severity.toUpperCase()} ${item.code}** \`${item.path}\` — ${item.message}`)]
    : ["No blocking route-parity findings remain in the immutable preview deployment."]),
  "",
].join("\n"), "utf8");

console.log(`Preview evaluation ignored ${ignored.length} preview-context findings and retained ${blocking.length} findings`);
if (blockingCounts.critical || blockingCounts.high) process.exitCode = 1;
