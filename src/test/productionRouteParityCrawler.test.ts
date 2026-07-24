import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(path), "utf8");
const crawlerPath = "scripts/crawl-production-route-parity.ts";
const productionWorkflowPath = ".github/workflows/production-route-parity.yml";
const previewWorkflowPath = ".github/workflows/cloudflare-pages-preview.yml";

describe("production route parity completion", () => {
  it("uses the approved public sources and exact catalogue counts", () => {
    const crawler = read(crawlerPath);
    expect(crawler).toContain("const EXPECTED_PRODUCTS = 254");
    expect(crawler).toContain("const EXPECTED_TAXONOMY = 105");
    expect(crawler).toContain('rpc<ReleasePayload>("catalog_get_public_release")');
    expect(crawler).toContain('rpc<TaxonomyPayload>("catalog_get_public_taxonomy")');
    expect(crawler).toContain('rpc<SitemapEntry[]>("get_public_sitemap_entries")');
    expect(crawler).toContain("allApprovedRedirects()");
    expect(crawler).toContain("Range: `${offset}-${offset + PAGE_SIZE - 1}`");
    expect(crawler).toContain("approvedRedirectRows.length < 1258");
  });

  it("separates preview request origin from the canonical production origin", () => {
    const crawler = read(crawlerPath);
    expect(crawler).toContain('process.env.CRAWL_ORIGIN || "https://irhaapparels.com"');
    expect(crawler).toContain('process.env.CANONICAL_ORIGIN || "https://irhaapparels.com"');
    expect(crawler).toContain("function requestUrl(path: string)");
    expect(crawler).toContain("function canonicalUrl(path: string)");
    expect(crawler).toContain("EXPECTED_SOURCE_SHA");
    expect(crawler).toContain("new URL(signals.canonical, CANONICAL_ORIGIN)");
  });

  it("keeps route, schema, redirect and runtime assertions blocking", () => {
    const crawler = read(crawlerPath);
    for (const required of [
      "homepage_fallback", "product_title_mismatch", "product_description_mismatch", "product_h1_mismatch",
      "product_image_alt_mismatch", "missing_related_product_link", "taxonomy_title_mismatch",
      "taxonomy_description_mismatch", "taxonomy_h1_mismatch", "missing_collection_schema",
      "missing_taxonomy_child_link", "wrong_canonical", "sitemap_noindex", "empty_taxonomy",
      "missing_product_schema", "redirect_chain", "redirect_dead_target", "product_redirect_home",
      "runtime_title_mismatch", "runtime_description_mismatch", "runtime_h1_mismatch",
      "runtime_canonical_mismatch", "unreviewed_localized_sitemap_url", "unsupported_commerce_schema",
    ]) expect(crawler).toContain(required);
    expect(crawler).toContain("if (counts.critical || counts.high) process.exitCode = 1");
    expect(crawler).not.toContain("process.exitCode = 0");
  });

  it("does not apply sitemap rules to functional and missing routes", () => {
    const crawler = read(crawlerPath);
    expect(crawler).toContain("async function functionalResult");
    expect(crawler).toContain("async function missingResult");
    expect(crawler).toContain("functional_indexable");
    expect(crawler).toContain("missing_route_not_404");
    expect(crawler).toContain("missing_route_home_redirect");
    expect(crawler).not.toContain('crawlCanonical(`${ORIGIN}${path}`, "functional_noindex"');
  });

  it("preserves product-specific shells and canonical related links", () => {
    const enrichment = read("scripts/enrich-generic-static-route-shells.mjs");
    const related = read("scripts/enhance-product-route-shells.ts");
    const verifier = read("scripts/verify-route-parity-build.ts");
    expect(enrichment).toContain("if (original.includes(PRODUCT_SHELL))");
    expect(enrichment).toContain("productShellsPreserved !== EXPECTED_PRODUCT_SHELLS");
    expect(related).toContain('data-irha-related-products="true"');
    expect(related).toContain("EXPECTED_PRODUCTS = 254");
    expect(verifier).toContain("product shell was overwritten by generic enrichment");
    expect(verifier).toContain('data-irha-related-products="true"');
  });

  it("uses one buyer-ready product metadata policy for build and browser runtime", () => {
    const manifest = read("scripts/generate-buyer-ready-catalog-manifest.ts");
    const runtime = read("src/hooks/usePublicCatalog.ts");
    const policy = read("src/lib/buyerReadyProductContent.ts");
    expect(manifest).toContain("resolveBuyerReadyProductContent");
    expect(runtime).toContain("resolveBuyerReadyProductContent");
    expect(manifest).toContain("product_name: content.name");
    expect(manifest).toContain("seo_description: content.description");
    expect(runtime).toContain("seo_description: content.description");
    expect(policy).toContain("hasBlockedBuyerReadyTerm");
    expect(policy).toContain("safeSource");
    expect(manifest).toContain('contentPolicy: "shared-buyer-ready-source-with-safe-fallbacks"');
  });

  it("resolves explicit depth-one taxonomy audiences before legacy product paths", () => {
    const resolver = read("src/pages/CategoryOrProductPage.tsx");
    expect(resolver).toContain("usePublishedCatalogTaxonomyRelease");
    expect(resolver).toContain("node.depth === 1");
    expect(resolver).toContain("node.parent_id === root.id");
    expect(resolver).toContain("<CategoryTaxonomyPage audienceOverride={explicitAudience.slug}");
  });

  it("aligns taxonomy shells to runtime SEO, schema, counts and canonical children", () => {
    const align = read("scripts/align-taxonomy-route-shells.ts");
    const verifier = read("scripts/verify-route-parity-build.ts");
    expect(align).toContain("localizedTaxonomySeo");
    expect(align).toContain('data-irha-taxonomy-parity="true"');
    expect(align).toContain('data-irha-taxonomy-children="true"');
    expect(align).toContain('"@type": "CollectionPage"');
    expect(align).toContain('"@type": "BreadcrumbList"');
    expect(align).toContain("paths.size !== EXPECTED_TAXONOMY");
    expect(verifier).toContain("names.productCount < 1 || names.children.size < 1");
  });

  it("paginates redirects and prohibits localized, duplicate or dead targets", () => {
    const generator = read("scripts/generate-buyer-ready-redirects.ts");
    const redirects = read("public/_redirects");
    const workerPatch = read("scripts/patch-worker-route-parity.mjs");
    const verifier = read("scripts/verify-route-parity-build.ts");
    expect(generator).toContain("fetchAllApprovedRedirects");
    expect(generator).toContain("canonicalByLegacyKey");
    expect(generator).toContain("localizedLegacyKey");
    expect(generator).toContain('to.startsWith("/intl/")');
    expect(generator).toContain("approvedRows.length < 1258");
    expect(generator).toContain("reference_code.toLowerCase()");
    expect(generator).toContain("if (localizedCanonical) return localizedCanonical");
    expect(generator).toContain("Static/generated redirect conflict");
    expect(redirects).not.toContain("/products/d22ac15e-d657-4a4c-804c-fb8697ceb050/plush-bathrobe-sleep-robe");
    expect(redirects).toContain("/products/streetwear-activewear/unisex/tops/oversized-pullover-hoodie 301");
    expect(redirects).not.toContain("/products/leisure-nightwear/plush-bathrobe-sleep-robe 301");
    expect(workerPatch).toContain("womens-plush-robe");
    expect(workerPatch).toContain("aliasPattern");
    expect(workerPatch).toContain("missing the verified plush robe legacy alias");
    expect(workerPatch).toContain("unexpected target");
    expect(workerPatch).toContain("dead plush robe target");
    expect(verifier).toContain("Duplicate final redirect source");
    expect(verifier).toContain("Final redirect target is not canonical");
  });

  it("aligns browser homepage with approved crawler-visible signals", () => {
    const home = read("src/pages/Home.tsx");
    const hero = read("src/components/HeroCarousel.tsx");
    const brand = read("scripts/strengthen-brand-search-signals.mjs");
    const title = "Irha Apparels | B2B Apparel Manufacturer in Sialkot, Pakistan";
    const h1 = "Irha Apparels — Custom Apparel Manufacturer for Global B2B Buyers";
    expect(home).toContain(title);
    expect(hero).toContain(h1);
    expect(brand).toContain(`const BRAND_H1 = "${h1}"`);
  });

  it("runs final parity transforms in verified build order", () => {
    const pkg = JSON.parse(read("package.json")) as { scripts: { build: string; "build:dev": string } };
    for (const command of [pkg.scripts.build, pkg.scripts["build:dev"]]) {
      const enrichment = command.indexOf("enrich-generic-static-route-shells.mjs");
      const related = command.indexOf("enhance-product-route-shells.ts");
      const taxonomy = command.indexOf("align-taxonomy-route-shells.ts");
      const ai = command.indexOf("install-cloudflare-ai-guide.mjs");
      const worker = command.indexOf("patch-worker-route-parity.mjs");
      const verify = command.indexOf("verify-route-parity-build.ts");
      expect(enrichment).toBeGreaterThan(-1);
      expect(related).toBeGreaterThan(enrichment);
      expect(taxonomy).toBeGreaterThan(related);
      expect(worker).toBeGreaterThan(ai);
      expect(verify).toBeGreaterThan(worker);
    }
  });

  it("preserves machine-readable evidence without production mutation", () => {
    const crawler = read(crawlerPath);
    const workflow = read(productionWorkflowPath);
    expect(crawler).toContain("production-route-parity.json");
    expect(crawler).toContain("canonical-pages.csv");
    expect(crawler).toContain("redirects.csv");
    expect(crawler).toContain("inventory.json");
    expect(crawler).toContain("summary.md");
    expect(workflow).toContain("actions/upload-artifact@v4");
    expect(workflow).toContain("npm ci --legacy-peer-deps --no-audit --no-fund");
    expect(workflow).not.toContain("wrangler pages deploy");
    expect(workflow).not.toContain("supabase db push");
  });

  it("requires an immutable preview deployment and context-safe blocking evaluation", () => {
    const workflow = read(previewWorkflowPath);
    const resolver = read("scripts/resolve-cloudflare-preview-deployment.mjs");
    const evaluator = read("scripts/evaluate-preview-route-parity.ts");
    expect(workflow).toContain("Resolve immutable preview deployment URL");
    expect(workflow).toContain("scripts/crawl-production-route-parity.ts");
    expect(workflow).toContain("scripts/evaluate-preview-route-parity.ts");
    expect(workflow).toContain("PREVIEW_ALIAS_URL");
    expect(workflow).toContain("Context-safe evaluation exit");
    expect(resolver).toContain("metadata.commit_hash === sourceSha");
    expect(resolver).toContain("metadata.branch === branch");
    expect(evaluator).toContain("Preview evaluator refuses to run against the production canonical origin");
    expect(evaluator).toContain("sitemap_noindex");
    expect(evaluator).toContain("missing_related_product_link");
    expect(evaluator).toContain("if (blockingCounts.critical || blockingCounts.high)");
    expect(workflow).toContain("CANONICAL_ORIGIN: https://irhaapparels.com");
    expect(workflow).toContain("actions/upload-artifact@v4");
  });
});
