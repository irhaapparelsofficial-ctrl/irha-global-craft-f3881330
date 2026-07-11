export type ProductionJobType = "sample" | "order";
export type ProductionStage =
  | "briefing"
  | "spec_locked"
  | "material_sourcing"
  | "cutting"
  | "printing_embroidery"
  | "stitching"
  | "finishing"
  | "qc"
  | "packing"
  | "ready_to_ship"
  | "shipped"
  | "buyer_approved"
  | "completed"
  | "on_hold"
  | "cancelled";

export const PRODUCTION_STAGES: Array<{ value: ProductionStage; label: string; buyerCommitment: boolean }> = [
  { value: "briefing", label: "Requirement briefing", buyerCommitment: false },
  { value: "spec_locked", label: "Specification locked", buyerCommitment: true },
  { value: "material_sourcing", label: "Material sourcing", buyerCommitment: false },
  { value: "cutting", label: "Cutting", buyerCommitment: false },
  { value: "printing_embroidery", label: "Printing / embroidery", buyerCommitment: false },
  { value: "stitching", label: "Stitching", buyerCommitment: false },
  { value: "finishing", label: "Finishing", buyerCommitment: false },
  { value: "qc", label: "Quality control", buyerCommitment: false },
  { value: "packing", label: "Packing", buyerCommitment: false },
  { value: "ready_to_ship", label: "Ready to ship", buyerCommitment: true },
  { value: "shipped", label: "Shipped", buyerCommitment: true },
  { value: "buyer_approved", label: "Buyer approved", buyerCommitment: true },
  { value: "completed", label: "Completed", buyerCommitment: true },
  { value: "on_hold", label: "On hold", buyerCommitment: true },
  { value: "cancelled", label: "Cancelled", buyerCommitment: true },
];

const LINEAR: ProductionStage[] = [
  "briefing",
  "spec_locked",
  "material_sourcing",
  "cutting",
  "printing_embroidery",
  "stitching",
  "finishing",
  "qc",
  "packing",
  "ready_to_ship",
  "shipped",
  "buyer_approved",
  "completed",
];

export function stageLabel(stage: ProductionStage) {
  return PRODUCTION_STAGES.find((item) => item.value === stage)?.label ?? stage.replace(/_/g, " ");
}

export function nextProductionStage(stage: ProductionStage): ProductionStage | null {
  const index = LINEAR.indexOf(stage);
  if (index < 0 || index >= LINEAR.length - 1) return null;
  return LINEAR[index + 1];
}

export function productionStageProgress(stage: ProductionStage) {
  if (stage === "cancelled") return 0;
  if (stage === "on_hold") return 0;
  const index = LINEAR.indexOf(stage);
  if (index < 0) return 0;
  return Math.round((index / (LINEAR.length - 1)) * 100);
}

export function stageChangeRequiresOwnerApproval(from: ProductionStage, to: ProductionStage) {
  if (from === to) return false;
  return PRODUCTION_STAGES.find((item) => item.value === to)?.buyerCommitment ?? true;
}

export function allowedStageChanges(stage: ProductionStage): ProductionStage[] {
  if (["completed", "cancelled"].includes(stage)) return [];
  const next = nextProductionStage(stage);
  const options = [next, "on_hold", "cancelled"].filter(Boolean) as ProductionStage[];
  if (stage === "on_hold") options.push("briefing");
  return Array.from(new Set(options));
}

export function dueState(targetDate?: string | null) {
  if (!targetDate) return "unscheduled" as const;
  const target = new Date(targetDate).getTime();
  if (Number.isNaN(target)) return "unscheduled" as const;
  const diffDays = Math.ceil((target - Date.now()) / 86_400_000);
  if (diffDays < 0) return "overdue" as const;
  if (diffDays <= 3) return "due_soon" as const;
  return "scheduled" as const;
}

export function productionJobReadiness(input: {
  buyerName: string;
  product: string;
  quantity: string;
  specificationReference: string;
  targetDate: string;
}) {
  const missing: string[] = [];
  if (!input.buyerName.trim()) missing.push("buyer name");
  if (!input.product.trim()) missing.push("product/style");
  if (!input.quantity.trim()) missing.push("quantity");
  if (!input.specificationReference.trim()) missing.push("approved specification reference");
  if (!input.targetDate.trim()) missing.push("internal target date");
  return { ready: missing.length === 0, missing };
}
