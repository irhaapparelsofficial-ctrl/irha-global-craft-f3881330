import type { DbProduct } from "@/hooks/useCatalog";
import { registerLeisureNightwearSeoOverrides } from "@/lib/leisureNightwearSeoOverrides";
import { createSupplementalBatch10LegacyProductsForSubcategory } from "@/lib/supplementalCatalogBatch10Legacy";
import { createSupplementalBatch11ProductsForSubcategory } from "@/lib/supplementalCatalogBatch11";
import { createSupplementalBatch12ProductsForSubcategory } from "@/lib/supplementalCatalogBatch12";
import { createSupplementalBatch13ProductsForSubcategory } from "@/lib/supplementalCatalogBatch13";
import { createSupplementalBatch14ProductsForSubcategory } from "@/lib/supplementalCatalogBatch14";
import { createSupplementalAccessories20260713ProductsForSubcategory } from "@/lib/supplementalCatalogAccessories20260713";
import { createSupplementalBatch16ProductsForSubcategory } from "@/lib/supplementalCatalogBatch16";
import { createSupplementalBatch17ProductsForSubcategory } from "@/lib/supplementalCatalogBatch17";
import { createSupplementalFinalCompletion20260714ProductsForSubcategory } from "@/lib/supplementalCatalogFinalCompletion20260714";

registerLeisureNightwearSeoOverrides();

export function createSupplementalBatch10ProductsForSubcategory(
  topCategorySlug: string,
  subSlug: string,
  subName: string,
  categoryId: string,
): DbProduct[] {
  return [
    ...createSupplementalBatch10LegacyProductsForSubcategory(topCategorySlug, subSlug, subName, categoryId),
    ...createSupplementalBatch11ProductsForSubcategory(topCategorySlug, subSlug, subName, categoryId),
    ...createSupplementalBatch12ProductsForSubcategory(topCategorySlug, subSlug, subName, categoryId),
    ...createSupplementalBatch13ProductsForSubcategory(topCategorySlug, subSlug, subName, categoryId),
    ...createSupplementalBatch14ProductsForSubcategory(topCategorySlug, subSlug, subName, categoryId),
    ...createSupplementalAccessories20260713ProductsForSubcategory(topCategorySlug, subSlug, subName, categoryId),
    ...createSupplementalBatch16ProductsForSubcategory(topCategorySlug, subSlug, subName, categoryId),
    ...createSupplementalBatch17ProductsForSubcategory(topCategorySlug, subSlug, subName, categoryId),
    ...createSupplementalFinalCompletion20260714ProductsForSubcategory(topCategorySlug, subSlug, subName, categoryId),
  ];
}
