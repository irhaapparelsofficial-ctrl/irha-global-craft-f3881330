import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const app = read("src/App.tsx");
const cart = read("src/lib/inquiryCart.ts");
const cartPage = read("src/pages/InquiryCart.tsx");
const uploader = read("src/components/SecureFileUpload.tsx");
const gateway = read("supabase/functions/public-lead-gateway/index.ts");
const migration = read("supabase/migrations/20260717234000_b2b_inquiry_cart_relational.sql");
const dispatcher = read("supabase/functions/notification-dispatcher/index.ts");
const german = read("src/pages/GermanBavarianWear.tsx");
const footer = read("src/components/layout/Footer.tsx");
const metaWebhook = read("supabase/functions/meta-webhook/index.ts");
const cloudflareWebhook = read("functions/api/v1/meta-webhook.js");
const sitemapRoutes = read("scripts/add-strategic-sitemap-routes.mjs");
const llms = read("public/llms.txt");

 describe("global B2B inquiry platform", () => {
  it("persists a multi-item inquiry cart and exposes a dedicated noindex RFQ page", () => {
    expect(cart).toContain('const CART_KEY = "irha_inquiry_cart_v1"');
    expect(cart).toContain("targetQuantity");
    expect(cart).toContain("sizeBreakdown");
    expect(cart).toContain("useSyncExternalStore");
    expect(app).toContain('path="/inquiry-cart"');
    expect(cartPage).toContain('path="/inquiry-cart"');
    expect(cartPage).toContain("noindex");
    expect(cartPage).toContain("Submit multi-item RFQ");
    expect(cartPage).toContain("Official business email");
  });

  it("limits private tech-pack uploads to the approved formats and 25 MB", () => {
    expect(uploader).toContain('new Set(["pdf", "ai", "eps", "zip", "png", "jpg", "jpeg"])');
    expect(uploader).toContain("25 * 1024 * 1024");
    expect(uploader).toContain('purpose?: "tech-pack" | "mockup"');
    expect(gateway).toContain('const TECH_PACK_BUCKET = "tech_packs"');
    expect(gateway).toContain("createSignedUploadUrl");
    expect(gateway).toContain("MAX_TECH_PACK_BYTES = 25 * 1024 * 1024");
  });

  it("uses a relational database model and corporate tracking IDs", () => {
    expect(migration).toContain("create table if not exists public.profiles");
    expect(migration).toContain("profile_id uuid references public.profiles");
    expect(migration).toContain("create table if not exists public.inquiry_items");
    expect(migration).toContain("inquiry_id uuid not null references public.inquiries");
    expect(migration).toContain("product_id uuid references public.products");
    expect(migration).toContain("create or replace function public.submit_b2b_inquiry");
    expect(migration).toContain("'IRHA-' || to_char(current_date, 'YYYY')");
    expect(migration).toContain("'tech_packs'");
  });

  it("queues detailed buyer and owner emails through the existing outbox", () => {
    expect(migration).toContain("inquiries_buyer_confirmation_outbox");
    expect(migration).toContain("notification_owner_email");
    expect(migration).toContain("irhaapparelsofficial@gmail.com");
    expect(dispatcher).toContain("Requirement summary");
    expect(dispatcher).toContain("Inquiry ID:");
    expect(dispatcher).toContain('Deno.env.get("RESEND_API_KEY")');
  });

  it("publishes canonical DACH discovery and trade-compliance information", () => {
    expect(app).toContain('path="/de/bavarian-wear"');
    expect(german).toContain('path="/de/bavarian-wear"');
    expect(german).toContain('locale="de-DE"');
    expect(german).toContain("https://irhaapparels.com");
    expect(sitemapRoutes).toContain("/de/bavarian-wear");
    expect(sitemapRoutes).not.toContain("lovable.app/");
    expect(footer).toContain("FOB Sialkot, CIF, EXW and DDP");
    expect(footer).toContain("Buyer data & GDPR");
    expect(llms).toContain("privately upload PDF, Adobe Illustrator, EPS, ZIP, PNG or JPG");
  });

  it("verifies Meta challenges and signatures before storing events", () => {
    expect(app).not.toContain("META_APP_SECRET");
    expect(metaWebhook).toContain('Deno.env.get("META_WEBHOOK_VERIFY_TOKEN")');
    expect(metaWebhook).toContain('Deno.env.get("META_APP_SECRET")');
    expect(metaWebhook).toContain('req.headers.get("x-hub-signature-256")');
    expect(metaWebhook).toContain("constantTimeEqual");
    expect(metaWebhook).toContain('.from("webhook_events").insert');
    expect(cloudflareWebhook).toContain("/functions/v1/meta-webhook");
    expect(cloudflareWebhook).toContain("Cache-Control");
  });
});
