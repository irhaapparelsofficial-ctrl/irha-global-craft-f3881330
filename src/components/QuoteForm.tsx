import { useRef, useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { WHATSAPP_NUMBER, BRAND } from "@/lib/constants";
import { toast } from "@/hooks/use-toast";
import { submitPublicInquiry } from "@/lib/publicLeadGateway";

export default function QuoteForm({
  defaultCategory,
  pageContext,
}: {
  defaultCategory?: string;
  pageContext?: string;
}) {
  const [data, setData] = useState({
    name: "",
    company: "",
    country: "",
    email: "",
    quantity: "",
    notes: "",
    needsCompliance: false,
    website: "",
  });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const startedAtRef = useRef(Date.now());

  const update = (key: "name" | "company" | "country" | "email" | "quantity" | "notes" | "website", value: string) =>
    setData((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!data.name.trim() || !data.email.trim() || !data.country.trim()) {
      toast({ title: "Please complete name, country and email", variant: "destructive" });
      return;
    }

    const complianceNote = data.needsCompliance
      ? "Buyer requests program-specific material, testing or audit documentation to be reviewed before order confirmation."
      : "";
    const combinedNotes = [data.notes, complianceNote].filter(Boolean).join(" — ");
    setLoading(true);

    try {
      const { reference } = await submitPublicInquiry({
        kind: "quote",
        name: data.name,
        email: data.email,
        company: data.company,
        country: data.country,
        quantity: data.quantity,
        category: defaultCategory || null,
        message: combinedNotes,
        source: pageContext || "inline-quote-form",
        intent: "rfq",
        website: data.website,
        form_started_at: startedAtRef.current,
        lead_context: {
          conversion_type: "inline-quote",
          page_context: pageContext || null,
          compliance_review_requested: data.needsCompliance,
          source_page: window.location.pathname + window.location.search,
          referrer: document.referrer || null,
        },
      });

      const message = `New B2B Quote Request — ${BRAND.name}
━━━━━━━━━━━━━━━━━━
Reference: ${reference}
Page: ${pageContext || "Website"}
Category: ${defaultCategory || "—"}
Name: ${data.name}
Company: ${data.company || "—"}
Country: ${data.country}
Email: ${data.email}
Quantity: ${data.quantity || "—"}
Documentation Review: ${data.needsCompliance ? "Requested for this program" : "Not specified"}
Notes: ${data.notes || "—"}`;

      try {
        (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag?.(
          "event",
          "conversion",
          { send_to: "AW-18279003993/K0wJCMiF7sYcENnujYxE" },
        );
      } catch {
        // Analytics failure must never block a saved quote request.
      }

      setSent(true);
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, "_blank");
    } catch (error) {
      toast({
        title: "Quote request could not be saved",
        description: error instanceof Error ? error.message : "Please try again or contact us on WhatsApp.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const input =
    "w-full bg-input border border-border focus:border-primary outline-none px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors";

  if (sent) {
    return (
      <div className="border border-primary/40 bg-card/60 p-8 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-gradient-gold flex items-center justify-center mb-4">
          <MessageCircle className="text-primary-foreground" size={20} />
        </div>
        <h3 className="font-display text-2xl">Quote request saved</h3>
        <p className="text-foreground/70 mt-2 text-sm">
          WhatsApp opened with the same details. Our team will review the product, quantity and destination before confirming price, MOQ and timing.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="border border-border bg-card/40 p-6 md:p-8 space-y-4"
      aria-label="Request a quote"
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
        <input className={`${input} sm:col-span-2`} placeholder="Estimated quantity (e.g. 500 pcs)" value={data.quantity} onChange={(event) => update("quantity", event.target.value)} aria-label="Quantity" maxLength={100} />
        <textarea className={`${input} sm:col-span-2`} rows={3} placeholder="Tell us about your project — fabric, deadline, references…" value={data.notes} onChange={(event) => update("notes", event.target.value)} aria-label="Notes" maxLength={6000} />
      </div>
      <label className="flex items-start gap-3 cursor-pointer text-sm text-foreground/80 border border-border bg-input/40 px-4 py-3 hover:border-gold/50 transition-colors">
        <input
          type="checkbox"
          checked={data.needsCompliance}
          onChange={(event) => setData((current) => ({ ...current, needsCompliance: event.target.checked }))}
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
        {loading ? "Saving…" : <>Save & open WhatsApp <Send size={14} /></>}
      </button>
    </form>
  );
}
