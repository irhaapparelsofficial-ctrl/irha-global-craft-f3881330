import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, Trash2, Edit3, X, ExternalLink, RefreshCw, ImageIcon } from "lucide-react";

type Category = { id: string; name: string; slug: string; parent_id: string | null; is_published: boolean };
type Product = {
  id: string;
  category_id: string;
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
  gallery: string[];
  specs: string[];
  details: unknown;
  material_specifications: string | null;
  seo_title: string | null;
  seo_description: string | null;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

type Draft = Omit<Product, "id" | "created_at" | "updated_at" | "gallery" | "specs" | "details"> & {
  id?: string;
  galleryText: string; // newline-separated URLs
  specsText: string;   // newline-separated bullets
};

const emptyDraft = (categoryId = ""): Draft => ({
  category_id: categoryId,
  slug: "",
  name: "",
  description: "",
  image_url: "",
  material_specifications: "",
  seo_title: "",
  seo_description: "",
  sort_order: 0,
  is_published: false,
  galleryText: "",
  specsText: "",
});

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");

export default function ProductsPanel() {
  const [cats, setCats] = useState<Category[]>([]);
  const [rows, setRows] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [sort, setSort] = useState<"sort_order" | "name" | "updated_at">("sort_order");
  const [editing, setEditing] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const catMap = useMemo(() => new Map(cats.map((c) => [c.id, c])), [cats]);

  const load = async () => {
    setLoading(true); setError(null);
    const [cRes, pRes] = await Promise.all([
      supabase.from("categories").select("id,name,slug,parent_id,is_published").order("sort_order"),
      supabase.from("products").select("*").order("sort_order", { ascending: true }).limit(500),
    ]);
    if (cRes.error) setError(cRes.error.message);
    if (pRes.error) setError(pRes.error.message);
    setCats((cRes.data as Category[]) ?? []);
    setRows((pRes.data as Product[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  // Only subcategories (rows with a parent) can hold products.
  const subCats = useMemo(() => cats.filter((c) => c.parent_id !== null), [cats]);
  const mainCats = useMemo(() => cats.filter((c) => c.parent_id === null && c.is_published), [cats]);


  const filtered = useMemo(() => {
    let list = rows;
    if (catFilter !== "all") list = list.filter((r) => r.category_id === catFilter);
    const s = q.trim().toLowerCase();
    if (s) list = list.filter((r) => r.name.toLowerCase().includes(s) || r.slug.toLowerCase().includes(s));
    list = [...list].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "updated_at") return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      return a.sort_order - b.sort_order;
    });
    return list;
  }, [rows, q, catFilter, sort]);

  const openNew = () => {
    if (cats.length === 0) { toast({ title: "Create a category first", variant: "destructive" }); return; }
    setEditing(emptyDraft(cats[0].id));
  };
  const openEdit = (p: Product) => {
    setEditing({
      id: p.id,
      category_id: p.category_id,
      slug: p.slug,
      name: p.name,
      description: p.description ?? "",
      image_url: p.image_url ?? "",
      material_specifications: p.material_specifications ?? "",
      seo_title: p.seo_title ?? "",
      seo_description: p.seo_description ?? "",
      sort_order: p.sort_order,
      is_published: p.is_published,
      galleryText: (p.gallery ?? []).join("\n"),
      specsText: (p.specs ?? []).join("\n"),
    });
  };

  const save = async () => {
    if (!editing) return;
    const d = editing;
    if (!d.name.trim() || !d.category_id) {
      toast({ title: "Name and category are required", variant: "destructive" }); return;
    }
    const slug = d.slug.trim() ? slugify(d.slug) : slugify(d.name);
    const payload = {
      category_id: d.category_id,
      slug,
      name: d.name.trim(),
      description: d.description || null,
      image_url: d.image_url || null,
      material_specifications: d.material_specifications || null,
      seo_title: d.seo_title || null,
      seo_description: d.seo_description || null,
      sort_order: Number(d.sort_order) || 0,
      is_published: !!d.is_published,
      gallery: d.galleryText.split("\n").map((s) => s.trim()).filter(Boolean),
      specs: d.specsText.split("\n").map((s) => s.trim()).filter(Boolean),
    };
    setSaving(true);
    try {
      let savedId = d.id;
      if (d.id) {
        const { error } = await supabase.from("products").update(payload).eq("id", d.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("products").insert(payload).select("id").single();
        if (error) throw error;
        savedId = data.id;
      }
      // Re-read from DB to prove persistence
      const { data: verify, error: vErr } = await supabase.from("products").select("*").eq("id", savedId!).single();
      if (vErr) throw vErr;
      setRows((prev) => {
        const others = prev.filter((r) => r.id !== verify.id);
        return [...others, verify as Product];
      });
      toast({ title: d.id ? "Product updated" : "Product created", description: (verify as Product).name });
      setEditing(null);
    } catch (e) {
      toast({ title: "Save failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p: Product) => {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); return; }
    setRows((prev) => prev.filter((r) => r.id !== p.id));
    toast({ title: "Product deleted" });
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or slug…"
            className="w-full pl-9 pr-3 py-2 text-sm bg-card/40 border border-border/60 focus:border-primary outline-none"
          />
        </div>
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="text-sm bg-card/40 border border-border/60 px-3 py-2"
        >
          <option value="all">All categories</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="text-sm bg-card/40 border border-border/60 px-3 py-2">
          <option value="sort_order">Sort: order</option>
          <option value="name">Sort: name</option>
          <option value="updated_at">Sort: updated</option>
        </select>
        <button onClick={load} className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-primary px-3 py-2">
          <RefreshCw size={12} /> Refresh
        </button>
        <div className="ml-auto text-xs text-muted-foreground">
          {loading ? "Loading…" : `${filtered.length} of ${rows.length}`}
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] bg-gradient-gold text-primary-foreground px-4 py-2 hover:shadow-gold"
        >
          <Plus size={14} /> New product
        </button>
      </div>

      {error && <div className="border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>}

      {loading ? (
        <div className="text-sm text-muted-foreground py-16 text-center">Loading products…</div>
      ) : filtered.length === 0 ? (
        <div className="border border-border/60 bg-card/30 p-12 text-center">
          <ImageIcon className="mx-auto mb-3 text-muted-foreground/70" size={28} />
          <h3 className="font-display text-xl">No products{q || catFilter !== "all" ? " match" : " yet"}</h3>
          <p className="text-sm text-muted-foreground mt-2">Click <b>New product</b> to create one.</p>
        </div>
      ) : (
        <div className="border border-border/60 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <tr>
                <th className="text-left py-3 px-4">Product</th>
                <th className="text-left py-3 px-4 hidden md:table-cell">Category</th>
                <th className="text-left py-3 px-4 hidden lg:table-cell">Slug</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-right py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const cat = catMap.get(p.category_id);
                return (
                  <tr key={p.id} className="border-t border-border/40 hover:bg-muted/20">
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-3">
                        {p.image_url ? (
                          <img src={p.image_url} alt="" className="w-10 h-10 object-cover border border-border/40" loading="lazy" />
                        ) : (
                          <div className="w-10 h-10 border border-dashed border-border/40 flex items-center justify-center text-muted-foreground/50"><ImageIcon size={14} /></div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-foreground/90">{p.name}</p>
                          <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground md:hidden">{cat?.name ?? "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 hidden md:table-cell text-foreground/70">{cat?.name ?? "—"}</td>
                    <td className="py-2.5 px-4 hidden lg:table-cell text-muted-foreground text-xs">{p.slug}</td>
                    <td className="py-2.5 px-4">
                      <span className={`text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 border ${p.is_published ? "border-emerald-500/50 text-emerald-500" : "border-border/60 text-muted-foreground"}`}>
                        {p.is_published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center justify-end gap-1">
                        {cat && (
                          <a
                            href={`/products/${cat.slug}/${p.slug}`}
                            target="_blank" rel="noreferrer"
                            title="Preview"
                            className="p-1.5 text-muted-foreground hover:text-primary"
                          ><ExternalLink size={14} /></a>
                        )}
                        <button onClick={() => openEdit(p)} title="Edit" className="p-1.5 text-muted-foreground hover:text-primary">
                          <Edit3 size={14} />
                        </button>
                        <button onClick={() => remove(p)} title="Delete" className="p-1.5 text-destructive/70 hover:text-destructive">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <ProductEditor
          draft={editing}
          setDraft={setEditing}
          cats={cats}
          onCancel={() => setEditing(null)}
          onSave={save}
          saving={saving}
        />
      )}
    </div>
  );
}

function ProductEditor({
  draft, setDraft, cats, onCancel, onSave, saving,
}: {
  draft: Draft; setDraft: (d: Draft) => void; cats: Category[];
  onCancel: () => void; onSave: () => void; saving: boolean;
}) {
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft({ ...draft, [k]: v });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 backdrop-blur-sm p-4 md:p-8">
      <div className="w-full max-w-3xl bg-card border border-border/60 shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-border/60 bg-card/95 px-6 py-4 z-10">
          <div>
            <p className="eyebrow">{draft.id ? "Edit" : "New"} · Product</p>
            <h2 className="font-display text-xl mt-1">{draft.name || "Untitled product"}</h2>
          </div>
          <button onClick={onCancel} className="p-2 text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Name *">
              <input value={draft.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Category *">
              <select value={draft.category_id} onChange={(e) => set("category_id", e.target.value)} className={inputCls}>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Slug" hint="Auto-generated from name if empty">
              <input value={draft.slug} onChange={(e) => set("slug", e.target.value)} placeholder="auto-generated" className={inputCls} />
            </Field>
            <Field label="Sort order">
              <input type="number" value={draft.sort_order} onChange={(e) => set("sort_order", Number(e.target.value))} className={inputCls} />
            </Field>
          </div>

          <Field label="Description">
            <textarea rows={4} value={draft.description ?? ""} onChange={(e) => set("description", e.target.value)} className={inputCls} />
          </Field>

          <Field label="Cover image URL">
            <input value={draft.image_url ?? ""} onChange={(e) => set("image_url", e.target.value)} placeholder="https://…" className={inputCls} />
          </Field>

          <Field label="Gallery URLs" hint="One URL per line">
            <textarea rows={3} value={draft.galleryText} onChange={(e) => set("galleryText", e.target.value)} className={inputCls} />
          </Field>

          <Field label="Specs / bullets" hint="One per line">
            <textarea rows={3} value={draft.specsText} onChange={(e) => set("specsText", e.target.value)} className={inputCls} />
          </Field>

          <Field label="Material specifications">
            <textarea rows={2} value={draft.material_specifications ?? ""} onChange={(e) => set("material_specifications", e.target.value)} className={inputCls} />
          </Field>

          <div className="grid md:grid-cols-2 gap-4">
            <Field label="SEO title">
              <input value={draft.seo_title ?? ""} onChange={(e) => set("seo_title", e.target.value)} className={inputCls} />
            </Field>
            <Field label="SEO description">
              <input value={draft.seo_description ?? ""} onChange={(e) => set("seo_description", e.target.value)} className={inputCls} />
            </Field>
          </div>

          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={draft.is_published} onChange={(e) => set("is_published", e.target.checked)} />
            <span>Published (visible on public site)</span>
          </label>
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-border/60 bg-card/95 px-6 py-4">
          <button onClick={onCancel} className="text-xs uppercase tracking-[0.25em] px-4 py-2 border border-border/60 hover:border-primary">Cancel</button>
          <button
            onClick={onSave}
            disabled={saving}
            className="text-xs uppercase tracking-[0.25em] bg-gradient-gold text-primary-foreground px-5 py-2 hover:shadow-gold disabled:opacity-60"
          >
            {saving ? "Saving…" : draft.id ? "Save changes" : "Create product"}
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
