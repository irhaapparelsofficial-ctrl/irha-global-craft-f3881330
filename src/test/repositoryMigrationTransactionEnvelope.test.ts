import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { sqlCodeOnly, transactionBody } from "../../scripts/ci/sql-transaction-body.mjs";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("repository migration transaction envelope", () => {
  it("uses one SQL-aware parser for manifest validation, dry-run and apply", () => {
    const reconciler = read("scripts/ci/reconcile-repository-migrations.mjs");

    expect(reconciler).toContain('import { sqlCodeOnly, transactionBody } from "./sql-transaction-body.mjs";');
    expect(reconciler).toContain('forbidden.test(sqlCodeOnly(withoutTrailingSemicolon))');
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

  it("masks comments and string literals before read-only keyword validation", () => {
    const query = "select has_function_privilege('anon', 'public.example()', 'execute') as verified -- execute is a privilege literal";
    const code = sqlCodeOnly(query);

    expect(code).toContain("select has_function_privilege");
    expect(code).not.toMatch(/\bexecute\b/i);
    expect(code).not.toContain("anon");
  });

  it("keeps actual SQL commands visible to the validator", () => {
    expect(sqlCodeOnly("select 1; execute dangerous_plan")).toMatch(/\bexecute\b/i);
    expect(sqlCodeOnly("select 1; update public.products set name = 'safe-looking'")).toMatch(/\bupdate\b/i);
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
