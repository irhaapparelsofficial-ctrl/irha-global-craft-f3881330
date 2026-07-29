import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BUYER_INFORMATION_COPY,
  CAPABILITY_REGISTER,
  MATERIAL_DISCLAIMER,
  MATERIAL_FAMILIES,
  MATERIAL_PAGE_COPY,
  MATERIALS,
  ROUTES,
  materialDetail,
} from "@/data/buyerCapabilities";
import { getEquivalentRoutes, getLanguageDestination, getRouteLocale } from "@/lib/i18nFoundation";

const locales = ["en", "de", "fr", "nl"] as const;
const appSource = readFileSync(resolve("src/App.tsx"), "utf8");
const pageSource = readFileSync(resolve("src/pages/BuyerConfidence.tsx"), "utf8");
const navSource = readFileSync(resolve("src/components/layout/Navbar.tsx"), "utf8");
const privacySource = readFileSync(resolve("src/pages/PrivacyPolicy.tsx"), "utf8");
const publicCopy = JSON.stringify({
  buyer: BUYER_INFORMATION_COPY,
  material: MATERIAL_PAGE_COPY,
  disclaimer: MATERIAL_DISCLAIMER,
  materials: MATERIALS,
});

describe("IA-B2B-E002 buyer-confidence information", () => {
  it("publishes one English Fabric and Material Library route", () => {
    expect(ROUTES.materials.en).toBe("/materials");
    expect(appSource).toContain('<Route path="/materials" element={<BuyerConfidence />} />');
  });

  it("publishes one English buyer-information route", () => {
    expect(ROUTES.buyerInformation.en).toBe("/buyer-information");
    expect(appSource).toContain('<Route path="/buyer-information" element={<BuyerConfidence />} />');
  });

  it("publishes exact German, French and Dutch material routes", () => {
    expect(ROUTES.materials).toEqual({ en: "/materials", de: "/de/materialien", fr: "/fr/matieres", nl: "/nl/materialen" });
    for (const locale of locales.slice(1)) expect(appSource).toContain(`path="${ROUTES.materials[locale]}"`);
  });

  it("publishes exact German, French and Dutch buyer-information routes", () => {
    expect(ROUTES.buyerInformation).toEqual({ en: "/buyer-information", de: "/de/einkaeufer-informationen", fr: "/fr/informations-acheteurs", nl: "/nl/kopersinformatie" });
    for (const locale of locales.slice(1)) expect(appSource).toContain(`path="${ROUTES.buyerInformation[locale]}"`);
  });

  it("maps all four material pages as genuine equivalents", () => {
    expect(getEquivalentRoutes("/materials").map((route) => route.path)).toEqual(Object.values(ROUTES.materials));
  });

  it("maps all four buyer-information pages as genuine equivalents", () => {
    expect(getEquivalentRoutes("/buyer-information").map((route) => route.path)).toEqual(Object.values(ROUTES.buyerInformation));
  });

  it("sends language-selector changes to the exact corresponding page", () => {
    expect(getLanguageDestination("/fr/matieres", "nl")).toBe("/nl/materialen");
    expect(getLanguageDestination("/de/einkaeufer-informationen", "en")).toBe("/buyer-information");
  });

  it("resolves each localized route to its declared locale", () => {
    for (const locale of locales) {
      expect(getRouteLocale(ROUTES.materials[locale])).toBe(locale);
      expect(getRouteLocale(ROUTES.buyerInformation[locale])).toBe(locale);
    }
  });

  it("exposes the two information layers in desktop and mobile navigation", () => {
    expect(navSource).toContain('{ label: "Materials", href: "/materials" }');
    expect(navSource).toContain('{ label: "Buyer information", href: "/buyer-information" }');
    expect(navSource).toContain("CORE_NAV.map");
  });

  it("keeps navigation controls at least 44 pixels high", () => {
    expect(navSource).toMatch(/min-h-11|min-h-12|min-h-14/);
    expect(pageSource).toContain("min-h-11");
    expect(pageSource).toContain("min-h-12");
  });

  it("publishes four required material families", () => {
    expect(MATERIAL_FAMILIES.map((family) => family.id)).toEqual(["cotton-jersey", "fleece", "performance", "leather-suede"]);
  });

  it("publishes 21 structured material entries", () => {
    expect(MATERIALS).toHaveLength(21);
  });

  it("uses unique stable material identifiers", () => {
    expect(new Set(MATERIALS.map((material) => material.id)).size).toBe(MATERIALS.length);
  });

  it("gives every material a composition and indicative weight", () => {
    for (const material of MATERIALS) {
      expect(material.composition.trim().length).toBeGreaterThan(4);
      expect(material.weight.trim().length).toBeGreaterThan(4);
    }
  });

  it("gives every material structure, finish, use, decoration and sourcing guidance", () => {
    for (const material of MATERIALS) {
      const detail = materialDetail(material, "en");
      expect(detail.structure).toBeTruthy();
      expect(detail.finishes.length).toBeGreaterThan(0);
      expect(detail.uses.length).toBeGreaterThan(0);
      expect(detail.customization.length).toBeGreaterThan(0);
      expect(detail.sourcing).toBeTruthy();
    }
  });

  it("labels all material ranges as indicative rather than guaranteed", () => {
    for (const locale of locales) expect(MATERIAL_DISCLAIMER[locale].toLowerCase()).toMatch(/not guaranteed|keine garantierten|non des spécifications finales garanties|geen gegarandeerde/);
  });

  it("requires final composition, weight, colour and finish confirmation", () => {
    const disclaimer = MATERIAL_DISCLAIMER.en.toLowerCase();
    for (const term of ["composition", "gsm", "colour", "finish", "sampling", "quotation"]) expect(disclaimer).toContain(term);
  });

  it("does not present universal material availability", () => {
    expect(MATERIAL_DISCLAIMER.en).toContain("availability");
    expect(publicCopy.toLowerCase()).not.toContain("always available");
    expect(publicCopy.toLowerCase()).not.toContain("available in every colour");
  });

  it("explains GSM without equating weight with quality", () => {
    expect(MATERIAL_PAGE_COPY.en.gsmBody).toContain("grams per square metre");
    expect(MATERIAL_PAGE_COPY.en.gsmBody).toContain("does not alone determine quality");
  });

  it("allows a buyer to proceed without knowing the material", () => {
    expect(MATERIAL_PAGE_COPY.en.unsureTitle).toContain("Not sure");
    expect(MATERIAL_PAGE_COPY.en.unsureBody).toContain("target product");
    expect(pageSource).toContain('/inquiry?intent=rfq&category=materials');
  });

  it("integrates material references into the existing RFQ and sample journey", () => {
    expect(pageSource).toContain("Material reference:");
    expect(pageSource).toContain("intent=rfq&category=materials&name=");
    expect(pageSource).toContain("intent=sample&category=materials&name=");
  });

  it("explains EXW, FOB and CIF responsibilities", () => {
    const terms = BUYER_INFORMATION_COPY.en.sections.logistics.terms;
    expect(terms.map(([term]) => term)).toEqual(["EXW", "FOB", "CIF", "DDP"]);
    expect(terms.find(([term]) => term === "EXW")?.[1]).toContain("buyer arranges collection");
    expect(terms.find(([term]) => term === "FOB")?.[1]).toContain("agreed Pakistani port");
    expect(terms.find(([term]) => term === "CIF")?.[1]).toContain("named destination port");
  });

  it("qualifies DDP by destination and shipment profile", () => {
    const ddp = BUYER_INFORMATION_COPY.en.sections.logistics.terms.find(([term]) => term === "DDP")?.[1] ?? "";
    expect(ddp).toContain("may be evaluated");
    expect(ddp).toContain("selected destinations");
    expect(ddp).not.toContain("all destinations");
  });

  it("does not promise a fixed courier or publish courier logos", () => {
    const logistics = JSON.stringify(BUYER_INFORMATION_COPY.en.sections.logistics);
    expect(logistics).toContain("appropriate international courier");
    for (const carrier of ["DHL", "FedEx", "UPS", "Maersk"]) {
      expect(pageSource).not.toContain(carrier);
      expect(logistics).not.toContain(carrier);
    }
  });

  it("uses qualified Pakistani routing and Karachi wording", () => {
    const modes = BUYER_INFORMATION_COPY.en.sections.logistics.modes.join(" ");
    expect(modes).toContain("suitable Pakistani airports, dry ports or seaports");
    expect(modes).toContain("Karachi routing may be used for applicable sea shipments");
  });

  it("separates sample, production and shipping timelines", () => {
    expect(BUYER_INFORMATION_COPY.en.sections.logistics.timelines).toEqual(["Sample development", "Sample transit", "Bulk production", "Freight and customs transit"]);
  });

  it("rejects a universal guaranteed delivery time", () => {
    const note = BUYER_INFORMATION_COPY.en.sections.logistics.timelineNote;
    expect(note).toContain("estimate");
    expect(note).toContain("No single universal delivery time applies");
    expect(publicCopy.toLowerCase()).not.toContain("guaranteed delivery");
  });

  it("covers tech packs, artwork, patterns, measurements, branding and packaging", () => {
    const confidentiality = BUYER_INFORMATION_COPY.en.sections.confidentiality.points.join(" ").toLowerCase();
    for (const term of ["tech packs", "artwork", "measurements", "patterns", "branding", "packaging"]) expect(confidentiality).toContain(term);
  });

  it("states that private designs are not intended for public catalogue use without permission", () => {
    expect(BUYER_INFORMATION_COPY.en.sections.confidentiality.points.join(" ")).toContain("not intended for public catalogue use without permission");
  });

  it("provides an NDA-before-sharing CTA without absolute legal promises", () => {
    expect(BUYER_INFORMATION_COPY.en.sections.confidentiality.cta).toBe("Request an NDA before sharing sensitive files");
    const text = JSON.stringify(BUYER_INFORMATION_COPY.en.sections.confidentiality).toLowerCase();
    expect(text).toContain("must be agreed in writing");
    expect(text).not.toContain("zero risk");
    expect(text).not.toContain("guaranteed confidentiality");
  });

  it("links confidentiality wording to the published privacy policy", () => {
    expect(pageSource).toContain('to="/privacy-policy"');
    expect(BUYER_INFORMATION_COPY.en.sections.confidentiality.points.join(" ")).toContain("published privacy policy");
    expect(privacySource).toContain("Do not upload confidential or restricted material unless you are authorized to share it");
  });

  it("presents organic cotton as sourcing and documentation dependent", () => {
    const sustainability = BUYER_INFORMATION_COPY.en.sections.sustainability.points.join(" ");
    expect(sustainability).toContain("Organic cotton may be sourced");
    expect(sustainability).toContain("subject to availability, minimums and applicable documentation");
  });

  it("presents recycled polyester and packaging as order discussions", () => {
    const sustainability = BUYER_INFORMATION_COPY.en.sections.sustainability.points.join(" ");
    expect(sustainability).toContain("Recycled polyester");
    expect(sustainability).toContain("Recycled, reduced-plastic or simplified packaging can be discussed");
  });

  it("contains no prohibited blanket sustainability claim", () => {
    const text = JSON.stringify(BUYER_INFORMATION_COPY.en.sections.sustainability).toLowerCase();
    for (const phrase of ["fully sustainable", "zero waste", "carbon neutral", "ethical certified", "organic certified", "recycled certified"]) expect(text).not.toContain(phrase);
  });

  it("publishes a factual Sialkot private-label OEM ODM company story", () => {
    const story = BUYER_INFORMATION_COPY.en.sections.story.paragraphs.join(" ");
    expect(story).toContain("Sialkot, Pakistan");
    expect(BUYER_INFORMATION_COPY.en.intro).toContain("private-label, OEM and ODM");
    expect(story).toContain("product development");
  });

  it("keeps the live factory call appointment-based and privacy-aware", () => {
    const story = BUYER_INFORMATION_COPY.en.sections.story.paragraphs.join(" ");
    expect(story).toContain("schedule a live factory and workmanship video call");
    expect(story).toContain("without exposing another customer’s confidential information");
  });

  it("does not invent founding year, employee, capacity or export figures", () => {
    const story = BUYER_INFORMATION_COPY.en.sections.story.paragraphs.join(" ");
    expect(story).not.toMatch(/\b(19|20)\d{2}\b/);
    expect(story.toLowerCase()).not.toMatch(/employees|workers|pieces per month|annual capacity|export volume|square (feet|metres|meters)/);
  });

  it("names requested compliance standards only as buyer requirements", () => {
    const compliance = BUYER_INFORMATION_COPY.en.sections.compliance.points.join(" ");
    for (const standard of ["ISO", "OEKO-TEX", "SEDEX", "WRAP", "BSCI", "GOTS", "GRS"]) expect(compliance).toContain(standard);
    expect(compliance).toContain("Their mention is not a claim that Irha Apparels currently holds them");
  });

  it("requires valid applicable evidence before a certificate is shared", () => {
    expect(BUYER_INFORMATION_COPY.en.sections.compliance.points.join(" ")).toContain("only when it is valid, applicable to the specific order and authorised for that use");
  });

  it("does not publish unverified certificate logos", () => {
    for (const token of ["iso-logo", "oeko-logo", "sedex-logo", "wrap-logo", "bsci-logo", "gots-logo", "grs-logo"]) expect(pageSource.toLowerCase()).not.toContain(token);
  });

  it("classifies unsupported certificate ownership and universal logistics claims as prohibited", () => {
    const prohibited = CAPABILITY_REGISTER.filter((item) => item.classification === "prohibited").map((item) => item.area).join(" ");
    expect(prohibited).toContain("Current ownership");
    expect(prohibited).toContain("Fixed universal delivery time");
  });

  it("classifies DDP and compliance as third-party dependent", () => {
    const dependent = CAPABILITY_REGISTER.filter((item) => item.classification === "third-party-dependent").map((item) => item.area);
    expect(dependent).toContain("DDP delivery");
    expect(dependent).toContain("Testing, audits and certification requirements");
  });

  it("provides complete core section copy in every locale", () => {
    for (const locale of locales) {
      const copy = BUYER_INFORMATION_COPY[locale];
      expect(copy.sections.story.paragraphs.length).toBeGreaterThanOrEqual(4);
      expect(copy.sections.logistics.terms).toHaveLength(4);
      expect(copy.sections.confidentiality.points.length).toBeGreaterThanOrEqual(5);
      expect(copy.sections.sustainability.points.length).toBeGreaterThanOrEqual(6);
      expect(copy.sections.compliance.points.length).toBeGreaterThanOrEqual(6);
    }
  });

  it("keeps compliance, DDP and NDA wording qualified in every locale", () => {
    for (const locale of locales) {
      const copy = JSON.stringify(BUYER_INFORMATION_COPY[locale]).toLowerCase();
      expect(copy).not.toContain("ddp is available worldwide");
      expect(copy).not.toContain("all designs are legally protected");
      expect(copy).not.toContain("we hold all certifications");
    }
  });

  it("keeps responsive layouts grid-based without a horizontal material table", () => {
    expect(pageSource).toContain("lg:grid-cols-2");
    expect(pageSource).toContain("sm:grid-cols-2");
    expect(pageSource).not.toContain("<table");
  });

  it("makes material filters keyboard-operable buttons with aria state", () => {
    expect(pageSource).toContain('type="button"');
    expect(pageSource).toContain("aria-pressed={active}");
    expect(pageSource).toContain("focus-visible:ring-2");
  });

  it("uses no content that is available only on hover", () => {
    expect(pageSource).not.toContain("group-hover:opacity-100");
    expect(pageSource).not.toContain("hidden group-hover");
  });
});
