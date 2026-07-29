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
  "/fr/informations-acheteurs",
  "/fr/matieres",
];

const dutchRoutes = [
  "/nl/",
  "/nl/kledingfabrikant",
  "/nl/sportkleding-fabrikant",
  "/nl/leren-kleding-fabrikant",
  "/nl/private-label-kleding",
  "/nl/kopersinformatie",
  "/nl/materialen",
];

const germanBuyerConfidenceRoutes = [
  "/de/einkaeufer-informationen",
  "/de/materialien",
];

describe("internationalization foundation", () => {
  it("publishes the typed English, German, French and Dutch locale registry", () => {
    expect(Object.keys(LOCALE_REGISTRY)).toEqual(["en", "de", "fr", "nl"]);
    expect(LOCALE_REGISTRY.fr).toMatchObject({ publicationStatus: "published", sitemapEligible: true, hreflangCode: "fr" });
    expect(LOCALE_REGISTRY.nl).toMatchObject({ publicationStatus: "published", sitemapEligible: true, hreflangCode: "nl" });
  });

  it("publishes the established localized routes plus two buyer-confidence routes per language", () => {
    const routes = getPublishedLocalizedRoutes();
    expect(routes.filter((route) => route.locale === "de")).toHaveLength(10);
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

  it("publishes reciprocal hreflang for genuine buyer-information equivalents", () => {
    expect(getHreflangAlternates("/fr/matieres")).toEqual([
      { locale: "en", href: "/materials" },
      { locale: "de", href: "/de/materialien" },
      { locale: "fr", href: "/fr/matieres" },
      { locale: "nl", href: "/nl/materialen" },
    ]);
    expect(getEquivalentRoutes("/nl/kopersinformatie").map((route) => route.path)).toEqual([
      "/buyer-information",
      "/de/einkaeufer-informationen",
      "/fr/informations-acheteurs",
      "/nl/kopersinformatie",
    ]);
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
    expect(getLanguageDestination("/materials", "de")).toBe("/de/materialien");
    expect(getLanguageDestination("/nl/kopersinformatie", "fr")).toBe("/fr/informations-acheteurs");
  });

  it("suggests reviewed languages without changing the current route", () => {
    expect(getSuggestedLocale(["fr-FR", "en-US"])).toBe("fr");
    expect(getSuggestedLocale(["nl-BE", "fr-FR"])).toBe("nl");
    expect(getSuggestedLocale(["en-GB", "fr-FR"])).toBeNull();
    expect(browserPrefersGerman(["de-DE"])).toBe(true);
  });

  it("recognizes every localized buyer-information path as published", () => {
    for (const path of [...germanBuyerConfidenceRoutes, ...frenchRoutes, ...dutchRoutes]) expect(isPublishedLocalizedRoute(path)).toBe(true);
  });
});
