import type { DbCategory, DbProduct } from "@/hooks/useCatalog";
import { createSupplementalBatch11ProductsForSubcategory } from "@/lib/supplementalCatalogBatch11";
import { createSupplementalBatch12ProductsForSubcategory } from "@/lib/supplementalCatalogBatch12";
import { createSupplementalBatch13ProductsForSubcategory } from "@/lib/supplementalCatalogBatch13";
import { createSupplementalBatch14ProductsForSubcategory } from "@/lib/supplementalCatalogBatch14";
import { createSupplementalBatch16ProductsForSubcategory } from "@/lib/supplementalCatalogBatch16";
import { createSupplementalBatch17ProductsForSubcategory } from "@/lib/supplementalCatalogBatch17";
import { createSupplementalAccessories20260713ProductsForSubcategory } from "@/lib/supplementalCatalogAccessories20260713";
import { createSupplementalFinalCompletion20260714ProductsForSubcategory } from "@/lib/supplementalCatalogFinalCompletion20260714";

/**
 * Visually verified, first-party product expansion that was committed after the
 * original batch-10 public catalog integration. Each source owns exact product
 * names and exact media paths; this aggregator must never merge galleries
 * between different product slugs.
 */
export function createVerifiedCatalogExpansionProducts(
  top: Pick<DbCategory, "slug">,
  sub: Pick<DbCategory, "id" | "slug" | "name">,
): DbProduct[] {
  return [
    ...createSupplementalBatch11ProductsForSubcategory(top.slug, sub.slug, sub.name, sub.id),
    ...createSupplementalBatch12ProductsForSubcategory(top.slug, sub.slug, sub.name, sub.id),
    ...createSupplementalBatch13ProductsForSubcategory(top.slug, sub.slug, sub.name, sub.id),
    ...createSupplementalBatch14ProductsForSubcategory(top.slug, sub.slug, sub.name, sub.id),
    ...createSupplementalBatch16ProductsForSubcategory(top.slug, sub.slug, sub.name, sub.id),
    ...createSupplementalBatch17ProductsForSubcategory(top.slug, sub.slug, sub.name, sub.id),
    ...createSupplementalAccessories20260713ProductsForSubcategory(top.slug, sub.slug, sub.name, sub.id),
    ...createSupplementalFinalCompletion20260714ProductsForSubcategory(top.slug, sub.slug, sub.name, sub.id),
  ];
}
