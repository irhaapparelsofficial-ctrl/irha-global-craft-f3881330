import type { DbProduct } from "@/hooks/useCatalog";
import { createSupplementalBatch10LegacyProductsForSubcategory } from "@/lib/supplementalCatalogBatch10Legacy";
import { createSupplementalBatch11ProductsForSubcategory } from "@/lib/supplementalCatalogBatch11";

export function createSupplementalBatch10ProductsForSubcategory(
  topCategorySlug: string,
  subSlug: string,
  subName: string,
  categoryId: string,
): DbProduct[] {
  return [
    ...createSupplementalBatch10LegacyProductsForSubcategory(topCategorySlug, subSlug, subName, categoryId),
    ...createSupplementalBatch11ProductsForSubcategory(topCategorySlug, subSlug, subName, categoryId),
  ];
}
