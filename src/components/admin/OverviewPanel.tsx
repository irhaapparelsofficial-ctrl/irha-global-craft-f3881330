import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Package, Layers, Users, Inbox, MessageSquare, BarChart3, FileText, HelpCircle, Sparkles, Plus, ExternalLink } from "lucide-react";
import type { AdminView } from "./AdminShell";
import PasskeySetupBanner from "./PasskeySetupBanner";

type Counts = {
  products: number; categories: number; inquiries: number; leads: number;
  chat: number; views: number; blog: number; faqs: number;
};

type Inquiry = { id: string; name: string; email: string; company: string | null; created_at: string; status: string };
type PageView = { path: string };

export default function OverviewPanel({ go }: { go: (v: AdminView) => void }) {
  const [c, setC] = useState<Counts | null>(null);
  const [recent, setRecent] = useState<Inquiry[]>([]);
  const [topPaths, setTopPaths] = useState<[string, number][]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const head = (t: string) =>
        supabase.from(t as never).select("*", { count: "exact", head: true });
      const [p, c1, i, l, ch, v, b, f, recentQ, viewsQ] = await Promise.all([
        head("products"), head("categories"), head("inquiries"),
        head("catalogue_leads"), head("chat_messages"), head("page_views"),
        head("blog_posts"), head("faqs"),
        supabase.from("inquiries").select("id,name,email,company,created_at,status").order("created_at", { ascending: false }).limit(5),
        supabase.from("page_views").select("path").order("created_at", { ascending: false }).limit(500),
      ]);
      setC({
        products: p.count ?? 0, categories: c1.count ?? 0, inquiries: i.count ?? 0,
        leads: l.count ?? 0, chat: ch.count ?? 0, views: v.count ?? 0,
        blog: b.count ?? 0, faqs: f.count ?? 0,
      });
      setRecent((recentQ.data as Inquiry[]) ?? []);
      const tally: Record<string, number> = {};
      ((viewsQ.data as PageView[]) ?? []).forEach((r) => { tally[r.path] = (tally[r.path] ?? 0) + 1; });
      setTopPaths(Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 8));
      setLoading(false);
    })();
  }, []);

  const stats = [
    { label: "Products", value: c?.products, icon: Package, view: "products" as AdminView },
    { label: "Categories", value: c?.categories, icon: Layers, view: "categories" as AdminView },
    { label: "Inquiries", value: c?.inquiries, icon: Inbox, view: "inquiries" as AdminView },
    { label: "Catalogue leads", value: c?.leads, icon: Users, view: "leads" as AdminView },
    { label: "Chat messages", value: c?.chat, icon: MessageSquare, view: "chat" as AdminView },
    { label: "Page views", value: c?.views, icon: BarChart3, view: "traffic" as AdminView },
    { label: "Blog posts", value: c?.blog, icon: FileText, view: "blog" as AdminView },
    { label: "FAQs", value: c?.faqs, icon: HelpCircle, view: "faqs" as AdminView },
  ];

  return (
    <div className="space-y-8">
      <PasskeySetupBanner />

      <div className="flex flex-wrap gap-2">
        <QuickAction label="Add product" icon={<Plus size={12} />} onClick={() => go("products")} />
        <QuickAction label="Add category" icon={<Plus size={12} />} onClick={() => go("categories")} />
        <QuickAction label="View leads" icon={<Users size={12} />} onClick={() => go("leads")} />
        <QuickAction label="AI Assistant" icon={<Sparkles size={12} />} onClick={() => go("ai")} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <button
            key={s.label}
            onClick={() => go(s.view)}
            className="text-left border border-border/60 bg-card/30 p-5 hover:border-primary/60 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <s.icon size={16} className="text-gold" />
            </div>
            <p className="font-display text-3xl tabular-nums">
              {loading ? "—" : (s.value ?? 0).toLocaleString()}
            </p>
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mt-1">{s.label}</p>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="border border-border/60 bg-card/30 p-5">
          <p className="eyebrow mb-4">Recent inquiries</p>
          {loading ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : recent.length === 0 ? (
            <p className="text-xs text-muted-foreground">No inquiries yet.</p>
          ) : (
            <ul className="space-y-3">
              {recent.map((r) => (
                <li key={r.id} className="flex items-start justify-between gap-3 text-sm border-b border-border/40 pb-2 last:border-0">
                  <div className="min-w-0">
                    <p className="truncate">{r.name} <span className="text-muted-foreground text-xs">· {r.company ?? r.email}</span></p>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-0.5">{new Date(r.created_at).toLocaleString()}</p>
                  </div>
                  {r.status === "new" && <span className="text-[9px] uppercase tracking-[0.2em] bg-primary text-primary-foreground px-2 py-0.5 shrink-0">New</span>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border border-border/60 bg-card/30 p-5">
          <p className="eyebrow mb-4">Top viewed pages · last 500 views</p>
          {loading ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : topPaths.length === 0 ? (
            <p className="text-xs text-muted-foreground">No traffic data yet.</p>
          ) : (
            <ul className="space-y-2">
              {topPaths.map(([path, n]) => {
                const max = topPaths[0][1];
                return (
                  <li key={path} className="text-xs">
                    <div className="flex justify-between gap-3 mb-1">
                      <a href={path} target="_blank" rel="noreferrer" className="truncate hover:text-primary inline-flex items-center gap-1">
                        {path} <ExternalLink size={9} className="shrink-0 opacity-50" />
                      </a>
                      <span className="text-muted-foreground tabular-nums shrink-0">{n}</span>
                    </div>
                    <div className="h-1 bg-secondary/60 rounded-sm overflow-hidden">
                      <div className="h-full bg-gradient-gold" style={{ width: `${(n / max) * 100}%` }} />
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
      className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] border border-gold/50 text-gold px-3 py-2 hover:bg-gold hover:text-background transition-colors"
    >
      {icon} {label}
    </button>
  );
}
