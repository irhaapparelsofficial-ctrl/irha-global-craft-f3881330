import SEO from "@/components/SEO";
import { CATEGORIES, type Category, type Product } from "@/lib/categories";
import { CATALOG, findGroup } from "@/lib/catalog";
import { Link } from "react-router-dom";
import { ArrowUpRight, Download, Eye, Maximize2, MessageCircle } from "lucide-react";
import { useState } from "react";
import ProductDetailModal from "@/components/ProductDetailModal";
import CatalogFlipbook from "@/components/CatalogFlipbook";
import flatlay from "@/assets/banners/products-flatlay.jpg";
import { FEATURED_PRODUCTS } from "@/lib/featuredProducts";

import { whatsappLink, BRAND } from "@/lib/constants";




export default function Products() {
  const [previewCat, setPreviewCat] = useState<Category | null>(null);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [activeSub, setActiveSub] = useState<Record<string, string>>({});

  return (
    <>
      <SEO
        title="Apparel Collections — 600+ Styles | Irha Apparels"
        description="Premium apparel by Irha Apparels: Bavarian, sportswear, leather, streetwear, leisure & nightwear. 600+ styles. OEM, ODM and private-label programs."
        path="/products"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Apparel Collections — Irha Apparels",
          url: "https://www.irhaapparels.com/products",
          description:
            "Six apparel categories produced in Sialkot: Bavarian, sportswear, leather, streetwear, leisurewear and nightwear. OEM, ODM and private-label programs.",
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
            Six categories. <br />
            600+ <span className="text-gold italic">styles</span>.
          </h1>
          <p className="mt-10 text-lg text-foreground/70 max-w-2xl">
            Every collection below is produced in-house at our Sialkot atelier. Click any sub-category
            to browse the full range — OEM, ODM and private-label programs available across every product.
          </p>

        </div>
      </section>

      {/* Featured B2B Items — direct, click-through SKUs with explicit MOQ */}
      <section className="py-20 border-b border-border/60 bg-card/20">
        <div className="container-luxe">
          <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
            <div>
              <p className="eyebrow mb-3">Featured B2B Items</p>
              <h2 className="font-display text-3xl md:text-4xl leading-tight">
                Direct from factory — clickable SKUs
              </h2>
            </div>
            <p className="text-xs uppercase tracking-[0.3em] text-foreground/50 max-w-sm">
              Each card links to its full spec sheet. MOQ, lead time and material visible up-front.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-7">
            {FEATURED_PRODUCTS.map((p) => (
              <Link
                key={p.sku}
                to={`/products/${p.categorySlug}/${p.productSlug}`}
                className="group flex flex-col text-left border border-border/60 bg-background hover:border-primary/60 transition-colors"
                aria-label={`View ${p.title} (${p.sku})`}
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-card">
                  <img
                    src={p.image}
                    alt={p.title}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] group-hover:scale-105"
                  />
                  <span className="absolute top-3 left-3 bg-background/90 backdrop-blur px-2.5 py-1 text-[9px] font-mono uppercase tracking-[0.2em] text-foreground/80 border border-border/60">
                    {p.sku}
                  </span>
                  <span className="absolute top-3 right-3 bg-primary text-primary-foreground px-2.5 py-1 text-[9px] uppercase tracking-[0.2em] font-bold">
                    {p.badge}
                  </span>
                </div>
                <div className="p-4 flex flex-col gap-3 flex-1">
                  <h3 className="font-display text-base leading-tight group-hover:text-primary transition-colors">
                    {p.title}
                  </h3>
                  <p className="text-xs text-foreground/65 leading-relaxed line-clamp-3">
                    {p.description}
                  </p>
                  <div className="mt-auto pt-3 border-t border-border/40 grid grid-cols-2 gap-2 text-[10px] font-mono uppercase tracking-[0.15em]">
                    <div>
                      <p className="text-foreground/45">MOQ</p>
                      <p className="text-foreground/90">{p.moq.replace(/^MOQ:\s*/, "")}</p>
                    </div>
                    <div>
                      <p className="text-foreground/45">Lead Time</p>
                      <p className="text-foreground/90">{p.leadTime}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] text-primary font-bold pt-1">
                    View spec sheet <ArrowUpRight size={12} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>


      <section className="py-20">
        <div className="container-luxe space-y-32">
          {CATEGORIES.map((c, i) => {
            const reverse = i % 2 === 1;
            const group = findGroup(c.slug);
            const subs = group?.subs ?? [];
            const currentSubSlug = activeSub[c.slug] || subs[0]?.slug;
            const currentSub = subs.find((s) => s.slug === currentSubSlug) ?? subs[0];
            const totalProducts = subs.reduce((n, s) => n + s.products.length, 0);

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
                      {subs.length} sub-categories · {totalProducts} styles
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

                {/* Sub-category tabs */}
                {subs.length > 0 && currentSub && (
                  <div className="mt-20">
                    <div className="flex items-end justify-between mb-8 border-b border-border/60 pb-6 flex-wrap gap-4">
                      <div>
                        <p className="eyebrow mb-2">Browse {c.name}</p>
                        <h3 className="font-display text-2xl md:text-3xl">
                          Sub-categories
                        </h3>
                      </div>
                      <p className="text-xs uppercase tracking-[0.3em] text-foreground/50">
                        {currentSub.products.length} styles in {currentSub.name}
                      </p>
                    </div>

                    {/* Sub tabs */}
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

                    {/* Products grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 lg:gap-7">
                      {currentSub.products.map((p) => (
                        <button
                          key={p.name}
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
                            MOQ {p.details.find((d) => d.label === "MOQ")?.value.split(/[,/]/)[0] || "—"}
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
