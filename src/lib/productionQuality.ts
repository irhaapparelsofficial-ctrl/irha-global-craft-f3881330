export type QcInspectionType = "incoming" | "inline" | "final" | "sample" | "packing";
export type QcInspectionStatus = "draft" | "in_progress" | "passed" | "conditional" | "failed" | "cancelled";
export type QcCheckpointResult = "not_checked" | "pass" | "fail" | "na";
export type DefectSeverity = "critical" | "major" | "minor";
export type DefectStatus = "open" | "rework" | "in_review" | "accepted" | "closed";
export type SampleWorkflowStatus = "preparing" | "internal_review" | "ready_for_buyer" | "sent" | "feedback_received" | "closed" | "cancelled";
export type SampleDecision = "not_requested" | "pending" | "approved" | "changes_requested" | "rejected";

export type QcCheckpointEvidence = {
  required: boolean;
  result: QcCheckpointResult;
};

export type DefectEvidence = {
  severity: DefectSeverity;
  status: DefectStatus;
};

export type InspectionEvidence = {
  inspectionType: QcInspectionType;
  status: QcInspectionStatus;
};

export const MAX_PRODUCTION_EVIDENCE_BYTES = 50 * 1024 * 1024;
export const PRODUCTION_EVIDENCE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "video/mp4",
  "video/webm",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain",
]);

export function isOpenDefect(status: DefectStatus) {
  return !["accepted", "closed"].includes(status);
}

export function defectSummary(defects: DefectEvidence[]) {
  return defects.reduce((summary, defect) => {
    summary.total += 1;
    if (isOpenDefect(defect.status)) {
      summary.open += 1;
      summary[defect.severity] += 1;
    }
    return summary;
  }, { total: 0, open: 0, critical: 0, major: 0, minor: 0 });
}

export function inspectionReadiness(checkpoints: QcCheckpointEvidence[], defects: DefectEvidence[]) {
  const missing: string[] = [];
  const blockers: string[] = [];
  const required = checkpoints.filter((checkpoint) => checkpoint.required);
  const uncheckedRequired = required.filter((checkpoint) => checkpoint.result === "not_checked");
  const failedRequired = required.filter((checkpoint) => checkpoint.result === "fail");
  const open = defectSummary(defects);

  if (checkpoints.length === 0) missing.push("inspection checkpoints");
  if (uncheckedRequired.length > 0) missing.push(`${uncheckedRequired.length} required checkpoint(s) not checked`);
  if (failedRequired.length > 0) blockers.push(`${failedRequired.length} required checkpoint(s) failed`);
  if (open.critical > 0) blockers.push(`${open.critical} open critical defect(s)`);
  if (open.major > 0) blockers.push(`${open.major} open major defect(s)`);

  const ready = missing.length === 0 && blockers.length === 0;
  const suggestedStatus: QcInspectionStatus = !ready
    ? "failed"
    : open.minor > 0 || checkpoints.some((checkpoint) => !checkpoint.required && checkpoint.result === "fail")
      ? "conditional"
      : "passed";

  return { ready, missing, blockers, suggestedStatus, defectSummary: open };
}

export function qualityGateReadiness(input: {
  inspections: InspectionEvidence[];
  defects: DefectEvidence[];
  jobType: "sample" | "order";
  sampleDecision?: SampleDecision | null;
}) {
  const missing: string[] = [];
  const blockers: string[] = [];
  const finalInspections = input.inspections.filter((inspection) => inspection.inspectionType === "final" || (input.jobType === "sample" && inspection.inspectionType === "sample"));
  const passedFinal = finalInspections.some((inspection) => ["passed", "conditional"].includes(inspection.status));
  const open = defectSummary(input.defects);

  if (!passedFinal) missing.push(input.jobType === "sample" ? "passed sample/final inspection" : "passed final inspection");
  if (open.critical > 0) blockers.push(`${open.critical} open critical defect(s)`);
  if (open.major > 0) blockers.push(`${open.major} open major defect(s)`);
  if (input.sampleDecision === "rejected" || input.sampleDecision === "changes_requested") blockers.push("buyer sample decision requires changes");

  return {
    ready: missing.length === 0 && blockers.length === 0,
    missing,
    blockers,
    openDefects: open,
    buyerApprovalConfirmed: input.sampleDecision === "approved",
  };
}

export function sampleDecisionNeedsEvidence(decision: SampleDecision) {
  return ["approved", "changes_requested", "rejected"].includes(decision);
}

export function validateProductionEvidenceFile(file: Pick<File, "size" | "type" | "name">) {
  const errors: string[] = [];
  if (!file.name.trim()) errors.push("file name");
  if (!PRODUCTION_EVIDENCE_TYPES.has(file.type)) errors.push("supported image, PDF, MP4, WEBM, DOCX, XLSX, CSV or text file");
  if (file.size <= 0) errors.push("non-empty file");
  if (file.size > MAX_PRODUCTION_EVIDENCE_BYTES) errors.push("maximum 50 MB file size");
  return { valid: errors.length === 0, errors };
}

export function safeEvidenceFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 140) || "evidence";
}

export async function sha256Hex(file: Blob) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, "0")).join("");
}
