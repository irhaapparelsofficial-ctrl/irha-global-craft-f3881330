export type PublicFaq = {
  id: string;
  locale: string;
  category: string;
  question: string;
  answer: string;
  sort_order: number;
};

export const DEFAULT_FAQS: PublicFaq[] = [
  {
    id: "fallback-company-verification-scope",
    locale: "en",
    category: "Company & Verification",
    question: "What should a buyer verify before making a commitment?",
    answer: "Verify the relevant team, exact product and customization scope, program-specific evidence, written quotation and approval path before making a commercial commitment.",
    sort_order: 10,
  },
  {
    id: "fallback-company-factory-call",
    locale: "en",
    category: "Company & Verification",
    question: "Can I see the factory before placing an order?",
    answer: "You can request a scheduled live factory video call. The team confirms availability and the relevant viewing scope after reviewing your category and meeting request.",
    sort_order: 20,
  },
  {
    id: "fallback-company-verify",
    locale: "en",
    category: "Company & Verification",
    question: "How can my company verify Irha Apparels?",
    answer: "Share your business requirement, request a live call, review the quotation and program evidence, and confirm specifications, samples and commercial terms before committing to production.",
    sort_order: 30,
  },
  {
    id: "fallback-quotes-moq",
    locale: "en",
    category: "Quotes & MOQ",
    question: "What is your minimum order quantity?",
    answer: "MOQ is confirmed per program. It depends on the product, material, color split, customization, labels, packaging and production setup. Send the exact requirement for a reliable answer.",
    sort_order: 40,
  },
  {
    id: "fallback-quotes-prices",
    locale: "en",
    category: "Quotes & MOQ",
    question: "Why are prices not shown on the website?",
    answer: "Irha Apparels is a custom B2B manufacturer, not a fixed-price retail store. Unit cost changes with fabric or leather, construction, embellishment, quantity, packaging, destination and shipping scope.",
    sort_order: 50,
  },
  {
    id: "fallback-quotes-requirements",
    locale: "en",
    category: "Quotes & MOQ",
    question: "What information is needed for a quotation?",
    answer: "Provide the product or reference, material preference, estimated quantity, size and color range, customization, branding, destination country and target delivery window. A tech pack is helpful but not required for the first review.",
    sort_order: 60,
  },
  {
    id: "fallback-samples-request",
    locale: "en",
    category: "Samples & Development",
    question: "Can I request a sample before bulk production?",
    answer: "Yes, sample requests can be reviewed before bulk production. Sample feasibility, cost, timing and shipping are confirmed after the product and customization scope are understood.",
    sort_order: 70,
  },
  {
    id: "fallback-samples-reference",
    locale: "en",
    category: "Samples & Development",
    question: "Can you develop a product from a sketch or reference image?",
    answer: "OEM, ODM and private-label development can start from a tech pack, sketch, reference garment or image. The team first confirms what can be developed without copying protected branding or unsupported details.",
    sort_order: 80,
  },
  {
    id: "fallback-samples-changes",
    locale: "en",
    category: "Samples & Development",
    question: "What happens if I request changes after sample approval?",
    answer: "Changes are documented and reviewed again because they may affect material use, pattern, artwork, cost or timing. Bulk should proceed only against the latest approved specification.",
    sort_order: 90,
  },
  {
    id: "fallback-customization-private-label",
    locale: "en",
    category: "Customization & Private Label",
    question: "What private-label options are available?",
    answer: "Depending on the program, options may include woven or printed labels, care labels, hangtags, packaging, embroidery, printing, trims and other buyer branding. Availability and MOQ are confirmed for the exact request.",
    sort_order: 100,
  },
  {
    id: "fallback-customization-match",
    locale: "en",
    category: "Customization & Private Label",
    question: "Can you match my colors, fabric or trims?",
    answer: "Color, material and trim matching can be reviewed against references or specifications. Approval samples, swatches or alternatives may be required before bulk production.",
    sort_order: 110,
  },
  {
    id: "fallback-customization-nda",
    locale: "en",
    category: "Customization & Private Label",
    question: "Can we discuss confidentiality or an NDA?",
    answer: "Yes. Tell the team about confidentiality, design ownership or exclusivity requirements before sharing sensitive files so the appropriate commercial terms can be discussed.",
    sort_order: 120,
  },
  {
    id: "fallback-quality-agreement",
    locale: "en",
    category: "Quality & Documentation",
    question: "How is product quality agreed?",
    answer: "Quality is judged against the approved specification, sample, measurements, materials, artwork, trims and packaging requirements. The inspection plan should be agreed before production.",
    sort_order: 130,
  },
  {
    id: "fallback-quality-certifications",
    locale: "en",
    category: "Quality & Documentation",
    question: "Do all products carry the same certifications?",
    answer: "No blanket certification claim is made for every product. Material, testing and compliance documents are confirmed according to the exact fabric or leather, supplier, destination and buyer requirement.",
    sort_order: 140,
  },
  {
    id: "fallback-quality-inspection",
    locale: "en",
    category: "Quality & Documentation",
    question: "Can third-party inspection be arranged?",
    answer: "Third-party inspection requirements can be discussed and included in the order plan before production. The inspection scope, timing, cost and responsible party must be agreed in writing.",
    sort_order: 150,
  },
  {
    id: "fallback-production-time",
    locale: "en",
    category: "Production, Shipping & Payment",
    question: "How long will production take?",
    answer: "Timing is confirmed after the product, quantity, material availability, sample approval and customization are reviewed. A date shown before that review would not be reliable.",
    sort_order: 160,
  },
  {
    id: "fallback-production-shipping",
    locale: "en",
    category: "Production, Shipping & Payment",
    question: "Which shipping terms are available?",
    answer: "The team can review suitable Incoterms and shipping options based on destination, shipment size and buyer preference. The quotation states what is included and which destination costs remain with the buyer.",
    sort_order: 170,
  },
  {
    id: "fallback-production-payment",
    locale: "en",
    category: "Production, Shipping & Payment",
    question: "What payment terms do you accept?",
    answer: "Payment method and milestones are stated on the approved quotation or proforma invoice. Do not send payment against an informal message that does not match the confirmed company and order documents.",
    sort_order: 180,
  },
];

export const DEFAULT_FAQ_GROUP_ORDER = [
  "Company & Verification",
  "Quotes & MOQ",
  "Samples & Development",
  "Customization & Private Label",
  "Quality & Documentation",
  "Production, Shipping & Payment",
];
