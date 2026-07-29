export type BuyerReadyFaq = {
  question: string;
  answer: string;
};

export type BuyerReadyQueryCluster = {
  primaryQuery: string;
  supportingQueries: string[];
  intent: "commercial-b2b";
};

export type BuyerReadyProductContentInput = {
  name: string;
  slug?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  short_description?: string | null;
  description?: string | null;
  mainCategorySlug?: string | null;
  mainCategoryName?: string | null;
  audienceSlug?: string | null;
  audienceName?: string | null;
  productTypeSlug?: string | null;
  productTypeName?: string | null;
  specs?: string[] | null;
  primary_material?: string | null;
  fabric_composition?: string | null;
  gsm?: string | null;
  available_sizes?: string[] | null;
  available_colors?: string[] | null;
  customization?: Record<string, boolean> | null;
  packaging_standard?: string | null;
};

export type BuyerReadyProductContent = {
  name: string;
  h1: string;
  seoTitle: string;
  seoDescription: string;
  shortDescription: string;
  description: string;
  openingAnswer: string;
  buyerUseCases: string[];
  materialGuidance: string;
  constructionGuidance: string;
  customizationGuidance: string;
  sizeAndFitGuidance: string;
  samplingSteps: string[];
  packagingAndLogistics: string;
  moqAndLeadTime: string;
  decisionPoints: string[];
  faqs: BuyerReadyFaq[];
  queryCluster: BuyerReadyQueryCluster;
  bodyText: string;
};

const BLOCKED_PUBLIC_TERMS = [
  "oeko",
  "bsci",
  "sedex",
  "iso 9001",
  "gots",
  "wrap",
  "reach certified",
  "guaranteed delivery",
  "guaranteed lead time",
  "free shipping",
] as const;

type CategoryProfile = {
  buyers: string;
  collectionUse: string;
  materialReview: string;
  qualityFocus: string;
  relatedGuide: string;
};

const CATEGORY_PROFILES: Record<string, CategoryProfile> = {
  "bavarian-trachten-wear": {
    buyers: "Trachten retailers, Bavarian clothing brands, wholesalers and sourcing buyers",
    collectionUse: "coordinated Trachten ranges, seasonal retail programs and private-label Bavarian collections",
    materialReview:
      "The brief should identify the required leather, suede or textile family, colour reference, handle and finish; final composition and source availability are approved against the sample.",
    qualityFocus:
      "silhouette, panel balance, decorative placement, trim compatibility and size consistency",
    relatedGuide: "Lederhosen and Trachten manufacturing requirements",
  },
  "premium-leather-apparel": {
    buyers: "leather apparel brands, outerwear buyers, wholesalers and private-label sourcing teams",
    collectionUse: "branded leather collections, coordinated outerwear ranges and wholesale accessory programs",
    materialReview:
      "Leather or alternative-material type, grade, surface character, colour, lining and hardware must be identified in the tech pack and confirmed on an approved sample.",
    qualityFocus:
      "panel matching, seam construction, edge finish, hardware setting, lining alignment and fit",
    relatedGuide: "leather type, hardware and construction selection",
  },
  sportswear: {
    buyers: "sports brands, clubs, teams, academies, distributors and private-label buyers",
    collectionUse: "team kits, training ranges, club programs and branded performance collections",
    materialReview:
      "The buyer brief should define composition, fabric weight, stretch and recovery or breathability where relevant; performance requirements are confirmed against a selected material and approved sample.",
    qualityFocus:
      "movement fit, panel alignment, seam placement, artwork registration and size-set consistency",
    relatedGuide: "sportswear fabric and team-uniform customization",
  },
  "streetwear-activewear": {
    buyers: "streetwear labels, activewear brands, retailers, wholesalers and private-label buyers",
    collectionUse: "streetwear drops, branded capsules, coordinated sets and wholesale fashion programs",
    materialReview:
      "Composition, fabric weight, hand feel, stretch, wash or surface finish where relevant are selected against the intended silhouette and approved sample.",
    qualityFocus:
      "fit proportion, seam and pocket alignment, artwork placement, finish consistency and grading",
    relatedGuide: "fabric weight, fit and decoration selection for streetwear",
  },
  "leisure-nightwear": {
    buyers: "leisurewear and sleepwear brands, hospitality buyers, retailers and private-label sourcing teams",
    collectionUse: "loungewear ranges, sleepwear sets, hospitality programs and retail basics",
    materialReview:
      "Composition, fabric weight, surface feel, drape, opacity and care requirements should be defined for the intended use and confirmed on an approved sample.",
    qualityFocus:
      "comfort fit, seam finish, set coordination, trim attachment, measurement consistency and packing",
    relatedGuide: "sleepwear fabric, comfort and set-development choices",
  },
};

type ProductTypeProfile = {
  use: string;
  construction: string;
  decisions: string[];
};

const PRODUCT_TYPE_PROFILES: Record<string, ProductTypeProfile> = {
  lederhosen: {
    use: "standalone styles or coordinated Trachten outfits",
    construction: "rise, leg length, bib and waistband shape, pocket layout, suspenders or belt interface and decorative placement",
    decisions: ["length and fit profile", "pocket and closure layout", "embroidery motif and placement"],
  },
  "trachten-shirts": {
    use: "coordinated Lederhosen, vest and jacket programs",
    construction: "collar, placket, yoke, sleeve, cuff, pocket and hem construction",
    decisions: ["collar and placket shape", "sleeve and cuff treatment", "check, embroidery or surface design"],
  },
  "vests-waistcoats": {
    use: "layered formal, heritage or branded collection programs",
    construction: "front profile, neckline, pocket, button or closure, back panel and lining construction",
    decisions: ["front and neckline profile", "pocket and closure layout", "lining and back treatment"],
  },
  "jackets-outerwear": {
    use: "outerwear capsules, uniform layers or seasonal retail programs",
    construction: "collar or hood, front closure, panel, pocket, sleeve, cuff, lining and hem construction",
    decisions: ["silhouette and intended layering", "pocket and closure hardware", "lining, cuff and hem treatment"],
  },
  "pants-joggers": {
    use: "coordinated sets, standalone bottoms or uniform ranges",
    construction: "rise, waistband, fly or drawcord, pocket, leg profile, cuff and hem construction",
    decisions: ["rise and leg profile", "waistband and closure", "pocket, cuff and hem configuration"],
  },
  "dirndl-dresses": {
    use: "Trachten retail ranges, event collections and private-label dress programs",
    construction: "bodice, neckline, skirt length and volume, closure, apron interface and decorative treatment",
    decisions: ["bodice and neckline shape", "skirt length and volume", "apron, trim and decorative coordination"],
  },
  blouses: {
    use: "coordinated dress, uniform or retail top programs",
    construction: "neckline, shoulder, sleeve, cuff, front opening, shaping and hem construction",
    decisions: ["neckline and sleeve shape", "body fit and opening", "lace, trim or decorative finish"],
  },
  aprons: {
    use: "coordinated apparel, hospitality or protective-workwear programs",
    construction: "body shape, length, waist or neck attachment, pocket, edge and tie construction",
    decisions: ["length and coverage", "tie, strap and pocket layout", "edge, embroidery and branding treatment"],
  },
  accessories: {
    use: "collection add-ons, branded merchandise or coordinated retail programs",
    construction: "product dimensions, functional components, attachment points, edges, closures and finishing",
    decisions: ["dimensions and functional use", "closure or attachment details", "logo position and presentation packing"],
  },
  bags: {
    use: "accessory collections, travel ranges and branded merchandise programs",
    construction: "silhouette, dimensions, handle or strap, compartment, pocket, closure, lining and edge construction",
    decisions: ["dimensions and capacity", "handle, strap and compartment layout", "closure, lining and hardware"],
  },
  hoodies: {
    use: "streetwear capsules, team layers, activewear ranges or retail basics",
    construction: "hood, neckline, shoulder, sleeve, cuff, pocket, body proportion and hem construction",
    decisions: ["fit and shoulder proportion", "hood and pocket configuration", "cuff, hem and artwork placement"],
  },
  "custom-apparel": {
    use: "buyer-defined capsule, specialist garment or branded collection programs",
    construction: "silhouette, pattern, panel, opening, functional detail, trim and finishing requirements",
    decisions: ["intended use and silhouette", "pattern and functional details", "trim, branding and finishing"],
  },
  "shirts-tops": {
    use: "retail basics, uniform ranges, leisure collections or coordinated sets",
    construction: "neckline or collar, shoulder, sleeve, cuff, opening, body fit and hem construction",
    decisions: ["neckline or collar profile", "sleeve and body fit", "opening, pocket and hem details"],
  },
  shorts: {
    use: "sports, streetwear, leisure or coordinated-set programs",
    construction: "rise, waistband, drawcord or fly, pocket, inseam, leg opening and hem construction",
    decisions: ["rise and inseam", "waistband and closure", "pocket, lining and hem treatment"],
  },
  "dresses-skirts": {
    use: "fashion capsules, retail ranges or private-label leather programs",
    construction: "waist or bodice shaping, panel layout, closure, lining, length and hem construction",
    decisions: ["silhouette and length", "shaping and closure", "lining, slit and hem treatment"],
  },
  "team-uniforms": {
    use: "club, academy, school, league and distributor teamwear programs",
    construction: "garment set, neckline or collar, panel, sleeve, waistband, seam and hem configuration",
    decisions: ["sport-specific kit components", "team colour and panel map", "crest, sponsor, name and number placement"],
  },
  "training-wear": {
    use: "club training, warm-up, staff and travel ranges",
    construction: "movement fit, collar or neckline, panel, pocket, sleeve, waistband, cuff and hem as applicable",
    decisions: ["training use and layering", "movement fit and ventilation", "team branding and colour blocking"],
  },
  "performance-activewear": {
    use: "fitness, running, cycling, yoga and private-label performance ranges",
    construction: "close or relaxed fit, panel, seam, support, waistband and opening construction as applicable",
    decisions: ["activity and support requirement", "stretch, recovery and movement fit", "seam, panel and pocket placement"],
  },
  "combat-sportswear": {
    use: "boxing, MMA, wrestling, gym and fight-team programs",
    construction: "sport-specific fit, movement zones, waistband or closure, panel, seam and edge construction",
    decisions: ["discipline and competition use", "movement fit and closure security", "team, athlete and sponsor artwork"],
  },
  tops: {
    use: "streetwear drops, branded basics and coordinated capsule programs",
    construction: "neckline, shoulder, sleeve, body proportion, pocket or opening and hem construction",
    decisions: ["fit and shoulder proportion", "neckline, sleeve and hem", "artwork scale and placement"],
  },
  outerwear: {
    use: "streetwear drops, technical layers and seasonal capsule programs",
    construction: "collar or hood, shell panels, front closure, pocket, sleeve, cuff, lining and hem construction",
    decisions: ["layering and silhouette", "shell, lining and insulation brief", "pocket, closure and adjustment details"],
  },
  bottoms: {
    use: "streetwear capsules, active ranges and coordinated matching sets",
    construction: "rise, waistband, closure, pocket, leg profile, adjustment and hem construction",
    decisions: ["rise and leg shape", "waistband and closure", "pocket, adjustment and hem layout"],
  },
  "matching-sets": {
    use: "coordinated retail capsules, lounge programs and private-label collection drops",
    construction: "top and bottom proportions, shared trims, colour matching, waistband, pocket and hem coordination",
    decisions: ["top-to-bottom fit balance", "shared colour and trim system", "set packing and size pairing"],
  },
  "t-shirts": {
    use: "retail basics, sleepwear, leisurewear or branded merchandise programs",
    construction: "neckline, shoulder, sleeve, body fit, seam and hem construction",
    decisions: ["neckline and shoulder shape", "body and sleeve fit", "artwork, neck label and hem treatment"],
  },
  "pajama-sleep-sets": {
    use: "sleepwear collections, hospitality programs and coordinated private-label sets",
    construction: "top and bottom neckline or collar, opening, sleeve, waistband, rise, pocket and hem coordination",
    decisions: ["sleep fit and set components", "opening, waistband and pocket details", "piping, print and set packing"],
  },
  robes: {
    use: "sleepwear, spa, hotel, resort and private-label lounge programs",
    construction: "collar or hood, front overlap, belt, loop, pocket, sleeve, cuff, length and hem construction",
    decisions: ["robe length and overlap", "collar or hood and pocket layout", "belt, loop and embroidery position"],
  },
  "nightgowns-sleep-shirts": {
    use: "sleepwear capsules, boutique ranges and private-label nightwear programs",
    construction: "neckline, shoulder or strap, sleeve, opening, body length, shaping and hem construction",
    decisions: ["neckline and body length", "sleeve, strap or opening", "lace, piping, print and hem finish"],
  },
};

const STYLE_SIGNALS: Array<{ pattern: RegExp; decision: string }> = [
  { pattern: /\btraditional\b/, decision: "heritage silhouette, traditional detail balance and coordinated trims" },
  { pattern: /\bmodern\b/, decision: "contemporary proportion, simplified detailing and collection coordination" },
  { pattern: /\bclassic\b/, decision: "classic profile, proportion and restrained trim treatment" },
  { pattern: /\bpremium\b/, decision: "premium finish brief, component selection and presentation standard" },
  { pattern: /\bchecked\b/, decision: "check scale, repeat, colour matching and pattern alignment" },
  { pattern: /\balpine\b/, decision: "Alpine-inspired colour, motif and coordinated accessory styling" },
  { pattern: /\boktoberfest\b/, decision: "Oktoberfest retail use, festive detailing and coordinated outfit brief" },
  { pattern: /\bshort\b/, decision: "short length, proportion and opening" },
  { pattern: /\bshorts\b/, decision: "short rise, waistband, inseam, pocket, leg opening and hem" },
  { pattern: /\bpants\b|\btrousers\b/, decision: "trouser rise, waistband, pocket, leg profile, opening and hem" },
  { pattern: /\bknee(?:-| )length\b/, decision: "knee-length proportion and leg opening" },
  { pattern: /\blong\b/, decision: "long-line proportion, movement allowance and hem" },
  { pattern: /\bmini\b/, decision: "mini length, balance and movement coverage" },
  { pattern: /\bmidi\b/, decision: "midi length, skirt balance and hem" },
  { pattern: /\bvintage\b/, decision: "vintage-inspired surface character and trim treatment" },
  { pattern: /\bembroider/, decision: "embroidery artwork, scale, stitch area and placement" },
  { pattern: /\blace\b/, decision: "lace type, width, placement, seam integration and care requirement" },
  { pattern: /\bpuff(?:-| )sleeve\b/, decision: "puff-sleeve volume, gathering, cuff and armhole balance" },
  { pattern: /\boff(?:-| )shoulder\b/, decision: "off-shoulder line, support, sleeve position and movement fit" },
  { pattern: /\bhigh(?:-| )neck\b/, decision: "high-neck height, closure, comfort and neckline shaping" },
  { pattern: /\bgraphic\b/, decision: "graphic dimensions, colour separation and placement" },
  { pattern: /\bprint(?:ed)?\b/, decision: "print repeat, colour reference and artwork registration" },
  { pattern: /\bgoat suede\b/, decision: "goat-suede grade, nap direction, colour and finish" },
  { pattern: /\bdeer suede\b/, decision: "deer-suede selection, surface character, colour and finish" },
  { pattern: /\bsuede\b/, decision: "suede type, nap direction, colour matching and finish" },
  { pattern: /\bleather\b/, decision: "leather type, grade, surface, colour and panel matching" },
  { pattern: /\blinen\b/, decision: "linen composition, weight, handle and crease expectations" },
  { pattern: /\bcotton\b/, decision: "cotton composition, fabric construction, weight and shrinkage allowance" },
  { pattern: /\bvelvet\b/, decision: "velvet pile direction, colour, backing and seam handling" },
  { pattern: /\bwool\b/, decision: "wool blend, weight, surface and lining requirement" },
  { pattern: /\bloden\b/, decision: "loden composition, density, surface finish and structure" },
  { pattern: /\bsatin\b/, decision: "satin composition, sheen, drape, colour and snag-sensitive handling" },
  { pattern: /\bsilk\b/, decision: "silk composition, weight, drape, seam finish and care brief" },
  { pattern: /\bflannel\b/, decision: "flannel composition, brushing, pattern matching and weight" },
  { pattern: /\bmodal\b/, decision: "modal blend, weight, stretch, recovery and care requirement" },
  { pattern: /\bthermal\b/, decision: "thermal knit structure, weight, stretch and warmth target" },
  { pattern: /\bfleece\b/, decision: "fleece construction, weight, face and reverse finish" },
  { pattern: /\bwaffle\b/, decision: "waffle structure, weight, shrinkage allowance and robe drape" },
  { pattern: /\bsherpa\b/, decision: "sherpa pile, backing, lining and edge-bulk control" },
  { pattern: /\bpuffer\b/, decision: "baffle map, insulation brief, shell, lining and bulk distribution" },
  { pattern: /\bbiker\b/, decision: "biker lapel, asymmetrical closure, pocket map and hardware" },
  { pattern: /\bcafe racer\b/, decision: "cafe-racer collar, clean front, zip and pocket configuration" },
  { pattern: /\bbomber\b/, decision: "bomber collar, rib, pocket, front closure and blouson proportion" },
  { pattern: /\baviator\b/, decision: "aviator collar, lining, closure, pocket and cuff treatment" },
  { pattern: /\bmotorcycle\b/, decision: "riding use, movement fit, closure security and protective-detail brief" },
  { pattern: /\bfield jacket\b/, decision: "field-jacket pocket map, collar, adjustment and layering brief" },
  { pattern: /\btrench\b/, decision: "trench length, storm and belt details, vent and closure layout" },
  { pattern: /\bvarsity\b/, decision: "varsity body-and-sleeve contrast, rib, snap and patch placement" },
  { pattern: /\bcoach jacket\b/, decision: "coach collar, snap front, drawcord hem and pocket layout" },
  { pattern: /\bwindbreaker\b/, decision: "windbreaker shell, lining, ventilation, closure and adjustment brief" },
  { pattern: /\butility jacket\b/, decision: "utility pocket map, hardware, adjustment and functional trim brief" },
  { pattern: /\btechnical shell\b/, decision: "shell construction, seam plan, lining and functional-detail brief" },
  { pattern: /\bcompression\b/, decision: "compression level, stretch direction, recovery and seam placement" },
  { pattern: /\bsoccer\b|\bfutsal\b/, decision: "football kit components, movement fit, panel map and player artwork" },
  { pattern: /\bbasketball\b/, decision: "basketball neckline, armhole, short length and player artwork" },
  { pattern: /\brugby\b/, decision: "rugby collar or neckline, contact-use seam plan and club artwork" },
  { pattern: /\bcricket\b/, decision: "cricket collar, match format, trouser coordination and sponsor artwork" },
  { pattern: /\bfield hockey\b/, decision: "outfield and goalkeeper role distinction, skort or short choice and squad artwork" },
  { pattern: /\bice hockey\b/, decision: "ice-hockey layering fit, sleeve and body proportion and player artwork" },
  { pattern: /\bvolleyball\b/, decision: "volleyball movement fit, sleeve or armhole and team artwork" },
  { pattern: /\bbaseball\b/, decision: "baseball placket, sleeve, hem, trouser coordination and player artwork" },
  { pattern: /\bamerican football\b/, decision: "American-football pad allowance, jersey length and player artwork" },
  { pattern: /\bhandball\b/, decision: "indoor-court movement fit, sleeve choice, player numbering and squad artwork" },
  { pattern: /\bnetball\b/, decision: "netball garment components, movement fit, position bib and team artwork" },
  { pattern: /\besports\b/, decision: "esports jersey collar, sponsor hierarchy, player identity and artwork map" },
  { pattern: /\bgoalkeeper\b/, decision: "goalkeeper colour distinction, movement fit and protective-detail brief" },
  { pattern: /\bhome kit\b/, decision: "primary team colour system, crest, sponsor and number map" },
  { pattern: /\baway kit\b/, decision: "away colour distinction, crest, sponsor and number map" },
  { pattern: /\bcycling\b/, decision: "riding position, panel stretch, pocket and leg-gripper requirements" },
  { pattern: /\brunning\b/, decision: "running fit, movement range, pocket and visibility-detail brief" },
  { pattern: /\byoga\b/, decision: "yoga movement range, coverage, support and coordinated-set fit" },
  { pattern: /\bgym\b/, decision: "gym movement fit, support or coverage, seam and logo placement" },
  { pattern: /\btrack(?:suit| pants?)\b/, decision: "jacket-to-trouser fit, shared panels, trims and team branding" },
  { pattern: /\bwarm(?:-| )up\b/, decision: "warm-up layering, mobility, shared trims and team identification" },
  { pattern: /\btraining bib\b/, decision: "bib layering allowance, neckline, armhole, colour and team marking" },
  { pattern: /\bquarter(?:-| )zip\b/, decision: "quarter-zip length, collar, guard, puller and panel alignment" },
  { pattern: /\bbench jacket\b/, decision: "bench-use length, layering allowance, insulation and team marking" },
  { pattern: /\bboxing\b/, decision: "boxing movement fit, waistband, corner colours and athlete branding" },
  { pattern: /\bmma\b/, decision: "MMA movement fit, closure security, panel stretch and sponsor artwork" },
  { pattern: /\brash guard\b/, decision: "rash-guard compression, body-and-sleeve panels, seam map and artwork coverage" },
  { pattern: /\btraining set\b/, decision: "training-set components, shared movement fit, colour system and athlete branding" },
  { pattern: /\bwrestling\b/, decision: "singlet fit, leg and arm opening, seam placement and team artwork" },
  { pattern: /\boversized\b/, decision: "shoulder drop, body width, sleeve proportion and finished length" },
  { pattern: /\bcropped\b/, decision: "cropped length, body proportion, hem and grade rules" },
  { pattern: /\bheavyweight\b/, decision: "target fabric weight, structure, seam bulk and finished drape" },
  { pattern: /\bt-?shirt\b|\btee\b/, decision: "neckline, shoulder, sleeve, body length and artwork scale" },
  { pattern: /\bcrewneck\b/, decision: "crewneck shape, rib width, topstitch, shoulder and body proportion" },
  { pattern: /\bv(?:-| )neck\b/, decision: "V-neck depth, angle, binding, shoulder and body proportion" },
  { pattern: /\bhoodie\b/, decision: "hood volume, pocket, shoulder, cuff, hem and artwork placement" },
  { pattern: /\bsweatshirt\b/, decision: "neckline, shoulder, sleeve, cuff, body proportion and hem" },
  { pattern: /\bpolo\b/, decision: "collar, placket, button, sleeve finish and logo placement" },
  { pattern: /\bovershirt\b/, decision: "overshirt layering fit, collar, pocket, opening and hem" },
  { pattern: /\bshirt\b/, decision: "collar or neckline, placket, sleeve, cuff, pocket and hem" },
  { pattern: /\bsinglet\b/, decision: "singlet neckline, armhole, body fit, opening finish and artwork" },
  { pattern: /\bsports bra\b/, decision: "support level, neckline, strap, underband, lining and seam map" },
  { pattern: /\bleggings\b|\btights\b/, decision: "rise, waistband, stretch direction, seam, pocket and leg length" },
  { pattern: /\bcargo\b/, decision: "cargo-pocket capacity, placement, closure and leg balance" },
  { pattern: /\bsweat\b|\bsweatpants\b/, decision: "sweat-fabric structure, lounge fit, waistband, pocket and cuff or hem" },
  { pattern: /\butility\b/, decision: "utility function, pocket capacity, hardware, adjustment and reinforcement" },
  { pattern: /\bparachute\b/, decision: "volume, knee shaping, adjustment system and hem control" },
  { pattern: /\bwide leg\b/, decision: "wide-leg volume, rise, drape and hem width" },
  { pattern: /\bzip\b/, decision: "zip type, length, guard, puller and opening alignment" },
  { pattern: /\bjogger\b/, decision: "jogger rise, waistband, pocket, leg taper and cuff" },
  { pattern: /\bchino\b/, decision: "chino rise, waistband, fly, belt loop, pocket and hem" },
  { pattern: /\blounge\b/, decision: "lounge fit, comfort ease, waistband or opening and set coordination" },
  { pattern: /\brelaxed\b/, decision: "relaxed ease, shoulder or waist balance, body volume and finished length" },
  { pattern: /\bsleep\b/, decision: "sleep comfort, ease, seam feel, opening and nightwear care brief" },
  { pattern: /\bpajama\b|\bnight suit\b/, decision: "sleep fit, top-and-bottom coordination, opening, waistband and piping" },
  { pattern: /\bnightgown\b|\bnight dress\b/, decision: "nightwear neckline, body length, shaping, trim and hem" },
  { pattern: /\bcardigan\b/, decision: "cardigan neckline, opening, sleeve, cuff, body length and trim" },
  { pattern: /\brobe\b|\bbathrobe\b/, decision: "robe length, collar or hood, overlap, belt, loop and pocket" },
  { pattern: /\bonesie\b/, decision: "one-piece body length, opening, ease, cuff and size grading" },
  { pattern: /\bslipper\b/, decision: "slipper size range, sole, upper, binding and presentation packing" },
  { pattern: /\bshoes?\b/, decision: "footwear last, upper, lining, sole, closure and size range" },
  { pattern: /\bboots?\b/, decision: "boot height, last, upper, lining, sole, closure and size range" },
  { pattern: /\bsocks?\b/, decision: "sock length, knit structure, cuff, motif and size range" },
  { pattern: /\bhat\b/, decision: "hat shape, crown, brim, band, trim and size range" },
  { pattern: /\bscarf\b/, decision: "scarf dimensions, edge finish, drape, motif and presentation" },
  { pattern: /\bsuspenders\b/, decision: "suspender length, strap width, attachment, hardware and embroidery" },
  { pattern: /\bbelt\b/, decision: "belt width, length grading, buckle, edge, hole and branding" },
  { pattern: /\bvest\b/, decision: "vest neckline, front profile, pocket, closure, back and lining" },
  { pattern: /\bwaistcoat\b/, decision: "waistcoat neckline, tailored front, pocket, button, back and lining" },
  { pattern: /\bskirt\b/, decision: "skirt rise, waistband, panel, closure, lining, length and hem" },
  { pattern: /\bdress\b/, decision: "dress neckline, bodice shaping, panel, closure, lining, length and hem" },
  { pattern: /\bbackpack\b/, decision: "backpack dimensions, strap system, compartments, closure and reinforcement" },
  { pattern: /\bduffle\b/, decision: "duffle capacity, handle, shoulder strap, compartments and closure" },
  { pattern: /\bmessenger\b/, decision: "messenger-bag dimensions, flap, strap, compartment and closure" },
  { pattern: /\btote\b/, decision: "tote dimensions, handle drop, base, pocket, lining and closure" },
  { pattern: /\bwallet\b/, decision: "wallet fold, card and note layout, edge, closure and branding" },
  { pattern: /\bwaist bag\b/, decision: "waist-bag dimensions, belt, compartment, pocket and closure" },
  { pattern: /\bbutton(?:-| )down\b/, decision: "button spacing, placket, collar and coordinated piping" },
  { pattern: /\bplush\b/, decision: "plush pile, weight, absorbency brief and seam-bulk control" },
  { pattern: /\bhotel\b|\bhospitality\b|\bspa\b|\bresort\b/, decision: "hospitality use, laundering brief, size range and presentation packing" },
  { pattern: /\bboys?\b/, decision: "child torso and waist measurements, growth ease, grading and comfort details" },
  { pattern: /\bgirls?\b/, decision: "child bodice and hip measurements, growth ease, grading and comfort details" },
  { pattern: /\bkids?\b/, decision: "child size chart, growth ease, grading, comfort and age-appropriate functional details" },
  { pattern: /\bwomen'?s\b/, decision: "bust, waist and hip block balance, intended fit and grading rules" },
  { pattern: /\bmen'?s\b/, decision: "chest, shoulder and waist block balance, intended fit and grading rules" },
  { pattern: /\bunisex\b/, decision: "shared block proportions, wearer range, intended ease and grading rules" },
];

const CUSTOMIZATION_LABELS: Record<string, string> = {
  oem: "OEM development from an approved tech pack or reference",
  odm: "ODM development after the design direction is reviewed",
  private_label: "private-label identity and brand application",
  embroidery: "embroidery artwork and placement",
  printing: "print artwork, method and placement",
  woven_labels: "woven main labels",
  care_labels: "buyer-approved care and composition labels",
  hang_tags: "hangtags and ticketing",
  custom_packaging: "buyer-approved custom packaging",
};

const clean = (value: string | null | undefined) => value?.replace(/\s+/g, " ").trim() || "";

const titleCase = (value: string) =>
  value
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const joinNatural = (items: string[]) => {
  const unique = [...new Set(items.map(clean).filter(Boolean))];
  if (unique.length <= 1) return unique[0] || "";
  return `${unique.slice(0, -1).join(", ")} and ${unique.at(-1)}`;
};

const truncate = (value: string, max: number) => {
  const normalized = clean(value);
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
};

const stableVariant = (value: string, variants: number) => {
  let hash = 0;
  for (const character of value) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return hash % variants;
};

function categoryProfile(mainCategorySlug: string): CategoryProfile {
  return CATEGORY_PROFILES[mainCategorySlug] ?? {
    buyers: "brands, wholesalers, importers, retailers and private-label sourcing buyers",
    collectionUse: "custom apparel, wholesale and private-label programs",
    materialReview:
      "Composition, weight, colour, surface and care requirements are confirmed against the buyer brief and approved sample.",
    qualityFocus: "fit, construction, material consistency, branding placement and packing",
    relatedGuide: "tech-pack, sampling and private-label order preparation",
  };
}

function productTypeProfile(productTypeSlug: string, productTypeName: string): ProductTypeProfile {
  return PRODUCT_TYPE_PROFILES[productTypeSlug] ?? {
    use: `${productTypeName.toLowerCase()} collections and buyer-defined programs`,
    construction: "silhouette, pattern, functional details, seams, trims, openings and finishing",
    decisions: ["intended use and silhouette", "pattern and functional details", "trims, branding and finish"],
  };
}

function styleDecisions(name: string, slug: string) {
  const source = `${name} ${slug.replace(/-/g, " ")}`.toLowerCase();
  return STYLE_SIGNALS
    .filter(({ pattern }) => pattern.test(source))
    .map(({ decision }) => decision)
    .slice(0, 4);
}

function enabledCustomization(customization: Record<string, boolean> | null | undefined) {
  return Object.entries(customization ?? {})
    .filter(([, enabled]) => enabled)
    .map(([key]) => CUSTOMIZATION_LABELS[key] ?? key.replace(/_/g, " "));
}

function usableSeoTitle(value: string | null | undefined, name: string) {
  const title = clean(value);
  return title
    && title.toLowerCase().includes(name.toLowerCase())
    && /(manufacturer|supplier)/i.test(title)
    && /irha apparels/i.test(title)
    ? title
    : "";
}

export function hasBlockedBuyerReadyTerm(value: string) {
  const lower = value.toLowerCase();
  return BLOCKED_PUBLIC_TERMS.some((term) => lower.includes(term));
}

export function buyerReadyProgramDescription(mainCategorySlug: string, productName: string) {
  const profile = categoryProfile(mainCategorySlug);
  return `${productName} custom manufacturing for ${profile.buyers}. Materials, construction, sizing, branding, packaging, sampling, quantity and production timing are confirmed against the buyer-approved specification.`;
}

export function resolveBuyerReadyProductContent(
  input: BuyerReadyProductContentInput,
  legacyMainCategorySlug?: string,
): BuyerReadyProductContent {
  const name = clean(input.name);
  const slug = clean(input.slug) || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const mainCategorySlug = clean(input.mainCategorySlug) || clean(legacyMainCategorySlug) || "custom-apparel";
  const mainCategoryName = clean(input.mainCategoryName) || titleCase(mainCategorySlug);
  const audienceName = clean(input.audienceName) || titleCase(clean(input.audienceSlug) || "B2B buyers");
  const productTypeSlug = clean(input.productTypeSlug) || "custom-apparel";
  const productTypeName = clean(input.productTypeName) || titleCase(productTypeSlug);
  const category = categoryProfile(mainCategorySlug);
  const productType = productTypeProfile(productTypeSlug, productTypeName);
  const specificDecisions = styleDecisions(name, slug);
  const decisionPoints = [...new Set([...specificDecisions, ...productType.decisions])].slice(0, 6);
  const decisionSummary = joinNatural(decisionPoints.slice(0, 4));
  const audienceQualifier = audienceName.toLowerCase() === "accessories"
    ? "accessory-focused"
    : `${audienceName.toLowerCase()}-focused`;
  const narrativeVariant = stableVariant(slug, 7) % 3;
  const openingAnswers = [
    `Irha Apparels manufactures custom ${name} for ${category.buyers}. This ${audienceQualifier} ${productTypeName.toLowerCase()} program supports ${productType.use}; ${decisionSummary}, materials, sizing, branding and packing are confirmed from the buyer-approved specification.`,
    `Custom ${name} manufacturing at Irha Apparels is intended for ${category.buyers}. The ${audienceQualifier} program covers ${productType.use}, while the approved brief records ${decisionSummary}, material, measurements, branding and packing before production.`,
    `Irha Apparels develops made-to-order ${name} for ${category.buyers}. The ${productTypeName.toLowerCase()} brief is built around ${decisionSummary} and supports ${productType.use}, with material, fit, colours, branding and packing approved for the order.`,
  ];
  const openingAnswer = openingAnswers[narrativeVariant];

  const materialGuidance = category.materialReview;
  const constructionGuidance =
    `For ${name}, sampling and quality review focus on ${productType.construction}. ` +
    `The production standard is the approved sample, measurement chart and order specification, with checks for ${category.qualityFocus}.`;

  const customizationItems = enabledCustomization(input.customization);
  const customizationGuidance = customizationItems.length
    ? `Verified order options recorded for this product include ${joinNatural(customizationItems)}. Artwork, method, placement, colours, trims and label content remain subject to buyer approval and order review.`
    : `Branding, artwork method, placement, colours, trims and label content are reviewed from the buyer's files before any order-specific capability is confirmed.`;

  const sizes = (input.available_sizes ?? []).map(clean).filter(Boolean);
  const colours = (input.available_colors ?? []).map(clean).filter(Boolean);
  const sizeAndFitGuidance =
    `The RFQ should include the intended fit, base size measurements, grading rules and size-by-colour breakdown. ` +
    `${sizes.length ? `The current catalogue record notes ${joinNatural(sizes)}. ` : ""}` +
    `${colours.length ? `Colour handling is recorded as ${joinNatural(colours)}; final standards still require an approved reference. ` : ""}` +
    `Order-specific fit and colour tolerances are agreed during sampling.`;

  const samplingSteps = [
    `Send the ${name} tech pack or clear reference, intended market, quantity breakdown and target use.`,
    `Review ${decisionSummary}, material direction, branding files, size chart, packing and delivery requirements.`,
    `Approve the material or component direction and the ${name} sample, measurements, colours and decoration.`,
    "Confirm the purchase-order specification, quality checkpoints, packaging, production schedule and logistics terms before bulk production.",
  ];

  const packagingAndLogistics =
    `${clean(input.packaging_standard) || "Individual or bulk packing is selected against the buyer brief"}. ` +
    `Labels, hangtags, barcode or carton marks, assortment, destination, Incoterm and freight responsibility are confirmed per order; third-party transit and customs outcomes are not presented as factory guarantees.`;

  const moqAndLeadTime =
    `MOQ and production lead time for ${name} are quoted only after material availability, construction complexity, artwork, sample status, size-and-colour split, quantity, packaging and delivery terms have been reviewed.`;

  const buyerUseCases = [
    `${name} for ${productType.use}`,
    `${mainCategoryName} line development for ${category.buyers}`,
    `OEM, ODM, wholesale and private-label ${productTypeName.toLowerCase()} programs with order-specific approval`,
  ];

  const faqs: BuyerReadyFaq[] = [
    {
      question: `What should ${/^[aeiou]/i.test(name) ? "an" : "a"} ${name} RFQ include?`,
      answer:
        `Include the intended market and use, ${decisionSummary}, material direction, target quantity by size and colour, measurement chart, branding artwork, labels, packing and delivery destination. Irha Apparels reviews these inputs before confirming a quotation, MOQ or schedule.`,
    },
    {
      question: `How is ${/^[aeiou]/i.test(name) ? "an" : "a"} ${name} sample approved?`,
      answer:
        `Approval should record the selected material or components, ${productType.construction}, measurements, fit, colours, decoration, labels and packing. Bulk production follows the signed-off sample and purchase-order specification.`,
    },
  ];

  const descriptionClosings = [
    `${constructionGuidance} For quotation and sample approval, the ${name} brief should define ${decisionSummary}, the intended market, quantity by size and colour, artwork, labels, packing and delivery destination.`,
    `Before a ${name} quotation is confirmed, the buyer records ${decisionSummary}, market, size-and-colour quantities, artwork, labels, packing and destination. Sample review then checks ${productType.construction}, measurements and ${category.qualityFocus} against the order specification.`,
    `Development starts with the ${name} use case and these decisions: ${decisionPoints.join("; ")}. Material direction, measurements, branding, packaging and destination are reviewed before quotation; the sample is assessed for ${productType.construction} and ${category.qualityFocus}.`,
  ];
  const description = `${openingAnswer} ${descriptionClosings[narrativeVariant]}`;

  const seoTitle =
    usableSeoTitle(input.seo_title, name)
    || `${name} Manufacturer | Irha Apparels`;
  const seoDescription = truncate(
    `Irha Apparels manufactures custom ${name} for brands, wholesalers and private-label buyers. Materials, construction, sizing, branding and sampling are reviewed per order.`,
    160,
  );
  const primaryQuery = `${name} manufacturer`;
  const categoryQueries: Record<string, string[]> = {
    "bavarian-trachten-wear": [
      `custom ${name} manufacturer`,
      `wholesale ${name} supplier`,
      `private label ${name} manufacturer`,
    ],
    "premium-leather-apparel": [
      `custom ${name} manufacturer`,
      `private label ${name} manufacturer`,
      `${name} wholesale supplier`,
    ],
    sportswear: [
      `custom ${name} manufacturer`,
      `OEM ${name} supplier`,
      `wholesale ${name} supplier`,
    ],
    "streetwear-activewear": [
      `private label ${name} manufacturer`,
      `custom ${name} manufacturer`,
      `bulk ${name} manufacturer`,
    ],
    "leisure-nightwear": [
      `private label ${name} manufacturer`,
      `wholesale ${name} supplier`,
      `custom ${name} manufacturer`,
    ],
  };
  const supportingQueries = [
    ...(categoryQueries[mainCategorySlug] ?? [`custom ${name} manufacturer`, `wholesale ${name} supplier`]),
    `${name} manufacturer Pakistan`,
  ];
  const bodyText = [
    openingAnswer,
    "Buyer and collection uses",
    ...buyerUseCases,
    "Material and construction decisions",
    materialGuidance,
    constructionGuidance,
    "Customization, size and fit",
    customizationGuidance,
    sizeAndFitGuidance,
    "Sampling and approval workflow",
    ...samplingSteps,
    "MOQ, production and logistics",
    moqAndLeadTime,
    packagingAndLogistics,
    "Buyer questions",
    ...faqs.flatMap(({ question, answer }) => [question, answer]),
  ].join("\n\n");

  return {
    name,
    h1: name,
    seoTitle,
    seoDescription,
    shortDescription: openingAnswer,
    description,
    openingAnswer,
    buyerUseCases,
    materialGuidance,
    constructionGuidance,
    customizationGuidance,
    sizeAndFitGuidance,
    samplingSteps,
    packagingAndLogistics,
    moqAndLeadTime,
    decisionPoints,
    faqs,
    queryCluster: {
      primaryQuery,
      supportingQueries,
      intent: "commercial-b2b",
    },
    bodyText,
  };
}
