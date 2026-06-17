import SEO from "@/components/SEO";
import { BRAND, whatsappLink } from "@/lib/constants";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";

export default function Contact() {
  return (
    <>
      <SEO
        title="Contact Irha Apparels — Sialkot, Pakistan"
        description="Reach the Irha Apparels team in Sialkot, Pakistan via WhatsApp, email or direct call. We respond within hours to international B2B inquiries."
        path="/contact"
      />

      <section className="pt-40 pb-20 border-b border-border/60">
        <div className="container-luxe">
          <p className="eyebrow mb-6">Contact</p>
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl leading-[0.95] max-w-4xl">
            Let's build <span className="text-gold italic">together</span>.
          </h1>
        </div>
      </section>

      <section className="py-24 md:py-32">
        <div className="container-luxe grid lg:grid-cols-2 gap-16">
          <div className="space-y-10">
            <ContactRow Icon={MessageCircle} label="WhatsApp (Preferred)" value={BRAND.phoneDisplay} href={whatsappLink()} cta="Open Chat" />
            <ContactRow Icon={Phone} label="Direct Line" value={BRAND.phoneDisplay} href={`tel:${BRAND.phone}`} cta="Call Now" />
            <ContactRow Icon={Mail} label="Email" value={BRAND.email} href={`mailto:${BRAND.email}`} cta="Send Email" />
            <ContactRow Icon={MapPin} label="Atelier" value={BRAND.address} />
          </div>
          <div className="bg-card/40 border border-border p-10 md:p-12">
            <p className="eyebrow mb-6">Business Hours</p>
            <h3 className="font-display text-3xl mb-6">We respond within hours.</h3>
            <ul className="space-y-4 text-foreground/75">
              <li className="flex justify-between border-b border-border/60 pb-3"><span>Monday – Friday</span><span>9:00 — 19:00 PKT</span></li>
              <li className="flex justify-between border-b border-border/60 pb-3"><span>Saturday</span><span>10:00 — 16:00 PKT</span></li>
              <li className="flex justify-between"><span>Sunday</span><span className="text-muted-foreground">Closed</span></li>
            </ul>
            <a href={whatsappLink()} target="_blank" rel="noreferrer" className="mt-10 inline-flex items-center gap-3 bg-gradient-gold text-primary-foreground px-7 py-4 text-xs uppercase tracking-[0.3em] hover:shadow-gold transition-all">
              <MessageCircle size={16}/> Start a Conversation
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

function ContactRow({ Icon, label, value, href, cta }: { Icon: any; label: string; value: string; href?: string; cta?: string }) {
  return (
    <div className="border-b border-border pb-8">
      <div className="flex items-center gap-3 mb-3">
        <Icon className="text-primary" size={18}/>
        <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">{label}</p>
      </div>
      <p className="font-display text-3xl md:text-4xl">{value}</p>
      {href && cta && (
        <a href={href} target="_blank" rel="noreferrer" className="mt-4 inline-block text-xs uppercase tracking-[0.3em] text-primary hover-gold-underline">
          {cta} →
        </a>
      )}
    </div>
  );
}
