import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const page = fs.readFileSync(path.resolve(process.cwd(), "src/pages/AdminOutreachApproval.tsx"), "utf8");
const backend = fs.readFileSync(path.resolve(process.cwd(), "supabase/functions/outreach-channel-copilot/index.ts"), "utf8");
const app = fs.readFileSync(path.resolve(process.cwd(), "src/App.tsx"), "utf8");
const publicWildcardIndex = app.search(/<Route\s+path="\*"\s+element=\{/);

describe("outreach approval copilot safety", () => {
  it("requires authenticated admin access in browser and backend", () => {
    expect(page).toContain("if (!user)");
    expect(page).toContain("if (!isAdmin)");
    expect(backend).toContain("auth.auth.getUser()");
    expect(backend).toContain('.eq("role", "admin")');
  });

  it("registers the private route before the public wildcard and preserves lead intake", () => {
    const route = '<Route path="/admin/outreach-approval" element={<AdminOutreachApproval />} />';
    const intakeRoute = '<Route path="/admin/lead-intake" element={<AdminLeadIntake />} />';
    expect(app).toContain('const AdminOutreachApproval = lazy(() => import("./pages/AdminOutreachApproval"))');
    expect(app).toContain(route);
    expect(app).toContain(intakeRoute);
    expect(publicWildcardIndex).toBeGreaterThan(-1);
    expect(app.indexOf(route)).toBeLessThan(publicWildcardIndex);
    expect(app.indexOf(intakeRoute)).toBeLessThan(publicWildcardIndex);
  });

  it("orchestrates existing lead and email engines instead of replacing them", () => {
    expect(page).toContain('supabase.functions.invoke("lead-research"');
    expect(page).toContain('supabase.functions.invoke("outreach-engine"');
    expect(page).toContain('supabase.functions.invoke("outreach-channel-copilot"');
    expect(backend).not.toContain('.from("b2b_leads").insert');
    expect(backend).not.toContain("GMAIL_BASE");
  });

  it("derives WhatsApp copy from the existing AI email without adding new claims", () => {
    expect(backend).toContain('derivation_mode: "existing_ai_email_no_new_claims"');
    expect(backend).toContain("deriveWhatsAppCopy(message.body_text)");
    expect(backend).toContain("No new buyer facts or commercial claims added");
    expect(backend).not.toContain("ai.gateway.lovable.dev");
  });

  it("does not expose an email or WhatsApp send endpoint", () => {
    expect(page).not.toContain('action: "send"');
    expect(page).not.toContain('action: "send_approved"');
    expect(backend).not.toContain('action === "send"');
    expect(backend).not.toContain("messages/send");
    expect(backend).not.toContain("graph.facebook.com");
    expect(backend).toContain("send_capability: false");
  });

  it("keeps WhatsApp as copy/open and never auto-clicks Send", () => {
    expect(page).toContain("https://wa.me/");
    expect(page).toContain('window.open(url, "_blank"');
    expect(page).toContain("WhatsApp opens a prefilled chat but never presses Send");
    expect(page).toContain("Approval queues the exact email. It does not send email or WhatsApp.");
  });

  it("blocks commercial commitments in generated and edited WhatsApp copy", () => {
    expect(backend).toContain("detectHighRiskTerms");
    expect(backend).toContain("fixed price");
    expect(backend).toContain("MOQ commitment");
    expect(backend).toContain("delivery commitment");
    expect(backend).toContain("certification claim");
  });

  it("uses bounded batches, idempotent existing messages and safe CSV export", () => {
    expect(backend).toContain("const MAX_PREPARE = 50");
    expect(page).toContain("slice(0, 50)");
    expect(backend).toContain("WhatsApp draft already prepared");
    expect(page).toContain("^[\\t\\r\\n ]*[=+\\-@]");
    expect(page).toContain("Export complete package CSV");
  });
});
