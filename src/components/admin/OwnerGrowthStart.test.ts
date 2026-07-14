import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("owner-focused admin growth home", () => {
  it("places the four primary business actions at the top of the overview", () => {
    const overview = read("src/components/admin/OverviewPanel.tsx");
    expect(overview).toContain("<OwnerGrowthStart go={go} />");
    expect(overview.indexOf("<OwnerGrowthStart go={go} />")).toBeLessThan(overview.indexOf("<GuidedBusinessActions />"));
  });

  it("connects each primary action to a real admin workflow", () => {
    const panel = read("src/components/admin/OwnerGrowthStart.tsx");
    expect(panel).toContain('title="Find New Buyers"');
    expect(panel).toContain('title="Review Ready Leads"');
    expect(panel).toContain('title="Contact Buyers"');
    expect(panel).toContain('title="Live Chat"');
    expect(panel).toContain('go("lead_engine")');
    expect(panel).toContain('go("mailing")');
    expect(panel).toContain('href="/admin/live-chat"');
  });

  it("preserves owner approval boundaries and advanced tools", () => {
    const panel = read("src/components/admin/OwnerGrowthStart.tsx");
    const overview = read("src/components/admin/OverviewPanel.tsx");
    expect(panel).toContain("Aapki approval ke baghair kuch send nahi hota");
    expect(panel).toContain("CRM import, email/WhatsApp send, quotation, price commitment aur public post");
    expect(overview).toContain("<AutomationControlCenter />");
    expect(overview).toContain("<BackendActivationDashboard go={go} />");
  });
});
