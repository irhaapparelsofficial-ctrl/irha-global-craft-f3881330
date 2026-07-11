import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Factory,
  PackageCheck,
  Plus,
  RefreshCw,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  PRODUCTION_STAGES,
  allowedStageChanges,
  dueState,
  productionJobReadiness,
  productionStageProgress,
  stageChangeRequiresOwnerApproval,
  stageLabel,
  type ProductionJobType,
  type ProductionStage,
} from "@/lib/productionWorkflow";

const db = supabase as any;
const MIGRATION = "supabase/migrations/20260712223000_sample_production_workflow.sql";

type JobRow = {
  id: string;
  job_number: string;
  job_type: ProductionJobType;
  buyer_name: string;
  company_name: string | null;
  product_name: string;
  quantity_text: string;
  specification_reference: string;
  stage: ProductionStage;
  priority: "low" | "normal" | "high" | "urgent";
  internal_target_date: string | null;
  buyer_target_text: string | null;
  sample_status: string;
  buyer_approval_status: string;
  qc_status: string;
  shipping_status: string;
  courier_name: string | null;
  tracking_number: string | null;
  buyer_notification_status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type Draft = {
  jobType: ProductionJobType;
  buyerName: string;
  companyName: string;
  productName: string;
  quantityText: string;
  specificationReference: string;
  priority: JobRow["priority"];
  targetDate: string;
  buyerTargetText: string;
  notes: string;
};

const EMPTY_DRAFT: Draft = {
  jobType: "sample",
  buyerName: "",
  companyName: "",
  productName: "",
  quantityText: "",
  specificationReference: "",
  priority: "normal",
  targetDate: "",
  buyerTargetText: "",
  notes: "",
};

export default function ProductionWorkflowPanel() {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<"active" | "sample" | "order" | "all">("active");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await db.from("production_jobs").select("*").order("updated_at", { ascending: false }).limit(500);
    if (error) {
      setBackendError(error.message || "Production workflow backend unavailable");
      setJobs([]);
    } else {
      setBackendError(null);
      setJobs((data ?? []) as JobRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const stats = useMemo(() => ({
    active: jobs.filter((job) => !["completed", "cancelled"].includes(job.stage)).length,
    samples: jobs.filter((job) => job.job_type === "sample" && !["completed", "cancelled"].includes(job.stage)).length,
    orders: jobs.filter((job) => job.job_type === "order" && !["completed", "cancelled"].includes(job.stage)).length,
    overdue: jobs.filter((job) => !["completed", "cancelled"].includes(job.stage) && dueState(job.internal_target_date) === "overdue").length,
    qcAttention: jobs.filter((job) => ["failed", "rework"].includes(job.qc_status)).length,
  }), [jobs]);

  const visibleJobs = useMemo(() => jobs.filter((job) => {
    if (filter === "sample") return job.job_type === "sample";
    if (filter === "order") return job.job_type === "order";
    if (filter === "active") return !["completed", "cancelled"].includes(job.stage);
    return true;
  }), [filter, jobs]);

  const createJob = async () => {
    const readiness = productionJobReadiness({
      buyerName: draft.buyerName,
      product: draft.productName,
      quantity: draft.quantityText,
      specificationReference: draft.specificationReference,
      targetDate: draft.targetDate,
    });
    if (!readiness.ready) {
      toast({ title: "Production brief incomplete", description: `Missing: ${readiness.missing.join(", ")}`, variant: "destructive" });
      return;
    }
    setCreating(true);
    const jobNumber = `${draft.jobType === "sample" ? "SMP" : "ORD"}-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Date.now().toString().slice(-5)}`;
    const { data, error } = await db.from("production_jobs").insert({
      job_number: jobNumber,
      job_type: draft.jobType,
      source_type: "manual",
      buyer_name: draft.buyerName.trim(),
      company_name: draft.companyName.trim() || null,
      product_name: draft.productName.trim(),
      quantity_text: draft.quantityText.trim(),
      specification_reference: draft.specificationReference.trim(),
      priority: draft.priority,
      internal_target_date: draft.targetDate,
      buyer_target_text: draft.buyerTargetText.trim() || null,
      sample_status: draft.jobType === "sample" ? "requested" : "not_required",
      notes: draft.notes.trim() || null,
      buyer_notification_status: "not_prepared",
    }).select("*").single();

    if (error) {
      toast({ title: "Job creation failed", description: error.message, variant: "destructive" });
      setCreating(false);
      return;
    }

    await db.from("production_job_events").insert({
      production_job_id: data.id,
      event_type: "created",
      to_value: "briefing",
      note: "Created from admin production workflow. No buyer notification sent.",
      evidence: { job_number: jobNumber, specification_reference: draft.specificationReference.trim() },
    });
    toast({ title: `${jobNumber} created`, description: "Internal job created; buyer notification remains not prepared." });
    setDraft(EMPTY_DRAFT);
    setCreating(false);
    await load();
  };

  const updateField = async (job: JobRow, field: string, value: string, eventType: string) => {
    const previous = String((job as any)[field] ?? "");
    const { error } = await db.from("production_jobs").update({ [field]: value }).eq("id", job.id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    await db.from("production_job_events").insert({
      production_job_id: job.id,
      event_type: eventType,
      from_value: previous,
      to_value: value,
      note: "Internal status update. No automatic buyer notification.",
    });
    await load();
  };

  const changeStage = async (job: JobRow, next: ProductionStage) => {
    const ownerApproval = stageChangeRequiresOwnerApproval(job.stage, next);
    if (ownerApproval) {
      const confirmed = window.confirm(`${stageLabel(next)} may imply a buyer-facing commitment. Confirm owner approval for this internal stage change. No buyer message will be sent.`);
      if (!confirmed) return;
    }
    const update: Record<string, unknown> = { stage: next };
    if (ownerApproval) {
      update.owner_approval_required = false;
      update.owner_approved_at = new Date().toISOString();
    }
    const { error } = await db.from("production_jobs").update(update).eq("id", job.id);
    if (error) {
      toast({ title: "Stage update failed", description: error.message, variant: "destructive" });
      return;
    }
    await db.from("production_job_events").insert({
      production_job_id: job.id,
      event_type: ownerApproval ? "owner_approved" : "stage_changed",
      from_value: job.stage,
      to_value: next,
      note: ownerApproval ? "Owner confirmed internal buyer-impacting stage. Buyer notification not sent." : "Internal stage updated.",
      evidence: { owner_approval: ownerApproval },
    });
    await load();
  };

  if (loading && jobs.length === 0) {
    return <div className="py-12 text-center text-sm text-muted-foreground" role="status">Loading production workflow…</div>;
  }

  if (backendError) {
    return (
      <section className="border border-amber-500/35 bg-amber-500/[0.05] p-6 md:p-8">
        <div className="flex items-start gap-4">
          <AlertTriangle size={22} className="text-amber-300 shrink-0 mt-1" />
          <div>
            <p className="eyebrow mb-2">Samples & Production</p>
            <h2 className="font-display text-2xl md:text-3xl">Backend activation pending</h2>
            <p className="text-sm text-foreground/65 mt-3 max-w-3xl leading-relaxed">
              The workflow UI is code-ready, but the production tables are not available in the active backend. Apply the prepared migration during the single final Lovable/Supabase activation batch.
            </p>
            <code className="mt-4 block text-xs text-amber-200 break-all">{MIGRATION}</code>
            <p className="mt-3 text-xs text-foreground/45 break-all">Runtime evidence: {backendError}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="border border-border/60 bg-card/25">
        <div className="p-4 sm:p-5 md:p-6 border-b border-border/60 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
          <div className="flex items-start gap-3">
            <Factory size={21} className="text-gold shrink-0 mt-1" />
            <div>
              <p className="eyebrow mb-2">Samples & Production</p>
              <h2 className="font-display text-2xl md:text-3xl">Internal factory workflow</h2>
              <p className="text-sm text-foreground/60 mt-2 max-w-3xl leading-relaxed">
                Track samples, orders, QC and shipment evidence. Internal target dates are not buyer promises. Buyer notifications and commitment stages require owner review.
              </p>
            </div>
          </div>
          <button type="button" onClick={() => void load()} className="min-h-11 inline-flex items-center justify-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.16em] hover:border-gold hover:text-gold">
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 border-b border-border/60">
          <Metric label="Active" value={stats.active} />
          <Metric label="Samples" value={stats.samples} />
          <Metric label="Orders" value={stats.orders} />
          <Metric label="Overdue" value={stats.overdue} attention={stats.overdue > 0} />
          <Metric label="QC attention" value={stats.qcAttention} attention={stats.qcAttention > 0} />
        </div>

        <details className="border-b border-border/60 group">
          <summary className="cursor-pointer list-none p-4 sm:p-5 flex items-center justify-between gap-3 hover:bg-card/30">
            <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-gold"><Plus size={14} /> Create internal sample/order job</span>
            <span className="text-xs text-muted-foreground group-open:hidden">Open</span>
          </summary>
          <div className="p-4 sm:p-5 pt-0 grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Select label="Job type" value={draft.jobType} onChange={(value) => setDraft((current) => ({ ...current, jobType: value as ProductionJobType }))} options={["sample", "order"]} />
            <Field label="Buyer name *" value={draft.buyerName} onChange={(value) => setDraft((current) => ({ ...current, buyerName: value }))} />
            <Field label="Company" value={draft.companyName} onChange={(value) => setDraft((current) => ({ ...current, companyName: value }))} />
            <Field label="Product/style *" value={draft.productName} onChange={(value) => setDraft((current) => ({ ...current, productName: value }))} />
            <Field label="Quantity *" value={draft.quantityText} onChange={(value) => setDraft((current) => ({ ...current, quantityText: value }))} />
            <Field label="Approved specification reference *" value={draft.specificationReference} onChange={(value) => setDraft((current) => ({ ...current, specificationReference: value }))} placeholder="Tech pack / sample / brief reference" />
            <Select label="Priority" value={draft.priority} onChange={(value) => setDraft((current) => ({ ...current, priority: value as Draft["priority"] }))} options={["low", "normal", "high", "urgent"]} />
            <Field label="Internal target date *" value={draft.targetDate} onChange={(value) => setDraft((current) => ({ ...current, targetDate: value }))} type="date" />
            <Field label="Buyer target (not promise)" value={draft.buyerTargetText} onChange={(value) => setDraft((current) => ({ ...current, buyerTargetText: value }))} />
            <div className="sm:col-span-2 xl:col-span-3">
              <Field label="Internal notes" value={draft.notes} onChange={(value) => setDraft((current) => ({ ...current, notes: value }))} />
            </div>
            <button type="button" onClick={() => void createJob()} disabled={creating} className="min-h-11 self-end bg-gold text-background px-4 text-[10px] uppercase tracking-[0.16em] disabled:opacity-50">
              {creating ? "Creating…" : "Create internal job"}
            </button>
          </div>
        </details>

        <div className="p-4 md:p-5 flex gap-2 overflow-x-auto">
          {(["active", "sample", "order", "all"] as const).map((value) => (
            <button key={value} type="button" onClick={() => setFilter(value)} className={`min-h-10 shrink-0 border px-3 text-[10px] uppercase tracking-[0.15em] ${filter === value ? "border-gold text-gold bg-gold/5" : "border-border/60 text-foreground/55"}`}>{value}</button>
          ))}
        </div>
      </section>

      {visibleJobs.length === 0 ? (
        <div className="border border-dashed border-border/50 p-10 text-center">
          <ClipboardList size={26} className="mx-auto text-gold mb-3" />
          <p className="font-display text-xl">No production jobs in this view</p>
          <p className="text-xs text-muted-foreground mt-2">Create an internal sample or order job when an approved factory brief is ready.</p>
        </div>
      ) : (
        <div className="grid xl:grid-cols-2 gap-4">
          {visibleJobs.map((job) => <JobCard key={job.id} job={job} onStage={changeStage} onField={updateField} />)}
        </div>
      )}
    </div>
  );
}

function JobCard({ job, onStage, onField }: { job: JobRow; onStage: (job: JobRow, stage: ProductionStage) => Promise<void>; onField: (job: JobRow, field: string, value: string, eventType: string) => Promise<void> }) {
  const progress = productionStageProgress(job.stage);
  const due = dueState(job.internal_target_date);
  const changes = allowedStageChanges(job.stage);
  return (
    <article className="border border-border/60 bg-card/25 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="border border-gold/40 text-gold px-2 py-1 text-[9px] uppercase tracking-[0.14em]">{job.job_type}</span>
            <code className="text-[10px] text-foreground/45">{job.job_number}</code>
            {due === "overdue" && <span className="border border-red-500/40 text-red-300 px-2 py-1 text-[9px] uppercase tracking-[0.14em]">Overdue</span>}
            {due === "due_soon" && <span className="border border-amber-500/40 text-amber-300 px-2 py-1 text-[9px] uppercase tracking-[0.14em]">Due soon</span>}
          </div>
          <h3 className="font-display text-xl mt-3 truncate">{job.product_name}</h3>
          <p className="text-xs text-foreground/55 mt-1 truncate">{job.company_name || job.buyer_name} · {job.quantity_text}</p>
        </div>
        <span className="font-display text-2xl text-gold">{progress}%</span>
      </div>

      <div className="mt-4 h-1.5 bg-secondary/60 overflow-hidden"><div className="h-full bg-gradient-gold" style={{ width: `${progress}%` }} /></div>
      <div className="mt-3 flex justify-between gap-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        <span>{stageLabel(job.stage)}</span>
        <span>{job.internal_target_date || "Unscheduled"}</span>
      </div>

      <div className="mt-5 grid sm:grid-cols-2 gap-3">
        <Select label="Next stage" value="" onChange={(value) => value && void onStage(job, value as ProductionStage)} options={changes} optionLabel={(value) => stageLabel(value as ProductionStage)} placeholder={changes.length ? "Choose stage" : "No next stage"} disabled={!changes.length} />
        <Select label="QC status" value={job.qc_status} onChange={(value) => void onField(job, "qc_status", value, "qc_updated")} options={["not_started", "pending", "passed", "failed", "rework"]} />
        <Select label="Sample status" value={job.sample_status} onChange={(value) => void onField(job, "sample_status", value, "sample_updated")} options={["not_required", "requested", "spec_pending", "in_development", "qc", "sent", "approved", "rejected", "cancelled"]} />
        <Select label="Buyer approval" value={job.buyer_approval_status} onChange={(value) => void onField(job, "buyer_approval_status", value, "buyer_approval_updated")} options={["not_requested", "pending", "approved", "changes_requested", "rejected"]} />
        <Select label="Shipping status" value={job.shipping_status} onChange={(value) => void onField(job, "shipping_status", value, "shipping_updated")} options={["not_ready", "ready", "booked", "shipped", "delivered", "exception"]} />
        <div className="border border-border/50 p-3 text-xs text-foreground/55">
          <p className="inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.14em] text-gold"><ShieldCheck size={12} /> Buyer notification</p>
          <p className="mt-2">{job.buyer_notification_status.replace(/_/g, " ")}</p>
          <p className="mt-1 text-[10px] text-foreground/40">No automatic message from this panel.</p>
        </div>
      </div>

      {(job.courier_name || job.tracking_number) && (
        <div className="mt-4 border-t border-border/50 pt-3 text-xs text-foreground/55 inline-flex items-center gap-2"><Truck size={13} className="text-gold" /> {job.courier_name || "Courier"} · {job.tracking_number || "Tracking pending"}</div>
      )}
    </article>
  );
}

function Metric({ label, value, attention = false }: { label: string; value: number; attention?: boolean }) {
  return <div className="p-4 border-r border-b md:border-b-0 border-border/60 last:border-r-0"><p className={`font-display text-2xl ${attention ? "text-amber-300" : "text-foreground"}`}>{value}</p><p className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground mt-1">{label}</p></div>;
}

function Field({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return <label className="block"><span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-2 min-h-11 w-full bg-background border border-border/60 px-3 text-sm" /></label>;
}

function Select({ label, value, onChange, options, optionLabel, placeholder, disabled = false }: { label: string; value: string; onChange: (value: string) => void; options: readonly string[]; optionLabel?: (value: string) => string; placeholder?: string; disabled?: boolean }) {
  return <label className="block"><span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} className="mt-2 min-h-11 w-full bg-background border border-border/60 px-3 text-xs disabled:opacity-50">{placeholder !== undefined && <option value="">{placeholder}</option>}{options.map((option) => <option key={option} value={option}>{optionLabel ? optionLabel(option) : option.replace(/_/g, " ")}</option>)}</select></label>;
}
