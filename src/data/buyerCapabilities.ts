import type { LocaleCode } from "@/lib/i18nFoundation";

export type CapabilityClassification =
  | "verified-current"
  | "commonly-offered-subject-to-sourcing"
  | "order-specific"
  | "third-party-dependent"
  | "prohibited";

export type MaterialFamilyId = "cotton-jersey" | "fleece" | "performance" | "leather-suede";

export type LocalizedText = Readonly<Record<LocaleCode, string>>;

export const ROUTES = {
  materials: {
    en: "/materials",
    de: "/de/materialien",
    fr: "/fr/matieres",
    nl: "/nl/materialen",
  },
  buyerInformation: {
    en: "/buyer-information",
    de: "/de/einkaeufer-informationen",
    fr: "/fr/informations-acheteurs",
    nl: "/nl/kopersinformatie",
  },
} as const satisfies Record<string, Record<LocaleCode, string>>;

export const MATERIAL_DISCLAIMER: LocalizedText = {
  en: "All ranges are practical starting points, not guaranteed final specifications. Final composition, GSM or leather thickness, colour, finish, availability, minimums and lead time are confirmed during sampling and quotation.",
  de: "Alle Bereiche sind praktische Ausgangswerte und keine garantierten Endspezifikationen. Endgültige Zusammensetzung, GSM beziehungsweise Lederstärke, Farbe, Ausrüstung, Verfügbarkeit, Mindestmenge und Lieferzeit werden bei Musterung und Angebot bestätigt.",
  fr: "Toutes les plages sont des points de départ pratiques et non des spécifications finales garanties. La composition finale, le GSM ou l’épaisseur du cuir, la couleur, la finition, la disponibilité, les minimums et le délai sont confirmés lors de l’échantillonnage et du devis.",
  nl: "Alle bereiken zijn praktische uitgangspunten en geen gegarandeerde eindspecificaties. De definitieve samenstelling, GSM of leerdikte, kleur, afwerking, beschikbaarheid, minimumaantallen en doorlooptijd worden tijdens bemonstering en offerte bevestigd.",
};

export const MATERIAL_PAGE_COPY = {
  en: {
    eyebrow: "Fabric & Material Library",
    title: "Choose a material direction before the exact specification is locked.",
    intro: "Browse practical material families used across Irha Apparels product programmes. A buyer may reference a material, request swatches or proceed with only a target product, market and quality level.",
    filterLabel: "Filter material family",
    all: "All materials",
    composition: "Typical composition",
    weight: "Indicative weight",
    structure: "Structure",
    finishes: "Finish options",
    uses: "Typical applications",
    customization: "Decoration compatibility",
    sourcing: "Sourcing note",
    rfq: "Reference in RFQ",
    sample: "Request swatch or sample",
    gsmTitle: "What GSM means",
    gsmBody: "GSM means grams per square metre. It helps compare fabric weight, but it does not alone determine quality, drape, warmth, recovery or durability.",
    unsureTitle: "Not sure which material is suitable?",
    unsureBody: "Share your target product, destination market, expected use and quality level. The material can be reviewed during development without delaying the inquiry.",
    unsureCta: "Describe the product",
    related: "Shipping, confidentiality and compliance information",
  },
  de: {
    eyebrow: "Stoff- und Materialbibliothek",
    title: "Eine Materialrichtung wählen, bevor die genaue Spezifikation festgelegt wird.",
    intro: "Praktische Materialgruppen für die Produktprogramme von Irha Apparels. Einkäufer können ein Material nennen, Muster anfragen oder nur Produkt, Markt und Qualitätsniveau beschreiben.",
    filterLabel: "Materialgruppe filtern",
    all: "Alle Materialien",
    composition: "Typische Zusammensetzung",
    weight: "Richtwert Gewicht",
    structure: "Struktur",
    finishes: "Ausrüstungsoptionen",
    uses: "Typische Anwendungen",
    customization: "Veredelungseignung",
    sourcing: "Beschaffungshinweis",
    rfq: "In Anfrage übernehmen",
    sample: "Stoffmuster oder Musterteil anfragen",
    gsmTitle: "Was GSM bedeutet",
    gsmBody: "GSM bedeutet Gramm pro Quadratmeter. Der Wert hilft beim Vergleich des Stoffgewichts, bestimmt aber nicht allein Qualität, Fall, Wärme, Rücksprung oder Haltbarkeit.",
    unsureTitle: "Unsicher, welches Material passt?",
    unsureBody: "Nennen Sie Zielprodukt, Absatzmarkt, Einsatz und Qualitätsniveau. Das Material kann in der Entwicklung geprüft werden, ohne die Anfrage zu verzögern.",
    unsureCta: "Produkt beschreiben",
    related: "Versand-, Vertraulichkeits- und Compliance-Informationen",
  },
  fr: {
    eyebrow: "Bibliothèque tissus et matières",
    title: "Choisir une orientation matière avant de figer la spécification exacte.",
    intro: "Parcourez les familles de matières utilisées dans les programmes produits d’Irha Apparels. L’acheteur peut citer une matière, demander des échantillons ou indiquer seulement le produit, le marché et le niveau de qualité visé.",
    filterLabel: "Filtrer par famille de matières",
    all: "Toutes les matières",
    composition: "Composition habituelle",
    weight: "Poids indicatif",
    structure: "Structure",
    finishes: "Options de finition",
    uses: "Applications habituelles",
    customization: "Compatibilité marquage",
    sourcing: "Note d’approvisionnement",
    rfq: "Référencer dans le devis",
    sample: "Demander un coupon ou un échantillon",
    gsmTitle: "Que signifie GSM",
    gsmBody: "GSM signifie grammes par mètre carré. Il aide à comparer le poids du tissu, mais ne détermine pas à lui seul la qualité, le tombé, la chaleur, la reprise ou la durabilité.",
    unsureTitle: "Vous ne savez pas quelle matière choisir ?",
    unsureBody: "Indiquez le produit visé, le marché de destination, l’usage et le niveau de qualité. La matière peut être étudiée pendant le développement sans retarder la demande.",
    unsureCta: "Décrire le produit",
    related: "Informations livraison, confidentialité et conformité",
  },
  nl: {
    eyebrow: "Stoffen- en materialenbibliotheek",
    title: "Kies een materiaalrichting voordat de exacte specificatie wordt vastgelegd.",
    intro: "Bekijk praktische materiaalfamilies voor de productprogramma’s van Irha Apparels. Een inkoper kan een materiaal noemen, stalen aanvragen of alleen product, markt en gewenst kwaliteitsniveau delen.",
    filterLabel: "Filter op materiaalfamilie",
    all: "Alle materialen",
    composition: "Gebruikelijke samenstelling",
    weight: "Indicatief gewicht",
    structure: "Structuur",
    finishes: "Afwerkingsopties",
    uses: "Gebruikelijke toepassingen",
    customization: "Geschikt voor decoratie",
    sourcing: "Inkoopnotitie",
    rfq: "Vermeld in offerteaanvraag",
    sample: "Staal of ontwikkelmonster aanvragen",
    gsmTitle: "Wat GSM betekent",
    gsmBody: "GSM betekent gram per vierkante meter. Het helpt het stofgewicht te vergelijken, maar bepaalt niet op zichzelf kwaliteit, valling, warmte, herstel of duurzaamheid.",
    unsureTitle: "Niet zeker welk materiaal geschikt is?",
    unsureBody: "Deel het doelproduct, de bestemmingsmarkt, het gebruik en het gewenste kwaliteitsniveau. Het materiaal kan tijdens de ontwikkeling worden beoordeeld zonder de aanvraag te vertragen.",
    unsureCta: "Product beschrijven",
    related: "Informatie over verzending, vertrouwelijkheid en compliance",
  },
} as const;

export const MATERIAL_FAMILIES: ReadonlyArray<{
  id: MaterialFamilyId;
  title: LocalizedText;
  intro: LocalizedText;
}> = [
  {
    id: "cotton-jersey",
    title: { en: "Cotton & jersey", de: "Baumwolle & Jersey", fr: "Coton et jersey", nl: "Katoen en jersey" },
    intro: {
      en: "Everyday, premium and stretch knits for tees, polos, base layers and casual programmes.",
      de: "Alltags-, Premium- und Stretchstrick für T-Shirts, Polos, Basisschichten und Freizeitprogramme.",
      fr: "Mailles quotidiennes, premium et extensibles pour t-shirts, polos, couches de base et collections décontractées.",
      nl: "Dagelijkse, premium en stretchbreisels voor T-shirts, polo’s, basislagen en casual programma’s.",
    },
  },
  {
    id: "fleece",
    title: { en: "Fleece & sweatshirt", de: "Fleece & Sweatshirt", fr: "Molleton et sweat", nl: "Fleece en sweatshirt" },
    intro: {
      en: "Loopback and brushed constructions for sweatshirts, hoodies, joggers and coordinated sets.",
      de: "Loopback- und angeraute Konstruktionen für Sweatshirts, Hoodies, Jogger und Sets.",
      fr: "Constructions bouclées et grattées pour sweats, hoodies, joggings et ensembles coordonnés.",
      nl: "Loopback- en geborstelde constructies voor sweatshirts, hoodies, joggers en sets.",
    },
  },
  {
    id: "performance",
    title: { en: "Performance materials", de: "Funktionsmaterialien", fr: "Matières performance", nl: "Performancematerialen" },
    intro: {
      en: "Polyester and stretch structures for teamwear, training, activewear and fitted performance products.",
      de: "Polyester- und Stretchstrukturen für Teamwear, Training, Activewear und körpernahe Funktionsprodukte.",
      fr: "Structures polyester et extensibles pour tenues d’équipe, entraînement, activewear et produits ajustés.",
      nl: "Polyester- en stretchstructuren voor teamwear, training, activewear en aansluitende performanceproducten.",
    },
  },
  {
    id: "leather-suede",
    title: { en: "Leather, suede & linings", de: "Leder, Velours & Futter", fr: "Cuir, daim et doublures", nl: "Leer, suède en voeringen" },
    intro: {
      en: "Natural leather and supporting lining options for jackets, trousers, vests, accessories and selected Trachten products.",
      de: "Naturleder und passende Futteroptionen für Jacken, Hosen, Westen, Accessoires und ausgewählte Trachtenprodukte.",
      fr: "Cuirs naturels et doublures associées pour vestes, pantalons, gilets, accessoires et certains produits Trachten.",
      nl: "Natuurlijk leer en ondersteunende voeringen voor jassen, broeken, vesten, accessoires en geselecteerde Trachten-producten.",
    },
  },
];

const STRUCTURES: Record<string, LocalizedText> = {
  "single-jersey": { en: "Single jersey knit", de: "Single-Jersey-Strick", fr: "Maille jersey simple", nl: "Single jersey breisel" },
  interlock: { en: "Double-knit interlock", de: "Doppelstrick-Interlock", fr: "Interlock double maille", nl: "Dubbelgebreide interlock" },
  pique: { en: "Textured pique knit", de: "Strukturierter Piqué-Strick", fr: "Maille piquée texturée", nl: "Getextureerde piqué" },
  rib: { en: "Rib knit", de: "Rippstrick", fr: "Maille côtelée", nl: "Ribbreisel" },
  loopback: { en: "Loopback / terry knit", de: "Loopback-/Terry-Strick", fr: "Maille bouclette / terry", nl: "Loopback / terry breisel" },
  brushed: { en: "Brushed-back knit", de: "Innen angerauter Strick", fr: "Maille grattée intérieure", nl: "Aan binnenzijde geborsteld breisel" },
  "performance-interlock": { en: "Performance interlock knit", de: "Funktions-Interlock", fr: "Interlock technique", nl: "Performance-interlock" },
  mesh: { en: "Open or micro-mesh knit", de: "Offener oder Micro-Mesh-Strick", fr: "Maille ouverte ou micro-mesh", nl: "Open of micro-mesh breisel" },
  stretch: { en: "Four-way or controlled-stretch knit", de: "Vier-Wege- oder kontrollierter Stretchstrick", fr: "Maille extensible quatre sens ou contrôlée", nl: "Vierweg- of gecontroleerde stretch" },
  hide: { en: "Natural hide", de: "Naturhaut", fr: "Peau naturelle", nl: "Natuurlijke huid" },
  suede: { en: "Napped leather surface", de: "Geschliffene Lederoberfläche", fr: "Surface cuir veloutée", nl: "Geschuurd leeroppervlak" },
  lining: { en: "Woven or quilted lining construction", de: "Gewebte oder gesteppte Futterkonstruktion", fr: "Doublure tissée ou matelassée", nl: "Geweven of gewatteerde voering" },
};

const FINISHES: Record<string, LocalizedText> = {
  reactive: { en: "Reactive dyeing where suitable", de: "Reaktivfärbung, soweit geeignet", fr: "Teinture réactive si adaptée", nl: "Reactief verven waar geschikt" },
  bio: { en: "Bio or enzyme wash by order", de: "Bio- oder Enzymwäsche je Auftrag", fr: "Lavage bio ou enzymatique selon commande", nl: "Bio- of enzymwassing per order" },
  preshrunk: { en: "Pre-shrink treatment by specification", de: "Einlaufbehandlung nach Spezifikation", fr: "Traitement de pré-rétrécissement selon spécification", nl: "Voorgekrompen behandeling volgens specificatie" },
  brushed: { en: "Brushed inner surface", de: "Angeraute Innenseite", fr: "Face intérieure grattée", nl: "Geborstelde binnenzijde" },
  wash: { en: "Garment or pigment-wash discussion", de: "Prüfung von Garment- oder Pigmentwäsche", fr: "Étude lavage vêtement ou pigmentaire", nl: "Bespreking garment- of pigmentwash" },
  moisture: { en: "Moisture-management finish by programme", de: "Feuchtigkeitsmanagement je Programm", fr: "Finition gestion de l’humidité selon programme", nl: "Vochtregulerende afwerking per programma" },
  quickdry: { en: "Quick-dry option by programme", de: "Schnelltrocknende Option je Programm", fr: "Option séchage rapide selon programme", nl: "Sneldrogende optie per programma" },
  antipill: { en: "Anti-pilling review by specification", de: "Anti-Pilling-Prüfung nach Spezifikation", fr: "Étude anti-boulochage selon spécification", nl: "Anti-pilling beoordeling volgens specificatie" },
  leather: { en: "Colour, handle and surface finish confirmed from approved leather", de: "Farbe, Griff und Oberfläche werden am freigegebenen Leder bestätigt", fr: "Couleur, toucher et finition confirmés sur le cuir approuvé", nl: "Kleur, handgevoel en oppervlak worden op het goedgekeurde leer bevestigd" },
  lining: { en: "Plain, printed or quilted options by design", de: "Unifarben, bedruckt oder gesteppt je Design", fr: "Options unies, imprimées ou matelassées selon le modèle", nl: "Effen, bedrukt of gewatteerd volgens ontwerp" },
};

const USES: Record<string, LocalizedText> = {
  tees: { en: "T-shirts and tops", de: "T-Shirts und Tops", fr: "T-shirts et hauts", nl: "T-shirts en tops" },
  polos: { en: "Polos", de: "Poloshirts", fr: "Polos", nl: "Polo’s" },
  base: { en: "Base layers and fitted tops", de: "Basisschichten und körpernahe Tops", fr: "Couches de base et hauts ajustés", nl: "Basislagen en aansluitende tops" },
  cuffs: { en: "Collars, cuffs and waistbands", de: "Kragen, Bündchen und Taillenbänder", fr: "Cols, poignets et ceintures", nl: "Kragen, manchetten en taillebanden" },
  hoodies: { en: "Hoodies and sweatshirts", de: "Hoodies und Sweatshirts", fr: "Hoodies et sweats", nl: "Hoodies en sweatshirts" },
  joggers: { en: "Joggers, shorts and coordinated sets", de: "Jogger, Shorts und Sets", fr: "Joggings, shorts et ensembles", nl: "Joggers, shorts en sets" },
  teamwear: { en: "Teamwear and training tops", de: "Teamwear und Trainingstops", fr: "Tenues d’équipe et hauts d’entraînement", nl: "Teamwear en trainingstops" },
  activewear: { en: "Activewear and stretch products", de: "Activewear und Stretchprodukte", fr: "Activewear et produits extensibles", nl: "Activewear en stretchproducten" },
  panels: { en: "Ventilation panels and inserts", de: "Belüftungseinsätze und Panels", fr: "Panneaux de ventilation et empiècements", nl: "Ventilatiepanelen en inzetstukken" },
  compression: { en: "Compression and close-fit garments", de: "Kompressions- und körpernahe Bekleidung", fr: "Vêtements de compression et ajustés", nl: "Compressie- en nauwsluitende kleding" },
  jackets: { en: "Leather jackets, coats and vests", de: "Lederjacken, Mäntel und Westen", fr: "Vestes, manteaux et gilets en cuir", nl: "Leren jassen, mantels en vesten" },
  leatherBottoms: { en: "Leather trousers, skirts and shorts", de: "Lederhosen, Röcke und Shorts", fr: "Pantalons, jupes et shorts en cuir", nl: "Leren broeken, rokken en shorts" },
  trachten: { en: "Selected Lederhosen and Trachten details", de: "Ausgewählte Lederhosen und Trachtendetails", fr: "Certains Lederhosen et détails Trachten", nl: "Geselecteerde Lederhosen en Trachten-details" },
  accessories: { en: "Bags, gloves, belts and small accessories", de: "Taschen, Handschuhe, Gürtel und Kleinaccessoires", fr: "Sacs, gants, ceintures et petits accessoires", nl: "Tassen, handschoenen, riemen en kleine accessoires" },
  lining: { en: "Linings and insulation for outerwear", de: "Futter und Isolierung für Oberbekleidung", fr: "Doublures et isolation pour vêtements d’extérieur", nl: "Voeringen en isolatie voor bovenkleding" },
};

const CUSTOMIZATION: Record<string, LocalizedText> = {
  print: { en: "Screen, transfer or digital print subject to fabric testing", de: "Siebdruck, Transfer oder Digitaldruck nach Stoffprüfung", fr: "Sérigraphie, transfert ou impression numérique après essai matière", nl: "Zeefdruk, transfer of digitale print na stoftest" },
  embroidery: { en: "Embroidery subject to weight, backing and design", de: "Stickerei abhängig von Gewicht, Unterlage und Design", fr: "Broderie selon poids, renfort et dessin", nl: "Borduurwerk afhankelijk van gewicht, backing en ontwerp" },
  sublimation: { en: "Sublimation on suitable polyester structures", de: "Sublimation auf geeigneten Polyesterstrukturen", fr: "Sublimation sur structures polyester adaptées", nl: "Sublimatie op geschikte polyesterstructuren" },
  leather: { en: "Embroidery, patches, embossing or print evaluated on approved leather", de: "Stickerei, Patches, Prägung oder Druck werden am freigegebenen Leder geprüft", fr: "Broderie, écussons, embossage ou impression évalués sur le cuir approuvé", nl: "Borduurwerk, patches, reliëf of print beoordeeld op goedgekeurd leer" },
  lining: { en: "Printing and quilting depend on lining construction", de: "Druck und Steppung hängen von der Futterkonstruktion ab", fr: "Impression et matelassage selon la construction de doublure", nl: "Print en quilting hangen af van de voeringconstructie" },
};

const SOURCING: Record<string, LocalizedText> = {
  standard: {
    en: "Commonly reviewed for custom programmes; exact yarn, colour and minimum depend on the mill or stock position.",
    de: "Häufig für kundenspezifische Programme geprüft; Garn, Farbe und Mindestmenge hängen von Mühle oder Lagerbestand ab.",
    fr: "Couramment étudié pour les programmes sur mesure ; le fil, la couleur et le minimum dépendent du fabricant ou du stock.",
    nl: "Vaak beoordeeld voor maatwerkprogramma’s; garen, kleur en minimum hangen af van fabriek of voorraad.",
  },
  performance: {
    en: "Performance claims and finishes are confirmed only for the selected fabric and, where required, agreed testing.",
    de: "Funktionsaussagen und Ausrüstungen werden nur für den gewählten Stoff und gegebenenfalls vereinbarte Prüfungen bestätigt.",
    fr: "Les performances et finitions sont confirmées uniquement pour le tissu choisi et, si nécessaire, après essais convenus.",
    nl: "Prestatieclaims en afwerkingen worden alleen bevestigd voor de gekozen stof en, waar nodig, overeengekomen tests.",
  },
  leather: {
    en: "Hide type, grade, thickness, colour consistency and usable yield are confirmed from the approved lot or sample.",
    de: "Hautart, Qualität, Stärke, Farbkonsistenz und nutzbare Ausbeute werden anhand der freigegebenen Partie oder des Musters bestätigt.",
    fr: "Le type de peau, la qualité, l’épaisseur, la régularité de couleur et le rendement utile sont confirmés sur le lot ou l’échantillon approuvé.",
    nl: "Huidtype, kwaliteit, dikte, kleurconsistentie en bruikbare opbrengst worden bevestigd op basis van de goedgekeurde partij of het monster.",
  },
  lining: {
    en: "Lining and insulation are selected with the outer material, climate, garment construction and buyer requirement.",
    de: "Futter und Isolierung werden zusammen mit Obermaterial, Klima, Bekleidungskonstruktion und Käuferanforderung gewählt.",
    fr: "La doublure et l’isolation sont choisies selon la matière extérieure, le climat, la construction et l’exigence acheteur.",
    nl: "Voering en isolatie worden gekozen op basis van buitenmateriaal, klimaat, kledingconstructie en inkoperseis.",
  },
};

export type MaterialEntry = {
  id: string;
  family: MaterialFamilyId;
  name: LocalizedText;
  composition: string;
  weight: string;
  structure: keyof typeof STRUCTURES;
  finishes: ReadonlyArray<keyof typeof FINISHES>;
  uses: ReadonlyArray<keyof typeof USES>;
  customization: ReadonlyArray<keyof typeof CUSTOMIZATION>;
  sourcing: keyof typeof SOURCING;
};

export const MATERIALS: ReadonlyArray<MaterialEntry> = [
  { id: "combed-cotton-single-jersey", family: "cotton-jersey", name: { en: "Combed cotton single jersey", de: "Gekämmter Baumwoll-Single-Jersey", fr: "Jersey simple en coton peigné", nl: "Gekamd katoenen single jersey" }, composition: "Typically 100% cotton; blends by order", weight: "Typically 140–240 GSM", structure: "single-jersey", finishes: ["reactive", "bio", "preshrunk"], uses: ["tees", "base"], customization: ["print", "embroidery"], sourcing: "standard" },
  { id: "compact-cotton-single-jersey", family: "cotton-jersey", name: { en: "Compact cotton single jersey", de: "Kompakt-Baumwoll-Single-Jersey", fr: "Jersey simple en coton compact", nl: "Compact katoenen single jersey" }, composition: "Typically 100% compact-spun cotton", weight: "Typically 160–260 GSM", structure: "single-jersey", finishes: ["reactive", "bio", "preshrunk"], uses: ["tees", "base"], customization: ["print", "embroidery"], sourcing: "standard" },
  { id: "cotton-interlock", family: "cotton-jersey", name: { en: "Cotton interlock", de: "Baumwoll-Interlock", fr: "Interlock coton", nl: "Katoenen interlock" }, composition: "Typically cotton or cotton-rich blend", weight: "Typically 180–300 GSM", structure: "interlock", finishes: ["reactive", "bio", "preshrunk"], uses: ["tees", "polos", "base"], customization: ["print", "embroidery"], sourcing: "standard" },
  { id: "cotton-pique", family: "cotton-jersey", name: { en: "Cotton pique", de: "Baumwoll-Piqué", fr: "Piqué coton", nl: "Katoenen piqué" }, composition: "Typically cotton or cotton-polyester", weight: "Typically 180–260 GSM", structure: "pique", finishes: ["reactive", "bio", "preshrunk"], uses: ["polos"], customization: ["print", "embroidery"], sourcing: "standard" },
  { id: "rib-knit", family: "cotton-jersey", name: { en: "Rib knit", de: "Rippstrick", fr: "Maille côtelée", nl: "Ribbreisel" }, composition: "Cotton, cotton-elastane or blend by use", weight: "Typically 180–360 GSM", structure: "rib", finishes: ["reactive", "preshrunk"], uses: ["cuffs", "base"], customization: ["print", "embroidery"], sourcing: "standard" },
  { id: "cotton-elastane-jersey", family: "cotton-jersey", name: { en: "Cotton-elastane jersey", de: "Baumwoll-Elastan-Jersey", fr: "Jersey coton-élasthanne", nl: "Katoen-elastaan jersey" }, composition: "Commonly cotton with a small elastane percentage", weight: "Typically 170–300 GSM", structure: "stretch", finishes: ["reactive", "bio", "preshrunk"], uses: ["tees", "base", "activewear"], customization: ["print", "embroidery"], sourcing: "standard" },
  { id: "french-terry", family: "fleece", name: { en: "French terry", de: "French Terry", fr: "French terry", nl: "French terry" }, composition: "Cotton, cotton-rich or cotton-polyester", weight: "Typically 240–420 GSM", structure: "loopback", finishes: ["reactive", "bio", "preshrunk", "wash"], uses: ["hoodies", "joggers"], customization: ["print", "embroidery"], sourcing: "standard" },
  { id: "heavy-loopback", family: "fleece", name: { en: "Heavy loopback", de: "Schwerer Loopback", fr: "Bouclette lourde", nl: "Zware loopback" }, composition: "Cotton-rich or cotton-polyester by programme", weight: "Typically 320–480 GSM", structure: "loopback", finishes: ["reactive", "bio", "preshrunk", "wash"], uses: ["hoodies", "joggers"], customization: ["print", "embroidery"], sourcing: "standard" },
  { id: "brushed-fleece", family: "fleece", name: { en: "Brushed fleece", de: "Angerauter Fleece", fr: "Molleton gratté", nl: "Geborstelde fleece" }, composition: "Cotton, cotton-rich or cotton-polyester", weight: "Typically 280–500 GSM", structure: "brushed", finishes: ["brushed", "antipill", "preshrunk"], uses: ["hoodies", "joggers"], customization: ["print", "embroidery"], sourcing: "standard" },
  { id: "heavyweight-fleece", family: "fleece", name: { en: "Heavyweight fleece", de: "Schwerer Fleece", fr: "Molleton lourd", nl: "Zware fleece" }, composition: "Cotton-rich or cotton-polyester by construction", weight: "Typically 400–600 GSM", structure: "brushed", finishes: ["brushed", "antipill", "preshrunk"], uses: ["hoodies", "joggers"], customization: ["print", "embroidery"], sourcing: "standard" },
  { id: "cotton-polyester-fleece", family: "fleece", name: { en: "Cotton-polyester fleece", de: "Baumwoll-Polyester-Fleece", fr: "Molleton coton-polyester", nl: "Katoen-polyester fleece" }, composition: "Cotton-polyester ratio selected by programme", weight: "Typically 280–450 GSM", structure: "brushed", finishes: ["brushed", "antipill", "preshrunk"], uses: ["hoodies", "joggers"], customization: ["print", "embroidery"], sourcing: "standard" },
  { id: "polyester-interlock", family: "performance", name: { en: "Polyester interlock", de: "Polyester-Interlock", fr: "Interlock polyester", nl: "Polyester interlock" }, composition: "Typically 100% polyester", weight: "Typically 130–220 GSM", structure: "performance-interlock", finishes: ["moisture", "quickdry"], uses: ["teamwear", "activewear"], customization: ["sublimation", "print", "embroidery"], sourcing: "performance" },
  { id: "polyester-elastane", family: "performance", name: { en: "Polyester-elastane knit", de: "Polyester-Elastan-Strick", fr: "Maille polyester-élasthanne", nl: "Polyester-elastaan breisel" }, composition: "Polyester with elastane percentage selected by stretch target", weight: "Typically 180–300 GSM", structure: "stretch", finishes: ["moisture", "quickdry"], uses: ["activewear", "compression"], customization: ["sublimation", "print", "embroidery"], sourcing: "performance" },
  { id: "performance-mesh", family: "performance", name: { en: "Performance mesh", de: "Funktions-Mesh", fr: "Mesh technique", nl: "Performance mesh" }, composition: "Typically polyester; stretch versions by order", weight: "Typically 90–180 GSM", structure: "mesh", finishes: ["moisture", "quickdry"], uses: ["panels", "teamwear"], customization: ["sublimation", "print"], sourcing: "performance" },
  { id: "moisture-management-knit", family: "performance", name: { en: "Moisture-management knit", de: "Feuchtigkeitsregulierender Strick", fr: "Maille à gestion de l’humidité", nl: "Vochtregulerend breisel" }, composition: "Polyester or polyester blend selected by programme", weight: "Typically 130–220 GSM", structure: "performance-interlock", finishes: ["moisture", "quickdry"], uses: ["teamwear", "activewear"], customization: ["sublimation", "print", "embroidery"], sourcing: "performance" },
  { id: "compression-stretch", family: "performance", name: { en: "Compression stretch fabric", de: "Kompressions-Stretchstoff", fr: "Tissu stretch de compression", nl: "Compressie-stretchstof" }, composition: "Polyester or nylon blend with elastane by target recovery", weight: "Typically 220–320 GSM", structure: "stretch", finishes: ["moisture", "quickdry"], uses: ["compression", "activewear"], customization: ["print", "sublimation"], sourcing: "performance" },
  { id: "cowhide-leather", family: "leather-suede", name: { en: "Cowhide leather", de: "Rindsleder", fr: "Cuir bovin", nl: "Rundleer" }, composition: "Natural cowhide", weight: "Typically discussed by thickness, about 0.9–1.3 mm", structure: "hide", finishes: ["leather"], uses: ["jackets", "leatherBottoms", "accessories"], customization: ["leather"], sourcing: "leather" },
  { id: "sheep-leather", family: "leather-suede", name: { en: "Sheep leather", de: "Schafleder", fr: "Cuir de mouton", nl: "Schapenleer" }, composition: "Natural sheep leather", weight: "Typically discussed by thickness, about 0.7–1.0 mm", structure: "hide", finishes: ["leather"], uses: ["jackets", "leatherBottoms"], customization: ["leather"], sourcing: "leather" },
  { id: "goat-leather", family: "leather-suede", name: { en: "Goat leather", de: "Ziegenleder", fr: "Cuir de chèvre", nl: "Geitenleer" }, composition: "Natural goat leather", weight: "Typically discussed by thickness, about 0.8–1.1 mm", structure: "hide", finishes: ["leather"], uses: ["jackets", "trachten", "accessories"], customization: ["leather"], sourcing: "leather" },
  { id: "suede-options", family: "leather-suede", name: { en: "Suede options", de: "Veloursleder-Optionen", fr: "Options daim", nl: "Suède-opties" }, composition: "Cow, sheep or goat suede according to product", weight: "Thickness confirmed from the approved sample or lot", structure: "suede", finishes: ["leather"], uses: ["jackets", "trachten", "accessories"], customization: ["leather"], sourcing: "leather" },
  { id: "outerwear-linings", family: "leather-suede", name: { en: "Outerwear linings & insulation", de: "Oberbekleidungsfutter & Isolierung", fr: "Doublures et isolation outerwear", nl: "Voeringen en isolatie voor bovenkleding" }, composition: "Polyester, cotton-blend or insulation system by design", weight: "Typically 50–200 GSM; construction dependent", structure: "lining", finishes: ["lining"], uses: ["lining"], customization: ["lining"], sourcing: "lining" },
];

export function materialDetail(entry: MaterialEntry, locale: LocaleCode) {
  return {
    structure: STRUCTURES[entry.structure][locale],
    finishes: entry.finishes.map((key) => FINISHES[key][locale]),
    uses: entry.uses.map((key) => USES[key][locale]),
    customization: entry.customization.map((key) => CUSTOMIZATION[key][locale]),
    sourcing: SOURCING[entry.sourcing][locale],
  };
}

export const BUYER_INFORMATION_COPY = {
  en: {
    eyebrow: "Buyer Information",
    title: "Clear commercial information before sampling and production.",
    intro: "Irha Apparels provides a practical information layer for private-label, OEM and ODM buyers. Every final commitment is confirmed against the actual product, material, quantity, destination and written commercial scope.",
    navLabel: "Buyer information sections",
    sections: {
      story: {
        label: "Company story",
        title: "A Sialkot-based manufacturing and sourcing partner.",
        paragraphs: [
          "Irha Apparels works with brands, wholesalers, clubs, retailers and sourcing buyers on made-to-requirement apparel programmes from Sialkot, Pakistan.",
          "The working approach centres on product development, direct buyer communication and coordination of materials, construction, branding, labels and packaging. The aim is a documented production path rather than a generic catalogue promise.",
          "Buyers can schedule a live factory and workmanship video call to discuss the programme and view relevant production activity without exposing another customer’s confidential information.",
          "The business is focused on long-term manufacturing relationships built through clear approvals, realistic quotations and order-specific commitments.",
        ],
      },
      logistics: {
        label: "Shipping & Incoterms",
        title: "Delivery responsibility is agreed in the quotation.",
        intro: "Shipping terms are confirmed according to destination, order size, customs requirements and the buyer’s preferred delivery method.",
        terms: [
          ["EXW", "The buyer arranges collection and onward transport from the agreed handover point."],
          ["FOB", "Irha Apparels can evaluate export delivery to the agreed Pakistani port or handover point; the named place and responsibility are written in the quotation."],
          ["CIF", "Cost, insurance and freight to the named destination port may be quoted where suitable; destination clearance and local charges remain defined in writing."],
          ["DDP", "Door-delivered terms may be evaluated for selected destinations and shipment profiles. Availability, duties, customs handling and final-mile responsibility are never assumed."],
        ],
        modes: [
          "Samples may be dispatched by an appropriate international courier or air service after carrier availability and destination acceptance are checked.",
          "Bulk shipments may use air cargo or sea freight according to volume, urgency, destination and commercial terms.",
          "Export routing may use suitable Pakistani airports, dry ports or seaports. Karachi routing may be used for applicable sea shipments.",
          "Commercial invoices, packing lists and other required shipment documents are reviewed for the specific order and destination.",
        ],
        timelineTitle: "Keep four timelines separate",
        timelines: ["Sample development", "Sample transit", "Bulk production", "Freight and customs transit"],
        timelineNote: "Any timing shown in a quotation is an estimate based on product complexity, material availability, buyer approvals, quantity, destination and customs conditions. No single universal delivery time applies.",
      },
      confidentiality: {
        label: "Confidentiality & NDA",
        title: "Sensitive design information can be handled under an agreed process.",
        points: [
          "Tech packs, artwork, measurements, patterns, branding, packaging concepts and commercial information are used for quotation, development and production handling.",
          "Private buyer design files are not intended for public catalogue use without permission.",
          "Access is limited to the commercial and production handling relevant to the requested programme.",
          "NDA review and signing can be requested before sensitive files are shared. The exact legal terms, jurisdiction, retention and deletion obligations must be agreed in writing.",
          "Only upload material that you are authorised to share. Website data and file handling remain subject to the published privacy policy and the written order terms.",
        ],
        cta: "Request an NDA before sharing sensitive files",
      },
      sustainability: {
        label: "Sustainability options",
        title: "Responsible-material choices are order-specific, not a blanket company claim.",
        points: [
          "Organic cotton may be sourced for suitable programmes subject to availability, minimums and applicable documentation.",
          "Recycled polyester or other recycled-content options may be reviewed for the selected product and supply chain.",
          "Recycled, reduced-plastic or simplified packaging can be discussed during quotation.",
          "Durable construction, practical order-quantity planning and approval controls can help reduce avoidable remakes and surplus.",
          "Lower-impact dyeing, finishing or responsible-material alternatives can be evaluated with the selected supplier and specification.",
          "Material testing or supporting documentation is arranged only where agreed for the order; a material claim is not published without applicable evidence.",
        ],
      },
      compliance: {
        label: "Compliance & documentation requirements",
        title: "Requirements are evaluated before order confirmation.",
        points: [
          "Buyer manuals, destination-market requirements and required documents should be shared before sampling or quotation approval.",
          "Material or product testing may be arranged where the scope, laboratory, timing and cost are agreed.",
          "Buyer-specific documentation can be discussed for the actual material, product, facility and shipment.",
          "Third-party audit or certification requirements depend on the facility, product, scope, timeline and written commercial agreement.",
          "Standards sometimes requested by buyers include ISO, OEKO-TEX, SEDEX, WRAP, BSCI, GOTS and GRS. Their mention is not a claim that Irha Apparels currently holds them.",
          "A certificate is shared only when it is valid, applicable to the specific order and authorised for that use.",
        ],
        note: "Certification or third-party compliance requirements can be evaluated for the specific order.",
      },
    },
    rfq: "Start a qualified inquiry",
    materials: "Browse materials",
    factoryCall: "Schedule a live factory call",
    privacy: "Read privacy policy",
    compliancePage: "Open compliance review page",
  },
  de: {
    eyebrow: "Informationen für Einkäufer",
    title: "Klare kaufmännische Informationen vor Musterung und Produktion.",
    intro: "Irha Apparels stellt Private-Label-, OEM- und ODM-Einkäufern eine praktische Informationsbasis bereit. Jede endgültige Zusage wird anhand von Produkt, Material, Menge, Zielort und schriftlichem Leistungsumfang bestätigt.",
    navLabel: "Bereiche der Einkäuferinformationen",
    sections: {
      story: { label: "Unternehmensprofil", title: "Ein Fertigungs- und Beschaffungspartner aus Sialkot.", paragraphs: ["Irha Apparels arbeitet von Sialkot, Pakistan, aus mit Marken, Großhändlern, Vereinen, Einzelhändlern und Beschaffungspartnern an kundenspezifischen Bekleidungsprogrammen.", "Der Arbeitsansatz konzentriert sich auf Produktentwicklung, direkte Käuferkommunikation und die Koordination von Materialien, Konstruktion, Branding, Etiketten und Verpackung. Ziel ist ein dokumentierter Produktionsweg statt eines allgemeinen Katalogversprechens.", "Einkäufer können einen Live-Videoanruf zur Fabrik und Verarbeitung vereinbaren, um das Programm zu besprechen und relevante Produktionsaktivitäten zu sehen, ohne vertrauliche Informationen anderer Kunden offenzulegen.", "Das Unternehmen konzentriert sich auf langfristige Fertigungsbeziehungen durch klare Freigaben, realistische Angebote und auftragsspezifische Zusagen."] },
      logistics: { label: "Versand & Incoterms", title: "Die Lieferverantwortung wird im Angebot vereinbart.", intro: "Versandbedingungen werden nach Zielort, Auftragsgröße, Zollanforderungen und bevorzugter Liefermethode bestätigt.", terms: [["EXW", "Der Käufer organisiert Abholung und Weitertransport ab dem vereinbarten Übergabepunkt."], ["FOB", "Irha Apparels kann die Ausfuhrlieferung bis zum vereinbarten pakistanischen Hafen oder Übergabepunkt prüfen; benannter Ort und Verantwortung stehen im Angebot."], ["CIF", "Kosten, Versicherung und Fracht bis zum benannten Zielhafen können bei Eignung angeboten werden; Zielverzollung und lokale Kosten werden schriftlich definiert."], ["DDP", "Eine Lieferung bis zur Tür kann für ausgewählte Ziele und Sendungsprofile geprüft werden. Verfügbarkeit, Abgaben, Zollabwicklung und letzte Meile werden niemals vorausgesetzt."]], modes: ["Muster können nach Prüfung von Verfügbarkeit und Annahme am Zielort über einen geeigneten internationalen Kurier- oder Luftdienst versendet werden.", "Massensendungen können je nach Volumen, Dringlichkeit, Zielort und Handelsbedingung per Luftfracht oder Seefracht erfolgen.", "Exportwege können geeignete pakistanische Flughäfen, Dry Ports oder Seehäfen nutzen. Für passende Seesendungen kann Karachi genutzt werden.", "Handelsrechnung, Packliste und weitere erforderliche Versanddokumente werden für Auftrag und Zielort geprüft."], timelineTitle: "Vier Zeitabschnitte getrennt betrachten", timelines: ["Musterentwicklung", "Mustertransport", "Serienproduktion", "Fracht- und Zolltransport"], timelineNote: "Zeitangaben im Angebot sind Schätzungen auf Basis von Produktkomplexität, Materialverfügbarkeit, Käuferfreigaben, Menge, Zielort und Zollbedingungen. Es gilt keine einheitliche Lieferzeit." },
      confidentiality: { label: "Vertraulichkeit & NDA", title: "Sensible Designinformationen können nach einem vereinbarten Verfahren behandelt werden.", points: ["Tech Packs, Grafiken, Maße, Schnittmuster, Branding, Verpackungskonzepte und kaufmännische Informationen werden für Angebot, Entwicklung und Produktion verwendet.", "Private Designdateien des Käufers sind ohne Erlaubnis nicht für einen öffentlichen Katalog vorgesehen.", "Der Zugriff wird auf die für das Programm relevante kaufmännische und produktionstechnische Bearbeitung begrenzt.", "Vor dem Austausch sensibler Dateien kann eine NDA-Prüfung und Unterzeichnung angefragt werden. Rechtswahl, Aufbewahrung und Löschung müssen schriftlich vereinbart werden.", "Laden Sie nur Material hoch, das Sie weitergeben dürfen. Website- und Dateiverarbeitung unterliegen der Datenschutzrichtlinie und den schriftlichen Auftragsbedingungen."], cta: "NDA vor dem Teilen sensibler Dateien anfragen" },
      sustainability: { label: "Nachhaltigkeitsoptionen", title: "Verantwortungsvollere Materialoptionen sind auftragsspezifisch und keine pauschale Unternehmensbehauptung.", points: ["Bio-Baumwolle kann für geeignete Programme vorbehaltlich Verfügbarkeit, Mindestmengen und Dokumentation beschafft werden.", "Recyceltes Polyester oder andere Recyclinganteile können für Produkt und Lieferkette geprüft werden.", "Recycelte, kunststoffreduzierte oder vereinfachte Verpackung kann im Angebot besprochen werden.", "Langlebige Konstruktion, realistische Mengenplanung und Freigabekontrollen können vermeidbare Nacharbeit und Überschuss reduzieren.", "Weniger belastende Färbe-, Ausrüstungs- oder Materialalternativen können mit Lieferant und Spezifikation geprüft werden.", "Materialprüfungen oder Nachweise werden nur nach Vereinbarung für den Auftrag organisiert; Materialaussagen werden nicht ohne passende Belege veröffentlicht."] },
      compliance: { label: "Compliance- und Dokumentationsanforderungen", title: "Anforderungen werden vor Auftragsbestätigung bewertet.", points: ["Käuferhandbücher, Zielmarktanforderungen und benötigte Dokumente sollten vor Musterung oder Angebotsfreigabe geteilt werden.", "Material- oder Produktprüfungen können organisiert werden, wenn Umfang, Labor, Zeit und Kosten vereinbart sind.", "Käuferspezifische Dokumentation kann für Material, Produkt, Betrieb und Sendung besprochen werden.", "Drittaudits oder Zertifizierungsanforderungen hängen von Betrieb, Produkt, Umfang, Zeitplan und schriftlicher Vereinbarung ab.", "Von Käufern gelegentlich genannte Standards sind ISO, OEKO-TEX, SEDEX, WRAP, BSCI, GOTS und GRS. Die Nennung bedeutet nicht, dass Irha Apparels sie aktuell besitzt.", "Ein Zertifikat wird nur geteilt, wenn es gültig, für den Auftrag anwendbar und für diese Nutzung freigegeben ist."], note: "Zertifizierungs- oder Drittanbieter-Compliance-Anforderungen können für den konkreten Auftrag bewertet werden." },
    },
    rfq: "Qualifizierte Anfrage starten", materials: "Materialien ansehen", factoryCall: "Live-Fabrikanruf planen", privacy: "Datenschutzrichtlinie lesen", compliancePage: "Compliance-Prüfung öffnen",
  },
  fr: {
    eyebrow: "Informations acheteurs",
    title: "Des informations commerciales claires avant l’échantillonnage et la production.",
    intro: "Irha Apparels fournit une base d’information pratique aux acheteurs marque blanche, OEM et ODM. Tout engagement final est confirmé selon le produit, la matière, la quantité, la destination et le périmètre commercial écrit.",
    navLabel: "Sections d’information acheteurs",
    sections: {
      story: { label: "Présentation de l’entreprise", title: "Un partenaire de fabrication et de sourcing basé à Sialkot.", paragraphs: ["Irha Apparels accompagne depuis Sialkot, au Pakistan, des marques, grossistes, clubs, détaillants et acheteurs sourcing sur des programmes de vêtements fabriqués selon cahier des charges.", "La méthode repose sur le développement produit, la communication directe avec l’acheteur et la coordination des matières, de la construction, du branding, des étiquettes et de l’emballage. L’objectif est un parcours de production documenté, pas une promesse générique de catalogue.", "Les acheteurs peuvent planifier un appel vidéo en direct sur l’usine et le savoir-faire pour discuter du programme et voir une activité de production pertinente sans exposer les informations confidentielles d’un autre client.", "L’entreprise vise des relations de fabrication durables grâce à des validations claires, des devis réalistes et des engagements propres à chaque commande."] },
      logistics: { label: "Livraison et Incoterms", title: "Les responsabilités de livraison sont convenues dans le devis.", intro: "Les conditions d’expédition sont confirmées selon la destination, le volume, les exigences douanières et le mode de livraison préféré.", terms: [["EXW", "L’acheteur organise l’enlèvement et le transport à partir du point de remise convenu."], ["FOB", "Irha Apparels peut étudier la livraison export jusqu’au port ou point de remise pakistanais convenu ; le lieu nommé et les responsabilités figurent dans le devis."], ["CIF", "Le coût, l’assurance et le fret jusqu’au port de destination nommé peuvent être chiffrés lorsque cela convient ; le dédouanement à destination et les frais locaux sont définis par écrit."], ["DDP", "Une livraison droits acquittés peut être étudiée pour certaines destinations et certains profils d’envoi. Disponibilité, droits, douane et dernier kilomètre ne sont jamais supposés."]], modes: ["Les échantillons peuvent être expédiés par un service international de messagerie ou aérien approprié après vérification de la disponibilité et de l’acceptation à destination.", "Les commandes en volume peuvent partir par fret aérien ou maritime selon le volume, l’urgence, la destination et les conditions commerciales.", "Le routage export peut utiliser des aéroports, ports secs ou ports maritimes pakistanais adaptés. Karachi peut être utilisé pour les expéditions maritimes concernées.", "Facture commerciale, liste de colisage et autres documents requis sont étudiés pour la commande et la destination."], timelineTitle: "Séparer quatre délais", timelines: ["Développement de l’échantillon", "Transit de l’échantillon", "Production en série", "Fret et transit douanier"], timelineNote: "Tout délai indiqué dans un devis est une estimation liée à la complexité, à la disponibilité matière, aux validations, à la quantité, à la destination et aux douanes. Aucun délai universel ne s’applique." },
      confidentiality: { label: "Confidentialité et NDA", title: "Les informations de design sensibles peuvent suivre un processus convenu.", points: ["Dossiers techniques, dessins, mesures, patrons, branding, concepts d’emballage et informations commerciales sont utilisés pour le devis, le développement et la production.", "Les fichiers de design privés de l’acheteur ne sont pas destinés au catalogue public sans autorisation.", "L’accès est limité au traitement commercial et de production nécessaire au programme demandé.", "Un examen et une signature de NDA peuvent être demandés avant le partage de fichiers sensibles. Les termes juridiques, la juridiction, la conservation et la suppression doivent être convenus par écrit.", "Ne téléversez que des éléments que vous êtes autorisé à partager. Le traitement du site et des fichiers reste soumis à la politique de confidentialité et aux conditions écrites de la commande."], cta: "Demander un NDA avant de partager des fichiers sensibles" },
      sustainability: { label: "Options de durabilité", title: "Les choix de matières responsables sont propres à la commande, pas une affirmation générale de l’entreprise.", points: ["Le coton biologique peut être sourcé pour des programmes adaptés sous réserve de disponibilité, de minimums et de documentation applicable.", "Le polyester recyclé ou d’autres options à contenu recyclé peuvent être étudiés pour le produit et la chaîne d’approvisionnement retenus.", "Un emballage recyclé, réduit en plastique ou simplifié peut être discuté au devis.", "Une construction durable, une planification réaliste des quantités et des validations peuvent limiter les reprises et surplus évitables.", "Des options de teinture, de finition ou de matière à impact réduit peuvent être évaluées avec le fournisseur et la spécification choisis.", "Les essais matière ou documents justificatifs sont organisés uniquement lorsqu’ils sont convenus pour la commande ; aucune allégation matière n’est publiée sans preuve applicable."] },
      compliance: { label: "Exigences de conformité et documentation", title: "Les exigences sont évaluées avant confirmation de commande.", points: ["Les manuels acheteurs, exigences du marché de destination et documents requis doivent être partagés avant l’échantillonnage ou la validation du devis.", "Des essais matière ou produit peuvent être organisés lorsque le périmètre, le laboratoire, le délai et le coût sont convenus.", "Une documentation propre à l’acheteur peut être discutée pour la matière, le produit, le site et l’expédition réels.", "Les audits tiers ou exigences de certification dépendent du site, du produit, du périmètre, du calendrier et de l’accord commercial écrit.", "Les normes parfois demandées incluent ISO, OEKO-TEX, SEDEX, WRAP, BSCI, GOTS et GRS. Leur mention ne signifie pas qu’Irha Apparels les détient actuellement.", "Un certificat n’est partagé que s’il est valide, applicable à la commande et autorisé pour cet usage."], note: "Les exigences de certification ou de conformité tierce peuvent être évaluées pour la commande concernée." },
    },
    rfq: "Démarrer une demande qualifiée", materials: "Voir les matières", factoryCall: "Planifier un appel vidéo usine", privacy: "Lire la politique de confidentialité", compliancePage: "Ouvrir la page conformité",
  },
  nl: {
    eyebrow: "Informatie voor inkopers",
    title: "Duidelijke commerciële informatie vóór bemonstering en productie.",
    intro: "Irha Apparels biedt private-label-, OEM- en ODM-inkopers een praktische informatielaag. Elke definitieve toezegging wordt bevestigd op basis van product, materiaal, hoeveelheid, bestemming en schriftelijk commercieel bereik.",
    navLabel: "Onderdelen van inkopersinformatie",
    sections: {
      story: { label: "Bedrijfsverhaal", title: "Een productie- en sourcingpartner uit Sialkot.", paragraphs: ["Irha Apparels werkt vanuit Sialkot, Pakistan, met merken, groothandels, clubs, retailers en sourcinginkopers aan kledingprogramma’s op specificatie.", "De werkwijze draait om productontwikkeling, directe communicatie met de inkoper en coördinatie van materialen, constructie, branding, labels en verpakking. Het doel is een gedocumenteerd productiepad, geen algemene catalogusbelofte.", "Inkopers kunnen een live videogesprek over fabriek en vakmanschap plannen om het programma te bespreken en relevante productieactiviteiten te bekijken zonder vertrouwelijke informatie van een andere klant te tonen.", "Het bedrijf richt zich op langdurige productierelaties via duidelijke goedkeuringen, realistische offertes en orderspecifieke toezeggingen."] },
      logistics: { label: "Verzending en Incoterms", title: "Leveringsverantwoordelijkheid wordt in de offerte afgesproken.", intro: "Verzendvoorwaarden worden bevestigd volgens bestemming, ordergrootte, douane-eisen en de voorkeursmethode van de inkoper.", terms: [["EXW", "De inkoper organiseert afhaling en verder transport vanaf het overeengekomen overdrachtspunt."], ["FOB", "Irha Apparels kan exportlevering tot de afgesproken Pakistaanse haven of overdrachtsplaats beoordelen; genoemde plaats en verantwoordelijkheid worden in de offerte vastgelegd."], ["CIF", "Kosten, verzekering en vracht tot de genoemde bestemmingshaven kunnen waar passend worden geoffreerd; inklaring op bestemming en lokale kosten worden schriftelijk bepaald."], ["DDP", "Deurlevering kan voor geselecteerde bestemmingen en zendingprofielen worden beoordeeld. Beschikbaarheid, heffingen, douaneafhandeling en laatste kilometer worden nooit verondersteld."]], modes: ["Monsters kunnen via een passende internationale koerier of luchtservice worden verzonden nadat beschikbaarheid en acceptatie op bestemming zijn gecontroleerd.", "Bulkzendingen kunnen per luchtvracht of zeevracht gaan op basis van volume, urgentie, bestemming en handelsvoorwaarden.", "Exportroutes kunnen geschikte Pakistaanse luchthavens, dry ports of zeehavens gebruiken. Voor passende zeezendingen kan Karachi worden gebruikt.", "Handelsfactuur, paklijst en andere vereiste verzenddocumenten worden voor de specifieke order en bestemming beoordeeld."], timelineTitle: "Houd vier tijdlijnen gescheiden", timelines: ["Monsterontwikkeling", "Transport van het monster", "Bulkproductie", "Vracht- en douanetransit"], timelineNote: "Elke tijd in een offerte is een schatting op basis van productcomplexiteit, materiaalbeschikbaarheid, goedkeuringen, hoeveelheid, bestemming en douane. Er geldt geen universele levertijd." },
      confidentiality: { label: "Vertrouwelijkheid en NDA", title: "Gevoelige ontwerpinformatie kan volgens een afgesproken proces worden behandeld.", points: ["Tech packs, artwork, maten, patronen, branding, verpakkingsconcepten en commerciële informatie worden gebruikt voor offerte, ontwikkeling en productieafhandeling.", "Privé-ontwerpbestanden van de inkoper zijn zonder toestemming niet bedoeld voor de openbare catalogus.", "Toegang wordt beperkt tot de commerciële en productieafhandeling die voor het programma relevant is.", "Een NDA-beoordeling en ondertekening kan vóór het delen van gevoelige bestanden worden aangevraagd. Juridische voorwaarden, rechtsgebied, bewaring en verwijdering moeten schriftelijk worden afgesproken.", "Upload alleen materiaal dat u mag delen. Website- en bestandsverwerking blijven onder de privacyverklaring en schriftelijke ordervoorwaarden vallen."], cta: "Vraag een NDA aan voordat u gevoelige bestanden deelt" },
      sustainability: { label: "Duurzaamheidsopties", title: "Verantwoordere materiaalkeuzes zijn orderspecifiek, geen algemene bedrijfsclaim.", points: ["Biologisch katoen kan voor geschikte programma’s worden ingekocht onder voorbehoud van beschikbaarheid, minimumaantallen en toepasselijke documentatie.", "Gerecycled polyester of andere opties met gerecyclede inhoud kunnen voor het gekozen product en de keten worden beoordeeld.", "Gerecyclede, plasticarme of vereenvoudigde verpakking kan tijdens de offerte worden besproken.", "Duurzame constructie, praktische hoeveelheidsplanning en goedkeuringscontroles kunnen vermijdbare herproductie en overschot beperken.", "Opties voor lagere-impact verfprocessen, afwerking of materialen kunnen met de gekozen leverancier en specificatie worden beoordeeld.", "Materiaaltests of ondersteunende documentatie worden alleen geregeld waar dit voor de order is afgesproken; een materiaalclaim wordt niet zonder passend bewijs gepubliceerd."] },
      compliance: { label: "Compliance- en documentatie-eisen", title: "Eisen worden vóór orderbevestiging beoordeeld.", points: ["Inkopershandleidingen, eisen van de bestemmingsmarkt en vereiste documenten moeten vóór bemonstering of offertegoedkeuring worden gedeeld.", "Materiaal- of producttests kunnen worden geregeld wanneer bereik, laboratorium, timing en kosten zijn afgesproken.", "Inkoperspecifieke documentatie kan voor het werkelijke materiaal, product, de faciliteit en zending worden besproken.", "Externe audit- of certificeringseisen hangen af van faciliteit, product, bereik, planning en schriftelijke commerciële overeenkomst.", "Normen die inkopers soms vragen zijn ISO, OEKO-TEX, SEDEX, WRAP, BSCI, GOTS en GRS. Vermelding betekent niet dat Irha Apparels deze momenteel bezit.", "Een certificaat wordt alleen gedeeld als het geldig, voor de order toepasbaar en voor dit gebruik toegestaan is."], note: "Certificerings- of externe compliance-eisen kunnen voor de specifieke order worden beoordeeld." },
    },
    rfq: "Gekwalificeerde aanvraag starten", materials: "Materialen bekijken", factoryCall: "Live fabrieksgesprek plannen", privacy: "Privacyverklaring lezen", compliancePage: "Compliancepagina openen",
  },
} as const;

export const CAPABILITY_REGISTER = [
  { area: "Sialkot manufacturing and sourcing base", classification: "verified-current", source: "Public identity, About page and approved business summary" },
  { area: "Private-label, OEM and ODM buyer programmes", classification: "verified-current", source: "Current public website and approved business summary" },
  { area: "Live factory/workmanship video call by appointment", classification: "verified-current", source: "Current About and factory-video-call journeys" },
  { area: "Cotton, fleece, performance, leather and suede sourcing directions", classification: "commonly-offered-subject-to-sourcing", source: "Current product scope and material requirements used in buyer programmes" },
  { area: "Exact composition, GSM, colour, finish, MOQ and lead time", classification: "order-specific", source: "Confirmed during sampling and quotation" },
  { area: "EXW, FOB and CIF commercial terms", classification: "order-specific", source: "Existing buyer-resource and quotation wording" },
  { area: "DDP delivery", classification: "third-party-dependent", source: "Destination, customs, carrier and shipment dependent" },
  { area: "NDA review and signing", classification: "order-specific", source: "Available by written request before sensitive file sharing" },
  { area: "Organic, recycled and lower-impact material options", classification: "commonly-offered-subject-to-sourcing", source: "Supplier availability and programme documentation dependent" },
  { area: "Testing, audits and certification requirements", classification: "third-party-dependent", source: "Facility, laboratory, standard, scope and written agreement dependent" },
  { area: "Current ownership of ISO, OEKO-TEX, SEDEX, WRAP, BSCI, GOTS or GRS", classification: "prohibited", source: "No authenticated evidence approved for publication" },
  { area: "Fixed universal delivery time, courier, port, MOQ or capacity", classification: "prohibited", source: "Varies by programme and is not supported as a blanket claim" },
] as const satisfies ReadonlyArray<{ area: string; classification: CapabilityClassification; source: string }>;
