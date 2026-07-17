import { useParams, Link, Navigate, useSearchParams } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SEO from "@/components/SEO";
import type { Product } from "@/lib/categories";
import { CATEGORY_SEO, type CategorySEO } from "@/lib/categorySeo";
import { resolveLegacyCategorySlug } from "@/lib/legacyCategorySlugs";

import ProductDetailModal from "@/components/ProductDetailModal";
import CatalogFlipbook from "@/components/CatalogFlipbook";
import CatalogThumbnailStrip from "@/components/CatalogThumbnailStrip";
import CategoryHero, { type CategoryHeroSlide } from "@/components/CategoryHero";
import { ChevronRight, Download, Eye, MessageCircle, Search, SlidersHorizontal, X } from "lucide-react";
import { whatsappLink } from "@/lib/constants";
import { usePublicCategories, useNormalizedCategory } from "@/hooks/usePublicCategoryData";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";

const SITE = "https://irhaapparels.com";

type SortKey = "recommended" | "name" | "newest";

type FlatProduct = Product & {
  subSlug: string;
  subName: string;
  sku: string;
  productSlug: string;
  createdAt?: string;
  _order: number;
};

const VALID_SORTS: SortKey[] = ["recommended", "name", "newest"];

const INITIAL_VISIBLE = 200;
const CHUNK = 200;
const LOAD_MORE_THRESHOLD = 250;

function extractMoq(details: FlatProduct["details"]): string {
  const row = details?.find((d) => /moq/i.test(d.label));
  if (!row?.value) return "MOQ on request";
  return `MOQ ${row.value.split(/[,/]/)[0].trim()}`;
}

export default function CategoryPage() {
  const { slug = "" } = useParams<{ slug: string }>();

  // 1) Legacy slug → canonical 5-top redirect
  const legacy = resolveLegacyCategorySlug(slug);

  const { category, isLoading } = useNormalizedCategory(legacy ? legacy.top : slug);
  const { categories: allCategories } = usePublicCategories();
  const seoHardcoded = CATEGORY_SEO[slug] ?? CATEGORY_SEO[legacy?.top ?? ""];
  const subs = category?.subs ?? [];

  // ---- URL-backed filter/sort/search state ----
  const [searchParams, setSearchParams] = useSearchParams();
  const rawSort = searchParams.get("sort") ?? "recommended";
  const sort: SortKey = (VALID_SORTS as string[]).includes(rawSort) ? (rawSort as SortKey) : "recommended";
  const activeFilter = searchParams.get("subcategory") ?? legacy?.sub ?? "all";
  const q = searchParams.get("q") ?? "";
  const [qInput, setQInput] = useState(q);
  useEffect(() => { setQInput(q); }, [q]);

  const updateParams = useCallback(
    (patch: Record<string, string | null>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            if (v === null || v === "" || (k === "subcategory" && v === "all") || (k === "sort" && v === "recommended")) {
              next.delete(k);
            } else {
              next.set(k, v);
            }
          }
          return next;
        },
        { replace: false },
      );
    },
    [setSearchParams],
  );

  const setActiveFilter = useCallback((v: string) => updateParams({ subcategory: v }), [updateParams]);
  const setSort = useCallback((v: SortKey) => updateParams({ sort: v }), [updateParams]);
  const setQ = useCallback((v: string) => updateParams({ q: v.trim() }), [updateParams]);

  const [visible, setVisible] = useState(INITIAL_VISIBLE);
  const [activeProduct, setActiveProduct] = useState<FlatProduct | null>(null);
  const [flipOpen, setFlipOpen] = useState(false);
  const [peekOpen, setPeekOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const allProducts: FlatProduct[] = useMemo(() => {
    const out: FlatProduct[] = [];
    let order = 0;
    subs.forEach((sub) => {
      sub.products.forEach((p) => {
        const sku = `IRH-${(category?.slug ?? slug).slice(0, 3).toUpperCase()}-${String(order + 1).padStart(4, "0")}`;
        out.push({
          ...p,
          subSlug: sub.slug,
          subName: sub.name,
          sku,
          productSlug: p.slug,
          createdAt: (p as { created_at?: string }).created_at,
          _order: order++,
        });
      });
    });
    return out;
  }, [subs, slug, category?.slug]);

  const filteredSorted = useMemo(() => {
    const bySub =
      activeFilter === "all"
        ? allProducts
        : allProducts.filter((p) => p.subSlug === activeFilter);
    const needle = q.trim().toLowerCase();
    const filtered = !needle
      ? bySub
      : bySub.filter((p) => {
          const hay = `${p.name} ${p.sku} ${p.description ?? ""} ${p.subName}`.toLowerCase();
          return hay.includes(needle);
        });
    const sorted = [...filtered];
    if (sort === "name") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === "newest") {
      // Real created_at desc; undated products go last, preserving stable order among them.
      sorted.sort((a, b) => {
        const ad = a.createdAt ? Date.parse(a.createdAt) : NaN;
        const bd = b.createdAt ? Date.parse(b.createdAt) : NaN;
        const aHas = Number.isFinite(ad);
        const bHas = Number.isFinite(bd);
        if (aHas && bHas) return bd - ad;
        if (aHas) return -1;
        if (bHas) return 1;
        return a._order - b._order;
      });
    }
    // "recommended" preserves DB sort_order (source order)
    return sorted;
  }, [allProducts, activeFilter, sort, q]);

  useEffect(() => { setVisible(INITIAL_VISIBLE); }, [activeFilter, sort, q]);

  // Lock body scroll while mobile filter drawer is open
  useEffect(() => {
    if (!filterOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [filterOpen]);


  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    if (visible >= filteredSorted.length) return;
    if (visible >= LOAD_MORE_THRESHOLD) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible((v) => Math.min(v + CHUNK, filteredSorted.length));
        }
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible, filteredSorted.length]);

  // Redirect legacy slugs to canonical (after data hooks so refs stay stable)
  if (legacy && slug !== legacy.top) {
    const sp = legacy.sub ? `?subcategory=${legacy.sub}` : "";
    return <Navigate to={`/products/${legacy.top}${sp}`} replace />;
  }

  if (isLoading && !category) {
    return <div className="pt-40 pb-20 container-luxe text-sm text-muted-foreground">Loading collection…</div>;
  }
  if (!category) return <Navigate to="/products" replace />;

  // 2) Build resolved SEO from hardcoded enhancement OR DB fallback — never redirect for missing hardcoded entry.
  const seo: CategorySEO & { intro: string; h1: string } = seoHardcoded ?? {
    title: category.seoTitle ?? `${category.name} Manufacturer & Wholesale Supplier | IRHA Apparels`,
    description: category.seoDescription ?? category.short ?? category.description.slice(0, 158),
    keywords: `${category.name} manufacturer, wholesale ${category.name}, private label ${category.name}`,
    h1: `${category.name} Manufacturer — Wholesale, OEM & Private Label`,
    intro: category.description || category.short || "",
    exportMarkets: ["USA", "UK", "Germany", "Australia", "Canada", "UAE"],
    ogImage: category.image,
    faqs: [],
    sections: [],
    buyerGuides: [],
  };

  const totalProducts = allProducts.length;
  const url = `${SITE}/products/${category.slug}`;

  const heroSlides: CategoryHeroSlide[] = [
    {
      image: category.image,
      eyebrow: "Irha Apparels · B2B Manufacturing",
      title: `Wholesale ${category.name} Manufacturer`,
      subtitle: seo.intro,
      ctaLabel: "View Collection",
      ctaHref: `/products/${category.slug}#collection`,
    },
    ...subs.slice(0, 4).map((sub) => ({
      image: sub.products[0]?.image ?? category.image,
      eyebrow: category.name,
      title: `${sub.name} — Bulk & Private Label`,
      subtitle: sub.short,
      ctaLabel: "View Collection",
      ctaHref: `/products/${category.slug}#${sub.slug}`,
    })),
  ].slice(0, 5);

  const jsonLd: object[] = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: seo.h1,
      url,
      description: seo.description,
      isPartOf: { "@type": "WebSite", name: "Irha Apparels", url: `${SITE}/` },
      about: { "@type": "Thing", name: category.name },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
        { "@type": "ListItem", position: 2, name: "Collections", item: `${SITE}/products` },
        { "@type": "ListItem", position: 3, name: category.name, item: url },
      ],
    },
  ];
  if (seo.faqs.length > 0) {
    jsonLd.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: seo.faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    });
  }

  const renderProducts = filteredSorted.slice(0, visible);
  const hiddenProducts = filteredSorted.slice(visible);
  const showLoadMoreButton =
    visible < filteredSorted.length && visible >= LOAD_MORE_THRESHOLD;

  return (
    <>
      <SEO
        title={seo.title}
        description={seo.description}
        path={`/products/${category.slug}`}
        image={seo.ogImage}
        jsonLd={jsonLd}
      />

      <div className="pt-28">
        <CategoryHero slides={heroSlides} />
      </div>

      <section className="py-10 border-b border-border/60">
        <div className="container-luxe">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-foreground/55 mb-6">
            <Link to="/" className="hover:text-foreground">Home</Link>
            <ChevronRight size={12} />
            <Link to="/products" className="hover:text-foreground">Collections</Link>
            <ChevronRight size={12} />
            <span className="text-foreground/80">{category.name}</span>
          </nav>
          <h1 className="font-display text-3xl md:text-5xl leading-[1.02] max-w-4xl">{seo.h1}</h1>
          <div className="mt-6 flex flex-wrap gap-3 items-center">
            <a
              href={whatsappLink(`Hello Irha Apparels — I'd like a quote for ${category.name}.`)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-3 bg-primary text-primary-foreground hover:bg-primary/90 px-7 py-4 text-xs uppercase tracking-[0.3em] transition-colors"
            >
              <MessageCircle size={16} /> Request a Quote
            </a>
            <button
              type="button"
              onClick={() => setFlipOpen(true)}
              className="inline-flex items-center gap-3 border border-border/60 hover:border-primary hover:text-primary px-7 py-4 text-xs uppercase tracking-[0.3em] transition-colors"
            >
              <Eye size={14} /> Preview Catalogue
            </button>
            <span className="text-xs uppercase tracking-[0.3em] text-foreground/55 ml-2">
              {totalProducts} styles · Flexible MOQ · Exports {seo.exportMarkets.slice(0, 3).join(", ")}
            </span>
          </div>

          <div
            className="mt-8 pt-6 border-t border-border/40 group/peek"
            onMouseEnter={() => setPeekOpen(true)}
            onMouseLeave={() => setPeekOpen(false)}
          >
            <button
              type="button"
              onClick={() => setPeekOpen((v) => !v)}
              aria-expanded={peekOpen}
              aria-controls="catalogue-peek-strip"
              className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-foreground/55 hover:text-primary transition-colors"
            >
              <Eye size={12} /> {category.name} catalogue · peek inside
            </button>
            <div
              id="catalogue-peek-strip"
              className={`grid transition-all duration-300 ease-out ${
                peekOpen ? "grid-rows-[1fr] opacity-100 mt-3" : "grid-rows-[0fr] opacity-0 mt-0"
              }`}
            >
              <div className="overflow-hidden">
                <CatalogThumbnailStrip
                  slug={category.slug}
                  count={6}
                  skip={1}
                  onClick={() => setFlipOpen(true)}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile: compact sticky Filter + Sort row */}
      <div className="sticky top-[64px] z-30 bg-background/95 backdrop-blur border-b border-border/60 md:hidden pb-[env(safe-area-inset-bottom,0px)]">
        <div className="container-luxe py-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            aria-label="Open filters"
            className="flex-1 inline-flex items-center justify-center gap-2 border border-border/60 px-4 py-2.5 text-[11px] uppercase tracking-[0.25em] hover:border-primary hover:text-primary"
          >
            <SlidersHorizontal size={14} /> Filter
            {(activeFilter !== "all" || q) && (
              <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] px-1">
                {(activeFilter !== "all" ? 1 : 0) + (q ? 1 : 0)}
              </span>
            )}
          </button>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Sort"
            className="flex-1 bg-transparent border border-border/60 px-3 py-2.5 text-[11px] uppercase tracking-[0.2em] focus:outline-none focus:border-primary"
          >
            <option value="recommended">Sort · Recommended</option>
            <option value="name">Sort · A–Z</option>
            <option value="newest">Sort · Newest</option>
          </select>
        </div>
      </div>

      {/* Desktop: inline chips + search + sort (preserved experience) */}
      <div className="hidden md:block sticky top-[72px] z-30 bg-background/95 backdrop-blur border-b border-border/60">
        <div className="container-luxe py-4 flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2 flex-1 min-w-0">
            <FilterChip
              label="All"
              count={allProducts.length}
              active={activeFilter === "all"}
              onClick={() => setActiveFilter("all")}
            />
            {subs.map((s) => (
              <FilterChip
                key={s.slug}
                label={s.name}
                count={s.products.length}
                active={activeFilter === s.slug}
                onClick={() => setActiveFilter(s.slug)}
              />
            ))}
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); setQ(qInput); }}
            className="relative flex items-center"
          >
            <Search size={14} className="absolute left-3 text-foreground/50 pointer-events-none" />
            <input
              type="search"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              onBlur={() => { if (qInput !== q) setQ(qInput); }}
              placeholder="Search in category"
              aria-label="Search within category"
              className="bg-transparent border border-border/60 pl-9 pr-8 py-2 text-xs w-56 focus:outline-none focus:border-primary"
            />
            {q && (
              <button
                type="button"
                onClick={() => { setQInput(""); setQ(""); }}
                aria-label="Clear search"
                className="absolute right-2 text-foreground/50 hover:text-foreground"
              >
                <X size={14} />
              </button>
            )}
          </form>
          <label className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-foreground/60">
            Sort
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="bg-transparent border border-border/60 px-3 py-2 text-xs uppercase tracking-[0.2em] focus:outline-none focus:border-primary"
            >
              <option value="recommended">Recommended</option>
              <option value="name">A–Z</option>
              <option value="newest">Newest</option>
            </select>
          </label>
        </div>
      </div>

      {/* Mobile filter drawer */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="bottom" className="h-[85vh] flex flex-col p-0">
          <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/60 text-left">
            <SheetTitle className="text-sm uppercase tracking-[0.25em]">Filter {category.name}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            <form
              onSubmit={(e) => { e.preventDefault(); setQ(qInput); setFilterOpen(false); }}
              className="relative flex items-center"
            >
              <Search size={16} className="absolute left-3 text-foreground/50 pointer-events-none" />
              <input
                type="search"
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                placeholder="Search products, SKU, description"
                aria-label="Search within category"
                className="w-full bg-transparent border border-border/60 pl-10 pr-3 py-3 text-sm focus:outline-none focus:border-primary"
              />
            </form>
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-foreground/55 mb-2">Subcategory</p>
              <ul className="divide-y divide-border/50 border-y border-border/50">
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveFilter("all")}
                    className={`w-full flex items-center justify-between py-3 text-left text-sm ${activeFilter === "all" ? "text-primary" : "text-foreground/80"}`}
                  >
                    <span>All Products</span>
                    <span className="text-foreground/40 text-xs">({allProducts.length})</span>
                  </button>
                </li>
                {subs.map((s) => (
                  <li key={s.slug}>
                    <button
                      type="button"
                      onClick={() => setActiveFilter(s.slug)}
                      className={`w-full flex items-center justify-between py-3 text-left text-sm ${activeFilter === s.slug ? "text-primary" : "text-foreground/80"}`}
                    >
                      <span>{s.name}</span>
                      <span className="text-foreground/40 text-xs">({s.products.length})</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <SheetFooter className="p-4 border-t border-border/60 flex-row gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                setQInput("");
                setSearchParams(new URLSearchParams(), { replace: false });
              }}
              className="flex-1 border border-border/60 px-4 py-3 text-xs uppercase tracking-[0.25em] hover:border-primary hover:text-primary"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => { setQ(qInput); setFilterOpen(false); }}
              className="flex-1 bg-primary text-primary-foreground px-4 py-3 text-xs uppercase tracking-[0.25em]"
            >
              Apply
            </button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <section className="py-10">
        <div className="container-luxe">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
            <p className="text-xs uppercase tracking-[0.3em] text-foreground/50">
              Showing {Math.min(visible, filteredSorted.length)} of {filteredSorted.length}
              {q && <span className="ml-2 normal-case tracking-normal text-foreground/70">· results for "{q}"</span>}
            </p>
            {q && (
              <button
                type="button"
                onClick={() => { setQInput(""); setQ(""); }}
                className="text-[11px] uppercase tracking-[0.25em] text-primary hover:underline"
              >
                Clear search
              </button>
            )}
          </div>

          {filteredSorted.length === 0 && (
            <div className="border border-dashed border-border/60 p-10 text-center">
              <p className="text-sm text-foreground/70">
                No {category.name.toLowerCase()} products match {q ? `"${q}"` : "these filters"}.
              </p>
              <button
                type="button"
                onClick={() => { setQInput(""); setSearchParams(new URLSearchParams(), { replace: false }); }}
                className="mt-4 inline-flex px-6 py-3 border border-border/60 hover:border-primary hover:text-primary text-[11px] uppercase tracking-[0.25em]"
              >
                Clear filters
              </button>
            </div>
          )}


          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-5">
            {renderProducts.map((p) => (
              <ProductCard
                key={p.sku}
                product={p}
                categorySlug={category.slug}
                onQuickView={() => setActiveProduct(p)}
              />
            ))}
          </div>

          {hiddenProducts.length > 0 && (
            <div className="sr-only" aria-hidden="true">
              <ul>
                {hiddenProducts.map((p) => (
                  <li key={p.sku}>
                    <a href={`/products/${category.slug}/${p.productSlug}`}>{p.name}</a> — {p.subName}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div ref={sentinelRef} className="h-12" />

          {showLoadMoreButton && (
            <div className="flex justify-center mt-6">
              <button
                type="button"
                onClick={() =>
                  setVisible((v) => Math.min(v + CHUNK, filteredSorted.length))
                }
                className="px-10 py-4 border border-primary text-primary hover:bg-primary hover:text-primary-foreground text-xs uppercase tracking-[0.3em] transition-colors"
              >
                Load More ({filteredSorted.length - visible} remaining)
              </button>
            </div>
          )}
        </div>
      </section>

      {seo.faqs.length > 0 && (
        <section className="py-20 border-y border-border/60">
          <div className="container-luxe grid lg:grid-cols-12 gap-10">
            <div className="lg:col-span-4">
              <p className="eyebrow mb-4">Buyer FAQs</p>
              <h2 className="font-display text-3xl md:text-4xl leading-tight">
                {category.name} — questions from sourcing teams
              </h2>
              <p className="mt-6 text-sm text-foreground/65 leading-relaxed">
                Direct answers from our merchandisers on MOQs, fabrics and shipping for {category.name.toLowerCase()} buyers in {seo.exportMarkets.slice(0, 3).join(", ")} and beyond.
              </p>
            </div>
            <div className="lg:col-span-8 divide-y divide-border/60 border-y border-border/60">
              {seo.faqs.map((f, i) => (
                <details key={i} className="group py-6">
                  <summary className="cursor-pointer list-none flex items-start justify-between gap-6">
                    <h3 className="font-display text-lg md:text-xl leading-snug group-open:text-primary transition-colors">{f.q}</h3>
                    <span className="text-gold mt-1 transition-transform group-open:rotate-45 text-xl leading-none">+</span>
                  </summary>
                  <p className="mt-4 text-foreground/75 leading-relaxed">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-16">
        <div className="container-luxe">
          <p className="eyebrow mb-6">Other collections</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {allCategories.filter((c) => c.slug !== category.slug).map((c) => (
              <Link
                key={c.slug}
                to={`/products/${c.slug}`}
                className="group relative aspect-[3/4] overflow-hidden border border-border/60 hover:border-primary transition-colors"
              >
                <img src={c.image} alt={c.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-background to-transparent">
                  <span className="font-display text-sm">{c.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <ProductDetailModal product={activeProduct} onClose={() => setActiveProduct(null)} />
      <CatalogFlipbook
        slug={category.slug}
        title={`${category.name} — 2026 Catalogue`}
        open={flipOpen}
        onClose={() => setFlipOpen(false)}
      />
    </>
  );
}

function FilterChip({
  label, count, active, onClick,
}: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-[11px] uppercase tracking-[0.22em] border transition-all ${
        active
          ? "border-primary text-primary bg-primary/5"
          : "border-border/60 text-foreground/65 hover:text-foreground hover:border-foreground/40"
      }`}
    >
      {label}
      <span className="ml-2 text-foreground/40 normal-case tracking-normal">({count})</span>
    </button>
  );
}

function ProductCard({
  product, categorySlug, onQuickView,
}: {
  product: FlatProduct;
  categorySlug: string;
  onQuickView: () => void;
}) {
  const primary = product.image;
  const secondary = product.gallery?.[1] ?? product.image;
  return (
    <article id={product.sku} className="group flex flex-col text-left">
      <button
        type="button"
        onClick={onQuickView}
        aria-label={`Quick view ${product.name}`}
        className="relative aspect-square overflow-hidden bg-card mb-3 w-full"
      >
        <img
          src={primary}
          alt={product.name}
          loading="lazy"
          decoding="async"
          width={750}
          height={750}
          sizes="(min-width: 1024px) 23vw, (min-width: 768px) 31vw, 48vw"
          className="absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:opacity-0"
        />
        <img
          src={secondary}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-700 group-hover:opacity-100"
        />
      </button>
      <Link
        to={`/products/${categorySlug}/${product.productSlug}`}
        className="font-display text-sm md:text-base leading-tight hover:text-primary transition-colors"
      >
        {product.name}
      </Link>
      <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/45 mt-1">
        {extractMoq(product.details)}
      </p>
    </article>
  );
}
