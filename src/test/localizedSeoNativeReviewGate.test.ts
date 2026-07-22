import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migrationPath = resolve(
  "supabase/migrations/20260722134500_localized_seo_native_review_index_gate.sql",
);
const sitemapScriptPath = resolve("scripts/augment-sitemap-with-live-catalog.ts");
const registryPath = resolve("supabase/repository-migrations.json");

describe("localized SEO native-review index gate", () => {
  it("preserves localized drafts while removing unsafe indexability", () => {
    const migration = readFileSync(migrationPath, "utf8");

    expect(migration).toContain("UPDATE public.seo_localized_pages");
    expect(migration).toContain("noindex = true");
    expect(migration).toContain(
      "native_review_status NOT IN ('approved', 'not_required')",
    );
    expect(migration).toContain(
      "seo_localized_pages_indexability_review_check",
    );
  });

  it("requires native-review approval in public reads and sitemap output", () => {
    const migration = readFileSync(migrationPath, "utf8");

    expect(migration).toContain('CREATE POLICY "Public reads published localized pages"');
    expect(migration).toContain(
      "native_review_status IN ('approved', 'not_required')",
    );
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION public.get_public_sitemap_entries()",
    );
  });

  it("gates the immutable build even before the database migration sync", () => {
    const sitemapScript = readFileSync(sitemapScriptPath, "utf8");

    expect(sitemapScript).not.toContain("expected 1778 published product pages");
    expect(sitemapScript).toContain("Localized page count is intentionally dynamic");
    expect(sitemapScript).toContain("/rest/v1/seo_localized_pages");
    expect(sitemapScript).toContain('"native_review_status"');
    expect(sitemapScript).toContain('"in.(approved,not_required)"');
    expect(sitemapScript).toContain('if (path.startsWith("/intl/")) continue;');
    expect(sitemapScript).toContain("Localized sitemap paths are not unique");
  });

  it("registers the migration with its immutable Git blob", () => {
    const registry = JSON.parse(readFileSync(registryPath, "utf8")) as {
      migrations: Array<{
        version: string;
        name: string;
        path: string;
        git_blob_sha: string;
        execution_mode?: string;
        transactional_dry_run?: boolean;
      }>;
    };
    const entry = registry.migrations.find(
      (migration) => migration.version === "20260722134500",
    );

    expect(entry).toEqual({
      version: "20260722134500",
      name: "localized_seo_native_review_index_gate",
      path: "supabase/migrations/20260722134500_localized_seo_native_review_index_gate.sql",
      git_blob_sha: "cccb8d2a99282975013267e4408a22ab4ba2b535",
      execution_mode: "transactional",
      transactional_dry_run: true,
    });
  });
});
