import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileCheck2,
  FileWarning,
  FlaskConical,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
  Wrench,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  defectPoints,
  firstPassYield,
  qcReleaseReadiness,
  qualityRisk,
  safeStorageName,
  validatePrivateEvidenceFile,
  type DefectEvidence,
  type DefectSeverity,
  type EvidenceType,
  type InspectionEvidence,
  type QcInspectionStatus,
  type QcInspectionType,
  type ReworkStatus,
  type SampleApprovalStatus,
  type SampleApprovalEvidence,
} from "@/lib/productionQuality";

const db = supabase as any;
const BUCKET = "production-evidence";
const MIGRATION = "supabase/migrations/20260713230000_production_quality_evidence.sql";
const FIELD = "min-h-11 w-full border border-border/60 bg-background px-3 text-sm outline-none focus:border-gold";

const INSPECTION_TYPES: QcInspectionType[] = ["incoming", "inline", "final", "sample", "pre_shipment"];
const INSPECTION_STATUSES: QcInspectionStatus[] = ["draft", "in_progress", "passed", "conditional", "rework_required", "failed", "closed"];
const REWORK_STATUSES: ReworkStatus[] = ["open", "assigned", "in_progress", "verified", "closed", "waived"];
const SAMPLE_STATUSES: SampleApprovalStatus[] = ["draft", "internal_review", "buyer_review", "approved", "changes_requested", "rejected", "archived"];
const EVIDENCE_TYPES: EvidenceType[] = ["inspection_photo", "defect_photo", "measurement_sheet", "tech_pack", "sample_photo", "buyer_approval", "shipping_document", "other"];

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
  quality_risk: "clear" | "attention" | "blocked";
  quality_release_status: "not_ready" | "ready_for_owner_review" | "approved" | "rejected";
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

interface InspectionRow {
  id: string;
  production_job_id: string;
  inspection_number: string;
  inspection_type: QcInspectionType;
  status: QcInspectionStatus;
  inspected_quantity: number;
  passed_quantity: number;
  failed_quantity: number;
  notes: string | null;
  owner_review_status: string;
  inspected_at: string | null;
  created_at: string;
}

interface DefectRow {
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

interface SampleRow {
  id: string;
  production_job_id: string;
  sample_round: number;
  status: SampleApprovalStatus;
  decision_source: "internal" | "buyer";
  decision_reference: string | null;
  approved_specification_reference: string | null;
  decision_at: string | null;
  notes: string | null;
  owner_approved_at: string | null;
  created_at: string;
}

interface EvidenceRow {
  id: string;
  production_job_id: string;
  inspection_id: string | null;
  defect_id: string | null;
  sample_approval_id: string | null;
  evidence_type: EvidenceType;
  storage_bucket: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  checksum_sha256: string | null;
  verification_status: "pending" | "verified" | "rejected";
  evidence_note: string | null;
  created_at: string;
}

type InspectionDraft = {
  type: QcInspectionType;
  status: QcInspectionStatus;
  inspected: string;
  passed: string;
  failed: string;
  notes: string;
};

type DefectDraft = {
  inspectionId: string;
  severity: DefectSeverity;
  quantity: string;
  category: string;
  description: string;
  location: string;
  dueAt: string;
};

type SampleDraft = {
  round: string;
  status: SampleApprovalStatus;
  source: "internal" | "buyer";
  decisionReference: string;
  approvedSpecificationReference: string;
  notes: string;
};

type EvidenceDraft = {
  type: EvidenceType;
  inspectionId: string;
  defectId: string;
  sampleApprovalId: string;
  note: string;
};

const EMPTY_INSPECTION: InspectionDraft = { type: "final", status: "draft", inspected: "", passed: "", failed: "", notes: "" };
const EMPTY_DEFECT: DefectDraft = { inspectionId: "", severity: "major", quantity: "1", category: "workmanship", description: "", location: "", dueAt: "" };
const EMPTY_SAMPLE: SampleDraft = { round: "1", status: "internal_review", source: "internal", decisionReference: "", approvedSpecificationReference: "", notes: "" };
const EMPTY_EVIDENCE: EvidenceDraft = { type: "inspection_photo", inspectionId: "", defectId: "", sampleApprovalId: "", note: "" };

export default function ProductionQualityPanel() {
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [jobs, setJobs] = useState<SummaryRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [inspections, setInspections] = useState<InspectionRow[]>([]);
  const [defects, setDefects] = useState<DefectRow[]>([]);
  const [samples, setSamples] = useState<SampleRow[]>([]);
  const [evidence, setEvidence] = useState<EvidenceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [inspectionDraft, setInspectionDraft] = useState<InspectionDraft>(EMPTY_INSPECTION);
  const [defectDraft, setDefectDraft] = useState<DefectDraft>(EMPTY_DEFECT);
  const [sampleDraft, setSampleDraft] = useState<SampleDraft>(EMPTY_SAMPLE);
  const [evidenceDraft, setEvidenceDraft] = useState<EvidenceDraft>(EMPTY_EVIDENCE);
  const [reworkNotes, setReworkNotes] = useState<Record<string, { rootCause: string; correctiveAction: string }>>({});
  const [serverReadiness, setServerReadiness] = useState<{ ready: boolean; blockers: string[]; verified_evidence?: number } | null>(null);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await db.from("production_quality_summary").select("*").order("updated_at", { ascending: false }).limit(500);
    if (error) {
      setBackendError(error.message || "Quality backend unavailable");
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
    if (!jobId) {
      setInspections([]);
      setDefects([]);
      setSamples([]);
      setEvidence([]);
      return;
    }
    setDetailsLoading(true);
    const [inspectionResult, defectResult, sampleResult, evidenceResult] = await Promise.all([
      db.from("production_qc_inspections").select("*").eq("production_job_id", jobId).order("created_at", { ascending: false }),
      db.from("production_qc_defects").select("*").eq("production_job_id", jobId).order("created_at", { ascending: false }),
      db.from("production_sample_approvals").select("*").eq("production_job_id", jobId).order("sample_round", { ascending: false }),
      db.from("production_evidence_files").select("*").eq("production_job_id", jobId).order("created_at", { ascending: false }),
    ]);
    const error = inspectionResult.error || defectResult.error || sampleResult.error || evidenceResult.error;
    if (error) {
      toast({ title: "Quality details could not load", description: error.message, variant: "destructive" });
      setDetailsLoading(false);
      return;
    }
    const nextInspections = (inspectionResult.data || []) as InspectionRow[];
    const nextDefects = (defectResult.data || []) as DefectRow[];
    const nextSamples = (sampleResult.data || []) as SampleRow[];
    setInspections(nextInspections);
    setDefects(nextDefects);
    setSamples(nextSamples);
    setEvidence((evidenceResult.data || []) as EvidenceRow[]);
    setDefectDraft((current) => ({ ...current, inspectionId: current.inspectionId && nextInspections.some((row) => row.id === current.inspectionId) ? current.inspectionId : nextInspections[0]?.id || "" }));
    setSampleDraft((current) => ({ ...current, round: String(Math.max(1, (nextSamples[0]?.sample_round || 0) + 1)) }));
    setServerReadiness(null);
    setDetailsLoading(false);
  }, []);

  useEffect(() => { void loadJobs(); }, [loadJobs]);
  useEffect(() => { void loadDetails(selectedId); }, [loadDetails, selectedId]);

  const selected = useMemo(() => jobs.find((row) => row.production_job_id === selectedId) || null, [jobs, selectedId]);
  const inspectionEvidence = useMemo<InspectionEvidence[]>(() => inspections.map((row) => ({
    type: row.inspection_type,
    status: row.status,
    inspectedQuantity: Number(row.inspected_quantity),
    passedQuantity: Number(row.passed_quantity),
    failedQuantity: Number(row.failed_quantity),
  })), [inspections]);
  const defectEvidence = useMemo<DefectEvidence[]>(() => defects.map((row) => ({ severity: row.severity, quantity: Number(row.quantity), reworkStatus: row.rework_status })), [defects]);
  const sampleEvidence = useMemo<SampleApprovalEvidence[]>(() => samples.map((row) => ({ status: row.status, approvedSpecificationReference: row.approved_specification_reference })), [samples]);
  const clientReadiness = useMemo(() => selected ? qcReleaseReadiness({ jobType: selected.job_type, inspections: inspectionEvidence, defects: defectEvidence, sampleApprovals: sampleEvidence }) : null, [defectEvidence, inspectionEvidence, sampleEvidence, selected]);
  const clientRisk = useMemo(() => selected ? qualityRisk({ inspections: inspectionEvidence, defects: defectEvidence, sampleApprovalRequired: selected.job_type === "sample", sampleApprovals: sampleEvidence }) : "attention", [defectEvidence, inspectionEvidence, sampleEvidence, selected]);
  const yieldPercent = useMemo(() => firstPassYield(inspectionEvidence), [inspectionEvidence]);
  const points = useMemo(() => defectPoints(defectEvidence), [defectEvidence]);
  const stats = useMemo(() => ({
    jobs: jobs.length,
    blocked: jobs.filter((row) => row.quality_risk === "blocked").length,
    attention: jobs.filter((row) => row.quality_risk === "attention").length,
    openDefects: jobs.reduce((sum, row) => sum + Number(row.open_defects || 0), 0),
    ownerReady: jobs.filter((row) => row.quality_release_status === "ready_for_owner_review").length,
  }), [jobs]);

  const refresh = async () => {
    await loadJobs();
    await loadDetails(selectedId);
  };

  const createInspection = async () => {
    if (!selected) return;
    const inspected = Number(inspectionDraft.inspected || 0);
    const passed = Number(inspectionDraft.passed || 0);
    const failed = Number(inspectionDraft.failed || 0);
    if ([inspected, passed, failed].some((value) => !Number.isFinite(value) || value < 0) || passed + failed > inspected) {
      toast({ title: "Inspection quantities are invalid", description: "Passed + failed cannot exceed inspected quantity.", variant: "destructive" });
      return;
    }
    setBusy("inspection:create");
    const { data, error } = await db.rpc("production_create_qc_inspection", {
      _job_id: selected.production_job_id,
      _inspection_type: inspectionDraft.type,
      _status: inspectionDraft.status,
      _inspected_quantity: inspected,
      _passed_quantity: passed,
      _failed_quantity: failed,
      _notes: inspectionDraft.notes.trim() || null,
    });
    setBusy(null);
    if (error) {
      toast({ title: "Inspection was not created", description: error.message, variant: "destructive" });
      return;
    }
    setInspectionDraft(EMPTY_INSPECTION);
    setDefectDraft((current) => ({ ...current, inspectionId: data?.id || current.inspectionId }));
    toast({ title: `${data?.inspection_number || "QC inspection"} recorded`, description: "Internal evidence only. No buyer notification sent." });
    await refresh();
  };

  const addDefect = async () => {
    if (!selected || !defectDraft.inspectionId || defectDraft.description.trim().length < 3 || Number(defectDraft.quantity) <= 0) {
      toast({ title: "Inspection, description and quantity are required", variant: "destructive" });
      return;
    }
    setBusy("defect:create");
    const { data, error } = await db.rpc("production_add_qc_defect", {
      _inspection_id: defectDraft.inspectionId,
      _severity: defectDraft.severity,
      _quantity: Number(defectDraft.quantity),
      _category: defectDraft.category.trim() || "workmanship",
      _description: defectDraft.description.trim(),
      _location: defectDraft.location.trim() || null,
      _due_at: defectDraft.dueAt ? new Date(defectDraft.dueAt).toISOString() : null,
    });
    setBusy(null);
    if (error) {
      toast({ title: "Defect was not recorded", description: error.message, variant: "destructive" });
      return;
    }
    setDefectDraft((current) => ({ ...EMPTY_DEFECT, inspectionId: current.inspectionId }));
    toast({ title: `${data?.severity || "QC"} defect recorded`, description: "Quality release returned to not ready." });
    await refresh();
  };

  const updateRework = async (defect: DefectRow, status: ReworkStatus) => {
    const note = reworkNotes[defect.id] || { rootCause: defect.root_cause || "", correctiveAction: defect.corrective_action || "" };
    if (["verified", "closed"].includes(status) && (note.rootCause.trim().length < 3 || note.correctiveAction.trim().length < 3)) {
      toast({ title: "Root cause and corrective action are required", variant: "destructive" });
      return;
    }
    if (status === "waived" && !window.confirm("Waive this defect only when owner-approved evidence exists. This does not notify the buyer. Continue?")) return;
    setBusy(`defect:${defect.id}`);
    const { error } = await db.rpc("production_set_rework_status", {
      _defect_id: defect.id,
      _status: status,
      _root_cause: note.rootCause.trim() || null,
      _corrective_action: note.correctiveAction.trim() || null,
    });
    setBusy(null);
    if (error) {
      toast({ title: "Rework status was not updated", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Rework marked ${status.replaceAll("_", " ")}` });
    await refresh();
  };

  const recordSampleDecision = async () => {
    if (!selected) return;
    if (sampleDraft.status === "approved" && sampleDraft.approvedSpecificationReference.trim().length < 3) {
      toast({ title: "Approved specification reference is required", variant: "destructive" });
      return;
    }
    const buyerImpacting = ["buyer_review", "approved", "changes_requested", "rejected", "archived"].includes(sampleDraft.status);
    if (buyerImpacting && !window.confirm("Confirm owner review for this sample decision. Recording it does not send any buyer message. Continue?")) return;
    setBusy("sample:save");
    const { data, error } = await db.rpc("production_record_sample_decision", {
      _job_id: selected.production_job_id,
      _sample_round: Number(sampleDraft.round),
      _status: sampleDraft.status,
      _decision_source: sampleDraft.source,
      _decision_reference: sampleDraft.decisionReference.trim() || null,
      _approved_specification_reference: sampleDraft.approvedSpecificationReference.trim() || null,
      _notes: sampleDraft.notes.trim() || null,
    });
    setBusy(null);
    if (error) {
      toast({ title: "Sample decision was not saved", description: error.message, variant: "destructive" });
      return;
    }
    setSampleDraft((current) => ({ ...EMPTY_SAMPLE, round: String(Number(current.round) + 1) }));
    toast({ title: `Sample round ${data?.sample_round || sampleDraft.round} recorded`, description: "No buyer message was sent." });
    await refresh();
  };

  const uploadEvidence = async (file: File) => {
    if (!selected) return;
    const validation = validatePrivateEvidenceFile(file);
    if (!validation.valid) {
      toast({ title: "Private evidence file rejected", description: validation.errors.join(" · "), variant: "destructive" });
      return;
    }
    setBusy("evidence:upload");
    const path = `${selected.production_job_id}/${crypto.randomUUID()}-${safeStorageName(file.name)}`;
    let checksum = "";
    try {
      const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
      checksum = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
    } catch {
      checksum = "";
    }
    const { error: storageError } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false, contentType: file.type, cacheControl: "3600" });
    if (storageError) {
      setBusy(null);
      toast({ title: "Private production storage is not active yet", description: storageError.message, variant: "destructive" });
      return;
    }
    const { data, error } = await db.rpc("production_register_evidence", {
      _job_id: selected.production_job_id,
      _evidence_type: evidenceDraft.type,
      _storage_path: path,
      _file_name: file.name,
      _mime_type: file.type,
      _size_bytes: file.size,
      _inspection_id: evidenceDraft.inspectionId || null,
      _defect_id: evidenceDraft.defectId || null,
      _sample_approval_id: evidenceDraft.sampleApprovalId || null,
      _evidence_note: evidenceDraft.note.trim() || null,
      _checksum_sha256: checksum || null,
    });
    if (error) {
      await supabase.storage.from(BUCKET).remove([path]);
      setBusy(null);
      toast({ title: "Evidence metadata was not saved", description: error.message, variant: "destructive" });
      return;
    }
    setEvidenceDraft(EMPTY_EVIDENCE);
    setBusy(null);
    toast({ title: `${data?.file_name || file.name} uploaded privately`, description: "Verification is still pending." });
    await refresh();
  };

  const openEvidence = async (row: EvidenceRow) => {
    const { data, error } = await supabase.storage.from(row.storage_bucket).createSignedUrl(row.storage_path, 300);
    if (error || !data?.signedUrl) {
      toast({ title: "Private evidence could not open", description: error?.message || "Signed URL unavailable", variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const verifyEvidence = async (row: EvidenceRow, status: "verified" | "rejected") => {
    if (status === "rejected" && !window.confirm(`Reject evidence ${row.file_name}? The private object remains preserved.`)) return;
    setBusy(`evidence:${row.id}`);
    const { error } = await db.rpc("production_verify_evidence", { _evidence_id: row.id, _status: status });
    setBusy(null);
    if (error) {
      toast({ title: "Evidence verification failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Evidence ${status}` });
    await refresh();
  };

  const checkReadiness = async () => {
    if (!selected) return;
    setBusy("readiness");
    const { data, error } = await db.rpc("production_qc_readiness", { _job_id: selected.production_job_id });
    setBusy(null);
    if (error) {
      toast({ title: "QC readiness could not run", description: error.message, variant: "destructive" });
      return;
    }
    setServerReadiness({ ready: Boolean(data?.ready), blockers: Array.isArray(data?.blockers) ? data.blockers : [], verified_evidence: Number(data?.verified_evidence || 0) });
    await loadJobs();
  };

  const ownerCloseQc = async () => {
    if (!selected) return;
    if (!window.confirm("Approve internal QC release from verified evidence? This does not notify the buyer or book shipment.")) return;
    setBusy("owner-close");
    const { error } = await db.rpc("production_owner_close_qc", { _job_id: selected.production_job_id });
    setBusy(null);
    if (error) {
      toast({ title: "QC release remains blocked", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Internal QC release approved", description: "No buyer notification or shipment action was executed." });
    await refresh();
  };

  if (loading && jobs.length === 0) return <div className="py-12 text-center text-sm text-muted-foreground" role="status">Loading quality control…</div>;

  if (backendError) {
    return <section className="border border-amber-500/35 bg-amber-500/[0.05] p-6 md:p-8"><div className="flex items-start gap-4"><AlertTriangle size={22} className="text-amber-300 shrink-0 mt-1" /><div><p className="eyebrow mb-2">Phase 6.2 · Quality Control</p><h2 className="font-display text-2xl md:text-3xl">Backend activation pending</h2><p className="text-sm text-foreground/65 mt-3 max-w-3xl leading-relaxed">QC, defects, sample decisions and private evidence UI are code-ready. The prepared migration stays deferred until the final one-time backend activation.</p><code className="mt-4 block text-xs text-amber-200 break-all">{MIGRATION}</code><p className="mt-3 text-xs text-foreground/45 break-all">Runtime evidence: {backendError}</p></div></div></section>;
  }

  return (
    <section className="border border-gold/35 bg-card/20">
      <div className="p-4 sm:p-5 md:p-6 border-b border-border/60 flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
        <div className="flex items-start gap-3"><ShieldCheck size={22} className="text-gold shrink-0 mt-1" /><div><p className="eyebrow mb-2">Phase 6.2 · Quality Control</p><h2 className="font-display text-2xl md:text-4xl">QC, Defects & Sample Evidence</h2><p className="text-sm text-foreground/60 mt-3 max-w-4xl leading-relaxed">Record inspections, control rework, preserve buyer/sample decisions and keep production evidence private. Nothing here sends a buyer message, waives QC silently or books a shipment.</p></div></div>
        <button type="button" onClick={() => void refresh()} disabled={busy !== null} className="min-h-11 inline-flex items-center justify-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.15em] hover:border-gold disabled:opacity-50"><RefreshCw size={13} /> Refresh</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 border-b border-border/60">
        <Metric label="Jobs" value={stats.jobs} />
        <Metric label="Blocked" value={stats.blocked} attention={stats.blocked > 0} />
        <Metric label="Attention" value={stats.attention} attention={stats.attention > 0} />
        <Metric label="Open defects" value={stats.openDefects} attention={stats.openDefects > 0} />
        <Metric label="Owner review ready" value={stats.ownerReady} />
      </div>

      <div className="p-4 md:p-5 border-b border-border/60 grid xl:grid-cols-[320px_minmax(0,1fr)] gap-4">
        <label className="block"><span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Production job</span><select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className={`${FIELD} mt-2`}><option value="">Select job</option>{jobs.map((job) => <option key={job.production_job_id} value={job.production_job_id}>{job.job_number} · {job.product_name}</option>)}</select></label>
        {selected ? <div className="border border-border/60 p-4 grid sm:grid-cols-2 xl:grid-cols-5 gap-3"><Info label="Buyer" value={selected.company_name || selected.buyer_name} /><Info label="Product" value={selected.product_name} /><Info label="QC" value={selected.qc_status} /><Info label="Risk" value={clientRisk} /><Info label="Release" value={selected.quality_release_status} /></div> : <div className="border border-dashed border-border/60 p-4 text-sm text-muted-foreground">Select a production job to manage quality evidence.</div>}
      </div>

      {selected && <>
        <div className="p-4 md:p-5 border-b border-border/60 grid grid-cols-2 lg:grid-cols-6 gap-2">
          <Mini label="Inspections" value={inspections.length} />
          <Mini label="Open defects" value={defects.filter((row) => !["verified", "closed", "waived"].includes(row.rework_status)).length} />
          <Mini label="Defect points" value={points} />
          <Mini label="First-pass yield" value={yieldPercent === null ? "—" : `${yieldPercent}%`} />
          <Mini label="Evidence verified" value={`${evidence.filter((row) => row.verification_status === "verified").length}/${evidence.length}`} />
          <Mini label="Sample round" value={samples[0]?.sample_round || "—"} />
        </div>

        <div className="p-4 md:p-5 border-b border-border/60 grid lg:grid-cols-2 gap-4">
          <details className="border border-border/60 group"><summary className="cursor-pointer list-none p-4 flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-gold"><ClipboardCheck size={14} /> Record inspection</span><span className="text-xs text-muted-foreground group-open:hidden">Open</span></summary><div className="p-4 pt-0 grid sm:grid-cols-2 gap-3"><Select label="Inspection type" value={inspectionDraft.type} onChange={(value) => setInspectionDraft((current) => ({ ...current, type: value as QcInspectionType }))} options={INSPECTION_TYPES} /><Select label="Status" value={inspectionDraft.status} onChange={(value) => setInspectionDraft((current) => ({ ...current, status: value as QcInspectionStatus }))} options={INSPECTION_STATUSES} /><Field label="Inspected quantity" type="number" value={inspectionDraft.inspected} onChange={(value) => setInspectionDraft((current) => ({ ...current, inspected: value }))} /><Field label="Passed quantity" type="number" value={inspectionDraft.passed} onChange={(value) => setInspectionDraft((current) => ({ ...current, passed: value }))} /><Field label="Failed quantity" type="number" value={inspectionDraft.failed} onChange={(value) => setInspectionDraft((current) => ({ ...current, failed: value }))} /><Field label="Notes" value={inspectionDraft.notes} onChange={(value) => setInspectionDraft((current) => ({ ...current, notes: value }))} /><button type="button" onClick={() => void createInspection()} disabled={busy !== null} className="sm:col-span-2 min-h-11 bg-gradient-gold text-primary-foreground text-[10px] uppercase tracking-[0.15em] disabled:opacity-50">{busy === "inspection:create" ? "Saving…" : "Record internal inspection"}</button></div></details>

          <details className="border border-border/60 group"><summary className="cursor-pointer list-none p-4 flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-gold"><FileWarning size={14} /> Record defect</span><span className="text-xs text-muted-foreground group-open:hidden">Open</span></summary><div className="p-4 pt-0 grid sm:grid-cols-2 gap-3"><Select label="Inspection" value={defectDraft.inspectionId} onChange={(value) => setDefectDraft((current) => ({ ...current, inspectionId: value }))} options={inspections.map((row) => row.id)} optionLabel={(value) => inspections.find((row) => row.id === value)?.inspection_number || value} /><Select label="Severity" value={defectDraft.severity} onChange={(value) => setDefectDraft((current) => ({ ...current, severity: value as DefectSeverity }))} options={["minor", "major", "critical"]} /><Field label="Quantity affected" type="number" value={defectDraft.quantity} onChange={(value) => setDefectDraft((current) => ({ ...current, quantity: value }))} /><Field label="Category" value={defectDraft.category} onChange={(value) => setDefectDraft((current) => ({ ...current, category: value }))} /><Field label="Description" value={defectDraft.description} onChange={(value) => setDefectDraft((current) => ({ ...current, description: value }))} /><Field label="Location" value={defectDraft.location} onChange={(value) => setDefectDraft((current) => ({ ...current, location: value }))} /><Field label="Rework due" type="datetime-local" value={defectDraft.dueAt} onChange={(value) => setDefectDraft((current) => ({ ...current, dueAt: value }))} /><button type="button" onClick={() => void addDefect()} disabled={busy !== null || inspections.length === 0} className="min-h-11 self-end bg-gradient-gold text-primary-foreground text-[10px] uppercase tracking-[0.15em] disabled:opacity-50">{busy === "defect:create" ? "Saving…" : "Record defect"}</button></div></details>
        </div>

        <div className="p-4 md:p-5 border-b border-border/60 grid xl:grid-cols-2 gap-4">
          <section><div className="flex items-center gap-2 mb-3"><ClipboardCheck size={16} className="text-gold" /><p className="eyebrow">Inspection history</p></div>{detailsLoading ? <Loading /> : inspections.length === 0 ? <Empty text="No QC inspection recorded." /> : <div className="space-y-2">{inspections.map((row) => <article key={row.id} className="border border-border/60 p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-[9px] uppercase tracking-[0.14em] text-gold">{row.inspection_number} · {row.inspection_type.replaceAll("_", " ")}</p><p className="font-display text-lg mt-1">{row.status.replaceAll("_", " ")}</p></div><StatusBadge value={row.owner_review_status} /></div><div className="grid grid-cols-3 gap-2 mt-3"><Mini label="Inspected" value={row.inspected_quantity} /><Mini label="Passed" value={row.passed_quantity} /><Mini label="Failed" value={row.failed_quantity} /></div>{row.notes && <p className="text-xs text-foreground/60 mt-3 whitespace-pre-wrap">{row.notes}</p>}</article>)}</div>}</section>

          <section><div className="flex items-center gap-2 mb-3"><Wrench size={16} className="text-gold" /><p className="eyebrow">Defects & rework</p></div>{defects.length === 0 ? <Empty text="No defect recorded." /> : <div className="space-y-3">{defects.map((row) => { const notes = reworkNotes[row.id] || { rootCause: row.root_cause || "", correctiveAction: row.corrective_action || "" }; return <article key={row.id} className={`border p-3 ${row.severity === "critical" ? "border-red-500/45" : row.severity === "major" ? "border-amber-500/35" : "border-border/60"}`}><div className="flex items-start justify-between gap-3"><div><p className="text-[9px] uppercase tracking-[0.14em] text-gold">{row.severity} · {row.defect_category} · Qty {row.quantity}</p><p className="text-sm mt-2">{row.description}</p>{row.location && <p className="text-xs text-muted-foreground mt-1">Location: {row.location}</p>}</div><StatusBadge value={row.rework_status} /></div><div className="grid sm:grid-cols-2 gap-2 mt-3"><Field label="Root cause" value={notes.rootCause} onChange={(value) => setReworkNotes((current) => ({ ...current, [row.id]: { ...notes, rootCause: value } }))} /><Field label="Corrective action" value={notes.correctiveAction} onChange={(value) => setReworkNotes((current) => ({ ...current, [row.id]: { ...notes, correctiveAction: value } }))} /></div><div className="mt-3 flex gap-2 overflow-x-auto">{REWORK_STATUSES.filter((status) => status !== row.rework_status).map((status) => <button key={status} type="button" onClick={() => void updateRework(row, status)} disabled={busy !== null} className="min-h-9 shrink-0 border border-border/60 px-3 text-[9px] uppercase tracking-[0.12em] hover:border-gold disabled:opacity-50">{status.replaceAll("_", " ")}</button>)}</div></article>; })}</div>}</section>
        </div>

        <div className="p-4 md:p-5 border-b border-border/60 grid xl:grid-cols-2 gap-4">
          <section className="border border-border/60 p-4"><div className="flex items-center gap-2"><FlaskConical size={16} className="text-gold" /><p className="eyebrow">Sample decision record</p></div><p className="text-xs text-muted-foreground mt-2">Buyer-facing statuses require explicit owner confirmation. This panel records evidence only and never sends a message.</p><div className="grid sm:grid-cols-2 gap-3 mt-4"><Field label="Sample round" type="number" value={sampleDraft.round} onChange={(value) => setSampleDraft((current) => ({ ...current, round: value }))} /><Select label="Status" value={sampleDraft.status} onChange={(value) => setSampleDraft((current) => ({ ...current, status: value as SampleApprovalStatus }))} options={SAMPLE_STATUSES} /><Select label="Decision source" value={sampleDraft.source} onChange={(value) => setSampleDraft((current) => ({ ...current, source: value as "internal" | "buyer" }))} options={["internal", "buyer"]} /><Field label="Decision reference" value={sampleDraft.decisionReference} onChange={(value) => setSampleDraft((current) => ({ ...current, decisionReference: value }))} /><Field label="Approved specification reference" value={sampleDraft.approvedSpecificationReference} onChange={(value) => setSampleDraft((current) => ({ ...current, approvedSpecificationReference: value }))} /><Field label="Notes / feedback" value={sampleDraft.notes} onChange={(value) => setSampleDraft((current) => ({ ...current, notes: value }))} /><button type="button" onClick={() => void recordSampleDecision()} disabled={busy !== null} className="sm:col-span-2 min-h-11 bg-gradient-gold text-primary-foreground text-[10px] uppercase tracking-[0.15em] disabled:opacity-50">{busy === "sample:save" ? "Saving…" : "Record sample decision"}</button></div><div className="mt-4 space-y-2">{samples.map((row) => <article key={row.id} className="border border-border/50 p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-[9px] uppercase tracking-[0.14em] text-gold">Round {row.sample_round} · {row.decision_source}</p><p className="font-display text-lg mt-1">{row.status.replaceAll("_", " ")}</p></div><StatusBadge value={row.owner_approved_at ? "owner reviewed" : "internal"} /></div>{row.approved_specification_reference && <p className="text-xs mt-2">Approved spec: {row.approved_specification_reference}</p>}{row.notes && <p className="text-xs text-foreground/60 mt-2 whitespace-pre-wrap">{row.notes}</p>}</article>)}</div></section>

          <section className="border border-border/60 p-4"><div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3"><div><div className="flex items-center gap-2"><FileCheck2 size={16} className="text-gold" /><p className="eyebrow">Private production evidence</p></div><p className="text-xs text-muted-foreground mt-2">Private bucket. Opening creates a five-minute signed URL. Uploaded files remain pending until verified.</p></div><button type="button" onClick={() => fileInput.current?.click()} disabled={busy !== null} className="min-h-11 inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-4 text-[10px] uppercase tracking-[0.14em] disabled:opacity-50"><UploadCloud size={14} /> {busy === "evidence:upload" ? "Uploading…" : "Upload"}</button><input ref={fileInput} type="file" className="hidden" accept="image/jpeg,image/png,image/webp,application/pdf,text/csv,.xlsx" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadEvidence(file); event.target.value = ""; }} /></div><div className="grid sm:grid-cols-2 gap-3 mt-4"><Select label="Evidence type" value={evidenceDraft.type} onChange={(value) => setEvidenceDraft((current) => ({ ...current, type: value as EvidenceType }))} options={EVIDENCE_TYPES} /><Select label="Inspection link" value={evidenceDraft.inspectionId} onChange={(value) => setEvidenceDraft((current) => ({ ...current, inspectionId: value }))} options={inspections.map((row) => row.id)} optionLabel={(value) => inspections.find((row) => row.id === value)?.inspection_number || value} placeholder="No inspection link" /><Select label="Defect link" value={evidenceDraft.defectId} onChange={(value) => setEvidenceDraft((current) => ({ ...current, defectId: value }))} options={defects.map((row) => row.id)} optionLabel={(value) => defects.find((row) => row.id === value)?.description.slice(0, 40) || value} placeholder="No defect link" /><Select label="Sample link" value={evidenceDraft.sampleApprovalId} onChange={(value) => setEvidenceDraft((current) => ({ ...current, sampleApprovalId: value }))} options={samples.map((row) => row.id)} optionLabel={(value) => { const row = samples.find((item) => item.id === value); return row ? `Round ${row.sample_round} · ${row.status}` : value; }} placeholder="No sample link" /><div className="sm:col-span-2"><Field label="Evidence note" value={evidenceDraft.note} onChange={(value) => setEvidenceDraft((current) => ({ ...current, note: value }))} /></div></div><div className="mt-4 space-y-2 max-h-[520px] overflow-y-auto">{evidence.length === 0 ? <Empty text="No private evidence file uploaded." /> : evidence.map((row) => <article key={row.id} className="border border-border/50 p-3"><div className="flex items-start gap-3"><FileCheck2 size={18} className="text-gold shrink-0 mt-0.5" /><div className="flex-1 min-w-0"><p className="truncate">{row.file_name}</p><p className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground mt-1">{row.evidence_type.replaceAll("_", " ")} · {(row.size_bytes / 1024 / 1024).toFixed(2)} MB · {row.verification_status}</p>{row.evidence_note && <p className="text-xs text-foreground/60 mt-1">{row.evidence_note}</p>}{row.checksum_sha256 && <code className="block text-[9px] text-foreground/35 mt-1 truncate">SHA-256 {row.checksum_sha256}</code>}</div></div><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => void openEvidence(row)} className="min-h-9 inline-flex items-center gap-2 border border-border/60 px-3 text-[9px] uppercase tracking-[0.12em]"><Download size={12} /> Open 5 min</button>{row.verification_status === "pending" && <><button type="button" onClick={() => void verifyEvidence(row, "verified")} disabled={busy !== null} className="min-h-9 inline-flex items-center gap-2 border border-emerald-500/40 text-emerald-300 px-3 text-[9px] uppercase tracking-[0.12em]"><CheckCircle2 size={12} /> Verify</button><button type="button" onClick={() => void verifyEvidence(row, "rejected")} disabled={busy !== null} className="min-h-9 inline-flex items-center gap-2 border border-red-500/40 text-red-300 px-3 text-[9px] uppercase tracking-[0.12em]"><XCircle size={12} /> Reject</button></>}</div></article>)}</div></section>
        </div>

        <div className="p-4 md:p-5 grid lg:grid-cols-[minmax(0,1fr)_auto] gap-4 items-start">
          <div className={`border p-4 ${clientReadiness?.ready ? "border-emerald-500/35 bg-emerald-500/[0.04]" : "border-amber-500/35 bg-amber-500/[0.04]"}`}><div className="flex items-start gap-3">{clientReadiness?.ready ? <CheckCircle2 size={18} className="text-emerald-300 mt-0.5" /> : <AlertTriangle size={18} className="text-amber-300 mt-0.5" />}<div><p className="text-[10px] uppercase tracking-[0.15em] text-gold">Internal QC release readiness</p><p className="font-display text-xl mt-1">{serverReadiness ? (serverReadiness.ready ? "Server check ready" : "Server check blocked") : clientReadiness?.ready ? "Client evidence appears ready" : "Evidence blockers remain"}</p><p className="text-xs text-foreground/60 mt-2">{(serverReadiness?.blockers || clientReadiness?.blockers || []).length ? (serverReadiness?.blockers || clientReadiness?.blockers || []).join(" · ") : "No deterministic blocker detected. Owner approval is still required."}</p></div></div></div>
          <div className="flex flex-col gap-2 min-w-[220px]"><button type="button" onClick={() => void checkReadiness()} disabled={busy !== null} className="min-h-11 inline-flex items-center justify-center gap-2 border border-gold/50 text-gold px-4 text-[10px] uppercase tracking-[0.14em] disabled:opacity-50">{busy === "readiness" ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />} Run server check</button><button type="button" onClick={() => void ownerCloseQc()} disabled={busy !== null || !(serverReadiness?.ready || selected.quality_release_status === "ready_for_owner_review")} className="min-h-11 inline-flex items-center justify-center gap-2 bg-gradient-gold text-primary-foreground px-4 text-[10px] uppercase tracking-[0.14em] disabled:opacity-40">{busy === "owner-close" ? <Loader2 size={13} className="animate-spin" /> : <FileCheck2 size={13} />} Owner approve QC release</button></div>
        </div>
      </>}
    </section>
  );
}

function Metric({ label, value, attention = false }: { label: string; value: number; attention?: boolean }) {
  return <div className="p-4 border-r border-b md:border-b-0 border-border/60 last:border-r-0"><p className={`font-display text-2xl ${attention ? "text-amber-300" : "text-foreground"}`}>{value.toLocaleString()}</p><p className="text-[9px] uppercase tracking-[0.13em] text-muted-foreground mt-1">{label}</p></div>;
}

function Mini({ label, value }: { label: string; value: number | string }) {
  return <div className="border border-border/50 p-3"><p className="text-[8px] uppercase tracking-[0.11em] text-muted-foreground">{label}</p><p className="font-display text-lg mt-1">{typeof value === "number" ? value.toLocaleString() : value}</p></div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><p className="text-[8px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p><p className="text-sm mt-1 truncate capitalize">{value.replaceAll("_", " ")}</p></div>;
}

function StatusBadge({ value }: { value: string }) {
  const positive = ["passed", "approved", "verified", "closed", "clear", "owner reviewed"].includes(value);
  const negative = ["failed", "rejected", "blocked", "critical"].includes(value);
  return <span className={`shrink-0 border px-2 py-1 text-[8px] uppercase tracking-[0.11em] ${positive ? "border-emerald-500/35 text-emerald-300" : negative ? "border-red-500/35 text-red-300" : "border-border/60 text-muted-foreground"}`}>{value.replaceAll("_", " ")}</span>;
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="block"><span className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">{label}</span><input type={type} value={value} min={type === "number" ? 0 : undefined} onChange={(event) => onChange(event.target.value)} className={`${FIELD} mt-1`} /></label>;
}

function Select({ label, value, onChange, options, optionLabel, placeholder }: { label: string; value: string; onChange: (value: string) => void; options: readonly string[]; optionLabel?: (value: string) => string; placeholder?: string }) {
  return <label className="block"><span className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className={`${FIELD} mt-1`}>{placeholder !== undefined && <option value="">{placeholder}</option>}{options.map((option) => <option key={option} value={option}>{optionLabel ? optionLabel(option) : option.replaceAll("_", " ")}</option>)}</select></label>;
}

function Empty({ text }: { text: string }) {
  return <div className="border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">{text}</div>;
}

function Loading() {
  return <div className="border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground"><Loader2 size={15} className="animate-spin mx-auto mb-2" /> Loading…</div>;
}
