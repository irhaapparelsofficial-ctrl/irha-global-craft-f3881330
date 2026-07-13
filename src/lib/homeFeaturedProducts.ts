export const HOME_FEATURED_PRODUCT_SLUGS: Record<string, readonly string[]> = {
  "bavarian-trachten-wear": [
    "traditional-lederhosen",
    "traditional-dirndl-dress",
    "bavarian-embroidered-vest",
  ],
  sportswear: [
    "sublimated-soccer-uniform-kit",
    "basketball-uniform-kit",
    "performance-tracksuit-set",
  ],
  "premium-leather-apparel": [
    "classic-biker-leather-jacket",
    "bomber-leather-jacket",
    "premium-leather-bag",
  ],
  "streetwear-activewear": [
    "oversized-streetwear-hoodie",
    "bomber-jacket",
    "tactical-cargo-pants",
  ],
  "leisure-nightwear": [
    "pique-polo-shirt",
    "plush-bathrobe-sleep-robe",
    "silk-nightgown-slip",
  ],
};

export function featuredProductRank(categorySlug: string, productSlug: string): number {
  const rank = HOME_FEATURED_PRODUCT_SLUGS[categorySlug]?.indexOf(productSlug) ?? -1;
  return rank === -1 ? Number.MAX_SAFE_INTEGER : rank;
}
