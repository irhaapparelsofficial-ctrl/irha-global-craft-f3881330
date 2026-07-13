import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeDollarSign,
  CheckCircle2,
  ClipboardCheck,
  Factory,
  Loader2,
  Plus,
  RefreshCw,
  Repeat2,
  ShieldCheck,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { safeCurrency, type AcceptanceStatus, type CostCategory, type PaymentStatus } from "@/lib/productionCloseout";

const db = supabase as any;
const MIGRATION = "supabase/migrations/20260714001000_production_order_closeout.sql";
const FIELD = "min-h-11 w-full border border-border/60 bg-background px-3 text-sm outline-none focus:border-gold";
const TEXTAREA = `${FIELD} py-3`;

type SummaryRow = {
  closeout_id: string;
  production_job_id: string;
  shipment_id: string | null;
  status: "draft" | "review" | "approved" | "closed" | "reopened";
  base_currency: string;
  acceptance_status: AcceptanceStatus;
  acceptance_reference: string | null;
  accepted_at: string | null;
  invoice_number: string | null;
  invoice_amount: number | null;
  invoice_currency: string | null;
  invoice_exchange_rate_to_base: number;
  payment_status: PaymentStatus;
  lessons_learned: string | null;
  owner_review_status: "pending" | "approved" | "rejected";
  owner_reviewed_at: string | null;
  closed_at: string | null;
  updated_at: string;
  job_number: string;
  job_type: "sample" | "order";
  source_type: string | null;
  source_id: string | null;
  buyer_name: string;
  company_name: string | null;
  product_name: string;
  quantity_text: string;
  stage: string;
  closeout_risk: "clear" | "attention" | "blocked";
  shipment_status: string | null;
  delivered_at: string | null;
  verified_delivery_evidence_count: number;
  verified_cost_base: number;
  pending_cost_base: number;
  verified_cost_count: number;
  pending_cost_count: number;
  revenue_base: number;
  contribution_margin_base: number;
  contribution_margin_percent: number | null;
  open_issue_count: number;
  open_critical_issue_count: number;
  open_repeat_order_count: number;
  next_follow_up_due_date: string | null;
};

type JobRow = {
  id: string;
  job_number: string;
  buyer_name: string;
  company_name: string | null;
  product_name: string;
  quantity_text: string;
  stage: string;
  shipping_status: string;
  closeout_status: string;
};

type CostRow = {
  id: string;
  category: CostCategory;
  description: string;
  quantity: number;
  unit_cost: number;
  currency: string;
  exchange_rate_to_base: number;
  amount_base: number;
  evidence_reference: string | null;
  verification_status: "pending" | "verified" | "rejected";
  notes: string | null;
  created_at: string;
};

type IssueRow = {
  id: string;
  issue_type: string;
  severity: "minor" | "major" | "critical";
  title: string;
  description: string | null;
  status: "open" | "investigating" | "resolved" | "waived";
  resolution: string | null;
  created_at: string;
};

type RepeatRow = {
  id: string;
  buyer_name: string;
  company_name: string | null;
  product_name: string;
  suggested_quantity_text: string | null;
  follow_up_due_date: string;
  priority: "high" | "normal" | "low" | "blocked";
  status: "draft" | "owner_approved" | "contact_prepared" | "contacted" | "won" | "lost" | "dismissed";
  rationale: string | null;
  outreach_draft: string | null;
};

type ManagementRow = {
  report_month: string;
  closeout_count: number;
  closed_order_count: number;
  accepted_delivery_count: number;
  paid_order_count: number;
  overdue_payment_count: number;
  revenue_base: number;
  verified_cost_base: number;
  contribution_margin_base: number;
  blocked_closeout_count: number;
};

type Readiness = {
  ready: boolean;
  missing: string[];
  warnings: string[];
  revenue_base: number;
  verified_cost_base: number;
  contribution_margin_base: number;
  contribution_margin_percent: number | null;
};

const EMPTY_COMMERCIAL = {
  invoiceNumber: "",
  invoiceAmount: "",
  invoiceCurrency: "USD",
  exchangeRate: "1",
  paymentStatus: "unknown" as PaymentStatus,
  paymentReference: "",
  lessons: "",
  notes: "",
};
const EMPTY_ACCEPTANCE = { status: "pending" as AcceptanceStatus, reference: "", acceptedAt: "", notes: "" };
const EMPTY_COST = { category: "material" as CostCategory, description: "", quantity: "1", unitCost: "", currency: "PKR", exchangeRate: "1", evidence: "", notes: "" };
const EMPTY_ISSUE = { type: "internal", severity: "minor" as IssueRow["severity"], title: "", description: "" };
const EMPTY_REPEAT = { cycleDays: "120", leadTimeDays: "30", quantity: "", rationale: "", outreach: "" };

export default function ProductionCloseoutPanel() {
  const [summaries, setSummaries] = useState<SummaryRow[]>([]);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [management, setManagement] = useState<ManagementRow[]>([]);
  const [costs, setCosts] = useState<CostRow[]>([]);
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [repeatRows, setRepeatRows] = useState<RepeatRow[]>([]);
  const [selectedCloseoutId, setSelectedCloseoutId] = useState("");
  const [selectedJobId, setSelectedJobId] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [commercial, setCommercial] = useState(EMPTY_COMMERCIAL);
  const [acceptance, setAcceptance] = useState(EMPTY_ACCEPTANCE);
  const [costDraft, setCostDraft] = useState(EMPTY_COST);
  const [issueDraft, setIssueDraft] = useState(EMPTY_ISSUE);
  const [repeatDraft, setRepeatDraft] = useState(EMPTY_REPEAT);

  const selected = useMemo(() => summaries.find((row) => row.closeout_id === selectedCloseoutId) || null, [selectedCloseoutId, summaries]);

  const load = useCallback(async () => {
    setLoading(true);
    const [summaryResult, jobsResult, managementResult] = await Promise.all([
      db.from("production_closeout_summary").select("*").order("updated_at", { ascending: false }).limit(500),
      db.from("production_jobs").select("id,job_number,buyer_name,company_name,product_name,quantity_text,stage,shipping_status,closeout_status").neq("stage", "cancelled").order("updated_at", { ascending: false }).limit(500),
      db.from("production_management_report").select("*").order("report_month", { ascending: false }).limit(24),
    ]);
    if (summaryResult.error) {
      setBackendError(summaryResult.error.message || "Closeout backend unavailable");
      setSummaries([]);
      setManagement([]);
    } else {
      const rows = (summaryResult.data || []) as SummaryRow[];
      setBackendError(null);
      setSummaries(rows);
      setManagement((managementResult.data || []) as ManagementRow[]);
      setSelectedCloseoutId((current) => current && rows.some((row) => row.closeout_id === current) ? current : rows[0]?.closeout_id || "");
    }
    setJobs((jobsResult.data || []) as JobRow[]);
    setLoading(false);
  }, []);

  const loadDetails = useCallback(async (closeoutId: string) => {
    if (!closeoutId) {
      setCosts([]);
      setIssues([]);
      setRepeatRows([]);
      return;
    }
    setDetailsLoading(true);
    const [costResult, issueResult, repeatResult] = await Promise.all([
      db.from("production_cost_entries").select("*").eq("closeout_id", closeoutId).order("created_at", { ascending: false }),
      db.from("production_closeout_issues").select("*").eq("closeout_id", closeoutId).order("created_at", { ascending: false }),
      db.from("production_repeat_order_opportunities").select("*").eq("closeout_id", closeoutId).order("follow_up_due_date", { ascending: true }),
    ]);
    setCosts((costResult.data || []) as CostRow[]);
    setIssues((issueResult.data || []) as IssueRow[]);
    setRepeatRows((repeatResult.data || []) as RepeatRow[]);
    setDetailsLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadDetails(selectedCloseoutId); setReadiness(null); }, [loadDetails, selectedCloseoutId]);
  useEffect(() => {
    if (!selected) return;
    setCommercial({
      invoiceNumber: selected.invoice_number || "",
      invoiceAmount: selected.invoice_amount ? String(selected.invoice_amount) : "",
      invoiceCurrency: selected.invoice_currency || "USD",
      exchangeRate: String(selected.invoice_exchange_rate_to_base || 1),
      paymentStatus: selected.payment_status,
      paymentReference: "",
      lessons: selected.lessons_learned || "",
      notes: "",
    });
    setAcceptance({
      status: selected.acceptance_status,
      reference: selected.acceptance_reference || "",
      acceptedAt: selected.accepted_at ? selected.accepted_at.slice(0, 16) : "",
      notes: "",
    });
  }, [selected]);

  const stats = useMemo(() => ({
    open: summaries.filter((row) => row.status !== "closed").length,
    blocked: summaries.filter((row) => row.closeout_risk === "blocked" || row.open_critical_issue_count > 0).length,
    closed: summaries.filter((row) => row.status === "closed").length,
    repeatDue: summaries.filter((row) => row.next_follow_up_due_date && row.next_follow_up_due_date <= new Date().toISOString().slice(0, 10)).length,
    revenue: summaries.reduce((sum, row) => sum + Number(row.revenue_base || 0), 0),
    margin: summaries.reduce((sum, row) => sum + Number(row.contribution_margin_base || 0), 0),
  }), [summaries]);

  const ensureCloseout = async () => {
    if (!selectedJobId) return;
    setBusy("ensure");
    const { data, error } = await db.rpc("production_ensure_closeout", { _job_id: selectedJobId });
    setBusy(null);
    if (error) return fail("Closeout workspace was not created", error.message);
    toast({ title: "Closeout workspace ready", description: "Internal workspace created. No buyer communication sent." });
    await load();
    if (data?.id) setSelectedCloseoutId(data.id);
  };

  const saveCommercial = async () => {
    if (!selected) return;
    setBusy("commercial");
    const { error } = await db.rpc("production_update_closeout_commercial", {
      _closeout_id: selected.closeout_id,
      _invoice_number: commercial.invoiceNumber,
      _invoice_amount: Number(commercial.invoiceAmount || 0),
      _invoice_currency: safeCurrency(commercial.invoiceCurrency, "USD"),
      _exchange_rate: Number(commercial.exchangeRate || 0),
      _payment_status: commercial.paymentStatus,
      _payment_reference: commercial.paymentReference || null,
      _lessons_learned: commercial.lessons || null,
      _closeout_notes: commercial.notes || null,
    });
    setBusy(null);
    if (error) return fail("Commercial closeout was not saved", error.message);
    toast({ title: "Commercial evidence saved", description: "No payment or buyer action was executed." });
    await load();
  };

  const saveAcceptance = async () => {
    if (!selected) return;
    if (acceptance.status === "accepted" && (!acceptance.reference.trim() || !acceptance.acceptedAt)) return fail("Acceptance evidence incomplete", "Reference and timestamp are required.");
    setBusy("acceptance");
    const { error } = await db.rpc("production_record_delivery_acceptance", {
      _closeout_id: selected.closeout_id,
      _status: acceptance.status,
      _reference: acceptance.reference || null,
      _accepted_at: acceptance.acceptedAt ? new Date(acceptance.acceptedAt).toISOString() : null,
      _notes: acceptance.notes || null,
    });
    setBusy(null);
    if (error) return fail("Acceptance evidence was not saved", error.message);
    toast({ title: "Delivery acceptance recorded", description: "The record is internal; no buyer message was sent." });
    await load();
  };

  const addCost = async () => {
    if (!selected || costDraft.description.trim().length < 3) return;
    setBusy("cost");
    const { error } = await db.rpc("production_add_closeout_cost", {
      _closeout_id: selected.closeout_id,
      _category: costDraft.category,
      _description: costDraft.description,
      _quantity: Number(costDraft.quantity || 0),
      _unit_cost: Number(costDraft.unitCost || 0),
      _currency: safeCurrency(costDraft.currency),
      _exchange_rate: Number(costDraft.exchangeRate || 0),
      _evidence_reference: costDraft.evidence || null,
      _notes: costDraft.notes || null,
    });
    setBusy(null);
    if (error) return fail("Cost entry was not added", error.message);
    setCostDraft(EMPTY_COST);
    toast({ title: "Cost added", description: "It remains pending until evidence is verified." });
    await Promise.all([load(), loadDetails(selected.closeout_id)]);
  };

  const verifyCost = async (id: string, status: "verified" | "rejected") => {
    const note = window.prompt(status === "verified" ? "Verification note or evidence reference" : "Rejection reason");
    if (note === null) return;
    setBusy(`cost:${id}`);
    const { error } = await db.rpc("production_verify_closeout_cost", { _cost_id: id, _status: status, _note: note || null });
    setBusy(null);
    if (error) return fail("Cost verification failed", error.message);
    await Promise.all([load(), loadDetails(selectedCloseoutId)]);
  };

  const addIssue = async () => {
    if (!selected || issueDraft.title.trim().length < 3) return;
    setBusy("issue");
    const { error } = await db.rpc("production_add_closeout_issue", {
      _closeout_id: selected.closeout_id,
      _issue_type: issueDraft.type,
      _severity: issueDraft.severity,
      _title: issueDraft.title,
      _description: issueDraft.description || null,
    });
    setBusy(null);
    if (error) return fail("Issue was not added", error.message);
    setIssueDraft(EMPTY_ISSUE);
    await Promise.all([load(), loadDetails(selected.closeout_id)]);
  };

  const resolveIssue = async (id: string, status: "resolved" | "waived") => {
    const resolution = window.prompt(status === "waived" ? "Owner waiver reason" : "Resolution evidence");
    if (!resolution) return;
    setBusy(`issue:${id}`);
    const { error } = await db.rpc("production_resolve_closeout_issue", { _issue_id: id, _status: status, _resolution: resolution });
    setBusy(null);
    if (error) return fail("Issue was not resolved", error.message);
    await Promise.all([load(), loadDetails(selectedCloseoutId)]);
  };

  const checkReadiness = async () => {
    if (!selected) return;
    setBusy("readiness");
    const { data, error } = await db.rpc("production_closeout_readiness", { _closeout_id: selected.closeout_id });
    setBusy(null);
    if (error) return fail("Readiness check failed", error.message);
    setReadiness(data as Readiness);
  };

  const ownerReview = async (approve: boolean) => {
    if (!selected) return;
    if (approve && !window.confirm("Approve this internal commercial closeout? This does not contact the buyer or execute payment.")) return;
    const note = window.prompt(approve ? "Owner approval note" : "Rejection reason");
    if (note === null) return;
    setBusy("owner");
    const { error } = await db.rpc("production_owner_review_closeout", { _closeout_id: selected.closeout_id, _approve: approve, _note: note || null });
    setBusy(null);
    if (error) return fail("Owner review was not recorded", error.message);
    await load();
    await checkReadiness();
  };

  const closeOrder = async () => {
    if (!selected || !window.confirm("Close this order internally? This does not send repeat-order outreach or collect payment.")) return;
    const note = window.prompt("Final internal closeout note");
    if (note === null) return;
    setBusy("close");
    const { error } = await db.rpc("production_close_order", { _closeout_id: selected.closeout_id, _note: note || null });
    setBusy(null);
    if (error) return fail("Order was not closed", error.message);
    toast({ title: "Order commercially closed", description: "No buyer outreach or payment action was executed." });
    await load();
  };

  const prepareRepeatOrder = async () => {
    if (!selected) return;
    setBusy("repeat");
    const { error } = await db.rpc("production_prepare_repeat_order", {
      _closeout_id: selected.closeout_id,
      _cycle_days: Number(repeatDraft.cycleDays || 0),
      _lead_time_days: Number(repeatDraft.leadTimeDays || 0),
      _quantity_text: repeatDraft.quantity || null,
      _rationale: repeatDraft.rationale || null,
      _outreach_draft: repeatDraft.outreach || null,
    });
    setBusy(null);
    if (error) return fail("Repeat-order draft was not prepared", error.message);
    setRepeatDraft(EMPTY_REPEAT);
    toast({ title: "Repeat-order opportunity prepared", description: "Internal draft only. No email or WhatsApp was sent." });
    await Promise.all([load(), loadDetails(selected.closeout_id)]);
  };

  const updateRepeatStatus = async (id: string, status: RepeatRow["status"]) => {
    const note = window.prompt(`Note for ${status.replaceAll("_", " ")}`);
    if (note === null) return;
    setBusy(`repeat:${id}`);
    const { error } = await db.rpc("production_set_repeat_order_status", { _id: id, _status: status, _note: note || null });
    setBusy(null);
    if (error) return fail("Repeat-order status was not updated", error.message);
    await loadDetails(selectedCloseoutId);
  };

  if (loading && summaries.length === 0 && !backendError) return <div className="py-10 text-center text-sm text-muted-foreground">Loading order closeouts…</div>;

  if (backendError) return (
    <section className="border border-amber-500/35 bg-amber-500/[0.05] p-6 md:p-8">
      <div className="flex items-start gap-4"><AlertTriangle size={22} className="text-amber-300 shrink-0 mt-1" /><div><p className="eyebrow mb-2">Phase 6.4</p><h2 className="font-display text-2xl md:text-3xl">Order closeout backend activation pending</h2><p className="text-sm text-foreground/65 mt-3 max-w-3xl leading-relaxed">Frontend and backend source are ready, but the closeout tables are intentionally not active yet. Apply the prepared migration during the single final backend activation.</p><code className="mt-4 block text-xs text-amber-200 break-all">{MIGRATION}</code><p className="mt-3 text-xs text-foreground/45 break-all">Runtime evidence: {backendError}</p></div></div>
    </section>
  );

  return (
    <section className="border border-gold/35 bg-card/20">
      <div className="p-5 md:p-6 border-b border-border/60 flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
        <div className="flex items-start gap-3"><ClipboardCheck size={22} className="text-gold mt-1 shrink-0" /><div><p className="eyebrow mb-2">Phase 6.4</p><h2 className="font-display text-2xl md:text-4xl">Order Closeout & Repeat Business</h2><p className="text-sm text-foreground/65 mt-3 max-w-4xl leading-relaxed">Verify delivery acceptance, costs, payment status and margin before owner closeout. Repeat-order opportunities stay internal drafts until separately approved and contacted.</p></div></div>
        <button type="button" onClick={() => void load()} disabled={loading || busy !== null} className="min-h-11 inline-flex items-center justify-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.14em] hover:border-gold disabled:opacity-50"><RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 p-4 md:p-5 border-b border-border/60">
        <Metric label="Open closeouts" value={stats.open} /><Metric label="Blocked" value={stats.blocked} /><Metric label="Closed" value={stats.closed} /><Metric label="Repeat due" value={stats.repeatDue} /><Metric label="Revenue base" value={money(stats.revenue)} /><Metric label="Margin base" value={money(stats.margin)} />
      </div>

      <div className="p-4 md:p-5 border-b border-border/60">
        <div className="grid lg:grid-cols-[1fr_auto] gap-3 items-end"><label className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">Prepare closeout for job<select value={selectedJobId} onChange={(event) => setSelectedJobId(event.target.value)} className={`${FIELD} mt-1`}><option value="">Select production job</option>{jobs.map((job) => <option key={job.id} value={job.id}>{job.job_number} · {job.buyer_name} · {job.product_name} · {job.stage}</option>)}</select></label><button type="button" onClick={() => void ensureCloseout()} disabled={!selectedJobId || busy !== null} className="min-h-11 inline-flex items-center justify-center gap-2 bg-gradient-gold text-primary-foreground px-5 text-[10px] uppercase tracking-[0.14em] disabled:opacity-50">{busy === "ensure" ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Prepare workspace</button></div>
      </div>

      <div className="grid xl:grid-cols-[330px_minmax(0,1fr)] min-h-[520px]">
        <aside className="border-r border-border/60 p-3 space-y-2 max-h-[780px] overflow-y-auto">
          {summaries.length === 0 ? <Empty text="No closeout workspace prepared yet." /> : summaries.map((row) => <button type="button" key={row.closeout_id} onClick={() => setSelectedCloseoutId(row.closeout_id)} className={`w-full text-left border p-3 transition-colors ${selectedCloseoutId === row.closeout_id ? "border-gold bg-gold/[0.05]" : "border-border/60 hover:border-gold/50"}`}><div className="flex items-center justify-between gap-2"><span className="text-[9px] uppercase tracking-[0.12em] text-gold">{row.job_number}</span><Risk value={row.closeout_risk} /></div><p className="font-display text-lg mt-1 truncate">{row.company_name || row.buyer_name}</p><p className="text-xs text-foreground/55 truncate">{row.product_name} · {row.quantity_text}</p><div className="flex items-center justify-between gap-2 mt-3 text-[9px] uppercase tracking-[0.1em] text-muted-foreground"><span>{row.status}</span><span>{row.payment_status.replaceAll("_", " ")}</span></div></button>)}
        </aside>

        <div className="p-4 md:p-5 overflow-hidden">
          {!selected ? <Empty text="Select a closeout workspace." /> : detailsLoading ? <div className="py-10 text-center text-sm text-muted-foreground">Loading closeout evidence…</div> : (
            <div className="space-y-5">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4"><div><p className="text-[9px] uppercase tracking-[0.14em] text-gold">{selected.job_number} · {selected.status}</p><h3 className="font-display text-2xl md:text-3xl mt-1">{selected.company_name || selected.buyer_name}</h3><p className="text-sm text-foreground/60 mt-1">{selected.product_name} · {selected.quantity_text} · shipment {selected.shipment_status || "not linked"}</p></div><div className="grid grid-cols-2 sm:grid-cols-4 gap-2"><Mini label="Revenue" value={money(selected.revenue_base)} /><Mini label="Verified cost" value={money(selected.verified_cost_base)} /><Mini label="Margin" value={money(selected.contribution_margin_base)} /><Mini label="Margin %" value={selected.contribution_margin_percent === null ? "—" : `${Number(selected.contribution_margin_percent).toFixed(2)}%`} /></div></div>

              <div className="grid lg:grid-cols-2 gap-4">
                <Card title="Commercial evidence" icon={<BadgeDollarSign size={16} className="text-gold" />}>
                  <div className="grid sm:grid-cols-2 gap-2"><Input label="Invoice number" value={commercial.invoiceNumber} onChange={(value) => setCommercial((current) => ({ ...current, invoiceNumber: value }))} /><Input label="Invoice amount" type="number" value={commercial.invoiceAmount} onChange={(value) => setCommercial((current) => ({ ...current, invoiceAmount: value }))} /><Input label="Currency" value={commercial.invoiceCurrency} onChange={(value) => setCommercial((current) => ({ ...current, invoiceCurrency: value.toUpperCase() }))} /><Input label="Rate to base" type="number" value={commercial.exchangeRate} onChange={(value) => setCommercial((current) => ({ ...current, exchangeRate: value }))} /><label className="text-[9px] uppercase tracking-[0.11em] text-muted-foreground">Payment status<select value={commercial.paymentStatus} onChange={(event) => setCommercial((current) => ({ ...current, paymentStatus: event.target.value as PaymentStatus }))} className={`${FIELD} mt-1`}>{["unknown","not_invoiced","invoiced","part_paid","paid","overdue","disputed"].map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label><Input label="Payment reference" value={commercial.paymentReference} onChange={(value) => setCommercial((current) => ({ ...current, paymentReference: value }))} /></div><Text label="Lessons learned" value={commercial.lessons} onChange={(value) => setCommercial((current) => ({ ...current, lessons: value }))} /><Text label="Internal notes" value={commercial.notes} onChange={(value) => setCommercial((current) => ({ ...current, notes: value }))} /><Action onClick={saveCommercial} busy={busy === "commercial"} label="Save commercial evidence" />
                </Card>

                <Card title="Delivery acceptance" icon={<CheckCircle2 size={16} className="text-gold" />}>
                  <label className="text-[9px] uppercase tracking-[0.11em] text-muted-foreground">Acceptance status<select value={acceptance.status} onChange={(event) => setAcceptance((current) => ({ ...current, status: event.target.value as AcceptanceStatus }))} className={`${FIELD} mt-1`}>{["pending","accepted","changes_requested","disputed","waived"].map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label><Input label="Buyer/reference evidence" value={acceptance.reference} onChange={(value) => setAcceptance((current) => ({ ...current, reference: value }))} /><Input label="Acceptance timestamp" type="datetime-local" value={acceptance.acceptedAt} onChange={(value) => setAcceptance((current) => ({ ...current, acceptedAt: value }))} /><Text label={acceptance.status === "waived" ? "Owner waiver reason" : "Acceptance notes"} value={acceptance.notes} onChange={(value) => setAcceptance((current) => ({ ...current, notes: value }))} /><Action onClick={saveAcceptance} busy={busy === "acceptance"} label="Record acceptance evidence" />
                </Card>
              </div>

              <Card title="Verified order costs" icon={<TrendingUp size={16} className="text-gold" />}>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2"><label className="text-[9px] uppercase tracking-[0.11em] text-muted-foreground">Category<select value={costDraft.category} onChange={(event) => setCostDraft((current) => ({ ...current, category: event.target.value as CostCategory }))} className={`${FIELD} mt-1`}>{["material","labour","subcontract","packaging","quality","freight","duty_tax","bank_fee","overhead","claim","other"].map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label><Input label="Description" value={costDraft.description} onChange={(value) => setCostDraft((current) => ({ ...current, description: value }))} /><Input label="Quantity" type="number" value={costDraft.quantity} onChange={(value) => setCostDraft((current) => ({ ...current, quantity: value }))} /><Input label="Unit cost" type="number" value={costDraft.unitCost} onChange={(value) => setCostDraft((current) => ({ ...current, unitCost: value }))} /><Input label="Currency" value={costDraft.currency} onChange={(value) => setCostDraft((current) => ({ ...current, currency: value.toUpperCase() }))} /><Input label="Rate to base" type="number" value={costDraft.exchangeRate} onChange={(value) => setCostDraft((current) => ({ ...current, exchangeRate: value }))} /><Input label="Evidence reference" value={costDraft.evidence} onChange={(value) => setCostDraft((current) => ({ ...current, evidence: value }))} /><Input label="Notes" value={costDraft.notes} onChange={(value) => setCostDraft((current) => ({ ...current, notes: value }))} /></div><Action onClick={addCost} busy={busy === "cost"} label="Add pending cost" />
                <div className="space-y-2 mt-4">{costs.length === 0 ? <Empty text="No cost evidence recorded." /> : costs.map((row) => <div key={row.id} className="border border-border/60 p-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3"><div><p className="text-[9px] uppercase tracking-[0.12em] text-gold">{row.category.replaceAll("_", " ")} · {row.verification_status}</p><p className="text-sm mt-1">{row.description}</p><p className="text-xs text-muted-foreground mt-1">{row.quantity} × {row.unit_cost} {row.currency} · base {money(row.amount_base)} {row.evidence_reference ? `· ${row.evidence_reference}` : ""}</p></div>{row.verification_status === "pending" && <div className="flex gap-2"><button type="button" onClick={() => void verifyCost(row.id, "verified")} disabled={busy !== null} className="min-h-9 px-3 border border-emerald-500/40 text-emerald-300 text-[9px] uppercase">Verify</button><button type="button" onClick={() => void verifyCost(row.id, "rejected")} disabled={busy !== null} className="min-h-9 px-3 border border-red-500/40 text-red-300 text-[9px] uppercase">Reject</button></div>}</div>)}</div>
              </Card>

              <div className="grid lg:grid-cols-2 gap-4">
                <Card title="Closeout issues" icon={<AlertTriangle size={16} className="text-gold" />}>
                  <div className="grid sm:grid-cols-2 gap-2"><label className="text-[9px] uppercase tracking-[0.11em] text-muted-foreground">Issue type<select value={issueDraft.type} onChange={(event) => setIssueDraft((current) => ({ ...current, type: event.target.value }))} className={`${FIELD} mt-1`}>{["delivery","quality","quantity","document","payment","claim","buyer_feedback","internal","other"].map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label><label className="text-[9px] uppercase tracking-[0.11em] text-muted-foreground">Severity<select value={issueDraft.severity} onChange={(event) => setIssueDraft((current) => ({ ...current, severity: event.target.value as IssueRow["severity"] }))} className={`${FIELD} mt-1`}>{["minor","major","critical"].map((value) => <option key={value} value={value}>{value}</option>)}</select></label><Input label="Title" value={issueDraft.title} onChange={(value) => setIssueDraft((current) => ({ ...current, title: value }))} /><Input label="Description" value={issueDraft.description} onChange={(value) => setIssueDraft((current) => ({ ...current, description: value }))} /></div><Action onClick={addIssue} busy={busy === "issue"} label="Record issue" />
                  <div className="space-y-2 mt-4">{issues.length === 0 ? <Empty text="No closeout issue recorded." /> : issues.map((row) => <div key={row.id} className="border border-border/60 p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-[9px] uppercase tracking-[0.12em] text-gold">{row.severity} · {row.issue_type.replaceAll("_", " ")} · {row.status}</p><p className="text-sm mt-1">{row.title}</p>{row.description && <p className="text-xs text-muted-foreground mt-1">{row.description}</p>}</div>{["open","investigating"].includes(row.status) && <div className="flex gap-1"><button type="button" onClick={() => void resolveIssue(row.id, "resolved")} className="text-[9px] uppercase text-emerald-300">Resolve</button><button type="button" onClick={() => void resolveIssue(row.id, "waived")} className="text-[9px] uppercase text-amber-300">Waive</button></div>}</div></div>)}</div>
                </Card>

                <Card title="Owner closeout gate" icon={<ShieldCheck size={16} className="text-gold" />}>
                  <div className="grid grid-cols-2 gap-2"><Mini label="Delivery evidence" value={selected.verified_delivery_evidence_count} /><Mini label="Verified costs" value={selected.verified_cost_count} /><Mini label="Open issues" value={selected.open_issue_count} /><Mini label="Critical" value={selected.open_critical_issue_count} /></div><button type="button" onClick={() => void checkReadiness()} disabled={busy !== null} className="mt-3 min-h-11 w-full border border-gold/60 text-gold text-[10px] uppercase tracking-[0.13em] disabled:opacity-50">{busy === "readiness" ? "Checking…" : "Run server readiness"}</button>{readiness && <div className={`mt-3 border p-3 ${readiness.ready ? "border-emerald-500/35 bg-emerald-500/[0.04]" : "border-amber-500/35 bg-amber-500/[0.04]"}`}><div className="flex items-center gap-2">{readiness.ready ? <CheckCircle2 size={16} className="text-emerald-300" /> : <XCircle size={16} className="text-amber-300" />}<p className="text-sm">{readiness.ready ? "Ready for owner review" : "Closeout blockers remain"}</p></div>{readiness.missing?.length > 0 && <p className="text-xs text-amber-200 mt-2">Missing: {readiness.missing.join(" · ")}</p>}{readiness.warnings?.length > 0 && <p className="text-xs text-muted-foreground mt-2">Warnings: {readiness.warnings.join(" · ")}</p>}</div>}<div className="grid grid-cols-2 gap-2 mt-3"><button type="button" onClick={() => void ownerReview(true)} disabled={busy !== null || selected.status === "closed"} className="min-h-11 border border-emerald-500/40 text-emerald-300 text-[9px] uppercase disabled:opacity-50">Owner approve</button><button type="button" onClick={() => void ownerReview(false)} disabled={busy !== null || selected.status === "closed"} className="min-h-11 border border-red-500/40 text-red-300 text-[9px] uppercase disabled:opacity-50">Reject review</button></div><button type="button" onClick={() => void closeOrder()} disabled={busy !== null || selected.status !== "approved"} className="mt-2 min-h-11 w-full bg-gradient-gold text-primary-foreground text-[10px] uppercase tracking-[0.13em] disabled:opacity-50">{busy === "close" ? "Closing…" : "Close order internally"}</button>
                </Card>
              </div>

              <Card title="Repeat-order opportunity" icon={<Repeat2 size={16} className="text-gold" />}>
                <p className="text-xs text-foreground/55 mb-3">Creates an internal follow-up record only. It does not send email, WhatsApp or pricing.</p><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2"><Input label="Reorder cycle days" type="number" value={repeatDraft.cycleDays} onChange={(value) => setRepeatDraft((current) => ({ ...current, cycleDays: value }))} /><Input label="Lead time days" type="number" value={repeatDraft.leadTimeDays} onChange={(value) => setRepeatDraft((current) => ({ ...current, leadTimeDays: value }))} /><Input label="Suggested quantity" value={repeatDraft.quantity} onChange={(value) => setRepeatDraft((current) => ({ ...current, quantity: value }))} /><Input label="Rationale" value={repeatDraft.rationale} onChange={(value) => setRepeatDraft((current) => ({ ...current, rationale: value }))} /></div><Text label="Outreach draft (not sent)" value={repeatDraft.outreach} onChange={(value) => setRepeatDraft((current) => ({ ...current, outreach: value }))} /><button type="button" onClick={() => void prepareRepeatOrder()} disabled={busy !== null || selected.status !== "closed"} className="min-h-11 bg-gradient-gold text-primary-foreground px-5 text-[10px] uppercase tracking-[0.14em] disabled:opacity-50">{busy === "repeat" ? "Preparing…" : "Prepare repeat-order draft"}</button><div className="space-y-2 mt-4">{repeatRows.map((row) => <div key={row.id} className="border border-border/60 p-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3"><div><p className="text-[9px] uppercase tracking-[0.12em] text-gold">{row.priority} · {row.status.replaceAll("_", " ")} · due {row.follow_up_due_date}</p><p className="text-sm mt-1">{row.company_name || row.buyer_name} · {row.product_name}</p><p className="text-xs text-muted-foreground mt-1">{row.rationale || "No rationale recorded"}</p></div><select value={row.status} onChange={(event) => void updateRepeatStatus(row.id, event.target.value as RepeatRow["status"])} disabled={busy !== null} className="min-h-10 border border-border/60 bg-background px-3 text-xs"><option value="draft">draft</option><option value="owner_approved">owner approved</option><option value="contact_prepared">contact prepared</option><option value="contacted">contacted</option><option value="won">won</option><option value="lost">lost</option><option value="dismissed">dismissed</option></select></div>)}</div>
              </Card>

              <Card title="Management report" icon={<Factory size={16} className="text-gold" />}>
                <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-xs"><thead><tr className="text-left text-[9px] uppercase tracking-[0.1em] text-muted-foreground border-b border-border/60"><th className="py-2">Month</th><th>Closeouts</th><th>Closed</th><th>Accepted</th><th>Paid</th><th>Overdue</th><th>Revenue</th><th>Cost</th><th>Margin</th><th>Blocked</th></tr></thead><tbody>{management.map((row) => <tr key={row.report_month} className="border-b border-border/40"><td className="py-2">{row.report_month}</td><td>{row.closeout_count}</td><td>{row.closed_order_count}</td><td>{row.accepted_delivery_count}</td><td>{row.paid_order_count}</td><td>{row.overdue_payment_count}</td><td>{money(row.revenue_base)}</td><td>{money(row.verified_cost_base)}</td><td>{money(row.contribution_margin_base)}</td><td>{row.blocked_closeout_count}</td></tr>)}</tbody></table>{management.length === 0 && <Empty text="No closeout reporting period yet." />}</div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function fail(title: string, description: string) { toast({ title, description, variant: "destructive" }); }
function money(value: number) { return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 }); }
function Metric({ label, value }: { label: string; value: number | string }) { return <div className="border border-border/60 bg-background/30 p-3"><p className="text-[8px] uppercase tracking-[0.11em] text-muted-foreground">{label}</p><p className="font-display text-xl mt-1">{typeof value === "number" ? value.toLocaleString() : value}</p></div>; }
function Mini({ label, value }: { label: string; value: number | string }) { return <div className="border border-border/50 p-2"><p className="text-[7px] uppercase tracking-[0.1em] text-muted-foreground">{label}</p><p className="text-sm mt-0.5">{typeof value === "number" ? value.toLocaleString() : value}</p></div>; }
function Risk({ value }: { value: SummaryRow["closeout_risk"] }) { return <span className={`border px-2 py-1 text-[8px] uppercase ${value === "clear" ? "border-emerald-500/35 text-emerald-300" : value === "blocked" ? "border-red-500/35 text-red-300" : "border-amber-500/35 text-amber-300"}`}>{value}</span>; }
function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) { return <section className="border border-border/60 bg-background/20 p-4"><div className="flex items-center gap-2 mb-4">{icon}<h4 className="font-display text-xl">{title}</h4></div>{children}</section>; }
function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) { return <label className="text-[9px] uppercase tracking-[0.11em] text-muted-foreground">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} className={`${FIELD} mt-1`} /></label>; }
function Text({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block text-[9px] uppercase tracking-[0.11em] text-muted-foreground mt-2">{label}<textarea rows={3} value={value} onChange={(event) => onChange(event.target.value)} className={`${TEXTAREA} mt-1`} /></label>; }
function Action({ onClick, busy, label }: { onClick: () => void | Promise<void>; busy: boolean; label: string }) { return <button type="button" onClick={() => void onClick()} disabled={busy} className="mt-3 min-h-11 bg-gradient-gold text-primary-foreground px-5 text-[10px] uppercase tracking-[0.14em] disabled:opacity-50">{busy ? "Working…" : label}</button>; }
function Empty({ text }: { text: string }) { return <div className="border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">{text}</div>; }
