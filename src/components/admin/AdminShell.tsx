import { ReactNode, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Home, Package, Layers, BookOpen, FileText, Search, Link2,
  Users, MessageSquare, Send, Sparkles, Cpu, ScrollText,
  MapPin, Share2, Activity, Settings, LogOut, ExternalLink, Menu, X,
  BarChart3, ListChecks,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ListingsPanel from "@/components/admin/ListingsPanel";

export type AdminView =
  | "overview"
  | "products" | "categories" | "catalogues"
  | "blog" | "faqs" | "seo" | "links"
  | "leads" | "inquiries" | "chat" | "mailing"
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
    { key: "blog", label: "Blog", icon: FileText },
    { key: "faqs", label: "FAQs", icon: FileText },
    { key: "seo", label: "SEO", icon: Search },
    { key: "links", label: "Internal Links", icon: Link2 },
  ]},
  { title: "Leads & Communication", items: [
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
    { key: "social", label: "Social", icon: Share2 },
    { key: "devops", label: "Social Sync / DevOps", icon: Activity },
    { key: "traffic", label: "Traffic", icon: BarChart3 },
    { key: "gsc", label: "Google Search", icon: Search },
  ]},
  { title: "System", items: [
    { key: "macro", label: "Macro Gateway", icon: Layers },
    { key: "system", label: "System Status", icon: Settings },
  ]},
];

export function AdminShell({
  view, setView, userEmail, children,
}: {
  view: AdminView;
  setView: (v: AdminView) => void;
  userEmail: string | null | undefined;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const active = NAV.flatMap((g) => g.items).find((i) => i.key === view);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const nav = (
    <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
      {NAV.map((group) => (
        <div key={group.title}>
          {!collapsed && (
            <p className="px-3 mb-2 text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70">
              {group.title}
            </p>
          )}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = item.key === view;
              return (
                <li key={item.key}>
                  <button
                    onClick={() => { setView(item.key); setMobileOpen(false); }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-sm transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary border-l-2 border-primary"
                        : "text-foreground/70 hover:text-foreground hover:bg-muted/40 border-l-2 border-transparent",
                      collapsed && "justify-center px-2"
                    )}
                    title={collapsed ? item.label : undefined}
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

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-border/60 bg-card/30 transition-[width] duration-200",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div className={cn("h-14 flex items-center border-b border-border/60 px-4", collapsed && "justify-center px-0")}>
          {!collapsed ? (
            <div className="flex-1">
              <p className="font-display text-sm tracking-wide text-gold">IRHA ADMIN</p>
              <p className="text-[9px] uppercase tracking-[0.25em] text-muted-foreground">Control Core</p>
            </div>
          ) : (
            <p className="font-display text-gold text-sm">IA</p>
          )}
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="text-muted-foreground hover:text-primary p-1"
            aria-label="Toggle sidebar"
          >
            <Menu size={16} />
          </button>
        </div>
        {nav}
      </aside>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 max-w-[85%] bg-card border-r border-border/60 flex flex-col">
            <div className="h-14 flex items-center justify-between px-4 border-b border-border/60">
              <p className="font-display text-sm text-gold">IRHA ADMIN</p>
              <button onClick={() => setMobileOpen(false)} className="p-1 text-muted-foreground"><X size={18} /></button>
            </div>
            {nav}
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 border-b border-border/60 bg-card/20 backdrop-blur flex items-center gap-3 px-4 md:px-6 sticky top-0 z-30">
          <button
            className="md:hidden p-2 -ml-2 text-foreground/80"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground truncate">
              {NAV.find((g) => g.items.some((i) => i.key === view))?.title ?? "Admin"}
            </p>
            <h1 className="font-display text-base md:text-lg truncate leading-tight">{active?.label ?? "Dashboard"}</h1>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {userEmail}
          </div>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] border border-gold/60 text-gold px-3 py-2 hover:bg-gold hover:text-background transition-colors"
            title="Open live website"
          >
            <ExternalLink size={12} /> <span className="hidden lg:inline">Live Site</span>
          </a>
          <button
            onClick={signOut}
            className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] border border-border/60 px-3 py-2 hover:border-primary hover:text-primary"
          >
            <LogOut size={12} /> <span className="hidden sm:inline">Sign out</span>
          </button>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-full overflow-x-hidden">
          {view === "listings" ? <ListingsPanel /> : children}
        </main>
      </div>
    </div>
  );
}
