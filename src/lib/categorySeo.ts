import ogBavarian from "@/assets/og/og-bavarian.jpg";
import ogSportswear from "@/assets/og/og-sportswear.jpg";
import ogLeather from "@/assets/og/og-leather.jpg";
import ogStreetwear from "@/assets/og/og-streetwear.jpg";
import ogLeisure from "@/assets/og/og-leisure.jpg";

export type CategoryFAQ = { q: string; a: string };
export type CategorySEO = {
  title: string;
  description: string;
  keywords: string;
  h1: string;
  intro: string;
  exportMarkets: string[];
  ogImage: string;
  faqs: CategoryFAQ[];
};

const safe = (
  title: string,
  description: string,
  keywords: string,
  h1: string,
  intro: string,
  ogImage: string,
): CategorySEO => ({
  title,
  description,
  keywords,
  h1,
  intro,
  exportMarkets: [],
  ogImage,
  faqs: [],
});

export const CATEGORY_SEO: Record<string, CategorySEO> = {
  "bavarian-trachten-wear": safe(
    "Custom Bavarian & Trachten Manufacturer | Irha Apparels",
    "Custom Bavarian and Trachten apparel programs for B2B buyers. Requirements and commercial terms are reviewed per program.",
    "custom Bavarian apparel, Trachten manufacturer, Lederhosen manufacturer, Dirndl manufacturer",
    "Custom Bavarian & Trachten Wear Manufacturer",
    "Custom Bavarian and Trachten programs for wholesalers, retailers, importers and private-label buyers. Product details and commercial terms are confirmed after requirement review.",
    ogBavarian,
  ),
  "premium-leather-apparel": safe(
    "Custom Leather Apparel Manufacturer | Irha Apparels",
    "Custom leather apparel programs for brands, wholesalers and private-label buyers.",
    "custom leather apparel, leather garment manufacturer, private-label leatherwear",
    "Custom Premium Leather Apparel Manufacturer",
    "Custom leather apparel programs developed from buyer requirements, references or specifications. Product details and commercial terms are confirmed after review.",
    ogLeather,
  ),
  sportswear: safe(
    "Custom Sportswear Manufacturer | Irha Apparels",
    "Custom sportswear and teamwear programs for brands, clubs, wholesalers and private-label buyers.",
    "custom sportswear manufacturer, teamwear manufacturer, private-label sportswear",
    "Custom Sportswear & Teamwear Manufacturer",
    "Custom sportswear programs for B2B buyers. Product details, sampling and commercial terms are confirmed after requirement review.",
    ogSportswear,
  ),
  "streetwear-activewear": safe(
    "Custom Streetwear & Activewear Manufacturer | Irha Apparels",
    "Custom streetwear and activewear programs for brands, wholesalers and private-label buyers.",
    "streetwear manufacturer, activewear manufacturer, private-label apparel",
    "Custom Streetwear & Activewear Manufacturer",
    "Custom streetwear and activewear programs built around the buyer's product brief. Product details and commercial terms are confirmed after review.",
    ogStreetwear,
  ),
  "leisure-nightwear": safe(
    "Custom Leisurewear & Nightwear Manufacturer | Irha Apparels",
    "Custom leisurewear and nightwear programs for brands, wholesalers and private-label buyers.",
    "leisurewear manufacturer, nightwear manufacturer, private-label sleepwear",
    "Custom Leisurewear & Nightwear Manufacturer",
    "Custom leisurewear and nightwear programs for B2B buyers. Product details and commercial terms are confirmed after requirement review.",
    ogLeisure,
  ),
};
