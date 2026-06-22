import catBavarian from "@/assets/cat-bavarian.jpg";
import catLeather from "@/assets/cat-leather.jpg";
import catStreetwear from "@/assets/cat-streetwear.jpg";
import catSportswear from "@/assets/cat-sportswear.jpg";

export type FeaturedCategorySlug =
  | "leather-bavarian"
  | "textile-active-leisure";

export interface FeaturedProduct {
  sku: string;
  title: string;
  description: string;
  longDescription: string;
  categorySlug: FeaturedCategorySlug;
  categoryName: string;
  productSlug: string;
  image: string;
  moq: string;
  badge: string;
  leadTime: string;
  material: string;
}

export const FEATURED_CATEGORIES: Record<FeaturedCategorySlug, string> = {
  "leather-bavarian": "Leather & Bavarian Hub",
  "textile-active-leisure": "Textile, Active & Leisure Hub",
};

export const FEATURED_PRODUCTS: FeaturedProduct[] = [
  {
    sku: "IRHA-BAV-01",
    title: "Premium Cowhide Lederhosen",
    description: "Authentic Bavarian styling with deep oak-leaf relief embossing.",
    longDescription:
      "Hand-stitched Bavarian Lederhosen crafted from premium full-grain cowhide. Deep oak-leaf relief embossing, antique brass hardware, contrast saddle stitching and a tailored knee-length cut engineered for festival-grade durability and a heritage drape.",
    categorySlug: "leather-bavarian",
    categoryName: "Leather & Bavarian Hub",
    productSlug: "premium-cowhide-lederhosen",
    image: catBavarian,
    moq: "MOQ: 50 Pcs",
    badge: "Heritage Craft",
    leadTime: "45 days",
    material: "Premium full-grain cowhide, 1.4mm",
  },
  {
    sku: "IRHA-LTH-09",
    title: "Custom Leather Motorcycle Jacket",
    description:
      "1.2mm premium milled cowhide leather engineered for high-durability apparel markets.",
    longDescription:
      "Motorcycle-grade jacket built from 1.2mm milled full-grain cowhide. CE-ready impact pocket geometry, YKK Excella zippers, removable thermal liner and a precision-tailored race silhouette ready for OEM branding, sublimated linings and bespoke colorways.",
    categorySlug: "leather-bavarian",
    categoryName: "Leather & Bavarian Hub",
    productSlug: "custom-leather-motorcycle-jacket",
    image: catLeather,
    moq: "MOQ: 100 Pcs",
    badge: "Premium Export Quality",
    leadTime: "40 days",
    material: "1.2mm milled cowhide + YKK hardware",
  },
  {
    sku: "IRHA-STW-04",
    title: "Heavyweight Boxy Hoodie",
    description:
      "450 GSM ultra-dense organic cotton loopback knit fleece with relaxed dropshoulder geometry.",
    longDescription:
      "Streetwear-grade heavyweight hoodie engineered in 450 GSM organic cotton loopback fleece. Garment-dyed for vintage hand-feel, dropshoulder geometry, double-needle topstitching and reinforced ribbed cuffs/hem. Built for premium DTC and fashion-brand programs.",
    categorySlug: "textile-active-leisure",
    categoryName: "Textile, Active & Leisure Hub",
    productSlug: "heavyweight-boxy-hoodie",
    image: catStreetwear,
    moq: "MOQ: 300 Pcs",
    badge: "MOQ-Friendly",
    leadTime: "30 days",
    material: "450 GSM organic cotton loopback fleece",
  },
  {
    sku: "IRHA-SPT-12",
    title: "Dry-Fit Pro Training Kit",
    description:
      "Interlock moisture-wicking polyester fabric matrix with custom sublimation and flexible branding tags.",
    longDescription:
      "Pro-level training kit built on interlock moisture-wicking polyester. Full-surface sublimation, mesh ventilation panels, ergonomic raglan sleeves and flexible heat-transfer branding tags — ideal for clubs, federations and athletic private label.",
    categorySlug: "textile-active-leisure",
    categoryName: "Textile, Active & Leisure Hub",
    productSlug: "dry-fit-pro-training-kit",
    image: catSportswear,
    moq: "MOQ: 100 Sets",
    badge: "Sublimation Ready",
    leadTime: "25 days",
    material: "Interlock 160 GSM dry-fit polyester",
  },
];

export function findFeaturedProduct(
  categorySlug?: string,
  productSlug?: string,
): FeaturedProduct | undefined {
  if (!categorySlug || !productSlug) return undefined;
  return FEATURED_PRODUCTS.find(
    (p) => p.categorySlug === categorySlug && p.productSlug === productSlug,
  );
}
