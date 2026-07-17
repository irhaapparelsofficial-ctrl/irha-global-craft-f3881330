import { ReactNode, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Activity, BarChart3, BookKey, BookOpen, BriefcaseBusiness, ChevronDown, ChevronUp,
  Cpu, ExternalLink, Factory, FileText, Home, Images, Inbox, Layers, LayoutTemplate,
  ListChecks, LogOut, MapPin, Menu, MessageCircle, MessageSquare, Package, ScrollText,
  Search, Send, Settings, Share2, Sparkles, UserSearch, Users, Wrench, X,
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
import WhatsAppInboxPanel from "@/components/admin/WhatsAppInboxPanel";
import QuotationReadinessPanel from "@/components/admin/QuotationReadinessPanel";
import ProductionWorkflowPanel from "@/components/admin/ProductionWorkflowPanel";
import WebsiteEditorPanel from "@/components/admin/WebsiteEditorPanel";
import ContentCmsPanel from "@/components/admin/ContentCmsPanel";
import CatalogReleaseStatus from "@/components/admin/CatalogReleaseStatus";
import MultilingualSeoPanel from "@/components/admin/MultilingualSeoPanel";
import SeoReleaseReadiness from "@/components/admin/SeoReleaseReadiness";
import ProductionHealthPanel from "@/components/admin/ProductionHealthPanel";
import ReleaseHealthPanel from "@/components/admin/ReleaseHealthPanel";
import GoogleSearchCenter from "@/components/admin/GoogleSearchCenter";
import AIOperationsPlaybook from "@/components/admin/AIOperationsPlaybook";
import AIRulesEnforcementStatus from "@/components/admin/AIRulesEnforcementStatus";
import BusinessRulesPanel from "@/components/admin/BusinessRulesPanel";
import OutreachTemplateLibrary from "@/components/admin/OutreachTemplateLibrary";
import SocialContentPlaybook from "@/components/admin/SocialContentPlaybook";
import {
  PlainBuyersHub,
  PlainCatalogueHub,
  PlainInboxHub,
  PlainOwnerDashboard,
  PlainSalesHub,
} from "@/components/admin/PlainOwnerMode";

export type AdminView =
  | "overview" | "buyers" | "inbox" | "sales" | "catalogue_home" | "advanced_dashboard"
  | "products" | "media" | "categories" | "catalogues"
  | "website" | "content" | "seo"
  | "lead_engine" | "pipeline" | "buyer360" | "commercial" | "leads" | "chat" | "whatsapp" | "mailing"
  | "rules" | "ai"
  | "studio" | "pi" | "production" | "directory"
  | "social" | "devops" | "listings"
  | "traffic" | "gsc" | "macro"
  | "system";

type NavItem = { key: AdminView; label: string; description: string; icon: typeof Home };
type NavGroup = { title: string; items: NavItem[] };

const PLAIN_NAV: NavGroup[] = [{
  title: "Plain Owner Mode",
  items: [
    { key: "overview", label: "Dashboard", description: "See today’s important buyers, messages, follow-ups and approvals.", icon: Home },
    { key: "buyers", label: "Buyers", description: "Find, review, activate and contact wholesale buyers.", icon: Users },
    { key: "inbox", label: "Inbox", description: "Open live chat, RFQs, catalogue requests and email drafts.", icon: Inbox },
    { key: "sales", label: "Sales", description: "Manage follow-ups, quotations, samples, meetings and orders.", icon: BriefcaseBusiness },
    { key: "catalogue_home", label: "Catalogue", description: "Manage products, categories, images and PDF catalogues.", icon: BookOpen },
  ],
}];

const ADVANCED_NAV: NavGroup[] = [
  { title: "Full Dashboard", items: [
    { key: "advanced_dashboard", label: "All Reports & Automation", description: "Open the previous detailed dashboard, reports, activation and automation panels.", icon: BarChart3 },
  ] },
  { title: "Buyer Tools", items: [
    { key: "lead_engine", label: "Lead Research", description: "Create research campaigns and inspect detailed candidate evidence.", icon: UserSearch },
    { key: "pipeline", label: "Sales Pipeline", description: "Use the detailed buyer-stage and follow-up workspace.", icon: ListChecks },
    { key: "buyer360", label: "Buyer 360", description: "See complete buyer profiles, communication and history.", icon: Users },
    { key: "commercial", label: "Commercial Hub", description: "Open detailed quotations, samples, meetings and deals.", icon: BriefcaseBusiness },
    { key: "leads", label: "Inquiry Workspace", description: "Review website inquiries and catalogue requests with qualification tools.", icon: MessageSquare },
    { key: "chat", label: "AI Chat Records", description: "Review AI website-guide records. Human Live Chat is in Plain Inbox.", icon: MessageSquare },
    { key: "whatsapp", label: "WhatsApp Setup", description: "Use only after the business number and Cloud API are verified.", icon: MessageCircle },
    { key: "mailing", label: "Email & Follow-ups", description: "Open detailed outreach campaigns, drafts and approval controls.", icon: Send },
  ] },
  { title: "Catalogue Tools", items: [
    { key: "products", label: "Products", description: "Add, edit, review and publish products.", icon: Package },
    { key: "media", label: "Media Library", description: "Import and verify images, videos and reusable assets.", icon: Images },
    { key: "categories", label: "Categories", description: "Edit the complete product category structure.", icon: Layers },
    { key: "catalogues", label: "Catalogue Structure", description: "Review the live catalogue database and PDF links.", icon: BookOpen },
  ] },
  { title: "Website & Marketing", items: [
    { key: "website", label: "Website Pages", description: "Edit main website content without touching code.", icon: LayoutTemplate },
    { key: "content", label: "Blog, FAQs & Content", description: "Maintain buyer guides, FAQs and trust content.", icon: FileText },
    { key: "seo", label: "SEO Tools", description: "Review country, language, category and product search content.", icon: Search },
    { key: "listings", label: "Business Listings", description: "Track export directories and B2B profiles.", icon: ListChecks },
    { key: "social", label: "Social Content", description: "Prepare social posts and reels before publishing.", icon: Share2 },
    { key: "traffic", label: "Website Visitors", description: "Review consented website visitor activity.", icon: BarChart3 },
    { key: "gsc", label: "Google Search Console", description: "Review impressions, clicks and indexing evidence.", icon: Search },
  ] },
  { title: "Operations", items: [
    { key: "studio", label: "Pricing & Mockups", description: "Prepare mockups and estimate EXW or FOB pricing.", icon: Cpu },
    { key: "pi", label: "Quotation & PI Builder", description: "Create buyer-ready quotations and proforma invoices.", icon: ScrollText },
    { key: "production", label: "Production Workflow", description: "Track samples, production, quality and shipping readiness.", icon: Factory },
    { key: "directory", label: "Export Contacts", description: "Keep banks, chambers, freight and export-service contacts.", icon: MapPin },
    { key: "ai", label: "AI Business Assistant", description: "Use detailed AI operations and business-assistant tools.", icon: Sparkles },
  ] },
  { title: "System & Settings", items: [
    { key: "rules", label: "Approval Rules", description: "Control what AI may prepare and what needs owner approval.", icon: BookKey },
    { key: "devops", label: "Connections", description: "Review social platform and publishing connections.", icon: Activity },
    { key: "macro", label: "Market Rates", description: "Open advanced market and export-rate information.", icon: Layers },
    { key: "system", label: "System Health", description: "Check website, database and production-system health.", icon: Settings },
  ] },
];

const PLAIN_ITEMS = PLAIN_NAV.flatMap((group) => group.items);
const ADVANCED_ITEMS = ADVANCED_NAV.flatMap((group) => group.items);
const NAV_ITEMS = [...PLAIN_ITEMS, ...ADVANCED_ITEMS];
const PLAIN_VIEWS = new Set<AdminView>(PLAIN_ITEMS.map((item) => item.key));
const MOBILE_NAV: Array<{ key: AdminView; label: string; icon: typeof Home }> = [
  { key: "overview", label: "Dashboard", icon: Home },
  { key: "buyers", label: "Buyers", icon: Users },
  { key: "inbox", label: "Inbox", icon: Inbox },
  { key: "sales", label: "Sales", icon: BriefcaseBusiness },
  { key: "catalogue_home", label: "Catalogue", icon: BookOpen },
];

function groupTitle(view: AdminView) {
  if (PLAIN_VIEWS.has(view)) return "Plain Owner Mode";
  return ADVANCED_NAV.find((group) => group.items.some((item) => item.key === view))?.title ?? "Advanced Tools";
}

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
  const [advancedOpen, setAdvancedOpen] = useState(() => typeof window !== "undefined" && window.localStorage.getItem("irha-admin-advanced-open") === "true");
  const active = NAV_ITEMS.find((item) => item.key === view);
  const plainView = PLAIN_VIEWS.has(view);

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return PLAIN_ITEMS;
    return NAV_ITEMS.filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(query)).slice(0, 12);
  }, [searchQuery]);

  useEffect(() => { window.localStorage.setItem("irha-admin-advanced-open", String(advancedOpen)); }, [advancedOpen]);
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
  const openView = (nextView: AdminView) => {
    setView(nextView);
    setMobileOpen(false);
    setSearchOpen(false);
    setSearchQuery("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const renderGroup = (group: NavGroup, advanced = false) => (
    <div key={group.title} className={cn(advanced && "border-t border-border/40 pt-4")}>
      {!collapsed && <p className={cn("mb-2 px-3 text-[10px] uppercase tracking-[0.18em]", advanced ? "text-muted-foreground/55" : "text-muted-foreground/80")}>{group.title}</p>}
      <ul className="space-y-1">{group.items.map((item) => {
        const Icon = item.icon;
        const isActive = item.key === view;
        return <li key={item.key}><button type="button" onClick={() => openView(item.key)} className={cn("flex min-h-12 w-full items-center gap-3 rounded-md border-l-2 px-3 py-2.5 text-left text-sm transition-colors", isActive ? "border-primary bg-primary/10 text-primary" : "border-transparent text-foreground/75 hover:bg-muted/50 hover:text-foreground", collapsed && "justify-center px-2")} title={collapsed ? `${item.label}: ${item.description}` : item.description} aria-current={isActive ? "page" : undefined}><Icon size={17} className="shrink-0" />{!collapsed && <span className="truncate font-medium">{item.label}</span>}</button></li>;
      })}</ul>
    </div>
  );

  const nav = <nav className="flex-1 space-y-5 overflow-y-auto overscroll-contain px-2 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]" aria-label="Admin sections">
    {PLAIN_NAV.map((group) => renderGroup(group))}
    <div className="border-t border-border/50 pt-4">
      <button type="button" onClick={() => setAdvancedOpen((current) => !current)} className={cn("flex min-h-12 w-full items-center gap-3 rounded-md px-3 text-left text-sm text-muted-foreground hover:bg-muted/40 hover:text-foreground", collapsed && "justify-center px-2")} aria-expanded={advancedOpen}><Wrench size={17} className="shrink-0" />{!collapsed && <><span className="flex-1 font-medium">Advanced Tools</span>{advancedOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</>}</button>
      {advancedOpen && <div className="mt-4 space-y-5">{ADVANCED_NAV.map((group) => renderGroup(group, true))}</div>}
    </div>
  </nav>;

  const content = view === "overview"
    ? <PlainOwnerDashboard go={setView} />
    : view === "buyers"
      ? <PlainBuyersHub go={setView} />
      : view === "inbox"
        ? <PlainInboxHub go={setView} />
        : view === "sales"
          ? <PlainSalesHub go={setView} />
          : view === "catalogue_home"
            ? <PlainCatalogueHub go={setView} />
            : view === "advanced_dashboard"
              ? children
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
                                            ? <><ReleaseHealthPanel /><ProductionHealthPanel /></>
                                            : view === "rules"
                                              ? <BusinessRulesPanel />
                                              : view === "ai"
                                                ? <><AIRulesEnforcementStatus /><AIOperationsPlaybook />{children}</>
                                                : view === "mailing"
                                                  ? <><OutreachTemplateLibrary />{children}</>
                                                  : view === "social"
                                                    ? <><SocialContentPlaybook />{children}</>
                                                    : children;

  return <div className="flex min-h-screen bg-background text-foreground">
    <aside id="admin-desktop-navigation" className={cn("sticky top-0 hidden h-screen flex-col border-r border-border/60 bg-card/40 transition-[width] duration-200 md:flex", collapsed ? "w-16" : "w-64")}>
      <div className={cn("flex min-h-16 items-center border-b border-border/60 px-4", collapsed && "justify-center px-0")}>{!collapsed ? <div className="min-w-0 flex-1"><p className="truncate font-display text-sm tracking-wide text-gold">IRHA ADMIN</p><p className="truncate text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Plain Owner Mode</p></div> : <p className="font-display text-sm text-gold">IA</p>}<button type="button" onClick={() => setCollapsed((current) => !current)} className="inline-flex min-h-11 min-w-11 items-center justify-center text-muted-foreground hover:text-primary" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed} aria-controls="admin-desktop-navigation"><Menu size={16} /></button></div>
      {!collapsed && <div className="px-3 pt-3"><button type="button" onClick={() => setSearchOpen(true)} className="flex min-h-12 w-full items-center gap-3 rounded-md border border-border/60 bg-background/50 px-3 text-sm text-muted-foreground hover:border-gold/60 hover:text-foreground"><Search size={16} /><span className="flex-1 text-left">Find a page or tool</span><span className="rounded border border-border/60 px-1.5 py-0.5 text-[10px]">⌘K</span></button></div>}
      {nav}
    </aside>

    {mobileOpen && <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true" aria-label="Admin navigation"><button type="button" aria-label="Close menu" className="absolute inset-0 bg-background/85 backdrop-blur-sm" onClick={() => setMobileOpen(false)} /><aside id="admin-mobile-navigation" className="relative flex h-[100dvh] w-[min(20rem,90vw)] flex-col border-r border-border/60 bg-card shadow-2xl"><div className="flex min-h-16 items-center justify-between border-b border-border/60 px-4 pt-[env(safe-area-inset-top)]"><div className="min-w-0"><p className="truncate font-display text-sm text-gold">IRHA ADMIN</p><p className="truncate text-[9px] uppercase tracking-[0.15em] text-muted-foreground">Plain Owner Mode</p></div><button type="button" onClick={() => setMobileOpen(false)} className="inline-flex min-h-11 min-w-11 items-center justify-center text-muted-foreground" aria-label="Close menu"><X size={20} /></button></div><div className="border-b border-border/50 p-3"><button type="button" onClick={() => { setMobileOpen(false); setSearchOpen(true); }} className="flex min-h-12 w-full items-center gap-3 rounded-md border border-border/60 bg-background/50 px-3 text-sm text-muted-foreground"><Search size={17} /> Find anything in admin</button></div>{nav}</aside></div>}

    {searchOpen && <div className="fixed inset-0 z-[70] flex items-start justify-center p-3 pt-[max(5rem,env(safe-area-inset-top))] sm:p-6 sm:pt-24" role="dialog" aria-modal="true" aria-label="Find an admin page"><button type="button" aria-label="Close search" className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setSearchOpen(false)} /><div className="relative w-full max-w-2xl overflow-hidden rounded-xl border border-border/70 bg-card shadow-2xl"><div className="flex items-center gap-3 border-b border-border/60 px-4"><Search size={19} className="shrink-0 text-gold" /><input autoFocus value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Type buyers, live chat, quotation, products…" className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground" /><button type="button" onClick={() => setSearchOpen(false)} className="inline-flex min-h-11 min-w-11 items-center justify-center text-muted-foreground" aria-label="Close search"><X size={18} /></button></div><div className="max-h-[65vh] overflow-y-auto p-2">{searchResults.length === 0 ? <div className="p-6 text-center text-sm text-muted-foreground">No admin page matched that search.</div> : searchResults.map((item) => { const Icon = item.icon; return <button key={item.key} type="button" onClick={() => openView(item.key)} className="flex min-h-16 w-full items-start gap-3 rounded-lg px-3 py-3 text-left hover:bg-muted/50"><span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><Icon size={17} /></span><span className="min-w-0"><span className="block text-sm font-medium">{item.label}</span><span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{item.description}</span></span></button>; })}</div></div></div>}

    <div className="flex min-w-0 flex-1 flex-col">
      <header className="sticky top-0 z-30 flex min-h-16 items-center gap-2 border-b border-border/60 bg-card/90 px-3 pt-[env(safe-area-inset-top)] backdrop-blur sm:gap-3 sm:px-4 md:px-6"><button type="button" className="-ml-2 inline-flex min-h-11 min-w-11 items-center justify-center text-foreground/80 md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu" aria-expanded={mobileOpen} aria-controls="admin-mobile-navigation"><Menu size={20} /></button><div className="min-w-0 flex-1 py-2"><p className="truncate text-[9px] uppercase tracking-[0.16em] text-muted-foreground sm:text-[10px] sm:tracking-[0.2em]">{groupTitle(view)}</p><h1 className="truncate font-display text-base leading-tight md:text-lg">{active?.label ?? "Dashboard"}</h1></div><button type="button" onClick={() => setSearchOpen(true)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border/60 text-muted-foreground md:hidden" aria-label="Find an admin page"><Search size={17} /></button><div className="hidden max-w-56 items-center gap-2 truncate text-[9px] uppercase tracking-[0.16em] text-muted-foreground lg:flex">{userEmail}</div><a href="/" target="_blank" rel="noopener noreferrer" className="hidden min-h-11 items-center gap-2 rounded-md border border-gold/60 px-3 py-2 text-[10px] uppercase tracking-[0.15em] text-gold transition-colors hover:bg-gold hover:text-background sm:inline-flex" title="Open live website"><ExternalLink size={12} /><span className="hidden xl:inline">View Website</span></a><button type="button" onClick={signOut} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border/60 px-2 py-2 text-[10px] uppercase tracking-[0.15em] hover:border-primary hover:text-primary sm:gap-2 sm:px-3" aria-label="Sign out"><LogOut size={13} /><span className="hidden xl:inline">Sign out</span></button></header>
      <main id="admin-main" className="max-w-full flex-1 overflow-x-hidden p-3 pb-28 sm:p-4 sm:pb-28 md:p-6 md:pb-8 lg:p-8">{!plainView && <section className="mb-4 rounded-lg border border-border/60 bg-card/35 px-4 py-3 sm:mb-6" aria-label="Page guidance"><p className="text-sm font-medium">Advanced workspace</p><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{active?.description ?? "Use this detailed tool only when needed."}</p></section>}{content}</main>
    </div>

    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-card/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" aria-label="Quick admin navigation"><div className="grid grid-cols-5">{MOBILE_NAV.map((item) => { const Icon = item.icon; const isActive = item.key === view; return <button key={item.key} type="button" onClick={() => openView(item.key)} className={cn("flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium", isActive ? "text-gold" : "text-muted-foreground")} aria-current={isActive ? "page" : undefined}><Icon size={19} /><span className="w-full truncate text-center">{item.label}</span></button>; })}</div></nav>
  </div>;
}
