import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { Helmet } from "react-helmet-async";

const SITE_URL = "https://www.irhaapparels.com";

export type Crumb = { label: string; href?: string };

/**
 * Renders a visible breadcrumb trail plus matching BreadcrumbList JSON-LD.
 * Pass crumbs in order; the last crumb is the current page (no link).
 */
export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  const trail: Crumb[] = [{ label: "Home", href: "/" }, ...items];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      item: c.href ? `${SITE_URL}${c.href}` : undefined,
    })),
  };

  return (
    <>
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <nav
        aria-label="Breadcrumb"
        className="container-luxe pt-28 pb-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground"
      >
        <ol className="flex items-center flex-wrap gap-x-2 gap-y-1">
          {trail.map((c, i) => {
            const last = i === trail.length - 1;
            return (
              <li key={i} className="flex items-center gap-2">
                {i === 0 && <Home size={11} className="opacity-60" />}
                {c.href && !last ? (
                  <Link to={c.href} className="hover:text-primary transition-colors">
                    {c.label}
                  </Link>
                ) : (
                  <span className={last ? "text-foreground" : ""}>{c.label}</span>
                )}
                {!last && <ChevronRight size={11} className="opacity-50" />}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
