import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260717222000_media_duplicate_lineage_foundation.sql"),
  "utf8",
);

const manifest = JSON.parse(
  readFileSync(resolve(process.cwd(), "supabase/repository-migrations.json"), "utf8"),
) as {
  migrations: Array<{ version: string; git_blob_sha: string }>;
};

describe("reviewed media duplicate lineage migration", () => {
  it("uses stable database identity instead of transient storage paths", () => {
    expect(migration).toContain("b4c6f3d0-f50c-45c3-9446-3752e4b4800c");
    expect(migration).toContain("06bd5d3d-d7ec-4d8b-ac71-5d080e9c00ce");
    expect(migration).toContain("329b168f762b26aac6a426809fef57987aa58eedab66972437d809dd4dc1940b");
    expect(migration).toContain("canonical_row.bucket <> 'site-media'");
    expect(migration).toContain("canonical_row.verification_status <> 'verified'");
    expect(migration).toContain("canonical_row.object_path = duplicate_row.object_path");
    expect(migration).not.toContain("migrated-lovable/32/32be4604-a427-4149-85c4-3ca8de69bb42.png");
    expect(migration).not.toContain("migrated-lovable/56/56451814-1b32-4612-b763-70a9d2022178.png");
  });

  it("uses a transaction-local service context without disabling media guards", () => {
    expect(migration).toContain("set_config('request.jwt.claim.role', 'service_role', true)");
    expect(migration).not.toContain("disable trigger");
    expect(migration).not.toContain("drop trigger if exists media_assets_before_write");
  });

  it("registers the exact modified migration blob", () => {
    const entry = manifest.migrations.find((item) => item.version === "20260717222000");
    expect(entry?.git_blob_sha).toBe("f32dad5752ce5adfb6147392657fce0d799e07eb");
  });
});
