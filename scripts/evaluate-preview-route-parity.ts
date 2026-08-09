import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { BuyerReadyCatalogRoute } from "./generate-buyer-ready-catalog-manifest";

const outputDir = resolve(process.env.CRAWL_OUTPUT_DIR || "artifacts/preview-route-parity");
const rawPath = join(outputDir, "production-route-parity.json");
const evaluationPath = join(outputDir, "preview-evaluation.json");
const summaryPath = join(outputDir, "preview-summary.md");
const catalogManifestPath = resolve("dist/catalog-route-manifest.json");
const seoManifestPath = resolve("dist/seo-route-manifest.json");

type Severity = "critical" | "high" | "medium" | "low";
type Finding = { severity: Severity; code: string; path: string; message: string };
type RedirectHop = { status: number; from: string; to: string };
type CanonicalResult = {
  path: string;
  finalUrl: string;
  canonical: string;
  redirectHops: RedirectHop[];
  robotsMeta: string;
  xRobotsTag: string;
  internalLinks: string[];
};
type RedirectResult = {
  sourcePath: string;
  expectedDestination: string;
  actualDestination: string;
  status: number;
  destinationStatus: number;
  hops: number;
  result: "pass" | "fail";
  findings: Finding[];
};
type FunctionalResult = CanonicalResult & {
  requestedUrl: string;
  kind: string;
  status: number;
  title: string;
  sourceCommit: string;
  result: "pass" | "fail";
  findings: Finding[];
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
  redirectResults: RedirectResult[];
  functionalResults: FunctionalResult[];
  findings: Finding[];
};
type CatalogManifest = { productCount: number; products: BuyerReadyCatalogRoute[] };
type SeoManifest = {
  schemaVersion: number;
  sitemapCount: number;
  productCount: number;
  routes: Array<{ canonicalUrl: string; indexable: boolean; sitemap: boolean }>;
};

const [reportText, catalogManifestText, seoManifestText] = await Promise.all([
  readFile(rawPath, "utf8"),
  readFile(catalogManifestPath, "utf8"),
  readFile(seoManifestPath, "utf8"),
]);
const report = JSON.parse(reportText) as CrawlReport;
const catalogManifest = JSON.parse(catalogManifestText) as CatalogManifest;
const seoManifest = JSON.parse(seoManifestText) as SeoManifest;

if (report.inventory.origin === report.inventory.canonicalOrigin) {
  throw new Error("Preview evaluator refuses to run against the production canonical origin");
}
if (report.inventory.sourceCommit !== report.inventory.expectedSourceCommit) {
  throw new Error("Preview crawl source identity is not exact");
}
if (
  report.inventory.dynamicProducts !== 254
  || catalogManifest.productCount !== 254
  || catalogManifest.products.length !== 254
  || seoManifest.productCount !== 254
) {
  throw new Error("Preview evaluation requires the complete 254-product release");
}
if (seoManifest.schemaVersion !== 1 || !Array.isArray(seoManifest.routes)) {
  throw new Error("Preview evaluation requires the authoritative SEO route manifest");
}
const authoritativeSitemapUrls = seoManifest.routes
  .filter((route) => route.indexable && route.sitemap)
  .map((route) => route.canonicalUrl);
if (
  authoritativeSitemapUrls.length !== seoManifest.sitemapCount
  || new Set(authoritativeSitemapUrls).size !== authoritativeSitemapUrls.length
) {
  throw new Error("Authoritative preview sitemap inventory is internally inconsistent");
}
if (report.inventory.dynamicTaxonomy !== 105 || report.inventory.sitemapUrlCount !== seoManifest.sitemapCount) {
  throw new Error(`Preview route inventory is incomplete: sitemap ${report.inventory.sitemapUrlCount}/${seoManifest.sitemapCount}, taxonomy ${report.inventory.dynamicTaxonomy}/105`);
}
if (report.inventory.approvedRedirectRegistryRows < 1258 || report.inventory.redirectsVerified < 1258) {
  throw new Error("Preview redirect inventory is incomplete");
}
if (report.summary.missingFailed) {
  throw new Error("Preview missing-route verification failed");
}

const canonicalByPath = new Map(report.canonicalResults.map((item) => [item.path, item]));
const gatewayNormalizationCodes = new Set([
  "sitemap_origin_mismatch",
  "canonical_redirect",
  "wrong_canonical",
]);
const publishedLocaleGateways = ["/de", "/fr", "/nl"] as const;
const verifiedGatewayPaths = new Set<string>();
for (const path of publishedLocaleGateways) {
  const gateway = canonicalByPath.get(path);
  const gatewayCanonicalUrl = `${report.inventory.canonicalOrigin}${path}/`;
  const gatewayPreviewUrl = `${report.inventory.origin}${path}/`;
  const verifiedGatewaySlashCanonical = gateway?.canonical === gatewayCanonicalUrl
    && gateway.finalUrl === gatewayPreviewUrl
    && gateway.redirectHops.length === 1
    && gateway.redirectHops[0]?.status === 301
    && gateway.redirectHops[0]?.from === `${report.inventory.origin}${path}`
    && gateway.redirectHops[0]?.to === gatewayPreviewUrl;
  if (verifiedGatewaySlashCanonical) verifiedGatewayPaths.add(path);
}

const privateFunctionalRedirectTargets = new Map<string, string>([
  ["/dashboard", "/admin"],
  ["/login", "/auth"],
  ["/signin", "/auth"],
  ["/sign-in", "/auth"],
  ["/log-in", "/auth"],
]);
const failingRedirects = report.redirectResults.filter((item) => item.result === "fail");
if (failingRedirects.length !== report.summary.redirectsFailed) {
  throw new Error("Preview redirect failure summary does not match redirect evidence");
}
const verifiedPrivateRedirectPaths = new Set<string>();
for (const redirect of failingRedirects) {
  const expectedPrivateTarget = privateFunctionalRedirectTargets.get(redirect.sourcePath);
  const exactPrivateRedirect = expectedPrivateTarget !== undefined
    && redirect.expectedDestination === expectedPrivateTarget
    && redirect.actualDestination === expectedPrivateTarget
    && redirect.status === 301
    && redirect.destinationStatus === 200
    && redirect.hops === 1
    && redirect.findings.length === 1
    && redirect.findings[0]?.code === "redirect_target_not_canonical"
    && redirect.findings[0]?.path === redirect.sourcePath;
  if (!exactPrivateRedirect) {
    throw new Error(`Unexpected preview redirect failure: ${redirect.sourcePath}`);
  }
  verifiedPrivateRedirectPaths.add(redirect.sourcePath);
}

const challengeEligiblePaths = new Set(["/login", "/dashboard"]);
const failingFunctional = report.functionalResults.filter((item) => item.result === "fail");
if (failingFunctional.length !== report.summary.functionalFailed) {
  throw new Error("Preview functional failure summary does not match functional evidence");
}
const verifiedChallengeFunctionalPaths = new Set<string>();
for (const functional of failingFunctional) {
  const expectedPrivateTarget = privateFunctionalRedirectTargets.get(functional.path);
  const expectedFinalUrl = expectedPrivateTarget
    ? `${report.inventory.canonicalOrigin}${expectedPrivateTarget}`
    : "";
  const expectedRequestedUrl = `${report.inventory.origin}${functional.path}`;
  const hop = functional.redirectHops[0];
  const exactCloudflareChallenge = challengeEligiblePaths.has(functional.path)
    && expectedPrivateTarget !== undefined
    && functional.kind === "functional_noindex"
    && functional.status === 403
    && functional.requestedUrl === expectedRequestedUrl
    && functional.finalUrl === expectedFinalUrl
    && functional.redirectHops.length === 1
    && hop?.status === 301
    && hop.from === expectedRequestedUrl
    && hop.to === expectedFinalUrl
    && functional.title === "Just a moment..."
    && functional.robotsMeta.toLowerCase().includes("noindex")
    && functional.sourceCommit === report.inventory.sourceCommit
    && functional.findings.length === 1
    && functional.findings[0]?.code === "functional_status"
    && functional.findings[0]?.path === functional.path;
  if (!exactCloudflareChallenge) {
    throw new Error(`Unexpected preview functional failure: ${functional.path}`);
  }
  verifiedChallengeFunctionalPaths.add(functional.path);
}

const previewIsolationNoindexVerified =
  report.canonicalResults.length === report.inventory.sitemapUrlCount
  && report.canonicalResults.every((page) =>
    page.xRobotsTag.toLowerCase().includes("noindex")
    && !page.robotsMeta.toLowerCase().includes("noindex"));
const ignored: Finding[] = [];
const blocking: Finding[] = [];

for (const finding of report.findings) {
  if (
    finding.code === "robots_sitemap_missing"
    && finding.path === "/robots.txt"
    && previewIsolationNoindexVerified
  ) {
    ignored.push(finding);
    continue;
  }

  if (finding.code === "sitemap_noindex") {
    const page = canonicalByPath.get(finding.path);
    const previewHeaderNoindex = page?.xRobotsTag.toLowerCase().includes("noindex") === true;
    const documentNoindex = page?.robotsMeta.toLowerCase().includes("noindex") === true;
    if (previewHeaderNoindex && !documentNoindex) {
      ignored.push(finding);
      continue;
    }
  }

  if (verifiedGatewayPaths.has(finding.path) && gatewayNormalizationCodes.has(finding.code)) {
    ignored.push(finding);
    continue;
  }

  if (
    finding.code === "redirect_target_not_canonical"
    && verifiedPrivateRedirectPaths.has(finding.path)
  ) {
    ignored.push(finding);
    continue;
  }

  if (
    finding.code === "functional_status"
    && verifiedChallengeFunctionalPaths.has(finding.path)
  ) {
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
  authoritativeSitemapCount: seoManifest.sitemapCount,
  previewIsolationNoindexVerified,
  verifiedPrivateRedirectPaths: [...verifiedPrivateRedirectPaths].sort(),
  verifiedChallengeFunctionalPaths: [...verifiedChallengeFunctionalPaths].sort(),
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
  `- Preview isolation noindex verified: ${previewIsolationNoindexVerified}`,
  `- Verified private redirect exceptions: ${verifiedPrivateRedirectPaths.size}`,
  `- Verified Cloudflare challenge exceptions: ${verifiedChallengeFunctionalPaths.size}`,
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
