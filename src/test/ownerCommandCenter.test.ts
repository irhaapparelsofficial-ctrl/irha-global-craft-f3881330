import { describe, expect, it } from "vitest";
import {
  buildOwnerActions,
  calculateOwnerMetrics,
  calculateTeamWorkload,
  filterOwnerActions,
  ownerReportCsv,
  type BuyerSummaryRow,
  type MeetingSummaryRow,
  type QuoteSummaryRow,
  type SampleSummaryRow,
  type TaskSummaryRow,
} from "@/lib/ownerCommandCenter";

const now = new Date("2026-07-13T12:00:00.000Z");

const buyers: BuyerSummaryRow[] = [
  {
    key: "inquiry:one",
    reference: "IRQ-ONE",
    stage: "new",
    priority: "high",
    followUpAt: "2026-07-12T12:00:00.000Z",
    assignee: null,
    createdAt: "2026-07-13T08:00:00.000Z",
    company: "Alpine GmbH",
  },
  {
    key: "prospect:two",
    reference: "PRO-TWO",
    stage: "won",
    priority: "normal",
    followUpAt: null,
    assignee: "sales@example.com",
    createdAt: "2026-07-01T08:00:00.000Z",
    company: "Retail AG",
  },
];

const tasks: TaskSummaryRow[] = [
  {
    id: "task-one",
    title: "Follow up quotation",
    priority: "urgent",
    status: "open",
    dueAt: "2026-07-12T09:00:00.000Z",
    assignee: "sales@example.com",
    reference: "IRQ-ONE",
  },
];

const meetings: MeetingSummaryRow[] = [
  {
    id: "meeting-one",
    reference: "IA-M-2026-00001",
    title: "Factory video call",
    status: "scheduled",
    startAt: "2026-07-13T15:00:00.000Z",
    assignee: "sales@example.com",
  },
];

const samples: SampleSummaryRow[] = [
  {
    id: "sample-one",
    reference: "IA-S-2026-00001",
    product: "Lederhosen",
    status: "feedback",
    updatedAt: "2026-07-13T10:00:00.000Z",
    assignee: null,
  },
];

const quotations: QuoteSummaryRow[] = [
  {
    id: "quote-one",
    reference: "IA-Q-2026-00001",
    company: "Alpine GmbH",
    status: "owner_review",
    validUntil: "2026-07-20",
    total: 2500,
    currency: "EUR",
    assignee: "sales@example.com",
  },
];

describe("daily owner command center", () => {
  it("calculates truthful daily metrics", () => {
    const metrics = calculateOwnerMetrics({ buyers, tasks, meetings, samples, quotations, now });
    expect(metrics.activePipeline).toBe(1);
    expect(metrics.newToday).toBe(1);
    expect(metrics.overdueFollowUps).toBe(1);
    expect(metrics.overdueTasks).toBe(1);
    expect(metrics.meetingsToday).toBe(1);
    expect(metrics.quoteReviews).toBe(1);
    expect(metrics.activeSamples).toBe(1);
    expect(metrics.won).toBe(1);
  });

  it("ranks overdue urgent work and preserves owner-review quotations", () => {
    const actions = buildOwnerActions({ buyers, tasks, meetings, samples, quotations, now });
    expect(actions[0].kind).toBe("task");
    expect(actions[0].priority).toBe("urgent");
    expect(actions.some((action) => action.kind === "quotation")).toBe(true);
    expect(actions.some((action) => action.kind === "meeting")).toBe(true);
  });

  it("filters saved owner presets without inventing data", () => {
    const actions = buildOwnerActions({ buyers, tasks, meetings, samples, quotations, now });
    expect(filterOwnerActions(actions, "quote_review")).toHaveLength(1);
    expect(filterOwnerActions(actions, "meetings_today")).toHaveLength(1);
    expect(filterOwnerActions(actions, "unassigned").length).toBeGreaterThan(0);
  });

  it("aggregates workload by assignee and unassigned records", () => {
    const workload = calculateTeamWorkload({ buyers, tasks, samples, quotations, now });
    const sales = workload.find((row) => row.assignee === "sales@example.com");
    const unassigned = workload.find((row) => row.assignee === "Unassigned");
    expect(sales?.tasks).toBe(1);
    expect(sales?.quotes).toBe(1);
    expect(unassigned?.buyers).toBe(1);
    expect(unassigned?.samples).toBe(1);
  });

  it("exports a real CSV report with metrics and workload", () => {
    const metrics = calculateOwnerMetrics({ buyers, tasks, meetings, samples, quotations, now });
    const workload = calculateTeamWorkload({ buyers, tasks, samples, quotations, now });
    const csv = ownerReportCsv(metrics, workload, now);
    expect(csv).toContain("Irha Apparels Daily Owner Report");
    expect(csv).toContain("Overdue follow-ups,1");
    expect(csv).toContain("sales@example.com");
  });
});