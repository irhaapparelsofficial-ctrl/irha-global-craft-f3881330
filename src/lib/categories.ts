import bavarian from "@/assets/cat-bavarian.jpg";
import sportswear from "@/assets/cat-sportswear.jpg";
import leather from "@/assets/cat-leather.jpg";
import streetwear from "@/assets/cat-streetwear.jpg";
import leisure from "@/assets/cat-leisure.jpg";
import nightwear from "@/assets/cat-nightwear.jpg";

export type Category = {
  slug: string;
  name: string;
  short: string;
  description: string;
  image: string;
  details: string[];
};

export const CATEGORIES: Category[] = [
  {
    slug: "bavarian",
    name: "Bavarian Wear",
    short: "Trachten & Lederhosen",
    description:
      "Authentic European-style lederhosen and trachten outfits crafted with traditional embroidery, premium suede, and heritage hardware — engineered for Oktoberfest retailers and trachten boutiques across Germany and Austria.",
    image: bavarian,
    details: ["Genuine suede & deer leather", "Hand-embroidered detailing", "Custom alpine hardware", "Men / Women / Kids ranges"],
  },
  {
    slug: "sportswear",
    name: "Sportswear",
    short: "Performance & Teamwear",
    description:
      "High-performance athletic wear and complete team uniform programs built with moisture-wicking technical fabrics, sublimation printing and reinforced stitching for clubs, leagues and athletic brands worldwide.",
    image: sportswear,
    details: ["Sublimation & screen print", "Compression & training kits", "Tracksuits, jerseys, shorts", "OEKO-TEX certified fabrics"],
  },
  {
    slug: "leatherwear",
    name: "Leatherwear",
    short: "Luxury Leather Garments",
    description:
      "Premium leather jackets, biker apparel and refined outerwear cut from full-grain cowhide and napa lambskin — finished with YKK hardware and quilted satin linings worthy of luxury retail floors.",
    image: leather,
    details: ["Full-grain & napa leather", "YKK / RiRi hardware", "Bonded & quilted linings", "Bespoke pattern development"],
  },
  {
    slug: "streetwear",
    name: "Streetwear",
    short: "Urban Fashion Apparel",
    description:
      "Modern urban silhouettes — oversized hoodies, heavyweight tees, cargos and varsity pieces — produced for emerging labels and established streetwear houses in the US, EU and UAE markets.",
    image: streetwear,
    details: ["320–500 GSM heavyweight fleece", "Garment dye & acid wash", "Puff print, embroidery, applique", "Low MOQs for emerging brands"],
  },
  {
    slug: "leisurewear",
    name: "Leisurewear",
    short: "Lifestyle Comfort",
    description:
      "Elevated lifestyle clothing in cashmere blends, organic cotton and bamboo viscose — engineered for premium loungewear lines that demand softness, structure and a luxury hand feel.",
    image: leisure,
    details: ["Cashmere & bamboo blends", "Pre-shrunk & enzyme washed", "Tonal trims & woven labels", "Sustainable fabric sourcing"],
  },
  {
    slug: "nightwear",
    name: "Nightwear",
    short: "Soft Luxury Indoor",
    description:
      "Soft luxury nightwear and intimate loungewear in mulberry silk, modal and brushed cotton — finished with French seams and delicate lace for boutique and department store programs.",
    image: nightwear,
    details: ["Mulberry silk & modal", "French-seam construction", "Lace & satin trims", "Gift-ready packaging"],
  },
];
