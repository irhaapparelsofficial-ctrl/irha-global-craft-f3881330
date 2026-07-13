import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarCheck2,
  CheckCircle2,
  FilePlus2,
  Link2,
  RefreshCw,
  ShieldCheck,
  UsersRound,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { SalesCard } from "@/lib/salesPipeline";

const db = supabase as any;
const FIELD = "min-h-12 w-full rounded-md border border-border/60 bg-background px-3 text-sm text-foreground outline-none focus:border-gold";

type Meeting = {
  id: string;
  meeting_reference: string;
  title: string;
  meeting_type: string;
  start_at: string;
  end_at: string;
  timezone: string;
  location_url: string | null;
  status: "scheduled" | "completed" | "cancelled" | "no_show";
  outcome_notes: string | null;
};

type Quotation = {
  id: string;
  quotation_number: string;
  currency: string;
  status: string;
  valid_until: string;
  incoterm: string;
  subtotal: number | string;
  shipping_amount: number | string;
  discount_amount: number | string;
  total_amount: number | string;
  created_at: string;
};

type DuplicateCandidate = {
  candidate_source_type: "inquiry" | "catalogue" | "prospect";
  candidate_source_id: string;
  display_name: string | null;
  company_name: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  match_type: "email" | "phone" | "email_and_phone";
  match_score: number;
  already_linked: boolean;
};

type QuoteDraft = {
  currency: "USD" | "EUR" | "GBP" | "AUD" | "CAD" | "AED";
  validUntil: string;
  incoterm: string;
  shippingScope: string;
  paymentTerms: string;
  notes: string;
};

function futureDate(days: number) {
  const value = new Date();
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

function defaultQuote(): QuoteDraft {
  return {
    currency: "USD",
    validUntil: futureDate(14),
    incoterm: "FOB",
    shippingScope: "Shipping scope will be confirmed after destination, weight and service review.",
    paymentTerms: "Payment terms require owner approval before this quotation can be approved or sent.",
    notes: "",
  };
}

function money(value: number | string, currency: string) {
  const amount = Number(value || 0);
  return `${currency} ${Number.isFinite(amount) ? amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}`;
}

export default function BuyerClosureActionsPanel({ card, onChanged }: { card: SalesCard; onChanged: () => void }) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);
  const [quote, setQuote] = useState<QuoteDraft>(() => defaultQuote());
  const [duplicateReasons, setDuplicateReasons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [meetingResult, quotationResult, duplicateResult] = await Promise.all([
      db
        .from("crm_meetings")
        .select("id,meeting_reference,title,meeting_type,start_at,end_at,timezone,location_url,status,outcome_notes")
        .eq("source_type", card.source)
        .eq("source_id", card.sourceId)
        .order("start_at", { ascending: false })
        .limit(100),
      db
        .from("crm_quotations")
        .select("id,quotation_number,currency,status,valid_until,incoterm,subtotal,shipping_amount,discount_amount,total_amount,created_at")
        .eq("source_type", card.source)
        .eq("source_id", card.sourceId)
        .order("created_at", { ascending: false })
        .limit(100),
      db.rpc("crm_find_duplicate_candidates", {
        _source_type: card.source,
        _source_id: card.sourceId,
        _limit: 25,
      }),
    ]);

    setMeetings((meetingResult.data || []) as Meeting[]);
    setQuotations((quotationResult.data || []) as Quotation[]);
    setDuplicates((duplicateResult.data || []) as DuplicateCandidate[]);
    setQuote(defaultQuote());
    setError(meetingResult.error?.message || quotationResult.error?.message || duplicateResult.error?.message || null);
    setLoading(false);
  }, [card]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeMeetings = useMemo(() => meetings.filter((row) => row.status === "scheduled"), [meetings]);
  const finalMeetings = useMemo(() => meetings.filter((row) => row.status !== "scheduled"), [meetings]);
  const unlinkedDuplicates = useMemo(() => duplicates.filter((row) => !row.already_linked), [duplicates]);

  const createQuotation = async () => {
    if (!quote.validUntil || quote.incoterm.trim().length < 2 || quote.shippingScope.trim().length < 2 || quote.paymentTerms.trim().length < 2) {
      toast({ title: "Quotation handoff is incomplete", description: "Validity, Incoterm, shipping scope and payment review note are required.", variant: "destructive" });
      return;
    }

    setBusy("quotation");
    const { data, error: rpcError } = await db.rpc("crm_create_buyer_quotation_handoff", {
      _source_type: card.source,
      _source_id: card.sourceId,
      _currency: quote.currency,
      _valid_until: quote.validUntil,
      _incoterm: quote.incoterm.trim(),
      _shipping_scope: quote.shippingScope.trim(),
      _payment_terms: quote.paymentTerms.trim(),
      _notes: quote.notes.trim() || null,
    });
    setBusy(null);

    if (rpcError) {
      toast({ title: "Quotation draft was not created", description: rpcError.message, variant: "destructive" });
      return;
    }

    setQuotations((current) => [data as Quotation, ...current]);
    setQuote(defaultQuote());
    toast({ title: "Quotation draft created", description: "Pricing is still empty. Owner review and line items are required before approval or sending." });
    onChanged();
  };

  const confirmDuplicate = async (candidate: DuplicateCandidate) => {
    const key = `${candidate.candidate_source_type}:${candidate.candidate_source_id}`;
    const reason = (duplicateReasons[key] || `Exact ${candidate.match_type.replace(/_/g, " + ")} match reviewed by owner.`).trim();
    const label = candidate.company_name || candidate.display_name || candidate.email || candidate.phone || "this buyer record";
    if (!window.confirm(`Confirm that ${label} is the same buyer? No record will be deleted.`)) return;

    setBusy(`duplicate:${key}`);
    const { error: rpcError } = await db.rpc("crm_confirm_same_buyer", {
      _left_source_type: card.source,
      _left_source_id: card.sourceId,
      _right_source_type: candidate.candidate_source_type,
      _right_source_id: candidate.candidate_source_id,
      _reason: reason,
    });
    setBusy(null);

    if (rpcError) {
      toast({ title: "Buyer records were not linked", description: rpcError.message, variant: "destructive" });
      return;
    }

    setDuplicates((current) => current.map((row) => row.candidate_source_id === candidate.candidate_source_id && row.candidate_source_type === candidate.candidate_source_type ? { ...row, already_linked: true } : row));
    toast({ title: "Same buyer confirmed", description: "Records are linked safely. Neither source record was deleted." });
    onChanged();
  };

  return (
    <section className="mt-5 space-y-5 border border-gold/35 bg-card/20 p-4 sm:p-6">
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
        <div className="flex items-start gap-3">
          <ShieldCheck size={21} className="text-gold shrink-0 mt-1" />
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-gold">CRM closure · Backend guarded</p>
            <h3 className="font-display text-2xl sm:text-3xl mt-1">Meeting outcomes, quotation handoff and duplicate safety</h3>
            <p className="text-sm text-foreground/65 mt-2 max-w-4xl leading-relaxed">
              Close real meeting outcomes, start an owner-review quotation draft, and connect exact duplicate buyer records without deleting data. Nothing is sent externally from this panel.
            </p>
          </div>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="min-h-11 inline-flex items-center justify-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.16em] text-muted-foreground hover:border-gold hover:text-gold disabled:opacity-50">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh closure data
        </button>
      </div>

      {error && <div className="border border-red-500/40 bg-red-500/[0.05] p-4 text-sm text-red-200">{error}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <Metric label="Open meetings" value={activeMeetings.length} />
        <Metric label="Final meetings" value={finalMeetings.length} />
        <Metric label="Quotation drafts" value={quotations.filter((row) => row.status === "draft").length} />
        <Metric label="Duplicate matches" value={unlinkedDuplicates.length} />
      </div>

      <div className="grid xl:grid-cols-2 gap-5">
        <section className="border border-border/60 bg-background/25 p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-2"><CalendarCheck2 size={18} className="text-gold" /><h4 className="font-display text-xl">Meeting outcomes</h4></div>
          {loading ? <p className="text-sm text-muted-foreground py-6">Loading meetings…</p> : meetings.length === 0 ? (
            <Empty text="No meeting has been scheduled for this buyer yet." />
          ) : (
            <div className="space-y-3">
              {meetings.map((row) => (
                <MeetingOutcomeCard
                  key={row.id}
                  meeting={row}
                  busy={busy === `meeting:${row.id}`}
                  onSave={async (status, notes) => {
                    setBusy(`meeting:${row.id}`);
                    const { data, error: rpcError } = await db.rpc("crm_set_meeting_outcome", { _meeting_id: row.id, _status: status, _outcome_notes: notes });
                    setBusy(null);
                    if (rpcError) {
                      toast({ title: "Meeting outcome was not saved", description: rpcError.message, variant: "destructive" });
                      return;
                    }
                    setMeetings((current) => current.map((item) => item.id === row.id ? data as Meeting : item));
                    toast({ title: "Meeting outcome saved" });
                    onChanged();
                  }}
                />
              ))}
            </div>
          )}
        </section>

        <section className="border border-border/60 bg-background/25 p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-2"><FilePlus2 size={18} className="text-gold" /><h4 className="font-display text-xl">Create quotation handoff</h4></div>
          <p className="text-xs text-muted-foreground leading-relaxed">This creates a private zero-value draft linked to the buyer. Product lines, prices, margin, discount and final terms stay pending for owner review.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Currency"><select value={quote.currency} onChange={(event) => setQuote({ ...quote, currency: event.target.value as QuoteDraft["currency"] })} className={FIELD}><option>USD</option><option>EUR</option><option>GBP</option><option>AUD</option><option>CAD</option><option>AED</option></select></Field>
            <Field label="Valid until *"><input type="date" value={quote.validUntil} onChange={(event) => setQuote({ ...quote, validUntil: event.target.value })} className={FIELD} /></Field>
            <Field label="Incoterm / scope *"><input value={quote.incoterm} onChange={(event) => setQuote({ ...quote, incoterm: event.target.value })} className={FIELD} placeholder="FOB, CIF, DDP subject to review…" /></Field>
          </div>
          <Field label="Shipping scope *"><textarea rows={3} value={quote.shippingScope} onChange={(event) => setQuote({ ...quote, shippingScope: event.target.value })} className={`${FIELD} py-3`} /></Field>
          <Field label="Payment review note *"><textarea rows={3} value={quote.paymentTerms} onChange={(event) => setQuote({ ...quote, paymentTerms: event.target.value })} className={`${FIELD} py-3`} /></Field>
          <Field label="Internal notes"><textarea rows={3} value={quote.notes} onChange={(event) => setQuote({ ...quote, notes: event.target.value })} className={`${FIELD} py-3`} placeholder="Missing buyer inputs, sample status, requested specification…" /></Field>
          <button type="button" onClick={() => void createQuotation()} disabled={busy === "quotation"} className="min-h-12 inline-flex items-center justify-center gap-2 bg-gradient-gold px-5 text-[10px] uppercase tracking-[0.16em] text-background disabled:opacity-50">
            <FilePlus2 size={14} /> {busy === "quotation" ? "Creating…" : "Create private quotation draft"}
          </button>

          {quotations.length > 0 && (
            <div className="pt-3 border-t border-border/50 space-y-2">
              <p className="text-[10px] uppercase tracking-[0.15em] text-gold">Buyer quotations</p>
              {quotations.map((row) => (
                <div key={row.id} className="border border-border/50 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-medium">{row.quotation_number}</p><p className="text-xs text-muted-foreground mt-1">{row.incoterm} · Valid until {row.valid_until}</p></div><span className="border border-border/60 px-2 py-1 text-[9px] uppercase tracking-[0.13em] text-muted-foreground">{row.status}</span></div>
                  <p className="text-xs mt-2">{money(row.total_amount, row.currency)}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="border border-border/60 bg-background/25 p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2"><UsersRound size={18} className="text-gold" /><h4 className="font-display text-xl">Safe duplicate review</h4></div>
        <p className="text-xs text-muted-foreground leading-relaxed">Only exact normalized email or phone matches appear. Confirming creates a reversible relationship link; it does not delete, overwrite or silently merge either record.</p>
        {loading ? <p className="text-sm text-muted-foreground py-6">Checking exact matches…</p> : duplicates.length === 0 ? (
          <Empty text="No exact duplicate email or phone match found." />
        ) : (
          <div className="grid lg:grid-cols-2 gap-3">
            {duplicates.map((candidate) => {
              const key = `${candidate.candidate_source_type}:${candidate.candidate_source_id}`;
              return (
                <article key={key} className={`border p-4 ${candidate.already_linked ? "border-emerald-500/35 bg-emerald-500/[0.03]" : "border-border/60"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><p className="text-[9px] uppercase tracking-[0.14em] text-gold">{candidate.candidate_source_type} · {candidate.match_type.replace(/_/g, " + ")} · {candidate.match_score}%</p><h5 className="font-display text-lg mt-1 truncate">{candidate.company_name || candidate.display_name || "Buyer record"}</h5><p className="text-xs text-muted-foreground mt-1 break-all">{candidate.email || candidate.phone || "Contact evidence unavailable"}</p><p className="text-xs text-muted-foreground mt-1">{candidate.country || "Country missing"}</p></div>
                    {candidate.already_linked ? <CheckCircle2 size={19} className="text-emerald-300 shrink-0" /> : <Link2 size={19} className="text-gold shrink-0" />}
                  </div>
                  {!candidate.already_linked && (
                    <>
                      <input value={duplicateReasons[key] || ""} onChange={(event) => setDuplicateReasons((current) => ({ ...current, [key]: event.target.value }))} placeholder={`Reason: Exact ${candidate.match_type.replace(/_/g, " + ")} reviewed by owner`} className={`${FIELD} mt-3`} />
                      <button type="button" onClick={() => void confirmDuplicate(candidate)} disabled={busy === `duplicate:${key}`} className="mt-3 min-h-11 inline-flex items-center justify-center gap-2 border border-gold/50 px-4 text-[10px] uppercase tracking-[0.15em] text-gold disabled:opacity-50"><Link2 size={13} /> {busy === `duplicate:${key}` ? "Linking…" : "Confirm same buyer"}</button>
                    </>
                  )}
                  {candidate.already_linked && <p className="text-xs text-emerald-300 mt-3">Already confirmed as the same buyer. Both original records are preserved.</p>}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}

function MeetingOutcomeCard({ meeting, busy, onSave }: { meeting: Meeting; busy: boolean; onSave: (status: "completed" | "cancelled" | "no_show", notes: string) => Promise<void> }) {
  const [status, setStatus] = useState<"completed" | "cancelled" | "no_show">(meeting.status === "scheduled" ? "completed" : meeting.status as "completed" | "cancelled" | "no_show");
  const [notes, setNotes] = useState(meeting.outcome_notes || "");

  useEffect(() => {
    setStatus(meeting.status === "scheduled" ? "completed" : meeting.status as "completed" | "cancelled" | "no_show");
    setNotes(meeting.outcome_notes || "");
  }, [meeting]);

  const final = meeting.status !== "scheduled";
  return (
    <article className={`border p-3 sm:p-4 ${final ? "border-emerald-500/25" : "border-border/55"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-[9px] uppercase tracking-[0.14em] text-gold">{meeting.meeting_reference} · {meeting.meeting_type.replace(/_/g, " ")}</p><p className="text-sm font-medium mt-1">{meeting.title}</p><p className="text-xs text-muted-foreground mt-1">{new Date(meeting.start_at).toLocaleString()} · {meeting.timezone}</p></div><span className="border border-border/60 px-2 py-1 text-[9px] uppercase tracking-[0.13em] text-muted-foreground">{meeting.status.replace(/_/g, " ")}</span></div>
      <div className="grid sm:grid-cols-[170px_minmax(0,1fr)] gap-2 mt-3">
        <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className={FIELD}><option value="completed">Completed</option><option value="cancelled">Cancelled</option><option value="no_show">No show</option></select>
        <input value={notes} onChange={(event) => setNotes(event.target.value)} className={FIELD} placeholder="What happened and what is the next action?" />
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        <button type="button" onClick={() => void onSave(status, notes.trim())} disabled={busy || notes.trim().length < 3} className="min-h-10 inline-flex items-center gap-2 border border-gold/50 px-3 text-[9px] uppercase tracking-[0.14em] text-gold disabled:opacity-40"><CalendarCheck2 size={12} /> {busy ? "Saving…" : final ? "Update outcome" : "Save outcome"}</button>
        {meeting.location_url && <a href={meeting.location_url} target="_blank" rel="noreferrer" className="min-h-10 inline-flex items-center gap-2 border border-sky-500/35 px-3 text-[9px] uppercase tracking-[0.14em] text-sky-300">Open meeting link</a>}
      </div>
    </article>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="space-y-2 text-xs text-muted-foreground"><span>{label}</span>{children}</label>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="border border-border/55 bg-background/35 p-3 sm:p-4"><p className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground">{label}</p><p className="font-display text-2xl mt-1 tabular-nums">{value}</p></div>;
}

function Empty({ text }: { text: string }) {
  return <div className="border border-dashed border-border/60 p-6 text-center"><XCircle size={20} className="mx-auto text-muted-foreground" /><p className="text-sm text-muted-foreground mt-2">{text}</p></div>;
}
