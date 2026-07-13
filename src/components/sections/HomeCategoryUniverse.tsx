import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { usePublicCatalogTree } from "@/hooks/usePublicCatalog";
import { resolveAsset } from "@/lib/assetResolver";
import bavarianImage from "@/assets/og/og-bavarian-hero.jpg";
import leatherImage from "@/assets/og/og-leather.jpg";
import sportswearImage from "@/assets/og/og-sportswear.jpg";
import streetwearImage from "@/assets/og/og-streetwear.jpg";
import nightwearImage from "@/assets/og/og-nightwear.jpg";

const ORDER = [
  "bavarian-trachten-wear",
  "premium-leather-apparel",
  "sportswear",
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

export default function HomeCategoryUniverse() {
  const { data: tree = [] } = usePublicCatalogTree();
  const categories = ORDER.map((slug) =>
    tree.find((category) => category.slug === slug && category.is_published),
  ).filter((category): category is NonNullable<typeof category> => Boolean(category));

  if (categories.length === 0) return null;

  return (
    <section className="relative overflow-hidden bg-background py-20 text-foreground md:py-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,hsl(var(--primary)/0.08),transparent_28%)]" />
      <div className="container-luxe relative">
        <div className="mb-10 grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-primary">Product categories</p>
            <h2 className="mt-4 max-w-4xl font-display text-4xl leading-[1.04] md:text-5xl lg:text-6xl">
              Manufacturing programs organised for faster buyer decisions.
            </h2>
          </div>
          <div className="lg:col-span-4">
            <p className="text-sm leading-7 text-foreground/65">
              Browse the main category first, then move into buyer groups, product types and individual styles.
            </p>
            <Link
              to="/products"
              className="mt-5 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary hover:text-foreground"
            >
              View all categories <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category, index) => {
            const products = [
              ...category.directProducts,
              ...category.subs.flatMap((subCategory) => subCategory.products),
            ].filter(
              (product) => product.is_published && Boolean(product.image_url || product.gallery?.[0]),
            );
            const featured = products[0];
            const image = featured
              ? resolveAsset(featured.image_url || featured.gallery?.[0] || FALLBACKS[category.slug])
              : FALLBACKS[category.slug];
            const usesProductMedia = Boolean(featured);
            const childNames = category.subs.slice(0, 3).map((subCategory) => subCategory.name);

            return (
              <Link
                key={category.slug}
                to={`/products/${category.slug}`}
                className={`group overflow-hidden border border-border/70 bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/70 hover:shadow-elegant ${
                  index < 2 ? "lg:col-span-1" : ""
                }`}
              >
                <div className={`relative aspect-[4/3] overflow-hidden ${usesProductMedia ? "bg-[#eee8dc]" : "bg-black"}`}>
                  <img
                    src={image}
                    alt={featured ? `${featured.name} — ${category.name}` : category.name}
                    loading={index === 0 ? "eager" : "lazy"}
                    decoding="async"
                    width={900}
                    height={675}
                    className={`h-full w-full transition-transform duration-700 group-hover:scale-[1.035] ${
                      usesProductMedia ? "object-contain p-6" : "object-cover"
                    }`}
                  />
                  <span className="absolute left-4 top-4 bg-black/85 px-3 py-2 text-[8px] font-semibold uppercase tracking-[0.2em] text-primary backdrop-blur-sm">
                    Category {String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-display text-2xl leading-tight text-foreground transition-colors group-hover:text-primary">{category.name}</h3>
                    <span className="min-w-max text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      {products.length} styles
                    </span>
                  </div>

                  {childNames.length > 0 && (
                    <p className="mt-4 text-xs leading-6 text-foreground/58">{childNames.join(" · ")}</p>
                  )}

                  <span className="mt-6 inline-flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-primary">
                    Explore category <ArrowRight size={12} className="transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            );
          })}

          <div className="flex min-h-[260px] flex-col justify-between border border-primary/35 bg-card p-7 text-foreground">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-primary">Custom development</p>
              <h3 className="mt-4 font-display text-3xl leading-tight">Do not see your exact product?</h3>
              <p className="mt-4 text-sm leading-7 text-foreground/62">
                Share a reference, tech pack or product brief. The manufacturing route can be reviewed before quotation.
              </p>
            </div>
            <Link
              to="/inquiry?intent=reference"
              className="mt-8 inline-flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-primary"
            >
              Upload reference <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
