import SEO from "@/components/SEO";
import HeroMediaSlideshow from "@/components/HeroMediaSlideshow";
import { useNormalizedCategory } from "@/hooks/usePublicCategoryData";
import {
  BAVARIAN_MENS_COLLECTIONS,
  getBavarianMensCollection,
} from "@/lib/bavarianMensCollections";
import { whatsappLink } from "@/lib/constants";
import { ArrowUpRight, ChevronRight, MessageCircle, Video } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";

const SITE = "https://irhaapparels.com";
const TOP_CATEGORY = "bavarian-trachten-wear";

export default function BavarianMensCollection() {
  const { collectionSlug = "" } = useParams<{ collectionSlug: string }>();
  const collection = getBavarianMensCollection(collectionSlug);
  const { category, isLoading } = useNormalizedCategory(TOP_CATEGORY);

  if (!collection) return <Navigate to={`/products/${TOP_CATEGORY}`} replace />;
  if (isLoading && !category) {
    return <div className="pt-40 pb-24 container-luxe text-sm text-foreground/60">Loading collection…</div>;
  }
  if (!category) return <Navigate to={`/products/${TOP_CATEGORY}`} replace />;

  const deduped = new Map<string, (typeof category.subs)[number]["products"][number]>();
  for (const sub of category.subs) {
    for (const product of sub.products) {
      if (collection.matches(product.slug, product.name) && !deduped.has(product.slug)) {
        deduped.set(product.slug, product);
      }
    }
  }
  const products = Array.from(deduped.values());
  const heroSlides = [
    {
      src: collection.hero,
      alt: `Digital catalogue reference for ${collection.name}; not production proof`,
      fit: "cover" as const,
    },
    ...products.slice(0, 5).map((product) => ({
      src: product.originalImage ?? product.gallery?.[0] ?? product.image,
      alt: `Digital catalogue reference for ${product.name}; not production proof`,
      fit: "contain" as const,
      backgroundClassName: "bg-[#f4f0e7]",
    })),
  ].filter((slide, index, items) => items.findIndex((item) => item.src === slide.src) === index);
  const path = `/products/${TOP_CATEGORY}/mens-trachten/${collection.slug}`;
  const absoluteUrl = `${SITE}${path}`;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: collection.title,
      url: absoluteUrl,
      description: collection.seoDescription,
      isPartOf: {
        "@type": "CollectionPage",
        name: "Bavarian Trachten Wear",
        url: `${SITE}/products/${TOP_CATEGORY}`,
      },
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: products.length,
        itemListElement: products.map((product, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: product.name,
          url: `${SITE}/products/${TOP_CATEGORY}/${product.slug}`,
        })),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
        { "@type": "ListItem", position: 2, name: "Collections", item: `${SITE}/products` },
        {
          "@type": "ListItem",
          position: 3,
          name: "Bavarian Trachten Wear",
          item: `${SITE}/products/${TOP_CATEGORY}`,
        },
        {
          "@type": "ListItem",
          position: 4,
          name: collection.name,
          item: absoluteUrl,
        },
      ],
    },
  ];

  return (
    <>
      <SEO
        title={collection.seoTitle}
        description={collection.seoDescription}
        path={path}
        image={collection.hero}
        jsonLd={jsonLd}
      />

      <section className="relative min-h-[520px] pt-32 flex items-end overflow-hidden border-b border-border/60 bg-card">
        <HeroMediaSlideshow
          slides={heroSlides}
          label={`${collection.name} slideshow`}
          controlsClassName="bottom-5 right-5"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/85 via-black/65 to-black/25" />
        <div className="container-luxe relative z-10 pb-16 md:pb-20 text-white">
          <nav aria-label="Breadcrumb" className="mb-7 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-white/65">
            <Link to="/">Home</Link>
            <ChevronRight size={11} />
            <Link to="/products">Collections</Link>
            <ChevronRight size={11} />
            <Link to={`/products/${TOP_CATEGORY}`}>Bavarian Trachten</Link>
            <ChevronRight size={11} />
            <span className="text-white">{collection.name}</span>
          </nav>
          <p className="mb-4 inline-flex border border-gold/60 bg-black/70 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-gold">Digital catalogue reference · not production proof</p>
          <p className="eyebrow text-gold mb-4">{collection.eyebrow}</p>
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl leading-[0.98] max-w-5xl">
            {collection.title}
          </h1>
          <p className="mt-7 max-w-3xl text-sm md:text-base leading-relaxed text-white/80">
            {collection.description}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to={`/inquiry?intent=rfq&category=${encodeURIComponent(collection.name)}`}
              className="inline-flex items-center gap-3 bg-primary px-7 py-4 text-xs uppercase tracking-[0.28em] text-primary-foreground hover:bg-primary/90"
            >
              Request a Quote <ArrowUpRight size={15} />
            </Link>
            <a
              href={whatsappLink(`Hello Irha Apparels — I need a wholesale quote for ${collection.name}.`)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-3 border border-white/45 px-7 py-4 text-xs uppercase tracking-[0.28em] text-white hover:border-gold hover:text-gold"
            >
              <MessageCircle size={15} /> WhatsApp
            </a>
          </div>
        </div>
      </section>

      <nav aria-label="Men's Trachten collections" className="border-b border-border/60 bg-background">
        <div className="container-luxe flex gap-2 overflow-x-auto py-4 scrollbar-none">
          {BAVARIAN_MENS_COLLECTIONS.map((item) => (
            <Link
              key={item.slug}
              to={`/products/${TOP_CATEGORY}/mens-trachten/${item.slug}`}
              aria-current={item.slug === collection.slug ? "page" : undefined}
              className={`whitespace-nowrap border px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] transition-colors ${
                item.slug === collection.slug
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border/60 text-foreground/65 hover:border-primary hover:text-primary"
              }`}
            >
              {item.shortName}
            </Link>
          ))}
        </div>
      </nav>

      <section className="py-16 md:py-20">
        <div className="container-luxe">
          <div className="mb-9 flex flex-wrap items-end justify-between gap-4 border-b border-border/60 pb-6">
            <div>
              <p className="eyebrow mb-2">Digital Catalogue References</p>
              <h2 className="font-display text-3xl md:text-4xl">{collection.name} product styles</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-foreground/65">These visuals communicate design direction only. They are not photographs of completed production or factory proof.</p>
            </div>
            <p className="text-xs uppercase tracking-[0.25em] text-foreground/50">
              {products.length} distinct style{products.length === 1 ? "" : "s"}
            </p>
          </div>

          {products.length === 0 ? (
            <div className="border border-dashed border-border/60 p-10 text-center">
              <p className="text-sm text-foreground/70">
                Genuine sample and factory media are pending. Send the exact specification for a requirement-led sourcing review.
              </p>
              <Link to="/inquiry?intent=rfq" className="mt-5 inline-flex text-xs uppercase tracking-[0.25em] text-primary hover:underline">
                Send product requirements
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6">
              {products.map((product) => (
                <Link
                  key={product.slug}
                  to={`/products/${TOP_CATEGORY}/${product.slug}`}
                  className="group flex flex-col"
                >
                  <div className="relative aspect-[3/4] overflow-hidden border border-border/50 bg-card">
                    <img
                      src={product.image}
                      alt={`Digital catalogue reference for ${product.name}; not production proof`}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                  </div>
                  <p className="mt-4 text-[10px] uppercase tracking-[0.22em] text-foreground/45">Digital reference · not production proof</p>
                  <h3 className="mt-1 font-display text-base leading-tight transition-colors group-hover:text-primary md:text-lg">
                    {product.name}
                  </h3>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="border-y border-border/60 bg-card/35 py-14">
        <div className="container-luxe grid gap-8 md:grid-cols-3 md:items-center">
          <div className="md:col-span-2">
            <p className="eyebrow mb-3">Buyer Verification</p>
            <h2 className="font-display text-3xl md:text-4xl">Verify the exact manufacturing program before commitment.</h2>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-foreground/70">
              Share the product scope, construction, quantity and verification questions first. An appointment-based live factory call may then be requested, subject to availability and viewing scope.
            </p>
          </div>
          <Link
            to="/factory-video-call"
            className="inline-flex items-center justify-center gap-3 border border-primary px-6 py-4 text-xs uppercase tracking-[0.25em] text-primary hover:bg-primary hover:text-primary-foreground"
          >
            <Video size={16} /> Arrange Factory Video Call
          </Link>
        </div>
      </section>
    </>
  );
}
