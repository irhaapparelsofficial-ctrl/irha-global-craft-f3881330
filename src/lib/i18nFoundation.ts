export type LocaleCode = "en" | "de" | "fr" | "nl";
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
    code: "en", englishName: "English", nativeName: "English", direction: "ltr", pathPrefix: "",
    enabled: true, publicationStatus: "published", fallbackLocale: "en", sitemapEligible: true,
    hreflangCode: "en", openGraphLocale: "en_US",
  },
  de: {
    code: "de", englishName: "German", nativeName: "Deutsch", direction: "ltr", pathPrefix: "/de",
    enabled: true, publicationStatus: "published", fallbackLocale: "en", sitemapEligible: true,
    hreflangCode: "de", openGraphLocale: "de_DE",
  },
  fr: {
    code: "fr", englishName: "French", nativeName: "Français", direction: "ltr", pathPrefix: "/fr",
    enabled: true, publicationStatus: "published", fallbackLocale: "en", sitemapEligible: true,
    hreflangCode: "fr", openGraphLocale: "fr_FR",
  },
  nl: {
    code: "nl", englishName: "Dutch", nativeName: "Nederlands", direction: "ltr", pathPrefix: "/nl",
    enabled: true, publicationStatus: "published", fallbackLocale: "en", sitemapEligible: true,
    hreflangCode: "nl", openGraphLocale: "nl_NL",
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
  { path: "/materials", locale: "en", equivalentGroup: "buyer-material-library", publicationStatus: PUBLISHED, sitemapEligible: true, indexable: true, preferredEnglishPath: "/materials" },
  { path: "/de/materialien", locale: "de", equivalentGroup: "buyer-material-library", publicationStatus: PUBLISHED, sitemapEligible: true, indexable: true, preferredEnglishPath: "/materials" },
  { path: "/fr/matieres", locale: "fr", equivalentGroup: "buyer-material-library", publicationStatus: PUBLISHED, sitemapEligible: true, indexable: true, preferredEnglishPath: "/materials" },
  { path: "/nl/materialen", locale: "nl", equivalentGroup: "buyer-material-library", publicationStatus: PUBLISHED, sitemapEligible: true, indexable: true, preferredEnglishPath: "/materials" },
  { path: "/buyer-information", locale: "en", equivalentGroup: "buyer-business-information", publicationStatus: PUBLISHED, sitemapEligible: true, indexable: true, preferredEnglishPath: "/buyer-information" },
  { path: "/de/einkaeufer-informationen", locale: "de", equivalentGroup: "buyer-business-information", publicationStatus: PUBLISHED, sitemapEligible: true, indexable: true, preferredEnglishPath: "/buyer-information" },
  { path: "/fr/informations-acheteurs", locale: "fr", equivalentGroup: "buyer-business-information", publicationStatus: PUBLISHED, sitemapEligible: true, indexable: true, preferredEnglishPath: "/buyer-information" },
  { path: "/nl/kopersinformatie", locale: "nl", equivalentGroup: "buyer-business-information", publicationStatus: PUBLISHED, sitemapEligible: true, indexable: true, preferredEnglishPath: "/buyer-information" },
  { path: "/de/", locale: "de", equivalentGroup: "german-gateway", publicationStatus: PUBLISHED, sitemapEligible: true, indexable: true, preferredEnglishPath: "/" },
  { path: "/products/bavarian-trachten-wear", locale: "en", equivalentGroup: "bavarian-trachten", publicationStatus: PUBLISHED, sitemapEligible: false, indexable: true, preferredEnglishPath: "/products/bavarian-trachten-wear" },
  { path: "/de/bavarian-wear", locale: "de", equivalentGroup: "bavarian-trachten", publicationStatus: PUBLISHED, sitemapEligible: true, indexable: true, preferredEnglishPath: "/products/bavarian-trachten-wear" },
  { path: "/lederhosen-manufacturer-germany", locale: "en", equivalentGroup: "lederhosen-manufacturing", publicationStatus: PUBLISHED, sitemapEligible: false, indexable: true, preferredEnglishPath: "/lederhosen-manufacturer-germany" },
  { path: "/de/lederhosen-hersteller", locale: "de", equivalentGroup: "lederhosen-manufacturing", publicationStatus: PUBLISHED, sitemapEligible: true, indexable: true, preferredEnglishPath: "/lederhosen-manufacturer-germany" },
  { path: "/dirndl-manufacturer-austria", locale: "en", equivalentGroup: "dirndl-manufacturing", publicationStatus: PUBLISHED, sitemapEligible: false, indexable: true, preferredEnglishPath: "/dirndl-manufacturer-austria" },
  { path: "/de/dirndl-grosshandel", locale: "de", equivalentGroup: "dirndl-manufacturing", publicationStatus: PUBLISHED, sitemapEligible: true, indexable: true, preferredEnglishPath: "/dirndl-manufacturer-austria" },
  { path: "/de/trachten-private-label", locale: "de", equivalentGroup: "trachten-private-label-de", publicationStatus: PUBLISHED, sitemapEligible: true, indexable: true, preferredEnglishPath: "/products/bavarian-trachten-wear" },
  { path: "/germany-apparel-manufacturer", locale: "en", equivalentGroup: "germany-apparel-manufacturing", publicationStatus: PUBLISHED, sitemapEligible: false, indexable: true, preferredEnglishPath: "/germany-apparel-manufacturer" },
  { path: "/de/bekleidungshersteller-deutschland", locale: "de", equivalentGroup: "germany-apparel-manufacturing", publicationStatus: PUBLISHED, sitemapEligible: true, indexable: true, preferredEnglishPath: "/germany-apparel-manufacturer" },
  { path: "/custom-sportswear-manufacturer-germany", locale: "en", equivalentGroup: "germany-sportswear-manufacturing", publicationStatus: PUBLISHED, sitemapEligible: false, indexable: true, preferredEnglishPath: "/custom-sportswear-manufacturer-germany" },
  { path: "/de/sportbekleidung-hersteller", locale: "de", equivalentGroup: "germany-sportswear-manufacturing", publicationStatus: PUBLISHED, sitemapEligible: true, indexable: true, preferredEnglishPath: "/custom-sportswear-manufacturer-germany" },
  { path: "/leather-apparel-manufacturer-germany", locale: "en", equivalentGroup: "germany-leather-manufacturing", publicationStatus: PUBLISHED, sitemapEligible: false, indexable: true, preferredEnglishPath: "/leather-apparel-manufacturer-germany" },
  { path: "/de/lederbekleidung-hersteller", locale: "de", equivalentGroup: "germany-leather-manufacturing", publicationStatus: PUBLISHED, sitemapEligible: true, indexable: true, preferredEnglishPath: "/leather-apparel-manufacturer-germany" },

  { path: "/fr/", locale: "fr", equivalentGroup: "french-gateway", publicationStatus: PUBLISHED, sitemapEligible: true, indexable: true, preferredEnglishPath: "/" },
  { path: "/fr/fabricant-vetements", locale: "fr", equivalentGroup: "french-apparel-manufacturing", publicationStatus: PUBLISHED, sitemapEligible: true, indexable: true, preferredEnglishPath: "/products" },
  { path: "/products/sportswear", locale: "en", equivalentGroup: "global-sportswear-manufacturing", publicationStatus: PUBLISHED, sitemapEligible: false, indexable: true, preferredEnglishPath: "/products/sportswear" },
  { path: "/fr/fabricant-vetements-sport", locale: "fr", equivalentGroup: "global-sportswear-manufacturing", publicationStatus: PUBLISHED, sitemapEligible: true, indexable: true, preferredEnglishPath: "/products/sportswear" },
  { path: "/nl/sportkleding-fabrikant", locale: "nl", equivalentGroup: "global-sportswear-manufacturing", publicationStatus: PUBLISHED, sitemapEligible: true, indexable: true, preferredEnglishPath: "/products/sportswear" },
  { path: "/products/premium-leather-apparel", locale: "en", equivalentGroup: "global-leather-manufacturing", publicationStatus: PUBLISHED, sitemapEligible: false, indexable: true, preferredEnglishPath: "/products/premium-leather-apparel" },
  { path: "/fr/fabricant-vetements-cuir", locale: "fr", equivalentGroup: "global-leather-manufacturing", publicationStatus: PUBLISHED, sitemapEligible: true, indexable: true, preferredEnglishPath: "/products/premium-leather-apparel" },
  { path: "/nl/leren-kleding-fabrikant", locale: "nl", equivalentGroup: "global-leather-manufacturing", publicationStatus: PUBLISHED, sitemapEligible: true, indexable: true, preferredEnglishPath: "/products/premium-leather-apparel" },
  { path: "/fr/fabrication-marque-blanche", locale: "fr", equivalentGroup: "french-private-label", publicationStatus: PUBLISHED, sitemapEligible: true, indexable: true, preferredEnglishPath: "/products" },

  { path: "/nl/", locale: "nl", equivalentGroup: "dutch-gateway", publicationStatus: PUBLISHED, sitemapEligible: true, indexable: true, preferredEnglishPath: "/" },
  { path: "/nl/kledingfabrikant", locale: "nl", equivalentGroup: "dutch-apparel-manufacturing", publicationStatus: PUBLISHED, sitemapEligible: true, indexable: true, preferredEnglishPath: "/products" },
  { path: "/nl/private-label-kleding", locale: "nl", equivalentGroup: "dutch-private-label", publicationStatus: PUBLISHED, sitemapEligible: true, indexable: true, preferredEnglishPath: "/products" },
] as const;

export type HreflangAlternate = { locale: string; href: string };

export function normalizeRoutePath(value: string): string {
  const rawPath = value.split(/[?#]/, 1)[0] || "/";
  const withLeadingSlash = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  const collapsed = withLeadingSlash.replace(/\/{2,}/g, "/");
  if (collapsed === "/") return "/";
  const trimmed = collapsed.replace(/\/+$/, "");
  return (["/de", "/fr", "/nl"] as const).includes(trimmed as "/de" | "/fr" | "/nl") ? `${trimmed}/` : trimmed;
}

export function localeCodeFromTag(value?: string): LocaleCode {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (normalized.startsWith("de")) return "de";
  if (normalized.startsWith("fr")) return "fr";
  if (normalized.startsWith("nl")) return "nl";
  return "en";
}

export function getPublishedRoute(pathname: string): LocalizedRouteRecord | undefined {
  const normalized = normalizeRoutePath(pathname);
  return LOCALIZED_ROUTE_REGISTRY.find(
    (route) => route.path === normalized && route.publicationStatus === PUBLISHED && route.indexable,
  );
}

export function getRouteLocale(pathname: string): LocaleCode {
  const registered = getPublishedRoute(pathname);
  if (registered) return registered.locale;
  const normalized = normalizeRoutePath(pathname);
  for (const locale of ["de", "fr", "nl"] as const) {
    const prefix = LOCALE_REGISTRY[locale].pathPrefix;
    if (normalized === `${prefix}/` || normalized.startsWith(`${prefix}/`)) return locale;
  }
  return DEFAULT_LOCALE;
}

export function getRouteDirection(pathname: string): LocaleDirection {
  return LOCALE_REGISTRY[getRouteLocale(pathname)].direction;
}

const localeOrder: Record<LocaleCode, number> = { en: 0, de: 1, fr: 2, nl: 3 };

export function getEquivalentRoutes(pathname: string): LocalizedRouteRecord[] {
  const route = getPublishedRoute(pathname);
  if (!route) return [];
  return LOCALIZED_ROUTE_REGISTRY
    .filter((candidate) => candidate.equivalentGroup === route.equivalentGroup && candidate.publicationStatus === PUBLISHED && candidate.indexable)
    .slice()
    .sort((left, right) => localeOrder[left.locale] - localeOrder[right.locale] || left.path.localeCompare(right.path));
}

export function getHreflangAlternates(pathname: string): HreflangAlternate[] {
  return getEquivalentRoutes(pathname).map((route) => ({ locale: LOCALE_REGISTRY[route.locale].hreflangCode, href: route.path }));
}

export function getXDefaultPath(pathname: string): string {
  const route = getPublishedRoute(pathname);
  if (!route) return normalizeRoutePath(pathname);
  const englishEquivalent = getEquivalentRoutes(pathname).find((candidate) => candidate.locale === DEFAULT_LOCALE);
  return englishEquivalent?.path ?? route.preferredEnglishPath ?? "/";
}

export function getLocaleGateway(locale: LocaleCode): string {
  return locale === DEFAULT_LOCALE ? "/" : `${LOCALE_REGISTRY[locale].pathPrefix}/`;
}

export function getLanguageDestination(pathname: string, targetLocale: LocaleCode): string {
  const normalized = normalizeRoutePath(pathname);
  const route = getPublishedRoute(normalized);
  if (route) {
    const equivalent = getEquivalentRoutes(normalized).find((candidate) => candidate.locale === targetLocale);
    if (equivalent) return equivalent.path;
    if (targetLocale === DEFAULT_LOCALE) return route.preferredEnglishPath || "/";
  }
  if (targetLocale === DEFAULT_LOCALE && getRouteLocale(normalized) === DEFAULT_LOCALE) return normalized;
  return getLocaleGateway(targetLocale);
}

export function isPublishedLocalizedRoute(pathname: string): boolean {
  const route = getPublishedRoute(pathname);
  return Boolean(route && route.locale !== DEFAULT_LOCALE);
}

export function getPublishedLocalizedRoutes(): LocalizedRouteRecord[] {
  return LOCALIZED_ROUTE_REGISTRY
    .filter((route) => route.locale !== DEFAULT_LOCALE && route.publicationStatus === PUBLISHED && route.indexable && route.sitemapEligible && LOCALE_REGISTRY[route.locale].enabled && LOCALE_REGISTRY[route.locale].publicationStatus === PUBLISHED && LOCALE_REGISTRY[route.locale].sitemapEligible)
    .slice()
    .sort((left, right) => left.path.localeCompare(right.path));
}

export const LANGUAGE_PREFERENCE_STORAGE_KEY = "irha.locale.preference.v1";
export const LANGUAGE_SUGGESTION_DISMISSED_STORAGE_KEY = "irha.locale.suggestion-dismissed.v1";

function browserStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try { return window.localStorage; } catch { return null; }
}

export function getExplicitLanguagePreference(storage: Storage | null = browserStorage()): LocaleCode | null {
  if (!storage) return null;
  const value = storage.getItem(LANGUAGE_PREFERENCE_STORAGE_KEY);
  return value === "en" || value === "de" || value === "fr" || value === "nl" ? value : null;
}

export function setExplicitLanguagePreference(locale: LocaleCode, storage: Storage | null = browserStorage()): void {
  storage?.setItem(LANGUAGE_PREFERENCE_STORAGE_KEY, locale);
}

export function isLanguageSuggestionDismissed(storage: Storage | null = browserStorage()): boolean {
  return storage?.getItem(LANGUAGE_SUGGESTION_DISMISSED_STORAGE_KEY) === "true";
}

export function dismissLanguageSuggestion(storage: Storage | null = browserStorage()): void {
  storage?.setItem(LANGUAGE_SUGGESTION_DISMISSED_STORAGE_KEY, "true");
}

export function getSuggestedLocale(languages: readonly string[] | undefined): Exclude<LocaleCode, "en"> | null {
  const primary = languages?.find((language) => language.trim().length > 0);
  if (!primary) return null;
  const locale = localeCodeFromTag(primary);
  if (locale === DEFAULT_LOCALE) return null;
  const definition = LOCALE_REGISTRY[locale];
  return definition.enabled && definition.publicationStatus === PUBLISHED ? locale as Exclude<LocaleCode, "en"> : null;
}

export function browserPrefersGerman(languages: readonly string[] | undefined): boolean {
  return getSuggestedLocale(languages) === "de";
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
    skipToContent: "Skip to main content", home: "Home", products: "Products", manufacturing: "Manufacturing", process: "How it works", buyerTrust: "Buyer trust", factoryCall: "Factory call", inquiryCart: "Inquiry cart", requestQuote: "Request quote", reviewInquiry: "Review inquiry", openMenu: "Open navigation menu", closeMenu: "Close navigation menu", languageSelectorLabel: "Choose language", languageSuggestionLabel: "Language suggestion", languageSuggestionText: "Open the reviewed localized pages from Irha Apparels?", viewGerman: "View localized pages", continueEnglish: "Continue in English", dismissSuggestion: "Dismiss language suggestion",
  },
  de: {
    skipToContent: "Zum Hauptinhalt springen", home: "Startseite", products: "Katalog (Englisch)", manufacturing: "Fertigung (Englisch)", process: "Ablauf (Englisch)", buyerTrust: "Käufervertrauen (Englisch)", factoryCall: "Fabrik-Videoanruf", inquiryCart: "Anfrageliste", requestQuote: "Anfrage senden", reviewInquiry: "Anfrage prüfen", openMenu: "Navigationsmenü öffnen", closeMenu: "Navigationsmenü schließen", languageSelectorLabel: "Sprache wählen", languageSuggestionLabel: "Sprachhinweis", languageSuggestionText: "Möchten Sie die geprüften deutschen Seiten von Irha Apparels öffnen?", viewGerman: "Deutsch ansehen", continueEnglish: "Auf Englisch fortfahren", dismissSuggestion: "Sprachhinweis schließen",
  },
  fr: {
    skipToContent: "Aller au contenu principal", home: "Accueil", products: "Catalogue (anglais)", manufacturing: "Fabrication (anglais)", process: "Processus (anglais)", buyerTrust: "Informations acheteurs (anglais)", factoryCall: "Visite vidéo de l’usine", inquiryCart: "Liste de demande", requestQuote: "Demander un devis", reviewInquiry: "Vérifier la demande", openMenu: "Ouvrir le menu de navigation", closeMenu: "Fermer le menu de navigation", languageSelectorLabel: "Choisir la langue", languageSuggestionLabel: "Suggestion de langue", languageSuggestionText: "Souhaitez-vous ouvrir les pages françaises vérifiées d’Irha Apparels ?", viewGerman: "Voir en français", continueEnglish: "Continuer en anglais", dismissSuggestion: "Fermer la suggestion de langue",
  },
  nl: {
    skipToContent: "Naar de hoofdinhoud", home: "Startpagina", products: "Catalogus (Engels)", manufacturing: "Productie (Engels)", process: "Werkwijze (Engels)", buyerTrust: "Informatie voor inkopers (Engels)", factoryCall: "Live videogesprek met de fabriek", inquiryCart: "Aanvraaglijst", requestQuote: "Offerte aanvragen", reviewInquiry: "Aanvraag controleren", openMenu: "Navigatiemenu openen", closeMenu: "Navigatiemenu sluiten", languageSelectorLabel: "Taal kiezen", languageSuggestionLabel: "Taalsuggestie", languageSuggestionText: "Wilt u de gecontroleerde Nederlandstalige pagina’s van Irha Apparels openen?", viewGerman: "Nederlands bekijken", continueEnglish: "Doorgaan in het Engels", dismissSuggestion: "Taalsuggestie sluiten",
  },
};
