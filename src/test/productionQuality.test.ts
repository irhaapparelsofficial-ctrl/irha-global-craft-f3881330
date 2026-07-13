import { describe, expect, it } from "vitest";
import {
  defectSummary,
  inspectionReadiness,
  qualityGateReadiness,
  safeEvidenceFileName,
  sampleDecisionNeedsEvidence,
  validateProductionEvidenceFile,
} from "@/lib/productionQuality";

describe("production quality rules", () => {
  it("blocks inspection completion when required checks or serious defects remain", () => {
    const result = inspectionReadiness(
      [
        { required: true, result: "pass" },
        { required: true, result: "not_checked" },
      ],
      [{ severity: "major", status: "open" }],
    );
    expect(result.ready).toBe(false);
    expect(result.missing.join(" ")).toMatch(/not checked/i);
    expect(result.blockers.join(" ")).toMatch(/major/i);
    expect(result.suggestedStatus).toBe("failed");
  });

  it("allows conditional inspection only for minor/non-required evidence", () => {
    const result = inspectionReadiness(
      [
        { required: true, result: "pass" },
        { required: false, result: "fail" },
      ],
      [{ severity: "minor", status: "rework" }],
    );
    expect(result.ready).toBe(true);
    expect(result.suggestedStatus).toBe("conditional");
  });

  it("requires a passed final inspection and no open major or critical defect", () => {
    expect(qualityGateReadiness({
      jobType: "order",
      inspections: [{ inspectionType: "inline", status: "passed" }],
      defects: [],
    }).ready).toBe(false);

    expect(qualityGateReadiness({
      jobType: "order",
      inspections: [{ inspectionType: "final", status: "passed" }],
      defects: [{ severity: "critical", status: "closed" }],
    }).ready).toBe(true);
  });

  it("does not treat buyer approval as confirmed without an approved decision", () => {
    const result = qualityGateReadiness({
      jobType: "sample",
      inspections: [{ inspectionType: "sample", status: "passed" }],
      defects: [],
      sampleDecision: "pending",
    });
    expect(result.ready).toBe(true);
    expect(result.buyerApprovalConfirmed).toBe(false);
    expect(sampleDecisionNeedsEvidence("approved")).toBe(true);
    expect(sampleDecisionNeedsEvidence("pending")).toBe(false);
  });

  it("summarizes only unresolved defects as open", () => {
    expect(defectSummary([
      { severity: "major", status: "open" },
      { severity: "major", status: "closed" },
      { severity: "minor", status: "accepted" },
    ])).toEqual({ total: 3, open: 1, critical: 0, major: 1, minor: 0 });
  });

  it("validates private evidence files and sanitizes names", () => {
    const valid = validateProductionEvidenceFile({ name: "QC Photo.JPG", type: "image/jpeg", size: 1024 } as File);
    expect(valid.valid).toBe(true);
    expect(safeEvidenceFileName("QC Photo (Final).JPG")).toBe("qc-photo-final-.jpg");

    const invalid = validateProductionEvidenceFile({ name: "script.html", type: "text/html", size: 1024 } as File);
    expect(invalid.valid).toBe(false);
  });
});
