import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bug,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileCheck2,
  FileText,
  FlaskConical,
  Loader2,
  Paperclip,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Trash2,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  defectSummary,
  inspectionReadiness,
  qualityGateReadiness,
  safeEvidenceFileName,
  sha256Hex,
  validateProductionEvidenceFile,
  type DefectSeverity,
  type DefectStatus,
  type QcCheckpointResult,
  type QcInspectionStatus,
  type QcInspectionType,
  type SampleDecision,
  type SampleWorkflowStatus,
} from "@/lib/productionQuality";

const db = supabase as any;
const BUCKET = "production-private-evidence";
const MIGRATION = "supabase/migrations/20260713223000_production_quality_sample_evidence.sql";
const FIELD = "min-h-11 w-full border border-border/60 bg-background px-3 text-sm outline-none focus:border-gold";

const INSPECTION_TYPES: QcInspectionType[] = ["incoming", "inline", "final", "sample", "packing"];
const CHECKPOINT_CATEGORIES = ["material", "measurement", "workmanship", "color", "printing", "embroidery", "labeling", "packing", "function", "other"];
const DEFECT_SEVERITIES: DefectSeverity[] = ["critical", "major", "minor"];
const DEFECT_STATUSES: DefectStatus[] = ["open", "rework", "in_review", "accepted", "closed"];
const SAMPLE_TYPES = ["development", "fit", "size_set", "pre_production", "sales", "shipment", "other"];
const SAMPLE_WORKFLOW: SampleWorkflowStatus[] = ["preparing", "internal_review", "ready_for_buyer", "sent", "feedback_received", "closed", "cancelled"];
const INTERNAL_DECISIONS = ["pending", "approved", "changes_requested", "rejected"];
const EVIDENCE_CATEGORIES = ["qc_photo", "measurement_report", "sample_photo", "buyer_feedback", "rework_proof", "packing_photo", "qc_certificate", "tech_reference", "other"];
const ENTITY_TYPES = ["job", "inspection", "checkpoint", "defect", "rework", "sample"];

interface SummaryRow {
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
  inspection_count: number;
  failed_inspections: number;
  open_defects: number;
  open_critical: number;
  open_major: number;
  open_minor: number;
  pending_rework: number;
  sample_rounds: number;
  latest_buyer_decision: SampleDecision | null;
  evidence_file_count: number;
  updated_at: string;
}

interface InspectionRow {
  id: string;
  production_job_id: string;
  inspection_number: string;
  inspection_type: QcInspectionType;
  status: QcInspectionStatus;
  reference_standard: string;
  lot_size_text: string | null;
  sample_size: number | null;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  inspector_name: string | null;
  result_summary: string | null;
  created_at: string;
}

interface CheckpointRow {
  id: string;
  inspection_id: string;
  sequence_no: number;
  category: string;
  requirement: string;
  tolerance_text: string | null;
  required: boolean;
  result: QcCheckpointResult;
  measurement_value: string | null;
  notes: string | null;
}

interface DefectRow {
  id: string;
  production_job_id: string;
  inspection_id: string | null;
  checkpoint_id: string | null;
  defect_code: string | null;
  category: string;
  description: string;
  severity: DefectSeverity;
  quantity_affected: number;
  status: DefectStatus;
  root_cause: string | null;
  corrective_action: string | null;
  owner_acceptance_note: string | null;
  due_at: string | null;
  created_at: string;
}

interface ReworkRow {
  id: string;
  defect_id: string;
  action_text: string;
  status: "planned" | "in_progress" | "verification" | "verified" | "rejected" | "cancelled";
  due_at: string | null;
  verification_note: string | null;
}

interface SampleRow {
  id: string;
  production_job_id: string;
  round_no: number;
  sample_type: string;
  sample_reference: string;
  workflow_status: SampleWorkflowStatus;
  internal_decision: "pending" | "approved" | "changes_requested" | "rejected";
  buyer_decision: SampleDecision;
  due_at: string | null;
  sent_at: string | null;
  buyer_feedback_at: string | null;
  buyer_evidence_note: string | null;
  buyer_evidence_file_id: string | null;
  notes: string | null;
}

interface EvidenceRow {
  id: string;
  production_job_id: string;
  entity_type: string;
  entity_id: string | null;
  category: string;
  bucket: string;
  object_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  checksum_sha256: string | null;
  description: string | null;
  created_at: string;
}

const EMPTY_INSPECTION = { type: "final" as QcInspectionType, standard: "Approved specification / tech pack", lot: "", sampleSize: "", scheduledAt: "", inspector: "" };
const EMPTY_CHECKPOINT = { sequence: "10", category: "workmanship", requirement: "", tolerance: "", required: true };
const EMPTY_DEFECT = { inspectionId: "", category: "workmanship", description: "", severity: "major" as DefectSeverity, quantity: "1", dueAt: "" };
const EMPTY_REWORK = { defectId: "", action: "", dueAt: "" };
const EMPTY_SAMPLE = { type: "pre_production", reference: "", dueAt: "", notes: "" };
const EMPTY_DECISION = { sampleId: "", decision: "approved" as Exclude<SampleDecision, "not_requested" | "pending">, evidenceNote: "", evidenceFileId: "" };
const EMPTY_FILE = { entityType: "job", entityId: "", category: "qc_photo", description: "" };

export default function ProductionQualityPanel() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [jobs, setJobs] = useState<SummaryRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [inspections, setInspections] = useState<InspectionRow[]>([]);
  const [checkpoints, setCheckpoints] = useState<CheckpointRow[]>([]);
  const [defects, setDefects] = useState<DefectRow[]>([]);
  const [reworks, setReworks] = useState<ReworkRow[]>([]);
  const [samples, setSamples] = useState<SampleRow[]>([]);
  const [files, setFiles] = useState<EvidenceRow[]>([]);
  const [selectedInspectionId, setSelectedInspectionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [gate, setGate] = useState<{ ready: boolean; missing: string[]; blockers: string[]; buyer_approval_confirmed?: boolean } | null>(null);
  const [inspectionDraft, setInspectionDraft] = useState(EMPTY_INSPECTION);
  const [checkpointDraft, setCheckpointDraft] = useState(EMPTY_CHECKPOINT);
  const [defectDraft, setDefectDraft] = useState(EMPTY_DEFECT);
  const [reworkDraft, setReworkDraft] = useState(EMPTY_REWORK);
  const [sampleDraft, setSampleDraft] = useState(EMPTY_SAMPLE);
  const [decisionDraft, setDecisionDraft] = useState(EMPTY_DECISION);
  const [fileDraft, setFileDraft] = useState(EMPTY_FILE);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await db.from("production_quality_summary").select("*").order("updated_at", { ascending: false }).limit(500);
    if (error) {
      setBackendError(error.message || "Production quality backend unavailable");
      setJobs([]);
      setLoading(false);
      return;
    }
    const next = (data || []) as SummaryRow[];
    setJobs(next);
    setBackendError(null);
    setSelectedId((current) => current && next.some((row) => row.production_job_id === current) ? current : next[0]?.production_job_id || "");
    setLoading(false);
  }, []);

  const loadDetails = useCallback(async (jobId: string) => {
    if (!jobId) return;
    setDetailsLoading(true);
    const [inspectionResult, defectResult, sampleResult, fileResult] = await Promise.all([
      db.from("production_qc_inspections").select("*").eq("production_job_id", jobId).order("created_at", { ascending: false }),
      db.from("production_defects").select("*").eq("production_job_id", jobId).order("created_at", { ascending: false }),
      db.from("production_sample_approvals").select("*").eq("production_job_id", jobId).order("round_no", { ascending: false }),
      db.from("production_evidence_files").select("*").eq("production_job_id", jobId).order("created_at", { ascending: false }),
    ]);
    const error = inspectionResult.error || defectResult.error || sampleResult.error || fileResult.error;
    if (error) {
      toast({ title: "Quality details could not load", description: error.message, variant: "destructive" });
      setDetailsLoading(false);
      return;
    }
    const nextInspections = (inspectionResult.data || []) as InspectionRow[];
    const nextDefects = (defectResult.data || []) as DefectRow[];
    setInspections(nextInspections);
    setDefects(nextDefects);
    setSamples((sampleResult.data || []) as SampleRow[]);
    setFiles((fileResult.data || []) as EvidenceRow[]);
    setSelectedInspectionId((current) => current && nextInspections.some((row) => row.id === current) ? current : nextInspections[0]?.id || "");
    setDefectDraft((current) => ({ ...current, inspectionId: current.inspectionId || nextInspections[0]?.id || "" }));

    const inspectionIds = nextInspections.map((row) => row.id);
    const defectIds = nextDefects.map((row) => row.id);
    const [checkpointResult, reworkResult] = await Promise.all([
      inspectionIds.length ? db.from("production_qc_checkpoints").select("*").in("inspection_id", inspectionIds).order("sequence_no") : Promise.resolve({ data: [], error: null }),
      defectIds.length ? db.from("production_rework_actions").select("*").in("defect_id", defectIds).order("created_at", { ascending: false }) : Promise.resolve({ data: [], error: null }),
    ]);
    if (checkpointResult.error || reworkResult.error) {
      toast({ title: "Checkpoint/rework details could not load", description: checkpointResult.error?.message || reworkResult.error?.message, variant: "destructive" });
    } else {
      setCheckpoints((checkpointResult.data || []) as CheckpointRow[]);
      setReworks((reworkResult.data || []) as ReworkRow[]);
    }
    setGate(null);
    setDetailsLoading(false);
  }, []);

  useEffect(() => { void loadJobs(); }, [loadJobs]);
  useEffect(() => { void loadDetails(selectedId); }, [loadDetails, selectedId]);

  const selected = useMemo(() => jobs.find((row) => row.production_job_id === selectedId) || null, [jobs, selectedId]);
  const selectedInspection = useMemo(() => inspections.find((row) => row.id === selectedInspectionId) || null, [inspections, selectedInspectionId]);
  const inspectionCheckpoints = useMemo(() => checkpoints.filter((row) => row.inspection_id === selectedInspectionId), [checkpoints, selectedInspectionId]);
  const inspectionDefects = useMemo(() => defects.filter((row) => row.inspection_id === selectedInspectionId), [defects, selectedInspectionId]);
  const openDefects = useMemo(() => defectSummary(defects.map((row) => ({ severity: row.severity, status: row.status }))), [defects]);
  const localInspectionReadiness = useMemo(() => inspectionReadiness(
    inspectionCheckpoints.map((row) => ({ required: row.required, result: row.result })),
    inspectionDefects.map((row) => ({ severity: row.severity, status: row.status })),
  ), [inspectionCheckpoints, inspectionDefects]);
  const localGate = useMemo(() => selected ? qualityGateReadiness({
    jobType: selected.job_type,
    inspections: inspections.map((row) => ({ inspectionType: row.inspection_type, status: row.status })),
    defects: defects.map((row) => ({ severity: row.severity, status: row.status })),
    sampleDecision: samples[0]?.buyer_decision || null,
  }) : null, [defects, inspections, samples, selected]);

  const refreshAll = async () => {
    await loadJobs();
    await loadDetails(selectedId);
  };

  const logEvent = async (eventType: string, note: string, evidence: Record<string, unknown>) => {
    if (!selectedId) return;
    await db.from("production_job_events").insert({ production_job_id: selectedId, event_type: eventType, note, evidence: { ...evidence, buyer_notification_sent: false } });
  };

  const createInspection = async () => {
    if (!selected || inspectionDraft.standard.trim().length < 2) {
      toast({ title: "Inspection standard/reference is required", variant: "destructive" });
      return;
    }
    setBusy("inspection:create");
    const inspectionNumber = `QC-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Date.now().toString().slice(-6)}`;
    const { data, error } = await db.from("production_qc_inspections").insert({
      production_job_id: selected.production_job_id,
      inspection_number: inspectionNumber,
      inspection_type: inspectionDraft.type,
      status: "in_progress",
      reference_standard: inspectionDraft.standard.trim(),
      lot_size_text: inspectionDraft.lot.trim() || null,
      sample_size: inspectionDraft.sampleSize ? Number(inspectionDraft.sampleSize) : null,
      scheduled_at: inspectionDraft.scheduledAt || null,
      started_at: new Date().toISOString(),
      inspector_name: inspectionDraft.inspector.trim() || null,
    }).select("*").single();
    setBusy(null);
    if (error) {
      toast({ title: "Inspection creation failed", description: error.message, variant: "destructive" });
      return;
    }
    await logEvent("inspection_created", "Internal QC inspection created. No buyer notification sent.", { inspection_id: data.id, inspection_number: inspectionNumber });
    setInspectionDraft(EMPTY_INSPECTION);
    setSelectedInspectionId(data.id);
    toast({ title: `${inspectionNumber} created` });
    await refreshAll();
  };

  const addCheckpoint = async () => {
    if (!selectedInspection || checkpointDraft.requirement.trim().length < 2) {
      toast({ title: "Select an inspection and enter a checkpoint requirement", variant: "destructive" });
      return;
    }
    setBusy("checkpoint:add");
    const { error } = await db.from("production_qc_checkpoints").insert({
      inspection_id: selectedInspection.id,
      sequence_no: Number(checkpointDraft.sequence || 10),
      category: checkpointDraft.category,
      requirement: checkpointDraft.requirement.trim(),
      tolerance_text: checkpointDraft.tolerance.trim() || null,
      required: checkpointDraft.required,
      result: "not_checked",
    });
    setBusy(null);
    if (error) {
      toast({ title: "Checkpoint creation failed", description: error.message, variant: "destructive" });
      return;
    }
    setCheckpointDraft((current) => ({ ...EMPTY_CHECKPOINT, sequence: String(Number(current.sequence || 10) + 10) }));
    await loadDetails(selectedId);
  };

  const updateCheckpoint = async (checkpoint: CheckpointRow, result: QcCheckpointResult) => {
    setBusy(`checkpoint:${checkpoint.id}`);
    const measurement = result === "pass" || result === "fail" ? window.prompt("Measurement/value (optional)", checkpoint.measurement_value || "") : checkpoint.measurement_value;
    const { error } = await db.from("production_qc_checkpoints").update({
      result,
      measurement_value: measurement?.trim() || null,
      inspected_at: result === "not_checked" ? null : new Date().toISOString(),
    }).eq("id", checkpoint.id);
    setBusy(null);
    if (error) {
      toast({ title: "Checkpoint update failed", description: error.message, variant: "destructive" });
      return;
    }
    await loadDetails(selectedId);
  };

  const finalizeInspection = async () => {
    if (!selectedInspection) return;
    setBusy("inspection:finalize");
    const { data: readiness, error: readinessError } = await db.rpc("production_inspection_readiness", { _inspection_id: selectedInspection.id });
    if (readinessError) {
      setBusy(null);
      toast({ title: "Inspection readiness failed", description: readinessError.message, variant: "destructive" });
      return;
    }
    if (!readiness?.complete) {
      setBusy(null);
      toast({ title: "Inspection is incomplete", description: (readiness?.missing || []).join(" · "), variant: "destructive" });
      return;
    }
    const note = window.prompt(`Final result will be ${String(readiness.suggested_status).toUpperCase()}. Add owner review note (optional):`, selectedInspection.result_summary || "");
    if (note === null) {
      setBusy(null);
      return;
    }
    const { error } = await db.rpc("production_finalize_inspection", { _inspection_id: selectedInspection.id, _owner_note: note.trim() || null });
    setBusy(null);
    if (error) {
      toast({ title: "Inspection finalization failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Inspection finalized as ${readiness.suggested_status}`, description: "No buyer notification was sent." });
    await refreshAll();
  };

  const addDefect = async () => {
    if (!selected || defectDraft.description.trim().length < 2 || Number(defectDraft.quantity) <= 0) {
      toast({ title: "Defect description and affected quantity are required", variant: "destructive" });
      return;
    }
    setBusy("defect:add");
    const code = `DF-${Date.now().toString().slice(-7)}`;
    const { data, error } = await db.from("production_defects").insert({
      production_job_id: selected.production_job_id,
      inspection_id: defectDraft.inspectionId || null,
      defect_code: code,
      category: defectDraft.category,
      description: defectDraft.description.trim(),
      severity: defectDraft.severity,
      quantity_affected: Number(defectDraft.quantity),
      status: "open",
      due_at: defectDraft.dueAt || null,
    }).select("*").single();
    setBusy(null);
    if (error) {
      toast({ title: "Defect creation failed", description: error.message, variant: "destructive" });
      return;
    }
    await logEvent("defect_recorded", "Internal QC defect recorded. No buyer notification sent.", { defect_id: data.id, defect_code: code, severity: defectDraft.severity });
    setDefectDraft({ ...EMPTY_DEFECT, inspectionId: selectedInspectionId });
    toast({ title: `${code} recorded` });
    await refreshAll();
  };

  const updateDefect = async (defect: DefectRow, status: DefectStatus) => {
    let note: string | null = null;
    if (["accepted", "closed"].includes(status)) {
      note = window.prompt(status === "accepted" ? "Owner acceptance reason/evidence (required):" : "Corrective action / closure evidence (required):", defect.owner_acceptance_note || defect.corrective_action || "");
      if (!note?.trim()) return;
    }
    setBusy(`defect:${defect.id}`);
    const update: Record<string, unknown> = { status };
    if (status === "accepted") update.owner_acceptance_note = note!.trim();
    if (status === "closed") {
      update.corrective_action = note!.trim();
      update.closed_at = new Date().toISOString();
    }
    const { error } = await db.from("production_defects").update(update).eq("id", defect.id);
    setBusy(null);
    if (error) {
      toast({ title: "Defect update failed", description: error.message, variant: "destructive" });
      return;
    }
    await logEvent("defect_updated", "Internal defect status updated. No buyer notification sent.", { defect_id: defect.id, from: defect.status, to: status });
    await refreshAll();
  };

  const addRework = async () => {
    if (!reworkDraft.defectId || reworkDraft.action.trim().length < 2) {
      toast({ title: "Select a defect and enter the rework action", variant: "destructive" });
      return;
    }
    setBusy("rework:add");
    const { error } = await db.from("production_rework_actions").insert({ defect_id: reworkDraft.defectId, action_text: reworkDraft.action.trim(), due_at: reworkDraft.dueAt || null, status: "planned" });
    if (!error) await db.from("production_defects").update({ status: "rework", corrective_action: reworkDraft.action.trim() }).eq("id", reworkDraft.defectId);
    setBusy(null);
    if (error) {
      toast({ title: "Rework creation failed", description: error.message, variant: "destructive" });
      return;
    }
    await logEvent("rework_updated", "Internal rework action created. No buyer notification sent.", { defect_id: reworkDraft.defectId });
    setReworkDraft(EMPTY_REWORK);
    await refreshAll();
  };

  const updateRework = async (row: ReworkRow, status: ReworkRow["status"]) => {
    let verificationNote: string | null = null;
    if (status === "verified") {
      verificationNote = window.prompt("Verification evidence/note (required):", row.verification_note || "");
      if (!verificationNote?.trim()) return;
    }
    setBusy(`rework:${row.id}`);
    const { error } = await db.from("production_rework_actions").update({
      status,
      verification_note: verificationNote?.trim() || row.verification_note,
      verified_at: status === "verified" ? new Date().toISOString() : null,
    }).eq("id", row.id);
    if (!error && status === "verified") await db.from("production_defects").update({ status: "in_review" }).eq("id", row.defect_id);
    setBusy(null);
    if (error) {
      toast({ title: "Rework update failed", description: error.message, variant: "destructive" });
      return;
    }
    await refreshAll();
  };

  const createSample = async () => {
    if (!selected || sampleDraft.reference.trim().length < 2) {
      toast({ title: "Sample reference is required", variant: "destructive" });
      return;
    }
    const roundNo = Math.max(0, ...samples.map((row) => row.round_no)) + 1;
    setBusy("sample:create");
    const { error } = await db.from("production_sample_approvals").insert({
      production_job_id: selected.production_job_id,
      round_no: roundNo,
      sample_type: sampleDraft.type,
      sample_reference: sampleDraft.reference.trim(),
      workflow_status: "preparing",
      internal_decision: "pending",
      buyer_decision: "not_requested",
      due_at: sampleDraft.dueAt || null,
      notes: sampleDraft.notes.trim() || null,
    });
    setBusy(null);
    if (error) {
      toast({ title: "Sample round creation failed", description: error.message, variant: "destructive" });
      return;
    }
    await logEvent("sample_approval_updated", "Internal sample approval round created. No buyer message sent.", { round_no: roundNo });
    setSampleDraft(EMPTY_SAMPLE);
    await refreshAll();
  };

  const updateSample = async (sample: SampleRow, field: "workflow_status" | "internal_decision", value: string) => {
    if (field === "workflow_status" && value === "sent" && !window.confirm("Mark as sent only when external sending evidence exists. This action does not send a message. Continue?")) return;
    setBusy(`sample:${sample.id}`);
    const update: Record<string, unknown> = { [field]: value };
    if (field === "workflow_status" && value === "sent") {
      update.sent_at = sample.sent_at || new Date().toISOString();
      if (sample.buyer_decision === "not_requested") update.buyer_decision = "pending";
    }
    const { error } = await db.from("production_sample_approvals").update(update).eq("id", sample.id);
    setBusy(null);
    if (error) {
      toast({ title: "Sample update failed", description: error.message, variant: "destructive" });
      return;
    }
    await refreshAll();
  };

  const recordBuyerDecision = async () => {
    if (!decisionDraft.sampleId || decisionDraft.evidenceNote.trim().length < 5 && !decisionDraft.evidenceFileId) {
      toast({ title: "Buyer decision evidence is required", description: "Add an evidence note or attach a private buyer-feedback file.", variant: "destructive" });
      return;
    }
    if (!window.confirm(`Record buyer decision as ${decisionDraft.decision.replace(/_/g, " ")}? This records evidence only and does not send a message.`)) return;
    setBusy("sample:decision");
    const { error } = await db.rpc("production_record_sample_buyer_decision", {
      _sample_id: decisionDraft.sampleId,
      _decision: decisionDraft.decision,
      _evidence_note: decisionDraft.evidenceNote.trim(),
      _evidence_file_id: decisionDraft.evidenceFileId || null,
    });
    setBusy(null);
    if (error) {
      toast({ title: "Buyer decision was not recorded", description: error.message, variant: "destructive" });
      return;
    }
    setDecisionDraft(EMPTY_DECISION);
    toast({ title: "Evidence-backed buyer decision recorded", description: "No buyer message was sent." });
    await refreshAll();
  };

  const uploadEvidence = async (file: File) => {
    if (!selected) return;
    const validation = validateProductionEvidenceFile(file);
    if (!validation.valid) {
      toast({ title: "Evidence file rejected", description: validation.errors.join(" · "), variant: "destructive" });
      return;
    }
    const entityId = fileDraft.entityId || selected.production_job_id;
    setBusy("file:upload");
    let checksum = "";
    try {
      checksum = await sha256Hex(file);
    } catch {
      setBusy(null);
      toast({ title: "File checksum failed", description: "The file was not uploaded.", variant: "destructive" });
      return;
    }
    const objectPath = `${selected.production_job_id}/${fileDraft.entityType}/${entityId}/${crypto.randomUUID()}-${safeEvidenceFileName(file.name)}`;
    const { error: storageError } = await supabase.storage.from(BUCKET).upload(objectPath, file, { upsert: false, contentType: file.type, cacheControl: "3600" });
    if (storageError) {
      setBusy(null);
      toast({ title: "Private evidence storage is not active yet", description: storageError.message, variant: "destructive" });
      return;
    }
    const { error } = await db.from("production_evidence_files").insert({
      production_job_id: selected.production_job_id,
      entity_type: fileDraft.entityType,
      entity_id: entityId,
      category: fileDraft.category,
      bucket: BUCKET,
      object_path: objectPath,
      file_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      checksum_sha256: checksum,
      description: fileDraft.description.trim() || null,
    });
    if (error) {
      await supabase.storage.from(BUCKET).remove([objectPath]);
      setBusy(null);
      toast({ title: "Evidence metadata save failed", description: error.message, variant: "destructive" });
      return;
    }
    await logEvent("evidence_uploaded", "Private production evidence uploaded. No public URL created.", { category: fileDraft.category, checksum_sha256: checksum });
    setFileDraft(EMPTY_FILE);
    setBusy(null);
    toast({ title: "Private production evidence uploaded" });
    await refreshAll();
  };

  const openEvidence = async (file: EvidenceRow) => {
    const { data, error } = await supabase.storage.from(file.bucket).createSignedUrl(file.object_path, 300);
    if (error || !data?.signedUrl) {
      toast({ title: "Evidence access failed", description: error?.message || "Signed URL unavailable", variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const removeEvidence = async (file: EvidenceRow) => {
    if (!window.confirm(`Permanently delete private evidence ${file.file_name}?`)) return;
    setBusy(`file:${file.id}`);
    const { error: storageError } = await supabase.storage.from(file.bucket).remove([file.object_path]);
    if (storageError) {
      setBusy(null);
      toast({ title: "Evidence file delete failed", description: storageError.message, variant: "destructive" });
      return;
    }
    const { error } = await db.from("production_evidence_files").delete().eq("id", file.id);
    setBusy(null);
    if (error) {
      toast({ title: "Evidence metadata cleanup failed", description: error.message, variant: "destructive" });
      return;
    }
    await logEvent("evidence_removed", "Private production evidence removed.", { file_id: file.id, file_name: file.file_name });
    await refreshAll();
  };

  const checkQualityGate = async () => {
    if (!selected) return;
    setBusy("gate");
    const { data, error } = await db.rpc("production_quality_gate_readiness", { _job_id: selected.production_job_id });
    setBusy(null);
    if (error) {
      toast({ title: "Quality gate check failed", description: error.message, variant: "destructive" });
      return;
    }
    setGate(data);
    toast({ title: data.ready ? "Quality gate ready" : "Quality gate blocked", description: [...(data.missing || []), ...(data.blockers || [])].join(" · ") || "No deterministic blocker found." });
  };

  if (loading && jobs.length === 0) return <div className="py-12 text-center text-sm text-muted-foreground">Loading quality control…</div>;

  if (backendError) {
    return <section className="border border-amber-500/35 bg-amber-500/[0.05] p-6 md:p-8"><div className="flex items-start gap-4"><AlertTriangle size={22} className="text-amber-300 shrink-0 mt-1" /><div><p className="eyebrow mb-2">Phase 6.2 · Quality & Evidence</p><h2 className="font-display text-2xl md:text-3xl">Backend activation pending</h2><p className="text-sm text-foreground/65 mt-3 max-w-3xl leading-relaxed">The QC, defect, sample approval and private evidence interface is code-ready. Its tables, RPCs and private bucket remain deferred for the single final backend activation.</p><code className="mt-4 block text-xs text-amber-200 break-all">{MIGRATION}</code><p className="mt-3 text-xs text-foreground/45 break-all">Runtime evidence: {backendError}</p></div></div></section>;
  }

  return (
    <section className="border border-gold/40 bg-card/20">
      <div className="p-5 md:p-6 border-b border-border/60 flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
        <div className="flex items-start gap-3"><ShieldCheck size={22} className="text-gold shrink-0 mt-1" /><div><p className="eyebrow mb-2">Phase 6.2 · Quality & Evidence</p><h2 className="font-display text-2xl md:text-4xl">QC, defects, samples & private proof</h2><p className="text-sm text-foreground/65 mt-3 max-w-4xl leading-relaxed">Run evidence-backed inspections, control defects and rework, record sample decisions, and keep factory proof private. This panel never sends buyer messages or creates public file links.</p></div></div>
        <button type="button" onClick={() => void refreshAll()} disabled={busy !== null || loading} className="min-h-11 inline-flex items-center justify-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.15em] hover:border-gold disabled:opacity-50"><RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh</button>
      </div>

      <div className="grid xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="border-r border-border/60 max-h-[82vh] overflow-y-auto">
          <div className="p-3 border-b border-border/60 text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{jobs.length} production job(s)</div>
          {jobs.map((job) => <button key={job.production_job_id} type="button" onClick={() => setSelectedId(job.production_job_id)} className={`w-full text-left p-4 border-b border-border/40 hover:bg-muted/20 ${selectedId === job.production_job_id ? "bg-gold/5 border-l-2 border-l-gold" : "border-l-2 border-l-transparent"}`}><p className="text-[9px] uppercase tracking-[0.13em] text-gold">{job.job_number} · {job.job_type}</p><p className="font-display text-lg mt-1 truncate">{job.product_name}</p><p className="text-xs text-muted-foreground mt-1 truncate">{job.company_name || job.buyer_name}</p><div className="flex gap-2 mt-2 text-[9px] uppercase"><span className={job.open_critical || job.open_major ? "text-red-300" : "text-emerald-300"}>{job.open_defects} open defect(s)</span><span className="text-muted-foreground">{job.inspection_count} QC</span></div></button>)}
        </aside>

        {!selected ? <div className="p-12 text-center text-muted-foreground">Select a production job.</div> : <div className="min-w-0">
          <div className="p-4 md:p-5 border-b border-border/60">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4"><div><p className="text-[9px] uppercase tracking-[0.14em] text-gold">{selected.job_number} · {selected.stage.replace(/_/g, " ")}</p><h3 className="font-display text-2xl mt-1">{selected.product_name}</h3><p className="text-xs text-muted-foreground mt-1">{selected.company_name || selected.buyer_name} · {selected.quantity_text}</p></div><button type="button" onClick={() => void checkQualityGate()} disabled={busy !== null} className="min-h-11 inline-flex items-center justify-center gap-2 border border-gold/60 text-gold px-4 text-[10px] uppercase tracking-[0.14em] disabled:opacity-50">{busy === "gate" ? <Loader2 size={13} className="animate-spin" /> : <FileCheck2 size={13} />} Check quality gate</button></div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mt-4"><Metric label="Inspections" value={inspections.length} /><Metric label="Open defects" value={openDefects.open} attention={openDefects.open > 0} /><Metric label="Critical" value={openDefects.critical} attention={openDefects.critical > 0} /><Metric label="Major" value={openDefects.major} attention={openDefects.major > 0} /><Metric label="Sample rounds" value={samples.length} /><Metric label="Private files" value={files.length} /></div>
            {(gate || localGate) && <div className={`mt-4 border p-4 ${(gate || localGate)?.ready ? "border-emerald-500/35 bg-emerald-500/5" : "border-amber-500/35 bg-amber-500/5"}`}><p className="text-sm font-medium">{(gate || localGate)?.ready ? "Quality gate ready from recorded evidence" : "Quality gate has blockers"}</p><p className="text-xs text-foreground/60 mt-1">{[...((gate || localGate)?.missing || []), ...((gate || localGate)?.blockers || [])].join(" · ") || "No deterministic blocker found."}</p><p className="text-[10px] text-muted-foreground mt-2">Buyer approval confirmed: {(gate || localGate)?.buyer_approval_confirmed ? "yes" : "no / not required"}. No buyer notification was sent.</p></div>}
          </div>

          <div className="p-4 md:p-5 space-y-6">
            <details open className="border border-border/60 group"><summary className="cursor-pointer list-none p-4 flex items-center justify-between"><span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-gold"><ClipboardCheck size={15} /> QC inspections & checkpoints</span><span className="text-xs text-muted-foreground">{inspections.length}</span></summary><div className="border-t border-border/60 p-4 space-y-4">
              <div className="grid sm:grid-cols-2 xl:grid-cols-6 gap-3"><Select label="Inspection type" value={inspectionDraft.type} options={INSPECTION_TYPES} onChange={(value) => setInspectionDraft((current) => ({ ...current, type: value as QcInspectionType }))} /><Field label="Standard/reference *" value={inspectionDraft.standard} onChange={(value) => setInspectionDraft((current) => ({ ...current, standard: value }))} /><Field label="Lot size" value={inspectionDraft.lot} onChange={(value) => setInspectionDraft((current) => ({ ...current, lot: value }))} /><Field label="Sample size" type="number" value={inspectionDraft.sampleSize} onChange={(value) => setInspectionDraft((current) => ({ ...current, sampleSize: value }))} /><Field label="Scheduled" type="datetime-local" value={inspectionDraft.scheduledAt} onChange={(value) => setInspectionDraft((current) => ({ ...current, scheduledAt: value }))} /><button type="button" onClick={() => void createInspection()} disabled={busy !== null} className="min-h-11 self-end bg-gradient-gold text-primary-foreground text-[9px] uppercase tracking-[0.13em] disabled:opacity-50"><Plus size={13} className="inline mr-1" /> Create inspection</button></div>
              {inspections.length > 0 && <div className="grid lg:grid-cols-[260px_minmax(0,1fr)] gap-4"><div className="border border-border/50">{inspections.map((row) => <button key={row.id} type="button" onClick={() => { setSelectedInspectionId(row.id); setDefectDraft((current) => ({ ...current, inspectionId: row.id })); }} className={`w-full text-left p-3 border-b border-border/40 last:border-0 ${selectedInspectionId === row.id ? "bg-gold/5" : "hover:bg-muted/20"}`}><p className="text-[9px] uppercase text-gold">{row.inspection_number}</p><p className="text-sm mt-1 capitalize">{row.inspection_type} · {row.status}</p></button>)}</div>
                {selectedInspection && <div className="border border-border/50 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[9px] uppercase tracking-[0.13em] text-gold">{selectedInspection.inspection_number}</p><h4 className="font-display text-xl mt-1 capitalize">{selectedInspection.inspection_type} inspection</h4><p className="text-xs text-muted-foreground mt-1">{selectedInspection.reference_standard}</p></div><StatusBadge status={selectedInspection.status} /></div>
                  <div className="grid sm:grid-cols-5 gap-2 mt-4"><Field label="Sequence" type="number" value={checkpointDraft.sequence} onChange={(value) => setCheckpointDraft((current) => ({ ...current, sequence: value }))} /><Select label="Category" value={checkpointDraft.category} options={CHECKPOINT_CATEGORIES} onChange={(value) => setCheckpointDraft((current) => ({ ...current, category: value }))} /><div className="sm:col-span-2"><Field label="Requirement *" value={checkpointDraft.requirement} onChange={(value) => setCheckpointDraft((current) => ({ ...current, requirement: value }))} /></div><button type="button" onClick={() => void addCheckpoint()} disabled={busy !== null} className="min-h-11 self-end border border-gold/60 text-gold text-[9px] uppercase">Add check</button></div>
                  <label className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={checkpointDraft.required} onChange={(event) => setCheckpointDraft((current) => ({ ...current, required: event.target.checked }))} /> Required checkpoint</label>
                  <div className="space-y-2 mt-4">{inspectionCheckpoints.length === 0 ? <Empty text="No checkpoints yet." /> : inspectionCheckpoints.map((row) => <div key={row.id} className="border border-border/50 p-3 flex flex-col lg:flex-row lg:items-center gap-3"><div className="flex-1 min-w-0"><p className="text-[9px] uppercase text-gold">#{row.sequence_no} · {row.category} · {row.required ? "required" : "optional"}</p><p className="text-sm mt-1">{row.requirement}</p>{row.measurement_value && <p className="text-xs text-muted-foreground mt-1">Value: {row.measurement_value}</p>}</div><select value={row.result} disabled={busy !== null || ["passed", "conditional", "failed", "cancelled"].includes(selectedInspection.status)} onChange={(event) => void updateCheckpoint(row, event.target.value as QcCheckpointResult)} className="min-h-10 border border-border/60 bg-background px-3 text-xs"><option value="not_checked">Not checked</option><option value="pass">Pass</option><option value="fail">Fail</option><option value="na">N/A</option></select></div>)}</div>
                  <div className={`mt-4 border p-3 ${localInspectionReadiness.ready ? "border-emerald-500/30" : "border-amber-500/30"}`}><p className="text-xs">Suggested result: <strong className="uppercase">{localInspectionReadiness.suggestedStatus}</strong></p><p className="text-[10px] text-muted-foreground mt-1">{[...localInspectionReadiness.missing, ...localInspectionReadiness.blockers].join(" · ") || "Required checks complete; no serious open defect."}</p><button type="button" onClick={() => void finalizeInspection()} disabled={busy !== null || ["passed", "conditional", "failed", "cancelled"].includes(selectedInspection.status)} className="mt-3 min-h-10 border border-gold/60 text-gold px-4 text-[9px] uppercase disabled:opacity-50">Finalize inspection</button></div>
                </div>}
              </div>}
            </div></details>

            <details open className="border border-border/60"><summary className="cursor-pointer list-none p-4 flex items-center justify-between"><span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-gold"><Bug size={15} /> Defects & rework</span><span className="text-xs text-muted-foreground">{openDefects.open} open</span></summary><div className="border-t border-border/60 p-4 space-y-4">
              <div className="grid sm:grid-cols-2 xl:grid-cols-7 gap-3"><Select label="Inspection" value={defectDraft.inspectionId} options={inspections.map((row) => row.id)} optionLabel={(value) => inspections.find((row) => row.id === value)?.inspection_number || value} placeholder="Unlinked" onChange={(value) => setDefectDraft((current) => ({ ...current, inspectionId: value }))} /><Select label="Category" value={defectDraft.category} options={CHECKPOINT_CATEGORIES} onChange={(value) => setDefectDraft((current) => ({ ...current, category: value }))} /><Select label="Severity" value={defectDraft.severity} options={DEFECT_SEVERITIES} onChange={(value) => setDefectDraft((current) => ({ ...current, severity: value as DefectSeverity }))} /><Field label="Affected qty" type="number" value={defectDraft.quantity} onChange={(value) => setDefectDraft((current) => ({ ...current, quantity: value }))} /><div className="sm:col-span-2"><Field label="Defect description *" value={defectDraft.description} onChange={(value) => setDefectDraft((current) => ({ ...current, description: value }))} /></div><button type="button" onClick={() => void addDefect()} disabled={busy !== null} className="min-h-11 self-end bg-gradient-gold text-primary-foreground text-[9px] uppercase disabled:opacity-50">Record defect</button></div>
              <div className="space-y-2">{defects.length === 0 ? <Empty text="No defects recorded." /> : defects.map((row) => <div key={row.id} className="border border-border/50 p-4"><div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3"><div><p className={`text-[9px] uppercase tracking-[0.13em] ${row.severity === "critical" ? "text-red-300" : row.severity === "major" ? "text-amber-300" : "text-gold"}`}>{row.defect_code || "Defect"} · {row.severity} · qty {row.quantity_affected}</p><p className="text-sm mt-1">{row.description}</p>{row.corrective_action && <p className="text-xs text-muted-foreground mt-1">Corrective action: {row.corrective_action}</p>}</div><select value={row.status} disabled={busy !== null} onChange={(event) => void updateDefect(row, event.target.value as DefectStatus)} className="min-h-10 border border-border/60 bg-background px-3 text-xs">{DEFECT_STATUSES.map((value) => <option key={value} value={value}>{value.replace(/_/g, " ")}</option>)}</select></div>
                    {reworks.filter((action) => action.defect_id === row.id).map((action) => <div key={action.id} className="mt-3 ml-3 border-l-2 border-gold/30 pl-3 flex items-center justify-between gap-3"><div><p className="text-xs">{action.action_text}</p><p className="text-[9px] text-muted-foreground mt-1">{action.status.replace(/_/g, " ")}{action.due_at ? ` · due ${new Date(action.due_at).toLocaleDateString()}` : ""}</p></div><select value={action.status} onChange={(event) => void updateRework(action, event.target.value as ReworkRow["status"])} className="min-h-9 border border-border/60 bg-background px-2 text-[10px]"><option value="planned">planned</option><option value="in_progress">in progress</option><option value="verification">verification</option><option value="verified">verified</option><option value="rejected">rejected</option><option value="cancelled">cancelled</option></select></div>)}
                  </div>)}</div>
              <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-3 border-t border-border/50 pt-4"><Select label="Defect for rework" value={reworkDraft.defectId} options={defects.filter((row) => !["accepted", "closed"].includes(row.status)).map((row) => row.id)} optionLabel={(value) => { const row = defects.find((item) => item.id === value); return row ? `${row.defect_code || "Defect"} · ${row.description.slice(0, 36)}` : value; }} placeholder="Select defect" onChange={(value) => setReworkDraft((current) => ({ ...current, defectId: value }))} /><div className="sm:col-span-2"><Field label="Rework action *" value={reworkDraft.action} onChange={(value) => setReworkDraft((current) => ({ ...current, action: value }))} /></div><Field label="Due" type="datetime-local" value={reworkDraft.dueAt} onChange={(value) => setReworkDraft((current) => ({ ...current, dueAt: value }))} /><button type="button" onClick={() => void addRework()} disabled={busy !== null} className="min-h-11 self-end border border-gold/60 text-gold text-[9px] uppercase">Add rework</button></div>
            </div></details>

            <details open className="border border-border/60"><summary className="cursor-pointer list-none p-4 flex items-center justify-between"><span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-gold"><FlaskConical size={15} /> Sample approvals</span><span className="text-xs text-muted-foreground">{samples.length} round(s)</span></summary><div className="border-t border-border/60 p-4 space-y-4">
              <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-3"><Select label="Sample type" value={sampleDraft.type} options={SAMPLE_TYPES} onChange={(value) => setSampleDraft((current) => ({ ...current, type: value }))} /><div className="sm:col-span-2"><Field label="Sample reference *" value={sampleDraft.reference} onChange={(value) => setSampleDraft((current) => ({ ...current, reference: value }))} /></div><Field label="Due" type="datetime-local" value={sampleDraft.dueAt} onChange={(value) => setSampleDraft((current) => ({ ...current, dueAt: value }))} /><button type="button" onClick={() => void createSample()} disabled={busy !== null} className="min-h-11 self-end bg-gradient-gold text-primary-foreground text-[9px] uppercase">Create round</button></div>
              <div className="space-y-2">{samples.length === 0 ? <Empty text="No sample approval rounds." /> : samples.map((row) => <div key={row.id} className="border border-border/50 p-4"><div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3"><div><p className="text-[9px] uppercase tracking-[0.13em] text-gold">Round {row.round_no} · {row.sample_type.replace(/_/g, " ")}</p><p className="font-display text-lg mt-1">{row.sample_reference}</p><p className="text-xs text-muted-foreground mt-1">Buyer decision: {row.buyer_decision.replace(/_/g, " ")}{row.buyer_feedback_at ? ` · ${new Date(row.buyer_feedback_at).toLocaleString()}` : ""}</p></div><div className="grid sm:grid-cols-2 gap-2"><select value={row.workflow_status} onChange={(event) => void updateSample(row, "workflow_status", event.target.value)} className="min-h-10 border border-border/60 bg-background px-2 text-xs">{SAMPLE_WORKFLOW.map((value) => <option key={value} value={value}>{value.replace(/_/g, " ")}</option>)}</select><select value={row.internal_decision} onChange={(event) => void updateSample(row, "internal_decision", event.target.value)} className="min-h-10 border border-border/60 bg-background px-2 text-xs">{INTERNAL_DECISIONS.map((value) => <option key={value} value={value}>{`internal: ${value.replace(/_/g, " ")}`}</option>)}</select></div></div>{row.buyer_evidence_note && <p className="text-xs text-foreground/60 mt-3 border-l-2 border-gold/30 pl-3">Evidence: {row.buyer_evidence_note}</p>}</div>)}</div>
              <div className="border-t border-border/50 pt-4"><p className="text-[9px] uppercase tracking-[0.14em] text-gold mb-3">Record buyer decision from retained evidence</p><div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-3"><Select label="Sample round" value={decisionDraft.sampleId} options={samples.map((row) => row.id)} optionLabel={(value) => { const row = samples.find((item) => item.id === value); return row ? `Round ${row.round_no} · ${row.sample_reference}` : value; }} placeholder="Select sample" onChange={(value) => setDecisionDraft((current) => ({ ...current, sampleId: value }))} /><Select label="Decision" value={decisionDraft.decision} options={["approved", "changes_requested", "rejected"]} onChange={(value) => setDecisionDraft((current) => ({ ...current, decision: value as typeof current.decision }))} /><div className="sm:col-span-2"><Field label="Evidence note" value={decisionDraft.evidenceNote} onChange={(value) => setDecisionDraft((current) => ({ ...current, evidenceNote: value }))} /></div><button type="button" onClick={() => void recordBuyerDecision()} disabled={busy !== null} className="min-h-11 self-end border border-gold/60 text-gold text-[9px] uppercase">Record decision</button></div><div className="mt-3"><Select label="Optional buyer-feedback file" value={decisionDraft.evidenceFileId} options={files.filter((row) => row.category === "buyer_feedback").map((row) => row.id)} optionLabel={(value) => files.find((row) => row.id === value)?.file_name || value} placeholder="No file" onChange={(value) => setDecisionDraft((current) => ({ ...current, evidenceFileId: value }))} /></div></div>
            </div></details>

            <details open className="border border-border/60"><summary className="cursor-pointer list-none p-4 flex items-center justify-between"><span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-gold"><Paperclip size={15} /> Private production evidence</span><span className="text-xs text-muted-foreground">{files.length}</span></summary><div className="border-t border-border/60 p-4 space-y-4">
              <input ref={inputRef} type="file" className="hidden" accept="image/jpeg,image/png,image/webp,application/pdf,video/mp4,video/webm,.docx,.xlsx,.csv,.txt" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadEvidence(file); event.currentTarget.value = ""; }} />
              <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-3"><Select label="Link to" value={fileDraft.entityType} options={ENTITY_TYPES} onChange={(value) => setFileDraft((current) => ({ ...current, entityType: value, entityId: value === "job" ? "" : current.entityId }))} /><Select label="Record" value={fileDraft.entityId} options={entityOptions(fileDraft.entityType, inspections, defects, reworks, samples)} optionLabel={(value) => entityLabel(fileDraft.entityType, value, inspections, defects, reworks, samples)} placeholder={fileDraft.entityType === "job" ? "Production job" : "Select record"} onChange={(value) => setFileDraft((current) => ({ ...current, entityId: value }))} /><Select label="Category" value={fileDraft.category} options={EVIDENCE_CATEGORIES} onChange={(value) => setFileDraft((current) => ({ ...current, category: value }))} /><Field label="Description" value={fileDraft.description} onChange={(value) => setFileDraft((current) => ({ ...current, description: value }))} /><button type="button" onClick={() => inputRef.current?.click()} disabled={busy !== null || (fileDraft.entityType !== "job" && !fileDraft.entityId)} className="min-h-11 self-end inline-flex items-center justify-center gap-2 bg-gradient-gold text-primary-foreground text-[9px] uppercase disabled:opacity-50">{busy === "file:upload" ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />} Upload private file</button></div>
              <p className="text-[10px] text-muted-foreground">Private bucket · 50 MB maximum · short five-minute signed access · SHA-256 checksum retained · no public URL.</p>
              <div className="grid lg:grid-cols-2 gap-2">{files.length === 0 ? <Empty text="No private production evidence." /> : files.map((row) => <div key={row.id} className="border border-border/50 p-3 flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[9px] uppercase text-gold">{row.category.replace(/_/g, " ")} · {row.entity_type}</p><p className="text-sm mt-1 truncate">{row.file_name}</p><p className="text-[9px] text-muted-foreground mt-1">{formatBytes(row.size_bytes)} · checksum {row.checksum_sha256?.slice(0, 12) || "missing"}…</p></div><div className="flex gap-1"><button type="button" onClick={() => void openEvidence(row)} className="min-h-10 min-w-10 inline-flex items-center justify-center border border-border/60" aria-label="Open private evidence"><Download size={13} /></button><button type="button" onClick={() => void removeEvidence(row)} disabled={busy !== null} className="min-h-10 min-w-10 inline-flex items-center justify-center border border-red-500/30 text-red-300 disabled:opacity-50" aria-label="Delete private evidence"><Trash2 size={13} /></button></div></div>)}</div>
            </div></details>
          </div>
        </div>}
      </div>
      {detailsLoading && <div className="fixed bottom-5 right-5 border border-gold/40 bg-background px-4 py-3 text-xs shadow-xl inline-flex items-center gap-2"><Loader2 size={13} className="animate-spin text-gold" /> Updating quality workspace…</div>}
    </section>
  );
}

function entityOptions(type: string, inspections: InspectionRow[], defects: DefectRow[], reworks: ReworkRow[], samples: SampleRow[]) {
  if (type === "inspection" || type === "checkpoint") return inspections.map((row) => row.id);
  if (type === "defect") return defects.map((row) => row.id);
  if (type === "rework") return reworks.map((row) => row.id);
  if (type === "sample") return samples.map((row) => row.id);
  return [];
}

function entityLabel(type: string, id: string, inspections: InspectionRow[], defects: DefectRow[], reworks: ReworkRow[], samples: SampleRow[]) {
  if (type === "inspection" || type === "checkpoint") return inspections.find((row) => row.id === id)?.inspection_number || id;
  if (type === "defect") { const row = defects.find((item) => item.id === id); return row ? `${row.defect_code || "Defect"} · ${row.description.slice(0, 38)}` : id; }
  if (type === "rework") return reworks.find((row) => row.id === id)?.action_text.slice(0, 48) || id;
  if (type === "sample") { const row = samples.find((item) => item.id === id); return row ? `Round ${row.round_no} · ${row.sample_reference}` : id; }
  return "Production job";
}

function Metric({ label, value, attention = false }: { label: string; value: number; attention?: boolean }) {
  return <div className="border border-border/50 p-3"><p className={`font-display text-xl ${attention ? "text-amber-300" : ""}`}>{value.toLocaleString()}</p><p className="text-[8px] uppercase tracking-[0.12em] text-muted-foreground mt-1">{label}</p></div>;
}

function StatusBadge({ status }: { status: string }) {
  const Icon = status === "passed" ? CheckCircle2 : status === "failed" ? XCircle : status === "conditional" ? AlertTriangle : RotateCcw;
  return <span className="inline-flex items-center gap-1 border border-border/60 px-2 py-1 text-[9px] uppercase"><Icon size={11} /> {status.replace(/_/g, " ")}</span>;
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="block"><span className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} className={`${FIELD} mt-1`} /></label>;
}

function Select({ label, value, options, onChange, optionLabel, placeholder }: { label: string; value: string; options: readonly string[]; onChange: (value: string) => void; optionLabel?: (value: string) => string; placeholder?: string }) {
  return <label className="block"><span className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className={`${FIELD} mt-1 text-xs`}>{placeholder !== undefined && <option value="">{placeholder}</option>}{options.map((option) => <option key={option} value={option}>{optionLabel ? optionLabel(option) : option.replace(/_/g, " ")}</option>)}</select></label>;
}

function Empty({ text }: { text: string }) {
  return <div className="border border-dashed border-border/50 p-5 text-center text-xs text-muted-foreground"><FileText size={18} className="mx-auto text-gold mb-2" />{text}</div>;
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}
