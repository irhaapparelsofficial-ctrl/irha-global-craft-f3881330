import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Edit3,
  Loader2,
  MapPin,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  UserCheck,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const db = supabase as any;
const ACTIVATION_CHUNK = 25;
const VALIDATION_CHUNK = 50;
const BAKU_UTC_OFFSET = "+04:00";

type CandidateStatus = "needs_review" | "verified" | "rejected" | "duplicate" | "imported" | "unverified";
type Candidate = {
  id: string;
  company_name: string;
  website: string | null;
  website_domain: string | null;
  country: string | null;
  city: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  buyer_type: string | null;
  product_fit: string[];
  source_url: string;
  source_provider: string;
  evidence: Record<string, any>;
  verification_status: CandidateStatus;
  verification_score: number;
  imported_lead_id: string | null;
  duplicate_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
};
type CrmLead = {
  id: string;
  company_name: string;
  country: string;
  city?: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  buyer_type: string | null;
  apparel_segment: string | null;
  crm_status: string;
  priority: string;
  follow_up_at: string | null;
  last_outreach_at: string | null;
  created_at: string;
};
type ActivationBatch = {
  id: string;
  status: string;
  candidate_ids: string[];
  imported_lead_ids: string[];
  strict_ready_count: number;
  imported_count: number;
  skipped_count: number;
  failed_count: number;
  summary: Record<string, any>;
  errors: any[];
  created_at: string;
  completed_at: string | null;
  rolled_back_at: string | null;
};
type CandidateEdit = {
  company_name: string;
  country: string;
  city: string;
  email: string;
  phone: string;
  whatsapp: string;
  website: string;
  buyer_type: string;
  product_fit: string;
  source_url: string;
};

export default function LeadReviewActivationPanel() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [crmLeads, setCrmLeads] = useState<CrmLead[]>([]);
  const [batches, setBatches] = useState<ActivationBatch[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [edit, setEdit] = useState<CandidateEdit | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("reviewable");
  const [countryFilter, setCountryFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visitLeadId, setVisitLeadId] = useState("");
  const [visitAt, setVisitAt] = useState("");
  const [visitLocation, setVisitLocation] = useState("Baku, Azerbaijan");
  const [visitMode, setVisitMode] = useState("meeting");
  const [visitNotes, setVisitNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [candidateResult, crmResult, batchResult] = await Promise.all([
      db.from("lead_candidates").select("id,company_name,website,website_domain,country,city,email,phone,whatsapp,buyer_type,product_fit,source_url,source_provider,evidence,verification_status,verification_score,imported_lead_id,duplicate_reason,reviewed_at,created_at").order("verification_score", { ascending: false }).limit(3000),
      db.from("b2b_leads").select("id,company_name,country,email,phone,whatsapp,website,buyer_type,apparel_segment,crm_status,priority,follow_up_at,last_outreach_at,created_at").order("created_at", { ascending: false }).limit(3000),
      db.from("lead_activation_batches").select("*").order("created_at", { ascending: false }).limit(40),
    ]);
    const firstError = candidateResult.error || crmResult.error || batchResult.error;
    if (firstError) setError(firstError.message);
    const nextCandidates = ((candidateResult.data || []) as Candidate[]).map((candidate) => ({ ...candidate, product_fit: Array.isArray(candidate.product_fit) ? candidate.product_fit : [], evidence: candidate.evidence || {} }));
    setCandidates(nextCandidates);
    setCrmLeads((crmResult.data || []) as CrmLead[]);
    setBatches((batchResult.data || []) as ActivationBatch[]);
    setSelected((current) => new Set([...current].filter((id) => nextCandidates.some((candidate) => candidate.id === id && !candidate.imported_lead_id))));
    setActiveId((current) => current && nextCandidates.some((candidate) => candidate.id === current) ? current : nextCandidates.find((candidate) => !candidate.imported_lead_id)?.id || null);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const active = candidates.find((candidate) => candidate.id === activeId) || null;
  useEffect(() => { setEdit(active ? editFrom(active) : null); }, [activeId, active?.reviewed_at]);

  const countries = useMemo(() => [...new Set(candidates.map((candidate) => candidate.country || "Unknown"))].sort(), [candidates]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return candidates.filter((candidate) => {
      if (statusFilter === "reviewable" && !["needs_review", "verified", "unverified"].includes(candidate.verification_status)) return false;
      if (statusFilter === "strict_ready" && strictBlockers(candidate).length) return false;
      if (statusFilter !== "all" && !["reviewable", "strict_ready"].includes(statusFilter) && candidate.verification_status !== statusFilter) return false;
      if (countryFilter !== "all" && (candidate.country || "Unknown") !== countryFilter) return false;
      if (!needle) return true;
      return [candidate.company_name, candidate.country, candidate.city, candidate.email, candidate.website_domain, candidate.buyer_type, candidate.product_fit.join(" ")].filter(Boolean).join(" ").toLowerCase().includes(needle);
    });
  }, [candidates, query, statusFilter, countryFilter]);
  const selectedCandidates = candidates.filter((candidate) => selected.has(candidate.id) && !candidate.imported_lead_id);
  const strictReady = candidates.filter((candidate) => !candidate.imported_lead_id && strictBlockers(candidate).length === 0);
  const selectedReady = selectedCandidates.filter((candidate) => strictBlockers(candidate).length === 0);
  const azerbaijanLeads = crmLeads.filter((lead) => /azerbaijan/i.test(lead.country || ""));
  const latestRollbackable = batches.find((batch) => ["completed", "partial", "rollback_partial"].includes(batch.status) && batch.imported_count > 0) || null;

  const saveCandidate = async () => {
    if (!active || !edit) return;
    setBusy("save");
    const { data, error: invokeError } = await supabase.functions.invoke("lead-activation", { body: { action: "update_candidate", candidate_id: active.id, ...edit, product_fit: edit.product_fit.split(/[|;,]/).map((item) => item.trim()).filter(Boolean) } });
    setBusy(null);
    if (invokeError || data?.ok !== true) return toast({ title: "Candidate update failed", description: data?.error || invokeError?.message, variant: "destructive" });
    toast({ title: "Candidate saved", description: "Status returned to needs review. No outreach was sent." });
    await load();
  };

  const validateSelected = async () => {
    if (!selectedCandidates.length) return;
    if (!window.confirm(`Validate business email, MX and website alignment for ${selectedCandidates.length} selected companies? No email will be sent.`)) return;
    setBusy("validate");
    const totals: Record<string, number> = {};
    try {
      for (const ids of chunks(selectedCandidates.map((candidate) => candidate.id), VALIDATION_CHUNK)) {
        const { data, error: invokeError } = await supabase.functions.invoke("lead-activation", { body: { action: "validate", candidate_ids: ids } });
        if (invokeError || data?.ok !== true) throw new Error(data?.error || invokeError?.message || "Validation chunk failed");
        for (const [key, value] of Object.entries(data.summary || {})) totals[key] = (totals[key] || 0) + Number(value || 0);
      }
      toast({ title: "Validation completed", description: summaryText(totals) || "Selected candidates checked. No message was sent." });
      setSelected(new Set());
      await load();
    } catch (failure) {
      toast({ title: "Validation stopped safely", description: failure instanceof Error ? failure.message : "Validation failed", variant: "destructive" });
    } finally { setBusy(null); }
  };

  const activateSelected = async () => {
    if (!selectedReady.length) return toast({ title: "No strict-ready company selected", description: "Validate and correct blocked records first.", variant: "destructive" });
    const blocked = selectedCandidates.length - selectedReady.length;
    if (!window.confirm(`Activate ${selectedReady.length} strict-ready companies into Buyer CRM in ${ACTIVATION_CHUNK}-row checkpoints? ${blocked} blocked selected rows will be skipped. This creates CRM records only and sends no messages.`)) return;
    setBusy("activate");
    const totals = { imported: 0, duplicate: 0, blocked: 0, failed: 0 };
    const batchIds: string[] = [];
    try {
      for (const ids of chunks(selectedReady.map((candidate) => candidate.id), ACTIVATION_CHUNK)) {
        const { data, error: invokeError } = await supabase.functions.invoke("lead-activation", { body: { action: "activate", candidate_ids: ids, owner_confirmed: true } });
        if (invokeError || data?.ok !== true) throw new Error(data?.error || invokeError?.message || "Activation checkpoint failed");
        batchIds.push(data.batch_id);
        for (const key of Object.keys(totals)) totals[key as keyof typeof totals] += Number(data.summary?.[key] || 0);
      }
      toast({ title: "Buyer CRM activation completed", description: `${totals.imported} imported · ${totals.duplicate} duplicate · ${totals.blocked} blocked · ${totals.failed} failed. No message was sent.` });
      setSelected(new Set());
      await load();
    } catch (failure) {
      toast({ title: "Activation stopped at a safe checkpoint", description: `${failure instanceof Error ? failure.message : "Activation failed"}${batchIds.length ? ` · Completed batches: ${batchIds.join(", ")}` : ""}`, variant: "destructive" });
    } finally { setBusy(null); }
  };

  const reviewSelected = async (status: "rejected" | "needs_review") => {
    if (!selectedCandidates.length) return;
    if (!window.confirm(`${status === "rejected" ? "Reject" : "Return to review"} ${selectedCandidates.length} selected candidates?`)) return;
    setBusy(status);
    let failed = 0;
    for (const candidate of selectedCandidates.slice(0, 100)) {
      const { data, error: invokeError } = await supabase.functions.invoke("lead-research", { body: { action: "review", candidate_id: candidate.id, status, verification_score: status === "rejected" ? 0 : candidate.verification_score } });
      if (invokeError || data?.ok !== true) failed += 1;
    }
    setBusy(null);
    setSelected(new Set());
    toast({ title: status === "rejected" ? "Candidate review updated" : "Candidates returned to review", description: failed ? `${failed} updates failed and remain unchanged.` : "All selected records updated." , variant: failed ? "destructive" : "default" });
    await load();
  };

  const rollback = async () => {
    if (!latestRollbackable) return;
    if (!window.confirm(`Attempt safe rollback of activation batch ${latestRollbackable.id}? Only untouched CRM imports will be removed. Records with outreach, tasks, quotations, samples or history changes will remain.`)) return;
    setBusy("rollback");
    const { data, error: invokeError } = await supabase.functions.invoke("lead-activation", { body: { action: "rollback", batch_id: latestRollbackable.id, owner_confirmed: true } });
    setBusy(null);
    if (invokeError || data?.ok !== true) return toast({ title: "Rollback failed", description: data?.error || invokeError?.message, variant: "destructive" });
    toast({ title: "Rollback check completed", description: summaryText(data.summary || {}) || "Rollback processed." });
    await load();
  };

  const scheduleVisit = async () => {
    if (!visitLeadId || !visitAt) return toast({ title: "Buyer and meeting date are required", variant: "destructive" });
    const meetingAt = bakuLocalToIso(visitAt);
    if (!meetingAt) return toast({ title: "Enter a valid Baku meeting date and time", variant: "destructive" });
    setBusy("visit");
    const { data, error: invokeError } = await supabase.functions.invoke("lead-activation", { body: { action: "schedule_visit", lead_id: visitLeadId, meeting_at: meetingAt, location: visitLocation, mode: visitMode, notes: visitNotes, priority: "high" } });
    setBusy(null);
    if (invokeError || data?.ok !== true) return toast({ title: "Visit task could not be saved", description: data?.error || invokeError?.message, variant: "destructive" });
    toast({ title: "Azerbaijan visit task saved", description: "CRM follow-up and buyer history were updated. No message was sent." });
    setVisitNotes("");
    await load();
  };

  const exportReview = () => {
    const source = selectedCandidates.length ? selectedCandidates : filtered;
    const rows = source.map((candidate) => [candidate.company_name, candidate.country || "", candidate.city || "", candidate.email || "", candidate.website || "", candidate.buyer_type || "", candidate.product_fit.join(" | "), candidate.verification_status, candidate.verification_score, emailReady(candidate) ? "YES" : "NO", strictBlockers(candidate).join(" | "), candidate.source_url]);
    downloadCsv(`irha-lead-review-${new Date().toISOString().slice(0, 10)}.csv`, ["Company", "Country", "City", "Email", "Website", "Buyer Type", "Product Fit", "Status", "Score", "Email Ready", "Blockers", "Source"], rows);
  };

  if (loading && !candidates.length) return <div className="py-12 text-center text-sm text-muted-foreground">Loading candidate review and activation history…</div>;

  return (
    <div className="space-y-5">
      <section className="border border-gold/35 bg-gradient-to-br from-gold/10 via-card/40 to-background p-5 sm:p-7">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-4xl"><p className="text-[10px] uppercase tracking-[0.2em] text-gold">Candidate review → audited CRM activation</p><h1 className="mt-2 font-display text-3xl sm:text-4xl">Review, validate and activate buyers safely</h1><p className="mt-3 text-sm leading-relaxed text-foreground/70">Correct candidate data, verify business-email readiness, activate strict-ready companies in small checkpoints, review batch evidence and roll back only untouched imports. This workspace never sends email or WhatsApp.</p></div>
          <div className="flex flex-wrap gap-2"><button type="button" onClick={() => void load()} disabled={Boolean(busy)} className="min-h-11 inline-flex items-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.14em] hover:border-gold hover:text-gold disabled:opacity-40"><RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh</button><button type="button" onClick={exportReview} className="min-h-11 inline-flex items-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.14em] hover:border-gold hover:text-gold"><Download size={13} /> Export</button></div>
        </div>
      </section>

      {error && <div className="border border-red-500/40 bg-red-500/5 p-4 text-sm text-red-200">{error}</div>}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Metric label="All candidates" value={candidates.length} />
        <Metric label="Needs review" value={candidates.filter((item) => item.verification_status === "needs_review").length} />
        <Metric label="Strict ready" value={strictReady.length} />
        <Metric label="CRM buyers" value={crmLeads.length} />
        <Metric label="Rejected/duplicate" value={candidates.filter((item) => ["rejected", "duplicate"].includes(item.verification_status)).length} />
        <Metric label="Activation batches" value={batches.length} />
      </section>

      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1.35fr)_minmax(420px,.65fr)]">
        <div className="border border-border/60 bg-card/25">
          <div className="grid gap-2 border-b border-border/60 p-3 sm:grid-cols-[minmax(0,1fr)_180px_180px] sm:p-4">
            <label className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search company, email, country or product…" className="min-h-12 w-full border border-border/60 bg-background pl-9 pr-3 text-sm outline-none focus:border-gold" /></label>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="min-h-12 border border-border/60 bg-background px-3 text-sm"><option value="reviewable">Reviewable</option><option value="strict_ready">Strict ready</option><option value="all">All statuses</option><option value="needs_review">Needs review</option><option value="verified">Verified</option><option value="imported">Imported</option><option value="rejected">Rejected</option><option value="duplicate">Duplicate</option></select>
            <select value={countryFilter} onChange={(event) => setCountryFilter(event.target.value)} className="min-h-12 border border-border/60 bg-background px-3 text-sm"><option value="all">All countries</option>{countries.map((country) => <option key={country} value={country}>{country}</option>)}</select>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-b border-border/60 p-3"><button type="button" onClick={() => setSelected(new Set(filtered.filter((candidate) => !candidate.imported_lead_id).map((candidate) => candidate.id)))} className="action-button">Select visible</button><button type="button" onClick={() => setSelected(new Set(strictReady.map((candidate) => candidate.id)))} className="action-button">Select strict ready</button><button type="button" onClick={() => setSelected(new Set())} className="action-button">Clear</button><span className="ml-auto text-[10px] uppercase tracking-[0.13em] text-muted-foreground">{filtered.length} visible · {selected.size} selected · {selectedReady.length} activation-ready</span></div>
          <div className="max-h-[68vh] divide-y divide-border/50 overflow-y-auto">
            {filtered.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">No candidate matches the current filters.</p> : filtered.map((candidate) => {
              const blockers = strictBlockers(candidate); const ready = blockers.length === 0;
              return <label key={candidate.id} className={`block cursor-pointer p-4 hover:bg-muted/15 ${activeId === candidate.id ? "bg-gold/5" : ""}`} onClick={() => setActiveId(candidate.id)}><div className="flex items-start gap-3"><input type="checkbox" checked={selected.has(candidate.id)} disabled={Boolean(candidate.imported_lead_id)} onClick={(event) => event.stopPropagation()} onChange={() => setSelected((current) => toggle(current, candidate.id))} className="mt-1" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><p className="truncate font-display text-lg">{candidate.company_name}</p><p className="mt-1 truncate text-[10px] text-gold">{candidate.email || "Email missing"}</p></div><Status status={candidate.verification_status} ready={ready} /></div><p className="mt-2 text-xs text-muted-foreground">{candidate.country || "Country missing"} · {candidate.buyer_type || "Buyer type missing"} · score {candidate.verification_score}</p><p className="mt-1 text-xs text-foreground/65">{candidate.product_fit.length ? candidate.product_fit.join(" · ") : "Product fit missing"}</p>{!ready && <p className="mt-2 text-[10px] text-amber-300">Needs: {blockers.join(" · ")}</p>}</div></div></label>;
            })}
          </div>
          <div className="grid gap-2 border-t border-border/60 p-4 sm:grid-cols-2 xl:grid-cols-4"><button type="button" onClick={() => void validateSelected()} disabled={Boolean(busy) || !selectedCandidates.length} className="primary-action">{busy === "validate" ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />} Validate selected</button><button type="button" onClick={() => void activateSelected()} disabled={Boolean(busy) || !selectedReady.length} className="primary-action">{busy === "activate" ? <Loader2 size={13} className="animate-spin" /> : <UserCheck size={13} />} Activate ready</button><button type="button" onClick={() => void reviewSelected("needs_review")} disabled={Boolean(busy) || !selectedCandidates.length} className="action-button"><AlertTriangle size={13} /> Needs review</button><button type="button" onClick={() => void reviewSelected("rejected")} disabled={Boolean(busy) || !selectedCandidates.length} className="danger-action"><XCircle size={13} /> Reject</button></div>
        </div>

        <aside className="space-y-5">
          <section className="border border-border/60 bg-card/25 p-4 sm:p-5">
            <div className="flex items-center gap-2 text-gold"><Edit3 size={16} /><p className="text-[10px] uppercase tracking-[0.16em]">Candidate editor</p></div>
            {!active || !edit ? <p className="mt-4 text-sm text-muted-foreground">Select a candidate to review its exact data.</p> : <div className="mt-4 space-y-3"><Field label="Company" value={edit.company_name} onChange={(value) => setEdit({ ...edit, company_name: value })} /><div className="grid grid-cols-2 gap-3"><Field label="Country" value={edit.country} onChange={(value) => setEdit({ ...edit, country: value })} /><Field label="City" value={edit.city} onChange={(value) => setEdit({ ...edit, city: value })} /></div><Field label="Business email" value={edit.email} onChange={(value) => setEdit({ ...edit, email: value })} /><div className="grid grid-cols-2 gap-3"><Field label="Phone" value={edit.phone} onChange={(value) => setEdit({ ...edit, phone: value })} /><Field label="WhatsApp" value={edit.whatsapp} onChange={(value) => setEdit({ ...edit, whatsapp: value })} /></div><Field label="Website" value={edit.website} onChange={(value) => setEdit({ ...edit, website: value })} /><Field label="Public source" value={edit.source_url} onChange={(value) => setEdit({ ...edit, source_url: value })} /><Field label="Buyer type" value={edit.buyer_type} onChange={(value) => setEdit({ ...edit, buyer_type: value })} /><Field label="Product fit · separate with |" value={edit.product_fit} onChange={(value) => setEdit({ ...edit, product_fit: value })} /><button type="button" onClick={() => void saveCandidate()} disabled={Boolean(busy) || Boolean(active.imported_lead_id)} className="primary-action w-full">{busy === "save" ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save and revalidate</button></div>}
          </section>

          <section className="border border-border/60 bg-card/25 p-4 sm:p-5"><p className="text-[10px] uppercase tracking-[0.16em] text-gold">Activation audit & rollback</p>{batches.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No activation or validation batch yet.</p> : <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">{batches.slice(0, 12).map((batch) => <div key={batch.id} className="border border-border/50 bg-background/25 p-3"><div className="flex items-center justify-between gap-2"><span className="text-[9px] uppercase tracking-[0.13em] text-gold">{batch.summary?.mode || "activation"}</span><span className="text-[9px] uppercase tracking-[0.13em] text-muted-foreground">{batch.status}</span></div><p className="mt-1 break-all text-[10px]">{batch.id}</p><p className="mt-1 text-xs text-muted-foreground">{batch.imported_count} imported · {batch.skipped_count} skipped · {batch.failed_count} failed</p></div>)}</div>}{latestRollbackable && <button type="button" onClick={() => void rollback()} disabled={Boolean(busy)} className="danger-action mt-4 w-full">{busy === "rollback" ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />} Safe rollback latest activation</button>}<p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">Rollback removes only untouched imports. Any buyer with outreach, tasks, quotations, samples or changed history remains protected.</p></section>
        </aside>
      </section>

      <section className="border border-border/60 bg-card/25 p-4 sm:p-6"><div className="flex items-start gap-3"><MapPin size={19} className="mt-1 shrink-0 text-gold" /><div><p className="text-[10px] uppercase tracking-[0.16em] text-gold">Azerbaijan visit planner</p><h2 className="mt-1 font-display text-2xl">Meeting, walk-in and follow-up task</h2><p className="mt-2 text-sm text-foreground/65">Creates a private CRM task and buyer-history entry only. It does not contact the company. Enter the meeting date and time in Baku time (UTC+4).</p></div></div><div className="mt-5 grid gap-3 lg:grid-cols-5"><select value={visitLeadId} onChange={(event) => setVisitLeadId(event.target.value)} className="field"><option value="">Choose Azerbaijan CRM buyer</option>{azerbaijanLeads.map((lead) => <option key={lead.id} value={lead.id}>{lead.company_name}</option>)}</select><select value={visitMode} onChange={(event) => setVisitMode(event.target.value)} className="field"><option value="meeting">Scheduled meeting</option><option value="walk_in">Walk-in visit</option><option value="call">Preparation call</option></select><input type="datetime-local" value={visitAt} onChange={(event) => setVisitAt(event.target.value)} aria-label="Baku time (UTC+4)" title="Baku time (UTC+4)" className="field" /><input value={visitLocation} onChange={(event) => setVisitLocation(event.target.value)} placeholder="Location" className="field" /><button type="button" onClick={() => void scheduleVisit()} disabled={Boolean(busy) || !visitLeadId || !visitAt} className="primary-action">{busy === "visit" ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Save visit task</button></div><textarea value={visitNotes} onChange={(event) => setVisitNotes(event.target.value)} rows={3} placeholder="Meeting objective, address, contact person, samples to carry…" className="field mt-3 w-full resize-y" /><p className="mt-2 text-xs text-muted-foreground">Azerbaijan CRM buyers available: {azerbaijanLeads.length}. Import verified Azerbaijan companies first if this list is empty.</p></section>

      <style>{`.action-button,.danger-action,.primary-action{min-height:2.75rem;display:inline-flex;align-items:center;justify-content:center;gap:.5rem;border:1px solid hsl(var(--border));padding:.6rem .8rem;font-size:.6rem;text-transform:uppercase;letter-spacing:.13em}.action-button:hover{border-color:hsl(var(--primary));color:hsl(var(--primary))}.danger-action{border-color:rgb(239 68 68 / .45);color:rgb(252 165 165)}.primary-action{border-color:hsl(var(--primary) / .55);color:hsl(var(--primary))}.primary-action:hover{background:hsl(var(--primary));color:hsl(var(--primary-foreground))}.action-button:disabled,.danger-action:disabled,.primary-action:disabled{opacity:.35}.field{min-height:3rem;border:1px solid hsl(var(--border));background:hsl(var(--background));padding:.65rem .75rem;font-size:.8rem;outline:none}.field:focus{border-color:hsl(var(--primary))}`}</style>
    </div>
  );
}

function bakuLocalToIso(value: string) {
  const local = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null;
  const parsed = Date.parse(`${local}:00${BAKU_UTC_OFFSET}`);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}
function editFrom(candidate: Candidate): CandidateEdit { return { company_name: candidate.company_name || "", country: candidate.country || "", city: candidate.city || "", email: candidate.email || "", phone: candidate.phone || "", whatsapp: candidate.whatsapp || "", website: candidate.website || "", buyer_type: candidate.buyer_type || "", product_fit: candidate.product_fit.join(" | "), source_url: candidate.source_url || "" }; }
function emailReady(candidate: Candidate) { return candidate.evidence?.email_readiness?.ready === true; }
function strictBlockers(candidate: Candidate) { const blockers: string[] = []; if (!candidate.company_name) blockers.push("company"); if (!candidate.country) blockers.push("country"); if (!candidate.website && !candidate.source_url) blockers.push("website/source"); if (!candidate.buyer_type) blockers.push("buyer type"); if (!candidate.product_fit.length) blockers.push("product fit"); if (!candidate.evidence || !Object.keys(candidate.evidence).length) blockers.push("evidence"); if (candidate.verification_score < 70) blockers.push("score <70"); const readiness = candidate.evidence?.email_readiness; if (!readiness?.ready) blockers.push(...(Array.isArray(readiness?.reasons) && readiness.reasons.length ? readiness.reasons : ["business email not validated"])); return [...new Set(blockers)]; }
function chunks<T>(values: T[], size: number) { const output: T[][] = []; for (let index = 0; index < values.length; index += size) output.push(values.slice(index, index + size)); return output; }
function toggle(current: Set<string>, id: string) { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; }
function summaryText(summary: Record<string, number>) { return Object.entries(summary).map(([key, value]) => `${value} ${key.replace(/_/g, " ")}`).join(" · "); }
function csvCell(value: unknown) { const text = value == null ? "" : String(value); const safe = /^[\t\r\n ]*[=+\-@]/.test(text) ? `'${text}` : text; return `"${safe.replace(/"/g, '""')}"`; }
function downloadCsv(filename: string, headers: string[], rows: unknown[][]) { const content = `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}`; const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url); }
function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block"><span className="mb-1.5 block text-[9px] uppercase tracking-[0.13em] text-muted-foreground">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} className="field w-full" /></label>; }
function Metric({ label, value }: { label: string; value: number }) { return <div className="border border-border/60 bg-card/30 p-4"><p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p><p className="mt-2 font-display text-2xl tabular-nums">{value.toLocaleString()}</p></div>; }
function Status({ status, ready }: { status: string; ready: boolean }) { const cls = status === "imported" ? "border-emerald-500/40 text-emerald-300" : status === "rejected" || status === "duplicate" ? "border-red-500/40 text-red-300" : ready ? "border-sky-500/40 text-sky-300" : "border-amber-500/40 text-amber-300"; return <span className={`border px-2 py-1 text-[9px] uppercase tracking-[0.13em] ${cls}`}>{status === "verified" && ready ? "strict ready" : status.replace(/_/g, " ")}</span>; }
