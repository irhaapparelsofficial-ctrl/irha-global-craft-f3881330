import CanonicalProductDetail from "@/pages/CanonicalProductDetail";
import CategoryTaxonomyPage from "@/pages/CategoryTaxonomyPage";
import { Navigate, useParams } from "react-router-dom";
import { useNormalizedCategory } from "@/hooks/usePublicCategoryData";
import { usePublishedCatalogTaxonomyRelease } from "@/hooks/usePublishedCatalogTaxonomy";
import { buildCategoryTaxonomy } from "@/lib/globalCategoryTaxonomy";

export default function CategoryOrProductPage() {
  const { categorySlug = "", productSlug = "" } = useParams<{
    categorySlug: string;
    productSlug: string;
  }>();
  const { category, isLoading } = useNormalizedCategory(categorySlug);
  const published = usePublishedCatalogTaxonomyRelease();

  if ((isLoading && !category) || (published.isLoading && !published.data)) {
    return <div className="pt-40 pb-24 container-luxe text-sm text-foreground/60">Loading…</div>;
  }

  const root = published.data?.nodes.find(
    (node) => node.depth === 0 && node.full_slug_path === categorySlug,
  );
  const explicitAudience = root
    ? published.data?.nodes.find(
        (node) => node.depth === 1 && node.parent_id === root.id && node.slug === productSlug,
      )
    : undefined;

  if (explicitAudience) {
    return <CategoryTaxonomyPage audienceOverride={explicitAudience.slug} />;
  }

  if (category) {
    const legacyAudience = buildCategoryTaxonomy(category).audiences.find(
      (candidate) => candidate.slug === productSlug,
    );
    if (legacyAudience?.productCount === 0 || (legacyAudience && legacyAudience.collections.length === 0)) {
      return <Navigate to={`/products/${categorySlug}`} replace />;
    }
    if (legacyAudience) return <CategoryTaxonomyPage audienceOverride={legacyAudience.slug} />;
  }

  return <CanonicalProductDetail />;
}
