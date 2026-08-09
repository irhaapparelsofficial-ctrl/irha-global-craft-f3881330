import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const OUTPUT_DIR = resolve(process.env.CRAWL_OUTPUT_DIR || "artifacts/production-route-parity");
const REPORT_PATH = join(OUTPUT_DIR, "production-route-parity.json");
const SUMMARY_PATH = join(OUTPUT_DIR, "summary.md");
const EVIDENCE_PATH = join(OUTPUT_DIR, "trusted-origin-reconciliation.json");

type Severity = "critical" | "high" | "medium" | "low";
type Finding = { severity: Severity; code: string; path: string; message: string };
type RedirectHop = { status: number; from: string; to: string };
type RouteResult = {
  path: string;
  requestedUrl?: string;
  finalUrl: string;
  status: number;
  title: string;
  robotsMeta: string;
  xRobotsTag: string;
  sourceCommit: string;
  redirectHops: RedirectHop[];
  result: "pass" | "fail";
  findings: Finding[];
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
type Report = {
  inventory: {
    generatedAt: string;
    origin: string;
    canonicalOrigin: string;
    sourceCommit: string;
    expectedSourceCommit: string;
    sitemapUrlCount: number;
    dynamicProducts: number;
    dynamicTaxonomy: number;
    staticAndMarketPages: number;
    approvedRedirectRegistryRows: number;
    redirectsVerified: number;
    browserRepresentativePaths: string[];
  };
  summary: {
    canonicalPassed: number;
    canonicalFailed: number;
    redirectsPassed: number;
    redirectsFailed: number;
    functionalPassed: number;
    functionalFailed: number;
    missingPassed: number;
    missingFailed: number;
    browserPassed: number;
    browserFailed: number;
    findings: Record<Severity, number>;
  };
  canonicalResults: RouteResult[];
  redirectResults: RedirectResult[];
  functionalResults: RouteResult[];
  missingResults: RouteResult[];
  browserResults: Array<{ result: "pass" | "fail"; findings: Finding[] }>;
  findings: Finding[];
  [key: string]: unknown;
};

const PRIVATE_REDIRECT_TARGETS = new Map<string, string>([
  ["/dashboard", "/admin"],
  ["/login", "/auth"],
  ["/signin", "/auth"],
  ["/sign-in", "/auth"],
  ["/log-in", "/auth"],
]);
const CHALLENGE_ELIGIBLE_PATHS = new Set(["/login", "/dashboard"]);

function counts(findings: Finding[]): Record<Severity, number> {
  return {
    critical: findings.filter((item) => item.severity === "critical").length,
    high: findings.filter((item) => item.severity === "high").length,
    medium: findings.filter((item) => item.severity === "medium").length,
    low: findings.filter((item) => item.severity === "low").length,
  };
}

function findingKey(finding: Finding) {
  return `${finding.severity}\u0000${finding.code}\u0000${finding.path}\u0000${finding.message}`;
}

function hasOnlyFinding(row: { findings: Finding[] }, code: string, path: string) {
  return row.findings.length === 1 && row.findings[0]?.code === code && row.findings[0]?.path === path;
}

function summaryMarkdown(report: Report, ignored: Finding[]) {
  const findingCounts = report.summary.findings;
  const blocking = report.findings.filter((item) => item.severity === "critical" || item.severity === "high");
  return [
    "# Irha Apparels Route Parity",
    "",
    `- Generated: ${report.inventory.generatedAt}`,
    `- Crawled origin: \`${report.inventory.origin}\``,
    `- Canonical origin: \`${report.inventory.canonicalOrigin}\``,
    `- Source commit: \`${report.inventory.sourceCommit}\``,
    `- Sitemap URLs: ${report.inventory.sitemapUrlCount}`,
    `- Products: ${report.inventory.dynamicProducts}`,
    `- Taxonomy: ${report.inventory.dynamicTaxonomy}`,
    `- Static/market: ${report.inventory.staticAndMarketPages}`,
    `- Approved redirect rows: ${report.inventory.approvedRedirectRegistryRows}`,
    `- Redirects verified: ${report.inventory.redirectsVerified}`,
    `- Canonical pass/fail: ${report.summary.canonicalPassed}/${report.summary.canonicalFailed}`,
    `- Redirect pass/fail: ${report.summary.redirectsPassed}/${report.summary.redirectsFailed}`,
    `- Browser pass/fail: ${report.summary.browserPassed}/${report.summary.browserFailed}`,
    `- Trusted-origin observations reconciled: ${ignored.length}`,
    `- Findings: critical ${findingCounts.critical}, high ${findingCounts.high}, medium ${findingCounts.medium}, low ${findingCounts.low}`,
    "",
    "## Blocking findings",
    "",
    ...(blocking.length
      ? blocking.slice(0, 500).map((item) => `- **${item.severity.toUpperCase()} ${item.code}** \`${item.path}\` — ${item.message}`)
      : ["No blocking route-parity findings remain."]),
    "",
  ].join("\n");
}

async function main() {
  const report = JSON.parse(await readFile(REPORT_PATH, "utf8")) as Report;

  if (!report.inventory.origin || !report.inventory.canonicalOrigin || report.inventory.origin === report.inventory.canonicalOrigin) {
    throw new Error("Trusted-origin reconciliation requires a non-canonical request origin");
  }
  if (
    !report.inventory.sourceCommit
    || !report.inventory.expectedSourceCommit
    || report.inventory.sourceCommit !== report.inventory.expectedSourceCommit
  ) {
    throw new Error("Trusted-origin reconciliation requires exact source identity");
  }
  if (
    report.canonicalResults.length !== report.inventory.sitemapUrlCount
    || report.inventory.sitemapUrlCount !== 436
    || report.inventory.dynamicProducts !== 254
    || report.inventory.dynamicTaxonomy !== 105
  ) {
    throw new Error("Trusted-origin reconciliation requires the complete authoritative route inventory");
  }

  const canonicalByPath = new Map(report.canonicalResults.map((row) => [row.path, row]));
  const redirectByPath = new Map(report.redirectResults.map((row) => [row.sourcePath, row]));
  const functionalByPath = new Map(report.functionalResults.map((row) => [row.path, row]));

  const hostIsolationVerified = report.canonicalResults.every((row) =>
    row.xRobotsTag.toLowerCase().includes("noindex")
    && !row.robotsMeta.toLowerCase().includes("noindex"));
  if (!hostIsolationVerified) {
    throw new Error("Trusted request-origin noindex isolation is not uniform and cannot be reconciled safely");
  }

  const verifiedPrivateRedirectPaths = new Set<string>();
  for (const [sourcePath, targetPath] of PRIVATE_REDIRECT_TARGETS) {
    const redirect = redirectByPath.get(sourcePath);
    const exactPrivateRedirect = redirect
      && redirect.expectedDestination === targetPath
      && redirect.actualDestination === targetPath
      && redirect.status === 301
      && redirect.destinationStatus === 200
      && redirect.hops === 1
      && hasOnlyFinding(redirect, "redirect_target_not_canonical", sourcePath);
    if (!exactPrivateRedirect) {
      throw new Error(`Private redirect evidence is not exact for ${sourcePath}`);
    }
    verifiedPrivateRedirectPaths.add(sourcePath);
  }

  const verifiedChallengePaths = new Set<string>();
  for (const path of CHALLENGE_ELIGIBLE_PATHS) {
    const targetPath = PRIVATE_REDIRECT_TARGETS.get(path);
    const functional = functionalByPath.get(path);
    const expectedRequestedUrl = `${report.inventory.origin}${path}`;
    const expectedFinalUrl = `${report.inventory.canonicalOrigin}${targetPath}`;
    const hop = functional?.redirectHops[0];
    const exactChallenge = targetPath
      && functional
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
      && hasOnlyFinding(functional, "functional_status", path);
    if (!exactChallenge) {
      throw new Error(`Cloudflare private-route challenge evidence is not exact for ${path}`);
    }
    verifiedChallengePaths.add(path);
  }

  const ignored: Finding[] = [];
  const blocking: Finding[] = [];
  for (const finding of report.findings) {
    if (
      finding.code === "robots_sitemap_missing"
      && finding.path === "/robots.txt"
      && hostIsolationVerified
    ) {
      ignored.push(finding);
      continue;
    }

    if (finding.code === "sitemap_noindex") {
      const page = canonicalByPath.get(finding.path);
      if (
        page?.xRobotsTag.toLowerCase().includes("noindex")
        && !page.robotsMeta.toLowerCase().includes("noindex")
      ) {
        ignored.push(finding);
        continue;
      }
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
      && verifiedChallengePaths.has(finding.path)
    ) {
      ignored.push(finding);
      continue;
    }

    blocking.push(finding);
  }

  const ignoredCounts = counts(ignored);
  if (
    ignoredCounts.critical !== report.inventory.sitemapUrlCount
    || ignoredCounts.high !== 8
    || ignoredCounts.medium !== 0
    || ignoredCounts.low !== 0
  ) {
    throw new Error(`Trusted-origin finding shape changed unexpectedly: ${JSON.stringify(ignoredCounts)}`);
  }

  const blockingCounts = counts(blocking);
  if (blockingCounts.critical || blockingCounts.high) {
    throw new Error(`Real blocking route findings remain: critical ${blockingCounts.critical}, high ${blockingCounts.high}`);
  }

  const ignoredKeys = new Set(ignored.map(findingKey));
  const reconcileRows = <T extends { findings: Finding[]; result: "pass" | "fail" }>(rows: T[]) => {
    for (const row of rows) {
      row.findings = row.findings.filter((finding) => !ignoredKeys.has(findingKey(finding)));
      row.result = row.findings.some((finding) => finding.severity === "critical" || finding.severity === "high") ? "fail" : "pass";
    }
  };
  reconcileRows(report.canonicalResults);
  reconcileRows(report.redirectResults);
  reconcileRows(report.functionalResults);
  reconcileRows(report.missingResults);

  report.findings = blocking;
  report.summary.canonicalPassed = report.canonicalResults.filter((row) => row.result === "pass").length;
  report.summary.canonicalFailed = report.canonicalResults.filter((row) => row.result === "fail").length;
  report.summary.redirectsPassed = report.redirectResults.filter((row) => row.result === "pass").length;
  report.summary.redirectsFailed = report.redirectResults.filter((row) => row.result === "fail").length;
  report.summary.functionalPassed = report.functionalResults.filter((row) => row.result === "pass").length;
  report.summary.functionalFailed = report.functionalResults.filter((row) => row.result === "fail").length;
  report.summary.missingPassed = report.missingResults.filter((row) => row.result === "pass").length;
  report.summary.missingFailed = report.missingResults.filter((row) => row.result === "fail").length;
  report.summary.browserPassed = report.browserResults.filter((row) => row.result === "pass").length;
  report.summary.browserFailed = report.browserResults.filter((row) => row.result === "fail").length;
  report.summary.findings = counts(report.findings);

  const evidence = {
    schemaVersion: 1,
    reconciledAt: new Date().toISOString(),
    sourceCommit: report.inventory.sourceCommit,
    requestOrigin: report.inventory.origin,
    canonicalOrigin: report.inventory.canonicalOrigin,
    policy: "exact-noncanonical-host-observation-only",
    hostIsolationVerified,
    verifiedPrivateRedirectPaths: [...verifiedPrivateRedirectPaths].sort(),
    verifiedChallengePaths: [...verifiedChallengePaths].sort(),
    ignoredCounts,
    ignored,
    blockingCounts: report.summary.findings,
  };

  await Promise.all([
    writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8"),
    writeFile(SUMMARY_PATH, `${summaryMarkdown(report, ignored)}\n`, "utf8"),
    writeFile(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`, "utf8"),
  ]);

  console.log(`Trusted-origin route evidence reconciled: ignored critical ${ignoredCounts.critical}, high ${ignoredCounts.high}; blocking critical 0, high 0`);
}

main().catch(async (error) => {
  await writeFile(join(OUTPUT_DIR, "trusted-origin-reconciliation-error.txt"), `${error instanceof Error ? error.stack || error.message : String(error)}\n`, "utf8");
  console.error(error);
  process.exit(1);
});
