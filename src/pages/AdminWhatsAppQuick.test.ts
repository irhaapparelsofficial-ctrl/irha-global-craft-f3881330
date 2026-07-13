import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.resolve(process.cwd(), "src/pages/AdminWhatsAppQuick.tsx"),
  "utf8",
);

describe("AdminWhatsAppQuick safety", () => {
  it("requires explicit owner confirmation and sends one message ID", () => {
    expect(source).toContain("window.confirm");
    expect(source).toContain('action: "send_approved"');
    expect(source).toContain("message_id: message.id");
    expect(source).not.toContain("message_ids");
  });

  it("uses the private admin function instead of browser Meta credentials", () => {
    expect(source).toContain('supabase.functions.invoke("whatsapp-admin"');
    expect(source).not.toContain("WHATSAPP_ACCESS_TOKEN");
    expect(source).not.toContain("WHATSAPP_PHONE_NUMBER_ID");
    expect(source).not.toContain("graph.facebook.com");
  });

  it("only reads outbound pending drafts and blocks opted-out contacts in the UI", () => {
    expect(source).toContain('.eq("direction", "outbound")');
    expect(source).toContain('.in("status", ["draft", "approved", "failed"])');
    expect(source).toContain('["opted_out", "blocked"]');
  });

  it("keeps the route private and noindex", () => {
    expect(source).toContain("if (!user)");
    expect(source).toContain("if (!isAdmin)");
    expect(source).toContain("noindex");
  });
});
