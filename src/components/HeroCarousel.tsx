import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";

import bavarian from "@/assets/og/og-bavarian-hero.jpg?w=1920;1280;800&format=webp&quality=72&as=srcset";
import bavarianFb from "@/assets/og/og-bavarian-hero.jpg?w=1600&format=webp&quality=74";
import sportswear from "@/assets/og/og-sportswear.jpg?w=1920;1280;800&format=webp&quality=72&as=srcset";
import sportswearFb from "@/assets/og/og-sportswear.jpg?w=1600&format=webp&quality=74";
import leather from "@/assets/og/og-leather.jpg?w=1920;1280;800&format=webp&quality=72&as=srcset";
import leatherFb from "@/assets/og/og-leather.jpg?w=1600&format=webp&quality=74";

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
};

const SLIDES: Slide[] = [
  {
    src: bavarianFb,
    srcSet: bavarian,
    alt: "Bavarian lederhosen with decorative embroidery — Irha Apparels",
    eyebrow: "Sialkot · Custom B2B Manufacturing",
    title: "Bavarian Wear",
    highlight: "Program-Based",
    subtitle: "Custom lederhosen, dirndl and Trachten programs for wholesalers, retailers and private-label buyers.",
    ctaLabel: "View Collection",
    ctaHref: "/products/bavarian-trachten-wear",
  },
  {
    src: sportswearFb,
    srcSet: sportswear,
    alt: "Custom sportswear and streetwear apparel",
    eyebrow: "OEM · ODM · Private Label",
    title: "Streetwear & Sportswear",
    highlight: "Made to Requirement",
    subtitle: "Custom sportswear, tracksuits and streetwear programs developed around buyer specifications.",
    ctaLabel: "View Collection",
    ctaHref: "/products/sportswear",
  },
  {
    src: leatherFb,
    srcSet: leather,
    alt: "Custom leather jacket production concept",
    eyebrow: "Custom Leather Programs",
    title: "Leather Apparel",
    highlight: "Requirement-Led",
    subtitle: "Custom leather jackets and apparel programs reviewed against material, construction and branding requirements.",
    ctaLabel: "View Collection",
    ctaHref: "/products/premium-leather-apparel",
  },
];

const INTERVAL = 5000;

export default function HeroCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [loaded, setLoaded] = useState<Set<number>>(() => new Set([0]));
  const touchStartX = useRef<number | null>(null);
  const count = SLIDES.length;

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
      className="relative h-[70vh] min-h-[480px] md:min-h-[560px] w-full overflow-hidden bg-background"
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

      {SLIDES.map((slide, slideIndex) => {
        const shouldLoad = loaded.has(slideIndex);
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

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/70 via-black/45 to-black/20" />

      {SLIDES.map((slide, slideIndex) => (
        <div
          key={`content-${slideIndex}`}
          className={`absolute inset-0 z-10 flex items-center transition-opacity duration-[1000ms] ${slideIndex === index ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          aria-hidden={slideIndex !== index}
        >
          <div className="container-luxe">
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
          </div>
        </div>
      ))}

      <button type="button" onClick={() => go(index - 1)} aria-label="Previous slide" className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 h-11 w-11 items-center justify-center bg-background/60 backdrop-blur border border-border/60 hover:border-gold hover:text-gold transition-colors">
        <ChevronLeft size={18} />
      </button>
      <button type="button" onClick={() => go(index + 1)} aria-label="Next slide" className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 h-11 w-11 items-center justify-center bg-background/60 backdrop-blur border border-border/60 hover:border-gold hover:text-gold transition-colors">
        <ChevronRight size={18} />
      </button>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {SLIDES.map((_, slideIndex) => (
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
