import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const foundationPath = "supabase/migrations/20260717230000_explicit_catalog_taxonomy_foundation.sql";
const guardPath = "supabase/migrations/20260717230500_harden_taxonomy_assignment_leaf_guard.sql";
const foundationBuffer = readFileSync(resolve(root, foundationPath));
const guardBuffer = readFileSync(resolve(root, guardPath));
const foundation = foundationBuffer.toString("utf8");
const guard = guardBuffer.toString("utf8");
const manifest = JSON.parse(
  readFileSync(resolve(root, "supabase/repository-migrations.json"), "utf8"),
) as {
  migrations: Array<{
    version: string;
    name: string;
    path: string;
    git_blob_sha: string;
    transactional_dry_run: boolean;
  }>;
};

function gitBlobSha(buffer: Buffer) {
  const prefix = Buffer.from(`blob ${buffer.length}\0`, "utf8");
  return createHash("sha1").update(prefix).update(buffer).digest("hex");
}

function tuplePairs(block: string) {
  return Array.from(block.matchAll(/\('([^']+)',\s*'([^']+)'\)/g)).map((match) => [match[1], match[2]] as const);
}

function extract(source: string, pattern: RegExp, label: string) {
  const match = source.match(pattern);
  if (!match?.[1]) throw new Error(`Unable to extract ${label}`);
  return match[1];
}

describe("explicit catalogue taxonomy foundation", () => {
  it("registers exact ordered migration blobs", () => {
    expect(manifest.migrations.find((entry) => entry.version === "20260717230000")).toEqual({
      version: "20260717230000",
      name: "explicit_catalog_taxonomy_foundation",
      path: foundationPath,
      git_blob_sha: gitBlobSha(foundationBuffer),
      transactional_dry_run: true,
    });
    expect(manifest.migrations.find((entry) => entry.version === "20260717230500")).toEqual({
      version: "20260717230500",
      name: "harden_taxonomy_assignment_leaf_guard",
      path: guardPath,
      git_blob_sha: gitBlobSha(guardBuffer),
      transactional_dry_run: true,
    });
  });

  it("creates the required explicit hierarchy, assignment and migration-map tables", () => {
    for (const table of [
      "catalog_taxonomy_nodes",
      "product_taxonomy_assignments",
      "catalog_taxonomy_migration_map",
    ]) {
      expect(foundation).toContain(`create table if not exists public.${table}`);
      expect(foundation).toContain(`alter table public.${table} enable row level security`);
    }

    for (const field of [
      "parent_id",
      "node_type",
      "slug",
      "name",
      "depth",
      "full_slug_path",
      "description",
      "media_asset_id",
      "image_url",
      "seo_title",
      "seo_description",
      "sort_order",
      "publish_state",
      "redirect_aliases",
      "created_at",
      "updated_at",
    ]) {
      expect(foundation).toContain(field);
    }

    expect(foundation).toContain("(parent_id, slug) nulls not distinct");
    expect(foundation).toContain("products may be assigned only to depth-2 product_type nodes");
    expect(foundation).toContain("circular taxonomy parent relationship is not allowed");
    expect(foundation).toContain("an empty published leaf requires an intentional SEO empty-state reason");
  });

  it("seeds five roots and thirteen commercially relevant groups without forcing empty audiences", () => {
    for (const rootSlug of [
      "bavarian-trachten-wear",
      "premium-leather-apparel",
      "sportswear",
      "streetwear-activewear",
      "leisure-nightwear",
    ]) {
      expect(foundation).toContain(`'${rootSlug}'`);
    }

    const groupsBlock = extract(
      foundation,
      /with groups\(parent_path, slug, node_type, name, sort_order\) as \(\s*values([\s\S]*?)\n\)\ninsert into public\.catalog_taxonomy_nodes/,
      "group seed",
    );
    const groupRows = Array.from(
      groupsBlock.matchAll(/\('([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*\d+\)/g),
    );
    expect(groupRows).toHaveLength(13);
    expect(groupsBlock).toContain("('sportswear', 'team-club', 'buyer_group', 'Team & Club'");
    expect(groupsBlock).not.toContain("('premium-leather-apparel', 'women'");
    expect(groupsBlock).not.toContain("('streetwear-activewear', 'kids'");
  });

  it("seeds 51 unique product-type leaves and maps all 86 products exactly once", () => {
    const productTypesBlock = extract(
      foundation,
      /with product_types\(parent_path, slug, name, sort_order\) as \(\s*values([\s\S]*?)\n\)\ninsert into public\.catalog_taxonomy_nodes/,
      "product-type seed",
    );
    const productTypeRows = Array.from(
      productTypesBlock.matchAll(/\('([^']+)',\s*'([^']+)',\s*'(?:[^']|'')+',\s*\d+\)/g),
    );
    const productTypePaths = new Set(
      productTypeRows.map((row) => `${row[1]}/${row[2]}`),
    );
    expect(productTypeRows).toHaveLength(51);
    expect(productTypePaths.size).toBe(51);

    const mappingBlock = extract(
      foundation,
      /with mapping\(product_slug, target_path\) as \(\s*values([\s\S]*?)\n\), resolved as/,
      "product mapping",
    );
    const mappings = tuplePairs(mappingBlock);
    expect(mappings).toHaveLength(86);
    expect(new Set(mappings.map(([slug]) => slug)).size).toBe(86);
    expect(mappings.every(([, targetPath]) => productTypePaths.has(targetPath))).toBe(true);
    expect(mappings).toContainEqual([
      "traditional-lederhosen",
      "bavarian-trachten-wear/men/short-lederhosen",
    ]);
    expect(mappings.some(([, path]) => path.includes("accessories/short-lederhosen"))).toBe(false);
  });

  it("keeps the foundation private from buyers until a separate owner-approved cutover", () => {
    expect(foundation).toContain("'draft'");
    expect(foundation).toContain("'proposed'");
    expect(foundation).toContain("foundation migration must not publish taxonomy nodes");
    expect(foundation).toContain("foundation migration must not approve product assignments");
    expect(foundation).not.toMatch(/update\s+public\.categories/i);
    expect(foundation).not.toMatch(/update\s+public\.products/i);
    expect(foundation).not.toMatch(/delete\s+from\s+public\.(categories|products)/i);
  });

  it("uses RLS and a security-invoker public projection instead of another privileged public RPC", () => {
    expect(foundation).toContain("create or replace function public.catalog_get_public_taxonomy()");
    expect(foundation).toContain("security invoker");
    expect(foundation).toContain("set search_path = public, pg_temp");
    expect(foundation).toContain("review_state = 'approved'");
    expect(foundation).toContain("n.publish_state = 'published'");
    expect(foundation).toContain("grant execute on function public.catalog_get_public_taxonomy() to anon, authenticated");
    expect(foundation).not.toMatch(/security definer[\s\S]{0,300}catalog_get_public_taxonomy/i);
  });

  it("fails closed when the reviewed product snapshot changes", () => {
    expect(foundation).toContain("if published_products <> 86 then");
    expect(foundation).toContain("every published product must have exactly one explicit depth-2 product-type assignment");
    expect(foundation).toContain("every published product must have one old-to-new migration-map row");
    expect(foundation).toContain("Short Lederhosen must remain under Men, never Accessories");
  });

  it("protects a published product-type leaf when approval is deleted, moved or downgraded", () => {
    expect(guard).toContain("old.review_state <> 'approved'");
    expect(guard).toContain("new.taxonomy_node_id is distinct from old.taxonomy_node_id");
    expect(guard).toContain("new.review_state is distinct from 'approved'");
    expect(guard).toContain("cannot empty a published product-type node without an intentional SEO decision");
    expect(guard).toContain("if tg_op = 'DELETE' then");
    expect(guard).toContain("return old;");
    expect(guard).toContain("return new;");
  });
});
