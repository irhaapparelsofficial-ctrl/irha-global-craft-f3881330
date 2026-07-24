import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import defaultSocialImage from "@/assets/banners/products-flatlay.jpg";
import { ORGANIZATION_ID, SITE_URL } from "@/lib/seoSchema";
import { PUBLIC_IDENTITY } from "@/lib/publicIdentity.mjs";
import { usePublicPageTools } from "@/hooks/usePublicContent";
import { shouldNoIndexCategorySearchParams } from "@/lib/categoryIndexing";

type Alternate = { locale: string; href: string };

type Props = {
  title: string;
  description: string;
  path?: string;
  canonical?: string;
  image?: string;
  jsonLd?: object | object[];
  noindex?: boolean;
  type?: "website" | "article" | "product";
  locale?: string;
  direction?: "ltr" | "rtl";
  alternates?: Alternate[];
  xDefaultPath?: string;
};

function canonicalUrl(value: string): string {
  try {
    const parsed = new URL(value, SITE_URL);
    const pathname = parsed.pathname.startsWith("/") ? parsed.pathname : `/${parsed.pathname}`;
    return `${SITE_URL}${pathname}${parsed.search}`;
  } catch {
    const pathname = value.startsWith("/") ? value : `/${value}`;
    return `${SITE_URL}${pathname}`;
  }
}

function assetUrl(value: string): string {
  return value.startsWith("http")
    ? value
    : `${SITE_URL}${value.startsWith("/") ? value : `/${value}`}`;
}

function ogLocale(locale: string) {
  return locale.replace("-", "_");
}

export function normalizeOrganizationReferences(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeOrganizationReferences);
  if (!value || typeof value !== "object") return value;

  const source = value as Record<string, unknown>;
  const type = source["@type"];
  const isIrhaOrganization =
    type === "Organization" &&
    (source["@id"] === ORGANIZATION_ID || source.name === PUBLIC_IDENTITY.name);

  if (isIrhaOrganization) return { "@id": ORGANIZATION_ID };

  return Object.fromEntries(
    Object.entries(source).map(([key, child]) => [key, normalizeOrganizationReferences(child)]),
  );
}

function safeJson(value: object) {
  return JSON.stringify(normalizeOrganizationReferences(value)).replace(/</g, "\u003c");
}

function taxonomyTranslationsReleased() {
  return import.meta.env.VITE_TAXONOMY_TRANSLATIONS_RELEASED === "true";
}

function schemaHasType(schema: object, expected: string) {
  const type = (schema as Record<string, unknown>)["@type"];
  return Array.isArray(type) ? type.includes(expected) : type === expected;
}

export default function SEO({
  title,
  description,
  path,
  canonical,
  image,
  jsonLd,
  noindex,
  type = "website",
  locale = "en-US",
  direction = "ltr",
  alternates = [],
  xDefaultPath,
}: Props) {
  const location = useLocation();
  const effectivePath = path || location.pathname || "/";
  const cmsLocale = locale === "en-US" ? "en" : locale;
  const { data: pageTools } = usePublicPageTools(effectivePath, cmsLocale);
  const override = pageTools.seo;

  const effectiveTitle = override?.seo_title || title;
  const effectiveDescription = override?.seo_description || description;
  const canonicalValue = override?.canonical_url || canonical || effectivePath;
  const url = canonicalUrl(canonicalValue);
  const ogImage = assetUrl(override?.og_image_url || image || defaultSocialImage);
  const effectiveJsonLd = override?.json_ld || jsonLd;
  const suppliedSchemas = effectiveJsonLd
    ? (Array.isArray(effectiveJsonLd) ? effectiveJsonLd : [effectiveJsonLd])
    : [];
  const hasProductSchema = suppliedSchemas.some(
    (schema) => schemaHasType(schema, "Product") || schemaHasType(schema, "ProductGroup"),
  );
  const productSchema = type === "product" && !hasProductSchema
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        "@id": `${url}#product`,
        name: effectiveTitle.replace(/\s*[|—].*$/, "").trim(),
        description: effectiveDescription,
        image: [ogImage],
        url,
        brand: { "@type": "Brand", name: PUBLIC_IDENTITY.name },
        manufacturer: { "@id": ORGANIZATION_ID },
        category: "Custom B2B apparel manufacturing",
        additionalProperty: [
          { "@type": "PropertyValue", name: "Program", value: "OEM, ODM and private label" },
          { "@type": "PropertyValue", name: "Production model", value: "Made to order" },
          { "@type": "PropertyValue", name: "Country of origin", value: "Pakistan" },
        ],
      }
    : null;
  const schemas = productSchema ? [...suppliedSchemas, productSchema] : suppliedSchemas;
  const isCategoryRoute = /^\/products\/[^/]+(?:\/all-products)?\/?$/.test(location.pathname);
  const functionalCategoryVariant = isCategoryRoute && shouldNoIndexCategorySearchParams(location.search);
  const isUnreviewedLocalizedTaxonomy = /^\/intl\/(de|fr|es)\/products\//.test(location.pathname)
    && !taxonomyTranslationsReleased();
  const robots = noindex || override?.noindex || functionalCategoryVariant || isUnreviewedLocalizedTaxonomy
    ? "noindex,follow,max-image-preview:large"
    : "index,follow,max-image-preview:large";
  const allowedAlternates = taxonomyTranslationsReleased()
    ? alternates
    : alternates.filter((alternate) => !/^\/intl\/(de|fr|es)\/products\//.test(alternate.href));
  const normalizedAlternates = allowedAlternates.length > 0
    ? allowedAlternates
    : [{ locale: "en", href: url }];
  const xDefault = canonicalUrl(xDefaultPath || effectivePath);

  useEffect(() => {
    document
      .querySelectorAll('meta[data-irha-fallback-seo="true"]')
      .forEach((element) => element.remove());
  }, []);

  return (
    <Helmet htmlAttributes={{ lang: locale, dir: direction }}>
      <title>{effectiveTitle}</title>
      <meta name="description" content={effectiveDescription} />
      <meta name="robots" content={robots} />
      <link rel="canonical" href={url} />
      {normalizedAlternates.map((alternate) => (
        <link key={`${alternate.locale}-${alternate.href}`} rel="alternate" hrefLang={alternate.locale} href={canonicalUrl(alternate.href)} />
      ))}
      <link rel="alternate" hrefLang="x-default" href={xDefault} />

      <meta property="og:title" content={effectiveTitle} />
      <meta property="og:description" content={effectiveDescription} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:locale" content={ogLocale(locale)} />
      <meta property="og:site_name" content={PUBLIC_IDENTITY.name} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:alt" content={`${effectiveTitle} — ${PUBLIC_IDENTITY.name}`} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={effectiveTitle} />
      <meta name="twitter:description" content={effectiveDescription} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={`${effectiveTitle} — ${PUBLIC_IDENTITY.name}`} />

      {schemas.map((schema, index) => (
        <script key={index} type="application/ld+json">
          {safeJson(schema)}
        </script>
      ))}
    </Helmet>
  );
}
