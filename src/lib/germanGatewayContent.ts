export type GermanGatewayLink = {
  href: string;
  title: string;
  description: string;
};

export const GERMAN_GATEWAY_CONTENT = {
  path: "/de/",
  title: "Irha Apparels auf Deutsch | B2B-Bekleidungshersteller",
  description:
    "Deutschsprachige B2B-Informationen zu Bekleidungsfertigung, Trachten, Lederhosen, Dirndl, Sportbekleidung und Lederbekleidung aus Sialkot, Pakistan.",
  h1: "B2B-Bekleidungsfertigung für deutschsprachige Einkäufer",
  eyebrow: "Deutsch · geprüfte B2B-Beschaffungsseiten",
  intro:
    "Irha Apparels fertigt kundenspezifische Bekleidung in Sialkot, Pakistan, für Importeure, Großhändler, Fachhändler, Vereine und Private-Label-Marken. Die veröffentlichten deutschen Seiten erklären Produktschwerpunkte, Freigaben und die Angaben, die für eine belastbare Angebotsprüfung benötigt werden.",
  scopeNote:
    "Der vollständige Produktkatalog bleibt auf Englisch verfügbar. Nicht übersetzte Produkt- und Kategorieseiten werden klar als englische Inhalte gekennzeichnet und nicht als vollständige deutsche Übersetzung dargestellt.",
  primaryCta: "B2B-Anfrage senden",
  secondaryCta: "Englischen Produktkatalog öffnen",
  factoryCta: "Fabrik per Video besichtigen",
  sectionTitle: "Deutsche Seiten für Ihre Beschaffung",
  trustTitle: "Direkte Fertigung, klare Spezifikationen und dokumentierte Freigaben",
  trustBody:
    "Material, Konstruktion, Größen, Branding, Verpackung, Mindestmenge, Preis, Produktionszeit und Lieferverantwortung werden erst nach Prüfung der konkreten Anfrage bestätigt. Irha Apparels behauptet keinen deutschen Standort und veröffentlicht keine pauschalen Festpreise oder Mindestmengen.",
  links: [
    {
      href: "/de/bekleidungshersteller-deutschland",
      title: "Bekleidungshersteller für Deutschland",
      description: "OEM- und Private-Label-Fertigung für deutsche Importeure, Großhändler, Fachhändler und Marken.",
    },
    {
      href: "/de/bavarian-wear",
      title: "Trachtenfertigung für den DACH-Markt",
      description: "Übersicht zu Lederhosen, Dirndl, Trachtenbekleidung, Zielgruppen und ergänzenden Programmen.",
    },
    {
      href: "/de/lederhosen-hersteller",
      title: "Lederhosen-Hersteller",
      description: "Kundenspezifische Lederhosen mit abgestimmtem Leder, Stickerei, Größenlauf und Musterfreigabe.",
    },
    {
      href: "/de/dirndl-grosshandel",
      title: "Dirndl-Hersteller für Großhandel",
      description: "Abgestimmte Dirndl-Programme mit Kleid, Bluse, Schürze, Kennzeichnung und Handelsverpackung.",
    },
    {
      href: "/de/trachten-private-label",
      title: "Trachten für Private Label",
      description: "Koordinierte Trachtenkollektionen mit Eigenmarken-Etiketten, Hangtags und Verpackung.",
    },
    {
      href: "/de/sportbekleidung-hersteller",
      title: "Sportbekleidungshersteller",
      description: "Teamwear, Trainingsbekleidung und Private-Label-Sportprogramme für Vereine, Händler und Marken.",
    },
    {
      href: "/de/lederbekleidung-hersteller",
      title: "Lederbekleidungshersteller",
      description: "Lederjacken, Westen, Hosen und ausgewählte Accessoires nach geprüfter Kundenspezifikation.",
    },
  ] satisfies readonly GermanGatewayLink[],
} as const;
