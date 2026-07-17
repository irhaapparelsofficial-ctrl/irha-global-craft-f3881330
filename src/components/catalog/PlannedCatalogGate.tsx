import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { resolveManifestPath, shouldNoIndex } from "@/lib/plannedCatalogRouting";
import NotFound from "@/pages/NotFound";

/**
 * PR #3 public-catalog gate. Wrap draft-sensitive route trees so a URL that
 * resolves to a `planned-family` or `planned-slot` in the manifest never
 * leaks to search engines: we serve the 404 shell and emit
 * `<meta name="robots" content="noindex, nofollow" />`.
 *
 * Paths outside the manifest fall through to `children` — existing catalog
 * pages continue to render unchanged.
 */
export function PlannedCatalogGate({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const resolution = resolveManifestPath(pathname);

  if (shouldNoIndex(resolution)) {
    return (
      <>
        <Helmet>
          <meta name="robots" content="noindex, nofollow" />
          <meta name="googlebot" content="noindex, nofollow" />
        </Helmet>
        <NotFound />
      </>
    );
  }

  return <>{children}</>;
}

export default PlannedCatalogGate;
