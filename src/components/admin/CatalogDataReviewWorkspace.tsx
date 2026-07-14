import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, ExternalLink, FileSearch, Globe2, ImageIcon, Package, RefreshCw, Search, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { AdminView } from "./AdminShell";

const db = supabase as any;

type Tab = "media" | "products" | "seo" | "social";
type MediaRow = { id: string; file_name: string; title: string | null; public_url: string; mime_type: string; verification_status: string; social_approved: boolean; tags: string[] | null; usage_notes: string | null; width_px: number | null; height_px: number | null; checksum_sha256: string | null; status: string };
type ProductRow = { id: string; name: string; sku: string | null; short_description: string | null; image_url: string | null; is_published: boolean; is_featured: boolean };
type ReviewRow = { product_id: string; status: string; reviewer_notes: string | null; verified_at: string | null };
type SeoRow = { id: string; locale: string; path: string; status: string; noindex: boolean; quality_score: number; native_review_status: string; cta: Record<string, unknown> | null };
type SocialRow = { id: string; title: string; platform: string; status: string; creative_status: string; product_url: string | null; image_url: string | null; caption: string | null; call_to_action: string | null; risk_flags: string[] | null };
type Snapshot = { media: MediaRow[]; products: ProductRow[]; reviews: ReviewRow[]; seo: SeoRow[]; social: SocialRow[] };

const emptySnapshot: Snapshot = { media: [], products: [], reviews: [], seo: [], social: [] };

export default function CatalogDataReviewWorkspace({ go }: { go: (view: AdminView) => void }) {
  const [tab, setTab] = useState<Tab>("media");
  const [snapshot, setSnapshot] = useState<Snapshot>(emptySnapshot);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const results = await Promise.all([
      db.from("media_assets").select("id,file_name,title,public_url,mime_type,verification_status,social_approved,tags,usage_notes,width_px,height_px,checksum_sha256,status").order("updated_at", { ascending: false }).limit(1200),
      db.from("products").select("id,name,sku,short_description,image_url,is_published,is_featured").order("name").limit(500),
      db.from("product_quality_reviews").select("product_id,status,reviewer_notes,verified_at").limit(500),
      db.from("seo_localized_pages").select("id,locale,path,status,noindex,quality_score,native_review_status,cta").order("updated_at", { ascending: false }).limit(250),
      db.from("social_calendar_items").select("id,title,platform,status,creative_status,product_url,image_url,caption,call_to_action,risk_flags").order("updated_at", { ascending: false }).limit(250),
    ]);
    const firstError = results.find((result) => result.error)?.error;
    if (firstError) {
      setError(firstError.message || "Catalog review data could not load.");
      setLoading(false);
      return;
    }
    setSnapshot({
      media: (results[0].data as MediaRow[]) || [],
      products: (results[1].data as ProductRow[]) || [],
      reviews: (results[2].data as ReviewRow[]) || [],
      seo: (results[3].data as SeoRow[]) || [],
      social: (results[4].data as SocialRow[]) || [],
    });
    setError(null);
    setLastChecked(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setFilter("all"); setQuery(""); }, [tab]);

  const reviewMap = useMemo(() => new Map(snapshot.reviews.map((row) => [row.product_id, row])), [snapshot.reviews]);
  const needle = query.trim().toLowerCase();
  const counts = useMemo(() => ({
    verifiedMedia: snapshot.media.filter((row) => row.verification_status === "verified").length,
    pendingMigration: snapshot.media.filter(isPendingMigration).length,
    migrationFailed: snapshot.media.filter((row) => row.verification_status === "migration_failed").length,
    socialApproved: snapshot.media.filter((row) => row.social_approved).length,
    productReview: snapshot.reviews.filter((row) => row.status === "needs_information").length,
    seoNoindex: snapshot.seo.filter((row) => row.noindex).length,
    socialDrafts: snapshot.social.filter((row) => row.status === "draft").length,
    socialBlocked: snapshot.social.filter(isSocialBlocked).length,
  }), [snapshot]);

  const media = useMemo(() => snapshot.media.filter((row) => {
    if (filter === "verified" && row.verification_status !== "verified") return false;
    if (filter === "pending_migration" && !isPendingMigration(row)) return false;
    if (filter === "migration_failed" && row.verification_status !== "migration_failed") return false;
    if (filter === "social_approved" && !row.social_approved) return false;
    return searchMatch(needle, row.file_name, row.title, row.verification_status, row.usage_notes, row.tags?.join(" "));
  }), [filter, needle, snapshot.media]);

  const products = useMemo(() => snapshot.products.filter((row) => {
    const review = reviewMap.get(row.id);
    if (filter === "needs_information" && review?.status !== "needs_information") return false;
    if (filter === "verified" && review?.status !== "verified") return false;
    if (filter === "published" && !row.is_published) return false;
    return searchMatch(needle, row.name, row.sku, row.short_description, review?.status, review?.reviewer_notes);
  }), [filter, needle, reviewMap, snapshot.products]);

  const seo = useMemo(() => snapshot.seo.filter((row) => {
    if (filter !== "all" && row.status !== filter) return false;
    return searchMatch(needle, row.locale, row.path, row.status, row.native_review_status);
  }), [filter, needle, snapshot.seo]);

  const social = useMemo(() => snapshot.social.filter((row) => {
    if (filter === "draft" && row.status !== "draft") return false;
    if (filter === "asset_attached" && row.creative_status !== "asset_attached") return false;
    if (filter === "blocked" && !isSocialBlocked(row)) return false;
    return searchMatch(needle, row.title, row.platform, row.status, row.creative_status, row.caption, row.call_to_action);
  }), [filter, needle, snapshot.social]);

  return (
    <section className="border border-border/60 bg-card/25" aria-labelledby="catalog-review-title">
      <header className="p-4 sm:p-5 md:p-6 border-b border-border/60 flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <FileSearch size={20} className="text-gold shrink-0 mt-1" />
          <div className="min-w-0">
            <p className="eyebrow mb-2">Owner Data Review</p>
            <h2 id="catalog-review-title" className="font-display text-2xl md:text-3xl">Catalog, media, SEO & social evidence</h2>
            <p className="text-sm text-foreground/60 mt-2 max-w-3xl leading-relaxed">Review factual readiness before approval. This workspace is read-only and never sends, publishes or changes product claims.</p>
          </div>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="min-h-11 inline-flex items-center justify-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.15em] hover:border-gold hover:text-gold disabled:opacity-50"><RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh evidence</button>
      </header>

      {error && <div className="border-b border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive flex items-start gap-2"><AlertTriangle size={16} className="shrink-0 mt-0.5" /><span className="break-words">{error}</span></div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 border-b border-border/60">
        <Metric label="Verified media" value={counts.verifiedMedia} tone="good" />
        <Metric label="Storage pending" value={counts.pendingMigration} tone="warn" />
        <Metric label="Migration failed" value={counts.migrationFailed} tone={counts.migrationFailed ? "bad" : "good"} />
        <Metric label="Social approved" value={counts.socialApproved} tone="good" />
        <Metric label="Product review" value={counts.productReview} tone="warn" />
        <Metric label="SEO noindex" value={counts.seoNoindex} tone="warn" />
        <Metric label="Social drafts" value={counts.socialDrafts} tone="warn" />
        <Metric label="Social blocked" value={counts.socialBlocked} tone={counts.socialBlocked ? "bad" : "good"} />
      </div>

      <div className="p-3 sm:p-4 border-b border-border/60 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <TabButton active={tab === "media"} icon={<ImageIcon size={14} />} label="Media" count={snapshot.media.length} onClick={() => setTab("media")} />
          <TabButton active={tab === "products"} icon={<Package size={14} />} label="Products" count={snapshot.products.length} onClick={() => setTab("products")} />
          <TabButton active={tab === "seo"} icon={<Globe2 size={14} />} label="SEO" count={snapshot.seo.length} onClick={() => setTab("seo")} />
          <TabButton active={tab === "social"} icon={<Share2 size={14} />} label="Social" count={snapshot.social.length} onClick={() => setTab("social")} />
        </div>
        <div className="flex flex-col lg:flex-row gap-3">
          <FilterButtons tab={tab} active={filter} onChange={setFilter} />
          <label className="relative min-w-0 lg:ml-auto lg:w-80"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search current review queue…" className="min-h-11 w-full border border-border/60 bg-background/50 pl-9 pr-3 text-sm outline-none focus:border-gold" /></label>
        </div>
      </div>

      <div className="p-4 md:p-5 min-w-0">
        {tab === "media" && <MediaList rows={media} onOpen={() => go("media")} />}
        {tab === "products" && <ProductList rows={products} reviews={reviewMap} onOpen={() => go("products")} />}
        {tab === "seo" && <SeoList rows={seo} onOpen={() => go("seo")} />}
        {tab === "social" && <SocialList rows={social} onOpen={() => go("social")} />}
      </div>

      <footer className="border-t border-border/60 px-4 sm:px-5 py-3 text-[10px] uppercase tracking-[0.13em] text-foreground/45 flex justify-between gap-3 flex-wrap"><span>Approval gates preserved · no automatic publish</span><span>{loading ? "Refreshing…" : lastChecked ? `Checked ${lastChecked.toLocaleString()}` : "Not checked"}</span></footer>
    </section>
  );
}

function MediaList({ rows, onOpen }: { rows: MediaRow[]; onOpen: () => void }) {
  return <ReviewSection title="Media technical readiness" note="Only active, technically verified media with dimensions and checksum is eligible for social approval." action="Open Media Library" onOpen={onOpen} empty={rows.length === 0}>{rows.slice(0, 150).map((row) => {
    const reason = mediaBlockReason(row);
    return <article key={row.id} className="border border-border/50 bg-background/20 p-4 min-w-0"><div className="flex flex-wrap gap-2"><Badge text={humanize(row.verification_status || "pending")} tone={row.verification_status === "verified" ? "good" : row.verification_status === "migration_failed" ? "bad" : "warn"} />{isPendingMigration(row) && <Badge text="owner storage pending" tone="warn" />}{row.social_approved && <Badge text="social approved" tone="good" />}</div><h3 className="font-display text-lg mt-3 break-words">{row.title || row.file_name}</h3><p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-1 break-words">{row.width_px && row.height_px ? `${row.width_px}×${row.height_px}` : "dimensions missing"} · {row.status}</p>{reason && <p className="text-[11px] text-amber-200/80 mt-3 leading-relaxed break-words">Blocked: {reason}</p>}{row.usage_notes && <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed break-words">{row.usage_notes}</p>}<a href={row.public_url} target="_blank" rel="noreferrer" className="mt-3 min-h-9 inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.12em] text-gold"><ExternalLink size={11} /> Open source</a></article>;
  })}</ReviewSection>;
}

function ProductList({ rows, reviews, onOpen }: { rows: ProductRow[]; reviews: Map<string, ReviewRow>; onOpen: () => void }) {
  return <ReviewSection title="Product factual readiness" note="SKU and short descriptions are prepared; material, sample, size, colour and origin claims remain unverified until review is completed." action="Open Products" onOpen={onOpen} empty={rows.length === 0}>{rows.slice(0, 150).map((row) => {
    const review = reviews.get(row.id);
    return <article key={row.id} className="border border-border/50 bg-background/20 p-4 min-w-0"><div className="flex flex-wrap gap-2"><Badge text={row.is_published ? "published" : "draft"} tone={row.is_published ? "good" : "neutral"} /><Badge text={humanize(review?.status || "review missing")} tone={review?.status === "verified" ? "good" : "warn"} />{row.is_featured && <Badge text="featured" tone="neutral" />}</div><h3 className="font-display text-lg mt-3 break-words">{row.name}</h3><p className="text-[10px] text-gold mt-1 break-all">{row.sku || "SKU missing"}</p><p className="text-xs text-foreground/65 mt-3 leading-relaxed break-words">{row.short_description || "Short B2B description missing."}</p>{review?.reviewer_notes && <p className="text-[11px] text-amber-200/80 mt-3 leading-relaxed break-words">{review.reviewer_notes}</p>}</article>;
  })}</ReviewSection>;
}

function SeoList({ rows, onOpen }: { rows: SeoRow[]; onOpen: () => void }) {
  return <ReviewSection title="Localized SEO publishing gates" note="The public route is /intl/:locale/:slug. Drafts remain noindex until quality, native review and explicit publish approval pass." action="Open Google SEO" onOpen={onOpen} empty={rows.length === 0}>{rows.map((row) => {
    const primary = stringValue(row.cta?.primary_href) || "Not set";
    const secondary = stringValue(row.cta?.secondary_href) || "Not set";
    return <article key={row.id} className="border border-border/50 bg-background/20 p-4 min-w-0"><div className="flex flex-wrap gap-2"><Badge text={humanize(row.status)} tone={row.status === "published" ? "good" : "warn"} /><Badge text={row.noindex ? "noindex" : "indexable"} tone={row.noindex ? "warn" : "good"} /></div><h3 className="font-display text-lg mt-3 break-all">{row.path}</h3><p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-1">{row.locale} · score {row.quality_score} · native {humanize(row.native_review_status)}</p><div className="grid sm:grid-cols-2 gap-2 mt-3"><Detail label="Primary CTA" value={primary} /><Detail label="Secondary CTA" value={secondary} /></div>{row.status === "published" && !row.noindex ? <a href={row.path} target="_blank" rel="noreferrer" className="mt-3 min-h-9 inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.12em] text-gold"><ExternalLink size={11} /> Open public page</a> : <p className="text-[11px] text-amber-200/80 mt-3">Public preview stays blocked until published and indexable.</p>}</article>;
  })}</ReviewSection>;
}

function SocialList({ rows, onOpen }: { rows: SocialRow[]; onOpen: () => void }) {
  return <ReviewSection title="Social owner-review drafts" note="Each item shows platform, source readiness, product destination, caption and CTA. No item publishes automatically." action="Open Social Posts" onOpen={onOpen} empty={rows.length === 0}>{rows.map((row) => <article key={row.id} className="border border-border/50 bg-background/20 p-4 min-w-0"><div className="flex flex-wrap gap-2"><Badge text={row.platform} tone="neutral" /><Badge text={humanize(row.status)} tone={row.status === "published" ? "good" : "warn"} /><Badge text={humanize(row.creative_status)} tone={row.creative_status === "asset_attached" ? "good" : "warn" />}{isSocialBlocked(row) && <Badge text="blocked" tone="bad" />}</div><h3 className="font-display text-lg mt-3 break-words">{row.title}</h3><p className="text-xs text-foreground/65 mt-2 leading-relaxed whitespace-pre-wrap break-words">{row.caption || "Caption missing."}</p><p className="text-[11px] text-gold mt-3 break-words">CTA: {row.call_to_action || "Not set"}</p>{row.product_url ? <a href={row.product_url} target="_blank" rel="noreferrer" className="mt-3 min-h-9 inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.12em] text-gold"><ExternalLink size={11} /> Open product destination</a> : <p className="text-[11px] text-destructive mt-3">Blocked: product destination is missing.</p>}{row.risk_flags?.length ? <p className="text-[10px] text-amber-200/80 mt-2 break-words">Risk flags: {row.risk_flags.join(" · ")}</p> : null}</article>)}</ReviewSection>;
}

function ReviewSection({ title, note, action, onOpen, empty, children }: { title: string; note: string; action: string; onOpen: () => void; empty: boolean; children: ReactNode }) {
  return <div className="space-y-4"><div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3"><div><h3 className="font-display text-xl">{title}</h3><p className="text-xs text-muted-foreground mt-1 max-w-3xl leading-relaxed">{note}</p></div><button type="button" onClick={onOpen} className="min-h-10 shrink-0 border border-border/60 px-3 text-[9px] uppercase tracking-[0.12em] hover:border-gold hover:text-gold">{action}</button></div>{empty ? <div className="border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">No record matches this review filter.</div> : <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">{children}</div>}</div>;
}

function FilterButtons({ tab, active, onChange }: { tab: Tab; active: string; onChange: (value: string) => void }) {
  const values = tab === "media" ? [["all", "All"], ["verified", "Verified"], ["pending_migration", "Storage pending"], ["migration_failed", "Migration failed"], ["social_approved", "Social approved"]] : tab === "products" ? [["all", "All"], ["needs_information", "Needs information"], ["verified", "Verified"], ["published", "Published"]] : tab === "seo" ? [["all", "All"], ["draft", "Draft"], ["ai_reviewed", "AI reviewed"], ["approved", "Approved"], ["published", "Published"]] : [["all", "All"], ["draft", "Draft"], ["asset_attached", "Asset attached"], ["blocked", "Blocked"]];
  return <div className="flex flex-wrap gap-2">{values.map(([value, label]) => <button key={value} type="button" onClick={() => onChange(value)} className={`min-h-9 border px-3 text-[9px] uppercase tracking-[0.11em] ${active === value ? "border-gold bg-gold/10 text-gold" : "border-border/50 text-muted-foreground hover:border-gold/60"}`}>{label}</button>)}</div>;
}

function TabButton({ active, icon, label, count, onClick }: { active: boolean; icon: ReactNode; label: string; count: number; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`min-h-11 inline-flex items-center justify-center gap-2 border px-3 text-[10px] uppercase tracking-[0.12em] ${active ? "border-gold bg-gold/10 text-gold" : "border-border/60 text-muted-foreground hover:border-gold/60"}`}>{icon}<span>{label}</span><span className="tabular-nums">{count}</span></button>;
}

function Metric({ label, value, tone }: { label: string; value: number; tone: "good" | "warn" | "bad" }) {
  const color = tone === "good" ? "text-emerald-300" : tone === "warn" ? "text-gold" : "text-destructive";
  return <div className="p-3 sm:p-4 border-r border-b xl:border-b-0 border-border/60 min-w-0"><p className={`font-display text-2xl tabular-nums ${color}`}>{value.toLocaleString()}</p><p className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground mt-1 leading-relaxed break-words">{label}</p></div>;
}

function Badge({ text, tone }: { text: string; tone: "good" | "warn" | "bad" | "neutral" }) {
  const style = tone === "good" ? "border-emerald-500/35 text-emerald-300" : tone === "warn" ? "border-amber-500/35 text-amber-300" : tone === "bad" ? "border-red-500/35 text-red-300" : "border-border/60 text-muted-foreground";
  return <span className={`border px-2 py-1 text-[9px] uppercase tracking-[0.1em] break-words ${style}`}>{text}</span>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="border border-border/40 p-3 min-w-0"><p className="text-[9px] uppercase tracking-[0.11em] text-muted-foreground">{label}</p><p className="text-xs mt-1 break-all text-foreground/75">{value}</p></div>;
}

function isPendingMigration(row: MediaRow) { return row.tags?.includes("migration:pending-owner-storage") === true; }
function isSocialBlocked(row: SocialRow) { return !row.image_url || !row.product_url || row.creative_status !== "asset_attached" || Boolean(row.risk_flags?.length); }
function searchMatch(needle: string, ...values: unknown[]) { return !needle || values.filter((value) => value != null).join(" ").toLowerCase().includes(needle); }
function humanize(value: string) { return value.replaceAll("_", " "); }
function stringValue(value: unknown) { return typeof value === "string" && value.trim() ? value.trim() : null; }

function mediaBlockReason(row: MediaRow) {
  const reasons: string[] = [];
  if (row.status !== "active") reasons.push("asset is archived");
  if (isPendingMigration(row)) reasons.push("owner-storage migration and technical verification are pending");
  if (row.verification_status === "migration_failed") reasons.push("source migration failed and requires recovery review");
  else if (row.verification_status !== "verified") reasons.push("technical verification is incomplete");
  if (!row.width_px || !row.height_px) reasons.push("dimensions are missing");
  if (!/^[a-f0-9]{64}$/i.test(row.checksum_sha256 || "")) reasons.push("SHA-256 checksum is missing");
  return [...new Set(reasons)].join("; ");
}
