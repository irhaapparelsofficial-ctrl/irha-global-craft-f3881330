import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("public catalogue route consolidation", () => {
  it("routes the catalogue surface into the canonical product hierarchy", () => {
    const app = readSource("src/App.tsx");
    const legacyRedirect = readSource("src/pages/LegacyCatalogueRedirect.tsx");

    expect(app).toContain('<Route path="/catalogue" element={<Navigate to="/products" replace />} />');
    expect(app).toContain('<Route path="/catalogue/:slug" element={<LegacyCatalogueRedirect />} />');
    expect(app).not.toContain('import("./pages/Catalogue")');
    expect(app).not.toContain('import("./pages/CatalogueCategory")');
    expect(legacyRedirect).toContain('/products/bavarian-trachten-wear/men/lederhosen');
    expect(legacyRedirect).toContain('/products/bavarian-trachten-wear/women/dirndl-dresses');
  });

  it("shows a noindex not-found page instead of redirecting missing products", () => {
    const app = readSource("src/App.tsx");
    const productRoute = readSource("src/pages/CanonicalProductRoute.tsx");

    expect(app).toContain("<CanonicalProductRoute />");
    expect(productRoute).toContain("if (error || !data) return <NotFound />;");
    expect(productRoute).not.toContain("<Navigate");
  });

  it("uses the approved homepage media roles for all five public programs", () => {
    const categoryUniverse = readSource("src/components/sections/HomeCategoryUniverse.tsx");
    const registry = readSource("src/lib/categoryMediaRegistry.ts");
    const resolver = readSource("src/hooks/useCanonicalCategoryMedia.ts");

    for (const role of [
      "category_bavarian_trachten",
      "category_leather",
      "category_sportswear",
      "category_streetwear_activewear",
      "category_leisure_nightwear",
    ]) {
      expect(registry).toContain(role);
    }
    expect(categoryUniverse).toContain("useCanonicalCategoryMedia");
    expect(categoryUniverse).toContain("MAIN_CATEGORY_SLUGS.map");
    expect(categoryUniverse).toContain("data-category-media-id");
    expect(resolver).toContain("useHomepageMedia");
    expect(resolver).toContain("resolveCanonicalCategoryMediaMap");
  });
});
