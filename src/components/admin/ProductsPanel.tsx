import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Plus, Search, Trash2, Edit3, X, ExternalLink, RefreshCw, ImageIcon,
  Copy, CheckSquare, Square, Download, Star,
} from "lucide-react";

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
  details: Array<{ label: string; value: string }>;
  material_specifications: string | null;
  seo_title: string | null;
  seo_description: string | null;
  sort_order: number;
  is_published: boolean;
  is_featured: boolean;
  sku: string | null;
  short_description: string | null;
  moq_display: string | null;
  moq_min: number | null;
  sample_available: boolean | null;
  sample_timeline: string | null;
  production_timeline: string | null;
  country_of_origin: string | null;
  primary_material: string | null;
  fabric_composition: string | null;
  gsm: string | null;
  available_sizes: string[];
  size_notes: string | null;
  available_colors: string[];
  custom_colors: boolean | null;
  customization: Record<string, boolean>;
  packaging_standard: string | null;
  packaging_custom: boolean | null;
  related_product_ids: string[];
  created_at: string;
  updated_at: string;
};

type EditorTab = "basics" | "buyer" | "materials" | "customization" | "media" | "seo" | "publish";

type Draft = {
  id?: string;
  category_id: string;
  slug: string;
  name: string;
  description: string;
  short_description: string;
  sku: string;
  image_url: string;
  material_specifications: string;
  seo_title: string;
  seo_description: string;
  sort_order: number;
  is_published: boolean;
  is_featured: boolean;
  galleryText: string;
  specsText: string;
  moq_display: string;
  moq_min: string;
  sample_available: boolean;
  sample_timeline: string;
  production_timeline: string;
  country_of_origin: string;
  primary_material: string;
  fabric_composition: string;
  gsm: string;
  sizesText: string;
  size_notes: string;
  colorsText: string;
  custom_colors: boolean;
  packaging_standard: string;
  packaging_custom: boolean;
  customization: Record<string, boolean>;
};

const CUSTOMIZATION_KEYS: Array<{ key: string; label: string }> = [
  { key: "oem", label: "OEM" },
  { key: "odm", label: "ODM" },
  { key: "private_label", label: "Private Label" },
  { key: "embroidery", label: "Embroidery" },
  { key: "screen_printing", label: "Screen Printing" },
  { key: "dtf_printing", label: "DTF / Transfer Printing" },
  { key: "sublimation", label: "Sublimation" },
  { key: "custom_branding", label: "Custom Branding" },
  { key: "custom_labels", label: "Custom Labels" },
  { key: "woven_labels", label: "Woven Labels" },
  { key: "hang_tags", label: "Hang Tags" },
  { key: "custom_trims", label: "Custom Trims" },
  { key: "custom_packaging", label: "Custom Packaging" },
];

const emptyDraft = (categoryId = ""): Draft => ({
  category_id: categoryId,
  slug: "",
  name: "",
  description: "",
  short_description: "",
  sku: "",
  image_url: "",
  material_specifications: "",
  seo_title: "",
  seo_description: "",
  sort_order: 0,
  is_published: false,
  is_featured: false,
  galleryText: "",
  specsText: "",
  moq_display: "",
  moq_min: "",
  sample_available: false,
  sample_timeline: "",
  production_timeline: "",
  country_of_origin: "",
  primary_material: "",
  fabric_composition: "",
  gsm: "",
  sizesText: "",
  size_notes: "",
  colorsText: "",
  custom_colors: false,
  packaging_standard: "",
  packaging_custom: false,
  customization: {},
});

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");

const toDraft = (p: Product): Draft => ({
  id: p.id,
  category_id: p.category_id,
  slug: p.slug,
  name: p.name,
  description: p.description ?? "",
  short_description: p.short_description ?? "",
  sku: p.sku ?? "",
  image_url: p.image_url ?? "",
  material_specifications: p.material_specifications ?? "",
  seo_title: p.seo_title ?? "",
  seo_description: p.seo_description ?? "",
  sort_order: p.sort_order,
  is_published: p.is_published,
  is_featured: p.is_featured,
  galleryText: (p.gallery ?? []).join("\n"),
  specsText: (p.specs ?? []).join("\n"),
  moq_display: p.moq_display ?? "",
  moq_min: p.moq_min?.toString() ?? "",
  sample_available: !!p.sample_available,
  sample_timeline: p.sample_timeline ?? "",
  production_timeline: p.production_timeline ?? "",
  country_of_origin: p.country_of_origin ?? "",
  primary_material: p.primary_material ?? "",
  fabric_composition: p.fabric_composition ?? "",
  gsm: p.gsm ?? "",
  sizesText: (p.available_sizes ?? []).join(", "),
  size_notes: p.size_notes ?? "",
  colorsText: (p.available_colors ?? []).join(", "),
  custom_colors: !!p.custom_colors,
  packaging_standard: p.packaging_standard ?? "",
  packaging_custom: !!p.packaging_custom,
  customization: p.customization ?? {},
});

const csvEscape = (v: unknown) => {
  const s = v == null ? "" : String(v);
  if (/["\n,]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

export default function ProductsPanel() {
  const [cats, setCats] = useState<Category[]>([]);
  const [rows, setRows] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft" | "featured">("all");
  const [sort, setSort] = useState<"sort_order" | "name" | "updated_at">("sort_order");
  const [editing, setEditing] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

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
    setRows(((pRes.data as unknown) as Product[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const subCats = useMemo(() => cats.filter((c) => c.parent_id !== null), [cats]);
  const mainCats = useMemo(() => cats.filter((c) => c.parent_id === null && c.is_published), [cats]);

  const filtered = useMemo(() => {
    let list = rows;
    if (catFilter !== "all") list = list.filter((r) => r.category_id === catFilter);
    if (statusFilter === "published") list = list.filter((r) => r.is_published);
    else if (statusFilter === "draft") list = list.filter((r) => !r.is_published);
    else if (statusFilter === "featured") list = list.filter((r) => r.is_featured);
    const s = q.trim().toLowerCase();
    if (s) list = list.filter((r) =>
      r.name.toLowerCase().includes(s) ||
      r.slug.toLowerCase().includes(s) ||
      (r.sku ?? "").toLowerCase().includes(s) ||
      (r.description ?? "").toLowerCase().includes(s),
    );
    list = [...list].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "updated_at") return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      return a.sort_order - b.sort_order;
    });
    return list;
  }, [rows, q, catFilter, statusFilter, sort]);

  const openNew = () => {
    if (subCats.length === 0) { toast({ title: "Create a subcategory first", variant: "destructive" }); return; }
    setEditing(emptyDraft(subCats[0].id));
  };
  const openEdit = (p: Product) => setEditing(toDraft(p));

  const duplicate = async (p: Product) => {
    const baseName = `${p.name} (Copy)`;
    let candidateSlug = `${p.slug}-copy`;
    let n = 1;
    while (rows.some((r) => r.slug === candidateSlug)) {
      n += 1;
      candidateSlug = `${p.slug}-copy-${n}`;
    }
    const { id: _omit, created_at: _c, updated_at: _u, ...rest } = p;
    void _omit; void _c; void _u;
    const payload = {
      ...rest,
      name: baseName,
      slug: candidateSlug,
      sku: null,
      is_published: false,
      is_featured: false,
    };
    const { data, error: err } = await supabase.from("products").insert(payload).select("*").single();
    if (err) { toast({ title: "Duplicate failed", description: err.message, variant: "destructive" }); return; }
    setRows((prev) => [...prev, data as unknown as Product]);
    toast({ title: "Product duplicated", description: `${baseName} created as draft.` });
    setEditing(toDraft(data as unknown as Product));
  };

  const save = async () => {
    if (!editing) return;
    const d = editing;
    if (!d.name.trim() || !d.category_id) {
      toast({ title: "Name and subcategory are required", variant: "destructive" }); return;
    }
    const selectedCat = cats.find((c) => c.id === d.category_id);
    if (!selectedCat || selectedCat.parent_id === null) {
      toast({ title: "Pick a subcategory", description: "Products must live under a subcategory (not a main category).", variant: "destructive" });
      return;
    }
    const slug = d.slug.trim() ? slugify(d.slug) : slugify(d.name);
    const splitList = (s: string) => s.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);
    const payload = {
      category_id: d.category_id,
      slug,
      name: d.name.trim(),
      description: d.description || null,
      short_description: d.short_description || null,
      sku: d.sku.trim() || null,
      image_url: d.image_url || null,
      material_specifications: d.material_specifications || null,
      seo_title: d.seo_title || null,
      seo_description: d.seo_description || null,
      sort_order: Number(d.sort_order) || 0,
      is_published: !!d.is_published,
      is_featured: !!d.is_featured,
      gallery: d.galleryText.split("\n").map((s) => s.trim()).filter(Boolean),
      specs: d.specsText.split("\n").map((s) => s.trim()).filter(Boolean),
      moq_display: d.moq_display.trim() || null,
      moq_min: d.moq_min.trim() ? Number(d.moq_min) : null,
      sample_available: d.sample_available,
      sample_timeline: d.sample_timeline.trim() || null,
      production_timeline: d.production_timeline.trim() || null,
      country_of_origin: d.country_of_origin.trim() || null,
      primary_material: d.primary_material.trim() || null,
      fabric_composition: d.fabric_composition.trim() || null,
      gsm: d.gsm.trim() || null,
      available_sizes: splitList(d.sizesText),
      size_notes: d.size_notes.trim() || null,
      available_colors: splitList(d.colorsText),
      custom_colors: d.custom_colors,
      packaging_standard: d.packaging_standard.trim() || null,
      packaging_custom: d.packaging_custom,
      customization: d.customization,
    };
    setSaving(true);
    try {
      let savedId = d.id;
      if (d.id) {
        const { error: err } = await supabase.from("products").update(payload).eq("id", d.id);
        if (err) throw err;
      } else {
        const { data, error: err } = await supabase.from("products").insert(payload).select("id").single();
        if (err) throw err;
        savedId = data.id;
      }
      const { data: verify, error: vErr } = await supabase.from("products").select("*").eq("id", savedId!).single();
      if (vErr) throw vErr;
      setRows((prev) => {
        const others = prev.filter((r) => r.id !== (verify as Product).id);
        return [...others, verify as unknown as Product];
      });
      toast({ title: d.id ? "Product updated" : "Product created", description: (verify as Product).name });
      setEditing(null);
    } catch (e) {
      toast({ title: "Save failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const remove = async (p: Product) => {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    const { error: err } = await supabase.from("products").delete().eq("id", p.id);
    if (err) { toast({ title: "Delete failed", description: err.message, variant: "destructive" }); return; }
    setRows((prev) => prev.filter((r) => r.id !== p.id));
    setSelected((prev) => { const n = new Set(prev); n.delete(p.id); return n; });
    toast({ title: "Product deleted" });
  };

  const toggleSel = (id: string) =>
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAllFiltered = () => setSelected(new Set(filtered.map((r) => r.id)));
  const clearSel = () => setSelected(new Set());

  const bulkUpdate = async (patch: Partial<Product>, label: string) => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    const { error: err } = await supabase.from("products").update(patch).in("id", ids);
    if (err) { toast({ title: `${label} failed`, description: err.message, variant: "destructive" }); return; }
    setRows((prev) => prev.map((r) => (selected.has(r.id) ? { ...r, ...patch } : r)));
    toast({ title: `${label} · ${ids.length} product${ids.length === 1 ? "" : "s"}` });
  };

  const exportCsv = (scope: "all" | "filtered" | "selected") => {
    const source =
      scope === "all" ? rows :
      scope === "selected" ? rows.filter((r) => selected.has(r.id)) :
      filtered;
    if (source.length === 0) { toast({ title: "Nothing to export", variant: "destructive" }); return; }
    const cols = [
      "id","sku","name","slug","category_slug","is_published","is_featured",
      "short_description","description","primary_material","fabric_composition","gsm",
      "moq_display","moq_min","sample_available","sample_timeline","production_timeline",
      "country_of_origin","available_sizes","available_colors","custom_colors",
      "packaging_standard","packaging_custom","image_url","gallery","specs",
      "seo_title","seo_description","sort_order",
    ];
    const lines = [cols.join(",")];
    for (const p of source) {
      const cat = catMap.get(p.category_id);
      lines.push(cols.map((c) => {
        switch (c) {
          case "category_slug": return csvEscape(cat?.slug ?? "");
          case "available_sizes": return csvEscape((p.available_sizes ?? []).join("|"));
          case "available_colors": return csvEscape((p.available_colors ?? []).join("|"));
          case "gallery": return csvEscape((p.gallery ?? []).join("|"));
          case "specs": return csvEscape((p.specs ?? []).join("|"));
          default: return csvEscape((p as unknown as Record<string, unknown>)[c]);
        }
      }).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `products-${scope}-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: `Exported ${source.length} product${source.length === 1 ? "" : "s"}` });
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
            placeholder="Search name, slug, SKU…"
            className="w-full pl-9 pr-3 py-2 text-sm bg-card/40 border border-border/60 focus:border-primary outline-none"
          />
        </div>
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="text-sm bg-card/40 border border-border/60 px-3 py-2">
          <option value="all">All categories</option>
          {mainCats.map((m) => (
            <optgroup key={m.id} label={m.name}>
              {subCats.filter((s) => s.parent_id === m.id).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="text-sm bg-card/40 border border-border/60 px-3 py-2">
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="featured">Featured</option>
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
        <button onClick={openNew} className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] bg-gradient-gold text-primary-foreground px-4 py-2 hover:shadow-gold">
          <Plus size={14} /> New product
        </button>
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 bg-primary/5 border border-primary/40 px-4 py-3 text-xs">
          <span className="uppercase tracking-[0.25em] text-primary">{selected.size} selected</span>
          <button onClick={() => bulkUpdate({ is_published: true }, "Published")} className="px-3 py-1.5 border border-border/60 hover:border-primary">Publish</button>
          <button onClick={() => bulkUpdate({ is_published: false }, "Unpublished")} className="px-3 py-1.5 border border-border/60 hover:border-primary">Unpublish</button>
          <button onClick={() => bulkUpdate({ is_featured: true }, "Featured")} className="px-3 py-1.5 border border-border/60 hover:border-primary">Set featured</button>
          <button onClick={() => bulkUpdate({ is_featured: false }, "Unfeatured")} className="px-3 py-1.5 border border-border/60 hover:border-primary">Remove featured</button>
          <button onClick={() => exportCsv("selected")} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border/60 hover:border-primary">
            <Download size={12} /> Export selected
          </button>
          <button onClick={clearSel} className="ml-auto text-muted-foreground hover:text-foreground">Clear</button>
        </div>
      )}

      {/* Export bar */}
      <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        <span>Export CSV:</span>
        <button onClick={() => exportCsv("all")} className="hover:text-primary">All ({rows.length})</button>
        <span>·</span>
        <button onClick={() => exportCsv("filtered")} className="hover:text-primary">Filtered ({filtered.length})</button>
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
                <th className="w-10 text-center py-3">
                  <button onClick={selected.size === filtered.length && filtered.length > 0 ? clearSel : selectAllFiltered} aria-label="Select all">
                    {selected.size === filtered.length && filtered.length > 0 ? <CheckSquare size={14} /> : <Square size={14} />}
                  </button>
                </th>
                <th className="text-left py-3 px-4">Product</th>
                <th className="text-left py-3 px-4 hidden md:table-cell">Category</th>
                <th className="text-left py-3 px-4 hidden lg:table-cell">SKU</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-right py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const cat = catMap.get(p.category_id);
                const isSel = selected.has(p.id);
                return (
                  <tr key={p.id} className={`border-t border-border/40 hover:bg-muted/20 ${isSel ? "bg-primary/5" : ""}`}>
                    <td className="text-center py-2.5">
                      <button onClick={() => toggleSel(p.id)} aria-label={`Select ${p.name}`}>
                        {isSel ? <CheckSquare size={14} className="text-primary" /> : <Square size={14} className="text-muted-foreground" />}
                      </button>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-3">
                        {p.image_url ? (
                          <img src={p.image_url} alt="" className="w-10 h-10 object-cover border border-border/40" loading="lazy" />
                        ) : (
                          <div className="w-10 h-10 border border-dashed border-border/40 flex items-center justify-center text-muted-foreground/50"><ImageIcon size={14} /></div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-foreground/90 flex items-center gap-1.5">
                            {p.name}
                            {p.is_featured && <Star size={11} className="text-gold fill-gold" />}
                          </p>
                          <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground md:hidden">{cat?.name ?? "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 hidden md:table-cell text-foreground/70">{cat?.name ?? "—"}</td>
                    <td className="py-2.5 px-4 hidden lg:table-cell text-muted-foreground text-xs">{p.sku ?? "—"}</td>
                    <td className="py-2.5 px-4">
                      <span className={`text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 border ${p.is_published ? "border-emerald-500/50 text-emerald-500" : "border-border/60 text-muted-foreground"}`}>
                        {p.is_published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center justify-end gap-1">
                        {cat && (
                          <a href={`/products/${(cats.find((c) => c.id === cat.parent_id)?.slug) ?? cat.slug}/${p.slug}`} target="_blank" rel="noreferrer" title="Preview" className="p-1.5 text-muted-foreground hover:text-primary">
                            <ExternalLink size={14} />
                          </a>
                        )}
                        <button onClick={() => duplicate(p)} title="Duplicate" className="p-1.5 text-muted-foreground hover:text-primary"><Copy size={14} /></button>
                        <button onClick={() => openEdit(p)} title="Edit" className="p-1.5 text-muted-foreground hover:text-primary"><Edit3 size={14} /></button>
                        <button onClick={() => remove(p)} title="Delete" className="p-1.5 text-destructive/70 hover:text-destructive"><Trash2 size={14} /></button>
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
  const [tab, setTab] = useState<EditorTab>("basics");
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft({ ...draft, [k]: v });
  const setCustom = (k: string, v: boolean) => setDraft({ ...draft, customization: { ...draft.customization, [k]: v } });

  const selectedCat = cats.find((c) => c.id === draft.category_id);
  const parent = selectedCat ? cats.find((c) => c.id === selectedCat.parent_id) : null;

  const tabs: Array<{ id: EditorTab; label: string }> = [
    { id: "basics", label: "Basics" },
    { id: "buyer", label: "Buyer Info" },
    { id: "materials", label: "Materials & Options" },
    { id: "customization", label: "Customization" },
    { id: "media", label: "Media" },
    { id: "seo", label: "SEO" },
    { id: "publish", label: "Publish" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 backdrop-blur-sm p-4 md:p-8">
      <div className="w-full max-w-3xl bg-card border border-border/60 shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-border/60 bg-card/95 px-6 py-4 z-10">
          <div>
            <p className="eyebrow">{draft.id ? "Edit" : "New"} · Product</p>
            <h2 className="font-display text-xl mt-1">{draft.name || "Untitled product"}</h2>
            {parent && selectedCat && (
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mt-1">
                {parent.name} → {selectedCat.name}
              </p>
            )}
          </div>
          <button onClick={onCancel} className="p-2 text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="border-b border-border/60 px-2 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-3 text-[11px] uppercase tracking-[0.22em] whitespace-nowrap border-b-2 transition-colors ${
                  tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 space-y-5">
          {tab === "basics" && (
            <>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Name *"><input value={draft.name} onChange={(e) => set("name", e.target.value)} className={inputCls} /></Field>
                <Field label="SKU"><input value={draft.sku} onChange={(e) => set("sku", e.target.value)} placeholder="Optional internal code" className={inputCls} /></Field>
                <Field label="Subcategory *" hint="Products must live under a subcategory">
                  <select value={draft.category_id} onChange={(e) => set("category_id", e.target.value)} className={inputCls}>
                    {cats.filter((c) => c.parent_id === null && c.is_published).map((main) => (
                      <optgroup key={main.id} label={main.name}>
                        {cats.filter((s) => s.parent_id === main.id).map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </Field>
                <Field label="Slug" hint="Auto-generated from name if empty">
                  <input value={draft.slug} onChange={(e) => set("slug", e.target.value)} placeholder="auto-generated" className={inputCls} />
                </Field>
              </div>
              <Field label="Short description" hint="1–2 sentences for cards & search">
                <textarea rows={2} value={draft.short_description} onChange={(e) => set("short_description", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Full description">
                <textarea rows={4} value={draft.description} onChange={(e) => set("description", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Sort order">
                <input type="number" value={draft.sort_order} onChange={(e) => set("sort_order", Number(e.target.value))} className={inputCls} />
              </Field>
              <div className="flex gap-6">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={draft.is_featured} onChange={(e) => set("is_featured", e.target.checked)} />
                  <span>Featured</span>
                </label>
              </div>
            </>
          )}

          {tab === "buyer" && (
            <>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="MOQ display" hint="Public label (e.g. “Flexible per program”)">
                  <input value={draft.moq_display} onChange={(e) => set("moq_display", e.target.value)} className={inputCls} />
                </Field>
                <Field label="Minimum MOQ (number)" hint="Only when genuinely known">
                  <input type="number" value={draft.moq_min} onChange={(e) => set("moq_min", e.target.value)} className={inputCls} />
                </Field>
                <Field label="Sample availability">
                  <label className="inline-flex items-center gap-2 mt-2 text-sm">
                    <input type="checkbox" checked={draft.sample_available} onChange={(e) => set("sample_available", e.target.checked)} />
                    Available on request
                  </label>
                </Field>
                <Field label="Sample timeline"><input value={draft.sample_timeline} onChange={(e) => set("sample_timeline", e.target.value)} placeholder="Confirmed per program" className={inputCls} /></Field>
                <Field label="Production timeline"><input value={draft.production_timeline} onChange={(e) => set("production_timeline", e.target.value)} placeholder="Confirmed per program" className={inputCls} /></Field>
                <Field label="Country of origin"><input value={draft.country_of_origin} onChange={(e) => set("country_of_origin", e.target.value)} placeholder="Pakistan (Sialkot)" className={inputCls} /></Field>
              </div>
              <p className="text-xs text-muted-foreground">Pricing is quotation-only. There is no public price field.</p>
            </>
          )}

          {tab === "materials" && (
            <>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Primary material"><input value={draft.primary_material} onChange={(e) => set("primary_material", e.target.value)} className={inputCls} /></Field>
                <Field label="Weight / GSM"><input value={draft.gsm} onChange={(e) => set("gsm", e.target.value)} className={inputCls} /></Field>
              </div>
              <Field label="Fabric composition">
                <textarea rows={2} value={draft.fabric_composition} onChange={(e) => set("fabric_composition", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Material specifications">
                <textarea rows={2} value={draft.material_specifications} onChange={(e) => set("material_specifications", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Available sizes" hint="Comma-separated (e.g. S, M, L, XL)">
                <input value={draft.sizesText} onChange={(e) => set("sizesText", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Size notes"><input value={draft.size_notes} onChange={(e) => set("size_notes", e.target.value)} className={inputCls} /></Field>
              <Field label="Available colors" hint="Comma-separated">
                <input value={draft.colorsText} onChange={(e) => set("colorsText", e.target.value)} className={inputCls} />
              </Field>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={draft.custom_colors} onChange={(e) => set("custom_colors", e.target.checked)} />
                <span>Custom colors available on request</span>
              </label>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Standard packaging"><input value={draft.packaging_standard} onChange={(e) => set("packaging_standard", e.target.value)} className={inputCls} /></Field>
                <Field label="Custom packaging">
                  <label className="inline-flex items-center gap-2 mt-2 text-sm">
                    <input type="checkbox" checked={draft.packaging_custom} onChange={(e) => set("packaging_custom", e.target.checked)} />
                    Available on request
                  </label>
                </Field>
              </div>
            </>
          )}

          {tab === "customization" && (
            <div className="grid sm:grid-cols-2 gap-3">
              {CUSTOMIZATION_KEYS.map(({ key, label }) => (
                <label key={key} className="inline-flex items-center gap-2 text-sm border border-border/60 px-3 py-2.5 cursor-pointer hover:border-primary">
                  <input type="checkbox" checked={!!draft.customization[key]} onChange={(e) => setCustom(key, e.target.checked)} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          )}

          {tab === "media" && (
            <>
              <Field label="Cover image URL">
                <input value={draft.image_url} onChange={(e) => set("image_url", e.target.value)} placeholder="https://…" className={inputCls} />
              </Field>
              {draft.image_url && (
                <img src={draft.image_url} alt="Cover preview" className="w-32 h-32 object-cover border border-border/60" />
              )}
              <Field label="Gallery URLs" hint="One URL per line — first becomes cover if none set">
                <textarea rows={4} value={draft.galleryText} onChange={(e) => set("galleryText", e.target.value)} className={inputCls} />
              </Field>
              <div className="flex flex-wrap gap-2">
                {draft.galleryText.split("\n").filter((s) => s.trim()).slice(0, 8).map((u, i) => (
                  <img key={i} src={u.trim()} alt="" className="w-16 h-16 object-cover border border-border/60" />
                ))}
              </div>
              <Field label="Specs / bullet highlights" hint="One per line">
                <textarea rows={3} value={draft.specsText} onChange={(e) => set("specsText", e.target.value)} className={inputCls} />
              </Field>
            </>
          )}

          {tab === "seo" && (
            <>
              <Field label="SEO title" hint="Under 60 chars">
                <input value={draft.seo_title} onChange={(e) => set("seo_title", e.target.value)} className={inputCls} />
              </Field>
              <Field label="SEO description" hint="Under 160 chars">
                <textarea rows={2} value={draft.seo_description} onChange={(e) => set("seo_description", e.target.value)} className={inputCls} />
              </Field>
              <p className="text-xs text-muted-foreground">Product schema is generated automatically. No price / Offer is emitted (quotation-based).</p>
            </>
          )}

          {tab === "publish" && (
            <>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={draft.is_published} onChange={(e) => set("is_published", e.target.checked)} />
                <span>Published (visible on public site)</span>
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={draft.is_featured} onChange={(e) => set("is_featured", e.target.checked)} />
                <span>Featured</span>
              </label>
              {draft.id && selectedCat && parent && (
                <p className="text-xs text-muted-foreground">
                  Preview: <a href={`/products/${parent.slug}/${draft.slug || slugify(draft.name)}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">/products/{parent.slug}/{draft.slug || slugify(draft.name)}</a>
                </p>
              )}
            </>
          )}
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

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{label}</span>
      {hint && <span className="text-[10px] text-muted-foreground/70 ml-2">· {hint}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
