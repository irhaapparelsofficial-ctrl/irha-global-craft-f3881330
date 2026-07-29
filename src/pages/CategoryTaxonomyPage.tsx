import {
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  ChevronRight,
  GitCompareArrows,
  Globe2,
  MessageCircle,
} from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";
import SEO from "@/components/SEO";
import CategoryAudienceNavigator from "@/components/CategoryAudienceNavigator";
import HeroMediaSlideshow from "@/components/HeroMediaSlideshow";
import {
  CollectionCatalogCard,
  ProductCatalogCard,
} from "@/components/catalog/CatalogListingCard";
import { useNormalizedCategory } from "@/hooks/usePublicCategoryData";
import { usePublishedCategoryTaxonomy } from "@/hooks/usePublishedCatalogTaxonomy";
import {
  buildCategoryTaxonomy,
  taxonomyAudiencePath,
  taxonomyCollectionPath,
} from "@/lib/globalCategoryTaxonomy";
import {
  isTaxonomyLocale,
  localizedAudienceName,
  localizedCollectionName,
  localizedTaxonomySeo,
  localizedTopName,
  TAXONOMY_LOCALES,
  taxonomyUi,
  type TaxonomyLocale,
} from "@/lib/taxonomyI18n";
import { whatsappLink } from "@/lib/constants";
import { useCompare, useShortlist } from "@/lib/shortlist";

const SITE = "https://irhaapparels.com";

type Props = {
  audienceOverride?: string;
};

function topPath(categorySlug: string, locale: TaxonomyLocale) {
  return locale === "en" ? `/products/${categorySlug}` : `/intl/${locale}/products/${categorySlug}`;
}

export default function CategoryTaxonomyPage({ audienceOverride }: Props) {
  const params = useParams<{
    locale?: string;
    categorySlug: string;
    audienceSlug?: string;
    collectionSlug?: string;
  }>();
  const categorySlug = params.categorySlug ?? "";
  const audienceSlug = audienceOverride ?? params.audienceSlug;
  const collectionSlug = params.collectionSlug;
  const locale: TaxonomyLocale = params.locale && isTaxonomyLocale(params.locale) ? params.locale : "en";
  const invalidLocale = Boolean(params.locale && !isTaxonomyLocale(params.locale));
  const { category, isLoading } = useNormalizedCategory(categorySlug);
  const publishedTaxonomy = usePublishedCategoryTaxonomy(category);
  const shortlist = useShortlist();
  const compare = useCompare();

  if (invalidLocale) return <Navigate to={`/products/${categorySlug}`} replace />;
  if ((isLoading && !category) || (category && publishedTaxonomy.isLoading && !publishedTaxonomy.data)) {
    return <div className="pt-40 pb-24 container-luxe text-sm text-foreground/60">Loading collection…</div>;
  }
  if (!category) return <Navigate to="/products" replace />;

  const taxonomy = publishedTaxonomy.taxonomy ?? buildCategoryTaxonomy(category);
  const audience = audienceSlug
    ? taxonomy.audiences.find((candidate) => candidate.slug === audienceSlug) ?? null
    : null;
  const collection = audience && collectionSlug
    ? audience.collections.find((candidate) => candidate.slug === collectionSlug) ?? null
    : null;

  if (audienceSlug && !audience) return <Navigate to={topPath(category.slug, locale)} replace />;
  if (collectionSlug && !collection) {
    return <Navigate to={taxonomyAudiencePath(category.slug, audience?.slug ?? "men", locale)} replace />;
  }

  const ui = taxonomyUi(locale);
  const topName = localizedTopName(locale, category.slug, category.name);
  const audienceName = audience ? localizedAudienceName(locale, audience.slug, audience.name) : undefined;
  const collectionName = collection
    ? localizedCollectionName(locale, collection.slug, collection.name)
    : undefined;
  const seo = localizedTaxonomySeo({ locale, topName, audienceName, collectionName });
  const path = collection
    ? taxonomyCollectionPath(category.slug, audience!.slug, collection.slug, locale)
    : audience
      ? taxonomyAudiencePath(category.slug, audience.slug, locale)
      : topPath(category.slug, locale);
  const englishPath = collection
    ? taxonomyCollectionPath(category.slug, audience!.slug, collection.slug)
    : audience
      ? taxonomyAudiencePath(category.slug, audience.slug)
      : `/products/${category.slug}`;
  const productPath = (productSlug: string) =>
    audience && collection
      ? `/products/${category.slug}/${audience.slug}/${collection.slug}/${productSlug}`
      : `/products/${category.slug}/${productSlug}`;
  const alternates = TAXONOMY_LOCALES.map((candidate) => ({
    locale: candidate.hreflang,
    href: collection
      ? taxonomyCollectionPath(category.slug, audience!.slug, collection.slug, candidate.code)
      : audience
        ? taxonomyAudiencePath(category.slug, audience.slug, candidate.code)
        : topPath(category.slug, candidate.code),
  }));
  const currentLocale = TAXONOMY_LOCALES.find((candidate) => candidate.code === locale)!;
  const products = collection?.products ?? [];
  const firstHeroProduct = products[0] ?? audience?.collections[0]?.products[0];
  const heroImage = firstHeroProduct?.originalImage
    ?? firstHeroProduct?.gallery?.[0]
    ?? category.originalImage
    ?? firstHeroProduct?.image
    ?? category.image;
  const heroLabel = collectionName ?? audienceName ?? topName;
  const quoteContext = collectionName ?? audienceName ?? topName;
  const structuredQuoteLink = `/inquiry?intent=rfq&category=${encodeURIComponent(category.slug)}&categoryName=${encodeURIComponent(quoteContext)}${collection ? `&collection=${encodeURIComponent(collection.slug)}&collectionName=${encodeURIComponent(collectionName ?? collection.name)}` : ""}`;
  const quoteWhatsappMessage = `Hello Irha Apparels — I need help reviewing a B2B requirement for ${collection?.name ?? audience?.name ?? category.name}.`;
  const heroProducts = collection
    ? products
    : audience
      ? audience.collections.flatMap((item) => item.products)
      : taxonomy.audiences.flatMap((item) => item.collections.flatMap((child) => child.products));
  const heroSlides = [
    heroImage,
    ...heroProducts.map((product) => product.originalImage ?? product.gallery?.[0] ?? product.image),
  ]
    .filter((src): src is string => Boolean(src))
    .filter((src, index, items) => items.indexOf(src) === index)
    .slice(0, 6)
    .map((src, index) => ({
      src,
      alt: index === 0
        ? `${heroLabel} custom manufacturing collection`
        : `${heroLabel} product view ${index + 1}`,
      fit: "contain" as const,
      backgroundClassName: "bg-[#f4f0e7]",
    }));

  const breadcrumbItems = [
    { name: ui.home, path: locale === "en" ? "/" : `/intl/${locale}/products/${category.slug}` },
    { name: ui.collections, path: locale === "en" ? "/products" : `/intl/${locale}/products/${category.slug}` },
    { name: topName, path: topPath(category.slug, locale) },
    ...(audience ? [{ name: audienceName!, path: taxonomyAudiencePath(category.slug, audience.slug, locale) }] : []),
    ...(collection ? [{ name: collectionName!, path }] : []),
  ];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: seo.h1,
      url: `${SITE}${path}`,
      description: seo.description,
      inLanguage: currentLocale.htmlLang,
      isPartOf: { "@type": "WebSite", name: "Irha Apparels", url: `${SITE}/` },
      about: { "@type": "Thing", name: collectionName ?? audienceName ?? topName },
      ...(products.length > 0
        ? {
            mainEntity: {
              "@type": "ItemList",
              numberOfItems: products.length,
              itemListElement: products.slice(0, 50).map((product, index) => ({
                "@type": "ListItem",
                position: index + 1,
                name: product.name,
                url: `${SITE}${productPath(product.slug)}`,
              })),
            },
          }
        : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: breadcrumbItems.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: `${SITE}${item.path}`,
      })),
    },
  ];

  return (
    <>
      <SEO
        title={seo.title}
        description={seo.description}
        path={path}
        image={heroImage}
        locale={currentLocale.htmlLang}
        direction={currentLocale.direction}
        alternates={alternates}
        xDefaultPath={englishPath}
        noindex={Boolean(collection && products.length === 0)}
        jsonLd={jsonLd}
      />

      <section className="relative overflow-hidden border-b border-border/60 pb-14 pt-32 md:pb-20 md:pt-40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.1),transparent_42%)]" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-background/75" />
        <div className="container-luxe relative grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-7">
            <nav aria-label="Breadcrumb" className="mb-7 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-foreground/55">
              {breadcrumbItems.map((item, index) => (
                <span key={`${item.path}-${index}`} className="inline-flex items-center gap-2">
                  {index > 0 && <ChevronRight size={11} aria-hidden="true" />}
                  {index === breadcrumbItems.length - 1 ? (
                    <span className="text-foreground/85">{item.name}</span>
                  ) : (
                    <Link to={item.path} className="hover:text-primary">{item.name}</Link>
                  )}
                </span>
              ))}
            </nav>

            <p className="eyebrow mb-4">Irha Apparels · B2B Manufacturing</p>
            <h1 className="max-w-5xl font-display text-4xl leading-[0.98] md:text-6xl lg:text-7xl">{seo.h1}</h1>
            <p className="mt-7 max-w-3xl text-base leading-relaxed text-foreground/70 md:text-lg">{seo.intro}</p>
            <p className="mt-4 max-w-3xl text-sm text-foreground/55">{ui.programNote}</p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to={structuredQuoteLink}
                data-track="taxonomy-structured-rfq"
                className="inline-flex min-h-11 items-center gap-3 bg-primary px-7 py-4 text-xs uppercase tracking-[0.25em] text-primary-foreground hover:bg-primary/90"
              >
                {ui.requestQuote} <ArrowRight size={15} aria-hidden="true" />
              </Link>
              <a
                href={whatsappLink(quoteWhatsappMessage)}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex min-h-11 items-center gap-3 border border-gold/70 px-7 py-4 text-xs uppercase tracking-[0.25em] text-gold hover:bg-gold hover:text-background"
              >
                <MessageCircle size={15} aria-hidden="true" /> WhatsApp
              </a>
              <div className="inline-flex items-center gap-2 border border-border/60 bg-background/70 px-4 py-2 backdrop-blur-sm">
                <Globe2 size={14} className="text-primary" aria-hidden="true" />
                <span className="sr-only">{ui.otherLanguages}</span>
                {TAXONOMY_LOCALES.map((candidate) => {
                  const href = collection
                    ? taxonomyCollectionPath(category.slug, audience!.slug, collection.slug, candidate.code)
                    : audience
                      ? taxonomyAudiencePath(category.slug, audience.slug, candidate.code)
                      : topPath(category.slug, candidate.code);
                  return (
                    <Link
                      key={candidate.code}
                      to={href}
                      lang={candidate.htmlLang}
                      hrefLang={candidate.hreflang}
                      className={`inline-flex min-h-11 min-w-11 items-center justify-center text-[10px] uppercase tracking-[0.15em] ${candidate.code === locale ? "text-primary" : "text-foreground/55 hover:text-primary"}`}
                    >
                      {candidate.code}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {heroSlides.length > 0 && (
            <div className="relative aspect-[4/5] max-h-[640px] overflow-hidden border border-border/60 bg-card shadow-2xl lg:col-span-5">
              <HeroMediaSlideshow
                slides={heroSlides}
                label={`${heroLabel} product slideshow`}
                imageClassName="p-3 md:p-5"
                controlsClassName="bottom-4 right-4"
                priority
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/10" />
              <div className="pointer-events-none absolute bottom-5 left-5 right-5 border border-white/20 bg-black/45 p-4 backdrop-blur-sm">
                <p className="text-[10px] uppercase tracking-[0.3em] text-gold">Digital catalogue reference</p>
                <p className="mt-2 font-display text-xl text-white">{heroLabel}</p>
                <p className="mt-1 text-[10px] text-white/65">Design direction · not production proof</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {!audience && <CategoryAudienceNavigator category={category} locale={locale} taxonomy={taxonomy} />}

      {audience && !collection && (
        <section className="py-16">
          <div className="container-luxe">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="eyebrow mb-3">{ui.productCategories}</p>
                <h2 className="font-display text-3xl md:text-5xl">{audienceName}</h2>
              </div>
              <p className="text-xs uppercase tracking-[0.22em] text-foreground/45">{audience.productCount} {ui.styles}</p>
            </div>
            <div className="grid grid-cols-1 gap-4 min-[520px]:grid-cols-2 lg:grid-cols-3 lg:gap-5">
              {audience.collections.map((item) => {
                const name = localizedCollectionName(locale, item.slug, item.name);
                const firstProduct = item.products[0];
                return (
                  <CollectionCatalogCard
                    key={item.slug}
                    href={taxonomyCollectionPath(category.slug, audience.slug, item.slug, locale)}
                    name={name}
                    description={item.description}
                    image={firstProduct?.image ?? category.image}
                    originalImage={firstProduct?.originalImage ?? category.originalImage}
                    count={item.products.length}
                    actionLabel={ui.viewCollection}
                  />
                );
              })}
            </div>
          </div>
        </section>
      )}

      {collection && (
        <section className="py-16">
          <div className="container-luxe">
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="eyebrow mb-3">{ui.products}</p>
                <h2 className="font-display text-3xl md:text-5xl">{collectionName}</h2>
              </div>
              <p className="text-xs uppercase tracking-[0.22em] text-foreground/45">{products.length} {ui.styles}</p>
            </div>

            {products.length === 0 ? (
              <div className="border border-dashed border-border/60 p-10 text-center text-foreground/65">
                <p>{ui.empty}</p>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-foreground/55">
                  Share a reference or requirement and our team can review a custom manufacturing route for this collection.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Link to={structuredQuoteLink} className="inline-flex min-h-11 items-center gap-2 bg-primary px-5 text-[10px] uppercase tracking-[0.2em] text-primary-foreground hover:bg-primary/90">
                    Request custom review <ArrowRight size={13} aria-hidden="true" />
                  </Link>
                  <a href={whatsappLink(quoteWhatsappMessage)} target="_blank" rel="noreferrer noopener" className="inline-flex min-h-11 items-center gap-2 border border-gold/70 px-5 text-[10px] uppercase tracking-[0.2em] text-gold hover:bg-gold hover:text-background">
                    <MessageCircle size={13} aria-hidden="true" /> WhatsApp
                  </a>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 min-[380px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 md:gap-5">
                {products.map((product) => {
                  const saved = shortlist.has(product.slug);
                  const inCompare = compare.has(product.slug);
                  const compareFull = !inCompare && compare.items.length >= 4;
                  const canonicalPath = productPath(product.slug);
                  const storedProduct = {
                    slug: product.slug,
                    name: product.name,
                    image: product.image,
                    categorySlug: category.slug,
                    categoryName: topName,
                    canonicalPath,
                    addedAt: Date.now(),
                  };

                  return (
                    <ProductCatalogCard
                      key={product.slug}
                      href={canonicalPath}
                      name={product.name}
                      image={product.image}
                      originalImage={product.originalImage}
                      eyebrow={`${audienceName ?? topName}${product.sku ? ` · ${product.sku}` : ""}`}
                      actions={(
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => shortlist.toggle(storedProduct)}
                            aria-pressed={saved}
                            aria-label={saved ? `Remove ${product.name} from shortlist` : `Save ${product.name} to shortlist`}
                            className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border px-2 text-[8px] uppercase tracking-[0.12em] ${saved ? "border-primary text-primary" : "border-border/60 hover:border-primary"}`}
                          >
                            {saved ? <BookmarkCheck size={12} /> : <Bookmark size={12} />}
                            {saved ? "Saved" : "Save"}
                          </button>
                          <button
                            type="button"
                            onClick={() => compare.toggle(storedProduct)}
                            disabled={compareFull}
                            aria-pressed={inCompare}
                            title={compareFull ? "Comparison is limited to four products" : undefined}
                            className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border px-2 text-[8px] uppercase tracking-[0.12em] ${inCompare ? "border-primary text-primary" : "border-border/60 hover:border-primary disabled:cursor-not-allowed disabled:opacity-35"}`}
                          >
                            <GitCompareArrows size={12} />
                            {inCompare ? "Added" : compareFull ? "Full" : "Compare"}
                          </button>
                          <Link to={canonicalPath} aria-label={`Open ${product.name}`} className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-gradient-gold text-[8px] font-semibold uppercase tracking-[0.14em] text-primary-foreground">
                            {ui.viewCollection} <ArrowRight size={13} aria-hidden="true" />
                          </Link>
                        </div>
                      )}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
}
