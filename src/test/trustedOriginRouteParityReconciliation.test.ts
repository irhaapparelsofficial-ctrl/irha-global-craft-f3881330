import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(path), "utf8");

describe("trusted request-origin route parity reconciliation", () => {
  it("reconciles only the exact proven non-canonical-host observations", () => {
    const source = read("scripts/reconcile-trusted-origin-route-findings.ts");

    expect(source).toContain("report.inventory.origin === report.inventory.canonicalOrigin");
    expect(source).toContain("report.inventory.sourceCommit !== report.inventory.expectedSourceCommit");
    expect(source).toContain("report.inventory.sitemapUrlCount !== 436");
    expect(source).toContain("report.inventory.dynamicProducts !== 254");
    expect(source).toContain("report.inventory.dynamicTaxonomy !== 105");
    expect(source).toContain('row.xRobotsTag.toLowerCase().includes("noindex")');
    expect(source).toContain('!row.robotsMeta.toLowerCase().includes("noindex")');
    expect(source).toContain('finding.code === "robots_sitemap_missing"');
    expect(source).toContain('finding.code === "sitemap_noindex"');
    expect(source).toContain('finding.code === "redirect_target_not_canonical"');
    expect(source).toContain('finding.code === "functional_status"');
    expect(source).toContain('functional.title === "Just a moment..."');
    expect(source).toContain("ignoredCounts.critical !== report.inventory.sitemapUrlCount");
    expect(source).toContain("ignoredCounts.high !== 8");
    expect(source).toContain("blockingCounts.critical || blockingCounts.high");
    expect(source).toContain("trusted-origin-reconciliation.json");
    expect(source).toContain("production-route-parity.json");
  });

  it("keeps the production workflow fail-closed and orders reconciliation before acceptance", () => {
    const workflow = read(".github/workflows/production-route-parity.yml");
    const related = workflow.indexOf("Reconcile related-product route evidence");
    const trusted = workflow.indexOf("Reconcile trusted request-origin evidence");
    const calculate = workflow.indexOf("Calculate authoritative production crawl result");

    expect(related).toBeGreaterThan(-1);
    expect(trusted).toBeGreaterThan(related);
    expect(calculate).toBeGreaterThan(trusted);
    expect(workflow).toContain("scripts/reconcile-trusted-origin-route-findings.ts");
    expect(workflow).toContain("production-route-parity-trusted-origin-exit-code");
    expect(workflow).toContain("Trusted request-origin evidence could not be reconciled safely");
    expect(workflow).toContain("Full live route crawl passed with zero critical/high findings");
    expect(workflow).toContain("CANONICAL_ORIGIN: https://irhaapparels.com");
    expect(workflow).toContain("CRAWL_ORIGIN: https://irha-apparels.pages.dev");
  });
});
