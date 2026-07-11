import { ReactNode, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Home, Package, Layers, BookOpen, Search,
  Users, MessageSquare, Send, Sparkles, Cpu, ScrollText,
  MapPin, Share2, Activity, Settings, LogOut, ExternalLink, Menu, X,
  BarChart3, ListChecks, UserSearch,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ListingsPanel from "@/components/admin/ListingsPanel";
import ListingLaunchKit from "@/components/admin/ListingLaunchKit";
import LeadAcquisitionPanel from "@/components/admin/LeadAcquisitionPanel";
import MultilingualSeoPanel from "@/components/admin/MultilingualSeoPanel";
import ProductionHealthPanel from "@/components/admin/ProductionHealthPanel";
import GoogleSearchCenter from "@/components/admin/GoogleSearchCenter";
import AIOperationsPlaybook from "@/components/admin/AIOperationsPlaybook";
import OutreachTemplateLibrary from "@/components/admin/OutreachTemplateLibrary";
import SocialContentPlaybook from "@/components/admin/SocialContentPlaybook";

export type AdminView =
  | "overview"
  | "products" | "categories" | "catalogues"
  | "blog" | "faqs" | "seo" | "links"
  | "lead_engine" | "leads" | "inquiries" | "chat" | "mailing"
  | "ai"
  | "studio" | "pi" | "directory"
  | "social" | "devops" | "listings"
  | "traffic" | "gsc" | "macro"
  | "system";

type NavItem = { key: AdminView; label: string; icon: typeof Home };
type NavGroup = { title: string; items: NavItem[] };

const NAV: NavGroup[] = [
  { title: "Overview", items: [
    { key: "overview", label: "Dashboard", icon: Home },
  ]},
  { title: "Catalog", items: [
    { key: "products", label: "Products", icon: Package },
    { key: "categories", label: "Categories", icon: Layers },
    { key: "catalogues", label: "Catalogues", icon: BookOpen },
  ]},
  { title: "Content & SEO", items: [
    { key: "seo", label: "Multilingual SEO", icon: Search },
  ]},
  { title: "Leads & Communication", items: [
    { key: "lead_engine", label: "Lead Acquisition", icon: UserSearch },
    { key: "leads", label: "Buyer Inbox", icon: Users },
    { key: "chat", label: "Live Chat", icon: MessageSquare },
    { key: "mailing", label: "Mailing", icon: Send },
  ]},
  { title: "AI", items: [
    { key: "ai", label: "AI Command Center", icon: Sparkles },
  ]},
  { title: "Operations", items: [
    { key: "studio", label: "Studio & FOB", icon: Cpu },
    { key: "pi", label: "PI Generator", icon: ScrollText },
    { key: "directory", label: "Export Directory", icon: MapPin },
  ]},
  { title: "Growth", items: [
    { key: "listings", label: "B2B Listings", icon: ListChecks },
    { key: "social", label: "Social Calendar", icon: Share2 },
    { key: "devops", label: "Social Sync / DevOps", icon: Activity },
    { key: "traffic", label: "Traffic", icon: BarChart3 },
    { key: "gsc", label: "Google Search", icon: Search },
  ]},
  { title: "System", items: [
    { key: "macro", label: "Macro Gateway", icon: Layers },
    { key: "system", label: "Production Health", icon: Settings },
  ]},
];

export function AdminShell({
  view, setView, userEmail, children,
}: {
  view: AdminView;
  setView: (view: AdminView) => void;
  userEmail: string | null | undefined;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const active = NAV.flatMap((group) => group.items).find((item) => item.key === view);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const nav = (
    <nav className="flex-1 overflow-y-auto overscroll-contain py-4 px-2 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-6">
      {NAV.map((group) => (
        <div key={group.title}>
          {!collapsed && (
            <p className="px-3 mb-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
              {group.title}
            </p>
          )}
          <ul className="space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = item.key === view;
              return (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => { setView(item.key); setMobileOpen(false); }}
                    className={cn(
                      "min-h-11 w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-sm transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary border-l-2 border-primary"
                        : "text-foreground/70 hover:text-foreground hover:bg-muted/40 border-l-2 border-transparent",
                      collapsed && "justify-center px-2",
                    )}
                    title={collapsed ? item.label : undefined}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon size={16} className="shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const content = view === "listings"
    ? <><ListingLaunchKit /><ListingsPanel /></>
    : view === "lead_engine"
      ? <LeadAcquisitionPanel />
      : view === "seo"
        ? <MultilingualSeoPanel />
        : view === "gsc"
          ? <GoogleSearchCenter />
          : view === "system"
            ? <ProductionHealthPanel />
            : view === "ai"
              ? <><AIOperationsPlaybook />{children}</>
              : view === "mailing"
                ? <><OutreachTemplateLibrary />{children}</>
                : view === "social"
                  ? <><SocialContentPlaybook />{children}</>
                  : children;

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside
        className={cn(
          "hidden md:flex sticky top-0 h-screen flex-col border-r border-border/60 bg-card/30 transition-[width] duration-200",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <div className={cn("min-h-14 flex items-center border-b border-border/60 px-4", collapsed && "justify-center px-0")}>
          {!collapsed ? (
            <div className="flex-1 min-w-0">
              <p className="font-display text-sm tracking-wide text-gold truncate">IRHA ADMIN</p>
              <p className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground truncate">Control Core</p>
            </div>
          ) : (
            <p className="font-display text-gold text-sm">IA</p>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="min-h-11 min-w-11 inline-flex items-center justify-center text-muted-foreground hover:text-primary"
            aria-label="Toggle sidebar"
          >
            <Menu size={16} />
          </button>
        </div>
        {nav}
      </aside>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Admin navigation">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-background/85 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative h-[100dvh] w-[min(19rem,88vw)] bg-card border-r border-border/60 flex flex-col shadow-2xl">
            <div className="min-h-16 flex items-center justify-between px-4 border-b border-border/60 pt-[env(safe-area-inset-top)]">
              <div className="min-w-0">
                <p className="font-display text-sm text-gold truncate">IRHA ADMIN</p>
                <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground truncate">{userEmail || "Control Core"}</p>
              </div>
              <button type="button" onClick={() => setMobileOpen(false)} className="min-h-11 min-w-11 inline-flex items-center justify-center text-muted-foreground" aria-label="Close menu"><X size={20} /></button>
            </div>
            {nav}
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="min-h-14 border-b border-border/60 bg-card/90 backdrop-blur flex items-center gap-2 sm:gap-3 px-3 sm:px-4 md:px-6 sticky top-0 z-30 pt-[env(safe-area-inset-top)]">
          <button
            type="button"
            className="md:hidden min-h-11 min-w-11 -ml-2 inline-flex items-center justify-center text-foreground/80"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <div className="flex-1 min-w-0 py-2">
            <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.25em] text-muted-foreground truncate">
              {NAV.find((group) => group.items.some((item) => item.key === view))?.title ?? "Admin"}
            </p>
            <h1 className="font-display text-base md:text-lg truncate leading-tight">{active?.label ?? "Dashboard"}</h1>
          </div>
          <div className="hidden lg:flex items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-muted-foreground max-w-56 truncate">
            {userEmail}
          </div>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex min-h-11 items-center gap-2 text-[10px] uppercase tracking-[0.18em] border border-gold/60 text-gold px-3 py-2 hover:bg-gold hover:text-background transition-colors"
            title="Open live website"
          >
            <ExternalLink size={12} /> <span className="hidden xl:inline">Live Site</span>
          </a>
          <button
            type="button"
            onClick={signOut}
            className="inline-flex min-h-11 min-w-11 items-center justify-center sm:gap-2 text-[10px] uppercase tracking-[0.18em] border border-border/60 px-2 sm:px-3 py-2 hover:border-primary hover:text-primary"
            aria-label="Sign out"
          >
            <LogOut size={13} /> <span className="hidden xl:inline">Sign out</span>
          </button>
        </header>

        <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 max-w-full overflow-x-hidden">
          {content}
        </main>
      </div>
    </div>
  );
}
