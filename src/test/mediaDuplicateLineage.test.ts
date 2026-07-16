import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = "supabase/migrations/20260717222000_media_duplicate_lineage_foundation.sql";
const buffer = readFileSync(resolve(process.cwd(), migrationPath));
const migration = buffer.toString("utf8");
const manifest = JSON.parse(
  readFileSync(resolve(process.cwd(), "supabase/repository-migrations.json"), "utf8"),
) as { migrations: Array<{ version: string; name: string; path: string; git_blob_sha: string; transactional_dry_run: boolean }> };

function gitBlobSha(value: Buffer) {
  return createHash("sha1")
    .update(Buffer.from(`blob ${value.length}\0`, "utf8"))
    .update(value)
    .digest("hex");
}

describe("media duplicate lineage foundation", () => {
  it("registers the exact migration blob before the public claim gate", () => {
    expect(manifest.migrations.find((entry) => entry.version === "20260717222000")).toEqual({
      version: "20260717222000",
      name: "media_duplicate_lineage_foundation",
      path: migrationPath,
      git_blob_sha: gitBlobSha(buffer),
      transactional_dry_run: true,
    });
  });

  it("adds canonical duplicate linkage and append-only replacement history", () => {
    for (const field of [
      "duplicate_of uuid references public.media_assets(id) on delete restrict",
      "duplicate_kind text",
      "duplicate_status text not null default 'unique'",
      "replacement_history jsonb not null default '[]'::jsonb",
    ]) {
      expect(migration).toContain(field);
    }
    expect(migration).toContain("media replacement history is append-only");
    expect(migration).toContain("duplicate chains are not allowed");
    expect(migration).toContain("exact duplicate assets must share the canonical SHA-256 checksum");
  });

  it("locks canonical and confirmed duplicate rows from destructive deletion", () => {
    expect(migration).toContain("media_assets_block_locked_duplicate_delete");
    expect(migration).toContain("old.duplicate_status in ('canonical', 'confirmed_duplicate')");
    expect(migration).toContain("use a separate owner-approved cleanup migration with replacement evidence");
    expect(migration).not.toMatch(/delete\s+from\s+public\.media_assets/i);
    expect(migration).not.toContain("storage.from(");
  });

  it("links only the reviewed unreferenced duplicate to the live canonical wallet asset", () => {
    expect(migration).toContain("b4c6f3d0-f50c-45c3-9446-3752e4b4800c");
    expect(migration).toContain("06bd5d3d-d7ec-4d8b-ac71-5d080e9c00ce");
    expect(migration).toContain("329b168f762b26aac6a426809fef57987aa58eedab66972437d809dd4dc1940b");
    expect(migration).toContain("reviewed duplicate acquired a live reference; lineage must be re-audited before linking");
    expect(migration).toContain("canonical leather-wallet asset is no longer used by the reviewed live product");
    expect(migration).toContain("duplicate_of = canonical_id");
    expect(migration).toContain("duplicate_kind = 'exact'");
    expect(migration).toContain("duplicate_status = 'confirmed_duplicate'");
    expect(migration).toContain("social_approved = false");
  });

  it("records non-destructive evidence on both canonical and duplicate rows", () => {
    expect(migration).toContain("'action', 'canonical_confirmed'");
    expect(migration).toContain("'action', 'exact_duplicate_linked'");
    expect(migration).toContain("'storage_deleted', false");
    expect(migration).toContain("'database_row_deleted', false");
    expect(migration).toContain("exact duplicate lineage verification failed");
  });
});
