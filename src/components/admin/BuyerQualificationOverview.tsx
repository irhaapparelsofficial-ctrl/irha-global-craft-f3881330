import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  RefreshCw,
  SearchCheck,
  ShieldQuestion,
  UserRoundSearch,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  qualifyBuyer,
  type LeadQualificationInput,
  type LeadQualificationResult,
  type QualificationBand,
} from "@/lib/leadQualification";

type Source = "inquiry" | "catalogue" | "prospect";
type BandFilter = "all" | QualificationBand;

type QualifiedBuyer = LeadQualificationInput & {
  source: Source;
  reference: string;
  result: LeadQualificationResult;
};

type InquiryRow = {
  id: string; name: string; email: string | null; phone: string | null; company: string | null; country: string | null;
  category: string | null; quantity: string | null; message: string | null; status: string | null; priority: string | null;
  follow_up_at: string | null; quotation_url: string | null; sample_status: string | null; created_at: string;
  lead_context: Record<string, unknown> | null;
};

type CatalogueRow = {
  id: string; name: string; email: string | null; whatsapp: string | null; company_name: string | null; country: string | null;
  category_interest: string | null; message: string | null; status: string | null; priority: string | null;
  follow_up_at: string | null; quotation_url: string | null; sample_status: string | null; created_at: string;
};

type ProspectRow = {
  id: string; company_name: string; country: string | null; email: string | null; phone: string | null; website: string | null;
  apparel_segment: string | null; buyer_type: string | null; crm_status: string | null; lead_status: string | null;
  priority: string | null; follow_up_at: string | null; quotation_url: string | null; sample_status: string | null; created_at: string;
};

const db = supabase as any;

function legacyStatus(value: string | null) {
  if (value === "Pitched") return "contacted";
  if (value === "Warm") return "qualified";
  if (value === "Replied") return "replied";
  if (value === "Rejected") return "lost";
  return "new";
}

function contextText(context: Record<string, unknown> | null, key: string) {
  const value = context?.[key];
  return typeof value === "string" ? value : null;
}

function normalizeInquiry(row: InquiryRow): LeadQualificationInput {
  return {
    key: `inquiry:${row.id}`,
    kind: "inquiry",
    name: row.name,
    company: row.company,
    country: row.country || contextText(row.lead_context, "destination_country"),
    email: row.email,
    phone: row.phone,
    productInterest: contextText(row.lead_context, "product_name") || row.category,
    quantity: row.quantity,
    message: row.message,
    buyerType: contextText(row.lead_context, "buyer_type"),
    status: row.status || "new",
    priority: row.priority,
    followUpAt: row.follow_up_at,
    quotationUrl: row.quotation_url,
    sampleStatus: row.sample_status,
    createdAt: row.created_at,
  };
}

function normalizeCatalogue(row: CatalogueRow): LeadQualificationInput {
  return {
    key: `catalogue:${row.id}`,
    kind: "catalogue",
    name: row.name,
    company: row.company_name,
    country: row.country,
    email: row.email,
    phone: row.whatsapp,
    productInterest: row.category_interest,
    quantity: null,
    message: row.message,
    buyerType: null,
    status: row.status || "new",
    priority: row.priority,
    followUpAt: row.follow_up_at,
    quotationUrl: row.quotation_url,
    sampleStatus: row.sample_status,
    createdAt: row.created_at,
  };
}

function normalizeProspect(row: ProspectRow): LeadQualificationInput {
  return {
    key: `prospect:${row.id}`,
    kind: "prospect",
    name: row.company_name,
    company: row.company_name,
    country: row.country,
    email: row.email,
    phone: row.phone,
    website: row.website,
    productInterest: row.apparel_segment,
    quantity: null,
    message: null,
    buyerType: row.buyer_type,
    status: row.crm_status || legacyStatus(row.lead_status),
    priority: row.priority,
    followUpAt: row.follow_up_at,
    quotationUrl: row.quotation_url,
    sampleStatus: row.sample_status,
    createdAt: row.created_at,
  };
}

function reference(input: LeadQualificationInput) {
  const prefix = input.kind === "inquiry" ? "IRQ" : input.kind === "catalogue" ? "CAT" : "PRO";
  return `${prefix}-${input.key.split(":")[1].slice(0, 8).toUpperCase()}`;
}

export default function BuyerQualificationOverview() {
  const [buyers, setBuyers] = useState<QualifiedBuyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [band, setBand] = useState<BandFilter>("all");
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const load = async () => {
    setLoading(true);
    const [inquiries, catalogues, prospects] = await Promise.all([
      db.from("inquiries").select("id,name,email,phone,company,country,category,quantity,message,status,priority,follow_up_at,quotation_url,sample_status,created_at,lead_context").order("created_at", { ascending: false }).limit(250),
      db.from("catalogue_leads").select("id,name,email,whatsapp,company_name,country,category_interest,message,status,priority,follow_up_at,quotation_url,sample_status,created_at").order("created_at", { ascending: false }).limit(250),
      db.from("b2b_leads").select("id,company_name,country,email,phone,website,apparel_segment,buyer_type,crm_status,lead_status,priority,follow_up_at,quotation_url,sample_status,created_at").order("created_at", { ascending: false }).limit(500),
    ]);

    const failures = [inquiries.error, catalogues.error, prospects.error]
      .filter(Boolean)
      .map((error: { message?: string }) => error.message || "Source unavailable");
    setErrors(failures);

    const normalized: Array<{ source: Source; input: LeadQualificationInput }> = [
      ...(((inquiries.data ?? []) as InquiryRow[]).map((row) => ({ source: "inquiry" as const, input: normalizeInquiry(row) }))),
      ...(((catalogues.data ?? []) as CatalogueRow[]).map((row) => ({ source: "catalogue" as const, input: normalizeCatalogue(row) }))),
      ...(((prospects.data ?? []) as ProspectRow[]).map((row) => ({ source: "prospect" as const, input: normalizeProspect(row) }))),
    ];

    setBuyers(normalized.map(({ source, input }) => ({
      ...input,
      source,
      reference: reference(input),
      result: qualifyBuyer(input),
    })).sort((a, b) => b.result.actionRank - a.result.actionRank || b.result.score - a.result.score || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    setLastChecked(new Date());
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const stats = useMemo(() => ({
    total: buyers.length,
    strong: buyers.filter((buyer) => buyer.result.band === "strong").length,
    developing: buyers.filter((buyer) => buyer.result.band === "developing").length,
    incomplete: buyers.filter((buyer) => buyer.result.band === "incomplete").length,
    contactMissing: buyers.filter((buyer) => buyer.result.missing.includes("verified contact")).length,
  }), [buyers]);

  const filtered = band === "all" ? buyers : buyers.filter((buyer) => buyer.result.band === band);

  return (
    <section className="mb-6 border border-border/60 bg-card/25">
      <div className="p-4 sm:p-5 md:p-6 border-b border-border/60 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
        <div className="flex items-start gap-3">
          <UserRoundSearch size={20} className="text-gold shrink-0 mt-1" />
          <div>
            <p className="eyebrow mb-2">Buyer Qualification</p>
            <h2 className="font-display text-2xl md:text-3xl">Evidence score & next action</h2>
            <p className="text-sm text-foreground/60 mt-2 max-w-3xl leading-relaxed">
              Transparent completeness scoring from buyer-provided and CRM evidence. This is not revenue prediction and does not invent company size, order probability or buying intent.
            </p>
          </div>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="min-h-11 inline-flex items-center justify-center gap-2 border border-border/60 px-4 py-2 text-[10px] uppercase tracking-[0.16em] hover:border-gold hover:text-gold disabled:opacity-50">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh evidence
        </button>
      </div>

      {errors.length > 0 && (
        <div className="m-4 md:m-5 border border-amber-500/35 bg-amber-500/[0.06] p-4 flex items-start gap-3">
          <AlertTriangle size={17} className="text-amber-300 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-200">Some buyer sources are unavailable.</p>
            <p className="text-xs text-foreground/55 mt-1 break-all">{errors.join(" · ")}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 border-b border-border/60">
        <Metric label="Records" value={stats.total} />
        <Metric label="Strong evidence" value={stats.strong} tone="strong" />
        <Metric label="Developing" value={stats.developing} tone="developing" />
        <Metric label="Incomplete" value={stats.incomplete} tone="incomplete" />
        <Metric label="Contact missing" value={stats.contactMissing} tone={stats.contactMissing > 0 ? "incomplete" : "strong"} />
      </div>

      <div className="p-4 md:p-5 border-b border-border/60 flex gap-2 overflow-x-auto">
        {(["all", "strong", "developing", "incomplete"] as BandFilter[]).map((value) => (
          <button key={value} type="button" onClick={() => setBand(value)} className={`min-h-10 shrink-0 border px-3 py-2 text-[10px] uppercase tracking-[0.15em] ${band === value ? "border-gold text-gold bg-gold/5" : "border-border/60 text-foreground/55"}`}>
            {value === "all" ? "All" : value} {value === "all" ? stats.total : stats[value]}
          </button>
        ))}
      </div>

      <div className="p-4 md:p-5">
        {loading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Reviewing buyer evidence…</p>
        ) : buyers.length === 0 && errors.length === 0 ? (
          <div className="py-10 text-center border border-dashed border-border/50">
            <CircleDashed size={26} className="mx-auto text-gold mb-3" />
            <p className="font-display text-xl">Qualification engine is ready</p>
            <p className="text-xs text-muted-foreground mt-2">Scores and next actions will appear when buyer or prospect records exist.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">No records in this evidence band.</div>
        ) : (
          <div className="space-y-3">
            {filtered.slice(0, 15).map((buyer) => <BuyerRow key={buyer.key} buyer={buyer} />)}
            {filtered.length > 15 && <p className="text-xs text-muted-foreground text-center pt-2">Showing 15 of {filtered.length}. Use the Buyer Inbox below for the full workflow.</p>}
          </div>
        )}
      </div>

      <div className="border-t border-border/60 px-4 sm:px-5 py-3 text-[10px] uppercase tracking-[0.14em] text-foreground/45 flex justify-between gap-3 flex-wrap">
        <span>Score = evidence completeness, not sales probability</span>
        <span>{lastChecked ? `Checked ${lastChecked.toLocaleString()}` : "Not checked"}</span>
      </div>
    </section>
  );
}

function BuyerRow({ buyer }: { buyer: QualifiedBuyer }) {
  const tone = buyer.result.band === "strong"
    ? "border-emerald-500/30 text-emerald-300"
    : buyer.result.band === "developing"
      ? "border-gold/35 text-gold"
      : "border-amber-500/35 text-amber-300";
  const Icon = buyer.result.band === "strong" ? CheckCircle2 : buyer.result.band === "developing" ? SearchCheck : ShieldQuestion;

  return (
    <article className="border border-border/60 bg-background/35 p-4 grid xl:grid-cols-[minmax(0,1.1fr)_120px_minmax(0,1fr)] gap-4 items-start">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 border px-2 py-1 text-[9px] uppercase tracking-[0.14em] ${tone}`}><Icon size={11} /> {buyer.result.band}</span>
          <span className="border border-border/60 px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-foreground/50">{buyer.source}</span>
          <code className="text-[9px] text-foreground/40">{buyer.reference}</code>
        </div>
        <h3 className="font-display text-lg mt-3 truncate">{buyer.company || buyer.name}</h3>
        <p className="text-xs text-foreground/55 mt-1 truncate">{buyer.productInterest || "Product interest not provided"}{buyer.country ? ` · ${buyer.country}` : ""}</p>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {buyer.result.signals.slice(0, 5).map((signal) => <span key={signal} className="border border-border/50 px-2 py-1 text-[9px] text-foreground/55">{signal}</span>)}
        </div>
      </div>

      <div className="xl:text-center">
        <p className={`font-display text-4xl ${tone.split(" ").at(-1)}`}>{buyer.result.score}</p>
        <p className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground mt-1">Evidence score</p>
        <p className="text-[10px] text-foreground/45 mt-2">{buyer.result.missing.length} missing</p>
      </div>

      <div className="border-l-0 xl:border-l border-border/50 xl:pl-4 min-w-0">
        <p className="text-[9px] uppercase tracking-[0.16em] text-gold">Suggested next action</p>
        <p className="text-sm font-medium mt-2">{buyer.result.nextAction}</p>
        <p className="text-xs text-foreground/55 mt-1 leading-relaxed">{buyer.result.actionReason}</p>
        {buyer.result.missing.length > 0 && <p className="text-[10px] text-amber-200/70 mt-2 leading-relaxed">Missing: {buyer.result.missing.slice(0, 4).join(", ")}</p>}
      </div>
    </article>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone?: QualificationBand }) {
  const color = tone === "strong" ? "text-emerald-300" : tone === "developing" ? "text-gold" : tone === "incomplete" ? "text-amber-300" : "text-foreground";
  return (
    <div className="p-4 border-r border-b md:border-b-0 border-border/60 last:border-r-0">
      <p className={`font-display text-2xl ${color}`}>{value}</p>
      <p className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
