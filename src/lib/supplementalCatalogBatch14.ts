import type { DbProduct } from "@/hooks/useCatalog";

// Visually verified first-party Drive media: Children → Kids Lederhosen.
const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

type ProductSeed = {
  id: number;
  slug: string;
  name: string;
  visual: string;
  features: string[];
  sort: number;
  image: string;
};

const PRODUCTS: ProductSeed[] = [
  {
    id: 154,
    slug: "brown-deer-embroidered-kids-lederhosen",
    name: "Brown Deer-Embroidered Kids Lederhosen",
    visual: "warm brown",
    features: ["Deer and floral embroidery", "Heart-shaped bib pockets", "Adjustable suspender construction"],
    sort: 1120,
    image: "/media/products/kids-lederhosen/brown-deer-embroidered-kids-lederhosen.webp",
  },
  {
    id: 155,
    slug: "classic-brown-lace-up-kids-lederhosen",
    name: "Classic Brown Lace-Up Kids Lederhosen",
    visual: "classic brown",
    features: ["Traditional lace-up front", "Clean knee panels", "Adjustable suspender construction"],
    sort: 1121,
    image: "/media/products/kids-lederhosen/classic-brown-lace-up-kids-lederhosen.webp",
  },
  {
    id: 156,
    slug: "black-floral-embroidered-kids-lederhosen",
    name: "Black Floral-Embroidered Kids Lederhosen",
    visual: "dark black",
    features: ["Colourful floral embroidery", "Decorative bib panel", "Adjustable suspender construction"],
    sort: 1122,
    image: "/media/products/kids-lederhosen/black-floral-embroidered-kids-lederhosen.webp",
  },
  {
    id: 157,
    slug: "tan-red-lace-side-kids-lederhosen",
    name: "Tan Red-Lace Side Kids Lederhosen",
    visual: "warm tan",
    features: ["Red contrast side lacing", "Decorative bib panel", "Adjustable suspender construction"],
    sort: 1123,
    image: "/media/products/kids-lederhosen/tan-red-lace-side-kids-lederhosen.webp",
  },
  {
    id: 158,
    slug: "tan-heart-embroidered-kids-lederhosen",
    name: "Tan Heart-Embroidered Kids Lederhosen",
    visual: "light tan",
    features: ["Heart-themed embroidery", "Red contrast trim", "Adjustable suspender construction"],
    sort: 1124,
    image: "/media/products/kids-lederhosen/tan-heart-embroidered-kids-lederhosen.webp",
  },
];

function createProduct(product: ProductSeed, categoryId: string): DbProduct {
  return {
    id: `00000000-0000-0000-0000-${String(product.id).padStart(12, "0")}`,
    category_id: categoryId,
    slug: product.slug,
    name: product.name,
    description: `${product.name} in a ${product.visual} visual finish with ${product.features.join(", ").toLowerCase()}, prepared for wholesale and private-label childrenswear programs.`,
    image_url: product.image,
    gallery: [product.image],
    specs: [
      `${product.visual[0].toUpperCase()}${product.visual.slice(1)} visual finish`,
      ...product.features,
      "Buyer-specified fabric, trim, embroidery and size grading available",
      "Private-label customization available",
    ],
    details: [],
    material_specifications: null,
    seo_title: `${product.name} Manufacturer | Irha Apparels`,
    seo_description: `${product.name} for wholesale, OEM and private-label Kids Lederhosen programs from Irha Apparels, a B2B apparel manufacturer in Sialkot, Pakistan.`,
    sort_order: product.sort,
    is_published: true,
    sku: null,
    is_featured: false,
    short_description: `${product.name} for wholesale, OEM, ODM and private-label childrenswear programs.`,
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
    custom_colors: true,
    customization: {},
    packaging_standard: null,
    packaging_custom: null,
    related_product_ids: [],
  };
}

export function createSupplementalBatch14ProductsForSubcategory(
  topCategorySlug: string,
  subSlug: string,
  subName: string,
  categoryId: string,
): DbProduct[] {
  const normalizedSubName = normalize(subName);
  const isKidsTrachten =
    topCategorySlug === "bavarian-trachten-wear" &&
    (subSlug === "kids" || subSlug === "children" || normalizedSubName.includes("kids") || normalizedSubName.includes("children"));

  return isKidsTrachten ? PRODUCTS.map((product) => createProduct(product, categoryId)) : [];
}
