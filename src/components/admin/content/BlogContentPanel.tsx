import { useEffect, useMemo, useState } from "react";
import { Edit3, ExternalLink, FileText, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { BlogRow } from "./contentCmsTypes";
import { isMissingSchemaError, safeOptionalUrl, slugify, splitList } from "./contentCmsTypes";
import { EditorModal, Field, PrimaryButton, SecondaryButton, StatusBadge, TextArea, Toggle } from "./ContentFormPrimitives";

const db = supabase as any;

type Draft = {
  id?: string;
  slug: string;
  locale: string;
  title: string;
  excerpt: string;
  cover_image_url: string;
  body_md: string;
  tagsText: string;
  author: string;
  seo_title: string;
  seo_description: string;
  canonical_url: string;
  og_image_url: string;
  is_published: boolean;
  sort_order: number;
};

const emptyDraft = (): Draft => ({
  slug: "",
  locale: "en",
  title: "",
  excerpt: "",
  cover_image_url: "",
  body_md: "",
  tagsText: "",
  author: "Irha Apparels",
  seo_title: "",
  seo_description: "",
  canonical_url: "",
  og_image_url: "",
  is_published: false,
  sort_order: 0,
});

function toDraft(row: BlogRow): Draft {
  return {
    id: row.id,
    slug: row.slug,
    locale: row.locale,
    title: row.title,
    excerpt: row.excerpt || "",
    cover_image_url: row.cover_image_url || "",
    body_md: row.body_md || "",
    tagsText: (row.tags || []).join(", "),
    author: row.author || "",
    seo_title: row.seo_title || "",
    seo_description: row.seo_description || "",
    canonical_url: row.canonical_url || "",
    og_image_url: row.og_image_url || "",
    is_published: row.is_published,
    sort_order: row.sort_order,
  };
}

export default function BlogContentPanel({ onChanged }: { onChanged: () => void }) {
  const [rows, setRows] = useState<BlogRow[]>([]);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "published" | "draft">("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error: queryError } = await db.from("blog_posts").select("*").order("sort_order").order("updated_at", { ascending: false }).limit(1000);
    setRows((data as BlogRow[] | null) || []);
    setError(queryError?.message || null);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (status === "published" && !row.is_published) return false;
      if (status === "draft" && row.is_published) return false;
      if (!needle) return true;
      return [row.title, row.slug, row.excerpt, row.tags.join(" ")].filter(Boolean).join(" ").toLowerCase().includes(needle);
    });
  }, [query, rows, status]);

  const save = async () => {
    if (!editing) return;
    const title = editing.title.trim();
    const slug = slugify(editing.slug || title);
    if (title.length < 2 || !slug) {
      toast({ title: "Title and valid slug are required", variant: "destructive" });
      return;
    }
    if (!/^[a-z]{2}(?:-[A-Z]{2})?$/.test(editing.locale.trim())) {
      toast({ title: "Locale must look like en or de-DE", variant: "destructive" });
      return;
    }
    if (editing.is_published && (editing.excerpt.trim().length < 40 || editing.body_md.trim().length < 100)) {
      toast({ title: "Published articles need a useful excerpt and body", description: "Use at least 40 excerpt characters and 100 body characters.", variant: "destructive" });
      return;
    }

    const cover = safeOptionalUrl(editing.cover_image_url);
    const canonical = safeOptionalUrl(editing.canonical_url);
    const og = safeOptionalUrl(editing.og_image_url);
    if (cover === undefined || canonical === undefined || og === undefined) {
      toast({ title: "Invalid URL", description: "Media and canonical URLs must be internal paths or HTTPS URLs.", variant: "destructive" });
      return;
    }

    const payload = {
      slug,
      locale: editing.locale.trim(),
      title,
      excerpt: editing.excerpt.trim() || null,
      cover_image_url: cover,
      body_md: editing.body_md.trim() || null,
      tags: splitList(editing.tagsText),
      author: editing.author.trim() || null,
      seo_title: editing.seo_title.trim() || null,
      seo_description: editing.seo_description.trim() || null,
      canonical_url: canonical,
      og_image_url: og,
      is_published: editing.is_published,
      sort_order: Number(editing.sort_order) || 0,
    };

    setSaving(true);
    const result = editing.id
      ? await db.from("blog_posts").update(payload).eq("id", editing.id).select("*").single()
      : await db.from("blog_posts").insert(payload).select("*").single();
    setSaving(false);

    if (result.error) {
      toast({ title: "Article save failed", description: result.error.message, variant: "destructive" });
      return;
    }

    const saved = result.data as BlogRow;
    setRows((current) => [...current.filter((row) => row.id !== saved.id), saved].sort((a, b) => a.sort_order - b.sort_order));
    setEditing(null);
    toast({ title: editing.id ? "Article updated" : "Article created", description: saved.is_published ? "Published article is available to the buyer journal." : "Saved as a private draft." });
    onChanged();
  };

  const remove = async (row: BlogRow) => {
    if (!window.confirm(`Delete article "${row.title}"? This cannot be undone.`)) return;
    const { error: deleteError } = await db.from("blog_posts").delete().eq("id", row.id);
    if (deleteError) {
      toast({ title: "Delete failed", description: deleteError.message, variant: "destructive" });
      return;
    }
    setRows((current) => current.filter((item) => item.id !== row.id));
    toast({ title: "Article deleted" });
    onChanged();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1 max-w-xl">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, slug, excerpt or tags…" className="min-h-11 w-full border border-border/60 bg-background pl-9 pr-3 text-sm outline-none focus:border-gold" />
        </div>
        <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="min-h-11 border border-border/60 bg-background px-3 text-sm">
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Drafts</option>
        </select>
        <button type="button" onClick={() => void load()} className="min-h-11 inline-flex items-center justify-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.18em] hover:border-gold hover:text-gold">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
        <button type="button" onClick={() => setEditing(emptyDraft())} className="min-h-11 inline-flex items-center justify-center gap-2 bg-gradient-gold text-background px-4 text-[10px] uppercase tracking-[0.18em]">
          <Plus size={13} /> New article
        </button>
      </div>

      {error && (
        <div className="border border-amber-500/40 bg-amber-500/[0.06] p-4 text-xs text-foreground/70">
          <p className="font-medium text-amber-300">{isMissingSchemaError({ message: error }) ? "Final database activation pending" : "Articles could not load"}</p>
          <p className="mt-1 break-words">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="py-14 text-center text-sm text-muted-foreground">Loading articles…</div>
      ) : filtered.length === 0 ? (
        <div className="border border-border/60 bg-card/25 p-10 text-center">
          <FileText size={28} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="font-display text-2xl">No matching article</h3>
          <p className="text-sm text-muted-foreground mt-2">Create a private draft and publish only after content review.</p>
        </div>
      ) : (
        <div className="border border-border/60 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-secondary/40 text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
              <tr><th className="text-left p-3">Article</th><th className="text-left p-3">Locale</th><th className="text-left p-3">Status</th><th className="text-right p-3">Order</th><th className="text-right p-3">Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-t border-border/40 hover:bg-muted/20">
                  <td className="p-3 max-w-xl"><p className="font-medium truncate">{row.title}</p><p className="text-xs text-muted-foreground mt-1 truncate">/blog/{row.slug}</p></td>
                  <td className="p-3 text-muted-foreground">{row.locale}</td>
                  <td className="p-3"><StatusBadge published={row.is_published} /></td>
                  <td className="p-3 text-right tabular-nums text-muted-foreground">{row.sort_order}</td>
                  <td className="p-3"><div className="flex justify-end gap-1">
                    {row.is_published && <a href={`/blog/${row.slug}`} target="_blank" rel="noreferrer" className="min-h-10 min-w-10 inline-flex items-center justify-center text-muted-foreground hover:text-gold" title="Open published article"><ExternalLink size={14} /></a>}
                    <button type="button" onClick={() => setEditing(toDraft(row))} className="min-h-10 min-w-10 inline-flex items-center justify-center text-muted-foreground hover:text-gold" title="Edit"><Edit3 size={14} /></button>
                    <button type="button" onClick={() => void remove(row)} className="min-h-10 min-w-10 inline-flex items-center justify-center text-destructive/70 hover:text-destructive" title="Delete"><Trash2 size={14} /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <EditorModal
          eyebrow={editing.id ? "Edit article" : "New article"}
          title={editing.title || "Buyer journal draft"}
          onClose={() => setEditing(null)}
          maxWidth="max-w-6xl"
          footer={<><SecondaryButton onClick={() => setEditing(null)} disabled={saving}>Cancel</SecondaryButton><PrimaryButton onClick={() => void save()} disabled={saving}>{saving ? "Saving…" : editing.is_published ? "Save & publish" : "Save draft"}</PrimaryButton></>}
        >
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Title" value={editing.title} onChange={(value) => setEditing({ ...editing, title: value, slug: editing.slug || slugify(value) })} maxLength={180} required />
            <Field label="Slug" value={editing.slug} onChange={(value) => setEditing({ ...editing, slug: slugify(value) })} maxLength={160} required />
            <Field label="Locale" value={editing.locale} onChange={(value) => setEditing({ ...editing, locale: value })} placeholder="en or de-DE" required />
            <Field label="Sort order" type="number" value={editing.sort_order} onChange={(value) => setEditing({ ...editing, sort_order: Number(value) || 0 })} />
            <div className="md:col-span-2"><TextArea label="Excerpt" value={editing.excerpt} onChange={(value) => setEditing({ ...editing, excerpt: value })} rows={3} maxLength={500} /></div>
            <Field label="Cover image" value={editing.cover_image_url} onChange={(value) => setEditing({ ...editing, cover_image_url: value })} placeholder="/image.webp or https://…" />
            <Field label="Author" value={editing.author} onChange={(value) => setEditing({ ...editing, author: value })} maxLength={120} />
            <div className="md:col-span-2"><TextArea label="Article body (safe Markdown)" value={editing.body_md} onChange={(value) => setEditing({ ...editing, body_md: value })} rows={18} maxLength={100000} mono placeholder="# Heading\n\nBuyer-focused article content…" /></div>
            <div className="md:col-span-2"><Field label="Tags" value={editing.tagsText} onChange={(value) => setEditing({ ...editing, tagsText: value })} placeholder="sourcing, private label, quality" /></div>
            <Field label="SEO title" value={editing.seo_title} onChange={(value) => setEditing({ ...editing, seo_title: value })} maxLength={180} />
            <Field label="Canonical URL" value={editing.canonical_url} onChange={(value) => setEditing({ ...editing, canonical_url: value })} placeholder="/blog/slug or https://…" />
            <div className="md:col-span-2"><TextArea label="SEO description" value={editing.seo_description} onChange={(value) => setEditing({ ...editing, seo_description: value })} rows={3} maxLength={500} /></div>
            <div className="md:col-span-2"><Field label="Open Graph image" value={editing.og_image_url} onChange={(value) => setEditing({ ...editing, og_image_url: value })} placeholder="/image.webp or https://…" /></div>
            <div className="md:col-span-2"><Toggle label="Publish article" checked={editing.is_published} onChange={(value) => setEditing({ ...editing, is_published: value })} description="Published articles become visible at /blog. Keep unchecked until the wording and evidence are reviewed." /></div>
          </div>
        </EditorModal>
      )}
    </div>
  );
}
