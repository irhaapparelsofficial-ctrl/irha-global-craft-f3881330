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

  it("keeps repository migration files compatible with the single outer transaction", () => {
    const manifest = JSON.parse(read("supabase/repository-migrations.json"));
    const transactional = manifest.migrations.filter(
      (migration: { execution_mode?: string }) => migration.execution_mode === "transactional",
    );

    expect(transactional.length).toBeGreaterThan(0);
    for (const migration of transactional) {
      const sql = read(migration.path).trim();
      expect(sql).toMatch(/^begin\s*;/i);
      expect(sql).toMatch(/commit\s*;?$/i);
    }
  });
});
