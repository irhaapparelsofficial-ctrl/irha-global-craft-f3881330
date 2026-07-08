import type { DbProduct } from "@/hooks/useCatalog";
import { PRODUCT_REAL_MEDIA } from "@/lib/productRealMedia";

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

export const WHITE_EMBROIDERED_LEDERHOSEN_SLUG = "white-embroidered-lederhosen";

export function isMensTrachtenSubcategory(topCategorySlug: string, subSlug: string, subName: string): boolean {
  if (topCategorySlug !== "bavarian-trachten-wear") return false;
  const normalizedName = normalize(subName);
  return subSlug === "men" || normalizedName === "menstrachten";
}

export function createWhiteEmbroideredLederhosen(categoryId: string): DbProduct {
  const gallery = PRODUCT_REAL_MEDIA[WHITE_EMBROIDERED_LEDERHOSEN_SLUG]?.gallery ?? [];

  return {
    id: "00000000-0000-0000-0000-000000000065",
    category_id: categoryId,
    slug: WHITE_EMBROIDERED_LEDERHOSEN_SLUG,
    name: "White Embroidered Lederhosen",
    description:
      "Traditional Bavarian-style Lederhosen in a white colourway with decorative gold-tone embroidery, prepared for wholesale and private-label buyer programs. Branding, labels, trims and packaging are confirmed per buyer specification.",
    image_url: gallery[0] ?? null,
    gallery,
    specs: [
      "Decorative gold-tone embroidery",
      "Traditional front-panel construction",
      "Matching suspenders",
      "Private-label customization available",
    ],
    details: [],
    material_specifications: null,
    seo_title: "White Embroidered Lederhosen Manufacturer | Irha Apparels",
    seo_description:
      "White embroidered Lederhosen for wholesale and private-label programs from Irha Apparels, a B2B apparel manufacturer in Sialkot, Pakistan.",
    sort_order: 999,
    is_published: true,
    sku: null,
    is_featured: false,
    short_description:
      "White embroidered Lederhosen for wholesale, OEM, ODM and private-label programs.",
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
