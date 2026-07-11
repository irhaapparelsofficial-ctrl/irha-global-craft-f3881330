import { describe, expect, it } from "vitest";
import { operationQueueState, summarizeOperationQueues } from "@/lib/ownerOperations";

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
});
