import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

const migration = read("supabase/migrations/20260717220000_catalog_taxonomy_foundation.sql");
const manifest = JSON.parse(read("supabase/repository-migrations.json"));
const hook = read("src/hooks/usePublicTaxonomy.ts");
const runtime = read("src/lib/runtimeCategoryTaxonomy.ts");
const mapper = read("src/lib/databaseCategoryTaxonomy.ts");
const bridge = read("src/components/TaxonomyReleaseBridge.tsx");
const vite = read("vite.config.ts");
const tsconfig = read("tsconfig.app.json");

describe("database-owned catalogue taxonomy", () => {
  it("creates the complete audience, collection and assignment schema", () => {
    expect(migration).toContain("create table if not exists public.catalog_audiences");
    expect(migration).toContain("create table if not exists public.catalog_collections");
    expect(migration).toContain("create table if not exists public.catalog_product_collections");
    expect(migration).toContain("catalog_product_collections_one_primary_per_product");
    expect(migration).toContain("Product and collection must belong to the same top-level category");
  });

  it("keeps direct table writes admin-only and publishes a filtered RPC", () => {
    expect(migration).toContain("alter table public.catalog_audiences enable row level security");
    expect(migration).toContain("catalog_audiences_admin_all");
    expect(migration).toContain("catalog_collections_admin_all");
    expect(migration).toContain("catalog_product_collections_admin_all");
    expect(migration).toContain("create or replace function public.catalog_get_public_taxonomy()");
    expect(migration).toContain("having count(p.id) > 0");
    expect(migration).toContain("grant execute on function public.catalog_get_public_taxonomy() to anon, authenticated");
  });

  it("seeds all five top-level programmes with relevant buyer groups", () => {
    for (const topSlug of [
      "bavarian-trachten-wear",
      "premium-leather-apparel",
      "sportswear",
      "streetwear-activewear",
      "leisure-nightwear",
    ]) expect(migration).toContain(`'${topSlug}'`);

    for (const audience of ["'men'", "'women'", "'kids'", "'unisex'", "'team-club'", "'accessories'"]) {
      expect(migration).toContain(audience);
    }
  });

  it("seeds SEO-oriented product collections instead of generic audience buckets", () => {
    for (const collection of [
      "'lederhosen'",
      "'dirndl-dresses'",
      "'trachten-shirts'",
      "'biker-jackets'",
      "'football-kits'",
      "'hoodies-sweatshirts'",
      "'mens-sleepwear'",
      "'nightgowns'",
    ]) expect(migration).toContain(collection);
    expect(migration).toContain("Classify every currently published product into one primary collection");
  });

  it("registers the migration with its exact Git blob checksum", () => {
    const entry = manifest.migrations.find((item: { version: string }) => item.version === "20260717220000");
    expect(entry).toEqual({
      version: "20260717220000",
      name: "catalog_taxonomy_foundation",
      path: "supabase/migrations/20260717220000_catalog_taxonomy_foundation.sql",
      git_blob_sha: "a05d42e83bdbe8122760296e1f8a3357dc59730d",
      transactional_dry_run: true,
    });
  });

  it("normalizes the public RPC defensively", () => {
    expect(hook).toContain('db.rpc("catalog_get_public_taxonomy")');
    expect(hook).toContain("AUDIENCE_SLUGS");
    expect(hook).toContain("productSlugs.length === 0");
    expect(hook).toContain("cleanProductSlugs");
  });

  it("uses database assignments at runtime and preserves rule fallback", () => {
    expect(runtime).toContain("getDatabaseTaxonomyRelease");
    expect(runtime).toContain("buildDatabaseCategoryTaxonomy");
    expect(runtime).toContain("database ?? buildRuleCategoryTaxonomy(category)");
    expect(mapper).toContain("unassignedCount");
    expect(bridge).toContain("setDatabaseTaxonomyReleases(data)");
    expect(bridge).toContain('"rule-fallback"');
  });

  it("aliases only browser/runtime taxonomy imports, leaving build-time sitemap rules stable", () => {
    expect(vite).toContain('find: "@/lib/globalCategoryTaxonomy"');
    expect(vite).toContain("runtimeCategoryTaxonomy.ts");
    expect(tsconfig).toContain('"@/lib/globalCategoryTaxonomy": ["./src/lib/runtimeCategoryTaxonomy.ts"]');
  });
});
