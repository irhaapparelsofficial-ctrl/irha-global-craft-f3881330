import { describe, expect, it } from "vitest";
import {
  browserPrefersGerman,
  getEquivalentRoutes,
  getHreflangAlternates,
  getLanguageDestination,
  getPublishedLocalizedRoutes,
  getRouteLocale,
  getSuggestedLocale,
  getXDefaultPath,
  isPublishedLocalizedRoute,
  LOCALE_REGISTRY,
  normalizeRoutePath,
} from "./i18nFoundation";

const frenchRoutes = [
  "/fr/",
  "/fr/fabricant-vetements",
  "/fr/fabricant-vetements-sport",
  "/fr/fabricant-vetements-cuir",
  "/fr/fabrication-marque-blanche",
];

const dutchRoutes = [
  "/nl/",
  "/nl/kledingfabrikant",
  "/nl/sportkleding-fabrikant",
  "/nl/leren-kleding-fabrikant",
  "/nl/private-label-kleding",
];

describe("internationalization foundation", () => {
  it("publishes the typed English, German, French and Dutch locale registry", () => {
    expect(Object.keys(LOCALE_REGISTRY)).toEqual(["en", "de", "fr", "nl"]);
    expect(LOCALE_REGISTRY.fr).toMatchObject({ publicationStatus: "published", sitemapEligible: true, hreflangCode: "fr" });
    expect(LOCALE_REGISTRY.nl).toMatchObject({ publicationStatus: "published", sitemapEligible: true, hreflangCode: "nl" });
  });

  it("publishes exactly eight German, five French and five Dutch routes", () => {
    const routes = getPublishedLocalizedRoutes();
    expect(routes.filter((route) => route.locale === "de")).toHaveLength(8);
    expect(routes.filter((route) => route.locale === "fr").map((route) => route.path).sort()).toEqual([...frenchRoutes].sort());
    expect(routes.filter((route) => route.locale === "nl").map((route) => route.path).sort()).toEqual([...dutchRoutes].sort());
  });

  it("normalizes locale gateways and resolves route locales", () => {
    expect(normalizeRoutePath("/fr")).toBe("/fr/");
    expect(normalizeRoutePath("/nl///")).toBe("/nl/");
    expect(getRouteLocale("/fr/fabricant-vetements")).toBe("fr");
    expect(getRouteLocale("/nl/kledingfabrikant")).toBe("nl");
    expect(getRouteLocale("/products")).toBe("en");
  });

  it("keeps locale-only pages locale-only and uses the correct x-default", () => {
    expect(getHreflangAlternates("/fr/fabricant-vetements")).toEqual([
      { locale: "fr", href: "/fr/fabricant-vetements" },
    ]);
    expect(getXDefaultPath("/fr/fabricant-vetements")).toBe("/products");
    expect(getXDefaultPath("/fr/")).toBe("/");
  });

  it("publishes reciprocal hreflang only for genuine sportswear and leather equivalents", () => {
    expect(getHreflangAlternates("/fr/fabricant-vetements-sport")).toEqual([
      { locale: "en", href: "/products/sportswear" },
      { locale: "fr", href: "/fr/fabricant-vetements-sport" },
      { locale: "nl", href: "/nl/sportkleding-fabrikant" },
    ]);
    expect(getEquivalentRoutes("/nl/leren-kleding-fabrikant").map((route) => route.path)).toEqual([
      "/products/premium-leather-apparel",
      "/fr/fabricant-vetements-cuir",
      "/nl/leren-kleding-fabrikant",
    ]);
  });

  it("sends language-selector clicks to equivalents or reviewed locale gateways", () => {
    expect(getLanguageDestination("/fr/fabricant-vetements-sport", "nl")).toBe("/nl/sportkleding-fabrikant");
    expect(getLanguageDestination("/fr/fabricant-vetements", "en")).toBe("/products");
    expect(getLanguageDestination("/fr/fabricant-vetements", "nl")).toBe("/nl/");
    expect(getLanguageDestination("/products", "fr")).toBe("/fr/");
  });

  it("suggests reviewed languages without changing the current route", () => {
    expect(getSuggestedLocale(["fr-FR", "en-US"])).toBe("fr");
    expect(getSuggestedLocale(["nl-BE", "fr-FR"])).toBe("nl");
    expect(getSuggestedLocale(["en-GB", "fr-FR"])).toBeNull();
    expect(browserPrefersGerman(["de-DE"])).toBe(true);
  });

  it("recognizes every Wave 2 path as a published localized route", () => {
    for (const path of [...frenchRoutes, ...dutchRoutes]) expect(isPublishedLocalizedRoute(path)).toBe(true);
  });
});
