import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, Trash2, Edit3, X, ExternalLink, RefreshCw, Layers } from "lucide-react";

type Category = {
  id: string;
  parent_id: string | null;
  slug: string;
  name: string;
  short: string | null;
  description: string | null;
  image_url: string | null;
  catalog_url: string | null;
  details: string[];
  seo_title: string | null;
  seo_description: string | null;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

type Draft = Omit<Category, "id" | "created_at" | "updated_at" | "details"> & {
  id?: string;
  detailsText: string;
};

// Canonical 5 top-level slugs — enforced across the admin so we can't drift.
export const CANONICAL_TOP_SLUGS = [
  "bavarian-trachten-wear",
  "premium-leather-apparel",
  "sportswear",
  "streetwear-activewear",
  "leisure-nightwear",
] as const;

const emptyDraft = (defaultParentId: string | null = null): Draft => ({
  parent_id: defaultParentId,
  slug: "",
  name: "",
  short: "",
  description: "",
  image_url: "",
  catalog_url: "",
  seo_title: "",
  seo_description: "",
  sort_order: 0,
  is_published: false,
  detailsText: "",
});

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");


export default function CategoriesPanel() {
  const [rows, setRows] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true); setError(null);
    const { data, error } = await supabase.from("categories").select("*").order("sort_order").limit(500);
    if (error) setError(error.message);
    setRows((data as Category[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(s) || r.slug.toLowerCase().includes(s));
  }, [rows, q]);

  const rowById = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);

  const openEdit = (c: Category) => setEditing({
    id: c.id, parent_id: c.parent_id, slug: c.slug, name: c.name,
    short: c.short ?? "", description: c.description ?? "",
    image_url: c.image_url ?? "", catalog_url: c.catalog_url ?? "",
    seo_title: c.seo_title ?? "", seo_description: c.seo_description ?? "",
    sort_order: c.sort_order, is_published: c.is_published,
    detailsText: (c.details ?? []).join("\n"),
  });

  // The 5 canonical main categories (top-level rows only, canonical slugs, published).
  const mainCats = useMemo(
    () => rows.filter((r) => !r.parent_id && CANONICAL_TOP_SLUGS.includes(r.slug as typeof CANONICAL_TOP_SLUGS[number])),
    [rows],
  );

  const save = async () => {
    if (!editing) return;
    const d = editing;
    if (!d.name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }

    // Structural guardrails: new categories must be subcategories under one of the 5 mains;
    // parent (when set) must itself be a top-level canonical main.
    const isExistingMain = d.id && mainCats.some((c) => c.id === d.id);
    if (!isExistingMain) {
      if (!d.parent_id) {
        toast({ title: "Pick a main category", description: "New categories must be a subcategory under one of the 5 main categories.", variant: "destructive" });
        return;
      }
      const parent = rows.find((r) => r.id === d.parent_id);
      if (!parent || parent.parent_id !== null || !CANONICAL_TOP_SLUGS.includes(parent.slug as typeof CANONICAL_TOP_SLUGS[number])) {
        toast({ title: "Invalid parent", description: "Parent must be one of the 5 main categories.", variant: "destructive" });
        return;
      }
    }

    const payload = {
      parent_id: d.parent_id || null,
      slug: d.slug.trim() ? slugify(d.slug) : slugify(d.name),
      name: d.name.trim(),
      short: d.short || null,
      description: d.description || null,
      image_url: d.image_url || null,
      catalog_url: d.catalog_url || null,
      seo_title: d.seo_title || null,
      seo_description: d.seo_description || null,
      sort_order: Number(d.sort_order) || 0,
      is_published: !!d.is_published,
      details: d.detailsText.split("\n").map((s) => s.trim()).filter(Boolean),
    };

    setSaving(true);
    try {
      let id = d.id;
      if (d.id) {
        const { error } = await supabase.from("categories").update(payload).eq("id", d.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("categories").insert(payload).select("id").single();
        if (error) throw error;
        id = data.id;
      }
      const { data: verify, error: vErr } = await supabase.from("categories").select("*").eq("id", id!).single();
      if (vErr) throw vErr;
      setRows((prev) => {
        const others = prev.filter((r) => r.id !== verify.id);
        return [...others, verify as Category];
      });
      toast({ title: d.id ? "Category updated" : "Category created", description: (verify as Category).name });
      setEditing(null);
    } catch (e) {
      toast({ title: "Save failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: Category) => {
    if (!confirm(`Delete category "${c.name}"? Products in it will need to be reassigned. This cannot be undone.`)) return;
    const { error } = await supabase.from("categories").delete().eq("id", c.id);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); return; }
    setRows((prev) => prev.filter((r) => r.id !== c.id));
    toast({ title: "Category deleted" });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or slug…"
            className="w-full pl-9 pr-3 py-2 text-sm bg-card/40 border border-border/60 focus:border-primary outline-none" />
        </div>
        <button onClick={load} className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-primary px-3 py-2">
          <RefreshCw size={12} /> Refresh
        </button>
        <div className="ml-auto text-xs text-muted-foreground">{loading ? "Loading…" : `${filtered.length} of ${rows.length}`}</div>
        <button
          onClick={() => setEditing(emptyDraft(mainCats[0]?.id ?? null))}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] bg-gradient-gold text-primary-foreground px-4 py-2 hover:shadow-gold"
        >
          <Plus size={14} /> New subcategory
        </button>

      </div>

      {error && <div className="border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>}

      {loading ? (
        <div className="text-sm text-muted-foreground py-16 text-center">Loading categories…</div>
      ) : filtered.length === 0 ? (
        <div className="border border-border/60 bg-card/30 p-12 text-center">
          <Layers className="mx-auto mb-3 text-muted-foreground/70" size={28} />
          <h3 className="font-display text-xl">No categories{q ? " match" : " yet"}</h3>
        </div>
      ) : (
        <div className="border border-border/60 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <tr>
                <th className="text-left py-3 px-4">Category</th>
                <th className="text-left py-3 px-4 hidden md:table-cell">Parent</th>
                <th className="text-left py-3 px-4 hidden lg:table-cell">Slug</th>
                <th className="text-right py-3 px-4 hidden sm:table-cell">Order</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-right py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t border-border/40 hover:bg-muted/20">
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-3">
                      {c.image_url ? (
                        <img src={c.image_url} alt="" className="w-10 h-10 object-cover border border-border/40" loading="lazy" />
                      ) : (
                        <div className="w-10 h-10 border border-dashed border-border/40" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-foreground/90">{c.name}</p>
                        {c.short && <p className="text-xs text-muted-foreground truncate">{c.short}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-4 hidden md:table-cell text-foreground/70">{c.parent_id ? rowById.get(c.parent_id)?.name ?? "—" : "—"}</td>
                  <td className="py-2.5 px-4 hidden lg:table-cell text-muted-foreground text-xs">{c.slug}</td>
                  <td className="py-2.5 px-4 text-right hidden sm:table-cell tabular-nums text-muted-foreground">{c.sort_order}</td>
                  <td className="py-2.5 px-4">
                    <span className={`text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 border ${c.is_published ? "border-emerald-500/50 text-emerald-500" : "border-border/60 text-muted-foreground"}`}>
                      {c.is_published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="py-2.5 px-4">
                    <div className="flex items-center justify-end gap-1">
                      <a href={`/products/${c.slug}`} target="_blank" rel="noreferrer" title="Preview"
                         className="p-1.5 text-muted-foreground hover:text-primary"><ExternalLink size={14} /></a>
                      <button onClick={() => openEdit(c)} title="Edit" className="p-1.5 text-muted-foreground hover:text-primary"><Edit3 size={14} /></button>
                      <button onClick={() => remove(c)} title="Delete" className="p-1.5 text-destructive/70 hover:text-destructive"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <CategoryEditor
          draft={editing} setDraft={setEditing} all={rows} mainCats={mainCats}
          onCancel={() => setEditing(null)} onSave={save} saving={saving}
        />
      )}

    </div>
  );
}

function CategoryEditor({
  draft, setDraft, all, mainCats, onCancel, onSave, saving,
}: {
  draft: Draft; setDraft: (d: Draft) => void; all: Category[]; mainCats: Category[];
  onCancel: () => void; onSave: () => void; saving: boolean;
}) {
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft({ ...draft, [k]: v });
  const isExistingMain = !!draft.id && mainCats.some((c) => c.id === draft.id);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 backdrop-blur-sm p-4 md:p-8">
      <div className="w-full max-w-3xl bg-card border border-border/60 shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-border/60 bg-card/95 px-6 py-4 z-10">
          <div>
            <p className="eyebrow">
              {draft.id ? "Edit" : "New"} · {isExistingMain ? "Main category" : "Subcategory"}
            </p>
            <h2 className="font-display text-xl mt-1">{draft.name || "Untitled category"}</h2>
          </div>
          <button onClick={onCancel} className="p-2 text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Name *"><input value={draft.name} onChange={(e) => set("name", e.target.value)} className={inputCls} /></Field>
            <Field label="Slug" hint="Auto from name if empty">
              <input value={draft.slug} onChange={(e) => set("slug", e.target.value)} placeholder="auto" className={inputCls} />
            </Field>
            <Field label={isExistingMain ? "Parent (locked to top-level)" : "Main category *"}
                   hint={isExistingMain ? "This is one of the 5 main categories" : "Required — only the 5 main categories can be parents"}>
              <select
                value={draft.parent_id ?? ""}
                onChange={(e) => set("parent_id", e.target.value || null)}
                disabled={isExistingMain}
                className={inputCls}
              >
                {isExistingMain
                  ? <option value="">— Top-level main category —</option>
                  : <>
                      <option value="">— Select a main category —</option>
                      {mainCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </>
                }
              </select>
            </Field>
            <Field label="Sort order">
              <input type="number" value={draft.sort_order} onChange={(e) => set("sort_order", Number(e.target.value))} className={inputCls} />
            </Field>
          </div>

            <Field label="Sort order">
              <input type="number" value={draft.sort_order} onChange={(e) => set("sort_order", Number(e.target.value))} className={inputCls} />
            </Field>
          </div>

          <Field label="Short tagline"><input value={draft.short ?? ""} onChange={(e) => set("short", e.target.value)} className={inputCls} /></Field>
          <Field label="Description"><textarea rows={4} value={draft.description ?? ""} onChange={(e) => set("description", e.target.value)} className={inputCls} /></Field>

          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Hero image URL"><input value={draft.image_url ?? ""} onChange={(e) => set("image_url", e.target.value)} placeholder="https://…" className={inputCls} /></Field>
            <Field label="Catalog PDF URL"><input value={draft.catalog_url ?? ""} onChange={(e) => set("catalog_url", e.target.value)} placeholder="https://…" className={inputCls} /></Field>
          </div>

          <Field label="Details / bullets" hint="One per line">
            <textarea rows={4} value={draft.detailsText} onChange={(e) => set("detailsText", e.target.value)} className={inputCls} />
          </Field>

          <div className="grid md:grid-cols-2 gap-4">
            <Field label="SEO title"><input value={draft.seo_title ?? ""} onChange={(e) => set("seo_title", e.target.value)} className={inputCls} /></Field>
            <Field label="SEO description"><input value={draft.seo_description ?? ""} onChange={(e) => set("seo_description", e.target.value)} className={inputCls} /></Field>
          </div>

          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={draft.is_published} onChange={(e) => set("is_published", e.target.checked)} />
            <span>Published (visible on public site)</span>
          </label>
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-border/60 bg-card/95 px-6 py-4">
          <button onClick={onCancel} className="text-xs uppercase tracking-[0.25em] px-4 py-2 border border-border/60 hover:border-primary">Cancel</button>
          <button onClick={onSave} disabled={saving}
            className="text-xs uppercase tracking-[0.25em] bg-gradient-gold text-primary-foreground px-5 py-2 hover:shadow-gold disabled:opacity-60">
            {saving ? "Saving…" : draft.id ? "Save changes" : "Create category"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full bg-background/60 border border-border/60 focus:border-primary outline-none px-3 py-2 text-sm";
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{label}</span>
      {hint && <span className="text-[10px] text-muted-foreground/70 ml-2">· {hint}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
