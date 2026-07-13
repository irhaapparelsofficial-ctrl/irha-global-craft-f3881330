import { ReactNode, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Home, Package, Layers, BookOpen, Search,
  Users, MessageSquare, MessageCircle, Send, Sparkles, Cpu, ScrollText,
  MapPin, Share2, Activity, Settings, LogOut, ExternalLink, Menu, X,
  BarChart3, ListChecks, UserSearch, BookKey, Factory, LayoutTemplate, FileText,
  BriefcaseBusiness,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ListingsPanel from "@/components/admin/ListingsPanel";
import ListingLaunchKit from "@/components/admin/ListingLaunchKit";
import LeadAcquisitionPanel from "@/components/admin/LeadAcquisitionPanel";
import LeadCampaignBlueprints from "@/components/admin/LeadCampaignBlueprints";
import BuyerQualificationOverview from "@/components/admin/BuyerQualificationOverview";
import BuyerReplyStudio from "@/components/admin/BuyerReplyStudio";
import SalesPipelinePanel from "@/components/admin/SalesPipelinePanel";
import Buyer360Panel from "@/components/admin/Buyer360Panel";
import CommercialHubPanel from "@/components/admin/CommercialHubPanel";
import DailyOwnerCommandCenter from "@/components/admin/DailyOwnerCommandCenter";
import WhatsAppInboxPanel from "@/components/admin/WhatsAppInboxPanel";
import QuotationReadinessPanel from "@/components/admin/QuotationReadinessPanel";
import ProductionWorkflowPanel from "@/components/admin/ProductionWorkflowPanel";
import WebsiteEditorPanel from "@/components/admin/WebsiteEditorPanel";
import ContentCmsPanel from "@/components/admin/ContentCmsPanel";
import CatalogReleaseStatus from "@/components/admin/CatalogReleaseStatus";
import MultilingualSeoPanel from "@/components/admin/MultilingualSeoPanel";
import SeoReleaseReadiness from "@/components/admin/SeoReleaseReadiness";
import ProductionHealthPanel from "@/components/admin/ProductionHealthPanel";
import GoogleSearchCenter from "@/components/admin/GoogleSearchCenter";
import AIOperationsPlaybook from "@/components/admin/AIOperationsPlaybook";
import AIRulesEnforcementStatus from "@/components/admin/AIRulesEnforcementStatus";
import BusinessRulesPanel from "@/components/admin/BusinessRulesPanel";
import OutreachTemplateLibrary from "@/components/admin/OutreachTemplateLibrary";
import SocialContentPlaybook from "@/components/admin/SocialContentPlaybook";

export type AdminView =
  | "overview"
  | "products" | "categories" | "catalogues"
  | "website" | "content" | "seo"
  | "lead_engine" | "pipeline" | "buyer360" | "commercial" | "leads" | "chat" | "whatsapp" | "mailing"
  | "rules" | "ai"
  | "studio" | "pi" | "production" | "directory"
  | "social" | "devops" | "listings"
  | "traffic" | "gsc" | "macro"
  | "system";

type NavItem = {
  key: AdminView;
  label: string;
  description: string;
  icon: typeof Home;
};

type NavGroup = {
  title: string;
  advanced?: boolean;
  items: NavItem[];
};

const NAV: NavGroup[] = [
  {
    title: "Home",
    items: [
      {
        key: "overview",
        label: "Today’s Work",
        description: "See what needs your attention today and open the next business task.",
        icon: Home,
      },
    ],
  },
  {
    title: "Customers",
    items: [
      { key: "pipeline", label: "Sales Progress", description: "Move buyers from new inquiry to quotation, sample, order, and follow-up.", icon: ListChecks },
      { key: "buyer360", label: "Customer Profiles", description: "See each buyer’s complete details, messages, quotations, meetings, and history.", icon: Users },
      { key: "commercial", label: "Quotations & Deals", description: "Manage quotations, samples, meetings, and commercial work in one place.", icon: BriefcaseBusiness },
      { key: "leads", label: "New Requests", description: "Read and respond to website inquiries and catalogue requests.", icon: Users },
      { key: "lead_engine", label: "Find New Buyers", description: "Discover and review potential wholesale buyers before adding them to the CRM.", icon: UserSearch },
      { key: "chat", label: "Website Chat", description: "Read messages sent through the live website chat.", icon: MessageSquare },
      { key: "whatsapp", label: "WhatsApp", description: "Manage WhatsApp conversations connected to buyer records.", icon: MessageCircle },
      { key: "mailing", label: "Email & Follow-ups", description: "Prepare outreach emails and follow-up messages with approval controls.", icon: Send },
    ],
  },
  {
    title: "Products",
    items: [
      { key: "products", label: "Products", description: "Add, edit, review, and publish products shown on the website.", icon: Package },
      { key: "categories", label: "Product Categories", description: "Organize products so buyers can find them easily.", icon: Layers },
      { key: "catalogues", label: "PDF Catalogues", description: "Manage downloadable catalogues and their website display.", icon: BookOpen },
    ],
  },
  {
    title: "Marketing",
    items: [
      { key: "website", label: "Website Pages", description: "Edit the main website content without touching code.", icon: LayoutTemplate },
      { key: "content", label: "Blog, FAQs & Content", description: "Create and maintain buyer education, trust content, blogs, and FAQs.", icon: FileText },
      { key: "seo", label: "Google SEO", description: "Prepare useful country, language, category, and product search content.", icon: Search },
      { key: "listings", label: "Business Listings", description: "Track Irha Apparels profiles on B2B directories and export platforms.", icon: ListChecks },
      { key: "social", label: "Social Posts", description: "Prepare and approve social posts and reels before publishing.", icon: Share2 },
      { key: "traffic", label: "Website Visitors", description: "See real consented visitor activity and popular pages.", icon: BarChart3 },
      { key: "gsc", label: "Google Search Results", description: "Review Google impressions, clicks, indexing, and page performance.", icon: Search },
    ],
  },
  {
    title: "Business Operations",
    items: [
      { key: "studio", label: "Pricing & Mockups", description: "Prepare product mockups and estimate EXW or FOB pricing.", icon: Cpu },
      { key: "pi", label: "Quotation & PI Builder", description: "Create buyer-ready quotations and proforma invoices.", icon: ScrollText },
      { key: "production", label: "Samples & Production", description: "Track samples, production stages, quality checks, and shipping readiness.", icon: Factory },
      { key: "directory", label: "Export Contacts", description: "Keep useful banks, chambers, freight, and export-service contacts together.", icon: MapPin },
      { key: "ai", label: "AI Business Assistant", description: "Ask the AI to explain work, prepare drafts, and help operate the admin.", icon: Sparkles },
    ],
  },
  {
    title: "System & Settings",
    advanced: true,
    items: [
      { key: "rules", label: "Approval Rules", description: "Control what AI may prepare and what always requires owner approval.", icon: BookKey },
      { key: "devops", label: "Social Connections", description: "Check whether social platform connections and publishing tools are healthy.", icon: Activity },
      { key: "macro", label: "Market Rates", description: "Review advanced market and export-rate information when available.", icon: Layers },
      { key: "system", label: "System Health", description: "Check website, database, deployment, and production-system health.", icon: Settings },
    ],
  },
];

const NAV_ITEMS = NAV.flatMap((group) => group.items);

const MOBILE_NAV: Array<{
  key: AdminView;
  label: string;
  icon: typeof Home;
  views: AdminView[];
}> = [
  { key: "overview", label: "Home", icon: Home, views: ["overview"] },
  {
    key: "pipeline",
    label: "Customers",
    icon: Users,
    views: ["pipeline", "buyer360", "commercial", "leads", "lead_engine", "chat", "whatsapp", "mailing"],
  },
  { key: "products", label: "Products", icon: Package, views: ["products", "categories", "catalogues"] },
  {
    key: "website",
    label: "Marketing",
    icon: Share2,
    views: ["website", "content", "seo", "listings", "social", "traffic", "gsc"],
  },
  {
    key: "production",
    label: "Operations",
    icon: BriefcaseBusiness,
    views: ["studio", "pi", "production", "directory", "ai", "rules", "devops", "macro", "system"],
  },
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const active = NAV_ITEMS.find((item) => item.key === view);

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return NAV_ITEMS.slice(0, 8);
    return NAV_ITEMS.filter((item) => (
      `${item.label} ${item.description}`.toLowerCase().includes(query)
    )).slice(0, 10);
  }, [searchQuery]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const openView = (nextView: AdminView) => {
    setView(nextView);
    setMobileOpen(false);
    setSearchOpen(false);
    setSearchQuery("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const nav = (
    <nav className="flex-1 overflow-y-auto overscroll-contain py-4 px-2 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-6" aria-label="Admin sections">
      {NAV.map((group) => (
        <div key={group.title} className={cn(group.advanced && "border-t border-border/50 pt-5")}>
          {!collapsed && (
            <p className={cn(
              "px-3 mb-2 text-[10px] uppercase tracking-[0.18em]",
              group.advanced ? "text-muted-foreground/55" : "text-muted-foreground/80",
            )}>
              {group.title}{group.advanced ? " · Advanced" : ""}
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
                    onClick={() => openView(item.key)}
                    className={cn(
                      "min-h-12 w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-md transition-colors text-left",
                      isActive
                        ? "bg-primary/10 text-primary border-l-2 border-primary"
                        : "text-foreground/75 hover:text-foreground hover:bg-muted/50 border-l-2 border-transparent",
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
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const content = view === "overview"
    ? <><DailyOwnerCommandCenter go={setView} />{children}</>
    : view === "commercial"
      ? <CommercialHubPanel />
      : view === "listings"
        ? <><ListingLaunchKit /><ListingsPanel /></>
        : view === "lead_engine"
          ? <><LeadCampaignBlueprints /><LeadAcquisitionPanel /></>
          : view === "pipeline"
            ? <SalesPipelinePanel />
            : view === "buyer360"
              ? <Buyer360Panel />
              : view === "leads"
                ? <><BuyerQualificationOverview /><BuyerReplyStudio />{children}</>
                : view === "whatsapp"
                  ? <WhatsAppInboxPanel />
                  : view === "pi"
                    ? <><QuotationReadinessPanel />{children}</>
                    : view === "production"
                      ? <ProductionWorkflowPanel />
                      : view === "products" || view === "categories"
                        ? <><CatalogReleaseStatus />{children}</>
                        : view === "website"
                          ? <WebsiteEditorPanel />
                          : view === "content"
                            ? <ContentCmsPanel />
                            : view === "seo"
                              ? <><SeoReleaseReadiness /><MultilingualSeoPanel /></>
                              : view === "gsc"
                                ? <GoogleSearchCenter />
                                : view === "system"
                                  ? <ProductionHealthPanel />
                                  : view === "rules"
                                    ? <BusinessRulesPanel />
                                    : view === "ai"
                                      ? <><AIRulesEnforcementStatus /><AIOperationsPlaybook />{children}</>
                                      : view === "mailing"
                                        ? <><OutreachTemplateLibrary />{children}</>
                                        : view === "social"
                                          ? <><SocialContentPlaybook />{children}</>
                                          : children;

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside
        id="admin-desktop-navigation"
        className={cn(
          "hidden md:flex sticky top-0 h-screen flex-col border-r border-border/60 bg-card/40 transition-[width] duration-200",
          collapsed ? "w-16" : "w-72",
        )}
      >
        <div className={cn("min-h-16 flex items-center border-b border-border/60 px-4", collapsed && "justify-center px-0")}>
          {!collapsed ? (
            <div className="flex-1 min-w-0">
              <p className="font-display text-sm tracking-wide text-gold truncate">IRHA ADMIN</p>
              <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground truncate">Beginner Mode · Real Business Data</p>
            </div>
          ) : (
            <p className="font-display text-gold text-sm">IA</p>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="min-h-11 min-w-11 inline-flex items-center justify-center text-muted-foreground hover:text-primary"
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
              className="min-h-12 w-full flex items-center gap-3 rounded-md border border-border/60 bg-background/50 px-3 text-sm text-muted-foreground hover:border-gold/60 hover:text-foreground"
            >
              <Search size={16} />
              <span className="flex-1 text-left">Find a page or tool</span>
              <span className="text-[10px] border border-border/60 rounded px-1.5 py-0.5">⌘K</span>
            </button>
          </div>
        )}
        {nav}
      </aside>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Admin navigation">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-background/85 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside id="admin-mobile-navigation" className="relative h-[100dvh] w-[min(20rem,90vw)] bg-card border-r border-border/60 flex flex-col shadow-2xl">
            <div className="min-h-16 flex items-center justify-between px-4 border-b border-border/60 pt-[env(safe-area-inset-top)]">
              <div className="min-w-0">
                <p className="font-display text-sm text-gold truncate">IRHA ADMIN</p>
                <p className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground truncate">Easy Business Control</p>
              </div>
              <button type="button" onClick={() => setMobileOpen(false)} className="min-h-11 min-w-11 inline-flex items-center justify-center text-muted-foreground" aria-label="Close menu"><X size={20} /></button>
            </div>
            <div className="p-3 border-b border-border/50">
              <button
                type="button"
                onClick={() => { setMobileOpen(false); setSearchOpen(true); }}
                className="min-h-12 w-full flex items-center gap-3 rounded-md border border-border/60 bg-background/50 px-3 text-sm text-muted-foreground"
              >
                <Search size={17} /> Find anything in admin
              </button>
            </div>
            {nav}
          </aside>
        </div>
      )}

      {searchOpen && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center p-3 pt-[max(5rem,env(safe-area-inset-top))] sm:p-6 sm:pt-24" role="dialog" aria-modal="true" aria-label="Find an admin page">
          <button type="button" aria-label="Close search" className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setSearchOpen(false)} />
          <div className="relative w-full max-w-2xl rounded-xl border border-border/70 bg-card shadow-2xl overflow-hidden">
            <div className="flex items-center gap-3 border-b border-border/60 px-4">
              <Search size={19} className="text-gold shrink-0" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Type products, customers, quotation, SEO…"
                className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
              />
              <button type="button" onClick={() => setSearchOpen(false)} className="min-h-11 min-w-11 inline-flex items-center justify-center text-muted-foreground" aria-label="Close search"><X size={18} /></button>
            </div>
            <div className="max-h-[65vh] overflow-y-auto p-2">
              {searchResults.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">No admin page matched that search.</div>
              ) : (
                searchResults.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => openView(item.key)}
                      className="w-full min-h-16 flex items-start gap-3 rounded-lg px-3 py-3 text-left hover:bg-muted/50"
                    >
                      <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0"><Icon size={17} /></span>
                      <span className="min-w-0">
                        <span className="block font-medium text-sm">{item.label}</span>
                        <span className="block text-xs text-muted-foreground leading-relaxed mt-0.5">{item.description}</span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="min-h-16 border-b border-border/60 bg-card/90 backdrop-blur flex items-center gap-2 sm:gap-3 px-3 sm:px-4 md:px-6 sticky top-0 z-30 pt-[env(safe-area-inset-top)]">
          <button
            type="button"
            className="md:hidden min-h-11 min-w-11 -ml-2 inline-flex items-center justify-center text-foreground/80"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            aria-controls="admin-mobile-navigation"
          >
            <Menu size={20} />
          </button>
          <div className="flex-1 min-w-0 py-2">
            <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.16em] sm:tracking-[0.2em] text-muted-foreground truncate">
              {NAV.find((group) => group.items.some((item) => item.key === view))?.title ?? "Admin"}
            </p>
            <h1 className="font-display text-base md:text-lg truncate leading-tight">{active?.label ?? "Today’s Work"}</h1>
          </div>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="md:hidden min-h-11 min-w-11 inline-flex items-center justify-center border border-border/60 rounded-md text-muted-foreground"
            aria-label="Find an admin page"
          >
            <Search size={17} />
          </button>
          <div className="hidden lg:flex items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-muted-foreground max-w-56 truncate">
            {userEmail}
          </div>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex min-h-11 items-center gap-2 text-[10px] uppercase tracking-[0.15em] border border-gold/60 text-gold px-3 py-2 hover:bg-gold hover:text-background transition-colors rounded-md"
            title="Open live website"
          >
            <ExternalLink size={12} /> <span className="hidden xl:inline">View Website</span>
          </a>
          <button
            type="button"
            onClick={signOut}
            className="inline-flex min-h-11 min-w-11 items-center justify-center sm:gap-2 text-[10px] uppercase tracking-[0.15em] border border-border/60 px-2 sm:px-3 py-2 hover:border-primary hover:text-primary rounded-md"
            aria-label="Sign out"
          >
            <LogOut size={13} /> <span className="hidden xl:inline">Sign out</span>
          </button>
        </header>

        <main id="admin-main" className="flex-1 p-3 pb-28 sm:p-4 sm:pb-28 md:p-6 md:pb-8 lg:p-8 max-w-full overflow-x-hidden">
          <section className="mb-4 sm:mb-6 rounded-lg border border-border/60 bg-card/35 px-4 py-3" aria-label="Page guidance">
            <p className="text-sm font-medium">What this page is for</p>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{active?.description ?? "Review today’s work and choose the next action."}</p>
          </section>
          {content}
        </main>
      </div>

      <nav className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-card/95 backdrop-blur px-1 pb-[env(safe-area-inset-bottom)]" aria-label="Quick admin navigation">
        <div className="grid grid-cols-5">
          {MOBILE_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = item.views.includes(view);
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => openView(item.key)}
                className={cn(
                  "min-h-16 flex flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium",
                  isActive ? "text-gold" : "text-muted-foreground",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon size={19} />
                <span className="truncate w-full text-center">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
