import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import ResilientImage from "@/components/ResilientImage";
import { usePublicCatalogTree, type PublicTopCategory } from "@/hooks/usePublicCatalog";
import { resolveAsset } from "@/lib/assetResolver";
import { featuredProductRank } from "@/lib/homeFeaturedProducts";
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
  isFeatured: boolean;
  featuredRank: number;
  sortOrder: number;
};

const MAX_PRODUCTS = 6;
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
  const rank = featuredProductRank(category.slug, product.slug);

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
    isFeatured: Boolean(product.is_featured) || rank !== Number.MAX_SAFE_INTEGER,
    featuredRank: rank,
    sortOrder: product.sort_order ?? Number.MAX_SAFE_INTEGER,
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

  return [...direct, ...nested].sort((a, b) => {
    if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
    if (a.featuredRank !== b.featuredRank) return a.featuredRank - b.featuredRank;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.name.localeCompare(b.name);
  });
}

function selectedReferences(tree: PublicTopCategory[]): ShowcaseProduct[] {
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

export default function HomeProductShowcase() {
  const { data: tree = [] } = usePublicCatalogTree();
  const products = useMemo(() => selectedReferences(tree), [tree]);

  if (products.length === 0) return null;

  return (
    <section className="border-y border-border/60 bg-card/35 py-14 text-foreground md:py-20">
      <div className="container-luxe">
        <div className="mb-7 grid gap-5 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-primary">Selected product references</p>
            <h2 className="mt-3 max-w-3xl font-display text-3xl leading-[1.06] sm:text-4xl lg:text-5xl">
              Review styles, then send the specification you need manufactured.
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-foreground/65 md:text-base">
              These published references show the product range. Final material, construction, measurements, branding and commercial terms are developed against the buyer’s own requirement.
            </p>
          </div>
          <div className="lg:col-span-4 lg:text-right">
            <Link
              to="/products/all"
              className="inline-flex min-h-11 items-center gap-2 bg-gradient-gold px-5 text-[9px] font-semibold uppercase tracking-[0.2em] text-primary-foreground transition-all hover:shadow-gold"
            >
              View all products <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {products.map((product) => (
            <Link
              key={product.id}
              to={`/products/${product.categorySlug}/${product.slug}`}
              className="group grid min-h-[170px] grid-cols-[40%_60%] overflow-hidden rounded-lg border border-border/70 bg-background transition-all duration-300 hover:-translate-y-1 hover:border-primary/70 hover:shadow-elegant sm:block sm:min-h-0 sm:rounded-none"
            >
              <div className="relative h-full min-h-[170px] overflow-hidden bg-[#eee8dc] sm:aspect-[4/5] sm:min-h-0">
                <ResilientImage
                  sources={[product.image, product.originalImage, product.fallbackImage]}
                  alt={`${product.name} by Irha Apparels`}
                  loading="lazy"
                  decoding="async"
                  width={900}
                  height={1125}
                  className="h-full w-full object-contain p-2 transition-transform duration-700 group-hover:scale-[1.035] sm:p-6 md:p-8"
                />
                <span className="absolute left-2 top-2 max-w-[calc(100%-1rem)] bg-black/85 px-2 py-1.5 text-[7px] font-semibold uppercase tracking-[0.14em] text-primary backdrop-blur-sm sm:left-3 sm:top-3 sm:px-3 sm:py-2 sm:text-[8px] sm:tracking-[0.18em]">
                  {product.categoryName}
                </span>
              </div>
              <div className="flex min-w-0 flex-col justify-center p-4 sm:block sm:p-5 md:p-6">
                <p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:text-[9px] sm:tracking-[0.18em]">
                  {product.subcategoryName}
                </p>
                <h3 className="mt-2 line-clamp-3 font-display text-xl leading-tight text-foreground transition-colors group-hover:text-primary sm:min-h-[3.25rem] sm:text-2xl">
                  {product.name}
                </h3>
                <span className="mt-4 inline-flex items-center gap-2 text-[8px] font-semibold uppercase tracking-[0.18em] text-primary sm:mt-5 sm:text-[9px] sm:tracking-[0.2em]">
                  Review product <ArrowRight size={12} className="transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
