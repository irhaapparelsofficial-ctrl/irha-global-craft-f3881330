const SITE_MEDIA_ROOT = "https://pvzjiozismyxqrzmtfbi.supabase.co/storage/v1/object/public/site-media";

export const MAIN_CATEGORY_SLUGS = [
  "bavarian-trachten-wear",
  "premium-leather-apparel",
  "sportswear",
  "streetwear-activewear",
  "leisure-nightwear",
] as const;

export type MainCategorySlug = (typeof MAIN_CATEGORY_SLUGS)[number];

export type CategoryMediaRole =
  | "category_bavarian_trachten"
  | "category_leather"
  | "category_sportswear"
  | "category_streetwear_activewear"
  | "category_leisure_nightwear";

export type CategoryCurationRule = {
  id: string;
  anyOf: readonly string[];
  exclude?: readonly string[];
};

export type CanonicalCategoryMedia = {
  id: string;
  slug: MainCategorySlug;
  homepageRole: CategoryMediaRole;
  name: string;
  description: string;
  src: string;
  fallbackSrc: string;
  altTextKey: string;
  alt: string;
  fit: "contain" | "cover";
  position: string;
  backgroundClassName: string;
  provenance: "homepage-approved";
  childMediaPolicy: "curate-from-exact-route-products";
  rootExclusions: readonly string[];
  curation: readonly CategoryCurationRule[];
};

const ROOT_GARMENT_EXCLUSIONS = [
  "boot",
  "shoe",
  "slipper",
  "sock",
  "hat",
  "belt",
  "bag",
  "wallet",
  "glove",
  "apron",
  "suspender",
  "scarf",
  "neckerchief",
] as const;

export const CATEGORY_MEDIA_REGISTRY: Record<MainCategorySlug, CanonicalCategoryMedia> = {
  "bavarian-trachten-wear": {
    id: "category:bavarian-trachten-wear:hero:v1",
    slug: "bavarian-trachten-wear",
    homepageRole: "category_bavarian_trachten",
    name: "Bavarian & Trachten Wear",
    description: "Lederhosen, dirndl, shirts, vests and accessories",
    src: "/product-media/traditional-knee-length-lederhosen/web/traditional-knee-length-lederhosen-design-01-front-web-1600.webp",
    fallbackSrc: "/product-media/traditional-knee-length-lederhosen/web/traditional-knee-length-lederhosen-design-01-front-web-1600.webp",
    altTextKey: "category.bavarian-trachten-wear.hero",
    alt: "Bavarian and Trachten garments for custom manufacturing",
    fit: "contain",
    position: "center center",
    backgroundClassName: "bg-[#f4f0e7]",
    provenance: "homepage-approved",
    childMediaPolicy: "curate-from-exact-route-products",
    rootExclusions: ROOT_GARMENT_EXCLUSIONS,
    curation: [
      { id: "lederhosen", anyOf: ["premium embroidered lederhosen", "knee length lederhosen", "lederhosen"] },
      { id: "dirndl", anyOf: ["long dirndl", "midi dirndl", "dirndl"] },
      { id: "vest", anyOf: ["trachten vest", "wool trachten vest", "vest"] },
      { id: "shirt", anyOf: ["checked trachten shirt", "trachten shirt"] },
      { id: "janker", anyOf: ["traditional janker jacket", "loden jacket", "janker", "loden"] },
    ],
  },
  "premium-leather-apparel": {
    id: "category:premium-leather-apparel:hero:v1",
    slug: "premium-leather-apparel",
    homepageRole: "category_leather",
    name: "Premium Leather Apparel",
    description: "Biker jackets, bombers, vests and leather bottoms",
    src: `${SITE_MEDIA_ROOT}/catalog-migrated/2413dfaf-52c6-4495-bdee-84ed4f7bcc7e/6f7593c5f41340cd1cb6.png`,
    fallbackSrc: `${SITE_MEDIA_ROOT}/catalog-migrated/2413dfaf-52c6-4495-bdee-84ed4f7bcc7e/6f7593c5f41340cd1cb6.png`,
    altTextKey: "category.premium-leather-apparel.hero",
    alt: "Premium leather apparel for custom manufacturing",
    fit: "contain",
    position: "center center",
    backgroundClassName: "bg-[#f4f0e7]",
    provenance: "homepage-approved",
    childMediaPolicy: "curate-from-exact-route-products",
    rootExclusions: ROOT_GARMENT_EXCLUSIONS,
    curation: [
      { id: "biker", anyOf: ["classic biker", "biker jacket", "biker"] },
      { id: "cafe-racer", anyOf: ["cafe racer", "café racer"] },
      { id: "bomber", anyOf: ["bomber jacket", "aviator jacket", "bomber", "aviator"] },
      { id: "tailored", anyOf: ["leather blazer", "leather coat", "trench coat", "blazer", "coat"] },
      { id: "women", anyOf: ["women's leather", "women leather", "leather dress", "leather skirt"] },
    ],
  },
  sportswear: {
    id: "category:sportswear:hero:v1",
    slug: "sportswear",
    homepageRole: "category_sportswear",
    name: "Custom Sportswear & Teamwear",
    description: "Team uniforms, tracksuits, training and club programs",
    src: `${SITE_MEDIA_ROOT}/migrated-lovable/06/06a0ca39e249179c78d66560a2e869b8be2eaa26f91492dfc74cd0b47531b49c.png`,
    fallbackSrc: `${SITE_MEDIA_ROOT}/migrated-lovable/06/06a0ca39e249179c78d66560a2e869b8be2eaa26f91492dfc74cd0b47531b49c.png`,
    altTextKey: "category.sportswear.hero",
    alt: "Custom sportswear and teamwear for manufacturing programs",
    fit: "contain",
    position: "center center",
    backgroundClassName: "bg-[#f4f0e7]",
    provenance: "homepage-approved",
    childMediaPolicy: "curate-from-exact-route-products",
    rootExclusions: ROOT_GARMENT_EXCLUSIONS,
    curation: [
      { id: "football", anyOf: ["soccer home kit", "football kit", "soccer kit"] },
      { id: "basketball", anyOf: ["basketball uniform", "basketball"] },
      { id: "rugby", anyOf: ["rugby uniform", "rugby"] },
      { id: "cricket", anyOf: ["cricket uniform", "cricket"] },
      { id: "tracksuit", anyOf: ["team tracksuit", "tracksuit"] },
      { id: "training", anyOf: ["training wear", "training set", "training"] },
    ],
  },
  "streetwear-activewear": {
    id: "category:streetwear-activewear:hero:v1",
    slug: "streetwear-activewear",
    homepageRole: "category_streetwear_activewear",
    name: "Streetwear & Activewear",
    description: "Hoodies, tees, joggers and private-label sets",
    src: `${SITE_MEDIA_ROOT}/catalog-migrated/a9a240d8-d213-4e32-96fb-502ad97af81e/03846f889cb017b8911c.png`,
    fallbackSrc: `${SITE_MEDIA_ROOT}/catalog-migrated/a9a240d8-d213-4e32-96fb-502ad97af81e/03846f889cb017b8911c.png`,
    altTextKey: "category.streetwear-activewear.hero",
    alt: "Private-label streetwear and activewear for custom manufacturing",
    fit: "contain",
    position: "center center",
    backgroundClassName: "bg-[#f4f0e7]",
    provenance: "homepage-approved",
    childMediaPolicy: "curate-from-exact-route-products",
    rootExclusions: ROOT_GARMENT_EXCLUSIONS,
    curation: [
      { id: "oversized-tee", anyOf: ["heavyweight oversized t shirt", "oversized t shirt", "oversized tee", "heavyweight t shirt"] },
      { id: "hoodie", anyOf: ["premium zip hoodie", "oversized pullover hoodie", "premium hoodie", "hoodie"] },
      { id: "tracksuit", anyOf: ["streetwear tracksuit", "tech fleece tracksuit", "tracksuit"] },
      { id: "outerwear", anyOf: ["varsity jacket", "bomber jacket", "puffer jacket", "varsity", "puffer"] },
      { id: "cargo", anyOf: ["cargo pants", "parachute pants"] },
      { id: "women", anyOf: ["women's streetwear", "women streetwear", "women's oversized", "women oversized"] },
    ],
  },
  "leisure-nightwear": {
    id: "category:leisure-nightwear:hero:v1",
    slug: "leisure-nightwear",
    homepageRole: "category_leisure_nightwear",
    name: "Leisurewear & Nightwear",
    description: "Sleepwear, loungewear and custom leisure programs",
    src: `${SITE_MEDIA_ROOT}/catalog-migrated/7e5c462f-cfef-47b1-a5f5-690b1f42f4c6/ecb3eae8a15738828efc.png`,
    fallbackSrc: `${SITE_MEDIA_ROOT}/catalog-migrated/7e5c462f-cfef-47b1-a5f5-690b1f42f4c6/ecb3eae8a15738828efc.png`,
    altTextKey: "category.leisure-nightwear.hero",
    alt: "Leisurewear and nightwear for private-label manufacturing",
    fit: "contain",
    position: "center center",
    backgroundClassName: "bg-[#f4f0e7]",
    provenance: "homepage-approved",
    childMediaPolicy: "curate-from-exact-route-products",
    rootExclusions: ROOT_GARMENT_EXCLUSIONS,
    curation: [
      { id: "mens-pajama", anyOf: ["men's cotton pajama set", "men's pajama set", "men pajama", "pajama set"] },
      { id: "womens-pajama", anyOf: ["women's cotton pajama set", "women's pajama set", "women pajama"] },
      { id: "lounge", anyOf: ["women's long lounge set", "unisex lounge set", "lounge set"] },
      { id: "robe", anyOf: ["sleep robe", "bathrobe", "robe"] },
      { id: "coordinates", anyOf: ["relaxed set", "matching set", "leisure set"] },
    ],
  },
};

export type HomepageMediaMap = Partial<Record<CategoryMediaRole, string>>;

export function isMainCategorySlug(slug: string): slug is MainCategorySlug {
  return MAIN_CATEGORY_SLUGS.includes(slug as MainCategorySlug);
}

export function canonicalCategoryMedia(slug: string): CanonicalCategoryMedia | null {
  return isMainCategorySlug(slug) ? CATEGORY_MEDIA_REGISTRY[slug] : null;
}

export function resolveCanonicalCategoryMedia(
  slug: string,
  approvedHomepageMedia: HomepageMediaMap = {},
): CanonicalCategoryMedia | null {
  const registered = canonicalCategoryMedia(slug);
  if (!registered) return null;
  const approvedSource = approvedHomepageMedia[registered.homepageRole]?.trim();
  return approvedSource ? { ...registered, src: approvedSource } : registered;
}

export function resolveCanonicalCategoryMediaMap(approvedHomepageMedia: HomepageMediaMap = {}) {
  return Object.fromEntries(
    MAIN_CATEGORY_SLUGS.map((slug) => [slug, resolveCanonicalCategoryMedia(slug, approvedHomepageMedia)!]),
  ) as Record<MainCategorySlug, CanonicalCategoryMedia>;
}
