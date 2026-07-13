import type { DbProduct } from "@/hooks/useCatalog";

// Visually verified first-party Drive media: Women's → Janker.
const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

type ProductSeed = {
  id: number;
  slug: string;
  name: string;
  visual: string;
  features: string[];
  sort: number;
  gallery: string[];
};

const PRODUCTS: ProductSeed[] = [
  {
    id: 920001,
    slug: "long-grey-olive-trim-janker-coat",
    name: "Long Grey Olive-Trim Janker Coat",
    visual: "long grey with olive contrast trim",
    features: ["Long tailored silhouette", "Olive contrast collar and pocket trim", "Decorative button-front construction"],
    sort: 1320,
    gallery: [
      "/media/bavarian-drive/assets/women-janker/review-only/traditional-costumes-janker-0.webp",
    ],
  },
  {
    id: 920002,
    slug: "grey-magenta-lined-janker-coat",
    name: "Grey Magenta-Lined Janker Coat",
    visual: "grey with olive and magenta contrast details",
    features: ["Long tailored silhouette", "Olive contrast collar", "Magenta lining and accent details"],
    sort: 1321,
    gallery: [
      "/media/bavarian-drive/assets/women-janker/review-only/traditional-costumes-janker-6.webp",
      "/media/bavarian-drive/assets/women-janker/review-only/traditional-costumes-janker-7.webp",
    ],
  },
  {
    id: 920003,
    slug: "beige-square-neck-cropped-trachten-jacket",
    name: "Beige Square-Neck Cropped Trachten Jacket",
    visual: "warm beige cropped profile",
    features: ["Square-neck front shaping", "Cropped fitted silhouette", "Decorative multi-button front"],
    sort: 1322,
    gallery: [
      "/media/bavarian-drive/assets/women-janker/review-only/traditional-costumes-janker-9.webp",
      "/media/bavarian-drive/assets/women-janker/review-only/traditional-costumes-janker-10.webp",
    ],
  },
  {
    id: 920004,
    slug: "charcoal-green-trim-layered-trachten-blazer",
    name: "Charcoal Green-Trim Layered Trachten Blazer",
    visual: "charcoal with green and red contrast detailing",
    features: ["Layered asymmetric hem", "Green contrast trim", "Red decorative stitch accents"],
    sort: 1323,
    gallery: [
      "/media/bavarian-drive/assets/women-janker/review-only/traditional-costumes-janker-11.webp",
      "/media/bavarian-drive/assets/women-janker/review-only/traditional-costumes-janker-13.webp",
    ],
  },
  {
    id: 920005,
    slug: "cream-lace-panel-fitted-janker",
    name: "Cream Lace-Panel Fitted Janker",
    visual: "soft cream fitted profile",
    features: ["Decorative lace-pattern side panels", "Fitted shaped construction", "Contrast edging and decorative buttons"],
    sort: 1324,
    gallery: [
      "/media/bavarian-drive/assets/women-janker/review-only/traditional-costumes-janker-14.webp",
      "/media/bavarian-drive/assets/women-janker/review-only/traditional-costumes-janker-15.webp",
      "/media/bavarian-drive/assets/women-janker/review-only/traditional-costumes-janker-16.webp",
    ],
  },
  {
    id: 920006,
    slug: "grey-olive-piped-classic-janker",
    name: "Grey Olive-Piped Classic Janker",
    visual: "classic grey with olive piping",
    features: ["Short classic Janker silhouette", "Olive piping and collar trim", "Decorative button-front construction"],
    sort: 1325,
    gallery: [
      "/media/bavarian-drive/assets/women-janker/review-only/traditional-costumes-janker-18.webp",
      "/media/bavarian-drive/assets/women-janker/review-only/traditional-costumes-janker-19.webp",
    ],
  },
];

function createProduct(product: ProductSeed, categoryId: string): DbProduct {
  return {
    id: `00000000-0000-0000-0000-${String(product.id).padStart(12, "0")}`,
    category_id: categoryId,
    slug: product.slug,
    name: product.name,
    description: `${product.name} in a ${product.visual} visual finish with ${product.features.join(", ").toLowerCase()}, prepared for wholesale, OEM and private-label Trachten outerwear programs.`,
    image_url: product.gallery[0] ?? null,
    gallery: product.gallery,
    specs: [
      `${product.visual[0].toUpperCase()}${product.visual.slice(1)} visual finish`,
      ...product.features,
      "Buyer-specified material, lining, trim and size grading available",
      "Private-label customization available",
    ],
    details: [],
    material_specifications: null,
    seo_title: `${product.name} Manufacturer | Irha Apparels`,
    seo_description: `${product.name} for wholesale, OEM and private-label women's Janker and Trachten jacket programs from Irha Apparels, a B2B apparel manufacturer in Sialkot, Pakistan.`,
    sort_order: product.sort,
    is_published: true,
    sku: null,
    is_featured: false,
    short_description: `${product.name} for wholesale, OEM, ODM and private-label Trachten outerwear programs.`,
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

export function createSupplementalBatch16ProductsForSubcategory(
  topCategorySlug: string,
  subSlug: string,
  subName: string,
  categoryId: string,
): DbProduct[] {
  const normalizedSubName = normalize(subName);
  const isWomensTrachten =
    topCategorySlug === "bavarian-trachten-wear" &&
    (subSlug === "women" || normalizedSubName.includes("women"));

  return isWomensTrachten ? PRODUCTS.map((product) => createProduct(product, categoryId)) : [];
}
