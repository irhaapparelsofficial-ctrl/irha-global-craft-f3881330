import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Facebook,
  FileVideo2,
  Image,
  Instagram,
  Linkedin,
  Loader2,
  Megaphone,
  Pencil,
  Play,
  RefreshCw,
  Save,
  Search,
  Send,
  Sparkles,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type Platform = "facebook" | "instagram" | "linkedin" | "tiktok";
type ItemStatus = "draft" | "approved" | "scheduled" | "ready" | "publishing" | "published" | "verified_only" | "manual_required" | "failed" | "rejected" | "cancelled";
type ContentType = "text" | "single_image" | "carousel" | "reel";

type Product = {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  is_published: boolean;
};

type Campaign = {
  id: string;
  name: string;
  objective: string;
  product_id: string | null;
  product_focus: string[];
  target_markets: string[];
  platforms: Platform[];
  language: string;
  status: string;
  item_count: number;
  approved_count: number;
  published_count: number;
  failed_count: number;
  error: string | null;
  created_at: string;
};

type CalendarItem = {
  id: string;
  campaign_id: string;
  product_id: string | null;
  platform: Platform;
  content_type: ContentType;
  language: string;
  title: string;
  caption: string;
  hashtags: string[];
  call_to_action: string | null;
  product_url: string | null;
  image_url: string | null;
  video_url: string | null;
  carousel_outline: unknown[];
  reel_script: string | null;
  creative_brief: Record<string, unknown>;
  creative_status: string;
  scheduled_at: string | null;
  timezone: string;
  status: ItemStatus;
  risk_flags: string[];
  approved_by: string | null;
  approved_at: string | null;
  publish_attempts: number;
  external_post_id: string | null;
  external_post_url: string | null;
  connector_result: Record<string, unknown>;
  error: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

type DeliveryAttempt = {
  id: string;
  item_id: string;
  platform: Platform;
  attempt_number: number;
  status: string;
  response_snapshot: Record<string, unknown>;
  error: string | null;
  created_at: string;
};

type ChannelHealth = { configured?: boolean; verified?: boolean; publish_capable?: boolean; note?: string };
type Health = {
  ok?: boolean;
  database_ready?: boolean;
  ai_gateway_configured?: boolean;
  ready_to_generate?: boolean;
  channels?: Record<Platform, ChannelHealth>;
  creative_runtime?: {
    canva?: { deployed_runtime_connected?: boolean; note?: string };
    heygen?: { deployed_runtime_connected?: boolean; note?: string };
  };
  scheduling?: { unattended_cron_verified?: boolean; note?: string };
  limits?: { generate_items?: number; publish_items?: number };
  error?: string;
};

type CampaignDraft = {
  name: string;
  objective: string;
  productId: string;
  productFocus: string;
  targetMarkets: string;
  language: string;
  postsPerPlatform: number;
  contentTypes: ContentType[];
  platforms: Platform[];
  ownerNotes: string;
};

type ItemEdit = {
  title: string;
  caption: string;
  hashtags: string;
  callToAction: string;
  language: string;
  imageUrl: string;
  videoUrl: string;
  scheduledLocal: string;
};

const emptyDraft: CampaignDraft = {
  name: "",
  objective: "Create premium B2B content that introduces our manufacturing capability and drives qualified Request a Quote conversations.",
  productId: "",
  productFocus: "Bavarian & Trachten wear",
  targetMarkets: "Germany, Austria, Switzerland",
  language: "English",
  postsPerPlatform: 2,
  contentTypes: ["single_image", "carousel", "reel"],
  platforms: ["facebook", "instagram", "linkedin", "tiktok"],
  ownerNotes: "Use experienced manufacturer + newly built website positioning. Offer a live factory video call as a trust option.",
};

const platformIcon: Record<Platform, ReactNode> = {
  facebook: <Facebook size={14} />,
  instagram: <Instagram size={14} />,
  linkedin: <Linkedin size={14} />,
  tiktok: <FileVideo2 size={14} />,
};

const statusStyle: Record<ItemStatus, string> = {
  draft: "border-border/60 text-muted-foreground",
  approved: "border-amber-500/40 text-amber-300 bg-amber-500/10",
  scheduled: "border-blue-500/40 text-blue-300 bg-blue-500/10",
  ready: "border-cyan-500/40 text-cyan-300 bg-cyan-500/10",
  publishing: "border-blue-500/40 text-blue-300 bg-blue-500/10",
  published: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10",
  verified_only: "border-purple-500/40 text-purple-300 bg-purple-500/10",
  manual_required: "border-orange-500/40 text-orange-300 bg-orange-500/10",
  failed: "border-red-500/40 text-red-300 bg-red-500/10",
  rejected: "border-slate-500/40 text-slate-300 bg-slate-500/10",
  cancelled: "border-slate-500/40 text-slate-300 bg-slate-500/10",
};

const db = supabase as any;

export default function SocialPanel() {
  const [health, setHealth] = useState<Health | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [attempts, setAttempts] = useState<DeliveryAttempt[]>([]);
  const [draft, setDraft] = useState<CampaignDraft>(emptyDraft);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, ItemEdit>>({});
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [migrationReady, setMigrationReady] = useState(true);

  const loadHealth = async () => {
    const { data, error } = await supabase.functions.invoke("social-calendar", { body: { action: "health" } });
    setHealth(error ? { error: error.message } : (data as Health));
  };

  const load = async (campaignId = selectedCampaignId) => {
    setLoading(true);
    const [productResult, campaignResult, itemResult, attemptResult] = await Promise.all([
      db.from("products").select("id,name,slug,image_url,is_published").eq("is_published", true).order("name").limit(500),
      db.from("social_campaigns").select("*").order("created_at", { ascending: false }).limit(100),
      campaignId
        ? db.from("social_calendar_items").select("*").eq("campaign_id", campaignId).order("created_at", { ascending: false }).limit(500)
        : Promise.resolve({ data: [], error: null }),
      campaignId
        ? db.from("social_delivery_attempts").select("*").eq("campaign_id", campaignId).order("created_at", { ascending: false }).limit(200)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const migrationError = [campaignResult.error, itemResult.error, attemptResult.error].find(isMigrationError);
    if (migrationError) {
      setMigrationReady(false);
      setCampaigns([]);
      setItems([]);
      setAttempts([]);
    } else {
      setMigrationReady(true);
      const nextCampaigns = (campaignResult.data ?? []) as Campaign[];
      const nextItems = ((itemResult.data ?? []) as CalendarItem[]).map(normalizeItem);
      setCampaigns(nextCampaigns);
      setItems(nextItems);
      setAttempts(((attemptResult.data ?? []) as DeliveryAttempt[]).map((attempt) => ({
        ...attempt,
        response_snapshot: attempt.response_snapshot && typeof attempt.response_snapshot === "object" ? attempt.response_snapshot : {},
      })));
      setEdits(Object.fromEntries(nextItems.map((item) => [item.id, editFor(item)])));
      if (!campaignId && nextCampaigns[0]?.id) {
        setSelectedCampaignId(nextCampaigns[0].id);
        setLoading(false);
        await load(nextCampaigns[0].id);
        return;
      }
    }
    if (productResult.error) toast({ title: "Products could not load", description: productResult.error.message, variant: "destructive" });
    if (campaignResult.error && !isMigrationError(campaignResult.error)) toast({ title: "Social campaigns could not load", description: campaignResult.error.message, variant: "destructive" });
    setProducts((productResult.data ?? []) as Product[]);
    setLoading(false);
  };

  useEffect(() => {
    void Promise.all([load(), loadHealth()]);
  }, []);

  const activeCampaign = useMemo(() => campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? null, [campaigns, selectedCampaignId]);
  const filteredItems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      if (statusFilter && item.status !== statusFilter) return false;
      if (platformFilter && item.platform !== platformFilter) return false;
      if (!needle) return true;
      return [item.title, item.caption, item.platform, item.content_type, item.language, item.status, item.error]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [items, platformFilter, query, statusFilter]);
  const stats = useMemo(() => ({
    total: items.length,
    drafts: items.filter((item) => item.status === "draft").length,
    approved: items.filter((item) => ["approved", "scheduled", "ready"].includes(item.status)).length,
    published: items.filter((item) => item.status === "published").length,
    manual: items.filter((item) => ["manual_required", "verified_only"].includes(item.status)).length,
    failed: items.filter((item) => item.status === "failed").length,
  }), [items]);

  const generate = async () => {
    if (!draft.objective.trim() || draft.platforms.length === 0) {
      toast({ title: "Objective and platforms are required", variant: "destructive" });
      return;
    }
    if (!health?.ready_to_generate) {
      toast({ title: "Social AI generation is not ready", description: health?.error || "Check database and AI Gateway health.", variant: "destructive" });
      return;
    }
    const expected = draft.platforms.length * draft.postsPerPlatform;
    if (!window.confirm(`Create approximately ${expected} platform-specific content drafts? Nothing will be approved, scheduled or published.`)) return;

    setBusy("generate");
    const { data, error } = await supabase.functions.invoke("social-calendar", {
      body: {
        action: "generate",
        campaign: {
          name: draft.name,
          objective: draft.objective,
          product_id: draft.productId || null,
          product_focus: splitList(draft.productFocus),
          target_markets: splitList(draft.targetMarkets),
          platforms: draft.platforms,
          language: draft.language,
          posts_per_platform: draft.postsPerPlatform,
          content_types: draft.contentTypes,
          owner_notes: draft.ownerNotes,
        },
      },
    });
    setBusy(null);
    if (error || !data?.ok) {
      toast({ title: "Content generation failed", description: data?.error || error?.message || "No usable items returned", variant: "destructive" });
      return;
    }
    setSelectedCampaignId(data.campaign_id);
    setSelectedItemIds(new Set());
    toast({ title: "Social calendar drafts created", description: `${data.created ?? 0} drafts created. Nothing was published.` });
    await load(data.campaign_id);
  };

  const saveItem = async (item: CalendarItem, status: "draft" | "approved" | "rejected") => {
    const edit = edits[item.id];
    if (!edit?.title.trim() || !edit?.caption.trim()) {
      toast({ title: "Title and caption are required", variant: "destructive" });
      return;
    }
    setBusy(`save:${item.id}`);
    const { data, error } = await supabase.functions.invoke("social-calendar", {
      body: {
        action: "update",
        item_id: item.id,
        status,
        title: edit.title,
        caption: edit.caption,
        hashtags: splitList(edit.hashtags).map((tag) => tag.replace(/^#/, "")),
        call_to_action: edit.callToAction,
        language: edit.language,
        image_url: edit.imageUrl || null,
        video_url: edit.videoUrl || null,
        scheduled_at: edit.scheduledLocal ? new Date(edit.scheduledLocal).toISOString() : null,
        timezone: "Asia/Karachi",
      },
    });
    setBusy(null);
    if (error || !data?.ok) {
      toast({ title: "Calendar item update failed", description: data?.error || error?.message || "Unknown error", variant: "destructive" });
      return;
    }
    setEditingId(null);
    toast({ title: status === "approved" ? (data.item?.status === "scheduled" ? "Approved and scheduled" : "Approved for delivery") : status === "rejected" ? "Item rejected" : "Draft saved and approval cleared" });
    await load(selectedCampaignId);
  };

  const publishSelected = async () => {
    const max = health?.limits?.publish_items ?? 10;
    const ids = [...selectedItemIds].filter((id) => {
      const item = items.find((value) => value.id === id);
      return Boolean(item?.approved_at && ["approved", "scheduled", "ready", "failed"].includes(item.status));
    }).slice(0, max);
    if (ids.length === 0) {
      toast({ title: "Select approved, due or approved-failed items", variant: "destructive" });
      return;
    }
    if (!window.confirm(`Attempt delivery for ${ids.length} already-approved item${ids.length === 1 ? "" : "s"}? Exact platform results will be stored.`)) return;
    setBusy("publish");
    const { data, error } = await supabase.functions.invoke("social-calendar", { body: { action: "publish", item_ids: ids } });
    setBusy(null);
    if (error) {
      toast({ title: "Delivery request failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: data?.ok ? "Delivery attempts completed" : "No selected item published", description: summaryText(data?.summary) || data?.error || "See exact item results below.", variant: data?.ok ? "default" : "destructive" });
    setSelectedItemIds(new Set());
    await Promise.all([load(selectedCampaignId), loadHealth()]);
  };

  const publishDue = async () => {
    if (!window.confirm("Process approved scheduled items whose time has arrived? Future items will be skipped.")) return;
    setBusy("due");
    const { data, error } = await supabase.functions.invoke("social-calendar", { body: { action: "publish_due", limit: 10 } });
    setBusy(null);
    if (error) {
      toast({ title: "Due-item processing failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Due calendar checked", description: data?.outcomes?.length ? summaryText(data?.summary) : data?.note || "No due items." });
    await Promise.all([load(selectedCampaignId), loadHealth()]);
  };

  const selectCampaign = async (id: string) => {
    setSelectedCampaignId(id);
    setSelectedItemIds(new Set());
    setExpandedId(null);
    setEditingId(null);
    await load(id);
  };

  return (
    <div className="space-y-6">
      <section className="border border-gold/40 bg-gradient-to-br from-gold/10 via-card/40 to-background p-6 md:p-8">
        <div className="flex items-start justify-between gap-5 flex-wrap">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-gold mb-3"><Megaphone size={15} /> AI Social Operations</div>
            <h2 className="font-display text-3xl md:text-4xl">Content & Calendar Engine</h2>
            <p className="text-sm text-foreground/70 mt-3 leading-relaxed">
              Generate native B2B content per platform, review captions and creative briefs, attach final assets, approve and schedule items, then store exact Meta/LinkedIn delivery results. TikTok never counts profile verification as a published post.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button type="button" onClick={() => void publishDue()} disabled={busy !== null || !migrationReady} className="inline-flex items-center gap-2 border border-gold/60 text-gold px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] disabled:opacity-40">{busy === "due" ? <Loader2 size={12} className="animate-spin" /> : <CalendarClock size={12} />} Publish due now</button>
            <button type="button" onClick={() => void Promise.all([load(selectedCampaignId), loadHealth()])} className="inline-flex items-center gap-2 border border-border/60 px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] hover:border-gold hover:text-gold"><RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh</button>
          </div>
        </div>
      </section>

      <HealthPanel health={health} migrationReady={migrationReady} />

      <div className="grid xl:grid-cols-12 gap-6">
        <section className="xl:col-span-4 space-y-5">
          <div className="border border-border/60 bg-card/30 p-5">
            <p className="eyebrow mb-3">New AI campaign</p>
            <div className="space-y-3">
              <Field label="Campaign name"><input className="social-input" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="DACH Trachten launch" /></Field>
              <Field label="Published product"><select className="social-input" value={draft.productId} onChange={(event) => setDraft((current) => ({ ...current, productId: event.target.value }))}><option value="">General capability campaign</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></Field>
              <Field label="Product focus"><textarea rows={2} className="social-input resize-y" value={draft.productFocus} onChange={(event) => setDraft((current) => ({ ...current, productFocus: event.target.value }))} /></Field>
              <Field label="Target markets"><textarea rows={2} className="social-input resize-y" value={draft.targetMarkets} onChange={(event) => setDraft((current) => ({ ...current, targetMarkets: event.target.value }))} /></Field>
              <Field label="Objective *"><textarea rows={4} className="social-input resize-y" value={draft.objective} onChange={(event) => setDraft((current) => ({ ...current, objective: event.target.value }))} /></Field>
              <Field label="Language"><select className="social-input" value={draft.language} onChange={(event) => setDraft((current) => ({ ...current, language: event.target.value }))}><option>English</option><option>German</option><option>French</option><option>Italian</option><option>Spanish</option><option>Arabic</option></select></Field>
              <Field label="Posts per platform"><input type="number" min={1} max={7} className="social-input" value={draft.postsPerPlatform} onChange={(event) => setDraft((current) => ({ ...current, postsPerPlatform: Math.max(1, Math.min(7, Number(event.target.value) || 1)) }))} /></Field>
              <Field label="Platforms"><div className="grid grid-cols-2 gap-2">{(["facebook", "instagram", "linkedin", "tiktok"] as Platform[]).map((platform) => <label key={platform} className={`flex items-center gap-2 border p-2.5 cursor-pointer ${draft.platforms.includes(platform) ? "border-gold/60 bg-gold/5 text-gold" : "border-border/60 text-muted-foreground"}`}><input type="checkbox" checked={draft.platforms.includes(platform)} onChange={() => setDraft((current) => ({ ...current, platforms: toggleArray(current.platforms, platform) }))} />{platformIcon[platform]}<span className="text-[10px] uppercase tracking-[0.13em]">{platform}</span></label>)}</div></Field>
              <Field label="Content types"><div className="grid grid-cols-2 gap-2">{(["text", "single_image", "carousel", "reel"] as ContentType[]).map((type) => <label key={type} className={`border p-2.5 cursor-pointer text-[10px] uppercase tracking-[0.12em] ${draft.contentTypes.includes(type) ? "border-gold/60 bg-gold/5 text-gold" : "border-border/60 text-muted-foreground"}`}><input type="checkbox" className="mr-2" checked={draft.contentTypes.includes(type)} onChange={() => setDraft((current) => ({ ...current, contentTypes: toggleArray(current.contentTypes, type) }))} />{type.replace(/_/g, " ")}</label>)}</div></Field>
              <Field label="Owner notes"><textarea rows={3} className="social-input resize-y" value={draft.ownerNotes} onChange={(event) => setDraft((current) => ({ ...current, ownerNotes: event.target.value }))} /></Field>
            </div>
            <button type="button" onClick={() => void generate()} disabled={busy !== null || !migrationReady || draft.platforms.length === 0} className="mt-5 w-full inline-flex items-center justify-center gap-2 bg-gradient-gold text-primary-foreground px-5 py-3 text-[10px] uppercase tracking-[0.2em] disabled:opacity-40">{busy === "generate" ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Generate drafts only</button>
          </div>

          <div className="border border-border/60 bg-card/30 p-4">
            <div className="flex items-center justify-between gap-3 mb-3"><p className="eyebrow">Campaigns</p><span className="text-[10px] text-muted-foreground">{campaigns.length}</span></div>
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {campaigns.length === 0 && <p className="text-xs text-muted-foreground text-center py-5">No social campaigns yet.</p>}
              {campaigns.map((campaign) => <button key={campaign.id} type="button" onClick={() => void selectCampaign(campaign.id)} className={`w-full text-left border p-3 ${selectedCampaignId === campaign.id ? "border-gold/70 bg-gold/5" : "border-border/50 bg-background/20"}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-display text-lg truncate">{campaign.name}</p><p className="text-[9px] text-muted-foreground mt-1">{new Date(campaign.created_at).toLocaleString()}</p></div><span className="border border-border/60 px-2 py-1 text-[8px] uppercase tracking-[0.12em]">{campaign.status}</span></div><div className="grid grid-cols-3 gap-2 mt-3"><Mini label="Items" value={campaign.item_count} /><Mini label="Published" value={campaign.published_count} /><Mini label="Failed" value={campaign.failed_count} /></div>{campaign.error && <p className="text-[9px] text-destructive mt-2 line-clamp-2">{campaign.error}</p>}</button>)}
            </div>
          </div>
        </section>

        <section className="xl:col-span-8 space-y-5">
          {!activeCampaign ? <Empty icon={<Megaphone size={28} />} title="Select or create a campaign" body="AI calendar drafts and exact delivery results will appear here." /> : <>
            <div className="border border-border/60 bg-card/30 p-5"><div className="flex items-start justify-between gap-4 flex-wrap"><div><p className="text-[9px] uppercase tracking-[0.18em] text-gold">{activeCampaign.platforms.join(" · ")}</p><h3 className="font-display text-2xl mt-2">{activeCampaign.name}</h3><p className="text-xs text-foreground/60 mt-2 max-w-3xl">{activeCampaign.objective}</p></div><span className="text-[10px] text-muted-foreground">{activeCampaign.language}</span></div></div>

            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3"><Metric label="Items" value={stats.total} /><Metric label="Drafts" value={stats.drafts} /><Metric label="Approved" value={stats.approved} /><Metric label="Published" value={stats.published} /><Metric label="Manual" value={stats.manual} /><Metric label="Failed" value={stats.failed} /></div>

            <div className="flex flex-wrap items-center gap-3"><div className="flex items-center gap-2 border border-border/60 bg-card/30 px-3 py-2.5 flex-1 min-w-[240px]"><Search size={13} className="text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search captions, title, platform or errors…" className="bg-transparent outline-none text-xs w-full" /></div><select className="border border-border/60 bg-card/30 px-3 py-2.5 text-xs" value={platformFilter} onChange={(event) => setPlatformFilter(event.target.value)}><option value="">All platforms</option>{["facebook", "instagram", "linkedin", "tiktok"].map((platform) => <option key={platform} value={platform}>{platform}</option>)}</select><select className="border border-border/60 bg-card/30 px-3 py-2.5 text-xs" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">All statuses</option>{Object.keys(statusStyle).map((status) => <option key={status} value={status}>{status}</option>)}</select></div>

            {selectedItemIds.size > 0 && <div className="border border-gold/40 bg-gold/5 p-3 flex items-center justify-between gap-3 flex-wrap"><span className="text-xs text-gold">{selectedItemIds.size} approved item{selectedItemIds.size === 1 ? "" : "s"} selected</span><button type="button" onClick={() => void publishSelected()} disabled={busy !== null} className="inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-5 py-2.5 text-[10px] uppercase tracking-[0.18em] disabled:opacity-40">{busy === "publish" ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Attempt delivery</button></div>}

            <div className="space-y-3">
              {loading && <p className="text-sm text-muted-foreground py-10 text-center">Loading calendar…</p>}
              {!loading && filteredItems.length === 0 && <Empty icon={<CalendarClock size={24} />} title="No items in this view" body="Generate content or change the filters." />}
              {filteredItems.map((item) => {
                const edit = edits[item.id] ?? editFor(item);
                const isEditing = editingId === item.id;
                const selectable = Boolean(item.approved_at && ["approved", "scheduled", "ready", "failed"].includes(item.status));
                const attemptRows = attempts.filter((attempt) => attempt.item_id === item.id);
                return <article key={item.id} className={`border p-5 ${selectedItemIds.has(item.id) ? "border-gold/70 bg-gold/5" : "border-border/60 bg-card/30"}`}><div className="flex items-start gap-3"><input type="checkbox" checked={selectedItemIds.has(item.id)} disabled={!selectable} onChange={() => setSelectedItemIds((current) => toggleSet(current, item.id))} className="mt-1" /><div className="flex-1 min-w-0"><div className="flex items-start justify-between gap-4 flex-wrap"><div><div className="flex flex-wrap items-center gap-2"><Badge className={statusStyle[item.status]}>{item.status}</Badge><span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.14em] text-gold">{platformIcon[item.platform]} {item.platform}</span><span className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{item.content_type.replace(/_/g, " ")}</span><span className="text-[9px] text-muted-foreground">{item.language}</span></div><h4 className="font-display text-xl mt-2">{item.title}</h4>{item.scheduled_at && <p className="text-[10px] text-blue-300 mt-1">Scheduled {new Date(item.scheduled_at).toLocaleString()}</p>}</div><div className="flex gap-2"><button type="button" onClick={() => setEditingId(isEditing ? null : item.id)} disabled={["published", "verified_only", "manual_required", "publishing"].includes(item.status)} className="p-2 text-muted-foreground hover:text-gold disabled:opacity-30" aria-label="Edit item"><Pencil size={13} /></button><button type="button" onClick={() => void copyText(JSON.stringify(item.creative_brief, null, 2), "Creative handoff")} className="p-2 text-muted-foreground hover:text-gold" aria-label="Copy creative brief"><Copy size={13} /></button><button type="button" onClick={() => setExpandedId((current) => current === item.id ? null : item.id)} className="p-2 text-muted-foreground hover:text-gold" aria-label="Toggle details">{expandedId === item.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}</button></div></div>

                {isEditing ? <div className="mt-4 grid md:grid-cols-2 gap-3"><Field label="Title"><input className="social-input" value={edit.title} onChange={(event) => updateEdit(setEdits, item.id, { title: event.target.value })} /></Field><Field label="Language"><input className="social-input" value={edit.language} onChange={(event) => updateEdit(setEdits, item.id, { language: event.target.value })} /></Field><div className="md:col-span-2"><Field label="Caption"><textarea rows={7} className="social-input resize-y" value={edit.caption} onChange={(event) => updateEdit(setEdits, item.id, { caption: event.target.value })} /></Field></div><Field label="Hashtags"><textarea rows={2} className="social-input resize-y" value={edit.hashtags} onChange={(event) => updateEdit(setEdits, item.id, { hashtags: event.target.value })} /></Field><Field label="Call to action"><textarea rows={2} className="social-input resize-y" value={edit.callToAction} onChange={(event) => updateEdit(setEdits, item.id, { callToAction: event.target.value })} /></Field><Field label="Public image URL"><input className="social-input" value={edit.imageUrl} onChange={(event) => updateEdit(setEdits, item.id, { imageUrl: event.target.value })} placeholder="Required for Instagram single image" /></Field><Field label="Public video URL"><input className="social-input" value={edit.videoUrl} onChange={(event) => updateEdit(setEdits, item.id, { videoUrl: event.target.value })} placeholder="Required for reel delivery" /></Field><Field label="Schedule (Pakistan time)"><input type="datetime-local" className="social-input" value={edit.scheduledLocal} onChange={(event) => updateEdit(setEdits, item.id, { scheduledLocal: event.target.value })} /></Field><div className="md:col-span-2 flex gap-2 flex-wrap"><button type="button" onClick={() => void saveItem(item, "draft")} disabled={busy !== null} className="inline-flex items-center gap-2 border border-border/60 px-4 py-2 text-[9px] uppercase tracking-[0.16em]"><Save size={11} /> Save draft</button><button type="button" onClick={() => void saveItem(item, "approved")} disabled={busy !== null} className="inline-flex items-center gap-2 border border-emerald-500/50 text-emerald-300 px-4 py-2 text-[9px] uppercase tracking-[0.16em]"><CheckCircle2 size={11} /> {edit.scheduledLocal ? "Approve & schedule" : "Approve"}</button><button type="button" onClick={() => void saveItem(item, "rejected")} disabled={busy !== null} className="inline-flex items-center gap-2 border border-red-500/50 text-red-300 px-4 py-2 text-[9px] uppercase tracking-[0.16em]"><XCircle size={11} /> Reject</button></div></div> : <><p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed mt-4">{item.caption}</p>{item.hashtags.length > 0 && <p className="text-xs text-gold/80 mt-3">{item.hashtags.map((tag) => `#${tag}`).join(" ")}</p>}</>}

                <div className="flex flex-wrap gap-3 mt-4 text-[10px] text-muted-foreground"><span>Creative: {item.creative_status.replace(/_/g, " ")}</span><span>Attempts: {item.publish_attempts}</span>{item.published_at && <span className="text-emerald-300">Published {new Date(item.published_at).toLocaleString()}</span>}{item.external_post_url && <a href={item.external_post_url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-cyan-300 hover:underline">Open post <ExternalLink size={9} /></a>}</div>{item.error && <p className="text-xs text-destructive mt-3">{item.error}</p>}

                {expandedId === item.id && <div className="mt-4 border-t border-border/40 pt-4 space-y-4"><div><p className="text-[9px] uppercase tracking-[0.18em] text-gold mb-2">Creative handoff</p><pre className="text-[10px] whitespace-pre-wrap break-words border border-border/40 bg-background/30 p-3 max-h-64 overflow-auto">{JSON.stringify({ carousel_outline: item.carousel_outline, reel_script: item.reel_script, creative_brief: item.creative_brief, risk_flags: item.risk_flags }, null, 2)}</pre></div><div><p className="text-[9px] uppercase tracking-[0.18em] text-gold mb-2">Exact connector result</p><pre className="text-[10px] whitespace-pre-wrap break-words border border-border/40 bg-background/30 p-3 max-h-64 overflow-auto">{JSON.stringify(item.connector_result, null, 2)}</pre></div>{attemptRows.length > 0 && <div><p className="text-[9px] uppercase tracking-[0.18em] text-gold mb-2">Delivery attempts</p><div className="space-y-2">{attemptRows.map((attempt) => <div key={attempt.id} className="border border-border/40 p-3 text-[10px]"><div className="flex justify-between gap-3"><span>{attempt.platform} · attempt {attempt.attempt_number} · {attempt.status}</span><span className="text-muted-foreground">{new Date(attempt.created_at).toLocaleString()}</span></div>{attempt.error && <p className="text-destructive mt-2">{attempt.error}</p>}</div>)}</div></div>}</div>}
              </div></div></article>;
              })}
            </div>
          </>}
        </section>
      </div>

      <style>{`.social-input{width:100%;background:hsl(var(--input));border:1px solid hsl(var(--border));padding:.65rem .75rem;font-size:.75rem;outline:none}.social-input:focus{border-color:hsl(var(--primary))}`}</style>
    </div>
  );
}

function HealthPanel({ health, migrationReady }: { health: Health | null; migrationReady: boolean }) {
  if (!migrationReady) return <div className="border border-amber-500/40 bg-amber-500/10 p-5 flex items-start gap-3"><AlertTriangle size={18} className="text-amber-300 shrink-0" /><div><p className="font-medium">Social calendar migration pending</p><p className="text-xs text-foreground/65 mt-1">Publish/apply the latest migration before generating calendar items.</p></div></div>;
  if (!health) return <div className="border border-border/60 bg-card/30 p-4 text-xs text-muted-foreground">Checking social runtime…</div>;
  if (health.error) return <div className="border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">{health.error}</div>;
  return <div className="space-y-3"><div className={`border p-4 flex items-start gap-3 ${health.ready_to_generate ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/10"}`}>{health.ready_to_generate ? <CheckCircle2 size={17} className="text-emerald-300 shrink-0" /> : <AlertTriangle size={17} className="text-amber-300 shrink-0" />}<div><p className="font-medium text-sm">{health.ready_to_generate ? "AI social calendar ready" : "Social engine needs configuration"}</p><p className="text-xs text-foreground/65 mt-1">{health.scheduling?.note || "Approved items require an explicit delivery action."}</p></div></div><div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">{(["facebook", "instagram", "linkedin", "tiktok"] as Platform[]).map((platform) => { const state = health.channels?.[platform]; return <div key={platform} className="border border-border/60 bg-card/30 p-4"><div className="flex items-center justify-between gap-2"><span className="inline-flex items-center gap-2 font-display text-lg">{platformIcon[platform]} {platform}</span>{state?.publish_capable ? <CheckCircle2 size={14} className="text-emerald-300" /> : state?.verified ? <CheckCircle2 size={14} className="text-purple-300" /> : <AlertTriangle size={14} className="text-amber-300" />}</div><p className="text-[10px] text-foreground/60 mt-2 leading-relaxed">{state?.note || "Not checked"}</p></div>; })}</div><div className="border border-border/60 bg-card/20 p-4 text-xs text-foreground/65"><strong className="text-gold">Creative truth:</strong> Canva and HeyGen are connected to the Lovable builder as MCP chat tools, not to the deployed admin runtime. The engine creates detailed copyable handoff briefs; it does not claim assets were generated.</div></div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) { return <label><span className="block text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-1.5">{label}</span>{children}</label>; }
function Badge({ children, className }: { children: ReactNode; className: string }) { return <span className={`inline-flex border px-2 py-1 text-[9px] uppercase tracking-[0.14em] ${className}`}>{children}</span>; }
function Metric({ label, value }: { label: string; value: number }) { return <div className="border border-border/60 bg-card/30 p-4"><p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p><p className="font-display text-2xl mt-1">{value}</p></div>; }
function Mini({ label, value }: { label: string; value: number }) { return <div className="border border-border/40 bg-background/20 p-2 text-center"><p className="text-[8px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p><p className="font-display text-base mt-0.5">{value}</p></div>; }
function Empty({ icon, title, body }: { icon: ReactNode; title: string; body: string }) { return <div className="border border-dashed border-border/60 bg-card/20 p-12 text-center"><div className="inline-flex text-muted-foreground mb-3">{icon}</div><h3 className="font-display text-xl">{title}</h3><p className="text-sm text-muted-foreground mt-2">{body}</p></div>; }
function normalizeItem(item: CalendarItem): CalendarItem { return { ...item, hashtags: Array.isArray(item.hashtags) ? item.hashtags : [], carousel_outline: Array.isArray(item.carousel_outline) ? item.carousel_outline : [], creative_brief: item.creative_brief && typeof item.creative_brief === "object" ? item.creative_brief : {}, connector_result: item.connector_result && typeof item.connector_result === "object" ? item.connector_result : {}, risk_flags: Array.isArray(item.risk_flags) ? item.risk_flags : [] }; }
function editFor(item: CalendarItem): ItemEdit { return { title: item.title, caption: item.caption, hashtags: item.hashtags.join(", "), callToAction: item.call_to_action || "", language: item.language, imageUrl: item.image_url || "", videoUrl: item.video_url || "", scheduledLocal: toLocal(item.scheduled_at) }; }
function toLocal(value: string | null) { if (!value) return ""; const date = new Date(value); if (Number.isNaN(date.getTime())) return ""; return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
function splitList(value: string) { return [...new Set(value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean))]; }
function toggleArray<T extends string>(values: T[], value: T) { return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]; }
function toggleSet(values: Set<string>, value: string) { const next = new Set(values); if (next.has(value)) next.delete(value); else next.add(value); return next; }
function updateEdit(setter: React.Dispatch<React.SetStateAction<Record<string, ItemEdit>>>, id: string, patch: Partial<ItemEdit>) { setter((current) => ({ ...current, [id]: { ...current[id], ...patch } })); }
function isMigrationError(error: any) { const text = `${error?.code || ""} ${error?.message || ""}`.toLowerCase(); return text.includes("42p01") || text.includes("social_campaigns") || text.includes("social_calendar_items") || text.includes("social_delivery_attempts"); }
function summaryText(value: unknown) { if (!value || typeof value !== "object" || Array.isArray(value)) return ""; return Object.entries(value as Record<string, unknown>).map(([key, count]) => `${String(count)} ${key.replace(/_/g, " ")}`).join(" · "); }
async function copyText(value: string, label: string) { await navigator.clipboard.writeText(value); toast({ title: `${label} copied` }); }
