import { useEffect, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import SEO from "@/components/SEO";
import { useProductBySlug } from "@/hooks/useCatalog";
import { resolveAsset, resolveGallery } from "@/lib/assetResolver";
import { ChevronRight, MessageCircle } from "lucide-react";
import { whatsappLink } from "@/lib/constants";

const SITE = "https://www.irhaapparels.com";

export default function ProductDetail() {
  const { categorySlug, productSlug } = useParams<{ categorySlug: string; productSlug: string }>();
  const { data, isLoading, error } = useProductBySlug(categorySlug, productSlug);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => setActiveImg(0), [productSlug]);

  if (isLoading) {
    return <div className="pt-40 pb-20 container-luxe text-sm text-muted-foreground">Loading product…</div>;
  }
  if (error || !data) return <Navigate to={`/products/${categorySlug ?? ""}`} replace />;

  const { category, product } = data;
  const gallery = resolveGallery(product.gallery.length ? product.gallery : [product.image_url ?? ""]);
  const url = `${SITE}/products/${category.slug}/${product.slug}`;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      description: product.description ?? "",
      image: gallery,
      brand: { "@type": "Brand", name: "Irha Apparels" },
      category: category.name,
      url,
      offers: {
        "@type": "Offer",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
        seller: { "@type": "Organization", name: "Irha Apparels" },
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
        { "@type": "ListItem", position: 2, name: "Collections", item: `${SITE}/products` },
        { "@type": "ListItem", position: 3, name: category.name, item: `${SITE}/products/${category.slug}` },
        { "@type": "ListItem", position: 4, name: product.name, item: url },
      ],
    },
  ];

  return (
    <>
      <SEO
        title={product.seo_title ?? `${product.name} | ${category.name} Manufacturer | Irha Apparels`}
        description={product.seo_description ?? (product.description ?? "").slice(0, 158)}
        path={`/products/${category.slug}/${product.slug}`}
        image={gallery[0]}
        type="article"
        jsonLd={jsonLd}
      />

      <section className="pt-32 pb-16">
        <div className="container-luxe">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-foreground/55 mb-8">
            <Link to="/" className="hover:text-foreground">Home</Link>
            <ChevronRight size={12} />
            <Link to="/products" className="hover:text-foreground">Collections</Link>
            <ChevronRight size={12} />
            <Link to={`/products/${category.slug}`} className="hover:text-foreground">{category.name}</Link>
            <ChevronRight size={12} />
            <span className="text-foreground/80 truncate max-w-[40ch]">{product.name}</span>
          </nav>

          <div className="grid lg:grid-cols-12 gap-10 lg:gap-16">
            {/* Gallery */}
            <div className="lg:col-span-7">
              <div className="relative aspect-[4/5] overflow-hidden bg-card mb-4">
                <img
                  src={gallery[activeImg] ?? gallery[0]}
                  alt={product.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
              {gallery.length > 1 && (
                <div className="grid grid-cols-4 gap-3">
                  {gallery.map((g, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImg(i)}
                      className={`aspect-square overflow-hidden border ${i === activeImg ? "border-primary" : "border-border/60"}`}
                    >
                      <img src={g} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="lg:col-span-5">
              <p className="eyebrow mb-3">{category.name}</p>
              <h1 className="font-display text-3xl md:text-4xl leading-[1.05]">{product.name}</h1>
              {product.description && (
                <p className="mt-5 text-foreground/75 leading-relaxed">{product.description}</p>
              )}

              {product.specs?.length > 0 && (
                <ul className="mt-7 space-y-2">
                  {product.specs.map((s) => (
                    <li key={s} className="flex items-start gap-3 text-sm text-foreground/85">
                      <span className="text-primary mt-1">✦</span> {s}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href={whatsappLink(`Hello Irha Apparels — I'd like a quote for ${product.name} (${category.name}).`)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-3 bg-primary text-primary-foreground hover:bg-primary/90 px-7 py-4 text-xs uppercase tracking-[0.3em] transition-colors"
                >
                  <MessageCircle size={16} /> Request a Quote
                </a>
                <Link
                  to="/inquiry"
                  className="inline-flex items-center gap-3 border border-gold/70 text-gold hover:bg-gold hover:text-background px-7 py-4 text-xs uppercase tracking-[0.3em] transition-colors"
                >
                  Send Inquiry
                </Link>
              </div>

              {product.details?.length > 0 && (
                <div className="mt-10 border-t border-border/60 pt-8">
                  <p className="eyebrow mb-5">Specification Sheet</p>
                  <dl className="divide-y divide-border/60">
                    {product.details.map((d, i) => (
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
        </div>
      </section>
    </>
  );
}
