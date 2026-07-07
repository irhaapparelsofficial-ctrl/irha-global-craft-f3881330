// Adapts DB catalog tree → the legacy in-file shape used by public pages.
// After the Phase 3 canonical migration, no product lives directly under a
// top-level category, so the "implicit Featured sub" hack has been removed.
//
// Falls back to hardcoded CATEGORIES + CATALOG ONLY when the DB fetch
// errored (never when it merely returned zero rows).

import { usePublicCatalogTree, type PublicTopCategory } from "@/hooks/usePublicCatalog";
import type { DbProduct } from "@/hooks/useCatalog";
import { CATEGORIES, type Category as LegacyCategory, type Product as LegacyProduct } from "@/lib/categories";
import { CATALOG, type CategoryGroup as LegacyGroup, type SubCategory as LegacySub } from "@/lib/catalog";
import { PRODUCT_REAL_MEDIA } from "@/lib/productRealMedia";

export type NormalizedProduct = LegacyProduct & {
  id?: string;
  slug: string;
  sku?: string | null;
  created_at?: string;
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
  productCount: number;
  seoTitle?: string;
  seoDescription?: string;
};

function adaptProduct(p: DbProduct): NormalizedProduct {
  const baseGallery = p.gallery?.length ? p.gallery : p.image_url ? [p.image_url] : [];
  const realMedia = PRODUCT_REAL_MEDIA[p.slug];
  const gallery = realMedia
    ? [...realMedia.gallery, ...baseGallery].filter(
        (image, index, images) => Boolean(image) && images.indexOf(image) === index,
      )
    : baseGallery;
  const heroImage = realMedia?.gallery[0] ?? p.image_url ?? gallery[0] ?? "";

  return {
    id: p.id,
    slug: p.slug,
    sku: p.sku ?? null,
    name: p.name,
    image: heroImage,
    gallery,
    description: p.description ?? "",
    specs: p.specs ?? [],
    details: Array.isArray(p.details) ? p.details : [],
    created_at: p.created_at,
  };
}

function adaptTop(top: PublicTopCategory): NormalizedCategory {
  const subs: NormalizedSub[] = top.subs.map((s) => ({
    slug: s.slug,
    name: s.name,
    short: s.short ?? "",
    products: s.products.map(adaptProduct),
  }));
  return {
    slug: top.slug,
    name: top.name,
    short: top.short ?? "",
    description: top.description ?? "",
    image: top.image_url ?? "",
    details: Array.isArray(top.details) ? top.details : [],
    subs,
    productCount: subs.reduce((n, s) => n + s.products.length, 0),
    seoTitle: top.seo_title ?? undefined,
    seoDescription: top.seo_description ?? undefined,
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
  if (q.data) {
    return {
      isLoading: q.isLoading,
      isError: false as const,
      source: "db" as const,
      // Only expose published top-level rows to the public UI
      categories: q.data.filter((t) => t.is_published).map(adaptTop),
    };
  }
  if (q.isError) {
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
