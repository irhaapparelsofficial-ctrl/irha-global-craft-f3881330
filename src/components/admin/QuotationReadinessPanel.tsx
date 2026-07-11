import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Download,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { businessRulesApproved, businessRulesReadiness, loadBusinessRules } from "@/lib/businessRules";
import {
  EMPTY_QUOTATION_BRIEF,
  quotationBriefText,
  quotationReadiness,
  type QuotationBrief,
} from "@/lib/quotationReadiness";

const STORAGE_KEY = "irha_quotation_review_brief_v1";
const db = supabase as any;

type BuyerOption = {
  key: string;
  reference: string;
  name: string;
  company: string;
  product: string;
  quantity: string;
  destination: string;
};

type InquiryRow = {
  id: string; name: string; company: string | null; country: string | null; category: string | null; quantity: string | null;
  lead_context: Record<string, unknown> | null;
};
type CatalogueRow = { id: string; name: string; company_name: string | null; country: string | null; category_interest: string | null };
type ProspectRow = { id: string; company_name: string; country: string | null; apparel_segment: string | null };

function contextText(context: Record<string, unknown> | null, key: string) {
  const value = context?.[key];
  return typeof value === "string" ? value : "";
}

function reference(prefix: string, id: string) {
  return `${prefix}-${id.slice(0, 8).toUpperCase()}`;
}

function loadDraft(): QuotationBrief {
  if (typeof window === "undefined") return EMPTY_QUOTATION_BRIEF;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? { ...EMPTY_QUOTATION_BRIEF, ...JSON.parse(stored) } : EMPTY_QUOTATION_BRIEF;
  } catch {
    return EMPTY_QUOTATION_BRIEF;
  }
}

export default function QuotationReadinessPanel() {
  const rules = loadBusinessRules();
  const rulesReady = businessRulesReadiness(rules);
  const rulesApproved = businessRulesApproved(rules);
  const [brief, setBrief] = useState<QuotationBrief>(() => loadDraft());
  const [buyers, setBuyers] = useState<BuyerOption[]>([]);
  const [selectedBuyer, setSelectedBuyer] = useState("");
  const [loadingBuyers, setLoadingBuyers] = useState(true);
  const [sourceErrors, setSourceErrors] = useState<string[]>([]);
  const result = useMemo(() => quotationReadiness(brief), [brief]);

  const loadBuyers = async () => {
    setLoadingBuyers(true);
    const [inquiries, catalogues, prospects] = await Promise.all([
      db.from("inquiries").select("id,name,company,country,category,quantity,lead_context").order("created_at", { ascending: false }).limit(150),
      db.from("catalogue_leads").select("id,name,company_name,country,category_interest").order("created_at", { ascending: false }).limit(150),
      db.from("b2b_leads").select("id,company_name,country,apparel_segment").order("created_at", { ascending: false }).limit(300),
    ]);
    setSourceErrors([inquiries.error, catalogues.error, prospects.error].filter(Boolean).map((error: { message?: string }) => error.message || "Source unavailable"));
    const options: BuyerOption[] = [
      ...((inquiries.data ?? []) as InquiryRow[]).map((row) => ({
        key: `inquiry:${row.id}`,
        reference: reference("IRQ", row.id),
        name: row.name,
        company: row.company || "",
        product: contextText(row.lead_context, "product_name") || row.category || "",
        quantity: row.quantity || "",
        destination: row.country || contextText(row.lead_context, "destination_country"),
      })),
      ...((catalogues.data ?? []) as CatalogueRow[]).map((row) => ({
        key: `catalogue:${row.id}`,
        reference: reference("CAT", row.id),
        name: row.name,
        company: row.company_name || "",
        product: row.category_interest || "",
        quantity: "",
        destination: row.country || "",
      })),
      ...((prospects.data ?? []) as ProspectRow[]).map((row) => ({
        key: `prospect:${row.id}`,
        reference: reference("PRO", row.id),
        name: row.company_name,
        company: row.company_name,
        product: row.apparel_segment || "",
        quantity: "",
        destination: row.country || "",
      })),
    ];
    setBuyers(options);
    setLoadingBuyers(false);
  };

  useEffect(() => { void loadBuyers(); }, []);

  const update = <K extends keyof QuotationBrief>(key: K, value: QuotationBrief[K]) => {
    setBrief((current) => ({ ...current, [key]: value }));
  };

  const applyBuyer = (key: string) => {
    setSelectedBuyer(key);
    const buyer = buyers.find((item) => item.key === key);
    if (!buyer) return;
    setBrief((current) => ({
      ...current,
      buyerReference: buyer.reference,
      buyerName: buyer.name,
      company: buyer.company,
      product: buyer.product || current.product,
      quantity: buyer.quantity || current.quantity,
      destination: buyer.destination || current.destination,
    }));
  };

  const save = () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(brief));
    toast({ title: "Quotation brief saved locally" });
  };

  const reset = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setBrief({ ...EMPTY_QUOTATION_BRIEF, currency: rules.commercial.supportedCurrencies[0] || "USD" });
    setSelectedBuyer("");
    toast({ title: "Quotation brief reset" });
  };

  const copyBrief = async () => {
    await navigator.clipboard.writeText(quotationBriefText(brief));
    toast({ title: "Quotation review brief copied" });
  };

  const exportJson = () => {
    const payload = {
      generated_at: new Date().toISOString(),
      readiness: result,
      owner_approval_required: true,
      brief,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${brief.buyerReference || "irha"}-quotation-review.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="mb-6 border border-border/60 bg-card/25">
      <div className="p-4 sm:p-5 md:p-6 border-b border-border/60 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
        <div className="flex items-start gap-3">
          <ClipboardCheck size={21} className="text-gold shrink-0 mt-1" />
          <div>
            <p className="eyebrow mb-2">Quotation Readiness</p>
            <h2 className="font-display text-2xl md:text-3xl">Buyer brief before owner pricing</h2>
            <p className="text-sm text-foreground/60 mt-2 max-w-3xl leading-relaxed">
              Complete the technical and shipping scope before entering price in the PI draft below. This workspace never calculates or approves final price, discount, payment terms or delivery commitment.
            </p>
          </div>
        </div>
        <div className={`border px-4 py-3 min-w-44 ${result.readyForOwnerPricingReview ? "border-emerald-500/35 bg-emerald-500/[0.05]" : "border-amber-500/35 bg-amber-500/[0.05]"}`}>
          <p className={`font-display text-3xl ${result.readyForOwnerPricingReview ? "text-emerald-300" : "text-amber-300"}`}>{result.score}%</p>
          <p className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground mt-1">Brief readiness</p>
        </div>
      </div>

      {!rulesApproved && (
        <div className="border-b border-amber-500/25 bg-amber-500/[0.05] p-4 flex items-start gap-3">
          <AlertTriangle size={17} className="text-amber-300 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-200">Business Rules are {rulesReady.score}% complete and {rules.status}.</p>
            <p className="text-xs text-foreground/55 mt-1">This brief can be prepared, but final commercial issue remains blocked until rules and owner pricing are approved.</p>
          </div>
        </div>
      )}

      {sourceErrors.length > 0 && (
        <div className="m-4 md:m-5 border border-amber-500/35 bg-amber-500/[0.05] p-4 text-xs text-amber-100/80 break-all">
          Some buyer sources are unavailable: {sourceErrors.join(" · ")}
        </div>
      )}

      <div className="p-4 md:p-5 border-b border-border/60 flex flex-col lg:flex-row gap-3 lg:items-end">
        <label className="flex-1">
          <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Prefill from Buyer Inbox</span>
          <select value={selectedBuyer} onChange={(event) => applyBuyer(event.target.value)} disabled={loadingBuyers || buyers.length === 0} className="mt-2 min-h-11 w-full bg-background border border-border/60 px-3 text-sm">
            <option value="">Select buyer record</option>
            {buyers.map((buyer) => <option key={buyer.key} value={buyer.key}>{buyer.reference} · {buyer.company || buyer.name} · {buyer.product || "No product"}</option>)}
          </select>
        </label>
        <button type="button" onClick={() => void loadBuyers()} disabled={loadingBuyers} className="min-h-11 inline-flex items-center justify-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.16em] hover:border-gold hover:text-gold disabled:opacity-50">
          <RefreshCw size={13} className={loadingBuyers ? "animate-spin" : ""} /> Refresh buyers
        </button>
      </div>

      <div className="p-4 md:p-5 grid xl:grid-cols-[minmax(0,1.5fr)_minmax(260px,0.6fr)] gap-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Buyer reference" value={brief.buyerReference} onChange={(value) => update("buyerReference", value)} />
          <Field label="Buyer name" value={brief.buyerName} onChange={(value) => update("buyerName", value)} required />
          <Field label="Company" value={brief.company} onChange={(value) => update("company", value)} />
          <Field label="Product / style" value={brief.product} onChange={(value) => update("product", value)} required />
          <Field label="Material specification" value={brief.material} onChange={(value) => update("material", value)} required placeholder="Fabric/leather, composition, GSM/thickness, finish" />
          <Field label="Estimated quantity" value={brief.quantity} onChange={(value) => update("quantity", value)} required placeholder="Per style / colour" />
          <Field label="Size range / split" value={brief.sizeRange} onChange={(value) => update("sizeRange", value)} required />
          <Field label="Colours" value={brief.colours} onChange={(value) => update("colours", value)} />
          <Field label="Branding / decoration" value={brief.branding} onChange={(value) => update("branding", value)} placeholder="Embroidery, printing, patches, placement" />
          <Field label="Labels & tags" value={brief.labelsTags} onChange={(value) => update("labelsTags", value)} />
          <Field label="Packaging" value={brief.packaging} onChange={(value) => update("packaging", value)} />
          <Field label="Destination country" value={brief.destination} onChange={(value) => update("destination", value)} required />
          <Field label="Shipping scope" value={brief.shippingScope} onChange={(value) => update("shippingScope", value)} required placeholder="Factory pickup, air, sea, courier, duty scope" />
          <SelectField label="Incoterm" value={brief.incoterm} onChange={(value) => update("incoterm", value)} options={rules.commercial.incoterms} required placeholder="Choose approved Incoterm" />
          <SelectField label="Currency" value={brief.currency} onChange={(value) => update("currency", value)} options={rules.commercial.supportedCurrencies} required />
          <Field label="Target timing" value={brief.targetTiming} onChange={(value) => update("targetTiming", value)} placeholder="Buyer target only; not a promise" />
          <Field label="Sample requirement" value={brief.sampleRequirement} onChange={(value) => update("sampleRequirement", value)} />
          <Field label="Tech pack / references" value={brief.referenceFiles} onChange={(value) => update("referenceFiles", value)} />
          <div className="sm:col-span-2">
            <Field label="Review notes" value={brief.notes} onChange={(value) => update("notes", value)} multiline />
          </div>
        </div>

        <aside className="space-y-4">
          <div className={`border p-4 ${result.readyForOwnerPricingReview ? "border-emerald-500/35 bg-emerald-500/[0.04]" : "border-amber-500/35 bg-amber-500/[0.04]"}`}>
            <p className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-gold"><ShieldCheck size={13} /> Readiness result</p>
            <p className="font-display text-2xl mt-3">{result.readyForOwnerPricingReview ? "Ready for owner pricing review" : "Technical scope incomplete"}</p>
            {result.requiredMissing.length > 0 ? (
              <div className="mt-4">
                <p className="text-[10px] uppercase tracking-[0.14em] text-amber-300">Required missing</p>
                <ul className="mt-2 space-y-1 text-xs text-foreground/60">{result.requiredMissing.map((item) => <li key={item}>• {item}</li>)}</ul>
              </div>
            ) : (
              <p className="mt-4 text-xs text-emerald-300 inline-flex items-center gap-2"><CheckCircle2 size={13} /> Required technical scope is complete.</p>
            )}
            {result.recommendedMissing.length > 0 && (
              <div className="mt-4">
                <p className="text-[10px] uppercase tracking-[0.14em] text-foreground/45">Recommended missing</p>
                <p className="mt-2 text-xs text-foreground/55 leading-relaxed">{result.recommendedMissing.join(", ")}</p>
              </div>
            )}
          </div>

          <div className="border border-border/60 p-4 text-xs text-foreground/55 leading-relaxed">
            <p className="text-[10px] uppercase tracking-[0.16em] text-gold">Owner-controlled fields</p>
            <ul className="mt-3 space-y-2">
              <li>• Minimum profitable unit price</li>
              <li>• Discount or concession</li>
              <li>• Sample charge</li>
              <li>• Payment terms</li>
              <li>• Production/delivery commitment</li>
              <li>• Final quotation validity</li>
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Action onClick={save} icon={<Save size={12} />}>Save</Action>
            <Action onClick={reset} icon={<RotateCcw size={12} />}>Reset</Action>
            <Action onClick={() => void copyBrief()} icon={<Copy size={12} />}>Copy brief</Action>
            <Action onClick={exportJson} icon={<Download size={12} />}>Export JSON</Action>
          </div>
        </aside>
      </div>
    </section>
  );
}

function Field({ label, value, onChange, required = false, placeholder, multiline = false }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; placeholder?: string; multiline?: boolean }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}{required ? " *" : ""}</span>
      {multiline ? (
        <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={4} className="mt-2 w-full bg-background border border-border/60 px-3 py-2 text-sm resize-y" />
      ) : (
        <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-2 min-h-11 w-full bg-background border border-border/60 px-3 text-sm" />
      )}
    </label>
  );
}

function SelectField({ label, value, onChange, options, required = false, placeholder }: { label: string; value: string; onChange: (value: string) => void; options: string[]; required?: boolean; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}{required ? " *" : ""}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 min-h-11 w-full bg-background border border-border/60 px-3 text-sm">
        <option value="">{placeholder || `Select ${label}`}</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
      {options.length === 0 && <span className="mt-1 block text-[10px] text-amber-300/70">Add approved options in Business Rules.</span>}
    </label>
  );
}

function Action({ children, icon, onClick }: { children: React.ReactNode; icon: React.ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="min-h-11 inline-flex items-center justify-center gap-2 border border-border/60 px-3 text-[9px] uppercase tracking-[0.14em] hover:border-gold hover:text-gold">{icon}{children}</button>;
}
