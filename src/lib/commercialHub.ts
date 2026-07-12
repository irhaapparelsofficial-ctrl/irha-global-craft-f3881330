import type { SalesSource } from "@/lib/salesPipeline";

export type CurrencyCode = "USD" | "EUR" | "GBP" | "AUD" | "CAD" | "AED";
export type QuotationStatus = "draft" | "owner_review" | "approved" | "sent" | "accepted" | "rejected" | "expired" | "cancelled";
export type SampleStatus = "requested" | "quoted" | "approved" | "in_development" | "ready" | "sent" | "feedback" | "accepted" | "rejected" | "cancelled";
export type MeetingStatus = "scheduled" | "completed" | "cancelled" | "no_show";
export type MeetingType = "factory_video" | "sales_call" | "sample_review" | "quotation_review" | "other";

export type QuotationItemDraft = {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
};

export type QuotationTotals = {
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
};

export type CommercialBuyerRef = {
  source: SalesSource;
  sourceId: string;
  reference: string;
  name: string;
  company: string;
  country: string;
  email: string;
  phone: string;
  product: string;
  quantity: string;
};

export const QUOTATION_STATUS_LABELS: Record<QuotationStatus, string> = {
  draft: "Draft",
  owner_review: "Owner review",
  approved: "Approved",
  sent: "Sent",
  accepted: "Accepted",
  rejected: "Rejected",
  expired: "Expired",
  cancelled: "Cancelled",
};

export const SAMPLE_STATUS_LABELS: Record<SampleStatus, string> = {
  requested: "Requested",
  quoted: "Quoted",
  approved: "Approved",
  in_development: "In development",
  ready: "Ready",
  sent: "Sent",
  feedback: "Feedback",
  accepted: "Accepted",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export function money(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number * 100) / 100 : 0;
}

export function quotationTotals(items: QuotationItemDraft[], shipping: number, discount: number): QuotationTotals {
  const subtotal = Math.round(items.reduce((sum, item) => sum + money(item.quantity) * money(item.unitPrice), 0) * 100) / 100;
  const cleanShipping = money(shipping);
  const cleanDiscount = Math.min(money(discount), subtotal + cleanShipping);
  return {
    subtotal,
    shipping: cleanShipping,
    discount: cleanDiscount,
    total: Math.round((subtotal + cleanShipping - cleanDiscount) * 100) / 100,
  };
}

export function quotationReadiness(input: {
  buyerReference: string;
  buyerName: string;
  company: string;
  currency: string;
  validUntil: string;
  incoterm: string;
  paymentTerms: string;
  shippingScope: string;
  items: QuotationItemDraft[];
}) {
  const missing: string[] = [];
  if (!input.buyerReference.trim()) missing.push("buyer reference");
  if (!input.buyerName.trim() && !input.company.trim()) missing.push("buyer/company name");
  if (!input.currency.trim()) missing.push("currency");
  if (!input.validUntil.trim()) missing.push("valid-until date");
  if (!input.incoterm.trim()) missing.push("Incoterm");
  if (!input.paymentTerms.trim()) missing.push("payment terms");
  if (!input.shippingScope.trim()) missing.push("shipping scope");
  if (input.items.length === 0) missing.push("at least one line item");
  input.items.forEach((item, index) => {
    if (!item.description.trim()) missing.push(`item ${index + 1} description`);
    if (money(item.quantity) <= 0) missing.push(`item ${index + 1} quantity`);
    if (money(item.unitPrice) <= 0) missing.push(`item ${index + 1} unit price`);
  });
  return { ready: missing.length === 0, missing };
}

export function canTransitionQuotation(current: QuotationStatus, next: QuotationStatus, ownerApproved: boolean) {
  if (current === next) return true;
  const allowed: Record<QuotationStatus, QuotationStatus[]> = {
    draft: ["owner_review", "cancelled"],
    owner_review: ["draft", "approved", "cancelled"],
    approved: ["draft", "sent", "cancelled"],
    sent: ["accepted", "rejected", "expired", "cancelled"],
    accepted: ["cancelled"],
    rejected: ["draft", "cancelled"],
    expired: ["draft", "cancelled"],
    cancelled: ["draft"],
  };
  if (!allowed[current].includes(next)) return false;
  if (["approved", "sent", "accepted"].includes(next) && !ownerApproved) return false;
  return true;
}

export function meetingEnd(startLocal: string, durationMinutes = 30) {
  const start = new Date(startLocal);
  if (Number.isNaN(start.getTime())) return "";
  return new Date(start.getTime() + Math.max(15, durationMinutes) * 60_000).toISOString();
}

function escapeIcs(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function icsDate(value: string) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function meetingIcs(input: { uid: string; title: string; startAt: string; endAt: string; description: string; location: string }) {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Irha Apparels//Commercial Hub//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeIcs(input.uid)}`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(input.startAt)}`,
    `DTEND:${icsDate(input.endAt)}`,
    `SUMMARY:${escapeIcs(input.title)}`,
    `DESCRIPTION:${escapeIcs(input.description)}`,
    `LOCATION:${escapeIcs(input.location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function quoteNumber(sequence: number, now = new Date()) {
  return `IA-Q-${now.getUTCFullYear()}-${String(Math.max(sequence, 1)).padStart(5, "0")}`;
}

export function sampleReference(sequence: number, now = new Date()) {
  return `IA-S-${now.getUTCFullYear()}-${String(Math.max(sequence, 1)).padStart(5, "0")}`;
}
