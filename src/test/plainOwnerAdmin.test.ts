import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const shell = fs.readFileSync(path.resolve(process.cwd(), "src/components/admin/AdminShell.tsx"), "utf8");
const plain = fs.readFileSync(path.resolve(process.cwd(), "src/components/admin/PlainOwnerMode.tsx"), "utf8");

function between(source: string, start: string, end: string) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  return source.slice(from, to < 0 ? source.length : to);
}

describe("plain owner admin", () => {
  it("shows exactly five primary business sections", () => {
    const primary = between(shell, "const PLAIN_NAV", "const ADVANCED_NAV");
    for (const label of ["Dashboard", "Buyers", "Inbox", "Sales", "Catalogue"]) {
      expect(primary).toContain(`label: "${label}"`);
    }
    expect((primary.match(/label:/g) || []).length).toBe(5);
  });

  it("uses the same five owner sections in mobile navigation", () => {
    const mobile = between(shell, "const MOBILE_NAV", "function groupTitle");
    const entries = [...mobile.matchAll(/\{ key: "[^"]+", label: "([^"]+)"/g)].map((match) => match[1]);
    expect(entries).toEqual(["Dashboard", "Buyers", "Inbox", "Sales", "Catalogue"]);
  });

  it("keeps detailed tools hidden behind an explicit Advanced Tools toggle", () => {
    expect(shell).toContain("Advanced Tools");
    expect(shell).toContain("irha-admin-advanced-open");
    expect(shell).toContain("setAdvancedOpen");
    expect(shell).toContain("advancedOpen &&");
    expect(shell).not.toContain("DailyOwnerCommandCenter");
  });

  it("routes every plain tab to its simple business hub", () => {
    expect(shell).toContain('view === "overview"');
    expect(shell).toContain("<PlainOwnerDashboard go={setView} />");
    expect(shell).toContain('view === "buyers"');
    expect(shell).toContain("<PlainBuyersHub go={setView} />");
    expect(shell).toContain('view === "inbox"');
    expect(shell).toContain("<PlainInboxHub go={setView} />");
    expect(shell).toContain('view === "sales"');
    expect(shell).toContain("<PlainSalesHub go={setView} />");
    expect(shell).toContain('view === "catalogue_home"');
    expect(shell).toContain("<PlainCatalogueHub go={setView} />");
  });

  it("uses real owner database tables and keeps the plain hubs read-only", () => {
    for (const table of [
      "lead_candidates",
      "b2b_leads",
      "inquiries",
      "catalogue_leads",
      "crm_notifications",
      "outreach_messages",
      "crm_tasks",
      "crm_quotations",
      "crm_samples",
      "products",
      "categories",
      "media_assets",
    ]) expect(plain).toContain(`from("${table}")`);
    expect(plain).not.toContain(".insert(");
    expect(plain).not.toContain(".update(");
    expect(plain).not.toContain('action: "send"');
  });

  it("keeps human live chat prominent and truthful", () => {
    expect(plain).toContain('href: "/admin/live-chat"');
    expect(plain).toContain('channel: "human_live_chat"');
    expect(plain).toContain("WhatsApp will appear as a primary inbox action only after");
  });

  it("does not show advanced page guidance on plain views", () => {
    expect(shell).toContain("const plainView = PLAIN_VIEWS.has(view)");
    expect(shell).toContain("!plainView &&");
    expect(shell).toContain("Advanced workspace");
  });
});
