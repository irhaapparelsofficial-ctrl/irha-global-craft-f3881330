import { useRef, useState } from "react";
import { Send, MessageCircle, Mail, Instagram, Facebook, Linkedin, Music2 } from "lucide-react";
import SEO from "@/components/SEO";
import { toast } from "@/hooks/use-toast";
import { BRAND } from "@/lib/constants";
import { submitPublicInquiry } from "@/lib/publicLeadGateway";
import {
  ORGANIZATION_ID,
  SITE_URL,
  WEBSITE_ID,
  breadcrumbSchema,
} from "@/lib/seoSchema";

const SOCIALS = [
  { label: "Instagram", href: "https://www.instagram.com/irhaapparels", Icon: Instagram },
  { label: "Facebook", href: "https://web.facebook.com/profile.php?id=61590950402472", Icon: Facebook },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/irha-apparels", Icon: Linkedin },
  { label: "TikTok", href: "https://www.tiktok.com/@irhaapparels", Icon: Music2 },
  { label: "WhatsApp", href: "https://wa.me/923204110066", Icon: MessageCircle },
];

export default function Connect() {
  const [data, setData] = useState({ name: "", company: "", email: "", whatsapp: "", source: "", message: "", website: "" });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
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
      await submitPublicInquiry({
        kind: "connect",
        name: data.name,
        email: data.email,
        phone: data.whatsapp,
        company: data.company,
        category: data.source || "social-form",
        message: data.message,
        source: data.source ? `connect:${data.source}` : "connect-universal-form",
        website: data.website,
        form_started_at: startedAtRef.current,
        lead_context: {
          conversion_type: "connect",
          source_channel: data.source || null,
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
        // Analytics must never block a successfully saved buyer request.
      }

      setSent(true);
    } catch (error) {
      toast({
        title: "Message could not be saved",
        description: error instanceof Error ? error.message : "Please try again or contact us directly on WhatsApp.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const input = "w-full bg-input border border-border focus:border-primary outline-none px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors";
  const pageUrl = `${SITE_URL}/connect`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
      name: "Connect with Irha Apparels",
      description: "Contact Irha Apparels about custom B2B apparel manufacturing requirements.",
      isPartOf: { "@id": WEBSITE_ID },
      about: { "@id": ORGANIZATION_ID },
      inLanguage: "en",
    },
    breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Connect", path: "/connect" },
    ]),
  ];

  return (
    <>
      <SEO
        title="Connect with Irha Apparels — B2B Apparel Manufacturing"
        description="Contact Irha Apparels in Sialkot about custom B2B apparel manufacturing, OEM, ODM and private-label requirements."
        path="/connect"
        jsonLd={jsonLd}
      />

      <section className="pt-28 md:pt-36 pb-20">
        <div className="container-luxe max-w-2xl">
          <p className="eyebrow mb-3">Universal Contact</p>
          <h1 className="font-display text-3xl md:text-5xl leading-[1.05]">
            Get in touch with <span className="text-gold italic">{BRAND.name}</span>
          </h1>
          <p className="text-foreground/70 mt-4 leading-relaxed text-sm md:text-base">
            One form, every channel. Share your product, company and contact details so our team can review the request and reply using the information you provide.
          </p>

          <div className="flex flex-wrap gap-2 mt-6">
            {SOCIALS.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-2 border border-foreground/20 text-foreground/70 hover:border-gold hover:text-gold px-3 py-2 text-xs uppercase tracking-[0.18em] transition-colors"
              >
                <social.Icon size={14} /> {social.label}
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
                Your request was saved successfully. Our team will review it and reply using the contact details you provided.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-10 border border-border bg-card/40 p-6 md:p-8 space-y-4">
              <input
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="absolute -left-[10000px] h-px w-px opacity-0"
                name="website"
                value={data.website}
                onChange={(event) => update("website", event.target.value)}
              />
              <input className={input} placeholder="Full name *" value={data.name} onChange={(event) => update("name", event.target.value)} required aria-label="Full name" maxLength={100} />
              <input className={input} placeholder="Company / brand" value={data.company} onChange={(event) => update("company", event.target.value)} aria-label="Company" maxLength={160} />
              <div className="grid sm:grid-cols-2 gap-3">
                <input type="email" className={input} placeholder="Email" value={data.email} onChange={(event) => update("email", event.target.value)} aria-label="Email" maxLength={254} />
                <input className={input} placeholder="WhatsApp number" value={data.whatsapp} onChange={(event) => update("whatsapp", event.target.value)} aria-label="WhatsApp number" maxLength={40} />
              </div>
              <select className={input} value={data.source} onChange={(event) => update("source", event.target.value)} aria-label="Where did you find us">
                <option value="">Found us via…</option>
                <option value="Instagram">Instagram</option>
                <option value="Facebook">Facebook</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="TikTok">TikTok</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Google">Google search</option>
                <option value="Referral">Referral</option>
              </select>
              <textarea className={input} rows={3} placeholder="What can we help you with? (product, MOQ, deadline…)" value={data.message} onChange={(event) => update("message", event.target.value)} aria-label="Message" maxLength={6000} />
              <p className="text-[10px] text-muted-foreground">
                * Either email or WhatsApp is required so the team can reply to your saved request.
              </p>
              <button type="submit" disabled={loading} className="w-full inline-flex items-center justify-center gap-3 bg-gradient-gold text-primary-foreground px-7 py-4 text-xs uppercase tracking-[0.3em] hover:shadow-gold transition-all disabled:opacity-60">
                {loading ? "Saving…" : <>Send message <Send size={14} /></>}
              </button>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
