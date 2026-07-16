import type { PublicTaxonomyCategoryRelease } from "@/hooks/usePublicTaxonomy";

let releases = new Map<string, PublicTaxonomyCategoryRelease>();

export function setDatabaseTaxonomyReleases(next: PublicTaxonomyCategoryRelease[]) {
  releases = new Map(next.map((release) => [release.categorySlug, release]));
}

export function getDatabaseTaxonomyRelease(categorySlug: string) {
  return releases.get(categorySlug) ?? null;
}
