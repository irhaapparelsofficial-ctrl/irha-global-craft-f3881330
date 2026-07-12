export const SALES_STAGES = [
  "new",
  "qualified",
  "contacted",
  "replied",
  "sample_requested",
  "quote_requested",
  "quotation_sent",
  "negotiation",
  "won",
  "lost",
] as const;

export type SalesStage = (typeof SALES_STAGES)[number];
export type SalesSource = "inquiry" | "catalogue" | "prospect";
export type SalesPriority = "low" | "normal" | "high" | "urgent";
export type TaskStatus = "open" | "completed" | "cancelled";

export type SalesCard = {
  key: string;
  source: SalesSource;
  sourceId: string;
  reference: string;
  stage: SalesStage;
  name: string;
  company: string;
  country: string;
  email: string;
  phone: string;
  website: string;
  productInterest: string;
  quantity: string;
  message: string;
  priority: SalesPriority;
  followUpAt: string | null;
  assignee: string;
  quotationUrl: string;
  sampleStatus: string;
  createdAt: string;
  updatedAt: string;
};

export type SalesTask = {
  id: string;
  source_type: SalesSource;
  source_id: string;
  title: string;
  notes: string | null;
  priority: SalesPriority;
  status: TaskStatus;
  due_at: string | null;
  assigned_to: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export const STAGE_LABELS: Record<SalesStage, string> = {
  new: "New",
  qualified: "Qualified",
  contacted: "Contacted",
  replied: "Replied",
  sample_requested: "Sample",
  quote_requested: "Quote requested",
  quotation_sent: "Quote sent",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

export const ACTIVE_STAGES = SALES_STAGES.filter((stage) => !["won", "lost"].includes(stage));

const LEGACY_MAP: Record<string, SalesStage> = {
  New: "new",
  Pitched: "contacted",
  Warm: "qualified",
  Replied: "replied",
  Rejected: "lost",
  read: "new",
  unqualified: "lost",
  follow_up: "contacted",
  quoted: "quotation_sent",
  waiting: "negotiation",
  spam: "lost",
};

export function normalizeStage(value: unknown): SalesStage {
  if (typeof value !== "string") return "new";
  if (SALES_STAGES.includes(value as SalesStage)) return value as SalesStage;
  return LEGACY_MAP[value] || "new";
}

export function normalizePriority(value: unknown): SalesPriority {
  return value === "low" || value === "high" || value === "urgent" ? value : "normal";
}

export function referenceFor(source: SalesSource, id: string) {
  const prefix = source === "inquiry" ? "IRQ" : source === "catalogue" ? "CAT" : "PRO";
  return `${prefix}-${id.slice(0, 8).toUpperCase()}`;
}

export function stageProgress(stage: SalesStage) {
  const index = SALES_STAGES.indexOf(stage);
  if (stage === "lost") return 0;
  return Math.round((Math.max(index, 0) / (SALES_STAGES.length - 2)) * 100);
}

export function dueBucket(value: string | null, now = new Date()) {
  if (!value) return "none" as const;
  const due = new Date(value);
  if (Number.isNaN(due.getTime())) return "none" as const;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const end = start + 86_400_000;
  if (due.getTime() < now.getTime()) return "overdue" as const;
  if (due.getTime() >= start && due.getTime() < end) return "today" as const;
  return "upcoming" as const;
}

export function sortSalesCards(cards: SalesCard[]) {
  const priorityRank: Record<SalesPriority, number> = { urgent: 4, high: 3, normal: 2, low: 1 };
  return [...cards].sort((a, b) => {
    const dueA = a.followUpAt ? new Date(a.followUpAt).getTime() : Number.MAX_SAFE_INTEGER;
    const dueB = b.followUpAt ? new Date(b.followUpAt).getTime() : Number.MAX_SAFE_INTEGER;
    return priorityRank[b.priority] - priorityRank[a.priority]
      || dueA - dueB
      || new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
  });
}

export function nextBestAction(card: SalesCard) {
  if (card.stage === "lost") return "No active sales action";
  if (card.stage === "won") return "Prepare repeat-order follow-up";
  if (dueBucket(card.followUpAt) === "overdue") return "Complete overdue follow-up";
  if (!card.email && !card.phone) return "Verify buyer contact";
  if (!card.company) return "Confirm buyer company";
  if (!card.productInterest) return "Confirm product requirement";
  if (!card.quantity && card.source !== "prospect") return "Ask estimated quantity";
  if (card.stage === "new") return "Review and qualify buyer";
  if (card.stage === "qualified") return "Prepare first outreach";
  if (card.stage === "contacted") return "Schedule response follow-up";
  if (card.stage === "replied") return "Confirm full requirement";
  if (card.stage === "sample_requested") return "Confirm sample brief";
  if (card.stage === "quote_requested") return "Prepare quotation";
  if (card.stage === "quotation_sent") return "Schedule quotation follow-up";
  if (card.stage === "negotiation") return "Review open commercial points";
  return "Review buyer record";
}

export function taskCounts(tasks: SalesTask[], now = new Date()) {
  const open = tasks.filter((task) => task.status === "open");
  return {
    open: open.length,
    overdue: open.filter((task) => dueBucket(task.due_at, now) === "overdue").length,
    today: open.filter((task) => dueBucket(task.due_at, now) === "today").length,
    completed: tasks.filter((task) => task.status === "completed").length,
  };
}
