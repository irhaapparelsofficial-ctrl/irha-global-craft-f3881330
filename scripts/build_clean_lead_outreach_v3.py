from __future__ import annotations

import subprocess
from pathlib import Path

SOURCE_COMMIT = "212234de454136b2e587bece5e295fccb194416c"
RESTORE_PATHS = [
    "docs/verification/LEAD_OUTREACH_SAFETY_GUARDS_20260714.md",
    "src/components/admin/ChannelCandidateActivationPanel.tsx",
    "src/components/admin/MailingPanel.tsx",
    "src/components/admin/OutreachApprovalPanel.test.ts",
    "src/components/admin/OutreachApprovalPanel.tsx",
    "src/lib/leadIntake.test.ts",
    "src/lib/leadIntake.ts",
    "src/pages/AdminLeadIntake.test.ts",
    "src/pages/AdminLeadIntake.tsx",
    "src/test/leadOutreachSafetyContracts.test.ts",
    "supabase/functions/lead-activation-channel-v2/index.ts",
    "supabase/functions/lead-bulk-stage/index.ts",
    "supabase/functions/lead-file-registry/index.ts",
    "supabase/functions/outreach-workflow-v2/index.ts",
    "supabase/migrations/20260714095000_lead_import_files.sql",
    "supabase/migrations/20260714120000_outreach_approval_dispatch.sql",
    "supabase/migrations/20260714121000_lead_source_file_links.sql",
    "supabase/migrations/20260714122000_lead_activation_claims.sql",
]
REMOVE_PATHS = [
    "src/components/admin/OutreachApprovalLivePanel.tsx",
    "supabase/functions/outreach-email-dispatch-v2/index.ts",
    ".github/workflows/diagnose-lead-outreach-tests.yml",
    ".github/workflows/lead-test-diagnostics.yml",
    ".github/workflows/fix-clean-build-source.yml",
]


def run(*args: str) -> None:
    subprocess.run(args, check=True)


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{path}: expected exact match once, found {count}")
    file.write_text(text.replace(old, new, 1))


run("git", "cat-file", "-e", f"{SOURCE_COMMIT}^{{commit}}")
run("git", "checkout", SOURCE_COMMIT, "--", *RESTORE_PATHS)
for path in REMOVE_PATHS:
    Path(path).unlink(missing_ok=True)

replace_once(
    "supabase/functions/outreach-workflow-v2/index.ts",
    "const MAX_GENERATE = 50;",
    "const MAX_GENERATE = 25;",
)

activation = "supabase/functions/lead-activation-channel-v2/index.ts"
replace_once(
    activation,
    '  const batch = await service.from("lead_activation_batches").insert({',
    '''  const staleCutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const staleBatchCleanup = await service.from("lead_activation_batches").update({
    status: "failed",
    failed_count: 1,
    errors: [{ phase: "recovery", error: "Stale running activation checkpoint expired" }],
    summary: { mode: "channel_activation_v2", recovery: "stale_running_batch", sends_external_messages: false, max_batch: MAX_BATCH },
    completed_at: new Date().toISOString(),
  }).eq("status", "running").lt("created_at", staleCutoff);
  if (staleBatchCleanup.error) throw staleBatchCleanup.error;

  const batch = await service.from("lead_activation_batches").insert({''',
)
replace_once(
    activation,
    '  if (batch.error || !batch.data) throw batch.error || new Error("Activation batch could not be created");',
    '''  if (batch.error || !batch.data) {
    if (batch.error?.code === "23505") {
      return json({ error: "Another owner activation batch is already running. Wait for its checkpoint to complete before retrying." }, 409);
    }
    throw batch.error || new Error("Activation batch could not be created");
  }''',
)
replace_once(
    activation,
    '''    return json({ ok: true, batch_id: batch.data.id, outcomes, summary, imported_lead_ids: importedLeadIds, sends_external_messages: false });
  } finally {''',
    '''    return json({ ok: true, batch_id: batch.data.id, outcomes, summary, imported_lead_ids: importedLeadIds, sends_external_messages: false });
  } catch (error) {
    const reason = errorText(error);
    const failedBatch = await service.from("lead_activation_batches").update({
      status: importedLeadIds.length ? "partial" : "failed",
      imported_lead_ids: importedLeadIds,
      imported_count: importedLeadIds.length,
      skipped_count: Math.max(0, outcomes.length - importedLeadIds.length),
      failed_count: Math.max(1, outcomes.filter((item) => item.status === "failed").length),
      summary: { mode: "channel_activation_v2", recovery: "unexpected_error", sends_external_messages: false, claim_token: claimToken, max_batch: MAX_BATCH },
      errors: [...outcomes.filter((item) => item.error), { phase: "activation", error: reason }].slice(0, MAX_BATCH + 1),
      completed_at: new Date().toISOString(),
    }).eq("id", batch.data.id);
    if (failedBatch.error) console.error("lead activation batch failure checkpoint failed", failedBatch.error.message);
    throw error;
  } finally {''',
)

replace_once(
    "src/components/admin/OutreachApprovalPanel.tsx",
    "function toggleSet(current: Set<string>, id: string) { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; }",
    "function toggleSet(current: Set<string>, id: string) { const next = new Set(current); if (next.has(id)) next.delete(id); else if (next.size < 25) next.add(id); return next; }",
)

migration = Path("supabase/migrations/20260714122000_lead_activation_claims.sql")
migration_text = migration.read_text()
commit_marker = "\ncommit;\n"
if migration_text.count(commit_marker) != 1:
    raise RuntimeError(
        f"migration commit marker expected once; found {migration_text.count(commit_marker)}"
    )
guard_sql = '''

update public.lead_activation_batches
set status = 'failed',
    failed_count = greatest(coalesce(failed_count, 0), 1),
    errors = coalesce(errors, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
      'phase', 'migration_recovery',
      'error', 'Stale running activation batch closed before singleton guard creation'
    )),
    completed_at = coalesce(completed_at, now())
where status = 'running'
  and created_at < now() - interval '15 minutes';

create unique index if not exists lead_activation_single_running_idx
  on public.lead_activation_batches ((true))
  where status = 'running';
'''
migration.write_text(migration_text.replace(commit_marker, guard_sql + commit_marker, 1))

safety_path = Path("src/test/leadOutreachSafetyContracts.test.ts")
safety = safety_path.read_text()
old_claim_assertions = '''    expect(backend).toContain('.eq("activation_claim_token", claimToken)');
    expect(migration).toContain("activation_claim_token uuid");'''
new_claim_assertions = '''    expect(backend).toContain('.eq("activation_claim_token", claimToken)');
    expect(backend).toContain('recovery: "unexpected_error"');
    expect(backend).toContain("Another owner activation batch is already running");
    expect(migration).toContain("activation_claim_token uuid");
    expect(migration).toContain("lead_activation_single_running_idx");'''
if safety.count(old_claim_assertions) != 1:
    raise RuntimeError(
        f"safety claim assertions expected once; found {safety.count(old_claim_assertions)}"
    )
safety = safety.replace(old_claim_assertions, new_claim_assertions, 1)
whatsapp_test_marker = '  it("blocks automatic WhatsApp retry after any primary delivery attempt", () => {'
authoritative_test = '''  it("caps draft generation at 25 and keeps one authoritative dispatch path", () => {
    const backend = read("supabase/functions/outreach-workflow-v2/index.ts");
    const panel = read("src/components/admin/OutreachApprovalPanel.tsx");
    const mailing = read("src/components/admin/MailingPanel.tsx");
    expect(backend).toContain("const MAX_GENERATE = 25;");
    expect(backend).toContain('if (action === "approve_and_send")');
    expect(panel).toContain('action: "approve_and_send"');
    expect(panel).toContain("next.size < 25");
    expect(mailing).toContain("OutreachApprovalPanel");
    expect(mailing).not.toContain("OutreachApprovalLivePanel");
  });

'''
if safety.count(whatsapp_test_marker) != 1:
    raise RuntimeError(
        f"WhatsApp test marker expected once; found {safety.count(whatsapp_test_marker)}"
    )
safety_path.write_text(
    safety.replace(whatsapp_test_marker, authoritative_test + whatsapp_test_marker, 1)
)

Path("src/test/leadOutreachEdgeSyntax.test.ts").write_text(
    '''import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as ts from "typescript";
import { describe, expect, it } from "vitest";

const paths = [
  "supabase/functions/lead-activation-channel-v2/index.ts",
  "supabase/functions/lead-bulk-stage/index.ts",
  "supabase/functions/lead-file-registry/index.ts",
  "supabase/functions/outreach-workflow-v2/index.ts",
];

describe("lead outreach Edge Function sources", () => {
  for (const relativePath of paths) {
    it(`${relativePath} has no TypeScript syntax diagnostics`, () => {
      const filePath = resolve(process.cwd(), relativePath);
      const source = readFileSync(filePath, "utf8");
      const sourceFile = ts.createSourceFile(
        filePath,
        source,
        ts.ScriptTarget.ES2022,
        true,
        ts.ScriptKind.TS,
      );
      const result = ts.transpileModule(source, {
        fileName: filePath,
        reportDiagnostics: true,
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
        },
      });
      const errors = (result.diagnostics ?? [])
        .filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error)
        .map((diagnostic) => {
          const message = ts.flattenDiagnosticMessageText(
            diagnostic.messageText,
            "\\n",
          );
          if (diagnostic.start === undefined) return message;
          const position = sourceFile.getLineAndCharacterOfPosition(
            diagnostic.start,
          );
          return `${position.line + 1}:${position.character + 1} ${message}`;
        });
      expect(errors).toEqual([]);
    });
  }
});
'''
)

Path("docs/LEAD_OUTREACH_V3_CLEAN_REBUILD_20260714.md").write_text(
    '''# Lead Outreach V3 Clean Rebuild — 2026-07-14

This replacement was rebuilt from latest `main` instead of merging the conflicted 47-commit PR #288.

Safety contracts:
- Maximum 25 candidate activations and 25 draft generations per owner checkpoint.
- One global running activation batch; stale batches close after 15 minutes.
- Candidate claims are atomic and are released in `finally`.
- Unexpected activation failures persist a failed/partial checkpoint.
- One authoritative `approve_and_send` action requires explicit owner confirmation.
- Email uses deterministic Gmail Message-ID recovery.
- WhatsApp records a primary attempt before sending and blocks automatic duplicate retries.
- No candidate activation, external email, WhatsApp message, or production deployment is performed by this commit.
'''
)

print("Clean lead outreach v3 source prepared successfully")
