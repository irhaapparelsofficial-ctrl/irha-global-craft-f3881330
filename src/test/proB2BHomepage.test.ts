import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const hero = read("src/components/HeroCarousel.tsx");
const home = read("src/pages/Home.tsx");
const navbar = read("src/components/layout/Navbar.tsx");
const footer = read("src/components/layout/Footer.tsx");
const consent = read("src/components/CookieConsent.tsx");
const capabilities = read("src/components/sections/CapabilityStrip.tsx");
const categories = read("src/components/sections/HomeCategoryUniverse.tsx");
const processSource = read("src/components/sections/ProcessTimeline.tsx");
const manufacturing = read("src/components/sections/HomeManufacturingEditorial.tsx");
const decision = read("src/components/sections/BuyerDecisionSection.tsx");
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

  it("presents multiple reliable manufacturing visuals with one LCP image", () => {
    expect(hero).toContain("Bavarian &amp; Trachten");
    expect(hero).toContain("Sportswear");
    expect(hero).toContain("Leatherwear");
    expect(hero.match(/loading=\"eager\"/g)).toHaveLength(1);
    expect(hero.match(/loading=\"lazy\"/g)).toHaveLength(2);
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

  it("uses buyer language, stable category images and clear proof", () => {
    expect(capabilities).toContain("OEM, ODM & Private Label");
    expect(capabilities).toContain("Sample Before Bulk");
    expect(categories).toContain("Choose the product line your business needs");
    expect(categories).not.toContain("usePublicCatalogTree");
    expect(categories).not.toContain("resolveAsset");
    expect(categories).not.toContain("featuredProductRank");
    expect(manufacturing).toContain("Review the process behind the product");
    expect(decision).toContain("Requirement-based quotation");
    expect(decision).toContain("Approval before bulk");
    expect(decision).toContain("Factory verification");
  });

  it("uses a reliable local brand mark in header and footer", () => {
    expect(navbar).toContain('src="/irha-brand-mark.svg"');
    expect(footer).toContain('src="/irha-brand-mark.svg"');
    expect(navbar).not.toContain("irha-logo.png.asset.json");
    expect(footer).not.toContain("irha-logo.png.asset.json");
    expect(brand).toContain("IRHA APPARELS");
    expect(brand).toContain("MANUFACTURING SPECIALISTS");
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

  it("uses a simple B2B primary navigation", () => {
    for (const label of ["Products", "Manufacturing", "How it works", "Buyer trust"]) expect(navbar).toContain(`label: \"${label}\"`);
    expect(navbar).toContain("Request quote");
    expect(navbar).not.toContain("MockupRequestButton");
  });
});
