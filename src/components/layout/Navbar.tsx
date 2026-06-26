import { Link, NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { BRAND } from "@/lib/constants";
import { cn } from "@/lib/utils";
import MockupRequestButton from "@/components/MockupRequestButton";
import irhaLogo from "@/assets/irha-logo.png.asset.json";

const mainLinks = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/products", label: "Collections" },
  { to: "/manufacturing", label: "Manufacturing" },
];

const moreLinks = [
  { to: "/sustainability", label: "Sustainability" },
  { to: "/blog", label: "Blog" },
  { to: "/journal", label: "Journal" },
  { to: "/faq", label: "FAQ" },
];

const tailLinks = [
  { to: "/inquiry", label: "Inquiry" },
  { to: "/contact", label: "Contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
    setMoreOpen(false);
  }, [pathname]);

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-all duration-500",
        scrolled || open
          ? "bg-background/90 backdrop-blur-xl border-b border-border/60 py-3"
          : "bg-transparent py-6"
      )}
    >
      <div className="container-luxe flex items-center justify-between">
        <Link to="/" className="group flex items-center shrink-0 mr-8" aria-label="Irha Apparels — home">
          <img
            src={irhaLogo.url}
            alt="Irha Apparels"
            className="h-9 md:h-12 w-auto object-contain transition-transform group-hover:scale-[1.04]"
            loading="eager"
            decoding="async"
          />
        </Link>


        <nav className="hidden lg:flex items-center gap-8">
          {mainLinks.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === "/"}
              className={({ isActive }) =>
                cn(
                  "text-[11px] uppercase tracking-[0.25em] hover-gold-underline transition-colors",
                  isActive ? "text-primary" : "text-foreground/80 hover:text-foreground"
                )
              }
            >
              {l.label}
            </NavLink>
          ))}

          {/* Company dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setMoreOpen(true)}
            onMouseLeave={() => setMoreOpen(false)}
          >
            <button className="flex items-center gap-1 text-[11px] uppercase tracking-[0.25em] text-foreground/80 hover:text-foreground transition-colors">
              Company <ChevronDown size={12} />
            </button>
            {moreOpen && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 pt-5 animate-fade-in">
                <div className="bg-background border border-border/60 shadow-elegant min-w-[200px] py-2">
                  {moreLinks.map((l) => (
                    <NavLink
                      key={l.to}
                      to={l.to}
                      className={({ isActive }) =>
                        cn(
                          "block px-5 py-3 text-[11px] uppercase tracking-[0.25em] transition-colors",
                          isActive ? "text-primary" : "text-foreground/75 hover:text-primary hover:bg-card"
                        )
                      }
                    >
                      {l.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            )}
          </div>

          {tailLinks.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                cn(
                  "text-[11px] uppercase tracking-[0.25em] hover-gold-underline transition-colors",
                  isActive ? "text-primary" : "text-foreground/80 hover:text-foreground"
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <MockupRequestButton variant="nav">Mockup Design</MockupRequestButton>
          <Link
            to="/inquiry"
            className="inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-5 py-2.5 text-[11px] uppercase tracking-[0.25em] font-medium hover:shadow-gold transition-all"
          >
            Get Quote
          </Link>
        </div>

        <button
          onClick={() => setOpen((s) => !s)}
          className="lg:hidden text-foreground p-2"
          aria-label="Toggle menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden container-luxe pt-6 pb-4 flex flex-col gap-5 animate-fade-in max-h-[calc(100vh-80px)] overflow-y-auto">
          {[...mainLinks, ...moreLinks, ...tailLinks].map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === "/"}
              className={({ isActive }) =>
                cn(
                  "text-sm uppercase tracking-[0.25em]",
                  isActive ? "text-primary" : "text-foreground/80"
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
          <MockupRequestButton variant="navMobile">Mockup Design</MockupRequestButton>
          <Link
            to="/inquiry"
            className="mt-1 inline-flex w-fit items-center gap-2 bg-gradient-gold text-primary-foreground px-5 py-2.5 text-[11px] uppercase tracking-[0.25em]"
          >
            Get Quote
          </Link>
          <p className="text-xs text-muted-foreground pt-2">{BRAND.phoneDisplay}</p>
        </div>
      )}
    </header>
  );
}
