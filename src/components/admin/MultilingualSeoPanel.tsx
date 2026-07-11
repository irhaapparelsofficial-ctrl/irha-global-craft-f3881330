import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  FileSearch,
  Globe2,
  Languages,
  Loader2,
  RefreshCw,
  Save,
  Search,
  Send,
  Sparkles,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type Tab = "locales" | "keywords" | "pages";
type LocaleStatus = "planned" | "active" | "paused" | "retired";
type ClusterStatus = "draft" | "reviewed" | "approved" | "rejected" | "archived";
type PageStatus = "draft" | "ai_reviewed" | "approved" | "published" | "rejected" | "archived";

type SeoLocale = {
  locale: string;
  language_name: string;
  native_name: string;
  direction: "ltr" | "rtl";
  target_markets: string[];
  status: LocaleStatus;
  priority: number;
  requires_native_review: boolean;
  notes: string | null;
  updated_at: string;
};

type KeywordCluster = {
  id: string;
  locale: string;
  cluster_name: string;
  search_intent: string;
  market: string | null;
  product_focus: string[];
  seed_keywords: string[];
  primary_keywords: string[];
  supporting_keywords: string[];
  questions: string[];
  negative_keywords: string[];
  source_notes: Record<string, unknown>;
  status: ClusterStatus;
  created_at: string;
};

type LocalizedPage = {
  id: string;
  locale: string;
  base_route: string;
  slug: string;
  path: string;
  page_type: string;
  status: PageStatus;
  source_title: string | null;
  source_summary: string | null;
  seo_title: string;
  seo_description: string;
  h1: string;
  eyebrow: string | null;
  intro: string;
  sections: unknown[];
  faqs: unknown[];
  cta: Record<string, unknown>;
  keyword_cluster_ids: string[];
  internal_links: unknown[];
  quality_score: number;
  quality_report: Record<string, unknown>;
  native_review_status: string;
  noindex: boolean;
  approved_at: string | null;
  published_at: string | null;
  updated_at: string;
};

type Health = {
  ok?: boolean;
  database_ready?: boolean;
  ai_gateway_configured?: boolean;
  ready_to_generate?: boolean;
  locale_count?: number;
  active_locale_count?: number;
  published_page_count?: number;
  publish_score_required?: number;
  search_volume_source?: string;
  note?: string;
  error?: string;
};

type KeywordDraft = {
  locale: string;
  market: string;
  productFocus: string;
  seeds: string;
  clusterCount: number;
};

type PageDraft = {
  locale: string;
  baseRoute: string;
  pageType: string;
  sourceTitle: string;
  sourceSummary: string;
  productFocus: string;
  slug: string;
  clusterIds: string[];
};

type PageEdit = {
  seoTitle: string;
  seoDescription: string;
  h1: string;
  eyebrow: string;
  intro: string;
  sectionsJson: string;
  faqsJson: string;
  ctaJson: string;
  linksJson: string;
};

const initialKeywordDraft: KeywordDraft = {
  locale: "de-DE",
  market: "Germany",
  productFocus: "Lederhosen, Dirndl, Trachten clothing, private-label apparel",
  seeds: "Lederhosen Hersteller, Dirndl Großhandel, Trachten Produzent",
  clusterCount: 4,
};

const initialPageDraft: PageDraft = {
  locale: "de-DE",
  baseRoute: "/products/bavarian-trachten-wear",
  pageType: "commercial_landing",
  sourceTitle: "Bavarian & Trachten Wear Manufacturing",
  sourceSummary: "Irha Apparels is an experienced B2B apparel manufacturer in Sialkot, Pakistan. We support custom Bavarian and Trachten programs, OEM/ODM and private-label development. Buyers share requirements for a tailored quotation. MOQ, production timing, documentation and shipping are confirmed after requirement review. A live factory video call is available.",
  productFocus: "Lederhosen, Dirndl, Trachten wear",
  slug: "",
  clusterIds: [],
};

const localeStatusStyle: Record<LocaleStatus, string> = {
  planned: "border-border/60 text-muted-foreground",
  active: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10",
  paused: "border-amber-500/40 text-amber-300 bg-amber-500/10",
  retired: "border-red-500/40 text-red-300 bg-red-500/10",
};

const pageStatusStyle: Record<PageStatus, string> = {
  draft: "border-border/60 text-muted-foreground",
  ai_reviewed: "border-blue-500/40 text-blue-300 bg-blue-500/10",
  approved: "border-amber-500/40 text-amber-300 bg-amber-500/10",
  published: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10",
  rejected: "border-red-500/40 text-red-300 bg-red-500/10",
  archived: "border-slate-500/40 text-slate-300 bg-slate-500/10",
};

const db = supabase as any;

export default function MultilingualSeoPanel() {
  const [tab, setTab] = useState<Tab>("locales");
  const [health, setHealth] = useState<Health | null>(null);
  const [locales, setLocales] = useState<SeoLocale[]>([]);
  const [clusters, setClusters] = useState<KeywordCluster[]>([]);
  const [pages, setPages] = useState<LocalizedPage[]>([]);
  const [keywordDraft, setKeywordDraft] = useState<KeywordDraft>(initialKeywordDraft);
  const [pageDraft, setPageDraft] = useState<PageDraft>(initialPageDraft);
  const [pageEdits, setPageEdits] = useState<Record<string, PageEdit>>({});
  const [expandedPageId, setExpandedPageId] = useState<string | null>(null);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [localeFilter, setLocaleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [migrationReady, setMigrationReady] = useState(true);

  const loadHealth = async () => {
    const { data, error } = await supabase.functions.invoke("multilingual-seo", { body: { action: "health" } });
    setHealth(error ? { error: error.message } : (data as Health));
  };

  const load = async () => {
    setLoading(true);
    const [localeResult, clusterResult, pageResult] = await Promise.all([
      db.from("seo_locales").select("*").order("priority", { ascending: false }).order("locale"),
      db.from("seo_keyword_clusters").select("*").order("created_at", { ascending: false }).limit(1000),
      db.from("seo_localized_pages").select("*").order("updated_at", { ascending: false }).limit(1000),
    ]);
    const schemaError = [localeResult.error, clusterResult.error, pageResult.error].find(isMigrationError);
    if (schemaError) {
      setMigrationReady(false);
      setLocales([]);
      setClusters([]);
      setPages([]);
    } else {
      setMigrationReady(true);
      setLocales(((localeResult.data ?? []) as SeoLocale[]).map((row) => ({ ...row, target_markets: Array.isArray(row.target_markets) ? row.target_markets : [] })));
      setClusters(((clusterResult.data ?? []) as KeywordCluster[]).map(normalizeCluster));
      const nextPages = ((pageResult.data ?? []) as LocalizedPage[]).map(normalizePage);
      setPages(nextPages);
      setPageEdits(Object.fromEntries(nextPages.map((page) => [page.id, editFor(page)])));
    }
    for (const [title, result] of [["Locales", localeResult], ["Keyword clusters", clusterResult], ["Localized pages", pageResult]] as const) {
      if (result.error && !isMigrationError(result.error)) toast({ title: `${title} could not load`, description: result.error.message, variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => {
    void Promise.all([load(), loadHealth()]);
  }, []);

  const activeLocales = useMemo(() => locales.filter((locale) => locale.status === "active"), [locales]);
  const filteredLocales = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return locales.filter((locale) => {
      if (statusFilter && locale.status !== statusFilter) return false;
      if (!needle) return true;
      return [locale.locale, locale.language_name, locale.native_name, locale.target_markets.join(" "), locale.notes]
        .filter(Boolean).join(" ").toLowerCase().includes(needle);
    });
  }, [locales, query, statusFilter]);
  const filteredClusters = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return clusters.filter((cluster) => {
      if (localeFilter && cluster.locale !== localeFilter) return false;
      if (statusFilter && cluster.status !== statusFilter) return false;
      if (!needle) return true;
      return [cluster.locale, cluster.cluster_name, cluster.market, cluster.product_focus.join(" "), cluster.primary_keywords.join(" "), cluster.supporting_keywords.join(" ")]
        .filter(Boolean).join(" ").toLowerCase().includes(needle);
    });
  }, [clusters, localeFilter, query, statusFilter]);
  const filteredPages = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return pages.filter((page) => {
      if (localeFilter && page.locale !== localeFilter) return false;
      if (statusFilter && page.status !== statusFilter) return false;
      if (!needle) return true;
      return [page.locale, page.path, page.base_route, page.source_title, page.seo_title, page.h1, page.status]
        .filter(Boolean).join(" ").toLowerCase().includes(needle);
    });
  }, [localeFilter, pages, query, statusFilter]);

  const generateKeywords = async () => {
    if (!health?.ready_to_generate || !keywordDraft.locale || !keywordDraft.productFocus.trim()) {
      toast({ title: "SEO AI generation is not ready or fields are incomplete", variant: "destructive" });
      return;
    }
    if (!window.confirm(`Create ${keywordDraft.clusterCount} internal semantic keyword clusters for ${keywordDraft.locale}? No public page or search-volume claim will be created.`)) return;
    setBusy("keywords");
    const { data, error } = await supabase.functions.invoke("multilingual-seo", {
      body: {
        action: "generate_keywords",
        locale: keywordDraft.locale,
        market: keywordDraft.market,
        product_focus: splitList(keywordDraft.productFocus),
        seed_keywords: splitList(keywordDraft.seeds),
        cluster_count: keywordDraft.clusterCount,
      },
    });
    setBusy(null);
    if (error || !data?.ok) {
      toast({ title: "Keyword generation failed", description: data?.error || error?.message || "Unknown error", variant: "destructive" });
      return;
    }
    toast({ title: "Keyword clusters created", description: `${data.created ?? 0} internal drafts. No search-volume metrics were invented.` });
    await load();
  };

  const setClusterStatus = async (cluster: KeywordCluster, status: ClusterStatus) => {
    const update: Record<string, unknown> = { status };
    if (status === "approved") {
      update.approved_at = new Date().toISOString();
      const { data: userData } = await supabase.auth.getUser();
      update.approved_by = userData.user?.id ?? null;
    } else {
      update.approved_at = null;
      update.approved_by = null;
    }
    const { error } = await db.from("seo_keyword_clusters").update(update).eq("id", cluster.id);
    if (error) {
      toast({ title: "Cluster update failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Cluster ${status}` });
    await load();
  };

  const generatePage = async () => {
    if (!health?.ready_to_generate || !pageDraft.locale || !pageDraft.sourceTitle.trim() || !pageDraft.sourceSummary.trim()) {
      toast({ title: "Localized page fields are incomplete", variant: "destructive" });
      return;
    }
    if (!window.confirm(`Create a noindex ${pageDraft.locale} page draft? It will require AI review, native-language confirmation, approval and a separate publish action.`)) return;
    setBusy("page");
    const { data, error } = await supabase.functions.invoke("multilingual-seo", {
      body: {
        action: "generate_page",
        locale: pageDraft.locale,
        base_route: pageDraft.baseRoute,
        page_type: pageDraft.pageType,
        source_title: pageDraft.sourceTitle,
        source_summary: pageDraft.sourceSummary,
        product_focus: splitList(pageDraft.productFocus),
        slug: pageDraft.slug,
        keyword_cluster_ids: pageDraft.clusterIds,
      },
    });
    setBusy(null);
    if (error || !data?.ok) {
      toast({ title: "Localized page generation failed", description: data?.error || error?.message || "Unknown error", variant: "destructive" });
      return;
    }
    setTab("pages");
    setLocaleFilter(pageDraft.locale);
    toast({ title: "Localized page draft created", description: `${data.page?.path ?? "Draft"} remains noindex.` });
    await load();
  };

  const savePage = async (page: LocalizedPage) => {
    const edit = pageEdits[page.id];
    if (!edit) return;
    let sections: unknown[];
    let faqs: unknown[];
    let cta: Record<string, unknown>;
    let internalLinks: unknown[];
    try {
      sections = parseArray(edit.sectionsJson, "Sections");
      faqs = parseArray(edit.faqsJson, "FAQs");
      cta = parseObject(edit.ctaJson, "CTA");
      internalLinks = parseArray(edit.linksJson, "Internal links");
    } catch (error) {
      toast({ title: "Invalid JSON", description: error instanceof Error ? error.message : "Fix JSON fields", variant: "destructive" });
      return;
    }
    setBusy(`save:${page.id}`);
    const { data, error } = await supabase.functions.invoke("multilingual-seo", {
      body: {
        action: "update_page",
        page_id: page.id,
        seo_title: edit.seoTitle,
        seo_description: edit.seoDescription,
        h1: edit.h1,
        eyebrow: edit.eyebrow,
        intro: edit.intro,
        sections,
        faqs,
        cta,
        internal_links: internalLinks,
      },
    });
    setBusy(null);
    if (error || !data?.ok) {
      toast({ title: "Page update failed", description: data?.error || error?.message || "Unknown error", variant: "destructive" });
      return;
    }
    setEditingPageId(null);
    toast({ title: "Page saved", description: "Quality review and approval were reset." });
    await load();
  };

  const reviewPage = async (page: LocalizedPage) => {
    setBusy(`review:${page.id}`);
    const { data, error } = await supabase.functions.invoke("multilingual-seo", { body: { action: "review_page", page_id: page.id } });
    setBusy(null);
    if (error || !data?.ok) {
      toast({ title: "AI quality review failed", description: data?.error || error?.message || "Unknown error", variant: "destructive" });
      return;
    }
    toast({ title: data.pass ? "AI quality review passed" : "AI quality review needs changes", description: `Score ${data.quality_score}/100. Page remains noindex.` });
    await load();
  };

  const approvePage = async (page: LocalizedPage) => {
    if (!window.confirm(`Confirm that a competent ${page.locale} reviewer has reviewed this page and approve it? It will still remain noindex until separately published.`)) return;
    setBusy(`approve:${page.id}`);
    const { data, error } = await supabase.functions.invoke("multilingual-seo", { body: { action: "approve_page", page_id: page.id, native_review_approved: true } });
    setBusy(null);
    if (error || !data?.ok) {
      toast({ title: "Page approval failed", description: data?.error || error?.message || "Unknown error", variant: "destructive" });
      return;
    }
    toast({ title: "Page approved", description: "It remains noindex until the separate publish action." });
    await load();
  };

  const publishPage = async (page: LocalizedPage) => {
    if (!window.confirm(`Publish ${page.path} for search indexing? It will enter hreflang and sitemap on the next build.`)) return;
    setBusy(`publish:${page.id}`);
    const { data, error } = await supabase.functions.invoke("multilingual-seo", { body: { action: "publish_page", page_id: page.id } });
    setBusy(null);
    if (error || !data?.ok) {
      toast({ title: "Page publish failed", description: data?.error || error?.message || "Unknown error", variant: "destructive" });
      return;
    }
    toast({ title: "Localized page published", description: data.public_url });
    await Promise.all([load(), loadHealth()]);
  };

  const setLocaleStatus = async (locale: SeoLocale, status: LocaleStatus) => {
    if (status === "active" && !window.confirm(`Activate ${locale.locale} for publish eligibility? Only reviewed pages will become public.`)) return;
    setBusy(`locale:${locale.locale}`);
    const { data, error } = await supabase.functions.invoke("multilingual-seo", { body: { action: "set_locale", locale: locale.locale, status } });
    setBusy(null);
    if (error || !data?.ok) {
      toast({ title: "Locale update failed", description: data?.error || error?.message || "Unknown error", variant: "destructive" });
      return;
    }
    toast({ title: `${locale.locale} set to ${status}` });
    await Promise.all([load(), loadHealth()]);
  };

  return (
    <div className="space-y-6">
      <section className="border border-gold/40 bg-gradient-to-br from-gold/10 via-card/40 to-background p-6 md:p-8">
        <div className="flex items-start justify-between gap-5 flex-wrap">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-gold mb-3"><Globe2 size={15} /> Global Search Operations</div>
            <h2 className="font-display text-3xl md:text-4xl">Multilingual SEO Engine</h2>
            <p className="text-sm text-foreground/70 mt-3 leading-relaxed">
              52-locale registry, internal semantic keyword atlas and approval-gated localized pages. Keywords alone are never hidden on the website. Only useful, quality-reviewed and native-approved pages can become indexable.
            </p>
          </div>
          <button type="button" onClick={() => void Promise.all([load(), loadHealth()])} className="inline-flex items-center gap-2 border border-border/60 px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] hover:border-gold hover:text-gold"><RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh</button>
        </div>
      </section>

      <HealthPanel health={health} migrationReady={migrationReady} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric label="Locale registry" value={locales.length} />
        <Metric label="Active locales" value={activeLocales.length} />
        <Metric label="Keyword clusters" value={clusters.length} />
        <Metric label="Published pages" value={pages.filter((page) => page.status === "published" && !page.noindex).length} />
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border/60 pb-3">
        {([[
          "locales", `Locales (${locales.length})`, Languages,
        ], ["keywords", `Keyword atlas (${clusters.length})`, Search], ["pages", `Localized pages (${pages.length})`, FileSearch]] as const).map(([key, label, Icon]) => (
          <button key={key} type="button" onClick={() => { setTab(key); setStatusFilter(""); }} className={`inline-flex items-center gap-2 px-4 py-2 text-[10px] uppercase tracking-[0.18em] border ${tab === key ? "border-gold text-gold bg-gold/5" : "border-border/60 text-muted-foreground"}`}><Icon size={12} /> {label}</button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 border border-border/60 bg-card/30 px-3 py-2.5 flex-1 min-w-[240px]"><Search size={13} className="text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search locale, market, keyword or page…" className="bg-transparent outline-none text-xs w-full" /></div>
        {tab !== "locales" && <select value={localeFilter} onChange={(event) => setLocaleFilter(event.target.value)} className="seo-input w-auto"><option value="">All locales</option>{locales.map((locale) => <option key={locale.locale} value={locale.locale}>{locale.locale} · {locale.language_name}</option>)}</select>}
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="seo-input w-auto"><option value="">All statuses</option>{(tab === "locales" ? ["planned", "active", "paused", "retired"] : tab === "keywords" ? ["draft", "reviewed", "approved", "rejected", "archived"] : ["draft", "ai_reviewed", "approved", "published", "rejected", "archived"]).map((status) => <option key={status} value={status}>{status.replace(/_/g, " ")}</option>)}</select>
      </div>

      {tab === "locales" && <LocalesView locales={filteredLocales} busy={busy} onStatus={setLocaleStatus} />}
      {tab === "keywords" && (
        <div className="grid xl:grid-cols-12 gap-6">
          <section className="xl:col-span-4 border border-border/60 bg-card/30 p-5 h-fit">
            <p className="eyebrow mb-3">Generate internal keyword clusters</p>
            <div className="space-y-3">
              <Field label="Locale"><LocaleSelect locales={locales} value={keywordDraft.locale} onChange={(locale) => setKeywordDraft((current) => ({ ...current, locale, market: locales.find((item) => item.locale === locale)?.target_markets.join(", ") || current.market }))} /></Field>
              <Field label="Market"><input className="seo-input" value={keywordDraft.market} onChange={(event) => setKeywordDraft((current) => ({ ...current, market: event.target.value }))} /></Field>
              <Field label="Product focus"><textarea rows={3} className="seo-input resize-y" value={keywordDraft.productFocus} onChange={(event) => setKeywordDraft((current) => ({ ...current, productFocus: event.target.value }))} /></Field>
              <Field label="Seed terms"><textarea rows={3} className="seo-input resize-y" value={keywordDraft.seeds} onChange={(event) => setKeywordDraft((current) => ({ ...current, seeds: event.target.value }))} /></Field>
              <Field label="Cluster count"><input type="number" min={1} max={8} className="seo-input" value={keywordDraft.clusterCount} onChange={(event) => setKeywordDraft((current) => ({ ...current, clusterCount: Math.max(1, Math.min(8, Number(event.target.value) || 1)) }))} /></Field>
            </div>
            <button type="button" onClick={() => void generateKeywords()} disabled={busy !== null || !migrationReady} className="mt-5 w-full inline-flex items-center justify-center gap-2 bg-gradient-gold text-primary-foreground px-5 py-3 text-[10px] uppercase tracking-[0.18em] disabled:opacity-40">{busy === "keywords" ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Generate internal drafts</button>
            <p className="text-[10px] text-muted-foreground mt-3">No meta-keyword stuffing and no invented volume/CPC/difficulty metrics.</p>
          </section>
          <section className="xl:col-span-8"><ClustersView clusters={filteredClusters} onStatus={setClusterStatus} /></section>
        </div>
      )}
      {tab === "pages" && (
        <div className="grid xl:grid-cols-12 gap-6">
          <section className="xl:col-span-4 border border-border/60 bg-card/30 p-5 h-fit">
            <p className="eyebrow mb-3">Create noindex localized draft</p>
            <div className="space-y-3">
              <Field label="Locale"><LocaleSelect locales={locales} value={pageDraft.locale} onChange={(locale) => setPageDraft((current) => ({ ...current, locale, clusterIds: [] }))} /></Field>
              <Field label="English base route"><input className="seo-input" value={pageDraft.baseRoute} onChange={(event) => setPageDraft((current) => ({ ...current, baseRoute: event.target.value }))} placeholder="/products/bavarian-trachten-wear" /></Field>
              <Field label="Page type"><select className="seo-input" value={pageDraft.pageType} onChange={(event) => setPageDraft((current) => ({ ...current, pageType: event.target.value }))}>{["commercial_landing", "capability", "category", "buyer_guide", "country_landing"].map((type) => <option key={type} value={type}>{type.replace(/_/g, " ")}</option>)}</select></Field>
              <Field label="Verified source title"><input className="seo-input" value={pageDraft.sourceTitle} onChange={(event) => setPageDraft((current) => ({ ...current, sourceTitle: event.target.value }))} /></Field>
              <Field label="Verified source facts"><textarea rows={7} className="seo-input resize-y" value={pageDraft.sourceSummary} onChange={(event) => setPageDraft((current) => ({ ...current, sourceSummary: event.target.value }))} /></Field>
              <Field label="Product focus"><textarea rows={2} className="seo-input resize-y" value={pageDraft.productFocus} onChange={(event) => setPageDraft((current) => ({ ...current, productFocus: event.target.value }))} /></Field>
              <Field label="Optional URL slug"><input className="seo-input" value={pageDraft.slug} onChange={(event) => setPageDraft((current) => ({ ...current, slug: event.target.value }))} /></Field>
              <Field label="Approved keyword clusters"><div className="space-y-2 max-h-40 overflow-y-auto border border-border/50 p-2">{clusters.filter((cluster) => cluster.locale === pageDraft.locale && cluster.status === "approved").length === 0 ? <p className="text-[10px] text-muted-foreground p-2">No approved clusters for this locale. Page can still be generated from verified source facts.</p> : clusters.filter((cluster) => cluster.locale === pageDraft.locale && cluster.status === "approved").map((cluster) => <label key={cluster.id} className="flex items-start gap-2 text-xs"><input type="checkbox" className="mt-0.5" checked={pageDraft.clusterIds.includes(cluster.id)} onChange={() => setPageDraft((current) => ({ ...current, clusterIds: toggleArray(current.clusterIds, cluster.id) }))} /><span>{cluster.cluster_name}</span></label>)}</div></Field>
            </div>
            <button type="button" onClick={() => void generatePage()} disabled={busy !== null || !migrationReady} className="mt-5 w-full inline-flex items-center justify-center gap-2 bg-gradient-gold text-primary-foreground px-5 py-3 text-[10px] uppercase tracking-[0.18em] disabled:opacity-40">{busy === "page" ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Generate noindex draft</button>
          </section>
          <section className="xl:col-span-8"><PagesView pages={filteredPages} edits={pageEdits} setEdits={setPageEdits} editingId={editingPageId} setEditingId={setEditingPageId} expandedId={expandedPageId} setExpandedId={setExpandedPageId} busy={busy} onSave={savePage} onReview={reviewPage} onApprove={approvePage} onPublish={publishPage} /></section>
        </div>
      )}

      <style>{`.seo-input{width:100%;background:hsl(var(--input));border:1px solid hsl(var(--border));padding:.65rem .75rem;font-size:.75rem;outline:none}.seo-input:focus{border-color:hsl(var(--primary))}`}</style>
    </div>
  );
}

function HealthPanel({ health, migrationReady }: { health: Health | null; migrationReady: boolean }) {
  if (!migrationReady) return <div className="border border-amber-500/40 bg-amber-500/10 p-5 flex items-start gap-3"><AlertTriangle size={18} className="text-amber-300 shrink-0" /><div><p className="font-medium">Multilingual SEO migration pending</p><p className="text-xs text-foreground/65 mt-1">Publish/apply the migration before using locale, keyword and page workflows.</p></div></div>;
  if (!health) return <div className="border border-border/60 bg-card/30 p-4 text-xs text-muted-foreground">Checking SEO runtime…</div>;
  if (health.error) return <div className="border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">{health.error}</div>;
  return <div className={`border p-4 flex items-start gap-3 ${health.ready_to_generate ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/10"}`}>{health.ready_to_generate ? <CheckCircle2 size={17} className="text-emerald-300 shrink-0" /> : <AlertTriangle size={17} className="text-amber-300 shrink-0" />}<div><p className="font-medium text-sm">{health.ready_to_generate ? `Multilingual SEO ready · ${health.locale_count ?? 0} locales registered` : "SEO engine needs configuration"}</p><p className="text-xs text-foreground/65 mt-1">{health.note}</p><p className="text-[10px] text-muted-foreground mt-2">Publish score ≥ {health.publish_score_required ?? 80} · search-volume source: {health.search_volume_source || "not connected"}</p></div></div>;
}

function LocalesView({ locales, busy, onStatus }: { locales: SeoLocale[]; busy: string | null; onStatus: (locale: SeoLocale, status: LocaleStatus) => Promise<void> }) {
  return <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{locales.map((locale) => <article key={locale.locale} className="border border-border/60 bg-card/30 p-5"><div className="flex items-start justify-between gap-3"><div><p className="font-display text-xl">{locale.native_name}</p><p className="text-xs text-muted-foreground mt-1">{locale.language_name} · {locale.locale} · {locale.direction.toUpperCase()}</p></div><Badge className={localeStatusStyle[locale.status]}>{locale.status}</Badge></div><p className="text-xs text-foreground/65 mt-4">{locale.target_markets.join(" · ") || "Markets not assigned"}</p><div className="flex items-center justify-between gap-3 mt-4"><span className="text-[10px] text-muted-foreground">Priority {locale.priority} · native review {locale.requires_native_review ? "required" : "not required"}</span><select value={locale.status} disabled={busy !== null} onChange={(event) => void onStatus(locale, event.target.value as LocaleStatus)} className="seo-input w-auto"><option value="planned">planned</option><option value="active">active</option><option value="paused">paused</option><option value="retired">retired</option></select></div></article>)}</div>;
}

function ClustersView({ clusters, onStatus }: { clusters: KeywordCluster[]; onStatus: (cluster: KeywordCluster, status: ClusterStatus) => Promise<void> }) {
  if (clusters.length === 0) return <Empty icon={<Search size={24} />} title="No keyword clusters" body="Generate semantic clusters for a target locale." />;
  return <div className="space-y-3">{clusters.map((cluster) => <article key={cluster.id} className="border border-border/60 bg-card/30 p-5"><div className="flex items-start justify-between gap-4 flex-wrap"><div><div className="flex flex-wrap items-center gap-2"><span className="text-[9px] uppercase tracking-[0.15em] text-gold">{cluster.locale}</span><span className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground">{cluster.search_intent}</span><Badge className="border-border/60 text-muted-foreground">{cluster.status}</Badge></div><h3 className="font-display text-xl mt-2">{cluster.cluster_name}</h3><p className="text-[10px] text-muted-foreground mt-1">{cluster.market || "Market not set"} · {cluster.product_focus.join(" · ")}</p></div><select value={cluster.status} onChange={(event) => void onStatus(cluster, event.target.value as ClusterStatus)} className="seo-input w-auto"><option value="draft">draft</option><option value="reviewed">reviewed</option><option value="approved">approved</option><option value="rejected">rejected</option><option value="archived">archived</option></select></div><KeywordList label="Primary" values={cluster.primary_keywords} /><KeywordList label="Supporting" values={cluster.supporting_keywords} /><KeywordList label="Buyer questions" values={cluster.questions} /><div className="flex justify-end mt-3"><button type="button" onClick={() => void copyValue({ primary: cluster.primary_keywords, supporting: cluster.supporting_keywords, questions: cluster.questions }, "Keyword cluster")} className="inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.15em] text-muted-foreground hover:text-gold"><Copy size={11} /> Copy</button></div></article>)}</div>;
}

function PagesView({ pages, edits, setEdits, editingId, setEditingId, expandedId, setExpandedId, busy, onSave, onReview, onApprove, onPublish }: { pages: LocalizedPage[]; edits: Record<string, PageEdit>; setEdits: React.Dispatch<React.SetStateAction<Record<string, PageEdit>>>; editingId: string | null; setEditingId: (value: string | null) => void; expandedId: string | null; setExpandedId: (value: string | null) => void; busy: string | null; onSave: (page: LocalizedPage) => Promise<void>; onReview: (page: LocalizedPage) => Promise<void>; onApprove: (page: LocalizedPage) => Promise<void>; onPublish: (page: LocalizedPage) => Promise<void> }) {
  if (pages.length === 0) return <Empty icon={<FileSearch size={24} />} title="No localized pages" body="Create a noindex draft from verified business facts." />;
  return <div className="space-y-3">{pages.map((page) => { const edit = edits[page.id] ?? editFor(page); const isEditing = editingId === page.id; const report = page.quality_report || {}; return <article key={page.id} className="border border-border/60 bg-card/30 p-5"><div className="flex items-start justify-between gap-4 flex-wrap"><div><div className="flex flex-wrap items-center gap-2"><span className="text-[9px] uppercase tracking-[0.15em] text-gold">{page.locale}</span><Badge className={pageStatusStyle[page.status]}>{page.status.replace(/_/g, " ")}</Badge><span className={`text-[9px] uppercase tracking-[0.14em] ${page.noindex ? "text-amber-300" : "text-emerald-300"}`}>{page.noindex ? "noindex" : "indexable"}</span><span className="text-[9px] text-muted-foreground">score {page.quality_score}/100</span><span className="text-[9px] text-muted-foreground">native {page.native_review_status}</span></div><h3 className="font-display text-xl mt-2">{page.h1}</h3><p className="text-[10px] text-muted-foreground mt-1">{page.path} · base {page.base_route}</p></div><div className="flex gap-2"><button type="button" onClick={() => setEditingId(isEditing ? null : page.id)} disabled={page.status === "published"} className="border border-border/60 px-3 py-2 text-[9px] uppercase tracking-[0.14em] disabled:opacity-30">Edit</button><button type="button" onClick={() => setExpandedId(expandedId === page.id ? null : page.id)} className="p-2 text-muted-foreground hover:text-gold">{expandedId === page.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button></div></div>
    {isEditing ? <div className="mt-5 grid md:grid-cols-2 gap-3"><Field label="SEO title"><input className="seo-input" value={edit.seoTitle} onChange={(event) => updatePageEdit(setEdits, page.id, { seoTitle: event.target.value })} /></Field><Field label="SEO description"><textarea rows={2} className="seo-input resize-y" value={edit.seoDescription} onChange={(event) => updatePageEdit(setEdits, page.id, { seoDescription: event.target.value })} /></Field><Field label="H1"><input className="seo-input" value={edit.h1} onChange={(event) => updatePageEdit(setEdits, page.id, { h1: event.target.value })} /></Field><Field label="Eyebrow"><input className="seo-input" value={edit.eyebrow} onChange={(event) => updatePageEdit(setEdits, page.id, { eyebrow: event.target.value })} /></Field><div className="md:col-span-2"><Field label="Intro"><textarea rows={4} className="seo-input resize-y" value={edit.intro} onChange={(event) => updatePageEdit(setEdits, page.id, { intro: event.target.value })} /></Field></div><Field label="Sections JSON"><textarea rows={12} className="seo-input font-mono resize-y" value={edit.sectionsJson} onChange={(event) => updatePageEdit(setEdits, page.id, { sectionsJson: event.target.value })} /></Field><Field label="FAQs JSON"><textarea rows={12} className="seo-input font-mono resize-y" value={edit.faqsJson} onChange={(event) => updatePageEdit(setEdits, page.id, { faqsJson: event.target.value })} /></Field><Field label="CTA JSON"><textarea rows={7} className="seo-input font-mono resize-y" value={edit.ctaJson} onChange={(event) => updatePageEdit(setEdits, page.id, { ctaJson: event.target.value })} /></Field><Field label="Internal links JSON"><textarea rows={7} className="seo-input font-mono resize-y" value={edit.linksJson} onChange={(event) => updatePageEdit(setEdits, page.id, { linksJson: event.target.value })} /></Field><div className="md:col-span-2"><button type="button" onClick={() => void onSave(page)} disabled={busy !== null} className="inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-5 py-3 text-[10px] uppercase tracking-[0.18em] disabled:opacity-40">{busy === `save:${page.id}` ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save & reset review</button></div></div> : <p className="text-sm text-foreground/70 mt-4 line-clamp-3">{page.intro}</p>}
    <div className="flex flex-wrap gap-2 mt-5"><button type="button" onClick={() => void onReview(page)} disabled={busy !== null || page.status === "published"} className="inline-flex items-center gap-2 border border-blue-500/50 text-blue-300 px-4 py-2 text-[9px] uppercase tracking-[0.14em] disabled:opacity-40">{busy === `review:${page.id}` ? <Loader2 size={11} className="animate-spin" /> : <FileSearch size={11} />} AI quality review</button><button type="button" onClick={() => void onApprove(page)} disabled={busy !== null || page.status !== "ai_reviewed"} className="inline-flex items-center gap-2 border border-amber-500/50 text-amber-300 px-4 py-2 text-[9px] uppercase tracking-[0.14em] disabled:opacity-40">{busy === `approve:${page.id}` ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />} Confirm native review & approve</button><button type="button" onClick={() => void onPublish(page)} disabled={busy !== null || page.status !== "approved"} className="inline-flex items-center gap-2 border border-emerald-500/50 text-emerald-300 px-4 py-2 text-[9px] uppercase tracking-[0.14em] disabled:opacity-40">{busy === `publish:${page.id}` ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />} Publish</button>{page.status === "published" && <a href={page.path} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-2 border border-gold/50 text-gold px-4 py-2 text-[9px] uppercase tracking-[0.14em]">Open page <ExternalLink size={11} /></a>}</div>
    {expandedId === page.id && <div className="mt-5 border-t border-border/40 pt-4 grid md:grid-cols-2 gap-4"><div><p className="text-[9px] uppercase tracking-[0.18em] text-gold mb-2">Quality report</p><pre className="text-[10px] whitespace-pre-wrap break-words border border-border/40 bg-background/30 p-3 max-h-80 overflow-auto">{JSON.stringify(report, null, 2)}</pre></div><div><p className="text-[9px] uppercase tracking-[0.18em] text-gold mb-2">Page payload</p><pre className="text-[10px] whitespace-pre-wrap break-words border border-border/40 bg-background/30 p-3 max-h-80 overflow-auto">{JSON.stringify({ sections: page.sections, faqs: page.faqs, cta: page.cta, internal_links: page.internal_links }, null, 2)}</pre></div></div>}</article>; })}</div>;
}

function KeywordList({ label, values }: { label: string; values: string[] }) { if (values.length === 0) return null; return <div className="mt-4"><p className="text-[9px] uppercase tracking-[0.16em] text-gold/80 mb-2">{label}</p><div className="flex flex-wrap gap-2">{values.map((value) => <span key={value} className="border border-border/50 bg-background/20 px-2 py-1 text-[10px] text-foreground/70">{value}</span>)}</div></div>; }
function LocaleSelect({ locales, value, onChange }: { locales: SeoLocale[]; value: string; onChange: (value: string) => void }) { return <select className="seo-input" value={value} onChange={(event) => onChange(event.target.value)}>{locales.map((locale) => <option key={locale.locale} value={locale.locale}>{locale.locale} · {locale.language_name} · {locale.status}</option>)}</select>; }
function Field({ label, children }: { label: string; children: ReactNode }) { return <label><span className="block text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-1.5">{label}</span>{children}</label>; }
function Badge({ children, className }: { children: ReactNode; className: string }) { return <span className={`inline-flex border px-2 py-1 text-[9px] uppercase tracking-[0.14em] ${className}`}>{children}</span>; }
function Metric({ label, value }: { label: string; value: number }) { return <div className="border border-border/60 bg-card/30 p-4"><p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p><p className="font-display text-2xl mt-1">{value}</p></div>; }
function Empty({ icon, title, body }: { icon: ReactNode; title: string; body: string }) { return <div className="border border-dashed border-border/60 bg-card/20 p-12 text-center"><div className="inline-flex text-muted-foreground mb-3">{icon}</div><h3 className="font-display text-xl">{title}</h3><p className="text-sm text-muted-foreground mt-2">{body}</p></div>; }
function normalizeCluster(cluster: KeywordCluster): KeywordCluster { return { ...cluster, product_focus: array(cluster.product_focus), seed_keywords: array(cluster.seed_keywords), primary_keywords: array(cluster.primary_keywords), supporting_keywords: array(cluster.supporting_keywords), questions: array(cluster.questions), negative_keywords: array(cluster.negative_keywords), source_notes: cluster.source_notes && typeof cluster.source_notes === "object" ? cluster.source_notes : {} }; }
function normalizePage(page: LocalizedPage): LocalizedPage { return { ...page, sections: Array.isArray(page.sections) ? page.sections : [], faqs: Array.isArray(page.faqs) ? page.faqs : [], cta: page.cta && typeof page.cta === "object" ? page.cta : {}, keyword_cluster_ids: array(page.keyword_cluster_ids), internal_links: Array.isArray(page.internal_links) ? page.internal_links : [], quality_report: page.quality_report && typeof page.quality_report === "object" ? page.quality_report : {} }; }
function editFor(page: LocalizedPage): PageEdit { return { seoTitle: page.seo_title, seoDescription: page.seo_description, h1: page.h1, eyebrow: page.eyebrow || "", intro: page.intro, sectionsJson: JSON.stringify(page.sections, null, 2), faqsJson: JSON.stringify(page.faqs, null, 2), ctaJson: JSON.stringify(page.cta, null, 2), linksJson: JSON.stringify(page.internal_links, null, 2) }; }
function updatePageEdit(setter: React.Dispatch<React.SetStateAction<Record<string, PageEdit>>>, id: string, patch: Partial<PageEdit>) { setter((current) => ({ ...current, [id]: { ...current[id], ...patch } })); }
function splitList(value: string) { return [...new Set(value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean))]; }
function toggleArray(values: string[], value: string) { return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]; }
function array(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }
function parseArray(value: string, label: string): unknown[] { const parsed = JSON.parse(value); if (!Array.isArray(parsed)) throw new Error(`${label} must be a JSON array.`); return parsed; }
function parseObject(value: string, label: string): Record<string, unknown> { const parsed = JSON.parse(value); if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error(`${label} must be a JSON object.`); return parsed; }
function isMigrationError(error: any) { const text = `${error?.code || ""} ${error?.message || ""}`.toLowerCase(); return text.includes("42p01") || text.includes("seo_locales") || text.includes("seo_keyword_clusters") || text.includes("seo_localized_pages"); }
async function copyValue(value: unknown, label: string) { await navigator.clipboard.writeText(JSON.stringify(value, null, 2)); toast({ title: `${label} copied` }); }
