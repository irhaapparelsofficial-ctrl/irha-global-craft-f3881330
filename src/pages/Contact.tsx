import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import { Calendar, Clock3, Mail, MapPin, MessageCircle, Phone, ShieldCheck, UserRound } from "lucide-react";
import { PUBLIC_IDENTITY } from "@/lib/publicIdentity.mjs";

function InstagramIcon({ className, size = 24 }: { className?: string; size?: number }) {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" /></svg>;
}
function FacebookIcon({ className, size = 24 }: { className?: string; size?: number }) {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>;
}
function LinkedInIcon({ className, size = 24 }: { className?: string; size?: number }) {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect width="4" height="12" x="2" y="9" /><circle cx="4" cy="4" r="2" /></svg>;
}
function TikTokIcon({ className, size = 24 }: { className?: string; size?: number }) {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" /></svg>;
}
function WhatsAppIcon({ className, size = 24 }: { className?: string; size?: number }) {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>;
}

export default function Contact() {
  const whatsappHref = `https://wa.me/${PUBLIC_IDENTITY.whatsappNumber}`;
  const socials = [
    { name: "Instagram", Icon: InstagramIcon, href: PUBLIC_IDENTITY.socialProfiles.instagram, handle: "@irhaapparels" },
    { name: "Facebook", Icon: FacebookIcon, href: PUBLIC_IDENTITY.socialProfiles.facebook, handle: PUBLIC_IDENTITY.name },
    { name: "LinkedIn", Icon: LinkedInIcon, href: PUBLIC_IDENTITY.socialProfiles.linkedin, handle: PUBLIC_IDENTITY.name },
    { name: "TikTok", Icon: TikTokIcon, href: PUBLIC_IDENTITY.socialProfiles.tiktok, handle: "@irhaapparels" },
    { name: "WhatsApp", Icon: WhatsAppIcon, href: whatsappHref, handle: PUBLIC_IDENTITY.telephone },
  ];

  return (
    <>
      <SEO title={`Contact ${PUBLIC_IDENTITY.name} — ${PUBLIC_IDENTITY.address.display}`} description={`Reach ${PUBLIC_IDENTITY.name} via WhatsApp, email or direct call for international B2B apparel manufacturing enquiries.`} path="/contact" />

      <section className="pt-40 pb-20 border-b border-border/60"><div className="container-luxe"><p className="eyebrow mb-6">Contact</p><h1 className="font-display text-5xl md:text-7xl lg:text-8xl leading-[0.95] max-w-4xl">Let's build <span className="text-gold italic">together</span>.</h1></div></section>

      <section className="py-24 md:py-32">
        <div className="container-luxe grid lg:grid-cols-2 gap-16">
          <div className="space-y-10">
            <ContactRow Icon={UserRound} label="Responsible Person" value={PUBLIC_IDENTITY.responsiblePerson.name} detail={`${PUBLIC_IDENTITY.responsiblePerson.title}, ${PUBLIC_IDENTITY.name}`} />
            <ContactRow Icon={MessageCircle} label="WhatsApp (Preferred)" value={PUBLIC_IDENTITY.telephone} href={whatsappHref} cta="Open Chat" />
            <ContactRow Icon={Phone} label="Direct Line" value={PUBLIC_IDENTITY.telephone} href={`tel:${PUBLIC_IDENTITY.telephoneHref}`} cta="Call Now" />
            <ContactRow Icon={Mail} label="Email" value={PUBLIC_IDENTITY.email} href={`mailto:${PUBLIC_IDENTITY.email}`} cta="Send Email" />
            <ContactRow Icon={MapPin} label="Public Location" value={PUBLIC_IDENTITY.address.display} detail={PUBLIC_IDENTITY.availability.appointmentPolicy} />
            <ContactRow Icon={Clock3} label="Business Availability" value={PUBLIC_IDENTITY.availability.days} detail={PUBLIC_IDENTITY.availability.hours} />
          </div>
          <div className="bg-card/40 border border-border p-10 md:p-12">
            <p className="eyebrow mb-6">Business Enquiries</p><h2 className="font-display text-3xl mb-6">Share your requirements.</h2>
            <p className="text-foreground/70 leading-relaxed">The team reviews business enquiries and follows up using the contact details you provide. Price, MOQ, sample timing, production timing and shipping scope are confirmed after the exact program is reviewed.</p>
            <div className="space-y-4 text-foreground/75 mt-8"><div className="flex gap-3 border-b border-border/60 pb-4"><ShieldCheck size={18} className="text-gold shrink-0 mt-0.5" /><span>Use the Buyer Trust Center to review the verification process before ordering.</span></div><div className="flex gap-3 border-b border-border/60 pb-4"><Calendar size={18} className="text-gold shrink-0 mt-0.5" /><span>Buyer visits and factory video calls are arranged by prior appointment.</span></div><div className="flex gap-3"><MessageCircle size={18} className="text-gold shrink-0 mt-0.5" /><span>WhatsApp is the fastest direct channel for urgent product or meeting context.</span></div></div>
            <div className="mt-10 flex flex-wrap gap-3"><a href={whatsappHref} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-3 bg-gradient-gold text-primary-foreground px-7 py-4 text-xs uppercase tracking-[0.3em] hover:shadow-gold transition-all"><MessageCircle size={16} /> Start Conversation</a><Link to="/factory-video-call" className="inline-flex items-center gap-3 border border-foreground/25 hover:border-gold hover:text-gold px-7 py-4 text-xs uppercase tracking-[0.3em] transition-colors"><Calendar size={16} /> Factory Call</Link></div>
          </div>
        </div>
      </section>

      <section className="pb-24 md:pb-32 border-t border-border/60"><div className="container-luxe pt-16"><p className="eyebrow mb-8">Official Profiles</p><div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-8">{socials.map((social) => <a key={social.name} href={social.href} target="_blank" rel="noreferrer noopener" aria-label={`${PUBLIC_IDENTITY.name} on ${social.name}`} className="flex flex-col items-center gap-3 border border-border/60 p-6 hover:border-gold transition-colors group"><social.Icon className="text-foreground/60 group-hover:text-gold transition-colors" size={28} /><span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground group-hover:text-foreground">{social.name}</span><span className="text-[9px] uppercase tracking-[0.15em] text-gold/80">{social.handle}</span></a>)}</div></div></section>
    </>
  );
}

function ContactRow({ Icon, label, value, detail, href, cta }: { Icon: typeof Mail; label: string; value: string; detail?: string; href?: string; cta?: string }) {
  return <div className="border-b border-border pb-8"><div className="flex items-center gap-3 mb-3"><Icon className="text-primary" size={18} /><p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">{label}</p></div><p className="font-display text-3xl md:text-4xl break-words">{value}</p>{detail && <p className="mt-2 text-sm text-foreground/55">{detail}</p>}{href && cta && <a href={href} target="_blank" rel="noreferrer noopener" className="mt-4 inline-block text-xs uppercase tracking-[0.3em] text-primary hover-gold-underline">{cta} →</a>}</div>;
}
