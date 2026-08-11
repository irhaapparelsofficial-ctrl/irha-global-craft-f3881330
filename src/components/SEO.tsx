import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import defaultSocialImage from "@/assets/banners/products-flatlay.jpg";
import { ORGANIZATION_ID, SITE_URL } from "@/lib/seoSchema";
import { productImageAlt, productNameFromImageUrl } from "@/lib/imageSeo";
import { PUBLIC_IDENTITY } from "@/lib/publicIdentity.mjs";
import { usePublicPageTools } from "@/hooks/usePublicContent";
import { shouldNoIndexCategorySearchParams } from "@/lib/categoryIndexing";
import {
  getHreflangAlternates,
  getPublishedRoute,
  getRouteDirection,
  getRouteLocale,
  getXDefaultPath,
  isPublishedLocalizedRoute,
  LOCALE_REGISTRY,
  normalizeRoutePath,
} from "@/lib/i18nFoundation";

type Alternate = { locale: string; href: string };
type Props = {
  title: string;
  description: string;
  path?: string;
  canonical?: string;
  image?: string;
  imageAlt?: string;
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
function assetUrl(value: string): string { return value.startsWith("http") ? value : `${SITE_URL}${value.startsWith("/") ? value : `/${value}`}`; }
function safeJson(value: object) { return JSON.stringify(normalizeOrganizationReferences(value)).replace(/</g, "\u003c"); }
function taxonomyTranslationsReleased() { return import.meta.env.VITE_TAXONOMY_TRANSLATIONS_RELEASED === "true"; }
function schemaHasType(schema: object, expected: string) { const value = (schema as Record<string, unknown>)["@type"]; return Array.isArray(value) ? value.includes(expected) : value === expected; }
function imageObject(url: string) { return { "@type": "ImageObject", url, contentUrl: url }; }

export function normalizeOrganizationReferences(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeOrganizationReferences);
  if (!value || typeof value !== "object") return value;
  const source = value as Record<string, unknown>;
  const type = source["@type"];
  const isIrhaOrganization = type === "Organization" && (source["@id"] === ORGANIZATION_ID || source.name === PUBLIC_IDENTITY.name);
  if (isIrhaOrganization) return { "@id": ORGANIZATION_ID };
  return Object.fromEntries(Object.entries(source).map(([key, child]) => [key, normalizeOrganizationReferences(child)]));
}

export default function SEO({
  title, description, path, canonical, image, imageAlt, jsonLd, noindex,
  type = "website", locale = "en", direction = "ltr", alternates = [], xDefaultPath,
}: Props) {
  const location = useLocation();
  const effectivePath = normalizeRoutePath(path || location.pathname || "/");
  const registeredRoute = getPublishedRoute(effectivePath);
  const routeLocale = registeredRoute?.locale ?? getRouteLocale(effectivePath);
  const effectiveDirection = registeredRoute ? getRouteDirection(effectivePath) : direction;
  const { data: pageTools } = usePublicPageTools(effectivePath, routeLocale);
  const override = registeredRoute ? undefined : pageTools.seo;

  const effectiveTitle = override?.seo_title || title;
  const effectiveDescription = override?.seo_description || description;
  const canonicalValue = registeredRoute?.path || override?.canonical_url || canonical || effectivePath;
  const url = canonicalUrl(canonicalValue);
  const ogImage = assetUrl(override?.og_image_url || image || defaultSocialImage);
  const derivedProductName = productNameFromImageUrl(ogImage);
  const effectiveImageAlt = imageAlt?.trim() || productImageAlt(ogImage, derivedProductName || effectiveTitle.replace(/\s*[|—].*$/, "").trim());
  const effectiveJsonLd = override?.json_ld || jsonLd;
  const suppliedSchemas = effectiveJsonLd ? (Array.isArray(effectiveJsonLd) ? effectiveJsonLd : [effectiveJsonLd]) : [];
  const hasProductSchema = suppliedSchemas.some((schema) => schemaHasType(schema, "Product") || schemaHasType(schema, "ProductGroup"));
  const productId = `${url}#product`;
  const productSchema = type === "product" && !hasProductSchema ? {
    "@context": "https://schema.org", "@type": "Product", "@id": productId,
    name: effectiveTitle.replace(/\s*[|—].*$/, "").trim(), description: effectiveDescription,
    image: [ogImage], url, brand: { "@type": "Brand", name: PUBLIC_IDENTITY.name }, manufacturer: { "@id": ORGANIZATION_ID },
    category: "Custom B2B apparel manufacturing",
    additionalProperty: [
      { "@type": "PropertyValue", name: "Program", value: "OEM, ODM and private label" },
      { "@type": "PropertyValue", name: "Production model", value: "Made to order" },
      { "@type": "PropertyValue", name: "Country of origin", value: "Pakistan" },
    ],
  } : null;
  const baseSchemas = productSchema ? [...suppliedSchemas, productSchema] : suppliedSchemas;
  const schemas = baseSchemas.map((schema) => {
    if (!schema || typeof schema !== "object") return schema;
    const value = schema as Record<string, unknown>;
    if (schemaHasType(schema, "Product") || schemaHasType(schema, "ProductGroup")) {
      const images = Array.isArray(value.image) ? value.image.filter(Boolean) : value.image ? [value.image] : [];
      return { ...value, image: [ogImage, ...images.filter((candidate) => candidate !== ogImage)], url };
    }
    if (schemaHasType(schema, "WebPage") || schemaHasType(schema, "CollectionPage")) {
      return { ...value, inLanguage: routeLocale, primaryImageOfPage: imageObject(ogImage), ...(type === "product" ? { mainEntity: { "@id": productId } } : {}) };
    }
    return schema;
  });
  const hasWebPageSchema = schemas.some((schema) => schemaHasType(schema, "WebPage"));
  if (type === "product" && !hasWebPageSchema) {
    schemas.unshift({
      "@context": "https://schema.org", "@type": "WebPage", "@id": `${url}#webpage`, url,
      name: effectiveTitle, description: effectiveDescription, isPartOf: { "@id": `${SITE_URL}/#website` },
      mainEntity: { "@id": productId }, primaryImageOfPage: imageObject(ogImage), inLanguage: routeLocale,
    });
  }

  const isCategoryRoute = /^\/products\/[^/]+(?:\/all-products)?\/?$/.test(location.pathname);
  const functionalCategoryVariant = isCategoryRoute && shouldNoIndexCategorySearchParams(location.search);
  const isUnreviewedLocalizedTaxonomy = /^\/intl\/(de|fr|es)\/products\//.test(location.pathname) && !taxonomyTranslationsReleased();
  const isUnpublishedGermanRoute = (effectivePath === "/de/" || effectivePath.startsWith("/de/")) && !isPublishedLocalizedRoute(effectivePath);
  const robots = noindex || override?.noindex || functionalCategoryVariant || isUnreviewedLocalizedTaxonomy || isUnpublishedGermanRoute
    ? "noindex,follow,max-image-preview:large"
    : "index,follow,max-image-preview:large";

  const registryAlternates = registeredRoute ? getHreflangAlternates(effectivePath) : [];
  const allowedAlternates = registeredRoute
    ? registryAlternates
    : (taxonomyTranslationsReleased() ? alternates : alternates.filter((alternate) => !/^\/intl\/(de|fr|es)\/products\//.test(alternate.href)))
      .filter((alternate) => alternate.locale !== "de" || isPublishedLocalizedRoute(alternate.href));
  const normalizedAlternates = allowedAlternates.length > 0 ? allowedAlternates : [{ locale: LOCALE_REGISTRY[routeLocale].hreflangCode, href: effectivePath }];
  const xDefault = canonicalUrl(registeredRoute ? getXDefaultPath(effectivePath) : (xDefaultPath || effectivePath));

  useEffect(() => { document.querySelectorAll('[data-irha-fallback-seo="true"]').forEach((element) => element.remove()); }, []);

  return (
    <Helmet htmlAttributes={{ lang: routeLocale, dir: effectiveDirection }}>
      <title>{effectiveTitle}</title>
      <meta name="description" content={effectiveDescription} />
      <meta name="robots" content={robots} />
      <link rel="canonical" href={url} />
      {normalizedAlternates.map((alternate) => <link key={`${alternate.locale}-${alternate.href}`} rel="alternate" hrefLang={alternate.locale} href={canonicalUrl(alternate.href)} />)}
      <link rel="alternate" hrefLang="x-default" href={xDefault} />
      <meta property="og:title" content={effectiveTitle} />
      <meta property="og:description" content={effectiveDescription} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:locale" content={LOCALE_REGISTRY[routeLocale].openGraphLocale} />
      <meta property="og:site_name" content={PUBLIC_IDENTITY.name} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:alt" content={effectiveImageAlt} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={effectiveTitle} />
      <meta name="twitter:description" content={effectiveDescription} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={effectiveImageAlt} />
      {schemas.map((schema, index) => <script key={index} type="application/ld+json">{safeJson(schema)}</script>)}
    </Helmet>
  );
}
