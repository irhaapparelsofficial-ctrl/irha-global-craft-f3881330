import { useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { ArrowLeft, CheckCircle2, FileText, PackagePlus, Send, Trash2 } from "lucide-react";
import SEO from "@/components/SEO";
import SecureFileUpload from "@/components/SecureFileUpload";
import ThumbnailImage from "@/components/ThumbnailImage";
import { toast } from "@/hooks/use-toast";
import { inquiryCartProductPath, useInquiryCart } from "@/lib/inquiryCart";
import type { UploadedFileRef } from "@/lib/inquiryDraft";
import { submitPublicInquiry } from "@/lib/publicLeadGateway";

const contactSchema = z.object({
  name: z.string().trim().min(2, "Contact name is required").max(100),
  company: z.string().trim().min(2, "Company name is required").max(160),
  email: z.string().trim().email("Enter a valid business email").max(254),
  country: z.string().trim().min(2, "Destination country is required").max(80),
  phone: z.string().trim().max(40).optional(),
  companySize: z.enum(["", "1-10", "11-50", "51-200", "201-500", "501+"]),
  notes: z.string().trim().max(12000),
});

type ContactForm = z.infer<typeof contactSchema>;
type ErrorMap = Partial<Record<keyof ContactForm | "items", string>>;

function sessionId() {
  try {
    const key = "irha_inquiry_cart_session";
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const next = crypto.randomUUID();
    sessionStorage.setItem(key, next);
    return next;
  } catch {
    return `cart-${Date.now()}`;
  }
}

export default function InquiryCart() {
  const cart = useInquiryCart();
  const uploadSession = useMemo(sessionId, []);
  const formStartedAt = useRef(Date.now());
  const [files, setFiles] = useState<UploadedFileRef[]>([]);
  const [form, setForm] = useState<ContactForm>({
    name: "",
    company: "",
    email: "",
    country: "",
    phone: "",
    companySize: "",
    notes: "",
  });
  const [errors, setErrors] = useState<ErrorMap>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ reference: string; itemCount: number } | null>(null);
  const submitLock = useRef(false);

  const updateForm = <K extends keyof ContactForm>(key: K, value: ContactForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const validate = () => {
    const nextErrors: ErrorMap = {};
    const parsed = contactSchema.safeParse(form);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        nextErrors[issue.path[0] as keyof ContactForm] = issue.message;
      }
    }

    if (cart.items.length === 0) {
      nextErrors.items = "Add at least one product to the inquiry.";
    } else {
      const incomplete = cart.items.find((item) => {
        const quantity = Number(item.targetQuantity);
        return !Number.isInteger(quantity) || quantity < 1 || quantity > 10_000_000;
      });
      if (incomplete) nextErrors.items = `Enter a valid target quantity for ${incomplete.name}.`;
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async () => {
    if (submitLock.current || submitting || !validate()) return;
    submitLock.current = true;
    setSubmitting(true);

    try {
      const itemCount = cart.items.length;
      const response = await submitPublicInquiry({
        kind: "inquiry",
        intent: "rfq",
        source: "global-inquiry-cart",
        name: form.name,
        company: form.company,
        email: form.email,
        country: form.country,
        phone: form.phone || undefined,
        company_size: form.companySize || undefined,
        message: form.notes || undefined,
        files,
        items: cart.items.map((item) => ({
          slug: item.slug,
          name: item.name,
          category_slug: item.categorySlug,
          target_quantity: Number(item.targetQuantity),
          size_breakdown: item.sizeBreakdown || undefined,
          notes: item.notes || undefined,
        })),
        lead_context: {
          conversion_type: "multi_item_rfq",
          source_page: window.location.pathname,
          current_page: window.location.href,
          item_count: itemCount,
          tech_pack_count: files.length,
          device_type: /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : "desktop",
          submitted_at: new Date().toISOString(),
        },
        form_started_at: formStartedAt.current,
        website: "",
      });

      setResult({ reference: response.reference, itemCount });
      cart.clear();
      setFiles([]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "The inquiry could not be submitted.";
      toast({ title: "Submission failed", description: message, variant: "destructive" });
      submitLock.current = false;
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <>
        <SEO title="RFQ Received | Irha Apparels" description="Your B2B apparel manufacturing inquiry has been received." path="/inquiry-cart" noindex />
        <section className="min-h-[70vh] pt-36 pb-20">
          <div className="container-luxe max-w-3xl">
            <div className="border border-primary/35 bg-card/50 p-8 text-center md:p-12">
              <CheckCircle2 size={42} className="mx-auto text-primary" />
              <p className="eyebrow mt-5">Inquiry received</p>
              <h1 className="mt-3 font-display text-4xl md:text-5xl">Your sourcing request is logged.</h1>
              <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-foreground/65">
                We received {result.itemCount} product style{result.itemCount === 1 ? "" : "s"}. A confirmation has been queued for your business email.
              </p>
              <div className="mx-auto mt-7 max-w-md border border-border/60 bg-background/40 p-5">
                <p className="text-[10px] uppercase tracking-[0.25em] text-foreground/50">Inquiry tracking ID</p>
                <p className="mt-2 font-mono text-xl text-primary">{result.reference}</p>
              </div>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link to="/products" className="inline-flex min-h-12 items-center gap-2 bg-primary px-6 text-xs uppercase tracking-[0.22em] text-primary-foreground">Browse more products</Link>
                <Link to="/factory-video-call" className="inline-flex min-h-12 items-center border border-border/70 px-6 text-xs uppercase tracking-[0.22em] hover:border-primary">Request factory call</Link>
              </div>
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <SEO title="Multi-Item B2B RFQ Cart | Irha Apparels" description="Build one structured multi-product RFQ with quantities, size breakdowns and private tech-pack uploads." path="/inquiry-cart" noindex />
      <section className="border-b border-border/60 pt-32 pb-10 md:pt-40">
        <div className="container-luxe">
          <p className="eyebrow mb-4">Global B2B Inquiry Cart</p>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="max-w-4xl font-display text-4xl leading-[1] md:text-6xl">One RFQ for every <span className="text-gold italic">selected style</span>.</h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-foreground/65">No prices are shown. Add products from any collection, define target quantities and size requirements, then submit one sourcing request.</p>
            </div>
            <Link to="/products" className="inline-flex min-h-11 items-center gap-2 text-xs uppercase tracking-[0.22em] text-primary hover:text-primary/75"><ArrowLeft size={14} /> Continue browsing</Link>
          </div>
        </div>
      </section>

      <section className="py-10 md:py-16">
        <div className="container-luxe grid gap-8 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,.65fr)]">
          <div>
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="eyebrow">Selected products</p>
                <p className="mt-2 text-sm text-foreground/55">{cart.count} style{cart.count === 1 ? "" : "s"}</p>
              </div>
              {cart.items.length > 0 && (
                <button type="button" onClick={cart.clear} className="inline-flex min-h-10 items-center gap-2 px-3 text-[10px] uppercase tracking-[0.18em] text-foreground/50 hover:text-destructive"><Trash2 size={13} /> Clear cart</button>
              )}
            </div>

            {errors.items && <p className="mb-4 border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive" role="alert">{errors.items}</p>}

            {cart.items.length === 0 ? (
              <div className="border border-dashed border-border/60 px-6 py-14 text-center">
                <PackagePlus size={32} className="mx-auto text-foreground/35" />
                <h2 className="mt-4 font-display text-2xl">Your inquiry cart is empty.</h2>
                <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-foreground/60">Browse Bavarian wear, sportswear, streetwear, nightwear or leatherwear and select “Add to Inquiry.”</p>
                <Link to="/products" className="mt-6 inline-flex min-h-12 items-center bg-primary px-6 text-xs uppercase tracking-[0.22em] text-primary-foreground">Browse product categories</Link>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.items.map((item, index) => (
                  <article key={item.slug} className="grid gap-5 border border-border/60 bg-card/35 p-4 sm:grid-cols-[112px_minmax(0,1fr)] md:p-5">
                    <Link to={inquiryCartProductPath(item)} className="relative aspect-[3/4] overflow-hidden bg-background/50">
                      {item.image ? <ThumbnailImage src={item.image} alt={`${item.name} custom wholesale manufacturing inquiry item`} className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 grid place-items-center text-xs text-foreground/35">No image</div>}
                    </Link>
                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[9px] uppercase tracking-[0.2em] text-foreground/45">Style {index + 1}{item.categoryName ? ` · ${item.categoryName}` : ""}</p>
                          <Link to={inquiryCartProductPath(item)} className="mt-1 block font-display text-xl hover:text-primary">{item.name}</Link>
                        </div>
                        <button type="button" onClick={() => cart.remove(item.slug)} aria-label={`Remove ${item.name} from inquiry`} className="inline-flex min-h-10 min-w-10 items-center justify-center text-foreground/45 hover:text-destructive"><Trash2 size={15} /></button>
                      </div>

                      <div className="mt-5 grid gap-4 md:grid-cols-2">
                        <label className="block">
                          <span className="mb-2 block text-[10px] uppercase tracking-[0.2em] text-foreground/55">Target quantity *</span>
                          <input inputMode="numeric" value={item.targetQuantity} onChange={(event) => cart.update(item.slug, { targetQuantity: event.target.value })} placeholder="e.g. 500" className="min-h-12 w-full border border-border/60 bg-input px-4 text-sm outline-none focus:border-primary" />
                          <span className="mt-1 block text-[10px] text-foreground/45">Pieces for this style</span>
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-[10px] uppercase tracking-[0.2em] text-foreground/55">Size breakdown / range</span>
                          <input value={item.sizeBreakdown} onChange={(event) => cart.update(item.slug, { sizeBreakdown: event.target.value })} placeholder="e.g. S:100, M:200, L:150, XL:50" className="min-h-12 w-full border border-border/60 bg-input px-4 text-sm outline-none focus:border-primary" />
                        </label>
                      </div>
                      <label className="mt-4 block">
                        <span className="mb-2 block text-[10px] uppercase tracking-[0.2em] text-foreground/55">Style notes</span>
                        <textarea value={item.notes} onChange={(event) => cart.update(item.slug, { notes: event.target.value })} placeholder="Fabric, GSM, colourway, branding, packaging or sample requirements" rows={2} className="w-full resize-y border border-border/60 bg-input px-4 py-3 text-sm outline-none focus:border-primary" />
                      </label>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <aside className="h-fit border border-border/60 bg-card/45 p-6 xl:sticky xl:top-28 md:p-7">
            <div className="flex items-center gap-3">
              <FileText size={19} className="text-primary" />
              <div><p className="eyebrow">Buyer details</p><h2 className="mt-1 font-display text-2xl">Submit RFQ</h2></div>
            </div>

            <div className="mt-6 space-y-4">
              <Field label="Contact name *" error={errors.name}><input value={form.name} onChange={(event) => updateForm("name", event.target.value)} autoComplete="name" className={inputClass} /></Field>
              <Field label="Company / brand *" error={errors.company}><input value={form.company} onChange={(event) => updateForm("company", event.target.value)} autoComplete="organization" className={inputClass} /></Field>
              <Field label="Official business email *" error={errors.email}><input type="email" value={form.email} onChange={(event) => updateForm("email", event.target.value)} autoComplete="email" placeholder="buyer@company.com" className={inputClass} /></Field>
              <Field label="Destination country *" error={errors.country}><input value={form.country} onChange={(event) => updateForm("country", event.target.value)} autoComplete="country-name" placeholder="e.g. Germany" className={inputClass} /></Field>
              <Field label="WhatsApp / phone"><input value={form.phone} onChange={(event) => updateForm("phone", event.target.value)} autoComplete="tel" className={inputClass} /></Field>
              <Field label="Company size"><select value={form.companySize} onChange={(event) => updateForm("companySize", event.target.value as ContactForm["companySize"])} className={inputClass}><option value="">Select…</option><option value="1-10">1–10 employees</option><option value="11-50">11–50 employees</option><option value="51-200">51–200 employees</option><option value="201-500">201–500 employees</option><option value="501+">501+ employees</option></select></Field>
              <Field label="General sourcing notes" error={errors.notes}><textarea value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} rows={4} className={`${inputClass} py-3`} placeholder="Target delivery, destination port, Incoterm or programme details" /></Field>
            </div>

            <div className="mt-7 border-t border-border/60 pt-6">
              <p className="mb-3 text-[10px] uppercase tracking-[0.22em] text-foreground/55">Tech pack / artwork</p>
              <SecureFileUpload value={files} onChange={setFiles} sessionId={uploadSession} disabled={submitting} purpose="tech-pack" />
            </div>

            <button type="button" onClick={() => void submit()} disabled={submitting || cart.items.length === 0} className="mt-7 inline-flex min-h-14 w-full items-center justify-center gap-3 bg-primary px-6 text-xs uppercase tracking-[0.24em] text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45">
              {submitting ? "Submitting securely…" : "Submit multi-item RFQ"} <Send size={15} />
            </button>
            <p className="mt-4 text-[10px] leading-5 text-foreground/45">Quotation-based B2B manufacturing only. No retail checkout or public pricing. Your files are stored in a private Supabase bucket.</p>
          </aside>
        </div>
      </section>
    </>
  );
}

const inputClass = "min-h-12 w-full border border-border/60 bg-input px-4 text-sm outline-none focus:border-primary";

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] uppercase tracking-[0.2em] text-foreground/55">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
    </label>
  );
}
