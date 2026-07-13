import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.resolve(process.cwd(), "src/pages/AdminOutreachQuick.tsx"),
  "utf8",
);

describe("AdminOutreachQuick safety", () => {
  it("requires explicit approval before the irreversible send", () => {
    expect(source).toContain('action: "update"');
    expect(source).toContain('status: "approved"');
    expect(source).toContain('action: "send"');
    expect(source).toContain("window.confirm");
  });

  it("sends exactly one selected message per owner click", () => {
    expect(source).toContain('message_ids: [message.id]');
    expect(source).not.toContain("selectedMessageIds");
    expect(source).not.toContain("send all");
  });

  it("keeps credentials and direct Gmail transport out of the browser", () => {
    expect(source).toContain('supabase.functions.invoke("outreach-engine"');
    expect(source).not.toContain("GOOGLE_MAIL_API_KEY");
    expect(source).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(source).not.toContain("gmail/v1/users/me/messages/send");
  });

  it("keeps the route private and noindex", () => {
    expect(source).toContain("if (!user)");
    expect(source).toContain("if (!isAdmin)");
    expect(source).toContain("noindex");
  });
});
