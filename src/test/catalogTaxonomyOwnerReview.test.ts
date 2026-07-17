import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

const migrationPath = "supabase/migrations/20260717235000_catalog_taxonomy_owner_review_workflow.sql";

describe("owner-reviewed catalogue taxonomy release", () => {
  it("does not ship the removed automatic publication migration", () => {
    expect(existsSync(resolve(process.cwd(), "supabase/migrations/20260717233000_publish_explicit_catalog_taxonomy.sql"))).toBe(false);
    expect(existsSync(resolve(process.cwd(), migrationPath))).toBe(true);
  });

  it("requires authenticated admin, exact confirmation, current count and mapping snapshot", () => {
    const migration = read(migrationPath);
    expect(migration).toContain("auth.uid()");
    expect(migration).toContain("public.has_role(actor, 'admin')");
    expect(migration).toContain("p_confirmation is distinct from expected_phrase");
    expect(migration).toContain("p_expected_assignments");
    expect(migration).toContain("p_expected_snapshot_hash");
    expect(migration).toContain("catalog_taxonomy_review_events");
    expect(migration).toContain("legacy_redirects_applied', false");
  });

  it("keeps the release reversible without deleting catalogue data", () => {
    const migration = read(migrationPath);
    expect(migration).toContain("catalog_unpublish_taxonomy");
    expect(migration).toContain("UNPUBLISH TAXONOMY");
    expect(migration).not.toMatch(/delete\s+from\s+public\.(products|categories|media_assets|inquiries)/i);
    expect(migration).not.toContain("redirect_status = 'applied'");
  });

  it("gives the owner a visible mapping review and typed-confirmation workspace", () => {
    const panel = read("src/components/admin/CatalogTaxonomyReviewPanel.tsx");
    const status = read("src/components/admin/CatalogReleaseStatus.tsx");
    expect(panel).toContain("Product assignment review");
    expect(panel).toContain("confirmation_phrase");
    expect(panel).toContain("snapshot_hash");
    expect(panel).toContain("Publish reviewed hierarchy");
    expect(panel).toContain("Return hierarchy to review");
    expect(status).toContain("<CatalogTaxonomyReviewPanel />");
  });
});
