import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Download,
  Loader2,
  MailCheck,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const db = supabase as any;

const CANDIDATE_COLUMNS = [
  "id",
  "company_name",
  "website",
  "website_domain",
  "country",
  "city",
  "email",
  "phone",
  "whatsapp",
  "buyer_type",
  "product_fit",
  "source_url",
  "source_title",
  "evidence",
  "verification_status",
  "verification_score",
  "imported_lead_id",
  "created_at",
].join(",");

const CRM_COLUMNS = [
  "id",
  "company_name",
  "country",
  "email",
  "phone",
  "whatsapp",
  "website",
  "buyer_type",
  "apparel_segment",
  "crm_status",
  "priority",
  "verification_score",
  "last_outreach_status",
  "last_outreach_at",
  "updated_at",
].join(",");

const OUTREACH_COLUMNS = [
  "id",
  "campaign_id",
  "recipient_company",
  "recipient_email",
  "language",
  "subject",
  "body_text",
  "status",
  "sequence_number",
  "approved_at",
  "sent_at",
  "replied_at",
  "error",
  "created_at",
].join(",");

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
  source_url: string | null;
  source_title: string | null;
  evidence: Record<string, unknown>;
  verification_status: CandidateStatus;
  verification_score: number;
  imported_lead_id: string | null;
  created_at: string;
};

type CrmLead = {
  id: string;
  company_name: string;
  country: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  buyer_type: string | null;
  apparel_segment: string | null;
  crm_status: string | null;
  priority: string | null;
  verification_score: number | null;
  last_outreach_status: string | null;
  last_outreach_at: string | null;
  updated_at: string | null;
};

type OutreachMessage = {
  id: string;
  campaign_id: string;
  recipient_company: string;
  recipient_email: string;
  language: string;
  subject: string;
  body_text: string;
  status: string;
  sequence_number: number;
  approved_at: string | null;
  sent_at: string | null;
  replied_at: string | null;
  error: string | null;
  created_at: string;
};

type ImportOutcome = {
  candidate_id?: string;
  status?: string;
  lead_id?: string;
  error?: string;
};

export default function AdminOutreachCommandCenter() {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [crmLeads, setCrmLeads] = useState<CrmLead[]>([]);
  const [messages, setMessages] = useState<OutreachMessage[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [candidateResult, crmResult, outreachResult] = await Promise.all([
      db
        .from("lead_candidates")
        .select(CANDIDATE_COLUMNS)
        .in("verification_status", ["needs_review", "verified"])
        .is("imported_lead_id", null)
        .order("verification_score", { ascending: false })
        .limit(1000),
      db.from("b2b_leads").select(CRM_COLUMNS).order("updated_at", { ascending: false }).limit(2000),
      db.from("outreach_messages").select(OUTREACH_COLUMNS).order("created_at", { ascending: false }).limit(3000),
    ]);

    const firstError = candidateResult.error || crmResult.error || outreachResult.error;
    if (firstError) {
      setError(firstError.message || "Outreach data could not load");
    }

    setCandidates(((candidateResult.data ?? []) as Candidate[]).map(normalizeCandidate));
    setCrmLeads((crmResult.data ?? []) as CrmLead[]);
    setMessages((outreachResult.data ?? []) as OutreachMessage[]);
    setSelectedIds((current) => new Set([...current].filter((id) => (candidateResult.data ?? []).some((row: Candidate) => row.id === id))));
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const checkAdmin = async () => {
      if (!window.location.pathname.startsWith("/admin")) {
        if (!cancelled) setVisible(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user.id;
      if (!userId) {
        if (!cancelled) setVisible(false);
        return;
      }

      const { data: role } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

      if (cancelled) return;
      const allowed = Boolean(role);
      setVisible(allowed);
      if (allowed) await load();
    };

    void checkAdmin();
    const onPopState = () => void checkAdmin();
    window.addEventListener("popstate", onPopState);
    return () => {
      cancelled = true;
      window.removeEventListener("popstate", onPopState);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const filteredCandidates = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return candidates;
    return candidates.filter((candidate) => [
      candidate.company_name,
      candidate.country,
      candidate.city,
      candidate.email,
      candidate.phone,
      candidate.whatsapp,
      candidate.website_domain,
      candidate.buyer_type,
      candidate.product_fit.join(" "),
      candidate.verification_status,
    ].filter(Boolean).join(" ").toLowerCase().includes(needle));
  }, [candidates, query]);

  const readyCandidates = useMemo(
    () => filteredCandidates.filter((candidate) => approvalBlockers(candidate).length === 0),
    [filteredCandidates],
  );

  const selectedCandidates = useMemo(
    () => candidates.filter((candidate) => selectedIds.has(candidate.id)),
    [candidates, selectedIds],
  );

  const selectedReady = selectedCandidates.filter((candidate) => approvalBlockers(candidate).length === 0);
  const selectedBlocked = selectedCandidates.filter((candidate) => approvalBlockers(candidate).length > 0);

  const approveAndImport = async () => {
    if (selectedReady.length === 0) {
      toast({
        title: "No strictly ready company selected",
        description: "A valid email, website, buyer type, product fit, evidence and score 70+ are required.",
        variant: "destructive",
      });
      return;
    }

    const confirmed = window.confirm(
      `Approve and import ${selectedReady.length} strictly ready compan${selectedReady.length === 1 ? "y" : "ies"} into Buyer CRM? `
      + `${selectedBlocked.length} selected compan${selectedBlocked.length === 1 ? "y is" : "ies are"} blocked and will be skipped. `
      + "This does not generate, approve or send any email or WhatsApp message.",
    );
    if (!confirmed) return;

    setBusy(true);
    const reviewedIds: string[] = [];
    const failures: string[] = [];

    for (const candidate of selectedReady) {
      if (candidate.verification_status === "verified") {
        reviewedIds.push(candidate.id);
        continue;
      }

      const { data, error: reviewError } = await supabase.functions.invoke("lead-research", {
        body: {
          action: "review",
          candidate_id: candidate.id,
          status: "verified",
          verification_score: Math.max(70, candidate.verification_score || 0),
        },
      });

      if (reviewError || data?.ok !== true) {
        failures.push(`${candidate.company_name}: ${data?.error || reviewError?.message || "review failed"}`);
      } else {
        reviewedIds.push(candidate.id);
      }
    }

    let importedCount = 0;
    let skippedCount = 0;
    if (reviewedIds.length > 0) {
      const { data, error: importError } = await supabase.functions.invoke("lead-research", {
        body: { action: "import", candidate_ids: reviewedIds },
      });

      if (importError || data?.ok !== true) {
        failures.push(data?.error || importError?.message || "CRM import failed");
      } else {
        importedCount = Number(data.imported_count || 0);
        skippedCount = Number(data.skipped_count || 0);
        const outcomes = Array.isArray(data.outcomes) ? data.outcomes as ImportOutcome[] : [];
        outcomes
          .filter((outcome) => outcome.status === "failed" || outcome.error)
          .forEach((outcome) => failures.push(outcome.error || `Candidate ${outcome.candidate_id || "unknown"} failed`));
      }
    }

    setBusy(false);
    setSelectedIds(new Set());
    toast({
      title: failures.length === 0 ? "Buyer CRM handoff completed" : "Buyer CRM handoff completed with exceptions",
      description: `${importedCount} imported · ${skippedCount} skipped${failures.length ? ` · ${failures.length} exception(s)` : ""}. No message was sent.`,
      variant: failures.length === 0 ? "default" : "destructive",
    });
    await load();
  };

  const exportCandidateReview = () => {
    const source = selectedCandidates.length > 0 ? selectedCandidates : filteredCandidates;
    downloadCsv(
      `irha-candidate-review-${dateStamp()}.csv`,
      [
        "Company",
        "Country",
        "City",
        "Website",
        "Email",
        "Phone",
        "WhatsApp",
        "Buyer Type",
        "Product Fit",
        "Status",
        "Score",
        "Strict Ready",
        "Blockers",
        "Source",
      ],
      source.map((candidate) => {
        const blockers = approvalBlockers(candidate);
        return [
          candidate.company_name,
          candidate.country || "",
          candidate.city || "",
          candidate.website || "",
          candidate.email || "",
          candidate.phone || "",
          candidate.whatsapp || "",
          candidate.buyer_type || "",
          candidate.product_fit.join(" | "),
          candidate.verification_status,
          candidate.verification_score,
          blockers.length === 0 ? "Yes" : "No",
          blockers.join(" | "),
          candidate.source_url || "",
        ];
      }),
    );
  };

  const exportCrm = () => {
    downloadCsv(
      `irha-buyer-crm-${dateStamp()}.csv`,
      ["Company", "Country", "Email", "Phone", "WhatsApp", "Website", "Buyer Type", "Product Interest", "CRM Status", "Priority", "Score", "Last Outreach", "Last Outreach At"],
      crmLeads.map((lead) => [
        lead.company_name,
        lead.country || "",
        lead.email || "",
        lead.phone || "",
        lead.whatsapp || "",
        lead.website || "",
        lead.buyer_type || "",
        lead.apparel_segment || "",
        lead.crm_status || "",
        lead.priority || "",
        lead.verification_score ?? "",
        lead.last_outreach_status || "",
        lead.last_outreach_at || "",
      ]),
    );
  };

  const exportOutreach = () => {
    downloadCsv(
      `irha-outreach-messages-${dateStamp()}.csv`,
      ["Company", "Email", "Language", "Subject", "Message", "Status", "Sequence", "Approved At", "Sent At", "Replied At", "Error", "Campaign ID"],
      messages.map((message) => [
        message.recipient_company,
        message.recipient_email,
        message.language,
        message.subject,
        message.body_text,
        message.status,
        message.sequence_number,
        message.approved_at || "",
        message.sent_at || "",
        message.replied_at || "",
        message.error || "",
        message.campaign_id,
      ]),
    );
  };

  if (!visible) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed z-[66] right-3 sm:right-5 bottom-[calc(9.5rem+env(safe-area-inset-bottom))] md:bottom-20 min-h-13 inline-flex items-center gap-2 rounded-full border border-gold/70 bg-card/95 px-4 py-3 text-[10px] uppercase tracking-[0.15em] text-gold shadow-2xl backdrop-blur hover:bg-gold hover:text-background"
        aria-label="Open AI outreach command center"
      >
        <Sparkles size={17} /> AI Outreach
      </button>

      {open && (
        <div className="fixed inset-0 z-[110] overflow-y-auto bg-background/97 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="AI outreach command center">
          <header className="sticky top-0 z-20 border-b border-border/70 bg-card/95 px-3 sm:px-6 pt-[env(safe-area-inset-top)] backdrop-blur">
            <div className="mx-auto flex min-h-16 max-w-[1600px] items-center justify-between gap-3">
              <div className="min-w-0 py-2">
                <p className="text-[9px] uppercase tracking-[0.18em] text-gold">Irha Admin · Approval bridge</p>
                <h1 className="truncate font-display text-lg sm:text-xl">AI Outreach Command Center</h1>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => void load()} disabled={loading || busy} className="min-h-11 min-w-11 inline-flex items-center justify-center border border-border/60 text-muted-foreground hover:border-gold hover:text-gold disabled:opacity-40" aria-label="Refresh command center"><RefreshCw size={17} className={loading ? "animate-spin" : ""} /></button>
                <button type="button" onClick={() => setOpen(false)} className="min-h-11 min-w-11 inline-flex items-center justify-center border border-border/60 text-muted-foreground hover:border-gold hover:text-gold" aria-label="Close command center"><X size={19} /></button>
              </div>
            </div>
          </header>

          <main className="mx-auto max-w-[1600px] space-y-5 p-3 pb-12 sm:p-5 lg:p-8">
            <section className="border border-gold/35 bg-gradient-to-br from-gold/10 via-card/40 to-background p-5 sm:p-7">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-4xl">
                  <div className="mb-3 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-gold"><ShieldCheck size={15} /> Owner approval remains mandatory</div>
                  <h2 className="font-display text-3xl sm:text-4xl">Review companies, import them, then approve messages</h2>
                  <p className="mt-3 text-sm leading-relaxed text-foreground/70">This bridge fixes the empty Mailing screen by moving only strictly ready, owner-selected candidates into Buyer CRM. It never generates, approves or sends an email or WhatsApp message.</p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[520px]">
                  <Metric label="Review queue" value={candidates.length} />
                  <Metric label="Strict ready" value={candidates.filter((candidate) => approvalBlockers(candidate).length === 0).length} />
                  <Metric label="CRM buyers" value={crmLeads.length} />
                  <Metric label="Outreach rows" value={messages.length} />
                </div>
              </div>
            </section>

            {error && <div className="border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}

            <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="border border-border/60 bg-card/25">
                <div className="flex flex-col gap-3 border-b border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-gold">Step 1 · Candidate approval</p>
                    <h3 className="mt-1 font-display text-2xl">Select strictly ready companies</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setSelectedIds(new Set(readyCandidates.map((candidate) => candidate.id)))} className="min-h-10 border border-border/60 px-3 text-[9px] uppercase tracking-[0.15em] hover:border-gold hover:text-gold">Select ready</button>
                    <button type="button" onClick={() => setSelectedIds(new Set())} className="min-h-10 border border-border/60 px-3 text-[9px] uppercase tracking-[0.15em] text-muted-foreground hover:border-gold hover:text-gold">Clear</button>
                  </div>
                </div>

                <div className="border-b border-border/60 p-3 sm:p-4">
                  <label className="relative block"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search company, country, email or product fit…" className="min-h-12 w-full border border-border/60 bg-background pl-9 pr-3 text-sm outline-none focus:border-gold" /></label>
                  <p className="mt-2 text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{filteredCandidates.length} visible · {selectedIds.size} selected · {selectedReady.length} ready · {selectedBlocked.length} blocked</p>
                </div>

                <div className="max-h-[64vh] divide-y divide-border/50 overflow-y-auto">
                  {loading ? <p className="p-8 text-center text-sm text-muted-foreground">Loading companies…</p> : filteredCandidates.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">No unimported review candidates.</p> : filteredCandidates.map((candidate) => {
                    const blockers = approvalBlockers(candidate);
                    const ready = blockers.length === 0;
                    return (
                      <label key={candidate.id} className={`block cursor-pointer p-4 hover:bg-muted/15 ${selectedIds.has(candidate.id) ? "bg-gold/5" : ""}`}>
                        <div className="flex items-start gap-3">
                          <input type="checkbox" checked={selectedIds.has(candidate.id)} onChange={() => setSelectedIds((current) => toggleSet(current, candidate.id))} className="mt-1" />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0"><p className="truncate font-display text-lg">{candidate.company_name}</p><p className="mt-1 truncate text-[10px] text-gold">{candidate.email || "Email missing"}</p></div>
                              <span className={`border px-2 py-1 text-[9px] uppercase tracking-[0.14em] ${ready ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-amber-500/40 bg-amber-500/10 text-amber-300"}`}>{ready ? "Strict ready" : "Blocked"}</span>
                            </div>
                            <p className="mt-2 text-xs text-muted-foreground">{candidate.country || "Country missing"} · {candidate.buyer_type || "Buyer type missing"} · score {candidate.verification_score ?? "—"}</p>
                            <p className="mt-1 text-xs text-foreground/65">{candidate.product_fit.length ? candidate.product_fit.join(" · ") : "Product fit missing"}</p>
                            {!ready && <p className="mt-2 text-[10px] text-amber-300">Needs: {blockers.join(" · ")}</p>}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div className="border-t border-border/60 p-4">
                  <button type="button" onClick={() => void approveAndImport()} disabled={busy || selectedReady.length === 0} className="min-h-12 w-full inline-flex items-center justify-center gap-2 bg-gradient-gold px-5 py-3 text-[10px] uppercase tracking-[0.18em] text-primary-foreground disabled:opacity-40">{busy ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />} Approve & import {selectedReady.length || "selected"} to CRM</button>
                  <p className="mt-2 text-center text-[10px] text-muted-foreground">Next: open Mailing, generate AI drafts, review each subject/body, approve, then send in a separate action.</p>
                </div>
              </div>

              <aside className="space-y-5">
                <section className="border border-border/60 bg-card/25 p-5">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-gold">Step 2 · Export center</p>
                  <h3 className="mt-1 font-display text-2xl">Download working files</h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">CSV files open in Excel, Numbers and Google Sheets. Message exports include ready-to-review subjects and bodies, but exclude connector secrets and raw payloads.</p>
                  <div className="mt-4 space-y-2">
                    <ExportButton label={selectedCandidates.length ? `Export selected candidates (${selectedCandidates.length})` : `Export candidate review (${filteredCandidates.length})`} onClick={exportCandidateReview} disabled={filteredCandidates.length === 0 && selectedCandidates.length === 0} />
                    <ExportButton label={`Export Buyer CRM (${crmLeads.length})`} onClick={exportCrm} disabled={crmLeads.length === 0} />
                    <ExportButton label={`Export outreach messages (${messages.length})`} onClick={exportOutreach} disabled={messages.length === 0} />
                  </div>
                </section>

                <section className="border border-emerald-500/30 bg-emerald-500/5 p-5">
                  <div className="flex items-start gap-3"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-300" /><div><p className="font-medium">Existing engines remain active</p><p className="mt-2 text-xs leading-relaxed text-foreground/65">Lead research verifies companies. Mailing generates personalized subjects and messages. Gmail sending requires approval plus a second irreversible confirmation. WhatsApp has its own owner-approved draft/send boundary.</p></div></div>
                </section>

                <section className="border border-border/60 bg-card/25 p-5">
                  <div className="flex items-start gap-3"><MailCheck size={18} className="mt-0.5 shrink-0 text-gold" /><div><p className="font-medium">Daily owner flow</p><ol className="mt-2 space-y-2 text-xs leading-relaxed text-foreground/65"><li>1. Select strict-ready companies here.</li><li>2. Approve and import to Buyer CRM.</li><li>3. Open Mailing and generate drafts.</li><li>4. Review subject and message.</li><li>5. Approve only the correct drafts.</li><li>6. Select approved rows and send.</li></ol></div></div>
                </section>
              </aside>
            </section>
          </main>
        </div>
      )}
    </>
  );
}

function approvalBlockers(candidate: Candidate) {
  const blockers: string[] = [];
  if (!validEmail(candidate.email)) blockers.push("valid business email");
  if (!candidate.website?.trim() && !candidate.website_domain?.trim()) blockers.push("website/domain");
  if (!candidate.buyer_type?.trim()) blockers.push("buyer type");
  if (!Array.isArray(candidate.product_fit) || candidate.product_fit.length === 0) blockers.push("product fit");
  if (!candidate.source_url?.trim()) blockers.push("source evidence");
  if (!candidate.evidence || typeof candidate.evidence !== "object" || Object.keys(candidate.evidence).length === 0) blockers.push("verification evidence");
  if (!Number.isFinite(candidate.verification_score) || candidate.verification_score < 70) blockers.push("score 70+");
  return blockers;
}

function normalizeCandidate(candidate: Candidate): Candidate {
  return {
    ...candidate,
    product_fit: Array.isArray(candidate.product_fit) ? candidate.product_fit.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [],
    evidence: candidate.evidence && typeof candidate.evidence === "object" && !Array.isArray(candidate.evidence) ? candidate.evidence : {},
    verification_score: Number.isFinite(Number(candidate.verification_score)) ? Number(candidate.verification_score) : 0,
  };
}

function validEmail(value: string | null) {
  return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()));
}

function toggleSet(current: Set<string>, id: string) {
  const next = new Set(current);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="border border-border/50 bg-background/25 p-3"><p className="text-[8px] uppercase tracking-[0.15em] text-muted-foreground">{label}</p><p className="mt-1 font-display text-xl tabular-nums">{value.toLocaleString()}</p></div>;
}

function ExportButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled: boolean }) {
  return <button type="button" onClick={onClick} disabled={disabled} className="min-h-11 w-full inline-flex items-center justify-between gap-3 border border-border/60 px-3 text-left text-[9px] uppercase tracking-[0.14em] hover:border-gold hover:text-gold disabled:cursor-not-allowed disabled:opacity-35"><span>{label}</span><Download size={13} /></button>;
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}

function downloadCsv(filename: string, headers: Array<string | number>, rows: Array<Array<string | number>>) {
  const csv = [headers, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  toast({ title: "CSV export prepared", description: filename });
}

function csvCell(value: string | number) {
  const text = String(value ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return `"${text.replace(/"/g, '""')}"`;
}
