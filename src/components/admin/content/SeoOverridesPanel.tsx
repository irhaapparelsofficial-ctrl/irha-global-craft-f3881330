import { useEffect, useMemo, useState } from "react";
import { Edit3, ExternalLink, Plus, RefreshCw, Search, SearchCheck, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { SeoOverrideRow } from "./contentCmsTypes";
import { isMissingSchemaError, normalizeRoute, safeOptionalUrl } from "./contentCmsTypes";
import { EditorModal, Field, PrimaryButton, SecondaryButton, StatusBadge, TextArea, Toggle } from "./ContentFormPrimitives";

const db = supabase as any;

type Draft = {
  id?: string;
  route: string;
  locale: string;
  seo_title: string;
  seo_description: string;
  og_image_url: string;
  canonical_url: string;
  jsonLdText: string;
  noindex: boolean;
  is_published: boolean;
  notes: string;
};

const emptyDraft = (): Draft => ({ route: "/", locale: "en", seo_title: "", seo_description: "", og_image_url: "", canonical_url: "", jsonLdText: "", noindex: false, is_published: false, notes: "" });
const toDraft = (row: SeoOverrideRow): Draft => ({
  id: row.id,
  route: row.route,
  locale: row.locale,
  seo_title: row.seo_title || "",
  seo_description: row.seo_description || "",
  og_image_url: row.og_image_url || "",
  canonical_url: row.canonical_url || "",
  jsonLdText: row.json_ld ? JSON.stringify(row.json_ld, null, 2) : "",
  noindex: row.noindex,
  is_published: row.is_published,
  notes: row.notes || "",
});

export default function SeoOverridesPanel({ onChanged }: { onChanged: () => void }) {
  const [rows, setRows] = useState<SeoOverrideRow[]>([]);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error: queryError } = await db.from("seo_page_overrides").select("*").order("route").order("locale").limit(1000);
    setRows((data as SeoOverrideRow[] | null) || []);
    setError(queryError?.message || null);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => [row.route, row.locale, row.seo_title, row.seo_description, row.notes].filter(Boolean).join(" ").toLowerCase().includes(needle));
  }, [query, rows]);

  const save = async () => {
    if (!editing) return;
    const route = normalizeRoute(editing.route);
    if (!route) {
      toast({ title: "Use a clean internal route", description: "Example: /products/sportswear. Query strings and fragments are not allowed.", variant: "destructive" });
      return;
    }
    if (!/^[a-z]{2}(?:-[A-Z]{2})?$/.test(editing.locale.trim())) {
      toast({ title: "Locale must look like en or de-DE", variant: "destructive" });
      return;
    }
    if (editing.is_published && !editing.seo_title.trim() && !editing.seo_description.trim() && !editing.noindex) {
      toast({ title: "Published override has no effect", description: "Add a title, description, canonical, image, JSON-LD or noindex rule.", variant: "destructive" });
      return;
    }

    let jsonLd: Record<string, unknown> | unknown[] | null = null;
    if (editing.jsonLdText.trim()) {
      try {
        const parsed = JSON.parse(editing.jsonLdText);
        if (!parsed || typeof parsed !== "object") throw new Error("JSON-LD must be an object or array");
        jsonLd = parsed;
      } catch (jsonError) {
        toast({ title: "JSON-LD is invalid", description: jsonError instanceof Error ? jsonError.message : "Use valid JSON.", variant: "destructive" });
        return;
      }
    }

    const image = safeOptionalUrl(editing.og_image_url);
    const canonical = safeOptionalUrl(editing.canonical_url);
    if (image === undefined || canonical === undefined) {
      toast({ title: "Invalid URL", description: "Use an internal path or HTTPS URL.", variant: "destructive" });
      return;
    }

    const payload = {
      route,
      locale: editing.locale.trim(),
      seo_title: editing.seo_title.trim() || null,
      seo_description: editing.seo_description.trim() || null,
      og_image_url: image,
      canonical_url: canonical,
      json_ld: jsonLd,
      noindex: editing.noindex,
      is_published: editing.is_published,
      notes: editing.notes.trim() || null,
    };
    setSaving(true);
    const result = editing.id
      ? await db.from("seo_page_overrides").update(payload).eq("id", editing.id).select("*").single()
      : await db.from("seo_page_overrides").insert(payload).select("*").single();
    setSaving(false);
    if (result.error) {
      toast({ title: "SEO override save failed", description: result.error.message, variant: "destructive" });
      return;
    }
    const saved = result.data as SeoOverrideRow;
    setRows((current) => [...current.filter((row) => row.id !== saved.id), saved].sort((a, b) => a.route.localeCompare(b.route) || a.locale.localeCompare(b.locale)));
    setEditing(null);
    toast({ title: editing.id ? "SEO override updated" : "SEO override created", description: saved.is_published ? "The published route can now use this metadata." : "Saved as a private draft." });
    onChanged();
  };

  const remove = async (row: SeoOverrideRow) => {
    if (!window.confirm(`Delete SEO override for ${row.route} (${row.locale})?`)) return;
    const { error: deleteError } = await db.from("seo_page_overrides").delete().eq("id", row.id);
    if (deleteError) {
      toast({ title: "Delete failed", description: deleteError.message, variant: "destructive" });
      return;
    }
    setRows((current) => current.filter((item) => item.id !== row.id));
    toast({ title: "SEO override deleted" });
    onChanged();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1 max-w-xl">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search route, title, description or notes…" className="min-h-11 w-full border border-border/60 bg-background pl-9 pr-3 text-sm outline-none focus:border-gold" />
        </div>
        <button type="button" onClick={() => void load()} className="min-h-11 inline-flex items-center justify-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.18em] hover:border-gold hover:text-gold"><RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh</button>
        <button type="button" onClick={() => setEditing(emptyDraft())} className="min-h-11 inline-flex items-center justify-center gap-2 bg-gradient-gold text-background px-4 text-[10px] uppercase tracking-[0.18em]"><Plus size={13} /> New override</button>
      </div>

      {error && <div className="border border-amber-500/40 bg-amber-500/[0.06] p-4 text-xs text-foreground/70"><p className="font-medium text-amber-300">{isMissingSchemaError({ message: error }) ? "Final database activation pending" : "SEO overrides could not load"}</p><p className="mt-1 break-words">{error}</p></div>}

      {loading ? <div className="py-14 text-center text-sm text-muted-foreground">Loading SEO overrides…</div> : filtered.length === 0 ? (
        <div className="border border-border/60 bg-card/25 p-10 text-center"><SearchCheck size={28} className="mx-auto text-muted-foreground mb-4" /><h3 className="font-display text-2xl">No matching SEO override</h3><p className="text-sm text-muted-foreground mt-2">Base page metadata remains active until a published override exists.</p></div>
      ) : (
        <div className="border border-border/60 overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-secondary/40 text-[9px] uppercase tracking-[0.18em] text-muted-foreground"><tr><th className="text-left p-3">Route</th><th className="text-left p-3">Metadata</th><th className="text-left p-3">Status</th><th className="text-right p-3">Actions</th></tr></thead>
            <tbody>{filtered.map((row) => (
              <tr key={row.id} className="border-t border-border/40 hover:bg-muted/20">
                <td className="p-3"><p className="font-medium break-all">{row.route}</p><p className="text-xs text-muted-foreground mt-1">{row.locale}</p></td>
                <td className="p-3 max-w-xl"><p className="truncate">{row.seo_title || "Base title retained"}</p><p className="text-xs text-muted-foreground mt-1 line-clamp-2">{row.seo_description || "Base description retained"}</p></td>
                <td className="p-3"><StatusBadge published={row.is_published} noindex={row.noindex} /></td>
                <td className="p-3"><div className="flex justify-end gap-1"><a href={row.route} target="_blank" rel="noreferrer" className="min-h-10 min-w-10 inline-flex items-center justify-center text-muted-foreground hover:text-gold" title="Open route"><ExternalLink size={14} /></a><button type="button" onClick={() => setEditing(toDraft(row))} className="min-h-10 min-w-10 inline-flex items-center justify-center text-muted-foreground hover:text-gold" title="Edit"><Edit3 size={14} /></button><button type="button" onClick={() => void remove(row)} className="min-h-10 min-w-10 inline-flex items-center justify-center text-destructive/70 hover:text-destructive" title="Delete"><Trash2 size={14} /></button></div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {editing && (
        <EditorModal eyebrow={editing.id ? "Edit SEO override" : "New SEO override"} title={`${editing.route || "/"} · ${editing.locale}`} onClose={() => setEditing(null)} maxWidth="max-w-5xl" footer={<><SecondaryButton onClick={() => setEditing(null)} disabled={saving}>Cancel</SecondaryButton><PrimaryButton onClick={() => void save()} disabled={saving}>{saving ? "Saving…" : editing.is_published ? "Save & publish" : "Save draft"}</PrimaryButton></>}>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Route" value={editing.route} onChange={(value) => setEditing({ ...editing, route: value })} placeholder="/products/sportswear" required />
            <Field label="Locale" value={editing.locale} onChange={(value) => setEditing({ ...editing, locale: value })} placeholder="en or de-DE" required />
            <div className="md:col-span-2"><Field label="SEO title" value={editing.seo_title} onChange={(value) => setEditing({ ...editing, seo_title: value })} maxLength={180} /></div>
            <div className="md:col-span-2"><TextArea label="SEO description" value={editing.seo_description} onChange={(value) => setEditing({ ...editing, seo_description: value })} rows={3} maxLength={500} /></div>
            <Field label="Canonical URL" value={editing.canonical_url} onChange={(value) => setEditing({ ...editing, canonical_url: value })} placeholder="/route or https://…" />
            <Field label="Open Graph image" value={editing.og_image_url} onChange={(value) => setEditing({ ...editing, og_image_url: value })} placeholder="/image.webp or https://…" />
            <div className="md:col-span-2"><TextArea label="JSON-LD" value={editing.jsonLdText} onChange={(value) => setEditing({ ...editing, jsonLdText: value })} rows={10} mono placeholder={'{"@context":"https://schema.org","@type":"WebPage"}'} /></div>
            <div className="md:col-span-2"><TextArea label="Internal notes" value={editing.notes} onChange={(value) => setEditing({ ...editing, notes: value })} rows={3} maxLength={2000} /></div>
            <Toggle label="Noindex route" checked={editing.noindex} onChange={(value) => setEditing({ ...editing, noindex: value })} description="Published noindex overrides prevent search indexing while keeping links followable." />
            <Toggle label="Publish override" checked={editing.is_published} onChange={(value) => setEditing({ ...editing, is_published: value })} description="Draft overrides never change public metadata." />
          </div>
        </EditorModal>
      )}
    </div>
  );
}
