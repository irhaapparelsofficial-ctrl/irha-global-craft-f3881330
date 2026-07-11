import type { DbProduct } from "@/hooks/useCatalog";

// Verified first-party Drive media: Men's → Leather Pants, remaining exact families.
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
    idSuffix: 94,
    slug: "black-contrast-piped-long-leather-pants",
    name: "Black Contrast-Piped Long Leather Pants",
    description: "Full-length Bavarian-style leather pants in a black colourway with contrast piping, decorative front-pocket construction and coordinated traditional detailing, prepared for wholesale and private-label buyer programs.",
    specs: [
      "Black visual finish",
      "Contrast piping",
      "Decorative front-pocket construction",
      "Full-length silhouette",
      "Private-label customization available",
    ],
    shortDescription: "Black contrast-piped long leather pants for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1028,
    gallery: [
      "/product-media/black-contrast-piped-long-leather-pants/01-hero-front.webp",
      "/product-media/black-contrast-piped-long-leather-pants/04-multi-view-reference.webp",
    ],
  },
  {
    idSuffix: 95,
    slug: "golden-tan-contrast-piped-long-leather-pants",
    name: "Golden Tan Contrast-Piped Long Leather Pants",
    description: "Full-length Bavarian-style leather pants in a golden-tan colourway with contrast piping and coordinated front, side and rear construction views, prepared for wholesale and private-label buyer programs.",
    specs: [
      "Golden-tan visual finish",
      "Contrast piping",
      "Front, side and rear reference views",
      "Full-length silhouette",
      "Private-label customization available",
    ],
    shortDescription: "Golden tan contrast-piped long leather pants for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1029,
    gallery: [
      "/product-media/golden-tan-contrast-piped-long-leather-pants/01-multi-view-reference.webp",
    ],
  },
  {
    idSuffix: 96,
    slug: "dark-brown-contrast-piped-knee-panel-long-leather-pants",
    name: "Dark Brown Contrast-Piped Knee-Panel Long Leather Pants",
    description: "Full-length Bavarian-style leather pants in a dark-brown colourway with contrast piping, shaped knee panels and coordinated traditional detailing, prepared for wholesale and private-label buyer programs.",
    specs: [
      "Dark-brown visual finish",
      "Contrast piping",
      "Shaped knee panels",
      "Front, side and rear reference views",
      "Private-label customization available",
    ],
    shortDescription: "Dark brown contrast-piped knee-panel long leather pants for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1030,
    gallery: [
      "/product-media/dark-brown-contrast-piped-knee-panel-long-leather-pants/01-multi-view-reference.webp",
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

export function createSupplementalBatch05ProductsForSubcategory(
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
