export type GermanGatewayLink = {
  href: string;
  title: string;
  description: string;
};

export const GERMAN_GATEWAY_CONTENT = {
  path: "/de/",
  title: "Irha Apparels auf Deutsch | B2B Bekleidungshersteller",
  description:
    "Geprüfte deutsche B2B-Informationen zu Bekleidungsfertigung, Trachten, Lederbekleidung und Sportbekleidung von Irha Apparels in Sialkot, Pakistan.",
  h1: "B2B-Bekleidungsfertigung für deutschsprachige Einkäufer",
  eyebrow: "Deutsch · geprüfte Veröffentlichungen",
  intro:
    "Irha Apparels fertigt kundenspezifische Bekleidung in Sialkot, Pakistan, für Großhändler, Importeure, Marken, Vereine und gewerbliche Einkäufer. Diese Seite führt ausschließlich zu geprüften und veröffentlichten deutschen Inhalten.",
  scopeNote:
    "Der vollständige Produktkatalog ist weiterhin auf Englisch verfügbar. Nicht übersetzte Produkt- und Kategorieseiten werden nicht als vollständige deutsche Inhalte ausgegeben.",
  primaryCta: "B2B-Anfrage senden",
  secondaryCta: "Vollständigen Katalog auf Englisch öffnen",
  factoryCta: "Live-Fabrikbesichtigung buchen",
  sectionTitle: "Veröffentlichte deutsche Seiten",
  trustTitle: "Direkte Fertigung und klare Freigaben",
  trustBody:
    "Material, Konstruktion, Größen, Branding, Verpackung, Mindestmenge, Preis und Lieferverantwortung werden vor einer Produktionszusage geprüft. Irha Apparels behauptet keinen deutschen Produktionsstandort.",
  links: [
    {
      href: "/de/bekleidungshersteller-deutschland",
      title: "Bekleidungshersteller für Deutschland",
      description: "OEM-, ODM- und Private-Label-Fertigung für deutsche B2B-Einkäufer.",
    },
    {
      href: "/de/bavarian-wear",
      title: "Trachten- und Lederhosenfertigung",
      description: "B2B-Programme für Lederhosen, Dirndl, Trachtenbekleidung und Accessoires.",
    },
    {
      href: "/de/lederhosen-hersteller",
      title: "Lederhosen Hersteller",
      description: "Kundenspezifische Lederhosen mit Leder-, Stickerei-, Größen- und Musterfreigabe.",
    },
    {
      href: "/de/dirndl-grosshandel",
      title: "Dirndl Hersteller und Großhandel",
      description: "Abgestimmte Dirndl-Programme mit Kleid, Bluse, Schürze und Private Label.",
    },
    {
      href: "/de/trachten-private-label",
      title: "Trachten Private Label",
      description: "Koordinierte Trachtenkollektionen mit Etiketten, Hangtags und Verpackung.",
    },
    {
      href: "/de/sportbekleidung-hersteller",
      title: "Sportbekleidung Hersteller",
      description: "Teamwear, Trainingsbekleidung und Private-Label-Sportprogramme für B2B-Käufer.",
    },
    {
      href: "/de/lederbekleidung-hersteller",
      title: "Lederbekleidung Hersteller",
      description: "Lederjacken, Westen, Hosen und ausgewählte Accessoires nach Kundenspezifikation.",
    },
  ] satisfies readonly GermanGatewayLink[],
} as const;
