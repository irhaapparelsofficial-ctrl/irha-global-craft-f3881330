import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import defaultSocialImage from "@/assets/banners/products-flatlay.jpg";
import { SITE_URL } from "@/lib/seoSchema";
import { usePublicPageTools } from "@/hooks/usePublicContent";

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

function absoluteUrl(value: string): string {
  return value.startsWith("http")
    ? value
    : `${SITE_URL}${value.startsWith("/") ? value : `/${value}`}`;
}

function ogLocale(locale: string) {
  return locale.replace("-", "_");
}

function safeJson(value: object) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
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
  const url = absoluteUrl(canonicalValue);
  const ogImage = absoluteUrl(override?.og_image_url || image || defaultSocialImage);
  const effectiveJsonLd = override?.json_ld || jsonLd;
  const robots = noindex || override?.noindex
    ? "noindex,follow,max-image-preview:large"
    : "index,follow,max-image-preview:large";
  const normalizedAlternates = alternates.length > 0
    ? alternates
    : [{ locale: "en", href: url }];
  const xDefault = absoluteUrl(xDefaultPath || effectivePath);

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
        <link key={`${alternate.locale}-${alternate.href}`} rel="alternate" hrefLang={alternate.locale} href={absoluteUrl(alternate.href)} />
      ))}
      <link rel="alternate" hrefLang="x-default" href={xDefault} />

      <meta property="og:title" content={effectiveTitle} />
      <meta property="og:description" content={effectiveDescription} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:locale" content={ogLocale(locale)} />
      <meta property="og:site_name" content="Irha Apparels" />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:alt" content={`${effectiveTitle} — Irha Apparels`} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={effectiveTitle} />
      <meta name="twitter:description" content={effectiveDescription} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={`${effectiveTitle} — Irha Apparels`} />

      {effectiveJsonLd &&
        (Array.isArray(effectiveJsonLd) ? effectiveJsonLd : [effectiveJsonLd]).map((schema, index) => (
          <script key={index} type="application/ld+json">
            {safeJson(schema)}
          </script>
        ))}
    </Helmet>
  );
}
