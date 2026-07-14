import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  FileSearch,
  Globe2,
  ImageIcon,
  ListChecks,
  Package,
  RefreshCw,
  Send,
  Share2,
  ShieldCheck,
  UserSearch,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { AdminView } from "./AdminShell";

type LeadCandidate = {
  id: string;
  company_name: string;
  country: string | null;
  verification_status: string;
  verification_score: number | null;
  imported_lead_id: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  updated_at: string;
};

type ActivationBatch = {
  id: string;
  status: string;
  imported_count: number;
  skipped_count: number;
  failed_count: number;
  completed_at: string | null;
};

type OutreachCampaign = {
  id: string;
  name: string;
  status: string;
  selected_lead_count: number;
  draft_count: number;
  approved_count: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
};

type OutreachMessage = {
  id: string;
  recipient_company: string | null;
  recipient_email: string | null;
  language: string | null;
  subject: string | null;
  status: string;
  updated_at: string;
};

type MediaAsset = {
  id: string;
  title: string | null;
  verification_status: string;
  social_approved: boolean;
  tags: string[] | null;
  usage_notes: string | null;
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
  updated_at: string;
};

type ProductRow = {
  id: string;
  sku: string | null;
  short_description: string | null;
  is_published: boolean;
};

type ProductReview = { status: string };

type AutomationRun = {
  id: string;
  status: string;
  trigger_source: string;
  summary: Record<string, unknown> | null;
  external_execution: boolean;
  started_at: string;
};

type AutomationTask = {
  id: string;
  status: string;
  module: string;
  external_action: boolean;
  requires_approval: boolean;
};

type CrmTask = {
  id: string;
  status: string;
  source_type: string;
  title: string;
  due_at: string | null;
  priority: string;
};

type Snapshot = {
  leadCandidates: LeadCandidate[];
  crmLeadCount: number;
  buyerProfileCount: number;
  crmTasks: CrmTask[];
  activationBatches: ActivationBatch[];
  outreachCampaigns: OutreachCampaign[];
  outreachMessages: OutreachMessage[];
  mediaAssets: MediaAsset[];
  seoPages: SeoPage[];
  socialItems: SocialItem[];
  products: ProductRow[];
  productReviews: ProductReview[];
  automationRuns: AutomationRun[];
  automationTasks: AutomationTask[];
};

const emptySnapshot: Snapshot = {
  leadCandidates: [],
  crmLeadCount: 0,
  buyerProfileCount: 0,
  crmTasks: [],
  activationBatches: [],
  outreachCampaigns: [],
  outreachMessages: [],
  mediaAssets: [],
  seoPages: [],
  socialItems: [],
  products: [],
  productReviews: [],
  automationRuns: [],
  automationTasks: [],
};

const db = supabase as any;

export default function BackendActivationDashboard({ go }: { go: (view: AdminView) => void }) {
  const [snapshot, setSnapshot] = useState<Snapshot>(emptySnapshot);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [
      leadCandidates,
      crmLeads,
      buyerProfiles,
      crmTasks,
      activationBatches,
      outreachCampaigns,
      outreachMessages,
      mediaAssets,
      seoPages,
      socialItems,
      products,
      productReviews,
      automationRuns,
      automationTasks,
    ] = await Promise.all([
      db.from("lead_candidates").select("id,company_name,country,verification_status,verification_score,imported_lead_id,email,phone,whatsapp,updated_at").order("updated_at", { ascending: false }).limit(250),
      db.from("b2b_leads").select("id", { count: "exact", head: true }),
      db.from("crm_buyer_profiles").select("id", { count: "exact", head: true }).eq("source_type", "prospect"),
      db.from("crm_tasks").select("id,status,source_type,title,due_at,priority").eq("source_type", "prospect").order("due_at", { ascending: true }).limit(250),
      db.from("lead_activation_batches").select("id,status,imported_count,skipped_count,failed_count,completed_at").order("created_at", { ascending: false }).limit(8),
      db.from("outreach_campaigns").select("id,name,status,selected_lead_count,draft_count,approved_count,sent_count,failed_count,created_at").order("created_at", { ascending: false }).limit(12),
      db.from("outreach_messages").select("id,recipient_company,recipient_email,language,subject,status,updated_at").order("updated_at", { ascending: false }).limit(100),
      db.from("media_assets").select("id,title,verification_status,social_approved,tags,usage_notes,updated_at").order("updated_at", { ascending: false }).limit(1200),
      db.from("seo_localized_pages").select("id,locale,path,status,noindex,quality_score,native_review_status,updated_at").order("updated_at", { ascending: false }).limit(200),
      db.from("social_calendar_items").select("id,title,platform,status,creative_status,product_url,image_url,updated_at").order("updated_at", { ascending: false }).limit(200),
      db.from("products").select("id,sku,short_description,is_published").order("name").limit(500),
      db.from("product_quality_reviews").select("status").limit(500),
      db.from("automation_runs").select("id,status,trigger_source,summary,external_execution,started_at").order("started_at", { ascending: false }).limit(12),
      db.from("automation_tasks").select("id,status,module,external_action,requires_approval").order("created_at", { ascending: false }).limit(250),
    ]);

    const results = [
      leadCandidates,
      crmLeads,
      buyerProfiles,
      crmTasks,
      activationBatches,
      outreachCampaigns,
      outreachMessages,
      mediaAssets,
      seoPages,
      socialItems,
      products,
      productReviews,
      automationRuns,
      automationTasks,
    ];
    const queryError = results.find((result) => result.error)?.error;
    if (queryError) {
      setError(queryError.message || "Operational frontend data could not load.");
      setLoading(false);
      return;
    }

    setSnapshot({
      leadCandidates: (leadCandidates.data as LeadCandidate[]) ?? [],
      crmLeadCount: crmLeads.count ?? 0,
      buyerProfileCount: buyerProfiles.count ?? 0,
      crmTasks: (crmTasks.data as CrmTask[]) ?? [],
      activationBatches: (activationBatches.data as ActivationBatch[]) ?? [],
      outreachCampaigns: (outreachCampaigns.data as OutreachCampaign[]) ?? [],
      outreachMessages: (outreachMessages.data as OutreachMessage[]) ?? [],
      mediaAssets: (mediaAssets.data as MediaAsset[]) ?? [],
      seoPages: (seoPages.data as SeoPage[]) ?? [],
      socialItems: (socialItems.data as SocialItem[]) ?? [],
      products: (products.data as ProductRow[]) ?? [],
      productReviews: (productReviews.data as ProductReview[]) ?? [],
      automationRuns: (automationRuns.data as AutomationRun[]) ?? [],
      automationTasks: (automationTasks.data as AutomationTask[]) ?? [],
    });
    setError(null);
    setLastChecked(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const metrics = useMemo(() => deriveMetrics(snapshot), [snapshot]);
  const latestBatch = snapshot.activationBatches[0];
  const latestCampaign = snapshot.outreachCampaigns[0];
  const latestDrafts = snapshot.outreachMessages.filter((message) => message.status === "draft").slice(0, 5);
  const latestSeo = snapshot.seoPages.slice(0, 5);
  const latestRuns = snapshot.automationRuns.slice(0, 5);

  return (
    <section className="border border-border/60 bg-card/25" aria-labelledby="backend-activation-title">
      <div className="p-4 sm:p-5 md:p-6 border-b border-border/60 flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
        <div className="flex items-start gap-3 min-w-0">
          <ShieldCheck size={20} className="text-gold shrink-0 mt-1" />
          <div className="min-w-0">
            <p className="eyebrow mb-2">Backend Activation Frontend</p>
            <h2 id="backend-activation-title" className="font-display text-2xl md:text-3xl">Live operational readiness</h2>
            <p className="text-sm text-foreground/60 mt-2 max-w-3xl leading-relaxed">
              Read-only owner view of the activated CRM, outreach, media, SEO, social, product-quality and automation data. Drafts remain drafts and no external action is triggered here.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="min-h-11 inline-flex items-center justify-center gap-2 border border-border/60 px-4 py-2 text-[10px] uppercase tracking-[0.16em] hover:border-gold hover:text-gold disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh readiness
        </button>
      </div>

      {error && (
        <div className="border-b border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive flex items-start gap-2">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span className="break-words">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 border-b border-border/60">
        <Metric label="CRM leads" value={metrics.crmLeads} tone="good" />
        <Metric label="Buyer profiles" value={metrics.buyerProfiles} tone={metrics.buyerProfiles === metrics.crmLeads ? "good" : "warn"} />
        <Metric label="Open tasks" value={metrics.openCrmTasks} tone={metrics.openCrmTasks > 0 ? "warn" : "good"} />
        <Metric label="Outreach drafts" value={metrics.outreachDrafts} tone={metrics.outreachDrafts > 0 ? "warn" : "good"} />
        <Metric label="Verified media" value={metrics.verifiedMedia} tone="good" />
        <Metric label="Media blocked" value={metrics.blockedMedia} tone={metrics.blockedMedia > 0 ? "warn" : "good"} />
        <Metric label="SEO drafts" value={metrics.seoDrafts} tone={metrics.seoDrafts > 0 ? "warn" : "good"} />
        <Metric label="Social drafts" value={metrics.socialDrafts} tone={metrics.socialDrafts > 0 ? "warn" : "good"} />
      </div>

      <div className="p-4 md:p-5 grid xl:grid-cols-2 gap-4">
        <ReadinessCard
          title="Lead activation & CRM"
          icon={<UserSearch size={16} />}
          actionLabel="Open new buyers"
          onOpen={() => go("lead_engine")}
          facts={[
            ["Candidates imported", String(metrics.importedCandidates)],
            ["Candidates waiting review", String(metrics.reviewCandidates)],
            ["CRM leads", String(metrics.crmLeads)],
            ["Buyer profiles", String(metrics.buyerProfiles)],
            ["Open prospect tasks", String(metrics.openCrmTasks)],
          ]}
        >
          <MiniStatus
            label="Latest activation batch"
            value={latestBatch ? `${humanize(latestBatch.status)} · ${latestBatch.imported_count} imported · ${latestBatch.failed_count} failed` : "No batch recorded"}
            tone={latestBatch?.failed_count ? "bad" : latestBatch ? "good" : "neutral"}
          />
        </ReadinessCard>

        <ReadinessCard
          title="Outreach review queue"
          icon={<Send size={16} />}
          actionLabel="Open email & follow-ups"
          onOpen={() => go("mailing")}
          facts={[
            ["Draft", String(metrics.outreachDrafts)],
            ["Approved", String(metrics.outreachApproved)],
            ["Sent", String(metrics.outreachSent)],
            ["Failed", String(metrics.outreachFailed)],
          ]}
        >
          <MiniStatus
            label="Latest campaign"
            value={latestCampaign ? `${latestCampaign.name} · ${humanize(latestCampaign.status)}` : "No campaign recorded"}
            tone={latestCampaign?.failed_count ? "bad" : latestCampaign ? "good" : "neutral"}
          />
          <CompactList
            empty="No outreach draft is waiting for owner review."
            rows={latestDrafts.map((draft) => ({
              id: draft.id,
              title: draft.subject || "Untitled outreach draft",
              detail: `${draft.recipient_company || "Buyer"} · ${draft.language || "Language not set"} · ${draft.recipient_email || "No email"}`,
            }))}
          />
        </ReadinessCard>

        <ReadinessCard
          title="Media & product quality"
          icon={<ImageIcon size={16} />}
          actionLabel="Open media library"
          onOpen={() => go("media")}
          facts={[
            ["Verified assets", String(metrics.verifiedMedia)],
            ["Social approved", String(metrics.socialApprovedMedia)],
            ["Pending owner storage", String(metrics.pendingMigrationMedia)],
            ["Migration failed", String(metrics.failedMigrationMedia)],
            ["Published products", String(metrics.publishedProducts)],
            ["Products needing factual review", String(metrics.productsNeedingReview)],
          ]}
        >
          <MiniStatus
            label="Catalog data"
            value={metrics.missingProductIdentifiers === 0 ? "All products have SKU and short B2B description" : `${metrics.missingProductIdentifiers} products are missing SKU or short description`}
            tone={metrics.missingProductIdentifiers === 0 ? "good" : "bad"}
          />
        </ReadinessCard>

        <ReadinessCard
          title="SEO & social publishing gates"
          icon={<Globe2 size={16} />}
          actionLabel="Open Google SEO"
          onOpen={() => go("seo")}
          facts={[
            ["SEO draft", String(metrics.seoDrafts)],
            ["AI reviewed", String(metrics.seoReviewed)],
            ["Approved", String(metrics.seoApproved)],
            ["Published", String(metrics.seoPublished)],
            ["Noindex", String(metrics.seoNoindex)],
            ["Social draft", String(metrics.socialDrafts)],
            ["Asset attached", String(metrics.socialAssetAttached)],
            ["Missing product URL", String(metrics.socialMissingProductUrl)],
          ]}
        >
          <CompactList
            empty="No localized SEO page is stored."
            rows={latestSeo.map((page) => ({
              id: page.id,
              title: page.path,
              detail: `${page.locale} · ${humanize(page.status)} · score ${page.quality_score} · ${page.noindex ? "noindex" : "indexable"} · native ${humanize(page.native_review_status)}`,
            }))}
          />
        </ReadinessCard>
      </div>

      <div className="border-t border-border/60 p-4 md:p-5 grid xl:grid-cols-[1.05fr_0.95fr] gap-4">
        <div className="border border-border/50 p-4 min-w-0">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 text-gold"><Activity size={15} /><p className="text-xs uppercase tracking-[0.18em]">Automation run truth</p></div>
            <span className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">External execution disabled</span>
          </div>
          {latestRuns.length === 0 ? (
            <p className="text-xs text-muted-foreground">No automation run recorded.</p>
          ) : (
            <div className="space-y-2">
              {latestRuns.map((run) => {
                const reason = textValue(run.summary?.reason) || textValue(run.summary?.note);
                const taskCount = numericValue(run.summary?.tasks_created);
                return (
                  <div key={run.id} className="border-b border-border/30 pb-2 last:border-0 text-xs flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="min-w-0">
                      <p className="capitalize">{run.trigger_source} · <RunStatus status={run.status} /></p>
                      <p className="text-muted-foreground mt-1">{new Date(run.started_at).toLocaleString()} · tasks {taskCount ?? "—"}</p>
                      {reason && <p className="text-foreground/60 mt-1 break-words">{humanize(reason)}</p>}
                    </div>
                    <span className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground shrink-0">external {run.external_execution ? "yes" : "no"}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border border-border/50 p-4 min-w-0">
          <div className="flex items-center gap-2 text-gold mb-3"><ListChecks size={15} /><p className="text-xs uppercase tracking-[0.18em]">Approval-controlled tasks</p></div>
          <div className="grid grid-cols-2 gap-2">
            <SmallMetric label="Draft" value={metrics.automationDraftTasks} />
            <SmallMetric label="Ready for review" value={metrics.automationReviewTasks} />
            <SmallMetric label="Approved internal" value={metrics.automationApprovedTasks} />
            <SmallMetric label="Failed / blocked" value={metrics.automationFailedTasks} tone={metrics.automationFailedTasks ? "bad" : "good"} />
          </div>
          <div className="mt-3 border border-emerald-500/20 bg-emerald-500/[0.04] p-3 flex items-start gap-2 text-xs text-foreground/65">
            <CheckCircle2 size={14} className="text-emerald-300 shrink-0 mt-0.5" />
            <span>Skipped zero-task runs are shown as skipped, not as completed work. Email, WhatsApp, social and SEO publication remain owner-controlled.</span>
          </div>
        </div>
      </div>

      <div className="border-t border-border/60 px-4 sm:px-5 py-3 text-[10px] uppercase tracking-[0.14em] text-foreground/45 flex justify-between gap-3 flex-wrap">
        <span>Read-only frontend · no external action</span>
        <span>{loading ? "Refreshing…" : lastChecked ? `Checked ${lastChecked.toLocaleString()}` : "Not checked"}</span>
      </div>
    </section>
  );
}

function deriveMetrics(snapshot: Snapshot) {
  const candidates = countBy(snapshot.leadCandidates, (row) => row.verification_status);
  const outreach = countBy(snapshot.outreachMessages, (row) => row.status);
  const reviews = countBy(snapshot.productReviews, (row) => row.status);
  const seo = countBy(snapshot.seoPages, (row) => row.status);
  const social = countBy(snapshot.socialItems, (row) => row.status);
  const creative = countBy(snapshot.socialItems, (row) => row.creative_status);
  const automation = countBy(snapshot.automationTasks, (row) => row.status);
  const pendingMigrationMedia = snapshot.mediaAssets.filter((asset) => asset.tags?.includes("migration:pending-owner-storage")).length;
  const failedMigrationMedia = snapshot.mediaAssets.filter((asset) => asset.verification_status === "migration_failed").length;
  const blockedMedia = snapshot.mediaAssets.filter((asset) => asset.verification_status !== "verified").length;
  const missingProductIdentifiers = snapshot.products.filter((product) => !product.sku?.trim() || !product.short_description?.trim()).length;

  return {
    crmLeads: snapshot.crmLeadCount,
    buyerProfiles: snapshot.buyerProfileCount,
    importedCandidates: candidates.imported ?? 0,
    reviewCandidates: (candidates.needs_review ?? 0) + (candidates.unverified ?? 0) + (candidates.verified ?? 0),
    openCrmTasks: snapshot.crmTasks.filter((task) => task.status === "open").length,
    outreachDrafts: outreach.draft ?? 0,
    outreachApproved: outreach.approved ?? 0,
    outreachSent: outreach.sent ?? 0,
    outreachFailed: outreach.failed ?? 0,
    verifiedMedia: snapshot.mediaAssets.filter((asset) => asset.verification_status === "verified").length,
    socialApprovedMedia: snapshot.mediaAssets.filter((asset) => asset.verification_status === "verified" && asset.social_approved).length,
    pendingMigrationMedia,
    failedMigrationMedia,
    blockedMedia,
    publishedProducts: snapshot.products.filter((product) => product.is_published).length,
    productsNeedingReview: reviews.needs_information ?? 0,
    missingProductIdentifiers,
    seoDrafts: seo.draft ?? 0,
    seoReviewed: seo.ai_reviewed ?? 0,
    seoApproved: seo.approved ?? 0,
    seoPublished: seo.published ?? 0,
    seoNoindex: snapshot.seoPages.filter((page) => page.noindex).length,
    socialDrafts: social.draft ?? 0,
    socialAssetAttached: creative.asset_attached ?? 0,
    socialMissingProductUrl: snapshot.socialItems.filter((item) => !item.product_url?.trim()).length,
    automationDraftTasks: automation.draft ?? 0,
    automationReviewTasks: automation.ready_for_review ?? 0,
    automationApprovedTasks: automation.approved ?? 0,
    automationFailedTasks: (automation.failed ?? 0) + (automation.blocked ?? 0),
  };
}

function Metric({ label, value, tone }: { label: string; value: number; tone: "good" | "warn" | "bad" }) {
  const color = tone === "good" ? "text-emerald-300" : tone === "warn" ? "text-gold" : "text-destructive";
  return (
    <div className="p-3 sm:p-4 border-r border-b xl:border-b-0 border-border/60 min-w-0">
      <p className={`font-display text-2xl tabular-nums ${color}`}>{value.toLocaleString()}</p>
      <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground mt-1 leading-relaxed break-words">{label}</p>
    </div>
  );
}

function ReadinessCard({
  title,
  icon,
  actionLabel,
  onOpen,
  facts,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  actionLabel: string;
  onOpen: () => void;
  facts: Array<[string, string]>;
  children?: React.ReactNode;
}) {
  return (
    <article className="border border-border/50 p-4 sm:p-5 min-w-0 overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-gold min-w-0">{icon}<h3 className="text-xs uppercase tracking-[0.18em] break-words">{title}</h3></div>
        <button type="button" onClick={onOpen} className="min-h-9 shrink-0 border border-border/60 px-3 text-[9px] uppercase tracking-[0.13em] hover:border-gold hover:text-gold">{actionLabel}</button>
      </div>
      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 mt-4">
        {facts.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-[9px] uppercase tracking-[0.13em] text-muted-foreground leading-relaxed">{label}</dt>
            <dd className="font-display text-xl mt-1 break-words tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      {children && <div className="mt-4 space-y-3">{children}</div>}
    </article>
  );
}

function MiniStatus({ label, value, tone }: { label: string; value: string; tone: "good" | "bad" | "neutral" }) {
  const style = tone === "good" ? "border-emerald-500/25 bg-emerald-500/[0.04]" : tone === "bad" ? "border-destructive/35 bg-destructive/[0.05]" : "border-border/50 bg-background/30";
  return (
    <div className={`border p-3 ${style}`}>
      <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="text-xs text-foreground/75 mt-1 leading-relaxed break-words">{value}</p>
    </div>
  );
}

function CompactList({ rows, empty }: { rows: Array<{ id: string; title: string; detail: string }>; empty: string }) {
  if (rows.length === 0) return <p className="text-xs text-muted-foreground">{empty}</p>;
  return (
    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
      {rows.map((row) => (
        <div key={row.id} className="border-b border-border/30 pb-2 last:border-0 min-w-0">
          <p className="text-xs break-words">{row.title}</p>
          <p className="text-[10px] text-muted-foreground mt-1 break-words leading-relaxed">{row.detail}</p>
        </div>
      ))}
    </div>
  );
}

function RunStatus({ status }: { status: string }) {
  const tone = status === "skipped" ? "text-amber-300" : status === "completed" ? "text-emerald-300" : status === "failed" ? "text-destructive" : "text-gold";
  return <span className={`${tone} font-medium`}>{humanize(status)}</span>;
}

function SmallMetric({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "neutral" | "good" | "bad" }) {
  const valueTone = tone === "good" ? "text-emerald-300" : tone === "bad" ? "text-destructive" : "text-gold";
  return (
    <div className="border border-border/40 p-3 min-w-0">
      <p className={`font-display text-xl tabular-nums ${valueTone}`}>{value}</p>
      <p className="text-[9px] uppercase tracking-[0.13em] text-muted-foreground mt-1 break-words">{label}</p>
    </div>
  );
}

function countBy<T>(rows: T[], key: (row: T) => string) {
  return rows.reduce<Record<string, number>>((result, row) => {
    const value = key(row) || "unknown";
    result[value] = (result[value] ?? 0) + 1;
    return result;
  }, {});
}

function humanize(value: string) {
  return value.replaceAll("_", " ");
}

function textValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numericValue(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
