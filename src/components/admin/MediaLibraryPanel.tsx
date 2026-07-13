import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Archive, BadgeCheck, Check, Copy, FileImage, RefreshCw, Search, ShieldCheck, Trash2, UploadCloud, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const db = supabase as any;
const BUCKET = "site-media";
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml", "application/pdf", "video/mp4", "video/webm"]);
const MAX_BYTES = 25 * 1024 * 1024;

type MediaAsset = {
  id: string;
  bucket: string;
  object_path: string;
  public_url: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  title: string | null;
  alt_text: string | null;
  tags: string[];
  usage_notes: string | null;
  status: "active" | "archived";
  verification_status?: "pending" | "verified" | "rejected" | null;
  width_px?: number | null;
  height_px?: number | null;
  duration_ms?: number | null;
  checksum_sha256?: string | null;
  social_approved?: boolean | null;
  social_approved_at?: string | null;
  created_at: string;
  updated_at: string;
};

function socialReady(asset: MediaAsset) {
  return Boolean(
    asset.status === "active"
      && asset.verification_status === "verified"
      && asset.width_px && asset.width_px >= 100
      && asset.height_px && asset.height_px >= 100
      && asset.checksum_sha256
      && /^[a-f0-9]{64}$/i.test(asset.checksum_sha256)
      && (asset.mime_type.startsWith("image/") || asset.mime_type.startsWith("video/")),
  );
}

export default function MediaLibraryPanel() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [rows, setRows] = useState<MediaAsset[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: queryError } = await db.from("media_assets").select("*").order("created_at", { ascending: false }).limit(500);
    if (queryError) {
      setRows([]);
      setError(queryError.message || "Media Library backend is not active yet");
    } else {
      setRows((data ?? []) as MediaAsset[]);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => [
      row.file_name,
      row.title,
      row.alt_text,
      row.tags.join(" "),
      row.usage_notes,
      row.status,
      row.verification_status,
      row.social_approved ? "social approved" : "",
    ].filter(Boolean).join(" ").toLowerCase().includes(needle));
  }, [query, rows]);

  const upload = async (file: File) => {
    if (!ALLOWED_TYPES.has(file.type)) {
      toast({ title: "Unsupported file", description: "Use JPG, PNG, WEBP, GIF, SVG, PDF, MP4 or WEBM.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast({ title: "File is too large", description: "Maximum size is 25 MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
    const now = new Date();
    const path = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${crypto.randomUUID()}-${safeName || "asset"}`;
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: "31536000", upsert: false, contentType: file.type });
    if (uploadError) {
      setUploading(false);
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      return;
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const { data, error: insertError } = await db.from("media_assets").insert({
      bucket: BUCKET,
      object_path: path,
      public_url: urlData.publicUrl,
      file_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      title: file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "),
      alt_text: file.type.startsWith("image/") ? file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ") : null,
      tags: [],
      usage_notes: null,
      status: "active",
    }).select("*").single();

    if (insertError) {
      await supabase.storage.from(BUCKET).remove([path]);
      setUploading(false);
      toast({ title: "Metadata save failed", description: insertError.message, variant: "destructive" });
      return;
    }

    setRows((current) => [data as MediaAsset, ...current]);
    setUploading(false);
    toast({ title: "Media uploaded", description: "The asset is pending technical verification before social approval." });
  };

  const updateAsset = async (asset: MediaAsset, patch: Partial<MediaAsset>) => {
    const { data, error: updateError } = await db.from("media_assets").update(patch).eq("id", asset.id).select("*").single();
    if (updateError) {
      toast({ title: "Update failed", description: updateError.message, variant: "destructive" });
      return;
    }
    setRows((current) => current.map((row) => row.id === asset.id ? data as MediaAsset : row));
    toast({ title: patch.social_approved === true ? "Approved for social rendering" : patch.social_approved === false ? "Social approval removed" : "Media details updated" });
  };

  const remove = async (asset: MediaAsset) => {
    if (!window.confirm(`Permanently delete ${asset.file_name}? Any page or render job using its URL will break.`)) return;
    const { error: storageError } = await supabase.storage.from(asset.bucket).remove([asset.object_path]);
    if (storageError) {
      toast({ title: "Storage delete failed", description: storageError.message, variant: "destructive" });
      return;
    }
    const { error: rowError } = await db.from("media_assets").delete().eq("id", asset.id);
    if (rowError) {
      toast({ title: "Database cleanup failed", description: rowError.message, variant: "destructive" });
      return;
    }
    setRows((current) => current.filter((row) => row.id !== asset.id));
    toast({ title: "Media deleted" });
  };

  const copy = async (asset: MediaAsset) => {
    await navigator.clipboard.writeText(asset.public_url);
    setCopied(asset.id);
    window.setTimeout(() => setCopied(null), 1500);
  };

  const verifiedCount = rows.filter((asset) => asset.verification_status === "verified").length;
  const approvedCount = rows.filter((asset) => asset.social_approved).length;

  return (
    <div className="space-y-5">
      <section className="border border-gold/40 bg-gold/[0.04] p-5 md:p-7">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
          <div>
            <p className="eyebrow mb-2">Website & Social Assets</p>
            <h2 className="font-display text-2xl md:text-4xl">Media Library</h2>
            <p className="mt-3 max-w-3xl text-sm text-foreground/65 leading-relaxed">Upload reusable images, videos and PDFs once. Image/video assets remain pending until a trusted service records dimensions, checksum, file type and video duration. Only verified active assets can receive owner social approval.</p>
            <div className="flex flex-wrap gap-2 mt-4 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <span className="border border-border/60 px-2 py-1">{rows.length} total</span>
              <span className="border border-emerald-500/35 text-emerald-300 px-2 py-1">{verifiedCount} verified</span>
              <span className="border border-gold/40 text-gold px-2 py-1">{approvedCount} social approved</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => void load()} disabled={loading} className="min-h-11 inline-flex items-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.18em] hover:border-gold"><RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh</button>
            <button onClick={() => fileRef.current?.click()} disabled={uploading || Boolean(error)} className="min-h-11 inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-4 text-[10px] uppercase tracking-[0.18em] disabled:opacity-50"><UploadCloud size={14} /> {uploading ? "Uploading…" : "Upload media"}</button>
            <input ref={fileRef} type="file" className="hidden" accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,application/pdf,video/mp4,video/webm" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.target.value = ""; }} />
          </div>
        </div>
      </section>

      {error && <div className="border border-amber-500/40 bg-amber-500/5 p-4 text-sm text-amber-200">Media backend or storage bucket is unavailable. Detail: {error}</div>}

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-xl"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search file, title, tags, verification or approval…" className="w-full min-h-11 bg-card/30 border border-border/60 pl-9 pr-3 text-sm" /></div>
        <p className="text-xs text-muted-foreground">{filtered.length} of {rows.length} assets</p>
      </div>

      {loading ? <div className="py-16 text-center text-sm text-muted-foreground">Loading Media Library…</div> : filtered.length === 0 ? (
        <div className="border border-dashed border-border/60 p-12 text-center"><FileImage className="mx-auto text-muted-foreground" size={30} /><h3 className="font-display text-xl mt-4">No media assets available</h3><p className="text-sm text-muted-foreground mt-2">Upload approved source media to begin.</p></div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((asset) => <AssetCard key={asset.id} asset={asset} copied={copied === asset.id} onCopy={() => void copy(asset)} onUpdate={(patch) => void updateAsset(asset, patch)} onDelete={() => void remove(asset)} />)}
        </div>
      )}
    </div>
  );
}

function AssetCard({ asset, copied, onCopy, onUpdate, onDelete }: { asset: MediaAsset; copied: boolean; onCopy: () => void; onUpdate: (patch: Partial<MediaAsset>) => void; onDelete: () => void }) {
  const [title, setTitle] = useState(asset.title || "");
  const [alt, setAlt] = useState(asset.alt_text || "");
  const [tags, setTags] = useState((asset.tags || []).join(", "));
  useEffect(() => { setTitle(asset.title || ""); setAlt(asset.alt_text || ""); setTags((asset.tags || []).join(", ")); }, [asset]);
  const isImage = asset.mime_type.startsWith("image/");
  const isVideo = asset.mime_type.startsWith("video/");
  const ready = socialReady(asset);
  return <article className="border border-border/60 bg-card/25 overflow-hidden">
    <div className="aspect-[16/10] bg-background/50 flex items-center justify-center overflow-hidden">{isImage ? <img src={asset.public_url} alt={asset.alt_text || ""} className="w-full h-full object-cover" loading="lazy" /> : isVideo ? <video src={asset.public_url} className="w-full h-full object-cover" preload="metadata" muted /> : <FileImage size={34} className="text-gold" />}</div>
    <div className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0"><p className="text-sm truncate" title={asset.file_name}>{asset.file_name}</p><p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mt-1">{formatBytes(asset.size_bytes)} · {asset.mime_type} · {asset.status}</p></div>
        {asset.social_approved ? <BadgeCheck size={18} className="text-gold shrink-0" aria-label="Approved for social" /> : isVideo ? <Video size={18} className="text-muted-foreground shrink-0" /> : null}
      </div>
      <div className={`border px-3 py-2 text-[10px] uppercase tracking-[0.12em] ${asset.verification_status === "verified" ? "border-emerald-500/35 text-emerald-300" : asset.verification_status === "rejected" ? "border-red-500/35 text-red-300" : "border-amber-500/35 text-amber-300"}`}>
        {asset.verification_status || "pending"}{asset.width_px && asset.height_px ? ` · ${asset.width_px}×${asset.height_px}` : ""}{asset.duration_ms ? ` · ${(asset.duration_ms / 1000).toFixed(1)}s` : ""}
      </div>
      <input value={title} onChange={(event) => setTitle(event.target.value)} onBlur={() => title !== (asset.title || "") && onUpdate({ title: title.trim() || null })} placeholder="Display title" className="w-full min-h-10 bg-background border border-border/60 px-3 text-xs" />
      {isImage && <input value={alt} onChange={(event) => setAlt(event.target.value)} onBlur={() => alt !== (asset.alt_text || "") && onUpdate({ alt_text: alt.trim() || null })} placeholder="Accessible alt text" className="w-full min-h-10 bg-background border border-border/60 px-3 text-xs" />}
      <input value={tags} onChange={(event) => setTags(event.target.value)} onBlur={() => { const next = tags.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 20); if (next.join("|") !== (asset.tags || []).join("|")) onUpdate({ tags: next }); }} placeholder="Tags, comma separated" className="w-full min-h-10 bg-background border border-border/60 px-3 text-xs" />
      {!ready && (isImage || isVideo) && <p className="text-[11px] text-muted-foreground">Social approval stays blocked until automated metadata and checksum verification succeeds.</p>}
      <div className="flex flex-wrap gap-2 pt-1">
        <button onClick={onCopy} className="min-h-10 inline-flex items-center gap-2 border border-border/60 px-3 text-[10px] uppercase tracking-[0.14em] hover:border-gold">{copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copied" : "Copy URL"}</button>
        {(isImage || isVideo) && <button disabled={!ready && !asset.social_approved} onClick={() => onUpdate({ social_approved: !asset.social_approved })} className="min-h-10 inline-flex items-center gap-2 border border-gold/45 text-gold px-3 text-[10px] uppercase tracking-[0.14em] disabled:opacity-35"><ShieldCheck size={12} /> {asset.social_approved ? "Remove social" : "Approve social"}</button>}
        <button onClick={() => onUpdate({ status: asset.status === "active" ? "archived" : "active", social_approved: asset.status === "active" ? false : asset.social_approved })} className="min-h-10 inline-flex items-center gap-2 border border-border/60 px-3 text-[10px] uppercase tracking-[0.14em] hover:border-gold"><Archive size={12} /> {asset.status === "active" ? "Archive" : "Activate"}</button>
        <button onClick={onDelete} className="min-h-10 min-w-10 inline-flex items-center justify-center border border-destructive/40 text-destructive"><Trash2 size={13} /></button>
      </div>
    </div>
  </article>;
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
