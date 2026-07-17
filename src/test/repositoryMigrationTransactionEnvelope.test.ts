import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { transactionBody } from "../../scripts/ci/sql-transaction-body.mjs";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("repository migration transaction envelope", () => {
  it("uses one SQL-aware parser for manifest validation, cumulative dry-run and apply", () => {
    const reconciler = read("scripts/ci/reconcile-repository-migrations.mjs");

    expect(reconciler).toContain('import { transactionBody } from "./sql-transaction-body.mjs";');
    expect(reconciler).toContain('const sql = transactionBody(buffer.toString("utf8"), entry);');
    expect(reconciler).toContain('const sql = transactionBody(readFileSync(resolve(root, entry.path), "utf8"), entry);');
    expect(reconciler.match(/transactionBody\(readFileSync/g)).toHaveLength(2);
    expect(reconciler).toContain("const transactionalPending = [];");
    expect(reconciler).toContain('const cumulativeSql = transactionalPending');
    expect(reconciler).toContain('await databaseQuery(`begin;\\n${cumulativeSql}\\nrollback;`);');
    expect(reconciler).not.toContain('await databaseQuery(`begin;\\n${sql}\\nrollback;`);');
    expect(reconciler).toContain("begin;\\n${sql}\\n${ledgerInsertSql(entry)}\\ncommit;");
  });

  it("preserves manifest order while validating dependent pending migrations in one rollback", () => {
    const reconciler = read("scripts/ci/reconcile-repository-migrations.mjs");

    expect(reconciler).toContain('transactionalPending.push({ entry, sql });');
    expect(reconciler).toContain('.map(({ entry, sql }) => `-- repository migration ${entry.version}: ${entry.path}\\n${sql}`)');
    expect(reconciler).toContain('.join("\\n\\n")');
    expect(reconciler.indexOf("const cumulativeSql = transactionalPending"))
      .toBeLessThan(reconciler.indexOf('await databaseQuery(`begin;\\n${cumulativeSql}\\nrollback;`);'));
  });

  it("accepts leading and trailing SQL comments around one outer transaction", () => {
    const body = transactionBody(
      `-- migration purpose
/* reviewed wrapper */
BEGIN;
select 1;
COMMIT;
-- end evidence`,
      { version: "test-commented-wrapper" },
    );

    expect(body).toBe("select 1;");
  });

  it("ignores transaction words inside comments, strings and dollar-quoted functions", () => {
    const body = transactionBody(
      `begin;
-- begin; commit; rollback;
select 'commit;' as note;
create function pg_temp.wrapper_probe() returns void language plpgsql as $$
begin
  perform 1;
end;
$$;
commit;`,
      { version: "test-sql-lexing" },
    );

    expect(body).toContain("wrapper_probe");
    expect(body).toContain("select 'commit;' as note");
  });

  it("rejects actual nested transaction control", () => {
    expect(() => transactionBody(
      "begin; select 1; rollback; commit;",
      { version: "test-nested" },
    )).toThrow("Migration test-nested contains nested transaction control");
  });

  it("parses every current transactional migration through the production helper", () => {
    const manifest = JSON.parse(read("supabase/repository-migrations.json")) as {
      migrations: Array<{ version: string; path: string; execution_mode?: string }>;
    };
    const transactional = manifest.migrations.filter(
      (migration) => (migration.execution_mode || "transactional") === "transactional",
    );

    expect(transactional.length).toBeGreaterThan(0);
    for (const migration of transactional) {
      const body = transactionBody(read(migration.path), migration);
      expect(body.length).toBeGreaterThan(0);
      expect(body.toLowerCase()).not.toMatch(/^begin\s*;/);
      expect(body.toLowerCase()).not.toMatch(/commit\s*;?$/);
    }
  });
});
