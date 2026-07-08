// Real product media mapped to exact public product slugs.
// Locked buyer-facing order: 1 hero → 2 angles → 2 details → 1 B2B proof → extras.
// Keep one exact product set per slug and never mix unrelated variants.
// When an exact role image is not available, leave it absent rather than using a wrong product.

export type ProductRealMedia = {
  gallery: string[];
};

export const PRODUCT_REAL_MEDIA: Record<string, ProductRealMedia> = {
  "traditional-lederhosen": {
    gallery: [
      "/product-media/traditional-lederhosen/01-hero-front.webp",
      "/product-media/traditional-lederhosen/02-angle-front-three-quarter.webp",
      "/product-media/traditional-lederhosen/03-angle-back.webp",
      "/product-media/traditional-lederhosen/04-detail-front-embroidery.webp",
      "/product-media/traditional-lederhosen/05-detail-leg-embroidery-tie.webp",
      "/product-media/traditional-lederhosen/03-side-embroidery-lacing.webp",
      "/product-media/traditional-lederhosen/01-front-embroidery.webp",
      "/product-media/traditional-lederhosen/02-back-construction.webp",
      "/product-media/traditional-lederhosen/04-pocket-leather-detail.webp",
      "/product-media/traditional-lederhosen/05-suspender-buckle-detail.webp",
    ],
  },
  "white-embroidered-lederhosen": {
    gallery: [
      "/product-media/white-embroidered-lederhosen/01-hero-front.webp",
      "/product-media/white-embroidered-lederhosen/04-detail-embroidery.webp",
      "/product-media/white-embroidered-lederhosen/06-b2b-bulk-proof.webp",
    ],
  },
  "brown-short-lederhosen": {
    gallery: [
      "/product-media/brown-short-lederhosen/01-hero-front.webp",
      "/product-media/brown-short-lederhosen/03-angle-back.webp",
      "/product-media/brown-short-lederhosen/04-detail-side-construction.webp",
      "/product-media/brown-short-lederhosen/05-detail-embroidery-buttons.webp",
    ],
  },
  "distressed-brown-short-lederhosen": {
    gallery: [
      "/product-media/distressed-brown-short-lederhosen/01-hero-front.webp",
      "/product-media/distressed-brown-short-lederhosen/03-angle-back.webp",
      "/product-media/distressed-brown-short-lederhosen/04-detail-front-flap.webp",
      "/product-media/distressed-brown-short-lederhosen/05-detail-side-leg.webp",
      "/product-media/distressed-brown-short-lederhosen/07-extra-front-without-suspenders.webp",
      "/product-media/distressed-brown-short-lederhosen/08-extra-rear-pocket.webp",
    ],
  },
};
