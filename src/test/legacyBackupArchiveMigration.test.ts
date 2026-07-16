import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260716190000_archive_and_remove_legacy_backup_schemas.sql"),
  "utf8",
);

describe("legacy backup archive migration", () => {
  it("archives rows and schema metadata before dropping dated sources", () => {
    expect(sql).toContain("private.legacy_schema_archive_20260716");
    expect(sql).toContain("columns_metadata");
    expect(sql).toContain("constraints_metadata");
    expect(sql).toContain("indexes_metadata");
    expect(sql).toContain("row_data");
    expect(sql).toContain("jsonb_array_length(rows_json) <> archived_rows");
  });

  it("keeps the archive private and removes only named legacy sources", () => {
    expect(sql).toContain("revoke all on table private.legacy_schema_archive_20260716 from public, anon, authenticated");
    expect(sql).toContain("grant select, insert, update, delete on table private.legacy_schema_archive_20260716 to service_role");
    expect(sql).toContain("drop schema if exists legacy_pre_irha cascade");
    expect(sql).toContain("drop schema if exists migration_backup_20260713 cascade");
    expect(sql).toContain("drop schema if exists migration_backup_20260714_media cascade");
    expect(sql).not.toContain("drop schema public");
    expect(sql).not.toContain("drop schema private");
  });
});
