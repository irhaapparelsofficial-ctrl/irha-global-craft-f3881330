import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { usePublishedCmsDocument } from "@/hooks/usePublishedCmsDocument";
import {
  DEFAULT_HERO_CONTENT,
  HOME_HERO_DOCUMENT_KEY,
  normalizeHeroContent,
  type HeroCmsContent,
} from "@/lib/cms";

import sportswear from "@/assets/og/og-sportswear.jpg?w=1920;1280;800&format=webp&quality=72&as=srcset";
import sportswearFb from "@/assets/og/og-sportswear.jpg?w=1600&format=webp&quality=74";
import leather from "@/assets/og/og-leather.jpg?w=1920;1280;800&format=webp&quality=72&as=srcset";
import leatherFb from "@/assets/og/og-leather.jpg?w=1600&format=webp&quality=74";

const BAVARIAN_PRODUCT_IMAGE =
  "/product-media/distressed-brown-short-lederhosen/01-hero-front.webp";

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
  presentation?: "background" | "product-card";
};

const BASE_SLIDES: Slide[] = [
  {
    src: BAVARIAN_PRODUCT_IMAGE,
    srcSet: BAVARIAN_PRODUCT_IMAGE,
    alt: "Distressed brown short Lederhosen with suspenders — Irha Apparels",
    presentation: "product-card",
    ...DEFAULT_HERO_CONTENT.slides[0],
  },
  {
    src: sportswearFb,
    srcSet: sportswear,
    alt: "Custom sportswear and streetwear apparel",
    presentation: "background",
    ...DEFAULT_HERO_CONTENT.slides[1],
  },
  {
    src: leatherFb,
    srcSet: leather,
    alt: "Custom leather jacket production concept",
    presentation: "background",
    ...DEFAULT_HERO_CONTENT.slides[2],
  },
];

const INTERVAL = 5000;

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
  const [loaded, setLoaded] = useState<Set<number>>(() => new Set([0]));
  const touchStartX = useRef<number | null>(null);
  const count = slides.length;

  const go = useCallback((next: number) => {
    const n = ((next % count) + count) % count;
    setLoaded((prev) => {
      if (prev.has(n)) return prev;
      const copy = new Set(prev);
      copy.add(n);
      return copy;
    });
    setIndex(n);
  }, [count]);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setIndex((current) => {
        const next = (current + 1) % count;
        setLoaded((prev) => {
          if (prev.has(next)) return prev;
          const copy = new Set(prev);
          copy.add(next);
          return copy;
        });
        return next;
      });
    }, INTERVAL);
    return () => window.clearInterval(id);
  }, [paused, count]);

  return (
    <section
      className="relative h-[78vh] min-h-[700px] md:h-[70vh] md:min-h-[560px] w-full overflow-hidden bg-background"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(event) => { touchStartX.current = event.touches[0].clientX; }}
      onTouchEnd={(event) => {
        if (touchStartX.current == null) return;
        const dx = event.changedTouches[0].clientX - touchStartX.current;
        if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
        touchStartX.current = null;
      }}
      aria-roledescription="carousel"
      aria-label="Irha Apparels manufacturing programs"
    >
      <h1 className="sr-only">Custom Apparel Manufacturer for Global B2B Buyers</h1>

      {slides.map((slide, slideIndex) => {
        const shouldLoad = loaded.has(slideIndex);
        const isProductCard = slide.presentation === "product-card";

        if (isProductCard) {
          return (
            <div
              key={`backdrop-${slide.src}`}
              aria-hidden="true"
              className={`absolute inset-0 bg-[radial-gradient(circle_at_78%_42%,hsl(var(--gold)/0.16),transparent_34%),linear-gradient(115deg,hsl(var(--background)),hsl(var(--card)))] transition-opacity duration-[1200ms] ease-in-out ${slideIndex === index ? "opacity-100" : "opacity-0"}`}
            />
          );
        }

        return (
          <img
            key={slide.src}
            src={shouldLoad ? slide.src : undefined}
            srcSet={shouldLoad ? slide.srcSet : undefined}
            sizes="100vw"
            alt={slide.alt}
            width={1920}
            height={1280}
            loading={slideIndex === 0 ? "eager" : "lazy"}
            decoding="async"
            className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-[1200ms] ease-in-out ${slideIndex === index ? "opacity-100" : "opacity-0"}`}
          />
        );
      })}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/76 via-black/48 to-black/16" />

      {slides.map((slide, slideIndex) => {
        const isProductCard = slide.presentation === "product-card";

        return (
          <div
            key={`content-${slideIndex}`}
            className={`absolute inset-0 z-10 flex items-center transition-opacity duration-[1000ms] ${slideIndex === index ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            aria-hidden={slideIndex !== index}
          >
            <div className="container-luxe w-full">
              <div className={isProductCard ? "grid grid-cols-1 items-center gap-8 md:grid-cols-[minmax(0,1fr)_minmax(320px,0.78fr)] md:gap-12 lg:gap-16" : "max-w-2xl"}>
                <div className="max-w-2xl">
                  <div className="h-px w-16 bg-gold mb-6" />
                  <p className="mb-4 text-[10px] md:text-xs font-mono uppercase tracking-[0.4em] text-gold">{slide.eyebrow}</p>
                  <h2 className="font-display text-white text-4xl md:text-6xl lg:text-7xl leading-[1.05] tracking-tight">
                    {slide.title} <span className="text-gold italic font-normal">— {slide.highlight}</span>
                  </h2>
                  <p className="mt-6 max-w-xl text-sm md:text-base text-white/80 leading-relaxed">{slide.subtitle}</p>
                  <Link
                    to={slide.ctaHref}
                    tabIndex={slideIndex === index ? 0 : -1}
                    className="group mt-9 inline-flex items-center gap-3 bg-gradient-gold text-primary-foreground px-8 py-4 text-xs uppercase tracking-[0.3em] font-medium hover:shadow-gold transition-all"
                  >
                    {slide.ctaLabel}
                    <ArrowUpRight size={18} className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                  </Link>
                </div>

                {isProductCard && (
                  <div className="relative mx-auto w-full max-w-[280px] border border-gold/45 bg-black/45 p-2 shadow-[0_30px_80px_rgba(0,0,0,0.45)] md:max-w-[450px] md:p-3">
                    <div className="relative aspect-square overflow-hidden bg-[#f4f0e7]">
                      <img
                        src={slide.src}
                        srcSet={slide.srcSet}
                        sizes="(min-width: 768px) 430px, 260px"
                        alt={slide.alt}
                        width={800}
                        height={800}
                        loading="eager"
                        decoding="async"
                        className="h-full w-full object-contain p-3 md:p-5"
                      />
                      <div className="absolute inset-x-3 bottom-3 border border-gold/35 bg-black/90 px-4 py-3 backdrop-blur-sm md:inset-x-4 md:bottom-4 md:px-5 md:py-4">
                        <p className="text-[8px] uppercase tracking-[0.35em] text-gold md:text-[9px]">Featured Program</p>
                        <p className="mt-1 font-display text-base text-white md:text-lg">Bavarian &amp; Trachten Wear</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      <button type="button" onClick={() => go(index - 1)} aria-label="Previous slide" className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 h-11 w-11 items-center justify-center bg-background/60 backdrop-blur border border-border/60 hover:border-gold hover:text-gold transition-colors">
        <ChevronLeft size={18} />
      </button>
      <button type="button" onClick={() => go(index + 1)} aria-label="Next slide" className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 h-11 w-11 items-center justify-center bg-background/60 backdrop-blur border border-border/60 hover:border-gold hover:text-gold transition-colors">
        <ChevronRight size={18} />
      </button>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {slides.map((_, slideIndex) => (
          <button
            key={slideIndex}
            type="button"
            onClick={() => go(slideIndex)}
            aria-label={`Go to slide ${slideIndex + 1}`}
            className={`h-1.5 rounded-full transition-all ${slideIndex === index ? "w-10 bg-gold" : "w-5 bg-white/40 hover:bg-white/70"}`}
          />
        ))}
      </div>
    </section>
  );
}