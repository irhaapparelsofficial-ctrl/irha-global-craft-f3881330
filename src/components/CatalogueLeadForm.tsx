import { useRef, useState } from "react";
import { X, Send, MessageCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { submitPublicCatalogueLead } from "@/lib/publicLeadGateway";

interface Props {
  onClose: () => void;
  catalogueUrl: string;
  source: string;
  categoryInterest?: string;
}

export default function CatalogueLeadForm({ onClose, catalogueUrl, source, categoryInterest }: Props) {
  const [data, setData] = useState({
    name: "",
    whatsapp: "",
    email: "",
    company_name: "",
    country: "",
    message: "",
    website: "",
  });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const startedAtRef = useRef(Date.now());

  const update = (key: keyof typeof data, value: string) => setData((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!data.name.trim() || (!data.email.trim() && !data.whatsapp.trim())) {
      toast({ title: "Please add your name and either email or WhatsApp", variant: "destructive" });
      return;
    }
    setLoading(true);

    try {
      const params = new URLSearchParams(window.location.search);
      await submitPublicCatalogueLead({
        ...data,
        category_interest: categoryInterest || null,
        catalogue_url: catalogueUrl,
        source,
        utm_source: params.get("utm_source"),
        utm_medium: params.get("utm_medium"),
        utm_campaign: params.get("utm_campaign"),
        language: document.documentElement.lang || "en",
        form_started_at: startedAtRef.current,
      });

      try {
        (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag?.(
          "event",
          "conversion",
          { send_to: "AW-18279003993/K0wJCMiF7sYcENnujYxE" },
        );
      } catch {
        // Analytics failure must never block lead submission.
      }

      setSent(true);
    } catch (error) {
      toast({
        title: "Could not send",
        description: error instanceof Error ? error.message : "Please try again or use WhatsApp.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const input =
    "w-full bg-input border border-border focus:border-primary outline-none px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors";

  return (
    <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="font-display text-xl">Request Catalogue</h3>
          <button onClick={onClose} aria-label="Close" className="text-foreground/60 hover:text-gold">
            <X size={18} />
          </button>
        </div>

        {sent ? (
          <div className="p-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-gradient-gold flex items-center justify-center mb-4">
              <Send className="text-primary-foreground" size={18} />
            </div>
            <h4 className="font-display text-2xl">Request received</h4>
            <p className="text-foreground/70 mt-2 text-sm">
              Our team will review your requirement and continue the catalogue discussion using the contact details you provided.
            </p>
            <a
              href="https://wa.me/923204110066"
              target="_blank"
              rel="noreferrer noopener"
              className="mt-6 inline-flex items-center gap-2 border border-gold text-gold px-6 py-3 text-xs uppercase tracking-[0.3em] hover:bg-gold hover:text-primary-foreground transition-colors"
            >
              <MessageCircle size={14} /> Continue on WhatsApp
            </a>
          </div>
        ) : (
          <form onSubmit={submit} className="p-6 space-y-3">
            <input
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute -left-[10000px] h-px w-px opacity-0"
              value={data.website}
              onChange={(event) => update("website", event.target.value)}
              name="website"
            />
            {categoryInterest && (
              <p className="text-[10px] uppercase tracking-[0.25em] text-gold/80">Interest: {categoryInterest}</p>
            )}
            <input className={input} placeholder="Full name *" value={data.name} onChange={(event) => update("name", event.target.value)} required maxLength={100} />
            <div className="grid sm:grid-cols-2 gap-3">
              <input type="email" className={input} placeholder="Email" value={data.email} onChange={(event) => update("email", event.target.value)} maxLength={254} />
              <input className={input} placeholder="WhatsApp" value={data.whatsapp} onChange={(event) => update("whatsapp", event.target.value)} maxLength={40} />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <input className={input} placeholder="Company" value={data.company_name} onChange={(event) => update("company_name", event.target.value)} maxLength={160} />
              <input className={input} placeholder="Country" value={data.country} onChange={(event) => update("country", event.target.value)} maxLength={80} />
            </div>
            <textarea className={input} rows={3} placeholder="Notes (optional)" value={data.message} onChange={(event) => update("message", event.target.value)} maxLength={6000} />
            <p className="text-[10px] text-muted-foreground">* Either email or WhatsApp is required.</p>
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-3 bg-gradient-gold text-primary-foreground px-7 py-4 text-xs uppercase tracking-[0.3em] hover:shadow-gold transition-all disabled:opacity-60"
            >
              {loading ? "Sending…" : (<>Send request <Send size={14} /></>)}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
