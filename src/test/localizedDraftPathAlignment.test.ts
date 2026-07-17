import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = "supabase/migrations/20260717232100_align_localized_draft_paths.sql";
const buffer = readFileSync(resolve(process.cwd(), migrationPath));
const migration = buffer.toString("utf8");
const manifest = JSON.parse(
  readFileSync(resolve(process.cwd(), "supabase/repository-migrations.json"), "utf8"),
) as {
  migrations: Array<{
    version: string;
    name: string;
    path: string;
    git_blob_sha: string;
    execution_mode?: string;
    transactional_dry_run: boolean;
    verification_query?: string;
  }>;
};

function gitBlobSha(value: Buffer) {
  return createHash("sha1")
    .update(Buffer.from(`blob ${value.length}\0`, "utf8"))
    .update(value)
    .digest("hex");
}

describe("localized draft path alignment", () => {
  it("registers the exact ordered migration blob", () => {
    const entry = manifest.migrations.find((item) => item.version === "20260717232100");
    expect(entry).toMatchObject({
      version: "20260717232100",
      name: "align_localized_draft_paths",
      path: migrationPath,
      git_blob_sha: gitBlobSha(buffer),
      execution_mode: "verified_present",
      transactional_dry_run: false,
    });
    expect(entry?.verification_query).toMatch(/^select\b/i);
  });

  it("uses the required localized hierarchical route and apex canonical URL", () => {
    expect(migration).toContain("slug = 'bavarian-trachten-wear'");
    expect(migration).toContain("base_route = '/products/bavarian-trachten-wear'");
    expect(migration).toContain("path = '/intl/' || locale || '/products/bavarian-trachten-wear'");
    expect(migration).toContain("'https://irhaapparels.com/intl/' || locale || '/products/bavarian-trachten-wear'");
    expect(migration).not.toContain("https://www.irhaapparels.com");
  });

  it("keeps every localized page draft, noindex and native-review-locked", () => {
    expect(migration).toContain("status = 'draft'");
    expect(migration).toContain("noindex = true");
    expect(migration).toContain("native_review_status = 'required'");
    expect(migration).toContain("reviewed_at = null");
    expect(migration).toContain("approved_at = null");
    expect(migration).toContain("published_at = null");
    expect(migration).toContain("all three localized drafts must use the hierarchical apex URL and remain locked from indexing");
  });
});
