import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  ExternalLink,
  FolderTree,
  ImageOff,
  Package,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { resolveAsset } from "@/lib/assetResolver";

type Category = {
  id: string;
  parent_id: string | null;
  slug: string;
  name: string;
  short: string | null;
  image_url: string | null;
  catalog_url: string | null;
  sort_order: number;
  is_published: boolean;
};

type Product = {
  id: string;
  category_id: string;
  slug: string;
  name: string;
  image_url: string | null;
  gallery: string[];
  sort_order: number;
  is_published: boolean;
};

export default function CatalogPanel() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [categoryResult, productResult] = await Promise.all([
      supabase
        .from("categories")
        .select("id,parent_id,slug,name,short,image_url,catalog_url,sort_order,is_published")
        .order("sort_order"),
      supabase
        .from("products")
        .select("id,category_id,slug,name,image_url,gallery,sort_order,is_published")
        .order("sort_order")
        .limit(1000),
    ]);

    setCategories((categoryResult.data ?? []) as Category[]);
    setProducts((productResult.data ?? []) as unknown as Product[]);
    setError(categoryResult.error?.message || productResult.error?.message || null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );
  const roots = useMemo(
    () => categories.filter((category) => category.parent_id === null).sort((a, b) => a.sort_order - b.sort_order),
    [categories],
  );
  const childrenByParent = useMemo(() => {
    const map = new Map<string, Category[]>();
    for (const category of categories) {
      if (!category.parent_id) continue;
      const rows = map.get(category.parent_id) ?? [];
      rows.push(category);
      map.set(category.parent_id, rows);
    }
    for (const rows of map.values()) rows.sort((a, b) => a.sort_order - b.sort_order);
    return map;
  }, [categories]);
  const productsByCategory = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const product of products) {
      const rows = map.get(product.category_id) ?? [];
      rows.push(product);
      map.set(product.category_id, rows);
    }
    for (const rows of map.values()) rows.sort((a, b) => a.sort_order - b.sort_order);
    return map;
  }, [products]);

  const publishedCategories = categories.filter((category) => category.is_published).length;
  const publishedProducts = products.filter((product) => product.is_published).length;
  const downloadableCatalogues = categories.filter((category) => Boolean(category.catalog_url)).length;
  const orphanProducts = products.filter((product) => !categoryById.has(product.category_id));

  if (loading && categories.length === 0) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Loading live catalog structure…</p>;
  }

  return (
    <div className="space-y-6">
      <section className="border border-gold/40 bg-gold/[0.04] p-5 md:p-7">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
          <div>
            <p className="eyebrow mb-2">Owner database source of truth</p>
            <h2 className="font-display text-2xl md:text-4xl">Live Catalog Structure</h2>
            <p className="mt-3 max-w-3xl text-sm text-foreground/65 leading-relaxed">
              This is a read-only release view of the categories and products currently stored in owner Supabase. Use the dedicated Products and Product Categories sections for controlled edits. Static PDF catalogues are not treated as available unless a verified category download URL exists.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void load()}
              className="min-h-11 inline-flex items-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.18em] hover:border-gold hover:text-gold"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <a
              href="/catalogue"
              target="_blank"
              rel="noreferrer"
              className="min-h-11 inline-flex items-center gap-2 border border-gold/60 text-gold px-4 text-[10px] uppercase tracking-[0.18em] hover:bg-gold hover:text-background"
            >
              Open public catalogue <ExternalLink size={13} />
            </a>
          </div>
        </div>
      </section>

      {error && (
        <div className="border border-red-500/40 bg-red-500/5 p-4 flex items-start gap-3 text-sm text-red-200">
          <AlertTriangle size={17} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Latest catalog refresh failed</p>
            <p className="mt-1 text-xs text-foreground/60 break-words">{error}</p>
          </div>
        </div>
      )}

      {orphanProducts.length > 0 && (
        <div className="border border-amber-500/40 bg-amber-500/5 p-4 flex items-start gap-3 text-sm text-amber-200">
          <AlertTriangle size={17} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Catalog relationship issue</p>
            <p className="mt-1 text-xs text-foreground/60">{orphanProducts.length} product record(s) reference a missing category and require repair before publication.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric label="Categories" value={categories.length} detail={`${publishedCategories} published`} icon={<FolderTree size={15} />} />
        <Metric label="Products" value={products.length} detail={`${publishedProducts} published`} icon={<Package size={15} />} />
        <Metric label="Verified PDF links" value={downloadableCatalogues} detail="Category download URLs" icon={<BookOpen size={15} />} />
        <Metric label="Orphan products" value={orphanProducts.length} detail="Must remain zero" icon={<AlertTriangle size={15} />} emphasis={orphanProducts.length > 0} />
      </div>

      {roots.length === 0 ? (
        <div className="border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
          No top-level catalog categories are available.
        </div>
      ) : (
        <div className="space-y-5">
          {roots.map((root) => {
            const children = childrenByParent.get(root.id) ?? [];
            const directProducts = productsByCategory.get(root.id) ?? [];
            const descendantProducts = children.flatMap((child) => productsByCategory.get(child.id) ?? []);
            const totalProducts = directProducts.length + descendantProducts.length;
            return (
              <section key={root.id} className="border border-border/60 bg-card/25 overflow-hidden">
                <div className="p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-4 border-b border-border/50">
                  <CatalogImage src={root.image_url} alt={root.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-2xl">{root.name}</h3>
                      <Status published={root.is_published} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">/{root.slug} · {children.length} subcategories · {totalProducts} products</p>
                    {root.short && <p className="mt-2 text-sm text-foreground/65">{root.short}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {root.is_published && (
                      <a href={`/products/${root.slug}`} target="_blank" rel="noreferrer" className={linkClass}>
                        Live category <ExternalLink size={12} />
                      </a>
                    )}
                    {root.catalog_url && (
                      <a href={root.catalog_url} target="_blank" rel="noreferrer" className={linkClass}>
                        Verified PDF <BookOpen size={12} />
                      </a>
                    )}
                  </div>
                </div>

                <div className="p-4 md:p-5 grid lg:grid-cols-2 gap-4">
                  {children.map((child) => {
                    const childProducts = productsByCategory.get(child.id) ?? [];
                    return (
                      <article key={child.id} className="border border-border/50 bg-background/35 p-4">
                        <div className="flex items-start gap-3">
                          <CatalogImage src={child.image_url} alt={child.name} small />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-medium">{child.name}</h4>
                              <Status published={child.is_published} />
                            </div>
                            <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mt-1">/{child.slug} · {childProducts.length} products</p>
                          </div>
                        </div>
                        {childProducts.length === 0 ? (
                          <p className="mt-4 text-xs text-muted-foreground">No products assigned.</p>
                        ) : (
                          <ul className="mt-4 space-y-2">
                            {childProducts.map((product) => (
                              <li key={product.id} className="flex items-center justify-between gap-3 border-t border-border/35 pt-2 text-xs">
                                <span className="min-w-0 truncate">{product.name}</span>
                                <span className="flex items-center gap-2 shrink-0">
                                  <Status published={product.is_published} compact />
                                  {product.is_published && (
                                    <a href={`/products/${root.slug}/${product.slug}`} target="_blank" rel="noreferrer" aria-label={`Open ${product.name}`} className="text-gold hover:underline">
                                      <ExternalLink size={12} />
                                    </a>
                                  )}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </article>
                    );
                  })}

                  {directProducts.length > 0 && (
                    <article className="border border-amber-500/40 bg-amber-500/5 p-4">
                      <p className="font-medium text-amber-200">Products assigned directly to top-level category</p>
                      <p className="mt-1 text-xs text-foreground/60">These records should normally be reviewed and moved to a valid subcategory.</p>
                      <ul className="mt-3 space-y-1 text-xs">
                        {directProducts.map((product) => <li key={product.id}>{product.name}</li>)}
                      </ul>
                    </article>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
  icon,
  emphasis = false,
}: {
  label: string;
  value: number;
  detail: string;
  icon: React.ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div className={`border p-4 ${emphasis ? "border-red-500/50 bg-red-500/5" : "border-border/60 bg-card/25"}`}>
      <div className="flex items-center justify-between gap-2 text-gold">{icon}</div>
      <p className="font-display text-3xl mt-3 tabular-nums">{value.toLocaleString()}</p>
      <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground mt-1">{label}</p>
      <p className="text-[10px] text-foreground/50 mt-2">{detail}</p>
    </div>
  );
}

function CatalogImage({ src, alt, small = false }: { src: string | null; alt: string; small?: boolean }) {
  const resolved = src ? resolveAsset(src) : "";
  const size = small ? "w-12 h-12" : "w-20 h-20";
  return resolved ? (
    <img src={resolved} alt={alt} className={`${size} shrink-0 object-cover border border-border/50`} loading="lazy" />
  ) : (
    <div className={`${size} shrink-0 border border-dashed border-border/60 inline-flex items-center justify-center text-muted-foreground`} aria-label={`${alt} has no image`}>
      <ImageOff size={small ? 15 : 20} />
    </div>
  );
}

function Status({ published, compact = false }: { published: boolean; compact?: boolean }) {
  return (
    <span className={`inline-flex border px-2 py-0.5 uppercase tracking-[0.14em] ${compact ? "text-[8px]" : "text-[9px]"} ${
      published ? "border-emerald-500/40 text-emerald-300" : "border-slate-500/40 text-slate-300"
    }`}>
      {published ? "Published" : "Draft"}
    </span>
  );
}

const linkClass = "min-h-10 inline-flex items-center gap-2 border border-border/60 px-3 text-[9px] uppercase tracking-[0.16em] hover:border-gold hover:text-gold";
