import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Activity,
  BarChart3,
  BookOpen,
  ExternalLink,
  FileText,
  Images,
  Inbox,
  Layers,
  MessageCircle,
  Package,
  Search,
} from "lucide-react";
import type { AdminView } from "./AdminShell";

type Counts = {
  newInquiries: number;
  newCatalogueRequests: number;
  waitingChats: number;
  productsPublished: number;
  productsTotal: number;
  categoriesPublished: number;
  categoriesTotal: number;
  mediaActive: number;
  recentVisitors: number;
};

const emptyCounts: Counts = {
  newInquiries: 0,
  newCatalogueRequests: 0,
  waitingChats: 0,
  productsPublished: 0,
  productsTotal: 0,
  categoriesPublished: 0,
  categoriesTotal: 0,
  mediaActive: 0,
  recentVisitors: 0,
};

async function safeCount(
  table: string,
  filter?: (query: ReturnType<typeof supabase.from>) => unknown,
): Promise<number> {
  try {
    // Every call is a fresh head-count; failures are swallowed so a single
    // missing/blocked table can never break the beginner dashboard.
    let query = supabase.from(table as never).select("*", { count: "exact", head: true });
    if (filter) query = filter(query) as typeof query;
    const { count, error } = await query;
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

export default function WebsiteOperationsDashboard({ go }: { go: (view: AdminView) => void }) {
  const [counts, setCounts] = useState<Counts>(emptyCounts);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const sinceIso = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      const [
        newInquiries,
        newCatalogueRequests,
        waitingChats,
        productsPublished,
        productsTotal,
        categoriesPublished,
        categoriesTotal,
        mediaActive,
        recentVisitors,
      ] = await Promise.all([
        safeCount("inquiries", (q) => (q as never as { eq: (c: string, v: string) => unknown }).eq("status", "new")),
        safeCount("catalogue_leads", (q) => (q as never as { eq: (c: string, v: string) => unknown }).eq("status", "new")),
        safeCount("chat_messages", (q) => (q as never as { gte: (c: string, v: string) => unknown }).gte("created_at", sinceIso)),
        safeCount("products", (q) => (q as never as { eq: (c: string, v: unknown) => unknown }).eq("published", true)),
        safeCount("products"),
        safeCount("categories", (q) => (q as never as { eq: (c: string, v: unknown) => unknown }).eq("published", true)),
        safeCount("categories"),
        safeCount("media_assets", (q) => (q as never as { eq: (c: string, v: string) => unknown }).eq("status", "active")),
        safeCount("page_views", (q) => (q as never as { gte: (c: string, v: string) => unknown }).gte("created_at", sinceIso)),
      ]);
      if (cancelled) return;
      setCounts({
        newInquiries,
        newCatalogueRequests,
        waitingChats,
        productsPublished,
        productsTotal,
        categoriesPublished,
        categoriesTotal,
        mediaActive,
        recentVisitors,
      });
      setLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const stat = (label: string, value: string | number, hint?: string, view?: AdminView, icon?: React.ReactNode) => (
    <button
      key={label}
      type="button"
      onClick={() => view && go(view)}
      className="text-left border border-border/60 bg-card/30 p-4 sm:p-5 min-h-32 hover:border-primary/60 transition-colors disabled:cursor-default"
      disabled={!view}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-gold">{icon}</span>
      </div>
      <p className="font-display text-3xl tabular-nums">{loading ? "—" : value}</p>
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-1">{label}</p>
      {hint && <p className="text-[10px] text-muted-foreground/70 mt-1">{hint}</p>}
    </button>
  );

  return (
    <div className="space-y-8">
      <section aria-label="Website operations at a glance">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Website operations · at a glance
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {stat("New inquiries", counts.newInquiries, "RFQs waiting", "inquiries", <Inbox size={16} />)}
          {stat("New catalogue requests", counts.newCatalogueRequests, "Requests waiting", "inquiries", <BookOpen size={16} />)}
          {stat("Live chats (last 7d)", counts.waitingChats, "Recent messages", "chat", <MessageCircle size={16} />)}
          {stat(
            "Products",
            `${counts.productsPublished} / ${counts.productsTotal}`,
            "Published / total",
            "products",
            <Package size={16} />,
          )}
          {stat(
            "Categories",
            `${counts.categoriesPublished} / ${counts.categoriesTotal}`,
            "Published / total",
            "categories",
            <Layers size={16} />,
          )}
          {stat("Active media assets", counts.mediaActive, "Ready for use", "media", <Images size={16} />)}
          {stat("Recent visitors (7d)", counts.recentVisitors, "Consented views", "traffic", <BarChart3 size={16} />)}
        </div>
      </section>

      <section aria-label="Primary website actions">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          What would you like to do?
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <ActionCard label="Open Inquiries" description="Review RFQs & catalogue requests." icon={<Inbox size={18} />} onClick={() => go("inquiries")} />
          <ActionCard label="Open Live Chat" description="Reply to website live chat." icon={<MessageCircle size={18} />} onClick={() => go("chat")} />
          <ActionCard label="Manage Products" description="Add, edit and publish products." icon={<Package size={18} />} onClick={() => go("products")} />
          <ActionCard label="Manage Media" description="Upload and verify images." icon={<Images size={18} />} onClick={() => go("media")} />
          <ActionCard label="Edit Website" description="Update pages and content." icon={<FileText size={18} />} onClick={() => go("content")} />
          <ActionCard label="SEO / Search" description="Manage SEO, sitemaps and search." icon={<Search size={18} />} onClick={() => go("seo")} />
          <ActionCard label="PDF Catalogues" description="Review PDF catalogues and links." icon={<BookOpen size={18} />} onClick={() => go("catalogues")} />
          <ActionCard label="System Health" description="Website & database health." icon={<Activity size={18} />} onClick={() => go("system")} />
          <a
            href="/"
            target="_blank"
            rel="noreferrer noopener"
            className="border border-gold/50 bg-card/30 p-4 hover:border-gold hover:bg-gold/5 transition-colors"
          >
            <div className="flex items-center gap-3 mb-2 text-gold">
              <ExternalLink size={18} />
              <p className="font-display text-sm">View Public Website</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">Open irhaapparels.com in a new tab.</p>
          </a>
        </div>
      </section>
    </div>
  );
}

function ActionCard({
  label,
  description,
  icon,
  onClick,
}: {
  label: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left border border-border/60 bg-card/30 p-4 hover:border-primary/60 hover:bg-primary/5 transition-colors"
    >
      <div className="flex items-center gap-3 mb-2 text-primary">
        {icon}
        <p className="font-display text-sm">{label}</p>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </button>
  );
}
