import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Eye,
  Facebook,
  FileVideo2,
  Image as ImageIcon,
  Instagram,
  Linkedin,
  Loader2,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  DEFAULT_SOCIAL_AUTOPILOT_SETTINGS,
  IRHA_SOCIAL_VISUAL_PRESET,
  normalizeAutopilotSettings,
  truthfulChannelStatus,
  type ChannelState,
  type SocialAutopilotSettings,
  type SocialContentType,
  type SocialPlatform,
} from "@/lib/socialAutopilot";

type AutopilotHealth = {
  ok?: boolean;
  database_ready?: boolean;
  ai_gateway_configured?: boolean;
  media_library_ready?: boolean;
  render_pipeline_ready?: boolean;
  renderer_provider_configured?: boolean;
  note?: string;
  error?: string;
};

type SocialCalendarHealth = {
  channels?: Partial<Record<SocialPlatform, ChannelState>>;
};

type PreviewPlan = {
  index: number;
  day_offset: number;
  platform: SocialPlatform;
  content_type: SocialContentType;
  proposed_schedule: string;
  product?: { id?: string; name?: string; category?: string | null };
  product_selection_reason?: string;
  media_status?: string;
  media_selection_reason?: string;
};

type PrepareResult = {
  ok?: boolean;
  dry_run?: boolean;
  idempotent_replay?: boolean;
  run_id?: string;
  campaign_id?: string;
  created?: number;
  plan?: PreviewPlan[];
  selected_products?: Array<{ id?: string; name?: string; category?: string | null; verified_media_count?: number; reason?: string }>;
  summary?: Record<string, unknown>;
  note?: string;
  error?: string;
};

type Props = {
  migrationReady: boolean;
  onPrepared: (campaignId: string) => Promise<void> | void;
};

const platformIcon: Record<SocialPlatform, React.ReactNode> = {
  facebook: <Facebook size={14} />,
  instagram: <Instagram size={14} />,
  linkedin: <Linkedin size={14} />,
  tiktok: <FileVideo2 size={14} />,
};

const contentIcon: Record<SocialContentType, React.ReactNode> = {
  single_image: <ImageIcon size={13} />,
  carousel: <WandSparkles size={13} />,
  reel: <FileVideo2 size={13} />,
};

export default function SocialAutopilotPanel({ migrationReady, onPrepared }: Props) {
  const [settings, setSettings] = useState<SocialAutopilotSettings>(DEFAULT_SOCIAL_AUTOPILOT_SETTINGS);
  const [health, setHealth] = useState<AutopilotHealth | null>(null);
  const [calendarHealth, setCalendarHealth] = useState<SocialCalendarHealth | null>(null);
  const [result, setResult] = useState<PrepareResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"save" | "dry" | "prepare" | null>(null);
  const [open, setOpen] = useState(true);
  const [showPlan, setShowPlan] = useState(false);
  const [marketsText, setMarketsText] = useState(DEFAULT_SOCIAL_AUTOPILOT_SETTINGS.targetMarkets.join(", "));

  const load = async () => {
    setLoading(true);
    const [healthResult, settingsResult, calendarResult] = await Promise.all([
      supabase.functions.invoke("social-autopilot", { body: { action: "health" } }),
      supabase.functions.invoke("social-autopilot", { body: { action: "get_settings" } }),
      supabase.functions.invoke("social-calendar", { body: { action: "health" } }),
    ]);
    setHealth(healthResult.error ? { error: healthResult.error.message } : healthResult.data as AutopilotHealth);
    setCalendarHealth(calendarResult.error ? null : calendarResult.data as SocialCalendarHealth);
    if (!settingsResult.error && settingsResult.data?.settings) {
      const next = normalizeAutopilotSettings(settingsResult.data.settings as Partial<SocialAutopilotSettings>);
      setSettings(next);
      setMarketsText(next.targetMarkets.join(", "));
    }
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const channels = useMemo(() => Object.fromEntries(
    (Object.keys(settings.platforms) as SocialPlatform[]).map((platform) => [
      platform,
      truthfulChannelStatus(platform, calendarHealth?.channels?.[platform]),
    ]),
  ) as Record<SocialPlatform, ReturnType<typeof truthfulChannelStatus>>, [calendarHealth, settings.platforms]);

  const save = async () => {
    const next = normalizeAutopilotSettings({ ...settings, targetMarkets: splitList(marketsText) });
    setBusy("save");
    const { data, error } = await supabase.functions.invoke("social-autopilot", { body: { action: "save_settings", settings: next } });
    setBusy(null);
    if (error || !data?.ok) {
      toast({ title: "Autopilot settings could not save", description: data?.error || error?.message || "Unknown error", variant: "destructive" });
      return;
    }
    const saved = normalizeAutopilotSettings(data.settings);
    setSettings(saved);
    setMarketsText(saved.targetMarkets.join(", "));
    toast({ title: "Autopilot settings saved", description: "No content was generated or published." });
  };

  const prepare = async (dryRun: boolean) => {
    if (!health?.database_ready || !health?.ai_gateway_configured) {
      toast({ title: "Autopilot backend is not ready", description: health?.note || health?.error || "Apply the migration and verify AI Gateway configuration.", variant: "destructive" });
      return;
    }
    const enabledPlatforms = (Object.keys(settings.platforms) as SocialPlatform[]).filter((platform) => settings.platforms[platform]);
    if (enabledPlatforms.length === 0) {
      toast({ title: "Enable at least one platform", variant: "destructive" });
      return;
    }
    if (!dryRun && !window.confirm("Prepare the next seven days as drafts only? AI will select products and media, but nothing will be approved, published or sent until your final clearance.")) return;
    setBusy(dryRun ? "dry" : "prepare");
    const { data, error } = await supabase.functions.invoke("social-autopilot", { body: { action: "prepare_week", dry_run: dryRun } });
    setBusy(null);
    if (error || !data?.ok) {
      toast({ title: dryRun ? "Dry run failed" : "Weekly preparation failed", description: data?.error || error?.message || "Unknown error", variant: "destructive" });
      return;
    }
    setResult(data as PrepareResult);
    setShowPlan(true);
    toast({
      title: dryRun ? "Seven-day preview ready" : data.idempotent_replay ? "Existing weekly queue opened" : "Weekly drafts prepared",
      description: data.note || "Nothing was published.",
    });
    if (!dryRun && data.campaign_id) await onPrepared(data.campaign_id);
    await load();
  };

  const setNumber = (key: "dailyDraftLimit" | "weeklyReels" | "productCooldownDays", value: number) => {
    setSettings((current) => normalizeAutopilotSettings({ ...current, [key]: value }));
  };

  const ready = Boolean(migrationReady && health?.database_ready && health?.ai_gateway_configured);
  const summary = result?.summary ?? {};
  const plan = Array.isArray(result?.plan) ? result.plan : [];

  return (
    <section className="border border-gold/50 bg-gradient-to-br from-gold/10 via-card/40 to-background">
      <button type="button" onClick={() => setOpen((value) => !value)} className="w-full p-5 md:p-6 flex items-start justify-between gap-4 text-left">
        <div className="flex items-start gap-3">
          <div className="border border-gold/50 bg-gold/10 p-2.5 text-gold"><Sparkles size={18} /></div>
          <div>
            <p className="text-[9px] uppercase tracking-[0.24em] text-gold">Social Autopilot · Owner Approval Queue</p>
            <h3 className="font-display text-2xl md:text-3xl mt-1">Generate → Review → Approve → Schedule</h3>
            <p className="text-xs md:text-sm text-foreground/65 mt-2 max-w-4xl leading-relaxed">
              AI selects eligible products and verified media, prepares platform-native captions, hashtags, image/carousel briefs and fixed 10-second reel plans. Every item remains a draft until Daim gives final clearance.
            </p>
          </div>
        </div>
        {open ? <ChevronUp size={18} className="text-gold shrink-0" /> : <ChevronDown size={18} className="text-gold shrink-0" />}
      </button>

      {open && <div className="border-t border-border/50 p-5 md:p-6 space-y-5">
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <StateCard label="Approval policy" ok icon={<ShieldCheck size={15} />} text="Draft-only generation. No bulk auto-publish." />
          <StateCard label="AI copy" ok={Boolean(health?.ai_gateway_configured)} icon={<Sparkles size={15} />} text={health?.ai_gateway_configured ? "AI Gateway configured" : "AI Gateway configuration required"} />
          <StateCard label="Verified media" ok={Boolean(health?.media_library_ready)} icon={<ImageIcon size={15} />} text={health?.media_library_ready ? "Verified social assets can be selected" : "Media Library migration/verification required"} />
          <StateCard label="Reel renderer" ok={Boolean(health?.render_pipeline_ready && health?.renderer_provider_configured)} icon={<FileVideo2 size={15} />} text={health?.render_pipeline_ready ? (health?.renderer_provider_configured ? "Renderer provider configured" : "Render queue ready; provider secrets missing") : "Render backend activation required"} />
        </div>

        {health?.error && <div className="border border-amber-500/40 bg-amber-500/10 p-4 flex items-start gap-3"><AlertTriangle size={17} className="text-amber-300 shrink-0" /><div><p className="text-sm font-medium">Autopilot function is not active yet</p><p className="text-xs text-foreground/65 mt-1">{health.error}</p></div></div>}
        {!loading && health && !health.media_library_ready && <div className="border border-amber-500/40 bg-amber-500/10 p-4 flex items-start gap-3"><AlertTriangle size={17} className="text-amber-300 shrink-0" /><div><p className="text-sm font-medium">Safe degraded mode</p><p className="text-xs text-foreground/65 mt-1">{health.note} Captions and creative briefs can be previewed after activation, but no image/video URL will be fabricated.</p></div></div>}

        <div className="grid xl:grid-cols-12 gap-5">
          <div className="xl:col-span-7 border border-border/60 bg-card/30 p-4 md:p-5 space-y-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div><p className="eyebrow">Weekly policy</p><p className="text-xs text-foreground/60 mt-2">Pakistan timezone · one idempotent queue per week and settings version.</p></div>
              <label className={`inline-flex items-center gap-2 border px-3 py-2 cursor-pointer ${settings.enabled ? "border-emerald-500/50 bg-emerald-500/5 text-emerald-300" : "border-border/60 text-muted-foreground"}`}>
                <input type="checkbox" checked={settings.enabled} onChange={(event) => setSettings((current) => ({ ...current, enabled: event.target.checked }))} />
                <span className="text-[9px] uppercase tracking-[0.16em]">Planning enabled</span>
              </label>
            </div>

            <div>
              <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-2">Platforms</p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                {(Object.keys(settings.platforms) as SocialPlatform[]).map((platform) => <label key={platform} className={`border p-3 cursor-pointer ${settings.platforms[platform] ? "border-gold/60 bg-gold/5 text-gold" : "border-border/50 text-muted-foreground"}`}><div className="flex items-center gap-2"><input type="checkbox" checked={settings.platforms[platform]} onChange={() => setSettings((current) => ({ ...current, platforms: { ...current.platforms, [platform]: !current.platforms[platform] } }))} />{platformIcon[platform]}<span className="text-[9px] uppercase tracking-[0.12em]">{platform}</span></div><p className="text-[8px] leading-relaxed mt-2 opacity-80">{channels[platform].status.replace(/_/g, " ")}</p></label>)}
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <NumberField label="Drafts per day" value={settings.dailyDraftLimit} min={1} max={4} onChange={(value) => setNumber("dailyDraftLimit", value)} />
              <NumberField label="Reels per week" value={settings.weeklyReels} min={0} max={7} onChange={(value) => setNumber("weeklyReels", value)} />
              <NumberField label="Product cooldown days" value={settings.productCooldownDays} min={0} max={120} onChange={(value) => setNumber("productCooldownDays", value)} />
            </div>

            <div>
              <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-2">Content mix</p>
              <div className="grid grid-cols-3 gap-2">
                {(["single_image", "carousel", "reel"] as SocialContentType[]).map((type) => <label key={type} className={`border p-3 cursor-pointer flex items-center gap-2 ${settings.contentMix.includes(type) ? "border-gold/60 bg-gold/5 text-gold" : "border-border/50 text-muted-foreground"}`}><input type="checkbox" checked={settings.contentMix.includes(type)} onChange={() => setSettings((current) => ({ ...current, contentMix: toggleValue(current.contentMix, type) }))} />{contentIcon[type]}<span className="text-[9px] uppercase tracking-[0.11em]">{type.replace(/_/g, " ")}</span></label>)}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <label><span className="block text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-1.5">Target markets</span><textarea rows={3} value={marketsText} onChange={(event) => setMarketsText(event.target.value)} className="social-input resize-y" placeholder="Germany, Austria, Switzerland" /></label>
              <label><span className="block text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-1.5">Language</span><select value={settings.language} onChange={(event) => setSettings((current) => ({ ...current, language: event.target.value }))} className="social-input"><option>English</option><option>German</option><option>French</option><option>Italian</option><option>Spanish</option><option>Arabic</option></select><span className="block text-[9px] text-muted-foreground mt-2">Posting windows stay centrally controlled in Pakistan time: LinkedIn 11:00, Facebook/Instagram afternoon/evening, TikTok evening.</span></label>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button type="button" onClick={() => void save()} disabled={busy !== null || loading} className="inline-flex items-center gap-2 border border-border/60 px-4 py-2.5 text-[9px] uppercase tracking-[0.16em] hover:border-gold hover:text-gold disabled:opacity-40">{busy === "save" ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save policy</button>
              <button type="button" onClick={() => void prepare(true)} disabled={busy !== null || !ready} className="inline-flex items-center gap-2 border border-cyan-500/50 text-cyan-300 px-4 py-2.5 text-[9px] uppercase tracking-[0.16em] disabled:opacity-40">{busy === "dry" ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />} Dry run</button>
              <button type="button" onClick={() => void prepare(false)} disabled={busy !== null || !ready} className="inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-5 py-2.5 text-[9px] uppercase tracking-[0.18em] disabled:opacity-40">{busy === "prepare" ? <Loader2 size={12} className="animate-spin" /> : <CalendarDays size={12} />} Prepare next 7 days</button>
              <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 border border-border/60 px-3 py-2.5 text-[9px] uppercase tracking-[0.14em] disabled:opacity-40"><RefreshCw size={11} className={loading ? "animate-spin" : ""} /> Refresh</button>
            </div>
          </div>

          <div className="xl:col-span-5 space-y-4">
            <div className="border border-border/60 bg-card/30 p-4 md:p-5">
              <div className="flex items-center gap-2 text-gold"><WandSparkles size={15} /><p className="text-[9px] uppercase tracking-[0.18em]">Locked visual preset</p></div>
              <h4 className="font-display text-xl mt-2">{IRHA_SOCIAL_VISUAL_PRESET.name}</h4>
              <div className="space-y-2 mt-3 text-[10px] text-foreground/65 leading-relaxed">
                <p><strong className="text-foreground/85">Background:</strong> {IRHA_SOCIAL_VISUAL_PRESET.background}</p>
                <p><strong className="text-foreground/85">Branding:</strong> {IRHA_SOCIAL_VISUAL_PRESET.logoPlacement}</p>
                <p><strong className="text-foreground/85">Products:</strong> no models/mannequins; faithful verified-source details.</p>
                <p><strong className="text-foreground/85">Formats:</strong> 4:5 images/carousels · 9:16 reels · exactly 10 seconds.</p>
              </div>
              <div className="border border-amber-500/30 bg-amber-500/5 p-3 mt-4 text-[10px] text-amber-100/80">No invented labels, logos, certifications, prices, MOQ, materials, client marks, delivery or production claims.</div>
            </div>

            <div className="border border-border/60 bg-card/30 p-4 md:p-5">
              <p className="text-[9px] uppercase tracking-[0.18em] text-gold mb-3">Channel delivery truth</p>
              <div className="space-y-2">
                {(Object.keys(channels) as SocialPlatform[]).map((platform) => <div key={platform} className="border border-border/40 p-3"><div className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2 text-xs capitalize">{platformIcon[platform]} {platform}</span>{channels[platform].status === "publish_capable" ? <CheckCircle2 size={13} className="text-emerald-300" /> : <AlertTriangle size={13} className="text-amber-300" />}</div><p className="text-[9px] text-foreground/55 mt-2 leading-relaxed">{channels[platform].note}</p></div>)}
              </div>
            </div>
          </div>
        </div>

        {result && <div className="border border-cyan-500/30 bg-cyan-500/5 p-4 md:p-5 space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div><p className="text-[9px] uppercase tracking-[0.18em] text-cyan-300">{result.dry_run ? "Dry-run preview" : "Weekly queue result"}</p><p className="text-sm text-foreground/75 mt-1">{result.note}</p>{result.idempotent_replay && <p className="text-[10px] text-cyan-200 mt-1">Idempotency guard returned the existing queue; no duplicates were created.</p>}</div>
            <button type="button" onClick={() => setShowPlan((value) => !value)} className="inline-flex items-center gap-2 border border-cyan-500/40 px-3 py-2 text-[9px] uppercase tracking-[0.14em] text-cyan-200">{showPlan ? <ChevronUp size={11} /> : <ChevronDown size={11} />} Plan details</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2">
            <SummaryMetric label="Total" value={summary.total} />
            <SummaryMetric label="Ready" value={summary.ready_to_approve ?? summary.ready_with_verified_media} />
            <SummaryMetric label="Media needed" value={summary.media_needed ?? summary.media_generation_required} />
            <SummaryMetric label="Render needed" value={summary.render_needed ?? summary.render_draft_possible} />
            <SummaryMetric label="Scheduled" value={summary.scheduled} />
            <SummaryMetric label="Published" value={summary.published} />
          </div>
          {showPlan && <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
            {plan.length === 0 && <p className="text-xs text-muted-foreground">The completed run is available in the campaign queue below.</p>}
            {plan.map((item) => <div key={`${item.index}-${item.platform}`} className="border border-border/50 bg-background/25 p-3"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2 text-[9px] uppercase tracking-[0.12em] text-gold">{platformIcon[item.platform]} {item.platform}<span>·</span>{contentIcon[item.content_type]} {item.content_type.replace(/_/g, " ")}</div><p className="font-display text-lg mt-1">{item.product?.name || "Product"}</p><p className="text-[9px] text-muted-foreground">{item.product?.category || "Category pending"}</p></div><span className="inline-flex items-center gap-1 text-[9px] text-cyan-200"><Clock3 size={10} /> {formatPakistanTime(item.proposed_schedule)}</span></div><p className="text-[9px] text-foreground/60 mt-2">{item.product_selection_reason}</p><p className={`text-[9px] mt-1 ${item.media_status === "media_generation_required" ? "text-amber-300" : "text-emerald-300"}`}>{item.media_selection_reason}</p></div>)}
          </div>}
        </div>}
      </div>}
    </section>
  );
}

function StateCard({ label, ok, icon, text }: { label: string; ok: boolean; icon: React.ReactNode; text: string }) {
  return <div className={`border p-4 ${ok ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}><div className="flex items-center justify-between gap-2"><span className="inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.14em]">{icon}{label}</span>{ok ? <CheckCircle2 size={13} className="text-emerald-300" /> : <AlertTriangle size={13} className="text-amber-300" />}</div><p className="text-[9px] text-foreground/60 mt-2 leading-relaxed">{text}</p></div>;
}

function NumberField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return <label><span className="block text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-1.5">{label}</span><input type="number" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} className="social-input" /></label>;
}

function SummaryMetric({ label, value }: { label: string; value: unknown }) {
  return <div className="border border-border/40 bg-background/20 p-3"><p className="text-[8px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p><p className="font-display text-xl mt-1">{typeof value === "number" ? value : 0}</p></div>;
}

function splitList(value: string) {
  return [...new Set(value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean))];
}

function toggleValue<T extends string>(values: T[], value: T) {
  const next = values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
  return next.length ? next : values;
}

function formatPakistanTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time pending";
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Karachi", weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}
