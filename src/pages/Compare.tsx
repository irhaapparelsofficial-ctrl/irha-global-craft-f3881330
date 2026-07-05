import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowUpRight, GitCompareArrows, Trash2 } from "lucide-react";
import SEO from "@/components/SEO";
import { useCompare } from "@/lib/shortlist";
import { supabase } from "@/integrations/supabase/client";
import type { DbProduct } from "@/hooks/useCatalog";

type Row = { label: string; get: (p: DbProduct) => string | null | undefined };

const ROWS: Row[] = [
  { label: "Category", get: (p) => (p as unknown as { category_name?: string }).category_name },
  { label: "SKU", get: (p) => p.sku },
  { label: "MOQ", get: (p) => p.moq_display },
  { label: "Sample", get: (p) => (p.sample_available === false ? "Not available" : p.sample_timeline) },
  { label: "Production", get: (p) => p.production_timeline },
  { label: "Primary Material", get: (p) => p.primary_material },
  { label: "Fabric", get: (p) => p.fabric_composition },
  { label: "GSM / Weight", get: (p) => p.gsm },
  { label: "Sizes", get: (p) => p.available_sizes?.join(", ") ?? null },
  { label: "Colors", get: (p) => p.available_colors?.join(", ") ?? null },
  { label: "Country", get: (p) => p.country_of_origin ?? "Pakistan (Sialkot)" },
];

export default function Compare() {
  const compare = useCompare();
  const slugs = compare.items.map((i) => i.slug);

  const { data: products = [] } = useQuery({
    queryKey: ["compare-products", slugs],
    enabled: slugs.length > 0,
    queryFn: async (): Promise<DbProduct[]> => {
      const { data } = await supabase.from("products").select("*").in("slug", slugs).eq("is_published", true);
      return (data ?? []) as unknown as DbProduct[];
    },
  });

  // Preserve order per shortlist selection
  const ordered = slugs
    .map((s) => products.find((p) => p.slug === s))
    .filter((p): p is DbProduct => !!p);

  const rfqLink = compare.items.length
    ? `/inquiry?shortlist=${encodeURIComponent(compare.items.map((i) => i.slug).join(","))}&names=${encodeURIComponent(compare.items.map((i) => i.name).join(","))}&intent=compare`
    : "/inquiry";

  // Hide rows where no product has a value
  const visibleRows = ROWS.filter((r) => ordered.some((p) => (r.get(p) ?? "").toString().trim().length > 0));

  return (
    <>
      <SEO title="Compare Products | Irha Apparels" description="Side-by-side B2B specification comparison across shortlisted products." path="/compare" noindex />

      <section className="pt-32 pb-20">
        <div className="container-luxe">
          <p className="eyebrow mb-3">Product Comparison</p>
          <h1 className="font-display text-4xl md:text-6xl leading-[0.95]">
            Compare <span className="text-gold italic">specs</span>
          </h1>
          <p className="mt-4 text-sm text-foreground/70">Add 2–4 products from your Shortlist or product pages. Prices are quotation-based.</p>

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
                <button type="button" onClick={compare.clear} className="ml-auto text-[11px] uppercase tracking-[0.25em] text-foreground/60 hover:text-foreground inline-flex items-center gap-1">
                  <Trash2 size={12} /> Clear
                </button>
              </div>

              <div className="mt-8 overflow-x-auto border border-border/60">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-border/60">
                      <th className="p-4 text-left text-[10px] uppercase tracking-[0.25em] text-foreground/50 font-normal w-40">Product</th>
                      {compare.items.map((c) => (
                        <th key={c.slug} className="p-4 text-left align-top min-w-[180px] border-l border-border/60">
                          <Link to={`/products/${c.categorySlug}/${c.slug}`} className="block group">
                            <div className="relative aspect-[3/4] mb-3 overflow-hidden bg-card">
                              {c.image && <img src={c.image} alt={c.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />}
                            </div>
                            <p className="font-display text-sm leading-tight group-hover:text-primary transition-colors">{c.name}</p>
                          </Link>
                          <button type="button" onClick={() => compare.remove(c.slug)} className="mt-2 text-[10px] uppercase tracking-[0.2em] text-foreground/50 hover:text-destructive inline-flex items-center gap-1">
                            <Trash2 size={10} /> Remove
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((r) => (
                      <tr key={r.label} className="border-b border-border/40">
                        <td className="p-4 text-[11px] uppercase tracking-[0.22em] text-foreground/55 align-top">{r.label}</td>
                        {ordered.map((p) => (
                          <td key={p.id} className="p-4 align-top text-foreground/85 border-l border-border/60">
                            {r.get(p) || <span className="text-foreground/30">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-xs text-foreground/50">No prices shown — MOQ, sample availability, and lead times are confirmed after requirement review.</p>
            </>
          )}
        </div>
      </section>
    </>
  );
}
