import {
  BUYER_INTENT_FOOTER_LINKS,
  BUYER_INTENT_LANDING_PAGES,
  type BuyerIntentLandingPage,
} from "./buyerIntentLandingPages";

const germanyBroadAlternates = [
  { locale: "en", href: "/germany-apparel-manufacturer" },
  { locale: "de", href: "/de/bekleidungshersteller-deutschland" },
];

const sportsAlternates = [
  { locale: "en", href: "/custom-sportswear-manufacturer-germany" },
  { locale: "de", href: "/de/sportbekleidung-hersteller" },
];

const leatherAlternates = [
  { locale: "en", href: "/leather-apparel-manufacturer-germany" },
  { locale: "de", href: "/de/lederbekleidung-hersteller" },
];

export const SEO_BUYER_INTENT_EXPANSION: BuyerIntentLandingPage[] = [
  {
    path: "/de/bekleidungshersteller-deutschland",
    locale: "de-DE",
    direction: "ltr",
    title: "Bekleidungshersteller für Deutschland | B2B Private Label",
    description: "OEM- und Private-Label-Bekleidungsfertigung für deutsche Importeure, Großhändler und Marken mit Mustern, Etiketten und klarer Freigabe.",
    h1: "Bekleidungshersteller für deutsche B2B-Einkäufer",
    eyebrow: "Deutschland · OEM & Private Label",
    intro: "Irha Apparels fertigt kundenspezifische Bekleidung in Sialkot, Pakistan, für deutsche Importeure, Großhändler, Marken und Fachhändler. Produktspezifikation, Material, Branding, Verpackung, Menge und Lieferverantwortung werden vor Preis- oder Produktionszusagen geprüft.",
    market: "Deutschland",
    productFocus: "OEM-, ODM- und Private-Label-Bekleidung für gewerbliche Einkäufer",
    categoryPath: "/products",
    primaryLabel: "B2B-Anfrage senden",
    secondaryLabel: "Live-Fabrikbesichtigung buchen",
    sections: [
      {
        heading: "Produktprogramme für den deutschen Markt",
        body: "Eine Anfrage kann mit einem einzelnen Modell oder einer abgestimmten Kollektion beginnen. Die Machbarkeit wird für jedes Produkt und jede Materialrichtung separat bestätigt.",
        bullets: ["Trachten, Lederhosen, Dirndl und passende Accessoires", "Lederjacken, Westen, Hosen und ausgewählte Lederwaren", "Sportbekleidung, Teamwear und Trainingsprogramme", "Streetwear, Activewear, Freizeit- und Nachtwäsche"],
      },
      {
        heading: "Welche Angaben vor einem Angebot benötigt werden",
        body: "Ein belastbares Angebot benötigt eine klare Grundlage. Fehlende technische Angaben werden vor Musterplanung und Kalkulation mit dem Einkäufer abgestimmt.",
        bullets: ["Referenzbilder, Tech Pack, Skizzen oder ein berechtigtes Muster", "Mengenbereich nach Modell, Farbe und Größe", "Material, Gewicht, Verarbeitung, Druck oder Stickerei", "Etiketten, Verpackung, Zielort und gewünschte Lieferverantwortung"],
      },
      {
        heading: "Muster, Freigabe und Serienproduktion",
        body: "Die Serienproduktion wird nicht automatisch nach der ersten Anfrage gestartet. Muster, Änderungen und freigegebene Referenzen können als verbindliche Grundlage dokumentiert werden.",
        bullets: ["Material- und Komponentenprüfung vor der Musterfreigabe", "Maße, Verarbeitung und Dekoration schriftlich kommentiert", "Vorproduktionsfreigabe je nach Produkt und Projekt", "MOQ, Preis und Zeitplan erst nach Anforderungsprüfung bestätigt"],
      },
      {
        heading: "Transparente Herstellerprüfung",
        body: "Irha Apparels ist ein erfahrener Hersteller; die aktuelle Website wurde neu aufgebaut. Qualifizierte Einkäufer können das Team und den Produktionsbetrieb per Live-Videoanruf prüfen.",
        bullets: ["Direkter Kontakt zum Hersteller in Sialkot", "Keine Behauptung eines deutschen Produktionsstandorts", "Live-Fabrikansicht nach Terminvereinbarung", "Nachweise und Dokumente nur nach konkreter Prüfung zugesagt"],
      },
    ],
    faqs: [
      { question: "Welche Produkte kann Irha Apparels für Deutschland fertigen?", answer: "Geprüft werden können Trachten, Lederbekleidung, Sportbekleidung, Streetwear, Activewear, Freizeit- und Nachtwäsche sowie passende Private-Label-Ausstattung." },
      { question: "Gibt es eine allgemeine Mindestbestellmenge?", answer: "Nein. Die umsetzbare Mindestmenge hängt von Produkt, Material, Farben, Größen, Dekoration, Etiketten und Verpackung ab und wird nach Prüfung bestätigt." },
      { question: "Kann vor der Serienproduktion ein Muster freigegeben werden?", answer: "Ja. Muster, Änderungen und gegebenenfalls eine Vorproduktionsfreigabe können in den Projektablauf aufgenommen werden, bevor die Serienproduktion bestätigt wird." },
      { question: "Befindet sich die Fabrik in Deutschland?", answer: "Nein. Die Fertigung erfolgt transparent in Sialkot, Pakistan. Für qualifizierte Einkäufer kann eine Live-Fabrikbesichtigung per Video vereinbart werden." },
    ],
    relatedPaths: ["/germany-apparel-manufacturer", "/markets/germany", "/products", "/buyer-trust", "/inquiry"],
    alternates: germanyBroadAlternates,
  },
  {
    path: "/custom-sportswear-manufacturer-germany",
    locale: "en-DE",
    direction: "ltr",
    title: "Sportswear Manufacturer for Germany | Teamwear & Private Label",
    description: "Custom sportswear and teamwear manufacturing for German clubs, distributors and brands with artwork, samples, sizing, labels and repeat-order planning.",
    h1: "Custom Sportswear Manufacturer for German B2B Buyers",
    eyebrow: "Germany · Sportswear Manufacturing",
    intro: "Irha Apparels develops custom teamwear, training apparel and private-label sportswear for German clubs, distributors, wholesalers and brands. The sport, artwork, material direction, size range, decoration, packaging and repeat-order needs are reviewed before quotation or production commitments.",
    market: "Germany",
    productFocus: "custom teamwear, training apparel and private-label sportswear",
    categoryPath: "/products/sportswear",
    primaryLabel: "Request a sportswear quote",
    secondaryLabel: "Book a factory video call",
    sections: [
      {
        heading: "Sportswear programs for clubs and distributors",
        body: "A buyer can develop match apparel, training wear and related garments under one approved colour, artwork and size system.",
        bullets: ["Football, basketball, rugby, cricket and hockey kits", "Tracksuits, warm-up tops, training shirts, shorts and pants", "Club, academy, school and distributor programs", "Private-label teamwear and branded performance collections"],
      },
      {
        heading: "Artwork, materials and construction review",
        body: "The decoration and construction route is selected from the actual design and intended use instead of being assumed from a generic product name.",
        bullets: ["Club colours, crests, sponsor marks, names and numbers", "Sublimation, embroidery, DTF or another approved method", "Fabric composition, weight, stretch and construction direction", "Measurements, size ratios, grading and packing breakdown"],
      },
      {
        heading: "Sample and approval route",
        body: "Sampling can be used to review fit, appearance, artwork and workmanship before the bulk order is confirmed against written buyer comments.",
        bullets: ["Reference or tech-pack review before development", "Artwork proof and placement approval", "Sample comments and revisions documented", "MOQ, price, production timing and shipping confirmed after review"],
      },
      {
        heading: "Repeat-order preparation",
        body: "Approved files and order references can support later top-ups, while fabric and component continuity are checked again before each production run.",
        bullets: ["Approved colour and artwork references retained", "Size charts and roster formats recorded", "Material availability rechecked before repeat production", "Packing and carton information prepared per order"],
      },
    ],
    faqs: [
      { question: "Can you manufacture custom team kits for German clubs?", answer: "Yes. Kits and training garments can be reviewed with club colours, crests, sponsor artwork, player details, size ratios and repeat-order requirements." },
      { question: "Can individual player names and numbers be added?", answer: "Yes, when the final roster is supplied in the agreed format before production. Method, placement and approval responsibility are confirmed with the order." },
      { question: "Can a sportswear sample be approved before bulk production?", answer: "Yes. Sampling can cover fit, fabric, construction, artwork and decoration, with the required revisions agreed before bulk production is confirmed." },
      { question: "Is one MOQ used for every sportswear style?", answer: "No. Quantity depends on the garment, fabric, colours, decoration, size ratio and packing, so an achievable MOQ is confirmed after the brief is reviewed." },
    ],
    relatedPaths: ["/de/sportbekleidung-hersteller", "/products/sportswear", "/markets/germany", "/germany-apparel-manufacturer", "/repeat-order"],
    alternates: sportsAlternates,
  },
  {
    path: "/de/sportbekleidung-hersteller",
    locale: "de-DE",
    direction: "ltr",
    title: "Sportbekleidung Hersteller für Deutschland | Teamwear B2B",
    description: "Individuelle Sport- und Teamwear-Fertigung für deutsche Vereine, Händler und Marken mit Artwork, Größen, Mustern und Wiederholungsaufträgen.",
    h1: "Sportbekleidung Hersteller für deutsche B2B-Einkäufer",
    eyebrow: "Deutschland · Teamwear & Sportbekleidung",
    intro: "Irha Apparels entwickelt individuelle Teamwear, Trainingsbekleidung und Private-Label-Sportprogramme für deutsche Vereine, Händler, Großhändler und Marken. Sportart, Artwork, Material, Größen, Dekoration, Verpackung und Nachbestellbedarf werden vor der Kalkulation geprüft.",
    market: "Deutschland",
    productFocus: "individuelle Teamwear, Trainingsbekleidung und Private-Label-Sportprogramme",
    categoryPath: "/products/sportswear",
    primaryLabel: "Sportbekleidungsanfrage senden",
    secondaryLabel: "Live-Fabrikbesichtigung buchen",
    sections: [
      {
        heading: "Programme für Vereine und Händler",
        body: "Spielbekleidung, Trainingsprodukte und ergänzende Artikel können unter einem abgestimmten Farb-, Artwork- und Größensystem entwickelt werden.",
        bullets: ["Fußball-, Basketball-, Rugby-, Cricket- und Hockey-Sets", "Trainingsanzüge, Aufwärmoberteile, Shirts, Shorts und Hosen", "Vereins-, Akademie-, Schul- und Händlerprogramme", "Private-Label-Teamwear und gebrandete Sportkollektionen"],
      },
      {
        heading: "Artwork und Produktspezifikation",
        body: "Die geeignete Dekoration und Konstruktion wird aus dem tatsächlichen Design, Material und Verwendungszweck abgeleitet.",
        bullets: ["Vereinsfarben, Wappen, Sponsoren, Namen und Nummern", "Sublimation, Stickerei, DTF oder freigegebene Alternativen", "Materialzusammensetzung, Gewicht, Elastizität und Verarbeitung", "Maße, Größenverteilung, Gradierung und Verpackung"],
      },
      {
        heading: "Muster und Käuferfreigabe",
        body: "Passform, Optik, Artwork und Verarbeitung können anhand eines Musters und dokumentierter Käuferkommentare geprüft werden.",
        bullets: ["Tech Pack oder Referenz vor der Entwicklung geprüft", "Artwork-Proof und Platzierung freigegeben", "Musterkorrekturen schriftlich dokumentiert", "MOQ, Preis und Zeitplan nach Prüfung bestätigt"],
      },
      {
        heading: "Nachbestellungen kontrollieren",
        body: "Freigegebene Dateien und Auftragsreferenzen können spätere Nachbestellungen unterstützen, ohne Materialkontinuität ungeprüft vorauszusetzen.",
        bullets: ["Farb- und Artwork-Referenzen gespeichert", "Größentabellen und Spielerlisten dokumentiert", "Materialverfügbarkeit vor jeder Nachproduktion geprüft", "Packlisten und Kartonangaben je Auftrag erstellt"],
      },
    ],
    faqs: [
      { question: "Können individuelle Vereinstrikots gefertigt werden?", answer: "Ja. Farben, Wappen, Sponsoren, Spielernamen, Nummern, Größenverteilung und Nachbestellbedarf werden vor der Produktion abgestimmt." },
      { question: "Sind Namen und Spielernummern möglich?", answer: "Ja, wenn die endgültige Liste im vereinbarten Format rechtzeitig vorliegt. Verfahren, Platzierung und Freigabe werden mit dem Auftrag bestätigt." },
      { question: "Kann ein Muster vor der Serienproduktion freigegeben werden?", answer: "Ja. Ein Muster kann Passform, Material, Konstruktion und Artwork abdecken; notwendige Korrekturen werden vor der Serienfreigabe vereinbart." },
      { question: "Wie wird die Mindestbestellmenge festgelegt?", answer: "Die umsetzbare Menge hängt von Produkt, Material, Farben, Dekoration, Größenverteilung und Verpackung ab und wird nach Prüfung bestätigt." },
    ],
    relatedPaths: ["/custom-sportswear-manufacturer-germany", "/products/sportswear", "/markets/germany", "/de/bekleidungshersteller-deutschland", "/repeat-order"],
    alternates: sportsAlternates,
  },
  {
    path: "/leather-apparel-manufacturer-germany",
    locale: "en-DE",
    direction: "ltr",
    title: "Leather Apparel Manufacturer for Germany | Private Label B2B",
    description: "Custom leather apparel manufacturing for German brands and wholesalers with leather, lining, hardware, sizing, samples, labels and packaging approval.",
    h1: "Custom Leather Apparel Manufacturer for German Buyers",
    eyebrow: "Germany · Leather Apparel Manufacturing",
    intro: "Irha Apparels develops custom leather jackets, vests, trousers and selected accessories for German brands, importers and wholesalers. Leather type, thickness, finish, lining, hardware, fit, branding, packaging and approval requirements are reviewed before price or production timing is confirmed.",
    market: "Germany",
    productFocus: "custom leather jackets, vests, trousers and private-label leather apparel",
    categoryPath: "/products/premium-leather-apparel",
    primaryLabel: "Request a leatherwear quote",
    secondaryLabel: "Book a factory video call",
    sections: [
      {
        heading: "Leather products for B2B programs",
        body: "A buyer can begin with one outerwear style or coordinate a broader private-label range, subject to product-by-product feasibility review.",
        bullets: ["Biker, fashion, bomber and varsity-inspired jackets", "Leather vests, waistcoats, trousers and outerwear", "Belts, gloves, bags and selected accessories", "Custom lining, embroidery, patches, labels and packaging"],
      },
      {
        heading: "Approve leather and components",
        body: "Because natural leather varies, the approved specification must define the material and component references used to judge production consistency.",
        bullets: ["Leather type, thickness, shade, grain and hand-feel", "Zippers, snaps, buckles, buttons and other hardware", "Lining, insulation, reinforcement and seam construction", "Measurement chart, fit, grading and tolerance review"],
      },
      {
        heading: "Sampling and workmanship review",
        body: "A sample can align leather appearance, fit, construction, hardware and branding before the bulk order is released.",
        bullets: ["Buyer-owned reference, sketch or tech-pack review", "Leather swatch or approved sample comparison", "Fit, workmanship and component comments documented", "Pre-production approval used when required by the program"],
      },
      {
        heading: "Commercial scope after technical review",
        body: "The quotation separates product construction, branding, packing and shipping assumptions so the buyer knows what is included before commitment.",
        bullets: ["MOQ confirmed from leather and production requirements", "Pricing based on approved material and construction", "Production timing confirmed after sample and material review", "Incoterms and delivery responsibility agreed in writing"],
      },
    ],
    faqs: [
      { question: "Which leather types can be used for German buyer programs?", answer: "The proposed leather depends on style, finish, construction and commercial requirements. The quotation identifies the intended specification and substitute rules." },
      { question: "Can zippers, lining and hardware be customized?", answer: "Yes. Hardware, lining, insulation and internal branding can be reviewed against the style and approved component references before production." },
      { question: "Can a leather jacket sample be approved first?", answer: "Yes. A sample can be used to review leather, fit, construction, hardware, labels and finishing before bulk production is confirmed." },
      { question: "Is there one MOQ for all leather products?", answer: "No. Quantity depends on leather availability, construction, colours, hardware, decoration, sizes and packaging, so it is confirmed after review." },
    ],
    relatedPaths: ["/de/lederbekleidung-hersteller", "/products/premium-leather-apparel", "/markets/germany", "/germany-apparel-manufacturer", "/buyer-trust"],
    alternates: leatherAlternates,
  },
  {
    path: "/de/lederbekleidung-hersteller",
    locale: "de-DE",
    direction: "ltr",
    title: "Lederbekleidung Hersteller für Deutschland | Private Label",
    description: "Individuelle Lederbekleidungsfertigung für deutsche Marken und Großhändler mit Leder, Futter, Beschlägen, Größen, Mustern und Etiketten.",
    h1: "Lederbekleidung Hersteller für deutsche B2B-Einkäufer",
    eyebrow: "Deutschland · Lederbekleidung B2B",
    intro: "Irha Apparels entwickelt individuelle Lederjacken, Westen, Hosen und ausgewählte Accessoires für deutsche Marken, Importeure und Großhändler. Lederart, Stärke, Finish, Futter, Beschläge, Passform, Branding, Verpackung und Freigaben werden vor Preis- oder Terminbestätigung geprüft.",
    market: "Deutschland",
    productFocus: "Lederjacken, Westen, Hosen und Private-Label-Lederbekleidung",
    categoryPath: "/products/premium-leather-apparel",
    primaryLabel: "Lederbekleidungsanfrage senden",
    secondaryLabel: "Live-Fabrikbesichtigung buchen",
    sections: [
      {
        heading: "Lederprodukte für gewerbliche Programme",
        body: "Einkäufer können mit einem Modell beginnen oder eine abgestimmte Private-Label-Reihe entwickeln, sofern jedes Produkt technisch geprüft wird.",
        bullets: ["Biker-, Fashion-, Bomber- und Varsity-inspirierte Jacken", "Lederwesten, Hosen und ergänzende Oberbekleidung", "Gürtel, Handschuhe, Taschen und ausgewählte Accessoires", "Kundenspezifisches Futter, Patches, Etiketten und Verpackung"],
      },
      {
        heading: "Leder und Komponenten freigeben",
        body: "Naturleder variiert. Deshalb muss die freigegebene Spezifikation die Material- und Komponentenreferenzen für die Qualitätsbeurteilung festlegen.",
        bullets: ["Lederart, Stärke, Farbton, Narbung und Griff", "Reißverschlüsse, Druckknöpfe, Schnallen und Knöpfe", "Futter, Isolierung, Verstärkung und Nahtkonstruktion", "Maßtabelle, Passform, Gradierung und Toleranzen"],
      },
      {
        heading: "Muster und Verarbeitungsprüfung",
        body: "Ein Muster kann Lederoptik, Passform, Konstruktion, Beschläge und Branding vor der Serienfreigabe abstimmen.",
        bullets: ["Berechtigte Referenz, Skizze oder Tech Pack geprüft", "Ledermuster oder freigegebenes Produkt verglichen", "Passform- und Verarbeitungskommentare dokumentiert", "Vorproduktionsfreigabe bei Bedarf vereinbart"],
      },
      {
        heading: "Kalkulation nach technischer Prüfung",
        body: "Produkt, Branding, Verpackung und Versandannahmen werden getrennt beschrieben, damit der Leistungsumfang vor Auftragserteilung klar ist.",
        bullets: ["MOQ aus Leder- und Produktionsanforderungen abgeleitet", "Preis auf freigegebener Material- und Konstruktionsbasis", "Zeitplan nach Muster- und Materialprüfung bestätigt", "Incoterms und Lieferverantwortung schriftlich vereinbart"],
      },
    ],
    faqs: [
      { question: "Welche Lederarten können geprüft werden?", answer: "Die geeignete Lederart hängt von Modell, Finish, Konstruktion und Zielpreis ab. Das Angebot benennt die geplante Spezifikation und mögliche Ersatzregeln." },
      { question: "Können Futter, Reißverschlüsse und Beschläge angepasst werden?", answer: "Ja. Futter, Isolierung, Reißverschlüsse, Druckknöpfe, Schnallen und internes Branding können anhand freigegebener Referenzen angepasst werden." },
      { question: "Ist eine Musterfreigabe für Lederjacken möglich?", answer: "Ja. Ein Muster kann Leder, Passform, Verarbeitung, Beschläge, Etiketten und Finish abdecken, bevor die Serienproduktion bestätigt wird." },
      { question: "Gilt eine Mindestmenge für alle Lederprodukte?", answer: "Nein. Die Menge hängt von Lederverfügbarkeit, Konstruktion, Farben, Beschlägen, Dekoration, Größen und Verpackung ab und wird nach Prüfung bestätigt." },
    ],
    relatedPaths: ["/leather-apparel-manufacturer-germany", "/products/premium-leather-apparel", "/markets/germany", "/de/bekleidungshersteller-deutschland", "/buyer-trust"],
    alternates: leatherAlternates,
  },
];

const enhancedBasePages = BUYER_INTENT_LANDING_PAGES.map((page) =>
  page.path === "/germany-apparel-manufacturer"
    ? { ...page, alternates: germanyBroadAlternates }
    : page,
);

export const SEO_BUYER_INTENT_LANDING_PAGES: BuyerIntentLandingPage[] = [
  ...enhancedBasePages,
  ...SEO_BUYER_INTENT_EXPANSION,
];

export const SEO_BUYER_INTENT_PATHS = SEO_BUYER_INTENT_LANDING_PAGES.map(
  (page) => page.path,
);

export const SEO_BUYER_INTENT_FOOTER_LINKS = [
  ...BUYER_INTENT_FOOTER_LINKS,
  { label: "Deutsch · Bekleidungshersteller", href: "/de/bekleidungshersteller-deutschland" },
  { label: "Deutsch · Sportbekleidung", href: "/de/sportbekleidung-hersteller" },
  { label: "Deutsch · Lederbekleidung", href: "/de/lederbekleidung-hersteller" },
] as const;

export function getSeoBuyerIntentLandingPage(pathname: string) {
  const normalized = pathname !== "/" ? pathname.replace(/\/+$/, "") : pathname;
  return SEO_BUYER_INTENT_LANDING_PAGES.find((page) => page.path === normalized);
}
