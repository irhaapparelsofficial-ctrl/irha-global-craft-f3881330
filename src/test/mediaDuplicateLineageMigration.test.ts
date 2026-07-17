import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const migrationPath = "supabase/migrations/20260717222000_media_duplicate_lineage_foundation.sql";

function gitBlobSha(content: string) {
  const body = Buffer.from(content, "utf8");
  return createHash("sha1")
    .update(Buffer.from(`blob ${body.length}\0`, "utf8"))
    .update(body)
    .digest("hex");
}

describe("stable media duplicate lineage migration", () => {
  it("uses stable asset identity instead of mutable storage object paths", () => {
    const migration = read(migrationPath);

    expect(migration).toContain("canonical_id constant uuid");
    expect(migration).toContain("duplicate_id constant uuid");
    expect(migration).toContain("expected_checksum constant text");
    expect(migration).toContain("canonical_row.bucket <> 'site-media'");
    expect(migration).toContain("canonical_row.status <> 'active'");
    expect(migration).toContain("canonical_row.verification_status <> 'verified'");
    expect(migration).toContain("canonical leather-wallet asset is no longer used");
    expect(migration).toContain("reviewed duplicate acquired a live reference");

    expect(migration).not.toContain("32be4604-a427-4149-85c4-3ca8de69bb42.png");
    expect(migration).not.toContain("56451814-1b32-4612-b763-70a9d2022178.png");
  });

  it("keeps the repository migration manifest checksum exact", () => {
    const migration = read(migrationPath);
    const manifest = JSON.parse(read("supabase/repository-migrations.json")) as {
      migrations: Array<{ version: string; git_blob_sha: string }>;
    };
    const entry = manifest.migrations.find((item) => item.version === "20260717222000");

    expect(entry).toBeDefined();
    expect(entry?.git_blob_sha).toBe(gitBlobSha(migration));
  });
});
