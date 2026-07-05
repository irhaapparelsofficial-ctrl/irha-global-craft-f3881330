import SEO from "@/components/SEO";
import type { Product } from "@/lib/categories";
import { Link } from "react-router-dom";
import { ArrowUpRight, Bookmark, Download, Maximize2, MessageCircle, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import ProductDetailModal from "@/components/ProductDetailModal";
import CatalogFlipbook from "@/components/CatalogFlipbook";
import flatlay from "@/assets/banners/products-flatlay.jpg";
import { whatsappLink } from "@/lib/constants";
import { usePublicCategories, type NormalizedCategory, type NormalizedProduct } from "@/hooks/usePublicCategoryData";
import { useShortlist } from "@/lib/shortlist";

function extractMoq(details: Product["details"] | undefined): string {
  const row = details?.find((d) => /moq/i.test(d.label));
  if (!row?.value) return "MOQ on request";
  return `MOQ ${row.value.split(/[,/]/)[0].trim()}`;
}

type SearchHit = {
  categorySlug: string;
  categoryName: string;
  subName: string;
  product: NormalizedProduct;
};

export default function Products() {
  const { categories: CATEGORIES } = usePublicCategories();
  const [previewCat, setPreviewCat] = useState<NormalizedCategory | null>(null);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [activeSub, setActiveSub] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const shortlist = useShortlist();
  const shortlistRfqLink = shortlist.items.length
    ? `/inquiry?shortlist=${encodeURIComponent(shortlist.items.map((i) => i.slug).join(","))}&names=${encodeURIComponent(shortlist.items.map((i) => i.name).join(","))}`
    : "/inquiry";

  const totalStyles = CATEGORIES.reduce((n, c) => n + c.productCount, 0);
  const categoryCount = CATEGORIES.length;

  const searchHits = useMemo<SearchHit[]>(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const hits: SearchHit[] = [];
    for (const c of CATEGORIES) {
      for (const s of c.subs) {
        for (const p of s.products) {
          const hay = `${p.name} ${s.name} ${c.name} ${p.description ?? ""}`.toLowerCase();
          if (hay.includes(q)) {
            hits.push({ categorySlug: c.slug, categoryName: c.name, subName: s.name, product: p });
          }
        }
      }
    }
    return hits.slice(0, 40);
  }, [CATEGORIES, query]);


  return (
    <>
      <SEO
        title="Apparel Collections — Five Specialist Categories | Irha Apparels"
        description="Five specialist apparel programs from our Sialkot atelier: Bavarian & trachten, premium leather, sportswear, streetwear & activewear, leisure & nightwear. OEM, ODM and private-label."
        path="/products"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Apparel Collections — Irha Apparels",
          url: "https://www.irhaapparels.com/products",
          description:
            "Five specialist apparel programs produced in Sialkot: Bavarian & Trachten, Premium Leather, Sportswear, Streetwear & Activewear, and Leisure & Nightwear. OEM, ODM and private-label programs.",
          isPartOf: { "@type": "WebSite", name: "Irha Apparels", url: "https://www.irhaapparels.com/" },
          hasPart: CATEGORIES.map((c) => ({
            "@type": "CollectionPage",
            name: c.name,
            url: `https://www.irhaapparels.com/products/${c.slug}`,
          })),
        }}
      />

      <section className="relative pt-40 pb-20 border-b border-border/60 overflow-hidden">
        <img src={flatlay} alt="" loading="eager" className="absolute inset-0 w-full h-full object-cover opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/60 to-background" />
        <div className="container-luxe relative">
          <p className="eyebrow mb-6">The Collections</p>
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl leading-[0.95] max-w-5xl">
            {categoryCount || "Five"} specialist <br />
            <span className="text-gold italic">categories</span>.
          </h1>
          <p className="mt-10 text-lg text-foreground/70 max-w-2xl">
            {totalStyles > 0
              ? `${totalStyles} live styles and growing — every collection below is produced in-house at our Sialkot atelier. `
              : "Every collection below is produced in-house at our Sialkot atelier. "}
            OEM, ODM and private-label programs available across every product.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="/catalogs/master-catalogue-2026.pdf"
              download
              className="inline-flex items-center gap-3 bg-primary text-primary-foreground hover:bg-primary/90 px-7 py-4 text-xs uppercase tracking-[0.3em] transition-colors"
            >
              <Download size={14} /> Master Catalogue 2026 (PDF)
            </a>
            <a
              href={whatsappLink("Hello Irha Apparels — please send the latest master catalogue and quote.")}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-3 border border-border/60 hover:border-primary hover:text-primary px-7 py-4 text-xs uppercase tracking-[0.3em] transition-colors"
            >
              <MessageCircle size={16} /> Request a Quote
            </a>
          </div>
        </div>
      </section>

      {shortlist.items.length > 0 && (
        <div className="sticky top-16 z-30 border-b border-primary/30 bg-primary/10 backdrop-blur">
          <div className="container-luxe flex flex-wrap items-center justify-between gap-3 py-3">
            <p className="text-xs uppercase tracking-[0.25em] text-foreground/80 inline-flex items-center gap-2">
              <Bookmark size={14} className="text-primary" />
              {shortlist.items.length} saved product{shortlist.items.length === 1 ? "" : "s"}
            </p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={shortlist.clear} className="text-[11px] uppercase tracking-[0.25em] text-foreground/60 hover:text-foreground">Clear</button>
              <Link to={shortlistRfqLink} className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 text-[11px] uppercase tracking-[0.25em]">
                Request Quote <ArrowUpRight size={12} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Catalog search — lightweight, client-side over the loaded tree. */}
      <section className="py-10 border-b border-border/60">
        <div className="container-luxe">
      <section className="py-10 border-b border-border/60">
        <div className="container-luxe">
          <label className="block">
            <span className="eyebrow mb-3 block">Search the catalog</span>
            <div className="relative max-w-2xl">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/50" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products, categories, or SKU…"
                aria-label="Search products"
                className="w-full pl-11 pr-11 py-3.5 bg-card/40 border border-border/60 focus:border-primary outline-none text-sm"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-foreground/50 hover:text-primary"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </label>

          {query.trim().length >= 2 && (
            <div className="mt-6">
              {searchHits.length === 0 ? (
                <p className="text-sm text-foreground/60">
                  No products match “{query.trim()}”. Try a different keyword or{" "}
                  <a href={whatsappLink(`Hello Irha Apparels — I'm looking for "${query.trim()}". Can you help?`)} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    ask us on WhatsApp
                  </a>
                  .
                </p>
              ) : (
                <>
                  <p className="text-xs uppercase tracking-[0.25em] text-foreground/50 mb-4">
                    {searchHits.length} result{searchHits.length === 1 ? "" : "s"} for “{query.trim()}”
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                    {searchHits.map((h) => (
                      <Link
                        key={`${h.categorySlug}-${h.product.slug}`}
                        to={`/products/${h.categorySlug}/${h.product.slug}`}
                        className="group flex flex-col text-left"
                      >
                        <div className="relative aspect-[3/4] overflow-hidden bg-card mb-3">
                          <img
                            src={h.product.image}
                            alt={h.product.name}
                            loading="lazy"
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] group-hover:scale-105"
                          />
                        </div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/50">{h.categoryName} · {h.subName}</p>
                        <h4 className="font-display text-base leading-tight group-hover:text-primary transition-colors mt-1">
                          {h.product.name}
                        </h4>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="py-20">
        <div className="container-luxe space-y-32">
          {CATEGORIES.map((c, i) => {
            const reverse = i % 2 === 1;
            const subs = c.subs;
            const currentSubSlug = activeSub[c.slug] || subs[0]?.slug;
            const currentSub = subs.find((s) => s.slug === currentSubSlug) ?? subs[0];
            const totalProducts = c.productCount;

            return (
              <article key={c.slug} id={c.slug} className="scroll-mt-32">
                <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
                  <div className={`lg:col-span-7 ${reverse ? "lg:order-2" : ""}`}>
                    <div className="relative aspect-[4/5] overflow-hidden group">
                      <img
                        src={c.image}
                        alt={c.name}
                        loading="lazy"
                        width={1024}
                        height={1280}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1400ms] group-hover:scale-105"
                      />
                    </div>
                  </div>
                  <div className={`lg:col-span-5 ${reverse ? "lg:order-1" : ""}`}>
                    <p className="font-display text-7xl text-gold/30">0{i + 1}</p>
                    <p className="eyebrow mt-2 mb-4">{c.short}</p>
                    <h2 className="font-display text-4xl md:text-5xl leading-[1.05]">
                      <Link to={`/products/${c.slug}`} className="hover:text-primary transition-colors">
                        {c.name}
                      </Link>
                    </h2>
                    <p className="text-foreground/75 mt-6 leading-relaxed">{c.description}</p>
                    <ul className="mt-8 space-y-3">
                      {c.details.map((d) => (
                        <li key={d} className="flex items-start gap-3 text-sm text-foreground/80">
                          <span className="text-primary mt-1">✦</span> {d}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-8 text-xs uppercase tracking-[0.3em] text-foreground/50">
                      {subs.length} sub-categories · {totalProducts} styles · Flexible MOQ by product
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3">
                      <Link
                        to={`/products/${c.slug}`}
                        className="inline-flex items-center gap-3 bg-primary text-primary-foreground hover:bg-primary/90 px-7 py-4 text-xs uppercase tracking-[0.3em] transition-all"
                      >
                        View {c.name} <ArrowUpRight size={16} />
                      </Link>
                      <a
                        href={whatsappLink(`Hello Irha Apparels — I'd like a quote for ${c.name}.`)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-3 border border-gold/70 text-gold hover:bg-gold hover:text-background px-7 py-4 text-xs uppercase tracking-[0.3em] transition-all"
                      >
                        <MessageCircle size={16} /> Request a Quote
                      </a>
                    </div>
                  </div>
                </div>

                {subs.length > 0 && currentSub && (
                  <div className="mt-20">
                    <div className="flex items-end justify-between mb-8 border-b border-border/60 pb-6 flex-wrap gap-4">
                      <div>
                        <p className="eyebrow mb-2">Browse {c.name}</p>
                        <h3 className="font-display text-2xl md:text-3xl">Sub-categories</h3>
                      </div>
                      <p className="text-xs uppercase tracking-[0.3em] text-foreground/50">
                        {currentSub.products.length} styles in {currentSub.name}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-10">
                      {subs.map((s) => (
                        <button
                          key={s.slug}
                          type="button"
                          onClick={() => setActiveSub((prev) => ({ ...prev, [c.slug]: s.slug }))}
                          className={`px-4 py-2.5 text-[11px] uppercase tracking-[0.22em] border transition-all ${
                            currentSubSlug === s.slug
                              ? "border-primary text-primary bg-primary/5"
                              : "border-border/60 text-foreground/65 hover:text-foreground hover:border-foreground/40"
                          }`}
                        >
                          {s.name}
                          <span className="ml-2 text-foreground/40 normal-case tracking-normal">
                            ({s.products.length})
                          </span>
                        </button>
                      ))}
                    </div>

                    <p className="text-sm text-foreground/65 mb-8 max-w-2xl">{currentSub.short}</p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 lg:gap-7">
                      {currentSub.products.map((p) => (
                        <button
                          key={p.slug}
                          type="button"
                          onClick={() => setActiveProduct(p)}
                          className="group flex flex-col text-left"
                          aria-label={`View ${p.name} details`}
                        >
                          <div className="relative aspect-[3/4] overflow-hidden bg-card mb-3">
                            <img
                              src={p.image}
                              alt={p.name}
                              loading="lazy"
                              className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-background/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-500">
                              <span className="text-[9px] uppercase tracking-[0.3em] text-gold">Details</span>
                              <Maximize2 size={12} className="text-gold" />
                            </div>
                          </div>
                          <h4 className="font-display text-base leading-tight group-hover:text-primary transition-colors">
                            {p.name}
                          </h4>
                          <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/45 mt-2">
                            {extractMoq(p.details)}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {previewCat && (
        <CatalogFlipbook
          slug={previewCat.slug}
          title={`${previewCat.name} — 2026 Catalogue`}
          open={!!previewCat}
          onClose={() => setPreviewCat(null)}
          action={
            <a
              href={whatsappLink(`Hello Irha Apparels — I'd like a quote for the ${previewCat.name} catalog.`)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 border border-gold/70 text-gold hover:bg-gold hover:text-background px-4 py-2.5 text-[10px] uppercase tracking-[0.3em] transition-colors"
            >
              <MessageCircle size={13} /> Request Quote
            </a>
          }
        />
      )}

      <ProductDetailModal product={activeProduct} onClose={() => setActiveProduct(null)} />
    </>
  );
}
