import type { NormalizedCategory, NormalizedProduct, NormalizedSub } from "@/hooks/usePublicCategoryData";

export type AudienceSlug = "men" | "women" | "kids" | "unisex" | "team-club" | "family-hospitality" | "accessories";

export type TaxonomyProduct = NormalizedProduct & {
  sourceSubSlug: string;
  sourceSubName: string;
};

export type TaxonomyCollection = {
  slug: string;
  name: string;
  keyword: string;
  description: string;
  products: TaxonomyProduct[];
};

export type TaxonomyAudience = {
  slug: AudienceSlug;
  name: string;
  keyword: string;
  description: string;
  collections: TaxonomyCollection[];
  productCount: number;
};

export type CategoryTaxonomy = {
  categorySlug: string;
  audiences: TaxonomyAudience[];
  unassignedCount: number;
};

type CollectionRule = Omit<TaxonomyCollection, "products"> & {
  terms: string[];
  exclude?: string[];
};

type AudienceRule = Omit<TaxonomyAudience, "collections" | "productCount">;

type CategoryRule = {
  audiences: AudienceRule[];
  collections: CollectionRule[];
};

const A = (slug: AudienceSlug, name: string, keyword: string, description: string): AudienceRule => ({
  slug,
  name,
  keyword,
  description,
});

const C = (
  slug: string,
  name: string,
  keyword: string,
  description: string,
  terms: string[],
  exclude: string[] = [],
): CollectionRule => ({ slug, name, keyword, description, terms, exclude });

export const CATEGORY_TAXONOMY_RULES: Record<string, CategoryRule> = {
  "bavarian-trachten-wear": {
    audiences: [
      A("men", "Men", "men's Trachten manufacturer", "Lederhosen, Bundhosen, Trachten shirts, vests and coordinated men's Bavarian programs."),
      A("women", "Women", "women's Dirndl manufacturer", "Dirndl dresses, blouses, aprons and coordinated women's Trachten programs."),
      A("kids", "Kids", "kids Bavarian clothing manufacturer", "Boys' Lederhosen, girls' Dirndl and children's Trachten programs."),
      A("accessories", "Accessories", "Bavarian accessories manufacturer", "Suspenders, belts, hats, socks, footwear and coordinated Trachten accessories."),
    ],
    collections: [
      C("short-lederhosen", "Short Lederhosen", "short Lederhosen manufacturer", "Short Lederhosen programs for wholesale, OEM and private-label buyers.", ["short lederhosen", "lederhosen"], ["long", "bundhosen", "knee", "children", "kids"]),
      C("knee-length-lederhosen-bundhosen", "Knee-Length Lederhosen & Bundhosen", "Bundhosen manufacturer", "Knee-length Lederhosen and Bundhosen programs developed to buyer specification.", ["bundhosen", "kniebund", "knee-length", "traditional lederhosen"]),
      C("long-leather-pants", "Long Leather Pants", "long Bavarian leather pants manufacturer", "Full-length Bavarian leather pants with custom construction and decoration options.", ["long leather pants", "long-leather-pants", "leather trousers"]),
      C("trachten-shirts", "Trachten Shirts", "Trachten shirt manufacturer", "Check, gingham, band-collar and traditional-inspired shirts for B2B programs.", ["trachten shirt", "checkered shirt", "gingham shirt", "band collar shirt"]),
      C("trachten-vests-jankers", "Trachten Vests & Jankers", "Trachten vest and Janker manufacturer", "Vests, waistcoats and Jankers for wholesale and private-label ranges.", ["vest", "waistcoat", "janker"]),
      C("dirndl-dresses", "Dirndl Dresses", "Dirndl dress manufacturer", "Dirndl dress programs for wholesale, retail and private-label buyers.", ["dirndl dress", "traditional dirndl", "linen dirndl", "velvet dirndl", "long dirndl", "midi dirndl", "mini dirndl"]),
      C("dirndl-blouses", "Dirndl Blouses", "Dirndl blouse manufacturer", "Coordinated Dirndl blouse programs with buyer-approved neckline, sleeves and decoration.", ["dirndl blouse", "trachten blouse"]),
      C("dirndl-aprons", "Dirndl Aprons", "Dirndl apron manufacturer", "Custom Dirndl aprons for coordinated Trachten collections.", ["dirndl apron", "trachten apron"]),
      C("womens-trachten-jackets-vests", "Women's Trachten Jackets & Vests", "women's Trachten jacket manufacturer", "Women's Trachten outerwear and layering pieces developed by buyer brief.", ["women's trachten jacket", "womens trachten jacket", "women's vest", "womens vest", "women's janker", "womens janker"]),
      C("boys-lederhosen", "Boys' Lederhosen", "boys Lederhosen manufacturer", "Children's and boys' Lederhosen programs for retailers and private-label buyers.", ["children's lederhosen", "childrens lederhosen", "kids lederhosen", "boys lederhosen"]),
      C("girls-dirndl", "Girls' Dirndl Dresses", "girls Dirndl manufacturer", "Girls' and children's Dirndl programs with custom sizing and decoration.", ["children's dirndl", "childrens dirndl", "kids dirndl", "girls dirndl"]),
      C("kids-trachten-shirts", "Kids' Trachten Shirts", "kids Trachten shirt manufacturer", "Children's Trachten shirts for coordinated retail and family ranges.", ["kids trachten shirt", "children's trachten shirt", "childrens trachten shirt", "boys trachten shirt"]),
      C("suspenders-belts", "Suspenders & Belts", "Bavarian suspenders and belt manufacturer", "Coordinated leather suspenders and belts for Trachten programs.", ["suspender", "belt"]),
      C("hats-headwear", "Bavarian Hats & Headwear", "Bavarian hat manufacturer", "Traditional-inspired hats and Alpine headwear for wholesale ranges.", ["hat", "headwear", "alpine cap"]),
      C("socks-footwear", "Trachten Socks & Footwear", "Trachten socks and footwear supplier", "Coordinated socks, Loferl and footwear programs where available.", ["sock", "loferl", "shoe", "boot", "footwear"]),
      C("scarves-other-accessories", "Scarves & Trachten Accessories", "Trachten accessories manufacturer", "Scarves and supporting accessories for complete Bavarian collections.", ["scarf", "accessor", "brooch", "charivari"]),
    ],
  },
  "premium-leather-apparel": {
    audiences: [
      A("men", "Men", "men's leather apparel manufacturer", "Men's leather jackets, vests, trousers and outerwear for private-label programs."),
      A("women", "Women", "women's leather apparel manufacturer", "Women's leather jackets, coats, vests, skirts and trousers."),
      A("kids", "Kids", "kids leather jacket manufacturer", "Children's and youth leather outerwear programs by buyer specification."),
      A("accessories", "Accessories", "private-label leather accessories manufacturer", "Belts, gloves, bags and coordinated leather accessories."),
    ],
    collections: [
      C("biker-jackets", "Biker Leather Jackets", "biker leather jacket manufacturer", "Biker and motorcycle-inspired leather jacket programs.", ["biker jacket", "motorcycle jacket", "moto jacket"]),
      C("bomber-jackets", "Leather Bomber Jackets", "leather bomber jacket manufacturer", "Private-label leather bomber jacket programs.", ["bomber leather jacket", "leather bomber", "bomber jacket"]),
      C("leather-jackets", "Leather Jackets", "leather jacket manufacturer", "Custom leather jackets for brands, wholesalers and private-label buyers.", ["leather jacket", "jacket"]),
      C("leather-coats-outerwear", "Leather Coats & Outerwear", "leather coat manufacturer", "Long-form leather outerwear and coat programs.", ["leather coat", "trench", "outerwear"]),
      C("leather-vests-waistcoats", "Leather Vests & Waistcoats", "leather vest manufacturer", "Leather vest and waistcoat programs with custom trims and branding.", ["leather vest", "waistcoat", "vest"]),
      C("leather-pants-trousers", "Leather Pants & Trousers", "leather pants manufacturer", "Leather trouser and pant programs for wholesale and private label.", ["leather pants", "leather trouser", "leather leggings"]),
      C("leather-skirts", "Leather Skirts", "leather skirt manufacturer", "Women's leather skirt programs developed to buyer specification.", ["leather skirt", "skirt"]),
      C("leather-belts", "Leather Belts", "private-label leather belt manufacturer", "Full-grain and custom-branded leather belt programs.", ["leather belt", "belt"]),
      C("leather-gloves", "Leather Gloves", "leather glove manufacturer", "Leather glove programs for retail and private-label ranges.", ["leather glove", "glove"]),
      C("leather-bags-accessories", "Leather Bags & Accessories", "leather accessories manufacturer", "Leather bags and supporting accessories developed from buyer briefs.", ["bag", "wallet", "accessor", "pouch"]),
    ],
  },
  sportswear: {
    audiences: [
      A("men", "Men", "men's custom sportswear manufacturer", "Men's performance apparel and custom training programs."),
      A("women", "Women", "women's custom sportswear manufacturer", "Women's performance apparel and teamwear programs."),
      A("kids", "Kids & Youth", "youth sportswear manufacturer", "Youth, academy and school teamwear programs."),
      A("team-club", "Teams & Clubs", "custom teamwear manufacturer", "Club, academy, federation and team uniform programs."),
    ],
    collections: [
      C("football-kits", "Football & Soccer Kits", "custom football kit manufacturer", "Custom football and soccer kits for clubs, academies and brands.", ["football", "soccer"]),
      C("basketball-uniforms", "Basketball Uniforms", "basketball uniform manufacturer", "Custom basketball jerseys, shorts and team uniform programs.", ["basketball"]),
      C("cricket-uniforms", "Cricket Uniforms", "cricket uniform manufacturer", "Cricket shirts, trousers and team kit programs.", ["cricket"]),
      C("rugby-kits", "Rugby Kits", "rugby kit manufacturer", "Custom rugby jerseys, shorts and coordinated team programs.", ["rugby"]),
      C("baseball-uniforms", "Baseball Uniforms", "baseball uniform manufacturer", "Baseball jerseys, pants and complete uniform programs.", ["baseball"]),
      C("hockey-uniforms", "Hockey Uniforms", "hockey uniform manufacturer", "Custom hockey teamwear and uniform programs.", ["hockey"]),
      C("tracksuits", "Custom Tracksuits", "custom tracksuit manufacturer", "Team, club and private-label tracksuit programs.", ["tracksuit", "track suit"]),
      C("training-wear", "Training Wear", "custom training wear manufacturer", "Training shirts, bibs, shorts and warm-up apparel.", ["training", "warm-up", "warmup", "bib"]),
      C("gym-fitness-wear", "Gym & Fitness Wear", "gym wear manufacturer", "Performance gym, fitness and workout apparel programs.", ["gym", "fitness", "workout", "compression", "onesie"]),
      C("combat-wrestling-wear", "Combat & Wrestling Wear", "wrestling and combat wear manufacturer", "Wrestling singlets and combat-sport apparel programs.", ["wrestling", "singlet", "boxing", "mma", "combat"]),
      C("other-teamwear", "Other Teamwear", "private-label teamwear manufacturer", "Additional team uniforms and performance apparel by buyer brief.", ["jersey", "uniform", "kit", "teamwear"]),
    ],
  },
  "streetwear-activewear": {
    audiences: [
      A("men", "Men", "men's streetwear manufacturer", "Men's streetwear, activewear and private-label capsule programs."),
      A("women", "Women", "women's activewear manufacturer", "Women's activewear, streetwear and coordinated set programs."),
      A("kids", "Kids & Youth", "kids streetwear manufacturer", "Youth streetwear and activewear programs."),
      A("unisex", "Unisex", "unisex streetwear manufacturer", "Oversized, relaxed-fit and gender-neutral streetwear programs."),
    ],
    collections: [
      C("hoodies-sweatshirts", "Hoodies & Sweatshirts", "private-label hoodie manufacturer", "Custom hoodies and sweatshirts for private-label collections.", ["hoodie", "sweatshirt", "crewneck"]),
      C("t-shirts-tops", "T-Shirts & Tops", "private-label T-shirt manufacturer", "Oversized, graphic and performance top programs.", ["t-shirt", "t shirt", "tee", "top", "crop"]),
      C("joggers-sweatpants", "Joggers & Sweatpants", "jogger and sweatpants manufacturer", "Custom jogger and sweatpant programs.", ["jogger", "sweatpant"]),
      C("tracksuits", "Tracksuits", "private-label tracksuit manufacturer", "Streetwear and activewear tracksuit programs.", ["tracksuit", "track suit"]),
      C("cargo-pants", "Cargo Pants", "cargo pants manufacturer", "Custom cargo trouser programs with buyer-specified pockets and trims.", ["cargo"]),
      C("jackets-bombers", "Jackets & Bombers", "streetwear jacket manufacturer", "Bomber, varsity and lightweight streetwear jacket programs.", ["jacket", "bomber", "varsity", "windbreaker"]),
      C("activewear-sets", "Activewear Sets", "private-label activewear set manufacturer", "Coordinated performance and athleisure sets.", ["activewear set", "gym set", "yoga set", "matching set"]),
      C("leggings-performance-bottoms", "Leggings & Performance Bottoms", "leggings manufacturer", "Women's and unisex performance bottom programs.", ["legging", "performance pants", "yoga pants"]),
      C("sports-bras-crop-tops", "Sports Bras & Crop Tops", "sports bra manufacturer", "Women's activewear tops developed to buyer specification.", ["sports bra", "crop top"]),
    ],
  },
  "leisure-nightwear": {
    audiences: [
      A("men", "Men", "men's leisurewear and nightwear manufacturer", "Men's casual essentials, loungewear and sleepwear programs."),
      A("women", "Women", "women's nightwear manufacturer", "Women's lounge, sleep and casual apparel programs."),
      A("kids", "Kids", "kids nightwear manufacturer", "Children's pajama, loungewear and casual apparel programs."),
      A("family-hospitality", "Family & Hospitality", "family pajama and hospitality apparel manufacturer", "Matching family sets, hotel robes and hospitality sleepwear programs."),
    ],
    collections: [
      C("t-shirts-polos", "T-Shirts & Polos", "private-label T-shirt and polo manufacturer", "Casual T-shirt, polo and essential top programs.", ["t-shirt", "t shirt", "v-neck", "crewneck", "polo"]),
      C("shirts-henleys", "Shirts & Henleys", "casual shirt manufacturer", "Button-up, Henley and casual shirt programs.", ["shirt", "henley"], ["nightshirt"]),
      C("shorts-casual-bottoms", "Shorts & Casual Bottoms", "casual shorts manufacturer", "Casual short and everyday bottom programs.", ["shorts", "chino", "casual pants"]),
      C("pajama-sets", "Pajama Sets", "private-label pajama manufacturer", "Cotton, modal, satin and printed pajama set programs.", ["pajama", "pyjama", "night suit", "sleep set"]),
      C("nightshirts-nightdresses", "Nightshirts & Nightdresses", "nightshirt and nightdress manufacturer", "Nightshirt, nightdress and slip programs.", ["nightshirt", "nightgown", "nightdress", "sleep dress", "slip"]),
      C("robes-bathrobes", "Robes & Bathrobes", "bathrobe manufacturer", "Sleep robes, bathrobes and hotel robe programs.", ["robe", "bathrobe", "dressing gown"]),
      C("lounge-sets", "Lounge Sets", "private-label loungewear manufacturer", "Coordinated lounge and relaxed apparel sets.", ["lounge set", "loungewear set", "co-ord"]),
      C("sleep-pants-shorts", "Sleep Pants & Shorts", "sleep pants manufacturer", "Sleep pants, pajama bottoms and lounge shorts.", ["sleep pants", "pajama pants", "pyjama pants", "lounge shorts"]),
      C("family-matching-sets", "Matching Family Sets", "matching family pajama manufacturer", "Coordinated family sleepwear and seasonal matching programs.", ["family", "matching pajama", "matching pyjama"]),
      C("hotel-hospitality-programs", "Hotel & Hospitality Programs", "hotel robe and hospitality apparel manufacturer", "Hospitality robes, sleepwear and guest apparel by program brief.", ["hotel", "hospitality", "spa robe", "guest"]),
    ],
  },
};

const ACCESSORY_TERMS = ["belt", "glove", "bag", "wallet", "hat", "sock", "shoe", "boot", "suspender", "scarf", "accessor", "brooch", "charivari"];
const WOMEN_TERMS = ["women", "woman", "womens", "women's", "ladies", "lady", "girls", "girl", "dirndl", "nightgown", "nightdress", "sports bra", "legging", "skirt", "crop top"];
const KIDS_TERMS = ["kids", "kid", "children", "children's", "childrens", "child", "youth", "junior", "boys", "boy", "girls", "girl"];
const MEN_TERMS = ["men", "mens", "men's", "male", "boys", "boy"];

function includesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

function productText(product: TaxonomyProduct) {
  return `${product.slug} ${product.name} ${product.description ?? ""} ${product.sourceSubSlug} ${product.sourceSubName}`.toLowerCase();
}

function productAudiences(categorySlug: string, product: TaxonomyProduct): AudienceSlug[] {
  const value = productText(product);
  const explicitKids = includesAny(value, KIDS_TERMS);
  const explicitWomen = includesAny(value, WOMEN_TERMS);
  const explicitMen = includesAny(value, MEN_TERMS);
  const accessory = includesAny(value, ACCESSORY_TERMS);

  if (categorySlug === "bavarian-trachten-wear") {
    if (accessory || product.sourceSubSlug.includes("accessor")) return ["accessories"];
    if (explicitKids || product.sourceSubSlug.includes("kids")) return ["kids"];
    if (explicitWomen || product.sourceSubSlug.includes("women")) return ["women"];
    return ["men"];
  }

  if (categorySlug === "premium-leather-apparel") {
    if (accessory) return ["accessories"];
    if (explicitKids) return ["kids"];
    if (explicitWomen) return ["women"];
    if (explicitMen) return ["men"];
    return ["men", "women"];
  }

  if (categorySlug === "sportswear") {
    const audiences: AudienceSlug[] = ["team-club"];
    if (explicitKids) audiences.push("kids");
    else audiences.push("men", "women", "kids");
    return Array.from(new Set(audiences));
  }

  if (categorySlug === "streetwear-activewear") {
    if (explicitKids) return ["kids"];
    if (explicitWomen) return ["women"];
    if (explicitMen) return ["men"];
    return ["men", "women", "unisex"];
  }

  if (categorySlug === "leisure-nightwear") {
    const audiences: AudienceSlug[] = [];
    if (explicitKids) audiences.push("kids");
    else if (explicitWomen) audiences.push("women");
    else if (explicitMen) audiences.push("men");
    else audiences.push("men", "women");
    if (includesAny(value, ["family", "matching", "hotel", "hospitality", "robe", "bathrobe"])) {
      audiences.push("family-hospitality");
    }
    return Array.from(new Set(audiences));
  }

  return ["unisex"];
}

function collectionMatches(rule: CollectionRule, product: TaxonomyProduct) {
  const value = productText(product);
  if (rule.exclude?.some((term) => value.includes(term))) return false;
  return rule.terms.some((term) => value.includes(term));
}

function flattenProducts(subs: NormalizedSub[]): TaxonomyProduct[] {
  return subs.flatMap((sub) =>
    sub.products.map((product) => ({
      ...product,
      sourceSubSlug: sub.slug,
      sourceSubName: sub.name,
    })),
  );
}

export function buildCategoryTaxonomy(category: NormalizedCategory): CategoryTaxonomy {
  const rule = CATEGORY_TAXONOMY_RULES[category.slug];
  if (!rule) return { categorySlug: category.slug, audiences: [], unassignedCount: category.productCount };

  const products = flattenProducts(category.subs);
  const assignedProductSlugs = new Set<string>();

  const audiences = rule.audiences.map((audienceRule) => {
    const audienceProducts = products.filter((product) => productAudiences(category.slug, product).includes(audienceRule.slug));
    const used = new Set<string>();
    const collections = rule.collections
      .map((collectionRule) => {
        const matched = audienceProducts.filter((product) => {
          if (used.has(product.slug)) return false;
          return collectionMatches(collectionRule, product);
        });
        matched.forEach((product) => {
          used.add(product.slug);
          assignedProductSlugs.add(product.slug);
        });
        return { ...collectionRule, products: matched };
      })
      .filter((collection) => collection.products.length > 0);

    const fallbackProducts = audienceProducts.filter((product) => !used.has(product.slug));
    if (fallbackProducts.length > 0) {
      fallbackProducts.forEach((product) => assignedProductSlugs.add(product.slug));
      collections.push({
        slug: `other-${audienceRule.slug}-styles`,
        name: `Other ${audienceRule.name} Styles`,
        keyword: `${audienceRule.keyword} product range`,
        description: "Additional buyer-ready styles that can be developed, branded and packed against an approved specification.",
        products: fallbackProducts,
      });
    }

    return {
      ...audienceRule,
      collections,
      productCount: audienceProducts.length,
    };
  });

  return {
    categorySlug: category.slug,
    audiences,
    unassignedCount: products.filter((product) => !assignedProductSlugs.has(product.slug)).length,
  };
}

export function getTaxonomyAudience(category: NormalizedCategory, audienceSlug?: string) {
  if (!audienceSlug) return null;
  return buildCategoryTaxonomy(category).audiences.find((audience) => audience.slug === audienceSlug) ?? null;
}

export function getTaxonomyCollection(category: NormalizedCategory, audienceSlug?: string, collectionSlug?: string) {
  const audience = getTaxonomyAudience(category, audienceSlug);
  if (!audience || !collectionSlug) return null;
  return audience.collections.find((collection) => collection.slug === collectionSlug) ?? null;
}

export function taxonomyAudiencePath(categorySlug: string, audienceSlug: string, locale?: string) {
  const path = `/products/${categorySlug}/${audienceSlug}`;
  return locale && locale !== "en" ? `/intl/${locale}${path}` : path;
}

export function taxonomyCollectionPath(categorySlug: string, audienceSlug: string, collectionSlug: string, locale?: string) {
  return `${taxonomyAudiencePath(categorySlug, audienceSlug, locale)}/${collectionSlug}`;
}
