import { IA_MEDIA_E001_PRODUCT_MEDIA } from "@/lib/iaMediaE001Runtime";
import { PRODUCT_REAL_MEDIA } from "@/lib/productRealMedia";

const PUBLIC_SITE_ORIGIN = "https://irhaapparels.com";
const CATALOG_PRODUCT_DIRECTORY = /^p\d{3}-(.+)$/i;

export function uniqueProductImages(images: Array<string | null | undefined>): string[] {
  return images
    .filter((image): image is string => Boolean(image))
    .filter((image, index, all) => all.indexOf(image) === index);
}

export function productSlugFromProductMediaUrl(value: string): string | null {
  try {
    const url = new URL(value, PUBLIC_SITE_ORIGIN);
    const segments = decodeURIComponent(url.pathname).split("/").filter(Boolean);
    const productIndex = segments.lastIndexOf("products");
    const directory = productIndex >= 0 ? segments[productIndex + 1] : null;
    return directory?.match(CATALOG_PRODUCT_DIRECTORY)?.[1] ?? null;
  } catch {
    return null;
  }
}

/**
 * Returns the only buyer-facing gallery allowed for a product slug.
 *
 * IA-MEDIA-E001 recovery sets are immutable, checksum-backed and take precedence
 * for P001-P007. Other exact first-party sets retain their existing authority.
 * Products without an exact committed set use at most six unique database URLs,
 * where the first URL remains the product-owned primary hero.
 */
export function selectAuthoritativeProductGallery(slug: string, baseGallery: string[]): string[] {
  const exactMedia = IA_MEDIA_E001_PRODUCT_MEDIA[slug] ?? PRODUCT_REAL_MEDIA[slug];
  if (exactMedia?.gallery.length) {
    return uniqueProductImages(exactMedia.gallery);
  }

  return uniqueProductImages(baseGallery).slice(0, 6);
}

/**
 * Resolves an existing product gallery to its exact committed authority by the
 * canonical `catalog/products/pNNN-<slug>/` directory embedded in its URLs.
 * This keeps direct product-detail routes aligned with collection adapters even
 * before the guarded database remediation is applied.
 */
export function selectAuthoritativeProductGalleryFromUrls(baseGallery: string[]): string[] {
  const unique = uniqueProductImages(baseGallery);
  const slug = unique.map(productSlugFromProductMediaUrl).find((candidate): candidate is string => Boolean(candidate));
  return slug ? selectAuthoritativeProductGallery(slug, unique) : unique.slice(0, 6);
}
