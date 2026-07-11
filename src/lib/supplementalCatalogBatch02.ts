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
    idSuffix: 81,
    slug: "dark-brown-red-embroidered-short-lederhosen",
    name: "Dark Brown Red-Embroidered Short Lederhosen",
    description: "Short-cut Bavarian-style Lederhosen in a dark-brown colourway with red ornamental embroidery, a traditional front flap and adjustable side-tie details, prepared for wholesale and private-label buyer programs.",
    specs: ["Red ornamental embroidery", "Dark-brown visual finish", "Traditional front-flap construction", "Adjustable side-tie detail", "Private-label customization available"],
    shortDescription: "Dark brown red-embroidered short Lederhosen for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1015,
    gallery: [
      "/product-media/dark-brown-red-embroidered-short-lederhosen/01-hero-front.webp",
      "/product-media/dark-brown-red-embroidered-short-lederhosen/03-angle-back.webp",
      "/product-media/dark-brown-red-embroidered-short-lederhosen/04-detail-front-flap.webp",
      "/product-media/dark-brown-red-embroidered-short-lederhosen/05-detail-red-embroidery-side-tie.webp",
    ],
  },
  {
    idSuffix: 82,
    slug: "brown-ornamental-side-tie-short-lederhosen",
    name: "Brown Ornamental Side-Tie Short Lederhosen",
    description: "Short-cut Bavarian-style Lederhosen in a brown colourway with ornamental embroidery, contrast piping and adjustable side-tie details, prepared for wholesale and private-label buyer programs.",
    specs: ["Ornamental embroidery", "Brown visual finish", "Contrast-piping accents", "Adjustable side-tie detail", "Private-label customization available"],
    shortDescription: "Brown ornamental side-tie short Lederhosen for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1016,
    gallery: [
      "/product-media/brown-ornamental-side-tie-short-lederhosen/01-hero-front.webp",
      "/product-media/brown-ornamental-side-tie-short-lederhosen/03-angle-back.webp",
      "/product-media/brown-ornamental-side-tie-short-lederhosen/04-detail-front-flap.webp",
      "/product-media/brown-ornamental-side-tie-short-lederhosen/05-detail-side-embroidery.webp",
    ],
  },
  {
    idSuffix: 83,
    slug: "dark-brown-ivory-floral-short-lederhosen",
    name: "Dark Brown Ivory-Floral Short Lederhosen",
    description: "Short-cut Bavarian-style Lederhosen in a dark-brown colourway with ivory-tone floral embroidery, decorative front-flap construction and side-button details, prepared for wholesale and private-label buyer programs.",
    specs: ["Ivory-tone floral embroidery", "Dark-brown visual finish", "Decorative front-flap construction", "Side-button detail", "Private-label customization available"],
    shortDescription: "Dark brown ivory-floral short Lederhosen for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1017,
    gallery: [
      "/product-media/dark-brown-ivory-floral-short-lederhosen/01-hero-front.webp",
      "/product-media/dark-brown-ivory-floral-short-lederhosen/03-angle-back.webp",
      "/product-media/dark-brown-ivory-floral-short-lederhosen/04-detail-front-ivory-embroidery.webp",
      "/product-media/dark-brown-ivory-floral-short-lederhosen/05-detail-leg-ivory-embroidery.webp",
    ],
  },
  {
    idSuffix: 84,
    slug: "dark-brown-minimal-side-embroidered-short-lederhosen",
    name: "Dark Brown Minimal Side-Embroidered Short Lederhosen",
    description: "Short-cut Bavarian-style Lederhosen in a dark-brown colourway with restrained side embroidery and clean front construction, prepared for wholesale and private-label buyer programs.",
    specs: ["Restrained side embroidery", "Dark-brown visual finish", "Clean front construction", "Side-tie detail", "Private-label customization available"],
    shortDescription: "Dark brown minimal side-embroidered short Lederhosen for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1018,
    gallery: [
      "/product-media/dark-brown-minimal-side-embroidered-short-lederhosen/01-hero-front.webp",
      "/product-media/dark-brown-minimal-side-embroidered-short-lederhosen/04-detail-upper-construction.webp",
      "/product-media/dark-brown-minimal-side-embroidered-short-lederhosen/05-detail-side-embroidery.webp",
    ],
  },
  {
    idSuffix: 85,
    slug: "brown-green-floral-embroidered-short-lederhosen",
    name: "Brown Green-Floral Embroidered Short Lederhosen",
    description: "Short-cut Bavarian-style Lederhosen in a brown colourway with green-tone floral embroidery, contrast piping and decorative side-button details, prepared for wholesale and private-label buyer programs.",
    specs: ["Green-tone floral embroidery", "Brown visual finish", "Contrast-piping accents", "Decorative side-button detail", "Private-label customization available"],
    shortDescription: "Brown green-floral embroidered short Lederhosen for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1019,
    gallery: [
      "/product-media/brown-green-floral-embroidered-short-lederhosen/01-hero-front.webp",
      "/product-media/brown-green-floral-embroidered-short-lederhosen/03-angle-back.webp",
      "/product-media/brown-green-floral-embroidered-short-lederhosen/04-detail-front-green-embroidery.webp",
      "/product-media/brown-green-floral-embroidered-short-lederhosen/05-detail-leg-green-embroidery.webp",
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

export function createSupplementalBatch02ProductsForSubcategory(
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
