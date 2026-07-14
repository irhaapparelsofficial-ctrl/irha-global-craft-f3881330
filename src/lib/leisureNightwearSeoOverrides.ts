import {
  PRODUCT_SEO_OVERRIDES,
  type ProductSeoOverride,
} from "@/lib/productSeoOverrides";

type LifestyleOverrideInput = {
  productName: string;
  buyerPrograms: string;
  construction: string;
  customization: string;
};

const lifestyleOverride = ({
  productName,
  buyerPrograms,
  construction,
  customization,
}: LifestyleOverrideInput): ProductSeoOverride => ({
  description:
    `${productName} developed for ${buyerPrograms}, wholesale, OEM and private-label programs. ` +
    `${construction}, material composition, fabric weight, surface finish where applicable, fit, colour, trims, sizing, labelling and packing are confirmed against the buyer-approved sample and order specification.`,
  shortDescription:
    `Custom ${productName.toLowerCase()} for ${buyerPrograms}, wholesale and private-label collections.`,
  specs: [
    construction,
    "Material composition and fabric weight confirmed by approved sample",
    customization,
    "Fit, colour, finish and size grading confirmed by buyer brief",
    "Private-label labels, trims and packaging available",
  ],
  seoTitle: `${productName} Manufacturer & Private Label Supplier | Irha Apparels`,
  seoDescription:
    `Custom ${productName.toLowerCase()} manufacturing for ${buyerPrograms}, wholesalers and private-label buyers, with material, construction, fit, sizing and branding confirmed by specification.`,
});

export const LEISURE_NIGHTWEAR_SEO_OVERRIDES: Record<string, ProductSeoOverride> = {
  "casual-button-up-shirt": lifestyleOverride({
    productName: "Casual Button-Up Shirt",
    buyerPrograms: "casualwear brands and retail basics buyers",
    construction:
      "Collar, front placket, yoke, pocket, sleeve, cuff and hem construction developed from the approved shirt sample",
    customization:
      "Button, pocket, embroidery, print, label and trim treatment confirmed by buyer brief",
  }),
  "essential-v-neck-t-shirt": lifestyleOverride({
    productName: "Essential V-Neck T-Shirt",
    buyerPrograms: "casualwear brands and retail basics buyers",
    construction:
      "V-neck shape, shoulder, sleeve, body fit and hem construction developed from the approved T-shirt sample",
    customization:
      "Artwork placement, print, embroidery, neck label and trim treatment confirmed by buyer brief",
  }),
  "henley-long-sleeve-shirt": lifestyleOverride({
    productName: "Henley Long-Sleeve Shirt",
    buyerPrograms: "casualwear brands and retail basics buyers",
    construction:
      "Henley neckline, button placket, shoulder, sleeve, cuff, body fit and hem developed from the approved sample",
    customization:
      "Button, artwork, embroidery, print, label and trim treatment confirmed by buyer brief",
  }),
  "pique-polo-shirt": lifestyleOverride({
    productName: "Pique Polo Shirt",
    buyerPrograms: "casualwear brands, uniform buyers and retailers",
    construction:
      "Collar, button placket, shoulder, sleeve, cuff, side seam and hem developed from the approved polo sample",
    customization:
      "Embroidery, print, button, label and trim treatment confirmed by buyer brief",
  }),
  "premium-basic-crewneck-tee": lifestyleOverride({
    productName: "Basic Crewneck T-Shirt",
    buyerPrograms: "casualwear brands and retail basics buyers",
    construction:
      "Crew neckline, shoulder, sleeve, body fit and hem construction developed from the approved T-shirt sample",
    customization:
      "Artwork placement, print, embroidery, neck label and trim treatment confirmed by buyer brief",
  }),
  "lounge-shorts": lifestyleOverride({
    productName: "Lounge Shorts",
    buyerPrograms: "loungewear brands, hospitality buyers and retailers",
    construction:
      "Rise, waistband, drawcord, pocket, inseam and hem construction developed from the approved shorts sample",
    customization:
      "Pocket, drawcord, artwork, label and trim treatment confirmed by buyer brief",
  }),
  "premium-chino-shorts": lifestyleOverride({
    productName: "Chino Shorts",
    buyerPrograms: "casualwear brands, uniform buyers and retailers",
    construction:
      "Rise, waistband, fly, belt loop, pocket, inseam and hem construction developed from the approved chino sample",
    customization:
      "Pocket, button, hardware, label and trim treatment confirmed by buyer brief",
  }),
  "cotton-nightshirt": lifestyleOverride({
    productName: "Nightshirt",
    buyerPrograms: "sleepwear brands, hospitality buyers and retailers",
    construction:
      "Neckline or collar, front opening, shoulder, sleeve, cuff, body length and hem developed from the approved nightshirt sample",
    customization:
      "Print, embroidery, piping, button, label and trim treatment confirmed by buyer brief",
  }),
  "cotton-sleep-pants": lifestyleOverride({
    productName: "Sleep Pants",
    buyerPrograms: "sleepwear brands, hospitality buyers and retailers",
    construction:
      "Rise, waistband, drawcord, pocket, leg profile and hem developed from the approved sleep-pant sample",
    customization:
      "Print, embroidery, piping, label and trim treatment confirmed by buyer brief",
  }),
  "sleep-shorts-set": lifestyleOverride({
    productName: "Sleep Shorts Set",
    buyerPrograms: "sleepwear brands, hospitality buyers and retailers",
    construction:
      "Top and short neckline, sleeve, waistband, rise, inseam and hem construction coordinated from the approved set",
    customization:
      "Print, embroidery, piping, button, label and trim treatment confirmed by buyer brief",
  }),
  "sleep-t-shirt": lifestyleOverride({
    productName: "Sleep T-Shirt",
    buyerPrograms: "sleepwear brands, hospitality buyers and retailers",
    construction:
      "Neckline, shoulder, sleeve, body fit and hem construction developed from the approved sleep-tee sample",
    customization:
      "Print, embroidery, artwork, label and trim treatment confirmed by buyer brief",
  }),
  "plush-bathrobe-sleep-robe": lifestyleOverride({
    productName: "Bathrobe / Sleep Robe",
    buyerPrograms: "sleepwear brands, hospitality buyers and retailers",
    construction:
      "Collar or hood, front overlap, belt, loop, pocket, sleeve, cuff and hem developed from the approved robe sample",
    customization:
      "Embroidery, piping, pocket, belt, label and trim treatment confirmed by buyer brief",
  }),
  "silk-nightgown-slip": lifestyleOverride({
    productName: "Nightgown Slip",
    buyerPrograms: "sleepwear brands, boutique buyers and retailers",
    construction:
      "Neckline, strap, bust shaping, side seam, body length and hem developed from the approved slip sample",
    customization:
      "Lace or decorative trim, embroidery, print, label and finish confirmed by buyer brief",
  }),
};

let registered = false;

export function registerLeisureNightwearSeoOverrides(): void {
  if (registered) return;
  Object.assign(PRODUCT_SEO_OVERRIDES, LEISURE_NIGHTWEAR_SEO_OVERRIDES);
  registered = true;
}
