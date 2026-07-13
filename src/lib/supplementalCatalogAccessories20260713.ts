import type { DbProduct } from "@/hooks/useCatalog";

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

type ProductSeed = {
  id: number;
  slug: string;
  name: string;
  productType: string;
  features: string[];
  sort: number;
  image: string;
};

const PRODUCTS: ProductSeed[] = [
  {
    id: 910001,
    slug: "alpine-trachten-hat-reference-style-02",
    name: "Alpine Trachten Hat — Reference Style 02",
    productType: "Trachten hat",
    features: ["Traditional Alpine profile", "Decorative hat-band construction", "Buyer-specified trims and branding"],
    sort: 1300,
    image: "/media/bavarian-drive/assets/men-accessories/review-only/hats-1.webp",
  },
  {
    id: 910002,
    slug: "bavarian-leather-belt-reference-style-02",
    name: "Bavarian Leather Belt — Reference Style 02",
    productType: "Trachten belt",
    features: ["Traditional belt profile", "Decorative buckle presentation", "Buyer-specified artwork and hardware"],
    sort: 1301,
    image: "/media/bavarian-drive/assets/men-accessories/bavarian-leather-belt/belt-1.webp",
  },
  {
    id: 910003,
    slug: "haferl-leather-shoes-reference-style-02",
    name: "Haferl Leather Shoes — Reference Style 02",
    productType: "Haferl footwear",
    features: ["Traditional low-cut profile", "Structured upper construction", "Buyer-specified outsole and finishing"],
    sort: 1302,
    image: "/media/bavarian-drive/assets/men-shoes-socks/haferl-leather-shoes/shoes-1.webp",
  },
  {
    id: 910004,
    slug: "knee-high-bavarian-socks-reference-style-02",
    name: "Knee-High Bavarian Socks — Reference Style 02",
    productType: "Trachten socks",
    features: ["Knee-high traditional silhouette", "Textured knit presentation", "Buyer-specified yarn, sizing and branding"],
    sort: 1303,
    image: "/media/bavarian-drive/assets/men-shoes-socks/haferl-leather-shoes/socks-1.webp",
  },
  {
    id: 910005,
    slug: "premium-leather-trachten-bag-reference-style-01",
    name: "Premium Leather Trachten Bag — Reference Style 01",
    productType: "Trachten bag",
    features: ["Traditional compact bag profile", "Structured strap construction", "Buyer-specified hardware and private label"],
    sort: 1304,
    image: "/media/bavarian-drive/assets/women-accessories/premium-leather-bag/bags-1.webp",
  },
];

function createProduct(product: ProductSeed, categoryId: string): DbProduct {
  return {
    id: `00000000-0000-0000-0000-${String(product.id).padStart(12, "0")}`,
    category_id: categoryId,
    slug: product.slug,
    name: product.name,
    description: `${product.name} shown as a first-party visual reference for wholesale, OEM and private-label ${product.productType.toLowerCase()} programs. Final construction, materials, colours and branding are confirmed against the buyer brief.`,
    image_url: product.image,
    gallery: [product.image],
    specs: [
      ...product.features,
      "Materials and dimensions confirmed per buyer specification",
      "Private-label customization available",
    ],
    details: [],
    material_specifications: null,
    seo_title: `${product.name} Manufacturer | Irha Apparels`,
    seo_description: `${product.name} for wholesale, OEM and private-label Bavarian accessory programs from Irha Apparels, a B2B apparel manufacturer in Sialkot, Pakistan.`,
    sort_order: product.sort,
    is_published: true,
    sku: null,
    is_featured: false,
    short_description: `${product.name} for wholesale, OEM, ODM and private-label Bavarian accessory programs.`,
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

export function createSupplementalAccessories20260713ProductsForSubcategory(
  topCategorySlug: string,
  subSlug: string,
  subName: string,
  categoryId: string,
): DbProduct[] {
  const isAccessories =
    topCategorySlug === "bavarian-trachten-wear" &&
    (subSlug === "accessories" || normalize(subName).includes("accessor"));

  return isAccessories ? PRODUCTS.map((product) => createProduct(product, categoryId)) : [];
}
