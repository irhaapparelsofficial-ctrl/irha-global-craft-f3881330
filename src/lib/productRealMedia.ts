// Real product media mapped to exact public product slugs.
// Locked buyer-facing order: 1 hero → 2 angles → 2 details → 1 B2B proof → extras.
// Keep one exact product set per slug and never mix unrelated variants.

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
};
