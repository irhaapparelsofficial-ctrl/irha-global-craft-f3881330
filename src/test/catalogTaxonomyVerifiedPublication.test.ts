import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const migrationPath = "supabase/migrations/20260717235200_catalog_taxonomy_verified_publication.sql";

describe("verified owner taxonomy publication", () => {
  it("publishes only the exact reviewed 69-node and 86-product snapshot", () => {
    expect(existsSync(resolve(root, migrationPath))).toBe(true);
    const migration = read(migrationPath);

    expect(migration).toContain("catalog_taxonomy_review_summary");
    expect(migration).toContain("catalog_publish_reviewed_taxonomy");
    expect(migration).toContain("catalog_get_public_taxonomy");
    expect(migration).toContain("<> 69");
    expect(migration).toContain("<> 86");
    expect(migration).toContain("summary->>'snapshot_hash'");
    expect(migration).toContain("summary->>'confirmation_phrase'");
    expect(migration).toContain("summary->>'can_publish'");
  });

  it("uses the verified owner admin identity and records release evidence", () => {
    const migration = read(migrationPath);
    expect(migration).toContain("irhaapparelsofficial@gmail.com");
    expect(migration).toContain("catalog_taxonomy_review_events");
    expect(migration).toContain("e.action = 'publish'");
    expect(migration).toContain("e.actor_id = owner_id");
  });

  it("does not bypass review, delete catalogue data or apply legacy redirects", () => {
    const migration = read(migrationPath);
    expect(migration).not.toMatch(/update\s+public\.product_taxonomy_assignments/i);
    expect(migration).not.toMatch(/delete\s+from\s+public\.(products|categories|media_assets|inquiries)/i);
    expect(migration).not.toContain("redirect_status = 'applied'");
  });

  it("exposes a separate audited publication and rollback panel", () => {
    const panel = read("src/components/admin/CatalogTaxonomyReleasePanel.tsx");
    const status = read("src/components/admin/CatalogReleaseStatus.tsx");
    expect(panel).toContain("Final audited release");
    expect(panel).toContain("catalog_publish_reviewed_taxonomy");
    expect(panel).toContain("catalog_unpublish_taxonomy");
    expect(panel).toContain("UNPUBLISH TAXONOMY");
    expect(status).toContain("<CatalogTaxonomyReleasePanel />");
  });
});
