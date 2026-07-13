import { dueBucket, normalizePriority, normalizeStage, type SalesPriority, type SalesStage } from "@/lib/salesPipeline";

export type OwnerPresetKey =
  | "all_actions"
  | "overdue_sales"
  | "unassigned"
  | "quote_review"
  | "active_samples"
  | "meetings_today"
  | "new_buyers";

export type OwnerAction = {
  key: string;
  kind: "buyer" | "task" | "meeting" | "sample" | "quotation";
  title: string;
  detail: string;
  priority: SalesPriority;
  dueAt: string | null;
  assignee: string;
  module: "pipeline" | "buyer360" | "commercial" | "leads";
  presetTags: OwnerPresetKey[];
};

export type OwnerMetrics = {
  activePipeline: number;
  newToday: number;
  overdueFollowUps: number;
  openTasks: number;
  overdueTasks: number;
  meetingsToday: number;
  quoteReviews: number;
  activeSamples: number;
  won: number;
};

export type TeamWorkload = {
  assignee: string;
  buyers: number;
  tasks: number;
  overdue: number;
  quotes: number;
  samples: number;
  total: number;
};

export type BuyerSummaryRow = {
  key: string;
  reference: string;
  stage: string | null;
  priority: string | null;
  followUpAt: string | null;
  assignee: string | null;
  createdAt: string;
  company: string;
};

export type TaskSummaryRow = {
  id: string;
  title: string;
  priority: string | null;
  status: string;
  dueAt: string | null;
  assignee: string | null;
  reference: string;
};

export type MeetingSummaryRow = {
  id: string;
  reference: string;
  title: string;
  status: string;
  startAt: string;
  assignee?: string | null;
};

export type SampleSummaryRow = {
  id: string;
  reference: string;
  product: string;
  status: string;
  updatedAt: string;
  assignee?: string | null;
};

export type QuoteSummaryRow = {
  id: string;
  reference: string;
  company: string;
  status: string;
  validUntil: string;
  total: number;
  currency: string;
  assignee?: string | null;
};

export const OWNER_PRESETS: Array<{
  key: OwnerPresetKey;
  label: string;
  module: OwnerAction["module"];
  description: string;
}> = [
  { key: "all_actions", label: "All actions", module: "pipeline", description: "Every current owner action." },
  { key: "overdue_sales", label: "Overdue sales", module: "pipeline", description: "Overdue follow-ups and tasks." },
  { key: "unassigned", label: "Unassigned", module: "pipeline", description: "Records without an assignee." },
  { key: "quote_review", label: "Quote review", module: "commercial", description: "Quotations waiting for owner review." },
  { key: "active_samples", label: "Active samples", module: "commercial", description: "Samples still in development or feedback." },
  { key: "meetings_today", label: "Meetings today", module: "commercial", description: "Scheduled buyer meetings today." },
  { key: "new_buyers", label: "New buyers", module: "leads", description: "New records created today." },
];

function dayRange(now: Date) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getTime() + 86_400_000);
  return { start, end };
}

function sameDay(value: string, now: Date) {
  const time = new Date(value).getTime();
  const { start, end } = dayRange(now);
  return Number.isFinite(time) && time >= start.getTime() && time < end.getTime();
}

function activeStage(value: string | null): SalesStage {
  return normalizeStage(value);
}

export function calculateOwnerMetrics(input: {
  buyers: BuyerSummaryRow[];
  tasks: TaskSummaryRow[];
  meetings: MeetingSummaryRow[];
  samples: SampleSummaryRow[];
  quotations: QuoteSummaryRow[];
  now?: Date;
}): OwnerMetrics {
  const now = input.now || new Date();
  const activeBuyers = input.buyers.filter((row) => !["won", "lost"].includes(activeStage(row.stage)));
  const openTasks = input.tasks.filter((row) => row.status === "open");
  return {
    activePipeline: activeBuyers.length,
    newToday: input.buyers.filter((row) => sameDay(row.createdAt, now)).length,
    overdueFollowUps: activeBuyers.filter((row) => dueBucket(row.followUpAt, now) === "overdue").length,
    openTasks: openTasks.length,
    overdueTasks: openTasks.filter((row) => dueBucket(row.dueAt, now) === "overdue").length,
    meetingsToday: input.meetings.filter((row) => row.status === "scheduled" && sameDay(row.startAt, now)).length,
    quoteReviews: input.quotations.filter((row) => row.status === "owner_review").length,
    activeSamples: input.samples.filter((row) => !["accepted", "rejected", "cancelled"].includes(row.status)).length,
    won: input.buyers.filter((row) => activeStage(row.stage) === "won").length,
  };
}

function buyerAction(row: BuyerSummaryRow, now: Date): OwnerAction | null {
  const stage = activeStage(row.stage);
  if (["won", "lost"].includes(stage)) return null;
  const bucket = dueBucket(row.followUpAt, now);
  const tags: OwnerPresetKey[] = ["all_actions"];
  if (bucket === "overdue") tags.push("overdue_sales");
  if (!row.assignee?.trim()) tags.push("unassigned");
  if (sameDay(row.createdAt, now)) tags.push("new_buyers");
  const title = bucket === "overdue" ? "Complete overdue buyer follow-up" : stage === "new" ? "Review new buyer" : "Review next sales action";
  return {
    key: `buyer:${row.key}`,
    kind: "buyer",
    title,
    detail: `${row.reference} · ${row.company || "Buyer"} · ${stage.replaceAll("_", " ")}`,
    priority: normalizePriority(row.priority),
    dueAt: row.followUpAt,
    assignee: row.assignee || "",
    module: stage === "new" ? "leads" : "pipeline",
    presetTags: tags,
  };
}

export function buildOwnerActions(input: {
  buyers: BuyerSummaryRow[];
  tasks: TaskSummaryRow[];
  meetings: MeetingSummaryRow[];
  samples: SampleSummaryRow[];
  quotations: QuoteSummaryRow[];
  now?: Date;
}): OwnerAction[] {
  const now = input.now || new Date();
  const actions: OwnerAction[] = [];

  input.buyers.forEach((row) => {
    const action = buyerAction(row, now);
    if (action) actions.push(action);
  });

  input.tasks.filter((row) => row.status === "open").forEach((row) => {
    const bucket = dueBucket(row.dueAt, now);
    const tags: OwnerPresetKey[] = ["all_actions"];
    if (bucket === "overdue") tags.push("overdue_sales");
    if (!row.assignee?.trim()) tags.push("unassigned");
    actions.push({
      key: `task:${row.id}`,
      kind: "task",
      title: row.title,
      detail: `${row.reference} · ${bucket === "none" ? "No due date" : bucket}`,
      priority: normalizePriority(row.priority),
      dueAt: row.dueAt,
      assignee: row.assignee || "",
      module: "pipeline",
      presetTags: tags,
    });
  });

  input.meetings.filter((row) => row.status === "scheduled" && sameDay(row.startAt, now)).forEach((row) => {
    actions.push({
      key: `meeting:${row.id}`,
      kind: "meeting",
      title: row.title,
      detail: `${row.reference} · ${new Date(row.startAt).toLocaleTimeString()}`,
      priority: "high",
      dueAt: row.startAt,
      assignee: row.assignee || "",
      module: "commercial",
      presetTags: ["all_actions", "meetings_today", ...(row.assignee?.trim() ? [] : ["unassigned" as const])],
    });
  });

  input.samples.filter((row) => !["accepted", "rejected", "cancelled"].includes(row.status)).forEach((row) => {
    actions.push({
      key: `sample:${row.id}`,
      kind: "sample",
      title: `Review sample: ${row.product}`,
      detail: `${row.reference} · ${row.status.replaceAll("_", " ")}`,
      priority: row.status === "feedback" ? "high" : "normal",
      dueAt: row.updatedAt,
      assignee: row.assignee || "",
      module: "commercial",
      presetTags: ["all_actions", "active_samples", ...(row.assignee?.trim() ? [] : ["unassigned" as const])],
    });
  });

  input.quotations.filter((row) => row.status === "owner_review").forEach((row) => {
    actions.push({
      key: `quote:${row.id}`,
      kind: "quotation",
      title: `Review quotation ${row.reference}`,
      detail: `${row.company || "Buyer"} · ${row.currency} ${row.total.toFixed(2)} · valid ${new Date(row.validUntil).toLocaleDateString()}`,
      priority: "urgent",
      dueAt: row.validUntil,
      assignee: row.assignee || "",
      module: "commercial",
      presetTags: ["all_actions", "quote_review", ...(row.assignee?.trim() ? [] : ["unassigned" as const])],
    });
  });

  const rank: Record<SalesPriority, number> = { urgent: 4, high: 3, normal: 2, low: 1 };
  return actions.sort((left, right) => {
    const leftOverdue = dueBucket(left.dueAt, now) === "overdue" ? 1 : 0;
    const rightOverdue = dueBucket(right.dueAt, now) === "overdue" ? 1 : 0;
    const leftDue = left.dueAt ? new Date(left.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
    const rightDue = right.dueAt ? new Date(right.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
    return rightOverdue - leftOverdue || rank[right.priority] - rank[left.priority] || leftDue - rightDue || left.key.localeCompare(right.key);
  });
}

export function filterOwnerActions(actions: OwnerAction[], preset: OwnerPresetKey) {
  return preset === "all_actions" ? actions : actions.filter((action) => action.presetTags.includes(preset));
}

export function calculateTeamWorkload(input: {
  buyers: BuyerSummaryRow[];
  tasks: TaskSummaryRow[];
  samples: SampleSummaryRow[];
  quotations: QuoteSummaryRow[];
  now?: Date;
}): TeamWorkload[] {
  const now = input.now || new Date();
  const map = new Map<string, TeamWorkload>();
  const get = (value: string | null | undefined) => {
    const assignee = value?.trim() || "Unassigned";
    const current = map.get(assignee) || { assignee, buyers: 0, tasks: 0, overdue: 0, quotes: 0, samples: 0, total: 0 };
    map.set(assignee, current);
    return current;
  };

  input.buyers.filter((row) => !["won", "lost"].includes(activeStage(row.stage))).forEach((row) => {
    const item = get(row.assignee);
    item.buyers += 1;
    item.total += 1;
    if (dueBucket(row.followUpAt, now) === "overdue") item.overdue += 1;
  });
  input.tasks.filter((row) => row.status === "open").forEach((row) => {
    const item = get(row.assignee);
    item.tasks += 1;
    item.total += 1;
    if (dueBucket(row.dueAt, now) === "overdue") item.overdue += 1;
  });
  input.samples.filter((row) => !["accepted", "rejected", "cancelled"].includes(row.status)).forEach((row) => {
    const item = get(row.assignee);
    item.samples += 1;
    item.total += 1;
  });
  input.quotations.filter((row) => ["owner_review", "approved", "sent"].includes(row.status)).forEach((row) => {
    const item = get(row.assignee);
    item.quotes += 1;
    item.total += 1;
  });

  return Array.from(map.values()).sort((left, right) => right.overdue - left.overdue || right.total - left.total || left.assignee.localeCompare(right.assignee));
}

export function ownerReportCsv(metrics: OwnerMetrics, workloads: TeamWorkload[], generatedAt = new Date()) {
  const rows = [
    ["Irha Apparels Daily Owner Report"],
    ["Generated", generatedAt.toISOString()],
    [],
    ["Metric", "Value"],
    ["Active pipeline", metrics.activePipeline],
    ["New buyers today", metrics.newToday],
    ["Overdue follow-ups", metrics.overdueFollowUps],
    ["Open tasks", metrics.openTasks],
    ["Overdue tasks", metrics.overdueTasks],
    ["Meetings today", metrics.meetingsToday],
    ["Quotes for owner review", metrics.quoteReviews],
    ["Active samples", metrics.activeSamples],
    ["Won records", metrics.won],
    [],
    ["Assignee", "Buyer records", "Open tasks", "Overdue", "Quotes", "Samples", "Total workload"],
    ...workloads.map((row) => [row.assignee, row.buyers, row.tasks, row.overdue, row.quotes, row.samples, row.total]),
  ];
  return rows.map((row) => row.map((value) => {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }).join(",")).join("\n");
}
