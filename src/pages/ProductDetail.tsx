import { useEffect, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import SEO from "@/components/SEO";
import { usePublicProduct } from "@/hooks/usePublicCatalog";
import { resolveGallery } from "@/lib/assetResolver";
import { supabase } from "@/integrations/supabase/client";
import type { DbProduct } from "@/hooks/useCatalog";
import { Bookmark, BookmarkCheck, ChevronRight, MessageCircle, Printer, Upload } from "lucide-react";
import { whatsappLink } from "@/lib/constants";
import { useShortlist, pushRecentlyViewed } from "@/lib/shortlist";
import {
  ORGANIZATION_ID,
  SITE_URL,
  WEBSITE_ID,
  breadcrumbSchema,
} from "@/lib/seoSchema";

export default function ProductDetail() {
  const { categorySlug, productSlug } = useParams<{ categorySlug: string; productSlug: string }>();
  const { data, isLoading, error } = usePublicProduct(categorySlug, productSlug);
  const [activeImg, setActiveImg] = useState(0);
  const shortlist = useShortlist();

  useEffect(() => setActiveImg(0), [productSlug]);

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

  const related = useQuery({
    queryKey: ["related-products", data?.product.id],
    enabled: !!data?.product.id,
    staleTime: 60_000,
    queryFn: async (): Promise<DbProduct[]> => {
      if (!data) return [];
      const manual = data.product.related_product_ids ?? [];
      if (manual.length > 0) {
        const { data: rows } = await supabase
          .from("products")
          .select("*")
          .in("id", manual)
          .eq("is_published", true);
        if (rows && rows.length > 0) return rows as unknown as DbProduct[];
      }
      const { data: rows } = await supabase
        .from("products")
        .select("*")
        .eq("category_id", data.subCategory.id)
        .eq("is_published", true)
        .neq("id", data.product.id)
        .order("sort_order", { ascending: true })
        .limit(4);
      return (rows ?? []) as unknown as DbProduct[];
    },
  });

  if (isLoading) {
    return <div className="pt-40 pb-20 container-luxe text-sm text-muted-foreground">Loading product…</div>;
  }
  if (error || !data) {
    return <Navigate to={`/products/${categorySlug ?? ""}`} replace />;
  }

  const category = { slug: data.topCategory.slug, name: data.topCategory.name };
  const subCat = data.subCategory;
  const product = data.product;
  const gallery = resolveGallery(product.gallery.length ? product.gallery : [product.image_url ?? ""]);
  const url = `${SITE_URL}/products/${category.slug}/${product.slug}`;

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
  if (product.available_sizes && product.available_sizes.length > 0) {
    b2bRows.push({ label: "Sizes", value: product.available_sizes.join(", ") });
  }
  if (product.available_colors && product.available_colors.length > 0) {
    b2bRows.push({ label: "Colors", value: product.available_colors.join(", ") });
  }
  pushIf("Packaging", product.packaging_standard);

  const legacyDetails = (product.details ?? []).filter((d) => !/(moq|lead time)/i.test(d.label));

  const custom = product.customization ?? {};
  const customEnabled = Object.entries(custom)
    .filter(([, v]) => v === true)
    .map(([k]) => k.replace(/_/g, " "));

  const whatsappMsg = `Hello Irha Apparels — I'm interested in ${product.name} (${subCat.name}, ${category.name}). Product page: ${url}`;
  const fallbackDescription = `${product.name} custom B2B manufacturing by Irha Apparels in Sialkot. OEM, ODM and private-label requirements are reviewed before quotation and production commitments.`;
  const metaDescription = product.seo_description ?? product.description?.slice(0, 158) ?? fallbackDescription;
  const serviceId = `${url}#service`;

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
      category: `${category.name} > ${subCat.name}`,
      url,
      image: gallery,
    },
    breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Collections", path: "/products" },
      { name: category.name, path: `/products/${category.slug}` },
      { name: product.name, path: `/products/${category.slug}/${product.slug}` },
    ]),
  ];

  return (
    <>
      <SEO
        title={product.seo_title ?? `${product.name} | ${category.name} Manufacturer | Irha Apparels`}
        description={metaDescription}
        path={`/products/${category.slug}/${product.slug}`}
        image={gallery[0]}
        type="product"
        jsonLd={jsonLd}
      />

      <section className="pt-32 pb-16">
        <div className="container-luxe">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-foreground/55 mb-8 flex-wrap">
            <Link to="/" className="hover:text-foreground">Home</Link>
            <ChevronRight size={12} />
            <Link to="/products" className="hover:text-foreground">Collections</Link>
            <ChevronRight size={12} />
            <Link to={`/products/${category.slug}`} className="hover:text-foreground">{category.name}</Link>
            <ChevronRight size={12} />
            <span className="text-foreground/80 truncate max-w-[40ch]">{product.name}</span>
          </nav>

          <div className="grid lg:grid-cols-12 gap-10 lg:gap-16">
            <div className="lg:col-span-7">
              <div className="relative aspect-[4/5] overflow-hidden bg-card mb-4">
                <img src={gallery[activeImg] ?? gallery[0]} alt={product.name} className="absolute inset-0 w-full h-full object-cover" />
              </div>
              {gallery.length > 1 && (
                <div className="grid grid-cols-4 gap-3">
                  {gallery.map((g, i) => (
                    <button key={i} onClick={() => setActiveImg(i)} aria-label={`View image ${i + 1}`} className={`aspect-square overflow-hidden border ${i === activeImg ? "border-primary" : "border-border/60"}`}>
                      <img src={g} alt="" loading="lazy" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-5">
              <p className="eyebrow mb-3">
                <Link to={`/products/${category.slug}`} className="hover:text-primary">{category.name}</Link>
                <span className="text-foreground/30 mx-2">·</span>
                {subCat.name}
              </p>
              <h1 className="font-display text-3xl md:text-4xl leading-[1.05]">{product.name}</h1>
              {product.sku && <p className="mt-2 text-[10px] uppercase tracking-[0.3em] text-foreground/50">SKU · {product.sku}</p>}
              {(product.short_description ?? product.description) && <p className="mt-5 text-foreground/75 leading-relaxed">{product.short_description ?? product.description}</p>}

              {product.specs?.length > 0 && (
                <ul className="mt-7 space-y-2">
                  {product.specs.map((s) => (
                    <li key={s} className="flex items-start gap-3 text-sm text-foreground/85"><span className="text-primary mt-1">✦</span> {s}</li>
                  ))}
                </ul>
              )}

              <div className="mt-8 flex flex-wrap gap-3">
                <Link to={`/inquiry?intent=rfq&product=${encodeURIComponent(product.slug)}&name=${encodeURIComponent(product.name)}&category=${encodeURIComponent(category.slug)}`} className="inline-flex items-center gap-3 bg-primary text-primary-foreground hover:bg-primary/90 px-7 py-4 text-xs uppercase tracking-[0.3em] transition-colors">
                  Request a Quote
                </Link>
                <a href={whatsappLink(whatsappMsg)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-3 border border-gold/70 text-gold hover:bg-gold hover:text-background px-7 py-4 text-xs uppercase tracking-[0.3em] transition-colors">
                  <MessageCircle size={16} /> WhatsApp
                </a>
                <button type="button" onClick={() => shortlist.toggle({ slug: product.slug, name: product.name, image: product.image_url ?? gallery[0], categorySlug: category.slug, categoryName: category.name, addedAt: Date.now() })} aria-pressed={shortlist.has(product.slug)} aria-label={shortlist.has(product.slug) ? "Remove from shortlist" : "Save to shortlist"} className="inline-flex items-center gap-2 border border-border/60 hover:border-primary px-5 py-4 text-xs uppercase tracking-[0.3em] transition-colors">
                  {shortlist.has(product.slug) ? <BookmarkCheck size={16} className="text-primary" /> : <Bookmark size={16} />}
                  {shortlist.has(product.slug) ? "Saved" : "Save"}
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.25em]">
                <Link to={`/inquiry?product=${encodeURIComponent(product.slug)}&intent=reference`} className="text-foreground/60 hover:text-primary inline-flex items-center gap-2"><Upload size={12} /> Upload reference design</Link>
                <span className="text-foreground/25">·</span>
                <Link to={`/products/${category.slug}/${product.slug}/spec-sheet`} className="text-foreground/60 hover:text-primary inline-flex items-center gap-2"><Printer size={12} /> Print spec sheet</Link>
              </div>

              <p className="mt-6 text-[11px] md:text-xs text-foreground/60 leading-relaxed">
                <span className="text-gold">✓</span> Quotation-based pricing
                <span className="text-foreground/30 mx-2">|</span>
                <span className="text-gold">✓</span> OEM · ODM · Private Label
                <span className="text-foreground/30 mx-2">|</span>
                <span className="text-gold">✓</span> MOQ · Timeline · Shipping confirmed after review
              </p>

              {b2bRows.length > 0 && (
                <div className="mt-10 border-t border-border/60 pt-8">
                  <p className="eyebrow mb-5">Key B2B Information</p>
                  <dl className="divide-y divide-border/60">
                    {b2bRows.map((d, i) => (
                      <div key={i} className="grid grid-cols-3 gap-4 py-3">
                        <dt className="text-[11px] uppercase tracking-[0.22em] text-foreground/55">{d.label}</dt>
                        <dd className="col-span-2 text-sm text-foreground/85">{d.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {customEnabled.length > 0 && (
                <div className="mt-8 border-t border-border/60 pt-8">
                  <p className="eyebrow mb-4">Customization Available</p>
                  <ul className="flex flex-wrap gap-2">
                    {customEnabled.map((c) => <li key={c} className="inline-flex items-center px-3 py-1.5 border border-border/60 text-[11px] uppercase tracking-[0.22em] text-foreground/80 capitalize">{c}</li>)}
                  </ul>
                </div>
              )}

              {legacyDetails.length > 0 && (
                <div className="mt-8 border-t border-border/60 pt-8">
                  <p className="eyebrow mb-5">Additional Specifications</p>
                  <dl className="divide-y divide-border/60">
                    {legacyDetails.map((d, i) => (
                      <div key={i} className="grid grid-cols-3 gap-4 py-3">
                        <dt className="text-[11px] uppercase tracking-[0.22em] text-foreground/55">{d.label}</dt>
                        <dd className="col-span-2 text-sm text-foreground/85">{d.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>
          </div>

          {related.data && related.data.length > 0 && (
            <div className="mt-24 border-t border-border/60 pt-12">
              <p className="eyebrow mb-2">Related products</p>
              <h2 className="font-display text-2xl md:text-3xl mb-8">More from {subCat.name}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5 lg:gap-7">
                {related.data.map((r) => (
                  <Link key={r.id} to={`/products/${category.slug}/${r.slug}`} className="group flex flex-col text-left">
                    <div className="relative aspect-[3/4] overflow-hidden bg-card mb-3">
                      <img src={r.image_url ?? r.gallery?.[0] ?? ""} alt={r.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] group-hover:scale-105" />
                    </div>
                    <h4 className="font-display text-base leading-tight group-hover:text-primary transition-colors">{r.name}</h4>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/45 mt-2">MOQ confirmed after review</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
