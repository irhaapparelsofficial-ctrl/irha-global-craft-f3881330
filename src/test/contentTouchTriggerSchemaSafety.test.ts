import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260717232200_fix_content_touch_updated_at_polymorphic_trigger.sql"),
  "utf8",
);

describe("shared content trigger schema safety", () => {
  it("keeps the shared trigger limited to columns common to all attached tables", () => {
    const genericFunction = migration.split(
      "create or replace function public.blog_posts_set_published_at()",
    )[0];

    expect(genericFunction).toContain("new.updated_at := now();");
    expect(genericFunction).not.toContain("new.published_at");
    expect(genericFunction).not.toContain("new.is_published");
  });

  it("moves blog publication timestamps into a blog-only trigger", () => {
    expect(migration).toContain(
      "create or replace function public.blog_posts_set_published_at()",
    );
    expect(migration).toContain("on public.blog_posts");
    expect(migration).toContain("new.published_at := now();");
    expect(migration).toContain("new.published_at := null;");
  });
});
