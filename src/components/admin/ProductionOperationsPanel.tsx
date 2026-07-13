import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  Factory,
  Gauge,
  ListTodo,
  Loader2,
  LockKeyhole,
  PackagePlus,
  Plus,
  RefreshCw,
  ShieldCheck,
  TimerReset,
  Wrench,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  dateState,
  jobReleaseReadiness,
  materialCoveragePercent,
  operationProgress,
  productionRisk,
  type MaterialProcurementStatus,
  type ProductionOperationStatus,
  type ProductionTaskStatus,
} from "@/lib/productionOperations";

const db = supabase as any;
const MIGRATION = "supabase/migrations/20260713213000_production_operations_control.sql";
const FIELD = "min-h-11 w-full border border-border/60 bg-background px-3 text-sm outline-none focus:border-gold";

const MATERIAL_STATUSES: MaterialProcurementStatus[] = ["not_ordered", "quoted", "ordered", "partial", "available", "blocked"];
const OPERATION_STATUSES: ProductionOperationStatus[] = ["planned", "ready", "in_progress", "blocked", "qc_hold", "completed", "skipped"];
const TASK_STATUSES: ProductionTaskStatus[] = ["open", "in_progress", "blocked", "done", "cancelled"];
const STAGES = ["briefing", "spec_locked", "material_sourcing", "cutting", "printing_embroidery", "stitching", "finishing", "qc", "packing", "ready_to_ship", "shipped", "buyer_approved", "completed"];
const MATERIAL_CATEGORIES = ["fabric", "leather", "lining", "thread", "zipper", "button", "label", "packaging", "trim", "print", "embroidery", "other"];

interface SummaryRow {
  production_job_id: string;
  job_number: string;
  job_type: "sample" | "order";
  buyer_name: string;
  company_name: string | null;
  product_name: string;
  quantity_text: string;
  specification_reference: string;
  stage: string;
  priority: string;
  internal_target_date: string | null;
  internal_ship_target: string | null;
  production_plan_status: string;
  risk_level: "clear" | "attention" | "blocked";
  completion_percent: number;
  released_at: string | null;
  material_count: number;
  critical_shortages: number;
  total_shortages: number;
  operation_count: number;
  completed_operations: number;
  blocked_operations: number;
  open_tasks: number;
  blocked_tasks: number;
  overdue_tasks: number;
  updated_at: string;
}

interface MaterialRow {
  id: string;
  production_job_id: string;
  material_code: string | null;
  material_name: string;
  material_category: string;
  specification: string | null;
  required_quantity: number;
  available_quantity: number;
  unit: string;
  critical: boolean;
  procurement_status: MaterialProcurementStatus;
  supplier_reference: string | null;
  expected_date: string | null;
  blocker_note: string | null;
  notes: string | null;
}

interface OperationRow {
  id: string;
  production_job_id: string;
  sequence_no: number;
  operation_name: string;
  stage: string;
  work_center: string | null;
  planned_start: string | null;
  planned_end: string | null;
  status: ProductionOperationStatus;
  blocker_note: string | null;
  evidence_required: boolean;
}

interface TaskRow {
  id: string;
  production_job_id: string;
  operation_id: string | null;
  title: string;
  description: string | null;
  priority: "low" | "normal" | "high" | "urgent";
  status: ProductionTaskStatus;
  due_at: string | null;
  blocker_note: string | null;
  evidence_required: boolean;
}

type MaterialDraft = {
  name: string;
  category: string;
  specification: string;
  required: string;
  available: string;
  unit: string;
  critical: boolean;
  status: MaterialProcurementStatus;
  expectedDate: string;
};

type OperationDraft = {
  sequence: string;
  name: string;
  stage: string;
  workCenter: string;
  plannedStart: string;
  plannedEnd: string;
  evidenceRequired: boolean;
};

type TaskDraft = {
  title: string;
  description: string;
  priority: TaskRow["priority"];
  dueAt: string;
  evidenceRequired: boolean;
};

const EMPTY_MATERIAL: MaterialDraft = { name: "", category: "fabric", specification: "", required: "", available: "0", unit: "m", critical: true, status: "not_ordered", expectedDate: "" };
const EMPTY_OPERATION: OperationDraft = { sequence: "10", name: "", stage: "material_sourcing", workCenter: "", plannedStart: "", plannedEnd: "", evidenceRequired: false };
const EMPTY_TASK: TaskDraft = { title: "", description: "", priority: "normal", dueAt: "", evidenceRequired: false };

export default function ProductionOperationsPanel() {
  const [jobs, setJobs] = useState<SummaryRow[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [operations, setOperations] = useState<OperationRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [releaseCheck, setReleaseCheck] = useState<{ ready: boolean; missing: string[] } | null>(null);
  const [materialDraft, setMaterialDraft] = useState<MaterialDraft>(EMPTY_MATERIAL);
  const [operationDraft, setOperationDraft] = useState<OperationDraft>(EMPTY_OPERATION);
  const [taskDraft, setTaskDraft] = useState<TaskDraft>(EMPTY_TASK);
  const [materialEdits, setMaterialEdits] = useState<Record<string, { available: string; status: MaterialProcurementStatus }>>({});

  const loadJobs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await db.from("production_control_summary").select("*").order("updated_at", { ascending: false }).limit(500);
    if (error) {
      setBackendError(error.message || "Production control backend unavailable");
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
      setMaterials([]);
      setOperations([]);
      setTasks([]);
      return;
    }
    setDetailsLoading(true);
    const [materialResult, operationResult, taskResult] = await Promise.all([
      db.from("production_material_requirements").select("*").eq("production_job_id", jobId).order("critical", { ascending: false }).order("material_name"),
      db.from("production_operations").select("*").eq("production_job_id", jobId).order("sequence_no"),
      db.from("production_tasks").select("*").eq("production_job_id", jobId).order("priority", { ascending: false }).order("due_at", { ascending: true }),
    ]);
    const error = materialResult.error || operationResult.error || taskResult.error;
    if (error) {
      toast({ title: "Production details could not load", description: error.message, variant: "destructive" });
      setDetailsLoading(false);
      return;
    }
    const materialRows = (materialResult.data || []) as MaterialRow[];
    setMaterials(materialRows);
    setOperations((operationResult.data || []) as OperationRow[]);
    setTasks((taskResult.data || []) as TaskRow[]);
    setMaterialEdits(Object.fromEntries(materialRows.map((row) => [row.id, { available: String(row.available_quantity), status: row.procurement_status }])));
    setReleaseCheck(null);
    setDetailsLoading(false);
  }, []);

  useEffect(() => { void loadJobs(); }, [loadJobs]);
  useEffect(() => { void loadDetails(selectedId); }, [loadDetails, selectedId]);

  const selected = useMemo(() => jobs.find((row) => row.production_job_id === selectedId) || null, [jobs, selectedId]);
  const clientMaterials = useMemo(() => materials.map((row) => ({
    requiredQuantity: Number(row.required_quantity),
    availableQuantity: Number(materialEdits[row.id]?.available ?? row.available_quantity),
    critical: row.critical,
    status: materialEdits[row.id]?.status ?? row.procurement_status,
    expectedDate: row.expected_date,
  })), [materialEdits, materials]);
  const clientOperations = useMemo(() => operations.map((row) => ({ status: row.status, plannedEnd: row.planned_end })), [operations]);
  const clientTasks = useMemo(() => tasks.map((row) => ({ status: row.status, dueAt: row.due_at })), [tasks]);
  const readiness = useMemo(() => jobReleaseReadiness({
    specificationReference: selected?.specification_reference,
    materials: clientMaterials,
    operations: clientOperations,
    tasks: clientTasks,
  }), [clientMaterials, clientOperations, clientTasks, selected?.specification_reference]);
  const risk = useMemo(() => productionRisk({
    materials: clientMaterials,
    operations: clientOperations,
    tasks: clientTasks,
    targetDate: selected?.internal_target_date,
  }), [clientMaterials, clientOperations, clientTasks, selected?.internal_target_date]);
  const progress = useMemo(() => operationProgress(clientOperations), [clientOperations]);
  const stats = useMemo(() => ({
    active: jobs.filter((row) => !["completed", "cancelled"].includes(row.production_plan_status)).length,
    blocked: jobs.filter((row) => row.risk_level === "blocked").length,
    shortages: jobs.reduce((sum, row) => sum + Number(row.total_shortages || 0), 0),
    overdueTasks: jobs.reduce((sum, row) => sum + Number(row.overdue_tasks || 0), 0),
  }), [jobs]);

  const logEvent = async (jobId: string, eventType: string, fromValue: string | null, toValue: string | null, note: string, evidence: Record<string, unknown> = {}) => {
    await db.from("production_job_events").insert({ production_job_id: jobId, event_type: eventType, from_value: fromValue, to_value: toValue, note, evidence });
  };

  const refreshAll = async () => {
    await loadJobs();
    await loadDetails(selectedId);
  };

  const addMaterial = async () => {
    if (!selected || !materialDraft.name.trim() || Number(materialDraft.required) <= 0) {
      toast({ title: "Material name and required quantity are required", variant: "destructive" });
      return;
    }
    setBusy("material:add");
    const payload = {
      production_job_id: selected.production_job_id,
      material_name: materialDraft.name.trim(),
      material_category: materialDraft.category,
      specification: materialDraft.specification.trim() || null,
      required_quantity: Number(materialDraft.required),
      available_quantity: Math.max(0, Number(materialDraft.available || 0)),
      unit: materialDraft.unit.trim() || "pcs",
      critical: materialDraft.critical,
      procurement_status: materialDraft.status,
      expected_date: materialDraft.expectedDate || null,
    };
    const { error } = await db.from("production_material_requirements").insert(payload);
    if (!error) await logEvent(selected.production_job_id, "material_updated", null, materialDraft.status, `Material requirement added: ${materialDraft.name.trim()}.`, { required_quantity: payload.required_quantity, available_quantity: payload.available_quantity, unit: payload.unit, buyer_notification_sent: false });
    setBusy(null);
    if (error) {
      toast({ title: "Material was not added", description: error.message, variant: "destructive" });
      return;
    }
    setMaterialDraft(EMPTY_MATERIAL);
    toast({ title: "Material requirement added", description: "Internal BOM updated. No buyer notification sent." });
    await refreshAll();
  };

  const saveMaterial = async (row: MaterialRow) => {
    const edit = materialEdits[row.id];
    if (!edit || Number(edit.available) < 0) return;
    setBusy(`material:${row.id}`);
    const { error } = await db.from("production_material_requirements").update({ available_quantity: Number(edit.available || 0), procurement_status: edit.status }).eq("id", row.id);
    if (!error) await logEvent(row.production_job_id, "material_updated", row.procurement_status, edit.status, `Material availability updated: ${row.material_name}.`, { previous_available: row.available_quantity, available_quantity: Number(edit.available || 0), buyer_notification_sent: false });
    setBusy(null);
    if (error) toast({ title: "Material update failed", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Material updated" });
      await refreshAll();
    }
  };

  const addOperation = async () => {
    if (!selected || !operationDraft.name.trim() || Number(operationDraft.sequence) <= 0) {
      toast({ title: "Operation sequence and name are required", variant: "destructive" });
      return;
    }
    setBusy("operation:add");
    const payload = {
      production_job_id: selected.production_job_id,
      sequence_no: Number(operationDraft.sequence),
      operation_name: operationDraft.name.trim(),
      stage: operationDraft.stage,
      work_center: operationDraft.workCenter.trim() || null,
      planned_start: operationDraft.plannedStart ? new Date(operationDraft.plannedStart).toISOString() : null,
      planned_end: operationDraft.plannedEnd ? new Date(operationDraft.plannedEnd).toISOString() : null,
      evidence_required: operationDraft.evidenceRequired,
    };
    const { error } = await db.from("production_operations").insert(payload);
    if (!error) await logEvent(selected.production_job_id, "operation_updated", null, "planned", `Operation added: ${operationDraft.name.trim()}.`, { sequence_no: payload.sequence_no, stage: payload.stage, buyer_notification_sent: false });
    setBusy(null);
    if (error) {
      toast({ title: "Operation was not added", description: error.message, variant: "destructive" });
      return;
    }
    setOperationDraft((current) => ({ ...EMPTY_OPERATION, sequence: String(Number(current.sequence || 0) + 10) }));
    toast({ title: "Production operation added" });
    await refreshAll();
  };

  const updateOperation = async (row: OperationRow, status: ProductionOperationStatus) => {
    const blocker = status === "blocked" ? window.prompt("Internal blocker note (required):", row.blocker_note || "") : null;
    if (status === "blocked" && !blocker?.trim()) return;
    setBusy(`operation:${row.id}`);
    const update: Record<string, unknown> = { status, blocker_note: status === "blocked" ? blocker!.trim() : null };
    if (status === "in_progress" && !row.planned_start) update.actual_start = new Date().toISOString();
    if (["completed", "skipped"].includes(status)) update.actual_end = new Date().toISOString();
    const { error } = await db.from("production_operations").update(update).eq("id", row.id);
    if (!error) await logEvent(row.production_job_id, "operation_updated", row.status, status, `Operation status updated: ${row.operation_name}.`, { blocker_note: update.blocker_note, buyer_notification_sent: false });
    setBusy(null);
    if (error) toast({ title: "Operation update failed", description: error.message, variant: "destructive" });
    else await refreshAll();
  };

  const addTask = async () => {
    if (!selected || !taskDraft.title.trim()) {
      toast({ title: "Task title is required", variant: "destructive" });
      return;
    }
    setBusy("task:add");
    const payload = {
      production_job_id: selected.production_job_id,
      title: taskDraft.title.trim(),
      description: taskDraft.description.trim() || null,
      priority: taskDraft.priority,
      due_at: taskDraft.dueAt ? new Date(taskDraft.dueAt).toISOString() : null,
      evidence_required: taskDraft.evidenceRequired,
    };
    const { error } = await db.from("production_tasks").insert(payload);
    if (!error) await logEvent(selected.production_job_id, "task_updated", null, "open", `Internal task added: ${taskDraft.title.trim()}.`, { due_at: payload.due_at, buyer_notification_sent: false });
    setBusy(null);
    if (error) {
      toast({ title: "Task was not added", description: error.message, variant: "destructive" });
      return;
    }
    setTaskDraft(EMPTY_TASK);
    toast({ title: "Internal task added" });
    await refreshAll();
  };

  const updateTask = async (row: TaskRow, status: ProductionTaskStatus) => {
    const blocker = status === "blocked" ? window.prompt("Internal blocker note (required):", row.blocker_note || "") : null;
    if (status === "blocked" && !blocker?.trim()) return;
    setBusy(`task:${row.id}`);
    const update: Record<string, unknown> = { status, blocker_note: status === "blocked" ? blocker!.trim() : null };
    if (status === "done") {
      update.completed_at = new Date().toISOString();
      const { data: auth } = await supabase.auth.getUser();
      update.completed_by = auth.user?.id || null;
    } else {
      update.completed_at = null;
      update.completed_by = null;
    }
    const { error } = await db.from("production_tasks").update(update).eq("id", row.id);
    if (!error) await logEvent(row.production_job_id, "task_updated", row.status, status, `Internal task updated: ${row.title}.`, { blocker_note: update.blocker_note, buyer_notification_sent: false });
    setBusy(null);
    if (error) toast({ title: "Task update failed", description: error.message, variant: "destructive" });
    else await refreshAll();
  };

  const verifyRelease = async () => {
    if (!selected) return;
    setBusy("release:check");
    const { data, error } = await db.rpc("production_release_readiness", { _job_id: selected.production_job_id });
    setBusy(null);
    if (error) {
      toast({ title: "Release check failed", description: error.message, variant: "destructive" });
      return;
    }
    const result = data as { ready: boolean; missing?: string[] };
    setReleaseCheck({ ready: Boolean(result.ready), missing: Array.isArray(result.missing) ? result.missing : [] });
    toast({ title: result.ready ? "Production plan is release-ready" : "Production plan is not ready", description: result.ready ? "Owner may now approve the internal release." : `Missing: ${(result.missing || []).join(", ")}`, variant: result.ready ? "default" : "destructive" });
  };

  const releaseJob = async () => {
    if (!selected || !readiness.ready) return;
    if (!window.confirm("Owner approval required: release this plan for internal production? This does not notify the buyer or promise a delivery date.")) return;
    const note = window.prompt("Optional owner release note:", "Owner approved internal production release. No buyer notification sent.") || "";
    setBusy("release:execute");
    const { error } = await db.rpc("production_release_job", { _job_id: selected.production_job_id, _owner_note: note });
    setBusy(null);
    if (error) {
      toast({ title: "Production release failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `${selected.job_number} released internally`, description: "Buyer was not notified." });
    await refreshAll();
  };

  if (loading && jobs.length === 0) return <div className="py-10 text-center text-sm text-muted-foreground">Loading Production Control Center…</div>;

  if (backendError) {
    return (
      <section className="border border-amber-500/35 bg-amber-500/[0.05] p-6 md:p-8 mb-6">
        <div className="flex items-start gap-4">
          <AlertTriangle size={22} className="text-amber-300 shrink-0 mt-1" />
          <div>
            <p className="eyebrow mb-2">Phase 6.1 · Production Control Center</p>
            <h2 className="font-display text-2xl md:text-3xl">Backend activation pending</h2>
            <p className="text-sm text-foreground/65 mt-3 max-w-3xl leading-relaxed">The material plan, operation routing, tasks, blockers and release controls are code-ready. No database was changed. Apply the prepared migration only during the final one-time backend activation.</p>
            <code className="mt-4 block text-xs text-amber-200 break-all">{MIGRATION}</code>
            <p className="mt-3 text-xs text-foreground/45 break-all">Runtime evidence: {backendError}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="border border-gold/35 bg-card/20 mb-6">
      <header className="p-4 sm:p-5 md:p-6 border-b border-border/60 flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
        <div className="flex items-start gap-3">
          <Factory size={22} className="text-gold shrink-0 mt-1" />
          <div>
            <p className="eyebrow mb-2">Phase 6.1</p>
            <h2 className="font-display text-2xl md:text-4xl">Production Control Center</h2>
            <p className="text-sm text-foreground/65 mt-3 max-w-4xl leading-relaxed">Plan materials, factory operations and internal tasks before releasing a sample or order. Internal dates are planning targets only. Buyer notifications and delivery commitments stay owner-controlled.</p>
          </div>
        </div>
        <button type="button" onClick={() => void refreshAll()} disabled={loading || detailsLoading || busy !== null} className="min-h-11 inline-flex items-center justify-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.15em] hover:border-gold disabled:opacity-50"><RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh</button>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 border-b border-border/60">
        <Metric label="Active plans" value={stats.active} icon={<ClipboardCheck size={15} />} />
        <Metric label="Blocked plans" value={stats.blocked} attention={stats.blocked > 0} icon={<LockKeyhole size={15} />} />
        <Metric label="Material shortages" value={stats.shortages} attention={stats.shortages > 0} icon={<Boxes size={15} />} />
        <Metric label="Overdue tasks" value={stats.overdueTasks} attention={stats.overdueTasks > 0} icon={<TimerReset size={15} />} />
      </div>

      <div className="p-4 sm:p-5 border-b border-border/60">
        <label className="block text-[9px] uppercase tracking-[0.14em] text-muted-foreground mb-2">Select sample or order</label>
        <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className={FIELD}>
          {jobs.length === 0 && <option value="">No production jobs yet</option>}
          {jobs.map((job) => <option key={job.production_job_id} value={job.production_job_id}>{job.job_number} · {job.buyer_name} · {job.product_name} · {job.production_plan_status}</option>)}
        </select>
      </div>

      {!selected ? <Empty text="Create a sample or order job in the workflow below, then return here to build its material and operation plan." /> : (
        <>
          <div className="p-4 sm:p-5 border-b border-border/60 grid xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)] gap-4">
            <div>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div><p className="text-[9px] uppercase tracking-[0.15em] text-gold">{selected.job_number} · {selected.job_type}</p><h3 className="font-display text-2xl mt-1">{selected.product_name}</h3><p className="text-xs text-muted-foreground mt-1">{selected.buyer_name}{selected.company_name ? ` · ${selected.company_name}` : ""} · {selected.quantity_text}</p></div>
                <span className={`border px-3 py-2 text-[9px] uppercase tracking-[0.12em] ${risk.level === "blocked" ? "border-red-500/40 text-red-300" : risk.level === "attention" ? "border-amber-500/40 text-amber-300" : "border-emerald-500/40 text-emerald-300"}`}>{risk.level}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4"><Mini label="Operations" value={`${operations.length}`} /><Mini label="Progress" value={`${progress}%`} /><Mini label="Materials" value={`${materials.length}`} /><Mini label="Open tasks" value={`${tasks.filter((task) => !["done", "cancelled"].includes(task.status)).length}`} /></div>
              <div className="mt-4 h-2 bg-muted/50 overflow-hidden"><div className="h-full bg-gold transition-all" style={{ width: `${progress}%` }} /></div>
              {risk.reasons.length > 0 && <div className="mt-3 text-xs text-foreground/60">Attention: {risk.reasons.join(" · ")}</div>}
            </div>
            <div className={`border p-4 ${readiness.ready ? "border-emerald-500/35 bg-emerald-500/[0.04]" : "border-amber-500/35 bg-amber-500/[0.04]"}`}>
              <div className="flex items-start gap-3">{readiness.ready ? <ShieldCheck size={18} className="text-emerald-300 shrink-0" /> : <AlertTriangle size={18} className="text-amber-300 shrink-0" />}<div><p className="text-[9px] uppercase tracking-[0.14em] text-gold">Internal release readiness</p><p className="font-display text-xl mt-1">{readiness.ready ? "Ready for owner approval" : "Plan is incomplete"}</p><p className="text-xs text-foreground/60 mt-2">{readiness.ready ? "All deterministic release checks pass. This is not a buyer delivery promise." : `Missing: ${readiness.missing.join(", ")}`}</p></div></div>
              {releaseCheck && <p className={`mt-3 text-xs ${releaseCheck.ready ? "text-emerald-300" : "text-amber-300"}`}>Server check: {releaseCheck.ready ? "ready" : `missing ${releaseCheck.missing.join(", ")}`}</p>}
              <div className="grid grid-cols-2 gap-2 mt-4"><button type="button" onClick={() => void verifyRelease()} disabled={busy !== null} className="min-h-10 border border-border/60 text-[9px] uppercase tracking-[0.12em] disabled:opacity-50">{busy === "release:check" ? "Checking…" : "Verify server"}</button><button type="button" onClick={() => void releaseJob()} disabled={!readiness.ready || busy !== null || selected.production_plan_status === "released"} className="min-h-10 bg-gradient-gold text-primary-foreground text-[9px] uppercase tracking-[0.12em] disabled:opacity-40">{busy === "release:execute" ? "Releasing…" : selected.production_plan_status === "released" ? "Released" : "Owner release"}</button></div>
            </div>
          </div>

          {detailsLoading ? <div className="p-10 text-center text-sm text-muted-foreground"><Loader2 size={18} className="animate-spin mx-auto mb-2" /> Loading plan…</div> : (
            <div className="grid 2xl:grid-cols-3 gap-0">
              <PlanColumn title="Material plan / BOM" icon={<Boxes size={17} />} count={materials.length}>
                <details className="border border-border/50 mb-3 group"><summary className="cursor-pointer list-none p-3 text-[9px] uppercase tracking-[0.13em] text-gold inline-flex items-center gap-2"><PackagePlus size={13} /> Add material</summary><div className="p-3 pt-0 grid grid-cols-2 gap-2"><Field label="Material name *" value={materialDraft.name} onChange={(value) => setMaterialDraft((current) => ({ ...current, name: value }))} span /><Select label="Category" value={materialDraft.category} options={MATERIAL_CATEGORIES} onChange={(value) => setMaterialDraft((current) => ({ ...current, category: value }))} /><Field label="Specification" value={materialDraft.specification} onChange={(value) => setMaterialDraft((current) => ({ ...current, specification: value }))} /><Field label="Required *" type="number" value={materialDraft.required} onChange={(value) => setMaterialDraft((current) => ({ ...current, required: value }))} /><Field label="Available" type="number" value={materialDraft.available} onChange={(value) => setMaterialDraft((current) => ({ ...current, available: value }))} /><Field label="Unit" value={materialDraft.unit} onChange={(value) => setMaterialDraft((current) => ({ ...current, unit: value }))} /><Select label="Status" value={materialDraft.status} options={MATERIAL_STATUSES} onChange={(value) => setMaterialDraft((current) => ({ ...current, status: value as MaterialProcurementStatus }))} /><Field label="Expected date" type="date" value={materialDraft.expectedDate} onChange={(value) => setMaterialDraft((current) => ({ ...current, expectedDate: value }))} /><label className="col-span-2 inline-flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={materialDraft.critical} onChange={(event) => setMaterialDraft((current) => ({ ...current, critical: event.target.checked }))} /> Critical for production release</label><button type="button" onClick={() => void addMaterial()} disabled={busy !== null} className="col-span-2 min-h-10 bg-gradient-gold text-primary-foreground text-[9px] uppercase tracking-[0.12em] disabled:opacity-50">{busy === "material:add" ? "Adding…" : "Add material requirement"}</button></div></details>
                {materials.length === 0 ? <Empty text="No material requirements." compact /> : materials.map((row) => { const edit = materialEdits[row.id] || { available: String(row.available_quantity), status: row.procurement_status }; const coverage = materialCoveragePercent(Number(row.required_quantity), Number(edit.available)); return <article key={row.id} className="border border-border/50 p-3 mb-2"><div className="flex items-start justify-between gap-2"><div><p className="text-[8px] uppercase tracking-[0.12em] text-gold">{row.material_category}{row.critical ? " · critical" : ""}</p><h4 className="font-medium text-sm mt-1">{row.material_name}</h4><p className="text-[10px] text-muted-foreground mt-1">Required {row.required_quantity} {row.unit} · coverage {coverage}%</p></div><span className={`text-[8px] uppercase ${coverage < 100 && row.critical ? "text-red-300" : "text-muted-foreground"}`}>{edit.status.replace(/_/g, " ")}</span></div><div className="grid grid-cols-[1fr_1.3fr_auto] gap-2 mt-3"><input aria-label={`Available ${row.material_name}`} type="number" min="0" value={edit.available} onChange={(event) => setMaterialEdits((current) => ({ ...current, [row.id]: { ...edit, available: event.target.value } }))} className={`${FIELD} min-w-0`} /><select aria-label={`Status ${row.material_name}`} value={edit.status} onChange={(event) => setMaterialEdits((current) => ({ ...current, [row.id]: { ...edit, status: event.target.value as MaterialProcurementStatus } }))} className={`${FIELD} min-w-0`}>{MATERIAL_STATUSES.map((status) => <option key={status} value={status}>{status.replace(/_/g, " ")}</option>)}</select><button type="button" onClick={() => void saveMaterial(row)} disabled={busy !== null} className="min-h-11 border border-gold/50 px-3 text-[9px] uppercase text-gold disabled:opacity-50">Save</button></div></article>; })}
              </PlanColumn>

              <PlanColumn title="Factory operations" icon={<Wrench size={17} />} count={operations.length}>
                <details className="border border-border/50 mb-3 group"><summary className="cursor-pointer list-none p-3 text-[9px] uppercase tracking-[0.13em] text-gold inline-flex items-center gap-2"><Plus size={13} /> Add operation</summary><div className="p-3 pt-0 grid grid-cols-2 gap-2"><Field label="Sequence *" type="number" value={operationDraft.sequence} onChange={(value) => setOperationDraft((current) => ({ ...current, sequence: value }))} /><Field label="Operation name *" value={operationDraft.name} onChange={(value) => setOperationDraft((current) => ({ ...current, name: value }))} /><Select label="Stage" value={operationDraft.stage} options={STAGES} onChange={(value) => setOperationDraft((current) => ({ ...current, stage: value }))} /><Field label="Work center" value={operationDraft.workCenter} onChange={(value) => setOperationDraft((current) => ({ ...current, workCenter: value }))} /><Field label="Planned start" type="datetime-local" value={operationDraft.plannedStart} onChange={(value) => setOperationDraft((current) => ({ ...current, plannedStart: value }))} /><Field label="Planned end" type="datetime-local" value={operationDraft.plannedEnd} onChange={(value) => setOperationDraft((current) => ({ ...current, plannedEnd: value }))} /><label className="col-span-2 inline-flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={operationDraft.evidenceRequired} onChange={(event) => setOperationDraft((current) => ({ ...current, evidenceRequired: event.target.checked }))} /> Completion evidence required</label><button type="button" onClick={() => void addOperation()} disabled={busy !== null} className="col-span-2 min-h-10 bg-gradient-gold text-primary-foreground text-[9px] uppercase tracking-[0.12em] disabled:opacity-50">{busy === "operation:add" ? "Adding…" : "Add production operation"}</button></div></details>
                {operations.length === 0 ? <Empty text="No operation routing." compact /> : operations.map((row) => <article key={row.id} className="border border-border/50 p-3 mb-2"><div className="flex items-start justify-between gap-2"><div><p className="text-[8px] uppercase tracking-[0.12em] text-gold">#{row.sequence_no} · {row.stage.replace(/_/g, " ")}</p><h4 className="font-medium text-sm mt-1">{row.operation_name}</h4><p className="text-[10px] text-muted-foreground mt-1">{row.work_center || "Work center not assigned"}{row.planned_end ? ` · ${dateState(row.planned_end).replace(/_/g, " ")}` : ""}</p></div>{row.evidence_required && <span className="text-[8px] uppercase text-amber-300">evidence</span>}</div>{row.blocker_note && <p className="text-[10px] text-red-300 mt-2">Blocker: {row.blocker_note}</p>}<select aria-label={`Operation status ${row.operation_name}`} value={row.status} onChange={(event) => void updateOperation(row, event.target.value as ProductionOperationStatus)} disabled={busy !== null} className={`${FIELD} mt-3`}>{OPERATION_STATUSES.map((status) => <option key={status} value={status}>{status.replace(/_/g, " ")}</option>)}</select></article>)}
              </PlanColumn>

              <PlanColumn title="Internal tasks & blockers" icon={<ListTodo size={17} />} count={tasks.length}>
                <details className="border border-border/50 mb-3 group"><summary className="cursor-pointer list-none p-3 text-[9px] uppercase tracking-[0.13em] text-gold inline-flex items-center gap-2"><Plus size={13} /> Add task</summary><div className="p-3 pt-0 grid grid-cols-2 gap-2"><Field label="Task title *" value={taskDraft.title} onChange={(value) => setTaskDraft((current) => ({ ...current, title: value }))} span /><Field label="Description" value={taskDraft.description} onChange={(value) => setTaskDraft((current) => ({ ...current, description: value }))} span /><Select label="Priority" value={taskDraft.priority} options={["low", "normal", "high", "urgent"]} onChange={(value) => setTaskDraft((current) => ({ ...current, priority: value as TaskRow["priority"] }))} /><Field label="Due" type="datetime-local" value={taskDraft.dueAt} onChange={(value) => setTaskDraft((current) => ({ ...current, dueAt: value }))} /><label className="col-span-2 inline-flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={taskDraft.evidenceRequired} onChange={(event) => setTaskDraft((current) => ({ ...current, evidenceRequired: event.target.checked }))} /> Completion evidence required</label><button type="button" onClick={() => void addTask()} disabled={busy !== null} className="col-span-2 min-h-10 bg-gradient-gold text-primary-foreground text-[9px] uppercase tracking-[0.12em] disabled:opacity-50">{busy === "task:add" ? "Adding…" : "Add internal task"}</button></div></details>
                {tasks.length === 0 ? <Empty text="No internal tasks." compact /> : tasks.map((row) => <article key={row.id} className="border border-border/50 p-3 mb-2"><div className="flex items-start justify-between gap-2"><div><p className={`text-[8px] uppercase tracking-[0.12em] ${row.priority === "urgent" ? "text-red-300" : "text-gold"}`}>{row.priority} · {row.due_at ? dateState(row.due_at).replace(/_/g, " ") : "unscheduled"}</p><h4 className="font-medium text-sm mt-1">{row.title}</h4>{row.description && <p className="text-[10px] text-muted-foreground mt-1">{row.description}</p>}</div>{row.evidence_required && <span className="text-[8px] uppercase text-amber-300">evidence</span>}</div>{row.blocker_note && <p className="text-[10px] text-red-300 mt-2">Blocker: {row.blocker_note}</p>}<select aria-label={`Task status ${row.title}`} value={row.status} onChange={(event) => void updateTask(row, event.target.value as ProductionTaskStatus)} disabled={busy !== null} className={`${FIELD} mt-3`}>{TASK_STATUSES.map((status) => <option key={status} value={status}>{status.replace(/_/g, " ")}</option>)}</select></article>)}
              </PlanColumn>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Metric({ label, value, icon, attention = false }: { label: string; value: number; icon: React.ReactNode; attention?: boolean }) {
  return <div className="p-4 border-r border-border/60 last:border-r-0"><div className={`flex items-center gap-2 ${attention ? "text-amber-300" : "text-gold"}`}>{icon}<span className="text-[8px] uppercase tracking-[0.12em] text-muted-foreground">{label}</span></div><p className="font-display text-2xl mt-2">{value.toLocaleString()}</p></div>;
}

function Mini({ label, value }: { label: string; value: string }) {
  return <div className="border border-border/50 p-2"><p className="text-[7px] uppercase tracking-[0.11em] text-muted-foreground">{label}</p><p className="text-sm mt-1">{value}</p></div>;
}

function PlanColumn({ title, icon, count, children }: { title: string; icon: React.ReactNode; count: number; children: React.ReactNode }) {
  return <section className="p-4 sm:p-5 border-b 2xl:border-b-0 2xl:border-r border-border/60 last:border-r-0"><div className="flex items-center justify-between gap-3 mb-4"><h3 className="font-display text-xl inline-flex items-center gap-2">{icon}{title}</h3><span className="text-[9px] text-muted-foreground">{count}</span></div>{children}</section>;
}

function Field({ label, value, onChange, type = "text", span = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; span?: boolean }) {
  return <label className={`text-[8px] uppercase tracking-[0.11em] text-muted-foreground ${span ? "col-span-2" : ""}`}>{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} className={`${FIELD} mt-1`} /></label>;
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label className="text-[8px] uppercase tracking-[0.11em] text-muted-foreground">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className={`${FIELD} mt-1`}>{options.map((option) => <option key={option} value={option}>{option.replace(/_/g, " ")}</option>)}</select></label>;
}

function Empty({ text, compact = false }: { text: string; compact?: boolean }) {
  return <div className={`border border-dashed border-border/60 text-center text-xs text-muted-foreground ${compact ? "p-4" : "p-8"}`}>{text}</div>;
}
