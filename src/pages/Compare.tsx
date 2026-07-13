import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowUpRight, GitCompareArrows, RefreshCw, Trash2 } from "lucide-react";
import SEO from "@/components/SEO";
import ThumbnailImage from "@/components/ThumbnailImage";
import { shortlistProductPath, type ShortlistItem, useCompare } from "@/lib/shortlist";
import { supabase } from "@/integrations/supabase/client";
import type { DbProduct } from "@/hooks/useCatalog";

type CompareProduct = DbProduct & {
  categories?: { name?: string | null } | null;
};

type CompareColumn = {
  item: ShortlistItem;
  product?: CompareProduct;
};

type Row = {
  label: string;
  get: (column: CompareColumn) => string | null | undefined;
};

const ROWS: Row[] = [
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
  return ROWS.filter((row) => columns.some((column) => (row.get(column) ?? "").toString().trim().length > 0));
}

export default function Compare() {
  const compare = useCompare();
  const slugs = compare.items.map((item) => item.slug);

  const {
    data: products = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["compare-products", slugs],
    enabled: slugs.length > 0,
    queryFn: async (): Promise<CompareProduct[]> => {
      const { data, error: queryError } = await supabase
        .from("products")
        .select("*, categories(name)")
        .in("slug", slugs)
        .eq("is_published", true);
      if (queryError) throw queryError;
      return (data ?? []) as unknown as CompareProduct[];
    },
  });

  const columns = buildCompareColumns(compare.items, products);
  const visibleRows = visibleCompareRows(columns);
  const unavailableCount = !isLoading && !error
    ? columns.filter((column) => !column.product).length
    : 0;

  const rfqLink = compare.items.length
    ? `/inquiry?intent=rfq&compare=${encodeURIComponent(compare.items.map((item) => item.slug).join(","))}&compareNames=${encodeURIComponent(compare.items.map((item) => item.name).join(","))}`
    : "/inquiry?intent=rfq";

  return (
    <>
      <SEO title="Compare Products | Irha Apparels" description="Side-by-side B2B specification comparison across shortlisted products." path="/compare" noindex />

      <section className="pt-32 pb-20">
        <div className="container-luxe">
          <p className="eyebrow mb-3">Product Comparison</p>
          <h1 className="font-display text-4xl md:text-6xl leading-[0.95]">
            Compare <span className="text-gold italic">specs</span>
          </h1>
          <p className="mt-4 text-sm text-foreground/70">Add 2–4 products from your Shortlist or product pages. Pricing and commercial terms are confirmed after requirement review.</p>

          {compare.items.length === 0 ? (
            <div className="mt-12 border border-dashed border-border/60 p-10 text-center">
              <GitCompareArrows size={28} className="mx-auto text-foreground/40 mb-4" />
              <p className="text-foreground/70">Nothing to compare yet. Open a product or your Shortlist and add up to 4 items.</p>
              <div className="mt-6 flex flex-wrap gap-3 justify-center">
                <Link to="/shortlist" className="inline-flex items-center gap-2 border border-border/60 hover:border-primary px-5 py-2.5 text-xs uppercase tracking-[0.3em]">Open Shortlist</Link>
                <Link to="/products" className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-5 py-2.5 text-xs uppercase tracking-[0.3em]">Browse Products <ArrowUpRight size={14} /></Link>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link to={rfqLink} className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3.5 text-xs uppercase tracking-[0.3em]">
                  Request Quote for Selected <ArrowUpRight size={14} />
                </Link>
                <button type="button" onClick={compare.clear} className="ml-auto min-h-11 text-[11px] uppercase tracking-[0.25em] text-foreground/60 hover:text-foreground inline-flex items-center gap-1 px-2">
                  <Trash2 size={12} /> Clear
                </button>
              </div>

              {isLoading && (
                <p className="mt-5 text-xs text-foreground/55" role="status" aria-live="polite">Loading current published specifications…</p>
              )}

              {error && (
                <div className="mt-5 flex flex-wrap items-center gap-3 border border-destructive/40 bg-destructive/5 p-4 text-xs" role="alert">
                  <AlertTriangle size={15} className="text-destructive" />
                  <span className="text-foreground/75">Current specifications could not be loaded. Saved product names remain visible; retry before using the comparison for an RFQ.</span>
                  <button type="button" onClick={() => void refetch()} className="ml-auto min-h-10 inline-flex items-center gap-2 border border-border/60 px-3 py-2 uppercase tracking-[0.18em] hover:border-primary">
                    <RefreshCw size={12} /> Retry
                  </button>
                </div>
              )}

              {unavailableCount > 0 && (
                <div className="mt-5 flex items-start gap-3 border border-amber-500/40 bg-amber-500/5 p-4 text-xs text-foreground/75" role="status">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-600" />
                  <span>{unavailableCount} saved product{unavailableCount === 1 ? " is" : "s are"} no longer available in the published catalogue. Remove the unavailable item before sending an RFQ.</span>
                </div>
              )}

              <div className="mt-8 overflow-x-auto border border-border/60">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-border/60">
                      <th className="p-4 text-left text-[10px] uppercase tracking-[0.25em] text-foreground/50 font-normal w-40">Product</th>
                      {columns.map(({ item, product }) => {
                        const productPath = shortlistProductPath(item);
                        return (
                          <th key={item.slug} className="p-4 text-left align-top min-w-[180px] border-l border-border/60">
                            <Link to={productPath} className="block group">
                              <div className="relative aspect-[3/4] mb-3 overflow-hidden bg-card">
                                {item.image && <ThumbnailImage src={item.image} alt={item.name} className="absolute inset-0 w-full h-full object-cover" />}
                              </div>
                              <p className="font-display text-sm leading-tight group-hover:text-primary transition-colors">{item.name}</p>
                            </Link>
                            {!product && !isLoading && !error && (
                              <p className="mt-2 text-[9px] uppercase tracking-[0.18em] text-amber-600">Unavailable</p>
                            )}
                            <button type="button" onClick={() => compare.remove(item.slug)} className="mt-2 min-h-10 text-[10px] uppercase tracking-[0.2em] text-foreground/50 hover:text-destructive inline-flex items-center gap-1">
                              <Trash2 size={10} /> Remove
                            </button>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((row) => (
                      <tr key={row.label} className="border-b border-border/40">
                        <td className="p-4 text-[11px] uppercase tracking-[0.22em] text-foreground/55 align-top">{row.label}</td>
                        {columns.map((column) => (
                          <td key={`${row.label}:${column.item.slug}`} className="p-4 align-top text-foreground/85 border-l border-border/60">
                            {row.get(column) || <span className="text-foreground/30">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-xs text-foreground/50">Only available published data is shown. MOQ, samples, production timing, pricing and shipping are confirmed after requirement review.</p>
            </>
          )}
        </div>
      </section>
    </>
  );
}
