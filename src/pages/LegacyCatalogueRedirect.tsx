import { Navigate, useParams } from "react-router-dom";

const LEGACY_CATALOGUE_DESTINATIONS: Record<string, string> = {
  "bavarian-garments": "/products/bavarian-trachten-wear",
  lederhosen: "/products/bavarian-trachten-wear/men/lederhosen",
  "dirndl-dresses": "/products/bavarian-trachten-wear/women/dirndl-dresses",
  "trachten-accessories": "/products/bavarian-trachten-wear/accessories",
  "kids-trachten": "/products/bavarian-trachten-wear/kids",
  "leather-garments": "/products/premium-leather-apparel",
  sportswear: "/products/sportswear",
  activewear: "/products/sportswear/fitness-activewear/performance-activewear",
  streetwear: "/products/streetwear-activewear",
  leisurewear: "/products/leisure-nightwear",
  nightwear: "/products/leisure-nightwear",
};

export default function LegacyCatalogueRedirect() {
  const { slug = "" } = useParams<{ slug: string }>();
  return <Navigate to={LEGACY_CATALOGUE_DESTINATIONS[slug] ?? "/products"} replace />;
}
