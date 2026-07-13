import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
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

const CARD_LAYOUTS = [
  "md:col-span-7 md:row-span-2",
  "md:col-span-5 md:row-span-1",
  "md:col-span-5 md:row-span-1",
  "md:col-span-6 md:row-span-1",
  "md:col-span-6 md:row-span-1",
];

export default function HomeCategoryUniverse() {
  const { data: tree = [] } = usePublicCatalogTree();
  const categories = ORDER.map((slug) => tree.find((category) => category.slug === slug && category.is_published)).filter(
    (category): category is NonNullable<typeof category> => Boolean(category),
  );

  if (categories.length === 0) return null;

  return (
    <section className="relative overflow-hidden py-20 md:py-28 lg:py-32">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_10%,hsl(var(--gold)/0.08),transparent_30%)]" />
      <div className="container-luxe relative">
        <div className="mb-12 grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(320px,0.45fr)] lg:items-end">
          <div>
            <p className="eyebrow mb-4">Manufacturing Universe</p>
            <h2 className="max-w-4xl font-display text-4xl leading-[0.98] tracking-[-0.025em] md:text-6xl lg:text-7xl">
              Five product worlds. <span className="block italic text-gold">One manufacturing relationship.</span>
            </h2>
          </div>
          <div className="border-l border-gold/35 pl-6 lg:pb-2">
            <p className="text-sm leading-7 text-foreground/68 md:text-base">
              Explore live product media across heritage wear, leather apparel, sportswear, streetwear and leisure programs. Every category routes buyers into its full product architecture.
            </p>
            <Link
              to="/products"
              className="mt-5 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-gold transition-colors hover:text-foreground"
            >
              Browse all collections <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>

        <div className="grid auto-rows-[260px] gap-4 md:grid-cols-12 md:auto-rows-[245px] lg:auto-rows-[270px]">
          {categories.map((category, index) => {
            const products = [...category.directProducts, ...category.subs.flatMap((sub) => sub.products)].filter(
              (product) => product.is_published && Boolean(product.image_url || product.gallery?.[0]),
            );
            const primary = products[0];
            const secondary = products.find((product) => product.slug !== primary?.slug);
            const primaryImage = thumbnailUrl(primary
              ? resolveAsset(primary.image_url || primary.gallery?.[0] || FALLBACKS[category.slug])
              : FALLBACKS[category.slug]);
            const secondaryImage = secondary
              ? thumbnailUrl(resolveAsset(secondary.image_url || secondary.gallery?.[0] || FALLBACKS[category.slug]))
              : null;
            const usesProductMedia = Boolean(primary);

            return (
              <Link
                key={category.slug}
                to={`/products/${category.slug}`}
                className={`group relative overflow-hidden border border-border/55 bg-black transition-all duration-500 hover:-translate-y-1 hover:border-gold/70 hover:shadow-[0_30px_80px_rgba(0,0,0,.28)] ${CARD_LAYOUTS[index] ?? "md:col-span-6"}`}
              >
                <img
                  src={primaryImage}
                  alt={primary ? `${primary.name} — ${category.name}` : category.name}
                  loading={index === 0 ? "eager" : "lazy"}
                  decoding="async"
                  width={1400}
                  height={1000}
                  className={`absolute inset-0 h-full w-full transition-transform duration-[1500ms] ease-out group-hover:scale-[1.045] ${
                    usesProductMedia ? "object-contain bg-[#f2ede3] p-5 md:p-8" : "object-cover"
                  }`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/38 to-black/5" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-transparent to-transparent" />

                {secondaryImage && (
                  <div className="absolute right-4 top-4 hidden w-24 border border-white/20 bg-black/70 p-1.5 shadow-2xl backdrop-blur sm:block md:w-28 lg:w-32">
                    <div className="aspect-[4/5] overflow-hidden bg-[#f2ede3]">
                      <img
                        src={secondaryImage}
                        alt={secondary ? `${secondary.name} product preview` : "Product preview"}
                        loading="lazy"
                        decoding="async"
                        width={360}
                        height={450}
                        className="h-full w-full object-contain p-2"
                      />
                    </div>
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 p-5 md:p-7 lg:p-8">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="h-px w-9 bg-gold" />
                    <p className="text-[8px] uppercase tracking-[0.24em] text-gold md:text-[9px]">
                      Category {String(index + 1).padStart(2, "0")}
                    </p>
                  </div>
                  <h3 className={`max-w-xl font-display leading-none text-white ${index === 0 ? "text-3xl md:text-5xl" : "text-2xl md:text-3xl"}`}>
                    {category.name}
                  </h3>
                  <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
                    <p className="text-[9px] uppercase tracking-[0.2em] text-white/58">
                      {products.length > 0 ? `${products.length} live products` : "Buyer-ready collection"}
                    </p>
                    {primary && (
                      <p className="max-w-[230px] truncate text-[9px] uppercase tracking-[0.16em] text-white/72">
                        Featured: {primary.name}
                      </p>
                    )}
                  </div>
                  <span className="mt-5 inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.24em] text-gold">
                    Enter collection <ArrowUpRight size={12} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
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
