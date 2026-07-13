export type MaterialProcurementStatus =
  | "not_ordered"
  | "quoted"
  | "ordered"
  | "partial"
  | "available"
  | "blocked";

export type ProductionOperationStatus =
  | "planned"
  | "ready"
  | "in_progress"
  | "blocked"
  | "qc_hold"
  | "completed"
  | "skipped";

export type ProductionTaskStatus = "open" | "in_progress" | "blocked" | "done" | "cancelled";
export type ProductionRiskLevel = "clear" | "attention" | "blocked";

export type MaterialRequirement = {
  requiredQuantity: number;
  availableQuantity: number;
  critical: boolean;
  status: MaterialProcurementStatus;
  expectedDate?: string | null;
};

export type ProductionOperation = {
  status: ProductionOperationStatus;
  plannedEnd?: string | null;
};

export type ProductionTask = {
  status: ProductionTaskStatus;
  dueAt?: string | null;
};

const safeNumber = (value: number | string | null | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

export function materialShortage(required: number, available: number) {
  return Math.max(0, safeNumber(required) - safeNumber(available));
}

export function materialCoveragePercent(required: number, available: number) {
  const needed = safeNumber(required);
  if (needed === 0) return 100;
  return Math.min(100, Math.round((safeNumber(available) / needed) * 100));
}

export function materialReadiness(materials: MaterialRequirement[]) {
  const critical = materials.filter((item) => item.critical);
  const blockedCritical = critical.filter((item) => (
    item.status === "blocked" || materialShortage(item.requiredQuantity, item.availableQuantity) > 0
  ));
  const shortages = materials.filter((item) => materialShortage(item.requiredQuantity, item.availableQuantity) > 0);
  const fullyAvailable = materials.filter((item) => materialShortage(item.requiredQuantity, item.availableQuantity) === 0);

  return {
    ready: materials.length > 0 && blockedCritical.length === 0,
    total: materials.length,
    critical: critical.length,
    blockedCritical: blockedCritical.length,
    shortages: shortages.length,
    fullyAvailable: fullyAvailable.length,
  };
}

export function operationProgress(operations: ProductionOperation[]) {
  if (operations.length === 0) return 0;
  const completed = operations.filter((item) => ["completed", "skipped"].includes(item.status)).length;
  return Math.round((completed / operations.length) * 100);
}

export function dateState(value?: string | null, now = Date.now()) {
  if (!value) return "unscheduled" as const;
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "unscheduled" as const;
  const diffDays = Math.ceil((timestamp - now) / 86_400_000);
  if (diffDays < 0) return "overdue" as const;
  if (diffDays <= 2) return "due_soon" as const;
  return "scheduled" as const;
}

export function jobReleaseReadiness(input: {
  specificationReference?: string | null;
  materials: MaterialRequirement[];
  operations: ProductionOperation[];
  tasks: ProductionTask[];
}) {
  const missing: string[] = [];
  const material = materialReadiness(input.materials);
  const blockingTasks = input.tasks.filter((task) => task.status === "blocked").length;
  const blockingOperations = input.operations.filter((operation) => operation.status === "blocked").length;

  if (!input.specificationReference?.trim()) missing.push("approved specification reference");
  if (input.materials.length === 0) missing.push("material requirements");
  if (!material.ready) missing.push("critical material coverage");
  if (input.operations.length === 0) missing.push("production operations");
  if (blockingTasks > 0) missing.push("blocked tasks");
  if (blockingOperations > 0) missing.push("blocked operations");

  return {
    ready: missing.length === 0,
    missing,
    material,
    blockingTasks,
    blockingOperations,
  };
}

export function productionRisk(input: {
  materials: MaterialRequirement[];
  operations: ProductionOperation[];
  tasks: ProductionTask[];
  targetDate?: string | null;
  now?: number;
}): { level: ProductionRiskLevel; reasons: string[] } {
  const reasons: string[] = [];
  const material = materialReadiness(input.materials);
  const blockedOperations = input.operations.filter((item) => item.status === "blocked").length;
  const blockedTasks = input.tasks.filter((item) => item.status === "blocked").length;
  const overdueTasks = input.tasks.filter((item) => (
    !["done", "cancelled"].includes(item.status) && dateState(item.dueAt, input.now) === "overdue"
  )).length;
  const overdueOperations = input.operations.filter((item) => (
    !["completed", "skipped"].includes(item.status) && dateState(item.plannedEnd, input.now) === "overdue"
  )).length;
  const targetState = dateState(input.targetDate, input.now);

  if (material.blockedCritical > 0) reasons.push(`${material.blockedCritical} critical material item(s) blocked`);
  if (blockedOperations > 0) reasons.push(`${blockedOperations} operation(s) blocked`);
  if (blockedTasks > 0) reasons.push(`${blockedTasks} task(s) blocked`);

  if (reasons.length > 0) return { level: "blocked", reasons };

  if (material.shortages > 0) reasons.push(`${material.shortages} material shortage(s)`);
  if (overdueOperations > 0) reasons.push(`${overdueOperations} operation(s) overdue`);
  if (overdueTasks > 0) reasons.push(`${overdueTasks} task(s) overdue`);
  if (targetState === "overdue") reasons.push("internal target date overdue");
  if (targetState === "due_soon") reasons.push("internal target date due soon");

  return reasons.length > 0 ? { level: "attention", reasons } : { level: "clear", reasons: [] };
}
