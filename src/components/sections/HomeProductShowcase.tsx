import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { usePublicCatalogTree, type PublicTopCategory } from "@/hooks/usePublicCatalog";
import { resolveAsset } from "@/lib/assetResolver";

type ShowcaseProduct = {
  id: string;
  slug: string;
  name: string;
  image: string;
  categoryName: string;
  categorySlug: string;
  subcategoryName: string;
};

const AUTOPLAY_MS = 3600;
const MAX_PRODUCTS = 24;

function productsForCategory(category: PublicTopCategory): ShowcaseProduct[] {
  const nested = category.subs.flatMap((sub) =>
    sub.products
      .filter((product) => product.is_published && Boolean(product.image_url || product.gallery?.[0]))
      .map((product) => ({
        id: product.id,
        slug: product.slug,
        name: product.name,
        image: resolveAsset(product.image_url || product.gallery?.[0] || "/placeholder.svg"),
        categoryName: category.name,
        categorySlug: category.slug,
        subcategoryName: sub.name,
      })),
  );

  const direct = category.directProducts
    .filter((product) => product.is_published && Boolean(product.image_url || product.gallery?.[0]))
    .map((product) => ({
      id: product.id,
      slug: product.slug,
      name: product.name,
      image: resolveAsset(product.image_url || product.gallery?.[0] || "/placeholder.svg"),
      categoryName: category.name,
      categorySlug: category.slug,
      subcategoryName: category.name,
    }));

  return [...direct, ...nested];
}

function balancedProducts(tree: PublicTopCategory[]): ShowcaseProduct[] {
  const categoryBuckets = tree
    .filter((category) => category.is_published)
    .map((category) => productsForCategory(category));
  const selected: ShowcaseProduct[] = [];
  const seen = new Set<string>();
  let round = 0;

  while (selected.length < MAX_PRODUCTS) {
    let added = false;
    for (const bucket of categoryBuckets) {
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
  const [count, setCount] = useState(4);

  useEffect(() => {
    const update = () => {
      if (window.innerWidth < 640) setCount(1);
      else if (window.innerWidth < 1024) setCount(2);
      else setCount(4);
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
  const cardsPerView = useCardsPerView();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const go = useCallback(
    (next: number) => {
      if (products.length === 0) return;
      setIndex(((next % products.length) + products.length) % products.length);
    },
    [products.length],
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    if (products.length < 2 || paused || reducedMotion) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % products.length);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [paused, products.length, reducedMotion]);

  useEffect(() => {
    if (products.length === 0) setIndex(0);
    else setIndex((current) => current % products.length);
  }, [products.length]);

  if (products.length === 0) return null;

  const visibleCount = Math.min(cardsPerView, products.length);
  const visible = Array.from(
    { length: visibleCount },
    (_, offset) => products[(index + offset) % products.length],
  );

  return (
    <section className="relative overflow-hidden border-y border-border/60 bg-[radial-gradient(circle_at_15%_10%,hsl(var(--gold)/0.12),transparent_30%),linear-gradient(145deg,hsl(var(--background)),hsl(var(--card)/0.78),hsl(var(--background)))] py-20 md:py-28">
      <div className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:linear-gradient(hsl(var(--foreground))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--foreground))_1px,transparent_1px)] [background-size:48px_48px]" />
      <div className="container-luxe relative">
        <div className="mb-10 flex flex-col gap-6 md:mb-14 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="eyebrow mb-4">Live Product Portfolio</p>
            <h2 className="font-display text-3xl leading-[1.04] md:text-5xl lg:text-6xl">
              More products. <span className="text-gold italic">One premium manufacturing partner.</span>
            </h2>
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-foreground/70 md:text-base">
              Browse a rotating selection across Bavarian wear, leather apparel, sportswear, streetwear, activewear and leisure programs. Every card opens the buyer-ready product page.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Previous products"
              className="flex h-11 w-11 items-center justify-center border border-border/70 bg-background/65 backdrop-blur transition-colors hover:border-gold hover:text-gold"
            >
              <ChevronLeft size={17} />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Next products"
              className="flex h-11 w-11 items-center justify-center border border-border/70 bg-background/65 backdrop-blur transition-colors hover:border-gold hover:text-gold"
            >
              <ChevronRight size={17} />
            </button>
            <Link
              to="/products/all"
              className="inline-flex min-h-11 items-center gap-2 border border-gold/50 px-5 text-[10px] uppercase tracking-[0.24em] text-gold transition-colors hover:bg-gold hover:text-primary-foreground"
            >
              View all products <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>

        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
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
            if (Math.abs(delta) > 42) go(index + (delta < 0 ? 1 : -1));
            touchStartX.current = null;
          }}
        >
          {visible.map((product, cardIndex) => (
            <Link
              key={`${product.id}-${cardIndex}`}
              to={`/products/${product.categorySlug}/${product.slug}`}
              className="group relative overflow-hidden border border-border/55 bg-card/45 transition-all duration-500 hover:-translate-y-1 hover:border-gold/75 hover:shadow-[0_28px_70px_rgba(0,0,0,0.28)]"
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-[#f4f0e7]">
                <img
                  src={product.image}
                  alt={`${product.name} by Irha Apparels`}
                  loading={cardIndex === 0 ? "eager" : "lazy"}
                  decoding="async"
                  width={900}
                  height={1125}
                  className="h-full w-full object-contain p-4 transition-transform duration-[1100ms] ease-out group-hover:scale-[1.045] md:p-6"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                <span className="absolute left-3 top-3 border border-black/10 bg-black/80 px-3 py-2 text-[8px] uppercase tracking-[0.22em] text-gold backdrop-blur-sm">
                  {product.categoryName}
                </span>
              </div>
              <div className="border-t border-border/45 p-5">
                <p className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
                  {product.subcategoryName}
                </p>
                <h3 className="mt-2 min-h-[3rem] font-display text-xl leading-tight text-foreground transition-colors group-hover:text-gold">
                  {product.name}
                </h3>
                <span className="mt-5 inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.23em] text-gold">
                  Product details <ArrowUpRight size={12} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-7 flex items-center justify-between gap-5">
          <p className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
            Auto-rotating · swipe enabled · {products.length} selected products
          </p>
          <div className="h-px flex-1 bg-border/50">
            <div
              className="h-px bg-gold transition-[width] duration-700"
              style={{ width: `${((index + 1) / products.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
