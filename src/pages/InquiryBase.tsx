import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Check, MessageCircle, FileText, Package, BookOpen, Image as ImageIcon, Calendar, type LucideIcon } from "lucide-react";
import SEO from "@/components/SEO";
import SecureFileUpload from "@/components/SecureFileUpload";
import { WHATSAPP_NUMBER } from "@/lib/constants";
import { createPublicInquiryReference } from "@/lib/publicLeadGateway";

import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  clearDraft,
  loadDraft,
  saveDraft,
  type InquiryDraft,
  type InquiryIntent,
  type UploadedFileRef,
} from "@/lib/inquiryDraft";

const INTENTS: { id: InquiryIntent; label: string; blurb: string; icon: LucideIcon }[] = [
  { id: "rfq", label: "Request Quote", blurb: "OEM / ODM / private-label pricing", icon: FileText },
  { id: "sample", label: "Request Sample", blurb: "Physical samples for evaluation", icon: Package },
  { id: "catalogue", label: "Request Catalogue", blurb: "PDF catalogue + fabric options", icon: BookOpen },
  { id: "reference", label: "Upload Reference", blurb: "Tech pack / artwork / mockup", icon: ImageIcon },
  { id: "meeting", label: "Request Meeting", blurb: "Video call with our team", icon: Calendar },
];

const contactSchema = z.object({
  name: z.string().trim().min(2, "Name required").max(80),
  company: z.string().trim().min(2, "Company required").max(120),
  email: z.string().trim().email("Invalid email").max(120),
  whatsapp: z.string().trim().min(6, "WhatsApp / phone required").max(30),
  country: z.string().trim().min(2, "Country required").max(60),
});

type Step = 1 | 2 | 3 | 4 | 5;
const STEP_LABELS = ["Intent", "Requirements", "Files", "Contact", "Review"] as const;

function isValidIntent(x: string | null): x is InquiryIntent {
  return !!x && ["rfq", "sample", "catalogue", "reference", "meeting"].includes(x);
}

function getSessionId(): string {
  try {
    const KEY = "irha_inquiry_session";
    let sid = sessionStorage.getItem(KEY);
    if (!sid) {
      sid = "s-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      sessionStorage.setItem(KEY, sid);
    }
    return sid;
  } catch {
    return "s-" + Date.now().toString(36);
  }
}

export default function Inquiry() {
  const [params] = useSearchParams();

  // ---- Product / list context from URL (source of truth on first load) ----
  const urlContext = useMemo(() => {
    const shortlist = (params.get("shortlist") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const shortlistNames = (params.get("names") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const compareSlugs = (params.get("compare") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const compareNames = (params.get("compareNames") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    return {
      productSlug: params.get("product") ?? undefined,
      productName: params.get("name") ?? undefined,
      productCode: params.get("code") ?? undefined,
      categorySlug: params.get("category") ?? undefined,
      shortlistSlugs: shortlist.length ? shortlist : undefined,
      shortlistNames: shortlistNames.length ? shortlistNames : undefined,
      compareSlugs: compareSlugs.length ? compareSlugs : undefined,
      compareNames: compareNames.length ? compareNames : undefined,
    };
  }, [params]);

  // ---- State ----
  const initialIntent: InquiryIntent = isValidIntent(params.get("intent")) ? (params.get("intent") as InquiryIntent) : "rfq";
  const [step, setStep] = useState<Step>(1);
  const [draft, setDraft] = useState<Omit<InquiryDraft, "v" | "updatedAt">>(() => ({
    step: 1,
    intent: initialIntent,
    files: [],
    productContext: urlContext,
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [restored, setRestored] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<null | { ref: string }>(null);
  const submitLockRef = useRef(false);
  const formStartedAtRef = useRef(Date.now());
  const sessionId = useMemo(getSessionId, []);
  const [dbCategories, setDbCategories] = useState<{ slug: string; name: string }[]>([]);

  // ---- Live DB categories for the catalogue picker ----
  useEffect(() => {
    let cancelled = false;
    supabase
      .from("categories")
      .select("slug,name,sort_order")
      .is("parent_id", null)
      .eq("is_published", true)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .then(({ data }) => {
        if (cancelled || !data) return;
        setDbCategories(data.map((c) => ({ slug: c.slug as string, name: c.name as string })));
      });
    return () => { cancelled = true; };
  }, []);

  // ---- Ensure inquiryRef exists once per draft (idempotency for retries) ----
  useEffect(() => {
    if (!draft.inquiryRef) {
      setDraft((d) => ({ ...d, inquiryRef: createPublicInquiryReference() }));
    }
  }, [draft.inquiryRef]);

  // ---- Load draft once ----
  useEffect(() => {
    const d = loadDraft();
    if (d) {
      setDraft((prev) => ({
        ...prev,
        ...d,
        // URL params override draft's product context if present
        intent: isValidIntent(params.get("intent")) ? (params.get("intent") as InquiryIntent) : d.intent,
        productContext: urlContext.productSlug || urlContext.shortlistSlugs || urlContext.compareSlugs ? urlContext : d.productContext,
      }));
      setStep((d.step as Step) || 1);
      setRestored(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Autosave (debounced) ----
  useEffect(() => {
    const t = window.setTimeout(() => saveDraft({ ...draft, step }), 400);
    return () => window.clearTimeout(t);
  }, [draft, step]);

  const setField = useCallback(<K extends keyof typeof draft>(k: K, v: (typeof draft)[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
  }, []);

  // ---- Step validation ----
  const validateStep = (): boolean => {
    const errs: Record<string, string> = {};
    if (step === 2) {
      if (!draft.company?.trim()) errs.company = "Company required";
      if (!draft.country?.trim()) errs.country = "Destination country required";
      if (draft.intent === "rfq" && !draft.quantity?.trim()) errs.quantity = "Estimated quantity required";
      if (draft.intent === "sample" && !draft.sampleQty?.trim()) errs.sampleQty = "Sample quantity required";
      if (draft.intent === "meeting" && !draft.meetingTopic?.trim()) errs.meetingTopic = "Topic required";
    }
    if (step === 4) {
      const parsed = contactSchema.safeParse({
        name: draft.name ?? "",
        company: draft.company ?? "",
        email: draft.email ?? "",
        whatsapp: draft.whatsapp ?? "",
        country: draft.country ?? "",
      });
      if (!parsed.success) {
        parsed.error.issues.forEach((i) => (errs[i.path[0] as string] = i.message));
      }
    }
    if (step === 5 && draft.consent !== true) {
      errs.consent = "Consent is required before submission";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const next = () => {
    if (!validateStep()) return;
    setStep((s) => (Math.min(5, s + 1) as Step));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const back = () => {
    setStep((s) => (Math.max(1, s - 1) as Step));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ---- Submit ----
  const submit = async () => {
    if (submitLockRef.current || submitting) return;
    if (!validateStep()) return;
    submitLockRef.current = true;
    setSubmitting(true);

    // Reuse the ref persisted in the draft — never generate a new one per attempt.
    let ref = draft.inquiryRef;
    if (!ref) {
      ref = createPublicInquiryReference();
      setDraft((d) => ({ ...d, inquiryRef: ref }));
    }

    const utm = {
      source: params.get("utm_source") ?? undefined,
      medium: params.get("utm_medium") ?? undefined,
      campaign: params.get("utm_campaign") ?? undefined,
      content: params.get("utm_content") ?? undefined,
      term: params.get("utm_term") ?? undefined,
    };

    const ctx = draft.productContext ?? {};
    const hasCompare = !!(ctx.compareSlugs && ctx.compareSlugs.length);
    const hasShortlist = !!(ctx.shortlistSlugs && ctx.shortlistSlugs.length);
    const derivedIntentType =
      draft.intent === "rfq"
        ? hasCompare
          ? "compare-rfq"
          : hasShortlist && ctx.shortlistSlugs!.length > 1
            ? "multi-product-rfq"
            : ctx.productSlug
              ? "single-product-rfq"
              : "general-rfq"
        : draft.intent;

    const leadContext: Record<string, unknown> = {
      conversion_type: "inquiry",
      intent: draft.intent,
      intent_detail: derivedIntentType,
      inquiry_ref: ref,
      source_page: window.location.pathname + window.location.search,
      current_page: window.location.href,
      landing_page: sessionStorage.getItem("irha_landing") || window.location.pathname,
      referrer: document.referrer || null,
      device_type: /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : "desktop",
      product_slug: ctx.productSlug ?? null,
      product_name: ctx.productName ?? null,
      product_code: ctx.productCode ?? null,
      product_slugs: hasCompare ? ctx.compareSlugs : hasShortlist ? ctx.shortlistSlugs : null,
      product_names: hasCompare ? ctx.compareNames : hasShortlist ? ctx.shortlistNames : null,
      category: ctx.categorySlug ?? null,
      shortlist_origin: hasShortlist && !hasCompare,
      compare_origin: hasCompare,
      utm_source: utm.source ?? null,
      utm_medium: utm.medium ?? null,
      utm_campaign: utm.campaign ?? null,
      utm_content: utm.content ?? null,
      utm_term: utm.term ?? null,
      buyer_type: draft.buyerType ?? null,
      quantity: draft.quantity ?? null,
      destination_country: draft.country ?? null,
      uploaded_files: draft.files.map((f) => ({ path: f.path, name: f.name, size: f.size, mime: f.mime })),
      sample_requirements: draft.intent === "sample" ? {
        quantity: draft.sampleQty,
        size: draft.sampleSize,
        color: draft.sampleColor,
        branding: draft.sampleBranding,
      } : null,
      catalogue_preferences: draft.intent === "catalogue" ? {
        preference: draft.cataloguePreference,
        categories: draft.catalogueCategories ?? [],
      } : null,
      reference_notes: draft.intent === "reference" ? draft.referenceNotes ?? null : null,
      meeting_preferences: draft.intent === "meeting" ? {
        topic: draft.meetingTopic,
        date: draft.meetingDate,
        time_window: draft.meetingTime,
        timezone: draft.meetingTz,
      } : null,
      form_started_at: formStartedAtRef.current,
      consent: {
        given: draft.consent === true,
        accepted_at: new Date().toISOString(),
        privacy_policy: "/privacy-policy",
      },
      submitted_at: new Date().toISOString(),
    };

    try {
      const { error } = await supabase.from("inquiries").insert({
        name: draft.name!,
        email: draft.email!,
        company: draft.company ?? null,
        country: draft.country ?? null,
        phone: draft.whatsapp ?? null,
        category: ctx.categorySlug ?? null,
        quantity: draft.quantity ?? draft.sampleQty ?? null,
        message: buildMessage(draft),
        source: "inquiry-wizard",
        intent: draft.intent,
        lead_context: leadContext,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        inquiry_ref: ref,
      } as any);
      if (error) {
        // Only treat 23505 on inquiry_ref as idempotent success (retry after successful insert).
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const e = error as any;
        const isDupOnRef =
          e?.code === "23505" &&
          typeof e?.message === "string" &&
          e.message.toLowerCase().includes("inquiry_ref");
        if (!isDupOnRef) throw error;
      }
      clearDraft();
      setDone({ ref });
      setStep(5);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Please try again";
      toast({ title: "Submission failed", description: msg, variant: "destructive" });
      submitLockRef.current = false;
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Render ----
  const stepIdx = step - 1;
  const contextChip = describeContext(draft);

  return (
    <>
      <SEO
        title="B2B Inquiry — Quote, Sample, Catalogue | Irha Apparels"
        description="Send a B2B inquiry to Irha Apparels: request a quote, sample, catalogue, meeting, or share your reference design. OEM & private-label garment manufacturing."
        path="/inquiry"
      />

      <section className="pt-32 pb-10 border-b border-border/60">
        <div className="container-luxe max-w-4xl">
          <p className="eyebrow mb-4">B2B Inquiry</p>
          <h1 className="font-display text-4xl md:text-6xl leading-[1.02]">
            Tell us what you need.
          </h1>
          {contextChip && (
            <p className="mt-4 text-xs uppercase tracking-[0.25em] text-primary/90">{contextChip}</p>
          )}
          {restored && !done && (
            <p className="mt-4 text-xs text-foreground/60">
              Draft restored.{" "}
              <button
                type="button"
                onClick={() => { clearDraft(); setDraft({ step: 1, intent: initialIntent, files: [], productContext: urlContext }); setStep(1); setRestored(false); }}
                className="underline hover:text-primary"
              >
                Start over
              </button>
            </p>
          )}
        </div>
      </section>

      <section className="py-10 md:py-14">
        <div className="container-luxe max-w-4xl">
          {!done && (
            <ol className="flex items-center gap-2 md:gap-4 mb-8 md:mb-10 overflow-x-auto">
              {STEP_LABELS.map((lbl, i) => {
                const n = i + 1;
                const active = n === step;
                const past = n < step;
                return (
                  <li key={lbl} className="flex items-center gap-2 md:gap-3 shrink-0">
                    <span
                      className={`w-7 h-7 md:w-8 md:h-8 inline-flex items-center justify-center border text-[11px] ${
                        active ? "border-primary bg-primary text-primary-foreground"
                        : past ? "border-primary text-primary"
                        : "border-border text-foreground/50"
                      }`}
                    >
                      {past ? <Check size={12} /> : n}
                    </span>
                    <span className={`text-[10px] md:text-[11px] uppercase tracking-[0.2em] ${
                      active ? "text-foreground" : past ? "text-primary" : "text-foreground/50"
                    }`}>{lbl}</span>
                    {i < STEP_LABELS.length - 1 && (
                      <span className={`hidden md:inline w-8 h-px ${past ? "bg-primary" : "bg-border"}`} />
                    )}
                  </li>
                );
              })}
            </ol>
          )}

          {done ? (
            <SuccessScreen
              ref={done.ref}
              draft={draft}
            />
          ) : (
            <div className="border border-border/60 bg-card/40 p-6 md:p-10">
              {step === 1 && <StepIntent draft={draft} setField={setField} />}
              {step === 2 && <StepRequirements draft={draft} setField={setField} errors={errors} dbCategories={dbCategories} />}
              {step === 3 && (
                <StepFiles
                  draft={draft}
                  onFiles={(files) => setField("files", files)}
                  sessionId={sessionId}
                />
              )}
              {step === 4 && <StepContact draft={draft} setField={setField} errors={errors} />}
              {step === 5 && (
                <StepReview
                  draft={draft}
                  onEditStep={(s) => setStep(s as Step)}
                  setField={setField}
                  errors={errors}
                />
              )}

              <div className="flex items-center justify-between mt-8 pt-6 border-t border-border/60">
                <button
                  type="button"
                  onClick={back}
                  disabled={step === 1 || submitting}
                  className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-foreground/70 hover:text-foreground disabled:opacity-30"
                >
                  <ArrowLeft size={14} /> Back
                </button>
                {step < 5 ? (
                  <button
                    type="button"
                    onClick={next}
                    className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 text-xs uppercase tracking-[0.25em] hover:opacity-90"
                  >
                    Continue <ArrowRight size={14} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={submit}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 text-xs uppercase tracking-[0.25em] hover:opacity-90 disabled:opacity-60"
                  >
                    {submitting ? "Sending…" : "Submit inquiry"} <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

/* ---------- helpers ---------- */

function describeContext(d: Pick<InquiryDraft, "intent" | "productContext">): string | null {
  const c = d.productContext;
  if (!c) return null;
  if (c.productName) return `For: ${c.productName}${c.productCode ? ` · ${c.productCode}` : ""}`;
  if (c.compareNames?.length) return `Compare · ${c.compareNames.length} product${c.compareNames.length > 1 ? "s" : ""}`;
  if (c.shortlistNames?.length) return `Shortlist · ${c.shortlistNames.length} product${c.shortlistNames.length > 1 ? "s" : ""}`;
  if (c.categorySlug) return `Category: ${c.categorySlug}`;
  return null;
}

function buildMessage(d: InquiryDraft | Omit<InquiryDraft, "v" | "updatedAt">): string {
  const parts: string[] = [];
  parts.push(`Intent: ${d.intent.toUpperCase()}`);
  if (d.productContext?.productName) {
    const code = d.productContext.productCode;
    parts.push(`Product: ${d.productContext.productName}${code ? ` (${code})` : ""}`);
  }
  if (d.productContext?.shortlistNames?.length) parts.push(`Shortlist: ${d.productContext.shortlistNames.join(", ")}`);
  if (d.productContext?.compareNames?.length) parts.push(`Compare: ${d.productContext.compareNames.join(", ")}`);
  if (d.buyerType) parts.push(`Buyer type: ${d.buyerType}`);
  if (d.quantity) parts.push(`Quantity: ${d.quantity}`);
  if (d.intent === "sample" && d.sampleQty) parts.push(`Sample: ${d.sampleQty} · ${d.sampleSize ?? ""} · ${d.sampleColor ?? ""} · ${d.sampleBranding ?? ""}`);
  if (d.intent === "catalogue") parts.push(`Catalogue: ${d.cataloguePreference ?? "full"}${d.catalogueCategories?.length ? " · " + d.catalogueCategories.join(", ") : ""}`);
  if (d.intent === "reference" && d.referenceNotes) parts.push(`Reference notes: ${d.referenceNotes}`);
  if (d.intent === "meeting") parts.push(`Meeting: ${d.meetingTopic ?? ""} · ${d.meetingDate ?? ""} ${d.meetingTime ?? ""} ${d.meetingTz ?? ""}`);
  if (d.notes) parts.push(`Notes: ${d.notes}`);
  if (d.files.length) parts.push(`Files attached: ${d.files.length}`);
  return parts.join("\n");
}

/* ---------- step components ---------- */

function StepIntent({
  draft, setField,
}: { draft: Omit<InquiryDraft, "v" | "updatedAt">; setField: <K extends keyof Omit<InquiryDraft,"v"|"updatedAt">>(k: K, v: InquiryDraft[K]) => void }) {
  return (
    <div>
      <h2 className="font-display text-2xl md:text-3xl mb-2">What do you need?</h2>
      <p className="text-sm text-foreground/60 mb-6">Choose one — you can add more detail on the next step.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        {INTENTS.map(({ id, label, blurb, icon: Icon }) => {
          const active = draft.intent === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setField("intent", id)}
              className={`text-left p-5 border transition-all ${
                active ? "border-primary bg-primary/5 text-primary" : "border-border/60 hover:border-foreground/40"
              }`}
            >
              <Icon size={20} />
              <p className="font-display text-lg mt-3">{label}</p>
              <p className="text-xs text-foreground/60 mt-1">{blurb}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepRequirements({
  draft, setField, errors, dbCategories,
}: {
  draft: Omit<InquiryDraft, "v" | "updatedAt">;
  setField: <K extends keyof Omit<InquiryDraft,"v"|"updatedAt">>(k: K, v: InquiryDraft[K]) => void;
  errors: Record<string, string>;
  dbCategories: { slug: string; name: string }[];
}) {
  const input = "w-full bg-input border border-border focus:border-primary outline-none px-4 py-3 text-sm";
  const label = "block text-[11px] uppercase tracking-[0.25em] text-muted-foreground mb-2";
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl md:text-3xl mb-2">Requirements</h2>
        <p className="text-sm text-foreground/60">Our team reviews your requirements and follows up using the contact details provided.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className={label}>Buyer type</label>
          <select
            className={input}
            value={draft.buyerType ?? ""}
            onChange={(e) => setField("buyerType", e.target.value)}
          >
            <option value="">Select…</option>
            <option value="brand">Brand / Retailer</option>
            <option value="wholesaler">Wholesaler / Importer</option>
            <option value="agency">Sourcing Agency</option>
            <option value="uniform">Uniform / Club / Team</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className={label}>Company / Brand *</label>
          <input required autoComplete="organization" className={input} value={draft.company ?? ""} onChange={(e) => setField("company", e.target.value)} />
          {errors.company && <p className="text-xs text-destructive mt-1">{errors.company}</p>}
        </div>
        <div>
          <label className={label}>Destination country *</label>
          <input className={input} placeholder="e.g. Germany" value={draft.country ?? ""} onChange={(e) => setField("country", e.target.value)} />
          {errors.country && <p className="text-xs text-destructive mt-1">{errors.country}</p>}
        </div>
        {(draft.intent === "rfq") && (
          <div>
            <label className={label}>Estimated quantity *</label>
            <input className={input} placeholder="e.g. 500 pcs / style" value={draft.quantity ?? ""} onChange={(e) => setField("quantity", e.target.value)} />
            {errors.quantity && <p className="text-xs text-destructive mt-1">{errors.quantity}</p>}
          </div>
        )}
      </div>

      {draft.intent === "sample" && (
        <div className="grid md:grid-cols-2 gap-4 border-t border-border/40 pt-4">
          <div>
            <label className={label}>Sample quantity *</label>
            <input className={input} placeholder="e.g. 2 pcs / style" value={draft.sampleQty ?? ""} onChange={(e) => setField("sampleQty", e.target.value)} />
            {errors.sampleQty && <p className="text-xs text-destructive mt-1">{errors.sampleQty}</p>}
          </div>
          <div>
            <label className={label}>Size</label>
            <input className={input} placeholder="e.g. M / L" value={draft.sampleSize ?? ""} onChange={(e) => setField("sampleSize", e.target.value)} />
          </div>
          <div>
            <label className={label}>Color / Colorway</label>
            <input className={input} placeholder="e.g. Navy / Ivory" value={draft.sampleColor ?? ""} onChange={(e) => setField("sampleColor", e.target.value)} />
          </div>
          <div>
            <label className={label}>Plain or branded</label>
            <select className={input} value={draft.sampleBranding ?? ""} onChange={(e) => setField("sampleBranding", (e.target.value || undefined) as InquiryDraft["sampleBranding"])}>
              <option value="">Select…</option>
              <option value="plain">Plain</option>
              <option value="branded">Branded (with our logo)</option>
            </select>
          </div>
          <p className="md:col-span-2 text-[11px] text-foreground/60">
            Availability, cost and timeline are confirmed after requirement review.
          </p>
        </div>
      )}

      {draft.intent === "catalogue" && (
        <div className="grid gap-4 border-t border-border/40 pt-4">
          <div>
            <label className={label}>Catalogue preference</label>
            <select
              className={input}
              value={draft.cataloguePreference ?? "full"}
              onChange={(e) => setField("cataloguePreference", e.target.value as InquiryDraft["cataloguePreference"])}
            >
              <option value="full">Full catalogue</option>
              <option value="selected">Selected categories</option>
            </select>
          </div>
          {draft.cataloguePreference === "selected" && (
            <div>
              <label className={label}>Categories</label>
              <div className="grid sm:grid-cols-2 gap-2">
                {dbCategories.map((c) => {
                  const on = draft.catalogueCategories?.includes(c.slug) ?? false;
                  return (
                    <label key={c.slug} className={`flex items-center gap-3 border px-3 py-2 cursor-pointer text-sm ${on ? "border-primary text-primary" : "border-border/60"}`}>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={(e) => {
                          const cur = draft.catalogueCategories ?? [];
                          setField("catalogueCategories", e.target.checked ? [...cur, c.slug] : cur.filter((x) => x !== c.slug));
                        }}
                      />
                      {c.name}
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {draft.intent === "reference" && (
        <div className="border-t border-border/40 pt-4">
          <label className={label}>Reference / customization notes</label>
          <textarea
            rows={4}
            className={input}
            placeholder="Describe what you'd like to build — fabric, print, embellishments, references…"
            value={draft.referenceNotes ?? ""}
            onChange={(e) => setField("referenceNotes", e.target.value)}
          />
          <p className="text-[11px] text-foreground/60 mt-2">Upload tech pack / artwork on the next step.</p>
        </div>
      )}

      {draft.intent === "meeting" && (
        <div className="grid md:grid-cols-2 gap-4 border-t border-border/40 pt-4">
          <div className="md:col-span-2">
            <label className={label}>Topic *</label>
            <input className={input} placeholder="e.g. AW26 uniform program" value={draft.meetingTopic ?? ""} onChange={(e) => setField("meetingTopic", e.target.value)} />
            {errors.meetingTopic && <p className="text-xs text-destructive mt-1">{errors.meetingTopic}</p>}
          </div>
          <div>
            <label className={label}>Preferred date</label>
            <input type="date" className={input} value={draft.meetingDate ?? ""} onChange={(e) => setField("meetingDate", e.target.value)} />
          </div>
          <div>
            <label className={label}>Time window</label>
            <input className={input} placeholder="e.g. 10:00–12:00" value={draft.meetingTime ?? ""} onChange={(e) => setField("meetingTime", e.target.value)} />
          </div>
          <div>
            <label className={label}>Timezone</label>
            <input className={input} placeholder="e.g. CET / EST" value={draft.meetingTz ?? ""} onChange={(e) => setField("meetingTz", e.target.value)} />
          </div>
          <p className="md:col-span-2 text-[11px] text-foreground/60">
            Meeting request received. Availability will be confirmed.
          </p>
        </div>
      )}

      <div>
        <label className={label}>Notes / requirements</label>
        <textarea
          rows={4}
          className={input}
          placeholder="Fabric preferences, deadlines, target price band, anything else…"
          value={draft.notes ?? ""}
          onChange={(e) => setField("notes", e.target.value)}
        />
      </div>
    </div>
  );
}

function StepFiles({
  draft, onFiles, sessionId,
}: { draft: Omit<InquiryDraft, "v" | "updatedAt">; onFiles: (files: UploadedFileRef[]) => void; sessionId: string }) {
  return (
    <div>
      <h2 className="font-display text-2xl md:text-3xl mb-2">Files (optional)</h2>
      <p className="text-sm text-foreground/60 mb-6">
        {draft.intent === "reference"
          ? "Attach your tech pack, artwork, or mockups."
          : draft.intent === "sample"
            ? "Attach reference images / logo if applicable."
            : "Attach a tech pack, logo, brief or reference photo if useful."}
      </p>
      <SecureFileUpload value={draft.files} onChange={onFiles} sessionId={sessionId} />
    </div>
  );
}

function StepContact({
  draft, setField, errors,
}: {
  draft: Omit<InquiryDraft, "v" | "updatedAt">;
  setField: <K extends keyof Omit<InquiryDraft,"v"|"updatedAt">>(k: K, v: InquiryDraft[K]) => void;
  errors: Record<string, string>;
}) {
  const input = "w-full bg-input border border-border focus:border-primary outline-none px-4 py-3 text-sm";
  const label = "block text-[11px] uppercase tracking-[0.25em] text-muted-foreground mb-2";
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl md:text-3xl mb-2">Your contact details</h2>
        <p className="text-sm text-foreground/60">We use these details to review and respond to this request by email or WhatsApp.</p>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className={label}>Full name *</label>
          <input required autoComplete="name" className={input} value={draft.name ?? ""} onChange={(e) => setField("name", e.target.value)} />
          {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
        </div>
        <div>
          <label className={label}>Company *</label>
          <input required autoComplete="organization" className={input} value={draft.company ?? ""} onChange={(e) => setField("company", e.target.value)} />
          {errors.company && <p className="text-xs text-destructive mt-1">{errors.company}</p>}
        </div>
        <div>
          <label className={label}>Email *</label>
          <input required type="email" autoComplete="email" className={input} value={draft.email ?? ""} onChange={(e) => setField("email", e.target.value)} />
          {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
        </div>
        <div>
          <label className={label}>WhatsApp / phone *</label>
          <input required type="tel" autoComplete="tel" className={input} placeholder="+1 555 000 0000" value={draft.whatsapp ?? ""} onChange={(e) => setField("whatsapp", e.target.value)} />
          {errors.whatsapp && <p className="text-xs text-destructive mt-1">{errors.whatsapp}</p>}
        </div>
        <div className="md:col-span-2">
          <label className={label}>Country *</label>
          <input required autoComplete="country-name" className={input} value={draft.country ?? ""} onChange={(e) => setField("country", e.target.value)} />
          {errors.country && <p className="text-xs text-destructive mt-1">{errors.country}</p>}
        </div>
      </div>
    </div>
  );
}

function StepReview({
  draft, onEditStep, setField, errors,
}: {
  draft: Omit<InquiryDraft, "v" | "updatedAt">;
  onEditStep: (s: number) => void;
  setField: <K extends keyof Omit<InquiryDraft, "v" | "updatedAt">>(k: K, v: InquiryDraft[K]) => void;
  errors: Record<string, string>;
}) {
  const row = "flex items-start justify-between gap-4 py-3 border-b border-border/40 last:border-0";
  const key = "text-[11px] uppercase tracking-[0.25em] text-foreground/55 min-w-[140px]";
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl md:text-3xl mb-2">Review & submit</h2>
        <p className="text-sm text-foreground/60">We won't send anything until you press Submit.</p>
      </div>
      <section>
        <div className="flex items-center justify-between mb-1">
          <p className="text-[11px] uppercase tracking-[0.25em] text-foreground/60">Intent</p>
          <button type="button" onClick={() => onEditStep(1)} className="text-[11px] uppercase tracking-[0.2em] text-primary hover:underline">Edit</button>
        </div>
        <div className={row}><span className={key}>Type</span><span className="text-sm">{INTENTS.find((i) => i.id === draft.intent)?.label ?? draft.intent}</span></div>
        {draft.productContext?.productName && (
          <div className={row}>
            <span className={key}>Product</span>
            <span className="text-sm text-right">
              {draft.productContext.productName}
              {draft.productContext.productCode ? ` · ${draft.productContext.productCode}` : ""}
            </span>
          </div>
        )}
        {draft.productContext?.shortlistNames?.length ? <div className={row}><span className={key}>Shortlist</span><span className="text-sm">{draft.productContext.shortlistNames.join(", ")}</span></div> : null}
        {draft.productContext?.compareNames?.length ? <div className={row}><span className={key}>Compare</span><span className="text-sm">{draft.productContext.compareNames.join(", ")}</span></div> : null}
      </section>
      <section>
        <div className="flex items-center justify-between mb-1">
          <p className="text-[11px] uppercase tracking-[0.25em] text-foreground/60">Requirements</p>
          <button type="button" onClick={() => onEditStep(2)} className="text-[11px] uppercase tracking-[0.2em] text-primary hover:underline">Edit</button>
        </div>
        {draft.buyerType && <div className={row}><span className={key}>Buyer type</span><span className="text-sm">{draft.buyerType}</span></div>}
        {draft.country && <div className={row}><span className={key}>Country</span><span className="text-sm">{draft.country}</span></div>}
        {draft.quantity && <div className={row}><span className={key}>Quantity</span><span className="text-sm">{draft.quantity}</span></div>}
        {draft.intent === "sample" && (draft.sampleQty || draft.sampleSize || draft.sampleColor) &&
          <div className={row}><span className={key}>Sample</span><span className="text-sm">{[draft.sampleQty, draft.sampleSize, draft.sampleColor, draft.sampleBranding].filter(Boolean).join(" · ")}</span></div>}
        {draft.intent === "catalogue" &&
          <div className={row}><span className={key}>Catalogue</span><span className="text-sm">{draft.cataloguePreference ?? "full"}{draft.catalogueCategories?.length ? " · " + draft.catalogueCategories.join(", ") : ""}</span></div>}
        {draft.intent === "meeting" &&
          <div className={row}><span className={key}>Meeting</span><span className="text-sm">{[draft.meetingTopic, draft.meetingDate, draft.meetingTime, draft.meetingTz].filter(Boolean).join(" · ")}</span></div>}
        {draft.notes && <div className={row}><span className={key}>Notes</span><span className="text-sm whitespace-pre-wrap">{draft.notes}</span></div>}
        {draft.intent === "reference" && draft.referenceNotes &&
          <div className={row}><span className={key}>Reference</span><span className="text-sm whitespace-pre-wrap">{draft.referenceNotes}</span></div>}
      </section>
      <section>
        <div className="flex items-center justify-between mb-1">
          <p className="text-[11px] uppercase tracking-[0.25em] text-foreground/60">Files</p>
          <button type="button" onClick={() => onEditStep(3)} className="text-[11px] uppercase tracking-[0.2em] text-primary hover:underline">Edit</button>
        </div>
        {draft.files.length ? (
          <ul className="text-sm space-y-1">
            {draft.files.map((f) => <li key={f.path} className="flex items-center gap-2 text-foreground/80"><FileText size={14} /> {f.name}</li>)}
          </ul>
        ) : <p className="text-sm text-foreground/60">No files attached.</p>}
      </section>
      <section>
        <div className="flex items-center justify-between mb-1">
          <p className="text-[11px] uppercase tracking-[0.25em] text-foreground/60">Contact</p>
          <button type="button" onClick={() => onEditStep(4)} className="text-[11px] uppercase tracking-[0.2em] text-primary hover:underline">Edit</button>
        </div>
        <div className={row}><span className={key}>Name</span><span className="text-sm">{draft.name}</span></div>
        <div className={row}><span className={key}>Company</span><span className="text-sm">{draft.company}</span></div>
        <div className={row}><span className={key}>Email</span><span className="text-sm">{draft.email}</span></div>
        <div className={row}><span className={key}>WhatsApp</span><span className="text-sm">{draft.whatsapp}</span></div>
      </section>
      <label className="flex cursor-pointer items-start gap-3 border border-border/60 bg-background/45 p-4 text-sm leading-6">
        <input
          type="checkbox"
          checked={draft.consent === true}
          onChange={(event) => setField("consent", event.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-primary"
        />
        <span>
          I consent to Irha Apparels using these contact details and private files to review and respond to this request. I understand this submission is not a quotation, booking or production commitment.{" "}
          <Link to="/privacy-policy" className="text-primary underline underline-offset-2">Privacy policy</Link>
        </span>
      </label>
      {errors.consent && <p className="text-xs text-destructive" role="alert">{errors.consent}</p>}
      <p className="text-[11px] leading-5 text-foreground/55">
        Submission is acknowledged on screen and reviewed manually. Follow-up timing depends on the requirement and is not guaranteed until a team member responds.
      </p>
    </div>
  );
}

function SuccessScreen({
  ref: inquiryRef, draft,
}: { ref: string; draft: Omit<InquiryDraft, "v" | "updatedAt"> }) {
  const summary = [
    `Inquiry ${inquiryRef}`,
    `Intent: ${INTENTS.find((i) => i.id === draft.intent)?.label ?? draft.intent}`,
    draft.productContext?.productName ? `Product: ${draft.productContext.productName}` : null,
    draft.productContext?.shortlistNames?.length ? `Shortlist: ${draft.productContext.shortlistNames.join(", ")}` : null,
    draft.company ? `Company: ${draft.company}` : null,
    draft.country ? `Country: ${draft.country}` : null,
  ].filter(Boolean).join("\n");
  const waHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi Irha Apparels — following up on my inquiry.\n\n${summary}`)}`;
  return (
    <div className="border border-primary/40 bg-card/60 p-10 text-center">
      <div className="mx-auto w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center mb-5">
        <Check className="text-primary" size={26} />
      </div>
      <h2 className="font-display text-3xl md:text-4xl">Inquiry received</h2>
      <p className="text-sm text-foreground/70 mt-3">
        Reference <span className="font-mono text-foreground">{inquiryRef}</span>. Our team reviews your requirements and follows up using the contact details provided.
      </p>
      <p className="text-[11px] text-foreground/55 mt-3">
        This request is now queued for manual review. Follow-up timing depends on the requirement; no price, sample, meeting or production commitment is created by this submission.
      </p>
      <div className="mt-8 flex flex-wrap gap-3 justify-center">
        <a
          href={waHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-3 bg-primary text-primary-foreground px-7 py-3.5 text-xs uppercase tracking-[0.25em]"
        >
          <MessageCircle size={14} /> Continue on WhatsApp
        </a>
        <Link
          to="/products"
          className="inline-flex items-center gap-3 border border-border/60 hover:border-primary hover:text-primary px-7 py-3.5 text-xs uppercase tracking-[0.25em]"
        >
          Browse collections
        </Link>
      </div>
    </div>
  );
}
