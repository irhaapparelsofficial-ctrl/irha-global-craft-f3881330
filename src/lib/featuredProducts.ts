// AUTO-GENERATED.
export type FeaturedProduct = {
  sku: string; title: string; description: string;
  image: string; categorySlug: string; productSlug: string;
  moq: string; leadTime: string; badge: string;
};

export const FEATURED_PRODUCTS: FeaturedProduct[] = [
  {
    sku: "IRH-BAV-001",
    title: "Traditional Lederhosen",
    description: "Handcrafted traditional lederhosen in authentic Alpine tradition — premium fabrics, ornate detailing and heritage construction for Oktoberfest retailers and trachten boutiques across Germany & Austria.",
    image: "/__l5e/assets-v1/c4c83428-e348-4701-91db-ab6d6416845d/irha-0073.jpg",
    categorySlug: "bavarian",
    productSlug: "lederhosen",
    moq: "MOQ: 50 sets per design / color",
    leadTime: "45–60 days FOB Sialkot",
    badge: "B2B",
  },
  {
    sku: "IRH-LEA-002",
    title: "Full-Grain Leather Belt",
    description: "Premium full-grain leather belt cut from full-grain leather with YKK hardware, bonded linings and hand-finished edges — built for luxury outerwear ranges.",
    image: "/__l5e/assets-v1/43cc827e-3506-4c82-af42-3a384abd5d14/irha-0027.jpg",
    categorySlug: "leatherwear",
    productSlug: "leather-belt",
    moq: "MOQ: 30–50 pieces per style",
    leadTime: "50–65 days FOB",
    badge: "B2B",
  },
  {
    sku: "IRH-SPO-003",
    title: "Zip-Up Fleece Jacket",
    description: "Competition-grade zip-up fleece jacket with full dye-sublimation, moisture-wicking polyester and 4-way stretch — engineered for teams, federations and pro sports programs.",
    image: "/__l5e/assets-v1/6ed8d48e-2b63-4777-a00d-32bdccbd5e05/irha-0109.jpg",
    categorySlug: "sportswear",
    productSlug: "zip-fleece-jacket",
    moq: "MOQ: 50 pieces per kit / 100 per jersey",
    leadTime: "30–40 days FOB",
    badge: "B2B",
  },
  {
    sku: "IRH-STR-004",
    title: "Oversized Streetwear Hoodie",
    description: "Oversized Streetwear Hoodie in heavyweight French Terry with garment-dye finish and box-fit pattern — engineered for premium streetwear labels and private-label drops.",
    image: "/__l5e/assets-v1/62811c8d-8c61-41b4-b4d8-19ebb962dcd8/irha-0300.jpg",
    categorySlug: "streetwear",
    productSlug: "oversized-hoodie",
    moq: "MOQ: 50 pieces per design / color",
    leadTime: "35–50 days FOB",
    badge: "B2B",
  },
];

export const findFeaturedProduct = (
  categorySlug?: string,
  productSlug?: string,
): FeaturedProduct | undefined =>
  FEATURED_PRODUCTS.find(
    (p) => p.categorySlug === categorySlug && p.productSlug === productSlug,
  );
