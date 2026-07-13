import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, UsersRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import BuyerCoreActionsPanel from "@/components/admin/BuyerCoreActionsPanel";
import BuyerProfileCommunicationsPanel from "@/components/admin/BuyerProfileCommunicationsPanel";
import BuyerClosureActionsPanel from "@/components/admin/BuyerClosureActionsPanel";
import AIOutreachCenter from "@/components/admin/AIOutreachCenter";
import {
  normalizePriority,
  normalizeStage,
  referenceFor,
  sortSalesCards,
  type SalesCard,
} from "@/lib/salesPipeline";

const db = supabase as any;

type InquiryRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  country: string | null;
  category: string | null;
  quantity: string | null;
  message: string | null;
  status: string | null;
  priority: string | null;
  follow_up_at: string | null;
  assignee: string | null;
  quotation_url: string | null;
  sample_status: string | null;
  created_at: string;
  updated_at: string | null;
  lead_context: Record<string, unknown> | null;
};

type CatalogueRow = {
  id: string;
  name: string;
  email: string | null;
  whatsapp: string | null;
  company_name: string | null;
  country: string | null;
  category_interest: string | null;
  message: string | null;
  status: string | null;
  priority: string | null;
  follow_up_at: string | null;
  assignee: string | null;
  quotation_url: string | null;
  sample_status: string | null;
  created_at: string;
  updated_at: string | null;
};

type ProspectRow = {
  id: string;
  company_name: string;
  country: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  apparel_segment: string | null;
  crm_status: string | null;
  lead_status: string | null;
  priority: string | null;
  follow_up_at: string | null;
  assignee: string | null;
  quotation_url: string | null;
  sample_status: string | null;
  created_at: string;
  updated_at: string | null;
};

function contextText(context: Record<string, unknown> | null, key: string) {
  const value = context?.[key];
  return typeof value === "string" ? value : "";
}

function inquiryCard(row: InquiryRow): SalesCard {
  return {
    key: `inquiry:${row.id}`,
    source: "inquiry",
    sourceId: row.id,
    reference: referenceFor("inquiry", row.id),
    stage: normalizeStage(row.status),
    name: row.name || "Buyer",
    company: row.company || "",
    country: row.country || contextText(row.lead_context, "destination_country"),
    email: row.email || "",
    phone: row.phone || "",
    website: "",
    productInterest: contextText(row.lead_context, "product_name") || row.category || "",
    quantity: row.quantity || "",
    message: row.message || "",
    priority: normalizePriority(row.priority),
    followUpAt: row.follow_up_at,
    assignee: row.assignee || "",
    quotationUrl: row.quotation_url || "",
    sampleStatus: row.sample_status || "not_requested",
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
  };
}

function catalogueCard(row: CatalogueRow): SalesCard {
  return {
    key: `catalogue:${row.id}`,
    source: "catalogue",
    sourceId: row.id,
    reference: referenceFor("catalogue", row.id),
    stage: normalizeStage(row.status),
    name: row.name || "Catalogue buyer",
    company: row.company_name || "",
    country: row.country || "",
    email: row.email || "",
    phone: row.whatsapp || "",
    website: "",
    productInterest: row.category_interest || "",
    quantity: "",
    message: row.message || "",
    priority: normalizePriority(row.priority),
    followUpAt: row.follow_up_at,
    assignee: row.assignee || "",
    quotationUrl: row.quotation_url || "",
    sampleStatus: row.sample_status || "not_requested",
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
  };
}

function prospectCard(row: ProspectRow): SalesCard {
  return {
    key: `prospect:${row.id}`,
    source: "prospect",
    sourceId: row.id,
    reference: referenceFor("prospect", row.id),
    stage: normalizeStage(row.crm_status || row.lead_status),
    name: row.company_name,
    company: row.company_name,
    country: row.country || "",
    email: row.email || "",
    phone: row.phone || "",
    website: row.website || "",
    productInterest: row.apparel_segment || "",
    quantity: "",
    message: "",
    priority: normalizePriority(row.priority),
    followUpAt: row.follow_up_at,
    assignee: row.assignee || "",
    quotationUrl: row.quotation_url || "",
    sampleStatus: row.sample_status || "not_requested",
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
  };
}

export default function BuyerCoreActionsHub() {
  const [cards, setCards] = useState<SalesCard[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [inquiries, catalogues, prospects] = await Promise.all([
      db.from("inquiries").select("id,name,email,phone,company,country,category,quantity,message,status,priority,follow_up_at,assignee,quotation_url,sample_status,created_at,updated_at,lead_context").order("updated_at", { ascending: false }).limit(500),
      db.from("catalogue_leads").select("id,name,email,whatsapp,company_name,country,category_interest,message,status,priority,follow_up_at,assignee,quotation_url,sample_status,created_at,updated_at").order("updated_at", { ascending: false }).limit(500),
      db.from("b2b_leads").select("id,company_name,country,email,phone,website,apparel_segment,crm_status,lead_status,priority,follow_up_at,assignee,quotation_url,sample_status,created_at,updated_at").order("updated_at", { ascending: false }).limit(1000),
    ]);

    const next = sortSalesCards([
      ...((inquiries.data || []) as InquiryRow[]).map(inquiryCard),
      ...((catalogues.data || []) as CatalogueRow[]).map(catalogueCard),
      ...((prospects.data || []) as ProspectRow[]).map(prospectCard),
    ]);
    setCards(next);
    setSelectedKey((current) => current && next.some((card) => card.key === current) ? current : next[0]?.key || null);
    setError(inquiries.error?.message || catalogues.error?.message || prospects.error?.message || null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return cards;
    return cards.filter((card) => [card.reference, card.name, card.company, card.country, card.email, card.phone, card.productInterest].join(" ").toLowerCase().includes(needle));
  }, [cards, query]);

  const selected = cards.find((card) => card.key === selectedKey) || null;

  return (
    <div className="space-y-5">
      <section className="border border-gold/35 bg-card/30 p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex items-start gap-3">
            <UsersRound size={21} className="text-gold shrink-0 mt-1" />
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-gold">Buyer CRM · Real actions</p>
              <h2 className="font-display text-2xl sm:text-3xl mt-1">Choose a buyer and take the next step</h2>
              <p className="text-sm text-foreground/65 mt-2 max-w-3xl">Works with website inquiries, catalogue requests and approved prospects. All changes stay private until a separate send or publish action is approved.</p>
            </div>
          </div>
          <button type="button" onClick={() => void load()} disabled={loading} className="min-h-11 inline-flex items-center justify-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.16em] text-muted-foreground hover:border-gold hover:text-gold disabled:opacity-50"><RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh buyers</button>
        </div>
      </section>

      {error && <div className="border border-red-500/40 bg-red-500/[0.05] p-4 text-sm text-red-200">{error}</div>}

      <div className="grid xl:grid-cols-[320px_minmax(0,1fr)] gap-5 items-start">
        <aside className="border border-border/60 bg-card/20 xl:sticky xl:top-4">
          <div className="p-3 border-b border-border/60">
            <label className="relative block"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search buyer, company or country…" className="min-h-12 w-full border border-border/60 bg-background pl-9 pr-3 text-sm outline-none focus:border-gold" /></label>
            <p className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground mt-2">{filtered.length} of {cards.length} buyers</p>
          </div>
          <div className="max-h-[68vh] overflow-y-auto divide-y divide-border/50">
            {loading ? <p className="p-6 text-sm text-muted-foreground">Loading buyers…</p> : filtered.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No buyer record yet.</p> : filtered.map((card) => (
              <button key={card.key} type="button" onClick={() => setSelectedKey(card.key)} className={`w-full min-h-24 p-3 text-left hover:bg-muted/20 border-l-2 ${selectedKey === card.key ? "border-gold bg-gold/5" : "border-transparent"}`}>
                <p className="text-[9px] uppercase tracking-[0.14em] text-gold">{card.reference} · {card.source}</p>
                <p className="font-display text-lg truncate mt-1">{card.company || card.name}</p>
                <p className="text-xs text-muted-foreground truncate mt-1">{card.country || "Country missing"} · {card.productInterest || "Requirement missing"}</p>
              </button>
            ))}
          </div>
        </aside>

        {!selected ? (
          <div className="border border-dashed border-border/60 p-12 text-center"><UsersRound size={30} className="mx-auto text-gold" /><p className="font-display text-2xl mt-4">No buyer selected</p><p className="text-sm text-muted-foreground mt-2">A buyer will appear after an inquiry, catalogue request or approved prospect is saved.</p></div>
        ) : (
          <div className="min-w-0">
            <div className="mb-4 border border-border/60 bg-card/25 p-4 sm:p-5">
              <p className="text-[10px] uppercase tracking-[0.16em] text-gold">{selected.reference} · {selected.source}</p>
              <h3 className="font-display text-2xl sm:text-3xl mt-1">{selected.company || selected.name}</h3>
              <p className="text-sm text-muted-foreground mt-2">{selected.country || "Country missing"}{selected.productInterest ? ` · ${selected.productInterest}` : ""}</p>
            </div>
            <AIOutreachCenter card={selected} allCards={cards} />
            <BuyerCoreActionsPanel card={selected} onChanged={() => void load()} />
            <BuyerProfileCommunicationsPanel card={selected} onChanged={() => void load()} />
            <BuyerClosureActionsPanel card={selected} onChanged={() => void load()} />
          </div>
        )}
      </div>
    </div>
  );
}
