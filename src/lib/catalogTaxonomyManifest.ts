// Irha Apparels catalog taxonomy manifest — PR #2.
//
// Deep hierarchy: Main Category → Audience Group → Product Type (Family) → Product Slot.
//
// Source of truth for:
//   - 5 owner-approved main categories (verified against public.categories).
//   - 103 product families derived by audience-splitting the owner-approved
//     collection list in src/lib/globalCategoryTaxonomy.ts. No invented
//     product types.
//   - 206 planned product slots = 2 per family (Design 01 / Design 02).
//     Every slot is a non-public planning record until owner approval.
//
// Business rules honored:
//   - No fake public content: every slot ships draft + unpublished + missing media.
//   - No incomplete product auto-publishing: `isSlotPublishable()` gates.
//   - Reference codes: IRHA-<MAIN>-<AUD>-<FAM>-<NNN> (regex enforced).
//   - Canonical URL and breadcrumbs derived from `fullSlugPath`.

export type TaxonomyMainSlug =
  | "bavarian-trachten-wear"
  | "premium-leather-apparel"
  | "sportswear"
  | "streetwear-activewear"
  | "leisure-nightwear";

export type AudienceGroupSlug =
  | "men"
  | "women"
  | "kids"
  | "unisex"
  | "team-club"
  | "family-hospitality"
  | "accessories";

export type DraftStatus = "draft" | "in_review" | "approved" | "archived";
export type PublicationStatus = "unpublished" | "published" | "redirected";
export type MediaStatus =
  | "missing"
  | "pending_generation"
  | "pending_review"
  | "approved"
  | "rejected";

const MAIN_CODES: Record<TaxonomyMainSlug, string> = {
  "bavarian-trachten-wear": "BAV",
  "premium-leather-apparel": "LEA",
  sportswear: "SPT",
  "streetwear-activewear": "STR",
  "leisure-nightwear": "LEI",
};

const AUDIENCE_CODES: Record<AudienceGroupSlug, string> = {
  men: "MEN",
  women: "WMN",
  kids: "KDS",
  unisex: "UNI",
  "team-club": "TEA",
  "family-hospitality": "FAM",
  accessories: "ACC",
};

export const MAIN_CATEGORIES: readonly {
  slug: TaxonomyMainSlug;
  name: string;
}[] = [
  { slug: "bavarian-trachten-wear", name: "Bavarian & Trachten Wear" },
  { slug: "premium-leather-apparel", name: "Premium Leather Apparel" },
  { slug: "sportswear", name: "Sportswear" },
  { slug: "streetwear-activewear", name: "Streetwear & Activewear" },
  { slug: "leisure-nightwear", name: "Leisure & Nightwear" },
] as const;

type RawFamily = {
  main: TaxonomyMainSlug;
  audience: AudienceGroupSlug;
  slug: string;
  name: string;
};

// 103 families. Names/slugs derived directly from the owner-approved
// collection list (globalCategoryTaxonomy.ts) with audience distinction.
// Order is stable — used for reference-code family index.
export const FAMILIES: readonly RawFamily[] = [
  // Bavarian & Trachten Wear (22)
  { main: "bavarian-trachten-wear", audience: "men", slug: "mens-short-lederhosen", name: "Men's Short Lederhosen" },
  { main: "bavarian-trachten-wear", audience: "men", slug: "mens-knee-length-bundhosen", name: "Men's Knee-Length Bundhosen" },
  { main: "bavarian-trachten-wear", audience: "men", slug: "mens-long-bavarian-leather-pants", name: "Men's Long Bavarian Leather Pants" },
  { main: "bavarian-trachten-wear", audience: "men", slug: "mens-trachten-shirts", name: "Men's Trachten Shirts" },
  { main: "bavarian-trachten-wear", audience: "men", slug: "mens-trachten-vests-jankers", name: "Men's Trachten Vests & Jankers" },
  { main: "bavarian-trachten-wear", audience: "men", slug: "mens-coordinated-trachten-sets", name: "Men's Coordinated Trachten Sets" },
  { main: "bavarian-trachten-wear", audience: "women", slug: "womens-traditional-dirndl-dresses", name: "Women's Traditional Dirndl Dresses" },
  { main: "bavarian-trachten-wear", audience: "women", slug: "womens-midi-mini-dirndl-dresses", name: "Women's Midi & Mini Dirndl Dresses" },
  { main: "bavarian-trachten-wear", audience: "women", slug: "dirndl-blouses", name: "Dirndl Blouses" },
  { main: "bavarian-trachten-wear", audience: "women", slug: "dirndl-aprons", name: "Dirndl Aprons" },
  { main: "bavarian-trachten-wear", audience: "women", slug: "womens-trachten-jackets-vests", name: "Women's Trachten Jackets & Vests" },
  { main: "bavarian-trachten-wear", audience: "women", slug: "womens-coordinated-trachten-sets", name: "Women's Coordinated Trachten Sets" },
  { main: "bavarian-trachten-wear", audience: "kids", slug: "boys-lederhosen", name: "Boys' Lederhosen" },
  { main: "bavarian-trachten-wear", audience: "kids", slug: "girls-dirndl-dresses", name: "Girls' Dirndl Dresses" },
  { main: "bavarian-trachten-wear", audience: "kids", slug: "kids-trachten-shirts", name: "Kids' Trachten Shirts" },
  { main: "bavarian-trachten-wear", audience: "kids", slug: "kids-coordinated-trachten-sets", name: "Kids' Coordinated Trachten Sets" },
  { main: "bavarian-trachten-wear", audience: "accessories", slug: "trachten-suspenders-belts", name: "Trachten Suspenders & Belts" },
  { main: "bavarian-trachten-wear", audience: "accessories", slug: "bavarian-hats-alpine-headwear", name: "Bavarian Hats & Alpine Headwear" },
  { main: "bavarian-trachten-wear", audience: "accessories", slug: "trachten-socks-loferl", name: "Trachten Socks & Loferl" },
  { main: "bavarian-trachten-wear", audience: "accessories", slug: "bavarian-footwear-programs", name: "Bavarian Footwear Programs" },
  { main: "bavarian-trachten-wear", audience: "accessories", slug: "scarves-trachten-accessories", name: "Scarves & Trachten Accessories" },
  { main: "bavarian-trachten-wear", audience: "accessories", slug: "charivari-traditional-ornaments", name: "Charivari & Traditional Ornaments" },

  // Premium Leather Apparel (20)
  { main: "premium-leather-apparel", audience: "men", slug: "mens-biker-leather-jackets", name: "Men's Biker Leather Jackets" },
  { main: "premium-leather-apparel", audience: "women", slug: "womens-biker-leather-jackets", name: "Women's Biker Leather Jackets" },
  { main: "premium-leather-apparel", audience: "men", slug: "mens-bomber-leather-jackets", name: "Men's Bomber Leather Jackets" },
  { main: "premium-leather-apparel", audience: "women", slug: "womens-bomber-leather-jackets", name: "Women's Bomber Leather Jackets" },
  { main: "premium-leather-apparel", audience: "men", slug: "mens-classic-leather-jackets", name: "Men's Classic Leather Jackets" },
  { main: "premium-leather-apparel", audience: "women", slug: "womens-classic-leather-jackets", name: "Women's Classic Leather Jackets" },
  { main: "premium-leather-apparel", audience: "men", slug: "mens-leather-coats-outerwear", name: "Men's Leather Coats & Outerwear" },
  { main: "premium-leather-apparel", audience: "women", slug: "womens-leather-coats-outerwear", name: "Women's Leather Coats & Outerwear" },
  { main: "premium-leather-apparel", audience: "men", slug: "mens-leather-vests-waistcoats", name: "Men's Leather Vests & Waistcoats" },
  { main: "premium-leather-apparel", audience: "women", slug: "womens-leather-vests-waistcoats", name: "Women's Leather Vests & Waistcoats" },
  { main: "premium-leather-apparel", audience: "men", slug: "mens-leather-pants-trousers", name: "Men's Leather Pants & Trousers" },
  { main: "premium-leather-apparel", audience: "women", slug: "womens-leather-pants-leggings", name: "Women's Leather Pants & Leggings" },
  { main: "premium-leather-apparel", audience: "women", slug: "womens-leather-skirts", name: "Women's Leather Skirts" },
  { main: "premium-leather-apparel", audience: "kids", slug: "kids-leather-outerwear", name: "Kids' Leather Outerwear" },
  { main: "premium-leather-apparel", audience: "kids", slug: "kids-leather-vests", name: "Kids' Leather Vests" },
  { main: "premium-leather-apparel", audience: "accessories", slug: "mens-leather-belts", name: "Men's Leather Belts" },
  { main: "premium-leather-apparel", audience: "accessories", slug: "womens-leather-belts", name: "Women's Leather Belts" },
  { main: "premium-leather-apparel", audience: "accessories", slug: "leather-gloves-programs", name: "Leather Gloves Programs" },
  { main: "premium-leather-apparel", audience: "accessories", slug: "leather-bags-pouches", name: "Leather Bags & Pouches" },
  { main: "premium-leather-apparel", audience: "accessories", slug: "leather-wallets-small-accessories", name: "Leather Wallets & Small Accessories" },

  // Sportswear (22)
  { main: "sportswear", audience: "men", slug: "mens-football-soccer-kits", name: "Men's Football & Soccer Kits" },
  { main: "sportswear", audience: "women", slug: "womens-football-soccer-kits", name: "Women's Football & Soccer Kits" },
  { main: "sportswear", audience: "kids", slug: "youth-football-soccer-kits", name: "Youth Football & Soccer Kits" },
  { main: "sportswear", audience: "team-club", slug: "adult-basketball-uniforms", name: "Adult Basketball Uniforms" },
  { main: "sportswear", audience: "kids", slug: "youth-basketball-uniforms", name: "Youth Basketball Uniforms" },
  { main: "sportswear", audience: "team-club", slug: "adult-cricket-uniforms", name: "Adult Cricket Uniforms" },
  { main: "sportswear", audience: "kids", slug: "youth-cricket-uniforms", name: "Youth Cricket Uniforms" },
  { main: "sportswear", audience: "team-club", slug: "adult-rugby-kits", name: "Adult Rugby Kits" },
  { main: "sportswear", audience: "kids", slug: "youth-rugby-kits", name: "Youth Rugby Kits" },
  { main: "sportswear", audience: "team-club", slug: "baseball-uniforms", name: "Baseball Uniforms" },
  { main: "sportswear", audience: "team-club", slug: "hockey-uniforms", name: "Hockey Uniforms" },
  { main: "sportswear", audience: "men", slug: "mens-custom-tracksuits", name: "Men's Custom Tracksuits" },
  { main: "sportswear", audience: "women", slug: "womens-custom-tracksuits", name: "Women's Custom Tracksuits" },
  { main: "sportswear", audience: "kids", slug: "youth-custom-tracksuits", name: "Youth Custom Tracksuits" },
  { main: "sportswear", audience: "team-club", slug: "team-club-training-wear", name: "Team & Club Training Wear" },
  { main: "sportswear", audience: "men", slug: "mens-gym-fitness-wear", name: "Men's Gym & Fitness Wear" },
  { main: "sportswear", audience: "women", slug: "womens-gym-fitness-wear", name: "Women's Gym & Fitness Wear" },
  { main: "sportswear", audience: "unisex", slug: "compression-performance-base-layers", name: "Compression & Performance Base Layers" },
  { main: "sportswear", audience: "unisex", slug: "wrestling-singlets", name: "Wrestling Singlets" },
  { main: "sportswear", audience: "unisex", slug: "boxing-mma-combat-wear", name: "Boxing & MMA Combat Wear" },
  { main: "sportswear", audience: "team-club", slug: "warm-up-jackets-bench-wear", name: "Warm-Up Jackets & Bench Wear" },
  { main: "sportswear", audience: "team-club", slug: "coaches-staff-uniform-programs", name: "Coaches & Staff Uniform Programs" },

  // Streetwear & Activewear (20)
  { main: "streetwear-activewear", audience: "men", slug: "mens-hoodies-sweatshirts", name: "Men's Hoodies & Sweatshirts" },
  { main: "streetwear-activewear", audience: "women", slug: "womens-hoodies-sweatshirts", name: "Women's Hoodies & Sweatshirts" },
  { main: "streetwear-activewear", audience: "kids", slug: "kids-hoodies-sweatshirts", name: "Kids' Hoodies & Sweatshirts" },
  { main: "streetwear-activewear", audience: "unisex", slug: "unisex-oversized-hoodies", name: "Unisex Oversized Hoodies" },
  { main: "streetwear-activewear", audience: "men", slug: "mens-t-shirts-tops", name: "Men's T-Shirts & Tops" },
  { main: "streetwear-activewear", audience: "women", slug: "womens-t-shirts-crop-tops", name: "Women's T-Shirts & Crop Tops" },
  { main: "streetwear-activewear", audience: "kids", slug: "kids-t-shirts-tops", name: "Kids' T-Shirts & Tops" },
  { main: "streetwear-activewear", audience: "men", slug: "mens-joggers-sweatpants", name: "Men's Joggers & Sweatpants" },
  { main: "streetwear-activewear", audience: "women", slug: "womens-joggers-sweatpants", name: "Women's Joggers & Sweatpants" },
  { main: "streetwear-activewear", audience: "men", slug: "mens-streetwear-tracksuits", name: "Men's Streetwear Tracksuits" },
  { main: "streetwear-activewear", audience: "women", slug: "womens-streetwear-tracksuits", name: "Women's Streetwear Tracksuits" },
  { main: "streetwear-activewear", audience: "unisex", slug: "cargo-pants-utility-bottoms", name: "Cargo Pants & Utility Bottoms" },
  { main: "streetwear-activewear", audience: "unisex", slug: "streetwear-jackets-bombers", name: "Streetwear Jackets & Bombers" },
  { main: "streetwear-activewear", audience: "unisex", slug: "varsity-letterman-jackets", name: "Varsity & Letterman Jackets" },
  { main: "streetwear-activewear", audience: "unisex", slug: "windbreakers-lightweight-shells", name: "Windbreakers & Lightweight Shells" },
  { main: "streetwear-activewear", audience: "women", slug: "womens-activewear-sets", name: "Women's Activewear Sets" },
  { main: "streetwear-activewear", audience: "unisex", slug: "unisex-activewear-sets", name: "Unisex Activewear Sets" },
  { main: "streetwear-activewear", audience: "women", slug: "womens-leggings-performance-bottoms", name: "Women's Leggings & Performance Bottoms" },
  { main: "streetwear-activewear", audience: "women", slug: "womens-sports-bras", name: "Women's Sports Bras" },
  { main: "streetwear-activewear", audience: "unisex", slug: "yoga-studio-apparel", name: "Yoga & Studio Apparel" },

  // Leisure & Nightwear (19)
  { main: "leisure-nightwear", audience: "men", slug: "mens-t-shirts-polos", name: "Men's T-Shirts & Polos" },
  { main: "leisure-nightwear", audience: "women", slug: "womens-t-shirts-polos", name: "Women's T-Shirts & Polos" },
  { main: "leisure-nightwear", audience: "men", slug: "mens-casual-shirts-henleys", name: "Men's Casual Shirts & Henleys" },
  { main: "leisure-nightwear", audience: "women", slug: "womens-casual-shirts-blouses", name: "Women's Casual Shirts & Blouses" },
  { main: "leisure-nightwear", audience: "men", slug: "mens-shorts-casual-bottoms", name: "Men's Shorts & Casual Bottoms" },
  { main: "leisure-nightwear", audience: "women", slug: "womens-shorts-casual-bottoms", name: "Women's Shorts & Casual Bottoms" },
  { main: "leisure-nightwear", audience: "men", slug: "mens-pajama-sets", name: "Men's Pajama Sets" },
  { main: "leisure-nightwear", audience: "women", slug: "womens-pajama-sets", name: "Women's Pajama Sets" },
  { main: "leisure-nightwear", audience: "kids", slug: "kids-pajama-sets", name: "Kids' Pajama Sets" },
  { main: "leisure-nightwear", audience: "women", slug: "womens-nightshirts-nightdresses", name: "Women's Nightshirts & Nightdresses" },
  { main: "leisure-nightwear", audience: "women", slug: "sleep-slips-chemises", name: "Sleep Slips & Chemises" },
  { main: "leisure-nightwear", audience: "men", slug: "mens-robes-bathrobes", name: "Men's Robes & Bathrobes" },
  { main: "leisure-nightwear", audience: "women", slug: "womens-robes-bathrobes", name: "Women's Robes & Bathrobes" },
  { main: "leisure-nightwear", audience: "kids", slug: "kids-robes-bathrobes", name: "Kids' Robes & Bathrobes" },
  { main: "leisure-nightwear", audience: "men", slug: "mens-lounge-sets", name: "Men's Lounge Sets" },
  { main: "leisure-nightwear", audience: "women", slug: "womens-lounge-sets", name: "Women's Lounge Sets" },
  { main: "leisure-nightwear", audience: "unisex", slug: "sleep-pants-shorts", name: "Sleep Pants & Shorts" },
  { main: "leisure-nightwear", audience: "family-hospitality", slug: "matching-family-pajama-sets", name: "Matching Family Pajama Sets" },
  { main: "leisure-nightwear", audience: "family-hospitality", slug: "hotel-hospitality-robe-programs", name: "Hotel & Hospitality Robe Programs" },
];

export const TAXONOMY_TARGETS = {
  mainCategoryCount: 5,
  productFamilyCount: 103,
  productSlotCount: 206,
} as const;

export type ProductSlot = {
  referenceCode: string;
  workingTitle: string;
  slug: string;
  fullSlugPath: string;
  canonicalUrl: string;
  breadcrumbs: Array<{ slug: string; path: string }>;
  main: TaxonomyMainSlug;
  audience: AudienceGroupSlug;
  familySlug: string;
  familyName: string;
  designIndex: number;
  draftStatus: DraftStatus;
  publicationStatus: PublicationStatus;
  mediaStatus: MediaStatus;
};

export type FamilyNode = {
  main: TaxonomyMainSlug;
  audience: AudienceGroupSlug;
  slug: string;
  name: string;
  fullSlugPath: string;
  canonicalUrl: string;
  breadcrumbs: Array<{ slug: string; path: string }>;
  familyIndex: number; // 1-based position within its main
  slots: ProductSlot[];
};

const APEX_ORIGIN = "https://irhaapparels.com";

export function buildCanonicalUrl(fullSlugPath: string): string {
  const clean = fullSlugPath.replace(/^\/+|\/+$/g, "");
  return `${APEX_ORIGIN}/${clean}`;
}

export function buildBreadcrumbs(
  fullSlugPath: string,
): Array<{ slug: string; path: string }> {
  const parts = fullSlugPath.split("/").filter(Boolean);
  return parts.map((slug, i) => ({
    slug,
    path: "/" + parts.slice(0, i + 1).join("/"),
  }));
}

export const REFERENCE_CODE_PATTERN =
  /^IRHA-[A-Z]{2,4}-[A-Z]{2,3}-[A-Z0-9]{2,4}-\d{3}$/;

export function isValidReferenceCode(code: string): boolean {
  return REFERENCE_CODE_PATTERN.test(code);
}

export function isSlotPublishable(slot: ProductSlot): boolean {
  return (
    slot.draftStatus === "approved" &&
    slot.publicationStatus === "published" &&
    slot.mediaStatus === "approved" &&
    isValidReferenceCode(slot.referenceCode)
  );
}

function familyIndexByMain(): Map<string, number[]> {
  const m = new Map<TaxonomyMainSlug, number>();
  const out = new Map<string, number[]>();
  FAMILIES.forEach((f, i) => {
    const next = (m.get(f.main) ?? 0) + 1;
    m.set(f.main, next);
    out.set(f.slug, [next, i]);
  });
  return out;
}

const FAMILY_INDEX = familyIndexByMain();

export function buildFamilyNodes(): FamilyNode[] {
  return FAMILIES.map((raw) => {
    const [familyIndex] = FAMILY_INDEX.get(raw.slug)!;
    const fullSlugPath = `${raw.main}/${raw.audience}/${raw.slug}`;
    const mainCode = MAIN_CODES[raw.main];
    const audCode = AUDIENCE_CODES[raw.audience];
    const famCode = `F${String(familyIndex).padStart(2, "0")}`;
    const slots: ProductSlot[] = [1, 2].map((designIndex) => {
      const slotSlug = `${raw.slug}-design-${String(designIndex).padStart(2, "0")}`;
      const slotPath = `${fullSlugPath}/${slotSlug}`;
      return {
        referenceCode: `IRHA-${mainCode}-${audCode}-${famCode}-${String(designIndex).padStart(3, "0")}`,
        workingTitle: `${raw.name} — Design ${String(designIndex).padStart(2, "0")} (Planned)`,
        slug: slotSlug,
        fullSlugPath: slotPath,
        canonicalUrl: buildCanonicalUrl(slotPath),
        breadcrumbs: buildBreadcrumbs(slotPath),
        main: raw.main,
        audience: raw.audience,
        familySlug: raw.slug,
        familyName: raw.name,
        designIndex,
        draftStatus: "draft",
        publicationStatus: "unpublished",
        mediaStatus: "missing",
      };
    });
    return {
      main: raw.main,
      audience: raw.audience,
      slug: raw.slug,
      name: raw.name,
      fullSlugPath,
      canonicalUrl: buildCanonicalUrl(fullSlugPath),
      breadcrumbs: buildBreadcrumbs(fullSlugPath),
      familyIndex,
      slots,
    };
  });
}

export const FAMILY_NODES: readonly FamilyNode[] = buildFamilyNodes();
export const ALL_SLOTS: readonly ProductSlot[] = FAMILY_NODES.flatMap(
  (f) => f.slots,
);

export function familyCountByMain(): Record<TaxonomyMainSlug, number> {
  const out = {
    "bavarian-trachten-wear": 0,
    "premium-leather-apparel": 0,
    sportswear: 0,
    "streetwear-activewear": 0,
    "leisure-nightwear": 0,
  } as Record<TaxonomyMainSlug, number>;
  for (const f of FAMILIES) out[f.main] += 1;
  return out;
}

export function slotCountByMain(): Record<TaxonomyMainSlug, number> {
  const c = familyCountByMain();
  return Object.fromEntries(
    Object.entries(c).map(([k, v]) => [k, v * 2]),
  ) as Record<TaxonomyMainSlug, number>;
}
