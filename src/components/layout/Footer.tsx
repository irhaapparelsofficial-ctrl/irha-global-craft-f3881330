import { Link } from "react-router-dom";
import { BRAND, whatsappLink } from "@/lib/constants";
import { CATEGORIES } from "@/lib/categories";
import { Mail, MapPin, Phone } from "lucide-react";

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}
function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}
function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
      <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
    </svg>
  );
}
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  );
}

const SOCIALS = [
  { name: "Instagram", Icon: InstagramIcon },
  { name: "Facebook", Icon: FacebookIcon },
  { name: "LinkedIn", Icon: LinkedInIcon },
  { name: "X / Twitter", Icon: XIcon },
  { name: "TikTok", Icon: TikTokIcon },
];

const COMPANY = [
  { to: "/about", label: "About" },
  { to: "/manufacturing", label: "Manufacturing" },
  { to: "/sustainability", label: "Sustainability" },
  { to: "/journal", label: "Journal" },
  { to: "/faq", label: "FAQ" },
  { to: "/inquiry", label: "Get a Quote" },
];

export default function Footer() {
  return (
    <footer className="relative bg-background border-t border-border/60 pt-20 pb-10">
      <div className="container-luxe grid gap-14 md:grid-cols-12">
        <div className="md:col-span-5">
          <p className="eyebrow mb-4">Sialkot · Pakistan</p>
          <h3 className="font-display text-3xl md:text-4xl leading-tight max-w-md">
            Crafting <span className="text-gold">premium apparel</span> for the world's most discerning brands.
          </h3>
          <p className="text-muted-foreground mt-6 max-w-md text-sm leading-relaxed">
            OEM · ODM · Private Label manufacturing for retailers and labels across the USA, Europe and the UAE.
          </p>
        </div>

        <div className="md:col-span-3">
          <p className="eyebrow mb-5">Collections</p>
          <ul className="space-y-3 text-sm">
            {CATEGORIES.map((c) => (
              <li key={c.slug}>
                <Link to={`/products#${c.slug}`} className="text-foreground/75 hover:text-primary transition-colors">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="md:col-span-2">
          <p className="eyebrow mb-5">Company</p>
          <ul className="space-y-3 text-sm">
            {COMPANY.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="text-foreground/75 hover:text-primary transition-colors">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="md:col-span-2">
          <p className="eyebrow mb-5">Contact</p>
          <ul className="space-y-4 text-sm text-foreground/75">
            <li className="flex items-start gap-3">
              <MapPin size={16} className="text-primary mt-0.5 shrink-0" />
              {BRAND.address}
            </li>
            <li className="flex items-start gap-3">
              <Phone size={16} className="text-primary mt-0.5 shrink-0" />
              <a href={whatsappLink()} target="_blank" rel="noreferrer" className="hover:text-primary">
                {BRAND.phoneDisplay}
              </a>
            </li>
            <li className="flex items-start gap-3">
              <Mail size={16} className="text-primary mt-0.5 shrink-0" />
              <a href={`mailto:${BRAND.email}`} className="hover:text-primary break-all">{BRAND.email}</a>
            </li>
          </ul>
        </div>
      </div>

      <div className="container-luxe mt-16 pt-8 border-t border-border/60 flex flex-col md:flex-row items-center justify-between gap-6">
        <p className="text-xs text-muted-foreground uppercase tracking-[0.25em]">
          © {new Date().getFullYear()} {BRAND.name}. All rights reserved.
        </p>
        <div className="flex items-center gap-6">
          {SOCIALS.map((s) => (
            <div key={s.name} className="group flex flex-col items-center gap-1.5 cursor-default">
              <s.Icon className="text-foreground/50 group-hover:text-primary transition-colors" size={18} />
              <span className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">{s.name}</span>
              <span className="text-[8px] uppercase tracking-[0.15em] text-gold/80">Coming Soon</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground uppercase tracking-[0.25em]">
          OEM · ODM · Private Label · Worldwide Export
        </p>
      </div>
    </footer>
  );
}
