import type { DbProduct } from "@/hooks/useCatalog";
import type { ShortlistItem } from "@/lib/shortlist";

export type CompareProduct = DbProduct & {
  categories?: { name?: string | null } | null;
};

export type CompareColumn = {
  item: ShortlistItem;
  product?: CompareProduct;
};

export type CompareRow = {
  label: string;
  get: (column: CompareColumn) => string | null | undefined;
};

export const COMPARE_ROWS: CompareRow[] = [
  { label: "Category", get: ({ item, product }) => item.categoryName || product?.categories?.name },
  { label: "SKU", get: ({ product }) => product?.sku },
  { label: "Primary Material", get: ({ product }) => product?.primary_material },
  { label: "Fabric", get: ({ product }) => product?.fabric_composition },
  { label: "GSM / Weight", get: ({ product }) => product?.gsm },
  { label: "Sizes", get: ({ product }) => product?.available_sizes?.join(", ") ?? null },
  { label: "Colors", get: ({ product }) => product?.available_colors?.join(", ") ?? null },
  {
    label: "Country",
    get: ({ product }) => product ? product.country_of_origin ?? "Pakistan (Sialkot)" : null,
  },
];

export function buildCompareColumns(items: ShortlistItem[], products: CompareProduct[]): CompareColumn[] {
  return items.map((item) => ({
    item,
    product: products.find((product) => product.slug === item.slug),
  }));
}

export function visibleCompareRows(columns: CompareColumn[]) {
  return COMPARE_ROWS.filter((row) => columns.some((column) => (row.get(column) ?? "").toString().trim().length > 0));
}
