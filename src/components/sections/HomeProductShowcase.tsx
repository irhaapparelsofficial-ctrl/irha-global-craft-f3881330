import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import ResilientImage from "@/components/ResilientImage";
import { usePublicCatalogTree, type PublicTopCategory } from "@/hooks/usePublicCatalog";
import { resolveAsset } from "@/lib/assetResolver";
import { thumbnailUrl } from "@/lib/imageThumbnails";
import bavarianImage from "@/assets/og/og-bavarian-hero.jpg";
import leatherImage from "@/assets/og/og-leather.jpg";
import sportswearImage from "@/assets/og/og-sportswear.jpg";
import streetwearImage from "@/assets/og/og-streetwear.jpg";
import nightwearImage from "@/assets/og/og-nightwear.jpg";

type ShowcaseProduct = {
  id: string;
  slug: string;
  name: string;
  image: string;
  originalImage: string;
  fallbackImage: string;
  categoryName: string;
  categorySlug: string;
  subcategoryName: string;
};

const AUTOPLAY_MS = 3000;
const MAX_PRODUCTS = 15;
const CATEGORY_ORDER = [
  "bavarian-trachten-wear",
  "sportswear",
  "premium-leather-apparel",
  "streetwear-activewear",
  "leisure-nightwear",
] as const;

const CATEGORY_FALLBACKS: Record<string, string> = {
  "bavarian-trachten-wear": bavarianImage,
  "premium-leather-apparel": leatherImage,
  sportswear: sportswearImage,
  "streetwear-activewear": streetwearImage,
  "leisure-nightwear": nightwearImage,
};

function productRecord(
  category: PublicTopCategory,
  product: PublicTopCategory["directProducts"][number],
  subcategoryName: string,
): ShowcaseProduct {
  const fallbackImage = CATEGORY_FALLBACKS[category.slug] ?? bavarianImage;
  const originalImage = resolveAsset(product.image_url || product.gallery?.[0] || fallbackImage);

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    image: thumbnailUrl(originalImage),
    originalImage,
    fallbackImage,
    categoryName: category.name,
    categorySlug: category.slug,
    subcategoryName,
  };
}

function productsForCategory(category: PublicTopCategory): ShowcaseProduct[] {
  const nested = category.subs.flatMap((subCategory) =>
    subCategory.products
      .filter((product) => product.is_published && Boolean(product.image_url || product.gallery?.[0]))
      .map((product) => productRecord(category, product, subCategory.name)),
  );

  const direct = category.directProducts
    .filter((product) => product.is_published && Boolean(product.image_url || product.gallery?.[0]))
    .map((product) => productRecord(category, product, category.name));

  return [...direct, ...nested];
}

function balancedProducts(tree: PublicTopCategory[]): ShowcaseProduct[] {
  const orderIndex = (slug: string) => {
    const index = CATEGORY_ORDER.indexOf(slug as (typeof CATEGORY_ORDER)[number]);
    return index === -1 ? CATEGORY_ORDER.length : index;
  };
  const buckets = [...tree]
    .filter((category) => category.is_published)
    .sort((a, b) => orderIndex(a.slug) - orderIndex(b.slug))
    .map((category) => productsForCategory(category));
  const selected: ShowcaseProduct[] = [];
  const seen = new Set<string>();
  let round = 0;

  while (selected.length < MAX_PRODUCTS) {
    let added = false;
    for (const bucket of buckets) {
      const product = bucket[round];
      if (!product || seen.has(product.slug)) continue;
      seen.add(product.slug);
      selected.push(product);
      added = true;
      if (selected.length >= MAX_PRODUCTS) break;
    }
    if (!added) break;
    round += 1;
  }

  return selected;
}

function useCardsPerView() {
  const [count, setCount] = useState(3);

  useEffect(() => {
    const update = () => {
      if (window.innerWidth < 640) setCount(1);
      else if (window.innerWidth < 1024) setCount(2);
      else setCount(3);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return count;
}

export default function HomeProductShowcase() {
  const { data: tree = [] } = usePublicCatalogTree();
  const products = useMemo(() => balancedProducts(tree), [tree]);
  const requestedCardsPerView = useCardsPerView();
  const cardsPerView = Math.max(1, Math.min(requestedCardsPerView, products.length || 1));
  const loopProducts = useMemo(
    () => (products.length > 0 ? [...products, ...products.slice(0, cardsPerView)] : []),
    [cardsPerView, products],
  );
  const [position, setPosition] = useState(0);
  const [transitionEnabled, setTransitionEnabled] = useState(true);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const enableTransitionNextFrame = useCallback(() => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setTransitionEnabled(true));
    });
  }, []);

  const goNext = useCallback(() => {
    if (products.length < 2) return;
    setTransitionEnabled(true);
    setPosition((current) => current + 1);
  }, [products.length]);

  const goPrevious = useCallback(() => {
    if (products.length < 2) return;
    if (position === 0) {
      setTransitionEnabled(false);
      setPosition(products.length);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          setTransitionEnabled(true);
          setPosition(products.length - 1);
        });
      });
      return;
    }
    setTransitionEnabled(true);
    setPosition((current) => Math.max(0, current - 1));
  }, [position, products.length]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    if (products.length < 2 || paused || reducedMotion) return;
    const timer = window.setInterval(goNext, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [goNext, paused, products.length, reducedMotion]);

  useEffect(() => {
    setTransitionEnabled(false);
    setPosition(0);
    enableTransitionNextFrame();
  }, [cardsPerView, enableTransitionNextFrame, products.length]);

  const handleTransitionEnd = () => {
    if (position < products.length) return;
    setTransitionEnabled(false);
    setPosition(0);
    enableTransitionNextFrame();
  };

  if (products.length === 0) return null;

  const activeIndex = position % products.length;
  const translatePercent = position * (100 / cardsPerView);

  return (
    <section className="border-y border-border/60 bg-card/35 py-16 text-foreground md:py-20">
      <div className="container-luxe">
        <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-primary">Selected manufacturing styles</p>
            <h2 className="mt-3 font-display text-4xl leading-[1.06] md:text-5xl">
              Product programs moving through every core category.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-foreground/65 md:text-base">
              Explore selected styles across our core manufacturing categories, from Bavarian and Trachten wear to sportswear, leather, streetwear and leisure apparel.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goPrevious}
              aria-label="Previous products"
              className="inline-flex h-11 w-11 items-center justify-center border border-border/70 bg-background text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <ChevronLeft size={17} />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next products"
              className="inline-flex h-11 w-11 items-center justify-center border border-border/70 bg-background text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <ChevronRight size={17} />
            </button>
            <Link
              to="/products/all"
              className="ml-1 inline-flex min-h-11 items-center gap-2 bg-gradient-gold px-5 text-[9px] font-semibold uppercase tracking-[0.2em] text-primary-foreground transition-all hover:shadow-gold"
            >
              All products <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        <div
          className="overflow-hidden"
          role="region"
          aria-roledescription="carousel"
          aria-label="Featured product programs"
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
            if (Math.abs(delta) > 42) {
              if (delta < 0) goNext();
              else goPrevious();
            }
            touchStartX.current = null;
          }}
        >
          <div
            className={`-mx-2.5 flex will-change-transform ${
              transitionEnabled && !reducedMotion
                ? "transition-transform duration-700 ease-[cubic-bezier(0.22,0.61,0.36,1)]"
                : ""
            }`}
            style={{ transform: `translate3d(-${translatePercent}%, 0, 0)` }}
            onTransitionEnd={handleTransitionEnd}
          >
            {loopProducts.map((product, trackIndex) => {
              const visible = trackIndex >= position && trackIndex < position + cardsPerView;
              return (
                <div
                  key={`${product.id}-${trackIndex}`}
                  className="shrink-0 px-2.5"
                  style={{ flexBasis: `${100 / cardsPerView}%` }}
                  aria-hidden={!visible}
                >
                  <Link
                    to={`/products/${product.categorySlug}/${product.slug}`}
                    tabIndex={visible ? 0 : -1}
                    className="group block h-full overflow-hidden border border-border/70 bg-background transition-all duration-300 hover:-translate-y-1 hover:border-primary/70 hover:shadow-elegant"
                  >
                    <div className="relative aspect-[4/5] overflow-hidden bg-[#eee8dc]">
                      <ResilientImage
                        sources={[product.image, product.originalImage, product.fallbackImage]}
                        alt={`${product.name} by Irha Apparels`}
                        loading={trackIndex < cardsPerView ? "eager" : "lazy"}
                        decoding="async"
                        width={900}
                        height={1125}
                        className="h-full w-full object-contain p-6 transition-transform duration-700 ease-out group-hover:scale-[1.035] md:p-8"
                      />
                      <span className="absolute left-3 top-3 bg-black/85 px-3 py-2 text-[8px] font-semibold uppercase tracking-[0.18em] text-primary backdrop-blur-sm">
                        {product.categoryName}
                      </span>
                    </div>
                    <div className="p-5 md:p-6">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {product.subcategoryName}
                      </p>
                      <h3 className="mt-2 min-h-[3.25rem] font-display text-2xl leading-tight text-foreground transition-colors group-hover:text-primary">
                        {product.name}
                      </h3>
                      <span className="mt-5 inline-flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-primary">
                        View product <ArrowRight size={12} className="transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-7 flex items-center gap-3">
          <div className="h-1 flex-1 overflow-hidden bg-foreground/12">
            <div
              className="h-full bg-primary transition-[width] duration-700 ease-out"
              style={{ width: `${((activeIndex + 1) / products.length) * 100}%` }}
            />
          </div>
          <span className="min-w-max text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {String(activeIndex + 1).padStart(2, "0")} / {String(products.length).padStart(2, "0")}
          </span>
        </div>
      </div>
    </section>
  );
}
