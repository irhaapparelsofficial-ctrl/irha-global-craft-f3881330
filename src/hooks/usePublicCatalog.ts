// Public catalog data layer for the live buyer-facing website.
// Verified committed media/catalog data remains a resilient fallback, while the
// audited database release overlays owner-approved edits, new records and
// unpublish controls from Admin.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DbCategory, DbProduct, ProductDetailSpec } from "./useCatalog";
import { CATEGORIES, type Product as LegacyProduct } from "@/lib/categories";
import { CATALOG, type CategoryGroup, type SubCategory } from "@/lib/catalog";
import { CATEGORY_SEO } from "@/lib/categorySeo";
import { PRODUCT_SEO_OVERRIDES } from "@/lib/productSeoOverrides";
import { createSupplementalProductsForSubcategory } from "@/lib/supplementalCatalog";
import { createSupplementalBatch02ProductsForSubcategory } from "@/lib/supplementalCatalogBatch02";
import { createSupplementalBatch03ProductsForSubcategory } from "@/lib/supplementalCatalogBatch03";
import { createSupplementalBatch04ProductsForSubcategory } from "@/lib/supplementalCatalogBatch04";
import { createSupplementalBatch05ProductsForSubcategory } from "@/lib/supplementalCatalogBatch05";
import { createSupplementalBatch06ProductsForSubcategory } from "@/lib/supplementalCatalogBatch06";
import { createSupplementalBatch07ProductsForSubcategory } from "@/lib/supplementalCatalogBatch07";
import { createSupplementalBatch08ProductsForSubcategory } from "@/lib/supplementalCatalogBatch08";
import { createSupplementalBatch09ProductsForSubcategory } from "@/lib/supplementalCatalogBatch09";
import { createSupplementalBatch10ProductsForSubcategory } from "@/lib/supplementalCatalogBatch10";

export type PublicSubCategory = DbCategory & { products: DbProduct[] };
export type PublicTopCategory = DbCategory & {
  subs: PublicSubCategory[];
  directProducts: DbProduct[];
};

type ReleaseCategory = DbCategory & {
  parent_slug?: string | null;
  updated_at?: string;
};

type ReleaseProduct = DbProduct & {
  category_slug: string;
  parent_slug?: string | null;
  updated_at?: string;
};

type HiddenProduct = {
  category_slug: string;
  parent_slug?: string | null;
  product_slug: string;
};

type CatalogRelease = {
  categories: ReleaseCategory[];
  products: ReleaseProduct[];
  hiddenCategorySlugs: string[];
  hiddenProducts: HiddenProduct[];
  releasedAt: string | null;
};

const K = {
  tree: ["public-catalog", "release-tree-v1"] as const,
  product: (category: string, product: string) => ["public-catalog", "release-product-v1", category, product] as const,
};

const BLOCKED_PUBLIC_TERMS = [
  "moq",
  "lead time",
  "production timeline",
  "sample timeline",
  "shipping time",
  "delivery time",
  "oeko",
  "bsci",
  "sedex",
  "iso 9001",
  "gots",
  "wrap",
  "reach",
  "ddp",
  "fob",
  "weekly shipment",
  "container load",
];

function hasBlockedPublicTerm(value: string): boolean {
  const lower = value.toLowerCase();
  return BLOCKED_PUBLIC_TERMS.some((term) => lower.includes(term));
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function uniqueStrings(values: string[]): string[] {
  return values.filter((value, index) => Boolean(value) && values.indexOf(value) === index);
}

function sanitizePublicProduct(product: DbProduct): DbProduct {
  const details = (Array.isArray(product.details) ? product.details : []).filter(
    (detail) => !hasBlockedPublicTerm(`${detail.label} ${detail.value}`),
  );
  const specs = (Array.isArray(product.specs) ? product.specs : []).filter(
    (spec) => !hasBlockedPublicTerm(spec),
  );
  const gallery = uniqueStrings((Array.isArray(product.gallery) ? product.gallery : []).filter(Boolean));
  return {
    ...product,
    image_url: product.image_url ?? gallery[0] ?? null,
    gallery,
    details,
    specs,
    moq_display: null,
    moq_min: null,
    production_timeline: null,
    sample_timeline: null,
  };
}

function legacyProductToDb(product: LegacyProduct, categoryId: string, sortOrder: number): DbProduct {
  const productSlug = slugify(product.name);
  const gallery = uniqueStrings([product.image, ...(product.gallery ?? [])].filter(Boolean));
  const override = PRODUCT_SEO_OVERRIDES[productSlug];

  return sanitizePublicProduct({
    id: `local-product-${categoryId}-${productSlug}`,
    category_id: categoryId,
    slug: productSlug,
    name: override?.name ?? product.name,
    description: override?.description ?? product.description ?? null,
    image_url: gallery[0] ?? null,
    gallery,
    specs: override?.specs ?? product.specs ?? [],
    details: override ? [] : Array.isArray(product.details) ? product.details : [],
    material_specifications: null,
    seo_title: override?.seoTitle ?? `${product.name} Manufacturer | Irha Apparels`,
    seo_description:
      override?.seoDescription ??
      `${product.name} for wholesale, OEM and private-label buyer programs from Irha Apparels, an experienced B2B garment manufacturer in Sialkot, Pakistan.`,
    sort_order: sortOrder,
    is_published: true,
    sku: null,
    is_featured: false,
    short_description: override?.shortDescription ?? product.description ?? null,
    moq_display: null,
    moq_min: null,
    sample_available: null,
    sample_timeline: null,
    production_timeline: null,
    country_of_origin: null,
    primary_material: null,
    fabric_composition: null,
    gsm: null,
    available_sizes: [],
    size_notes: null,
    available_colors: [],
    custom_colors: null,
    customization: {},
    packaging_standard: null,
    packaging_custom: null,
    related_product_ids: [],
  });
}

function supplementalProducts(top: DbCategory, sub: DbCategory): DbProduct[] {
  return [
    ...createSupplementalProductsForSubcategory(top.slug, sub.slug, sub.name, sub.id),
    ...createSupplementalBatch02ProductsForSubcategory(top.slug, sub.slug, sub.name, sub.id),
    ...createSupplementalBatch03ProductsForSubcategory(top.slug, sub.slug, sub.name, sub.id),
    ...createSupplementalBatch04ProductsForSubcategory(top.slug, sub.slug, sub.name, sub.id),
    ...createSupplementalBatch05ProductsForSubcategory(top.slug, sub.slug, sub.name, sub.id),
    ...createSupplementalBatch06ProductsForSubcategory(top.slug, sub.slug, sub.name, sub.id),
    ...createSupplementalBatch07ProductsForSubcategory(top.slug, sub.slug, sub.name, sub.id),
    ...createSupplementalBatch08ProductsForSubcategory(top.slug, sub.slug, sub.name, sub.id),
    ...createSupplementalBatch09ProductsForSubcategory(top.slug, sub.slug, sub.name, sub.id),
    ...createSupplementalBatch10ProductsForSubcategory(top.slug, sub.slug, sub.name, sub.id),
  ].map(sanitizePublicProduct);
}

function canonicalSubSlug(sourceSlug: string, subSlug: string, mergedTop: boolean): string {
  if (!mergedTop) return subSlug;
  if (sourceSlug === "nightwear") return `leisure-nightwear-${subSlug}`;
  return `${sourceSlug}-${subSlug}`;
}

function buildSubCategory(
  top: DbCategory,
  group: CategoryGroup,
  sub: SubCategory,
  mergedTop: boolean,
  sourceOrder: number,
  subOrder: number,
): PublicSubCategory {
  const slug = canonicalSubSlug(group.slug, sub.slug, mergedTop);
  const id = `local-category-${top.slug}-${slug}`;
  const name = mergedTop ? `${group.name}: ${sub.name}` : sub.name;
  const category: DbCategory = {
    id,
    parent_id: top.id,
    slug,
    name,
    short: sub.short || null,
    description: sub.short || null,
    image_url: sub.products[0]?.image ?? top.image_url,
    catalog_url: top.catalog_url,
    details: [],
    seo_title: `${name} Manufacturer | Irha Apparels`,
    seo_description: `${name} for wholesale, OEM and private-label buyer programs from Irha Apparels.`,
    sort_order: sourceOrder * 100 + subOrder,
    is_published: true,
  };

  const products = sub.products.map((product, index) => legacyProductToDb(product, id, index));
  const seenSlugs = new Set(products.map((product) => product.slug));
  for (const supplemental of supplementalProducts(top, category)) {
    if (!seenSlugs.has(supplemental.slug)) {
      products.push(supplemental);
      seenSlugs.add(supplemental.slug);
    }
  }
  products.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  return { ...category, products };
}

function buildLocalTree(): PublicTopCategory[] {
  return TOP_CONFIG.map((config, topIndex) => {
    const sourceCategories = config.sources
      .map((source) => CATEGORIES.find((category) => category.slug === source))
      .filter(Boolean) as Array<(typeof CATEGORIES)[number]>;
    const sourceGroups = config.sources
      .map((source) => CATALOG.find((group) => group.slug === source))
      .filter(Boolean) as CategoryGroup[];
    const primary = sourceCategories[0];
    const seo = CATEGORY_SEO[config.slug];
    const top: DbCategory = {
      id: `local-top-${config.slug}`,
      parent_id: null,
      slug: config.slug,
      name: config.name,
      short: config.short,
      description: seo?.intro ?? primary?.description ?? config.short,
      image_url: primary?.image ?? null,
      catalog_url: primary?.catalog ?? null,
      details: uniqueStrings(sourceCategories.flatMap((category) => category.details ?? [])),
      seo_title: seo?.title ?? `${config.name} Manufacturer | Irha Apparels`,
      seo_description: seo?.description ?? primary?.description ?? config.short,
      sort_order: topIndex,
      is_published: true,
    };
    const mergedTop = config.sources.length > 1;
    const subs = sourceGroups.flatMap((group, sourceOrder) =>
      group.subs.map((sub, subOrder) => buildSubCategory(top, group, sub, mergedTop, sourceOrder, subOrder)),
    );
    return { ...top, subs, directProducts: [] };
  });
}

const LOCAL_TREE = buildLocalTree();

function cloneLocalTree(): PublicTopCategory[] {
  return LOCAL_TREE.map((top) => ({
    ...top,
    details: [...(top.details ?? [])],
    directProducts: top.directProducts.map((product) => ({ ...product })),
    subs: top.subs.map((sub) => ({
      ...sub,
      details: [...(sub.details ?? [])],
      products: sub.products.map((product) => ({ ...product })),
    })),
  }));
}

function categoryMatches(local: PublicSubCategory, released: ReleaseCategory) {
  if (local.slug === released.slug) return true;
  if (released.slug.endsWith(`-${local.slug}`)) return true;
  return slugify(local.name) === slugify(released.name);
}

function normalizeRelease(value: unknown): CatalogRelease | null {
  if (!value || typeof value !== "object") return null;
  const release = value as Partial<CatalogRelease>;
  if (!Array.isArray(release.categories) || !Array.isArray(release.products)) return null;
  return {
    categories: release.categories,
    products: release.products,
    hiddenCategorySlugs: Array.isArray(release.hiddenCategorySlugs) ? release.hiddenCategorySlugs : [],
    hiddenProducts: Array.isArray(release.hiddenProducts) ? release.hiddenProducts : [],
    releasedAt: typeof release.releasedAt === "string" ? release.releasedAt : null,
  };
}

function mergeRelease(release: CatalogRelease): PublicTopCategory[] {
  const tree = cloneLocalTree();
  const hiddenCategories = new Set(release.hiddenCategorySlugs);
  const hiddenProducts = new Set(
    release.hiddenProducts.map((item) => `${item.category_slug}:${item.product_slug}`),
  );
  const releasedTop = release.categories.filter((category) => !category.parent_id);
  const releasedSubs = release.categories.filter((category) => Boolean(category.parent_id));

  return tree
    .filter((top) => !hiddenCategories.has(top.slug))
    .map((localTop) => {
      const topOverride = releasedTop.find((category) => category.slug === localTop.slug);
      const top: PublicTopCategory = {
        ...localTop,
        ...(topOverride || {}),
        parent_id: null,
        subs: localTop.subs,
        directProducts: localTop.directProducts,
      };
      top.subs = localTop.subs
        .filter((sub) => !hiddenCategories.has(sub.slug))
        .map((localSub) => {
          const subOverride = releasedSubs.find((category) => categoryMatches(localSub, category));
          const categorySlug = subOverride?.slug ?? localSub.slug;
          const parentSlug = topOverride?.slug ?? top.slug;
          const products = localSub.products
            .filter((product) => !hiddenProducts.has(`${categorySlug}:${product.slug}`))
            .map((product) => ({ ...product }));
          const seen = new Map(products.map((product, index) => [product.slug, index]));
          for (const released of release.products.filter((product) => {
            if (product.parent_slug && product.parent_slug !== parentSlug) return false;
            return product.category_slug === categorySlug || product.category_slug === localSub.slug;
          })) {
            const safe = sanitizePublicProduct(released);
            const existingIndex = seen.get(safe.slug);
            if (existingIndex === undefined) {
              products.push(safe);
              seen.set(safe.slug, products.length - 1);
            } else {
              products[existingIndex] = { ...products[existingIndex], ...safe };
            }
          }
          products.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
          return {
            ...localSub,
            ...(subOverride || {}),
            parent_id: top.id,
            products,
          };
        });
      return top;
    });
}

async function fetchRelease(): Promise<CatalogRelease | null> {
  const { data, error } = await supabase.functions.invoke("public-catalog-release", {
    body: { action: "tree" },
  });
  if (error) throw error;
  return normalizeRelease(data);
}

async function fetchReleasedProduct(categorySlug: string, productSlug: string): Promise<DbProduct | null> {
  const { data, error } = await supabase.functions.invoke("public-catalog-release", {
    body: { action: "product", categorySlug, productSlug },
  });
  if (error) throw error;
  const product = data?.product;
  return product && typeof product === "object" ? sanitizePublicProduct(product as DbProduct) : null;
}

export function usePublicCatalog() {
  return useQuery({
    queryKey: K.tree,
    queryFn: async () => {
      try {
        const release = await fetchRelease();
        return release ? mergeRelease(release) : cloneLocalTree();
      } catch (error) {
        console.warn("Public catalog release unavailable; using verified local fallback.", error);
        return cloneLocalTree();
      }
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

export function usePublicProduct(categorySlug: string, productSlug: string) {
  return useQuery({
    queryKey: K.product(categorySlug, productSlug),
    queryFn: async () => {
      try {
        const released = await fetchReleasedProduct(categorySlug, productSlug);
        if (released) return released;
      } catch (error) {
        console.warn("Public product release unavailable; using verified local fallback.", error);
      }

      for (const top of LOCAL_TREE) {
        for (const sub of top.subs) {
          const product = sub.products.find((item) => item.slug === productSlug);
          if (product && (sub.slug === categorySlug || top.slug === categorySlug)) return { ...product };
        }
      }
      return null;
    },
    enabled: Boolean(categorySlug && productSlug),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}