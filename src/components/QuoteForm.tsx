import { useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { WHATSAPP_NUMBER, BRAND } from "@/lib/constants";
import { toast } from "@/hooks/use-toast";

/**
 * Compact inline quote form. Drop on any landing/blog page.
 * Submits to WhatsApp directly — no backend dependency.
 */
export default function QuoteForm({
  defaultCategory,
  pageContext,
}: {
  defaultCategory?: string;
  pageContext?: string; // e.g. "Sportswear Manufacturer Pakistan" — included in WA message
}) {
  const [data, setData] = useState({
    name: "",
    company: "",
    country: "",
    email: "",
    quantity: "",
    notes: "",
  });
  const [sent, setSent] = useState(false);

  const update = (k: keyof typeof data, v: string) =>
    setData((d) => ({ ...d, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.name.trim() || !data.email.trim() || !data.country.trim()) {
      toast({ title: "Please complete name, country and email", variant: "destructive" });
      return;
    }
    const msg = `New B2B Quote Request — ${BRAND.name}
━━━━━━━━━━━━━━━━━━
Page: ${pageContext || "Website"}
Category: ${defaultCategory || "—"}
Name: ${data.name}
Company: ${data.company || "—"}
Country: ${data.country}
Email: ${data.email}
Quantity: ${data.quantity || "—"}
Notes: ${data.notes || "—"}`;
    setSent(true);
    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`,
      "_blank",
    );
  };

  const input =
    "w-full bg-input border border-border focus:border-primary outline-none px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors";

  if (sent) {
    return (
      <div className="border border-primary/40 bg-card/60 p-8 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-gradient-gold flex items-center justify-center mb-4">
          <MessageCircle className="text-primary-foreground" size={20} />
        </div>
        <h3 className="font-display text-2xl">Quote sent</h3>
        <p className="text-foreground/70 mt-2 text-sm">
          We've opened WhatsApp with your request. Our team replies within 4 working hours.
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
      <div>
        <p className="eyebrow mb-2">Quote Request</p>
        <h3 className="font-display text-2xl md:text-3xl leading-tight">
          Request a <span className="text-gold italic">quote</span> for this program
        </h3>
        <p className="text-xs text-muted-foreground mt-2">
          Reply within 4 working hours on WhatsApp or email.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <input
          className={input}
          placeholder="Full name *"
          value={data.name}
          onChange={(e) => update("name", e.target.value)}
          aria-label="Full name"
          required
        />
        <input
          className={input}
          placeholder="Company / brand"
          value={data.company}
          onChange={(e) => update("company", e.target.value)}
          aria-label="Company"
        />
        <input
          className={input}
          placeholder="Country *"
          value={data.country}
          onChange={(e) => update("country", e.target.value)}
          aria-label="Country"
          required
        />
        <input
          type="email"
          className={input}
          placeholder="Email *"
          value={data.email}
          onChange={(e) => update("email", e.target.value)}
          aria-label="Email"
          required
        />
        <input
          className={`${input} sm:col-span-2`}
          placeholder="Estimated quantity (e.g. 500 pcs)"
          value={data.quantity}
          onChange={(e) => update("quantity", e.target.value)}
          aria-label="Quantity"
        />
        <textarea
          className={`${input} sm:col-span-2`}
          rows={3}
          placeholder="Tell us about your project — fabric, deadlines, references…"
          value={data.notes}
          onChange={(e) => update("notes", e.target.value)}
          aria-label="Notes"
        />
      </div>
      <button
        type="submit"
        className="w-full inline-flex items-center justify-center gap-3 bg-gradient-gold text-primary-foreground px-7 py-4 text-xs uppercase tracking-[0.3em] hover:shadow-gold transition-all"
      >
        Send to WhatsApp <Send size={14} />
      </button>
    </form>
  );
}
