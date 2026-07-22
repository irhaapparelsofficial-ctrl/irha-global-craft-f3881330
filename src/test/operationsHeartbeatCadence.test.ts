import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migrationPath = resolve(
  "supabase/migrations/20260722184000_reduce_operations_heartbeat_cadence.sql",
);
const registryPath = resolve("supabase/repository-migrations.json");

describe("operations heartbeat cadence", () => {
  it("keeps exactly one active 15-minute heartbeat job", () => {
    const migration = readFileSync(migrationPath, "utf8");

    expect(migration).toContain("irha-operations-heartbeat");
    expect(migration).toContain("*/15 * * * *");
    expect(migration).toContain("cron.alter_job");
    expect(migration).not.toContain("cron.schedule");
    expect(migration).toContain("heartbeat_job_count <> 1");
    expect(migration).toContain("matching_jobs <> 1");
    expect(migration).not.toContain("irha-notification-dispatcher");
  });

  it("preserves the authenticated operations invocation", () => {
    const migration = readFileSync(migrationPath, "utf8");

    expect(migration).toContain(
      "select public.invoke_irha_operations(''heartbeat'',''cron'',''{}''::jsonb);",
    );
  });

  it("registers the migration by immutable blob SHA", () => {
    const registry = JSON.parse(readFileSync(registryPath, "utf8")) as {
      migrations: Array<Record<string, unknown>>;
    };
    const entry = registry.migrations.find(
      (migration) => migration.version === "20260722184000",
    );

    expect(entry).toEqual({
      version: "20260722184000",
      name: "reduce_operations_heartbeat_cadence",
      path: "supabase/migrations/20260722184000_reduce_operations_heartbeat_cadence.sql",
      git_blob_sha: "ac19180a174a101b0dbe1c7c4d0710aff3aa3009",
      execution_mode: "transactional",
      transactional_dry_run: true,
    });
  });
});
