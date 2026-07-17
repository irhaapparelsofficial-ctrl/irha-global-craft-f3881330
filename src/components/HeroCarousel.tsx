import { Link } from "react-router-dom";
import { ArrowRight, FileText, Headphones, Video } from "lucide-react";
import ResilientImage from "@/components/ResilientImage";
import { CATEGORY_HERO_MEDIA } from "@/lib/heroMedia";
import heroDesktop from "@/assets/hero-b2b-manufacturer-desktop.jpg";
import heroMobile from "@/assets/hero-b2b-manufacturer-mobile.jpg";


const SECONDARY_PROGRAMS = [
  {
    slug: "sportswear",
    title: "Sportswear",
    eyebrow: "Teamwear",
    image: CATEGORY_HERO_MEDIA.sportswear,
    alt: "Custom performance tracksuit for sportswear and teamwear manufacturing",
  },
  {
    slug: "premium-leather-apparel",
    title: "Leatherwear",
    eyebrow: "Jackets & vests",
    image: CATEGORY_HERO_MEDIA["premium-leather-apparel"],
    alt: "Custom classic biker jacket for premium leather apparel manufacturing",
  },
  {
    slug: "streetwear-activewear",
    title: "Streetwear",
    eyebrow: "Private label",
    image: CATEGORY_HERO_MEDIA["streetwear-activewear"],
    alt: "Custom oversized hoodie for streetwear and activewear manufacturing",
  },
  {
    slug: "leisure-nightwear",
    title: "Leisurewear",
    eyebrow: "Nightwear & lounge",
    image: CATEGORY_HERO_MEDIA["leisure-nightwear"],
    alt: "Custom plush robe for leisurewear and nightwear manufacturing",
  },
] as const;

export default function HeroCarousel() {
  const openLiveChat = () => window.dispatchEvent(new CustomEvent("irha:open-human-chat"));

  return (
    <section className="relative overflow-hidden border-b border-border/60 bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_8%,hsl(var(--primary)/0.14),transparent_27%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.025] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="container-luxe relative pb-10 pt-20 sm:pb-14 sm:pt-28 lg:pb-16 lg:pt-32">
        <p className="inline-flex rounded-full border border-border/70 bg-card/60 px-3 py-1.5 text-[8px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:py-2 sm:text-[9px]">
          Sialkot · Made to order · B2B buyers
        </p>

        <div className="mt-4 grid gap-6 sm:mt-5 lg:grid-cols-[minmax(0,.82fr)_minmax(520px,1.18fr)] lg:items-center lg:gap-12">
          <div className="max-w-3xl">
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-primary sm:text-[10px]">
              Custom manufacturing partner
            </p>
            <h1 className="mt-2 max-w-[17ch] font-display text-[2rem] leading-[1.01] tracking-[-0.035em] text-foreground sm:mt-2.5 sm:text-5xl lg:text-[4rem]">
              B2B Apparel Manufacturer for Brands &amp; Wholesalers
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-foreground/68 sm:mt-3.5 sm:text-base sm:leading-7">
              Made-to-order Bavarian wear, sportswear, leatherwear, streetwear and leisure apparel with private-label branding and packaging.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:mt-5 sm:flex sm:flex-wrap sm:gap-3">
              <Link
                to="/inquiry?intent=rfq"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-gradient-gold px-3 text-[9px] font-semibold uppercase tracking-[0.14em] text-primary-foreground transition-all hover:shadow-gold sm:min-h-12 sm:px-6 sm:text-[10px]"
              >
                <FileText size={14} /> Request quote
              </Link>
              <Link
                to="/products"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-foreground/25 bg-card/55 px-3 text-[9px] font-semibold uppercase tracking-[0.14em] text-foreground transition-colors hover:border-primary hover:text-primary sm:min-h-12 sm:px-6 sm:text-[10px]"
              >
                View products <ArrowRight size={13} />
              </Link>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 sm:mt-2.5">
              <button type="button" onClick={openLiveChat} className="inline-flex min-h-8 items-center gap-2 text-[8px] font-semibold uppercase tracking-[0.14em] text-emerald-300 hover:text-emerald-200 sm:min-h-9 sm:text-[9px]">
                <Headphones size={13} /> Chat with Irha team
              </button>
              <Link to="/factory-video-call" className="inline-flex min-h-8 items-center gap-2 text-[8px] font-semibold uppercase tracking-[0.14em] text-muted-foreground hover:text-primary sm:min-h-9 sm:text-[9px]">
                <Video size={13} /> Factory call
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:grid-rows-2 sm:gap-3">
            <Link
              to="/products/bavarian-trachten-wear"
              className="group relative col-span-2 min-h-[430px] overflow-hidden rounded-xl border border-primary/35 bg-[#101722] shadow-elegant sm:row-span-2 sm:min-h-[520px] sm:rounded-none"
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_36%,rgba(213,173,77,.18),transparent_52%)]" />
              <ResilientImage
                sources={[CATEGORY_HERO_MEDIA["bavarian-trachten-wear"]]}
                alt="Premium embroidered Lederhosen shown upright for Bavarian and Trachten manufacturing"
                loading="eager"
                fetchPriority="high"
                decoding="async"
                sizes="(max-width: 639px) 92vw, (max-width: 1023px) 56vw, 34vw"
                width={1600}
                height={1600}
                className="absolute inset-0 h-full w-full object-contain object-center px-3 pb-24 pt-3 transition-transform duration-1000 group-hover:scale-[1.025] sm:px-6 sm:pb-28 sm:pt-6"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/5 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-6">
                <p className="text-[7px] font-semibold uppercase tracking-[0.14em] text-primary sm:text-[8px]">Flagship manufacturing program</p>
                <p className="mt-1 font-display text-2xl leading-tight sm:text-3xl">Bavarian &amp; Trachten</p>
                <p className="mt-1 text-[10px] text-white/72 sm:text-[11px]">Lederhosen · Dirndl · Shirts · Vests</p>
              </div>
            </Link>

            {SECONDARY_PROGRAMS.map((program) => (
              <Link
                key={program.slug}
                to={`/products/${program.slug}`}
                className="group relative min-h-[160px] overflow-hidden rounded-xl border border-border/70 bg-[#101722] sm:min-h-0 sm:rounded-none"
              >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(213,173,77,.12),transparent_58%)]" />
                <ResilientImage
                  sources={[program.image]}
                  alt={program.alt}
                  loading="lazy"
                  fetchPriority="low"
                  decoding="async"
                  sizes="(max-width: 639px) 46vw, (max-width: 1023px) 24vw, 13vw"
                  width={912}
                  height={1600}
                  className="relative h-full w-full object-contain p-2.5 transition-transform duration-1000 group-hover:scale-[1.035] sm:p-4"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/96 via-black/5 to-transparent" />
                <div className="absolute inset-x-3 bottom-3 text-white">
                  <p className="text-[7px] uppercase tracking-[0.14em] text-primary">{program.eyebrow}</p>
                  <p className="mt-1 font-display text-base sm:text-lg">{program.title}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
