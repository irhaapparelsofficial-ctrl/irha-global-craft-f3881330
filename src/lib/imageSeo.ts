const DEFAULT_SITE_URL = "https://irhaapparels.com";

const TEMPORARY_QUERY_PATTERN =
  /(?:^|[?&])(?:token|signature|expires|x-amz-[^=]*|x-goog-[^=]*|policy|key-pair-id)=/i;

function titleCase(value: string): string {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => {
      const upper = part.toUpperCase();
      if (/^P\d{3}$/.test(upper)) return upper;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

function cleanFileStem(value: string): string {
  return value
    .replace(/\.(?:avif|gif|jpe?g|png|svg|webp)(?:\.(?:avif|gif|jpe?g|png|svg|webp))?$/i, "")
    .toLowerCase();
}

export function absolutePublicImageUrl(value: string, siteUrl = DEFAULT_SITE_URL): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("Image URL is empty");
  const parsed = new URL(trimmed, siteUrl);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`Unsupported image URL protocol: ${parsed.protocol}`);
  }
  return parsed.href;
}

export function isTemporaryImageUrl(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value, DEFAULT_SITE_URL);
  } catch {
    return true;
  }
  return TEMPORARY_QUERY_PATTERN.test(parsed.search)
    || /\/sign\/|\/signed\//i.test(parsed.pathname);
}

export function productNameFromImageUrl(value: string): string | null {
  try {
    const parsed = new URL(value, DEFAULT_SITE_URL);
    const segments = parsed.pathname.split("/").filter(Boolean);
    const productIndex = segments.lastIndexOf("products");
    const directory = productIndex >= 0 ? segments[productIndex + 1] : null;
    if (!directory || !/^p\d{3}-/i.test(directory)) return null;
    const normalized = directory.replace(/^p\d{3}-/i, "");
    return normalized ? titleCase(normalized) : null;
  } catch {
    return null;
  }
}

export function imageViewLabel(value: string, fallbackIndex?: number): string {
  let stem = "";
  try {
    const parsed = new URL(value, DEFAULT_SITE_URL);
    stem = cleanFileStem(parsed.pathname.split("/").pop() ?? "");
  } catch {
    stem = cleanFileStem(value.split("/").pop() ?? "");
  }

  if (/(?:^|-)rear-three-quarter(?:-|$)/.test(stem)) return "Rear three-quarter view";
  if (/(?:^|-)three-quarter(?:-|$)/.test(stem)) return "Three-quarter view";
  if (/(?:^|-)front(?:-|$)/.test(stem)) return "Front view";
  if (/(?:^|-)side(?:-|$)/.test(stem)) return "Side view";
  if (/(?:^|-)back(?:-|$)|(?:^|-)rear(?:-|$)/.test(stem)) return "Back view";
  if (/(?:^|-)branding(?:-|$)/.test(stem)) return "Branding detail";
  if (/(?:^|-)packaging(?:-|$)/.test(stem)) return "Packaging view";
  if (/(?:^|-)(?:detail|macro|close-up)(?:-|$)/.test(stem)) return "Construction detail";

  const numbered = stem.match(/(?:^|-)view-(\d{1,2})(?:-|$)/);
  if (numbered) return `Alternate view ${Number(numbered[1])}`;

  if (fallbackIndex === 0) return "Front view";
  if (typeof fallbackIndex === "number") return `Alternate view ${fallbackIndex + 1}`;
  return "Product view";
}

export function productImageAlt(
  imageUrl: string,
  productName?: string | null,
  fallbackIndex?: number,
): string {
  const resolvedName = productName?.trim() || productNameFromImageUrl(imageUrl) || "product";
  return `${imageViewLabel(imageUrl, fallbackIndex)} of ${resolvedName}`;
}

export function semanticImageAlt(
  imageUrl: string,
  providedAlt?: string,
  fallbackIndex?: number,
): string {
  const explicitAlt = providedAlt?.trim() || "";
  if (/^Digital catalogue reference\b/i.test(explicitAlt)) return explicitAlt;
  const productName = productNameFromImageUrl(imageUrl);
  if (productName) return productImageAlt(imageUrl, productName, fallbackIndex);
  return explicitAlt;
}
