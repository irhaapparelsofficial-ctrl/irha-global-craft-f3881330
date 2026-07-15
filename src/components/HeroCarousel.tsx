import { Link } from "react-router-dom";
import { ArrowRight, FileText, Headphones, Video } from "lucide-react";
import ResilientImage from "@/components/ResilientImage";
import { thumbnailUrl } from "@/lib/imageThumbnails";
import bavarianCover from "@/assets/og/og-bavarian-hero.jpg";
import sportswearCover from "@/assets/og/og-sportswear.jpg";
import sportswearThumb from "@/assets/og/og-sportswear.jpg?w=720&format=webp&quality=72";
import leatherCover from "@/assets/og/og-leather.jpg";
import leatherThumb from "@/assets/og/og-leather.jpg?w=720&format=webp&quality=72";

const BAVARIAN_PRODUCT_IMAGE = "/product-media/distressed-brown-short-lederhosen/01-hero-front.webp";
const BAVARIAN_PRODUCT_THUMBNAIL = thumbnailUrl(BAVARIAN_PRODUCT_IMAGE);

export default function HeroCarousel() {
  const openLiveChat = () => window.dispatchEvent(new CustomEvent("irha:open-human-chat"));

  return (
    <section className="relative overflow-hidden border-b border-border/60 bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_8%,hsl(var(--primary)/0.14),transparent_27%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.025] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="container-luxe relative pb-10 pt-24 sm:pb-14 sm:pt-28 lg:pb-16 lg:pt-32">
        <p className="inline-flex rounded-full border border-border/70 bg-card/60 px-3 py-2 text-[8px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:text-[9px]">
          Sialkot · Made to order · B2B buyers
        </p>

        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,.92fr)_minmax(440px,1.08fr)] lg:items-center lg:gap-12">
          <div className="max-w-3xl">
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-primary sm:text-[10px]">
              Custom manufacturing partner
            </p>
            <h1 className="mt-2.5 max-w-[17ch] font-display text-[2.2rem] leading-[1.01] tracking-[-0.035em] text-foreground sm:text-5xl lg:text-[4rem]">
              B2B Apparel Manufacturer for Brands &amp; Wholesalers
            </h1>
            <p className="mt-3.5 max-w-2xl text-sm leading-6 text-foreground/68 sm:text-base sm:leading-7">
              Made-to-order Bavarian wear, sportswear, leatherwear, streetwear and leisure apparel with private-label branding and packaging.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:gap-3">
              <Link
                to="/inquiry?intent=rfq"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-gradient-gold px-3 text-[9px] font-semibold uppercase tracking-[0.14em] text-primary-foreground transition-all hover:shadow-gold sm:px-6 sm:text-[10px]"
              >
                <FileText size={14} /> Request quote
              </Link>
              <Link
                to="/products"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-foreground/25 bg-card/55 px-3 text-[9px] font-semibold uppercase tracking-[0.14em] text-foreground transition-colors hover:border-primary hover:text-primary sm:px-6 sm:text-[10px]"
              >
                View products <ArrowRight size={13} />
              </Link>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1">
              <button type="button" onClick={openLiveChat} className="inline-flex min-h-9 items-center gap-2 text-[8px] font-semibold uppercase tracking-[0.14em] text-emerald-300 hover:text-emerald-200 sm:text-[9px]">
                <Headphones size={13} /> Chat with Irha team
              </button>
              <Link to="/factory-video-call" className="inline-flex min-h-9 items-center gap-2 text-[8px] font-semibold uppercase tracking-[0.14em] text-muted-foreground hover:text-primary sm:text-[9px]">
                <Video size={13} /> Factory call
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-[1.18fr_.82fr] sm:grid-rows-2 sm:gap-3">
            <Link
              to="/products/bavarian-trachten-wear"
              className="group relative col-span-2 min-h-[238px] overflow-hidden rounded-xl border border-primary/30 bg-[#eee8dc] shadow-elegant sm:col-span-1 sm:row-span-2 sm:min-h-[470px] sm:rounded-none"
            >
              <ResilientImage
                sources={[BAVARIAN_PRODUCT_THUMBNAIL, BAVARIAN_PRODUCT_IMAGE, bavarianCover]}
                alt="Custom Bavarian and Trachten apparel manufacturing"
                loading="eager"
                fetchPriority="high"
                decoding="async"
                width={1000}
                height={1250}
                className="h-full w-full object-contain p-3 transition-transform duration-700 group-hover:scale-[1.025] sm:p-7"
              />
              <div className="absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-black via-black/82 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-3.5 text-white sm:p-5">
                <p className="text-[7px] font-semibold uppercase tracking-[0.14em] text-primary sm:text-[8px]">Manufacturing program</p>
                <p className="mt-1 font-display text-xl leading-tight sm:text-2xl">Bavarian &amp; Trachten</p>
                <p className="mt-1 text-[10px] text-white/68 sm:text-[11px]">Lederhosen · Dirndl · Shirts · Vests</p>
              </div>
            </Link>

            <Link to="/products/sportswear" className="group relative min-h-[132px] overflow-hidden rounded-xl border border-border/70 bg-black sm:min-h-0 sm:rounded-none">
              <ResilientImage
                sources={[sportswearThumb, sportswearCover]}
                alt="Custom sportswear manufacturing"
                loading="lazy"
                fetchPriority="low"
                decoding="async"
                width={720}
                height={720}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/94 via-black/15 to-transparent" />
              <div className="absolute inset-x-3 bottom-3 text-white"><p className="text-[7px] uppercase tracking-[0.14em] text-primary">Teamwear</p><p className="mt-1 font-display text-lg">Sportswear</p></div>
            </Link>

            <Link to="/products/premium-leather-apparel" className="group relative min-h-[132px] overflow-hidden rounded-xl border border-border/70 bg-black sm:min-h-0 sm:rounded-none">
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
              <div className="absolute inset-0 bg-gradient-to-t from-black/94 via-black/15 to-transparent" />
              <div className="absolute inset-x-3 bottom-3 text-white"><p className="text-[7px] uppercase tracking-[0.14em] text-primary">Jackets &amp; vests</p><p className="mt-1 font-display text-lg">Leatherwear</p></div>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
