import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildPublishedCategoryTaxonomy } from "@/hooks/usePublishedCatalogTaxonomy";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("explicit published catalogue taxonomy runtime", () => {
  it("maps approved database assignments into the public three-level hierarchy", () => {
    const category = {
      slug: "bavarian-trachten-wear",
      name: "Bavarian & Trachten Wear",
      short: "",
      description: "",
      image: "",
      originalImage: "",
      details: [],
      productCount: 2,
      subs: [
        { slug: "legacy-men", name: "Legacy Men", short: "", products: [{ id: "product-1", slug: "traditional-lederhosen", name: "Traditional Lederhosen", image: "", gallery: [] }] },
        { slug: "legacy-women", name: "Legacy Women", short: "", products: [{ id: "product-2", slug: "traditional-dirndl-dress", name: "Traditional Dirndl Dress", image: "", gallery: [] }] },
      ],
    };
    const release = {
      nodes: [
        { id: "root", parent_id: null, node_type: "main_category", slug: "bavarian-trachten-wear", name: "Bavarian & Trachten Wear", depth: 0, full_slug_path: "bavarian-trachten-wear", description: null, image_url: null, seo_title: null, seo_description: null, sort_order: 10, updated_at: "2026-07-17" },
        { id: "men", parent_id: "root", node_type: "audience", slug: "men", name: "Men", depth: 1, full_slug_path: "bavarian-trachten-wear/men", description: "Men programs", image_url: null, seo_title: null, seo_description: null, sort_order: 10, updated_at: "2026-07-17" },
        { id: "women", parent_id: "root", node_type: "audience", slug: "women", name: "Women", depth: 1, full_slug_path: "bavarian-trachten-wear/women", description: "Women programs", image_url: null, seo_title: null, seo_description: null, sort_order: 20, updated_at: "2026-07-17" },
        { id: "lederhosen", parent_id: "men", node_type: "product_type", slug: "short-lederhosen", name: "Short Lederhosen", depth: 2, full_slug_path: "bavarian-trachten-wear/men/short-lederhosen", description: "Lederhosen programs", image_url: null, seo_title: null, seo_description: null, sort_order: 10, updated_at: "2026-07-17" },
        { id: "dirndl", parent_id: "women", node_type: "product_type", slug: "dirndl-dresses", name: "Dirndl Dresses", depth: 2, full_slug_path: "bavarian-trachten-wear/women/dirndl-dresses", description: "Dirndl programs", image_url: null, seo_title: null, seo_description: null, sort_order: 10, updated_at: "2026-07-17" },
      ],
      assignments: [
        { product_id: "product-1", product_slug: "traditional-lederhosen", taxonomy_node_id: "lederhosen", full_slug_path: "bavarian-trachten-wear/men/short-lederhosen", canonical_path: "/products/bavarian-trachten-wear/men/short-lederhosen/traditional-lederhosen", approved_at: "2026-07-17" },
        { product_id: "product-2", product_slug: "traditional-dirndl-dress", taxonomy_node_id: "dirndl", full_slug_path: "bavarian-trachten-wear/women/dirndl-dresses", canonical_path: "/products/bavarian-trachten-wear/women/dirndl-dresses/traditional-dirndl-dress", approved_at: "2026-07-17" },
      ],
    };

    const taxonomy = buildPublishedCategoryTaxonomy(category as never, release as never);
    expect(taxonomy?.audiences.map((audience) => audience.slug)).toEqual(["men", "women"]);
    expect(taxonomy?.audiences[0].collections[0].products[0].slug).toBe("traditional-lederhosen");
    expect(taxonomy?.audiences[1].collections[0].products[0].slug).toBe("traditional-dirndl-dress");
    expect(taxonomy?.unassignedCount).toBe(0);
  });

  it("prefers the database projection while retaining a tested rollback fallback", () => {
    const hook = read("src/hooks/usePublishedCatalogTaxonomy.ts");
    const page = read("src/pages/CategoryTaxonomyPage.tsx");
    const navigator = read("src/components/CategoryAudienceNavigator.tsx");

    expect(hook).toContain('rpc("catalog_get_public_taxonomy")');
    expect(page).toContain("usePublishedCategoryTaxonomy");
    expect(page).toContain("publishedTaxonomy.taxonomy ?? buildCategoryTaxonomy(category)");
    expect(page).toContain("taxonomy={taxonomy}");
    expect(navigator).toContain("suppliedTaxonomy ?? buildCategoryTaxonomy(category)");
  });
});
