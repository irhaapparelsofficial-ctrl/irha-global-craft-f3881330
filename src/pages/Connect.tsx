import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Send, MessageCircle, Mail, Instagram, Facebook, Linkedin, Music2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { BRAND } from "@/lib/constants";

/**
 * Universal social form — one form for all social platforms.
 * Saves to inquiries (visible in Admin → Leads) and opens a pre-filled
 * email to the owner inbox so they are notified instantly.
 *
 * Shareable URL: https://www.irhaapparels.com/connect
 */
const OWNER_EMAIL = "irhaapparelsofficial@gmail.com";

const SOCIALS = [
  { label: "Instagram", href: "https://www.instagram.com/irhaapparels", Icon: Instagram },
  { label: "Facebook", href: "https://web.facebook.com/profile.php?id=61590950402472", Icon: Facebook },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/irha-apparels", Icon: Linkedin },
  { label: "TikTok", href: "https://www.tiktok.com/@irhaapparels", Icon: Music2 },
  { label: "WhatsApp", href: "https://wa.me/923204110066", Icon: MessageCircle },
];

export default function Connect() {
  const [data, setData] = useState({ name: "", company: "", email: "", whatsapp: "", source: "", message: "" });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const update = (k: keyof typeof data, v: string) => setData((d) => ({ ...d, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.name.trim() || (!data.email.trim() && !data.whatsapp.trim())) {
      toast({ title: "Please add your name and either email or WhatsApp", variant: "destructive" });
      return;
    }
    setLoading(true);

    // 1. Save lead to backend (visible in Admin → Leads).
    await supabase.from("inquiries").insert({
      name: data.name,
      email: data.email || `${data.whatsapp}@whatsapp.local`,
      company: data.company || null,
      country: null,
      phone: data.whatsapp || null,
      category: data.source || "social-form",
      message: data.message || null,
      source: data.source ? `connect:${data.source}` : "connect-universal-form",
    });

    // 2. Fire Google Ads conversion (same as quote form).
    try {
      (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag?.(
        "event",
        "conversion",
        { send_to: "AW-18279003993/K0wJCMiF7sYcENnujYxE" },
      );
    } catch { /* no-op */ }

    // 3. Open pre-filled email to owner inbox as instant notification fallback.
    const subject = `New lead via /connect — ${data.name}${data.company ? ` (${data.company})` : ""}`;
    const body = `A new lead arrived on the universal social form.

Name: ${data.name}
Company: ${data.company || "—"}
Email: ${data.email || "—"}
WhatsApp: ${data.whatsapp || "—"}
Source platform: ${data.source || "—"}
Message: ${data.message || "—"}

View all leads: https://www.irhaapparels.com/admin`;
    const mailto = `mailto:${OWNER_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    // Open in new tab so the form's success state stays visible.
    window.open(mailto, "_blank");

    setSent(true);
    setLoading(false);
  };

  const input = "w-full bg-input border border-border focus:border-primary outline-none px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors";

  return (
    <>
      <Helmet>
        <title>Connect with Irha Apparels — Bavarian, Trachten & Leather Manufacturer | irhaapparels.com/connect</title>
        <meta name="description" content="Quick contact form for all social platforms. Reach Irha Apparels — Sialkot's premium B2B apparel manufacturer. Lederhosen, Trachten, sportswear, streetwear & leather jackets. MOQ 50, FOB Sialkot." />
        <link rel="canonical" href="https://www.irhaapparels.com/connect" />
      </Helmet>

      <section className="pt-28 md:pt-36 pb-20">
        <div className="container-luxe max-w-2xl">
          <p className="eyebrow mb-3">Universal Contact</p>
          <h1 className="font-display text-3xl md:text-5xl leading-[1.05]">
            Get in touch with <span className="text-gold italic">{BRAND.name}</span>
          </h1>
          <p className="text-foreground/70 mt-4 leading-relaxed text-sm md:text-base">
            One form, every channel. We reply within 4 working hours on email & WhatsApp — Mon–Sat.
          </p>

          <div className="flex flex-wrap gap-2 mt-6">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-2 border border-foreground/20 text-foreground/70 hover:border-gold hover:text-gold px-3 py-2 text-xs uppercase tracking-[0.18em] transition-colors"
              >
                <s.Icon size={14} /> {s.label}
              </a>
            ))}
          </div>

          {sent ? (
            <div className="mt-10 border border-primary/40 bg-card/60 p-8 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-gradient-gold flex items-center justify-center mb-4">
                <Mail className="text-primary-foreground" size={20} />
              </div>
              <h2 className="font-display text-2xl">Message received</h2>
              <p className="text-foreground/70 mt-2 text-sm">
                We've saved your request and notified the team at <strong>{OWNER_EMAIL}</strong>. Reply within 4 working hours.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-10 border border-border bg-card/40 p-6 md:p-8 space-y-4">
              <input className={input} placeholder="Full name *" value={data.name} onChange={(e) => update("name", e.target.value)} required aria-label="Full name" />
              <input className={input} placeholder="Company / brand" value={data.company} onChange={(e) => update("company", e.target.value)} aria-label="Company" />
              <div className="grid sm:grid-cols-2 gap-3">
                <input type="email" className={input} placeholder="Email" value={data.email} onChange={(e) => update("email", e.target.value)} aria-label="Email" />
                <input className={input} placeholder="WhatsApp number" value={data.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} aria-label="WhatsApp number" />
              </div>
              <select className={input} value={data.source} onChange={(e) => update("source", e.target.value)} aria-label="Where did you find us">
                <option value="">Found us via…</option>
                <option value="Instagram">Instagram</option>
                <option value="Facebook">Facebook</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="TikTok">TikTok</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Google">Google search</option>
                <option value="Referral">Referral</option>
              </select>
              <textarea className={input} rows={3} placeholder="What can we help you with? (product, MOQ, deadline…)" value={data.message} onChange={(e) => update("message", e.target.value)} aria-label="Message" />
              <p className="text-[10px] text-muted-foreground">
                * Either email or WhatsApp required. Submissions are notified to <strong>{OWNER_EMAIL}</strong>.
              </p>
              <button type="submit" disabled={loading} className="w-full inline-flex items-center justify-center gap-3 bg-gradient-gold text-primary-foreground px-7 py-4 text-xs uppercase tracking-[0.3em] hover:shadow-gold transition-all disabled:opacity-60">
                {loading ? "Sending…" : <>Send message <Send size={14} /></>}
              </button>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
