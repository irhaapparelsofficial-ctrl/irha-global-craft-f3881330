import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, FileText, Video } from "lucide-react";
import ResilientImage from "@/components/ResilientImage";
import { usePublishedCmsDocument } from "@/hooks/usePublishedCmsDocument";
import {
  DEFAULT_HERO_CONTENT,
  HOME_HERO_DOCUMENT_KEY,
  normalizeHeroContent,
  type HeroCmsContent,
} from "@/lib/cms";
import { thumbnailUrl } from "@/lib/imageThumbnails";

import bavarianCover from "@/assets/og/og-bavarian-hero.jpg";
import bavarianThumb from "@/assets/og/og-bavarian-hero.jpg?w=900&format=webp&quality=74";
import sportswearCover from "@/assets/og/og-sportswear.jpg";
import sportswearThumb from "@/assets/og/og-sportswear.jpg?w=720&format=webp&quality=72";
import leatherCover from "@/assets/og/og-leather.jpg";
import leatherThumb from "@/assets/og/og-leather.jpg?w=720&format=webp&quality=72";

const BAVARIAN_PRODUCT_IMAGE =
  "/product-media/distressed-brown-short-lederhosen/01-hero-front.webp";

const PROOF_POINTS = [
  "OEM, ODM and private-label development",
  "Sampling and buyer approval before bulk",
  "Scheduled live factory video verification",
];

export default function HeroCarousel() {
  const { data: publishedContent } = usePublishedCmsDocument<HeroCmsContent>(
    HOME_HERO_DOCUMENT_KEY,
    DEFAULT_HERO_CONTENT,
  );
  const hero = useMemo(
    () => normalizeHeroContent(publishedContent).slides[0],
    [publishedContent],
  );

  return (
    <section className="relative overflow-hidden border-b border-border/60 bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_84%_12%,hsl(var(--primary)/0.13),transparent_27%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="container-luxe relative pb-14 pt-28 md:pb-16 md:pt-32">
        <div className="mb-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border/60 pb-5 text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground md:text-[10px]">
          <span>Sialkot, Pakistan</span>
          <span className="hidden h-1 w-1 rounded-full bg-primary sm:block" />
          <span>OEM · ODM · Private Label</span>
          <span className="hidden h-1 w-1 rounded-full bg-primary sm:block" />
          <span>Quotation-based B2B manufacturing</span>
        </div>

        <div className="grid gap-10 xl:grid-cols-[minmax(0,.82fr)_minmax(560px,1.18fr)] xl:items-center xl:gap-14">
          <div className="max-w-3xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary md:text-xs">
              {hero.eyebrow || "Bavarian & Trachten manufacturing"}
            </p>
            <h1 className="mt-4 font-display text-[2.65rem] leading-[1.02] tracking-[-0.035em] text-foreground sm:text-6xl lg:text-[4.35rem]">
              {hero.title || "Bavarian & Trachten Wear"}
              <span className="mt-2 block font-normal italic text-gold">
                {hero.highlight || "Built for wholesale programs."}
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-sm leading-7 text-foreground/68 md:text-base md:leading-8">
              {hero.subtitle ||
                "Custom Lederhosen, Dirndl and Trachten programs for wholesalers, retailers and private-label buyers, developed around the actual product brief."}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/inquiry?intent=rfq"
                className="inline-flex min-h-12 items-center gap-3 bg-gradient-gold px-7 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary-foreground transition-all hover:shadow-gold"
              >
                <FileText size={14} /> Request a quote <ArrowRight size={14} />
              </Link>
              <Link
                to="/products/bavarian-trachten-wear"
                className="inline-flex min-h-12 items-center gap-3 border border-foreground/25 bg-card/55 px-7 text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                View Bavarian collection <ArrowRight size={14} />
              </Link>
            </div>

            <ul className="mt-8 grid gap-3 border-t border-border/60 pt-6 text-sm text-foreground/68 sm:grid-cols-3">
              {PROOF_POINTS.map((point) => (
                <li key={point} className="flex items-start gap-2.5 leading-6">
                  <CheckCircle2 size={15} className="mt-1 shrink-0 text-primary" strokeWidth={1.7} />
                  <span>{point}</span>
                </li>
              ))}
            </ul>

            <Link
              to="/factory-video-call"
              className="mt-6 inline-flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.19em] text-muted-foreground transition-colors hover:text-primary"
            >
              <Video size={13} /> Request a live factory call
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 sm:grid-rows-2">
            <Link
              to="/products/bavarian-trachten-wear"
              className="group relative min-h-[420px] overflow-hidden border border-primary/30 bg-[#eee8dc] shadow-elegant sm:row-span-2"
            >
              <ResilientImage
                sources={[thumbnailUrl(BAVARIAN_PRODUCT_IMAGE), BAVARIAN_PRODUCT_IMAGE, bavarianCover]}
                alt="Distressed brown Lederhosen with suspenders by Irha Apparels"
                loading="eager"
                decoding="async"
                width={1000}
                height={1250}
                className="h-full w-full object-contain p-7 transition-transform duration-700 ease-out group-hover:scale-[1.025] md:p-9"
              />
              <div className="absolute inset-x-4 bottom-4 border border-white/20 bg-black/88 p-4 text-white backdrop-blur-sm">
                <p className="text-[8px] font-semibold uppercase tracking-[0.22em] text-primary">Primary manufacturing program</p>
                <p className="mt-1 font-display text-2xl">Bavarian & Trachten Wear</p>
                <p className="mt-2 text-xs text-white/65">Lederhosen · Dirndl · Trachten</p>
              </div>
            </Link>

            <Link
              to="/products/bavarian-trachten-wear"
              className="group relative min-h-[202px] overflow-hidden border border-border/70 bg-black"
            >
              <ResilientImage
                sources={[bavarianThumb, bavarianCover]}
                alt="Bavarian and Trachten manufacturing collection"
                loading="eager"
                decoding="async"
                width={900}
                height={560}
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.035]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
              <div className="absolute inset-x-4 bottom-4 text-white">
                <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-primary">Collection overview</p>
                <p className="mt-1 font-display text-xl">Trachten Programs</p>
              </div>
            </Link>

            <div className="grid min-h-[202px] grid-cols-2 gap-3">
              <Link
                to="/products/sportswear"
                className="group relative overflow-hidden border border-border/70 bg-black"
              >
                <ResilientImage
                  sources={[sportswearThumb, sportswearCover]}
                  alt="Custom sportswear manufacturing"
                  loading="eager"
                  decoding="async"
                  width={720}
                  height={720}
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
                <p className="absolute inset-x-3 bottom-3 text-[9px] font-semibold uppercase tracking-[0.17em] text-white">Sportswear</p>
              </Link>
              <Link
                to="/products/premium-leather-apparel"
                className="group relative overflow-hidden border border-border/70 bg-black"
              >
                <ResilientImage
                  sources={[leatherThumb, leatherCover]}
                  alt="Premium leather apparel manufacturing"
                  loading="eager"
                  decoding="async"
                  width={720}
                  height={720}
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
                <p className="absolute inset-x-3 bottom-3 text-[9px] font-semibold uppercase tracking-[0.17em] text-white">Leather</p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
