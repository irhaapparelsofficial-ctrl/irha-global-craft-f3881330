import type {
  DefectSeverity,
  EvidenceType,
  QcInspectionStatus,
  QcInspectionType,
  ReworkStatus,
  SampleApprovalStatus,
} from "@/lib/productionQuality";

export interface SummaryRow {
  production_job_id: string;
  job_number: string;
  job_type: "sample" | "order";
  buyer_name: string;
  company_name: string | null;
  product_name: string;
  quantity_text: string;
  stage: string;
  qc_status: string;
  sample_status: string;
  buyer_approval_status: string;
  quality_risk: "clear" | "attention" | "blocked";
  quality_release_status: string;
  quality_released_at: string | null;
  inspection_count: number;
  passed_inspections: number;
  open_defects: number;
  open_major: number;
  open_critical: number;
  evidence_count: number;
  verified_evidence: number;
  latest_sample_status: SampleApprovalStatus | null;
  latest_sample_round: number | null;
  approved_specification_reference: string | null;
  updated_at: string;
}

export interface InspectionRow {
  id: string;
  production_job_id: string;
  inspection_number: string;
  inspection_type: QcInspectionType;
  status: QcInspectionStatus;
  inspected_quantity: number;
  passed_quantity: number;
  failed_quantity: number;
  inspected_at: string | null;
  owner_review_status: string;
  notes: string | null;
  created_at: string;
}

export interface DefectRow {
  id: string;
  production_job_id: string;
  inspection_id: string;
  defect_category: string;
  description: string;
  location: string | null;
  severity: DefectSeverity;
  quantity: number;
  root_cause: string | null;
  corrective_action: string | null;
  rework_status: ReworkStatus;
  due_at: string | null;
  verified_at: string | null;
  created_at: string;
}

export interface SampleApprovalRow {
  id: string;
  production_job_id: string;
  sample_round: number;
  status: SampleApprovalStatus;
  decision_source: "internal" | "buyer";
  decision_reference: string | null;
  approved_specification_reference: string | null;
  decision_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface EvidenceRow {
  id: string;
  production_job_id: string;
  inspection_id: string | null;
  defect_id: string | null;
  sample_approval_id: string | null;
  evidence_type: EvidenceType;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  checksum_sha256: string | null;
  verification_status: "pending" | "verified" | "rejected";
  evidence_note: string | null;
  created_at: string;
}
