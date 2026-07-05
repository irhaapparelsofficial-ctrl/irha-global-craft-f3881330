// Maps pre-Phase-3 category slugs to the canonical 5 top-level slugs so old
// public URLs and inbound links continue to resolve.
//
// Also maps former subcategory-level slugs that were briefly promoted, so
// deep-links land on the correct parent with the sub pre-selected via ?subcategory=.

export const LEGACY_TOP_SLUG_MAP: Record<string, string> = {
  bavarian: "bavarian-trachten-wear",
  leatherwear: "premium-leather-apparel",
  streetwear: "streetwear-activewear",
  leisurewear: "leisure-nightwear",
  nightwear: "leisure-nightwear",
};

export type LegacyRedirect = { top: string; sub?: string };

export function resolveLegacyCategorySlug(slug: string): LegacyRedirect | null {
  const top = LEGACY_TOP_SLUG_MAP[slug];
  if (!top) return null;
  return { top, sub: slug === "nightwear" ? "leisure-nightwear-men" : undefined };
}
