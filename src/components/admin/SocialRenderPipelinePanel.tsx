import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Film,
  Images,
  Loader2,
  PlayCircle,
  RefreshCw,
  Save,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  defaultAspectRatio,
  defaultDurationSeconds,
  renderManifest,
  requiredAssetRange,
  validateSocialRenderDraft,
  verifiedRenderOutput,
  type SocialAspectRatio,
  type SocialRenderDraft,
  type SocialRenderStatus,
  type SocialRenderType,
  type SocialRenderVerification,
} from "@/lib/socialRender";

const db = supabase as any;

type MediaAsset = {
  id: string;
  file_name: string;
  title: string | null;
  public_url: string;
  mime_type: string;
  status: "active" | "archived";
  verification_status?: string | null;
  social_approved?: boolean | null;
};

type RenderItem = {
  id: string;
  media_asset_id: string;
  position: number;
  scene_text: string | null;
  overlay_text: string | null;
  duration_ms: number | null;
};

type RenderJob = {
  id: string;
  title: string;
  render_type: SocialRenderType;
  aspect_ratio: SocialAspectRatio;
  status: SocialRenderStatus;
  requested_duration_seconds: number;
  renderer_provider: string | null;
  renderer_job_id: string | null;
  output_asset_id: string | null;
  output_url: string | null;
  output_verification: SocialRenderVerification | null;
  error_message: string | null;
  owner_approved_at: string | null;
  created_at: string;
  updated_at: string;
  social_render_job_items?: RenderItem[];
};

const emptyDraft = (renderType: SocialRenderType = "reel"): SocialRenderDraft => ({
  title: "",
  renderType,
  aspectRatio: defaultAspectRatio(renderType),
  requestedDurationSeconds: defaultDurationSeconds(renderType),
  items: [],
});

export default function SocialRenderPipelinePanel() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [jobs, setJobs] = useState<RenderJob[]>([]);
  const [draft, setDraft] = useState<SocialRenderDraft>(() => emptyDraft());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [mediaResult, jobsResult] = await Promise.all([
      db.from("media_assets").select("*").eq("status", "active").order("created_at", { ascending: false }).limit(500),
      db.from("social_render_jobs").select("*,social_render_job_items(*)").order("created_at", { ascending: false }).limit(100),
    ]);

    if (mediaResult.error) {
      setAssets([]);
      setBackendError(mediaResult.error.message || "Media Library is unavailable");
    } else {
      setAssets(((mediaResult.data ?? []) as MediaAsset[]).filter((asset) => asset.mime_type.startsWith("image/") || asset.mime_type.startsWith("video/")));
      setBackendError(jobsResult.error ? jobsResult.error.message || "Render pipeline backend is not active" : null);
    }

    setJobs(jobsResult.error ? [] : (jobsResult.data ?? []) as RenderJob[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const draftAssets = useMemo(() => assets.map((asset) => ({
    id: asset.id,
    mimeType: asset.mime_type,
    status: asset.status,
    publicUrl: asset.public_url,
    verificationStatus: asset.verification_status,
    socialApproved: asset.social_approved,
  })), [assets]);

  const readiness = useMemo(() => validateSocialRenderDraft(draft, draftAssets), [draft, draftAssets]);
  const range = requiredAssetRange(draft.renderType);

  const changeType = (renderType: SocialRenderType) => {
    setDraft(emptyDraft(renderType));
  };

  const toggleAsset = (assetId: string) => {
    setDraft((current) => {
      const exists = current.items.some((item) => item.mediaAssetId === assetId);
      if (exists) {
        return {
          ...current,
          items: current.items.filter((item) => item.mediaAssetId !== assetId).map((item, index) => ({ ...item, position: index + 1 })),
        };
      }
      if (current.items.length >= range.max) return current;
      return {
        ...current,
        items: [...current.items, {
          mediaAssetId: assetId,
          position: current.items.length + 1,
          durationMs: current.renderType === "reel" ? 2000 : null,
          sceneText: "",
          overlayText: "",
        }],
      };
    });
  };

  const updateItem = (assetId: string, patch: { sceneText?: string; overlayText?: string }) => {
    setDraft((current) => ({
      ...current,
      items: current.items.map((item) => item.mediaAssetId === assetId ? { ...item, ...patch } : item),
    }));
  };

  const saveDraft = async () => {
    if (!readiness.ready) {
      toast({ title: "Render brief is incomplete", description: readiness.missing.join(" · "), variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data: job, error: jobError } = await db.from("social_render_jobs").insert({
      title: draft.title.trim(),
      render_type: draft.renderType,
      aspect_ratio: draft.aspectRatio,
      requested_duration_seconds: draft.requestedDurationSeconds,
      status: "draft",
      manifest: renderManifest(draft, draftAssets),
    }).select("*").single();

    if (jobError || !job) {
      setSaving(false);
      toast({ title: "Render draft could not be saved", description: jobError?.message || "No job returned", variant: "destructive" });
      return;
    }

    const itemRows = draft.items.map((item) => ({
      job_id: job.id,
      media_asset_id: item.mediaAssetId,
      position: item.position,
      duration_ms: draft.renderType === "reel" ? (item.durationMs || 2000) : null,
      scene_text: item.sceneText?.trim() || null,
      overlay_text: item.overlayText?.trim() || null,
    }));
    const { error: itemsError } = await db.from("social_render_job_items").insert(itemRows);
    if (itemsError) {
      await db.from("social_render_jobs").delete().eq("id", job.id);
      setSaving(false);
      toast({ title: "Render scenes could not be saved", description: itemsError.message, variant: "destructive" });
      return;
    }

    setDraft(emptyDraft(draft.renderType));
    setSaving(false);
    toast({ title: "Render draft saved", description: "Nothing has been rendered or published yet." });
    await load();
  };

  const callRpc = async (jobId: string, rpc: string, success: string) => {
    setBusyId(jobId);
    const { error } = await db.rpc(rpc, { _job_id: jobId });
    setBusyId(null);
    if (error) {
      toast({ title: "Action blocked", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: success });
    await load();
  };

  const copyJobManifest = async (job: RenderJob) => {
    const payload = {
      id: job.id,
      title: job.title,
      render_type: job.render_type,
      aspect_ratio: job.aspect_ratio,
      requested_duration_seconds: job.requested_duration_seconds,
      status: job.status,
      items: [...(job.social_render_job_items || [])].sort((a, b) => a.position - b.position),
    };
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    toast({ title: "Verified render manifest copied" });
  };

  return (
    <section className="border border-gold/40 bg-card/25 mb-6">
      <div className="p-5 md:p-6 border-b border-border/60 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
        <div className="flex items-start gap-3">
          <Film size={22} className="text-gold shrink-0 mt-1" />
          <div>
            <p className="eyebrow mb-2">Media Production</p>
            <h2 className="font-display text-2xl md:text-4xl">Verified Reel & Carousel Pipeline</h2>
            <p className="text-sm text-foreground/65 mt-3 max-w-4xl leading-relaxed">
              Build a render manifest from Media Library assets, submit it for owner approval and track the renderer result. A job is shown as ready only when a real output asset, HTTPS URL, checksum, dimensions, file type and duration verification are present.
            </p>
          </div>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="min-h-11 inline-flex items-center justify-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.16em] hover:border-gold disabled:opacity-50">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {backendError && (
        <div className="m-4 md:m-5 border border-amber-500/35 bg-amber-500/[0.05] p-4 flex items-start gap-3">
          <AlertTriangle size={17} className="text-amber-300 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-200">Render backend needs activation.</p>
            <p className="text-xs text-foreground/55 mt-1 break-all">{backendError}</p>
          </div>
        </div>
      )}

      <div className="grid xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
        <div className="p-4 md:p-5 border-b xl:border-b-0 xl:border-r border-border/60 space-y-5">
          <div className="flex flex-wrap gap-2">
            <TypeButton active={draft.renderType === "reel"} onClick={() => changeType("reel")} icon={<Film size={14} />} label="10-sec reel" />
            <TypeButton active={draft.renderType === "carousel"} onClick={() => changeType("carousel")} icon={<Images size={14} />} label="Carousel" />
          </div>

          <div className="grid sm:grid-cols-[minmax(0,1fr)_140px] gap-3">
            <label>
              <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Render title</span>
              <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Example: Premium Lederhosen product reel" className="mt-2 min-h-11 w-full bg-background border border-border/60 px-3 text-sm" />
            </label>
            <label>
              <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Aspect</span>
              <select value={draft.aspectRatio} onChange={(event) => setDraft((current) => ({ ...current, aspectRatio: event.target.value as SocialAspectRatio }))} className="mt-2 min-h-11 w-full bg-background border border-border/60 px-3 text-sm">
                {(draft.renderType === "reel" ? ["9:16"] : ["4:5", "1:1", "9:16"]).map((ratio) => <option key={ratio}>{ratio}</option>)}
              </select>
            </label>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-gold">Choose Media Library assets</p>
                <p className="text-xs text-muted-foreground mt-1">{draft.renderType === "reel" ? "Select exactly five unique scenes." : "Select two to ten unique slides."}</p>
              </div>
              <span className="text-xs tabular-nums text-muted-foreground">{draft.items.length}/{range.max}</span>
            </div>
            {loading ? (
              <div className="py-10 text-center text-sm text-muted-foreground"><Loader2 className="animate-spin mx-auto mb-2" size={20} />Loading media…</div>
            ) : assets.length === 0 ? (
              <div className="border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">No active image or video assets are available in Media Library.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[32rem] overflow-y-auto pr-1">
                {assets.map((asset) => {
                  const selected = draft.items.some((item) => item.mediaAssetId === asset.id);
                  return (
                    <button key={asset.id} type="button" onClick={() => toggleAsset(asset.id)} className={`relative text-left border overflow-hidden ${selected ? "border-gold ring-1 ring-gold/40" : "border-border/60"}`}>
                      <div className="aspect-square bg-background/50 overflow-hidden">
                        {asset.mime_type.startsWith("image/") ? <img src={asset.public_url} alt={asset.title || asset.file_name} className="h-full w-full object-cover" loading="lazy" /> : <div className="h-full w-full flex items-center justify-center"><PlayCircle size={30} className="text-gold" /></div>}
                      </div>
                      <div className="p-2"><p className="text-[11px] truncate">{asset.title || asset.file_name}</p><p className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground mt-1">{asset.mime_type.split("/")[0]}</p></div>
                      {selected && <span className="absolute top-2 right-2 h-7 w-7 rounded-full bg-gold text-background flex items-center justify-center text-xs font-semibold">{draft.items.find((item) => item.mediaAssetId === asset.id)?.position}</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {draft.items.length > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-gold">Scene / slide notes</p>
              {draft.items.map((item) => {
                const asset = assets.find((candidate) => candidate.id === item.mediaAssetId);
                return (
                  <div key={item.mediaAssetId} className="border border-border/60 p-3 grid sm:grid-cols-[52px_minmax(0,1fr)] gap-3">
                    <div className="h-12 w-12 bg-background flex items-center justify-center overflow-hidden text-sm text-gold">{asset?.mime_type.startsWith("image/") ? <img src={asset.public_url} alt="" className="h-full w-full object-cover" /> : item.position}</div>
                    <div className="grid sm:grid-cols-2 gap-2">
                      <input value={item.sceneText || ""} onChange={(event) => updateItem(item.mediaAssetId, { sceneText: event.target.value })} placeholder={`Scene ${item.position} instruction`} className="min-h-10 bg-background border border-border/60 px-3 text-xs" />
                      <input value={item.overlayText || ""} onChange={(event) => updateItem(item.mediaAssetId, { overlayText: event.target.value })} placeholder="Optional on-screen text" className="min-h-10 bg-background border border-border/60 px-3 text-xs" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!readiness.ready && draft.items.length > 0 && <p className="text-xs text-amber-300">Missing: {readiness.missing.join(" · ")}</p>}
          <button type="button" onClick={() => void saveDraft()} disabled={saving || Boolean(backendError) || !readiness.ready} className="min-h-12 w-full inline-flex items-center justify-center gap-2 bg-gradient-gold text-primary-foreground px-4 text-[10px] uppercase tracking-[0.18em] disabled:opacity-40">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save render draft
          </button>
        </div>

        <div className="p-4 md:p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div><p className="text-[10px] uppercase tracking-[0.16em] text-gold">Render queue</p><p className="text-xs text-muted-foreground mt-1">Draft → owner review → queue → renderer → verified output</p></div>
            <span className="text-xs text-muted-foreground">{jobs.length} jobs</span>
          </div>
          {loading ? <div className="py-12 text-center text-sm text-muted-foreground">Loading render jobs…</div> : jobs.length === 0 ? (
            <div className="border border-dashed border-border/60 p-8 text-center"><Film size={28} className="mx-auto text-gold/70" /><p className="font-display text-xl mt-3">No render jobs yet</p><p className="text-xs text-muted-foreground mt-2">Create a verified draft from Media Library assets.</p></div>
          ) : (
            <div className="space-y-3 max-h-[64rem] overflow-y-auto pr-1">
              {jobs.map((job) => {
                const verified = verifiedRenderOutput({ outputUrl: job.output_url, outputAssetId: job.output_asset_id, verification: job.output_verification, renderType: job.render_type, aspectRatio: job.aspect_ratio });
                return <article key={job.id} className="border border-border/60 bg-background/25 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><p className="font-medium truncate">{job.title}</p><p className="text-[9px] uppercase tracking-[0.13em] text-muted-foreground mt-1">{job.render_type} · {job.aspect_ratio} · {job.social_render_job_items?.length || 0} assets</p></div>
                    <StatusBadge status={job.status} verified={verified} />
                  </div>
                  {job.error_message && <p className="text-xs text-red-300 mt-3 break-words">{job.error_message}</p>}
                  {job.status === "ready" && !verified && <p className="text-xs text-amber-300 mt-3">Backend returned ready without complete output verification. This job remains blocked in the admin.</p>}
                  {verified && job.output_url && <a href={job.output_url} target="_blank" rel="noreferrer" className="mt-3 min-h-10 inline-flex items-center gap-2 border border-emerald-500/40 text-emerald-300 px-3 text-[10px] uppercase tracking-[0.14em]"><CheckCircle2 size={12} /> Open verified output</a>}
                  <div className="flex flex-wrap gap-2 mt-4">
                    <button type="button" onClick={() => void copyJobManifest(job)} className="min-h-10 inline-flex items-center gap-2 border border-border/60 px-3 text-[10px] uppercase tracking-[0.13em] hover:border-gold"><Copy size={12} /> Manifest</button>
                    {job.status === "draft" && <button type="button" onClick={() => void callRpc(job.id, "admin_submit_social_render_job", "Sent for owner review")} disabled={busyId === job.id} className="min-h-10 inline-flex items-center gap-2 border border-gold/50 text-gold px-3 text-[10px] uppercase tracking-[0.13em] disabled:opacity-50"><ShieldCheck size={12} /> Owner review</button>}
                    {job.status === "owner_review" && <button type="button" onClick={() => void callRpc(job.id, "admin_approve_social_render_job", "Approved and queued for renderer")} disabled={busyId === job.id} className="min-h-10 inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-3 text-[10px] uppercase tracking-[0.13em] disabled:opacity-50"><PlayCircle size={12} /> Approve & queue</button>}
                    {job.status === "failed" && <button type="button" onClick={() => void callRpc(job.id, "admin_retry_social_render_job", "Render job returned to queue")} disabled={busyId === job.id} className="min-h-10 inline-flex items-center gap-2 border border-border/60 px-3 text-[10px] uppercase tracking-[0.13em]"><RefreshCw size={12} /> Retry</button>}
                    {["draft", "owner_review", "queued"].includes(job.status) && <button type="button" onClick={() => void callRpc(job.id, "admin_cancel_social_render_job", "Render job cancelled")} disabled={busyId === job.id} className="min-h-10 inline-flex items-center gap-2 border border-destructive/40 text-destructive px-3 text-[10px] uppercase tracking-[0.13em]"><XCircle size={12} /> Cancel</button>}
                  </div>
                </article>;
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function TypeButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return <button type="button" onClick={onClick} className={`min-h-11 inline-flex items-center gap-2 border px-4 text-[10px] uppercase tracking-[0.15em] ${active ? "border-gold text-gold bg-gold/5" : "border-border/60 text-muted-foreground"}`}>{icon}{label}</button>;
}

function StatusBadge({ status, verified }: { status: SocialRenderStatus; verified: boolean }) {
  const tone = verified ? "border-emerald-500/40 text-emerald-300" : status === "failed" ? "border-red-500/40 text-red-300" : status === "owner_review" || status === "queued" || status === "rendering" ? "border-gold/40 text-gold" : "border-border/60 text-muted-foreground";
  return <span className={`shrink-0 border px-2 py-1 text-[9px] uppercase tracking-[0.12em] ${tone}`}>{verified ? "verified" : status.replace(/_/g, " ")}</span>;
}
