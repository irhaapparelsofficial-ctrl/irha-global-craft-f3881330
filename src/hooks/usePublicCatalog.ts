// Public catalog data layer for the live buyer-facing website.
// The committed Lovable/GitHub catalog and verified local media are the source of truth.
// No external Supabase project is required for public category or product rendering.

import { useQuery } from "@tanstack/react-query";
import type { DbCategory, DbProduct, ProductDetailSpec } from "./useCatalog";
import { CATEGORIES, type Product as LegacyProduct } from "@/lib/categories";
import { CATALOG, type CategoryGroup, type SubCategory } from "@/lib/catalog";
import { CATEGORY_SEO } from "@/lib/categorySeo";
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

const K = {
  tree: ["public-catalog", "local-tree"] as const,
  product: (category: string, product: string) => ["public-catalog", "local-product", category, product] as const,
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

const TOP_CONFIG = [
  { slug: "bavarian-trachten-wear", name: "Bavarian Trachten Wear", short: "Lederhosen, Dirndls & Trachten", sources: ["bavarian"] },
  { slug: "premium-leather-apparel", name: "Premium Leather Apparel", short: "Custom Leather Garments", sources: ["leatherwear"] },
  { slug: "sportswear", name: "Sportswear", short: "Custom Teamwear & Performance Apparel", sources: ["sportswear"] },
  { slug: "streetwear-activewear", name: "Streetwear & Activewear", short: "Private-Label Urban & Performance Apparel", sources: ["streetwear"] },
  { slug: "leisure-nightwear", name: "Leisurewear & Nightwear", short: "Casual, Lounge & Sleepwear Programs", sources: ["leisurewear", "nightwear"] },
] as const;

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
  return sanitizePublicProduct({
    id: `local-product-${categoryId}-${productSlug}`,
    category_id: categoryId,
    slug: productSlug,
    name: product.name,
    description: product.description ?? null,
    image_url: gallery[0] ?? null,
    gallery,
    specs: product.specs ?? [],
    details: Array.isArray(product.details) ? product.details : [],
    material_specifications: null,
    seo_title: `${product.name} Manufacturer | Irha Apparels`,
    seo_description: `${product.name} for wholesale, OEM and private-label buyer programs from Irha Apparels, an experienced B2B garment manufacturer in Sialkot, Pakistan.`,
    sort_order: sortOrder,
    is_published: true,
    sku: null,
    is_featured: false,
    short_description: product.description ?? null,
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

async function fetchTree(): Promise<PublicTopCategory[]> {
  return LOCAL_TREE;
}

export function usePublicCatalogTree() {
  return useQuery({ queryKey: K.tree, queryFn: fetchTree, staleTime: Infinity, gcTime: Infinity });
}

export function usePublicTopCategory(slug?: string) {
  const query = usePublicCatalogTree();
  const top = slug ? query.data?.find((category) => category.slug === slug) ?? null : null;
  return { ...query, data: top };
}

export function usePublicProduct(categorySlug?: string, productSlug?: string) {
  return useQuery({
    queryKey: K.product(categorySlug ?? "", productSlug ?? ""),
    enabled: Boolean(categorySlug && productSlug),
    staleTime: Infinity,
    gcTime: Infinity,
    queryFn: async () => {
      const top = LOCAL_TREE.find((category) => category.slug === categorySlug) ?? null;
      if (!top) return null;
      for (const sub of top.subs) {
        const product = sub.products.find((candidate) => candidate.slug === productSlug);
        if (product) return { product, subCategory: sub, topCategory: top };
      }
      return null;
    },
  });
}

export function adaptDbProduct(product: DbProduct): LegacyProduct & { slug: string; id: string } {
  const clean = sanitizePublicProduct(product);
  const gallery = clean.gallery.length ? clean.gallery : clean.image_url ? [clean.image_url] : [];
  const details: ProductDetailSpec[] = Array.isArray(clean.details) ? clean.details : [];
  return {
    id: clean.id,
    slug: clean.slug,
    name: clean.name,
    image: clean.image_url ?? gallery[0] ?? "",
    gallery,
    description: clean.description ?? "",
    specs: clean.specs ?? [],
    details,
  };
}
