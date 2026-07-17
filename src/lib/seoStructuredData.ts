// SEO structured-data helpers — PR #3.
//
// Emits valid schema.org JSON-LD aligned with current Google Search guidance
// (https://developers.google.com/search/docs/appearance/structured-data).
//
// NON-FABRICATION RULES (project business controls):
//   - Never invent Offer, price, availability, itemCondition, GTIN, MPN,
//     brand, rating, review, MOQ, lead-time, certifications, or shipping.
//   - Product schema is only emitted when the caller confirms the product
//     is owner-approved AND has an owner-approved image. Otherwise return
//     null so the page ships without Product JSON-LD.
//   - Organization / WebSite schema stay factual: legal name, canonical
//     URL, logo. No metrics, no awards.

import {
  buildBreadcrumbs,
  buildCanonicalUrl,
  type ProductSlot,
} from "./catalogTaxonomyManifest";

export const APEX_ORIGIN = "https://irhaapparels.com";
export const ORGANIZATION_LEGAL_NAME = "Irha Apparels";

export type BreadcrumbCrumb = { name: string; url: string };

/**
 * Build a BreadcrumbList structured-data object.
 * Position is 1-indexed per schema.org spec.
 */
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

/**
 * Build an Organization schema for use in the sitewide head. Callers may
 * merge extra factual fields (address, telephone) but must not invent them.
 */
export function buildOrganizationSchema(extras: Record<string, unknown> = {}): object {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: ORGANIZATION_LEGAL_NAME,
    url: `${APEX_ORIGIN}/`,
    logo: `${APEX_ORIGIN}/logo-irha.svg`,
    ...extras,
  };
}

export type ProductSchemaInput = {
  slot: ProductSlot;
  familyFullSlugPath: string;
  approvedImageUrl?: string;
  factualDescription?: string;
};

/**
 * Emit Product JSON-LD ONLY for owner-approved, media-approved, publishable
 * slots. Returns `null` otherwise so the page ships without Product schema.
 *
 * Deliberately omits: offers, price, priceCurrency, availability, review,
 * aggregateRating, sku (except reference code), gtin*, mpn. Adding any of
 * those requires owner-signed data — this helper will not fabricate them.
 */
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
      name: ORGANIZATION_LEGAL_NAME,
    },
  };
}

/**
 * Emit CollectionPage schema for approved family/audience/main pages.
 * No fabricated counts, ratings, or availability.
 */
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

/** Humanise "mens-short-lederhosen" -> "Mens Short Lederhosen". */
export function humanizeSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
