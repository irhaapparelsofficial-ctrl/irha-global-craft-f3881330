import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Video,
} from "lucide-react";
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
import factoryCinematic from "@/assets/banners/factory-cinematic.jpg";

const BAVARIAN_PRODUCT_IMAGE =
  "/product-media/distressed-brown-short-lederhosen/01-hero-front.webp";

type Slide = {
  src: string;
  srcSet: string;
  backgroundSrc: string;
  alt: string;
  eyebrow: string;
  title: string;
  highlight: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  presentation: "product" | "editorial";
  programLabel: string;
};

const BASE_SLIDES: Slide[] = [
  {
    src: BAVARIAN_PRODUCT_IMAGE,
    srcSet: BAVARIAN_PRODUCT_IMAGE,
    backgroundSrc: factoryCinematic,
    alt: "Distressed brown short Lederhosen with suspenders — Irha Apparels",
    presentation: "product",
    programLabel: "Bavarian & Trachten",
    ...DEFAULT_HERO_CONTENT.slides[0],
  },
  {
    src: sportswearFb,
    srcSet: sportswear,
    backgroundSrc: sportswearFb,
    alt: "Custom sportswear and streetwear apparel",
    presentation: "editorial",
    programLabel: "Performance & Streetwear",
    ...DEFAULT_HERO_CONTENT.slides[1],
  },
  {
    src: leatherFb,
    srcSet: leather,
    backgroundSrc: leatherFb,
    alt: "Custom leather jacket production concept",
    presentation: "editorial",
    programLabel: "Leather Apparel",
    ...DEFAULT_HERO_CONTENT.slides[2],
  },
];

const INTERVAL = 5200;

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
  const [loaded, setLoaded] = useState<Set<number>>(() => new Set([0]));
  const touchStartX = useRef<number | null>(null);
  const count = slides.length;

  const go = useCallback(
    (next: number) => {
      const normalized = ((next % count) + count) % count;
      setLoaded((current) => {
        if (current.has(normalized)) return current;
        const copy = new Set(current);
        copy.add(normalized);
        return copy;
      });
      setIndex(normalized);
    },
    [count],
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    if (paused || reducedMotion || count < 2) return;
    const id = window.setInterval(() => {
      setIndex((current) => {
        const next = (current + 1) % count;
        setLoaded((loadedSlides) => {
          if (loadedSlides.has(next)) return loadedSlides;
          const copy = new Set(loadedSlides);
          copy.add(next);
          return copy;
        });
        return next;
      });
    }, INTERVAL);
    return () => window.clearInterval(id);
  }, [paused, reducedMotion, count]);

  return (
    <section
      className="relative min-h-[780px] overflow-hidden border-b border-white/10 bg-[#090909] text-white md:min-h-[820px] lg:min-h-[860px]"
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
        const dx = (event.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
        if (Math.abs(dx) > 42) go(index + (dx < 0 ? 1 : -1));
        touchStartX.current = null;
      }}
      aria-roledescription="carousel"
      aria-label="Irha Apparels manufacturing programs"
    >
      <h1 className="sr-only">Custom Apparel Manufacturer for Global B2B Buyers</h1>

      {slides.map((slide, slideIndex) => (
        <div
          key={`background-${slide.programLabel}`}
          aria-hidden="true"
          className={`absolute inset-0 transition-opacity duration-[1400ms] ease-out ${
            slideIndex === index ? "opacity-100" : "opacity-0"
          }`}
        >
          <img
            src={loaded.has(slideIndex) ? slide.backgroundSrc : undefined}
            alt=""
            width={1920}
            height={1280}
            loading={slideIndex === 0 ? "eager" : "lazy"}
            decoding="async"
            className="h-full w-full object-cover object-center opacity-45 blur-[1px] scale-[1.02]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,5,5,0.98)_0%,rgba(5,5,5,0.88)_40%,rgba(5,5,5,0.42)_72%,rgba(5,5,5,0.72)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_38%,rgba(202,164,79,0.20),transparent_32%)]" />
        </div>
      ))}

      <div className="pointer-events-none absolute inset-0 opacity-[0.055] [background-image:linear-gradient(rgba(255,255,255,.45)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.45)_1px,transparent_1px)] [background-size:64px_64px]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/65 to-transparent" />

      <div className="container-luxe relative z-10 flex min-h-[780px] flex-col pt-32 pb-10 md:min-h-[820px] md:pt-36 lg:min-h-[860px] lg:pt-40">
        <div className="mb-10 flex flex-wrap items-center gap-3 text-[9px] uppercase tracking-[0.24em] text-white/70">
          <span className="inline-flex items-center gap-2 border border-gold/35 bg-black/35 px-3 py-2 backdrop-blur-sm">
            <ShieldCheck size={13} className="text-gold" /> Experienced manufacturer
          </span>
          <span className="border border-white/15 bg-black/25 px-3 py-2 backdrop-blur-sm">
            Newly built website
          </span>
          <span className="inline-flex items-center gap-2 border border-white/15 bg-black/25 px-3 py-2 backdrop-blur-sm">
            <Video size={13} className="text-gold" /> Live factory view available
          </span>
        </div>

        <div className="relative flex flex-1 items-center">
          {slides.map((slide, slideIndex) => {
            const active = slideIndex === index;
            const productPresentation = slide.presentation === "product";
            return (
              <div
                key={`content-${slide.programLabel}`}
                aria-hidden={!active}
                className={`absolute inset-0 grid items-center gap-10 transition-all duration-1000 lg:grid-cols-[minmax(0,0.94fr)_minmax(380px,0.72fr)] lg:gap-16 ${
                  active
                    ? "translate-y-0 opacity-100"
                    : "pointer-events-none translate-y-5 opacity-0"
                }`}
              >
                <div className="max-w-3xl self-center">
                  <div className="mb-6 flex items-center gap-4">
                    <span className="h-px w-14 bg-gold" />
                    <p className="text-[10px] font-mono uppercase tracking-[0.34em] text-gold md:text-xs">
                      {slide.eyebrow}
                    </p>
                  </div>
                  <h2 className="font-display text-[2.9rem] leading-[0.98] tracking-[-0.035em] text-white sm:text-6xl md:text-7xl lg:text-[5.4rem]">
                    {slide.title}
                    <span className="mt-2 block font-normal italic text-gold">{slide.highlight}</span>
                  </h2>
                  <p className="mt-7 max-w-2xl text-sm leading-7 text-white/72 md:text-base md:leading-8">
                    {slide.subtitle}
                  </p>

                  <div className="mt-9 flex flex-wrap gap-3">
                    <Link
                      to={slide.ctaHref}
                      tabIndex={active ? 0 : -1}
                      className="group inline-flex min-h-12 items-center gap-3 bg-gradient-gold px-7 text-[10px] font-semibold uppercase tracking-[0.24em] text-primary-foreground transition-all hover:shadow-gold"
                    >
                      {slide.ctaLabel}
                      <ArrowUpRight size={15} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </Link>
                    <Link
                      to="/inquiry?intent=rfq"
                      tabIndex={active ? 0 : -1}
                      className="inline-flex min-h-12 items-center border border-white/25 bg-black/25 px-7 text-[10px] uppercase tracking-[0.24em] text-white backdrop-blur-sm transition-colors hover:border-gold hover:text-gold"
                    >
                      Start a buyer brief
                    </Link>
                  </div>

                  <div className="mt-10 grid max-w-2xl grid-cols-3 gap-px border border-white/12 bg-white/12">
                    {[
                      ["01", "Product brief"],
                      ["02", "Requirement review"],
                      ["03", "Buyer approval"],
                    ].map(([number, label]) => (
                      <div key={number} className="bg-black/45 px-4 py-4 backdrop-blur-sm md:px-5">
                        <p className="font-mono text-[9px] tracking-[0.24em] text-gold">{number}</p>
                        <p className="mt-2 text-[9px] uppercase tracking-[0.16em] text-white/65 md:text-[10px]">
                          {label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="relative mx-auto hidden w-full max-w-[520px] self-center lg:block">
                  <div className="absolute -inset-8 border border-gold/10" />
                  <div className="absolute -left-8 top-10 h-28 w-px bg-gradient-to-b from-transparent via-gold to-transparent" />
                  <div className="relative border border-white/18 bg-black/45 p-3 shadow-[0_40px_100px_rgba(0,0,0,.55)] backdrop-blur-md">
                    <div className={`relative overflow-hidden ${productPresentation ? "aspect-[4/5] bg-[#f2ede3]" : "aspect-[4/5] bg-black"}`}>
                      <img
                        src={loaded.has(slideIndex) ? slide.src : undefined}
                        srcSet={loaded.has(slideIndex) ? slide.srcSet : undefined}
                        sizes="520px"
                        alt={slide.alt}
                        width={1000}
                        height={1250}
                        loading={slideIndex === 0 ? "eager" : "lazy"}
                        decoding="async"
                        className={`h-full w-full transition-transform duration-[1500ms] ${
                          productPresentation ? "object-contain p-7" : "object-cover"
                        } ${active ? "scale-100" : "scale-[1.04]"}`}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                      <div className="absolute inset-x-4 bottom-4 border border-white/15 bg-black/80 p-5 backdrop-blur-md">
                        <p className="text-[8px] uppercase tracking-[0.28em] text-gold">Featured manufacturing program</p>
                        <p className="mt-2 font-display text-2xl text-white">{slide.programLabel}</p>
                        <p className="mt-2 text-xs leading-relaxed text-white/60">Custom development for wholesale and private-label buyers.</p>
                      </div>
                    </div>
                  </div>
                  <div className="absolute -right-4 -top-4 border border-gold/40 bg-black px-4 py-3 text-[8px] uppercase tracking-[0.28em] text-gold">
                    Slide {String(slideIndex + 1).padStart(2, "0")}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="relative z-20 mt-auto grid gap-4 border-t border-white/14 pt-5 md:grid-cols-[auto_1fr_auto] md:items-center">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Previous slide"
              className="flex h-11 w-11 items-center justify-center border border-white/20 bg-black/30 text-white backdrop-blur transition-colors hover:border-gold hover:text-gold"
            >
              <ChevronLeft size={17} />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Next slide"
              className="flex h-11 w-11 items-center justify-center border border-white/20 bg-black/30 text-white backdrop-blur transition-colors hover:border-gold hover:text-gold"
            >
              <ChevronRight size={17} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {slides.map((slide, slideIndex) => (
              <button
                key={slide.programLabel}
                type="button"
                onClick={() => go(slideIndex)}
                aria-label={`Show ${slide.programLabel}`}
                aria-current={slideIndex === index ? "true" : undefined}
                className={`group border px-3 py-3 text-left transition-all md:px-4 ${
                  slideIndex === index
                    ? "border-gold/65 bg-gold/10"
                    : "border-white/12 bg-black/25 hover:border-white/30"
                }`}
              >
                <span className={`block h-px transition-all ${slideIndex === index ? "w-full bg-gold" : "w-6 bg-white/25 group-hover:w-full"}`} />
                <span className="mt-3 block text-[8px] uppercase tracking-[0.18em] text-white/55 md:text-[9px]">
                  {slide.programLabel}
                </span>
              </button>
            ))}
          </div>

          <Link
            to="/factory-video-call"
            className="hidden min-h-11 items-center gap-2 border border-gold/35 px-5 text-[9px] uppercase tracking-[0.22em] text-gold transition-colors hover:bg-gold hover:text-primary-foreground md:inline-flex"
          >
            <Video size={13} /> Verify by live call
          </Link>
        </div>
      </div>
    </section>
  );
}
