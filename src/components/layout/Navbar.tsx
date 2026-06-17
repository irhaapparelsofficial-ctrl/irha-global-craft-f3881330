import { Link, NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { BRAND } from "@/lib/constants";
import { cn } from "@/lib/utils";

const links = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/products", label: "Collections" },
  { to: "/manufacturing", label: "Manufacturing" },
  { to: "/inquiry", label: "Inquiry" },
  { to: "/contact", label: "Contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-all duration-500",
        scrolled || open
          ? "bg-background/85 backdrop-blur-xl border-b border-border/60 py-3"
          : "bg-transparent py-6"
      )}
    >
      <div className="container-luxe flex items-center justify-between">
        <Link to="/" className="group flex items-baseline gap-2">
          <span className="font-display text-2xl tracking-tight">
            <span className="text-gold">Irha</span>
            <span className="text-foreground"> Apparels</span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-10">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === "/"}
              className={({ isActive }) =>
                cn(
                  "text-[12px] uppercase tracking-[0.25em] hover-gold-underline transition-colors",
                  isActive ? "text-primary" : "text-foreground/80 hover:text-foreground"
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden lg:block">
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
        <div className="lg:hidden container-luxe pt-6 pb-4 flex flex-col gap-5 animate-fade-in">
          {links.map((l) => (
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
          <Link
            to="/inquiry"
            className="mt-2 inline-flex w-fit items-center gap-2 bg-gradient-gold text-primary-foreground px-5 py-2.5 text-[11px] uppercase tracking-[0.25em]"
          >
            Get Quote
          </Link>
          <p className="text-xs text-muted-foreground pt-2">{BRAND.phoneDisplay}</p>
        </div>
      )}
    </header>
  );
}
