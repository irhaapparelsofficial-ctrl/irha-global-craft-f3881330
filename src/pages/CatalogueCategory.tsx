import { Helmet } from "react-helmet-async";
import { Link, Navigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, ChevronRight, MessageCircle, Send, Share2 } from "lucide-react";
import ThumbnailImage from "@/components/ThumbnailImage";
import { supabase } from "@/integrations/supabase/client";
import { whatsappLink, BRAND } from "@/lib/constants";
import { CATALOGUE_GROUPS, findCatalogueGroup, matchesCategorySlug } from "@/lib/catalogueGroups";
import CatalogueLeadForm from "@/components/CatalogueLeadForm";

const SITE = "https://irhaapparels.com";
const OG_IMAGE = `${SITE}/og-image.jpg`;
const CANONICAL_TOP_SLUGS = new Set([
  "bavarian-trachten-wear",
  "premium-leather-apparel",
  "sportswear",
  "streetwear-activewear",
  "leisure-nightwear",
]);

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
  category_id: string;
};

type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  parent_id: string | null;
};

type CategoryMeta = {
  name: string;
  topSlug: string;
};

export default function CatalogueCategory() {
  const { slug = "" } = useParams<{ slug: string }>();
  const group = findCatalogueGroup(slug);

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);
  const [categoryMeta, setCategoryMeta] = useState<Record<string, CategoryMeta>>({});

  useEffect(() => {
    if (!group) return;
    let cancelled = false;

    void (async () => {
      setLoading(true);

      const { data: categoryData, error: categoryError } = await supabase
        .from("categories")
        .select("id, slug, name, parent_id")
        .eq("is_published", true)
        .order("sort_order", { ascending: true });

      if (categoryError || !categoryData) {
        if (!cancelled) {
          setProducts([]);
          setCategoryMeta({});
          setLoading(false);
        }
        return;
      }

      const categories = categoryData as CategoryRow[];
      const byId = new Map(categories.map((category) => [category.id, category]));
      const specificPatterns = group.categorySlugs.filter((pattern) => !CANONICAL_TOP_SLUGS.has(pattern));
      const specificChildren = categories.filter(
        (category) => category.parent_id && matchesCategorySlug(category.slug, specificPatterns),
      );

      let selectedCategories: CategoryRow[];
      if (specificChildren.length > 0) {
        selectedCategories = specificChildren;
      } else {
        const seeds = categories.filter((category) => matchesCategorySlug(category.slug, group.categorySlugs));
        const seedIds = new Set(seeds.map((category) => category.id));
        selectedCategories = categories.filter(
          (category) => seedIds.has(category.id) || (!!category.parent_id && seedIds.has(category.parent_id)),
        );
      }

      const selectedIds = selectedCategories.map((category) => category.id);
      if (selectedIds.length === 0) {
        if (!cancelled) {
          setProducts([]);
          setCategoryMeta({});
          setLoading(false);
        }
        return;
      }

      const meta: Record<string, CategoryMeta> = {};
      for (const category of selectedCategories) {
        const top = category.parent_id ? byId.get(category.parent_id) : category;
        meta[category.id] = {
          name: category.name,
          topSlug: top?.slug ?? category.slug,
        };
      }

      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("id, slug, name, description, image_url, category_id")
        .eq("is_published", true)
        .in("category_id", selectedIds)
        .order("sort_order", { ascending: true })
        .limit(120);

      if (!cancelled) {
        setProducts(productError ? [] : ((productData as ProductRow[]) ?? []));
        setCategoryMeta(meta);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [group]);

  if (!group) return <Navigate to="/catalogue" replace />;

  const pageUrl = `${SITE}/catalogue/${group.slug}`;
  const title = `${group.name} Catalogue | Irha Apparels`;
  const desc = `${group.description} Product specifications and commercial terms are confirmed after requirement review.`;

  const jsonLd = useMemo(() => [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Catalogue", item: `${SITE}/catalogue` },
        { "@type": "ListItem", position: 2, name: group.name, item: pageUrl },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `${group.name} Catalogue`,
      description: desc,
      url: pageUrl,
      isPartOf: { "@type": "WebSite", name: BRAND.name, url: SITE },
      publisher: {
        "@type": "Organization",
        name: BRAND.name,
        url: SITE,
        logo: `${SITE}/icon-512x512.png`,
      },
      mainEntity: {
        "@type": "ItemList",
        itemListElement: products.slice(0, 50).map((product, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "Product",
            name: product.name,
            description: product.description || group.description,
            image: product.image_url || OG_IMAGE,
            url: `${SITE}/products/${categoryMeta[product.category_id]?.topSlug ?? "products"}/${product.slug}`,
            brand: { "@type": "Brand", name: BRAND.name },
            manufacturer: {
              "@type": "Organization",
              name: BRAND.name,
              address: { "@type": "PostalAddress", addressLocality: "Sialkot", addressCountry: "PK" },
            },
          },
        })),
      },
    },
  ], [categoryMeta, desc, group.description, group.name, pageUrl, products]);

  const shareText = `${group.name} catalogue — Irha Apparels, Sialkot. Custom B2B apparel programs.`;

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={desc} />
        <link rel="canonical" href={pageUrl} />
        <link rel="alternate" hrefLang="en" href={pageUrl} />
        <link rel="alternate" hrefLang="x-default" href={pageUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={`${group.name} — B2B Catalogue | Irha Apparels`} />
        <meta property="og:description" content={desc} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:image" content={OG_IMAGE} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="Irha Apparels" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${group.name} — B2B Catalogue`} />
        <meta name="twitter:description" content={desc} />
        <meta name="twitter:image" content={OG_IMAGE} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <nav aria-label="Breadcrumb" className="container-luxe pt-28 md:pt-32 text-xs text-foreground/55">
        <Link to="/" className="hover:text-gold">Home</Link>
        <ChevronRight size={12} className="inline mx-1" />
        <Link to="/catalogue" className="hover:text-gold">Catalogue</Link>
        <ChevronRight size={12} className="inline mx-1" />
        <span className="text-foreground/80">{group.name}</span>
      </nav>

      <section className="pt-6 pb-10 border-b border-border/60">
        <div className="container-luxe">
          <p className="eyebrow mb-3">{group.nameDe}</p>
          <h1 className="font-display text-4xl md:text-6xl leading-[0.95] max-w-4xl">
            {group.name} <span className="text-gold italic">Catalogue</span>
          </h1>
          <p className="text-foreground/70 mt-5 max-w-3xl text-sm md:text-base leading-relaxed">{group.description}</p>

          <div className="flex flex-wrap gap-3 mt-7">
            <button onClick={() => setLeadOpen(true)} className="inline-flex items-center gap-3 bg-gradient-gold text-primary-foreground px-6 py-3.5 text-xs uppercase tracking-[0.3em] hover:shadow-gold transition-all">
              <Send size={14} /> Discuss Requirement
            </button>
            <a href={whatsappLink(`Hi, I'd like to discuss ${group.name} requirements.`)} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-3 border border-gold/60 text-gold px-6 py-3.5 text-xs uppercase tracking-[0.3em] hover:bg-gold hover:text-primary-foreground transition-all">
              <MessageCircle size={14} /> WhatsApp
            </a>
            <button onClick={() => setShareOpen((value) => !value)} className="inline-flex items-center gap-3 border border-border text-foreground/80 px-6 py-3.5 text-xs uppercase tracking-[0.3em] hover:border-gold hover:text-gold transition-all">
              <Share2 size={14} /> Share
            </button>
          </div>

          {shareOpen && (
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <a className="border border-border/60 px-4 py-2 hover:border-gold hover:text-gold" target="_blank" rel="noreferrer noopener" href={`https://wa.me/?text=${encodeURIComponent(shareText + " " + pageUrl)}`}>WhatsApp</a>
              <a className="border border-border/60 px-4 py-2 hover:border-gold hover:text-gold" target="_blank" rel="noreferrer noopener" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`}>Facebook</a>
              <a className="border border-border/60 px-4 py-2 hover:border-gold hover:text-gold" target="_blank" rel="noreferrer noopener" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`}>LinkedIn</a>
              <button className="border border-border/60 px-4 py-2 hover:border-gold hover:text-gold" onClick={() => navigator.clipboard?.writeText(pageUrl)}>Copy link</button>
            </div>
          )}
        </div>
      </section>

      <div className="border-b border-border/60 bg-card/30">
        <div className="container-luxe py-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px] md:text-xs uppercase tracking-[0.22em] text-foreground/65 text-center">
          <span>MOQ reviewed per program</span>
          <span>Sampling reviewed per product</span>
          <span>Shipping reviewed per destination</span>
          <span>OEM · ODM · Private Label</span>
        </div>
      </div>

      <section className="py-12 md:py-16">
        <div className="container-luxe">
          {loading ? (
            <div className="text-center text-muted-foreground text-xs uppercase tracking-[0.3em] py-20">Loading products…</div>
          ) : products.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-foreground/70">No published products are currently mapped to this catalogue.</p>
              <button onClick={() => setLeadOpen(true)} className="mt-6 inline-flex items-center gap-2 border border-gold text-gold px-6 py-3 text-xs uppercase tracking-[0.3em] hover:bg-gold hover:text-primary-foreground transition-colors">
                Discuss a custom requirement
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {products.map((product) => {
                const meta = categoryMeta[product.category_id];
                const productHref = meta ? `/products/${meta.topSlug}/${product.slug}` : "/products";
                return (
                  <article key={product.id} className="group border border-border/60 bg-card/30 overflow-hidden hover:border-gold transition-colors flex flex-col">
                    <Link to={productHref} className="aspect-[4/5] bg-card relative overflow-hidden block">
                      {product.image_url ? (
                        <ThumbnailImage src={product.image_url} alt={`${product.name} — custom B2B apparel`} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-foreground/30 text-xs uppercase tracking-[0.2em]">{group.name}</div>
                      )}
                    </Link>
                    <div className="p-4 md:p-5 flex flex-col flex-1">
                      <p className="text-[10px] uppercase tracking-[0.25em] text-gold/70">{meta?.name || group.name}</p>
                      <Link to={productHref} className="font-display text-base md:text-lg mt-1 leading-tight hover:text-gold transition-colors">{product.name}</Link>
                      {product.description && <p className="text-foreground/60 text-xs mt-2 line-clamp-2">{product.description}</p>}
                      <div className="mt-auto pt-4 flex items-center gap-2">
                        <button onClick={() => setLeadOpen(true)} className="flex-1 text-[10px] uppercase tracking-[0.2em] border border-gold/60 text-gold py-2 hover:bg-gold hover:text-primary-foreground transition-colors">Discuss</button>
                        <a href={whatsappLink(`Hi, I'm interested in ${product.name} (${group.name}).`)} target="_blank" rel="noreferrer noopener" aria-label={`WhatsApp inquiry for ${product.name}`} className="text-[10px] uppercase tracking-[0.2em] border border-border py-2 px-3 text-foreground/70 hover:border-gold hover:text-gold transition-colors">WhatsApp</a>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="py-12 md:py-16 border-t border-border/60 bg-card/20">
        <div className="container-luxe">
          <p className="eyebrow mb-6">Other catalogues</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {CATALOGUE_GROUPS.filter((item) => item.slug !== group.slug).map((item) => (
              <Link key={item.slug} to={`/catalogue/${item.slug}`} className="group border border-border/60 p-4 hover:border-gold transition-colors">
                <p className="font-display text-base leading-tight group-hover:text-gold transition-colors">{item.name}</p>
                <ArrowUpRight size={12} className="mt-2 text-foreground/40 group-hover:text-gold transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {leadOpen && (
        <CatalogueLeadForm
          onClose={() => setLeadOpen(false)}
          catalogueUrl={pageUrl}
          source={`catalogue:${group.slug}`}
          categoryInterest={group.name}
        />
      )}
    </>
  );
}
