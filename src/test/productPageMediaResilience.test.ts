import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Product-page media resilience and mobile presentation", () => {
  it("renders the canonical product hero through a controlled image fallback", () => {
    const detail = read("src/pages/CanonicalProductDetail.tsx");
    const thumbnail = read("src/components/ThumbnailImage.tsx");

    expect(detail).toContain("<ThumbnailImage");
    expect(detail).toContain("fallbackSrc={fallbackImage}");
    expect(detail).toContain("object-contain");
    expect(detail).toContain("B2B only · made to order");
    expect(detail).toContain("pb-32 pt-36");
    expect(detail).not.toContain('<img\n                  src={gallery[activeImg]');
    expect(thumbnail).toContain("CONTROLLED_IMAGE_FALLBACK");
    expect(thumbnail).toContain("LEGACY_PLACEHOLDER");
  });

  it("keeps the mobile product finder readable and action-safe", () => {
    const finder = read("src/pages/AllProductsPage.tsx");
    const listing = read("src/components/catalog/CatalogListingCard.tsx");

    expect(finder).toContain("grid grid-cols-1 gap-4 min-[380px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4");
    expect(finder).toContain("md:sticky md:top-20");
    expect(finder).toContain("ProductCatalogCard");
    expect(finder).toContain("pb-32 pt-8");
    expect(finder).toContain("View product");
    expect(listing).toContain("object-contain");
    expect(listing).toContain("min-h-11");
  });

  it("keeps the floating contact dock compact on product detail pages", () => {
    const dock = read("src/components/sections/StickyMobileCTA.tsx");

    expect(dock).toContain("function isProductDetailPath");
    expect(dock).toContain("setCollapsed(productDetail)");
    expect(dock).toContain('data-product-detail={productDetail ? "true" : "false"}');
    expect(dock).toContain('productDetail ? "true" : "false"');
  });

  it("fails media synchronization unless every registered file validates", () => {
    const sync = read("scripts/sync_product_media.py");
    const workflow = read(".github/workflows/sync-product-media.yml");

    expect(sync).toContain("DEFAULT_FETCH_ATTEMPTS = 3");
    expect(sync).toContain("def verify_outputs");
    expect(sync).toContain("Product media completeness verification failed");
    expect(sync).toContain("verify_outputs(products)");
    expect(workflow).toContain("timeout-minutes: 45");
    expect(workflow).toContain("Fetch, optimize and verify every manifest image");
    expect(workflow).toContain("Reject unresolved manifest media");
  });

  it("ships the formerly broken black-gold long Lederhosen hero as a real optimized file", () => {
    const heroPath = resolve(
      process.cwd(),
      "public/product-media/black-gold-embroidered-long-lederhosen/01-multi-angle-hero.webp",
    );

    expect(statSync(heroPath).size).toBeGreaterThan(8_000);
  });
});
