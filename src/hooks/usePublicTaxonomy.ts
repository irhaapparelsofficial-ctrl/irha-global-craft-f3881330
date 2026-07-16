import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AudienceSlug } from "@/lib/globalCategoryTaxonomy";

export type PublicTaxonomyCollectionRelease = {
  slug: string;
  name: string;
  keyword: string;
  description: string;
  sortOrder: number;
  productSlugs: string[];
};

export type PublicTaxonomyAudienceRelease = {
  slug: AudienceSlug;
  name: string;
  keyword: string;
  description: string;
  sortOrder: number;
  collections: PublicTaxonomyCollectionRelease[];
};

export type PublicTaxonomyCategoryRelease = {
  categorySlug: string;
  audiences: PublicTaxonomyAudienceRelease[];
};

type RpcRow = {
  category_slug?: unknown;
  audience_slug?: unknown;
  audience_name?: unknown;
  audience_keyword?: unknown;
  audience_description?: unknown;
  audience_sort_order?: unknown;
  collection_slug?: unknown;
  collection_name?: unknown;
  collection_keyword?: unknown;
  collection_description?: unknown;
  collection_sort_order?: unknown;
  product_slugs?: unknown;
};

const AUDIENCE_SLUGS = new Set<AudienceSlug>([
  "men",
  "women",
  "kids",
  "unisex",
  "team-club",
  "family-hospitality",
  "accessories",
]);

function cleanSlug(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const slug = value.trim();
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : null;
}

function cleanText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim().slice(0, 600) : fallback;
}

function cleanOrder(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function cleanProductSlugs(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(cleanSlug)
    .filter((slug): slug is string => Boolean(slug))
    .filter((slug, index, all) => all.indexOf(slug) === index)
    .slice(0, 500);
}

export function normalizePublicTaxonomy(value: unknown): PublicTaxonomyCategoryRelease[] {
  if (!Array.isArray(value)) return [];

  const categories = new Map<string, PublicTaxonomyCategoryRelease>();
  const audienceIndex = new Map<string, PublicTaxonomyAudienceRelease>();

  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as RpcRow;
    const categorySlug = cleanSlug(row.category_slug);
    const rawAudienceSlug = cleanSlug(row.audience_slug);
    const collectionSlug = cleanSlug(row.collection_slug);
    const productSlugs = cleanProductSlugs(row.product_slugs);
    if (!categorySlug || !rawAudienceSlug || !AUDIENCE_SLUGS.has(rawAudienceSlug as AudienceSlug) || !collectionSlug || productSlugs.length === 0) {
      continue;
    }

    let category = categories.get(categorySlug);
    if (!category) {
      category = { categorySlug, audiences: [] };
      categories.set(categorySlug, category);
    }

    const audienceKey = `${categorySlug}:${rawAudienceSlug}`;
    let audience = audienceIndex.get(audienceKey);
    if (!audience) {
      audience = {
        slug: rawAudienceSlug as AudienceSlug,
        name: cleanText(row.audience_name, rawAudienceSlug),
        keyword: cleanText(row.audience_keyword),
        description: cleanText(row.audience_description),
        sortOrder: cleanOrder(row.audience_sort_order),
        collections: [],
      };
      audienceIndex.set(audienceKey, audience);
      category.audiences.push(audience);
    }

    audience.collections.push({
      slug: collectionSlug,
      name: cleanText(row.collection_name, collectionSlug),
      keyword: cleanText(row.collection_keyword),
      description: cleanText(row.collection_description),
      sortOrder: cleanOrder(row.collection_sort_order),
      productSlugs,
    });
  }

  return [...categories.values()]
    .map((category) => ({
      ...category,
      audiences: category.audiences
        .map((audience) => ({
          ...audience,
          collections: audience.collections.sort((a, b) => a.sortOrder - b.sortOrder || a.slug.localeCompare(b.slug)),
        }))
        .sort((a, b) => a.sortOrder - b.sortOrder || a.slug.localeCompare(b.slug)),
    }))
    .sort((a, b) => a.categorySlug.localeCompare(b.categorySlug));
}

async function fetchPublicTaxonomy(): Promise<PublicTaxonomyCategoryRelease[]> {
  const db = supabase as any;
  const { data, error } = await db.rpc("catalog_get_public_taxonomy");
  if (error) return [];
  return normalizePublicTaxonomy(data);
}

export function usePublicTaxonomy() {
  return useQuery({
    queryKey: ["public-catalog", "database-taxonomy-v1"],
    queryFn: fetchPublicTaxonomy,
    initialData: [] as PublicTaxonomyCategoryRelease[],
    initialDataUpdatedAt: 0,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
  });
}

export function usePublicTaxonomyCategory(categorySlug?: string) {
  const query = usePublicTaxonomy();
  const data = categorySlug
    ? query.data.find((category) => category.categorySlug === categorySlug) ?? null
    : null;
  return { ...query, data };
}
