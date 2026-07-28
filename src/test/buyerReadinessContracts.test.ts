import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("B2B buyer-readiness contracts", () => {
  it("keeps concept media out of factory-proof surfaces", () => {
    const paths = [
      "src/pages/About.tsx",
      "src/pages/Manufacturing.tsx",
      "src/pages/BuyerTrust.tsx",
      "src/pages/FactoryVideoCall.tsx",
      "src/components/sections/HomeManufacturingEditorial.tsx",
      "src/components/sections/FactoryInfrastructure.tsx",
    ];
    for (const path of paths) {
      const source = read(path);
      expect(source).not.toMatch(/factoryCinematic|manufacturingImg|HeroMediaSlideshow/);
      expect(source).not.toMatch(/newly built|website is new/i);
    }
  });

  it("keeps website-age wording out of public, buyer and outreach copy", () => {
    const paths = [
      "public/llms.txt",
      "public/llms-full.txt",
      "functions/mcp.js",
      "functions/_middleware.js",
      "public/agent-webmcp.js",
      "public/skills/buyer-inquiry/SKILL.md",
      "src/lib/defaultFaqs.ts",
      "src/components/admin/ListingLaunchKit.tsx",
      "src/lib/buyerReplyDrafts.ts",
      "src/pages/Markets.tsx",
      "src/lib/outreachAutomation.ts",
      "src/lib/buyerJourneyLocaleCopy.ts",
      "docs/AI_OUTREACH_ENGINE.md",
      "docs/BUSINESS_RULES_MASTER.md",
      "docs/SOCIAL_CONTENT_CALENDAR.md",
      "docs/MULTILINGUAL_SEO_ENGINE.md",
      "docs/SOCIAL_AUTOPILOT_APPROVAL_QUEUE_V2.md",
      "docs/AI_COMMAND_CENTER.md",
    ];
    for (const path of paths) {
      expect(read(path)).not.toMatch(/newly built|website (?:itself )?is new|new(?:ly)? (?:website|site)/i);
    }
  });

  it("prefills a product RFQ with a code and requires consent", () => {
    const product = read("src/pages/CanonicalProductDetail.tsx");
    const inquiry = read("src/pages/InquiryBase.tsx");
    const transport = read("src/lib/inquiryTransportFetch.ts");
    expect(product).toContain('quoteParams.set("code", product.sku)');
    expect(product).toContain("Request quote for");
    expect(inquiry).toContain("product_code: ctx.productCode");
    expect(inquiry).toContain("Consent is required before submission");
    expect(transport).toContain("consent: isRecord(leadContext.consent)");
  });

  it("validates private uploads and keeps them actionable for admins", () => {
    const gateway = read("supabase/functions/public-lead-gateway/index.ts");
    const admin = read("src/components/admin/WebsiteInquiriesPanel.tsx");
    const migration = read("supabase/migrations/20260728123000_admin_read_private_b2b_tech_packs.sql");
    expect(gateway).toContain("uploadedFilesExist");
    expect(gateway).not.toContain("delete relationalPayload.inquiry_ref");
    expect(gateway).toContain('error.code === "23505"');
    expect(gateway).toContain("Consent is required before submission");
    expect(admin).toContain("inquiry_ref, intent, lead_context, tech_pack_paths");
    expect(admin).toContain("createSignedUrl(file.path, 120)");
    expect(migration).toContain("public.has_role((select auth.uid()), 'admin'::public.app_role)");
  });

  it("labels catalogue media and routes all-product cards to canonical products", () => {
    const product = read("src/pages/CanonicalProductDetail.tsx");
    const allProducts = read("src/pages/AllProductsPage.tsx");
    const shells = read("scripts/generate-static-route-shells.ts");
    const imageFinalizer = read("scripts/finalize-image-seo.mjs");
    expect(product).toMatch(/Digital catalogue references show design direction/);
    expect(allProducts).toContain("publishedRoute?.canonicalPath");
    expect(shells).toContain("digital reference gallery");
    expect(shells).toContain("code: product.reference_code");
    expect(imageFinalizer).toContain("Digital catalogue reference for");
    expect(imageFinalizer).not.toContain("Front view of");
  });
});
