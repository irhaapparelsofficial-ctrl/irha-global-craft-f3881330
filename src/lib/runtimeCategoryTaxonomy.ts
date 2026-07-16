export * from "./globalCategoryTaxonomy";

import type { NormalizedCategory } from "@/hooks/usePublicCategoryData";
import { buildDatabaseCategoryTaxonomy } from "./databaseCategoryTaxonomy";
import { getDatabaseTaxonomyRelease } from "./databaseTaxonomyRegistry";
import {
  buildCategoryTaxonomy as buildRuleCategoryTaxonomy,
  taxonomyAudiencePath,
  taxonomyCollectionPath,
} from "./globalCategoryTaxonomy";

export function buildCategoryTaxonomy(category: NormalizedCategory) {
  const database = buildDatabaseCategoryTaxonomy(category, getDatabaseTaxonomyRelease(category.slug));
  return database ?? buildRuleCategoryTaxonomy(category);
}

export function getTaxonomyAudience(category: NormalizedCategory, audienceSlug?: string) {
  if (!audienceSlug) return null;
  return buildCategoryTaxonomy(category).audiences.find((audience) => audience.slug === audienceSlug) ?? null;
}

export function getTaxonomyCollection(category: NormalizedCategory, audienceSlug?: string, collectionSlug?: string) {
  if (!audienceSlug || !collectionSlug) return null;
  const audience = getTaxonomyAudience(category, audienceSlug);
  return audience?.collections.find((collection) => collection.slug === collectionSlug) ?? null;
}

export { taxonomyAudiencePath, taxonomyCollectionPath };
