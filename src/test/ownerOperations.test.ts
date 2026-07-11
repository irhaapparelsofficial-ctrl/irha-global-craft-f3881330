import { describe, expect, it } from "vitest";
import {
  operationQueueState,
  ownerDailyBriefText,
  summarizeOperationQueues,
} from "@/lib/ownerOperations";

describe("Owner Operations Center", () => {
  it("never treats an unavailable source as a clear zero", () => {
    const result = { count: null, error: "relation does not exist", checked: true };
    expect(operationQueueState(result)).toBe("pending");
  });

  it("distinguishes loading, attention and clear queues", () => {
    expect(operationQueueState({ count: null, error: null, checked: false })).toBe("loading");
    expect(operationQueueState({ count: 3, error: null, checked: true })).toBe("attention");
    expect(operationQueueState({ count: 0, error: null, checked: true })).toBe("clear");
  });

  it("sums only readable systems", () => {
    const summary = summarizeOperationQueues({
      ai: { count: 2, error: null, checked: true },
      leads: { count: 4, error: null, checked: true },
      social: { count: null, error: "backend pending", checked: true },
      seo: { count: null, error: null, checked: false },
    });

    expect(summary.attention).toBe(6);
    expect(summary.available).toBe(2);
    expect(summary.pendingSources).toBe(1);
    expect(summary.total).toBe(4);
  });

  it("formats a daily brief without converting pending sources into zero", () => {
    const brief = ownerDailyBriefText({
      generatedAt: new Date("2026-07-12T08:00:00.000Z"),
      rulesScore: 71,
      rulesApproved: false,
      queues: {
        ai: { count: 2, error: null, checked: true },
        production: { count: null, error: "backend pending", checked: true },
        social: { count: 0, error: null, checked: true },
      },
      labels: {
        ai: "AI approvals",
        production: "Production risk",
        social: "Social attention",
      },
    });

    expect(brief).toContain("AI approvals: 2 requiring attention");
    expect(brief).toContain("Production risk: Backend pending");
    expect(brief).toContain("Social attention: 0 clear");
    expect(brief).toContain("Business Rules: 71% · plan-only");
    expect(brief).toContain("Final price and quotation");
  });

  it("reports approved rules separately from queue health", () => {
    const brief = ownerDailyBriefText({
      generatedAt: new Date("2026-07-12T08:00:00.000Z"),
      rulesScore: 100,
      rulesApproved: true,
      queues: {
        production: { count: 0, error: null, checked: true },
      },
      labels: { production: "Production risk" },
    });

    expect(brief).toContain("Business Rules: 100% · approved");
    expect(brief).toContain("Production risk: 0 clear");
  });
});
