import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight,
  BellRing,
  BookOpen,
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  FolderTree,
  Inbox,
  ListChecks,
  Loader2,
  Mail,
  MessageSquareText,
  Package,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { AdminView } from "@/components/admin/AdminShell";

const db = supabase as any;

type Snapshot = {
  readyBuyers: number | null;
  reviewBuyers: number | null;
  crmBuyers: number | null;
  newInquiries: number | null;
  catalogueRequests: number | null;
  unreadChat: number | null;
  outreachDrafts: number | null;
  overdueTasks: number | null;
  quoteReviews: number | null;
  activePipeline: number | null;
  activeSamples: number | null;
  products: number | null;
  publishedProducts: number | null;
  categories: number | null;
  publishedCategories: number | null;
  media: number | null;
  pdfCatalogues: number | null;
};

type HubProps = { go: (view: AdminView) => void };

type Action = {
  title: string;
  description: string;
  icon: ReactNode;
  onClick?: () => void;
  href?: string;
  badge?: number | null;
  emphasis?: "gold" | "emerald" | "normal";
};

function countValue(result: any): number | null {
  return result?.error ? null : Number(result?.count ?? 0);
}

function usePlainOwnerSnapshot() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [partialError, setPartialError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const now = new Date().toISOString();
    const results = await Promise.all([
      db.from("lead_candidates").select("id", { count: "exact", head: true }).eq("verification_status", "verified").is("imported_lead_id", null),
      db.from("lead_candidates").select("id", { count: "exact", head: true }).eq("verification_status", "needs_review").is("imported_lead_id", null),
      db.from("b2b_leads").select("id", { count: "exact", head: true }),
      db.from("inquiries").select("id", { count: "exact", head: true }).eq("status", "new"),
      db.from("catalogue_leads").select("id", { count: "exact", head: true }).eq("status", "new"),
      db.from("crm_notifications").select("id", { count: "exact", head: true }).eq("status", "unread").contains("metadata", { channel: "human_live_chat" }),
      db.from("outreach_messages").select("id", { count: "exact", head: true }).eq("status", "draft"),
      db.from("crm_tasks").select("id", { count: "exact", head: true }).eq("status", "open").lte("due_at", now),
      db.from("crm_quotations").select("id", { count: "exact", head: true }).eq("status", "owner_review"),
      db.from("b2b_leads").select("id,crm_status").limit(5000),
      db.from("crm_samples").select("id,status").limit(5000),
      db.from("products").select("id", { count: "exact", head: true }),
      db.from("products").select("id", { count: "exact", head: true }).eq("is_published", true),
      db.from("categories").select("id", { count: "exact", head: true }),
      db.from("categories").select("id", { count: "exact", head: true }).eq("is_published", true),
      db.from("media_assets").select("id", { count: "exact", head: true }).eq("status", "active"),
      db.from("categories").select("id", { count: "exact", head: true }).not("catalog_url", "is", null),
    ]);

    const [
      readyResult,
      reviewResult,
      crmResult,
      inquiryResult,
      catalogueResult,
      chatResult,
      draftResult,
      taskResult,
      quoteResult,
      pipelineResult,
      sampleResult,
      productsResult,
      publishedProductsResult,
      categoriesResult,
      publishedCategoriesResult,
      mediaResult,
      pdfResult,
    ] = results;

    const activePipeline = pipelineResult.error
      ? null
      : (pipelineResult.data ?? []).filter((row: any) => !["won", "lost"].includes(String(row.crm_status || "new").toLowerCase())).length;
    const activeSamples = sampleResult.error
      ? null
      : (sampleResult.data ?? []).filter((row: any) => !["accepted", "rejected", "cancelled"].includes(String(row.status || "new").toLowerCase())).length;

    setSnapshot({
      readyBuyers: countValue(readyResult),
      reviewBuyers: countValue(reviewResult),
      crmBuyers: countValue(crmResult),
      newInquiries: countValue(inquiryResult),
      catalogueRequests: countValue(catalogueResult),
      unreadChat: countValue(chatResult),
      outreachDrafts: countValue(draftResult),
      overdueTasks: countValue(taskResult),
      quoteReviews: countValue(quoteResult),
      activePipeline,
      activeSamples,
      products: countValue(productsResult),
      publishedProducts: countValue(publishedProductsResult),
      categories: countValue(categoriesResult),
      publishedCategories: countValue(publishedCategoriesResult),
      media: countValue(mediaResult),
      pdfCatalogues: countValue(pdfResult),
    });
    setPartialError(results.some((result: any) => Boolean(result.error)));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);
  return { snapshot, loading, partialError, refresh: load };
}

function value(value: number | null | undefined) {
  return value === null || value === undefined ? "—" : value.toLocaleString();
}

function sum(...items: Array<number | null | undefined>) {
  if (items.some((item) => item === null || item === undefined)) return null;
  return items.reduce<number>((total, item) => total + Number(item || 0), 0);
}

function PageHeader({ eyebrow, title, description, loading, refresh }: {
  eyebrow: string;
  title: string;
  description: string;
  loading: boolean;
  refresh: () => Promise<void>;
}) {
  return (
    <section className="rounded-xl border border-gold/35 bg-card/45 p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-3xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold">{eyebrow}</p>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl">{title}</h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground/65">{description}</p>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={loading} className="inline-flex min-h-11 w-fit items-center gap-2 rounded-md border border-border/60 px-4 text-[10px] uppercase tracking-[0.14em] hover:border-gold hover:text-gold disabled:opacity-40">
          {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Refresh
        </button>
      </div>
    </section>
  );
}

function Metric({ label, number, detail, attention = false }: { label: string; number: number | null | undefined; detail: string; attention?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 sm:p-5 ${attention && Number(number || 0) > 0 ? "border-amber-500/45 bg-amber-500/[0.06]" : "border-border/60 bg-card/30"}`}>
      <p className="font-display text-3xl tabular-nums">{value(number)}</p>
      <p className="mt-1 text-xs font-semibold">{label}</p>
      <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{detail}</p>
    </div>
  );
}

function ActionCard({ action }: { action: Action }) {
  const classes = [
    "group flex min-h-32 w-full items-start gap-4 rounded-xl border p-4 text-left transition-colors sm:p-5",
    action.emphasis === "emerald"
      ? "border-emerald-500/45 bg-emerald-500/[0.06] hover:border-emerald-400"
      : action.emphasis === "gold"
        ? "border-gold/45 bg-gold/[0.05] hover:border-gold"
        : "border-border/60 bg-card/25 hover:border-gold/60",
  ].join(" ");
  const content = (
    <>
      <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${action.emphasis === "emerald" ? "bg-emerald-500/15 text-emerald-300" : "bg-gold/10 text-gold"}`}>{action.icon}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-3">
          <span className="font-display text-xl leading-tight">{action.title}</span>
          <span className="flex items-center gap-2">
            {typeof action.badge === "number" && action.badge > 0 && <span className="inline-flex min-h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">{action.badge > 99 ? "99+" : action.badge}</span>}
            <ArrowRight size={16} className="shrink-0 opacity-50 transition-transform group-hover:translate-x-1 group-hover:opacity-100" />
          </span>
        </span>
        <span className="mt-2 block text-sm leading-relaxed text-foreground/60">{action.description}</span>
      </span>
    </>
  );
  return action.href
    ? <a href={action.href} className={classes}>{content}</a>
    : <button type="button" onClick={action.onClick} className={classes}>{content}</button>;
}

function PartialDataNotice({ show }: { show: boolean }) {
  if (!show) return null;
  return <p className="rounded-lg border border-amber-500/30 bg-amber-500/[0.04] px-4 py-3 text-xs text-amber-200">Some live counts are temporarily unavailable. Main actions remain usable; unavailable values show “—”.</p>;
}

function ActionsGrid({ actions }: { actions: Action[] }) {
  return <div className="grid gap-3 md:grid-cols-2">{actions.map((action) => <ActionCard key={action.title} action={action} />)}</div>;
}

export function PlainOwnerDashboard({ go }: HubProps) {
  const { snapshot, loading, partialError, refresh } = usePlainOwnerSnapshot();
  const newRequests = sum(snapshot?.newInquiries, snapshot?.catalogueRequests);
  const actions = useMemo<Action[]>(() => {
    const rows: Action[] = [];
    if (Number(snapshot?.unreadChat || 0) > 0) rows.push({ title: "Reply to waiting buyer", description: "Open the exact website conversation and reply now.", icon: <BellRing size={21} />, href: "/admin/live-chat", badge: snapshot?.unreadChat, emphasis: "emerald" });
    if (Number(newRequests || 0) > 0) rows.push({ title: "Review new requests", description: "Open new RFQs and catalogue requests that need a response.", icon: <Inbox size={21} />, onClick: () => go("leads"), badge: newRequests, emphasis: "gold" });
    if (Number(snapshot?.readyBuyers || 0) > 0) rows.push({ title: "Review best buyer leads", description: "Check A-priority buyers and activate only the companies you approve.", icon: <Users size={21} />, href: "/admin/lead-review", badge: snapshot?.readyBuyers, emphasis: "gold" });
    if (Number(snapshot?.overdueTasks || 0) > 0) rows.push({ title: "Complete due follow-ups", description: "Open sales progress and finish overdue buyer work.", icon: <ListChecks size={21} />, onClick: () => go("pipeline"), badge: snapshot?.overdueTasks });
    if (Number(snapshot?.quoteReviews || 0) > 0) rows.push({ title: "Review quotations", description: "Commercial documents waiting for owner review.", icon: <FileText size={21} />, onClick: () => go("commercial"), badge: snapshot?.quoteReviews });
    if (rows.length === 0) rows.push({ title: "Find new buyers", description: "Grow the pipeline with relevant wholesalers, importers and private-label brands.", icon: <Search size={21} />, onClick: () => go("lead_engine"), emphasis: "gold" });
    return rows.slice(0, 5);
  }, [go, newRequests, snapshot]);

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Plain Owner Mode" title="Today’s Business" description="Sirf woh kaam jo sales, buyers aur orders ko aage barhata hai. Technical tools default screen se hidden hain." loading={loading} refresh={refresh} />
      <PartialDataNotice show={partialError} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Metric label="Best buyers" number={snapshot?.readyBuyers} detail="Verified and ready for owner review" />
        <Metric label="New requests" number={newRequests} detail="RFQs and catalogue requests" attention />
        <Metric label="Live chats" number={snapshot?.unreadChat} detail="Waiting buyer conversations" attention />
        <Metric label="Due follow-ups" number={snapshot?.overdueTasks} detail="Open tasks due now" attention />
        <Metric label="Quote reviews" number={snapshot?.quoteReviews} detail="Waiting for owner decision" attention />
      </div>
      <section>
        <div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold">Do these next</p><h3 className="mt-1 font-display text-2xl">Priority actions</h3></div><ShieldCheck size={18} className="text-emerald-300" /></div>
        <ActionsGrid actions={actions} />
      </section>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ActionCard action={{ title: "Find Buyers", description: "Discover relevant wholesale companies.", icon: <Search size={20} />, onClick: () => go("lead_engine") }} />
        <ActionCard action={{ title: "Contact Buyers", description: "Prepare and approve personalized drafts.", icon: <Send size={20} />, onClick: () => go("mailing") }} />
        <ActionCard action={{ title: "Live Chat", description: "Reply to website buyers in real time.", icon: <MessageSquareText size={20} />, href: "/admin/live-chat", emphasis: "emerald", badge: snapshot?.unreadChat }} />
        <ActionCard action={{ title: "Create Quotation", description: "Prepare a quotation or proforma invoice.", icon: <FileText size={20} />, onClick: () => go("pi") }} />
      </div>
    </div>
  );
}

export function PlainBuyersHub({ go }: HubProps) {
  const { snapshot, loading, partialError, refresh } = usePlainOwnerSnapshot();
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Buyers" title="Find, review and contact buyers" description="Buyer ka poora flow ek jagah: discover, verify, approve, CRM mein activate, phir personalized contact." loading={loading} refresh={refresh} />
      <PartialDataNotice show={partialError} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Best buyers" number={snapshot?.readyBuyers} detail="Verified and not imported" />
        <Metric label="Needs review" number={snapshot?.reviewBuyers} detail="Contact or fit needs checking" attention />
        <Metric label="CRM buyers" number={snapshot?.crmBuyers} detail="Activated buyer records" />
        <Metric label="Active sales" number={snapshot?.activePipeline} detail="Buyers not marked won or lost" />
      </div>
      <ActionsGrid actions={[
        { title: "Find New Buyers", description: "Run targeted buyer research by country, product and buyer type.", icon: <Search size={21} />, onClick: () => go("lead_engine"), emphasis: "gold" },
        { title: "Review Ready Leads", description: "See A/B/C priority, validate contacts and approve CRM activation.", icon: <CheckCircle2 size={21} />, href: "/admin/lead-review", badge: sum(snapshot?.readyBuyers, snapshot?.reviewBuyers), emphasis: "gold" },
        { title: "Buyer CRM", description: "Open complete buyer profiles, contact details and history.", icon: <Users size={21} />, onClick: () => go("buyer360") },
        { title: "Contact Buyers", description: "Prepare personalized email drafts with owner approval controls.", icon: <Mail size={21} />, onClick: () => go("mailing"), badge: snapshot?.outreachDrafts },
      ]} />
    </div>
  );
}

export function PlainInboxHub({ go }: HubProps) {
  const { snapshot, loading, partialError, refresh } = usePlainOwnerSnapshot();
  const newRequests = sum(snapshot?.newInquiries, snapshot?.catalogueRequests);
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Inbox" title="Buyer messages and requests" description="Website chat, RFQs, catalogue requests aur approved email drafts. Unavailable channels ko active show nahi kiya jata." loading={loading} refresh={refresh} />
      <PartialDataNotice show={partialError} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Unread live chat" number={snapshot?.unreadChat} detail="Human website conversations" attention />
        <Metric label="New RFQs" number={snapshot?.newInquiries} detail="Website inquiry requests" attention />
        <Metric label="Catalogue requests" number={snapshot?.catalogueRequests} detail="Buyers requesting catalogues" attention />
        <Metric label="Draft messages" number={snapshot?.outreachDrafts} detail="Prepared, not sent" />
      </div>
      <ActionsGrid actions={[
        { title: "Live Chat", description: "Open waiting website conversations and reply immediately.", icon: <MessageSquareText size={21} />, href: "/admin/live-chat", badge: snapshot?.unreadChat, emphasis: "emerald" },
        { title: "New Requests", description: "Review RFQs and catalogue requests together.", icon: <Inbox size={21} />, onClick: () => go("leads"), badge: newRequests, emphasis: "gold" },
        { title: "Email Drafts", description: "Review personalized drafts. Nothing sends without approval.", icon: <Mail size={21} />, onClick: () => go("mailing"), badge: snapshot?.outreachDrafts },
        { title: "Buyer CRM", description: "Open the buyer profile before replying or following up.", icon: <Users size={21} />, onClick: () => go("buyer360") },
      ]} />
      <p className="rounded-lg border border-border/60 bg-card/25 px-4 py-3 text-xs leading-relaxed text-muted-foreground">WhatsApp will appear as a primary inbox action only after the business number and Cloud API authorization are verified.</p>
    </div>
  );
}

export function PlainSalesHub({ go }: HubProps) {
  const { snapshot, loading, partialError, refresh } = usePlainOwnerSnapshot();
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Sales" title="Move buyers toward an order" description="Follow-ups, quotations, samples, meetings aur production work ko simple sales flow mein manage karein." loading={loading} refresh={refresh} />
      <PartialDataNotice show={partialError} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Active pipeline" number={snapshot?.activePipeline} detail="Open buyer opportunities" />
        <Metric label="Due follow-ups" number={snapshot?.overdueTasks} detail="Open tasks due now" attention />
        <Metric label="Quote reviews" number={snapshot?.quoteReviews} detail="Owner approval required" attention />
        <Metric label="Active samples" number={snapshot?.activeSamples} detail="Not accepted, rejected or cancelled" />
      </div>
      <ActionsGrid actions={[
        { title: "Sales Progress", description: "Move buyers from inquiry to quotation, sample and order.", icon: <ListChecks size={21} />, onClick: () => go("pipeline"), badge: snapshot?.overdueTasks, emphasis: "gold" },
        { title: "Quotations & Deals", description: "Review meetings, samples and commercial documents.", icon: <BriefcaseBusiness size={21} />, onClick: () => go("commercial"), badge: snapshot?.quoteReviews },
        { title: "Create Quotation", description: "Prepare a buyer-ready quotation or proforma invoice.", icon: <FileText size={21} />, onClick: () => go("pi"), emphasis: "gold" },
        { title: "Samples & Production", description: "Track samples, production stages, quality and shipping readiness.", icon: <Package size={21} />, onClick: () => go("production"), badge: snapshot?.activeSamples },
      ]} />
    </div>
  );
}

export function PlainCatalogueHub({ go }: HubProps) {
  const { snapshot, loading, partialError, refresh } = usePlainOwnerSnapshot();
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Catalogue" title="Products and buyer-facing catalogue" description="Products, categories, images aur downloadable catalogues ko organized rakhein. SEO aur technical release checks advanced tools mein hain." loading={loading} refresh={refresh} />
      <PartialDataNotice show={partialError} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Products" number={snapshot?.products} detail={`${value(snapshot?.publishedProducts)} published`} />
        <Metric label="Categories" number={snapshot?.categories} detail={`${value(snapshot?.publishedCategories)} published`} />
        <Metric label="Media assets" number={snapshot?.media} detail="Active images, files and videos" />
        <Metric label="PDF links" number={snapshot?.pdfCatalogues} detail="Verified category downloads" />
      </div>
      <ActionsGrid actions={[
        { title: "Products", description: "Add, edit, review and publish buyer-facing products.", icon: <Package size={21} />, onClick: () => go("products"), emphasis: "gold" },
        { title: "Product Categories", description: "Organize products so buyers can find them easily.", icon: <FolderTree size={21} />, onClick: () => go("categories") },
        { title: "Media Library", description: "Manage verified product images, videos and reusable assets.", icon: <FileText size={21} />, onClick: () => go("media") },
        { title: "PDF Catalogues", description: "Review downloadable catalogues and public catalogue structure.", icon: <BookOpen size={21} />, onClick: () => go("catalogues") },
      ]} />
    </div>
  );
}
