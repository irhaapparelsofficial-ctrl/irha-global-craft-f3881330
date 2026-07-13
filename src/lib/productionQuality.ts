export type QcInspectionType = "incoming" | "inline" | "final" | "sample" | "pre_shipment";
export type QcInspectionStatus = "draft" | "in_progress" | "passed" | "conditional" | "rework_required" | "failed" | "closed";
export type DefectSeverity = "minor" | "major" | "critical";
export type ReworkStatus = "open" | "assigned" | "in_progress" | "verified" | "closed" | "waived";
export type SampleApprovalStatus = "draft" | "internal_review" | "buyer_review" | "approved" | "changes_requested" | "rejected" | "archived";
export type EvidenceType = "inspection_photo" | "defect_photo" | "measurement_sheet" | "tech_pack" | "sample_photo" | "buyer_approval" | "shipping_document" | "other";

export type InspectionEvidence = {
  type: QcInspectionType;
  status: QcInspectionStatus;
  inspectedQuantity: number;
  passedQuantity: number;
  failedQuantity: number;
};

export type DefectEvidence = {
  severity: DefectSeverity;
  quantity: number;
  reworkStatus: ReworkStatus;
};

export type SampleApprovalEvidence = {
  status: SampleApprovalStatus;
  approvedSpecificationReference?: string | null;
};

const closedRework = new Set<ReworkStatus>(["verified", "closed", "waived"]);

export function inspectionCountsAreValid(inspection: InspectionEvidence) {
  if ([inspection.inspectedQuantity, inspection.passedQuantity, inspection.failedQuantity].some((value) => !Number.isFinite(value) || value < 0)) return false;
  if (inspection.passedQuantity + inspection.failedQuantity > inspection.inspectedQuantity) return false;
  if (["passed", "conditional", "rework_required", "failed", "closed"].includes(inspection.status) && inspection.inspectedQuantity <= 0) return false;
  return true;
}

export function defectOpen(defect: DefectEvidence) {
  return !closedRework.has(defect.reworkStatus);
}

export function qualityRisk(input: {
  inspections: InspectionEvidence[];
  defects: DefectEvidence[];
  sampleApprovalRequired?: boolean;
  sampleApprovals?: SampleApprovalEvidence[];
}) {
  const invalidInspection = input.inspections.some((inspection) => !inspectionCountsAreValid(inspection));
  const failedInspection = input.inspections.some((inspection) => ["failed", "rework_required"].includes(inspection.status));
  const openCritical = input.defects.some((defect) => defectOpen(defect) && defect.severity === "critical" && defect.quantity > 0);
  const openMajor = input.defects.some((defect) => defectOpen(defect) && defect.severity === "major" && defect.quantity > 0);
  const openMinor = input.defects.some((defect) => defectOpen(defect) && defect.severity === "minor" && defect.quantity > 0);
  const sampleApproved = !input.sampleApprovalRequired || Boolean(input.sampleApprovals?.some((approval) => approval.status === "approved" && approval.approvedSpecificationReference?.trim()));

  if (invalidInspection || failedInspection || openCritical || !sampleApproved) return "blocked" as const;
  if (openMajor || openMinor || input.inspections.some((inspection) => inspection.status === "conditional")) return "attention" as const;
  return "clear" as const;
}

export function qcReleaseReadiness(input: {
  jobType: "sample" | "order";
  inspections: InspectionEvidence[];
  defects: DefectEvidence[];
  sampleApprovals: SampleApprovalEvidence[];
}) {
  const blockers: string[] = [];
  const finalInspections = input.inspections.filter((inspection) => inspection.type === "final" || inspection.type === "pre_shipment" || (input.jobType === "sample" && inspection.type === "sample"));
  if (finalInspections.length === 0) blockers.push(input.jobType === "sample" ? "sample inspection" : "final or pre-shipment inspection");
  if (!finalInspections.some((inspection) => ["passed", "conditional", "closed"].includes(inspection.status) && inspectionCountsAreValid(inspection))) blockers.push("completed passing inspection evidence");
  if (input.inspections.some((inspection) => !inspectionCountsAreValid(inspection))) blockers.push("valid inspection quantities");

  const openCritical = input.defects.filter((defect) => defectOpen(defect) && defect.severity === "critical" && defect.quantity > 0).length;
  const openMajor = input.defects.filter((defect) => defectOpen(defect) && defect.severity === "major" && defect.quantity > 0).length;
  if (openCritical > 0) blockers.push(`${openCritical} open critical defect${openCritical === 1 ? "" : "s"}`);
  if (openMajor > 0) blockers.push(`${openMajor} open major defect${openMajor === 1 ? "" : "s"}`);

  if (input.jobType === "sample" && !input.sampleApprovals.some((approval) => approval.status === "approved" && approval.approvedSpecificationReference?.trim())) {
    blockers.push("approved sample specification reference");
  }

  return { ready: blockers.length === 0, blockers: Array.from(new Set(blockers)) };
}

export function defectPoints(defects: DefectEvidence[]) {
  return defects.reduce((sum, defect) => {
    if (!defectOpen(defect)) return sum;
    const weight = defect.severity === "critical" ? 10 : defect.severity === "major" ? 4 : 1;
    return sum + Math.max(0, defect.quantity) * weight;
  }, 0);
}

export function firstPassYield(inspections: InspectionEvidence[]) {
  const completed = inspections.filter((inspection) => inspectionCountsAreValid(inspection) && inspection.inspectedQuantity > 0 && ["passed", "conditional", "rework_required", "failed", "closed"].includes(inspection.status));
  const inspected = completed.reduce((sum, inspection) => sum + inspection.inspectedQuantity, 0);
  if (inspected <= 0) return null;
  const passed = completed.reduce((sum, inspection) => sum + inspection.passedQuantity, 0);
  return Math.max(0, Math.min(100, Math.round((passed / inspected) * 10000) / 100));
}

const allowedMime = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export function validatePrivateEvidenceFile(file: { name: string; type: string; size: number }) {
  const errors: string[] = [];
  if (!file.name.trim() || file.name.length > 180) errors.push("valid file name");
  if (!allowedMime.has(file.type)) errors.push("JPG, PNG, WebP, PDF, CSV or XLSX format");
  if (!Number.isFinite(file.size) || file.size <= 0) errors.push("non-empty file");
  if (file.size > 20 * 1024 * 1024) errors.push("file size up to 20 MB");
  return { valid: errors.length === 0, errors };
}

export function safeStorageName(name: string) {
  const cleaned = name.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return cleaned.slice(0, 160) || "evidence-file";
}
