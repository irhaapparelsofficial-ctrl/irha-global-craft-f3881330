export type CostCategory =
  | "material"
  | "labour"
  | "subcontract"
  | "packaging"
  | "quality"
  | "freight"
  | "duty_tax"
  | "bank_fee"
  | "overhead"
  | "claim"
  | "other";

export type AcceptanceStatus = "pending" | "accepted" | "changes_requested" | "disputed" | "waived";
export type PaymentStatus = "unknown" | "not_invoiced" | "invoiced" | "part_paid" | "paid" | "overdue" | "disputed";
export type CloseoutStatus = "draft" | "review" | "approved" | "closed" | "reopened";
export type CloseoutRisk = "clear" | "attention" | "blocked";

export interface CostEntry {
  category: CostCategory;
  description: string;
  quantity: number;
  unitCost: number;
  currency: string;
  exchangeRateToBase: number;
  isVerified: boolean;
}

export interface CloseoutReadinessInput {
  shipmentStatus?: string | null;
  verifiedDeliveryEvidenceCount?: number | null;
  acceptanceStatus?: AcceptanceStatus | null;
  acceptanceReference?: string | null;
  acceptedAt?: string | null;
  invoiceNumber?: string | null;
  invoiceAmount?: number | null;
  invoiceCurrency?: string | null;
  paymentStatus?: PaymentStatus | null;
  costs: CostEntry[];
  openIssueCount?: number | null;
  openCriticalIssueCount?: number | null;
  lessonsLearned?: string | null;
}

export interface CloseoutReadiness {
  ready: boolean;
  missing: string[];
  warnings: string[];
}

const positive = (value: number) => Number.isFinite(value) && value > 0 ? value : 0;

export function costEntryBaseAmount(entry: CostEntry): number {
  const quantity = positive(entry.quantity);
  const unitCost = positive(entry.unitCost);
  const rate = positive(entry.exchangeRateToBase);
  return Number((quantity * unitCost * rate).toFixed(2));
}

export function totalVerifiedCost(costs: CostEntry[]): number {
  return Number(costs.filter((entry) => entry.isVerified).reduce((sum, entry) => sum + costEntryBaseAmount(entry), 0).toFixed(2));
}

export function totalUnverifiedCost(costs: CostEntry[]): number {
  return Number(costs.filter((entry) => !entry.isVerified).reduce((sum, entry) => sum + costEntryBaseAmount(entry), 0).toFixed(2));
}

export function revenueBaseAmount(invoiceAmount: number, exchangeRateToBase: number): number {
  return Number((positive(invoiceAmount) * positive(exchangeRateToBase)).toFixed(2));
}

export function contributionMargin(revenueBase: number, verifiedCostBase: number): number {
  return Number((revenueBase - verifiedCostBase).toFixed(2));
}

export function contributionMarginPercent(revenueBase: number, verifiedCostBase: number): number | null {
  if (!Number.isFinite(revenueBase) || revenueBase <= 0) return null;
  return Number((((revenueBase - verifiedCostBase) / revenueBase) * 100).toFixed(2));
}

export function closeoutReadiness(input: CloseoutReadinessInput): CloseoutReadiness {
  const missing: string[] = [];
  const warnings: string[] = [];

  if (input.shipmentStatus !== "delivered") missing.push("delivered shipment status");
  if ((input.verifiedDeliveryEvidenceCount || 0) < 1) missing.push("verified delivery evidence");
  if (!(["accepted", "waived"] as AcceptanceStatus[]).includes(input.acceptanceStatus || "pending")) {
    missing.push("buyer delivery acceptance or owner waiver");
  }
  if (input.acceptanceStatus === "accepted") {
    if (!input.acceptanceReference?.trim()) missing.push("buyer acceptance reference");
    if (!input.acceptedAt) missing.push("acceptance timestamp");
  }
  if (!input.invoiceNumber?.trim()) missing.push("invoice number");
  if (!Number.isFinite(Number(input.invoiceAmount)) || Number(input.invoiceAmount) <= 0) missing.push("positive invoice amount");
  if (!input.invoiceCurrency?.trim()) missing.push("invoice currency");
  if (["unknown", "not_invoiced", "disputed"].includes(input.paymentStatus || "unknown")) {
    missing.push("reviewed payment status");
  }
  if (input.costs.length === 0) missing.push("at least one cost entry");
  if (!input.costs.some((entry) => entry.isVerified)) missing.push("verified cost evidence");
  if (input.costs.some((entry) => !entry.isVerified)) warnings.push("unverified cost entries remain");
  if ((input.openCriticalIssueCount || 0) > 0) missing.push("resolve critical closeout issues");
  if ((input.openIssueCount || 0) > 0) warnings.push("open non-critical closeout issues remain");
  if (!input.lessonsLearned?.trim()) warnings.push("lessons learned not recorded");
  if (input.paymentStatus === "overdue") warnings.push("payment is overdue");
  if (input.acceptanceStatus === "waived") warnings.push("buyer acceptance was waived by owner");

  return { ready: missing.length === 0, missing: [...new Set(missing)], warnings: [...new Set(warnings)] };
}

export function closeoutRisk(input: CloseoutReadinessInput): CloseoutRisk {
  const readiness = closeoutReadiness(input);
  if (readiness.missing.some((item) => /delivered|delivery evidence|acceptance|critical|invoice amount|payment status/i.test(item))) return "blocked";
  if (!readiness.ready || readiness.warnings.length > 0) return "attention";
  return "clear";
}

export function repeatOrderDueDate(deliveredAt: string, leadTimeDays: number, reorderCycleDays: number): string | null {
  const delivered = new Date(deliveredAt);
  if (Number.isNaN(delivered.getTime())) return null;
  const lead = Math.max(0, Math.floor(Number(leadTimeDays) || 0));
  const cycle = Math.max(1, Math.floor(Number(reorderCycleDays) || 0));
  delivered.setUTCDate(delivered.getUTCDate() + Math.max(1, cycle - lead));
  return delivered.toISOString().slice(0, 10);
}

export function repeatOrderPriority(input: {
  acceptanceStatus?: AcceptanceStatus | null;
  paymentStatus?: PaymentStatus | null;
  openIssueCount?: number;
  marginPercent?: number | null;
}): "high" | "normal" | "low" | "blocked" {
  if (input.acceptanceStatus !== "accepted" || ["overdue", "disputed"].includes(input.paymentStatus || "unknown") || (input.openIssueCount || 0) > 0) return "blocked";
  if ((input.marginPercent ?? 0) >= 20 && input.paymentStatus === "paid") return "high";
  if ((input.marginPercent ?? 0) >= 10) return "normal";
  return "low";
}

export function safeCurrency(value: string | null | undefined, fallback = "PKR"): string {
  const normalized = String(value || "").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : fallback;
}
