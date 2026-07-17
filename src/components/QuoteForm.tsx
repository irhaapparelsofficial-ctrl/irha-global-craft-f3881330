import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Check, FileCheck2, FileUp, MessageCircle, Paperclip, Send, X } from "lucide-react";
import { WHATSAPP_NUMBER, BRAND } from "@/lib/constants";
import { toast } from "@/hooks/use-toast";
import { submitPublicInquiry, uploadPublicLeadFile } from "@/lib/publicLeadGateway";
import type { UploadedFileRef } from "@/lib/inquiryDraft";

type PreferredContact = "email" | "whatsapp" | "either";

type QuoteData = {
  name: string;
  company: string;
  country: string;
  email: string;
  phone: string;
  quantity: string;
  targetDeliveryDate: string;
  preferredContact: PreferredContact;
  notes: string;
  needsCompliance: boolean;
  website: string;
};

const MAX_FILES = 3;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

const EMPTY_QUOTE: QuoteData = {
  name: "",
  company: "",
  country: "",
  email: "",
  phone: "",
  quantity: "",
  targetDeliveryDate: "",
  preferredContact: "email",
  notes: "",
  needsCompliance: false,
  website: "",
};

function createInquiryReference() {
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 6).toUpperCase()
    : Math.random().toString(36).slice(2, 8).toUpperCase();
  return `IRQ-${Date.now().toString(36).toUpperCase()}-${random}`;
}

function fileKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}:${file.type}`;
}

export default function QuoteForm({
  defaultCategory,
  pageContext,
}: {
  defaultCategory?: string;
  pageContext?: string;
}) {
  const [data, setData] = useState<QuoteData>(EMPTY_QUOTE);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [sent, setSent] = useState<null | { reference: string }>(null);
  const [loading, setLoading] = useState(false);
  const startedAtRef = useRef(Date.now());
  const inquiryRef = useRef(createInquiryReference());
  const submittingRef = useRef(false);
  const uploadedFilesRef = useRef(new Map<string, UploadedFileRef>());
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const update = <K extends keyof QuoteData>(key: K, value: QuoteData[K]) =>
    setData((current) => ({ ...current, [key]: value }));

  const fullRfqHref = useMemo(() => {
    const params = new URLSearchParams({ intent: "rfq", utm_source: "inline-quote-upgrade" });
    if (defaultCategory) params.set("category", defaultCategory);
    if (pageContext) params.set("utm_content", pageContext);
    return `/inquiry?${params.toString()}`;
  }, [defaultCategory, pageContext]);

  const whatsappMessage = useMemo(() => {
    if (!sent) return "";
    return `Hi ${BRAND.name} — following up on my saved B2B quote request.\n\nReference: ${sent.reference}\nCategory: ${defaultCategory || "General manufacturing inquiry"}\nCompany: ${data.company || "—"}\nCountry: ${data.country}\nQuantity: ${data.quantity || "—"}`;
  }, [data.company, data.country, data.quantity, defaultCategory, sent]);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const incoming = Array.from(files);
    const invalid = incoming.find(
      (file) => !ALLOWED_FILE_TYPES.has(file.type) || file.size < 1 || file.size > MAX_FILE_BYTES,
    );

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
        (file, index, all) => all.findIndex((candidate) => fileKey(candidate) === fileKey(file)) === index,
      );
      if (combined.length > MAX_FILES) {
        toast({
          title: "Maximum 3 files",
          description: "Use the full RFQ uploader when your project needs more attachments.",
          variant: "destructive",
        });
      }
      return combined.slice(0, MAX_FILES);
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadSelectedFiles = async () => {
    const uploaded: UploadedFileRef[] = [];
    for (const file of selectedFiles) {
      const key = fileKey(file);
      let stored = uploadedFilesRef.current.get(key);
      if (!stored) {
        stored = await uploadPublicLeadFile(file, "inquiry", startedAtRef.current);
        uploadedFilesRef.current.set(key, stored);
      }
      uploaded.push(stored);
    }
    return uploaded;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submittingRef.current) return;

    if (!data.name.trim() || !data.email.trim() || !data.country.trim()) {
      toast({ title: "Please complete name, country and email", variant: "destructive" });
      return;
    }
    if (data.preferredContact === "whatsapp" && data.phone.trim().length < 6) {
      toast({ title: "Add a WhatsApp / phone number for WhatsApp follow-up", variant: "destructive" });
      return;
    }

    const complianceNote = data.needsCompliance
      ? "Buyer requests program-specific material, testing or audit documentation to be reviewed before order confirmation."
      : "";
    const deliveryNote = data.targetDeliveryDate
      ? `Buyer target delivery date: ${data.targetDeliveryDate}. Feasibility must be confirmed after requirement review.`
      : "";
    const combinedNotes = [data.notes, deliveryNote, complianceNote].filter(Boolean).join(" — ");

    submittingRef.current = true;
    setLoading(true);

    try {
      const uploadedFiles = await uploadSelectedFiles();
      const { reference } = await submitPublicInquiry({
        inquiry_ref: inquiryRef.current,
        kind: "quote",
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        company: data.company,
        country: data.country,
        quantity: data.quantity,
        category: defaultCategory || null,
        message: combinedNotes,
        files: uploadedFiles,
        source: pageContext || "inline-quote-form",
        intent: "rfq",
        website: data.website,
        form_started_at: startedAtRef.current,
        lead_context: {
          conversion_type: "inline-quote",
          page_context: pageContext || null,
          preferred_contact: data.preferredContact,
          target_delivery_date: data.targetDeliveryDate || null,
          compliance_review_requested: data.needsCompliance,
          uploaded_file_count: uploadedFiles.length,
          source_page: window.location.pathname + window.location.search,
          referrer: document.referrer || null,
        },
      });

      try {
        (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag?.(
          "event",
          "conversion",
          { send_to: "AW-18279003993/K0wJCMiF7sYcENnujYxE" },
        );
      } catch {
        // Analytics failure must never block a saved quote request.
      }

      setSent({ reference });
    } catch (error) {
      toast({
        title: "Quote request could not be saved",
        description: error instanceof Error ? error.message : "Please try again or use the full RFQ form.",
        variant: "destructive",
      });
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  const input =
    "w-full bg-input border border-border focus:border-primary outline-none px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors";

  if (sent) {
    return (
      <div className="border border-primary/40 bg-card/60 p-7 md:p-9 text-center" role="status" aria-live="polite">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center mb-4">
          <Check className="text-primary" size={22} aria-hidden="true" />
        </div>
        <h3 className="font-display text-2xl">Quote request saved</h3>
        <p className="text-foreground/70 mt-2 text-sm">
          Reference <span className="font-mono text-foreground">{sent.reference}</span>. Our team will review the product, quantity and destination before confirming price, MOQ and timing.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to={fullRfqHref}
            className="inline-flex items-center justify-center gap-2 bg-gradient-gold text-primary-foreground px-6 py-3 text-[11px] uppercase tracking-[0.2em]"
          >
            <FileUp size={14} aria-hidden="true" /> Add more project detail
          </Link>
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMessage)}`}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center justify-center gap-2 border border-border hover:border-primary px-6 py-3 text-[11px] uppercase tracking-[0.2em]"
          >
            <MessageCircle size={14} aria-hidden="true" /> Optional WhatsApp follow-up
          </a>
        </div>
        <p className="mt-4 text-[11px] text-muted-foreground">
          WhatsApp is optional. Your request and uploaded files are already saved.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="border border-border bg-card/40 p-6 md:p-8 space-y-4"
      aria-label="Request a quote"
      noValidate
    >
      <input
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[10000px] h-px w-px opacity-0"
        name="website"
        value={data.website}
        onChange={(event) => update("website", event.target.value)}
      />
      <div>
        <p className="eyebrow mb-2">Quote Request</p>
        <h3 className="font-display text-2xl md:text-3xl leading-tight">
          Request a <span className="text-gold italic">quote</span> for this program
        </h3>
        <p className="text-xs text-muted-foreground mt-2">
          Price, MOQ and timing are confirmed after the exact requirement is reviewed.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <input className={input} placeholder="Full name *" value={data.name} onChange={(event) => update("name", event.target.value)} aria-label="Full name" required maxLength={100} />
        <input className={input} placeholder="Company / brand" value={data.company} onChange={(event) => update("company", event.target.value)} aria-label="Company" maxLength={160} />
        <input className={input} placeholder="Country *" value={data.country} onChange={(event) => update("country", event.target.value)} aria-label="Country" required maxLength={80} />
        <input type="email" className={input} placeholder="Email *" value={data.email} onChange={(event) => update("email", event.target.value)} aria-label="Email" required maxLength={254} />
        <input type="tel" className={input} placeholder="WhatsApp / phone (optional)" value={data.phone} onChange={(event) => update("phone", event.target.value)} aria-label="WhatsApp or phone" maxLength={40} />
        <select className={input} value={data.preferredContact} onChange={(event) => update("preferredContact", event.target.value as PreferredContact)} aria-label="Preferred contact method">
          <option value="email">Preferred contact: Email</option>
          <option value="whatsapp">Preferred contact: WhatsApp</option>
          <option value="either">Preferred contact: Either</option>
        </select>
        <input className={input} placeholder="Estimated quantity (e.g. 500 pcs)" value={data.quantity} onChange={(event) => update("quantity", event.target.value)} aria-label="Quantity" maxLength={100} />
        <input type="date" className={input} value={data.targetDeliveryDate} onChange={(event) => update("targetDeliveryDate", event.target.value)} aria-label="Target delivery date" />
        <textarea className={`${input} sm:col-span-2`} rows={3} placeholder="Tell us about your project — fabric, deadline, references…" value={data.notes} onChange={(event) => update("notes", event.target.value)} aria-label="Notes" maxLength={6000} />
      </div>

      <div className="border border-dashed border-primary/40 bg-input/30 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium text-foreground">Tech pack / reference files</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Up to 3 PDF, JPG, PNG or WEBP files · 10 MB each.</p>
          </div>
          <label className={`inline-flex min-h-11 items-center justify-center gap-2 border border-primary/60 px-4 text-[10px] uppercase tracking-[0.18em] text-gold ${loading || selectedFiles.length >= MAX_FILES ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-primary/10"}`}>
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
              <li key={fileKey(file)} className="flex items-center justify-between gap-3 border-t border-border pt-2 text-xs">
                <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
                  <FileCheck2 size={14} className="shrink-0 text-gold" aria-hidden="true" />
                  <span className="truncate">{file.name}</span>
                  <span className="shrink-0 text-[10px]">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}
                  disabled={loading}
                  aria-label={`Remove ${file.name}`}
                  className="inline-flex min-h-9 min-w-9 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-3 text-[11px] text-muted-foreground">
          Need more attachments? <Link to={fullRfqHref} className="text-gold hover:underline">Use the full RFQ uploader.</Link>
        </p>
      </div>

      <label className="flex items-start gap-3 cursor-pointer text-sm text-foreground/80 border border-border bg-input/40 px-4 py-3 hover:border-gold/50 transition-colors">
        <input
          type="checkbox"
          checked={data.needsCompliance}
          onChange={(event) => update("needsCompliance", event.target.checked)}
          className="mt-1 h-4 w-4 accent-[hsl(var(--gold))]"
        />
        <span className="leading-snug">
          I need <span className="text-gold">program-specific material, testing or audit documents</span> reviewed with the order
        </span>
      </label>
      <button
        type="submit"
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-3 bg-gradient-gold text-primary-foreground px-7 py-4 text-xs uppercase tracking-[0.3em] hover:shadow-gold transition-all disabled:opacity-60"
      >
        {loading ? (selectedFiles.length ? "Uploading & saving…" : "Saving…") : <>Save quote request <Send size={14} aria-hidden="true" /></>}
      </button>
      <p className="text-center text-[11px] text-muted-foreground">
        Submitting saves the request securely. It does not automatically open WhatsApp.
      </p>
    </form>
  );
}
