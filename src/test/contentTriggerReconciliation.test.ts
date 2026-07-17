import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const migrationPath = "supabase/migrations/20260717232200_reconcile_content_publication_triggers.sql";
const migration = read(migrationPath);
const manifest = read("supabase/repository-migrations.json");

describe("content publication trigger reconciliation", () => {
  it("keeps the generic content trigger limited to updated_at", () => {
    const genericStart = migration.indexOf("create or replace function public.content_touch_updated_at()");
    const blogStart = migration.indexOf("create or replace function public.blog_posts_set_published_at()");
    const genericDefinition = migration.slice(genericStart, blogStart);

    expect(genericStart).toBeGreaterThan(-1);
    expect(blogStart).toBeGreaterThan(genericStart);
    expect(genericDefinition).toContain("new.updated_at := now()");
    expect(genericDefinition).not.toContain("new.published_at");
    expect(genericDefinition).not.toContain("new.is_published");
  });

  it("uses a blog-only trigger for publication timestamps", () => {
    expect(migration).toContain("create or replace function public.blog_posts_set_published_at()");
    expect(migration).toContain("before insert or update of is_published, published_at");
    expect(migration).toContain("on public.blog_posts");
    expect(migration).toContain("generic content updated_at trigger still references blog-only publication fields");
    expect(migration).toContain("blog_posts publication trigger function is attached to another table");
  });

  it("registers the exact migration blob in the repository ledger manifest", () => {
    expect(manifest).toContain('"version":"20260717232200"');
    expect(manifest).toContain('"name":"reconcile_content_publication_triggers"');
    expect(manifest).toContain(`"path":"${migrationPath}"`);
    expect(manifest).toContain('"git_blob_sha":"a1eed38a815bec68c95ca687cb0fe7efdafb8b6c"');
    expect(manifest).toContain('"transactional_dry_run":true');
  });
});
