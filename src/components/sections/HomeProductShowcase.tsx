import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
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

const AUTOPLAY_MS = 5000;
const MAX_PRODUCTS = 16;

function productsForCategory(category: PublicTopCategory): ShowcaseProduct[] {
  const nested = category.subs.flatMap((subCategory) =>
    subCategory.products
      .filter((product) => product.is_published && Boolean(product.image_url || product.gallery?.[0]))
      .map((product) => ({
        id: product.id,
        slug: product.slug,
        name: product.name,
        image: resolveAsset(product.image_url || product.gallery?.[0] || "/placeholder.svg"),
        categoryName: category.name,
        categorySlug: category.slug,
        subcategoryName: subCategory.name,
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
  const buckets = tree
    .filter((category) => category.is_published)
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
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
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
    <section className="border-y border-border/60 bg-card/35 py-20 text-foreground md:py-24">
      <div className="container-luxe">
        <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-primary">Selected products</p>
            <h2 className="mt-4 font-display text-4xl leading-[1.04] md:text-5xl lg:text-6xl">
              A practical view of our manufacturing range.
            </h2>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-foreground/65 md:text-base">
              Browse representative products across Bavarian wear, leather apparel, sportswear, streetwear and leisure programs. Each product opens a buyer-ready detail page.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Previous products"
              className="inline-flex h-11 w-11 items-center justify-center border border-border/70 bg-background text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <ChevronLeft size={17} />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
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
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
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
              className="group overflow-hidden border border-border/70 bg-background transition-all duration-300 hover:-translate-y-1 hover:border-primary/70 hover:shadow-elegant"
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-[#eee8dc]">
                <img
                  src={product.image}
                  alt={`${product.name} by Irha Apparels`}
                  loading={cardIndex === 0 ? "eager" : "lazy"}
                  decoding="async"
                  width={900}
                  height={1125}
                  className="h-full w-full object-contain p-5 transition-transform duration-700 group-hover:scale-[1.035] md:p-7"
                />
                <span className="absolute left-3 top-3 bg-black/85 px-3 py-2 text-[8px] font-semibold uppercase tracking-[0.18em] text-primary backdrop-blur-sm">
                  {product.categoryName}
                </span>
              </div>
              <div className="p-5">
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {product.subcategoryName}
                </p>
                <h3 className="mt-2 min-h-[3.25rem] font-display text-xl leading-tight text-foreground transition-colors group-hover:text-primary">
                  {product.name}
                </h3>
                <span className="mt-5 inline-flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-primary">
                  View product <ArrowRight size={12} className="transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-7 flex items-center gap-3">
          <div className="h-1 flex-1 overflow-hidden bg-foreground/12">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${((index + 1) / products.length) * 100}%` }}
            />
          </div>
          <span className="min-w-max text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {String(index + 1).padStart(2, "0")} / {String(products.length).padStart(2, "0")}
          </span>
        </div>
      </div>
    </section>
  );
}
