import type { DbProduct } from "@/hooks/useCatalog";

// Verified first-party Drive media: Men's → Shirts → Shirts, batch 03.
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
    idSuffix: 107,
    slug: "olive-green-micro-gingham-pocket-trachten-shirt",
    name: "Olive Green Micro-Gingham Pocket Trachten Shirt",
    description: "Trachten-style shirt in an olive-green micro-gingham pattern with visible chest-pocket construction and clean button-front styling, prepared for wholesale and private-label buyer programs.",
    specs: [
      "Olive-green micro-gingham pattern",
      "Chest-pocket construction",
      "Button-front styling",
      "Classic pointed collar",
      "Private-label customization available",
    ],
    shortDescription: "Olive green micro-gingham pocket Trachten shirt for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1041,
    gallery: [
      "/product-media/olive-green-micro-gingham-pocket-trachten-shirt/01-hero-folded-front.webp",
    ],
  },
  {
    idSuffix: 108,
    slug: "lime-green-micro-gingham-pocket-trachten-shirt",
    name: "Lime Green Micro-Gingham Pocket Trachten Shirt",
    description: "Trachten-style shirt in a lime-green micro-gingham pattern with a visible chest pocket and clean button-front construction, prepared for wholesale and private-label buyer programs.",
    specs: [
      "Lime-green micro-gingham pattern",
      "Chest-pocket construction",
      "Button-front styling",
      "Classic pointed collar",
      "Private-label customization available",
    ],
    shortDescription: "Lime green micro-gingham pocket Trachten shirt for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1042,
    gallery: [
      "/product-media/lime-green-micro-gingham-pocket-trachten-shirt/01-hero-folded-front.webp",
    ],
  },
  {
    idSuffix: 109,
    slug: "black-white-micro-gingham-pocket-trachten-shirt",
    name: "Black-and-White Micro-Gingham Pocket Trachten Shirt",
    description: "Trachten-style shirt in a black-and-white micro-gingham pattern with a visible chest pocket and coordinated button-front detailing, prepared for wholesale and private-label buyer programs.",
    specs: [
      "Black-and-white micro-gingham pattern",
      "Chest-pocket construction",
      "Button-front styling",
      "Classic pointed collar",
      "Private-label customization available",
    ],
    shortDescription: "Black-and-white micro-gingham pocket Trachten shirt for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1043,
    gallery: [
      "/product-media/black-white-micro-gingham-pocket-trachten-shirt/01-hero-folded-front.webp",
    ],
  },
  {
    idSuffix: 110,
    slug: "sky-blue-micro-gingham-trachten-shirt",
    name: "Sky Blue Micro-Gingham Trachten Shirt",
    description: "Long-sleeve Trachten-style shirt in a sky-blue micro-gingham pattern with a clean button-front profile and pointed collar, prepared for wholesale and private-label buyer programs.",
    specs: [
      "Sky-blue micro-gingham pattern",
      "Long-sleeve construction",
      "Button-front styling",
      "Pointed collar",
      "Private-label customization available",
    ],
    shortDescription: "Sky blue micro-gingham Trachten shirt for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1044,
    gallery: [
      "/product-media/sky-blue-micro-gingham-trachten-shirt/01-hero-folded-front.webp",
    ],
  },
  {
    idSuffix: 111,
    slug: "white-band-collar-trachten-shirt",
    name: "White Band-Collar Trachten Shirt",
    description: "White Trachten-style shirt with a clean band collar, decorative button-front detailing and a restrained traditional profile, prepared for wholesale and private-label buyer programs.",
    specs: [
      "White visual finish",
      "Band-collar construction",
      "Decorative button-front detail",
      "Restrained traditional styling",
      "Private-label customization available",
    ],
    shortDescription: "White band-collar Trachten shirt for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1045,
    gallery: [
      "/product-media/white-band-collar-trachten-shirt/01-hero-folded-front.webp",
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

export function createSupplementalBatch08ProductsForSubcategory(
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
