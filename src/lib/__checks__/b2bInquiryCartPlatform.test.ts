import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

const app = read("src/App.tsx");
const cartStore = read("src/lib/inquiryCart.ts");
const cartPage = read("src/pages/InquiryCart.tsx");
const upload = read("src/components/SecureFileUpload.tsx");
const gatewayClient = read("src/lib/publicLeadGateway.ts");
const gateway = read("supabase/functions/public-lead-gateway/index.ts");
const migration = read("supabase/migrations/20260717234000_b2b_inquiry_cart_relational.sql");
const manifest = read("supabase/repository-migrations.json");
const notificationDispatcher = read("supabase/functions/notification-dispatcher/index.ts");
const productDetail = read("src/pages/ProductDetail.tsx");
const allProducts = read("src/pages/AllProductsPage.tsx");
const taxonomy = read("src/pages/CategoryTaxonomyPage.tsx");
const germanPage = read("src/pages/GermanBavarianWear.tsx");
const footer = read("src/components/layout/Footer.tsx");
const factory = read("src/components/sections/FactoryInfrastructure.tsx");
const metaWebhook = read("functions/api/v1/meta-webhook.js");
const robots = read("public/robots.txt");
const llms = read("public/llms.txt");
const seo = read("src/components/SEO.tsx");
const sitemap = read("scripts/generate-sitemap.ts");

describe("global B2B inquiry cart platform", () => {
  it("routes buyers into one persistent multi-item RFQ", () => {
    expect(app).toContain('path="/inquiry-cart"');
    expect(app).toContain('path="/shortlist" element={<Navigate to="/inquiry-cart" replace />}');
    expect(cartStore).toContain('const CART_KEY = "irha_inquiry_cart_v1"');
    expect(cartStore).toContain("targetQuantity");
    expect(cartStore).toContain("sizeBreakdown");
    expect(cartStore).toContain("MAX_ITEMS = 50");
    expect(cartPage).toContain("Official business email *");
    expect(cartPage).toContain("Submit multi-item RFQ");
    expect(cartPage).toContain('purpose="tech-pack"');
  });

  it("makes product sourcing surfaces inquiry-cart native", () => {
    for (const source of [productDetail, allProducts, taxonomy]) {
      expect(source).toContain("Add to Inquiry");
      expect(source).toContain("useInquiryCart");
    }
    expect(productDetail).toContain("Wholesale Manufacturer | Sialkot Garment Factory");
    expect(productDetail).toContain("custom wholesale manufacturer in Sialkot");
    expect(allProducts).toContain("wholesale manufacturer product style");
    expect(taxonomy).toContain("wholesale manufacturing collection");
  });

  it("accepts only approved private tech-pack formats up to 25 MB", () => {
    expect(upload).toContain('new Set(["pdf", "ai", "eps", "zip", "png", "jpg", "jpeg"])');
    expect(upload).toContain("25 * 1024 * 1024");
    expect(upload).toContain("PDF, AI, EPS, ZIP, PNG, JPG");
    expect(gatewayClient).toContain('purpose: "inquiry" | "tech-pack" | "mockup"');
    expect(gateway).toContain('const TECH_PACK_BUCKET = "tech_packs"');
    expect(gateway).toContain("MAX_TECH_PACK_BYTES = 25 * 1024 * 1024");
    expect(gateway).toContain("createSignedUploadUrl");
    expect(gateway).not.toContain('.from("tech_packs").upload(');
  });

  it("uses a relational and admin-protected inquiry schema", () => {
    expect(migration).toContain("create table if not exists public.profiles");
    expect(migration).toContain("create table if not exists public.inquiry_items");
    expect(migration).toContain("profile_id uuid references public.profiles(id)");
    expect(migration).toContain("inquiry_id uuid not null references public.inquiries(id) on delete cascade");
    expect(migration).toContain("product_id uuid references public.products(id) on delete set null");
    expect(migration).toContain("alter table public.profiles enable row level security");
    expect(migration).toContain("alter table public.inquiry_items enable row level security");
    expect(migration).toContain("create or replace function public.submit_b2b_inquiry(_payload jsonb)");
    expect(gateway).toContain('service.rpc("submit_b2b_inquiry"');
  });

  it("generates corporate references and registers the exact migration checksum", () => {
    expect(migration).toContain("'IRHA-' || to_char(current_date, 'YYYY')");
    expect(gatewayClient).toContain("/^IRHA-[0-9]{4}-[0-9]{6}$/");
    expect(manifest).toContain('"version":"20260717234000"');
    expect(manifest).toContain('"git_blob_sha":"da81fe8ab5ebdc3a74d23dda04fd556bd3ef89e6"');
  });

  it("queues detailed buyer confirmation and immediate owner notification", () => {
    expect(migration).toContain("inquiries_buyer_confirmation_outbox");
    expect(migration).toContain("irhaapparelsofficial@gmail.com");
    expect(migration).toContain("'items', _items");
    expect(notificationDispatcher).toContain('template === "buyer_confirmation"');
    expect(notificationDispatcher).toContain("RFQ summary");
    expect(notificationDispatcher).toContain("Size breakdown");
    expect(notificationDispatcher).toContain("https://api.resend.com/emails");
  });

  it("publishes a German DACH sourcing route and global trade compliance", () => {
    expect(app).toContain('path="/de/bavarian-wear"');
    expect(germanPage).toContain('locale="de-DE"');
    expect(germanPage).toContain("Trachten & Lederhosen Hersteller für Großhandel");
    for (const term of ["FOB Sialkot", "CIF", "EXW", "DDP"]) expect(footer).toContain(term);
    expect(footer).toContain("Data privacy & GDPR");
    expect(footer).toContain("private tech packs");
  });

  it("adds evidence-led factory infrastructure without an unsupported blanket capacity claim", () => {
    expect(factory).toContain("Factory infrastructure & capacity");
    expect(factory).toContain("<video");
    expect(factory).toContain("factory-floor-walkthrough.webm");
    expect(factory).toContain("does not publish an unsupported blanket capacity figure");
    expect(factory).not.toContain("50,000+ Pcs/Month");
  });

  it("provides a signed and size-limited Meta webhook receiver", () => {
    expect(metaWebhook).toContain("META_WEBHOOK_VERIFY_TOKEN");
    expect(metaWebhook).toContain("META_APP_SECRET");
    expect(metaWebhook).toContain('request.headers.get("x-hub-signature-256")');
    expect(metaWebhook).toContain('name: "HMAC", hash: "SHA-256"');
    expect(metaWebhook).toContain("MAX_BODY_BYTES");
    expect(metaWebhook).toContain("webhook_events");
  });

  it("keeps canonical authority on the apex domain and private review routes out of search", () => {
    expect(seo).toContain("SITE_URL");
    expect(sitemap).toContain('const BASE_URL = "https://irhaapparels.com"');
    expect(gateway).toContain('url.hostname === "irhaapparels.com" || url.hostname === "www.irhaapparels.com"');
    expect(robots).toContain("Disallow: /inquiry-cart");
    expect(robots).toContain("Disallow: /admin");
    expect(llms).toContain("multi-item RFQ");
    expect(llms).toContain("https://irhaapparels.com/de/bavarian-wear");
  });
});
