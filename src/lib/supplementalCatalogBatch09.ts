import type { DbProduct } from "@/hooks/useCatalog";

// Verified first-party Drive media: Men's → Shirts → Shirts, batch 04.
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
    idSuffix: 112,
    slug: "white-tie-neck-trachten-shirt",
    name: "White Tie-Neck Trachten Shirt",
    description: "White Trachten-style shirt with a soft band collar, tie-neck opening and decorative button-front detailing, prepared for wholesale and private-label buyer programs.",
    specs: [
      "White visual finish",
      "Tie-neck opening",
      "Soft band-collar construction",
      "Decorative button-front detail",
      "Private-label customization available",
    ],
    shortDescription: "White tie-neck Trachten shirt for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1046,
    gallery: [
      "/product-media/white-tie-neck-trachten-shirt/01-hero-folded-front.webp",
    ],
  },
  {
    idSuffix: 113,
    slug: "white-stand-collar-trachten-shirt",
    name: "White Stand-Collar Trachten Shirt",
    description: "White long-sleeve Trachten-style shirt with a structured stand collar, clean button-front construction and restrained traditional detailing, prepared for wholesale and private-label buyer programs.",
    specs: [
      "White visual finish",
      "Structured stand collar",
      "Long-sleeve construction",
      "Decorative button-front detail",
      "Private-label customization available",
    ],
    shortDescription: "White stand-collar Trachten shirt for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1047,
    gallery: [
      "/product-media/white-stand-collar-trachten-shirt/01-hero-folded-front.webp",
    ],
  },
  {
    idSuffix: 114,
    slug: "white-point-collar-pintuck-trachten-shirt",
    name: "White Point-Collar Pintuck Trachten Shirt",
    description: "White Trachten-style shirt with a classic pointed collar, vertical pintuck-style front detailing and decorative buttons, prepared for wholesale and private-label buyer programs.",
    specs: [
      "White visual finish",
      "Classic pointed collar",
      "Vertical pintuck-style front detail",
      "Decorative button-front construction",
      "Private-label customization available",
    ],
    shortDescription: "White point-collar pintuck Trachten shirt for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1048,
    gallery: [
      "/product-media/white-point-collar-pintuck-trachten-shirt/01-hero-folded-front.webp",
    ],
  },
  {
    idSuffix: 115,
    slug: "white-classic-point-collar-trachten-shirt",
    name: "White Classic Point-Collar Trachten Shirt",
    description: "White Trachten-style shirt with a clean pointed collar, restrained front-panel detailing and decorative buttons, prepared for wholesale and private-label buyer programs.",
    specs: [
      "White visual finish",
      "Classic pointed collar",
      "Clean front-panel construction",
      "Decorative button-front detail",
      "Private-label customization available",
    ],
    shortDescription: "White classic point-collar Trachten shirt for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1049,
    gallery: [
      "/product-media/white-classic-point-collar-trachten-shirt/01-hero-folded-front.webp",
    ],
  },
  {
    idSuffix: 116,
    slug: "white-green-trim-trachten-shirt",
    name: "White Green-Trim Trachten Shirt",
    description: "White Trachten-style shirt with green contrast trim at the collar and cuff, decorative stitching and coordinated button-front detailing, prepared for wholesale and private-label buyer programs.",
    specs: [
      "White visual finish",
      "Green contrast collar trim",
      "Green cuff-detail stitching",
      "Decorative button-front construction",
      "Private-label customization available",
    ],
    shortDescription: "White green-trim Trachten shirt for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1050,
    gallery: [
      "/product-media/white-green-trim-trachten-shirt/01-hero-folded-front.webp",
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

export function createSupplementalBatch09ProductsForSubcategory(
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
