import {
  ArrowRight,
  Layers3,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Video,
} from "lucide-react";
import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import CategoryAudienceNavigator from "@/components/CategoryAudienceNavigator";
import HeroMediaSlideshow from "@/components/HeroMediaSlideshow";
import { usePublicCategories } from "@/hooks/usePublicCategoryData";
import { buildCategoryTaxonomy } from "@/lib/globalCategoryTaxonomy";
import { whatsappLink } from "@/lib/constants";
import bavarianHero from "@/assets/og/og-bavarian-hero.jpg";
import sportswearHero from "@/assets/og/og-sportswear.jpg";
import leatherHero from "@/assets/og/og-leather.jpg";

const SITE = "https://irhaapparels.com";
const FALLBACK_HERO_IMAGES = [bavarianHero, sportswearHero, leatherHero];

export default function GlobalCollectionsPage() {
  const { categories, isLoading } = usePublicCategories();
  const totalProducts = categories.reduce((total, category) => total + category.productCount, 0);
  const totalBuyerGroups = categories.reduce(
    (total, category) => total + buildCategoryTaxonomy(category).audiences.length,
    0,
  );
  const categoryHeroImages = categories
    .map((category) => ({ src: category.image, alt: category.name }))
    .filter((item): item is { src: string; alt: string } => Boolean(item.src))
    .slice(0, 5);
  const heroImages = FALLBACK_HERO_IMAGES.map((fallback, index) =>
    categoryHeroImages[index] ?? {
      src: fallback,
      alt: ["Bavarian Trachten", "Custom sportswear", "Premium leather apparel"][index],
    },
  );
  const heroSlides = [...categoryHeroImages, ...heroImages]
    .filter((image, index, items) => items.findIndex((item) => item.src === image.src) === index)
    .slice(0, 6)
    .map((image) => ({ src: image.src, alt: image.alt, fit: "cover" as const }));

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

      <section className="relative min-h-[760px] overflow-hidden border-b border-white/10 bg-[#080808] text-white">
        <div className="pointer-events-none absolute inset-0 opacity-[0.055] [background-image:linear-gradient(rgba(255,255,255,.45)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.45)_1px,transparent_1px)] [background-size:64px_64px]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_34%,rgba(202,164,79,.2),transparent_32%)]" />
        <div className="container-luxe relative grid min-h-[760px] items-center gap-12 pb-16 pt-36 lg:grid-cols-[minmax(0,1.03fr)_minmax(380px,.72fr)] lg:gap-16 lg:pt-40">
          <div>
            <div className="mb-8 flex flex-wrap gap-3 text-[9px] uppercase tracking-[0.24em] text-white/70">
              <span className="inline-flex items-center gap-2 border border-gold/35 bg-black/35 px-3 py-2 backdrop-blur-sm">
                <ShieldCheck size={13} className="text-gold" /> Experienced manufacturer
              </span>
              <span className="border border-white/15 bg-black/25 px-3 py-2 backdrop-blur-sm">Newly built website</span>
              <span className="inline-flex items-center gap-2 border border-white/15 bg-black/25 px-3 py-2 backdrop-blur-sm">
                <Video size={13} className="text-gold" /> Live factory view available
              </span>
            </div>

            <div className="mb-6 flex items-center gap-4">
              <span className="h-px w-14 bg-gold" />
              <p className="text-[10px] font-mono uppercase tracking-[0.34em] text-gold md:text-xs">
                Global B2B Product Architecture
              </p>
            </div>
            <h1 className="max-w-5xl font-display text-[3.15rem] leading-[.96] tracking-[-.035em] sm:text-6xl md:text-7xl lg:text-[5.4rem]">
              Find the right program.
              <span className="mt-2 block font-normal italic text-gold">Then refine every detail.</span>
            </h1>
            <p className="mt-7 max-w-3xl text-sm leading-7 text-white/70 md:text-base md:leading-8">
              Move from main manufacturing category to buyer group, focused collection and individual product. Every route is designed for quotation-led wholesale, OEM and private-label discussions.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                to="/products/all"
                className="group inline-flex min-h-12 items-center gap-3 bg-gradient-gold px-7 text-[10px] font-semibold uppercase tracking-[0.24em] text-primary-foreground transition-all hover:shadow-gold"
              >
                <Search size={14} /> Search all {totalProducts || ""} products
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href={whatsappLink("Hello Irha Apparels — please help me choose the right product category for my B2B program.")}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-12 items-center gap-3 border border-white/25 bg-black/25 px-7 text-[10px] uppercase tracking-[0.24em] text-white backdrop-blur-sm transition-colors hover:border-gold hover:text-gold"
              >
                <MessageCircle size={14} /> Discuss a buyer program
              </a>
            </div>

            <div className="mt-11 grid max-w-3xl grid-cols-3 gap-px border border-white/12 bg-white/12">
              {[
                [String(categories.length).padStart(2, "0"), "Main categories"],
                [String(totalBuyerGroups).padStart(2, "0"), "Buyer groups"],
                [String(totalProducts).padStart(2, "0"), "Published styles"],
              ].map(([value, label]) => (
                <div key={label} className="bg-black/45 px-4 py-5 backdrop-blur-sm md:px-6">
                  <p className="font-display text-2xl text-gold md:text-3xl">{value}</p>
                  <p className="mt-2 text-[8px] uppercase tracking-[0.2em] text-white/55 md:text-[9px]">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[540px]">
            <div className="absolute -inset-8 border border-gold/10" />
            <div className="relative aspect-[4/5] overflow-hidden border border-white/18 bg-black/45 p-3 shadow-[0_40px_100px_rgba(0,0,0,.55)] backdrop-blur-md">
              <div className="relative h-full overflow-hidden bg-black">
                <HeroMediaSlideshow
                  slides={heroSlides}
                  label="Manufacturing category slideshow"
                  controlsClassName="bottom-5 right-5"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/15" />
                <div className="pointer-events-none absolute inset-x-5 bottom-5 border border-white/15 bg-black/75 p-5 backdrop-blur-md">
                  <p className="text-[8px] uppercase tracking-[0.3em] text-gold">Buyer navigation system</p>
                  <p className="mt-2 font-display text-2xl text-white">Category → audience → collection → product</p>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-6 -left-6 hidden border border-gold/30 bg-[#0a0a0a] px-5 py-4 text-white shadow-2xl md:block">
              <p className="text-[8px] uppercase tracking-[0.28em] text-gold">Manufacturing base</p>
              <p className="mt-1 font-display text-lg">Sialkot, Pakistan</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border/60 bg-card/30 py-6">
        <div className="container-luxe flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categories.map((category, index) => (
            <Link
              key={category.slug}
              to={`/products/${category.slug}`}
              className="group inline-flex min-w-max items-center gap-3 border border-border/60 bg-background/70 px-4 py-3 text-[9px] uppercase tracking-[0.2em] transition-colors hover:border-gold hover:text-gold"
            >
              <span className="font-mono text-gold">{String(index + 1).padStart(2, "0")}</span>
              {category.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden py-20 md:py-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,hsl(var(--gold)/.08),transparent_28%)]" />
        <div className="container-luxe relative">
          <div className="mb-14 grid gap-6 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-8">
              <p className="eyebrow mb-4">Manufacturing Categories</p>
              <h2 className="font-display text-4xl leading-[1.02] md:text-6xl">
                Five product worlds.
                <span className="block font-normal italic text-gold">One buyer-focused system.</span>
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-foreground/65 lg:col-span-4">
              Open a category to browse its buyer groups and collections. Product media comes from the live published catalogue wherever available.
            </p>
          </div>

          <div className="space-y-10 md:space-y-14">
            {categories.map((category, index) => {
              const taxonomy = buildCategoryTaxonomy(category);
              const audienceCount = taxonomy.audiences.length;
              const collectionCount = taxonomy.audiences.reduce(
                (total, audience) => total + audience.collections.length,
                0,
              );
              const featuredProducts = taxonomy.audiences
                .flatMap((audience) => audience.collections)
                .flatMap((collection) => collection.products)
                .filter((product) => Boolean(product.image))
                .slice(0, 3);
              const primaryImage = featuredProducts[0]?.image ?? category.image;

              return (
                <article
                  key={category.slug}
                  className="group overflow-hidden border border-border/60 bg-card/20 transition-all duration-500 hover:border-gold/60 hover:shadow-[0_30px_90px_rgba(0,0,0,.18)]"
                >
                  <div className={`grid min-h-[560px] lg:grid-cols-12 ${index % 2 ? "lg:[&>*:first-child]:order-2" : ""}`}>
                    <Link
                      to={`/products/${category.slug}`}
                      className="relative min-h-[360px] overflow-hidden bg-[#f1ece2] lg:col-span-5 lg:min-h-full"
                    >
                      {primaryImage && (
                        <img
                          src={primaryImage}
                          alt={featuredProducts[0]?.name ?? category.name}
                          loading={index === 0 ? "eager" : "lazy"}
                          className="absolute inset-0 h-full w-full object-contain p-7 transition-transform duration-[1400ms] group-hover:scale-[1.045] md:p-10"
                        />
                      )}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                      <div className="pointer-events-none absolute left-5 top-5 border border-black/10 bg-black/80 px-3 py-2 text-[8px] uppercase tracking-[0.24em] text-gold backdrop-blur-sm">
                        Collection {String(index + 1).padStart(2, "0")}
                      </div>
                      {featuredProducts.length > 1 && (
                        <div className="absolute inset-x-5 bottom-5 grid grid-cols-2 gap-2">
                          {featuredProducts.slice(1, 3).map((product) => (
                            <div key={product.slug} className="aspect-[4/3] overflow-hidden border border-white/20 bg-[#f1ece2]">
                              <img src={product.image} alt="" loading="lazy" className="h-full w-full object-contain p-2" />
                            </div>
                          ))}
                        </div>
                      )}
                    </Link>

                    <div className="flex flex-col justify-center p-7 md:p-10 lg:col-span-7 lg:p-14">
                      <div className="flex flex-wrap items-center gap-3 text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
                        <span className="inline-flex items-center gap-2 text-gold">
                          <Layers3 size={13} /> {audienceCount} buyer groups
                        </span>
                        <span>·</span>
                        <span>{collectionCount} product categories</span>
                        <span>·</span>
                        <span>{category.productCount} styles</span>
                      </div>
                      <h3 className="mt-5 max-w-3xl font-display text-4xl leading-[1.02] md:text-5xl">
                        <Link to={`/products/${category.slug}`} className="transition-colors hover:text-gold">
                          {category.name}
                        </Link>
                      </h3>
                      <p className="mt-5 max-w-3xl text-sm leading-7 text-foreground/65 md:text-base">
                        {category.description}
                      </p>

                      <div className="mt-8 flex flex-wrap gap-3">
                        <Link
                          to={`/products/${category.slug}`}
                          className="group/link inline-flex min-h-11 items-center gap-3 bg-gradient-gold px-6 text-[9px] font-semibold uppercase tracking-[0.22em] text-primary-foreground"
                        >
                          Open category hierarchy
                          <ArrowRight size={13} className="transition-transform group-hover/link:translate-x-1" />
                        </Link>
                        <Link
                          to={`/products/${category.slug}/all-products`}
                          className="inline-flex min-h-11 items-center gap-2 border border-border/70 px-6 text-[9px] uppercase tracking-[0.22em] transition-colors hover:border-gold hover:text-gold"
                        >
                          View all styles
                        </Link>
                      </div>

                      <div className="mt-10 border-t border-border/60 pt-8">
                        <CategoryAudienceNavigator category={category} compact />
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#090909] py-20 text-white md:py-24">
        <div className="container-luxe grid gap-10 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-8">
            <p className="mb-4 inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.28em] text-gold">
              <Sparkles size={13} /> Buyer support
            </p>
            <h2 className="max-w-4xl font-display text-4xl leading-[1.02] md:text-6xl">
              Not sure where your product belongs?
              <span className="block font-normal italic text-gold">Send the brief, reference or target category.</span>
            </h2>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-white/65 md:text-base">
              We can review the product type, buyer requirements, customization and destination before directing the inquiry to the relevant manufacturing program.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:col-span-4 lg:justify-end">
            <Link
              to="/inquiry?intent=rfq"
              className="inline-flex min-h-12 items-center gap-3 bg-gradient-gold px-7 text-[10px] font-semibold uppercase tracking-[0.24em] text-primary-foreground"
            >
              Start buyer brief <ArrowRight size={14} />
            </Link>
            <Link
              to="/factory-video-call"
              className="inline-flex min-h-12 items-center gap-3 border border-white/25 px-7 text-[10px] uppercase tracking-[0.24em] transition-colors hover:border-gold hover:text-gold"
            >
              <Video size={14} /> Factory call
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
