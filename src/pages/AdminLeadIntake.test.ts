import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const page = fs.readFileSync(path.resolve(process.cwd(), "src/pages/AdminLeadIntake.tsx"), "utf8");
const backend = fs.readFileSync(path.resolve(process.cwd(), "supabase/functions/lead-bulk-stage/index.ts"), "utf8");
const app = fs.readFileSync(path.resolve(process.cwd(), "src/App.tsx"), "utf8");
const publicWildcardIndex = app.search(/<Route\s+path="\*"\s+element=\{/);

describe("bulk lead intake safety", () => {
  it("requires owner authentication and admin authorization", () => {
    expect(page).toContain("if (!user)");
    expect(page).toContain("if (!isAdmin)");
    expect(backend).toContain("auth.auth.getUser()");
    expect(backend).toContain('.eq("role", "admin")');
  });

  it("registers the private route before the public wildcard layout", () => {
    const route = '<Route path="/admin/lead-intake" element={<AdminLeadIntake />} />';
    expect(app).toContain('const AdminLeadIntake = lazy(() => import("./pages/AdminLeadIntake"))');
    expect(app).toContain(route);
    expect(app.indexOf(route)).toBeGreaterThan(-1);
    expect(publicWildcardIndex).toBeGreaterThan(-1);
    expect(app.indexOf(route)).toBeLessThan(publicWildcardIndex);
  });

  it("uses restartable small chunks and never sends outreach", () => {
    expect(page).toContain("const CHUNK_SIZE = 100");
    expect(backend).toContain("const MAX_ROWS = 100");
    expect(backend).toContain("sends_external_messages: false");
    expect(page).not.toContain('action: "send"');
    expect(backend).not.toContain("outreach-engine");
    expect(backend).not.toContain("whatsapp-admin");
    expect(backend).not.toContain("process-email-queue");
  });

  it("stages candidates idempotently for review instead of importing directly to CRM", () => {
    expect(backend).toContain('verification_status: "needs_review"');
    expect(backend).toContain('db.from("lead_candidates")');
    expect(backend).toContain('.upsert(inserts, { onConflict: "campaign_id,import_fingerprint", ignoreDuplicates: true })');
    expect(backend).not.toContain('.from("b2b_leads").insert');
  });

  it("keeps secrets and public file uploads out of the browser", () => {
    expect(page).toContain('supabase.functions.invoke("lead-bulk-stage"');
    expect(page).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(page).not.toContain("storage.from(");
    expect(page).not.toContain("upload(");
    expect(backend).not.toContain("Access-Control-Allow-Credentials");
  });

  it("caps file size and exports exceptions with spreadsheet injection protection", () => {
    expect(page).toContain("25 * 1024 * 1024");
    expect(page).toContain("^[\\t\\r\\n ]*[=+\\-@]");
    expect(page).toContain("Export exceptions");
  });
});
