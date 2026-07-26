import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  LOCALIZED_ROUTE_REGISTRY,
  LOCALE_REGISTRY,
  browserPrefersGerman,
  dismissLanguageSuggestion,
  getEquivalentRoutes,
  getExplicitLanguagePreference,
  getHreflangAlternates,
  getLanguageDestination,
  getPublishedLocalizedRoutes,
  getRouteDirection,
  getRouteLocale,
  getXDefaultPath,
  isLanguageSuggestionDismissed,
  setExplicitLanguagePreference,
} from "./i18nFoundation";

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); },
  };
}

describe("internationalization foundation", () => {
  it("keeps English as the unprefixed default and fallback", () => {
    expect(DEFAULT_LOCALE).toBe("en");
    expect(Object.keys(LOCALE_REGISTRY)).toEqual(["en", "de"]);
    expect(LOCALE_REGISTRY.en.pathPrefix).toBe("");
    expect(LOCALE_REGISTRY.de.pathPrefix).toBe("/de");
    expect(LOCALE_REGISTRY.de.fallbackLocale).toBe("en");
    expect(LOCALE_REGISTRY.en.direction).toBe("ltr");
    expect(LOCALE_REGISTRY.de.direction).toBe("ltr");
  });

  it("publishes only the reviewed German inventory", () => {
    expect(getPublishedLocalizedRoutes().map((route) => route.path)).toEqual([
      "/de/",
      "/de/bavarian-wear",
      "/de/bekleidungshersteller-deutschland",
      "/de/dirndl-grosshandel",
      "/de/lederbekleidung-hersteller",
      "/de/lederhosen-hersteller",
      "/de/sportbekleidung-hersteller",
      "/de/trachten-private-label",
    ]);
  });

  it("maps genuine English and German equivalents reciprocally", () => {
    const english = "/lederhosen-manufacturer-germany";
    const german = "/de/lederhosen-hersteller";
    expect(getLanguageDestination(english, "de")).toBe(german);
    expect(getLanguageDestination(german, "en")).toBe(english);
    expect(getEquivalentRoutes(german).map((route) => route.path)).toEqual([english, german]);
    expect(getHreflangAlternates(german)).toEqual([
      { locale: "en", href: english },
      { locale: "de", href: german },
    ]);
    expect(getXDefaultPath(german)).toBe(english);
  });

  it("does not invent equivalence for the German-only private-label page or gateway", () => {
    expect(getHreflangAlternates("/de/trachten-private-label")).toEqual([
      { locale: "de", href: "/de/trachten-private-label" },
    ]);
    expect(getXDefaultPath("/de/trachten-private-label")).toBe("/products/bavarian-trachten-wear");
    expect(getHreflangAlternates("/de/")).toEqual([{ locale: "de", href: "/de/" }]);
    expect(getXDefaultPath("/de/")).toBe("/");
  });

  it("falls back to the German gateway without creating false route equivalence", () => {
    expect(getLanguageDestination("/products/sportswear", "de")).toBe("/de/");
    expect(getLanguageDestination("/products/sportswear", "en")).toBe("/products/sportswear");
  });

  it("derives deterministic language and direction from the requested route", () => {
    expect(getRouteLocale("/de")).toBe("de");
    expect(getRouteLocale("/de/bavarian-wear?x=1")).toBe("de");
    expect(getRouteLocale("/products/sportswear")).toBe("en");
    expect(getRouteDirection("/de/")).toBe("ltr");
  });

  it("has no duplicate route paths or locale collisions inside an equivalence group", () => {
    expect(new Set(LOCALIZED_ROUTE_REGISTRY.map((route) => route.path)).size).toBe(LOCALIZED_ROUTE_REGISTRY.length);
    const groupLocales = LOCALIZED_ROUTE_REGISTRY.map((route) => `${route.equivalentGroup}:${route.locale}`);
    expect(new Set(groupLocales).size).toBe(groupLocales.length);
  });

  it("uses only the primary browser language for a non-blocking suggestion", () => {
    expect(browserPrefersGerman(["de-DE", "en-US"])).toBe(true);
    expect(browserPrefersGerman(["en-US", "de-DE"])).toBe(false);
    expect(browserPrefersGerman(undefined)).toBe(false);
  });

  it("stores only explicit locale choice and dismissal", () => {
    const storage = memoryStorage();
    expect(getExplicitLanguagePreference(storage)).toBeNull();
    setExplicitLanguagePreference("de", storage);
    expect(getExplicitLanguagePreference(storage)).toBe("de");
    expect(isLanguageSuggestionDismissed(storage)).toBe(false);
    dismissLanguageSuggestion(storage);
    expect(isLanguageSuggestionDismissed(storage)).toBe(true);
  });
});
