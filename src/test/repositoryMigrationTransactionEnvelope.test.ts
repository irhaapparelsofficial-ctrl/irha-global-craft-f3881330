import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { transactionBody } from "../../scripts/ci/sql-transaction-body.mjs";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("repository migration transaction envelope", () => {
  it("uses one SQL-aware parser for manifest validation, dry-run and apply", () => {
    const reconciler = read("scripts/ci/reconcile-repository-migrations.mjs");

    expect(reconciler).toContain('import { transactionBody } from "./sql-transaction-body.mjs";');
    expect(reconciler).toContain('const sql = transactionBody(buffer.toString("utf8"), entry);');
    expect(reconciler).toContain('const sql = transactionBody(readFileSync(resolve(root, entry.path), "utf8"), entry);');
    expect(reconciler.match(/transactionBody\(readFileSync/g)).toHaveLength(2);
    expect(reconciler).toContain("begin;\\n${sql}\\nrollback;");
    expect(reconciler).toContain("begin;\\n${sql}\\n${ledgerInsertSql(entry)}\\ncommit;");
  });

  it("accepts leading and trailing SQL comments around one outer transaction", () => {
    const body = transactionBody(
      `-- migration purpose\n/* reviewed wrapper */\nBEGIN;\nselect 1;\nCOMMIT;\n-- end evidence`,
      { version: "test-commented-wrapper" },
    );

    expect(body).toBe("select 1;");
  });

  it("ignores transaction words inside comments, strings and dollar-quoted functions", () => {
    const body = transactionBody(
      `begin;\n-- begin; commit; rollback;\nselect 'commit;' as note;\ncreate function pg_temp.wrapper_probe() returns void language plpgsql as $$\nbegin\n  perform 1;\nend;\n$$;\ncommit;`,
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
