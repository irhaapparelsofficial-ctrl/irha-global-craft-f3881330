import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repositoryBase = "public/product-media/classic-bavarian-checkered-shirt/web";
const runtimeBase = "product-media/classic-bavarian-checkered-shirt/web";
const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260716190500_link_classic_bavarian_shirt_media.sql"),
  "utf8",
);

const views = ["front", "three-quarter", "side", "back"] as const;

describe("Classic Bavarian Checkered Shirt media link", () => {
  it("ships all four optimized product views", () => {
    for (const view of views) {
      const filename = `classic-bavarian-checkered-shirt-design-01-${view}-web-1600.webp`;
      const repositoryFile = `${repositoryBase}/${filename}`;
      const runtimeUrl = `https://irhaapparels.com/${runtimeBase}/${filename}`;
      expect(existsSync(resolve(process.cwd(), repositoryFile)), repositoryFile).toBe(true);
      expect(migration).toContain(runtimeUrl);
    }
  });

  it("updates only the intended product with a private rollback audit", () => {
    expect(migration).toContain("where slug = 'bavarian-checkered-shirt'");
    expect(migration).toContain("private.catalog_media_change_audit");
    expect(migration).toContain("before_record");
    expect(migration).toContain("after_record");
    expect(migration).not.toContain("delete from public.products");
  });
});
