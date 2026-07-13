import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
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
];

const CATEGORY_IMAGES: Record<string, string> = {
  "bavarian-trachten-wear": bavarianImage,
  "premium-leather-apparel": leatherImage,
  sportswear: sportswearImage,
  "streetwear-activewear": streetwearImage,
  "leisure-nightwear": nightwearImage,
};

export default function FiveCategories() {
  const { data: tree = [] } = usePublicCatalogTree();
  const cats = ORDER.map((slug) => tree.find((t) => t.slug === slug)).filter(
    (c): c is NonNullable<typeof c> => !!c,
  );

  if (cats.length === 0) return null;

  return (
    <section className="py-20 md:py-28">
      <div className="container-luxe">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div className="max-w-2xl">
            <p className="eyebrow mb-4">Product Categories</p>
            <h2 className="font-display text-3xl md:text-5xl leading-[1.05]">
              Five categories, <span className="text-gold italic">one atelier</span>.
            </h2>
            <p className="mt-5 text-sm md:text-base leading-relaxed text-foreground/70">
              Each category now opens with real product media from the live buyer catalogue.
            </p>
          </div>
          <Link
            to="/products"
            className="text-[11px] uppercase tracking-[0.28em] text-foreground/70 hover:text-gold transition-colors inline-flex items-center gap-2"
          >
            View all collections <ArrowUpRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
          {cats.map((c) => {
            const products = [...c.directProducts, ...c.subs.flatMap((sub) => sub.products)];
            const productCount = products.length;
            const featuredProduct = products.find(
              (product) => product.is_published && Boolean(product.image_url || product.gallery?.[0]),
            );
            const productImage = featuredProduct?.image_url || featuredProduct?.gallery?.[0] || null;
            const img = productImage
              ? resolveAsset(productImage)
              : CATEGORY_IMAGES[c.slug] ?? (c.image_url ? resolveAsset(c.image_url) : "/placeholder.svg");
            const usesProductMedia = Boolean(productImage);

            return (
              <Link
                key={c.slug}
                to={`/products/${c.slug}`}
                className="group relative aspect-[3/4] overflow-hidden bg-black border border-border/40 hover:border-gold/70 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(0,0,0,0.25)]"
              >
                <img
                  src={img}
                  alt={featuredProduct ? `${featuredProduct.name} — ${c.name}` : c.name}
                  loading="lazy"
                  decoding="async"
                  className={`absolute inset-0 w-full h-full transition-transform duration-[1200ms] group-hover:scale-[1.055] ${
                    usesProductMedia ? "object-contain bg-[#f4f0e7] p-3 md:p-5" : "object-cover"
                  }`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <p className="mb-2 text-[8px] uppercase tracking-[0.23em] text-gold">
                    {featuredProduct ? "Featured product" : "Manufacturing category"}
                  </p>
                  <h3 className="font-display text-white text-base md:text-lg leading-tight">
                    {c.name}
                  </h3>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-white/60">
                    {productCount > 0 ? `${productCount} products` : "View Collection"}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.28em] text-gold opacity-80 transition-opacity group-hover:opacity-100">
                    View Collection <ArrowUpRight size={12} />
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
