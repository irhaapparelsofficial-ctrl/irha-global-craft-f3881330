import { Link } from "react-router-dom";
import { BRAND, whatsappLink } from "@/lib/constants";
import { Mail, MapPin, MessageCircle, ChevronDown } from "lucide-react";
import irhaLogo from "@/assets/irha-logo.png.asset.json";

function InstagramIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function FacebookIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function TikTokIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  );
}

function WhatsAppIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

const SOCIALS = [
  { name: "Instagram", href: "https://www.instagram.com/irhaapparels", Icon: InstagramIcon },
  { name: "Facebook", href: "https://web.facebook.com/profile.php?id=61590950402472", Icon: FacebookIcon },
  { name: "TikTok", href: "https://www.tiktok.com/@irhaapparels", Icon: TikTokIcon },
];

const COLLECTIONS = [
  { slug: "bavarian-trachten-wear", label: "Bavarian & Trachten" },
  { slug: "premium-leather-apparel", label: "Premium Leather" },
  { slug: "sportswear", label: "Sportswear" },
  { slug: "streetwear-activewear", label: "Streetwear & Activewear" },
  { slug: "leisure-nightwear", label: "Leisure & Nightwear" },
];

const COMPANY = [
  { to: "/catalogue", label: "Catalogue" },
  { to: "/about", label: "About" },
  { to: "/manufacturing", label: "Manufacturing" },
  { to: "/buyer-trust", label: "Buyer Trust Center" },
  { to: "/factory-video-call", label: "Factory Video Call" },
  { to: "/resources", label: "Buyer Resources" },
  { to: "/faq", label: "Buyer FAQ" },
  { to: "/compliance", label: "Compliance" },
  { to: "/contact", label: "Contact" },
];

const BUYER_READINESS = [
  { label: "Requirement-led review", note: "Scope confirmed before commitment" },
  { label: "Private-label options", note: "Labels, tags and packaging by program" },
  { label: "Order documentation", note: "Requirements confirmed before dispatch" },
  { label: "Live factory view", note: "Available by scheduled video call" },
];

export default function Footer() {
  return (
    <footer className="relative bg-[#0A0A0A] border-t border-border/60 pt-16 pb-8 text-foreground/80">
      <div className="container-luxe grid gap-12 md:grid-cols-3 lg:grid-cols-5">
        <div>
          <Link to="/" className="inline-flex items-center" aria-label="Irha Apparels home">
            <img src={irhaLogo.url} alt="Irha Apparels" className="h-10 w-auto" />
          </Link>
          <p className="mt-5 text-sm font-medium text-foreground/90">B2B Custom Apparel Manufacturer</p>
          <p className="mt-2 text-sm text-foreground/60 leading-relaxed">Sialkot, Pakistan</p>
          <p className="mt-5 flex items-start gap-2 text-xs text-foreground/55 leading-relaxed">
            <MapPin size={14} className="text-gold mt-0.5 shrink-0" />
            {BRAND.address}
          </p>
        </div>

        <details className="group md:open border-b border-foreground/10 md:border-0 pb-3 md:pb-0" open>
          <summary className="flex md:block items-center justify-between cursor-pointer md:cursor-default list-none py-2 md:py-0 [&::-webkit-details-marker]:hidden">
            <span className="text-[11px] uppercase tracking-[0.3em] text-gold md:mb-5 block">Collections</span>
            <ChevronDown size={16} className="md:hidden text-foreground/50 transition-transform group-open:rotate-180" />
          </summary>
          <ul className="space-y-3 text-sm pt-3 md:pt-0">
            {COLLECTIONS.map((category) => (
              <li key={category.slug}>
                <Link to={`/products/${category.slug}`} className="inline-block py-1 text-foreground/70 hover:text-gold transition-colors">{category.label}</Link>
              </li>
            ))}
          </ul>
        </details>

        <details className="group border-b border-foreground/10 md:border-0 pb-3 md:pb-0" open>
          <summary className="flex md:block items-center justify-between cursor-pointer md:cursor-default list-none py-2 md:py-0 [&::-webkit-details-marker]:hidden">
            <span className="text-[11px] uppercase tracking-[0.3em] text-gold md:mb-5 block">Company & Buyer</span>
            <ChevronDown size={16} className="md:hidden text-foreground/50 transition-transform group-open:rotate-180" />
          </summary>
          <ul className="space-y-2.5 text-sm pt-3 md:pt-0">
            {COMPANY.map((link) => (
              <li key={link.to}><Link to={link.to} className="inline-block py-1 text-foreground/70 hover:text-gold transition-colors">{link.label}</Link></li>
            ))}
          </ul>
        </details>

        <details className="group border-b border-foreground/10 md:border-0 pb-3 md:pb-0" open>
          <summary className="flex md:block items-center justify-between cursor-pointer md:cursor-default list-none py-2 md:py-0 [&::-webkit-details-marker]:hidden">
            <span className="text-[11px] uppercase tracking-[0.3em] text-gold md:mb-5 block">Connect</span>
            <ChevronDown size={16} className="md:hidden text-foreground/50 transition-transform group-open:rotate-180" />
          </summary>
          <div className="pt-3 md:pt-0">
            <div className="flex items-center gap-3 mb-5">
              {SOCIALS.map((social) => (
                <a key={social.name} href={social.href} target="_blank" rel="noreferrer noopener" aria-label={`Irha Apparels on ${social.name}`} className="inline-flex items-center justify-center w-11 h-11 md:w-9 md:h-9 border border-foreground/20 text-foreground/70 hover:border-gold hover:text-gold transition-colors">
                  <social.Icon size={18} />
                </a>
              ))}
            </div>
            <ul className="space-y-3 text-sm">
              <li>
                <a href={whatsappLink()} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-2 py-1 text-foreground/75 hover:text-gold transition-colors">
                  <WhatsAppIcon size={15} /> +92 320 4110066
                </a>
              </li>
              <li>
                <a href={whatsappLink()} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-2 py-1 text-foreground/55 hover:text-gold transition-colors text-xs">
                  <MessageCircle size={13} /> Chat on WhatsApp
                </a>
              </li>
              <li>
                <a href={`mailto:${BRAND.email}`} className="inline-flex items-center gap-2 py-1 text-foreground/75 hover:text-gold transition-colors break-all">
                  <Mail size={15} /> {BRAND.email}
                </a>
              </li>
            </ul>
          </div>
        </details>

        <details className="group border-b border-foreground/10 md:border-0 pb-3 md:pb-0 lg:col-span-1 md:col-span-3" open>
          <summary className="flex md:block items-center justify-between cursor-pointer md:cursor-default list-none py-2 md:py-0 [&::-webkit-details-marker]:hidden">
            <span className="text-[11px] uppercase tracking-[0.3em] text-gold md:mb-5 block">Buyer Readiness</span>
            <ChevronDown size={16} className="md:hidden text-foreground/50 transition-transform group-open:rotate-180" />
          </summary>
          <ul className="space-y-2.5 text-sm pt-3 md:pt-0">
            {BUYER_READINESS.map((item) => (
              <li key={item.label} className="leading-snug">
                <span className="text-foreground/75 font-medium">{item.label}</span>
                <span className="text-foreground/45"> — {item.note}</span>
              </li>
            ))}
          </ul>
          <Link to="/factory-video-call" className="mt-5 inline-flex text-[10px] uppercase tracking-[0.2em] text-gold hover:underline">
            Request live factory call →
          </Link>
        </details>
      </div>

      <div className="container-luxe mt-14 pt-6 border-t border-foreground/10">
        <p className="text-center text-[11px] md:text-xs uppercase tracking-[0.3em] text-foreground/65">
          MOQ · Timing · Pricing confirmed per program <span className="text-gold mx-2">|</span> OEM · ODM · Private Label
        </p>
      </div>

      <div className="container-luxe mt-6 flex flex-col md:flex-row items-center justify-between gap-3">
        <p className="text-[10px] uppercase tracking-[0.25em] text-foreground/45">© {new Date().getFullYear()} {BRAND.name}. All rights reserved.</p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] uppercase tracking-[0.25em]">
          <Link to="/privacy-policy" className="text-foreground/45 hover:text-gold transition-colors">Privacy Policy</Link>
          <Link to="/terms-of-service" className="text-foreground/45 hover:text-gold transition-colors">Terms of Service</Link>
          <button type="button" onClick={() => window.dispatchEvent(new Event("irha:open-cookie-settings"))} className="text-foreground/45 hover:text-gold transition-colors">Cookie Settings</button>
        </div>
      </div>
    </footer>
  );
}
