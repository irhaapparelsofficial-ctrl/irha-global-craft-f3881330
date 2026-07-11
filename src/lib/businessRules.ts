export type ApprovalMode = "auto" | "draft" | "owner";

export type BusinessRulesMaster = {
  version: number;
  status: "draft" | "approved";
  updatedAt: string;
  company: {
    legalName: string;
    tradingName: string;
    location: string;
    businessModel: string;
    websiteState: string;
    trustPoints: string[];
    priorityMarkets: string[];
    supportedLanguages: string[];
  };
  commercial: {
    quoteOnly: boolean;
    publicPricingAllowed: boolean;
    supportedCurrencies: string[];
    incoterms: string[];
    paymentTerms: string[];
    moqPolicy: string;
    samplePolicy: string;
    leadTimePolicy: string;
    shippingPolicy: string;
    discountPolicy: string;
  };
  manufacturing: {
    categories: string[];
    verifiedMaterials: string[];
    customizationOptions: string[];
    packagingOptions: string[];
    certifications: string[];
  };
  authority: {
    safeAcknowledgement: ApprovalMode;
    catalogueDelivery: ApprovalMode;
    qualificationQuestions: ApprovalMode;
    followUpReminder: ApprovalMode;
    socialDraft: ApprovalMode;
    socialPublish: ApprovalMode;
    listingDraft: ApprovalMode;
    listingUpdate: ApprovalMode;
    seoDraft: ApprovalMode;
    finalQuotation: ApprovalMode;
    discount: ApprovalMode;
    paymentTerms: ApprovalMode;
    productionCommitment: ApprovalMode;
    complaintSettlement: ApprovalMode;
  };
  prohibitedClaims: string[];
  escalationNotes: string;
};

export const BUSINESS_RULES_STORAGE_KEY = "irha_business_rules_master_v1";

export const DEFAULT_BUSINESS_RULES: BusinessRulesMaster = {
  version: 1,
  status: "draft",
  updatedAt: new Date(0).toISOString(),
  company: {
    legalName: "Irha Apparels",
    tradingName: "Irha Apparels",
    location: "Sialkot, Pakistan",
    businessModel: "B2B custom apparel manufacturer for wholesale, OEM and private-label buyers",
    websiteState: "Experienced manufacturer; website newly built",
    trustPoints: ["Factory view available through a scheduled live video call"],
    priorityMarkets: ["Germany", "Austria", "Switzerland", "United Kingdom", "United States", "Canada", "Australia", "United Arab Emirates"],
    supportedLanguages: ["English", "German", "French", "Spanish"],
  },
  commercial: {
    quoteOnly: true,
    publicPricingAllowed: false,
    supportedCurrencies: ["USD", "EUR", "GBP"],
    incoterms: [],
    paymentTerms: [],
    moqPolicy: "Confirm after reviewing product, material, branding, quantity and destination.",
    samplePolicy: "Confirm after reviewing buyer requirements and the requested development path.",
    leadTimePolicy: "Do not promise a production or delivery date before factory review.",
    shippingPolicy: "Confirm shipping method, destination and Incoterm before quotation.",
    discountPolicy: "Owner approval required for every discount or commercial concession.",
  },
  manufacturing: {
    categories: ["Bavarian & Trachten Wear", "Premium Leather Apparel", "Custom Sportswear & Teamwear", "Streetwear & Activewear", "Leisurewear & Nightwear"],
    verifiedMaterials: [],
    customizationOptions: ["Private label", "Embroidery", "Printing", "Labels", "Hang tags", "Custom packaging"],
    packagingOptions: [],
    certifications: [],
  },
  authority: {
    safeAcknowledgement: "auto",
    catalogueDelivery: "auto",
    qualificationQuestions: "auto",
    followUpReminder: "auto",
    socialDraft: "draft",
    socialPublish: "owner",
    listingDraft: "draft",
    listingUpdate: "owner",
    seoDraft: "draft",
    finalQuotation: "owner",
    discount: "owner",
    paymentTerms: "owner",
    productionCommitment: "owner",
    complaintSettlement: "owner",
  },
  prohibitedClaims: [
    "Do not invent MOQ, price, production capacity or delivery dates.",
    "Do not claim certifications that are not verified.",
    "Do not claim an email, listing or social post was sent/published without an API result.",
    "Do not expose or repeat API keys, passwords or private buyer files.",
  ],
  escalationNotes: "Escalate pricing, discounts, payment terms, production commitments, legal matters, complaints and high-value buyer decisions to the owner.",
};

export const REQUIRED_RULE_PATHS: Array<{ label: string; value: (rules: BusinessRulesMaster) => unknown }> = [
  { label: "Company identity", value: (rules) => rules.company.legalName },
  { label: "Business model", value: (rules) => rules.company.businessModel },
  { label: "Priority markets", value: (rules) => rules.company.priorityMarkets },
  { label: "Supported currencies", value: (rules) => rules.commercial.supportedCurrencies },
  { label: "MOQ policy", value: (rules) => rules.commercial.moqPolicy },
  { label: "Sample policy", value: (rules) => rules.commercial.samplePolicy },
  { label: "Lead-time policy", value: (rules) => rules.commercial.leadTimePolicy },
  { label: "Shipping policy", value: (rules) => rules.commercial.shippingPolicy },
  { label: "Incoterms", value: (rules) => rules.commercial.incoterms },
  { label: "Payment terms", value: (rules) => rules.commercial.paymentTerms },
  { label: "Verified materials", value: (rules) => rules.manufacturing.verifiedMaterials },
  { label: "Packaging options", value: (rules) => rules.manufacturing.packagingOptions },
  { label: "Prohibited claims", value: (rules) => rules.prohibitedClaims },
  { label: "Escalation rules", value: (rules) => rules.escalationNotes },
];

const HIGH_RISK_PATTERN = /\b(price|pricing|quotation|quote|discount|payment terms?|deposit|production date|production timeline|delivery date|lead time|capacity|complaint settlement|refund|compensation|contract|incoterm|fob|cif|ddp)\b/i;

function hasValue(value: unknown) {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim().length > 0;
  return value !== null && value !== undefined;
}

export function businessRulesReadiness(rules: BusinessRulesMaster) {
  const complete = REQUIRED_RULE_PATHS.filter((item) => hasValue(item.value(rules)));
  const missing = REQUIRED_RULE_PATHS.filter((item) => !hasValue(item.value(rules))).map((item) => item.label);
  return {
    score: Math.round((complete.length / REQUIRED_RULE_PATHS.length) * 100),
    completed: complete.length,
    total: REQUIRED_RULE_PATHS.length,
    missing,
  };
}

export function businessRulesApproved(rules: BusinessRulesMaster) {
  return rules.status === "approved" && businessRulesReadiness(rules).score === 100;
}

export function containsHighRiskBusinessTerms(value: unknown) {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? {});
  return HIGH_RISK_PATTERN.test(text);
}

export function parseList(value: string) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, items) => items.indexOf(item) === index);
}

export function listText(values: string[]) {
  return values.join("\n");
}

function mergeRules(value: Partial<BusinessRulesMaster>): BusinessRulesMaster {
  return {
    ...DEFAULT_BUSINESS_RULES,
    ...value,
    company: { ...DEFAULT_BUSINESS_RULES.company, ...(value.company ?? {}) },
    commercial: { ...DEFAULT_BUSINESS_RULES.commercial, ...(value.commercial ?? {}) },
    manufacturing: { ...DEFAULT_BUSINESS_RULES.manufacturing, ...(value.manufacturing ?? {}) },
    authority: { ...DEFAULT_BUSINESS_RULES.authority, ...(value.authority ?? {}) },
    prohibitedClaims: Array.isArray(value.prohibitedClaims) ? value.prohibitedClaims : DEFAULT_BUSINESS_RULES.prohibitedClaims,
  };
}

export function loadBusinessRules(): BusinessRulesMaster {
  if (typeof window === "undefined") return DEFAULT_BUSINESS_RULES;
  try {
    const stored = window.localStorage.getItem(BUSINESS_RULES_STORAGE_KEY);
    if (!stored) return DEFAULT_BUSINESS_RULES;
    return mergeRules(JSON.parse(stored) as Partial<BusinessRulesMaster>);
  } catch {
    return DEFAULT_BUSINESS_RULES;
  }
}

export function saveBusinessRules(rules: BusinessRulesMaster) {
  const next = { ...rules, updatedAt: new Date().toISOString() };
  window.localStorage.setItem(BUSINESS_RULES_STORAGE_KEY, JSON.stringify(next));
  return next;
}
