import { BRAND } from "@/lib/constants";

export const SITE_URL = "https://irhaapparels.com";
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": ORGANIZATION_ID,
  name: BRAND.name,
  url: `${SITE_URL}/`,
  logo: {
    "@type": "ImageObject",
    url: `${SITE_URL}/icon-512x512.png`,
  },
  image: `${SITE_URL}/og-image.jpg`,
  description:
    "Experienced B2B custom apparel manufacturer in Sialkot, Pakistan, serving brands, wholesalers and importers with OEM, ODM and private-label programs.",
  email: BRAND.email,
  telephone: BRAND.phone,
  address: {
    "@type": "PostalAddress",
    addressLocality: "Sialkot",
    addressRegion: "Punjab",
    addressCountry: "PK",
  },
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "sales",
    telephone: BRAND.phone,
    email: BRAND.email,
    availableLanguage: ["English"],
  },
  sameAs: [
    "https://www.instagram.com/irhaapparels",
    "https://web.facebook.com/profile.php?id=61590950402472",
    "https://www.linkedin.com/company/irha-apparels",
    "https://www.tiktok.com/@irhaapparels",
  ],
};

export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": WEBSITE_ID,
  url: `${SITE_URL}/`,
  name: BRAND.name,
  publisher: { "@id": ORGANIZATION_ID },
  inLanguage: "en",
};

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
