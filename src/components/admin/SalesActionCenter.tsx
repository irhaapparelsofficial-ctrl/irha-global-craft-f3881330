import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
  FlaskConical,
  RefreshCw,
  UserRoundCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { AdminView } from "./AdminShell";

type Source = "inquiry" | "catalogue" | "prospect";
type Priority = "low" | "normal" | "high" | "urgent";
type Filter = "all" | "overdue" | "today" | "urgent" | "quote" | "sample" | "new";

type Buyer = {
  key: string;
  source: Source;
  id: string;
  name: string;
  company: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  priority: Priority;
  followUpAt: string | null;
  quotationUrl: string | null;
  piUrl: string | null;
  sampleStatus: string;
  createdAt: string;
};

type Action = {
  key: string;
  buyer: Buyer;
  kind: Exclude<Filter, "all">;
  title: string;
  detail: string;
  dueAt: string | null;
  rank: number;
};

type InquiryRow = {
  id: string; name: string; email: string | null; phone: string | null; company: string | null; country: string | null;
  status: string; priority: string | null; follow_up_at: string | null; quotation_url: string | null; pi_url: string | null;
  sample_status: string | null; created_at: string;
};

type CatalogueRow = {
  id: string; name: string; email: string | null; whatsapp: string | null; company_name: string | null; country: string | null;
  status: string; priority: string | null; follow_up_at: string | null; quotation_url: string | null; pi_url: string | null;
  sample_status: string | null; created_at: string;
};

type ProspectRow = {
  id: string; company_name: string; email: string | null; phone: string | null; country: string | null;
  crm_status: string | null; lead_status: string | null; priority: string | null; follow_up_at: string | null;
  quotation_url: string | null; pi_url: string | null; sample_status: string | null; created_at: string;
};

const CLOSED = new Set(["won", "lost", "spam", "unqualified"]);
const ACTIVE_ACTION = new Set(["new", "read", "qualified", "contacted", "replied", "sample_requested", "quote_requested", "quotation_sent", "negotiation", "follow_up", "quoted", "waiting"]);
const PRIORITY_ORDER: Record<Priority, number> = { urgent: 4, high: 3, normal: 2, low: 1 };

function normalizePriority(value: string | null): Priority {
  return value === "urgent" || value === "high" || value === "low" ? value : "normal";
}

function legacyStatus(value: string | null) {
  if (value === "Pitched") return "contacted";
  if (value === "Warm") return "qualified";
  if (value === "Replied") return "replied";
  if (value === "Rejected") return "lost";
  return "new";
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

function sourceLabel(source: Source) {
  if (source === "inquiry") return "RFQ / Inquiry";
  if (source === "catalogue") return "Catalogue";
  return "Imported Prospect";
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function contactLabel(buyer: Buyer) {
  return buyer.company || buyer.email || buyer.phone || buyer.name;
}

function deriveAction(buyer: Buyer): Action | null {
  if (CLOSED.has(buyer.status) || !ACTIVE_ACTION.has(buyer.status)) return null;

  const now = Date.now();
  const start = startOfToday();
  const end = start + 86_400_000;
  const followTime = buyer.followUpAt ? new Date(buyer.followUpAt).getTime() : Number.NaN;

  if (Number.isFinite(followTime) && followTime < now) {
    return {
      key: `${buyer.key}:overdue`, buyer, kind: "overdue", rank: 100 + PRIORITY_ORDER[buyer.priority],
      title: "Overdue follow-up",
      detail: `Scheduled follow-up passed while buyer is ${statusLabel(buyer.status)}.`,
      dueAt: buyer.followUpAt,
    };
  }

  if (Number.isFinite(followTime) && followTime >= start && followTime < end) {
    return {
      key: `${buyer.key}:today`, buyer, kind: "today", rank: 90 + PRIORITY_ORDER[buyer.priority],
      title: "Follow up today",
      detail: `Buyer is currently ${statusLabel(buyer.status)}.`,
      dueAt: buyer.followUpAt,
    };
  }

  if (buyer.status === "quote_requested" && !buyer.quotationUrl) {
    return {
      key: `${buyer.key}:quote`, buyer, kind: "quote", rank: 80 + PRIORITY_ORDER[buyer.priority],
      title: "Prepare quotation",
      detail: "Quote requested, but no quotation link is attached to the CRM record.",
      dueAt: buyer.followUpAt,
    };
  }

  if (buyer.status === "sample_requested" && !["sent", "approved"].includes(buyer.sampleStatus)) {
    return {
      key: `${buyer.key}:sample`, buyer, kind: "sample", rank: 75 + PRIORITY_ORDER[buyer.priority],
      title: "Advance sample request",
      detail: `Current sample stage: ${statusLabel(buyer.sampleStatus || "not_requested")}.`,
      dueAt: buyer.followUpAt,
    };
  }

  if (buyer.status === "new" || buyer.status === "read") {
    return {
      key: `${buyer.key}:new`, buyer, kind: "new", rank: 70 + PRIORITY_ORDER[buyer.priority],
      title: "Review new buyer",
      detail: "Buyer record has not yet moved into qualification or contact.",
      dueAt: buyer.followUpAt,
    };
  }

  if ((buyer.priority === "urgent" || buyer.priority === "high") && !buyer.followUpAt) {
    return {
      key: `${buyer.key}:urgent`, buyer, kind: "urgent", rank: 60 + PRIORITY_ORDER[buyer.priority],
      title: "Schedule next action",
      detail: `${statusLabel(buyer.priority)}-priority buyer has no follow-up date.`,
      dueAt: null,
    };
  }

  if (["replied", "negotiation", "follow_up", "quotation_sent"].includes(buyer.status) && !buyer.followUpAt) {
    return {
      key: `${buyer.key}:urgent`, buyer, kind: "urgent", rank: 55 + PRIORITY_ORDER[buyer.priority],
      title: "Define next sales step",
      detail: `${statusLabel(buyer.status)} record has no scheduled follow-up.`,
      dueAt: null,
    };
  }

  return null;
}

function formatDate(value: string | null) {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function SalesActionCenter({ go }: { go: (view: AdminView) => void }) {
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastLoaded, setLastLoaded] = useState<Date | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);

    const [inquiries, catalogues, prospects] = await Promise.all([
      supabase.from("inquiries").select("id,name,email,phone,company,country,status,priority,follow_up_at,quotation_url,pi_url,sample_status,created_at").order("created_at", { ascending: false }).limit(200),
      supabase.from("catalogue_leads").select("id,name,email,whatsapp,company_name,country,status,priority,follow_up_at,quotation_url,pi_url,sample_status,created_at").order("created_at", { ascending: false }).limit(200),
      supabase.from("b2b_leads").select("id,company_name,email,phone,country,crm_status,lead_status,priority,follow_up_at,quotation_url,pi_url,sample_status,created_at").order("created_at", { ascending: false }).limit(300),
    ]);

    const failures = [inquiries.error, catalogues.error, prospects.error].filter(Boolean);
    if (failures.length) {
      setError(failures.map((item) => item?.message).filter(Boolean).join(" · "));
    }

    const normalized: Buyer[] = [
      ...((inquiries.data as InquiryRow[] | null) ?? []).map((row) => ({
        key: `inquiry:${row.id}`, source: "inquiry" as const, id: row.id, name: row.name, company: row.company,
        country: row.country, email: row.email, phone: row.phone, status: row.status || "new",
        priority: normalizePriority(row.priority), followUpAt: row.follow_up_at, quotationUrl: row.quotation_url,
        piUrl: row.pi_url, sampleStatus: row.sample_status || "not_requested", createdAt: row.created_at,
      })),
      ...((catalogues.data as CatalogueRow[] | null) ?? []).map((row) => ({
        key: `catalogue:${row.id}`, source: "catalogue" as const, id: row.id, name: row.name,
        company: row.company_name, country: row.country, email: row.email, phone: row.whatsapp,
        status: row.status || "new", priority: normalizePriority(row.priority), followUpAt: row.follow_up_at,
        quotationUrl: row.quotation_url, piUrl: row.pi_url, sampleStatus: row.sample_status || "not_requested",
        createdAt: row.created_at,
      })),
      ...((prospects.data as ProspectRow[] | null) ?? []).map((row) => ({
        key: `prospect:${row.id}`, source: "prospect" as const, id: row.id, name: row.company_name,
        company: row.company_name, country: row.country, email: row.email, phone: row.phone,
        status: row.crm_status || legacyStatus(row.lead_status), priority: normalizePriority(row.priority),
        followUpAt: row.follow_up_at, quotationUrl: row.quotation_url, piUrl: row.pi_url,
        sampleStatus: row.sample_status || "not_requested", createdAt: row.created_at,
      })),
    ];

    setBuyers(normalized);
    setLastLoaded(new Date());
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const actions = useMemo(() => buyers.map(deriveAction).filter((item): item is Action => Boolean(item)).sort((a, b) => {
    if (b.rank !== a.rank) return b.rank - a.rank;
    const aTime = a.dueAt ? new Date(a.dueAt).getTime() : new Date(a.buyer.createdAt).getTime();
    const bTime = b.dueAt ? new Date(b.dueAt).getTime() : new Date(b.buyer.createdAt).getTime();
    return aTime - bTime;
  }), [buyers]);

  const filtered = filter === "all" ? actions : actions.filter((action) => action.kind === filter);
  const count = (kind: Exclude<Filter, "all">) => actions.filter((action) => action.kind === kind).length;
  const filters: Array<{ key: Filter; label: string; value: number }> = [
    { key: "all", label: "All actions", value: actions.length },
    { key: "overdue", label: "Overdue", value: count("overdue") },
    { key: "today", label: "Today", value: count("today") },
    { key: "urgent", label: "Needs schedule", value: count("urgent") },
    { key: "quote", label: "Quotes", value: count("quote") },
    { key: "sample", label: "Samples", value: count("sample") },
    { key: "new", label: "New buyers", value: count("new") },
  ];

  return (
    <section className="border border-border/60 bg-card/25">
      <div className="p-4 sm:p-5 md:p-6 border-b border-border/60 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="eyebrow mb-2">Sales Action Center</p>
          <h2 className="font-display text-2xl md:text-3xl">What needs attention next</h2>
          <p className="text-sm text-foreground/60 mt-2 max-w-2xl">
            Read-only action queue built from existing Buyer CRM status, priority, follow-up, quotation and sample fields.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap w-full sm:w-auto">
          <button type="button" onClick={() => void load()} disabled={loading} className="min-h-11 inline-flex items-center justify-center gap-2 border border-border/60 px-3 py-2 text-[10px] uppercase tracking-[0.16em] hover:border-gold hover:text-gold disabled:opacity-50">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button type="button" onClick={() => go("leads")} className="min-h-11 inline-flex flex-1 sm:flex-none items-center justify-center gap-2 bg-gradient-gold text-primary-foreground px-4 py-2 text-[10px] uppercase tracking-[0.16em]">
            <UserRoundCheck size={12} /> Open Buyer Inbox
          </button>
        </div>
      </div>

      <div className="p-4 md:p-5 border-b border-border/60 flex gap-2 overflow-x-auto overscroll-x-contain">
        {filters.map((item) => (
          <button key={item.key} type="button" onClick={() => setFilter(item.key)} className={`min-h-11 shrink-0 border px-3 py-2 text-[10px] uppercase tracking-[0.14em] ${filter === item.key ? "border-gold text-gold bg-gold/10" : "border-border/60 text-foreground/60 hover:border-foreground/30"}`}>
            {item.label} <span className="ml-1 tabular-nums">{item.value}</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="m-4 md:m-5 border border-amber-500/40 bg-amber-500/10 text-amber-200 p-4 text-sm flex gap-3">
          <AlertTriangle size={17} className="shrink-0 mt-0.5" />
          <span>Some CRM sources could not be read: {error}</span>
        </div>
      )}

      <div className="p-4 md:p-5">
        {loading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Building sales action queue…</p>
        ) : buyers.length === 0 && !error ? (
          <div className="py-10 px-4 text-center border border-dashed border-border/50">
            <UserRoundCheck size={28} className="mx-auto text-gold mb-3" />
            <p className="font-display text-xl">Buyer CRM is ready</p>
            <p className="text-xs text-muted-foreground mt-2 max-w-xl mx-auto">There are no inquiry, catalogue or imported prospect records yet. New buyer records will automatically create review and follow-up actions here.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center">
            <CheckCircle2 size={28} className="mx-auto text-emerald-300 mb-3" />
            <p className="font-display text-xl">No matching action</p>
            <p className="text-xs text-muted-foreground mt-2">CRM records exist, but none match the selected action rule.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.slice(0, 20).map((action) => <ActionRow key={action.key} action={action} />)}
            {filtered.length > 20 && <p className="text-xs text-muted-foreground text-center pt-2">Showing 20 of {filtered.length}. Open Buyer Inbox for the complete pipeline.</p>}
          </div>
        )}
      </div>

      <div className="border-t border-border/60 px-4 sm:px-5 py-3 text-[10px] uppercase tracking-[0.12em] sm:tracking-[0.14em] text-foreground/45 flex justify-between gap-3 flex-wrap">
        <span>{buyers.length} CRM records reviewed</span>
        <span>{lastLoaded ? `Updated ${lastLoaded.toLocaleString()}` : "Not loaded"}</span>
      </div>
    </section>
  );
}

function ActionRow({ action }: { action: Action }) {
  const icon = action.kind === "overdue" || action.kind === "today" ? CalendarClock : action.kind === "quote" ? FileText : action.kind === "sample" ? FlaskConical : action.kind === "urgent" ? Clock3 : UserRoundCheck;
  const Icon = icon;
  const tone = action.kind === "overdue" ? "border-red-500/40 text-red-300" : action.kind === "today" ? "border-amber-500/40 text-amber-300" : action.kind === "quote" ? "border-orange-500/40 text-orange-300" : action.kind === "sample" ? "border-fuchsia-500/40 text-fuchsia-300" : action.kind === "urgent" ? "border-sky-500/40 text-sky-300" : "border-gold/40 text-gold";

  return (
    <article className="border border-border/60 bg-background/35 p-4 grid md:grid-cols-[minmax(0,1fr)_auto] gap-4">
      <div className="flex gap-3 min-w-0">
        <div className={`border p-2.5 shrink-0 h-fit ${tone}`}><Icon size={16} /></div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display text-lg">{action.title}</h3>
            <span className="border border-border/60 px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] sm:tracking-[0.14em] text-foreground/55">{sourceLabel(action.buyer.source)}</span>
            <span className={`border px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] sm:tracking-[0.14em] ${action.buyer.priority === "urgent" ? "border-red-500/40 text-red-300" : action.buyer.priority === "high" ? "border-amber-500/40 text-amber-300" : "border-border/60 text-foreground/50"}`}>{action.buyer.priority}</span>
          </div>
          <p className="text-sm mt-1 break-words">{action.buyer.name} <span className="text-foreground/45">· {contactLabel(action.buyer)}</span></p>
          <p className="text-xs text-foreground/55 mt-2 leading-relaxed">{action.detail}</p>
          <p className="text-[10px] uppercase tracking-[0.12em] sm:tracking-[0.14em] text-foreground/40 mt-2">Status: {statusLabel(action.buyer.status)}{action.buyer.country ? ` · ${action.buyer.country}` : ""}</p>
        </div>
      </div>
      <div className="md:text-right shrink-0">
        <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Follow-up</p>
        <p className={`text-xs mt-1 ${action.kind === "overdue" ? "text-red-300" : action.kind === "today" ? "text-amber-300" : "text-foreground/65"}`}>{formatDate(action.dueAt)}</p>
      </div>
    </article>
  );
}
