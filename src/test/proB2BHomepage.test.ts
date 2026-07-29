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
    expect(hero).toContain("Irha Apparels — Custom Apparel Manufacturer for Global B2B Buyers");
    expect(home).toContain("Irha Apparels | B2B Apparel Manufacturer in Sialkot, Pakistan");
    expect(hero).toContain("Sialkot · Made to order · B2B buyers");
    expect(hero).toContain("Request quote");
    expect(hero).toContain("View products");
    expect(hero).toContain("irha:open-human-chat");
  });

  it("presents clean product-first studio hero media with one LCP image", () => {
    for (const label of ["Bavarian &amp; Trachten", "Sportswear", "Leatherwear", "Streetwear", "Leisurewear"]) expect(hero).toContain(label);
    for (const slug of ["bavarian-trachten-wear", "sportswear", "premium-leather-apparel", "streetwear-activewear", "leisure-nightwear"]) expect(heroMedia).toContain(`"${slug}"`);
    expect(hero).toContain("CATEGORY_HERO_MEDIA");
    expect(hero).toContain("SECONDARY_PROGRAMS.map");
    expect(hero).toContain("object-contain");
    expect(hero).toContain("bg-[#101722]");
    expect(hero.match(/loading="eager"/g)).toHaveLength(1);
    expect(hero.match(/loading="lazy"/g)).toHaveLength(1);
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

  it("keeps compact mobile sections while rendering product categories as a stable grid", () => {
    for (const source of [capabilities, processSource]) {
      expect(source).toContain("snap-x");
      expect(source).toContain("overflow-x-auto");
      expect(source).not.toContain("setInterval");
    }
    expect(categories).toContain("grid grid-cols-1 gap-4");
    expect(categories).toContain("min-[520px]:grid-cols-2");
    expect(categories).toContain("lg:grid-cols-3");
    expect(categories).not.toContain("snap-x");
    expect(categories).not.toContain("overflow-x-auto");
    expect(categories).not.toContain("setInterval");
    expect(processSource).toContain("Swipe through the order process");
  });

  it("uses buyer language, stable category images and evidence-led proof", () => {
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
    expect(decision).toContain("Clear answers before you move forward.");
    expect(decision).toContain("Buyer trust center");
    expect(finalCta).toContain("Send the product brief and receive a scoped manufacturing response.");
  });

  it("keeps mobile navigation and buyer help clear", () => {
    expect(navbar).toContain('aria-label="Mobile navigation"');
    expect(navbar).toContain('label: "Products"');
    expect(navbar).toContain("Factory call");
    expect(navbar).toContain("Request a quote");
    expect(layout).toContain("StickyMobileCTA");
    expect(sticky).toContain("Live support");
    expect(sticky).toContain("AI guide + human team");
    expect(sticky).toContain("Request quote");
    expect(guide).toContain("Irha Live Support");
    expect(guide).toContain("AI Guide");
    expect(guide).toContain("Human Team");
    expect(guide).toContain('aria-label="Message Irha AI Guide"');
  });

  it("keeps visible policy, company and consent controls", () => {
    expect(footer).toContain("Privacy / GDPR");
    expect(footer).toContain("Terms");
    expect(footer).toContain("Cookie settings");
    expect(consent).toContain("Optional cookies");
    expect(consent).toContain("Essential only");
    expect(consent).toContain("Accept optional");
    expect(consent).toContain("Settings");
    expect(brand).toContain("Irha Apparels");
    expect(brand).toContain("B2B CUSTOM MANUFACTURING");
    expect(styles).toContain(".font-display");
    expect(styles).toContain("'Playfair Display', Georgia, serif");
  });
});
