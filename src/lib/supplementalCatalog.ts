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

type MensTrachtenProduct = Omit<
  SupplementalProductDefinition,
  "id" | "topCategorySlug" | "subcategorySlugs" | "subcategoryNames"
> & { idSuffix: number };

const mensTrachtenProduct = ({ idSuffix, ...product }: MensTrachtenProduct): SupplementalProductDefinition => ({
  id: `00000000-0000-0000-0000-${String(idSuffix).padStart(12, "0")}`,
  topCategorySlug: "bavarian-trachten-wear",
  subcategorySlugs: ["men"],
  subcategoryNames: ["menstrachten"],
  ...product,
});

const SUPPLEMENTAL_PRODUCTS: SupplementalProductDefinition[] = [
  mensTrachtenProduct({
    idSuffix: 65,
    slug: "white-embroidered-lederhosen",
    name: "White Embroidered Lederhosen",
    description:
      "Traditional Bavarian-style Lederhosen in a white colourway with decorative gold-tone embroidery, prepared for wholesale and private-label buyer programs. Branding, labels, trims and packaging are confirmed per buyer specification.",
    specs: ["Decorative gold-tone embroidery", "Traditional front-panel construction", "Matching suspenders", "Private-label customization available"],
    seoTitle: "White Embroidered Lederhosen Manufacturer | Irha Apparels",
    seoDescription: "White embroidered Lederhosen for wholesale and private-label programs from Irha Apparels, a B2B apparel manufacturer in Sialkot, Pakistan.",
    shortDescription: "White embroidered Lederhosen for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 999,
  }),
  mensTrachtenProduct({
    idSuffix: 66,
    slug: "brown-short-lederhosen",
    name: "Brown Short Lederhosen",
    description: "Short-cut Bavarian-style Lederhosen in a brown colourway with tonal embroidery, decorative side-button detailing and clear front and rear construction, prepared for wholesale and private-label buyer programs.",
    specs: ["Short-cut Bavarian silhouette", "Tonal leg embroidery", "Decorative side-button detail", "Private-label customization available"],
    seoTitle: "Brown Short Lederhosen Manufacturer | Irha Apparels",
    seoDescription: "Brown short Lederhosen for wholesale and private-label programs from Irha Apparels, a B2B apparel manufacturer in Sialkot, Pakistan.",
    shortDescription: "Brown short Lederhosen for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1000,
  }),
  mensTrachtenProduct({
    idSuffix: 67,
    slug: "distressed-brown-short-lederhosen",
    name: "Distressed Brown Short Lederhosen",
    description: "Short-cut Bavarian-style Lederhosen in a distressed brown colourway with a traditional front flap, matching suspenders and detailed front, side and rear construction, prepared for wholesale and private-label buyer programs.",
    specs: ["Distressed brown visual finish", "Traditional front-flap construction", "Matching suspenders", "Private-label customization available"],
    seoTitle: "Distressed Brown Short Lederhosen Manufacturer | Irha Apparels",
    seoDescription: "Distressed brown short Lederhosen for wholesale and private-label programs from Irha Apparels, a B2B apparel manufacturer in Sialkot, Pakistan.",
    shortDescription: "Distressed brown short Lederhosen for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1001,
  }),
  mensTrachtenProduct({
    idSuffix: 68,
    slug: "contrast-piped-brown-short-lederhosen",
    name: "Contrast-Piped Brown Short Lederhosen",
    description: "Short-cut Bavarian-style Lederhosen in a brown colourway with light contrast piping, a decorative front flap, leg embroidery and side-button detailing, prepared for wholesale and private-label buyer programs.",
    specs: ["Light contrast-piping accents", "Traditional front-flap construction", "Decorative leg embroidery", "Side-button detail", "Private-label customization available"],
    seoTitle: "Contrast-Piped Brown Short Lederhosen Manufacturer | Irha Apparels",
    seoDescription: "Contrast-piped brown short Lederhosen for wholesale and private-label programs from Irha Apparels, a B2B apparel manufacturer in Sialkot, Pakistan.",
    shortDescription: "Contrast-piped brown short Lederhosen for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1002,
  }),
  mensTrachtenProduct({
    idSuffix: 69,
    slug: "black-skeleton-embroidered-short-lederhosen",
    name: "Black Skeleton Embroidered Short Lederhosen",
    description: "Short-cut Bavarian-style Lederhosen in a black and charcoal colourway with a statement skeleton embroidery panel, light contrast piping and decorative side lacing, prepared for wholesale and private-label buyer programs.",
    specs: ["Statement skeleton embroidery", "Black and charcoal visual finish", "Light contrast-piping accents", "Decorative side-lacing detail", "Private-label customization available"],
    seoTitle: "Black Skeleton Embroidered Lederhosen Manufacturer | Irha Apparels",
    seoDescription: "Black skeleton embroidered short Lederhosen for wholesale and private-label programs from Irha Apparels, a B2B apparel manufacturer in Sialkot, Pakistan.",
    shortDescription: "Black skeleton embroidered short Lederhosen for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1003,
  }),
  mensTrachtenProduct({
    idSuffix: 70,
    slug: "brown-floral-embroidered-short-lederhosen",
    name: "Brown Floral Embroidered Short Lederhosen",
    description: "Short-cut Bavarian-style Lederhosen in a brown colourway with floral leg embroidery, decorative side-button detailing and matching suspenders, prepared for wholesale and private-label buyer programs.",
    specs: ["Floral leg embroidery", "Brown visual finish", "Matching suspenders", "Decorative side-button detail", "Private-label customization available"],
    seoTitle: "Brown Floral Embroidered Lederhosen Manufacturer | Irha Apparels",
    seoDescription: "Brown floral embroidered short Lederhosen for wholesale and private-label programs from Irha Apparels, a B2B apparel manufacturer in Sialkot, Pakistan.",
    shortDescription: "Brown floral embroidered short Lederhosen for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1004,
  }),
  mensTrachtenProduct({
    idSuffix: 71,
    slug: "dark-brown-scroll-embroidered-short-lederhosen",
    name: "Dark Brown Scroll-Embroidered Short Lederhosen",
    description: "Short-cut Bavarian-style Lederhosen in a dark brown colourway with ornamental scroll embroidery, a traditional front flap and matching suspenders, prepared for wholesale and private-label buyer programs.",
    specs: ["Ornamental scroll embroidery", "Dark brown visual finish", "Traditional front-flap construction", "Matching suspenders", "Private-label customization available"],
    seoTitle: "Dark Brown Scroll-Embroidered Lederhosen Manufacturer | Irha Apparels",
    seoDescription: "Dark brown scroll-embroidered short Lederhosen for wholesale and private-label programs from Irha Apparels, a B2B apparel manufacturer in Sialkot, Pakistan.",
    shortDescription: "Dark brown scroll-embroidered short Lederhosen for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1005,
  }),
  mensTrachtenProduct({
    idSuffix: 72,
    slug: "black-gold-embroidered-short-lederhosen",
    name: "Black Gold-Embroidered Short Lederhosen",
    description: "Short-cut Bavarian-style Lederhosen in a black colourway with gold-tone embroidery, a traditional front flap and matching suspenders, prepared for wholesale and private-label buyer programs.",
    specs: ["Gold-tone decorative embroidery", "Black visual finish", "Traditional front-flap construction", "Matching suspenders", "Private-label customization available"],
    seoTitle: "Black Gold-Embroidered Lederhosen Manufacturer | Irha Apparels",
    seoDescription: "Black gold-embroidered short Lederhosen for wholesale and private-label programs from Irha Apparels, a B2B apparel manufacturer in Sialkot, Pakistan.",
    shortDescription: "Black gold-embroidered short Lederhosen for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1006,
  }),
  mensTrachtenProduct({
    idSuffix: 73,
    slug: "tan-alpine-embroidered-short-lederhosen",
    name: "Tan Alpine Embroidered Short Lederhosen",
    description: "Short-cut Bavarian-style Lederhosen in a tan colourway with alpine-inspired embroidery, a traditional front flap and matching suspenders, prepared for wholesale and private-label buyer programs.",
    specs: ["Alpine-inspired decorative embroidery", "Tan visual finish", "Traditional front-flap construction", "Matching suspenders", "Private-label customization available"],
    seoTitle: "Tan Alpine Embroidered Lederhosen Manufacturer | Irha Apparels",
    seoDescription: "Tan alpine embroidered short Lederhosen for wholesale and private-label programs from Irha Apparels, a B2B apparel manufacturer in Sialkot, Pakistan.",
    shortDescription: "Tan alpine embroidered short Lederhosen for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1007,
  }),
  mensTrachtenProduct({
    idSuffix: 74,
    slug: "antique-brown-scroll-embroidered-short-lederhosen",
    name: "Antique Brown Scroll-Embroidered Short Lederhosen",
    description: "Short-cut Bavarian-style Lederhosen in an antique brown colourway with ornamental scroll embroidery, contrast piping and matching suspenders, prepared for wholesale and private-label buyer programs.",
    specs: ["Ornamental scroll embroidery", "Antique brown visual finish", "Contrast-piping accents", "Matching suspenders", "Private-label customization available"],
    seoTitle: "Antique Brown Scroll-Embroidered Lederhosen Manufacturer | Irha Apparels",
    seoDescription: "Antique brown scroll-embroidered short Lederhosen for wholesale and private-label programs from Irha Apparels, a B2B apparel manufacturer in Sialkot, Pakistan.",
    shortDescription: "Antique brown scroll-embroidered short Lederhosen for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1008,
  }),
  mensTrachtenProduct({
    idSuffix: 75,
    slug: "sand-brown-floral-embroidered-short-lederhosen",
    name: "Sand Brown Floral-Embroidered Short Lederhosen",
    description: "Short-cut Bavarian-style Lederhosen in a sand-brown colourway with floral embroidery, decorative side-button detailing and matching suspenders, prepared for wholesale and private-label buyer programs.",
    specs: ["Floral decorative embroidery", "Sand-brown visual finish", "Traditional front-flap construction", "Matching suspenders", "Decorative side-button detail", "Private-label customization available"],
    seoTitle: "Sand Brown Floral-Embroidered Lederhosen Manufacturer | Irha Apparels",
    seoDescription: "Sand brown floral-embroidered short Lederhosen for wholesale and private-label programs from Irha Apparels, a B2B apparel manufacturer in Sialkot, Pakistan.",
    shortDescription: "Sand brown floral-embroidered short Lederhosen for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1009,
  }),
  mensTrachtenProduct({
    idSuffix: 76,
    slug: "dark-brown-ivory-embroidered-short-lederhosen",
    name: "Dark Brown Ivory-Embroidered Short Lederhosen",
    description: "Short-cut Bavarian-style Lederhosen in a dark-brown colourway with ivory-tone ornamental embroidery and matching suspenders, prepared for wholesale and private-label buyer programs.",
    specs: ["Ivory-tone ornamental embroidery", "Dark-brown visual finish", "Matching suspenders", "Decorative front-flap construction", "Private-label customization available"],
    seoTitle: "Dark Brown Ivory-Embroidered Lederhosen Manufacturer | Irha Apparels",
    seoDescription: "Dark brown ivory-embroidered short Lederhosen for wholesale and private-label programs from Irha Apparels, a B2B apparel manufacturer in Sialkot, Pakistan.",
    shortDescription: "Dark brown ivory-embroidered short Lederhosen for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1010,
  }),
  mensTrachtenProduct({
    idSuffix: 77,
    slug: "crackle-brown-green-embroidered-short-lederhosen",
    name: "Crackle Brown Green-Embroidered Short Lederhosen",
    description: "Short-cut Bavarian-style Lederhosen in a crackle-finish brown colourway with green-tone ornamental embroidery, contrast piping and a decorative front flap, prepared for wholesale and private-label buyer programs.",
    specs: ["Crackle brown visual finish", "Green-tone ornamental embroidery", "Contrast-piping accents", "Decorative front-flap construction", "Private-label customization available"],
    seoTitle: "Crackle Brown Green-Embroidered Lederhosen Manufacturer | Irha Apparels",
    seoDescription: "Crackle brown green-embroidered short Lederhosen for wholesale and private-label programs from Irha Apparels, a B2B apparel manufacturer in Sialkot, Pakistan.",
    shortDescription: "Crackle brown green-embroidered short Lederhosen for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1011,
  }),
  mensTrachtenProduct({
    idSuffix: 78,
    slug: "vintage-taupe-side-tie-short-lederhosen",
    name: "Vintage Taupe Side-Tie Short Lederhosen",
    description: "Short-cut Bavarian-style Lederhosen in a vintage taupe colourway with tonal ornamental embroidery, a decorative belt and adjustable side-tie details, prepared for wholesale and private-label buyer programs.",
    specs: ["Vintage taupe visual finish", "Tonal ornamental embroidery", "Decorative belt detail", "Adjustable side-tie finish", "Private-label customization available"],
    seoTitle: "Vintage Taupe Side-Tie Lederhosen Manufacturer | Irha Apparels",
    seoDescription: "Vintage taupe side-tie short Lederhosen for wholesale and private-label programs from Irha Apparels, a B2B apparel manufacturer in Sialkot, Pakistan.",
    shortDescription: "Vintage taupe side-tie short Lederhosen for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1012,
  }),
  mensTrachtenProduct({
    idSuffix: 79,
    slug: "olive-brown-ornamental-embroidered-short-lederhosen",
    name: "Olive Brown Ornamental-Embroidered Short Lederhosen",
    description: "Short-cut Bavarian-style Lederhosen in an olive-brown colourway with extensive ornamental embroidery, decorative front-flap construction and side-button details, prepared for wholesale and private-label buyer programs.",
    specs: ["Olive-brown visual finish", "Extensive ornamental embroidery", "Decorative front-flap construction", "Side-button detail", "Private-label customization available"],
    seoTitle: "Olive Brown Ornamental-Embroidered Lederhosen Manufacturer | Irha Apparels",
    seoDescription: "Olive brown ornamental-embroidered short Lederhosen for wholesale and private-label programs from Irha Apparels, a B2B apparel manufacturer in Sialkot, Pakistan.",
    shortDescription: "Olive brown ornamental-embroidered short Lederhosen for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1013,
  }),
  mensTrachtenProduct({
    idSuffix: 80,
    slug: "light-tan-ornamental-embroidered-short-lederhosen",
    name: "Light Tan Ornamental-Embroidered Short Lederhosen",
    description: "Short-cut Bavarian-style Lederhosen in a light-tan colourway with ornamental embroidery, decorative front-flap construction and side-button detailing, prepared for wholesale and private-label buyer programs.",
    specs: ["Light-tan visual finish", "Ornamental embroidery", "Decorative front-flap construction", "Side-button detail", "Private-label customization available"],
    seoTitle: "Light Tan Ornamental-Embroidered Lederhosen Manufacturer | Irha Apparels",
    seoDescription: "Light tan ornamental-embroidered short Lederhosen for wholesale and private-label programs from Irha Apparels, a B2B apparel manufacturer in Sialkot, Pakistan.",
    shortDescription: "Light tan ornamental-embroidered short Lederhosen for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1014,
  }),
];

function matchesSubcategory(
  definition: SupplementalProductDefinition,
  topCategorySlug: string,
  subSlug: string,
  subName: string,
): boolean {
  if (definition.topCategorySlug !== topCategorySlug) return false;
  const normalizedName = normalize(subName);
  return definition.subcategorySlugs.includes(subSlug) || definition.subcategoryNames.includes(normalizedName);
}

function createSupplementalProduct(definition: SupplementalProductDefinition, categoryId: string): DbProduct {
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
