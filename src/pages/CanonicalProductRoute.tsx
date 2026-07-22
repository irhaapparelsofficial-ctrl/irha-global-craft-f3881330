import { useParams } from "react-router-dom";
import { usePublicProduct } from "@/hooks/usePublicCatalog";
import CanonicalProductDetail from "@/pages/CanonicalProductDetail";
import NotFound from "@/pages/NotFound";

/**
 * Keeps a missing canonical product on the requested URL so the public UI shows
 * a noindex 404 state instead of silently redirecting the buyer to a category.
 */
export default function CanonicalProductRoute() {
  const { categorySlug = "", productSlug = "" } = useParams<{
    categorySlug: string;
    productSlug: string;
  }>();
  const { data, isLoading, isFetching, error } = usePublicProduct(categorySlug, productSlug);

  if (!data && (isLoading || isFetching)) return <CanonicalProductDetail />;
  if (error || !data) return <NotFound />;
  return <CanonicalProductDetail />;
}
