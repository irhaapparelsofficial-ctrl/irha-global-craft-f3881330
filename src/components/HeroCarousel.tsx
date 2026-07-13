import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight, FileText, Video } from "lucide-react";
import { usePublishedCmsDocument } from "@/hooks/usePublishedCmsDocument";
import {
  DEFAULT_HERO_CONTENT,
  HOME_HERO_DOCUMENT_KEY,
  normalizeHeroContent,
  type HeroCmsContent,
} from "@/lib/cms";

import sportswear from "@/assets/og/og-sportswear.jpg?w=1600;1000;760&format=webp&quality=74&as=srcset";
import sportswearFb from "@/assets/og/og-sportswear.jpg?w=1400&format=webp&quality=76";
import leather from "@/assets/og/og-leather.jpg?w=1600;1000;760&format=webp&quality=74&as=srcset";
import leatherFb from "@/assets/og/og-leather.jpg?w=1400&format=webp&quality=76";

const BAVARIAN_PRODUCT_IMAGE =
  "/product-media/distressed-brown-short-lederhosen/01-hero-front.webp";

const AUTOPLAY_MS = 6200;

type Slide = {
  src: string;
  srcSet: string;
  alt: string;
  eyebrow: string;
  title: string;
  highlight: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  label: string;
  fit: "contain" | "cover";
};

const BASE_SLIDES: Slide[] = [
  {
    src: BAVARIAN_PRODUCT_IMAGE,
    srcSet: BAVARIAN_PRODUCT_IMAGE,
    alt: "Distressed brown short Lederhosen with suspenders by Irha Apparels",
    label: "Bavarian & Trachten Wear",
    fit: "contain",
    ...DEFAULT_HERO_CONTENT.slides[0],
  },
  {
    src: sportswearFb,
    srcSet: sportswear,
    alt: "Custom sportswear and streetwear manufacturing",
    label: "Sportswear & Streetwear",
    fit: "cover",
    ...DEFAULT_HERO_CONTENT.slides[1],
  },
  {
    src: leatherFb,
    srcSet: leather,
    alt: "Custom leather apparel manufacturing",
    label: "Premium Leather Apparel",
    fit: "cover",
    ...DEFAULT_HERO_CONTENT.slides[2],
  },
];

export default function HeroCarousel() {
  const { data: publishedContent } = usePublishedCmsDocument<HeroCmsContent>(
    HOME_HERO_DOCUMENT_KEY,
    DEFAULT_HERO_CONTENT,
  );
  const slides = useMemo(() => {
    const content = normalizeHeroContent(publishedContent);
    return BASE_SLIDES.map((slide, index) => ({ ...slide, ...content.slides[index] }));
  }, [publishedContent]);

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const activeSlide = slides[index];

  const go = useCallback(
    (next: number) => {
      setIndex(((next % slides.length) + slides.length) % slides.length);
    },
    [slides.length],
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    if (paused || reducedMotion || slides.length < 2) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [paused, reducedMotion, slides.length]);

  return (
    <section
      className="relative overflow-hidden border-b border-border/60 bg-background text-foreground"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
      }}
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        if (touchStartX.current == null) return;
        const delta = (event.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
        if (Math.abs(delta) > 42) go(index + (delta < 0 ? 1 : -1));
        touchStartX.current = null;
      }}
      aria-roledescription="carousel"
      aria-label="Irha Apparels manufacturing programs"
    >
      <h1 className="sr-only">Custom Apparel Manufacturer for Global B2B Buyers</h1>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,hsl(var(--primary)/0.14),transparent_28%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="container-luxe relative pb-12 pt-32 md:pb-14 md:pt-36">
        <div className="mb-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border/60 pb-5 text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground md:text-[10px]">
          <span>Sialkot, Pakistan</span>
          <span className="hidden h-1 w-1 rounded-full bg-primary sm:block" />
          <span>OEM · ODM · Private Label</span>
          <span className="hidden h-1 w-1 rounded-full bg-primary sm:block" />
          <span>Quotation-based B2B manufacturing</span>
        </div>

        <div key={activeSlide.label} className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(380px,.78fr)] lg:gap-16">
          <div className="max-w-3xl py-4">
            <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.28em] text-primary md:text-xs">
              {activeSlide.eyebrow}
            </p>
            <h2 className="font-display text-[2.75rem] leading-[1.02] tracking-[-0.03em] text-foreground sm:text-6xl md:text-7xl lg:text-[4.75rem]">
              {activeSlide.title}
              <span className="mt-2 block font-normal italic text-gold">{activeSlide.highlight}</span>
            </h2>
            <p className="mt-6 max-w-2xl text-sm leading-7 text-foreground/68 md:text-base md:leading-8">
              {activeSlide.subtitle}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/inquiry?intent=rfq"
                className="inline-flex min-h-12 items-center gap-3 bg-gradient-gold px-7 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary-foreground transition-all hover:shadow-gold"
              >
                <FileText size={14} /> Request a quote <ArrowRight size={14} />
              </Link>
              <Link
                to={activeSlide.ctaHref}
                className="inline-flex min-h-12 items-center gap-3 border border-foreground/25 bg-card/55 px-7 text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                {activeSlide.ctaLabel} <ArrowRight size={14} />
              </Link>
            </div>

            <div className="mt-9 grid max-w-2xl gap-3 text-sm text-foreground/68 sm:grid-cols-3">
              <div className="border-l-2 border-primary pl-4">
                <p className="font-semibold text-foreground">Custom development</p>
                <p className="mt-1 text-xs leading-5">From brief, tech pack or reference sample.</p>
              </div>
              <div className="border-l-2 border-primary pl-4">
                <p className="font-semibold text-foreground">Buyer approvals</p>
                <p className="mt-1 text-xs leading-5">Requirements reviewed before bulk commitment.</p>
              </div>
              <div className="border-l-2 border-primary pl-4">
                <p className="font-semibold text-foreground">Factory verification</p>
                <p className="mt-1 text-xs leading-5">Live video call available for buyers.</p>
              </div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[510px]">
            <div className="absolute -left-5 -top-5 hidden h-full w-full border border-primary/25 md:block" />
            <div className="relative overflow-hidden border border-border/70 bg-card p-3 shadow-elegant">
              <div className={`relative aspect-[4/5] overflow-hidden ${activeSlide.fit === "contain" ? "bg-[#eee8dc]" : "bg-black"}`}>
                <img
                  src={activeSlide.src}
                  srcSet={activeSlide.srcSet}
                  sizes="(min-width: 1024px) 500px, 88vw"
                  alt={activeSlide.alt}
                  width={1000}
                  height={1250}
                  loading="eager"
                  decoding="async"
                  className={`h-full w-full ${activeSlide.fit === "contain" ? "object-contain p-6 md:p-8" : "object-cover"}`}
                />
                <div className="absolute inset-x-4 bottom-4 border border-white/20 bg-black/85 p-4 text-white backdrop-blur-sm">
                  <p className="text-[8px] uppercase tracking-[0.24em] text-primary">Featured program</p>
                  <p className="mt-1 font-display text-xl">{activeSlide.label}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-border/60 pt-5">
          <div className="flex items-center gap-2">
            {slides.map((slide, slideIndex) => (
              <button
                key={slide.label}
                type="button"
                onClick={() => go(slideIndex)}
                aria-label={`Show ${slide.label}`}
                className={`h-1.5 transition-all ${slideIndex === index ? "w-10 bg-primary" : "w-5 bg-foreground/20 hover:bg-foreground/45"}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Previous manufacturing program"
              className="inline-flex h-10 w-10 items-center justify-center border border-border/70 bg-card/70 text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <ChevronLeft size={17} />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Next manufacturing program"
              className="inline-flex h-10 w-10 items-center justify-center border border-border/70 bg-card/70 text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <ChevronRight size={17} />
            </button>
            <Link
              to="/factory-video-call"
              className="hidden min-h-10 items-center gap-2 border border-border/70 bg-card/70 px-4 text-[9px] font-semibold uppercase tracking-[0.18em] text-foreground transition-colors hover:border-primary hover:text-primary sm:inline-flex"
            >
              <Video size={13} /> Factory call
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
