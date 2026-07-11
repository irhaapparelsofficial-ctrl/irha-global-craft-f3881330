import type { DbProduct } from "@/hooks/useCatalog";

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

type BatchProduct = {
  idSuffix: number;
  slug: string;
  name: string;
  description: string;
  specs: string[];
  shortDescription: string;
  sortOrder: number;
  gallery: string[];
};

const PRODUCTS: BatchProduct[] = [
  {
    idSuffix: 86,
    slug: "vintage-brown-minimal-side-embroidered-short-lederhosen",
    name: "Vintage Brown Minimal Side-Embroidered Short Lederhosen",
    description: "Short-cut Bavarian-style Lederhosen in a vintage-brown colourway with clean front construction, subtle side embroidery and adjustable rear-waist lacing, prepared for wholesale and private-label buyer programs.",
    specs: ["Vintage-brown visual finish", "Subtle side embroidery", "Clean front construction", "Adjustable rear-waist lacing", "Private-label customization available"],
    shortDescription: "Vintage brown minimal side-embroidered short Lederhosen for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1020,
    gallery: [
      "/product-media/vintage-brown-minimal-side-embroidered-short-lederhosen/01-hero-front.webp",
      "/product-media/vintage-brown-minimal-side-embroidered-short-lederhosen/03-angle-back.webp",
      "/product-media/vintage-brown-minimal-side-embroidered-short-lederhosen/04-detail-waist-construction.webp",
      "/product-media/vintage-brown-minimal-side-embroidered-short-lederhosen/05-detail-side-embroidery.webp",
    ],
  },
  {
    idSuffix: 87,
    slug: "dark-brown-eagle-embroidered-suspender-short-lederhosen",
    name: "Dark Brown Eagle-Embroidered Suspender Short Lederhosen",
    description: "Short-cut Bavarian-style Lederhosen in a dark-brown colourway with statement eagle embroidery, ornamental front-panel detailing, matching suspenders and adjustable side ties, prepared for wholesale and private-label buyer programs.",
    specs: ["Statement eagle embroidery", "Dark-brown visual finish", "Ornamental front-panel detailing", "Matching suspenders", "Private-label customization available"],
    shortDescription: "Dark brown eagle-embroidered suspender short Lederhosen for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1021,
    gallery: [
      "/product-media/dark-brown-eagle-embroidered-suspender-short-lederhosen/01-hero-front-with-suspenders.webp",
      "/product-media/dark-brown-eagle-embroidered-suspender-short-lederhosen/03-angle-back.webp",
      "/product-media/dark-brown-eagle-embroidered-suspender-short-lederhosen/04-detail-eagle-embroidery.webp",
    ],
  },
  {
    idSuffix: 88,
    slug: "dark-brown-floral-ornamental-suspender-short-lederhosen",
    name: "Dark Brown Floral-Ornamental Suspender Short Lederhosen",
    description: "Short-cut Bavarian-style Lederhosen in a dark-brown colourway with floral-ornamental embroidery, decorative front-panel construction and matching suspenders, prepared for wholesale and private-label buyer programs.",
    specs: ["Floral-ornamental embroidery", "Dark-brown visual finish", "Decorative front-panel construction", "Matching suspenders", "Private-label customization available"],
    shortDescription: "Dark brown floral-ornamental suspender short Lederhosen for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1022,
    gallery: [
      "/product-media/dark-brown-floral-ornamental-suspender-short-lederhosen/01-hero-front-with-suspenders.webp",
      "/product-media/dark-brown-floral-ornamental-suspender-short-lederhosen/03-angle-back-with-suspenders.webp",
      "/product-media/dark-brown-floral-ornamental-suspender-short-lederhosen/04-front-embroidery-detail.webp",
      "/product-media/dark-brown-floral-ornamental-suspender-short-lederhosen/05-detail-suspender-panel.webp",
      "/product-media/dark-brown-floral-ornamental-suspender-short-lederhosen/06-front-without-suspender-panel.webp",
    ],
  },
];

function createProduct(product: BatchProduct, categoryId: string): DbProduct {
  return {
    id: `00000000-0000-0000-0000-${String(product.idSuffix).padStart(12, "0")}`,
    category_id: categoryId,
    slug: product.slug,
    name: product.name,
    description: product.description,
    image_url: product.gallery[0] ?? null,
    gallery: product.gallery,
    specs: product.specs,
    details: [],
    material_specifications: null,
    seo_title: `${product.name} Manufacturer | Irha Apparels`,
    seo_description: `${product.name} for wholesale and private-label programs from Irha Apparels, a B2B apparel manufacturer in Sialkot, Pakistan.`,
    sort_order: product.sortOrder,
    is_published: true,
    sku: null,
    is_featured: false,
    short_description: product.shortDescription,
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
    custom_colors: null,
    customization: {},
    packaging_standard: null,
    packaging_custom: null,
    related_product_ids: [],
  };
}

export function createSupplementalBatch03ProductsForSubcategory(
  topCategorySlug: string,
  subSlug: string,
  subName: string,
  categoryId: string,
): DbProduct[] {
  const isMensTrachten =
    topCategorySlug === "bavarian-trachten-wear" &&
    (subSlug === "men" || normalize(subName) === "menstrachten");

  return isMensTrachten ? PRODUCTS.map((product) => createProduct(product, categoryId)) : [];
}
