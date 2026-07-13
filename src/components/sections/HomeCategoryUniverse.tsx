import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { usePublicCatalogTree } from "@/hooks/usePublicCatalog";
import { resolveAsset } from "@/lib/assetResolver";
import { thumbnailUrl } from "@/lib/imageThumbnails";
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
    <section className="bg-[#f8f6f1] py-20 text-[#122033] md:py-24">
      <div className="container-luxe">
        <div className="mb-10 grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#a77f34]">Product categories</p>
            <h2 className="mt-4 max-w-4xl font-display text-4xl leading-[1.04] md:text-5xl lg:text-6xl">
              Manufacturing programs organised for faster buyer decisions.
            </h2>
          </div>
          <div className="lg:col-span-4">
            <p className="text-sm leading-7 text-[#617082]">
              Browse the main category first, then move into buyer groups, product types and individual styles.
            </p>
            <Link
              to="/products"
              className="mt-5 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#a77f34] hover:text-[#122033]"
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
            const image = thumbnailUrl(featured
              ? resolveAsset(featured.image_url || featured.gallery?.[0] || FALLBACKS[category.slug])
              : FALLBACKS[category.slug]);
            const usesProductMedia = Boolean(featured);
            const childNames = category.subs.slice(0, 3).map((subCategory) => subCategory.name);

            return (
              <Link
                key={category.slug}
                to={`/products/${category.slug}`}
                className={`group overflow-hidden border border-[#ddd6ca] bg-white transition-all duration-300 hover:-translate-y-1 hover:border-[#b8924b] hover:shadow-[0_18px_50px_rgba(18,32,51,.12)] ${
                  index < 2 ? "lg:col-span-1" : ""
                }`}
              >
                <div className={`relative aspect-[4/3] overflow-hidden ${usesProductMedia ? "bg-[#eee8dc]" : "bg-[#122033]"}`}>
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
                  <span className="absolute left-4 top-4 bg-[#122033] px-3 py-2 text-[8px] font-semibold uppercase tracking-[0.2em] text-[#d9b765]">
                    Category {String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-display text-2xl leading-tight text-[#122033]">{category.name}</h3>
                    <span className="min-w-max text-[9px] font-semibold uppercase tracking-[0.16em] text-[#788596]">
                      {products.length} styles
                    </span>
                  </div>

                  {childNames.length > 0 && (
                    <p className="mt-4 text-xs leading-6 text-[#617082]">{childNames.join(" · ")}</p>
                  )}

                  <span className="mt-6 inline-flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#a77f34]">
                    Explore category <ArrowRight size={12} className="transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            );
          })}

          <div className="flex min-h-[260px] flex-col justify-between border border-[#20334c] bg-[#122033] p-7 text-white sm:col-span-2 lg:col-span-1">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#d9b765]">Custom development</p>
              <h3 className="mt-4 font-display text-3xl leading-tight">Do not see your exact product?</h3>
              <p className="mt-4 text-sm leading-7 text-white/65">
                Share a reference, tech pack or product brief. The manufacturing route can be reviewed before quotation.
              </p>
            </div>
            <Link
              to="/inquiry?intent=reference"
              className="mt-8 inline-flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#d9b765]"
            >
              Upload reference <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
