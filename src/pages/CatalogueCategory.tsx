import { Helmet } from "react-helmet-async";
import { Link, Navigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowUpRight, ChevronRight, MessageCircle, Send, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { whatsappLink, BRAND } from "@/lib/constants";
import { CATALOGUE_GROUPS, findCatalogueGroup, matchSlugClauses } from "@/lib/catalogueGroups";
import CatalogueLeadForm from "@/components/CatalogueLeadForm";

const SITE = "https://www.irhaapparels.com";
const OG_IMAGE = `${SITE}/og-image.jpg`;

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
  category_id: string;
};

type CategoryRow = { id: string; slug: string; name: string };

export default function CatalogueCategory() {
  const { slug = "" } = useParams<{ slug: string }>();
  const group = findCatalogueGroup(slug);

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);
  const [catNameById, setCatNameById] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!group) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      const { exact, like } = matchSlugClauses(group.categorySlugs);

      // Resolve matching categories.
      let catQuery = supabase.from("categories").select("id, slug, name").eq("is_published", true);
      const ors: string[] = [];
      if (exact.length) ors.push(`slug.in.(${exact.join(",")})`);
      like.forEach((l) => ors.push(`slug.ilike.${l}`));
      if (ors.length) catQuery = catQuery.or(ors.join(","));

      const { data: cats } = await catQuery;
      const catRows = (cats as CategoryRow[]) || [];
      const nameMap: Record<string, string> = {};
      catRows.forEach((c) => { nameMap[c.id] = c.name; });
      const ids = catRows.map((c) => c.id);

      if (ids.length === 0) {
        if (!cancel) { setProducts([]); setCatNameById({}); setLoading(false); }
        return;
      }

      const { data: prods } = await supabase
        .from("products")
        .select("id, slug, name, description, image_url, category_id")
        .eq("is_published", true)
        .in("category_id", ids)
        .order("sort_order", { ascending: true })
        .limit(120);

      if (!cancel) {
        setProducts((prods as ProductRow[]) || []);
        setCatNameById(nameMap);
        setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [group]);

  if (!group) return <Navigate to="/catalogue" replace />;

  const pageUrl = `${SITE}/catalogue/${group.slug}`;
  const title = `${group.name} Catalogue — Manufacturer Pakistan | Irha Apparels`;
  const desc = `${group.description} OEM, ODM and private label production from Sialkot.`;

  const jsonLd = [
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
        itemListElement: products.slice(0, 50).map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          item: {
            "@type": "Product",
            name: p.name,
            description: p.description || group.description,
            image: p.image_url || OG_IMAGE,
            url: `${SITE}/products/${catNameById[p.category_id] ? Object.keys(catNameById)[0] : ""}/${p.slug}`,
            brand: { "@type": "Brand", name: BRAND.name },
            manufacturer: { "@type": "Organization", name: BRAND.name, address: "Sialkot, Pakistan" },
          },
        })),
      },
    },
  ];

  const shareText = `${group.name} catalogue — Irha Apparels (Sialkot). OEM • ODM • Private Label.`;

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

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="container-luxe pt-28 md:pt-32 text-xs text-foreground/55">
        <Link to="/" className="hover:text-gold">Home</Link>
        <ChevronRight size={12} className="inline mx-1" />
        <Link to="/catalogue" className="hover:text-gold">Catalogue</Link>
        <ChevronRight size={12} className="inline mx-1" />
        <span className="text-foreground/80">{group.name}</span>
      </nav>

      {/* Hero */}
      <section className="pt-6 pb-10 border-b border-border/60">
        <div className="container-luxe">
          <p className="eyebrow mb-3">{group.nameDe}</p>
          <h1 className="font-display text-4xl md:text-6xl leading-[0.95] max-w-4xl">
            {group.name} <span className="text-gold italic">Catalogue</span>
          </h1>
          <p className="text-foreground/70 mt-5 max-w-3xl text-sm md:text-base leading-relaxed">
            {group.description}
          </p>

          <div className="flex flex-wrap gap-3 mt-7">
            <button
              onClick={() => setLeadOpen(true)}
              className="inline-flex items-center gap-3 bg-gradient-gold text-primary-foreground px-6 py-3.5 text-xs uppercase tracking-[0.3em] hover:shadow-gold transition-all"
            >
              <Send size={14} /> Request Quote
            </button>
            <a
              href={whatsappLink(`Hi, I'd like ${group.name} catalogue & pricing.`)}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-3 border border-gold/60 text-gold px-6 py-3.5 text-xs uppercase tracking-[0.3em] hover:bg-gold hover:text-primary-foreground transition-all"
            >
              <MessageCircle size={14} /> WhatsApp
            </a>
            <button
              onClick={() => setShareOpen((v) => !v)}
              className="inline-flex items-center gap-3 border border-border text-foreground/80 px-6 py-3.5 text-xs uppercase tracking-[0.3em] hover:border-gold hover:text-gold transition-all"
            >
              <Share2 size={14} /> Share
            </button>
          </div>

          {shareOpen && (
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <a className="border border-border/60 px-4 py-2 hover:border-gold hover:text-gold" target="_blank" rel="noreferrer noopener"
                 href={`https://wa.me/?text=${encodeURIComponent(shareText + " " + pageUrl)}`}>WhatsApp</a>
              <a className="border border-border/60 px-4 py-2 hover:border-gold hover:text-gold" target="_blank" rel="noreferrer noopener"
                 href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`}>Facebook</a>
              <a className="border border-border/60 px-4 py-2 hover:border-gold hover:text-gold" target="_blank" rel="noreferrer noopener"
                 href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`}>LinkedIn</a>
              <button className="border border-border/60 px-4 py-2 hover:border-gold hover:text-gold" onClick={() => navigator.clipboard?.writeText(pageUrl)}>Copy link</button>
            </div>
          )}
        </div>
      </section>

      {/* Trust strip */}
      <div className="border-b border-border/60 bg-card/30">
        <div className="container-luxe py-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px] md:text-xs uppercase tracking-[0.25em] text-foreground/65 text-center">
          <span>Flexible MOQ</span>
          <span className="hidden md:inline">|</span>
          <span>program-based production timeline</span>
          <span className="hidden md:inline">|</span>
          <span>FOB Sialkot</span>
          <span>OEM • ODM • Private Label</span>
        </div>
      </div>

      {/* Products grid */}
      <section className="py-12 md:py-16">
        <div className="container-luxe">
          {loading ? (
            <div className="text-center text-muted-foreground text-xs uppercase tracking-[0.3em] py-20">Loading products…</div>
          ) : products.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-foreground/70">No products in this catalogue yet.</p>
              <button onClick={() => setLeadOpen(true)} className="mt-6 inline-flex items-center gap-2 border border-gold text-gold px-6 py-3 text-xs uppercase tracking-[0.3em] hover:bg-gold hover:text-primary-foreground transition-colors">
                Request a custom quote
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {products.map((p) => {
                const catSlug = catNameById[p.category_id] ? Object.keys(catNameById).find((k) => k === p.category_id) : undefined;
                const productHref = `/products/${catSlug ? "" : ""}`; // fallback link to RFQ if no slug context
                return (
                  <article key={p.id} className="group border border-border/60 bg-card/30 overflow-hidden hover:border-gold transition-colors flex flex-col">
                    <div className="aspect-[4/5] bg-card relative overflow-hidden">
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={`${p.name} — ${group.name} manufacturer Pakistan`}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-foreground/30 text-xs uppercase tracking-[0.2em]">
                          {group.name}
                        </div>
                      )}
                    </div>
                    <div className="p-4 md:p-5 flex flex-col flex-1">
                      <p className="text-[10px] uppercase tracking-[0.25em] text-gold/70">
                        {catNameById[p.category_id] || group.name}
                      </p>
                      <h3 className="font-display text-base md:text-lg mt-1 leading-tight">{p.name}</h3>
                      {p.description && (
                        <p className="text-foreground/60 text-xs mt-2 line-clamp-2">{p.description}</p>
                      )}
                      <div className="mt-auto pt-4 flex items-center gap-2">
                        <button
                          onClick={() => setLeadOpen(true)}
                          className="flex-1 text-[10px] uppercase tracking-[0.2em] border border-gold/60 text-gold py-2 hover:bg-gold hover:text-primary-foreground transition-colors"
                        >
                          Quote
                        </button>
                        <a
                          href={whatsappLink(`Hi, I'm interested in: ${p.name} (${group.name}).`)}
                          target="_blank"
                          rel="noreferrer noopener"
                          aria-label={`WhatsApp inquiry for ${p.name}`}
                          className="text-[10px] uppercase tracking-[0.2em] border border-border py-2 px-3 text-foreground/70 hover:border-gold hover:text-gold transition-colors"
                        >
                          <MessageCircle size={12} className="inline" />
                        </a>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Other catalogue groups */}
      <section className="py-12 md:py-16 border-t border-border/60 bg-card/20">
        <div className="container-luxe">
          <p className="eyebrow mb-6">Other catalogues</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {CATALOGUE_GROUPS.filter((g) => g.slug !== group.slug).map((g) => (
              <Link key={g.slug} to={`/catalogue/${g.slug}`} className="group border border-border/60 p-4 hover:border-gold transition-colors">
                <p className="font-display text-base leading-tight group-hover:text-gold transition-colors">{g.name}</p>
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
