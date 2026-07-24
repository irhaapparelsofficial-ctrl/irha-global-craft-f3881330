// SEO structured-data helpers.
// Organization identity is generated only from publicIdentity.mjs.
// Never invent Offer, price, availability, ratings, reviews, MOQ, lead-time,
// certifications, legal registration, proprietor, capacity, or export claims.

import {
  buildBreadcrumbs,
  buildCanonicalUrl,
  type ProductSlot,
} from "./catalogTaxonomyManifest";
import {
  PUBLIC_IDENTITY,
  buildCanonicalOrganizationSchema,
} from "./publicIdentity.mjs";

export const APEX_ORIGIN = PUBLIC_IDENTITY.url.replace(/\/$/, "");
export const ORGANIZATION_NAME = PUBLIC_IDENTITY.name;

export type BreadcrumbCrumb = { name: string; url: string };

export function buildBreadcrumbListSchema(
  fullSlugPath: string,
  labels: Record<string, string> = {},
): object {
  const crumbs = buildBreadcrumbs(fullSlugPath);
  const items = [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: `${APEX_ORIGIN}/`,
    },
    ...crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 2,
      name: labels[c.slug] ?? humanizeSlug(c.slug),
      item: `${APEX_ORIGIN}${c.path}`,
    })),
  ];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
}

export function buildOrganizationSchema(): object {
  return buildCanonicalOrganizationSchema();
}

export type ProductSchemaInput = {
  slot: ProductSlot;
  familyFullSlugPath: string;
  approvedImageUrl?: string;
  factualDescription?: string;
};

export function buildProductSchemaOrNull(
  input: ProductSchemaInput,
): object | null {
  const { slot, familyFullSlugPath, approvedImageUrl, factualDescription } = input;
  if (slot.draftStatus !== "approved") return null;
  if (slot.publicationStatus !== "published") return null;
  if (slot.mediaStatus !== "approved") return null;
  if (!approvedImageUrl) return null;

  const canonical = buildCanonicalUrl(
    `${familyFullSlugPath}/${slot.slug}`,
  );
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: slot.workingTitle,
    url: canonical,
    image: approvedImageUrl,
    sku: slot.referenceCode,
    ...(factualDescription ? { description: factualDescription } : {}),
    brand: {
      "@type": "Brand",
      name: ORGANIZATION_NAME,
    },
    manufacturer: { "@id": PUBLIC_IDENTITY.organizationId },
  };
}

export function buildCollectionPageSchema(params: {
  name: string;
  fullSlugPath: string;
  description?: string;
}): object {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: params.name,
    url: buildCanonicalUrl(params.fullSlugPath),
    ...(params.description ? { description: params.description } : {}),
  };
}

export function humanizeSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
