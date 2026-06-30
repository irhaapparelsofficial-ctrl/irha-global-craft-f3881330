import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Save, X, Folder, Package, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import { resolveAsset } from "@/lib/assetResolver";

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
};

type ProductDetailSpec = { label: string; value: string };

type Product = {
  id: string;
  category_id: string;
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
  gallery: string[];
  specs: string[];
  details: ProductDetailSpec[];
  material_specifications: string | null;
  seo_title: string | null;
  seo_description: string | null;
  sort_order: number;
  is_published: boolean;
};

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export default function CatalogPanel() {
  const [cats, setCats] = useState<Category[]>([]);
  const [prods, setProds] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCat, setOpenCat] = useState<Record<string, boolean>>({});
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [editProd, setEditProd] = useState<Product | null>(null);
  const [addingProductToCat, setAddingProductToCat] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [c, p] = await Promise.all([
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("products").select("*").order("sort_order"),
    ]);
    if (c.error) toast({ title: "Failed to load categories", description: c.error.message, variant: "destructive" });
    if (p.error) toast({ title: "Failed to load products", description: p.error.message, variant: "destructive" });
    setCats((c.data ?? []) as Category[]);
    setProds((p.data ?? []) as unknown as Product[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const productsByCat = useMemo(() => {
    const m = new Map<string, Product[]>();
    prods.forEach((p) => {
      const arr = m.get(p.category_id) ?? [];
      arr.push(p);
      m.set(p.category_id, arr);
    });
    return m;
  }, [prods]);

  const rootCats = cats.filter((c) => !c.parent_id);
  const subsOf = (parentId: string) => cats.filter((c) => c.parent_id === parentId);
  // Recursive product count: direct products + all descendant categories' products
  const totalProductsFor = (catId: string): number => {
    const direct = productsByCat.get(catId)?.length ?? 0;
    const childTotal = subsOf(catId).reduce((sum, s) => sum + totalProductsFor(s.id), 0);
    return direct + childTotal;
  };

  const saveCategory = async (c: Partial<Category>) => {
    const payload = {
      ...c,
      slug: c.slug || slugify(c.name ?? ""),
      details: c.details ?? [],
    };
    if (c.id) {
      const { error } = await supabase.from("categories").update(payload).eq("id", c.id);
      if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
      toast({ title: "Category updated" });
    } else {
      const { error } = await supabase.from("categories").insert(payload as never);
      if (error) return toast({ title: "Create failed", description: error.message, variant: "destructive" });
      toast({ title: "Category created" });
    }
    setEditCat(null);
    void load();
  };

  const removeCategory = async (id: string) => {
    if (!confirm("Delete this category and ALL its products? This cannot be undone.")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    toast({ title: "Category deleted" });
    void load();
  };

  const saveProduct = async (p: Partial<Product>) => {
    const payload = {
      ...p,
      slug: p.slug || slugify(p.name ?? ""),
      gallery: p.gallery ?? [],
      specs: p.specs ?? [],
      details: p.details ?? [],
    };
    if (p.id) {
      const { error } = await supabase.from("products").update(payload as never).eq("id", p.id);
      if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
      toast({ title: "Product updated" });
    } else {
      const { error } = await supabase.from("products").insert(payload as never);
      if (error) return toast({ title: "Create failed", description: error.message, variant: "destructive" });
      toast({ title: "Product created" });
    }
    setEditProd(null);
    setAddingProductToCat(null);
    void load();
  };

  const removeProduct = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    toast({ title: "Product deleted" });
    void load();
  };

  if (loading) return <div className="text-sm text-muted-foreground py-12 text-center">Loading catalog…</div>;

  return (
    <div className="space-y-6">
      {/* Stats + actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-6 text-xs uppercase tracking-[0.2em] text-foreground/70">
          <span><Folder size={12} className="inline mr-1.5" /> {cats.length} categories</span>
          <span><Package size={12} className="inline mr-1.5" /> {prods.length} products</span>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] border border-border/60 px-3 py-2 hover:border-primary hover:text-primary">
            <RefreshCw size={12} /> Refresh
          </button>
          <button
            onClick={() => setEditCat({ id: "", parent_id: null, slug: "", name: "", short: "", description: "", image_url: "", catalog_url: "", details: [], seo_title: "", seo_description: "", sort_order: cats.length * 10, is_published: true })}
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] bg-primary text-primary-foreground px-4 py-2 hover:bg-primary/90"
          >
            <Plus size={12} /> New Category
          </button>
        </div>
      </div>

      {/* Tree */}
      <div className="space-y-2">
        {rootCats.map((c) => {
          const isOpen = openCat[c.id] ?? false;
          const subs = subsOf(c.id);
          const list = productsByCat.get(c.id) ?? [];
          return (
            <div key={c.id} className="border border-border/60 bg-card/30">
              <div className="flex items-center justify-between p-4 gap-3">
                <button onClick={() => setOpenCat((o) => ({ ...o, [c.id]: !isOpen }))} className="flex items-center gap-3 text-left flex-1 min-w-0">
                  {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <img src={resolveAsset(c.image_url)} alt="" className="w-10 h-10 object-cover" />
                  <div className="min-w-0">
                    <p className="font-display text-base truncate">{c.name}</p>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground truncate">/{c.slug} · {list.length} products · {subs.length} subs {!c.is_published && "· Draft"}</p>
                  </div>
                </button>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => setEditCat({ id: "", parent_id: c.id, slug: "", name: "", short: "", description: "", image_url: "", catalog_url: "", details: [], seo_title: "", seo_description: "", sort_order: subs.length * 10, is_published: true })}
                    title="Add sub-category"
                    className="p-2 hover:text-primary"
                  >
                    <Folder size={14} />
                  </button>
                  <button
                    onClick={() => setAddingProductToCat(c.id)}
                    title="Add product"
                    className="p-2 hover:text-primary"
                  >
                    <Plus size={14} />
                  </button>
                  <button onClick={() => setEditCat(c)} className="p-2 hover:text-primary" title="Edit"><Pencil size={14} /></button>
                  <button onClick={() => removeCategory(c.id)} className="p-2 hover:text-destructive" title="Delete"><Trash2 size={14} /></button>
                </div>
              </div>

              {isOpen && (
                <div className="px-4 pb-4 pl-12 space-y-2 border-t border-border/40 pt-3">
                  {subs.map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-3 border border-border/40 bg-background/40">
                      <div className="flex items-center gap-3 min-w-0">
                        <Folder size={12} className="text-muted-foreground" />
                        <span className="text-sm truncate">{s.name}</span>
                        <span className="text-[10px] text-muted-foreground">/{s.slug}</span>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => setEditCat(s)} className="p-1.5 hover:text-primary"><Pencil size={12} /></button>
                        <button onClick={() => removeCategory(s.id)} className="p-1.5 hover:text-destructive"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  ))}
                  {list.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 border border-border/40 bg-background/40">
                      <div className="flex items-center gap-3 min-w-0">
                        <img src={resolveAsset(p.image_url)} alt="" className="w-8 h-8 object-cover shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm truncate">{p.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">/{p.slug} {!p.is_published && "· Draft"}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => setEditProd(p)} className="p-1.5 hover:text-primary"><Pencil size={12} /></button>
                        <button onClick={() => removeProduct(p.id)} className="p-1.5 hover:text-destructive"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  ))}
                  {list.length === 0 && subs.length === 0 && (
                    <p className="text-xs text-muted-foreground italic py-2">No items yet.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Category editor modal */}
      {editCat && (
        <CategoryEditor
          value={editCat}
          allCategories={cats}
          onClose={() => setEditCat(null)}
          onSave={saveCategory}
        />
      )}

      {/* Product editor modal */}
      {(editProd || addingProductToCat) && (
        <ProductEditor
          value={editProd ?? {
            id: "",
            category_id: addingProductToCat!,
            slug: "",
            name: "",
            description: "",
            image_url: "",
            gallery: [],
            specs: [],
            details: [],
            material_specifications: "",
            seo_title: "",
            seo_description: "",
            sort_order: (productsByCat.get(addingProductToCat!)?.length ?? 0) * 10,
            is_published: true,
          }}
          categories={cats}
          onClose={() => { setEditProd(null); setAddingProductToCat(null); }}
          onSave={saveProduct}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────
function CategoryEditor({ value, allCategories, onClose, onSave }: {
  value: Category;
  allCategories: Category[];
  onClose: () => void;
  onSave: (c: Partial<Category>) => void;
}) {
  const [c, setC] = useState<Category>(value);
  const parentOptions = allCategories.filter((x) => x.id !== c.id && !x.parent_id);

  return (
    <Modal onClose={onClose} title={c.id ? "Edit Category" : "New Category"}>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Name *"><input className={inp} value={c.name} onChange={(e) => setC({ ...c, name: e.target.value, slug: c.slug || slugify(e.target.value) })} /></Field>
        <Field label="Slug *"><input className={inp} value={c.slug} onChange={(e) => setC({ ...c, slug: slugify(e.target.value) })} /></Field>
        <Field label="Parent (for sub-category)">
          <select className={inp} value={c.parent_id ?? ""} onChange={(e) => setC({ ...c, parent_id: e.target.value || null })}>
            <option value="">— Top-level —</option>
            {parentOptions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Sort order"><input type="number" className={inp} value={c.sort_order} onChange={(e) => setC({ ...c, sort_order: +e.target.value })} /></Field>
        <Field label="Short tagline" cls="sm:col-span-2"><input className={inp} value={c.short ?? ""} onChange={(e) => setC({ ...c, short: e.target.value })} /></Field>
        <Field label="Description" cls="sm:col-span-2"><textarea className={inp + " min-h-24"} value={c.description ?? ""} onChange={(e) => setC({ ...c, description: e.target.value })} /></Field>
        <Field label="Image path / URL"><input className={inp} placeholder="cat-bavarian.jpg or https://…" value={c.image_url ?? ""} onChange={(e) => setC({ ...c, image_url: e.target.value })} /></Field>
        <Field label="Catalog PDF URL"><input className={inp} value={c.catalog_url ?? ""} onChange={(e) => setC({ ...c, catalog_url: e.target.value })} /></Field>
        <Field label="Bullet details (one per line)" cls="sm:col-span-2">
          <textarea className={inp + " min-h-20"} value={(c.details ?? []).join("\n")} onChange={(e) => setC({ ...c, details: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })} />
        </Field>
        <Field label="SEO title"><input className={inp} value={c.seo_title ?? ""} onChange={(e) => setC({ ...c, seo_title: e.target.value })} /></Field>
        <Field label="SEO description"><input className={inp} value={c.seo_description ?? ""} onChange={(e) => setC({ ...c, seo_description: e.target.value })} /></Field>
        <Field label=""><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={c.is_published} onChange={(e) => setC({ ...c, is_published: e.target.checked })} /> Published</label></Field>
      </div>
      <ModalActions onClose={onClose} onSave={() => onSave(c)} />
    </Modal>
  );
}

function ProductEditor({ value, categories, onClose, onSave }: {
  value: Product;
  categories: Category[];
  onClose: () => void;
  onSave: (p: Partial<Product>) => void;
}) {
  const [p, setP] = useState<Product>(value);

  return (
    <Modal onClose={onClose} title={p.id ? "Edit Product" : "New Product"}>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Name *"><input className={inp} value={p.name} onChange={(e) => setP({ ...p, name: e.target.value, slug: p.slug || slugify(e.target.value) })} /></Field>
        <Field label="Slug *"><input className={inp} value={p.slug} onChange={(e) => setP({ ...p, slug: slugify(e.target.value) })} /></Field>
        <Field label="Category *">
          <select className={inp} value={p.category_id} onChange={(e) => setP({ ...p, category_id: e.target.value })}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Sort order"><input type="number" className={inp} value={p.sort_order} onChange={(e) => setP({ ...p, sort_order: +e.target.value })} /></Field>
        <Field label="Description" cls="sm:col-span-2"><textarea className={inp + " min-h-24"} value={p.description ?? ""} onChange={(e) => setP({ ...p, description: e.target.value })} /></Field>
        <Field label="Main image path / URL" cls="sm:col-span-2"><input className={inp} placeholder="products/bavarian-1.jpg or https://…" value={p.image_url ?? ""} onChange={(e) => setP({ ...p, image_url: e.target.value })} /></Field>
        <Field label="Gallery (one image path per line)" cls="sm:col-span-2">
          <textarea className={inp + " min-h-20"} value={(p.gallery ?? []).join("\n")} onChange={(e) => setP({ ...p, gallery: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })} />
        </Field>
        <Field label="Short specs (one per line)" cls="sm:col-span-2">
          <textarea className={inp + " min-h-20"} value={(p.specs ?? []).join("\n")} onChange={(e) => setP({ ...p, specs: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })} />
        </Field>
        <Field label="Detailed spec sheet (one per line: Label | Value)" cls="sm:col-span-2">
          <textarea
            className={inp + " min-h-32 font-mono text-xs"}
            value={(p.details ?? []).map((d) => `${d.label} | ${d.value}`).join("\n")}
            onChange={(e) => {
              const lines = e.target.value.split("\n").map((l) => l.trim()).filter(Boolean);
              const details = lines.map((l) => {
                const [label, ...rest] = l.split("|");
                return { label: label.trim(), value: rest.join("|").trim() };
              }).filter((d) => d.label);
              setP({ ...p, details });
            }}
          />
        </Field>
        <Field label="SEO title"><input className={inp} value={p.seo_title ?? ""} onChange={(e) => setP({ ...p, seo_title: e.target.value })} /></Field>
        <Field label="SEO description"><input className={inp} value={p.seo_description ?? ""} onChange={(e) => setP({ ...p, seo_description: e.target.value })} /></Field>
        <Field label=""><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={p.is_published} onChange={(e) => setP({ ...p, is_published: e.target.checked })} /> Published</label></Field>
      </div>
      <ModalActions onClose={onClose} onSave={() => onSave(p)} />
    </Modal>
  );
}

const inp = "w-full bg-background border border-border/60 px-3 py-2 text-sm focus:outline-none focus:border-primary";

function Field({ label, children, cls = "" }: { label: string; children: React.ReactNode; cls?: string }) {
  return (
    <label className={`block ${cls}`}>
      {label && <span className="block text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-1.5">{label}</span>}
      {children}
    </label>
  );
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur flex items-start justify-center overflow-y-auto p-4 pt-20">
      <div className="w-full max-w-3xl bg-card border border-border/60 p-6 mb-20">
        <div className="flex items-center justify-between mb-6 border-b border-border/60 pb-4">
          <h3 className="font-display text-xl">{title}</h3>
          <button onClick={onClose} className="p-2 hover:text-primary"><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalActions({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  return (
    <div className="flex justify-end gap-2 mt-6 pt-6 border-t border-border/60">
      <button onClick={onClose} className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] border border-border/60 px-4 py-2.5 hover:border-foreground/60">Cancel</button>
      <button onClick={onSave} className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] bg-primary text-primary-foreground px-5 py-2.5 hover:bg-primary/90">
        <Save size={12} /> Save
      </button>
    </div>
  );
}
