import type { BuyerIntentLandingPage, BuyerIntentFaq } from "./buyerIntentLandingPages";

type PageConfig = {
  path: string;
  title: string;
  description: string;
  h1: string;
  eyebrow: string;
  intro: string;
  productFocus: string;
  categoryPath: string;
  primaryLabel: string;
  capabilities: string[];
  relatedPaths: string[];
  alternates: Array<{ locale: string; href: string }>;
  specificFaq: BuyerIntentFaq;
};

const sportsAlternates = [
  { locale: "en", href: "/products/sportswear" },
  { locale: "fr", href: "/fr/fabricant-vetements-sport" },
  { locale: "nl", href: "/nl/sportkleding-fabrikant" },
];

const leatherAlternates = [
  { locale: "en", href: "/products/premium-leather-apparel" },
  { locale: "fr", href: "/fr/fabricant-vetements-cuir" },
  { locale: "nl", href: "/nl/leren-kleding-fabrikant" },
];

function makeFrenchPage(config: PageConfig): BuyerIntentLandingPage {
  return {
    ...config,
    locale: "fr-FR",
    direction: "ltr",
    market: "France et marchés francophones",
    secondaryLabel: "Organiser une visite vidéo",
    sections: [
      {
        heading: "Une fabrication conçue pour les acheteurs professionnels",
        body: `Irha Apparels développe ${config.productFocus} à partir d’un cahier des charges, d’un dossier technique ou d’un modèle de référence. Chaque produit est étudié pour son usage, son niveau de qualité, sa présentation commerciale et son canal de vente.`,
        bullets: config.capabilities,
      },
      {
        heading: "Du brief à la validation de l’échantillon",
        body: "Les matières, mesures, couleurs, composants, techniques de marquage, étiquettes et emballages sont clarifiés avant la production. Les commentaires sur l’échantillon et les corrections convenues sont documentés avant toute validation de série.",
        bullets: ["Analyse du produit et de la fourchette de quantité", "Tableau de mesures, gradation et tolérances", "Échantillon de développement et commentaires acheteur", "Validation écrite avant lancement de la production"],
      },
      {
        heading: "Préparer une demande de devis exploitable",
        body: "Un devis fiable nécessite des informations techniques et commerciales suffisantes. La quantité minimale, le prix, le calendrier et le transport sont confirmés pour le projet concerné, sans promesse universelle ni prix de détail générique.",
        bullets: ["Produit, matière, composition, poids et finition", "Quantités, tailles, couleurs et variantes", "Logos, étiquettes, marquages et emballage", "Destination, Incoterm et période de livraison souhaitée"],
      },
    ],
    faqs: [
      { question: "Existe-t-il une quantité minimale fixe pour tous les produits ?", answer: "Non. La quantité réalisable dépend du produit, de la matière, des couleurs, des tailles, du marquage et de l’emballage. Elle est confirmée après étude du brief." },
      { question: "Un échantillon peut-il être validé avant la série ?", answer: "Oui. Le plan d’échantillonnage, les éventuelles corrections et les conditions de validation sont définis avant la production en série." },
      { question: "Les étiquettes et l’emballage peuvent-ils être personnalisés ?", answer: "Oui. Les étiquettes tissées, étiquettes d’entretien, hangtags, pliage et emballage sont préparés selon les données et visuels validés par l’acheteur." },
      config.specificFaq,
    ],
  };
}

function makeDutchPage(config: PageConfig): BuyerIntentLandingPage {
  return {
    ...config,
    locale: "nl-NL",
    direction: "ltr",
    market: "Nederland en Nederlandstalige markten",
    secondaryLabel: "Fabrieksvideogesprek plannen",
    sections: [
      {
        heading: "Productie voor professionele inkopers",
        body: `Irha Apparels ontwikkelt ${config.productFocus} vanuit een inkoopbrief, technisch dossier of referentiemodel. Ieder artikel wordt beoordeeld op gebruik, kwaliteitsniveau, merkpresentatie en verkoopkanaal.`,
        bullets: config.capabilities,
      },
      {
        heading: "Van briefing tot monstergoedkeuring",
        body: "Materialen, maten, kleuren, onderdelen, decoratiemethoden, labels en verpakking worden vóór productie afgestemd. Feedback op het monster en afgesproken correcties worden vastgelegd voordat bulkproductie wordt vrijgegeven.",
        bullets: ["Beoordeling van product en hoeveelheidsrange", "Maattabel, grading en toleranties", "Ontwikkelmonster en schriftelijke feedback", "Goedkeuring vóór de hoofdproductie"],
      },
      {
        heading: "Een bruikbare offerteaanvraag voorbereiden",
        body: "Een betrouwbare offerte vereist voldoende technische en commerciële informatie. Minimale afname, prijs, planning en transport worden per project bevestigd, zonder universele belofte of generieke retailprijs.",
        bullets: ["Product, materiaal, samenstelling, gewicht en afwerking", "Aantallen, maten, kleuren en varianten", "Logo’s, labels, decoratie en verpakking", "Bestemming, Incoterm en gewenste leverperiode"],
      },
    ],
    faqs: [
      { question: "Geldt één minimale afname voor alle producten?", answer: "Nee. De haalbare hoeveelheid hangt af van product, materiaal, kleuren, maten, branding en verpakking en wordt na technische beoordeling bevestigd." },
      { question: "Kan een monster vóór bulkproductie worden goedgekeurd?", answer: "Ja. Monsterontwikkeling, correcties en de goedkeuringsmethode worden vastgelegd voordat bulkproductie wordt bevestigd." },
      { question: "Kunnen labels en verpakking worden aangepast?", answer: "Ja. Geweven labels, waslabels, hangtags, vouwmethode en verpakking worden geproduceerd volgens de door de koper goedgekeurde gegevens en bestanden." },
      config.specificFaq,
    ],
  };
}

export const FRENCH_WAVE2_PAGES: BuyerIntentLandingPage[] = [
  makeFrenchPage({
    path: "/fr/",
    title: "Fabricant de vêtements B2B pour marques et grossistes | Irha Apparels",
    description: "Fabrication B2B de vêtements sur cahier des charges pour importateurs, grossistes, détaillants et marques privées, avec échantillonnage, personnalisation et suivi direct.",
    h1: "Fabrication de vêtements B2B pour marques, grossistes et importateurs",
    eyebrow: "Français · Approvisionnement direct auprès du fabricant",
    intro: "Irha Apparels développe et fabrique des programmes d’habillement sur mesure à Sialkot, au Pakistan, pour les acheteurs professionnels. Les matières, les mesures, le marquage, l’emballage, les quantités et les exigences de livraison sont étudiés avant toute confirmation commerciale.",
    productFocus: "des vêtements de sport, des articles en cuir, du streetwear, des vêtements de loisirs et des programmes de marque privée",
    categoryPath: "/products",
    primaryLabel: "Présenter un projet",
    capabilities: ["Vêtements de sport et tenues d’équipe", "Vestes et vêtements en cuir", "Streetwear, sweats, T-shirts et ensembles", "Vêtements de loisirs, de nuit et collections privées"],
    relatedPaths: ["/fr/fabricant-vetements", "/fr/fabricant-vetements-sport", "/fr/fabricant-vetements-cuir", "/fr/fabrication-marque-blanche"],
    alternates: [{ locale: "fr", href: "/fr/" }],
    specificFaq: { question: "Irha Apparels possède-t-elle un bureau en France ?", answer: "Non. La fabrication et la coordination sont assurées depuis Sialkot, au Pakistan, avec communication directe et possibilité de visite vidéo de l’usine." },
  }),
  makeFrenchPage({
    path: "/fr/fabricant-vetements",
    title: "Fabricant de vêtements sur mesure B2B | Grossistes et marques",
    description: "Fabricant de vêtements sur mesure pour importateurs, grossistes, détaillants et marques privées : développement, échantillons, étiquettes, marquage et emballage.",
    h1: "Fabricant de vêtements sur mesure pour acheteurs B2B",
    eyebrow: "France · Fabrication de vêtements",
    intro: "Irha Apparels accompagne les importateurs, grossistes, détaillants et marques qui recherchent une production personnalisée. Les matières, la coupe, les finitions, les tailles, les étiquettes et l’emballage sont définis selon le cahier des charges de l’acheteur.",
    productFocus: "des programmes multigammes de vêtements sur mesure pour le commerce de gros et les marques",
    categoryPath: "/products",
    primaryLabel: "Demander une étude de fabrication",
    capabilities: ["Vêtements de sport, entraînement et teamwear", "Cuir, vestes, gilets et pièces d’extérieur", "Streetwear, sweatshirts, pantalons et ensembles", "Vêtements traditionnels, loisirs et nuit"],
    relatedPaths: ["/fr/", "/fr/fabricant-vetements-sport", "/fr/fabricant-vetements-cuir", "/fr/fabrication-marque-blanche", "/products"],
    alternates: [{ locale: "fr", href: "/fr/fabricant-vetements" }],
    specificFaq: { question: "Pouvez-vous travailler à partir d’un dossier technique ?", answer: "Oui. Un tech pack, un tableau de mesures, des fichiers de marquage ou un échantillon physique peuvent servir de base à l’étude et à l’échantillonnage." },
  }),
  makeFrenchPage({
    path: "/fr/fabricant-vetements-sport",
    title: "Fabricant de vêtements de sport personnalisés | Teamwear B2B",
    description: "Fabrication de vêtements de sport, tenues d’équipe et collections performance pour clubs, distributeurs, grossistes et marques privées, avec échantillon validé.",
    h1: "Fabricant de vêtements de sport et de teamwear personnalisés",
    eyebrow: "France · Vêtements de sport B2B",
    intro: "Irha Apparels fabrique des tenues d’équipe, vêtements d’entraînement et collections sport personnalisées pour clubs, distributeurs, grossistes et marques. Le sport, la matière, la coupe, les visuels, les tailles et les besoins de réassort sont étudiés avant production.",
    productFocus: "du teamwear, des tenues de match, des vêtements d’entraînement et des collections sport de marque privée",
    categoryPath: "/products/sportswear",
    primaryLabel: "Demander un devis sport",
    capabilities: ["Football, basketball, rugby, cricket et hockey", "Maillots, shorts, survêtements et vestes", "Programmes pour clubs, écoles et académies", "Sublimation, broderie, DTF, noms et numéros"],
    relatedPaths: ["/fr/", "/fr/fabricant-vetements", "/fr/fabrication-marque-blanche", "/products/sportswear"],
    alternates: sportsAlternates,
    specificFaq: { question: "Pouvez-vous produire une tenue complète pour un club ?", answer: "Oui. Maillot, short, survêtement et vêtements d’entraînement peuvent être coordonnés avec les couleurs, écussons, sponsors, tailles et besoins de réassort du club." },
  }),
  makeFrenchPage({
    path: "/fr/fabricant-vetements-cuir",
    title: "Fabricant de vêtements en cuir sur mesure | Marques et grossistes",
    description: "Fabrication B2B de vestes et vêtements en cuir avec validation du cuir, de la doublure, des accessoires, des mesures, du marquage et de l’emballage.",
    h1: "Fabricant de vêtements en cuir pour marques et grossistes",
    eyebrow: "France · Fabrication cuir B2B",
    intro: "Irha Apparels développe des vestes, gilets, pantalons et vêtements en cuir personnalisés pour marques, importateurs et grossistes. Le type de cuir, l’épaisseur, la finition, la doublure, les accessoires, la coupe et le marquage sont définis avant le prix final.",
    productFocus: "des vestes, gilets, pantalons et vêtements en cuir de marque privée",
    categoryPath: "/products/premium-leather-apparel",
    primaryLabel: "Demander un devis cuir",
    capabilities: ["Vestes biker, bomber, mode et varsity", "Gilets, pantalons et pièces d’extérieur", "Cuir, doublure, zips et quincaillerie approuvés", "Broderies, écussons, étiquettes et emballage"],
    relatedPaths: ["/fr/", "/fr/fabricant-vetements", "/fr/fabrication-marque-blanche", "/products/premium-leather-apparel"],
    alternates: leatherAlternates,
    specificFaq: { question: "Peut-on valider une veste en cuir avant la série ?", answer: "Oui. Un échantillon peut être utilisé pour contrôler le cuir, la coupe, la construction, les accessoires, les étiquettes et la finition avant la production." },
  }),
  makeFrenchPage({
    path: "/fr/fabrication-marque-blanche",
    title: "Fabrication de vêtements en marque blanche et marque privée B2B",
    description: "Développement et fabrication de vêtements en marque blanche ou privée avec matières, échantillons, étiquettes, marquages et emballage personnalisés.",
    h1: "Fabrication de vêtements en marque blanche et sous marque privée",
    eyebrow: "France · Programmes private label",
    intro: "Irha Apparels accompagne les marques, détaillants et grossistes qui souhaitent développer des vêtements à leur nom, depuis le brief produit et le dossier technique jusqu’à l’échantillon, aux étiquettes, au marquage et à l’emballage validés.",
    productFocus: "des programmes OEM, ODM, marque blanche et marque privée pour collections d’habillement",
    categoryPath: "/products",
    primaryLabel: "Présenter une collection",
    capabilities: ["Croquis, tech pack ou modèle de référence", "Matières, couleurs, composants et gradation", "Logos, broderies, impressions et placements", "Étiquettes, hangtags, sachets et cartons"],
    relatedPaths: ["/fr/", "/fr/fabricant-vetements", "/fr/fabricant-vetements-sport", "/fr/fabricant-vetements-cuir", "/products"],
    alternates: [{ locale: "fr", href: "/fr/fabrication-marque-blanche" }],
    specificFaq: { question: "Pouvez-vous aider une nouvelle marque ?", answer: "Oui, si le produit, le budget, la quantité et le calendrier sont réalistes. Un brief précis permet de proposer une voie de développement et de validation adaptée." },
  }),
];

export const DUTCH_WAVE2_PAGES: BuyerIntentLandingPage[] = [
  makeDutchPage({
    path: "/nl/",
    title: "B2B kledingfabrikant voor merken en groothandels | Irha Apparels",
    description: "B2B kledingproductie op specificatie voor importeurs, groothandels, retailers en private-labelmerken, met monsters, maatwerkbranding en directe begeleiding.",
    h1: "B2B kledingproductie voor merken, groothandels en importeurs",
    eyebrow: "Nederlands · Rechtstreeks inkopen bij de fabrikant",
    intro: "Irha Apparels ontwikkelt en produceert kledingprogramma’s op maat in Sialkot, Pakistan, voor professionele inkopers. Materialen, maten, branding, verpakking, aantallen en leververeisten worden beoordeeld voordat commerciële toezeggingen worden gedaan.",
    productFocus: "sportkleding, leren kleding, streetwear, leisurewear en private-labelprogramma’s op maat",
    categoryPath: "/products",
    primaryLabel: "Project voorleggen",
    capabilities: ["Sportkleding en teamwear", "Leren jassen en kleding", "Streetwear, hoodies, T-shirts en sets", "Leisurewear, nachtkleding en private-labelcollecties"],
    relatedPaths: ["/nl/kledingfabrikant", "/nl/sportkleding-fabrikant", "/nl/leren-kleding-fabrikant", "/nl/private-label-kleding"],
    alternates: [{ locale: "nl", href: "/nl/" }],
    specificFaq: { question: "Heeft Irha Apparels een kantoor in Nederland?", answer: "Nee. Productie en coördinatie vinden plaats vanuit Sialkot, Pakistan, met direct contact en de mogelijkheid van een live fabrieksvideogesprek." },
  }),
  makeDutchPage({
    path: "/nl/kledingfabrikant",
    title: "Kledingfabrikant op maat voor groothandel en merken | B2B",
    description: "Kledingfabrikant op maat voor importeurs, groothandels, retailers en private-labelmerken, met productontwikkeling, monsters, labels, branding en verpakking.",
    h1: "Kledingfabrikant op maat voor professionele inkopers",
    eyebrow: "Nederland · Kledingproductie",
    intro: "Irha Apparels ondersteunt importeurs, groothandels, retailers en merken die maatwerkproductie zoeken. Materialen, pasvorm, constructie, maten, labels, decoratie en verpakking worden vastgelegd volgens de specificaties van de koper.",
    productFocus: "meerdere kledingcategorieën voor groothandel, retailers en private-labelmerken",
    categoryPath: "/products",
    primaryLabel: "Productieaanvraag indienen",
    capabilities: ["Sportkleding, trainingskleding en teamwear", "Leren jassen, vesten en outerwear", "Streetwear, sweatshirts, broeken en sets", "Traditionele kleding, leisurewear en nachtkleding"],
    relatedPaths: ["/nl/", "/nl/sportkleding-fabrikant", "/nl/leren-kleding-fabrikant", "/nl/private-label-kleding", "/products"],
    alternates: [{ locale: "nl", href: "/nl/kledingfabrikant" }],
    specificFaq: { question: "Kunt u met een tech pack of referentiemonster werken?", answer: "Ja. Een tech pack, maattabel, artworkbestand of fysiek referentiemonster kan worden gebruikt voor technische beoordeling en monsterontwikkeling." },
  }),
  makeDutchPage({
    path: "/nl/sportkleding-fabrikant",
    title: "Sportkleding fabrikant op maat | Teamwear en private label B2B",
    description: "Productie van sportkleding, teamwear en performancecollecties voor clubs, distributeurs, groothandels en private-labelmerken, met goedgekeurd monster.",
    h1: "Fabrikant van sportkleding en teamwear op maat",
    eyebrow: "Nederland · B2B sportkleding",
    intro: "Irha Apparels produceert teamtenues, trainingskleding en private-label sportcollecties voor clubs, distributeurs, groothandels en merken. Sport, materiaal, pasvorm, artwork, maatverdeling en nabestelbehoeften worden vóór productie beoordeeld.",
    productFocus: "teamwear, wedstrijdtenues, trainingskleding en private-label sportcollecties",
    categoryPath: "/products/sportswear",
    primaryLabel: "Sportkledingofferte aanvragen",
    capabilities: ["Voetbal, basketbal, rugby, cricket en hockey", "Shirts, shorts, trainingspakken en jassen", "Programma’s voor clubs, scholen en academies", "Sublimatie, borduring, DTF, namen en nummers"],
    relatedPaths: ["/nl/", "/nl/kledingfabrikant", "/nl/private-label-kleding", "/products/sportswear"],
    alternates: sportsAlternates,
    specificFaq: { question: "Kunt u complete clubtenues produceren?", answer: "Ja. Shirts, shorts, trainingspakken en trainingsartikelen kunnen worden afgestemd op clubkleuren, logo’s, sponsors, maten en nabestellingen." },
  }),
  makeDutchPage({
    path: "/nl/leren-kleding-fabrikant",
    title: "Leren kleding fabrikant op maat | Merken en groothandel",
    description: "B2B productie van leren jassen en kleding met goedkeuring van leer, voering, hardware, maten, branding, afwerking en verpakking voor merken en groothandels.",
    h1: "Fabrikant van leren kleding voor merken en groothandels",
    eyebrow: "Nederland · B2B leerproductie",
    intro: "Irha Apparels ontwikkelt leren jassen, vesten, broeken en geselecteerde accessoires voor merken, importeurs en groothandels. Leertype, dikte, afwerking, voering, hardware, pasvorm, maten en branding worden vóór de definitieve offerte vastgelegd.",
    productFocus: "leren jassen, vesten, broeken en private-label leren kleding",
    categoryPath: "/products/premium-leather-apparel",
    primaryLabel: "Offerte voor leren kleding",
    capabilities: ["Biker-, bomber-, fashion- en varsityjassen", "Leren vesten, broeken en outerwear", "Leer, voering, ritsen en hardware ter goedkeuring", "Borduring, patches, labels en verpakking"],
    relatedPaths: ["/nl/", "/nl/kledingfabrikant", "/nl/private-label-kleding", "/products/premium-leather-apparel"],
    alternates: leatherAlternates,
    specificFaq: { question: "Kan eerst een leren jas als monster worden gemaakt?", answer: "Ja. Het monster kan leer, pasvorm, constructie, hardware, labels en afwerking vóór bulkproductie laten beoordelen." },
  }),
  makeDutchPage({
    path: "/nl/private-label-kleding",
    title: "Private label kleding laten maken | B2B fabrikant voor merken",
    description: "Ontwikkeling en productie van private-labelkleding met materialen, monsters, labels, branding en verpakking op maat voor merken, retailers en groothandels.",
    h1: "Private-labelkleding laten ontwikkelen en produceren",
    eyebrow: "Nederland · Private-labelproductie",
    intro: "Irha Apparels ondersteunt merken, retailers en groothandels bij de ontwikkeling van kleding onder hun eigen naam, van productbrief en technisch dossier tot monster, goedgekeurde labels, decoratie en verpakking.",
    productFocus: "OEM-, ODM- en private-labelontwikkeling voor kledingcollecties",
    categoryPath: "/products",
    primaryLabel: "Collectie voorleggen",
    capabilities: ["Schets, tech pack of referentiemodel", "Materialen, kleuren, onderdelen en grading", "Logo’s, borduring, prints en plaatsing", "Labels, hangtags, zakken en dozen"],
    relatedPaths: ["/nl/", "/nl/kledingfabrikant", "/nl/sportkleding-fabrikant", "/nl/leren-kleding-fabrikant", "/products"],
    alternates: [{ locale: "nl", href: "/nl/private-label-kleding" }],
    specificFaq: { question: "Kunt u een nieuw kledingmerk ondersteunen?", answer: "Ja, wanneer productrichting, budget, hoeveelheid en planning realistisch zijn. Een duidelijke briefing helpt om een passende ontwikkel- en goedkeuringsroute te bepalen." },
  }),
];

export const WAVE2_BUYER_JOURNEY_PAGES: BuyerIntentLandingPage[] = [...FRENCH_WAVE2_PAGES, ...DUTCH_WAVE2_PAGES];
