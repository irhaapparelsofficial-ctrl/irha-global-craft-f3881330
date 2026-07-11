import { ArrowRight, ChevronRight, Globe2, MessageCircle } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";
import SEO from "@/components/SEO";
import CategoryAudienceNavigator from "@/components/CategoryAudienceNavigator";
import { useNormalizedCategory } from "@/hooks/usePublicCategoryData";
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

const SITE = "https://www.irhaapparels.com";

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

  if (invalidLocale) return <Navigate to={`/products/${categorySlug}`} replace />;
  if (isLoading && !category) {
    return <div className="pt-40 pb-24 container-luxe text-sm text-foreground/60">Loading collection…</div>;
  }
  if (!category) return <Navigate to="/products" replace />;

  const taxonomy = buildCategoryTaxonomy(category);
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
  const heroImage = products[0]?.image ?? audience?.collections[0]?.products[0]?.image ?? category.image;

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
                url: `${SITE}/products/${category.slug}/${product.slug}`,
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

      <section className="relative pt-36 pb-16 border-b border-border/60 overflow-hidden">
        {heroImage && (
          <img src={heroImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-15" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-background/85 via-background/90 to-background" />
        <div className="container-luxe relative">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-foreground/55 mb-7">
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
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl leading-[0.98] max-w-5xl">{seo.h1}</h1>
          <p className="mt-7 text-base md:text-lg text-foreground/70 leading-relaxed max-w-3xl">{seo.intro}</p>
          <p className="mt-4 text-sm text-foreground/55 max-w-3xl">{ui.programNote}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={whatsappLink(`Hello Irha Apparels — I need a B2B quote for ${collection?.name ?? audience?.name ?? category.name}.`)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-3 bg-primary text-primary-foreground hover:bg-primary/90 px-7 py-4 text-xs uppercase tracking-[0.25em]"
            >
              <MessageCircle size={15} aria-hidden="true" /> {ui.requestQuote}
            </a>
            <div className="inline-flex items-center gap-2 border border-border/60 px-4 py-2">
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
                    className={`min-w-9 min-h-9 inline-flex items-center justify-center text-[10px] uppercase tracking-[0.15em] ${candidate.code === locale ? "text-primary" : "text-foreground/55 hover:text-primary"}`}
                  >
                    {candidate.code}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {!audience && <CategoryAudienceNavigator category={category} locale={locale} />}

      {audience && !collection && (
        <section className="py-16">
          <div className="container-luxe">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
              <div>
                <p className="eyebrow mb-3">{ui.productCategories}</p>
                <h2 className="font-display text-3xl md:text-5xl">{audienceName}</h2>
              </div>
              <p className="text-xs uppercase tracking-[0.22em] text-foreground/45">{audience.productCount} {ui.styles}</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {audience.collections.map((item) => {
                const name = localizedCollectionName(locale, item.slug, item.name);
                const image = item.products[0]?.image ?? category.image;
                return (
                  <Link
                    key={item.slug}
                    to={taxonomyCollectionPath(category.slug, audience.slug, item.slug, locale)}
                    className="group border border-border/60 hover:border-primary transition-colors bg-card/20"
                  >
                    <div className="aspect-[16/10] overflow-hidden bg-card">
                      {image && <img src={image} alt={name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />}
                    </div>
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="font-display text-xl group-hover:text-primary">{name}</h3>
                        <span className="text-[10px] uppercase tracking-[0.18em] text-foreground/40">{item.products.length}</span>
                      </div>
                      <p className="mt-3 text-sm text-foreground/60 leading-relaxed">{item.description}</p>
                      <span className="mt-5 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-primary">
                        {ui.viewCollection} <ArrowRight size={13} aria-hidden="true" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {collection && (
        <section className="py-16">
          <div className="container-luxe">
            <div className="flex items-center justify-between gap-4 flex-wrap mb-8">
              <div>
                <p className="eyebrow mb-3">{ui.products}</p>
                <h2 className="font-display text-3xl md:text-5xl">{collectionName}</h2>
              </div>
              <p className="text-xs uppercase tracking-[0.22em] text-foreground/45">{products.length} {ui.styles}</p>
            </div>

            {products.length === 0 ? (
              <div className="border border-dashed border-border/60 p-10 text-center text-foreground/65">{ui.empty}</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
                {products.map((product) => (
                  <article key={product.slug} className="group">
                    <Link to={`/products/${category.slug}/${product.slug}`} className="block">
                      <div className="aspect-square overflow-hidden bg-card mb-3">
                        {product.image && (
                          <img
                            src={product.image}
                            alt={product.name}
                            loading="lazy"
                            width={720}
                            height={720}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          />
                        )}
                      </div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-foreground/45">{audienceName}</p>
                      <h3 className="font-display text-base md:text-lg mt-1 group-hover:text-primary">{product.name}</h3>
                      <span className="mt-2 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-primary">
                        {ui.viewProduct} <ArrowRight size={12} aria-hidden="true" />
                      </span>
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
}
