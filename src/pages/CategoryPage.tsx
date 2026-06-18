import { useParams, Link, Navigate } from "react-router-dom";
import { useState } from "react";
import SEO from "@/components/SEO";
import { CATEGORIES, type Product } from "@/lib/categories";
import { findGroup } from "@/lib/catalog";
import { CATEGORY_SEO } from "@/lib/categorySeo";
import { forceDownload } from "@/lib/download";
import ProductDetailModal from "@/components/ProductDetailModal";
import { ArrowUpRight, Download, Maximize2, ChevronRight } from "lucide-react";

const SITE = "https://www.irhaapparels.com";

export default function CategoryPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const category = CATEGORIES.find((c) => c.slug === slug);
  const seo = CATEGORY_SEO[slug];
  const group = findGroup(slug);
  const subs = group?.subs ?? [];
  const [activeSubSlug, setActiveSubSlug] = useState<string>(subs[0]?.slug ?? "");
  const [activeProduct, setActiveProduct] = useState<any>(null);

  if (!category || !seo) {
    return <Navigate to="/products" replace />;
  }

  const currentSub = subs.find((s) => s.slug === activeSubSlug) ?? subs[0];
  const totalProducts = subs.reduce((n, s) => n + s.products.length, 0);
  const url = `${SITE}/products/${category.slug}`;

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

  return (
    <>
      <SEO
        title={seo.title}
        description={seo.description}
        path={`/products/${category.slug}`}
        image={category.image}
        jsonLd={jsonLd}
      />

      {/* Hero */}
      <section className="relative pt-40 pb-16 border-b border-border/60 overflow-hidden">
        <img src={category.image} alt="" loading="eager" className="absolute inset-0 w-full h-full object-cover opacity-15" />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/70 to-background" />
        <div className="container-luxe relative">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-foreground/55 mb-6">
            <Link to="/" className="hover:text-foreground">Home</Link>
            <ChevronRight size={12} />
            <Link to="/products" className="hover:text-foreground">Collections</Link>
            <ChevronRight size={12} />
            <span className="text-foreground/80">{category.name}</span>
          </nav>
          <p className="eyebrow mb-4">{category.short}</p>
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl leading-[0.95] max-w-4xl">
            {seo.h1}
          </h1>
          <p className="mt-8 text-lg text-foreground/75 max-w-3xl leading-relaxed">{seo.intro}</p>

          <div className="mt-10 flex flex-wrap gap-3 items-center">
            <Link
              to="/inquiry"
              className="inline-flex items-center gap-3 bg-primary text-primary-foreground hover:bg-primary/90 px-7 py-4 text-xs uppercase tracking-[0.3em] transition-colors"
            >
              Request a Quote <ArrowUpRight size={16} />
            </Link>
            <button
              type="button"
              onClick={() => forceDownload(category.catalog, `Irha-${category.slug}-catalog.pdf`)}
              className="inline-flex items-center gap-3 border border-border/60 hover:border-primary hover:text-primary px-7 py-4 text-xs uppercase tracking-[0.3em] transition-colors"
            >
              <Download size={14} /> Download Catalog
            </button>
          </div>

          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-xs uppercase tracking-[0.25em] text-foreground/60">
            <span>{subs.length} sub-categories</span>
            <span className="text-foreground/30">·</span>
            <span>{totalProducts} styles</span>
            <span className="text-foreground/30">·</span>
            <span>MOQ 50</span>
            <span className="text-foreground/30">·</span>
            <span>Exports: {seo.exportMarkets.join(", ")}</span>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="py-16 border-b border-border/60">
        <div className="container-luxe grid lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-5">
            <p className="eyebrow mb-4">What we make</p>
            <h2 className="font-display text-3xl md:text-4xl leading-tight">{category.name} programs, built for export</h2>
          </div>
          <div className="lg:col-span-7">
            <p className="text-foreground/75 leading-relaxed">{category.description}</p>
            <ul className="mt-8 grid sm:grid-cols-2 gap-x-8 gap-y-3">
              {category.details.map((d) => (
                <li key={d} className="flex items-start gap-3 text-sm text-foreground/80">
                  <span className="text-primary mt-1">✦</span> {d}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Sub-categories & products */}
      {currentSub && (
        <section className="py-20 border-b border-border/60">
          <div className="container-luxe">
            <div className="flex items-end justify-between mb-8 border-b border-border/60 pb-6 flex-wrap gap-4">
              <div>
                <p className="eyebrow mb-2">Browse {category.name}</p>
                <h2 className="font-display text-2xl md:text-3xl">Sub-categories</h2>
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
                  onClick={() => setActiveSubSlug(s.slug)}
                  className={`px-4 py-2.5 text-[11px] uppercase tracking-[0.22em] border transition-all ${
                    activeSubSlug === s.slug
                      ? "border-primary text-primary bg-primary/5"
                      : "border-border/60 text-foreground/65 hover:text-foreground hover:border-foreground/40"
                  }`}
                >
                  {s.name}
                  <span className="ml-2 text-foreground/40 normal-case tracking-normal">({s.products.length})</span>
                </button>
              ))}
            </div>

            <p className="text-sm text-foreground/65 mb-8 max-w-2xl">{currentSub.short}</p>

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
                  <h3 className="font-display text-base leading-tight group-hover:text-primary transition-colors">{p.name}</h3>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/45 mt-2">MOQ 50</p>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="py-20 border-b border-border/60">
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
    </>
  );
}
