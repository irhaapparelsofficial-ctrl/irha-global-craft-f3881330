import { useState } from "react";
import { FileLock2, FlaskConical, ShieldCheck, TriangleAlert } from "lucide-react";
import type {
  DefectSeverity,
  EvidenceType,
  QcInspectionStatus,
  QcInspectionType,
  SampleApprovalStatus,
} from "@/lib/productionQuality";
import type { DefectRow, InspectionRow } from "./types";
import { Action, Field, FormCard, Select } from "./ui";

export type InspectionPayload = {
  type: QcInspectionType;
  status: QcInspectionStatus;
  inspected: number;
  passed: number;
  failed: number;
  notes: string | null;
};

export type DefectPayload = {
  inspectionId: string;
  severity: DefectSeverity;
  quantity: number;
  category: string;
  description: string;
  location: string | null;
  dueAt: string | null;
};

export type SamplePayload = {
  round: number;
  status: SampleApprovalStatus;
  source: "internal" | "buyer";
  decisionReference: string | null;
  specificationReference: string | null;
  notes: string | null;
};

export type UploadPayload = {
  evidenceType: EvidenceType;
  inspectionId: string | null;
  defectId: string | null;
  note: string | null;
  file: File;
};

const INSPECTION_TYPES: QcInspectionType[] = ["incoming", "inline", "final", "sample", "pre_shipment"];
const INSPECTION_STATUSES: QcInspectionStatus[] = ["draft", "in_progress", "passed", "conditional", "rework_required", "failed", "closed"];
const DEFECT_SEVERITIES: DefectSeverity[] = ["minor", "major", "critical"];
const SAMPLE_STATUSES: SampleApprovalStatus[] = ["draft", "internal_review", "buyer_review", "approved", "changes_requested", "rejected", "archived"];
const EVIDENCE_TYPES: EvidenceType[] = ["inspection_photo", "defect_photo", "measurement_sheet", "tech_pack", "sample_photo", "buyer_approval", "shipping_document", "other"];

export default function QualityForms({
  inspections,
  defects,
  busy,
  onInspection,
  onDefect,
  onSample,
  onUpload,
}: {
  inspections: InspectionRow[];
  defects: DefectRow[];
  busy: string | null;
  onInspection: (payload: InspectionPayload) => Promise<boolean>;
  onDefect: (payload: DefectPayload) => Promise<boolean>;
  onSample: (payload: SamplePayload) => Promise<boolean>;
  onUpload: (payload: UploadPayload) => Promise<boolean>;
}) {
  const [inspection, setInspection] = useState({ type: "inline" as QcInspectionType, status: "draft" as QcInspectionStatus, inspected: "0", passed: "0", failed: "0", notes: "" });
  const [defect, setDefect] = useState({ inspectionId: "", severity: "minor" as DefectSeverity, quantity: "1", category: "workmanship", description: "", location: "", dueAt: "" });
  const [sample, setSample] = useState({ round: "1", status: "draft" as SampleApprovalStatus, source: "internal" as "internal" | "buyer", decisionReference: "", specificationReference: "", notes: "" });
  const [upload, setUpload] = useState({ evidenceType: "inspection_photo" as EvidenceType, inspectionId: "", defectId: "", note: "" });
  const [file, setFile] = useState<File | null>(null);

  const saveInspection = async () => {
    const ok = await onInspection({
      type: inspection.type,
      status: inspection.status,
      inspected: Number(inspection.inspected || 0),
      passed: Number(inspection.passed || 0),
      failed: Number(inspection.failed || 0),
      notes: inspection.notes.trim() || null,
    });
    if (ok) setInspection({ type: "inline", status: "draft", inspected: "0", passed: "0", failed: "0", notes: "" });
  };

  const saveDefect = async () => {
    const ok = await onDefect({
      inspectionId: defect.inspectionId,
      severity: defect.severity,
      quantity: Number(defect.quantity || 1),
      category: defect.category.trim() || "workmanship",
      description: defect.description.trim(),
      location: defect.location.trim() || null,
      dueAt: defect.dueAt ? new Date(defect.dueAt).toISOString() : null,
    });
    if (ok) setDefect({ inspectionId: "", severity: "minor", quantity: "1", category: "workmanship", description: "", location: "", dueAt: "" });
  };

  const saveSample = async () => {
    const ok = await onSample({
      round: Number(sample.round || 1),
      status: sample.status,
      source: sample.source,
      decisionReference: sample.decisionReference.trim() || null,
      specificationReference: sample.specificationReference.trim() || null,
      notes: sample.notes.trim() || null,
    });
    if (ok) setSample((current) => ({ round: String(Number(current.round || 1) + 1), status: "draft", source: "internal", decisionReference: "", specificationReference: "", notes: "" }));
  };

  const saveUpload = async () => {
    if (!file) return;
    const ok = await onUpload({
      evidenceType: upload.evidenceType,
      inspectionId: upload.inspectionId || null,
      defectId: upload.defectId || null,
      note: upload.note.trim() || null,
      file,
    });
    if (ok) {
      setUpload({ evidenceType: "inspection_photo", inspectionId: "", defectId: "", note: "" });
      setFile(null);
    }
  };

  return (
    <div className="grid xl:grid-cols-2 gap-5">
      <FormCard title="Record QC inspection" icon={<FlaskConical size={16} />}>
        <div className="grid sm:grid-cols-2 gap-3">
          <Select label="Inspection type" value={inspection.type} onChange={(value) => setInspection((current) => ({ ...current, type: value as QcInspectionType }))} options={INSPECTION_TYPES} />
          <Select label="Status" value={inspection.status} onChange={(value) => setInspection((current) => ({ ...current, status: value as QcInspectionStatus }))} options={INSPECTION_STATUSES} />
          <Field label="Inspected quantity" type="number" value={inspection.inspected} onChange={(value) => setInspection((current) => ({ ...current, inspected: value }))} />
          <Field label="Passed quantity" type="number" value={inspection.passed} onChange={(value) => setInspection((current) => ({ ...current, passed: value }))} />
          <Field label="Failed quantity" type="number" value={inspection.failed} onChange={(value) => setInspection((current) => ({ ...current, failed: value }))} />
          <Field label="Internal notes" value={inspection.notes} onChange={(value) => setInspection((current) => ({ ...current, notes: value }))} />
        </div>
        <Action onClick={saveInspection} busy={busy === "inspection"} label="Record inspection" />
      </FormCard>

      <FormCard title="Record defect / rework" icon={<TriangleAlert size={16} />}>
        <div className="grid sm:grid-cols-2 gap-3">
          <Select label="Inspection" value={defect.inspectionId} onChange={(value) => setDefect((current) => ({ ...current, inspectionId: value }))} options={inspections.map((row) => row.id)} optionLabel={(value) => inspections.find((row) => row.id === value)?.inspection_number || value} placeholder="Select inspection" />
          <Select label="Severity" value={defect.severity} onChange={(value) => setDefect((current) => ({ ...current, severity: value as DefectSeverity }))} options={DEFECT_SEVERITIES} />
          <Field label="Quantity" type="number" value={defect.quantity} onChange={(value) => setDefect((current) => ({ ...current, quantity: value }))} />
          <Field label="Category" value={defect.category} onChange={(value) => setDefect((current) => ({ ...current, category: value }))} />
          <Field label="Description *" value={defect.description} onChange={(value) => setDefect((current) => ({ ...current, description: value }))} />
          <Field label="Location" value={defect.location} onChange={(value) => setDefect((current) => ({ ...current, location: value }))} />
          <Field label="Internal due date" type="datetime-local" value={defect.dueAt} onChange={(value) => setDefect((current) => ({ ...current, dueAt: value }))} />
        </div>
        <Action onClick={saveDefect} busy={busy === "defect"} label="Record defect" />
      </FormCard>

      <FormCard title="Sample approval evidence" icon={<ShieldCheck size={16} />}>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Sample round" type="number" value={sample.round} onChange={(value) => setSample((current) => ({ ...current, round: value }))} />
          <Select label="Decision status" value={sample.status} onChange={(value) => setSample((current) => ({ ...current, status: value as SampleApprovalStatus }))} options={SAMPLE_STATUSES} />
          <Select label="Decision source" value={sample.source} onChange={(value) => setSample((current) => ({ ...current, source: value as "internal" | "buyer" }))} options={["internal", "buyer"]} />
          <Field label="Decision reference" value={sample.decisionReference} onChange={(value) => setSample((current) => ({ ...current, decisionReference: value }))} placeholder="Email/thread/document reference" />
          <Field label="Approved specification reference" value={sample.specificationReference} onChange={(value) => setSample((current) => ({ ...current, specificationReference: value }))} />
          <Field label="Notes" value={sample.notes} onChange={(value) => setSample((current) => ({ ...current, notes: value }))} />
        </div>
        <Action onClick={saveSample} busy={busy === "sample"} label="Record sample decision" />
      </FormCard>

      <FormCard title="Upload private evidence" icon={<FileLock2 size={16} />}>
        <div className="grid sm:grid-cols-2 gap-3">
          <Select label="Evidence type" value={upload.evidenceType} onChange={(value) => setUpload((current) => ({ ...current, evidenceType: value as EvidenceType }))} options={EVIDENCE_TYPES} />
          <Select label="Link inspection" value={upload.inspectionId} onChange={(value) => setUpload((current) => ({ ...current, inspectionId: value, defectId: "" }))} options={inspections.map((row) => row.id)} optionLabel={(value) => inspections.find((row) => row.id === value)?.inspection_number || value} placeholder="Optional" />
          <Select label="Link defect" value={upload.defectId} onChange={(value) => setUpload((current) => ({ ...current, defectId: value, inspectionId: "" }))} options={defects.map((row) => row.id)} optionLabel={(value) => defects.find((row) => row.id === value)?.description || value} placeholder="Optional" />
          <Field label="Evidence note" value={upload.note} onChange={(value) => setUpload((current) => ({ ...current, note: value }))} />
        </div>
        <label className="block mt-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Private file<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => setFile(event.target.files?.[0] || null)} className="mt-2 block w-full text-xs" /></label>
        {file && <p className="text-xs text-foreground/55 mt-2">{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</p>}
        <Action onClick={saveUpload} busy={busy === "upload"} label="Upload privately" />
      </FormCard>
    </div>
  );
}
