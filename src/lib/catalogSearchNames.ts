export type SearchNameRule = {
  name: string;
  defaults: string[];
};

export const TOP_CATEGORY_SEARCH_NAMES: Record<string, SearchNameRule> = {
  "bavarian-trachten-wear": {
    name: "Bavarian & Trachten Wear",
    defaults: ["Bavarian Trachten Wear", "Bavarian Wear", "Bavarian & Trachten Wear"],
  },
  "premium-leather-apparel": {
    name: "Premium Leather Apparel",
    defaults: ["Premium Leather Apparel", "Leatherwear"],
  },
  sportswear: {
    name: "Custom Sportswear & Teamwear",
    defaults: ["Sportswear", "Custom Sportswear & Teamwear"],
  },
  "streetwear-activewear": {
    name: "Streetwear & Activewear",
    defaults: ["Streetwear", "Streetwear & Activewear"],
  },
  "leisure-nightwear": {
    name: "Leisurewear & Nightwear",
    defaults: ["Leisurewear", "Nightwear", "Leisurewear & Nightwear"],
  },
};

export const SUBCATEGORY_SEARCH_NAMES: Record<string, SearchNameRule> = {
  "bavarian-trachten-wear/men": {
    name: "Men's Lederhosen & Trachten",
    defaults: ["Men's Trachten"],
  },
  "bavarian-trachten-wear/women": {
    name: "Women's Dirndl & Trachten",
    defaults: ["Women's Trachten"],
  },
  "bavarian-trachten-wear/kids": {
    name: "Kids' Bavarian Clothing",
    defaults: ["Children's Trachten"],
  },
  "bavarian-trachten-wear/accessories": {
    name: "Bavarian Trachten Accessories",
    defaults: ["Bavarian Accessories"],
  },
  "premium-leather-apparel/jackets": {
    name: "Custom Leather Jackets",
    defaults: ["Leather Jackets"],
  },
  "premium-leather-apparel/vests": {
    name: "Custom Leather Vests & Waistcoats",
    defaults: ["Leather Vests"],
  },
  "premium-leather-apparel/bottoms": {
    name: "Custom Leather Pants & Trousers",
    defaults: ["Leather Bottoms"],
  },
  "premium-leather-apparel/accessories": {
    name: "Private Label Leather Accessories",
    defaults: ["Leather Accessories"],
  },
  "sportswear/soccer": {
    name: "Custom Football & Soccer Kits",
    defaults: ["Soccer / Football"],
  },
  "sportswear/cricket": {
    name: "Custom Cricket Uniforms",
    defaults: ["Cricket"],
  },
  "sportswear/baseball": {
    name: "Custom Baseball Uniforms",
    defaults: ["Baseball"],
  },
  "sportswear/basketball": {
    name: "Custom Basketball Uniforms",
    defaults: ["Basketball"],
  },
  "sportswear/rugby": {
    name: "Custom Rugby Kits",
    defaults: ["Rugby"],
  },
  "sportswear/gym": {
    name: "Private Label Gym & Fitness Wear",
    defaults: ["Gym & Fitness"],
  },
  "streetwear-activewear/tops": {
    name: "Private Label Streetwear Tops",
    defaults: ["Streetwear Tops"],
  },
  "streetwear-activewear/bottoms": {
    name: "Private Label Streetwear Bottoms",
    defaults: ["Streetwear Bottoms"],
  },
  "leisure-nightwear/leisurewear-tops": {
    name: "Private Label Casualwear Tops",
    defaults: ["Leisurewear: Leisure Tops", "Leisure Tops"],
  },
  "leisure-nightwear/leisurewear-bottoms": {
    name: "Private Label Leisurewear Bottoms",
    defaults: ["Leisurewear: Leisure Bottoms", "Leisure Bottoms"],
  },
  "leisure-nightwear/leisure-nightwear-men": {
    name: "Men's Private Label Nightwear",
    defaults: ["Nightwear: Men's Nightwear", "Men's Nightwear"],
  },
  "leisure-nightwear/leisure-nightwear-women": {
    name: "Women's Private Label Nightwear",
    defaults: ["Nightwear: Women's Nightwear", "Women's Nightwear"],
  },
};

export const BASE_PRODUCT_SEARCH_NAMES: Record<string, string> = {
  "bavarian-checkered-shirt": "Men's Bavarian Checkered Trachten Shirt",
  "bavarian-embroidered-vest": "Men's Embroidered Trachten Vest",
  "bavarian-men-s-checkered-shirt": "Men's Checkered Trachten Shirt",
  "traditional-lederhosen": "Traditional Men's Lederhosen",
  "dirndl-apron": "Traditional Dirndl Apron",
  "dirndl-blouse": "Women's Dirndl Blouse",
  "traditional-dirndl-dress": "Traditional Bavarian Dirndl Dress",
  "children-s-dirndl": "Girls' Bavarian Dirndl Dress",
  "children-s-lederhosen": "Boys' Traditional Lederhosen",
  "alpine-trachten-hat": "Bavarian Alpine Trachten Hat",
  "bavarian-leather-belt": "Traditional Bavarian Leather Belt",
  "bavarian-neckerchief": "Bavarian Trachten Neckerchief",
  "bavarian-suspenders": "Embroidered Lederhosen Suspenders",
  "haferl-leather-shoes": "Traditional Bavarian Haferl Shoes",
  "knee-high-bavarian-socks": "Knee-High Trachten Socks",
  "bomber-leather-jacket": "Custom Leather Bomber Jacket",
  "classic-biker-leather-jacket": "Custom Biker Leather Jacket",
  "leather-vest-waistcoat": "Custom Leather Vest & Waistcoat",
  "leather-trousers": "Custom Leather Pants & Trousers",
  "full-grain-leather-belt": "Private Label Full-Grain Leather Belt",
  "leather-gloves": "Private Label Leather Gloves",
  "leather-wallet": "Private Label Leather Wallet",
  "premium-leather-bag": "Custom Full-Grain Leather Bag",
  "sublimated-soccer-uniform-kit": "Custom Sublimated Football & Soccer Kit",
  "cricket-jersey": "Custom Cricket Team Jersey",
  "cricket-uniform-kit": "Custom Cricket Team Uniform Kit",
  "baseball-jersey": "Custom Baseball Team Jersey",
  "baseball-uniform-kit": "Custom Baseball Uniform Kit",
  "basketball-mesh-jersey": "Custom Basketball Mesh Jersey",
  "basketball-uniform-kit": "Custom Basketball Uniform Kit",
  "rugby-jersey": "Custom Rugby Team Jersey",
  "rugby-uniform-kit": "Custom Rugby Team Kit",
  "athletic-onesie": "Custom Athletic Onesie",
  "compression-performance-top": "Custom Compression Sports Top",
  "gym-leggings": "Private Label Gym & Fitness Leggings",
  "gym-tank-top": "Private Label Gym Tank Top",
  "performance-gym-hoodie": "Custom Performance Gym Hoodie",
  "performance-sports-bra": "Private Label Performance Sports Bra",
  "performance-tracksuit-set": "Custom Team Tracksuit Set",
  "quarter-zip-pullover": "Custom Quarter-Zip Training Pullover",
  "running-shorts": "Custom Performance Running Shorts",
  "track-pants": "Custom Team Track Pants",
  "training-shirt": "Custom Team Training Shirt",
  "zip-up-fleece-jacket": "Custom Team Zip-Up Fleece Jacket",
  "bomber-jacket": "Private Label Streetwear Bomber Jacket",
  "long-sleeve-streetwear-tee": "Private Label Long-Sleeve Streetwear T-Shirt",
  "oversized-graphic-t-shirt": "Private Label Oversized Graphic T-Shirt",
  "oversized-streetwear-hoodie": "Private Label Oversized Streetwear Hoodie",
  "casual-sweatpants": "Private Label Streetwear Sweatpants",
  "streetwear-shorts": "Private Label Streetwear Shorts",
  "tactical-cargo-pants": "Private Label Tactical Cargo Pants",
  "casual-button-up-shirt": "Private Label Casual Button-Up Shirt",
  "essential-v-neck-t-shirt": "Private Label V-Neck T-Shirt",
  "henley-long-sleeve-shirt": "Private Label Long-Sleeve Henley Shirt",
  "pique-polo-shirt": "Private Label Pique Polo Shirt",
  "premium-basic-crewneck-tee": "Private Label Premium Crewneck T-Shirt",
  "lounge-shorts": "Private Label Cotton Lounge Shorts",
  "premium-chino-shorts": "Private Label Premium Chino Shorts",
  "cotton-nightshirt": "Private Label Cotton Nightshirt",
  "cotton-sleep-pants": "Private Label Cotton Pajama Pants",
  "sleep-shorts-set": "Private Label Sleep Shorts Set",
  "sleep-t-shirt": "Private Label Cotton Sleep T-Shirt",
  "plush-bathrobe-sleep-robe": "Private Label Plush Bathrobe",
  "silk-nightgown-slip": "Private Label Silk Nightgown Slip",
};

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function applyRule(rule: SearchNameRule | undefined, currentName: string): string {
  if (!rule) return currentName;
  const accepted = new Set([rule.name, ...rule.defaults].map(slugify));
  return accepted.has(slugify(currentName)) ? rule.name : currentName;
}

export function keywordLedTopCategoryName(slug: string, currentName: string): string {
  return applyRule(TOP_CATEGORY_SEARCH_NAMES[slug], currentName);
}

export function keywordLedSubcategoryName(
  topSlug: string,
  subSlug: string,
  currentName: string,
): string {
  return applyRule(SUBCATEGORY_SEARCH_NAMES[`${topSlug}/${subSlug}`], currentName);
}

export function keywordLedProductName(slug: string, currentName: string): string {
  const suggested = BASE_PRODUCT_SEARCH_NAMES[slug];
  if (!suggested) return currentName;

  const currentSlug = slugify(currentName);
  if (currentSlug === slug || currentSlug === slugify(suggested)) return suggested;

  // Released database records may contain owner-authored custom names. Preserve them.
  return currentName;
}
