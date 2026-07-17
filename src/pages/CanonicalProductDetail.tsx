import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Check, ChevronRight, ClipboardList, GitCompareArrows, MessageCircle, PackagePlus, Printer, Upload } from "lucide-react";
import SEO from "@/components/SEO";
import ThumbnailImage from "@/components/ThumbnailImage";
import { usePublicProduct } from "@/hooks/usePublicCatalog";
import { findPublishedProductRoute, usePublishedCatalogTaxonomyRelease } from "@/hooks/usePublishedCatalogTaxonomy";
import { resolveGallery } from "@/lib/assetResolver";
import { whatsappLink } from "@/lib/constants";
import { pushRecentlyViewed, useCompare, useShortlist } from "@/lib/shortlist";
import { ORGANIZATION_ID, SITE_URL, WEBSITE_ID, breadcrumbSchema } from "@/lib/seoSchema";

function fallbackProductPath(categorySlug: string, productSlug: string) {
  return `/products/${categorySlug}/${productSlug}`;
}

export default function CanonicalProductDetail() {
  const params = useParams<{ categorySlug: string; audienceSlug?: string; collectionSlug?: string; productSlug: string }>();
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
      image: data.product.image_url ?? data.product.gallery?.[0],
      categorySlug: data.topCategory.slug,
      categoryName: data.topCategory.name,
    });
  }, [data]);

  if (isLoading || (isFetching && !data) || (taxonomyRelease.isLoading && !taxonomyRelease.data)) {
    return <div className="pt-40 pb-20 container-luxe text-sm text-muted-foreground">Loading product…</div>;
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

  const gallery = resolveGallery(product.gallery.length ? product.gallery : [product.image_url ?? ""]);
  const url = `${SITE_URL}${canonicalPath}`;
  const audienceName = publishedRoute?.audience.name ?? subCat.name;
  const collectionName = publishedRoute?.collection.name ?? subCat.name;
  const audiencePath = publishedRoute
    ? `/products/${publishedRoute.root.slug}/${publishedRoute.audience.slug}`
    : `/products/${category.slug}`;
  const collectionPath = publishedRoute
    ? `/products/${publishedRoute.assignment.full_slug_path}`
    : `/products/${category.slug}`;
  const savedProduct = {
    slug: product.slug,
    name: product.name,
    image: product.image_url ?? gallery[0],
    categorySlug: category.slug,
    categoryName: category.name,
    addedAt: Date.now(),
  };
  const inInquiry = shortlist.has(product.slug);
  const inCompare = compare.has(product.slug);
  const compareFull = !inCompare && compare.items.length >= 4;

  const allCategoryProducts = data.topCategory.subs.flatMap((subCategory) => subCategory.products);
  const manualRelated = (product.related_product_ids ?? [])
    .map((relatedId) => allCategoryProducts.find((candidate) => candidate.id === relatedId))
    .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate));
  const fallbackRelated = subCat.products
    .filter((candidate) => candidate.id !== product.id)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  const relatedProducts = [...manualRelated, ...fallbackRelated]
    .filter((candidate, index, items) => candidate.id !== product.id && items.findIndex((item) => item.id === candidate.id) === index)
    .slice(0, 4);

  const b2bRows: Array<{ label: string; value: string }> = [];
  const pushIf = (label: string, value?: string | null) => {
    if (value && value.trim()) b2bRows.push({ label, value: value.trim() });
  };
  pushIf("MOQ", product.moq_display);
  pushIf("Sample Availability", product.sample_available === false ? "Not available" : product.sample_timeline);
  pushIf("Production Timeline", product.production_timeline);
  pushIf("Primary Material", product.primary_material);
  pushIf("Fabric Composition", product.fabric_composition);
  pushIf("Weight / GSM", product.gsm);
  pushIf("Country of Origin", product.country_of_origin ?? "Pakistan (Sialkot)");
  if (product.available_sizes?.length) b2bRows.push({ label: "Sizes", value: product.available_sizes.join(", ") });
  if (product.available_colors?.length) b2bRows.push({ label: "Colors", value: product.available_colors.join(", ") });
  pushIf("Packaging", product.packaging_standard);

  const legacyDetails = (product.details ?? []).filter((detail) => !/(moq|lead time)/i.test(detail.label));
  const customEnabled = Object.entries(product.customization ?? {})
    .filter(([, value]) => value === true)
    .map(([key]) => key.replace(/_/g, " "));
  const whatsappMsg = `Hello Irha Apparels — I'm interested in ${product.name} (${collectionName}, ${category.name}). Product page: ${url}`;
  const fallbackDescription = `${product.name} custom B2B manufacturing by Irha Apparels in Sialkot. OEM, ODM and private-label requirements are reviewed before quotation and production commitments.`;
  const metaDescription = product.seo_description ?? product.description?.slice(0, 158) ?? fallbackDescription;
  const serviceId = `${url}#service`;
  const productImageAlt = `Custom ${product.primary_material ? `${product.primary_material} ` : ""}${product.name} wholesale manufacturer in Sialkot Pakistan`;
  const breadcrumbItems = [
    { name: "Home", path: "/" },
    { name: "Collections", path: "/products" },
    { name: category.name, path: `/products/${category.slug}` },
    ...(publishedRoute ? [{ name: audienceName, path: audiencePath }, { name: collectionName, path: collectionPath }] : []),
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
      about: { "@id": serviceId },
      mainEntity: { "@id": serviceId },
      inLanguage: "en",
    },
    {
      "@context": "https://schema.org",
      "@type": "Service",
      "@id": serviceId,
      name: `Custom ${product.name} Manufacturing`,
      serviceType: "B2B custom apparel manufacturing",
      description: product.description ?? fallbackDescription,
      provider: { "@id": ORGANIZATION_ID },
      areaServed: { "@type": "Place", name: "Worldwide" },
      category: `${category.name} > ${audienceName} > ${collectionName}`,
      url,
      image: gallery,
    },
    breadcrumbSchema(breadcrumbItems),
  ];

  return (
    <>
      <SEO
        title={product.seo_title ?? `${product.name} Wholesale Manufacturer | Sialkot Garment Factory`}
        description={metaDescription}
        path={canonicalPath}
        image={gallery[0]}
        type="product"
        jsonLd={jsonLd}
      />

      <section className="pt-32 pb-16">
        <div className="container-luxe">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-foreground/55 mb-8 flex-wrap">
            {breadcrumbItems.map((item, index) => (
              <span key={item.path} className="inline-flex items-center gap-2">
                {index > 0 && <ChevronRight size={12} aria-hidden="true" />}
                {index === breadcrumbItems.length - 1
                  ? <span className="text-foreground/80 truncate max-w-[40ch]">{item.name}</span>
                  : <Link to={item.path} className="hover:text-foreground">{item.name}</Link>}
              </span>
            ))}
          </nav>

          <div className="grid lg:grid-cols-12 gap-10 lg:gap-16">
            <div className="lg:col-span-7">
              <div className="relative aspect-[4/5] overflow-hidden bg-card mb-4">
                <img
                  src={gallery[activeImg] ?? gallery[0]}
                  alt={productImageAlt}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                />
              </div>
              {gallery.length > 1 && (
                <div className="grid grid-cols-4 gap-3">
                  {gallery.map((image, index) => (
                    <button key={image} onClick={() => setActiveImg(index)} aria-label={`View ${product.name} image ${index + 1}`} className={`aspect-square overflow-hidden border ${index === activeImg ? "border-primary" : "border-border/60"}`}>
                      <ThumbnailImage src={image} alt={`${productImageAlt}, view ${index + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-5">
              <p className="eyebrow mb-3">
                <Link to={collectionPath} className="hover:text-primary">{collectionName}</Link>
                <span className="text-foreground/30 mx-2">·</span>
                {audienceName}
              </p>
              <h1 className="font-display text-3xl md:text-4xl leading-[1.05]">{product.name}</h1>
              {product.sku && <p className="mt-2 text-[10px] uppercase tracking-[0.3em] text-foreground/50">SKU · {product.sku}</p>}
              {(product.short_description ?? product.description) && <p className="mt-5 text-foreground/75 leading-relaxed">{product.short_description ?? product.description}</p>}

              {product.specs?.length > 0 && (
                <ul className="mt-7 space-y-2">
                  {product.specs.map((specification) => (
                    <li key={specification} className="flex items-start gap-3 text-sm text-foreground/85"><span className="text-primary mt-1">✦</span> {specification}</li>
                  ))}
                </ul>
              )}

              <div className="mt-8 flex flex-wrap gap-3">
                <button type="button" onClick={() => shortlist.toggle(savedProduct)} aria-pressed={inInquiry} className={`inline-flex items-center gap-3 px-7 py-4 text-xs uppercase tracking-[0.3em] transition-colors ${inInquiry ? "border border-primary text-primary" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}>
                  {inInquiry ? <Check size={16} /> : <PackagePlus size={16} />}
                  {inInquiry ? "Added to Inquiry" : "Add to Inquiry"}
                </button>
                {inInquiry && <Link to="/inquiry-cart" className="inline-flex items-center gap-3 bg-gradient-gold px-7 py-4 text-xs uppercase tracking-[0.3em] text-primary-foreground"><ClipboardList size={16} /> Review Inquiry</Link>}
                <a href={whatsappLink(whatsappMsg)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-3 border border-gold/70 text-gold hover:bg-gold hover:text-background px-7 py-4 text-xs uppercase tracking-[0.3em] transition-colors"><MessageCircle size={16} /> WhatsApp</a>
                <button type="button" onClick={() => compare.toggle(savedProduct)} disabled={compareFull} aria-pressed={inCompare} className={`inline-flex items-center gap-2 border px-5 py-4 text-xs uppercase tracking-[0.3em] transition-colors ${inCompare ? "border-primary text-primary" : "border-border/60 hover:border-primary disabled:cursor-not-allowed disabled:opacity-45"}`}>
                  <GitCompareArrows size={16} />{inCompare ? "In Compare" : compareFull ? "Compare Full" : "Compare"}
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.25em]">
                <Link to="/inquiry-cart" className="text-foreground/60 hover:text-primary inline-flex items-center gap-2"><Upload size={12} /> Upload tech pack in inquiry cart</Link>
                <span className="text-foreground/25">·</span>
                <Link to={`/products/${category.slug}/${product.slug}/spec-sheet`} className="text-foreground/60 hover:text-primary inline-flex items-center gap-2"><Printer size={12} /> Print spec sheet</Link>
              </div>

              {b2bRows.length > 0 && (
                <div className="mt-9 border-y border-border/60 divide-y divide-border/60">
                  {b2bRows.map((row) => <div key={row.label} className="grid grid-cols-[minmax(120px,0.8fr)_1.4fr] gap-4 py-3 text-sm"><span className="text-foreground/50">{row.label}</span><span className="text-foreground/85">{row.value}</span></div>)}
                </div>
              )}

              {(customEnabled.length > 0 || legacyDetails.length > 0) && (
                <div className="mt-9 grid gap-6">
                  {customEnabled.length > 0 && <div><h2 className="font-display text-2xl">Customization</h2><p className="mt-3 text-sm text-foreground/70 capitalize">{customEnabled.join(" · ")}</p></div>}
                  {legacyDetails.length > 0 && <div className="grid sm:grid-cols-2 gap-4">{legacyDetails.map((detail) => <div key={detail.label} className="border border-border/60 p-4"><p className="text-[10px] uppercase tracking-[0.2em] text-foreground/45">{detail.label}</p><p className="mt-2 text-sm">{detail.value}</p></div>)}</div>}
                </div>
              )}
            </div>
          </div>

          {relatedProducts.length > 0 && (
            <section className="mt-20 border-t border-border/60 pt-12" aria-labelledby="related-products">
              <h2 id="related-products" className="font-display text-3xl">Related manufacturing programs</h2>
              <div className="mt-7 grid grid-cols-2 md:grid-cols-4 gap-4">
                {relatedProducts.map((related) => {
                  const route = findPublishedProductRoute(taxonomyRelease.data, related.id, related.slug);
                  const path = route?.canonicalPath ?? fallbackProductPath(category.slug, related.slug);
                  return <Link key={related.id} to={path} className="group"><div className="aspect-square bg-card overflow-hidden">{related.image_url && <img src={related.image_url} alt={related.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}</div><h3 className="font-display text-lg mt-3 group-hover:text-primary">{related.name}</h3></Link>;
                })}
              </div>
            </section>
          )}
        </div>
      </section>
    </>
  );
}
