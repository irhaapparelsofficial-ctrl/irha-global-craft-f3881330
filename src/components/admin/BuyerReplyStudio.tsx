import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Copy,
  Languages,
  Mail,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { businessRulesApproved, businessRulesReadiness, loadBusinessRules } from "@/lib/businessRules";
import {
  createBuyerReplyDraft,
  suggestedReplyType,
  type BuyerReplyInput,
  type BuyerReplyLanguage,
  type BuyerReplyType,
} from "@/lib/buyerReplyDrafts";
import { qualifyBuyer, type LeadQualificationInput } from "@/lib/leadQualification";

type BuyerOption = {
  key: string;
  reference: string;
  kind: "inquiry" | "catalogue" | "prospect";
  name: string;
  company: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  productInterest: string | null;
  quantity: string | null;
  message: string | null;
  status: string;
  createdAt: string;
};

type InquiryRow = {
  id: string; name: string; email: string | null; phone: string | null; company: string | null; country: string | null;
  category: string | null; quantity: string | null; message: string | null; status: string | null; created_at: string;
  lead_context: Record<string, unknown> | null;
};

type CatalogueRow = {
  id: string; name: string; email: string | null; whatsapp: string | null; company_name: string | null; country: string | null;
  category_interest: string | null; message: string | null; status: string | null; created_at: string;
};

type ProspectRow = {
  id: string; company_name: string; country: string | null; email: string | null; phone: string | null;
  apparel_segment: string | null; crm_status: string | null; lead_status: string | null; created_at: string;
};

const db = supabase as any;

const REPLY_LABELS: Record<BuyerReplyType, string> = {
  acknowledgement: "Acknowledgement",
  qualification: "Missing information",
  catalogue: "Catalogue response",
  follow_up: "Follow-up",
  factory_call: "Factory video call",
};

function contextText(context: Record<string, unknown> | null, key: string) {
  const value = context?.[key];
  return typeof value === "string" ? value : null;
}

function legacyStatus(value?: string | null) {
  if (value === "Pitched") return "contacted";
  if (value === "Warm") return "qualified";
  if (value === "Replied") return "replied";
  if (value === "Rejected") return "lost";
  return "new";
}

function ref(kind: BuyerOption["kind"], id: string) {
  const prefix = kind === "inquiry" ? "IRQ" : kind === "catalogue" ? "CAT" : "PRO";
  return `${prefix}-${id.slice(0, 8).toUpperCase()}`;
}

function inquiryOption(row: InquiryRow): BuyerOption {
  return {
    key: `inquiry:${row.id}`,
    reference: ref("inquiry", row.id),
    kind: "inquiry",
    name: row.name,
    company: row.company,
    country: row.country || contextText(row.lead_context, "destination_country"),
    email: row.email,
    phone: row.phone,
    productInterest: contextText(row.lead_context, "product_name") || row.category,
    quantity: row.quantity,
    message: row.message,
    status: row.status || "new",
    createdAt: row.created_at,
  };
}

function catalogueOption(row: CatalogueRow): BuyerOption {
  return {
    key: `catalogue:${row.id}`,
    reference: ref("catalogue", row.id),
    kind: "catalogue",
    name: row.name,
    company: row.company_name,
    country: row.country,
    email: row.email,
    phone: row.whatsapp,
    productInterest: row.category_interest,
    quantity: null,
    message: row.message,
    status: row.status || "new",
    createdAt: row.created_at,
  };
}

function prospectOption(row: ProspectRow): BuyerOption {
  return {
    key: `prospect:${row.id}`,
    reference: ref("prospect", row.id),
    kind: "prospect",
    name: row.company_name,
    company: row.company_name,
    country: row.country,
    email: row.email,
    phone: row.phone,
    productInterest: row.apparel_segment,
    quantity: null,
    message: null,
    status: row.crm_status || legacyStatus(row.lead_status),
    createdAt: row.created_at,
  };
}

function qualificationInput(buyer: BuyerOption): LeadQualificationInput {
  return {
    key: buyer.key,
    kind: buyer.kind,
    name: buyer.name,
    company: buyer.company,
    country: buyer.country,
    email: buyer.email,
    phone: buyer.phone,
    productInterest: buyer.productInterest,
    quantity: buyer.quantity,
    message: buyer.message,
    status: buyer.status,
    createdAt: buyer.createdAt,
  };
}

function replyInput(buyer: BuyerOption): BuyerReplyInput {
  return {
    name: buyer.name,
    company: buyer.company,
    email: buyer.email,
    country: buyer.country,
    productInterest: buyer.productInterest,
    quantity: buyer.quantity,
    message: buyer.message,
    status: buyer.status,
  };
}

export default function BuyerReplyStudio() {
  const [buyers, setBuyers] = useState<BuyerOption[]>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [type, setType] = useState<BuyerReplyType>("acknowledgement");
  const [language, setLanguage] = useState<BuyerReplyLanguage>("en");
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const rules = loadBusinessRules();
  const readiness = businessRulesReadiness(rules);
  const rulesApproved = businessRulesApproved(rules);

  const load = async () => {
    setLoading(true);
    const [inquiries, catalogues, prospects] = await Promise.all([
      db.from("inquiries").select("id,name,email,phone,company,country,category,quantity,message,status,created_at,lead_context").order("created_at", { ascending: false }).limit(150),
      db.from("catalogue_leads").select("id,name,email,whatsapp,company_name,country,category_interest,message,status,created_at").order("created_at", { ascending: false }).limit(150),
      db.from("b2b_leads").select("id,company_name,country,email,phone,apparel_segment,crm_status,lead_status,created_at").order("created_at", { ascending: false }).limit(300),
    ]);
    setErrors([inquiries.error, catalogues.error, prospects.error].filter(Boolean).map((error: { message?: string }) => error.message || "Source unavailable"));
    const options = [
      ...((inquiries.data ?? []) as InquiryRow[]).map(inquiryOption),
      ...((catalogues.data ?? []) as CatalogueRow[]).map(catalogueOption),
      ...((prospects.data ?? []) as ProspectRow[]).map(prospectOption),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setBuyers(options);
    setSelectedKey((current) => current && options.some((item) => item.key === current) ? current : options[0]?.key ?? "");
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const buyer = buyers.find((item) => item.key === selectedKey) ?? null;
  const qualification = useMemo(() => buyer ? qualifyBuyer(qualificationInput(buyer)) : null, [buyer]);

  useEffect(() => {
    if (!buyer || !qualification) return;
    setType(suggestedReplyType(buyer.status, buyer.kind, qualification));
    setLanguage(/germany|austria|switzerland|deutsch/i.test(buyer.country || "") ? "de" : "en");
  }, [buyer?.key]);

  const draft = useMemo(() => {
    if (!buyer || !qualification) return null;
    return createBuyerReplyDraft({ type, language, buyer: replyInput(buyer), qualification, rules });
  }, [buyer, language, qualification, rules, type]);

  const copy = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    toast({ title: `${label} copied` });
  };

  return (
    <section className="mb-6 border border-border/60 bg-card/25">
      <div className="p-4 sm:p-5 md:p-6 border-b border-border/60 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
        <div className="flex items-start gap-3">
          <Bot size={20} className="text-gold shrink-0 mt-1" />
          <div>
            <p className="eyebrow mb-2">Buyer Reply Studio</p>
            <h2 className="font-display text-2xl md:text-3xl">Safe English & German drafts</h2>
            <p className="text-sm text-foreground/60 mt-2 max-w-3xl leading-relaxed">
              Drafts use CRM evidence and Business Rules. They are copy-only: no Gmail send, price, discount, payment or production commitment is performed here.
            </p>
          </div>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="min-h-11 inline-flex items-center justify-center gap-2 border border-border/60 px-4 py-2 text-[10px] uppercase tracking-[0.16em] hover:border-gold hover:text-gold disabled:opacity-50">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh buyers
        </button>
      </div>

      {!rulesApproved && (
        <div className="border-b border-amber-500/25 bg-amber-500/[0.05] p-4 flex items-start gap-3">
          <AlertTriangle size={17} className="text-amber-300 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-200">Business Rules are {readiness.score}% complete and {rules.status}.</p>
            <p className="text-xs text-foreground/55 mt-1">Drafting remains safe and copy-only. External sending and commercial commitments stay blocked.</p>
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <div className="m-4 md:m-5 border border-amber-500/35 bg-amber-500/[0.05] p-4 text-xs text-amber-100/80 break-all">
          Some buyer sources are unavailable: {errors.join(" · ")}
        </div>
      )}

      <div className="p-4 md:p-5 grid lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.4fr)] gap-5">
        <div className="space-y-4">
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Buyer record</span>
            <select value={selectedKey} onChange={(event) => setSelectedKey(event.target.value)} className="mt-2 min-h-12 w-full bg-background border border-border/60 px-3 text-sm" disabled={loading || buyers.length === 0}>
              {buyers.length === 0 && <option value="">No buyer records</option>}
              {buyers.map((item) => <option key={item.key} value={item.key}>{item.reference} · {item.company || item.name} · {item.productInterest || "No category"}</option>)}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Draft type</span>
              <select value={type} onChange={(event) => setType(event.target.value as BuyerReplyType)} className="mt-2 min-h-11 w-full bg-background border border-border/60 px-3 text-xs">
                {(Object.entries(REPLY_LABELS) as Array<[BuyerReplyType, string]>).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </label>
            <label>
              <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Language</span>
              <select value={language} onChange={(event) => setLanguage(event.target.value as BuyerReplyLanguage)} className="mt-2 min-h-11 w-full bg-background border border-border/60 px-3 text-xs">
                <option value="en">English</option>
                <option value="de">Deutsch</option>
              </select>
            </label>
          </div>

          {buyer && qualification && (
            <div className="border border-border/60 bg-background/35 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-gold">Draft evidence</p>
                <span className="font-display text-2xl">{qualification.score}</span>
              </div>
              <p className="text-sm mt-3">{buyer.company || buyer.name}</p>
              <p className="text-xs text-foreground/50 mt-1">{buyer.productInterest || "Product not provided"}{buyer.country ? ` · ${buyer.country}` : ""}</p>
              {qualification.missing.length > 0 ? (
                <p className="text-xs text-amber-200/75 mt-3 leading-relaxed">Questions included for: {qualification.missing.join(", ")}</p>
              ) : (
                <p className="text-xs text-emerald-300/75 mt-3 inline-flex items-center gap-2"><CheckCircle2 size={13} /> No critical completeness gap detected.</p>
              )}
            </div>
          )}

          <div className="border border-border/60 p-4 text-xs text-foreground/55 leading-relaxed">
            <p className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-gold"><ShieldCheck size={13} /> Safety</p>
            <p className="mt-2">Verify recipient, prior-contact context and every commercial fact before use. A copied draft is not a sent email.</p>
          </div>
        </div>

        <div className="min-w-0">
          {!draft ? (
            <div className="min-h-80 border border-dashed border-border/50 flex items-center justify-center text-sm text-muted-foreground">Select a buyer to prepare a draft.</div>
          ) : (
            <div className="space-y-3">
              <div className="border border-border/60 bg-background/35 p-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-gold"><Mail size={13} /> Subject</span>
                  <button type="button" onClick={() => void copy(draft.subject, "Subject")} className="min-h-9 inline-flex items-center gap-2 border border-border/60 px-3 text-[9px] uppercase tracking-[0.14em] hover:border-gold hover:text-gold"><Copy size={11} /> Copy</button>
                </div>
                <p className="text-sm font-medium break-words">{draft.subject}</p>
              </div>

              <div className="border border-border/60 bg-background/35 p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-gold"><Languages size={13} /> Message body</span>
                  <button type="button" onClick={() => void copy(draft.body, "Message")} className="min-h-9 inline-flex items-center gap-2 border border-border/60 px-3 text-[9px] uppercase tracking-[0.14em] hover:border-gold hover:text-gold"><Copy size={11} /> Copy</button>
                </div>
                <pre className="whitespace-pre-wrap break-words font-sans text-sm text-foreground/72 leading-relaxed max-h-[34rem] overflow-y-auto">{draft.body}</pre>
              </div>

              {draft.assumptions.length > 0 && (
                <div className="border border-amber-500/30 bg-amber-500/[0.05] p-3 text-xs text-amber-100/75">Review note: {draft.assumptions.join(" · ")}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
