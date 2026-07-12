import { useCallback, useEffect, useState } from "react";
import { BookOpen, Database, HelpCircle, History, Link2, RefreshCw, SearchCheck, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import BlogContentPanel from "./content/BlogContentPanel";
import FaqContentPanel from "./content/FaqContentPanel";
import SeoOverridesPanel from "./content/SeoOverridesPanel";
import InternalLinksPanel from "./content/InternalLinksPanel";
import type { ContentAuditRow, ContentHealth } from "./content/contentCmsTypes";
import { entityLabel, isMissingSchemaError } from "./content/contentCmsTypes";

const db = supabase as any;
type Tab = "blog" | "faq" | "seo" | "links";

const tabs: Array<{ key: Tab; label: string; icon: typeof BookOpen }> = [
  { key: "blog", label: "Blog", icon: BookOpen },
  { key: "faq", label: "FAQ", icon: HelpCircle },
  { key: "seo", label: "SEO Overrides", icon: SearchCheck },
  { key: "links", label: "Internal Links", icon: Link2 },
];

export default function ContentCmsPanel() {
  const [tab, setTab] = useState<Tab>("blog");
  const [health, setHealth] = useState<ContentHealth | null>(null);
  const [audit, setAudit] = useState<ContentAuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    const [healthResult, auditResult] = await Promise.all([
      db.rpc("content_get_admin_health"),
      db.from("content_change_log")
        .select("id,entity_type,entity_id,action,before_data,after_data,created_at")
        .order("created_at", { ascending: false })
        .limit(12),
    ]);
    setHealth((healthResult.data as ContentHealth | null) || null);
    setAudit((auditResult.data as ContentAuditRow[] | null) || []);
    setError(healthResult.error?.message || auditResult.error?.message || null);
    setLoading(false);
  }, []);

  useEffect(() => { void loadSummary(); }, [loadSummary]);

  return (
    <div className="space-y-6">
      <section className="border border-gold/35 bg-gold/[0.04] p-5 md:p-7">
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
          <div className="flex items-start gap-3 min-w-0">
            <Database className="text-gold shrink-0 mt-1" size={22} />
            <div>
              <p className="eyebrow mb-2">Phase 2 · Content CMS</p>
              <h2 className="font-display text-2xl md:text-4xl">Content & SEO Library</h2>
              <p className="mt-3 text-sm text-foreground/65 leading-relaxed max-w-3xl">
                Manage buyer journal articles, FAQ answers, page-level SEO overrides and route-specific internal links. Drafts remain private and public pages retain safe code fallbacks until the final one-time database activation.
              </p>
            </div>
          </div>
          <button type="button" onClick={() => void loadSummary()} disabled={loading} className="min-h-11 inline-flex items-center justify-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.18em] hover:border-gold hover:text-gold disabled:opacity-50">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh workspace
          </button>
        </div>

        <div className="mt-5 flex items-start gap-2 border border-emerald-500/30 bg-emerald-500/[0.05] p-3 text-xs text-foreground/70 leading-relaxed">
          <ShieldCheck size={15} className="text-emerald-500 shrink-0 mt-0.5" />
          <p>Migration execution is deferred. This batch stores deployment-ready backend migrations in GitHub; no external database is contacted or modified during development.</p>
        </div>

        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-2">
          <Metric label="Articles" value={health ? `${health.publishedBlogCount}/${health.blogCount}` : "—"} />
          <Metric label="FAQ answers" value={health ? `${health.publishedFaqCount}/${health.faqCount}` : "—"} />
          <Metric label="SEO overrides" value={health ? `${health.publishedSeoOverrideCount}/${health.seoOverrideCount}` : "—"} />
          <Metric label="Internal links" value={health ? `${health.publishedInternalLinkCount}/${health.internalLinkCount}` : "—"} />
        </div>
      </section>

      {error && (
        <section className="border border-amber-500/40 bg-amber-500/[0.06] p-4 text-xs text-foreground/70">
          <p className="font-medium text-amber-300">{isMissingSchemaError({ message: error }) ? "CMS database activation is pending" : "CMS health could not load"}</p>
          <p className="mt-1 break-words">{error}</p>
        </section>
      )}

      <section className="border border-border/60 bg-card/20">
        <div className="flex overflow-x-auto border-b border-border/60" role="tablist" aria-label="Content CMS sections">
          {tabs.map((item) => {
            const Icon = item.icon;
            const active = tab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(item.key)}
                className={`min-h-12 shrink-0 inline-flex items-center gap-2 px-4 md:px-5 text-[10px] uppercase tracking-[0.17em] border-b-2 ${active ? "border-gold text-gold bg-gold/[0.05]" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                <Icon size={14} />{item.label}
              </button>
            );
          })}
        </div>
        <div className="p-4 md:p-6">
          {tab === "blog" && <BlogContentPanel onChanged={() => void loadSummary()} />}
          {tab === "faq" && <FaqContentPanel onChanged={() => void loadSummary()} />}
          {tab === "seo" && <SeoOverridesPanel onChanged={() => void loadSummary()} />}
          {tab === "links" && <InternalLinksPanel onChanged={() => void loadSummary()} />}
        </div>
      </section>

      <section className="border border-border/60 bg-card/20 p-4 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <History size={15} className="text-gold" />
          <h3 className="font-display text-xl">Recent content audit</h3>
        </div>
        {audit.length === 0 ? (
          <p className="text-xs text-muted-foreground">Audit records will appear after the final migration and the first admin content change.</p>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-2">
            {audit.map((row) => (
              <div key={row.id} className="border border-border/40 p-3 min-w-0">
                <p className="text-[9px] uppercase tracking-[0.15em] text-gold capitalize">{row.action} · {row.entity_type.replaceAll("_", " ")}</p>
                <p className="text-xs mt-1 truncate" title={entityLabel(row)}>{entityLabel(row)}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{new Date(row.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border/50 bg-background/35 p-3 min-w-0">
      <p className="text-[8px] uppercase tracking-[0.15em] text-muted-foreground truncate">{label}</p>
      <p className="font-display text-xl mt-1 truncate">{value}</p>
      <p className="text-[9px] text-muted-foreground mt-1">published / total</p>
    </div>
  );
}
