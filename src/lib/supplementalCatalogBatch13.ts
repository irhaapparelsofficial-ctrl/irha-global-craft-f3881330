import type { DbProduct } from "@/hooks/useCatalog";

// Visually verified first-party Drive media: Women's → Dirndl Blouses.
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
    id: 146,
    slug: "white-drawstring-puff-sleeve-dirndl-blouse",
    name: "White Drawstring Puff-Sleeve Dirndl Blouse",
    visual: "clean white",
    features: ["Adjustable drawstring puff sleeves", "Wide rounded neckline", "Cropped elasticated hem"],
    sort: 1110,
    image: "/media/bavarian-drive/assets/women-dirndl-blouses/dirndl-blouse/dirndl-blouses-white-1.webp",
  },
  {
    id: 147,
    slug: "white-button-front-halter-dirndl-blouse",
    name: "White Button-Front Halter Dirndl Blouse",
    visual: "clean white",
    features: ["Halter-style neckline", "Sweetheart front shaping", "Button-front cropped construction"],
    sort: 1111,
    image: "/media/bavarian-drive/assets/women-dirndl-blouses/dirndl-blouse/dirndl-blouses-white-5.webp",
  },
  {
    id: 148,
    slug: "white-elbow-sleeve-lace-trim-dirndl-blouse",
    name: "White Elbow-Sleeve Lace-Trim Dirndl Blouse",
    visual: "clean white",
    features: ["Elbow-length sleeves", "Fine lace edging", "Cropped elasticated hem"],
    sort: 1112,
    image: "/media/bavarian-drive/assets/women-dirndl-blouses/dirndl-blouse/dirndl-blouses-white-10.webp",
  },
  {
    id: 149,
    slug: "black-long-sleeve-button-front-dirndl-blouse",
    name: "Black Long-Sleeve Button-Front Dirndl Blouse",
    visual: "solid black",
    features: ["Long sleeves", "Button-front bodice", "Sweetheart-inspired neckline"],
    sort: 1113,
    image: "/media/bavarian-drive/assets/women-dirndl-blouses/dirndl-blouse/dirndl-blouses-black-1.webp",
  },
  {
    id: 150,
    slug: "black-lace-cap-sleeve-dirndl-blouse",
    name: "Black Lace Cap-Sleeve Dirndl Blouse",
    visual: "solid black",
    features: ["Decorative lace cap sleeves", "Wide rounded neckline", "Cropped elasticated hem"],
    sort: 1114,
    image: "/media/bavarian-drive/assets/women-dirndl-blouses/dirndl-blouse/dirndl-blouses-black-6.webp",
  },
  {
    id: 151,
    slug: "cream-floral-puff-sleeve-dirndl-blouse",
    name: "Cream Floral Puff-Sleeve Dirndl Blouse",
    visual: "warm cream",
    features: ["Subtle floral pattern", "Short puff sleeves", "Gathered rounded neckline"],
    sort: 1115,
    image: "/media/bavarian-drive/assets/women-dirndl-blouses/dirndl-blouse/dirndl-blouses-cream-1.webp",
  },
];

function createProduct(product: ProductSeed, categoryId: string): DbProduct {
  return {
    id: `00000000-0000-0000-0000-${String(product.id).padStart(12, "0")}`,
    category_id: categoryId,
    slug: product.slug,
    name: product.name,
    description: `${product.name} in a ${product.visual} visual finish with ${product.features.join(", ").toLowerCase()}, prepared for wholesale and private-label buyer programs.`,
    image_url: product.image,
    gallery: [product.image],
    specs: [
      `${product.visual[0].toUpperCase()}${product.visual.slice(1)} visual finish`,
      ...product.features,
      "Buyer-specified fabric, neckline and sleeve options available",
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

export function createSupplementalBatch13ProductsForSubcategory(
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
