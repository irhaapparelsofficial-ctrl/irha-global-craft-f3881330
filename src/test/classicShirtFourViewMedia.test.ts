import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repositoryBase = "public/product-media/classic-bavarian-checkered-shirt/web";
const runtimeBase = "product-media/classic-bavarian-checkered-shirt/web";
const migrationPath = "supabase/migrations/20260717002000_link_classic_bavarian_shirt_four_view_media.sql";
const migration = readFileSync(resolve(process.cwd(), migrationPath), "utf8");
const views = ["front", "three-quarter", "side", "back"] as const;

describe("Classic Bavarian Checkered Shirt four-view media", () => {
  it("ships every optimized product view and links its canonical runtime URL", () => {
    for (const view of views) {
      const filename = `classic-bavarian-checkered-shirt-design-01-${view}-web-1600.webp`;
      const repositoryFile = `${repositoryBase}/${filename}`;
      const runtimeUrl = `https://irhaapparels.com/${runtimeBase}/${filename}`;
      expect(existsSync(resolve(process.cwd(), repositoryFile)), repositoryFile).toBe(true);
      expect(migration).toContain(runtimeUrl);
    }
  });

  it("changes only the intended product and records a private rollback audit", () => {
    expect(migration).toContain("where slug = 'bavarian-checkered-shirt'");
    expect(migration).toContain("private.catalog_media_change_audit");
    expect(migration).toContain("before_record");
    expect(migration).toContain("after_record");
    expect(migration).toContain("classic-bavarian-checkered-shirt-four-view-20260717");
    expect(migration).not.toContain("delete from public.products");
  });

  it("keeps the audit table private and the migration idempotent", () => {
    expect(migration).toContain("revoke all on table private.catalog_media_change_audit from public, anon, authenticated");
    expect(migration).toContain("grant select, insert on table private.catalog_media_change_audit to service_role");
    expect(migration).toContain("on conflict (change_key) do nothing");
  });
});
