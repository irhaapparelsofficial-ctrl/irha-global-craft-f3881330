import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Loader2, RefreshCw, Search, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const db = supabase as any;

type Candidate = {
  id: string;
  company_name: string;
  country: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  buyer_type: string | null;
  product_fit: string[];
  source_url: string;
  evidence: Record<string, unknown>;
  verification_status: string;
  verification_score: number;
  imported_lead_id: string | null;
  created_at: string;
};
type Health = { ok?: boolean; ready?: boolean; error?: string };

export default function ChannelCandidateActivationPanel({ onActivated }: { onActivated: () => void }) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const [candidateResult, healthResult] = await Promise.all([
      db.from("lead_candidates").select("id,company_name,country,email,phone,whatsapp,buyer_type,product_fit,source_url,evidence,verification_status,verification_score,imported_lead_id,created_at").is("imported_lead_id", null).in("verification_status", ["verified", "needs_review"]).order("created_at", { ascending: false }).limit(2000),
      supabase.functions.invoke("lead-activation-channel-v2", { body: { action: "health" } }),
    ]);
    if (candidateResult.error) toast({ title: "Candidates could not load", description: candidateResult.error.message, variant: "destructive" });
    setCandidates(((candidateResult.data || []) as Candidate[]).filter(isChannelReady));
    setHealth(healthResult.error ? { error: healthResult.error.message } : healthResult.data as Health);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return candidates.filter((candidate) => !needle || [candidate.company_name, candidate.country, candidate.email, candidate.whatsapp, candidate.phone, candidate.buyer_type, candidate.product_fit.join(" ")].filter(Boolean).join(" ").toLowerCase().includes(needle));
  }, [candidates, query]);

  const activate = async () => {
    const ids = [...selected].slice(0, 25);
    if (!ids.length) return;
    if (!window.confirm(`Activate ${ids.length} owner-reviewed candidate${ids.length === 1 ? "" : "s"} in Buyer CRM? This does not send email or WhatsApp. It only makes them available for AI draft preparation.`)) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("lead-activation-channel-v2", { body: { action: "activate", candidate_ids: ids, owner_confirmed: true } });
    setBusy(false);
    if (error || data?.ok !== true) {
      toast({ title: "Candidate activation failed", description: data?.error || error?.message || "Unknown error", variant: "destructive" });
      return;
    }
    const imported = Number(data.summary?.imported || 0);
    const blocked = Number(data.summary?.blocked || 0);
    const duplicate = Number(data.summary?.duplicate || 0);
    toast({ title: "Buyer CRM activation completed", description: `${imported} activated · ${duplicate} duplicate · ${blocked} blocked. No message was sent.` });
    setSelected(new Set());
    await load();
    onActivated();
  };

  return (
    <section className="border border-cyan-500/35 bg-cyan-500/[0.04]">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between gap-4 p-4 text-left sm:p-5">
        <div><div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-cyan-300"><UserCheck size={14} /> Step 1 · Activate reviewed leads</div><h2 className="mt-2 font-display text-2xl">File candidates → Buyer CRM</h2><p className="mt-1 text-xs text-foreground/65">Accepts a valid business email or WhatsApp route. Activation creates CRM records and private source-file links only.</p></div>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && (
        <div className="space-y-4 border-t border-cyan-500/25 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex min-w-[240px] flex-1 items-center gap-2 border border-border/60 bg-background/30 px-3 py-2"><Search size={12} className="text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search strict-ready file candidates…" className="w-full bg-transparent text-xs outline-none" /></div>
            <button type="button" onClick={() => void load()} className="inline-flex min-h-10 items-center gap-2 border border-border/60 px-3 text-[9px] uppercase tracking-[0.14em] hover:border-cyan-400"><RefreshCw size={11} className={loading ? "animate-spin" : ""} /> Refresh</button>
            <button type="button" onClick={() => setSelected(new Set(filtered.slice(0, 25).map((candidate) => candidate.id)))} className="text-[9px] uppercase tracking-[0.14em] text-cyan-300">Select visible</button>
            <button type="button" onClick={() => setSelected(new Set())} className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Clear</button>
          </div>

          {!health?.ready && <div className="flex items-start gap-2 border border-red-500/35 bg-red-500/5 p-3 text-xs text-red-200"><AlertTriangle size={13} className="mt-0.5 shrink-0" />Activation backend is not ready. {health?.error || "Apply the pending database migration and deploy the function."}</div>}

          <div className="grid max-h-[320px] gap-2 overflow-y-auto md:grid-cols-2">
            {!filtered.length && <p className="col-span-full py-5 text-center text-xs text-muted-foreground">No strict-ready unimported candidate with email or WhatsApp.</p>}
            {filtered.map((candidate) => {
              const route = validEmail(candidate.email) ? "Email" : "WhatsApp";
              return <label key={candidate.id} className={`cursor-pointer border p-3 ${selected.has(candidate.id) ? "border-cyan-400/70 bg-cyan-500/5" : "border-border/50 bg-background/20"}`}><div className="flex items-start gap-3"><input type="checkbox" className="mt-1" checked={selected.has(candidate.id)} onChange={() => setSelected((current) => toggleSet(current, candidate.id))} /><div className="min-w-0"><p className="truncate text-sm font-medium">{candidate.company_name}</p><p className="mt-1 truncate text-[10px] text-cyan-300">{validEmail(candidate.email) || normalizePhone(candidate.whatsapp || candidate.phone)}</p><p className="mt-1 text-[9px] text-muted-foreground">{candidate.country} · {route} · score {candidate.verification_score} · {candidate.verification_status.replace(/_/g, " ")}</p></div></div></label>;
            })}
          </div>

          <button type="button" onClick={() => void activate()} disabled={busy || !selected.size || !health?.ready} className="inline-flex min-h-11 items-center gap-2 bg-cyan-500 px-5 text-[10px] font-semibold uppercase tracking-[0.17em] text-slate-950 disabled:opacity-40">{busy ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Activate {selected.size} for AI drafts</button>
        </div>
      )}
    </section>
  );
}

function isChannelReady(candidate: Candidate) {
  return Number(candidate.verification_score || 0) >= 70
    && Boolean(candidate.company_name?.trim())
    && Boolean(candidate.country?.trim())
    && Boolean(candidate.source_url?.trim())
    && Boolean(candidate.buyer_type?.trim())
    && Array.isArray(candidate.product_fit) && candidate.product_fit.length > 0
    && candidate.evidence && Object.keys(candidate.evidence).length > 0
    && Boolean(validEmail(candidate.email) || normalizePhone(candidate.whatsapp || candidate.phone));
}
function validEmail(value: unknown) { const email = typeof value === "string" ? value.trim().toLowerCase() : ""; return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null; }
function normalizePhone(value: unknown) { const raw = typeof value === "string" ? value.trim() : ""; const match = raw.match(/(?:\+|00)?\d[\d\s().\/-]{6,}\d/)?.[0] || ""; const digits = match.replace(/\D/g, ""); return digits.length >= 7 && digits.length <= 16 ? match.trim() : null; }
function toggleSet(current: Set<string>, id: string) { const next = new Set(current); if (next.has(id)) next.delete(id); else if (next.size < 25) next.add(id); return next; }
