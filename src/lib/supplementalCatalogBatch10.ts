import type { DbProduct } from "@/hooks/useCatalog";

// Verified first-party Drive media: Men's → Shirts → Shirts, batch 05.
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
    idSuffix: 117,
    slug: "white-blue-trim-button-down-trachten-shirt",
    name: "White Blue-Trim Button-Down Trachten Shirt",
    description: "White Trachten-style shirt with blue contrast trim at the button-down collar, coordinated front detailing and a visible chest pocket, prepared for wholesale and private-label buyer programs.",
    specs: [
      "White visual finish",
      "Blue contrast collar trim",
      "Button-down collar construction",
      "Visible chest pocket",
      "Private-label customization available",
    ],
    shortDescription: "White blue-trim button-down Trachten shirt for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1051,
    gallery: [
      "/product-media/white-blue-trim-button-down-trachten-shirt/01-hero-folded-front.webp",
    ],
  },
  {
    idSuffix: 118,
    slug: "white-olive-trim-button-down-trachten-shirt",
    name: "White Olive-Trim Button-Down Trachten Shirt",
    description: "White Trachten-style shirt with olive contrast trim at the button-down collar, coordinated front detailing and a visible chest pocket, prepared for wholesale and private-label buyer programs.",
    specs: [
      "White visual finish",
      "Olive contrast collar trim",
      "Button-down collar construction",
      "Visible chest pocket",
      "Private-label customization available",
    ],
    shortDescription: "White olive-trim button-down Trachten shirt for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1052,
    gallery: [
      "/product-media/white-olive-trim-button-down-trachten-shirt/01-hero-folded-front.webp",
    ],
  },
  {
    idSuffix: 119,
    slug: "white-burgundy-trim-button-down-trachten-shirt",
    name: "White Burgundy-Trim Button-Down Trachten Shirt",
    description: "White Trachten-style shirt with burgundy contrast trim at the button-down collar and coordinated decorative front detailing, prepared for wholesale and private-label buyer programs.",
    specs: [
      "White visual finish",
      "Burgundy contrast collar trim",
      "Button-down collar construction",
      "Coordinated decorative front detail",
      "Private-label customization available",
    ],
    shortDescription: "White burgundy-trim button-down Trachten shirt for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1053,
    gallery: [
      "/product-media/white-burgundy-trim-button-down-trachten-shirt/01-hero-folded-front.webp",
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

export function createSupplementalBatch10ProductsForSubcategory(
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
