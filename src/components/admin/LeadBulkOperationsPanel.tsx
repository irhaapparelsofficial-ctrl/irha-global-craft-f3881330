import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Loader2,
  MailPlus,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const db = supabase as any;
const PAGE_SIZE = 1000;
const MAX_LOAD = 5000;
const MAX_BULK = 500;
const BATCH_SIZE = 25;
const ELIGIBLE_STATUSES = new Set([
  "qualified",
  "contacted",
  "replied",
  "sample_requested",
  "quote_requested",
  "quotation_sent",
  "negotiation",
  "follow_up",
]);
const ACTIVE_OUTREACH_STATUSES = ["draft", "approved", "sending", "sent", "replied", "manual_required"];

type Lead = {
  id: string;
  company_name: string;
  country: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  apparel_segment: string | null;
  buyer_type: string | null;
  crm_status: string | null;
  verification_score: number | null;
  outreach_opt_out: boolean | null;
  last_outreach_status: string | null;
  updated_at: string;
};

type CampaignForm = {
  name: string;
  productFocus: string;
  targetMarket: string;
  objective: string;
  language: string;
  cta: string;
};

type Progress = {
  current: number;
  total: number;
  created: number;
  failedBatches: number;
};

const initialForm: CampaignForm = {
  name: "AI bulk email outreach",
  productFocus: "Private-label apparel",
  targetMarket: "",
  objective: "Introduce Irha Apparels as an experienced B2B manufacturer and start a conversation about the buyer's wholesale or private-label requirements.",
  language: "auto",
  cta: "Reply with your product requirements or request a scheduled live factory video call.",
};

export default function LeadBulkOperationsPanel({ onDraftsPrepared }: { onDraftsPrepared?: () => void }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [existingLeadIds, setExistingLeadIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const [skipExisting, setSkipExisting] = useState(true);
  const [form, setForm] = useState<CampaignForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"export" | "prepare" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const rows: Lead[] = [];
    for (let offset = 0; offset < MAX_LOAD; offset += PAGE_SIZE) {
      const result = await db
        .from("b2b_leads")
        .select("id,company_name,country,email,phone,whatsapp,website,apparel_segment,buyer_type,crm_status,verification_score,outreach_opt_out,last_outreach_status,updated_at")
        .order("updated_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);
      if (result.error) {
        setError(result.error.message || "Lead data could not load");
        setLoading(false);
        return;
      }
      const page = (result.data || []) as Lead[];
      rows.push(...page);
      if (page.length < PAGE_SIZE) break;
    }

    const messageResult = await db
      .from("outreach_messages")
      .select("lead_id,status")
      .in("status", ACTIVE_OUTREACH_STATUSES)
      .limit(MAX_LOAD);
    if (messageResult.error) {
      setError(messageResult.error.message || "Existing outreach state could not load");
      setLoading(false);
      return;
    }

    setLeads(rows.filter(isEmailEligible));
    setExistingLeadIds(new Set((messageResult.data || []).map((row: { lead_id: string }) => row.lead_id).filter(Boolean)));
    setSelectedIds(new Set());
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const countries = useMemo(
    () => [...new Set(leads.map((lead) => lead.country).filter(Boolean))].sort((left, right) => left.localeCompare(right)),
    [leads],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return leads.filter((lead) => {
      if (country && lead.country !== country) return false;
      if (skipExisting && existingLeadIds.has(lead.id)) return false;
      if (!needle) return true;
      return [lead.company_name, lead.country, lead.email, lead.website, lead.apparel_segment, lead.buyer_type, lead.crm_status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [country, existingLeadIds, leads, query, skipExisting]);

  const selectedLeads = useMemo(() => leads.filter((lead) => selectedIds.has(lead.id)), [leads, selectedIds]);
  const previewRows = filtered.slice(0, 150);

  const selectFiltered = () => {
    const ids = filtered.slice(0, MAX_BULK).map((lead) => lead.id);
    setSelectedIds(new Set(ids));
    if (filtered.length > MAX_BULK) {
      toast({ title: `First ${MAX_BULK} buyers selected`, description: "Export still supports the full filtered list. Bulk draft preparation is capped at 500 per run for safe recovery." });
    }
  };

  const exportCsv = () => {
    const source = selectedLeads.length ? selectedLeads : filtered;
    if (!source.length) {
      toast({ title: "No leads available to export", variant: "destructive" });
      return;
    }
    setBusy("export");
    const headers = [
      "Company",
      "Country",
      "Email",
      "WhatsApp",
      "Phone",
      "Website",
      "Apparel Segment",
      "Buyer Type",
      "CRM Status",
      "Verification Score",
      "Last Outreach Status",
      "Updated At",
    ];
    const rows = source.map((lead) => [
      lead.company_name,
      lead.country,
      validEmail(lead.email) || "",
      lead.whatsapp || "",
      lead.phone || "",
      lead.website || "",
      lead.apparel_segment || "",
      lead.buyer_type || "",
      lead.crm_status || "",
      lead.verification_score ?? "",
      lead.last_outreach_status || "",
      lead.updated_at,
    ]);
    const csv = `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `irha-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setBusy(null);
    toast({ title: "Lead file exported", description: `${source.length} buyer rows downloaded as a safe UTF-8 CSV.` });
  };

  const prepareEmails = async () => {
    const source = (selectedLeads.length ? selectedLeads : filtered)
      .filter((lead) => !skipExisting || !existingLeadIds.has(lead.id))
      .slice(0, MAX_BULK);
    if (!source.length) {
      toast({ title: "No email-ready buyers selected", description: skipExisting ? "Every visible buyer already has outreach or no eligible buyer remains." : "Change the filters or select buyers first.", variant: "destructive" });
      return;
    }
    if (!form.objective.trim() || !form.productFocus.trim()) {
      toast({ title: "Product focus and objective are required", variant: "destructive" });
      return;
    }
    const batches = chunk(source, BATCH_SIZE);
    if (!window.confirm(`Prepare personalized email drafts for ${source.length} buyer${source.length === 1 ? "" : "s"} in ${batches.length} safe batch${batches.length === 1 ? "" : "es"}? Nothing will be sent. Every email will still require your approval.`)) return;

    setBusy("prepare");
    setProgress({ current: 0, total: batches.length, created: 0, failedBatches: 0 });
    let created = 0;
    let failedBatches = 0;
    let latestCampaignId: string | null = null;
    const successfulLeadIds = new Set<string>();

    for (let index = 0; index < batches.length; index += 1) {
      const batch = batches[index];
      const payload = {
        action: "generate",
        lead_ids: batch.map((lead) => lead.id),
        preferred_channel: "email",
        campaign: {
          name: `${form.name.trim() || "AI bulk email outreach"} · Batch ${index + 1}/${batches.length}`,
          product_focus: splitList(form.productFocus),
          target_market: form.targetMarket,
          objective: form.objective,
          language_mode: form.language,
          call_to_action: form.cta,
        },
      };

      const response = await supabase.functions.invoke("outreach-workflow-v2", { body: payload });

      if (response.error || response.data?.ok !== true) {
        failedBatches += 1;
      } else {
        created += Number(response.data.created || 0);
        batch.forEach((lead) => successfulLeadIds.add(lead.id));
        latestCampaignId = typeof response.data.campaign_id === "string" ? response.data.campaign_id : latestCampaignId;
      }
      setProgress({ current: index + 1, total: batches.length, created, failedBatches });
    }

    setBusy(null);
    if (created > 0) {
      setExistingLeadIds((current) => new Set([...current, ...successfulLeadIds]));
      setSelectedIds(new Set());
      onDraftsPrepared?.();
    }
    toast({
      title: failedBatches === 0 ? "Bulk email drafts prepared" : "Bulk preparation completed with saved failures",
      description: `${created} personalized draft${created === 1 ? "" : "s"} created across ${batches.length - failedBatches}/${batches.length} batches. Nothing was sent.${latestCampaignId ? " Open the review queue below." : ""}`,
      variant: failedBatches === 0 ? "default" : "destructive",
    });
  };

  const progressPercent = progress?.total ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <section className="border border-gold/45 bg-gradient-to-br from-gold/10 via-card/35 to-background p-5 md:p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-gold"><ShieldCheck size={15} /> Lead Export & Bulk Email AI</div>
          <h2 className="font-display text-2xl md:text-3xl mt-2">Export buyers and prepare every email safely</h2>
          <p className="text-sm text-foreground/65 mt-2 leading-relaxed">Download selected or filtered CRM leads as CSV. AI can prepare up to 500 personalized email drafts per run in recoverable 25-buyer batches. Drafting never sends; each message remains inside the owner approval queue.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading || busy !== null} className="min-h-11 inline-flex items-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.16em] hover:border-gold hover:text-gold disabled:opacity-40"><RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh</button>
      </div>

      {error && <div className="flex items-start gap-3 border border-red-500/40 bg-red-500/5 p-4 text-sm text-red-200"><AlertTriangle size={16} className="mt-0.5 shrink-0" />{error}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric label="Email-ready buyers" value={leads.length} icon={<Users size={14} />} />
        <Metric label="Current filtered" value={filtered.length} icon={<Search size={14} />} />
        <Metric label="Selected" value={selectedIds.size} icon={<CheckCircle2 size={14} />} />
        <Metric label="Existing outreach" value={existingLeadIds.size} icon={<MailPlus size={14} />} />
      </div>

      <div className="grid xl:grid-cols-12 gap-5">
        <div className="xl:col-span-5 border border-border/60 bg-card/25 p-4 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Search buyers"><div className="flex min-h-11 items-center gap-2 border border-border/60 bg-background/35 px-3"><Search size={13} className="text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Company, email, market…" className="w-full bg-transparent text-xs outline-none" /></div></Field>
            <Field label="Country"><select value={country} onChange={(event) => setCountry(event.target.value)} className="min-h-11 w-full border border-border/60 bg-background/35 px-3 text-xs"><option value="">All countries</option>{countries.map((value) => <option key={value} value={value}>{value}</option>)}</select></Field>
          </div>
          <label className="flex cursor-pointer items-start gap-3 border border-border/60 bg-background/25 p-3"><input type="checkbox" className="mt-1" checked={skipExisting} onChange={(event) => setSkipExisting(event.target.checked)} /><div><p className="text-xs font-medium">Skip buyers with existing outreach</p><p className="text-[10px] text-muted-foreground mt-1">Prevents accidental duplicate drafts or repeat first-contact emails.</p></div></label>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={selectFiltered} disabled={!filtered.length || busy !== null} className="min-h-10 border border-gold/50 px-3 text-[9px] uppercase tracking-[0.14em] text-gold disabled:opacity-40">Select filtered</button>
            <button type="button" onClick={() => setSelectedIds(new Set())} disabled={!selectedIds.size || busy !== null} className="min-h-10 border border-border/60 px-3 text-[9px] uppercase tracking-[0.14em] text-muted-foreground disabled:opacity-40">Clear selection</button>
            <button type="button" onClick={exportCsv} disabled={busy !== null || (!filtered.length && !selectedLeads.length)} className="min-h-10 inline-flex items-center gap-2 border border-border/60 px-3 text-[9px] uppercase tracking-[0.14em] hover:border-gold hover:text-gold disabled:opacity-40">{busy === "export" ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />} Export {selectedLeads.length ? "selected" : "filtered"}</button>
          </div>
          <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
            {loading && <p className="py-8 text-center text-xs text-muted-foreground">Loading CRM leads…</p>}
            {!loading && !previewRows.length && <p className="py-8 text-center text-xs text-muted-foreground">No email-ready buyer matches these filters.</p>}
            {previewRows.map((lead) => <label key={lead.id} className={`flex cursor-pointer items-start gap-3 border p-3 ${selectedIds.has(lead.id) ? "border-gold/60 bg-gold/5" : "border-border/50 bg-background/20"}`}><input type="checkbox" className="mt-1" checked={selectedIds.has(lead.id)} onChange={() => setSelectedIds((current) => toggleSet(current, lead.id, MAX_BULK))} /><div className="min-w-0"><p className="truncate text-xs font-medium">{lead.company_name}</p><p className="truncate text-[10px] text-gold mt-1">{lead.email}</p><p className="text-[9px] text-muted-foreground mt-1">{lead.country} · score {lead.verification_score ?? "—"} · {lead.crm_status || "unreviewed"}</p></div></label>)}
            {filtered.length > previewRows.length && <p className="text-center text-[10px] text-muted-foreground py-2">Showing first {previewRows.length} of {filtered.length}. Select filtered includes up to {MAX_BULK}.</p>}
          </div>
        </div>

        <div className="xl:col-span-7 border border-border/60 bg-card/25 p-4 md:p-5 space-y-4">
          <div><p className="eyebrow">AI campaign brief</p><p className="text-xs text-foreground/60 mt-2">The same verified business positioning is adapted individually for each buyer. Pricing, MOQ, certifications and delivery promises remain blocked.</p></div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Campaign name"><input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="outreach-input" /></Field>
            <Field label="Target market"><input value={form.targetMarket} onChange={(event) => setForm((current) => ({ ...current, targetMarket: event.target.value }))} placeholder="Germany, Azerbaijan, UK…" className="outreach-input" /></Field>
          </div>
          <Field label="Product focus"><textarea rows={2} value={form.productFocus} onChange={(event) => setForm((current) => ({ ...current, productFocus: event.target.value }))} className="outreach-input resize-y" /></Field>
          <Field label="Objective"><textarea rows={4} value={form.objective} onChange={(event) => setForm((current) => ({ ...current, objective: event.target.value }))} className="outreach-input resize-y" /></Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Language"><select value={form.language} onChange={(event) => setForm((current) => ({ ...current, language: event.target.value }))} className="outreach-input"><option value="auto">Auto by market</option><option>English</option><option>German</option><option>French</option><option>Italian</option><option>Spanish</option><option>Arabic</option></select></Field>
            <Field label="Call to action"><textarea rows={2} value={form.cta} onChange={(event) => setForm((current) => ({ ...current, cta: event.target.value }))} className="outreach-input resize-y" /></Field>
          </div>

          {progress && <div className="border border-border/60 bg-background/25 p-4"><div className="flex items-center justify-between gap-3 text-xs"><span>{busy === "prepare" ? "Preparing email batches…" : "Last bulk run"}</span><span className="text-gold">{progress.current}/{progress.total}</span></div><div className="mt-3 h-2 overflow-hidden bg-muted"><div className="h-full bg-gold transition-all" style={{ width: `${progressPercent}%` }} /></div><p className="mt-2 text-[10px] text-muted-foreground">{progress.created} drafts created · {progress.failedBatches} failed batch{progress.failedBatches === 1 ? "" : "es"}. Failed batches are recorded and never counted as success.</p></div>}

          <button type="button" onClick={() => void prepareEmails()} disabled={busy !== null || loading || (!selectedLeads.length && !filtered.length)} className="min-h-12 w-full inline-flex items-center justify-center gap-2 bg-gradient-gold px-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-foreground disabled:opacity-40">{busy === "prepare" ? <Loader2 size={13} className="animate-spin" /> : <MailPlus size={13} />} Prepare {selectedLeads.length ? `${selectedLeads.length} selected` : `${Math.min(filtered.length, MAX_BULK)} filtered`} email drafts</button>
          <p className="text-[10px] leading-relaxed text-muted-foreground">Owner approval remains mandatory. This button creates drafts only; sending still happens one message at a time through the existing Approve & Send popup below.</p>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return <div className="border border-border/60 bg-card/25 p-4"><div className="flex items-center gap-2 text-gold">{icon}<p className="text-[9px] uppercase tracking-[0.14em]">{label}</p></div><p className="font-display text-2xl mt-2 tabular-nums">{value.toLocaleString()}</p></div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1.5 block text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{label}</span>{children}</label>; }
function isEmailEligible(lead: Lead) { const score = Number(lead.verification_score); return !lead.outreach_opt_out && Boolean(validEmail(lead.email)) && ((Number.isFinite(score) && score >= 70) || ELIGIBLE_STATUSES.has(lead.crm_status || "")); }
function validEmail(value: unknown) { const email = typeof value === "string" ? value.trim().toLowerCase() : ""; return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null; }
function splitList(value: string) { return [...new Set(value.split(/[,\n|;]/).map((item) => item.trim()).filter(Boolean))]; }
function toggleSet(current: Set<string>, id: string, limit: number) { const next = new Set(current); if (next.has(id)) next.delete(id); else if (next.size < limit) next.add(id); return next; }
function chunk<T>(values: T[], size: number) { const result: T[][] = []; for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size)); return result; }
function csvCell(value: unknown) { const raw = value == null ? "" : String(value); const safe = /^[=+\-@]/.test(raw.trimStart()) ? `'${raw}` : raw; return `"${safe.replace(/"/g, '""')}"`; }
