import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileSearch,
  Globe2,
  ImageIcon,
  Package,
  RefreshCw,
  Search,
  Share2,
  ShieldCheck,
} from "lucide-react";
import ThumbnailImage from "@/components/ThumbnailImage";
import { supabase } from "@/integrations/supabase/client";
import type { AdminView } from "./AdminShell";

const db = supabase as any;

type WorkspaceTab = "media" | "products" | "seo" | "social";
type MediaFilter = "all" | "verified" | "pending_migration" | "migration_failed" | "social_approved";
type ProductFilter = "all" | "needs_information" | "verified" | "published";
type SeoFilter = "all" | "draft" | "ai_reviewed" | "approved" | "published";
type SocialFilter = "all" | "draft" | "asset_attached" | "blocked";

type MediaAsset = {
  id: string;
  file_name: string;
  title: string | null;
  public_url: string;
  thumbnail_url: string | null;
  mime_type: string;
  verification_status: string;
  social_approved: boolean;
  tags: string[] | null;
  usage_notes: string | null;
  width_px: number | null;
  height_px: number | null;
  checksum_sha256: string | null;
  status: string;
  updated_at: string;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  short_description: string | null;
  image_url: string | null;
  is_published: boolean;
  is_featured: boolean;
  category_id: string;
  updated_at: string;
};

type ProductReview = {
  product_id: string;
  status: string;
  reviewer_notes: string | null;
  not_applicable_fields: string[] | null;
  verified_at: string | null;
  updated_at: string;
};

type SeoPage = {
  id: string;
  locale: string;
  path: string;
  status: string;
  noindex: boolean;
  quality_score: number;
  native_review_status: string;
  cta: Record<string, unknown> | null;
  updated_at: string;
};

type SocialItem = {
  id: string;
  title: string;
  platform: string;
  status: string;
  creative_status: string;
  product_url: string | null;
  image_url: string | null;
  caption: string | null;
  call_to_action: string | null;
  risk_flags: string[] | null;
  updated_at: string;
};

type Snapshot = {
  media: MediaAsset[];
  products: Product[];
  reviews: ProductReview[];
  seo: SeoPage[];
  social: SocialItem[];
};

const emptySnapshot: Snapshot = { media: [], products: [], reviews: [], seo: [], social: [] };

export default function CatalogDataReviewWorkspace({ go }: { go: (view: AdminView) => void }) {
  const [tab, setTab] = useState<WorkspaceTab>("media");
  const [snapshot, setSnapshot] = useState<Snapshot>(emptySnapshot);
  const [query, setQuery] = useState("");
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("all");
  const [productFilter, setProductFilter] = useState<ProductFilter>("all");
  const [seoFilter, setSeoFilter] = useState<SeoFilter>("all");
  const [socialFilter, setSocialFilter] = useState<SocialFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [mediaResult, productResult, reviewResult, seoResult, socialResult] = await Promise.all([
      db.from("media_assets").select("id,file_name,title,public_url,thumbnail_url,mime_type,verification_status,social_approved,tags,usage_notes,width_px,height_px,checksum_sha256,status,updated_at").order("updated_at", { ascending: false }).limit(1200),
      db.from("products").select("id,name,slug,sku,short_description,image_url,is_published,is_featured,category_id,updated_at").order("name").limit(500),
      db.from("product_quality_reviews").select("product_id,status,reviewer_notes,not_applicable_fields,verified_at,updated_at").limit(500),
      db.from("seo_localized_pages").select("id,locale,path,status,noindex,quality_score,native_review_status,cta,updated_at").order("updated_at", { ascending: false }).limit(250),
      db.from("social_calendar_items").select("id,title,platform,status,creative_status,product_url,image_url,caption,call_to_action,risk_flags,updated_at").order("updated_at", { ascending: false }).limit(250),
    ]);
    const firstError = [mediaResult, productResult, reviewResult, seoResult, socialResult].find((result) => result.error)?.error;
    if (firstError) {
      setError(firstError.message || "Catalog review data could not load.");
      setLoading(false);
      return;
    }
    setSnapshot({
      media: (mediaResult.data as MediaAsset[]) ?? [],
      products: (productResult.data as Product[]) ?? [],
      reviews: (reviewResult.data as ProductReview[]) ?? [],
      seo: (seoResult.data as SeoPage[]) ?? [],
      social: (socialResult.data as SocialItem[]) ?? [],
    });
    setError(null);
    setLastChecked(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const metrics = useMemo(() => deriveMetrics(snapshot), [snapshot]);
  const reviewMap = useMemo(() => new Map(snapshot.reviews.map((review) => [review.product_id, review])), [snapshot.reviews]);
  const needle = query.trim().toLowerCase();

  const mediaRows = useMemo(() => snapshot.media.filter((asset) => {
    const pendingMigration = isPendingMigration(asset);
    if (mediaFilter === "verified" && asset.verification_status !== "verified") return false;
    if (mediaFilter === "pending_migration" && !pendingMigration) return false;
    if (mediaFilter === "migration_failed" && asset.verification_status !== "migration_failed") return false;
    if (mediaFilter === "social_approved" && !asset.social_approved) return false;
    return matches(needle, asset.file_name, asset.title, asset.verification_status, asset.tags?.join(" "), asset.usage_notes);
  }), [mediaFilter, needle, snapshot.media]);

  const productRows = useMemo(() => snapshot.products.filter((product) => {
    const review = reviewMap.get(product.id);
    if (productFilter === "needs_information" && review?.status !== "needs_information") return false;
    if (productFilter === "verified" && review?.status !== "verified") return false;
    if (productFilter === "published" && !product.is_published) return false;
    return matches(needle, product.name, product.sku, product.short_description, review?.status, review?.reviewer_notes);
  }), [needle, productFilter, reviewMap, snapshot.products]);

  const seoRows = useMemo(() => snapshot.seo.filter((page) => {
    if (seoFilter !== "all" && page.status !== seoFilter) return false;
    return matches(needle, page.locale, page.path, page.status, page.native_review_status);
  }), [needle, seoFilter, snapshot.seo]);

  const socialRows = useMemo(() => snapshot.social.filter((item) => {
    if (socialFilter === "draft" && item.status !== "draft") return false;
    if (socialFilter === "asset_attached" && item.creative_status !== "asset_attached") return false;
    if (socialFilter === "blocked" && !socialBlocked(item)) return false;
    return matches(needle, item.title, item.platform, item.status, item.creative_status, item.caption, item.call_to_action);
  }), [needle, snapshot.social, socialFilter]);

  return (
    <section className="border border-border/60 bg-card/25" aria-labelledby="catalog-data-review-title">
      <div className="p-4 sm:p-5 md:p-6 border-b border-border/60 flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
        <div className="flex items-start gap-3 min-w-0">
          <FileSearch size={20} className="text-gold shrink-0 mt-1" />
          <div className="min-w-0">
            <p className="eyebrow mb-2">Owner Data Review</p>
            <h2 id="catalog-data-review-title" className="font-display text-2xl md:text-3xl">Catalog, media, SEO & social evidence</h2>
            <p className="text-sm text-foreground/60 mt-2 max-w-3xl leading-relaxed">
              Review factual readiness before approving media, product claims, localized pages or social publishing. This workspace is read-only and never sends or publishes anything.
            </p>
          </div>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="min-h-11 inline-flex items-center justify-center gap-2 border border-border/60 px-4 py-2 text-[10px] uppercase tracking-[0.16em] hover:border-gold hover:text-gold disabled:opacity-50">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh evidence
        </button>
      </div>

      {error && <div className="border-b border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive flex items-start gap-2"><AlertTriangle size={16} className="shrink-0 mt-0.5" /><span className="break-words">{error}</span></div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 border-b border-border/60">
        <Metric label="Verified media" value={metrics.verifiedMedia} tone="good" />
        <Metric label="Storage pending" value={metrics.pendingMigration} tone={metrics.pendingMigration ? "warn" : "good"} />
        <Metric label="Migration failed" value={metrics.migrationFailed} tone={metrics.migrationFailed ? "bad" : "good"} />
        <Metric label="Social approved" value={metrics.socialApproved} tone="good" />
        <Metric label="Product review" value={metrics.productNeedsInfo} tone={metrics.productNeedsInfo ? "warn" : "good"} />
        <Metric label="SEO noindex" value={metrics.seoNoindex} tone={metrics.seoNoindex ? "warn" : "good"} />
        <Metric label="Social drafts" value={metrics.socialDrafts} tone={metrics.socialDrafts ? "warn" : "good"} />
        <Metric label="Social blocked" value={metrics.socialBlocked} tone={metrics.socialBlocked ? "bad" : "good"} />
      </div>

      <div className="border-b border-border/60 p-3 sm:p-4 flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1">
          <TabButton active={tab === "media"} onClick={() => setTab("media")} icon={<ImageIcon size={14} />} label="Media" count={snapshot.media.length} />
          <TabButton active={tab === "products"} onClick={() => setTab("products")} icon={<Package size={14} />} label="Products" count={snapshot.products.length} />
          <TabButton active={tab === "seo"} onClick={() => setTab("seo")} icon={<Globe2 size={14} />} label="SEO" count={snapshot.seo.length} />
          <TabButton active={tab === "social"} onClick={() => setTab("social")} icon={<Share2 size={14} />} label="Social" count={snapshot.social.length} />
        </div>
        <label className="relative min-w-0 lg:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search current review queue…" className="min-h-11 w-full border border-border/60 bg-background/50 pl-9 pr-3 text-sm outline-none focus:border-gold" />
        </label>
      </div>

      <div className="p-4 md:p-5 min-w-0">
        {tab === "media" && <MediaReview rows={mediaRows} filter={mediaFilter} setFilter={setMediaFilter} go={() => go("media")} />}
        {tab === "products" && <ProductReviewList rows={productRows} reviewMap={reviewMap} filter={productFilter} setFilter={setProductFilter} go={() => go("products")} />}
        {tab === "seo" && <SeoReview rows={seoRows} filter={seoFilter} setFilter={setSeoFilter} go={() => go("seo")} />}
        {tab === "social" && <SocialReview rows={socialRows} filter={socialFilter} setFilter={setSocialFilter} go={() => go("social")} />}
      </div>

      <div className="border-t border-border/60 px-4 sm:px-5 py-3 text-[10px] uppercase tracking-[0.14em] text-foreground/45 flex justify-between gap-3 flex-wrap">
        <span>Approval gates preserved · no automatic publish</span>
        <span>{loading ? "Refreshing…" : lastChecked ? `Checked ${lastChecked.toLocaleString()}` : "Not checked"}</span>
      </div>
    </section>
  );
}

function MediaReview({ rows, filter, setFilter, go }: { rows: MediaAsset[]; filter: MediaFilter; setFilter: (value: MediaFilter) => void; go: () => void }) {
  return (
    <div className="space-y-4">
      <SectionHeader title="Media technical readiness" description="Only active, technically verified media with dimensions and checksum is eligible for social approval." action="Open Media Library" onOpen={go} />
      <FilterBar values={[
        ["all", "All"], ["verified", "Verified"], ["pending_migration", "Storage pending"], ["migration_failed", "Migration failed"], ["social_approved", "Social approved"],
      ]} active={filter} onChange={(value) => setFilter(value as MediaFilter)} />
      {rows.length === 0 ? <Empty text="No media asset matches this review filter." /> : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {rows.slice(0, 120).map((asset) => {
            const pending = isPendingMigration(asset);
            const failed = asset.verification_status === "migration_failed";
            const eligible = mediaEligible(asset);
            const reason = mediaBlockReason(asset);
            return (
              <article key={asset.id} className="border border-border/50 bg-background/20 overflow-hidden min-w-0">
                <div className="aspect-[16/9] bg-background/50 flex items-center justify-center overflow-hidden">
                  {asset.mime_type.startsWith("image/") ? <ThumbnailImage src={asset.thumbnail_url || asset.public_url} originalSrc={asset.public_url} alt={asset.title || asset.file_name} className="w-full h-full object-cover" /> : <ImageIcon size={28} className="text-muted-foreground" />}
                </div>
                <div className="p-3 space-y-2 min-w-0">
                  <p className="text-sm break-words">{asset.title || asset.file_name}</p>
                  <p className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground break-words">{asset.width_px && asset.height_px ? `${asset.width_px}×${asset.height_px}` : "dimensions missing"} · {asset.status}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge text={humanize(asset.verification_status || "pending")} tone={failed ? "bad" : asset.verification_status === "verified" ? "good" : "warn"} />
                    {pending && <Badge text="owner storage pending" tone="warn" />}
                    {asset.social_approved && <Badge text="social approved" tone="good" />}
                    {!asset.social_approved && eligible && <Badge text="eligible for owner approval" tone="neutral" />}
                  </div>
                  {reason && <p className="text-[11px] text-amber-200/80 leading-relaxed break-words">Blocked: {reason}</p>}
                  {asset.usage_notes && <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-3 break-words">{asset.usage_notes}</p>}
                  <a href={asset.public_url} target="_blank" rel="noreferrer" className="min-h-9 inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.13em] text-gold"><ExternalLink size={11} /> Open source asset</a>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProductReviewList({ rows, reviewMap, filter, setFilter, go }: { rows: Product[]; reviewMap: Map<string, ProductReview>; filter: ProductFilter; setFilter: (value: ProductFilter) => void; go: () => void }) {
  return (
    <div className="space-y-4">
      <SectionHeader title="Product factual readiness" description="SKU and short descriptions are prepared; product-specific claims remain unverified until the quality review is completed." action="Open Products" onOpen={go} />
      <FilterBar values={[["all", "All"], ["needs_information", "Needs information"], ["verified", "Verified"], ["published", "Published"]]} active={filter} onChange={(value) => setFilter(value as ProductFilter)} />
      {rows.length === 0 ? <Empty text="No product matches this review filter." /> : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {rows.slice(0, 150).map((product) => {
            const review = reviewMap.get(product.id);
            return (
              <article key={product.id} className="border border-border/50 bg-background/20 p-4 min-w-0">
                <div className="flex items-start gap-3 min-w-0">
                  {product.image_url ? <img src={product.image_url} alt="" className="h-14 w-14 object-cover border border-border/40 shrink-0" loading="lazy" /> : <div className="h-14 w-14 border border-dashed border-border/50 flex items-center justify-center shrink-0"><Package size={18} className="text-muted-foreground" /></div>}
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-lg break-words">{product.name}</p>
                    <p className="text-[10px] text-gold mt-1 break-all">{product.sku || "SKU missing"}</p>
                  </div>
                  <Badge text={product.is_published ? "published" : "draft"} tone={product.is_published ? "good" : "neutral"} />
                </div>
                <p className="text-xs text-foreground/65 leading-relaxed mt-3 break-words">{product.short_description || "Short B2B description missing."}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge text={humanize(review?.status || "review missing")} tone={review?.status === "verified" ? "good" : "warn"} />
                  {product.is_featured && <Badge text="featured" tone="neutral" />}
                </div>
                {review?.reviewer_notes && <p className="text-[11px] text-amber-200/80 leading-relaxed mt-3 break-words">{review.reviewer_notes}</p>}
                {review?.verified_at && <p className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground mt-3">Verified {new Date(review.verified_at).toLocaleString()}</p>}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SeoReview({ rows, filter, setFilter, go }: { rows: SeoPage[]; filter: SeoFilter; setFilter: (value: SeoFilter) => void; go: () => void }) {
  return (
    <div className="space-y-4">
      <SectionHeader title="Localized SEO publishing gates" description="The real public route is /intl/:locale/:slug. Drafts remain noindex until quality, native review and explicit publish approval all pass." action="Open Google SEO" onOpen={go} />
      <FilterBar values={[["all", "All"], ["draft", "Draft"], ["ai_reviewed", "AI reviewed"], ["approved", "Approved"], ["published", "Published"]]} active={filter} onChange={(value) => setFilter(value as SeoFilter)} />
      {rows.length === 0 ? <Empty text="No localized page matches this review filter." /> : (
        <div className="space-y-3">
          {rows.map((page) => {
            const primaryHref = textValue(page.cta?.primary_href) || "Not set";
            const secondaryHref = textValue(page.cta?.secondary_href) || "Not set";
            const publishReady = page.status === "approved" && page.quality_score >= 80 && ["approved", "not_required"].includes(page.native_review_status);
            return (
              <article key={page.id} className="border border-border/50 bg-background/20 p-4 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-lg break-all">{page.path}</p>
                    <p className="text-[10px] uppercase tracking-[0.13em] text-muted-foreground mt-1">{page.locale} · score {page.quality_score} · native {humanize(page.native_review_status)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0"><Badge text={humanize(page.status)} tone={page.status === "published" ? "good" : page.status === "approved" ? "neutral" : "warn"} /><Badge text={page.noindex ? "noindex" : "indexable"} tone={page.noindex ? "warn" : "good"} />{publishReady && <Badge text="publish gate passed" tone="good" />}</div>
                </div>
                <dl className="grid sm:grid-cols-2 gap-2 mt-3 text-xs">
                  <Detail label="Primary CTA" value={primaryHref} />
                  <Detail label="Secondary CTA" value={secondaryHref} />
                </dl>
                {page.status === "published" && !page.noindex ? <a href={page.path} target="_blank" rel="noreferrer" className="mt-3 min-h-9 inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.13em] text-gold"><ExternalLink size={11} /> Open public page</a> : <p className="mt-3 text-[11px] text-amber-200/80">Public preview stays blocked until this page is published and indexable.</p>}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SocialReview({ rows, filter, setFilter, go }: { rows: SocialItem[]; filter: SocialFilter; setFilter: (value: SocialFilter) => void; go: () => void }) {
  return (
    <div className="space-y-4">
      <SectionHeader title="Social owner-review drafts" description="Each item shows the verified source asset, product destination, caption and CTA. Nothing in this workspace publishes automatically." action="Open Social Posts" onOpen={go} />
      <FilterBar values={[["all", "All"], ["draft", "Draft"], ["asset_attached", "Asset attached"], ["blocked", "Blocked"]]} active={filter} onChange={(value) => setFilter(value as SocialFilter)} />
      {rows.length === 0 ? <Empty text="No social item matches this review filter." /> : (
        <div className="grid lg:grid-cols-2 gap-3">
          {rows.map((item) => {
            const blocked = socialBlocked(item);
            return (
              <article key={item.id} className="border border-border/50 bg-background/20 overflow-hidden min-w-0">
                {item.image_url && <div className="aspect-[16/8] overflow-hidden bg-background/50"><ThumbnailImage src={item.image_url} originalSrc={item.image_url} alt="" className="w-full h-full object-cover" /></div>}
                <div className="p-4 min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><Badge text={item.platform} tone="neutral" /><Badge text={humanize(item.status)} tone={item.status === "published" ? "good" : "warn"} /><Badge text={humanize(item.creative_status)} tone={item.creative_status === "asset_attached" ? "good" : "warn" />{blocked && <Badge text="blocked" tone="bad" />}</div>
                  <h3 className="font-display text-lg mt-3 break-words">{item.title}</h3>
                  <p className="text-xs text-foreground/65 leading-relaxed mt-2 whitespace-pre-wrap break-words line-clamp-5">{item.caption || "Caption missing."}</p>
                  <p className="text-[11px] text-gold mt-3 break-words">CTA: {item.call_to_action || "Not set"}</p>
                  {item.product_url ? <a href={item.product_url} target="_blank" rel="noreferrer" className="mt-3 min-h-9 inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.13em] text-gold"><ExternalLink size={11} /> Open product destination</a> : <p className="mt-3 text-[11px] text-destructive">Blocked: product destination is missing.</p>}
                  {item.risk_flags?.length ? <p className="text-[10px] text-amber-200/80 mt-2 break-words">Risk flags: {item.risk_flags.join(" · ")}</p> : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SectionHeader({ title, description, action, onOpen }: { title: string; description: string; action: string; onOpen: () => void }) {
  return <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3"><div><h3 className="font-display text-xl">{title}</h3><p className="text-xs text-muted-foreground mt-1 max-w-3xl leading-relaxed">{description}</p></div><button type="button" onClick={onOpen} className="min-h-10 shrink-0 border border-border/60 px-3 text-[9px] uppercase tracking-[0.13em] hover:border-gold hover:text-gold">{action}</button></div>;
}

function TabButton({ active, onClick, icon, label, count }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count: number }) {
  return <button type="button" onClick={onClick} className={`min-h-11 inline-flex items-center justify-center gap-2 border px-3 text-[10px] uppercase tracking-[0.13em] ${active ? "border-gold bg-gold/10 text-gold" : "border-border/60 text-muted-foreground hover:border-gold/60"}`}>{icon}<span>{label}</span><span className="tabular-nums">{count}</span></button>;
}

function FilterBar({ values, active, onChange }: { values: Array<[string, string]>; active: string; onChange: (value: string) => void }) {
  return <div className="flex flex-wrap gap-2">{values.map(([value, label]) => <button key={value} type="button" onClick={() => onChange(value)} className={`min-h-9 border px-3 text-[9px] uppercase tracking-[0.12em] ${active === value ? "border-gold bg-gold/10 text-gold" : "border-border/50 text-muted-foreground hover:border-gold/60"}`}>{label}</button>)}</div>;
}

function Metric({ label, value, tone }: { label: string; value: number; tone: "good" | "warn" | "bad" }) {
  const color = tone === "good" ? "text-emerald-300" : tone === "warn" ? "text-gold" : "text-destructive";
  return <div className="p-3 sm:p-4 border-r border-b xl:border-b-0 border-border/60 min-w-0"><p className={`font-display text-2xl tabular-nums ${color}`}>{value.toLocaleString()}</p><p className="text-[9px] uppercase tracking-[0.13em] text-muted-foreground mt-1 leading-relaxed break-words">{label}</p></div>;
}

function Badge({ text, tone }: { text: string; tone: "good" | "warn" | "bad" | "neutral" }) {
  const style = tone === "good" ? "border-emerald-500/35 text-emerald-300" : tone === "warn" ? "border-amber-500/35 text-amber-300" : tone === "bad" ? "border-red-500/35 text-red-300" : "border-border/60 text-muted-foreground";
  return <span className={`border px-2 py-1 text-[9px] uppercase tracking-[0.11em] break-words ${style}`}>{text}</span>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="border border-border/40 p-3 min-w-0"><dt className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">{label}</dt><dd className="mt-1 break-all text-foreground/75">{value}</dd></div>;
}

function Empty({ text }: { text: string }) {
  return <div className="border border-dashed border-border/60 p-10 text-center"><ShieldCheck size={24} className="mx-auto text-muted-foreground" /><p className="text-sm text-muted-foreground mt-3">{text}</p></div>;
}

function deriveMetrics(snapshot: Snapshot) {
  return {
    verifiedMedia: snapshot.media.filter((asset) => asset.verification_status === "verified").length,
    pendingMigration: snapshot.media.filter(isPendingMigration).length,
    migrationFailed: snapshot.media.filter((asset) => asset.verification_status === "migration_failed").length,
    socialApproved: snapshot.media.filter((asset) => asset.social_approved).length,
    productNeedsInfo: snapshot.reviews.filter((review) => review.status === "needs_information").length,
    seoNoindex: snapshot.seo.filter((page) => page.noindex).length,
    socialDrafts: snapshot.social.filter((item) => item.status === "draft").length,
    socialBlocked: snapshot.social.filter(socialBlocked).length,
  };
}

function isPendingMigration(asset: MediaAsset) {
  return asset.tags?.includes("migration:pending-owner-storage") === true;
}

function mediaEligible(asset: MediaAsset) {
  return asset.status === "active"
    && asset.verification_status === "verified"
    && Boolean(asset.width_px && asset.width_px >= 100)
    && Boolean(asset.height_px && asset.height_px >= 100)
    && /^[a-f0-9]{64}$/i.test(asset.checksum_sha256 || "")
    && (asset.mime_type.startsWith("image/") || asset.mime_type.startsWith("video/"));
}

function mediaBlockReason(asset: MediaAsset) {
  const reasons: string[] = [];
  if (asset.status !== "active") reasons.push("asset is archived");
  if (isPendingMigration(asset)) reasons.push("owner-storage migration and technical verification are pending");
  if (asset.verification_status === "migration_failed") reasons.push("source migration failed and requires recovery review");
  else if (asset.verification_status !== "verified") reasons.push("technical verification is incomplete");
  if (!asset.width_px || !asset.height_px) reasons.push("dimensions are missing");
  if (!/^[a-f0-9]{64}$/i.test(asset.checksum_sha256 || "")) reasons.push("SHA-256 checksum is missing");
  return [...new Set(reasons)].join("; ");
}

function socialBlocked(item: SocialItem) {
  return !item.image_url || !item.product_url || item.creative_status !== "asset_attached" || Boolean(item.risk_flags?.length);
}

function matches(needle: string, ...values: unknown[]) {
  if (!needle) return true;
  return values.filter((value) => value != null).join(" ").toLowerCase().includes(needle);
}

function humanize(value: string) {
  return value.replaceAll("_", " ");
}

function textValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
