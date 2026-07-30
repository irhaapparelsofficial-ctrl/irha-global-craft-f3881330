import { IA_MEDIA_E001_PRODUCT_MEDIA } from "@/lib/iaMediaE001Runtime";
import { PRODUCT_REAL_MEDIA } from "@/lib/productRealMedia";

export function uniqueProductImages(images: Array<string | null | undefined>): string[] {
  return images
    .filter((image): image is string => Boolean(image))
    .filter((image, index, all) => all.indexOf(image) === index);
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
