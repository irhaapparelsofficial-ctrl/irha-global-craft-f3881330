export type RelatedProductRoute = {
  product_id: string;
  canonical_path: string;
  main_category_slug: string;
  audience_slug: string;
  product_type_slug: string;
};

function sameType(left: RelatedProductRoute, right: RelatedProductRoute) {
  return left.main_category_slug === right.main_category_slug
    && left.audience_slug === right.audience_slug
    && left.product_type_slug === right.product_type_slug;
}

function sameAudience(left: RelatedProductRoute, right: RelatedProductRoute) {
  return left.main_category_slug === right.main_category_slug
    && left.audience_slug === right.audience_slug;
}

export function relatedCandidates<T extends RelatedProductRoute>(products: T[], product: T): T[] {
  const candidates = products.filter((item) => item.product_id !== product.product_id);
  const tiers = [
    candidates.filter((item) => sameType(item, product)),
    candidates.filter((item) => sameAudience(item, product)),
    candidates.filter((item) => item.main_category_slug === product.main_category_slug),
  ];
  const selected = new Map<string, T>();
  for (const tier of tiers) {
    for (const item of tier) {
      selected.set(item.product_id, item);
      if (selected.size === 4) return [...selected.values()];
    }
  }
  return [...selected.values()];
}
