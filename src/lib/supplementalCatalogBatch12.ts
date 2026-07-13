import type { DbProduct } from "@/hooks/useCatalog";

// Visually verified first-party Drive media: Women's → Dirndl, batch 01.
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
    id: 141,
    slug: "navy-gingham-floral-trim-dirndl-dress",
    name: "Navy Gingham Floral-Trim Dirndl Dress",
    visual: "navy and white gingham",
    features: ["Pink floral trim", "Lace-up bodice", "Coordinated navy apron and sash"],
    sort: 1100,
    image: "/media/bavarian-drive/assets/women-dirndl/traditional-dirndl-dress/01-1200x1200.webp",
  },
  {
    id: 142,
    slug: "black-burgundy-floral-apron-dirndl-dress",
    name: "Black Burgundy Floral-Apron Dirndl Dress",
    visual: "black and burgundy",
    features: ["Burgundy micro-floral apron", "Contrast burgundy lacing", "Sleeveless square-neck bodice"],
    sort: 1101,
    image: "/media/bavarian-drive/assets/women-dirndl/traditional-dirndl-dress/02-1200x1200.webp",
  },
  {
    id: 143,
    slug: "fuchsia-green-gingham-dirndl-dress",
    name: "Fuchsia Green-Trim Gingham Dirndl Dress",
    visual: "fuchsia, green and gingham",
    features: ["Green contrast trim and sash", "Decorative front lacing", "Coordinated gingham skirt panel"],
    sort: 1102,
    image: "/media/bavarian-drive/assets/women-dirndl/traditional-dirndl-dress/04-1200x1200.webp",
  },
  {
    id: 144,
    slug: "black-turquoise-embroidered-dirndl-dress",
    name: "Black Turquoise-Embroidered Dirndl Dress",
    visual: "black and turquoise",
    features: ["Turquoise floral-style embroidery", "Contrast bodice lacing", "Coordinated satin-look apron and sash"],
    sort: 1103,
    image: "/media/bavarian-drive/assets/women-dirndl/traditional-dirndl-dress/05-1200x1200.webp",
  },
  {
    id: 145,
    slug: "monochrome-black-lace-up-dirndl-dress",
    name: "Monochrome Black Lace-Up Dirndl Dress",
    visual: "monochrome black",
    features: ["Black ribbon lacing", "Clean full-skirt silhouette", "Coordinated white puff-sleeve blouse"],
    sort: 1104,
    image: "/media/bavarian-drive/assets/women-dirndl/traditional-dirndl-dress/08-1200x1200.webp",
  },
];

function createProduct(product: ProductSeed, categoryId: string): DbProduct {
  const gallery = [product.image];
  return {
    id: `00000000-0000-0000-0000-${String(product.id).padStart(12, "0")}`,
    category_id: categoryId,
    slug: product.slug,
    name: product.name,
    description: `${product.name} in a ${product.visual} visual finish with ${product.features.join(", ").toLowerCase()}, prepared for wholesale and private-label buyer programs.`,
    image_url: product.image,
    gallery,
    specs: [
      `${product.visual[0].toUpperCase()}${product.visual.slice(1)} visual finish`,
      ...product.features,
      "Buyer-specified colours, trims and branding available",
      "Private-label customization available",
    ],
    details: [],
    material_specifications: null,
    seo_title: `${product.name} Manufacturer | Irha Apparels`,
    seo_description: `${product.name} for wholesale, OEM and private-label Dirndl programs from Irha Apparels, a B2B apparel manufacturer in Sialkot, Pakistan.`,
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
    custom_colors: true,
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
    (subSlug === "women" || normalize(subName).includes("women"));

  return isWomensTrachten ? PRODUCTS.map((product) => createProduct(product, categoryId)) : [];
}
