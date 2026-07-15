import { PRODUCT_REAL_MEDIA } from "@/lib/productRealMedia";

export function uniqueProductImages(images: Array<string | null | undefined>): string[] {
  return images
    .filter((image): image is string => Boolean(image))
    .filter((image, index, all) => all.indexOf(image) === index);
}

/**
 * Returns the only buyer-facing gallery allowed for a product slug.
 *
 * Exact first-party media never mixes with a legacy or migrated fallback set.
 * Products without an exact committed set use at most six unique URLs from the
 * database, where the first URL is the product-owned primary hero.
 */
export function selectAuthoritativeProductGallery(slug: string, baseGallery: string[]): string[] {
  const exactMedia = PRODUCT_REAL_MEDIA[slug];
  if (exactMedia?.gallery.length) {
    return uniqueProductImages(exactMedia.gallery);
  }

  return uniqueProductImages(baseGallery).slice(0, 6);
}
