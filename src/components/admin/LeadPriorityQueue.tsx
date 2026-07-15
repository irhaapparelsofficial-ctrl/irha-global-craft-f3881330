import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, Mail, RefreshCw, ShieldCheck, Target, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { compareLeadPriority, leadPriority, type LeadPriorityBand } from "@/lib/leadPriority";

const db = supabase as any;

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
  verification_status: string;
  verification_score: number;
  imported_lead_id: string | null;
  created_at: string;
};

const bandStyle: Record<LeadPriorityBand, string> = {
  A: "border-emerald-500/45 bg-emerald-500/[0.08] text-emerald-200",
  B: "border-gold/45 bg-gold/[0.07] text-gold",
  C: "border-amber-500/40 bg-amber-500/[0.07] text-amber-200",
};

const bandCopy: Record<LeadPriorityBand, { title: string; description: string }> = {
  A: { title: "Best buyers", description: "Verified company, website, business email and buyer fit present." },
  B: { title: "Promising", description: "Useful company; complete contact or strict validation before activation." },
  C: { title: "Research", description: "Company fit, source or contact details still need work." },
};

export default function LeadPriorityQueue() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [band, setBand] = useState<LeadPriorityBand | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: loadError } = await db
      .from("lead_candidates")
      .select("id,company_name,website,website_domain,country,city,email,phone,whatsapp,buyer_type,product_fit,source_url,verification_status,verification_score,imported_lead_id,created_at")
      .in("verification_status", ["verified", "needs_review", "unverified"])
      .is("imported_lead_id", null)
      .order("verification_score", { ascending: false })
      .limit(500);

    if (loadError) {
      setError(loadError.message);
      setCandidates([]);
    } else {
      setCandidates(((data || []) as Candidate[]).map((candidate) => ({
        ...candidate,
        product_fit: Array.isArray(candidate.product_fit) ? candidate.product_fit : [],
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const ranked = useMemo(() => [...candidates].sort(compareLeadPriority), [candidates]);
  const counts = useMemo(() => ({
    A: ranked.filter((candidate) => leadPriority(candidate).band === "A").length,
    B: ranked.filter((candidate) => leadPriority(candidate).band === "B").length,
    C: ranked.filter((candidate) => leadPriority(candidate).band === "C").length,
  }), [ranked]);
  const visible = useMemo(
    () => ranked.filter((candidate) => band === "all" || leadPriority(candidate).band === band).slice(0, 12),
    [ranked, band],
  );

  return (
    <section className="overflow-hidden border border-gold/40 bg-gradient-to-br from-card/70 via-card/35 to-gold/[0.04]">
      <div className="flex flex-col gap-4 border-b border-border/60 p-5 sm:p-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-gold"><Target size={16} /><p className="text-[10px] uppercase tracking-[0.18em]">Today’s Buyer Queue</p></div>
          <h1 className="mt-2 font-display text-3xl">Best opportunities first</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-foreground/65">Verified score, public company evidence, business contact and product fit se automatic A/B/C ranking. Ranking sirf review ko easy banati hai; CRM activation aur outreach owner approval ke baghair nahi hoti.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex min-h-11 w-fit items-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.14em] hover:border-gold hover:text-gold disabled:opacity-40">
          {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Refresh queue
        </button>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
        {(["A", "B", "C"] as LeadPriorityBand[]).map((item) => (
          <button key={item} type="button" onClick={() => setBand((current) => current === item ? "all" : item)} className={`min-h-28 border p-4 text-left transition-colors ${bandStyle[item]} ${band === item ? "ring-2 ring-current/40" : "hover:border-current"}`}>
            <div className="flex items-start justify-between gap-3"><span className="font-display text-3xl">{item}</span><span className="font-display text-3xl tabular-nums">{counts[item]}</span></div>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em]">{bandCopy[item].title}</p>
            <p className="mt-1 text-[10px] leading-relaxed opacity-70">{bandCopy[item].description}</p>
          </button>
        ))}
      </div>

      {error && <div className="mx-4 mb-4 border border-red-500/40 bg-red-500/5 p-4 text-sm text-red-200 sm:mx-5">Queue could not load: {error}</div>}

      <div className="border-t border-border/60">
        {loading && !candidates.length ? (
          <div className="p-8 text-center text-sm text-muted-foreground"><Loader2 size={18} className="mx-auto mb-3 animate-spin" /> Loading ranked buyers…</div>
        ) : visible.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground"><Users size={20} className="mx-auto mb-3" /> No buyer in this priority band.</div>
        ) : (
          <div className="grid divide-y divide-border/50 xl:grid-cols-2 xl:divide-x xl:divide-y-0">
            {visible.map((candidate) => {
              const priority = leadPriority(candidate);
              return (
                <article key={candidate.id} className="border-b border-border/50 p-4 last:border-b-0 xl:[&:nth-child(odd)]:border-r xl:[&:nth-last-child(-n+2)]:border-b-0 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center border font-display text-2xl ${bandStyle[priority.band]}`}>{priority.band}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0"><h2 className="truncate font-display text-xl">{candidate.company_name}</h2><p className="mt-1 text-[10px] text-muted-foreground">{[candidate.city, candidate.country].filter(Boolean).join(", ") || "Location pending"} · ranked {priority.score}/100</p></div>
                        <span className="border border-border/60 px-2 py-1 text-[9px] uppercase tracking-[0.12em] text-foreground/60">source score {candidate.verification_score}</span>
                      </div>

                      <p className="mt-3 text-xs font-semibold text-foreground/80">{priority.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-foreground/60">{priority.nextAction}</p>
                      <p className="mt-2 text-[10px] text-muted-foreground">{candidate.buyer_type || "Buyer type pending"} · {candidate.product_fit.length ? candidate.product_fit.join(" · ") : "Product fit pending"}</p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {candidate.website && <a href={candidate.website} target="_blank" rel="noreferrer noopener" className="inline-flex min-h-9 items-center gap-1 border border-border/60 px-3 text-[9px] uppercase tracking-[0.12em] hover:border-gold hover:text-gold"><ExternalLink size={10} /> Website</a>}
                        {candidate.email && <span className="inline-flex min-h-9 items-center gap-1 border border-emerald-500/35 px-3 text-[9px] uppercase tracking-[0.12em] text-emerald-300"><Mail size={10} /> Business email found</span>}
                        <a href="#lead-review-workspace" className="inline-flex min-h-9 items-center gap-1 border border-gold/50 px-3 text-[9px] uppercase tracking-[0.12em] text-gold hover:bg-gold hover:text-background"><ShieldCheck size={10} /> Detailed review below</a>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
