import bavarian from "@/assets/cat-bavarian.jpg";
import sportswear from "@/assets/cat-sportswear.jpg";
import leather from "@/assets/cat-leather.jpg";
import streetwear from "@/assets/cat-streetwear.jpg";
import leisure from "@/assets/cat-leisure.jpg";
import nightwear from "@/assets/cat-nightwear.jpg";

import bav1 from "@/assets/products/bavarian-1.jpg";
import bav2 from "@/assets/products/bavarian-2.jpg";
import bav3 from "@/assets/products/bavarian-3.jpg";
import bav4 from "@/assets/products/bavarian-4.jpg";
import sp1 from "@/assets/products/sportswear-1.jpg";
import sp2 from "@/assets/products/sportswear-2.jpg";
import sp3 from "@/assets/products/sportswear-3.jpg";
import sp4 from "@/assets/products/sportswear-4.jpg";
import lt1 from "@/assets/products/leather-1.jpg";
import lt2 from "@/assets/products/leather-2.jpg";
import lt3 from "@/assets/products/leather-3.jpg";
import lt4 from "@/assets/products/leather-4.jpg";
import st1 from "@/assets/products/streetwear-1.jpg";
import st2 from "@/assets/products/streetwear-2.jpg";
import st3 from "@/assets/products/streetwear-3.jpg";
import st4 from "@/assets/products/streetwear-4.jpg";
import ls1 from "@/assets/products/leisure-1.jpg";
import ls2 from "@/assets/products/leisure-2.jpg";
import ls3 from "@/assets/products/leisure-3.jpg";
import ls4 from "@/assets/products/leisure-4.jpg";
import nw1 from "@/assets/products/nightwear-1.jpg";
import nw2 from "@/assets/products/nightwear-2.jpg";
import nw3 from "@/assets/products/nightwear-3.jpg";
import nw4 from "@/assets/products/nightwear-4.jpg";

export type Product = {
  name: string;
  image: string;
  description: string;
  specs: string[];
};

export type Category = {
  slug: string;
  name: string;
  short: string;
  description: string;
  image: string;
  details: string[];
  catalog: string;
  products: Product[];
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
    products: [
      {
        name: "Heritage Lederhosen Set",
        image: bav1,
        description:
          "Traditional men's lederhosen crafted from deer suede with hand-embroidered front panel, antler-style buttons and matching check shirt — a complete Oktoberfest set ready for European retail floors.",
        specs: ["Genuine deer suede", "Hand embroidery", "Antler buttons", "Sizes 44–60"],
      },
      {
        name: "Alpine Dirndl Dress",
        image: bav2,
        description:
          "Women's dirndl in stonewashed cotton with floral embroidered bodice, puff-sleeve blouse and apron — finished with delicate lace trim for boutique trachten collections.",
        specs: ["Cotton & linen blend", "Floral embroidery", "Lace trim apron", "Sizes XS–XXL"],
      },
      {
        name: "Trachten Vest & Shirt",
        image: bav3,
        description:
          "Embroidered linen waistcoat paired with a crisp white trachten shirt — a refined formal trachten look for premium menswear ranges and seasonal collections.",
        specs: ["Linen waistcoat", "Tonal embroidery", "Pure cotton shirt", "Slim & regular fit"],
      },
      {
        name: "Kids Lederhosen Outfit",
        image: bav4,
        description:
          "Pint-sized lederhosen with embroidered suspenders and matching shirt — durable suede construction built to survive festival season while looking heirloom-grade.",
        specs: ["Soft kid suede", "Adjustable straps", "Floral embroidery", "Ages 2–14"],
      },
    ],
  },
  {
    slug: "sportswear",
    name: "Sportswear",
    short: "Performance & Teamwear",
    description:
      "High-performance athletic wear and complete team uniform programs built with moisture-wicking technical fabrics, sublimation printing and reinforced stitching for clubs, leagues and athletic brands worldwide.",
    image: sportswear,
    details: ["Sublimation & screen print", "Compression & training kits", "Tracksuits, jerseys, shorts", "OEKO-TEX certified fabrics"],
    products: [
      {
        name: "Pro Sublimated Soccer Kit",
        image: sp1,
        description:
          "Full sublimation soccer jersey and shorts in lightweight micro-mesh polyester — fully customizable colorways, crests and player names for clubs and academies.",
        specs: ["140 GSM micro-mesh", "Full sublimation print", "Custom crest & numbers", "MOQ 50 sets"],
      },
      {
        name: "Performance Tracksuit",
        image: sp2,
        description:
          "Tailored tracksuit in technical poly-spandex with bonded seams, hidden zip pockets and reflective piping — engineered for warmup, training and lifestyle wear.",
        specs: ["Poly-spandex shell", "Bonded seams", "Hidden zip pockets", "Reflective piping"],
      },
      {
        name: "Compression Training Set",
        image: sp3,
        description:
          "Second-skin compression top and shorts with targeted muscle support panels and moisture-wicking finish — built for athletes, gyms and performance brands.",
        specs: ["Nylon-spandex", "Flatlock stitching", "Anti-microbial finish", "4-way stretch"],
      },
      {
        name: "Basketball Uniform Set",
        image: sp4,
        description:
          "Sublimated basketball jersey and shorts in premium tricot mesh with reinforced stitching and custom team graphics — tournament-ready and league approved.",
        specs: ["Tricot mesh", "Sublimated graphics", "Reinforced stitching", "Men / Women / Youth"],
      },
    ],
  },
  {
    slug: "leatherwear",
    name: "Leatherwear",
    short: "Luxury Leather Garments",
    description:
      "Premium leather jackets, biker apparel and refined outerwear cut from full-grain cowhide and napa lambskin — finished with YKK hardware and quilted satin linings worthy of luxury retail floors.",
    image: leather,
    details: ["Full-grain & napa leather", "YKK / RiRi hardware", "Bonded & quilted linings", "Bespoke pattern development"],
    products: [
      {
        name: "Classic Biker Jacket",
        image: lt1,
        description:
          "Iconic asymmetric biker in full-grain cowhide with quilted shoulder panels, YKK zippers and adjustable belt — an enduring silhouette for premium outerwear ranges.",
        specs: ["Full-grain cowhide", "Quilted satin lining", "YKK metal hardware", "Hand-finished edges"],
      },
        {
        name: "Napa Moto Jacket — Women",
        image: lt2,
        description:
          "Women's moto jacket in butter-soft napa lambskin with sculpted lapels and slim-fit construction — a refined wardrobe staple for premium boutiques.",
        specs: ["Napa lambskin", "Slim tailored fit", "Hidden side pockets", "XS–XXL"],
      },
      {
        name: "Leather Trousers",
        image: lt3,
        description:
          "Tailored leather pants in supple lambskin with bonded interior lining and contoured seams — designed to drape like fabric and last for seasons.",
        specs: ["Supple lambskin", "Bonded lining", "Five-pocket cut", "Custom inseam"],
      },
      {
        name: "Leather Bomber Jacket",
        image: lt4,
        description:
          "Classic bomber silhouette in rich cognac leather with ribbed cuffs and hem, two-way zipper and quilted interior — an effortless luxury layering piece.",
        specs: ["Cognac cowhide", "Rib-knit cuffs & hem", "Two-way YKK zip", "Quilted lining"],
      },
    ],
  },
  {
    slug: "streetwear",
    name: "Streetwear",
    short: "Urban Fashion Apparel",
    description:
      "Modern urban silhouettes — oversized hoodies, heavyweight tees, cargos and varsity pieces — produced for emerging labels and established streetwear houses in the US, EU and UAE markets.",
    image: streetwear,
    details: ["320–500 GSM heavyweight fleece", "Garment dye & acid wash", "Puff print, embroidery, applique", "Low MOQs for emerging brands"],
    products: [
      {
        name: "Heavyweight Oversized Hoodie",
        image: st1,
        description:
          "500 GSM brushed-back fleece hoodie with boxy drop-shoulder fit, double-needle stitching and self-fabric drawcords — the foundation of any premium streetwear drop.",
        specs: ["500 GSM French terry", "Drop shoulder cut", "Garment dyed", "Custom prints & embroidery"],
      },
      {
        name: "Boxy Heavyweight Tee",
        image: st2,
        description:
          "Heavyweight 240 GSM cotton tee with boxy silhouette, ribbed collar and space for puff print, embroidery or DTG graphics — a streetwear essential built to last.",
        specs: ["240 GSM combed cotton", "Boxy oversized fit", "Ribbed collar", "Puff print ready"],
      },
      {
        name: "Cargo Pants",
        image: st3,
        description:
          "Technical cargo pants in heavyweight ripstop with utility side pockets, tonal hardware and adjustable elastic hem — modern utility for forward-thinking labels.",
        specs: ["Ripstop cotton", "Utility pockets", "Elastic ankle cuffs", "Garment washed"],
      },
      {
        name: "Varsity Letterman Jacket",
        image: st4,
        description:
          "Wool body with leather sleeves, chenille patches, snap front and ribbed trims — a classic varsity silhouette executed with luxury construction details.",
        specs: ["Melton wool body", "Leather sleeves", "Chenille patches", "Snap-front closure"],
      },
    ],
  },
  {
    slug: "leisurewear",
    name: "Leisurewear",
    short: "Lifestyle Comfort",
    description:
      "Elevated lifestyle clothing in cashmere blends, organic cotton and bamboo viscose — engineered for premium loungewear lines that demand softness, structure and a luxury hand feel.",
    image: leisure,
    details: ["Cashmere & bamboo blends", "Pre-shrunk & enzyme washed", "Tonal trims & woven labels", "Sustainable fabric sourcing"],
    products: [
      {
        name: "Cashmere Blend Lounge Set",
        image: ls1,
        description:
          "Relaxed kimono-style top and wide-leg pant in a cashmere-cotton blend — featherweight warmth and a luxury drape for premium lounge collections.",
        specs: ["Cashmere-cotton blend", "Wide-leg cut", "Self-tie waist", "Hand wash"],
      },
      {
        name: "Organic Cotton Joggers & Crew",
        image: ls2,
        description:
          "Pre-shrunk organic cotton fleece set with tonal flat drawcord, ribbed cuffs and tapered leg — minimalist lounge essentials for sustainable labels.",
        specs: ["320 GSM organic cotton", "Tapered leg", "Tonal trims", "GOTS certified option"],
      },
      {
        name: "Bamboo Tee & Shorts Set",
        image: ls3,
        description:
          "Breathable bamboo viscose set with relaxed boxy tee and elastic-waist shorts — silky hand feel and natural antibacterial properties for warm-weather lounge.",
        specs: ["Bamboo viscose", "Relaxed boxy fit", "Elastic drawstring waist", "Naturally antibacterial"],
      },
      {
        name: "Knit Cardigan & Pant",
        image: ls4,
        description:
          "Ribbed knit cardigan paired with matching wide-leg pant in soft oatmeal — a refined co-ord built for elevated everyday wear and resort retail.",
        specs: ["Cotton-modal knit", "Coconut shell buttons", "Wide-leg pant", "Co-ord styling"],
      },
    ],
  },
  {
    slug: "nightwear",
    name: "Nightwear",
    short: "Soft Luxury Indoor",
    description:
      "Soft luxury nightwear and intimate loungewear in mulberry silk, modal and brushed cotton — finished with French seams and delicate lace for boutique and department store programs.",
    image: nightwear,
    details: ["Mulberry silk & modal", "French-seam construction", "Lace & satin trims", "Gift-ready packaging"],
    products: [
      {
        name: "Mulberry Silk Pajama Set",
        image: nw1,
        description:
          "19 momme mulberry silk pajama set with notched lapel, mother-of-pearl buttons and delicate lace detailing — a true luxury sleep piece for boutique retail.",
        specs: ["19mm mulberry silk", "Mother-of-pearl buttons", "French seams", "Gift-ready box"],
      },
      {
        name: "Lace-Trim Modal Slip",
        image: nw2,
        description:
          "Bias-cut modal slip with stretch lace bodice and adjustable straps — a delicate, breathable nightdress designed to drape beautifully on every silhouette.",
        specs: ["Tencel modal", "Stretch lace bodice", "Adjustable straps", "Machine washable"],
      },
      {
        name: "Brushed Cotton Pajama",
        image: nw3,
        description:
          "Classic notched-collar pajama set in soft brushed cotton with contrast piping and chest pocket — relaxed tailoring designed for year-round comfort.",
        specs: ["Brushed cotton flannel", "Contrast piping", "Notch collar", "Unisex sizing available"],
      },
      {
        name: "Satin Robe",
        image: nw4,
        description:
          "Mid-length satin robe with self-tie belt, kimono sleeves and inner ties — a luxe layering piece equally suited to boutique sleepwear and bridal programs.",
        specs: ["Heavy satin", "Self-tie belt", "Inseam pockets", "11 standard colors"],
      },
    ],
  },
];
