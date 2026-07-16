import { useCallback, useEffect, useMemo, useState } from "react";
import { Layers3, Plus, RefreshCw, Save, Tag, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type CategoryRow = { id: string; parent_id: string | null; slug: string; name: string; sort_order: number };
type ProductRow = { id: string; category_id: string; slug: string; name: string; sort_order: number };
type AudienceRow = {
  id: string;
  category_id: string;
  slug: string;
  name: string;
  keyword: string | null;
  description: string | null;
  sort_order: number;
  is_published: boolean;
};
type CollectionRow = {
  id: string;
  audience_id: string;
  slug: string;
  name: string;
  keyword: string | null;
  description: string | null;
  sort_order: number;
  is_published: boolean;
};
type AssignmentRow = { product_id: string; collection_id: string; is_primary: boolean; sort_order: number };

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function TaxonomyPanel() {
  const db = supabase as any;
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [audiences, setAudiences] = useState<AudienceRow[]>([]);
  const [collections, setCollections] = useState<CollectionRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedCollectionId, setSelectedCollectionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [categoryResult, productResult, audienceResult, collectionResult, assignmentResult] = await Promise.all([
      db.from("categories").select("id,parent_id,slug,name,sort_order").order("sort_order"),
      db.from("products").select("id,category_id,slug,name,sort_order").eq("is_published", true).order("sort_order"),
      db.from("catalog_audiences").select("id,category_id,slug,name,keyword,description,sort_order,is_published").order("sort_order"),
      db.from("catalog_collections").select("id,audience_id,slug,name,keyword,description,sort_order,is_published").order("sort_order"),
      db.from("catalog_product_collections").select("product_id,collection_id,is_primary,sort_order").order("sort_order"),
    ]);

    const firstError = [categoryResult, productResult, audienceResult, collectionResult, assignmentResult].find((result) => result.error)?.error;
    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    const nextCategories = (categoryResult.data ?? []) as CategoryRow[];
    setCategories(nextCategories);
    setProducts((productResult.data ?? []) as ProductRow[]);
    setAudiences((audienceResult.data ?? []) as AudienceRow[]);
    setCollections((collectionResult.data ?? []) as CollectionRow[]);
    setAssignments((assignmentResult.data ?? []) as AssignmentRow[]);
    setSelectedCategoryId((current) => current || nextCategories.find((category) => !category.parent_id)?.id || "");
    setError(null);
    setLoading(false);
  }, [db]);

  useEffect(() => { void load(); }, [load]);

  const topCategories = useMemo(() => categories.filter((category) => !category.parent_id), [categories]);
  const selectedCategory = topCategories.find((category) => category.id === selectedCategoryId) ?? null;
  const childCategoryIds = useMemo(
    () => new Set(categories.filter((category) => category.parent_id === selectedCategoryId).map((category) => category.id)),
    [categories, selectedCategoryId],
  );
  const categoryProducts = useMemo(
    () => products.filter((product) => product.category_id === selectedCategoryId || childCategoryIds.has(product.category_id)),
    [products, selectedCategoryId, childCategoryIds],
  );
  const categoryAudiences = useMemo(
    () => audiences.filter((audience) => audience.category_id === selectedCategoryId),
    [audiences, selectedCategoryId],
  );
  const categoryAudienceIds = useMemo(() => new Set(categoryAudiences.map((audience) => audience.id)), [categoryAudiences]);
  const categoryCollections = useMemo(
    () => collections.filter((collection) => categoryAudienceIds.has(collection.audience_id)),
    [collections, categoryAudienceIds],
  );
  const assignmentByProduct = useMemo(
    () => new Map(assignments.filter((assignment) => assignment.is_primary).map((assignment) => [assignment.product_id, assignment])),
    [assignments],
  );
  const collectionById = useMemo(() => new Map(collections.map((collection) => [collection.id, collection])), [collections]);
  const assignedCount = categoryProducts.filter((product) => assignmentByProduct.has(product.id)).length;

  async function createAudience() {
    if (!selectedCategoryId) return;
    const name = window.prompt("Audience / buyer group name (for example Men, Women, Kids, Teams & Clubs)")?.trim();
    if (!name) return;
    const slug = slugify(window.prompt("SEO slug", slugify(name)) || name);
    if (!slug) return;
    const { error: insertError } = await db.from("catalog_audiences").insert({
      category_id: selectedCategoryId,
      name,
      slug,
      keyword: `${name} ${selectedCategory?.name || "apparel"} manufacturer`,
      description: `${name} product programs developed to wholesale, OEM and private-label buyer requirements.`,
      sort_order: categoryAudiences.length * 10 + 10,
      is_published: false,
    });
    if (insertError) return toast.error(insertError.message);
    toast.success("Audience created as draft");
    await load();
  }

  async function createCollection(audience: AudienceRow) {
    const name = window.prompt(`Product collection under ${audience.name}`)?.trim();
    if (!name) return;
    const slug = slugify(window.prompt("SEO slug", slugify(name)) || name);
    if (!slug) return;
    const siblingCount = collections.filter((collection) => collection.audience_id === audience.id).length;
    const { error: insertError } = await db.from("catalog_collections").insert({
      audience_id: audience.id,
      name,
      slug,
      keyword: `${name} manufacturer`,
      description: `${name} for wholesale, OEM and private-label buyer programs.`,
      sort_order: siblingCount * 10 + 10,
      is_published: false,
    });
    if (insertError) return toast.error(insertError.message);
    toast.success("Collection created as draft");
    await load();
  }

  async function toggleAudience(audience: AudienceRow) {
    const { error: updateError } = await db.from("catalog_audiences").update({ is_published: !audience.is_published }).eq("id", audience.id);
    if (updateError) return toast.error(updateError.message);
    await load();
  }

  async function toggleCollection(collection: CollectionRow) {
    const assigned = assignments.some((assignment) => assignment.collection_id === collection.id);
    if (!collection.is_published && !assigned) return toast.error("Assign at least one product before publishing this collection");
    const { error: updateError } = await db.from("catalog_collections").update({ is_published: !collection.is_published }).eq("id", collection.id);
    if (updateError) return toast.error(updateError.message);
    await load();
  }

  async function assignProduct() {
    if (!selectedProductId || !selectedCollectionId) return;
    setSaving(true);
    const existing = assignmentByProduct.get(selectedProductId);
    const product = products.find((item) => item.id === selectedProductId);
    const payload = {
      collection_id: selectedCollectionId,
      is_primary: true,
      sort_order: product?.sort_order ?? 0,
    };
    const result = existing
      ? await db.from("catalog_product_collections").update(payload).eq("product_id", selectedProductId).eq("collection_id", existing.collection_id)
      : await db.from("catalog_product_collections").insert({ product_id: selectedProductId, ...payload });
    setSaving(false);
    if (result.error) return toast.error(result.error.message);
    toast.success(existing ? "Product moved to the selected collection" : "Product assigned");
    setSelectedProductId("");
    await load();
  }

  async function unassignProduct(productId: string) {
    const existing = assignmentByProduct.get(productId);
    if (!existing || !window.confirm("Remove this product from its primary public collection?")) return;
    const { error: deleteError } = await db.from("catalog_product_collections").delete().eq("product_id", productId).eq("collection_id", existing.collection_id);
    if (deleteError) return toast.error(deleteError.message);
    await load();
  }

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading catalogue hierarchy…</div>;

  return (
    <section className="mt-10 border-t border-border/60 pt-8 space-y-6" aria-labelledby="catalog-taxonomy-admin-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-primary">Database-owned hierarchy</p>
          <h2 id="catalog-taxonomy-admin-title" className="font-display text-2xl mt-2">Audience & Product Collections</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-3xl">Control Main Category → Buyer Group → Product Collection → Products. Empty collections stay off the public website.</p>
        </div>
        <button onClick={() => void load()} className="inline-flex items-center gap-2 border border-border/60 px-4 py-2 text-xs uppercase tracking-[0.16em]"><RefreshCw size={14} /> Refresh</button>
      </div>

      {error && <div className="border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric icon={<Users size={16} />} label="Buyer groups" value={categoryAudiences.length} />
        <Metric icon={<Layers3 size={16} />} label="Collections" value={categoryCollections.length} />
        <Metric icon={<Tag size={16} />} label="Products assigned" value={`${assignedCount}/${categoryProducts.length}`} />
        <Metric icon={<Save size={16} />} label="Unassigned" value={Math.max(0, categoryProducts.length - assignedCount)} />
      </div>

      <div className="flex flex-wrap gap-2">
        {topCategories.map((category) => (
          <button key={category.id} onClick={() => setSelectedCategoryId(category.id)} className={`px-4 py-2 border text-xs ${selectedCategoryId === category.id ? "border-primary bg-primary text-primary-foreground" : "border-border/60"}`}>
            {category.name}
          </button>
        ))}
        <button onClick={() => void createAudience()} className="inline-flex items-center gap-2 px-4 py-2 border border-primary/50 text-primary text-xs"><Plus size={13} /> Add buyer group</button>
      </div>

      <div className="grid xl:grid-cols-2 gap-5">
        {categoryAudiences.map((audience) => {
          const audienceCollections = collections.filter((collection) => collection.audience_id === audience.id);
          return (
            <article key={audience.id} className="border border-border/60 bg-card/30 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-display text-xl">{audience.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">/{audience.slug} · {audience.keyword || "Keyword not set"}</p>
                </div>
                <button onClick={() => void toggleAudience(audience)} className={`px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] border ${audience.is_published ? "border-emerald-500/50 text-emerald-500" : "border-amber-500/50 text-amber-500"}`}>
                  {audience.is_published ? "Published" : "Draft"}
                </button>
              </div>
              <div className="mt-5 space-y-2">
                {audienceCollections.map((collection) => {
                  const count = assignments.filter((assignment) => assignment.collection_id === collection.id).length;
                  return (
                    <div key={collection.id} className="flex items-center justify-between gap-3 border border-border/50 px-3 py-3">
                      <div>
                        <p className="text-sm font-medium">{collection.name}</p>
                        <p className="text-[11px] text-muted-foreground">/{collection.slug} · {count} product{count === 1 ? "" : "s"}</p>
                      </div>
                      <button onClick={() => void toggleCollection(collection)} className={`px-2.5 py-1 text-[9px] uppercase tracking-[0.14em] border ${collection.is_published ? "border-emerald-500/50 text-emerald-500" : "border-border/60 text-muted-foreground"}`}>
                        {collection.is_published ? "Live" : "Draft"}
                      </button>
                    </div>
                  );
                })}
                <button onClick={() => void createCollection(audience)} className="w-full inline-flex items-center justify-center gap-2 border border-dashed border-border/70 py-3 text-xs text-muted-foreground hover:text-primary hover:border-primary/50"><Plus size={13} /> Add product collection</button>
              </div>
            </article>
          );
        })}
      </div>

      <div className="border border-border/60 bg-card/20 p-5">
        <h3 className="font-display text-xl">Assign or move a product</h3>
        <div className="grid md:grid-cols-[1fr_1fr_auto] gap-3 mt-4">
          <select value={selectedProductId} onChange={(event) => setSelectedProductId(event.target.value)} className="bg-background border border-border/60 px-3 py-3 text-sm">
            <option value="">Choose product</option>
            {categoryProducts.map((product) => {
              const current = assignmentByProduct.get(product.id);
              const collection = current ? collectionById.get(current.collection_id) : null;
              return <option key={product.id} value={product.id}>{product.name}{collection ? ` — ${collection.name}` : " — Unassigned"}</option>;
            })}
          </select>
          <select value={selectedCollectionId} onChange={(event) => setSelectedCollectionId(event.target.value)} className="bg-background border border-border/60 px-3 py-3 text-sm">
            <option value="">Choose collection</option>
            {categoryCollections.map((collection) => {
              const audience = audiences.find((item) => item.id === collection.audience_id);
              return <option key={collection.id} value={collection.id}>{audience?.name} → {collection.name}</option>;
            })}
          </select>
          <button disabled={!selectedProductId || !selectedCollectionId || saving} onClick={() => void assignProduct()} className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-5 py-3 text-xs uppercase tracking-[0.16em] disabled:opacity-50"><Save size={14} /> {saving ? "Saving…" : "Assign"}</button>
        </div>

        <div className="mt-5 grid md:grid-cols-2 xl:grid-cols-3 gap-2 max-h-80 overflow-y-auto pr-1">
          {categoryProducts.map((product) => {
            const assignment = assignmentByProduct.get(product.id);
            const collection = assignment ? collectionById.get(assignment.collection_id) : null;
            return (
              <div key={product.id} className="flex items-center justify-between gap-3 border border-border/40 px-3 py-2.5 text-xs">
                <span className="min-w-0"><span className="block truncate text-foreground">{product.name}</span><span className="text-muted-foreground">{collection?.name || "Unassigned"}</span></span>
                {assignment && <button onClick={() => void unassignProduct(product.id)} className="text-[9px] uppercase tracking-[0.12em] text-destructive">Remove</button>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return <div className="border border-border/60 bg-card/30 p-4"><div className="text-primary">{icon}</div><p className="text-2xl font-display mt-3">{value}</p><p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground mt-1">{label}</p></div>;
}
