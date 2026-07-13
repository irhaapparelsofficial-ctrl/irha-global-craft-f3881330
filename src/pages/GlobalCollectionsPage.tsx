import { ArrowRight, Layers3, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import CategoryAudienceNavigator from "@/components/CategoryAudienceNavigator";
import { usePublicCategories } from "@/hooks/usePublicCategoryData";
import { buildCategoryTaxonomy } from "@/lib/globalCategoryTaxonomy";
import { whatsappLink } from "@/lib/constants";

const SITE = "https://irhaapparels.com";

export default function GlobalCollectionsPage() {
  const { categories, isLoading } = usePublicCategories();
  const totalProducts = categories.reduce((total, category) => total + category.productCount, 0);

  if (isLoading && categories.length === 0) {
    return <div className="pt-40 pb-24 container-luxe text-sm text-foreground/60">Loading collections…</div>;
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Custom Apparel Manufacturing Categories",
    url: `${SITE}/products`,
    description:
      "B2B apparel manufacturing categories organised by buyer audience and product type, including Bavarian Trachten, leather apparel, sportswear, streetwear, activewear, leisurewear and nightwear.",
    isPartOf: { "@type": "WebSite", name: "Irha Apparels", url: `${SITE}/` },
    hasPart: categories.map((category) => ({
      "@type": "CollectionPage",
      name: category.name,
      url: `${SITE}/products/${category.slug}`,
    })),
  };

  return (
    <>
      <SEO
        title="Custom Apparel Manufacturing Categories | Wholesale & Private Label | Irha Apparels"
        description="Browse Irha Apparels by main category, Men, Women, Kids and relevant buyer program, then open product categories and individual products. B2B wholesale, OEM and private-label manufacturing."
        path="/products"
        jsonLd={jsonLd}
      />

      <section className="pt-40 pb-16 border-b border-border/60">
        <div className="container-luxe">
          <p className="eyebrow mb-5">Global B2B Product Architecture</p>
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl leading-[0.95] max-w-6xl">
            Main category to <span className="text-gold italic">buyer-ready product</span>.
          </h1>
          <p className="mt-8 text-lg text-foreground/70 max-w-3xl leading-relaxed">
            Choose a manufacturing category, then browse Men, Women, Kids or the relevant buyer group. Each audience opens focused product categories and individual styles for quotation.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/products/all"
              className="inline-flex items-center gap-3 border border-border/60 hover:border-primary hover:text-primary px-7 py-4 text-xs uppercase tracking-[0.25em]"
            >
              Search all {totalProducts || ""} products <ArrowRight size={14} aria-hidden="true" />
            </Link>
            <a
              href={whatsappLink("Hello Irha Apparels — please help me choose the right product category for my B2B program.")}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-3 bg-primary text-primary-foreground hover:bg-primary/90 px-7 py-4 text-xs uppercase tracking-[0.25em]"
            >
              <MessageCircle size={15} aria-hidden="true" /> Discuss a buyer program
            </a>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container-luxe space-y-20">
          {categories.map((category, index) => {
            const taxonomy = buildCategoryTaxonomy(category);
            const audienceCount = taxonomy.audiences.length;
            const collectionCount = taxonomy.audiences.reduce((total, audience) => total + audience.collections.length, 0);
            return (
              <article key={category.slug} className="border-b border-border/60 pb-20 last:border-b-0">
                <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center mb-8">
                  <Link to={`/products/${category.slug}`} className="lg:col-span-4 block group">
                    <div className="aspect-[4/3] overflow-hidden bg-card">
                      {category.image && (
                        <img
                          src={category.image}
                          alt={category.name}
                          loading={index === 0 ? "eager" : "lazy"}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                      )}
                    </div>
                  </Link>
                  <div className="lg:col-span-8">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-gold mb-3 inline-flex items-center gap-2">
                      <Layers3 size={13} aria-hidden="true" /> {audienceCount} buyer groups · {collectionCount} product categories
                    </p>
                    <h2 className="font-display text-3xl md:text-5xl">
                      <Link to={`/products/${category.slug}`} className="hover:text-primary">{category.name}</Link>
                    </h2>
                    <p className="mt-4 text-foreground/65 leading-relaxed max-w-3xl">{category.description}</p>
                    <Link
                      to={`/products/${category.slug}`}
                      className="mt-5 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-primary"
                    >
                      Open category hierarchy <ArrowRight size={13} aria-hidden="true" />
                    </Link>
                  </div>
                </div>
                <CategoryAudienceNavigator category={category} compact />
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}
