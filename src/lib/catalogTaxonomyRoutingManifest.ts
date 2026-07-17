import {
  MAIN_CATEGORIES,
  isSlotPublishable,
  type AudienceGroupSlug,
  type DraftStatus,
  type ProductSlot,
  type TaxonomyMainSlug,
} from "./catalogTaxonomyManifest";

export { MAIN_CATEGORIES, isSlotPublishable };
export type { ProductSlot };

export type ProductTypeNode = {
  slug: string;
  name: string;
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
  audienceGroups: AudienceGroupNode[];
};

/**
 * Public routing starts with the five owner-approved main categories only.
 * Audience, family and slot nodes remain absent until a reviewed publication
 * batch explicitly adds them. This preserves the no-fake-content contract.
 */
export const CATALOG_TAXONOMY_MANIFEST: MainCategoryNode[] = MAIN_CATEGORIES.map(
  ({ slug, name }) => ({
    slug,
    name,
    fullSlugPath: slug,
    draftStatus: "approved",
    audienceGroups: [],
  }),
);
