import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const migrationPath = "supabase/migrations/20260717234000_optimize_taxonomy_rls_and_inquiry_index.sql";
const migration = read(migrationPath);
const manifest = JSON.parse(read("supabase/repository-migrations.json")) as {
  migrations: Array<{ version: string; path: string; git_blob_sha: string }>;
};

describe("taxonomy RLS and inquiry index advisor cleanup", () => {
  it("removes only superseded broad taxonomy policies", () => {
    for (const policy of [
      "catalog_taxonomy_nodes_admin_all",
      "catalog_taxonomy_nodes_public_select",
      "product_taxonomy_assignments_admin_all",
      "product_taxonomy_assignments_public_select",
      "catalog_taxonomy_migration_map_admin_all",
    ]) {
      expect(migration).toContain(`drop policy if exists ${policy}`);
    }

    for (const requiredPolicy of [
      "catalog_taxonomy_nodes_anon_select",
      "catalog_taxonomy_nodes_authenticated_select",
      "catalog_taxonomy_nodes_admin_insert",
      "catalog_taxonomy_nodes_admin_update",
      "catalog_taxonomy_nodes_admin_delete",
      "product_taxonomy_assignments_anon_select",
      "product_taxonomy_assignments_authenticated_select",
      "catalog_taxonomy_migration_map_admin_select",
    ]) {
      expect(migration).toContain(requiredPolicy);
      expect(migration).not.toContain(`drop policy if exists ${requiredPolicy}`);
    }
  });

  it("preserves one unique inquiry reference index", () => {
    expect(migration).toContain("drop index if exists public.inquiries_inquiry_ref_unique_idx");
    expect(migration).toContain("to_regclass('public.inquiries_inquiry_ref_key') is null");
    expect(migration).not.toContain("drop index if exists public.inquiries_inquiry_ref_key");
  });

  it("registers the exact migration blob in the repository manifest", () => {
    const entry = manifest.migrations.find((item) => item.version === "20260717234000");
    expect(entry).toEqual({
      version: "20260717234000",
      name: "optimize_taxonomy_rls_and_inquiry_index",
      path: migrationPath,
      git_blob_sha: "a35ca4071b2cd90a85b2a0ead54c03f4f99358b8",
      execution_mode: "transactional",
      transactional_dry_run: true,
    });
  });
});
