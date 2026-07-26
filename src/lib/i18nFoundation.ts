export type LocaleCode = "en" | "de";
export type LocaleDirection = "ltr" | "rtl";
export type TranslationPublicationStatus = "draft" | "reviewed" | "published";

export type LocaleDefinition = {
  code: LocaleCode;
  englishName: string;
  nativeName: string;
  direction: LocaleDirection;
  pathPrefix: string;
  enabled: boolean;
  publicationStatus: TranslationPublicationStatus;
  fallbackLocale: LocaleCode;
  sitemapEligible: boolean;
  hreflangCode: string;
  openGraphLocale: string;
};

export const DEFAULT_LOCALE: LocaleCode = "en";

export const LOCALE_REGISTRY: Readonly<Record<LocaleCode, LocaleDefinition>> = {
  en: {
    code: "en",
    englishName: "English",
    nativeName: "English",
    direction: "ltr",
    pathPrefix: "",
    enabled: true,
    publicationStatus: "published",
    fallbackLocale: "en",
    sitemapEligible: true,
    hreflangCode: "en",
    openGraphLocale: "en_US",
  },
  de: {
    code: "de",
    englishName: "German",
    nativeName: "Deutsch",
    direction: "ltr",
    pathPrefix: "/de",
    enabled: true,
    publicationStatus: "published",
    fallbackLocale: "en",
    sitemapEligible: true,
    hreflangCode: "de",
    openGraphLocale: "de_DE",
  },
};

export type LocalizedRouteRecord = {
  path: string;
  locale: LocaleCode;
  equivalentGroup: string;
  publicationStatus: TranslationPublicationStatus;
  sitemapEligible: boolean;
  indexable: boolean;
  preferredEnglishPath: string;
};

const PUBLISHED: TranslationPublicationStatus = "published";

export const LOCALIZED_ROUTE_REGISTRY: readonly LocalizedRouteRecord[] = [
  {
    path: "/de/",
    locale: "de",
    equivalentGroup: "german-gateway",
    publicationStatus: PUBLISHED,
    sitemapEligible: true,
    indexable: true,
    preferredEnglishPath: "/",
  },
  {
    path: "/products/bavarian-trachten-wear",
    locale: "en",
    equivalentGroup: "bavarian-trachten",
    publicationStatus: PUBLISHED,
    sitemapEligible: false,
    indexable: true,
    preferredEnglishPath: "/products/bavarian-trachten-wear",
  },
  {
    path: "/de/bavarian-wear",
    locale: "de",
    equivalentGroup: "bavarian-trachten",
    publicationStatus: PUBLISHED,
    sitemapEligible: true,
    indexable: true,
    preferredEnglishPath: "/products/bavarian-trachten-wear",
  },
  {
    path: "/lederhosen-manufacturer-germany",
    locale: "en",
    equivalentGroup: "lederhosen-manufacturing",
    publicationStatus: PUBLISHED,
    sitemapEligible: false,
    indexable: true,
    preferredEnglishPath: "/lederhosen-manufacturer-germany",
  },
  {
    path: "/de/lederhosen-hersteller",
    locale: "de",
    equivalentGroup: "lederhosen-manufacturing",
    publicationStatus: PUBLISHED,
    sitemapEligible: true,
    indexable: true,
    preferredEnglishPath: "/lederhosen-manufacturer-germany",
  },
  {
    path: "/dirndl-manufacturer-austria",
    locale: "en",
    equivalentGroup: "dirndl-manufacturing",
    publicationStatus: PUBLISHED,
    sitemapEligible: false,
    indexable: true,
    preferredEnglishPath: "/dirndl-manufacturer-austria",
  },
  {
    path: "/de/dirndl-grosshandel",
    locale: "de",
    equivalentGroup: "dirndl-manufacturing",
    publicationStatus: PUBLISHED,
    sitemapEligible: true,
    indexable: true,
    preferredEnglishPath: "/dirndl-manufacturer-austria",
  },
  {
    path: "/de/trachten-private-label",
    locale: "de",
    equivalentGroup: "trachten-private-label-de",
    publicationStatus: PUBLISHED,
    sitemapEligible: true,
    indexable: true,
    preferredEnglishPath: "/products/bavarian-trachten-wear",
  },
  {
    path: "/germany-apparel-manufacturer",
    locale: "en",
    equivalentGroup: "germany-apparel-manufacturing",
    publicationStatus: PUBLISHED,
    sitemapEligible: false,
    indexable: true,
    preferredEnglishPath: "/germany-apparel-manufacturer",
  },
  {
    path: "/de/bekleidungshersteller-deutschland",
    locale: "de",
    equivalentGroup: "germany-apparel-manufacturing",
    publicationStatus: PUBLISHED,
    sitemapEligible: true,
    indexable: true,
    preferredEnglishPath: "/germany-apparel-manufacturer",
  },
  {
    path: "/custom-sportswear-manufacturer-germany",
    locale: "en",
    equivalentGroup: "germany-sportswear-manufacturing",
    publicationStatus: PUBLISHED,
    sitemapEligible: false,
    indexable: true,
    preferredEnglishPath: "/custom-sportswear-manufacturer-germany",
  },
  {
    path: "/de/sportbekleidung-hersteller",
    locale: "de",
    equivalentGroup: "germany-sportswear-manufacturing",
    publicationStatus: PUBLISHED,
    sitemapEligible: true,
    indexable: true,
    preferredEnglishPath: "/custom-sportswear-manufacturer-germany",
  },
  {
    path: "/leather-apparel-manufacturer-germany",
    locale: "en",
    equivalentGroup: "germany-leather-manufacturing",
    publicationStatus: PUBLISHED,
    sitemapEligible: false,
    indexable: true,
    preferredEnglishPath: "/leather-apparel-manufacturer-germany",
  },
  {
    path: "/de/lederbekleidung-hersteller",
    locale: "de",
    equivalentGroup: "germany-leather-manufacturing",
    publicationStatus: PUBLISHED,
    sitemapEligible: true,
    indexable: true,
    preferredEnglishPath: "/leather-apparel-manufacturer-germany",
  },
] as const;

export type HreflangAlternate = { locale: string; href: string };

export function normalizeRoutePath(value: string): string {
  const rawPath = value.split(/[?#]/, 1)[0] || "/";
  const withLeadingSlash = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  const collapsed = withLeadingSlash.replace(/\/{2,}/g, "/");
  if (collapsed === "/") return "/";
  const trimmed = collapsed.replace(/\/+$/, "");
  return trimmed === "/de" ? "/de/" : trimmed;
}

export function localeCodeFromTag(value?: string): LocaleCode {
  return value?.toLowerCase().startsWith("de") ? "de" : "en";
}

export function getPublishedRoute(pathname: string): LocalizedRouteRecord | undefined {
  const normalized = normalizeRoutePath(pathname);
  return LOCALIZED_ROUTE_REGISTRY.find(
    (route) => route.path === normalized && route.publicationStatus === "published" && route.indexable,
  );
}

export function getRouteLocale(pathname: string): LocaleCode {
  const registered = getPublishedRoute(pathname);
  if (registered) return registered.locale;
  const normalized = normalizeRoutePath(pathname);
  return normalized === "/de/" || normalized.startsWith("/de/") ? "de" : DEFAULT_LOCALE;
}

export function getRouteDirection(pathname: string): LocaleDirection {
  return LOCALE_REGISTRY[getRouteLocale(pathname)].direction;
}

export function getEquivalentRoutes(pathname: string): LocalizedRouteRecord[] {
  const route = getPublishedRoute(pathname);
  if (!route) return [];
  return LOCALIZED_ROUTE_REGISTRY
    .filter(
      (candidate) =>
        candidate.equivalentGroup === route.equivalentGroup &&
        candidate.publicationStatus === "published" &&
        candidate.indexable,
    )
    .sort((left, right) => (left.locale === right.locale ? left.path.localeCompare(right.path) : left.locale === "en" ? -1 : 1));
}

export function getHreflangAlternates(pathname: string): HreflangAlternate[] {
  return getEquivalentRoutes(pathname).map((route) => ({
    locale: LOCALE_REGISTRY[route.locale].hreflangCode,
    href: route.path,
  }));
}

export function getXDefaultPath(pathname: string): string {
  const route = getPublishedRoute(pathname);
  if (!route) return normalizeRoutePath(pathname);
  const englishEquivalent = getEquivalentRoutes(pathname).find((candidate) => candidate.locale === "en");
  return englishEquivalent?.path ?? route.preferredEnglishPath ?? "/";
}

export function getLanguageDestination(pathname: string, targetLocale: LocaleCode): string {
  const normalized = normalizeRoutePath(pathname);
  const route = getPublishedRoute(normalized);
  if (route) {
    const equivalent = getEquivalentRoutes(normalized).find((candidate) => candidate.locale === targetLocale);
    if (equivalent) return equivalent.path;
    if (targetLocale === "en") return route.preferredEnglishPath || "/";
  }
  if (targetLocale === "en" && getRouteLocale(normalized) === "en") return normalized;
  return targetLocale === "de" ? "/de/" : "/";
}

export function isPublishedLocalizedRoute(pathname: string): boolean {
  const route = getPublishedRoute(pathname);
  return route?.locale === "de";
}

export function getPublishedLocalizedRoutes(): LocalizedRouteRecord[] {
  return LOCALIZED_ROUTE_REGISTRY
    .filter(
      (route) =>
        route.locale !== DEFAULT_LOCALE &&
        route.publicationStatus === "published" &&
        route.indexable &&
        route.sitemapEligible &&
        LOCALE_REGISTRY[route.locale].enabled &&
        LOCALE_REGISTRY[route.locale].sitemapEligible,
    )
    .slice()
    .sort((left, right) => left.path.localeCompare(right.path));
}

export const LANGUAGE_PREFERENCE_STORAGE_KEY = "irha.locale.preference.v1";
export const LANGUAGE_SUGGESTION_DISMISSED_STORAGE_KEY = "irha.locale.suggestion-dismissed.v1";

function browserStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getExplicitLanguagePreference(storage: Storage | null = browserStorage()): LocaleCode | null {
  if (!storage) return null;
  const value = storage.getItem(LANGUAGE_PREFERENCE_STORAGE_KEY);
  return value === "en" || value === "de" ? value : null;
}

export function setExplicitLanguagePreference(
  locale: LocaleCode,
  storage: Storage | null = browserStorage(),
): void {
  storage?.setItem(LANGUAGE_PREFERENCE_STORAGE_KEY, locale);
}

export function isLanguageSuggestionDismissed(storage: Storage | null = browserStorage()): boolean {
  return storage?.getItem(LANGUAGE_SUGGESTION_DISMISSED_STORAGE_KEY) === "true";
}

export function dismissLanguageSuggestion(storage: Storage | null = browserStorage()): void {
  storage?.setItem(LANGUAGE_SUGGESTION_DISMISSED_STORAGE_KEY, "true");
}

export function browserPrefersGerman(languages: readonly string[] | undefined): boolean {
  const primary = languages?.find((language) => language.trim().length > 0)?.toLowerCase();
  return primary?.startsWith("de") ?? false;
}

export type SharedUiCopy = {
  skipToContent: string;
  home: string;
  products: string;
  manufacturing: string;
  process: string;
  buyerTrust: string;
  factoryCall: string;
  inquiryCart: string;
  requestQuote: string;
  reviewInquiry: string;
  openMenu: string;
  closeMenu: string;
  languageSelectorLabel: string;
  languageSuggestionLabel: string;
  languageSuggestionText: string;
  viewGerman: string;
  continueEnglish: string;
  dismissSuggestion: string;
};

export const SHARED_UI_COPY: Readonly<Record<LocaleCode, SharedUiCopy>> = {
  en: {
    skipToContent: "Skip to main content",
    home: "Home",
    products: "Products",
    manufacturing: "Manufacturing",
    process: "How it works",
    buyerTrust: "Buyer trust",
    factoryCall: "Factory call",
    inquiryCart: "Inquiry cart",
    requestQuote: "Request quote",
    reviewInquiry: "Review inquiry",
    openMenu: "Open navigation menu",
    closeMenu: "Close navigation menu",
    languageSelectorLabel: "Choose language",
    languageSuggestionLabel: "German language suggestion",
    languageSuggestionText: "Möchten Sie die geprüften deutschen Seiten von Irha Apparels öffnen?",
    viewGerman: "Deutsch ansehen",
    continueEnglish: "Continue in English",
    dismissSuggestion: "Dismiss language suggestion",
  },
  de: {
    skipToContent: "Zum Hauptinhalt springen",
    home: "Startseite",
    products: "Katalog (Englisch)",
    manufacturing: "Fertigung (Englisch)",
    process: "Ablauf (Englisch)",
    buyerTrust: "Käufervertrauen (Englisch)",
    factoryCall: "Fabrik-Videoanruf",
    inquiryCart: "Anfrageliste",
    requestQuote: "Anfrage senden",
    reviewInquiry: "Anfrage prüfen",
    openMenu: "Navigationsmenü öffnen",
    closeMenu: "Navigationsmenü schließen",
    languageSelectorLabel: "Sprache wählen",
    languageSuggestionLabel: "Deutscher Sprachhinweis",
    languageSuggestionText: "Möchten Sie die geprüften deutschen Seiten von Irha Apparels öffnen?",
    viewGerman: "Deutsch ansehen",
    continueEnglish: "Auf Englisch fortfahren",
    dismissSuggestion: "Sprachhinweis schließen",
  },
};
