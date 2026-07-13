import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarPlus,
  CheckCircle2,
  ClipboardList,
  FilePlus2,
  PackagePlus,
  RefreshCw,
  UserPlus,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const db = supabase as any;

type ActionKey = "buyer" | "product" | "followup" | "meeting" | "quote";

type Buyer = {
  id: string;
  company_name: string;
  country: string;
  email: string | null;
};

type Category = {
  id: string;
  name: string;
  slug: string;
};

type ActionDefinition = {
  key: ActionKey;
  label: string;
  description: string;
  icon: typeof UserPlus;
};

const ACTIONS: ActionDefinition[] = [
  { key: "buyer", label: "Add a buyer", description: "Save a real buyer in the CRM.", icon: UserPlus },
  { key: "product", label: "Add a product draft", description: "Create a private draft before publishing.", icon: PackagePlus },
  { key: "followup", label: "Create a follow-up", description: "Add a dated task for a buyer.", icon: ClipboardList },
  { key: "meeting", label: "Schedule a meeting", description: "Save a sales or factory-video meeting.", icon: CalendarPlus },
  { key: "quote", label: "Create quotation draft", description: "Prepare a real quotation record for review.", icon: FilePlus2 },
];

function isoFromLocal(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function localDateTime(hoursAhead = 24) {
  const date = new Date(Date.now() + hoursAhead * 60 * 60 * 1000);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function dateOnly(daysAhead = 14) {
  const date = new Date(Date.now() + daysAhead * 86_400_000);
  return date.toISOString().slice(0, 10);
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

export default function GuidedBusinessActions() {
  const { user } = useAuth();
  const [active, setActive] = useState<ActionKey | null>(null);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadOptions = useCallback(async () => {
    setLoadingOptions(true);
    const [buyerResult, categoryResult] = await Promise.all([
      db
        .from("b2b_leads")
        .select("id,company_name,country,email")
        .order("updated_at", { ascending: false })
        .limit(300),
      db
        .from("categories")
        .select("id,name,slug")
        .eq("is_published", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
    ]);

    const messages = [buyerResult.error?.message, categoryResult.error?.message].filter(Boolean);
    setOptionsError(messages.length ? messages.join(" · ") : null);
    setBuyers((buyerResult.data ?? []) as Buyer[]);
    setCategories((categoryResult.data ?? []) as Category[]);
    setLoadingOptions(false);
  }, []);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  const selected = useMemo(() => ACTIONS.find((item) => item.key === active), [active]);

  const done = (title: string, description: string) => {
    toast({ title, description });
    setActive(null);
    void loadOptions();
  };

  return (
    <section className="mb-5 sm:mb-7 rounded-xl border border-gold/30 bg-card/55 overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-border/50 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-gold">Quick Start · Live Data</p>
          <h2 className="font-display text-xl mt-1">Do real business work in simple steps</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-3xl leading-relaxed">
            These actions save directly to your owner Supabase project. Nothing is published or sent without your review.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadOptions()}
          className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-md border border-border/60 text-muted-foreground hover:text-gold hover:border-gold/50"
          aria-label="Refresh business options"
          disabled={loadingOptions}
        >
          <RefreshCw size={16} className={cn(loadingOptions && "animate-spin")} />
        </button>
      </div>

      {optionsError && (
        <div className="mx-4 sm:mx-5 mt-4 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          Some options could not refresh: {optionsError}
        </div>
      )}

      <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-2 p-4 sm:p-5">
        {ACTIONS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setActive(item.key)}
              className={cn(
                "min-h-28 rounded-lg border px-4 py-4 text-left transition-colors",
                active === item.key
                  ? "border-gold bg-gold/10"
                  : "border-border/60 bg-background/30 hover:border-gold/50 hover:bg-muted/30",
              )}
            >
              <Icon size={20} className="text-gold" />
              <span className="block mt-3 text-sm font-semibold">{item.label}</span>
              <span className="block mt-1 text-xs text-muted-foreground leading-relaxed">{item.description}</span>
            </button>
          );
        })}
      </div>

      {active && selected && (
        <div className="border-t border-border/60 bg-background/35 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <h3 className="font-display text-lg">{selected.label}</h3>
              <p className="text-xs text-muted-foreground mt-1">Required fields are marked. Save creates a real database record.</p>
            </div>
            <button type="button" onClick={() => setActive(null)} className="min-h-11 min-w-11 inline-flex items-center justify-center text-muted-foreground" aria-label="Close form"><X size={18} /></button>
          </div>

          {active === "buyer" && <BuyerForm busy={busy} setBusy={setBusy} userId={user?.id} onDone={done} />}
          {active === "product" && <ProductForm busy={busy} setBusy={setBusy} categories={categories} userId={user?.id} onDone={done} />}
          {active === "followup" && <FollowUpForm busy={busy} setBusy={setBusy} buyers={buyers} userId={user?.id} onDone={done} />}
          {active === "meeting" && <MeetingForm busy={busy} setBusy={setBusy} buyers={buyers} userId={user?.id} onDone={done} />}
          {active === "quote" && <QuoteForm busy={busy} setBusy={setBusy} buyers={buyers} userId={user?.id} onDone={done} />}
        </div>
      )}
    </section>
  );
}

function BuyerForm({ busy, setBusy, userId, onDone }: FormProps) {
  const [form, setForm] = useState({
    company: "",
    country: "",
    email: "",
    phone: "",
    whatsapp: "",
    website: "",
    buyerType: "wholesaler",
    segment: "Bavarian garments",
    notes: "",
    priority: "normal",
  });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.company.trim() || !form.country.trim()) return;
    setBusy(true);
    const { error } = await db.from("b2b_leads").insert({
      company_name: form.company.trim(),
      country: form.country.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      whatsapp: form.whatsapp.trim() || null,
      website: form.website.trim() || null,
      website_domain: form.website.trim() ? form.website.trim().replace(/^https?:\/\//, "").split("/")[0] : null,
      buyer_type: form.buyerType,
      apparel_segment: form.segment.trim() || null,
      notes: form.notes.trim() || null,
      priority: form.priority,
      crm_status: "new",
      source_provider: "manual_admin",
      verification_evidence: { entered_by: userId || "admin", entered_at: new Date().toISOString() },
    });
    setBusy(false);
    if (error) return fail("Buyer was not saved", error.message);
    onDone("Buyer saved", `${form.company.trim()} is now in your live CRM.`);
  };

  return (
    <form onSubmit={submit} className="grid md:grid-cols-2 gap-4">
      <Field label="Company name *"><input required value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></Field>
      <Field label="Country *"><input required value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></Field>
      <Field label="Email"><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
      <Field label="Phone"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
      <Field label="WhatsApp"><input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></Field>
      <Field label="Website"><input type="url" placeholder="https://" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></Field>
      <Field label="Buyer type"><select value={form.buyerType} onChange={(e) => setForm({ ...form, buyerType: e.target.value })}><option value="wholesaler">Wholesaler</option><option value="importer">Importer</option><option value="distributor">Distributor</option><option value="retailer">Bulk retailer</option><option value="private_label">Private-label brand</option></select></Field>
      <Field label="Priority"><select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option><option value="low">Low</option></select></Field>
      <Field label="Product interest" full><input value={form.segment} onChange={(e) => setForm({ ...form, segment: e.target.value })} /></Field>
      <Field label="Internal notes" full><textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
      <Submit busy={busy} label="Save buyer" />
    </form>
  );
}

function ProductForm({ busy, setBusy, categories, onDone }: FormProps & { categories: Category[] }) {
  const [form, setForm] = useState({
    name: "",
    categoryId: "",
    description: "",
    material: "",
    moq: "100",
    sampleTimeline: "7–14 days",
    productionTimeline: "30–45 days",
  });

  useEffect(() => {
    if (!form.categoryId && categories[0]?.id) setForm((current) => ({ ...current, categoryId: categories[0].id }));
  }, [categories, form.categoryId]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.categoryId) return;
    setBusy(true);
    const baseSlug = slugify(form.name) || `product-${Date.now()}`;
    const { data: existing } = await db.from("products").select("id").eq("category_id", form.categoryId).eq("slug", baseSlug).maybeSingle();
    const slug = existing ? `${baseSlug}-${Date.now().toString().slice(-5)}` : baseSlug;
    const { error } = await db.from("products").insert({
      category_id: form.categoryId,
      name: form.name.trim(),
      slug,
      description: form.description.trim() || null,
      short_description: form.description.trim().slice(0, 180) || null,
      primary_material: form.material.trim() || null,
      material_specifications: form.material.trim() || null,
      moq_min: Number(form.moq) || null,
      moq_display: form.moq ? `${Number(form.moq)} pieces` : null,
      sample_available: true,
      sample_timeline: form.sampleTimeline.trim() || null,
      production_timeline: form.productionTimeline.trim() || null,
      country_of_origin: "Pakistan",
      is_published: false,
      is_featured: false,
    });
    setBusy(false);
    if (error) return fail("Product draft was not saved", error.message);
    onDone("Product draft created", `${form.name.trim()} is private and ready for images/spec review.`);
  };

  return (
    <form onSubmit={submit} className="grid md:grid-cols-2 gap-4">
      <Field label="Product name *"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
      <Field label="Category *"><select required value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}><option value="">Select category</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
      <Field label="Main material"><input placeholder="Leather, cotton, wool…" value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} /></Field>
      <Field label="Minimum order quantity"><input type="number" min="1" value={form.moq} onChange={(e) => setForm({ ...form, moq: e.target.value })} /></Field>
      <Field label="Sample timeline"><input value={form.sampleTimeline} onChange={(e) => setForm({ ...form, sampleTimeline: e.target.value })} /></Field>
      <Field label="Production timeline"><input value={form.productionTimeline} onChange={(e) => setForm({ ...form, productionTimeline: e.target.value })} /></Field>
      <Field label="Buyer-facing description" full><textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
      <div className="md:col-span-2 rounded-md border border-amber-500/35 bg-amber-500/5 px-3 py-2 text-xs text-muted-foreground">This creates a private draft. It will not appear on the public website until you review and publish it.</div>
      <Submit busy={busy} label="Create private product draft" />
    </form>
  );
}

function FollowUpForm({ busy, setBusy, buyers, userId, onDone }: FormProps & { buyers: Buyer[] }) {
  const [form, setForm] = useState({ buyerId: "", title: "Follow up with buyer", notes: "", dueAt: localDateTime(24), priority: "normal" });
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.buyerId || !form.title.trim()) return;
    setBusy(true);
    const { error } = await db.from("crm_tasks").insert({
      source_type: "prospect",
      source_id: form.buyerId,
      title: form.title.trim(),
      notes: form.notes.trim() || null,
      priority: form.priority,
      due_at: isoFromLocal(form.dueAt),
      assigned_to: "Owner",
      created_by: userId || null,
      updated_by: userId || null,
    });
    setBusy(false);
    if (error) return fail("Follow-up was not saved", error.message);
    onDone("Follow-up created", "The task is now visible in Today’s Work and the customer record.");
  };
  return <form onSubmit={submit} className="grid md:grid-cols-2 gap-4"><BuyerSelect buyers={buyers} value={form.buyerId} onChange={(buyerId) => setForm({ ...form, buyerId })} /><Field label="Task title *"><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field><Field label="Due date and time"><input type="datetime-local" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} /></Field><Field label="Priority"><select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option><option value="low">Low</option></select></Field><Field label="Notes" full><textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field><Submit busy={busy} label="Save follow-up" /></form>;
}

function MeetingForm({ busy, setBusy, buyers, userId, onDone }: FormProps & { buyers: Buyer[] }) {
  const [form, setForm] = useState({ buyerId: "", title: "Buyer meeting", type: "sales_call", startAt: localDateTime(24), location: "", agenda: "" });
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.buyerId || !form.title.trim() || !form.startAt) return;
    const start = new Date(form.startAt);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    setBusy(true);
    const { error } = await db.from("crm_meetings").insert({
      source_type: "prospect",
      source_id: form.buyerId,
      title: form.title.trim(),
      meeting_type: form.type,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Karachi",
      location_url: form.location.trim() || null,
      agenda: form.agenda.trim() || null,
      created_by: userId || null,
      updated_by: userId || null,
    });
    setBusy(false);
    if (error) return fail("Meeting was not saved", error.message);
    onDone("Meeting scheduled", "The meeting is now saved in the Commercial Hub and owner work queue.");
  };
  return <form onSubmit={submit} className="grid md:grid-cols-2 gap-4"><BuyerSelect buyers={buyers} value={form.buyerId} onChange={(buyerId) => setForm({ ...form, buyerId })} /><Field label="Meeting title *"><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field><Field label="Meeting type"><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="sales_call">Sales call</option><option value="factory_video">Factory live video</option><option value="sample_review">Sample review</option><option value="quotation_review">Quotation review</option><option value="other">Other</option></select></Field><Field label="Start date and time *"><input required type="datetime-local" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} /></Field><Field label="Secure meeting URL" full><input type="url" placeholder="https://" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field><Field label="Agenda" full><textarea rows={3} value={form.agenda} onChange={(e) => setForm({ ...form, agenda: e.target.value })} /></Field><Submit busy={busy} label="Schedule meeting" /></form>;
}

function QuoteForm({ busy, setBusy, buyers, userId, onDone }: FormProps & { buyers: Buyer[] }) {
  const [form, setForm] = useState({ buyerId: "", currency: "USD", validUntil: dateOnly(14), incoterm: "FOB", shipping: "FOB Sialkot / agreed export port", payment: "50% advance, balance before shipment", subtotal: "0", shippingAmount: "0", discount: "0", notes: "Draft quotation — owner review required before sending." });
  const selectedBuyer = buyers.find((item) => item.id === form.buyerId);
  const total = Math.max(0, (Number(form.subtotal) || 0) + (Number(form.shippingAmount) || 0) - (Number(form.discount) || 0));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedBuyer || !form.validUntil) return;
    setBusy(true);
    const { error } = await db.from("crm_quotations").insert({
      source_type: "prospect",
      source_id: selectedBuyer.id,
      buyer_name: selectedBuyer.company_name,
      company: selectedBuyer.company_name,
      destination_country: selectedBuyer.country,
      buyer_email: selectedBuyer.email,
      currency: form.currency,
      status: "draft",
      valid_until: form.validUntil,
      incoterm: form.incoterm.trim(),
      shipping_scope: form.shipping.trim(),
      payment_terms: form.payment.trim(),
      notes: form.notes.trim() || null,
      subtotal: Number(form.subtotal) || 0,
      shipping_amount: Number(form.shippingAmount) || 0,
      discount_amount: Number(form.discount) || 0,
      total_amount: total,
      created_by: userId || null,
      updated_by: userId || null,
    });
    setBusy(false);
    if (error) return fail("Quotation draft was not saved", error.message);
    onDone("Quotation draft created", "It is saved for owner review and has not been sent to the buyer.");
  };
  return <form onSubmit={submit} className="grid md:grid-cols-2 gap-4"><BuyerSelect buyers={buyers} value={form.buyerId} onChange={(buyerId) => setForm({ ...form, buyerId })} /><Field label="Currency"><select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>{["USD","EUR","GBP","AUD","CAD","AED"].map((currency) => <option key={currency}>{currency}</option>)}</select></Field><Field label="Valid until *"><input required type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} /></Field><Field label="Incoterm *"><input required value={form.incoterm} onChange={(e) => setForm({ ...form, incoterm: e.target.value })} /></Field><Field label="Subtotal"><input type="number" min="0" step="0.01" value={form.subtotal} onChange={(e) => setForm({ ...form, subtotal: e.target.value })} /></Field><Field label="Shipping amount"><input type="number" min="0" step="0.01" value={form.shippingAmount} onChange={(e) => setForm({ ...form, shippingAmount: e.target.value })} /></Field><Field label="Discount"><input type="number" min="0" step="0.01" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} /></Field><Field label={`Calculated total (${form.currency})`}><input readOnly value={total.toFixed(2)} /></Field><Field label="Shipping scope *" full><textarea required rows={2} value={form.shipping} onChange={(e) => setForm({ ...form, shipping: e.target.value })} /></Field><Field label="Payment terms *" full><textarea required rows={2} value={form.payment} onChange={(e) => setForm({ ...form, payment: e.target.value })} /></Field><Field label="Internal / quotation notes" full><textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field><div className="md:col-span-2 rounded-md border border-amber-500/35 bg-amber-500/5 px-3 py-2 text-xs text-muted-foreground">This saves a draft only. It cannot be sent until owner review and approval.</div><Submit busy={busy} label="Create quotation draft" /></form>;
}

type FormProps = {
  busy: boolean;
  setBusy: (value: boolean) => void;
  userId?: string;
  onDone: (title: string, description: string) => void;
};

function BuyerSelect({ buyers, value, onChange }: { buyers: Buyer[]; value: string; onChange: (value: string) => void }) {
  return <Field label="Buyer *"><select required value={value} onChange={(e) => onChange(e.target.value)}><option value="">Select a saved buyer</option>{buyers.map((buyer) => <option key={buyer.id} value={buyer.id}>{buyer.company_name} · {buyer.country}</option>)}</select></Field>;
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactElement }) {
  return <label className={cn("block text-xs text-muted-foreground", full && "md:col-span-2")}><span className="block mb-1.5 font-medium text-foreground/80">{label}</span><span className="guided-field block">{children}</span></label>;
}

function Submit({ busy, label }: { busy: boolean; label: string }) {
  return <div className="md:col-span-2 flex justify-end"><button disabled={busy} type="submit" className="min-h-12 inline-flex items-center justify-center gap-2 rounded-md bg-gold px-5 py-3 text-sm font-semibold text-background disabled:opacity-50"><CheckCircle2 size={17} />{busy ? "Saving…" : label}</button></div>;
}

function fail(title: string, description: string) {
  toast({ title, description, variant: "destructive" });
}
