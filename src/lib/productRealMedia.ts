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
  "contrast-piped-brown-short-lederhosen": {
    gallery: [
      "/product-media/contrast-piped-brown-short-lederhosen/01-hero-front.webp",
      "/product-media/contrast-piped-brown-short-lederhosen/03-angle-back.webp",
      "/product-media/contrast-piped-brown-short-lederhosen/04-detail-front-flap.webp",
      "/product-media/contrast-piped-brown-short-lederhosen/05-detail-leg-embroidery-buttons.webp",
    ],
  },
  "black-skeleton-embroidered-short-lederhosen": {
    gallery: [
      "/product-media/black-skeleton-embroidered-short-lederhosen/01-hero-front-three-quarter.webp",
      "/product-media/black-skeleton-embroidered-short-lederhosen/04-detail-skeleton-embroidery.webp",
    ],
  },
  "brown-floral-embroidered-short-lederhosen": {
    gallery: [
      "/product-media/brown-floral-embroidered-short-lederhosen/01-hero-front-with-suspenders.webp",
      "/product-media/brown-floral-embroidered-short-lederhosen/03-angle-back.webp",
      "/product-media/brown-floral-embroidered-short-lederhosen/04-detail-floral-embroidery.webp",
      "/product-media/brown-floral-embroidered-short-lederhosen/07-extra-front-without-suspenders.webp",
    ],
  },
  "dark-brown-scroll-embroidered-short-lederhosen": {
    gallery: [
      "/product-media/dark-brown-scroll-embroidered-short-lederhosen/01-hero-front.webp",
      "/product-media/dark-brown-scroll-embroidered-short-lederhosen/03-angle-back.webp",
      "/product-media/dark-brown-scroll-embroidered-short-lederhosen/04-detail-scroll-embroidery.webp",
    ],
  },
  "black-gold-embroidered-short-lederhosen": {
    gallery: [
      "/product-media/black-gold-embroidered-short-lederhosen/01-hero-front.webp",
      "/product-media/black-gold-embroidered-short-lederhosen/03-angle-back.webp",
      "/product-media/black-gold-embroidered-short-lederhosen/04-detail-gold-embroidery.webp",
    ],
  },
  "tan-alpine-embroidered-short-lederhosen": {
    gallery: [
      "/product-media/tan-alpine-embroidered-short-lederhosen/01-hero-front.webp",
      "/product-media/tan-alpine-embroidered-short-lederhosen/03-angle-back.webp",
      "/product-media/tan-alpine-embroidered-short-lederhosen/04-detail-alpine-embroidery.webp",
    ],
  },
  "antique-brown-scroll-embroidered-short-lederhosen": {
    gallery: [
      "/product-media/antique-brown-scroll-embroidered-short-lederhosen/01-hero-front.webp",
      "/product-media/antique-brown-scroll-embroidered-short-lederhosen/03-angle-back.webp",
      "/product-media/antique-brown-scroll-embroidered-short-lederhosen/04-detail-front-scroll-embroidery.webp",
    ],
  },
  "sand-brown-floral-embroidered-short-lederhosen": {
    gallery: [
      "/product-media/sand-brown-floral-embroidered-short-lederhosen/01-hero-front.webp",
      "/product-media/sand-brown-floral-embroidered-short-lederhosen/04-detail-leg-embroidery-buttons.webp",
      "/product-media/sand-brown-floral-embroidered-short-lederhosen/05-detail-suspender-front-flap.webp",
    ],
  },
  "dark-brown-ivory-embroidered-short-lederhosen": {
    gallery: [
      "/product-media/dark-brown-ivory-embroidered-short-lederhosen/01-hero-front-with-suspenders.webp",
      "/product-media/dark-brown-ivory-embroidered-short-lederhosen/03-angle-back.webp",
      "/product-media/dark-brown-ivory-embroidered-short-lederhosen/04-detail-suspender-embroidery.webp",
      "/product-media/dark-brown-ivory-embroidered-short-lederhosen/07-extra-front-view.webp",
    ],
  },
  "crackle-brown-green-embroidered-short-lederhosen": {
    gallery: [
      "/product-media/crackle-brown-green-embroidered-short-lederhosen/01-hero-front.webp",
      "/product-media/crackle-brown-green-embroidered-short-lederhosen/03-angle-back.webp",
      "/product-media/crackle-brown-green-embroidered-short-lederhosen/04-detail-front-flap.webp",
      "/product-media/crackle-brown-green-embroidered-short-lederhosen/05-detail-leg-embroidery.webp",
    ],
  },
  "vintage-taupe-side-tie-short-lederhosen": {
    gallery: [
      "/product-media/vintage-taupe-side-tie-short-lederhosen/01-hero-front.webp",
      "/product-media/vintage-taupe-side-tie-short-lederhosen/03-angle-back.webp",
      "/product-media/vintage-taupe-side-tie-short-lederhosen/04-detail-upper-construction.webp",
      "/product-media/vintage-taupe-side-tie-short-lederhosen/05-detail-leg-embroidery-side-tie.webp",
    ],
  },
  "olive-brown-ornamental-embroidered-short-lederhosen": {
    gallery: [
      "/product-media/olive-brown-ornamental-embroidered-short-lederhosen/01-hero-front.webp",
      "/product-media/olive-brown-ornamental-embroidered-short-lederhosen/03-angle-back.webp",
      "/product-media/olive-brown-ornamental-embroidered-short-lederhosen/04-detail-front-flap.webp",
      "/product-media/olive-brown-ornamental-embroidered-short-lederhosen/05-detail-leg-embroidery-buttons.webp",
    ],
  },
  "light-tan-ornamental-embroidered-short-lederhosen": {
    gallery: [
      "/product-media/light-tan-ornamental-embroidered-short-lederhosen/01-hero-front.webp",
      "/product-media/light-tan-ornamental-embroidered-short-lederhosen/03-angle-back.webp",
      "/product-media/light-tan-ornamental-embroidered-short-lederhosen/04-detail-front-flap.webp",
      "/product-media/light-tan-ornamental-embroidered-short-lederhosen/05-detail-leg-embroidery-buttons.webp",
    ],
  },
};
