export type QuotationBrief = {
  buyerReference: string;
  buyerName: string;
  company: string;
  product: string;
  material: string;
  quantity: string;
  sizeRange: string;
  colours: string;
  branding: string;
  labelsTags: string;
  packaging: string;
  destination: string;
  shippingScope: string;
  incoterm: string;
  currency: string;
  targetTiming: string;
  sampleRequirement: string;
  referenceFiles: string;
  notes: string;
};

export type QuotationReadinessResult = {
  score: number;
  readyForOwnerPricingReview: boolean;
  requiredMissing: string[];
  recommendedMissing: string[];
};

export const EMPTY_QUOTATION_BRIEF: QuotationBrief = {
  buyerReference: "",
  buyerName: "",
  company: "",
  product: "",
  material: "",
  quantity: "",
  sizeRange: "",
  colours: "",
  branding: "",
  labelsTags: "",
  packaging: "",
  destination: "",
  shippingScope: "",
  incoterm: "",
  currency: "USD",
  targetTiming: "",
  sampleRequirement: "",
  referenceFiles: "",
  notes: "",
};

const REQUIRED: Array<[keyof QuotationBrief, string]> = [
  ["buyerName", "buyer name"],
  ["product", "product/style"],
  ["material", "material specification"],
  ["quantity", "estimated quantity"],
  ["sizeRange", "size range"],
  ["destination", "destination country"],
  ["shippingScope", "shipping scope"],
  ["incoterm", "Incoterm"],
  ["currency", "currency"],
];

const RECOMMENDED: Array<[keyof QuotationBrief, string]> = [
  ["colours", "colour breakdown"],
  ["branding", "printing/embroidery/branding"],
  ["labelsTags", "labels and tags"],
  ["packaging", "packaging"],
  ["targetTiming", "target timing"],
  ["sampleRequirement", "sample requirement"],
  ["referenceFiles", "tech pack or reference"],
];

function present(value: string) {
  const normalized = value.trim();
  return normalized.length > 0 && !/^(unknown|tbd|n\/a|not provided)$/i.test(normalized);
}

export function quotationReadiness(brief: QuotationBrief): QuotationReadinessResult {
  const requiredMissing = REQUIRED.filter(([key]) => !present(brief[key])).map(([, label]) => label);
  const recommendedMissing = RECOMMENDED.filter(([key]) => !present(brief[key])).map(([, label]) => label);
  const requiredComplete = REQUIRED.length - requiredMissing.length;
  const recommendedComplete = RECOMMENDED.length - recommendedMissing.length;
  const score = Math.round(((requiredComplete * 2 + recommendedComplete) / (REQUIRED.length * 2 + RECOMMENDED.length)) * 100);
  return {
    score,
    readyForOwnerPricingReview: requiredMissing.length === 0,
    requiredMissing,
    recommendedMissing,
  };
}

export function quotationBriefText(brief: QuotationBrief) {
  return [
    "IRHA APPARELS — QUOTATION REVIEW BRIEF",
    "",
    `Buyer reference: ${brief.buyerReference || "Not assigned"}`,
    `Buyer: ${brief.buyerName || "Missing"}`,
    `Company: ${brief.company || "Not provided"}`,
    "",
    `Product/style: ${brief.product || "Missing"}`,
    `Material specification: ${brief.material || "Missing"}`,
    `Estimated quantity: ${brief.quantity || "Missing"}`,
    `Size range/split: ${brief.sizeRange || "Missing"}`,
    `Colours: ${brief.colours || "Not provided"}`,
    `Branding/decoration: ${brief.branding || "Not provided"}`,
    `Labels/tags: ${brief.labelsTags || "Not provided"}`,
    `Packaging: ${brief.packaging || "Not provided"}`,
    "",
    `Destination: ${brief.destination || "Missing"}`,
    `Shipping scope: ${brief.shippingScope || "Missing"}`,
    `Incoterm: ${brief.incoterm || "Missing"}`,
    `Currency: ${brief.currency || "Missing"}`,
    `Target timing: ${brief.targetTiming || "Not provided"}`,
    `Sample requirement: ${brief.sampleRequirement || "Not provided"}`,
    `Reference/tech pack: ${brief.referenceFiles || "Not provided"}`,
    `Notes: ${brief.notes || "None"}`,
    "",
    "OWNER REVIEW REQUIRED BEFORE:",
    "- Unit price or total value",
    "- Discount or concession",
    "- Payment terms",
    "- Production/delivery commitment",
    "- Final quotation or PI issue",
  ].join("\n");
}
