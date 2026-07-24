import {
  PUBLIC_IDENTITY,
  buildCanonicalOrganizationSchema,
  buildCanonicalWebsiteSchema,
} from "@/lib/publicIdentity.mjs";

export const SITE_URL = PUBLIC_IDENTITY.url.replace(/\/$/, "");
export const ORGANIZATION_ID = PUBLIC_IDENTITY.organizationId;
export const WEBSITE_ID = PUBLIC_IDENTITY.websiteId;
export const organizationSchema = buildCanonicalOrganizationSchema();
export const websiteSchema = buildCanonicalWebsiteSchema();

type BreadcrumbItem = {
  name: string;
  path: string;
};

function absoluteUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function breadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
