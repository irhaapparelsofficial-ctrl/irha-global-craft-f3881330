import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const migrationPath = "supabase/migrations/20260717235000_catalog_taxonomy_owner_review_workflow.sql";

describe("final catalogue taxonomy release gate", () => {
  it("ships only an owner-driven release workflow", () => {
    expect(existsSync(resolve(root, migrationPath))).toBe(true);
    expect(existsSync(resolve(root, "supabase/migrations/20260717233000_publish_explicit_catalog_taxonomy.sql"))).toBe(false);
    const migration = read(migrationPath);
    expect(migration).toContain("Applying this migration never approves assignments or publishes taxonomy nodes");
    expect(migration).toContain("catalog_publish_reviewed_taxonomy");
    expect(migration).toContain("catalog_unpublish_taxonomy");
  });

  it("requires complete one-by-one review and immutable exact-state confirmation", () => {
    const migration = read(migrationPath);
    expect(migration).toContain("m.review_node_count = m.node_count");
    expect(migration).toContain("m.approved_count = m.assignment_count");
    expect(migration).toContain("m.proposed_count = 0");
    expect(migration).toContain("m.rejected_count = 0");
    expect(migration).toContain("p_expected_assignments");
    expect(migration).toContain("p_expected_snapshot_hash");
    expect(migration).toContain("p_confirmation is distinct from expected_phrase");
    expect(migration).toContain("complete the one-by-one owner review before publication");
  });

  it("never bulk-approves product mappings and preserves approvals on rollback", () => {
    const migration = read(migrationPath);
    expect(migration).not.toMatch(/update\s+public\.product_taxonomy_assignments\s+set\s+review_state\s*=\s*'approved'/i);
    expect(migration).not.toMatch(/update\s+public\.product_taxonomy_assignments\s+set\s+review_state\s*=\s*'proposed'/i);
    expect(migration).toContain("assignments_bulk_approved', false");
    expect(migration).toContain("individual_assignment_approvals_preserved', true");
    expect(migration).not.toMatch(/delete\s+from\s+public\.(products|categories|media_assets|inquiries)/i);
    expect(migration).not.toContain("redirect_status = 'applied'");
  });

  it("exposes the final typed-confirmation and audited rollback UI separately", () => {
    const panel = read("src/components/admin/CatalogTaxonomyReleasePanel.tsx");
    const status = read("src/components/admin/CatalogReleaseStatus.tsx");
    expect(panel).toContain("Final audited release");
    expect(panel).toContain("Publish reviewed hierarchy");
    expect(panel).toContain("UNPUBLISH TAXONOMY");
    expect(panel).toContain("catalog_taxonomy_review_events");
    expect(panel).toContain("p_expected_snapshot_hash");
    expect(status).toContain("<TaxonomyOwnerReviewPanel />");
    expect(status).toContain("<CatalogTaxonomyReleasePanel />");
  });
});
