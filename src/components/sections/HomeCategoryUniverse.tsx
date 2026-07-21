import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import ResilientImage from "@/components/ResilientImage";
import { useHomepageMedia } from "@/hooks/useHomepageMedia";
import { CATEGORY_HERO_MEDIA } from "@/lib/heroMedia";

const PROGRAMS = [
  {
    slug: "bavarian-trachten-wear",
    role: "category_bavarian_trachten",
    name: "Bavarian & Trachten Wear",
    description: "Lederhosen, dirndl, shirts, vests and accessories",
    image: CATEGORY_HERO_MEDIA["bavarian-trachten-wear"],
    alt: "Bavarian and Trachten clothing manufacturing collection",
  },
  {
    slug: "sportswear",
    role: "category_sportswear",
    name: "Sportswear",
    description: "Team uniforms, tracksuits, training and club programs",
    image: CATEGORY_HERO_MEDIA.sportswear,
    alt: "Custom sportswear and teamwear manufacturing collection",
  },
  {
    slug: "premium-leather-apparel",
    role: "category_leather",
    name: "Premium Leather Apparel",
    description: "Biker jackets, bombers, vests and leather bottoms",
    image: CATEGORY_HERO_MEDIA["premium-leather-apparel"],
    alt: "Premium leather apparel manufacturing collection",
  },
  {
    slug: "streetwear-activewear",
    role: "category_streetwear_activewear",
    name: "Streetwear & Activewear",
    description: "Hoodies, tees, joggers and private-label sets",
    image: CATEGORY_HERO_MEDIA["streetwear-activewear"],
    alt: "Private label streetwear and activewear manufacturing collection",
  },
  {
    slug: "leisure-nightwear",
    role: "category_leisure_nightwear",
    name: "Leisure & Nightwear",
    description: "Sleepwear, loungewear and custom leisure programs",
    image: CATEGORY_HERO_MEDIA["leisure-nightwear"],
    alt: "Private label leisurewear and nightwear manufacturing collection",
  },
] as const;

const LAYOUTS = ["lg:col-span-7", "lg:col-span-5", "lg:col-span-4", "lg:col-span-4", "lg:col-span-4"] as const;

export default function HomeCategoryUniverse() {
  const { data: approvedMedia = {} } = useHomepageMedia();

  return (
    <section id="programs" className="relative overflow-hidden bg-background py-11 text-foreground md:py-18">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,hsl(var(--primary)/0.08),transparent_28%)]" />
      <div className="container-luxe relative">
        <div className="mb-5 grid gap-3 lg:mb-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-primary sm:text-[10px]">Manufacturing programs</p>
            <h2 className="mt-2 max-w-3xl font-display text-3xl leading-[1.08] sm:text-4xl lg:text-5xl">Choose the product line your business needs.</h2>
          </div>
          <div className="lg:col-span-4">
            <p className="text-sm leading-6 text-foreground/65 sm:leading-7">Browse references, then send the target material, quantity, branding and destination.</p>
            <Link to="/products" className="mt-2 inline-flex min-h-9 items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-primary hover:text-foreground sm:mt-3">All products <ArrowRight size={13} /></Link>
          </div>
        </div>

        <div className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-12">
          {PROGRAMS.map((program, index) => {
            const featuredRow = index < 2;
            const image = approvedMedia[program.role] || program.image;
            return (
              <Link key={program.slug} to={`/products/${program.slug}`} className={`group min-w-[82%] max-w-[330px] snap-start overflow-hidden rounded-xl border border-border/70 bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/70 hover:shadow-elegant sm:min-w-0 sm:max-w-none sm:rounded-none ${LAYOUTS[index] ?? "lg:col-span-4"}`}>
                <div className={`relative aspect-[16/10] overflow-hidden bg-[#101722] ${featuredRow ? "sm:aspect-[16/9]" : "sm:aspect-[4/3]"}`}>
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(213,173,77,.12),transparent_58%)]" />
                  <ResilientImage sources={[image, program.image]} alt={program.alt} loading="lazy" decoding="async" width={1200} height={800} className="relative h-full w-full object-contain p-4 transition-transform duration-700 group-hover:scale-[1.025] sm:p-6" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/84 via-black/5 to-transparent" />
                  <span className="absolute bottom-3 left-3 text-[7px] font-semibold uppercase tracking-[0.14em] text-white/80 sm:left-4 sm:text-[8px]">Made-to-order program</span>
                </div>
                <div className="p-4 sm:p-5 md:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className={`min-w-0 font-display leading-tight text-foreground transition-colors group-hover:text-primary ${featuredRow ? "text-xl sm:text-2xl md:text-3xl" : "text-lg sm:text-xl md:text-2xl"}`}>{program.name}</h3>
                    <ArrowRight size={15} className="mt-1 shrink-0 text-primary transition-transform group-hover:translate-x-1" />
                  </div>
                  <p className="mt-2 line-clamp-2 text-[10px] leading-5 text-foreground/58 sm:text-xs sm:leading-6">{program.description}</p>
                  <span className="mt-3 inline-flex text-[8px] font-semibold uppercase tracking-[0.16em] text-primary sm:mt-4 sm:text-[9px]">Review program</span>
                </div>
              </Link>
            );
          })}
        </div>
        <p className="mt-2 text-center text-[8px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:hidden">Swipe to compare programs</p>
      </div>
    </section>
  );
}
