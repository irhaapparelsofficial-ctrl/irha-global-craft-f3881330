import { Link } from "react-router-dom";
import { BRAND, whatsappLink } from "@/lib/constants";
import { CATEGORIES } from "@/lib/categories";
import { Mail, MapPin, Phone } from "lucide-react";

export default function Footer() {
  return (
    <footer className="relative bg-background border-t border-border/60 pt-20 pb-10">
      <div className="container-luxe grid gap-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="eyebrow mb-4">Sialkot · Pakistan</p>
          <h3 className="font-display text-3xl md:text-4xl leading-tight max-w-md">
            Crafting <span className="text-gold">premium apparel</span> for the world's most discerning brands.
          </h3>
          <p className="text-muted-foreground mt-6 max-w-md text-sm leading-relaxed">
            OEM · ODM · Private Label manufacturing for retailers and labels across the USA, Europe and the UAE.
          </p>
        </div>

        <div>
          <p className="eyebrow mb-5">Collections</p>
          <ul className="space-y-3 text-sm">
            {CATEGORIES.map((c) => (
              <li key={c.slug}>
                <Link to="/products" className="text-foreground/75 hover:text-primary transition-colors">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
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
              <a href={`mailto:${BRAND.email}`} className="hover:text-primary">{BRAND.email}</a>
            </li>
          </ul>
        </div>
      </div>

      <div className="container-luxe mt-16 pt-8 border-t border-border/60 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground uppercase tracking-[0.25em]">
          © {new Date().getFullYear()} {BRAND.name}. All rights reserved.
        </p>
        <p className="text-xs text-muted-foreground uppercase tracking-[0.25em]">
          OEM · ODM · Private Label · Worldwide Export
        </p>
      </div>
    </footer>
  );
}
