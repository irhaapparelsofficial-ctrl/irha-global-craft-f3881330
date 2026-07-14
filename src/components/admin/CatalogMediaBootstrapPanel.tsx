import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, Database, Eye, Images, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type Health = {
  ok?: boolean;
  database_ready?: boolean;
  published_products?: number;
  media_assets?: number;
  imported_catalog_assets?: number;
  approved_catalog_assets?: number;
  max_batch?: number;
  policy?: string;
  errors?: string[];
  error?: string;
};

type Candidate = {
  source: string;
  product_names?: string[];
  product_slugs?: string[];
  category_slugs?: string[];
  position?: number;
  fetch_candidates?: string[];
};

type Preview = {
  ok?: boolean;
  total_candidates?: number;
  offset?: number;
  next_offset?: number;
  has_more?: boolean;
  candidates?: Candidate[];
  note?: string;
  error?: string;
};

type ImportResult = {
  ok?: boolean;
  total_candidates?: number;
  offset?: number;
  processed?: number;
  next_offset?: number;
  has_more?: boolean;
  imported?: number;
  reconciled?: number;
  inserted?: number;
  skipped?: number;
  failed?: number;
  note?: string;
  error?: string;
};

type Props = {
  onChanged?: () => Promise<void> | void;
};

const BATCH_SIZE = 8;

export default function CatalogMediaBootstrapPanel({ onChanged }: Props) {
  const [health, setHealth] = useState<Health | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState<"health" | "preview" | "import" | "approve" | null>(null);

  const loadHealth = useCallback(async () => {
    setBusy((current) => current ?? "health");
    const { data, error } = await supabase.functions.invoke("catalog-media-bootstrap", { body: { action: "health" } });
    setBusy((current) => current === "health" ? null : current);
    if (error || !data?.ok) {
      setHealth({ error: data?.error || error?.message || "Catalog media bootstrap is unavailable" });
      return;
    }
    setHealth(data as Health);
  }, []);

  useEffect(() => { void loadHealth(); }, [loadHealth]);

  const scan = async () => {
    setBusy("preview");
    const { data, error } = await supabase.functions.invoke("catalog-media-bootstrap", {
      body: { action: "preview", offset, limit: BATCH_SIZE },
    });
    setBusy(null);
    if (error || !data?.ok) {
      toast({ title: "Catalog scan failed", description: data?.error || error?.message || "Unknown error", variant: "destructive" });
      return;
    }
    setPreview(data as Preview);
    toast({ title: "Catalog media scan ready", description: data.note || "No media was changed." });
  };

  const importBatch = async () => {
    if (!window.confirm(`Import and technically verify the next ${BATCH_SIZE} first-party catalog images? They will remain blocked from social use until you approve them.`)) return;
    setBusy("import");
    const { data, error } = await supabase.functions.invoke("catalog-media-bootstrap", {
      body: { action: "import_batch", offset, limit: BATCH_SIZE },
    });
    setBusy(null);
    if (error || !data?.ok) {
      toast({ title: "Catalog media import failed", description: data?.error || error?.message || "Unknown error", variant: "destructive" });
      return;
    }
    const result = data as ImportResult;
    setOffset(result.next_offset || offset + BATCH_SIZE);
    setPreview(null);
    toast({
      title: `${result.imported || 0} catalog assets imported`,
      description: `${result.reconciled || 0} pending rows upgraded · ${result.inserted || 0} new · ${result.skipped || 0} already verified · ${result.failed || 0} failed. Social approval is still off.`,
      variant: result.failed ? "destructive" : undefined,
    });
    await onChanged?.();
    await loadHealth();
  };

  const approveBatch = async () => {
    if (!window.confirm("Approve the next 20 technically verified first-party catalog assets for social selection? This does not publish any post.")) return;
    setBusy("approve");
    const { data, error } = await supabase.functions.invoke("catalog-media-bootstrap", {
      body: { action: "approve_batch", limit: 20 },
    });
    setBusy(null);
    if (error || !data?.ok) {
      toast({ title: "Catalog media approval failed", description: data?.error || error?.message || "Unknown error", variant: "destructive" });
      return;
    }
    toast({ title: `${data.approved || 0} assets approved for social`, description: data.note || "No posts were created or published." });
    await onChanged?.();
    await loadHealth();
  };

  const waitingApproval = Math.max(0, Number(health?.imported_catalog_assets || 0) - Number(health?.approved_catalog_assets || 0));
  const unavailable = Boolean(health?.error || health?.database_ready === false);

  return (
    <section className="border border-cyan-500/35 bg-cyan-500/[0.04] p-4 md:p-5 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="border border-cyan-500/40 bg-cyan-500/10 p-2.5 text-cyan-300"><Database size={18} /></div>
          <div>
            <p className="text-[9px] uppercase tracking-[0.2em] text-cyan-300">First-party catalog bridge</p>
            <h3 className="font-display text-xl md:text-2xl mt-1">Published Products → Verified Media Library</h3>
            <p className="text-xs text-foreground/60 mt-2 max-w-3xl leading-relaxed">
              Import current product images in small idempotent batches. The backend downloads the real file, validates type and dimensions, calculates SHA-256, copies it to owner Supabase Storage and registers verified provenance. Social approval remains a separate owner action.
            </p>
          </div>
        </div>
        <button type="button" onClick={() => void loadHealth()} disabled={busy !== null} className="min-h-10 inline-flex items-center justify-center gap-2 border border-border/60 px-3 text-[9px] uppercase tracking-[0.14em] disabled:opacity-40">
          <RefreshCw size={12} className={busy === "health" ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <Metric icon={<Images size={13} />} label="Published products" value={health?.published_products} />
        <Metric icon={<Database size={13} />} label="Media Library" value={health?.media_assets} />
        <Metric icon={<BadgeCheck size={13} />} label="Catalog verified" value={health?.imported_catalog_assets} />
        <Metric icon={<ShieldCheck size={13} />} label="Social approved" value={health?.approved_catalog_assets} />
      </div>

      {health?.error && <div className="border border-amber-500/35 bg-amber-500/5 p-3 text-xs text-amber-200">{health.error}</div>}
      {health?.policy && <p className="text-[10px] text-foreground/50">{health.policy}</p>}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void scan()} disabled={busy !== null || unavailable} className="min-h-11 inline-flex items-center gap-2 border border-cyan-500/45 text-cyan-300 px-4 text-[9px] uppercase tracking-[0.16em] disabled:opacity-40">
          {busy === "preview" ? <Loader2 size={13} className="animate-spin" /> : <Eye size={13} />} Scan next {BATCH_SIZE}
        </button>
        <button type="button" onClick={() => void importBatch()} disabled={busy !== null || unavailable} className="min-h-11 inline-flex items-center gap-2 bg-cyan-500 text-slate-950 px-4 text-[9px] uppercase tracking-[0.16em] disabled:opacity-40">
          {busy === "import" ? <Loader2 size={13} className="animate-spin" /> : <Database size={13} />} Import next {BATCH_SIZE}
        </button>
        <button type="button" onClick={() => void approveBatch()} disabled={busy !== null || unavailable || waitingApproval === 0} className="min-h-11 inline-flex items-center gap-2 border border-gold/50 text-gold px-4 text-[9px] uppercase tracking-[0.16em] disabled:opacity-40">
          {busy === "approve" ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />} Approve next {Math.min(20, waitingApproval)}
        </button>
        {offset > 0 && <button type="button" onClick={() => { setOffset(0); setPreview(null); }} disabled={busy !== null} className="min-h-11 border border-border/60 px-4 text-[9px] uppercase tracking-[0.14em] disabled:opacity-40">Restart scan</button>}
      </div>

      <p className="text-[10px] text-foreground/50">Current scan offset: {offset}. Imports are atomic per file; a failed source does not roll back successful files in the same small batch.</p>

      {preview && <div className="border border-border/50 bg-background/25 p-3 space-y-2">
        <div className="flex items-center justify-between gap-3"><p className="text-[9px] uppercase tracking-[0.15em] text-cyan-300">Preview · {preview.total_candidates || 0} unique catalog sources</p><span className="text-[9px] text-muted-foreground">{preview.has_more ? "More batches available" : "Final batch"}</span></div>
        <div className="grid md:grid-cols-2 gap-2">
          {(preview.candidates || []).map((candidate, index) => <div key={`${candidate.source}-${index}`} className="border border-border/40 p-3 min-w-0"><p className="text-xs truncate" title={candidate.product_names?.join(", ")}>{candidate.product_names?.join(", ") || "Catalog product"}</p><p className="text-[9px] text-muted-foreground mt-1 truncate" title={candidate.source}>{candidate.source}</p><p className="text-[9px] text-cyan-200 mt-1">Image {candidate.position || index + 1} · {(candidate.category_slugs || []).join(", ") || "category pending"}</p></div>)}
        </div>
      </div>}
    </section>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: unknown }) {
  return <div className="border border-border/50 bg-background/20 p-3"><div className="flex items-center gap-2 text-[8px] uppercase tracking-[0.12em] text-muted-foreground">{icon}{label}</div><p className="font-display text-xl mt-1">{typeof value === "number" ? value : 0}</p></div>;
}
