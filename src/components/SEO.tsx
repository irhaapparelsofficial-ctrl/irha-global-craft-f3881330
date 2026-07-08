import { Helmet } from "react-helmet-async";
import defaultSocialImage from "@/assets/banners/products-flatlay.jpg";
import { SITE_URL } from "@/lib/seoSchema";

type Props = {
  title: string;
  description: string;
  path?: string;
  image?: string;
  jsonLd?: object | object[];
  noindex?: boolean;
  type?: "website" | "article" | "product";
};

function absoluteUrl(value: string): string {
  return value.startsWith("http")
    ? value
    : `${SITE_URL}${value.startsWith("/") ? value : `/${value}`}`;
}

export default function SEO({
  title,
  description,
  path = "/",
  image,
  jsonLd,
  noindex,
  type = "website",
}: Props) {
  const url = absoluteUrl(path);
  const ogImage = absoluteUrl(image || defaultSocialImage);
  const robots = noindex
    ? "noindex,follow,max-image-preview:large"
    : "index,follow,max-image-preview:large";

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={robots} />
      <link rel="canonical" href={url} />
      <link rel="alternate" hrefLang="en" href={url} />
      <link rel="alternate" hrefLang="x-default" href={url} />

      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:locale" content="en_US" />
      <meta property="og:site_name" content="Irha Apparels" />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:alt" content={`${title} — Irha Apparels`} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={`${title} — Irha Apparels`} />

      {jsonLd &&
        (Array.isArray(jsonLd) ? jsonLd : [jsonLd]).map((schema, i) => (
          <script key={i} type="application/ld+json">
            {JSON.stringify(schema)}
          </script>
        ))}
    </Helmet>
  );
}
