export type QualificationBand = "strong" | "developing" | "incomplete";

export type LeadQualificationInput = {
  key: string;
  kind: "inquiry" | "catalogue" | "prospect";
  name: string;
  company?: string | null;
  country?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  productInterest?: string | null;
  quantity?: string | null;
  message?: string | null;
  buyerType?: string | null;
  status?: string | null;
  priority?: string | null;
  followUpAt?: string | null;
  quotationUrl?: string | null;
  sampleStatus?: string | null;
  createdAt: string;
};

export type LeadQualificationResult = {
  score: number;
  band: QualificationBand;
  signals: string[];
  missing: string[];
  nextAction: string;
  actionReason: string;
  actionRank: number;
};

const GENERIC_PRODUCT = /^(general|general catalogue request|imported b2b prospect|catalogue|unknown|not provided)?$/i;
const CLOSED = new Set(["won", "lost", "spam", "unqualified"]);

function text(value?: string | null) {
  return typeof value === "string" ? value.trim() : "";
}

function hasSpecificQuantity(value?: string | null) {
  const normalized = text(value);
  return normalized.length > 0 && !/^(unknown|not sure|tbd|n\/a|not provided)$/i.test(normalized);
}

function validProduct(value?: string | null) {
  const normalized = text(value);
  return normalized.length > 2 && !GENERIC_PRODUCT.test(normalized);
}

function followUpBucket(value?: string | null) {
  if (!value) return "none";
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return "none";
  return time < Date.now() ? "overdue" : "scheduled";
}

export function qualifyBuyer(input: LeadQualificationInput): LeadQualificationResult {
  let score = 0;
  const signals: string[] = [];
  const missing: string[] = [];
  const company = text(input.company);
  const country = text(input.country);
  const email = text(input.email);
  const phone = text(input.phone);
  const website = text(input.website);
  const product = text(input.productInterest);
  const quantity = text(input.quantity);
  const message = text(input.message);
  const buyerType = text(input.buyerType);
  const status = text(input.status).toLowerCase() || "new";

  if (company) { score += 8; signals.push("Company identified"); } else missing.push("company name");
  if (country) { score += 8; signals.push("Destination country"); } else missing.push("country / destination");
  if (email) { score += 12; signals.push("Email available"); }
  if (phone) { score += 6; signals.push("Phone / WhatsApp available"); }
  if (!email && !phone) missing.push("verified contact");
  if (website) { score += 8; signals.push("Company website"); }

  if (validProduct(product)) { score += 16; signals.push("Specific product interest"); } else missing.push("product/category interest");
  if (hasSpecificQuantity(quantity)) { score += 14; signals.push("Quantity stated"); } else if (input.kind === "inquiry") missing.push("estimated quantity");
  if (buyerType) { score += 8; signals.push("Buyer type identified"); } else missing.push("buyer type");

  if (message.length >= 20) { score += 8; signals.push("Requirement detail provided"); }
  if (message.length >= 120) { score += 4; signals.push("Detailed buyer brief"); }
  if (message.length < 20 && input.kind !== "prospect") missing.push("requirement details");

  if (["qualified", "replied", "quote_requested", "quotation_sent", "negotiation", "sample_requested", "won"].includes(status)) {
    score += 10;
    signals.push("CRM engagement evidence");
  } else if (["contacted", "follow_up", "read"].includes(status)) {
    score += 5;
    signals.push("CRM activity recorded");
  }

  score = Math.min(100, score);
  const band: QualificationBand = score >= 75 ? "strong" : score >= 50 ? "developing" : "incomplete";
  const followUp = followUpBucket(input.followUpAt);
  const sampleStatus = text(input.sampleStatus).toLowerCase();

  let nextAction = "Review buyer record";
  let actionReason = "Confirm the evidence and choose the next CRM stage.";
  let actionRank = 40;

  if (CLOSED.has(status)) {
    nextAction = status === "won" ? "Maintain repeat-buyer follow-up" : "No active sales action";
    actionReason = `CRM status is ${status}.`;
    actionRank = status === "won" ? 35 : 5;
  } else if (followUp === "overdue") {
    nextAction = "Complete overdue follow-up";
    actionReason = "The scheduled follow-up time has passed.";
    actionRank = 100;
  } else if (status === "quote_requested" && !text(input.quotationUrl)) {
    nextAction = "Prepare quotation brief";
    actionReason = "The buyer requested a quote but no quotation link is attached.";
    actionRank = 95;
  } else if (status === "sample_requested" && !["sent", "approved"].includes(sampleStatus)) {
    nextAction = "Confirm sample specification";
    actionReason = "A sample is requested and has not reached sent/approved status.";
    actionRank = 90;
  } else if (!email && !phone) {
    nextAction = "Verify buyer contact";
    actionReason = "No usable email or phone/WhatsApp is available.";
    actionRank = 85;
  } else if (!validProduct(product)) {
    nextAction = "Ask product/category requirement";
    actionReason = "A specific product interest is missing.";
    actionRank = 80;
  } else if (input.kind === "inquiry" && !hasSpecificQuantity(quantity)) {
    nextAction = "Ask estimated quantity";
    actionReason = "Quantity is required before a commercial review.";
    actionRank = 78;
  } else if (!country) {
    nextAction = "Confirm destination country";
    actionReason = "Destination affects shipping and commercial review.";
    actionRank = 75;
  } else if (status === "new" || status === "read") {
    nextAction = score >= 65 ? "Qualify and draft reply" : "Collect missing information";
    actionReason = score >= 65 ? "The record has enough evidence for qualification review." : `Missing: ${missing.slice(0, 3).join(", ") || "buyer details"}.`;
    actionRank = score >= 65 ? 72 : 68;
  } else if (!input.followUpAt && ["qualified", "replied", "contacted", "negotiation", "quotation_sent", "follow_up"].includes(status)) {
    nextAction = "Schedule next follow-up";
    actionReason = "The active buyer record has no next follow-up date.";
    actionRank = 70;
  } else {
    nextAction = "Continue CRM workflow";
    actionReason = `Current status: ${status.replace(/_/g, " ")}.`;
    actionRank = 45;
  }

  if (input.priority === "urgent") actionRank += 12;
  else if (input.priority === "high") actionRank += 6;

  return { score, band, signals, missing: Array.from(new Set(missing)), nextAction, actionReason, actionRank };
}
