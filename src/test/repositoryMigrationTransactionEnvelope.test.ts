import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("repository migration transaction envelope", () => {
  it("strips a migration-owned outer transaction before dry-run and apply", () => {
    const reconciler = read("scripts/ci/reconcile-repository-migrations.mjs");

    expect(reconciler).toContain("function transactionBody(sql, entry)");
    expect(reconciler).toContain("contains nested transaction control");
    expect(reconciler).toContain('const sql = transactionBody(readFileSync(resolve(root, entry.path), "utf8"), entry);');
    expect(reconciler.match(/transactionBody\(readFileSync/g)).toHaveLength(2);
    expect(reconciler).toContain("begin;\\n${sql}\\nrollback;");
    expect(reconciler).toContain("begin;\\n${sql}\\n${ledgerInsertSql(entry)}\\ncommit;");
  });

  it("allows one optional outer wrapper but rejects nested transaction control", () => {
    const manifest = JSON.parse(read("supabase/repository-migrations.json"));
    const transactional = manifest.migrations.filter(
      (migration: { execution_mode?: string }) => migration.execution_mode === "transactional",
    );

    expect(transactional.length).toBeGreaterThan(0);
    for (const migration of transactional) {
      const sql = read(migration.path).trim();
      const wrapped = sql.match(/^begin\s*;\s*([\s\S]*?)\s*commit\s*;?$/i);
      const body = (wrapped ? wrapped[1] : sql).trim();
      expect(body.length).toBeGreaterThan(0);
      expect(body).not.toMatch(/\b(begin|commit|rollback)\s*;/i);
    }
  });
});
