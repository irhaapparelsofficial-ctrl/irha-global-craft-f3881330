import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import ResilientImage from "@/components/ResilientImage";
import { usePublicCatalogTree } from "@/hooks/usePublicCatalog";
import { resolveAsset } from "@/lib/assetResolver";
import { featuredProductRank } from "@/lib/homeFeaturedProducts";
import { thumbnailUrl } from "@/lib/imageThumbnails";
import bavarianImage from "@/assets/og/og-bavarian-hero.jpg";
import leatherImage from "@/assets/og/og-leather.jpg";
import sportswearImage from "@/assets/og/og-sportswear.jpg";
import streetwearImage from "@/assets/og/og-streetwear.jpg";
import nightwearImage from "@/assets/og/og-nightwear.jpg";

const ORDER = [
  "bavarian-trachten-wear",
  "sportswear",
  "premium-leather-apparel",
  "streetwear-activewear",
  "leisure-nightwear",
] as const;

const FALLBACKS: Record<string, string> = {
  "bavarian-trachten-wear": bavarianImage,
  "premium-leather-apparel": leatherImage,
  sportswear: sportswearImage,
  "streetwear-activewear": streetwearImage,
  "leisure-nightwear": nightwearImage,
};

const LAYOUTS = [
  "lg:col-span-7",
  "lg:col-span-5",
  "lg:col-span-4",
  "lg:col-span-4",
  "lg:col-span-4",
] as const;

export default function HomeCategoryUniverse() {
  const { data: tree = [] } = usePublicCatalogTree();
  const categories = ORDER.map((slug) =>
    tree.find((category) => category.slug === slug && category.is_published),
  ).filter((category): category is NonNullable<typeof category> => Boolean(category));

  if (categories.length === 0) return null;

  return (
    <section className="relative overflow-hidden bg-background py-16 text-foreground md:py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,hsl(var(--primary)/0.08),transparent_28%)]" />
      <div className="container-luxe relative">
        <div className="mb-8 grid gap-5 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-primary">Manufacturing range</p>
            <h2 className="mt-3 max-w-3xl font-display text-3xl leading-[1.08] sm:text-4xl lg:text-5xl">
              Start with the product family that matches your program.
            </h2>
          </div>
          <div className="lg:col-span-4">
            <p className="text-sm leading-7 text-foreground/65">
              Each collection opens into buyer groups, product types and individual styles with quotation-led product pages.
            </p>
            <Link
              to="/products"
              className="mt-4 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary hover:text-foreground"
            >
              Browse all collections <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12">
          {categories.map((category, index) => {
            const products = [
              ...category.directProducts,
              ...category.subs.flatMap((subCategory) => subCategory.products),
            ].filter(
              (product) => product.is_published && Boolean(product.image_url || product.gallery?.[0]),
            );
            const featured =
              products.find((product) => featuredProductRank(category.slug, product.slug) === 0) ??
              products.find((product) => product.is_featured) ??
              products[0];
            const fallbackImage = FALLBACKS[category.slug] ?? bavarianImage;
            const originalImage = featured
              ? resolveAsset(featured.image_url || featured.gallery?.[0] || fallbackImage)
              : fallbackImage;
            const previewImage = thumbnailUrl(originalImage);
            const usesProductMedia = Boolean(featured);
            const childNames = category.subs.slice(0, 3).map((subCategory) => subCategory.name);
            const featuredRow = index < 2;

            return (
              <Link
                key={category.slug}
                to={`/products/${category.slug}`}
                className={`group overflow-hidden border border-border/70 bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/70 hover:shadow-elegant ${LAYOUTS[index] ?? "lg:col-span-4"}`}
              >
                <div className={`relative overflow-hidden ${featuredRow ? "aspect-[16/9]" : "aspect-[4/3]"} ${usesProductMedia ? "bg-[#eee8dc]" : "bg-black"}`}>
                  <ResilientImage
                    sources={[previewImage, originalImage, fallbackImage]}
                    alt={featured ? `${featured.name} — ${category.name}` : category.name}
                    loading={index === 0 ? "eager" : "lazy"}
                    decoding="async"
                    width={1200}
                    height={800}
                    className={`h-full w-full transition-transform duration-700 group-hover:scale-[1.035] ${
                      usesProductMedia ? "object-contain p-5 md:p-7" : "object-cover"
                    }`}
                  />
                  <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/65 to-transparent" />
                  <span className="absolute bottom-3 left-4 text-[8px] font-semibold uppercase tracking-[0.2em] text-white/75">
                    {products.length} published products
                  </span>
                </div>

                <div className="p-5 md:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className={`font-display leading-tight text-foreground transition-colors group-hover:text-primary ${featuredRow ? "text-2xl md:text-3xl" : "text-xl md:text-2xl"}`}>
                      {category.name}
                    </h3>
                    <ArrowRight size={16} className="mt-1 shrink-0 text-primary transition-transform group-hover:translate-x-1" />
                  </div>

                  {childNames.length > 0 && (
                    <p className="mt-3 text-xs leading-6 text-foreground/58">{childNames.join(" · ")}</p>
                  )}

                  <span className="mt-4 inline-flex text-[9px] font-semibold uppercase tracking-[0.2em] text-primary">
                    Explore collection
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
