import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { usePublicCategories } from "@/hooks/usePublicCategoryData";
import { shouldNoIndexTaxonomyPath } from "@/lib/taxonomyIndexing";

export default function TaxonomyIndexingGuard() {
  const { pathname } = useLocation();
  const { categories, isLoading } = usePublicCategories();

  if (isLoading || !shouldNoIndexTaxonomyPath(pathname, categories)) return null;

  return (
    <Helmet>
      <meta name="robots" content="noindex,follow,max-image-preview:large" />
    </Helmet>
  );
}
