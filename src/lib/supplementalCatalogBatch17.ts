import type { DbProduct } from "@/hooks/useCatalog";

// Visually verified first-party Drive media: Women's → Lederhosen.
const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

type ProductSeed = {
  id: number;
  slug: string;
  name: string;
  visual: string;
  features: string[];
  sort: number;
  gallery: string[];
};

const PRODUCTS: ProductSeed[] = [
  {
    id: 930001,
    slug: "burgundy-floral-embroidered-womens-short-lederhosen",
    name: "Burgundy Floral-Embroidered Women's Short Lederhosen",
    visual: "burgundy finish with light floral embroidery",
    features: ["Short fitted silhouette", "Decorative front flap embroidery", "Adjustable side-tie hems"],
    sort: 1330,
    gallery: [
      "/media/bavarian-drive/assets/women-lederhosen/traditional-lederhosen/short-lederhosen-41.webp",
      "/media/bavarian-drive/assets/women-lederhosen/traditional-lederhosen/short-lederhosen-42.webp",
      "/media/bavarian-drive/assets/women-lederhosen/traditional-lederhosen/short-lederhosen-43.webp",
    ],
  },
  {
    id: 930002,
    slug: "sand-floral-embroidered-womens-knee-length-lederhosen",
    name: "Sand Floral-Embroidered Women's Knee-Length Lederhosen",
    visual: "sand-toned distressed finish with muted floral embroidery",
    features: ["Knee-length silhouette", "Floral front-panel embroidery", "Decorative side and hem detailing"],
    sort: 1331,
    gallery: [
      "/media/bavarian-drive/assets/women-lederhosen/traditional-lederhosen/short-lederhosen-37.webp",
      "/media/bavarian-drive/assets/women-lederhosen/traditional-lederhosen/short-lederhosen-38.webp",
      "/media/bavarian-drive/assets/women-lederhosen/traditional-lederhosen/short-lederhosen-39.webp",
      "/media/bavarian-drive/assets/women-lederhosen/traditional-lederhosen/short-lederhosen-40.webp",
    ],
  },
  {
    id: 930003,
    slug: "distressed-brown-pink-embroidered-womens-short-lederhosen",
    name: "Distressed Brown Pink-Embroidered Women's Short Lederhosen",
    visual: "distressed brown finish with pink contrast embroidery",
    features: ["Short fitted silhouette", "Pink ornamental embroidery", "Adjustable side-tie hems"],
    sort: 1332,
    gallery: [
      "/media/bavarian-drive/assets/women-lederhosen/traditional-lederhosen/short-lederhosen-34.webp",
      "/media/bavarian-drive/assets/women-lederhosen/traditional-lederhosen/short-lederhosen-35.webp",
      "/media/bavarian-drive/assets/women-lederhosen/traditional-lederhosen/short-lederhosen-36.webp",
    ],
  },
  {
    id: 930004,
    slug: "dark-brown-classic-womens-short-lederhosen",
    name: "Dark Brown Classic Women's Short Lederhosen",
    visual: "dark brown finish with tonal traditional embroidery",
    features: ["Classic short silhouette", "Tonal front-flap embroidery", "Adjustable side-tie hems"],
    sort: 1333,
    gallery: [
      "/media/bavarian-drive/assets/women-lederhosen/traditional-lederhosen/short-lederhosen-31.webp",
      "/media/bavarian-drive/assets/women-lederhosen/traditional-lederhosen/short-lederhosen-32.webp",
      "/media/bavarian-drive/assets/women-lederhosen/traditional-lederhosen/short-lederhosen-33.webp",
    ],
  },
  {
    id: 930005,
    slug: "dark-brown-side-button-embroidered-womens-short-lederhosen",
    name: "Dark Brown Side-Button Embroidered Women's Short Lederhosen",
    visual: "deep brown finish with light contrast embroidery",
    features: ["Short tailored silhouette", "Decorative side-button panel", "Traditional front-flap embroidery"],
    sort: 1334,
    gallery: [
      "/media/bavarian-drive/assets/women-lederhosen/traditional-lederhosen/short-lederhosen-28.webp",
      "/media/bavarian-drive/assets/women-lederhosen/traditional-lederhosen/short-lederhosen-29.webp",
      "/media/bavarian-drive/assets/women-lederhosen/traditional-lederhosen/short-lederhosen-30.webp",
    ],
  },
  {
    id: 930006,
    slug: "brown-heart-embroidered-womens-knee-length-lederhosen",
    name: "Brown Heart-Embroidered Women's Knee-Length Lederhosen",
    visual: "classic brown finish with light ornamental stitching",
    features: ["Knee-length silhouette", "Heart embroidery at the back waist", "Decorative pocket and hem stitching"],
    sort: 1335,
    gallery: [
      "/media/bavarian-drive/assets/women-lederhosen/traditional-lederhosen/kniebund-lederhosen-9.webp",
      "/media/bavarian-drive/assets/women-lederhosen/traditional-lederhosen/kniebund-lederhosen-10.webp",
      "/media/bavarian-drive/assets/women-lederhosen/traditional-lederhosen/kniebund-lederhosen-11.webp",
    ],
  },
];

function createProduct(product: ProductSeed, categoryId: string): DbProduct {
  return {
    id: `00000000-0000-0000-0000-${String(product.id).padStart(12, "0")}`,
    category_id: categoryId,
    slug: product.slug,
    name: product.name,
    description: `${product.name} in a ${product.visual} visual finish with ${product.features.join(", ").toLowerCase()}, prepared for wholesale, OEM and private-label women's Trachten programs.`,
    image_url: product.gallery[0] ?? null,
    gallery: product.gallery,
    specs: [
      `${product.visual[0].toUpperCase()}${product.visual.slice(1)} visual finish`,
      ...product.features,
      "Buyer-specified material, embroidery, trim and size grading available",
      "Private-label customization available",
    ],
    details: [],
    material_specifications: null,
    seo_title: `${product.name} Manufacturer | Irha Apparels`,
    seo_description: `${product.name} for wholesale, OEM and private-label women's Lederhosen programs from Irha Apparels, a B2B apparel manufacturer in Sialkot, Pakistan.`,
    sort_order: product.sort,
    is_published: true,
    sku: null,
    is_featured: false,
    short_description: `${product.name} for wholesale, OEM, ODM and private-label Trachten programs.`,
    moq_display: null,
    moq_min: null,
    sample_available: null,
    sample_timeline: null,
    production_timeline: null,
    country_of_origin: null,
    primary_material: null,
    fabric_composition: null,
    gsm: null,
    available_sizes: [],
    size_notes: null,
    available_colors: [],
    custom_colors: true,
    customization: {},
    packaging_standard: null,
    packaging_custom: null,
    related_product_ids: [],
  };
}

export function createSupplementalBatch17ProductsForSubcategory(
  topCategorySlug: string,
  subSlug: string,
  subName: string,
  categoryId: string,
): DbProduct[] {
  const normalizedSubName = normalize(subName);
  const isWomensTrachten =
    topCategorySlug === "bavarian-trachten-wear" &&
    (subSlug === "women" || normalizedSubName.includes("women"));

  return isWomensTrachten ? PRODUCTS.map((product) => createProduct(product, categoryId)) : [];
}
