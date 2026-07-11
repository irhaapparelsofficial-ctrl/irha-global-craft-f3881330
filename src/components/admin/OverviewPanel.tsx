import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Package, Layers, Users, Inbox, MessageSquare, BarChart3, Sparkles, Plus, ExternalLink, Activity } from "lucide-react";
import type { AdminView } from "./AdminShell";
import SalesActionCenter from "./SalesActionCenter";

type Counts = {
  products: number;
  categories: number;
  inquiries: number;
  catalogue: number;
  chat: number;
  views: number;
};

type InquiryRow = { id: string; name: string; email: string; company: string | null; created_at: string; status: string };
type PageViewRow = { path: string };

function normalizeTrafficPath(value: string) {
  const raw = (value || "/").split("?")[0].split("#")[0];
  if (!raw || raw === "/") return "/";
  const normalized = raw.replace(/\/{2,}/g, "/").replace(/\/$/, "");
  return normalized || "/";
}

export default function OverviewPanel({ go }: { go: (view: AdminView) => void }) {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [recent, setRecent] = useState<InquiryRow[]>([]);
  const [topPaths, setTopPaths] = useState<[string, number][]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const head = (table: string) =>
        supabase.from(table as never).select("*", { count: "exact", head: true });
      const [products, categories, inquiries, catalogue, chat, views, recentQuery, viewsQuery] = await Promise.all([
        head("products"),
        head("categories"),
        head("inquiries"),
        head("catalogue_leads"),
        head("chat_messages"),
        head("page_views"),
        supabase.from("inquiries").select("id,name,email,company,created_at,status").order("created_at", { ascending: false }).limit(5),
        supabase.from("page_views").select("path").order("created_at", { ascending: false }).limit(500),
      ]);
      setCounts({
        products: products.count ?? 0,
        categories: categories.count ?? 0,
        inquiries: inquiries.count ?? 0,
        catalogue: catalogue.count ?? 0,
        chat: chat.count ?? 0,
        views: views.count ?? 0,
      });
      setRecent((recentQuery.data as InquiryRow[]) ?? []);
      const tally: Record<string, number> = {};
      ((viewsQuery.data as PageViewRow[]) ?? []).forEach((row) => {
        const path = normalizeTrafficPath(row.path);
        if (path.startsWith("/admin") || path.startsWith("/auth")) return;
        tally[path] = (tally[path] ?? 0) + 1;
      });
      setTopPaths(Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 8));
      setLoading(false);
    })();
  }, []);

  const stats = [
    { label: "Products", value: counts?.products, icon: Package, view: "products" as AdminView },
    { label: "Categories", value: counts?.categories, icon: Layers, view: "categories" as AdminView },
    { label: "RFQ & inquiries", value: counts?.inquiries, icon: Inbox, view: "leads" as AdminView },
    { label: "Catalogue requests", value: counts?.catalogue, icon: Users, view: "leads" as AdminView },
    { label: "Chat messages", value: counts?.chat, icon: MessageSquare, view: "chat" as AdminView },
    { label: "Page views", value: counts?.views, icon: BarChart3, view: "traffic" as AdminView },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2">
        <QuickAction label="Add product" icon={<Plus size={12} />} onClick={() => go("products")} />
        <QuickAction label="Add category" icon={<Plus size={12} />} onClick={() => go("categories")} />
        <QuickAction label="Buyer Inbox" icon={<Users size={12} />} onClick={() => go("leads")} />
        <QuickAction label="AI Assistant" icon={<Sparkles size={12} />} onClick={() => go("ai")} />
        <QuickAction label="Production Health" icon={<Activity size={12} />} onClick={() => go("system")} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map((stat) => (
          <button
            key={stat.label}
            onClick={() => go(stat.view)}
            className="text-left border border-border/60 bg-card/30 p-4 sm:p-5 hover:border-primary/60 transition-colors min-h-32"
          >
            <div className="flex items-center justify-between mb-3">
              <stat.icon size={16} className="text-gold" />
            </div>
            <p className="font-display text-3xl tabular-nums">
              {loading ? "—" : (stat.value ?? 0).toLocaleString()}
            </p>
            <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.25em] text-muted-foreground mt-1 leading-relaxed">{stat.label}</p>
          </button>
        ))}
      </div>

      <SalesActionCenter go={go} />

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="border border-border/60 bg-card/30 p-5">
          <p className="eyebrow mb-4">Recent inquiries</p>
          {loading ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : recent.length === 0 ? (
            <div className="py-6 text-center border border-dashed border-border/50">
              <Inbox size={20} className="mx-auto text-gold/70 mb-2" />
              <p className="text-sm">No buyer inquiry has been received yet.</p>
              <p className="text-xs text-muted-foreground mt-2">New RFQ, sample, catalogue and repeat-order requests will appear here.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {recent.map((row) => (
                <li key={row.id} className="flex items-start justify-between gap-3 text-sm border-b border-border/40 pb-2 last:border-0">
                  <div className="min-w-0">
                    <p className="truncate">{row.name} <span className="text-muted-foreground text-xs">· {row.company ?? row.email}</span></p>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-0.5">{new Date(row.created_at).toLocaleString()}</p>
                  </div>
                  {row.status === "new" && <span className="text-[9px] uppercase tracking-[0.2em] bg-primary text-primary-foreground px-2 py-0.5 shrink-0">New</span>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border border-border/60 bg-card/30 p-5">
          <p className="eyebrow mb-1">Top viewed pages</p>
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-4">Last 500 consented views · query strings combined</p>
          {loading ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : topPaths.length === 0 ? (
            <p className="text-xs text-muted-foreground">No traffic data yet.</p>
          ) : (
            <ul className="space-y-2">
              {topPaths.map(([path, count]) => {
                const max = topPaths[0][1];
                return (
                  <li key={path} className="text-xs">
                    <div className="flex justify-between gap-3 mb-1">
                      <a href={path} target="_blank" rel="noreferrer" className="truncate hover:text-primary inline-flex items-center gap-1">
                        {path} <ExternalLink size={9} className="shrink-0 opacity-50" />
                      </a>
                      <span className="text-muted-foreground tabular-nums shrink-0">{count}</span>
                    </div>
                    <div className="h-1 bg-secondary/60 rounded-sm overflow-hidden">
                      <div className="h-full bg-gradient-gold" style={{ width: `${(count / max) * 100}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function QuickAction({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex min-h-11 items-center gap-2 text-[10px] uppercase tracking-[0.2em] border border-gold/50 text-gold px-3 py-2 hover:bg-gold hover:text-background transition-colors"
    >
      {icon} {label}
    </button>
  );
}
