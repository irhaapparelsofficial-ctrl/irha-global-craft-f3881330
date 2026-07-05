// Adapts DB catalog tree → the legacy in-file shape used by public pages,
// so we can switch data source with minimal UI churn.
//
// Falls back to hardcoded CATEGORIES + CATALOG ONLY when the DB fetch
// errored (never when it merely returned zero rows).

import { usePublicCatalogTree, type PublicTopCategory } from "@/hooks/usePublicCatalog";
import type { DbProduct } from "@/hooks/useCatalog";
import { CATEGORIES, type Category as LegacyCategory, type Product as LegacyProduct } from "@/lib/categories";
import { CATALOG, type CategoryGroup as LegacyGroup, type SubCategory as LegacySub } from "@/lib/catalog";

export type NormalizedProduct = LegacyProduct & {
  id?: string;
  slug: string; // real slug (DB) or slugified name (legacy)
};

export type NormalizedSub = {
  slug: string;
  name: string;
  short: string;
  products: NormalizedProduct[];
};

export type NormalizedCategory = {
  slug: string;
  name: string;
  short: string;
  description: string;
  image: string;
  details: string[];
  subs: NormalizedSub[];
  // convenience total
  productCount: number;
};

function adaptProduct(p: DbProduct): NormalizedProduct {
  const gallery = p.gallery?.length ? p.gallery : p.image_url ? [p.image_url] : [];
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    image: p.image_url ?? gallery[0] ?? "",
    gallery,
    description: p.description ?? "",
    specs: p.specs ?? [],
    details: Array.isArray(p.details) ? p.details : [],
  };
}

function adaptTop(top: PublicTopCategory): NormalizedCategory {
  const subs: NormalizedSub[] = top.subs.map((s) => ({
    slug: s.slug,
    name: s.name,
    short: s.short ?? "",
    products: s.products.map(adaptProduct),
  }));
  // If some products live directly under the top-level category
  // (no sub), expose them as an implicit "featured" sub so the UI can render.
  if (top.directProducts.length) {
    subs.unshift({
      slug: `${top.slug}-featured`,
      name: "Featured",
      short: top.short ?? "",
      products: top.directProducts.map(adaptProduct),
    });
  }
  return {
    slug: top.slug,
    name: top.name,
    short: top.short ?? "",
    description: top.description ?? "",
    image: top.image_url ?? "",
    details: Array.isArray(top.details) ? top.details : [],
    subs,
    productCount: subs.reduce((n, s) => n + s.products.length, 0),
  };
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function legacyAdaptGroup(cat: LegacyCategory, group: LegacyGroup | undefined): NormalizedCategory {
  const subs: NormalizedSub[] = (group?.subs ?? []).map((s: LegacySub) => ({
    slug: s.slug,
    name: s.name,
    short: s.short,
    products: s.products.map((p) => ({ ...p, slug: slugify(p.name) })),
  }));
  return {
    slug: cat.slug,
    name: cat.name,
    short: cat.short,
    description: cat.description,
    image: cat.image,
    details: cat.details,
    subs,
    productCount: subs.reduce((n, s) => n + s.products.length, 0),
  };
}

export function usePublicCategories() {
  const q = usePublicCatalogTree();
  // Success (even with 0 rows) → use DB.
  if (q.data) {
    return {
      isLoading: q.isLoading,
      isError: false as const,
      source: "db" as const,
      categories: q.data.map(adaptTop),
    };
  }
  if (q.isError) {
    // Emergency fallback to legacy hardcoded catalog.
    const cats = CATEGORIES.map((c) => legacyAdaptGroup(c, CATALOG.find((g) => g.slug === c.slug)));
    return { isLoading: false, isError: true as const, source: "legacy" as const, categories: cats };
  }
  return { isLoading: q.isLoading, isError: false as const, source: "db" as const, categories: [] as NormalizedCategory[] };
}

export function useNormalizedCategory(slug?: string) {
  const { categories, isLoading, source, isError } = usePublicCategories();
  const category = slug ? categories.find((c) => c.slug === slug) ?? null : null;
  return { category, isLoading, source, isError };
}
