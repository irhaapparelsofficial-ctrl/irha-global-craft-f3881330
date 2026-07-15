import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, FileText, Headphones, Video } from "lucide-react";
import ResilientImage from "@/components/ResilientImage";
import { thumbnailUrl } from "@/lib/imageThumbnails";
import bavarianCover from "@/assets/og/og-bavarian-hero.jpg";
import sportswearCover from "@/assets/og/og-sportswear.jpg";
import sportswearThumb from "@/assets/og/og-sportswear.jpg?w=720&format=webp&quality=72";
import leatherCover from "@/assets/og/og-leather.jpg";
import leatherThumb from "@/assets/og/og-leather.jpg?w=720&format=webp&quality=72";

const BAVARIAN_PRODUCT_IMAGE = "/product-media/distressed-brown-short-lederhosen/01-hero-front.webp";
const BAVARIAN_PRODUCT_THUMBNAIL = thumbnailUrl(BAVARIAN_PRODUCT_IMAGE);

const PROOF_POINTS = [
  "OEM / ODM / private label",
  "Sample approval before bulk",
  "Custom labels and packaging",
  "Factory video call on request",
];

export default function HeroCarousel() {
  const openLiveChat = () => window.dispatchEvent(new CustomEvent("irha:open-human-chat"));

  return (
    <section className="relative overflow-hidden border-b border-border/60 bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_8%,hsl(var(--primary)/0.14),transparent_27%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.025] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="container-luxe relative pb-11 pt-24 sm:pb-14 sm:pt-28 lg:pb-16 lg:pt-32">
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1 text-[8px] font-semibold uppercase tracking-[0.15em] text-muted-foreground sm:text-[9px]">
          <span className="shrink-0 rounded-full border border-border/70 bg-card/60 px-3 py-2">Sialkot, Pakistan</span>
          <span className="shrink-0 rounded-full border border-border/70 bg-card/60 px-3 py-2">Made to order</span>
          <span className="shrink-0 rounded-full border border-border/70 bg-card/60 px-3 py-2">B2B buyers only</span>
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,.92fr)_minmax(440px,1.08fr)] lg:items-center lg:gap-12">
          <div className="max-w-3xl">
            <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-primary sm:text-[10px]">
              Custom apparel manufacturing partner
            </p>
            <h1 className="mt-3 max-w-[16ch] font-display text-[2.35rem] leading-[1.02] tracking-[-0.035em] text-foreground sm:text-5xl lg:text-[4rem]">
              Custom Apparel Manufacturing for Brands &amp; Wholesalers
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-foreground/68 sm:text-base sm:leading-7">
              Develop Bavarian wear, sportswear, leatherwear, streetwear and leisure apparel with your materials, branding, packaging and destination requirements reviewed before quotation.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:gap-3">
              <Link
                to="/inquiry?intent=rfq"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-gradient-gold px-4 text-[9px] font-semibold uppercase tracking-[0.16em] text-primary-foreground transition-all hover:shadow-gold sm:px-6 sm:text-[10px]"
              >
                <FileText size={14} /> Request quote
              </Link>
              <Link
                to="/products"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-foreground/25 bg-card/55 px-4 text-[9px] font-semibold uppercase tracking-[0.16em] text-foreground transition-colors hover:border-primary hover:text-primary sm:px-6 sm:text-[10px]"
              >
                View products <ArrowRight size={13} />
              </Link>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
              <button type="button" onClick={openLiveChat} className="inline-flex min-h-10 items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-emerald-300 hover:text-emerald-200">
                <Headphones size={14} /> Chat with Irha team
              </button>
              <Link to="/factory-video-call" className="inline-flex min-h-10 items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground hover:text-primary">
                <Video size={14} /> Request factory call
              </Link>
            </div>

            <ul className="mt-5 grid gap-2 border-t border-border/60 pt-4 text-[11px] leading-5 text-foreground/65 sm:grid-cols-2 sm:text-xs">
              {PROOF_POINTS.map((point) => (
                <li key={point} className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-primary" strokeWidth={1.8} />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-[1.18fr_.82fr] sm:grid-rows-2 sm:gap-3">
            <Link
              to="/products/bavarian-trachten-wear"
              className="group relative col-span-2 min-h-[270px] overflow-hidden rounded-xl border border-primary/30 bg-[#eee8dc] shadow-elegant sm:col-span-1 sm:row-span-2 sm:min-h-[470px] sm:rounded-none"
            >
              <ResilientImage
                sources={[BAVARIAN_PRODUCT_THUMBNAIL, BAVARIAN_PRODUCT_IMAGE, bavarianCover]}
                alt="Custom Bavarian and Trachten apparel manufacturing"
                loading="eager"
                fetchPriority="high"
                decoding="async"
                width={1000}
                height={1250}
                className="h-full w-full object-contain p-4 transition-transform duration-700 group-hover:scale-[1.025] sm:p-7"
              />
              <div className="absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-black via-black/82 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5">
                <p className="text-[7px] font-semibold uppercase tracking-[0.16em] text-primary sm:text-[8px]">Manufacturing program</p>
                <p className="mt-1.5 font-display text-xl leading-tight sm:text-2xl">Bavarian &amp; Trachten</p>
                <p className="mt-1 text-[10px] text-white/68 sm:text-[11px]">Lederhosen · Dirndl · Shirts · Vests</p>
              </div>
            </Link>

            <Link to="/products/sportswear" className="group relative min-h-[145px] overflow-hidden rounded-xl border border-border/70 bg-black sm:min-h-0 sm:rounded-none">
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

            <Link to="/products/premium-leather-apparel" className="group relative min-h-[145px] overflow-hidden rounded-xl border border-border/70 bg-black sm:min-h-0 sm:rounded-none">
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
