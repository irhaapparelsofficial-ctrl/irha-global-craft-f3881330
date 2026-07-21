import { ArrowRight, Layers3, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import CategoryAudienceNavigator from "@/components/CategoryAudienceNavigator";
import HeroMediaSlideshow from "@/components/HeroMediaSlideshow";
import ThumbnailImage from "@/components/ThumbnailImage";
import { usePublicCategories, type NormalizedCategory } from "@/hooks/usePublicCategoryData";
import { usePublishedCategoryTaxonomy } from "@/hooks/usePublishedCatalogTaxonomy";
import { buildCategoryTaxonomy } from "@/lib/globalCategoryTaxonomy";
import { whatsappLink } from "@/lib/constants";
import bavarianHero from "@/assets/og/og-bavarian-hero.jpg?w=960&format=webp&quality=68";
import sportswearHero from "@/assets/og/og-sportswear.jpg?w=960&format=webp&quality=68";
import leatherHero from "@/assets/og/og-leather.jpg?w=960&format=webp&quality=68";

const SITE = "https://irhaapparels.com";
const FALLBACK_HERO_IMAGES = [bavarianHero, sportswearHero, leatherHero];

function PublishedCategorySection({ category }: { category: NormalizedCategory }) {
  const published = usePublishedCategoryTaxonomy(category);
  const taxonomy = published.taxonomy ?? buildCategoryTaxonomy(category);
  const audienceCount = taxonomy.audiences.length;
  const collectionCount = taxonomy.audiences.reduce((total, audience) => total + audience.collections.length, 0);

  return (
    <article className="border-b border-border/60 pb-20 last:border-b-0">
      <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center mb-8">
        <Link to={`/products/${category.slug}`} className="lg:col-span-4 block group">
          <div className="aspect-[4/3] overflow-hidden bg-card">
            {category.image && (
              <ThumbnailImage
                src={category.image}
                originalSrc={category.originalImage}
                alt={category.name}
                loading="lazy"
                fetchPriority="low"
                width={960}
                height={720}
                sizes="(max-width: 1023px) 92vw, 30vw"
                className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-700"
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
      <CategoryAudienceNavigator category={category} compact taxonomy={taxonomy} />
    </article>
  );
}

export default function GlobalCollectionsPage() {
  const { categories, isLoading } = usePublicCategories();
  const totalProducts = categories.reduce((total, category) => total + category.productCount, 0);
  const categoryHeroImages = categories
    .map((category) => ({ src: category.image, alt: category.name }))
    .filter((item): item is { src: string; alt: string } => Boolean(item.src))
    .slice(0, 5);
  const heroImages = FALLBACK_HERO_IMAGES.map((fallback, index) =>
    categoryHeroImages[index] ?? { src: fallback, alt: ["Bavarian Trachten", "Custom sportswear", "Premium leather apparel"][index] },
  );
  const heroSlides = [...categoryHeroImages, ...heroImages]
    .filter((image, index, items) => items.findIndex((item) => item.src === image.src) === index)
    .slice(0, 6)
    .map((image) => ({ src: image.src, alt: image.alt, fit: "contain" as const, backgroundClassName: "bg-[#f4f0e7]" }));

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
        image={heroSlides[0]?.src}
        jsonLd={jsonLd}
      />

      <section className="relative pt-36 md:pt-44 pb-16 md:pb-20 border-b border-border/60 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--gold)/0.12),transparent_38%)]" />
        <div className="container-luxe relative grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          <div className="lg:col-span-7">
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
                rel="noreferrer noopener"
                className="inline-flex items-center gap-3 bg-primary text-primary-foreground hover:bg-primary/90 px-7 py-4 text-xs uppercase tracking-[0.25em]"
              >
                <MessageCircle size={15} aria-hidden="true" /> Discuss a buyer program
              </a>
            </div>
          </div>

          <div className="lg:col-span-5 relative min-h-[380px] md:min-h-[500px] overflow-hidden border border-border/60 bg-card shadow-2xl" aria-label="Featured manufacturing categories">
            <HeroMediaSlideshow
              slides={heroSlides}
              label="Manufacturing category slideshow"
              controlsClassName="bottom-4 right-4"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/10" />
            <div className="pointer-events-none absolute left-5 right-5 bottom-5 border border-white/20 bg-black/50 p-4 backdrop-blur-sm">
              <p className="text-[9px] uppercase tracking-[0.32em] text-gold">Live product architecture</p>
              <p className="mt-1 font-display text-xl text-white">Relevant category media</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container-luxe space-y-20">
          {categories.map((category) => (
            <PublishedCategorySection key={category.slug} category={category} />
          ))}
        </div>
      </section>
    </>
  );
}
