import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const sourcePath = path.resolve(process.cwd(), "src/components/admin/AdminOutreachCommandCenter.tsx");
const source = fs.readFileSync(sourcePath, "utf8");

describe("AdminOutreachCommandCenter safety", () => {
  it("keeps CRM approval separate from external message sending", () => {
    expect(source).toContain('action: "review"');
    expect(source).toContain('action: "import"');
    expect(source).not.toContain('action: "send"');
    expect(source).not.toContain('action: "create_draft"');
  });

  it("requires strict evidence before a candidate can be imported", () => {
    expect(source).toContain("approvalBlockers");
    expect(source).toContain("valid business email");
    expect(source).toContain("verification evidence");
    expect(source).toContain("score 70+");
  });

  it("exports reviewable data without connector payloads or credentials", () => {
    expect(source).toContain("downloadCsv");
    expect(source).toContain('"Subject"');
    expect(source).toContain('"Message"');
    expect(source).not.toContain("connector_response");
    expect(source).not.toContain("GOOGLE_MAIL_API_KEY");
    expect(source).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });
});
