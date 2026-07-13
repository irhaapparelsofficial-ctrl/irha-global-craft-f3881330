import { describe, expect, it } from "vitest";
import {
  dateState,
  jobReleaseReadiness,
  materialCoveragePercent,
  materialReadiness,
  materialShortage,
  operationProgress,
  productionRisk,
} from "@/lib/productionOperations";

const materials = [
  { requiredQuantity: 100, availableQuantity: 100, critical: true, status: "available" as const },
  { requiredQuantity: 20, availableQuantity: 10, critical: false, status: "partial" as const },
];

const operations = [
  { status: "completed" as const, plannedEnd: "2026-07-10" },
  { status: "in_progress" as const, plannedEnd: "2026-07-15" },
];

const tasks = [{ status: "open" as const, dueAt: "2026-07-15" }];

describe("production operations", () => {
  it("calculates material shortages and coverage safely", () => {
    expect(materialShortage(100, 70)).toBe(30);
    expect(materialShortage(10, 20)).toBe(0);
    expect(materialCoveragePercent(100, 70)).toBe(70);
    expect(materialCoveragePercent(0, 0)).toBe(100);
  });

  it("blocks release only for critical material gaps", () => {
    expect(materialReadiness(materials).ready).toBe(true);
    expect(materialReadiness(materials).shortages).toBe(1);
    const blocked = materialReadiness([
      { requiredQuantity: 10, availableQuantity: 2, critical: true, status: "partial" },
    ]);
    expect(blocked.ready).toBe(false);
    expect(blocked.blockedCritical).toBe(1);
  });

  it("requires specification, materials and operation plan before release", () => {
    const ready = jobReleaseReadiness({
      specificationReference: "TECH-PACK-22",
      materials,
      operations,
      tasks,
    });
    expect(ready.ready).toBe(true);

    const incomplete = jobReleaseReadiness({
      specificationReference: "",
      materials: [],
      operations: [],
      tasks: [{ status: "blocked" }],
    });
    expect(incomplete.ready).toBe(false);
    expect(incomplete.missing).toContain("approved specification reference");
    expect(incomplete.missing).toContain("material requirements");
    expect(incomplete.missing).toContain("production operations");
    expect(incomplete.missing).toContain("blocked tasks");
  });

  it("reports deterministic progress and date states", () => {
    expect(operationProgress(operations)).toBe(50);
    expect(dateState("2026-07-12", new Date("2026-07-13T00:00:00Z").getTime())).toBe("overdue");
    expect(dateState("2026-07-15", new Date("2026-07-13T00:00:00Z").getTime())).toBe("due_soon");
  });

  it("keeps blocked risk separate from attention risk", () => {
    expect(productionRisk({
      materials,
      operations: [{ status: "blocked" }],
      tasks,
      targetDate: "2026-07-20",
      now: new Date("2026-07-13T00:00:00Z").getTime(),
    }).level).toBe("blocked");

    const attention = productionRisk({
      materials,
      operations,
      tasks,
      targetDate: "2026-07-14",
      now: new Date("2026-07-13T00:00:00Z").getTime(),
    });
    expect(attention.level).toBe("attention");
    expect(attention.reasons.length).toBeGreaterThan(0);
  });
});
