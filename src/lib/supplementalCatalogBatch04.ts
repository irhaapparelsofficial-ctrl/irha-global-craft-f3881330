import type { DbProduct } from "@/hooks/useCatalog";

// Verified first-party Drive media: Men's → Leather Pants, batch 01.
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
    idSuffix: 89,
    slug: "black-floral-piped-long-leather-pants",
    name: "Black Floral-Piped Long Leather Pants",
    description: "Full-length Bavarian-style leather pants in a black colourway with subtle floral embroidery, contrast piping and clean straight-leg construction, prepared for wholesale and private-label buyer programs.",
    specs: [
      "Black visual finish",
      "Subtle floral embroidery",
      "Contrast piping detail",
      "Straight-leg silhouette",
      "Private-label customization available",
    ],
    shortDescription: "Black floral-piped long leather pants for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1023,
    gallery: [
      "/product-media/black-floral-piped-long-leather-pants/01-hero-front.webp",
      "/product-media/black-floral-piped-long-leather-pants/03-angle-back.webp",
    ],
  },
  {
    idSuffix: 90,
    slug: "tan-floral-embroidered-long-leather-pants",
    name: "Tan Floral-Embroidered Long Leather Pants",
    description: "Full-length Bavarian-style leather pants in a tan colourway with floral pocket embroidery, side buckle detailing and a clean straight-leg profile, prepared for wholesale and private-label buyer programs.",
    specs: [
      "Tan visual finish",
      "Floral pocket embroidery",
      "Side buckle detailing",
      "Straight-leg silhouette",
      "Private-label customization available",
    ],
    shortDescription: "Tan floral-embroidered long leather pants for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1024,
    gallery: [
      "/product-media/tan-floral-embroidered-long-leather-pants/01-hero-front.webp",
      "/product-media/tan-floral-embroidered-long-leather-pants/03-angle-back.webp",
    ],
  },
  {
    idSuffix: 91,
    slug: "distressed-brown-side-button-long-leather-pants",
    name: "Distressed Brown Side-Button Long Leather Pants",
    description: "Full-length Bavarian-style leather pants in a distressed-brown colourway with side-button construction, subtle pocket embroidery and visible panel detailing, prepared for wholesale and private-label buyer programs.",
    specs: [
      "Distressed-brown visual finish",
      "Side-button construction",
      "Subtle pocket embroidery",
      "Panelled straight-leg design",
      "Private-label customization available",
    ],
    shortDescription: "Distressed brown side-button long leather pants for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1025,
    gallery: [
      "/product-media/distressed-brown-side-button-long-leather-pants/01-hero-front.webp",
      "/product-media/distressed-brown-side-button-long-leather-pants/03-angle-back.webp",
      "/product-media/distressed-brown-side-button-long-leather-pants/04-detail-pocket-embroidery.webp",
    ],
  },
  {
    idSuffix: 92,
    slug: "dark-brown-panelled-long-leather-pants",
    name: "Dark Brown Panelled Long Leather Pants",
    description: "Full-length Bavarian-style leather pants in a dark-brown colourway with clean panelled construction and a straight-leg profile, prepared for wholesale and private-label buyer programs.",
    specs: [
      "Dark-brown visual finish",
      "Clean panelled construction",
      "Straight-leg silhouette",
      "Front and rear product views",
      "Private-label customization available",
    ],
    shortDescription: "Dark brown panelled long leather pants for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1026,
    gallery: [
      "/product-media/dark-brown-panelled-long-leather-pants/01-hero-front.webp",
      "/product-media/dark-brown-panelled-long-leather-pants/03-angle-back.webp",
    ],
  },
  {
    idSuffix: 93,
    slug: "golden-tan-straight-leg-long-leather-pants",
    name: "Golden Tan Straight-Leg Long Leather Pants",
    description: "Full-length Bavarian-style leather pants in a golden-tan colourway with restrained detailing and a clean straight-leg silhouette, prepared for wholesale and private-label buyer programs.",
    specs: [
      "Golden-tan visual finish",
      "Restrained traditional detailing",
      "Clean front construction",
      "Straight-leg silhouette",
      "Private-label customization available",
    ],
    shortDescription: "Golden tan straight-leg long leather pants for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1027,
    gallery: [
      "/product-media/golden-tan-straight-leg-long-leather-pants/01-hero-front.webp",
      "/product-media/golden-tan-straight-leg-long-leather-pants/03-angle-back.webp",
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

export function createSupplementalBatch04ProductsForSubcategory(
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
