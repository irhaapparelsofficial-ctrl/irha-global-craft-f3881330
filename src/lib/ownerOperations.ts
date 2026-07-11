export type OperationQueueResult = {
  count: number | null;
  error: string | null;
  checked: boolean;
};

export type OperationQueueState = "loading" | "pending" | "attention" | "clear";

export function operationQueueState(result: OperationQueueResult): OperationQueueState {
  if (!result.checked) return "loading";
  if (result.error || result.count === null) return "pending";
  return result.count > 0 ? "attention" : "clear";
}

export function summarizeOperationQueues(queues: Record<string, OperationQueueResult>) {
  const values = Object.values(queues);
  const readable = values.filter((queue) => queue.checked && queue.error === null && queue.count !== null);
  return {
    attention: readable.reduce((total, queue) => total + (queue.count ?? 0), 0),
    available: readable.length,
    pendingSources: values.filter((queue) => queue.checked && (queue.error !== null || queue.count === null)).length,
    total: values.length,
  };
}

export function ownerDailyBriefText(args: {
  generatedAt: Date;
  rulesScore: number;
  rulesApproved: boolean;
  queues: Record<string, OperationQueueResult>;
  labels: Record<string, string>;
}) {
  const summary = summarizeOperationQueues(args.queues);
  const queueLines = Object.entries(args.queues).map(([key, result]) => {
    const label = args.labels[key] ?? key;
    const state = operationQueueState(result);
    if (state === "pending") return `- ${label}: Backend pending`;
    if (state === "loading") return `- ${label}: Not checked`;
    return `- ${label}: ${result.count ?? 0}${state === "attention" ? " requiring attention" : " clear"}`;
  });

  return [
    "IRHA APPARELS — OWNER DAILY BRIEF",
    `Generated: ${args.generatedAt.toLocaleString()}`,
    "",
    `Total readable attention items: ${summary.attention}`,
    `Readable systems: ${summary.available}/${summary.total}`,
    `Backend pending systems: ${summary.pendingSources}`,
    `Business Rules: ${args.rulesScore}% · ${args.rulesApproved ? "approved" : "plan-only"}`,
    "",
    "OPERATIONS",
    ...queueLines,
    "",
    "OWNER DECISIONS REMAIN REQUIRED FOR",
    "- Final price and quotation",
    "- Discount or payment terms",
    "- Sample approval or rejection",
    "- Production/delivery commitment",
    "- Shipment claim or buyer notification",
    "- Public social/listing publication",
  ].join("\n");
}
