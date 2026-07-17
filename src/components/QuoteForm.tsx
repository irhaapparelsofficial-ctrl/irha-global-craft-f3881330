import { FormEvent, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, FileCheck2, MessageCircle, Paperclip, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import { WHATSAPP_NUMBER } from "@/lib/constants";
import { submitPublicInquiry, uploadPublicLeadFile } from "@/lib/publicLeadGateway";

const MAX_FILES = 3;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

const initialData = {
  name: "",
  company: "",
  country: "",
  email: "",
  phone: "",
  preferredContact: "email",
  quantity: "",
  targetDeliveryDate: "",
  notes: "",
  needsCompliance: false,
  website: "",
};

type QuoteData = typeof initialData;

export default function QuoteForm({ category = "General" }: { category?: string }) {
  const [data, setData] = useState<QuoteData>(initialData);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const formStartedAt = useRef(Date.now());
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();

  const update = <K extends keyof QuoteData>(key: K, value: QuoteData[K]) => {
    setData((previous) => ({ ...previous, [key]: value }));
  };

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const incoming = Array.from(files);
    const invalid = incoming.find((file) => !ALLOWED_FILE_TYPES.has(file.type) || file.size < 1 || file.size > MAX_FILE_BYTES);
    if (invalid) {
      toast({
        title: "File not accepted",
        description: "Use PDF, JPG, PNG or WEBP files up to 10 MB each.",
        variant: "destructive",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setSelectedFiles((current) => {
      const combined = [...current, ...incoming].filter(
        (file, index, all) => all.findIndex((item) => item.name === file.name && item.size === file.size) === index,
      );
      if (combined.length > MAX_FILES) {
        toast({ title: "Maximum 3 files", description: "Remove a file before adding another.", variant: "destructive" });
      }
      return combined.slice(0, MAX_FILES);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!data.name.trim() || !data.company.trim() || !data.country.trim() || !data.email.trim()) {
      toast({
        title: "Required information missing",
        description: "Please add your name, company, destination country and business email.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const uploadedFiles = await Promise.all(
        selectedFiles.map((file) => uploadPublicLeadFile(file, "inquiry", formStartedAt.current)),
      );

      const result = await submitPublicInquiry({
        kind: "quote",
        name: data.name,
        company: data.company,
        country: data.country,
        email: data.email,
        phone: data.phone,
        category,
        quantity: data.quantity,
        message: data.notes,
        files: uploadedFiles,
        source: "website-quick-quote",
        intent: "rfq",
        form_started_at: formStartedAt.current,
        website: data.website,
        lead_context: {
          preferred_contact: data.preferredContact,
          target_delivery_date: data.targetDeliveryDate || null,
          needs_compliance_documents: data.needsCompliance,
          quick_quote: true,
          uploaded_file_count: uploadedFiles.length,
        },
      });

      setReference(result.reference);
      trackEvent("quote_submit_success", {
        category,
        preferred_contact: data.preferredContact,
        has_phone: Boolean(data.phone.trim()),
        has_target_date: Boolean(data.targetDeliveryDate),
        file_count: uploadedFiles.length,
      });
      toast({
        title: "Quote request received",
        description: `Reference ${result.reference}. Our team will review it before contacting you.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Please retry or use the full inquiry form.";
      toast({ title: "Submission failed", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (reference) {
    const summary = `Hi Irha Apparels — I submitted quote request ${reference} for ${category}.`;
    const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(summary)}`;
    const fullInquiryHref = `/inquiry?intent=rfq&category=${encodeURIComponent(category)}&utm_source=quick-quote-success`;

    return (
      <div className="border border-primary/40 bg-card/70 p-6 sm:p-8 text-center" role="status" aria-live="polite">
        <CheckCircle2 className="mx-auto text-primary" size={36} aria-hidden="true" />
        <h3 className="mt-4 font-display text-2xl">Quote request received</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Reference <span className="font-mono text-foreground">{reference}</span>. We will review your requirements and contact you through your preferred channel.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link
            to={fullInquiryHref}
            className="inline-flex min-h-12 items-center justify-center gap-2 border border-primary/50 px-4 text-xs font-semibold uppercase tracking-[0.16em] text-primary hover:bg-primary/10"
          >
            <Paperclip size={15} aria-hidden="true" /> Add more project detail
          </Link>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-12 items-center justify-center gap-2 bg-primary px-4 text-xs font-semibold uppercase tracking-[0.16em] text-primary-foreground hover:opacity-90"
          >
            <MessageCircle size={15} aria-hidden="true" /> Optional WhatsApp follow-up
          </a>
        </div>
        <button
          type="button"
          onClick={() => {
            setReference(null);
            setData(initialData);
            setSelectedFiles([]);
            formStartedAt.current = Date.now();
          }}
          className="mt-5 text-xs uppercase tracking-[0.18em] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Submit another request
        </button>
      </div>
    );
  }

  const inputClass = "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";
  const labelClass = "mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground";

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <input
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
        value={data.website}
        onChange={(event) => update("website", event.target.value)}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="quote-name" className={labelClass}>Your name *</label>
          <input id="quote-name" autoComplete="name" className={inputClass} value={data.name} onChange={(event) => update("name", event.target.value)} required />
        </div>
        <div>
          <label htmlFor="quote-company" className={labelClass}>Company / brand *</label>
          <input id="quote-company" autoComplete="organization" className={inputClass} value={data.company} onChange={(event) => update("company", event.target.value)} required />
        </div>
        <div>
          <label htmlFor="quote-country" className={labelClass}>Destination country *</label>
          <input id="quote-country" autoComplete="country-name" className={inputClass} value={data.country} onChange={(event) => update("country", event.target.value)} required />
        </div>
        <div>
          <label htmlFor="quote-email" className={labelClass}>Business email *</label>
          <input id="quote-email" type="email" autoComplete="email" className={inputClass} value={data.email} onChange={(event) => update("email", event.target.value)} required />
        </div>
        <div>
          <label htmlFor="quote-phone" className={labelClass}>WhatsApp / phone (optional)</label>
          <input id="quote-phone" type="tel" autoComplete="tel" placeholder="+49 123 456789" className={inputClass} value={data.phone} onChange={(event) => update("phone", event.target.value)} />
        </div>
        <div>
          <label htmlFor="quote-contact" className={labelClass}>Preferred contact</label>
          <select id="quote-contact" className={inputClass} value={data.preferredContact} onChange={(event) => update("preferredContact", event.target.value)}>
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="phone">Phone call</option>
          </select>
        </div>
        <div>
          <label htmlFor="quote-quantity" className={labelClass}>Estimated quantity</label>
          <input id="quote-quantity" placeholder="e.g. 500 pcs / style" className={inputClass} value={data.quantity} onChange={(event) => update("quantity", event.target.value)} />
        </div>
        <div>
          <label htmlFor="quote-date" className={labelClass}>Target delivery date</label>
          <input id="quote-date" type="date" className={inputClass} value={data.targetDeliveryDate} onChange={(event) => update("targetDeliveryDate", event.target.value)} />
        </div>
      </div>

      <div>
        <label htmlFor="quote-notes" className={labelClass}>Product requirements</label>
        <textarea
          id="quote-notes"
          rows={4}
          placeholder="Product, fabric, GSM, sizes, colours, branding, packaging and destination requirements…"
          className={inputClass}
          value={data.notes}
          onChange={(event) => update("notes", event.target.value)}
        />
      </div>

      <div className="rounded-xl border border-dashed border-primary/35 bg-primary/[0.04] p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground">Tech pack / reference files</p>
            <p className="mt-1 text-xs text-muted-foreground">Up to 3 PDF, JPG, PNG or WEBP files · 10 MB each.</p>
          </div>
          <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 border border-primary/50 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary hover:bg-primary/10">
            <Paperclip size={14} aria-hidden="true" /> Add files
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) => addFiles(event.target.files)}
              disabled={loading || selectedFiles.length >= MAX_FILES}
            />
          </label>
        </div>
        {selectedFiles.length > 0 && (
          <ul className="mt-4 space-y-2" aria-label="Selected files">
            {selectedFiles.map((file, index) => (
              <li key={`${file.name}-${file.size}`} className="flex items-center justify-between gap-3 border-t border-white/10 pt-2 text-xs">
                <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
                  <FileCheck2 size={14} className="shrink-0 text-primary" aria-hidden="true" />
                  <span className="truncate">{file.name}</span>
                  <span className="shrink-0 text-[10px]">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                </span>
                <button
                  type="button"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
                  aria-label={`Remove ${file.name}`}
                  onClick={() => setSelectedFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}
                  disabled={loading}
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-muted-foreground">
        <input type="checkbox" className="mt-1 accent-primary" checked={data.needsCompliance} onChange={(event) => update("needsCompliance", event.target.checked)} />
        <span>I need compliance, material or testing documents discussed during quotation.</span>
      </label>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Submitting this form saves your request and files securely. WhatsApp is optional and will never open automatically.
      </p>

      <button
        type="submit"
        disabled={loading}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (selectedFiles.length ? "Uploading & submitting…" : "Submitting…") : "Submit quote request"} <ArrowRight size={15} aria-hidden="true" />
      </button>
    </form>
  );
}
