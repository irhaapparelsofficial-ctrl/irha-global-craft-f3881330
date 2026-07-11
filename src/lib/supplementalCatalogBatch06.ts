import type { DbProduct } from "@/hooks/useCatalog";

// Verified first-party Drive media: Men's → Shirts → Shirts, batch 01.
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
    idSuffix: 97,
    slug: "classic-blue-micro-check-trachten-shirt",
    name: "Classic Blue Micro-Check Trachten Shirt",
    description: "Long-sleeve Trachten-style shirt in a classic blue micro-check pattern with a clean button-front profile, prepared for wholesale and private-label buyer programs.",
    specs: [
      "Classic blue micro-check pattern",
      "Long-sleeve construction",
      "Button-front styling",
      "Clean pointed collar",
      "Private-label customization available",
    ],
    shortDescription: "Classic blue micro-check Trachten shirt for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1031,
    gallery: [
      "/product-media/classic-blue-micro-check-trachten-shirt/01-hero-front.webp",
    ],
  },
  {
    idSuffix: 98,
    slug: "blue-dual-check-trachten-shirt",
    name: "Blue Dual-Check Trachten Shirt",
    description: "Long-sleeve Trachten-style shirt in a blue dual-scale check pattern with a shaped hem and clean button-front construction, prepared for wholesale and private-label buyer programs.",
    specs: [
      "Blue dual-scale check pattern",
      "Long-sleeve construction",
      "Button-front styling",
      "Shaped hem profile",
      "Private-label customization available",
    ],
    shortDescription: "Blue dual-check Trachten shirt for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1032,
    gallery: [
      "/product-media/blue-dual-check-trachten-shirt/01-hero-front.webp",
    ],
  },
  {
    idSuffix: 99,
    slug: "navy-large-gingham-trachten-shirt",
    name: "Navy Large-Gingham Trachten Shirt",
    description: "Long-sleeve Trachten-style shirt in a navy large-gingham pattern with clean front construction and a pointed collar, prepared for wholesale and private-label buyer programs.",
    specs: [
      "Navy large-gingham pattern",
      "Long-sleeve construction",
      "Button-front styling",
      "Pointed collar",
      "Private-label customization available",
    ],
    shortDescription: "Navy large-gingham Trachten shirt for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1033,
    gallery: [
      "/product-media/navy-large-gingham-trachten-shirt/01-hero-front.webp",
    ],
  },
  {
    idSuffix: 100,
    slug: "bright-green-micro-check-trachten-shirt",
    name: "Bright Green Micro-Check Trachten Shirt",
    description: "Long-sleeve Trachten-style shirt in a bright green micro-check pattern with a clean button-front profile, prepared for wholesale and private-label buyer programs.",
    specs: [
      "Bright green micro-check pattern",
      "Long-sleeve construction",
      "Button-front styling",
      "Clean pointed collar",
      "Private-label customization available",
    ],
    shortDescription: "Bright green micro-check Trachten shirt for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1034,
    gallery: [
      "/product-media/bright-green-micro-check-trachten-shirt/01-hero-front.webp",
    ],
  },
  {
    idSuffix: 101,
    slug: "forest-green-gingham-trachten-shirt",
    name: "Forest Green Gingham Trachten Shirt",
    description: "Long-sleeve Trachten-style shirt in a forest-green gingham pattern with a shaped silhouette and clean button-front construction, prepared for wholesale and private-label buyer programs.",
    specs: [
      "Forest-green gingham pattern",
      "Long-sleeve construction",
      "Button-front styling",
      "Shaped silhouette",
      "Private-label customization available",
    ],
    shortDescription: "Forest green gingham Trachten shirt for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1035,
    gallery: [
      "/product-media/forest-green-gingham-trachten-shirt/01-hero-front.webp",
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

export function createSupplementalBatch06ProductsForSubcategory(
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
