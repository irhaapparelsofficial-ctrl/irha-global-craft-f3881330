import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260714180000_revoke_lead_outreach_trigger_rpc.sql",
  ),
  "utf8",
);

describe("lead/outreach trigger-only database grants", () => {
  for (const functionName of [
    "lead_import_files_before_write()",
    "outreach_attachment_before_write()",
  ]) {
    it(`blocks direct browser RPC execution of ${functionName}`, () => {
      expect(migration).toContain(
        `revoke all on function public.${functionName} from public;`,
      );
      expect(migration).toContain(
        `revoke all on function public.${functionName} from anon;`,
      );
      expect(migration).toContain(
        `revoke all on function public.${functionName} from authenticated;`,
      );
      expect(migration).toContain(
        `grant execute on function public.${functionName} to service_role;`,
      );
    });
  }
});
