import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Factory,
  GitCompareArrows,
  Globe2,
  MessageCircle,
  PackagePlus,
  Printer,
  ShieldCheck,
  Upload,
} from "lucide-react";
import SEO from "@/components/SEO";
import ThumbnailImage from "@/components/ThumbnailImage";
import { usePublicProduct } from "@/hooks/usePublicCatalog";
import { findPublishedProductRoute, usePublishedCatalogTaxonomyRelease } from "@/hooks/usePublishedCatalogTaxonomy";
import { resolveGallery } from "@/lib/assetResolver";
import { resolveBuyerReadyProductContent } from "@/lib/buyerReadyProductContent";
import { whatsappLink } from "@/lib/constants";
import { pushRecentlyViewed, useCompare, useShortlist } from "@/lib/shortlist";
import { ORGANIZATION_ID, SITE_URL, WEBSITE_ID, breadcrumbSchema } from "@/lib/seoSchema";

function fallbackProductPath(categorySlug: string, productSlug: string) {
  return `/products/${categorySlug}/${productSlug}`;
}

const buyerSafeValue = (value: string | null | undefined, fallback: string) =>
  value?.trim() ? value.trim() : fallback;

export default function CanonicalProductDetail() {
  const params = useParams<{
    categorySlug: string;
    audienceSlug?: string;
    collectionSlug?: string;
    productSlug: string;
  }>();
  const categorySlug = params.categorySlug ?? "";
  const productSlug = params.productSlug ?? "";
  const { data, isLoading, isFetching, error } = usePublicProduct(categorySlug, productSlug);
  const taxonomyRelease = usePublishedCatalogTaxonomyRelease();
  const [activeImg, setActiveImg] = useState(0);
  const shortlist = useShortlist();
  const compare = useCompare();

  useEffect(() => setActiveImg(0), [productSlug]);

  const publishedRoute = useMemo(
    () => findPublishedProductRoute(taxonomyRelease.data, data?.product.id, data?.product.slug ?? productSlug),
    [taxonomyRelease.data, data?.product.id, data?.product.slug, productSlug],
  );

  useEffect(() => {
    if (!data) return;
    pushRecentlyViewed({
      slug: data.product.slug,
      name: data.product.name,
      image: data.product.image_url ?? data.product.gallery?.[0] ?? data.topCategory.image_url,
      categorySlug: data.topCategory.slug,
      categoryName: data.topCategory.name,
    });
  }, [data]);

  if (isLoading || (isFetching && !data) || (taxonomyRelease.isLoading && !taxonomyRelease.data)) {
    return (
      <section
        className="pb-32 pt-36 sm:pt-40 md:pb-20"
        aria-busy="true"
        aria-label="Loading product"
      >
        <div className="container-luxe">
          <div
            className="mb-6 h-4 w-64 max-w-[75vw] rounded bg-muted/30 sm:mb-8"
            aria-hidden="true"
          />
          <div className="grid gap-8 xl:grid-cols-12 xl:gap-14">
            <div className="min-w-0 xl:col-span-7">
              <div
                className="aspect-square rounded-2xl border border-border/70 bg-[#0d0d0d] sm:aspect-[5/4] lg:aspect-[4/5]"
                aria-hidden="true"
              />
              <div className="mt-3 flex gap-3 overflow-hidden pb-2 sm:mt-4" aria-hidden="true">
                {Array.from({ length: 6 }, (_, index) => (
                  <span
                    key={index}
                    className="h-20 w-20 shrink-0 rounded-xl border border-border/60 bg-card sm:h-24 sm:w-24"
                  />
                ))}
              </div>
              <div className="mt-3 h-10 max-w-xl rounded bg-muted/20" aria-hidden="true" />
            </div>
            <div className="xl:col-span-5">
              <div className="h-3 w-28 rounded bg-muted/30" aria-hidden="true" />
              <div className="mt-4 h-12 w-4/5 rounded bg-muted/40" aria-hidden="true" />
              <div className="mt-4 h-20 rounded bg-muted/20" aria-hidden="true" />
              <div className="mt-6 grid grid-cols-2 gap-3" aria-hidden="true">
                <span className="h-14 rounded bg-muted/20" />
                <span className="h-14 rounded bg-muted/20" />
              </div>
            </div>
          </div>
          <span className="sr-only">Loading product…</span>
        </div>
      </section>
    );
  }
  if (error || !data) return <Navigate to={`/products/${categorySlug}`} replace />;

  const category = { slug: data.topCategory.slug, name: data.topCategory.name };
  const subCat = data.subCategory;
  const product = data.product;
  const canonicalPath = publishedRoute?.canonicalPath ?? fallbackProductPath(category.slug, product.slug);
  const routeIsCanonical = publishedRoute
    ? params.audienceSlug === publishedRoute.audience.slug
      && params.collectionSlug === publishedRoute.collection.slug
      && params.categorySlug === publishedRoute.root.slug
    : !params.audienceSlug && !params.collectionSlug;

  if (!routeIsCanonical) return <Navigate to={canonicalPath} replace />;

  const fallbackImage = resolveGallery([data.topCategory.image_url ?? ""])[0] || "/placeholder.svg";
  const rawGallery = (product.gallery ?? []).filter(Boolean);
  const gallery = resolveGallery(rawGallery.length ? rawGallery : [product.image_url ?? fallbackImage]);
  const activeImage = gallery[activeImg] ?? gallery[0] ?? fallbackImage;
  const url = `${SITE_URL}${canonicalPath}`;
  const audienceName = publishedRoute?.audience.name ?? subCat?.name ?? category.name;
  const collectionName = publishedRoute?.collection.name ?? subCat?.name ?? category.name;
  const audiencePath = publishedRoute
    ? `/products/${publishedRoute.root.slug}/${publishedRoute.audience.slug}`
    : `/products/${category.slug}`;
  const collectionPath = publishedRoute
    ? `/products/${publishedRoute.assignment.full_slug_path}`
    : `/products/${category.slug}`;
  const savedProduct = {
    slug: product.slug,
    name: product.name,
    image: product.image_url ?? gallery[0] ?? fallbackImage,
    categorySlug: category.slug,
    categoryName: category.name,
    addedAt: Date.now(),
  };
  const inInquiry = shortlist.has(product.slug);
  const inCompare = compare.has(product.slug);
  const compareFull = !inCompare && compare.items.length >= 4;

  const allCategoryProducts = [
    ...data.topCategory.directProducts,
    ...data.topCategory.subs.flatMap((subCategory) => subCategory.products),
  ];
  const manualRelated = (product.related_product_ids ?? [])
    .map((relatedId) => allCategoryProducts.find((candidate) => candidate.id === relatedId))
    .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate));
  const fallbackRelated = (subCat?.products ?? allCategoryProducts)
    .filter((candidate) => candidate.id !== product.id)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  const relatedProducts = [...manualRelated, ...fallbackRelated]
    .filter(
      (candidate, index, items) =>
        candidate.id !== product.id && items.findIndex((item) => item.id === candidate.id) === index,
    )
    .slice(0, 4);
  const buyerContent = resolveBuyerReadyProductContent({
    name: product.name,
    slug: product.slug,
    seo_title: product.seo_title,
    seo_description: product.seo_description,
    short_description: product.short_description,
    description: product.description,
    mainCategorySlug: category.slug,
    mainCategoryName: category.name,
    audienceSlug: publishedRoute?.audience.slug,
    audienceName,
    productTypeSlug: publishedRoute?.collection.slug,
    productTypeName: collectionName,
    specs: product.specs,
    primary_material: product.primary_material,
    fabric_composition: product.fabric_composition,
    gsm: product.gsm,
    available_sizes: product.available_sizes,
    available_colors: product.available_colors,
    customization: product.customization,
    packaging_standard: product.packaging_standard,
  });

  const b2bRows: Array<{ label: string; value: string }> = [
    { label: "Program type", value: "OEM, ODM and private label" },
    { label: "MOQ", value: buyerSafeValue(product.moq_display, "Confirmed after buyer brief") },
    {
      label: "Sample",
      value:
        product.sample_available === false
          ? "Reviewed per buyer requirement"
          : buyerSafeValue(product.sample_timeline, "Available for approved programs"),
    },
    {
      label: "Production",
      value: buyerSafeValue(product.production_timeline, "Confirmed after specification and sample approval"),
    },
    {
      label: "Primary material",
      value: buyerSafeValue(product.primary_material ?? product.fabric_composition, "Selected to buyer specification"),
    },
    { label: "Weight / GSM", value: buyerSafeValue(product.gsm, "Confirmed with the selected material") },
    {
      label: "Sizes",
      value: product.available_sizes?.length
        ? product.available_sizes.join(", ")
        : "Buyer size chart and custom grading available",
    },
    {
      label: "Colors",
      value: product.available_colors?.length
        ? product.available_colors.join(", ")
        : "Color, trim and material options reviewed per program",
    },
    {
      label: "Packaging",
      value: buyerSafeValue(product.packaging_standard, "Private-label packaging reviewed per buyer brief"),
    },
    { label: "Origin", value: buyerSafeValue(product.country_of_origin, "Pakistan (Sialkot)") },
  ];

  const legacyDetails = (product.details ?? []).filter((detail) => !/(moq|lead time)/i.test(detail.label));
  const enabledCustomization = Object.entries(product.customization ?? {})
    .filter(([, value]) => value === true)
    .map(([key]) => key.replace(/_/g, " "));
  const customizationItems = enabledCustomization.length
    ? enabledCustomization
    : [
        "Brand labels and hang tags",
        "Embroidery, print or artwork placement",
        "Color, trim and hardware selection",
        "Buyer size chart and fit development",
        "Private-label packaging",
      ];
  const whatsappMsg = `Hello Irha Apparels — I'm interested in ${product.name} (${collectionName}, ${category.name}). Product page: ${url}`;
  const quoteParams = new URLSearchParams({
    intent: "rfq",
    product: product.slug,
    name: product.name,
    category: category.slug,
  });
  if (product.sku) quoteParams.set("code", product.sku);
  const quotePath = `/inquiry?${quoteParams.toString()}`;
  const metaDescription = buyerContent.seoDescription;
  const productId = `${url}#product`;
  const productImageAlt = `${product.name} custom manufacturing catalogue reference for ${collectionName}`;
  const breadcrumbItems = [
    { name: "Home", path: "/" },
    { name: "Collections", path: "/products" },
    { name: category.name, path: `/products/${category.slug}` },
    ...(publishedRoute
      ? [
          { name: audienceName, path: audiencePath },
          { name: collectionName, path: collectionPath },
        ]
      : []),
    { name: product.name, path: canonicalPath },
  ];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      url,
      name: product.name,
      description: metaDescription,
      isPartOf: { "@id": WEBSITE_ID },
      about: { "@id": productId },
      mainEntity: { "@id": productId },
      inLanguage: "en",
    },
    {
      "@context": "https://schema.org",
      "@type": "Product",
      "@id": productId,
      name: product.name,
      description: buyerContent.openingAnswer,
      sku: product.sku ?? undefined,
      manufacturer: { "@id": ORGANIZATION_ID },
      category: `${category.name} > ${audienceName} > ${collectionName}`,
      url,
      image: gallery,
    },
    breadcrumbSchema(breadcrumbItems),
  ];

  const showPrevious = gallery.length > 1;
  const previousImage = () => setActiveImg((current) => (current - 1 + gallery.length) % gallery.length);
  const nextImage = () => setActiveImg((current) => (current + 1) % gallery.length);

  return (
    <>
      <SEO
        title={buyerContent.seoTitle}
        description={metaDescription}
        path={canonicalPath}
        image={gallery[0] ?? fallbackImage}
        type="product"
        jsonLd={jsonLd}
      />

      <section className="pb-32 pt-36 sm:pt-40 md:pb-20">
        <div className="container-luxe">
          <nav
            aria-label="Breadcrumb"
            className="-mx-1 mb-6 flex items-center gap-2 overflow-x-auto whitespace-nowrap px-1 pb-2 text-[9px] uppercase tracking-[0.18em] text-foreground/50 sm:mb-8 sm:text-[10px] sm:tracking-[0.22em]"
          >
            {breadcrumbItems.map((item, index) => (
              <span key={item.path} className="inline-flex shrink-0 items-center gap-2">
                {index > 0 && <ChevronRight size={11} aria-hidden="true" />}
                {index === breadcrumbItems.length - 1 ? (
                  <span className="max-w-[52vw] truncate text-foreground/80 sm:max-w-[40ch]">{item.name}</span>
                ) : (
                  <Link to={item.path} className="hover:text-primary">{item.name}</Link>
                )}
              </span>
            ))}
          </nav>

          <div className="grid gap-8 xl:grid-cols-12 xl:gap-14">
            <div className="min-w-0 xl:col-span-7">
              <div className="relative aspect-square overflow-hidden rounded-2xl border border-border/70 bg-[#0d0d0d] shadow-[0_28px_80px_rgba(0,0,0,.32)] sm:aspect-[5/4] lg:aspect-[4/5]">
                <ThumbnailImage
                  src={activeImage}
                  originalSrc={activeImage}
                  fallbackSrc={fallbackImage}
                  alt={productImageAlt}
                  className="absolute inset-0 h-full w-full object-contain p-3 sm:p-6"
                  width={1200}
                  height={1200}
                  loading="eager"
                  fetchPriority="high"
                  responsive={false}
                />
                <span className="absolute left-3 top-3 rounded-full border border-primary/45 bg-black/75 px-3 py-1.5 text-[8px] font-semibold uppercase tracking-[0.2em] text-primary backdrop-blur sm:left-5 sm:top-5 sm:text-[9px]">
                  B2B only · made to order
                </span>
                {showPrevious && (
                  <>
                    <button
                      type="button"
                      onClick={previousImage}
                      aria-label="Previous product image"
                      className="absolute left-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/70 text-white backdrop-blur hover:border-primary hover:text-primary sm:left-5"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={nextImage}
                      aria-label="Next product image"
                      className="absolute right-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/70 text-white backdrop-blur hover:border-primary hover:text-primary sm:right-5"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </>
                )}
                <span className="absolute bottom-3 right-3 rounded-full border border-white/15 bg-black/70 px-3 py-1.5 text-[9px] tracking-[0.16em] text-white/75 backdrop-blur sm:bottom-5 sm:right-5">
                  {Math.min(activeImg + 1, Math.max(gallery.length, 1))} / {Math.max(gallery.length, 1)}
                </span>
              </div>

              {gallery.length > 1 && (
                <div className="mt-3 flex snap-x gap-3 overflow-x-auto pb-2 sm:mt-4" aria-label="Product reference gallery">
                  {gallery.map((image, index) => (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      onClick={() => setActiveImg(index)}
                      aria-label={`View ${product.name} image ${index + 1}`}
                      className={`relative h-20 w-20 shrink-0 snap-start overflow-hidden rounded-xl border bg-card sm:h-24 sm:w-24 ${
                        index === activeImg ? "border-primary ring-1 ring-primary/40" : "border-border/60"
                      }`}
                    >
                      <ThumbnailImage
                        src={image}
                        fallbackSrc={fallbackImage}
                        alt={`${productImageAlt}, view ${index + 1}`}
                        className="h-full w-full object-contain p-1"
                        width={1200}
                        height={1200}
                        responsive={false}
                      />
                    </button>
                  ))}
                </div>
              )}
              <p className="mt-3 text-xs leading-5 text-foreground/55">
                Digital catalogue references show design direction only; they are not photographs of completed buyer orders. Materials, construction and finishes are confirmed from the approved specification.
              </p>
            </div>

            <div className="min-w-0 self-start xl:sticky xl:top-28 xl:col-span-5">
              <p className="eyebrow mb-3">
                <Link to={collectionPath} className="hover:text-primary">{collectionName}</Link>
                <span className="mx-2 text-foreground/30">·</span>
                {audienceName}
              </p>
              <h1 className="font-display text-3xl leading-[1.02] sm:text-4xl lg:text-5xl">{product.name}</h1>
              {product.sku && (
                <p className="mt-3 text-[9px] uppercase tracking-[0.26em] text-foreground/45">SKU · {product.sku}</p>
              )}
              <p className="mt-5 text-sm leading-relaxed text-foreground/72 sm:text-base">
                {buyerContent.openingAnswer}
              </p>

              {product.specs?.length > 0 && (
                <ul className="mt-6 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                  {product.specs.slice(0, 6).map((specification) => (
                    <li key={specification} className="flex items-start gap-2.5 text-sm text-foreground/82">
                      <Check size={15} className="mt-0.5 shrink-0 text-primary" />
                      <span>{specification}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-7 grid grid-cols-2 gap-2.5 border-y border-border/60 py-5">
                <div className="flex items-center gap-2.5 text-xs text-foreground/72">
                  <Factory size={17} className="shrink-0 text-primary" /> OEM / ODM
                </div>
                <div className="flex items-center gap-2.5 text-xs text-foreground/72">
                  <ShieldCheck size={17} className="shrink-0 text-primary" /> Private label
                </div>
                <div className="flex items-center gap-2.5 text-xs text-foreground/72">
                  <PackagePlus size={17} className="shrink-0 text-primary" /> Custom program
                </div>
                <div className="flex items-center gap-2.5 text-xs text-foreground/72">
                  <Globe2 size={17} className="shrink-0 text-primary" /> Export support
                </div>
              </div>

              <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
                <Link
                  to={quotePath}
                  className="inline-flex min-h-13 items-center justify-center gap-3 rounded-md bg-gradient-gold px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary-foreground hover:shadow-gold sm:col-span-2"
                >
                  <ClipboardList size={16} /> Request quote for {product.sku ?? product.name}
                </Link>
                <button
                  type="button"
                  onClick={() => shortlist.toggle(savedProduct)}
                  aria-pressed={inInquiry}
                  className={`inline-flex min-h-13 items-center justify-center gap-3 rounded-md px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.2em] transition-colors sm:col-span-2 ${
                    inInquiry
                      ? "border border-primary text-primary"
                      : "border border-border/70 text-foreground/80 hover:border-primary hover:text-primary"
                  }`}
                >
                  {inInquiry ? <Check size={16} /> : <PackagePlus size={16} />}
                  {inInquiry ? "Added to inquiry" : "Add to inquiry"}
                </button>
                {inInquiry && (
                  <Link
                    to="/inquiry-cart"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-primary/60 px-4 text-[9px] font-semibold uppercase tracking-[0.18em] text-primary"
                  >
                    <ClipboardList size={15} /> Review inquiry
                  </Link>
                )}
                <a
                  href={whatsappLink(whatsappMsg)}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-gold/70 px-4 text-[9px] font-semibold uppercase tracking-[0.18em] text-gold hover:bg-gold hover:text-background"
                >
                  <MessageCircle size={15} /> WhatsApp
                </a>
                <button
                  type="button"
                  onClick={() => compare.toggle(savedProduct)}
                  disabled={compareFull}
                  aria-pressed={inCompare}
                  className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-md border px-4 text-[9px] font-semibold uppercase tracking-[0.18em] transition-colors ${
                    inCompare
                      ? "border-primary text-primary"
                      : "border-border/70 hover:border-primary disabled:cursor-not-allowed disabled:opacity-45"
                  }`}
                >
                  <GitCompareArrows size={15} /> {inCompare ? "In compare" : compareFull ? "Compare full" : "Compare"}
                </button>
                <Link
                  to="/inquiry-cart"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-border/70 px-4 text-[9px] font-semibold uppercase tracking-[0.18em] text-foreground/70 hover:border-primary hover:text-primary"
                >
                  <Upload size={14} /> Upload tech pack
                </Link>
                <Link
                  to={`/products/${category.slug}/${product.slug}/spec-sheet`}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-border/70 px-4 text-[9px] font-semibold uppercase tracking-[0.18em] text-foreground/70 hover:border-primary hover:text-primary sm:col-span-2"
                >
                  <Printer size={14} /> Print product spec sheet
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-14 grid gap-6 border-t border-border/60 pt-10 lg:mt-20 lg:grid-cols-[1.1fr_.9fr] lg:gap-10 lg:pt-12">
            <section className="rounded-2xl border border-border/60 bg-card/25 p-5 sm:p-7" aria-labelledby="product-description">
              <p className="eyebrow mb-3">Product program</p>
              <h2 id="product-description" className="font-display text-2xl sm:text-3xl">Description and buyer options</h2>
              <p className="mt-4 text-sm leading-relaxed text-foreground/70 sm:text-base">
                {buyerContent.productDescription}
              </p>

              <h3 className="mt-8 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">Buyer and collection uses</h3>
              <ul className="mt-4 grid gap-3">
                {buyerContent.buyerUseCases.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-foreground/75">
                    <Check size={14} className="mt-0.5 shrink-0 text-primary" /> {item}
                  </li>
                ))}
              </ul>

              <h3 className="mt-8 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">Material and construction review</h3>
              <p className="mt-4 text-sm leading-relaxed text-foreground/70">{buyerContent.materialGuidance}</p>
              <p className="mt-3 text-sm leading-relaxed text-foreground/70">{buyerContent.constructionGuidance}</p>

              <h3 className="mt-8 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">Customization reviewed per brief</h3>
              <p className="mt-4 text-sm leading-relaxed text-foreground/70">{buyerContent.customizationGuidance}</p>
              <p className="mt-3 text-sm leading-relaxed text-foreground/70">{buyerContent.sizeAndFitGuidance}</p>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {customizationItems.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-foreground/75 capitalize">
                    <Check size={14} className="mt-0.5 shrink-0 text-primary" /> {item}
                  </li>
                ))}
              </ul>

              {legacyDetails.length > 0 && (
                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {legacyDetails.map((detail) => (
                    <div key={detail.label} className="rounded-xl border border-border/60 p-4">
                      <p className="text-[9px] uppercase tracking-[0.18em] text-foreground/45">{detail.label}</p>
                      <p className="mt-2 text-sm text-foreground/78">{detail.value}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="overflow-hidden rounded-2xl border border-border/60 bg-card/25" aria-labelledby="b2b-information">
              <div className="border-b border-border/60 p-5 sm:p-7">
                <p className="eyebrow mb-3">Buyer-ready information</p>
                <h2 id="b2b-information" className="font-display text-2xl sm:text-3xl">B2B specifications</h2>
              </div>
              <dl className="divide-y divide-border/60">
                {b2bRows.map((row) => (
                  <div key={row.label} className="grid grid-cols-[110px_minmax(0,1fr)] gap-4 px-5 py-3.5 text-sm sm:grid-cols-[145px_minmax(0,1fr)] sm:px-7">
                    <dt className="text-foreground/48">{row.label}</dt>
                    <dd className="text-foreground/82">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>

          <section className="mt-14 grid gap-6 border-t border-border/60 pt-10 lg:mt-20 lg:grid-cols-2 lg:gap-10 lg:pt-12" aria-labelledby="product-sampling-workflow">
            <div className="rounded-2xl border border-border/60 bg-card/25 p-5 sm:p-7">
              <p className="eyebrow mb-3">From brief to bulk order</p>
              <h2 id="product-sampling-workflow" className="font-display text-2xl sm:text-3xl">Sampling and approval workflow</h2>
              <ol className="mt-5 space-y-4">
                {buyerContent.samplingSteps.map((step, index) => (
                  <li key={step} className="grid grid-cols-[28px_minmax(0,1fr)] gap-3 text-sm leading-relaxed text-foreground/75">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-primary/50 text-[10px] text-primary">{index + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <h3 className="mt-8 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">MOQ and production timing</h3>
              <p className="mt-4 text-sm leading-relaxed text-foreground/70">{buyerContent.moqAndLeadTime}</p>
              <h3 className="mt-8 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">Packaging and logistics</h3>
              <p className="mt-4 text-sm leading-relaxed text-foreground/70">{buyerContent.packagingAndLogistics}</p>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card/25 p-5 sm:p-7">
              <p className="eyebrow mb-3">Buyer questions</p>
              <h2 className="font-display text-2xl sm:text-3xl">{product.name} FAQs</h2>
              <div className="mt-5 divide-y divide-border/60">
                {buyerContent.faqs.map((faq) => (
                  <section key={faq.question} className="py-5 first:pt-0">
                    <h3 className="text-base font-medium text-foreground">{faq.question}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-foreground/70">{faq.answer}</p>
                  </section>
                ))}
              </div>
              <nav aria-label="Related buyer resources" className="mt-4 flex flex-wrap gap-x-5 gap-y-3 text-[10px] uppercase tracking-[0.16em]">
                <Link to="/materials" className="text-primary hover:text-primary/70">Material library</Link>
                <Link to="/resources" className="text-primary hover:text-primary/70">Buyer guides</Link>
                <Link to="/buyer-information" className="text-primary hover:text-primary/70">Order and logistics preparation</Link>
              </nav>
            </div>
          </section>

          {relatedProducts.length > 0 && (
            <section className="mt-14 border-t border-border/60 pt-10 lg:mt-20 lg:pt-12" aria-labelledby="related-products">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="eyebrow mb-3">Continue sourcing</p>
                  <h2 id="related-products" className="font-display text-3xl">Related manufacturing programs</h2>
                </div>
                <Link to={collectionPath} className="hidden text-[9px] uppercase tracking-[0.18em] text-primary hover:text-primary/70 sm:block">
                  View collection
                </Link>
              </div>
              <div className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {relatedProducts.map((related) => {
                  const route = findPublishedProductRoute(taxonomyRelease.data, related.id, related.slug);
                  const path = route?.canonicalPath ?? fallbackProductPath(category.slug, related.slug);
                  const relatedImage = related.image_url ?? related.gallery?.[0] ?? fallbackImage;
                  return (
                    <Link key={related.id} to={path} className="group min-w-0">
                      <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-border/60 bg-card">
                        <ThumbnailImage
                          src={relatedImage}
                          fallbackSrc={fallbackImage}
                          alt={`Digital catalogue reference for ${related.name}`}
                          className="h-full w-full object-contain p-2 transition-transform duration-500 group-hover:scale-[1.03]"
                          width={1200}
                          height={1200}
                        />
                      </div>
                      <p className="mt-3 truncate text-[8px] uppercase tracking-[0.16em] text-foreground/42">{collectionName}</p>
                      <h3 className="mt-1 font-display text-lg leading-tight group-hover:text-primary">{related.name}</h3>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </section>
    </>
  );
}
