import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationsDir = resolve(process.cwd(), "supabase/migrations");

describe("migration ledger export diagnostic", () => {
  it("emits the private repository migration ledger for one read-only diagnostic run", () => {
    const files = readdirSync(migrationsDir)
      .filter((name) => name.endsWith(".sql"))
      .sort();

    console.log("IRHA_MIGRATION_LEDGER_BEGIN");
    for (const filename of files) {
      const sql = readFileSync(resolve(migrationsDir, filename));
      console.log(`IRHA_MIGRATION_FILE ${filename} ${sql.toString("base64")}`);
    }
    console.log("IRHA_MIGRATION_LEDGER_END");

    expect.fail("Intentional read-only diagnostic failure; never merge this test.");
  });
});
