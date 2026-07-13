import type { DbProduct } from "@/hooks/useCatalog";

// Verified first-party media: Long Lederhosen and product-only Trachten waistcoats.
const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

type ProductSeed = { id: number; slug: string; name: string; sort: number; visual: string; features: string[]; gallery: string[] };
const media = (slug: string, ...files: string[]) => files.map((file) => `/product-media/${slug}/${file}`);

const PRODUCTS: ProductSeed[] = [
  { id: 122, slug: "black-scroll-embroidered-long-lederhosen", name: "Black Scroll-Embroidered Long Lederhosen", sort: 1070, visual: "black", features: ["Scroll-style embroidery", "Long-cut Trachten silhouette", "Traditional-inspired front construction"], gallery: media("black-scroll-embroidered-long-lederhosen", "01-hero-front.webp", "03-angle-back.webp") },
  { id: 123, slug: "tan-minimal-embroidered-long-lederhosen", name: "Tan Minimal-Embroidered Long Lederhosen", sort: 1071, visual: "tan", features: ["Restrained embroidery", "Long-cut Trachten silhouette", "Clean front construction"], gallery: media("tan-minimal-embroidered-long-lederhosen", "01-hero-front.webp", "03-angle-back.webp") },
  { id: 124, slug: "rustic-brown-button-fly-long-lederhosen", name: "Rustic Brown Button-Fly Long Lederhosen", sort: 1072, visual: "rustic brown", features: ["Button-fly styling", "Decorative side embroidery", "Long-cut Trachten silhouette"], gallery: media("rustic-brown-button-fly-long-lederhosen", "01-hero-front.webp", "03-angle-back.webp", "04-detail-side-embroidery.webp") },
  { id: 125, slug: "dark-brown-floral-piped-long-lederhosen", name: "Dark Brown Floral-Piped Long Lederhosen", sort: 1073, visual: "dark brown", features: ["Floral-style decorative detailing", "Contrast-piped accents", "Multi-angle product presentation"], gallery: media("dark-brown-floral-piped-long-lederhosen", "01-multi-angle-hero.webp") },
  { id: 126, slug: "tan-side-embroidered-long-lederhosen", name: "Tan Side-Embroidered Long Lederhosen", sort: 1074, visual: "tan", features: ["Decorative side embroidery", "Long-cut Trachten silhouette", "Multi-angle product presentation"], gallery: media("tan-side-embroidered-long-lederhosen", "01-multi-angle-hero.webp") },
  { id: 127, slug: "black-gold-embroidered-long-lederhosen", name: "Black Gold-Embroidered Long Lederhosen", sort: 1075, visual: "black", features: ["Gold-tone decorative embroidery", "Long-cut Trachten silhouette", "Multi-angle product presentation"], gallery: media("black-gold-embroidered-long-lederhosen", "01-multi-angle-hero.webp") },
  { id: 128, slug: "black-brown-trim-trachten-waistcoat", name: "Black Brown-Trim Trachten Waistcoat", sort: 1080, visual: "black", features: ["Brown contrast trim", "Traditional-inspired front silhouette", "Product-only presentation"], gallery: media("black-brown-trim-trachten-waistcoat", "01-hero-front.webp") },
  { id: 129, slug: "red-brown-trim-trachten-waistcoat", name: "Red Brown-Trim Trachten Waistcoat", sort: 1081, visual: "red", features: ["Brown contrast trim", "Traditional-inspired front silhouette", "Product-only presentation"], gallery: media("red-brown-trim-trachten-waistcoat", "01-hero-front.webp") },
  { id: 130, slug: "navy-brown-trim-trachten-waistcoat", name: "Navy Brown-Trim Trachten Waistcoat", sort: 1082, visual: "navy", features: ["Brown contrast trim", "Traditional-inspired front silhouette", "Product-only presentation"], gallery: media("navy-brown-trim-trachten-waistcoat", "01-hero-front.webp") },
  { id: 131, slug: "charcoal-red-trim-trachten-waistcoat", name: "Charcoal Red-Trim Trachten Waistcoat", sort: 1083, visual: "charcoal", features: ["Red contrast trim", "Traditional-inspired front silhouette", "Product-only presentation"], gallery: media("charcoal-red-trim-trachten-waistcoat", "01-hero-front.webp") },
  { id: 132, slug: "black-red-trim-trachten-waistcoat", name: "Black Red-Trim Trachten Waistcoat", sort: 1084, visual: "black", features: ["Red contrast trim", "Traditional-inspired front silhouette", "Product-only presentation"], gallery: media("black-red-trim-trachten-waistcoat", "01-hero-front.webp") },
  { id: 133, slug: "green-brown-trim-trachten-waistcoat", name: "Green Brown-Trim Trachten Waistcoat", sort: 1085, visual: "green", features: ["Brown contrast trim", "Traditional-inspired front silhouette", "Product-only presentation"], gallery: media("green-brown-trim-trachten-waistcoat", "01-hero-front.webp") },
  { id: 134, slug: "navy-grey-panel-trachten-waistcoat", name: "Navy Grey-Panel Trachten Waistcoat", sort: 1086, visual: "navy", features: ["Grey panel detailing", "Traditional-inspired front silhouette", "Product-only presentation"], gallery: media("navy-grey-panel-trachten-waistcoat", "01-hero-front.webp") },
  { id: 135, slug: "light-grey-trachten-waistcoat", name: "Light Grey Trachten Waistcoat", sort: 1087, visual: "light grey", features: ["Clean front styling", "Traditional-inspired silhouette", "Product-only presentation"], gallery: media("light-grey-trachten-waistcoat", "01-hero-front.webp") },
  { id: 136, slug: "black-checkered-red-trim-trachten-waistcoat", name: "Black Checkered Red-Trim Trachten Waistcoat", sort: 1088, visual: "black checkered", features: ["Red contrast trim", "Traditional-inspired front silhouette", "Product-only presentation"], gallery: media("black-checkered-red-trim-trachten-waistcoat", "01-hero-front.webp") },
  { id: 137, slug: "grey-red-lining-trachten-waistcoat", name: "Grey Red-Lining Trachten Waistcoat", sort: 1089, visual: "grey", features: ["Red lining accents", "Traditional-inspired front silhouette", "Product-only presentation"], gallery: media("grey-red-lining-trachten-waistcoat", "01-hero-front.webp") },
  { id: 138, slug: "grey-blue-trim-trachten-waistcoat", name: "Grey Blue-Trim Trachten Waistcoat", sort: 1090, visual: "grey", features: ["Blue contrast trim", "Traditional-inspired front silhouette", "Product-only presentation"], gallery: media("grey-blue-trim-trachten-waistcoat", "01-hero-front.webp") },
  { id: 139, slug: "green-plain-trachten-waistcoat", name: "Green Plain Trachten Waistcoat", sort: 1091, visual: "green", features: ["Clean front styling", "Traditional-inspired silhouette", "Product-only presentation"], gallery: media("green-plain-trachten-waistcoat", "01-hero-front.webp") },
  { id: 140, slug: "grey-green-trim-trachten-waistcoat", name: "Grey Green-Trim Trachten Waistcoat", sort: 1092, visual: "grey", features: ["Green contrast trim", "Traditional-inspired front silhouette", "Product-only presentation"], gallery: media("grey-green-trim-trachten-waistcoat", "01-hero-front.webp") },
];

function createProduct(product: ProductSeed, categoryId: string): DbProduct {
  const kind = product.slug.endsWith("trachten-waistcoat") ? "Trachten waistcoat" : "long Lederhosen";
  return {
    id: `00000000-0000-0000-0000-${String(product.id).padStart(12, "0")}`,
    category_id: categoryId,
    slug: product.slug,
    name: product.name,
    description: `${product.name} in a ${product.visual} visual finish with ${product.features.join(", ").toLowerCase()}, prepared for wholesale and private-label buyer programs.`,
    image_url: product.gallery[0] ?? null,
    gallery: product.gallery,
    specs: [`${product.visual[0].toUpperCase()}${product.visual.slice(1)} visual finish`, ...product.features, "Private-label customization available"],
    details: [], material_specifications: null,
    seo_title: `${product.name} Manufacturer | Irha Apparels`,
    seo_description: `${product.name} for wholesale and private-label programs from Irha Apparels, a B2B apparel manufacturer in Sialkot, Pakistan.`,
    sort_order: product.sort, is_published: true, sku: null, is_featured: false,
    short_description: `${product.name} for wholesale, OEM, ODM and private-label ${kind} programs.`,
    moq_display: null, moq_min: null, sample_available: null, sample_timeline: null, production_timeline: null,
    country_of_origin: null, primary_material: null, fabric_composition: null, gsm: null,
    available_sizes: [], size_notes: null, available_colors: [], custom_colors: null,
    customization: {}, packaging_standard: null, packaging_custom: null, related_product_ids: [],
  };
}

export function createSupplementalBatch11ProductsForSubcategory(topCategorySlug: string, subSlug: string, subName: string, categoryId: string): DbProduct[] {
  const isMensTrachten = topCategorySlug === "bavarian-trachten-wear" && (subSlug === "men" || normalize(subName) === "menstrachten");
  return isMensTrachten ? PRODUCTS.map((product) => createProduct(product, categoryId)) : [];
}
