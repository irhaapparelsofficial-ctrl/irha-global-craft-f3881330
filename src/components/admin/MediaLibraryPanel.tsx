import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  Check,
  Clipboard,
  FileText,
  Image as ImageIcon,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  createMediaStoragePath,
  formatMediaBytes,
  readImageDimensions,
  SITE_MEDIA_BUCKET,
  splitMediaTags,
  validateMediaFile,
} from "@/lib/mediaLibrary";
import { EditorModal, Field, PrimaryButton, SecondaryButton, TextArea, Toggle } from "@/components/admin/content/ContentFormPrimitives";
import { isMissingSchemaError } from "@/components/admin/content/contentCmsTypes";

type MediaAsset = {
  id: string;
  bucket: string;
  storage_path: string;
  public_url: string;
  title: string | null;
  alt_text: string | null;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  tags: string[];
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

type MediaHealth = {
  assetCount: number;
  activeAssetCount: number;
  archivedAssetCount: number;
  missingAltCount: number;
  totalBytes: number;
  lastChangeAt: string | null;
};

type UsageResult = {
  usageCount: number;
  references: Array<{ type: string; id: string; label: string }>;
};

type EditDraft = {
  id: string;
  title: string;
  alt_text: string;
  tagsText: string;
  is_archived: boolean;
};

const db = supabase as any;

export default function MediaLibraryPanel() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [rows, setRows] = useState<MediaAsset[]>([]);
  const [health, setHealth] = useState<MediaHealth | null>(null);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | "images" | "pdf">("all");
  const [archiveFilter, setArchiveFilter] = useState<"active" | "archived" | "all">("active");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<EditDraft | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [assetsResult, healthResult] = await Promise.all([
      db.from("media_assets").select("*").order("created_at", { ascending: false }).limit(2000),
      db.rpc("media_get_admin_health"),
    ]);
    setRows((assetsResult.data as MediaAsset[] | null) || []);
    setHealth((healthResult.data as MediaHealth | null) || null);
    setError(assetsResult.error?.message || healthResult.error?.message || null);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (archiveFilter === "active" && row.is_archived) return false;
      if (archiveFilter === "archived" && !row.is_archived) return false;
      if (kind === "images" && !row.mime_type.startsWith("image/")) return false;
      if (kind === "pdf" && row.mime_type !== "application/pdf") return false;
      if (!needle) return true;
      return [row.title, row.alt_text, row.storage_path, row.tags.join(" "), row.mime_type]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [archiveFilter, kind, query, rows]);

  const uploadFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).slice(0, 20);
    if (list.length === 0) return;
    setUploading(true);

    const { data: userResult } = await supabase.auth.getUser();
    const userId = userResult.user?.id || null;
    let completed = 0;

    for (const file of list) {
      const validation = validateMediaFile(file);
      if (!validation.ok || !validation.mimeType) {
        toast({ title: `${file.name} was skipped`, description: validation.message || "Invalid file", variant: "destructive" });
        continue;
      }

      const storagePath = createMediaStoragePath(file);
      const dimensions = await readImageDimensions(file);
      const { error: uploadError } = await supabase.storage
        .from(SITE_MEDIA_BUCKET)
        .upload(storagePath, file, {
          cacheControl: "31536000",
          contentType: validation.mimeType,
          upsert: false,
        });

      if (uploadError) {
        toast({ title: `${file.name} upload failed`, description: uploadError.message, variant: "destructive" });
        continue;
      }

      const { data: urlData } = supabase.storage.from(SITE_MEDIA_BUCKET).getPublicUrl(storagePath);
      const publicUrl = urlData.publicUrl;
      const title = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
      const { data: asset, error: metadataError } = await db.from("media_assets").insert({
        bucket: SITE_MEDIA_BUCKET,
        storage_path: storagePath,
        public_url: publicUrl,
        title: title || null,
        alt_text: null,
        mime_type: validation.mimeType,
        size_bytes: file.size,
        width: dimensions.width,
        height: dimensions.height,
        tags: [],
        is_archived: false,
        created_by: userId,
        updated_by: userId,
      }).select("*").single();

      if (metadataError) {
        await supabase.storage.from(SITE_MEDIA_BUCKET).remove([storagePath]);
        toast({ title: `${file.name} metadata failed`, description: metadataError.message, variant: "destructive" });
        continue;
      }

      completed += 1;
      setRows((current) => [asset as MediaAsset, ...current]);
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (completed > 0) {
      toast({ title: `${completed} media asset${completed === 1 ? "" : "s"} uploaded`, description: "Add accurate alt text before using images publicly." });
      await load();
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    const current = rows.find((row) => row.id === editing.id);
    if (!current) return;
    if (current.mime_type.startsWith("image/") && !editing.is_archived && editing.alt_text.trim().length < 3) {
      toast({ title: "Image alt text is required", description: "Describe the visible product or scene accurately.", variant: "destructive" });
      return;
    }

    setSaving(true);
    const { data, error: updateError } = await db.from("media_assets").update({
      title: editing.title.trim() || null,
      alt_text: editing.alt_text.trim() || null,
      tags: splitMediaTags(editing.tagsText),
      is_archived: editing.is_archived,
    }).eq("id", editing.id).select("*").single();
    setSaving(false);

    if (updateError) {
      toast({ title: "Media update failed", description: updateError.message, variant: "destructive" });
      return;
    }

    const saved = data as MediaAsset;
    setRows((currentRows) => currentRows.map((row) => row.id === saved.id ? saved : row));
    setEditing(null);
    toast({ title: saved.is_archived ? "Media archived" : "Media details saved" });
    await load();
  };

  const copyUrl = async (row: MediaAsset) => {
    try {
      await navigator.clipboard.writeText(row.public_url);
      setCopiedId(row.id);
      window.setTimeout(() => setCopiedId(null), 1500);
      toast({ title: "Public URL copied" });
    } catch {
      toast({ title: "Copy failed", description: "Select the URL manually from the editor.", variant: "destructive" });
    }
  };

  const permanentDelete = async (row: MediaAsset) => {
    const { data, error: usageError } = await db.rpc("media_get_usage", { _asset_id: row.id });
    if (usageError) {
      toast({ title: "Usage check failed", description: usageError.message, variant: "destructive" });
      return;
    }
    const usage = (data as UsageResult | null) || { usageCount: 0, references: [] };
    if (usage.usageCount > 0) {
      const labels = usage.references.slice(0, 4).map((item) => `${item.type}: ${item.label}`).join(" · ");
      toast({
        title: "Media is still in use",
        description: `${usage.usageCount} reference${usage.usageCount === 1 ? "" : "s"}: ${labels}. Remove references or archive the asset instead.`,
        variant: "destructive",
      });
      return;
    }
    if (!window.confirm(`Permanently delete "${row.title || row.storage_path}" from storage and the media library?`)) return;

    const { error: storageError } = await supabase.storage.from(row.bucket).remove([row.storage_path]);
    if (storageError) {
      toast({ title: "Storage delete failed", description: storageError.message, variant: "destructive" });
      return;
    }
    const { error: metadataError } = await db.from("media_assets").delete().eq("id", row.id);
    if (metadataError) {
      toast({ title: "Metadata delete failed", description: `${metadataError.message}. The storage object was removed; refresh and repair this record before reuse.`, variant: "destructive" });
      return;
    }
    setRows((current) => current.filter((item) => item.id !== row.id));
    toast({ title: "Media permanently deleted" });
    await load();
  };

  return (
    <div className="space-y-6">
      <section className="border border-gold/35 bg-gold/[0.04] p-5 md:p-7">
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
          <div className="flex items-start gap-3 min-w-0">
            <ImageIcon className="text-gold shrink-0 mt-1" size={22} />
            <div>
              <p className="eyebrow mb-2">Phase 2 · Media</p>
              <h2 className="font-display text-2xl md:text-4xl">Media Library</h2>
              <p className="mt-3 text-sm text-foreground/65 leading-relaxed max-w-3xl">
                Upload approved images and PDFs, maintain accessible alt text, copy stable public URLs, archive old assets and block destructive deletion while an asset is referenced.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,application/pdf"
              multiple
              className="hidden"
              onChange={(event) => event.target.files && void uploadFiles(event.target.files)}
            />
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="min-h-11 inline-flex items-center gap-2 bg-gradient-gold text-background px-4 text-[10px] uppercase tracking-[0.18em] disabled:opacity-50">
              <UploadCloud size={14} /> {uploading ? "Uploading…" : "Upload media"}
            </button>
            <button type="button" onClick={() => void load()} disabled={loading} className="min-h-11 inline-flex items-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.18em] hover:border-gold hover:text-gold disabled:opacity-50">
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-2">
          <Metric label="Active" value={health ? String(health.activeAssetCount) : "—"} />
          <Metric label="Archived" value={health ? String(health.archivedAssetCount) : "—"} />
          <Metric label="Missing alt" value={health ? String(health.missingAltCount) : "—"} warn={Boolean(health?.missingAltCount)} />
          <Metric label="Storage" value={health ? formatMediaBytes(health.totalBytes) : "—"} />
        </div>
      </section>

      {error && (
        <section className="border border-amber-500/40 bg-amber-500/[0.06] p-4 text-xs text-foreground/70">
          <p className="font-medium text-amber-300">{isMissingSchemaError({ message: error }) ? "Media backend activation is pending" : "Media library could not load"}</p>
          <p className="mt-1 break-words">{error}</p>
        </section>
      )}

      <section className="border border-border/60 bg-card/20 p-4 md:p-6">
        <div className="flex flex-col xl:flex-row xl:items-center gap-3 mb-5">
          <div className="relative flex-1 max-w-xl">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, alt text, tag or path…" className="min-h-11 w-full border border-border/60 bg-background pl-9 pr-3 text-sm outline-none focus:border-gold" />
          </div>
          <select value={kind} onChange={(event) => setKind(event.target.value as typeof kind)} className="min-h-11 border border-border/60 bg-background px-3 text-sm">
            <option value="all">All file types</option>
            <option value="images">Images</option>
            <option value="pdf">PDF</option>
          </select>
          <select value={archiveFilter} onChange={(event) => setArchiveFilter(event.target.value as typeof archiveFilter)} className="min-h-11 border border-border/60 bg-background px-3 text-sm">
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="all">All states</option>
          </select>
          <p className="text-xs text-muted-foreground xl:ml-auto">{filtered.length} of {rows.length}</p>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Loading media…</div>
        ) : filtered.length === 0 ? (
          <div className="border border-border/50 p-10 text-center">
            <Plus size={28} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="font-display text-2xl">No matching media asset</h3>
            <p className="text-sm text-muted-foreground mt-2">Upload approved media after the final backend activation.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {filtered.map((row) => (
              <article key={row.id} className={`border bg-background/35 overflow-hidden ${row.is_archived ? "border-border/40 opacity-70" : "border-border/60"}`}>
                <div className="aspect-[4/3] bg-secondary flex items-center justify-center overflow-hidden">
                  {row.mime_type.startsWith("image/") ? (
                    <img src={row.public_url} alt={row.alt_text || ""} loading="lazy" className="w-full h-full object-cover" />
                  ) : (
                    <FileText size={42} className="text-gold" />
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium truncate" title={row.title || row.storage_path}>{row.title || row.storage_path.split("/").pop()}</p>
                      <p className="text-[10px] text-muted-foreground mt-1 truncate">{row.mime_type} · {formatMediaBytes(row.size_bytes)}</p>
                    </div>
                    {row.is_archived && <Archive size={14} className="text-muted-foreground shrink-0" />}
                  </div>
                  {row.mime_type.startsWith("image/") && (
                    <p className={`text-xs mt-3 line-clamp-2 ${row.alt_text ? "text-foreground/60" : "text-amber-300"}`}>
                      {row.alt_text || "Alt text missing"}
                    </p>
                  )}
                  {row.tags.length > 0 && <p className="text-[10px] text-muted-foreground mt-2 truncate">{row.tags.join(" · ")}</p>}
                  <div className="mt-4 flex gap-1 border-t border-border/40 pt-3">
                    <button type="button" onClick={() => void copyUrl(row)} className="min-h-10 min-w-10 inline-flex items-center justify-center text-muted-foreground hover:text-gold" title="Copy public URL">
                      {copiedId === row.id ? <Check size={14} /> : <Clipboard size={14} />}
                    </button>
                    <button type="button" onClick={() => setEditing({ id: row.id, title: row.title || "", alt_text: row.alt_text || "", tagsText: row.tags.join(", "), is_archived: row.is_archived })} className="min-h-10 min-w-10 inline-flex items-center justify-center text-muted-foreground hover:text-gold" title="Edit metadata">
                      <Pencil size={14} />
                    </button>
                    <button type="button" onClick={() => void permanentDelete(row)} className="min-h-10 min-w-10 inline-flex items-center justify-center text-destructive/70 hover:text-destructive ml-auto" title="Permanently delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {editing && (() => {
        const asset = rows.find((row) => row.id === editing.id);
        if (!asset) return null;
        return (
          <EditorModal
            eyebrow="Media metadata"
            title={editing.title || asset.storage_path.split("/").pop() || "Media asset"}
            onClose={() => setEditing(null)}
            footer={<><SecondaryButton onClick={() => setEditing(null)} disabled={saving}>Cancel</SecondaryButton><PrimaryButton onClick={() => void saveEdit()} disabled={saving}>{saving ? "Saving…" : "Save media"}</PrimaryButton></>}
          >
            <div className="space-y-4">
              <div className="border border-border/50 bg-background/35 p-3 text-xs break-all text-muted-foreground">{asset.public_url}</div>
              <Field label="Title" value={editing.title} onChange={(value) => setEditing({ ...editing, title: value })} maxLength={180} />
              {asset.mime_type.startsWith("image/") && <TextArea label="Accessible alt text" value={editing.alt_text} onChange={(value) => setEditing({ ...editing, alt_text: value })} rows={4} maxLength={400} required />}
              <Field label="Tags" value={editing.tagsText} onChange={(value) => setEditing({ ...editing, tagsText: value })} placeholder="hero, bavarian, product" />
              <Toggle label="Archive asset" checked={editing.is_archived} onChange={(value) => setEditing({ ...editing, is_archived: value })} description="Archived assets are hidden from public media queries but are not deleted from storage." />
            </div>
          </EditorModal>
        );
      })()}
    </div>
  );
}

function Metric({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="border border-border/50 bg-background/35 p-3 min-w-0">
      <p className="text-[8px] uppercase tracking-[0.15em] text-muted-foreground truncate">{label}</p>
      <p className={`font-display text-xl mt-1 truncate ${warn ? "text-amber-400" : ""}`}>{value}</p>
    </div>
  );
}
