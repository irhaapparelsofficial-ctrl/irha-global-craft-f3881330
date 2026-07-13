import { describe, expect, it } from "vitest";
import {
  defectPoints,
  firstPassYield,
  inspectionCountsAreValid,
  qcReleaseReadiness,
  qualityRisk,
  safeStorageName,
  validatePrivateEvidenceFile,
  type DefectEvidence,
  type InspectionEvidence,
} from "@/lib/productionQuality";

const passedFinal: InspectionEvidence = {
  type: "final",
  status: "passed",
  inspectedQuantity: 100,
  passedQuantity: 98,
  failedQuantity: 2,
};

const openMajor: DefectEvidence = {
  severity: "major",
  quantity: 1,
  reworkStatus: "open",
};

describe("production quality rules", () => {
  it("rejects impossible inspection quantities", () => {
    expect(inspectionCountsAreValid(passedFinal)).toBe(true);
    expect(inspectionCountsAreValid({ ...passedFinal, passedQuantity: 99, failedQuantity: 2 })).toBe(false);
    expect(inspectionCountsAreValid({ ...passedFinal, inspectedQuantity: 0 })).toBe(false);
  });

  it("blocks release without final evidence or with open major defects", () => {
    expect(qcReleaseReadiness({ jobType: "order", inspections: [], defects: [], sampleApprovals: [] }).ready).toBe(false);
    const result = qcReleaseReadiness({ jobType: "order", inspections: [passedFinal], defects: [openMajor], sampleApprovals: [] });
    expect(result.ready).toBe(false);
    expect(result.blockers.join(" ")).toMatch(/major defect/i);
  });

  it("requires approved sample reference for sample release", () => {
    const sampleInspection: InspectionEvidence = { ...passedFinal, type: "sample" };
    expect(qcReleaseReadiness({ jobType: "sample", inspections: [sampleInspection], defects: [], sampleApprovals: [] }).ready).toBe(false);
    expect(qcReleaseReadiness({
      jobType: "sample",
      inspections: [sampleInspection],
      defects: [],
      sampleApprovals: [{ status: "approved", approvedSpecificationReference: "SMP-REF-01" }],
    }).ready).toBe(true);
  });

  it("distinguishes blocked and attention evidence", () => {
    expect(qualityRisk({ inspections: [passedFinal], defects: [openMajor] })).toBe("attention");
    expect(qualityRisk({ inspections: [passedFinal], defects: [{ severity: "critical", quantity: 1, reworkStatus: "open" }] })).toBe("blocked");
    expect(qualityRisk({ inspections: [passedFinal], defects: [{ ...openMajor, reworkStatus: "verified" }] })).toBe("clear");
  });

  it("calculates observed quality metrics only", () => {
    expect(firstPassYield([passedFinal])).toBe(98);
    expect(firstPassYield([])).toBeNull();
    expect(defectPoints([openMajor, { severity: "critical", quantity: 2, reworkStatus: "open" }])).toBe(24);
  });

  it("validates private evidence files and sanitizes paths", () => {
    expect(validatePrivateEvidenceFile({ name: "QC Final.jpg", type: "image/jpeg", size: 1000 }).valid).toBe(true);
    expect(validatePrivateEvidenceFile({ name: "bad.exe", type: "application/x-msdownload", size: 1000 }).valid).toBe(false);
    expect(validatePrivateEvidenceFile({ name: "huge.pdf", type: "application/pdf", size: 21 * 1024 * 1024 }).valid).toBe(false);
    expect(safeStorageName(" QC Final / Photo.JPG ")).toBe("qc-final-photo.jpg");
  });
});
