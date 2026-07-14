import type {
  NormalizedCategory,
  NormalizedProduct,
} from "@/hooks/usePublicCategoryData";

export type ProductFinderItem = {
  categorySlug: string;
  categoryName: string;
  subSlug: string;
  subName: string;
  product: NormalizedProduct;
};

export type ProductFinderSort = "relevance" | "name-asc" | "newest";

export type ProductFinderFilters = {
  query?: string;
  categorySlug?: string;
  sort?: ProductFinderSort;
};

export function flattenProductCatalog(categories: NormalizedCategory[]): ProductFinderItem[] {
  return categories.flatMap((category) =>
    category.subs.flatMap((subCategory) =>
      subCategory.products.map((product) => ({
        categorySlug: category.slug,
        categoryName: category.name,
        subSlug: subCategory.slug,
        subName: subCategory.name,
        product,
      })),
    ),
  );
}

function normalized(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function searchableText(item: ProductFinderItem): string {
  return normalized(
    [
      item.product.name,
      item.product.sku,
      item.categoryName,
      item.subName,
      item.product.description,
      ...(item.product.specs ?? []),
    ].join(" "),
  );
}

function searchScore(item: ProductFinderItem, query: string): number | null {
  const cleanQuery = normalized(query);
  if (!cleanQuery) return 0;

  const tokens = cleanQuery.split(/\s+/).filter(Boolean);
  const haystack = searchableText(item);
  if (!tokens.every((token) => haystack.includes(token))) return null;

  const name = normalized(item.product.name);
  const sku = normalized(item.product.sku);
  const category = normalized(item.categoryName);
  const subCategory = normalized(item.subName);

  let score = 0;
  if (name === cleanQuery) score += 180;
  else if (name.startsWith(cleanQuery)) score += 120;
  else if (name.includes(cleanQuery)) score += 90;

  if (sku && sku === cleanQuery) score += 160;
  else if (sku && sku.includes(cleanQuery)) score += 80;

  if (subCategory.includes(cleanQuery)) score += 35;
  if (category.includes(cleanQuery)) score += 25;
  score += tokens.reduce((total, token) => total + (name.includes(token) ? 15 : 0), 0);

  return score;
}

function createdAt(item: ProductFinderItem): number {
  const timestamp = item.product.created_at ? Date.parse(item.product.created_at) : Number.NaN;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function filterProductFinder(
  items: ProductFinderItem[],
  filters: ProductFinderFilters,
): ProductFinderItem[] {
  const query = normalized(filters.query);
  const categorySlug = normalized(filters.categorySlug);
  const sort = filters.sort ?? "relevance";

  const scored = items
    .filter((item) => !categorySlug || categorySlug === "all" || item.categorySlug === categorySlug)
    .map((item) => ({ item, score: searchScore(item, query) }))
    .filter((entry): entry is { item: ProductFinderItem; score: number } => entry.score !== null);

  scored.sort((a, b) => {
    if (sort === "newest") {
      const dateDifference = createdAt(b.item) - createdAt(a.item);
      if (dateDifference !== 0) return dateDifference;
    }

    if (sort === "relevance" && query && b.score !== a.score) {
      return b.score - a.score;
    }

    return a.item.product.name.localeCompare(b.item.product.name);
  });

  return scored.map(({ item }) => item);
}
