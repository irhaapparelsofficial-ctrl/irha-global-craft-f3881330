import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const hero = read("src/components/HeroCarousel.tsx");
const heroMedia = read("src/lib/heroMedia.ts");
const home = read("src/pages/Home.tsx");
const navbar = read("src/components/layout/Navbar.tsx");
const layout = read("src/components/layout/Layout.tsx");
const guide = read("src/components/LiveChat.tsx");
const footer = read("src/components/layout/Footer.tsx");
const consent = read("src/components/CookieConsent.tsx");
const capabilities = read("src/components/sections/CapabilityStrip.tsx");
const categories = read("src/components/sections/HomeCategoryUniverse.tsx");
const processSource = read("src/components/sections/ProcessTimeline.tsx");
const manufacturing = read("src/components/sections/HomeManufacturingEditorial.tsx");
const decision = read("src/components/sections/BuyerDecisionSection.tsx");
const finalCta = read("src/components/sections/StartProgramCTA.tsx");
const sticky = read("src/components/sections/StickyMobileCTA.tsx");
const styles = read("src/index.css");
const brand = read("public/irha-brand-mark.svg");

describe("polished B2B homepage", () => {
  it("identifies the business, buyers and next actions immediately", () => {
    expect(hero).toContain("B2B Apparel Manufacturer for Brands &amp; Wholesalers");
    expect(hero).toContain("Sialkot · Made to order · B2B buyers");
    expect(hero).toContain("Request quote");
    expect(hero).toContain("View products");
    expect(hero).toContain("irha:open-human-chat");
  });

  it("presents clean product-first studio hero media with one LCP image", () => {
    for (const label of ["Bavarian &amp; Trachten", "Sportswear", "Leatherwear", "Streetwear", "Leisurewear"]) {
      expect(hero).toContain(label);
    }
    for (const slug of [
      "bavarian-trachten-wear",
      "sportswear",
      "premium-leather-apparel",
      "streetwear-activewear",
      "leisure-nightwear",
    ]) {
      expect(heroMedia).toContain(`\"${slug}\"`);
    }
    expect(hero).toContain("CATEGORY_HERO_MEDIA");
    expect(hero).toContain("SECONDARY_PROGRAMS.map");
    expect(hero).toContain("object-contain");
    expect(hero).toContain("bg-[#101722]");
    expect(hero.match(/loading=\"eager\"/g)).toHaveLength(1);
    expect(hero.match(/loading=\"lazy\"/g)).toHaveLength(1);
    expect(heroMedia).toContain("SITE_MEDIA_ROOT");
    expect(heroMedia).toContain("site-media");
    expect(heroMedia).not.toContain("@/assets/og/");
    expect(hero).not.toContain("SPORTS_PRODUCT_IMAGE");
    expect(hero).not.toContain("LEATHER_PRODUCT_IMAGE");
    expect(hero).not.toContain("BAVARIAN_PRODUCT_IMAGE");
  });

  it("keeps the homepage short and ordered around buyer tasks", () => {
    const expectedOrder = ["<HeroCarousel />", "<CapabilityStrip />", "<HomeCategoryUniverse />", "<HomeManufacturingEditorial />", "<ProcessTimeline />", "<BuyerDecisionSection />", "<StartProgramCTA />"];
    const positions = expectedOrder.map((marker) => home.indexOf(marker));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(home).not.toContain("HomeProductShowcase");
    expect(home).not.toContain("BuyerTrustSection");
  });

  it("uses compact swipeable mobile buyer sections without autoplay", () => {
    for (const source of [capabilities, categories, processSource]) {
      expect(source).toContain("snap-x");
      expect(source).toContain("overflow-x-auto");
      expect(source).not.toContain("setInterval");
    }
    expect(categories).toContain("Swipe to compare programs");
    expect(processSource).toContain("Swipe through the order process");
  });

  it("uses buyer language, clean stable category images and evidence-led proof", () => {
    expect(capabilities).toContain("OEM, ODM & Private Label");
    expect(capabilities).toContain("Sample Before Bulk");
    expect(categories).toContain("Choose the product line your business needs");
    expect(categories).toContain("CATEGORY_HERO_MEDIA");
    expect(categories).toContain("object-contain");
    expect(categories).not.toContain("@/assets/og/");
    expect(categories).not.toContain("usePublicCatalogTree");
    expect(categories).not.toContain("resolveAsset");
    expect(categories).not.toContain("featuredProductRank");
    expect(manufacturing).toContain("See what can be verified before bulk production");
    expect(manufacturing).toContain("Live factory view");
    expect(manufacturing).toContain("Website visuals are references");
    expect(decision).toContain("Requirement-based quotation");
    expect(decision).toContain("Approval before bulk");
    expect(decision).toContain("Factory verification");
  });

  it("uses one visible support entry with conversation-aware AI and human handover", () => {
    expect(layout).toContain("<LiveChat />");
    expect(layout).toContain("<HumanLiveChat />");
    expect(layout).not.toContain("FloatingActions");
    expect(guide).toContain("AI answers now · Human team one tap away");
    expect(guide).toContain("avoids repeating previous answers");
    expect(styles).toContain('button[aria-label="Open live chat with the Irha Apparels team"]');
    expect(styles).toContain('button[aria-label="Open Irha Live Support — AI guide and human team"]');
    expect(styles).toContain('section[data-chat-kind="human"]');
    expect(sticky).toContain("AI guide + human team");
  });

  it("keeps the final conversion path focused on quote or human sales review", () => {
    expect(finalCta).toContain("Chat with Irha team");
    expect(finalCta).toContain("Human sales review · no automatic pricing or commercial commitment");
    expect(finalCta).toContain("Requirement review");
    expect(finalCta).toContain("Commercial quotation");
    expect(finalCta).not.toContain("whatsappLink");
    expect(finalCta).not.toContain("MessageCircle");
  });

  it("uses the official crest and owner wording in header and footer", () => {
    expect(navbar).toContain('src="/favicon.svg"');
    expect(footer).toContain('src="/favicon.svg"');
    expect(navbar).toContain("Manufacturing Specialists");
    expect(footer).toContain("Manufacturing Specialists");
    expect(navbar).not.toContain("irha-logo.png.asset.json");
    expect(footer).not.toContain("irha-logo.png.asset.json");
    const normalizedBrand = brand.toUpperCase();
    expect(normalizedBrand).toContain("IRHA APPARELS");
    expect(normalizedBrand).toContain("MANUFACTURING SPECIALISTS");
  });

  it("keeps mobile consent compact, readable and clear of contact actions", () => {
    expect(consent).toContain("Optional cookies");
    expect(consent).toContain("Essential only");
    expect(consent).toContain("Accept optional");
    expect(consent).toContain("cookieConsentOpen");
    expect(consent).toContain("bg-black/95");
    expect(consent).toContain("text-white/70");
    expect(consent).not.toContain("bg-[#090909]/98");
    expect(consent).not.toContain("text-white/62");
    expect(consent).not.toContain("ShieldCheck");
    expect(sticky).toContain("sticky-mobile-cta");
    expect(styles).toContain('html[data-cookie-consent-open="true"] .sticky-mobile-cta');
  });

  it("keeps the mobile contact dock dark and readable over product media", () => {
    expect(sticky).toContain("bg-black/95");
    expect(sticky).toContain("text-white");
    expect(sticky).toContain("text-emerald-300");
    expect(sticky).not.toContain("bg-background/96");
    expect(sticky).not.toContain("border-gold/35");
  });

  it("provides direct home access on desktop and mobile", () => {
    for (const label of ["Home", "Products", "Manufacturing", "How it works", "Buyer trust"]) {
      expect(navbar).toContain(`label: \"${label}\"`);
    }
    expect(navbar).toContain('aria-label="Go to homepage"');
    expect(navbar).toContain('pathname !== "/"');
    expect(navbar).toContain("Request quote");
    expect(navbar).not.toContain("MockupRequestButton");
  });
});
