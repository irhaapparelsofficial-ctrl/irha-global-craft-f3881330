export type TaxonomyLocale = "en" | "de" | "fr" | "es";

export const TAXONOMY_LOCALES: Array<{
  code: TaxonomyLocale;
  label: string;
  hreflang: string;
  htmlLang: string;
  direction: "ltr" | "rtl";
}> = [
  { code: "en", label: "English", hreflang: "en", htmlLang: "en-US", direction: "ltr" },
  { code: "de", label: "Deutsch", hreflang: "de", htmlLang: "de-DE", direction: "ltr" },
  { code: "fr", label: "Français", hreflang: "fr", htmlLang: "fr-FR", direction: "ltr" },
  { code: "es", label: "Español", hreflang: "es", htmlLang: "es-ES", direction: "ltr" },
];

export function isTaxonomyLocale(value?: string): value is TaxonomyLocale {
  return Boolean(value && TAXONOMY_LOCALES.some((locale) => locale.code === value));
}

const UI = {
  en: {
    home: "Home",
    collections: "Collections",
    audiences: "Shop by buyer program",
    productCategories: "Product categories",
    products: "Products",
    styles: "styles",
    viewCollection: "View collection",
    requestQuote: "Request a quote",
    viewProduct: "View product",
    otherLanguages: "Language",
    programNote: "Materials, branding, sampling, packaging and commercial terms are confirmed against the approved buyer brief.",
    empty: "This program is available by buyer specification. Send your reference or requirements for review.",
  },
  de: {
    home: "Startseite",
    collections: "Kollektionen",
    audiences: "Nach Käuferprogramm",
    productCategories: "Produktkategorien",
    products: "Produkte",
    styles: "Modelle",
    viewCollection: "Kollektion ansehen",
    requestQuote: "Angebot anfragen",
    viewProduct: "Produkt ansehen",
    otherLanguages: "Sprache",
    programNote: "Materialien, Branding, Muster, Verpackung und Konditionen werden anhand des freigegebenen Käuferbriefings bestätigt.",
    empty: "Dieses Programm ist nach Käuferspezifikation verfügbar. Senden Sie Ihre Referenz oder Anforderungen zur Prüfung.",
  },
  fr: {
    home: "Accueil",
    collections: "Collections",
    audiences: "Par programme acheteur",
    productCategories: "Catégories de produits",
    products: "Produits",
    styles: "modèles",
    viewCollection: "Voir la collection",
    requestQuote: "Demander un devis",
    viewProduct: "Voir le produit",
    otherLanguages: "Langue",
    programNote: "Les matières, le marquage, les échantillons, l’emballage et les conditions commerciales sont confirmés selon le cahier des charges approuvé.",
    empty: "Ce programme est disponible sur spécification acheteur. Envoyez votre référence ou vos besoins pour examen.",
  },
  es: {
    home: "Inicio",
    collections: "Colecciones",
    audiences: "Por programa de comprador",
    productCategories: "Categorías de producto",
    products: "Productos",
    styles: "modelos",
    viewCollection: "Ver colección",
    requestQuote: "Solicitar cotización",
    viewProduct: "Ver producto",
    otherLanguages: "Idioma",
    programNote: "Los materiales, el branding, las muestras, el embalaje y las condiciones comerciales se confirman según el briefing aprobado del comprador.",
    empty: "Este programa está disponible según las especificaciones del comprador. Envíe su referencia o requisitos para revisión.",
  },
} as const;

export function taxonomyUi(locale: TaxonomyLocale) {
  return UI[locale];
}

const TOP_NAMES: Record<TaxonomyLocale, Record<string, string>> = {
  en: {
    "bavarian-trachten-wear": "Bavarian & Trachten Wear",
    "premium-leather-apparel": "Premium Leather Apparel",
    sportswear: "Custom Sportswear & Teamwear",
    "streetwear-activewear": "Streetwear & Activewear",
    "leisure-nightwear": "Leisurewear & Nightwear",
  },
  de: {
    "bavarian-trachten-wear": "Bayerische Trachtenmode",
    "premium-leather-apparel": "Premium-Lederbekleidung",
    sportswear: "Individuelle Sport- & Teambekleidung",
    "streetwear-activewear": "Streetwear & Activewear",
    "leisure-nightwear": "Freizeit- & Nachtwäsche",
  },
  fr: {
    "bavarian-trachten-wear": "Vêtements Bavarois & Trachten",
    "premium-leather-apparel": "Vêtements en Cuir Premium",
    sportswear: "Vêtements de Sport & Tenues d’Équipe",
    "streetwear-activewear": "Streetwear & Vêtements Actifs",
    "leisure-nightwear": "Vêtements Décontractés & de Nuit",
  },
  es: {
    "bavarian-trachten-wear": "Ropa Bávara & Trachten",
    "premium-leather-apparel": "Prendas de Cuero Premium",
    sportswear: "Ropa Deportiva & Uniformes de Equipo",
    "streetwear-activewear": "Streetwear & Ropa Activa",
    "leisure-nightwear": "Ropa Casual & de Noche",
  },
};

const AUDIENCE_NAMES: Record<TaxonomyLocale, Record<string, string>> = {
  en: {
    men: "Men",
    women: "Women",
    kids: "Kids & Youth",
    unisex: "Unisex",
    "team-club": "Teams & Clubs",
    "family-hospitality": "Family & Hospitality",
    accessories: "Accessories",
  },
  de: {
    men: "Herren",
    women: "Damen",
    kids: "Kinder & Jugend",
    unisex: "Unisex",
    "team-club": "Teams & Vereine",
    "family-hospitality": "Familie & Hotellerie",
    accessories: "Accessoires",
  },
  fr: {
    men: "Homme",
    women: "Femme",
    kids: "Enfant & Junior",
    unisex: "Unisexe",
    "team-club": "Équipes & Clubs",
    "family-hospitality": "Famille & Hôtellerie",
    accessories: "Accessoires",
  },
  es: {
    men: "Hombre",
    women: "Mujer",
    kids: "Niños & Jóvenes",
    unisex: "Unisex",
    "team-club": "Equipos & Clubes",
    "family-hospitality": "Familia & Hostelería",
    accessories: "Accesorios",
  },
};

const COLLECTION_NAMES: Record<Exclude<TaxonomyLocale, "en">, Record<string, string>> = {
  de: {
    "short-lederhosen": "Kurze Lederhosen",
    "knee-length-lederhosen-bundhosen": "Kniebundhosen & Bundhosen",
    "long-leather-pants": "Lange Lederhosen",
    "trachten-shirts": "Trachtenhemden",
    "trachten-vests-jankers": "Trachtenwesten & Janker",
    "dirndl-dresses": "Dirndlkleider",
    "dirndl-blouses": "Dirndlblusen",
    "dirndl-aprons": "Dirndlschürzen",
    "womens-trachten-jackets-vests": "Damen-Trachtenjacken & Westen",
    "boys-lederhosen": "Lederhosen für Jungen",
    "girls-dirndl": "Dirndl für Mädchen",
    "kids-trachten-shirts": "Trachtenhemden für Kinder",
    "suspenders-belts": "Hosenträger & Gürtel",
    "hats-headwear": "Trachtenhüte & Kopfbedeckung",
    "socks-footwear": "Trachtensocken & Schuhe",
    "scarves-other-accessories": "Tücher & Trachtenaccessoires",
    "biker-jackets": "Biker-Lederjacken",
    "bomber-jackets": "Leder-Bomberjacken",
    "leather-jackets": "Lederjacken",
    "leather-coats-outerwear": "Ledermäntel & Oberbekleidung",
    "leather-vests-waistcoats": "Lederwesten",
    "leather-pants-trousers": "Lederhosen & Lederhosen-Hosen",
    "leather-skirts": "Lederröcke",
    "leather-belts": "Ledergürtel",
    "leather-gloves": "Lederhandschuhe",
    "leather-bags-accessories": "Ledertaschen & Accessoires",
    "football-kits": "Fußballtrikots & Sets",
    "basketball-uniforms": "Basketballuniformen",
    "cricket-uniforms": "Cricket-Uniformen",
    "rugby-kits": "Rugby-Sets",
    "baseball-uniforms": "Baseballuniformen",
    "hockey-uniforms": "Hockeyuniformen",
    tracksuits: "Trainingsanzüge",
    "training-wear": "Trainingsbekleidung",
    "gym-fitness-wear": "Fitness- & Gym-Bekleidung",
    "combat-wrestling-wear": "Kampfsport- & Wrestlingbekleidung",
    "other-teamwear": "Weitere Teambekleidung",
    "hoodies-sweatshirts": "Hoodies & Sweatshirts",
    "t-shirts-tops": "T-Shirts & Oberteile",
    "joggers-sweatpants": "Jogginghosen & Sweatpants",
    "cargo-pants": "Cargohosen",
    "jackets-bombers": "Jacken & Bomberjacken",
    "activewear-sets": "Activewear-Sets",
    "leggings-performance-bottoms": "Leggings & Performance-Hosen",
    "sports-bras-crop-tops": "Sport-BHs & Crop-Tops",
    "t-shirts-polos": "T-Shirts & Poloshirts",
    "shirts-henleys": "Hemden & Henley-Shirts",
    "shorts-casual-bottoms": "Shorts & Freizeithosen",
    "pajama-sets": "Pyjama-Sets",
    "nightshirts-nightdresses": "Nachthemden & Nachtkleider",
    "robes-bathrobes": "Morgenmäntel & Bademäntel",
    "lounge-sets": "Loungewear-Sets",
    "sleep-pants-shorts": "Schlafhosen & Shorts",
    "family-matching-sets": "Passende Familien-Sets",
    "hotel-hospitality-programs": "Hotel- & Hospitality-Programme",
  },
  fr: {
    "short-lederhosen": "Lederhosen Courts",
    "knee-length-lederhosen-bundhosen": "Lederhosen Mi-Longs & Bundhosen",
    "long-leather-pants": "Pantalons Bavarois Longs en Cuir",
    "trachten-shirts": "Chemises Trachten",
    "trachten-vests-jankers": "Gilets Trachten & Jankers",
    "dirndl-dresses": "Robes Dirndl",
    "dirndl-blouses": "Blouses Dirndl",
    "dirndl-aprons": "Tabliers Dirndl",
    "womens-trachten-jackets-vests": "Vestes & Gilets Trachten Femme",
    "boys-lederhosen": "Lederhosen Garçon",
    "girls-dirndl": "Dirndl Fille",
    "kids-trachten-shirts": "Chemises Trachten Enfant",
    "suspenders-belts": "Bretelles & Ceintures",
    "hats-headwear": "Chapeaux Bavarois",
    "socks-footwear": "Chaussettes & Chaussures Trachten",
    "scarves-other-accessories": "Foulards & Accessoires Trachten",
    "biker-jackets": "Blousons Biker en Cuir",
    "bomber-jackets": "Bombers en Cuir",
    "leather-jackets": "Vestes en Cuir",
    "leather-coats-outerwear": "Manteaux & Vêtements d’Extérieur en Cuir",
    "leather-vests-waistcoats": "Gilets en Cuir",
    "leather-pants-trousers": "Pantalons en Cuir",
    "leather-skirts": "Jupes en Cuir",
    "leather-belts": "Ceintures en Cuir",
    "leather-gloves": "Gants en Cuir",
    "leather-bags-accessories": "Sacs & Accessoires en Cuir",
    "football-kits": "Tenues de Football",
    "basketball-uniforms": "Tenues de Basketball",
    "cricket-uniforms": "Tenues de Cricket",
    "rugby-kits": "Tenues de Rugby",
    "baseball-uniforms": "Tenues de Baseball",
    "hockey-uniforms": "Tenues de Hockey",
    tracksuits: "Survêtements",
    "training-wear": "Vêtements d’Entraînement",
    "gym-fitness-wear": "Vêtements de Fitness",
    "combat-wrestling-wear": "Vêtements de Combat & Lutte",
    "other-teamwear": "Autres Tenues d’Équipe",
    "hoodies-sweatshirts": "Sweats à Capuche & Sweatshirts",
    "t-shirts-tops": "T-Shirts & Hauts",
    "joggers-sweatpants": "Joggers & Pantalons de Survêtement",
    "cargo-pants": "Pantalons Cargo",
    "jackets-bombers": "Vestes & Bombers",
    "activewear-sets": "Ensembles Activewear",
    "leggings-performance-bottoms": "Leggings & Bas Performance",
    "sports-bras-crop-tops": "Brassières de Sport & Crop Tops",
    "t-shirts-polos": "T-Shirts & Polos",
    "shirts-henleys": "Chemises & Henleys",
    "shorts-casual-bottoms": "Shorts & Bas Décontractés",
    "pajama-sets": "Ensembles Pyjama",
    "nightshirts-nightdresses": "Chemises de Nuit & Nuisettes",
    "robes-bathrobes": "Peignoirs & Robes de Chambre",
    "lounge-sets": "Ensembles Loungewear",
    "sleep-pants-shorts": "Pantalons & Shorts de Nuit",
    "family-matching-sets": "Ensembles Familiaux Assortis",
    "hotel-hospitality-programs": "Programmes Hôtellerie",
  },
  es: {
    "short-lederhosen": "Lederhosen Cortos",
    "knee-length-lederhosen-bundhosen": "Lederhosen a la Rodilla & Bundhosen",
    "long-leather-pants": "Pantalones Bávaros Largos de Cuero",
    "trachten-shirts": "Camisas Trachten",
    "trachten-vests-jankers": "Chalecos Trachten & Jankers",
    "dirndl-dresses": "Vestidos Dirndl",
    "dirndl-blouses": "Blusas Dirndl",
    "dirndl-aprons": "Delantales Dirndl",
    "womens-trachten-jackets-vests": "Chaquetas & Chalecos Trachten para Mujer",
    "boys-lederhosen": "Lederhosen para Niño",
    "girls-dirndl": "Dirndl para Niña",
    "kids-trachten-shirts": "Camisas Trachten Infantiles",
    "suspenders-belts": "Tirantes & Cinturones",
    "hats-headwear": "Sombreros Bávaros",
    "socks-footwear": "Calcetines & Calzado Trachten",
    "scarves-other-accessories": "Pañuelos & Accesorios Trachten",
    "biker-jackets": "Chaquetas Biker de Cuero",
    "bomber-jackets": "Chaquetas Bomber de Cuero",
    "leather-jackets": "Chaquetas de Cuero",
    "leather-coats-outerwear": "Abrigos & Prendas Exteriores de Cuero",
    "leather-vests-waistcoats": "Chalecos de Cuero",
    "leather-pants-trousers": "Pantalones de Cuero",
    "leather-skirts": "Faldas de Cuero",
    "leather-belts": "Cinturones de Cuero",
    "leather-gloves": "Guantes de Cuero",
    "leather-bags-accessories": "Bolsos & Accesorios de Cuero",
    "football-kits": "Uniformes de Fútbol",
    "basketball-uniforms": "Uniformes de Baloncesto",
    "cricket-uniforms": "Uniformes de Críquet",
    "rugby-kits": "Uniformes de Rugby",
    "baseball-uniforms": "Uniformes de Béisbol",
    "hockey-uniforms": "Uniformes de Hockey",
    tracksuits: "Chándales",
    "training-wear": "Ropa de Entrenamiento",
    "gym-fitness-wear": "Ropa de Gimnasio & Fitness",
    "combat-wrestling-wear": "Ropa de Combate & Lucha",
    "other-teamwear": "Otros Uniformes de Equipo",
    "hoodies-sweatshirts": "Sudaderas con & sin Capucha",
    "t-shirts-tops": "Camisetas & Tops",
    "joggers-sweatpants": "Joggers & Pantalones de Felpa",
    "cargo-pants": "Pantalones Cargo",
    "jackets-bombers": "Chaquetas & Bombers",
    "activewear-sets": "Conjuntos Activewear",
    "leggings-performance-bottoms": "Leggings & Prendas de Rendimiento",
    "sports-bras-crop-tops": "Sujetadores Deportivos & Crop Tops",
    "t-shirts-polos": "Camisetas & Polos",
    "shirts-henleys": "Camisas & Henleys",
    "shorts-casual-bottoms": "Shorts & Pantalones Casuales",
    "pajama-sets": "Conjuntos de Pijama",
    "nightshirts-nightdresses": "Camisones & Vestidos de Noche",
    "robes-bathrobes": "Batas & Albornoces",
    "lounge-sets": "Conjuntos Loungewear",
    "sleep-pants-shorts": "Pantalones & Shorts de Dormir",
    "family-matching-sets": "Conjuntos Familiares a Juego",
    "hotel-hospitality-programs": "Programas de Hotelería",
  },
};

export function localizedTopName(locale: TaxonomyLocale, slug: string, fallback: string) {
  return TOP_NAMES[locale][slug] ?? fallback;
}

export function localizedAudienceName(locale: TaxonomyLocale, slug: string, fallback: string) {
  return AUDIENCE_NAMES[locale][slug] ?? fallback;
}

export function localizedCollectionName(locale: TaxonomyLocale, slug: string, fallback: string) {
  if (locale === "en") return fallback;
  return COLLECTION_NAMES[locale][slug] ?? fallback;
}

type TaxonomySeoCopy = {
  title: string;
  h1: string;
  description: string;
  intro: string;
};

const GP4_ENGLISH_COMMERCIAL_SEO: Record<string, TaxonomySeoCopy> = {
  "Custom Sportswear & Teamwear|Teams & Clubs|Team Uniforms": {
    title: "Custom Football Kit Manufacturer | Private Label Teamwear | Irha Apparels",
    h1: "Custom Football Kit & Teamwear Manufacturer",
    description: "Custom football kits and teamwear for clubs, academies, distributors and private-label buyers. Materials, artwork, names, numbers, sizing, labels and packaging are confirmed to the approved brief.",
    intro: "Develop football kits and broader teamwear with buyer-approved materials and construction, club or brand artwork, names and numbers, size runs, labels and packaging. Sampling, quotation and bulk production are confirmed after the specification and order scope are reviewed.",
  },
  "Bavarian & Trachten Wear|Men|Men's Lederhosen": {
    title: "Lederhosen Manufacturer | Wholesale & Private Label | Irha Apparels",
    h1: "Lederhosen Manufacturer for Wholesale & Private Label",
    description: "Wholesale and private-label Lederhosen for brands, retailers and importers, with leather or material selection, embroidery, sizing, trims, labels and packaging confirmed to the buyer brief.",
    intro: "Source short, knee-length, long, vintage and embroidered Lederhosen through one B2B manufacturing program. Leather or material choice, embroidery, fit, sizing, trims, private labels and packaging are developed and quoted against the approved specification.",
  },
  "Bavarian & Trachten Wear|Men|Lederhosen": {
    title: "Lederhosen Manufacturer | Wholesale & Private Label | Irha Apparels",
    h1: "Lederhosen Manufacturer for Wholesale & Private Label",
    description: "Wholesale and private-label Lederhosen for brands, retailers and importers, with leather or material selection, embroidery, sizing, trims, labels and packaging confirmed to the buyer brief.",
    intro: "Source short, knee-length, long, vintage and embroidered Lederhosen through one B2B manufacturing program. Leather or material choice, embroidery, fit, sizing, trims, private labels and packaging are developed and quoted against the approved specification.",
  },
  "Custom Sportswear & Teamwear||": {
    title: "Private Label Sportswear Manufacturer | Custom Teamwear | Irha Apparels",
    h1: "Private Label Sportswear Manufacturer for B2B Buyers",
    description: "Private-label sportswear and custom teamwear for brands, clubs, wholesalers and distributors. Team uniforms, performance activewear, combat and training programs are developed to an approved buyer brief.",
    intro: "Build private-label sportswear across team uniforms, performance activewear, combat sportswear and training wear. OEM/ODM development, materials, sizing, branding, labels and packaging are confirmed against the buyer specification before sampling and bulk production.",
  },
  "Premium Leather Apparel|Men|Men's Jackets & Outerwear": {
    title: "Private Label Leather Jacket Manufacturer | Irha Apparels",
    h1: "Private Label Leather Jacket & Outerwear Manufacturer",
    description: "Private-label leather jackets and outerwear for brands, wholesalers and importers, with materials, construction, fit, branding, labels and packaging developed to buyer specifications.",
    intro: "Develop men's leather jackets and outerwear for private-label and wholesale programs. Material selection, construction, fit and sizing, branding, labels, trims and packaging are reviewed against the buyer brief before quotation, sampling and bulk production.",
  },
  "Streetwear & Activewear||": {
    title: "Private Label Streetwear Manufacturer | Heavyweight Hoodies | Irha Apparels",
    h1: "Private Label Streetwear & Hoodie Manufacturer",
    description: "Private-label streetwear for brands and wholesalers, including oversized hoodies, T-shirts, outerwear, bottoms and matching sets. Materials, fit, branding, labels and packaging are made to the approved brief.",
    intro: "Develop streetwear collections covering oversized hoodies, T-shirts, outerwear, bottoms and matching sets. Where a heavyweight garment is required, target fabric weight and construction are confirmed in the buyer specification before sampling.",
  },
  "Bavarian & Trachten Wear|Women|Women's Dirndl Dresses": {
    title: "Private Label Dirndl Manufacturer | Wholesale Trachten | Irha Apparels",
    h1: "Private Label Dirndl Manufacturer for Wholesale Buyers",
    description: "Private-label Dirndl dresses for brands, retailers and importers, with fabric, bodice and apron details, trims, embroidery, sizing, labels and packaging developed to the approved buyer brief.",
    intro: "Source traditional, modern and material-led Dirndl styles through a wholesale and private-label program. Fabric selection, bodice and apron details, trims, embroidery, sizing, private labels and packaging are confirmed against the approved specification before quotation and sampling.",
  },
  "Leisurewear & Nightwear||": {
    title: "Private Label Pajama & Nightwear Manufacturer | Irha Apparels",
    h1: "Private Label Pajama & Nightwear Manufacturer",
    description: "Private-label pajamas, sleep sets, robes and leisure/nightwear for brands and wholesale buyers. Fabrics, sizing, labels, branding and packaging are confirmed to the approved buyer brief.",
    intro: "Develop pajama sets, sleepwear, robes and related leisure/nightwear for brands, wholesalers and other qualified B2B buyers. Fabrics, construction, sizing, branding, labels and packaging are agreed from the buyer specification before sampling and bulk production.",
  },
  "Custom Sportswear & Teamwear|Fitness & Activewear|Performance & Activewear": {
    title: "Private Label Activewear Manufacturer | Performance Apparel | Irha Apparels",
    h1: "Private Label Activewear & Performance Apparel Manufacturer",
    description: "Private-label activewear and performance apparel for brands, distributors and wholesale buyers, with materials, fit, sizing, branding, labels and packaging developed to buyer specifications.",
    intro: "Develop performance and activewear across the published fitness collection for private-label programs. Materials, construction, fit, sizing, branding, labels and packaging are confirmed to the buyer brief before quotation, sampling and bulk production.",
  },
  "Premium Leather Apparel|Accessories|": {
    title: "Private Label Leather Accessories Manufacturer | Irha Apparels",
    h1: "Private Label Leather Accessories Manufacturer",
    description: "Private-label leather accessories for brands, retailers and importers, including bags and other published accessory lines. Materials, construction, branding, labels and packaging are confirmed to buyer specifications.",
    intro: "Develop private-label leather accessory programs from the published bags, accessories and related lines. Material choice, construction, branding, labels and packaging are reviewed against the buyer specification before quotation and sampling.",
  },
  "Bavarian & Trachten Wear|Men|": {
    title: "Trachten Shirt & Vest Manufacturer | Wholesale & Private Label | Irha Apparels",
    h1: "Trachten Shirt & Vest Manufacturer for B2B Buyers",
    description: "Wholesale and private-label Trachten shirts, vests and men's Bavarian apparel for retailers, importers and brands, with materials, embroidery, sizing, labels and packaging made to buyer specifications.",
    intro: "Source men's Trachten shirts, vests and related Bavarian apparel within one B2B manufacturing category. Material choice, embroidery or other branding where applicable, sizing, trims, private labels and packaging are confirmed against the buyer brief.",
  },
};

function gp4EnglishCommercialSeo(topName: string, audienceName?: string, collectionName?: string) {
  return GP4_ENGLISH_COMMERCIAL_SEO[`${topName}|${audienceName ?? ""}|${collectionName ?? ""}`];
}

export function localizedTaxonomySeo(args: {
  locale: TaxonomyLocale;
  topName: string;
  audienceName?: string;
  collectionName?: string;
}) {
  const { locale, topName, audienceName, collectionName } = args;
  const audienceSubject = audienceName ? `${audienceName} ${topName}` : topName;

  if (locale === "de") {
    if (collectionName) {
      const buyerGroup = audienceName ?? "B2B-Käufer";
      return {
        title: `${collectionName} für ${buyerGroup} | ${topName} Hersteller | Irha Apparels`,
        h1: `${collectionName} Hersteller für ${buyerGroup} — ${topName}`,
        description: `${collectionName} Fertigung für ${buyerGroup} innerhalb ${topName}. Programme für Großhändler, Importeure und Private-Label-Käufer werden nach Anforderungsprüfung bestätigt.`,
        intro: `${collectionName} Programme für ${buyerGroup} innerhalb ${topName}, mit kundenspezifischer Entwicklung, Branding und Verpackung nach freigegebenem Briefing.`,
      };
    }
    return {
      title: `${audienceSubject} Hersteller | Großhandel & Private Label | Irha Apparels`,
      h1: `${audienceSubject} Hersteller für Großhandel & Private Label`,
      description: `${audienceSubject} für Großhändler, Importeure und Private-Label-Käufer. Produktdetails und Konditionen werden nach Prüfung der Anforderungen bestätigt.`,
      intro: `${audienceSubject} Programme für B2B-Käufer mit kundenspezifischer Entwicklung, Branding und Verpackung nach freigegebenem Briefing.`,
    };
  }
  if (locale === "fr") {
    if (collectionName) {
      const buyerGroup = audienceName ?? "acheteurs B2B";
      return {
        title: `${collectionName} pour ${buyerGroup} | Fabricant ${topName} | Irha Apparels`,
        h1: `Fabricant ${collectionName} pour ${buyerGroup} — ${topName}`,
        description: `Fabrication ${collectionName} pour ${buyerGroup} dans ${topName}. Les programmes grossistes, importateurs et marques privées sont confirmés après examen des besoins.`,
        intro: `Programmes ${collectionName} pour ${buyerGroup} dans ${topName}, avec développement, marquage et emballage selon le cahier des charges approuvé.`,
      };
    }
    return {
      title: `Fabricant ${audienceSubject} | Grossiste & Marque Privée | Irha Apparels`,
      h1: `Fabricant ${audienceSubject} pour Grossistes & Marques Privées`,
      description: `${audienceSubject} pour grossistes, importateurs et marques privées. Les détails produit et conditions sont confirmés après examen des besoins.`,
      intro: `Programmes ${audienceSubject} pour acheteurs B2B avec développement, marquage et emballage selon le cahier des charges approuvé.`,
    };
  }
  if (locale === "es") {
    if (collectionName) {
      const buyerGroup = audienceName ?? "compradores B2B";
      return {
        title: `${collectionName} para ${buyerGroup} | Fabricante ${topName} | Irha Apparels`,
        h1: `Fabricante de ${collectionName} para ${buyerGroup} — ${topName}`,
        description: `Fabricación de ${collectionName} para ${buyerGroup} dentro de ${topName}. Los programas mayoristas, importadores y de marca privada se confirman tras revisar los requisitos.`,
        intro: `Programas de ${collectionName} para ${buyerGroup} dentro de ${topName}, con desarrollo, branding y embalaje según el briefing aprobado.`,
      };
    }
    return {
      title: `Fabricante de ${audienceSubject} | Mayorista & Marca Privada | Irha Apparels`,
      h1: `Fabricante de ${audienceSubject} para Mayoristas & Marcas Privadas`,
      description: `${audienceSubject} para mayoristas, importadores y compradores de marca privada. Los detalles y condiciones se confirman tras revisar los requisitos.`,
      intro: `Programas de ${audienceSubject} para compradores B2B con desarrollo, branding y embalaje según el briefing aprobado.`,
    };
  }

  const gp4Seo = gp4EnglishCommercialSeo(topName, audienceName, collectionName);
  if (gp4Seo) return gp4Seo;

  if (collectionName) {
    const buyerGroup = audienceName ?? "B2B Buyers";
    const description = collectionName === "Team Uniforms"
      && buyerGroup === "Teams & Clubs"
      && topName === "Custom Sportswear & Teamwear"
      ? "Custom team uniform manufacturing for clubs and organisations, with private-label branding, materials and construction confirmed against the approved specification."
      : `Custom ${collectionName} manufacturing for ${buyerGroup} within ${topName}, supporting wholesalers, importers and private-label programs after requirement review.`;
    return {
      title: `${collectionName} for ${buyerGroup} | ${topName} Manufacturer | Irha Apparels`,
      h1: `${buyerGroup} ${collectionName} Manufacturer for ${topName}`,
      description,
      intro: `Develop ${collectionName} for ${buyerGroup} within ${topName}, with custom materials, branding and packaging confirmed against an approved buyer brief.`,
    };
  }
  return {
    title: `${audienceSubject} Manufacturer | Wholesale & Private Label | Irha Apparels`,
    h1: `${audienceSubject} Manufacturer for Wholesale & Private Label`,
    description: `${audienceSubject} programs for wholesalers, importers and private-label buyers. Product details and commercial terms are confirmed after requirement review.`,
    intro: `${audienceSubject} programs for B2B buyers with custom development, branding and packaging against an approved buyer brief.`,
  };
}
