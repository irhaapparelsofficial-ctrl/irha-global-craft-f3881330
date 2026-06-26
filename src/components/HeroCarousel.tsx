import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";

import bavarian from "@/assets/og/og-bavarian.jpg?w=1920;1280;800&format=webp&quality=72&as=srcset";
import bavarianFb from "@/assets/og/og-bavarian.jpg?w=1600&format=webp&quality=74";
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
    alt: "Heritage Bavarian lederhosen — Irha Apparels",
    eyebrow: "Sialkot · Worldwide Export",
    title: "Bavarian Wear",
    highlight: "MOQ 50",
    subtitle: "Authentic lederhosen, dirndl & trachten — handcrafted for DACH wholesalers.",
    ctaLabel: "View Collection",
    ctaHref: "/products/bavarian",
  },
  {
    src: sportswearFb,
    srcSet: sportswear,
    alt: "Custom sportswear & streetwear hoodies",
    eyebrow: "OEM · ODM · Private Label",
    title: "Streetwear & Sportswear",
    highlight: "FOB Sialkot",
    subtitle: "Sublimation jerseys, tracksuits & heavyweight hoodies — built for global brands.",
    ctaLabel: "View Collection",
    ctaHref: "/products/sportswear",
  },
  {
    src: leatherFb,
    srcSet: leather,
    alt: "Full-grain leather jacket — atelier production",
    eyebrow: "Heritage Craftsmanship",
    title: "Custom Leather",
    highlight: "In-House Production",
    subtitle: "Full-grain biker, fashion & motorcycle jackets — engineered for UK, USA & EU.",
    ctaLabel: "View Collection",
    ctaHref: "/products/leather",
  },
];

const INTERVAL = 5000;

export default function HeroCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [loaded, setLoaded] = useState<Set<number>>(() => new Set([0]));
  const touchStartX = useRef<number | null>(null);
  const count = SLIDES.length;

  const go = useCallback(
    (next: number) => {
      const n = ((next % count) + count) % count;
      setLoaded((prev) => {
        if (prev.has(n)) return prev;
        const copy = new Set(prev);
        copy.add(n);
        return copy;
      });
      setIndex(n);
    },
    [count],
  );

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setIndex((i) => {
        const next = (i + 1) % count;
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
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
        touchStartX.current = null;
      }}
      aria-roledescription="carousel"
    >
      {SLIDES.map((s, i) => {
        const shouldLoad = loaded.has(i);
        return (
          <img
            key={s.src}
            src={shouldLoad ? s.src : undefined}
            srcSet={shouldLoad ? s.srcSet : undefined}
            sizes="100vw"
            alt={s.alt}
            width={1920}
            height={1280}
            loading={i === 0 ? "eager" : "lazy"}
            fetchPriority={i === 0 ? "high" : "low"}
            decoding="async"
            className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-[1200ms] ease-in-out ${
              i === index ? "opacity-100" : "opacity-0"
            }`}
          />
        );
      })}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/70 via-black/45 to-black/20" />

      {/* Per-slide content */}
      {SLIDES.map((s, i) => (
        <div
          key={`content-${i}`}
          className={`absolute inset-0 z-10 flex items-center transition-opacity duration-[1000ms] ${
            i === index ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          aria-hidden={i !== index}
        >
          <div className="container-luxe">
            <div className="max-w-2xl">
              <div className="h-px w-16 bg-gold mb-6" />
              <p className="mb-4 text-[10px] md:text-xs font-mono uppercase tracking-[0.4em] text-gold">
                {s.eyebrow}
              </p>
              <h1 className="font-display text-white text-4xl md:text-6xl lg:text-7xl leading-[1.05] tracking-tight">
                {s.title} <span className="text-gold italic font-normal">— {s.highlight}</span>
              </h1>
              <p className="mt-6 max-w-xl text-sm md:text-base text-white/80 leading-relaxed">
                {s.subtitle}
              </p>
              <Link
                to={s.ctaHref}
                tabIndex={i === index ? 0 : -1}
                className="group mt-9 inline-flex items-center gap-3 bg-gradient-gold text-primary-foreground px-8 py-4 text-xs uppercase tracking-[0.3em] font-medium hover:shadow-gold transition-all"
              >
                {s.ctaLabel}
                <ArrowUpRight size={18} className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
              </Link>
            </div>
          </div>
        </div>
      ))}

      {/* Arrows */}
      <button
        type="button"
        onClick={() => go(index - 1)}
        aria-label="Previous slide"
        className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 h-11 w-11 items-center justify-center bg-background/60 backdrop-blur border border-border/60 hover:border-gold hover:text-gold transition-colors"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        type="button"
        onClick={() => go(index + 1)}
        aria-label="Next slide"
        className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 h-11 w-11 items-center justify-center bg-background/60 backdrop-blur border border-border/60 hover:border-gold hover:text-gold transition-colors"
      >
        <ChevronRight size={18} />
      </button>

      {/* Dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => go(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "w-10 bg-gold" : "w-5 bg-white/40 hover:bg-white/70"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
