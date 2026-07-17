import CanonicalProductDetail from "@/pages/CanonicalProductDetail";
import CategoryTaxonomyPage from "@/pages/CategoryTaxonomyPage";
import { Navigate, useParams } from "react-router-dom";
import { useNormalizedCategory } from "@/hooks/usePublicCategoryData";
import { buildCategoryTaxonomy } from "@/lib/globalCategoryTaxonomy";

export default function CategoryOrProductPage() {
  const { categorySlug = "", productSlug = "" } = useParams<{
    categorySlug: string;
    productSlug: string;
  }>();
  const { category, isLoading } = useNormalizedCategory(categorySlug);

  if (isLoading && !category) {
    return <div className="pt-40 pb-24 container-luxe text-sm text-foreground/60">Loading…</div>;
  }

  if (category) {
    const audience = buildCategoryTaxonomy(category).audiences.find((candidate) => candidate.slug === productSlug);
    if (audience?.productCount === 0 || (audience && audience.collections.length === 0)) {
      return <Navigate to={`/products/${categorySlug}`} replace />;
    }
    if (audience) return <CategoryTaxonomyPage audienceOverride={audience.slug} />;
  }

  return <CanonicalProductDetail />;
}
