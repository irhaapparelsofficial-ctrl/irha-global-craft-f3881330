import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type ManifestEntry = {
  version: string;
  name: string;
  path: string;
  git_blob_sha: string;
  execution_mode?: "transactional" | "verified_present";
  transactional_dry_run: boolean;
  verification_query?: string;
};

type Manifest = {
  schema_version: number;
  project_id: string;
  cutover_version: string;
  ledger_table: string;
  migrations: ManifestEntry[];
};

const root = process.cwd();
const manifest = JSON.parse(
  readFileSync(resolve(root, "supabase/repository-migrations.json"), "utf8"),
) as Manifest;

const recoveredPinterestMigrations = [
  ["20260803204636", "pinterest_oauth_control"],
  ["20260803204702", "pinterest_oauth_control_verify"],
  ["20260803204750", "pinterest_bootstrap_guard_indexes"],
  ["20260803210743", "pinterest_operator_jobs"],
  ["20260803215802", "pinterest_bootstrap_multiuse"],
  ["20260803215854", "pinterest_bootstrap_multiuse_noop_check"],
  ["20260803215906", "pinterest_bootstrap_multiuse_cleanup_noop"],
  ["20260803215920", "pinterest_bootstrap_multiuse_runtime_marker"],
] as const;

function gitBlobSha(buffer: Buffer) {
  const prefix = Buffer.from(`blob ${buffer.length}\0`, "utf8");
  return createHash("sha1").update(prefix).update(buffer).digest("hex");
}

describe("repository migration manifest static contract", () => {
  it("lists every migration at or after cutover exactly once", () => {
    const files = readdirSync(resolve(root, "supabase/migrations"))
      .filter((file) => /^\d{14}_.+\.sql$/.test(file))
      .filter((file) => file.slice(0, 14) >= manifest.cutover_version)
      .map((file) => `supabase/migrations/${file}`)
      .sort();
    const listed = manifest.migrations.map((entry) => entry.path).sort();

    expect(listed).toEqual(files);
    expect(new Set(manifest.migrations.map((entry) => entry.version)).size).toBe(manifest.migrations.length);
    expect(new Set(listed).size).toBe(listed.length);
  });

  it("matches every migration to its exact Git blob checksum", () => {
    const mismatches = manifest.migrations.flatMap((entry) => {
      const actual = gitBlobSha(readFileSync(resolve(root, entry.path)));
      return actual === entry.git_blob_sha
        ? []
        : [{ version: entry.version, path: entry.path, expected: entry.git_blob_sha, actual }];
    });

    expect(mismatches).toEqual([]);
  });

  it("keeps execution modes explicit and safe", () => {
    for (const entry of manifest.migrations) {
      expect(entry.version).toMatch(/^\d{14}$/);
      expect(entry.git_blob_sha).toMatch(/^[0-9a-f]{40}$/);
      const mode = entry.execution_mode ?? "transactional";
      expect(["transactional", "verified_present"]).toContain(mode);
      if (mode === "verified_present") {
        expect(entry.transactional_dry_run).toBe(false);
        expect(entry.verification_query?.trim()).toMatch(/^select\b/i);
      } else {
        expect(entry.transactional_dry_run).toBe(true);
        expect(entry.verification_query).toBeUndefined();
      }
    }
  });

  it("locks recovered Pinterest live history to verified-present statement evidence", () => {
    const recoveredVersions = new Set(recoveredPinterestMigrations.map(([version]) => version));
    const recoveredEntries = manifest.migrations.filter((entry) => recoveredVersions.has(entry.version as typeof recoveredPinterestMigrations[number][0]));
    expect(recoveredEntries).toHaveLength(recoveredPinterestMigrations.length);

    for (const [version, name] of recoveredPinterestMigrations) {
      const entry = recoveredEntries.find((candidate) => candidate.version === version);
      expect(entry).toMatchObject({
        version,
        name,
        path: `supabase/migrations/${version}_${name}.sql`,
        execution_mode: "verified_present",
        transactional_dry_run: false,
      });
      expect(entry?.verification_query).toContain("supabase_migrations.schema_migrations");
      expect(entry?.verification_query).toContain(`version = '${version}'`);
      expect(entry?.verification_query).toContain(`name = '${name}'`);
      expect(entry?.verification_query).toContain("extensions.digest");
      expect(entry?.verification_query).toMatch(/[0-9a-f]{64}/);
    }
  });
});
