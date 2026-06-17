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
import bavD1 from "@/assets/products/bavarian-detail-1.jpg";
import bavD2 from "@/assets/products/bavarian-detail-2.jpg";

import sp1 from "@/assets/products/sportswear-1.jpg";
import sp2 from "@/assets/products/sportswear-2.jpg";
import sp3 from "@/assets/products/sportswear-3.jpg";
import sp4 from "@/assets/products/sportswear-4.jpg";
import spD1 from "@/assets/products/sportswear-detail-1.jpg";
import spD2 from "@/assets/products/sportswear-detail-2.jpg";

import lt1 from "@/assets/products/leather-1.jpg";
import lt2 from "@/assets/products/leather-2.jpg";
import lt3 from "@/assets/products/leather-3.jpg";
import lt4 from "@/assets/products/leather-4.jpg";
import ltD1 from "@/assets/products/leather-detail-1.jpg";
import ltD2 from "@/assets/products/leather-detail-2.jpg";

import st1 from "@/assets/products/streetwear-1.jpg";
import st2 from "@/assets/products/streetwear-2.jpg";
import st3 from "@/assets/products/streetwear-3.jpg";
import st4 from "@/assets/products/streetwear-4.jpg";
import stD1 from "@/assets/products/streetwear-detail-1.jpg";
import stD2 from "@/assets/products/streetwear-detail-2.jpg";

import ls1 from "@/assets/products/leisure-1.jpg";
import ls2 from "@/assets/products/leisure-2.jpg";
import ls3 from "@/assets/products/leisure-3.jpg";
import ls4 from "@/assets/products/leisure-4.jpg";
import lsD1 from "@/assets/products/leisure-detail-1.jpg";
import lsD2 from "@/assets/products/leisure-detail-2.jpg";

import nw1 from "@/assets/products/nightwear-1.jpg";
import nw2 from "@/assets/products/nightwear-2.jpg";
import nw3 from "@/assets/products/nightwear-3.jpg";
import nw4 from "@/assets/products/nightwear-4.jpg";
import nwD1 from "@/assets/products/nightwear-detail-1.jpg";
import nwD2 from "@/assets/products/nightwear-detail-2.jpg";

export type ProductSpec = { label: string; value: string };

export type Product = {
  name: string;
  image: string;
  gallery: string[];
  description: string;
  specs: string[];
  details: ProductSpec[];
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

// Helpers to keep per-product spec sheets concise but rich
const mk = (
  fabric: string,
  gsm: string,
  moq: string,
  leadTime: string,
  sizes: string,
  colors: string,
  packaging: string,
  certs: string,
  customization: string
): ProductSpec[] => [
  { label: "Fabric", value: fabric },
  { label: "Weight / GSM", value: gsm },
  { label: "MOQ", value: moq },
  { label: "Lead Time", value: leadTime },
  { label: "Sizes", value: sizes },
  { label: "Colors", value: colors },
  { label: "Packaging", value: packaging },
  { label: "Certifications", value: certs },
  { label: "Customization", value: customization },
];

export const CATEGORIES: Category[] = [
  {
    slug: "bavarian",
    catalog: "/catalogs/bavarian-catalog.pdf",
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
        gallery: [bav1, bavD1, bavD2],
        description:
          "Traditional men's lederhosen crafted from deer suede with hand-embroidered front panel, antler-style buttons and matching check shirt — a complete Oktoberfest set ready for European retail floors.",
        specs: ["Genuine deer suede", "Hand embroidery", "Antler buttons", "Sizes 44–60"],
        details: mk(
          "100% genuine deer suede leather, 1.2–1.4mm",
          "Suede 220–260 GSM equivalent",
          "50 sets per design / color",
          "45–60 days FOB Karachi",
          "EU 44–60 (men), custom sizing on request",
          "Antique brown, black, grey, custom dyes",
          "Individual poly bag + branded gift box",
          "OEKO-TEX Standard 100, REACH compliant",
          "Private label, custom embroidery, branded hangtags & labels",
        ),
      },
      {
        name: "Alpine Dirndl Dress",
        image: bav2,
        gallery: [bav2, bavD2, bavD1],
        description:
          "Women's dirndl in stonewashed cotton with floral embroidered bodice, puff-sleeve blouse and apron — finished with delicate lace trim for boutique trachten collections.",
        specs: ["Cotton & linen blend", "Floral embroidery", "Lace trim apron", "Sizes XS–XXL"],
        details: mk(
          "Cotton-linen blend bodice, cotton voile blouse",
          "180–220 GSM",
          "50 pieces per style",
          "40–55 days",
          "XS–XXL, custom plus sizes available",
          "Burgundy, forest green, navy, pastel ranges",
          "Tissue wrap + branded box",
          "OEKO-TEX, GOTS option",
          "Custom prints, embroidery, lace trims, branded labels",
        ),
      },
      {
        name: "Trachten Vest & Shirt",
        image: bav3,
        gallery: [bav3, bavD1, bavD2],
        description:
          "Embroidered linen waistcoat paired with a crisp white trachten shirt — a refined formal trachten look for premium menswear ranges and seasonal collections.",
        specs: ["Linen waistcoat", "Tonal embroidery", "Pure cotton shirt", "Slim & regular fit"],
        details: mk(
          "Pure linen vest, 100% cotton poplin shirt",
          "Vest 240 GSM / shirt 130 GSM",
          "50 sets",
          "45 days",
          "S–XXXL slim & regular",
          "Charcoal, loden green, cream, custom",
          "Poly bag + cardboard insert",
          "OEKO-TEX 100",
          "Embroidery, fabric swap, branded trims",
        ),
      },
      {
        name: "Kids Lederhosen Outfit",
        image: bav4,
        gallery: [bav4, bavD2, bavD1],
        description:
          "Pint-sized lederhosen with embroidered suspenders and matching shirt — durable suede construction built to survive festival season while looking heirloom-grade.",
        specs: ["Soft kid suede", "Adjustable straps", "Floral embroidery", "Ages 2–14"],
        details: mk(
          "Soft kid suede 0.9–1.1mm + cotton check shirt",
          "Suede equivalent 180 GSM",
          "50 sets per design",
          "40 days",
          "Ages 2–14 (EU 92–164)",
          "Brown, tan, black + custom",
          "Branded gift box",
          "OEKO-TEX 100, CPSIA compliant",
          "Embroidery, sizing, branded labels & tags",
        ),
      },
    ],
  },
  {
    slug: "sportswear",
    catalog: "/catalogs/sportswear-catalog.pdf",
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
        gallery: [sp1, spD1, spD2],
        description:
          "Full sublimation soccer jersey and shorts in lightweight micro-mesh polyester — fully customizable colorways, crests and player names for clubs and academies.",
        specs: ["140 GSM micro-mesh", "Full sublimation print", "Custom crest & numbers", "MOQ 50 sets"],
        details: mk(
          "100% polyester micro-mesh interlock",
          "140 GSM",
          "50 sets per design",
          "25–35 days",
          "XS–4XL adult + youth 6–16",
          "Unlimited via sublimation",
          "Individual poly bag + team carton",
          "OEKO-TEX 100, WFSGI compliant",
          "Full sublimation, names/numbers, sponsor logos",
        ),
      },
      {
        name: "Performance Tracksuit",
        image: sp2,
        gallery: [sp2, spD2, spD1],
        description:
          "Tailored tracksuit in technical poly-spandex with bonded seams, hidden zip pockets and reflective piping — engineered for warmup, training and lifestyle wear.",
        specs: ["Poly-spandex shell", "Bonded seams", "Hidden zip pockets", "Reflective piping"],
        details: mk(
          "94% polyester / 6% spandex tricot",
          "260 GSM",
          "50 sets per color",
          "35–45 days",
          "XS–3XL",
          "Black, navy, grey, custom Pantone",
          "Poly bag + master carton",
          "OEKO-TEX 100",
          "Embroidery, heat transfer, reflective trims, custom hardware",
        ),
      },
      {
        name: "Compression Training Set",
        image: sp3,
        gallery: [sp3, spD1, spD2],
        description:
          "Second-skin compression top and shorts with targeted muscle support panels and moisture-wicking finish — built for athletes, gyms and performance brands.",
        specs: ["Nylon-spandex", "Flatlock stitching", "Anti-microbial finish", "4-way stretch"],
        details: mk(
          "80% nylon / 20% spandex 4-way stretch",
          "200 GSM",
          "50 sets per color",
          "30–40 days",
          "XS–2XL men/women",
          "Black, navy, charcoal, custom",
          "Poly bag + hangtag",
          "OEKO-TEX 100, bluesign option",
          "Sublimation panels, branded waistband, custom prints",
        ),
      },
      {
        name: "Basketball Uniform Set",
        image: sp4,
        gallery: [sp4, spD2, spD1],
        description:
          "Sublimated basketball jersey and shorts in premium tricot mesh with reinforced stitching and custom team graphics — tournament-ready and league approved.",
        specs: ["Tricot mesh", "Sublimated graphics", "Reinforced stitching", "Men / Women / Youth"],
        details: mk(
          "100% polyester tricot mesh",
          "160 GSM",
          "50 sets per team",
          "30 days",
          "Youth S – Adult 4XL",
          "Unlimited via sublimation",
          "Individual poly bag + team carton",
          "OEKO-TEX 100",
          "Full sublimation, names, numbers, sponsor placements",
        ),
      },
    ],
  },
  {
    slug: "leatherwear",
    catalog: "/catalogs/leatherwear-catalog.pdf",
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
        gallery: [lt1, ltD1, ltD2],
        description:
          "Iconic asymmetric biker in full-grain cowhide with quilted shoulder panels, YKK zippers and adjustable belt — an enduring silhouette for premium outerwear ranges.",
        specs: ["Full-grain cowhide", "Quilted satin lining", "YKK metal hardware", "Hand-finished edges"],
        details: mk(
          "Full-grain cowhide 1.0–1.2mm, quilted satin lining",
          "Leather equivalent 380 GSM",
          "50 pieces per design",
          "55–70 days",
          "XS–3XL slim & regular",
          "Black, brown, cognac, oxblood, custom",
          "Hanger pack + suit bag + branded box",
          "LWG certified leather, REACH compliant",
          "Custom hardware, embossing, branded labels & lining",
        ),
      },
      {
        name: "Napa Moto Jacket — Women",
        image: lt2,
        gallery: [lt2, ltD2, ltD1],
        description:
          "Women's moto jacket in butter-soft napa lambskin with sculpted lapels and slim-fit construction — a refined wardrobe staple for premium boutiques.",
        specs: ["Napa lambskin", "Slim tailored fit", "Hidden side pockets", "XS–XXL"],
        details: mk(
          "Napa lambskin 0.7–0.9mm, viscose lining",
          "Leather equivalent 280 GSM",
          "50 pieces per design",
          "50–65 days",
          "XS–XXL women",
          "Black, taupe, cognac, blush, custom",
          "Hanger pack + suit bag",
          "LWG leather, OEKO-TEX lining",
          "Custom panels, embossing, branded trims",
        ),
      },
      {
        name: "Leather Trousers",
        image: lt3,
        gallery: [lt3, ltD1, ltD2],
        description:
          "Tailored leather pants in supple lambskin with bonded interior lining and contoured seams — designed to drape like fabric and last for seasons.",
        specs: ["Supple lambskin", "Bonded lining", "Five-pocket cut", "Custom inseam"],
        details: mk(
          "Lambskin 0.6–0.8mm, bonded jersey lining",
          "Leather equivalent 240 GSM",
          "50 pieces per design",
          "50 days",
          "Waist 26–40, custom inseam",
          "Black, brown, custom",
          "Hanger pack",
          "LWG leather",
          "Custom rise, leg shape, hardware",
        ),
      },
      {
        name: "Leather Bomber Jacket",
        image: lt4,
        gallery: [lt4, ltD2, ltD1],
        description:
          "Classic bomber silhouette in rich cognac leather with ribbed cuffs and hem, two-way zipper and quilted interior — an effortless luxury layering piece.",
        specs: ["Cognac cowhide", "Rib-knit cuffs & hem", "Two-way YKK zip", "Quilted lining"],
        details: mk(
          "Cowhide 1.0mm, quilted poly lining, rib-knit trims",
          "Leather equivalent 360 GSM",
          "50 pieces",
          "55–70 days",
          "S–3XL",
          "Cognac, black, navy, olive",
          "Suit bag + branded box",
          "LWG leather, REACH",
          "Custom embroidery, patches, branded hardware",
        ),
      },
    ],
  },
  {
    slug: "streetwear",
    catalog: "/catalogs/streetwear-catalog.pdf",
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
        gallery: [st1, stD1, stD2],
        description:
          "500 GSM brushed-back fleece hoodie with boxy drop-shoulder fit, double-needle stitching and self-fabric drawcords — the foundation of any premium streetwear drop.",
        specs: ["500 GSM French terry", "Drop shoulder cut", "Garment dyed", "Custom prints & embroidery"],
        details: mk(
          "100% cotton French terry, brushed back",
          "500 GSM",
          "50 pieces per color (low MOQ start-up program)",
          "30–40 days",
          "XS–3XL unisex",
          "Garment dye — any Pantone",
          "Poly bag + branded hangtag",
          "OEKO-TEX 100, BCI cotton option",
          "Puff print, embroidery, screen, DTG, custom trims",
        ),
      },
      {
        name: "Boxy Heavyweight Tee",
        image: st2,
        gallery: [st2, stD2, stD1],
        description:
          "Heavyweight 240 GSM cotton tee with boxy silhouette, ribbed collar and space for puff print, embroidery or DTG graphics — a streetwear essential built to last.",
        specs: ["240 GSM combed cotton", "Boxy oversized fit", "Ribbed collar", "Puff print ready"],
        details: mk(
          "100% combed ring-spun cotton",
          "240 GSM",
          "50 pieces per color",
          "25–35 days",
          "XS–3XL unisex",
          "Garment dyed, any Pantone",
          "Folded + poly bag + hangtag",
          "OEKO-TEX 100",
          "Puff, screen, DTG, embroidery, custom labels",
        ),
      },
      {
        name: "Cargo Pants",
        image: st3,
        gallery: [st3, stD1, stD2],
        description:
          "Technical cargo pants in heavyweight ripstop with utility side pockets, tonal hardware and adjustable elastic hem — modern utility for forward-thinking labels.",
        specs: ["Ripstop cotton", "Utility pockets", "Elastic ankle cuffs", "Garment washed"],
        details: mk(
          "100% cotton ripstop or poly-cotton blend",
          "320 GSM",
          "50 pieces per color",
          "35–45 days",
          "Waist 28–40",
          "Black, olive, sand, custom",
          "Folded + poly bag",
          "OEKO-TEX 100",
          "Custom pockets, trims, embroidery, branded hardware",
        ),
      },
      {
        name: "Varsity Letterman Jacket",
        image: st4,
        gallery: [st4, stD2, stD1],
        description:
          "Wool body with leather sleeves, chenille patches, snap front and ribbed trims — a classic varsity silhouette executed with luxury construction details.",
        specs: ["Melton wool body", "Leather sleeves", "Chenille patches", "Snap-front closure"],
        details: mk(
          "Melton wool body, cowhide sleeves, quilted lining",
          "Wool 700 GSM",
          "50 pieces per design",
          "55–70 days",
          "S–3XL",
          "Any wool/leather combo",
          "Hanger pack + branded box",
          "OEKO-TEX, LWG leather",
          "Chenille patches, embroidery, custom snaps & lining",
        ),
      },
    ],
  },
  {
    slug: "leisurewear",
    catalog: "/catalogs/leisurewear-catalog.pdf",
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
        gallery: [ls1, lsD1, lsD2],
        description:
          "Relaxed kimono-style top and wide-leg pant in a cashmere-cotton blend — featherweight warmth and a luxury drape for premium lounge collections.",
        specs: ["Cashmere-cotton blend", "Wide-leg cut", "Self-tie waist", "Hand wash"],
        details: mk(
          "30% cashmere / 70% combed cotton",
          "260 GSM",
          "50 sets per color",
          "40–50 days",
          "XS–XL",
          "Oatmeal, charcoal, blush, custom",
          "Tissue + branded box",
          "OEKO-TEX 100, RWS cashmere option",
          "Custom labels, embroidery, packaging",
        ),
      },
      {
        name: "Organic Cotton Joggers & Crew",
        image: ls2,
        gallery: [ls2, lsD2, lsD1],
        description:
          "Pre-shrunk organic cotton fleece set with tonal flat drawcord, ribbed cuffs and tapered leg — minimalist lounge essentials for sustainable labels.",
        specs: ["320 GSM organic cotton", "Tapered leg", "Tonal trims", "GOTS certified option"],
        details: mk(
          "100% organic cotton French terry",
          "320 GSM",
          "50 sets per color",
          "35–45 days",
          "XS–3XL unisex",
          "Natural, sage, dusty pink, custom",
          "Recycled poly bag + hangtag",
          "GOTS, OEKO-TEX 100",
          "Embroidery, screen, custom trims",
        ),
      },
      {
        name: "Bamboo Tee & Shorts Set",
        image: ls3,
        gallery: [ls3, lsD1, lsD2],
        description:
          "Breathable bamboo viscose set with relaxed boxy tee and elastic-waist shorts — silky hand feel and natural antibacterial properties for warm-weather lounge.",
        specs: ["Bamboo viscose", "Relaxed boxy fit", "Elastic drawstring waist", "Naturally antibacterial"],
        details: mk(
          "95% bamboo viscose / 5% spandex",
          "180 GSM",
          "50 sets per color",
          "30–40 days",
          "XS–2XL",
          "Cream, sage, sky, custom",
          "Recycled poly bag",
          "OEKO-TEX 100, FSC bamboo",
          "Custom labels, prints, embroidery",
        ),
      },
      {
        name: "Knit Cardigan & Pant",
        image: ls4,
        gallery: [ls4, lsD2, lsD1],
        description:
          "Ribbed knit cardigan paired with matching wide-leg pant in soft oatmeal — a refined co-ord built for elevated everyday wear and resort retail.",
        specs: ["Cotton-modal knit", "Coconut shell buttons", "Wide-leg pant", "Co-ord styling"],
        details: mk(
          "65% cotton / 35% modal rib knit",
          "240 GSM",
          "50 sets per color",
          "40 days",
          "XS–XL",
          "Oatmeal, ivory, sage, custom",
          "Tissue + recycled box",
          "OEKO-TEX 100",
          "Custom buttons, labels, packaging",
        ),
      },
    ],
  },
  {
    slug: "nightwear",
    catalog: "/catalogs/nightwear-catalog.pdf",
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
        gallery: [nw1, nwD1, nwD2],
        description:
          "19 momme mulberry silk pajama set with notched lapel, mother-of-pearl buttons and delicate lace detailing — a true luxury sleep piece for boutique retail.",
        specs: ["19mm mulberry silk", "Mother-of-pearl buttons", "French seams", "Gift-ready box"],
        details: mk(
          "100% mulberry silk charmeuse 19mm",
          "Silk equivalent 90 GSM",
          "50 sets per color",
          "45–55 days",
          "XS–XL",
          "Champagne, blush, navy, black, custom",
          "Silk pouch + branded gift box",
          "OEKO-TEX 100, GOTS silk option",
          "Monogram embroidery, custom piping & packaging",
        ),
      },
      {
        name: "Lace-Trim Modal Slip",
        image: nw2,
        gallery: [nw2, nwD2, nwD1],
        description:
          "Bias-cut modal slip with stretch lace bodice and adjustable straps — a delicate, breathable nightdress designed to drape beautifully on every silhouette.",
        specs: ["Tencel modal", "Stretch lace bodice", "Adjustable straps", "Machine washable"],
        details: mk(
          "95% Tencel modal / 5% elastane, stretch lace bodice",
          "120 GSM",
          "50 pieces per color",
          "35–45 days",
          "XS–2XL",
          "Black, ivory, dusty rose, custom",
          "Tissue + branded box",
          "OEKO-TEX 100, Tencel certified",
          "Custom lace placement, embroidery, packaging",
        ),
      },
      {
        name: "Brushed Cotton Pajama",
        image: nw3,
        gallery: [nw3, nwD1, nwD2],
        description:
          "Classic notched-collar pajama set in soft brushed cotton with contrast piping and chest pocket — relaxed tailoring designed for year-round comfort.",
        specs: ["Brushed cotton flannel", "Contrast piping", "Notch collar", "Unisex sizing available"],
        details: mk(
          "100% brushed cotton flannel",
          "180 GSM",
          "50 sets per color",
          "35–45 days",
          "XS–3XL unisex",
          "Check, stripe, solid — any custom",
          "Poly bag + branded box",
          "OEKO-TEX 100, BCI cotton",
          "Custom prints, embroidery, branded trims",
        ),
      },
      {
        name: "Satin Robe",
        image: nw4,
        gallery: [nw4, nwD2, nwD1],
        description:
          "Mid-length satin robe with self-tie belt, kimono sleeves and inner ties — a luxe layering piece equally suited to boutique sleepwear and bridal programs.",
        specs: ["Heavy satin", "Self-tie belt", "Inseam pockets", "11 standard colors"],
        details: mk(
          "Poly satin or silk satin upgrade",
          "Poly 140 GSM / silk 19mm",
          "50 pieces per color",
          "30–40 days",
          "XS–2XL + plus on request",
          "11 standard + custom Pantone",
          "Tissue + branded box",
          "OEKO-TEX 100",
          "Monogram, lace trim, bridal/event packaging",
        ),
      },
    ],
  },
];
