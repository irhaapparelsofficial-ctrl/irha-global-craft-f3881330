import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  asCatalogRouteManifest,
  buildBuyerReadyTree,
  loadPublicCatalogTree,
  type CatalogRelease,
  type CatalogRouteManifest,
  type TaxonomyNode,
  type TaxonomyRelease,
} from "@/hooks/usePublicCatalog";

const ROOT_SLUGS = [
  "bavarian-trachten-wear",
  "premium-leather-apparel",
  "sportswear",
  "streetwear-activewear",
  "leisure-nightwear",
];

function completeFixture(): { catalogue: CatalogRelease; taxonomy: TaxonomyRelease } {
  const nodes: TaxonomyNode[] = [];
  const leaves: TaxonomyNode[] = [];
  ROOT_SLUGS.forEach((rootSlug, rootIndex) => {
    const rootId = `root-${rootIndex}`;
    nodes.push({
      id: rootId,
      parent_id: null,
      node_type: "main_category",
      slug: rootSlug,
      name: `Root ${rootIndex}`,
      depth: 0,
      full_slug_path: rootSlug,
      description: null,
      image_url: null,
      seo_title: null,
      seo_description: null,
      sort_order: rootIndex,
    });
    for (let audienceIndex = 0; audienceIndex < 4; audienceIndex += 1) {
      const audienceId = `audience-${rootIndex}-${audienceIndex}`;
      const audienceSlug = `audience-${audienceIndex}`;
      nodes.push({
        id: audienceId,
        parent_id: rootId,
        node_type: "audience",
        slug: audienceSlug,
        name: `Audience ${audienceIndex}`,
        depth: 1,
        full_slug_path: `${rootSlug}/${audienceSlug}`,
        description: null,
        image_url: null,
        seo_title: null,
        seo_description: null,
        sort_order: audienceIndex,
      });
      for (let leafIndex = 0; leafIndex < 4; leafIndex += 1) {
        const leafSlug = `type-${audienceIndex}-${leafIndex}`;
        const leaf: TaxonomyNode = {
          id: `leaf-${rootIndex}-${audienceIndex}-${leafIndex}`,
          parent_id: audienceId,
          node_type: "product_type",
          slug: leafSlug,
          name: `Type ${audienceIndex}-${leafIndex}`,
          depth: 2,
          full_slug_path: `${rootSlug}/${audienceSlug}/${leafSlug}`,
          description: null,
          image_url: null,
          seo_title: null,
          seo_description: null,
          sort_order: leafIndex,
        };
        nodes.push(leaf);
        leaves.push(leaf);
      }
    }
  });

  const products = Array.from({ length: 254 }, (_, index) => {
    const id = `product-${index}`;
    const slug = `product-${index}`;
    return {
      id,
      category_id: "legacy",
      slug,
      name: `Product ${index}`,
      description: `Product ${index} description`,
      image_url: `/images/product-${index}.webp`,
      gallery: [`/images/product-${index}.webp`],
      specs: [],
      details: [],
      material_specifications: null,
      seo_title: `Product ${index} Manufacturer`,
      seo_description: `Product ${index} description`,
      sort_order: index,
      is_published: true,
      short_description: `Product ${index} description`,
    };
  });

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const assignments = products.map((product, index) => {
    const leaf = leaves[index % leaves.length];
    const audience = nodeById.get(leaf.parent_id!)!;
    const root = nodeById.get(audience.parent_id!)!;
    return {
      product_id: product.id,
      product_slug: product.slug,
      taxonomy_node_id: leaf.id,
      full_slug_path: leaf.full_slug_path,
      canonical_path: `/products/${root.slug}/${audience.slug}/${leaf.slug}/${product.slug}`,
      approved_at: "2026-07-24T00:00:00.000Z",
    };
  });

  return {
    catalogue: { products, releasedAt: "2026-07-24T00:00:00.000Z" },
    taxonomy: { nodes, assignments },
  };
}

function manifestFromFixture(catalogue: CatalogRelease, taxonomy: TaxonomyRelease): CatalogRouteManifest {
  const nodeById = new Map(taxonomy.nodes.map((node) => [node.id, node]));
  return {
    schemaVersion: 1,
    generatedAt: "2026-07-24T00:00:00.000Z",
    productCount: 254,
    contentPolicy: "shared-buyer-ready-source-with-safe-fallbacks",
    products: taxonomy.assignments.map((assignment, index) => {
      const product = catalogue.products.find((candidate) => candidate.id === assignment.product_id)!;
      const leaf = nodeById.get(assignment.taxonomy_node_id)!;
      const audience = nodeById.get(leaf.parent_id!)!;
      const root = nodeById.get(audience.parent_id!)!;
      return {
        product_id: product.id,
        reference_code: `P${String(index + 1).padStart(3, "0")}`,
        product_slug: product.slug,
        product_name: product.name,
        canonical_path: assignment.canonical_path,
        main_category_slug: root.slug,
        main_category_name: root.name,
        audience_slug: audience.slug,
        audience_name: audience.name,
        product_type_slug: leaf.slug,
        product_type_name: leaf.name,
        seo_title: product.seo_title,
        seo_description: product.seo_description,
        seo_h1: product.name,
        short_description: product.short_description ?? null,
        product_description: product.description,
        image_url: product.image_url!,
        gallery: product.gallery,
        updated_at: "2026-07-24T00:00:00.000Z",
      };
    }),
  };
}

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("public catalogue release integrity", () => {
  it("rejects a missing approved product instead of silently skipping it", () => {
    const fixture = completeFixture();
    fixture.catalogue.products.pop();
    fixture.catalogue.products.push({
      ...fixture.catalogue.products[0],
      id: "unassigned-extra-product",
      slug: "unassigned-extra-product",
      name: "Unassigned Extra Product",
    });
    expect(() => buildBuyerReadyTree(fixture.catalogue, fixture.taxonomy)).toThrow(
      "Approved product product-253 is missing from the published release",
    );
  });

  it("rejects a published product with no taxonomy assignment", () => {
    const fixture = completeFixture();
    fixture.taxonomy.assignments.pop();
    expect(() => buildBuyerReadyTree(fixture.catalogue, fixture.taxonomy)).toThrow(
      "Expected 254 approved assignments, received 253",
    );
  });

  it("rejects an incomplete five-root release", () => {
    const fixture = completeFixture();
    fixture.taxonomy.nodes.find((node) => node.id === "root-4")!.node_type = "collection";
    expect(() => buildBuyerReadyTree(fixture.catalogue, fixture.taxonomy)).toThrow(
      "Expected 5 main categories, received 4",
    );
  });

  it("uses the verified complete snapshot during a transient RPC failure", async () => {
    const fixture = completeFixture();
    const manifest = manifestFromFixture(fixture.catalogue, fixture.taxonomy);
    const report = vi.fn();
    const tree = await loadPublicCatalogTree({
      rpc: vi.fn(async () => ({ data: null, error: { message: "temporary outage" } })),
      fetchImpl: vi.fn(async () => jsonResponse(manifest)) as typeof fetch,
      report,
    });
    expect(tree).toHaveLength(5);
    expect(tree.flatMap((root) => root.subs.flatMap((sub) => sub.products))).toHaveLength(254);
    expect(report).toHaveBeenCalledTimes(1);
  });

  it("falls back when live RPC data is structurally incomplete", async () => {
    const fixture = completeFixture();
    const manifest = manifestFromFixture(fixture.catalogue, fixture.taxonomy);
    const incomplete = structuredClone(fixture);
    incomplete.catalogue.products.pop();
    const rpc = vi.fn(async (name: string) =>
      name === "catalog_get_public_release"
        ? { data: incomplete.catalogue, error: null }
        : { data: incomplete.taxonomy, error: null },
    );
    const tree = await loadPublicCatalogTree({
      rpc,
      fetchImpl: vi.fn(async () => jsonResponse(manifest)) as typeof fetch,
      report: vi.fn(),
    });
    expect(tree.flatMap((root) => root.subs.flatMap((sub) => sub.products))).toHaveLength(254);
  });

  it("never publishes a partial live release when the verified snapshot is invalid", async () => {
    const fixture = completeFixture();
    fixture.catalogue.products.pop();
    const complete = completeFixture();
    const invalidManifest = manifestFromFixture(complete.catalogue, complete.taxonomy);
    invalidManifest.products.pop();
    const rpc = vi.fn(async (name: string) =>
      name === "catalog_get_public_release"
        ? { data: fixture.catalogue, error: null }
        : { data: fixture.taxonomy, error: null },
    );
    await expect(
      loadPublicCatalogTree({
        rpc,
        fetchImpl: vi.fn(async () => jsonResponse(invalidManifest)) as typeof fetch,
        report: vi.fn(),
      }),
    ).rejects.toThrow("verified snapshot unavailable");
  });

  it("requires the verified snapshot to encode all 105 non-empty taxonomy routes", () => {
    const fixture = completeFixture();
    const manifest = manifestFromFixture(fixture.catalogue, fixture.taxonomy);
    expect(asCatalogRouteManifest(manifest).products).toHaveLength(254);
    manifest.products[0].product_type_slug = "orphan-type";
    manifest.products[0].canonical_path = `/products/${manifest.products[0].main_category_slug}/${manifest.products[0].audience_slug}/orphan-type/${manifest.products[0].product_slug}`;
    expect(() => asCatalogRouteManifest(manifest)).toThrow("Snapshot contains 106 taxonomy routes");
  });
});

describe("legacy catalogue redirect contract", () => {
  it("uses explicit semantic aliases and never requires a blanket catalogue wildcard", () => {
    const redirects = readFileSync(resolve("public/_redirects"), "utf8");
    const expected = new Map([
      ["/catalogue/bavarian-garments", "/products/bavarian-trachten-wear"],
      ["/catalogue/lederhosen", "/products/bavarian-trachten-wear/men/lederhosen"],
      ["/catalogue/dirndl-dresses", "/products/bavarian-trachten-wear/women/dirndl-dresses"],
      ["/catalogue/trachten-accessories", "/products/bavarian-trachten-wear/accessories"],
      ["/catalogue/kids-trachten", "/products/bavarian-trachten-wear/kids"],
      ["/catalogue/leather-garments", "/products/premium-leather-apparel"],
      ["/catalogue/sportswear", "/products/sportswear"],
      ["/catalogue/activewear", "/products/sportswear/fitness-activewear/performance-activewear"],
      ["/catalogue/streetwear", "/products/streetwear-activewear"],
      ["/catalogue/leisurewear", "/products/leisure-nightwear"],
      ["/catalogue/nightwear", "/products/leisure-nightwear"],
    ]);

    expect(redirects).toContain("/catalog /products 301");
    expect(redirects).toContain("/catalogue /products 301");
    expect(redirects).not.toMatch(/^\/catalogue\/\*\s+/m);
    for (const [source, target] of expected) {
      expect(redirects).toContain(`${source} ${target} 301`);
      expect(target).not.toBe("/");
      expect(target).not.toBe(source);
    }

    const permanent = redirects
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => line.split(/\s+/))
      .filter((parts) => parts[2] === "301");
    const direct = new Map(permanent.map(([source, target]) => [source, target]));
    for (const [source, target] of direct) {
      expect(direct.get(target)).not.toBe(source);
    }
  });
});
