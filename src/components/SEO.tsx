import { Helmet } from "react-helmet-async";

const SITE_URL = "https://www.irhaapparels.com";

type Props = {
  title: string;
  description: string;
  path?: string;
  image?: string;
  jsonLd?: object | object[];
  noindex?: boolean;
  type?: "website" | "article";
};

export default function SEO({
  title,
  description,
  path = "/",
  image,
  jsonLd,
  noindex,
  type = "website",
}: Props) {
  // Always emit absolute canonical / og:url so crawlers attribute each
  // page to its real URL (relative URLs silently break attribution).
  const url = path.startsWith("http")
    ? path
    : `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const ogImage = image
    ? image.startsWith("http")
      ? image
      : `${SITE_URL}${image.startsWith("/") ? image : `/${image}`}`
    : undefined;

  // Hreflang: site is English but markets it in DE/AT/UK/US/AU/CA/AE.
  // All point at the same URL — Google uses this to surface the page
  // in each locale's results without a duplicate-content penalty.
  const hreflangs: Array<[string, string]> = [
    ["en", url],
    ["en-US", url],
    ["en-GB", url],
    ["en-AU", url],
    ["en-CA", url],
    ["en-AE", url],
    ["de-DE", url],
    ["de-AT", url],
    ["x-default", url],
  ];

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {hreflangs.map(([lang, href]) => (
        <link key={lang} rel="alternate" hrefLang={lang} href={href} />
      ))}
      {noindex && <meta name="robots" content="noindex,follow" />}

      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="Irha Apparels" />
      {ogImage && <meta property="og:image" content={ogImage} />}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}

      {jsonLd &&
        (Array.isArray(jsonLd) ? jsonLd : [jsonLd]).map((schema, i) => (
          <script key={i} type="application/ld+json">
            {JSON.stringify(schema)}
          </script>
        ))}
    </Helmet>
  );
}
