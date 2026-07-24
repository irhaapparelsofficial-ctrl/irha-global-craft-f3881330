import { access, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { BuyerReadyCatalogRoute } from "./generate-buyer-ready-catalog-manifest";
import { relatedCandidates } from "./related-product-policy";

const OUTPUT_DIR = resolve(process.env.CRAWL_OUTPUT_DIR || "artifacts/production-route-parity");
const REPORT_PATH = join(OUTPUT_DIR, "production-route-parity.json");
const PAGE_CSV_PATH = join(OUTPUT_DIR, "canonical-pages.csv");
const SUMMARY_PATH = join(OUTPUT_DIR, "summary.md");
const EVIDENCE_PATH = join(OUTPUT_DIR, "related-product-reconciliation.json");
const MANIFEST_CANDIDATES = [resolve("dist/catalog-route-manifest.json"), resolve("public/catalog-route-manifest.json")];

type Severity = "critical" | "high" | "medium" | "low";
type Finding = { severity: Severity; code: string; path: string; message: string };
type CanonicalResult = {
  path: string; kind: string; status: number; finalUrl: string; title: string; metaDescription: string;
  h1: string; canonical: string; robotsMeta: string; xRobotsTag: string; language: string;
  breadcrumb: boolean; primaryImage: string; imageStatus: number | null; structuredDataTypes: string[];
  internalLinks: string[]; wordCount: number; sourceCommit: string; duplicateContentFingerprint: string;
  result: "pass" | "fail"; findings: Finding[];
};
type Report = {
  inventory: Record<string, unknown> & {
    generatedAt: string; origin: string; canonicalOrigin: string; sourceCommit: string;
    sitemapUrlCount: number; dynamicProducts: number; dynamicTaxonomy: number; staticAndMarketPages: number;
    approvedRedirectRegistryRows: number; redirectsVerified: number;
  };
  summary: {
    canonicalPassed: number; canonicalFailed: number; redirectsPassed: number; redirectsFailed: number;
    functionalPassed: number; functionalFailed: number; missingPassed: number; missingFailed: number;
    browserPassed: number; browserFailed: number; findings: Record<Severity, number>;
  };
  canonicalResults: CanonicalResult[];
  functionalResults: CanonicalResult[];
  missingResults: CanonicalResult[];
  findings: Finding[];
  [key: string]: unknown;
};
type Manifest = { schemaVersion: number; productCount: number; products: BuyerReadyCatalogRoute[] };

async function findManifest() {
  for (const candidate of MANIFEST_CANDIDATES) {
    try { await access(candidate); return candidate; } catch { /* try next */ }
  }
  throw new Error("A complete catalogue route manifest is required for related-product reconciliation");
}

function counts(findings: Finding[]): Record<Severity, number> {
  return {
    critical: findings.filter((item) => item.severity === "critical").length,
    high: findings.filter((item) => item.severity === "high").length,
    medium: findings.filter((item) => item.severity === "medium").length,
    low: findings.filter((item) => item.severity === "low").length,
  };
}

function csv(value: unknown) {
  const raw = typeof value === "string" ? value : JSON.stringify(value ?? "");
  return `"${raw.replace(/"/g, '""')}"`;
}

function canonicalCsv(report: Report) {
  const headers = ["path", "kind", "status", "finalUrl", "title", "metaDescription", "h1", "canonical", "robotsMeta", "xRobotsTag", "language", "breadcrumb", "primaryImage", "imageStatus", "structuredDataTypes", "internalLinkCount", "wordCount", "sourceCommit", "fingerprint", "result", "findings"];
  const rows = [...report.canonicalResults, ...report.functionalResults, ...report.missingResults].map((row) => [
    row.path, row.kind, row.status, row.finalUrl, row.title, row.metaDescription, row.h1, row.canonical,
    row.robotsMeta, row.xRobotsTag, row.language, row.breadcrumb, row.primaryImage, row.imageStatus,
    row.structuredDataTypes, row.internalLinks.length, row.wordCount, row.sourceCommit,
    row.duplicateContentFingerprint, row.result, row.findings,
  ].map(csv).join(","));
  return `${[headers.join(","), ...rows].join("\n")}\n`;
}

function summaryMarkdown(report: Report) {
  const blocking = report.findings.filter((item) => item.severity === "critical" || item.severity === "high");
  const findingCounts = report.summary.findings;
  return [
    "# Irha Apparels Route Parity", "", `- Generated: ${report.inventory.generatedAt}`,
    `- Crawled origin: \`${report.inventory.origin}\``, `- Canonical origin: \`${report.inventory.canonicalOrigin}\``,
    `- Source commit: \`${report.inventory.sourceCommit}\``, `- Sitemap URLs: ${report.inventory.sitemapUrlCount}`,
    `- Products: ${report.inventory.dynamicProducts}`, `- Taxonomy: ${report.inventory.dynamicTaxonomy}`,
    `- Static/market: ${report.inventory.staticAndMarketPages}`, `- Approved redirect rows: ${report.inventory.approvedRedirectRegistryRows}`,
    `- Redirects verified: ${report.inventory.redirectsVerified}`,
    `- Canonical pass/fail: ${report.summary.canonicalPassed}/${report.summary.canonicalFailed}`,
    `- Redirect pass/fail: ${report.summary.redirectsPassed}/${report.summary.redirectsFailed}`,
    `- Browser pass/fail: ${report.summary.browserPassed}/${report.summary.browserFailed}`,
    `- Findings: critical ${findingCounts.critical}, high ${findingCounts.high}, medium ${findingCounts.medium}, low ${findingCounts.low}`,
    "", "## Blocking findings", "",
    ...(blocking.length ? blocking.slice(0, 500).map((item) => `- **${item.severity.toUpperCase()} ${item.code}** \`${item.path}\` — ${item.message}`) : ["No blocking route-parity findings remain."]),
    "",
  ].join("\n");
}

async function main() {
  const report = JSON.parse(await readFile(REPORT_PATH, "utf8")) as Report;
  const manifest = JSON.parse(await readFile(await findManifest(), "utf8")) as Manifest;
  if (manifest.schemaVersion !== 1 || manifest.productCount !== 254 || manifest.products.length !== 254) {
    throw new Error("Related-product reconciliation requires the complete 254-product manifest");
  }

  const productByPath = new Map(manifest.products.map((product) => [product.canonical_path, product]));
  const resolved = new Set<string>();
  const unresolved: Array<{ path: string; allowed: string[]; actualLinks: string[] }> = [];

  for (const row of report.canonicalResults) {
    if (!row.findings.some((finding) => finding.code === "missing_related_product_link")) continue;
    const product = productByPath.get(row.path);
    if (!product) { unresolved.push({ path: row.path, allowed: [], actualLinks: row.internalLinks }); continue; }
    const allowed = relatedCandidates(manifest.products, product).map((item) => item.canonical_path);
    if (!allowed.length || !row.internalLinks.some((link) => allowed.includes(link))) {
      unresolved.push({ path: row.path, allowed, actualLinks: row.internalLinks });
      continue;
    }
    row.findings = row.findings.filter((finding) => finding.code !== "missing_related_product_link");
    row.result = row.findings.some((finding) => finding.severity === "critical" || finding.severity === "high") ? "fail" : "pass";
    resolved.add(row.path);
  }

  report.findings = report.findings.filter((finding) => !(finding.code === "missing_related_product_link" && resolved.has(finding.path)));
  report.summary.canonicalPassed = report.canonicalResults.filter((row) => row.result === "pass").length;
  report.summary.canonicalFailed = report.canonicalResults.filter((row) => row.result === "fail").length;
  report.summary.findings = counts(report.findings);

  const evidence = {
    schemaVersion: 1,
    reconciledAt: new Date().toISOString(),
    sourceCommit: report.inventory.sourceCommit,
    policy: "same-type-then-same-audience-then-same-main-category",
    resolvedCount: resolved.size,
    resolvedPaths: [...resolved].sort(),
    unresolvedCount: unresolved.length,
    unresolved,
  };

  await Promise.all([
    writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`),
    writeFile(PAGE_CSV_PATH, canonicalCsv(report)),
    writeFile(SUMMARY_PATH, `${summaryMarkdown(report)}\n`),
    writeFile(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`),
  ]);
  console.log(`Related-product route evidence reconciled: ${resolved.size} valid fallback routes, ${unresolved.length} unresolved`);
  if (unresolved.length) process.exitCode = 1;
}

main().catch(async (error) => {
  await writeFile(join(OUTPUT_DIR, "related-product-reconciliation-error.txt"), `${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  console.error(error);
  process.exit(1);
});
