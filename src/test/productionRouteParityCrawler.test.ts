import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const crawlerPath = resolve("scripts/crawl-production-route-parity.ts");
const workflowPath = resolve(".github/workflows/production-route-parity.yml");

describe("production route parity crawler", () => {
  it("uses the approved production sources and exact catalogue counts", () => {
    const crawler = readFileSync(crawlerPath, "utf8");

    expect(crawler).toContain("const EXPECTED_PRODUCTS = 254");
    expect(crawler).toContain("const EXPECTED_TAXONOMY = 105");
    expect(crawler).toContain('rpc<ReleasePayload>("catalog_get_public_release")');
    expect(crawler).toContain('rpc<TaxonomyPayload>("catalog_get_public_taxonomy")');
    expect(crawler).toContain('rpc<SitemapEntry[]>("get_public_sitemap_entries")');
    expect(crawler).toContain('rpc<RedirectRow[]>("get_public_legacy_redirects")');
    expect(crawler).toContain("buildIdentity.supabase_project_id !== OWNER_SUPABASE_PROJECT_ID");
  });

  it("keeps critical route, sitemap, redirect and schema assertions blocking", () => {
    const crawler = readFileSync(crawlerPath, "utf8");

    for (const required of [
      "homepage_fallback",
      "product_title_mismatch",
      "product_h1_mismatch",
      "wrong_canonical",
      "sitemap_noindex",
      "empty_taxonomy",
      "missing_product_schema",
      "missing_breadcrumb_schema",
      "redirect_chain",
      "redirect_dead_target",
      "product_redirect_home",
      "runtime_title_mismatch",
      "runtime_h1_mismatch",
      "runtime_canonical_mismatch",
      "unreviewed_localized_sitemap_url",
    ]) {
      expect(crawler).toContain(required);
    }

    expect(crawler).toContain("if (counts.critical > 0 || counts.high > 0) process.exitCode = 1");
    expect(crawler).not.toContain("process.exitCode = 0");
  });

  it("uses authenticated compare evidence without restoring checkout credentials", () => {
    const workflow = readFileSync(workflowPath, "utf8");

    expect(workflow).toContain('gh api "repos/$GITHUB_REPOSITORY/compare/${latest_main}...${SOURCE_SHA}"');
    expect(workflow).toContain(".merge_base_commit.sha // empty");
    expect(workflow).toContain("ahead|identical");
    expect(workflow).toContain("persist-credentials: false");
    expect(workflow).not.toContain("git fetch --no-tags origin main");
  });

  it("preserves machine-readable evidence even when the crawl fails", () => {
    const crawler = readFileSync(crawlerPath, "utf8");
    const workflow = readFileSync(workflowPath, "utf8");

    expect(crawler).toContain("production-route-parity.json");
    expect(crawler).toContain("canonical-pages.csv");
    expect(crawler).toContain("redirects.csv");
    expect(crawler).toContain("inventory.json");
    expect(crawler).toContain("summary.md");
    expect(workflow).toContain("Initialize evidence directory");
    expect(workflow).toContain("if: always()");
    expect(workflow).toContain("actions/upload-artifact@v4");
    expect(workflow).toContain("npm ci --legacy-peer-deps --no-audit --no-fund");
    expect(workflow).toContain("EXPECTED_PRODUCTION_SHA");
    expect(workflow).not.toContain("wrangler pages deploy");
    expect(workflow).not.toContain("supabase db push");
  });
});
