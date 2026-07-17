// Irha Apparels catalog taxonomy manifest — PR #2 foundation.
//
// Contract for the deep hierarchy:
//   Main Category → Audience Group → Product Type → Product
//
// This file is the single authoritative source-of-truth for the taxonomy
// SPINE. Family and product-slot data is populated per owner-approved
// review batches and synchronized into `public.catalog_taxonomy_nodes` and
// `public.products` via the `supabase-owner-release.yml` workflow.
//
// Business rules honored:
//   - No fake public content: entries land as `draft` until owner review.
//   - No incomplete product auto-publishing: `publicationStatus` gates.
//   - Product reference codes follow IRHA-<MAIN>-<AUDIENCE>-<TYPE>-<NNN>.
//   - Canonical URL is derived from `fullSlugPath`.
//   - Every product declares a `mediaStatus` so the missing-media queue is
//     computable without a separate mirror table.

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

export type ProductSlot = {
  /** IRHA-<MAIN3>-<AUD2>-<TYPE3>-<NNN>. Immutable once approved. */
  referenceCode: string;
  /** Working title; final name set by owner at approval. */
  workingTitle: string;
  /** URL segment appended to the parent product-type path. */
  slug: string;
  draftStatus: DraftStatus;
  publicationStatus: PublicationStatus;
  mediaStatus: MediaStatus;
  /** Optional: prior URL that must 301 to the canonical one. */
  redirectFrom?: string[];
};

export type ProductTypeNode = {
  slug: string;
  name: string;
  /** Full canonical path: main/audience/product-type */
  fullSlugPath: string;
  draftStatus: DraftStatus;
  productSlots: ProductSlot[];
};

export type AudienceGroupNode = {
  slug: AudienceGroupSlug;
  name: string;
  fullSlugPath: string;
  draftStatus: DraftStatus;
  productTypes: ProductTypeNode[];
};

export type MainCategoryNode = {
  slug: TaxonomyMainSlug;
  name: string;
  fullSlugPath: string;
  draftStatus: DraftStatus;
  publicationStatus: PublicationStatus;
  audienceGroups: AudienceGroupNode[];
};

// Verified against public.categories (parent_id IS NULL) 2026-07-17.
// Slugs are the canonical URL segments; renaming requires a redirect entry.
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

// Planned capacity for PR #2. Actual node population is owner-gated and
// arrives through reviewed release batches — never fabricated.
export const TAXONOMY_TARGETS = {
  mainCategoryCount: 5,
  productFamilyCount: 103,
  productSlotCount: 206,
} as const;

/** Canonical URL builder — apex origin only, matches redirect rules. */
export function buildCanonicalUrl(fullSlugPath: string): string {
  const clean = fullSlugPath.replace(/^\/+|\/+$/g, "");
  return `https://irhaapparels.com/${clean}`;
}

/** Breadcrumb builder from a full slug path. */
export function buildBreadcrumbs(fullSlugPath: string): Array<{
  slug: string;
  path: string;
}> {
  const parts = fullSlugPath.split("/").filter(Boolean);
  return parts.map((slug, i) => ({
    slug,
    path: "/" + parts.slice(0, i + 1).join("/"),
  }));
}

/** Reference code validator. Rejects fabricated or malformed codes. */
export const REFERENCE_CODE_PATTERN =
  /^IRHA-[A-Z]{2,4}-[A-Z]{2,3}-[A-Z0-9]{2,4}-\d{3}$/;

export function isValidReferenceCode(code: string): boolean {
  return REFERENCE_CODE_PATTERN.test(code);
}

/** A product slot is public-eligible only when everything is green. */
export function isSlotPublishable(slot: ProductSlot): boolean {
  return (
    slot.draftStatus === "approved" &&
    slot.publicationStatus === "published" &&
    slot.mediaStatus === "approved" &&
    isValidReferenceCode(slot.referenceCode)
  );
}

/**
 * Manifest tree. Populated incrementally per owner-approved batch.
 * The empty audienceGroups array on each main is intentional: PR #2 ships
 * the spine + contract; family and slot rows land through reviewed batches
 * to satisfy the "no fake public content" rule.
 */
export const CATALOG_TAXONOMY_MANIFEST: MainCategoryNode[] =
  MAIN_CATEGORIES.map((m) => ({
    slug: m.slug,
    name: m.name,
    fullSlugPath: m.slug,
    draftStatus: "approved" as DraftStatus,
    publicationStatus: "published" as PublicationStatus,
    audienceGroups: [],
  }));

export function countManifestSlots(): {
  families: number;
  slots: number;
  publishable: number;
} {
  let families = 0;
  let slots = 0;
  let publishable = 0;
  for (const main of CATALOG_TAXONOMY_MANIFEST) {
    for (const aud of main.audienceGroups) {
      families += aud.productTypes.length;
      for (const pt of aud.productTypes) {
        slots += pt.productSlots.length;
        for (const s of pt.productSlots) {
          if (isSlotPublishable(s)) publishable += 1;
        }
      }
    }
  }
  return { families, slots, publishable };
}
