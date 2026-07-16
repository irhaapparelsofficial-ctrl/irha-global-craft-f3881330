import type { NormalizedCategory } from "@/hooks/usePublicCategoryData";
import type { PublicTaxonomyCategoryRelease } from "@/hooks/usePublicTaxonomy";
import type {
  CategoryTaxonomy,
  TaxonomyAudience,
  TaxonomyCollection,
  TaxonomyProduct,
} from "@/lib/globalCategoryTaxonomy";

function flattenProducts(category: NormalizedCategory): TaxonomyProduct[] {
  return category.subs.flatMap((sub) =>
    sub.products.map((product) => ({
      ...product,
      sourceSubSlug: sub.slug,
      sourceSubName: sub.name,
    })),
  );
}

export function buildDatabaseCategoryTaxonomy(
  category: NormalizedCategory,
  release?: PublicTaxonomyCategoryRelease | null,
): CategoryTaxonomy | null {
  if (!release || release.categorySlug !== category.slug || release.audiences.length === 0) return null;

  const products = flattenProducts(category);
  const bySlug = new Map(products.map((product) => [product.slug, product]));
  const assigned = new Set<string>();

  const audiences: TaxonomyAudience[] = release.audiences
    .map((audience): TaxonomyAudience => {
      const collections: TaxonomyCollection[] = audience.collections
        .map((collection): TaxonomyCollection => {
          const collectionProducts = collection.productSlugs
            .map((slug) => bySlug.get(slug))
            .filter((product): product is TaxonomyProduct => Boolean(product));
          collectionProducts.forEach((product) => assigned.add(product.slug));
          return {
            slug: collection.slug,
            name: collection.name,
            keyword: collection.keyword,
            description: collection.description,
            products: collectionProducts,
          };
        })
        .filter((collection) => collection.products.length > 0);

      return {
        slug: audience.slug,
        name: audience.name,
        keyword: audience.keyword,
        description: audience.description,
        collections,
        productCount: collections.reduce((total, collection) => total + collection.products.length, 0),
      };
    })
    .filter((audience) => audience.productCount > 0 && audience.collections.length > 0);

  if (audiences.length === 0) return null;

  return {
    categorySlug: category.slug,
    audiences,
    unassignedCount: products.filter((product) => !assigned.has(product.slug)).length,
  };
}
