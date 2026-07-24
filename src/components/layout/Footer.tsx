import { Link } from "react-router-dom";
import { Mail, MapPin, MessageCircle } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { SEO_BUYER_INTENT_FOOTER_LINKS } from "@/lib/buyerIntentSeoPages";
import { PUBLIC_IDENTITY } from "@/lib/publicIdentity.mjs";

function InstagramIcon({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" /></svg>;
}
function FacebookIcon({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>;
}
function LinkedInIcon({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect width="4" height="12" x="2" y="9" /><circle cx="4" cy="4" r="2" /></svg>;
}
function TikTokIcon({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" /></svg>;
}

const DIRECT_LINKS = [
  { label: "Products", href: "/products" },
  { label: "Inquiry Cart", href: "/inquiry-cart" },
  { label: "Manufacturing", href: "/manufacturing" },
  { label: "Buyer Trust", href: "/buyer-trust" },
  { label: "Factory Video Call", href: "/factory-video-call" },
  { label: "Deutsch: Trachten", href: "/de/bavarian-wear" },
];

const INCOTERMS = ["FOB Sialkot", "CIF", "EXW", "DDP"] as const;

export default function Footer() {
  const { data: settings } = useSiteSettings();
  const whatsappHref = `https://wa.me/${PUBLIC_IDENTITY.whatsappNumber}`;
  const socials = [
    { name: "Instagram", href: PUBLIC_IDENTITY.socialProfiles.instagram, Icon: InstagramIcon },
    { name: "Facebook", href: PUBLIC_IDENTITY.socialProfiles.facebook, Icon: FacebookIcon },
    { name: "LinkedIn", href: PUBLIC_IDENTITY.socialProfiles.linkedin, Icon: LinkedInIcon },
    { name: "TikTok", href: PUBLIC_IDENTITY.socialProfiles.tiktok, Icon: TikTokIcon },
  ];
  const collections = settings.footer.collectionLinks.filter((item) => item.enabled).slice(0, 5);
  const marketLinks = SEO_BUYER_INTENT_FOOTER_LINKS.slice(0, 8);

  return (
    <footer className="relative border-t border-border/60 bg-[#080808] pb-24 pt-12 text-foreground/80 md:pb-8 md:pt-16">
      <div className="container-luxe grid gap-9 sm:grid-cols-2 lg:grid-cols-[1.35fr_.8fr_.8fr_1fr] lg:gap-10">
        <div className="sm:col-span-2 lg:col-span-1">
          <Link to="/" className="inline-flex items-center gap-3" aria-label={`${PUBLIC_IDENTITY.name} home`}>
            <img src="/irha-brand-mark.svg" alt="Official Irha Apparels Manufacturing Specialists crest" className="h-20 w-20 shrink-0 object-contain object-left" />
            <span className="leading-none"><span className="block font-display text-2xl font-semibold text-foreground">{PUBLIC_IDENTITY.name}</span><span className="mt-1.5 block text-[8px] font-bold uppercase tracking-[0.22em] text-primary">Manufacturing Specialists</span></span>
          </Link>
          <p className="mt-4 max-w-md text-sm font-medium leading-6 text-foreground/85">Custom apparel manufacturing for brands, wholesalers and importers.</p>
          <p className="mt-2 max-w-md text-xs leading-5 text-foreground/52">Made-to-order Bavarian wear, sportswear, leatherwear, streetwear and leisure apparel from Sialkot, Pakistan.</p>
          <p className="mt-4 flex max-w-md items-start gap-2 text-xs leading-5 text-foreground/50"><MapPin size={14} className="mt-0.5 shrink-0 text-primary" /> {PUBLIC_IDENTITY.address.display}</p>
        </div>

        <div><p className="mb-4 text-[9px] font-semibold uppercase tracking-[0.22em] text-primary">Product programs</p><ul className="space-y-2.5 text-sm">{collections.map((item) => <li key={item.href}><Link to={item.href} className="text-foreground/62 transition-colors hover:text-primary">{item.label}</Link></li>)}</ul></div>
        <div><p className="mb-4 text-[9px] font-semibold uppercase tracking-[0.22em] text-primary">For buyers</p><ul className="space-y-2.5 text-sm">{DIRECT_LINKS.map((item) => <li key={item.href}><Link to={item.href} className="text-foreground/62 transition-colors hover:text-primary">{item.label}</Link></li>)}</ul></div>

        <div>
          <p className="mb-4 text-[9px] font-semibold uppercase tracking-[0.22em] text-primary">Contact</p>
          <ul className="space-y-3 text-sm">
            <li><a href={whatsappHref} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-2 text-foreground/72 hover:text-primary"><MessageCircle size={15} className="text-emerald-400" /> {PUBLIC_IDENTITY.telephone}</a></li>
            <li><a href={`mailto:${PUBLIC_IDENTITY.email}`} className="inline-flex items-start gap-2 break-all text-foreground/72 hover:text-primary"><Mail size={15} className="mt-0.5 shrink-0 text-primary" /> {PUBLIC_IDENTITY.email}</a></li>
          </ul>
          <div className="mt-5 flex gap-2">{socials.map((social) => <a key={social.name} href={social.href} target="_blank" rel="noreferrer noopener" aria-label={`${PUBLIC_IDENTITY.name} on ${social.name}`} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-foreground/15 text-foreground/60 transition-colors hover:border-primary hover:text-primary"><social.Icon /></a>)}</div>
        </div>
      </div>

      <div className="container-luxe mt-10 grid gap-5 border-t border-foreground/10 pt-6 md:grid-cols-[1fr_1.3fr]">
        <div><p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-foreground/38">Supported trade terms</p><div className="mt-3 flex flex-wrap gap-2">{INCOTERMS.map((term) => <span key={term} className="border border-foreground/15 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-foreground/58">{term}</span>)}</div><p className="mt-3 text-[10px] leading-5 text-foreground/38">Final Incoterm, destination coverage, duties and commercial responsibility are confirmed in the written quotation.</p></div>
        <div><p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-foreground/38">Data privacy & GDPR</p><p className="mt-3 max-w-3xl text-[11px] leading-6 text-foreground/48">Inquiry data and private tech packs are collected for quotation, sampling and order communication. Buyers can review the privacy policy, manage non-essential cookies, or request access and deletion through the published contact details.</p></div>
      </div>

      <div className="container-luxe mt-8 border-t border-foreground/10 pt-6"><p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-foreground/38">Priority sourcing markets</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[11px]">{marketLinks.map((item) => <Link key={item.href} to={item.href} className="text-foreground/48 hover:text-primary">{item.label}</Link>)}</div></div>
      <div className="container-luxe mt-7 flex flex-col gap-3 border-t border-foreground/10 pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="text-[9px] uppercase tracking-[0.18em] text-foreground/38">© {new Date().getFullYear()} {PUBLIC_IDENTITY.name}. {settings.footer.copyrightSuffix}</p><div className="flex flex-wrap gap-x-4 gap-y-2 text-[9px] uppercase tracking-[0.18em]"><Link to="/privacy-policy" className="text-foreground/42 hover:text-primary">Privacy / GDPR</Link><Link to="/terms-of-service" className="text-foreground/42 hover:text-primary">Terms</Link><button type="button" onClick={() => window.dispatchEvent(new Event("irha:open-cookie-settings"))} className="text-foreground/42 hover:text-primary">Cookie settings</button></div></div>
    </footer>
  );
}
