import type { BuyerIntentLandingPage } from "./buyerIntentLandingPages";

export type GermanBuyerJourneyConfig = {
  path: string;
  title: string;
  description: string;
  h1: string;
  eyebrow: string;
  market: string;
  productFocus: string;
  categoryPath: string;
  primaryLabel: string;
  products: readonly string[];
  specifications: readonly string[];
  relatedPaths: readonly string[];
  alternates: BuyerIntentLandingPage["alternates"];
};

export function createGermanBuyerJourneyPage(config: GermanBuyerJourneyConfig): BuyerIntentLandingPage {
  const productSummary = config.products.join(", ");
  const specificationSummary = config.specifications.join(", ");

  return {
    path: config.path,
    locale: "de-DE",
    direction: "ltr",
    title: config.title,
    description: config.description,
    h1: config.h1,
    eyebrow: config.eyebrow,
    intro: `Irha Apparels fertigt ${config.productFocus} in Sialkot, Pakistan, für gewerbliche Einkäufer in ${config.market}. Produktart, Material, Verarbeitung, Größen, Branding, Verpackung und Lieferverantwortung werden geprüft, bevor Preis, Mindestmenge oder Produktionszeit bestätigt werden.`,
    market: config.market,
    productFocus: config.productFocus,
    categoryPath: config.categoryPath,
    primaryLabel: config.primaryLabel,
    secondaryLabel: "Fabrik per Video besichtigen",
    sections: [
      {
        heading: "Sortiment und Beschaffungsumfang",
        body: "Das Programm kann mit einem Modell beginnen oder mehrere abgestimmte Varianten umfassen. Jede Ausführung wird einzeln auf technische Machbarkeit und den vorgesehenen B2B-Einsatz geprüft.",
        bullets: [...config.products],
      },
      {
        heading: "Spezifikation vor der Kalkulation",
        body: `Eine belastbare Anfrage beschreibt die entscheidenden Produktmerkmale. Für diesen Bereich sind insbesondere ${specificationSummary} relevant.`,
        bullets: [
          "Tech Pack, Skizze oder berechtigte Referenz als Ausgangspunkt",
          "Material-, Farb- und Komponentenreferenzen",
          "Maßtabelle, Größenlauf, Toleranzen und Mengenverteilung",
          "Etiketten, Hangtags, Verpackung, Zielort und gewünschtes Lieferfenster",
        ],
      },
      {
        heading: "Muster und dokumentierte Käuferfreigabe",
        body: "Ein Muster kann Material, Passform, Konstruktion, Dekoration und Verarbeitung abbilden. Kommentare und Korrekturen werden vor einer Serienfreigabe schriftlich festgehalten.",
        bullets: [
          "Artwork- und Platzierungsfreigabe vor der Produktion",
          "Musterkommentare und Revisionen dokumentiert",
          "Vorproduktionsfreigabe je nach Produkt und Projekt",
          "Nachbestellungen nur nach erneuter Material- und Machbarkeitsprüfung",
        ],
      },
      {
        heading: "Direkte B2B-Abwicklung aus Sialkot",
        body: "Die Fertigung erfolgt in Sialkot, Pakistan. Irha Apparels behauptet keinen deutschen Produktionsstandort und veröffentlicht keine pauschalen Festpreise, Mindestmengen oder Zertifizierungszusagen.",
        bullets: [
          "Direkte Kommunikation mit dem Hersteller",
          "Live-Fabrikbesichtigung per Video nach Terminvereinbarung",
          "Leistungsumfang und Lieferverantwortung schriftlich definiert",
          "Preis, Mindestmenge und Zeitplan erst nach Prüfung der Anfrage",
        ],
      },
    ],
    faqs: [
      {
        question: "Welche Produkte und Anpassungen können angefragt werden?",
        answer: `Zum geprüften Umfang gehören ${productSummary}. Materialien, Farben, Größen, Dekoration, Kennzeichnung und Verpackung werden je Modell abgestimmt.`,
      },
      {
        question: "Wie wird die Mindestbestellmenge festgelegt?",
        answer: "Die umsetzbare Mindestmenge hängt von Produkt, Material, Farben, Größen, Dekoration, Etiketten und Verpackung ab. Sie wird erst nach Prüfung der konkreten Anfrage bestätigt.",
      },
      {
        question: "Kann vor der Serienproduktion ein Muster freigegeben werden?",
        answer: "Ja. Ein Muster kann die vereinbarten Materialien, Maße, Konstruktion, Dekoration und Verarbeitung abdecken. Erforderliche Korrekturen werden vor der Serienfreigabe dokumentiert.",
      },
      {
        question: "Befindet sich die Fabrik in Deutschland?",
        answer: "Nein. Die Fertigung erfolgt in Sialkot, Pakistan. Qualifizierte Einkäufer können nach Terminvereinbarung eine Live-Fabrikbesichtigung per Video anfragen.",
      },
    ],
    relatedPaths: [...config.relatedPaths],
    alternates: config.alternates,
  };
}
