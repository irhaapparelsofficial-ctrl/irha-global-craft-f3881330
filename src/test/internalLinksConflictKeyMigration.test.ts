import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = "supabase/migrations/20260717231000_internal_links_conflict_key.sql";
const migrationBuffer = readFileSync(resolve(process.cwd(), migrationPath));
const migration = migrationBuffer.toString("utf8");
const manifest = JSON.parse(
  readFileSync(resolve(process.cwd(), "supabase/repository-migrations.json"), "utf8"),
) as { migrations: Array<{ version: string; path: string; git_blob_sha: string; transactional_dry_run: boolean }> };

function gitBlobSha(value: Buffer) {
  return createHash("sha1")
    .update(Buffer.from(`blob ${value.length}\0`, "utf8"))
    .update(value)
    .digest("hex");
}

describe("internal links deterministic conflict key", () => {
  it("registers the exact migration before the draft SEO seed", () => {
    const entry = manifest.migrations.find((item) => item.version === "20260717231000");
    expect(entry).toEqual({
      version: "20260717231000",
      name: "internal_links_conflict_key",
      path: migrationPath,
      git_blob_sha: gitBlobSha(migrationBuffer),
      execution_mode: "transactional",
      transactional_dry_run: true,
    });
    expect(manifest.migrations.findIndex((item) => item.version === "20260717231000"))
      .toBeLessThan(manifest.migrations.findIndex((item) => item.version === "20260717232000"));
  });

  it("fails closed on duplicate historical rows and creates the exact upsert key", () => {
    expect(migration).toContain("group by from_route, to_route, anchor_text, locale");
    expect(migration).toContain("having count(*) > 1");
    expect(migration).toContain("create unique index if not exists internal_links_route_anchor_locale_uidx");
    expect(migration).toContain("on public.internal_links (from_route, to_route, anchor_text, locale)");
    expect(migration).not.toMatch(/delete\s+from\s+public\.internal_links/i);
  });
});
