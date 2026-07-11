import { useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Download,
  FileJson,
  LockKeyhole,
  RotateCcw,
  Save,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  BUSINESS_RULES_STORAGE_KEY,
  DEFAULT_BUSINESS_RULES,
  businessRulesReadiness,
  listText,
  loadBusinessRules,
  parseList,
  saveBusinessRules,
  type ApprovalMode,
  type BusinessRulesMaster,
} from "@/lib/businessRules";

const AUTHORITY_LABELS: Array<{ key: keyof BusinessRulesMaster["authority"]; label: string; risk: string }> = [
  { key: "safeAcknowledgement", label: "Safe inquiry acknowledgement", risk: "Low" },
  { key: "catalogueDelivery", label: "Approved catalogue delivery", risk: "Low" },
  { key: "qualificationQuestions", label: "Buyer qualification questions", risk: "Low" },
  { key: "followUpReminder", label: "Follow-up reminder", risk: "Low" },
  { key: "socialDraft", label: "Social content draft", risk: "Medium" },
  { key: "socialPublish", label: "Publish social content", risk: "High" },
  { key: "listingDraft", label: "Directory/listing draft", risk: "Medium" },
  { key: "listingUpdate", label: "Update external listing", risk: "High" },
  { key: "seoDraft", label: "Localized SEO draft", risk: "Medium" },
  { key: "finalQuotation", label: "Final quotation", risk: "High" },
  { key: "discount", label: "Discount or concession", risk: "High" },
  { key: "paymentTerms", label: "Payment terms", risk: "High" },
  { key: "productionCommitment", label: "Production/delivery commitment", risk: "High" },
  { key: "complaintSettlement", label: "Complaint settlement", risk: "High" },
];

export default function BusinessRulesPanel() {
  const [rules, setRules] = useState<BusinessRulesMaster>(() => loadBusinessRules());
  const importRef = useRef<HTMLInputElement>(null);
  const readiness = useMemo(() => businessRulesReadiness(rules), [rules]);

  const updateCompany = <K extends keyof BusinessRulesMaster["company"]>(key: K, value: BusinessRulesMaster["company"][K]) => {
    setRules((current) => ({ ...current, company: { ...current.company, [key]: value }, status: "draft" }));
  };
  const updateCommercial = <K extends keyof BusinessRulesMaster["commercial"]>(key: K, value: BusinessRulesMaster["commercial"][K]) => {
    setRules((current) => ({ ...current, commercial: { ...current.commercial, [key]: value }, status: "draft" }));
  };
  const updateManufacturing = <K extends keyof BusinessRulesMaster["manufacturing"]>(key: K, value: BusinessRulesMaster["manufacturing"][K]) => {
    setRules((current) => ({ ...current, manufacturing: { ...current.manufacturing, [key]: value }, status: "draft" }));
  };
  const updateAuthority = (key: keyof BusinessRulesMaster["authority"], value: ApprovalMode) => {
    setRules((current) => ({ ...current, authority: { ...current.authority, [key]: value }, status: "draft" }));
  };

  const save = () => {
    const next = saveBusinessRules(rules);
    setRules(next);
    toast({ title: "Business rules saved locally", description: "Backend sync remains pending until the final activation batch." });
  };

  const approve = () => {
    if (readiness.score < 100) {
      toast({ title: "Rules are incomplete", description: `Complete: ${readiness.missing.join(", ")}`, variant: "destructive" });
      return;
    }
    const next = saveBusinessRules({ ...rules, status: "approved" });
    setRules(next);
    toast({ title: "Rules marked approved", description: "Approval is stored locally until the backend table is activated." });
  };

  const reset = () => {
    window.localStorage.removeItem(BUSINESS_RULES_STORAGE_KEY);
    setRules(DEFAULT_BUSINESS_RULES);
    toast({ title: "Draft reset to safe defaults" });
  };

  const exportRules = () => {
    const blob = new Blob([JSON.stringify(rules, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `irha-business-rules-v${rules.version}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importRules = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as BusinessRulesMaster;
      if (!parsed.company?.legalName || !parsed.commercial || !parsed.authority) throw new Error("Invalid rules file");
      setRules({ ...DEFAULT_BUSINESS_RULES, ...parsed, authority: { ...DEFAULT_BUSINESS_RULES.authority, ...parsed.authority }, status: "draft", updatedAt: new Date().toISOString() });
      toast({ title: "Business rules imported", description: "Review and save before approval." });
    } catch (error) {
      toast({ title: "Import failed", description: error instanceof Error ? error.message : "Invalid JSON", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <section className="border border-gold/40 bg-gold/[0.05] p-5 md:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="flex items-start gap-3">
            <Bot size={22} className="text-gold shrink-0 mt-1" />
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-gold">AI Business Authority</p>
              <h2 className="font-display text-2xl md:text-3xl mt-1">Business Rules Master</h2>
              <p className="text-sm text-foreground/65 mt-3 max-w-3xl leading-relaxed">
                This is the source of truth AI must use before drafting replies, quotations, listings, social content or production commitments. No blank rule may be guessed.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 border border-border/60 bg-background/50 px-5 py-4 min-w-[220px]">
            <div className="relative w-14 h-14 rounded-full border-4 border-gold/20 flex items-center justify-center">
              <span className="font-display text-xl text-gold">{readiness.score}%</span>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Automation readiness</p>
              <p className="text-sm mt-1">{readiness.completed}/{readiness.total} required rules</p>
              <p className={`text-[10px] uppercase tracking-[0.16em] mt-1 ${rules.status === "approved" ? "text-emerald-400" : "text-amber-300"}`}>{rules.status}</p>
            </div>
          </div>
        </div>
      </section>

      {readiness.missing.length > 0 && (
        <section className="border border-amber-500/35 bg-amber-500/[0.06] p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-300 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-200">AI autonomy remains restricted</p>
            <p className="text-xs text-foreground/60 mt-1 leading-relaxed">Missing: {readiness.missing.join(", ")}. AI must ask or escalate instead of inventing these facts.</p>
          </div>
        </section>
      )}

      <div className="grid xl:grid-cols-2 gap-5">
        <RuleSection title="Company & markets" icon={<ShieldCheck size={16} />}>
          <Field label="Legal company name" value={rules.company.legalName} onChange={(value) => updateCompany("legalName", value)} />
          <Field label="Trading name" value={rules.company.tradingName} onChange={(value) => updateCompany("tradingName", value)} />
          <Field label="Location" value={rules.company.location} onChange={(value) => updateCompany("location", value)} />
          <TextArea label="Business model" value={rules.company.businessModel} onChange={(value) => updateCompany("businessModel", value)} />
          <TextArea label="Website/manufacturer positioning" value={rules.company.websiteState} onChange={(value) => updateCompany("websiteState", value)} />
          <ListArea label="Verified trust points" values={rules.company.trustPoints} onChange={(value) => updateCompany("trustPoints", value)} />
          <ListArea label="Priority markets" values={rules.company.priorityMarkets} onChange={(value) => updateCompany("priorityMarkets", value)} />
          <ListArea label="Supported languages" values={rules.company.supportedLanguages} onChange={(value) => updateCompany("supportedLanguages", value)} />
        </RuleSection>

        <RuleSection title="Commercial policy" icon={<LockKeyhole size={16} />}>
          <BooleanRow label="Quote-only B2B website" value={rules.commercial.quoteOnly} onChange={(value) => updateCommercial("quoteOnly", value)} locked />
          <BooleanRow label="Public prices allowed" value={rules.commercial.publicPricingAllowed} onChange={(value) => updateCommercial("publicPricingAllowed", value)} locked />
          <ListArea label="Currencies" values={rules.commercial.supportedCurrencies} onChange={(value) => updateCommercial("supportedCurrencies", value)} />
          <ListArea label="Approved Incoterms" values={rules.commercial.incoterms} onChange={(value) => updateCommercial("incoterms", value)} placeholder="FOB\nCIF\nDDP" />
          <ListArea label="Approved payment terms" values={rules.commercial.paymentTerms} onChange={(value) => updateCommercial("paymentTerms", value)} placeholder="Enter only terms approved by the owner" />
          <TextArea label="MOQ policy" value={rules.commercial.moqPolicy} onChange={(value) => updateCommercial("moqPolicy", value)} />
          <TextArea label="Sample policy" value={rules.commercial.samplePolicy} onChange={(value) => updateCommercial("samplePolicy", value)} />
          <TextArea label="Lead-time policy" value={rules.commercial.leadTimePolicy} onChange={(value) => updateCommercial("leadTimePolicy", value)} />
          <TextArea label="Shipping policy" value={rules.commercial.shippingPolicy} onChange={(value) => updateCommercial("shippingPolicy", value)} />
          <TextArea label="Discount policy" value={rules.commercial.discountPolicy} onChange={(value) => updateCommercial("discountPolicy", value)} />
        </RuleSection>

        <RuleSection title="Manufacturing facts" icon={<FileJson size={16} />}>
          <ListArea label="Product categories" values={rules.manufacturing.categories} onChange={(value) => updateManufacturing("categories", value)} />
          <ListArea label="Verified materials" values={rules.manufacturing.verifiedMaterials} onChange={(value) => updateManufacturing("verifiedMaterials", value)} placeholder="Add only materials you can genuinely manufacture" />
          <ListArea label="Customization options" values={rules.manufacturing.customizationOptions} onChange={(value) => updateManufacturing("customizationOptions", value)} />
          <ListArea label="Packaging options" values={rules.manufacturing.packagingOptions} onChange={(value) => updateManufacturing("packagingOptions", value)} placeholder="Polybag\nCustom box\nCarton standards" />
          <ListArea label="Verified certifications" values={rules.manufacturing.certifications} onChange={(value) => updateManufacturing("certifications", value)} placeholder="Leave empty until documentary evidence is available" />
          <ListArea label="Claims AI must never make" values={rules.prohibitedClaims} onChange={(value) => setRules((current) => ({ ...current, prohibitedClaims: value, status: "draft" }))} />
          <TextArea label="Escalation notes" value={rules.escalationNotes} onChange={(value) => setRules((current) => ({ ...current, escalationNotes: value, status: "draft" }))} />
        </RuleSection>

        <RuleSection title="AI authority matrix" icon={<Bot size={16} />}>
          <div className="space-y-3">
            {AUTHORITY_LABELS.map((item) => (
              <div key={item.key} className="grid grid-cols-[minmax(0,1fr)_110px] gap-3 items-center border-b border-border/40 pb-3">
                <div>
                  <p className="text-sm text-foreground/80">{item.label}</p>
                  <p className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground mt-1">{item.risk} risk</p>
                </div>
                <select
                  value={rules.authority[item.key]}
                  onChange={(event) => updateAuthority(item.key, event.target.value as ApprovalMode)}
                  className="min-h-11 bg-background border border-border/60 px-3 text-xs"
                  aria-label={`${item.label} authority`}
                >
                  <option value="auto">Auto</option>
                  <option value="draft">Draft only</option>
                  <option value="owner">Owner approval</option>
                </select>
              </div>
            ))}
          </div>
        </RuleSection>
      </div>

      <section className="border border-border/60 bg-card/25 p-4 md:p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Persistence status</p>
          <p className="text-sm mt-2 text-foreground/70">Saved in this browser now. The prepared backend migration will make these rules account-wide during final activation.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={importRef} type="file" accept="application/json" className="hidden" onChange={(event) => void importRules(event)} />
          <Action onClick={() => importRef.current?.click()} icon={<Upload size={13} />}>Import</Action>
          <Action onClick={exportRules} icon={<Download size={13} />}>Export</Action>
          <Action onClick={reset} icon={<RotateCcw size={13} />}>Reset</Action>
          <Action onClick={save} icon={<Save size={13} />} primary>Save draft</Action>
          <Action onClick={approve} icon={<CheckCircle2 size={13} />} disabled={readiness.score < 100}>Approve rules</Action>
        </div>
      </section>
    </div>
  );
}

function RuleSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="border border-border/60 bg-card/25 p-5 md:p-6 min-w-0">
      <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-gold mb-5">{icon}{title}</div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 min-h-11 w-full bg-background border border-border/60 px-3 text-sm" />
    </label>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} className="mt-2 w-full bg-background border border-border/60 px-3 py-2 text-sm leading-relaxed resize-y" />
    </label>
  );
}

function ListArea({ label, values, onChange, placeholder }: { label: string; values: string[]; onChange: (value: string[]) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
      <textarea value={listText(values)} onChange={(event) => onChange(parseList(event.target.value))} placeholder={placeholder} rows={4} className="mt-2 w-full bg-background border border-border/60 px-3 py-2 text-sm leading-relaxed resize-y" />
      <span className="mt-1 block text-[10px] text-muted-foreground">One item per line or comma-separated.</span>
    </label>
  );
}

function BooleanRow({ label, value, onChange, locked = false }: { label: string; value: boolean; onChange: (value: boolean) => void; locked?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-3">
      <div>
        <p className="text-sm text-foreground/80">{label}</p>
        {locked && <p className="text-[10px] text-muted-foreground mt-1">Core B2B rule</p>}
      </div>
      <button type="button" disabled={locked} onClick={() => onChange(!value)} className={`min-h-10 min-w-20 border px-3 text-[10px] uppercase tracking-[0.14em] ${value ? "border-emerald-500/50 text-emerald-300 bg-emerald-500/10" : "border-border/60 text-muted-foreground"} disabled:opacity-70`}>
        {value ? "Enabled" : "Disabled"}
      </button>
    </div>
  );
}

function Action({ children, icon, onClick, primary = false, disabled = false }: { children: React.ReactNode; icon: React.ReactNode; onClick: () => void; primary?: boolean; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`min-h-11 inline-flex items-center gap-2 border px-4 py-2 text-[10px] uppercase tracking-[0.15em] disabled:opacity-40 disabled:cursor-not-allowed ${primary ? "border-gold bg-gold text-background" : "border-border/60 hover:border-gold hover:text-gold"}`}>
      {icon}{children}
    </button>
  );
}
