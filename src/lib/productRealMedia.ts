// Real product media mapped to exact public product slugs.
// Assets are served from this website's own public media paths after a
// validated import/optimization workflow. Keep one exact product set per slug.

export type ProductRealMedia = {
  gallery: string[];
};

export const PRODUCT_REAL_MEDIA: Record<string, ProductRealMedia> = {
  "traditional-lederhosen": {
    gallery: [
      "/product-media/traditional-lederhosen/01-front-embroidery.webp",
      "/product-media/traditional-lederhosen/02-back-construction.webp",
      "/product-media/traditional-lederhosen/03-side-embroidery-lacing.webp",
      "/product-media/traditional-lederhosen/04-pocket-leather-detail.webp",
      "/product-media/traditional-lederhosen/05-suspender-buckle-detail.webp",
    ],
  },
};
