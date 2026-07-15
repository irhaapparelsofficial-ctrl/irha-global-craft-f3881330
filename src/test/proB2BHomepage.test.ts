import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const hero = read("src/components/HeroCarousel.tsx");
const home = read("src/pages/Home.tsx");
const capabilities = read("src/components/sections/CapabilityStrip.tsx");
const categories = read("src/components/sections/HomeCategoryUniverse.tsx");
const trust = read("src/components/sections/BuyerTrustSection.tsx");
const products = read("src/components/sections/HomeProductShowcase.tsx");
const styles = read("src/index.css");

describe("professional B2B homepage", () => {
  it("identifies the business and target buyers immediately", () => {
    expect(hero).toContain("B2B Apparel Manufacturing");
    expect(hero).toContain("Brands · Wholesalers · Importers");
    expect(hero).toContain("OEM, ODM and private-label production");
    expect(hero).toContain("Request a quote");
    expect(hero).toContain("Explore collections");
    expect(hero).toContain("irha:open-human-chat");
  });

  it("presents multiple manufacturing categories instead of a retail-only hero", () => {
    expect(hero).toContain("Bavarian &amp; Trachten Wear");
    expect(hero).toContain("Sportswear");
    expect(hero).toContain("Leather Apparel");
    expect(hero).not.toContain("usePublishedCmsDocument");
  });

  it("orders the page around trust, manufacturing and buyer decisions", () => {
    const expectedOrder = [
      "<HeroCarousel />",
      "<CapabilityStrip />",
      "<HomeCategoryUniverse />",
      "<HomeManufacturingEditorial />",
      "<ProcessTimeline />",
      "<BuyerTrustSection />",
      "<HomeProductShowcase />",
      "<StartProgramCTA />",
    ];
    const positions = expectedOrder.map((marker) => home.indexOf(marker));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it("uses buyer language and explicit manufacturing proof", () => {
    expect(capabilities).toContain("OEM, ODM & Private Label");
    expect(capabilities).toContain("Sample Before Bulk");
    expect(capabilities).toContain("Custom Branding");
    expect(categories).toContain("Choose the product line you want manufactured");
    expect(trust).toContain("Verify the program before you commit to bulk production");
    expect(trust).toContain("Factory verification");
  });

  it("uses a stable product reference grid rather than a retail autoplay carousel", () => {
    expect(products).toContain("Selected product references");
    expect(products).toContain("grid-cols-[40%_60%]");
    expect(products).not.toContain("setInterval");
    expect(products).not.toContain('aria-roledescription="carousel"');
    expect(products).not.toContain("AUTOPLAY_MS");
  });

  it("keeps the official brand mark readable on mobile", () => {
    expect(styles).toContain('header a[aria-label$="— home"] img');
    expect(styles).toContain("height: 2.75rem");
    expect(styles).toContain("height: 3.5rem");
  });
});
