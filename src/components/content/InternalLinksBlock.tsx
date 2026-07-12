import { Link, useLocation } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { usePublicPageTools } from "@/hooks/usePublicContent";

export default function InternalLinksBlock() {
  const { pathname } = useLocation();
  const { data } = usePublicPageTools(pathname || "/", "en");
  const links = data.links.slice(0, 8);

  if (links.length === 0) return null;

  return (
    <aside className="border-t border-border/60 bg-card/20" aria-label="Related pages">
      <div className="container-luxe py-10 md:py-12">
        <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-4">Related buyer pages</p>
        <div className="flex flex-wrap gap-2.5">
          {links.map((link) => (
            <Link
              key={link.id}
              to={link.to_route}
              className="min-h-11 inline-flex items-center gap-2 border border-border/60 px-4 py-2.5 text-xs text-foreground/75 hover:border-gold hover:text-gold transition-colors"
            >
              {link.anchor_text}<ArrowUpRight size={12} />
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}
