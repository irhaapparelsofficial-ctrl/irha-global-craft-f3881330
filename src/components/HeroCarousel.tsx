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
      className="relative overflow-hidden border-b border-[#d9d2c3] bg-[#f4f1ea] text-[#122033]"
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
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(185,145,70,.16),transparent_28%)]" />

      <div className="container-luxe relative pb-12 pt-32 md:pb-14 md:pt-36">
        <div className="mb-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-[#d9d2c3] pb-5 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#516071] md:text-[10px]">
          <span>Sialkot, Pakistan</span>
          <span className="hidden h-1 w-1 rounded-full bg-[#b8924b] sm:block" />
          <span>OEM · ODM · Private Label</span>
          <span className="hidden h-1 w-1 rounded-full bg-[#b8924b] sm:block" />
          <span>Quotation-based B2B manufacturing</span>
        </div>

        <div key={activeSlide.label} className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(380px,.78fr)] lg:gap-16">
          <div className="max-w-3xl py-4">
            <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#a77f34] md:text-xs">
              {activeSlide.eyebrow}
            </p>
            <h2 className="font-display text-[2.75rem] leading-[1.02] tracking-[-0.03em] sm:text-6xl md:text-7xl lg:text-[4.75rem]">
              {activeSlide.title}
              <span className="mt-2 block font-normal italic text-[#a77f34]">{activeSlide.highlight}</span>
            </h2>
            <p className="mt-6 max-w-2xl text-sm leading-7 text-[#526173] md:text-base md:leading-8">
              {activeSlide.subtitle}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/inquiry?intent=rfq"
                className="inline-flex min-h-12 items-center gap-3 bg-[#122033] px-7 text-[10px] font-semibold uppercase tracking-[0.22em] text-white transition-colors hover:bg-[#1b3049]"
              >
                <FileText size={14} /> Request a quote <ArrowRight size={14} />
              </Link>
              <Link
                to={activeSlide.ctaHref}
                className="inline-flex min-h-12 items-center gap-3 border border-[#9d927f] bg-white/50 px-7 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#122033] transition-colors hover:border-[#a77f34] hover:text-[#a77f34]"
              >
                {activeSlide.ctaLabel} <ArrowRight size={14} />
              </Link>
            </div>

            <div className="mt-9 grid max-w-2xl gap-3 text-sm text-[#415064] sm:grid-cols-3">
              <div className="border-l-2 border-[#b8924b] pl-4">
                <p className="font-semibold text-[#122033]">Custom development</p>
                <p className="mt-1 text-xs leading-5">From brief, tech pack or reference sample.</p>
              </div>
              <div className="border-l-2 border-[#b8924b] pl-4">
                <p className="font-semibold text-[#122033]">Buyer approvals</p>
                <p className="mt-1 text-xs leading-5">Requirements reviewed before bulk commitment.</p>
              </div>
              <div className="border-l-2 border-[#b8924b] pl-4">
                <p className="font-semibold text-[#122033]">Factory verification</p>
                <p className="mt-1 text-xs leading-5">Live video call available for buyers.</p>
              </div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[510px]">
            <div className="absolute -left-5 -top-5 hidden h-full w-full border border-[#c8b98f] md:block" />
            <div className="relative overflow-hidden border border-[#d8d0c1] bg-white p-3 shadow-[0_24px_70px_rgba(18,32,51,.14)]">
              <div className={`relative aspect-[4/5] overflow-hidden ${activeSlide.fit === "contain" ? "bg-[#eee8dc]" : "bg-[#122033]"}`}>
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
                <div className="absolute inset-x-4 bottom-4 border border-white/25 bg-[#122033]/92 p-4 text-white backdrop-blur-sm">
                  <p className="text-[8px] uppercase tracking-[0.24em] text-[#d9b765]">Featured program</p>
                  <p className="mt-1 font-display text-xl">{activeSlide.label}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-[#d9d2c3] pt-5">
          <div className="flex items-center gap-2">
            {slides.map((slide, slideIndex) => (
              <button
                key={slide.label}
                type="button"
                onClick={() => go(slideIndex)}
                aria-label={`Show ${slide.label}`}
                className={`h-1.5 transition-all ${slideIndex === index ? "w-10 bg-[#a77f34]" : "w-5 bg-[#b9b1a4] hover:bg-[#7f7568]"}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Previous manufacturing program"
              className="inline-flex h-10 w-10 items-center justify-center border border-[#b7ad9f] bg-white/60 text-[#122033] transition-colors hover:border-[#a77f34] hover:text-[#a77f34]"
            >
              <ChevronLeft size={17} />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Next manufacturing program"
              className="inline-flex h-10 w-10 items-center justify-center border border-[#b7ad9f] bg-white/60 text-[#122033] transition-colors hover:border-[#a77f34] hover:text-[#a77f34]"
            >
              <ChevronRight size={17} />
            </button>
            <Link
              to="/factory-video-call"
              className="hidden min-h-10 items-center gap-2 border border-[#b7ad9f] bg-white/60 px-4 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#122033] transition-colors hover:border-[#a77f34] hover:text-[#a77f34] sm:inline-flex"
            >
              <Video size={13} /> Factory call
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
