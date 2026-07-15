import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, FileText, Headphones, Video } from "lucide-react";
import ResilientImage from "@/components/ResilientImage";
import { thumbnailUrl } from "@/lib/imageThumbnails";

import bavarianCover from "@/assets/og/og-bavarian-hero.jpg";
import sportswearCover from "@/assets/og/og-sportswear.jpg";
import sportswearThumb from "@/assets/og/og-sportswear.jpg?w=720&format=webp&quality=72";
import leatherCover from "@/assets/og/og-leather.jpg";
import leatherThumb from "@/assets/og/og-leather.jpg?w=720&format=webp&quality=72";

const BAVARIAN_PRODUCT_IMAGE =
  "/product-media/distressed-brown-short-lederhosen/01-hero-front.webp";
const BAVARIAN_PRODUCT_THUMBNAIL = thumbnailUrl(BAVARIAN_PRODUCT_IMAGE);

const PROOF_POINTS = [
  "OEM, ODM and private-label production",
  "Sampling and approval before bulk",
  "Custom labels, printing and packaging",
  "Scheduled live factory video call",
];

export default function HeroCarousel() {
  const openLiveChat = () => {
    window.dispatchEvent(new CustomEvent("irha:open-human-chat"));
  };

  return (
    <section className="relative overflow-hidden border-b border-border/60 bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_86%_12%,hsl(var(--primary)/0.14),transparent_28%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="container-luxe relative pb-12 pt-24 sm:pb-14 sm:pt-28 md:pb-16 md:pt-32">
        <div className="mb-7 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border/60 pb-4 text-[8px] font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:text-[9px] md:text-[10px]">
          <span>Sialkot, Pakistan</span>
          <span className="hidden h-1 w-1 rounded-full bg-primary sm:block" />
          <span>Made-to-order B2B manufacturing</span>
          <span className="hidden h-1 w-1 rounded-full bg-primary sm:block" />
          <span>Brands · Wholesalers · Importers</span>
        </div>

        <div className="grid gap-9 xl:grid-cols-[minmax(0,.9fr)_minmax(520px,1.1fr)] xl:items-center xl:gap-14">
          <div className="max-w-3xl">
            <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-primary sm:text-[10px] md:text-xs">
              Custom apparel manufacturing partner
            </p>
            <h1 className="mt-4 max-w-[15ch] font-display text-[2.6rem] leading-[1.01] tracking-[-0.035em] text-foreground sm:text-6xl lg:text-[4.25rem]">
              B2B Apparel Manufacturing
              <span className="mt-2 block font-normal italic text-gold">
                built around your product brief.
              </span>
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-foreground/68 md:text-base md:leading-8">
              Custom Bavarian wear, sportswear, leatherwear, streetwear and leisure apparel for brands, wholesalers and importers. Product, material, quantity, branding, packaging and destination are reviewed before quotation.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/inquiry?intent=rfq"
                className="inline-flex min-h-12 items-center gap-3 bg-gradient-gold px-6 text-[9px] font-semibold uppercase tracking-[0.2em] text-primary-foreground transition-all hover:shadow-gold sm:px-7 sm:text-[10px]"
              >
                <FileText size={14} /> Request a quote <ArrowRight size={14} />
              </Link>
              <Link
                to="/products"
                className="inline-flex min-h-12 items-center gap-3 border border-foreground/25 bg-card/55 px-6 text-[9px] font-semibold uppercase tracking-[0.2em] text-foreground transition-colors hover:border-primary hover:text-primary sm:px-7 sm:text-[10px]"
              >
                Explore collections <ArrowRight size={14} />
              </Link>
              <button
                type="button"
                onClick={openLiveChat}
                className="inline-flex min-h-12 items-center gap-2 border border-emerald-500/35 bg-emerald-500/[0.05] px-5 text-[9px] font-semibold uppercase tracking-[0.18em] text-emerald-300 transition-colors hover:border-emerald-400 hover:bg-emerald-500/[0.1]"
              >
                <Headphones size={14} /> Live chat
              </button>
            </div>

            <ul className="mt-7 grid gap-2.5 border-t border-border/60 pt-5 text-xs text-foreground/68 sm:grid-cols-2 sm:text-sm">
              {PROOF_POINTS.map((point) => (
                <li key={point} className="flex items-start gap-2.5 leading-6">
                  <CheckCircle2 size={15} className="mt-1 shrink-0 text-primary" strokeWidth={1.7} />
                  <span>{point}</span>
                </li>
              ))}
            </ul>

            <Link
              to="/factory-video-call"
              className="mt-5 inline-flex items-center gap-2 text-[8px] font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-primary sm:text-[9px]"
            >
              <Video size={13} /> Request a scheduled factory video call
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1.2fr_.8fr] sm:grid-rows-2">
            <Link
              to="/products/bavarian-trachten-wear"
              className="group relative col-span-2 min-h-[330px] overflow-hidden rounded-xl border border-primary/30 bg-[#eee8dc] shadow-elegant sm:col-span-1 sm:row-span-2 sm:min-h-[520px] sm:rounded-none"
            >
              <ResilientImage
                sources={[BAVARIAN_PRODUCT_THUMBNAIL, BAVARIAN_PRODUCT_IMAGE, bavarianCover]}
                alt="Custom Bavarian and Trachten apparel manufacturing"
                loading="eager"
                fetchPriority="high"
                decoding="async"
                width={1000}
                height={1250}
                className="h-full w-full object-contain p-6 transition-transform duration-700 group-hover:scale-[1.025] sm:p-8"
              />
              <div className="absolute inset-x-0 bottom-0 h-[48%] bg-gradient-to-t from-black via-black/88 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-6">
                <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-primary">Custom manufacturing program</p>
                <p className="mt-2 font-display text-2xl leading-tight sm:text-3xl">Bavarian &amp; Trachten Wear</p>
                <p className="mt-2 text-[11px] text-white/72 sm:text-xs">Lederhosen · Dirndl · Shirts · Vests · Accessories</p>
              </div>
            </Link>

            <Link
              to="/products/sportswear"
              className="group relative min-h-[190px] overflow-hidden rounded-xl border border-border/70 bg-black sm:min-h-0 sm:rounded-none"
            >
              <ResilientImage
                sources={[sportswearThumb, sportswearCover]}
                alt="Custom sportswear and teamwear manufacturing"
                loading="lazy"
                fetchPriority="low"
                decoding="async"
                width={720}
                height={720}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/10 to-transparent" />
              <div className="absolute inset-x-4 bottom-4 text-white">
                <p className="text-[8px] uppercase tracking-[0.18em] text-primary">Team & club programs</p>
                <p className="mt-1 font-display text-xl">Sportswear</p>
              </div>
            </Link>

            <Link
              to="/products/premium-leather-apparel"
              className="group relative min-h-[190px] overflow-hidden rounded-xl border border-border/70 bg-black sm:min-h-0 sm:rounded-none"
            >
              <ResilientImage
                sources={[leatherThumb, leatherCover]}
                alt="Custom leather apparel manufacturing"
                loading="lazy"
                fetchPriority="low"
                decoding="async"
                width={720}
                height={720}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/10 to-transparent" />
              <div className="absolute inset-x-4 bottom-4 text-white">
                <p className="text-[8px] uppercase tracking-[0.18em] text-primary">Jackets & vests</p>
                <p className="mt-1 font-display text-xl">Leather Apparel</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
