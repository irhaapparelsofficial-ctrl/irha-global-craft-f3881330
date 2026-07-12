import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const componentPath = path.resolve(process.cwd(), "src/components/admin/LeadWaveSummary.tsx");
const source = fs.readFileSync(componentPath, "utf8");

describe("LeadWaveSummary safety", () => {
  it("reads campaign and candidate data without external execution calls", () => {
    expect(source).toContain('from("lead_campaigns")');
    expect(source).toContain('from("lead_candidates")');
    expect(source).not.toContain("functions.invoke");
    expect(source).not.toContain(".insert(");
    expect(source).not.toContain(".update(");
    expect(source).not.toContain(".delete(");
  });

  it("states that review and outreach remain owner controlled", () => {
    expect(source).toContain("Nothing is imported into Buyer CRM or contacted automatically");
    expect(source).toContain("Review-only guard is active");
  });
});
