import { Link } from "react-router-dom";
import { ArrowRight, FileText, Headphones, Video } from "lucide-react";
import ResilientImage from "@/components/ResilientImage";
import { thumbnailUrl } from "@/lib/imageThumbnails";
import bavarianCover from "@/assets/og/og-bavarian-hero.jpg";
import sportswearCover from "@/assets/og/og-sportswear.jpg";
import leatherCover from "@/assets/og/og-leather.jpg";

const BAVARIAN_PRODUCT_IMAGE = "/product-media/distressed-brown-short-lederhosen/01-hero-front.webp";
const BAVARIAN_PRODUCT_THUMBNAIL = thumbnailUrl(BAVARIAN_PRODUCT_IMAGE);
const SPORTS_PRODUCT_IMAGE = "https://pvzjiozismyxqrzmtfbi.supabase.co/storage/v1/object/public/site-media/migrated-lovable/44/445815e5fe9c8578f138934b0a5944efaab29bc7f24afaacca2ad39532689bd5.png";
const LEATHER_PRODUCT_IMAGE = "https://pvzjiozismyxqrzmtfbi.supabase.co/storage/v1/object/public/site-media/catalog-migrated/2413dfaf-52c6-4495-bdee-84ed4f7bcc7e/6f7593c5f41340cd1cb6.png";

export default function HeroCarousel() {
  const openLiveChat = () => window.dispatchEvent(new CustomEvent("irha:open-human-chat"));

  return (
    <section className="relative overflow-hidden border-b border-border/60 bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_8%,hsl(var(--primary)/0.14),transparent_27%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.025] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="container-luxe relative pb-8 pt-20 sm:pb-14 sm:pt-28 lg:pb-16 lg:pt-32">
        <p className="inline-flex rounded-full border border-border/70 bg-card/60 px-3 py-1.5 text-[8px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:py-2 sm:text-[9px]">
          Sialkot · Made to order · B2B buyers
        </p>

        <div className="mt-4 grid gap-5 sm:mt-5 sm:gap-6 lg:grid-cols-[minmax(0,.92fr)_minmax(440px,1.08fr)] lg:items-center lg:gap-12">
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

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-[1.18fr_.82fr] sm:grid-rows-2 sm:gap-3">
            <Link
              to="/products/bavarian-trachten-wear"
              className="group relative col-span-2 min-h-[210px] overflow-hidden rounded-xl border border-primary/30 bg-[#eee8dc] shadow-elegant sm:col-span-1 sm:row-span-2 sm:min-h-[470px] sm:rounded-none"
            >
              <ResilientImage
                sources={[BAVARIAN_PRODUCT_THUMBNAIL, BAVARIAN_PRODUCT_IMAGE, bavarianCover]}
                alt="Custom Bavarian and Trachten apparel manufacturing"
                loading="eager"
                fetchPriority="high"
                decoding="async"
                sizes="(max-width: 639px) 92vw, (max-width: 1023px) 56vw, 32vw"
                width={1000}
                height={1250}
                className="h-full w-full object-contain p-2.5 transition-transform duration-700 group-hover:scale-[1.025] sm:p-7"
              />
              <div className="absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-black via-black/82 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-3 text-white sm:p-5">
                <p className="text-[7px] font-semibold uppercase tracking-[0.14em] text-primary sm:text-[8px]">Manufacturing program</p>
                <p className="mt-1 font-display text-xl leading-tight sm:text-2xl">Bavarian &amp; Trachten</p>
                <p className="mt-1 text-[10px] text-white/68 sm:text-[11px]">Lederhosen · Dirndl · Shirts · Vests</p>
              </div>
            </Link>

            <Link to="/products/sportswear" className="group relative min-h-[118px] overflow-hidden rounded-xl border border-border/70 bg-[#eee8dc] sm:min-h-0 sm:rounded-none">
              <ResilientImage
                sources={[SPORTS_PRODUCT_IMAGE, sportswearCover]}
                alt="Custom sportswear manufacturing"
                loading="lazy"
                fetchPriority="low"
                decoding="async"
                sizes="(max-width: 639px) 46vw, (max-width: 1023px) 40vw, 22vw"
                width={720}
                height={720}
                className="h-full w-full object-contain p-2 transition-transform duration-700 group-hover:scale-[1.035] sm:p-4"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/94 via-black/5 to-transparent" />
              <div className="absolute inset-x-3 bottom-3 text-white"><p className="text-[7px] uppercase tracking-[0.14em] text-primary">Teamwear</p><p className="mt-1 font-display text-lg">Sportswear</p></div>
            </Link>

            <Link to="/products/premium-leather-apparel" className="group relative min-h-[118px] overflow-hidden rounded-xl border border-border/70 bg-[#eee8dc] sm:min-h-0 sm:rounded-none">
              <ResilientImage
                sources={[LEATHER_PRODUCT_IMAGE, leatherCover]}
                alt="Custom leather apparel manufacturing"
                loading="lazy"
                fetchPriority="low"
                decoding="async"
                sizes="(max-width: 639px) 46vw, (max-width: 1023px) 40vw, 22vw"
                width={720}
                height={720}
                className="h-full w-full object-contain p-2 transition-transform duration-700 group-hover:scale-[1.035] sm:p-4"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/94 via-black/5 to-transparent" />
              <div className="absolute inset-x-3 bottom-3 text-white"><p className="text-[7px] uppercase tracking-[0.14em] text-primary">Jackets &amp; vests</p><p className="mt-1 font-display text-lg">Leatherwear</p></div>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
