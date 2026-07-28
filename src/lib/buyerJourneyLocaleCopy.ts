import type { LocaleCode } from "./i18nFoundation";
import type { BuyerIntentLandingPage } from "./buyerIntentLandingPages";

export type BuyerJourneyLocale = LocaleCode;

export type BuyerJourneyCopy = {
  home: string;
  products: string;
  audience: string;
  madeIn: string;
  approval: string;
  direct: string;
  faqEyebrow: string;
  faqTitle: string;
  ctaTitle: string;
  ctaBody: string;
  explore: string;
  related: string;
  relatedAria: string;
  englishPagePrefix: string;
  homeAria: string;
  primaryNavigation: string;
  buyerTrust: string;
  factoryCall: string;
  requestQuote: string;
  trustStatement: string;
  buyerActions: string;
  manufacturing: string;
  contact: string;
  privacy: string;
};

export function getBuyerJourneyLocale(locale: string): BuyerJourneyLocale {
  const normalized = locale.toLowerCase();
  if (normalized.startsWith("de")) return "de";
  if (normalized.startsWith("fr")) return "fr";
  if (normalized.startsWith("nl")) return "nl";
  return "en";
}

export function getBuyerJourneyLocaleForPage(page: BuyerIntentLandingPage): BuyerJourneyLocale {
  return getBuyerJourneyLocale(page.locale);
}

export const BUYER_JOURNEY_COPY: Readonly<Record<BuyerJourneyLocale, BuyerJourneyCopy>> = {
  en: {
    home: "Home",
    products: "Products",
    audience: "Importers, wholesalers, retailers and private-label brands",
    madeIn: "Manufactured in Sialkot, Pakistan",
    approval: "Sample and buyer approval before bulk commitment",
    direct: "Direct B2B export communication",
    faqEyebrow: "Buyer FAQ",
    faqTitle: "Questions before you request a quote",
    ctaTitle: "Send a specification-led B2B inquiry",
    ctaBody: "Include product type, quantity, materials, branding, packaging, target quality and required delivery window. The manufacturing team will review feasibility before confirming price or timing.",
    explore: "Explore related products",
    related: "Related sourcing pages",
    relatedAria: "Related buyer and product pages",
    englishPagePrefix: "",
    homeAria: "Irha Apparels home",
    primaryNavigation: "Primary navigation",
    buyerTrust: "Buyer Trust",
    factoryCall: "Factory Video Call",
    requestQuote: "Request Quote",
    trustStatement: "Requirement-led manufacturing in Sialkot, Pakistan. Buyers may request an appointment-based live factory call before making a commercial commitment.",
    buyerActions: "Primary buyer actions",
    manufacturing: "B2B manufacturing",
    contact: "Contact",
    privacy: "Privacy",
  },
  de: {
    home: "Deutsch",
    products: "B2B-Beschaffungsseiten",
    audience: "Importeure, Großhändler, Fachhändler und Private-Label-Marken",
    madeIn: "Fertigung in Sialkot, Pakistan",
    approval: "Muster- und Käuferfreigabe vor der Serienproduktion",
    direct: "Direkte internationale B2B-Kommunikation",
    faqEyebrow: "FAQ für Einkäufer",
    faqTitle: "Wichtige Fragen vor einer Angebotsanfrage",
    ctaTitle: "Senden Sie eine spezifikationsbasierte B2B-Anfrage",
    ctaBody: "Nennen Sie Produktart, Mengenbereich, Materialien, Größen, Branding, Verpackung, Zielqualität, Lieferort und gewünschtes Lieferfenster. Machbarkeit, Mindestmenge, Preis und Zeitplan werden anschließend geprüft.",
    explore: "Produktkatalog auf Englisch",
    related: "Weitere Beschaffungsseiten",
    relatedAria: "Weitere deutsche Beschaffungsseiten und klar gekennzeichnete englische Fachseiten",
    englishPagePrefix: "Englische Seite: ",
    homeAria: "Irha Apparels Startseite",
    primaryNavigation: "Hauptnavigation",
    buyerTrust: "Informationen für Einkäufer",
    factoryCall: "Fabrik per Video besichtigen",
    requestQuote: "Angebot anfragen",
    trustStatement: "Erfahrener Bekleidungshersteller in Sialkot, Pakistan. Qualifizierte Einkäufer können vor einer Bestellung eine Live-Fabrikbesichtigung per Video vereinbaren.",
    buyerActions: "Aktionen für B2B-Einkäufer",
    manufacturing: "B2B-Fertigung",
    contact: "Kontakt",
    privacy: "Datenschutz (Englisch)",
  },
  fr: {
    home: "Français",
    products: "Pages d’approvisionnement B2B",
    audience: "Importateurs, grossistes, détaillants et marques privées",
    madeIn: "Fabrication à Sialkot, Pakistan",
    approval: "Échantillon et validation de l’acheteur avant la production en série",
    direct: "Communication B2B internationale directe",
    faqEyebrow: "FAQ acheteurs",
    faqTitle: "Questions à clarifier avant une demande de devis",
    ctaTitle: "Envoyez une demande B2B fondée sur vos spécifications",
    ctaBody: "Indiquez le type de produit, la fourchette de quantité, les matières, les tailles, le marquage, l’emballage, le niveau de qualité visé, la destination et la fenêtre de livraison souhaitée. La faisabilité, la quantité minimale, le prix et le calendrier seront confirmés après étude.",
    explore: "Catalogue produits en anglais",
    related: "Autres pages d’approvisionnement",
    relatedAria: "Pages françaises d’approvisionnement et pages produits en anglais clairement signalées",
    englishPagePrefix: "Page en anglais : ",
    homeAria: "Accueil Irha Apparels en français",
    primaryNavigation: "Navigation principale",
    buyerTrust: "Informations pour les acheteurs",
    factoryCall: "Visite vidéo de l’usine",
    requestQuote: "Demander un devis",
    trustStatement: "Irha Apparels est un fabricant expérimenté établi à Sialkot, au Pakistan. Les acheteurs qualifiés peuvent demander une visite vidéo en direct de l’usine avant de confirmer une commande.",
    buyerActions: "Actions pour les acheteurs B2B",
    manufacturing: "Fabrication B2B",
    contact: "Contact",
    privacy: "Confidentialité (anglais)",
  },
  nl: {
    home: "Nederlands",
    products: "B2B-inkoopinformatie",
    audience: "Importeurs, groothandels, retailers en private-labelmerken",
    madeIn: "Productie in Sialkot, Pakistan",
    approval: "Monster- en kopergoedkeuring vóór bulkproductie",
    direct: "Directe internationale B2B-communicatie",
    faqEyebrow: "FAQ voor inkopers",
    faqTitle: "Vragen vóór u een offerte aanvraagt",
    ctaTitle: "Stuur een B2B-aanvraag op basis van specificaties",
    ctaBody: "Vermeld producttype, hoeveelheidsrange, materialen, maten, branding, verpakking, gewenste kwaliteit, bestemming en gewenste leverperiode. Haalbaarheid, minimale afname, prijs en planning worden daarna beoordeeld.",
    explore: "Engelstalige productcatalogus",
    related: "Meer inkooppagina’s",
    relatedAria: "Nederlandstalige inkooppagina’s en duidelijk gemarkeerde Engelstalige productpagina’s",
    englishPagePrefix: "Engelse pagina: ",
    homeAria: "Nederlandse startpagina van Irha Apparels",
    primaryNavigation: "Hoofdnavigatie",
    buyerTrust: "Informatie voor inkopers",
    factoryCall: "Live videogesprek met de fabriek",
    requestQuote: "Offerte aanvragen",
    trustStatement: "Irha Apparels is een ervaren kledingfabrikant in Sialkot, Pakistan. Gekwalificeerde inkopers kunnen vóór een bestelling een live videogesprek met de fabriek aanvragen.",
    buyerActions: "Acties voor B2B-inkopers",
    manufacturing: "B2B-productie",
    contact: "Contact",
    privacy: "Privacy (Engels)",
  },
};

export function getBuyerJourneyCopy(locale: string): BuyerJourneyCopy {
  return BUYER_JOURNEY_COPY[getBuyerJourneyLocale(locale)];
}
