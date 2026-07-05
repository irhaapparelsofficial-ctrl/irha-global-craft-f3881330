// AUTO-GENERATED.
export type FeaturedProduct = {
  sku: string;
  title: string;
  description: string;
  longDescription: string;
  image: string;
  categorySlug: string;
  categoryName: string;
  productSlug: string;
  moq: string;
  leadTime: string;
  badge: string;
  material: string;
};

export const FEATURED_PRODUCTS: FeaturedProduct[] = [
  {
    sku: "IRH-BAV-001",
    title: "Traditional Lederhosen",
    description:
      "Handcrafted traditional lederhosen in authentic Alpine tradition — premium fabrics, ornate detailing and heritage construction for Oktoberfest retailers and trachten boutiques across Germany & Austria.",
    longDescription:
      "Our flagship Traditional Lederhosen are tailored from 1.2–1.4mm aniline-finished cowhide suede with hand-embroidered edelweiss panels, antique-brass H-bar suspenders and corozo buttons. Every pair is bench-cut in Sialkot by trachten-trained tailors, then conditioned, hand-stitched and quality-graded against German Lederhosen norms. Sizes EU 44–60 (kurze & kniebund), private-label leather patch, hangtag and Oktoberfest-ready polybag included. Built for German, Austrian and Swiss wholesalers who supply Oktoberfest, Volksfest and trachten boutiques.",
    image: "/__l5e/assets-v1/c4c83428-e348-4701-91db-ab6d6416845d/irha-0073.jpg",
    categorySlug: "bavarian",
    categoryName: "Bavarian Wear",
    productSlug: "lederhosen",
    moq: "MOQ: flexible per design and color",
    leadTime: "lead time confirmed per program",
    badge: "B2B",
    material:
      "1.2–1.4mm aniline cowhide suede + hand embroidery, antique-brass hardware, corozo buttons",
  },
  {
    sku: "IRH-LEA-002",
    title: "Full-Grain Leather Belt",
    description:
      "Premium full-grain leather belt with YKK hardware, bonded linings and hand-finished edges — built for luxury outerwear ranges.",
    longDescription:
      "Cut from 3.5–4mm full-grain milled cowhide, our Leather Belt is single-ply (no splits) with a hand-burnished edge, beeswax finish and recessed stitching at 6 SPI. Buckles are solid brass or matte gunmetal with a YKK-grade roller, secured by Chicago screws so end-buyers can swap hardware. Available in black, cognac, oxblood and tobacco; widths 30 / 35 / 40 mm; lengths 85–115 cm. Comes drawer-folded in kraft sleeves for boutique merchandising — ideal for luxury menswear, leather houses and private-label denim brands.",
    image: "/__l5e/assets-v1/43cc827e-3506-4c82-af42-3a384abd5d14/irha-0027.jpg",
    categorySlug: "leatherwear",
    categoryName: "Leatherwear",
    productSlug: "leather-belt",
    moq: "MOQ: flexible per style",
    leadTime: "lead time confirmed per program",
    badge: "B2B",
    material:
      "3.5–4mm full-grain milled cowhide + solid brass / gunmetal hardware, Chicago screws",
  },
  {
    sku: "IRH-SPO-003",
    title: "Zip-Up Fleece Jacket",
    description:
      "Competition-grade zip-up fleece jacket with full dye-sublimation, moisture-wicking polyester and 4-way stretch — engineered for teams, federations and pro sports programs.",
    longDescription:
      "Engineered as a training- and travel-layer for federations and clubs, the Zip-Up Fleece Jacket is built from 320 GSM brushed-back polyester fleece with a 4-way stretch face and anti-pill interior. Construction includes a full YKK reverse-coil zip with chin guard, raglan sleeves, side zipper pockets and bonded flatlock seams. Decoration options: full dye-sublimation, twill applique, silicone HD print and tackle-twill — all to spec. Standard size run XS–4XL, with women's, junior and tall blocks available. Used by sportswear brands, university programs and pro teams across the UK, USA, Germany and Australia.",
    image: "/__l5e/assets-v1/6ed8d48e-2b63-4777-a00d-32bdccbd5e05/irha-0109.jpg",
    categorySlug: "sportswear",
    categoryName: "Sportswear",
    productSlug: "zip-fleece-jacket",
    moq: "MOQ: flexible per kit and jersey",
    leadTime: "lead time confirmed per program",
    badge: "B2B",
    material:
      "320 GSM brushed-back polyester fleece, 4-way stretch + YKK reverse-coil zip, flatlock seams",
  },
  {
    sku: "IRH-STR-004",
    title: "Oversized Streetwear Hoodie",
    description:
      "Oversized Streetwear Hoodie in heavyweight French Terry with garment-dye finish and box-fit pattern — engineered for premium streetwear labels and private-label drops.",
    longDescription:
      "Cut on a true oversized boxy block (dropped shoulder, cropped length, wide ribbed hem), this hoodie is built from 480 GSM heavyweight French Terry — 100% ring-spun combed cotton, pre-shrunk and garment-dyed for a vintage hand. Construction details: double-needle topstitch, twin-needle hood with flat drawcords + metal tips, kangaroo pocket with bartacks, and a self-fabric inner neck tape. Decoration-ready for puff print, embroidery, screen print and woven labels. Standard XS–3XL block, color-matched to Pantone, packed individually in branded polybag with hangtag — the spec sheet streetwear labels in the USA, UK and EU ask for by name.",
    image: "/__l5e/assets-v1/62811c8d-8c61-41b4-b4d8-19ebb962dcd8/irha-0300.jpg",
    categorySlug: "streetwear",
    categoryName: "Streetwear",
    productSlug: "oversized-hoodie",
    moq: "MOQ: flexible per design and color",
    leadTime: "lead time confirmed per program",
    badge: "B2B",
    material:
      "480 GSM heavyweight French Terry (100% ring-spun combed cotton), garment-dyed",
  },
];

export const findFeaturedProduct = (
  categorySlug?: string,
  productSlug?: string,
): FeaturedProduct | undefined =>
  FEATURED_PRODUCTS.find(
    (p) => p.categorySlug === categorySlug && p.productSlug === productSlug,
  );
