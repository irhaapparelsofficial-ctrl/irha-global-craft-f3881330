import { describe, expect, it } from "vitest";
import {
  allowedStageChanges,
  dueState,
  nextProductionStage,
  productionJobReadiness,
  productionStageProgress,
  stageChangeRequiresOwnerApproval,
} from "@/lib/productionWorkflow";

describe("sample and production workflow", () => {
  it("moves through the defined internal production sequence", () => {
    expect(nextProductionStage("briefing")).toBe("spec_locked");
    expect(nextProductionStage("qc")).toBe("packing");
    expect(nextProductionStage("completed")).toBeNull();
    expect(productionStageProgress("briefing")).toBe(0);
    expect(productionStageProgress("completed")).toBe(100);
  });

  it("requires owner approval for buyer-impacting stages", () => {
    expect(stageChangeRequiresOwnerApproval("briefing", "spec_locked")).toBe(true);
    expect(stageChangeRequiresOwnerApproval("qc", "packing")).toBe(false);
    expect(stageChangeRequiresOwnerApproval("ready_to_ship", "shipped")).toBe(true);
    expect(stageChangeRequiresOwnerApproval("stitching", "cancelled")).toBe(true);
  });

  it("offers only controlled next, hold and cancellation transitions", () => {
    expect(allowedStageChanges("cutting")).toEqual(["printing_embroidery", "on_hold", "cancelled"]);
    expect(allowedStageChanges("completed")).toEqual([]);
  });

  it("does not create a job without an approved specification reference", () => {
    const result = productionJobReadiness({
      buyerName: "Buyer",
      product: "Lederhosen",
      quantity: "300 pieces",
      specificationReference: "",
      targetDate: "2026-08-15",
    });
    expect(result.ready).toBe(false);
    expect(result.missing).toContain("approved specification reference");
  });

  it("classifies overdue and near internal targets", () => {
    expect(dueState("2020-01-01")).toBe("overdue");
    expect(dueState(null)).toBe("unscheduled");
  });
});
