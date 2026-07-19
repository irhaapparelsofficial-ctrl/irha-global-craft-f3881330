import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const shell = fs.readFileSync(path.resolve(process.cwd(), "src/components/admin/AdminShell.tsx"), "utf8");
const admin = fs.readFileSync(path.resolve(process.cwd(), "src/pages/Admin.tsx"), "utf8");
const runtime = fs.readFileSync(path.resolve(process.cwd(), "src/components/admin/AdminRuntime.tsx"), "utf8");
const dashboard = fs.readFileSync(path.resolve(process.cwd(), "src/components/admin/WebsiteOperationsDashboard.tsx"), "utf8");

/**
 * The primary admin navigation must expose only the eleven website-operations
 * views. CRM, buyer pipeline, lead research, sales pipeline, quotations, PI,
 * outreach mailing, WhatsApp, social automation, listings, pricing and AI
 * business tools must not be reachable from the primary admin path.
 */
describe("website-operations admin (beginner mode)", () => {
  it("exposes exactly eleven primary sections in AdminShell PRIMARY_NAV", () => {
    const primary = shell.slice(shell.indexOf("const PRIMARY_NAV"), shell.indexOf("const PRIMARY_KEYS"));
    const labels = [...primary.matchAll(/label:\s*"([^"]+)"/g)].map((m) => m[1]);
    expect(labels).toEqual([
      "Dashboard",
      "Website Inquiries",
      "Live Chat",
      "Products",
      "Categories",
      "Media Library",
      "Website Content",
      "SEO / Search",
      "PDF Catalogues",
      "Website Visitors",
      "System Health",
    ]);
  });

  it("uses only website-operations keys in the mobile bottom nav", () => {
    const mobile = shell.slice(shell.indexOf("const MOBILE_NAV"), shell.indexOf("export function AdminShell"));
    const keys = [...mobile.matchAll(/PRIMARY_NAV\[(\d+)\]/g)].map((m) => Number(m[1]));
    expect(keys).toEqual([0, 1, 2, 3, 5]);
  });

  it("does not import or mount CRM, outreach, sales-pipeline or AI-business panels in Admin.tsx", () => {
    for (const panel of [
      "LeadsPanel",
      "MailingPanel",
      "AIAssistantPanel",
      "PIGeneratorPanel",
      "StudioPricingPanel",
      "SocialPanel",
      "SocialDevOpsPanel",
      "ExportDirectoryPanel",
      "MacroGatewayPanel",
      "OverviewPanel",
      "PlainOwnerMode",
      "PlainOwnerDashboard",
      "CommercialHubPanel",
      "SalesPipelinePanel",
      "WhatsAppInboxPanel",
      "LeadAcquisitionPanel",
      "BusinessRulesPanel",
    ]) {
      expect(admin).not.toContain(panel);
    }
  });

  it("routes only the eleven website-operations views from Admin.tsx", () => {
    for (const line of [
      'case "overview": return <WebsiteOperationsDashboard',
      'case "inquiries": return <WebsiteInquiriesPanel',
      'case "chat": return <LiveChatEntryPanel',
      'case "products": return <ProductsPanel',
      'case "media": return <MediaLibraryPanel',
      'case "categories": return <CategoriesPanel',
      'case "content": return <ContentCmsPanel',
      'case "seo": return <MultilingualSeoPanel',
      'case "catalogues": return <CatalogPanel',
      'case "traffic": return <TrafficPanel',
      'case "system":',
    ]) {
      expect(admin).toContain(line);
    }
  });

  it("mounts no CRM launchers in the admin runtime", () => {
    for (const removed of [
      "AdminOutreachCommandCenter",
      "AdminBuyerActionsLauncher",
    ]) {
      expect(runtime).not.toContain(`<${removed}`);
    }
  });

  it("beginner dashboard does not query CRM tables and never breaks on missing tables", () => {
    // Every count call is guarded by try/catch so any CRM/admin table failure
    // returns 0 instead of throwing.
    expect(dashboard).toContain("safeCountEq");
    expect(dashboard).toContain("safeCountGte");
    // The beginner dashboard reads only website-operations tables.
    const allowedTables = new Set([
      "inquiries",
      "catalogue_leads",
      "chat_messages",
      "products",
      "categories",
      "media_assets",
      "page_views",
    ]);
    const tables = [...dashboard.matchAll(/from\("([^"]+)"/g)].map((m) => m[1]);
    for (const t of tables) expect(allowedTables.has(t)).toBe(true);
    // No CRM lead / outreach / WhatsApp / social queries.
    for (const forbidden of [
      "b2b_leads",
      "lead_candidates",
      "crm_",
      "outreach_",
      "whatsapp_",
      "social_",
      "automation_",
    ]) {
      expect(dashboard).not.toContain(`from("${forbidden}`);
    }
  });

  it("website inquiries panel uses only inquiries and catalogue_leads and never auto-sends", () => {
    const panel = fs.readFileSync(path.resolve(process.cwd(), "src/components/admin/WebsiteInquiriesPanel.tsx"), "utf8");
    expect(panel).toContain('from("inquiries")');
    expect(panel).toContain('from("catalogue_leads")');
    // Contact links must be user-driven only.
    expect(panel).toContain("mailto:");
    expect(panel).toContain("wa.me/");
    // No automatic CRM/lead creation and no hard deletes.
    expect(panel).not.toContain(".insert(");
    expect(panel).not.toContain(".delete(");
    // No outbound mailing / WhatsApp API sends.
    expect(panel).not.toMatch(/functions\.invoke\(["'](?:outreach-|whatsapp-|social-)/);
  });
});
