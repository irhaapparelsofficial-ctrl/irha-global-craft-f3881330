import type { NormalizedCategory } from "@/hooks/usePublicCategoryData";
import { buildCategoryTaxonomy } from "@/lib/globalCategoryTaxonomy";

export type ParsedTaxonomyPath = {
  categorySlug: string;
  audienceSlug: string;
  collectionSlug?: string;
};

export function parseTaxonomyPath(pathname: string): ParsedTaxonomyPath | null {
  const segments = pathname.split("/").filter(Boolean);

  if (segments[0] === "products" && (segments.length === 3 || segments.length === 4)) {
    return {
      categorySlug: segments[1],
      audienceSlug: segments[2],
      collectionSlug: segments[3],
    };
  }

  if (
    segments[0] === "intl"
    && segments[2] === "products"
    && (segments.length === 5 || segments.length === 6)
  ) {
    return {
      categorySlug: segments[3],
      audienceSlug: segments[4],
      collectionSlug: segments[5],
    };
  }

  return null;
}

export function shouldNoIndexTaxonomyPath(
  pathname: string,
  categories: NormalizedCategory[],
): boolean {
  const parsed = parseTaxonomyPath(pathname);
  if (!parsed) return false;

  const category = categories.find((candidate) => candidate.slug === parsed.categorySlug);
  if (!category) return false;

  const taxonomy = buildCategoryTaxonomy(category);
  const audience = taxonomy.audiences.find((candidate) => candidate.slug === parsed.audienceSlug);

  // A two-segment product-detail route can resemble an audience route. Only
  // apply taxonomy indexing rules when the second slug is a defined audience.
  if (!audience) return false;

  if (!parsed.collectionSlug) return audience.productCount === 0;

  const collection = audience.collections.find(
    (candidate) => candidate.slug === parsed.collectionSlug,
  );
  return Boolean(collection && collection.products.length === 0);
}
