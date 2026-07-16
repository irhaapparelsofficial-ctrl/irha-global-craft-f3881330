import { Fragment, type ReactNode, useMemo } from "react";
import { usePublicTaxonomy } from "@/hooks/usePublicTaxonomy";
import { setDatabaseTaxonomyReleases } from "@/lib/databaseTaxonomyRegistry";

type Props = { children: ReactNode };

export default function TaxonomyReleaseBridge({ children }: Props) {
  const { data } = usePublicTaxonomy();
  const signature = useMemo(
    () => data.map((category) => `${category.categorySlug}:${category.audiences.length}`).join("|") || "rule-fallback",
    [data],
  );

  setDatabaseTaxonomyReleases(data);

  return <Fragment key={signature}>{children}</Fragment>;
}
