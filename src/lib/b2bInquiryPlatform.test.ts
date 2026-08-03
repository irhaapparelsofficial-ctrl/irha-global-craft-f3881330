import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("B2B inquiry platform contracts", () => {
  it("keeps the multi-item cart and German buyer route registered", () => {
    const app = source("src/App.tsx");
    const cart = source("src/lib/inquiryCart.ts");
    const checkout = source("src/pages/InquiryCart.tsx");

    expect(app).toContain('path="/inquiry-cart"');
    expect(app).toContain('path="/de/bavarian-wear"');
    expect(app).toContain('<Navigate to="/inquiry-cart" replace />');
    expect(cart).toContain("irha_inquiry_cart_v1");
    expect(checkout).toContain("target_quantity");
    expect(checkout).toContain("size_breakdown");
    expect(checkout).toContain("Official business email");
  });

  it("keeps tech packs private, signed and capped at 25 MB", () => {
    const migration = source("supabase/migrations/20260717140000_b2b_inquiry_cart_relational.sql");
    const gateway = source("supabase/functions/public-lead-gateway/index.ts");
    const uploader = source("src/components/SecureFileUpload.tsx");

    expect(migration).toContain("'tech_packs'");
    expect(migration).toContain("26214400");
    expect(migration).toContain("false,");
    expect(gateway).toContain("createSignedUploadUrl");
    expect(gateway).toContain("MAX_TECH_PACK_BYTES = 25 * 1024 * 1024");
    expect(uploader).toContain('new Set(["pdf", "ai", "eps", "zip", "png", "jpg", "jpeg"])');
  });

  it("keeps the relational RFQ schema and corporate tracking format", () => {
    const migration = source("supabase/migrations/20260717140000_b2b_inquiry_cart_relational.sql");

    expect(migration).toContain("create table if not exists public.profiles");
    expect(migration).toContain("create table if not exists public.inquiry_items");
    expect(migration).toContain("references public.inquiries(id) on delete cascade");
    expect(migration).toContain("references public.products(id) on delete set null");
    expect(migration).toContain("'IRHA-' || to_char(current_date, 'YYYY')");
    expect(migration).toContain("submit_b2b_inquiry");
  });

  it("forces canonical SEO to the apex domain and protects private routes", () => {
    const seo = source("src/components/SEO.tsx");
    const robots = source("public/robots.txt");
    const sitemap = source("functions/sitemap.xml.js");
    const llms = source("public/llms.txt");

    expect(seo).toContain("return `${SITE_URL}${pathname}${parsed.search}`");
    expect(robots).toContain("Disallow: /admin");
    expect(robots).toContain("Disallow: /api/");
    expect(sitemap).toContain("fetchPublishedCatalogue");
    expect(sitemap).toContain("/rest/v1/rpc/get_public_sitemap_entries");
    expect(sitemap).not.toContain("category:categories!inner");
    expect(llms).toContain("https://irhaapparels.com/de/bavarian-wear");
  });

  it("requires Meta HMAC verification before recording events", () => {
    const webhook = source("supabase/functions/meta-webhook/index.ts");
    const route = source("functions/api/v1/meta-webhook.js");

    expect(webhook).toContain('x-hub-signature-256');
    expect(webhook).toContain('Deno.env.get("META_APP_SECRET")');
    expect(webhook).toContain('signature_valid: true');
    expect(route).toContain("/functions/v1/meta-webhook");
  });
});