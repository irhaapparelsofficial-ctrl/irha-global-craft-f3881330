import { useParams, Link, Navigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import SEO from "@/components/SEO";
import { CATEGORIES, type Product } from "@/lib/categories";
import { findGroup } from "@/lib/catalog";
import { CATEGORY_SEO } from "@/lib/categorySeo";


import ProductDetailModal from "@/components/ProductDetailModal";
import CatalogFlipbook from "@/components/CatalogFlipbook";
import CatalogThumbnailStrip from "@/components/CatalogThumbnailStrip";
import CategoryHero, { type CategoryHeroSlide } from "@/components/CategoryHero";
import { ArrowUpRight, ChevronRight, Download, Eye, MessageCircle } from "lucide-react";
import { whatsappLink } from "@/lib/constants";

const SITE = "https://www.irhaapparels.com";

type SortKey = "newest" | "price" | "popular";

type FlatProduct = Product & {
  subSlug: string;
  subName: string;
  sku: string;
  // stable synthetic signals for sort
  _priceRank: number;
  _popRank: number;
  _order: number;
};

// Stable hash for synthetic sort signals (we don't store price/popularity)
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const INITIAL_VISIBLE = 200;
const CHUNK = 200;
const LOAD_MORE_THRESHOLD = 250;

export default function CategoryPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const category = CATEGORIES.find((c) => c.slug === slug);
  const seo = CATEGORY_SEO[slug];
  const group = findGroup(slug);
  const subs = group?.subs ?? [];
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [visible, setVisible] = useState(INITIAL_VISIBLE);
  const [activeProduct, setActiveProduct] = useState<FlatProduct | null>(null);
  const [flipOpen, setFlipOpen] = useState(false);
  const [peekOpen, setPeekOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Flatten all sub products into one list with metadata + stable sort signals.
  const allProducts: FlatProduct[] = useMemo(() => {
    const out: FlatProduct[] = [];
    let order = 0;
    subs.forEach((sub) => {
      sub.products.forEach((p) => {
        const sku = `IRH-${slug.slice(0, 3).toUpperCase()}-${String(order + 1).padStart(4, "0")}`;
        out.push({
          ...p,
          subSlug: sub.slug,
          subName: sub.name,
          sku,
          _priceRank: hash(p.name + ":price") % 10000,
          _popRank: hash(p.name + ":pop") % 10000,
          _order: order++,
        });
      });
    });
    return out;
  }, [subs, slug]);

  // Filter + sort
  const filteredSorted = useMemo(() => {
    const filtered =
      activeFilter === "all"
        ? allProducts
        : allProducts.filter((p) => p.subSlug === activeFilter);
    const sorted = [...filtered];
    if (sort === "newest") sorted.sort((a, b) => b._order - a._order);
    else if (sort === "price") sorted.sort((a, b) => a._priceRank - b._priceRank);
    else if (sort === "popular") sorted.sort((a, b) => b._popRank - a._popRank);
    return sorted;
  }, [allProducts, activeFilter, sort]);

  // Reset visible window when filter/sort changes.
  useEffect(() => {
    setVisible(INITIAL_VISIBLE);
  }, [activeFilter, sort]);

  // Auto-extend on scroll until we reach LOAD_MORE_THRESHOLD; beyond that
  // the user must click "Load More" so the page stays manageable.
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

  if (!category || !seo) {
    return <Navigate to="/products" replace />;
  }

  const totalProducts = allProducts.length;
  const url = `${SITE}/products/${category.slug}`;

  // Build slideshow: category banner + first product images per sub
  const heroSlides: CategoryHeroSlide[] = [
    {
      image: category.image,
      eyebrow: "Irha Apparels · B2B Manufacturing",
      title: `Wholesale ${category.name} Manufacturer`,
      subtitle: seo.intro,
    },
    ...subs.slice(0, 4).map((sub) => ({
      image: sub.products[0]?.image ?? category.image,
      eyebrow: category.name,
      title: `${sub.name} — Bulk & Private Label`,
      subtitle: sub.short,
    })),
  ].slice(0, 5);

  const jsonLd = [
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
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: seo.faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];

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

      {/* Slideshow hero */}
      <div className="pt-28">
        <CategoryHero slides={heroSlides} />
      </div>

      {/* Page intro / breadcrumb strip */}
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
            <a
              href={`/catalogs/${category.slug}-catalog.pdf`}
              download
              className="inline-flex items-center gap-3 border border-border/60 hover:border-primary hover:text-primary px-7 py-4 text-xs uppercase tracking-[0.3em] transition-colors"
            >
              <Download size={14} /> Download PDF
            </a>
            <span className="text-xs uppercase tracking-[0.3em] text-foreground/55 ml-2">
              {totalProducts} styles · MOQ 50 · Exports {seo.exportMarkets.slice(0, 3).join(", ")}
            </span>
          </div>

          {/* Catalog page thumbnails — collapsed by default, hover (desktop) or tap (mobile) to reveal */}
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

      {/* Sticky filter + sort bar */}
      <div className="sticky top-[72px] z-30 bg-background/95 backdrop-blur border-b border-border/60">
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
          <label className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-foreground/60">
            Sort
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="bg-transparent border border-border/60 px-3 py-2 text-xs uppercase tracking-[0.2em] focus:outline-none focus:border-primary"
            >
              <option value="newest">Newest</option>
              <option value="popular">Popular</option>
              <option value="price">Price</option>
            </select>
          </label>
        </div>
      </div>

      {/* Product grid — all on one page, lazy streamed */}
      <section className="py-10">
        <div className="container-luxe">
          <p className="text-xs uppercase tracking-[0.3em] text-foreground/50 mb-6">
            Showing {Math.min(visible, filteredSorted.length)} of {filteredSorted.length}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-5">
            {renderProducts.map((p) => (
              <ProductCard
                key={p.sku}
                product={p}
                onQuickView={() => setActiveProduct(p)}
              />
            ))}
          </div>

          {/* SEO: render the rest in a hidden block so Googlebot still sees every product */}
          {hiddenProducts.length > 0 && (
            <div className="sr-only" aria-hidden="true">
              <ul>
                {hiddenProducts.map((p) => (
                  <li key={p.sku}>
                    <a href={`/products/${slug}#${p.sku}`}>{p.name}</a> — {p.subName} — {p.sku}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Sentinel for IntersectionObserver-based streaming */}
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

      {/* FAQ */}
      <section className="py-20 border-y border-border/60">
        <div className="container-luxe grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4">
            <p className="eyebrow mb-4">Buyer FAQs</p>
            <h2 className="font-display text-3xl md:text-4xl leading-tight">
              {category.name} — questions from sourcing teams
            </h2>
            <p className="mt-6 text-sm text-foreground/65 leading-relaxed">
              Direct answers from our merchandisers on MOQs, fabrics, certifications and shipping for {category.name.toLowerCase()} buyers in {seo.exportMarkets.slice(0, 3).join(", ")} and beyond.
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

      {/* Cross-link other categories */}
      <section className="py-16">
        <div className="container-luxe">
          <p className="eyebrow mb-6">Other collections</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {CATEGORIES.filter((c) => c.slug !== category.slug).map((c) => (
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
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
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
  product,
  onQuickView,
}: {
  product: FlatProduct;
  onQuickView: () => void;
}) {
  const primary = product.image;
  const secondary = product.gallery?.[1] ?? product.image;
  return (
    <article
      id={product.sku}
      className="group flex flex-col text-left"
    >
      <button
        type="button"
        onClick={onQuickView}
        aria-label={`Quick view ${product.name}`}
        className="relative aspect-square overflow-hidden bg-card mb-3 w-full"
      >
        {/* Primary image */}
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
        {/* Secondary image revealed on hover (zoomed) */}
        <img
          src={secondary}
          alt=""
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          width={750}
          height={750}
          sizes="(min-width: 1024px) 23vw, (min-width: 768px) 31vw, 48vw"
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover scale-110 opacity-0 transition-all duration-700 group-hover:opacity-100 group-hover:scale-100"
        />

        {/* Hover overlay: SKU + Quick View */}
        <div className="absolute inset-x-0 bottom-0 p-3 flex items-end justify-between gap-2 bg-gradient-to-t from-background/90 via-background/40 to-transparent opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-500">
          <span className="text-[9px] uppercase tracking-[0.25em] text-foreground/80">
            SKU {product.sku}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] bg-primary text-primary-foreground px-3 py-1.5">
            <Eye size={12} /> Quick View
          </span>
        </div>
      </button>
      <h3 className="font-display text-sm md:text-base leading-tight line-clamp-2 group-hover:text-primary transition-colors">
        {product.name}
      </h3>
      <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/45 mt-1.5">
        {product.subName} · MOQ 50
      </p>
    </article>
  );
}
