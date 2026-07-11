import type { DbProduct } from "@/hooks/useCatalog";

// Verified first-party Drive media: Men's → Shirts → Shirts, batch 02.
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
    idSuffix: 102,
    slug: "red-large-gingham-trachten-shirt",
    name: "Red Large-Gingham Trachten Shirt",
    description: "Long-sleeve Trachten-style shirt in a red large-gingham pattern with a clean button-front profile and pointed collar, prepared for wholesale and private-label buyer programs.",
    specs: [
      "Red large-gingham pattern",
      "Long-sleeve construction",
      "Button-front styling",
      "Pointed collar",
      "Private-label customization available",
    ],
    shortDescription: "Red large-gingham Trachten shirt for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1036,
    gallery: [
      "/product-media/red-large-gingham-trachten-shirt/01-hero-front.webp",
    ],
  },
  {
    idSuffix: 103,
    slug: "red-micro-check-trachten-shirt",
    name: "Red Micro-Check Trachten Shirt",
    description: "Long-sleeve Trachten-style shirt in a red micro-check pattern with a shaped silhouette and clean button-front construction, prepared for wholesale and private-label buyer programs.",
    specs: [
      "Red micro-check pattern",
      "Long-sleeve construction",
      "Button-front styling",
      "Shaped silhouette",
      "Private-label customization available",
    ],
    shortDescription: "Red micro-check Trachten shirt for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1037,
    gallery: [
      "/product-media/red-micro-check-trachten-shirt/01-hero-front.webp",
    ],
  },
  {
    idSuffix: 104,
    slug: "rose-micro-gingham-trachten-shirt",
    name: "Rose Micro-Gingham Trachten Shirt",
    description: "Long-sleeve Trachten-style shirt in a rose micro-gingham pattern with contrast inner-collar detailing and clean button-front construction, prepared for wholesale and private-label buyer programs.",
    specs: [
      "Rose micro-gingham pattern",
      "Long-sleeve construction",
      "Contrast inner-collar detail",
      "Button-front styling",
      "Private-label customization available",
    ],
    shortDescription: "Rose micro-gingham Trachten shirt for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1038,
    gallery: [
      "/product-media/rose-micro-gingham-trachten-shirt/01-hero-front.webp",
    ],
  },
  {
    idSuffix: 105,
    slug: "light-blue-micro-gingham-trachten-shirt",
    name: "Light Blue Micro-Gingham Trachten Shirt",
    description: "Long-sleeve Trachten-style shirt in a light-blue micro-gingham pattern with a clean button-front profile and pointed collar, prepared for wholesale and private-label buyer programs.",
    specs: [
      "Light-blue micro-gingham pattern",
      "Long-sleeve construction",
      "Button-front styling",
      "Pointed collar",
      "Private-label customization available",
    ],
    shortDescription: "Light blue micro-gingham Trachten shirt for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1039,
    gallery: [
      "/product-media/light-blue-micro-gingham-trachten-shirt/01-hero-front.webp",
    ],
  },
  {
    idSuffix: 106,
    slug: "burgundy-micro-gingham-pocket-trachten-shirt",
    name: "Burgundy Micro-Gingham Pocket Trachten Shirt",
    description: "Trachten-style shirt in a burgundy micro-gingham pattern with a visible chest pocket, button-front construction and roll-tab sleeve detailing, prepared for wholesale and private-label buyer programs.",
    specs: [
      "Burgundy micro-gingham pattern",
      "Chest-pocket construction",
      "Button-front styling",
      "Roll-tab sleeve detail",
      "Private-label customization available",
    ],
    shortDescription: "Burgundy micro-gingham pocket Trachten shirt for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1040,
    gallery: [
      "/product-media/burgundy-micro-gingham-pocket-trachten-shirt/01-hero-folded-front.webp",
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

export function createSupplementalBatch07ProductsForSubcategory(
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
