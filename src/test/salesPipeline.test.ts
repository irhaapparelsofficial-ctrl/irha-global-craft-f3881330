import { describe, expect, it } from "vitest";
import {
  dueBucket,
  nextBestAction,
  normalizeStage,
  referenceFor,
  sortSalesCards,
  taskCounts,
  type SalesCard,
  type SalesTask,
} from "@/lib/salesPipeline";

function card(overrides: Partial<SalesCard> = {}): SalesCard {
  return {
    key: "inquiry:12345678-1234-1234-1234-123456789012",
    source: "inquiry",
    sourceId: "12345678-1234-1234-1234-123456789012",
    reference: "IRQ-12345678",
    stage: "new",
    name: "Buyer",
    company: "Alpine GmbH",
    country: "Germany",
    email: "buyer@example.com",
    phone: "",
    website: "",
    productInterest: "Lederhosen",
    quantity: "300 pieces",
    message: "Private-label enquiry",
    priority: "normal",
    followUpAt: null,
    assignee: "",
    quotationUrl: "",
    sampleStatus: "not_requested",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

function task(overrides: Partial<SalesTask> = {}): SalesTask {
  return {
    id: "task-1",
    source_type: "inquiry",
    source_id: "12345678-1234-1234-1234-123456789012",
    title: "Follow up",
    notes: null,
    priority: "normal",
    status: "open",
    due_at: null,
    assigned_to: null,
    completed_at: null,
    created_at: "2026-07-01T00:00:00.000Z",
    updated_at: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("sales pipeline rules", () => {
  it("maps legacy source statuses into canonical stages", () => {
    expect(normalizeStage("Pitched")).toBe("contacted");
    expect(normalizeStage("Warm")).toBe("qualified");
    expect(normalizeStage("waiting")).toBe("negotiation");
    expect(normalizeStage("unknown")).toBe("new");
  });

  it("creates stable buyer references", () => {
    expect(referenceFor("catalogue", "abcdef12-3456")).toBe("CAT-ABCDEF12");
  });

  it("prioritizes overdue follow-up as next action", () => {
    expect(nextBestAction(card({ followUpAt: "2020-01-01T00:00:00.000Z" }))).toBe("Complete overdue follow-up");
  });

  it("asks for verified contact before outreach", () => {
    expect(nextBestAction(card({ email: "", phone: "" }))).toBe("Verify buyer contact");
  });

  it("sorts urgent cards before normal cards", () => {
    const values = sortSalesCards([
      card({ key: "normal", priority: "normal" }),
      card({ key: "urgent", priority: "urgent" }),
    ]);
    expect(values[0].key).toBe("urgent");
  });

  it("counts open, overdue and completed tasks truthfully", () => {
    const now = new Date("2026-07-13T12:00:00.000Z");
    const result = taskCounts([
      task({ id: "overdue", due_at: "2026-07-12T12:00:00.000Z" }),
      task({ id: "today", due_at: "2026-07-13T15:00:00.000Z" }),
      task({ id: "done", status: "completed", completed_at: "2026-07-13T10:00:00.000Z" }),
    ], now);
    expect(result).toEqual({ open: 2, overdue: 1, today: 1, completed: 1 });
    expect(dueBucket("2026-07-13T15:00:00.000Z", now)).toBe("today");
  });
});
