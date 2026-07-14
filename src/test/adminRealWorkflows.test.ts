import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("real admin workflow contracts", () => {
  it("keeps PI and quotation work on the persistent Commercial Hub", () => {
    const pi = source("src/components/admin/PIGeneratorPanel.tsx");
    const hub = source("src/components/admin/CommercialHubPanel.tsx");

    expect(pi).toContain('CommercialHubPanel initialTab="quotations"');
    expect(pi).not.toContain("Date.now()");
    expect(pi).not.toContain("window.print");
    expect(hub).toContain('initialTab = "meetings"');
    expect(hub).toContain('initialTab?: CommercialHubTab');
    expect(hub).toContain("CommercialQuotationsPanel");
  });

  it("persists pricing briefs without inventing a price", () => {
    const pricing = source("src/components/admin/StudioPricingPanel.tsx");

    expect(pricing).toContain('.from("automation_tasks")');
    expect(pricing).toContain('action: "pricing_review"');
    expect(pricing).toContain('status: "ready_for_review"');
    expect(pricing).toContain("requires_approval: true");
    expect(pricing).toContain("external_action: false");
    expect(pricing).toContain('commercial_state: "unquoted"');
    expect(pricing).toContain('href="/studio"');
    expect(pricing).not.toContain("calculateFob");
    expect(pricing).not.toContain("window.alert");
    expect(pricing).not.toContain("High-Fidelity Mesh Render Node");
  });

  it("keeps the catalog release view read-only and truthful about PDF availability", () => {
    const catalog = source("src/components/admin/CatalogPanel.tsx");

    expect(catalog).toContain("Live Catalog Structure");
    expect(catalog).toContain("read-only release view");
    expect(catalog).toContain("Verified PDF links");
    expect(catalog).toContain("category.catalog_url");
    expect(catalog).not.toContain('.insert(');
    expect(catalog).not.toContain('.update(');
    expect(catalog).not.toContain('.delete(');
  });

  it("blocks social actions until the exact account is verified and enabled", () => {
    const social = source("src/components/admin/SocialDevOpsPanel.tsx");

    expect(social).toContain('.from("social_platform_accounts")');
    expect(social).toContain('account.verification_status === "verified"');
    expect(social).toContain("account.enabled");
    expect(social).toContain("account.external_account_id");
    expect(social).toContain("disabled={!ready || busy}");
    expect(social).toContain("selectedChannels.length === 0");
    expect(social).toContain('functions.invoke("social-multi-sync"');
  });

  it("retains real core admin CRUD and authenticated backend functions", () => {
    const products = source("src/components/admin/ProductsPanel.tsx");
    const categories = source("src/components/admin/CategoriesPanel.tsx");
    const leads = source("src/components/admin/LeadsPanel.tsx");
    const functions = source("supabase/config.toml");

    for (const action of [".insert(", ".update(", ".delete("]) {
      expect(products).toContain(action);
      expect(categories).toContain(action);
    }
    expect(leads).toContain('supabase.from("inquiries").update');
    expect(leads).toContain('supabase.from("catalogue_leads").update');
    expect(leads).toContain('supabase.from("b2b_leads").update');
    expect(leads).toContain('storage.from("inquiry-uploads").createSignedUrl');
    expect(functions).toMatch(/\[functions\.admin-agent\]\s+verify_jwt = true/);
    expect(functions).toMatch(/\[functions\.outreach-engine\]\s+verify_jwt = true/);
    expect(functions).toMatch(/\[functions\.social-multi-sync\]\s+verify_jwt = true/);
    expect(functions).toMatch(/\[functions\.whatsapp-admin\]\s+verify_jwt = true/);
  });
});
