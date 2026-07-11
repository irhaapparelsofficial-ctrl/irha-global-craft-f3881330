import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, FileText, MessageCircle, PackageCheck, RotateCcw } from "lucide-react";
import SEO from "@/components/SEO";
import SecureFileUpload from "@/components/SecureFileUpload";
import { toast } from "@/hooks/use-toast";
import { submitPublicInquiry } from "@/lib/publicLeadGateway";
import type { UploadedFileRef } from "@/lib/inquiryDraft";
import { WHATSAPP_NUMBER } from "@/lib/constants";
import { ORGANIZATION_ID, SITE_URL, WEBSITE_ID, breadcrumbSchema } from "@/lib/seoSchema";

type FormState = {
  previousRef: string;
  product: string;
  quantity: string;
  changes: string;
  requestedDate: string;
  company: string;
  country: string;
  name: string;
  email: string;
  whatsapp: string;
  website: string;
};

const EMPTY: FormState = {
  previousRef: "",
  product: "",
  quantity: "",
  changes: "",
  requestedDate: "",
  company: "",
  country: "",
  name: "",
  email: "",
  whatsapp: "",
  website: "",
};

export default function RepeatOrder() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [files, setFiles] = useState<UploadedFileRef[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const startedAtRef = useRef(Date.now());
  const sessionIdRef = useRef(`repeat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);

  const update = (key: keyof FormState, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    if (!form.previousRef.trim() || !form.product.trim() || !form.quantity.trim()) {
      toast({ title: "Previous reference, product and quantity are required", variant: "destructive" });
      return;
    }
    if (!form.company.trim() || !form.country.trim() || !form.name.trim() || !form.email.trim() || !form.whatsapp.trim()) {
      toast({ title: "Complete the buyer and contact details", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitPublicInquiry({
        kind: "inquiry",
        name: form.name,
        email: form.email,
        phone: form.whatsapp,
        company: form.company,
        country: form.country,
        category: form.product,
        quantity: form.quantity,
        message: [
          `Repeat order / existing program`,
          `Previous order or inquiry reference: ${form.previousRef}`,
          `Product: ${form.product}`,
          `Requested quantity: ${form.quantity}`,
          form.requestedDate ? `Requested delivery window: ${form.requestedDate}` : null,
          form.changes ? `Requested changes: ${form.changes}` : "Requested changes: repeat the previously approved specification unless review identifies a required confirmation.",
          files.length ? `Files attached: ${files.length}` : null,
        ].filter(Boolean).join("\n"),
        source: "repeat-order-page",
        intent: "repeat_order",
        website: form.website,
        form_started_at: startedAtRef.current,
        files,
        lead_context: {
          conversion_type: "repeat-order",
          intent: "repeat_order",
          previous_order_ref: form.previousRef,
          repeat_product: form.product,
          repeat_quantity: form.quantity,
          requested_changes: form.changes || null,
          requested_delivery_window: form.requestedDate || null,
          uploaded_files: files,
          source_page: window.location.pathname + window.location.search,
          referrer: document.referrer || null,
        },
      });

      setReference(result.reference);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      toast({
        title: "Repeat-order request could not be saved",
        description: error instanceof Error ? error.message : "Please try again or continue on WhatsApp.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const pageUrl = `${SITE_URL}/repeat-order`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
      name: "Repeat Order Request — Irha Apparels",
      description: "Existing Irha Apparels buyers can submit a repeat-order or existing-program request using the previous order or inquiry reference.",
      isPartOf: { "@id": WEBSITE_ID },
      about: { "@id": ORGANIZATION_ID },
      inLanguage: "en",
    },
    breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Repeat Order", path: "/repeat-order" },
    ]),
  ];

  if (reference) {
    const whatsappText = `Hi Irha Apparels — following up on repeat-order request ${reference}.\nPrevious reference: ${form.previousRef}\nProduct: ${form.product}\nQuantity: ${form.quantity}`;
    return (
      <>
        <SEO title="Repeat Order Request Received | Irha Apparels" description="Your repeat-order request has been received for review." path="/repeat-order" noindex />
        <section className="pt-36 md:pt-44 pb-24">
          <div className="container-luxe max-w-3xl">
            <div className="border border-emerald-500/35 bg-emerald-500/[0.04] p-8 md:p-12 text-center">
              <CheckCircle2 size={34} className="mx-auto text-emerald-300" />
              <h1 className="font-display text-3xl md:text-5xl mt-5">Repeat-order request received</h1>
              <p className="text-sm md:text-base text-foreground/70 mt-5 leading-relaxed">
                Reference <span className="font-mono text-foreground">{reference}</span>. The team will compare this request with the previous reference and confirm specification, quantity, pricing, material availability and timing before production.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappText)}`} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-7 py-4 text-[10px] uppercase tracking-[0.22em]">
                  <MessageCircle size={14} /> Continue on WhatsApp
                </a>
                <Link to="/products" className="inline-flex items-center gap-2 border border-foreground/25 hover:border-gold hover:text-gold px-7 py-4 text-[10px] uppercase tracking-[0.22em]">
                  Browse collections <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </>
    );
  }

  const input = "w-full bg-input border border-border focus:border-gold outline-none px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors";
  const label = "block text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2";

  return (
    <>
      <SEO
        title="Repeat Order Request | Existing B2B Buyers — Irha Apparels"
        description="Submit a repeat-order or existing-program request using your previous Irha Apparels order or inquiry reference. Changes are reviewed before pricing and production confirmation."
        path="/repeat-order"
        jsonLd={jsonLd}
      />

      <section className="pt-36 md:pt-44 pb-20 border-b border-border/60">
        <div className="container-luxe grid lg:grid-cols-12 gap-12 items-end">
          <div className="lg:col-span-8">
            <p className="eyebrow mb-5">Existing buyer workflow</p>
            <h1 className="font-display text-5xl md:text-7xl leading-[0.96]">
              Request a <span className="text-gold italic">repeat order.</span>
            </h1>
            <p className="mt-7 max-w-3xl text-base md:text-lg text-foreground/70 leading-relaxed">
              Use the previous order, proforma invoice or inquiry reference so the team can locate the existing program. A repeat request is reviewed before confirmation because materials, quantities, requested changes and timing may differ from the earlier order.
            </p>
          </div>
          <aside className="lg:col-span-4 border border-gold/40 bg-gold/5 p-6">
            <RotateCcw size={24} className="text-gold" />
            <h2 className="font-display text-2xl mt-4">Keep the earlier reference ready</h2>
            <p className="text-sm text-foreground/65 mt-3 leading-relaxed">
              Order number, PI number or inquiry reference helps the team find the previously approved program. Do not send payment until updated commercial details are confirmed.
            </p>
          </aside>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container-luxe grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-4 space-y-5">
            <div className="border border-border/60 bg-card/30 p-6">
              <PackageCheck size={22} className="text-gold" />
              <h2 className="font-display text-2xl mt-4">What is reviewed</h2>
              <ul className="mt-5 space-y-3 text-sm text-foreground/68">
                {[
                  "Previous approved specification and sample",
                  "New quantity, size and color split",
                  "Material and trim availability",
                  "Requested artwork or packaging changes",
                  "Updated quotation and production timing",
                ].map((item) => <li key={item} className="flex gap-3"><CheckCircle2 size={15} className="text-gold shrink-0 mt-0.5" />{item}</li>)}
              </ul>
            </div>
            <div className="border border-border/60 bg-card/30 p-6 text-sm text-foreground/65 leading-relaxed">
              Need a new product rather than a repeat? Use the <Link to="/inquiry?intent=rfq" className="text-gold hover:underline">general RFQ workflow</Link>.
            </div>
          </div>

          <form onSubmit={submit} className="lg:col-span-8 border border-border/60 bg-card/30 p-6 md:p-9 space-y-7">
            <input tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[10000px] h-px w-px opacity-0" name="website" value={form.website} onChange={(event) => update("website", event.target.value)} />

            <section>
              <div className="flex items-center gap-3 mb-5"><FileText size={18} className="text-gold" /><h2 className="font-display text-2xl">Previous program</h2></div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className={label}>Previous order / PI / inquiry reference *</label>
                  <input className={input} value={form.previousRef} onChange={(event) => update("previousRef", event.target.value)} placeholder="e.g. IRQ-… or PI number" maxLength={100} required />
                </div>
                <div>
                  <label className={label}>Product / program *</label>
                  <input className={input} value={form.product} onChange={(event) => update("product", event.target.value)} placeholder="e.g. Men's short lederhosen" maxLength={180} required />
                </div>
                <div>
                  <label className={label}>Requested quantity *</label>
                  <input className={input} value={form.quantity} onChange={(event) => update("quantity", event.target.value)} placeholder="e.g. 500 pcs with size split" maxLength={120} required />
                </div>
                <div>
                  <label className={label}>Requested delivery window</label>
                  <input className={input} value={form.requestedDate} onChange={(event) => update("requestedDate", event.target.value)} placeholder="Date or buying window" maxLength={120} />
                </div>
                <div className="md:col-span-2">
                  <label className={label}>Changes from previous order</label>
                  <textarea className={`${input} resize-y`} rows={4} value={form.changes} onChange={(event) => update("changes", event.target.value)} placeholder="Color, size split, artwork, labels, packaging or specification changes. Write ‘same as previous’ only when no change is requested." maxLength={5000} />
                </div>
              </div>
            </section>

            <section className="border-t border-border/60 pt-7">
              <h2 className="font-display text-2xl mb-5">Reference files</h2>
              <SecureFileUpload value={files} onChange={setFiles} sessionId={sessionIdRef.current} />
              <p className="text-[11px] text-foreground/50 mt-3">Attach an earlier PI, specification, approved artwork or marked change reference where useful. Do not upload confidential third-party data unrelated to this request.</p>
            </section>

            <section className="border-t border-border/60 pt-7">
              <h2 className="font-display text-2xl mb-5">Buyer contact</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div><label className={label}>Company / brand *</label><input className={input} value={form.company} onChange={(event) => update("company", event.target.value)} maxLength={160} required /></div>
                <div><label className={label}>Country *</label><input className={input} value={form.country} onChange={(event) => update("country", event.target.value)} maxLength={80} required /></div>
                <div><label className={label}>Contact name *</label><input className={input} value={form.name} onChange={(event) => update("name", event.target.value)} maxLength={100} required /></div>
                <div><label className={label}>Email *</label><input type="email" className={input} value={form.email} onChange={(event) => update("email", event.target.value)} maxLength={254} required /></div>
                <div className="md:col-span-2"><label className={label}>WhatsApp / phone *</label><input className={input} value={form.whatsapp} onChange={(event) => update("whatsapp", event.target.value)} maxLength={40} required /></div>
              </div>
            </section>

            <div className="border-t border-border/60 pt-7 flex items-center justify-between gap-5 flex-wrap">
              <p className="text-xs text-foreground/55 max-w-xl">This is a request, not automatic order confirmation. Updated specification, pricing, payment terms and timing must be approved before production.</p>
              <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-7 py-4 text-[10px] uppercase tracking-[0.22em] disabled:opacity-50">
                {submitting ? "Saving…" : "Submit repeat request"} <ArrowRight size={13} />
              </button>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}
