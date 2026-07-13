import type { DbProduct } from "@/hooks/useCatalog";

// Verified first-party Drive media: Women's → Dirndl, balanced catalog batch 12.
const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

type ProductSeed = {
  id: number;
  slug: string;
  name: string;
  sort: number;
  visual: string;
  features: string[];
  gallery: string[];
};

const PRODUCTS: ProductSeed[] = [
  {
    id: 141,
    slug: "black-monochrome-dirndl",
    name: "Black Monochrome Dirndl",
    sort: 1100,
    visual: "black monochrome",
    features: ["Coordinated bodice and apron", "Traditional-inspired Dirndl silhouette", "Clean product presentation"],
    gallery: ["/product-media/black-monochrome-dirndl/01-hero-front.svg"],
  },
  {
    id: 142,
    slug: "navy-check-apron-dirndl",
    name: "Navy Check Apron Dirndl",
    sort: 1101,
    visual: "navy and white check",
    features: ["Navy contrast apron", "Traditional-inspired bodice construction", "Coordinated skirt presentation"],
    gallery: ["/product-media/navy-check-apron-dirndl/01-hero-front.svg"],
  },
  {
    id: 143,
    slug: "black-sky-blue-apron-dirndl",
    name: "Black Sky-Blue Apron Dirndl",
    sort: 1102,
    visual: "black with sky-blue accents",
    features: ["Sky-blue contrast apron", "Decorative bodice front", "Traditional-inspired Dirndl silhouette"],
    gallery: ["/product-media/black-sky-blue-apron-dirndl/01-hero-front.svg"],
  },
  {
    id: 144,
    slug: "red-check-apron-dirndl",
    name: "Red Check Apron Dirndl",
    sort: 1103,
    visual: "red check",
    features: ["Coordinated red apron", "Decorative bodice front", "Traditional-inspired Dirndl silhouette"],
    gallery: ["/product-media/red-check-apron-dirndl/01-hero-front.svg"],
  },
];

function createProduct(product: ProductSeed, categoryId: string): DbProduct {
  return {
    id: `00000000-0000-0000-0000-${String(product.id).padStart(12, "0")}`,
    category_id: categoryId,
    slug: product.slug,
    name: product.name,
    description: `${product.name} in a ${product.visual} visual finish with ${product.features.join(", ").toLowerCase()}, prepared for wholesale and private-label buyer programs.`,
    image_url: product.gallery[0] ?? null,
    gallery: product.gallery,
    specs: [
      `${product.visual[0].toUpperCase()}${product.visual.slice(1)} visual finish`,
      ...product.features,
      "Private-label customization available",
    ],
    details: [],
    material_specifications: null,
    seo_title: `${product.name} Manufacturer | Irha Apparels`,
    seo_description: `${product.name} for wholesale and private-label programs from Irha Apparels, a B2B apparel manufacturer in Sialkot, Pakistan.`,
    sort_order: product.sort,
    is_published: true,
    sku: null,
    is_featured: false,
    short_description: `${product.name} for wholesale, OEM, ODM and private-label Dirndl programs.`,
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

export function createSupplementalBatch12ProductsForSubcategory(
  topCategorySlug: string,
  subSlug: string,
  subName: string,
  categoryId: string,
): DbProduct[] {
  const isWomensTrachten =
    topCategorySlug === "bavarian-trachten-wear" &&
    (subSlug === "women" || normalize(subName) === "womenstrachten");

  return isWomensTrachten ? PRODUCTS.map((product) => createProduct(product, categoryId)) : [];
}
