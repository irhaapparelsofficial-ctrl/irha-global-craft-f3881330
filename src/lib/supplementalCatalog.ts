import type { DbProduct } from "@/hooks/useCatalog";
import { PRODUCT_REAL_MEDIA } from "@/lib/productRealMedia";

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

type SupplementalProductDefinition = {
  id: string;
  topCategorySlug: string;
  subcategorySlugs: string[];
  subcategoryNames: string[];
  slug: string;
  name: string;
  description: string;
  specs: string[];
  seoTitle: string;
  seoDescription: string;
  shortDescription: string;
  sortOrder: number;
};

const SUPPLEMENTAL_PRODUCTS: SupplementalProductDefinition[] = [
  {
    id: "00000000-0000-0000-0000-000000000065",
    topCategorySlug: "bavarian-trachten-wear",
    subcategorySlugs: ["men"],
    subcategoryNames: ["menstrachten"],
    slug: "white-embroidered-lederhosen",
    name: "White Embroidered Lederhosen",
    description:
      "Traditional Bavarian-style Lederhosen in a white colourway with decorative gold-tone embroidery, prepared for wholesale and private-label buyer programs. Branding, labels, trims and packaging are confirmed per buyer specification.",
    specs: [
      "Decorative gold-tone embroidery",
      "Traditional front-panel construction",
      "Matching suspenders",
      "Private-label customization available",
    ],
    seoTitle: "White Embroidered Lederhosen Manufacturer | Irha Apparels",
    seoDescription:
      "White embroidered Lederhosen for wholesale and private-label programs from Irha Apparels, a B2B apparel manufacturer in Sialkot, Pakistan.",
    shortDescription:
      "White embroidered Lederhosen for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 999,
  },
  {
    id: "00000000-0000-0000-0000-000000000066",
    topCategorySlug: "bavarian-trachten-wear",
    subcategorySlugs: ["men"],
    subcategoryNames: ["menstrachten"],
    slug: "brown-short-lederhosen",
    name: "Brown Short Lederhosen",
    description:
      "Short-cut Bavarian-style Lederhosen in a brown colourway with tonal embroidery, decorative side-button detailing and clear front and rear construction, prepared for wholesale and private-label buyer programs.",
    specs: [
      "Short-cut Bavarian silhouette",
      "Tonal leg embroidery",
      "Decorative side-button detail",
      "Private-label customization available",
    ],
    seoTitle: "Brown Short Lederhosen Manufacturer | Irha Apparels",
    seoDescription:
      "Brown short Lederhosen for wholesale and private-label programs from Irha Apparels, a B2B apparel manufacturer in Sialkot, Pakistan.",
    shortDescription:
      "Brown short Lederhosen for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1000,
  },
];

function matchesSubcategory(
  definition: SupplementalProductDefinition,
  topCategorySlug: string,
  subSlug: string,
  subName: string,
): boolean {
  if (definition.topCategorySlug !== topCategorySlug) return false;
  const normalizedName = normalize(subName);
  return (
    definition.subcategorySlugs.includes(subSlug) ||
    definition.subcategoryNames.includes(normalizedName)
  );
}

function createSupplementalProduct(
  definition: SupplementalProductDefinition,
  categoryId: string,
): DbProduct {
  const gallery = PRODUCT_REAL_MEDIA[definition.slug]?.gallery ?? [];

  return {
    id: definition.id,
    category_id: categoryId,
    slug: definition.slug,
    name: definition.name,
    description: definition.description,
    image_url: gallery[0] ?? null,
    gallery,
    specs: definition.specs,
    details: [],
    material_specifications: null,
    seo_title: definition.seoTitle,
    seo_description: definition.seoDescription,
    sort_order: definition.sortOrder,
    is_published: true,
    sku: null,
    is_featured: false,
    short_description: definition.shortDescription,
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

export function createSupplementalProductsForSubcategory(
  topCategorySlug: string,
  subSlug: string,
  subName: string,
  categoryId: string,
): DbProduct[] {
  return SUPPLEMENTAL_PRODUCTS
    .filter((definition) => matchesSubcategory(definition, topCategorySlug, subSlug, subName))
    .map((definition) => createSupplementalProduct(definition, categoryId));
}
