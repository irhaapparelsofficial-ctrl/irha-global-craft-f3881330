import { ReactNode, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Activity, BarChart3, BookOpen, ExternalLink, FileText, Home, Images, Inbox,
  Layers, LogOut, Menu, MessageCircle, Package, Search, Settings, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Admin views.
 *
 * The primary set is the eleven website-operations views exposed in the
 * simplified beginner admin. Legacy view keys are preserved in the union so
 * legacy CRM components (kept in the repo for rollback/history) still compile
 * against `AdminView`. Any legacy key routed here bounces back to the
 * dashboard — legacy panels are never mounted from the primary admin path.
 */
export type AdminView =
  // Primary — website operations only
  | "overview" | "inquiries" | "chat" | "products" | "categories" | "media"
  | "content" | "seo" | "catalogues" | "traffic" | "system"
  // Legacy — retained only for rollback; not routed in primary admin path
  | "buyers" | "inbox" | "sales" | "catalogue_home" | "advanced_dashboard"
  | "lead_engine" | "pipeline" | "buyer360" | "commercial" | "leads"
  | "whatsapp" | "mailing" | "rules" | "ai" | "studio" | "pi" | "production"
  | "directory" | "social" | "devops" | "listings" | "gsc" | "macro"
  | "website";

type NavItem = {
  key: AdminView;
  label: string;
  description: string;
  icon: typeof Home;
  href?: string;
};

const PRIMARY_NAV: NavItem[] = [
  { key: "overview", label: "Dashboard", description: "Website operations at a glance.", icon: Home },
  { key: "inquiries", label: "Website Inquiries", description: "RFQs and catalogue requests from the website.", icon: Inbox },
  { key: "chat", label: "Live Chat", description: "Reply to visitors chatting on the website.", icon: MessageCircle, href: "/admin/live-chat" },
  { key: "products", label: "Products", description: "Add, edit, publish and unpublish products.", icon: Package },
  { key: "categories", label: "Categories", description: "Organize the product category structure.", icon: Layers },
  { key: "media", label: "Media Library", description: "Upload and verify images and videos.", icon: Images },
  { key: "content", label: "Website Content", description: "Edit main website pages, blog and content blocks.", icon: FileText },
  { key: "seo", label: "SEO / Search", description: "Search Console, sitemaps and localized SEO.", icon: Search },
  { key: "catalogues", label: "PDF Catalogues", description: "Review and manage downloadable PDF catalogues.", icon: BookOpen },
  { key: "traffic", label: "Website Visitors", description: "Consented traffic and analytics.", icon: BarChart3 },
  { key: "system", label: "System Health", description: "Website, database and release health.", icon: Settings },
];

const PRIMARY_KEYS = new Set<AdminView>(PRIMARY_NAV.map((item) => item.key));

const MOBILE_NAV: NavItem[] = [
  PRIMARY_NAV[0], // Dashboard
  PRIMARY_NAV[1], // Inquiries
  PRIMARY_NAV[2], // Live Chat
  PRIMARY_NAV[3], // Products
  PRIMARY_NAV[5], // Media
];

export function AdminShell({ view, setView, userEmail, children }: {
  view: AdminView;
  setView: (view: AdminView) => void;
  userEmail: string | null | undefined;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const safeView: AdminView = PRIMARY_KEYS.has(view) ? view : "overview";
  const active = PRIMARY_NAV.find((item) => item.key === safeView) ?? PRIMARY_NAV[0];

  useEffect(() => {
    if (view !== safeView) setView(safeView);
  }, [view, safeView, setView]);

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return PRIMARY_NAV;
    return PRIMARY_NAV.filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(query));
  }, [searchQuery]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setMobileOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", onKeyDown); };
  }, [mobileOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setSearchOpen(true); }
      if (event.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const signOut = async () => { await supabase.auth.signOut(); window.location.href = "/"; };

  const openView = (item: NavItem) => {
    setMobileOpen(false);
    setSearchOpen(false);
    setSearchQuery("");
    if (item.href) {
      window.location.assign(item.href);
      return;
    }
    setView(item.key);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = item.key === safeView && !item.href;
    return (
      <li key={item.key}>
        <button
          type="button"
          onClick={() => openView(item)}
          className={cn(
            "flex min-h-12 w-full items-center gap-3 rounded-md border-l-2 px-3 py-2.5 text-left text-sm transition-colors",
            isActive ? "border-primary bg-primary/10 text-primary" : "border-transparent text-foreground/75 hover:bg-muted/50 hover:text-foreground",
            collapsed && "justify-center px-2",
          )}
          title={collapsed ? `${item.label}: ${item.description}` : item.description}
          aria-current={isActive ? "page" : undefined}
        >
          <Icon size={17} className="shrink-0" />
          {!collapsed && <span className="truncate font-medium">{item.label}</span>}
        </button>
      </li>
    );
  };

  const nav = (
    <nav className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-2 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]" aria-label="Admin sections">
      <div>
        {!collapsed && (
          <p className="mb-2 px-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80">
            Website operations
          </p>
        )}
        <ul className="space-y-1">{PRIMARY_NAV.map(renderItem)}</ul>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside
        id="admin-desktop-navigation"
        className={cn(
          "sticky top-0 hidden h-screen flex-col border-r border-border/60 bg-card/40 transition-[width] duration-200 md:flex",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <div className={cn("flex min-h-16 items-center border-b border-border/60 px-4", collapsed && "justify-center px-0")}>
          {!collapsed ? (
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-sm tracking-wide text-gold">IRHA ADMIN</p>
              <p className="truncate text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Website Operations</p>
            </div>
          ) : (
            <p className="font-display text-sm text-gold">IA</p>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((current) => !current)}
            className="inline-flex min-h-11 min-w-11 items-center justify-center text-muted-foreground hover:text-primary"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            aria-controls="admin-desktop-navigation"
          >
            <Menu size={16} />
          </button>
        </div>
        {!collapsed && (
          <div className="px-3 pt-3">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex min-h-12 w-full items-center gap-3 rounded-md border border-border/60 bg-background/50 px-3 text-sm text-muted-foreground hover:border-gold/60 hover:text-foreground"
            >
              <Search size={16} />
              <span className="flex-1 text-left">Find a section</span>
              <span className="rounded border border-border/60 px-1.5 py-0.5 text-[10px]">⌘K</span>
            </button>
          </div>
        )}
        {nav}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true" aria-label="Admin navigation">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-background/85 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside id="admin-mobile-navigation" className="relative flex h-[100dvh] w-[min(20rem,90vw)] flex-col border-r border-border/60 bg-card shadow-2xl">
            <div className="flex min-h-16 items-center justify-between border-b border-border/60 px-4 pt-[env(safe-area-inset-top)]">
              <div className="min-w-0">
                <p className="truncate font-display text-sm text-gold">IRHA ADMIN</p>
                <p className="truncate text-[9px] uppercase tracking-[0.15em] text-muted-foreground">Website Operations</p>
              </div>
              <button type="button" onClick={() => setMobileOpen(false)} className="inline-flex min-h-11 min-w-11 items-center justify-center text-muted-foreground" aria-label="Close menu">
                <X size={20} />
              </button>
            </div>
            <div className="border-b border-border/50 p-3">
              <button type="button" onClick={() => { setMobileOpen(false); setSearchOpen(true); }} className="flex min-h-12 w-full items-center gap-3 rounded-md border border-border/60 bg-background/50 px-3 text-sm text-muted-foreground">
                <Search size={17} /> Find a section
              </button>
            </div>
            {nav}
          </aside>
        </div>
      )}

      {searchOpen && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center p-3 pt-[max(5rem,env(safe-area-inset-top))] sm:p-6 sm:pt-24" role="dialog" aria-modal="true" aria-label="Find an admin section">
          <button type="button" aria-label="Close search" className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setSearchOpen(false)} />
          <div className="relative w-full max-w-2xl overflow-hidden rounded-xl border border-border/70 bg-card shadow-2xl">
            <div className="flex items-center gap-3 border-b border-border/60 px-4">
              <Search size={19} className="shrink-0 text-gold" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Type inquiries, products, media, SEO…"
                className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
              />
              <button type="button" onClick={() => setSearchOpen(false)} className="inline-flex min-h-11 min-w-11 items-center justify-center text-muted-foreground" aria-label="Close search">
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[65vh] overflow-y-auto p-2">
              {searchResults.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">No admin section matched that search.</div>
              ) : (
                searchResults.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => openView(item)}
                      className="flex min-h-16 w-full items-start gap-3 rounded-lg px-3 py-3 text-left hover:bg-muted/50"
                    >
                      <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Icon size={17} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{item.label}</span>
                        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{item.description}</span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex min-h-16 items-center gap-2 border-b border-border/60 bg-card/90 px-3 pt-[env(safe-area-inset-top)] backdrop-blur sm:gap-3 sm:px-4 md:px-6">
          <button type="button" className="-ml-2 inline-flex min-h-11 min-w-11 items-center justify-center text-foreground/80 md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu" aria-expanded={mobileOpen} aria-controls="admin-mobile-navigation">
            <Menu size={20} />
          </button>
          <div className="min-w-0 flex-1 py-2">
            <p className="truncate text-[9px] uppercase tracking-[0.16em] text-muted-foreground sm:text-[10px] sm:tracking-[0.2em]">Website operations</p>
            <h1 className="truncate font-display text-base leading-tight md:text-lg">{active.label}</h1>
          </div>
          <button type="button" onClick={() => setSearchOpen(true)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border/60 text-muted-foreground md:hidden" aria-label="Find an admin section">
            <Search size={17} />
          </button>
          <div className="hidden max-w-56 items-center gap-2 truncate text-[9px] uppercase tracking-[0.16em] text-muted-foreground lg:flex">{userEmail}</div>
          <a href="/" target="_blank" rel="noopener noreferrer" className="hidden min-h-11 items-center gap-2 rounded-md border border-gold/60 px-3 py-2 text-[10px] uppercase tracking-[0.15em] text-gold transition-colors hover:bg-gold hover:text-background sm:inline-flex" title="Open live website">
            <ExternalLink size={12} />
            <span className="hidden xl:inline">View Website</span>
          </a>
          <button type="button" onClick={signOut} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border/60 px-2 py-2 text-[10px] uppercase tracking-[0.15em] hover:border-primary hover:text-primary sm:gap-2 sm:px-3" aria-label="Sign out">
            <LogOut size={13} />
            <span className="hidden xl:inline">Sign out</span>
          </button>
        </header>
        <main id="admin-main" className="max-w-full flex-1 overflow-x-hidden p-3 pb-28 sm:p-4 sm:pb-28 md:p-6 md:pb-8 lg:p-8">
          {children}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-card/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" aria-label="Quick admin navigation">
        <div className="grid grid-cols-5">
          {MOBILE_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = item.key === safeView && !item.href;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => openView(item)}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium",
                  isActive ? "text-gold" : "text-muted-foreground",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon size={19} />
                <span className="w-full truncate text-center">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default AdminShell;

// Exposed for tests
export const __ADMIN_PRIMARY_NAV = PRIMARY_NAV;
